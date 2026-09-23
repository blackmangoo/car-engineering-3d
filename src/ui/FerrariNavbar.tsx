import { useCallback } from 'react';
import { useFerrariStore, FerrariChapter } from '@/state/useFerrariStore';
import { ferrariSound } from '@/utils/ferrariSound';

export function FerrariNavbar() {
  const activeChapter = useFerrariStore((s) => s.activeChapter);
  const cinemaMode = useFerrariStore((s) => s.cinemaMode);
  const toggleCinemaMode = useFerrariStore((s) => s.toggleCinemaMode);
  const soundEnabled = useFerrariStore((s) => s.soundEnabled);
  const toggleSound = useFerrariStore((s) => s.toggleSound);

  const handleSoundToggle = () => {
    if (!soundEnabled) {
      toggleSound();
      ferrariSound.playStartup();
    } else {
      toggleSound();
      ferrariSound.stopAll();
    }
  };

  const navItems: { id: FerrariChapter; label: string; num: string }[] = [
    { id: 'hero', label: 'ESSENCE', num: '01' },
    { id: 'aerodynamics', label: 'AERODINAMICA', num: '02' },
    { id: 'powertrain', label: 'HY-KERS V12', num: '03' },
    { id: 'chassis', label: 'TELAIO', num: '04' },
    { id: 'cockpit', label: 'COCKPIT', num: '05' },
    { id: 'specs', label: 'SPECIFICHE', num: '06' },
    { id: 'atelier', label: 'ATELIER', num: '07' },
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
        className={`fixed top-0 left-0 right-0 z-40 h-16 px-6 md:px-12 flex items-center justify-between border-b border-white/[0.07] bg-[#070709]/60 backdrop-blur-xl pointer-events-none transition-all duration-500 ${
          cinemaMode ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Left: Official Ferrari Maranello Brand Header */}
        <div
          onClick={() => handleNavClick('hero')}
          className="pointer-events-auto flex items-center space-x-3.5 cursor-pointer group"
        >
          {/* Scuderia Ferrari Shield Crest */}
          <div className="w-6 h-8 bg-gradient-to-b from-[#ffd200] via-[#ffd200] to-[#e5b300] rounded-b-sm flex items-center justify-center shadow-md shadow-black/50 border border-[#fff280]/40 transition-transform duration-300 group-hover:scale-105">
            <span className="font-serif font-black text-black text-[10px] tracking-tighter">SF</span>
          </div>

          <div className="flex items-center space-x-2.5">
            <span className="font-serif tracking-[0.26em] text-sm text-white font-bold group-hover:text-[#d91424] transition-colors">
              FERRARI
            </span>
            <span className="w-[1px] h-3 bg-white/20" />
            <span className="font-sans font-semibold text-[10px] tracking-[0.32em] text-[#9ca3af] uppercase">
              LAFERRARI
            </span>
          </div>
        </div>

        {/* Center: Editorial Navigation Links (Clean, No Bulky Pills) */}
        <nav className="hidden lg:flex items-center space-x-6 pointer-events-auto flex-nowrap whitespace-nowrap">
          {navItems.map((item) => {
            const isActive = activeChapter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`relative py-1 text-[11px] font-sans font-medium tracking-[0.18em] whitespace-nowrap flex-shrink-0 transition-all cursor-pointer ${
                  isActive ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="text-[#d91424] font-mono text-[9px] mr-1.5">{item.num}</span>
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#d91424] shadow-sm shadow-[#d91424]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Audio & Cinema Mode Toggles */}
        <div className="pointer-events-auto flex items-center space-x-3 text-xs font-sans">
          {/* V12 Sound Engine */}
          <button
            type="button"
            onClick={handleSoundToggle}
            className={`px-3 py-1.5 rounded-full text-[10px] font-mono tracking-[0.14em] uppercase transition-all cursor-pointer flex items-center space-x-1.5 border ${
              soundEnabled
                ? 'bg-[#ffd200]/15 text-[#ffd200] border-[#ffd200]/40'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
            }`}
            title="Toggle synthesized 6.3L V12 engine audio"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${soundEnabled ? 'bg-[#ffd200] animate-ping' : 'bg-gray-500'}`} />
            <span>{soundEnabled ? 'V12 SOUND: ON' : 'V12 SOUND'}</span>
          </button>

          {/* Cinema Mode Toggle (Hides UI for 100% Unobstructed 3D View) */}
          <button
            type="button"
            onClick={toggleCinemaMode}
            className="px-3.5 py-1.5 rounded-full text-[10px] font-mono tracking-[0.14em] uppercase bg-white/5 text-gray-300 border border-white/10 hover:border-white/30 hover:text-white transition-all cursor-pointer"
            title="Hide all UI overlays for a 100% clear 3D car view"
          >
            CINEMA VIEW
          </button>
        </div>
      </header>

      {/* Persistent Show UI button when Cinema Mode is active */}
      {cinemaMode && (
        <button
          type="button"
          onClick={toggleCinemaMode}
          className="fixed bottom-6 right-6 z-50 pointer-events-auto bg-[#d91424] text-white font-sans font-bold text-xs tracking-[0.16em] px-5 py-2.5 rounded-full shadow-2xl shadow-[#d91424]/40 hover:bg-[#ef1c2d] transition-all cursor-pointer flex items-center space-x-2"
        >
          <span>✕ EXIT CINEMA VIEW</span>
        </button>
      )}
    </>
  );
}
