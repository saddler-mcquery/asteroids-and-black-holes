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
  // @ts-ignore: PlayerState overrides Phaser's generic state: number | string
  state!: PlayerState;

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
