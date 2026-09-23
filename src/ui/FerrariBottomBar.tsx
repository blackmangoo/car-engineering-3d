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
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-40 pointer-events-auto transition-all duration-500 ${
        cinemaMode ? 'opacity-0 translate-y-6 pointer-events-none' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="bg-[#070709]/85 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/10 shadow-2xl flex items-center space-x-5 text-xs font-sans">
        {/* Active Stage & Title */}
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d91424]" />
          <span className="font-mono text-[10px] text-[#ffd200] font-bold">
            STAGE {section.stage}
          </span>
          <span className="font-semibold text-white tracking-wide text-xs hidden sm:inline">
            {section.title}
          </span>
        </div>

        <div className="w-[1px] h-4 bg-white/15" />

        {/* Quick Paint Dot Swatches */}
        <div className="flex items-center space-x-2">
          {FERRARI_PAINTS.map((p) => {
            const isSelected = selectedPaint.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPaint(p)}
                title={p.name}
                className={`w-4 h-4 rounded-full transition-transform cursor-pointer border ${
                  isSelected ? 'scale-125 border-white shadow-sm' : 'border-black/50 hover:scale-110'
                }`}
                style={{ backgroundColor: p.hex }}
              />
            );
          })}
        </div>

        <div className="w-[1px] h-4 bg-white/15" />

        {/* Orbit Mode Toggle */}
        <button
          type="button"
          onClick={toggleOrbitMode}
          className={`px-3 py-1 rounded-full text-[10px] font-sans font-bold tracking-wider uppercase border transition-all cursor-pointer ${
            orbitMode
              ? 'bg-[#d91424] text-white border-[#d91424]'
              : 'bg-white/5 text-[#d1d5db] border-white/10 hover:text-white hover:bg-white/10'
          }`}
          title="Toggle free 360 drag orbit vs scroll revolution"
        >
          {orbitMode ? '360° ORBIT: ON' : '360° ORBIT'}
        </button>
      </div>
    </footer>
  );
}
