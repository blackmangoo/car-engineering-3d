import { Suspense } from 'react';
import { Grid, Preload } from '@react-three/drei';
import { CameraRig } from '@/three/CameraRig';
import { QualityGate } from '@/three/QualityGate';
import { CarBody } from '@/three/body/CarBody';
import { ChassisFrame } from '@/three/body/ChassisFrame';
import { EngineSystem } from '@/three/systems/EngineSystem';
import { TransmissionSystem } from '@/three/systems/TransmissionSystem';
import { SuspensionSystem } from '@/three/systems/SuspensionSystem';
import { BrakeSystem } from '@/three/systems/BrakeSystem';
import { AirconSystem } from '@/three/systems/AirconSystem';
import { HotspotLayer } from '@/three/hotspots/HotspotLayer';

interface SceneProps {
  xRayMode?: boolean;
  manualExplode?: number;
}

export function Scene({ xRayMode = false, manualExplode = 0 }: SceneProps) {
  return (
    <>
      {/* 1. Cinematic Camera Choreography tied to GSAP scroll */}
      <CameraRig />

      {/* 2. Performance Quality Gate (DPR scaling & frame pacing) */}
      <QualityGate>
        {/* Studio Lighting Setup for Photorealistic Automotive Finish */}
        <ambientLight intensity={0.65} />

        {/* Main Overhead Key Light */}
        <directionalLight
          position={[5, 9, 6]}
          intensity={1.6}
          color="#ffffff"
        />

        {/* Cool Rim Light from Rear-Top */}
        <directionalLight
          position={[-6, 7, -6]}
          intensity={1.1}
          color="#6fd6ff"
        />

        {/* Warm Low Front Fill Light */}
        <directionalLight
          position={[0, 3, 8]}
          intensity={0.8}
          color="#ffeedd"
        />

        {/* Subtle Underbody Floor Reflection */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
          <planeGeometry args={[2.4, 4.8]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.5} />
        </mesh>

        {/* Engineering Floor Grid */}
        <Grid
          position={[0, 0, 0]}
          args={[24, 24]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#17202e"
          sectionSize={2}
          sectionThickness={1.0}
          sectionColor="#2563eb"
          fadeDistance={30}
          fadeStrength={1.2}
          infiniteGrid
          followCamera={false}
        />

        {/* 3. Real Supercar Bodywork & Spaceframe */}
        <Suspense fallback={null}>
          <CarBody xRayMode={xRayMode} manualExplode={manualExplode} />
        </Suspense>

        <ChassisFrame xRayMode={xRayMode} />

        {/* 4. Five Major Subsystems in True Mechanical Packaging */}
        {/* 3.0L Twin-Turbo V6 Powerplant */}
        <EngineSystem xRayMode={xRayMode} manualExplode={manualExplode} />

        {/* 7-Speed Dual-Clutch Transaxle & Differential */}
        <TransmissionSystem xRayMode={xRayMode} manualExplode={manualExplode} />

        {/* Double-Wishbone Coilover Suspension (Front Right) */}
        <SuspensionSystem xRayMode={xRayMode} manualExplode={manualExplode} />

        {/* 410mm Carbon-Ceramic 6-Piston Brakes (Front Right) */}
        <BrakeSystem xRayMode={xRayMode} manualExplode={manualExplode} />

        {/* Closed-Loop HVAC Refrigeration Cycle */}
        <AirconSystem xRayMode={xRayMode} manualExplode={manualExplode} />

        {/* 5. 3D Hotspots Layers anchored to components */}
        <HotspotLayer
          chapter="engine"
          parts={[
            { part: 'eng.block', position: [0, 0.85, 0.85], label: '3.0L Twin-Turbo V6 Block' },
            { part: 'eng.exhaustManifold', position: [0.45, 0.75, 0.95], label: 'Variable Twin Turbocharger' },
            { part: 'eng.intakeManifold', position: [0, 1.05, 0.85], label: 'Carbon Intake Plenum' },
          ]}
        />
        <HotspotLayer
          chapter="transmission"
          parts={[
            { part: 'trx.housing', position: [0, 0.68, -0.2], label: '7-Speed Dual-Clutch Housing' },
            { part: 'trx.differential', position: [0, 0.52, -1.2], label: 'Limited-Slip Differential' },
          ]}
        />
        <HotspotLayer
          chapter="suspension"
          parts={[
            { part: 'susp.damper', position: [0.75, 0.52, 1.35], label: 'MagneRide Adaptive Damper' },
            { part: 'susp.spring', position: [0.75, 0.42, 1.35], label: 'Helical Coilover Spring' },
            { part: 'susp.wishboneLower', position: [0.65, 0.28, 1.35], label: 'Lower Tubular A-Arm' },
          ]}
        />
        <HotspotLayer
          chapter="brakes"
          parts={[
            { part: 'brk.disc', position: [0.82, 0.35, 1.35], label: '410mm Carbon-Ceramic Rotor' },
            { part: 'brk.caliper', position: [0.82, 0.52, 1.38], label: '6-Piston Monobloc Caliper' },
          ]}
        />
        <HotspotLayer
          chapter="aircon"
          parts={[
            { part: 'ac.condenser', position: [0, 0.65, 1.95], label: 'Microchannel Condenser Core' },
            { part: 'ac.compressor', position: [-0.42, 0.55, 1.15], label: 'Variable Swashplate Compressor' },
          ]}
        />
      </QualityGate>

      <Preload all />
    </>
  );
}

export default Scene;
