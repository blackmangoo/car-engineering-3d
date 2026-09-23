import { create } from 'zustand';

export type FerrariChapter =
  | 'hero'
  | 'aerodynamics'
  | 'powertrain'
  | 'chassis'
  | 'cockpit'
  | 'specs'
  | 'atelier';

export interface PaintOption {
  id: string;
  name: string;
  hex: string;
  description: string;
  metalness: number;
  roughness: number;
}

export const FERRARI_PAINTS: PaintOption[] = [
  {
    id: 'rosso-corsa',
    name: 'Rosso Corsa',
    hex: '#d91424',
    description: 'The iconic historic racing red of Scuderia Ferrari since 1929.',
    metalness: 0.65,
    roughness: 0.14,
  },
  {
    id: 'giallo-modena',
    name: 'Giallo Modena',
    hex: '#ffc700',
    description: 'The official yellow of the City of Modena and the background of the Cavallino crest.',
    metalness: 0.55,
    roughness: 0.16,
  },
  {
    id: 'nero-daytona',
    name: 'Nero Daytona',
    hex: '#0a0a0c',
    description: 'Deep metallic obsidian with fine metallic flake under studio light.',
    metalness: 0.85,
    roughness: 0.12,
  },
  {
    id: 'bianco-avus',
    name: 'Bianco Avus',
    hex: '#f5f6f8',
    description: 'Pure high-contrast white emphasizing the sharp aerodynamic cuts and carbon diffusers.',
    metalness: 0.45,
    roughness: 0.18,
  },
  {
    id: 'grigio-silverstone',
    name: 'Grigio Silverstone',
    hex: '#3d434d',
    description: 'Technical anthracite metallic highlighting sculptured body contours.',
    metalness: 0.9,
    roughness: 0.15,
  },
  {
    id: 'blu-tdf',
    name: 'Blu Tour de France',
    hex: '#0f3260',
    description: 'Classic deep sapphire blue paying homage to the historic Tour de France automobile races.',
    metalness: 0.8,
    roughness: 0.14,
  },
];

interface FerrariState {
  activeChapter: FerrariChapter;
  paint: PaintOption;
  cinemaMode: boolean;
  orbitMode: boolean;
  soundEnabled: boolean;
  activeSpecTab: 'powertrain' | 'performance' | 'chassis' | 'dimensions';
  loaded: boolean;

  setActiveChapter: (chapter: FerrariChapter) => void;
  setPaint: (paint: PaintOption) => void;
  toggleCinemaMode: () => void;
  setCinemaMode: (enabled: boolean) => void;
  toggleOrbitMode: () => void;
  setOrbitMode: (enabled: boolean) => void;
  toggleSound: () => void;
  setActiveSpecTab: (tab: 'powertrain' | 'performance' | 'chassis' | 'dimensions') => void;
  setLoaded: (loaded: boolean) => void;
}

export const useFerrariStore = create<FerrariState>((set) => ({
  activeChapter: 'hero',
  paint: FERRARI_PAINTS[0],
  cinemaMode: false,
  orbitMode: false,
  soundEnabled: false,
  activeSpecTab: 'powertrain',
  loaded: false,

  setActiveChapter: (chapter) => set({ activeChapter: chapter }),
  setPaint: (paint) => set({ paint }),
  toggleCinemaMode: () => set((s) => ({ cinemaMode: !s.cinemaMode })),
  setCinemaMode: (cinemaMode) => set({ cinemaMode }),
  toggleOrbitMode: () => set((s) => ({ orbitMode: !s.orbitMode })),
  setOrbitMode: (orbitMode) => set({ orbitMode }),
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  setActiveSpecTab: (activeSpecTab) => set({ activeSpecTab }),
  setLoaded: (loaded) => set({ loaded }),
}));
