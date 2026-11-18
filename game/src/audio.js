// WebAudio synth sounds. All guarded — headless Chrome may block audio.
export class AudioSys {
  constructor() {
    this.ctx = null; this.master = null; this.engineOsc = null; this.engineGain = null;
    this.sirenOsc = null; this.sirenGain = null; this.enabled = true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { this.enabled = false; return; }
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.25;
      this.master.connect(this.ctx.destination);
    } catch { this.enabled = false; }
  }
  resume() { try { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); } catch { /* noop */ } }
  blip(freq = 660, dur = 0.08, type = 'sine', vol = 0.4) {
    if (!this.enabled || !this.ctx) return;
    try {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.connect(g); g.connect(this.master); o.start(); o.stop(this.ctx.currentTime + dur);
    } catch { /* noop */ }
  }
  shot() {
    if (!this.enabled || !this.ctx) return;
    try {
      const len = 0.12, buf = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = this.ctx.createBufferSource(); s.buffer = buf;
      const g = this.ctx.createGain(); g.gain.value = 0.5;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400;
      s.connect(f); f.connect(g); g.connect(this.master); s.start();
    } catch { /* noop */ }
  }
  chime() { this.blip(880, 0.12); setTimeout(() => this.blip(1320, 0.18), 90); }
  setEngine(on, speed01 = 0) {
    if (!this.enabled || !this.ctx) return;
    try {
      if (on && !this.engineOsc) {
        this.engineOsc = this.ctx.createOscillator(); this.engineOsc.type = 'sawtooth';
        this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0.03;
        const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
        this.engineOsc.connect(f); f.connect(this.engineGain); this.engineGain.connect(this.master);
        this.engineOsc.start();
      }
      if (this.engineOsc) {
        this.engineOsc.frequency.value = 55 + speed01 * 130;
        this.engineGain.gain.value = on ? 0.02 + speed01 * 0.05 : 0.0;
      }
    } catch { /* noop */ }
  }
  setSiren(on) {
    if (!this.enabled || !this.ctx) return;
    try {
      if (on && !this.sirenOsc) {
        this.sirenOsc = this.ctx.createOscillator(); this.sirenOsc.type = 'triangle';
        this.sirenGain = this.ctx.createGain(); this.sirenGain.gain.value = 0.05;
        const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.7;
        const lg = this.ctx.createGain(); lg.gain.value = 320;
        lfo.connect(lg); lg.connect(this.sirenOsc.frequency);
        this.sirenOsc.frequency.value = 750;
        this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
        this.sirenOsc.start(); lfo.start();
      } else if (!on && this.sirenOsc) {
        try { this.sirenOsc.stop(); } catch { /* noop */ }
        this.sirenOsc = null;
      }
    } catch { /* noop */ }
  }
}
