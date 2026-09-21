import { beforeEach, describe, expect, it } from 'vitest'
import { progressBus, resetProgress, scrollState } from '@/state/progressBus'
import { CHAPTER_ORDER } from '@/scroll/chapters'
import type { ChapterId } from '@/types'

describe('progressBus', () => {
  beforeEach(() => resetProgress())

  it('exposes a progress cell for every chapter', () => {
    for (const id of CHAPTER_ORDER) {
      expect(progressBus[id]).toBeDefined()
      expect(progressBus[id].current).toBe(0)
    }
  })

  it('resets every chapter progress and the scroll telemetry', () => {
    progressBus.engine.current = 0.42
    progressBus.brakes.current = 0.9
    scrollState.velocity = 1234
    scrollState.direction = -1
    scrollState.activeChapter = 'engine'

    resetProgress()

    for (const id of CHAPTER_ORDER) {
      expect(progressBus[id as ChapterId].current).toBe(0)
    }
    expect(scrollState.velocity).toBe(0)
    expect(scrollState.direction).toBe(1)
    expect(scrollState.activeChapter).toBe('hero')
  })

  it('mutates cells independently', () => {
    progressBus.suspension.current = 0.75
    expect(progressBus.suspension.current).toBe(0.75)
    expect(progressBus.engine.current).toBe(0)
  })
})
