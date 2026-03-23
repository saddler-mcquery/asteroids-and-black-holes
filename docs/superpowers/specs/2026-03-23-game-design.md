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

| Stage | Form | Eats | Killed by |
|-------|------|------|-----------|
| 0 | Asteroid | space dust, tiny rocks | planets+ |
| 1 | Planet | asteroids, small planets | stars+ |
| 2 | Star | planets, small stars | black holes |
| 3 | Black Hole | everything | nothing (win state) |

**Eat/die rule:** Player eats an entity if `player.mass > entity.mass * 1.2`. Player dies if `entity.mass > player.mass * 1.2`. The 1.2 buffer prevents frustrating near-equal collision deaths.

**Mass absorption:** On eat, `player.mass += entity.mass * 0.7` (partial absorption, not 100%, to slow runaway growth).

---

## Evolution Gates

Three gates trigger as the player crosses stage mass thresholds. Each gate pauses the game and presents two choices. Choices grant a permanent stat bonus for the rest of the run and alter the player's visual appearance.

| Gate | Option A | Option B |
|------|----------|----------|
| Asteroid → Planet | **Rocky Giant** — +25% mass gain rate | **Volatile Core** — +30% move speed |
| Planet → Star | **Gas Giant** — +40% collision radius | **Dense Core** — +25% consumption speed |
| Star → Black Hole | **Red Giant** — +50% gravity pull radius | **Neutron Star** — +40% speed, tighter hitbox |

**Player state:**
```typescript
interface PlayerState {
  mass: number;
  stage: 0 | 1 | 2 | 3;
  variant: EvolutionChoice[];  // choices made at each gate
  speed: number;               // derived: base speed + variant bonuses
  massGainRate: number;        // derived: base rate + variant bonuses
  collisionRadius: number;     // derived: base radius + variant bonuses
}
```

---

## Core Game Loop

Each frame in `Game.ts`:

1. Move player toward pointer position (lerped — floaty, not instant)
2. `SpawnSystem` checks entity density; spawns/recycles entities at viewport edges
3. `CollisionSystem` resolves arcade overlaps — eat or die
4. `EvolutionSystem` checks mass thresholds; triggers `EvolutionGate` scene if crossed
5. `HUD` updates mass bar progress and score

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
- **Camera:** follows player, zooms out smoothly as player mass increases — the viewport reveals more of the world as you grow
- **Boundary:** soft edge — pushing against world boundary applies a gentle repulsion force, no hard wall

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
Preloads all assets (sprites, audio, particle configs). Transitions to `MainMenu`.

### MainMenu
Title, "Play" button, brief instructions. Dark nebula background with drifting NPC entities in the background for atmosphere.

### Game
Core loop. Launches `EvolutionGate` as an overlay scene when a threshold is crossed. On player death, transitions to `GameOver`.

### EvolutionGate
Overlay scene (does not replace `Game`). Pauses `Game` physics and update. Shows animated gate UI with two choice cards. On selection, applies bonus to player state, resumes `Game`.

### GameOver
Shows: stage reached, final score, cause of death (e.g. "Devoured by a Star"). "Play Again" restarts `Game` scene.

---

## Win & Loss Conditions

- **Win:** Player reaches Black Hole stage (stage 3). Show victory variant of GameOver screen.
- **Loss:** Entity with `mass > player.mass * 1.2` overlaps player. Trigger death sequence.

---

## Spawn System

- Maintains a target entity density within a radius around the player (~2× viewport width)
- Entities spawn at the outer edge of this radius, drifting slowly inward with random velocity
- Entity stage distribution is weighted by player stage: lower-stage entities are more common, with a small percentage of threatening higher-stage entities
- Off-screen entities beyond spawn radius are recycled back to the pool

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
