// Solara Bay — cars. One job: build cars, drive traffic along the road grid,
// and run the police cars that chase the player.

import * as THREE from 'three';
import { CFG, CAR_COLORS } from './config.js';
import { resolveCollisions, clampPlayable } from './world.js';

// A car is a group: body, cabin, four wheels. `police` adds a light bar.
export function buildCarMesh(color, police = false) {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
  const tyre = new THREE.MeshLambertMaterial({ color: 0x151515 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.6), paint);
  body.position.y = 0.65;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.2), glass);
  cabin.position.set(0, 1.3, -0.25);
  cabin.castShadow = true;
  g.add(cabin);
  const wheels = [];
  for (const [wx, wz] of [[-1.0, 1.5], [1.0, 1.5], [-1.0, -1.5], [1.0, -1.5]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), tyre);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    g.add(w);
    wheels.push(w);
  }
  // Headlights and taillights.
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0x555533 });
  for (const hx of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), headMat);
    h.position.set(hx, 0.7, 2.32);
    g.add(h);
  }
  const tailMat = new THREE.MeshLambertMaterial({ color: 0xcc2222, emissive: 0x330000 });
  for (const hx of [-0.7, 0.7]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), tailMat);
    t.position.set(hx, 0.7, -2.32);
    g.add(t);
  }
  let lightBar = null;
  if (police) {
    lightBar = new THREE.Group();
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.7),
      new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0x880000 }));
    red.position.x = -0.45;
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.7),
      new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x000088 }));
    blue.position.x = 0.45;
    lightBar.add(red, blue);
    lightBar.position.set(0, 1.75, -0.25);
    g.add(lightBar);
  }
  return { group: g, wheels, lightBar };
}

export class Car {
  constructor(mesh, x, z, heading) {
    this.mesh = mesh.group;
    this.wheels = mesh.wheels;
    this.lightBar = mesh.lightBar;
    this.x = x;
    this.z = z;
    this.heading = heading; // radians, 0 = +z
    this.speed = 0;
    this.owned = false;
    this.disabled = false;
    this.health = 100;
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = heading;
  }

  sync() {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    const spin = this.speed * 0.12;
    for (const w of this.wheels) w.rotation.x += spin;
  }
}

export class VehicleManager {
  constructor(scene, world, rng) {
    this.scene = scene;
    this.world = world;
    this.rng = rng;
    this.cars = []; // traffic + parked + player car (all drivable)
    this.police = [];
    this.spawnTraffic();
    this.spawnParked();
  }

  addCar(color, x, z, heading, police = false) {
    const mesh = buildCarMesh(color, police);
    this.scene.add(mesh.group);
    const car = new Car(mesh, x, z, heading);
    (police ? this.police : this.cars).push(car);
    return car;
  }

  // Traffic cars cruise the road grid; parked cars wait at the kerb.
  spawnTraffic() {
    const roads = this.world.roads;
    for (let i = 0; i < CFG.trafficCount; i++) {
      const horizontal = this.rng.chance(0.5);
      const road = this.rng.pick(roads);
      const along = this.rng.range(-this.world.half + 20, this.world.half - 20);
      const dir = this.rng.chance(0.5) ? 1 : -1;
      const car = this.addCar(this.rng.pick(CAR_COLORS),
        horizontal ? along : road, horizontal ? road : along,
        horizontal ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI));
      car.speed = this.rng.range(7, 12);
      car.traffic = { horizontal, dir, road, target: null };
    }
  }

  spawnParked() {
    const roads = this.world.roads;
    for (let i = 0; i < 8; i++) {
      const road = this.rng.pick(roads);
      const along = this.rng.range(-this.world.half + 30, this.world.half - 30);
      const horizontal = this.rng.chance(0.5);
      const car = this.addCar(this.rng.pick(CAR_COLORS),
        horizontal ? along : road + 4.4, horizontal ? road + 4.4 : along,
        horizontal ? Math.PI / 2 : 0);
      car.parked = true;
      car.speed = 0;
    }
  }

  // Nearest car to (x, z) within maxDist, or null.
  nearestCar(x, z, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const c of this.cars) {
      if (c.disabled) continue;
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  // Traffic follows its road; at an intersection it may turn.
  updateTraffic(dt) {
    const roads = this.world.roads;
    const half = this.world.half;
    for (const car of this.cars) {
      if (!car.traffic || car.disabled) continue;
      const t = car.traffic;
      // Move along the current axis.
      if (t.horizontal) car.x += t.dir * car.speed * dt;
      else car.z += t.dir * car.speed * dt;
      car.heading = t.horizontal
        ? (t.dir > 0 ? Math.PI / 2 : -Math.PI / 2)
        : (t.dir > 0 ? 0 : Math.PI);
      // At a crossing road, maybe turn.
      const along = t.horizontal ? car.x : car.z;
      for (const rc of roads) {
        const diff = along - rc;
        if (Math.abs(diff) < car.speed * dt * 0.6 && !t.turnedAt?.has(rc)) {
          if (!t.turnedAt) t.turnedAt = new Set();
          t.turnedAt.add(rc);
          if (this.rng.chance(0.3)) {
            t.horizontal = !t.horizontal;
            t.dir = this.rng.chance(0.5) ? 1 : -1;
            t.road = rc;
          }
          break;
        }
      }
      if (t.turnedAt && t.turnedAt.size > 8) t.turnedAt.clear();
      // City edge: turn around.
      const pos = t.horizontal ? car.x : car.z;
      if (pos > half - 8 || pos < -half + 8) {
        t.dir *= -1;
        if (t.horizontal) car.x = Math.max(-half + 9, Math.min(half - 9, car.x));
        else car.z = Math.max(-half + 9, Math.min(half - 9, car.z));
      }
      // Keep on its road line.
      if (t.horizontal) car.z = t.road;
      else car.x = t.road;
      car.sync();
    }
  }

  // Police chase a target point: steer toward it, ram on contact.
  updatePolice(dt, targetX, targetZ, onRam) {
    for (const p of this.police) {
      if (p.disabled) {
        p.sync();
        continue;
      }
      const dx = targetX - p.x;
      const dz = targetZ - p.z;
      const dist = Math.hypot(dx, dz) || 1;
      const want = Math.atan2(dx, dz);
      let dh = want - p.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      p.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
      const targetSpeed = dist > 30 ? 26 : 20;
      p.speed += Math.max(-30 * dt, Math.min(30 * dt, targetSpeed - p.speed));
      p.x += Math.sin(p.heading) * p.speed * dt;
      p.z += Math.cos(p.heading) * p.speed * dt;
      const r = resolveCollisions(this.world.colliders, p.x, p.z, 2.2);
      p.x = r.x;
      p.z = r.z;
      const cl = clampPlayable(p.x, p.z);
      p.x = cl.x;
      p.z = cl.z;
      // Light bar flash.
      if (p.lightBar) p.lightBar.visible = Math.floor(performance.now() / 180) % 2 === 0;
      if (dist < 3.4 && onRam) onRam(p);
      p.sync();
    }
  }

  // Spawn (or reuse) police cars around the player, count = wanted level.
  ensurePolice(count, px, pz) {
    while (this.police.length < count) {
      const ang = this.rng.range(0, Math.PI * 2);
      const d = this.rng.range(45, 70);
      const car = this.addCar(0x111111, px + Math.sin(ang) * d, pz + Math.cos(ang) * d,
        this.rng.range(0, Math.PI * 2), true);
      car.speed = 12;
    }
    while (this.police.length > count) {
      const p = this.police.pop();
      this.scene.remove(p.mesh);
    }
  }

  // A police car takes damage; three hits disable it.
  damagePolice(car, amount) {
    car.health -= amount;
    if (car.health <= 0 && !car.disabled) {
      car.disabled = true;
      car.speed = 0;
      return true;
    }
    return false;
  }

  // Any car (traffic or parked) near the player, for stealing.
  carsNear(x, z, maxDist) {
    return this.cars.filter((c) => !c.disabled && Math.hypot(c.x - x, c.z - z) < maxDist);
  }
}
