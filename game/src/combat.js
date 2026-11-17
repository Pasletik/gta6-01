// Dante's pistol: hitscan shots from the crosshair, with a tracer and a muzzle flash.
// Shooting police damages their cars; shooting near pedestrians scatters them.
import * as THREE from 'three';
import { GUN } from './config.js';

export function createCombat(scene, camera, audio) {
  const raycaster = new THREE.Raycaster();
  const tracerGeo = new THREE.BufferGeometry();
  tracerGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const tracer = new THREE.Line(tracerGeo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0 }));
  tracer.frustumCulled = false;
  scene.add(tracer);
  const flash = new THREE.PointLight(0xffd98a, 0, 18);
  scene.add(flash);
  let flashTimer = 0;
  let tracerTimer = 0;
  let ammo = GUN.ammo;

  function shoot(policeCars, peds, onHitPolice, onShotFired) {
    if (ammo <= 0) return false;
    ammo -= 1;
    audio.shot();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    raycaster.far = GUN.range;
    const targets = [];
    for (const car of policeCars) targets.push(car.group);
    for (const ped of peds) {
      if (ped.state !== 'down') targets.push(ped.group);
    }
    const hits = raycaster.intersectObjects(targets, true);
    const origin = camera.position.clone();
    let end = origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(GUN.range));
    if (hits.length > 0) {
      const hit = hits[0];
      end = hit.point.clone();
      let obj = hit.object;
      while (obj && !obj.userData.car && !obj.userData.ped) obj = obj.parent;
      if (obj && obj.userData.car) onHitPolice(obj.userData.car, hit.point);
      else if (obj && obj.userData.ped) {
        const ped = obj.userData.ped;
        ped.state = 'down';
        ped.downTimer = 12;
        ped.group.rotation.x = -Math.PI / 2;
      }
    }
    const positions = tracerGeo.attributes.position.array;
    positions[0] = origin.x;
    positions[1] = origin.y - 0.25;
    positions[2] = origin.z;
    positions[3] = end.x;
    positions[4] = end.y;
    positions[5] = end.z;
    tracerGeo.attributes.position.needsUpdate = true;
    tracer.material.opacity = 0.95;
    tracerTimer = 0.09;
    flash.position.copy(origin).add(raycaster.ray.direction.clone().multiplyScalar(1.2));
    flash.intensity = 60;
    flashTimer = 0.06;
    onShotFired(end);
    return true;
  }

  function reload() {
    ammo = GUN.ammo;
  }

  function update(dt) {
    if (flashTimer > 0) {
      flashTimer -= dt;
      if (flashTimer <= 0) flash.intensity = 0;
    }
    if (tracerTimer > 0) {
      tracerTimer -= dt;
      if (tracerTimer <= 0) tracer.material.opacity = 0;
    }
  }

  return {
    get ammo() {
      return ammo;
    },
    shoot,
    reload,
    update,
  };
}
