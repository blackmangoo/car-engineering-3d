import { Suspense, lazy, useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { Preload } from '@react-three/drei'
import { CameraRig } from '@/three/CameraRig'
import { QualityGate } from '@/three/QualityGate'
import Lighting, { MaterialQualityBridge } from '@/three/Lighting'
import Stage from '@/three/Environment'
import Effects from '@/three/Effects'
import { LaFerrariBody } from '@/three/body/LaFerrariBody'
import { BODY_ANCHORS } from '@/three/body/bodyAnchors'
import HotspotLayer from '@/three/hotspots/HotspotLayer'
import { useAppStore } from '@/state/useAppStore'
import type { ChapterId, Vec3Tuple } from '@/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Scene — the composition root
 * ─────────────────────────────────────────────────────────────────────────────
 * Mount order inside `<QualityGate>`:
 *
 *   MaterialQualityBridge   pushes the tier into the shared material library
 *   Lighting                authored light rig (key/rim/fill + contact shadows)
 *   Stage                   HDRI IBL + asphalt floor (carries its own Suspense)
 *   BodyShellWithFallback   the fitted GLB shell, procedural fallback on error;
 *                           `hideWheels` because <Wheels/> below owns rolling stock
 *   Wheels                  procedural four-corner set on the measured anchors —
 *                           MUST stay under this UNROTATED group (it writes
 *                           rotation.y steer / rotation.x spin directly)
 *   Five systems            React.lazy, behind <ChapterMount> so geometry is
 *                           only constructed once the chapter has been entered
 *   HotspotLayer ×5         markers positioned from BODY_ANCHORS, never hardcoded
 *   Effects                 post chain LAST — it sets renderPriority 1 on the
 *                           composer, so every other useFrame here stays at
 *                           priority 0. Do not introduce useFrame(cb, 1).
 */

// ── lazy systems ─────────────────────────────────────────────────────────────
// The five systems export named components; lazy() needs a default, so each
// import is adapted. Code-splitting them keeps the ~1,000 lines of mechanism
// kinematics out of the initial bundle until their chapter is first entered.

const EngineSystem = lazy(() =>
  import('@/three/systems/EngineSystem').then((m) => ({ default: m.EngineSystem })),
)
const TransmissionSystem = lazy(() =>
  import('@/three/systems/TransmissionSystem').then((m) => ({ default: m.TransmissionSystem })),
)
const SuspensionSystem = lazy(() =>
  import('@/three/systems/SuspensionSystem').then((m) => ({ default: m.SuspensionSystem })),
)
const BrakeSystem = lazy(() =>
  import('@/three/systems/BrakeSystem').then((m) => ({ default: m.BrakeSystem })),
)
const AirconSystem = lazy(() =>
  import('@/three/systems/AirconSystem').then((m) => ({ default: m.AirconSystem })),
)

/** Props shared by all five systems (see TODO below). */
interface SystemProps {
  xRayMode: boolean
  manualExplode: number
}

/**
 * Renders `children` only once `chapter` has first become the active chapter,
 * then keeps them mounted forever (lazy geometry construction — unmounting on
 * exit would rebuild buffers on every scroll-back).
 *
 * Subscribes to `activeChapter` from the zustand store: that is DISCRETE state,
 * so a subscription is correct. It must NOT read `progressBus` — per-frame
 * scroll progress never belongs in React state.
 */
function ChapterMount({ chapter, children }: { chapter: ChapterId; children: ReactNode }) {
  const activeChapter = useAppStore((s) => s.activeChapter)
  const [entered, setEntered] = useState(activeChapter === chapter)

  useEffect(() => {
    if (!entered && activeChapter === chapter) setEntered(true)
  }, [activeChapter, chapter, entered])

  if (!entered) return null
  return <>{children}</>
}

/** Lazy boundary + chapter gate for one mechanism system. */
function LazySystem({
  chapter,
  System,
  xRayMode,
  manualExplode,
}: {
  chapter: ChapterId
  System: ComponentType<SystemProps>
  xRayMode: boolean
  manualExplode: number
}) {
  return (
    <ChapterMount chapter={chapter}>
      <Suspense fallback={null}>
        <System xRayMode={xRayMode} manualExplode={manualExplode} />
      </Suspense>
    </ChapterMount>
  )
}

// ── hotspot positions, derived from the MEASURED anchors ─────────────────────
// Rule: anything at a wheel corner references BODY_ANCHORS by name; +X is the
// DRIVER's side (DRIVER_SIDE_X = 1, wheelFL is at +X). Nothing here is a
// hardcoded guess — every tuple is an anchor plus a documented offset.

const A = BODY_ANCHORS

/** Anchor + offset, kept as a Vec3Tuple. */
const at = (a: Vec3Tuple, dx: number, dy: number, dz: number): Vec3Tuple => [
  a[0] + dx,
  a[1] + dy,
  a[2] + dz,
]

/** Engine bay top face — where the intake plenum sits. */
const BAY_TOP_Y = A.engineBayCenter[1] + A.engineBaySize[1] / 2 // ≈ 0.856
/** Engine bay rear face (the cowl) — induction hardware lives just behind it. */
const BAY_REAR_Z = A.engineBayCenter[2] + A.engineBaySize[2] / 2 // ≈ 1.35
/** Engine bay half-width — turbos flank the block on the driver's side here. */
const BAY_HALF_X = A.engineBaySize[0] / 2 // ≈ 0.707

const ENGINE_HOTSPOTS = [
  // Camera target for the engine chapter is [0, 0.75, 0.85] (design doc §5);
  // the block marker sits on the bay centreline just below it.
  { part: 'eng.block', position: at(A.engineBayCenter, 0, 0.26, 0.04), label: '3.0L Twin-Turbo V6 Block' },
  { part: 'eng.exhaustManifold', position: at(A.engineBayCenter, BAY_HALF_X * 0.64, 0.16, 0.24), label: 'Variable Twin Turbocharger' },
  { part: 'eng.intakeManifold', position: [0, BAY_TOP_Y, A.engineBayCenter[2]] as Vec3Tuple, label: 'Carbon Intake Plenum' },
] as const

const TRANSMISSION_HOTSPOTS = [
  // Contract gearbox anchor (chapters.ts header): centreline, z = -0.10,
  // i.e. just behind the cabin (cabinCentre z ≈ 0.17). Diff at the rear axle.
  { part: 'trx.housing', position: [0, 0.62, -0.1] as Vec3Tuple, label: '7-Speed Dual-Clutch Housing' },
  { part: 'trx.differential', position: at(A.wheelRL, -A.wheelRL[0], 0.1, 0), label: 'Limited-Slip Differential' },
] as const

const SUSPENSION_HOTSPOTS = [
  // Front corner on the DRIVER's side (+X): wheelFL, by name — never a sign guess.
  { part: 'susp.damper', position: at(A.wheelFL, -0.1, 0.16, 0), label: 'MagneRide Adaptive Damper' },
  { part: 'susp.spring', position: at(A.wheelFL, -0.1, 0.06, 0), label: 'Helical Coilover Spring' },
  { part: 'susp.wishboneLower', position: at(A.wheelFL, -0.2, -0.08, 0), label: 'Lower Tubular A-Arm' },
] as const

const BRAKE_HOTSPOTS = [
  // Disc concentric with the hub; caliper outboard and slightly above centre.
  { part: 'brk.disc', position: A.wheelFL, label: '410mm Carbon-Ceramic Rotor' },
  { part: 'brk.caliper', position: at(A.wheelFL, 0.02, 0.15, 0.03), label: '6-Piston Monobloc Caliper' },
] as const

const AIRCON_HOTSPOTS = [
  // Condenser ahead of the bay front face, inside the nose (nose z ≈ 2.48).
  { part: 'ac.condenser', position: [0, 0.6, BAY_REAR_Z + 0.6] as Vec3Tuple, label: 'Microchannel Condenser Core' },
  // Compressor on the passenger side (−X) of the bay, low and toward the cowl.
  { part: 'ac.compressor', position: at(A.engineBayCenter, -BAY_HALF_X * 0.6, 0.06, 0.34), label: 'Variable Swashplate Compressor' },
] as const

export function Scene({
  xRayMode = false,
  manualExplode = 0,
}: {
  xRayMode?: boolean
  manualExplode?: number
}) {
  return (
    <>
      {/* Cinematic camera choreography, driven by scroll through progressBus */}
      <CameraRig />

      <QualityGate>
        {/* Publishes the quality tier into the shared material library */}
        <MaterialQualityBridge />

        {/* Authored light rig (shadows land on the stage floor below) */}
        <Lighting />

        {/* HDRI image-based lighting + asphalt floor; carries its own Suspense */}
        <Stage />

        {/* The hyper-realistic Ferrari LaFerrari body & factory wheels */}
        <Suspense fallback={null}>
          <LaFerrariBody xRayMode={xRayMode} manualExplode={manualExplode} />
        </Suspense>

        {/* Five mechanism systems, lazy + chapter-gated */}
        <LazySystem chapter="engine" System={EngineSystem} xRayMode={xRayMode} manualExplode={manualExplode} />
        <LazySystem chapter="transmission" System={TransmissionSystem} xRayMode={xRayMode} manualExplode={manualExplode} />
        <LazySystem chapter="suspension" System={SuspensionSystem} xRayMode={xRayMode} manualExplode={manualExplode} />
        <LazySystem chapter="brakes" System={BrakeSystem} xRayMode={xRayMode} manualExplode={manualExplode} />
        <LazySystem chapter="aircon" System={AirconSystem} xRayMode={xRayMode} manualExplode={manualExplode} />

        {/* Hotspot markers — the 12 PartIds wired in partDetails.ts */}
        <HotspotLayer chapter="engine" parts={[...ENGINE_HOTSPOTS]} />
        <HotspotLayer chapter="transmission" parts={[...TRANSMISSION_HOTSPOTS]} />
        <HotspotLayer chapter="suspension" parts={[...SUSPENSION_HOTSPOTS]} />
        <HotspotLayer chapter="brakes" parts={[...BRAKE_HOTSPOTS]} />
        <HotspotLayer chapter="aircon" parts={[...AIRCON_HOTSPOTS]} />

        {/* Post-processing LAST: sets renderPriority 1 on the composer. Every
            other useFrame in this tree stays at priority 0. */}
        <Effects />
      </QualityGate>

      <Preload all />
    </>
  )
}

export default Scene
