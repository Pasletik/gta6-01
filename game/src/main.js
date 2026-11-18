// Solara Bay — the game itself. One job: boot the world, run the loop, and
// wire every system together (driving, camera, crime, missions, save).

import * as THREE from 'three';
import { CFG, PLACES } from './config.js';
import { Rng, seedFromUrl } from './random.js';
import { buildWorld, resolveCollisions, clampPlayable } from './world.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { VehicleManager } from './vehicles.js';
import { PedManager } from './peds.js';
import { Combat } from './combat.js';
import { Wanted } from './wanted.js';
import { MissionManager } from './missions.js';
import { Effects } from './effects.js';
import { AudioSys } from './audio.js';
import { Hud } from './hud.js';
import { shotFromUrl, applyShot } from './shots.js';

const G = {
  state: 'title', // title | playing | paused | wasted | busted | complete
  money: 0,
  time: 0,
  camYaw: Math.PI,
  camPitch: 0.42,
  camDist: 13,
  shotPose: null,
  committingCrime: false,
};

function boot() {
  const seed = seedFromUrl();
  const rng = new Rng(seed);
  G.rng = rng;

  // --- Renderer -----------------------------------------------------------
  const canvas = document.getElementById('game-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  G.renderer = renderer;

  const scene = new THREE.Scene();
  G.scene = scene;
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
  G.camera = camera;

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --- Systems --------------------------------------------------------------
  G.world = buildWorld(scene, rng);
  G.input = new Input(canvas);
  G.audio = new AudioSys();
  G.hud = new Hud();
  G.effects = new Effects(scene);
  G.player = new Player(scene, PLACES.spawn.x, PLACES.spawn.z);
  G.vehicles = new VehicleManager(scene, G.world, rng);
  G.peds = new PedManager(scene, G.world, rng);
  G.combat = new Combat(scene);
  G.wanted = new Wanted();
  G.missions = new MissionManager(scene);

  // --- Save ------------------------------------------------------------------
  G.save = () => {
    try {
      localStorage.setItem(CFG.saveKey, JSON.stringify({
        money: G.money,
        mission: G.missions.index,
        health: G.player.health,
      }));
    } catch (e) { /* storage unavailable */ }
  };
  G.loadSave = () => {
    try {
      const raw = localStorage.getItem(CFG.saveKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  };

  // --- Screens ----------------------------------------------------------------
  const titleSave = document.getElementById('title-save-note');
  const continueBtn = document.getElementById('btn-continue');
  const saved = G.loadSave();
  if (saved) {
    titleSave.textContent = 'Save found: $' + Math.floor(saved.money).toLocaleString('en-US')
      + ' — mission ' + (saved.mission + 1) + ' of 3';
    continueBtn.classList.remove('hidden');
  }
  document.getElementById('btn-start').addEventListener('click', () => startGame(false));
  continueBtn.addEventListener('click', () => startGame(true));
  document.getElementById('btn-resume').addEventListener('click', () => resumeGame());
  document.getElementById('btn-restart-wasted').addEventListener('click', () => restartAfterDeath());
  document.getElementById('btn-restart-busted').addEventListener('click', () => restartAfterDeath());
  document.getElementById('btn-again').addEventListener('click', () => restartAfterDeath());

  // --- Scripted screenshot scenes --------------------------------------------
  const shot = shotFromUrl();
  if (shot) {
    G.shotPose = applyShot(shot, G);
    G.state = 'playing';
    G.hud.hideScreens();
    G.hud.setMoney(G.money);
    G.hud.setHealth(G.player.health);
    G.hud.setStars(G.wanted.level);
    const m = G.missions.current();
    if (m) G.hud.setObjective(m.title, m.objective);
    // Frame the shot: skip the title screen entirely.
    document.getElementById('screen-title').classList.add('hidden');
  } else {
    G.hud.showScreen('title');
  }

  // --- Loop -------------------------------------------------------------------
  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    G.time += dt;
    if (G.state === 'playing') update(dt);
    // The world stays alive behind the screens: water bobs, clouds drift.
    animateAmbient(dt);
    updateCamera(dt);
    G.effects.update(dt);
    G.combat.update(dt);
    renderer.render(scene, camera);
    G.input.endFrame();
  }
  frame();
}

function startGame(continueSave) {
  G.audio.init();
  if (continueSave) {
    const saved = G.loadSave();
    if (saved) {
      G.money = saved.money || 0;
      G.missions.setIndex(saved.mission || 0);
      G.player.health = saved.health || CFG.playerMaxHealth;
    }
  } else {
    G.money = 0;
    G.missions.setIndex(0);
    G.player.health = CFG.playerMaxHealth;
  }
  G.wanted.clear();
  G.state = 'playing';
  G.hud.hideScreens();
  G.hud.setMoney(G.money);
  G.hud.setHealth(G.player.health);
  G.hud.setStars(0);
  const m = G.missions.current();
  if (m) G.hud.setObjective(m.title, m.objective);
  G.input.lockPointer();
}

function resumeGame() {
  G.state = 'playing';
  G.hud.hideScreens();
  G.input.lockPointer();
}

function restartAfterDeath() {
  // Fresh run, keeping the money earned so far as a consolation.
  G.player.health = CFG.playerMaxHealth;
  G.player.x = PLACES.spawn.x;
  G.player.z = PLACES.spawn.z;
  if (G.player.inCar) G.player.exitCar();
  G.player.group.position.set(G.player.x, 0, G.player.z);
  G.wanted.clear();
  G.vehicles.ensurePolice(0, 0, 0);
  G.state = 'playing';
  G.hud.hideScreens();
  G.hud.setHealth(G.player.health);
  G.hud.setStars(0);
  G.input.lockPointer();
}

function update(dt) {
  const input = G.input;
  const player = G.player;
  G.committingCrime = false;

  // --- Pause ------------------------------------------------------------------
  if (input.pressed('KeyP') || input.pressed('Escape')) {
    G.state = 'paused';
    G.hud.showScreen('pause');
    input.unlockPointer();
    return;
  }
  if (input.pressed('KeyM')) {
    const muted = G.audio.toggleMute();
    G.hud.toast(muted ? 'Sound muted' : 'Sound on');
  }

  // --- Camera orbit (mouse) ----------------------------------------------------
  G.camYaw -= input.mouseDX * 0.0032;
  G.camPitch = Math.max(0.12, Math.min(1.1, G.camPitch + input.mouseDY * 0.0022));

  const inCar = !!player.inCar;

  // --- On foot ------------------------------------------------------------------
  if (!inCar) {
    const axes = input.moveAxes();
    const running = input.down('ShiftLeft') || input.down('ShiftRight');
    player.update(dt, axes, G.camYaw, G.world.colliders, running);

    // E: enter the nearest car.
    if (input.pressed('KeyE')) {
      const car = G.vehicles.nearestCar(player.x, player.z, 4.5);
      if (car) stealCar(car);
    }
    // Mouse click: fire the pistol.
    if (input.mouseDown || input.pressed('KeyF')) firePistol();
    // Mission 2 pickup: E near the package.
    if (G.missions.index === 1 && !G.missions.packagePicked) {
      const pk = { x: PLACES.docks.x, z: PLACES.docks.z - 20 };
      if (Math.hypot(player.x - pk.x, player.z - pk.z) < 3.2) {
        G.hud.toast('Press E to grab the package');
        if (input.pressed('KeyE')) {
          const reward = G.missions.onReachPackage();
          G.money += reward;
          G.audio.pickup();
          G.effects.sparkle(pk.x, 2, pk.z);
          G.hud.toast('Package secured! +$' + reward);
          G.hud.setMoney(G.money);
          G.wanted.setLevel(3); // the pickup trips the heat: mission 3 begins
          G.save();
          refreshObjective();
        }
      }
    }
  } else {
    // --- Driving -----------------------------------------------------------------
    driveCar(dt, input);
    // E: get out.
    if (input.pressed('KeyE')) {
      player.exitCar();
      G.audio.setEngine(0);
    }
    // Mouse click while driving: honk is too much; fire from the window instead.
    if (input.mouseDown || input.pressed('KeyF')) firePistol();
  }

  // --- Mission 3: reach the safehouse -------------------------------------------
  if (G.missions.index === 2) {
    const sh = PLACES.safehouse;
    const d = Math.hypot(player.x - sh.x, player.z - sh.z);
    if (d < 5) {
      const reward = G.missions.onReachSafehouse();
      G.money += reward;
      G.wanted.clear();
      G.vehicles.ensurePolice(0, 0, 0);
      G.audio.pickup();
      G.audio.setSiren(false);
      G.hud.setMoney(G.money);
      G.state = 'complete';
      document.getElementById('complete-stats').textContent =
        'You banked $' + Math.floor(G.money).toLocaleString('en-US')
        + ' across all three jobs. Solara Bay is yours.';
      G.hud.showScreen('complete');
      G.save();
      input.unlockPointer();
      return;
    }
  }

  // --- Wanted: decay, police ------------------------------------------------------
  G.wanted.update(dt, G.committingCrime);
  G.vehicles.ensurePolice(G.wanted.level, player.x, player.z);
  G.audio.setSiren(G.wanted.level > 0);
  let rammed = false;
  G.vehicles.updatePolice(dt, player.x, player.z, (cop) => {
    rammed = true;
    if (G.shotPose) return; // scripted scenes never waste or bust the player
    if (!inCar) {
      // A cop on foot next to you starts the bust.
      if (G.wanted.touching(dt)) {
        G.state = 'busted';
        G.hud.showScreen('busted');
        input.unlockPointer();
      }
    } else {
      // A ram shakes the car and hurts a little.
      if (player.takeDamage(4 * dt * 10)) {
        G.state = 'wasted';
        G.hud.showScreen('wasted');
        input.unlockPointer();
      }
      G.effects.sparks(player.x, 1, player.z);
      if (Math.random() < dt * 2) G.audio.crash();
    }
  });
  if (!rammed) G.wanted.notTouching();

  // --- Traffic and pedestrians ------------------------------------------------------
  G.vehicles.updateTraffic(dt);
  const dangerR = G.wanted.level > 0 ? 40 : 12;
  G.peds.update(dt, player.x, player.z, dangerR);

  // --- HUD ---------------------------------------------------------------------------
  G.hud.setHealth(player.health);
  G.hud.setStars(G.wanted.level);
  G.hud.setMoney(G.money);
  G.hud.setSpeed(inCar ? Math.abs(player.inCar.speed) * 3.6 : 0, inCar);
  G.hud.setCrosshair(!inCar);
  G.hud.updateToast(dt);
  G.hud.drawMinimap(
    { half: G.world.half, roads: G.world.roads },
    { x: player.x, z: player.z, heading: player.heading },
    G.vehicles.cars,
    G.vehicles.police,
    G.peds.peds,
    G.missions.marker(),
  );

  // --- Ambient audio ---------------------------------------------------------------------
  G.audio.setEngine(inCar ? Math.abs(player.inCar.speed) / CFG.carMaxSpeed : 0);

  // --- Mission objective refresh -----------------------------------------------------------
  refreshObjective();
}

function refreshObjective() {
  const m = G.missions.current();
  if (m) G.hud.setObjective(m.title, m.objective);
  else G.hud.setObjective('Solara Bay', 'Free roam — explore the city');
}

function stealCar(car) {
  const player = G.player;
  const witnessed = G.peds.anyoneNear(player.x, player.z, 26)
    || G.vehicles.police.some((p) => Math.hypot(p.x - player.x, p.z - player.z) < 70);
  const wasOwned = car.owned;
  player.enterCar(car);
  G.audio.tone(220, 0.12, 0.2);
  if (!wasOwned && witnessed) {
    G.wanted.commit(1);
    G.peds.scare(player.x, player.z, 30);
    G.hud.toast('Witnessed! The heat is on');
  }
  if (!wasOwned && G.missions.index === 0) {
    const reward = G.missions.onEnterCar();
    G.money += reward;
    G.audio.pickup();
    G.hud.toast('Wheels Up complete! +$' + reward);
    G.hud.setMoney(G.money);
    G.save();
  }
  refreshObjective();
}

function driveCar(dt, input) {
  const car = G.player.inCar;
  if (!car || car.disabled) return;
  const axes = input.moveAxes();
  // Forward / reverse.
  if (axes.y > 0) car.speed += CFG.carAccel * dt;
  else if (axes.y < 0) {
    if (car.speed > 0.5) car.speed -= CFG.carBrake * dt;
    else car.speed -= CFG.carAccel * 0.6 * dt;
  } else {
    car.speed -= Math.sign(car.speed) * 8 * dt;
    if (Math.abs(car.speed) < 0.5) car.speed = 0;
  }
  car.speed = Math.max(-CFG.carReverseMax, Math.min(CFG.carMaxSpeed, car.speed));
  // Steering follows speed (no turning while parked).
  const steer = axes.x * CFG.carTurn * dt * Math.sign(car.speed || 1)
    * Math.min(1, Math.abs(car.speed) / 8);
  car.heading += steer;
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const r = resolveCollisions(G.world.colliders, nx, nz, 2.2);
  const hitWall = r.x !== nx || r.z !== nz;
  car.x = r.x;
  car.z = r.z;
  const cl = clampPlayable(car.x, car.z);
  if (cl.x !== car.x || cl.z !== car.z) {
    car.x = cl.x;
    car.z = cl.z;
    car.speed *= 0.4;
  }
  if (hitWall && Math.abs(car.speed) > 6) {
    G.effects.sparks(car.x, 1, car.z);
    G.audio.crash();
    car.speed *= 0.45;
  }
  car.sync();
  // Exhaust puffs while moving.
  if (Math.abs(car.speed) > 4 && Math.random() < dt * 14) {
    const bx = car.x - Math.sin(car.heading) * 2.4;
    const bz = car.z - Math.cos(car.heading) * 2.4;
    G.effects.exhaust(bx, 0.5, bz);
  }
  // Running over a ped is a crime.
  const ped = G.peds.nearest(car.x, car.z, 2.6);
  if (ped && Math.abs(car.speed) > 3) {
    G.peds.knockDown(ped);
    G.wanted.commit(1);
    G.committingCrime = true;
    G.peds.scare(car.x, car.z, 30);
    G.effects.debris(car.x, 1, car.z);
    G.audio.crash();
  }
  // Keep the player figure glued to the car.
  G.player.x = car.x;
  G.player.z = car.z;
  G.player.heading = car.heading;
}

function firePistol() {
  const player = G.player;
  const camera = G.camera;
  // Muzzle at the player's shoulder, or the car window while driving.
  const from = new THREE.Vector3(player.x, 1.5, player.z);
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const hit = G.combat.shoot(from, dir, G.peds, G.vehicles.police);
  if (!hit) return;
  G.audio.gunshot();
  G.committingCrime = true;
  if (hit.kind === 'ped') {
    G.peds.knockDown(hit.target);
    G.wanted.commit(1);
    G.peds.scare(hit.point.x, hit.point.z, 30);
    G.effects.debris(hit.point.x, hit.point.y, hit.point.z);
  } else if (hit.kind === 'police') {
    const disabled = G.vehicles.damagePolice(hit.target, CFG.pistolDamage);
    G.wanted.commit(1);
    G.effects.sparks(hit.point.x, hit.point.y, hit.point.z);
    if (disabled) {
      G.effects.smoke(hit.target.x, 1.5, hit.target.z);
      G.hud.toast('Police car disabled!');
    }
  }
}

// Ambient motion that runs even behind menus: water, boats, clouds.
function animateAmbient(dt) {
  const t = G.time;
  if (G.world.water) {
    G.world.water.position.y = -0.4 + Math.sin(t * 0.7) * 0.15;
  }
  for (let i = 0; i < G.world.boats.length; i++) {
    const b = G.world.boats[i];
    b.position.y = 0.2 + Math.sin(t * 0.9 + i * 2) * 0.12;
    b.rotation.z = Math.sin(t * 0.6 + i) * 0.02;
  }
  for (let i = 0; i < G.world.clouds.length; i++) {
    const c = G.world.clouds[i];
    c.position.x += dt * 1.2;
    if (c.position.x > 340) c.position.x = -340;
  }
}

// Third-person camera: orbit behind the player (or the car), or the scripted
// pose while a screenshot scene is active — the pose follows the player, so
// a moving car stays framed.
function updateCamera(dt) {
  const camera = G.camera;
  const player = G.player;
  if (G.shotPose) {
    const p = G.shotPose;
    camera.position.set(player.x + p.offset.x, p.offset.y, player.z + p.offset.z);
    camera.lookAt(player.x + p.look.x, p.look.y, player.z + p.look.z);
    return;
  }
  const targetX = player.x;
  const targetZ = player.z;
  const dist = G.camDist;
  const height = 2 + Math.sin(G.camPitch) * dist * 0.55;
  const back = Math.cos(G.camPitch) * dist;
  const cx = targetX - Math.sin(G.camYaw) * back;
  const cz = targetZ - Math.cos(G.camYaw) * back;
  // Smooth the camera so it does not snap.
  const k = 1 - Math.pow(0.0001, dt);
  camera.position.x += (cx - camera.position.x) * k;
  camera.position.y += (height - camera.position.y) * k;
  camera.position.z += (cz - camera.position.z) * k;
  camera.lookAt(targetX, 1.8, targetZ);
}

boot();
