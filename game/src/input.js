// Solara Bay — keyboard and mouse input. One shared key-state object that
// gameplay and the self-test both read, so scripted tests drive the exact
// same code paths as a human player.

export function createInput(canvas) {
  const input = {
    keys: Object.create(null), // code -> true while held
    mouseDX: 0,
    mouseDY: 0,
    mouseDown: false,
    locked: false,
    // set by the self-test to inject synthetic keys
    testKeys: null,
  };

  function isDown(code) {
    if (input.testKeys && code in input.testKeys) return input.testKeys[code];
    return !!input.keys[code];
  }
  input.isDown = isDown;

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Tab') e.preventDefault();
    input.keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    input.keys[e.code] = false;
  });
  window.addEventListener('blur', () => {
    input.keys = Object.create(null);
    input.mouseDown = false;
  });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) input.mouseDown = true;
    if (!input.locked && document.pointerLockElement !== canvas) {
      canvas.requestPointerLock?.();
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.mouseDown = false;
  });
  document.addEventListener('pointerlockchange', () => {
    input.locked = document.pointerLockElement === canvas;
  });
  document.addEventListener('mousemove', (e) => {
    if (input.locked) {
      input.mouseDX += e.movementX || 0;
      input.mouseDY += e.movementY || 0;
    }
  });

  // Call once per frame: returns accumulated mouse movement, then clears it.
  input.consumeMouse = function () {
    const dx = input.mouseDX;
    const dy = input.mouseDY;
    input.mouseDX = 0;
    input.mouseDY = 0;
    return { dx, dy };
  };

  // Edge-triggered key: true once when the key goes down, then consumes it.
  input.pressed = function (code) {
    if (input.testKeys && input.testKeys[code]) {
      input.testKeys[code] = false;
      return true;
    }
    if (input.keys[code] === true) {
      input.keys[code] = 'consumed';
      return true;
    }
    return false;
  };

  return input;
}
