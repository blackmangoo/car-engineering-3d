import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BrakeDisc, Caliper, Wheel } from '@/three/primitives'
import { BODY_ANCHORS, type BodyAnchors } from '@/three/body/bodyAnchors'
import type { WheelCorner } from '@/three/body/shellFit'
import {
  createWheelMotionState,
  stepWheelMotion,
  type WheelMotionState,
} from '@/three/body/wheelMotion'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Wheels — the procedural four-corner wheel set
 * ─────────────────────────────────────────────────────────────────────────────
 * Built from the primitives library and placed on the MEASURED anchors, so it
 * occupies exactly the same stations as the GLB's own rolling stock:
 *
 *   wheelFL [0.8555, 0.3647, 1.3504] … wheelRR [-0.8425, 0.3647, -1.3507]
 *
 * Used by `ProceduralBodyShell`, and by any integration that prefers to hide the
 * GLB's wheels (`<GltfBodyShell hideWheels />`) so the brake chapter can show a
 * disc + caliper it controls.
 *
 * The imperative half — spin/steer accumulation, and driving the GLB's OWN wheel
 * nodes — lives in `./wheelMotion.ts`. That module is shared with
 * `GltfBodyShell`, which is why the two paths cannot drift apart.
 *
 * ── AXES ────────────────────────────────────────────────────────────────────
 * After `normalizeGltf` the nose is on **+Z**, `+Y` is up and `+X` is the
 * DRIVER's side. So the axle is local **X** (matching `<Wheel>` and
 * `<BrakeDisc>`, both of which spin about +X) and steering is local **Y**.
 *
 * MUST be mounted under an unrotated group — the spin/steer groups below assume
 * local +X is the axle and local +Y is the kingpin. `ProceduralBodyShell`
 * satisfies this; a caller that rotates the car must rotate an ancestor ABOVE
 * the anchors, never the group `<Wheels/>` returns.
 */

/**
 * Disc geometry derived from the measured tyre radius rather than authored, so
 * it stays proportional if the anchors ever change.
 *
 * The 0.555 factor is not a guess: the GLB's own `brake` meshes measure an
 * outer radius of 0.2025 m against a tyre radius of 0.3647 m, and
 * 0.3647 × 0.555 = 0.2024. The procedural discs therefore match the real
 * asset's brakes to within a tenth of a millimetre.
 */
function discSpec(anchors: BodyAnchors) {
  const outerRadius = anchors.wheelRadius * 0.555
  return {
    outerRadius,
    innerRadius: outerRadius * 0.45,
    thickness: outerRadius * 0.153,
  }
}

/**
 * One shared accumulator for the whole set — all four corners read the same
 * spin and steer, as they must.
 *
 * A single `useRef<WheelMotionState>` holding a plain object rather than three
 * `useRef<number>`s: `damp()` from `@/lib/damp` requires a `Record<string,
 * number>` to mutate, and a `RefObject<number>` is not one.
 */
function useWheelMotionState(flags: { spin: boolean; steer: boolean }) {
  const state = useRef<WheelMotionState | null>(null)
  if (state.current === null) state.current = createWheelMotionState()

  useFrame((_, rawDelta) => {
    // `flags` is captured fresh each render by R3F's mutable-callback ref, so
    // toggling `spin`/`steer` needs no re-subscription.
    if (state.current) stepWheelMotion(state.current, rawDelta, flags)
  })

  return state
}

export interface WheelsProps {
  /** Anchor set to place the wheels on. Defaults to the measured `BODY_ANCHORS`. */
  anchors?: BodyAnchors
  /** Spin the wheels from scroll velocity. Default true. */
  spin?: boolean
  /** Steer the front wheels during the `suspension` chapter. Default true. */
  steer?: boolean
  /** Render the disc + caliper inside each wheel. Default true. */
  brakes?: boolean
  /** Extra world-space offset applied to the whole set. */
  position?: [number, number, number]
}

/**
 * Four wheel assemblies: tyre + alloy rim (spinning) with a vented disc inside,
 * and a fixed caliper that steers with the hub but does not spin.
 *
 * Nesting per corner is `position → steer(rotation.y) → spin(rotation.x)`, with
 * the caliper inside the steer group but OUTSIDE the spin group — exactly the
 * real kinematics, and the reason the caliper stays put while the disc turns.
 */
export function Wheels({
  anchors = BODY_ANCHORS,
  spin = true,
  steer = true,
  brakes = true,
  position = [0, 0, 0],
}: WheelsProps) {
  const corners = useMemo(
    () =>
      [
        { id: 'FL' as WheelCorner, at: anchors.wheelFL },
        { id: 'FR' as WheelCorner, at: anchors.wheelFR },
        { id: 'RL' as WheelCorner, at: anchors.wheelRL },
        { id: 'RR' as WheelCorner, at: anchors.wheelRR },
      ],
    [anchors],
  )

  const disc = useMemo(() => discSpec(anchors), [anchors])
  const steerRefs = useRef<Partial<Record<WheelCorner, THREE.Group | null>>>({})
  const spinRefs = useRef<Partial<Record<WheelCorner, THREE.Group | null>>>({})

  const motion = useWheelMotionState({ spin, steer })

  useFrame(() => {
    const s = motion.current
    if (!s) return
    for (const { id } of corners) {
      const spinGroup = spinRefs.current[id]
      if (spinGroup) spinGroup.rotation.x = s.spinAngle
      const steerGroup = steerRefs.current[id]
      // Only the front axle steers.
      if (steerGroup) steerGroup.rotation.y = id === 'FL' || id === 'FR' ? s.steerAngle : 0
    }
  })

  // Detach the refs if the anchor set changes underneath us.
  useEffect(() => {
    return () => {
      steerRefs.current = {}
      spinRefs.current = {}
    }
  }, [])

  return (
    <group position={position}>
      {corners.map(({ id, at }) => (
        <group key={id} position={at}>
          <group
            ref={(g) => {
              steerRefs.current[id] = g
            }}
          >
            <group
              ref={(g) => {
                spinRefs.current[id] = g
              }}
            >
              <Wheel radius={anchors.wheelRadius} width={anchors.wheelWidth} material="aluminium" />
              {brakes ? (
                <BrakeDisc
                  outerRadius={disc.outerRadius}
                  innerRadius={disc.innerRadius}
                  thickness={disc.thickness}
                  material="castIron"
                />
              ) : null}
            </group>
            {brakes ? (
              <Caliper
                discRadius={disc.outerRadius}
                thickness={disc.thickness}
                material="aluminium"
              />
            ) : null}
          </group>
        </group>
      ))}
    </group>
  )
}

export default Wheels
