import { forwardRef, useMemo } from 'react'
import * as THREE from 'three'
import { Instance, Instances } from '@react-three/drei'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useDisposeGeometry, useMaterial, type PrimitiveProps } from './common'
import { getMaterial } from '@/three/materials'

export interface CaliperProps extends PrimitiveProps {
  /** Radius of the disc the caliper straddles (metres). */
  discRadius?: number
  /** Disc thickness the caliper bridges over (metres). */
  thickness?: number
  /** Total piston count (split evenly across the inboard/outboard halves). */
  pistonCount?: number
}

/**
 * Fixed brake caliper: a rigid housing with two legs straddling the disc and a
 * bridge over its outer edge, chrome clamp pistons in each bore, and a small
 * bleed nipple on top.
 *
 * Modelled in the DISC frame — the disc axis is local **+X**, the disc is
 * centred on the origin, and the caliper wraps over the top (+Y). Position the
 * returned group at the wheel centre; the caliper lands correctly on the disc.
 */
export const Caliper = forwardRef<THREE.Group, CaliperProps>(function Caliper(
  { discRadius = 0.16, thickness = 0.028, pistonCount = 4, position, rotation, scale, material = 'aluminium' },
  ref,
) {
  const housingMat = useMaterial(material)
  const pistonMat = getMaterial('chrome')

  const legT = discRadius * 0.3
  const legDepth = Math.min(0.13, discRadius * 0.85)
  const legX = thickness / 2 + legT / 2

  const housingGeo = useMemo(() => {
    const leg = new THREE.BoxGeometry(legT, discRadius * 1.05, legDepth)
    const legOut = leg.clone().translate(legX, discRadius * 0.5, 0)
    const legIn = leg.clone().translate(-legX, discRadius * 0.5, 0)
    leg.dispose()
    const bridge = new THREE.BoxGeometry(thickness + 2 * legT, legT * 0.8, legDepth)
    bridge.translate(0, discRadius + legT * 0.15, 0)
    // Bleed nipple boss on top of the outboard leg.
    const nipple = new THREE.CylinderGeometry(legT * 0.12, legT * 0.12, legT * 0.5, 8, 1)
    nipple.translate(legX, discRadius + legT * 0.45, legDepth * 0.28)
    const merged = mergeGeometries([legOut, legIn, bridge, nipple], false)
    legOut.dispose()
    legIn.dispose()
    bridge.dispose()
    nipple.dispose()
    merged?.computeVertexNormals()
    return merged ?? new THREE.BufferGeometry()
  }, [discRadius, thickness, legT, legDepth, legX])

  const pistonGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(legT * 0.3, legT * 0.3, legT * 0.7, 16, 1)
    g.rotateZ(Math.PI / 2) // cylinder axis Y -> X (clamp axis)
    return g
  }, [legT])

  useDisposeGeometry(housingGeo)
  useDisposeGeometry(pistonGeo)

  const pistons = useMemo(() => {
    const perSide = Math.max(1, Math.round(pistonCount / 2))
    const out: [number, number, number][] = []
    const span = legDepth * 0.62
    for (const side of [-1, 1]) {
      for (let k = 0; k < perSide; k++) {
        const z = perSide === 1 ? 0 : -span / 2 + (k / (perSide - 1)) * span
        out.push([side * legX, discRadius * 0.78, z])
      }
    }
    return out
  }, [pistonCount, legX, legDepth, discRadius])

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <mesh geometry={housingGeo} material={housingMat} castShadow receiveShadow />
      <Instances limit={pistons.length} range={pistons.length} geometry={pistonGeo} material={pistonMat} frustumCulled={false}>
        {pistons.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>
    </group>
  )
})

export default Caliper
