import { useState } from 'react';
import { TECHNICAL_SPECIFICATIONS } from '@/content/ferrariData';

export function FerrariSpecsSheet() {
  const [activeTab, setActiveTab] = useState<number>(0);

  return (
    <div className="bg-[#070709]/85 backdrop-blur-2xl p-6 sm:p-10 rounded-3xl border border-white/10 shadow-2xl">
      <div className="flex items-center space-x-2 text-[10px] font-sans font-bold tracking-[0.2em] text-[#d91424] uppercase">
        <span className="w-2 h-2 rounded-full bg-[#d91424]" />
        <span>STAGE 06 // SCHEDA TECNICA</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-2 pb-6 border-b border-white/10">
        <div>
          <h2 className="font-serif text-3xl sm:text-4xl text-white font-bold tracking-tight">
            TECHNICAL SPECIFICATIONS
          </h2>
          <p className="font-sans text-xs tracking-[0.16em] text-[#ffd200] uppercase mt-1">
            Official Maranello Homologation Data
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto py-4 scrollbar-none border-b border-white/5">
        {TECHNICAL_SPECIFICATIONS.map((cat, idx) => {
          const isSelected = activeTab === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveTab(idx)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-sans font-semibold tracking-wider transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#d91424] text-white shadow-lg shadow-[#d91424]/30'
                  : 'text-[#9ca3af] hover:text-white hover:bg-white/5'
              }`}
            >
              {cat.category}
            </button>
          );
        })}
      </div>

      {/* Specifications Table */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {TECHNICAL_SPECIFICATIONS[activeTab].specs.map((item, sIdx) => (
          <div
            key={sIdx}
            className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-white/5 font-sans"
          >
            <span className="text-xs text-[#9ca3af] tracking-wide">{item.label}</span>
            <span className="text-xs sm:text-sm font-bold text-white font-mono text-right ml-4">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
