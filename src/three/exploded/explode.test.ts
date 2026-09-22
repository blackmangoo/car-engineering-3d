import { describe, expect, it } from 'vitest'
import {
  EXPLODE_TABLE,
  IDENTITY_TRANSFORM,
  explodeProgress,
  getExplodeTransform,
  mechanismProgress,
} from './explode'
import type { PartId } from '@/types'

/** Every PartId in the union — the table must cover all of them. */
const ALL_PART_IDS: PartId[] = [
  'susp.wishboneUpper', 'susp.wishboneLower', 'susp.spring', 'susp.damper',
  'susp.upright', 'susp.antiRollBar', 'susp.hub',
  'eng.block', 'eng.head', 'eng.piston', 'eng.conrod', 'eng.crankshaft',
  'eng.camshaft', 'eng.valveIntake', 'eng.valveExhaust', 'eng.valveSpring',
  'eng.flywheel', 'eng.oilPan', 'eng.intakeManifold', 'eng.exhaustManifold',
  'trx.clutch', 'trx.inputShaft', 'trx.gearSet', 'trx.synchro',
  'trx.outputShaft', 'trx.differential', 'trx.housing',
  'brk.disc', 'brk.caliper', 'brk.padInner', 'brk.padOuter',
  'brk.caliperPiston', 'brk.line', 'brk.masterCylinder',
  'ac.compressor', 'ac.condenser', 'ac.receiverDrier', 'ac.expansionValve',
  'ac.evaporator', 'ac.blower', 'ac.lineHigh', 'ac.lineLow',
]

const TABLED = Object.keys(EXPLODE_TABLE) as PartId[]

const mag = (v: readonly number[]) => Math.hypot(v[0], v[1], v[2])

describe('EXPLODE_TABLE completeness', () => {
  it('has an entry for every PartId in the union', () => {
    for (const id of ALL_PART_IDS) {
      expect(EXPLODE_TABLE[id], `missing explode entry for ${id}`).toBeDefined()
    }
  })

  it('gives every listed engine/transmission/brake/suspension/AC part a non-zero distance', () => {
    const required: PartId[] = ALL_PART_IDS.filter(
      (id) => id.startsWith('eng.') || id.startsWith('trx.') || id.startsWith('brk.') ||
        id.startsWith('susp.') || id.startsWith('ac.'),
    )
    expect(required.length).toBeGreaterThanOrEqual(42)
    for (const id of required) {
      const entry = EXPLODE_TABLE[id]
      expect(entry, `no entry for ${id}`).toBeDefined()
      expect(entry!.distance, `zero distance for ${id}`).toBeGreaterThan(0)
    }
  })

  it('uses unit-length axes so distance equals displacement magnitude', () => {
    for (const id of TABLED) {
      const { axis } = EXPLODE_TABLE[id]!
      expect(mag(axis), `axis for ${id} is not unit length`).toBeCloseTo(1, 2)
    }
  })

  it('keeps every fadeTo target within [0,1]', () => {
    for (const id of TABLED) {
      const fade = EXPLODE_TABLE[id]!.fadeTo
      if (fade !== undefined) {
        expect(fade).toBeGreaterThanOrEqual(0)
        expect(fade).toBeLessThanOrEqual(1)
      }
    }
  })

  it('contains no unknown keys outside the PartId union', () => {
    for (const id of TABLED) {
      expect(ALL_PART_IDS).toContain(id)
    }
  })
})

describe('getExplodeTransform', () => {
  it('returns identity at progress 0 for every tabled part', () => {
    for (const id of TABLED) {
      const t = getExplodeTransform(id, 0)
      expect(t.position).toEqual([0, 0, 0])
      expect(t.rotation).toEqual([0, 0, 0])
      expect(t.opacity).toBe(1)
    }
  })

  it('returns the shared IDENTITY_TRANSFORM for an unknown/untabled part', () => {
    const t = getExplodeTransform('nope.notapart' as PartId, 0.7)
    expect(t).toBe(IDENTITY_TRANSFORM)
    expect(t.position).toEqual([0, 0, 0])
  })

  it('displaces every part by at least 60% of its configured distance at progress 1', () => {
    for (const id of TABLED) {
      const entry = EXPLODE_TABLE[id]!
      const t = getExplodeTransform(id, 1)
      const d = mag(t.position)
      expect(d, `${id} did not reach 60% of its distance`).toBeGreaterThanOrEqual(entry.distance * 0.6)
      // Unit axis (to ~3 dp) => full travel at progress 1.
      expect(d).toBeCloseTo(entry.distance, 3)
    }
  })

  it('moves each part along its configured axis direction', () => {
    for (const id of TABLED) {
      const entry = EXPLODE_TABLE[id]!
      const t = getExplodeTransform(id, 1)
      for (let k = 0; k < 3; k++) {
        expect(Math.sign(t.position[k])).toBe(Math.sign(entry.axis[k]))
      }
    }
  })

  it('has monotonically non-decreasing displacement magnitude from 0 -> 1 (11 samples)', () => {
    for (const id of TABLED) {
      let prev = -1
      for (let i = 0; i <= 10; i++) {
        const p = i / 10
        const d = mag(getExplodeTransform(id, p).position)
        expect(d + 1e-9, `${id} decreased at progress ${p}`).toBeGreaterThanOrEqual(prev)
        prev = d
      }
    }
  })

  it('always returns an opacity within [0,1]', () => {
    for (const id of TABLED) {
      for (let i = 0; i <= 10; i++) {
        const o = getExplodeTransform(id, i / 10).opacity
        expect(o).toBeGreaterThanOrEqual(0)
        expect(o).toBeLessThanOrEqual(1)
      }
    }
  })

  it('fades a ghosted housing toward its fadeTo target by progress 1', () => {
    const t = getExplodeTransform('trx.housing', 1)
    expect(t.opacity).toBeCloseTo(EXPLODE_TABLE['trx.housing']!.fadeTo!, 5)
  })

  it('clamps out-of-range progress', () => {
    const below = getExplodeTransform('eng.head', -1)
    expect(below.position).toEqual([0, 0, 0])
    const above = getExplodeTransform('eng.head', 2)
    expect(mag(above.position)).toBeCloseTo(EXPLODE_TABLE['eng.head']!.distance, 5)
  })
})

describe('explodeProgress', () => {
  it('maps chapter progress [0, 0.55] onto [0, 1]', () => {
    expect(explodeProgress(0)).toBe(0)
    expect(explodeProgress(0.275)).toBeCloseTo(0.5, 5)
    expect(explodeProgress(0.55)).toBeCloseTo(1, 5)
  })

  it('clamps to 1 after chapter progress 0.55', () => {
    expect(explodeProgress(0.6)).toBe(1)
    expect(explodeProgress(1)).toBe(1)
    expect(explodeProgress(5)).toBe(1)
  })

  it('never returns a value outside [0,1]', () => {
    for (let i = 0; i <= 20; i++) {
      const v = explodeProgress((i / 20) * 2 - 0.5)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})

describe('mechanismProgress', () => {
  it('is 0 below chapter progress 0.55', () => {
    expect(mechanismProgress(0)).toBe(0)
    expect(mechanismProgress(0.3)).toBe(0)
    expect(mechanismProgress(0.55)).toBe(0)
  })

  it('ramps to 1 at chapter progress 1', () => {
    expect(mechanismProgress(0.775)).toBeCloseTo(0.5, 5)
    expect(mechanismProgress(1)).toBeCloseTo(1, 5)
    expect(mechanismProgress(2)).toBe(1)
  })
})
