import { canEat, canBeKilled } from '../../src/systems/CollisionSystem';

describe('canEat', () => {
  it('player eats lower-stage entity (stage gate)', () => {
    expect(canEat(1, 50, 0, 30, false)).toBe(true);
  });

  it('player cannot eat same-stage entity without mass advantage', () => {
    expect(canEat(1, 100, 1, 100, false)).toBe(false);
  });

  it('player eats same-stage entity with 1.2× mass advantage', () => {
    expect(canEat(1, 121, 1, 100, false)).toBe(true);
  });

  it('player cannot eat higher-stage entity (Normal mode)', () => {
    expect(canEat(1, 9999, 2, 100, false)).toBe(false);
  });

  it('player can eat higher-stage entity in Endless post-stage-3 (mass check only)', () => {
    expect(canEat(3, 50000, 3, 30000, true)).toBe(true);
  });

  it('player cannot eat anything with ≤1.2× mass in Endless post-stage-3', () => {
    expect(canEat(3, 119, 3, 100, true)).toBe(false);
  });
});

describe('canBeKilled', () => {
  it('higher-stage entity kills player (Normal stage gate)', () => {
    expect(canBeKilled(1, 50, 2, 30, false)).toBe(true);
  });

  it('lower-stage entity cannot kill player', () => {
    expect(canBeKilled(1, 50, 0, 999, false)).toBe(false);
  });

  it('same-stage entity kills player when entity mass > 1.2× player mass', () => {
    expect(canBeKilled(1, 100, 1, 121, false)).toBe(true);
  });

  it('same-stage entity does not kill within 1.2× buffer', () => {
    expect(canBeKilled(1, 100, 1, 119, false)).toBe(false);
  });

  it('in Endless post-stage-3, any entity with 1.2× advantage kills player', () => {
    expect(canBeKilled(3, 100, 3, 121, true)).toBe(true);
  });
});
