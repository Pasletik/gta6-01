// Solara Bay — the city itself. A 7x7 road grid with buildings, a central
// park, a beach and ocean to the south, and a docks pier to the south-east.
// Everything is built from the seed, so the same seed always makes the
// same city. Also owns collision: every building is an axis-aligned box
// the player and cars slide around.

import * as THREE from 'three';
import { CFG, PALETTE } from './config.js';
import { pick, range, rangeInt } from './random.js';
import { makeBuildingTexture, makeGrassTexture, makeRoadTexture, makeSandTexture, makeWaterTexture } from './textures.js';

const ROAD_XS = [-144, -96, -48, 0, 48, 96, 144];

export function buildWorld(scene, rng) {
  const colliders = [];
  const waterMats = [];

  // --- ground base -------------------------------------------------------
  const base = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshLambertMaterial({ color: 0x8a8f85 }),
  );
  base.rotation.x = -Math.PI / 2;
  base.position.y = -0.05;
  base.receiveShadow = true;
  scene.add(base);

  // --- roads -------------------------------------------------------------
  const roadTex = makeRoadTexture();
  roadTex.wrapS = THREE.RepeatWrapping;
  roadTex.wrapT = THREE.RepeatWrapping;
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTex });
  for (const x of ROAD_XS) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(12, 336), roadMat.clone());
    v.material.map = roadTex.clone();
    v.material.map.repeat.set(1, 7);
    v.material.map.needsUpdate = true;
    v.rotation.x = -Math.PI / 2;
    v.position.set(x, 0, 0);
    v.receiveShadow = true;
    scene.add(v);
    const hz = new THREE.Mesh(new THREE.PlaneGeometry(336, 12), roadMat.clone());
    hz.material.map = roadTex.clone();
    hz.material.map.repeat.set(7, 1);
    hz.material.map.needsUpdate = true;
    hz.rotation.x = -Math.PI / 2;
    hz.position.set(0, 0.01, x);
    hz.receiveShadow = true;
    scene.add(hz);
  }

  // --- city blocks: buildings, except the central park -------------------
  const parkRect = { minX: -48, maxX: 48, minZ: -48, maxZ: 48 };
  const blockCenters = [];
  for (let i = -3; i < 3; i++) {
    for (let j = -3; j < 3; j++) {
      blockCenters.push([i * 48 + 24, j * 48 + 24]);
    }
  }
  const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
  buildingGeo.translate(0, 0.5, 0);
  let buildingCount = 0;
  for (const [bx, bz] of blockCenters) {
    const inPark = bx > parkRect.minX - 24 && bx < parkRect.maxX + 24 && bz > parkRect.minZ - 24 && bz < parkRect.maxZ + 24;
    if (inPark) continue;
    const n = rangeInt(rng, 2, 4);
    for (let k = 0; k < n; k++) {
      const w = range(rng, 10, 15);
      const d = range(rng, 10, 15);
      const h = range(rng, 8, 38);
      const ox = range(rng, -8, 8);
      const oz = range(rng, -8, 8);
      const x = bx + ox;
      const z = bz + oz;
      const mat = new THREE.MeshLambertMaterial({
        map: makeBuildingTexture(rng, pick(rng, PALETTE.building)),
      });
      const b = new THREE.Mesh(buildingGeo, mat);
      b.scale.set(w, h, d);
      b.position.set(x, 0, z);
      b.castShadow = true;
      b.receiveShadow = true;
      scene.add(b);
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      buildingCount++;
      // rooftop box so towers read at a glance
      if (h > 24) {
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(3, 2.5, 3),
          new THREE.MeshLambertMaterial({ color: 0x6b7280 }),
        );
        roof.position.set(x + w * 0.2, h, z - d * 0.2);
        roof.castShadow = true;
        scene.add(roof);
      }
    }
  }

  // --- central park ------------------------------------------------------
  const grassTex = makeGrassTexture(rng);
  grassTex.wrapS = THREE.RepeatWrapping;
  grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(4, 4);
  const park = new THREE.Mesh(
    new THREE.PlaneGeometry(96, 96),
    new THREE.MeshLambertMaterial({ map: grassTex }),
  );
  park.rotation.x = -Math.PI / 2;
  park.position.set(0, 0.02, 0);
  park.receiveShadow = true;
  scene.add(park);
  // park paths: pale cross
  const pathMat = new THREE.MeshLambertMaterial({ color: 0xd9c9a8 });
  for (const [w, d, x, z] of [[96, 5, 0, 0], [5, 96, 0, 0]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), pathMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, 0.03, z);
    p.receiveShadow = true;
    scene.add(p);
  }
  // trees: trunk + two green spheres, deterministic spots
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f8f3a });
  const leafMat2 = new THREE.MeshLambertMaterial({ color: 0x57a047 });
  for (let i = 0; i < 26; i++) {
    const x = range(rng, -44, 44);
    const z = range(rng, -44, 44);
    if (Math.abs(x) < 6 || Math.abs(z) < 6) continue; // keep paths clear
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 3, 6), trunkMat);
    trunk.position.set(x, 1.5, z);
    trunk.castShadow = true;
    scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(range(rng, 2.2, 3.4), 8, 6), rng() < 0.5 ? leafMat : leafMat2);
    crown.position.set(x, 4.6, z);
    crown.castShadow = true;
    scene.add(crown);
    colliders.push({ minX: x - 0.6, maxX: x + 0.6, minZ: z - 0.6, maxZ: z + 0.6 });
  }
  // the big oak at the park centre (mission 2 pickup spot)
  const oak = new THREE.Mesh(new THREE.SphereGeometry(5, 10, 8), leafMat);
  oak.position.set(0, 6.5, 0);
  oak.castShadow = true;
  scene.add(oak);
  const oakTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 5, 8), trunkMat);
  oakTrunk.position.set(0, 2.5, 0);
  oakTrunk.castShadow = true;
  scene.add(oakTrunk);
  colliders.push({ minX: -1.2, maxX: 1.2, minZ: -1.2, maxZ: 1.2 });

  // --- beach + ocean -----------------------------------------------------
  const sandTex = makeSandTexture(rng);
  sandTex.wrapS = THREE.RepeatWrapping;
  sandTex.wrapT = THREE.RepeatWrapping;
  sandTex.repeat.set(10, 1);
  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(336, 20),
    new THREE.MeshLambertMaterial({ map: sandTex }),
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(-6, 0.02, 159);
  beach.receiveShadow = true;
  scene.add(beach);
  const waterTex = makeWaterTexture();
  waterTex.repeat.set(14, 14);
  const waterMat = new THREE.MeshLambertMaterial({ map: waterTex });
  waterMats.push(waterMat);
  const oceanS = new THREE.Mesh(new THREE.PlaneGeometry(560, 220), waterMat);
  oceanS.rotation.x = -Math.PI / 2;
  oceanS.position.set(0, CFG.oceanY, 278);
  scene.add(oceanS);
  const oceanE = new THREE.Mesh(new THREE.PlaneGeometry(220, 560), waterMat);
  oceanE.rotation.x = -Math.PI / 2;
  oceanE.position.set(278, CFG.oceanY, 0);
  scene.add(oceanE);
  // a few beach umbrellas for colour
  const umbCols = [0xe2553a, 0xf2c200, 0x2e7fa8, 0xe2553a];
  for (let i = 0; i < 5; i++) {
    const x = -140 + i * 62 + range(rng, -8, 8);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 6), new THREE.MeshLambertMaterial({ color: 0xdddddd }));
    pole.position.set(x, 1.3, 158);
    scene.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.1, 8), new THREE.MeshLambertMaterial({ color: umbCols[i % umbCols.length] }));
    top.position.set(x, 2.9, 158);
    top.castShadow = true;
    scene.add(top);
  }

  // --- docks pier --------------------------------------------------------
  const pierRect = { minX: CFG.pierX - 12, maxX: CFG.pierX + 12, minZ: CFG.pierZ0, maxZ: CFG.pierZ1 };
  const pierMat = new THREE.MeshLambertMaterial({ color: PALETTE.pier });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(24, 1, CFG.pierZ1 - CFG.pierZ0), pierMat);
  pier.position.set(CFG.pierX, 0, (CFG.pierZ0 + CFG.pierZ1) / 2);
  pier.receiveShadow = true;
  pier.castShadow = true;
  scene.add(pier);
  // pier posts
  const postMat = new THREE.MeshLambertMaterial({ color: 0x5d4630 });
  for (let z = CFG.pierZ0 + 4; z <= CFG.pierZ1; z += 10) {
    for (const x of [CFG.pierX - 11, CFG.pierX + 11]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.4, 6), postMat);
      post.position.set(x, 0.6, z);
      scene.add(post);
    }
  }
  // crates on the pier
  const crateMat = new THREE.MeshLambertMaterial({ color: 0xa8763e });
  for (let i = 0; i < 6; i++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), crateMat);
    crate.position.set(CFG.pierX + range(rng, -7, 7), 1.7, CFG.pierZ0 + 8 + i * 6);
    crate.rotation.y = range(rng, 0, Math.PI);
    crate.castShadow = true;
    scene.add(crate);
    colliders.push({ minX: crate.position.x - 1.3, maxX: crate.position.x + 1.3, minZ: crate.position.z - 1.3, maxZ: crate.position.z + 1.3 });
  }

  // --- street lamps along the main roads ---------------------------------
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x30343a });
  const lampHeadMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0x554411 });
  for (const x of ROAD_XS) {
    for (const z of [-120, -24, 72]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6, 6), lampMat);
      pole.position.set(x + 7, 3, z);
      scene.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), lampHeadMat);
      head.position.set(x + 7, 6.2, z);
      scene.add(head);
    }
  }

  return {
    colliders,
    roadXs: ROAD_XS,
    parkRect,
    pierRect,
    waterMats,
    buildingCount,
    groundHeightAt(x, z) {
      if (x >= pierRect.minX && x <= pierRect.maxX && z >= pierRect.minZ && z <= pierRect.maxZ) return 0.5;
      if (z > 168) return CFG.oceanY;
      if (z > 150) return -0.4;
      return 0;
    },
    clampToWorld(p, radius) {
      const onPier = p.x >= pierRect.minX && p.x <= pierRect.maxX && p.z >= pierRect.minZ - 2 && p.z <= pierRect.maxZ;
      const maxX = onPier ? pierRect.maxX - radius : CFG.cityHalf - radius;
      const maxZ = onPier ? pierRect.maxZ - radius : CFG.cityHalf - radius;
      p.x = Math.max(-CFG.cityHalf + radius, Math.min(maxX, p.x));
      p.z = Math.max(-CFG.cityHalf + radius, Math.min(maxZ, p.z));
      // keep the player out of the ocean strip unless on the pier
      if (!onPier && p.z > 150) p.z = 150;
      if (!onPier && p.x > 168) p.x = 168;
      return p;
    },
  };
}

// Circle (x,z,r) against the building AABBs. Returns the push-out vector or null.
export function collideCircle(x, z, r, colliders) {
  let pushX = 0;
  let pushZ = 0;
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - nx;
    const dz = z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = r - d;
        pushX += (dx / d) * push;
        pushZ += (dz / d) * push;
      } else {
        // centre inside the box: push out along the smallest penetration axis
        const pl = x - c.minX;
        const pr = c.maxX - x;
        const pt = z - c.minZ;
        const pb = c.maxZ - z;
        const m = Math.min(pl, pr, pt, pb);
        if (m === pl) pushX -= pl + r;
        else if (m === pr) pushX += pr + r;
        else if (m === pt) pushZ -= pt + r;
        else pushZ += pb + r;
      }
    }
  }
  if (pushX === 0 && pushZ === 0) return null;
  return { x: pushX, z: pushZ };
}

// Nearest road line (x or z) to a point — traffic and spawns use this.
export function nearestRoadCoord(v) {
  let best = ROAD_XS[0];
  let bd = Infinity;
  for (const x of ROAD_XS) {
    const d = Math.abs(v - x);
    if (d < bd) {
      bd = d;
      best = x;
    }
  }
  return best;
}
