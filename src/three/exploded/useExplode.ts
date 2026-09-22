import { useFrame } from '@react-three/fiber'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { damp3, dampEuler } from '@/lib/damp'
import { clamp01, lerp } from '@/lib/math'
import { progressBus } from '@/state/progressBus'
import type { ChapterId, PartId, Vec3Tuple } from '@/types'
import { EXPLODE_TABLE, explodeProgress, getExplodeTransform } from './explode'

/**
 * Frame-driven explode. Reads the non-reactive `progressBus` for `chapter`,
 * maps it through `explodeProgress`, and mutates the target object's
 * position/rotation directly with maath damping. NEVER touches React state —
 * scrolling does not re-render.
 *
 * Heavier parts (larger configured `distance`) get a smaller damping lambda so
 * they visibly lag lighter ones, which sells mass during the explosion.
 */

/** userData key where a per-mesh opacity clone is cached. */
const GHOST_KEY = '__explodeGhost'

interface GhostCache {
  clone: THREE.Material | THREE.Material[]
}

export interface UseExplodeOptions {
  /** Rest position the explode offset is added to. Defaults to the origin. */
  basePosition?: Vec3Tuple
  /** Override the distance-derived damping lambda (higher = snappier). */
  dampLambda?: number
  /** Walk the object's materials and drive opacity (ghosting). Off by default. */
  applyOpacity?: boolean
}

// Module-level scratch — reused every frame, never reallocated.
const _targetPos = new THREE.Vector3()
const _targetRot: [number, number, number] = [0, 0, 0]

/** Heavier (longer-travel) parts lag: map distance 0.1→0.6 m onto lambda 6→2.5. */
function lambdaForDistance(distance: number): number {
  const t = clamp01((distance - 0.1) / 0.5)
  return lerp(6, 2.5, t)
}

function ensureGhostClone(mesh: THREE.Mesh): GhostCache {
  const ud = mesh.userData as Record<string, unknown>
  let cache = ud[GHOST_KEY] as GhostCache | undefined
  if (!cache) {
    const original = mesh.material as THREE.Material | THREE.Material[]
    // Clone ONCE so we never mutate a shared library material instance.
    const clone = Array.isArray(original)
      ? (original.map((m) => m.clone()) as THREE.Material[])
      : original.clone()
    cache = { clone }
    ud[GHOST_KEY] = cache
    mesh.material = clone
  }
  return cache
}

function setMeshOpacity(mesh: THREE.Mesh, opacity: number): void {
  const cache = ensureGhostClone(mesh)
  const mats = Array.isArray(cache.clone) ? cache.clone : [cache.clone]
  const transparent = opacity < 0.999
  for (const m of mats) {
    m.transparent = transparent
    m.opacity = opacity
    m.depthWrite = !transparent
    m.needsUpdate = true
  }
}

export function useExplode(
  ref: RefObject<THREE.Object3D | null>,
  part: PartId,
  chapter: ChapterId,
  opts: UseExplodeOptions = {},
): void {
  const { basePosition, dampLambda, applyOpacity = false } = opts
  const bx = basePosition?.[0] ?? 0
  const by = basePosition?.[1] ?? 0
  const bz = basePosition?.[2] ?? 0
  const entry = EXPLODE_TABLE[part]
  const lambda = dampLambda ?? lambdaForDistance(entry?.distance ?? 0.2)

  useFrame((_state, delta) => {
    const obj = ref.current
    if (!obj) return

    const p = explodeProgress(progressBus[chapter].current)
    const t = getExplodeTransform(part, p)

    _targetPos.set(bx + t.position[0], by + t.position[1], bz + t.position[2])
    damp3(obj.position, _targetPos, lambda, delta)

    _targetRot[0] = t.rotation[0]
    _targetRot[1] = t.rotation[1]
    _targetRot[2] = t.rotation[2]
    dampEuler(obj.rotation, _targetRot, lambda, delta)

    if (applyOpacity) {
      obj.traverse((child) => {
        const mesh = child as THREE.Mesh
        if (!mesh.isMesh) return
        if (t.opacity < 0.999) {
          setMeshOpacity(mesh, t.opacity)
        } else {
          // Restore only if we previously cloned for this mesh.
          const ud = mesh.userData as Record<string, unknown>
          if (ud[GHOST_KEY]) setMeshOpacity(mesh, 1)
        }
      })
    }
  })
}
