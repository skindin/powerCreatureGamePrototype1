import { Arena } from "./Arena.js";
import { Character } from "../character/Character.js";
import { GameObject } from "./GameObject.js";
import { Renderer } from "./Renderer.js";
import { InputManager } from "../ui/InputManager.js";
import { DevPanel } from "../ui/DevPanel.js";

import { ActiveAimCursor } from "./Renderer.js";

export interface PlayerEntry {
  id: string; // "keyboard" | "gamepad-0" | "gamepad-1" | ...
  name: string;
  playerNumber: number; // 1, 2, 3, 4
  color: string;
  isKeyboard: boolean;
  slotIndex?: number;
  character: Character;
}

export const PLAYER_COLORS = [
  "#f59e0b", // P1: Amber Gold
  "#06b6d4", // P2: Cyan
  "#10b981", // P3: Emerald
  "#a855f7", // P4: Violet
  "#f43f5e", // P5: Rose
  "#3b82f6", // P6: Blue
];

export class GameLoop {
  private arena: Arena;
  private objects: GameObject[];
  private renderer: Renderer;
  private inputManager: InputManager;
  private devPanel: DevPanel;

  // Active multiplayer players in the arena
  public players: Map<string, PlayerEntry> = new Map();
  public onPlayersChanged?: () => void;

  private isRunning = false;
  private lastTime = 0;
  private accumulator = 0;
  private readonly fixedDt = 1 / 60; // 60Hz fixed simulation timestep

  public getGhostSnapshot?: (dt: number) => import("../network/RelayClient.js").GhostSnapshot | null;
  public onPhysicsTick?: (dt: number, nowMs: number) => void;

  public get allCharacters(): Character[] {
    return Array.from(this.players.values()).map((p) => p.character);
  }

  public get primaryCharacter(): Character | null {
    const k = this.players.get("keyboard");
    if (k) return k.character;
    const first = this.players.values().next().value;
    return first ? first.character : null;
  }

  // Backward compatibility getter for singleplayer inspect references
  public get character(): Character {
    const primary = this.primaryCharacter;
    if (primary) return primary;
    // Fallback dummy character if all players removed
    return new Character({ name: "Unassigned", x: 0, y: 0 });
  }

  constructor(options: {
    arena: Arena;
    character?: Character;
    objects: GameObject[];
    renderer: Renderer;
    inputManager: InputManager;
    devPanel: DevPanel;
  }) {
    this.arena = options.arena;
    this.objects = options.objects;
    this.renderer = options.renderer;
    this.inputManager = options.inputManager;
    this.devPanel = options.devPanel;

    // Hook input manager on-demand join & disconnect callbacks
    this.inputManager.onKeyboardJoin = () => {
      this.spawnKeyboardPlayer();
    };

    this.inputManager.onGamepadJoin = (slotIndex: number) => {
      const slot = this.inputManager.gamepadSlots.get(slotIndex);
      this.spawnGamepadPlayer(slotIndex, slot?.id);
    };

    this.inputManager.onGamepadDisconnected = (slotIndex: number) => {
      this.removeGamepadPlayer(slotIndex);
    };

    // Spawn initial keyboard player if provided
    if (options.character) {
      this.spawnKeyboardPlayer(options.character);
    }
  }

  private getNextPlayerNumber(): number {
    const used = new Set<number>();
    for (const p of this.players.values()) {
      used.add(p.playerNumber);
    }
    for (let num = 1; num <= 8; num++) {
      if (!used.has(num)) return num;
    }
    return this.players.size + 1;
  }

  public spawnKeyboardPlayer(existingChar?: Character): Character {
    const current = this.players.get("keyboard");
    if (current) return current.character;

    const playerNum = 1;
    const color = PLAYER_COLORS[(playerNum - 1) % PLAYER_COLORS.length];
    let char = existingChar;

    if (!char) {
      char = new Character({
        x: 4.8,
        y: 7.0,
        color,
        colliderRadius: 0.44,
        mass: 1.2,
        strength: 1.0,
        playerId: "keyboard",
        playerNumber: playerNum,
        name: "Player 1",
      });
    } else {
      char.playerId = "keyboard";
      char.playerNumber = playerNum;
      char.playerColor = color;
      char.color = color;
    }

    this.inputManager.isKeyboardActive = true;
    this.players.set("keyboard", {
      id: "keyboard",
      name: "Keyboard & Mouse",
      playerNumber: playerNum,
      color,
      isKeyboard: true,
      character: char,
    });

    this.arena.syncEntitiesWithWalls([char]);
    this.onPlayersChanged?.();
    return char;
  }

  public removeKeyboardPlayer(): void {
    const entry = this.players.get("keyboard");
    if (!entry) return;

    entry.character.cleanupBeforeRemoval();
    this.players.delete("keyboard");
    this.inputManager.isKeyboardActive = false;
    this.onPlayersChanged?.();
  }

  public spawnGamepadPlayer(slotIndex: number, gamepadName?: string): Character {
    const key = `gamepad-${slotIndex}`;
    const existing = this.players.get(key);
    if (existing) return existing.character;

    const playerNum = this.getNextPlayerNumber();
    const color = PLAYER_COLORS[(playerNum - 1) % PLAYER_COLORS.length];
    const cleanName = gamepadName
      ? (gamepadName.length > 28 ? gamepadName.slice(0, 28) + "…" : gamepadName)
      : `Controller #${slotIndex + 1}`;

    const char = new Character({
      x: 4.8 + (slotIndex + 1) * 1.2,
      y: 7.0,
      color,
      colliderRadius: 0.44,
      mass: 1.2,
      strength: 1.0,
      playerId: key,
      playerNumber: playerNum,
      name: `Player ${playerNum}`,
    });

    this.players.set(key, {
      id: key,
      name: cleanName,
      playerNumber: playerNum,
      color,
      isKeyboard: false,
      slotIndex,
      character: char,
    });

    const slot = this.inputManager.gamepadSlots.get(slotIndex);
    if (slot) {
      slot.isActive = true;
      slot.aimOffsetInitialized = false;
    }

    this.arena.syncEntitiesWithWalls([char]);
    this.onPlayersChanged?.();
    return char;
  }

  public removeGamepadPlayer(slotIndex: number): void {
    const key = `gamepad-${slotIndex}`;
    const entry = this.players.get(key);
    if (!entry) return;

    entry.character.cleanupBeforeRemoval();
    this.players.delete(key);

    const slot = this.inputManager.gamepadSlots.get(slotIndex);
    if (slot) {
      slot.isActive = false;
    }

    this.onPlayersChanged?.();
  }

  public removePlayer(playerId: string): void {
    if (playerId === "keyboard") {
      this.removeKeyboardPlayer();
    } else if (playerId.startsWith("gamepad-")) {
      const idx = parseInt(playerId.replace("gamepad-", ""), 10);
      if (!isNaN(idx)) {
        this.removeGamepadPlayer(idx);
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
      if (this.onPhysicsTick) {
        this.onPhysicsTick(this.fixedDt, currentTime);
      }
      this.accumulator -= this.fixedDt;
    }

    // Determine target grab entities for each active character (for hover highlight)
    const targetGrabEntities = new Map<Character, GameObject | null>();
    if (!this.devPanel.isEditMode) {
      for (const entry of this.players.values()) {
        const char = entry.character;
        if (char.heldObject || !char.pickupModule) continue;

        const aimPos = entry.isKeyboard
          ? this.inputManager.mousePos
          : (this.inputManager.gamepadSlots.get(entry.slotIndex ?? 0)?.aimPos ?? { x: char.position.x, y: char.position.y });

        const others = [...this.allCharacters.filter((c) => c !== char), ...this.objects];
        const target = char.pickupModule.findTargetObject(
          char,
          aimPos.x,
          aimPos.y,
          others,
          this.arena.wallHeight
        );
        if (target) {
          targetGrabEntities.set(char, target);
        }
      }
    }

    // Build active aim cursors for all players
    const activeAimCursors: ActiveAimCursor[] = [];

    // Keyboard player aim cursor
    const kEntry = this.players.get("keyboard");
    if (kEntry && this.inputManager.isKeyboardActive) {
      activeAimCursors.push({
        x: this.inputManager.mousePos.x,
        y: this.inputManager.mousePos.y,
        color: kEntry.character.playerColor,
        playerNumber: kEntry.character.playerNumber,
        character: kEntry.character,
        isGamepad: false,
      });
    }

    // Gamepad players aim cursors
    for (const entry of this.players.values()) {
      if (entry.isKeyboard || entry.slotIndex === undefined) continue;
      const slot = this.inputManager.gamepadSlots.get(entry.slotIndex);
      if (slot && slot.connected) {
        activeAimCursors.push({
          x: slot.aimPos.x,
          y: slot.aimPos.y,
          color: entry.character.playerColor,
          playerNumber: entry.character.playerNumber,
          character: entry.character,
          isGamepad: true,
        });
      }
    }

    // Render current frame with active selection highlight & wall tool indicators
    const isWallEditor = this.devPanel.isEditMode && this.devPanel.editTool === "walls";
    const ghostData = this.getGhostSnapshot ? this.getGhostSnapshot(deltaSeconds) : null;

    this.renderer.render(
      this.arena,
      this.allCharacters,
      this.objects,
      this.inputManager.selectedCanvasEntity,
      this.devPanel.isEditMode,
      this.inputManager.hoverEntity,
      targetGrabEntities,
      isWallEditor,
      this.inputManager.hoverWallTile,
      ghostData,
      activeAimCursors
    );

    // Update live inspector
    this.devPanel.updateInspector();

    requestAnimationFrame((t) => this.tick(t));
  }

  private updatePhysics(dt: number): void {
    const input = this.inputManager;

    // 1. Poll connected Gamepads (rising-edge A button to join, analog sticks, triggers)
    input.pollGamepadSlots(this.players, this.objects, this.arena, this.allCharacters);

    // 2. Update Keyboard Player (if active in arena)
    const kEntry = this.players.get("keyboard");
    if (kEntry && input.isKeyboardActive) {
      const kChar = kEntry.character;
      const isMouseAiming = !this.devPanel.isEditMode && (input.isMouseDown || kChar.heldObject !== null);
      const aimTarget = isMouseAiming ? input.mousePos : null;

      if (input.draggedEntity !== kChar) {
        kChar.updateCharacter(
          dt,
          input.movementVector,
          isMouseAiming,
          aimTarget,
          this.arena,
          input.isClimbHeld
        );
      } else {
        kChar.velocity.x = 0;
        kChar.velocity.y = 0;
      }

      // Continuous hold-to-grab for keyboard mouse:
      if (!this.devPanel.isEditMode && input.isGrabHeld && !kChar.heldObject && kChar.pickupModule) {
        const otherEntities = [...this.allCharacters.filter((c) => c !== kChar), ...this.objects];
        const target = kChar.pickupModule.findTargetObject(
          kChar,
          input.mousePos.x,
          input.mousePos.y,
          otherEntities,
          this.arena.wallHeight
        );
        if (target) {
          kChar.pickupModule.pickup(kChar, target);
          input.justPickedUp = true;
        }
      }
    }

    // 3. Update Gamepad Players
    for (const entry of this.players.values()) {
      if (entry.isKeyboard || entry.slotIndex === undefined) continue;
      const slot = input.gamepadSlots.get(entry.slotIndex);
      if (!slot || !slot.connected) continue;

      const cChar = entry.character;
      if (input.draggedEntity !== cChar) {
        cChar.updateCharacter(
          dt,
          slot.movementVector,
          true, // Controller virtual aim cursor is always active
          slot.aimPos,
          this.arena,
          slot.isClimbHeld
        );
      } else {
        cChar.velocity.x = 0;
        cChar.velocity.y = 0;
      }
    }

    // 4. Update all freebody objects (skip physics integration while manually dragged in Edit Mode)
    for (const obj of this.objects) {
      if (input.draggedEntity === obj) continue;
      obj.updatePosition(dt, this.arena);
    }

    // 5. Resolve freebody-to-freebody circle collisions across all characters and objects
    this.resolveFreebodyCollisions();
  }

  private resolveFreebodyCollisions(): void {
    const all = [...this.allCharacters, ...this.objects];
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

          // Infinite Virtual Layer Collision Rule:
          // Objects only collide if they are on the exact same layer (height / wallHeight).
          // Only Layer 1 has walls.
          const layerA = GameObject.getEntityLayer(a, this.arena.wallHeight);
          const layerB = GameObject.getEntityLayer(b, this.arena.wallHeight);
          if (layerA !== layerB) continue;

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
