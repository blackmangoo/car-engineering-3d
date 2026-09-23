import { useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
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

  // Dynamic camera positioning based on scroll chapter
  useFrame((state, delta) => {
    if (orbitMode || activeChapter === 'atelier') {
      // User has full free orbit drag control
      return;
    }

    const cam = state.camera;

    // Smooth chapter-based camera vantage with open-space composition
    let targetX = 3.8;
    let targetY = 1.4;
    let targetZ = 4.2;
    let lookX = -0.65; // Offsets target so car sits prominently in the open right half
    let lookY = 0.45;

    if (scrollProgress > 0.15 && scrollProgress <= 0.35) {
      // Aerodynamics profile (Text on right -> car centered left)
      targetX = 4.6;
      targetY = 1.1;
      targetZ = 1.4;
      lookX = 0.65;
      lookY = 0.42;
    } else if (scrollProgress > 0.35 && scrollProgress <= 0.55) {
      // Powertrain V12 (Text on left -> car centered right, elevated rear hatch)
      targetX = 2.0;
      targetY = 2.3;
      targetZ = -3.2;
      lookX = -0.55;
      lookY = 0.55;
    } else if (scrollProgress > 0.55 && scrollProgress <= 0.75) {
      // Chassis & Rear diffuser (Text on right -> car centered left)
      targetX = 3.8;
      targetY = 0.95;
      targetZ = -3.8;
      lookX = 0.55;
      lookY = 0.42;
    } else if (scrollProgress > 0.75) {
      // Technical specs & Atelier overview
      targetX = 4.2;
      targetY = 1.6;
      targetZ = 4.0;
      lookX = 0;
      lookY = 0.45;
    }

    cam.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), delta * 2.8);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(new THREE.Vector3(lookX, lookY, 0), delta * 3.2);
      controlsRef.current.update();
    }
  });

  return (
    <>
      {/* 360-degree OrbitControls enabled in atelier mode or on drag */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        maxPolarAngle={Math.PI / 2 - 0.02}
        minDistance={2.5}
        maxDistance={8.5}
        enabled={orbitMode || activeChapter === 'atelier'}
      />

      {/* ── Studio Key Lighting ─────────────────────────────────────────────── */}
      <ambientLight intensity={0.55} />

      {/* Overhead Key Softbox */}
      <directionalLight
        position={[4, 8, 4]}
        intensity={1.8}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />

      {/* Cool Sculptural Rim Light from Rear */}
      <directionalLight
        position={[-6, 5, -5]}
        intensity={1.2}
        color="#e0f2fe"
      />

      {/* Warm Frontal Nose Fill Light */}
      <directionalLight
        position={[0, 2.5, 6]}
        intensity={0.7}
        color="#fffbeb"
      />

      {/* Low Ground Floor Fill Light */}
      <pointLight
        position={[0, 0.4, 0]}
        intensity={0.6}
        distance={6}
        color="#ffffff"
      />

      {/* ── Asphalt Studio Floor with Ground Shadows ─────────────────────────── */}
      <group position={[0, -0.001, 0]}>
        {/* Floor Surface */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[45, 45]} />
          <meshStandardMaterial
            color="#08080a"
            roughness={0.75}
            metalness={0.25}
          />
        </mesh>

        {/* Soft Ground Contact Shadow under Ferrari tires & chassis */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
          <planeGeometry args={[2.5, 4.9]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={0.75}
          />
        </mesh>

        {/* Minimalist Studio Floor Grid Line Rings */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <ringGeometry args={[3.2, 3.22, 64]} />
          <meshBasicMaterial color="#d91424" transparent opacity={0.2} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <ringGeometry args={[5.2, 5.22, 64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.08} />
        </mesh>
      </group>
    </>
  );
}
