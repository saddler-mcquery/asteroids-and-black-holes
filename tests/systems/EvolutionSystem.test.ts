import { getNextThreshold, shouldTriggerGate, gateIndexForStage } from '../../src/systems/EvolutionSystem';

describe('getNextThreshold', () => {
  it('returns 100 for stage 0', () => expect(getNextThreshold(0)).toBe(100));
  it('returns 1000 for stage 1', () => expect(getNextThreshold(1)).toBe(1000));
  it('returns 10000 for stage 2', () => expect(getNextThreshold(2)).toBe(10000));
  it('returns null for stage 3 (no further threshold)', () => expect(getNextThreshold(3)).toBeNull());
});

describe('shouldTriggerGate', () => {
  it('triggers when mass meets threshold', () => {
    expect(shouldTriggerGate(100, 0)).toBe(true);
    expect(shouldTriggerGate(999, 0)).toBe(true);
  });

  it('does not trigger when mass is below threshold', () => {
    expect(shouldTriggerGate(99, 0)).toBe(false);
  });

  it('never triggers at stage 3', () => {
    expect(shouldTriggerGate(999999, 3)).toBe(false);
  });
});

describe('gateIndexForStage', () => {
  it('maps stage 0 to gate index 0', () => expect(gateIndexForStage(0)).toBe(0));
  it('maps stage 1 to gate index 1', () => expect(gateIndexForStage(1)).toBe(1));
  it('maps stage 2 to gate index 2', () => expect(gateIndexForStage(2)).toBe(2));
});
