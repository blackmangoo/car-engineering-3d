import { clamp01, inverseLerp, lerp, smoothstep } from '@/lib/math'
import type { PartId, Vec3Tuple } from '@/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * EXPLODE DATA + PURE TRANSFORM MATH
 * ─────────────────────────────────────────────────────────────────────────────
 * This module is PURE: no Three.js imports, no side effects, no WebGL. It is
 * unit-tested in a node environment and read every frame by `useExplode`.
 *
 * Convention: within a chapter, the EXPLODE occupies progress 0 → 0.55 and the
 * MECHANISM cycle occupies 0.55 → 1. `explodeProgress` / `mechanismProgress`
 * map an absolute chapter progress onto those normalised 0..1 sub-ranges.
 *
 * Axes in `EXPLODE_TABLE` are UNIT vectors in scene space
 * (+X right, +Y up, +Z toward the nose). `distance` is metres of travel at
 * progress 1, so displacement magnitude === distance * eased.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface ExplodeEntry {
  /** Unit-ish direction the part travels when exploding. */
  axis: Vec3Tuple
  /** Metres of travel at progress 1. */
  distance: number
  /** Optional euler radians applied across the explode. */
  rotation?: Vec3Tuple
  /** Optional opacity to fade to (e.g. housings ghosting out). */
  fadeTo?: number
  /** 0..1 stagger offset so parts do not all move at once. */
  delay?: number
}

export interface ExplodeTransform {
  position: Vec3Tuple
  rotation: Vec3Tuple
  opacity: number
}

/** Returned for untabled parts and at progress 0. Never mutate this object. */
export const IDENTITY_TRANSFORM: ExplodeTransform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  opacity: 1,
}

/** Upper bound of the explode sub-range within a chapter (see chapters.ts). */
const EXPLODE_END = 0.55

export const EXPLODE_TABLE: Partial<Record<PartId, ExplodeEntry>> = {
  // ── Suspension ────────────────────────────────────────────────────────────
  // Arms swing outward (±X), spring/damper lift, hub slides off along the axle.
  'susp.wishboneUpper': { axis: [0.958, 0.287, 0], distance: 0.28, rotation: [0, 0, 0.25], delay: 0.08 },
  'susp.wishboneLower': { axis: [0.958, -0.287, 0], distance: 0.30, rotation: [0, 0, -0.25], delay: 0.10 },
  'susp.spring': { axis: [0, 1, 0], distance: 0.30, delay: 0.14 },
  'susp.damper': { axis: [0, 1, 0], distance: 0.38, delay: 0.16 },
  'susp.upright': { axis: [1, 0, 0], distance: 0.20, delay: 0.06 },
  'susp.antiRollBar': { axis: [0, -1, 0], distance: 0.22, rotation: [0.2, 0, 0], delay: 0.20 },
  'susp.hub': { axis: [1, 0, 0], distance: 0.34, delay: 0.04 },

  // ── Engine ────────────────────────────────────────────────────────────────
  // Head lifts, pan drops, intake one side / exhaust the other, rotating
  // assembly separates along the vertical, flywheel slides back along the crank.
  'eng.block': { axis: [0, 0, -1], distance: 0.10, delay: 0.0 },
  'eng.head': { axis: [0, 1, 0], distance: 0.34, delay: 0.06 },
  'eng.piston': { axis: [0, 1, 0], distance: 0.62, delay: 0.18 },
  'eng.conrod': { axis: [0, 1, 0], distance: 0.48, delay: 0.20 },
  'eng.crankshaft': { axis: [0, -1, 0], distance: 0.30, delay: 0.10 },
  'eng.camshaft': { axis: [0, 1, 0], distance: 0.50, delay: 0.12 },
  'eng.valveIntake': { axis: [0.406, 0.914, 0], distance: 0.40, delay: 0.24 },
  'eng.valveExhaust': { axis: [-0.406, 0.914, 0], distance: 0.40, delay: 0.26 },
  'eng.valveSpring': { axis: [0, 1, 0], distance: 0.44, delay: 0.28 },
  'eng.flywheel': { axis: [0, 0, -1], distance: 0.30, delay: 0.16 },
  'eng.oilPan': { axis: [0, -1, 0], distance: 0.36, delay: 0.08 },
  'eng.intakeManifold': { axis: [1, 0, 0], distance: 0.42, delay: 0.20 },
  'eng.exhaustManifold': { axis: [-1, 0, 0], distance: 0.42, delay: 0.22 },

  // ── Transmission ──────────────────────────────────────────────────────────
  // Gear sets slide along the shaft axis (Z); the housing ghosts out in place.
  'trx.clutch': { axis: [0, 0, 1], distance: 0.28, delay: 0.06 },
  'trx.inputShaft': { axis: [0, 0, 1], distance: 0.40, delay: 0.10 },
  'trx.gearSet': { axis: [0, 0, -1], distance: 0.34, delay: 0.14 },
  'trx.synchro': { axis: [0, 0, -1], distance: 0.46, delay: 0.18 },
  'trx.outputShaft': { axis: [0, 0, -1], distance: 0.56, delay: 0.22 },
  'trx.differential': { axis: [0, -0.6, -0.8], distance: 0.30, delay: 0.26 },
  'trx.housing': { axis: [0, 0, -1], distance: 0.16, fadeTo: 0.15, delay: 0.0 },

  // ── Brakes ────────────────────────────────────────────────────────────────
  // Pads separate along X (the axle axis), caliper lifts +Y and out +X,
  // pistons withdraw from their bores along X.
  'brk.disc': { axis: [1, 0, 0], distance: 0.12, delay: 0.08 },
  'brk.caliper': { axis: [0.707, 0.707, 0], distance: 0.30, delay: 0.14 },
  'brk.padInner': { axis: [-1, 0, 0], distance: 0.16, delay: 0.20 },
  'brk.padOuter': { axis: [1, 0, 0], distance: 0.16, delay: 0.20 },
  'brk.caliperPiston': { axis: [-1, 0, 0], distance: 0.24, delay: 0.26 },
  'brk.line': { axis: [0, 0.8, 0.6], distance: 0.18, delay: 0.30 },
  'brk.masterCylinder': { axis: [-0.8, 0.6, 0], distance: 0.26, delay: 0.04 },

  // ── Air conditioning ──────────────────────────────────────────────────────
  // Condenser moves +Z forward, evaporator/blower +Y up into the dash,
  // compressor drops, refrigerant lines peel outward.
  'ac.compressor': { axis: [0, -1, 0], distance: 0.28, delay: 0.06 },
  'ac.condenser': { axis: [0, 0, 1], distance: 0.34, delay: 0.02 },
  'ac.receiverDrier': { axis: [0, 0.707, 0.707], distance: 0.24, delay: 0.10 },
  'ac.expansionValve': { axis: [0, 1, 0], distance: 0.22, delay: 0.18 },
  'ac.evaporator': { axis: [0, 1, 0], distance: 0.30, delay: 0.14 },
  'ac.blower': { axis: [0.8, 0.6, 0], distance: 0.28, delay: 0.16 },
  'ac.lineHigh': { axis: [0.6, 0.8, 0], distance: 0.22, delay: 0.22 },
  'ac.lineLow': { axis: [-0.6, 0.8, 0], distance: 0.22, delay: 0.24 },
}

/**
 * Map an absolute chapter progress (0..1) onto the normalised EXPLODE range.
 * Returns 0 at chapter progress 0, 1 at 0.55, and stays clamped at 1 after.
 */
export function explodeProgress(chapterProgress: number): number {
  return inverseLerp(0, EXPLODE_END, chapterProgress)
}

/**
 * Map an absolute chapter progress (0..1) onto the normalised MECHANISM range.
 * Returns 0 below chapter progress 0.55 and reaches 1 at chapter progress 1.
 */
export function mechanismProgress(chapterProgress: number): number {
  return inverseLerp(EXPLODE_END, 1, chapterProgress)
}

/**
 * Compute the exploded transform for `part` at a normalised explode `progress`
 * (0..1). Returns `IDENTITY_TRANSFORM` at progress 0 and for untabled parts.
 *
 * The per-entry `delay` staggers each part's motion across the phase so the
 * explosion reads as a sequence; displacement is a smoothstep of the staggered
 * local progress, hence monotonically non-decreasing.
 */
export function getExplodeTransform(part: PartId, progress: number): ExplodeTransform {
  const entry = EXPLODE_TABLE[part]
  const p = clamp01(progress)
  if (!entry || p <= 0) return IDENTITY_TRANSFORM

  const delay = clamp01(entry.delay ?? 0)
  const span = 1 - delay
  const local = span > 0 ? clamp01((p - delay) / span) : 1
  const eased = smoothstep(0, 1, local)
  const travel = entry.distance * eased

  const position: Vec3Tuple = [
    entry.axis[0] * travel,
    entry.axis[1] * travel,
    entry.axis[2] * travel,
  ]

  const rotation: Vec3Tuple = entry.rotation
    ? [entry.rotation[0] * eased, entry.rotation[1] * eased, entry.rotation[2] * eased]
    : [0, 0, 0]

  const opacity =
    entry.fadeTo !== undefined ? clamp01(lerp(1, entry.fadeTo, eased)) : 1

  return { position, rotation, opacity }
}
