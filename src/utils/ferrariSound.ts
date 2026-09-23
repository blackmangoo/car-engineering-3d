/**
 * Authentic Ferrari LaFerrari Audio Controller
 * Uses actual audio tracks extracted from the 6.3L V12 recording:
 * - Startup: /audio/laferrari_startup.mp3 (Starter crank + V12 ignition roar)
 * - Revving: /audio/laferrari_rev.mp3 (Loud throttle revs up to 9,000 RPM)
 * - Driving: /audio/laferrari_drive.mp3 (Track acceleration flyby)
 */
class RealFerrariAudio {
  private startupAudio: HTMLAudioElement | null = null;
  private revAudio: HTMLAudioElement | null = null;
  private driveAudio: HTMLAudioElement | null = null;
  private isEnabled: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.startupAudio = new Audio('/audio/laferrari_startup.mp3');
      this.revAudio = new Audio('/audio/laferrari_rev.mp3');
      this.driveAudio = new Audio('/audio/laferrari_drive.mp3');

      [this.startupAudio, this.revAudio, this.driveAudio].forEach((a) => {
        if (a) a.preload = 'auto';
      });
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (enabled) {
      this.playStartup();
    } else {
      this.stopAll();
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public playStartup() {
    this.stopAll();
    if (this.startupAudio) {
      this.startupAudio.currentTime = 0;
      this.startupAudio.volume = 0.85;
      this.startupAudio.play().catch(() => {
        // User gesture required on some browsers
      });
    }
  }

  public playRev() {
    if (!this.isEnabled) this.isEnabled = true;
    this.stopAll();
    if (this.revAudio) {
      this.revAudio.currentTime = 0;
      this.revAudio.volume = 0.9;
      this.revAudio.play().catch(() => {});
    }
  }

  public playDrive() {
    if (!this.isEnabled) this.isEnabled = true;
    this.stopAll();
    if (this.driveAudio) {
      this.driveAudio.currentTime = 0;
      this.driveAudio.volume = 0.85;
      this.driveAudio.play().catch(() => {});
    }
  }

  public stopAll() {
    [this.startupAudio, this.revAudio, this.driveAudio].forEach((a) => {
      if (a) {
        a.pause();
        a.currentTime = 0;
      }
    });
  }
}

export const ferrariSound = new RealFerrariAudio();
