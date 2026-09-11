import { Arena } from "./Arena.js";
import { Character } from "../character/Character.js";
import { GameObject } from "./GameObject.js";
import { Renderer } from "./Renderer.js";
import { InputManager } from "../ui/InputManager.js";
import { DevPanel } from "../ui/DevPanel.js";
import { Trajectory } from "./Trajectory.js";
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
  private objectOwnershipLocks = new Map<string, number>();
  private lastImpulseBroadcast = new Map<string, number>();

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
        // Soft error correction for remote character position
        const dx = packet.x - remote.position.x;
        const dy = packet.y - remote.position.y;
        const errDist = Math.hypot(dx, dy);

        if (errDist >= 1.2) {
          // Hard snap if major divergence (teleport / spawn)
          remote.position.x = packet.x;
          remote.position.y = packet.y;
        } else if (errDist > 0.02) {
          // Soft blend to eliminate stutter
          remote.position.x += dx * 0.35;
          remote.position.y += dy * 0.35;
        }

        const dz = packet.z - remote.position.z;
        if (Math.abs(dz) >= 0.8) {
          remote.position.z = packet.z;
        } else if (Math.abs(dz) > 0.02) {
          remote.position.z += dz * 0.35;
        }

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

    net.onObjectAction = (packet) => {
      const target = this.objects.find((o) => o.id === packet.objectId);
      if (!target) return;

      const actor =
        this.remoteCharacters.get(packet.playerId) ||
        (this.character.playerId === packet.playerId ? this.character : null);

      if (packet.action === "pickup") {
        if (actor) {
          actor.heldObject = target;
          target.isHeld = true;
          target.heldBy = actor;
          this.objectOwnershipLocks.set(target.id, performance.now() + 5000);
        }
      } else if (packet.action === "drop") {
        target.isHeld = false;
        target.heldBy = null;
        if (actor && actor.heldObject === target) {
          actor.heldObject = null;
        }
        if (packet.x !== undefined && packet.y !== undefined) {
          target.position.x = packet.x;
          target.position.y = packet.y;
          target.position.z = packet.z ?? 0;
        }
        target.velocity.x = packet.vx ?? 0;
        target.velocity.y = packet.vy ?? 0;
        target.verticalVelocity = packet.vz ?? 0;
        this.objectOwnershipLocks.set(target.id, performance.now() + 1500);
      } else if (packet.action === "throw" || packet.action === "impulse") {
        target.isHeld = false;
        target.heldBy = null;
        if (actor && actor.heldObject === target) {
          actor.heldObject = null;
        }

        const now = this.networkManager ? this.networkManager.getSyncedTime() : Date.now();
        // Time elapsed over network transit (in seconds)
        const elapsedSec = Math.max(0, Math.min(0.3, (now - packet.timestamp) / 1000));

        // Synchronize velocities
        target.velocity.x = packet.vx ?? 0;
        target.velocity.y = packet.vy ?? 0;
        target.verticalVelocity = packet.vz ?? 0;

        if (target.rollModule) {
          target.rollModule.angularVelocity.x = packet.rotX ?? 0;
          target.rollModule.angularVelocity.y = packet.rotY ?? 0;
          target.rollModule.angularVelocity.z = packet.rotZ ?? 0;
        }

        // Extrapolate position forward by elapsedSec so it aligns with sender's current time
        const startX = packet.x ?? target.position.x;
        const startY = packet.y ?? target.position.y;
        const startZ = packet.z ?? target.position.z;
        const g = this.arena.gravity;

        target.position.x = startX + target.velocity.x * elapsedSec;
        target.position.y = startY + target.velocity.y * elapsedSec;
        target.position.z = Math.max(
          target.supportingSurfaceHeight,
          startZ + target.verticalVelocity * elapsedSec - 0.5 * g * elapsedSec * elapsedSec
        );

        // Lock against background snapshot overrides while in motion
        this.objectOwnershipLocks.set(target.id, performance.now() + 2000);
      }
    };

    net.onTrajectoryLaunch = (packet) => {
      const target = this.objects.find((o) => o.id === packet.objectId);
      if (!target) return;

      // Detach from any character holding it
      target.isHeld = false;
      target.heldBy = null;
      for (const remote of this.remoteCharacters.values()) {
        if (remote.heldObject === target) remote.heldObject = null;
      }
      if (this.character.heldObject === target) {
        this.character.heldObject = null;
      }

      // Pre-calculate identical deterministic trajectory from launch point
      target.trajectory = Trajectory.build(
        target,
        packet.x0,
        packet.y0,
        packet.z0,
        packet.vx0,
        packet.vy0,
        packet.vz0,
        packet.t0,
        this.arena
      );
    };

    net.onWorldSnapshot = (packet) => {
      // Non-host reconciles objects with host authoritative snapshot
      if (net.isHost) return;

      if (packet.arena) {
        this.arena.gravity = packet.arena.gravity;
        this.arena.frictionCoeff = packet.arena.frictionCoeff;
        this.arena.staticFrictionThreshold = packet.arena.staticFrictionThreshold;
      }

      for (const objData of packet.objects) {
        const localObj = this.objects.find((o) => o.id === objData.id);
        if (localObj) {
          // 1. If currently held by local player, local prediction is authoritative
          if (this.character.heldObject === localObj) {
            continue;
          }

          // 2. If object is animating along an analytical trajectory, DO NOT overwrite with snapshot!
          if (localObj.trajectory) {
            continue;
          }

          // 3. If locked by recent interaction action, skip snapshot override!
          const lockUntil = this.objectOwnershipLocks.get(localObj.id);
          if (lockUntil && performance.now() < lockUntil) {
            continue;
          }

          if (objData.isHeld) {
            localObj.isHeld = true;
            localObj.position.x = objData.x;
            localObj.position.y = objData.y;
            localObj.position.z = objData.z;
            localObj.velocity.x = objData.vx;
            localObj.velocity.y = objData.vy;
            localObj.verticalVelocity = objData.vz;
            continue;
          } else {
            localObj.isHeld = false;
          }

          // Resting alignment: verify resting positions agree down to the millimeter
          const isAtRest =
            Math.hypot(objData.vx, objData.vy) < 0.05 &&
            Math.hypot(localObj.velocity.x, localObj.velocity.y) < 0.05;

          if (isAtRest) {
            const dx = objData.x - localObj.position.x;
            const dy = objData.y - localObj.position.y;
            const errDist = Math.hypot(dx, dy);
            if (errDist > 0.02) {
              localObj.position.x += dx * 0.5;
              localObj.position.y += dy * 0.5;
            }
            localObj.velocity.x = 0;
            localObj.velocity.y = 0;
          }
        }
      }
    };

    net.onHostEvent = (packet) => {
      if (net.isHost) return;
      if (packet.event === "object_deleted" && packet.objectId) {
        const idx = this.objects.findIndex((o) => o.id === packet.objectId);
        if (idx !== -1) {
          const removed = this.objects.splice(idx, 1)[0];
          if (this.character.heldObject === removed) {
            this.character.heldObject = null;
          }
          this.devPanel.updateSelectorOptions();
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
          target.trajectory = null;
          remote.pickupModule.pickup(remote, target);
        }
      } else if (packet.action === "throw" && remote.heldObject && remote.throwModule) {
        const thrown = remote.heldObject;
        remote.throwModule.throwHeldObject(
          remote,
          packet.aimX ?? remote.position.x + Math.cos(remote.facingAngle) * 5,
          packet.aimY ?? remote.position.y + Math.sin(remote.facingAngle) * 5,
          this.arena
        );
        this.broadcastTrajectoryLaunch(thrown);
      } else if (packet.action === "drop" && remote.heldObject) {
        const dropped = remote.heldObject;
        remote.heldObject.isHeld = false;
        remote.heldObject.heldBy = null;
        remote.heldObject = null;
        this.broadcastTrajectoryLaunch(dropped);
      }
    };
  }

  /**
   * Pre-calculates an analytical trajectory for the object and broadcasts
   * its initial launch state to all other clients.
   */
  public broadcastTrajectoryLaunch(obj: GameObject, t0?: number): void {
    const launchTime = t0 ?? (this.networkManager ? this.networkManager.getSyncedTime() : Date.now());

    // Precalculate trajectory locally
    obj.trajectory = Trajectory.build(
      obj,
      obj.position.x,
      obj.position.y,
      obj.position.z,
      obj.velocity.x,
      obj.velocity.y,
      obj.verticalVelocity,
      launchTime,
      this.arena
    );

    if (this.networkManager) {
      this.networkManager.sendTrajectoryLaunch({
        objectId: obj.id,
        t0: launchTime,
        x0: obj.position.x,
        y0: obj.position.y,
        z0: obj.position.z,
        vx0: obj.velocity.x,
        vy0: obj.velocity.y,
        vz0: obj.verticalVelocity,
      });
    }
  }

  /**
   * Broadcast an object interaction (pickup, drop)
   */
  public broadcastObjectAction(
    action: "throw" | "pickup" | "drop" | "impulse",
    obj: GameObject
  ): void {
    if (!this.networkManager) return;
    this.objectOwnershipLocks.set(obj.id, performance.now() + 2000);

    this.networkManager.sendObjectAction({
      action,
      objectId: obj.id,
      x: obj.position.x,
      y: obj.position.y,
      z: obj.position.z,
      vx: obj.velocity.x,
      vy: obj.velocity.y,
      vz: obj.verticalVelocity,
      rotX: obj.rollModule?.angularVelocity.x || 0,
      rotY: obj.rollModule?.angularVelocity.y || 0,
      rotZ: obj.rollModule?.angularVelocity.z || 0,
      timestamp: this.networkManager.getSyncedTime(),
    });
  }

  private checkAndBroadcastImpulse(obj: GameObject): void {
    const speed = Math.hypot(obj.velocity.x, obj.velocity.y, obj.verticalVelocity);
    if (speed > 0.12) {
      const now = performance.now();
      const last = this.lastImpulseBroadcast.get(obj.id) || 0;
      if (now - last > 50) {
        this.lastImpulseBroadcast.set(obj.id, now);
        this.broadcastTrajectoryLaunch(obj);
      }
    }
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

    // 2. Extrapolate remote characters with dead-reckoning velocity integration
    for (const remote of this.remoteCharacters.values()) {
      remote.position.x += remote.velocity.x * dt;
      remote.position.y += remote.velocity.y * dt;
      if (remote.verticalPositionModule) {
        remote.position.z += remote.verticalVelocity * dt;
      }

      if (remote.heldObject) {
        const handDist = remote.colliderRadius + remote.heldObject.colliderRadius * 0.5 + 0.08;
        remote.heldObject.position.x = remote.position.x + Math.cos(remote.facingAngle) * handDist;
        remote.heldObject.position.y = remote.position.y + Math.sin(remote.facingAngle) * handDist;
        remote.heldObject.position.z = remote.heldObject.hasVerticalPosition ? 0.45 : 0;
        remote.heldObject.velocity.x = remote.velocity.x;
        remote.heldObject.velocity.y = remote.velocity.y;
      }
    }

    // 3. Update all freebody objects locally on BOTH Host and Guest at 60 FPS
    const nowSynced = this.networkManager ? this.networkManager.getSyncedTime() : Date.now();
    for (const obj of this.objects) {
      if (input.draggedEntity === obj || obj.isHeld) {
        if (obj.trajectory) obj.trajectory = null;
        continue;
      }

      if (obj.trajectory) {
        const sample = obj.trajectory.sample(nowSynced);
        obj.position.x = sample.x;
        obj.position.y = sample.y;
        obj.position.z = sample.z;
        obj.velocity.x = sample.vx;
        obj.velocity.y = sample.vy;
        obj.verticalVelocity = sample.vz;
        obj.supportingSurfaceHeight = this.arena.getSupportingSurfaceHeight(obj.position.x, obj.position.y);
        if (obj.rollModule && obj.rollModule.enabled) {
          obj.rollModule.angularVelocity.x = sample.rotX;
          obj.rollModule.angularVelocity.y = sample.rotY;
          obj.rollModule.angularVelocity.z = sample.rotZ;
          obj.rollModule.updateVisualPhase(dt);
        }
        if (obj.trajectory.isComplete(nowSynced)) {
          obj.trajectory = null;
          obj.velocity.x = 0;
          obj.velocity.y = 0;
          obj.verticalVelocity = 0;
        }
      } else {
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
        target.trajectory = null;
        this.character.pickupModule.pickup(this.character, target);
        input.justPickedUp = true;
        this.broadcastObjectAction("pickup", target);
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
    const localBumpedObjects = new Set<GameObject>();
    const objectCollisions = new Set<GameObject>();
    const remoteBumpedObjects = new Set<GameObject>();

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

              // Check collisions and clear old trajectories for recalculated paths
              if (a === this.character && !b.isHeld && this.objects.includes(b as GameObject)) {
                (b as GameObject).trajectory = null;
                localBumpedObjects.add(b as GameObject);
              } else if (b === this.character && !a.isHeld && this.objects.includes(a as GameObject)) {
                (a as GameObject).trajectory = null;
                localBumpedObjects.add(a as GameObject);
              } else if (this.objects.includes(a as GameObject) && this.objects.includes(b as GameObject)) {
                (a as GameObject).trajectory = null;
                (b as GameObject).trajectory = null;
                objectCollisions.add(a as GameObject);
                objectCollisions.add(b as GameObject);
              } else if (this.networkManager?.isHost) {
                if (this.objects.includes(b as GameObject) && !b.isHeld) {
                  (b as GameObject).trajectory = null;
                  remoteBumpedObjects.add(b as GameObject);
                } else if (this.objects.includes(a as GameObject) && !a.isHeld) {
                  (a as GameObject).trajectory = null;
                  remoteBumpedObjects.add(a as GameObject);
                }
              }
            }
          }
        }
      }

    // Recalculate & broadcast trajectories for any bumped objects after solver iterations
    for (const obj of localBumpedObjects) {
      this.checkAndBroadcastImpulse(obj);
    }

    if (!this.networkManager || this.networkManager.isHost) {
      for (const obj of objectCollisions) {
        this.checkAndBroadcastImpulse(obj);
      }
      for (const obj of remoteBumpedObjects) {
        this.checkAndBroadcastImpulse(obj);
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
