import { describe, expect, it } from 'vitest'
import {
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from 'three'
import type { Material, Object3D } from 'three'
import {
  BONNET_LINE_FRACTION,
  CULL_DENYLIST,
  ENGINE_BAY_LENGTH_FRACTION,
  WHEEL_CORNERS,
  axleStations,
  collectMeshes,
  cornerTyreBox,
  countTriangles,
  createShellRoot,
  cullInteriorMeshes,
  findWheelCorners,
  fitShellToContract,
  isCulledName,
  isTyrePart,
  measureAnchors,
  resolveForwardYaw,
  resolveNoseEvidence,
  unionBox,
  wheelCornerFromName,
} from './shellFit'
import type { WheelCorner } from './shellFit'
import { DRIVER_SIDE_X, TARGET_WHEELBASE } from './bodyAnchors'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * shellFit — pure geometry. No loaders, no Draco, no WebGL, no DOM.
 * ─────────────────────────────────────────────────────────────────────────────
 * Every fixture below is a synthetic hierarchy of `BoxGeometry` meshes whose
 * names, transforms and TRIANGLE COUNTS reproduce the numbers measured offline
 * from `public/models/ferrari.glb`:
 *
 *   358,788 total → 116,850 culled (20 meshes) → 241,938 retained (31 meshes)
 *   wheelbaseBefore 2.650547 → scale 1.018658 → wheelbase 2.7
 *   wheelRadius 0.3647 · wheelWidth 0.2755 · trackWidth 1.6894
 *   overallLength 4.6182 · overallWidth 2.2992 · roofY 1.2591
 *   frontNoseZ 2.4826 · rearZ −2.1355
 *   engineBayCenter [0, 0.4916, 0.81] · engineBaySize [1.4139, 0.7291, 1.08]
 *
 * Reproducing the real ratios is the point. A round-number toy car would let an
 * off-by-a-factor bug in the scale/translate maths pass unnoticed, and would
 * never exercise the real asset's asymmetric left/right hub positions or its
 * long front overhang.
 *
 * ── HOW THE TRIANGLE COUNTS ARE FAKED ───────────────────────────────────────
 * `countTriangles` reads `geometry.index.count / 3`; it does not care whether
 * the indexed triangles enclose any area. So each fixture mesh gets a real unit
 * `BoxGeometry` (12 triangles, correct vertex hull) whose index buffer is padded
 * with degenerate `(0,0,0)` triangles up to the target count. The padding is
 * invisible to `unionBox`, which walks the POSITION attribute — so the bounding
 * boxes stay exactly box-shaped while the triangle arithmetic matches the real
 * asset to the unit.
 */

type Vec3 = [number, number, number]

const MIN_BOX_TRIANGLES = 12

// ── measured literals ───────────────────────────────────────────────────────
const SRC_TOTAL_TRIANGLES = 358_788
const SRC_CULLED_TRIANGLES = 116_850
const SRC_RETAINED_TRIANGLES = 241_938
const SRC_CULLED_MESHES = 20
const SRC_RETAINED_MESHES = 31
const SRC_WHEELBASE = 2.650547
const EXPECTED_SCALE = 1.018658

// ── source dimensions: the measured value ÷ the scale the fit must derive ───
const S = TARGET_WHEELBASE / SRC_WHEELBASE
const HALF_WB = SRC_WHEELBASE / 2
/** The bodywork sits this far FORWARD of the axle midpoint (long front overhang). */
const Z_BIAS = 0.170372
const BODY_LENGTH_Z = 4.6182 / S
const MIRROR_X = 1.128543 - 0.05
const ROOF_TOP_Y = 1.2591 / S
const WHEEL_Y = 0.3647 / S
/** Lowest point of `body_lower`, which is what sets the engine-bay floor. */
const BODY_LOWER_MIN_Y = 0.1247
const GLASS_CENTRE_Y = 0.98
const GLASS_CENTRE_Z = 0.05
const TYRE_SIZE: Vec3 = [0.2755 / S, 0.7294 / S, 0.7294 / S]
const RIM_SIZE: Vec3 = [0.2, 0.5, 0.5]
/** Deliberately asymmetric, exactly like the real asset (mean X ≈ 0). */
const WHEEL_X: Record<WheelCorner, number> = {
  FL: 0.8555 / S,
  FR: -0.8469 / S,
  RL: 0.8339 / S,
  RR: -0.8425 / S,
}

// ── geometry cache ──────────────────────────────────────────────────────────
/**
 * Unit boxes are cached by triangle count so the padded index buffers are
 * allocated once for the whole file rather than once per test. Nothing here is
 * disposed, on purpose: the `cullInteriorMeshes` disposal tests build their own
 * unshared geometries via `freshBox` so they cannot poison this cache.
 */
const geometryCache = new Map<number, BoxGeometry>()

function padToTriangles(geometry: BoxGeometry, triangles: number): BoxGeometry {
  const index = geometry.index
  if (!index) throw new Error('fixture: BoxGeometry has no index')
  const base = Array.from(index.array as Uint16Array)
  const have = base.length / 3
  if (triangles < have) throw new Error(`fixture: cannot shrink ${have} triangles to ${triangles}`)
  const padded = base.slice()
  for (let i = have; i < triangles; i++) padded.push(0, 0, 0)
  geometry.setIndex(padded)
  return geometry
}

function unitBox(triangles: number): BoxGeometry {
  const cached = geometryCache.get(triangles)
  if (cached) return cached
  const geometry = padToTriangles(new BoxGeometry(1, 1, 1), triangles)
  geometryCache.set(triangles, geometry)
  return geometry
}

/** An uncached box, for the tests that exercise disposal. */
function freshBox(triangles: number, material: Material | Material[], name = 'disposable'): Mesh {
  const mesh = new Mesh(padToTriangles(new BoxGeometry(1, 1, 1), triangles), material)
  mesh.name = name
  return mesh
}

const SHARED_MATERIAL = new MeshBasicMaterial()

function boxMesh(name: string, size: Vec3, position: Vec3, triangles: number): Mesh {
  const mesh = new Mesh(unitBox(triangles), SHARED_MATERIAL)
  mesh.name = name
  mesh.scale.set(size[0], size[1], size[2])
  mesh.position.set(position[0], position[1], position[2])
  return mesh
}

/**
 * Split `total` into `count` deterministic, deliberately UNEVEN parts, each at
 * least one box. The unevenness is the point: with equal parts, a bug that
 * counted meshes instead of summing triangles would still add up. The last part
 * absorbs the rounding remainder, so the sum is exact by construction.
 */
function distribute(total: number, count: number): number[] {
  const weights: number[] = []
  let weightSum = 0
  for (let i = 0; i < count; i++) {
    const w = 1 + ((i * 7) % 9)
    weights.push(w)
    weightSum += w
  }
  const parts = new Array<number>(count).fill(MIN_BOX_TRIANGLES)
  let assigned = 0
  for (let i = 0; i < count - 1; i++) {
    parts[i] = Math.max(MIN_BOX_TRIANGLES, Math.floor((total * weights[i]!) / weightSum))
    assigned += parts[i]!
  }
  parts[count - 1] = total - assigned
  return parts
}

// ── the fixture's name tables ───────────────────────────────────────────────
/**
 * Exterior bodywork that MUST survive the cull. `grills` spans the whole car on
 * purpose — that is the documented weak nose cue. `chrome_trim` is here because
 * it is the false positive `isTyrePart` used to produce.
 */
const PANELS: ReadonlyArray<{ name: string; size: Vec3; pos: Vec3 }> = [
  { name: 'body', size: [1.9, 0.55, BODY_LENGTH_Z], pos: [0, 0.55, 0] },
  { name: 'body_lower', size: [1.86, 0.3, 4.3], pos: [0, BODY_LOWER_MIN_Y + 0.15, 0] },
  { name: 'bonnet', size: [1.7, 0.1, 1.2], pos: [0, 0.86, 1.55] },
  { name: 'roof', size: [1.5, 0.08, 1.1], pos: [0, ROOF_TOP_Y - 0.04, 0.1] },
  { name: 'glass', size: [1.55, 0.45, 2.6], pos: [0, GLASS_CENTRE_Y, GLASS_CENTRE_Z] },
  { name: 'glass_windscreen', size: [1.5, 0.4, 0.1], pos: [0, GLASS_CENTRE_Y, 0.85] },
  { name: 'chrome', size: [1.92, 0.06, 4.42], pos: [0, 0.83, 0] },
  { name: 'chrome_trim', size: [1.94, 0.04, 0.6], pos: [0, 0.7, 0] },
  { name: 'grills', size: [1.8, 0.35, 4.3], pos: [0, 0.5, 0] },
  { name: 'grille_front', size: [1.2, 0.22, 0.08], pos: [0, 0.52, 2.19] },
  { name: 'lights', size: [1.7, 0.14, 0.04], pos: [0, 0.8, 2.18] },
  { name: 'lights_red', size: [1.7, 0.12, 0.04], pos: [0, 0.86, -2.17] },
  { name: 'light_indicator_l', size: [0.16, 0.08, 0.05], pos: [0.8, 0.78, 2.16] },
  { name: 'light_indicator_r', size: [0.16, 0.08, 0.05], pos: [-0.8, 0.78, 2.16] },
  { name: 'bumper_front', size: [1.88, 0.22, 0.18], pos: [0, 0.34, 2.14] },
  { name: 'bumper_rear', size: [1.88, 0.22, 0.18], pos: [0, 0.34, -2.14] },
  { name: 'side_skirt_l', size: [0.1, 0.14, 2.6], pos: [0.93, 0.22, 0] },
  { name: 'side_skirt_r', size: [0.1, 0.14, 2.6], pos: [-0.93, 0.22, 0] },
  { name: 'mirror_l', size: [0.1, 0.08, 0.2], pos: [MIRROR_X, 0.98, 0.9] },
  { name: 'mirror_r', size: [0.1, 0.08, 0.2], pos: [-MIRROR_X, 0.98, 0.9] },
  { name: 'spoiler', size: [1.6, 0.06, 0.3], pos: [0, 1.05, -2.05] },
  { name: 'exhaust_tips', size: [0.9, 0.1, 0.2], pos: [0, 0.26, -2.16] },
  { name: 'undertray', size: [1.7, 0.04, 4.0], pos: [0, 0.16, 0] },
]

/**
 * Interior names matching the real asset's patterns — one or more per
 * `CULL_DENYLIST` token. All sit strictly INSIDE the bodywork envelope, so
 * culling cannot change the shell's union box.
 */
const INTERIOR: ReadonlyArray<{ name: string; size: Vec3; pos: Vec3 }> = [
  { name: 'steering_wheel', size: [0.4, 0.4, 0.05], pos: [0.38, 0.78, 0.62] },
  { name: 'steering_column', size: [0.1, 0.1, 0.4], pos: [0.38, 0.72, 0.45] },
  { name: 'steering_trim', size: [0.42, 0.06, 0.06], pos: [0.38, 0.58, 0.62] },
  { name: 'Leather_red', size: [1.4, 0.1, 1.6], pos: [0, 0.55, 0.1] },
  { name: 'leather_black', size: [1.3, 0.3, 0.2], pos: [0, 0.72, -0.55] },
  { name: 'interior_door_l', size: [0.08, 0.45, 1.0], pos: [0.8, 0.62, 0.05] },
  { name: 'interior_door_r', size: [0.08, 0.45, 1.0], pos: [-0.8, 0.62, 0.05] },
  { name: 'interior_panel', size: [1.3, 0.35, 0.1], pos: [0, 0.75, -0.85] },
  { name: 'carpet', size: [1.3, 0.03, 1.5], pos: [0, 0.3, 0.05] },
  { name: 'carpet_floor', size: [1.2, 0.03, 0.8], pos: [0, 0.32, -0.7] },
  { name: 'nuts', size: [0.05, 0.05, 0.05], pos: [0.3, 0.4, 0.8] },
  { name: 'nuts_1', size: [0.05, 0.05, 0.05], pos: [0.2, 0.82, 0.85] },
  { name: 'wipers', size: [1.2, 0.04, 0.06], pos: [0, 0.9, 1.15] },
  { name: 'centre_console', size: [0.3, 0.25, 1.1], pos: [0, 0.55, -0.1] },
  { name: 'center_stack', size: [0.5, 0.2, 0.08], pos: [0, 0.8, 0.55] },
  { name: 'seat_left', size: [0.55, 0.7, 0.5], pos: [0.38, 0.62, -0.2] },
  { name: 'seat_right', size: [0.55, 0.7, 0.5], pos: [-0.38, 0.62, -0.2] },
  { name: 'seatbelt_l', size: [0.06, 0.55, 0.04], pos: [0.62, 0.75, -0.3] },
  { name: 'dashboard', size: [1.4, 0.3, 0.35], pos: [0, 0.72, 0.75] },
  { name: 'dash_gauges', size: [0.45, 0.15, 0.06], pos: [0.38, 0.85, 0.7] },
]

const WHEEL_MESH_NAMES = [
  'tire_fl', 'rim_fl', 'tire_fr', 'rim_fr',
  'tire_rl', 'rim_rl', 'tire_rr', 'rim_rr',
] as const

const RETAINED_NAMES = [...PANELS.map((p) => p.name), ...WHEEL_MESH_NAMES]
const INTERIOR_NAMES = INTERIOR.map((p) => p.name)

function triangleTable(names: readonly string[], total: number): Record<string, number> {
  const parts = distribute(total, names.length)
  const table: Record<string, number> = {}
  names.forEach((name, i) => {
    table[name] = parts[i]!
  })
  return table
}

const RETAINED_TRIANGLES = triangleTable(RETAINED_NAMES, SRC_RETAINED_TRIANGLES)
const CULLED_TRIANGLES = triangleTable(INTERIOR_NAMES, SRC_CULLED_TRIANGLES)

const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0)

// ── fixture builders ────────────────────────────────────────────────────────
interface CarOptions {
  /** Yaw applied to the source group — exercises all four `resolveForwardYaw` branches. */
  srcYaw?: number
  /** Where the source's own origin sits. The fit must cancel it entirely. */
  originOffset?: Vec3
  /** Rename the corner groups so `findWheelCorners` falls back to quadrant clustering. */
  namedCorners?: boolean
  /** Omit the interior meshes (23 retained meshes instead of 31). */
  noInterior?: boolean
}

/**
 * Build the synthetic equivalent of `public/models/ferrari.glb`: 51 meshes,
 * 358,788 triangles, nose on +Z, length on Z, contact patch at y = 0, with the
 * same asymmetric hub positions and front overhang as the real asset.
 *
 * Two source frames are represented, as they are in the real GLB: bodywork is
 * authored about the body centre (offset by `Z_BIAS` from the axle midpoint),
 * while the wheel corners are authored about the axles themselves.
 */
function buildCarSource(options: CarOptions = {}): Group {
  const { srcYaw = 0, originOffset = [0, 0, 0], namedCorners = true, noInterior = false } = options

  const src = new Group()
  src.name = 'FerrariGLBScene'
  src.rotation.y = srcYaw
  src.position.set(originOffset[0], originOffset[1], originOffset[2])

  for (const panel of PANELS) {
    src.add(
      boxMesh(
        panel.name,
        panel.size,
        [panel.pos[0], panel.pos[1], panel.pos[2] + Z_BIAS],
        RETAINED_TRIANGLES[panel.name]!,
      ),
    )
  }

  if (!noInterior) {
    const byName = new Map<string, Mesh>()
    for (const part of INTERIOR) {
      byName.set(
        part.name,
        boxMesh(
          part.name,
          part.size,
          [part.pos[0], part.pos[1], part.pos[2] + Z_BIAS],
          CULLED_TRIANGLES[part.name]!,
        ),
      )
    }
    // `steering_trim` hangs off `steering_wheel` and `nuts_1` off `dashboard`,
    // so the cull must remove 18 subtrees covering 20 meshes — not 20 subtrees.
    byName.get('steering_trim')!.position.set(0, -0.2, 0)
    byName.get('steering_wheel')!.add(byName.get('steering_trim')!)
    byName.get('nuts_1')!.position.set(0.2, 0.1, 0.1)
    byName.get('dashboard')!.add(byName.get('nuts_1')!)
    for (const name of INTERIOR_NAMES) {
      const mesh = byName.get(name)!
      if (mesh.parent === null) src.add(mesh)
    }
  }

  for (const corner of WHEEL_CORNERS) {
    const isFront = corner.startsWith('F')
    const group = new Group()
    group.name = namedCorners ? `wheel_${corner.toLowerCase()}` : `hub_${corner.toLowerCase()}`
    group.position.set(WHEEL_X[corner], WHEEL_Y, isFront ? HALF_WB : -HALF_WB)

    // Unnamed corners get reversed codes (`tire_lf`) so nothing accidentally
    // resolves through `wheelCornerFromName`.
    const suffix = namedCorners
      ? corner.toLowerCase()
      : corner[1]!.toLowerCase() + corner[0]!.toLowerCase()
    group.add(
      boxMesh(`tire_${suffix}`, TYRE_SIZE, [0, 0, 0], RETAINED_TRIANGLES[`tire_${namedCorners ? corner.toLowerCase() : suffix}`]!),
      // Strictly inside the tyre box, so `cornerTyreBox` is driven by the tyre.
      boxMesh(`rim_${suffix}`, RIM_SIZE, [0, 0, 0], RETAINED_TRIANGLES[`rim_${namedCorners ? corner.toLowerCase() : suffix}`]!),
    )
    src.add(group)
  }

  src.updateMatrixWorld(true)
  return src
}

/** Wrap a source the way `normalizeGltf` does: identity root → identity inner → source. */
function wrapForFit(source: Group): { root: Group; inner: Group; src: Group } {
  const root = createShellRoot()
  const inner = new Group()
  inner.name = 'BodyInner'
  inner.add(source)
  root.add(inner)
  root.updateMatrixWorld(true)
  return { root, inner, src: source }
}

/** The measured fixture, culled and wrapped, ready for `fitShellToContract`. */
function buildCar(options: CarOptions & { cull?: boolean } = {}) {
  const wrapped = wrapForFit(buildCarSource(options))
  if (options.cull !== false) cullInteriorMeshes(wrapped.root)
  wrapped.root.updateMatrixWorld(true)
  return wrapped
}

/** A culled source group on its own, for the helpers that take a bare root. */
function buildCulledCarSource(options: CarOptions = {}): Group {
  const src = buildCarSource(options)
  cullInteriorMeshes(src)
  src.updateMatrixWorld(true)
  return src
}

interface RigOptions {
  headZ?: number | null
  tailZ?: number | null
  grillZ?: number | null
  grillSpan?: number
  srcYaw?: number
}

/** A minimal nose-cue rig: one shell box plus lamp / grille slabs. */
function buildRig({
  headZ = 2.2,
  tailZ = -2.0,
  grillZ = null,
  grillSpan = 0.1,
  srcYaw = 0,
}: RigOptions = {}): Group {
  const src = new Group()
  src.rotation.y = srcYaw
  src.add(boxMesh('body', [1.9, 0.6, 4.5], [0, 0.6, 0], 400))
  if (headZ !== null) src.add(boxMesh('lights', [1.6, 0.12, 0.05], [0, 0.8, headZ], 120))
  if (tailZ !== null) src.add(boxMesh('lights_red', [1.6, 0.1, 0.05], [0, 0.85, tailZ], 90))
  if (grillZ !== null) src.add(boxMesh('grills', [1.7, 0.3, grillSpan], [0, 0.5, grillZ], 200))
  src.updateMatrixWorld(true)
  return src
}

// ── assertion helpers ───────────────────────────────────────────────────────
/** World position of the first mesh named `name` under `root`. */
function worldPosOf(root: Object3D, name: string): Vector3 {
  root.updateMatrixWorld(true)
  const mesh = collectMeshes(root).find((m) => m.name === name)
  if (!mesh) throw new Error(`fixture: no mesh named ${name}`)
  return mesh.getWorldPosition(new Vector3())
}

/**
 * Component-wise comparison rather than `toEqual` on the tuple: `measureAnchors`
 * rounds with `Math.round`, which returns **−0** for small negative values, and
 * `toEqual` distinguishes −0 from +0. These anchors are correct to 0.05 mm.
 */
function expectVec3(actual: readonly number[], expected: Vec3, digits = 4): void {
  expect(actual).toHaveLength(3)
  for (let i = 0; i < 3; i++) {
    expect(actual[i]!, `component ${i}`).toBeCloseTo(expected[i]!, digits)
  }
}

/** The three box dimensions, sorted — a rotation-invariant shape signature. */
function sortedDims(object: Object3D): number[] {
  const size = unionBox([object]).getSize(new Vector3())
  return [size.x, size.y, size.z].sort((a, b) => a - b)
}

/** The 3×3 basis columns of a world matrix. */
function basisColumns(object: Object3D): [Vector3, Vector3, Vector3] {
  const e = object.matrixWorld.elements
  return [
    new Vector3(e[0]!, e[1]!, e[2]!),
    new Vector3(e[4]!, e[5]!, e[6]!),
    new Vector3(e[8]!, e[9]!, e[10]!),
  ]
}

// ═══════════════════════════════════════════════════════════════════════════
describe('the fixture reproduces the measured arithmetic', () => {
  it('has 51 meshes totalling 358,788 triangles', () => {
    const src = buildCarSource()
    expect(collectMeshes(src)).toHaveLength(SRC_CULLED_MESHES + SRC_RETAINED_MESHES)
    expect(countTriangles(src)).toBe(SRC_TOTAL_TRIANGLES)
  })

  it('splits into 116,850 culled (20 meshes) and 241,938 retained (31 meshes)', () => {
    expect(RETAINED_NAMES).toHaveLength(SRC_RETAINED_MESHES)
    expect(INTERIOR_NAMES).toHaveLength(SRC_CULLED_MESHES)
    expect(sum(Object.values(RETAINED_TRIANGLES))).toBe(SRC_RETAINED_TRIANGLES)
    expect(sum(Object.values(CULLED_TRIANGLES))).toBe(SRC_CULLED_TRIANGLES)
    expect(SRC_CULLED_TRIANGLES + SRC_RETAINED_TRIANGLES).toBe(SRC_TOTAL_TRIANGLES)
  })

  it('gives every mesh at least one real box', () => {
    for (const triangles of [...Object.values(RETAINED_TRIANGLES), ...Object.values(CULLED_TRIANGLES)]) {
      expect(triangles).toBeGreaterThanOrEqual(MIN_BOX_TRIANGLES)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('isCulledName', () => {
  it('catches every observed interior mesh name', () => {
    for (const name of INTERIOR_NAMES) {
      expect(isCulledName(name), `${name} should be culled`).toBe(true)
    }
  })

  it('never false-positives on retained exterior bodywork', () => {
    for (const name of RETAINED_NAMES) {
      expect(isCulledName(name), `${name} must survive the cull`).toBe(false)
    }
  })

  it('never false-positives on the specific names called out in the brief', () => {
    for (const name of ['body', 'glass', 'chrome', 'grills', 'lights', 'wheel', 'rim_fl', 'tire']) {
      expect(isCulledName(name), name).toBe(false)
    }
  })

  it('matches every CULL_DENYLIST token, case-insensitively and as a substring', () => {
    for (const token of CULL_DENYLIST) {
      expect(isCulledName(token), token).toBe(true)
      expect(isCulledName(token.toUpperCase()), token).toBe(true)
      expect(isCulledName(`prefix_${token}_suffix`), token).toBe(true)
    }
  })

  it('treats `Leather_red` as interior despite the capital L', () => {
    expect(isCulledName('Leather_red')).toBe(true)
  })

  it('returns false for null, undefined and the empty string', () => {
    expect(isCulledName(null)).toBe(false)
    expect(isCulledName(undefined)).toBe(false)
    expect(isCulledName('')).toBe(false)
  })

  it('never culls the root node, even when the root itself is named badly', () => {
    const root = new Group()
    root.name = 'interior'
    root.add(boxMesh('body', [1, 1, 1], [0, 0.5, 0], 12))
    const result = cullInteriorMeshes(root)
    expect(result.removedNames).toEqual([])
    expect(root.children).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('wheelCornerFromName', () => {
  it('resolves two-letter codes in either order', () => {
    expect(wheelCornerFromName('wheel_fl')).toBe('FL')
    expect(wheelCornerFromName('wheel_fr')).toBe('FR')
    expect(wheelCornerFromName('wheel_rl')).toBe('RL')
    expect(wheelCornerFromName('wheel_rr')).toBe('RR')
    expect(wheelCornerFromName('wheellf')).toBe('FL')
    expect(wheelCornerFromName('wheelrf')).toBe('FR')
    expect(wheelCornerFromName('WheelFR')).toBe('FR')
    expect(wheelCornerFromName('WHEEL_RR')).toBe('RR')
  })

  it('resolves spelled-out tokens in either order', () => {
    expect(wheelCornerFromName('wheel_front_left')).toBe('FL')
    expect(wheelCornerFromName('wheelfrontright')).toBe('FR')
    expect(wheelCornerFromName('wheel_rear_left')).toBe('RL')
    expect(wheelCornerFromName('wheel_left_rear')).toBe('RL')
    expect(wheelCornerFromName('wheel right rear')).toBe('RR')
  })

  it('requires the `wheel` prefix', () => {
    expect(wheelCornerFromName('tire_fl')).toBeNull()
    expect(wheelCornerFromName('rim_fl')).toBeNull()
    expect(wheelCornerFromName('hub_fl')).toBeNull()
    expect(wheelCornerFromName('fl_wheel')).toBeNull()
  })

  it('rejects names with no unambiguous corner rather than guessing', () => {
    // `wheelbase` and `wheels` both start with `wheel`; a naive `includes('f')`
    // / `includes('r')` test would read `wheel_fr` as ambiguous and these as FR.
    expect(wheelCornerFromName('wheel')).toBeNull()
    expect(wheelCornerFromName('wheels')).toBeNull()
    expect(wheelCornerFromName('wheelbase')).toBeNull()
    expect(wheelCornerFromName('wheel_front')).toBeNull()
    expect(wheelCornerFromName('wheel_left')).toBeNull()
  })

  it('rejects an over-long tail', () => {
    expect(wheelCornerFromName('wheel_front_left_upper_wishbone_mount')).toBeNull()
  })

  it('returns null for null, undefined and the empty string', () => {
    expect(wheelCornerFromName(null)).toBeNull()
    expect(wheelCornerFromName(undefined)).toBeNull()
    expect(wheelCornerFromName('')).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('isTyrePart', () => {
  it('recognises every spelling of rolling stock', () => {
    for (const name of ['tire', 'tyre', 'wheel_fl', 'rim_rr', 'Rim.RR', 'frontRim', 'rim1', 'Wheel']) {
      expect(isTyrePart(name), name).toBe(true)
    }
  })

  it('rejects bodywork', () => {
    for (const name of ['body', 'glass', 'brake', 'chrome', 'grills', 'lights', 'bonnet', 'undertray']) {
      expect(isTyrePart(name), name).toBe(false)
    }
  })

  /**
   * REGRESSION — `rim` used to be a bare substring token, so `chrome_trim`,
   * `steering_trim` and any other `*trim*` mesh was classified as rolling
   * stock. That let `findWheelCorners`' quadrant fallback try to steer a trim
   * strip, let `cornerTyreBox` inflate the measured wheel radius, and let
   * `measureAnchors` drop a trim mesh from the engine-bay floor candidates.
   */
  it('does not mistake `trim` for `rim`', () => {
    expect(isTyrePart('chrome_trim')).toBe(false)
    expect(isTyrePart('steering_trim')).toBe(false)
    expect(isTyrePart('body_trim')).toBe(false)
    expect(isTyrePart('trim')).toBe(false)
    expect(isTyrePart('Trim_Rear')).toBe(false)
  })

  it('returns false for null, undefined and the empty string', () => {
    expect(isTyrePart(null)).toBe(false)
    expect(isTyrePart(undefined)).toBe(false)
    expect(isTyrePart('')).toBe(false)
  })

  it('flags exactly the eight wheel meshes of the measured fixture', () => {
    const tyres = collectMeshes(buildCarSource())
      .filter((m) => isTyrePart(m.name))
      .map((m) => m.name)
    expect(tyres.sort()).toEqual([...WHEEL_MESH_NAMES].sort())
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('countTriangles', () => {
  it('counts a plain box as 12', () => {
    expect(countTriangles(new Mesh(new BoxGeometry(1, 1, 1), SHARED_MATERIAL))).toBe(12)
  })

  it('counts index-padded geometry exactly', () => {
    expect(countTriangles(new Mesh(unitBox(1234), SHARED_MATERIAL))).toBe(1234)
  })

  it('sums a whole hierarchy', () => {
    const root = new Group()
    root.add(boxMesh('a', [1, 1, 1], [0, 0, 0], 100))
    const nested = new Group()
    nested.add(boxMesh('b', [1, 1, 1], [0, 0, 0], 250))
    root.add(nested)
    expect(countTriangles(root)).toBe(350)
  })

  it('handles non-indexed geometry via the position attribute', () => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3))
    expect(geometry.index).toBeNull()
    expect(countTriangles(new Mesh(geometry, SHARED_MATERIAL))).toBe(1)
  })

  it('returns 0 for an empty group and ignores non-mesh nodes', () => {
    const root = new Group()
    root.add(new Group())
    expect(countTriangles(new Group())).toBe(0)
    expect(countTriangles(root)).toBe(0)
  })

  it('ignores degenerate padding — the fixture total is the real total', () => {
    expect(countTriangles(buildCarSource())).toBe(SRC_TOTAL_TRIANGLES)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('collectMeshes / unionBox', () => {
  it('collects meshes in traversal order and skips groups', () => {
    const meshes = collectMeshes(buildCarSource())
    expect(meshes).toHaveLength(SRC_CULLED_MESHES + SRC_RETAINED_MESHES)
    expect(meshes.every((m) => m.isMesh)).toBe(true)
    // Panels are added first, so the first collected mesh is the body.
    expect(meshes[0]!.name).toBe('body')
  })

  it('measures a tight world AABB that grows with rotation', () => {
    const src = new Group()
    const slab = boxMesh('slab', [2, 0.1, 0.1], [0, 0, 0], 12)
    src.add(slab)
    src.updateMatrixWorld(true)
    expect(unionBox([src]).getSize(new Vector3()).x).toBeCloseTo(2, 6)

    slab.rotation.z = Math.PI / 4
    src.updateMatrixWorld(true)
    const size = unionBox([src]).getSize(new Vector3())
    const expected = (2 + 0.1) * Math.SQRT1_2
    expect(size.x).toBeCloseTo(expected, 5)
    expect(size.y).toBeCloseTo(expected, 5)
  })

  it('agrees between precise and conservative mode for an unrotated box shell', () => {
    const src = buildCarSource()
    const precise = unionBox([src], true).getSize(new Vector3())
    const loose = unionBox([src], false).getSize(new Vector3())
    expect(precise.x).toBeCloseTo(loose.x, 6)
    expect(precise.y).toBeCloseTo(loose.y, 6)
    expect(precise.z).toBeCloseTo(loose.z, 6)
  })

  it('returns an empty box for no objects', () => {
    expect(unionBox([]).isEmpty()).toBe(true)
  })

  it('unions disjoint meshes into the source envelope', () => {
    const box = unionBox(collectMeshes(buildCarSource()))
    expect(box.min.x).toBeCloseTo(-1.128543, 5)
    expect(box.max.x).toBeCloseTo(1.128543, 5)
    expect(box.min.y).toBeCloseTo(0, 6)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('cullInteriorMeshes', () => {
  it('removes exactly the 20 interior meshes and nothing else', () => {
    const remaining = collectMeshes(buildCar().root).map((m) => m.name).sort()
    expect(remaining).toHaveLength(SRC_RETAINED_MESHES)
    expect(remaining).toEqual([...RETAINED_NAMES].sort())
  })

  it('reports 116,850 removed triangles and 20 removed mesh names', () => {
    const result = cullInteriorMeshes(buildCarSource())
    expect(result.removedTriangles).toBe(SRC_CULLED_TRIANGLES)
    expect(result.removedNames).toHaveLength(SRC_CULLED_MESHES)
    expect(new Set(result.removedNames).size, 'a mesh was reported twice').toBe(SRC_CULLED_MESHES)
    for (const name of INTERIOR_NAMES) {
      expect(result.removedNames, `${name} was not reported`).toContain(name)
    }
  })

  it('leaves exactly 241,938 triangles across 31 meshes', () => {
    const src = buildCarSource()
    expect(countTriangles(src)).toBe(SRC_TOTAL_TRIANGLES)
    const { root } = wrapForFit(src)
    const result = cullInteriorMeshes(root)
    expect(result.removedTriangles).toBe(SRC_CULLED_TRIANGLES)
    expect(countTriangles(root)).toBe(SRC_RETAINED_TRIANGLES)
    expect(collectMeshes(root)).toHaveLength(SRC_RETAINED_MESHES)
    expect(SRC_TOTAL_TRIANGLES - SRC_CULLED_TRIANGLES).toBe(SRC_RETAINED_TRIANGLES)
  })

  it('removes each nested subtree exactly once', () => {
    const { root } = wrapForFit(buildCarSource())
    const result = cullInteriorMeshes(root)
    expect(result.removedNames.filter((n) => n === 'steering_trim')).toHaveLength(1)
    expect(result.removedNames.filter((n) => n === 'nuts_1')).toHaveLength(1)
    const remaining = collectMeshes(root).map((m) => m.name)
    expect(remaining).not.toContain('steering_trim')
    expect(remaining).not.toContain('nuts_1')
    expect(remaining).not.toContain('steering_wheel')
    expect(remaining).not.toContain('dashboard')
  })

  it('does not change the shell union box — the interior sits inside the bodywork', () => {
    const without = unionBox([buildCarSource({ noInterior: true })]).getSize(new Vector3())
    const withInterior = unionBox([buildCarSource()]).getSize(new Vector3())
    expect(withInterior.x).toBeCloseTo(without.x, 6)
    expect(withInterior.y).toBeCloseTo(without.y, 6)
    expect(withInterior.z).toBeCloseTo(without.z, 6)
  })

  it('does not dispose anything by default', () => {
    expect(cullInteriorMeshes(buildCarSource()).disposed).toEqual({ geometries: 0, materials: 0 })
  })

  it('disposes only geometry that no retained mesh still references', () => {
    const root = new Group()
    root.add(freshBox(60, new MeshBasicMaterial(), 'dashboard'))
    root.add(freshBox(60, new MeshBasicMaterial(), 'body'))
    const result = cullInteriorMeshes(root, true)
    expect(result.disposed).toEqual({ geometries: 1, materials: 1 })
    expect(collectMeshes(root).map((m) => m.name)).toEqual(['body'])
  })

  it('keeps a material that a retained mesh still shares', () => {
    // `Leather_red` backs both interior trim and exterior trim in the real asset,
    // so a material may only be freed once NO retained mesh uses it.
    const shared = new MeshBasicMaterial()
    const root = new Group()
    root.add(freshBox(60, shared, 'leather_trim_panel'))
    root.add(freshBox(60, shared, 'body'))
    const result = cullInteriorMeshes(root, true)
    expect(result.disposed.geometries).toBe(1)
    expect(result.disposed.materials, 'the shared material must survive').toBe(0)
  })

  it('disposes every entry of a multi-material mesh', () => {
    const root = new Group()
    root.add(freshBox(60, [new MeshBasicMaterial(), new MeshBasicMaterial()], 'seat'))
    expect(cullInteriorMeshes(root, true).disposed.materials).toBe(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('resolveNoseEvidence', () => {
  it('prefers the lamp pair over a grille mesh that spans the whole car', () => {
    // `grills` here is 4.3 m long and centred — exactly the real asset's failure
    // mode, where the grille centroid lands within 5 cm of the shell centre.
    const evidence = resolveNoseEvidence(buildCulledCarSource(), false)
    expect(evidence.cue).toBe('lampPair')
    expect(evidence.sign).toBe(1)
    expect(evidence.headLamps).toEqual(['lights', 'light_indicator_l', 'light_indicator_r'])
    expect(evidence.tailLamps).toEqual(['lights_red'])
    expect(evidence.grills).toEqual(['grills', 'grille_front'])
  })

  it('is +1 when the headlamps are at +Z and −1 when they are at −Z', () => {
    expect(resolveNoseEvidence(buildRig({ headZ: 2.2, tailZ: -2.0 }), false).sign).toBe(1)
    expect(resolveNoseEvidence(buildRig({ headZ: -2.2, tailZ: 2.0 }), false).sign).toBe(-1)
  })

  it('falls back to headLamps alone, measured against the shell centre', () => {
    const forward = resolveNoseEvidence(buildRig({ headZ: 2.2, tailZ: null }), false)
    expect(forward.cue).toBe('headLamps')
    expect(forward.sign).toBe(1)
    const backward = resolveNoseEvidence(buildRig({ headZ: -2.2, tailZ: null }), false)
    expect(backward.cue).toBe('headLamps')
    expect(backward.sign).toBe(-1)
  })

  it('falls back to tailLamps alone, measured against the shell centre', () => {
    const evidence = resolveNoseEvidence(buildRig({ headZ: null, tailZ: -2.0 }), false)
    expect(evidence.cue).toBe('tailLamps')
    expect(evidence.sign).toBe(1)
  })

  it('uses the grille centroid only as a last resort', () => {
    const evidence = resolveNoseEvidence(
      buildRig({ headZ: null, tailZ: null, grillZ: 1.5, grillSpan: 0.4 }),
      false,
    )
    expect(evidence.cue).toBe('grills')
    expect(evidence.sign).toBe(1)
  })

  it('reports cue `none` when the only candidate is symmetric about the centre', () => {
    const evidence = resolveNoseEvidence(buildRig({ headZ: null, tailZ: null, grillZ: 0, grillSpan: 4.4 }), false)
    expect(evidence.cue).toBe('none')
    expect(evidence.sign).toBe(0)
  })

  it('reports cue `none` for a shell with no lamps and no grilles at all', () => {
    const evidence = resolveNoseEvidence(buildRig({ headZ: null, tailZ: null }), false)
    expect(evidence.cue).toBe('none')
    expect(evidence.sign).toBe(0)
  })

  it('measures along X when told the length axis is X', () => {
    const evidence = resolveNoseEvidence(buildRig({ srcYaw: Math.PI / 2 }), true)
    expect(evidence.cue).toBe('lampPair')
    expect(evidence.sign).toBe(1)
  })

  it('weights the centroid by triangle count, so a big cluster is not outvoted', () => {
    const src = new Group()
    src.add(boxMesh('body', [1.9, 0.6, 4.5], [0, 0.6, 0], 400))
    // One heavy headlamp at +Z against three featherweight ones at −Z.
    src.add(boxMesh('lights', [1.6, 0.12, 0.05], [0, 0.8, 2.0], 5000))
    src.add(boxMesh('light_a', [0.1, 0.1, 0.05], [0, 0.8, -2.0], 12))
    src.add(boxMesh('light_b', [0.1, 0.1, 0.05], [0, 0.8, -2.0], 12))
    src.add(boxMesh('light_c', [0.1, 0.1, 0.05], [0, 0.8, -2.0], 12))
    src.add(boxMesh('lights_red', [1.6, 0.1, 0.05], [0, 0.85, -2.2], 90))
    src.updateMatrixWorld(true)
    const evidence = resolveNoseEvidence(src, false)
    expect(evidence.cue).toBe('lampPair')
    expect(evidence.sign, 'the 5,000-triangle cluster must outvote 3× 12').toBe(1)
  })

  it('treats sub-0.1 mm lamp separation as noise, not a decision', () => {
    const src = new Group()
    src.add(boxMesh('body', [1.9, 0.6, 4.5], [0, 0.6, 0], 400))
    src.add(boxMesh('lights', [1.6, 0.12, 0.05], [0, 0.8, 0], 120))
    src.add(boxMesh('lights_red', [1.6, 0.1, 0.05], [0, 0.85, 1e-6], 120))
    src.updateMatrixWorld(true)
    const evidence = resolveNoseEvidence(src, false)
    expect(evidence.cue).toBe('none')
    expect(evidence.sign).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('resolveForwardYaw', () => {
  it('is 0 when the length is on Z and the nose already points at +Z', () => {
    expect(resolveForwardYaw(buildRig())).toBe(0)
  })

  it('is π when the length is on Z and the nose points at −Z', () => {
    expect(resolveForwardYaw(buildRig({ headZ: -2.2, tailZ: 2.0 }))).toBeCloseTo(Math.PI, 12)
  })

  it('is −π/2 when the length is on X and the nose points at +X', () => {
    expect(resolveForwardYaw(buildRig({ srcYaw: Math.PI / 2 }))).toBeCloseTo(-Math.PI / 2, 12)
  })

  it('is +π/2 when the length is on X and the nose points at −X', () => {
    expect(resolveForwardYaw(buildRig({ srcYaw: -Math.PI / 2 }))).toBeCloseTo(Math.PI / 2, 12)
  })

  it('is 0 for the measured fixture, which the GLB already authored nose-forward', () => {
    expect(resolveForwardYaw(buildCulledCarSource())).toBe(0)
  })

  it('keeps the length axis where it is when there is no cue at all', () => {
    expect(resolveForwardYaw(buildRig({ headZ: null, tailZ: null }))).toBe(0)
    expect(resolveForwardYaw(buildRig({ headZ: null, tailZ: null, srcYaw: Math.PI / 2 })))
      .toBeCloseTo(-Math.PI / 2, 12)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('findWheelCorners', () => {
  it('finds all four corners from their group names', () => {
    const corners = findWheelCorners(buildCulledCarSource())
    for (const corner of WHEEL_CORNERS) {
      expect(corners[corner], `${corner} missing`).toBeDefined()
      expect(corners[corner]!.name).toBe(`wheel_${corner.toLowerCase()}`)
    }
  })

  /**
   * REGRESSION — the quadrant fallback used to read `_pos.x >= 0 ? 'R' : 'L'`,
   * contradicting both the named path and `DRIVER_SIDE_X`: +X is the driver's
   * side, which for this left-hand-drive contract is the car's LEFT, and the
   * measured `wheelFL.x` is +0.8555. Mirrored corners made `Wheels.tsx` steer
   * the REAR axle on any model with no corner labels.
   */
  it('fallback: labels +X as the LEFT side, agreeing with the named path', () => {
    const named = findWheelCorners(buildCulledCarSource({ namedCorners: true }))
    const fell = findWheelCorners(buildCulledCarSource({ namedCorners: false }))

    for (const corner of WHEEL_CORNERS) {
      expect(fell[corner], `${corner} not resolved by the fallback`).toBeDefined()
      const a = named[corner]!.getWorldPosition(new Vector3())
      const b = fell[corner]!.getWorldPosition(new Vector3())
      expect(b.x, `${corner}.x`).toBeCloseTo(a.x, 9)
      expect(b.y, `${corner}.y`).toBeCloseTo(a.y, 9)
      expect(b.z, `${corner}.z`).toBeCloseTo(a.z, 9)
    }
  })

  it('fallback: FL sits at +X and +Z when DRIVER_SIDE_X is +1', () => {
    const corners = findWheelCorners(buildCulledCarSource({ namedCorners: false }))
    const at = (c: WheelCorner) => corners[c]!.getWorldPosition(new Vector3())
    expect(Math.sign(at('FL').x) * DRIVER_SIDE_X).toBe(1)
    expect(Math.sign(at('FR').x) * DRIVER_SIDE_X).toBe(-1)
    expect(Math.sign(at('RL').x) * DRIVER_SIDE_X).toBe(1)
    expect(Math.sign(at('RR').x) * DRIVER_SIDE_X).toBe(-1)
    expect(at('FL').z).toBeGreaterThan(0)
    expect(at('FR').z).toBeGreaterThan(0)
    expect(at('RL').z).toBeLessThan(0)
    expect(at('RR').z).toBeLessThan(0)
  })

  it('ignores body trim that merely contains the letters `rim`', () => {
    const src = new Group()
    src.add(boxMesh('chrome_trim', [1.9, 0.04, 0.6], [0, 0.7, 0], 12))
    src.add(boxMesh('tire_fl', [0.27, 0.72, 0.72], [0.84, 0.36, 1.33], 12))
    src.updateMatrixWorld(true)
    const corners = findWheelCorners(src)
    expect(corners.FL?.name).toBe('tire_fl')
    expect(Object.values(corners).some((node) => node?.name === 'chrome_trim')).toBe(false)
  })

  it('returns an empty record when there is no rolling stock at all', () => {
    expect(findWheelCorners(buildRig({ headZ: null, tailZ: null }))).toEqual({})
  })

  it('returns a partial record when only some corners exist', () => {
    const src = new Group()
    src.add(boxMesh('wheel_fl', [0.27, 0.72, 0.72], [0.84, 0.36, 1.33], 12))
    src.updateMatrixWorld(true)
    expect(Object.keys(findWheelCorners(src))).toEqual(['FL'])
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('axleStations', () => {
  it('averages each axle and reports the midpoint', () => {
    const stations = axleStations(findWheelCorners(buildCulledCarSource()))
    expect(stations).not.toBeNull()
    expect(stations!.frontZ).toBeCloseTo(HALF_WB, 9)
    expect(stations!.rearZ).toBeCloseTo(-HALF_WB, 9)
    expect(stations!.midZ).toBeCloseTo(0, 9)
    expect(stations!.midX).toBeCloseTo(0, 5)
    expect(Math.abs(stations!.frontZ - stations!.rearZ)).toBeCloseTo(SRC_WHEELBASE, 9)
  })

  it('returns null when an entire axle is missing', () => {
    const src = new Group()
    src.add(boxMesh('wheel_fl', [0.27, 0.72, 0.72], [0.84, 0.36, 1.33], 12))
    src.add(boxMesh('wheel_fr', [0.27, 0.72, 0.72], [-0.84, 0.36, 1.33], 12))
    src.updateMatrixWorld(true)
    expect(axleStations(findWheelCorners(src))).toBeNull()
  })

  it('returns null for no corners at all', () => {
    expect(axleStations({})).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('cornerTyreBox', () => {
  it('unions the tyre and rim but nothing else', () => {
    const corner = findWheelCorners(buildCulledCarSource()).FL!
    const box = cornerTyreBox(corner)
    expect(box).not.toBeNull()
    const size = box!.getSize(new Vector3())
    expect(size.x).toBeCloseTo(TYRE_SIZE[0], 9)
    expect(size.y).toBeCloseTo(TYRE_SIZE[1], 9)
    expect(size.z).toBeCloseTo(TYRE_SIZE[2], 9)
  })

  it('falls back to the node itself when it is a bare tyre mesh', () => {
    const box = cornerTyreBox(boxMesh('tire_fl', TYRE_SIZE, [0.84, WHEEL_Y, HALF_WB], 12))
    expect(box).not.toBeNull()
    expect(box!.getSize(new Vector3()).y).toBeCloseTo(TYRE_SIZE[1], 9)
  })

  it('returns null when the corner holds nothing', () => {
    expect(cornerTyreBox(new Group())).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('fitShellToContract — the measured fixture', () => {
  it('derives wheelbaseBefore 2.650547 and scale 1.018658', () => {
    const report = fitShellToContract(buildCar().inner)
    expect(report.wheelbaseBefore).toBeCloseTo(SRC_WHEELBASE, 6)
    expect(report.scale).toBeCloseTo(EXPECTED_SCALE, 6)
    expect(report.scale).toBeCloseTo(TARGET_WHEELBASE / SRC_WHEELBASE, 12)
    expect(report.usedWheelCorners).toBe(true)
    expect(report.yaw).toBe(0)
  })

  it('lands the measured wheelbase on exactly TARGET_WHEELBASE', () => {
    const { root, inner } = buildCar()
    fitShellToContract(inner)
    root.updateMatrixWorld(true)
    const stations = axleStations(findWheelCorners(inner))!
    expect(Math.abs(stations.frontZ - stations.rearZ)).toBeCloseTo(TARGET_WHEELBASE, 9)
    expect(stations.frontZ).toBeCloseTo(TARGET_WHEELBASE / 2, 6)
    expect(stations.rearZ).toBeCloseTo(-TARGET_WHEELBASE / 2, 6)
  })

  it('puts the lowest vertex on y = 0', () => {
    const { root, inner } = buildCar()
    fitShellToContract(inner)
    root.updateMatrixWorld(true)
    expect(unionBox([root]).min.y).toBeCloseTo(0, 9)
  })

  it('grounds the shell by exactly the height its source origin was authored at', () => {
    const lift = 0.44
    const { root, inner } = buildCar({ originOffset: [0, lift, 0] })
    const report = fitShellToContract(inner)
    root.updateMatrixWorld(true)
    expect(unionBox([root]).min.y).toBeCloseTo(0, 9)
    expect(report.groundOffset).toBeCloseTo(-lift * report.scale, 9)
    expect(report.groundOffset).toBeLessThan(0)
  })

  it('needs no ground offset when the contact patch is already at y = 0', () => {
    const report = fitShellToContract(buildCar().inner)
    expect(report.groundOffset).toBeCloseTo(0, 9)
  })

  it('centres the axle midpoint on x = 0 and z = 0', () => {
    const { root, inner } = buildCar()
    fitShellToContract(inner)
    root.updateMatrixWorld(true)
    const stations = axleStations(findWheelCorners(inner))!
    expect(stations.midX).toBeCloseTo(0, 9)
    expect(stations.midZ).toBeCloseTo(0, 9)
  })

  it('applies a UNIFORM scale — the matrix basis stays orthogonal and equal-length', () => {
    const { inner } = buildCar()
    const report = fitShellToContract(inner)
    inner.updateMatrixWorld(true)

    expect(inner.scale.x).toBe(inner.scale.y)
    expect(inner.scale.y).toBe(inner.scale.z)

    const [cx, cy, cz] = basisColumns(inner)
    for (const column of [cx, cy, cz]) {
      expect(column.length(), 'column length must equal the uniform scale').toBeCloseTo(report.scale, 9)
    }
    // A shear or a non-uniform scale would make one of these non-zero.
    expect(cx.dot(cy)).toBeCloseTo(0, 9)
    expect(cx.dot(cz)).toBeCloseTo(0, 9)
    expect(cy.dot(cz)).toBeCloseTo(0, 9)
  })

  it('preserves every aspect ratio — the fit is a pure similarity transform', () => {
    const before = sortedDims(buildCulledCarSource())
    const { root, inner } = buildCar()
    const report = fitShellToContract(inner)
    root.updateMatrixWorld(true)
    const after = sortedDims(root)

    expect(after).toHaveLength(3)
    for (let i = 0; i < 3; i++) {
      expect(after[i]! / before[i]!, `dimension ${i} scaled differently`).toBeCloseTo(report.scale, 6)
    }
  })

  it('resolves the nose onto +Z', () => {
    const { root, inner } = buildCar()
    fitShellToContract(inner)
    const head = worldPosOf(root, 'lights').z
    const tail = worldPosOf(root, 'lights_red').z
    expect(head).toBeGreaterThan(0)
    expect(tail).toBeLessThan(0)
    const size = unionBox([root]).getSize(new Vector3())
    expect(size.z, 'the length axis must end up on Z').toBeGreaterThan(size.x)
  })

  it.each([
    { label: 'nose +Z, length on Z', srcYaw: 0 },
    { label: 'nose −Z, length on Z', srcYaw: Math.PI },
    { label: 'nose +X, length on X', srcYaw: Math.PI / 2 },
    { label: 'nose −X, length on X', srcYaw: -Math.PI / 2 },
  ])('reaches the identical contract from $label', ({ srcYaw }) => {
    const { root, inner } = buildCar({ srcYaw })
    const report = fitShellToContract(inner)
    root.updateMatrixWorld(true)

    expect(report.wheelbaseBefore).toBeCloseTo(SRC_WHEELBASE, 6)
    expect(report.scale).toBeCloseTo(EXPECTED_SCALE, 6)
    expect(report.usedWheelCorners).toBe(true)

    const stations = axleStations(findWheelCorners(inner))!
    expect(Math.abs(stations.frontZ - stations.rearZ)).toBeCloseTo(TARGET_WHEELBASE, 6)
    expect(stations.midX).toBeCloseTo(0, 6)
    expect(stations.midZ).toBeCloseTo(0, 6)
    expect(unionBox([root]).min.y).toBeCloseTo(0, 6)

    const size = unionBox([root]).getSize(new Vector3())
    expect(size.z).toBeGreaterThan(size.x)
    expect(worldPosOf(root, 'lights').z).toBeGreaterThan(0)
    expect(worldPosOf(root, 'lights_red').z).toBeLessThan(0)
  })

  it.each([
    { label: 'the origin', offset: [0, 0, 0] as Vec3 },
    { label: 'a small offset', offset: [0.31, 0.44, -0.27] as Vec3 },
    { label: 'a large offset', offset: [-2.5, 1.75, 3.25] as Vec3 },
    { label: 'an absurd offset', offset: [12, -8, -40] as Vec3 },
  ])('is independent of where the source origin sits — $label', ({ offset }) => {
    const { root, inner } = buildCar({ originOffset: offset })
    fitShellToContract(inner)
    root.updateMatrixWorld(true)
    const anchors = measureAnchors(root)

    expect(anchors.wheelbase).toBeCloseTo(TARGET_WHEELBASE, 4)
    expectVec3(anchors.wheelFL, [0.8555, 0.3647, 1.35])
    expect(anchors.roofY).toBeCloseTo(1.2591, 4)
    expect(anchors.overallWidth).toBeCloseTo(2.2992, 4)
    expect(unionBox([root]).min.y).toBeCloseTo(0, 6)
  })

  it('leaves the outer root at identity — the fit lives entirely on `inner`', () => {
    const { root, inner } = buildCar()
    fitShellToContract(inner)
    root.updateMatrixWorld(true)
    expect(inner.parent).toBe(root)
    expect(root.children).toHaveLength(1)
    expect(root.position.toArray()).toEqual([0, 0, 0])
    expect(root.scale.toArray()).toEqual([1, 1, 1])
    expect(Array.from(root.matrixWorld.elements)).toEqual([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ])
  })

  it('degrades safely when the shell has no wheels', () => {
    const { root, inner } = wrapForFit(buildRig())
    const report = fitShellToContract(inner)
    root.updateMatrixWorld(true)

    expect(report.usedWheelCorners).toBe(false)
    expect(report.scale).toBe(1)
    expect(report.wheelbaseBefore).toBe(0)
    // Still grounded, still nose-forward, still centred on X via the box fallback.
    expect(unionBox([root]).min.y).toBeCloseTo(0, 9)
    expect(worldPosOf(root, 'lights').z).toBeGreaterThan(0)
    expect(unionBox([root]).getCenter(new Vector3()).x).toBeCloseTo(0, 9)
  })

  it('does not yaw a nose-less shell onto its side', () => {
    const { root, inner } = wrapForFit(buildRig({ headZ: null, tailZ: null }))
    const report = fitShellToContract(inner)
    root.updateMatrixWorld(true)
    expect(report.yaw).toBe(0)
    const size = unionBox([root]).getSize(new Vector3())
    expect(size.z).toBeGreaterThan(size.x)
  })

  it('still fits from the quadrant fallback when the corner groups are unnamed', () => {
    const { root, inner } = buildCar({ namedCorners: false })
    const report = fitShellToContract(inner)
    root.updateMatrixWorld(true)

    expect(report.usedWheelCorners, 'the fallback must still resolve all four corners').toBe(true)
    expect(report.scale).toBeCloseTo(EXPECTED_SCALE, 6)
    const anchors = measureAnchors(root)
    expect(anchors.wheelbase).toBeCloseTo(TARGET_WHEELBASE, 4)
    expect(anchors.trackWidth).toBeCloseTo(1.6894, 4)
    expectVec3(anchors.wheelFL, [0.8555, 0.3647, 1.35])
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('measureAnchors', () => {
  function fitted() {
    const { root, inner } = buildCar()
    const fit = fitShellToContract(inner)
    root.updateMatrixWorld(true)
    return { root, fit, anchors: measureAnchors(root) }
  }

  it('reproduces the measured wheel hubs', () => {
    const { anchors } = fitted()
    expectVec3(anchors.wheelFL, [0.8555, 0.3647, 1.35])
    expectVec3(anchors.wheelFR, [-0.8469, 0.3647, 1.35])
    expectVec3(anchors.wheelRL, [0.8339, 0.3647, -1.35])
    expectVec3(anchors.wheelRR, [-0.8425, 0.3647, -1.35])
  })

  it('reproduces the measured tyre, track and wheelbase figures', () => {
    const { anchors } = fitted()
    expect(anchors.wheelRadius).toBeCloseTo(0.3647, 4)
    expect(anchors.wheelWidth).toBeCloseTo(0.2755, 4)
    expect(anchors.trackWidth).toBeCloseTo(1.6894, 4)
    expect(anchors.wheelbase).toBeCloseTo(TARGET_WHEELBASE, 4)
  })

  it('reproduces the measured overall envelope', () => {
    const { anchors } = fitted()
    expect(anchors.overallLength).toBeCloseTo(4.6182, 4)
    expect(anchors.overallWidth).toBeCloseTo(2.2992, 4)
    expect(anchors.roofY).toBeCloseTo(1.2591, 4)
    expect(anchors.frontNoseZ).toBeCloseTo(2.4826, 3)
    expect(anchors.rearZ).toBeCloseTo(-2.1355, 4)
    expect(anchors.frontNoseZ).toBeGreaterThan(0)
    expect(anchors.rearZ).toBeLessThan(0)
    // Both ends are rounded to 4 dp independently, hence the looser tolerance.
    expect(anchors.overallLength).toBeCloseTo(anchors.frontNoseZ - anchors.rearZ, 3)
  })

  /**
   * The settled ruling: the engine is at the FRONT. `bodyAnchors.ts` is the
   * authority and it puts `engineBayCenter.z` at +0.81, ahead of the cabin.
   */
  it('puts the engine bay FORWARD of the cabin — the engine is FRONT', () => {
    const { anchors } = fitted()
    expect(anchors.engineBayCenter[2]).toBeCloseTo(0.81, 2)
    expect(anchors.engineBayCenter[2]).toBeGreaterThan(0)
    expect(anchors.engineBayCenter[2]).toBeGreaterThan(anchors.cabinCenter[2])
    expect(anchors.engineBayCenter[0]).toBe(0)
  })

  it('derives the bay width from exactly ONE tyre width off the track', () => {
    const { anchors } = fitted()
    // Hub-to-hub minus one tyre width: the INNER faces, not the centres.
    expect(anchors.engineBaySize[0]).toBeCloseTo(1.4139, 4)
    expect(anchors.engineBaySize[0]).toBeCloseTo(anchors.trackWidth - anchors.wheelWidth, 4)
  })

  it('derives the bay length from ENGINE_BAY_LENGTH_FRACTION of the wheelbase', () => {
    const { anchors } = fitted()
    const frontZ = (anchors.wheelFL[2] + anchors.wheelFR[2]) / 2
    const bayLength = ENGINE_BAY_LENGTH_FRACTION * anchors.wheelbase
    expect(anchors.engineBaySize[2]).toBeCloseTo(bayLength, 4)
    expect(anchors.engineBaySize[2]).toBeCloseTo(1.08, 4)
    expect(anchors.engineBayCenter[2]).toBeCloseTo(frontZ - bayLength / 2, 4)
  })

  it('derives the bay height from BONNET_LINE_FRACTION down to the undertray', () => {
    const { anchors } = fitted()
    const bonnetY = anchors.roofY * BONNET_LINE_FRACTION
    const floorY = anchors.engineBayCenter[1] * 2 - bonnetY
    expect(anchors.engineBaySize[1]).toBeCloseTo(bonnetY - floorY, 4)
    expect(anchors.engineBaySize[1]).toBeCloseTo(0.7291, 3)
    expect(anchors.engineBayCenter[1]).toBeCloseTo(0.4916, 3)
    expect(floorY).toBeGreaterThan(0)
    expect(floorY).toBeLessThan(bonnetY)
  })

  it('takes the bay floor from the lowest RETAINED non-rolling-stock vertex', () => {
    const { anchors } = fitted()
    // `body_lower` is the lowest panel. The tyres are excluded on purpose: their
    // bottom IS the contact patch at y = 0, which would collapse the bay.
    const bonnetY = anchors.roofY * BONNET_LINE_FRACTION
    const floorY = anchors.engineBayCenter[1] * 2 - bonnetY
    expect(floorY).toBeCloseTo(BODY_LOWER_MIN_Y * S, 4)
  })

  it('takes the cabin centre from the glass bounding box', () => {
    const { anchors } = fitted()
    expectVec3(anchors.cabinCenter, [0, GLASS_CENTRE_Y * S, (GLASS_CENTRE_Z + Z_BIAS) * S], 4)
  })

  it('falls back to a roof-derived cabin centre when there is no glass', () => {
    const src = buildCulledCarSource()
    for (const mesh of collectMeshes(src)) {
      if (mesh.name.startsWith('glass')) mesh.name = 'clear_panel'
    }
    const { root, inner } = wrapForFit(src)
    fitShellToContract(inner)
    root.updateMatrixWorld(true)
    const anchors = measureAnchors(root)
    const frontZ = (anchors.wheelFL[2] + anchors.wheelFR[2]) / 2
    expectVec3(anchors.cabinCenter, [0, anchors.roofY * 0.62, frontZ * 0.25], 3)
  })

  it('reports the RETAINED triangle count, not the source count', () => {
    expect(fitted().anchors.bodyShellTriangleCount).toBe(SRC_RETAINED_TRIANGLES)
  })

  it('returns a zeroed hub when a corner is missing, and never emits NaN', () => {
    const src = buildCulledCarSource()
    const corner = findWheelCorners(src).RL!
    corner.parent!.remove(corner)
    const { root, inner } = wrapForFit(src)
    fitShellToContract(inner)
    root.updateMatrixWorld(true)
    const anchors = measureAnchors(root)

    expectVec3(anchors.wheelRL, [0, 0, 0])
    const scalars = [
      anchors.wheelRadius, anchors.wheelWidth, anchors.trackWidth, anchors.wheelbase,
      anchors.frontNoseZ, anchors.rearZ, anchors.roofY, anchors.overallLength,
      anchors.overallWidth, anchors.bodyShellTriangleCount,
      ...anchors.engineBayCenter, ...anchors.engineBaySize, ...anchors.cabinCenter,
      ...anchors.wheelFL, ...anchors.wheelFR, ...anchors.wheelRR,
    ]
    for (const value of scalars) {
      expect(Number.isFinite(value), `${value} is not finite`).toBe(true)
    }
  })

  it('is read-only — it does not move anything it measures', () => {
    const { root } = fitted()
    const before = Array.from(root.matrixWorld.elements)
    const innerBefore = Array.from(root.children[0]!.matrixWorld.elements)
    measureAnchors(root)
    expect(Array.from(root.matrixWorld.elements)).toEqual(before)
    expect(Array.from(root.children[0]!.matrixWorld.elements)).toEqual(innerBefore)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('createShellRoot', () => {
  it('is an identity group named CarBodyRoot with matrixAutoUpdate on', () => {
    const root = createShellRoot()
    expect(root.name).toBe('CarBodyRoot')
    expect(root.matrixAutoUpdate).toBe(true)
    expect(root.children).toHaveLength(0)
    expect(root.position.toArray()).toEqual([0, 0, 0])
    expect(root.scale.toArray()).toEqual([1, 1, 1])
    root.updateMatrixWorld(true)
    expect(Array.from(root.matrixWorld.elements)).toEqual([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ])
  })

  it('provides the identity parent the fit contract requires', () => {
    const { root, inner } = buildCar()
    const report = fitShellToContract(inner)
    root.updateMatrixWorld(true)
    // Because the parent is the identity, inner.matrixWorld IS the fit and the
    // anchors measured off `root` describe world space directly.
    expect(report.usedWheelCorners).toBe(true)
    expect(inner.parent).toBe(root)
    expect(inner.matrixWorld.elements[0]).toBeCloseTo(report.scale, 9)
    expect(unionBox([root]).min.y).toBeCloseTo(0, 9)
  })
})
