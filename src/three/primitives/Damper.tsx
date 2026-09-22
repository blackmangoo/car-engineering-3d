import { forwardRef, useMemo, type Ref } from 'react'
import * as THREE from 'three'
import { useDisposeGeometry, useMaterial, useQualitySegments, type PrimitiveProps } from './common'
import { getMaterial } from '@/three/materials'

export interface DamperProps extends PrimitiveProps {
  /** Length of the damper body (the oil-filled tube) along local Y (metres). */
  bodyLength?: number
  /** Radius of the damper body (metres). */
  bodyRadius?: number
  /** Full length of the telescoping piston rod (metres). */
  rodLength?: number
  /** Radius of the piston rod (metres). */
  rodRadius?: number
  /** 0 = fully extended, 1 = fully compressed (rod slides into the body). */
  compression?: number
  /** Optional ref to the rod child group so callers can drive it independently. */
  rodRef?: Ref<THREE.Group>
}

/** Fraction of the rod length that telescopes into the body at full compression. */
const ROD_TRAVEL = 0.8

/**
 * Telescopic damper (shock absorber): a cylindrical body plus a chrome piston
 * rod that slides into it as `compression` rises. Axis is local **Y** — a
 * suspension damper stands upright; callers rotate the group to orient it.
 *
 * The rod lives in a named child group (`damper-rod`) and can also be captured
 * via the `rodRef` prop so a Phase-3 system can drive it per frame without
 * touching the body.
 */
export const Damper = forwardRef<THREE.Group, DamperProps>(function Damper(
  {
    bodyLength = 0.28,
    bodyRadius = 0.035,
    rodLength = 0.24,
    rodRadius = 0.012,
    compression = 0,
    rodRef,
    position,
    rotation,
    scale,
    material = 'castIron',
  },
  ref,
) {
  const segments = useQualitySegments(20, 8)
  const bodyMat = useMaterial(material)
  const rodMat = getMaterial('chrome')

  const bodyGeo = useMemo(
    () => new THREE.CylinderGeometry(bodyRadius, bodyRadius, bodyLength, segments, 1),
    [bodyRadius, bodyLength, segments],
  )
  const rodGeo = useMemo(
    () => new THREE.CylinderGeometry(rodRadius, rodRadius, rodLength, Math.max(6, Math.round(segments * 0.6)), 1),
    [rodRadius, rodLength, segments],
  )
  // Small end caps / eyes at each end so the damper reads as a real part.
  const capGeo = useMemo(() => new THREE.CylinderGeometry(bodyRadius * 1.15, bodyRadius * 1.15, bodyLength * 0.06, segments, 1), [bodyRadius, bodyLength, segments])

  useDisposeGeometry(bodyGeo)
  useDisposeGeometry(rodGeo)
  useDisposeGeometry(capGeo)

  const c = THREE.MathUtils.clamp(compression, 0, 1)
  const rodY = bodyLength / 2 + rodLength / 2 - c * rodLength * ROD_TRAVEL

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      {/* Body */}
      <mesh geometry={bodyGeo} material={bodyMat} castShadow receiveShadow />
      <mesh geometry={capGeo} material={bodyMat} position={[0, bodyLength / 2, 0]} />
      <mesh geometry={capGeo} material={bodyMat} position={[0, -bodyLength / 2, 0]} />
      {/* Telescoping rod — drive this group independently via `rodRef`. */}
      <group ref={rodRef} name="damper-rod" position={[0, rodY, 0]}>
        <mesh geometry={rodGeo} material={rodMat} castShadow />
      </group>
    </group>
  )
})

export default Damper
