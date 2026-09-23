import { useCallback } from 'react';
import { useFerrariStore, FerrariChapter } from '@/state/useFerrariStore';
import { ferrariSound } from '@/utils/ferrariSound';
import { Volume2, VolumeX, Eye, EyeOff } from 'lucide-react';

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

  const navItems: { id: FerrariChapter; label: string }[] = [
    { id: 'hero', label: 'ESSENZA' },
    { id: 'aerodynamics', label: 'AERODINAMICA' },
    { id: 'powertrain', label: 'HY-KERS V12' },
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
        className={`fixed top-0 left-0 right-0 z-40 h-[72px] px-8 md:px-14 flex items-center justify-between border-b border-white/[0.08] bg-[#070709]/80 backdrop-blur-2xl pointer-events-none transition-all duration-500 ${
          cinemaMode ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0'
        }`}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        {/* Left: Official Ferrari Maranello Crest & Typographical Wordmark */}
        <div
          onClick={() => handleNavClick('hero')}
          className="pointer-events-auto flex items-center cursor-pointer group flex-shrink-0"
          style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
        >
          {/* Scuderia Ferrari Shield Emblem */}
          <div className="w-[26px] h-[34px] bg-gradient-to-b from-[#ffd200] via-[#ffd200] to-[#e5b300] rounded-b-[2px] flex items-center justify-center shadow-md shadow-black/60 border border-[#fff280]/50 transition-transform duration-300 group-hover:scale-105">
            <span className="font-serif font-black text-black text-[11px] tracking-tighter">SF</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="font-serif tracking-[0.28em] text-[15px] text-white font-semibold group-hover:text-[#d91424] transition-colors">
              FERRARI
            </span>
            <span style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.2)' }} />
            <span className="font-sans font-medium text-[9px] tracking-[0.35em] text-[#9ca3af] uppercase">
              LAFERRARI
            </span>
          </div>
        </div>

        {/* Center: Clean Architectural Editorial Navigation (Generous 32px flex gap) */}
        <nav
          className="hidden xl:flex items-center pointer-events-auto flex-nowrap whitespace-nowrap"
          style={{ display: 'flex', alignItems: 'center', gap: '32px' }}
        >
          {navItems.map((item) => {
            const isActive = activeChapter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`relative py-1 text-[11px] font-sans font-medium tracking-[0.24em] transition-all cursor-pointer whitespace-nowrap flex-shrink-0 uppercase ${
                  isActive ? 'text-white' : 'text-[#8e95a5] hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute -bottom-2 left-0 right-0 h-[1.5px] bg-[#d91424] shadow-sm shadow-[#d91424]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Audio & Cinema View Toggles */}
        <div
          className="pointer-events-auto flex items-center flex-shrink-0 whitespace-nowrap"
          style={{ display: 'flex', alignItems: 'center', gap: '14px' }}
        >
          {/* V12 Audio Engine Button */}
          <button
            type="button"
            onClick={handleSoundToggle}
            className={`px-4 py-2 rounded-full text-[11px] font-sans font-medium tracking-[0.16em] uppercase transition-all cursor-pointer flex items-center border whitespace-nowrap ${
              soundEnabled
                ? 'bg-[#ffd200]/15 text-[#ffd200] border-[#ffd200]/50 shadow-md shadow-[#ffd200]/20'
                : 'bg-white/[0.04] text-gray-300 border-white/15 hover:border-white/30 hover:bg-white/[0.08] hover:text-white'
            }`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            title="Toggle authentic 6.3L V12 engine audio"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-[#ffd200] flex-shrink-0" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            )}
            <span className="whitespace-nowrap">{soundEnabled ? 'V12 AUDIO: ON' : 'V12 AUDIO'}</span>
          </button>

          {/* Cinema View Toggle Button */}
          <button
            type="button"
            onClick={toggleCinemaMode}
            className="px-4 py-2 rounded-full text-[11px] font-sans font-medium tracking-[0.16em] uppercase bg-white/[0.04] text-gray-300 border border-white/15 hover:border-white/30 hover:bg-white/[0.08] hover:text-white transition-all cursor-pointer flex items-center whitespace-nowrap"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            title="Hide all UI overlays for a 100% clean 3D car view"
          >
            {cinemaMode ? (
              <EyeOff className="w-3.5 h-3.5 text-[#d91424] flex-shrink-0" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
            )}
            <span className="whitespace-nowrap">CINEMA VIEW</span>
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
