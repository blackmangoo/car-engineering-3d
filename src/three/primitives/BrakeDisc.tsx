import { forwardRef, useMemo } from 'react'
import * as THREE from 'three'
import { Instance, Instances } from '@react-three/drei'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useDisposeGeometry, useMaterial, useQualitySegments, type PrimitiveProps } from './common'
import { getMaterial } from '@/three/materials'

export interface BrakeDiscProps extends PrimitiveProps {
  /** Outer friction radius (metres). */
  outerRadius?: number
  /** Inner radius where the friction faces meet the hat (metres). */
  innerRadius?: number
  /** Total disc thickness across the ventilated gap (metres). */
  thickness?: number
  /** Number of internal ventilation vanes. */
  vaneCount?: number
}

/**
 * Vented brake disc: two friction faces (lathe-turned annuli) with instanced
 * ventilation vanes between them, plus a centre hat carrying instanced lug studs.
 *
 * SPIN AXIS: local **+X** (the axle axis — the wheel spins about X in this
 * scene). Rotate the returned group about X to spin the disc.
 */
export const BrakeDisc = forwardRef<THREE.Group, BrakeDiscProps>(function BrakeDisc(
  {
    outerRadius = 0.16,
    innerRadius = 0.09,
    thickness = 0.028,
    vaneCount = 36,
    position,
    rotation,
    scale,
    material = 'castIron',
  },
  ref,
) {
  const segments = useQualitySegments(48, 20)
  const faceMat = useMaterial(material)
  const hatMat = getMaterial('steel')
  const studMat = getMaterial('chrome')

  const faceT = thickness * 0.2
  const gap = Math.max(0.002, thickness - 2 * faceT)
  const faceX = thickness / 2 - faceT / 2

  // Two friction faces merged into one mesh (both are rigid with the hat).
  const faceGeo = useMemo(() => {
    const profile = [
      new THREE.Vector2(innerRadius, -faceT / 2),
      new THREE.Vector2(outerRadius, -faceT / 2),
      new THREE.Vector2(outerRadius, faceT / 2),
      new THREE.Vector2(innerRadius, faceT / 2),
      new THREE.Vector2(innerRadius, -faceT / 2),
    ]
    const makeFace = (x: number): THREE.BufferGeometry => {
      const g = new THREE.LatheGeometry(profile, segments)
      g.rotateZ(Math.PI / 2) // lathe axis Y -> X
      g.translate(x, 0, 0)
      return g
    }
    const a = makeFace(faceX)
    const b = makeFace(-faceX)
    const merged = mergeGeometries([a, b], false)
    a.dispose()
    b.dispose()
    merged?.computeVertexNormals()
    return merged ?? new THREE.BufferGeometry()
  }, [innerRadius, outerRadius, faceT, faceX, segments])

  // Centre hat + mounting flange (axis X).
  const hatGeo = useMemo(() => {
    const cone = new THREE.CylinderGeometry(innerRadius, innerRadius * 0.72, thickness * 0.9, segments, 1)
    cone.rotateZ(Math.PI / 2)
    const flange = new THREE.CylinderGeometry(innerRadius * 0.6, innerRadius * 0.6, thickness * 0.5, segments, 1)
    flange.rotateZ(Math.PI / 2)
    flange.translate(-thickness * 0.35, 0, 0)
    const merged = mergeGeometries([cone, flange], false)
    cone.dispose()
    flange.dispose()
    merged?.computeVertexNormals()
    return merged ?? new THREE.BufferGeometry()
  }, [innerRadius, thickness, segments])

  // One vane box, shared by every <Instance>. Sized to sit inside the gap.
  const vaneGeo = useMemo(() => {
    const radial = Math.max(0.005, (outerRadius - innerRadius) * 0.86)
    return new THREE.BoxGeometry(gap, radial, thickness * 0.06)
  }, [gap, outerRadius, innerRadius, thickness])

  const studGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(innerRadius * 0.09, innerRadius * 0.09, thickness * 0.5, 8, 1)
    g.rotateZ(Math.PI / 2)
    return g
  }, [innerRadius, thickness])

  useDisposeGeometry(faceGeo)
  useDisposeGeometry(hatGeo)
  useDisposeGeometry(vaneGeo)
  useDisposeGeometry(studGeo)

  const vaneRadius = (innerRadius + outerRadius) / 2
  const vanes = useMemo(() => {
    const out: { pos: [number, number, number]; rot: [number, number, number] }[] = []
    for (let i = 0; i < vaneCount; i++) {
      const t = (i / vaneCount) * Math.PI * 2
      out.push({ pos: [0, vaneRadius * Math.cos(t), vaneRadius * Math.sin(t)], rot: [t, 0, 0] })
    }
    return out
  }, [vaneCount, vaneRadius])

  const studs = useMemo(() => {
    const out: [number, number, number][] = []
    const count = 5
    const r = innerRadius * 0.42
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2
      out.push([-thickness * 0.4, r * Math.cos(t), r * Math.sin(t)])
    }
    return out
  }, [innerRadius, thickness])

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <mesh geometry={faceGeo} material={faceMat} castShadow receiveShadow />
      <mesh geometry={hatGeo} material={hatMat} castShadow receiveShadow />

      <Instances limit={vanes.length} range={vanes.length} geometry={vaneGeo} material={faceMat} frustumCulled={false}>
        {vanes.map((v, i) => (
          <Instance key={i} position={v.pos} rotation={v.rot} />
        ))}
      </Instances>

      <Instances limit={studs.length} range={studs.length} geometry={studGeo} material={studMat} frustumCulled={false}>
        {studs.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>
    </group>
  )
})

export default BrakeDisc
