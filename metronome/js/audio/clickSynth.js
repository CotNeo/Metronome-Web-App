// Simple synthesized "click" using an oscillator and short envelope.
// Accent click uses a higher frequency and louder gain.

const DEFAULTS = {
  normalFreq: 800,
  accentFreq: 1200,
  normalGain: 0.25,
  accentGain: 0.45,
  decaySeconds: 0.05
};

export class ClickSynth {
  constructor(audioContext) {
    this.audioContext = audioContext;
  }

  /**
   * Schedule a click at the given Web Audio time.
   * @param {number} when - audioContext.currentTime based timestamp
   * @param {boolean} accent - whether to use the accent tone
   */
  scheduleClick(when, accent) {
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    const freq = accent ? DEFAULTS.accentFreq : DEFAULTS.normalFreq;
    const maxGain = accent ? DEFAULTS.accentGain : DEFAULTS.normalGain;

    osc.type = "square";
    osc.frequency.setValueAtTime(freq, when);

    gainNode.gain.setValueAtTime(0, when);
    gainNode.gain.linearRampToValueAtTime(maxGain, when + 0.002);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, when + DEFAULTS.decaySeconds);

    osc.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    osc.start(when);
    osc.stop(when + DEFAULTS.decaySeconds + 0.02);
  }
}

