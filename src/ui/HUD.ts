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
      const threshold = state.stage < 3
        ? STAGE_MASS_THRESHOLDS[state.stage as 0 | 1 | 2]
        : state.mass;
      const prevThreshold = state.stage > 0 ? STAGE_MASS_THRESHOLDS[(state.stage - 1) as 0 | 1 | 2] : 0;
      const progress = Math.min(1, (state.mass - prevThreshold) / (threshold - prevThreshold));
      this.barFill.setSize(HUD.BAR_W * progress, HUD.BAR_H);
      this.barLabel.setText(`Next evolution: ${Math.floor(Math.max(0, threshold - state.mass))} mass`);
    }
  }
}
