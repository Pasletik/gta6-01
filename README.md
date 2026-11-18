[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Pasletik/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Pasletik/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

# Solara Bay

An original open-world crime game built for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01): "Make GTA 6".

My referral: [fdvwjd8e](https://make.fun/r/fdvwjd8e)

## The game

Sun-soaked coastal city, built from scratch in three.js. Play as Dante Cole,
a driver for hire in Solara Bay:

- **Open world** — a 7×7 road-grid city with a central park, a beach and an
  ocean, a pier with docks, traffic and pedestrians.
- **On foot + driving** — third-person movement, stealable cars (press E),
  traffic AI, police that chase, ram and arrest.
- **Wanted 0–3 stars** — stealing cars and firing your pistol raises the
  heat; lose the tail or get busted.
- **3 story missions** — Wheels Up, The Package, Heat Wave — with beacon
  markers, HUD objectives and cash rewards.
- **Combat, HUD + minimap** — pistol with tracers and muzzle flash, live
  minimap, health, money, stars and speed, synth sound, save game.

## Play it

Serve the `game/` folder over local HTTP and open it in desktop Chrome:

```sh
node serve.ts   # or any static server on port 8080
```

Controls: **WASD** move / drive · **Mouse** look · **E** enter / exit car ·
**Click** shoot · **Shift** sprint · **Space** brake · **Esc / P** pause.

Screenshots are deterministic: `?seed=1&shot=chase|street|drive|docks`.
Self-test: `?selftest=1`.

## Tech

- three.js r160 (vendored under `game/vendor/`)
- No network requests — every asset is generated or vendored locally
- `main.ts` copies `game/` + `screenshots/` to the output dir and writes
  `dossier.json` with the vendored make.fun library

An original game. Not affiliated with Rockstar Games or GTA.
