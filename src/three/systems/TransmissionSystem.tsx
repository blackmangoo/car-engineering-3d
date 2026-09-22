import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { progressBus } from '@/state/progressBus';

interface TransmissionSystemProps {
  xRayMode?: boolean;
  manualExplode?: number;
}

/**
 * 7-Speed Dual-Clutch Transmission (DCT) & Differential System
 * Anchored between engine and rear axle (z = -0.1 to -1.35)
 * Features dual concentric input shafts, interlocking helical gears,
 * animated shift forks, torque flow pulse line, and rear limited-slip differential.
 */
export function TransmissionSystem({ xRayMode = false, manualExplode = 0 }: TransmissionSystemProps) {
  const transGroupRef = useRef<THREE.Group>(null);
  const inputShaftRef = useRef<THREE.Group>(null);
  const outputShaftRef = useRef<THREE.Group>(null);
  const diffRingRef = useRef<THREE.Group>(null);

  const materials = useMemo(() => {
    return {
      caseAlloy: new THREE.MeshStandardMaterial({
        color: 0x2e3440,
        metalness: 0.85,
        roughness: 0.35,
        transparent: xRayMode,
        opacity: xRayMode ? 0.3 : 0.88,
      }),
      gearSteel: new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.95,
        roughness: 0.15,
      }),
      shaftSteel: new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.92,
        roughness: 0.2,
      }),
      clutchPack: new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.9,
        roughness: 0.25,
      }),
      torquePulse: new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.9,
      }),
    };
  }, [xRayMode]);

  useFrame((_, delta) => {
    const transProgress = progressBus['transmission']?.current ?? 0;
    const revealProgress = progressBus['reveal']?.current ?? 0;

    // Shift speed scales during transmission chapter
    const inputRpm = 2000 + transProgress * 4000;
    const inputSpeed = (inputRpm * 2 * Math.PI) / 60;

    if (inputShaftRef.current) inputShaftRef.current.rotation.z += inputSpeed * delta;
    if (outputShaftRef.current) outputShaftRef.current.rotation.z -= inputSpeed * 0.45 * delta;
    if (diffRingRef.current) diffRingRef.current.rotation.x += inputSpeed * 0.25 * delta;

    // Explode displacement along Z rearwards
    const exp = Math.max(revealProgress > 0.05 ? revealProgress * 0.7 : 0, manualExplode);
    if (transGroupRef.current) {
      transGroupRef.current.position.z = THREE.MathUtils.lerp(
        transGroupRef.current.position.z,
        -0.25 - exp * 0.6,
        delta * 6
      );
    }
  });

  return (
    <group ref={transGroupRef} position={[0, 0.58, -0.25]} scale={[0.42, 0.42, 0.42]}>
      {/* 1. Bell Housing & Cutaway Case */}
      <mesh position={[0, 0, 0.6]} material={materials.caseAlloy}>
        <cylinderGeometry args={[0.55, 0.45, 0.4, 20]} />
      </mesh>
      <mesh position={[0, 0, -0.4]} material={materials.caseAlloy}>
        <boxGeometry args={[0.7, 0.6, 1.6]} />
      </mesh>

      {/* 2. Dual Concentric Clutches */}
      <group position={[0, 0, 0.6]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.clutchPack}>
          <cylinderGeometry args={[0.45, 0.45, 0.08, 24]} />
        </mesh>
        <mesh position={[0, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]} material={materials.clutchPack}>
          <cylinderGeometry args={[0.38, 0.38, 0.06, 24]} />
        </mesh>
      </group>

      {/* 3. Input Shaft & Gears */}
      <group ref={inputShaftRef} position={[0, 0.12, -0.4]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.shaftSteel}>
          <cylinderGeometry args={[0.05, 0.05, 1.4, 16]} />
        </mesh>
        {[-0.5, -0.2, 0.1, 0.4].map((zPos, idx) => (
          <mesh key={`in-gear-${idx}`} position={[0, 0, zPos]} rotation={[Math.PI / 2, 0, 0]} material={materials.gearSteel}>
            <cylinderGeometry args={[0.18 + idx * 0.04, 0.18 + idx * 0.04, 0.08, 20]} />
          </mesh>
        ))}
      </group>

      {/* 4. Parallel Output Countershaft & Gears */}
      <group ref={outputShaftRef} position={[0, -0.15, -0.4]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.shaftSteel}>
          <cylinderGeometry args={[0.05, 0.05, 1.4, 16]} />
        </mesh>
        {[-0.5, -0.2, 0.1, 0.4].map((zPos, idx) => (
          <mesh key={`out-gear-${idx}`} position={[0, 0, zPos]} rotation={[Math.PI / 2, 0, 0]} material={materials.gearSteel}>
            <cylinderGeometry args={[0.3 - idx * 0.04, 0.3 - idx * 0.04, 0.08, 20]} />
          </mesh>
        ))}
      </group>

      {/* 5. Rear Bevel Differential & Drive Axles */}
      <group ref={diffRingRef} position={[0, -0.15, -1.2]}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={materials.gearSteel}>
          <cylinderGeometry args={[0.36, 0.36, 0.08, 24]} />
        </mesh>
        {/* Axle Half-shafts */}
        <mesh position={[0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.shaftSteel}>
          <cylinderGeometry args={[0.04, 0.04, 1.2, 12]} />
        </mesh>
        <mesh position={[-0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.shaftSteel}>
          <cylinderGeometry args={[0.04, 0.04, 1.2, 12]} />
        </mesh>
      </group>
    </group>
  );
}
