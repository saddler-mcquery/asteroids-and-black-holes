# Asteroids & Black Holes — Game Design Spec

**Date:** 2026-03-23
**Inspired by:** Drifter Star Evolution (Steam)
**Status:** Approved

---

## Overview

A browser-based 2.5D cosmic "eat-to-grow" game. The player starts as a tiny asteroid and devours surrounding celestial matter to evolve through four stages — Asteroid, Planet, Star, and Black Hole. At each evolution threshold, the game pauses to present a strategic two-choice gate that grants a stat bonus and shapes the player's visual identity.

Two modes are available at the main menu:
- **Normal:** Reach Black Hole stage to win. Fixed difficulty curve.
- **Endless:** No win state. The game continues indefinitely after Black Hole with escalating difficulty. Score and survival time are the only goals.

---

## Stack

| Concern | Choice |
|---------|--------|
| Language | TypeScript |
| Build tool | Vite |
| Game framework | Phaser 3 |
| Physics | Phaser Arcade Physics |
| Rendering | Phaser WebGL (Canvas fallback) |

---

## Project Structure

```
src/
  scenes/
    Boot.ts            — asset preloading
    MainMenu.ts        — title screen
    Game.ts            — core game loop scene
    EvolutionGate.ts   — full-screen evolution choice overlay
    GameOver.ts        — score + death/win screen
  entities/
    Player.ts          — player state, physics body, sprite
    CelestialBody.ts   — NPC entity (pooled)
    EntityPool.ts      — object pool to prevent GC spikes
  systems/
    SpawnSystem.ts     — maintains entity density around player
    CollisionSystem.ts — eat/die resolution
    EvolutionSystem.ts — mass threshold tracking, gate trigger
  config/
    stages.ts          — stage definitions (mass thresholds, sprites, scale)
    evolutions.ts      — evolution choice definitions per gate
  ui/
    HUD.ts             — stage label, mass progress bar, score
docs/
  superpowers/
    specs/
      2026-03-23-game-design.md
```

---

## Game Modes

`Game.ts` receives a `mode` value via Phaser scene data: `this.scene.start('Game', { mode: 'normal' | 'endless' })`. `MainMenu` sets this based on the player's button choice. Both modes share all core systems; mode-specific behaviour is gated by a single `this.mode` check in `Game.ts` and `EvolutionSystem`.

| Aspect | Normal | Endless |
|--------|--------|---------|
| Win condition | Reach Black Hole (mass ≥ 10000) | None |
| Loss condition | Get eaten | Get eaten |
| Post-stage-3 eat/die | N/A (game ends) | Pure mass check only (stage gate dropped) |
| Difficulty after stage 3 | N/A | NPC mass scales up over time (see Spawn System) |
| HUD mass bar at stage 3 | N/A | Shows time survived |
| GameOver screen | Stage reached + score + win/loss label | Time survived + score |

---

## Stages & Progression

| Stage | Form | Mass range | Eats (stage ≤) | Killed by (stage ≥) |
|-------|------|------------|----------------|----------------------|
| 0 | Asteroid | 1–99 | — (only dust/debris) | Stage 1+ |
| 1 | Planet | 100–999 | Stage 0 | Stage 2+ |
| 2 | Star | 1000–9999 | Stage 0–1 | Stage 3 |
| 3 | Black Hole | 10000+ | Endless only: all entities (pure mass check) | Endless only: pure mass check |

### Eat/die rule (two-part check)

Collision resolution uses **both** a stage gate and a mass check, except in Endless mode at stage 3:

1. **Stage gate (hard):** A player on stage N can only eat entities of stage ≤ N−1, and is killed by entities of stage ≥ N+1. Same-stage collisions proceed to the mass check. **Exception:** in Endless mode once the player is stage 3, the stage gate is dropped entirely — all collisions use the mass check only. This means a sufficiently massive stage-3 NPC can kill the player. In Normal mode, stage 3 is never reached as a playable state — the game ends when the final gate closes (see Win & Loss Conditions).
2. **Mass check:** Player eats an entity if `player.mass > entity.mass * 1.2`. Player dies if `entity.mass > player.mass * 1.2`. Collisions within the 1.2× buffer are ignored.

**Mass absorption:** On eat, `player.mass += entity.mass * 0.7 * player.state.massGainRate` (0.7 is the base absorption factor; `massGainRate` compounds on top of it, defaulting to 1.0).

---

## Evolution Gates

Three gates trigger as the player crosses mass thresholds. Each gate pauses the game and presents two choices. Choices grant a permanent stat bonus and alter the player's visual appearance.

| Gate | Threshold | Option A | Option B |
|------|-----------|----------|----------|
| Asteroid → Planet | mass ≥ 100 | **Rocky Giant** — +25% `massGainRate` | **Volatile Core** — +30% `speed` |
| Planet → Star | mass ≥ 1000 | **Gas Giant** — +40% `collisionRadius` | **Dense Core** — reduce eat cooldown from 200ms to 100ms |
| Star → Black Hole | mass ≥ 10000 | **Red Giant** — sets `pullRadius` to 300px (see Gravity Pull) | **Neutron Star** — +40% `speed`, `collisionRadius` ×0.7 |

### Player state

```typescript
type EvolutionChoice =
  | 'rocky-giant' | 'volatile-core'
  | 'gas-giant'   | 'dense-core'
  | 'red-giant'   | 'neutron-star';

interface PlayerState {
  mass: number;
  stage: 0 | 1 | 2 | 3;
  choices: EvolutionChoice[];    // one entry per gate crossed
  speed: number;                 // px/s; base 180, modified by choices
  massGainRate: number;          // multiplier on absorbed mass; base 1.0
  collisionRadius: number;       // px; must be kept in sync with Arcade Physics body via Player.syncPhysicsBody()
  eatCooldownMs: number;         // min ms between eats; base 200
  pullRadius: number;            // px radius of gravity attraction (Red Giant only); base 0
}
```

`collisionRadius` must be synced to the Arcade Physics body every time it changes. `Player.syncPhysicsBody()` calls `this.body.setCircle(this.state.collisionRadius)` and repositions the body offset accordingly. This must be called after applying any evolution bonus that modifies `collisionRadius`.

### Gravity pull (Red Giant)

When `pullRadius > 0`, each frame `Game.ts` iterates over all active `CelestialBody` instances within `pullRadius` of the player and applies a velocity nudge toward the player: `velocity += normalize(player.pos - entity.pos) * PULL_FORCE * delta`. `PULL_FORCE = 60` px/s². This is implemented in `CollisionSystem.applyGravityPull()`, not in Arcade Physics.

---

## Core Game Loop

Each frame in `Game.ts`:

1. Move player toward pointer position (lerped — floaty, not instant)
2. `CollisionSystem.applyGravityPull()` — nudge nearby entities toward player if `pullRadius > 0`
3. `SpawnSystem.update()` — spawn/recycle entities to maintain target density
4. `CollisionSystem.resolveOverlaps()` — eat or die via Arcade Physics overlap callbacks
5. `EvolutionSystem.check()` — if mass ≥ next threshold and gate not yet shown, pause and launch `EvolutionGate`
6. `HUD.update()` — refresh mass bar and score

---

## Input

| Platform | Control |
|----------|---------|
| Desktop | Mouse-follow: player drifts toward cursor |
| Mobile | Touch-follow: same logic via Phaser's unified `Pointer` API |
| Desktop fallback | WASD / arrow keys |

Phaser's input manager abstracts mouse and touch through the same `Pointer` API. The canvas scales to fit all viewport sizes using `Phaser.Scale.FIT`.

---

## Camera & World

- **World size:** 8000×8000px finite space
- **Camera:** follows player; zoom is calculated as `zoom = lerp(currentZoom, BASE_ZOOM / (1 + player.mass / ZOOM_SCALE), 0.02)` where `BASE_ZOOM = 1.0`, `ZOOM_SCALE = 500`. This gives zoom 1.0 at mass 0 and approaches ~0.1 at Black Hole mass. Min zoom clamped at `0.1`, max at `1.0`.
- **Boundary:** soft edge — when player is within 200px of world edge, a repulsion force of 120 px/s² pushes them back toward centre.

---

## Visual Style: Nebula Drift

- **Background:** rich purple/blue nebula gradient with layered radial overlays and parallax star field (2–3 layers at different speeds)
- **Entities:** warm-glowing spheres with radial gradient fills and soft outer glow (Phaser glow FX)
- **Player:** slightly larger glow and a subtle pulse animation to distinguish from NPCs
- **Particles:** burst of debris particles on eat; dramatic explosion particles on player death
- **Evolution gate:** full-screen overlay with animated cosmic burst, two side-by-side choice cards

---

## HUD

Minimal and non-intrusive:

- **Top-left:** current stage name + small icon
- **Bottom-centre:** thin mass progress bar (distance to next evolution gate). In Endless mode, the swap to a time-survived counter (MM:SS) happens the moment `EvolutionGate` closes and `Game` resumes after the final gate — i.e., when `EvolutionSystem` sets stage to 3.
- **Top-right:** score (total mass consumed)

---

## Scenes

### Boot
Preloads all assets (sprites, particle configs). Transitions to `MainMenu`.

### MainMenu
Title, two mode buttons ("Normal" and "Endless"), brief instructions for each. Dark nebula background with drifting NPC entities for atmosphere. Each button calls `this.scene.start('Game', { mode: 'normal' })` or `{ mode: 'endless' }` respectively.

### Game
Core loop. When a mass threshold is crossed, calls `this.scene.pause()` on itself then `this.scene.launch('EvolutionGate')`. On player death, transitions to `GameOver`.

### EvolutionGate
Overlay scene launched on top of the paused `Game` scene. On choice selection, applies bonus to `PlayerState`, then calls `this.scene.resume('Game')` and `this.scene.stop()` to return control.

### GameOver
- **Normal mode:** stage reached, final score, outcome label ("Victory" or cause of death e.g. "Devoured by a Star").
- **Endless mode:** time survived, final score, cause of death.
- "Play Again" calls `this.scene.start('Game', { mode })` preserving the same mode. "Change Mode" returns to `MainMenu`.

---

## Win & Loss Conditions

### Normal mode
- **Win:** Reaching mass 10000 triggers the Star → Black Hole evolution gate. After the player chooses, `EvolutionSystem` advances them to stage 3 and immediately transitions to the GameOver victory screen. Stage 3 is never a playable state in Normal mode — `CollisionSystem` never evaluates eat/die for a stage-3 Normal player.
- **Loss:** Player is eaten while at stage 0–2 (higher-stage entity via stage gate, or same-stage entity with `entity.mass > player.mass * 1.2`).

### Endless mode
- **No win condition.** The Star → Black Hole gate still fires at mass 10000 and grants the final evolution choice, but `EvolutionSystem` advances to stage 3 and calls `this.scene.resume('Game')` instead of transitioning to GameOver.
- **Post-stage-3:** Stage gate is dropped from `CollisionSystem`; all eat/die decisions are pure mass-based (`entity.mass > player.mass * 1.2` to die, `player.mass > entity.mass * 1.2` to eat). `SpawnSystem` activates endless difficulty escalation (see Spawn System). `HUD` replaces mass bar with time-survived counter.
- **Loss:** Player is eaten via mass-only check. `CollisionSystem` triggers death identically to Normal mode.
- **Play Again resets all state:** `this.scene.start('Game', { mode: 'endless' })` destroys and recreates the `Game` scene, which re-initialises `SpawnSystem` (including `endlessMultiplier = 1.0`) from scratch. No manual reset is needed.

---

## Spawn System

- **Target density:** 40 active entities within a spawn radius of `2 × max(viewportWidth, viewportHeight)` around the player at all times.
- Entities spawn at the outer edge of the spawn radius with a slow random inward drift velocity (20–60 px/s).
- **Stage distribution** (weighted by player stage):

| Player stage | Stage 0 % | Stage 1 % | Stage 2 % | Stage 3 % |
|-------------|-----------|-----------|-----------|-----------|
| 0 | 90% | 10% | 0% | 0% |
| 1 | 60% | 30% | 10% | 0% |
| 2 | 30% | 40% | 25% | 5% |
| 3 | 10% | 30% | 40% | 20% |

- **NPC mass ranges** (uniform random within range):

| Stage | Mass range |
|-------|-----------|
| 0 | 1–99 |
| 1 | 40–999 |
| 2 | 400–9999 |
| 3 | 4000–49999 |

Ranges intentionally overlap between stages to support the same-stage mass check.

- Off-screen entities beyond spawn radius are recycled back to the pool.

### Endless mode difficulty escalation

Active only after the player reaches stage 3 in Endless mode. Both timers start the moment `EvolutionSystem` sets stage to 3 (when the final EvolutionGate closes).

- **Mass multiplier:** Every 30 seconds, `endlessMultiplier` increases by 0.2 (starts at 1.0, no cap — intentionally aggressive). All spawned NPC mass values are multiplied by `endlessMultiplier`.
- **Stage distribution shift:** Every 60 seconds, the Stage 3 NPC spawn percentage increases by 5%, capped at 60%. The 5% is redistributed proportionally from the remaining non-Stage-3 buckets based on their current values. Buckets have a floor of 0% — once a bucket reaches 0% it no longer contributes to redistribution. Example: if Stage 0 = 0%, Stage 1 = 5%, Stage 2 = 35%, Stage 3 = 60% (capped), no further shift occurs. The initial endless distribution starts at the same table row as Stage 3 from the base distribution (10%/30%/40%/20%) and evolves from there.

---

## Eat Cooldown

To prevent mass-exploitation from rapid-fire eating, each eat event sets a `lastEatTime` timestamp on the player. The `CollisionSystem` ignores overlap events until `now - lastEatTime >= player.state.eatCooldownMs`. Base cooldown is 200ms; Dense Core reduces this to 100ms.

---

## Scoring

`score = totalMassConsumed` accumulated over the run. Displayed on GameOver screen. No persistence in MVP (no leaderboard).

---

## Out of Scope (MVP)

- Multiplayer
- Leaderboard / score persistence
- Audio / music
- Mobile-specific gestures (pinch zoom etc.)
- More than 3 evolution gates / 4 stages
- Unlockable content or meta-progression
