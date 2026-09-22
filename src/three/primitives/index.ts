export { Spring, type SpringProps } from './Spring'
export { Damper, type DamperProps } from './Damper'
export { Gear, type GearProps } from './Gear'
export { Piston, type PistonProps } from './Piston'
export {
  Crankshaft,
  type CrankshaftProps,
  CRANK_PIN_OFFSETS,
  crankPinOffsets,
} from './Crankshaft'
export { BrakeDisc, type BrakeDiscProps } from './BrakeDisc'
export { Caliper, type CaliperProps } from './Caliper'
export { FinnedBlock, type FinnedBlockProps } from './FinnedBlock'
export { Pipe, makeCurveFromPoints, type PipeProps } from './Pipe'
export { Bolt, type BoltProps } from './Bolt'
export { Wheel, type WheelProps } from './Wheel'

// Shared primitive plumbing (transform/material props + quality helpers).
export {
  type PrimitiveProps,
  useMaterial,
  useQualityFactor,
  useQualitySegments,
  useDisposeGeometry,
} from './common'
