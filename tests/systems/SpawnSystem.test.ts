import { getStageDistribution, randomNpcMass, advanceEndlessPhase } from '../../src/systems/SpawnSystem';

describe('getStageDistribution', () => {
  it('sums to 100% for each player stage', () => {
    for (let s = 0; s <= 3; s++) {
      const dist = getStageDistribution(s as 0|1|2|3, 0, 0);
      const total = dist.reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(100);
    }
  });

  it('stage 0 distribution is 90/10/0/0', () => {
    expect(getStageDistribution(0, 0, 0)).toEqual([90, 10, 0, 0]);
  });

  it('endless phase shifts stage 3 % up and others down proportionally', () => {
    const base = getStageDistribution(3, 0, 0);
    const after = getStageDistribution(3, 0, 1);
    expect(after[3]).toBeCloseTo(base[3] + 5);
    expect(after.reduce((a, b) => a + b, 0)).toBeCloseTo(100);
  });

  it('stage 3 % is capped at 60%', () => {
    const dist = getStageDistribution(3, 0, 100); // many ticks
    expect(dist[3]).toBeLessThanOrEqual(60);
    expect(dist.reduce((a, b) => a + b, 0)).toBeCloseTo(100);
  });
});

describe('randomNpcMass', () => {
  it('returns mass within stage range', () => {
    for (let i = 0; i < 50; i++) {
      const m = randomNpcMass(0, 1.0);
      expect(m).toBeGreaterThanOrEqual(1);
      expect(m).toBeLessThanOrEqual(99);
    }
  });

  it('applies endlessMultiplier', () => {
    let anyAboveBase = false;
    for (let i = 0; i < 50; i++) {
      if (randomNpcMass(1, 2.0) > 999) anyAboveBase = true;
    }
    expect(anyAboveBase).toBe(true);
  });
});

describe('advanceEndlessPhase', () => {
  it('increments endlessMultiplier by 0.2 per 30s elapsed', () => {
    expect(advanceEndlessPhase(30000)).toBeCloseTo(1.2);
    expect(advanceEndlessPhase(60000)).toBeCloseTo(1.4);
  });

  it('does not increment before 30s', () => {
    expect(advanceEndlessPhase(29000)).toBeCloseTo(1.0);
  });
});
