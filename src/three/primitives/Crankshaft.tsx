/* eslint-disable react-refresh/only-export-components --
   The binding contract requires the crank-pin angular offsets to be exported
   from Crankshaft.tsx alongside the component so EngineSystem can phase the
   pistons against the same throws. These are pure data/helpers; co-locating
   them with the geometry they describe is intentional. */
import { forwardRef, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useDisposeGeometry, useMaterial, useQualitySegments, type PrimitiveProps } from './common'

export interface CrankshaftProps extends PrimitiveProps {
  /** Cylinder count (inline). Default 4. */
  cylinders?: number
  /** Crank throw radius — half the piston stroke (metres). */
  throwRadius?: number
  /** Main journal radius (metres). */
  journalRadius?: number
  /** Centre-to-centre spacing between cylinders along Z (metres). */
  spacing?: number
  /** Axial length of each main journal (metres). */
  mainJournalLength?: number
}

/**
 * Crank-pin angular offsets (radians) for the canonical inline-4, measured from
 * +Y (TDC) rotating in the XY plane. Pins 1 & 4 are up (0), pins 2 & 3 are down
 * (PI) — the classic flat-plane inline-4 crank. Piston height for cylinder i at
 * crank angle `a` is `throwRadius * cos(a + CRANK_PIN_OFFSETS[i])`.
 */
export const CRANK_PIN_OFFSETS: readonly number[] = [0, Math.PI, Math.PI, 0]

/**
 * Crank-pin offsets for an arbitrary inline cylinder count. Returns the
 * inline-4 pattern verbatim for `cylinders === 4`; otherwise alternates 0/PI
 * (pairs 180° apart), which is correct for other flat-plane inline engines.
 */
export function crankPinOffsets(cylinders: number): number[] {
  if (cylinders === 4) return [...CRANK_PIN_OFFSETS]
  return Array.from({ length: Math.max(1, cylinders) }, (_, i) => (i % 2 === 0 ? 0 : Math.PI))
}

/**
 * mergeGeometries refuses to mix indexed and non-indexed inputs (it returns
 * null). ExtrudeGeometry is non-indexed while Cylinder/Box are indexed, so the
 * crank (which blends both) normalises everything to non-indexed first.
 */
function ensureNonIndexed(g: THREE.BufferGeometry): THREE.BufferGeometry {
  if (g.index === null) return g
  const ni = g.toNonIndexed()
  g.dispose()
  return ni
}

/**
 * Crankshaft: main journals, crank pins offset by the correct throws, webs with
 * counterweights, and a front pulley flange. All sub-geometry is baked into a
 * SINGLE merged mesh (the crank is rigid) sharing one material.
 *
 * SPIN AXIS: local **+Z** (the crankshaft runs fore-aft; +Z is toward the nose).
 * Rotate the returned group about Z to spin the crank.
 */
function buildCrankshaft(
  cylinders: number,
  throwRadius: number,
  journalRadius: number,
  spacing: number,
  mainJournalLength: number,
  segments: number,
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const offsets = crankPinOffsets(cylinders)
  const webThickness = Math.min(spacing * 0.42, mainJournalLength * 0.9)

  // Disc helper: a cylinder whose axis is Z (rotate the default Y axis onto Z).
  const discZ = (r: number, len: number, z: number, seg = segments): THREE.BufferGeometry => {
    const g = new THREE.CylinderGeometry(r, r, len, seg, 1)
    g.rotateX(Math.PI / 2)
    g.translate(0, 0, z)
    return ensureNonIndexed(g)
  }

  // Main journals: cylinders + 1 of them, at the ends and between each throw.
  for (let j = 0; j <= cylinders; j++) {
    const z = (j - cylinders / 2) * spacing
    parts.push(discZ(journalRadius, mainJournalLength, z))
  }

  // Per-throw: crank pin + web arm + counterweight, built with the pin at +Y,
  // then rotated by -offset and slid to the cylinder's Z station.
  for (let i = 0; i < cylinders; i++) {
    const throwParts: THREE.BufferGeometry[] = []

    // Crank pin (the journal the con-rod big end rides on), centred at +Y.
    const pin = new THREE.CylinderGeometry(journalRadius * 0.85, journalRadius * 0.85, spacing * 0.5, segments, 1)
    pin.rotateX(Math.PI / 2)
    pin.translate(0, throwRadius, 0)
    throwParts.push(ensureNonIndexed(pin))

    // Web arm: a rectangular slab from the main axis out to the pin.
    const arm = new THREE.BoxGeometry(journalRadius * 2.1, throwRadius + journalRadius, webThickness)
    arm.translate(0, throwRadius * 0.5, 0)
    throwParts.push(ensureNonIndexed(arm))

    // Counterweight: a half-disc lobe opposite the pin (the -Y half).
    const cwShape = new THREE.Shape()
    const cwR = throwRadius * 1.95
    cwShape.absarc(0, 0, cwR, Math.PI, Math.PI * 2, false)
    cwShape.lineTo(0, 0)
    cwShape.closePath()
    const cw = new THREE.ExtrudeGeometry(cwShape, {
      depth: webThickness,
      bevelEnabled: true,
      bevelThickness: webThickness * 0.08,
      bevelSize: journalRadius * 0.15,
      bevelSegments: 1,
      curveSegments: Math.max(6, Math.round(segments * 0.5)),
    })
    cw.translate(0, 0, -webThickness / 2)
    throwParts.push(ensureNonIndexed(cw))

    const merged = mergeGeometries(throwParts, false)
    for (const g of throwParts) g.dispose()
    if (merged) {
      merged.rotateZ(-offsets[i % offsets.length])
      merged.translate(0, 0, (i - (cylinders - 1) / 2) * spacing)
      parts.push(merged)
    }
  }

  // Front pulley flange at the +Z (nose) end.
  const frontZ = (cylinders / 2) * spacing + mainJournalLength * 0.5 + 0.015
  parts.push(discZ(throwRadius * 2.1, 0.02, frontZ))
  parts.push(discZ(journalRadius * 1.3, 0.035, frontZ + 0.02))

  const result = mergeGeometries(parts, false)
  for (const g of parts) g.dispose()
  if (!result) return new THREE.BufferGeometry()
  result.computeVertexNormals()
  return result
}

export const Crankshaft = forwardRef<THREE.Group, CrankshaftProps>(function Crankshaft(
  {
    cylinders = 4,
    throwRadius = 0.045,
    journalRadius = 0.028,
    spacing = 0.1,
    mainJournalLength = 0.035,
    position,
    rotation,
    scale,
    material = 'steel',
  },
  ref,
) {
  const segments = useQualitySegments(20, 8)
  const mat = useMaterial(material)

  const geometry = useMemo(
    () => buildCrankshaft(cylinders, throwRadius, journalRadius, spacing, mainJournalLength, segments),
    [cylinders, throwRadius, journalRadius, spacing, mainJournalLength, segments],
  )
  useDisposeGeometry(geometry)

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geometry} material={mat} castShadow receiveShadow />
    </group>
  )
})

export default Crankshaft
