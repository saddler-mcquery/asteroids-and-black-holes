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
