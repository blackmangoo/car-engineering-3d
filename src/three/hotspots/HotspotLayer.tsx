import { useAppStore } from '@/state/useAppStore'
import type { ChapterId, PartId, Vec3Tuple } from '@/types'
import { Hotspot } from './Hotspot'

export interface HotspotLayerProps {
  /** The chapter these markers belong to. */
  chapter: ChapterId
  /** Marker definitions for that chapter. */
  parts: { part: PartId; position: Vec3Tuple; label: string }[]
}

/**
 * HotspotLayer — renders the markers for one chapter and only shows them while
 * that chapter is active (read reactively from the store; this is discrete
 * state, not per-frame scroll progress). Markers stay mounted so they can fade
 * in/out rather than pop.
 */
export function HotspotLayer({ chapter, parts }: HotspotLayerProps) {
  const active = useAppStore((s) => s.activeChapter === chapter)

  return (
    <>
      {parts.map((p) => (
        <Hotspot key={p.part} part={p.part} position={p.position} label={p.label} visible={active} />
      ))}
    </>
  )
}

export default HotspotLayer
