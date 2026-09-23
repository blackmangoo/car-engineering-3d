import { useFerrariStore, FERRARI_PAINTS, PaintOption } from '@/state/useFerrariStore';
import { ferrariSound } from '@/utils/ferrariSound';
import { RotateCw, Play, Flame, FastForward, Sparkles } from 'lucide-react';

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
    <div className="bg-[#070709]/80 backdrop-blur-2xl p-6 sm:p-7 rounded-2xl border border-white/10 shadow-2xl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono tracking-[0.24em] text-[#d91424] uppercase">
            <Sparkles className="w-3 h-3 text-[#d91424]" />
            <span>STAGE 07 // ATELIER MARANELLO</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-white font-light tracking-tight mt-0.5">
            Configurazione <span className="italic font-normal">Bespoke</span>
          </h2>
        </div>

        {/* Orbit Mode & Audio Triggers with Lucide Icons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleOrbitMode}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-mono tracking-wider uppercase border transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm ${
              orbitMode
                ? 'bg-[#d91424] text-white border-[#d91424] shadow-[#d91424]/30'
                : 'bg-white/5 text-gray-300 border-white/15 hover:border-white/40 hover:text-white'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{orbitMode ? 'ORBIT: ON' : '360° ORBIT'}</span>
          </button>

          <button
            type="button"
            onClick={handlePlayStartup}
            className="px-3.5 py-1.5 rounded-full text-[11px] font-mono tracking-wider uppercase bg-[#d91424] text-white hover:bg-[#ef1c2d] transition-all cursor-pointer shadow-md shadow-[#d91424]/30 flex items-center space-x-1.5"
            title="Start the 6.3L V12 engine"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>START</span>
          </button>

          <button
            type="button"
            onClick={handlePlayRev}
            className="px-3.5 py-1.5 rounded-full text-[11px] font-mono tracking-wider uppercase bg-[#ffd200] text-black hover:bg-[#ffe359] transition-all cursor-pointer shadow-md shadow-[#ffd200]/25 flex items-center space-x-1.5 font-bold"
            title="Loud 9,000 RPM V12 revs"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>REV V12</span>
          </button>

          <button
            type="button"
            onClick={handlePlayDrive}
            className="px-3.5 py-1.5 rounded-full text-[11px] font-mono tracking-wider uppercase bg-white/5 text-gray-300 hover:text-white border border-white/10 hover:border-white/30 transition-all cursor-pointer flex items-center space-x-1.5"
            title="High-speed track pass"
          >
            <FastForward className="w-3 h-3" />
            <span>FLYBY</span>
          </button>
        </div>
      </div>

      {/* Paint Color Swatches */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-xs font-sans mb-3">
          <span className="text-gray-400 font-mono text-[10px] tracking-wider uppercase">
            VERNICE ESTERNA // PAINTWORK:
          </span>
          <span className="text-white font-serif text-sm font-semibold tracking-wide">
            {selectedPaint.name}
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {FERRARI_PAINTS.map((p: PaintOption) => {
            const isSelected = selectedPaint.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPaint(p)}
                className={`py-2 px-1.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-white/10 border-white shadow-lg scale-105'
                    : 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                <div
                  className="w-7 h-7 rounded-full shadow-inner border border-white/20 relative"
                  style={{ backgroundColor: p.hex }}
                >
                  {isSelected && (
                    <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-white shadow-sm" />
                  )}
                </div>
                <span className="text-[10px] font-sans font-medium text-gray-300 mt-1.5 text-center tracking-tight truncate w-full">
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>

        <p className="font-serif italic text-xs text-gray-400 mt-3 text-center">
          {selectedPaint.description}
        </p>
      </div>
    </div>
  );
}
