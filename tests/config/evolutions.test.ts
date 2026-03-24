import { EVOLUTION_GATES, applyEvolutionChoice } from '../../src/config/evolutions';
import type { PlayerState } from '../../src/types';

function baseState(): PlayerState {
  return {
    mass: 100, stage: 1, choices: [],
    speed: 180, massGainRate: 1.0, collisionRadius: 32,
    eatCooldownMs: 200, pullRadius: 0, lastEatTime: 0,
  };
}

describe('EVOLUTION_GATES', () => {
  it('has exactly 3 gates', () => {
    expect(EVOLUTION_GATES).toHaveLength(3);
  });

  it('each gate has two choices', () => {
    for (const gate of EVOLUTION_GATES) {
      expect(gate.choices).toHaveLength(2);
    }
  });
});

describe('applyEvolutionChoice', () => {
  it('rocky-giant increases massGainRate by 25%', () => {
    const state = applyEvolutionChoice(baseState(), 'rocky-giant');
    expect(state.massGainRate).toBeCloseTo(1.25);
  });

  it('volatile-core increases speed by 30%', () => {
    const state = applyEvolutionChoice(baseState(), 'volatile-core');
    expect(state.speed).toBeCloseTo(180 * 1.3);
  });

  it('gas-giant increases collisionRadius by 40%', () => {
    const s = { ...baseState(), collisionRadius: 56 };
    const state = applyEvolutionChoice(s, 'gas-giant');
    expect(state.collisionRadius).toBeCloseTo(56 * 1.4);
  });

  it('dense-core sets eatCooldownMs to 100', () => {
    const state = applyEvolutionChoice(baseState(), 'dense-core');
    expect(state.eatCooldownMs).toBe(100);
  });

  it('red-giant sets pullRadius to 300', () => {
    const state = applyEvolutionChoice(baseState(), 'red-giant');
    expect(state.pullRadius).toBe(300);
  });

  it('neutron-star increases speed by 40% and reduces collisionRadius by 30%', () => {
    const s = { ...baseState(), collisionRadius: 56 };
    const state = applyEvolutionChoice(s, 'neutron-star');
    expect(state.speed).toBeCloseTo(180 * 1.4);
    expect(state.collisionRadius).toBeCloseTo(56 * 0.7);
  });

  it('appends choice to choices array', () => {
    const state = applyEvolutionChoice(baseState(), 'rocky-giant');
    expect(state.choices).toContain('rocky-giant');
  });
});
