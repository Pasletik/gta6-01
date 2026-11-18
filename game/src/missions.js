// Story missions: Wheels Up -> The Package -> Heat Wave.
import * as THREE from 'three';
import { MISSIONS } from './config.js';

export class Missions {
  constructor(scene, game) {
    this.scene = scene;
    this.game = game;
    this.index = 0;          // 0..2, 3 = all done
    this.stage = 0;          // mission 2 has a pickup stage
    this.pickedUp = false;
    // beacon: glowing pillar + floating diamond + ground ring
    const pillarMat = new THREE.MeshBasicMaterial({ color: 0xffd94d, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 26, 16, 1, true), pillarMat);
    this.pillar.position.y = 13;
    scene.add(this.pillar);
    this.diamond = new THREE.Mesh(new THREE.OctahedronGeometry(1.1), new THREE.MeshBasicMaterial({ color: 0xffd94d, transparent: true, opacity: 0.95 }));
    this.diamond.position.y = 7;
    scene.add(this.diamond);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 3.0, 32), new THREE.MeshBasicMaterial({ color: 0xffd94d, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.08;
    scene.add(this.ring);
    this.moveBeacon();
  }
  get done() { return this.index >= MISSIONS.length; }
  current() { return MISSIONS[this.index]; }
  targetPos() {
    if (this.done) return null;
    if (this.index === 1 && this.stage === 0) return [-10, 0, -20]; // park kiosk pickup
    return this.current().target;
  }
  objective() {
    if (this.done) return 'All missions complete — Solara Bay is yours, Dante.';
    if (this.index === 1 && this.stage === 1) return 'Deliver the package to the pier end';
    if (this.index === 1 && this.stage === 0) return 'Pick up the package at the park kiosk';
    return this.current().objective;
  }
  moveBeacon() {
    const t = this.targetPos();
    if (!t) { this.pillar.visible = false; this.diamond.visible = false; this.ring.visible = false; return; }
    this.pillar.visible = true; this.diamond.visible = true; this.ring.visible = true;
    this.pillar.position.set(t[0], 13, t[2]);
    this.diamond.position.set(t[0], 7, t[2]);
    this.ring.position.set(t[0], 0.08, t[2]);
  }
  update(dt, player, t) {
    this.diamond.rotation.y += dt * 1.4;
    this.diamond.position.y = 7 + Math.sin(t * 1.8) * 0.5;
    if (this.done) return;
    const tp = this.targetPos();
    const pp = player.inCar ? player.inCar.pos : player.pos;
    if (Math.hypot(pp.x - tp[0], pp.z - tp[2]) < 4.5) {
      if (this.index === 1 && this.stage === 0) {
        this.stage = 1;
        this.pickedUp = true;
        this.game.toast('Package secured — deliver it to the pier end');
        this.game.audio.chime();
        this.moveBeacon();
        return;
      }
      const m = this.current();
      this.game.addMoney(m.reward);
      this.game.toast(`Mission complete: ${m.name} — +$${m.reward}`);
      this.game.audio.chime();
      this.index++;
      this.stage = 0;
      if (this.index === 2) this.game.wanted.addCrime(2); // Heat Wave: the heat is on
      if (this.done) this.game.onAllMissionsDone();
      this.moveBeacon();
    }
  }
}
