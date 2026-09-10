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
    this.renderer.render(
      this.arena,
      this.character,
      this.objects,
      this.inputManager.selectedCanvasEntity,
      this.devPanel.isEditMode,
      this.inputManager.hoverEntity
    );

    // Update live inspector
    this.devPanel.updateInspector();

    requestAnimationFrame((t) => this.tick(t));
  }

  private updatePhysics(dt: number): void {
    const input = this.inputManager;

    // 1. Update character with movement and aim inputs
    if (input.draggedEntity !== this.character) {
      this.character.updateCharacter(
        dt,
        input.movementVector,
        input.isMouseDown && !this.devPanel.isEditMode,
        input.mousePos,
        this.arena
      );
    } else {
      this.character.velocity.x = 0;
      this.character.velocity.y = 0;
    }

    // 2. Update all freebody objects (skip physics integration while manually dragged in Edit Mode)
    for (const obj of this.objects) {
      if (input.draggedEntity === obj) {
        continue;
      }
      obj.updatePosition(dt, this.arena);
    }

    // 3. Continuous hold-to-grab (only active in Play Mode):
    // If holding down grab and not holding an object, automatically pick up any object that enters range around mouse
    if (!this.devPanel.isEditMode && input.isMouseDown && !this.character.heldObject && this.character.pickupModule) {
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
    const input = this.inputManager;

    // Iterative separation solver: pushes entities away until not overlapping
    const iterations = 3;
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const a = all[i];
          const b = all[j];

          // Skip if either is currently held in hands or actively dragged in Edit Mode
          if (a.isHeld || b.isHeld || a === input.draggedEntity || b === input.draggedEntity) continue;

          // Skip if either entity does not have an active collider
          if (!a.hasCollider || !b.hasCollider) continue;

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

            // Relative 3D velocity (B relative to A)
            const relVx = b.velocity.x - a.velocity.x;
            const relVy = b.velocity.y - a.velocity.y;
            const relVz = b.verticalVelocity - a.verticalVelocity;
            const velAlongNormal = relVx * normX + relVy * normY + relVz * normZ;

            const isMasslessA = !a.hasMass;
            const isMasslessB = !b.hasMass;

            // Case 1: Both objects are massless (50/50 separation without mass ratio)
            if (isMasslessA && isMasslessB) {
              a.position.x -= normX * overlap * 0.5;
              a.position.y -= normY * overlap * 0.5;
              a.position.z -= normZ * overlap * 0.5;
              b.position.x += normX * overlap * 0.5;
              b.position.y += normY * overlap * 0.5;
              b.position.z += normZ * overlap * 0.5;

              if (velAlongNormal < 0) {
                const impulse = -velAlongNormal * 0.5;
                a.velocity.x -= impulse * normX;
                a.velocity.y -= impulse * normY;
                a.verticalVelocity -= impulse * normZ;
                b.velocity.x += impulse * normX;
                b.velocity.y += impulse * normY;
                b.verticalVelocity += impulse * normZ;
              }
              continue;
            }

            // Case 2: A is Massive, B is Massless
            // "massless objects will inherit velocity, but they will ONLY inherit velocity.
            // don't let the massive object be affected at all unless it's pressing the massless object against a wall."
            if (!isMasslessA && isMasslessB) {
              const isBPinned = this.isEntityPinnedAgainstWall(b, normX, normY);
              if (isBPinned) {
                // B is pinned against wall; A cannot push through B
                a.position.x -= normX * overlap;
                a.position.y -= normY * overlap;
                a.velocity.x = 0;
                a.velocity.y = 0;
              } else {
                // A is completely unaffected! B absorbs entire separation and inherits velocity from A
                b.position.x += normX * overlap;
                b.position.y += normY * overlap;
                b.position.z += normZ * overlap;

                if (velAlongNormal < 0) {
                  // B inherits closing velocity along normal from A without dampening A
                  b.velocity.x += (a.velocity.x - b.velocity.x) * Math.abs(normX);
                  b.velocity.y += (a.velocity.y - b.velocity.y) * Math.abs(normY);
                  b.verticalVelocity += (a.verticalVelocity - b.verticalVelocity) * Math.abs(normZ);
                }
              }
              continue;
            }

            // Case 3: A is Massless, B is Massive
            if (isMasslessA && !isMasslessB) {
              const isAPinned = this.isEntityPinnedAgainstWall(a, -normX, -normY);
              if (isAPinned) {
                b.position.x += normX * overlap;
                b.position.y += normY * overlap;
                b.velocity.x = 0;
                b.velocity.y = 0;
              } else {
                a.position.x -= normX * overlap;
                a.position.y -= normY * overlap;
                a.position.z -= normZ * overlap;

                if (velAlongNormal < 0) {
                  a.velocity.x += (b.velocity.x - a.velocity.x) * Math.abs(normX);
                  a.velocity.y += (b.velocity.y - a.velocity.y) * Math.abs(normY);
                  a.verticalVelocity += (b.verticalVelocity - a.verticalVelocity) * Math.abs(normZ);
                }
              }
              continue;
            }

            // Case 4: Both objects are massive - standard mass-weighted physics
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

            if (velAlongNormal < 0) {
              // When actively walking against an object, contact is an inelastic continuous push (restitution = 0)
              const isActivelyPushing = (a instanceof Character && a.isActivelyWalking) || (b instanceof Character && b.isActivelyWalking);
              const canBounce = a.hasBounce && b.hasBounce;
              const eA = (a.isCharacter || !a.hasBounce) ? 0.0 : (a.bounceMod ?? 0.0);
              const eB = (b.isCharacter || !b.hasBounce) ? 0.0 : (b.bounceMod ?? 0.0);
              const restitution = (isActivelyPushing || !canBounce) ? 0.0 : Math.max(0.0, Math.min(0.98, Math.max(eA, eB)));

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

  private isEntityPinnedAgainstWall(entity: GameObject, pushDirX: number, pushDirY: number): boolean {
    const r = entity.colliderRadius > 0 ? entity.colliderRadius : 0.3;
    const eps = 0.05;

    // Arena outer boundaries
    if (pushDirX > 0.3 && entity.position.x >= this.arena.width - r - eps) return true;
    if (pushDirX < -0.3 && entity.position.x <= r + eps) return true;
    if (pushDirY > 0.3 && entity.position.y >= this.arena.height - r - eps) return true;
    if (pushDirY < -0.3 && entity.position.y <= r + eps) return true;

    // Arena internal walls
    for (const wall of this.arena.walls) {
      if (entity.position.z < wall.wallHeight - 0.05) {
        const testX = entity.position.x + pushDirX * eps;
        const testY = entity.position.y + pushDirY * eps;
        const closestX = Math.max(wall.x, Math.min(testX, wall.x + wall.width));
        const closestY = Math.max(wall.y, Math.min(testY, wall.y + wall.height));
        const dx = testX - closestX;
        const dy = testY - closestY;
        if (dx * dx + dy * dy < r * r) {
          return true;
        }
      }
    }
    return false;
  }
}
