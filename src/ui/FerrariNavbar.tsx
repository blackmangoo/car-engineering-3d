import { useCallback } from 'react';
import { useFerrariStore, FerrariChapter } from '@/state/useFerrariStore';
import { Eye, EyeOff } from 'lucide-react';

export function FerrariNavbar() {
  const activeChapter = useFerrariStore((s) => s.activeChapter);
  const cinemaMode = useFerrariStore((s) => s.cinemaMode);
  const toggleCinemaMode = useFerrariStore((s) => s.toggleCinemaMode);

  const navItems: { id: FerrariChapter; label: string }[] = [
    { id: 'hero', label: 'ESSENZA' },
    { id: 'aerodynamics', label: 'AERODINAMICA' },
    { id: 'powertrain', label: 'HY-KERS' },
    { id: 'chassis', label: 'TELAIO' },
    { id: 'cockpit', label: 'COCKPIT' },
    { id: 'specs', label: 'SPECIFICHE' },
    { id: 'atelier', label: 'ATELIER' },
  ];

  const handleNavClick = useCallback((id: FerrariChapter) => {
    useFerrariStore.getState().setActiveChapter(id);
    const el = document.getElementById(`section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 h-[72px] px-6 lg:px-10 flex items-center justify-between border-b border-white/[0.08] bg-[#070709]/85 backdrop-blur-2xl pointer-events-none transition-all duration-500 ${
          cinemaMode ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Left: Official Scuderia Ferrari Crest & Wordmark */}
        <div
          onClick={() => handleNavClick('hero')}
          className="pointer-events-auto flex items-center cursor-pointer group flex-shrink-0"
          style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
        >
          {/* Official Scuderia Ferrari Shield Logo */}
          <img
            src="/images/ferrari-logo.png"
            alt="Scuderia Ferrari"
            className="h-9 w-auto object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="font-serif text-[15px] text-white font-semibold tracking-[0.22em] group-hover:text-[#d91424] transition-colors"
            >
              FERRARI
            </span>
            <span style={{ width: '1px', height: '12px', background: 'rgba(255, 255, 255, 0.25)' }} />
            <span
              className="font-sans font-medium text-[9px] text-[#9ca3af] uppercase tracking-[0.25em]"
            >
              LAFERRARI
            </span>
          </div>
        </div>

        {/* Center: Editorial Navigation Links */}
        <nav
          className="hidden md:flex items-center pointer-events-auto flex-nowrap whitespace-nowrap overflow-x-auto scrollbar-none"
          style={{ display: 'flex', alignItems: 'center', gap: '14px' }}
        >
          {navItems.map((item) => {
            const isActive = activeChapter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`relative py-1 text-[11px] font-sans font-medium uppercase transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  isActive ? 'text-white font-semibold' : 'text-[#8e95a5] hover:text-white'
                }`}
                style={{ letterSpacing: '0.14em' }}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span
                    className="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#d91424]"
                    style={{ boxShadow: '0 0 10px rgba(217, 20, 36, 0.7)' }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Cinema View Toggle */}
        <div
          className="pointer-events-auto flex items-center flex-shrink-0 whitespace-nowrap"
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <button
            type="button"
            onClick={toggleCinemaMode}
            className="px-3.5 py-1.5 rounded-full text-[10px] font-sans font-medium tracking-[0.14em] uppercase bg-white/[0.04] text-gray-200 border border-white/15 hover:border-white/40 hover:bg-white/[0.08] hover:text-white transition-all cursor-pointer flex items-center whitespace-nowrap shadow-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Hide all UI overlays for a 100% clean view of the car"
          >
            {cinemaMode ? (
              <EyeOff className="w-3.5 h-3.5 text-[#d91424] flex-shrink-0" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
            )}
            <span className="whitespace-nowrap font-medium text-[10px]">CINEMA VIEW</span>
          </button>
        </div>
      </header>

      {/* Persistent Show UI button when Cinema Mode is active */}
      {cinemaMode && (
        <button
          type="button"
          onClick={toggleCinemaMode}
          className="fixed bottom-8 right-8 z-50 pointer-events-auto bg-[#d91424] text-white font-sans font-semibold text-xs tracking-[0.18em] px-6 py-3 rounded-full shadow-2xl shadow-[#d91424]/40 hover:bg-[#ef1c2d] transition-all cursor-pointer flex items-center space-x-2.5 whitespace-nowrap"
        >
          <Eye className="w-4 h-4 flex-shrink-0" />
          <span>EXIT CINEMA VIEW</span>
        </button>
      )}
    </>
  );
}
