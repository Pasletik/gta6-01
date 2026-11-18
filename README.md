[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![make.fun rank](https://make.fun/badge/gta6-01/Pasletik/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![make.fun reward](https://make.fun/badge/gta6-01/Pasletik/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

# Solara Bay

An open-world crime game in the spirit of GTA 6, built for the make.fun
gta6-01 bounty. A complete playable city in your browser — no build step, no
network requests, everything vendored under `game/`.

My referral: [fdvwjd8e](https://make.fun/r/fdvwjd8e)

## The game

You are **Dante Cole**, fresh out and broke in the coastal city of **Solara
Bay**. The fixer **Rosa Delgado** has three jobs for you:

1. **Wheels Up** — steal a car (and mind the witnesses).
2. **The Package** — pick up the package on the docks pier, on foot.
3. **Heat Wave** — lose a three-star wanted level and reach the safehouse.

Explore a 7×7 road-grid city with a central park, a beach, the ocean and a
working docks pier. Walk the sidewalks or drive any car you can get into —
traffic cruises the grid, pedestrians stroll and flee, and the Solara Bay
police chase, ram and arrest you when the heat is on. Fight back with a
pistol; a disabled police car buys you breathing room.

## Features

- Third-person on-foot movement with mouse-orbit camera, plus driving with
  acceleration, braking, reverse and steering.
- Wanted level 0–3 stars with police cars that chase, ram and bust you;
  heat decays when you keep your nose clean.
- Pistol combat with tracers, muzzle flash and hit reactions.
- HUD with live minimap, health, money, wanted stars, speed and the current
  mission objective.
- Synthesized WebAudio sound: engine hum, two-tone sirens, gunshots,
  pickups and crashes — no audio files.
- Particles: exhaust, sparks, debris, smoke and pickup sparkles.
- Title, pause, wasted, busted and complete screens; progress saves to
  localStorage with a Continue option.
- Deterministic from `?seed=1`; scripted scenes via `?shot=<name>` for the
  screenshots (`chase`, `street`, `drive`, `docks`).

## Play it

Serve `game/` with any static server and open `game/index.html`:

```sh
cd game && python3 -m http.server 8080
```

Controls: **WASD** move · **Mouse** look · **E** enter/exit car · **Click**
shoot · **Shift** run · **P** pause · **M** mute.

## Layout

- `game/index.html` — page, HUD and screens.
- `game/src/main.js` — boot, game loop, driving, camera, save.
- `game/src/world.js` — the city: roads, buildings, park, beach, ocean, docks.
- `game/src/vehicles.js` — cars, traffic AI, police chase.
- `game/src/peds.js` — pedestrians: walk, flee, go down.
- `game/src/player.js` — Dante on foot.
- `game/src/combat.js` — pistol, tracers, muzzle flash.
- `game/src/wanted.js` — wanted level and bust logic.
- `game/src/missions.js` — the three-job story and beacons.
- `game/src/effects.js` — particle pool.
- `game/src/audio.js` — synthesized WebAudio sound.
- `game/src/hud.js` — HUD, minimap and screens.
- `game/src/input.js` — keyboard and mouse.
- `game/src/shots.js` — scripted screenshot scenes.
- `game/src/textures.js` — procedural canvas textures.
- `game/src/config.js` — tuning constants and places.
- `game/src/random.js` — seeded RNG.
- `game/vendor/three.module.min.js` — vendored three.js.
- `main.ts` — hands the game in: copies `game/` + `screenshots/` to
  `/output` and writes `dossier.json`.

## License

MIT — see [LICENSE](LICENSE).
