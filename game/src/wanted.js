// Wanted stars + police chase, ram, arrest.
import * as THREE from 'three';
import { CFG, CAR_STYLES } from './config.js';
import { Car } from './vehicles.js';

export class Wanted {
  constructor(scene, rng, audio) {
    this.scene = scene;
    this.rng = rng;
    this.audio = audio;
    this.stars = 0;
    this.quietT = 0;
    this.police = [];
    this.arrestT = 0;
    this.onBusted = null;
  }
  addCrime(n) {
    this.stars = Math.min(3, this.stars + n);
    this.quietT = 0;
  }
  spawnPolice(near) {
    const style = { name: 'Interceptor', body: 0x111418, roof: 0x111418, len: 4.7, w: 1.95 };
    const ang = this.rng.range(0, Math.PI * 2);
    const x = near.x + Math.sin(ang) * 70;
    const z = near.z + Math.cos(ang) * 70;
    const car = new Car(this.scene, style, x, Math.max(-120, Math.min(118, z)), 0, true);
    this.police.push(car);
    return car;
  }
  clear() {
    for (const p of this.police) this.scene.remove(p.group);
    this.police = [];
    this.stars = 0;
  }
  update(dt, player, world, effects) {
    if (this.stars > 0) {
      this.quietT += dt;
      if (this.quietT > CFG.wantedDecay) { this.stars = Math.max(0, this.stars - 1); this.quietT = 0; }
    }
    // maintain police count = stars
    const want = this.stars;
    const active = this.police.filter((p) => !p.disabled);
    if (active.length < want && this.stars > 0) this.spawnPolice(player.pos);
    this.audio.setSiren(this.stars > 0);
    const target = player.inCar ? player.inCar : null;
    const tp = target ? target.pos : player.pos;
    let nearest = Infinity;
    for (let i = this.police.length - 1; i >= 0; i--) {
      const pc = this.police[i];
      if (pc.disabled) {
        pc.group.position.y = Math.max(-0.4, pc.group.position.y - dt * 0.05);
        continue;
      }
      const dx = tp.x - pc.pos.x, dz = tp.z - pc.pos.z;
      const dist = Math.hypot(dx, dz);
      nearest = Math.min(nearest, dist);
      const targetHeading = Math.atan2(dx, dz);
      let dh = targetHeading - pc.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      pc.heading += dh * Math.min(1, dt * 2.2);
      const chaseSpeed = Math.min(CFG.policeTopSpeed, 12 + dist * 0.25);
      pc.speed += (chaseSpeed - pc.speed) * Math.min(1, dt * 1.5);
      pc.pos.x += Math.sin(pc.heading) * pc.speed * dt;
      pc.pos.z += Math.cos(pc.heading) * pc.speed * dt;
      const [nx, nz] = world.collideCircle(pc.pos.x, pc.pos.z, 1.1);
      pc.pos.x = nx; pc.pos.z = nz;
      // ram the player's car
      if (target && dist < 3.4) {
        target.speed *= 0.92;
        effects.burst(tp.x, tp.y + 0.8, tp.z, 0xffaa33, 4, 3, 0.4, -4, 1);
      }
      pc.sync();
      pc.visuals(dt, false);
    }
    // arrest: police close to the player on foot
    if (this.stars > 0 && !player.inCar) {
      if (nearest < 2.8) {
        this.arrestT += dt;
        if (this.arrestT > 1.2 && this.onBusted) this.onBusted();
      } else this.arrestT = 0;
    } else this.arrestT = 0;
  }
}
