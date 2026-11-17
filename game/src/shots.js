// The screenshot scenes behind ?shot=cover|street|drive|mission. Each one stages the real
// game from the seeded world, plays it forward with a scripted driver for a few seconds, and
// leaves a frame that shows several systems at once. The same seed always gives the same frame.
import * as THREE from 'three';

const STEP = 1 / 60;

/** Input that drives straight ahead, used while a shot plays itself forward. */
function driveInput() {
  return {
    keys: new Set(),
    axis: () => ({ x: 0, y: 1 }),
    run: () => false,
    handbrake: () => false,
    look: () => ({ dx: 0, dy: 0 }),
    takeShoot: () => false,
    takeInteract: () => false,
    takeConfirm: () => false,
    takePause: () => false,
    takeReload: () => false,
  };
}

function idleInput() {
  const input = driveInput();
  input.axis = () => ({ x: 0, y: 0 });
  return input;
}

function putPlayerInCar(game, x, z, heading) {
  const { player, vehicles } = game;
  // Prefer a parked car already nearby; otherwise put a fresh one on the road, so the
  // player's car is always a real parked car and never a traffic car mid-route.
  const car = vehicles.nearestCar({ x, z }, 60, ['parked']) || vehicles.spawnParkedAt(x, z, heading);
  car.pos.set(x, 0, z);
  car.heading = heading;
  car.speed = 0;
  car.group.position.copy(car.pos);
  car.group.rotation.y = heading;
  vehicles.setPlayerCar(car);
  player.inCar = true;
  player.car = car;
  player.pos.copy(car.pos);
  player.heading = heading;
  player.yaw = heading + Math.PI;
  return car;
}

function putPlayerOnFoot(game, x, z, yaw) {
  const { player } = game;
  player.inCar = false;
  player.car = null;
  player.pos.set(x, 0, z);
  player.heading = yaw + Math.PI;
  player.yaw = yaw;
  player.group.position.copy(player.pos);
}

/** Play the game forward `steps` fixed steps with the given input. */
function playForward(game, steps, input) {
  game.setShotInput(input);
  for (let i = 0; i < steps; i += 1) game.stepGame(STEP);
  game.setShotInput(null);
}

export function stageShot(name, game) {
  const { player, vehicles, wanted, missions, hud } = game;
  hud.showScreen('play');
  if (name === 'cover') {
    // A chase: Dante delivering the package with two stars, two patrol cars closing
    // head-on down the same avenue (the camera looks forward, so the pursuit reads).
    missions.debugSet(1, 2);
    wanted.add(2, 'the chase');
    const car = putPlayerInCar(game, 0, 40, Math.PI);
    car.speed = 22;
    const police1 = vehicles.spawnPoliceAt(player.pos);
    police1.pos.set(3, 0, -50);
    police1.heading = 0;
    const police2 = vehicles.spawnPoliceAt(player.pos);
    police2.pos.set(-3, 0, -70);
    police2.heading = 0;
    playForward(game, 72, driveInput());
  } else if (name === 'drive') {
    // Cruising the ocean avenue toward the beach, traffic ahead.
    missions.debugSet(0, 1);
    const car = putPlayerInCar(game, 60, -120, 0);
    car.speed = 18;
    playForward(game, 150, driveInput());
  } else if (name === 'mission') {
    // On foot at the docks, package beacon ahead. The camera stands on the sand north of
    // the pier looking south, so the player, the beacon column, the pier and the ocean
    // are all in the frame and the beam never sits between the camera and the player.
    missions.debugSet(1, 1);
    wanted.add(1, 'the package');
    putPlayerOnFoot(game, -30, 246, Math.PI);
    player.pitch = 0.15;
    playForward(game, 120, idleInput());
  } else {
    // street: on foot on the sidewalk by the park, traffic and pedestrians passing.
    missions.debugSet(0, 0);
    putPlayerOnFoot(game, 7.5, -40, 0);
    playForward(game, 180, idleInput());
  }
  // Screenshots want the HUD, not the intro toast or the crosshair on the player's back.
  hud.hideToast();
  hud.setCrosshairVisible(false);
  // Paint twice so shadows, particles and the HUD are settled, then signal the shooter.
  let painted = 0;
  function paint() {
    game.renderGame();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}
