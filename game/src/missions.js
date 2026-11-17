// Three jobs for Rosa Delgado, then free roam. Each mission is a short state machine with
// a beacon marker in the world, an objective line on the HUD and a cash reward.
import * as THREE from 'three';
import { MISSIONS } from './config.js';

function makeBeacon(scene) {
  const group = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 2.4, 34, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23c, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 17;
  group.add(beam);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 3, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23c, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.12;
  group.add(ring);
  group.visible = false;
  scene.add(group);
  return {
    group,
    set(x, z) {
      group.position.set(x, 0, z);
      group.visible = true;
    },
    hide() {
      group.visible = false;
    },
    pulse(time) {
      const s = 1 + Math.sin(time * 3) * 0.12;
      ring.scale.set(s, s, 1);
    },
  };
}

export function createMissions(game) {
  const { scene, world, player, vehicles, wanted, hud, audio } = game;
  const beacon = makeBeacon(scene);
  let index = 0;
  let step = 0;
  let done = false;
  let money = 150;

  function mission() {
    return MISSIONS[index];
  }

  function setObjective(text) {
    hud.setObjective(mission() ? `${mission().title}: ${text}` : text);
  }

  function completeMission() {
    const m = mission();
    money += m.reward;
    hud.setMoney(money);
    hud.banner(`${m.title} complete`, `+$${m.reward} — Rosa is pleased.`);
    hud.toast(`${m.title} complete — +$${m.reward}`);
    audio.mission();
    player.health = Math.min(100, player.health + 40);
    index += 1;
    step = 0;
    if (index >= MISSIONS.length) {
      done = true;
      beacon.hide();
      setObjective('Free roam — Solara Bay is yours.');
      hud.showEnd('complete', money);
      game.onStoryComplete(money);
    } else {
      startMission();
    }
  }

  function startMission() {
    const m = mission();
    hud.toast(`${m.title} — ${m.giver}: ${m.text}`);
    hud.setMissionTitle(m.title);
    if (m.id === 'wheels') {
      step = 0;
      beacon.hide();
      setObjective('Steal a car (E near a parked car)');
    } else if (m.id === 'package') {
      step = 0;
      beacon.set(world.landmarks.docks.x, world.landmarks.docks.z);
      setObjective('Drive to the docks');
    } else if (m.id === 'heat') {
      step = 0;
      wanted.add(2, 'the heat');
      beacon.set(world.landmarks.paintShop.x, world.landmarks.paintShop.z);
      setObjective('Reach Solara Paint & Body');
    }
  }

  function distTo(x, z) {
    return Math.hypot(player.pos.x - x, player.pos.z - z);
  }

  function update(dt, time) {
    beacon.pulse(time);
    if (done || !mission()) return;
    const m = mission();
    if (m.id === 'wheels') {
      if (step === 0) {
        if (player.inCar) {
          step = 1;
          beacon.set(world.landmarks.garage.x, world.landmarks.garage.z);
          setObjective('Drive to Delgado Auto');
          hud.toast('Nice wheels. Now bring it to the garage.');
        }
      } else if (distTo(world.landmarks.garage.x, world.landmarks.garage.z) < 9) {
        completeMission();
      }
    } else if (m.id === 'package') {
      if (step === 0) {
        if (distTo(world.landmarks.docks.x, world.landmarks.docks.z) < 9) {
          step = 1;
          beacon.set(-30, 262);
          setObjective('Pick up the package on foot (walk into the marker)');
          hud.toast('The package is on the pier. On foot — a car cannot go there.');
        }
      } else if (step === 1) {
        if (!player.inCar && distTo(-30, 262) < 3.5) {
          step = 2;
          audio.pickup();
          wanted.add(1, 'the package');
          beacon.set(world.landmarks.motel.x, world.landmarks.motel.z);
          setObjective('Deliver the package to the Seaview Motel');
          hud.toast('Package secured. Someone called the cops — move!');
        }
      } else if (distTo(world.landmarks.motel.x, world.landmarks.motel.z) < 9) {
        completeMission();
      }
    } else if (m.id === 'heat') {
      if (distTo(world.landmarks.paintShop.x, world.landmarks.paintShop.z) < 9) {
        wanted.clear('new coat');
        completeMission();
      }
    }
  }

  function markerPos() {
    return beacon.group.visible ? { x: beacon.group.position.x, z: beacon.group.position.z } : null;
  }

  function reset() {
    index = 0;
    step = 0;
    done = false;
    money = 150;
    hud.setMoney(money);
    startMission();
  }

  /** Shot staging only: jump to a mission and step, configuring its beacon and objective. */
  function debugSet(newIndex, newStep) {
    index = newIndex;
    step = newStep;
    done = false;
    const m = mission();
    hud.setMissionTitle(m.title);
    if (m.id === 'wheels') {
      if (step === 0) {
        beacon.hide();
        setObjective('Steal a car (E near a parked car)');
      } else {
        beacon.set(world.landmarks.garage.x, world.landmarks.garage.z);
        setObjective('Drive to Delgado Auto');
      }
    } else if (m.id === 'package') {
      if (step === 0) {
        beacon.set(world.landmarks.docks.x, world.landmarks.docks.z);
        setObjective('Drive to the docks');
      } else if (step === 1) {
        beacon.set(-30, 262);
        setObjective('Pick up the package on foot (walk into the marker)');
      } else {
        beacon.set(world.landmarks.motel.x, world.landmarks.motel.z);
        setObjective('Deliver the package to the Seaview Motel');
      }
    } else if (m.id === 'heat') {
      beacon.set(world.landmarks.paintShop.x, world.landmarks.paintShop.z);
      setObjective('Reach Solara Paint & Body');
    }
  }

  startMission();
  return {
    get index() {
      return index;
    },
    get money() {
      return money;
    },
    get done() {
      return done;
    },
    set money(value) {
      money = value;
      hud.setMoney(money);
    },
    update,
    reset,
    debugSet,
    markerPos,
  };
}
