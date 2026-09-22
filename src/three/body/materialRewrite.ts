import * as THREE from 'three'
import { getMaterial, makeGhostMaterial, type MaterialName } from '@/three/materials'
import { createCarPaintMaterial } from '@/three/materials/paint'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * materialRewrite — repoint the loaded GLB's surfaces at the shared library
 * ─────────────────────────────────────────────────────────────────────────────
 * The asset ships 17 glTF materials and **zero textures** (verified: the GLB has
 * no `textures` and no `images` arrays), so there are no maps to re-point and
 * UVs are preserved trivially — this module never touches geometry, it only
 * swaps `mesh.material`.
 *
 * Mapping is by MESH name, NOT by glTF material name, and that is not a style
 * choice — it is forced by the data. `grills` is bound to the material named
 * `Tires`; `brakes` is bound to `Taillight_Glass`; `wheel` / `rim_*` / `brake`
 * all share `metal_gray`. A material-name lookup would paint the front grille
 * black rubber and the alloy wheels as taillight lenses.
 *
 * Ownership rule: every material handed to a mesh is EITHER a shared library
 * instance (never disposed by us, never mutated) OR one this module created, in
 * which case it is recorded in `owned` and freed by {@link disposeRewrite}.
 * The body paint is deliberately owned rather than taken from the library: the
 * reveal chapter fades it to a ghost, and the contract forbids mutating a
 * library instance's opacity.
 */

/** Surface a body mesh can be rewritten to: a library name or an owned lens. */
export type BodySurface = MaterialName | 'headlampLens' | 'taillampLens' | 'indicatorLens'

/** Every surface name this module can emit — handy for tests and debug UI. */
export const BODY_SURFACES: readonly BodySurface[] = [
  'paintBody', 'paintGlass', 'glass', 'chrome', 'rubber', 'castIron', 'plastic',
  'aluminium', 'steel', 'brass', 'headlampLens', 'taillampLens', 'indicatorLens',
]

/** Lower-case, alphanumeric-only — mirrors how GLTFLoader sanitises names. */
function key(name: string | null | undefined): string {
  return (name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Classify one mesh.
 *
 * ORDER MATTERS. Several retained names are prefixes of each other, so the more
 * specific test has to come first:
 *   `brakes` (the 14,172-tri brake-light lens assembly at the tail) must be
 *     tested before `brake` (the per-corner disc) because `'brakes'.includes('brake')`;
 *   `lights_red` must be tested before `lights`;
 *   `rim_fr` / `rim_rl` … must be tested before the generic metal rules.
 *
 * The mesh inventory this table was written against (31 retained meshes):
 *   trim, lights_red, plastic_gray, metal, lights, leds, grills, glass, chrome,
 *   carbon_fibre_trim, carbon_fibre, brakes, body, blue, yellow_trim, and per
 *   corner wheel / tire / rim_?? / brake.
 */
export function classifyBodySurface(meshName: string | null | undefined): BodySurface {
  const n = key(meshName)
  if (n.length === 0) return 'steel'

  // ── painted bodywork: one dedicated instance for the whole shell ──────────
  if (n === 'body' || n.includes('bodycolor')) return 'paintBody'

  // ── rolling stock ─────────────────────────────────────────────────────────
  if (n.includes('tire') || n.includes('tyre')) return 'rubber'
  if (n.startsWith('rim')) return 'chrome'
  // `wheel` is the alloy wheel face/hub (9,120 tris per corner), not the tyre.
  if (n.includes('wheel')) return 'aluminium'
  // Per-corner brake DISC — cast iron, not chrome. Tested after `brakes` below.

  // ── lamps (all owned, all emissive — see the lens factories) ──────────────
  // `lights_red` = tail/stop lenses; `brakes` = the brake-light lens bar.
  if (n.includes('light') && n.includes('red')) return 'taillampLens'
  if (n === 'brakes' || n.includes('taillight')) return 'taillampLens'
  if (n === 'leds' || n.includes('led')) return 'indicatorLens'
  if (n.includes('light') || n.includes('lamp') || n.includes('projector')) return 'headlampLens'

  // ── brake disc (only reachable now that `brakes` is handled above) ────────
  if (n === 'brake' || n.includes('disc') || n.includes('rotor')) return 'castIron'

  // ── glazing + brightwork ──────────────────────────────────────────────────
  if (n.includes('glass')) return 'paintGlass'
  if (n.includes('chrome')) return 'chrome'

  // ── air intakes / grille mesh. Bound to the `Tires` material in the source
  //    file, so the mesh-name rule is the only thing keeping it out of rubber.
  if (n.includes('grill') || n.includes('grille') || n.includes('intake')) return 'plastic'

  // ── composites, underbody and general trim ────────────────────────────────
  if (n.includes('carbon')) return 'plastic'
  if (n.includes('metal')) return 'steel'
  if (n.includes('plastic')) return 'plastic'
  if (n.includes('yellow')) return 'brass'
  if (n.includes('trim')) return 'plastic'

  // Everything else on this asset is small cabin-facing hardware (`blue`, 72
  // tris) that the cull left behind because its NAME is not denylisted.
  return 'plastic'
}

/** Surfaces that are owned emissive lenses rather than library instances. */
type LensSurface = 'headlampLens' | 'taillampLens' | 'indicatorLens'
const LENS_SURFACES: readonly LensSurface[] = ['headlampLens', 'taillampLens', 'indicatorLens']

function isLensSurface(surface: BodySurface): surface is LensSurface {
  return (LENS_SURFACES as readonly string[]).includes(surface)
}

// ── owned lens materials ─────────────────────────────────────────────────────
// The library has `glass` but no lit lens. These are built once per rewrite and
// disposed with it, so a hot-reload or a shell remount cannot leak them.

function makeHeadlampLens(): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xeaf4ff),
    metalness: 0,
    roughness: 0.06,
    transmission: 0.55,
    thickness: 0.08,
    ior: 1.5,
    transparent: true,
    opacity: 1,
    emissive: new THREE.Color(0xfff1d6),
    emissiveIntensity: 1.1,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.5,
    toneMapped: true,
  })
  m.userData.materialName = 'headlampLens'
  return m
}

function makeTaillampLens(): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x3d0406),
    metalness: 0,
    roughness: 0.08,
    transmission: 0.35,
    thickness: 0.06,
    ior: 1.5,
    transparent: true,
    opacity: 1,
    emissive: new THREE.Color(0xff1a12),
    emissiveIntensity: 1.6,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.2,
    toneMapped: true,
  })
  m.userData.materialName = 'taillampLens'
  return m
}

function makeIndicatorLens(): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x2a1503),
    metalness: 0,
    roughness: 0.12,
    transparent: true,
    opacity: 1,
    emissive: new THREE.Color(0xff8a1f),
    emissiveIntensity: 1.2,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.1,
    toneMapped: true,
  })
  m.userData.materialName = 'indicatorLens'
  return m
}

export interface MaterialRewriteResult {
  /** mesh name → surface it was rewritten to. The "keep a map" deliverable. */
  byMeshName: Map<string, BodySurface>
  /** Materials THIS module created and must therefore dispose. */
  owned: Set<THREE.Material>
  /** The dedicated body paint instance the reveal chapter fades to a ghost. */
  bodyPaint: THREE.MeshPhysicalMaterial
  /** source material → cached ghost variant (never a library instance itself). */
  ghosts: Map<THREE.Material, THREE.MeshPhysicalMaterial>
  /** Meshes touched. */
  meshCount: number
}

/**
 * Repoint every mesh under `root` at the shared library (or an owned lens) and
 * return the bookkeeping the shell needs to fade / dispose it later.
 *
 * Materials that came off the GLTFLoader are NOT disposed here: `Object3D.clone()`
 * shares them with drei's cached GLTF, so disposing them would corrupt the next
 * clone from that cache. They are simply dereferenced and left for the loader
 * cache's own lifecycle.
 */
export function rewriteMaterials(root: THREE.Object3D): MaterialRewriteResult {
  const result: MaterialRewriteResult = {
    byMeshName: new Map(),
    owned: new Set(),
    bodyPaint: createCarPaintMaterial(),
    ghosts: new Map(),
    meshCount: 0,
  }
  result.owned.add(result.bodyPaint)

  // Lenses are shared across every mesh that wants them, so at most one of each
  // is ever created.
  const lenses = new Map<LensSurface, THREE.Material>()
  const lens = (surface: LensSurface): THREE.Material => {
    let m = lenses.get(surface)
    if (!m) {
      m =
        surface === 'headlampLens'
          ? makeHeadlampLens()
          : surface === 'taillampLens'
            ? makeTaillampLens()
            : makeIndicatorLens()
      lenses.set(surface, m)
      result.owned.add(m)
    }
    return m
  }

  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    result.meshCount++

    const surface = classifyBodySurface(mesh.name)
    if (!result.byMeshName.has(mesh.name)) result.byMeshName.set(mesh.name, surface)

    mesh.material = isLensSurface(surface)
      ? lens(surface)
      : surface === 'paintBody'
        ? result.bodyPaint
        : getMaterial(surface)

    // Shadow behaviour belongs to the surface, not to the asset's authoring.
    mesh.castShadow = surface !== 'paintGlass' && surface !== 'glass'
    mesh.receiveShadow = true
  })

  return result
}

/**
 * Cached ghost variant of `source` at `opacity`. Creating one per frame would
 * leak a material every frame, so the cache is keyed on the source instance and
 * the opacity is written in place — safe because the ghost is owned by us.
 */
export function ghostOf(
  result: MaterialRewriteResult,
  source: THREE.Material,
  opacity: number,
): THREE.MeshPhysicalMaterial {
  let ghost = result.ghosts.get(source)
  if (!ghost) {
    ghost = makeGhostMaterial(source, opacity)
    result.ghosts.set(source, ghost)
    result.owned.add(ghost)
    return ghost
  }
  if (Math.abs(ghost.opacity - opacity) > 1e-4) ghost.opacity = opacity
  return ghost
}

/** Dispose everything {@link rewriteMaterials} created. Library instances survive. */
export function disposeRewrite(result: MaterialRewriteResult): void {
  for (const material of result.owned) material.dispose()
  result.owned.clear()
  result.ghosts.clear()
  result.byMeshName.clear()
}
