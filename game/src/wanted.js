// Solara Bay — the wanted system. One job: track the heat, spawn police,
// and decide when the player is busted.

import { CFG } from './config.js';

export class Wanted {
  constructor() {
    this.level = 0; // 0..3 stars
    this.quietTimer = 0; // seconds since the last crime
    this.bustedTimer = 0; // counts down while a cop is touching the player
  }

  // A crime was committed: raise the level (never above 3) and reset the clock.
  commit(amount = 1) {
    this.level = Math.min(CFG.maxWanted, this.level + amount);
    this.quietTimer = 0;
  }

  setLevel(n) {
    this.level = Math.max(0, Math.min(CFG.maxWanted, n));
    this.quietTimer = 0;
  }

  clear() {
    this.level = 0;
    this.quietTimer = 0;
    this.bustedTimer = 0;
  }

  // Quiet time cools the heat down one star at a time.
  update(dt, committingCrime) {
    if (this.level === 0) return;
    if (committingCrime) {
      this.quietTimer = 0;
      return;
    }
    this.quietTimer += dt;
    if (this.quietTimer >= CFG.wantedDecaySeconds) {
      this.level -= 1;
      this.quietTimer = 0;
    }
  }

  // A police car is touching the player on foot: hold still and it's over.
  // Returns true when the bust completes.
  touching(dt) {
    this.bustedTimer += dt;
    return this.bustedTimer >= 1.6;
  }

  notTouching() {
    this.bustedTimer = 0;
  }

  get stars() {
    return this.level;
  }

  get heat() {
    return this.level > 0;
  }
}
