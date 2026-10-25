/** Central gameplay tuning. Change numbers here, not inside systems. */
export const CONFIG = {
  worldSeed: 2050, // Predator Free 2050
  arenaRadius: 95,
  nest: { maxHealth: 100, radius: 3.2 },
  player: {
    maxHealth: 100,
    eyeHeight: 1.7,
    walkSpeed: 7,
    sprintSpeed: 11,
    jumpSpeed: 7.5,
    gravity: 22,
    radius: 0.5,
    lookSensitivity: 0.0022,
  },
  waves: { total: 10, breakSeconds: 6 },
} as const;
