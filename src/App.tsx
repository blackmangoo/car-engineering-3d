import { Canvas } from '@react-three/fiber'
import { CHAPTERS } from '@/scroll/chapters'
import { ScrollRig } from '@/scroll/ScrollRig'
import { Scene } from '@/three/Scene'
import { useAppStore } from '@/state/useAppStore'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * App — the approved minimal shell
 * ─────────────────────────────────────────────────────────────────────────────
 * Three layers and nothing else:
 *
 *  1. `.canvas-layer` — the fixed full-viewport WebGL stage (z 0).
 *  2. `<ScrollRig />` — GSAP ScrollTrigger bindings; it needs the
 *     `[data-chapter]` sections below to exist in the DOM.
 *  3. `.content-layer` — the 8 scroll-track sections (z 10, pointer-transparent).
 *     ScrollTrigger binds to `[data-chapter]`; removing these freezes every
 *     chapter's progress at 0.
 *
 * No HUD lives here. The old "APEX3D" overlay JSX is preserved UNWIRED in
 * `@/ui/LegacyHud` for a later agent to mine. No `xRayMode` / `manualExplode`
 * React state exists in the live tree: animation is driven by scroll through
 * `progressBus`, never by React state — that is the core architectural rule.
 *
 * Canvas GL settings are deliberate:
 *  • `antialias: false` — AA is delegated to SMAA in the post chain; `Effects`
 *    auto-enables SMAA precisely when the canvas has MSAA off.
 *  • `dpr={[1, 2]}` — QualityGate scales within this range per tier.
 *  • `shadows` — the key light in `Lighting.tsx` and `receiveShadow` on the
 *    stage floor need a shadow-capable renderer.
 */

/** Minimal loading placeholder; styles live in global.css (`.loader*`). */
function Loader() {
  const loaded = useAppStore((s) => s.loaded)
  return (
    <div className="loader" data-ready={loaded} aria-hidden={loaded}>
      <div className="loader__bar">
        <div className="loader__fill" />
      </div>
      <div className="loader__text">{loaded ? 'Ready' : 'Initialising systems'}</div>
    </div>
  )
}

export default function App() {
  const setLoaded = useAppStore((s) => s.setLoaded)

  return (
    <>
      <Loader />

      {/* ── 1. FIXED WEBGL 3D VIEWPORT ──────────────────────────────────────── */}
      <div className="canvas-layer">
        <Canvas
          shadows
          dpr={[1, 2]}
          frameloop="always"
          gl={{
            antialias: false,
            alpha: false,
            stencil: false,
            powerPreference: 'high-performance',
          }}
          camera={{ position: [5.5, 2.2, 6.5], fov: 35, near: 0.1, far: 100 }}
          onCreated={() => setLoaded(true)}
        >
          <Scene />
        </Canvas>
      </div>

      {/* ── 2. DOM SCROLL ENGINE (GSAP ScrollTrigger → progressBus) ─────────── */}
      <ScrollRig />

      {/* ── 3. SCROLL TRACK SECTIONS (transparent DOM height for ScrollTrigger) */}
      <main className="content-layer">
        {CHAPTERS.map((chapter) => (
          <section
            key={chapter.id}
            data-chapter={chapter.id}
            className="chapter-section"
            style={{ height: `${chapter.vh}vh` }}
          />
        ))}
      </main>
    </>
  )
}
