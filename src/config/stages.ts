import type { StageIndex } from '../types';

export interface StageDefinition {
  index: StageIndex;
  name: string;
  baseCollisionRadius: number; // px
  npcMassRange: [number, number];
}

export const STAGES: StageDefinition[] = [
  { index: 0, name: 'Asteroid',   baseCollisionRadius: 16,  npcMassRange: [1, 99] },
  { index: 1, name: 'Planet',     baseCollisionRadius: 32,  npcMassRange: [40, 999] },
  { index: 2, name: 'Star',       baseCollisionRadius: 56,  npcMassRange: [400, 9999] },
  { index: 3, name: 'Black Hole', baseCollisionRadius: 88,  npcMassRange: [4000, 49999] },
];

/** Mass thresholds that trigger each evolution gate: index 0 = Asteroid→Planet, etc. */
export const STAGE_MASS_THRESHOLDS: [number, number, number] = [100, 1000, 10000];
