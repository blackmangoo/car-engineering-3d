import { useState, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FerrariMasterScene } from '@/three/FerrariMasterScene';
import { FerrariNavbar } from '@/ui/FerrariNavbar';
import { FerrariStorySections } from '@/ui/FerrariStorySections';
import { FerrariBottomBar } from '@/ui/FerrariBottomBar';
import { useFerrariStore } from '@/state/useFerrariStore';

// In-canvas viewport sync to ensure 100% full-bleed resolution across all browser resize events
function CanvasResizeBridge() {
  const { gl, camera } = useThree();
  useFrame(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w > 0 && h > 0 && (gl.domElement.width !== w || gl.domElement.height !== h)) {
      gl.setSize(w, h);
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    }
  });
  return null;
}

export default function App() {
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const setLoaded = useFerrariStore((s) => s.setLoaded);

  const handleScrollProgress = useCallback((progress: number) => {
    setScrollProgress(progress);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#070709] text-[#f2f2f2] font-sans overflow-x-hidden selection:bg-[#d91424] selection:text-white">
      {/* ── 1. FIXED WEBGL 3D VIEWPORT (Full-Bleed, Unobstructed Canvas) ─────── */}
      <div className="canvas-layer" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }}>
        <Canvas
          shadows
          dpr={1}
          style={{ width: '100vw', height: '100vh', display: 'block' }}
          gl={{
            antialias: true,
            alpha: false,
            stencil: false,
            depth: true,
            powerPreference: 'high-performance',
          }}
          camera={{ position: [4.2, 1.6, 4.4], fov: 35, near: 0.1, far: 100 }}
          onCreated={() => setLoaded(true)}
        >
          <CanvasResizeBridge />
          <FerrariMasterScene scrollProgress={scrollProgress} />
        </Canvas>
      </div>

      {/* ── 2. FERRARI LUXURY EDITORIAL TOP NAVIGATION ───────────────────────── */}
      <FerrariNavbar />

      {/* ── 3. NON-BLOCKING EDITORIAL STORYTELLING TRACKS ─────────────────────── */}
      <FerrariStorySections onScrollProgress={handleScrollProgress} />

      {/* ── 4. FLOATING BOTTOM CONTROL DOCK & QUICK COLOR SWATCHES ───────────── */}
      <FerrariBottomBar />
    </div>
  );
}
