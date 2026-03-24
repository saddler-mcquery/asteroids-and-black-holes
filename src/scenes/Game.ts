import Phaser from 'phaser';
import type { GameMode, GameSceneData } from '../types';
import { Player } from '../entities/Player';
import { CelestialBody } from '../entities/CelestialBody';
import { EntityPool } from '../entities/EntityPool';
import { CollisionSystem } from '../systems/CollisionSystem';
import { EvolutionSystem } from '../systems/EvolutionSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { HUD } from '../ui/HUD';

const WORLD_SIZE = 8000;
const BASE_ZOOM = 1.0;
const ZOOM_SCALE = 500;
const BOUNDARY_MARGIN = 200;
const BOUNDARY_FORCE = 120;

export class Game extends Phaser.Scene {
  private player!: Player;
  private npcGroup!: Phaser.Physics.Arcade.Group;
  private pool!: EntityPool<CelestialBody>;
  private collisionSystem!: CollisionSystem;
  private evolutionSystem!: EvolutionSystem;
  private spawnSystem!: SpawnSystem;
  private hud!: HUD;
  private mode: GameMode = 'normal';
  private score = 0;
  private dead = false;
  private stage3EntryTime: number | null = null;

  constructor() { super('Game'); }

  init(data: GameSceneData): void {
    this.mode = data.mode ?? 'normal';
    this.score = 0;
    this.dead = false;
    this.stage3EntryTime = null;
  }

  create(): void {
    this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);

    this.createBackground();

    this.player = new Player(this, WORLD_SIZE / 2, WORLD_SIZE / 2);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.npcGroup = this.physics.add.group({ classType: CelestialBody });
    this.pool = new EntityPool(() => new CelestialBody(this, 0, 0));

    this.collisionSystem = new CollisionSystem(this.mode);
    this.collisionSystem.setupOverlaps(this, this.player, this.npcGroup,
      (body) => this.onEat(body as CelestialBody),
      () => this.onDie(),
    );

    this.evolutionSystem = new EvolutionSystem();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.spawnSystem = new SpawnSystem(this.pool, this.mode, this.npcGroup as any);

    this.hud = new HUD(this);

    // Listen for evolution gate result on this scene's own emitter.
    // EvolutionGate emits on this scene (not its own) so the listener
    // survives gate scene stop/relaunch cycles.
    this.events.on('choice-made', this.onEvolutionChoice, this);
  }

  update(_time: number, delta: number): void {
    if (this.dead) return;

    const ptr = this.input.activePointer;
    const worldPt = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
    this.player.moveToward(worldPt.x, worldPt.y, delta);

    this.applyBoundaryForce();

    this.collisionSystem.applyGravityPull(
      this.player,
      this.pool.active,
      delta,
    );

    const zoom = this.cameras.main.zoom;
    const viewportW = this.scale.width / zoom;
    const viewportH = this.scale.height / zoom;
    this.spawnSystem.update(
      this.player.state.stage,
      this.player.x, this.player.y,
      viewportW, viewportH,
      this.time.now,
    );

    this.evolutionSystem.check(this.player, this, this.mode);

    const stage3Elapsed = this.stage3EntryTime !== null
      ? this.time.now - this.stage3EntryTime
      : 0;

    this.hud.update(this.player.state, this.score, this.mode, stage3Elapsed);

    // Zoom
    const targetZoom = Math.max(0.1, BASE_ZOOM / (1 + this.player.state.mass / ZOOM_SCALE));
    this.cameras.main.setZoom(
      Phaser.Math.Linear(this.cameras.main.zoom, targetZoom, 0.02),
    );
  }

  private onEat(entity: CelestialBody): void {
    this.score += entity.cbMass;
    this.player.eat(entity.cbMass, this.time.now);
    this.npcGroup.remove(entity, false, false);
    this.pool.release(entity);
    entity.setActive(false).setVisible(false);
    // Particle burst — emitter is destroyed after animation to avoid leaking scene objects
    const emitter = this.add.particles(entity.x, entity.y, `celestial-${entity.cbStage}`, {
      speed: { min: 40, max: 120 },
      lifespan: 400,
      quantity: 8,
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.8, end: 0 },
    });
    emitter.explode(8);
    this.time.delayedCall(500, () => emitter.destroy());
  }

  private onDie(): void {
    if (this.dead) return;
    this.dead = true;
    this.cameras.main.shake(400, 0.02);
    this.time.delayedCall(600, () => {
      this.scene.start('GameOver', {
        mode: this.mode,
        score: this.score,
        stage: this.player.state.stage,
        stageName: `Devoured as a ${['Asteroid','Planet','Star','Black Hole'][this.player.state.stage]}`,
        stage3ElapsedMs: this.stage3EntryTime !== null ? this.time.now - this.stage3EntryTime : 0,
      });
    });
  }

  private onEvolutionChoice(choice: string, _gateIndex: number): void {
    this.player.applyChoice(choice as import('../types').EvolutionChoice);
    this.player.advanceStage();

    if (this.player.state.stage === 3) {
      if (this.mode === 'normal') {
        // Win
        this.scene.start('GameOver', {
          mode: 'normal',
          score: this.score,
          stage: 3,
          stageName: 'Victory — You became a Black Hole!',
          stage3ElapsedMs: 0,
          win: true,
        });
        return;
      }
      // Endless — activate escalation
      this.stage3EntryTime = this.time.now;
      this.spawnSystem.activateEndless(this.time.now);
    }
  }

  private applyBoundaryForce(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (this.player.x < BOUNDARY_MARGIN) body.velocity.x += BOUNDARY_FORCE;
    if (this.player.x > WORLD_SIZE - BOUNDARY_MARGIN) body.velocity.x -= BOUNDARY_FORCE;
    if (this.player.y < BOUNDARY_MARGIN) body.velocity.y += BOUNDARY_FORCE;
    if (this.player.y > WORLD_SIZE - BOUNDARY_MARGIN) body.velocity.y -= BOUNDARY_FORCE;
  }

  private createBackground(): void {
    this.add.rectangle(WORLD_SIZE / 2, WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE, 0x050510);
    // Nebula radial overlays
    const g = this.add.graphics();
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * WORLD_SIZE;
      const y = Math.random() * WORLD_SIZE;
      const r = 800 + Math.random() * 1200;
      g.fillStyle(i % 2 === 0 ? 0x3a0a8a : 0x0a2060, 0.06);
      g.fillCircle(x, y, r);
    }
    // Parallax star layers via TileSprite would go here; for MVP use fixed scatter
    for (let i = 0; i < 600; i++) {
      const alpha = 0.2 + Math.random() * 0.8;
      this.add.rectangle(
        Math.random() * WORLD_SIZE, Math.random() * WORLD_SIZE,
        Math.random() < 0.8 ? 1 : 2, Math.random() < 0.8 ? 1 : 2,
        0xffffff, alpha,
      );
    }
  }
}
