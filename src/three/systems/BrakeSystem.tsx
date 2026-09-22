import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { progressBus } from '@/state/progressBus';

interface BrakeSystemProps {
  xRayMode?: boolean;
  manualExplode?: number;
}

/**
 * 410mm Carbon-Silicon Carbide (C/SiC) 6-Piston Braking System
 * Positioned on the front right wheel hub (x = 0.82, y = 0.33, z = 1.35)
 * Features cross-drilled ventilated ceramic composite rotor, floating hat with bobbins,
 * monobloc 6-piston red caliper, clamping pads, and blackbody thermal incandescence.
 */
export function BrakeSystem({ xRayMode = false, manualExplode = 0 }: BrakeSystemProps) {
  const groupRef = useRef<THREE.Group>(null);
  const rotorRef = useRef<THREE.Group>(null);
  const innerPadRef = useRef<THREE.Group>(null);
  const outerPadRef = useRef<THREE.Group>(null);
  const thermalMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

  const bobbinsInstancedRef = useRef<THREE.InstancedMesh>(null);
  const holesInstancedRef = useRef<THREE.InstancedMesh>(null);

  const outerRadius = 0.22;
  const innerRadius = 0.12;
  const discThickness = 0.035;
  const holesCount = 18;

  const materials = useMemo(() => {
    return {
      caliperRed: new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        metalness: 0.85,
        roughness: 0.25,
        transparent: xRayMode,
        opacity: xRayMode ? 0.4 : 1.0,
      }),
      rotorHat: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.92,
        roughness: 0.2,
      }),
      bobbinsGold: new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.95,
        roughness: 0.15,
      }),
      padPlate: new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.8,
        roughness: 0.4,
      }),
      holeDark: new THREE.MeshBasicMaterial({ color: 0x09090b }),
    };
  }, [xRayMode]);

  // Initialize instanced transforms once
  useEffect(() => {
    const dummy = new THREE.Object3D();

    // 10 Bobbins
    if (bobbinsInstancedRef.current) {
      for (let i = 0; i < 10; i++) {
        const angle = (i * 2 * Math.PI) / 10;
        dummy.position.set(0, Math.cos(angle) * (innerRadius * 0.95), Math.sin(angle) * (innerRadius * 0.95));
        dummy.rotation.set(0, 0, Math.PI / 2);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        bobbinsInstancedRef.current.setMatrixAt(i, dummy.matrix);
      }
      bobbinsInstancedRef.current.instanceMatrix.needsUpdate = true;
    }

    // 20 Drill Holes
    if (holesInstancedRef.current) {
      for (let i = 0; i < holesCount; i++) {
        const angle = (i * 2 * Math.PI) / holesCount;
        const r = innerRadius + 0.04 + ((i % 3) / 2) * (outerRadius - innerRadius - 0.08);
        dummy.position.set(discThickness / 2, Math.cos(angle) * r, Math.sin(angle) * r);
        dummy.rotation.set(0, 0, Math.PI / 2);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        holesInstancedRef.current.setMatrixAt(i, dummy.matrix);
      }
      holesInstancedRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [innerRadius, outerRadius, discThickness]);

  useFrame((_, delta) => {
    const brakeProgress = progressBus['brakes']?.current ?? 0;
    const revealProgress = progressBus['reveal']?.current ?? 0;

    // Spin rotor with road speed
    if (rotorRef.current) rotorRef.current.rotation.x += delta * 12.0;

    // Pad clamping during brake chapter mechanism phase (progress > 0.55)
    const clampFactor = brakeProgress > 0.55 ? (brakeProgress - 0.55) / 0.45 : 0;
    if (innerPadRef.current) {
      innerPadRef.current.position.x = -discThickness / 2 - 0.012 - (1 - clampFactor) * 0.015;
    }
    if (outerPadRef.current) {
      outerPadRef.current.position.x = discThickness / 2 + 0.012 + (1 - clampFactor) * 0.015;
    }

    // Thermal glow emission under braking
    if (thermalMaterialRef.current) {
      const glow = clampFactor * 2.8;
      thermalMaterialRef.current.emissiveIntensity = glow;
      const r = THREE.MathUtils.lerp(0.5, 1.0, clampFactor);
      const g = THREE.MathUtils.lerp(0.05, 0.55, Math.pow(clampFactor, 2.2));
      thermalMaterialRef.current.emissive.setRGB(r, g, 0.05);
    }

    // Explode separation outward
    const exp = Math.max(revealProgress > 0.05 ? revealProgress * 0.9 : 0, manualExplode);
    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        0.82 + exp * 0.75,
        delta * 6
      );
    }
  });

  return (
    <group ref={groupRef} position={[0.82, 0.33, 1.35]}>
      {/* 1. Rotating Carbon Rotor */}
      <group ref={rotorRef}>
        {/* Billet Aluminum Center Hat */}
        <mesh rotation={[0, 0, Math.PI / 2]} material={materials.rotorHat}>
          <cylinderGeometry args={[innerRadius * 0.9, innerRadius * 0.9, 0.04, 20]} />
        </mesh>

        {/* Instanced Bobbins */}
        <instancedMesh ref={bobbinsInstancedRef} args={[undefined, undefined, 10]} material={materials.bobbinsGold}>
          <cylinderGeometry args={[0.008, 0.008, 0.045, 10]} />
        </instancedMesh>

        {/* Outer Carbon Ceramic Friction Ring with Thermal Glow */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[outerRadius, outerRadius, discThickness, 32]} />
          <meshStandardMaterial
            ref={thermalMaterialRef}
            color={0x2b2d31}
            metalness={0.7}
            roughness={0.35}
            emissive={new THREE.Color(0xff4400)}
            emissiveIntensity={0}
          />
        </mesh>

        {/* Instanced Drill Holes */}
        <instancedMesh ref={holesInstancedRef} args={[undefined, undefined, holesCount]} material={materials.holeDark}>
          <cylinderGeometry args={[0.006, 0.006, 0.004, 8]} />
        </instancedMesh>
      </group>

      {/* 2. Fixed Monobloc 6-Piston Caliper */}
      <group position={[0, outerRadius * 0.82, 0.03]}>
        <mesh material={materials.caliperRed}>
          <boxGeometry args={[discThickness + 0.05, 0.12, 0.22]} />
        </mesh>
        <mesh position={[0, -0.03, 0]}>
          <boxGeometry args={[discThickness + 0.01, 0.07, 0.18]} />
          <meshBasicMaterial color={0x020617} />
        </mesh>
      </group>

      {/* 3. Clamping Brake Pads */}
      <group ref={innerPadRef} position={[-discThickness / 2 - 0.01, outerRadius * 0.82, 0.03]}>
        <mesh material={materials.padPlate}>
          <boxGeometry args={[0.006, 0.07, 0.15]} />
        </mesh>
      </group>
      <group ref={outerPadRef} position={[discThickness / 2 + 0.01, outerRadius * 0.82, 0.03]}>
        <mesh material={materials.padPlate}>
          <boxGeometry args={[0.006, 0.07, 0.15]} />
        </mesh>
      </group>
    </group>
  );
}
