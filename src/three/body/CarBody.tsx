import { useCallback, useRef } from 'react'
import { BodyShellWithFallback } from '@/three/body/ProceduralBodyShell'
import {
  BODY_ANCHORS,
  DRACO_DECODER_PATH,
  GLTF_BODY_URL,
  type BodyAnchors,
} from '@/three/body/bodyAnchors'
import type { NormalizedBody } from '@/three/body/normalizeGltf'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CarBody — thin error-bounded wrapper over the approved body pipeline
 * ─────────────────────────────────────────────────────────────────────────────
 * All real work lives in Robin's modules and must not be duplicated here:
 *
 *  • `GltfBodyShell` (via `BodyShellWithFallback`) loads the GLB, runs the
 *    `normalizeGltf` fit pipeline (cull → yaw → wheelbase scale → ground →
 *    shared-library materials) and drives the reveal lift/ghost from
 *    `progressBus` inside `useFrame` at priority 0.
 *  • `BodyShellWithFallback` wraps it in `BodyShellErrorBoundary` and degrades
 *    to `ProceduralBodyShell` — anchored, silhouette-accurate, never blank.
 *
 * Draco: the decoder path is passed EXPLICITLY to `useGLTF` inside
 * `GltfBodyShell` as `DRACO_DECODER_PATH` ('/draco/'), so drei can never fall
 * back to its default `gstatic.com` CDN for the hero asset. The constants are
 * re-surfaced here because this wrapper is the integration point callers see.
 *
 * What this wrapper adds on top: `onAnchorsReady` — invoked once the fitted
 * body reports ready, with the anchor set the scene should position against
 * (the measured `BODY_ANCHORS`; the GLB fit reproduces them by construction).
 */

export interface CarBodyProps {
  /** Hide the GLB's own wheels so an external `<Wheels/>` can take over. */
  hideWheels?: boolean
  /** Called once when the body shell is fitted and mounted. */
  onAnchorsReady?: (anchors: BodyAnchors) => void
  /** Called with the error if the GLB path fails and the fallback engages. */
  onBodyError?: (error: Error) => void
}

export function CarBody({ hideWheels = false, onAnchorsReady, onBodyError }: CarBodyProps) {
  const reported = useRef(false)

  // `GltfBodyShell` calls `onReady` from an effect that must stay memo-stable;
  // the ref guard keeps `onAnchorsReady` a once-only notification even if the
  // shell remounts (StrictMode double-effect included) — and avoids a React
  // state update (and re-render) from inside the ready callback.
  const handleReady = useCallback(
    (_body: NormalizedBody) => {
      if (reported.current) return
      reported.current = true
      onAnchorsReady?.(BODY_ANCHORS)
    },
    [onAnchorsReady],
  )

  return (
    <BodyShellWithFallback
      hideWheels={hideWheels}
      onReady={handleReady}
      onBodyError={onBodyError}
    />
  )
}

/** Re-exported so callers never hardcode the hero-asset URLs. */
export { GLTF_BODY_URL, DRACO_DECODER_PATH }

export default CarBody
