/**
 * Reduced-motion detection. Pure + side-effect isolated so it can be stubbed in
 * tests and safely used both at module scope and inside effects.
 */

/** The media query string for the user's motion preference. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Returns true when the user has requested reduced motion, or when the
 * matchMedia API is unavailable (SSR / non-browser) — defaulting to false there.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

/**
 * Subscribe to changes in the reduced-motion preference. Returns an unsubscribe
 * function. No-ops (returning a stable disposer) when matchMedia is unavailable.
 */
export function subscribeReducedMotion(cb: (reduced: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }
  const mql = window.matchMedia(REDUCED_MOTION_QUERY)
  const handler = (event: MediaQueryListEvent) => cb(event.matches)
  // Emit the current state immediately so callers are in sync.
  cb(mql.matches)
  mql.addEventListener('change', handler)
  return () => mql.removeEventListener('change', handler)
}
