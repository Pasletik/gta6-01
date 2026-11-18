// Solara Bay — the game itself: renderer, loop, state machine, camera,
// save/load and the scripted self-test. Wires every module together.

import * as THREE from 'three';
import { CFG } from './config.js';
import { mulberry32 } from './random.js';
import { buildWorld } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createEffects } from './effects.js';
import { createPlayer } from './player.js';
import { createVehicles } from './vehicles.js';
import { createPeds } from './peds.js';
import { createWanted } from './wanted.js';
import { createMissions } from './missions.js';
import { createCombat } from './combat.js';
import { createHud } from './hud.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(location.search);
const SEED = Number(params.get('seed') || 1);
const SHOT = params.get('shot') || null;
const SELFTEST = params.get('selftest') === '1';

// surface page errors where headless runs can read them
window.__errs = [];
window.addEventListener('error', (e) => {
  window.__errs.push(String(e.message || e.error));
  document.title = 'ERR:' + (e.message || 'unknown');
});
window.addEventListener('unhandledrejection', (e) => {
  window.__errs.push('rejection:' + String(e.reason));
});

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec9e8);
scene.fog = new THREE.Fog(0x8ec9e8, 180, 420);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 900);

const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 1.05);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2cf, 2.1);
sun.position.set(120, 180, 60);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -200;
sun.shadow.camera.right = 200;
sun.shadow.camera.top = 200;
sun.shadow.camera.bottom = -200;
sun.shadow.camera.far = 500;
scene.add(sun);

const rng = mulberry32(SEED);
const G = {
  scene,
  camera,
  renderer,
  rng,
  seed: SEED,
  time: 0,
  state: 'title', // title | playing | paused | wasted | busted | complete
  camYaw: Math.PI * 0.9,
  camPitch: 0.32,
  camDist: 10,
  camHeight: 4.5,
  camKick: 0,
  shotMode: false,
  world: null,
  input: null,
  audio: null,
  effects: null,
  player: null,
  vehicles: null,
  peds: null,
  wanted: null,
  missions: null,
  combat: null,
  hud: null,
};

G.world = buildWorld(scene, rng);
G.input = createInput(canvas);
G.audio = createAudio();
G.effects = createEffects(scene);
G.player = createPlayer(scene);
G.vehicles = createVehicles(scene, rng, G.world);
G.peds = createPeds(scene, rng);
G.wanted = createWanted();
G.missions = createMissions(G);
G.combat = createCombat(scene);
G.hud = createHud(G, {
  onStart(fromSave) {
    G.audio.ensure();
    startGame(fromSave);
  },
  onResume() {
    G.state = 'playing';
    G.hud.showScreen(null);
  },
  onRestart() {
    resetGame();
    G.state = 'playing';
    G.hud.showScreen(null);
  },
});

// --- save / load -----------------------------------------------------------
const SAVE_KEY = 'solara-bay-save-v1';
G.save = function () {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: G.player.money,
      missionIndex: G.missions.index,
      health: G.player.health,
    }));
  } catch { /* private mode etc. */ }
};
G.loadSave = function () {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// --- state transitions -----------------------------------------------------
function resetGame() {
  G.player.reset(0, 8, 0);
  G.player.money = 0;
  G.wanted.setLevel(0);
  G.wanted.quietTime = 0;
  for (const c of G.vehicles.police) G.vehicles.despawnPolice(c);
  G.missions.start();
  G.hud.showScreen(null);
}

function startGame(fromSave) {
  resetGame();
  if (fromSave) {
    const save = G.loadSave();
    if (save) {
      G.player.money = save.money || 0;
      if (save.missionIndex > 0) G.missions.restore(save.missionIndex);
      G.hud.toast('Save loaded — welcome back, Dante.');
    }
  }
  G.state = 'playing';
  G.hud.showScreen(null);
}

G.onBusted = function () {
  if (G.state !== 'playing') return;
  G.state = 'busted';
  G.audio.busted();
  G.audio.setSiren(false);
  G.save();
  G.hud.showScreen('busted');
};

G.onWasted = function () {
  if (G.state !== 'playing') return;
  G.state = 'wasted';
  G.audio.setSiren(false);
  G.save();
  G.hud.showScreen('wasted');
};

G.onAllMissionsDone = function () {
  if (G.state !== 'playing') return;
  G.state = 'complete';
  G.audio.setSiren(false);
  G.save();
  G.hud.showScreen('complete');
};

// --- enter / exit car ------------------------------------------------------
function tryEnterExitCar() {
  const P = G.player;
  if (P.car) {
    // exit: step out beside the car, it rolls to a stop
    const car = P.car;
    car.speed = 0;
    P.car = null;
    P.group.visible = true;
    const side = Math.cos(car.heading) > 0 ? 1 : -1;
    P.pos.set(car.x + side * 2.6, 0, car.z);
    P.yaw = car.heading;
    P.group.position.copy(P.pos);
    return;
  }
  const car = G.vehicles.nearestCar(P.pos.x, P.pos.z, 4.5, true);
  if (!car) return;
  P.car = car;
  P.group.visible = false;
  P.pos.set(car.x, 0, car.z);
  if (car.isMission) {
    G.wanted.addHeat(1);
    G.hud.toast('You stole the getaway car — the heat is on.');
  } else {
    // stealing in view of a pedestrian or a cruiser adds heat
    let witnessed = false;
    for (const p of G.peds.list) {
      if (Math.hypot(p.x - P.pos.x, p.z - P.pos.z) < 22) { witnessed = true; break; }
    }
    if (!witnessed) {
      for (const c of G.vehicles.police) {
        if (c.active && Math.hypot(c.x - P.pos.x, c.z - P.pos.z) < 45) { witnessed = true; break; }
      }
    }
    if (witnessed) {
      G.wanted.addHeat(1);
      G.hud.toast('Someone saw you take that car.');
    }
  }
  G.audio.setEngine(0, true);
}

// --- camera ----------------------------------------------------------------
function updateCamera(dt) {
  if (!G.shotMode && G.state === 'playing') {
    const m = G.input.consumeMouse();
    G.camYaw -= m.dx * 0.0032;
    G.camPitch = Math.max(0.06, Math.min(1.05, G.camPitch + m.dy * 0.0032));
  }
  const target = G.player.car
    ? new THREE.Vector3(G.player.car.x, 1.2, G.player.car.z)
    : new THREE.Vector3(G.player.pos.x, 1.6, G.player.pos.z);
  const dist = G.camDist;
  const cp = Math.cos(G.camPitch);
  const sp = Math.sin(G.camPitch);
  const cx = target.x + Math.sin(G.camYaw) * dist * cp;
  const cz = target.z + Math.cos(G.camYaw) * dist * cp;
  const cy = target.y + G.camHeight * sp + 1.2;
  camera.position.set(cx, cy, cz);
  if (G.camKick > 0) {
    camera.position.y += (Math.random() - 0.5) * G.camKick;
    camera.position.x += (Math.random() - 0.5) * G.camKick;
    G.camKick = Math.max(0, G.camKick - dt * 0.25);
  }
  camera.lookAt(target.x, target.y + 0.4, target.z);
}

// --- one playing step: the same code the live loop runs -------------------
function stepPlaying(dt) {
  if (G.input.pressed('KeyE')) tryEnterExitCar();
  if (G.input.pressed('KeyP') || G.input.pressed('Escape')) {
    G.state = 'paused';
    G.hud.showScreen('pause');
    return;
  }
  G.player.update(dt, G);
  if (G.player.car) G.vehicles.drivePlayer(dt, G);
  G.vehicles.updateTraffic(dt);
  G.vehicles.updatePolice(dt, G);
  G.peds.update(dt);
  G.wanted.update(dt, G);
  G.missions.update(dt);
  G.combat.update(dt, G);
  // police ramming a driven car hurts Dante; on foot the arrest timer rules
  if (G.player.car) {
    for (const c of G.vehicles.police) {
      if (!c.active || c.disabled) continue;
      if (Math.hypot(c.x - G.player.pos.x, c.z - G.player.pos.z) < 4.2) {
        G.player.health -= 7 * dt;
      }
    }
    if (G.player.health <= 0) G.onWasted();
  }
}

// --- self-test (?selftest=1): runs the real loop synchronously -------------
// Under SwiftShader only a handful of rAF frames run before the screenshot
// is taken, so the test steps stepPlaying() itself, 90 steps at dt 0.05.
function runSelftest() {
  const P = G.player;
  const V = G.vehicles;
  let result = null;
  let startX = 0, startZ = 0;
  for (let i = 0; i < 90 && !result; i++) {
    if (i === 2) {
      // stand next to the first parked car and press E
      const car = V.parked[0];
      P.pos.set(car.x + 2.5, 0, car.z);
      P.group.position.copy(P.pos);
      G.input.testKeys = { KeyE: true };
    }
    if (i === 8) {
      if (!P.car) result = 'FAIL: E did not enter a car';
      else {
        startX = P.car.x;
        startZ = P.car.z;
        // aim straight down road x=96 so the drive cannot hit a building
        P.car.heading = 0;
        G.input.testKeys = { KeyW: true };
      }
    }
    if (i === 50) {
      const moved = Math.hypot(P.car.x - startX, P.car.z - startZ);
      if (moved < 5) result = 'FAIL: car did not drive (moved ' + moved.toFixed(1) + 'u)';
      else G.input.testKeys = { KeyE: true };
    }
    if (i === 58) {
      if (P.car) result = 'FAIL: E did not exit the car';
      else result = 'PASS';
    }
    if (!result) stepPlaying(0.05);
  }
  result = result || 'FAIL: timeout';
  document.title = 'SELFTEST:' + result;
  console.log('[selftest] ' + result);
}

// --- main loop ---------------------------------------------------------------
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  G.time += dt;

  if (G.state === 'playing') {
    stepPlaying(dt);
  } else if (G.state === 'paused') {
    if (G.input.pressed('KeyP') || G.input.pressed('Escape')) {
      G.state = 'playing';
      G.hud.showScreen(null);
    }
  }

  // water shimmer, always
  for (const m of G.world.waterMats) {
    if (m.map) m.map.offset.x += dt * 0.008;
  }
  G.effects.update(dt);
  updateCamera(dt);
  if (G.state === 'playing') G.hud.update(dt);
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- boot --------------------------------------------------------------------
if (SHOT) {
  applyShot(G, SHOT);
} else if (SELFTEST) {
  startGame(false);
  runSelftest();
} else {
  const save = G.loadSave();
  document.getElementById('btn-continue').classList.toggle('hidden', !save);
  if (save) {
    document.getElementById('save-note').textContent = `Save found: $${(save.money || 0).toLocaleString('en-US')}, mission ${(save.missionIndex || 0) + 1} of 3.`;
  }
  G.hud.showScreen('title');
  G.missions.start();
}
frame();
console.log('[solara] boot ok, seed=' + SEED + (SHOT ? ' shot=' + SHOT : '') + (SELFTEST ? ' selftest' : ''));
