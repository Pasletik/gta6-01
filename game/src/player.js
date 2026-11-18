// Solara Bay — Dante Cole on foot. WASD moves relative to the camera,
// the mouse orbits the camera, and buildings push the player out.
// Driving is the vehicles module's job; this module only runs on foot.

import * as THREE from 'three';
import { CFG, PALETTE } from './config.js';
import { collideCircle } from './world.js';

export function createPlayer(scene) {
  const group = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: PALETTE.playerJacket });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.1, 8), jacket);
  body.position.y = 1.05;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), skin);
  head.position.y = 1.85;
  head.castShadow = true;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 10), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  cap.position.y = 2.08;
  group.add(cap);
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.9, 6), pants);
  legL.position.set(-0.2, 0.45, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.2;
  group.add(legR);
  // pistol in hand, visible when aiming
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.42), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  gun.position.set(0.45, 1.25, 0.35);
  gun.name = 'gun';
  group.add(gun);
  scene.add(group);

  const player = {
    group,
    pos: new THREE.Vector3(0, 0, 8),
    yaw: 0, // facing direction
    health: CFG.playerHealth,
    money: 0,
    car: null, // the car being driven, or null on foot
    walkPhase: 0,
  };

  player.reset = function (x, z, yaw) {
    player.pos.set(x, 0, z);
    player.yaw = yaw;
    player.health = CFG.playerHealth;
    player.car = null;
    group.visible = true;
    group.position.copy(player.pos);
    group.rotation.y = yaw;
  };

  player.update = function (dt, G) {
    if (player.car || G.state !== 'playing') return;
    const input = G.input;
    const camYaw = G.camYaw;
    // movement relative to camera
    let fx = 0;
    let fz = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) { fx -= Math.sin(camYaw); fz -= Math.cos(camYaw); }
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) { fx += Math.sin(camYaw); fz += Math.cos(camYaw); }
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) { fx -= Math.cos(camYaw); fz += Math.sin(camYaw); }
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) { fx += Math.cos(camYaw); fz -= Math.sin(camYaw); }
    const len = Math.hypot(fx, fz);
    const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const speed = sprint ? CFG.runSpeed : CFG.walkSpeed;
    if (len > 0.01) {
      fx /= len;
      fz /= len;
      player.pos.x += fx * speed * dt;
      player.pos.z += fz * speed * dt;
      const targetYaw = Math.atan2(fx, fz);
      let dy = targetYaw - player.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      player.yaw += dy * Math.min(1, dt * 12);
      player.walkPhase += dt * speed * 1.6;
      const bob = Math.sin(player.walkPhase) * 0.06;
      group.position.y = Math.abs(bob);
    } else {
      group.position.y = 0;
    }
    // buildings push the player out
    const push = collideCircle(player.pos.x, player.pos.z, CFG.playerRadius, G.world.colliders);
    if (push) {
      player.pos.x += push.x;
      player.pos.z += push.z;
    }
    G.world.clampToWorld(player.pos, CFG.playerRadius);
    player.pos.y = G.world.groundHeightAt(player.pos.x, player.pos.z);
    group.position.set(player.pos.x, player.pos.y + group.position.y, player.pos.z);
    group.rotation.y = player.yaw;
  };

  return player;
}
