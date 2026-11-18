// Solara Bay — pistol combat. One job: fire the pistol, trace the shot,
// and apply damage to pedestrians and police cars.

import * as THREE from 'three';
import { CFG } from './config.js';

export class Combat {
  constructor(scene) {
    this.scene = scene;
    this.cooldown = 0;
    this.raycaster = new THREE.Raycaster();
    // Tracer pool: thin glowing lines, reused.
    this.tracers = [];
    const mat = new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(), new THREE.Vector3(),
      ]);
      const line = new THREE.Line(geo, mat);
      line.visible = false;
      line.frustumCulled = false;
      scene.add(line);
      this.tracers.push({ line, life: 0 });
    }
    this.nextTracer = 0;
    // Muzzle flash: a small sprite at the gun.
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffcc44 });
    this.flash = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), flashMat);
    this.flash.visible = false;
    scene.add(this.flash);
    this.flashLife = 0;
  }

  // Fire from `from` (Vector3) along `dir` (unit Vector3). Returns what the
  // shot hit: { kind: 'ped'|'police'|'none', target, point }.
  shoot(from, dir, peds, police) {
    if (this.cooldown > 0) return null;
    this.cooldown = CFG.pistolCooldown;
    this.raycaster.set(from, dir);
    this.raycaster.far = CFG.pistolRange;

    // Collect targets: ped bodies and police cars as bounding spheres.
    const targets = [];
    for (const p of peds.peds) {
      if (p.state === 'down') continue;
      targets.push({ kind: 'ped', target: p, center: new THREE.Vector3(p.x, 1.1, p.z), radius: 1.0 });
    }
    for (const c of police) {
      if (c.disabled) continue;
      targets.push({ kind: 'police', target: c, center: new THREE.Vector3(c.x, 1.0, c.z), radius: 2.6 });
    }

    let hit = { kind: 'none', target: null, point: from.clone().addScaledVector(dir, CFG.pistolRange) };
    let bestD = CFG.pistolRange;
    const tmp = new THREE.Vector3();
    for (const t of targets) {
      // Ray-sphere test.
      tmp.copy(t.center).sub(from);
      const along = tmp.dot(dir);
      if (along < 0 || along > bestD) continue;
      const closest = from.clone().addScaledVector(dir, along);
      if (closest.distanceTo(t.center) <= t.radius) {
        bestD = along;
        hit = { kind: t.kind, target: t.target, point: closest };
      }
    }

    // Tracer from the muzzle to the hit point.
    const tr = this.tracers[this.nextTracer];
    this.nextTracer = (this.nextTracer + 1) % this.tracers.length;
    const pos = tr.line.geometry.attributes.position;
    pos.setXYZ(0, from.x, from.y, from.z);
    pos.setXYZ(1, hit.point.x, hit.point.y, hit.point.z);
    pos.needsUpdate = true;
    tr.line.visible = true;
    tr.life = 0.09;
    // Muzzle flash at the gun.
    this.flash.position.copy(from);
    this.flash.visible = true;
    this.flashLife = 0.06;
    return hit;
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    for (const t of this.tracers) {
      if (t.life > 0) {
        t.life -= dt;
        if (t.life <= 0) t.line.visible = false;
      }
    }
    if (this.flashLife > 0) {
      this.flashLife -= dt;
      if (this.flashLife <= 0) this.flash.visible = false;
    }
  }
}
