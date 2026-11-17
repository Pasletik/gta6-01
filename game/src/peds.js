// Pedestrians: they stroll the sidewalks, scatter from speeding cars and gunfire, and go
// down when hit. Hitting one is a crime the wanted system notices.
import * as THREE from 'three';
import { CITY, PEDS } from './config.js';

const SHIRTS = [0xd8d8d8, 0x4a7ab0, 0xc07840, 0x5a9a5a, 0xb04a6a, 0x8a6ab0, 0x3a3a3a];

function makePedMesh(shirt) {
  const group = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.3), new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85 }));
  torso.position.y = 1.05;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0xc99a76, roughness: 0.7 }));
  head.position.y = 1.52;
  group.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.24), new THREE.MeshStandardMaterial({ color: 0x2c2c34 }));
  legL.position.set(-0.13, 0.35, 0);
  const legR = legL.clone();
  legR.position.x = 0.13;
  group.add(legL);
  group.add(legR);
  return { group, legL, legR };
}

export function createPeds(scene, world, rng) {
  const peds = [];

  function sidewalkPoint() {
    const road = rng.pick(CITY.roads);
    const along = rng.range(-175, 175);
    const side = rng.pick([-1, 1]) * 7.5;
    return rng.chance(0.5) ? { x: road + side, z: along } : { x: along, z: road + side };
  }

  for (let i = 0; i < PEDS.count; i += 1) {
    const start = sidewalkPoint();
    const { group, legL, legR } = makePedMesh(rng.pick(SHIRTS));
    group.position.set(start.x, 0, start.z);
    scene.add(group);
    const ped = {
      group, legL, legR,
      pos: group.position,
      heading: rng.range(0, Math.PI * 2),
      target: sidewalkPoint(),
      speed: rng.range(1.2, 2.0),
      state: 'walk',
      downTimer: 0,
      phase: rng.range(0, Math.PI * 2),
    };
    group.userData.ped = ped;
    peds.push(ped);
  }

  function update(dt, player, cars, effects, onPedHit) {
    for (const ped of peds) {
      if (ped.state === 'down') {
        ped.downTimer -= dt;
        if (ped.downTimer <= 0) {
          // Get back up and walk away.
          ped.state = 'walk';
          ped.group.rotation.x = 0;
          ped.target = sidewalkPoint();
        }
        continue;
      }
      // Flee from danger: the player's car at speed, or gunfire nearby.
      let fleeX = 0;
      let fleeZ = 0;
      let danger = false;
      const threat = player.inCar && player.car ? player.car : null;
      if (threat) {
        const dx = ped.pos.x - threat.pos.x;
        const dz = ped.pos.z - threat.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 12 && Math.abs(threat.speed) > 6) {
          fleeX = dx / d;
          fleeZ = dz / d;
          danger = true;
        }
      }
      if (danger) {
        ped.state = 'flee';
        ped.pos.x += fleeX * PEDS.fleeSpeed * dt;
        ped.pos.z += fleeZ * PEDS.fleeSpeed * dt;
        ped.heading = Math.atan2(fleeX, fleeZ);
      } else {
        ped.state = 'walk';
        const dx = ped.target.x - ped.pos.x;
        const dz = ped.target.z - ped.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 1.5) {
          ped.target = sidewalkPoint();
        } else {
          const step = (ped.speed * dt) / d;
          ped.pos.x += dx * step;
          ped.pos.z += dz * step;
          ped.heading = Math.atan2(dx, dz);
        }
      }
      ped.phase += dt * (ped.state === 'flee' ? 11 : 5);
      const swing = Math.sin(ped.phase) * 0.5;
      ped.legL.rotation.x = swing;
      ped.legR.rotation.x = -swing;
      ped.group.position.copy(ped.pos);
      ped.group.rotation.y = ped.heading;
      // Hit by a car at speed: down, and the player earns a wanted star.
      for (const car of cars) {
        if (car.kind === 'parked' || car.disabled) continue;
        const dx = ped.pos.x - car.pos.x;
        const dz = ped.pos.z - car.pos.z;
        if (Math.hypot(dx, dz) < 2.2 && Math.abs(car.speed) > 5) {
          ped.state = 'down';
          ped.downTimer = 12;
          ped.group.rotation.x = -Math.PI / 2;
          effects.burst(ped.pos, { r: 0.9, g: 0.2, b: 0.2 }, 10, 3, 3);
          if (car.kind === 'player') onPedHit(ped);
        }
      }
    }
  }

  function scatterFrom(pos, radius) {
    for (const ped of peds) {
      const d = Math.hypot(ped.pos.x - pos.x, ped.pos.z - pos.z);
      if (d < radius && ped.state !== 'down') {
        ped.state = 'flee';
        ped.target = { x: ped.pos.x + (ped.pos.x - pos.x), z: ped.pos.z + (ped.pos.z - pos.z) };
      }
    }
  }

  return { peds, update, scatterFrom };
}
