import { forwardRef, useMemo } from 'react'
import * as THREE from 'three'
import { useDisposeGeometry, useMaterial, useQualitySegments, type PrimitiveProps } from './common'
import { getMaterial } from '@/three/materials'

export interface PistonProps extends PrimitiveProps {
  /** Piston / bore radius (metres). */
  radius?: number
  /** Overall piston height along its local Y axis (metres). */
  height?: number
  /** Vertical offset of the wrist-pin bore from the piston mid-height (metres). */
  pinOffset?: number
}

/**
 * Piston: crown + skirt body, three compression/oil ring grooves as thin torus
 * bands near the crown, and a wrist-pin bore through the skirt. Reciprocating
 * axis is local **Y** (the cylinder bore stands vertical); the wrist pin runs
 * along local **X**. `pinOffset` shifts the pin up/down within the skirt.
 */
export const Piston = forwardRef<THREE.Group, PistonProps>(function Piston(
  { radius = 0.043, height = 0.09, pinOffset = 0, position, rotation, scale, material = 'aluminium' },
  ref,
) {
  const segments = useQualitySegments(28, 12)
  const bodyMat = useMaterial(material)
  const ringMat = getMaterial('castIron')
  const pinMat = getMaterial('chrome')

  // Crown + skirt: very slight taper toward the skirt for a cast look.
  const bodyGeo = useMemo(
    () => new THREE.CylinderGeometry(radius, radius * 0.97, height, segments, 1),
    [radius, height, segments],
  )
  // Ring grooves: three thin torus bands stacked just below the crown.
  const ringGeo = useMemo(() => {
    const g = new THREE.TorusGeometry(radius * 0.995, radius * 0.045, Math.max(6, Math.round(segments * 0.3)), segments)
    g.rotateX(Math.PI / 2) // torus axis Z -> Y so the band wraps the piston
    return g
  }, [radius, segments])
  // Wrist pin running along X through the skirt.
  const pinGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(radius * 0.28, radius * 0.28, radius * 2.1, Math.max(8, Math.round(segments * 0.4)), 1)
    g.rotateZ(Math.PI / 2) // cylinder axis Y -> X
    return g
  }, [radius, segments])

  useDisposeGeometry(bodyGeo)
  useDisposeGeometry(ringGeo)
  useDisposeGeometry(pinGeo)

  const crownY = height / 2
  const ringYs = [crownY - height * 0.16, crownY - height * 0.28, crownY - height * 0.4]
  const pinY = -height * 0.18 + pinOffset

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <mesh geometry={bodyGeo} material={bodyMat} castShadow receiveShadow />
      {ringYs.map((y, i) => (
        <mesh key={i} geometry={ringGeo} material={ringMat} position={[0, y, 0]} />
      ))}
      <mesh geometry={pinGeo} material={pinMat} position={[0, pinY, 0]} castShadow />
    </group>
  )
})

export default Piston
