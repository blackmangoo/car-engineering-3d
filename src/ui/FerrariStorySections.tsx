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
      {/* ── 01. HERO SECTION (Left Docked, Car completely visible) ──────────── */}
      <section
        id="section-hero"
        className="min-h-screen flex items-center px-6 md:px-16 lg:px-24 py-28 pointer-events-none"
      >
        <div className="w-full max-w-md pointer-events-auto bg-[#070709]/75 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl">
          <div className="flex items-center space-x-2 text-[10px] font-sans font-bold tracking-[0.2em] text-[#d91424] uppercase">
            <span className="w-2 h-2 rounded-full bg-[#d91424] shadow-sm shadow-[#d91424]" />
            <span>STAGE 01 // OVERVIEW</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white font-bold tracking-tight leading-tight mt-3">
            {LAFERRARI_SECTIONS.hero.title}
          </h1>

          <p className="font-sans text-xs tracking-[0.18em] text-[#ffd200] uppercase font-semibold mt-1">
            {LAFERRARI_SECTIONS.hero.tagline}
          </p>

          <p className="font-serif italic text-xs text-[#d1d5db] border-l-2 border-[#d91424] pl-3 my-4 leading-relaxed">
            {LAFERRARI_SECTIONS.hero.quote}
          </p>

          <div className="space-y-2.5 text-xs text-[#9ca3af] leading-relaxed font-sans">
            {LAFERRARI_SECTIONS.hero.paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-white/10 font-sans">
            {LAFERRARI_SECTIONS.hero.metrics.map((m, idx) => (
              <div key={idx} className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] tracking-wider text-[#9ca3af] uppercase block">
                  {m.label}
                </span>
                <span className="text-xl font-bold font-mono text-white mt-0.5 block">
                  {m.value}{' '}
                  <span className="text-xs text-[#d91424] font-normal">{m.unit}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center space-x-2 text-[10px] font-mono text-[#9ca3af]">
            <span className="animate-bounce">↓</span>
            <span>SCROLL TO EXPLORE 360° REVOLUTION</span>
          </div>
        </div>
      </section>

      {/* ── 02. AERODYNAMICS (Right Docked, Car visible in left center) ─────── */}
      <section
        id="section-aerodynamics"
        className="min-h-screen flex items-center justify-end px-6 md:px-16 lg:px-24 py-28 pointer-events-none"
      >
        <div className="w-full max-w-md pointer-events-auto bg-[#070709]/75 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl">
          <div className="flex items-center space-x-2 text-[10px] font-sans font-bold tracking-[0.2em] text-[#d91424] uppercase">
            <span className="w-2 h-2 rounded-full bg-[#d91424]" />
            <span>STAGE 02 // DYNAMICS</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl text-white font-bold tracking-tight leading-tight mt-3">
            {LAFERRARI_SECTIONS.aerodynamics.title}
          </h2>

          <p className="font-sans text-xs tracking-[0.18em] text-[#ffd200] uppercase font-semibold mt-1">
            {LAFERRARI_SECTIONS.aerodynamics.tagline}
          </p>

          <div className="space-y-2.5 text-xs text-[#9ca3af] leading-relaxed font-sans mt-4">
            {LAFERRARI_SECTIONS.aerodynamics.paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          {/* Technical Highlights */}
          <div className="mt-5 space-y-2 pt-4 border-t border-white/10">
            {LAFERRARI_SECTIONS.aerodynamics.technicalHighlights.map((th, idx) => (
              <div key={idx} className="bg-white/5 p-2.5 rounded-xl border border-white/5 text-xs">
                <div className="font-bold text-white tracking-wide text-[11px]">{th.label}</div>
                <div className="text-[10px] text-[#9ca3af] mt-0.5">{th.desc}</div>
              </div>
            ))}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {LAFERRARI_SECTIONS.aerodynamics.metrics.slice(0, 2).map((m, idx) => (
              <div key={idx} className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                <span className="text-[9px] tracking-wider text-[#9ca3af] uppercase block">
                  {m.label}
                </span>
                <span className="text-lg font-bold font-mono text-white mt-0.5 block">
                  {m.value} <span className="text-xs text-[#d91424]">{m.unit}</span>
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
        <div className="w-full max-w-md pointer-events-auto bg-[#070709]/75 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl">
          <div className="flex items-center space-x-2 text-[10px] font-sans font-bold tracking-[0.2em] text-[#d91424] uppercase">
            <span className="w-2 h-2 rounded-full bg-[#d91424]" />
            <span>STAGE 03 // POWERTRAIN</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl text-white font-bold tracking-tight leading-tight mt-3">
            {LAFERRARI_SECTIONS.powertrain.title}
          </h2>

          <p className="font-sans text-xs tracking-[0.18em] text-[#ffd200] uppercase font-semibold mt-1">
            {LAFERRARI_SECTIONS.powertrain.tagline}
          </p>

          <p className="font-serif italic text-xs text-[#d1d5db] border-l-2 border-[#ffd200] pl-3 my-4 leading-relaxed">
            {LAFERRARI_SECTIONS.powertrain.quote}
          </p>

          <div className="space-y-2.5 text-xs text-[#9ca3af] leading-relaxed font-sans">
            {LAFERRARI_SECTIONS.powertrain.paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          {/* V12 Metrics */}
          <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-white/10 font-sans">
            {LAFERRARI_SECTIONS.powertrain.metrics.map((m, idx) => (
              <div key={idx} className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                <span className="text-[9px] tracking-wider text-[#9ca3af] uppercase block">
                  {m.label}
                </span>
                <span className="text-lg font-bold font-mono text-white mt-0.5 block">
                  {m.value}{' '}
                  <span className="text-xs text-[#ffd200] font-normal">{m.unit}</span>
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
        <div className="w-full max-w-md pointer-events-auto bg-[#070709]/75 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl">
          <div className="flex items-center space-x-2 text-[10px] font-sans font-bold tracking-[0.2em] text-[#d91424] uppercase">
            <span className="w-2 h-2 rounded-full bg-[#d91424]" />
            <span>STAGE 04 // TELAIO</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl text-white font-bold tracking-tight leading-tight mt-3">
            {LAFERRARI_SECTIONS.chassis.title}
          </h2>

          <p className="font-sans text-xs tracking-[0.18em] text-[#ffd200] uppercase font-semibold mt-1">
            {LAFERRARI_SECTIONS.chassis.tagline}
          </p>

          <div className="space-y-2.5 text-xs text-[#9ca3af] leading-relaxed font-sans mt-4">
            {LAFERRARI_SECTIONS.chassis.paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-white/10">
            {LAFERRARI_SECTIONS.chassis.metrics.map((m, idx) => (
              <div key={idx} className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                <span className="text-[9px] tracking-wider text-[#9ca3af] uppercase block">
                  {m.label}
                </span>
                <span className="text-lg font-bold font-mono text-white mt-0.5 block">
                  {m.value} <span className="text-xs text-[#d91424]">{m.unit}</span>
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
        <div className="w-full max-w-md pointer-events-auto bg-[#070709]/75 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl">
          <div className="flex items-center space-x-2 text-[10px] font-sans font-bold tracking-[0.2em] text-[#d91424] uppercase">
            <span className="w-2 h-2 rounded-full bg-[#d91424]" />
            <span>STAGE 05 // COCKPIT</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl text-white font-bold tracking-tight leading-tight mt-3">
            {LAFERRARI_SECTIONS.cockpit.title}
          </h2>

          <p className="font-sans text-xs tracking-[0.18em] text-[#ffd200] uppercase font-semibold mt-1">
            {LAFERRARI_SECTIONS.cockpit.tagline}
          </p>

          <p className="font-serif italic text-xs text-[#d1d5db] border-l-2 border-[#d91424] pl-3 my-4 leading-relaxed">
            {LAFERRARI_SECTIONS.cockpit.quote}
          </p>

          <div className="space-y-2.5 text-xs text-[#9ca3af] leading-relaxed font-sans">
            {LAFERRARI_SECTIONS.cockpit.paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          <div className="mt-5 space-y-2 pt-4 border-t border-white/10">
            {LAFERRARI_SECTIONS.cockpit.technicalHighlights.map((th, idx) => (
              <div key={idx} className="bg-white/5 p-2.5 rounded-xl border border-white/5 text-xs">
                <div className="font-bold text-white tracking-wide text-[11px]">{th.label}</div>
                <div className="text-[10px] text-[#9ca3af] mt-0.5">{th.desc}</div>
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
