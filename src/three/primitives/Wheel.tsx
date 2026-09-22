import { forwardRef, useMemo } from 'react'
import * as THREE from 'three'
import { Instance, Instances } from '@react-three/drei'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useDisposeGeometry, useMaterial, useQualitySegments, type PrimitiveProps } from './common'
import { getMaterial } from '@/three/materials'

export interface WheelProps extends PrimitiveProps {
  /** Outer tyre radius (metres). Default 0.33 (matches the wheel anchors). */
  radius?: number
  /** Tyre section width along the axle axis (metres). */
  width?: number
  /** Number of rim spokes. */
  rimSpokes?: number
  /** 0 = very low profile, 1 = tall/bulging sidewall. */
  tireProfile?: number
}

/** Merge the rigid rim sub-parts (barrel + hub + outer lip) into one geometry. */
function buildRimGeometry(rimRadius: number, width: number, half: number, segments: number): THREE.BufferGeometry {
  const barrel = new THREE.CylinderGeometry(rimRadius * 0.99, rimRadius * 0.99, width * 0.86, segments, 1, true)
  barrel.rotateZ(Math.PI / 2) // open tube, axis X
  const hub = new THREE.CylinderGeometry(rimRadius * 0.3, rimRadius * 0.3, width * 0.72, segments, 1)
  hub.rotateZ(Math.PI / 2)
  const lip = new THREE.TorusGeometry(rimRadius * 0.99, width * 0.025, Math.max(6, Math.round(segments * 0.25)), segments)
  lip.rotateY(Math.PI / 2) // torus axis Z -> X
  lip.translate(half * 0.86, 0, 0)

  const merged = mergeGeometries([barrel, hub, lip], false)
  barrel.dispose()
  hub.dispose()
  lip.dispose()
  merged?.computeVertexNormals()
  return merged ?? new THREE.BufferGeometry()
}

/**
 * Road wheel: a lathe-turned tyre with a rounded profile, an alloy rim barrel,
 * instanced spokes, a centre hub and instanced lug nuts.
 *
 * SPIN AXIS: local **+X** (the axle axis). Rotate the returned group about X to
 * spin the wheel. The wheel is centred on its own origin — place the group at a
 * wheel anchor, e.g. (±0.80, 0.33, ±1.35).
 */
export const Wheel = forwardRef<THREE.Group, WheelProps>(function Wheel(
  { radius = 0.33, width = 0.22, rimSpokes = 5, tireProfile = 0.35, position, rotation, scale, material = 'aluminium' },
  ref,
) {
  const segments = useQualitySegments(40, 16)
  const tireMat = getMaterial('rubber')
  const rimMat = useMaterial(material)
  const lugMat = getMaterial('chrome')

  const profile = THREE.MathUtils.clamp(tireProfile, 0, 1)
  const rimRadius = radius * (0.72 - 0.12 * profile)
  const half = width / 2
  const sideR = rimRadius + (radius - rimRadius) * (0.86 + 0.14 * profile)

  // Tyre: rounded cross-section lathed about the axle axis.
  const tireGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(rimRadius, -half),
      new THREE.Vector2(rimRadius + (radius - rimRadius) * 0.2, -half * 0.96),
      new THREE.Vector2(sideR, -half * 0.68),
      new THREE.Vector2(radius, -half * 0.26),
      new THREE.Vector2(radius, half * 0.26),
      new THREE.Vector2(sideR, half * 0.68),
      new THREE.Vector2(rimRadius + (radius - rimRadius) * 0.2, half * 0.96),
      new THREE.Vector2(rimRadius, half),
    ]
    const g = new THREE.LatheGeometry(pts, segments)
    g.rotateZ(Math.PI / 2) // lathe axis Y -> X
    g.computeVertexNormals()
    return g
  }, [radius, rimRadius, sideR, half, segments])

  const rimGeo = useMemo(
    () => buildRimGeometry(rimRadius, width, half, segments),
    [rimRadius, width, half, segments],
  )

  const spokeGeo = useMemo(
    () => new THREE.BoxGeometry(width * 0.5, rimRadius * 0.72, rimRadius * 0.2),
    [width, rimRadius],
  )

  const lugGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(rimRadius * 0.055, rimRadius * 0.055, width * 0.2, 8, 1)
    g.rotateZ(Math.PI / 2)
    return g
  }, [rimRadius, width])

  useDisposeGeometry(tireGeo)
  useDisposeGeometry(rimGeo)
  useDisposeGeometry(spokeGeo)
  useDisposeGeometry(lugGeo)

  const spokes = useMemo(() => {
    const n = Math.max(3, Math.round(rimSpokes))
    const rMid = rimRadius * 0.3 + (rimRadius * 0.72) / 2
    return Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2
      return {
        pos: [0, rMid * Math.cos(t), rMid * Math.sin(t)] as [number, number, number],
        rot: [t, 0, 0] as [number, number, number],
      }
    })
  }, [rimSpokes, rimRadius])

  const lugs = useMemo(() => {
    const n = 5
    const r = rimRadius * 0.17
    return Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2
      return [half * 0.78, r * Math.cos(t), r * Math.sin(t)] as [number, number, number]
    })
  }, [rimRadius, half])

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <mesh geometry={tireGeo} material={tireMat} castShadow receiveShadow />
      <mesh geometry={rimGeo} material={rimMat} castShadow receiveShadow />

      <Instances limit={spokes.length} range={spokes.length} geometry={spokeGeo} material={rimMat} frustumCulled={false}>
        {spokes.map((s, i) => (
          <Instance key={i} position={s.pos} rotation={s.rot} />
        ))}
      </Instances>

      <Instances limit={lugs.length} range={lugs.length} geometry={lugGeo} material={lugMat} frustumCulled={false}>
        {lugs.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>
    </group>
  )
})

export default Wheel
