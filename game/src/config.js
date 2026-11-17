// Every tuning number, colour and piece of story text in one place. Solara Bay is a
// fictional sun-soaked coastal city: no real place, no real game's names or map.
export const STEP = 1 / 60;
export const SAVE_KEY = 'solara-bay.save.v1';

export const CITY = {
  roadPitch: 60, // distance between road centre lines
  roadWidth: 12,
  roads: [-180, -120, -60, 0, 60, 120, 180], // road centre lines on x and z
  half: 186, // city edge (last road centre 180 + half road)
  beachFrom: 192, // sand strip starts here (south edge, +z)
  oceanFrom: 252, // water starts here
  oceanTo: 620,
};

export const PALETTE = {
  sky: 0x8ec9e8,
  fog: 0x9fd0e8,
  sun: 0xfff2d0,
  asphalt: 0x3a3f46,
  sidewalk: 0x9a938a,
  sand: 0xe8d49a,
  ocean: 0x2e7fa8,
  grass: 0x6fae5e,
  building: [0xd8c9b0, 0xc9b8a3, 0xb8c4c9, 0xd9a08a, 0xa8b8a0, 0xc9a8b8],
  glass: 0x9fc8e0,
};

export const PLAYER = {
  walkSpeed: 6,
  runSpeed: 10,
  radius: 0.6,
  health: 100,
};

export const CAR = {
  accel: 22,
  brake: 34,
  maxSpeed: 34,
  maxReverse: 10,
  steer: 0.55, // rad/s at full lock, scaled by speed
  grip: 6,
  radius: 2.2,
};

export const TRAFFIC = { count: 14, speed: 9, minGap: 7 };
export const PEDS = { count: 22, walkSpeed: 1.6, fleeSpeed: 4.5 };

export const WANTED = {
  max: 3,
  decaySeconds: 9, // hidden this long loses one star
  policePerStar: [0, 2, 3, 4],
};

export const GUN = { ammo: 12, range: 90, damage: 34 };

export const MISSIONS = [
  {
    id: 'wheels',
    title: 'Wheels Up',
    giver: 'Rosa Delgado',
    text: "Rosa needs wheels. Steal any parked car and bring it to Delgado Auto.",
    objective: 'Steal a car (E near a parked car)',
    reward: 300,
  },
  {
    id: 'package',
    title: 'The Package',
    giver: 'Rosa Delgado',
    text: 'A package waits at the docks. Pick it up on foot and deliver it to the Seaview Motel. The cops will not like it.',
    objective: 'Drive to the docks',
    reward: 800,
  },
  {
    id: 'heat',
    title: 'Heat Wave',
    giver: 'Rosa Delgado',
    text: 'Two stars and the whole bay PD on your tail. Reach Solara Paint & Body and get a new coat — clean plates, clean slate.',
    objective: 'Reach the paint shop',
    reward: 1500,
  },
];

export const STORY = {
  title: 'SOLARA BAY',
  tagline: 'An open-world crime story in a city of sun, salt and stolen cars.',
  intro:
    "Dante Cole is out of luck and into debt. Rosa Delgado, who runs the garage on Marlin Street, offers him a way out: three jobs, one night, no questions. Steal the wheels, move the package, lose the heat — and walk away clean.",
  controls: [
    ['W A S D', 'Move / drive'],
    ['Mouse', 'Look around (click to lock)'],
    ['Shift', 'Run'],
    ['E', 'Enter / exit a car'],
    ['Click', 'Shoot'],
    ['R', 'Reload'],
    ['Space', 'Handbrake'],
    ['P / Esc', 'Pause'],
    ['M', 'Mute'],
  ],
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
