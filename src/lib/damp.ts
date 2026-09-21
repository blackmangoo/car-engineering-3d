import { easing } from 'maath'
import type { Euler, Vector3 } from 'three'
import type { Vec3Tuple } from '@/types'

/**
 * Thin, typed wrappers over maath's frame-rate-independent damping helpers.
 * `smoothTime` is the approximate time (seconds) to reach the target; `delta`
 * is the frame delta. These mutate in place and are the smoothing primitive
 * used by CameraRig and the Phase-2 mechanism drivers.
 */

/** A target that damp3 accepts: a scalar per-axis value, a tuple, or a Vector3. */
export type Damp3Target = number | Vec3Tuple | Vector3
/** A target that dampEuler accepts: a tuple (optionally with order) or an Euler. */
export type DampEulerTarget = [x: number, y: number, z: number] | Euler

/**
 * Damp the numeric property `prop` on `object` toward `target`.
 * Returns true while the value is still animating (maath semantics).
 */
export function damp(
  object: Record<string, number>,
  prop: string,
  target: number,
  smoothTime = 0.25,
  delta = 1 / 60,
  maxSpeed?: number,
): boolean {
  return easing.damp(object, prop, target, smoothTime, delta, maxSpeed)
}

/**
 * Damp a Vector3 in place toward `target`. Mutates and returns `current` so it
 * can be chained or fed straight back into Three.js objects.
 */
export function damp3(
  current: Vector3,
  target: Damp3Target,
  smoothTime = 0.25,
  delta = 1 / 60,
  maxSpeed?: number,
): Vector3 {
  easing.damp3(current, target as number | [number, number, number] | Vector3, smoothTime, delta, maxSpeed)
  return current
}

/** Damp an Euler in place toward `target`. Mutates and returns `current`. */
export function dampEuler(
  current: Euler,
  target: DampEulerTarget,
  smoothTime = 0.25,
  delta = 1 / 60,
  maxSpeed?: number,
): Euler {
  easing.dampE(current, target, smoothTime, delta, maxSpeed)
  return current
}
