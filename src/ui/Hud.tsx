import { useState, useCallback } from 'react';
import { CHAPTERS } from '@/scroll/chapters';
import { useAppStore } from '@/state/useAppStore';
import { PART_DETAILS } from '@/content/partDetails';
import type { ChapterId } from '@/types';
import './legacy-hud.css';

/**
 * Luxury Automotive HUD Overlay
 * Non-blocking, responsive, and minimalist:
 * - Unobstructed 3D view of the Ferrari LaFerrari
 * - Stage indicator docked top-left with minimize toggle
 * - Navigation pills for instant chapter jumping
 * - Clickable 3D hotspot inspection drawer on the right
 * - Cinema Mode toggle for 100% distraction-free full-screen 3D
 */
export function Hud() {
  const activeChapter = useAppStore((s) => s.activeChapter);
  const selectedPart = useAppStore((s) => s.selectedPart);
  const clearSelectedPart = useAppStore((s) => s.clearSelectedPart);

  const [hideUi, setHideUi] = useState<boolean>(false);
  const [minimizedCard, setMinimizedCard] = useState<boolean>(false);

  const currentChapter = CHAPTERS.find((c) => c.id === activeChapter) || CHAPTERS[0];
  const partData = selectedPart ? PART_DETAILS[selectedPart] : null;

  const handleJumpToChapter = useCallback((id: ChapterId) => {
    useAppStore.getState().setActiveChapter(id);
    const el = document.querySelector(`[data-chapter="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <>
      {/* ── 1. SLEEK TOP NAVIGATION BAR ─────────────────────────────────────── */}
      <header className={`apex-header ${hideUi ? 'cinema-hidden' : ''}`}>
        {/* Brand Badge */}
        <div className="apex-brand apex-glass">
          <div className="apex-dot" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.12em', color: '#ffffff' }}>
              AEROTECH<span style={{ color: 'var(--accent)' }}> // 3D</span>
            </span>
            <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.06em' }}>
              FERRARI LAFERRARI V12 HYBRID
            </span>
          </div>
        </div>

        {/* Chapter Navigation Pills */}
        <nav className="apex-nav apex-glass">
          {CHAPTERS.map((ch) => {
            const isActive = activeChapter === ch.id;
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
            );
          })}
        </nav>

        {/* Right Controls: Cinema Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setHideUi(true)}
            className="apex-btn"
            title="Hide all UI overlays for a 100% unobstructed 3D view"
          >
            HIDE UI
          </button>
        </div>
      </header>

      {/* ── 2. FLOATING SHOW UI BUTTON (Visible only when UI is hidden) ───────── */}
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

      {/* ── 3. TOP-LEFT CHAPTER HUD CARD (Docked cleanly out of the way) ─────── */}
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
                'Ferrari LaFerrari. Aerodynamic carbon monocoque with active downforce aerodynamics and 963 HP hybrid V12 HY-KERS powerplant.'}
              {currentChapter.id === 'reveal' &&
                'Body panels separate along kinematic vectors, revealing the structural carbon chassis, powertrain, and cooling circuits.'}
              {currentChapter.id === 'suspension' &&
                'Front double-wishbone suspension with active MagneRide magnetorheological damping and progressive coilover springs.'}
              {currentChapter.id === 'engine' &&
                'Mid-rear V-angle powerplant with reciprocating pistons on slider-crank kinematics, red wrinkle valve covers, and twin turbos.'}
              {currentChapter.id === 'transmission' &&
                '7-speed dual-clutch transaxle (DCT) with pre-selected gear clusters and active electronic limited-slip differential.'}
              {currentChapter.id === 'brakes' &&
                '410mm carbon-silicon carbide (C/SiC) cross-drilled ventilated rotor clamped by 6-piston monobloc Brembo calipers with thermal heat glow.'}
              {currentChapter.id === 'aircon' &&
                'Closed-loop 4-phase refrigeration cycle. Variable swashplate compressor circulating R-1234yf refrigerant through condenser and evaporator.'}
              {currentChapter.id === 'outro' &&
                'All decoupled subassemblies converge smoothly into the road-ready supercar.'}
            </p>
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--surface-2)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
              <span>↓ SCROLL TO ADVANCE 3D KINEMATICS</span>
            </div>
          </>
        )}
      </div>

      {/* ── 4. RIGHT PART INSPECTOR DRAWER (Opened on 3D Hotspot click) ─────── */}
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
    </>
  );
}

export default Hud;
