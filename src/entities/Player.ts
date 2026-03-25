import Phaser from 'phaser';
import type { PlayerState, StageIndex, EvolutionChoice } from '../types';
import { STAGES } from '../config/stages';
import { applyEvolutionChoice } from '../config/evolutions';

const BASE_SPEED = 180;

export function createInitialPlayerState(): PlayerState {
  return {
    mass: 50,
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
  // @ts-ignore: PlayerState overrides Phaser's generic state: number | string
  state!: PlayerState;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player-0');
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
    scene.physics.add.existing(this as unknown as Phaser.GameObjects.GameObject);
    this.state = createInitialPlayerState();
    this.syncPhysicsBody();
  }

  /** Must be called after any change to state.collisionRadius. */
  syncPhysicsBody(): void {
    const r = this.state.collisionRadius;
    // offset (0,0): body.center = sprite.center for centered-origin sprites
    (this.body as Phaser.Physics.Arcade.Body).setCircle(r, 0, 0);
    this.syncVisualScale();
    this.setTexture(`player-${this.state.stage}`);
  }

  /** Update sprite scale to reflect current mass — gives visual growth feedback.
   *  Uses the same radius formula as NPCs so relative sizes are consistent. */
  private syncVisualScale(): void {
    const def = STAGES[this.state.stage];
    const massR = def.baseCollisionRadius * (0.5 + this.state.mass / (def.npcMassRange[1] * 2));
    // Never appear smaller than the actual physics body
    this.setScale(Math.max(massR, this.state.collisionRadius) / 32);
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
    };
    this.syncPhysicsBody();
  }

  eat(entityMass: number, now: number): void {
    this.state = {
      ...this.state,
      mass: this.state.mass + entityMass * 0.7 * this.state.massGainRate,
      lastEatTime: now,
    };
    this.syncVisualScale();
  }

  moveToward(targetX: number, targetY: number, delta: number): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 4) {
      this.setVelocity(0, 0);
      return;
    }
    const body = this.body as Phaser.Physics.Arcade.Body;
    const targetVx = (dx / dist) * this.state.speed;
    const targetVy = (dy / dist) * this.state.speed;
    // Frame-rate-independent lerp: -12 constant ≈ 18% per frame at 60fps (~0.2s to full speed)
    const lerp = 1 - Math.exp(-12 * delta / 1000);
    body.setVelocity(
      Phaser.Math.Linear(body.velocity.x, targetVx, lerp),
      Phaser.Math.Linear(body.velocity.y, targetVy, lerp),
    );
  }
}
