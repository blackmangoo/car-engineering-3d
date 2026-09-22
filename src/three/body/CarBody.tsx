import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { progressBus, scrollState } from '@/state/progressBus';

// Configure local Draco decoder
useGLTF.setDecoderPath('/draco/');

interface CarBodyProps {
  xRayMode?: boolean;
  manualExplode?: number;
}

/**
 * Photorealistic Supercar Body & Wheels (Ferrari 458 Italia)
 * Built with PBR automotive paint, carbon aerodynamic aero, tinted canopy glass,
 * and smooth scroll-driven exploded kinematics driven by progressBus.
 */
// Immutable baseline transforms measured directly from ferrari.glb
const REST_BODY_Y = 0.0;
const REST_GLASS_Y = 0.0;

export function CarBody({ xRayMode = false, manualExplode = 0 }: CarBodyProps) {
  const { scene } = useGLTF('/models/ferrari.glb', '/draco/');
  const carGroupRef = useRef<THREE.Group>(null);

  // Clone scene so we never mutate the cached GLTF asset
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  // Index nodes by name for fast frame updates without traversing
  const nodes = useMemo(() => {
    const map: Record<string, THREE.Object3D> = {};
    clonedScene.traverse((child) => {
      if (child.name) {
        map[child.name] = child;
      }
    });
    return map;
  }, [clonedScene]);

  // Automotive Paint & Materials
  const materials = useMemo(() => {
    return {
      // Iconic Rosso Corsa Multi-layer Clearcoat Car Paint
      carPaint: new THREE.MeshPhysicalMaterial({
        color: 0xd91424,
        metalness: 0.7,
        roughness: 0.18,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        reflectivity: 0.95,
        transparent: false,
        opacity: 1.0,
      }),
      // Carbon Fiber Aerodynamic Aero Parts
      carbon: new THREE.MeshStandardMaterial({
        color: 0x181a1f,
        roughness: 0.45,
        metalness: 0.75,
        transparent: false,
        opacity: 1.0,
      }),
      // Tinted Canopy Glass
      glass: new THREE.MeshPhysicalMaterial({
        color: 0x111c26,
        metalness: 0.2,
        roughness: 0.08,
        reflectivity: 0.9,
        transparent: true,
        opacity: 0.75,
      }),
      // Forged Alloy Wheel Rims
      rims: new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.95,
        roughness: 0.14,
      }),
      // Low-profile Tire Rubber
      rubber: new THREE.MeshStandardMaterial({
        color: 0x17181c,
        roughness: 0.88,
        metalness: 0.05,
      }),
      // Headlights LED
      headlights: new THREE.MeshBasicMaterial({
        color: 0xe0f7fa,
      }),
      // Taillights LED
      taillights: new THREE.MeshBasicMaterial({
        color: 0xff1744,
      }),
    };
  }, []);

  // Update material transparency directly when xRayMode changes
  useEffect(() => {
    materials.carPaint.transparent = xRayMode;
    materials.carPaint.opacity = xRayMode ? 0.22 : 1.0;
    materials.carPaint.needsUpdate = true;

    materials.carbon.transparent = xRayMode;
    materials.carbon.opacity = xRayMode ? 0.28 : 1.0;
    materials.carbon.needsUpdate = true;

    materials.glass.opacity = xRayMode ? 0.2 : 0.75;
    materials.glass.needsUpdate = true;
  }, [xRayMode, materials]);

  // Apply custom paint and glass while preserving factory interior, wheels, and lights
  useEffect(() => {
    const bodyMesh = clonedScene.getObjectByName('body') as THREE.Mesh | undefined;
    if (bodyMesh) bodyMesh.material = materials.carPaint;

    const glassMesh = clonedScene.getObjectByName('glass') as THREE.Mesh | undefined;
    if (glassMesh) glassMesh.material = materials.glass;

    ['rim_fl', 'rim_fr', 'rim_rl', 'rim_rr'].forEach((rimName) => {
      const rimMesh = clonedScene.getObjectByName(rimName) as THREE.Mesh | undefined;
      if (rimMesh) rimMesh.material = materials.rims;
    });

    // Darken interior floor pan and wheel arch liners
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial;
        const name = (child.name + ' ' + (mat.name || '')).toLowerCase();
        if (name.includes('carpet')) {
          mat.color.setHex(0x181a22);
          mat.roughness = 0.92;
        }
      }
    });
  }, [clonedScene, materials]);

  // Smooth frame loop driven directly by progressBus (zero React state overhead)
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
      // Subsystem chapters: panels stay lifted so internal mechanisms are visible
      scrollExplode = 0.75;
    }

    const exp = Math.max(scrollExplode, manualExplode);

    // Only lift body panels and glass during exploded view
    const bodyNode = nodes['body'];
    if (bodyNode) {
      const targetY = REST_BODY_Y + exp * 1.6;
      bodyNode.position.y = THREE.MathUtils.lerp(bodyNode.position.y, targetY, delta * 6);
    }

    const glassNode = nodes['glass'];
    if (glassNode) {
      const targetY = REST_GLASS_Y + exp * 2.0;
      glassNode.position.y = THREE.MathUtils.lerp(glassNode.position.y, targetY, delta * 6);
    }

    const carbonNode = nodes['carbon fibre'] || nodes['carbon_fibre_trim'];
    if (carbonNode) {
      carbonNode.position.y = THREE.MathUtils.lerp(carbonNode.position.y, exp * 1.0, delta * 6);
    }
  });

  return (
    <group ref={carGroupRef} position={[0, 0, 0]}>
      {/* Ferrari model rotated to align with +Z nose coordinate system */}
      <primitive object={clonedScene} rotation={[0, Math.PI, 0]} scale={[0.92, 0.92, 0.92]} />
    </group>
  );
}

useGLTF.preload('/models/ferrari.glb', '/draco/');
