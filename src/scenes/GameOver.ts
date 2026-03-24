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
      ...TEXT_STYLE, fontSize: '22px',
    }).setOrigin(0.5).setAlpha(0.8);

    this.add.text(width / 2, height * 0.52, `Score: ${Math.floor(data.score)}`, {
      ...TEXT_STYLE, fontSize: '28px',
    }).setOrigin(0.5);

    if (data.mode === 'endless' && data.stage3ElapsedMs > 0) {
      const secs = Math.floor(data.stage3ElapsedMs / 1000);
      const mm = String(Math.floor(secs / 60)).padStart(2, '0');
      const ss = String(secs % 60).padStart(2, '0');
      this.add.text(width / 2, height * 0.61, `Time as Black Hole: ${mm}:${ss}`, {
        ...TEXT_STYLE, fontSize: '18px',
      }).setOrigin(0.5).setAlpha(0.7);
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
    btn.on('pointerover', () => { btn.fillColor = 0x4a2a7a; });
    btn.on('pointerout',  () => { btn.fillColor = 0x2a1a4a; });
    btn.on('pointerdown', onClick);
  }
}
