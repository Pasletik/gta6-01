// Solara Bay: boot and the one loop. The world advances in fixed 1/60 s steps, the renderer
// paints what is there, and the game moves between title, play, paused and end screens.
// ?seed=N fixes the city. ?shot=cover|street|drive|mission (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import * as THREE from 'three';
import { SAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createEffects } from './effects.js';
import { createPlayer } from './player.js';
import { createVehicles } from './vehicles.js';
import { createPeds } from './peds.js';
import { createWanted } from './wanted.js';
import { createCombat } from './combat.js';
import { createMissions } from './missions.js';
import { createHud } from './hud.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

const rng = createRandom(seed);
const world = createWorld(scene, rng);
const input = createInput(canvas);
const audio = createAudio();
const effects = createEffects(scene);
const hud = createHud();
const player = createPlayer(scene);
const vehicles = createVehicles(scene, world, rng, effects, audio);
const peds = createPeds(scene, world, rng);
const wanted = createWanted((level) => {
  hud.setWanted(level);
});
const combat = createCombat(scene, camera, audio);

const game = {
  scene, camera, renderer, world, player, vehicles, peds, wanted, combat, hud, audio, effects, input, rng,
  state: 'title',
  time: 0,
  bustedTimer: 0,
  shotInput: null,
  onStoryComplete(money) {
    saveGame(money, true);
    game.state = 'end';
  },
  setShotInput(value) {
    game.shotInput = value;
  },
  stepGame(dt) {
    updateGame(dt);
  },
  renderGame() {
    player.updateCamera(camera, 0);
    renderer.render(scene, camera);
  },
};

const missions = createMissions({ ...game, onStoryComplete: game.onStoryComplete });
game.missions = missions;

vehicles.spawnParked(10);
vehicles.spawnTraffic(14);

function saveGame(money, done) {
  try {
    const best = Math.max(money, readSave()?.best || 0);
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ money, index: missions.index, done, best }));
  } catch {
    // Storage can be off: the night lasts this visit only.
  }
}

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function activeInput() {
  return game.shotInput || input;
}

function tryEnterCar() {
  const car = vehicles.nearestCar(player.pos, 4.5, ['parked']);
  if (!car) return;
  const witnessed = peds.peds.some((p) => p.state !== 'down' && Math.hypot(p.pos.x - player.pos.x, p.pos.z - player.pos.z) < 25)
    || vehicles.cars.some((c) => c.kind === 'police' && Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z) < 40);
  vehicles.setPlayerCar(car);
  player.inCar = true;
  player.car = car;
  player.pos.copy(car.pos);
  player.heading = car.heading;
  player.yaw = car.heading + Math.PI;
  audio.click();
  if (witnessed) {
    wanted.add(1, 'car theft');
    hud.toast('Someone saw that. The cops are coming.');
  } else {
    hud.toast('Clean getaway — for now.');
  }
}

function exitCar() {
  const car = player.car;
  if (!car) return;
  vehicles.setPlayerCar(null);
  player.inCar = false;
  player.car = null;
  const side = { x: Math.cos(player.heading), z: -Math.sin(player.heading) };
  player.pos.set(car.pos.x + side.x * 2.6, 0, car.pos.z + side.z * 2.6);
  player.heading = car.heading;
  player.yaw = car.heading + Math.PI;
  audio.click();
}

function updateGame(dt) {
  game.time += dt;
  const inp = activeInput();
  if (game.state === 'play' || game.shotInput) {
    if (inp.takeInteract()) {
      if (player.inCar) exitCar();
      else tryEnterCar();
    }
    if (inp.takeReload()) combat.reload();
    if (inp.takeShoot() && !player.inCar) {
      const policeCars = vehicles.cars.filter((c) => c.kind === 'police' && !c.disabled);
      combat.shoot(policeCars, peds.peds, (car, point) => {
        car.health -= 34;
        effects.burst(point, { r: 1, g: 0.6, b: 0.2 }, 8, 3, 2);
        if (car.health <= 0 && !car.disabled) {
          car.disabled = true;
          car.despawn = 0;
          effects.burst(car.pos, { r: 0.4, g: 0.4, b: 0.4 }, 26, 5, 4);
          hud.toast('Patrol car disabled.');
        }
        wanted.add(1, 'shot a cop');
      }, (point) => {
        peds.scatterFrom(point, 18);
      });
    }
    player.update(dt, inp, world, vehicles.cars);
    vehicles.update(dt, { player, wanted, input: inp, effects, audio });
    peds.update(dt, player, vehicles.cars, effects, () => {
      wanted.add(1, 'hit a pedestrian');
      hud.toast('You hit a pedestrian. The cops noticed.');
    });
    combat.update(dt);
    effects.update(dt);
    world.update(dt, game.time, player.pos);
    missions.update(dt, game.time);
    const seen = vehicles.cars.some((c) => c.kind === 'police' && !c.disabled && Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z) < 40);
    wanted.update(dt, seen);
    audio.siren(wanted.level > 0, dt);
    // Police on foot: touched too long means busted; rammed means hurt.
    if (!player.inCar) {
      let touched = false;
      for (const car of vehicles.cars) {
        if (car.kind !== 'police' || car.disabled) continue;
        const d = Math.hypot(car.pos.x - player.pos.x, car.pos.z - player.pos.z);
        if (d < 2.6) touched = true;
        if (d < 3.2 && Math.abs(car.speed) > 4) {
          player.health -= 22 * dt;
          player.pos.x += ((player.pos.x - car.pos.x) / (d || 1)) * 3 * dt;
          player.pos.z += ((player.pos.z - car.pos.z) / (d || 1)) * 3 * dt;
        }
      }
      game.bustedTimer = touched ? game.bustedTimer + dt : 0;
      if (game.bustedTimer > 0.9) {
        endGame('busted');
        return;
      }
    }
    if (player.health <= 0) {
      endGame('wasted');
      return;
    }
    hud.setHealth(player.health);
    hud.setMoney(missions.money);
    hud.setSpeed(player.inCar && player.car ? Math.abs(player.car.speed) * 3.6 : 0, player.inCar, combat.ammo);
    hud.drawMinimap(world, player, vehicles.cars, peds.peds, missions.markerPos(), game.time);
  }
  if (game.state === 'play' && inp.takePause()) {
    game.state = 'pause';
    hud.showScreen('pause');
  } else if (game.state === 'pause' && inp.takePause()) {
    game.state = 'play';
    hud.showScreen('play');
  }
}

function endGame(kind) {
  saveGame(missions.money, missions.done);
  game.state = 'end';
  audio.engineOff();
  audio.siren(false, 0);
  hud.showEnd(kind, missions.money);
}

function startNight(fresh) {
  audio.ensure();
  if (fresh) {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch {
      // Ignore storage errors.
    }
    missions.reset();
    player.health = 100;
  } else {
    const save = readSave();
    if (save) {
      missions.money = save.money || 150;
      if (save.index > 0 && save.index < 3) missions.debugSet(save.index, 0);
    }
  }
  game.state = 'play';
  hud.showScreen('play');
  hud.toast('Solara Bay. One night, three jobs. Good luck, Dante.');
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById('start-btn').addEventListener('click', () => startNight(true));
document.getElementById('continue-btn').addEventListener('click', () => startNight(false));
document.getElementById('resume-btn').addEventListener('click', () => {
  game.state = 'play';
  hud.showScreen('play');
});
document.getElementById('restart-btn').addEventListener('click', () => window.location.reload());
document.getElementById('again-btn').addEventListener('click', () => window.location.reload());

// The Continue button only matters when a save exists.
document.getElementById('continue-btn').style.display = readSave() ? 'inline-block' : 'none';

document.addEventListener('keydown', (event) => {
  if (event.code === 'KeyM') audio.setMuted(!audio.isMuted());
  if (event.code === 'Enter' && game.state === 'title') startNight(true);
});

hud.setWanted(0);
hud.setHealth(100);
hud.setMoney(missions.money);

if (shot) {
  game.state = 'play';
  stageShot(shot, game);
} else {
  hud.showScreen('title');
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    accumulator += elapsed;
    while (accumulator >= STEP) {
      updateGame(STEP);
      accumulator -= STEP;
    }
    if (game.state !== 'title') {
      player.updateCamera(camera, elapsed);
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
