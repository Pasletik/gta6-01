// Pedestrians: sidewalk walkers who flee gunfire and go down when hit.
import * as THREE from 'three';
import { CFG, PED_SHIRTS, PED_SKINS, PED_PANTS } from './config.js';
import { makeHumanoid } from './player.js';

export class Peds {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.list = [];
    for (let i = 0; i < 14; i++) this.spawn();
  }
  spawn() {
    const rng = this.rng;
    const shirt = PED_SHIRTS[Math.floor(rng.next() * PED_SHIRTS.length)];
    const skin = PED_SKINS[Math.floor(rng.next() * PED_SKINS.length)];
    const pants = PED_PANTS[Math.floor(rng.next() * PED_PANTS.length)];
    const g = makeHumanoid(rng, shirt, skin, pants, rng.range(0.92, 1.06));
    this.scene.add(g);
    const road = CFG.roads[Math.floor(rng.next() * CFG.roads.length)];
    const along = rng.range(-110, 110);
    const side = rng.chance(0.5) ? 7.5 : -7.5;
    const vertical = rng.chance(0.5);
    const ped = {
      group: g,
      pos: new THREE.Vector3(vertical ? road + side : along, 0, vertical ? along : road + side),
      heading: rng.range(0, Math.PI * 2),
      vertical,
      speed: CFG.pedSpeed * rng.range(0.8, 1.3),
      phase: rng.range(0, 6),
      state: 'walk',
      fleeT: 0,
      downT: 0,
      target: null,
    };
    g.position.copy(ped.pos);
    this.list.push(ped);
    return ped;
  }
  fleeFrom(x, z) {
    for (const p of this.list) {
      if (p.state !== 'walk') continue;
      const d = Math.hypot(p.pos.x - x, p.pos.z - z);
      if (d < 26) { p.state = 'flee'; p.fleeT = 4; }
    }
  }
  downAt(x, z, radius = 2.2) {
    for (const p of this.list) {
      if (p.state === 'down') continue;
      if (Math.hypot(p.pos.x - x, p.pos.z - z) < radius) {
        p.state = 'down'; p.downT = 0;
        p.group.rotation.x = -Math.PI / 2;
        p.group.position.y = 0.25;
        return p;
      }
    }
    return null;
  }
  update(dt, world) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (p.state === 'down') {
        p.downT += dt;
        if (p.downT > 9) {
          this.scene.remove(p.group);
          this.list.splice(i, 1);
          this.spawn();
        }
        continue;
      }
      if (p.state === 'flee') {
        p.fleeT -= dt;
        if (p.fleeT <= 0) p.state = 'walk';
      }
      const sp = p.state === 'flee' ? CFG.pedFleeSpeed : p.speed;
      p.pos.x += Math.sin(p.heading) * sp * dt;
      p.pos.z += Math.cos(p.heading) * sp * dt;
      // stay on sidewalks: snap to nearest road lane, turn at random
      const road = p.vertical
        ? CFG.roads.reduce((a, b) => Math.abs(b - p.pos.x) < Math.abs(a - p.pos.x) ? b : a)
        : CFG.roads.reduce((a, b) => Math.abs(b - p.pos.z) < Math.abs(a - p.pos.z) ? b : a);
      if (p.vertical) p.pos.x += (road + (p.pos.x > road ? 7.5 : -7.5) - p.pos.x) * Math.min(1, dt * 4);
      else p.pos.z += (road + (p.pos.z > road ? 7.5 : -7.5) - p.pos.z) * Math.min(1, dt * 4);
      if (this.rng.chance(dt * 0.12)) {
        // random turn at intersections
        p.heading += (this.rng.chance(0.5) ? 1 : -1) * Math.PI / 2;
        p.vertical = !p.vertical;
      }
      // world bounds: turn around
      if (p.pos.x < -120 || p.pos.x > 120 || p.pos.z < -120 || p.pos.z > 118) {
        p.heading += Math.PI;
        p.pos.x = Math.max(-118, Math.min(118, p.pos.x));
        p.pos.z = Math.max(-118, Math.min(116, p.pos.z));
      }
      p.phase += dt * sp * 2.2;
      const swing = Math.sin(p.phase) * 0.55;
      const u = p.group.userData;
      u.legL.rotation.x = swing; u.legR.rotation.x = -swing;
      u.armL.rotation.x = -swing * 0.7; u.armR.rotation.x = swing * 0.7;
      p.group.position.copy(p.pos);
      p.group.rotation.y = p.heading;
    }
  }
}
