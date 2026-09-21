/**
 * Pure, unit-testable math helpers. No side effects, no Three.js imports.
 * These are the shared numeric primitives used across scroll, camera and
 * mechanism animation code.
 */

/** Clamp `value` into the inclusive range [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

/** Clamp `value` into the inclusive range [0, 1]. */
export function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

/** Linear interpolation between `a` and `b` by factor `t` (unclamped). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Inverse of lerp: given a `value` within [a, b], return the factor t (clamped 0..1).
 * Returns 0 when the range is degenerate (a === b).
 */
export function inverseLerp(a: number, b: number, value: number): number {
  if (a === b) return 0
  return clamp01((value - a) / (b - a))
}

/** Map `value` from the input range [inMin, inMax] to the output range [outMin, outMax] (clamped). */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return lerp(outMin, outMax, inverseLerp(inMin, inMax, value))
}

/** Hermite smoothstep (0 at edge0, 1 at edge1, smooth in between). Clamped. */
export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** Convert degrees to radians. */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Remap an absolute chapter progress `value` into a normalised 0..1 sub-progress
 * across the inclusive window [start, end]. This is how the mechanism phase
 * (progress 0.55 -> 1) is turned into a clean 0..1 driver for animations.
 */
export function remapProgress(value: number, start: number, end: number): number {
  return inverseLerp(start, end, value)
}
