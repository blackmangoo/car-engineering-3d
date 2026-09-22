/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Attribution — every third-party asset shipped in `public/`, with its licence
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for the site footer, the README and any future
 * "Credits" panel. The provenance here is transcribed from
 * `assets-incoming/MANIFEST.md` (Asset Sourcing Agent, task #6) and cross-checked
 * against the files actually present in `public/` — including the byte sizes, so
 * a silently-swapped or truncated asset shows up as a mismatch against this table.
 *
 * THREE LICENCES ARE IN PLAY, AND ONLY TWO ARE MERELY COURTESY:
 *
 *  • MIT (three.js / the Ferrari model) — **attribution IS required.** The
 *    licence obliges us to retain the copyright notice and the permission
 *    notice in copies or substantial portions of the software. {@link MIT_NOTICE}
 *    below is that text; render it, do not paraphrase it.
 *  • CC0 1.0 (Poly Haven HDRIs + asphalt textures) — **no attribution required.**
 *    CC0 is a public-domain dedication. The credits are included because it is
 *    decent practice and costs nothing, and they are flagged `required: false`
 *    so nobody mistakes them for a legal obligation.
 *  • Apache-2.0 (Draco) — **attribution IS required**, and this one is easy to
 *    miss because the decoders are not content, they are vendored binaries.
 *    `public/draco/**` ships three Google-Draco files that the GLB loader fetches
 *    at runtime. Apache-2.0 §4 requires the licence copy and the NOTICE, and
 *    §4(d) requires reproducing the attribution notices. They are reproduced
 *    here and must appear wherever the MIT credit appears.
 *
 * ── WHY THE DRACO FILES EXIST AT ALL ─────────────────────────────────────────
 * `public/models/ferrari.glb` declares
 * `extensionsRequired: ["KHR_draco_mesh_compression"]`. "Required" (not "used")
 * means the asset CANNOT be parsed without a Draco decoder, so this is not an
 * optional optimisation. drei's `useGLTF` defaults its decoder path to
 * `https://www.gstatic.com/draco/versioned/decoders/1.5.5/` — a third-party CDN
 * standing between the visitor and the hero model. Serving the decoders from our
 * own origin removes that dependency, and `DRACO_DECODER_PATH` in
 * `src/three/body/bodyAnchors.ts` is what points the loader at them.
 *
 * The three files are byte-for-byte the `gltf` build vendored by
 * `three@0.186.0` under `examples/jsm/libs/draco/gltf/`, which tracks Draco's
 * `gltf_2.0_draco_extension` branch (the branch the Khronos mesh-compression
 * extension targets) rather than Draco `master`.
 */

/** SPDX licence identifiers used by the shipped assets. */
export type LicenseId = 'MIT' | 'CC0-1.0' | 'Apache-2.0'

export interface Attribution {
  /** Stable key, safe to use as a React key or a docs anchor. */
  id: string
  /** Human-readable name of the asset or component. */
  title: string
  /** Author / upstream copyright holder. */
  author: string
  license: LicenseId
  /** Canonical licence text URL. */
  licenseUrl: string
  /** Page the asset was obtained from. */
  sourceUrl: string
  /** Exact URL it was downloaded from, where one is known. */
  downloadUrl?: string
  /** Paths as served from `public/` (leading slash, no `public`). */
  servedPaths: readonly string[]
  /**
   * Verified byte sizes, in the same order as `servedPaths`.
   * Compare against the real files after any asset change.
   */
  bytes: readonly number[]
  /**
   * Whether the licence legally obliges us to display the credit.
   * `false` means it is a courtesy credit (CC0) — still render it, but do not
   * treat its absence as a licence violation.
   */
  required: boolean
  /** The exact string to render in the footer for this entry. */
  credit: string
  /** Role in the site, for anyone wondering why the file is there. */
  role: string
}

/**
 * The MIT copyright + permission notice, as required by the licence.
 *
 * © range transcribed from the three.js `LICENSE` on the `dev` branch at the
 * time of download ("Copyright © 2010-2026 three.js authors").
 */
export const MIT_NOTICE = `The MIT License
Copyright © 2010-2026 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`

/**
 * Apache-2.0 attribution notice for the vendored Google Draco decoders.
 *
 * The full licence text is ~11 KB and is not reproduced inline; link to it from
 * the footer rather than pasting it. Draco's own NOTICE file carries no
 * additional third-party attributions beyond the Google copyright.
 */
export const DRACO_NOTICE = `Draco 3D Data Compression
Copyright 2016-2026 The Draco Authors
Licensed under the Apache License, Version 2.0
https://github.com/google/draco/blob/master/LICENSE
Decoders redistributed unmodified from three@0.186.0
(examples/jsm/libs/draco/gltf), which tracks Draco's
gltf_2.0_draco_extension branch.`

export const ATTRIBUTIONS: readonly Attribution[] = [
  {
    id: 'ferrari-glb',
    title: 'Ferrari 458 Italia — body shell model',
    author: 'vicent091036',
    license: 'MIT',
    licenseUrl: 'https://github.com/mrdoob/three.js/blob/dev/LICENSE',
    sourceUrl: 'https://threejs.org/examples/webgl_materials_car.html',
    downloadUrl:
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/ferrari.glb',
    servedPaths: ['/models/ferrari.glb'],
    bytes: [1_681_572],
    required: true,
    credit:
      'Ferrari 458 Italia model by vicent091036 — from the three.js examples, MIT License (https://github.com/mrdoob/three.js).',
    role:
      'Hero body shell. glTF 2.0, generator FBX2glTF: 51 meshes / 58 nodes / 17 materials, ' +
      '358,788 triangles as delivered, of which 241,938 are retained after the interior ' +
      'cull in src/three/body/shellFit.ts. Draco-compressed, hence public/draco/**.',
  },
  {
    id: 'hdri-photo-studio-loft-hall',
    title: 'Photo Studio Loft Hall (1k HDRI)',
    author: 'Poly Haven',
    license: 'CC0-1.0',
    licenseUrl: 'https://polyhaven.com/license',
    sourceUrl: 'https://polyhaven.com/a/photo_studio_loft_hall',
    downloadUrl:
      'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/photo_studio_loft_hall_1k.hdr',
    servedPaths: ['/hdri/photo_studio_loft_hall_1k.hdr'],
    bytes: [1_640_243],
    required: false,
    credit: 'Studio HDRI environment lighting from Poly Haven (CC0).',
    role:
      'Primary image-based light. Large soft-box studio; broad even highlights that read ' +
      'well on the clearcoat paint. Loaded by src/three/Environment.tsx.',
  },
  {
    id: 'hdri-studio-small-09',
    title: 'Studio Small 09 (1k HDRI)',
    author: 'Poly Haven',
    license: 'CC0-1.0',
    licenseUrl: 'https://polyhaven.com/license',
    sourceUrl: 'https://polyhaven.com/a/studio_small_09',
    downloadUrl:
      'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr',
    servedPaths: ['/hdri/studio_small_09_1k.hdr'],
    bytes: [1_615_248],
    required: false,
    credit: 'Alternate studio HDRI from Poly Haven (CC0).',
    role:
      'Alternate IBL look — tighter softbox, more contrast and falloff. A drop-in swap for ' +
      'the `files` prop of <StageEnvironment> if the loft hall proves too flat.',
  },
  {
    id: 'hdri-loft-preview',
    title: 'Photo Studio Loft Hall (preview thumbnail)',
    author: 'Poly Haven',
    license: 'CC0-1.0',
    licenseUrl: 'https://polyhaven.com/license',
    sourceUrl: 'https://polyhaven.com/a/photo_studio_loft_hall',
    downloadUrl:
      'https://cdn.polyhaven.com/asset_img/thumbs/photo_studio_loft_hall.png?width=512&height=512',
    servedPaths: ['/hdri/photo_studio_loft_hall_preview.png'],
    bytes: [321_746],
    required: false,
    credit: 'HDRI preview image from Poly Haven (CC0).',
    role:
      'Optional tonemapped still, usable as a loading backdrop while the 1.6 MB .hdr ' +
      'streams. Currently unreferenced by the runtime.',
  },
  {
    id: 'asphalt-02',
    title: 'Asphalt 02 (1k diffuse / roughness / normal-GL)',
    author: 'Poly Haven',
    license: 'CC0-1.0',
    licenseUrl: 'https://polyhaven.com/license',
    sourceUrl: 'https://polyhaven.com/a/asphalt_02',
    servedPaths: [
      '/floor/asphalt_02_diff_1k.jpg',
      '/floor/asphalt_02_rough_1k.jpg',
      '/floor/asphalt_02_nor_gl_1k.jpg',
    ],
    bytes: [731_707, 544_032, 1_240_122],
    required: false,
    credit: 'Floor texture from Poly Haven (CC0).',
    role:
      'Ground plane in src/three/Environment.tsx — receives the key light\'s shadow and the ' +
      'contact occlusion. The normal map is the `nor_gl` (OpenGL) variant, which is the ' +
      'correct convention for three.js; the green channel must not be flipped.',
  },
  {
    id: 'draco-decoders',
    title: 'Draco mesh-compression decoders',
    author: 'The Draco Authors (Google)',
    license: 'Apache-2.0',
    licenseUrl: 'https://github.com/google/draco/blob/master/LICENSE',
    sourceUrl: 'https://github.com/google/draco',
    servedPaths: [
      '/draco/draco_decoder.js',
      '/draco/draco_decoder.wasm',
      '/draco/draco_wasm_wrapper.js',
    ],
    bytes: [512_465, 192_420, 58_456],
    required: true,
    credit:
      'Geometry decoding by Google Draco, Apache License 2.0 (https://github.com/google/draco).',
    role:
      'REQUIRED, not optional: ferrari.glb lists KHR_draco_mesh_compression under ' +
      'extensionsRequired, so it cannot be parsed without these. Served from our own origin ' +
      'instead of drei\'s default gstatic CDN. Path constant: DRACO_DECODER_PATH in ' +
      'src/three/body/bodyAnchors.ts.',
  },
]

/** Entries whose licence legally requires the credit to be displayed. */
export const REQUIRED_ATTRIBUTIONS: readonly Attribution[] = ATTRIBUTIONS.filter(
  (a) => a.required,
)

/**
 * The block to render in the site footer and paste into the README.
 *
 * The first two lines are the wording specified in `assets-incoming/MANIFEST.md`;
 * the third is the Draco credit, which the manifest predates and which is a hard
 * Apache-2.0 obligation rather than a courtesy.
 */
export const FOOTER_ATTRIBUTION = `Ferrari 458 Italia model by vicent091036 — from the three.js examples, MIT License (https://github.com/mrdoob/three.js).
Studio HDRI environment lighting and floor texture from Poly Haven (CC0).
Geometry decoding by Google Draco, Apache License 2.0 (https://github.com/google/draco).`

/**
 * Full credit text, one entry per line, for a dedicated Credits panel or the
 * README's licence section. Ordered as in {@link ATTRIBUTIONS}.
 */
export const FULL_ATTRIBUTION = ATTRIBUTIONS.map((a) => a.credit).join('\n')

/**
 * Total shipped asset footprint in bytes: 8,538,011 (~8.14 MiB).
 *
 * The manifest quotes ~7.4 MB, which is the seven content assets alone; the
 * three vendored Draco decoders add 763,341 bytes on top of that.
 */
export const TOTAL_ASSET_BYTES: number = ATTRIBUTIONS.reduce(
  (sum, a) => sum + a.bytes.reduce((s, n) => s + n, 0),
  0,
)

export default ATTRIBUTIONS
