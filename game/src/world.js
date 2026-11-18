// Solara Bay — the city itself. One job: build Solara Bay from the seed:
// roads, blocks, buildings, park, beach, ocean, docks and street props.

import * as THREE from 'three';
import { CFG, PLACES } from './config.js';
import {
  roadTexture, sidewalkTexture, facadeTexture,
  grassTexture, sandTexture, waterTexture, planksTexture,
} from './textures.js';

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Road centre lines: 8 roads each way across the 7-block grid.
export function roadCenters() {
  const out = [];
  for (let i = 0; i <= CFG.gridN; i++) out.push(-CFG.span / 2 + CFG.roadWidth / 2 + i * (CFG.blockSize + CFG.roadWidth));
  return out;
}

export function blockCenters() {
  const out = [];
  for (let i = 0; i < CFG.gridN; i++) out.push(-CFG.span / 2 + CFG.roadWidth + CFG.blockSize / 2 + i * (CFG.blockSize + CFG.roadWidth));
  return out;
}

export function buildWorld(scene, rng) {
  const colliders = [];
  const half = CFG.span / 2;
  const roads = roadCenters();
  const blocks = blockCenters();

  // --- Lights and sky -----------------------------------------------------
  scene.background = new THREE.Color(CFG.daySky);
  scene.fog = new THREE.Fog(CFG.daySky, CFG.fogNear, CFG.fogFar);
  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(CFG.sunColor, 1.6);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260;
  sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260;
  sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 600;
  scene.add(sun);

  // --- Ground: asphalt base for the whole city ----------------------------
  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.span + 60, CFG.span + 60),
    new THREE.MeshLambertMaterial({ map: roadTexture() }),
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.set(0, 0, 0);
  asphalt.receiveShadow = true;
  scene.add(asphalt);

  // Road strips (slightly raised, with the dashed texture) over the base.
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTexture() });
  for (const c of roads) {
    const alongX = new THREE.Mesh(new THREE.PlaneGeometry(CFG.span, CFG.roadWidth), roadMat);
    alongX.rotation.x = -Math.PI / 2;
    alongX.position.set(0, 0.02, c);
    alongX.receiveShadow = true;
    scene.add(alongX);
    const alongZ = new THREE.Mesh(new THREE.PlaneGeometry(CFG.roadWidth, CFG.span), roadMat);
    alongZ.rotation.x = -Math.PI / 2;
    alongZ.position.set(c, 0.02, 0);
    alongZ.receiveShadow = true;
    scene.add(alongZ);
  }

  // --- Blocks: sidewalk slabs, then buildings or the park -----------------
  const walkMat = new THREE.MeshLambertMaterial({ map: sidewalkTexture() });
  const facadeBases = ['#d8b48f', '#c9a37e', '#b7c4c9', '#d9c9a8', '#c2b2a0', '#a8b8a0'];
  const parkBlock = Math.floor(CFG.gridN / 2); // middle block is the park

  for (let bx = 0; bx < CFG.gridN; bx++) {
    for (let bz = 0; bz < CFG.gridN; bz++) {
      const cx = blocks[bx];
      const cz = blocks[bz];
      const slab = box(CFG.blockSize, 0.4, CFG.blockSize, walkMat, cx, 0.2, cz);
      slab.castShadow = false;
      scene.add(slab);

      if (bx === parkBlock && bz === parkBlock) continue; // park, built below

      // 1-4 buildings per block, arranged in a sub-grid.
      const n = rng.int(1, 4);
      const spots = [
        [-11, -11], [11, -11], [-11, 11], [11, 11],
      ];
      for (let s = 0; s < n; s++) {
        const [ox, oz] = spots[s];
        const w = rng.range(13, 19);
        const d = rng.range(13, 19);
        const h = rng.range(9, 34);
        const base = rng.pick(facadeBases);
        const mat = new THREE.MeshLambertMaterial({
          map: facadeTexture(base, rng.range(0.15, 0.45)),
        });
        const b = box(w, h, d, mat, cx + ox, 0.4 + h / 2, cz + oz);
        scene.add(b);
        // Flat roof cap.
        const roof = box(w + 0.6, 0.5, d + 0.6,
          new THREE.MeshLambertMaterial({ color: 0x5a5a58 }), cx + ox, 0.4 + h + 0.25, cz + oz);
        roof.castShadow = false;
        scene.add(roof);
        colliders.push({
          minX: cx + ox - w / 2, maxX: cx + ox + w / 2,
          minZ: cz + oz - d / 2, maxZ: cz + oz + d / 2,
        });
      }
    }
  }

  // --- Central park ---------------------------------------------------------
  const parkMat = new THREE.MeshLambertMaterial({ map: grassTexture() });
  const park = new THREE.Mesh(new THREE.PlaneGeometry(CFG.blockSize, CFG.blockSize), parkMat);
  park.rotation.x = -Math.PI / 2;
  park.position.set(blocks[parkBlock], 0.45, blocks[parkBlock]);
  park.receiveShadow = true;
  scene.add(park);
  // Pond.
  const pond = new THREE.Mesh(
    new THREE.CircleGeometry(9, 24),
    new THREE.MeshLambertMaterial({ color: 0x2f7fb0 }),
  );
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(blocks[parkBlock] + 6, 0.5, blocks[parkBlock] - 4);
  scene.add(pond);
  // Trees.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2a });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f7d2c });
  const trees = [];
  for (let i = 0; i < 9; i++) {
    const tx = blocks[parkBlock] + rng.range(-19, 19);
    const tz = blocks[parkBlock] + rng.range(-19, 19);
    if (Math.hypot(tx - (blocks[parkBlock] + 6), tz - (blocks[parkBlock] - 4)) < 11) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 4, 8), trunkMat);
    trunk.position.set(tx, 2.4, tz);
    trunk.castShadow = true;
    scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(rng.range(2.6, 3.8), 10, 8), leafMat);
    crown.position.set(tx, 5.6, tz);
    crown.castShadow = true;
    scene.add(crown);
    trees.push({ x: tx, z: tz, r: 1.2 });
    colliders.push({ minX: tx - 1, maxX: tx + 1, minZ: tz - 1, maxZ: tz + 1 });
  }
  // Benches.
  const benchMat = new THREE.MeshLambertMaterial({ color: 0x7a5c38 });
  for (let i = 0; i < 4; i++) {
    const bx = blocks[parkBlock] + rng.range(-16, 16);
    const bz = blocks[parkBlock] + rng.range(-16, 16);
    scene.add(box(3, 0.5, 1, benchMat, bx, 0.9, bz));
  }

  // --- Beach and ocean (south edge) ----------------------------------------
  const sandMat = new THREE.MeshLambertMaterial({ map: sandTexture() });
  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.span + 60, CFG.beachDepth + 6),
    sandMat,
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0.05, -half - CFG.beachDepth / 2 - 2);
  beach.receiveShadow = true;
  scene.add(beach);
  // Umbrellas on the beach.
  const umbMat = new THREE.MeshLambertMaterial({ color: 0xe74c3c });
  for (let i = 0; i < 6; i++) {
    const ux = -180 + i * 68 + rng.range(-8, 8);
    const uz = -half - 12 + rng.range(-4, 4);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 6),
      new THREE.MeshLambertMaterial({ color: 0xdddddd }));
    pole.position.set(ux, 1.5, uz);
    scene.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.2, 10), umbMat);
    top.position.set(ux, 3.4, uz);
    top.castShadow = true;
    scene.add(top);
  }

  const waterMat = new THREE.MeshLambertMaterial({ map: waterTexture() });
  waterMat.map.repeat.set(10, 4); // small streaks, not giant bands
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 320),
    waterMat,
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.4, -half - CFG.beachDepth - 160);
  scene.add(water);

  // --- Docks pier ------------------------------------------------------------
  // The pier deck is low and walkable: no collider, so Dante can walk out
  // to the package. Its height is groundHeightAt() below.
  const plankMat = new THREE.MeshLambertMaterial({ map: planksTexture() });
  const pier = box(10, 0.5, 52, plankMat, PLACES.docks.x, 0.25, PLACES.docks.z);
  scene.add(pier);
  // Pier posts.
  const postMat = new THREE.MeshLambertMaterial({ color: 0x5a4028 });
  for (const dz of [-24, -12, 0, 12, 24]) {
    for (const dx of [-4.5, 4.5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 3.4, 8), postMat);
      post.position.set(PLACES.docks.x + dx, -0.4, PLACES.docks.z + dz);
      scene.add(post);
    }
  }
  // Moored boats: simple hulls bobbing beside the pier.
  const boats = [];
  const hullMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f0 });
  const hullMat2 = new THREE.MeshLambertMaterial({ color: 0x2e86c1 });
  for (let i = 0; i < 3; i++) {
    const hull = box(3.4, 1.4, 9, i % 2 ? hullMat : hullMat2,
      PLACES.docks.x + (i % 2 ? 12 : -12), 0.2, PLACES.docks.z - 14 + i * 14);
    scene.add(hull);
    boats.push(hull);
  }

  // --- Streetlights along the roads -----------------------------------------
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
  const lampMat = new THREE.MeshLambertMaterial({ color: 0xfff6c0, emissive: 0x887733 });
  for (const c of roads) {
    for (let k = -2; k <= 2; k++) {
      const x = c + 7.5;
      const z = k * 80;
      if (Math.abs(z) > half) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 7, 8), poleMat);
      pole.position.set(x, 3.5, z);
      scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), lampMat);
      lamp.position.set(x, 7.1, z);
      scene.add(lamp);
    }
  }

  // --- Distant skyline silhouettes ------------------------------------------
  const skyMat = new THREE.MeshLambertMaterial({ color: 0x7f96a8 });
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2;
    const r = 330 + rng.range(0, 60);
    const sx = Math.cos(ang) * r;
    const sz = Math.sin(ang) * r;
    if (sz < -240) continue; // no towers standing in the sea
    const w = rng.range(24, 44);
    const h = rng.range(40, 110);
    const s = box(w, h, w, skyMat, sx, h / 2 - 1, sz);
    s.castShadow = false;
    scene.add(s);
  }

  // --- Clouds ----------------------------------------------------------------
  const clouds = [];
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 8; i++) {
    const cl = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(rng.range(6, 11), 8, 6), cloudMat);
      puff.position.set(j * 8 - 8, rng.range(-1, 1), rng.range(-3, 3));
      puff.scale.y = 0.45;
      cl.add(puff);
    }
    cl.position.set(rng.range(-300, 300), rng.range(70, 110), rng.range(-300, 300));
    scene.add(cl);
    clouds.push(cl);
  }

  return {
    colliders,
    roads,
    blocks,
    trees,
    boats,
    clouds,
    water,
    parkCenter: { x: blocks[parkBlock], z: blocks[parkBlock] },
    dockPos: { ...PLACES.docks },
    safehousePos: { ...PLACES.safehouse },
    spawnPos: { ...PLACES.spawn },
    half,
  };
}

// Height of the ground at (x, z): the pier deck is raised, the rest is 0.
export function groundHeightAt(x, z) {
  if (Math.abs(x - PLACES.docks.x) <= 5 && Math.abs(z - PLACES.docks.z) <= 26) return 0.5;
  return 0;
}

// Keep a circle (x, z, radius) out of every building/tree collider.
// Returns the position pushed out, or the original when already clear.
export function resolveCollisions(colliders, x, z, radius) {
  for (const c of colliders) {
    const cx = Math.max(c.minX, Math.min(x, c.maxX));
    const cz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - cx;
    const dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 < 1e-6) {
        // Dead centre: push out along the smallest penetration axis.
        const px = Math.min(x - c.minX, c.maxX - x);
        const pz = Math.min(z - c.minZ, c.maxZ - z);
        if (px < pz) x = x - c.minX < c.maxX - x ? c.minX - radius : c.maxX + radius;
        else z = z - c.minZ < c.maxZ - z ? c.minZ - radius : c.maxZ + radius;
      } else {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * radius;
        z = cz + (dz / d) * radius;
      }
    }
  }
  return { x, z };
}

// Clamp a position inside the playable area (city + beach).
export function clampPlayable(x, z) {
  const half = CFG.span / 2;
  return {
    x: Math.max(-half - 20, Math.min(half + 20, x)),
    z: Math.max(-half - CFG.beachDepth - 4, Math.min(half + 20, z)),
  };
}
