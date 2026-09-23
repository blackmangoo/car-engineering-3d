import { useFerrariStore, FERRARI_PAINTS } from '@/state/useFerrariStore';
import { LAFERRARI_SECTIONS } from '@/content/ferrariData';
import { ferrariSound } from '@/utils/ferrariSound';
import { RotateCw, Volume2, VolumeX } from 'lucide-react';

export function FerrariBottomBar() {
  const activeChapter = useFerrariStore((s) => s.activeChapter);
  const cinemaMode = useFerrariStore((s) => s.cinemaMode);
  const orbitMode = useFerrariStore((s) => s.orbitMode);
  const toggleOrbitMode = useFerrariStore((s) => s.toggleOrbitMode);
  const soundEnabled = useFerrariStore((s) => s.soundEnabled);
  const toggleSound = useFerrariStore((s) => s.toggleSound);
  const selectedPaint = useFerrariStore((s) => s.paint);
  const setPaint = useFerrariStore((s) => s.setPaint);

  // Automatically hide bottom bar on specs and atelier sections to prevent any overlap
  if (activeChapter === 'atelier' || activeChapter === 'specs') {
    return null;
  }

  const handleSoundToggle = () => {
    if (!soundEnabled) {
      toggleSound();
      ferrariSound.playStartup();
    } else {
      toggleSound();
      ferrariSound.stopAll();
    }
  };

  const section = LAFERRARI_SECTIONS[activeChapter] || LAFERRARI_SECTIONS.hero;

  return (
    <footer
      className={`fixed bottom-6 left-0 right-0 z-40 px-6 md:px-12 flex items-center justify-between pointer-events-none transition-all duration-500 ${
        cinemaMode ? 'opacity-0 translate-y-6' : 'opacity-100 translate-y-0'
      }`}
    >
      {/* Left: Active Stage Kicker */}
      <div className="pointer-events-auto flex items-center space-x-3 bg-[#070709]/80 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-lg text-xs font-sans">
        <span className="w-1.5 h-1.5 rounded-full bg-[#d91424] shadow-sm shadow-[#d91424]" />
        <span className="font-mono text-[10px] text-[#ffd200] font-bold">
          STAGE {section.stage}
        </span>
        <span className="text-gray-500 font-mono text-[10px] hidden sm:inline">|</span>
        <span className="font-serif text-white tracking-wide text-xs hidden sm:inline italic">
          {section.title}
        </span>
      </div>

      {/* Center: Real-Time Paint Swatch Selector */}
      <div className="pointer-events-auto flex items-center space-x-2.5 bg-[#070709]/80 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-lg">
        <span className="text-[9px] font-mono tracking-[0.2em] text-gray-400 uppercase mr-1 hidden md:inline">
          VERNICE:
        </span>
        {FERRARI_PAINTS.map((p) => {
          const isSelected = selectedPaint.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPaint(p)}
              title={p.name}
              className={`w-4 h-4 rounded-full transition-all cursor-pointer relative border ${
                isSelected
                  ? 'scale-125 border-white shadow-md'
                  : 'border-white/20 hover:scale-115 hover:border-white/60'
              }`}
              style={{ backgroundColor: p.hex }}
            >
              {isSelected && (
                <span className="absolute inset-0 m-auto w-1 h-1 rounded-full bg-white shadow-sm" />
              )}
            </button>
          );
        })}
      </div>

      {/* Right: Audio Engine & 360 Orbit Controls */}
      <div className="pointer-events-auto flex items-center space-x-2.5">
        {/* V12 Sound Engine */}
        <button
          type="button"
          onClick={handleSoundToggle}
          className={`px-3.5 py-1.5 rounded-full text-[10px] font-mono tracking-[0.14em] uppercase transition-all cursor-pointer flex items-center space-x-1.5 border shadow-lg backdrop-blur-xl ${
            soundEnabled
              ? 'bg-[#ffd200]/15 text-[#ffd200] border-[#ffd200]/50 shadow-[#ffd200]/20'
              : 'bg-[#070709]/80 text-gray-300 border-white/10 hover:border-white/30 hover:text-white'
          }`}
          title="Toggle authentic 6.3L V12 engine audio"
        >
          {soundEnabled ? (
            <Volume2 className="w-3 h-3 text-[#ffd200] flex-shrink-0" />
          ) : (
            <VolumeX className="w-3 h-3 text-gray-400 flex-shrink-0" />
          )}
          <span className="font-semibold hidden sm:inline">{soundEnabled ? 'V12 AUDIO: ON' : 'V12 AUDIO'}</span>
        </button>

        {/* 360 Orbit Toggle */}
        <button
          type="button"
          onClick={toggleOrbitMode}
          className={`px-3.5 py-1.5 rounded-full text-[10px] font-mono tracking-[0.14em] uppercase border transition-all cursor-pointer backdrop-blur-xl shadow-lg flex items-center space-x-1.5 ${
            orbitMode
              ? 'bg-[#d91424] text-white border-[#d91424] shadow-[#d91424]/30'
              : 'bg-[#070709]/80 text-gray-300 border-white/10 hover:border-white/30 hover:text-white'
          }`}
          title="Toggle free 360-degree drag orbit"
        >
          <RotateCw className="w-3 h-3" />
          <span className="hidden sm:inline">{orbitMode ? 'ORBIT: ON' : '360° ORBIT'}</span>
        </button>
      </div>
    </footer>
  );
}
