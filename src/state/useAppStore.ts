import { create } from 'zustand'
import type { ChapterId, PartId, QualityTier } from '@/types'

/**
 * Discrete application state ONLY. Per-frame scroll progress lives on
 * `progressBus` / `scrollState` and must NEVER be stored here — putting it in
 * React state would re-render the tree on every scroll tick.
 */
export interface AppState {
  activeChapter: ChapterId
  selectedPart: PartId | null
  qualityTier: QualityTier
  loaded: boolean
  reducedMotion: boolean

  setActiveChapter: (chapter: ChapterId) => void
  selectPart: (part: PartId) => void
  clearSelectedPart: () => void
  setQualityTier: (tier: QualityTier) => void
  setLoaded: (loaded: boolean) => void
  setReducedMotion: (reduced: boolean) => void
}

export const useAppStore = create<AppState>()((set) => ({
  activeChapter: 'hero',
  selectedPart: null,
  qualityTier: 'high',
  loaded: false,
  reducedMotion: false,

  setActiveChapter: (chapter) =>
    set((state) => (state.activeChapter === chapter ? state : { activeChapter: chapter })),
  selectPart: (part) => set({ selectedPart: part }),
  clearSelectedPart: () => set({ selectedPart: null }),
  setQualityTier: (tier) =>
    set((state) => (state.qualityTier === tier ? state : { qualityTier: tier })),
  setLoaded: (loaded) => set((state) => (state.loaded === loaded ? state : { loaded })),
  setReducedMotion: (reduced) =>
    set((state) => (state.reducedMotion === reduced ? state : { reducedMotion: reduced })),
}))
