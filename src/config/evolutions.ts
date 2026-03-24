import type { EvolutionChoice, PlayerState } from '../types';

export interface GateChoice {
  id: EvolutionChoice;
  label: string;
  description: string;
}

export interface EvolutionGateDefinition {
  gateIndex: 0 | 1 | 2;
  label: string;
  choices: [GateChoice, GateChoice];
}

export const EVOLUTION_GATES: EvolutionGateDefinition[] = [
  {
    gateIndex: 0,
    label: 'Asteroid → Planet',
    choices: [
      { id: 'rocky-giant',   label: 'Rocky Giant',   description: '+25% mass gain rate' },
      { id: 'volatile-core', label: 'Volatile Core',  description: '+30% move speed' },
    ],
  },
  {
    gateIndex: 1,
    label: 'Planet → Star',
    choices: [
      { id: 'gas-giant',  label: 'Gas Giant',  description: '+40% collision radius' },
      { id: 'dense-core', label: 'Dense Core', description: 'Eat cooldown: 200ms → 100ms' },
    ],
  },
  {
    gateIndex: 2,
    label: 'Star → Black Hole',
    choices: [
      { id: 'red-giant',    label: 'Red Giant',    description: '300px gravity pull radius' },
      { id: 'neutron-star', label: 'Neutron Star', description: '+40% speed, −30% hitbox' },
    ],
  },
];

export function applyEvolutionChoice(state: PlayerState, choice: EvolutionChoice): PlayerState {
  const s = { ...state, choices: [...state.choices, choice] };
  switch (choice) {
    case 'rocky-giant':   return { ...s, massGainRate: s.massGainRate * 1.25 };
    case 'volatile-core': return { ...s, speed: s.speed * 1.3 };
    case 'gas-giant':     return { ...s, collisionRadius: s.collisionRadius * 1.4 };
    case 'dense-core':    return { ...s, eatCooldownMs: 100 };
    case 'red-giant':     return { ...s, pullRadius: 300 };
    case 'neutron-star':  return { ...s, speed: s.speed * 1.4, collisionRadius: s.collisionRadius * 0.7 };
  }
}
