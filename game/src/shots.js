// Solara Bay — scripted screenshot scenes. One job: given ?shot=<name>, put
// the game into a fixed, readable tableau for the screenshots, so every shot
// shows the systems working without any input.

import { PLACES } from './config.js';
//
// Every scene puts its car on a real road (road centres are -203, -145,
// -87, -29, 29, 87, 145, 203) and returns a camera pose as an offset from
// the player's current position plus a look offset — the camera follows the
// player, so a moving car stays framed.

// Each scene is a function that arranges the game state, then a camera pose
// (offset from the focus point, and where the camera looks).
const SCENES = {
  // Cover: a police chase — wanted 3, police on the tail, mission objective
  // and minimap live on the HUD. Car on the x=-29 road, heading +z.
  chase(G) {
    const car = G.vehicles.cars[2];
    G.player.enterCar(car);
    car.x = -29;
    car.z = 40;
    car.heading = 0;
    car.speed = 22;
    car.sync();
    G.wanted.setLevel(3);
    G.vehicles.ensurePolice(3, car.x, car.z);
    // Police right behind, mid-chase, on the same road. The camera sits
    // ahead of the player's car looking back, so the chase reads: the
    // player's car in front, the black-and-whites closing in behind it.
    const spots = [[-32, 28], [-26, 20], [-29, 12]];
    G.vehicles.police.forEach((p, i) => {
      p.x = spots[i][0];
      p.z = spots[i][1];
      p.heading = 0;
      p.speed = 20;
      p.sync();
    });
    G.missions.setIndex(1);
    G.money = 1700;
    return { offset: { x: 3, y: 7, z: 24 }, look: { x: 0, y: 1.5, z: -8 } };
  },

  // On foot in the city: Dante on the x=-29 road, peds and traffic around.
  street(G) {
    G.player.x = -30;
    G.player.z = -58;
    G.player.heading = Math.PI * 0.75;
    G.player.group.position.set(G.player.x, 0, G.player.z);
    G.player.group.rotation.y = G.player.heading;
    G.missions.setIndex(0);
    G.money = 0;
    return { offset: { x: -2, y: 6, z: -13 }, look: { x: 8, y: 1.5, z: 10 } };
  },

  // Driving with traffic: Dante cruising the x=87 road north-to-south,
  // cars ahead and oncoming. Heading PI faces -z.
  drive(G) {
    const car = G.vehicles.cars[5];
    G.player.enterCar(car);
    car.x = 87;
    car.z = -40;
    car.heading = Math.PI;
    car.speed = 16;
    car.sync();
    // A traffic car ahead on the same road, and one oncoming behind.
    const t1 = G.vehicles.cars[0];
    t1.x = 87;
    t1.z = -72;
    t1.heading = Math.PI;
    t1.speed = 10;
    t1.traffic = { horizontal: false, dir: -1, road: 87, turnedAt: new Set() };
    const t2 = G.vehicles.cars[1];
    t2.x = 87;
    t2.z = -8;
    t2.heading = 0;
    t2.speed = 9;
    t2.traffic = { horizontal: false, dir: 1, road: 87, turnedAt: new Set() };
    G.missions.setIndex(1);
    G.money = 500;
    return { offset: { x: -2, y: 7, z: 15 }, look: { x: 0, y: 1.5, z: -26 } };
  },

  // Mission moment: Dante on the docks pier at the package, ocean behind.
  docks(G) {
    G.player.x = PLACES.docks.x + 2;
    G.player.z = PLACES.docks.z - 14;
    G.player.heading = Math.PI;
    G.player.group.position.set(G.player.x, 0.5, G.player.z);
    G.player.group.rotation.y = G.player.heading;
    G.missions.setIndex(1);
    G.money = 500;
    return { offset: { x: 10, y: 6, z: 14 }, look: { x: 0, y: 2, z: -18 } };
  },
};

// Read ?shot= from the URL; null when absent.
export function shotFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get('shot');
  } catch (e) {
    return null;
  }
}

// Apply a scene. Returns its camera pose, or null when there is no scene.
export function applyShot(name, G) {
  const scene = SCENES[name];
  if (!scene) return null;
  return scene(G);
}
