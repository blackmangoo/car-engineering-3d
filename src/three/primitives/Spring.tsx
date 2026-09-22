import { forwardRef, useMemo } from 'react'
import * as THREE from 'three'
import { useDisposeGeometry, useMaterial, useQualitySegments, type PrimitiveProps } from './common'

export interface SpringProps extends PrimitiveProps {
  /** Number of active coils. */
  coils?: number
  /** Mean coil radius (metres). */
  radius?: number
  /** Free (uncompressed) height along the spring's local Y axis (metres). */
  height?: number
  /** Wire radius (metres). */
  wireRadius?: number
  /** 0 = fully extended, 1 = fully compressed. Shortens height & tightens pitch. */
  compression?: number
  /** +1 right-hand helix, -1 left-hand. */
  turnsDirection?: 1 | -1
}

/**
 * Coil spring built as a `TubeGeometry` swept along a `CatmullRomCurve3`
 * sampled from a parametric helix. The helix axis is the local **Y** axis
 * (a suspension spring stands upright); callers rotate the group to orient it.
 *
 * `compression` scales the effective height down (which, at a fixed coil
 * count, tightens the pitch) so the spring visibly bunches as it compresses.
 */
function buildSpringGeometry(
  coils: number,
  radius: number,
  height: number,
  wireRadius: number,
  compression: number,
  turnsDirection: 1 | -1,
  radialSegments: number,
): THREE.TubeGeometry {
  const effectiveHeight = height * (1 - THREE.MathUtils.clamp(compression, 0, 1) * 0.62)
  const samples = Math.max(48, Math.round(coils * radialSegments * 2))
  const points: THREE.Vector3[] = []
  const totalAngle = coils * Math.PI * 2 * turnsDirection

  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const angle = t * totalAngle
    const y = t * effectiveHeight - effectiveHeight / 2
    points.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius))
  }

  const curve = new THREE.CatmullRomCurve3(points)
  return new THREE.TubeGeometry(curve, samples, wireRadius, radialSegments, false)
}

export const Spring = forwardRef<THREE.Group, SpringProps>(function Spring(
  {
    coils = 7,
    radius = 0.085,
    height = 0.34,
    wireRadius = 0.012,
    compression = 0,
    turnsDirection = 1,
    position,
    rotation,
    scale,
    material = 'steel',
  },
  ref,
) {
  const radialSegments = useQualitySegments(10, 5)
  const mat = useMaterial(material)

  const geometry = useMemo(
    () => buildSpringGeometry(coils, radius, height, wireRadius, compression, turnsDirection, radialSegments),
    [coils, radius, height, wireRadius, compression, turnsDirection, radialSegments],
  )
  useDisposeGeometry(geometry)

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geometry} material={mat} castShadow receiveShadow />
    </group>
  )
})

export default Spring
