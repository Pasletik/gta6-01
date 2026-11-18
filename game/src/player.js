// Dante Cole — third-person on-foot character.
import * as THREE from 'three';
import { CFG, PED_SHIRTS, PED_SKINS, PED_PANTS } from './config.js';

function limb(mat, w, h, d, px, py) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(px, py, 0);
  m.castShadow = true;
  return m;
}

export function makeHumanoid(rng, shirt, skin, pants, scale = 1) {
  const g = new THREE.Group();
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.9 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.8 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.95 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.3), shirtMat);
  torso.position.y = 1.12; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.32), skinMat);
  head.position.y = 1.62; head.castShadow = true; g.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.34), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1 }));
  hair.position.y = 1.8; g.add(hair);
  // arms pivot at shoulders
  const armL = new THREE.Group(); armL.position.set(-0.32, 1.38, 0);
  armL.add(limb(skinMat, 0.15, 0.3, 0.15, 0, -0.14));
  armL.add(limb(shirtMat, 0.17, 0.32, 0.17, 0, -0.42));
  const armR = new THREE.Group(); armR.position.set(0.32, 1.38, 0);
  armR.add(limb(skinMat, 0.15, 0.3, 0.15, 0, -0.14));
  armR.add(limb(shirtMat, 0.17, 0.32, 0.17, 0, -0.42));
  g.add(armL); g.add(armR);
  // legs pivot at hips
  const legL = new THREE.Group(); legL.position.set(-0.14, 0.82, 0);
  legL.add(limb(pantsMat, 0.19, 0.8, 0.2, 0, -0.4));
  const legR = new THREE.Group(); legR.position.set(0.14, 0.82, 0);
  legR.add(limb(pantsMat, 0.19, 0.8, 0.2, 0, -0.4));
  g.add(legL); g.add(legR);
  // pistol in right hand
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.34), new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.4, metalness: 0.6 }));
  gun.position.set(0, -0.62, 0.14);
  armR.add(gun);
  g.scale.setScalar(scale);
  g.userData = { armL, armR, legL, legR, torso, head };
  return g;
}

export class Player {
  constructor(scene, rng) {
    this.scene = scene;
    this.group = makeHumanoid(rng, 0x2a9d4a, 0xf1c27d, 0x2b2d42, 1.05); // Dante: green jacket
    scene.add(this.group);
    this.pos = new THREE.Vector3(0, 0, -85);
    this.heading = 0;
    this.camYaw = Math.PI; // looking north (+z is south; camera behind)
    this.camPitch = 0.32;
    this.camDist = 7.5;
    this.speed = 0;
    this.health = 100;
    this.walkPhase = 0;
    this.inCar = null;
    this.aiming = false;
  }
  reset() {
    this.pos.set(0, 0, -85); this.heading = 0; this.camYaw = Math.PI; this.camPitch = 0.32;
    this.health = 100; this.inCar = null;
    this.group.visible = true;
    this.group.rotation.set(0, 0, 0);
  }
  update(dt, input, world) {
    if (this.inCar) return;
    const [mdx, mdy] = input.consumeMouse();
    this.camYaw -= mdx * 0.0032;
    this.camPitch = Math.max(-0.15, Math.min(0.85, this.camPitch + mdy * 0.0026));
    let fx = 0, fz = 0;
    if (input.down('KeyW', 'ArrowUp')) fz -= 1;
    if (input.down('KeyS', 'ArrowDown')) fz += 1;
    if (input.down('KeyA', 'ArrowLeft')) fx -= 1;
    if (input.down('KeyD', 'ArrowRight')) fx += 1;
    const run = input.down('ShiftLeft', 'ShiftRight');
    const moving = fx !== 0 || fz !== 0;
    const sp = run ? CFG.playerRun : CFG.playerSpeed;
    if (moving) {
      const len = Math.hypot(fx, fz); fx /= len; fz /= len;
      const sin = Math.sin(this.camYaw), cos = Math.cos(this.camYaw);
      const wx = fx * cos - fz * sin;
      const wz = fx * sin + fz * cos;
      const targetHeading = Math.atan2(wx, wz);
      let dh = targetHeading - this.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      this.heading += dh * Math.min(1, dt * 12);
      this.pos.x += wx * sp * dt;
      this.pos.z += wz * sp * dt;
      this.speed = sp;
      this.walkPhase += dt * sp * 1.6;
    } else {
      this.speed = 0;
    }
    const [nx, nz] = world.collideCircle(this.pos.x, this.pos.z, 0.55);
    this.pos.x = nx; this.pos.z = nz;
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.heading;
    const u = this.group.userData;
    const swing = moving ? Math.sin(this.walkPhase) * 0.65 : 0;
    u.legL.rotation.x = swing; u.legR.rotation.x = -swing;
    u.armL.rotation.x = -swing * 0.8; u.armR.rotation.x = swing * 0.8;
    this.aiming = input.mouseDown;
    if (this.aiming) { u.armR.rotation.x = -1.2; u.armL.rotation.x = -1.0; }
  }
  cameraPos() {
    const d = this.camDist;
    const cx = this.pos.x - Math.sin(this.camYaw) * Math.cos(this.camPitch) * d;
    const cz = this.pos.z - Math.cos(this.camYaw) * Math.cos(this.camPitch) * d;
    const cy = 2.2 + Math.sin(this.camPitch) * d;
    return new THREE.Vector3(cx, cy, cz);
  }
  cameraTarget() {
    return new THREE.Vector3(this.pos.x, 1.6, this.pos.z);
  }
}
