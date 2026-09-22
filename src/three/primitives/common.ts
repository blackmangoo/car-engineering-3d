import { useEffect, useMemo } from 'react'
import type * as THREE from 'three'
import { qualityFactor, useQualityTier } from '@/three/QualityGate'
import { getMaterial, type MaterialName } from '@/three/materials'
import type { Vec3Tuple } from '@/types'

/**
 * Shared plumbing for every primitive. Primitives are dumb, deterministic
 * geometry builders: they take transform + sizing props, scale their segment
 * counts by the active quality tier, memoise their geometry (disposing the
 * previous one on change), and render a single material from the shared
 * library. They NEVER read scroll progress — composition and animation are the
 * job of the Phase-3 system components.
 */

/** Transform + material props accepted by every primitive. */
export interface PrimitiveProps {
  position?: Vec3Tuple
  rotation?: Vec3Tuple
  scale?: Vec3Tuple | number
  /** Name of a shared library material. Defaults to 'steel'. */
  material?: MaterialName
}

/**
 * Raw 0..1 quality multiplier for the active tier. Use this to scale instance
 * density / detail counts directly (rather than whole segment counts).
 */
export function useQualityFactor(): number {
  return qualityFactor(useQualityTier())
}

/**
 * Scale a base segment count by the active quality tier, clamped to a floor so
 * silhouettes never degenerate on `low`.
 */
export function useQualitySegments(base: number, min = 4): number {
  return Math.max(min, Math.round(base * useQualityFactor()))
}

/** Resolve a shared library material instance from an optional name. */
export function useMaterial(name: MaterialName = 'steel'): THREE.Material {
  return useMemo(() => getMaterial(name), [name])
}

/**
 * Dispose a memoised geometry when it changes or on unmount. Call once per
 * memoised geometry; primitives with several geometries call it several times.
 */
export function useDisposeGeometry(geometry: THREE.BufferGeometry | null | undefined): void {
  useEffect(() => () => geometry?.dispose(), [geometry])
}
