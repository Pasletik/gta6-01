// Solara Bay — the player on foot. One job: walk Dante Cole around the city,
// enter and exit cars, and hold the pistol.

import * as THREE from 'three';
import { CFG } from './config.js';
import { resolveCollisions, clampPlayable, groundHeightAt } from './world.js';

// Build Dante: a simple articulated figure (torso, head, limbs) in a teal
// jacket, so he reads clearly at a distance and on the minimap.
export function buildPlayerMesh() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0x0e7a6b });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const hair = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.36), jacket);
  torso.position.y = 1.15;
  torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
  head.position.y = 1.78;
  head.castShadow = true;
  g.add(head);
  const hairM = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.44), hair);
  hairM.position.y = 2.02;
  g.add(hairM);
  const legs = [];
  for (const lx of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.26), pants);
    leg.position.set(lx, 0.38, 0);
    leg.castShadow = true;
    g.add(leg);
    legs.push(leg);
  }
  const arms = [];
  for (const ax of [-0.42, 0.42]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), jacket);
    arm.position.set(ax, 1.15, 0);
    arm.castShadow = true;
    g.add(arm);
    arms.push(arm);
  }
  return { group: g, legs, arms };
}

export class Player {
  constructor(scene, x, z) {
    const mesh = buildPlayerMesh();
    this.group = mesh.group;
    this.legs = mesh.legs;
    this.arms = mesh.arms;
    scene.add(this.group);
    this.x = x;
    this.z = z;
    this.heading = 0; // facing, radians
    this.health = CFG.playerMaxHealth;
    this.inCar = null; // Car instance when driving
    this.walkPhase = 0;
    this.group.position.set(x, 0, z);
  }

  // Walk relative to the camera yaw. Returns true when actually moving.
  update(dt, axes, camYaw, colliders, running) {
    if (this.inCar) return false;
    const speed = running ? CFG.runSpeed : CFG.walkSpeed;
    // Forward is camera yaw; strafe is perpendicular.
    const fx = Math.sin(camYaw);
    const fz = Math.cos(camYaw);
    const rx = Math.cos(camYaw);
    const rz = -Math.sin(camYaw);
    let mx = fx * axes.y + rx * axes.x;
    let mz = fz * axes.y + rz * axes.x;
    const len = Math.hypot(mx, mz);
    if (len < 0.01) {
      this.walkPhase *= 0.9;
      this.syncLimbs(0);
      return false;
    }
    mx /= len;
    mz /= len;
    this.heading = Math.atan2(mx, mz);
    let nx = this.x + mx * speed * dt;
    let nz = this.z + mz * speed * dt;
    const r = resolveCollisions(colliders, nx, nz, 0.7);
    nx = r.x;
    nz = r.z;
    const cl = clampPlayable(nx, nz);
    this.x = cl.x;
    this.z = cl.z;
    this.walkPhase += dt * speed * 1.4;
    this.syncLimbs(1);
    this.group.position.set(this.x, groundHeightAt(this.x, this.z), this.z);
    this.group.rotation.y = this.heading;
    return true;
  }

  // Simple walk cycle: legs and arms swing opposite.
  syncLimbs(amount) {
    const s = Math.sin(this.walkPhase) * 0.55 * amount;
    this.legs[0].rotation.x = s;
    this.legs[1].rotation.x = -s;
    this.arms[0].rotation.x = -s * 0.8;
    this.arms[1].rotation.x = s * 0.8;
  }

  // Step into a car: hide the figure, remember the car.
  enterCar(car) {
    this.inCar = car;
    car.owned = true;
    car.parked = false;
    car.traffic = null;
    this.group.visible = false;
  }

  // Step out beside the car.
  exitCar() {
    if (!this.inCar) return;
    const car = this.inCar;
    this.inCar = null;
    this.x = car.x + Math.cos(car.heading) * 2.6;
    this.z = car.z - Math.sin(car.heading) * 2.6;
    this.group.visible = true;
    this.group.position.set(this.x, groundHeightAt(this.x, this.z), this.z);
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    return this.health <= 0;
  }

  heal(amount) {
    this.health = Math.min(CFG.playerMaxHealth, this.health + amount);
  }
}
