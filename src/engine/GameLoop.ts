import { Arena } from "./Arena.js";
import { Character } from "../character/Character.js";
import { GameObject } from "./GameObject.js";
import { Renderer } from "./Renderer.js";
import { InputManager } from "../ui/InputManager.js";
import { DevPanel } from "../ui/DevPanel.js";
import type { NetworkManager } from "../network/NetworkManager.js";
import type { ObjectNetworkData } from "../network/types.js";

export class GameLoop {
  private arena: Arena;
  private character: Character;
  private objects: GameObject[];
  private renderer: Renderer;
  private inputManager: InputManager;
  private devPanel: DevPanel;
  public networkManager?: NetworkManager;
  public remoteCharacters: Map<string, Character> = new Map();

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
    networkManager?: NetworkManager;
  }) {
    this.arena = options.arena;
    this.character = options.character;
    this.objects = options.objects;
    this.renderer = options.renderer;
    this.inputManager = options.inputManager;
    this.devPanel = options.devPanel;
    this.networkManager = options.networkManager;

    if (this.networkManager) {
      this.setupNetworkHandlers(this.networkManager);
    }
  }

  private setupNetworkHandlers(net: NetworkManager): void {
    net.onInit = (packet) => {
      this.character.playerId = packet.playerId;
      this.character.color = packet.playerColor;
      this.character.name = packet.playerName;
      this.devPanel.setHost(packet.isHost, packet.hostId);

      // Spawn characters for players already connected in room
      for (const p of packet.players) {
        if (p.id !== packet.playerId && !this.remoteCharacters.has(p.id)) {
          const remote = new Character({
            name: p.name,
            playerId: p.id,
            color: p.color,
            isLocalPlayer: false,
            x: p.x,
            y: p.y,
          });
          this.remoteCharacters.set(p.id, remote);
        }
      }
    };

    net.onPlayerJoined = (packet) => {
      if (packet.player.id !== this.character.playerId && !this.remoteCharacters.has(packet.player.id)) {
        const remote = new Character({
          name: packet.player.name,
          playerId: packet.player.id,
          color: packet.player.color,
          isLocalPlayer: false,
          x: packet.player.x,
          y: packet.player.y,
        });
        this.remoteCharacters.set(packet.player.id, remote);
        console.log(`[GameLoop] Remote player joined: ${packet.player.name} (${packet.player.id})`);
      }
    };

    net.onPlayerLeft = (packet) => {
      const remote = this.remoteCharacters.get(packet.playerId);
      if (remote) {
        if (remote.heldObject) {
          remote.heldObject.isHeld = false;
          remote.heldObject.heldBy = null;
          remote.heldObject = null;
        }
        this.remoteCharacters.delete(packet.playerId);
        console.log(`[GameLoop] Remote player removed: ${packet.playerId}`);
      }
      if (packet.newHostId) {
        this.devPanel.setHost(packet.newHostId === this.character.playerId, packet.newHostId);
      }
    };

    net.onRoleChange = (packet) => {
      this.devPanel.setHost(packet.isHost, packet.hostId);
    };

    net.onPlayerState = (packet) => {
      const remote = this.remoteCharacters.get(packet.playerId);
      if (remote) {
        remote.position.x = packet.x;
        remote.position.y = packet.y;
        remote.position.z = packet.z;
        remote.velocity.x = packet.vx;
        remote.velocity.y = packet.vy;
        remote.verticalVelocity = packet.vz;
        remote.facingAngle = packet.facingAngle;
        remote.isAiming = packet.isAiming;
        remote.aimTarget = packet.aimTarget;
        remote.isActivelyWalking = packet.isActivelyWalking;

        if (packet.heldObjectId) {
          const held = this.objects.find((o) => o.id === packet.heldObjectId);
          if (held) {
            remote.heldObject = held;
            held.isHeld = true;
            held.heldBy = remote;
          }
        } else if (remote.heldObject) {
          remote.heldObject.isHeld = false;
          remote.heldObject.heldBy = null;
          remote.heldObject = null;
        }
      }
    };

    net.onWorldSnapshot = (packet) => {
      // Non-host updates objects from host authoritative snapshot
      if (net.isHost) return;

      if (packet.arena) {
        this.arena.gravity = packet.arena.gravity;
        this.arena.frictionCoeff = packet.arena.frictionCoeff;
        this.arena.staticFrictionThreshold = packet.arena.staticFrictionThreshold;
      }

      for (const objData of packet.objects) {
        const localObj = this.objects.find((o) => o.id === objData.id);
        if (localObj) {
          if (!localObj.isHeld) {
            localObj.position.x = objData.x;
            localObj.position.y = objData.y;
            localObj.position.z = objData.z;
            localObj.velocity.x = objData.vx;
            localObj.velocity.y = objData.vy;
            localObj.verticalVelocity = objData.vz;
            localObj.supportingSurfaceHeight = objData.supportingSurfaceHeight;
            if (localObj.rollModule) {
              localObj.rollModule.angularVelocity.x = objData.rotX;
              localObj.rollModule.angularVelocity.y = objData.rotY;
              localObj.rollModule.angularVelocity.z = objData.rotZ;
            }
          }
        }
      }
    };

    net.onClientAction = (packet) => {
      // Host executes action requested by guest
      if (!net.isHost) return;
      const remote = this.remoteCharacters.get(packet.playerId);
      if (!remote) return;

      if (packet.action === "pickup" && packet.targetObjectId) {
        const target = this.objects.find((o) => o.id === packet.targetObjectId);
        if (target && !target.isHeld && remote.pickupModule) {
          remote.pickupModule.pickup(remote, target);
        }
      } else if (packet.action === "throw" && remote.heldObject && remote.throwModule) {
        remote.throwModule.throwHeldObject(
          remote,
          packet.aimX ?? remote.position.x + Math.cos(remote.facingAngle) * 5,
          packet.aimY ?? remote.position.y + Math.sin(remote.facingAngle) * 5,
          this.arena
        );
      } else if (packet.action === "drop" && remote.heldObject) {
        remote.heldObject.isHeld = false;
        remote.heldObject.heldBy = null;
        remote.heldObject = null;
      }
    };
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

    // Render current frame with active selection highlight & remote characters
    this.renderer.render(
      this.arena,
      this.character,
      this.objects,
      this.inputManager.selectedCanvasEntity,
      this.devPanel.isEditMode,
      this.inputManager.hoverEntity,
      Array.from(this.remoteCharacters.values())
    );

    // Update live inspector
    this.devPanel.updateInspector();

    requestAnimationFrame((t) => this.tick(t));
  }

  private updatePhysics(dt: number): void {
    const input = this.inputManager;
    const isHost = !this.networkManager || this.networkManager.isHost;

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

    // 2. Position held objects for remote characters
    for (const remote of this.remoteCharacters.values()) {
      if (remote.heldObject) {
        const handDist = remote.colliderRadius + remote.heldObject.colliderRadius * 0.5 + 0.08;
        remote.heldObject.position.x = remote.position.x + Math.cos(remote.facingAngle) * handDist;
        remote.heldObject.position.y = remote.position.y + Math.sin(remote.facingAngle) * handDist;
        remote.heldObject.position.z = remote.heldObject.hasVerticalPosition ? 0.45 : 0;
        remote.heldObject.velocity.x = remote.velocity.x;
        remote.heldObject.velocity.y = remote.velocity.y;
      }
    }

    // 3. Update all freebody objects (only Host runs authoritative freebody physics; guests follow snapshots)
    if (isHost) {
      for (const obj of this.objects) {
        if (input.draggedEntity === obj) {
          continue;
        }
        obj.updatePosition(dt, this.arena);
      }
    }

    // 4. Continuous hold-to-grab (only active in Play Mode):
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
        if (this.networkManager && !isHost) {
          this.networkManager.sendAction("pickup", target.id);
        }
      }
    }

    // 5. Resolve freebody-to-freebody circle collisions (including remote players!)
    this.resolveFreebodyCollisions();

    // 6. Network streaming
    if (this.networkManager) {
      this.networkManager.sendPlayerState(
        this.character.position.x,
        this.character.position.y,
        this.character.position.z,
        this.character.velocity.x,
        this.character.velocity.y,
        this.character.verticalVelocity,
        this.character.facingAngle,
        this.character.isAiming,
        this.character.aimTarget,
        this.character.heldObject?.id || null,
        this.character.isActivelyWalking
      );

      if (this.networkManager.isHost) {
        const snapshotObjects: ObjectNetworkData[] = this.objects.map((o) => ({
          id: o.id,
          x: o.position.x,
          y: o.position.y,
          z: o.position.z,
          vx: o.velocity.x,
          vy: o.velocity.y,
          vz: o.verticalVelocity,
          rotX: o.rollModule?.angularVelocity.x || 0,
          rotY: o.rollModule?.angularVelocity.y || 0,
          rotZ: o.rollModule?.angularVelocity.z || 0,
          isHeld: o.isHeld,
          heldByPlayerId: o.heldBy instanceof Character ? (o.heldBy as Character).playerId : null,
          supportingSurfaceHeight: o.supportingSurfaceHeight,
        }));

        this.networkManager.sendWorldSnapshot(snapshotObjects, {
          gravity: this.arena.gravity,
          frictionCoeff: this.arena.frictionCoeff,
          staticFrictionThreshold: this.arena.staticFrictionThreshold,
        });
      }
    }
  }

  private resolveFreebodyCollisions(): void {
    const all = [this.character, ...Array.from(this.remoteCharacters.values()), ...this.objects];
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

          // Two-Tier Altitude Collision Rule:
          // 1. All colliders below wall height collide with each other, and NOT with colliders above wall height.
          // 2. All colliders above wall height (including objects resting on walls) collide with each other, and NOT with colliders below wall height.
          const wallThreshold = this.arena.wallHeight - 0.15;
          const aAboveWall = a.position.z >= wallThreshold || a.supportingSurfaceHeight >= wallThreshold;
          const bAboveWall = b.position.z >= wallThreshold || b.supportingSurfaceHeight >= wallThreshold;

          // If one is above wall height and the other is not, they never collide (clean pass-over)
          if (aAboveWall !== bAboveWall) continue;

          // 2D planar distance between the centers of the two colliders
          const dx = b.position.x - a.position.x;
          const dy = b.position.y - a.position.y;
          const dist2DSq = dx * dx + dy * dy;
          const minDist = a.colliderRadius + b.colliderRadius;

          if (dist2DSq < minDist * minDist && dist2DSq > 0.000001) {
            const dist = Math.sqrt(dist2DSq);
            const overlap = minDist - dist;
            const normX = dx / dist;
            const normY = dy / dist;

            // Relative 2D velocity (B relative to A)
            const relVx = b.velocity.x - a.velocity.x;
            const relVy = b.velocity.y - a.velocity.y;
            const velAlongNormal = relVx * normX + relVy * normY;

            const isMasslessA = !a.hasMass;
            const isMasslessB = !b.hasMass;

            // Case 1: Both objects are massless (50/50 separation without mass ratio)
            if (isMasslessA && isMasslessB) {
              a.position.x -= normX * overlap * 0.5;
              a.position.y -= normY * overlap * 0.5;
              b.position.x += normX * overlap * 0.5;
              b.position.y += normY * overlap * 0.5;

              if (velAlongNormal < 0) {
                const impulse = -velAlongNormal * 0.5;
                a.velocity.x -= impulse * normX;
                a.velocity.y -= impulse * normY;
                b.velocity.x += impulse * normX;
                b.velocity.y += impulse * normY;
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

                if (velAlongNormal < 0) {
                  // B inherits closing velocity along normal from A without dampening A
                  b.velocity.x += (a.velocity.x - b.velocity.x) * Math.abs(normX);
                  b.velocity.y += (a.velocity.y - b.velocity.y) * Math.abs(normY);
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

                if (velAlongNormal < 0) {
                  a.velocity.x += (b.velocity.x - a.velocity.x) * Math.abs(normX);
                  a.velocity.y += (b.velocity.y - a.velocity.y) * Math.abs(normY);
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

            // Positional separation in 2D
            a.position.x -= normX * overlap * ratioA;
            a.position.y -= normY * overlap * ratioA;
            b.position.x += normX * overlap * ratioB;
            b.position.y += normY * overlap * ratioB;

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

              b.velocity.x += normalImpulse * invMassB * normX;
              b.velocity.y += normalImpulse * invMassB * normY;

              // Tangential relative velocity (perpendicular to normal)
              const tangX = -normY;
              const tangY = normX;
              const relVt = relVx * tangX + relVy * tangY;

              if (Math.abs(relVt) > 0.001) {
                // Contact friction
                const muObj = 0.35 * Math.sqrt(a.dynamicGroundFrictionMod * b.dynamicGroundFrictionMod);
                const beta = 0.4; // Sphere rotational inertia factor
                const stickImpulse = Math.abs(relVt) / (invMassSum * (1 + 1 / beta));
                const maxFricImpulse = muObj * Math.abs(normalImpulse);
                const fricImpulse = Math.min(stickImpulse, maxFricImpulse) * Math.sign(relVt);

                // Tangential impulse opposes relative sliding velocity
                a.velocity.x += fricImpulse * invMassA * tangX;
                a.velocity.y += fricImpulse * invMassA * tangY;

                b.velocity.x -= fricImpulse * invMassB * tangX;
                b.velocity.y -= fricImpulse * invMassB * tangY;

                // Rotational coupling if roll module is present
                if (a.rollModule && a.rollModule.enabled) {
                  const spinImpulse = fricImpulse / (beta * a.mass * a.colliderRadius);
                  a.rollModule.angularVelocity.z += spinImpulse;
                  a.rollModule.angularVelocity.z = Math.max(-30, Math.min(30, a.rollModule.angularVelocity.z));

                  if (a.isRestingOnSurface) {
                    a.rollModule.angularVelocity.y = a.velocity.x / a.colliderRadius;
                    a.rollModule.angularVelocity.x = -a.velocity.y / a.colliderRadius;
                  }
                }

                if (b.rollModule && b.rollModule.enabled) {
                  const spinImpulseB = fricImpulse / (beta * b.mass * b.colliderRadius);
                  b.rollModule.angularVelocity.z -= spinImpulseB;
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
