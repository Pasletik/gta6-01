// Solara Bay — particles. One job: a single reusable pool of glowing points
// for exhaust, sparks, debris, smoke and pickup sparkles.

import * as THREE from 'three';

const MAX = 420;

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.positions = new Float32Array(MAX * 3);
    this.velocities = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.maxLife = new Float32Array(MAX);
    this.colors = new Float32Array(MAX * 3);
    this.cursor = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.55, vertexColors: true, transparent: true, opacity: 0.95,
      depthWrite: false, sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  spawn(x, y, z, vx, vy, vz, r, g, b, life) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % MAX;
    this.positions[i * 3] = x;
    this.positions[i * 3 + 1] = y;
    this.positions[i * 3 + 2] = z;
    this.velocities[i * 3] = vx;
    this.velocities[i * 3 + 1] = vy;
    this.velocities[i * 3 + 2] = vz;
    this.colors[i * 3] = r;
    this.colors[i * 3 + 1] = g;
    this.colors[i * 3 + 2] = b;
    this.life[i] = life;
    this.maxLife[i] = life;
  }

  // A burst of n particles in a sphere around a point.
  burst(x, y, z, n, speed, r, g, b, life = 0.8) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const e = (Math.random() - 0.5) * Math.PI;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.spawn(x, y, z,
        Math.cos(a) * Math.cos(e) * s,
        Math.abs(Math.sin(e)) * s + speed * 0.3,
        Math.sin(a) * Math.cos(e) * s,
        r, g, b, life * (0.6 + Math.random() * 0.7));
    }
  }

  sparks(x, y, z) { this.burst(x, y, z, 14, 7, 1.0, 0.8, 0.25, 0.5); }
  smoke(x, y, z) { this.burst(x, y, z, 8, 2.2, 0.32, 0.32, 0.34, 1.4); }
  debris(x, y, z) { this.burst(x, y, z, 18, 6, 0.75, 0.55, 0.3, 0.9); }
  sparkle(x, y, z) { this.burst(x, y, z, 22, 3, 1.0, 0.85, 0.3, 1.0); }
  exhaust(x, y, z) { this.spawn(x, y, z, (Math.random() - 0.5), 0.8, (Math.random() - 0.5), 0.45, 0.45, 0.45, 0.7); }

  update(dt) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) {
        this.positions[i * 3 + 1] = -100; // park dead particles underground
        continue;
      }
      this.life[i] -= dt;
      this.positions[i * 3] += this.velocities[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
      this.velocities[i * 3 + 1] -= 3.5 * dt; // gravity
      const fade = Math.max(0, this.life[i] / this.maxLife[i]);
      this.colors[i * 3] *= 0.995 + fade * 0.005;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
