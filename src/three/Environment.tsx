import { Suspense, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { Environment as DreiEnvironment, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useQualityTier } from '@/three/QualityGate'
import type { QualityTier } from '@/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Environment — image-based lighting + the studio floor
 * ─────────────────────────────────────────────────────────────────────────────
 * Three exports, each independently mountable:
 *
 *  • {@link StageEnvironment} — the HDRI image-based light. This is what makes
 *    the clearcoat in the shared material library read at all: without an env
 *    map a `MeshPhysicalMaterial` with `clearcoat: 1` is a flat grey surface.
 *  • {@link StageFloor}       — the asphalt ground plane. `receiveShadow` lives
 *    here, so the key light in `Lighting.tsx` has something to land on.
 *  • {@link Stage}            — both, with a local `<Suspense>` boundary.
 *
 * ── WHY THE SUSPENSE BOUNDARY IS BUILT IN ────────────────────────────────────
 * Both the .hdr and the three floor .jpg files go through `useLoader`, which
 * SUSPENDS. If the scene composition has no `<Suspense>` ancestor (and the
 * contested `Scene.tsx` may or may not) an unhandled suspension during the
 * first commit unmounts the whole canvas tree. `<Stage>` therefore wraps itself
 * in `<Suspense fallback={null}>`: rendering nothing for a few hundred
 * milliseconds while a 1.6 MB radiance file streams is exactly the right
 * fallback, and it cannot take the rest of the scene down with it.
 *
 * `StageEnvironment` and `StageFloor` are still exported bare so the scene can
 * place them under its own boundary (e.g. one shared `<Suspense>` around the
 * car and the stage, with a real loading state) if it prefers.
 *
 * ── WHAT THIS MODULE DELIBERATELY DOES NOT DO ────────────────────────────────
 * It never writes `scene.background` or attaches a `<color>`. `App.tsx` runs
 * the canvas with `alpha: false`, so the clear colour is already opaque black,
 * and the scene composition may want to own the backdrop for the `outro`
 * chapter. Setting it from here would be a second writer to the same piece of
 * state. Pass `background` to {@link StageEnvironment} if the HDRI itself
 * should be the backdrop — that is an explicit, opt-in decision.
 */

// ── Asset URLs (served from `public/`; see `src/content/attribution.ts`) ─────

/** Primary HDRI — large soft-box studio, broad even highlights on paint. */
export const HDRI_LOFT = '/hdri/photo_studio_loft_hall_1k.hdr'
/** Alternate HDRI — tighter softbox, more contrast and falloff. */
export const HDRI_STUDIO_SMALL = '/hdri/studio_small_09_1k.hdr'
/** Optional low-res still, usable as a loading backdrop outside the canvas. */
export const HDRI_PREVIEW = '/hdri/photo_studio_loft_hall_preview.png'

export const ASPHALT_DIFFUSE = '/floor/asphalt_02_diff_1k.jpg'
export const ASPHALT_ROUGHNESS = '/floor/asphalt_02_rough_1k.jpg'
/** OpenGL-convention normal map (`nor_gl`) — correct for three.js, do NOT flip G. */
export const ASPHALT_NORMAL = '/floor/asphalt_02_nor_gl_1k.jpg'

/**
 * Multiplier on `scene.environmentIntensity` per tier.
 *
 * The shared material library already scales every material's `envMapIntensity`
 * by {high: 1, medium: 0.85, low: 0.6} in `setMaterialQuality`. This is a second,
 * independent knob applied at the SCENE level, and it is deliberately gentle —
 * stacking 0.6 × 0.6 would leave the `low` tier with almost no specular
 * response. It exists mainly to cut the PMREM mip cost on weak GPUs, not to
 * change the look.
 */
const ENV_INTENSITY: Record<QualityTier, number> = { high: 1, medium: 0.95, low: 0.85 }

/** Texture anisotropy per tier. `low` gets 1 (no aniso) to save fill rate. */
const ANISOTROPY: Record<QualityTier, number> = { high: 8, medium: 4, low: 1 }

export interface StageEnvironmentProps {
  /** Radiance .hdr to load. Defaults to the loft-hall studio. */
  files?: string
  /** Use the HDRI as the visible backdrop, not just as an IBL source. Default false. */
  background?: boolean | 'only'
  /** Backdrop blur (only read when `background` is set). */
  blur?: number
  /** Overall IBL multiplier, composed with the per-tier factor. Default 1. */
  intensity?: number
  /**
   * Euler, in DEGREES, applied to the environment map.
   *
   * The softbox in `photo_studio_loft_hall` sits roughly overhead, which lights
   * the roof of the car well and the flanks poorly. A small yaw puts the bright
   * band over the driver's side (+X) so it lines up with the key light in
   * `Lighting.tsx` instead of fighting it.
   */
  environmentRotation?: [number, number, number]
}

/**
 * Image-based lighting from a local .hdr. No network dependency: the file is
 * served from `public/hdri/`, unlike drei's `preset` shorthand which fetches
 * from a CDN at runtime.
 *
 * Suspends while the .hdr loads — mount under a `<Suspense>` boundary, or use
 * {@link Stage}, which provides its own.
 */
export function StageEnvironment({
  files = HDRI_LOFT,
  background = false,
  blur = 0,
  intensity = 1,
  environmentRotation = [0, 45, 0],
}: StageEnvironmentProps) {
  const tier = useQualityTier()

  return (
    <DreiEnvironment
      files={files}
      background={background}
      blur={blur}
      environmentIntensity={ENV_INTENSITY[tier] * intensity}
      environmentRotation={environmentRotation}
      // Static capture. The HDRI never changes, so there is nothing to re-render.
      frames={1}
    />
  )
}

export interface StageFloorProps {
  /** Square side length of the ground plane, metres. Default 26. */
  size?: number
  /**
   * UV tiling across the whole plane. A 1k asphalt map at repeat 1 over 26 m
   * would be a 26-metre-wide smudge; ~10 keeps the aggregate at a believable
   * scale without visible tiling from the camera's normal distance.
   */
  repeat?: number
  /** Height offset. The car's contact patch is exactly y = 0 (see bodyAnchors). */
  positionY?: number
  /** Base tint multiplied into the diffuse map. */
  color?: THREE.ColorRepresentation
  /** Normal-map strength. Lowered from 1 so the floor does not out-detail the car. */
  normalScale?: number
  /** How much of the studio the floor reflects. Asphalt is a dielectric scatterer. */
  envMapIntensity?: number
  /** Cast/receive shadows. Receiving is the whole point of the floor. */
  receiveShadow?: boolean
}

/**
 * Asphalt ground plane.
 *
 * Texture configuration (colour space, wrap mode, tiling, anisotropy) is applied
 * to the CACHED textures returned by `useTexture`, inside a `useMemo`:
 *
 *  • three's `TextureLoader` leaves `colorSpace` as `NoColorSpace`, i.e. linear.
 *    A base-colour map MUST be tagged `SRGBColorSpace` or the floor renders
 *    washed-out and grey; the roughness and normal maps must stay linear,
 *    because they are data, not colour. Getting this backwards is the single
 *    most common texture bug in three.js and it is invisible in a screenshot
 *    review — hence the explicit block below.
 *  • `useMemo` rather than an effect: an effect runs after the first frame has
 *    been committed, so the floor would flash with the wrong colour space. The
 *    memo runs during render, before R3F's next rAF, and the operation is
 *    idempotent so a discarded-and-recomputed memo is harmless.
 *  • `anisotropy` is clamped to what the GPU actually supports — passing 8 to a
 *    context whose max is 4 is a silent no-op at best.
 *
 * The textures themselves are owned by drei's global loader cache and are NOT
 * disposed here; disposing them would poison the cache for every other
 * consumer and for any remount during a chapter transition. The material and
 * the geometry are created by R3F's reconciler from JSX and are disposed by it
 * automatically on unmount.
 */
export function StageFloor({
  size = 26,
  repeat = 10,
  positionY = 0,
  color = 0x71767e,
  normalScale = 0.55,
  envMapIntensity = 0.3,
  receiveShadow = true,
}: StageFloorProps) {
  const gl = useThree((s) => s.gl)
  const tier = useQualityTier()

  const maps = useTexture({
    map: ASPHALT_DIFFUSE,
    roughnessMap: ASPHALT_ROUGHNESS,
    normalMap: ASPHALT_NORMAL,
  })

  const anisotropy = useMemo(() => {
    const max = gl.capabilities.getMaxAnisotropy()
    return Math.max(1, Math.min(max, ANISOTROPY[tier]))
  }, [gl, tier])

  const { map, roughnessMap, normalMap } = useMemo(() => {
    const tiling = Math.max(1, repeat)
    // Tiling is NOT scaled by `qualityFactor(tier)`: a coarser repeat would
    // change the LOOK between tiers, which reads as a visible pop the moment
    // QualityGate steps down mid-scroll. Quality only buys down anisotropy,
    // which is invisible except as shimmer at grazing angles.
    for (const texture of [maps.map, maps.roughnessMap, maps.normalMap]) {
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(tiling, tiling)
      texture.anisotropy = anisotropy
      texture.needsUpdate = true
    }
    maps.map.colorSpace = THREE.SRGBColorSpace
    return maps
  }, [maps, repeat, anisotropy])

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={positionY} receiveShadow={receiveShadow}>
      <planeGeometry args={[size, size, 1, 1]} />
      <meshStandardMaterial
        map={map}
        roughnessMap={roughnessMap}
        normalMap={normalMap}
        normalScale={[normalScale, normalScale]}
        color={color}
        roughness={1}
        metalness={0}
        envMapIntensity={envMapIntensity}
      />
    </mesh>
  )
}

export interface StageProps {
  environment?: StageEnvironmentProps
  floor?: StageFloorProps | false
}

/**
 * The whole stage: IBL + floor, behind a local `<Suspense fallback={null}>`.
 *
 * Mount this once, as a sibling of `<Lighting />`. The two are deliberately
 * separate modules — the light rig is authored values tuned per tier, while the
 * stage is streamed asset data — so either can be replaced or art-directed
 * without touching the other.
 */
export function Stage({ environment, floor }: StageProps) {
  return (
    <Suspense fallback={null}>
      <StageEnvironment {...environment} />
      {floor === false ? null : <StageFloor {...floor} />}
    </Suspense>
  )
}

/**
 * Warm the drei texture cache for the floor maps.
 *
 * Optional. Only useful if something outside the canvas wants to trigger the
 * floor fetch earlier than the first `<StageFloor>` mount — the .hdr cannot be
 * preloaded this way because `useEnvironment` uses a different loader cache.
 */
export function preloadStageTextures(): void {
  useTexture.preload([ASPHALT_DIFFUSE, ASPHALT_ROUGHNESS, ASPHALT_NORMAL])
}

export default Stage
