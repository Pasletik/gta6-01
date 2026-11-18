// Solara Bay — the story. One job: run the three missions in order, track
// the beacon marker, and pay the rewards.

import * as THREE from 'three';
import { MISSIONS, PLACES } from './config.js';

export class MissionManager {
  constructor(scene) {
    this.scene = scene;
    this.index = 0; // 0, 1, 2 — or 3 when the story is done
    this.done = false;
    this.packagePicked = false;
    // Beacon: a glowing pillar of light plus a floating diamond over the target.
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xf1c40f, transparent: true, opacity: 0.28, depthWrite: false,
    });
    this.beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 60, 16, 1, true), beaconMat);
    this.beacon.position.y = 30;
    scene.add(this.beacon);
    const diamondMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
    this.diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), diamondMat);
    scene.add(this.diamond);
    // The package itself: a small crate on the pier.
    const crateMat = new THREE.MeshLambertMaterial({ color: 0x8a6a45 });
    this.package = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 1.1), crateMat);
    this.package.position.set(PLACES.docks.x, 0.9, PLACES.docks.z - 20);
    this.package.castShadow = true;
    scene.add(this.package);
    this.updateBeacon();
  }

  current() {
    return MISSIONS[this.index] || null;
  }

  // Where the player must go right now (world x/z), or null.
  marker() {
    if (this.done) return null;
    if (this.index === 0) return null; // any car counts — no fixed point
    if (this.index === 1) return { x: PLACES.docks.x, z: PLACES.docks.z - 20 };
    return { x: PLACES.safehouse.x, z: PLACES.safehouse.z };
  }

  updateBeacon() {
    const m = this.marker();
    const show = !!m;
    this.beacon.visible = show;
    this.diamond.visible = show;
    if (show) {
      this.beacon.position.x = m.x;
      this.beacon.position.z = m.z;
      this.diamond.position.set(m.x, 6, m.z);
    }
    // The package is only visible during mission 2, until picked up.
    this.package.visible = this.index === 1 && !this.packagePicked;
  }

  // Mission 1 completes when the player gets into a car.
  onEnterCar() {
    if (this.index === 0) return this.complete();
    return 0;
  }

  // Mission 2 completes when the player, on foot, reaches the package.
  onReachPackage() {
    if (this.index === 1 && !this.packagePicked) {
      this.packagePicked = true;
      return this.complete();
    }
    return 0;
  }

  // Mission 3 completes at the safehouse.
  onReachSafehouse() {
    if (this.index === 2) return this.complete();
    return 0;
  }

  complete() {
    const reward = MISSIONS[this.index].reward;
    this.index += 1;
    if (this.index >= MISSIONS.length) this.done = true;
    this.updateBeacon();
    return reward;
  }

  // Animate the beacon and the floating diamond.
  update(dt, time) {
    if (this.beacon.visible) {
      this.diamond.rotation.y += dt * 1.5;
      this.diamond.position.y = 6 + Math.sin(time * 2) * 0.5;
      this.beacon.material.opacity = 0.2 + Math.sin(time * 2.4) * 0.08;
    }
    if (this.package.visible) {
      this.package.rotation.y += dt * 0.8;
    }
  }

  // Jump the story to a mission (used by scripted screenshot scenes).
  setIndex(i) {
    this.index = i;
    this.done = i >= MISSIONS.length;
    this.packagePicked = i > 1;
    this.updateBeacon();
  }
}
