import { Html } from '@react-three/drei'
import { useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { useAppStore } from '@/state/useAppStore'
import type { PartId, Vec3Tuple } from '@/types'

export interface HotspotProps {
  /** The part this marker selects. */
  part: PartId
  /** World-space anchor position (metres). */
  position: Vec3Tuple
  /** Human-readable label shown on hover / focus / when selected. */
  label: string
  /** Fade the marker in/out. Hidden markers are also non-interactive. */
  visible?: boolean
}

const ACCENT = '#6fd6ff'

const buttonStyle = (visible: boolean): CSSProperties => ({
  position: 'relative',
  display: 'grid',
  placeItems: 'center',
  width: 26,
  height: 26,
  padding: 0,
  border: 'none',
  borderRadius: '50%',
  background: 'transparent',
  cursor: visible ? 'pointer' : 'default',
  pointerEvents: visible ? 'auto' : 'none',
  opacity: visible ? 1 : 0,
  transition: 'opacity 420ms ease',
  // Let the ring/label paint above sibling markers.
  isolation: 'isolate',
})

const dotStyle = (active: boolean): CSSProperties => ({
  width: active ? 12 : 9,
  height: active ? 12 : 9,
  borderRadius: '50%',
  background: active ? ACCENT : 'rgba(180, 225, 255, 0.9)',
  boxShadow: `0 0 0 2px rgba(6, 14, 20, 0.85), 0 0 ${active ? 16 : 8}px ${ACCENT}`,
  transition: 'width 180ms ease, height 180ms ease, box-shadow 180ms ease',
})

const ringStyle = (active: boolean): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  borderRadius: '50%',
  border: `1.5px solid ${ACCENT}`,
  opacity: active ? 0.95 : 0.4,
  transform: active ? 'scale(1)' : 'scale(0.7)',
  transition: 'transform 220ms ease, opacity 220ms ease',
})

const labelStyle = (shown: boolean): CSSProperties => ({
  position: 'absolute',
  left: '50%',
  top: '100%',
  marginTop: 8,
  transform: `translateX(-50%) translateY(${shown ? 0 : -4}px)`,
  whiteSpace: 'nowrap',
  padding: '3px 9px',
  borderRadius: 999,
  font: '500 11px/1.4 ui-sans-serif, system-ui, sans-serif',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: '#eaf6ff',
  background: 'rgba(8, 16, 22, 0.82)',
  border: `1px solid rgba(111, 214, 255, ${shown ? 0.5 : 0.18})`,
  backdropFilter: 'blur(6px)',
  opacity: shown ? 1 : 0,
  pointerEvents: 'none',
  transition: 'opacity 180ms ease, transform 180ms ease',
})

const focusRingStyle = (focused: boolean): CSSProperties => ({
  position: 'absolute',
  inset: -4,
  borderRadius: '50%',
  border: focused ? `2px solid ${ACCENT}` : '2px solid transparent',
  transition: 'border-color 120ms ease',
})

/**
 * Hotspot — a drei `<Html>` marker anchored to a world position. Renders a
 * glowing ring/dot plus a label that appears on hover, focus or when selected.
 *
 * Interaction is deliberately isolated: pointer events are stopped so
 * OrbitControls-style gestures and page scroll are unaffected, and the marker
 * is keyboard reachable (native `<button>`, Enter/Space, visible focus ring).
 * Selecting writes through the imperative `useAppStore.getState()` so the frame
 * loop never subscribes to React state.
 */
export function Hotspot({ part, position, label, visible = true }: HotspotProps) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const selected = useAppStore((s) => s.selectedPart === part)
  const showLabel = hovered || focused || selected

  const stop = (e: ReactPointerEvent) => e.stopPropagation()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    useAppStore.getState().selectPart(part)
  }

  return (
    <Html
      position={position}
      center
      distanceFactor={7}
      occlude
      zIndexRange={[40, 20]}
      style={{ pointerEvents: 'none' }}
    >
      <button
        type="button"
        aria-label={label}
        aria-pressed={selected}
        tabIndex={visible ? 0 : -1}
        style={buttonStyle(visible)}
        onClick={handleClick}
        onPointerDown={stop}
        onPointerUp={stop}
        onPointerEnter={(e) => {
          stop(e)
          setHovered(true)
        }}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <span style={ringStyle(showLabel)} />
        <span style={dotStyle(selected)} />
        <span style={focusRingStyle(focused)} />
        <span style={labelStyle(showLabel)}>{label}</span>
      </button>
    </Html>
  )
}

export default Hotspot
