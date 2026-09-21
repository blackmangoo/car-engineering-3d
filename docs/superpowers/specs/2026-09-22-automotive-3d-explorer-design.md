# Inside the Machine — Automotive Engineering in 3D

**Design & architecture spec** · 2026-09-22 · repo `car-engineering-3d` (public)

A premium, scroll-driven 3D automotive-engineering experience. A fixed WebGL
canvas renders a car; real HTML sections scroll above it. GSAP ScrollTrigger
converts scroll position into a damped per-chapter progress value, React Three
Fiber reads that value inside `useFrame` and mutates Three.js objects directly so
**React never re-renders during scroll**. Five systems get exploded and animated:
suspension, engine, transmission, brakes, air conditioning.

---

## 1. Confirmed decisions

| Decision | Choice |
| --- | --- |
| Assets | **Hybrid** — authored GLB/HDRI assets where they help, **procedural fallback** primitives so the scene always renders |
| Stack | **React Three Fiber + drei + GSAP + Vite + TypeScript** |
| Repo | Public GitHub repo **`car-engineering-3d`** under `blackmangoo` |
| Styling | Premium automotive showcase — near-black charcoal stage, one restrained ice-blue accent, chrome/glass cues |
| Interaction | **Scroll-driven** camera/explode/mechanism timeline **plus clickable hotspots** for part selection |
| State | Non-reactive **progress bus** for per-frame scroll data; **zustand** for discrete UI state only |

---

## 2. Locked version table

Pinned ranges (see `package.json`). Resolved versions verified with `npm ls`.

| Package | Range | Resolved |
| --- | --- | --- |
| react / react-dom | `~19.2.0` | **19.2.8** |
| @react-three/fiber | `^9.7.0` | 9.7.0 |
| @react-three/drei | `^10.7.8` | 10.7.8 |
| @react-three/postprocessing | `^3.1.1` | 3.1.1 |
| postprocessing | `^6.36.0` | 6.39.5 |
| three | `^0.186.0` | 0.186.0 |
| @types/three | `^0.186.0` | 0.186.x |
| gsap | `^3.15.0` | 3.15.0 |
| maath | `^0.10.8` | 0.10.8 |
| zustand | `^5.0.0` | 5.0.15 |
| vite | `^8.3.0` | 8.3.0 |
| vitest | `^3.0.0` | 3.2.7 |
| typescript | `^5.9.0` | 5.9.x |
| leva | `^0.10.1` | 0.10.1 |
| detect-gpu | (transitive via drei, imported directly) | 5.x |
| @types/node | `^22.0.0` | 22.x (config typing) |

### The React pin (critical)

`@react-three/fiber@9.7.0` declares `peerDependencies: { react: ">=19 <19.3" }`.
npm's latest React (19.3.0) is **outside** that range and fails install with
`ERESOLVE`. We therefore pin `react`/`react-dom` to `~19.2.0` **and** add a
belt-and-braces `overrides` block:

```json
"overrides": { "react": "~19.2.0", "react-dom": "~19.2.0" }
```

`npm ls react react-dom` resolves to **19.2.8** — inside the fiber peer range. No
`--legacy-peer-deps` is used.

---

## 3. Scene coordinate system

Units are **metres**. Origin at ground level, vehicle centre (midpoint of the
wheelbase, on the centreline, `y = 0` where the tyres touch the floor).

- `+X` = vehicle right
- `+Y` = up
- `+Z` = forward, toward the nose
- Canonical envelope: **4.4 m long (Z) × 1.9 m wide (X) × 1.3 m tall (Y)**
- Wheelbase: **2.7 m** · Layout: **front-engine, rear-wheel drive (RWD)**

### Anchors `(x, y, z)`

| Anchor | Position |
| --- | --- |
| front wheels | `(±0.80, 0.33, +1.35)` |
| rear wheels | `(±0.80, 0.33, -1.35)` |
| engine | `(0, 0.72, +0.85)` |
| transmission | `(0, 0.62, -0.10)` extending to `z = -0.75` |
| differential | `(0, 0.45, -1.35)` |
| AC condenser | `(0, 0.60, +1.95)` |
| AC evaporator / blower | `(0, 0.85, +0.35)` |
| brake master cylinder | `(-0.45, 0.80, +1.30)` |

---

## 4. Type / ID contract

`src/types/index.ts` is the single source of truth, exported verbatim:

- `SystemId = 'suspension' | 'engine' | 'transmission' | 'brakes' | 'aircon'`
- `ChapterId = 'hero' | 'reveal' | SystemId | 'outro'`
- `QualityTier = 'high' | 'medium' | 'low'`
- `PartId` — a closed union of ~50 part ids namespaced by system
  (`susp.*`, `eng.*`, `trx.*`, `brk.*`, `ac.*`). Hotspots, exploded views and the
  detail card all key off `PartId`.
- `Vec3Tuple = [number, number, number]`
- `CameraKeyframe { from, to, target, fov }`
- `ChapterDef { id, index, title, system, vh, camera, mechanism }`

---

## 5. Chapter map (8 chapters)

Within every chapter the **explode** occupies progress `0 → 0.55` and the
**mechanism** cycle occupies `0.55 → 1`, so each chapter uses
`mechanism: { start: 0.55, end: 1 }`. Camera continuity is guaranteed: chapter
N's `camera.from` equals chapter N−1's `camera.to` (and the outro returns to the
hero framing).

| # | id | vh | from | to | target | fov | title | system |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | hero | 150 | [5.5,2.2,6.5] | [4.0,1.6,5.0] | [0,0.7,0] | 35 | The Complete Machine | — |
| 1 | reveal | 200 | [4.0,1.6,5.0] | [3.2,1.4,3.6] | [0,0.7,0] | 38 | Beneath the Skin | — |
| 2 | suspension | 280 | [3.2,1.4,3.6] | [2.0,0.9,2.2] | [0.8,0.45,1.35] | 40 | Suspension | suspension |
| 3 | engine | 320 | [2.0,0.9,2.2] | [1.7,1.3,2.0] | [0,0.75,0.85] | 38 | Engine | engine |
| 4 | transmission | 280 | [1.7,1.3,2.0] | [1.6,0.9,0.6] | [0,0.6,-0.3] | 40 | Transmission | transmission |
| 5 | brakes | 260 | [1.6,0.9,0.6] | [1.5,0.6,1.9] | [0.8,0.33,1.35] | 42 | Brakes | brakes |
| 6 | aircon | 300 | [1.5,0.6,1.9] | [2.2,1.2,2.6] | [0,0.7,0.6] | 40 | Air Conditioning | aircon |
| 7 | outro | 180 | [2.2,1.2,2.6] | [5.5,2.2,6.5] | [0,0.7,0] | 35 | Reassembly | — |

`TOTAL_VH = 1970`. Exports from `src/scroll/chapters.ts`: `CHAPTERS`,
`CHAPTER_ORDER`, `TOTAL_VH`, `getChapter(id)`.

---

## 6. Progress-bus architecture

### The one rule: **no React state in the scroll hot path**

Per-frame scroll data must never become React state. A `setState` on every scroll
tick would re-render the tree ~60×/s and destroy frame pacing.

```
scroll ──▶ ScrollTrigger.onUpdate ──▶ progressBus[id].current = self.progress   (plain object, mutable)
                                    └▶ scrollState.{velocity,direction,activeChapter}
                                                            │
                                                            ▼  (read inside useFrame)
                          CameraRig / systems mutate Three.js objects directly
```

- `src/state/progressBus.ts` — `progressBus` (one `{ current }` cell per chapter),
  `scrollState` (velocity/direction/activeChapter), `resetProgress()`. Plain
  module objects. Mutating them triggers **no** re-render.
- `src/state/useAppStore.ts` — zustand store for **discrete** state only:
  `activeChapter`, `selectedPart`, `qualityTier`, `loaded`, `reducedMotion` +
  setters. Never stores per-frame progress.
- `ScrollRig` mirrors `activeChapter` into the store **only when it changes**
  (equality-guarded) so chapter transitions can drive UI without scroll spam.
- `CameraRig` reads `scrollState` + `progressBus` inside `useFrame`, interpolates
  camera `from → to` by progress, damps position/target/fov (maath `damp3`,
  `MathUtils.damp`), and adds a subtle idle drift only when motion is allowed and
  scroll velocity ≈ 0. **Zero React hook subscriptions inside `useFrame`.**

### Scroll smoothing

`scrub: 0.6` gives GSAP's built-in lerp; the camera/systems add a second damping
layer. This double-smoothing is what kills scroll jank.

---

## 7. Module ownership across phases

| Phase | Owner | Modules |
| --- | --- | --- |
| **1 — Foundation (this task)** | Agent A | root configs, `src/main.tsx`, `App.tsx`, `styles/`, `types/`, `lib/` (`math`, `damp`, `reducedMotion`), `state/` (`progressBus`, `useAppStore`), `scroll/` (`ScrollRig`, `chapters`), `three/` (`Scene` shell, `CameraRig`, `QualityGate`), empty `public/{models,hdri,draco}` |
| **2 — Content & systems** | (next agent) | `three/primitives`, `three/materials`, `three/body`, `three/exploded`, `three/hotspots`, `three/systems/*`, `three/{Lighting,Environment,Effects}.tsx`, `ui/`, `content/`; rewrites `three/Scene.tsx` into the `TODO(phase-2)` block |
| **3 — Polish** | (later) | real `ui/Loader`, HUD, detail cards, sound, final grading |

`assets-incoming/` is owned by a concurrent download agent and is **never**
touched, listed-locked, or committed (git-ignored).

---

## 8. Performance budget

| Metric | Target |
| --- | --- |
| Draw calls | **< 100** |
| On-screen triangles | **< 500k** |
| Frame rate | **60 fps desktop / ≥ 30 fps mobile** |
| Initial JS | **< 400 KB gzipped** |

Foundation status: production `vite build` emits **≈ 350 KB gzipped** initial JS
(dominated by three + drei), inside budget. The five system components will be
**lazy-loaded / code-split** per chapter in Phase 2 to keep the initial payload
flat. `QualityGate` (drei `PerformanceMonitor` + `AdaptiveDpr pixelated`) seeds a
`QualityTier` from `detect-gpu` and steps `high → medium → low` under sustained
frame pressure; `qualityFactor(tier)` (1 / 0.6 / 0.3) scales segment counts and
instance density.

---

## 9. Accessibility & reduced motion

- Semantic HTML sections scroll above the canvas; the canvas is decorative and
  `pointer-events` flow is managed via `.content-layer` (transparent) with
  `pointer-events: auto` restored only on genuinely interactive descendants.
- `prefers-reduced-motion: reduce` is honoured at three levels:
  1. **CSS** — `tokens.css` zeroes animation/transition durations and disables
     smooth scrolling under the media query.
  2. **Scroll rig** — `ScrollRig` wraps everything in `gsap.matchMedia()`; the
     reduced branch uses `scrub: true` (no smoothing) and snaps each chapter to
     its end state instead of interpolating, and sets `reducedMotion` in the
     store.
  3. **Camera** — idle drift is disabled when `reducedMotion` is set.
- `src/lib/reducedMotion.ts` exposes `prefersReducedMotion()` and
  `subscribeReducedMotion(cb)` for imperative, testable access.
- Accent/text colour pairs are chosen for contrast against the charcoal stage;
  focus-visible rings use the accent colour.

---

## 10. Test plan

- **Unit (vitest, node env)** — pure, deterministic modules:
  - `lib/math.test.ts` — clamp/lerp/inverseLerp/mapRange/smoothstep/degToRad/remapProgress
  - `lib/damp.test.ts` — maath wrappers move toward targets and converge
  - `lib/reducedMotion.test.ts` — matchMedia stubbing, subscribe/unsubscribe, SSR no-op
  - `scroll/chapters.test.ts` — 8 chapters, order, indices, mechanism window,
    system mapping, **camera continuity**, outro→hero loop, `TOTAL_VH = 1970`,
    `getChapter` throws on unknown id
  - `state/progressBus.test.ts` — cell-per-chapter, independent mutation, `resetProgress()`
  - Current status: **31 tests passing**.
- **Static gates** — `tsc --noEmit` (typecheck), `eslint .` (lint), `vite build`.
- **Runtime smoke** — `vite dev` boots and serves the titled HTML shell; scroll
  the 8 placeholder sections to confirm progress-bus writes and camera motion
  before Phase-2 geometry lands.
- **Phase 2+** — per-system visual/mechanism checks, draw-call & triangle budget
  assertions in-scene, reduced-motion manual pass, cross-device frame-rate check.
