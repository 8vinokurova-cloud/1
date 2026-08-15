// ==========================================================================
// LUXURY SOUND ENGINE (Web Audio API)
// Bespoke synthesizers for envelope chime, champagne toast, and ambient lounge chords
// ==========================================================================

export class LuxuryAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlayingLounge = false;
    this.loungeInterval = null;
    this.gainNode = null;
    this.masterVolume = 0.28;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 1. Crystal Wax Seal Break & Unfold Chime
  playWaxBreakSound() {
    this.init();
    const now = this.ctx.currentTime;

    // Harmonic bell chime
    const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.04);

      noteGain.gain.setValueAtTime(0, now + idx * 0.04);
      noteGain.gain.linearRampToValueAtTime(0.18 / (idx + 1), now + idx * 0.04 + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 1.6);

      osc.connect(noteGain);
      noteGain.connect(this.gainNode);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 1.7);
    });
  }

  // 2. Crystal Champagne Glass Clink
  playChampagneClink() {
    this.init();
    const now = this.ctx.currentTime;

    // Sharp glass attack & pure ringing resonance
    const osc = this.ctx.createOscillator();
    const oscHarmonic = this.ctx.createOscillator();
    const clinkGain = this.ctx.createGain();

    osc.type = 'triangle';
    oscHarmonic.type = 'sine';

    osc.frequency.setValueAtTime(2480, now); // High crystal resonant frequency
    oscHarmonic.frequency.setValueAtTime(4960, now);

    clinkGain.gain.setValueAtTime(0, now);
    clinkGain.gain.linearRampToValueAtTime(0.25, now + 0.005);
    clinkGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    osc.connect(clinkGain);
    oscHarmonic.connect(clinkGain);
    clinkGain.connect(this.gainNode);

    osc.start(now);
    oscHarmonic.start(now);
    osc.stop(now + 1.25);
    oscHarmonic.stop(now + 1.25);
  }

  // 3. Generative Ambient Luxury Lounge Chord Progression
  startLoungeAmbiance() {
    this.init();
    if (this.isPlayingLounge) return;
    this.isPlayingLounge = true;

    // Luxury neo-soul / jazz chords (Fmaj9, Dm9, Am9, Bbmaj9)
    const chordProgressions = [
      [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj9
      [146.83, 220.00, 261.63, 329.63, 440.00], // Dm9
      [110.00, 164.81, 220.00, 261.63, 329.63], // Am9
      [116.54, 174.61, 233.08, 293.66, 349.23]  // Bbmaj9
    ];

    let chordIdx = 0;

    const playChord = () => {
      if (!this.isPlayingLounge) return;

      const chord = chordProgressions[chordIdx];
      chordIdx = (chordIdx + 1) % chordProgressions.length;
      const now = this.ctx.currentTime;
      const duration = 4.8;

      chord.forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const chordGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);
        filter.frequency.linearRampToValueAtTime(750, now + duration * 0.5);
        filter.frequency.linearRampToValueAtTime(450, now + duration);

        chordGain.gain.setValueAtTime(0, now);
        chordGain.gain.linearRampToValueAtTime(0.045, now + 1.2);
        chordGain.gain.linearRampToValueAtTime(0.035, now + duration - 1.2);
        chordGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(filter);
        filter.connect(chordGain);
        chordGain.connect(this.gainNode);

        osc.start(now);
        osc.stop(now + duration);
      });
    };

    playChord();
    this.loungeInterval = setInterval(playChord, 4500);
  }

  stopLoungeAmbiance() {
    this.isPlayingLounge = false;
    if (this.loungeInterval) {
      clearInterval(this.loungeInterval);
      this.loungeInterval = null;
    }
  }

  toggleLoungeAmbiance() {
    if (this.isPlayingLounge) {
      this.stopLoungeAmbiance();
      return false;
    } else {
      this.startLoungeAmbiance();
      return true;
    }
  }
}

export const luxuryAudio = new LuxuryAudioEngine();
