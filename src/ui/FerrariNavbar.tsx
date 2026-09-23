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

  const navItems: { id: FerrariChapter; label: string; num: string }[] = [
    { id: 'hero', label: 'ESSENZA', num: '01' },
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
        className={`fixed top-0 left-0 right-0 z-40 h-20 px-6 md:px-12 flex items-center justify-between pointer-events-none transition-all duration-500 ${
          cinemaMode ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Left: Official Ferrari Maranello Crest */}
        <div
          onClick={() => handleNavClick('hero')}
          className="pointer-events-auto flex items-center space-x-3.5 cursor-pointer group"
        >
          {/* Scuderia Shield Badge */}
          <div className="w-7 h-9 bg-gradient-to-b from-[#ffd200] via-[#ffd200] to-[#e5b300] rounded-b-sm flex items-center justify-center shadow-md shadow-black/50 border border-[#fff280]/40 transition-transform duration-300 group-hover:scale-105">
            <span className="font-serif font-black text-black text-xs tracking-tighter">SF</span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="font-serif tracking-[0.24em] text-base text-white font-semibold group-hover:text-[#d91424] transition-colors">
              FERRARI
            </span>
            <span className="w-[1px] h-3.5 bg-white/20" />
            <span className="font-sans font-semibold text-[10px] tracking-[0.34em] text-[#9ca3af] uppercase">
              LAFERRARI
            </span>
          </div>
        </div>

        {/* Center: Editorial Navigation Links (Ample breathing room, no cramped text) */}
        <nav className="hidden xl:flex items-center space-x-8 pointer-events-auto bg-[#070709]/70 backdrop-blur-xl px-6 py-2 rounded-full border border-white/10 shadow-xl">
          {navItems.map((item) => {
            const isActive = activeChapter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`relative py-1 text-xs font-sans font-medium tracking-[0.2em] transition-all cursor-pointer whitespace-nowrap ${
                  isActive ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="text-[#d91424] font-mono text-[9px] mr-1.5">{item.num}</span>
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#d91424] shadow-sm shadow-[#d91424]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Audio & Cinema Mode Toggles with Lucide Icons */}
        <div className="pointer-events-auto flex items-center space-x-2.5">
          {/* V12 Sound Engine */}
          <button
            type="button"
            onClick={handleSoundToggle}
            className={`px-3.5 py-2 rounded-full text-[11px] font-mono tracking-[0.14em] uppercase transition-all cursor-pointer flex items-center space-x-2 border shadow-lg ${
              soundEnabled
                ? 'bg-[#ffd200]/15 text-[#ffd200] border-[#ffd200]/50 shadow-[#ffd200]/20'
                : 'bg-[#070709]/70 text-gray-300 border-white/10 hover:border-white/30 hover:text-white backdrop-blur-xl'
            }`}
            title="Toggle authentic 6.3L V12 engine audio"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-[#ffd200]" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-gray-400" />
            )}
            <span className="font-semibold">{soundEnabled ? 'V12 SOUND: ON' : 'V12 SOUND'}</span>
          </button>

          {/* Cinema Mode Toggle */}
          <button
            type="button"
            onClick={toggleCinemaMode}
            className="px-3.5 py-2 rounded-full text-[11px] font-mono tracking-[0.14em] uppercase bg-[#070709]/70 text-gray-300 border border-white/10 hover:border-white/30 hover:text-white transition-all cursor-pointer backdrop-blur-xl shadow-lg flex items-center space-x-2"
            title="Hide all UI overlays for a 100% clean 3D car view"
          >
            {cinemaMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="font-semibold">CINEMA VIEW</span>
          </button>
        </div>
      </header>

      {/* Persistent Show UI button when Cinema Mode is active */}
      {cinemaMode && (
        <button
          type="button"
          onClick={toggleCinemaMode}
          className="fixed bottom-8 right-8 z-50 pointer-events-auto bg-[#d91424] text-white font-sans font-bold text-xs tracking-[0.18em] px-6 py-3 rounded-full shadow-2xl shadow-[#d91424]/40 hover:bg-[#ef1c2d] transition-all cursor-pointer flex items-center space-x-2.5"
        >
          <Eye className="w-4 h-4" />
          <span>EXIT CINEMA VIEW</span>
        </button>
      )}
    </>
  );
}
