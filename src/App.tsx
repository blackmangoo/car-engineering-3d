import { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { FerrariMasterScene } from '@/three/FerrariMasterScene';
import { FerrariNavbar } from '@/ui/FerrariNavbar';
import { FerrariStorySections } from '@/ui/FerrariStorySections';
import { FerrariBottomBar } from '@/ui/FerrariBottomBar';
import { useFerrariStore } from '@/state/useFerrariStore';

export default function App() {
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const setLoaded = useFerrariStore((s) => s.setLoaded);

  const handleScrollProgress = useCallback((progress: number) => {
    setScrollProgress(progress);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#070709] text-[#f2f2f2] font-sans overflow-x-hidden selection:bg-[#d91424] selection:text-white">
      {/* ── 1. FIXED WEBGL 3D VIEWPORT (Full-Bleed, Unobstructed Canvas) ─────── */}
      <div className="canvas-layer">
        <Canvas
          shadows
          dpr={1}
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
