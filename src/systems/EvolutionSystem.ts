import type { StageIndex, GameMode } from '../types';
import { STAGE_MASS_THRESHOLDS } from '../config/stages';

export function getNextThreshold(stage: StageIndex): number | null {
  if (stage >= 3) return null;
  return STAGE_MASS_THRESHOLDS[stage as 0 | 1 | 2];
}

export function shouldTriggerGate(mass: number, stage: StageIndex): boolean {
  const threshold = getNextThreshold(stage);
  return threshold !== null && mass >= threshold;
}

export function gateIndexForStage(stage: StageIndex): 0 | 1 | 2 {
  return stage as 0 | 1 | 2;
}

// ─── Phaser-dependent ────────────────────────────────────────────────────────
// Tested manually via the running game.

export class EvolutionSystem {
  private gateTriggered = new Set<StageIndex>();

  check(
    player: { state: { stage: StageIndex; mass: number } },
    scene: Phaser.Scene,
    mode: GameMode,
  ): void {
    const { stage, mass } = player.state;
    if (this.gateTriggered.has(stage)) return;
    if (!shouldTriggerGate(mass, stage)) return;

    this.gateTriggered.add(stage);
    scene.scene.pause();
    scene.scene.launch('EvolutionGate', {
      gateIndex: gateIndexForStage(stage),
      mode,
    });
  }

  reset(): void {
    this.gateTriggered.clear();
  }
}
