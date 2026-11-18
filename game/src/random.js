// Solara Bay — deterministic randomness. One job: every random choice in the
// game comes from a seeded generator so ?seed=1 always builds the same city.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Small helper bag around one generator instance.
export class Rng {
  constructor(seed) {
    this.next = mulberry32(seed);
  }

  // Float in [min, max).
  range(min, max) {
    return min + this.next() * (max - min);
  }

  // Integer in [min, max] inclusive.
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  // Pick one element of an array.
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }

  // True with probability p.
  chance(p) {
    return this.next() < p;
  }
}

// Read ?seed= from the page URL; default 1. Deterministic unless asked.
export function seedFromUrl() {
  try {
    const v = new URLSearchParams(window.location.search).get('seed');
    const n = v === null ? 1 : parseInt(v, 10);
    return Number.isFinite(n) ? n : 1;
  } catch (e) {
    return 1;
  }
}
