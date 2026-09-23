import { useState } from 'react';
import { TECHNICAL_SPECIFICATIONS } from '@/content/ferrariData';
import { SlidersHorizontal, Award } from 'lucide-react';

export function FerrariSpecsSheet() {
  const [activeTab, setActiveTab] = useState<number>(0);

  return (
    <div className="bg-[#070709]/80 backdrop-blur-2xl p-6 sm:p-10 rounded-2xl border border-white/10 shadow-2xl">
      <div className="flex items-center space-x-2 text-[10px] font-mono tracking-[0.24em] text-[#d91424] uppercase">
        <SlidersHorizontal className="w-3.5 h-3.5 text-[#d91424]" />
        <span>STAGE 06 // SCHEDA TECNICA</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-2 pb-5 border-b border-white/10">
        <div>
          <h2 className="font-serif text-3xl sm:text-4xl text-white font-light tracking-tight">
            Specifiche <span className="italic font-normal">Tecniche</span>
          </h2>
          <p className="font-sans text-xs tracking-[0.16em] text-[#ffd200] uppercase mt-1 font-semibold">
            Official Maranello Homologation Data
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
          <Award className="w-3.5 h-3.5 text-[#ffd200]" />
          <span>SCUDERIA FERRARI</span>
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
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-sans font-medium tracking-wider transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#d91424] text-white shadow-lg shadow-[#d91424]/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
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
            <span className="text-xs text-gray-400 tracking-wide">{item.label}</span>
            <span className="text-xs sm:text-sm font-semibold text-white font-mono text-right ml-4">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
