// Procedural canvas textures: ground, facades, billboards, neon signs.
import * as THREE from 'three';
import { CFG, NEON_SIGNS, BILLBOARDS } from './config.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

// World -> ground-canvas px. Ground plane: x[-130,130], z[-130,200], canvas 2048x2048.
const W2U = 2048 / 260, W2V = 2048 / 330;
const px = (x) => (x + 130) * W2U;
const py = (z) => (z + 130) * W2V;

export function makeGroundTexture(rng) {
  const [c, g] = canvas(2048, 2048);
  // base: sidewalk / block fill
  g.fillStyle = '#9aa0a3'; g.fillRect(0, 0, 2048, 2048);
  // blocks (slightly varied concrete)
  for (const bx of CFG.blockCenters) for (const bz of CFG.blockCenters) {
    if (Math.abs(bx) < 34 && Math.abs(bz) < 34) continue; // park
    const shade = 148 + Math.floor(rng.range(-8, 14));
    g.fillStyle = `rgb(${shade},${shade + 3},${shade + 6})`;
    g.fillRect(px(bx - 12), py(bz - 12), 24 * W2U, 24 * W2V);
  }
  // park
  g.fillStyle = '#4d8a4a'; g.fillRect(px(-30), py(-30), 60 * W2U, 60 * W2V);
  g.fillStyle = '#5da85a';
  g.beginPath(); g.ellipse(px(0), py(0), 18 * W2U, 12 * W2V, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3f7fb8'; // pond
  g.beginPath(); g.ellipse(px(8), py(8), 7 * W2U, 5 * W2V, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#c9b896'; g.lineWidth = 5; // park paths
  g.beginPath(); g.moveTo(px(-30), py(0)); g.lineTo(px(30), py(0)); g.stroke();
  g.beginPath(); g.moveTo(px(0), py(-30)); g.lineTo(px(0), py(30)); g.stroke();
  // beach sand
  g.fillStyle = '#d9c08a'; g.fillRect(px(-130), py(CFG.beachZ0), 260 * W2U, (200 - CFG.beachZ0) * W2V);
  g.fillStyle = '#cdb47e';
  for (let i = 0; i < 260; i++) {
    g.fillRect(px(rng.range(-130, 130)), py(rng.range(CFG.beachZ0, 200)), 3, 2);
  }
  // roads
  for (const r of CFG.roads) {
    g.fillStyle = '#33373b';
    g.fillRect(px(-130), py(r - CFG.roadHalf), 260 * W2U, 2 * CFG.roadHalf * W2V);
    g.fillRect(px(r - CFG.roadHalf), py(-130), 2 * CFG.roadHalf * W2U, 330 * W2V);
    // centre dashes
    g.fillStyle = '#e8d44d';
    for (let d = -126; d < 130; d += 8) {
      g.fillRect(px(d), py(r) - 2, 4 * W2U, 4);
      g.fillRect(px(r) - 2, py(d), 4, 4 * W2V);
    }
    // crosswalks at each intersection
    for (const r2 of CFG.roads) {
      g.fillStyle = '#e8e8e8';
      for (let k = -4; k <= 4; k += 2) {
        g.fillRect(px(r2 + k - 0.7), py(r - 6), 1.4 * W2U, 12 * W2V);
        g.fillRect(px(r - 6), py(r2 + k - 0.7), 12 * W2U, 1.4 * W2V);
      }
    }
  }
  // pier deck shadow line on sand
  g.fillStyle = '#8a6f4d';
  g.fillRect(px(CFG.pierX - 4), py(CFG.pierZ0), 8 * W2U, (CFG.pierZ1 - CFG.pierZ0) * W2V);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4; tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeFacade(rng, variant) {
  const [c, g] = canvas(256, 512);
  const [e, ge] = canvas(256, 512); // emissive: only lit windows
  const base = ['#7a6a63', '#5d6b7a', '#8a7a5d', '#6b5a6e', '#4f5d54', '#74604a'][variant % 6];
  g.fillStyle = base; g.fillRect(0, 0, 256, 512);
  ge.fillStyle = '#000000'; ge.fillRect(0, 0, 256, 512);
  // subtle vertical shading
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0.25)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.06)'); grad.addColorStop(1, 'rgba(0,0,0,0.25)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 512);
  const cols = 6 + (variant % 3), rows = 12;
  const cw = 256 / cols, ch = 512 / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = i * cw + cw * 0.2, y = j * ch + ch * 0.22, w = cw * 0.6, h = ch * 0.55;
    const lit = rng.chance(0.38);
    g.fillStyle = lit ? '#ffd98a' : '#20262e';
    g.fillRect(x, y, w, h);
    if (lit) { ge.fillStyle = '#ffca6a'; ge.fillRect(x, y, w, h); }
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1;
    g.strokeRect(x, y, w, h);
  }
  // ground-floor storefront
  g.fillStyle = '#1c1e24'; g.fillRect(0, 512 - 56, 256, 56);
  g.fillStyle = '#3a5a7a'; g.fillRect(12, 512 - 48, 232, 34);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  const emissive = new THREE.CanvasTexture(e); emissive.colorSpace = THREE.SRGBColorSpace;
  return { map, emissive };
}

export function makeBillboard(text, bg, fg) {
  const [c, g] = canvas(512, 256);
  g.fillStyle = bg; g.fillRect(0, 0, 512, 256);
  g.fillStyle = fg; g.font = 'bold 64px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 108);
  g.font = 'bold 28px Arial'; g.fillText('SOLARA BAY', 256, 196);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeNeon(text, color) {
  const [c, g] = canvas(512, 128);
  g.fillStyle = '#0c0c14'; g.fillRect(0, 0, 512, 128);
  g.font = 'bold 56px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 26;
  g.fillStyle = color; g.fillText(text, 256, 64);
  g.shadowBlur = 8; g.fillStyle = '#ffffff'; g.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function billboardTextures() {
  const bgs = ['#c23b2e', '#1c5d99', '#0f7a4d', '#7a1f8f'];
  const fgs = ['#ffffff', '#ffd94d', '#ffffff', '#7df9ff'];
  return BILLBOARDS.map((t, i) => makeBillboard(t, bgs[i % 4], fgs[i % 4]));
}

export function neonTextures() {
  const colors = ['#ff5da2', '#4dd7ff', '#ff9f1c', '#7dff6a', '#c77dff'];
  return NEON_SIGNS.map((t, i) => makeNeon(t, colors[i % 5]));
}
