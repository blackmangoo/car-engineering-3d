import { fileURLToPath, URL } from 'node:url'
import { appendFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/

/**
 * Function-form manualChunks: splits vendor code into five stable chunks so
 * long-lived deps (three, react) stay cacheable when app-level deps change.
 *
 * Deliberate routing decision: `three-stdlib` and `three-mesh-bvh` (pulled in
 * by @react-three/drei) go with the `three` chunk, not `r3f`. They are locked
 * to three's module instances/version and change only when three itself moves,
 * so co-locating them keeps version coupling inside one content hash and
 * avoids a cross-chunk singleton hazard between two copies of three helpers.
 *
 * Everything else (app code, zustand, detect-gpu, maath, misc small deps)
 * returns undefined and keeps Vite/Rolldown's default chunking, preserving the
 * existing per-system lazy chunks.
 */
function manualChunks(id: string): string | undefined {
  if (process.env.MC_DEBUG) {
    appendFileSync('mc-debug.log', id + '\n')
  }
  if (id.includes('three') || id.includes('react')) {
    appendFileSync('mc-debug.log', 'HIT ' + id + '\n')
  }
  if (!id.includes('node_modules')) return undefined

  // Match on "/<pkg>/" boundaries so e.g. "react-dom" never matches "react".
  if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) {
    return 'react-vendor'
  }
  if (/node_modules\/(three|three-stdlib|three-mesh-bvh)\//.test(id)) {
    return 'three'
  }
  // @react-three/postprocessing must be tested before bare @react-three/*.
  if (/node_modules\/@react-three\/postprocessing\//.test(id)) {
    return 'postprocessing'
  }
  if (/node_modules\/postprocessing\//.test(id)) {
    return 'postprocessing'
  }
  if (/node_modules\/@react-three\/(fiber|drei)\//.test(id)) {
    return 'r3f'
  }
  if (/node_modules\/gsap\//.test(id)) {
    return 'gsap'
  }
  return undefined
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Absolute alias mirroring tsconfig "paths": { "@/*": ["src/*"] }
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
})
