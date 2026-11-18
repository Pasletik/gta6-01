// Solara Bay — procedural textures. One job: paint every surface of the city
// from canvas, so the game ships zero image files and zero network requests.

import * as THREE from 'three';

// Draw on a canvas and return a repeating THREE texture.
function canvasTexture(size, draw, repeatX = 1, repeatY = 1) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Dark asphalt with a dashed centre line and worn edges.
export function roadTexture() {
  return canvasTexture(256, (g, s) => {
    g.fillStyle = '#33363b';
    g.fillRect(0, 0, s, s);
    // Speckle.
    for (let i = 0; i < 900; i++) {
      g.fillStyle = Math.random() < 0.5 ? '#3a3d42' : '#2c2f33';
      g.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
    // Centre dashes (vertical in texture space).
    g.fillStyle = '#e8d44d';
    for (let y = 0; y < s; y += 64) g.fillRect(s / 2 - 3, y + 8, 6, 32);
    // Edge lines.
    g.fillStyle = '#d8d8d8';
    g.fillRect(6, 0, 4, s);
    g.fillRect(s - 10, 0, 4, s);
  });
}

// Sidewalk: pale concrete slabs with seams.
export function sidewalkTexture() {
  return canvasTexture(256, (g, s) => {
    g.fillStyle = '#9a9a94';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#7e7e78';
    g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo((i * s) / 4, 0); g.lineTo((i * s) / 4, s); g.stroke();
      g.beginPath(); g.moveTo(0, (i * s) / 4); g.lineTo(s, (i * s) / 4); g.stroke();
    }
    for (let i = 0; i < 500; i++) {
      g.fillStyle = '#8a8a84';
      g.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
  });
}

// Building facade: warm plaster with a grid of lit and dark windows.
export function facadeTexture(base, litRatio) {
  return canvasTexture(256, (g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    // Subtle vertical shading between floors.
    g.fillStyle = 'rgba(0,0,0,0.08)';
    for (let y = 0; y < s; y += 42) g.fillRect(0, y, s, 3);
    // Windows: 6 columns x 5 rows.
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 6; c++) {
        const lit = Math.random() < litRatio;
        g.fillStyle = lit ? '#ffd98a' : '#2b3a4a';
        g.fillRect(14 + c * 40, 16 + r * 48, 24, 30);
        g.strokeStyle = 'rgba(0,0,0,0.35)';
        g.lineWidth = 2;
        g.strokeRect(14 + c * 40, 16 + r * 48, 24, 30);
      }
    }
  });
}

// Grass: green with lighter blades.
export function grassTexture() {
  return canvasTexture(256, (g, s) => {
    g.fillStyle = '#4e8f3a';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = Math.random() < 0.5 ? '#5da244' : '#437d31';
      g.fillRect(Math.random() * s, Math.random() * s, 3, 3);
    }
  });
}

// Sand: warm pale grains.
export function sandTexture() {
  return canvasTexture(256, (g, s) => {
    g.fillStyle = '#e0c896';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 1600; i++) {
      g.fillStyle = Math.random() < 0.5 ? '#d4b983' : '#ecd2a4';
      g.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
  });
}

// Water: deep blue with soft moving-looking streaks (static texture; the
// mesh itself bobs in main.js).
export function waterTexture() {
  return canvasTexture(256, (g, s) => {
    g.fillStyle = '#1d6f9e';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(255,255,255,0.18)';
    g.lineWidth = 3;
    for (let i = 0; i < 26; i++) {
      const y = Math.random() * s;
      g.beginPath();
      g.moveTo(Math.random() * s * 0.4, y);
      g.bezierCurveTo(s * 0.3, y + 8, s * 0.6, y - 8, s, y + 4);
      g.stroke();
    }
  });
}

// Wooden pier planks.
export function planksTexture() {
  return canvasTexture(256, (g, s) => {
    g.fillStyle = '#8a6a45';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#6b4f31';
    g.lineWidth = 3;
    for (let y = 0; y < s; y += 32) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke();
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.fillRect(0, y, s, 4);
    }
    for (let i = 0; i < 300; i++) {
      g.fillStyle = '#7a5c38';
      g.fillRect(Math.random() * s, Math.random() * s, 3, 2);
    }
  });
}
