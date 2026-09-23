import { useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useFerrariStore } from '@/state/useFerrariStore';
import { useFrame } from '@react-three/fiber';

interface StudioStageProps {
  scrollProgress: number;
}

export function StudioStage({ scrollProgress }: StudioStageProps) {
  const orbitMode = useFerrariStore((s) => s.orbitMode);
  const activeChapter = useFerrariStore((s) => s.activeChapter);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Smooth chapter-based camera vantage with open-space composition
  useFrame((state, delta) => {
    if (orbitMode || activeChapter === 'atelier') {
      // In atelier or orbit mode, user has free interactive control
      return;
    }

    const cam = state.camera;

    // Cinematic camera angles tailored to Ferrari design highlights
    let targetX = 4.2;
    let targetY = 1.5;
    let targetZ = 4.4;
    let lookY = 0.45;

    if (scrollProgress > 0.15 && scrollProgress <= 0.35) {
      // 02 Aerodynamics: Dynamic low side profile
      targetX = 4.8;
      targetY = 1.1;
      targetZ = 1.4;
    } else if (scrollProgress > 0.35 && scrollProgress <= 0.55) {
      // 03 Powertrain V12: Elevated rear 3/4 angle
      targetX = 2.2;
      targetY = 2.2;
      targetZ = -3.4;
    } else if (scrollProgress > 0.55 && scrollProgress <= 0.75) {
      // 04 Chassis & Diffuser: Low rear 3/4 angle
      targetX = 3.8;
      targetY = 1.0;
      targetZ = -3.8;
    } else if (scrollProgress > 0.75) {
      // 05 Cockpit / Specs / Atelier: High 3/4 perspective overview
      targetX = 4.4;
      targetY = 1.7;
      targetZ = 4.2;
    }

    cam.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), delta * 2.8);
    cam.lookAt(0, lookY, 0);
  });

  return (
    <>
      {/* 360-degree OrbitControls enabled in atelier mode or on drag */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        maxPolarAngle={Math.PI / 2 - 0.02}
        minDistance={2.4}
        maxDistance={8.5}
        enabled={orbitMode || activeChapter === 'atelier'}
      />

      {/* ── 0. SEAMLESS STUDIO BACKDROP COLOR ─────────────────────────────── */}
      <color attach="background" args={['#070709']} />

      {/* ── 1. STUDIO DIRECTIONAL LIGHTING RIG (Instant, Zero Suspense Lag) ── */}
      <ambientLight intensity={0.65} />

      {/* Overhead Key Softbox */}
      <directionalLight
        position={[4, 9, 4]}
        intensity={1.8}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />

      {/* Cool Sculptural Rim Light from Rear */}
      <directionalLight
        position={[-6, 6, -5]}
        intensity={1.2}
        color="#e0f2fe"
      />

      {/* Warm Frontal Nose Fill Light */}
      <directionalLight
        position={[0, 2.8, 6]}
        intensity={0.8}
        color="#fffbeb"
      />

      {/* Low Underbody Floor Glow */}
      <pointLight
        position={[0, 0.35, 0]}
        intensity={0.5}
        distance={5}
        color="#ffffff"
      />

      {/* ── 3. PHOTOREALISTIC GROUND CONTACT SHADOWS ─────────────────────────── */}
      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.85}
        scale={8.5}
        blur={2.0}
        far={3.0}
        resolution={1024}
        color="#000000"
      />

      {/* ── 4. SEAMLESS INFINITE STUDIO CYCLORAMA FLOOR ─────────────────────── */}
      <group position={[0, -0.005, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[180, 180]} />
          <meshStandardMaterial
            color="#070709"
            roughness={0.85}
            metalness={0.08}
          />
        </mesh>
      </group>
    </>
  );
}
