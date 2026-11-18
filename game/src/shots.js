// Scripted screenshot scenes (?shot=chase|street|drive|docks&seed=1).
// Stages the world, applies the lighting preset, runs fixed simulation steps
// so the shot is settled when the headless screenshot lands.
import * as THREE from 'three';
import { CAR_STYLES } from './config.js';

function placeCar(game, styleIdx, x, z, heading, speed = 0) {
  const car = game.player.inCar;
  car.group.visible = true;
  car.pos.set(x, 0, z);
  car.heading = heading;
  car.speed = speed;
  car.sync();
  return car;
}

export function stageShot(game, name) {
  const p = game.player;
  const w = game.world;
  game.hud.clearToast();
  game.state = 'playing';
  if (name === 'chase') {
    w.applyPreset('golden');
    p.inCar = game.playerCar;
    p.group.visible = false;
    placeCar(game, 0, 0, -46, 0, 24); // southbound on road x=0
    game.playerCar.group.userData.tailMat.emissiveIntensity = 0.9;
    // police cruiser ahead-right, chasing
    const pc = game.wanted.spawnPolice(p.pos);
    pc.pos.set(4.5, 0, -12); pc.heading = 0; pc.speed = 26; pc.sync();
    game.wanted.stars = 3;
    game.money = 1250;
    game.missions.index = 0; game.missions.stage = 0; game.missions.moveBeacon();
    game.hud.setObjective('Get a car, then drive to the docks marker');
    game.camMode = 'chase';
    game.shotDrive = { throttle: 1, steer: 0, axis: 'z', dir: 1, start: -46, end: 110 };
  } else if (name === 'street') {
    w.applyPreset('dusk');
    p.inCar = null; p.group.visible = true;
    p.pos.set(17, 0, -34); p.heading = 0; p.camYaw = 0; p.camPitch = 0.18; p.camDist = 5.0;
    p.group.position.copy(p.pos); p.group.rotation.y = 0;
    // two peds nearby on the sidewalk
    const a = game.peds.list[0], b = game.peds.list[1];
    a.pos.set(13.5, 0, -30); a.heading = Math.PI; a.state = 'walk';
    b.pos.set(20.5, 0, -38); b.heading = 0; b.state = 'walk';
    a.group.position.copy(a.pos); b.group.position.copy(b.pos);
    game.wanted.stars = 0;
    game.money = 1250;
    game.hud.setObjective('Get a car, then drive to the docks marker');
    game.camMode = 'street';
    game.shotDrive = null;
  } else if (name === 'drive') {
    w.applyPreset('midday');
    p.inCar = game.playerCar;
    p.group.visible = false;
    placeCar(game, 0, 34, 62, Math.PI, 21); // northbound on avenue x=34
    game.wanted.stars = 0;
    game.money = 1250;
    game.hud.setObjective('Get a car, then drive to the docks marker');
    game.camMode = 'chase';
    game.shotDrive = { throttle: 1, steer: 0, axis: 'z', dir: -1, start: 62, end: -100 };
  } else if (name === 'docks') {
    w.applyPreset('sunset');
    p.inCar = null; p.group.visible = true;
    p.pos.set(51, 0, 152); p.heading = 0; p.camYaw = 0; p.camPitch = 0.12; p.camDist = 6.0;
    p.group.position.copy(p.pos); p.group.rotation.y = 0;
    // blue coupe parked beside Dante on the pier
    const coupe = game.parkedCars[0];
    coupe.pos.set(46.5, 0, 158); coupe.heading = 0; coupe.sync();
    game.wanted.stars = 0;
    game.money = 2450;
    game.missions.index = 1; game.missions.stage = 1; game.missions.moveBeacon();
    game.hud.setObjective('Deliver the package to the pier end');
    game.camMode = 'docks';
    game.shotDrive = null;
  }
  // settle the scene with fixed steps
  game.hud.setMoney(game.money);
  game.hud.setStars(game.wanted.stars);
  for (let i = 0; i < 50; i++) game.stepPlaying(1 / 30, true);
}
