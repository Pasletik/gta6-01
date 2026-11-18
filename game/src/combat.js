// Pistol combat: hitscan shots, tracers, muzzle flash.
import * as THREE from 'three';

function raySphere(origin, dir, center, r) {
  const ox = center.x - origin.x, oy = center.y - origin.y, oz = center.z - origin.z;
  const tca = ox * dir.x + oy * dir.y + oz * dir.z;
  if (tca < 0) return -1;
  const d2 = ox * ox + oy * oy + oz * oz - tca * tca;
  if (d2 > r * r) return -1;
  return tca - Math.sqrt(r * r - d2);
}

export class Combat {
  constructor(scene, effects, audio) {
    this.scene = scene;
    this.effects = effects;
    this.audio = audio;
    this.cooldown = 0;
    this.raycaster = new THREE.Raycaster();
  }
  update(dt) { this.cooldown = Math.max(0, this.cooldown - dt); }
  shoot(camera, player, world, peds, wanted, policeCars) {
    if (this.cooldown > 0 || player.inCar) return;
    this.cooldown = 0.24;
    const origin = camera.position.clone();
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    // muzzle position: just in front of the player
    const fwd = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
    const muzzle = player.pos.clone().add(new THREE.Vector3(0, 1.35, 0)).addScaledVector(fwd, 0.7);
    let bestT = 70, bestPoint = origin.clone().addScaledVector(dir, 70), hit = null;
    // peds
    for (const p of peds.list) {
      if (p.state === 'down') continue;
      const c = p.pos.clone(); c.y = 1.1;
      const t = raySphere(origin, dir, c, 0.85);
      if (t > 0 && t < bestT) { bestT = t; hit = { type: 'ped', ped: p }; bestPoint = origin.clone().addScaledVector(dir, t); }
    }
    // police cars
    for (const pc of policeCars) {
      if (pc.disabled) continue;
      const c = pc.pos.clone(); c.y = 1.0;
      const t = raySphere(origin, dir, c, 2.3);
      if (t > 0 && t < bestT) { bestT = t; hit = { type: 'police', car: pc }; bestPoint = origin.clone().addScaledVector(dir, t); }
    }
    this.effects.muzzle(muzzle);
    this.effects.tracer(muzzle, bestPoint);
    this.audio.shot();
    if (hit) {
      this.effects.burst(bestPoint.x, bestPoint.y, bestPoint.z, 0xff5533, 10, 4, 0.5, -5, 2);
      if (hit.type === 'ped') {
        peds.downAt(hit.ped.pos.x, hit.ped.pos.z, 3);
        wanted.addCrime(1);
      } else {
        const dead = hit.car.damage(1);
        wanted.addCrime(1);
        if (dead) this.effects.burst(bestPoint.x, bestPoint.y + 0.5, bestPoint.z, 0x888888, 22, 5, 1.1, -2, 2);
      }
    } else {
      // impact dust where the shot lands
      this.effects.burst(bestPoint.x, Math.max(0.2, bestPoint.y), bestPoint.z, 0xcccccc, 5, 2, 0.4, -3, 1);
    }
    peds.fleeFrom(bestPoint.x, bestPoint.z);
  }
}
