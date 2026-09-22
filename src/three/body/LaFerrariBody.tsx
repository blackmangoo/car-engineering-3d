import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { progressBus, scrollState } from '@/state/progressBus';

interface LaFerrariBodyProps {
  xRayMode?: boolean;
  manualExplode?: number;
}

/**
 * Hyper-Realistic Ferrari LaFerrari 3D Model
 * Extracted from the user-provided package.
 * Features 85 materials, authentic Rosso Corsa clearcoat bodywork,
 * carbon-ceramic discs, Brembo calipers, Pirelli tires, and full cockpit interior.
 */
export function LaFerrariBody({ xRayMode = false, manualExplode = 0 }: LaFerrariBodyProps) {
  const { scene } = useGLTF('/models/laferrari/source/ferrari_laferrari.glb');
  const groupRef = useRef<THREE.Group>(null);

  // Clone scene so we never mutate the cached GLTF asset
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  // Index nodes by name
  const nodes = useMemo(() => {
    const map: Record<string, THREE.Object3D> = {};
    clonedScene.traverse((child) => {
      if (child.name) {
        map[child.name] = child;
      }
    });
    return map;
  }, [clonedScene]);

  // PBR Paint, Glass, Carbon & Materials Setup
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        child.castShadow = true;
        child.receiveShadow = true;

        const mat = child.material as THREE.MeshStandardMaterial;
        const name = (child.name + ' ' + (mat.name || '')).toLowerCase();

        // High-gloss Italian Rosso Corsa clearcoat paint
        if (name.includes('body')) {
          mat.color.setHex(0xd91424);
          mat.metalness = 0.65;
          mat.roughness = 0.15;
          if ('clearcoat' in mat) {
            (mat as unknown as { clearcoat: number; clearcoatRoughness: number }).clearcoat = 1.0;
            (mat as unknown as { clearcoat: number; clearcoatRoughness: number }).clearcoatRoughness = 0.04;
          }
          mat.transparent = xRayMode;
          mat.opacity = xRayMode ? 0.22 : 1.0;
          mat.needsUpdate = true;
        }

        // Aerodynamic Tinted Canopy Glass
        if (name.includes('glass')) {
          mat.transparent = true;
          mat.opacity = xRayMode ? 0.2 : 0.72;
          mat.roughness = 0.08;
          mat.metalness = 0.2;
          mat.needsUpdate = true;
        }

        // Carbon fiber components
        if (name.includes('carbon')) {
          mat.roughness = 0.45;
          mat.metalness = 0.75;
          mat.transparent = xRayMode;
          mat.opacity = xRayMode ? 0.28 : 1.0;
          mat.needsUpdate = true;
        }

        // Rims & Metallics
        if (name.includes('rim') || name.includes('chrome')) {
          mat.metalness = 0.95;
          mat.roughness = 0.15;
        }

        // Tires
        if (name.includes('tread') || name.includes('tire')) {
          mat.roughness = 0.9;
          mat.metalness = 0.05;
        }
      }
    });
  }, [clonedScene, xRayMode]);

  // Frame kinematics loop
  useFrame((_, delta) => {
    const active = scrollState.activeChapter;
    let scrollExplode = 0;

    if (active === 'hero') {
      scrollExplode = 0;
    } else if (active === 'reveal') {
      scrollExplode = Math.min(1, (progressBus['reveal']?.current ?? 0) * 1.6);
    } else if (active === 'outro') {
      scrollExplode = Math.max(0, 1 - (progressBus['outro']?.current ?? 0) * 1.5);
    } else {
      scrollExplode = 0.75;
    }

    const exp = Math.max(scrollExplode, manualExplode);

    // Explode body panels upward along Y
    const bodyNode = nodes['LaFerrari_Body_0'];
    if (bodyNode) {
      bodyNode.position.y = THREE.MathUtils.lerp(bodyNode.position.y, exp * 1.8, delta * 6);
    }

    // Engine glass hatch lifts higher
    const engineGlass = nodes['LaFerrari_Engine glass_0'];
    if (engineGlass) {
      engineGlass.position.y = THREE.MathUtils.lerp(engineGlass.position.y, exp * 2.3, delta * 6);
    }

    // Wheels decouple outward
    const t1 = nodes['tire 1'];
    const t2 = nodes['tire 2'];
    const t3 = nodes['tire 3'];
    const t4 = nodes['tire 4'];

    if (t1) t1.position.x = THREE.MathUtils.lerp(t1.position.x, 134.2 + exp * 55, delta * 6);
    if (t2) t2.position.x = THREE.MathUtils.lerp(t2.position.x, -134.5 - exp * 55, delta * 6);
    if (t3) t3.position.x = THREE.MathUtils.lerp(t3.position.x, 133.2 + exp * 55, delta * 6);
    if (t4) t4.position.x = THREE.MathUtils.lerp(t4.position.x, -133.5 - exp * 55, delta * 6);
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Yaw 180 deg to align nose with +Z */}
      <primitive object={clonedScene} rotation={[0, Math.PI, 0]} />
    </group>
  );
}

useGLTF.preload('/models/laferrari/source/ferrari_laferrari.glb');
