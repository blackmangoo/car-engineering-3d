import { describe, expect, it } from 'vitest'
import { Euler, Vector3 } from 'three'
import { damp, damp3, dampEuler } from '@/lib/damp'

describe('damp3', () => {
  it('moves a Vector3 toward the target and mutates in place', () => {
    const v = new Vector3(0, 0, 0)
    const returned = damp3(v, [10, 0, 0], 0.2, 1 / 60)
    expect(returned).toBe(v) // same reference
    expect(v.x).toBeGreaterThan(0)
    expect(v.x).toBeLessThan(10)
  })

  it('converges toward the target over repeated frames', () => {
    const v = new Vector3(0, 0, 0)
    for (let i = 0; i < 600; i++) damp3(v, [5, 5, 5], 0.15, 1 / 60)
    expect(v.x).toBeCloseTo(5, 2)
    expect(v.y).toBeCloseTo(5, 2)
    expect(v.z).toBeCloseTo(5, 2)
  })
})

describe('dampEuler', () => {
  it('moves an Euler toward the target', () => {
    const e = new Euler(0, 0, 0)
    dampEuler(e, [1, 0, 0], 0.2, 1 / 60)
    expect(e.x).toBeGreaterThan(0)
    expect(e.x).toBeLessThan(1)
  })
})

describe('damp (scalar property)', () => {
  it('damps a numeric property on an object', () => {
    const obj = { value: 0 }
    damp(obj, 'value', 100, 0.2, 1 / 60)
    expect(obj.value).toBeGreaterThan(0)
    expect(obj.value).toBeLessThan(100)
  })
})
