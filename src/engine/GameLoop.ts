import { Arena } from "./Arena.js";
import { Character } from "../character/Character.js";
import { GameObject } from "./GameObject.js";
import { Renderer } from "./Renderer.js";
import { InputManager } from "../ui/InputManager.js";
import { DevPanel } from "../ui/DevPanel.js";

export class GameLoop {
  private arena: Arena;
  private character: Character;
  private objects: GameObject[];
  private renderer: Renderer;
  private inputManager: InputManager;
  private devPanel: DevPanel;

  private isRunning = false;
  private lastTime = 0;
  private accumulator = 0;
  private readonly fixedDt = 1 / 60; // 60Hz fixed simulation timestep

  constructor(options: {
    arena: Arena;
    character: Character;
    objects: GameObject[];
    renderer: Renderer;
    inputManager: InputManager;
    devPanel: DevPanel;
  }) {
    this.arena = options.arena;
    this.character = options.character;
    this.objects = options.objects;
    this.renderer = options.renderer;
    this.inputManager = options.inputManager;
    this.devPanel = options.devPanel;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.tick(t));
  }

  public stop(): void {
    this.isRunning = false;
  }

  private tick(currentTime: number): void {
    if (!this.isRunning) return;

    let deltaSeconds = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Prevent spiral of death on tab unfocus
    if (deltaSeconds > 0.2) {
      deltaSeconds = 0.2;
    }

    this.accumulator += deltaSeconds;

    // Fixed timestep simulation updates
    while (this.accumulator >= this.fixedDt) {
      this.updatePhysics(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }

    // Render current frame with active selection highlight
    this.renderer.render(this.arena, this.character, this.objects, this.devPanel.selectedEntity);

    // Update live inspector
    this.devPanel.updateInspector();

    requestAnimationFrame((t) => this.tick(t));
  }

  private updatePhysics(dt: number): void {
    const input = this.inputManager;

    // 1. Update character with movement and aim inputs
    this.character.updateCharacter(
      dt,
      input.movementVector,
      input.isMouseDown,
      input.mousePos,
      this.arena
    );

    // 2. Update all freebody objects
    for (const obj of this.objects) {
      obj.updatePosition(dt, this.arena);
    }

    // 3. Resolve freebody-to-freebody circle collisions (on ground plane)
    this.resolveFreebodyCollisions();
  }

  private resolveFreebodyCollisions(): void {
    const all = [this.character, ...this.objects];

    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];

        // Skip if either is currently held in hands
        if (a.isHeld || b.isHeld) continue;

        // Check horizontal overlap
        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const distSq = dx * dx + dy * dy;
        const minDist = a.colliderRadius + b.colliderRadius;

        if (distSq < minDist * minDist && distSq > 0.00001) {
          // Check vertical height overlap: entities only collide if their z-ranges intersect
          const zDiff = Math.abs(a.position.z - b.position.z);
          const maxZOverlap = Math.min(a.colliderRadius, b.colliderRadius);

          if (zDiff < maxZOverlap) {
            const dist = Math.sqrt(distSq);
            const overlap = minDist - dist;
            const normX = dx / dist;
            const normY = dy / dist;

            // Check if either entity was at rest on the ground (surfaces going the same speed = 0)
            const speedA = Math.hypot(a.velocity.x, a.velocity.y);
            const speedB = Math.hypot(b.velocity.x, b.velocity.y);
            const staticThreshA = this.arena.staticFrictionThreshold * a.staticGroundFrictionMod;
            const staticThreshB = this.arena.staticFrictionThreshold * b.staticGroundFrictionMod;

            const isAAtRest = a.isRestingOnSurface && speedA < staticThreshA;
            const isBAtRest = b.isRestingOnSurface && speedB < staticThreshB;

            // Resistance weight: an entity anchored by static friction resists displacement
            // more than an entity already in motion with dynamic friction
            const resistanceA = a.mass * (isAAtRest ? (1 + a.staticGroundFrictionMod * 1.5) : (1 + a.dynamicGroundFrictionMod * 0.4));
            const resistanceB = b.mass * (isBAtRest ? (1 + b.staticGroundFrictionMod * 1.5) : (1 + b.dynamicGroundFrictionMod * 0.4));
            const totalResistance = resistanceA + resistanceB;

            const aRatio = resistanceB / totalResistance;
            const bRatio = resistanceA / totalResistance;

            a.position.x -= normX * overlap * aRatio;
            a.position.y -= normY * overlap * aRatio;
            b.position.x += normX * overlap * bRatio;
            b.position.y += normY * overlap * bRatio;

            // Impulse calculation
            const relVx = b.velocity.x - a.velocity.x;
            const relVy = b.velocity.y - a.velocity.y;
            const velAlongNormal = relVx * normX + relVy * normY;

            if (velAlongNormal < 0) {
              // Sliding ground contact has low restitution (inelastic push)
              const restitution = 0.15;
              let impulseMag = -(1 + restitution) * velAlongNormal / (1 / a.mass + 1 / b.mass);

              // If B was at rest, static friction requires overcoming static breakaway threshold
              if (isBAtRest && b.staticGroundFrictionMod > 0) {
                const breakawayThreshold = b.mass * this.arena.staticFrictionThreshold * b.staticGroundFrictionMod * 1.5;
                if (impulseMag < breakawayThreshold) {
                  // Static friction holds: dampen impulse transfer to B
                  impulseMag *= Math.max(0.2, impulseMag / breakawayThreshold);
                }
              }

              // If A was at rest, same static friction check for A
              if (isAAtRest && a.staticGroundFrictionMod > 0) {
                const breakawayThreshold = a.mass * this.arena.staticFrictionThreshold * a.staticGroundFrictionMod * 1.5;
                if (impulseMag < breakawayThreshold) {
                  impulseMag *= Math.max(0.2, impulseMag / breakawayThreshold);
                }
              }

              a.velocity.x -= (impulseMag / a.mass) * normX;
              a.velocity.y -= (impulseMag / a.mass) * normY;
              b.velocity.x += (impulseMag / b.mass) * normX;
              b.velocity.y += (impulseMag / b.mass) * normY;
            }
          }
        }
      }
    }
  }
}
