import { describe, expect, it } from 'vitest'
import { CHAPTERS, CHAPTER_ORDER, getChapter, TOTAL_VH } from '@/scroll/chapters'
import type { ChapterId } from '@/types'

const EXPECTED_ORDER: ChapterId[] = [
  'hero',
  'reveal',
  'suspension',
  'engine',
  'transmission',
  'brakes',
  'aircon',
  'outro',
]

describe('chapters', () => {
  it('has 8 chapters in the canonical order', () => {
    expect(CHAPTERS).toHaveLength(8)
    expect(CHAPTER_ORDER).toEqual(EXPECTED_ORDER)
  })

  it('assigns a contiguous index to each chapter', () => {
    CHAPTERS.forEach((c, i) => expect(c.index).toBe(i))
  })

  it('uses the explode/mechanism split of 0 -> 0.55 and 0.55 -> 1', () => {
    for (const c of CHAPTERS) {
      expect(c.mechanism).toEqual({ start: 0.55, end: 1 })
    }
  })

  it('maps system ids only for the five mechanism chapters', () => {
    expect(getChapter('hero').system).toBeNull()
    expect(getChapter('reveal').system).toBeNull()
    expect(getChapter('outro').system).toBeNull()
    expect(getChapter('suspension').system).toBe('suspension')
    expect(getChapter('engine').system).toBe('engine')
    expect(getChapter('transmission').system).toBe('transmission')
    expect(getChapter('brakes').system).toBe('brakes')
    expect(getChapter('aircon').system).toBe('aircon')
  })

  it('keeps the camera path continuous (chapter N from === chapter N-1 to)', () => {
    for (let i = 1; i < CHAPTERS.length; i++) {
      expect(CHAPTERS[i].camera.from).toEqual(CHAPTERS[i - 1].camera.to)
    }
  })

  it('loops the camera path back to the hero framing at the outro', () => {
    expect(getChapter('outro').camera.to).toEqual(getChapter('hero').camera.from)
  })

  it('sums vh into TOTAL_VH', () => {
    const sum = CHAPTERS.reduce((acc, c) => acc + c.vh, 0)
    expect(TOTAL_VH).toBe(sum)
    expect(TOTAL_VH).toBe(1970)
  })

  it('throws for an unknown chapter id', () => {
    expect(() => getChapter('nope' as ChapterId)).toThrow()
  })
})
