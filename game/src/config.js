// Solara Bay — configuration. All tuning in one place.
export const CFG = {
  seed: 1,
  // City grid: 7 roads each way (pitch 34), blocks between them.
  roads: [-102, -68, -34, 0, 34, 68, 102],
  blockCenters: [-85, -51, -17, 17, 51, 85],
  roadHalf: 5,            // half width of a road
  blockHalf: 12,          // half size of a city block
  worldX: 130,            // playable |x| bound
  worldZMin: -130,
  worldZMax: 200,
  beachZ0: 119,           // sand starts
  oceanZ0: 132,           // water starts
  pierX: 51,              // pier centre x
  pierZ0: 119,            // pier starts at the beach
  pierZ1: 172,            // pier end (in the ocean)
  gravity: 0,
  playerSpeed: 6.2,
  playerRun: 9.0,
  carAccel: 14,
  carBrake: 30,
  carMaxSpeed: 34,
  carReverseMax: 10,
  carTurn: 1.9,
  policeTopSpeed: 30,
  pedSpeed: 1.6,
  pedFleeSpeed: 4.2,
  wantedDecay: 20,        // seconds without crime before stars drop
  step: 1 / 60,
};

export const MISSIONS = [
  {
    id: 1, name: 'Wheels Up',
    brief: 'Rosa needs wheels. Get a car, then meet her at the docks.',
    objective: 'Get a car, then drive to the docks marker',
    target: [51, 0, 140], reward: 500,
  },
  {
    id: 2, name: 'The Package',
    brief: 'Pick up the package at the park kiosk. Deliver it to the end of the pier.',
    objective: 'Pick up the package, then deliver it to the pier end',
    target: [51, 0, 168], reward: 1200,
  },
  {
    id: 3, name: 'Heat Wave',
    brief: 'The heat is on. Lose the tail or not — get to the beach house, cash in hand.',
    objective: 'Reach the beach house marker',
    target: [-85, 0, 108], reward: 2000,
  },
];

// Lighting presets per screenshot scene / time of day.
export const PRESETS = {
  golden: { // chase cover — low warm sun from the west
    sunColor: 0xffb36b, sunIntensity: 2.6, sunPos: [-140, 70, -40],
    hemiSky: 0xffd9a8, hemiGround: 0x5a4a52, hemiIntensity: 0.55,
    fillColor: 0x8fa3c7, fillIntensity: 0.65,
    skyTop: 0x2e4a7a, skyMid: 0xff9e5e, skyBot: 0xffc98a,
    fogColor: 0xe8a06a, fogNear: 140, fogFar: 420,
    exposure: 1.15, neon: 0.9, windows: 0.7,
  },
  dusk: { // neon street on foot
    sunColor: 0x8a7bff, sunIntensity: 1.0, sunPos: [-120, 26, 60],
    hemiSky: 0x4a4a8a, hemiGround: 0x2a2430, hemiIntensity: 0.75,
    fillColor: 0x5a6db0, fillIntensity: 0.9,
    skyTop: 0x14143a, skyMid: 0x5a2a6e, skyBot: 0xff7a4a,
    fogColor: 0x3a2a55, fogNear: 120, fogFar: 380,
    exposure: 1.3, neon: 1.6, windows: 1.4,
  },
  midday: { // sunlit avenue drive
    sunColor: 0xfff2d8, sunIntensity: 2.8, sunPos: [60, 180, -60],
    hemiSky: 0xbfe3ff, hemiGround: 0x8a7a66, hemiIntensity: 0.7,
    fillColor: 0xcfe0ff, fillIntensity: 0.75,
    skyTop: 0x3f8fd2, skyMid: 0x9fd4ef, skyBot: 0xd8ecf5,
    fogColor: 0xcfe2ee, fogNear: 160, fogFar: 480,
    exposure: 1.1, neon: 0.4, windows: 0.25,
  },
  sunset: { // docks over the bay
    sunColor: 0xff8a3d, sunIntensity: 2.2, sunPos: [30, 32, 190],
    hemiSky: 0xffb38a, hemiGround: 0x4a3a4a, hemiIntensity: 0.5,
    fillColor: 0x7a86b8, fillIntensity: 0.6,
    skyTop: 0x27355e, skyMid: 0xe86a3d, skyBot: 0xffb36b,
    fogColor: 0xd88a55, fogNear: 130, fogFar: 400,
    exposure: 1.12, neon: 1.1, windows: 1.0,
  },
};

export const CAR_STYLES = [
  { name: 'Coupe', body: 0x2a6fd6, roof: 0x1c4f96, len: 4.4, w: 1.9 },
  { name: 'Sedan', body: 0xc23b2e, roof: 0x8e2a20, len: 4.7, w: 1.9 },
  { name: 'SUV', body: 0x3a3f46, roof: 0x23262b, len: 4.9, w: 2.0 },
  { name: 'Taxi', body: 0xf2c200, roof: 0xf2c200, len: 4.6, w: 1.9, taxi: true },
  { name: 'Muscle', body: 0x7a1f8f, roof: 0x4a1458, len: 4.8, w: 2.0 },
];

export const PED_SHIRTS = [0x2a9d8f, 0xe76f51, 0xf4d35e, 0x3a86ff, 0xef476f, 0x06d6a0, 0xffffff, 0x222222];
export const PED_SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];
export const PED_PANTS = [0x2b2d42, 0x4a4e69, 0x6d6875, 0x1d3557, 0x3c3c3c];

export const NEON_SIGNS = ["ROSA'S", 'HOTEL MIRAMAR', 'BAR NEON', 'TACOS EL FARO', 'PIER ARCADE'];
export const BILLBOARDS = ['NOVA COLA', 'SOLARA AIR', 'PALM BANK', 'TIDE FM'];
