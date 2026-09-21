import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { MathUtils, Vector3, type PerspectiveCamera } from 'three'
import { damp3 } from '@/lib/damp'
import { getChapter } from '@/scroll/chapters'
import { progressBus, scrollState } from '@/state/progressBus'
import { useAppStore } from '@/state/useAppStore'

// Module-level scratch objects — reused every frame, never reallocated.
const _desired = new Vector3()
const _lookTarget = new Vector3()

// Camera smoothing constants.
const POS_SMOOTH = 0.35 // approx. seconds to reach the desired position
const FOV_LAMBDA = 4 // damping lambda for the field-of-view
const IDLE_VELOCITY_EPS = 8 // px/s below which we consider scrolling "settled"

/**
 * CameraRig — lives INSIDE the <Canvas>. Every frame it reads the non-reactive
 * `scrollState.activeChapter` + that chapter's `progressBus` value, interpolates
 * the camera along the chapter's from→to path, damps toward it, looks at the
 * (damped) target and lerps the fov.
 *
 * There are ZERO React state reads / hook subscriptions here: the store is only
 * touched via the imperative, non-reactive `getState()` for the reduced-motion
 * flag, so scrolling never re-renders React.
 */
export function CameraRig() {
  const lookTarget = useRef(new Vector3(0, 0.7, 0))
  const fovCurrent = useRef(35)

  useFrame((state, delta) => {
    const cam = state.camera as PerspectiveCamera
    const activeId = scrollState.activeChapter
    const { from, to, target, fov } = getChapter(activeId).camera
    const p = progressBus[activeId].current

    // Interpolate position from → to by the damped chapter progress.
    _desired.set(
      MathUtils.lerp(from[0], to[0], p),
      MathUtils.lerp(from[1], to[1], p),
      MathUtils.lerp(from[2], to[2], p),
    )

    // Subtle idle drift ONLY when motion is allowed and scrolling has settled.
    const reduced = useAppStore.getState().reducedMotion
    const settled = Math.abs(scrollState.velocity) < IDLE_VELOCITY_EPS
    if (!reduced && settled) {
      const t = state.clock.elapsedTime
      _desired.x += Math.sin(t * 0.25) * 0.06
      _desired.y += Math.cos(t * 0.2) * 0.04
      _desired.z += Math.sin(t * 0.18) * 0.05
    }

    damp3(cam.position, _desired, POS_SMOOTH, delta)

    // Damp the look-at target for buttery pans across chapter boundaries.
    _lookTarget.set(target[0], target[1], target[2])
    damp3(lookTarget.current, _lookTarget, POS_SMOOTH, delta)
    cam.lookAt(lookTarget.current)

    // Damp fov, then refresh the projection matrix only when it actually moves.
    fovCurrent.current = MathUtils.damp(fovCurrent.current, fov, FOV_LAMBDA, delta)
    if (Math.abs(fovCurrent.current - cam.fov) > 1e-4) {
      cam.fov = fovCurrent.current
      cam.updateProjectionMatrix()
    }
  })

  return null
}

export default CameraRig
