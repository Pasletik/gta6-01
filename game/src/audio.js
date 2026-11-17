// All sound is synthesized with WebAudio: engine hum, police siren, gunshots, pickups and
// crashes. Nothing is loaded from a file, so the game makes no network request.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let engineFilter = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let sirenHigh = false;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch {
      ctx = null;
      return false;
    }
  }

  function blip(frequency, duration, type, volume) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume || 0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function noiseBurst(duration, volume, filterFreq) {
    if (!ctx || muted) return;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1800;
    const gain = ctx.createGain();
    gain.gain.value = volume || 0.4;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  }

  return {
    ensure,
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.32;
    },
    isMuted() {
      return muted;
    },
    engine(speed01, throttle) {
      if (!ctx || muted) return;
      engineOsc.frequency.value = 55 + speed01 * 140 + throttle * 20;
      engineGain.gain.value = 0.05 + speed01 * 0.08 + throttle * 0.04;
    },
    engineOff() {
      if (ctx) engineGain.gain.value = 0;
    },
    siren(on, dt) {
      if (!ctx) return;
      sirenGain.gain.value = on && !muted ? 0.045 : 0;
      if (!on) return;
      sirenTimer += dt;
      if (sirenTimer > 0.45) {
        sirenTimer = 0;
        sirenHigh = !sirenHigh;
        sirenOsc.frequency.value = sirenHigh ? 880 : 660;
      }
    },
    shot() {
      noiseBurst(0.09, 0.5, 2400);
    },
    pickup() {
      blip(660, 0.12, 'sine', 0.3);
      setTimeout(() => blip(990, 0.18, 'sine', 0.3), 90);
    },
    crash() {
      noiseBurst(0.22, 0.5, 500);
    },
    click() {
      blip(440, 0.06, 'square', 0.12);
    },
    mission() {
      blip(523, 0.14, 'triangle', 0.3);
      setTimeout(() => blip(659, 0.14, 'triangle', 0.3), 120);
      setTimeout(() => blip(784, 0.22, 'triangle', 0.3), 240);
    },
  };
}
