import Phaser from 'phaser';

const STAGE_COLORS = [0xb0a090, 0x4488ff, 0xffcc44, 0x8822ff];
const PLAYER_COLORS = [0xd0b870, 0x66aaff, 0xffee66, 0xaa44ff];

function makeGlowCircle(scene: Phaser.Scene, key: string, color: number, radius: number): void {
  const g = scene.make.graphics({}, false);
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
