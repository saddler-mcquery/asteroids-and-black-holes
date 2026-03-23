# Asteroids & Black Holes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based 2.5D cosmic eat-to-grow game with Normal and Endless modes, using Phaser 3 + TypeScript + Vite.

**Architecture:** Pure logic (collision checks, evolution thresholds, spawn distribution) is extracted into standalone functions so it can be unit-tested with Vitest without a Phaser runtime. Phaser-dependent code (scenes, game objects) is tested manually. Each system is a class that wraps the pure functions and wires them into Phaser's lifecycle.

**Tech Stack:** Phaser 3, TypeScript, Vite, Vitest

---

## File Map

```
index.html
vite.config.ts
tsconfig.json
package.json
src/
  main.ts                       — Phaser game config + boot
  types/
    index.ts                    — all shared TS types (PlayerState, GameMode, etc.)
  config/
    stages.ts                   — stage definitions (thresholds, radii, sprite keys)
    evolutions.ts               — evolution gate choice definitions + stat appliers
  entities/
    EntityPool.ts               — generic object pool
    CelestialBody.ts            — Phaser Arcade sprite for NPC entities
    Player.ts                   — player Arcade sprite + state management
  systems/
    CollisionSystem.ts          — canEat/canBeKilled pure fns + Phaser overlap wiring
    EvolutionSystem.ts          — threshold pure fns + gate trigger logic
    SpawnSystem.ts              — distribution/mass pure fns + density manager
  scenes/
    Boot.ts                     — asset preload
    MainMenu.ts                 — title + mode buttons
    Game.ts                     — core game loop
    EvolutionGate.ts            — evolution choice overlay
    GameOver.ts                 — end screen
  ui/
    HUD.ts                      — mass bar, stage label, score, time counter
tests/
  config/
    stages.test.ts
    evolutions.test.ts
  entities/
    EntityPool.test.ts
  systems/
    CollisionSystem.test.ts
    EvolutionSystem.test.ts
    SpawnSystem.test.ts
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.ts`

- [ ] **Step 1: Initialise project**

```bash
cd /Users/laura/Code/asteroids-and-black-holes
npm init -y
npm install phaser
npm install -D vite typescript vitest @vitest/coverage-v8
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "sourceMap": true,
    "outDir": "dist",
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 4: Update `package.json` scripts**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 5: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Asteroids & Black Holes</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #050510; overflow: hidden; display: flex; align-items: center; justify-content: center; height: 100vh; }
  </style>
</head>
<body>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 6: Create `src/main.ts`**

```typescript
import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { MainMenu } from './scenes/MainMenu';
import { Game } from './scenes/Game';
import { EvolutionGate } from './scenes/EvolutionGate';
import { GameOver } from './scenes/GameOver';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#050510',
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  scene: [Boot, MainMenu, Game, EvolutionGate, GameOver],
};

new Phaser.Game(config);
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```
Expected: Vite dev server at `http://localhost:5173` with no errors (blank screen is fine — scenes aren't written yet).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json index.html src/main.ts
git commit -m "feat: scaffold Vite + TypeScript + Phaser 3 project"
```

---

## Task 2: Shared Types

**Files:**
- Create: `src/types/index.ts`

No tests for types — TypeScript compile checks are sufficient.

- [ ] **Step 1: Create `src/types/index.ts`**

```typescript
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

```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Stage and Evolution Config

**Files:**
- Create: `src/config/stages.ts`
- Create: `src/config/evolutions.ts`
- Create: `tests/config/stages.test.ts`
- Create: `tests/config/evolutions.test.ts`

- [ ] **Step 1: Write failing tests for stages config**

```typescript
// tests/config/stages.test.ts
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
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- tests/config/stages.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/config/stages.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/config/stages.test.ts
```
Expected: PASS.

- [ ] **Step 5: Write failing tests for evolutions config**

```typescript
// tests/config/evolutions.test.ts
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
```

- [ ] **Step 6: Run to verify fails**

```bash
npm test -- tests/config/evolutions.test.ts
```
Expected: FAIL.

- [ ] **Step 7: Create `src/config/evolutions.ts`**

```typescript
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
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
npm test -- tests/config/evolutions.test.ts
```
Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add src/config/stages.ts src/config/evolutions.ts tests/config/
git commit -m "feat: add stage and evolution config with tests"
```

---

## Task 4: EntityPool

**Files:**
- Create: `src/entities/EntityPool.ts`
- Create: `tests/entities/EntityPool.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/entities/EntityPool.test.ts
import { EntityPool } from '../../src/entities/EntityPool';

describe('EntityPool', () => {
  it('acquires a new object when pool is empty', () => {
    let created = 0;
    const pool = new EntityPool(() => { created++; return { alive: false }; });
    pool.acquire();
    expect(created).toBe(1);
  });

  it('reuses a released object instead of creating a new one', () => {
    let created = 0;
    const pool = new EntityPool(() => { created++; return { alive: false }; });
    const obj = pool.acquire();
    pool.release(obj);
    pool.acquire();
    expect(created).toBe(1);
  });

  it('tracks active objects', () => {
    const pool = new EntityPool(() => ({ alive: false }));
    const a = pool.acquire();
    const b = pool.acquire();
    expect(pool.active).toContain(a);
    expect(pool.active).toContain(b);
    pool.release(a);
    expect(pool.active).not.toContain(a);
    expect(pool.active).toContain(b);
  });

  it('releaseAll moves all active objects to pool', () => {
    const pool = new EntityPool(() => ({ alive: false }));
    pool.acquire();
    pool.acquire();
    pool.releaseAll();
    expect(pool.active).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify fails**

```bash
npm test -- tests/entities/EntityPool.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Create `src/entities/EntityPool.ts`**

```typescript
export class EntityPool<T> {
  private pool: T[] = [];
  readonly active: T[] = [];

  constructor(private factory: () => T) {}

  acquire(): T {
    const obj = this.pool.length > 0 ? this.pool.pop()! : this.factory();
    this.active.push(obj);
    return obj;
  }

  release(obj: T): void {
    const idx = this.active.indexOf(obj);
    if (idx !== -1) this.active.splice(idx, 1);
    this.pool.push(obj);
  }

  releaseAll(): void {
    while (this.active.length > 0) {
      this.pool.push(this.active.pop()!);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/entities/EntityPool.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/entities/EntityPool.ts tests/entities/EntityPool.test.ts
git commit -m "feat: add generic EntityPool with tests"
```

---

## Task 5: CollisionSystem (pure logic)

**Files:**
- Create: `src/systems/CollisionSystem.ts`
- Create: `tests/systems/CollisionSystem.test.ts`

The pure functions are extracted so they can be unit-tested without Phaser. The `CollisionSystem` class (Phaser-dependent) is in the same file but only tested manually.

- [ ] **Step 1: Write failing tests**

```typescript
// tests/systems/CollisionSystem.test.ts
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
    // isEndlessPostStage3 = true: stage gate dropped
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
```

- [ ] **Step 2: Run to verify fails**

```bash
npm test -- tests/systems/CollisionSystem.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Create `src/systems/CollisionSystem.ts`**

```typescript
import type { StageIndex, GameMode, PlayerState } from '../types';
import type { Player } from '../entities/Player';
import type { CelestialBody } from '../entities/CelestialBody';

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
// Tested manually via the running game.

export const PULL_FORCE = 60; // px/s²

export class CollisionSystem {
  private mode: GameMode;

  constructor(mode: GameMode) {
    this.mode = mode;
  }

  private isEndlessPostStage3(player: Player): boolean {
    return this.mode === 'endless' && player.state.stage === 3;
  }

  setupOverlaps(
    scene: Phaser.Scene,
    player: Player,
    group: Phaser.Physics.Arcade.Group,
    onEat: (body: CelestialBody) => void,
    onDie: () => void,
  ): void {
    scene.physics.add.overlap(player, group, (_p, _e) => {
      const entity = _e as CelestialBody;
      const eps3 = this.isEndlessPostStage3(player);
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
    player: Player,
    entities: CelestialBody[],
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
        const body = e.body as Phaser.Physics.Arcade.Body;
        body.velocity.x += (dx / dist) * force;
        body.velocity.y += (dy / dist) * force;
      }
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/systems/CollisionSystem.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/CollisionSystem.ts tests/systems/CollisionSystem.test.ts
git commit -m "feat: add CollisionSystem pure logic with tests"
```

---

## Task 6: EvolutionSystem

**Files:**
- Create: `src/systems/EvolutionSystem.ts`
- Create: `tests/systems/EvolutionSystem.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/systems/EvolutionSystem.test.ts
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
    expect(shouldTriggerGate(999, 0)).toBe(true); // mass > threshold still triggers
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
```

- [ ] **Step 2: Run to verify fails**

```bash
npm test -- tests/systems/EvolutionSystem.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Create `src/systems/EvolutionSystem.ts`**

```typescript
import type { StageIndex, GameMode } from '../types';
import { STAGE_MASS_THRESHOLDS } from '../config/stages';
import type { Player } from '../entities/Player';

export function getNextThreshold(stage: StageIndex): number | null {
  if (stage >= 3) return null;
  return STAGE_MASS_THRESHOLDS[stage as 0 | 1 | 2];
}

export function shouldTriggerGate(mass: number, stage: StageIndex): boolean {
  const threshold = getNextThreshold(stage);
  return threshold !== null && mass >= threshold;
}

export function gateIndexForStage(stage: StageIndex): 0 | 1 | 2 {
  return stage as 0 | 1 | 2;
}

// ─── Phaser-dependent ────────────────────────────────────────────────────────

export class EvolutionSystem {
  private gateTriggered = new Set<StageIndex>();

  check(player: Player, scene: Phaser.Scene, mode: GameMode): void {
    const { stage, mass } = player.state;
    if (this.gateTriggered.has(stage)) return;
    if (!shouldTriggerGate(mass, stage)) return;

    this.gateTriggered.add(stage);
    scene.scene.pause();
    scene.scene.launch('EvolutionGate', {
      gateIndex: gateIndexForStage(stage),
      mode,
    } satisfies { gateIndex: 0 | 1 | 2; mode: GameMode });
  }

  reset(): void {
    this.gateTriggered.clear();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/systems/EvolutionSystem.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/EvolutionSystem.ts tests/systems/EvolutionSystem.test.ts
git commit -m "feat: add EvolutionSystem pure logic with tests"
```

---

## Task 7: SpawnSystem

**Files:**
- Create: `src/systems/SpawnSystem.ts`
- Create: `tests/systems/SpawnSystem.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/systems/SpawnSystem.test.ts
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
    // After 1 shift tick (60s elapsed), stage 3 goes from 20% to 25%
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
    // With multiplier 2.0 stage 1 range becomes 80-1998, well above base max 999
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
```

- [ ] **Step 2: Run to verify fails**

```bash
npm test -- tests/systems/SpawnSystem.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Create `src/systems/SpawnSystem.ts`**

```typescript
import type { StageIndex, GameMode } from '../types';
import { STAGES } from '../config/stages';
import type { CelestialBody } from '../entities/CelestialBody';
import type { EntityPool } from '../entities/EntityPool';

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
  const base: [number, number, number, number] = [...BASE_DISTRIBUTIONS[playerStage]];
  if (endlessShiftTicks <= 0) return base;

  let [d0, d1, d2, d3] = base;
  for (let t = 0; t < endlessShiftTicks; t++) {
    if (d3 >= 60) break;
    const needed = Math.min(5, 60 - d3);
    // redistribute proportionally from d0, d1, d2
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

export class SpawnSystem {
  private endlessMultiplier = 1.0;
  private stage3EntryTime: number | null = null;
  private lastShiftTick = 0;

  constructor(
    private pool: EntityPool<CelestialBody>,
    private mode: GameMode,
    private npcGroup: Phaser.Physics.Arcade.Group,
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
        e.setActive(false).setVisible(false);
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
      entity.spawn(x, y, stage, mass);
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/systems/SpawnSystem.test.ts
```
Expected: PASS.

- [ ] **Step 5: Run all tests to verify nothing broke**

```bash
npm test
```
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/systems/SpawnSystem.ts tests/systems/SpawnSystem.test.ts
git commit -m "feat: add SpawnSystem pure logic with tests"
```

---

## Task 8: Player and CelestialBody Entities

**Files:**
- Create: `src/entities/CelestialBody.ts`
- Create: `src/entities/Player.ts`

These extend Phaser game objects — no unit tests. Verified manually via the running game.

- [ ] **Step 1: Create `src/entities/CelestialBody.ts`**

```typescript
import Phaser from 'phaser';
import type { StageIndex } from '../types';
import { STAGES } from '../config/stages';

export class CelestialBody extends Phaser.Physics.Arcade.Sprite {
  cbStage: StageIndex = 0;
  cbMass = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'celestial-0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setActive(false).setVisible(false);
  }

  spawn(x: number, y: number, stage: StageIndex, mass: number): void {
    this.cbStage = stage;
    this.cbMass = mass;
    const def = STAGES[stage];
    const radius = def.baseCollisionRadius * (0.5 + mass / (def.npcMassRange[1] * 2));
    this.setTexture(`celestial-${stage}`);
    this.setPosition(x, y);
    this.setActive(true).setVisible(true);
    (this.body as Phaser.Physics.Arcade.Body).setCircle(radius, -radius, -radius);
    const speed = 20 + Math.random() * 40;
    const angle = Math.random() * Math.PI * 2;
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.setScale(radius / 32);
  }
}
```

- [ ] **Step 2: Create `src/entities/Player.ts`**

```typescript
import Phaser from 'phaser';
import type { PlayerState, StageIndex, EvolutionChoice } from '../types';
import { STAGES } from '../config/stages';
import { applyEvolutionChoice } from '../config/evolutions';

const BASE_SPEED = 180;

export function createInitialPlayerState(): PlayerState {
  return {
    mass: 1,
    stage: 0,
    choices: [],
    speed: BASE_SPEED,
    massGainRate: 1.0,
    collisionRadius: STAGES[0].baseCollisionRadius,
    eatCooldownMs: 200,
    pullRadius: 0,
    lastEatTime: 0,
  };
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  state: PlayerState;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player-0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.state = createInitialPlayerState();
    this.syncPhysicsBody();
  }

  /** Must be called after any change to state.collisionRadius. */
  syncPhysicsBody(): void {
    const r = this.state.collisionRadius;
    (this.body as Phaser.Physics.Arcade.Body).setCircle(r, -r, -r);
    this.setScale(r / 32);
    this.setTexture(`player-${this.state.stage}`);
  }

  applyChoice(choice: EvolutionChoice): void {
    this.state = applyEvolutionChoice(this.state, choice);
    this.syncPhysicsBody();
  }

  advanceStage(): void {
    const next = (this.state.stage + 1) as StageIndex;
    this.state = {
      ...this.state,
      stage: next,
      collisionRadius: this.state.collisionRadius, // keep evolved radius
    };
    this.syncPhysicsBody();
  }

  eat(entityMass: number, now: number): void {
    this.state = {
      ...this.state,
      mass: this.state.mass + entityMass * 0.7 * this.state.massGainRate,
      lastEatTime: now,
    };
  }

  moveToward(targetX: number, targetY: number, delta: number): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 4) {
      this.setVelocity(0, 0);
      return;
    }
    const lerpFactor = Math.min(1, (delta / 1000) * 4);
    const vx = (dx / dist) * this.state.speed * lerpFactor;
    const vy = (dy / dist) * this.state.speed * lerpFactor;
    this.setVelocity(vx, vy);
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors (Phaser types are used here; if missing run `npm install -D @types/node`).

- [ ] **Step 4: Commit**

```bash
git add src/entities/CelestialBody.ts src/entities/Player.ts
git commit -m "feat: add Player and CelestialBody game objects"
```

---

## Task 9: Boot and MainMenu Scenes

**Files:**
- Create: `src/scenes/Boot.ts`
- Create: `src/scenes/MainMenu.ts`

Tested manually via the running game.

- [ ] **Step 1: Create `src/scenes/Boot.ts`**

Generates procedural textures for all entity types (avoids needing image assets for MVP).

```typescript
import Phaser from 'phaser';

const STAGE_COLORS = [0xb0a090, 0x4488ff, 0xffcc44, 0x8822ff];
const PLAYER_COLORS = [0xd0b870, 0x66aaff, 0xffee66, 0xaa44ff];

function makeGlowCircle(scene: Phaser.Scene, key: string, color: number, radius: number): void {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const size = radius * 2 + 16;
  g.fillStyle(color, 0.15);
  g.fillCircle(size / 2, size / 2, radius + 8);
  g.fillStyle(color, 0.5);
  g.fillCircle(size / 2, size / 2, radius);
  g.fillStyle(0xffffff, 0.8);
  g.fillCircle(size / 2, size / 2, radius * 0.4);
  g.generateTexture(key, size, size);
  g.destroy();
}

export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  create(): void {
    const radii = [16, 32, 56, 88];
    for (let i = 0; i < 4; i++) {
      makeGlowCircle(this, `celestial-${i}`, STAGE_COLORS[i], radii[i]);
      makeGlowCircle(this, `player-${i}`, PLAYER_COLORS[i], radii[i]);
    }
    this.scene.start('MainMenu');
  }
}
```

- [ ] **Step 2: Create `src/scenes/MainMenu.ts`**

```typescript
import Phaser from 'phaser';

const BG_COLOR = 0x050510;
const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'system-ui, sans-serif',
  color: '#e8d8f8',
};

export class MainMenu extends Phaser.Scene {
  constructor() { super('MainMenu'); }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, BG_COLOR);
    this.createStarfield(width, height);

    this.add.text(width / 2, height * 0.25, 'ASTEROIDS &\nBLACK HOLES', {
      ...TEXT_STYLE, fontSize: '56px', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.42, 'Devour. Evolve. Ascend.', {
      ...TEXT_STYLE, fontSize: '20px', alpha: 0.7,
    }).setOrigin(0.5);

    this.makeButton(width / 2 - 140, height * 0.62, 'NORMAL', () => {
      this.scene.start('Game', { mode: 'normal' });
    });

    this.makeButton(width / 2 + 140, height * 0.62, 'ENDLESS', () => {
      this.scene.start('Game', { mode: 'endless' });
    });

    this.add.text(width / 2 - 140, height * 0.72, 'Reach Black Hole to win', {
      ...TEXT_STYLE, fontSize: '13px', alpha: 0.5,
    }).setOrigin(0.5);

    this.add.text(width / 2 + 140, height * 0.72, 'Survive as long as possible', {
      ...TEXT_STYLE, fontSize: '13px', alpha: 0.5,
    }).setOrigin(0.5);
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const btn = this.add.rectangle(x, y, 220, 54, 0x2a1a4a, 1)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x8844cc);
    const txt = this.add.text(x, y, label, {
      ...TEXT_STYLE, fontSize: '22px', fontStyle: 'bold',
    }).setOrigin(0.5);
    btn.on('pointerover', () => btn.setFillColor(0x4a2a7a));
    btn.on('pointerout',  () => btn.setFillColor(0x2a1a4a));
    btn.on('pointerdown', onClick);
  }

  private createStarfield(width: number, height: number): void {
    for (let i = 0; i < 120; i++) {
      const alpha = 0.2 + Math.random() * 0.7;
      const size = Math.random() < 0.8 ? 1 : 2;
      this.add.rectangle(
        Math.random() * width, Math.random() * height,
        size, size, 0xffffff, alpha,
      );
    }
  }
}
```

- [ ] **Step 3: Run dev server and verify MainMenu renders**

```bash
npm run dev
```
Open `http://localhost:5173` — you should see the title screen with two buttons (Normal / Endless). Clicking either starts the (currently empty) Game scene.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/Boot.ts src/scenes/MainMenu.ts
git commit -m "feat: add Boot and MainMenu scenes"
```

---

## Task 10: HUD

**Files:**
- Create: `src/ui/HUD.ts`

- [ ] **Step 1: Create `src/ui/HUD.ts`**

```typescript
import Phaser from 'phaser';
import type { PlayerState, GameMode } from '../types';
import { STAGES, STAGE_MASS_THRESHOLDS } from '../config/stages';

const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'system-ui, sans-serif',
  color: '#e8d8f8',
  fontSize: '16px',
};

export class HUD {
  private stageLabel: Phaser.GameObjects.Text;
  private scoreLabel: Phaser.GameObjects.Text;
  private barBg: Phaser.GameObjects.Rectangle;
  private barFill: Phaser.GameObjects.Rectangle;
  private barLabel: Phaser.GameObjects.Text;

  private static readonly BAR_W = 400;
  private static readonly BAR_H = 10;

  constructor(scene: Phaser.Scene) {
    const { width, height } = scene.scale;
    const cx = width / 2;
    const by = height - 24;

    this.stageLabel = scene.add.text(16, 16, '', TEXT_STYLE).setScrollFactor(0).setDepth(10);
    this.scoreLabel = scene.add.text(width - 16, 16, '', TEXT_STYLE)
      .setOrigin(1, 0).setScrollFactor(0).setDepth(10);

    this.barBg = scene.add.rectangle(cx, by, HUD.BAR_W, HUD.BAR_H, 0x333355)
      .setScrollFactor(0).setDepth(10).setOrigin(0.5, 0.5);
    this.barFill = scene.add.rectangle(cx - HUD.BAR_W / 2, by, 0, HUD.BAR_H, 0xaa66ff)
      .setScrollFactor(0).setDepth(11).setOrigin(0, 0.5);
    this.barLabel = scene.add.text(cx, by - 14, '', { ...TEXT_STYLE, fontSize: '12px' })
      .setOrigin(0.5, 1).setScrollFactor(0).setDepth(10);
  }

  update(state: PlayerState, score: number, mode: GameMode, stage3ElapsedMs: number): void {
    const stageDef = STAGES[state.stage];
    this.stageLabel.setText(`${stageDef.name}  ✦ ${Math.floor(state.mass)}`);
    this.scoreLabel.setText(`Score: ${Math.floor(score)}`);

    if (mode === 'endless' && state.stage === 3) {
      // Show time survived instead of mass bar
      const secs = Math.floor(stage3ElapsedMs / 1000);
      const mm = String(Math.floor(secs / 60)).padStart(2, '0');
      const ss = String(secs % 60).padStart(2, '0');
      this.barFill.setSize(0, HUD.BAR_H);
      this.barLabel.setText(`Time at Black Hole: ${mm}:${ss}`);
    } else {
      const threshold = STAGE_MASS_THRESHOLDS[state.stage as 0 | 1 | 2] ?? state.mass;
      const prevThreshold = state.stage > 0 ? STAGE_MASS_THRESHOLDS[(state.stage - 1) as 0 | 1 | 2] : 0;
      const progress = Math.min(1, (state.mass - prevThreshold) / (threshold - prevThreshold));
      this.barFill.setSize(HUD.BAR_W * progress, HUD.BAR_H);
      this.barLabel.setText(`Next evolution: ${Math.floor(threshold - state.mass)} mass`);
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/HUD.ts
git commit -m "feat: add HUD component"
```

---

## Task 11: Game Scene

**Files:**
- Create: `src/scenes/Game.ts`

The core loop — wires all systems together. Tested manually.

- [ ] **Step 1: Create `src/scenes/Game.ts`**

```typescript
import Phaser from 'phaser';
import type { GameMode, GameSceneData } from '../types';
import { Player } from '../entities/Player';
import { CelestialBody } from '../entities/CelestialBody';
import { EntityPool } from '../entities/EntityPool';
import { CollisionSystem } from '../systems/CollisionSystem';
import { EvolutionSystem } from '../systems/EvolutionSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { HUD } from '../ui/HUD';

const WORLD_SIZE = 8000;
const BASE_ZOOM = 1.0;
const ZOOM_SCALE = 500;
const BOUNDARY_MARGIN = 200;
const BOUNDARY_FORCE = 120;

export class Game extends Phaser.Scene {
  private player!: Player;
  private npcGroup!: Phaser.Physics.Arcade.Group;
  private pool!: EntityPool<CelestialBody>;
  private collisionSystem!: CollisionSystem;
  private evolutionSystem!: EvolutionSystem;
  private spawnSystem!: SpawnSystem;
  private hud!: HUD;
  private mode: GameMode = 'normal';
  private score = 0;
  private dead = false;
  private stage3EntryTime: number | null = null;

  constructor() { super('Game'); }

  init(data: GameSceneData): void {
    this.mode = data.mode ?? 'normal';
    this.score = 0;
    this.dead = false;
    this.stage3EntryTime = null;
  }

  create(): void {
    this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);

    this.createBackground();

    this.player = new Player(this, WORLD_SIZE / 2, WORLD_SIZE / 2);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.npcGroup = this.physics.add.group({ classType: CelestialBody });
    this.pool = new EntityPool(() => new CelestialBody(this, 0, 0));

    this.collisionSystem = new CollisionSystem(this.mode);
    this.collisionSystem.setupOverlaps(this, this.player, this.npcGroup,
      (body) => this.onEat(body),
      () => this.onDie(),
    );

    this.evolutionSystem = new EvolutionSystem();

    this.spawnSystem = new SpawnSystem(this.pool, this.mode, this.npcGroup);

    this.hud = new HUD(this);

    // Listen for evolution gate result on this scene's own emitter.
    // EvolutionGate emits on this scene (not its own) so the listener
    // survives gate scene stop/relaunch cycles.
    this.events.on('choice-made', this.onEvolutionChoice, this);
  }

  update(_time: number, delta: number): void {
    if (this.dead) return;

    const ptr = this.input.activePointer;
    const worldPt = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
    this.player.moveToward(worldPt.x, worldPt.y, delta);

    this.applyBoundaryForce();

    this.collisionSystem.applyGravityPull(
      this.player,
      this.pool.active,
      delta,
    );

    const { width, height } = this.scale;
    this.spawnSystem.update(
      this.player.state.stage,
      this.player.x, this.player.y,
      width, height,
      this.time.now,
    );

    this.evolutionSystem.check(this.player, this, this.mode);

    const stage3Elapsed = this.stage3EntryTime !== null
      ? this.time.now - this.stage3EntryTime
      : 0;

    this.hud.update(this.player.state, this.score, this.mode, stage3Elapsed);

    // Zoom
    const targetZoom = Math.max(0.1, BASE_ZOOM / (1 + this.player.state.mass / ZOOM_SCALE));
    this.cameras.main.setZoom(
      Phaser.Math.Linear(this.cameras.main.zoom, targetZoom, 0.02),
    );
  }

  private onEat(entity: CelestialBody): void {
    this.score += entity.cbMass;
    this.player.eat(entity.cbMass, this.time.now);
    this.npcGroup.remove(entity, false, false);
    this.pool.release(entity);
    entity.setActive(false).setVisible(false);
    // Particle burst
    this.add.particles(entity.x, entity.y, `celestial-${entity.cbStage}`, {
      speed: { min: 40, max: 120 },
      lifespan: 400,
      quantity: 8,
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.8, end: 0 },
    }).explode(8);
  }

  private onDie(): void {
    if (this.dead) return;
    this.dead = true;
    this.cameras.main.shake(400, 0.02);
    this.time.delayedCall(600, () => {
      this.scene.start('GameOver', {
        mode: this.mode,
        score: this.score,
        stage: this.player.state.stage,
        stageName: `Devoured as a ${['Asteroid','Planet','Star','Black Hole'][this.player.state.stage]}`,
        stage3ElapsedMs: this.stage3EntryTime !== null ? this.time.now - this.stage3EntryTime : 0,
      });
    });
  }

  private onEvolutionChoice(choice: string, gateIndex: number): void {
    this.player.applyChoice(choice as import('../types').EvolutionChoice);
    this.player.advanceStage();

    if (this.player.state.stage === 3) {
      if (this.mode === 'normal') {
        // Win
        this.scene.start('GameOver', {
          mode: 'normal',
          score: this.score,
          stage: 3,
          stageName: 'Victory — You became a Black Hole!',
          stage3ElapsedMs: 0,
          win: true,
        });
        return;
      }
      // Endless — activate escalation
      this.stage3EntryTime = this.time.now;
      this.spawnSystem.activateEndless(this.time.now);
    }
  }

  private applyBoundaryForce(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (this.player.x < BOUNDARY_MARGIN) body.velocity.x += BOUNDARY_FORCE;
    if (this.player.x > WORLD_SIZE - BOUNDARY_MARGIN) body.velocity.x -= BOUNDARY_FORCE;
    if (this.player.y < BOUNDARY_MARGIN) body.velocity.y += BOUNDARY_FORCE;
    if (this.player.y > WORLD_SIZE - BOUNDARY_MARGIN) body.velocity.y -= BOUNDARY_FORCE;
  }

  private createBackground(): void {
    this.add.rectangle(WORLD_SIZE / 2, WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE, 0x050510);
    // Nebula radial overlays
    const g = this.add.graphics();
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * WORLD_SIZE;
      const y = Math.random() * WORLD_SIZE;
      const r = 800 + Math.random() * 1200;
      g.fillStyle(i % 2 === 0 ? 0x3a0a8a : 0x0a2060, 0.06);
      g.fillCircle(x, y, r);
    }
    // Parallax star layers via TileSprite would go here; for MVP use fixed scatter
    for (let i = 0; i < 600; i++) {
      const alpha = 0.2 + Math.random() * 0.8;
      this.add.rectangle(
        Math.random() * WORLD_SIZE, Math.random() * WORLD_SIZE,
        Math.random() < 0.8 ? 1 : 2, Math.random() < 0.8 ? 1 : 2,
        0xffffff, alpha,
      );
    }
  }
}
```

- [ ] **Step 2: Run dev server — verify Normal game starts**

```bash
npm run dev
```
Click **Normal**. You should see a glowing asteroid in a nebula field. Move your mouse — the player should follow it. Entities should spawn and drift.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/Game.ts
git commit -m "feat: add core Game scene with player movement, spawning, collision"
```

---

## Task 12: EvolutionGate and GameOver Scenes

**Files:**
- Create: `src/scenes/EvolutionGate.ts`
- Create: `src/scenes/GameOver.ts`

- [ ] **Step 1: Create `src/scenes/EvolutionGate.ts`**

```typescript
import Phaser from 'phaser';
import type { GameMode } from '../types';
import { EVOLUTION_GATES } from '../config/evolutions';

interface GateData {
  gateIndex: 0 | 1 | 2;
  mode: GameMode;
}

const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'system-ui, sans-serif',
  color: '#e8d8f8',
};

export class EvolutionGate extends Phaser.Scene {
  constructor() { super('EvolutionGate'); }

  create(data: GateData): void {
    const { width, height } = this.scale;
    const gate = EVOLUTION_GATES[data.gateIndex];

    // Dark overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);

    this.add.text(width / 2, height * 0.22, 'EVOLUTION', {
      ...TEXT_STYLE, fontSize: '14px', alpha: 0.6, letterSpacing: 6,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.30, gate.label, {
      ...TEXT_STYLE, fontSize: '32px', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.38, 'Choose your evolutionary path', {
      ...TEXT_STYLE, fontSize: '16px', alpha: 0.65,
    }).setOrigin(0.5);

    const [choiceA, choiceB] = gate.choices;
    this.makeChoiceCard(width / 2 - 180, height / 2, choiceA.label, choiceA.description, () => {
      this.choose(choiceA.id, data.gateIndex);
    });
    this.makeChoiceCard(width / 2 + 180, height / 2, choiceB.label, choiceB.description, () => {
      this.choose(choiceB.id, data.gateIndex);
    });
  }

  private makeChoiceCard(x: number, y: number, label: string, desc: string, onClick: () => void): void {
    const card = this.add.rectangle(x, y, 300, 200, 0x1a0a3a, 1)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x6633aa);
    this.add.text(x, y - 40, label, { ...TEXT_STYLE, fontSize: '22px', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(x, y + 10, desc, { ...TEXT_STYLE, fontSize: '15px', wordWrap: { width: 260 }, align: 'center' }).setOrigin(0.5);
    card.on('pointerover', () => card.setFillColor(0x3a1a6a));
    card.on('pointerout',  () => card.setFillColor(0x1a0a3a));
    card.on('pointerdown', onClick);
  }

  private choose(choiceId: string, gateIndex: number): void {
    // Emit on the Game scene's emitter, not this scene's emitter.
    // This ensures the listener in Game.create() fires correctly even after
    // EvolutionGate is stopped and relaunched for subsequent gates.
    this.scene.get('Game').events.emit('choice-made', choiceId, gateIndex);
    this.scene.resume('Game');
    this.scene.stop();
  }
}
```

- [ ] **Step 2: Create `src/scenes/GameOver.ts`**

```typescript
import Phaser from 'phaser';
import type { GameMode, StageIndex } from '../types';

interface GameOverData {
  mode: GameMode;
  score: number;
  stage: StageIndex;
  stageName: string;
  stage3ElapsedMs: number;
  win?: boolean;
}

const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'system-ui, sans-serif',
  color: '#e8d8f8',
};

export class GameOver extends Phaser.Scene {
  constructor() { super('GameOver'); }

  create(data: GameOverData): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x050510);

    const title = data.win ? '✦ YOU ASCENDED ✦' : 'CONSUMED';
    this.add.text(width / 2, height * 0.28, title, {
      ...TEXT_STYLE,
      fontSize: data.win ? '52px' : '64px',
      fontStyle: 'bold',
      color: data.win ? '#cc88ff' : '#ff6644',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.42, data.stageName, {
      ...TEXT_STYLE, fontSize: '22px', alpha: 0.8,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.52, `Score: ${Math.floor(data.score)}`, {
      ...TEXT_STYLE, fontSize: '28px',
    }).setOrigin(0.5);

    if (data.mode === 'endless' && data.stage3ElapsedMs > 0) {
      const secs = Math.floor(data.stage3ElapsedMs / 1000);
      const mm = String(Math.floor(secs / 60)).padStart(2, '0');
      const ss = String(secs % 60).padStart(2, '0');
      this.add.text(width / 2, height * 0.61, `Time as Black Hole: ${mm}:${ss}`, {
        ...TEXT_STYLE, fontSize: '18px', alpha: 0.7,
      }).setOrigin(0.5);
    }

    this.makeButton(width / 2 - 110, height * 0.76, 'PLAY AGAIN', () => {
      this.scene.start('Game', { mode: data.mode });
    });

    this.makeButton(width / 2 + 110, height * 0.76, 'CHANGE MODE', () => {
      this.scene.start('MainMenu');
    });
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const btn = this.add.rectangle(x, y, 190, 48, 0x2a1a4a)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x8844cc);
    this.add.text(x, y, label, { ...TEXT_STYLE, fontSize: '18px' }).setOrigin(0.5);
    btn.on('pointerover', () => btn.setFillColor(0x4a2a7a));
    btn.on('pointerout',  () => btn.setFillColor(0x2a1a4a));
    btn.on('pointerdown', onClick);
  }
}
```

- [ ] **Step 3: Run and manually verify full Normal game loop**

```bash
npm run dev
```
- Start Normal mode
- Eat entities until mass ≥ 100 → EvolutionGate should appear with two choices
- Select a choice → game resumes, player advances to Planet stage
- Continue eating → second gate at mass 1000
- Continue → final gate at mass 10000 → after choice, GameOver victory screen
- "Play Again" and "Change Mode" buttons should both work

- [ ] **Step 4: Manually verify Endless mode**

- Start Endless mode
- Reach mass 10000 → final gate appears → after choice, game continues (no GameOver)
- HUD bottom bar changes to time counter
- Score and movement continue working
- Eventually die → GameOver shows time survived

- [ ] **Step 5: Commit**

```bash
git add src/scenes/EvolutionGate.ts src/scenes/GameOver.ts
git commit -m "feat: add EvolutionGate and GameOver scenes, complete game loop"
```

---

## Task 13: Final Tests Pass + Build

- [ ] **Step 1: Run full test suite**

```bash
npm test
```
Expected: all unit tests PASS (config, EntityPool, CollisionSystem, EvolutionSystem, SpawnSystem).

- [ ] **Step 2: Verify TypeScript compiles clean**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Production build**

```bash
npm run build
```
Expected: `dist/` folder generated with no errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete MVP game implementation — Normal and Endless modes"
```

---

## Manual Test Checklist

After implementation, verify these behaviours manually in the browser:

- [ ] MainMenu renders title, Normal and Endless buttons
- [ ] Player follows mouse on desktop, touch on mobile (test on phone or DevTools mobile emulation)
- [ ] Player eats smaller entities (glow burst particle effect)
- [ ] Player dies when touching a larger-stage entity
- [ ] Mass bar progresses toward evolution threshold
- [ ] Evolution gate pauses game, shows two card choices
- [ ] Each evolution choice applies correct stat bonus
- [ ] Camera zooms out as player grows
- [ ] Soft world boundary pushes player back from edge
- [ ] Normal mode: reaching 10000 mass triggers final gate, then victory GameOver
- [ ] Endless mode: reaching 10000 mass triggers gate, game continues, HUD shows time counter
- [ ] Endless mode: NPC mass increases over time (noticeable after ~2 minutes)
- [ ] Play Again restarts cleanly; Change Mode returns to MainMenu
