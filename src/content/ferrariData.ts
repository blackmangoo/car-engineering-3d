export interface SectionData {
  id: string;
  stage: string;
  title: string;
  tagline: string;
  quote: string;
  paragraphs: string[];
  metrics: { label: string; value: string; unit: string }[];
  technicalHighlights: { label: string; desc: string }[];
}

export const LAFERRARI_SECTIONS: Record<string, SectionData> = {
  hero: {
    id: 'hero',
    stage: '01',
    title: "L'ESSENZA DI MARANELLO",
    tagline: 'The Definitive Ferrari Hybrid Hypercar',
    quote: '"We chose to call this model LaFerrari because it is the finest expression of our company\'s excellence." — Luca di Montezemolo',
    paragraphs: [
      'Limited to just 499 examples worldwide, LaFerrari represents the pinnacle of Formula 1 technology transferred directly into a street-legal masterpiece.',
      'A harmonious convergence of an atmospheric 6.3-litre V12 screaming to 9,250 RPM and an instantaneous 120 kW electric motor, producing an astounding 963 horsepower.',
    ],
    metrics: [
      { label: 'Combined Output', value: '963', unit: 'CV / 950 HP' },
      { label: '0–100 km/h', value: '< 2.9', unit: 'Seconds' },
      { label: 'Top Speed', value: '> 350', unit: 'km/h' },
      { label: 'Fiorano Lap', value: '1:19.7', unit: 'Minutes' },
    ],
    technicalHighlights: [
      { label: 'Production', desc: 'Strictly limited to 499 individually tailored examples' },
      { label: 'Weight Distribution', desc: '41% Front / 59% Rear for optimal yaw inertia' },
      { label: 'Center of Gravity', desc: 'Lowered by 35 mm compared to the Enzo Ferrari' },
    ],
  },
  aerodynamics: {
    id: 'aerodynamics',
    stage: '02',
    title: 'AERODINAMICA ATTIVA',
    tagline: 'F1 Wind-Tunnel Sculpted Active Downforce',
    quote: 'Seamless integration of active flow control without compromising the sculptural silhouette.',
    paragraphs: [
      'Designed by the Ferrari Centro Stile under Flavio Manzoni, every single intake, sculpted hollow, and duct serves an aerodynamic purpose.',
      'Active front diffusers and guide vanes work in continuous harmony with an active rear spoiler and rear diffuser flaps, automatically balancing downforce and drag coefficients in real-time.',
    ],
    metrics: [
      { label: 'Peak Downforce', value: '360', unit: 'kg @ 200 km/h' },
      { label: 'Active Elements', value: '4', unit: 'Aerodynamic Flaps' },
      { label: 'Drag Coefficient', value: '0.30 - 0.38', unit: 'Active Cd' },
      { label: 'High Speed Grip', value: '+230', unit: 'kg @ 300 km/h' },
    ],
    technicalHighlights: [
      { label: 'Front Diffuser Flaps', desc: 'Automatically deploy to channel air into underbody venturi tunnels' },
      { label: 'Active Rear Spoiler', desc: 'Extends and tilts to act as high-speed downforce stabilizer and airbrake' },
      { label: 'Underbody Vanes', desc: 'Guide vortices away from front tires to seal the ground-effect floor' },
    ],
  },
  powertrain: {
    id: 'powertrain',
    stage: '03',
    title: 'PROPULSORE HY-KERS',
    tagline: 'Naturally Aspirated 65° V12 + Formula 1 KERS',
    quote: 'The maximum power output ever achieved by a naturally aspirated Ferrari engine, multiplied by instantaneous electric torque.',
    paragraphs: [
      'The heart of LaFerrari is a 6,262 cc naturally aspirated 65° V12 engine revving to a spine-tingling 9,250 RPM redline, developing 800 CV on its own.',
      'Coupled to an oil-cooled 120 kW (163 CV) electric motor via the HY-KERS system, electric torque fills the low-RPM power curve, providing instant throttle response before the V12 crescendo takes over.',
    ],
    metrics: [
      { label: 'Combustion Output', value: '800', unit: 'CV @ 9,000 RPM' },
      { label: 'Electric Power', value: '163', unit: 'CV / 120 kW' },
      { label: 'Total Torque', value: '> 900', unit: 'Nm' },
      { label: 'Maximum Engine Speed', value: '9,250', unit: 'RPM' },
    ],
    technicalHighlights: [
      { label: 'Variable Length Runners', desc: 'Acoustically tuned continuously variable intake trumpets' },
      { label: 'Battery Architecture', desc: 'Superconducting 60 kg lithium-ion battery pack integrated into floor' },
      { label: 'HY-KERS Regeneration', desc: 'Recovers kinetic energy under braking and cornering throttle modulation' },
    ],
  },
  chassis: {
    id: 'chassis',
    stage: '04',
    title: 'TELAIO IN CARBONIO',
    tagline: 'Four Distinct Hand-Laminated F1 Autoclave Composites',
    quote: 'Engineered by Rory Byrne and the Scuderia Ferrari F1 technical department.',
    paragraphs: [
      'The chassis is entirely hand-laminated from four different types of military-grade carbon fiber and cured in the Scuderia\'s Formula 1 racing autoclaves.',
      'T800 carbon fiber forms the main cockpit structure, reinforced with unidirectional T1000 tape along key load paths. M46J ultra-high-modulus carbon is applied to the roof, resulting in a 27% increase in torsional rigidity and 22% greater beam stiffness.',
    ],
    metrics: [
      { label: 'Torsional Rigidity', value: '+27', unit: '% vs Enzo' },
      { label: 'Beam Stiffness', value: '+22', unit: '% vs Enzo' },
      { label: 'Dry Weight', value: '1,255', unit: 'kg' },
      { label: 'Autoclave Pressure', value: '6.0', unit: 'Bar' },
    ],
    technicalHighlights: [
      { label: 'Kevlar Undertray', desc: 'Ballistic Kevlar protective shield protecting hybrid electrical lines' },
      { label: 'Integrated Battery Tray', desc: 'Battery cell casing bonded into carbon monocoque floor pan' },
      { label: 'Crash Attenuation', desc: 'Frontal conical impact structure dissipating 45g collision forces' },
    ],
  },
  cockpit: {
    id: 'cockpit',
    stage: '05',
    title: 'ABITACOLO & ERGONOMIA',
    tagline: 'Tailored Driving Position Derived From Fernando Alonso',
    quote: 'The driver does not sit in the car; the driver becomes a structural part of the chassis.',
    paragraphs: [
      'In a revolutionary departure from conventional supercars, the carbon bucket seat is fixed permanently to the monocoque tub. The driver adjusts the pedals and steering wheel towards themselves.',
      'This lowered the seating position by 60 mm, reduced the frontal cross-sectional area, and concentrated the mass directly within the vehicle\'s polar moment of inertia.',
    ],
    metrics: [
      { label: 'Seating Position', value: '-60', unit: 'mm Lower' },
      { label: 'Frontal Area', value: '-30', unit: 'mm Roof Height' },
      { label: 'Steering Controls', value: '100', unit: '% Integrated' },
      { label: 'Digital Displays', value: '12.3', unit: 'Inch TFT' },
    ],
    technicalHighlights: [
      { label: 'F1 Steering Wheel', desc: 'Flattened rim containing turn signals, wiper, high-beams, and Manettino' },
      { label: 'Adjustable Pedal Box', desc: 'Mechanical pull-lever adjusting accelerator and brake pedal distance' },
      { label: 'Carbon Bridge Console', desc: 'Suspended central carbon blade housing launch control and reverse switches' },
    ],
  },
};

export interface SpecCategory {
  category: string;
  specs: { label: string; value: string }[];
}

export const TECHNICAL_SPECIFICATIONS: SpecCategory[] = [
  {
    category: 'Internal Combustion Engine',
    specs: [
      { label: 'Type', value: '65° Naturally Aspirated V12' },
      { label: 'Bore & Stroke', value: '94.0 mm × 75.2 mm' },
      { label: 'Total Displacement', value: '6,262 cc (6.3 Litres)' },
      { label: 'Compression Ratio', value: '13.5 : 1' },
      { label: 'Maximum Power', value: '800 CV (588 kW) @ 9,000 RPM' },
      { label: 'Maximum Torque', value: '700 Nm (516 lb-ft) @ 6,750 RPM' },
      { label: 'Maximum Engine Speed', value: '9,250 RPM (Electronically Limited)' },
      { label: 'Specific Output', value: '128 CV / Litre' },
    ],
  },
  {
    category: 'HY-KERS Hybrid System',
    specs: [
      { label: 'Total System Power', value: '963 CV (708 kW / 950 bhp)' },
      { label: 'Total System Torque', value: '> 900 Nm (> 664 lb-ft)' },
      { label: 'Electric Motor Output', value: '120 kW (163 CV)' },
      { label: 'Electric Motor Torque', value: '270 Nm (Instantaneous)' },
      { label: 'Battery Weight', value: '60 kg' },
      { label: 'Battery Cells', value: '120 cells in 8 modules (Magneti Marelli)' },
      { label: 'Charging Method', value: 'Regenerative braking & V12 excess torque' },
    ],
  },
  {
    category: 'Transmission & Dynamics',
    specs: [
      { label: 'Gearbox', value: '7-Speed Dual-Clutch F1 Transaxle' },
      { label: 'Front Suspension', value: 'Double Wishbone with Magnetic SCM-E Frs' },
      { label: 'Rear Suspension', value: 'Multi-Link Independent with Magnetic SCM-E Frs' },
      { label: 'Front Brakes', value: 'Brembo Carbon-Ceramic 398 × 36 mm (6-Piston)' },
      { label: 'Rear Brakes', value: 'Brembo Carbon-Ceramic 380 × 34 mm (4-Piston)' },
      { label: 'Front Tyres', value: 'Pirelli P-Zero Corsa 265/30 R19' },
      { label: 'Rear Tyres', value: 'Pirelli P-Zero Corsa 345/30 R20' },
      { label: 'Electronic Controls', value: 'ESC, High-Perf ABS/EBD, EF1-Trac, E-Diff 3' },
    ],
  },
  {
    category: 'Dimensions & Weight',
    specs: [
      { label: 'Overall Length', value: '4,702 mm (185.1 in)' },
      { label: 'Overall Width', value: '1,992 mm (78.4 in)' },
      { label: 'Overall Height', value: '1,116 mm (43.9 in)' },
      { label: 'Wheelbase', value: '2,650 mm (104.3 in)' },
      { label: 'Front Track', value: '1,664 mm' },
      { label: 'Rear Track', value: '1,624 mm' },
      { label: 'Dry Weight', value: '1,255 kg (2,767 lbs)' },
      { label: 'Weight Distribution', value: '41% Front / 59% Rear' },
    ],
  },
  {
    category: 'Homologation Performance',
    specs: [
      { label: 'Top Speed', value: '> 350 km/h (> 217 mph)' },
      { label: '0–100 km/h (0–62 mph)', value: '< 2.9 seconds' },
      { label: '0–200 km/h (0–124 mph)', value: '< 6.9 seconds' },
      { label: '0–300 km/h (0–186 mph)', value: '15.0 seconds' },
      { label: '100–0 km/h Braking', value: '30.2 metres' },
      { label: '200–0 km/h Braking', value: '115.0 metres' },
      { label: 'Fiorano Track Record', value: '1 min 19.70 sec' },
      { label: 'Downforce at 200 km/h', value: '360 kg' },
    ],
  },
];
