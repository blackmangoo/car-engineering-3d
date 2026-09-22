import { forwardRef, useMemo } from 'react'
import * as THREE from 'three'
import { Instance, Instances } from '@react-three/drei'
import { useDisposeGeometry, useMaterial, useQualityFactor, type PrimitiveProps } from './common'

export interface FinnedBlockProps extends PrimitiveProps {
  /** Width along local X — the direction fins are stacked (metres). */
  width?: number
  /** Height along local Y (metres). */
  height?: number
  /** Depth along local Z (metres). */
  depth?: number
  /** Number of cooling fins at full quality (scaled down on lower tiers). */
  finCount?: number
  /** Thickness of each fin plate (metres). */
  finThickness?: number
}

/**
 * Finned heat-exchanger block: a solid core (the tube bundle) with thin
 * instanced fin plates stacked along local **X**. Reused for the AC condenser,
 * the AC evaporator and the engine radiator — vary width/height/depth/finCount.
 */
export const FinnedBlock = forwardRef<THREE.Group, FinnedBlockProps>(function FinnedBlock(
  {
    width = 0.5,
    height = 0.36,
    depth = 0.05,
    finCount = 40,
    finThickness = 0.002,
    position,
    rotation,
    scale,
    material = 'aluminium',
  },
  ref,
) {
  const qf = useQualityFactor()
  const mat = useMaterial(material)

  const coreGeo = useMemo(
    () => new THREE.BoxGeometry(width * 0.96, height * 0.94, depth * 0.7),
    [width, height, depth],
  )
  const finGeo = useMemo(
    () => new THREE.BoxGeometry(finThickness, height, depth),
    [finThickness, height, depth],
  )
  useDisposeGeometry(coreGeo)
  useDisposeGeometry(finGeo)

  const fins = useMemo(() => {
    const count = Math.max(3, Math.round(finCount * (0.35 + 0.65 * qf)))
    const out: [number, number, number][] = []
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1)
      out.push([(-0.5 + t) * width, 0, 0])
    }
    return out
  }, [finCount, qf, width])

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <mesh geometry={coreGeo} material={mat} castShadow receiveShadow />
      <Instances limit={fins.length} range={fins.length} geometry={finGeo} material={mat} frustumCulled={false}>
        {fins.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>
    </group>
  )
})

export default FinnedBlock
