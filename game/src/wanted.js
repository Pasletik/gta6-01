// The wanted level: 0 to 3 stars. Crimes raise it, hiding lowers it, a paint shop clears it.
import { WANTED } from './config.js';

export function createWanted(onChange) {
  let level = 0;
  let hiddenTimer = 0;
  let lastReason = '';

  function setLevel(value, reason) {
    const next = Math.max(0, Math.min(WANTED.max, value));
    if (next !== level) {
      level = next;
      lastReason = reason || '';
      hiddenTimer = 0;
      onChange(level, lastReason);
    }
  }

  return {
    get level() {
      return level;
    },
    add(n, reason) {
      setLevel(level + n, reason);
    },
    clear(reason) {
      setLevel(0, reason || 'clean');
    },
    update(dt, seen) {
      if (level === 0) return;
      if (seen) {
        hiddenTimer = 0;
      } else {
        hiddenTimer += dt;
        if (hiddenTimer >= WANTED.decaySeconds) {
          setLevel(level - 1, 'cooling off');
        }
      }
    },
  };
}
