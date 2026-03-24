import type { StageIndex, GameMode } from '../types';
import { STAGES } from '../config/stages';

const TARGET_DENSITY = 40;
const SPAWN_RADIUS_MULT = 2;

// Base distributions per player stage: [stage0%, stage1%, stage2%, stage3%]
const BASE_DISTRIBUTIONS: Record<StageIndex, [number, number, number, number]> = {
  0: [90, 10,  0,  0],
  1: [60, 30, 10,  0],
  2: [30, 40, 25,  5],
  3: [10, 30, 40, 20],
};

/**
 * Pure function.
 * endlessShiftTicks: how many 60s ticks have elapsed since entering stage 3.
 */
export function getStageDistribution(
  playerStage: StageIndex,
  _endlessMultiplier: number,
  endlessShiftTicks: number,
): [number, number, number, number] {
  const base: [number, number, number, number] = [...BASE_DISTRIBUTIONS[playerStage]] as [number, number, number, number];
  if (endlessShiftTicks <= 0) return base;

  let [d0, d1, d2, d3] = base;
  for (let t = 0; t < endlessShiftTicks; t++) {
    if (d3 >= 60) break;
    const needed = Math.min(5, 60 - d3);
    const pool = d0 + d1 + d2;
    if (pool <= 0) break;
    d0 = Math.max(0, d0 - (d0 / pool) * needed);
    d1 = Math.max(0, d1 - (d1 / pool) * needed);
    d2 = Math.max(0, d2 - (d2 / pool) * needed);
    d3 = Math.min(60, d3 + needed);
  }
  // Normalise to 100
  const total = d0 + d1 + d2 + d3;
  return [
    (d0 / total) * 100,
    (d1 / total) * 100,
    (d2 / total) * 100,
    (d3 / total) * 100,
  ];
}

/** Pure function. Returns a random mass for an NPC of the given stage. */
export function randomNpcMass(stage: StageIndex, endlessMultiplier: number): number {
  const [min, max] = STAGES[stage].npcMassRange;
  return (Math.random() * (max - min) + min) * endlessMultiplier;
}

/**
 * Pure function. Returns endlessMultiplier for the given elapsed ms since stage-3 entry.
 * Increments by 0.2 every 30 seconds, starting at 1.0.
 */
export function advanceEndlessPhase(elapsedMsSinceStage3: number): number {
  const ticks = Math.floor(elapsedMsSinceStage3 / 30000);
  return 1.0 + ticks * 0.2;
}

// ─── Phaser-dependent ────────────────────────────────────────────────────────
// Tested manually via the running game.

interface SpawnableEntity {
  x: number;
  y: number;
  spawn(x: number, y: number, stage: StageIndex, mass: number, towardX?: number, towardY?: number): void;
  setActive(v: boolean): unknown;
  setVisible(v: boolean): unknown;
}

interface NpcGroup {
  add(entity: SpawnableEntity): void;
  remove(entity: SpawnableEntity, destroyChild?: boolean, removeFromScene?: boolean): void;
}

export class SpawnSystem {
  private endlessMultiplier = 1.0;
  private stage3EntryTime: number | null = null;
  private lastShiftTick = 0;

  constructor(
    private pool: { active: SpawnableEntity[]; acquire(): SpawnableEntity; release(e: SpawnableEntity): void; releaseAll(): void },
    private mode: GameMode,
    private npcGroup: NpcGroup,
  ) {}

  activateEndless(now: number): void {
    this.stage3EntryTime = now;
  }

  update(
    playerStage: StageIndex,
    playerX: number,
    playerY: number,
    viewportW: number,
    viewportH: number,
    now: number,
  ): void {
    // Update endless multiplier
    if (this.mode === 'endless' && this.stage3EntryTime !== null) {
      const elapsed = now - this.stage3EntryTime;
      this.endlessMultiplier = advanceEndlessPhase(elapsed);
      this.lastShiftTick = Math.floor(elapsed / 60000);
    }

    // Recycle out-of-range entities
    // Hysteresis: recycle at 2× spawnRadius so entities aren't recycled immediately after spawn
    const spawnRadius = SPAWN_RADIUS_MULT * Math.max(viewportW, viewportH);
    for (const e of [...this.pool.active]) {
      const dx = e.x - playerX;
      const dy = e.y - playerY;
      if (dx * dx + dy * dy > spawnRadius * spawnRadius * 4) {
        this.npcGroup.remove(e, false, false); // remove from group but don't destroy
        this.pool.release(e);
        e.setActive(false);
        e.setVisible(false);
      }
    }

    // Spawn to target density
    while (this.pool.active.length < TARGET_DENSITY) {
      const dist = getStageDistribution(playerStage, this.endlessMultiplier, this.lastShiftTick);
      const stage = this.pickStage(dist);
      const mass = randomNpcMass(stage, this.endlessMultiplier);
      const angle = Math.random() * Math.PI * 2;
      const x = playerX + Math.cos(angle) * spawnRadius;
      const y = playerY + Math.sin(angle) * spawnRadius;
      const entity = this.pool.acquire();
      this.npcGroup.add(entity); // register with group so overlap detection fires
      entity.spawn(x, y, stage, mass, playerX, playerY);
    }
  }

  private pickStage(dist: [number, number, number, number]): StageIndex {
    const r = Math.random() * 100;
    let acc = 0;
    for (let i = 0; i < 4; i++) {
      acc += dist[i];
      if (r < acc) return i as StageIndex;
    }
    return 3;
  }

  reset(): void {
    for (const e of [...this.pool.active]) {
      this.npcGroup.remove(e, false, false);
    }
    this.pool.releaseAll();
    this.endlessMultiplier = 1.0;
    this.stage3EntryTime = null;
    this.lastShiftTick = 0;
  }
}
