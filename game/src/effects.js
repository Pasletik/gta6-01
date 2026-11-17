// A small pooled particle system (one THREE.Points cloud): exhaust, muzzle sparks, crash
// debris and skid dust. No textures, no files.
import * as THREE from 'three';

const MAX = 420;

export function createEffects(scene) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(MAX * 3);
  const colors = new Float32Array(MAX * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  const parts = [];
  for (let i = 0; i < MAX; i += 1) {
    parts.push({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, r: 1, g: 1, b: 1, grow: 0 });
  }
  let cursor = 0;

  function spawn(x, y, z, vx, vy, vz, life, r, g, b) {
    const p = parts[cursor];
    cursor = (cursor + 1) % MAX;
    p.alive = true;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.life = life;
    p.maxLife = life;
    p.r = r;
    p.g = g;
    p.b = b;
  }

  function burst(pos, color, count, speed, up) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      spawn(pos.x, pos.y, pos.z, Math.cos(a) * s, (up || 2) * Math.random(), Math.sin(a) * s, 0.4 + Math.random() * 0.5, color.r, color.g, color.b);
    }
  }

  function update(dt) {
    for (let i = 0; i < MAX; i += 1) {
      const p = parts[i];
      if (!p.alive) {
        positions[i * 3 + 1] = -100;
        continue;
      }
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        positions[i * 3 + 1] = -100;
        continue;
      }
      p.vy -= 4 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < 0.05) p.y = 0.05;
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      const fade = p.life / p.maxLife;
      colors[i * 3] = p.r * fade;
      colors[i * 3 + 1] = p.g * fade;
      colors[i * 3 + 2] = p.b * fade;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }

  return {
    burst,
    smoke(pos) {
      spawn(pos.x, pos.y, pos.z, (Math.random() - 0.5) * 0.6, 0.9, (Math.random() - 0.5) * 0.6, 0.9, 0.55, 0.55, 0.55);
    },
    update,
  };
}
