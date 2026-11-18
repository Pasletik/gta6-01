// Keyboard + mouse input state.
export class Input {
  constructor() {
    this.keys = new Set();
    this.mouseDX = 0; this.mouseDY = 0;
    this.mouseDown = false;
    this.clicked = false; // consumed by combat each frame
    this.locked = false;
    this.anyKey = false;
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code); this.anyKey = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.mouseDown = true; this.clicked = true; }
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouseDown = false; });
    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement) { this.mouseDX += e.movementX; this.mouseDY += e.movementY; }
    });
    window.addEventListener('blur', () => this.keys.clear());
  }
  down(...codes) { return codes.some((c) => this.keys.has(c)); }
  pressed(code) { // edge-triggered once per frame via consume()
    if (this.keys.has(code)) { this.keys.delete(code); return true; }
    return false;
  }
  consumeClick() { const c = this.clicked; this.clicked = false; return c; }
  consumeMouse() { const dx = this.mouseDX, dy = this.mouseDY; this.mouseDX = 0; this.mouseDY = 0; return [dx, dy]; }
  lockPointer(el) {
    try { el.requestPointerLock(); this.locked = true; } catch { /* headless */ }
  }
  unlockPointer() { try { document.exitPointerLock(); } catch { /* noop */ } this.locked = false; }
}
