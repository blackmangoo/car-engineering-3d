import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { progressBus } from '@/state/progressBus';

interface AirconSystemProps {
  xRayMode?: boolean;
  manualExplode?: number;
}

/**
 * Automotive HVAC & Refrigerant Thermodynamic Cycle System
 * Anchored from front condenser (z = 1.95) to compressor (z = 1.2) to cabin evaporator (z = 0.35)
 * Features variable swashplate compressor, condenser coil with fan, TXV orifice,
 * and 4-phase closed-circuit refrigerant particle flow.
 */
export function AirconSystem({ xRayMode = false, manualExplode = 0 }: AirconSystemProps) {
  const groupRef = useRef<THREE.Group>(null);
  const fanRef = useRef<THREE.Group>(null);
  const compressorPulleyRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);

  const particleCount = 140;

  // Closed continuous 3D loop for refrigerant circuit
  const loopCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-0.42, 0.52, 1.15), // Compressor discharge
        new THREE.Vector3(-0.25, 0.58, 1.65), // Hot discharge line
        new THREE.Vector3(0, 0.62, 1.92), // Condenser inlet
        new THREE.Vector3(0.35, 0.58, 1.92), // Condenser outlet
        new THREE.Vector3(0.42, 0.52, 1.5), // Receiver / Dryer
        new THREE.Vector3(0.38, 0.65, 0.6), // TXV valve inlet
        new THREE.Vector3(0, 0.82, 0.38), // Evaporator core (cabin cold)
        new THREE.Vector3(-0.35, 0.75, 0.45), // Suction line return
      ],
      true
    );
  }, []);

  // Pre-generate particle loop positions and color phases
  const [positions, colors, offsets] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const offs = new Float32Array(particleCount);

    const red = new THREE.Color(0xef4444); // High pressure superheated gas
    const orange = new THREE.Color(0xf59e0b); // Subcooled liquid
    const cyan = new THREE.Color(0x06b6d4); // Cold two-phase mist
    const blue = new THREE.Color(0x3b82f6); // Low pressure vapor return

    for (let i = 0; i < particleCount; i++) {
      offs[i] = i / particleCount;
      const point = loopCurve.getPoint(offs[i]);
      pos[i * 3] = point.x;
      pos[i * 3 + 1] = point.y;
      pos[i * 3 + 2] = point.z;

      // Color mapping by cycle phase
      const t = offs[i];
      const c = t < 0.25 ? red : t < 0.5 ? orange : t < 0.75 ? cyan : blue;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    return [pos, col, offs];
  }, [loopCurve]);

  const materials = useMemo(() => {
    return {
      condenserAlu: new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.9,
        roughness: 0.25,
        transparent: xRayMode,
        opacity: xRayMode ? 0.4 : 1.0,
      }),
      compressorCast: new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.85,
        roughness: 0.35,
        transparent: xRayMode,
        opacity: xRayMode ? 0.4 : 1.0,
      }),
      pulleyBlack: new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.9,
        roughness: 0.3,
      }),
      copperLine: new THREE.MeshStandardMaterial({
        color: 0xb45309,
        metalness: 0.95,
        roughness: 0.15,
      }),
      evapCore: new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        metalness: 0.8,
        roughness: 0.3,
        transparent: xRayMode,
        opacity: xRayMode ? 0.4 : 1.0,
      }),
    };
  }, [xRayMode]);

  useFrame((_, delta) => {
    const acProgress = progressBus['aircon']?.current ?? 0;
    const revealProgress = progressBus['reveal']?.current ?? 0;

    // Spin fan and compressor pulley
    const speed = (1 + acProgress * 3.5) * delta;
    if (fanRef.current) fanRef.current.rotation.z += speed * 12;
    if (compressorPulleyRef.current) compressorPulleyRef.current.rotation.z += speed * 18;

    // Advance particle circulation
    if (pointsRef.current) {
      const geo = pointsRef.current.geometry;
      const posAttr = geo.attributes.position;
      const arr = posAttr.array as Float32Array;

      const flowRate = (0.08 + acProgress * 0.18) * delta;
      for (let i = 0; i < particleCount; i++) {
        offsets[i] = (offsets[i] + flowRate) % 1;
        const pt = loopCurve.getPoint(offsets[i]);
        arr[i * 3] = pt.x;
        arr[i * 3 + 1] = pt.y;
        arr[i * 3 + 2] = pt.z;
      }
      posAttr.needsUpdate = true;
    }

    // Explode separation along Z forward
    const exp = Math.max(revealProgress > 0.05 ? revealProgress * 0.8 : 0, manualExplode);
    if (groupRef.current) {
      groupRef.current.position.z = THREE.MathUtils.lerp(
        groupRef.current.position.z,
        exp * 0.5,
        delta * 6
      );
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 1. Front Condenser Radiator Core (z = 1.85, y = 0.32 inside front bumper) */}
      <group position={[0, 0.32, 1.85]}>
        <mesh material={materials.condenserAlu}>
          <boxGeometry args={[0.55, 0.22, 0.04]} />
        </mesh>
        {/* Electric Cooling Fan */}
        <group ref={fanRef} position={[0, 0, -0.03]}>
          <mesh material={materials.pulleyBlack}>
            <cylinderGeometry args={[0.1, 0.1, 0.015, 16]} />
          </mesh>
          {Array.from({ length: 6 }).map((_, idx) => (
            <mesh
              key={`fan-blade-${idx}`}
              position={[0, 0, 0]}
              rotation={[0, 0, (idx * Math.PI) / 3]}
              material={materials.pulleyBlack}
            >
              <boxGeometry args={[0.02, 0.2, 0.01]} />
            </mesh>
          ))}
        </group>
      </group>

      {/* 2. Swashplate AC Compressor (z = 0.95, y = 0.35) */}
      <group position={[-0.38, 0.35, 0.95]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.compressorCast}>
          <cylinderGeometry args={[0.08, 0.08, 0.22, 16]} />
        </mesh>
        <group ref={compressorPulleyRef} position={[0, 0, -0.12]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.pulleyBlack}>
            <cylinderGeometry args={[0.1, 0.1, 0.03, 16]} />
          </mesh>
        </group>
      </group>

      {/* 3. Evaporator Core under Cowl Dashboard (z = 0.55, y = 0.38) */}
      <group position={[0, 0.38, 0.55]}>
        <mesh material={materials.evapCore}>
          <boxGeometry args={[0.35, 0.16, 0.12]} />
        </mesh>
      </group>

      {/* 4. Refrigerant Lines (Connecting tubes) */}
      <mesh material={materials.copperLine}>
        <tubeGeometry args={[loopCurve, 80, 0.012, 8, true]} />
      </mesh>

      {/* 5. Circulating Refrigerant Particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.045} vertexColors transparent opacity={0.9} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}
