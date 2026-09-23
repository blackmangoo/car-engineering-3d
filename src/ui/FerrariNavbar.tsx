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
    toggleSound();
    ferrariSound.setEnabled(!soundEnabled);
  };

  const navItems: { id: FerrariChapter; label: string; num: string }[] = [
    { id: 'hero', label: 'ESSENCE', num: '01' },
    { id: 'aerodynamics', label: 'AERODYNAMICS', num: '02' },
    { id: 'powertrain', label: 'HY-KERS V12', num: '03' },
    { id: 'chassis', label: 'CARBON CHASSIS', num: '04' },
    { id: 'cockpit', label: 'COCKPIT', num: '05' },
    { id: 'specs', label: 'SPECIFICATIONS', num: '06' },
    { id: 'atelier', label: 'ATELIER STUDIO', num: '07' },
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
        className={`fixed top-0 left-0 right-0 z-40 px-6 md:px-12 py-4 flex items-center justify-between pointer-events-none transition-all duration-500 ${
          cinemaMode ? 'opacity-0 -translate-y-6' : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Left: Scuderia Crest & Ferrari Typography */}
        <div
          onClick={() => handleNavClick('hero')}
          className="pointer-events-auto flex items-center space-x-3 cursor-pointer group"
        >
          {/* Scuderia Shield Emblem */}
          <div className="w-7 h-9 bg-gradient-to-b from-[#ffd200] via-[#ffd200] to-[#e5b300] rounded-b-md flex items-center justify-center shadow-md shadow-black/40 border border-[#ffec80]/40 transition-transform duration-300 group-hover:scale-105">
            <span className="font-serif font-black text-black text-xs tracking-tighter">SF</span>
          </div>

          <div className="flex flex-col">
            <span className="font-serif tracking-[0.22em] text-sm text-white font-bold leading-tight group-hover:text-[#d91424] transition-colors">
              FERRARI
            </span>
            <span className="font-sans font-medium text-[9px] tracking-[0.28em] text-[#9ca3af] uppercase leading-tight mt-0.5">
              LAFERRARI
            </span>
          </div>
        </div>

        {/* Center: Editorial Chapter Navigation */}
        <nav className="hidden lg:flex items-center space-x-1 pointer-events-auto bg-[#070709]/80 backdrop-blur-xl px-2 py-1.5 rounded-full border border-white/10 shadow-2xl">
          {navItems.map((item) => {
            const isActive = activeChapter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`px-3 py-1 rounded-full text-[10px] font-sans font-semibold tracking-[0.14em] whitespace-nowrap flex-shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#d91424] text-white shadow-md shadow-[#d91424]/35'
                    : 'text-[#9ca3af] hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-white/60 mr-1 font-mono text-[9px]">{item.num}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Sound & Cinema Mode Toggles */}
        <div className="pointer-events-auto flex items-center space-x-2.5">
          {/* V12 Audio Engine Toggle */}
          <button
            type="button"
            onClick={handleSoundToggle}
            className={`px-3 py-1.5 rounded-full text-[10px] font-sans font-bold tracking-[0.12em] uppercase border transition-all cursor-pointer flex items-center space-x-1.5 ${
              soundEnabled
                ? 'bg-[#ffd200] text-black border-[#ffd200] shadow-md shadow-[#ffd200]/30'
                : 'bg-[#0a0a0c]/80 text-[#9ca3af] border-white/10 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle synthesized 6.3L V12 engine audio"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${soundEnabled ? 'bg-black animate-ping' : 'bg-gray-500'}`} />
            <span>{soundEnabled ? 'V12 AUDIO: ON' : 'V12 AUDIO'}</span>
          </button>

          {/* Cinema View Toggle */}
          <button
            type="button"
            onClick={toggleCinemaMode}
            className="px-3.5 py-1.5 rounded-full text-[10px] font-sans font-bold tracking-[0.14em] uppercase bg-[#0a0a0c]/80 text-white border border-white/15 hover:border-[#d91424] hover:text-[#d91424] transition-all cursor-pointer shadow-lg backdrop-blur-xl"
            title="Hide all text and overlays for 100% clean 3D car view"
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
          className="fixed bottom-6 right-6 z-50 pointer-events-auto bg-[#d91424] text-white font-sans font-bold text-xs tracking-[0.14em] px-5 py-2.5 rounded-full shadow-2xl shadow-[#d91424]/40 hover:bg-[#ef1c2d] transition-all cursor-pointer flex items-center space-x-2"
        >
          <span>✕ EXIT CINEMA VIEW</span>
        </button>
      )}
    </>
  );
}
