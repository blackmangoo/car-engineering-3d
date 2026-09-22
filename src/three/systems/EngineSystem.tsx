import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { progressBus } from '@/state/progressBus';

interface EngineSystemProps {
  xRayMode?: boolean;
  manualExplode?: number;
}

/**
 * Photorealistic 3.0L Twin-Turbo V6 Powerplant System
 * Placed in the vehicle engine bay (anchored at z = +0.85, y = 0.72)
 * Features true reciprocating slider-crank kinematics, red wrinkle valve covers,
 * twin mirror-image turbochargers, and carbon intake plenum.
 */
export function EngineSystem({ xRayMode = false, manualExplode = 0 }: EngineSystemProps) {
  const crankRef = useRef<THREE.Group>(null);
  const pulleyRef = useRef<THREE.Group>(null);
  const engineGroupRef = useRef<THREE.Group>(null);
  const leftTurbineRef = useRef<THREE.MeshStandardMaterial>(null);
  const rightTurbineRef = useRef<THREE.MeshStandardMaterial>(null);

  const vAngle = (120 * Math.PI) / 180;
  const halfV = vAngle / 2;
  const crankRadius = 0.18;
  const conRodLength = 0.55;

  const cylinderDefs = useMemo(
    () => [
      { bank: 1, z: -0.32, phase: 0 },
      { bank: -1, z: -0.32, phase: Math.PI * (2 / 3) },
      { bank: 1, z: 0.0, phase: Math.PI * (4 / 3) },
      { bank: -1, z: 0.0, phase: Math.PI * (2 / 3) + Math.PI },
      { bank: 1, z: 0.32, phase: Math.PI * (1 / 3) },
      { bank: -1, z: 0.32, phase: Math.PI * (5 / 3) },
    ],
    []
  );

  const pistonRefs = useRef<(THREE.Group | null)[]>([]);
  const conRodRefs = useRef<(THREE.Group | null)[]>([]);
  const sparkRefs = useRef<(THREE.Mesh | null)[]>([]);

  // High-Grade PBR Materials
  const materials = useMemo(() => {
    return {
      redValveCover: new THREE.MeshStandardMaterial({
        color: 0xcc1111,
        roughness: 0.42,
        metalness: 0.65,
        transparent: xRayMode,
        opacity: xRayMode ? 0.35 : 1.0,
      }),
      castBlock: new THREE.MeshStandardMaterial({
        color: 0x3f4652,
        metalness: 0.85,
        roughness: 0.32,
        transparent: xRayMode,
        opacity: xRayMode ? 0.3 : 0.9,
      }),
      cylinderLiner: new THREE.MeshStandardMaterial({
        color: 0xd1d5db,
        metalness: 0.95,
        roughness: 0.12,
        side: THREE.BackSide,
      }),
      pistonAlloy: new THREE.MeshStandardMaterial({
        color: 0x9ca3af,
        metalness: 0.9,
        roughness: 0.2,
      }),
      conRodSteel: new THREE.MeshStandardMaterial({
        color: 0xb45309,
        metalness: 0.88,
        roughness: 0.28,
      }),
      crankshaftSteel: new THREE.MeshStandardMaterial({
        color: 0x374151,
        metalness: 0.92,
        roughness: 0.18,
      }),
      turboCompressor: new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.92,
        roughness: 0.2,
      }),
      turboTurbine: new THREE.MeshStandardMaterial({
        color: 0x27272a,
        metalness: 0.75,
        roughness: 0.5,
        emissive: new THREE.Color(0xff3300),
        emissiveIntensity: 0,
      }),
      intakePlenum: new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.6,
        roughness: 0.3,
      }),
      intakeRunners: new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        metalness: 0.98,
        roughness: 0.08,
      }),
      sparkFlash: new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.85,
      }),
      goldHardware: new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.95,
        roughness: 0.2,
      }),
    };
  }, [xRayMode]);

  // Frame Kinematics Loop
  useFrame(({ clock }, delta) => {
    const time = clock.getElapsedTime();
    const engineProgress = progressBus['engine']?.current ?? 0;
    const revealProgress = progressBus['reveal']?.current ?? 0;

    // RPM scales during engine chapter
    const currentRpm = 1800 + engineProgress * 5200;
    const radPerSec = (currentRpm * 2 * Math.PI) / 60;
    const crankAngle = (time * radPerSec) % (Math.PI * 2);

    // 1. Rotate Crankshaft & Pulleys
    if (crankRef.current) crankRef.current.rotation.z = -crankAngle;
    if (pulleyRef.current) pulleyRef.current.rotation.z = -crankAngle;

    // Explode lift
    const exp = Math.max(revealProgress > 0.05 ? revealProgress * 0.8 : 0, manualExplode);
    if (engineGroupRef.current) {
      engineGroupRef.current.position.y = THREE.MathUtils.lerp(
        engineGroupRef.current.position.y,
        0.44 + exp * 0.45,
        delta * 6
      );
    }

    // 2. Reciprocating Pistons & Conrods (Exact slider-crank kinematics)
    cylinderDefs.forEach((cyl, idx) => {
      const pistonGroup = pistonRefs.current[idx];
      const conRodGroup = conRodRefs.current[idx];
      const sparkMesh = sparkRefs.current[idx];

      const theta = crankAngle + cyl.phase;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const radTerm = Math.sqrt(
        Math.max(0, conRodLength * conRodLength - crankRadius * crankRadius * sinTheta * sinTheta)
      );
      const s = crankRadius * cosTheta + radTerm;
      const phi = -Math.asin((crankRadius * sinTheta) / conRodLength);

      const bankAngle = cyl.bank * halfV;
      const sinBank = Math.sin(bankAngle);
      const cosBank = Math.cos(bankAngle);

      const pinX = crankRadius * Math.sin(theta);
      const pinY = crankRadius * Math.cos(theta);

      if (pistonGroup) {
        const dist = s + exp * 0.15;
        pistonGroup.position.x = dist * sinBank;
        pistonGroup.position.y = dist * cosBank;
        pistonGroup.rotation.z = -bankAngle;
      }

      if (conRodGroup) {
        conRodGroup.position.set(pinX, pinY, cyl.z);
        conRodGroup.rotation.z = phi - bankAngle;
      }

      // Spark Ignition Flash at TDC
      if (sparkMesh) {
        const tdcProximity = Math.cos(theta);
        sparkMesh.visible = tdcProximity > 0.94;
      }
    });

    // 3. Turbo Glow
    const thermalLoad = Math.min(1.0, (currentRpm / 7000) * 0.8);
    if (leftTurbineRef.current && rightTurbineRef.current) {
      const glow = Math.max(0, (thermalLoad - 0.2) * 2.2);
      leftTurbineRef.current.emissiveIntensity = glow;
      rightTurbineRef.current.emissiveIntensity = glow;
    }
  });

  return (
    <group ref={engineGroupRef} position={[0, 0.44, -0.65]} scale={[0.38, 0.38, 0.38]}>
      {/* 1. ROTATING CRANKSHAFT & FLYWHEEL */}
      <group ref={crankRef} position={[0, -0.35, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.crankshaftSteel}>
          <cylinderGeometry args={[0.06, 0.06, 1.8, 18]} />
        </mesh>
        {[-0.55, 0.0, 0.55].map((zPos, idx) => (
          <group key={`crankthrow-${idx}`} position={[0, 0, zPos]}>
            <mesh position={[crankRadius, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.crankshaftSteel}>
              <cylinderGeometry args={[0.05, 0.05, 0.16, 16]} />
            </mesh>
            <mesh position={[-crankRadius * 0.8, 0, 0]} material={materials.crankshaftSteel}>
              <boxGeometry args={[0.22, 0.35, 0.1]} />
            </mesh>
          </group>
        ))}
        {/* Flywheel */}
        <mesh position={[0, 0, 0.95]} rotation={[Math.PI / 2, 0, 0]} material={materials.crankshaftSteel}>
          <cylinderGeometry args={[0.4, 0.4, 0.08, 24]} />
        </mesh>
      </group>

      {/* 2. FRONT PULLEYS & SERPENTINE BELT */}
      <group position={[0, -0.35, -0.95]}>
        <group ref={pulleyRef}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.crankshaftSteel}>
            <cylinderGeometry args={[0.18, 0.18, 0.06, 20]} />
          </mesh>
        </group>
        <mesh position={[-0.32, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.crankshaftSteel}>
          <cylinderGeometry args={[0.12, 0.12, 0.05, 16]} />
        </mesh>
        <mesh position={[0.32, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.crankshaftSteel}>
          <cylinderGeometry args={[0.12, 0.12, 0.05, 16]} />
        </mesh>
      </group>

      {/* 3. 120-DEGREE V6 CYLINDER BLOCK & VALVE COVERS */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, -0.55, 0]} material={materials.castBlock}>
          <boxGeometry args={[0.75, 0.25, 1.7]} />
        </mesh>

        {/* Bank 1 Cylinder Head (Left, angled +60 deg) */}
        <group position={[0.55, 0.25, 0]} rotation={[0, 0, -halfV]}>
          <mesh material={materials.castBlock}>
            <boxGeometry args={[0.5, 0.35, 1.6]} />
          </mesh>
          <mesh position={[0, 0.22, 0]} material={materials.redValveCover}>
            <boxGeometry args={[0.52, 0.12, 1.65]} />
          </mesh>
          {[-0.14, 0, 0.14].map((xOff, idx) => (
            <mesh key={`rib-l-${idx}`} position={[xOff, 0.29, 0]} material={materials.intakeRunners}>
              <boxGeometry args={[0.02, 0.02, 1.6]} />
            </mesh>
          ))}
        </group>

        {/* Bank 2 Cylinder Head (Right, angled -60 deg) */}
        <group position={[-0.55, 0.25, 0]} rotation={[0, 0, halfV]}>
          <mesh material={materials.castBlock}>
            <boxGeometry args={[0.5, 0.35, 1.6]} />
          </mesh>
          <mesh position={[0, 0.22, 0]} material={materials.redValveCover}>
            <boxGeometry args={[0.52, 0.12, 1.65]} />
          </mesh>
          {[-0.14, 0, 0.14].map((xOff, idx) => (
            <mesh key={`rib-r-${idx}`} position={[xOff, 0.29, 0]} material={materials.intakeRunners}>
              <boxGeometry args={[0.02, 0.02, 1.6]} />
            </mesh>
          ))}
        </group>
      </group>

      {/* 4. SIX RECIPROCATING PISTONS & CONRODS */}
      {cylinderDefs.map((cyl, idx) => {
        const bankAngle = cyl.bank * halfV;
        return (
          <group key={`cyl-assembly-${idx}`}>
            <group
              position={[Math.sin(bankAngle) * 0.55, Math.cos(bankAngle) * 0.12, cyl.z]}
              rotation={[0, 0, -bankAngle]}
            >
              <mesh material={materials.cylinderLiner}>
                <cylinderGeometry args={[0.22, 0.22, 0.95, 18, 1, true]} />
              </mesh>
            </group>

            {/* Piston */}
            <group ref={(el) => { pistonRefs.current[idx] = el; }} position={[0, 0, cyl.z]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.pistonAlloy}>
                <cylinderGeometry args={[0.21, 0.21, 0.24, 18]} />
              </mesh>
              {/* Spark flash mesh */}
              <mesh
                ref={(el) => { sparkRefs.current[idx] = el; }}
                position={[0, 0.18, 0]}
                material={materials.sparkFlash}
                visible={false}
              >
                <sphereGeometry args={[0.06, 8, 8]} />
              </mesh>
            </group>

            {/* Connecting Rod */}
            <group ref={(el) => { conRodRefs.current[idx] = el; }}>
              <mesh position={[0, conRodLength / 2, 0]} material={materials.conRodSteel}>
                <boxGeometry args={[0.06, conRodLength, 0.04]} />
              </mesh>
              <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.conRodSteel}>
                <cylinderGeometry args={[0.09, 0.09, 0.1, 14]} />
              </mesh>
            </group>
          </group>
        );
      })}

      {/* 5. TWIN TURBOCHARGERS */}
      <group position={[0.85, 0.15, 0.25]}>
        <mesh material={materials.turboCompressor}>
          <torusGeometry args={[0.18, 0.08, 12, 20, Math.PI * 1.5]} />
        </mesh>
        <mesh position={[0, 0, 0.2]} material={materials.turboTurbine}>
          <cylinderGeometry args={[0.16, 0.16, 0.18, 16]} />
        </mesh>
        <meshStandardMaterial ref={leftTurbineRef} color={0x27272a} emissive={new THREE.Color(0xff3300)} emissiveIntensity={0} />
      </group>

      <group position={[-0.85, 0.15, 0.25]} rotation={[0, Math.PI, 0]}>
        <mesh material={materials.turboCompressor}>
          <torusGeometry args={[0.18, 0.08, 12, 20, Math.PI * 1.5]} />
        </mesh>
        <mesh position={[0, 0, 0.2]} material={materials.turboTurbine}>
          <cylinderGeometry args={[0.16, 0.16, 0.18, 16]} />
        </mesh>
        <meshStandardMaterial ref={rightTurbineRef} color={0x27272a} emissive={new THREE.Color(0xff3300)} emissiveIntensity={0} />
      </group>

      {/* 6. CARBON FIBER INTAKE PLENUM */}
      <group position={[0, 0.65, 0]}>
        <mesh material={materials.intakePlenum}>
          <boxGeometry args={[0.55, 0.22, 1.4]} />
        </mesh>
        {[-0.45, -0.15, 0.15, 0.45].map((zPos, idx) => (
          <group key={`runner-${idx}`}>
            <mesh position={[0.3, -0.18, zPos]} rotation={[0, 0, -Math.PI / 6]} material={materials.intakeRunners}>
              <cylinderGeometry args={[0.05, 0.05, 0.32, 12]} />
            </mesh>
            <mesh position={[-0.3, -0.18, zPos]} rotation={[0, 0, Math.PI / 6]} material={materials.intakeRunners}>
              <cylinderGeometry args={[0.05, 0.05, 0.32, 12]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
