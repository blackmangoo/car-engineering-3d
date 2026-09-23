import { useFerrariStore, FERRARI_PAINTS } from '@/state/useFerrariStore';
import { LAFERRARI_SECTIONS } from '@/content/ferrariData';

export function FerrariBottomBar() {
  const activeChapter = useFerrariStore((s) => s.activeChapter);
  const cinemaMode = useFerrariStore((s) => s.cinemaMode);
  const orbitMode = useFerrariStore((s) => s.orbitMode);
  const toggleOrbitMode = useFerrariStore((s) => s.toggleOrbitMode);
  const selectedPaint = useFerrariStore((s) => s.paint);
  const setPaint = useFerrariStore((s) => s.setPaint);

  const section = LAFERRARI_SECTIONS[activeChapter] || LAFERRARI_SECTIONS.hero;

  return (
    <footer
      className={`fixed bottom-6 left-0 right-0 z-40 px-6 md:px-12 flex items-center justify-between pointer-events-none transition-all duration-500 ${
        cinemaMode ? 'opacity-0 translate-y-6' : 'opacity-100 translate-y-0'
      }`}
    >
      {/* Left: Active Section Kicker */}
      <div className="pointer-events-auto flex items-center space-x-3 bg-[#070709]/70 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-lg text-xs font-sans">
        <span className="w-1.5 h-1.5 rounded-full bg-[#d91424] shadow-sm shadow-[#d91424]" />
        <span className="font-mono text-[10px] text-[#ffd200] font-bold">
          STAGE {section.stage}
        </span>
        <span className="text-gray-400 font-mono text-[10px] hidden sm:inline">|</span>
        <span className="font-serif text-white tracking-wide text-xs hidden sm:inline italic">
          {section.title}
        </span>
      </div>

      {/* Center: Real-Time Paint Swatch Selector */}
      <div className="pointer-events-auto flex items-center space-x-2.5 bg-[#070709]/70 backdrop-blur-xl px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg">
        <span className="text-[9px] font-mono tracking-[0.2em] text-gray-500 uppercase mr-1 hidden md:inline">
          PAINT:
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

      {/* Right: 360 Orbit Toggle Button */}
      <div className="pointer-events-auto">
        <button
          type="button"
          onClick={toggleOrbitMode}
          className={`px-4 py-2 rounded-full text-[10px] font-mono tracking-[0.16em] uppercase border transition-all cursor-pointer backdrop-blur-xl shadow-lg ${
            orbitMode
              ? 'bg-[#d91424] text-white border-[#d91424] shadow-[#d91424]/30'
              : 'bg-[#070709]/70 text-gray-300 border-white/10 hover:border-white/30 hover:text-white'
          }`}
          title="Toggle free 360-degree drag orbit"
        >
          {orbitMode ? '✓ 360° ORBIT: ACTIVE' : '↺ 360° ORBIT'}
        </button>
      </div>
    </footer>
  );
}
