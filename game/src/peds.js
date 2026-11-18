// Solara Bay — pedestrians. One job: fill the sidewalks with people who
// walk, flee from danger, and go down when shot.

import * as THREE from 'three';
import { CFG, PED_COLORS } from './config.js';
import { resolveCollisions, clampPlayable } from './world.js';

function buildPedMesh(color) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe0ac69 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x34495e });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), shirt);
  torso.position.y = 1.1;
  torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), skin);
  head.position.y = 1.68;
  g.add(head);
  const legs = [];
  for (const lx of [-0.14, 0.14]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.68, 0.22), pants);
    leg.position.set(lx, 0.34, 0);
    g.add(leg);
    legs.push(leg);
  }
  return { group: g, legs };
}

export class Ped {
  constructor(mesh, x, z, heading) {
    this.group = mesh.group;
    this.legs = mesh.legs;
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = 1.6;
    this.state = 'walk'; // walk | flee | down
    this.phase = Math.random() * 6;
    this.downTimer = 0;
    this.group.position.set(x, 0, z);
    this.group.rotation.y = heading;
  }
}

export class PedManager {
  constructor(scene, world, rng) {
    this.scene = scene;
    this.world = world;
    this.rng = rng;
    this.peds = [];
    this.spawnAll();
  }

  spawnAll() {
    const roads = this.world.roads;
    for (let i = 0; i < CFG.pedCount; i++) {
      const horizontal = this.rng.chance(0.5);
      const road = this.rng.pick(roads);
      const along = this.rng.range(-this.world.half + 10, this.world.half - 10);
      const off = this.rng.chance(0.5) ? 7.5 : -7.5;
      const mesh = buildPedMesh(this.rng.pick(PED_COLORS));
      this.scene.add(mesh.group);
      const ped = new Ped(mesh,
        horizontal ? along : road + off,
        horizontal ? road + off : along,
        this.rng.range(0, Math.PI * 2));
      ped.speed = this.rng.range(1.2, 2.2);
      this.peds.push(ped);
    }
  }

  // A ped within range of danger starts fleeing from (fx, fz).
  scare(fx, fz, radius) {
    for (const p of this.peds) {
      if (p.state === 'down') continue;
      if (Math.hypot(p.x - fx, p.z - fz) < radius) p.state = 'flee';
    }
  }

  // Shoot a ped: it goes down for a while, then gets up and flees.
  knockDown(ped) {
    if (ped.state === 'down') return;
    ped.state = 'down';
    ped.downTimer = 6;
    ped.group.rotation.x = -Math.PI / 2;
    ped.group.position.y = 0.4;
  }

  update(dt, dangerX, dangerZ, dangerRadius) {
    const roads = this.world.roads;
    for (const p of this.peds) {
      if (p.state === 'down') {
        p.downTimer -= dt;
        if (p.downTimer <= 0) {
          p.state = 'flee';
          p.group.rotation.x = 0;
          p.group.position.y = 0;
        }
        continue;
      }
      // Flee from nearby danger; calm down far away from it.
      const dDanger = Math.hypot(p.x - dangerX, p.z - dangerZ);
      if (dDanger < dangerRadius) p.state = 'flee';
      else if (p.state === 'flee' && dDanger > dangerRadius * 2.5) p.state = 'walk';

      const speed = p.state === 'flee' ? 5.5 : p.speed;
      if (p.state === 'flee') {
        // Run directly away from the danger.
        const dx = p.x - dangerX;
        const dz = p.z - dangerZ;
        const d = Math.hypot(dx, dz) || 1;
        p.heading = Math.atan2(dx / d, dz / d);
      } else if (this.rng.chance(dt * 0.08)) {
        // Occasionally turn at random while strolling.
        p.heading += this.rng.pick([-Math.PI / 2, Math.PI / 2, Math.PI]);
      }
      let nx = p.x + Math.sin(p.heading) * speed * dt;
      let nz = p.z + Math.cos(p.heading) * speed * dt;
      const r = resolveCollisions(this.world.colliders, nx, nz, 0.6);
      nx = r.x;
      nz = r.z;
      const cl = clampPlayable(nx, nz);
      p.x = cl.x;
      p.z = cl.z;
      p.phase += dt * speed * 2.2;
      const s = Math.sin(p.phase) * 0.5;
      p.legs[0].rotation.x = s;
      p.legs[1].rotation.x = -s;
      p.group.position.set(p.x, 0, p.z);
      p.group.rotation.y = p.heading;
      // Keep peds off the road centre: nudge them toward the nearest kerb.
      void roads;
    }
  }

  // Nearest living ped to (x, z) within maxDist.
  nearest(x, z, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const p of this.peds) {
      if (p.state === 'down') continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  // Any living ped within radius of (x, z)?
  anyoneNear(x, z, radius) {
    for (const p of this.peds) {
      if (p.state !== 'down' && Math.hypot(p.x - x, p.z - z) < radius) return true;
    }
    return false;
  }
}
