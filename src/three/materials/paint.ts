import * as THREE from 'three'

/**
 * Clearcoat automotive paint. A metallic base flake under a fully-specified
 * clear layer is what sells a "premium" car surface: sharp specular highlight
 * from the clearcoat sitting over a softer metallic base.
 *
 * Returned material is a fresh instance (NOT part of the shared library) so
 * callers that need a bespoke body colour can own and dispose it themselves.
 *
 * @param color base flake colour. Defaults to a deep charcoal.
 */
export function createCarPaintMaterial(
  color: THREE.ColorRepresentation = 0x1b1f27,
): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    metalness: 0.85,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.35,
    toneMapped: true,
  })
  material.userData.materialName = 'paintBody'
  return material
}
