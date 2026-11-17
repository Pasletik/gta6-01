// Solara Bay: a procedural coastal city. Roads on a grid, blocks of buildings, a park, a
// beach and the ocean to the south. Everything is built from boxes and canvas textures.
import * as THREE from 'three';
import { CITY, PALETTE } from './config.js';
import {
  makeBuildingTexture,
  makeGrassTexture,
  makeRoadTexture,
  makeSandTexture,
  makeSidewalkTexture,
  makeSignTexture,
} from './textures.js';

const BLOCK_INSET = 9; // road half (6) + sidewalk (3)

function box(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function lambert(color) {
  return new THREE.MeshLambertMaterial({ color });
}

export function createWorld(scene, rng) {
  const colliders = [];
  const palms = [];
  const roadTexture = makeRoadTexture();
  const sidewalkTexture = makeSidewalkTexture();

  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 220, 640);

  const sun = new THREE.DirectionalLight(PALETTE.sun, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -140;
  sun.shadow.camera.right = 140;
  sun.shadow.camera.top = 140;
  sun.shadow.camera.bottom = -140;
  sun.shadow.camera.far = 600;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);
  scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 1.0));

  // --- ground: grass base, sand strip, ocean ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshLambertMaterial({ map: makeGrassTexture() }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 40);
  ground.receiveShadow = true;
  scene.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 70),
    new THREE.MeshLambertMaterial({ map: makeSandTexture() }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.03, CITY.beachFrom + 32);
  sand.receiveShadow = true;
  scene.add(sand);

  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 400),
    new THREE.MeshPhongMaterial({ color: PALETTE.ocean, transparent: true, opacity: 0.92, shininess: 120 }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0.05, CITY.oceanFrom + 190);
  scene.add(ocean);
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 3),
    new THREE.MeshBasicMaterial({ color: 0xf2f8fa, transparent: true, opacity: 0.7 }),
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, 0.08, CITY.oceanFrom - 1);
  scene.add(foam);

  // --- roads and sidewalks ---
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTexture });
  const walkMat = new THREE.MeshLambertMaterial({ map: sidewalkTexture });
  for (const c of CITY.roads) {
    for (const vertical of [true, false]) {
      const length = CITY.half * 2;
      const road = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadWidth, length), roadMat.clone());
      road.material.map = roadTexture.clone();
      road.material.map.repeat.set(1, length / 16);
      road.material.map.needsUpdate = true;
      road.rotation.x = -Math.PI / 2;
      // PlaneGeometry(12, 480) laid flat already runs north-south; only the east-west
      // road needs the extra quarter turn. (The old code had this backwards, so every
      // road collapsed onto the two centre lines and the rest of the grid was grass.)
      if (!vertical) road.rotation.z = Math.PI / 2;
      road.position.set(vertical ? c : 0, 0.02, vertical ? 0 : c);
      road.receiveShadow = true;
      scene.add(road);
      // sidewalks on both sides
      for (const side of [-1, 1]) {
        const walk = new THREE.Mesh(new THREE.PlaneGeometry(3, length), walkMat.clone());
        walk.material.map = sidewalkTexture.clone();
        walk.material.map.repeat.set(1, length / 8);
        walk.material.map.needsUpdate = true;
        walk.rotation.x = -Math.PI / 2;
        if (!vertical) walk.rotation.z = Math.PI / 2;
        walk.position.set(vertical ? c + side * 7.5 : 0, 0.04, vertical ? 0 : c + side * 7.5);
        walk.receiveShadow = true;
        scene.add(walk);
      }
    }
  }

  // --- buildings ---
  const roofMat = lambert(0x5a5f66);
  const facadeMats = PALETTE.building.map((c) => makeBuildingTexture(rng, `#${c.toString(16).padStart(6, '0')}`));
  function addBuilding(x, z, w, d, h, facadeIndex) {
    const side = new THREE.MeshLambertMaterial({ map: facadeMats[facadeIndex % facadeMats.length] });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, roofMat, roofMat, side, side]);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    return mesh;
  }

  function addSign(x, y, z, ry, text, bg, fg, sub) {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 3.5),
      new THREE.MeshBasicMaterial({ map: makeSignTexture(text, bg, fg, sub) }),
    );
    sign.position.set(x, y, z);
    sign.rotation.y = ry;
    scene.add(sign);
    return sign;
  }

  function addPalm(x, z) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.45, 7, 6),
      lambert(0x8a6a4a),
    );
    trunk.position.y = 3.5;
    trunk.castShadow = true;
    group.add(trunk);
    const top = new THREE.Group();
    top.position.y = 7;
    for (let i = 0; i < 6; i += 1) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.9), new THREE.MeshLambertMaterial({ color: 0x3f8f4f, side: THREE.DoubleSide }));
      leaf.position.set(Math.cos((i / 6) * Math.PI * 2) * 1.4, 0.2, Math.sin((i / 6) * Math.PI * 2) * 1.4);
      leaf.rotation.y = -(i / 6) * Math.PI * 2;
      leaf.rotation.z = 0.5;
      top.add(leaf);
    }
    group.add(top);
    group.position.set(x, 0, z);
    scene.add(group);
    palms.push(top);
    colliders.push({ minX: x - 0.5, maxX: x + 0.5, minZ: z - 0.5, maxZ: z + 0.5 });
  }

  function addLamp(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6, 6), lambert(0x2c2f33));
    pole.position.set(x, 3, z);
    pole.castShadow = true;
    scene.add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
    head.position.set(x, 6.1, z);
    scene.add(head);
    colliders.push({ minX: x - 0.2, maxX: x + 0.2, minZ: z - 0.2, maxZ: z + 0.2 });
  }

  // Landmark blocks: garage (1,1), park (2,2), paint shop (3,1), motel (4,3).
  const landmarks = {};
  for (let i = 0; i < CITY.roads.length - 1; i += 1) {
    for (let j = 0; j < CITY.roads.length - 1; j += 1) {
      const cx = CITY.roads[i] + CITY.roadPitch / 2;
      const cz = CITY.roads[j] + CITY.roadPitch / 2;
      const key = `${i},${j}`;
      if (key === '1,1') {
        // Delgado Auto garage: low wide building + open lot.
        addBuilding(cx, cz, 26, 14, 7, 3);
        addSign(cx, 6.4, cz - 7.2, 0, 'DELGADO AUTO', '#20344d', '#ffd98a', 'Repairs • Tow • No Questions');
        landmarks.garage = { x: cx, z: cz - 12, label: "Delgado Auto" };
        continue;
      }
      if (key === '2,2') {
        // Central park: grass, paths, palms, benches.
        const lawn = new THREE.Mesh(
          new THREE.PlaneGeometry(40, 40),
          new THREE.MeshLambertMaterial({ map: makeGrassTexture() }),
        );
        lawn.rotation.x = -Math.PI / 2;
        lawn.position.set(cx, 0.06, cz);
        lawn.receiveShadow = true;
        scene.add(lawn);
        for (let k = 0; k < 7; k += 1) addPalm(cx + rng.range(-16, 16), cz + rng.range(-16, 16));
        const pond = new THREE.Mesh(
          new THREE.CircleGeometry(6, 24),
          new THREE.MeshPhongMaterial({ color: 0x4a90b8, shininess: 100 }),
        );
        pond.rotation.x = -Math.PI / 2;
        pond.position.set(cx + 8, 0.07, cz - 6);
        scene.add(pond);
        landmarks.park = { x: cx, z: cz, label: 'Solara Park' };
        continue;
      }
      if (key === '3,1') {
        addBuilding(cx, cz, 22, 12, 6, 4);
        addSign(cx, 5.6, cz - 6.2, 0, 'SOLARA PAINT', '#4d2030', '#ffd98a', 'New Coat • Clean Plates');
        landmarks.paintShop = { x: cx, z: cz - 11, label: 'Solara Paint & Body' };
        continue;
      }
      if (key === '4,3') {
        addBuilding(cx, cz, 24, 12, 9, 1);
        addSign(cx, 8.4, cz - 6.2, 0, 'SEAVIEW MOTEL', '#1d4d3a', '#ffe9a8', 'Vacancy • Pool • HBO');
        landmarks.motel = { x: cx, z: cz - 11, label: 'Seaview Motel' };
        continue;
      }
      // Ordinary block: 2-4 buildings.
      const count = rng.int(2, 4);
      for (let b = 0; b < count; b += 1) {
        const bx = cx + rng.range(-13, 13);
        const bz = cz + rng.range(-13, 13);
        const bw = rng.range(9, 16);
        const bd = rng.range(9, 16);
        const bh = rng.chance(0.7) ? rng.range(9, 22) : rng.range(24, 42);
        addBuilding(bx, bz, bw, bd, bh, rng.int(0, 5));
      }
    }
  }

  // Docks: pier into the ocean + crates and containers on the beach. The pier is a low
  // walkable platform (1 m high), so it is deliberately NOT a collider: the package
  // marker for mission 2 sits on it and the player must be able to walk onto it. Cars
  // are kept off it by clampCar instead.
  const pier = box(10, 1, 46, lambert(0x7a5c3e));
  pier.position.set(-30, 0.5, CITY.oceanFrom + 20);
  scene.add(pier);
  for (let i = 0; i < 6; i += 1) {
    const crate = box(rng.range(1.5, 2.5), rng.range(1.5, 2.5), rng.range(1.5, 2.5), lambert(rng.pick([0x8a6a3a, 0x5a7a8a, 0x9a5a3a])));
    crate.position.set(-52 + rng.range(-6, 6), 1.2, 196 + rng.range(-4, 8));
    crate.rotation.y = rng.range(0, Math.PI);
    scene.add(crate);
    colliders.push({
      minX: crate.position.x - 1.2, maxX: crate.position.x + 1.2,
      minZ: crate.position.z - 1.2, maxZ: crate.position.z + 1.2,
    });
  }
  landmarks.docks = { x: -30, z: 196, label: 'Solara Docks' };

  // Palms along the beach and lamps along roads.
  for (let x = -170; x <= 170; x += 34) addPalm(x + rng.range(-6, 6), 200 + rng.range(-4, 4));
  for (const c of CITY.roads) {
    for (const z of [-150, -30, 90]) addLamp(c + 7.5, z);
    for (const x of [-150, -30, 90]) addLamp(x, c + 7.5);
  }

  function isOnRoad(x, z) {
    for (const c of CITY.roads) {
      if (Math.abs(x - c) < CITY.roadWidth / 2 + 0.5) return true;
      if (Math.abs(z - c) < CITY.roadWidth / 2 + 0.5) return true;
    }
    return false;
  }

  /** Push a circle (pos, radius) out of every building collider it overlaps. */
  function collideCircle(pos, radius) {
    for (const c of colliders) {
      const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
      const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
      const dx = pos.x - nx;
      const dz = pos.z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        pos.x = nx + (dx / d) * radius;
        pos.z = nz + (dz / d) * radius;
      } else if (d2 <= 0.0001) {
        pos.x = c.maxX + radius;
      }
    }
  }

  function randomRoadPoint() {
    const vertical = rng.chance(0.5);
    const road = rng.pick(CITY.roads);
    const along = rng.range(-170, 170);
    return vertical ? { x: road, z: along } : { x: along, z: road };
  }

  function update(dt, time, focus) {
    // Sun and its shadow box follow the player.
    sun.position.set(focus.x + 120, 190, focus.z + 70);
    sun.target.position.set(focus.x, 0, focus.z);
    for (let i = 0; i < palms.length; i += 1) {
      palms[i].rotation.z = Math.sin(time * 0.9 + i) * 0.06;
    }
    ocean.position.y = 0.05 + Math.sin(time * 0.5) * 0.15;
  }

  /** Cars may not drive into the ocean or off the map edge; the pier is for feet, not wheels. */
  function clampCar(pos, radius) {
    if (pos.z > 232 - radius) pos.z = 232 - radius;
    if (pos.z < -238 + radius) pos.z = -238 + radius;
    if (pos.x > 238 - radius) pos.x = 238 - radius;
    if (pos.x < -238 + radius) pos.x = -238 + radius;
  }

  return { colliders, landmarks, isOnRoad, collideCircle, clampCar, randomRoadPoint, update };
}
