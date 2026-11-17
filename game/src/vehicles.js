// Cars: the player's ride, parked cars to steal, traffic that follows the road grid, and
// police cars that chase. Arcade driving: no physics library, just speed, heading and
// simple circle collisions.
import * as THREE from 'three';
import { CAR, CITY, TRAFFIC, WANTED } from './config.js';

const CAR_COLORS = [0xc0392b, 0x2e6db4, 0xd8b13c, 0x7a7a7a, 0x2f8f5b, 0x8a5fb0, 0xd8d8d8, 0x222222, 0xe07840];

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function makeCarMesh(color, police) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 4.4), bodyMat);
  body.position.y = 0.62;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 0.55, 2.1),
    new THREE.MeshStandardMaterial({ color: 0x1c2733, metalness: 0.7, roughness: 0.25 }),
  );
  cabin.position.set(0, 1.18, -0.25);
  cabin.castShadow = true;
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const wheels = [];
  for (const [x, z] of [[-0.85, 1.45], [0.85, 1.45], [-0.85, -1.45], [0.85, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.38, z);
    group.add(wheel);
    wheels.push(wheel);
  }
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffedb0, emissiveIntensity: 0.7 });
  for (const x of [-0.6, 0.6]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.08), lightMat);
    light.position.set(x, 0.62, 2.21);
    group.add(light);
  }
  let lightBar = null;
  if (police) {
    const bar = new THREE.Group();
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), new THREE.MeshStandardMaterial({ color: 0xcc0000, emissive: 0xff0000, emissiveIntensity: 1 }));
    red.position.x = -0.35;
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), new THREE.MeshStandardMaterial({ color: 0x0000cc, emissive: 0x0000ff, emissiveIntensity: 1 }));
    blue.position.x = 0.35;
    bar.add(red);
    bar.add(blue);
    bar.position.set(0, 1.55, -0.25);
    group.add(bar);
    lightBar = { red: red.material, blue: blue.material };
  }
  return { group, wheels, lightBar };
}

export function createVehicles(scene, world, rng, effects, audio) {
  const cars = [];
  let playerCar = null;

  function addCar(kind, x, z, heading, color) {
    const police = kind === 'police';
    const { group, wheels, lightBar } = makeCarMesh(police ? 0xe8e8e8 : color, police);
    group.position.set(x, 0, z);
    group.rotation.y = heading;
    scene.add(group);
    const car = {
      kind, group, wheels, lightBar,
      pos: group.position,
      heading,
      speed: 0,
      steer: 0,
      health: police ? 100 : 1000,
      disabled: false,
      route: null,
      routeIndex: 0,
      brake: false,
      flash: 0,
      despawn: 0,
      color,
    };
    group.userData.car = car;
    cars.push(car);
    return car;
  }

  function blockLoop() {
    // A rectangle loop around one block, driven on the right-hand lane.
    const i = rng.int(0, CITY.roads.length - 2);
    const j = rng.int(0, CITY.roads.length - 2);
    const x0 = CITY.roads[i];
    const x1 = CITY.roads[i + 1];
    const z0 = CITY.roads[j];
    const z1 = CITY.roads[j + 1];
    const lane = 2.4;
    const clockwise = rng.chance(0.5);
    const pts = clockwise
      ? [{ x: x0 + lane, z: z0 + lane }, { x: x1 - lane, z: z0 + lane }, { x: x1 - lane, z: z1 - lane }, { x: x0 + lane, z: z1 - lane }]
      : [{ x: x0 + lane, z: z0 + lane }, { x: x0 + lane, z: z1 - lane }, { x: x1 - lane, z: z1 - lane }, { x: x1 - lane, z: z0 + lane }];
    return pts;
  }

  function spawnParkedAt(x, z, heading) {
    return addCar('parked', x, z, heading, rng.pick(CAR_COLORS));
  }

  function spawnParked(count) {
    for (let n = 0; n < count; n += 1) {
      const p = world.randomRoadPoint();
      const alongRoad = rng.chance(0.5);
      const x = alongRoad ? p.x + rng.pick([-7.5, 7.5]) : p.x;
      const z = alongRoad ? p.z : p.z + rng.pick([-7.5, 7.5]);
      const heading = alongRoad ? (rng.chance(0.5) ? 0 : Math.PI) : (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
      const car = addCar('parked', x, z, heading, rng.pick(CAR_COLORS));
      car.route = null;
    }
  }

  function spawnTraffic(count) {
    for (let n = 0; n < count; n += 1) {
      const route = blockLoop();
      const start = route[rng.int(0, route.length - 1)];
      const car = addCar('traffic', start.x, start.z, 0, rng.pick(CAR_COLORS));
      car.route = route;
      car.routeIndex = 0;
      car.speed = TRAFFIC.speed;
    }
  }

  function spawnPoliceAt(pos) {
    const spot = world.randomRoadPoint();
    // Prefer a road point near the player.
    const dx = pos.x - spot.x;
    const dz = pos.z - spot.z;
    const dist = Math.hypot(dx, dz);
    const x = dist > 60 ? pos.x + (dx / dist) * 45 : spot.x;
    const z = dist > 60 ? pos.z + (dz / dist) * 45 : spot.z;
    const car = addCar('police', x, z, 0, 0xe8e8e8);
    car.speed = 12;
    return car;
  }

  function nearestCar(pos, maxDist, kinds) {
    let best = null;
    let bestD = maxDist;
    for (const car of cars) {
      if (kinds && !kinds.includes(car.kind)) continue;
      const d = Math.hypot(car.pos.x - pos.x, car.pos.z - pos.z);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }

  function carAhead(car, maxDist) {
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    let best = maxDist;
    for (const other of cars) {
      if (other === car || other.disabled) continue;
      const dx = other.pos.x - car.pos.x;
      const dz = other.pos.z - car.pos.z;
      const along = dx * fx + dz * fz;
      const side = Math.abs(dx * fz - dz * fx);
      if (along > 0 && along < best && side < 3) best = along;
    }
    return best;
  }

  function drive(car, throttle, steer, dt) {
    if (car.disabled) {
      car.speed *= Math.max(0, 1 - 3 * dt);
    } else {
      car.speed += throttle * CAR.accel * dt;
      if (throttle === 0) car.speed *= Math.max(0, 1 - 0.7 * dt);
      car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
      const steerFactor = 1 / (1 + Math.abs(car.speed) * 0.045);
      car.heading += steer * CAR.steer * steerFactor * 2.4 * dt * Math.sign(car.speed || 1);
    }
    car.pos.x += Math.sin(car.heading) * car.speed * dt;
    car.pos.z += Math.cos(car.heading) * car.speed * dt;
    car.group.position.copy(car.pos);
    car.group.rotation.y = car.heading;
    const spin = car.speed * dt * 2.6;
    for (const wheel of car.wheels) wheel.rotation.x += spin;
  }

  function update(dt, ctx) {
    const { player, wanted, input, effects: fx, audio: au } = ctx;
    // Police numbers follow the wanted level.
    const wantedPolice = WANTED.policePerStar[wanted.level] || 0;
    const police = cars.filter((c) => c.kind === 'police' && !c.disabled);
    if (police.length < wantedPolice) {
      spawnPoliceAt(player.pos);
    }
    for (const car of [...cars]) {
      if (car.kind === 'player') continue;
      if (car.kind === 'traffic') {
        const target = car.route[car.routeIndex];
        const dx = target.x - car.pos.x;
        const dz = target.z - car.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 3.5) {
          car.routeIndex = (car.routeIndex + 1) % car.route.length;
        } else {
          const desired = Math.atan2(dx, dz);
          const diff = angleDiff(desired, car.heading);
          const ahead = carAhead(car, TRAFFIC.minGap + 4);
          const playerAhead = player.inCar && player.car
            ? Math.hypot(player.car.pos.x - car.pos.x, player.car.pos.z - car.pos.z) < 8
            : false;
          const throttle = ahead < TRAFFIC.minGap + 2 || playerAhead ? -0.6 : 0.45;
          drive(car, throttle, Math.max(-1, Math.min(1, diff * 1.8)), dt);
          car.speed = Math.max(0, Math.min(TRAFFIC.speed, car.speed));
        }
      } else if (car.kind === 'police') {
        if (car.disabled) {
          car.despawn += dt;
          if (car.despawn > 6) {
            scene.remove(car.group);
            cars.splice(cars.indexOf(car), 1);
          }
          car.flash += dt;
          if (car.lightBar) {
            const on = Math.floor(car.flash * 4) % 2 === 0;
            car.lightBar.red.emissiveIntensity = on ? 1.4 : 0.1;
            car.lightBar.blue.emissiveIntensity = on ? 0.1 : 1.4;
          }
          continue;
        }
        const dx = player.pos.x - car.pos.x;
        const dz = player.pos.z - car.pos.z;
        const dist = Math.hypot(dx, dz);
        const desired = Math.atan2(dx, dz);
        const diff = angleDiff(desired, car.heading);
        const throttle = dist > 4 ? 1 : 0.4;
        drive(car, throttle, Math.max(-1, Math.min(1, diff * 2.2)), dt);
        car.speed = Math.min(27, Math.max(0, car.speed));
        car.flash += dt;
        if (car.lightBar) {
          const on = Math.floor(car.flash * 4) % 2 === 0;
          car.lightBar.red.emissiveIntensity = on ? 1.6 : 0.1;
          car.lightBar.blue.emissiveIntensity = on ? 0.1 : 1.6;
        }
        // Ram the player's car.
        if (player.inCar && player.car && dist < 4.6) {
          player.car.speed *= 0.86;
          car.speed *= 0.7;
          if (Math.abs(car.speed) > 6) {
            fx.burst(player.car.pos, { r: 1, g: 0.8, b: 0.2 }, 8, 3, 2);
            au.crash();
          }
        }
        // Too far away for too long: despawn and respawn closer next time.
        if (dist > 160) {
          scene.remove(car.group);
          cars.splice(cars.indexOf(car), 1);
        }
      }
    }
    // Player driving.
    if (player.inCar && player.car) {
      const axis = input.axis();
      const throttle = axis.y > 0 ? 1 : axis.y < 0 ? -0.7 : 0;
      const steer = -axis.x;
      const before = { x: player.car.pos.x, z: player.car.pos.z, speed: player.car.speed };
      drive(player.car, input.handbrake() ? -0.2 : throttle, steer, dt);
      if (input.handbrake()) player.car.speed *= Math.max(0, 1 - 2.2 * dt);
      world.collideCircle(player.car.pos, CAR.radius);
      const travelled = Math.hypot(
        player.car.pos.x - (before.x + Math.sin(player.car.heading) * before.speed * dt),
        player.car.pos.z - (before.z + Math.cos(player.car.heading) * before.speed * dt),
      );
      if (travelled > 0.35 && Math.abs(before.speed) > 8) {
        player.car.speed *= 0.45;
        fx.burst(player.car.pos, { r: 1, g: 0.7, b: 0.2 }, 10, 4, 2);
        au.crash();
        if (Math.abs(before.speed) > 14) player.health = Math.max(0, player.health - 6);
      }
      if (Math.abs(player.car.speed) > 4 && Math.random() < dt * 8) {
        fx.smoke({ x: player.car.pos.x - Math.sin(player.car.heading) * 2.2, y: 0.7, z: player.car.pos.z - Math.cos(player.car.heading) * 2.2 });
      }
      au.engine(Math.min(1, Math.abs(player.car.speed) / CAR.maxSpeed), Math.abs(throttle));
      player.pos.copy(player.car.pos);
      player.heading = player.car.heading;
    } else {
      au.engineOff();
    }
    // Cars stay on land: the beach ends at the water and the pier is for feet, not wheels.
    for (const car of cars) world.clampCar(car.pos, CAR.radius);
    playerCar = player.inCar ? player.car : null;
  }

  function setPlayerCar(car) {
    if (playerCar) playerCar.kind = 'parked';
    playerCar = car;
    if (car) car.kind = 'player';
  }

  return {
    cars,
    get playerCar() {
      return playerCar;
    },
    spawnParked,
    spawnParkedAt,
    spawnTraffic,
    spawnPoliceAt,
    nearestCar,
    setPlayerCar,
    update,
    drive,
  };
}
