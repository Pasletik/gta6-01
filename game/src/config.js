// Solara Bay — tuning constants and mission definitions.
// One place for every number the rest of the game reads, so balancing
// never means hunting through gameplay code.

export const CFG = {
  // City layout: 7 roads each way, 48 units apart, city spans -168..168.
  roadSpacing: 48,
  roadHalf: 6, // half-width of a road surface
  roadCount: 7, // roads at -144..144 step 48
  cityHalf: 168,
  blockSize: 36,
  // South edge: beach strip, then ocean. East edge: docks.
  beachStart: 150,
  sandDepth: 18,
  oceanY: -1.4,
  pierX: 132,
  pierZ0: 156,
  pierZ1: 208,
  // Player
  walkSpeed: 9,
  runSpeed: 13,
  playerRadius: 0.9,
  playerHealth: 100,
  // Cars
  carAccel: 22,
  carBrake: 34,
  carMaxSpeed: 34,
  carReverseMax: 10,
  carTurn: 1.9,
  trafficCount: 10,
  trafficSpeed: 11,
  parkedCount: 9,
  policeMax: 4,
  policeSpeed: 30,
  // Combat
  pistolDamage: 34,
  pistolRange: 90,
  pistolRate: 0.22, // seconds between shots
  policeCarHealth: 120,
  // Wanted
  wantedDecaySeconds: 26,
  arrestDistance: 3.2,
  arrestHoldSeconds: 1.6,
  // Camera
  camDistance: 9,
  camHeight: 4.2,
  // Minimap
  minimapSize: 168,
};

// Story missions, in order. Each has a beacon target, an action prompt and a reward.
export const MISSIONS = [
  {
    id: 'wheels-up',
    name: 'Wheels Up',
    giver: 'Rosa Delgado',
    briefing: 'Rosa needs a getaway car. Steal the blue coupe waiting on the docks pier and bring it to the marked garage.',
    steps: [
      { kind: 'go', label: 'Get to the docks pier', pos: [132, 0, 182] },
      { kind: 'steal', label: 'Steal the blue coupe on the pier', pos: [132, 0, 182] },
      { kind: 'drive', label: 'Drive the coupe to the garage', pos: [-120, 0, -120] },
    ],
    reward: 500,
  },
  {
    id: 'the-package',
    name: 'The Package',
    giver: 'Rosa Delgado',
    briefing: 'A package is stashed under the big oak in the central park. Pick it up and deliver it to Rosa at the Marlin Bar.',
    steps: [
      { kind: 'go', label: 'Pick up the package in the park', pos: [0, 0, 0] },
      { kind: 'go', label: 'Deliver it to the Marlin Bar', pos: [72, 0, 72] },
    ],
    reward: 1200,
  },
  {
    id: 'heat-wave',
    name: 'Heat Wave',
    giver: 'Rosa Delgado',
    briefing: 'The whole Solara Bay force is on you. Lose the heat: reach the beach safehouse with 3 stars on your head.',
    steps: [
      { kind: 'heat', label: 'Get the heat to 3 stars, then reach the beach safehouse', pos: [0, 0, 164] },
    ],
    reward: 2000,
  },
];

export const PALETTE = {
  sky: 0x8ec9e8,
  sun: 0xfff2cf,
  road: 0x3a3f46,
  roadLine: 0xf5d76e,
  sidewalk: 0x9aa0a3,
  grass: 0x58a447,
  sand: 0xe6cf9a,
  water: 0x2e7fa8,
  pier: 0x8a6b4a,
  building: [0xd8c9b0, 0xc9b8a3, 0xb7c4cc, 0xe0d6c2, 0xc4a484, 0xa8b8c8, 0xd9b8a6],
  glass: 0x9fc6dd,
  playerJacket: 0xe2553a,
  police: 0x1e3a5f,
  taxi: 0xf2c200,
};
