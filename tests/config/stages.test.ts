import { STAGES, STAGE_MASS_THRESHOLDS } from '../../src/config/stages';

describe('STAGES', () => {
  it('has 4 entries indexed 0-3', () => {
    expect(STAGES).toHaveLength(4);
  });

  it('each stage has required fields', () => {
    for (const s of STAGES) {
      expect(s).toHaveProperty('index');
      expect(s).toHaveProperty('name');
      expect(s).toHaveProperty('baseCollisionRadius');
      expect(s).toHaveProperty('npcMassRange');
    }
  });

  it('NPC mass ranges overlap between adjacent stages', () => {
    // stage 0 max (99) > stage 1 min (40)
    expect(STAGES[0].npcMassRange[1]).toBeGreaterThan(STAGES[1].npcMassRange[0]);
  });
});

describe('STAGE_MASS_THRESHOLDS', () => {
  it('returns correct thresholds for gates', () => {
    expect(STAGE_MASS_THRESHOLDS[0]).toBe(100);   // → Planet
    expect(STAGE_MASS_THRESHOLDS[1]).toBe(1000);  // → Star
    expect(STAGE_MASS_THRESHOLDS[2]).toBe(10000); // → Black Hole
  });
});
