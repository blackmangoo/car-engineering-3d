import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CHAPTERS } from '@/scroll/chapters'
import { progressBus, scrollState } from '@/state/progressBus'
import { useAppStore } from '@/state/useAppStore'
import type { ChapterId } from '@/types'

// Register once at module scope — never inside a component/effect.
gsap.registerPlugin(ScrollTrigger)

/**
 * ScrollRig — a DOM-side component (rendered OUTSIDE the <Canvas>). It owns the
 * GSAP ScrollTrigger instances that convert scroll position into per-chapter
 * progress and writes that progress onto the non-reactive `progressBus`.
 *
 * Nothing here is React state. The only store write is `activeChapter`, guarded
 * by an equality check so scrolling never spams re-renders. The R3F tree reads
 * `progressBus` / `scrollState` inside useFrame and mutates Three.js directly.
 */
export function ScrollRig() {
  useEffect(() => {
    const mm = gsap.matchMedia()
    const setStoreChapter = useAppStore.getState().setActiveChapter
    const setReducedMotion = useAppStore.getState().setReducedMotion

    // Track the last mirrored chapter so we only touch the store on a real change.
    let lastActive: ChapterId = scrollState.activeChapter

    const mirrorActiveChapter = (id: ChapterId) => {
      scrollState.activeChapter = id
      if (id !== lastActive) {
        lastActive = id
        setStoreChapter(id)
      }
    }

    const build = (reduced: boolean) => {
      setReducedMotion(reduced)

      for (const chapter of CHAPTERS) {
        const id = chapter.id
        const bus = progressBus[id]

        ScrollTrigger.create({
          trigger: `[data-chapter="${id}"]`,
          start: 'top top',
          end: 'bottom bottom',
          // GSAP's built-in lerp. Reduced motion disables smoothing entirely.
          scrub: reduced ? true : 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // Reduced motion: jump to the end state instead of interpolating.
            bus.current = reduced ? (self.progress >= 0.5 ? 1 : 0) : self.progress

            scrollState.velocity = self.getVelocity()
            scrollState.direction = self.direction as 1 | -1
            mirrorActiveChapter(id)
          },
          onToggle: (self) => {
            if (self.isActive) mirrorActiveChapter(id)
          },
        })
      }

      // matchMedia expects a cleanup return; revert() below handles teardown.
      return () => {
        // ScrollTriggers created in this context are killed by mm.revert().
      }
    }

    mm.add('(prefers-reduced-motion: reduce)', () => build(true))
    mm.add('(prefers-reduced-motion: no-preference)', () => build(false))

    // Ensure trigger positions are correct once layout/fonts settle.
    const raf = window.requestAnimationFrame(() => ScrollTrigger.refresh())

    return () => {
      window.cancelAnimationFrame(raf)
      mm.revert() // kills every trigger created above and reverts matchMedia
      scrollState.velocity = 0
      scrollState.direction = 1
    }
  }, [])

  // ScrollRig renders no DOM of its own; the sections live in App.tsx.
  return null
}

export default ScrollRig
