import { useRef, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { OrbitControls, ContactShadows, useTexture } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useFerrariStore } from '@/state/useFerrariStore';
import { useFrame } from '@react-three/fiber';

interface StudioStageProps {
  scrollProgress: number;
}

// Asphalt textured floor isolated behind its own Suspense so lighting & camera mount instantly
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
      tex.repeat.set(20, 20);
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
        color="#1e2026"
        roughness={0.72}
        metalness={0.25}
      />
    </mesh>
  );
}

function SimpleFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[120, 120]} />
      <meshStandardMaterial color="#0a0c10" roughness={0.8} metalness={0.15} />
    </mesh>
  );
}

/**
 * Architectural Studio Pavilion Elements
 * Adds vertical LED light pillars, overhead softbox structures,
 * and a curved studio cyclorama wall to eliminate the empty dark void.
 */
function StudioArchitecture() {
  // 6 Vertical Architectural LED Light Columns in the background
  const pillars = useMemo(() => [
    { x: -9, z: -14, h: 10 },
    { x: -5, z: -16, h: 10 },
    { x: 0, z: -17, h: 10 },
    { x: 5, z: -16, h: 10 },
    { x: 9, z: -14, h: 10 },
  ], []);

  return (
    <group position={[0, 0, 0]}>
      {/* ── 1. Curved Studio Cyclorama Wall in Background ───────────────────── */}
      <mesh position={[0, 4.5, -18]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[26, 26, 12, 48, 1, true, -Math.PI / 3, (Math.PI * 2) / 3]} />
        <meshStandardMaterial
          color="#0b0d12"
          roughness={0.85}
          metalness={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      {/* ── 2. Architectural Vertical LED Light Columns ─────────────────────── */}
      {pillars.map((p, idx) => (
        <group key={`pillar-${idx}`} position={[p.x, p.h / 2, p.z]}>
          {/* Dark pillar structure */}
          <mesh>
            <boxGeometry args={[0.22, p.h, 0.22]} />
            <meshStandardMaterial color="#080a0e" metalness={0.9} roughness={0.3} />
          </mesh>
          {/* Subtle Ice-Blue / White Vertical Light Strip */}
          <mesh position={[0, 0, 0.12]}>
            <planeGeometry args={[0.08, p.h * 0.9]} />
            <meshBasicMaterial color="#e0f2fe" transparent opacity={0.65} />
          </mesh>
        </group>
      ))}

      {/* ── 3. Suspended Overhead Studio Softbox Structure ──────────────────── */}
      <group position={[0, 6.2, 0]}>
        {/* Softbox Housing */}
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[4.8, 0.18, 8.5]} />
          <meshStandardMaterial color="#08090d" metalness={0.9} roughness={0.25} />
        </mesh>
        {/* Glowing Diffuser Panel */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[4.6, 8.3]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Subtle Warm Accent Border */}
        <mesh position={[0, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.2, 2.25, 32]} />
          <meshBasicMaterial color="#ffd200" transparent opacity={0.3} />
        </mesh>
      </group>

      {/* ── 4. Maranello Stage Caliper Rings on Floor ───────────────────────── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[3.2, 3.22, 64]} />
        <meshBasicMaterial color="#d91424" transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[5.5, 5.52, 64]} />
        <meshBasicMaterial color="#ffd200" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

export function StudioStage({ scrollProgress }: StudioStageProps) {
  const orbitMode = useFerrariStore((s) => s.orbitMode);
  const activeChapter = useFerrariStore((s) => s.activeChapter);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Cinematic camera choreography based on scroll progress
  useFrame((state, delta) => {
    if (orbitMode || activeChapter === 'atelier') {
      return;
    }

    const cam = state.camera;

    // Camera angles tailored to Ferrari design highlights:
    // 01 Hero: Front 3/4 beauty view, car perfectly framed in the open right space
    let targetX = 4.8;
    let targetY = 1.6;
    let targetZ = 4.8;
    let lookX = 0.35;
    let lookY = 0.45;

    if (scrollProgress > 0.15 && scrollProgress <= 0.35) {
      // 02 Aerodinamica: Low side profile
      targetX = 5.4;
      targetY = 1.15;
      targetZ = 1.5;
      lookX = 0.45;
      lookY = 0.42;
    } else if (scrollProgress > 0.35 && scrollProgress <= 0.55) {
      // 03 HY-KERS V12: Elevated rear engine hatch perspective
      targetX = 2.4;
      targetY = 2.3;
      targetZ = -3.6;
      lookX = 0.2;
      lookY = 0.5;
    } else if (scrollProgress > 0.55 && scrollProgress <= 0.75) {
      // 04 Telaio Carbonio: Low rear stance showing F1 diffuser
      targetX = 4.2;
      targetY = 1.05;
      targetZ = -4.0;
      lookX = 0.35;
      lookY = 0.42;
    } else if (scrollProgress > 0.75) {
      // 05 Specs & Atelier: Dynamic overview
      targetX = 4.6;
      targetY = 1.7;
      targetZ = 4.4;
      lookX = 0.25;
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

      {/* ── 0. SEAMLESS BACKGROUND & DISTANCE FOG ───────────────────────────── */}
      <color attach="background" args={['#070709']} />
      <fog attach="fog" args={['#070709', 12, 36]} />

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
      <directionalLight position={[-6, 6, -5]} intensity={1.4} color="#e0f2fe" />

      {/* Warm Frontal Nose Fill Light */}
      <directionalLight position={[0, 2.8, 6]} intensity={0.8} color="#fffbeb" />

      {/* Low Underbody Floor Glow */}
      <pointLight position={[0, 0.35, 0]} intensity={0.6} distance={6} color="#ffffff" />

      {/* ── 2. STUDIO ARCHITECTURE & LIGHT PILLARS ──────────────────────────── */}
      <StudioArchitecture />

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

      {/* ── 4. TEXTURED PBR ASPHALT STUDIO FLOOR ────────────────────────────── */}
      <group position={[0, -0.005, 0]}>
        <Suspense fallback={<SimpleFloor />}>
          <AsphaltFloor />
        </Suspense>
      </group>
    </>
  );
}
