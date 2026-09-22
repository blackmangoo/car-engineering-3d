import { useMemo } from 'react';
import * as THREE from 'three';

interface ChassisFrameProps {
  xRayMode?: boolean;
}

/**
 * Lightweight Structural Spaceframe & Floor Undertray
 * Connects the vehicle structural nodes and provides the foundation
 * during exploded view component separation.
 */
export function ChassisFrame({ xRayMode = false }: ChassisFrameProps) {
  const materials = useMemo(() => {
    return {
      carbonFloor: new THREE.MeshStandardMaterial({
        color: 0x111317,
        roughness: 0.55,
        metalness: 0.65,
        transparent: xRayMode,
        opacity: xRayMode ? 0.35 : 1.0,
      }),
      tubularAlloy: new THREE.MeshStandardMaterial({
        color: 0x3d4450,
        metalness: 0.88,
        roughness: 0.28,
        transparent: xRayMode,
        opacity: xRayMode ? 0.45 : 1.0,
      }),
    };
  }, [xRayMode]);

  return (
    <group position={[0, 0, 0]}>
      {/* Aerodynamic Carbon Floor Undertray */}
      <mesh position={[0, 0.16, 0]} material={materials.carbonFloor} receiveShadow>
        <boxGeometry args={[1.5, 0.03, 4.3]} />
      </mesh>

      {/* Front Suspension Subframe Structure */}
      <mesh position={[0, 0.32, 1.35]} material={materials.tubularAlloy}>
        <boxGeometry args={[1.05, 0.12, 0.42]} />
      </mesh>

      {/* Rear Powertrain Cradle Subframe */}
      <mesh position={[0, 0.38, -1.1]} material={materials.tubularAlloy}>
        <boxGeometry args={[1.1, 0.18, 0.7]} />
      </mesh>

      {/* Cockpit Spaceframe Internal Tubes */}
      <mesh position={[-0.52, 0.62, -0.05]} material={materials.tubularAlloy}>
        <boxGeometry args={[0.035, 0.58, 1.5]} />
      </mesh>
      <mesh position={[0.52, 0.62, -0.05]} material={materials.tubularAlloy}>
        <boxGeometry args={[0.035, 0.58, 1.5]} />
      </mesh>
    </group>
  );
}
