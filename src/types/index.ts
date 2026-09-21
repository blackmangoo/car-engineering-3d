export type SystemId = 'suspension' | 'engine' | 'transmission' | 'brakes' | 'aircon'
export type ChapterId = 'hero' | 'reveal' | SystemId | 'outro'
export type QualityTier = 'high' | 'medium' | 'low'

export type PartId =
  | 'susp.wishboneUpper' | 'susp.wishboneLower' | 'susp.spring' | 'susp.damper'
  | 'susp.upright' | 'susp.antiRollBar' | 'susp.hub'
  | 'eng.block' | 'eng.head' | 'eng.piston' | 'eng.conrod' | 'eng.crankshaft'
  | 'eng.camshaft' | 'eng.valveIntake' | 'eng.valveExhaust' | 'eng.valveSpring'
  | 'eng.flywheel' | 'eng.oilPan' | 'eng.intakeManifold' | 'eng.exhaustManifold'
  | 'trx.clutch' | 'trx.inputShaft' | 'trx.gearSet' | 'trx.synchro'
  | 'trx.outputShaft' | 'trx.differential' | 'trx.housing'
  | 'brk.disc' | 'brk.caliper' | 'brk.padInner' | 'brk.padOuter'
  | 'brk.caliperPiston' | 'brk.line' | 'brk.masterCylinder'
  | 'ac.compressor' | 'ac.condenser' | 'ac.receiverDrier' | 'ac.expansionValve'
  | 'ac.evaporator' | 'ac.blower' | 'ac.lineHigh' | 'ac.lineLow'

export type Vec3Tuple = [number, number, number]

export interface CameraKeyframe {
  from: Vec3Tuple
  to: Vec3Tuple
  target: Vec3Tuple
  fov: number
}

export interface ChapterDef {
  id: ChapterId
  index: number
  title: string
  system: SystemId | null
  /** section height in vh */
  vh: number
  camera: CameraKeyframe
  /** sub-range of chapter progress during which the mechanism cycles */
  mechanism: { start: number; end: number }
}
