// Particles, tracers, muzzle flash, skid marks.
import * as THREE from 'three';

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.parts = [];
    this.poolSize = 240;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.poolSize * 3);
    this.col = new Float32Array(this.poolSize * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.45, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    for (let i = 0; i < this.poolSize; i++) this.parts.push({ life: 0, max: 1, vx: 0, vy: 0, vz: 0, x: 0, y: -100, z: 0, r: 1, g: 1, b: 1, grav: 0 });
    this.cursor = 0;
    // tracer pool (stretched additive boxes)
    this.tracers = [];
    const tmat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1), tmat.clone());
      m.visible = false; scene.add(m);
      this.tracers.push({ mesh: m, life: 0 });
    }
    // muzzle flash light + sprite
    this.flashLight = new THREE.PointLight(0xffc36a, 0, 18, 1.6);
    scene.add(this.flashLight);
    // skid marks
    this.skids = [];
    const smat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.55, depthWrite: false });
    this.skidMat = smat;
  }
  burst(x, y, z, color, n, speed, life = 0.7, grav = -6, up = 2) {
    const c = new THREE.Color(color);
    for (let k = 0; k < n; k++) {
      const p = this.parts[this.cursor]; this.cursor = (this.cursor + 1) % this.poolSize;
      const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI - Math.PI / 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      p.x = x; p.y = y; p.z = z;
      p.vx = Math.cos(a) * Math.cos(e) * s; p.vy = Math.sin(e) * s + up; p.vz = Math.sin(a) * Math.cos(e) * s;
      p.life = p.max = life * (0.6 + Math.random() * 0.7);
      p.r = c.r; p.g = c.g; p.b = c.b; p.grav = grav;
    }
  }
  tracer(from, to) {
    const t = this.tracers.find((x) => x.life <= 0) || this.tracers[0];
    const m = t.mesh;
    const mid = from.clone().add(to).multiplyScalar(0.5);
    m.position.copy(mid);
    m.lookAt(to);
    m.scale.set(1, 1, from.distanceTo(to));
    m.visible = true; m.material.opacity = 0.9;
    t.life = 0.09;
  }
  muzzle(pos) {
    this.flashLight.position.copy(pos);
    this.flashLight.intensity = 26;
    this.burst(pos.x, pos.y, pos.z, 0xffc36a, 6, 3, 0.18, 0, 1);
  }
  skid(x, z, angle) {
    if (this.skids.length > 46) {
      const old = this.skids.shift();
      this.scene.remove(old);
    }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 1.6), this.skidMat);
    m.rotation.x = -Math.PI / 2; m.rotation.z = angle;
    m.position.set(x, 0.06, z);
    this.scene.add(m);
    this.skids.push(m);
  }
  update(dt) {
    for (let i = 0; i < this.poolSize; i++) {
      const p = this.parts[i];
      if (p.life > 0) {
        p.life -= dt;
        p.vy += p.grav * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.y < 0.05) { p.y = 0.05; p.vy *= -0.3; }
      }
      const j = i * 3;
      if (p.life > 0) {
        this.pos[j] = p.x; this.pos[j + 1] = p.y; this.pos[j + 2] = p.z;
        const f = p.life / p.max;
        this.col[j] = p.r * f; this.col[j + 1] = p.g * f; this.col[j + 2] = p.b * f;
      } else { this.pos[j + 1] = -100; }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    for (const t of this.tracers) {
      if (t.life > 0) {
        t.life -= dt;
        t.mesh.material.opacity = Math.max(0, t.life / 0.09) * 0.9;
        if (t.life <= 0) t.mesh.visible = false;
      }
    }
    if (this.flashLight.intensity > 0) this.flashLight.intensity = Math.max(0, this.flashLight.intensity - dt * 320);
  }
}
