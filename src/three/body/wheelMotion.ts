import * as THREE from 'three'
import type { WheelCorner } from '@/three/body/shellFit'
import { DRIVER_SIDE_X } from '@/three/body/bodyAnchors'
import { progressBus, scrollState } from '@/state/progressBus'
import { useAppStore } from '@/state/useAppStore'
import { damp } from '@/lib/damp'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * wheelMotion — imperative spin / steer for real wheel nodes
 * ─────────────────────────────────────────────────────────────────────────────
 * The non-React half of the wheel system. Two consumers share it:
 *
 *  • `GltfBodyShell` drives the GLB's OWN `wheel_fl` … groups through
 *    {@link applyWheelMotion} / {@link applyPlantedWheels}.
 *  • `Wheels.tsx` builds a procedural four-corner set and drives it with the
 *    same {@link stepWheelMotion} accumulator, so the two paths can never
 *    drift apart in how fast or how smoothly the car rolls.
 *
 * Both read the scroll bus inside `useFrame` and mutate transforms directly, so
 * scrolling never re-renders React.
 *
 * ── AXES ────────────────────────────────────────────────────────────────────
 * After `normalizeGltf` the car's nose is on **+Z**, `+Y` is up and `+X` is the
 * DRIVER's side (see `DRIVER_SIDE_X`). The axle is therefore the world **X**
 * axis and steering is about world **Y**.
 *
 * The GLB's wheel groups sit under an FBX2glTF Z-up→Y-up conversion node, so
 * their LOCAL axes are a signed permutation of world space. `Object3D
 * .rotateOnWorldAxis` explicitly "assumes no rotated parent" (three.core.js) and
 * would spin them about the wrong axis, so {@link prepareWheelNode} converts the
 * world axes into each node's PARENT frame once and caches the result.
 */

const WORLD_X = new THREE.Vector3(1, 0, 0)
const WORLD_Y = new THREE.Vector3(0, 1, 0)

// Reused every frame — never allocate in the hot path.
const _qSpin = new THREE.Quaternion()
const _qSteer = new THREE.Quaternion()
const _parentQuat = new THREE.Quaternion()
const _inverse = new THREE.Quaternion()
const _axis = new THREE.Vector3()
const _scale = new THREE.Vector3()

/** Maximum front-wheel steering angle, radians (~5°). */
export const MAX_STEER_ANGLE = 0.087
/**
 * px/s of GSAP ScrollTrigger velocity that maps to the spin ceiling. A fast
 * flick measures 2000–5000 px/s; dividing by this gives ~1 at normal speed.
 */
export const SPIN_VELOCITY_SCALE = 420
/** Spin ceiling, rad/s (~1.7 rev/s). Capped so the spokes never strobe. */
export const MAX_SPIN_RATE = 11

/** Smoothing time constants, seconds. Shared by both wheel paths. */
export const SPIN_SMOOTH = 0.18
export const SPIN_COAST_SMOOTH = 0.25
export const STEER_SMOOTH = 0.22

/** Longest delta we will integrate. A backgrounded tab returns a huge one. */
export const MAX_STEP = 1 / 20

export type WheelNodeSet = Partial<Record<WheelCorner, THREE.Object3D | null>>

export interface WheelNodeState {
  /** The node's untouched local quaternion, captured on first use. */
  base: THREE.Quaternion
  /** World +X (axle) expressed in the node's PARENT frame. */
  axle: THREE.Vector3
  /** World +Y (kingpin) expressed in the node's PARENT frame. */
  kingpin: THREE.Vector3
  /** The node's untouched local position, for the planted-wheel compensation. */
  basePosition: THREE.Vector3
}

const nodeState = new WeakMap<THREE.Object3D, WheelNodeState>()

/**
 * Capture (or refresh) the frame-independent data `applyWheelMotion` needs.
 * Called automatically on first use; call it explicitly after reparenting a
 * wheel node or changing any ancestor's rotation.
 */
export function prepareWheelNode(node: THREE.Object3D): WheelNodeState {
  node.updateWorldMatrix(true, false)
  const parent = node.parent
  if (parent) parent.getWorldQuaternion(_parentQuat)
  else _parentQuat.identity()
  _inverse.copy(_parentQuat).invert()

  const state: WheelNodeState = {
    base: node.quaternion.clone(),
    axle: _axis.copy(WORLD_X).applyQuaternion(_inverse).normalize().clone(),
    kingpin: _axis.copy(WORLD_Y).applyQuaternion(_inverse).normalize().clone(),
    basePosition: node.position.clone(),
  }
  nodeState.set(node, state)
  return state
}

function stateOf(node: THREE.Object3D): WheelNodeState {
  return nodeState.get(node) ?? prepareWheelNode(node)
}

/**
 * Set an absolute spin + steer on existing wheel nodes.
 *
 * Composition is `R_steer · R_spin · R_base`, both rotations expressed in the
 * parent frame: the wheel spins about its own axle and the whole assembly is
 * then steered about the kingpin — which is what a real strut does.
 */
export function applyWheelMotion(
  nodes: WheelNodeSet,
  spinAngle: number,
  steerAngle: number,
  corners: readonly WheelCorner[] = ['FL', 'FR', 'RL', 'RR'],
): void {
  for (const corner of corners) {
    const node = nodes[corner]
    if (!node) continue
    const s = stateOf(node)

    node.quaternion.copy(s.base)
    // premultiply applies left-to-right, so spin first, then steer.
    node.quaternion.premultiply(_qSpin.setFromAxisAngle(s.axle, spinAngle))
    if (steerAngle !== 0 && (corner === 'FL' || corner === 'FR')) {
      node.quaternion.premultiply(_qSteer.setFromAxisAngle(s.kingpin, steerAngle))
    }
  }
}

/**
 * Keep the wheels on the tarmac while the bodywork lifts away.
 *
 * `lift` is a WORLD-space Y offset applied to an ancestor. To cancel it locally
 * we translate along world-Y-expressed-in-the-parent-frame, divided by the
 * ancestor's uniform scale (the fit pipeline scales the shell to a 2.7 m
 * wheelbase, so 1 local unit ≠ 1 metre).
 */
export function applyPlantedWheels(nodes: WheelNodeSet, lift: number): void {
  for (const corner of ['FL', 'FR', 'RL', 'RR'] as const) {
    const node = nodes[corner]
    if (!node) continue
    const s = stateOf(node)
    node.position.copy(s.basePosition)
    if (lift === 0) continue
    const parent = node.parent
    const uniformScale = parent ? parent.getWorldScale(_scale).x || 1 : 1
    node.position.addScaledVector(s.kingpin, -lift / uniformScale)
  }
}

/** Show/hide the GLB's own rolling stock (e.g. when `<Wheels/>` takes over). */
export function setWheelNodesVisible(nodes: WheelNodeSet, visible: boolean): void {
  for (const corner of ['FL', 'FR', 'RL', 'RR'] as const) {
    const node = nodes[corner]
    if (node) node.visible = visible
  }
}

// ── the shared scroll → motion accumulator ───────────────────────────────────

/**
 * Rolling state for one wheel set.
 *
 * Declared with `type`, NOT `interface`, on purpose: `damp()` from `@/lib/damp`
 * takes a `Record<string, number>`, and TypeScript only infers an implicit index
 * signature for object-literal TYPES. An identical `interface` would fail to
 * assign and produce TS2345 at every call site.
 */
export type WheelMotionState = {
  /** Accumulated spin, radians. Wrapped into one turn to keep float precision. */
  spinAngle: number
  /** Current spin rate, rad/s. */
  spinRate: number
  /** Current front-wheel steer angle, radians. */
  steerAngle: number
}

export function createWheelMotionState(): WheelMotionState {
  return { spinAngle: 0, spinRate: 0, steerAngle: 0 }
}

export interface WheelMotionFlags {
  /** Spin the wheels from scroll velocity. */
  spin: boolean
  /** Steer the front wheels from the `suspension` chapter's progress. */
  steer: boolean
}

/**
 * Advance one frame of wheel motion from the scroll bus. Mutates `state`.
 *
 * Honours `reducedMotion` from the store: with it set, the spin target is zero
 * and the steering sweep is skipped, but both still damp back to rest rather
 * than snapping — a stopped wheel should settle, not teleport.
 */
export function stepWheelMotion(
  state: WheelMotionState,
  rawDelta: number,
  flags: WheelMotionFlags,
): void {
  const delta = Math.min(Math.max(rawDelta, 0), MAX_STEP)
  const reduced = useAppStore.getState().reducedMotion

  if (flags.spin && !reduced) {
    const targetRate = THREE.MathUtils.clamp(
      scrollState.velocity / SPIN_VELOCITY_SCALE,
      -MAX_SPIN_RATE,
      MAX_SPIN_RATE,
    )
    damp(state, 'spinRate', targetRate, SPIN_SMOOTH, delta)
  } else {
    damp(state, 'spinRate', 0, SPIN_COAST_SMOOTH, delta)
  }
  state.spinAngle += state.spinRate * delta
  // Keep the angle inside one turn: float precision degrades over a long scroll.
  if (Math.abs(state.spinAngle) > Math.PI * 2) state.spinAngle %= Math.PI * 2

  if (flags.steer && !reduced) {
    // A gentle lock-to-lock sweep across the suspension chapter, centred on 0.
    // `DRIVER_SIDE_X` resolves the handedness: after `normalizeGltf` the nose is
    // on +Z and +X is the DRIVER's side, so a positive Y yaw is a LEFT turn.
    // Both wheel paths want the same sign, so it is baked in here rather than
    // left to each caller to remember.
    const target =
      Math.sin(progressBus.suspension.current * Math.PI) * MAX_STEER_ANGLE * DRIVER_SIDE_X
    damp(state, 'steerAngle', target, STEER_SMOOTH, delta)
  } else {
    damp(state, 'steerAngle', 0, STEER_SMOOTH, delta)
  }
}
