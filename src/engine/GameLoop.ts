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
    const iterations = 3;
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

          // 3D distance between the centers of two sphere colliders
          const dx = b.position.x - a.position.x;
          const dy = b.position.y - a.position.y;
          const dz = b.position.z - a.position.z;
          const dist3DSq = dx * dx + dy * dy + dz * dz;
          const minDist = a.colliderRadius + b.colliderRadius;

          if (dist3DSq < minDist * minDist && dist3DSq > 0.000001) {
            const dist = Math.sqrt(dist3DSq);
            const overlap = minDist - dist;
            const normX = dx / dist;
            const normY = dy / dist;
            const normZ = dz / dist;

            // Mass-weighted separation:
            // True mass weighting: pushing heavy things resists movement and naturally slows the character down
            const invMassA = 1 / a.mass;
            const invMassB = 1 / b.mass;
            const invMassSum = invMassA + invMassB;
            if (invMassSum <= 0.0001) continue;

            const ratioA = invMassA / invMassSum;
            const ratioB = invMassB / invMassSum;

            // Positional separation in 3D
            a.position.x -= normX * overlap * ratioA;
            a.position.y -= normY * overlap * ratioA;
            a.position.z -= normZ * overlap * ratioA;
            b.position.x += normX * overlap * ratioB;
            b.position.y += normY * overlap * ratioB;
            b.position.z += normZ * overlap * ratioB;

            // Clamp z so neither drops below their supporting surface
            a.position.z = Math.max(a.supportingSurfaceHeight, a.position.z);
            b.position.z = Math.max(b.supportingSurfaceHeight, b.position.z);

            // Relative 3D velocity (B relative to A)
            const relVx = b.velocity.x - a.velocity.x;
            const relVy = b.velocity.y - a.velocity.y;
            const relVz = b.verticalVelocity - a.verticalVelocity;
            const velAlongNormal = relVx * normX + relVy * normY + relVz * normZ;

            if (velAlongNormal < 0) {
              // When actively walking against an object, contact is an inelastic continuous push (restitution = 0)
              const isActivelyPushing = a.isActivelyWalking || b.isActivelyWalking;
              const eA = a.isCharacter ? 0.15 : (a.bounceMod ?? 0.0);
              const eB = b.isCharacter ? 0.15 : (b.bounceMod ?? 0.0);
              const restitution = isActivelyPushing ? 0.0 : Math.max(0.0, Math.min(0.98, Math.max(eA, eB)));

              // Normal impulse magnitude J_n (strictly conserving linear momentum)
              const normalImpulse = -(1 + restitution) * velAlongNormal / invMassSum;

              a.velocity.x -= normalImpulse * invMassA * normX;
              a.velocity.y -= normalImpulse * invMassA * normY;
              a.verticalVelocity -= normalImpulse * invMassA * normZ;

              b.velocity.x += normalImpulse * invMassB * normX;
              b.velocity.y += normalImpulse * invMassB * normY;
              b.verticalVelocity += normalImpulse * invMassB * normZ;

              // Tangential relative velocity (perpendicular to normal)
              const tangVx = relVx - velAlongNormal * normX;
              const tangVy = relVy - velAlongNormal * normY;
              const tangVz = relVz - velAlongNormal * normZ;
              const tangSpeed = Math.hypot(tangVx, tangVy, tangVz);

              if (tangSpeed > 0.001) {
                const tangX = tangVx / tangSpeed;
                const tangY = tangVy / tangSpeed;
                const tangZ = tangVz / tangSpeed;

                // Contact friction
                const muObj = 0.35 * Math.sqrt(a.dynamicGroundFrictionMod * b.dynamicGroundFrictionMod);
                const beta = 0.4; // Sphere rotational inertia factor (2/5 for solid sphere)
                const stickImpulse = tangSpeed / (invMassSum * (1 + 1 / beta));
                const maxFricImpulse = muObj * normalImpulse;
                const fricImpulse = Math.min(stickImpulse, maxFricImpulse);

                // Tangential impulse opposes relative sliding velocity
                a.velocity.x += fricImpulse * invMassA * tangX;
                a.velocity.y += fricImpulse * invMassA * tangY;
                a.verticalVelocity += fricImpulse * invMassA * tangZ;

                b.velocity.x -= fricImpulse * invMassB * tangX;
                b.velocity.y -= fricImpulse * invMassB * tangY;
                b.verticalVelocity -= fricImpulse * invMassB * tangZ;

                // Torque vector tau = r x F_tang
                // For A: r_A = +n * R_A, force = +F_tang * t => tau_A = (n x t) * R_A * fricImpulse
                // For B: r_B = -n * R_B, force = -F_tang * t => tau_B = (-n x -t) * R_B * fricImpulse = (n x t) * R_B * fricImpulse
                const torqueX = normY * tangZ - normZ * tangY;
                const torqueY = normZ * tangX - normX * tangZ;
                const torqueZ = normX * tangY - normY * tangX;

                if (a.rollModule && a.rollModule.enabled) {
                  const scaleA = fricImpulse / (beta * a.mass * a.colliderRadius);
                  a.rollModule.angularVelocity.x += torqueX * scaleA;
                  a.rollModule.angularVelocity.y += torqueY * scaleA;
                  a.rollModule.angularVelocity.z += torqueZ * scaleA;
                  a.rollModule.angularVelocity.z = Math.max(-30, Math.min(30, a.rollModule.angularVelocity.z));

                  if (a.isRestingOnSurface) {
                    a.rollModule.angularVelocity.y = a.velocity.x / a.colliderRadius;
                    a.rollModule.angularVelocity.x = -a.velocity.y / a.colliderRadius;
                  }
                }

                if (b.rollModule && b.rollModule.enabled) {
                  const scaleB = fricImpulse / (beta * b.mass * b.colliderRadius);
                  b.rollModule.angularVelocity.x += torqueX * scaleB;
                  b.rollModule.angularVelocity.y += torqueY * scaleB;
                  b.rollModule.angularVelocity.z += torqueZ * scaleB;
                  b.rollModule.angularVelocity.z = Math.max(-30, Math.min(30, b.rollModule.angularVelocity.z));

                  if (b.isRestingOnSurface) {
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
  }
}
