// Solara Bay — the story. Three missions in order, each a chain of steps
// with a beacon in the world and a HUD objective line. Rewards are cash;
// finishing all three ends the story.

import * as THREE from 'three';
import { MISSIONS } from './config.js';
import { makeCarMesh } from './vehicles.js';

export function createMissions(G) {
  const scene = G.scene;
  // beacon: a pillar of light, a ground ring and a floating diamond
  const beacon = new THREE.Group();
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.6, 42, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xf2c200, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
  );
  pillar.position.y = 21;
  beacon.add(pillar);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 3, 24),
    new THREE.MeshBasicMaterial({ color: 0xf2c200, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  beacon.add(ring);
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.9),
    new THREE.MeshBasicMaterial({ color: 0xffe066 }),
  );
  gem.position.y = 4;
  beacon.add(gem);
  beacon.visible = false;
  scene.add(beacon);

  const missions = {
    index: 0,
    step: 0,
    done: false,
    missionCar: null,
    beacon,
  };

  function currentMission() {
    return MISSIONS[missions.index];
  }
  function currentStep() {
    const m = currentMission();
    return m ? m.steps[missions.step] : null;
  }
  missions.currentObjective = function () {
    if (missions.done) return 'All missions complete — Solara Bay is yours, Dante.';
    const m = currentMission();
    const s = currentStep();
    return m && s ? `${m.name}: ${s.label}` : '';
  };

  function placeBeacon(x, z) {
    beacon.position.set(x, 0, z);
    beacon.visible = true;
  }

  function startStep() {
    const s = currentStep();
    if (!s) return;
    placeBeacon(s.pos[0], s.pos[2]);
    G.hud.toast(`${currentMission().name} — ${s.label}`);
  }

  function startMission(i) {
    missions.index = i;
    missions.step = 0;
    const m = currentMission();
    G.hud.banner(m.name, m.briefing);
    if (m.id === 'wheels-up') {
      // the blue coupe waiting on the pier
      const mesh = makeCarMesh(0x2e7fa8, false);
      mesh.position.set(132, 0.5, 182);
      mesh.rotation.y = Math.PI;
      scene.add(mesh);
      missions.missionCar = { mesh, x: 132, z: 182, heading: Math.PI, speed: 0, health: 100, isPolice: false, active: false, disabled: false, isMission: true };
      G.vehicles.parked.push(missions.missionCar);
    }
    if (m.id === 'heat-wave') {
      G.wanted.setLevel(3);
    }
    startStep();
  }

  missions.start = function () {
    missions.index = 0;
    missions.step = 0;
    missions.done = false;
    startMission(0);
  };

  // Continue from a save: jump straight into a later mission, fresh step 0.
  missions.restore = function (index) {
    startMission(index);
  };

  missions.completeStep = function () {
    missions.step += 1;
    const m = currentMission();
    if (missions.step >= m.steps.length) {
      // mission complete
      G.player.money += m.reward;
      G.audio.missionDone();
      G.hud.toast(`Mission complete: ${m.name} — +$${m.reward}`);
      G.save();
      if (missions.index + 1 >= MISSIONS.length) {
        missions.done = true;
        beacon.visible = false;
        G.onAllMissionsDone();
        return;
      }
      startMission(missions.index + 1);
      return;
    }
    startStep();
  };

  missions.update = function (dt) {
    if (missions.done || G.state !== 'playing') return;
    // beacon pulse
    const t = G.time;
    const s = 1 + Math.sin(t * 3) * 0.12;
    ring.scale.set(s, s, 1);
    gem.rotation.y += dt * 2;
    gem.position.y = 4 + Math.sin(t * 2) * 0.4;
    const step = currentStep();
    if (!step) return;
    const px = G.player.pos.x;
    const pz = G.player.pos.z;
    const dist = Math.hypot(px - step.pos[0], pz - step.pos[2]);
    if (step.kind === 'go' && dist < 4.5) {
      missions.completeStep();
    } else if (step.kind === 'steal' && G.player.car === missions.missionCar) {
      missions.completeStep();
    } else if (step.kind === 'drive' && G.player.car === missions.missionCar && dist < 7) {
      missions.completeStep();
    } else if (step.kind === 'heat' && G.wanted.level >= 3 && dist < 8) {
      missions.completeStep();
    }
  };

  return missions;
}
