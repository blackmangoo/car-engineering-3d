import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDisposeGeometry } from '@/three/primitives'
import { getMaterial, makeGhostMaterial } from '@/three/materials'
import { createCarPaintMaterial } from '@/three/materials/paint'
import { BODY_ANCHORS, type BodyAnchors } from '@/three/body/bodyAnchors'
import { Wheels } from '@/three/body/Wheels'
import { createBodyReveal, type RevealOptions } from '@/three/body/bodyReveal'
import {
  BodyShellErrorBoundary,
  GltfBodyShell,
  type GltfBodyShellProps,
} from '@/three/body/GltfBodyShell'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ProceduralBodyShell — the no-asset fallback, built from the MEASURED anchors
 * ─────────────────────────────────────────────────────────────────────────────
 * A single extruded side profile plus a greenhouse insert and `<Wheels/>`. It is
 * sized entirely from `BODY_ANCHORS`, so it occupies the same envelope as the
 * GLB shell (length 4.6182, width 2.2992, roof 1.2591, nose +2.4826, tail
 * −2.1355) and the mechanical systems line up with it exactly the same way.
 *
 * It exists for two reasons:
 *  • the GLB fetch / Draco decode / normalisation can fail, and the canvas must
 *    degrade rather than go blank (`BodyShellWithFallback` below);
 *  • it is the reference implementation of "what the anchors mean", which makes
 *    a wrong anchor set visible immediately.
 *
 * This is a silhouette, not a hero asset — it carries no panel gaps, no intakes
 * and no light clusters, and it is never what a healthy page shows.
 *
 * It shares `createBodyReveal` with `GltfBodyShell`, so both lift and ghost on
 * exactly the same curve and swapping between them mid-scroll cannot jump.
 */

/** Bevel radius. Small enough to keep the profile readable, large enough to catch a highlight. */
const BEVEL = 0.045
const BEVEL_THICKNESS = 0.035
const BEVEL_SEGMENTS = 3

interface ProfilePoint {
  z: number
  y: number
}

/**
 * Side profile of the shell, nose at +Z. The Z stations and heights are derived
 * from the anchors rather than authored freehand, so the silhouette tracks the
 * real car: long front bonnet (engine bay centre z = +0.81), cabin set well
 * forward, engine deck behind it — the front-mid-engine layout the asset has.
 */
function buildProfile(a: BodyAnchors): ProfilePoint[] {
  const inset = BEVEL
  const nose = a.frontNoseZ - inset
  const tail = a.rearZ + inset
  const roof = a.roofY - inset
  const floor = 0.16 + inset
  // Cowl = front axle minus the engine-bay length the anchors already encode.
  const cowlZ = a.engineBayCenter[2] + a.engineBaySize[2] / 2
  const bonnetY = roof * 0.68
  const deckY = roof * 0.78

  return [
    // ── top line, nose → tail ────────────────────────────────────────────────
    { z: nose, y: bonnetY * 0.62 },
    { z: nose * 0.97, y: bonnetY * 0.82 },
    { z: a.wheelFL[2] + 0.55, y: bonnetY * 0.93 },
    { z: cowlZ + 0.35, y: bonnetY },
    { z: cowlZ, y: bonnetY + 0.02 },
    { z: cowlZ - 0.52, y: roof },
    { z: cowlZ - 1.0, y: roof * 0.99 },
    { z: cowlZ - 1.45, y: deckY },
    { z: tail + 0.45, y: deckY * 0.96 },
    { z: tail + 0.04, y: deckY * 0.92 },
    // ── tail face ───────────────────────────────────────────────────────────
    { z: tail, y: deckY * 0.55 },
    // ── undertray, tail → nose ──────────────────────────────────────────────
    { z: tail + 0.15, y: floor + 0.04 },
    { z: a.wheelRL[2] - 0.1, y: floor },
    { z: 0, y: floor - 0.01 },
    { z: a.wheelFL[2] + 0.1, y: floor },
    { z: nose - 0.45, y: floor + 0.06 },
    { z: nose - 0.1, y: bonnetY * 0.36 },
  ]
}

/** Cabin glass outline — windshield, roof and rear screen only. */
function buildGreenhouse(a: BodyAnchors): ProfilePoint[] {
  const cowlZ = a.engineBayCenter[2] + a.engineBaySize[2] / 2
  const roof = a.roofY - BEVEL - 0.01
  const belt = a.cabinCenter[1] * 0.92
  return [
    { z: cowlZ - 0.02, y: belt },
    { z: cowlZ - 0.5, y: roof },
    { z: cowlZ - 0.98, y: roof * 0.985 },
    { z: cowlZ - 1.38, y: belt + 0.06 },
    { z: cowlZ - 1.2, y: belt - 0.02 },
    { z: cowlZ - 0.2, y: belt - 0.02 },
  ]
}

/**
 * Extrude a closed side profile into a body volume.
 *
 * `ExtrudeGeometry` builds the shape in its local XY plane and extrudes along
 * +Z. We want length on world Z, height on world Y and width on world X, so the
 * result is rotated −90° about Y: local (x, y, z) → world (−z, y, x). Shape-x
 * therefore becomes world +z and the extrusion depth becomes world −x, which is
 * why the geometry is then translated by +depth/2 to centre it on x = 0.
 */
function extrudeProfile(points: ProfilePoint[], width: number): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(points[0].z, points[0].y)
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i].z, points[i].y)
  shape.closePath()

  const depth = Math.max(0.05, width - 2 * BEVEL_THICKNESS)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: BEVEL_THICKNESS,
    bevelSize: BEVEL,
    bevelOffset: 0,
    bevelSegments: BEVEL_SEGMENTS,
    curveSegments: 1,
    steps: 1,
  })
  geo.rotateY(-Math.PI / 2)
  geo.translate(depth / 2, 0, 0)
  geo.computeVertexNormals()
  return geo
}

export interface ProceduralBodyShellProps extends RevealOptions {
  /** Anchor set to build against. Defaults to the measured `BODY_ANCHORS`. */
  anchors?: BodyAnchors
  /** Render the procedural wheels. Default true. */
  wheels?: boolean
}

/**
 * Fallback body shell. Lifts and ghosts on the same reveal curve as the GLB
 * shell so swapping between them mid-scroll cannot jump.
 */
export function ProceduralBodyShell({
  anchors = BODY_ANCHORS,
  wheels = true,
  liftDistance,
  ghostOpacity,
  fadeStart,
  fadeEnd,
  smooth,
}: ProceduralBodyShellProps) {
  const bodyGeo = useMemo(() => extrudeProfile(buildProfile(anchors), anchors.overallWidth), [anchors])
  const glassGeo = useMemo(
    () => extrudeProfile(buildGreenhouse(anchors), anchors.overallWidth * 0.9),
    [anchors],
  )
  useDisposeGeometry(bodyGeo)
  useDisposeGeometry(glassGeo)

  // Owned, not borrowed: the reveal fades this to a ghost and the materials
  // contract forbids mutating a shared library instance's opacity. The
  // greenhouse uses the library's `paintGlass` directly and is never faded, so
  // it stays a shared instance.
  const paint = useMemo(() => createCarPaintMaterial(), [])
  const glassMat = useMemo(() => getMaterial('paintGlass'), [])

  const reveal = useMemo(
    () => createBodyReveal({ liftDistance, ghostOpacity, fadeStart, fadeEnd, smooth }),
    [liftDistance, ghostOpacity, fadeStart, fadeEnd, smooth],
  )

  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)
  const ghostRef = useRef<THREE.MeshPhysicalMaterial | null>(null)

  useEffect(
    () => () => {
      ghostRef.current?.dispose()
      ghostRef.current = null
      paint.dispose()
    },
    [paint],
  )

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20)
    reveal.update(delta)
    if (groupRef.current) groupRef.current.position.y = reveal.lift()

    const mesh = bodyRef.current
    if (!mesh) return
    if (reveal.isGhost()) {
      const opacity = reveal.opacity()
      let ghost = ghostRef.current
      if (!ghost) {
        ghost = makeGhostMaterial(paint, opacity)
        ghostRef.current = ghost
        mesh.material = ghost
        mesh.renderOrder = 4
        mesh.castShadow = false
      } else if (Math.abs(ghost.opacity - opacity) > 1e-4) {
        ghost.opacity = opacity
      }
    } else if (mesh.material !== paint) {
      mesh.material = paint
      mesh.renderOrder = 0
      mesh.castShadow = true
    }
  })

  return (
    <group ref={groupRef}>
      <mesh ref={bodyRef} geometry={bodyGeo} material={paint} castShadow receiveShadow />
      <mesh geometry={glassGeo} material={glassMat} castShadow={false} receiveShadow />
      {wheels ? <Wheels anchors={anchors} /> : null}
    </group>
  )
}

export interface BodyShellWithFallbackProps extends GltfBodyShellProps {
  /** Rendered when the GLB path throws. Defaults to `<ProceduralBodyShell />`. */
  fallback?: React.ReactNode
  /** Called with the error when the GLB path fails. */
  onBodyError?: (error: Error) => void
}

/**
 * Drop-in body shell: the real GLB asset, with an automatic procedural fallback
 * if anything in the load / decode / normalise chain throws.
 *
 * This lives here rather than in `GltfBodyShell.tsx` to keep the import graph
 * one-directional — the fallback needs the GLB shell's error boundary, and a
 * cycle between the two would make module evaluation order matter.
 */
export function BodyShellWithFallback({
  fallback,
  onBodyError,
  ...gltfProps
}: BodyShellWithFallbackProps) {
  return (
    <BodyShellErrorBoundary
      onError={onBodyError}
      fallback={fallback ?? <ProceduralBodyShell />}
    >
      <GltfBodyShell {...gltfProps} />
    </BodyShellErrorBoundary>
  )
}

export default ProceduralBodyShell
