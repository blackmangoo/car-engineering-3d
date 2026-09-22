export interface PartDetail {
  name: string;
  system: string;
  material: string;
  spec: string;
  description: string;
}

export const PART_DETAILS: Record<string, PartDetail> = {
  'eng.block': {
    name: '3.0L 120° V6 Cylinder Block',
    system: 'Powertrain',
    material: 'Gravity die-cast Al-Si alloy with Nikasil bore coating',
    spec: '88.0mm Bore × 82.0mm Stroke (10.5:1 Compression)',
    description:
      'Low center of gravity 120° V-angle configuration. Features deep-skirt crankcase architecture with cross-bolted main bearing caps for exceptional high-RPM rigidity up to 9,000 RPM.',
  },
  'eng.intakeManifold': {
    name: 'Carbon-Composite Intake Plenum',
    system: 'Induction',
    material: 'High-temperature autoclave pre-preg carbon fiber',
    spec: '6 Internal CFD Velocity Trumpet Runners',
    description:
      'Engineered to optimize Helmholtz resonance frequencies. Equalizes intake charge distribution across all 6 cylinders to maximize volumetric efficiency across the mid-range powerband.',
  },
  'eng.exhaustManifold': {
    name: 'Twin-Turbo Inconel Exhaust Manifold',
    system: 'Exhaust / Forced Induction',
    material: 'Inconel 625 superalloy with ceramic thermal barrier',
    spec: 'Twin Variable-Geometry Turbochargers (2.2 Bar Boost)',
    description:
      'Short-runner manifold directing high-enthalpy exhaust pulses straight into the turbine snails. Resists sustained 980°C exhaust gas temperatures under full throttle load.',
  },
  'trx.housing': {
    name: '7-Speed Dual-Clutch Transaxle',
    system: 'Drivetrain',
    material: 'High-pressure die-cast magnesium alloy',
    spec: 'Sub-30ms seamless electro-hydraulic shift time',
    description:
      'Twin oil-cooled multi-plate wet clutch packs alternate between odd and even gear clusters, eliminating torque interruption during hard acceleration.',
  },
  'trx.differential': {
    name: 'Electronic Limited-Slip Differential (e-LSD)',
    system: 'Drivetrain',
    material: 'Shot-peened forged nickel-chrome-molybdenum steel',
    spec: '0 - 100% Active Hydraulic Lockup in 50 ms',
    description:
      'Actively vectors drive torque between the rear half-shafts, quelling understeer upon corner entry and providing maximum traction during corner exit.',
  },
  'susp.damper': {
    name: 'MagneRide Adaptive Magnetorheological Damper',
    system: 'Chassis & Suspension',
    material: 'Hard-chrome piston rod in gold-anodized monotube body',
    spec: '1,000 adjustments / second electromagnetic valve rate',
    description:
      'Electromagnetic coils instantly align suspended iron micro-particles to vary fluid shear resistance, decoupling wheel bounce from chassis roll in 1 millisecond.',
  },
  'susp.spring': {
    name: 'Progressive Helical Coilover Spring',
    system: 'Chassis & Suspension',
    material: 'Silicon-chrome spring steel with shot-peened finish',
    spec: '75 N/mm initial rate → 120 N/mm progressive rate',
    description:
      'Absorbs high-frequency road undulations while providing progressive stiffness under heavy lateral cornering load, dive, and squat.',
  },
  'susp.wishboneLower': {
    name: 'Lower Tubular A-Arm (Wishbone)',
    system: 'Suspension Geometry',
    material: 'Forged 6082-T6 aircraft-grade aluminum',
    spec: 'Topology optimized with outboard spherical ball joints',
    description:
      'Controls wheel hub camber recovery through full vertical deflection travel, keeping the tire contact patch flat against the tarmac during aggressive cornering.',
  },
  'brk.disc': {
    name: '410mm Carbon-Silicon Carbide (C/SiC) Rotor',
    system: 'Braking Dynamics',
    material: 'Carbon-fiber matrix infiltrated with liquid silicon at 1700°C',
    spec: '410mm × 38mm Ventilated (Centrifugal Vanes)',
    description:
      'Delivers zero brake fade up to 1,000°C while slashing rotational unsprung inertia by 50% compared to cast iron. Cross-drilled holes expel hot friction boundary gases.',
  },
  'brk.caliper': {
    name: '6-Piston Monobloc Brake Caliper',
    system: 'Braking Dynamics',
    material: 'CNC-machined single billet aerospace aluminum',
    spec: 'Differential piston diameters (28mm / 32mm / 36mm)',
    description:
      'Rigid bridge design eliminates caliper flex under maximum 80-bar hydraulic line pressure. Differential piston bores ensure uniform brake pad clamping pressure.',
  },
  'ac.condenser': {
    name: 'Microchannel Condenser Radiator Core',
    system: 'HVAC & Thermal',
    material: 'Extruded louvered aluminum microchannel tubes',
    spec: '12 kW Heat Rejection Capacity',
    description:
      'Cools high-pressure, superheated refrigerant vapor into subcooled liquid via frontal ambient airflow and auxiliary electric suction fans.',
  },
  'ac.compressor': {
    name: 'Variable Swashplate AC Compressor',
    system: 'HVAC & Thermal',
    material: 'Die-cast aluminum with swashplate axial pistons',
    spec: '180cc Variable displacement (5% to 100%)',
    description:
      'Continuously modulates displacement via an internal pulse-width modulation solenoid valve, eliminating compressor cycling shock and parasitic horsepower loss.',
  },
};
