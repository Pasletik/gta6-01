# Solara Bay — an open-world crime story

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Pasletik/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Pasletik/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

My referral: [fdvwjd8e](https://make.fun/r/fdvwjd8e)

**Solara Bay** is a complete open-world crime game in the spirit of GTA 6, built from scratch in three.js. A fictional sun-soaked coastal city, an original story, and no asset from any commercial game.

## The game

Dante Cole is out of luck and into debt. Rosa Delgado, who runs the garage on Marlin Street, offers him a way out: three jobs, one night, no questions.

- **Wheels Up** — steal a car and bring it to Delgado Auto.
- **The Package** — pick up a package at the docks and deliver it to the Seaview Motel while the cops close in.
- **Heat Wave** — lose a two-star wanted level at Solara Paint & Body.

Then the city is yours to roam.

## Systems

- A procedural coastal city: road grid, buildings, a central park, a beach and the ocean
- Third-person on-foot movement with mouse-look camera, and arcade driving
- Cars to steal, traffic that follows the road grid, and pedestrians who scatter
- A wanted level (0–3 stars) with police cars that chase, ram and arrest
- Combat: a pistol with tracers, muzzle flash and destructible patrol cars
- A HUD with a live minimap, health, money and mission objectives
- Synthesized WebAudio sound: engine hum, sirens, gunshots and pickups
- Start screen, pause, wasted / busted / story-complete screens, and a localStorage save

## Controls

| Keys | Action |
| --- | --- |
| W A S D | Move / drive |
| Mouse | Look (click to lock) |
| Shift | Run |
| E | Enter / exit a car |
| Click | Shoot |
| R | Reload |
| Space | Handbrake |
| P / Esc | Pause |
| M | Mute |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Everything is static files under `game/`; the game makes no network request. three.js r160 is vendored as `game/vendor/three.module.min.js`.

## License

MIT — see [LICENSE](LICENSE).
