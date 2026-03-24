import Phaser from 'phaser';
import type { GameMode } from '../types';
import { EVOLUTION_GATES } from '../config/evolutions';

interface GateData {
  gateIndex: 0 | 1 | 2;
  mode: GameMode;
}

const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'system-ui, sans-serif',
  color: '#e8d8f8',
};

export class EvolutionGate extends Phaser.Scene {
  constructor() { super('EvolutionGate'); }

  create(data: GateData): void {
    const { width, height } = this.scale;
    const gate = EVOLUTION_GATES[data.gateIndex];
    if (!gate) { this.scene.stop(); return; }

    // Dark overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);

    this.add.text(width / 2, height * 0.22, 'EVOLUTION', {
      ...TEXT_STYLE, fontSize: '14px', letterSpacing: 6,
    }).setOrigin(0.5).setAlpha(0.6);

    this.add.text(width / 2, height * 0.30, gate.label, {
      ...TEXT_STYLE, fontSize: '32px', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.38, 'Choose your evolutionary path', {
      ...TEXT_STYLE, fontSize: '16px',
    }).setOrigin(0.5).setAlpha(0.65);

    const [choiceA, choiceB] = gate.choices;
    this.makeChoiceCard(width / 2 - 180, height / 2, choiceA.label, choiceA.description, () => {
      this.choose(choiceA.id, data.gateIndex);
    });
    this.makeChoiceCard(width / 2 + 180, height / 2, choiceB.label, choiceB.description, () => {
      this.choose(choiceB.id, data.gateIndex);
    });
  }

  private makeChoiceCard(x: number, y: number, label: string, desc: string, onClick: () => void): void {
    const card = this.add.rectangle(x, y, 300, 200, 0x1a0a3a, 1)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x6633aa);
    this.add.text(x, y - 40, label, { ...TEXT_STYLE, fontSize: '22px', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(x, y + 10, desc, { ...TEXT_STYLE, fontSize: '15px', wordWrap: { width: 260 }, align: 'center' }).setOrigin(0.5);
    card.on('pointerover', () => card.setFillStyle(0x3a1a6a));
    card.on('pointerout',  () => card.setFillStyle(0x1a0a3a));
    card.on('pointerdown', onClick);
  }

  private choose(choiceId: string, gateIndex: number): void {
    // Emit on the Game scene's emitter, not this scene's emitter.
    // This ensures the listener in Game.create() fires correctly even after
    // EvolutionGate is stopped and relaunched for subsequent gates.
    this.scene.get('Game').events.emit('choice-made', choiceId, gateIndex);
    this.scene.resume('Game');
    this.scene.stop();
  }
}
