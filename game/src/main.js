// Solara Bay — game boot, loop, state machine, self-test.
import * as THREE from 'three';
import { CFG } from './config.js';
import { makeRng } from './random.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { World } from './world.js';
import { Effects } from './effects.js';
import { Player } from './player.js';
import { Traffic, spawnParkedCars } from './vehicles.js';
import { Peds } from './peds.js';
import { Wanted } from './wanted.js';
import { Missions } from './missions.js';
import { Combat } from './combat.js';
import { HUD } from './hud.js';
import { stageShot } from './shots.js';

export class Game {
  constructor() {
    const q = new URLSearchParams(location.search);
    this.seed = parseInt(q.get('seed') || '1', 10) || 1;
    this.shot = q.get('shot');
    this.selftest = q.get('selftest') === '1';
    this.rng = makeRng(this.seed);
    this.state = 'title';
    this.time = 0;
    this.money = 250;
    this.camMode = 'follow';
    this.shotDrive = null;
    this.ramCooldown = 0;
    this.saveKey = 'solara-bay-save-v1';

    this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('game') });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe8a06a);
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1600);
    this.camera.position.set(0, 60, 120);

    this.input = new Input();
    this.audio = new AudioSys();
    this.world = new World(this.scene, this.rng);
    this.world.attachRenderer(this.renderer);
    this.effects = new Effects(this.scene);
    this.player = new Player(this.scene, this.rng);
    this.traffic = new Traffic(this.scene, this.rng);
    this.parkedCars = spawnParkedCars(this.scene, this.rng);
    this.playerCar = this.parkedCars[0];
    this.peds = new Peds(this.scene, this.rng);
    this.wanted = new Wanted(this.scene, this.rng, this.audio);
    this.wanted.onBusted = () => this.busted();
    this.missions = new Missions(this.scene, this);
    this.combat = new Combat(this.scene, this.effects, this.audio);
    this.hud = new HUD();
    this.camPos = new THREE.Vector3(0, 60, 120);
    this.camTarget = new THREE.Vector3(0, 0, 0);

    this.wireUI();
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    this.hud.setMoney(this.money);
    this.hud.setObjective('Press Start — Rosa is waiting at the docks.');
    this.hud.setStars(0);
    this.hud.setHealth(100);
    this.hud.showScreen('screen-title');
    const save = this.loadSave();
    document.getElementById('btn-continue').style.display = save ? 'inline-block' : 'none';
  }

  wireUI() {
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    on('btn-start', () => this.start(false));
    on('btn-continue', () => this.start(true));
    on('btn-resume', () => this.resume());
    on('btn-restart-wasted', () => this.start(false));
    on('btn-restart-busted', () => this.start(false));
    on('btn-restart-complete', () => this.start(false));
    on('btn-title-complete', () => { this.state = 'title'; this.hud.showScreen('screen-title'); });
  }

  loadSave() {
    try { const s = JSON.parse(localStorage.getItem(this.saveKey)); return s && typeof s.money === 'number' ? s : null; }
    catch { return null; }
  }
  save() {
    try {
      localStorage.setItem(this.saveKey, JSON.stringify({ money: this.money, mission: this.missions.index }));
    } catch { /* noop */ }
  }
  addMoney(n) { this.money += n; this.hud.setMoney(this.money); this.save(); }
  toast(msg) { this.hud.toast(msg); }

  start(fromSave) {
    const save = fromSave ? this.loadSave() : null;
    this.player.reset();
    this.wanted.clear();
    this.missions.index = save ? save.mission : 0;
    this.missions.stage = 0;
    this.missions.moveBeacon();
    this.money = save ? save.money : 250;
    this.time = 0;
    this.state = 'playing';
    this.hud.hideScreens();
    this.hud.setMoney(this.money);
    this.hud.setHealth(100);
    this.hud.setStars(0);
    this.hud.setObjective(this.missions.objective());
    this.audio.resume();
    this.input.lockPointer(document.getElementById('game'));
  }
  resume() { if (this.state === 'paused') { this.state = 'playing'; this.hud.hideScreens(); } }
  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.hud.showScreen('screen-pause');
    this.input.unlockPointer();
    this.audio.setEngine(false);
    this.audio.setSiren(false);
  }
  wasted() {
    if (this.state !== 'playing') return;
    this.state = 'wasted';
    this.hud.showScreen('screen-wasted');
    this.input.unlockPointer();
    this.audio.setEngine(false); this.audio.setSiren(false);
    this.save();
  }
  busted() {
    if (this.state !== 'playing') return;
    this.state = 'busted';
    this.hud.showScreen('screen-busted');
    this.input.unlockPointer();
    this.audio.setEngine(false); this.audio.setSiren(false);
    this.save();
  }
  onAllMissionsDone() {
    this.state = 'complete';
    this.hud.showScreen('screen-complete');
    this.input.unlockPointer();
    this.audio.setEngine(false); this.audio.setSiren(false);
    try { localStorage.removeItem(this.saveKey); } catch { /* noop */ }
  }

  nearestParked(maxD = 3.6) {
    let best = null, bd = maxD;
    for (const c of this.parkedCars) {
      const d = Math.hypot(c.pos.x - this.player.pos.x, c.pos.z - this.player.pos.z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  enterCar(car) {
    this.player.inCar = car;
    this.player.group.visible = false;
    const i = this.parkedCars.indexOf(car);
    if (i >= 0) this.parkedCars.splice(i, 1);
    // theft in view?
    let seen = false;
    for (const p of this.peds.list) if (p.state !== 'down' && Math.hypot(p.pos.x - car.pos.x, p.pos.z - car.pos.z) < 26) seen = true;
    for (const pc of this.wanted.police) if (!pc.disabled && Math.hypot(pc.pos.x - car.pos.x, pc.pos.z - car.pos.z) < 30) seen = true;
    if (seen) { this.wanted.addCrime(1); this.toast('Car stolen — the heat is on!'); }
    this.audio.blip(520, 0.07);
  }
  exitCar() {
    const car = this.player.inCar;
    if (!car || Math.abs(car.speed) > 1.5) return;
    const side = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
    this.player.pos.copy(car.pos).addScaledVector(side, 2.2);
    this.player.pos.y = 0;
    this.player.heading = car.heading;
    this.player.inCar = null;
    this.player.group.visible = true;
    this.player.group.position.copy(this.player.pos);
    this.parkedCars.push(car);
  }

  stepPlaying(dt, staged = false) {
    this.time += dt;
    const p = this.player;
    // pause keys (not in staged mode)
    if (!staged && (this.input.pressed('Escape') || this.input.pressed('KeyP'))) { this.pause(); return; }
    // enter / exit car
    if (!staged && this.input.pressed('KeyE')) {
      if (p.inCar) this.exitCar();
      else { const c = this.nearestParked(); if (c) this.enterCar(c); }
    }
    // driving / walking
    if (p.inCar) {
      let throttle = 0, steer = 0, brake = false;
      if (this.shotDrive) {
        throttle = this.shotDrive.throttle; steer = this.shotDrive.steer;
        // loop the chase so the shot always catches the car mid-road
        const sd = this.shotDrive;
        if (sd.axis === 'z' && sd.dir === 1 && p.inCar.pos.z > sd.end) {
          const dz = sd.start - p.inCar.pos.z;
          p.inCar.pos.z = sd.start;
          for (const pc of this.wanted.police) pc.pos.z += dz;
        } else if (sd.axis === 'z' && sd.dir === -1 && p.inCar.pos.z < sd.end) {
          const dz = sd.start - p.inCar.pos.z;
          p.inCar.pos.z = sd.start;
          for (const pc of this.wanted.police) pc.pos.z += dz;
        }
      } else {
        if (this.input.down('KeyW', 'ArrowUp')) throttle = 1;
        if (this.input.down('KeyS', 'ArrowDown')) throttle = -1;
        if (this.input.down('KeyA', 'ArrowLeft')) steer = 1;
        if (this.input.down('KeyD', 'ArrowRight')) steer = -1;
        brake = this.input.down('Space');
      }
      p.inCar.drive(dt, throttle, steer, brake);
      const [nx, nz] = this.world.collideCircle(p.inCar.pos.x, p.inCar.pos.z, 1.3);
      const hitWall = nx !== p.inCar.pos.x || nz !== p.inCar.pos.z;
      if (hitWall) {
        if (Math.abs(p.inCar.speed) > 12) this.effects.burst(p.inCar.pos.x, 0.8, p.inCar.pos.z, 0xffaa33, 6, 3, 0.4, -4, 1);
        p.inCar.speed *= 0.55;
        p.inCar.pos.x = nx; p.inCar.pos.z = nz;
      }
      this.audio.setEngine(true, Math.abs(p.inCar.speed) / CFG.carMaxSpeed);
      // skid marks on hard braking
      if (brake && Math.abs(p.inCar.speed) > 8 && Math.random() < 0.5) {
        this.effects.skid(p.inCar.pos.x, p.inCar.pos.z, p.inCar.heading);
      }
    } else {
      p.update(dt, this.input, this.world);
      this.audio.setEngine(false);
      if (!staged && this.input.consumeClick()) {
        this.combat.shoot(this.camera, p, this.world, this.peds, this.wanted, this.wanted.police);
      }
    }
    this.traffic.update(dt);
    this.peds.update(dt, this.world);
    this.wanted.update(dt, p, this.world, this.effects);
    this.missions.update(dt, p, this.time);
    this.combat.update(dt);
    this.effects.update(dt);
    this.world.update(dt, this.time);
    // police ram damage on foot
    this.ramCooldown = Math.max(0, this.ramCooldown - dt);
    if (!p.inCar && this.state === 'playing') {
      for (const pc of this.wanted.police) {
        if (!pc.disabled && Math.hypot(pc.pos.x - p.pos.x, pc.pos.z - p.pos.z) < 2.0 && this.ramCooldown <= 0) {
          p.health -= 25;
          this.hud.setHealth(p.health);
          this.hud.damageFlash();
          this.ramCooldown = 0.9;
          if (p.health <= 0) this.wasted();
        }
      }
    }
    // camera
    const camTarget = new THREE.Vector3();
    const camPos = new THREE.Vector3();
    if (p.inCar) {
      const c = p.inCar;
      const f = new THREE.Vector3(Math.sin(c.heading), 0, Math.cos(c.heading));
      camPos.copy(c.pos).addScaledVector(f, -10).add(new THREE.Vector3(0, 3.6, 0));
      camTarget.copy(c.pos).addScaledVector(f, 9).add(new THREE.Vector3(0, 1.2, 0));
    } else {
      camPos.copy(p.cameraPos());
      camTarget.copy(p.cameraTarget());
    }
    if (staged) { this.camPos.copy(camPos); this.camTarget.copy(camTarget); }
    else {
      const k = 1 - Math.exp(-9 * dt);
      this.camPos.lerp(camPos, k);
      this.camTarget.lerp(camTarget, k);
    }
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
    // HUD
    this.hud.setStars(this.wanted.stars);
    this.hud.setHealth(p.health);
    this.hud.crossEl.style.display = p.inCar ? 'none' : 'block';
    this.hud.setSpeed(p.inCar ? Math.abs(p.inCar.speed) * 3.6 : p.speed * 3.6);
    this.hud.setObjective(this.missions.objective());
    this.hud.update(dt, this);
  }

  runSelfTest() {
    try {
      this.start(false);
      // find nearest parked car and enter it
      let best = null, bd = 1e9;
      for (const c of this.parkedCars) {
        const d = Math.hypot(c.pos.x - this.player.pos.x, c.pos.z - this.player.pos.z);
        if (d < bd) { bd = d; best = c; }
      }
      const start = best.pos.clone();
      this.player.pos.set(best.pos.x + 2.2, 0, best.pos.z);
      this.enterCar(best);
      if (!this.player.inCar) throw new Error('enterCar failed');
      for (let i = 0; i < 60; i++) {
        best.drive(1 / 30, 1, 0, false);
        const [nx, nz] = this.world.collideCircle(best.pos.x, best.pos.z, 1.3);
        best.pos.x = nx; best.pos.z = nz;
        this.traffic.update(1 / 30);
        this.peds.update(1 / 30, this.world);
      }
      const drove = Math.hypot(best.pos.x - start.x, best.pos.z - start.z);
      // brake to a stop before exiting
      for (let i = 0; i < 120 && Math.abs(best.speed) > 1.0; i++) {
        best.drive(1 / 30, 0, 0, true);
        const [bx, bz] = this.world.collideCircle(best.pos.x, best.pos.z, 1.3);
        best.pos.x = bx; best.pos.z = bz;
      }
      this.exitCar();
      if (this.player.inCar) throw new Error('exitCar failed');
      console.log(`[selftest] PASS — nearest parked car ${bd.toFixed(2)}m; drove ${drove.toFixed(1)}m`);
    } catch (e) {
      console.log('[selftest] FAIL — ' + (e && e.message ? e.message : e));
    }
  }

  boot() {
    if (this.selftest) {
      this.runSelfTest();
      // keep rendering one frame so the console log is flushed
      this.renderer.render(this.scene, this.camera);
      return;
    }
    if (this.shot) {
      this.start(false);
      stageShot(this, this.shot);
    }
    const clock = new THREE.Clock();
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (this.state === 'playing') {
        this.stepPlaying(dt);
      } else if (this.state === 'title') {
        this.time += dt;
        const a = this.time * 0.045;
        this.camera.position.set(Math.sin(a) * 135, 58, Math.cos(a) * 135);
        this.camera.lookAt(0, 0, 20);
        this.world.update(dt, this.time);
        this.effects.update(dt);
      } else {
        this.world.update(dt, this.time);
        this.effects.update(dt);
      }
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.boot();
});
