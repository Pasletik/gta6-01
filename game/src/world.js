// Solara Bay world: city grid, park, beach, ocean, pier, sky, lights.
import * as THREE from 'three';
import { CFG, PRESETS } from './config.js';
import { makeGroundTexture, makeFacade, billboardTextures, neonTextures } from './textures.js';

function skyTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 8, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,240,200,0.85)');
  grad.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function cloudTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  for (const [x, y, r] of [[70, 70, 42], [130, 62, 52], [190, 74, 40], [110, 84, 46]]) {
    const grad = g.createRadialGradient(x, y, 4, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.85)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class World {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.colliders = [];
    this.neonMats = [];
    this.windowMats = [];
    this.lampMats = [];
    this.preset = PRESETS.golden;
    this.time = 0;

    // --- ground ---
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(260, 330),
      new THREE.MeshStandardMaterial({ map: makeGroundTexture(rng), roughness: 0.95, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 35);
    ground.receiveShadow = true;
    scene.add(ground);

    // --- sky dome (gradient + sun glow) ---
    this.skyU = {
      topColor: { value: new THREE.Color(0x2e4a7a) },
      midColor: { value: new THREE.Color(0xff9e5e) },
      botColor: { value: new THREE.Color(0xffc98a) },
      sunDir: { value: new THREE.Vector3(-0.7, 0.35, -0.2).normalize() },
      sunColor: { value: new THREE.Color(0xffd9a0) },
    };
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: this.skyU,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vDir; uniform vec3 topColor, midColor, botColor, sunColor; uniform vec3 sunDir;
        void main(){
          float h = clamp(vDir.y, -0.08, 1.0);
          vec3 col = h > 0.45 ? mix(midColor, topColor, smoothstep(0.45, 0.9, h)) : mix(botColor, midColor, smoothstep(-0.08, 0.45, h));
          float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
          col += sunColor * (pow(s, 220.0) * 1.4 + pow(s, 18.0) * 0.35);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(780, 24, 16), skyMat);
    scene.add(sky);

    // sun sprite + clouds
    this.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: skyTexture(), transparent: true, depthWrite: false, fog: false }));
    this.sunSprite.scale.set(220, 220, 1);
    scene.add(this.sunSprite);
    const ct = cloudTexture();
    this.clouds = [];
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, transparent: true, opacity: 0.75, depthWrite: false, fog: false }));
      s.position.set(rng.range(-380, 380), rng.range(120, 220), rng.range(-320, 320));
      s.scale.set(rng.range(140, 260), rng.range(50, 90), 1);
      s.userData.speed = rng.range(1.5, 4);
      scene.add(s); this.clouds.push(s);
    }

    // --- lights ---
    this.sun = new THREE.DirectionalLight(0xffb36b, 2.6);
    this.sun.position.set(-140, 70, -40);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -130; this.sun.shadow.camera.right = 130;
    this.sun.shadow.camera.top = 130; this.sun.shadow.camera.bottom = -130;
    this.sun.shadow.camera.near = 10; this.sun.shadow.camera.far = 500;
    this.sun.shadow.bias = -0.0006;
    scene.add(this.sun); scene.add(this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xffd9a8, 0x5a4a52, 0.55);
    scene.add(this.hemi);
    this.fill = new THREE.DirectionalLight(0x8fa3c7, 0.5); // shadowless cool fill
    this.fill.position.set(90, 120, 120);
    scene.add(this.fill);

    // --- buildings ---
    const facades = [];
    for (let v = 0; v < 6; v++) facades.push(makeFacade(rng, v));
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 1 });
    const billTex = billboardTextures();
    const neonTex = neonTextures();
    let bi = 0, ni = 0;
    for (const bx of CFG.blockCenters) for (const bz of CFG.blockCenters) {
      if (Math.abs(bx) < 34 && Math.abs(bz) < 34) continue; // park
      const w = 15 + rng.range(0, 7), d = 15 + rng.range(0, 7);
      const dist = Math.hypot(bx, bz);
      const h = 9 + rng.range(0, 26) + (1 - dist / 140) * 14;
      const f = facades[Math.floor(rng.next() * 6)];
      const geo = new THREE.BoxGeometry(w, h, d);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * (h / 22));
      const sideMat = new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.emissive, emissive: 0xffffff, emissiveIntensity: 0.7, roughness: 0.85 });
      this.windowMats.push(sideMat);
      const tower = new THREE.Mesh(geo, [sideMat, sideMat, roofMat, roofMat, sideMat, sideMat]);
      const jx = rng.range(-1.5, 1.5), jz = rng.range(-1.5, 1.5);
      tower.position.set(bx + jx, h / 2, bz + jz);
      tower.castShadow = true; tower.receiveShadow = true;
      scene.add(tower);
      this.colliders.push({ x0: bx + jx - w / 2 - 0.3, z0: bz + jz - d / 2 - 0.3, x1: bx + jx + w / 2 + 0.3, z1: bz + jz + d / 2 + 0.3 });
      // rooftop props
      if (rng.chance(0.7)) {
        const ac = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 2.2), roofMat);
        ac.position.set(bx + jx + rng.range(-4, 4), h + 0.55, bz + jz + rng.range(-4, 4));
        ac.castShadow = true; scene.add(ac);
      }
      if (rng.chance(0.5)) {
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), roofMat);
        ant.position.set(bx + jx + rng.range(-5, 5), h + 3, bz + jz + rng.range(-5, 5));
        scene.add(ant);
      }
      // billboard on a tall face
      if (h > 24 && bi < 4) {
        const b = new THREE.Mesh(
          new THREE.PlaneGeometry(13, 6.5),
          new THREE.MeshStandardMaterial({ map: billTex[bi], emissiveMap: billTex[bi], emissive: 0xffffff, emissiveIntensity: 0.25, roughness: 0.6 })
        );
        b.position.set(bx + jx, h - 5, bz + jz + d / 2 + 0.15);
        scene.add(b); bi++;
      }
      // neon sign on a street face
      if (ni < 5) {
        const n = new THREE.Mesh(
          new THREE.PlaneGeometry(9, 2.2),
          new THREE.MeshStandardMaterial({ map: neonTex[ni], emissiveMap: neonTex[ni], emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.4 })
        );
        n.position.set(bx + jx, 7, bz + jz - d / 2 - 0.15);
        n.rotation.y = Math.PI;
        scene.add(n); this.neonMats.push(n.material); ni++;
      }
    }

    // --- park: trees, benches, pond, kiosk ---
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f7d3a, roughness: 1 });
    const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x5a9a44, roughness: 1 });
    for (let i = 0; i < 26; i++) {
      const x = rng.range(-28, 28), z = rng.range(-28, 28);
      if (Math.hypot(x - 8, z - 8) < 8) continue; // keep pond clear
      if (Math.abs(x) < 4 || Math.abs(z) < 4) continue; // keep paths clear
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 3.2, 7), trunkMat);
      trunk.position.y = 1.6; trunk.castShadow = true; t.add(trunk);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 0), rng.chance(0.5) ? leafMat : leafMat2);
      crown.position.y = 4.4; crown.scale.y = 0.85; crown.castShadow = true; t.add(crown);
      t.position.set(x, 0, z);
      scene.add(t);
    }
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 1 });
    for (const [x, z, ry] of [[-14, -8, 0], [14, 10, Math.PI], [-8, 16, Math.PI / 2], [18, -14, -Math.PI / 2]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.8), benchMat);
      b.position.set(x, 0.45, z); b.rotation.y = ry; b.castShadow = true; scene.add(b);
    }
    const kiosk = new THREE.Group();
    const kb = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 3), new THREE.MeshStandardMaterial({ color: 0xd8cfc0, roughness: 0.9 }));
    kb.position.y = 1.5; kb.castShadow = true; kiosk.add(kb);
    const aw = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.25, 3.6), new THREE.MeshStandardMaterial({ color: 0xc23b2e, roughness: 0.8 }));
    aw.position.y = 3.1; kiosk.add(aw);
    kiosk.position.set(-10, 0, -20);
    scene.add(kiosk);
    this.colliders.push({ x0: -12.3, z0: -21.8, x1: -7.7, z1: -18.2 });

    // --- beach: palms, umbrellas, beach house ---
    const palm = (x, z) => {
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 5.5, 7), trunkMat);
      trunk.position.y = 2.75; trunk.rotation.z = 0.12; trunk.castShadow = true; t.add(trunk);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4, 0), leafMat2);
      crown.position.set(0.7, 5.8, 0); crown.scale.set(1.3, 0.55, 1.3); crown.castShadow = true; t.add(crown);
      t.position.set(x, 0, z); scene.add(t);
    };
    for (let x = -120; x <= 120; x += 14) { if (Math.abs(x - CFG.pierX) < 10) continue; palm(x + rng.range(-2, 2), 124 + rng.range(-1, 2)); }
    for (const [x, z, col] of [[-30, 126, 0xe76f51], [20, 125, 0x2a9d8f], [90, 127, 0xf4d35e]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), trunkMat);
      pole.position.set(x, 1.2, z); scene.add(pole);
      const top = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.0, 8), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 }));
      top.position.set(x, 2.8, z); top.castShadow = true; scene.add(top);
    }
    const house = new THREE.Group();
    const hb = new THREE.Mesh(new THREE.BoxGeometry(7, 3.4, 6), new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.9 }));
    hb.position.y = 1.7; hb.castShadow = true; house.add(hb);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.4, 2.2, 4), new THREE.MeshStandardMaterial({ color: 0xa34d2d, roughness: 0.9 }));
    roof.position.y = 4.5; roof.rotation.y = Math.PI / 4; roof.castShadow = true; house.add(roof);
    house.position.set(-85, 0, 108);
    scene.add(house);
    this.colliders.push({ x0: -88.8, z0: 104.7, x1: -81.2, z1: 111.3 });

    // --- pier: deck, posts, lamps, shack ---
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x8a6f4d, roughness: 1 });
    for (let z = CFG.pierZ0; z < CFG.pierZ1; z += 9) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(8, 0.24, 9.4), deckMat);
      d.position.set(CFG.pierX, 0, z + 4.5); d.receiveShadow = true; scene.add(d);
    }
    const postMat = new THREE.MeshStandardMaterial({ color: 0x5d4630, roughness: 1 });
    for (let z = CFG.pierZ0 + 3; z < CFG.pierZ1; z += 6) {
      for (const dx of [-3.6, 3.6]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 2.4, 7), postMat);
        p.position.set(CFG.pierX + dx, -0.6, z); scene.add(p);
      }
    }
    const lampGlow = new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffdf8a, emissiveIntensity: 1.2 });
    this.lampMats.push(lampGlow);
    for (let z = CFG.pierZ0 + 8; z < CFG.pierZ1 - 4; z += 14) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 4.4, 6), postMat);
      pole.position.set(CFG.pierX - 3.4, 2.2, z); scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), lampGlow);
      lamp.position.set(CFG.pierX - 3.4, 4.5, z); scene.add(lamp);
    }
    const shack = new THREE.Group();
    const sb = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 4), new THREE.MeshStandardMaterial({ color: 0x7a8a99, roughness: 0.9 }));
    sb.position.y = 1.5; sb.castShadow = true; shack.add(sb);
    const sr = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.3, 4.6), new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 1 }));
    sr.position.y = 3.1; shack.add(sr);
    shack.position.set(CFG.pierX + 1, 0, CFG.pierZ1 - 4);
    scene.add(shack);
    this.colliders.push({ x0: CFG.pierX - 1.8, z0: CFG.pierZ1 - 6.3, x1: CFG.pierX + 3.8, z1: CFG.pierZ1 - 1.7 });

    // --- ocean (animated) + foam ---
    const og = new THREE.PlaneGeometry(300, 140, 48, 24);
    og.rotateX(-Math.PI / 2);
    this.oceanBase = og.attributes.position.array.slice();
    this.ocean = new THREE.Mesh(og, new THREE.MeshStandardMaterial({
      color: 0x1a6f9e, transparent: true, opacity: 0.92, roughness: 0.25, metalness: 0.1,
      emissive: 0x0a2a44, emissiveIntensity: 0.35,
    }));
    this.ocean.position.set(0, 0.12, 132 + 70);
    scene.add(this.ocean);
    this.foam = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 7),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false })
    );
    this.foam.rotation.x = -Math.PI / 2;
    this.foam.position.set(0, 0.2, 130.5);
    scene.add(this.foam);

    // --- streetlights + traffic lights ---
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.7, metalness: 0.4 });
    const headGlow = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffdf8a, emissiveIntensity: 0.7 });
    this.lampMats.push(headGlow);
    for (const rx of CFG.roads) for (const rz of CFG.roads) {
      if ((Math.abs(rx) + Math.abs(rz)) % 68 !== 0) continue;
      if (Math.abs(rx) < 34 && Math.abs(rz) < 34) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 7), poleMat);
      pole.position.set(rx + 6, 3.5, rz + 6); scene.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 0.14), poleMat);
      arm.position.set(rx + 5, 6.9, rz + 6); scene.add(arm);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.4), headGlow);
      head.position.set(rx + 3.9, 6.85, rz + 6); scene.add(head);
    }
    const tlGreen = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x2aff5a, emissiveIntensity: 1.4 });
    for (const [x, z] of [[6, 6], [-6, -6], [40, -28], [-40, 40]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 5.4, 6), poleMat);
      pole.position.set(x, 2.7, z); scene.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.3, 0.4), new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.6 }));
      head.position.set(x, 5.2, z); scene.add(head);
      const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), tlGreen);
      lamp.position.set(x, 4.85, z + 0.21); scene.add(lamp);
    }

    this.applyPreset('golden');
  }

  applyPreset(name) {
    const p = PRESETS[name] || PRESETS.golden;
    this.preset = p;
    this.sun.color.setHex(p.sunColor);
    this.sun.intensity = p.sunIntensity;
    const d = new THREE.Vector3(...p.sunPos).normalize();
    this.sun.position.copy(d.clone().multiplyScalar(180));
    this.sun.target.position.set(0, 0, 0);
    this.hemi.color.setHex(p.hemiSky); this.hemi.groundColor.setHex(p.hemiGround);
    this.hemi.intensity = p.hemiIntensity;
    this.fill.color.setHex(p.fillColor); this.fill.intensity = p.fillIntensity;
    this.skyU.topColor.value.setHex(p.skyTop);
    this.skyU.midColor.value.setHex(p.skyMid);
    this.skyU.botColor.value.setHex(p.skyBot);
    this.skyU.sunDir.value.copy(d);
    this.skyU.sunColor.value.setHex(p.sunColor);
    this.sunSprite.position.copy(d.clone().multiplyScalar(680));
    this.sunSprite.material.color.setHex(p.sunColor);
    this.scene.fog = new THREE.Fog(p.fogColor, p.fogNear, p.fogFar);
    this.scene.background = new THREE.Color(p.fogColor);
    if (this.renderer) this.renderer.toneMappingExposure = p.exposure;
    for (const m of this.neonMats) m.emissiveIntensity = p.neon;
    for (const m of this.windowMats) m.emissiveIntensity = p.windows;
    for (const m of this.lampMats) m.emissiveIntensity = p.neon > 1 ? 1.6 : 0.7;
    this.ocean.material.emissiveIntensity = 0.25 + p.windows * 0.25;
  }

  attachRenderer(renderer) { this.renderer = renderer; this.applyPreset('golden'); }

  update(dt, t) {
    this.time = t;
    // ocean waves (CPU)
    const pos = this.ocean.geometry.attributes.position;
    const base = this.oceanBase;
    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3], bz = base[i * 3 + 2];
      pos.array[i * 3 + 1] = Math.sin(bx * 0.11 + t * 1.15) * 0.32 + Math.cos(bz * 0.16 + t * 0.85) * 0.28;
    }
    pos.needsUpdate = true;
    this.ocean.geometry.computeVertexNormals();
    this.foam.material.opacity = 0.3 + 0.14 * Math.sin(t * 1.6);
    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 420) c.position.x = -420;
    }
    const pulse = 0.92 + 0.12 * Math.sin(t * 2.2);
    for (const m of this.neonMats) m.emissiveIntensity = this.preset.neon * pulse;
  }

  collideCircle(x, z, r) {
    // world bounds
    x = Math.max(-CFG.worldX + r, Math.min(CFG.worldX - r, x));
    z = Math.max(CFG.worldZMin + r, Math.min(CFG.worldZMax - r, z));
    // ocean: blocked except on the pier deck
    const onPier = Math.abs(x - CFG.pierX) < 4.2 && z >= CFG.pierZ0 - 1 && z <= CFG.pierZ1;
    if (z > CFG.oceanZ0 - 1 && !onPier) z = CFG.oceanZ0 - 1;
    // building AABBs
    for (const b of this.colliders) {
      const cx = Math.max(b.x0, Math.min(x, b.x1));
      const cz = Math.max(b.z0, Math.min(z, b.z1));
      const dx = x - cx, dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          x = cx + (dx / d) * r; z = cz + (dz / d) * r;
        } else {
          // inside: push out along the smallest penetration axis
          const pl = x - b.x0, pr = b.x1 - x, pt = z - b.z0, pb = b.z1 - z;
          const m = Math.min(pl, pr, pt, pb);
          if (m === pl) x = b.x0 - r; else if (m === pr) x = b.x1 + r;
          else if (m === pt) z = b.z0 - r; else z = b.z1 + r;
        }
      }
    }
    return [x, z];
  }

  isOnPier(x, z) {
    return Math.abs(x - CFG.pierX) < 4.2 && z >= CFG.pierZ0 && z <= CFG.pierZ1;
  }
}
