// Solara Bay — cars. Parked cars to steal, traffic cars looping the
// blocks, police cars that chase, and the player's own driving: arcade
// physics, steering that scales with speed, and building collisions.

import * as THREE from 'three';
import { CFG, PALETTE } from './config.js';
import { pick, range } from './random.js';
import { collideCircle } from './world.js';

const CAR_COLORS = [0xc0392b, 0x2e7fa8, 0xe8e8e8, 0x27ae60, 0x8e44ad, 0xf2c200, 0x555555, 0xd35400];

export function makeCarMesh(color, isPolice) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: isPolice ? 0xe8e8e8 : color });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1a2530 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.75, 4.4), paint);
  body.position.y = 0.62;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.62, 2.1), dark);
  cabin.position.set(0, 1.28, -0.25);
  cabin.castShadow = true;
  group.add(cabin);
  if (isPolice) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.3, 4.42), new THREE.MeshLambertMaterial({ color: PALETTE.police }));
    stripe.position.y = 0.62;
    group.add(stripe);
    const barR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5), new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0x881111 }));
    barR.position.set(-0.45, 1.68, -0.25);
    group.add(barR);
    const barB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5), new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x111188 }));
    barB.position.set(0.45, 1.68, -0.25);
    group.add(barB);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(x, 0.42, z);
    w.castShadow = true;
    group.add(w);
  }
  const lightMat = new THREE.MeshLambertMaterial({ color: 0xfff6c0, emissive: 0x777744 });
  for (const x of [-0.6, 0.6]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.1), lightMat);
    l.position.set(x, 0.72, 2.22);
    group.add(l);
  }
  return group;
}

function makeCar(scene, x, z, heading, color, isPolice) {
  const mesh = makeCarMesh(color, isPolice);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  return {
    mesh,
    x, z,
    heading,
    speed: 0,
    health: isPolice ? CFG.policeCarHealth : 100,
    isPolice,
    active: false,
    disabled: false,
    isMission: false,
  };
}

export function createVehicles(scene, rng, world) {
  const V = {
    parked: [],
    traffic: [],
    police: [],
    missionCar: null,
  };

  // --- parked cars along road edges --------------------------------------
  const spots = [
    [-141, -100], [-93, 40], [-45, 120], [3, -72], [51, -140], [99, 96], [141, -24],
    [-99, -141], [45, 141],
  ];
  for (const [x, z] of spots) {
    const onVertical = Math.abs(Math.abs(x) - 144) < 4 || Math.abs(Math.abs(x) - 96) < 4 || Math.abs(Math.abs(x) - 48) < 4;
    const heading = onVertical ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    V.parked.push(makeCar(scene, x, z, heading, pick(rng, CAR_COLORS), false));
  }

  // --- traffic: cars looping block perimeters ----------------------------
  const blockCenters = [];
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      if (i === 0 && j === 0) continue; // park has no loop
      blockCenters.push([i * 48 + 24, j * 48 + 24]);
    }
  }
  for (let i = 0; i < CFG.trafficCount; i++) {
    const [bx, bz] = pick(rng, blockCenters);
    const half = 24; // loop on the roads around the block
    const waypoints = [
      { x: bx - half, z: bz - half }, { x: bx + half, z: bz - half },
      { x: bx + half, z: bz + half }, { x: bx - half, z: bz + half },
    ];
    const start = Math.floor(rng() * 4);
    const car = makeCar(scene, waypoints[start].x, waypoints[start].z, 0, pick(rng, CAR_COLORS), false);
    car.waypoints = waypoints;
    car.wp = (start + 1) % 4;
    car.cruise = range(rng, 9, 13);
    car.lane = 2.6;
    V.traffic.push(car);
  }

  // --- police pool (spawned by the wanted module) -------------------------
  for (let i = 0; i < CFG.policeMax; i++) {
    const car = makeCar(scene, 0, -200, 0, 0, true);
    car.mesh.visible = false;
    V.police.push(car);
  }

  V.nearestCar = function (x, z, maxDist, includeTraffic) {
    let best = null;
    let bd = maxDist;
    const list = includeTraffic ? V.parked.concat(V.traffic) : V.parked;
    for (const c of list) {
      if (c.disabled) continue;
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return best;
  };

  V.spawnPolice = function (x, z) {
    const car = V.police.find((c) => !c.active);
    if (!car) return null;
    car.active = true;
    car.disabled = false;
    car.health = CFG.policeCarHealth;
    car.mesh.visible = true;
    // spawn on the nearest road, behind the player
    const rx = x > 0 ? 144 : -144;
    car.x = rx;
    car.z = z + (z > 0 ? -30 : 30);
    car.speed = 12;
    car.mesh.position.set(car.x, 0, car.z);
    return car;
  };

  V.despawnPolice = function (car) {
    car.active = false;
    car.mesh.visible = false;
    car.speed = 0;
  };

  V.damageCar = function (car, dmg, G) {
    if (!car || car.disabled) return;
    car.health -= dmg;
    if (car.health <= 0) {
      car.disabled = true;
      car.speed = 0;
      G.effects.smoke({ x: car.x, y: 1.2, z: car.z }, 16);
      G.audio.thud();
      if (car.isPolice) G.wanted.onPoliceDisabled?.();
    }
  };

  // Player driving: arcade model, steering scales with speed.
  V.drivePlayer = function (dt, G) {
    const car = G.player.car;
    if (!car) return;
    const input = G.input;
    const fwd = input.isDown('KeyW') || input.isDown('ArrowUp');
    const back = input.isDown('KeyS') || input.isDown('ArrowDown');
    const left = input.isDown('KeyA') || input.isDown('ArrowLeft');
    const right = input.isDown('KeyD') || input.isDown('ArrowRight');
    if (fwd) car.speed += CFG.carAccel * dt;
    else if (back) car.speed -= (car.speed > 0.5 ? CFG.carBrake : CFG.carAccel * 0.6) * dt;
    else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
    car.speed = Math.max(-CFG.carReverseMax, Math.min(CFG.carMaxSpeed, car.speed));
    const steer = (left ? 1 : 0) - (right ? 1 : 0);
    const dirSign = car.speed >= 0 ? 1 : -1;
    car.heading += steer * CFG.carTurn * dirSign * Math.min(1, Math.abs(car.speed) / 8) * dt;
    const nx = car.x + Math.sin(car.heading) * car.speed * dt;
    const nz = car.z + Math.cos(car.heading) * car.speed * dt;
    // building collision: stop dead with a thud
    const push = collideCircle(nx, nz, 2.1, G.world.colliders);
    if (push) {
      car.speed *= -0.25;
      G.audio.thud();
      G.effects.burst({ x: nx, y: 0.8, z: nz }, 0xffcc66, 8, 4, 0.5, 6);
    } else {
      car.x = nx;
      car.z = nz;
    }
    G.world.clampToWorld(car, 2.2);
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    G.player.pos.set(car.x, 0, car.z);
    G.audio.setEngine(Math.abs(car.speed) / CFG.carMaxSpeed, true);
  };

  V.updateTraffic = function (dt) {
    for (const car of V.traffic) {
      if (car.disabled) continue;
      const target = car.waypoints[car.wp];
      // aim at the waypoint with a right-hand lane offset
      const dx = target.x - car.x;
      const dz = target.z - car.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 3) {
        car.wp = (car.wp + 1) % 4;
        continue;
      }
      const want = Math.atan2(dx, dz);
      let dy = want - car.heading;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      car.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, dy));
      car.speed = car.cruise;
      car.x += Math.sin(car.heading) * car.speed * dt;
      car.z += Math.cos(car.heading) * car.speed * dt;
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
    }
  };

  // Police chase: steer toward the player, ram their car, or close in on foot.
  V.updatePolice = function (dt, G) {
    for (const car of V.police) {
      if (!car.active || car.disabled) continue;
      const px = G.player.pos.x;
      const pz = G.player.pos.z;
      const dx = px - car.x;
      const dz = pz - car.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 260) {
        V.despawnPolice(car);
        continue;
      }
      const want = Math.atan2(dx, dz);
      let dy = want - car.heading;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dy));
      car.speed = Math.min(CFG.policeSpeed, car.speed + 14 * dt);
      // ram: if very close to the player's car, shove it
      if (G.player.car && dist < 4.5) {
        G.player.car.speed *= 0.94;
        G.player.car.x += (dx / dist) * 0.5;
        G.player.car.z += (dz / dist) * 0.5;
        if (Math.random() < dt * 2) G.audio.thud();
      }
      const nx = car.x + Math.sin(car.heading) * car.speed * dt;
      const nz = car.z + Math.cos(car.heading) * car.speed * dt;
      const push = collideCircle(nx, nz, 2.1, G.world.colliders);
      if (!push) {
        car.x = nx;
        car.z = nz;
      } else {
        car.speed *= 0.5;
      }
      G.world.clampToWorld(car, 2.2);
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
    }
  };

  return V;
}
