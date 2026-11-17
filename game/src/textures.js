// Canvas-generated textures: every surface the city shows is painted at runtime, so the
// game ships no image assets and makes no network request.
import * as THREE from 'three';

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** A building facade: warm plaster with a grid of windows, some lit. */
export function makeBuildingTexture(rng, base) {
  return canvasTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    // subtle plaster noise
    for (let i = 0; i < 220; i += 1) {
      ctx.fillStyle = `rgba(0,0,0,${rng.range(0.02, 0.07)})`;
      ctx.fillRect(rng.range(0, w), rng.range(0, h), rng.range(1, 4), rng.range(1, 4));
    }
    const cols = 4;
    const rows = 9;
    const cw = w / cols;
    const ch = h / rows;
    for (let x = 0; x < cols; x += 1) {
      for (let y = 0; y < rows; y += 1) {
        const lit = rng.chance(0.28);
        ctx.fillStyle = lit ? '#ffd98a' : '#2e3d4d';
        ctx.fillRect(x * cw + cw * 0.22, y * ch + ch * 0.2, cw * 0.56, ch * 0.55);
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.fillRect(x * cw + cw * 0.22, y * ch + ch * 0.2, cw * 0.56, ch * 0.12);
      }
    }
    // ground-floor shopfront band
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, h - ch * 0.9, w, ch * 0.9);
  });
}

/** Asphalt with a dashed centre line, repeated along a road strip. */
export function makeRoadTexture() {
  const texture = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#3a3f46';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i += 1) {
      ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.04})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    ctx.fillStyle = '#d8b13c';
    ctx.fillRect(w / 2 - 2, 8, 4, 26);
    ctx.fillRect(w / 2 - 2, 72, 4, 26);
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(4, 0, 3, h);
    ctx.fillRect(w - 7, 0, 3, h);
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function makeSidewalkTexture() {
  const texture = canvasTexture(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#9a938a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function makeSandTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e8d49a';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 420; i += 1) {
      ctx.fillStyle = `rgba(120,90,40,${0.05 + Math.random() * 0.08})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 1);
    }
  });
}

export function makeGrassTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#6fae5e';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i += 1) {
      ctx.fillStyle = `rgba(20,70,20,${0.06 + Math.random() * 0.1})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 3);
    }
  });
}

/** A shop sign: big painted letters on a coloured board. */
export function makeSignTexture(text, background, foreground, subtext) {
  return canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = foreground;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = foreground;
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, subtext ? h / 2 - 16 : h / 2);
    if (subtext) {
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillText(subtext, w / 2, h / 2 + 34);
    }
  });
}
