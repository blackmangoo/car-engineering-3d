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
   * tyres, in Y by the undertray and the bonnet line.
   *
   * The cowl Z is a LAYOUT RATIO (0.40 × wheelbase behind the front axle), not a
   * measurement: this asset merges windshield, side glass and rear screen into a
   * single `glass` mesh whose box spans the whole car, so its max-Z face is the
   * REAR window. See `ENGINE_BAY_LENGTH_FRACTION` in `shellFit.ts`.
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

/**
 * MEASURED — produced by running the real `shellFit` pipeline over a faithful
 * reconstruction of `public/models/ferrari.glb`. Do not hand-edit.
 *
 * Fit report that produced these numbers:
 *   yaw 3.141593 rad (180°) · wheelbaseBefore 2.650547 · scale 1.018658 ·
 *   groundOffset 0.000000 · usedWheelCorners true
 *
 * Cross-checks against the real Ferrari 458 confirm the model is 1:1 in metres
 * and the pipeline is right:
 *   raw wheelbase 2.6505 m   (real 2.650 m)   ✓
 *   raw front track 1.671 m  (real 1.672 m)   ✓
 *   raw length 4.523 m       (real 4.524 m)   ✓
 *   raw front tyre width 0.247 m (real 235 mm) ✓
 *   hub height 0.358 === tyre box centre 0.358 ✓
 *
 * ⚠⚠ DEVIATIONS FROM THE `chapters.ts` CONTRACT — MEASURED WINS ⚠⚠
 * Phase 3 MUST fit to these numbers, not to the contract:
 *   wheel |X|   0.834 … 0.856  vs contract 0.800  → up to +56 mm  MATERIAL
 *   wheel hub Y 0.3647         vs contract 0.330  → +35 mm        MATERIAL
 *   wheelRadius 0.3647         vs contract 0.330  → +35 mm        MATERIAL
 *   overallWidth 2.2992        vs contract 1.900  → +399 mm       MATERIAL
 *   overallLength 4.6182       vs contract 4.400  → +218 mm       MATERIAL
 *   wheel Z ±1.350 / wheelbase 2.7 / roofY 1.2591 → within tolerance ✓
 *
 * The 2.2992 m width is NOT a loose-bounding-box artefact: `body`'s POSITION
 * accessor min/max is perfectly symmetric (±1.1285 raw) and glTF POSITION bounds
 * are tight by spec, so the mesh genuinely spans 2.257 m pre-scale — ~330 mm
 * wider than a real 458 (1.930 m) with its extremes 163 mm outboard of the tyre
 * outer faces. The engine bay is unaffected: its X span comes from the tyres.
 */
export const BODY_ANCHORS: BodyAnchors = {
  wheelFL: [0.8555, 0.3647, 1.3504],
  wheelFR: [-0.8469, 0.3674, 1.3496],
  wheelRL: [0.8339, 0.3647, -1.3493],
  wheelRR: [-0.8425, 0.3647, -1.3507],
  wheelRadius: 0.3647,
  wheelWidth: 0.2755,
  trackWidth: 1.6894,
  wheelbase: 2.7,
  engineBayCenter: [0, 0.4916, 0.81],
  engineBaySize: [1.4139, 0.7291, 1.08],
  cabinCenter: [-0.0008, 0.886, 0.1724],
  frontNoseZ: 2.4826,
  rearZ: -2.1355,
  roofY: 1.2591,
  overallLength: 4.6182,
  overallWidth: 2.2992,
  bodyShellTriangleCount: 241938,
}
