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
 * - Crystal-clear optical headlights with Xenon Ice-White LED projectors (Zero red tint)
 * - Deep Ferrari ruby-red circular taillights and brake lights (Zero white tint)
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

    return { scale, center, box, size };
  }, [scene]);

  // Apply authentic PBR materials with exact node-level matching
  useEffect(() => {
    bodyMeshesRef.current = [];

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        child.castShadow = true;
        child.receiveShadow = true;

        const rawName = (child.name + ' ' + (child.material.name || '')).toLowerCase();

        // 1. CAR BODYWORK (Rosso Corsa Paint)
        if (
          rawName.includes('body') &&
          !rawName.includes('glass') &&
          !rawName.includes('light')
        ) {
          bodyMeshesRef.current.push(child);
          child.material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(paint.hex),
            metalness: paint.metalness,
            roughness: paint.roughness,
            clearcoat: 1.0,
            clearcoatRoughness: 0.03,
            reflectivity: 0.95,
            envMapIntensity: 1.4,
          });
          return;
        }

        // 2. REAR TAILLIGHTS (Circular Taillights, Brake Lights, Reflector Cups)
        // Nodes in GLB: 8, 14, 15, 23, 31, 33, 40, 42
        // Completely strip all white tint from the back lights
        const isRearLight = [
          'break lights',
          'breake lights',
          'breake chrome',
          'rear headlights',
          'tail lights',
          'front headlights.001', // Node 40 in GLB is the rear circular taillight!
          'chrome0'
        ].some((w) => rawName.includes(w));

        if (isRearLight) {
          if (rawName.includes('glasses') || rawName.includes('glass')) {
            // Smoked dark ruby-red polycarbonate outer lens (Zero white)
            child.material = new THREE.MeshPhysicalMaterial({
              color: 0x770005,
              transparent: true,
              opacity: 0.85,
              roughness: 0.04,
              metalness: 0.2,
              emissive: new THREE.Color(0x440000),
              emissiveIntensity: 0.4,
            });
          } else if (rawName.includes('chrom')) {
            // Dark smoked graphite reflector housing inside the circular taillights (Zero white)
            child.material = new THREE.MeshStandardMaterial({
              color: 0x0a0a0e,
              metalness: 0.95,
              roughness: 0.25,
            });
          } else {
            // Deep ruby-red round Ferrari rear circular taillights (Zero white tint)
            child.material = new THREE.MeshStandardMaterial({
              color: 0xd91424,
              metalness: 0.85,
              roughness: 0.2,
              emissive: new THREE.Color(0xff0011),
              emissiveIntensity: 2.2,
            });
          }
          return;
        }

        // 3. FRONT HEADLIGHTS (Lenses, DRL strips, Projectors)
        // Nodes in GLB: 19, 32, 20
        // Completely strip all red tint and apply crystal-clear lenses with Xenon White LED projectors
        const isFrontLight = [
          'head lights glasses',
          'run lights',
          'red light'
        ].some((w) => rawName.includes(w));

        if (isFrontLight) {
          if (rawName.includes('glasses') || rawName.includes('glass')) {
            // Optical crystal-clear polycarbonate front lens (Zero red tint, high transmission)
            child.material = new THREE.MeshPhysicalMaterial({
              color: 0xffffff,
              transparent: true,
              opacity: 0.14,
              roughness: 0.01,
              metalness: 0.1,
              transmission: 0.96,
              ior: 1.5,
              clearcoat: 1.0,
              clearcoatRoughness: 0.02,
              reflectivity: 0.9,
            });
          } else {
            // Xenon Ice-White LED DRL Projectors & Light Strips (Zero red)
            child.material = new THREE.MeshStandardMaterial({
              color: 0xf8fafc,
              metalness: 0.95,
              roughness: 0.08,
              emissive: new THREE.Color(0xffffff),
              emissiveIntensity: 1.8,
            });
          }
          return;
        }

        // 4. WIREFRAME INTERNAL HOUSING MESHES (Zero red, clean dark metal)
        if (rawName.includes('wireframe') || rawName.includes('0xe05656') || rawName.includes('0x860606') || rawName.includes('0xe5a6d7')) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x12141a,
            metalness: 0.85,
            roughness: 0.3,
          });
          return;
        }

        // 5. CANOPY & ENGINE HATCH GLASS
        if (rawName.includes('glass')) {
          child.material = new THREE.MeshPhysicalMaterial({
            color: 0x111c26,
            metalness: 0.2,
            roughness: 0.06,
            transparent: true,
            opacity: 0.72,
            reflectivity: 0.9,
            envMapIntensity: 1.6,
          });
          return;
        }

        // 6. CARBON FIBER COMPOSITES
        if (rawName.includes('carbon')) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x14161a,
            roughness: 0.45,
            metalness: 0.75,
            envMapIntensity: 0.8,
          });
          return;
        }

        // 7. RIMS & CHROME METALLICS
        if (rawName.includes('rim') || rawName.includes('chrome')) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            metalness: 0.95,
            roughness: 0.14,
            envMapIntensity: 1.3,
          });
          return;
        }

        // 8. TIRES
        if (rawName.includes('tread') || rawName.includes('tire')) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x16171b,
            roughness: 0.92,
            metalness: 0.04,
          });
          return;
        }
      }
    });
  }, [scene, paint]);

  // Dynamic paint color updates when user picks a color in the Atelier
  useEffect(() => {
    bodyMeshesRef.current.forEach((mesh) => {
      if (mesh.material && mesh.material instanceof THREE.MeshPhysicalMaterial) {
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
      return;
    }

    // Target rotation based on chapter & scroll progression
    // 0.0 = Front 3/4 beauty view (Classic Ferrari stance showcasing front nose & clear headlights)
    const targetRotationY = 2.79 + scrollProgress * Math.PI * 2.5;

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
    <group ref={carGroupRef} position={[0.55, 0, 0]}>
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
