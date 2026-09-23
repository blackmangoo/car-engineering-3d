/**
 * Web Audio API Ferrari 6.3L V12 & HY-KERS Acoustic Synthesizer
 * Zero external audio downloads required.
 * Generates natural 65° V12 combustion harmonics (6 firing pulses/rev),
 * high-RPM exhaust howl, and high-frequency electric motor whine.
 */
class FerrariSound {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = false;

  private masterGain: GainNode | null = null;
  private oscFund: OscillatorNode | null = null;
  private oscHarmonic: OscillatorNode | null = null;
  private oscSub: OscillatorNode | null = null;
  private oscElectric: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (enabled) {
      this.initContext();
      this.startSynthesizer();
    } else {
      this.stopSynthesizer();
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  private startSynthesizer() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.06, now);

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(650, now);
    this.filter.Q.setValueAtTime(2.5, now);

    // V12 fundamental: 6 combustion pulses per rev = (RPM / 60) * 6
    // At idle (1,000 RPM) -> 100 Hz
    this.oscFund = this.ctx.createOscillator();
    this.oscFund.type = 'sawtooth';
    this.oscFund.frequency.setValueAtTime(100, now);

    // High exhaust overtone
    this.oscHarmonic = this.ctx.createOscillator();
    this.oscHarmonic.type = 'sawtooth';
    this.oscHarmonic.frequency.setValueAtTime(200, now);

    // Deep crank rumble
    this.oscSub = this.ctx.createOscillator();
    this.oscSub.type = 'triangle';
    this.oscSub.frequency.setValueAtTime(50, now);

    // HY-KERS Electric Motor high frequency whine
    this.oscElectric = this.ctx.createOscillator();
    this.oscElectric.type = 'sine';
    this.oscElectric.frequency.setValueAtTime(1400, now);

    const electricGain = this.ctx.createGain();
    electricGain.gain.setValueAtTime(0.008, now);

    this.oscFund.connect(this.filter);
    this.oscHarmonic.connect(this.filter);
    this.oscSub.connect(this.filter);
    this.filter.connect(this.masterGain);

    this.oscElectric.connect(electricGain);
    electricGain.connect(this.masterGain);

    this.masterGain.connect(this.ctx.destination);

    this.oscFund.start(now);
    this.oscHarmonic.start(now);
    this.oscSub.start(now);
    this.oscElectric.start(now);
  }

  public setRPM(rpm: number) {
    if (!this.isEnabled || !this.ctx) return;
    const now = this.ctx.currentTime;

    const clampedRpm = Math.max(900, Math.min(9250, rpm));
    const fundFreq = (clampedRpm / 60) * 6; // V12 firing order frequency
    const filterFreq = 450 + (clampedRpm / 9250) * 3500;

    this.oscFund?.frequency.setTargetAtTime(fundFreq, now, 0.05);
    this.oscHarmonic?.frequency.setTargetAtTime(fundFreq * 2, now, 0.05);
    this.oscSub?.frequency.setTargetAtTime(fundFreq * 0.5, now, 0.05);
    this.oscElectric?.frequency.setTargetAtTime(800 + (clampedRpm / 9250) * 2200, now, 0.05);
    this.filter?.frequency.setTargetAtTime(filterFreq, now, 0.05);
  }

  private stopSynthesizer() {
    try {
      this.oscFund?.stop();
      this.oscHarmonic?.stop();
      this.oscSub?.stop();
      this.oscElectric?.stop();
    } catch {
      // Ignore
    }
  }
}

export const ferrariSound = new FerrariSound();
