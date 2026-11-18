// Cars: player-drivable, parked, traffic, police.
import * as THREE from 'three';
import { CFG, CAR_STYLES } from './config.js';

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true;
  return m;
}

export function makeCarMesh(style, police = false) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: police ? 0x111418 : style.body, roughness: 0.35, metalness: 0.55 });
  const roofMat = new THREE.MeshStandardMaterial({ color: police ? 0x111418 : style.roof, roughness: 0.35, metalness: 0.55 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x10161f, roughness: 0.12, metalness: 0.7 });
  const L = style.len, W = style.w;
  g.add(box(W, 0.62, L, bodyMat, 0, 0.55, 0));
  g.add(box(W * 0.82, 0.5, L * 0.52, glassMat, 0, 1.05, -L * 0.04));
  g.add(box(W * 0.8, 0.1, L * 0.5, roofMat, 0, 1.32, -L * 0.04));
  if (police) {
    // black-and-white doors
    g.add(box(W + 0.02, 0.4, L * 0.34, new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.35, metalness: 0.5 }), 0, 0.55, 0));
    const bar = new THREE.Group();
    const r = box(0.55, 0.16, 0.3, new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff1a1a, emissiveIntensity: 2 }), -0.3, 1.44, -L * 0.04);
    const b = box(0.55, 0.16, 0.3, new THREE.MeshStandardMaterial({ color: 0x000033, emissive: 0x2266ff, emissiveIntensity: 2 }), 0.3, 1.44, -L * 0.04);
    bar.add(r); bar.add(b);
    g.add(bar);
    g.userData.barR = r; g.userData.barB = b;
    const pl = new THREE.PointLight(0xffffff, 0, 16, 1.4);
    pl.position.set(0, 2, 0);
    g.add(pl);
    g.userData.flash = pl;
  }
  if (style.taxi) {
    g.add(box(0.7, 0.22, 0.4, new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffd94d, emissiveIntensity: 1.2 }), 0, 1.48, -L * 0.04));
  }
  // headlights / taillights
  const hl = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xffe9a8, emissiveIntensity: 1.6 });
  const tl = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2222, emissiveIntensity: 0.9 });
  g.add(box(0.42, 0.16, 0.08, hl, -W * 0.32, 0.62, L / 2 + 0.01));
  g.add(box(0.42, 0.16, 0.08, hl, W * 0.32, 0.62, L / 2 + 0.01));
  g.add(box(0.42, 0.16, 0.08, tl, -W * 0.32, 0.62, -L / 2 - 0.01));
  g.add(box(0.42, 0.16, 0.08, tl, W * 0.32, 0.62, -L / 2 - 0.01));
  g.userData.tailMat = tl;
  // wheels with rims
  const tyre = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95 });
  const rim = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.3, metalness: 0.8 });
  g.userData.wheels = [];
  g.userData.steerWheels = [];
  for (const [wx, wz, front] of [[-W / 2 + 0.08, L * 0.32, true], [W / 2 - 0.08, L * 0.32, true], [-W / 2 + 0.08, -L * 0.32, false], [W / 2 - 0.08, -L * 0.32, false]]) {
    const pivot = new THREE.Group();
    pivot.position.set(wx, 0.36, wz);
    const tyreM = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14), tyre);
    tyreM.rotation.z = Math.PI / 2; tyreM.castShadow = true;
    const rimM = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.28, 10), rim);
    rimM.rotation.z = Math.PI / 2;
    pivot.add(tyreM); pivot.add(rimM);
    g.add(pivot);
    g.userData.wheels.push(pivot);
    if (front) g.userData.steerWheels.push(pivot);
  }
  return g;
}

export class Car {
  constructor(scene, style, x, z, heading, police = false) {
    this.scene = scene;
    this.style = style;
    this.police = police;
    this.group = makeCarMesh(style, police);
    scene.add(this.group);
    this.pos = new THREE.Vector3(x, 0, z);
    this.heading = heading;
    this.speed = 0;
    this.steer = 0;
    this.hp = police ? 3 : 1;
    this.disabled = false;
    this.flashPhase = Math.random() * 10;
    this.sync();
  }
  sync() {
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.heading;
  }
  drive(dt, throttle, steerInput, braking) {
    if (this.disabled) { this.speed *= Math.max(0, 1 - dt * 3); this.sync(); return; }
    const targetSteer = steerInput * 0.55;
    this.steer += (targetSteer - this.steer) * Math.min(1, dt * 8);
    if (throttle > 0) this.speed += CFG.carAccel * dt;
    else if (throttle < 0) {
      if (this.speed > 0.5) this.speed -= CFG.carBrake * dt;
      else this.speed -= CFG.carAccel * 0.6 * dt;
    } else this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 8 * dt);
    if (braking) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), CFG.carBrake * dt);
    this.speed = Math.max(-CFG.carReverseMax, Math.min(CFG.carMaxSpeed, this.speed));
    if (Math.abs(this.speed) > 0.05) {
      this.heading += (this.steer * this.speed * 0.055) * dt * 2.4;
    }
    this.pos.x += Math.sin(this.heading) * this.speed * dt;
    this.pos.z += Math.cos(this.heading) * this.speed * dt;
    this.sync();
    this.visuals(dt, braking);
  }
  visuals(dt, braking) {
    const spin = (this.speed * dt) / 0.36;
    for (const w of this.group.userData.wheels) {
      w.children[0].rotation.x += spin;
      w.children[1].rotation.x += spin;
    }
    for (const w of this.group.userData.steerWheels) w.rotation.y = this.steer * 0.7;
    this.group.userData.tailMat.emissiveIntensity = braking ? 3.2 : 0.9;
    if (this.police && !this.disabled) {
      this.flashPhase += dt * 9;
      const on = Math.sin(this.flashPhase) > 0;
      this.group.userData.barR.material.emissiveIntensity = on ? 3.5 : 0.25;
      this.group.userData.barB.material.emissiveIntensity = on ? 0.25 : 3.5;
      const fl = this.group.userData.flash;
      fl.color.setHex(on ? 0xff2222 : 0x2266ff);
      fl.intensity = 26;
    } else if (this.police) {
      this.group.userData.flash.intensity = 0;
    }
  }
  damage(n) {
    this.hp -= n;
    if (this.hp <= 0) {
      this.disabled = true;
      this.group.userData.tailMat.emissiveIntensity = 0.1;
      return true;
    }
    return false;
  }
}

export class Traffic {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.cars = [];
    // rectangular loops around blocks: lane on road centre +/- 2.5
    const loops = [];
    for (const bx of [-85, -17, 51]) for (const bz of [-85, -17, 51]) {
      loops.push(this.loopPoints(bx, bz, 34));
    }
    for (let i = 0; i < 9; i++) {
      const loop = loops[i % loops.length];
      const style = CAR_STYLES[Math.floor(rng.next() * CAR_STYLES.length)];
      const idx = Math.floor(rng.next() * loop.length);
      const [x, z] = loop[idx];
      const car = new Car(scene, style, x, z, 0);
      car.loop = loop; car.loopIdx = idx;
      car.speed = rng.range(7, 11);
      this.cars.push(car);
    }
  }
  loopPoints(bx, bz, half) {
    const pts = [];
    const step = 8;
    for (let x = bx - half + 4; x <= bx + half - 4; x += step) pts.push([x, bz - half + 2.5]);
    for (let z = bz - half + 4; z <= bz + half - 4; z += step) pts.push([bx + half - 2.5, z]);
    for (let x = bx + half - 4; x >= bx - half + 4; x -= step) pts.push([x, bz + half - 2.5]);
    for (let z = bz + half - 4; z >= bz - half + 4; z -= step) pts.push([bx - half + 2.5, z]);
    return pts;
  }
  update(dt) {
    for (const car of this.cars) {
      if (car.disabled) continue;
      const [tx, tz] = car.loop[(car.loopIdx + 1) % car.loop.length];
      const dx = tx - car.pos.x, dz = tz - car.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 2.5) { car.loopIdx = (car.loopIdx + 1) % car.loop.length; continue; }
      const target = Math.atan2(dx, dz);
      let dh = target - car.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      car.heading += dh * Math.min(1, dt * 3.5);
      car.pos.x += Math.sin(car.heading) * car.speed * dt;
      car.pos.z += Math.cos(car.heading) * car.speed * dt;
      car.sync();
      car.visuals(dt, false);
    }
  }
}

export function spawnParkedCars(scene, rng) {
  const cars = [];
  const spots = [
    [2.5, -60, 0], [-2.5, -20, Math.PI], [36.5, 10, Math.PI / 2], [-36.5, 40, -Math.PI / 2],
    [70.5, -60, 0], [-70.5, 20, Math.PI], [2.5, 60, 0], [104.5, -10, Math.PI / 2],
    [-104.5, 60, -Math.PI / 2], [36.5, -90, Math.PI], [-36.5, -40, 0], [70.5, 80, Math.PI],
  ];
  for (const [x, z, h] of spots) {
    const style = CAR_STYLES[Math.floor(rng.next() * CAR_STYLES.length)];
    cars.push(new Car(scene, style, x, z, h));
  }
  return cars;
}
