// Solara Bay — the wanted level. Crime adds heat, heat fades when the
// player keeps clean, and the police force scales with the stars: one
// cruiser per star, chasing until the player is caught on foot.

import { CFG } from './config.js';

export function createWanted() {
  const wanted = {
    level: 0,
    quietTime: 0, // seconds since the last crime
    arrestTimer: 0,
    onPoliceDisabled: null, // optional hook for the missions module
  };

  wanted.addHeat = function (n) {
    wanted.level = Math.min(3, wanted.level + n);
    wanted.quietTime = 0;
  };

  wanted.setLevel = function (n) {
    wanted.level = Math.max(0, Math.min(3, n));
    wanted.quietTime = 0;
  };

  wanted.update = function (dt, G) {
    // heat fades after a clean stretch
    wanted.quietTime += dt;
    if (wanted.level > 0 && wanted.quietTime > CFG.wantedDecaySeconds) {
      wanted.level -= 1;
      wanted.quietTime = 0;
    }
    // dispatch: one active cruiser per star
    const active = G.vehicles.police.filter((c) => c.active).length;
    if (active < wanted.level) {
      G.vehicles.spawnPolice(G.player.pos.x, G.player.pos.z);
    } else if (active > wanted.level) {
      const extra = G.vehicles.police.find((c) => c.active);
      if (extra) G.vehicles.despawnPolice(extra);
    }
    G.audio.setSiren(wanted.level > 0 && G.state === 'playing');
    // arrest: a cruiser sitting on the player while on foot
    if (wanted.level > 0 && !G.player.car && G.state === 'playing') {
      let close = false;
      for (const car of G.vehicles.police) {
        if (!car.active || car.disabled) continue;
        const d = Math.hypot(car.x - G.player.pos.x, car.z - G.player.pos.z);
        if (d < CFG.arrestDistance) {
          close = true;
          break;
        }
      }
      if (close) {
        wanted.arrestTimer += dt;
        if (wanted.arrestTimer > CFG.arrestHoldSeconds) {
          wanted.arrestTimer = 0;
          G.onBusted?.();
        }
      } else {
        wanted.arrestTimer = Math.max(0, wanted.arrestTimer - dt * 2);
      }
    } else {
      wanted.arrestTimer = 0;
    }
  };

  return wanted;
}
