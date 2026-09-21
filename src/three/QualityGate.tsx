/* eslint-disable react-refresh/only-export-components --
   The binding contract for this module requires `useQualityTier()` and
   `qualityFactor()` to be exported from QualityGate.tsx alongside the component.
   These are tiny, stable helpers; co-locating them is intentional and the
   fast-refresh warning is not actionable here. */
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { getGPUTier } from 'detect-gpu'
import { useEffect, type ReactNode } from 'react'
import { useAppStore } from '@/state/useAppStore'
import type { QualityTier } from '@/types'

/**
 * Multiplier (0..1) other modules use to scale segment counts, instance density,
 * shadow-map size, particle counts, etc. for a given quality tier.
 */
export function qualityFactor(tier: QualityTier): number {
  switch (tier) {
    case 'high':
      return 1
    case 'medium':
      return 0.6
    case 'low':
      return 0.3
  }
}

/** Reactive hook for components that need to re-render on a quality change. */
export function useQualityTier(): QualityTier {
  return useAppStore((s) => s.qualityTier)
}

// Only ever step DOWN under sustained frame-rate pressure: high → medium → low.
const STEP_DOWN: Record<QualityTier, QualityTier> = {
  high: 'medium',
  medium: 'low',
  low: 'low',
}

function tierFromDetectGpu(tier: number): QualityTier {
  if (tier >= 2) return 'high'
  if (tier === 1) return 'medium'
  return 'low' // tier 0, -1 (unknown), blocklisted, webgl-unsupported, fallback
}

/**
 * QualityGate — wraps the scene in drei's <PerformanceMonitor> + <AdaptiveDpr>.
 * Seeds the store's qualityTier from a one-time `getGPUTier()` probe, then steps
 * the tier down whenever PerformanceMonitor reports a sustained decline.
 * Must be rendered INSIDE the <Canvas>.
 */
export function QualityGate({ children }: { children: ReactNode }) {
  const setQualityTier = useAppStore((s) => s.setQualityTier)

  useEffect(() => {
    let cancelled = false
    getGPUTier()
      .then((result) => {
        if (!cancelled) setQualityTier(tierFromDetectGpu(result.tier))
      })
      .catch(() => {
        // Probe failed (no WebGL / SSR): fall back to the lowest tier.
        if (!cancelled) setQualityTier('low')
      })
    return () => {
      cancelled = true
    }
  }, [setQualityTier])

  const handleDecline = () => {
    const current = useAppStore.getState().qualityTier
    setQualityTier(STEP_DOWN[current])
  }

  return (
    <PerformanceMonitor onDecline={handleDecline}>
      <AdaptiveDpr pixelated />
      {children}
    </PerformanceMonitor>
  )
}

export default QualityGate
