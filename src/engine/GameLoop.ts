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

    // 3. Continuous hold-to-grab:
    // If holding down grab and not holding an object, automatically pick up any object that enters range around mouse
    if (input.isMouseDown && !this.character.heldObject && this.character.pickupModule) {
      const target = this.character.pickupModule.findTargetObject(
        this.character,
        input.mousePos.x,
        input.mousePos.y,
        this.objects
      );
      if (target) {
        this.character.pickupModule.pickup(this.character, target);
        input.justPickedUp = true;
      }
    }

    // 4. Resolve freebody-to-freebody circle collisions
    this.resolveFreebodyCollisions();
  }

  private resolveFreebodyCollisions(): void {
    const all = [this.character, ...this.objects];

    // Iterative separation solver: pushes entities away until not overlapping
    const iterations = 2;
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const a = all[i];
          const b = all[j];

          // Skip if either is currently held in hands
          if (a.isHeld || b.isHeld) continue;

          // High altitude collision rule:
          // If both are above wall height, they collide with each other.
          // If one is not above wall height, they do not collide.
          const wallThreshold = this.arena.wallHeight - 0.05;
          const aAboveWall = a.position.z >= wallThreshold;
          const bAboveWall = b.position.z >= wallThreshold;

          // If one is above wall height and the other is not, they never collide (clean pass-over)
          if (aAboveWall !== bAboveWall) continue;

          // Both are either above wall height (high altitude) or both are below wall height (ground level)
          const dx = b.position.x - a.position.x;
          const dy = b.position.y - a.position.y;
          const dist2DSq = dx * dx + dy * dy;
          const minDist = a.colliderRadius + b.colliderRadius;

          if (dist2DSq < minDist * minDist && dist2DSq > 0.00001) {
            // If both are below wall height, only collide if their height difference is within collider reach
            if (!aAboveWall) {
              const zDiff = Math.abs(b.position.z - a.position.z);
              if (zDiff > minDist) continue;
            }

            const dist = Math.sqrt(dist2DSq);
            const overlap = minDist - dist;
            const normX = dx / dist;
            const normY = dy / dist;

            // Push both entities away from each other with equal force (50/50 split) until not overlapping
            a.position.x -= normX * overlap * 0.5;
            a.position.y -= normY * overlap * 0.5;
            b.position.x += normX * overlap * 0.5;
            b.position.y += normY * overlap * 0.5;

            // Equal impulse push away from each other
            const relVx = b.velocity.x - a.velocity.x;
            const relVy = b.velocity.y - a.velocity.y;
            const velAlongNormal = relVx * normX + relVy * normY;

            if (velAlongNormal < 0) {
              const bothAirborne = !a.isRestingOnSurface && !b.isRestingOnSurface;
              const restitution = bothAirborne ? 0.6 : 0.3;
              const impulseMag = -(1 + restitution) * velAlongNormal * 0.5;

              a.velocity.x -= impulseMag * normX;
              a.velocity.y -= impulseMag * normY;
              b.velocity.x += impulseMag * normX;
              b.velocity.y += impulseMag * normY;

              // Tangential collision friction imparting upward/downward angular velocity (ωz)
              const tangX = -normY;
              const tangY = normX;
              const velAlongTang = relVx * tangX + relVy * tangY;

              // Surface contact velocity from existing vertical spin:
              // v_contact = (v_b - v_a) - (ω_z,b * R_b + ω_z,a * R_a)
              const spinA = a.rollModule?.enabled ? a.rollModule.angularVelocity.z : 0;
              const spinB = b.rollModule?.enabled ? b.rollModule.angularVelocity.z : 0;
              const vContactTang = velAlongTang - (spinB * b.colliderRadius + spinA * a.colliderRadius);

              const muObj = 0.35; // Contact friction
              const stickTangImpulse = (vContactTang * 0.5) / 3.5;
              const maxTangImpulse = muObj * Math.abs(impulseMag);
              const tangImpulseMag = Math.min(Math.abs(stickTangImpulse), maxTangImpulse);
              const tangImpulse = -Math.sign(vContactTang) * tangImpulseMag;

              a.velocity.x -= tangImpulse * tangX;
              a.velocity.y -= tangImpulse * tangY;
              b.velocity.x += tangImpulse * tangX;
              b.velocity.y += tangImpulse * tangY;

              const beta = 0.4;
              if (a.rollModule && a.rollModule.enabled) {
                // Tangential friction imparts UPWARD / DOWNWARD angular velocity (ωz)
                const dWzA = -tangImpulse / (beta * a.mass * a.colliderRadius);
                a.rollModule.angularVelocity.z += dWzA;
                a.rollModule.angularVelocity.z = Math.max(-30, Math.min(30, a.rollModule.angularVelocity.z));
                // Couple horizontal roll
                a.rollModule.angularVelocity.y = a.velocity.x / a.colliderRadius;
                a.rollModule.angularVelocity.x = -a.velocity.y / a.colliderRadius;
              }

              if (b.rollModule && b.rollModule.enabled) {
                // Opposing torque on B (like two gears meshing)
                const dWzB = -tangImpulse / (beta * b.mass * b.colliderRadius);
                b.rollModule.angularVelocity.z += dWzB;
                b.rollModule.angularVelocity.z = Math.max(-30, Math.min(30, b.rollModule.angularVelocity.z));
                // Couple horizontal roll
                b.rollModule.angularVelocity.y = b.velocity.x / b.colliderRadius;
                b.rollModule.angularVelocity.x = -b.velocity.y / b.colliderRadius;
              }
            }
          }
        }
      }
    }
  }
}
