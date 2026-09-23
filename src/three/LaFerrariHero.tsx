import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useFerrariStore } from '@/state/useFerrariStore';

interface LaFerrariHeroProps {
  scrollProgress: number;
}

/**
 * Authentic Ferrari LaFerrari 3D Vehicle Component
 * Loaded from the official 26MB GLB model package.
 * Features:
 * - Real-time PBR Rosso Corsa / Atelier clearcoat automotive paint
 * - Dynamic scroll-driven 3D revolution showing all aerodynamic angles
 * - Active paint color switching in real time
 * - Authentic carbon splitters, Brembo calipers, Pirelli tires, and F1 cockpit
 */
export function LaFerrariHero({ scrollProgress }: LaFerrariHeroProps) {
  const { scene } = useGLTF('/models/laferrari/source/ferrari_laferrari.glb');
  const carGroupRef = useRef<THREE.Group>(null);
  const bodyMeshesRef = useRef<THREE.Mesh[]>([]);

  const paint = useFerrariStore((s) => s.paint);
  const orbitMode = useFerrariStore((s) => s.orbitMode);
  const activeChapter = useFerrariStore((s) => s.activeChapter);

  // Compute normalization and center on ground with guaranteed world matrix update
  const transform = useMemo(() => {
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Standard supercar scale ~ 4.70 meters length
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 4.70 / maxDim : 1;

    console.log('[LaFerrari] Measured box:', box.min, box.max, 'Scale:', scale);

    return { scale, center, box, size };
  }, [scene]);

  // Apply authentic PBR materials
  useEffect(() => {
    bodyMeshesRef.current = [];

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        child.castShadow = true;
        child.receiveShadow = true;

        const mat = child.material as THREE.MeshStandardMaterial;
        const name = (child.name + ' ' + (mat.name || '')).toLowerCase();

        // High-gloss Clearcoat Ferrari Paint
        if (name.includes('body')) {
          bodyMeshesRef.current.push(child);
          mat.color.setStyle(paint.hex);
          mat.metalness = paint.metalness;
          mat.roughness = paint.roughness;
          mat.envMapIntensity = 1.4;

          if ('clearcoat' in mat) {
            (mat as unknown as { clearcoat: number; clearcoatRoughness: number }).clearcoat = 1.0;
            (mat as unknown as { clearcoat: number; clearcoatRoughness: number }).clearcoatRoughness = 0.03;
          }
          mat.needsUpdate = true;
        }

        // Front Headlights: Crystal-clear outer lens + Xenon White LED projectors (Zero red tint)
        if (
          name.includes('head_light') ||
          name.includes('headlight') ||
          name.includes('front headlight') ||
          name.includes('head lights glasses') ||
          name.includes('red_light') ||
          name.includes('run_lights')
        ) {
          if (name.includes('glasses') || name.includes('glass')) {
            // Crystal-clear optical headlight lens
            mat.color.setHex(0xffffff);
            mat.transparent = true;
            mat.opacity = 0.35;
            mat.roughness = 0.02;
            mat.metalness = 0.1;
            mat.envMapIntensity = 1.5;
          } else {
            // Xenon White LED projector bulbs & DRL light strip
            mat.color.setHex(0xf8fafc);
            mat.metalness = 0.9;
            mat.roughness = 0.1;
            mat.emissive.setHex(0xe2e8f0);
            mat.emissiveIntensity = 0.6;
          }
          mat.needsUpdate = true;
        } else if (name.includes('glass')) {
          // Tinted Canopy Glass & Engine Hatch
          mat.transparent = true;
          mat.opacity = 0.72;
          mat.roughness = 0.06;
          mat.metalness = 0.25;
          mat.envMapIntensity = 1.6;
          mat.needsUpdate = true;
        }

        // Carbon fiber composite elements
        if (name.includes('carbon')) {
          mat.roughness = 0.45;
          mat.metalness = 0.75;
          mat.envMapIntensity = 0.8;
          mat.needsUpdate = true;
        }

        // Forged Rims & Brightwork
        if (name.includes('rim') || name.includes('chrome')) {
          mat.metalness = 0.95;
          mat.roughness = 0.15;
          mat.envMapIntensity = 1.3;
          mat.needsUpdate = true;
        }

        // Tires
        if (name.includes('tread') || name.includes('tire')) {
          mat.roughness = 0.92;
          mat.metalness = 0.04;
          mat.needsUpdate = true;
        }
      }
    });
  }, [scene, paint]);

  // Dynamic paint color updates when user picks a color in the Atelier
  useEffect(() => {
    bodyMeshesRef.current.forEach((mesh) => {
      if (mesh.material && mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.color.setStyle(paint.hex);
        mesh.material.metalness = paint.metalness;
        mesh.material.roughness = paint.roughness;
        mesh.material.needsUpdate = true;
      }
    });
  }, [paint]);

  // Smooth 3D revolution driven by scroll progress
  useFrame(({ clock }, delta) => {
    if (!carGroupRef.current) return;

    if (orbitMode || activeChapter === 'atelier') {
      // In atelier / orbit mode, let user orbit freely; maintain subtle gentle breathing rotation
      return;
    }

    // Target rotation based on chapter & scroll progression
    // 0.0 = Front 3/4 beauty view
    // 0.2 = Side aerodynamic profile
    // 0.4 = Rear 3/4 looking at active diffuser & spoiler
    // 0.6 = Elevated angle looking at V12 engine hatch
    // 0.8 = Full 360-degree orbit
    const targetRotationY = Math.PI + scrollProgress * Math.PI * 2.5;

    // Smooth lerp damping to ensure buttery 60 FPS transitions
    carGroupRef.current.rotation.y = THREE.MathUtils.lerp(
      carGroupRef.current.rotation.y,
      targetRotationY,
      delta * 4.5
    );

    // Subtle breathing float on Y
    const t = clock.getElapsedTime();
    carGroupRef.current.position.y = Math.sin(t * 1.5) * 0.015;
  });

  return (
    <group ref={carGroupRef} position={[0, 0, 0]}>
      <primitive
        object={scene}
        scale={[transform.scale, transform.scale, transform.scale]}
        position={[
          -transform.center.x * transform.scale,
          -transform.box.min.y * transform.scale,
          -transform.center.z * transform.scale,
        ]}
      />
    </group>
  );
}

useGLTF.preload('/models/laferrari/source/ferrari_laferrari.glb');
