import { Component, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { DRACO_DECODER_PATH, GLTF_BODY_URL } from '@/three/body/bodyAnchors'
import {
  disposeNormalizedBody,
  normalizeGltf,
  type NormalizedBody,
} from '@/three/body/normalizeGltf'
import { ghostOf } from '@/three/body/materialRewrite'
import { createBodyReveal, type RevealOptions } from '@/three/body/bodyReveal'
import {
  applyPlantedWheels,
  applyWheelMotion,
  createWheelMotionState,
  prepareWheelNode,
  setWheelNodesVisible,
  stepWheelMotion,
  type WheelMotionState,
} from '@/three/body/wheelMotion'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GltfBodyShell — the real asset, fitted to the site contract
 * ─────────────────────────────────────────────────────────────────────────────
 * Loads `public/models/ferrari.glb`, runs it through `normalizeGltf` (cull →
 * yaw → wheelbase scale → ground → shared-library materials) exactly once, and
 * drives the `reveal` chapter: the bodywork lifts off and fades to a ghost so
 * the mechanical systems underneath are visible, then settles back down across
 * `outro`.
 *
 * Everything animated here is mutated inside `useFrame` on the THREE objects
 * directly. No React state is touched, so scrolling never re-renders.
 *
 * The reveal curve lives in `./bodyReveal.ts` and the wheel motion in
 * `./wheelMotion.ts`, both shared with `ProceduralBodyShell` / `Wheels` so the
 * two shells are frame-identical. This file exports components only.
 */

// ── error boundary ───────────────────────────────────────────────────────────

interface BoundaryProps {
  children: ReactNode
  fallback: ReactNode
  onError?: (error: Error) => void
}

interface BoundaryState {
  failed: boolean
}

/**
 * Catches anything the GLB path throws — a 404 on the model, a Draco decode
 * failure, a WebGL context loss during normalisation — and renders `fallback`
 * instead of taking the whole canvas down.
 *
 * Kept here rather than in `CarBody.tsx` because it is the GLB path that can
 * fail; `ProceduralBodyShell` composes it into a drop-in fallback shell.
 */
export class BodyShellErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { failed: false }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  override componentDidCatch(error: Error): void {
    // Never throw from here — a broken hero asset must degrade, not cascade.
    this.props.onError?.(error)
    if (typeof console !== 'undefined') console.error('[GltfBodyShell]', error)
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

// ── the shell ────────────────────────────────────────────────────────────────

export interface GltfBodyShellProps extends RevealOptions {
  /** Hide the GLB's own wheels so an external `<Wheels/>` can take over. */
  hideWheels?: boolean
  /** Spin the GLB's wheels from scroll velocity. Default true. */
  spinWheels?: boolean
  /** Steer the GLB's front wheels during `suspension`. Default true. */
  steerWheels?: boolean
  /** Keep the wheels on the tarmac while the body lifts. Default true. */
  keepWheelsPlanted?: boolean
  /** Called once with the fitted body — handy for wiring hotspots or debug UI. */
  onReady?: (body: NormalizedBody) => void
}

/** Warm the GLTF + Draco cache from module scope so the first paint is not a fetch. */
useGLTF.preload(GLTF_BODY_URL, DRACO_DECODER_PATH)

/**
 * The Draco decoder path is passed EXPLICITLY to `useGLTF`. drei's default is
 * `https://www.gstatic.com/draco/versioned/decoders/1.5.5/` (see
 * `node_modules/@react-three/drei/core/Gltf.js`), and a third-party network
 * dependency on the site's hero asset is not acceptable — `public/draco/` ships
 * the decoder locally instead.
 *
 * `useGLTF.setDecoderPath('/draco/')` also exists in drei 10.7.8 and does the
 * same thing globally; passing the argument is preferred because it is scoped to
 * this call site and cannot be clobbered by another loader elsewhere.
 */
export function GltfBodyShell({
  hideWheels = false,
  spinWheels = true,
  steerWheels = true,
  keepWheelsPlanted = true,
  onReady,
  liftDistance,
  ghostOpacity,
  fadeStart,
  fadeEnd,
  smooth,
}: GltfBodyShellProps) {
  // `useDraco` accepts a string, which drei forwards straight to
  // `DRACOLoader.setDecoderPath`.
  const gltf = useGLTF(GLTF_BODY_URL, DRACO_DECODER_PATH)

  // Normalise once per decoded GLTF instance. `gltf` is stable (drei caches it),
  // so this runs a single time for the lifetime of the page.
  const body = useMemo(() => normalizeGltf(gltf), [gltf])

  const reveal = useMemo(
    () => createBodyReveal({ liftDistance, ghostOpacity, fadeStart, fadeEnd, smooth }),
    [liftDistance, ghostOpacity, fadeStart, fadeEnd, smooth],
  )

  // Mesh → the material `normalizeGltf` gave it (plus its shadow flag), so the
  // ghost swap is exactly reversible.
  const originals = useMemo(() => {
    const map = new Map<THREE.Mesh, { material: THREE.Material; castShadow: boolean }>()
    body.root.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const material = mesh.material
      // Multi-material meshes are left alone: none exist on this asset, and a
      // partial ghost swap would look worse than no swap at all.
      if (Array.isArray(material)) return
      map.set(mesh, { material, castShadow: mesh.castShadow })
    })
    return map
  }, [body])

  // One plain mutable object, not three `useRef<number>`s: `damp()` (used inside
  // `stepWheelMotion`) mutates a `Record<string, number>`, and a
  // `RefObject<number>` is not assignable to one.
  const motion = useRef<WheelMotionState>(createWheelMotionState())

  // Publish the fitted body once, and tear down our owned materials on unmount.
  useEffect(() => {
    for (const corner of ['FL', 'FR', 'RL', 'RR'] as const) {
      const node = body.wheelNodes[corner]
      if (node) prepareWheelNode(node)
    }
    setWheelNodesVisible(body.wheelNodes, !hideWheels)
    onReady?.(body)
    return () => {
      disposeNormalizedBody(body)
    }
    // `body` is memo-stable; `onReady` / `hideWheels` changes must not re-run the
    // disposal, or the shell would be destroyed under a live scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body])

  useEffect(() => {
    setWheelNodesVisible(body.wheelNodes, !hideWheels)
  }, [body, hideWheels])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20)
    reveal.update(delta)
    const lift = reveal.lift()

    // ── lift the shell ──────────────────────────────────────────────────────
    // Written on `root` only. `inner` carries the contract fit and must not move.
    body.root.position.y = lift

    // ── fade to a ghost ─────────────────────────────────────────────────────
    // Opacity is applied by SWAPPING to a cached ghost variant, never by
    // mutating a shared library material (the materials contract forbids it).
    if (body.materials) {
      const ghosted = reveal.isGhost()
      const opacity = reveal.opacity()
      for (const [mesh, entry] of originals) {
        if (!ghosted) {
          if (mesh.material !== entry.material) {
            mesh.material = entry.material
            mesh.renderOrder = 0
            mesh.castShadow = entry.castShadow
          }
          continue
        }
        const ghost = ghostOf(body.materials, entry.material, opacity)
        if (mesh.material !== ghost) {
          mesh.material = ghost
          // Draw the transparent shell after the opaque mechanicals, and stop it
          // casting a solid shadow while it is a ghost.
          mesh.renderOrder = 4
          mesh.castShadow = false
        }
      }
    }

    // ── wheels ──────────────────────────────────────────────────────────────
    // The SAME accumulator `<Wheels/>` drives, so the GLB's own rolling stock and
    // the procedural set spin and steer identically.
    if (!hideWheels) {
      stepWheelMotion(motion.current, delta, { spin: spinWheels, steer: steerWheels })
      applyWheelMotion(body.wheelNodes, motion.current.spinAngle, motion.current.steerAngle)
      if (keepWheelsPlanted) applyPlantedWheels(body.wheelNodes, lift)
    }
  })

  return <primitive object={body.root} />
}

export default GltfBodyShell
