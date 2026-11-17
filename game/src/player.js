// Dante Cole on foot: a simple articulated figure, third-person camera, enter/exit cars.
import * as THREE from 'three';
import { PLAYER } from './config.js';

function limb(color, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  mesh.castShadow = true;
  return mesh;
}

export function createPlayer(scene) {
  const group = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0x7a2e2e, roughness: 0.8 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), jacket);
  torso.position.y = 1.12;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), new THREE.MeshStandardMaterial({ color: 0xc99a76, roughness: 0.7 }));
  head.position.y = 1.68;
  head.castShadow = true;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.36), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
  hair.position.y = 1.88;
  group.add(hair);
  const legL = limb(0x2c3e55, 0.24, 0.78, 0.28);
  legL.position.set(-0.16, 0.39, 0);
  const legR = limb(0x2c3e55, 0.24, 0.78, 0.28);
  legR.position.set(0.16, 0.39, 0);
  group.add(legL);
  group.add(legR);
  const armL = limb(0x7a2e2e, 0.18, 0.62, 0.2);
  armL.position.set(-0.42, 1.12, 0);
  const armR = limb(0x7a2e2e, 0.18, 0.62, 0.2);
  armR.position.set(0.42, 1.12, 0);
  group.add(armL);
  group.add(armR);
  scene.add(group);

  const player = {
    group,
    pos: new THREE.Vector3(-84, 0, -84),
    heading: 0,
    speed: 0,
    health: PLAYER.health,
    inCar: false,
    car: null,
    walkPhase: 0,
    yaw: Math.PI * 0.75,
    pitch: 0.32,
  };

  function update(dt, input, world, cars) {
    if (player.inCar) {
      group.visible = false;
      return;
    }
    group.visible = true;
    const look = input.look();
    player.yaw -= look.dx * 0.0032;
    player.pitch = Math.max(-0.1, Math.min(0.9, player.pitch + look.dy * 0.0022));
    const axis = input.axis();
    const moving = axis.x !== 0 || axis.y !== 0;
    const speed = input.run() ? PLAYER.runSpeed : PLAYER.walkSpeed;
    if (moving) {
      const forward = { x: -Math.sin(player.yaw), z: -Math.cos(player.yaw) };
      const right = { x: -forward.z, z: forward.x };
      let mx = forward.x * axis.y + right.x * axis.x;
      let mz = forward.z * axis.y + right.z * axis.x;
      const len = Math.hypot(mx, mz) || 1;
      mx /= len;
      mz /= len;
      player.pos.x += mx * speed * dt;
      player.pos.z += mz * speed * dt;
      player.speed = speed;
      const targetHeading = Math.atan2(mx, mz);
      let diff = targetHeading - player.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      player.heading += diff * Math.min(1, dt * 10);
      player.walkPhase += dt * speed * 1.6;
      const swing = Math.sin(player.walkPhase) * 0.55;
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      armL.rotation.x = -swing * 0.7;
      armR.rotation.x = swing * 0.7;
    } else {
      player.speed = 0;
      legL.rotation.x *= 0.8;
      legR.rotation.x *= 0.8;
      armL.rotation.x *= 0.8;
      armR.rotation.x *= 0.8;
    }
    world.collideCircle(player.pos, PLAYER.radius);
    // Do not walk through cars.
    for (const car of cars) {
      const dx = player.pos.x - car.pos.x;
      const dz = player.pos.z - car.pos.z;
      const d = Math.hypot(dx, dz);
      const min = 2.4;
      if (d < min && d > 0.001) {
        player.pos.x = car.pos.x + (dx / d) * min;
        player.pos.z = car.pos.z + (dz / d) * min;
      }
    }
    group.position.copy(player.pos);
    group.rotation.y = player.heading;
  }

  /** Third-person camera: behind the player (or the car), mouse orbit. */
  function updateCamera(camera, dt) {
    const target = player.inCar && player.car ? player.car.pos : player.pos;
    const dist = player.inCar ? 10.5 : 7.5;
    const height = player.inCar ? 3.6 : 2.6;
    const cx = target.x + Math.sin(player.yaw) * dist * Math.cos(player.pitch);
    const cz = target.z + Math.cos(player.yaw) * dist * Math.cos(player.pitch);
    const cy = (player.inCar ? 1.2 : 1.6) + height * Math.sin(player.pitch) + (player.inCar ? 1.4 : 0.4);
    camera.position.set(cx, cy, cz);
    camera.lookAt(target.x, target.y + 1.5, target.z);
  }

  // Return the player object itself (not a spread copy): the game, the shots and the
  // camera all write yaw/pitch/inCar/car on this object, and update/updateCamera must
  // read those same writes. A spread copy silently kept the initial yaw and inCar=false.
  player.update = update;
  player.updateCamera = updateCamera;
  return player;
}
