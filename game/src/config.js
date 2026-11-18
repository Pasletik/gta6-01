// Solara Bay — shared constants and tuning for the whole game.
// One job: every number the other modules agree on lives here.

export const CFG = {
  // City layout: a 7x7 road grid. Block size and road width in world units.
  gridN: 7,
  blockSize: 46,
  roadWidth: 12,
  // City spans from -span/2 to +span/2 on both axes.
  span: 7 * 46 + 8 * 12, // 418
  // Sea sits south (negative z beyond the city edge); beach strip in between.
  beachDepth: 26,
  // Player / car tuning.
  walkSpeed: 9,
  runSpeed: 14,
  carAccel: 26,
  carBrake: 42,
  carMaxSpeed: 34,
  carReverseMax: 10,
  carTurn: 1.9,
  // Combat.
  pistolDamage: 34,
  pistolRange: 90,
  pistolCooldown: 0.22,
  playerMaxHealth: 100,
  // Wanted.
  wantedDecaySeconds: 26,
  maxWanted: 3,
  // Money.
  missionRewards: [500, 1200, 2000],
  // Traffic and pedestrians.
  trafficCount: 14,
  pedCount: 22,
  // Rendering.
  fogNear: 120,
  fogFar: 520,
  daySky: 0x8ec9e8,
  sunColor: 0xfff2d0,
  // Save key.
  saveKey: 'solara-bay-save-v1',
};

// Named places, in world coordinates. The city centre is (0, 0).
export const PLACES = {
  // Docks pier sticks out into the sea at the south edge.
  docks: { x: -120, z: -236 },
  // Safehouse for mission 3, on the beach at the east end.
  safehouse: { x: 150, z: -222 },
  // Central park occupies the middle block.
  park: { x: 0, z: 0 },
  // Player spawns on the sidewalk near the south-west corner.
  spawn: { x: -150, z: -150 },
};

// Mission script: id, title, objective text, reward.
export const MISSIONS = [
  {
    id: 'wheels-up',
    title: 'Wheels Up',
    objective: 'Steal a car — press E near any car',
    reward: CFG.missionRewards[0],
  },
  {
    id: 'the-package',
    title: 'The Package',
    objective: 'Pick up the package on the docks pier, on foot',
    reward: CFG.missionRewards[1],
  },
  {
    id: 'heat-wave',
    title: 'Heat Wave',
    objective: 'Lose the heat — reach the safehouse on the beach',
    reward: CFG.missionRewards[2],
  },
];

// Car paint palette (hex). Traffic and the player share it.
export const CAR_COLORS = [
  0xc0392b, 0x2471a3, 0xf1c40f, 0x27ae60, 0x8e44ad,
  0xe67e22, 0xecf0f1, 0x2c3e50, 0x16a085, 0xd35400,
];

// Pedestrian shirt palette.
export const PED_COLORS = [
  0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6,
  0x1abc9c, 0xe67e22, 0xfd79a8, 0x00cec9, 0x6c5ce7,
];
