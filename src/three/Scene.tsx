import { Grid, Preload } from '@react-three/drei'
import { CameraRig } from '@/three/CameraRig'
import { QualityGate } from '@/three/QualityGate'

/**
 * Scene — a minimal, RUNNABLE shell so the scroll rig + camera can be verified
 * before any real geometry exists. Phase 2 rewrites this file.
 *
 * Everything visual is wrapped in <QualityGate> so the adaptive-DPR /
 * performance-monitor behaviour is exercised from the very first frame.
 */
export function Scene() {
  return (
    <>
      <CameraRig />

      <QualityGate>
        {/* Baseline lighting so something is visible immediately. */}
        <ambientLight intensity={0.45} />
        <directionalLight position={[4, 6, 4]} intensity={1.4} castShadow />
        <directionalLight position={[-5, 3, -4]} intensity={0.4} color="#6fd6ff" />

        {/* Ground / backdrop: an infinite engineering grid on the y = 0 plane. */}
        <Grid
          position={[0, 0, 0]}
          args={[24, 24]}
          cellSize={0.5}
          cellThickness={0.6}
          cellColor="#1b2430"
          sectionSize={2}
          sectionThickness={1.1}
          sectionColor="#2b8bb5"
          fadeDistance={34}
          fadeStrength={1.2}
          infiniteGrid
          followCamera={false}
        />

        {/* ────────────────────────────────────────────────────────────────────
            TODO(phase-2): insert the real content here —
              <CarBody />            (body-in-white + panels that peel away)
              <Lighting />           (studio rig, area lights, rim)
              <Environment />        (HDRI from /public/hdri)
              <Effects />            (postprocessing: bloom, DoF, AO, grade)
              and the five lazy-loaded exploded-system components:
                <SuspensionSystem /> <EngineSystem /> <TransmissionSystem />
                <BrakeSystem />      <AirconSystem />
            Each system reads its chapter's progress off `progressBus` inside
            useFrame and drives its own explode (0 → 0.55) + mechanism
            (0.55 → 1) animation. Do NOT wire that through React state.
            ──────────────────────────────────────────────────────────────────── */}
      </QualityGate>

      <Preload all />
    </>
  )
}

export default Scene
