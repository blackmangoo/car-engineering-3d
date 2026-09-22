import type { ChapterDef, ChapterId } from '@/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SCENE COORDINATE SYSTEM (units are METRES)
 * ─────────────────────────────────────────────────────────────────────────────
 * Origin: ground level, vehicle centre (midpoint of the wheelbase, on the
 *         centreline, at y = 0 where the tyres touch the floor).
 * Axes:   +X = DRIVER's side (left, LHD model — `DRIVER_SIDE_X = 1` in
 *          `@/three/body/bodyAnchors`; `wheelFL` sits at +X)
 *         +Y = up
 *         +Z = forward, toward the nose
 * Envelope (measured, `BODY_ANCHORS`): 4.6182 m long (Z) × 2.2992 m wide (X,
 *         mirrors included — bodywork ≈ 1.95 m) × 1.2591 m tall (Y)
 * Wheelbase: 2.7 m   ·   Layout: FRONT-mid engine, rear-wheel drive (RWD)
 *
 * Anchors (x, y, z) — measured values win over these contract approximations;
 * see `@/three/body/bodyAnchors`:
 *   front wheels        (±0.85, 0.365, +1.35)   [wheelFL at +X]
 *   rear wheels         (±0.84, 0.365, -1.35)
 *   engine bay centre   (0.00, 0.49, +0.81)  — FRONT of the car
 *   transmission        (0.00, 0.62, -0.10)  extending back to z = -0.75
 *   differential        (0.00, 0.45, -1.35)
 *   AC condenser        (0.00, 0.60, +1.95)
 *   AC evaporator/blower(0.00, 0.85, +0.35)
 *   brake master cyl.   (+0.45, 0.80, +1.30)  — driver's side is +X here
 *
 * Camera path continuity: chapter N's `camera.from` equals chapter N-1's
 * `camera.to`, and `outro.to` equals `hero.from`, so interpolating position
 * across boundaries is seamless and the path loops.
 * Progress convention: within every chapter the EXPLODE occupies progress
 * 0 → 0.55 and the MECHANISM cycle occupies 0.55 → 1, hence every chapter
 * uses mechanism = { start: 0.55, end: 1 }.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const MECHANISM = { start: 0.55, end: 1 }

export const CHAPTERS: readonly ChapterDef[] = [
  {
    id: 'hero',
    index: 0,
    title: 'The Complete Machine',
    system: null,
    vh: 150,
    camera: { from: [5.5, 2.2, 6.5], to: [4.0, 1.6, 5.0], target: [0, 0.7, 0], fov: 35 },
    mechanism: MECHANISM,
  },
  {
    id: 'reveal',
    index: 1,
    title: 'Beneath the Skin',
    system: null,
    vh: 200,
    camera: { from: [4.0, 1.6, 5.0], to: [3.2, 1.4, 3.6], target: [0, 0.7, 0], fov: 38 },
    mechanism: MECHANISM,
  },
  {
    id: 'suspension',
    index: 2,
    title: 'Suspension',
    system: 'suspension',
    vh: 280,
    camera: { from: [3.2, 1.4, 3.6], to: [2.0, 0.9, 2.2], target: [0.8, 0.45, 1.35], fov: 40 },
    mechanism: MECHANISM,
  },
  {
    id: 'engine',
    index: 3,
    title: 'Engine',
    system: 'engine',
    vh: 320,
    camera: { from: [2.0, 0.9, 2.2], to: [1.7, 1.3, 2.0], target: [0, 0.75, 0.85], fov: 38 },
    mechanism: MECHANISM,
  },
  {
    id: 'transmission',
    index: 4,
    title: 'Transmission',
    system: 'transmission',
    vh: 280,
    camera: { from: [1.7, 1.3, 2.0], to: [1.6, 0.9, 0.6], target: [0, 0.6, -0.3], fov: 40 },
    mechanism: MECHANISM,
  },
  {
    id: 'brakes',
    index: 5,
    title: 'Brakes',
    system: 'brakes',
    vh: 260,
    camera: { from: [1.6, 0.9, 0.6], to: [1.5, 0.6, 1.9], target: [0.8, 0.33, 1.35], fov: 42 },
    mechanism: MECHANISM,
  },
  {
    id: 'aircon',
    index: 6,
    title: 'Air Conditioning',
    system: 'aircon',
    vh: 300,
    camera: { from: [1.5, 0.6, 1.9], to: [2.2, 1.2, 2.6], target: [0, 0.7, 0.6], fov: 40 },
    mechanism: MECHANISM,
  },
  {
    id: 'outro',
    index: 7,
    title: 'Reassembly',
    system: null,
    vh: 180,
    camera: { from: [2.2, 1.2, 2.6], to: [5.5, 2.2, 6.5], target: [0, 0.7, 0], fov: 35 },
    mechanism: MECHANISM,
  },
]

/** Ordered list of chapter ids, matching `CHAPTERS`. */
export const CHAPTER_ORDER: readonly ChapterId[] = CHAPTERS.map((c) => c.id)

/** Total scroll height of the page in vh (sum of every chapter's vh). */
export const TOTAL_VH: number = CHAPTERS.reduce((sum, c) => sum + c.vh, 0)

/** Look up a chapter definition by id. Throws if the id is unknown. */
export function getChapter(id: ChapterId): ChapterDef {
  const chapter = CHAPTERS.find((c) => c.id === id)
  if (!chapter) throw new Error(`Unknown chapter id: ${id}`)
  return chapter
}
