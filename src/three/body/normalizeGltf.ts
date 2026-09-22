import * as THREE from 'three'
import { BODY_ANCHORS, type BodyAnchors } from '@/three/body/bodyAnchors'
import {
  createShellRoot,
  cullInteriorMeshes,
  findWheelCorners,
  fitShellToContract,
  measureAnchors,
  type ShellFitReport,
  type WheelCorner,
} from '@/three/body/shellFit'
import {
  disposeRewrite,
  rewriteMaterials,
  type MaterialRewriteResult,
} from '@/three/body/materialRewrite'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * normalizeGltf — turn a freshly decoded GLB into a contract-fitted body shell
 * ─────────────────────────────────────────────────────────────────────────────
 * Pipeline:
 *   1. CLONE the scene. drei's `useGLTF` caches the decoded GLTF module-wide and
 *      hands the same object to every consumer, so mutating it would leak into
 *      anything else that loads this model.
 *   2. CULL the interior (`CULL_DENYLIST`) — 358,788 → 241,938 triangles.
 *   3. YAW so the nose points at +Z (the camera keyframes require it).
 *   4. Uniformly SCALE so the measured wheelbase is exactly 2.7 m.
 *   5. TRANSLATE: axle midpoint onto x = z = 0, lowest vertex onto y = 0.
 *   6. REWRITE materials onto the shared library (`materialRewrite`).
 *   7. MEASURE the anchors Phase 3 builds against.
 *
 * ── DRACO ───────────────────────────────────────────────────────────────────
 * The asset declares `extensionsRequired: ["KHR_draco_mesh_compression"]`, so
 * GLTFLoader + DRACOLoader have already inflated every compressed primitive into
 * a plain `BufferGeometry` (position / normal / uv + index) before this module
 * ever sees it. Draco is a *transfer* codec, not a runtime representation, so
 * the cull — which works purely on `Object3D.name` and `BufferGeometry` — is
 * completely unaffected. Verified offline against this exact asset: the denylist
 * removes 116,850 of 358,788 triangles and retains exactly 241,938.
 *
 * ── DISPOSAL ────────────────────────────────────────────────────────────────
 * `Object3D.clone()` shares geometry AND material instances with the source, and
 * the source lives in drei's cache. That means nothing here is genuinely
 * "non-shared", so culled resources are NOT disposed by default: disposing a
 * geometry the cache still owns would force a re-upload if anything else renders
 * the un-culled model. Pass `disposeCulled: true` only when this call site is the
 * model's sole consumer.
 */

/** The slice of a decoded glTF this module needs. */
export interface GltfLike {
  scene: THREE.Group
}

export interface NormalizeOptions {
  /**
   * Dispose geometries/materials that no RETAINED mesh references. Off by
   * default — see the disposal note above.
   */
  disposeCulled?: boolean
  /** Skip the material rewrite and keep whatever the GLB shipped with. */
  keepSourceMaterials?: boolean
}

export interface NormalizedBody {
  /**
   * Outer group with an IDENTITY transform. `fitShellToContract` requires it:
   * the yaw / scale / translation all live on {@link inner}. Anything that
   * renders this must NOT move `root` — position the wrapping group instead, or
   * the anchors below stop describing world space.
   */
  root: THREE.Group
  /** The fitted clone. Read-only; its transform is the fit. */
  inner: THREE.Group
  /** Measured anchors. Falls back to the hardcoded `BODY_ANCHORS` on failure. */
  anchors: BodyAnchors
  fit: ShellFitReport
  /** Retained triangle count (post-cull). */
  triangleCount: number
  /** Names of the meshes the denylist removed. */
  culledMeshNames: string[]
  /** Triangles the denylist removed. */
  culledTriangles: number
  /** Material bookkeeping. Null when `keepSourceMaterials` was set. */
  materials: MaterialRewriteResult | null
  /** The four wheel assemblies, for spin / steer. Missing entries are possible. */
  wheelNodes: Partial<Record<WheelCorner, THREE.Object3D>>
  /** mesh name → rewritten surface. Convenience view of `materials.byMeshName`. */
  surfaceMap: Map<string, string>
}

/**
 * Clone, cull, fit, re-material and measure a decoded glTF scene.
 *
 * Throws only if the source has no scene; every other failure degrades to a
 * still-usable result (identity fit, hardcoded anchors) so the caller's error
 * boundary is the last resort rather than the first.
 */
export function normalizeGltf(gltf: GltfLike, options: NormalizeOptions = {}): NormalizedBody {
  const source = gltf?.scene
  if (!source) throw new Error('normalizeGltf: gltf.scene is missing')

  // ── 1. clone ──────────────────────────────────────────────────────────────
  const clone = source.clone(true) as THREE.Group
  clone.name = 'BodyClone'
  clone.matrixAutoUpdate = true
  // A clone's descendants keep stale matrixWorld values from the source; every
  // measurement below is world-space, so refresh before doing anything else.
  clone.updateMatrixWorld(true)

  // ── 2. cull ───────────────────────────────────────────────────────────────
  const cull = cullInteriorMeshes(clone, options.disposeCulled ?? false)

  // ── 3–5. yaw / scale / ground ─────────────────────────────────────────────
  const root = createShellRoot()
  const inner = new THREE.Group()
  inner.name = 'BodyInner'
  inner.add(clone)
  root.add(inner)
  const fit = fitShellToContract(inner)

  // ── 6. materials ──────────────────────────────────────────────────────────
  const materials = options.keepSourceMaterials ? null : rewriteMaterials(clone)

  // ── 7. anchors + wheel handles ────────────────────────────────────────────
  const measured = measureAnchors(root)
  const anchors = isSane(measured) ? measured : BODY_ANCHORS
  const wheelNodes = findWheelCorners(clone)

  const surfaceMap = new Map<string, string>()
  if (materials) for (const [name, surface] of materials.byMeshName) surfaceMap.set(name, surface)

  return {
    root,
    inner,
    anchors,
    fit,
    triangleCount: measured.bodyShellTriangleCount,
    culledMeshNames: cull.removedNames,
    culledTriangles: cull.removedTriangles,
    materials,
    wheelNodes,
    surfaceMap,
  }
}

/**
 * Guard against a degenerate measurement (no wheels found ⇒ a zero wheelbase and
 * NaN/Infinity leaking into every derived anchor). Cheap, and it is the only
 * thing standing between a malformed asset and a scene full of NaNs.
 */
function isSane(a: BodyAnchors): boolean {
  const finite = (n: number): boolean => Number.isFinite(n)
  return (
    a.wheelbase > 0.1 &&
    a.wheelRadius > 0.01 &&
    a.overallLength > 0.5 &&
    a.overallWidth > 0.3 &&
    a.roofY > 0.2 &&
    a.bodyShellTriangleCount > 0 &&
    [a.wheelFL, a.wheelFR, a.wheelRL, a.wheelRR, a.engineBayCenter, a.engineBaySize, a.cabinCenter]
      .flat()
      .every(finite) &&
    [a.frontNoseZ, a.rearZ, a.trackWidth, a.wheelWidth].every(finite)
  )
}

/**
 * Free everything `normalizeGltf` allocated that is NOT shared with drei's GLTF
 * cache: the owned body paint, the lens materials and any ghost variants.
 *
 * Geometry is deliberately left alone — the clone shares it with the cache, so
 * disposing it here would break the next consumer of the same URL.
 */
export function disposeNormalizedBody(body: NormalizedBody): void {
  if (body.materials) disposeRewrite(body.materials)
  body.inner.remove(...body.inner.children)
  body.root.remove(body.inner)
}
