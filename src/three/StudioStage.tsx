import { useRef, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { OrbitControls, ContactShadows, useTexture } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useFerrariStore } from '@/state/useFerrariStore';
import { useFrame } from '@react-three/fiber';

interface StudioStageProps {
  scrollProgress: number;
}

// Asphalt textured floor isolated behind its own Suspense so scene lighting and camera mount instantly
function AsphaltFloor() {
  const [diffuseMap, normalMap, roughnessMap] = useTexture([
    '/floor/asphalt_02_diff_1k.jpg',
    '/floor/asphalt_02_nor_gl_1k.jpg',
    '/floor/asphalt_02_rough_1k.jpg',
  ]);

  useMemo(() => {
    [diffuseMap, normalMap, roughnessMap].forEach((tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(24, 24);
      tex.colorSpace = THREE.SRGBColorSpace;
    });
  }, [diffuseMap, normalMap, roughnessMap]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[120, 120]} />
      <meshStandardMaterial
        map={diffuseMap}
        normalMap={normalMap}
        roughnessMap={roughnessMap}
        color="#22242a"
        roughness={0.75}
        metalness={0.2}
      />
    </mesh>
  );
}

function SimpleFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[120, 120]} />
      <meshStandardMaterial color="#0b0d12" roughness={0.8} metalness={0.15} />
    </mesh>
  );
}

export function StudioStage({ scrollProgress }: StudioStageProps) {
  const orbitMode = useFerrariStore((s) => s.orbitMode);
  const activeChapter = useFerrariStore((s) => s.activeChapter);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Camera choreography based on scroll progress
  useFrame((state, delta) => {
    if (orbitMode || activeChapter === 'atelier') {
      return;
    }

    const cam = state.camera;

    // Cinematic camera positions per chapter with full-car framing:
    let targetX = 5.2;
    let targetY = 1.7;
    let targetZ = 5.0;
    let lookX = 0.45;
    let lookY = 0.45;

    if (scrollProgress > 0.15 && scrollProgress <= 0.35) {
      // 02 Aerodinamica: Low side profile
      targetX = 5.6;
      targetY = 1.2;
      targetZ = 1.6;
      lookX = 0.5;
      lookY = 0.42;
    } else if (scrollProgress > 0.35 && scrollProgress <= 0.55) {
      // 03 HY-KERS V12: Elevated rear engine hatch perspective
      targetX = 2.6;
      targetY = 2.4;
      targetZ = -3.8;
      lookX = 0.2;
      lookY = 0.5;
    } else if (scrollProgress > 0.55 && scrollProgress <= 0.75) {
      // 04 Telaio Carbonio: Low rear stance showing F1 diffuser
      targetX = 4.4;
      targetY = 1.1;
      targetZ = -4.2;
      lookX = 0.4;
      lookY = 0.42;
    } else if (scrollProgress > 0.75) {
      // 05 Specs & Atelier: Dynamic overview
      targetX = 4.8;
      targetY = 1.8;
      targetZ = 4.6;
      lookX = 0.3;
      lookY = 0.45;
    }

    cam.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), delta * 2.8);
    cam.lookAt(lookX, lookY, 0);
  });

  return (
    <>
      {/* Free 360-degree OrbitControls active in Atelier mode */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        maxPolarAngle={Math.PI / 2 - 0.02}
        minDistance={2.4}
        maxDistance={8.5}
        enabled={orbitMode || activeChapter === 'atelier'}
      />

      {/* ── 0. SEAMLESS BACKGROUND & DISTANCE FOG (No hard horizon cutoffs) ───── */}
      <color attach="background" args={['#070709']} />
      <fog attach="fog" args={['#070709', 9, 32]} />

      {/* ── 1. STUDIO LIGHTING RIG ───────────────────────────────────────────── */}
      <ambientLight intensity={0.55} />

      {/* Main Overhead Softbox Key Light */}
      <directionalLight
        position={[4, 9, 4]}
        intensity={2.0}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />

      {/* Cool Sculptural Rim Light from Rear */}
      <directionalLight position={[-6, 6, -5]} intensity={1.3} color="#e0f2fe" />

      {/* Warm Frontal Nose Fill Light */}
      <directionalLight position={[0, 2.8, 6]} intensity={0.8} color="#fffbeb" />

      {/* Low Underbody Floor Glow */}
      <pointLight position={[0, 0.35, 0]} intensity={0.6} distance={6} color="#ffffff" />

      {/* ── 2. SUSPENDED OVERHEAD STUDIO SOFTBOX FIXTURE ─────────────────────── */}
      <group position={[0, 5.2, 0]}>
        {/* Softbox Housing */}
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[4.2, 0.15, 7.5]} />
          <meshStandardMaterial color="#0b0d12" metalness={0.85} roughness={0.3} />
        </mesh>
        {/* Illuminated Diffuser Panel */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[4.0, 7.3]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* ── 3. PHOTOREALISTIC GROUND CONTACT SHADOWS ─────────────────────────── */}
      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.88}
        scale={9.0}
        blur={2.2}
        far={3.0}
        resolution={1024}
        color="#000000"
      />

      {/* ── 4. TEXTURED PBR ASPHALT STUDIO FLOOR (Blends infinitely into fog) ── */}
      <group position={[0, -0.005, 0]}>
        <Suspense fallback={<SimpleFloor />}>
          <AsphaltFloor />
        </Suspense>

        {/* Elegant Maranello Stage Caliper Rings */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
          <ringGeometry args={[3.2, 3.22, 64]} />
          <meshBasicMaterial color="#d91424" transparent opacity={0.35} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
          <ringGeometry args={[5.2, 5.22, 64]} />
          <meshBasicMaterial color="#ffd200" transparent opacity={0.22} />
        </mesh>
      </group>
    </>
  );
}
