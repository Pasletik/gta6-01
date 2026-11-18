// Solara Bay — pedestrians. They stroll the sidewalks on their own
// business, run away from gunfire, and go down when shot.

import * as THREE from 'three';
import { pick, range } from './random.js';

const SHIRTS = [0x3a7bd5, 0xe0a458, 0x7fb069, 0xc94f6d, 0x8e7cc3, 0xdddddd, 0x2a9d8f, 0xe76f51];
const ROAD_XS = [-144, -96, -48, 0, 48, 96, 144];

export function createPeds(scene, rng) {
  const peds = [];

  function makePedMesh(shirt) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 1.05, 8), new THREE.MeshLambertMaterial({ color: shirt }));
    body.position.y = 1.0;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshLambertMaterial({ color: 0xd9a066 }));
    head.position.y = 1.78;
    head.castShadow = true;
    g.add(head);
    return g;
  }

  function randomSidewalkPoint() {
    // a point just off a road line, on a sidewalk
    const vertical = rng() < 0.5;
    const line = pick(rng, ROAD_XS);
    const along = range(rng, -150, 150);
    const off = (rng() < 0.5 ? -1 : 1) * range(rng, 8, 11);
    return vertical ? { x: line + off, z: along } : { x: along, z: line + off };
  }

  for (let i = 0; i < 14; i++) {
    const p = randomSidewalkPoint();
    const mesh = makePedMesh(pick(rng, SHIRTS));
    mesh.position.set(p.x, 0, p.z);
    scene.add(mesh);
    const target = randomSidewalkPoint();
    peds.push({
      mesh,
      x: p.x,
      z: p.z,
      tx: target.x,
      tz: target.z,
      speed: range(rng, 1.3, 2.1),
      state: 'walk', // walk | flee | down
      stateT: 0,
      yaw: 0,
    });
  }

  return {
    list: peds,
    fleeFrom(x, z, radius = 26) {
      for (const p of peds) {
        if (p.state === 'down') continue;
        const d = Math.hypot(p.x - x, p.z - z);
        if (d < radius) {
          p.state = 'flee';
          p.stateT = 3;
          p.tx = p.x + ((p.x - x) / (d || 1)) * 40;
          p.tz = p.z + ((p.z - z) / (d || 1)) * 40;
        }
      }
    },
    knockDown(p) {
      if (p.state === 'down') return;
      p.state = 'down';
      p.stateT = 6;
      p.mesh.rotation.z = Math.PI / 2;
      p.mesh.position.y = 0.35;
    },
    update(dt) {
      for (const p of peds) {
        if (p.state === 'down') {
          p.stateT -= dt;
          if (p.stateT <= 0) {
            p.state = 'walk';
            p.mesh.rotation.z = 0;
            p.mesh.position.y = 0;
            const t = randomSidewalkPoint();
            p.tx = t.x;
            p.tz = t.z;
          }
          continue;
        }
        if (p.state === 'flee') {
          p.stateT -= dt;
          if (p.stateT <= 0) {
            p.state = 'walk';
            const t = randomSidewalkPoint();
            p.tx = t.x;
            p.tz = t.z;
          }
        }
        const dx = p.tx - p.x;
        const dz = p.tz - p.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 1.5) {
          const t = randomSidewalkPoint();
          p.tx = t.x;
          p.tz = t.z;
          continue;
        }
        const sp = p.state === 'flee' ? 4.6 : p.speed;
        const want = Math.atan2(dx, dz);
        let dy = want - p.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        p.yaw += Math.max(-4 * dt, Math.min(4 * dt, dy));
        p.x += Math.sin(p.yaw) * sp * dt;
        p.z += Math.cos(p.yaw) * sp * dt;
        p.x = Math.max(-166, Math.min(166, p.x));
        p.z = Math.max(-166, Math.min(150, p.z));
        p.mesh.position.set(p.x, 0, p.z);
        p.mesh.rotation.y = p.yaw;
      }
    },
  };
}
