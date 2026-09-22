import * as THREE from 'three'
import type { QualityTier } from '@/types'
import { createCarPaintMaterial } from './paint'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SHARED MATERIAL LIBRARY
 * ─────────────────────────────────────────────────────────────────────────────
 * Every primitive and system in the scene pulls its surface from this single,
 * module-level set. Sharing instances is what makes `mergeGeometries` viable
 * (merged geometry requires a single material) and keeps draw calls / shader
 * permutations low. NEVER clone a library material per mesh — use
 * {@link makeGhostMaterial} when a mesh needs its own opacity.
 *
 * Materials are created LAZILY (on first property access / getMaterial call) so
 * nothing is allocated before a WebGL context exists. Access is via a plain
 * object whose properties are getters, so `materialLibrary.steel`,
 * `getMaterial('steel')` and `Object.keys(materialLibrary)` all behave normally.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type MaterialName =
  | 'steel' | 'aluminium' | 'castIron' | 'rubber' | 'glass' | 'copper' | 'brass'
  | 'plastic' | 'chrome' | 'emissiveHot' | 'emissiveCold' | 'paintBody' | 'paintGlass' | 'ghost'

/** Ordered list of every material name — handy for iteration / tests. */
export const MATERIAL_NAMES: readonly MaterialName[] = [
  'steel', 'aluminium', 'castIron', 'rubber', 'glass', 'copper', 'brass',
  'plastic', 'chrome', 'emissiveHot', 'emissiveCold', 'paintBody', 'paintGlass', 'ghost',
]

/** Factory per material. Each returns a fresh instance; the cache dedupes. */
const FACTORIES: Record<MaterialName, () => THREE.Material> = {
  steel: () =>
    new THREE.MeshStandardMaterial({
      color: 0x9ba1a8, metalness: 1, roughness: 0.34, envMapIntensity: 1.15, toneMapped: true,
    }),
  aluminium: () =>
    new THREE.MeshStandardMaterial({
      color: 0xc9ced4, metalness: 1, roughness: 0.27, envMapIntensity: 1.25, toneMapped: true,
    }),
  castIron: () =>
    new THREE.MeshStandardMaterial({
      color: 0x4b4c50, metalness: 0.85, roughness: 0.75, envMapIntensity: 0.8, toneMapped: true,
    }),
  rubber: () =>
    new THREE.MeshStandardMaterial({
      color: 0x14161a, metalness: 0, roughness: 0.95, envMapIntensity: 0.5, toneMapped: true,
    }),
  glass: () =>
    new THREE.MeshPhysicalMaterial({
      color: 0xdfeef5, metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.4,
      ior: 1.5, transparent: true, opacity: 1, envMapIntensity: 1.4, toneMapped: true,
    }),
  copper: () =>
    new THREE.MeshStandardMaterial({
      color: 0xb06a34, metalness: 1, roughness: 0.31, envMapIntensity: 1.2, toneMapped: true,
    }),
  brass: () =>
    new THREE.MeshStandardMaterial({
      color: 0xc6a24a, metalness: 1, roughness: 0.28, envMapIntensity: 1.2, toneMapped: true,
    }),
  plastic: () =>
    new THREE.MeshStandardMaterial({
      color: 0x22262c, metalness: 0, roughness: 0.6, envMapIntensity: 0.7, toneMapped: true,
    }),
  chrome: () =>
    new THREE.MeshStandardMaterial({
      color: 0xffffff, metalness: 1, roughness: 0.05, envMapIntensity: 1.6, toneMapped: true,
    }),
  emissiveHot: () =>
    new THREE.MeshStandardMaterial({
      color: 0x2a1206, emissive: 0xff5a1f, emissiveIntensity: 2, metalness: 0,
      roughness: 0.5, toneMapped: true,
    }),
  emissiveCold: () =>
    new THREE.MeshStandardMaterial({
      color: 0x07161f, emissive: 0x66d9ff, emissiveIntensity: 2, metalness: 0,
      roughness: 0.45, toneMapped: true,
    }),
  paintBody: () => createCarPaintMaterial(),
  paintGlass: () =>
    new THREE.MeshPhysicalMaterial({
      color: 0x1d2b33, metalness: 0, roughness: 0.08, transmission: 0.85, thickness: 0.3,
      ior: 1.5, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.6,
      envMapIntensity: 1.4, toneMapped: true,
    }),
  ghost: () =>
    new THREE.MeshPhysicalMaterial({
      color: 0x9fd8ff, metalness: 0, roughness: 0.4, transparent: true, opacity: 0.16,
      depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 0.8, toneMapped: true,
    }),
}

/** Instantiated-and-cached materials, keyed by name. Populated lazily. */
const cache = new Map<MaterialName, THREE.Material>()

/** The quality tier currently applied to newly created materials. */
let activeTier: QualityTier = 'high'

/** Per-tier env-map intensity multiplier and clearcoat/transmission toggle. */
const TIER_ENV: Record<QualityTier, number> = { high: 1, medium: 0.85, low: 0.6 }

function applyQuality(material: THREE.Material, tier: QualityTier): void {
  // envMapIntensity lives on the standard/physical family; every library
  // material is one of those, so the cast is safe.
  const standard = material as THREE.MeshStandardMaterial
  const base = (material.userData.baseEnvMapIntensity as number | undefined) ?? standard.envMapIntensity
  material.userData.baseEnvMapIntensity = base
  standard.envMapIntensity = base * TIER_ENV[tier]

  const physical = material as THREE.MeshPhysicalMaterial
  if (tier === 'low') {
    // Cheapest shading path on low: no clearcoat, no transmission (fake it with
    // plain transparency so we still read as glass without the extra passes).
    if ('clearcoat' in physical) physical.clearcoat = 0
    if ('transmission' in physical && physical.transmission > 0) {
      physical.transmission = 0
      physical.transparent = true
      physical.opacity = Math.min(physical.opacity, 0.5)
    }
  }
  material.needsUpdate = true
}

function resolve(name: MaterialName): THREE.Material {
  let material = cache.get(name)
  if (!material) {
    material = FACTORIES[name]()
    material.userData.materialName = name
    applyQuality(material, activeTier)
    cache.set(name, material)
  }
  return material
}

/**
 * Shared, reused material instances. Accessing a property constructs that
 * material on first use (lazy) and returns the same instance forever after.
 * Sharing is what makes mergeGeometries viable — never clone per mesh.
 */
export const materialLibrary: Record<MaterialName, THREE.Material> = (() => {
  const lib = {} as Record<MaterialName, THREE.Material>
  for (const name of MATERIAL_NAMES) {
    Object.defineProperty(lib, name, {
      enumerable: true,
      configurable: true,
      get: () => resolve(name),
    })
  }
  return lib
})()

/** Get a shared material instance by name. */
export function getMaterial(name: MaterialName): THREE.Material {
  return resolve(name)
}

/**
 * Transparent, depth-writing-disabled variant used when a part fades to a ghost.
 * Copies the surface character of `base` (colour / metalness / roughness /
 * emissive) into a NEW, independently-disposable MeshPhysicalMaterial so fading
 * one mesh never touches the shared library instance.
 */
export function makeGhostMaterial(base: THREE.Material, opacity: number): THREE.MeshPhysicalMaterial {
  const src = base as THREE.MeshPhysicalMaterial
  const ghost = new THREE.MeshPhysicalMaterial({
    color: src.color ? src.color.clone() : new THREE.Color(0xffffff),
    metalness: src.metalness ?? 0,
    roughness: src.roughness ?? 0.5,
    emissive: src.emissive ? src.emissive.clone() : new THREE.Color(0x000000),
    emissiveIntensity: src.emissiveIntensity ?? 1,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: src.toneMapped,
  })
  ghost.userData.materialName = 'ghost'
  return ghost
}

/**
 * Lower shading cost for a quality tier: scales `envMapIntensity` and, on `low`,
 * disables clearcoat and fakes transmission with plain transparency. Applies to
 * already-created materials immediately and to any created afterwards.
 */
export function setMaterialQuality(tier: QualityTier): void {
  activeTier = tier
  for (const material of cache.values()) applyQuality(material, tier)
}

/** Dispose every cached library material and empty the cache. */
export function disposeMaterials(): void {
  for (const material of cache.values()) material.dispose()
  cache.clear()
}

export { createCarPaintMaterial } from './paint'
