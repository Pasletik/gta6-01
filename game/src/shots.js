// Solara Bay — scripted screenshot scenes. ?shot=<name>&seed=1 puts the
// game straight into a composed moment (no title screen, fixed camera),
// so the four screenshots are reproducible renders of the real game.

export function applyShot(G, name) {
  const V = G.vehicles;
  const P = G.player;
  G.shotMode = true;
  G.state = 'playing';
  G.hud.showScreen(null);
  // a living city in every shot: traffic rolling, peds out, HUD on
  const scenes = {
    // cover: Dante fleeing north up the main avenue in the getaway car,
    // two cruisers closing in ahead, one more coming up behind
    chase() {
      const car = V.parked[0];
      P.car = car;
      P.group.visible = false;
      car.x = 0; car.z = 96; car.heading = Math.PI; car.speed = 26;
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
      P.pos.set(car.x, 0, car.z);
      G.wanted.setLevel(3);
      const spots = [[-7, 66, 2.8], [7, 72, 2.9], [9, 86, 2.2]];
      spots.forEach(([x, z, h], i) => {
        const c = V.police[i];
        c.active = true;
        c.disabled = false;
        c.health = 120;
        c.mesh.visible = true;
        c.x = x; c.z = z; c.heading = h; c.speed = 30;
        c.mesh.position.set(x, 0, z);
      });
      G.missions.start();
      // car faces north (heading PI): camera sits south of it, behind it
      G.camYaw = 0;
      G.camPitch = 0.3;
      G.camDist = 11;
      G.camHeight = 4.5;
    },
    // on foot on a busy street corner, peds and traffic around
    street() {
      P.reset(48, -12, Math.PI);
      P.money = 1250;
      G.missions.start();
      // on road x=48 looking north down the avenue, clear of the park trees
      G.camYaw = 0;
      G.camPitch = 0.3;
      G.camDist = 10;
      G.camHeight = 4.5;
    },
    // driving fast down the main avenue
    drive() {
      const car = V.parked[3];
      P.car = car;
      P.group.visible = false;
      car.x = 0; car.z = -96; car.heading = 0; car.speed = 30;
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
      P.pos.set(car.x, 0, car.z);
      P.money = 500;
      G.missions.start();
      // car faces south (heading 0): camera sits north of it, behind it
      G.camYaw = Math.PI;
      G.camPitch = 0.26;
      G.camDist = 12;
      G.camHeight = 4.5;
    },
    // the docks: mission 1 beacon over the pier, the blue coupe waiting
    docks() {
      P.reset(108, 150, Math.PI * 0.9);
      G.missions.start();
      G.camYaw = Math.PI * 1.1;
      G.camPitch = 0.42;
      G.camDist = 13;
      G.camHeight = 5.5;
    },
  };
  const scene = scenes[name] || scenes.street;
  scene();
  // settle the world a few frames so traffic and the beacon are in place
  for (let i = 0; i < 5; i++) {
    V.updateTraffic(0.12);
    V.updatePolice(0.12, G);
  }
}
