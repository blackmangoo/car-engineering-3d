/* eslint-disable react-refresh/only-export-components --
   `makeCurveFromPoints` is a pure helper the binding contract requires to be
   exported from Pipe.tsx next to the component that consumes it. */
import { forwardRef, useMemo } from 'react'
import * as THREE from 'three'
import { useDisposeGeometry, useMaterial, useQualitySegments, type PrimitiveProps } from './common'
import type { Vec3Tuple } from '@/types'

export interface PipeProps extends PrimitiveProps {
  /** Either a Three.js curve, or `{ points }` to build a Catmull-Rom through. */
  curve: THREE.Curve<THREE.Vector3> | { points: Vec3Tuple[] }
  /** Pipe radius (metres). */
  radius?: number
  /** Segments along the pipe length at full quality (scaled by tier). */
  tubularSegments?: number
}

/** Build a smooth Catmull-Rom curve through a list of world-space points. */
export function makeCurveFromPoints(points: Vec3Tuple[]): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])))
}

function isCurve(c: PipeProps['curve']): c is THREE.Curve<THREE.Vector3> {
  return typeof (c as THREE.Curve<THREE.Vector3>).getPoint === 'function'
}

/**
 * Pipe / hose: a `TubeGeometry` swept along a curve. Accepts a ready-made
 * `THREE.Curve` or a `{ points }` bag (turned into a Catmull-Rom). Used for AC
 * refrigerant lines, brake hard lines, coolant hoses, etc.
 *
 * Memoise the `curve` prop at the call site — a fresh `{ points: [...] }` object
 * literal every render will rebuild the tube.
 */
export const Pipe = forwardRef<THREE.Group, PipeProps>(function Pipe(
  { curve, radius = 0.012, tubularSegments = 64, position, rotation, scale, material = 'steel' },
  ref,
) {
  const radialSegments = useQualitySegments(12, 5)
  const lengthSegments = useQualitySegments(tubularSegments, 12)
  const mat = useMaterial(material)

  const resolved = useMemo(
    () => (isCurve(curve) ? curve : makeCurveFromPoints(curve.points)),
    [curve],
  )

  const geometry = useMemo(
    () => new THREE.TubeGeometry(resolved, lengthSegments, radius, radialSegments, false),
    [resolved, lengthSegments, radius, radialSegments],
  )
  useDisposeGeometry(geometry)

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geometry} material={mat} castShadow receiveShadow />
    </group>
  )
})

export default Pipe
