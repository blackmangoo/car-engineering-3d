import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { qualityFactor, useQualityTier } from '@/three/QualityGate'
import { setMaterialQuality } from '@/three/materials'
import type { QualityTier } from '@/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Lighting — the studio rig, plus two integration shims
 * ─────────────────────────────────────────────────────────────────────────────
 * A four-light studio setup: one shadow-casting key, a cool fill, a warm rim and
 * a hemisphere bounce. Values are tuned for the shared material library (env-map
 * intensities 0.5–1.6, clearcoat paint) rather than for a generic scene.
 *
 * ── TWO SHIMS LIVE HERE ON PURPOSE ──────────────────────────────────────────
 * Both are workarounds for things this module does not own and must not edit:
 *
 *  1. {@link ensureShadowMap} — `<Canvas shadows>` was dropped from `App.tsx`,
 *     which silently turns off every shadow in the scene. This re-enables the
 *     shadow map from inside a file we DO own. It is strictly additive: it only
 *     ever turns shadows ON, never off, so it cannot fight `App.tsx` whichever
 *     way the arbitration lands.
 *
 *  2. {@link MaterialQualityBridge} — pushes the store's `qualityTier` into
 *     `setMaterialQuality`, which the materials contract expects to be called on
 *     mount and on every tier change. This belongs in the scene composition, but
 *     that file is currently contested, so it lives here until it is re-homed.
 *
 * ⚠ Both shims only run if `<Lighting />` is actually mounted by the scene. If
 * the composition ends up without it, they have to move with it.
 */

/** Shadow-map resolution per tier. `low` disables shadows entirely. */
const SHADOW_MAP_SIZE: Record<QualityTier, number> = { high: 2048, medium: 1024, low: 512 }

/** Half-extent of the key light's orthographic shadow camera, metres. */
const SHADOW_FRUSTUM = 6.5

/**
 * Idempotently enable the shadow map.
 *
 * Called from the render body rather than an effect because `shadowMap.type` is
 * part of three's program cache key: it has to be set BEFORE the first material
 * compiles, or every material would need a forced recompile afterwards. On the
 * first render of this component no child materials exist yet, and on every
 * later render the guard makes it a no-op — so the side effect is safe, cheap
 * and cannot thrash.
 */
function ensureShadowMap(gl: THREE.WebGLRenderer): void {
  if (gl.shadowMap.enabled && gl.shadowMap.type === THREE.PCFSoftShadowMap) return
  gl.shadowMap.enabled = true
  gl.shadowMap.type = THREE.PCFSoftShadowMap
}

/**
 * Keeps the shared material library in step with the active quality tier.
 *
 * `setMaterialQuality` re-applies `envMapIntensity` scaling to every cached
 * material and, on `low`, drops clearcoat and fakes transmission. It must fire
 * once on mount (with whatever tier the store starts on) and again on every
 * change — including the async downgrade `QualityGate` performs after its
 * `getGPUTier()` probe resolves. A `[tier]` effect covers all three.
 *
 * Renderless: returns null and touches nothing in the scene graph.
 */
export function MaterialQualityBridge(): null {
  const tier = useQualityTier()
  useEffect(() => {
    setMaterialQuality(tier)
  }, [tier])
  return null
}

export interface LightingProps {
  /** Cast shadows at all. Default true (and forced off on the `low` tier). */
  shadows?: boolean
  /** Render drei's <ContactShadows> under the car. Default true; off on `low`. */
  contactShadows?: boolean
  /** Overall intensity multiplier, for art-direction tweaks without touching the rig. */
  intensity?: number
}

/**
 * Key + fill + rim + bounce. Mount inside `<Canvas>`; there is no reason to
 * mount it twice.
 */
export function Lighting({
  shadows = true,
  contactShadows = true,
  intensity = 1,
}: LightingProps) {
  const gl = useThree((s) => s.gl)
  const tier = useQualityTier()
  const q = qualityFactor(tier)

  // See the doc comment on `ensureShadowMap` — render-body call is intentional.
  if (shadows) ensureShadowMap(gl)

  const castShadows = shadows && tier !== 'low'
  const mapSize = SHADOW_MAP_SIZE[tier]

  return (
    <>
      <MaterialQualityBridge />

      {/* Bounce: a cool sky over a dark ground reads as an interior studio, and
          unlike a flat ambientLight it keeps the underside of the car from going
          flat grey. */}
      <hemisphereLight
        args={[0x9dc6ee, 0x14161c, 0.45 * intensity]}
      />

      {/* KEY — the shadow-casting sun of the rig. Placed high and to the driver's
          side (+X) so the highlight runs down the flank and the shadow falls away
          from the camera's default three-quarter view. */}
      <directionalLight
        position={[4.6, 6.8, 3.4]}
        intensity={2.35 * intensity}
        color={0xfff4e6}
        castShadow={castShadows}
        shadow-mapSize-width={mapSize}
        shadow-mapSize-height={mapSize}
        shadow-camera-near={0.5}
        shadow-camera-far={26}
        shadow-camera-left={-SHADOW_FRUSTUM}
        shadow-camera-right={SHADOW_FRUSTUM}
        shadow-camera-top={SHADOW_FRUSTUM}
        shadow-camera-bottom={-SHADOW_FRUSTUM}
        shadow-bias={-0.0004}
        shadow-normalBias={0.022}
        shadow-radius={3}
      />

      {/* FILL — cool, from the opposite side and slightly behind, so it opens up
          the shadow side without erasing the key's falloff. Never casts. */}
      <directionalLight
        position={[-5.4, 3.1, -2.2]}
        intensity={0.62 * intensity}
        color={0xbcd8ff}
      />

      {/* RIM — from behind and low, the edge light that separates the body from
          the backdrop. This is what makes the clearcoat read. */}
      <directionalLight
        position={[-2.6, 3.4, -6.4]}
        intensity={1.5 * intensity}
        color={0xffe3c2}
      />

      {/* A small warm kick from the front-below, filling the splitter and the
          underside of the nose so the front end does not read as a black hole. */}
      <directionalLight
        position={[1.2, 0.7, 6.2]}
        intensity={0.28 * intensity}
        color={0xffd9b0}
      />

      {contactShadows && tier !== 'low' ? (
        // Contact occlusion directly under the car. A directional shadow cannot
        // produce this: the tyre/ground interface needs the tight, blurred
        // darkening that grounds 1.4 tonnes of car on the floor.
        <ContactShadows
          position={[0, 0.004, 0]}
          scale={13}
          resolution={Math.max(256, Math.round(1024 * q))}
          blur={2.6}
          opacity={0.62}
          far={2.6}
          frames={Number.POSITIVE_INFINITY}
          color={0x05070c}
        />
      ) : null}
    </>
  )
}

export default Lighting
