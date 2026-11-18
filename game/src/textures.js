// Solara Bay — procedural canvas textures. No image files ship with the
// game; every surface is painted at load time from a seed, so the game
// stays a handful of small source files and loads nothing over the network.
import * as THREE from 'three';
import { range, rangeInt } from './random.js';

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeBuildingTexture(rng, base) {
  const cols = rangeInt(rng, 4, 7);
  const rows = rangeInt(rng, 6, 12);
  return canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    // faint vertical shading so facades read as concrete, not flat colour
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.18)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    grad.addColorStop(1, 'rgba(0,0,0,0.22)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    const cw = w / cols;
    const ch = h / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const lit = rng() < 0.45;
        g.fillStyle = lit ? '#ffe9a8' : '#2c3e50';
        g.fillRect(x * cw + cw * 0.2, y * ch + ch * 0.22, cw * 0.6, ch * 0.56);
      }
    }
  });
}

export function makeRoadTexture() {
  return canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#3a3f46';
    g.fillRect(0, 0, w, h);
    // asphalt speckle
    for (let i = 0; i < 500; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    // centre dashes, drawn along both axes; the mesh repeats the texture
    g.fillStyle = '#f5d76e';
    g.fillRect(w / 2 - 2, 8, 4, 28);
    g.fillRect(w / 2 - 2, h - 36, 4, 28);
    g.fillRect(8, h / 2 - 2, 28, 4);
    g.fillRect(w - 36, h / 2 - 2, 28, 4);
  });
}

export function makeGrassTexture(rng) {
  return canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#58a447';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,60,0,0.10)';
      g.fillRect(rng() * w, rng() * h, 2, 3);
    }
  });
}

export function makeSandTexture(rng) {
  return canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#e6cf9a';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      g.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(120,90,40,0.10)';
      g.fillRect(rng() * w, rng() * h, 2, 2);
    }
  });
}

export function makeWaterTexture() {
  const tex = canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#2e7fa8';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.25)';
    g.lineWidth = 2;
    for (let y = 10; y < h; y += 22) {
      g.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const yy = y + Math.sin(x * 0.3 + y) * 3;
        if (x === 0) g.moveTo(x, yy);
        else g.lineTo(x, yy);
      }
      g.stroke();
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function makeTreeTexture() {
  return canvasTexture(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#3f8f3a';
    g.beginPath();
    g.arc(32, 26, 22, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#57a047';
    g.beginPath();
    g.arc(22, 20, 12, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(42, 20, 12, 0, Math.PI * 2);
    g.fill();
  });
}
