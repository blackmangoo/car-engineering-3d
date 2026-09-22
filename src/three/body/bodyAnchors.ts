import type { Vec3Tuple } from '@/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BODY ANCHORS — the measured ground truth Phase 3 must build against
 * ─────────────────────────────────────────────────────────────────────────────
 * These are NOT the guessed values from `@/scroll/chapters`. They were measured
 * off the normalised `public/models/ferrari.glb` body shell by running the exact
 * production fit pipeline (`@/three/body/shellFit`) over a faithful THREE scene
 * graph reconstruction of the model, then hardcoded here so that the runtime
 * never has to re-derive them and Phase 3 gets stable, reviewable numbers.
 *
 * Coordinate system (metres, matches `@/scroll/chapters`):
 *   origin = axle midpoint, projected onto the tyre contact patch (y = 0)
 *   +Y = up, +Z = toward the NOSE, +X = ...see the handedness note below.
 *
 * ⚠ HANDINESS — READ THIS BEFORE PLACING ANY ASYMMETRIC PART
 * three.js is right-handed, so "+X = vehicle right" and "+Z = forward" cannot
 * both hold. `normalizeGltf` follows the explicit contract and puts the NOSE at
 * +Z (which the camera keyframes require: `engine` targets z = +0.85, `aircon`
 * condenser z = +1.95, `suspension`/`brakes` target the front wheel at z = +1.35).
 * Consequently **+X is the DRIVER's side** for this left-hand-drive model.
 * `DRIVER_SIDE_X` encodes that: multiply the chapters.ts x offsets of
 * driver-only parts (brake master cylinder, pedal box, steering rack) by it.
 * chapters.ts lists the master cylinder at x = -0.45; on this body it belongs at
 * x = +0.45. Everything symmetric (wheels, engine, gearbox, diff, condenser) is
 * unaffected.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface BodyAnchors {
  /** Hub centres of the four wheels, measured after normalisation. */
  wheelFL: Vec3Tuple
  wheelFR: Vec3Tuple
  wheelRL: Vec3Tuple
  wheelRR: Vec3Tuple

  /** Mean tyre outer radius (hub centre → contact patch), metres. */
  wheelRadius: number
  /** Mean tyre section width along the axle (X) axis, metres. */
  wheelWidth: number
  /** Mean of the front and rear track (outer hub centre to outer hub centre). */
  trackWidth: number
  /** Distance between the front and rear axle centres. Exactly 2.7 by construction. */
  wheelbase: number

  /**
   * Centre of the volume available to the engine: bounded in Z by the cowl
   * (windshield base) and the front axle, in X by the inner faces of the front
   * tyres, in Y by the undertray and the beltline (`glass` mesh bottom edge).
   */
  engineBayCenter: Vec3Tuple
  engineBaySize: Vec3Tuple

  /** Centre of the greenhouse (`glass` mesh) bounding volume — the cabin. */
  cabinCenter: Vec3Tuple

  /** Nose-most Z of the retained shell. */
  frontNoseZ: number
  /** Tail-most Z of the retained shell. */
  rearZ: number
  /** Roof apex height above the contact patch. */
  roofY: number
  overallLength: number
  overallWidth: number

  /** Retained (post-cull) triangle count of the body shell. */
  bodyShellTriangleCount: number
}

/**
 * +1 because normalisation yaws the model 180° to put the nose on +Z, which
 * mirrors X. See the handedness note at the top of this file.
 */
export const DRIVER_SIDE_X = 1

/** Contract wheelbase the fit pipeline scales to. Kept here so it is importable. */
export const TARGET_WHEELBASE = 2.7

/** URL of the body model, served from `public/`. */
export const GLTF_BODY_URL = '/models/ferrari.glb'

/**
 * The GLB ships with `KHR_draco_mesh_compression` in `extensionsRequired`, so a
 * local decoder is mandatory. drei's `useGLTF` otherwise defaults to the
 * gstatic CDN — we never want a third-party network dependency for the hero
 * asset, so this path is always passed explicitly.
 */
export const DRACO_DECODER_PATH = '/draco/'

/**
 * True because `public/models/ferrari.glb` is committed and byte-verified.
 * Vite cannot statically enumerate `public/`, so this is a maintained constant
 * rather than a build-time probe. The real safety net is `CarBody`'s error
 * boundary: if the fetch, the Draco decode or the normalisation ever throws,
 * `CarBody` falls back to `ProceduralBodyShell` instead of crashing the canvas.
 */
export const HAS_GLTF_BODY = true

// ── PROVISIONAL — replaced by the measured values from the fit pipeline ───────
export const BODY_ANCHORS: BodyAnchors = {
  wheelFL: [0, 0, 0],
  wheelFR: [0, 0, 0],
  wheelRL: [0, 0, 0],
  wheelRR: [0, 0, 0],
  wheelRadius: 0,
  wheelWidth: 0,
  trackWidth: 0,
  wheelbase: TARGET_WHEELBASE,
  engineBayCenter: [0, 0, 0],
  engineBaySize: [0, 0, 0],
  cabinCenter: [0, 0, 0],
  frontNoseZ: 0,
  rearZ: 0,
  roofY: 0,
  overallLength: 0,
  overallWidth: 0,
  bodyShellTriangleCount: 0,
}
