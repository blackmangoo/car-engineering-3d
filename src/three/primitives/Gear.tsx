import { forwardRef, useMemo } from 'react'
import * as THREE from 'three'
import { useDisposeGeometry, useMaterial, useQualitySegments, type PrimitiveProps } from './common'

export interface GearProps extends PrimitiveProps {
  /** Tooth count. */
  teeth?: number
  /** Gear module (metres) — pitch radius = teeth * module / 2. */
  module?: number
  /** Face width / thickness along the spin axis (metres). */
  thickness?: number
  /** Central bore radius (metres). */
  boreRadius?: number
  /** Length of the hub boss protruding past the face (metres). 0 = none. */
  hubLength?: number
}

/**
 * SPIN AXIS: local **+Z** for every gear in this library.
 * The tooth profile is a `THREE.Shape` in the XY plane, extruded along Z, so
 * rotating the returned group about its Z axis spins the gear. Transmission
 * shafts run fore-aft (Z) in this scene, which matches. Callers that need a
 * different world axis rotate the parent group, never the gear's own frame.
 */

/** Build a spur-gear outline: trapezoidal teeth around a root circle + a bore hole. */
function buildGearShape(teeth: number, module: number, boreRadius: number): THREE.Shape {
  const pitchRadius = (teeth * module) / 2
  const outerRadius = pitchRadius + module
  const rootRadius = Math.max(boreRadius * 1.05, pitchRadius - module * 1.25)
  const toothAngle = (Math.PI * 2) / teeth

  const shape = new THREE.Shape()
  const pt = (angle: number, r: number) => new THREE.Vector2(Math.cos(angle) * r, Math.sin(angle) * r)

  // Trapezoidal tooth: root -> tip (narrow) -> tip -> root, then the gap.
  let first = true
  for (let i = 0; i < teeth; i++) {
    const base = i * toothAngle
    const p0 = pt(base, rootRadius)
    const p1 = pt(base + toothAngle * 0.2, outerRadius)
    const p2 = pt(base + toothAngle * 0.3, outerRadius)
    const p3 = pt(base + toothAngle * 0.5, rootRadius)
    for (const p of [p0, p1, p2, p3]) {
      if (first) {
        shape.moveTo(p.x, p.y)
        first = false
      } else {
        shape.lineTo(p.x, p.y)
      }
    }
  }
  shape.closePath()

  if (boreRadius > 0) {
    const hole = new THREE.Path()
    hole.absarc(0, 0, boreRadius, 0, Math.PI * 2, true)
    shape.holes.push(hole)
  }
  return shape
}

export const Gear = forwardRef<THREE.Group, GearProps>(function Gear(
  {
    teeth = 24,
    module = 0.008,
    thickness = 0.03,
    boreRadius = 0.012,
    hubLength = 0,
    position,
    rotation,
    scale,
    material = 'steel',
  },
  ref,
) {
  const curveSegments = useQualitySegments(6, 3)
  const bevelSegments = useQualitySegments(2, 1)
  const mat = useMaterial(material)

  const geometry = useMemo(() => {
    const shape = buildGearShape(teeth, module, boreRadius)
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: Math.min(0.004, thickness * 0.12),
      bevelSize: Math.min(0.003, module * 0.4),
      bevelSegments,
      curveSegments,
    })
    // Centre the extrusion on Z so the gear spins about its own origin.
    geo.translate(0, 0, -thickness / 2)
    geo.computeVertexNormals()
    return geo
  }, [teeth, module, thickness, boreRadius, curveSegments, bevelSegments])
  useDisposeGeometry(geometry)

  const hubGeo = useMemo(() => {
    if (hubLength <= 0) return null
    const g = new THREE.CylinderGeometry(boreRadius * 1.8, boreRadius * 1.8, hubLength, Math.max(8, curveSegments * 2), 1)
    g.rotateX(Math.PI / 2) // align the hub boss with the Z spin axis
    return g
  }, [hubLength, boreRadius, curveSegments])
  useDisposeGeometry(hubGeo)

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geometry} material={mat} castShadow receiveShadow />
      {hubGeo && <mesh geometry={hubGeo} material={mat} position={[0, 0, thickness / 2 + hubLength / 2]} castShadow />}
    </group>
  )
})

export default Gear
