export type StageIndex = 0 | 1 | 2 | 3;

export type GameMode = 'normal' | 'endless';

export type EvolutionChoice =
  | 'rocky-giant'   // Asteroid → Planet: +25% massGainRate
  | 'volatile-core' // Asteroid → Planet: +30% speed
  | 'gas-giant'     // Planet → Star: +40% collisionRadius
  | 'dense-core'    // Planet → Star: eatCooldownMs 200 → 100
  | 'red-giant'     // Star → Black Hole: pullRadius = 300
  | 'neutron-star'; // Star → Black Hole: +40% speed, collisionRadius ×0.7

export interface PlayerState {
  mass: number;
  stage: StageIndex;
  choices: EvolutionChoice[];
  speed: number;           // px/s; base 180
  massGainRate: number;    // multiplier; base 1.0
  collisionRadius: number; // px; base per stage (see stages.ts)
  eatCooldownMs: number;   // ms; base 200
  pullRadius: number;      // px; base 0
  lastEatTime: number;     // ms timestamp
}

export interface CelestialBodyData {
  stage: StageIndex;
  mass: number;
}

export interface GameSceneData {
  mode: GameMode;
}
