import { useFerrariStore, FERRARI_PAINTS, PaintOption } from '@/state/useFerrariStore';
import { ferrariSound } from '@/utils/ferrariSound';

export function FerrariAtelierView() {
  const selectedPaint = useFerrariStore((s) => s.paint);
  const setPaint = useFerrariStore((s) => s.setPaint);
  const orbitMode = useFerrariStore((s) => s.orbitMode);
  const toggleOrbitMode = useFerrariStore((s) => s.toggleOrbitMode);

  const handlePlayStartup = () => {
    ferrariSound.playStartup();
  };

  const handlePlayRev = () => {
    ferrariSound.playRev();
  };

  const handlePlayDrive = () => {
    ferrariSound.playDrive();
  };

  return (
    <div className="bg-[#070709]/90 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-white/10 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-sans font-bold tracking-[0.2em] text-[#d91424] uppercase">
            <span className="w-2 h-2 rounded-full bg-[#d91424]" />
            <span>STAGE 07 // ATELIER MARANELLO</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-white font-bold tracking-tight mt-1">
            BESPOKE CONFIGURATOR
          </h2>
          <p className="font-sans text-xs tracking-[0.14em] text-[#ffd200] uppercase mt-0.5">
            Tailor Your LaFerrari Specification
          </p>
        </div>

        {/* Orbit Mode & Authentic V12 Audio Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleOrbitMode}
            className={`px-3.5 py-1.5 rounded-full text-xs font-sans font-bold tracking-wider uppercase border transition-all cursor-pointer ${
              orbitMode
                ? 'bg-[#d91424] text-white border-[#d91424] shadow-lg shadow-[#d91424]/40'
                : 'bg-white/5 text-white border-white/15 hover:bg-white/10'
            }`}
          >
            {orbitMode ? '✓ 360° DRAG: ACTIVE' : '↺ FREE 360° ORBIT'}
          </button>

          <button
            type="button"
            onClick={handlePlayStartup}
            className="px-3.5 py-1.5 rounded-full text-xs font-sans font-bold tracking-wider uppercase bg-[#d91424] text-white hover:bg-[#ef1c2d] transition-all cursor-pointer shadow-md shadow-[#d91424]/30"
            title="Start the 6.3L V12 engine"
          >
            ▶ IGNITION START
          </button>

          <button
            type="button"
            onClick={handlePlayRev}
            className="px-3.5 py-1.5 rounded-full text-xs font-sans font-bold tracking-wider uppercase bg-[#ffd200] text-black hover:bg-[#ffe359] transition-all cursor-pointer shadow-md shadow-[#ffd200]/25"
            title="Loud 9,000 RPM V12 revs"
          >
            REV V12
          </button>

          <button
            type="button"
            onClick={handlePlayDrive}
            className="px-3.5 py-1.5 rounded-full text-xs font-sans font-bold tracking-wider uppercase bg-white/10 text-white hover:bg-white/20 border border-white/10 transition-all cursor-pointer"
            title="High-speed track pass"
          >
            TRACK FLYBY
          </button>
        </div>
      </div>

      {/* Paint Color Swatches */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-xs font-sans mb-3">
          <span className="text-[#9ca3af] uppercase tracking-wider font-semibold">
            EXTERIOR PAINTWORK:
          </span>
          <span className="text-white font-bold tracking-wide">
            {selectedPaint.name}
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {FERRARI_PAINTS.map((p: PaintOption) => {
            const isSelected = selectedPaint.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPaint(p)}
                className={`p-3 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-white/10 border-white shadow-xl scale-105'
                    : 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-full shadow-inner border border-white/20 relative"
                  style={{ backgroundColor: p.hex }}
                >
                  {isSelected && (
                    <div className="absolute inset-0 m-auto w-3 h-3 rounded-full bg-white shadow-md" />
                  )}
                </div>
                <span className="text-[11px] font-sans font-semibold text-white mt-2 text-center tracking-tight">
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>

        <p className="font-serif italic text-xs text-[#9ca3af] mt-4 text-center">
          {selectedPaint.description}
        </p>
      </div>
    </div>
  );
}
