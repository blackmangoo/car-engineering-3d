import { forwardRef, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useDisposeGeometry, useMaterial, type PrimitiveProps } from './common'

export interface BoltProps extends PrimitiveProps {
  /** Shank radius (metres). */
  radius?: number
  /** Total length along local Y (metres). */
  length?: number
  /** Number of flats on the hex head (6 = hex bolt). */
  heads?: number
}

/**
 * Bolt / stud: an N-sided head (hex by default) fused to a cylindrical shank,
 * merged into one geometry so it can be dropped into an `<Instances>` batch by
 * callers. Axis is local **Y** (head at +Y, shank toward -Y).
 */
export const Bolt = forwardRef<THREE.Group, BoltProps>(function Bolt(
  { radius = 0.006, length = 0.03, heads = 6, position, rotation, scale, material = 'steel' },
  ref,
) {
  const mat = useMaterial(material)

  const geometry = useMemo(() => {
    const flats = Math.max(3, Math.round(heads))
    const headH = radius * 1.5
    const head = new THREE.CylinderGeometry(radius * 1.7, radius * 1.7, headH, flats, 1)
    head.translate(0, length / 2 - headH / 2, 0)
    const shankLen = Math.max(radius, length - headH)
    const shank = new THREE.CylinderGeometry(radius, radius, shankLen, Math.max(8, flats * 2), 1)
    shank.translate(0, -length / 2 + shankLen / 2, 0)
    const merged = mergeGeometries([head, shank], false)
    head.dispose()
    shank.dispose()
    merged?.computeVertexNormals()
    return merged ?? new THREE.BufferGeometry()
  }, [radius, length, heads])
  useDisposeGeometry(geometry)

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geometry} material={mat} castShadow />
    </group>
  )
})

export default Bolt
