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
 * - Crystal-clear optical headlights with Xenon Ice-White LED projectors (Zero red tint)
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

  // Apply authentic PBR materials with normalized token matching
  useEffect(() => {
    bodyMeshesRef.current = [];

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        child.castShadow = true;
        child.receiveShadow = true;

        const rawName = (child.name + ' ' + (child.material.name || '')).toLowerCase();
        const n = rawName.replace(/[^a-z0-9]/g, '');

        // 1. CAR BODYWORK (Rosso Corsa Paint)
        if (n.includes('laferraribody') || (n.includes('body') && !n.includes('glass') && !n.includes('light'))) {
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

        // 1. FRONT HEADLIGHTS (Front Lenses, DRL strips, Projectors)
        const isFrontHeadlight =
          n.includes('headlightsglasses') ||
          n.includes('head_lights_glasses') ||
          n.includes('run_lights') ||
          n.includes('runlight') ||
          n.includes('red_light') ||
          n.includes('redlight');

        // 2. REAR TAILLIGHTS (Circular Taillights, Brake Lights, Reflector Cups)
        // Completely strip all white tint from the circular back lights
        const isRearTaillight =
          n.includes('tail_light') ||
          n.includes('taillight') ||
          n.includes('break_light') ||
          n.includes('breaklight') ||
          n.includes('breake_light') ||
          n.includes('brakelight') ||
          n.includes('rear_headlight') ||
          n.includes('rearheadlight') ||
          n.includes('front_headlight') || // Node 40 in GLB is the rear circular taillight
          n.includes('frontheadlight') ||
          n.includes('chrome0') ||
          n.includes('breake_chrome');

        if (isRearTaillight) {
          if (n.includes('glass') || n.includes('glasses')) {
            // Smoked dark ruby-red polycarbonate outer lens (Zero white)
            child.material = new THREE.MeshPhysicalMaterial({
              color: 0x770005,
              transparent: true,
              opacity: 0.85,
              roughness: 0.04,
              metalness: 0.2,
              emissive: new THREE.Color(0x550000),
              emissiveIntensity: 0.4,
            });
          } else if (n.includes('chrom')) {
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

        if (isFrontHeadlight) {
          if (n.includes('glass') || n.includes('glasses')) {
            // Optical crystal-clear polycarbonate front lens (Zero red tint, high transmission)
            child.material = new THREE.MeshPhysicalMaterial({
              color: 0xffffff,
              transparent: true,
              opacity: 0.15,
              roughness: 0.02,
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

        // 3. WIREFRAME INTERNAL HOUSING MESHES (Zero red)
        if (n.includes('wireframe') || n.includes('e05656') || n.includes('860606') || n.includes('e5a6d7')) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x12141a,
            metalness: 0.85,
            roughness: 0.3,
          });
          return;
        }

        // 4. CANOPY & ENGINE HATCH GLASS
        if (n.includes('glass')) {
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

        // 5. CARBON FIBER COMPOSITES
        if (n.includes('carbon')) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x14161a,
            roughness: 0.45,
            metalness: 0.75,
            envMapIntensity: 0.8,
          });
          return;
        }

        // 6. RIMS & CHROME METALLICS
        if (n.includes('rim') || n.includes('chrome')) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            metalness: 0.95,
            roughness: 0.14,
            envMapIntensity: 1.3,
          });
          return;
        }

        // 7. TIRES
        if (n.includes('tread') || n.includes('tire')) {
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
    // 0.0 = Front 3/4 beauty view (Front nose, Ferrari badge, and headlights facing the viewer)
    const targetRotationY = 2.35 + scrollProgress * Math.PI * 2.5;

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
    <group ref={carGroupRef} position={[0.9, 0, 0]}>
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
