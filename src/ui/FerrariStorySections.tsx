import { useEffect, useRef } from 'react';
import { useFerrariStore, FerrariChapter } from '@/state/useFerrariStore';
import { LAFERRARI_SECTIONS } from '@/content/ferrariData';
import { FerrariSpecsSheet } from './FerrariSpecsSheet';
import { FerrariAtelierView } from './FerrariAtelierView';

interface FerrariStorySectionsProps {
  onScrollProgress: (progress: number) => void;
}

export function FerrariStorySections({ onScrollProgress }: FerrariStorySectionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cinemaMode = useFerrariStore((s) => s.cinemaMode);

  // Monitor scroll progression and mirror active chapter
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          const progress = Math.max(0, Math.min(1, scrollY / (maxScroll || 1)));
          onScrollProgress(progress);

          // Update active chapter based on section positions
          const sections: FerrariChapter[] = [
            'hero',
            'aerodynamics',
            'powertrain',
            'chassis',
            'cockpit',
            'specs',
            'atelier',
          ];

          let current: FerrariChapter = 'hero';
          sections.forEach((id) => {
            const el = document.getElementById(`section-${id}`);
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.top <= window.innerHeight * 0.5 && rect.bottom >= window.innerHeight * 0.2) {
                current = id;
              }
            }
          });

          useFerrariStore.getState().setActiveChapter(current);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [onScrollProgress]);

  return (
    <div
      ref={containerRef}
      className={`relative z-10 pointer-events-none transition-opacity duration-500 ${
        cinemaMode ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* ── 01. HERO SECTION (Left Docked, Editorial Open Layout) ───────────── */}
      <section
        id="section-hero"
        className="min-h-screen flex items-center px-6 md:px-16 lg:px-24 py-28 pointer-events-none"
      >
        <div className="w-full max-w-md pointer-events-auto">
          {/* Subtle Stage Kicker */}
          <div className="flex items-center space-x-2 text-[10px] font-mono tracking-[0.28em] text-[#d91424] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d91424] shadow-sm shadow-[#d91424]" />
            <span>STAGE 01 // OVERVIEW</span>
          </div>

          {/* Monumental Italian Serif Headline */}
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-white font-light tracking-tight mt-2 leading-[1.05]">
            L'ESSENZA DI <span className="italic font-normal">MARANELLO</span>
          </h1>

          <p className="font-sans text-[11px] tracking-[0.22em] text-[#ffd200] uppercase font-semibold mt-1">
            {LAFERRARI_SECTIONS.hero.tagline}
          </p>

          {/* Poetic Quote */}
          <div className="border-l border-[#d91424] pl-4 my-6 text-xs text-gray-300 font-serif italic leading-relaxed">
            {LAFERRARI_SECTIONS.hero.quote}
          </div>

          <div className="space-y-3 text-xs text-gray-400 font-sans leading-relaxed">
            {LAFERRARI_SECTIONS.hero.paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          {/* Refined Hairline Telemetry Grid (No chunky black boxes) */}
          <div className="grid grid-cols-2 gap-y-4 gap-x-8 mt-8 pt-6 border-t border-white/10 font-sans">
            {LAFERRARI_SECTIONS.hero.metrics.map((m, idx) => (
              <div key={idx} className="border-l border-white/15 pl-3">
                <span className="text-[9px] font-mono tracking-[0.2em] text-gray-500 uppercase block">
                  {m.label}
                </span>
                <span className="text-xl sm:text-2xl font-serif text-white font-light mt-0.5 block">
                  {m.value}{' '}
                  <span className="text-xs font-mono text-[#d91424]">{m.unit}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center space-x-2 text-[10px] font-mono tracking-[0.16em] text-gray-500">
            <span className="animate-bounce text-[#d91424]">↓</span>
            <span>SCROLL TO REVOLVE IN 3D</span>
          </div>
        </div>
      </section>

      {/* ── 02. AERODYNAMICS (Right Docked, Clean Typography) ────────────────── */}
      <section
        id="section-aerodynamics"
        className="min-h-screen flex items-center justify-end px-6 md:px-16 lg:px-24 py-28 pointer-events-none"
      >
        <div className="w-full max-w-md pointer-events-auto">
          <div className="flex items-center space-x-2 text-[10px] font-mono tracking-[0.28em] text-[#d91424] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d91424]" />
            <span>STAGE 02 // DYNAMICS</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white font-light tracking-tight mt-2 leading-[1.05]">
            AERODINAMICA <span className="italic font-normal">ATTIVA</span>
          </h2>

          <p className="font-sans text-[11px] tracking-[0.22em] text-[#ffd200] uppercase font-semibold mt-1">
            {LAFERRARI_SECTIONS.aerodynamics.tagline}
          </p>

          <div className="space-y-3 text-xs text-gray-400 font-sans leading-relaxed mt-5">
            {LAFERRARI_SECTIONS.aerodynamics.paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          {/* Technical Highlights with Hairline Dividers */}
          <div className="mt-6 space-y-3 pt-5 border-t border-white/10">
            {LAFERRARI_SECTIONS.aerodynamics.technicalHighlights.map((th, idx) => (
              <div key={idx} className="border-l border-white/15 pl-3 text-xs">
                <div className="font-serif text-white text-sm font-semibold tracking-wide">{th.label}</div>
                <div className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{th.desc}</div>
              </div>
            ))}
          </div>

          {/* Downforce Metrics */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 mt-6 pt-5 border-t border-white/10">
            {LAFERRARI_SECTIONS.aerodynamics.metrics.slice(0, 2).map((m, idx) => (
              <div key={idx} className="border-l border-white/15 pl-3">
                <span className="text-[9px] font-mono tracking-[0.2em] text-gray-500 uppercase block">
                  {m.label}
                </span>
                <span className="text-xl sm:text-2xl font-serif text-white font-light mt-0.5 block">
                  {m.value} <span className="text-xs font-mono text-[#d91424]">{m.unit}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 03. POWERTRAIN HY-KERS V12 (Left Docked) ────────────────────────── */}
      <section
        id="section-powertrain"
        className="min-h-screen flex items-center px-6 md:px-16 lg:px-24 py-28 pointer-events-none"
      >
        <div className="w-full max-w-md pointer-events-auto">
          <div className="flex items-center space-x-2 text-[10px] font-mono tracking-[0.28em] text-[#d91424] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d91424]" />
            <span>STAGE 03 // POWERTRAIN</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white font-light tracking-tight mt-2 leading-[1.05]">
            PROPULSORE <span className="italic font-normal">HY-KERS</span>
          </h2>

          <p className="font-sans text-[11px] tracking-[0.22em] text-[#ffd200] uppercase font-semibold mt-1">
            {LAFERRARI_SECTIONS.powertrain.tagline}
          </p>

          <div className="border-l border-[#ffd200] pl-4 my-6 text-xs text-gray-300 font-serif italic leading-relaxed">
            {LAFERRARI_SECTIONS.powertrain.quote}
          </div>

          <div className="space-y-3 text-xs text-gray-400 font-sans leading-relaxed">
            {LAFERRARI_SECTIONS.powertrain.paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          {/* V12 Metrics */}
          <div className="grid grid-cols-2 gap-y-4 gap-x-8 mt-8 pt-6 border-t border-white/10 font-sans">
            {LAFERRARI_SECTIONS.powertrain.metrics.map((m, idx) => (
              <div key={idx} className="border-l border-white/15 pl-3">
                <span className="text-[9px] font-mono tracking-[0.2em] text-gray-500 uppercase block">
                  {m.label}
                </span>
                <span className="text-xl sm:text-2xl font-serif text-white font-light mt-0.5 block">
                  {m.value}{' '}
                  <span className="text-xs font-mono text-[#ffd200] font-normal">{m.unit}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 04. CARBON MONOCOQUE CHASSIS (Right Docked) ─────────────────────── */}
      <section
        id="section-chassis"
        className="min-h-screen flex items-center justify-end px-6 md:px-16 lg:px-24 py-28 pointer-events-none"
      >
        <div className="w-full max-w-md pointer-events-auto">
          <div className="flex items-center space-x-2 text-[10px] font-mono tracking-[0.28em] text-[#d91424] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d91424]" />
            <span>STAGE 04 // TELAIO</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white font-light tracking-tight mt-2 leading-[1.05]">
            TELAIO IN <span className="italic font-normal">CARBONIO</span>
          </h2>

          <p className="font-sans text-[11px] tracking-[0.22em] text-[#ffd200] uppercase font-semibold mt-1">
            {LAFERRARI_SECTIONS.chassis.tagline}
          </p>

          <div className="space-y-3 text-xs text-gray-400 font-sans leading-relaxed mt-5">
            {LAFERRARI_SECTIONS.chassis.paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4 mt-8 pt-6 border-t border-white/10">
            {LAFERRARI_SECTIONS.chassis.metrics.map((m, idx) => (
              <div key={idx} className="border-l border-white/15 pl-3">
                <span className="text-[9px] font-mono tracking-[0.2em] text-gray-500 uppercase block">
                  {m.label}
                </span>
                <span className="text-xl sm:text-2xl font-serif text-white font-light mt-0.5 block">
                  {m.value} <span className="text-xs font-mono text-[#d91424]">{m.unit}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 05. COCKPIT & F1 ERGONOMICS (Left Docked) ───────────────────────── */}
      <section
        id="section-cockpit"
        className="min-h-screen flex items-center px-6 md:px-16 lg:px-24 py-28 pointer-events-none"
      >
        <div className="w-full max-w-md pointer-events-auto">
          <div className="flex items-center space-x-2 text-[10px] font-mono tracking-[0.28em] text-[#d91424] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d91424]" />
            <span>STAGE 05 // COCKPIT</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white font-light tracking-tight mt-2 leading-[1.05]">
            ABITACOLO & <span className="italic font-normal">ERGONOMIA</span>
          </h2>

          <p className="font-sans text-[11px] tracking-[0.22em] text-[#ffd200] uppercase font-semibold mt-1">
            {LAFERRARI_SECTIONS.cockpit.tagline}
          </p>

          <div className="border-l border-[#d91424] pl-4 my-6 text-xs text-gray-300 font-serif italic leading-relaxed">
            {LAFERRARI_SECTIONS.cockpit.quote}
          </div>

          <div className="space-y-3 text-xs text-gray-400 font-sans leading-relaxed">
            {LAFERRARI_SECTIONS.cockpit.paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          <div className="mt-6 space-y-3 pt-5 border-t border-white/10">
            {LAFERRARI_SECTIONS.cockpit.technicalHighlights.map((th, idx) => (
              <div key={idx} className="border-l border-white/15 pl-3 text-xs">
                <div className="font-serif text-white text-sm font-semibold tracking-wide">{th.label}</div>
                <div className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{th.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 06. SPECIFICATIONS DATA MATRIX (Full-width clean table) ──────────── */}
      <section
        id="section-specs"
        className="min-h-screen flex items-center justify-center px-4 md:px-12 py-28 pointer-events-none"
      >
        <div className="w-full max-w-4xl pointer-events-auto">
          <FerrariSpecsSheet />
        </div>
      </section>

      {/* ── 07. ATELIER CONFIGURATOR STUDIO (Interactive Paint & Orbit) ─────── */}
      <section
        id="section-atelier"
        className="min-h-screen flex items-end justify-center px-4 md:px-12 pb-16 pointer-events-none"
      >
        <div className="w-full max-w-4xl pointer-events-auto">
          <FerrariAtelierView />
        </div>
      </section>
    </div>
  );
}
