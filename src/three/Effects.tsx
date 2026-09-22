import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import {
  Bloom,
  EffectComposer,
  N8AO,
  SMAA,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing'
import { HalfFloatType } from 'three'
import { ToneMappingMode } from 'postprocessing'
import { useQualityTier } from '@/three/QualityGate'
import type { QualityTier } from '@/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Effects — the postprocessing chain, gated on the active quality tier
 * ─────────────────────────────────────────────────────────────────────────────
 * Chain order is not cosmetic:
 *
 *   N8AO  →  Bloom  →  ToneMapping  →  Vignette  →  SMAA
 *
 * Ambient occlusion and bloom are HDR operations and must run BEFORE tone
 * mapping, or the bloom threshold is being compared against a squashed LDR
 * signal and the AO darkens already-clipped pixels. The vignette is an LDR
 * multiply and runs after. Anti-aliasing is last because it operates on the
 * final display-referred image.
 *
 * ── ⚠ THE TONE MAPPING EFFECT IS NOT OPTIONAL ⚠ ─────────────────────────────
 * `@react-three/postprocessing`'s `EffectComposer` FORCE-SETS
 * `gl.toneMapping = NoToneMapping` for as long as it is mounted (a ref-counted
 * guard in `EffectComposer.tsx`, restored on unmount). So the moment this
 * component is in the tree, three's own ACES tone mapping is OFF and the
 * renderer writes raw linear HDR into the framebuffer. Omitting the
 * `<ToneMapping>` effect would therefore blow out every highlight in the scene.
 * It is included unconditionally whenever the composer is mounted.
 *
 * The mode is `ACES_FILMIC` to match R3F's renderer default, so mounting or
 * unmounting this component does not change the look of the image — only the
 * addition of AO, bloom and vignette. Switching to `AGX` or `NEUTRAL` is a
 * one-word art-direction change but will shift every colour in the scene.
 *
 * ── WHY N8AO *AND* ContactShadows ───────────────────────────────────────────
 * `Lighting.tsx` renders drei's `<ContactShadows>` under the car. That is a
 * ground-plane occluder: it darkens the FLOOR. It cannot darken the inside of
 * the engine bay, the gap between a wishbone and the chassis, or where a brake
 * disc meets its caliper. N8AO is screen-space and does exactly that job, which
 * matters enormously in the `reveal` → `engine` chapters once the shell lifts
 * off and hundreds of internal surfaces become visible at once.
 *
 * ── WHAT IS DELIBERATELY ABSENT ─────────────────────────────────────────────
 * No `DepthOfField`. The camera is driven by per-chapter keyframes and moves
 * constantly while the user scrolls; a focus pull that lags the camera by a
 * frame reads as a defect, not as cinema, and a bokeh pass costs a full extra
 * mip chain. If the scene composition later wants a hero focus pull on a
 * specific chapter, it should be an explicit, authored target — not a
 * continuous autofocus.
 *
 * ── MOUNT POINT ─────────────────────────────────────────────────────────────
 * Mount once, as a sibling of `<Lighting />` and `<Stage />`, INSIDE `<Canvas>`.
 * `EffectComposer` takes over rendering at `renderPriority = 1`; every other
 * `useFrame` in the app must keep the default priority 0 so its mutations are
 * applied before the composer renders. The scroll-driven camera and progress
 * systems already do.
 */

/** `low` renders no postprocessing at all — the bare renderer path. */
const AO_QUALITY: Record<QualityTier, 'high' | 'medium' | 'low' | 'performance'> = {
  high: 'high',
  medium: 'medium',
  low: 'performance',
}

/**
 * Composer MSAA sample count.
 *
 * The composer renders the scene into an offscreen framebuffer, so the
 * `<Canvas gl={{ antialias: true }}>` attribute has NO effect once it is
 * mounted — canvas-level MSAA only applies to the default framebuffer, which is
 * now just the destination of a blit. All edge quality therefore comes from
 * either this or the SMAA pass below. drei/postprocessing defaults to 8, which
 * is a large bandwidth cost for a scene that is mostly smooth bodywork; 4 is
 * visually indistinguishable here at dpr 1.
 */
const MULTISAMPLING: Record<QualityTier, number> = { high: 4, medium: 2, low: 0 }

export interface EffectsProps {
  /** Master switch. Default true. The `low` tier disables the chain regardless. */
  enabled?: boolean
  /** Screen-space ambient occlusion. Default true. */
  ao?: boolean
  /** Highlight bloom. Default true. */
  bloom?: boolean
  /** Edge darkening. Default true. */
  vignette?: boolean
  /**
   * Force the SMAA pass on or off.
   *
   * Default `undefined` = decide from the live WebGL context: SMAA is added only
   * when the canvas was created WITHOUT hardware antialiasing, so the two are
   * never stacked. Reading it at runtime rather than taking it as a prop keeps
   * this correct whichever way `<Canvas>` in `App.tsx` is finally configured.
   */
  smaa?: boolean
  /** Bloom intensity multiplier, for art direction without touching the chain. */
  bloomIntensity?: number
  /** AO intensity multiplier. */
  aoIntensity?: number
}

/**
 * Reads whether the drawing buffer has hardware MSAA.
 *
 * Safe against a null `getContextAttributes()` (a lost context returns null on
 * some browsers); in that case we assume no MSAA and let SMAA cover it, which
 * is the conservative choice — a slightly soft frame beats a jagged one.
 */
function useCanvasHasMsaa(): boolean {
  const gl = useThree((s) => s.gl)
  return useMemo(() => gl.getContextAttributes()?.antialias === true, [gl])
}

/**
 * The postprocessing chain. Returns `null` (no composer at all) on the `low`
 * tier or when disabled, which restores three's own tone mapping and puts the
 * renderer back on its normal, cheaper single-pass path.
 */
export function Effects({
  enabled = true,
  ao = true,
  bloom = true,
  vignette = true,
  smaa,
  bloomIntensity = 1,
  aoIntensity = 1,
}: EffectsProps) {
  const tier = useQualityTier()
  const canvasHasMsaa = useCanvasHasMsaa()

  // All hooks have run by this point — an early return after them is safe and
  // cannot change hook order between renders.
  if (!enabled || tier === 'low') return null

  const useSmaa = smaa ?? !canvasHasMsaa

  return (
    <EffectComposer
      multisampling={MULTISAMPLING[tier]}
      // Half-float is required: bloom thresholds above 1.0 only mean something
      // if the framebuffer can actually hold values above 1.0.
      frameBufferType={HalfFloatType}
      enableNormalPass={false}
    >
      {ao ? (
        <N8AO
          quality={AO_QUALITY[tier]}
          // Half-res AO with depth-aware upsampling is the single biggest
          // saving here and costs almost nothing visually on a car, whose
          // occlusion contacts are large and soft.
          halfRes={tier !== 'high'}
          depthAwareUpsampling
          aoRadius={0.75}
          distanceFalloff={0.9}
          intensity={1.9 * aoIntensity}
          aoSamples={tier === 'high' ? 16 : 8}
          denoiseSamples={tier === 'high' ? 4 : 2}
          denoiseRadius={tier === 'high' ? 12 : 8}
          color="#0a0c11"
        />
      ) : null}

      {bloom ? (
        <Bloom
          mipmapBlur
          // Threshold above 1.0: only genuine HDR highlights — the lamp lenses
          // and their emissive cores in `materialRewrite.ts` — bloom. Anything
          // lower and the whole chrome set turns into a white smear.
          luminanceThreshold={1.05}
          luminanceSmoothing={0.28}
          intensity={(tier === 'high' ? 0.62 : 0.44) * bloomIntensity}
          radius={0.72}
          levels={tier === 'high' ? 7 : 5}
        />
      ) : null}

      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />

      {vignette ? (
        <Vignette
          // Not scaled by the quality factor: the vignette is a framing device,
          // not a quality feature, so attenuating it would change the
          // composition of the shot between tiers and make a QualityGate step
          // down visible as a change in the image rather than in its fidelity.
          offset={0.26}
          darkness={0.72}
          eskil={false}
        />
      ) : null}

      {useSmaa ? <SMAA /> : null}
    </EffectComposer>
  )
}

export default Effects
