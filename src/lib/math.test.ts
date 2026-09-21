import { describe, expect, it } from 'vitest'
import {
  clamp,
  clamp01,
  degToRad,
  inverseLerp,
  lerp,
  mapRange,
  remapProgress,
  smoothstep,
} from '@/lib/math'

describe('clamp / clamp01', () => {
  it('clamps into an inclusive range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
  })
  it('clamps to 0..1', () => {
    expect(clamp01(0.5)).toBe(0.5)
    expect(clamp01(-3)).toBe(0)
    expect(clamp01(3)).toBe(1)
  })
})

describe('lerp / inverseLerp', () => {
  it('lerps linearly', () => {
    expect(lerp(0, 10, 0.5)).toBe(5)
    expect(lerp(10, 20, 0)).toBe(10)
    expect(lerp(10, 20, 1)).toBe(20)
  })
  it('inverseLerp is the inverse and clamps', () => {
    expect(inverseLerp(0, 10, 5)).toBe(0.5)
    expect(inverseLerp(0, 10, -5)).toBe(0)
    expect(inverseLerp(0, 10, 15)).toBe(1)
  })
  it('inverseLerp handles a degenerate range', () => {
    expect(inverseLerp(4, 4, 4)).toBe(0)
  })
})

describe('mapRange', () => {
  it('maps between ranges and clamps', () => {
    expect(mapRange(5, 0, 10, 100, 200)).toBe(150)
    expect(mapRange(-1, 0, 10, 100, 200)).toBe(100)
    expect(mapRange(20, 0, 10, 100, 200)).toBe(200)
  })
})

describe('smoothstep', () => {
  it('returns 0 and 1 at the edges', () => {
    expect(smoothstep(0, 1, 0)).toBe(0)
    expect(smoothstep(0, 1, 1)).toBe(1)
  })
  it('is 0.5 at the midpoint', () => {
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 6)
  })
  it('clamps outside the range', () => {
    expect(smoothstep(0, 1, -1)).toBe(0)
    expect(smoothstep(0, 1, 2)).toBe(1)
  })
})

describe('degToRad', () => {
  it('converts degrees to radians', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI, 10)
    expect(degToRad(90)).toBeCloseTo(Math.PI / 2, 10)
  })
})

describe('remapProgress', () => {
  it('normalises the mechanism window 0.55 -> 1', () => {
    expect(remapProgress(0.55, 0.55, 1)).toBe(0)
    expect(remapProgress(1, 0.55, 1)).toBe(1)
    expect(remapProgress(0.775, 0.55, 1)).toBeCloseTo(0.5, 6)
  })
  it('clamps below the window start', () => {
    expect(remapProgress(0.2, 0.55, 1)).toBe(0)
  })
})
