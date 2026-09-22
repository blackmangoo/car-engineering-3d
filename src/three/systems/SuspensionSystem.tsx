import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { progressBus } from '@/state/progressBus';

interface SuspensionSystemProps {
  xRayMode?: boolean;
  manualExplode?: number;
}

/**
 * Adaptive Double-Wishbone & Coilover Suspension System
 * Anchored at the front right corner (x = 0.8, y = 0.35, z = 1.35)
 * Features triangulated upper and lower control arms, dynamic compressing helical spring,
 * telescoping hydraulic damper rod, and upright steering knuckle.
 */
export function SuspensionSystem({ xRayMode = false, manualExplode = 0 }: SuspensionSystemProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lowerArmRef = useRef<THREE.Group>(null);
  const upperArmRef = useRef<THREE.Group>(null);
  const damperShaftRef = useRef<THREE.Group>(null);
  const springMeshRef = useRef<THREE.Mesh>(null);

  const materials = useMemo(() => {
    return {
      upperArm: new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        metalness: 0.85,
        roughness: 0.25,
        transparent: xRayMode,
        opacity: xRayMode ? 0.4 : 1.0,
      }),
      lowerArm: new THREE.MeshStandardMaterial({
        color: 0x1d4ed8,
        metalness: 0.88,
        roughness: 0.25,
        transparent: xRayMode,
        opacity: xRayMode ? 0.4 : 1.0,
      }),
      springRed: new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        metalness: 0.8,
        roughness: 0.2,
      }),
      damperBody: new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.92,
        roughness: 0.18,
      }),
      damperChrome: new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        metalness: 0.98,
        roughness: 0.05,
      }),
      knuckleAlloy: new THREE.MeshStandardMaterial({
        color: 0x64748b,
        metalness: 0.85,
        roughness: 0.3,
        transparent: xRayMode,
        opacity: xRayMode ? 0.4 : 1.0,
      }),
    };
  }, [xRayMode]);

  // Helical coilover spring geometry (scaled cleanly to wheel well)
  const springGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const coils = 6;
    const count = 50;
    const radius = 0.055;
    const height = 0.28;

    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const angle = t * coils * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, t * height, Math.sin(angle) * radius));
    }
    const path = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(path, 40, 0.012, 8, false);
  }, []);

  useFrame(({ clock }, delta) => {
    const time = clock.getElapsedTime();
    const suspProgress = progressBus['suspension']?.current ?? 0;
    const revealProgress = progressBus['reveal']?.current ?? 0;

    // Road bump oscillation during suspension chapter
    const activeFactor = suspProgress > 0.1 ? 1.0 : 0.25;
    const bump = Math.sin(time * 8.0) * 0.035 * activeFactor;

    if (lowerArmRef.current) lowerArmRef.current.rotation.z = bump * 1.5;
    if (upperArmRef.current) upperArmRef.current.rotation.z = bump * 1.5;

    // Damper telescoping
    if (damperShaftRef.current) {
      damperShaftRef.current.position.y = 0.25 + bump;
    }
    // Spring compression scale
    if (springMeshRef.current) {
      springMeshRef.current.scale.y = 1 + bump * 2.2;
    }

    // Explode separation outward along X
    const exp = Math.max(revealProgress > 0.05 ? revealProgress * 0.9 : 0, manualExplode);
    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        0.8 + exp * 0.65,
        delta * 6
      );
    }
  });

  return (
    <group ref={groupRef} position={[0.8, 0.35, 1.35]}>
      {/* 1. Lower A-Arm (Control Arm) */}
      <group ref={lowerArmRef} position={[-0.32, -0.05, 0]}>
        <mesh position={[0.16, 0, 0]} rotation={[0, 0, -Math.PI / 16]} material={materials.lowerArm}>
          <boxGeometry args={[0.32, 0.03, 0.24]} />
        </mesh>
      </group>

      {/* 2. Upper A-Arm */}
      <group ref={upperArmRef} position={[-0.28, 0.25, 0]}>
        <mesh position={[0.14, 0, 0]} rotation={[0, 0, Math.PI / 18]} material={materials.upperArm}>
          <boxGeometry args={[0.26, 0.025, 0.18]} />
        </mesh>
      </group>

      {/* 3. Upright / Steering Knuckle */}
      <mesh position={[0.02, 0.1, 0]} material={materials.knuckleAlloy}>
        <boxGeometry args={[0.06, 0.34, 0.12]} />
      </mesh>

      {/* 4. Compact Coilover Strut & Damper */}
      <group position={[-0.08, 0.04, 0]} rotation={[0, 0, -Math.PI / 16]}>
        {/* Gold Anodized Damper Body */}
        <mesh position={[0, 0.08, 0]} material={materials.damperBody}>
          <cylinderGeometry args={[0.035, 0.035, 0.16, 14]} />
        </mesh>
        {/* Polished Chrome Telescoping Shaft */}
        <group ref={damperShaftRef} position={[0, 0.16, 0]}>
          <mesh material={materials.damperChrome}>
            <cylinderGeometry args={[0.016, 0.016, 0.18, 12]} />
          </mesh>
        </group>
        {/* Red Helical Coil Spring */}
        <mesh ref={springMeshRef} geometry={springGeometry} position={[0, 0.04, 0]} material={materials.springRed} />
      </group>
    </group>
  );
}
