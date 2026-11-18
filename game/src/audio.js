// Solara Bay — synthesised sound. No audio files ship with the game: every
// sound is a WebAudio oscillator or filtered noise burst, built when the
// player first interacts. Headless runs never create a context, so all of
// this is guarded and silent there.

export function createAudio() {
  const audio = {
    ctx: null,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    sirenOn: false,
    muted: false,
  };

  audio.ensure = function () {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      audio.ctx = new AC();
      // engine hum: sawtooth through a lowpass, pitch follows speed
      audio.engineOsc = audio.ctx.createOscillator();
      audio.engineOsc.type = 'sawtooth';
      audio.engineOsc.frequency.value = 55;
      const lp = audio.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 320;
      audio.engineGain = audio.ctx.createGain();
      audio.engineGain.gain.value = 0;
      audio.engineOsc.connect(lp).connect(audio.engineGain).connect(audio.ctx.destination);
      audio.engineOsc.start();
      // police siren: triangle wave wobbling between two notes
      audio.sirenOsc = audio.ctx.createOscillator();
      audio.sirenOsc.type = 'triangle';
      audio.sirenOsc.frequency.value = 660;
      audio.sirenGain = audio.ctx.createGain();
      audio.sirenGain.gain.value = 0;
      const lfo = audio.ctx.createOscillator();
      lfo.frequency.value = 0.7;
      const lfoGain = audio.ctx.createGain();
      lfoGain.gain.value = 180;
      lfo.connect(lfoGain).connect(audio.sirenOsc.frequency);
      audio.sirenOsc.connect(audio.sirenGain).connect(audio.ctx.destination);
      audio.sirenOsc.start();
      lfo.start();
      return true;
    } catch {
      audio.ctx = null;
      return false;
    }
  };

  audio.setEngine = function (speed01, driving) {
    if (!audio.ctx || !audio.engineGain) return;
    try {
      const t = audio.ctx.currentTime;
      audio.engineGain.gain.setTargetAtTime(driving ? 0.05 + speed01 * 0.06 : 0.015, t, 0.1);
      audio.engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, t, 0.08);
    } catch { /* ignore */ }
  };

  audio.setSiren = function (on) {
    if (!audio.ctx || !audio.sirenGain) return;
    try {
      audio.sirenGain.gain.setTargetAtTime(on ? 0.035 : 0, audio.ctx.currentTime, 0.2);
      audio.sirenOn = on;
    } catch { /* ignore */ }
  };

  function burst(duration, filterFreq, gainVal, type = 'lowpass') {
    if (!audio.ctx) return;
    try {
      const len = Math.max(1, Math.floor(audio.ctx.sampleRate * duration));
      const buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = audio.ctx.createBufferSource();
      src.buffer = buf;
      const f = audio.ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = filterFreq;
      const g = audio.ctx.createGain();
      g.gain.value = gainVal;
      src.connect(f).connect(g).connect(audio.ctx.destination);
      src.start();
    } catch { /* ignore */ }
  }

  function tone(freq, duration, gainVal, type = 'sine', when = 0) {
    if (!audio.ctx) return;
    try {
      const t0 = audio.ctx.currentTime + when;
      const o = audio.ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = audio.ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gainVal, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
      o.connect(g).connect(audio.ctx.destination);
      o.start(t0);
      o.stop(t0 + duration + 0.05);
    } catch { /* ignore */ }
  }

  audio.shot = function () {
    burst(0.14, 1800, 0.5);
    tone(160, 0.08, 0.25, 'square');
  };
  audio.pickup = function () {
    tone(660, 0.12, 0.2);
    tone(880, 0.18, 0.2, 'sine', 0.09);
  };
  audio.missionDone = function () {
    tone(523, 0.14, 0.22);
    tone(659, 0.14, 0.22, 'sine', 0.12);
    tone(784, 0.3, 0.24, 'sine', 0.24);
  };
  audio.thud = function () {
    burst(0.2, 300, 0.5);
  };
  audio.busted = function () {
    tone(392, 0.25, 0.2, 'triangle');
    tone(311, 0.4, 0.2, 'triangle', 0.22);
  };

  return audio;
}
