import type { StageIndex, GameMode } from '../types';

const EAT_BUFFER = 1.2;

/**
 * Pure function — no Phaser dependency.
 * isEndlessPostStage3: true when mode=endless and playerStage=3
 */
export function canEat(
  playerStage: StageIndex,
  playerMass: number,
  entityStage: StageIndex,
  entityMass: number,
  isEndlessPostStage3: boolean,
): boolean {
  if (!isEndlessPostStage3) {
    if (entityStage > playerStage) return false;
    if (entityStage < playerStage) return true;
  }
  // Same stage (or Endless post-stage-3 mass-only mode)
  return playerMass > entityMass * EAT_BUFFER;
}

/**
 * Pure function — no Phaser dependency.
 */
export function canBeKilled(
  playerStage: StageIndex,
  playerMass: number,
  entityStage: StageIndex,
  entityMass: number,
  isEndlessPostStage3: boolean,
): boolean {
  if (!isEndlessPostStage3) {
    if (entityStage < playerStage) return false;
    if (entityStage > playerStage) return true;
  }
  // Same stage (or Endless post-stage-3)
  return entityMass > playerMass * EAT_BUFFER;
}

// ─── Phaser-dependent ────────────────────────────────────────────────────────
// The CollisionSystem class uses Player and CelestialBody which are Phaser
// game objects. This class is tested manually via the running game.

export const PULL_FORCE = 60; // px/s²

export class CollisionSystem {
  private mode: GameMode;

  constructor(mode: GameMode) {
    this.mode = mode;
  }

  private isEndlessPostStage3(playerStage: StageIndex): boolean {
    return this.mode === 'endless' && playerStage === 3;
  }

  setupOverlaps(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scene: any,
    player: { x: number; y: number; state: { stage: StageIndex; mass: number; eatCooldownMs: number; lastEatTime: number; pullRadius: number } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    group: any,
    onEat: (body: { cbStage: StageIndex; cbMass: number }) => void,
    onDie: () => void,
  ): void {
    scene.physics.add.overlap(player, group, (_p: unknown, _e: unknown) => {
      const entity = _e as { cbStage: StageIndex; cbMass: number };
      const eps3 = this.isEndlessPostStage3(player.state.stage);
      if (canEat(player.state.stage, player.state.mass, entity.cbStage, entity.cbMass, eps3)) {
        const now = scene.time.now;
        if (now - player.state.lastEatTime >= player.state.eatCooldownMs) {
          onEat(entity);
        }
      } else if (canBeKilled(player.state.stage, player.state.mass, entity.cbStage, entity.cbMass, eps3)) {
        onDie();
      }
    });
  }

  applyGravityPull(
    player: { x: number; y: number; state: { pullRadius: number } },
    entities: Array<{ x: number; y: number; body: unknown }>,
    delta: number,
  ): void {
    if (player.state.pullRadius <= 0) return;
    const px = player.x;
    const py = player.y;
    for (const e of entities) {
      const dx = px - e.x;
      const dy = py - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < player.state.pullRadius && dist > 0) {
        const force = (PULL_FORCE * delta) / 1000;
        const body = e.body as { velocity: { x: number; y: number } };
        body.velocity.x += (dx / dist) * force;
        body.velocity.y += (dy / dist) * force;
      }
    }
  }
}
