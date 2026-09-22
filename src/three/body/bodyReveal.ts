import { progressBus } from '@/state/progressBus'
import { useAppStore } from '@/state/useAppStore'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * bodyReveal — the lift-away / fade-to-ghost curve for the body shell
 * ─────────────────────────────────────────────────────────────────────────────
 * Frame-driven state, deliberately NOT a hook and deliberately NOT React state.
 * The caller invokes `update(delta)` from its OWN `useFrame` and reads the
 * derived values straight off the returned object, so:
 *
 *  • there is no callback-ordering ambiguity between the reveal and whatever
 *    else animates in the same frame;
 *  • scrolling never re-renders React — `open`, `lift()` and `opacity()` are
 *    plain numbers read inside `useFrame` and written directly onto THREE
 *    objects;
 *  • `GltfBodyShell` and `ProceduralBodyShell` share one identical curve, so
 *    swapping between them (error boundary, or an A/B) cannot produce a jump.
 *
 * This module has no three.js and no React import. It lives apart from
 * `GltfBodyShell.tsx` for two reasons: it is the piece the procedural fallback
 * needs, and keeping it out of a component file means the component file exports
 * components only.
 *
 * ── WHY `outro` UN-DRIVES THE REVEAL ────────────────────────────────────────
 * ScrollTrigger progress LATCHES at 1 once its section has been passed, so
 * `progressBus.reveal.current` stays at 1 for the rest of the page. Multiplying
 * by `(1 - outro)` brings the shell back down for the finale instead of leaving
 * it hovering as a ghost over the closing shot.
 */

export interface RevealOptions {
  /** How far the shell rises, metres. Default 1.15. */
  liftDistance?: number
  /** Opacity the shell fades down to. Default 0.16 (matches the `ghost` library entry). */
  ghostOpacity?: number
  /** `open` value at which the fade starts. Default 0.18. */
  fadeStart?: number
  /** `open` value at which the fade is complete. Default 0.72. */
  fadeEnd?: number
  /** Damping time constant for `open`, seconds. Default 0.28. */
  smooth?: number
}

/**
 * Frame-driven reveal state.
 *
 * `open` is 0 when the shell is fully on the car and 1 when it is fully lifted
 * and ghosted.
 */
export interface BodyReveal {
  /** Damped 0..1 openness. Read after `update`. */
  open: number
  /** Advance one frame. Returns the new `open`. */
  update(delta: number): number
  /** World-space Y lift for the current `open`. */
  lift(): number
  /** Body opacity for the current `open` (1 ⇒ fully opaque). */
  opacity(): number
  /** True while the shell should render as a transparent ghost. */
  isGhost(): boolean
}

/** Default reveal tuning, exposed so callers can derive from it. */
export const REVEAL_DEFAULTS = {
  liftDistance: 1.15,
  ghostOpacity: 0.16,
  fadeStart: 0.18,
  fadeEnd: 0.72,
  smooth: 0.28,
} as const satisfies Required<RevealOptions>

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x < edge0 ? 0 : 1
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

export function createBodyReveal(options: RevealOptions = {}): BodyReveal {
  const liftDistance = options.liftDistance ?? REVEAL_DEFAULTS.liftDistance
  const ghostOpacity = options.ghostOpacity ?? REVEAL_DEFAULTS.ghostOpacity
  const fadeStart = options.fadeStart ?? REVEAL_DEFAULTS.fadeStart
  const fadeEnd = options.fadeEnd ?? REVEAL_DEFAULTS.fadeEnd
  const smooth = options.smooth ?? REVEAL_DEFAULTS.smooth

  const reveal: BodyReveal = {
    open: 0,
    update(delta: number): number {
      // Clamp both ends: a backgrounded tab hands back a multi-second delta that
      // would teleport the shell, and a negative one is nonsense.
      const dt = Math.min(Math.max(delta, 0), 1 / 20)
      const target =
        clamp01(progressBus.reveal.current) * (1 - clamp01(progressBus.outro.current))
      const reduced = useAppStore.getState().reducedMotion

      if (reduced || smooth <= 0) {
        reveal.open = target
      } else {
        // Frame-rate-independent exponential approach — the same primitive the
        // rest of the scene uses, but scalar and allocation-free.
        const lambda = 1 / smooth
        reveal.open += (target - reveal.open) * (1 - Math.exp(-lambda * dt))
      }
      return reveal.open
    },
    lift(): number {
      return liftDistance * smoothstep(0, 1, reveal.open)
    },
    opacity(): number {
      const t = smoothstep(fadeStart, fadeEnd, reveal.open)
      return 1 + (ghostOpacity - 1) * t
    },
    isGhost(): boolean {
      return reveal.opacity() < 0.999
    },
  }
  return reveal
}
