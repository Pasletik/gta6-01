// Solara Bay — keyboard and mouse input. One job: turn raw browser events
// into a clean per-frame state the player and camera read.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseDown = false;
    this.pointerLocked = false;
    this._pressed = new Set();
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this._pressed.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.mouseDX += e.movementX || 0;
      this.mouseDY += e.movementY || 0;
    });
    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDown = true;
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === canvas;
    });
  }

  // Ask the browser to lock the pointer to the canvas (for mouse orbit).
  lockPointer() {
    try {
      this.canvas.requestPointerLock();
    } catch (e) {
      /* pointer lock unavailable (headless) — mouse orbit just stays put */
    }
  }

  unlockPointer() {
    try {
      if (document.pointerLockElement) document.exitPointerLock();
    } catch (e) {
      /* ignore */
    }
  }

  down(code) {
    return this.keys.has(code);
  }

  // True only on the frame the key went down (consumed by endFrame).
  pressed(code) {
    return this._pressed.has(code);
  }

  // Movement axes: -1..1. W/S forward/back, A/D strafe.
  moveAxes() {
    let x = 0;
    let y = 0;
    if (this.down('KeyW') || this.down('ArrowUp')) y += 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y -= 1;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    return { x, y };
  }

  // Consume this frame's edge-triggered state. Called once per frame.
  endFrame() {
    this._pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
  }
}
