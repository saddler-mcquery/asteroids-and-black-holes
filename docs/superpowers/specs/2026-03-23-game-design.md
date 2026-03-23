# Asteroids & Black Holes — Game Design Spec

**Date:** 2026-03-23
**Inspired by:** Drifter Star Evolution (Steam)
**Status:** Approved

---

## Overview

A browser-based 2.5D cosmic "eat-to-grow" game. The player starts as a tiny asteroid and devours surrounding celestial matter to evolve through four stages — Asteroid, Planet, Star, and Black Hole. At each evolution threshold, the game pauses to present a strategic two-choice gate that grants a stat bonus and shapes the player's visual identity. The game ends when the player either reaches Black Hole stage (win) or is devoured by a larger body (loss).

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

## Stages & Progression

| Stage | Form | Mass range | Eats (stage ≤) | Killed by (stage ≥) |
|-------|------|------------|----------------|----------------------|
| 0 | Asteroid | 1–99 | — (only dust/debris) | Stage 1+ |
| 1 | Planet | 100–999 | Stage 0 | Stage 2+ |
| 2 | Star | 1000–9999 | Stage 0–1 | Stage 3 |
| 3 | Black Hole | 10000+ | Stage 0–2 | nothing (win) |

### Eat/die rule (two-part check)

Collision resolution uses **both** a stage gate and a mass check:

1. **Stage gate (hard):** A player on stage N can only eat entities of stage ≤ N−1, and is killed by entities of stage ≥ N+1. Same-stage collisions proceed to the mass check.
2. **Mass check (same-stage only):** Player eats a same-stage entity if `player.mass > entity.mass * 1.2`. Player dies to a same-stage entity if `entity.mass > player.mass * 1.2`. Collisions within the 1.2× buffer are ignored (no eat, no death).

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
- **Bottom-centre:** thin mass progress bar (distance to next evolution gate)
- **Top-right:** score (total mass consumed)

---

## Scenes

### Boot
Preloads all assets (sprites, particle configs). Transitions to `MainMenu`.

### MainMenu
Title, "Play" button, brief instructions. Dark nebula background with drifting NPC entities for atmosphere.

### Game
Core loop. When a mass threshold is crossed, calls `this.scene.pause()` on itself then `this.scene.launch('EvolutionGate')`. On player death, transitions to `GameOver`.

### EvolutionGate
Overlay scene launched on top of the paused `Game` scene. On choice selection, applies bonus to `PlayerState`, then calls `this.scene.resume('Game')` and `this.scene.stop()` to return control.

### GameOver
Shows: stage reached, final score, cause of death (e.g. "Devoured by a Star"). "Play Again" calls `this.scene.start('Game')` to restart.

---

## Win & Loss Conditions

- **Win:** Reaching mass 10000 triggers the Star → Black Hole evolution gate first. After the player makes their choice and `EvolutionGate` resumes `Game`, `EvolutionSystem` advances the player to stage 3 and immediately transitions to the GameOver victory screen — there is no continued gameplay at stage 3. The gate is the final choice; winning means surviving long enough to reach it.
- **Loss:** Collision resolution determines player is eaten (higher-stage entity, or same-stage entity with mass > player.mass × 1.2). Trigger death sequence.

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
