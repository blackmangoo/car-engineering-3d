import { useState, useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { CHAPTERS } from '@/scroll/chapters'
import { useAppStore } from '@/state/useAppStore'
import { PART_DETAILS } from '@/content/partDetails'
import type { ChapterId } from '@/types'
import './legacy-hud.css'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LegacyHud — UNWIRED reference export. DO NOT MOUNT.
 * ─────────────────────────────────────────────────────────────────────────────
 * This is the "APEX3D" HUD JSX relocated VERBATIM out of the old `App.tsx`
 * (header, chapter card, part drawer, bottom dock with the EXPLODE slider) so
 * the approved minimal app shell can render without it. Nothing imports or
 * renders this component; it is preserved because it contains working
 * behaviour (chapter jump navigation, part inspector wiring, cinema mode)
 * that a later agent will mine when the real HUD is built.
 *
 * Deliberately NOT carried over into the live tree:
 *  • the `xRayMode` / `manualExplode` React state and the EXPLODE slider —
 *    animation is driven by scroll through `progressBus`, never React state;
 *  • `<FpsMonitor>` — it lived INSIDE the Canvas in the old App and cannot be
 *    relocated verbatim into a DOM component. If an FPS readout is revived it
 *    must be re-implemented as an in-canvas component publishing to a store.
 *
 * The styles it depends on (`.apex-*`, `.cinema-*`) live in
 * `./legacy-hud.css`, imported only here, so they are preserved without being
 * loaded into the main stylesheet while this component is unused.
 */

// In-canvas real-time FPS calculator (reference only — must be mounted inside
// a <Canvas> to work; kept here so the behaviour is not lost).
export function FpsMonitor({ onFpsUpdate }: { onFpsUpdate: (fps: number) => void }) {
  const frames = useRef(0)
  const prevTime = useRef(performance.now())

  useFrame(() => {
    frames.current++
    const now = performance.now()
    if (now - prevTime.current >= 500) {
      const currentFps = Math.round((frames.current * 1000) / (now - prevTime.current))
      onFpsUpdate(currentFps)
      frames.current = 0
      prevTime.current = now
    }
  })

  return null
}

export function LegacyHud() {
  const activeChapter = useAppStore((s) => s.activeChapter)
  const selectedPart = useAppStore((s) => s.selectedPart)
  const clearSelectedPart = useAppStore((s) => s.clearSelectedPart)

  // Interactive UI states
  const [xRayMode, setXRayMode] = useState<boolean>(false)
  const [manualExplode, setManualExplode] = useState<number>(0)
  const [hideUi, setHideUi] = useState<boolean>(false)
  const [minimizedCard, setMinimizedCard] = useState<boolean>(false)
  // The old App wired `setFps` to the in-canvas <FpsMonitor>; this DOM component
  // cannot host it, so the counter is frozen at its initial value until the HUD
  // is revived and re-wired to a store-published FPS value.
  const [fps] = useState<number>(60)

  // Active chapter metadata
  const currentChapter = CHAPTERS.find((c) => c.id === activeChapter) || CHAPTERS[0]

  // Selected part spec data
  const partData = selectedPart ? PART_DETAILS[selectedPart] : null

  // Jump smoothly to chapter section
  const handleJumpToChapter = useCallback((id: ChapterId) => {
    useAppStore.getState().setActiveChapter(id)
    const el = document.querySelector(`[data-chapter="${id}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  return (
    <div className="legacy-hud">
      {/* ── NON-BLOCKING TOP HEADER ─────────────────────────────────────────── */}
      <header className={`apex-header ${hideUi ? 'cinema-hidden' : ''}`}>
        {/* Brand Badge */}
        <div className="apex-brand apex-glass">
          <div className="apex-dot" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.12em', color: '#ffffff' }}>
              APEX<span style={{ color: 'var(--accent)' }}>3D</span>
            </span>
            <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.06em' }}>
              INSIDE THE MACHINE
            </span>
          </div>
        </div>

        {/* Quick Jump Navigation Pills */}
        <nav className="apex-nav apex-glass">
          {CHAPTERS.map((ch) => {
            const isActive = activeChapter === ch.id
            return (
              <button
                key={ch.id}
                type="button"
                data-active={isActive}
                onClick={() => handleJumpToChapter(ch.id)}
                className="apex-nav-btn"
                title={`Jump to ${ch.title}`}
              >
                <span>{String(ch.index).padStart(2, '0')}</span> {ch.title}
              </button>
            )
          })}
        </nav>

        {/* Telemetry Ticker & Mode Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Real-time FPS Counter */}
          <div className="apex-fps apex-glass">
            <span>FPS:</span>
            <span className="apex-fps-val">{fps}</span>
          </div>

          {/* X-Ray Cutaway Toggle */}
          <button
            type="button"
            data-active={xRayMode}
            onClick={() => setXRayMode(!xRayMode)}
            className="apex-btn"
            title="Toggle Transparent Carbon X-Ray View"
          >
            {xRayMode ? 'X-Ray: ON' : 'X-Ray: OFF'}
          </button>

          {/* Cinema Mode Toggle (Hides UI for 100% Unobstructed View) */}
          <button
            type="button"
            onClick={() => setHideUi(true)}
            className="apex-btn"
            title="Hide all UI overlays for a 100% clear view"
          >
            HIDE UI
          </button>
        </div>
      </header>

      {/* ── FLOATING SHOW UI BUTTON (Appears only when UI is hidden) ────────── */}
      {hideUi && (
        <button
          type="button"
          onClick={() => setHideUi(false)}
          className="cinema-toggle-btn apex-btn"
          style={{ background: 'var(--accent)', color: '#06070a', fontWeight: 700 }}
        >
          SHOW UI
        </button>
      )}

      {/* ── NON-BLOCKING TOP-LEFT CHAPTER HUD CARD ──────────────────────────── */}
      <div
        className={`apex-chapter-card apex-glass ${hideUi ? 'cinema-hidden' : ''}`}
        style={{
          position: 'fixed',
          top: '76px',
          left: '24px',
          zIndex: 'var(--z-hud)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              STAGE {String(currentChapter.index).padStart(2, '0')} {currentChapter.system ? `· ${currentChapter.system}` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMinimizedCard(!minimizedCard)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--fg-2)',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              padding: '2px 6px',
            }}
            title={minimizedCard ? 'Expand Card' : 'Minimize Card'}
          >
            {minimizedCard ? '[+]' : '[−]'}
          </button>
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-0)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>
          {currentChapter.title}
        </h2>

        {!minimizedCard && (
          <>
            <p style={{ fontSize: '12px', color: 'var(--fg-1)', lineHeight: 1.5, margin: 0 }}>
              {currentChapter.id === 'hero' &&
                'Complete aerodynamic carbon monocoque supercar. Ground-effect venturi channels and active downforce rear wing.'}
              {currentChapter.id === 'reveal' &&
                'Outer body panels elevate along kinematic explosion vectors, uncovering spaceframe chassis, powertrain, and cooling loops.'}
              {currentChapter.id === 'suspension' &&
                'Independent double-wishbone geometry. MagneRide adaptive damper with progressive helical coilover spring responding in 1 millisecond.'}
              {currentChapter.id === 'engine' &&
                'Mid-mounted 3.0L Twin-Turbo 120° V6. 6 reciprocating forged pistons on slider-crank kinematics, red wrinkle valve covers, and twin turbos.'}
              {currentChapter.id === 'transmission' &&
                '7-speed dual-clutch transaxle (DCT). Concentric input shafts with pre-selected helical gear clusters and active electronic limited-slip differential.'}
              {currentChapter.id === 'brakes' &&
                '410mm carbon-silicon carbide (C/SiC) cross-drilled ventilated rotor clamped by 6-piston monobloc Brembo calipers with thermal heat glow.'}
              {currentChapter.id === 'aircon' &&
                'Closed-loop 4-phase refrigeration cycle. Variable swashplate compressor circulating R-1234yf refrigerant through condenser and cabin evaporator.'}
              {currentChapter.id === 'outro' &&
                'All decoupled subassemblies converge smoothly into the road-ready vehicle.'}
            </p>
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--surface-2)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
              <span>↓ SCROLL TO DRIVE 3D MECHANISMS</span>
            </div>
          </>
        )}
      </div>

      {/* ── RIGHT FLOATING PART INSPECTION DRAWER (Hotspot click) ───────────── */}
      {partData && !hideUi && (
        <aside className="apex-part-card apex-glass">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--surface-2)' }}>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {partData.system}
            </span>
            <button
              type="button"
              onClick={clearSelectedPart}
              className="apex-btn"
              style={{ padding: '2px 8px', fontSize: '10px' }}
            >
              ✕
            </button>
          </div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-0)', marginTop: '8px', marginBottom: '10px' }}>
            {partData.name}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--surface-1)' }}>
              <span style={{ display: 'block', fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', textTransform: 'uppercase' }}>
                Specification
              </span>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                {partData.spec}
              </span>
            </div>
            <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--surface-1)' }}>
              <span style={{ display: 'block', fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', textTransform: 'uppercase' }}>
                Material
              </span>
              <span style={{ fontSize: '11px', color: 'var(--fg-1)' }}>
                {partData.material}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--fg-1)', lineHeight: 1.5, margin: '4px 0 0 0' }}>
              {partData.description}
            </p>
          </div>
        </aside>
      )}

      {/* ── COMPACT FLOATING BOTTOM CONTROL BAR (Only 40px, non-blocking) ───── */}
      <footer className={`apex-bottom-dock apex-glass ${hideUi ? 'cinema-hidden' : ''}`}>
        {/* Explode Separation Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--fg-2)' }}>
            EXPLODE:
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={manualExplode}
            onChange={(e) => setManualExplode(parseFloat(e.target.value))}
            className="apex-slider"
          />
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700, width: '32px' }}>
            {Math.round(manualExplode * 100)}%
          </span>
        </div>

        <div style={{ width: '1px', height: '14px', background: 'var(--surface-2)' }} />

        {/* X-Ray Quick Toggle */}
        <button
          type="button"
          data-active={xRayMode}
          onClick={() => setXRayMode(!xRayMode)}
          className="apex-btn"
          style={{ padding: '4px 10px', fontSize: '10px' }}
        >
          {xRayMode ? 'X-Ray ON' : 'X-Ray'}
        </button>

        <div style={{ width: '1px', height: '14px', background: 'var(--surface-2)' }} />

        {/* Current Active Chapter */}
        <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--fg-1)' }}>
          <span>CURRENT: </span>
          <span style={{ color: 'var(--accent)', fontWeight: 700, textTransform: 'capitalize' }}>
            {activeChapter}
          </span>
        </div>
      </footer>
    </div>
  )
}

export default LegacyHud
