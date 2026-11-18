// Solara Bay — particles, tracers and muzzle flashes. One pooled point
// cloud for sparks and smoke, plus a small pool of fading tracer lines,
// so combat reads clearly without allocating geometry every shot.

import * as THREE from 'three';

const MAX_PARTICLES = 400;
const MAX_TRACERS = 12;

export function createEffects(scene) {
  const positions = new Float32Array(MAX_PARTICLES * 3);
  const colors = new Float32Array(MAX_PARTICLES * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  const parts = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    parts.push({ alive: false, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, grav: 0 });
    positions[i * 3 + 1] = -999;
  }
  let cursor = 0;

  const tracers = [];
  for (let i = 0; i < MAX_TRACERS; i++) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0 }));
    line.frustumCulled = false;
    scene.add(line);
    tracers.push({ line, life: 0 });
  }
  let tCursor = 0;

  const flash = new THREE.PointLight(0xffc860, 0, 14, 1.6);
  scene.add(flash);
  let flashLife = 0;

  function spawn(x, y, z, vx, vy, vz, life, r, g, b, grav) {
    const p = parts[cursor];
    cursor = (cursor + 1) % MAX_PARTICLES;
    p.alive = true;
    p.x = x; p.y = y; p.z = z;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.life = life;
    p.maxLife = life;
    p.grav = grav;
    const idx = parts.indexOf(p);
    colors[idx * 3] = r;
    colors[idx * 3 + 1] = g;
    colors[idx * 3 + 2] = b;
  }

  const effects = {
    burst(pos, colorHex, count, speed, life = 0.7, grav = 9) {
      const c = new THREE.Color(colorHex);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const up = Math.random() * 0.9 + 0.2;
        const s = speed * (0.4 + Math.random() * 0.8);
        spawn(pos.x, pos.y, pos.z, Math.cos(a) * s, up * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.7), c.r, c.g, c.b, grav);
      }
    },
    smoke(pos, count = 10) {
      for (let i = 0; i < count; i++) {
        spawn(
          pos.x + (Math.random() - 0.5), pos.y + Math.random() * 0.5, pos.z + (Math.random() - 0.5),
          (Math.random() - 0.5) * 0.8, 1 + Math.random() * 1.2, (Math.random() - 0.5) * 0.8,
          1.4 + Math.random(), 0.25, 0.25, 0.25, -1.5,
        );
      }
    },
    tracer(from, to) {
      const t = tracers[tCursor];
      tCursor = (tCursor + 1) % MAX_TRACERS;
      const arr = t.line.geometry.attributes.position.array;
      arr[0] = from.x; arr[1] = from.y; arr[2] = from.z;
      arr[3] = to.x; arr[4] = to.y; arr[5] = to.z;
      t.line.geometry.attributes.position.needsUpdate = true;
      t.line.material.opacity = 0.95;
      t.life = 0.09;
    },
    muzzle(pos) {
      flash.position.copy(pos);
      flash.intensity = 60;
      flashLife = 0.06;
    },
    update(dt) {
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = parts[i];
        if (!p.alive) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.alive = false;
          positions[i * 3 + 1] = -999;
          continue;
        }
        p.vy -= p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        if (p.y < 0.05) { p.y = 0.05; p.vy = 0; p.vx *= 0.6; p.vz *= 0.6; }
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      for (const t of tracers) {
        if (t.life > 0) {
          t.life -= dt;
          t.line.material.opacity = Math.max(0, t.life / 0.09) * 0.95;
        }
      }
      if (flashLife > 0) {
        flashLife -= dt;
        if (flashLife <= 0) flash.intensity = 0;
      }
    },
  };
  return effects;
}
