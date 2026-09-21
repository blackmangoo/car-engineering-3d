import { Canvas } from '@react-three/fiber'
import { CHAPTERS } from '@/scroll/chapters'
import { ScrollRig } from '@/scroll/ScrollRig'
import { Scene } from '@/three/Scene'
import { useAppStore } from '@/state/useAppStore'

/**
 * Minimal placeholder Loader. Phase 3 replaces this with the real asset loader
 * (progress tracking, branded reveal). For now it fades out once the WebGL
 * context is created, which flips `loaded` in the store.
 */
function Loader() {
  const loaded = useAppStore((s) => s.loaded)
  return (
    <div className="loader" data-ready={loaded} aria-hidden={loaded}>
      <div className="loader__bar">
        <div className="loader__fill" />
      </div>
      <div className="loader__text">{loaded ? 'Ready' : 'Initialising systems'}</div>
    </div>
  )
}

export default function App() {
  const setLoaded = useAppStore((s) => s.setLoaded)

  return (
    <>
      <Loader />

      {/* Fixed WebGL stage (z-index 0) */}
      <div className="canvas-layer">
        <Canvas
          shadows
          dpr={[1, 2]}
          frameloop="always"
          gl={{
            antialias: false,
            alpha: false,
            stencil: false,
            powerPreference: 'high-performance',
          }}
          camera={{ position: [5.5, 2.2, 6.5], fov: 35, near: 0.1, far: 100 }}
          onCreated={() => setLoaded(true)}
        >
          <Scene />
        </Canvas>
      </div>

      {/* DOM-side scroll engine — creates the ScrollTriggers, writes progressBus */}
      <ScrollRig />

      {/* Real HTML sections scroll above the canvas (z-index 10, pointer-transparent) */}
      <main className="content-layer">
        {CHAPTERS.map((chapter) => (
          <section
            key={chapter.id}
            data-chapter={chapter.id}
            className="chapter-section"
            style={{ height: `${chapter.vh}vh` }}
          >
            <div className="chapter-label">
              <span className="chapter-label__index">
                {String(chapter.index).padStart(2, '0')} · {chapter.id}
              </span>
              <span className="chapter-label__title">{chapter.title}</span>
            </div>
          </section>
        ))}
      </main>
    </>
  )
}
