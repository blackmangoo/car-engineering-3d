import { Box3, Group, Vector3 } from 'three'
import type { Mesh, Object3D } from 'three'
import { DRIVER_SIDE_X, TARGET_WHEELBASE } from '@/three/body/bodyAnchors'
import type { BodyAnchors } from '@/three/body/bodyAnchors'
import type { Vec3Tuple } from '@/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * shellFit — the pure geometry half of the body asset pipeline
 * ─────────────────────────────────────────────────────────────────────────────
 * Everything here operates on an already-decoded THREE.Object3D hierarchy. There
 * is deliberately NO loader, material or React import in this module, so the
 * fit maths is unit-testable in plain node and reusable by the offline anchor
 * measurement that produced `BODY_ANCHORS`.
 *
 * Pipeline (see `normalizeGltf`):
 *   clone → cull interior → yaw so the nose faces +Z → uniform scale so the
 *   measured wheelbase === 2.7 m → translate the axle midpoint to x = z = 0 and
 *   the lowest vertex to y = 0 → measure anchors.
 */

// Reused scratch objects — never allocate inside a measure/fit call.
const _size = new Vector3()
const _centre = new Vector3()
const _pos = new Vector3()

/** Which corner of the car a wheel assembly belongs to. */
export type WheelCorner = 'FL' | 'FR' | 'RL' | 'RR'

export const WHEEL_CORNERS: readonly WheelCorner[] = ['FL', 'FR', 'RL', 'RR']

/**
 * Interior / non-shell meshes. Case-insensitive SUBSTRING match on the object
 * name. The lift-away ghost shell only needs exterior bodywork, so dropping
 * these takes the model from 358,788 to 241,938 triangles — inside budget, and
 * the discarded geometry is exactly what a ghost shell would never show anyway.
 */
export const CULL_DENYLIST = [
  'steering',
  'leather',
  'interior',
  'carpet',
  'nuts',
  'wipers',
  'centre',
  'center',
  'seat',
  'dashboard',
  'dash',
] as const

/** Tokens identifying the rolling stock of one wheel corner. */
const TYRE_TOKENS = ['tire', 'tyre', 'wheel'] as const
/**
 * `rim` is deliberately NOT in {@link TYRE_TOKENS}. At three characters it is
 * the only ambiguous token in the set: as a bare substring it also matches
 * `trim`, so `chrome_trim` / `steering_trim` / `body_trim` would be classified
 * as rolling stock. {@link isTyrePart} therefore tests `rim` against WORD
 * boundaries instead — see below.
 */
const RIM_TOKEN = 'rim'

/** Tokens identifying lamp clusters (head lights, tail lights, DRLs, LEDs). */
const LAMP_TOKENS = ['light', 'lamp', 'led'] as const
/** Tokens that mark a lamp cluster as belonging to the TAIL, not the nose. */
const TAIL_TOKENS = ['red', 'tail', 'brake', 'rear', 'stop'] as const
/** Tokens identifying grille / intake meshes — a weak nose cue, consulted last. */
const GRILL_TOKENS = ['grill', 'grille'] as const

const HALF_PI = Math.PI / 2

/** Lower-case, alphanumeric-only form of a name — matches how GLTFLoader sanitises. */
function key(name: string | null | undefined): string {
  return (name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Lower-case WORDS of a name, split on separators and on camelCase boundaries.
 * `rim_fl` → `['rim','fl']`, `Rim.RR` → `['rim','rr']`, `frontRim` →
 * `['front','rim']`, `chrome_trim` → `['chrome','trim']`. Needed because
 * `key()` deliberately destroys the separators that make `rim` recognisable.
 */
function wordsOf(name: string | null | undefined): string[] {
  return (name ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/** True when a word IS `rim` or is prefixed by it (`rim`, `rim1`, `rimfl`). */
function isRimWord(word: string): boolean {
  return word === RIM_TOKEN || word.startsWith(RIM_TOKEN)
}

/** True when `name` matches any entry of `CULL_DENYLIST` (case-insensitive substring). */
export function isCulledName(name: string | null | undefined): boolean {
  if (!name) return false
  const n = name.toLowerCase()
  return CULL_DENYLIST.some((token) => n.includes(token))
}

/**
 * Explicit two-letter corner codes, accepted in either order (`wheel_fr`,
 * `wheellf`). A positional lookup is REQUIRED: a substring test is wrong here
 * because `'fr'` and `'rr'` contain both an `'f'` and an `'r'`, so naive
 * `includes('f')` / `includes('r')` reasoning reads `wheel_fr` as ambiguous.
 */
const CORNER_CODES: Record<string, WheelCorner> = {
  fl: 'FL',
  lf: 'FL',
  fr: 'FR',
  rf: 'FR',
  rl: 'RL',
  lr: 'RL',
  rr: 'RR',
}

/**
 * Resolve a wheel-corner group/mesh name (`wheel_fl`, `WheelFL`, `wheel front
 * left`, `wheellf`, …) to its corner. Returns null for anything that is not an
 * unambiguous corner label — notably the bare `wheel` / `tire` / `rim_*` meshes.
 */
export function wheelCornerFromName(name: string | null | undefined): WheelCorner | null {
  const n = key(name)
  if (!n.startsWith('wheel')) return null
  const tail = n.slice(5)
  if (tail.length === 0 || tail.length > 12) return null

  const code = CORNER_CODES[tail]
  if (code) return code

  // Spelled-out tokens (`wheel_front_left`, `wheelfrontright`, …).
  const front = tail.includes('front')
  const rear = tail.includes('rear')
  const left = tail.includes('left')
  const right = tail.includes('right')
  if (front !== rear && left !== right) {
    if (front) return left ? 'FL' : 'FR'
    return left ? 'RL' : 'RR'
  }
  return null
}

/**
 * True when the name identifies part of a wheel/tyre assembly.
 *
 * `tire` / `tyre` / `wheel` are ≥ 4 characters and unambiguous, so a substring
 * test is correct and cheap for them. `rim` is matched per WORD instead, which
 * is what keeps `chrome_trim` (body brightwork) from being mistaken for rolling
 * stock. That distinction matters in three places: `findWheelCorners`' quadrant
 * fallback would try to steer a trim strip, `cornerTyreBox` would inflate the
 * measured wheel radius/width, and `measureAnchors`' undertray pass would drop a
 * trim mesh that is genuinely a candidate for the engine-bay floor.
 */
export function isTyrePart(name: string | null | undefined): boolean {
  const n = key(name)
  if (n.length === 0 || n.includes('steering')) return false
  if (TYRE_TOKENS.some((token) => n.includes(token))) return true
  return wordsOf(name).some(isRimWord)
}

/** Triangle count of every mesh at or below `root`. Non-indexed geometry counts position/3. */
export function countTriangles(root: Object3D): number {
  let total = 0
  root.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    const g = mesh.geometry
    if (!g) return
    if (g.index) total += g.index.count / 3
    else total += (g.attributes.position?.count ?? 0) / 3
  })
  return Math.round(total)
}

/** Every mesh at or below `root`, in traversal order. */
export function collectMeshes(root: Object3D): Mesh[] {
  const out: Mesh[] = []
  root.traverse((o) => {
    if ((o as Mesh).isMesh) out.push(o as Mesh)
  })
  return out
}

/**
 * Tight world-space AABB enclosing `objects`. `precise` walks the position
 * attribute instead of the geometry's own (possibly rotated) bounding box —
 * required for the ground-plane fit, where a conservative box would lift the car.
 * Caller must have called `updateMatrixWorld(true)` on the common ancestor.
 */
export function unionBox(objects: readonly Object3D[], precise = true): Box3 {
  const box = new Box3()
  for (const o of objects) box.expandByObject(o, precise)
  return box
}

export interface CullResult {
  /** Names of the meshes that were removed (subtree-expanded, so a whole `steering_wheel` group reports all of its parts). */
  removedNames: string[]
  /** Triangles removed. */
  removedTriangles: number
  /** Geometries + materials disposed because nothing retained still references them. */
  disposed: { geometries: number; materials: number }
}

/**
 * Remove every denylisted object (and its whole subtree) from `root`, then
 * dispose GPU resources that no RETAINED mesh still references.
 *
 * Sharing analysis matters twice over here:
 *  - materials are shared between interior and exterior meshes (`Leather_red`
 *    backs both `trim` and `steering_trim`), so a material is only disposed when
 *    no retained mesh uses it;
 *  - `Object3D.clone()` shares geometry/material instances with the source, and
 *    drei's `useGLTF` caches that source. `dispose()` only frees GPU-side
 *    objects (which were never created for geometry we never render) and leaves
 *    the CPU-side typed arrays intact, so a later re-clone from the cache still
 *    works. Disposal is therefore safe, but it is opt-in via `dispose`.
 */
export function cullInteriorMeshes(root: Object3D, dispose = false): CullResult {
  root.updateMatrixWorld(true)

  const doomed = new Set<Object3D>()
  root.traverse((o) => {
    if (o !== root && isCulledName(o.name)) doomed.add(o)
  })

  // Keep only the outermost doomed nodes so subtrees are removed exactly once.
  const tops: Object3D[] = []
  for (const o of doomed) {
    let p = o.parent
    let nested = false
    while (p) {
      if (doomed.has(p)) {
        nested = true
        break
      }
      p = p.parent
    }
    if (!nested) tops.push(o)
  }

  const removedNames: string[] = []
  let removedTriangles = 0
  for (const top of tops) {
    removedTriangles += countTriangles(top)
    top.traverse((child) => {
      if ((child as Mesh).isMesh) removedNames.push(child.name || '(unnamed)')
    })
    top.parent?.remove(top)
  }

  const result: CullResult = { removedNames, removedTriangles, disposed: { geometries: 0, materials: 0 } }
  if (!dispose) return result

  // What the survivors still hold on to.
  const retainedGeometry = new Set<unknown>()
  const retainedMaterial = new Set<unknown>()
  for (const mesh of collectMeshes(root)) {
    retainedGeometry.add(mesh.geometry)
    const m = mesh.material
    if (Array.isArray(m)) for (const entry of m) retainedMaterial.add(entry)
    else retainedMaterial.add(m)
  }

  const seen = new Set<unknown>()
  for (const top of tops) {
    top.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      const g = mesh.geometry
      if (g && !retainedGeometry.has(g) && !seen.has(g)) {
        seen.add(g)
        g.dispose()
        result.disposed.geometries++
      }
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of mats) {
        if (mat && !retainedMaterial.has(mat) && !seen.has(mat)) {
          seen.add(mat)
          mat.dispose()
          result.disposed.materials++
        }
      }
    })
  }

  return result
}

/**
 * Find the four wheel-corner assemblies. Primary path: named corner groups
 * (`wheel_fl` …). Fallback: cluster the rolling-stock meshes into quadrants by
 * the sign of their world X and Z, which works for models with no corner labels.
 */
export function findWheelCorners(root: Object3D): Partial<Record<WheelCorner, Object3D>> {
  root.updateMatrixWorld(true)

  const named: Partial<Record<WheelCorner, Object3D>> = {}
  root.traverse((o) => {
    if (o === root) return
    const corner = wheelCornerFromName(o.name)
    if (corner && named[corner] === undefined) named[corner] = o
  })
  if (WHEEL_CORNERS.every((c) => named[c] !== undefined)) return named

  // Fallback: quadrant clustering over tyre-ish meshes.
  const tyres = collectMeshes(root).filter((m) => isTyrePart(m.name))
  if (tyres.length === 0) return named

  for (const mesh of tyres) {
    mesh.getWorldPosition(_pos)
    // Nose is +Z after the fit; before the yaw it may be -Z, so classify by the
    // sign of the position along the length axis detected below.
    const box = unionBox([mesh])
    const frontBack = box.getCenter(_centre).z >= 0 ? 'F' : 'R'
    // +X is the DRIVER's side, which for this left-hand-drive contract is the
    // car's LEFT — that is what `DRIVER_SIDE_X` encodes, what the named path
    // above produces, and what the measured `wheelFL.x = +0.8555` confirms.
    // Multiplying by `DRIVER_SIDE_X` keeps this branch from drifting if the
    // handedness ever changes. (It used to read `>= 0 ? 'R' : 'L'`, which
    // mirrored every corner and made `Wheels.tsx` steer the REAR axle on any
    // model with no corner labels.)
    const side = _pos.x * DRIVER_SIDE_X >= 0 ? 'L' : 'R'
    const corner = (frontBack + side) as WheelCorner
    if (named[corner] === undefined) named[corner] = mesh
  }
  return named
}

/** Tight world AABB of one corner's tyre/wheel/rim parts. Null when it has none. */
export function cornerTyreBox(cornerNode: Object3D): Box3 | null {
  const parts: Object3D[] = []
  cornerNode.traverse((o) => {
    if ((o as Mesh).isMesh && isTyrePart(o.name)) parts.push(o)
  })
  if (parts.length === 0 && (cornerNode as Mesh).isMesh) parts.push(cornerNode)
  if (parts.length === 0) return null
  return unionBox(parts)
}

function matchesAny(name: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => name.includes(token))
}

/**
 * Triangle-weighted centroid of `meshes` along the length axis, or null when
 * there are none. Weighting by triangle count keeps a large cluster from being
 * outvoted by a handful of tiny decoration meshes bundled into the same node.
 */
function centroidAlong(meshes: readonly Mesh[], lengthOnX: boolean): number | null {
  if (meshes.length === 0) return null
  let weighted = 0
  let weight = 0
  for (const mesh of meshes) {
    const centre = unionBox([mesh]).getCenter(new Vector3())
    const tris = Math.max(1, countTriangles(mesh))
    weighted += (lengthOnX ? centre.x : centre.z) * tris
    weight += tris
  }
  return weighted / weight
}

/** Which cue resolved the forward sign, strongest first. */
export type NoseCue = 'lampPair' | 'headLamps' | 'tailLamps' | 'grills' | 'none'

export interface NoseEvidence {
  cue: NoseCue
  /** +1 → nose toward the positive length axis, −1 → negative, 0 → unknown. */
  sign: number
  headLamps: string[]
  tailLamps: string[]
  grills: string[]
}

/**
 * Work out which end of the car is the nose.
 *
 * A grille centroid is NOT a usable cue on this model. `grills` bundles the
 * front grille, the rear grilles and the side intakes into a single mesh, so it
 * spans the whole car (measured z −2.07 … +2.17 in source space) and its
 * centroid lands within 5 cm of the shell centre — close enough to silently pick
 * the WRONG end. `glass` has the same problem.
 *
 * The headlamp/taillamp PAIR is a relative measurement and is therefore immune
 * to wherever the model's origin happens to sit: on this asset `lights` is a
 * 2 cm-thick slab at z ≈ −1.85 (unmistakably the nose) and `lights_red` sits at
 * z ≈ +0.91. Grilles are only consulted when a model has no lamps at all.
 */
export function resolveNoseEvidence(root: Object3D, lengthOnX: boolean): NoseEvidence {
  root.updateMatrixWorld(true)

  const named = collectMeshes(root).map((mesh) => ({ mesh, n: key(mesh.name) }))
  const lamps = named.filter(({ n }) => matchesAny(n, LAMP_TOKENS))
  const headLamps = lamps.filter(({ n }) => !matchesAny(n, TAIL_TOKENS)).map(({ mesh }) => mesh)
  const tailLamps = lamps.filter(({ n }) => matchesAny(n, TAIL_TOKENS)).map(({ mesh }) => mesh)
  const grills = named.filter(({ n }) => matchesAny(n, GRILL_TOKENS)).map(({ mesh }) => mesh)

  const evidence: NoseEvidence = {
    cue: 'none',
    sign: 0,
    headLamps: headLamps.map((m) => m.name),
    tailLamps: tailLamps.map((m) => m.name),
    grills: grills.map((m) => m.name),
  }

  const head = centroidAlong(headLamps, lengthOnX)
  const tail = centroidAlong(tailLamps, lengthOnX)
  const grill = centroidAlong(grills, lengthOnX)

  const pick = (cue: NoseCue, delta: number | null): boolean => {
    // Sub-0.1 mm separation is noise, not a decision.
    if (delta === null || Math.abs(delta) < 1e-4) return false
    evidence.cue = cue
    evidence.sign = delta > 0 ? 1 : -1
    return true
  }

  // 1. Both lamp clusters present — the strongest, purely relative cue.
  if (head !== null && tail !== null && pick('lampPair', head - tail)) return evidence

  // 2. Only one cluster: compare it against the shell centre.
  const centre = unionBox([root]).getCenter(new Vector3())
  const shellCentre = lengthOnX ? centre.x : centre.z
  if (pick('headLamps', head === null ? null : head - shellCentre)) return evidence
  if (pick('tailLamps', tail === null ? null : shellCentre - tail)) return evidence

  // 3. Last resort — grille centroid, unreliable when side intakes are merged in.
  pick('grills', grill === null ? null : grill - shellCentre)
  return evidence
}

/**
 * Y-rotation (radians) that puts the car's nose on +Z with its length axis on Z.
 *
 * The longest horizontal axis of the retained shell is the car's length. Its
 * SIGN is ambiguous from the box alone, so it is resolved with the lamp-pair
 * evidence above. The camera keyframes require nose-on-+Z, so this is mandatory
 * rather than cosmetic.
 */
export function resolveForwardYaw(root: Object3D): number {
  root.updateMatrixWorld(true)

  // Fresh Vector3s, not the shared scratch: `resolveNoseEvidence` calls
  // `unionBox` internally and would clobber `_size` / `_centre`.
  const size = unionBox([root]).getSize(new Vector3())
  const lengthOnX = size.x >= size.z
  const { sign } = resolveNoseEvidence(root, lengthOnX)

  // sign 0 (no recognisable nose) keeps the length axis where it already is.
  const noseIsPositive = sign >= 0

  if (lengthOnX) {
    // Rotating -90° maps +X onto +Z; +90° maps -X onto +Z.
    return noseIsPositive ? -HALF_PI : HALF_PI
  }
  return noseIsPositive ? 0 : Math.PI
}

/** Front/rear axle centre Z, or null when fewer than two corners were found. */
export function axleStations(
  corners: Partial<Record<WheelCorner, Object3D>>,
): { frontZ: number; rearZ: number; midX: number; midZ: number } | null {
  const zOf = (list: (WheelCorner | undefined)[]): number | null => {
    const values: number[] = []
    for (const c of list) {
      const node = c === undefined ? undefined : corners[c]
      if (!node) continue
      node.getWorldPosition(_pos)
      values.push(_pos.z)
    }
    if (values.length === 0) return null
    return values.reduce((a, b) => a + b, 0) / values.length
  }

  const frontZ = zOf(['FL', 'FR'])
  const rearZ = zOf(['RL', 'RR'])
  if (frontZ === null || rearZ === null) return null

  const xs: number[] = []
  for (const c of WHEEL_CORNERS) {
    const node = corners[c]
    if (!node) continue
    node.getWorldPosition(_pos)
    xs.push(_pos.x)
  }
  const midX = xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)

  return { frontZ, rearZ, midX, midZ: (frontZ + rearZ) / 2 }
}

export interface ShellFitReport {
  /** Applied Y rotation, radians. */
  yaw: number
  /** Applied uniform scale. 1 when no wheel corners could be found. */
  scale: number
  /** Wheelbase before scaling, in source units. */
  wheelbaseBefore: number
  /** Y offset applied so the lowest vertex lands on y = 0. */
  groundOffset: number
  /** Whether the fit could use real wheel-corner nodes (false ⇒ box-centre fallback). */
  usedWheelCorners: boolean
}

/**
 * Yaw, uniformly scale and translate `inner` so it satisfies the site contract:
 * nose on +Z, wheelbase exactly `TARGET_WHEELBASE`, axle midpoint on x = z = 0,
 * lowest vertex on y = 0.
 *
 * `inner` must be a child of an identity-transform parent — its own
 * rotation/scale/position are what this function writes. The scaling is
 * UNIFORM by design: a non-uniform scale would distort the bodywork and make the
 * mechanical systems built by Phase 3 physically wrong.
 */
export function fitShellToContract(inner: Object3D): ShellFitReport {
  const yaw = resolveForwardYaw(inner)

  inner.rotation.set(0, yaw, 0)
  inner.scale.setScalar(1)
  inner.position.set(0, 0, 0)
  inner.updateMatrixWorld(true)

  const corners = findWheelCorners(inner)
  const stations = axleStations(corners)

  let scale = 1
  let wheelbaseBefore = 0
  if (stations) {
    wheelbaseBefore = Math.abs(stations.frontZ - stations.rearZ)
    if (wheelbaseBefore > 1e-6) scale = TARGET_WHEELBASE / wheelbaseBefore
  }
  inner.scale.setScalar(scale)
  inner.updateMatrixWorld(true)

  // With rotation + scale locked in, work out where the axle midpoint and the
  // ground currently sit, then cancel both with a plain translation. `inner`'s
  // matrix is T·R·S and its parent is the identity, so T is the world offset.
  const after = axleStations(findWheelCorners(inner))
  const shell = unionBox([inner])
  const lowestY = shell.min.y

  let offsetX = -shell.getCenter(_centre).x
  let offsetZ = 0
  if (after) {
    offsetX = -after.midX
    offsetZ = -after.midZ
  }

  inner.position.set(offsetX, -lowestY, offsetZ)
  inner.updateMatrixWorld(true)

  return {
    yaw,
    scale,
    wheelbaseBefore,
    groundOffset: -lowestY,
    usedWheelCorners: after !== null,
  }
}

function tuple(v: Vector3, digits = 4): Vec3Tuple {
  const f = 10 ** digits
  return [Math.round(v.x * f) / f, Math.round(v.y * f) / f, Math.round(v.z * f) / f]
}

function num(v: number, digits = 4): number {
  const f = 10 ** digits
  return Math.round(v * f) / f
}

/**
 * Cowl (windshield base) offset BEHIND the front axle, as a fraction of the
 * wheelbase. This asset cannot be measured for the cowl position — its single
 * `glass` mesh carries the windshield, the side glass AND the rear screen, so a
 * bounding box over it spans the whole car. On a front-mid-engine layout the
 * cowl sits ~0.40 × wheelbase behind the front axle, which lands the bay on
 * z = [+0.27 … +1.35] and keeps the chapters.ts engine anchor (z = +0.85) inside.
 */
export const ENGINE_BAY_LENGTH_FRACTION = 0.4
/** Bonnet/deck height as a fraction of roof height above the contact patch. */
export const BONNET_LINE_FRACTION = 0.68

/**
 * Measure the anchor set Phase 3 builds against, from an ALREADY normalised
 * body root. Pure read-only: nothing is mutated except world matrices.
 */
export function measureAnchors(root: Object3D): BodyAnchors {
  root.updateMatrixWorld(true)

  const shell = unionBox([root])
  shell.getSize(_size)
  // Capture NOW — the tyre loop below reuses `_size` for each corner box, so
  // reading `_size.z` at the end of this function would report a tyre, not the
  // shell. (Classic shared-scratch clobber.)
  const shellLengthZ = _size.z
  const shellWidthX = _size.x
  const corners = findWheelCorners(root)

  // ── wheel hub centres ──────────────────────────────────────────────────────
  const hub = (corner: WheelCorner): Vec3Tuple => {
    const node = corners[corner]
    if (!node) return [0, 0, 0]
    node.getWorldPosition(_pos)
    return tuple(_pos)
  }
  const wheelFL = hub('FL')
  const wheelFR = hub('FR')
  const wheelRL = hub('RL')
  const wheelRR = hub('RR')

  // ── tyre dimensions + track ────────────────────────────────────────────────
  const radii: number[] = []
  const widths: number[] = []
  for (const corner of WHEEL_CORNERS) {
    const node = corners[corner]
    if (!node) continue
    const box = cornerTyreBox(node)
    if (!box) continue
    box.getSize(_size)
    radii.push(_size.y / 2)
    widths.push(_size.x)
  }
  const mean = (v: number[]): number => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0)
  const wheelRadius = mean(radii)
  const wheelWidth = mean(widths)

  const frontTrack = Math.abs(wheelFL[0] - wheelFR[0])
  const rearTrack = Math.abs(wheelRL[0] - wheelRR[0])
  const trackWidth = (frontTrack + rearTrack) / 2

  const frontZ = (wheelFL[2] + wheelFR[2]) / 2
  const rearZ = (wheelRL[2] + wheelRR[2]) / 2
  const wheelbase = Math.abs(frontZ - rearZ)

  // ── greenhouse → cabin centre ─────────────────────────────────────────────
  const glassMeshes = collectMeshes(root).filter((m) => {
    const n = key(m.name)
    return n.includes('glass') && !n.includes('light') && !n.includes('tail')
  })
  const glassBox = glassMeshes.length > 0 ? unionBox(glassMeshes) : null

  const cabinCenter: Vec3Tuple = glassBox
    ? tuple(glassBox.getCenter(new Vector3()))
    : [0, num(shell.max.y * 0.62), num(frontZ * 0.25)]

  // ── undertray: lowest RETAINED non-rolling-stock vertex ───────────────────
  // The shell union bottoms out at y = 0 because the tyres are part of it, so
  // `shell.min.y` is the CONTACT PATCH, not the floor of the engine bay.
  const undertrayYs = collectMeshes(root)
    .filter((m) => !isTyrePart(m.name))
    .map((m) => unionBox([m]).min.y)
  const floorY = undertrayYs.length > 0 ? Math.min(...undertrayYs) : shell.min.y

  // ── engine bay: front axle → cowl, between the inner tyre faces, undertray → bonnet ──
  // Z is a layout ratio, NOT a glass-box measurement — see ENGINE_BAY_LENGTH_FRACTION.
  const cowlZ = frontZ - ENGINE_BAY_LENGTH_FRACTION * wheelbase
  const bayMinZ = Math.min(cowlZ, frontZ)
  const bayMaxZ = Math.max(cowlZ, frontZ)

  const bonnetY = shell.max.y * BONNET_LINE_FRACTION
  const bayFloorY = Math.min(floorY, bonnetY)
  const bayCeilY = Math.max(bonnetY, floorY + 0.05)

  // X is the clear span between the INNER faces of the left and right tyres.
  // `trackWidth` is hub-to-hub, so exactly ONE tyre width comes off it — not two.
  const bayWidth = Math.max(0.1, trackWidth - wheelWidth)

  const engineBaySize: Vec3Tuple = [
    num(bayWidth),
    num(Math.max(0.05, bayCeilY - bayFloorY)),
    num(Math.max(0.05, bayMaxZ - bayMinZ)),
  ]
  const engineBayCenter: Vec3Tuple = [
    0,
    num((bayCeilY + bayFloorY) / 2),
    num((bayMaxZ + bayMinZ) / 2),
  ]

  return {
    wheelFL,
    wheelFR,
    wheelRL,
    wheelRR,
    wheelRadius: num(wheelRadius),
    wheelWidth: num(wheelWidth),
    trackWidth: num(trackWidth),
    wheelbase: num(wheelbase),
    engineBayCenter,
    engineBaySize,
    cabinCenter,
    frontNoseZ: num(shell.max.z),
    rearZ: num(shell.min.z),
    roofY: num(shell.max.y),
    overallLength: num(shellLengthZ),
    overallWidth: num(shellWidthX),
    bodyShellTriangleCount: countTriangles(root),
  }
}

/** Convenience: build the identity outer group `fitShellToContract` expects. */
export function createShellRoot(): Group {
  const root = new Group()
  root.name = 'CarBodyRoot'
  root.matrixAutoUpdate = true
  return root
}
