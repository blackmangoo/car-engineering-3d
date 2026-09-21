import type { ChapterId } from '@/types'

/**
 * Mutable per-chapter scroll progress. Written by ScrollTrigger.onUpdate, read
 * inside useFrame. Deliberately NOT React state — mutating this must never
 * trigger a re-render. This is the hot path of the entire scroll system.
 */
export const progressBus = {
  hero: { current: 0 },
  reveal: { current: 0 },
  suspension: { current: 0 },
  engine: { current: 0 },
  transmission: { current: 0 },
  brakes: { current: 0 },
  aircon: { current: 0 },
  outro: { current: 0 },
} satisfies Record<ChapterId, { current: number }>

/**
 * Frame-shared, non-reactive scroll telemetry. Same rule as progressBus:
 * mutate freely, never read this inside a React render.
 */
export const scrollState = {
  velocity: 0,
  direction: 1 as 1 | -1,
  activeChapter: 'hero' as ChapterId,
}

/** Reset every chapter progress and the scroll telemetry to their initial state. */
export function resetProgress(): void {
  progressBus.hero.current = 0
  progressBus.reveal.current = 0
  progressBus.suspension.current = 0
  progressBus.engine.current = 0
  progressBus.transmission.current = 0
  progressBus.brakes.current = 0
  progressBus.aircon.current = 0
  progressBus.outro.current = 0
  scrollState.velocity = 0
  scrollState.direction = 1
  scrollState.activeChapter = 'hero'
}
