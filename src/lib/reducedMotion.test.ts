import { afterEach, describe, expect, it, vi } from 'vitest'
import { prefersReducedMotion, subscribeReducedMotion } from '@/lib/reducedMotion'

type Listener = (event: { matches: boolean }) => void

function stubWindow(matches: boolean) {
  const listeners = new Set<Listener>()
  const mql = {
    matches,
    addEventListener: (_type: string, cb: Listener) => listeners.add(cb),
    removeEventListener: (_type: string, cb: Listener) => listeners.delete(cb),
  }
  vi.stubGlobal('window', { matchMedia: () => mql })
  return {
    mql,
    emit(next: boolean) {
      mql.matches = next
      for (const cb of listeners) cb({ matches: next })
    },
    listenerCount: () => listeners.size,
  }
}

describe('reducedMotion', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns false when matchMedia is unavailable (node/SSR)', () => {
    vi.unstubAllGlobals()
    expect(prefersReducedMotion()).toBe(false)
  })

  it('reflects the media query result', () => {
    stubWindow(true)
    expect(prefersReducedMotion()).toBe(true)
  })

  it('subscribe emits the current value immediately and reacts to changes', () => {
    const win = stubWindow(false)
    const seen: boolean[] = []
    const unsubscribe = subscribeReducedMotion((v) => seen.push(v))

    expect(seen).toEqual([false])
    win.emit(true)
    expect(seen).toEqual([false, true])
    expect(win.listenerCount()).toBe(1)

    unsubscribe()
    expect(win.listenerCount()).toBe(0)
  })

  it('subscribe is a safe no-op without matchMedia', () => {
    vi.unstubAllGlobals()
    const unsubscribe = subscribeReducedMotion(() => {})
    expect(typeof unsubscribe).toBe('function')
    unsubscribe() // should not throw
  })
})
