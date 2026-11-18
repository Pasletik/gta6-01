// Solara Bay — the pistol. Hitscan from the camera, a tracer line, a
// muzzle flash and sparks on impact. Shooting is a crime: it scares
// pedestrians, adds heat, and can knock a pedestrian down or disable a
// police cruiser.

import * as THREE from 'three';
import { CFG } from './config.js';

export function createCombat(scene) {
  const raycaster = new THREE.Raycaster();
  raycaster.far = CFG.pistolRange;
  const combat = {
    cooldown: 0,
  };

  combat.shoot = function (G) {
    if (combat.cooldown > 0 || G.state !== 'playing' || G.player.car) return;
    combat.cooldown = CFG.pistolRate;
    const camera = G.camera;
    const origin = new THREE.Vector3();
    camera.getWorldPosition(origin);
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    // muzzle sits just ahead of the player's gun hand
    const muzzle = G.player.pos.clone();
    muzzle.y = 1.4;
    muzzle.addScaledVector(dir, 0.8);
    raycaster.set(origin, dir);

    // targets: pedestrians, police cruisers, other cars
    const targets = [];
    for (const p of G.peds.list) {
      if (p.state !== 'down') targets.push({ obj: p.mesh, kind: 'ped', ref: p });
    }
    for (const c of G.vehicles.police) {
      if (c.active && !c.disabled) targets.push({ obj: c.mesh, kind: 'police', ref: c });
    }
    for (const c of G.vehicles.parked.concat(G.vehicles.traffic)) {
      if (!c.disabled) targets.push({ obj: c.mesh, kind: 'car', ref: c });
    }
    const meshes = targets.map((t) => t.obj);
    const hits = raycaster.intersectObjects(meshes, true);
    let impact = origin.clone().addScaledVector(dir, CFG.pistolRange);
    if (hits.length > 0) {
      const hit = hits[0];
      impact = hit.point.clone();
      // walk up to the registered target group
      let node = hit.object;
      let found = null;
      while (node) {
        found = targets.find((t) => t.obj === node);
        if (found) break;
        node = node.parent;
      }
      if (found) {
        if (found.kind === 'ped') {
          G.peds.knockDown(found.ref);
          G.wanted.addHeat(1);
        } else if (found.kind === 'police') {
          G.vehicles.damageCar(found.ref, CFG.pistolDamage, G);
          G.wanted.addHeat(1);
        } else {
          G.vehicles.damageCar(found.ref, 20, G);
          G.wanted.addHeat(1);
        }
      }
      G.effects.burst(impact, 0xffcc66, 10, 5, 0.5, 8);
    } else {
      // no hit: sparks where the shot meets the ground or a wall
      const gy = G.world.groundHeightAt(impact.x, impact.z);
      impact.y = Math.max(impact.y, gy + 0.1);
    }
    G.effects.tracer(muzzle, impact);
    G.effects.muzzle(muzzle);
    G.audio.shot();
    G.peds.fleeFrom(G.player.pos.x, G.player.pos.z, 26);
    G.camKick = 0.035;
  };

  combat.update = function (dt, G) {
    combat.cooldown = Math.max(0, combat.cooldown - dt);
    if (G.input.mouseDown && G.state === 'playing') combat.shoot(G);
  };

  return combat;
}
