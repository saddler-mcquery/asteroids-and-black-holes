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
      ...TEXT_STYLE, fontSize: '20px',
    }).setOrigin(0.5).setAlpha(0.7);

    this.makeButton(width / 2 - 140, height * 0.62, 'NORMAL', () => {
      this.scene.start('Game', { mode: 'normal' });
    });

    this.makeButton(width / 2 + 140, height * 0.62, 'ENDLESS', () => {
      this.scene.start('Game', { mode: 'endless' });
    });

    this.add.text(width / 2 - 140, height * 0.72, 'Reach Black Hole to win', {
      ...TEXT_STYLE, fontSize: '13px',
    }).setOrigin(0.5).setAlpha(0.5);

    this.add.text(width / 2 + 140, height * 0.72, 'Survive as long as possible', {
      ...TEXT_STYLE, fontSize: '13px',
    }).setOrigin(0.5).setAlpha(0.5);
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const btn = this.add.rectangle(x, y, 220, 54, 0x2a1a4a, 1)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x8844cc);
    this.add.text(x, y, label, {
      ...TEXT_STYLE, fontSize: '22px', fontStyle: 'bold',
    }).setOrigin(0.5);
    btn.on('pointerover', () => btn.setFillStyle(0x4a2a7a));
    btn.on('pointerout',  () => btn.setFillStyle(0x2a1a4a));
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
