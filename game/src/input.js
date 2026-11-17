// Keyboard + mouse input. Click the canvas to lock the pointer for mouse look; the game
// also works with plain mouse drag when the pointer is not locked.
export function createInput(canvas) {
  const keys = new Set();
  let lookDX = 0;
  let lookDY = 0;
  let shootQueued = false;
  let interactQueued = false;
  let confirmQueued = false;
  let pauseQueued = false;
  let reloadQueued = false;

  function keyCode(event) {
    return event.code;
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(keyCode(event));
    if (event.code === 'KeyE') interactQueued = true;
    if (event.code === 'Enter' || event.code === 'Space') confirmQueued = true;
    if (event.code === 'KeyP' || event.code === 'Escape') pauseQueued = true;
    if (event.code === 'KeyR') reloadQueued = true;
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(keyCode(event));
  });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      shootQueued = true;
      if (document.pointerLockElement !== canvas) {
        try {
          canvas.requestPointerLock();
        } catch {
          // Pointer lock can be denied (headless): drag still works.
        }
      }
    }
  });
  document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === canvas) {
      lookDX += event.movementX;
      lookDY += event.movementY;
    }
  });
  // Drag-look fallback when the pointer is not locked.
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener('mousedown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
  });
  window.addEventListener('mousemove', (event) => {
    if (dragging && document.pointerLockElement !== canvas) {
      lookDX += event.clientX - lastX;
      lookDY += event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
    }
  });

  return {
    keys,
    axis() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      return { x, y };
    },
    run() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    handbrake() {
      return keys.has('Space');
    },
    look() {
      const dx = lookDX;
      const dy = lookDY;
      lookDX = 0;
      lookDY = 0;
      return { dx, dy };
    },
    takeShoot() {
      const value = shootQueued;
      shootQueued = false;
      return value;
    },
    takeInteract() {
      const value = interactQueued;
      interactQueued = false;
      return value;
    },
    takeConfirm() {
      const value = confirmQueued;
      confirmQueued = false;
      return value;
    },
    takePause() {
      const value = pauseQueued;
      pauseQueued = false;
      return value;
    },
    takeReload() {
      const value = reloadQueued;
      reloadQueued = false;
      return value;
    },
  };
}
