import { Arena } from "./Arena.js";
import { Character } from "../character/Character.js";
import { GameObject } from "./GameObject.js";
import { InputManager } from "../ui/InputManager.js";
import { ActiveAimCursor } from "./Renderer.js";
import { PlayerInputPacket, ReliableActionCommand } from "./physics/StateHistoryBuffer.js";

export interface PlayerEntry {
  id: string; // "keyboard" | "gamepad-0" | "gamepad-1" | ...
  name: string;
  playerNumber: number; // 1, 2, 3, 4
  color: string;
  isKeyboard: boolean;
  slotIndex?: number;
  character: Character;
  wasCursorVisible?: boolean;
  aimMovedWhileInRange?: boolean;
  lastCheckedMouseMoveTime?: number;
  wasHoldingObject?: boolean;
}

export const PLAYER_COLORS = [
  "#f59e0b", // P1: Amber Gold
  "#06b6d4", // P2: Cyan
  "#10b981", // P3: Emerald
  "#a855f7", // P4: Violet
  "#f43f5e", // P5: Rose
  "#3b82f6", // P6: Blue
];

/**
 * PlayerManager
 *
 * Dedicated manager for multiplayer slots, joining/dropping devices (Keyboard & Gamepads),
 * player character lifecycle, movement input dispatch, and cursor aim tracking.
 */
export class PlayerManager {
  private arena: Arena;
  private inputManager: InputManager;

  public players: Map<string, PlayerEntry> = new Map();
  public remotePlayers: Map<string, Character> = new Map();
  public onPlayersChanged?: () => void;
  public onReliableActionDispatched?: (action: ReliableActionCommand) => void;
  private actionSeq: number = 0;
  private lastHeldObjectIds: Map<string, string | null> = new Map();
  public baseCharacter: Character;
  public onPlayerJoined?: (player: PlayerEntry) => void;
  public onPlayerRemoved?: (playerId: string) => void;

  constructor(options: {
    arena: Arena;
    inputManager: InputManager;
    character?: Character;
  }) {
    this.arena = options.arena;
    this.inputManager = options.inputManager;

    const initialHandle = (() => {
      try {
        return localStorage.getItem("pcg_player_handle") || "Player 1";
      } catch {
        return "Player 1";
      }
    })();

    // Base character that exists in the arena waiting for a device to claim it
    this.baseCharacter = options.character || new Character({
      name: initialHandle,
      color: PLAYER_COLORS[0],
      x: 4.8,
      y: 7.0,
      colliderRadius: 0.44,
      mass: 1.2,
      strength: 1.0,
      playerNumber: 1,
    });
    this.baseCharacter.playerId = ""; // Unassigned
    this.baseCharacter.playerNumber = 1;
    this.baseCharacter.playerColor = PLAYER_COLORS[0];
    this.baseCharacter.color = PLAYER_COLORS[0];
    this.baseCharacter.name = initialHandle;
    this.inputManager.isKeyboardActive = false;
    this.arena.syncEntitiesWithWalls([this.baseCharacter]);

    // Hook input manager on-demand join & disconnect callbacks
    this.inputManager.onKeyboardJoin = () => {
      this.spawnKeyboardPlayer();
    };

    this.inputManager.onKeyboardJump = () => {
      const kChar = this.players.get("keyboard")?.character;
      if (kChar) {
        kChar.jump(this.arena, this.inputManager.movementVector);
      }
    };

    this.inputManager.onGamepadJoin = (slotIndex: number) => {
      const slot = this.inputManager.gamepadSlots.get(slotIndex);
      this.spawnGamepadPlayer(slotIndex, slot?.id);
    };

    this.inputManager.onGamepadDisconnected = (slotIndex: number) => {
      this.removeGamepadPlayer(slotIndex);
    };
  }

  public get allCharacters(): Character[] {
    const activeChars = Array.from(this.players.values()).map((p) => p.character);
    const remotes = Array.from(this.remotePlayers.values());
    if (activeChars.length === 0 && remotes.length === 0) {
      return [this.baseCharacter];
    }
    if (activeChars.length === 0) {
      return [this.baseCharacter, ...remotes];
    }
    return [...activeChars, ...remotes];
  }

  public get primaryCharacter(): Character {
    const k = this.players.get("keyboard");
    if (k) return k.character;
    const first = this.players.values().next().value;
    if (first) return first.character;
    return this.baseCharacter;
  }

  public renamePlayer(playerId: string, newName: string): boolean {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    let found = false;
    const player = this.players.get(playerId);
    if (player) {
      player.name = trimmed;
      player.character.name = trimmed;
      player.character.hasCustomName = !/^Player(\s+\d+)?$/i.test(trimmed) && !/^Controller\s+#\d+$/i.test(trimmed);
      if (player.isKeyboard || playerId === "keyboard") {
        try { localStorage.setItem("pcg_player_handle", trimmed); } catch (_) {}
      }
      found = true;
    }

    if (this.baseCharacter && (this.baseCharacter.playerId === playerId || playerId === "keyboard" || this.baseCharacter.playerId === "")) {
      this.baseCharacter.name = trimmed;
      this.baseCharacter.hasCustomName = !/^Player(\s+\d+)?$/i.test(trimmed) && !/^Controller\s+#\d+$/i.test(trimmed);
      try { localStorage.setItem("pcg_player_handle", trimmed); } catch (_) {}
      found = true;
    }

    const remote = this.remotePlayers.get(playerId);
    if (remote) {
      remote.name = trimmed;
      remote.hasCustomName = !/^Player(\s+\d+)?$/i.test(trimmed) && !/^Controller\s+#\d+$/i.test(trimmed);
      found = true;
    }

    if (found) {
      this.onPlayersChanged?.();
      return true;
    }

    return false;
  }

  public syncRemoteCharacter(data: {
    id: string;
    name?: string;
    playerNumber?: number;
    color?: string;
    x: number;
    y: number;
    z: number;
    radius?: number;
    facingAngle?: number;
    isClimbing?: boolean;
  }): Character {
    let char = this.remotePlayers.get(data.id);
    if (!char) {
      const pNum = data.playerNumber ?? (this.players.size + this.remotePlayers.size + 1);
      const color = data.color || PLAYER_COLORS[(pNum - 1) % PLAYER_COLORS.length];
      char = new Character({
        x: data.x,
        y: data.y,
        color,
        colliderRadius: data.radius || 0.44,
        mass: 1.2,
        strength: 1.0,
        playerId: data.id,
        playerNumber: pNum,
        name: data.name || `Player ${pNum}`,
      });
      char.position.z = data.z;
      char.isImmovable = true;
      if (data.facingAngle !== undefined) char.facingAngle = data.facingAngle;
      if (data.isClimbing !== undefined) char.isClimbing = data.isClimbing;
      this.remotePlayers.set(data.id, char);
      this.arena.syncEntitiesWithWalls(this.allCharacters);
      this.onPlayersChanged?.();
    } else {
      char.isImmovable = true;
      if (data.name && data.name !== char.name) {
        char.name = data.name;
      }
      if (data.color && data.color !== char.color) {
        char.color = data.color;
        char.playerColor = data.color;
      }
      if (data.playerNumber !== undefined) {
        char.playerNumber = data.playerNumber;
      }
    }
    return char;
  }

  public removeRemoteCharacter(id: string): void {
    const char = this.remotePlayers.get(id);
    if (char) {
      char.cleanupBeforeRemoval();
      this.remotePlayers.delete(id);
      this.arena.syncEntitiesWithWalls(this.allCharacters);
      this.onPlayersChanged?.();
    }
  }

  public clearRemoteCharacters(): void {
    for (const char of this.remotePlayers.values()) {
      char.cleanupBeforeRemoval();
    }
    this.remotePlayers.clear();
    this.arena.syncEntitiesWithWalls(this.allCharacters);
    this.onPlayersChanged?.();
  }

  public getNextPlayerNumber(): number {
    const used = new Set<number>();
    for (const p of this.players.values()) {
      used.add(p.playerNumber);
    }
    for (let num = 1; num <= 8; num++) {
      if (!used.has(num)) return num;
    }
    return this.players.size + 1;
  }

  public spawnKeyboardPlayer(): Character {
    const current = this.players.get("keyboard");
    if (current) return current.character;

    // Check if baseCharacter is currently unassigned (no player device controlling it)
    const isBaseUnassigned = !Array.from(this.players.values()).some((p) => p.character === this.baseCharacter);
    let char: Character;

    if (isBaseUnassigned) {
      char = this.baseCharacter;
      char.playerId = "keyboard";
      if (!char.playerNumber) {
        char.playerNumber = 1;
      }
      if (!char.playerColor) {
        char.playerColor = char.color || PLAYER_COLORS[0];
      }
      char.color = char.playerColor;
      if (!char.name) {
        char.name = `Player ${char.playerNumber}`;
      }
    } else {
      const playerNum = this.getNextPlayerNumber();
      const color = PLAYER_COLORS[(playerNum - 1) % PLAYER_COLORS.length];
      char = new Character({
        x: 4.8,
        y: 7.0,
        color,
        colliderRadius: 0.44,
        mass: 1.2,
        strength: 1.0,
        playerId: "keyboard",
        playerNumber: playerNum,
        name: `Player ${playerNum}`,
      });
      this.arena.syncEntitiesWithWalls([char]);
    }

    this.inputManager.isKeyboardActive = true;
    const entry: PlayerEntry = {
      id: "keyboard",
      name: char.name || "Keyboard & Mouse",
      playerNumber: char.playerNumber,
      color: char.playerColor,
      isKeyboard: true,
      character: char,
    };
    this.players.set("keyboard", entry);

    this.onPlayersChanged?.();
    this.onPlayerJoined?.(entry);
    return char;
  }

  public removeKeyboardPlayer(): void {
    const entry = this.players.get("keyboard");
    if (!entry) return;

    entry.character.cleanupBeforeRemoval();
    entry.character.velocity.x = 0;
    entry.character.velocity.y = 0;

    const isLastPlayer = this.players.size <= 1;
    if (isLastPlayer) {
      // Don't delete the character! Just remove the keyboard connection
      entry.character.playerId = "";
      this.baseCharacter = entry.character;
    } else {
      if (entry.character === this.baseCharacter) {
        const other = Array.from(this.players.values()).find((p) => p.id !== "keyboard");
        if (other) {
          this.baseCharacter = other.character;
        }
      }
    }

    this.players.delete("keyboard");
    this.inputManager.isKeyboardActive = false;
    this.onPlayersChanged?.();
    this.onPlayerRemoved?.("keyboard");
  }

  public spawnGamepadPlayer(slotIndex: number, gamepadName?: string): Character {
    const key = `gamepad-${slotIndex}`;
    const existing = this.players.get(key);
    if (existing) return existing.character;

    const cleanName = gamepadName
      ? (gamepadName.length > 28 ? gamepadName.slice(0, 28) + "…" : gamepadName)
      : `Controller #${slotIndex + 1}`;

    const isBaseUnassigned = !Array.from(this.players.values()).some((p) => p.character === this.baseCharacter);
    let char: Character;

    if (isBaseUnassigned) {
      char = this.baseCharacter;
      char.playerId = key;
      if (!char.playerNumber) {
        char.playerNumber = 1;
      }
      if (!char.playerColor) {
        char.playerColor = char.color || PLAYER_COLORS[0];
      }
      char.color = char.playerColor;
      if (!char.name || /^Player(\s+\d+)?$/i.test(char.name.trim())) {
        char.name = `Player ${char.playerNumber}`;
        char.hasCustomName = false;
      }
    } else {
      const playerNum = this.getNextPlayerNumber();
      const color = PLAYER_COLORS[(playerNum - 1) % PLAYER_COLORS.length];
      char = new Character({
        x: 4.8 + (slotIndex + 1) * 1.2,
        y: 7.0,
        color,
        colliderRadius: 0.44,
        mass: 1.2,
        strength: 1.0,
        playerId: key,
        playerNumber: playerNum,
        name: `Player ${playerNum}`,
        hasCustomName: false,
      });
      char.hasCustomName = false;
      this.arena.syncEntitiesWithWalls([char]);
    }

    const entry: PlayerEntry = {
      id: key,
      name: cleanName,
      playerNumber: char.playerNumber,
      color: char.playerColor,
      isKeyboard: false,
      slotIndex,
      character: char,
    };
    this.players.set(key, entry);

    const slot = this.inputManager.gamepadSlots.get(slotIndex);
    if (slot) {
      slot.isActive = true;
      slot.aimOffsetInitialized = false;
    }

    this.onPlayersChanged?.();
    this.onPlayerJoined?.(entry);
    return char;
  }

  public removeGamepadPlayer(slotIndex: number): void {
    const key = `gamepad-${slotIndex}`;
    const entry = this.players.get(key);
    if (!entry) return;

    entry.character.cleanupBeforeRemoval();
    entry.character.velocity.x = 0;
    entry.character.velocity.y = 0;

    const isLastPlayer = this.players.size <= 1;
    if (isLastPlayer) {
      // Don't delete the character! Just remove the gamepad connection
      entry.character.playerId = "";
      this.baseCharacter = entry.character;
    } else {
      if (entry.character === this.baseCharacter) {
        const other = Array.from(this.players.values()).find((p) => p.id !== key);
        if (other) {
          this.baseCharacter = other.character;
        }
      }
    }

    this.players.delete(key);

    const slot = this.inputManager.gamepadSlots.get(slotIndex);
    if (slot) {
      slot.isActive = false;
    }

    this.onPlayersChanged?.();
    this.onPlayerRemoved?.(key);
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

  /**
   * Captures the input packets for all active players in the arena on the current tick.
   */
  public capturePlayerInputs(isEditMode: boolean, objects: GameObject[] = []): Map<string, PlayerInputPacket> {
    const map = new Map<string, PlayerInputPacket>();
    const input = this.inputManager;

    // 1. Keyboard
    const kEntry = this.players.get("keyboard");
    const isUnassignedKeyboard = !kEntry && this.players.size === 0 && input.isKeyboardActive && !input.isKeyboardSuspended;
    if ((kEntry || isUnassignedKeyboard) && !input.isKeyboardSuspended) {
      const kChar = kEntry ? kEntry.character : this.baseCharacter;
      const isMouseAiming = !isEditMode && (input.isMouseDown || kChar.heldObject !== null);
      
      // Determine explicit target object in reach if grab is active
      let grabTargetObjectId: string | null = null;
      if (input.isGrabHeld && !kChar.heldObject && kChar.pickupModule) {
        const aimTarget = isMouseAiming ? input.actualMousePos : null;
        const aimX = aimTarget ? aimTarget.x : kChar.position.x;
        const aimY = aimTarget ? aimTarget.y : kChar.position.y;
        const candidateEntities = [...this.allCharacters.filter((c) => c !== kChar), ...objects];
        const target = kChar.pickupModule.findTargetObject(
          kChar,
          aimX,
          aimY,
          candidateEntities,
          this.arena.wallHeight
        );
        if (target) {
          grabTargetObjectId = target.id;
        }
      }

      // Ensure facingAngle is explicit: face locked target object if locked, otherwise face aim when holding, movement direction when walking
      if (kChar.heldObject) {
        const lockTarget = kChar.activeTrajectory?.isAutoLocked && kChar.activeTrajectory.targetObject
          ? kChar.activeTrajectory.targetObject
          : null;
        if (lockTarget) {
          const aimDx = lockTarget.position.x - kChar.position.x;
          const aimDy = lockTarget.position.y - kChar.position.y;
          if (Math.hypot(aimDx, aimDy) > 0.05) {
            kChar.facingAngle = Math.atan2(aimDy, aimDx);
          }
        } else {
          const aimDx = input.actualMousePos.x - kChar.position.x;
          const aimDy = input.actualMousePos.y - kChar.position.y;
          if (Math.hypot(aimDx, aimDy) > 0.05) {
            kChar.facingAngle = Math.atan2(aimDy, aimDx);
          }
        }
      } else {
        const moveMag = Math.hypot(input.movementVector.x, input.movementVector.y);
        if (moveMag > 0.05) {
          kChar.facingAngle = Math.atan2(input.movementVector.y, input.movementVector.x);
        }
      }

      map.set("keyboard", {
        playerId: "keyboard",
        moveX: input.movementVector.x,
        moveY: input.movementVector.y,
        isSprinting: input.isKeyboardSprintActive,
        isJumpHeld: input.isKeyboardJumpHeld,
        isGrabHeld: input.isGrabHeld,
        grabTargetObjectId,
        isDrop: input.isKeyboardDropRequested ?? false,
        isThrow: input.isKeyboardThrowRequested ?? false,
        aimX: input.actualMousePos.x,
        aimY: input.actualMousePos.y,
        isAiming: isMouseAiming,
        isLockHeld: input.isRightMouseDown,
        facingAngle: kChar.facingAngle,
      });
      input.isKeyboardDropRequested = false;
      input.isKeyboardThrowRequested = false;
    }

    // 2. Gamepads
    for (const entry of this.players.values()) {
      if (entry.isKeyboard || entry.slotIndex === undefined) continue;
      const slot = input.gamepadSlots.get(entry.slotIndex);
      if (!slot || !slot.connected) continue;

      const cChar = entry.character;
      let aimX = slot.aimPos.x;
      let aimY = slot.aimPos.y;

      if (!slot.hasMovedAimStick) {
        let dirX = 1;
        let dirY = 0;
        const moveMag = Math.hypot(slot.movementVector.x, slot.movementVector.y);
        if (moveMag > 0.05) {
          dirX = slot.movementVector.x / moveMag;
          dirY = slot.movementVector.y / moveMag;
        } else {
          const inputAngle = slot.lastMovementInputAngle ?? cChar.lastMovementInputAngle ?? cChar.facingAngle ?? 0;
          dirX = Math.cos(inputAngle);
          dirY = Math.sin(inputAngle);
        }
        aimX = cChar.position.x + dirX * 3.0;
        aimY = cChar.position.y + dirY * 3.0;
      }

      const isGrab = (slot.rtHeld || slot.bHeld) ?? false;
      let grabTargetObjectId: string | null = null;
      if (isGrab && !cChar.heldObject && cChar.pickupModule) {
        const candidateEntities = [...this.allCharacters.filter((c) => c !== cChar), ...objects];
        const target = cChar.pickupModule.findTargetObject(
          cChar,
          aimX,
          aimY,
          candidateEntities,
          this.arena.wallHeight
        );
        if (target) {
          grabTargetObjectId = target.id;
        }
      }

      // Ensure facingAngle is explicit: face locked target object if locked, otherwise face aim when holding, movement direction when walking
      if (cChar.heldObject) {
        const lockTarget = cChar.activeTrajectory?.isAutoLocked && cChar.activeTrajectory.targetObject
          ? cChar.activeTrajectory.targetObject
          : null;
        if (lockTarget) {
          const aimDx = lockTarget.position.x - cChar.position.x;
          const aimDy = lockTarget.position.y - cChar.position.y;
          if (Math.hypot(aimDx, aimDy) > 0.05) {
            cChar.facingAngle = Math.atan2(aimDy, aimDx);
          }
        } else {
          const aimDx = aimX - cChar.position.x;
          const aimDy = aimY - cChar.position.y;
          if (Math.hypot(aimDx, aimDy) > 0.05) {
            cChar.facingAngle = Math.atan2(aimDy, aimDx);
          }
        }
      } else {
        const moveMag = Math.hypot(slot.movementVector.x, slot.movementVector.y);
        if (moveMag > 0.05) {
          cChar.facingAngle = Math.atan2(slot.movementVector.y, slot.movementVector.x);
        }
      }

      map.set(entry.id, {
        playerId: entry.id,
        playerName: cChar.name,
        moveX: slot.movementVector.x,
        moveY: slot.movementVector.y,
        isSprinting: cChar.isSprinting ?? false,
        isJumpHeld: slot.isClimbHeld ?? false,
        isGrabHeld: isGrab,
        grabTargetObjectId,
        isDrop: slot.isDropRequested ?? false,
        isThrow: slot.isThrowRequested ?? false,
        aimX,
        aimY,
        isAiming: true,
        isLockHeld: slot.isLockHeld ?? false,
        facingAngle: cChar.facingAngle,
      });
      slot.isDropRequested = false;
      slot.isThrowRequested = false;
    }

    return map;
  }

  /**
   * Applies player input packets to characters deterministically.
   */
  public applyPlayerInputs(
    inputs: Map<string, PlayerInputPacket>,
    dt: number,
    objects: GameObject[],
    isEditMode: boolean,
    isReplay = false
  ): void {
    const input = this.inputManager;

    for (const [playerId, pkt] of inputs) {
      const entry = this.players.get(playerId);
      const char = entry ? entry.character : (this.players.size === 0 && playerId === "keyboard" ? this.baseCharacter : null);
      if (!char) continue;
      if (input.draggedEntity === char) {
        char.velocity.x = 0;
        char.velocity.y = 0;
        continue;
      }

      if (char.isSprinting !== pkt.isSprinting) {
        char.setSprinting(pkt.isSprinting);
      }

      const aimTarget = pkt.aimX !== undefined && pkt.aimY !== undefined ? { x: pkt.aimX, y: pkt.aimY } : null;

      // Dedicated Drop (Q / Y)
      if (pkt.isDrop && char.heldObject && char.pickupModule) {
        const droppedObj = char.heldObject;
        char.pickupModule.drop(char);
        if (!isReplay) {
          const actPlayerId = entry?.id || char.playerId || playerId || "keyboard";
          const action: ReliableActionCommand = {
            actionId: `act-${actPlayerId}-drop-${++this.actionSeq}-${Date.now()}`,
            type: "drop",
            tick: pkt.tick ?? 0,
            timestamp: performance.now(),
            playerId: actPlayerId,
            targetObjectId: droppedObj.id,
          };
          this.onReliableActionDispatched?.(action);
        }
      }

      // Dedicated Throw (RT / RB / Left Click)
      if (pkt.isThrow && char.heldObject && char.throwModule) {
        const thrownObj = char.heldObject;
        const throwAimX = aimTarget ? aimTarget.x : (char.position.x + Math.cos(char.facingAngle) * 3);
        const throwAimY = aimTarget ? aimTarget.y : (char.position.y + Math.sin(char.facingAngle) * 3);

        // Immediately orient character to throw target direction
        const aimDx = throwAimX - char.position.x;
        const aimDy = throwAimY - char.position.y;
        if (Math.hypot(aimDx, aimDy) > 0.05) {
          char.facingAngle = Math.atan2(aimDy, aimDx);
        }

        char.throwModule.throwHeldObject(
          char,
          throwAimX,
          throwAimY,
          this.arena,
          undefined,
          undefined,
          pkt.isLockHeld
        );

        // Once the throw completes and character is empty-handed, reset aim stick movement flags
        if (entry && entry.slotIndex !== undefined) {
          const slot = input.gamepadSlots.get(entry.slotIndex);
          if (slot) {
            slot.hasMovedAimStick = false;
            slot.aimMovedWhileInRange = false;
          }
        }

        const actPlayerId = entry?.id || char.playerId || playerId || "keyboard";
        const action: ReliableActionCommand = {
          actionId: `act-${actPlayerId}-throw-${++this.actionSeq}-${Date.now()}`,
          type: "throw",
          tick: pkt.tick ?? 0,
          timestamp: performance.now(),
          playerId: actPlayerId,
          targetObjectId: thrownObj.id,
          aimX: throwAimX,
          aimY: throwAimY,
          isLockHeld: pkt.isLockHeld,
        };
        if (!isReplay) {
          this.onReliableActionDispatched?.(action);
        }
      }

      char.updateCharacter(
        dt,
        { x: pkt.moveX, y: pkt.moveY },
        pkt.isAiming,
        aimTarget,
        this.arena,
        pkt.isJumpHeld,
        this.arena.entities,
        pkt.isLockHeld
      );

      if (char.activeTrajectory?.isAutoLocked && char.activeTrajectory.targetObject) {
        const dx = char.activeTrajectory.targetObject.position.x - char.position.x;
        const dy = char.activeTrajectory.targetObject.position.y - char.position.y;
        if (Math.hypot(dx, dy) > 0.05) {
          char.facingAngle = Math.atan2(dy, dx);
        }
      } else if (pkt.facingAngle !== undefined) {
        char.facingAngle = pkt.facingAngle;
      }
      if (char.heldObject) {
        const heldPos = char.calculateHeldObjectPosition(this.arena);
        char.heldObject.position.x = heldPos.x;
        char.heldObject.position.y = heldPos.y;
        char.heldObject.position.z = heldPos.z;
      }

      // Explicit grab target resolution
      if (!isEditMode && pkt.isGrabHeld && !char.heldObject && char.pickupModule) {
        if (pkt.grabTargetObjectId !== undefined) {
          if (pkt.grabTargetObjectId !== null) {
            const otherEntities = [...this.allCharacters.filter((c) => c !== char), ...objects];
            const targetObj = otherEntities.find((e) => e.id === pkt.grabTargetObjectId);
            if (targetObj && char.pickupModule.isObjectInReach(char, targetObj, this.arena.wallHeight)) {
              char.pickupModule.pickup(char, targetObj);
            }
          }
        } else if (aimTarget) {
          // Fallback for legacy calls without grabTargetObjectId
          const otherEntities = [...this.allCharacters.filter((c) => c !== char), ...objects];
          char.pickupModule.pickupAndSwap(char, otherEntities, this.arena.wallHeight, aimTarget.x, aimTarget.y);
        }
      }

      // Detect newly acquired or released held object to reliably dispatch action
      const currentHeldId = char.heldObject ? char.heldObject.id : null;
      const prevHeldId = this.lastHeldObjectIds.get(char.id) ?? null;
      if (currentHeldId !== prevHeldId) {
        this.lastHeldObjectIds.set(char.id, currentHeldId);
        if (currentHeldId && !isReplay) {
          const actPlayerId = entry?.id || char.playerId || playerId || "keyboard";
          const action: ReliableActionCommand = {
            actionId: `act-${actPlayerId}-pickup-${++this.actionSeq}-${Date.now()}`,
            type: "pickup",
            tick: pkt.tick ?? 0,
            timestamp: performance.now(),
            playerId: actPlayerId,
            targetObjectId: currentHeldId,
          };
          this.onReliableActionDispatched?.(action);
        }
      }
    }

    // When no player device is connected and no keyboard packet was processed, settle baseCharacter naturally
    if (this.players.size === 0 && !inputs.has("keyboard")) {
      if (input.draggedEntity !== this.baseCharacter) {
        this.baseCharacter.updateCharacter(
          dt,
          { x: 0, y: 0 },
          false,
          null,
          this.arena,
          false,
          this.arena.entities
        );
      }
    }
  }

  /**
   * Updates character physics and input integration for all active players
   */
  public updatePlayers(
    dt: number,
    objects: GameObject[],
    isEditMode: boolean
  ): Map<string, PlayerInputPacket> {
    const inputs = this.capturePlayerInputs(isEditMode, objects);
    this.applyPlayerInputs(inputs, dt, objects, isEditMode);
    return inputs;
  }

  /**
   * Calculates cursor visibility and target grab entities for all active players
   */
  public computeAimCursorsAndGrabTargets(
    objects: GameObject[],
    isEditMode: boolean
  ): {
    targetGrabEntities: Map<Character, GameObject | null>;
    activeAimCursors: ActiveAimCursor[];
  } {
    const targetGrabEntities = new Map<Character, GameObject | null>();
    const activeAimCursors: ActiveAimCursor[] = [];

    if (isEditMode) {
      return { targetGrabEntities, activeAimCursors };
    }

    for (const entry of this.players.values()) {
      const char = entry.character;
      const isHolding = char.heldObject !== null;
      const others = [...this.allCharacters.filter((c) => c !== char), ...objects];
      const reachable = (char.pickupModule && char.pickupModule.enabled)
        ? others.filter((o) => char.pickupModule!.isObjectInReach(char, o, this.arena.wallHeight))
        : [];
      const hasReachable = reachable.length > 0;
      let isCursorVisibleNow = false;

      if (entry.isKeyboard) {
        if (!this.inputManager.isKeyboardActive || this.inputManager.isKeyboardSuspended) {
          entry.wasCursorVisible = false;
          this.inputManager.isCursorVisible = false;
          continue;
        }
        const mouseMoved = (this.inputManager.lastMouseMoveTime > (entry.lastCheckedMouseMoveTime ?? 0));
        entry.lastCheckedMouseMoveTime = this.inputManager.lastMouseMoveTime;

        entry.wasHoldingObject = isHolding;

        if (mouseMoved) {
          entry.aimMovedWhileInRange = true;
        }

        // Keyboard cursor is always visible
        isCursorVisibleNow = true;
        this.inputManager.mousePos.x = this.inputManager.actualMousePos.x;
        this.inputManager.mousePos.y = this.inputManager.actualMousePos.y;

        // In both controller and keyboard mode, always select the closest object on the ground to the cursor within range of the character to grab:
        if (hasReachable) {
          const reachableGroundObjects = reachable.filter((o) => o !== char.heldObject && !o.isHeld);
          if (reachableGroundObjects.length > 0) {
            const target = char.pickupModule!.findTargetObject(
              char,
              this.inputManager.actualMousePos.x,
              this.inputManager.actualMousePos.y,
              reachableGroundObjects,
              this.arena.wallHeight
            );
            if (target) {
              targetGrabEntities.set(char, target);
            }
          }
        }

        entry.wasCursorVisible = true;
        this.inputManager.isCursorVisible = true;

        const aimPos = this.inputManager.mousePos;
        activeAimCursors.push({
          x: aimPos.x,
          y: aimPos.y,
          color: char.playerColor,
          playerNumber: char.playerNumber,
          character: char,
          isGamepad: false,
        });
      } else if (entry.slotIndex !== undefined) {
        const slot = this.inputManager.gamepadSlots.get(entry.slotIndex);
        if (!slot || !slot.connected) continue;

        if (isHolding && !entry.wasHoldingObject) {
          slot.hasMovedAimStick = false;
        }
        entry.wasHoldingObject = isHolding;
        slot.wasHoldingObject = isHolding;

        if (!slot.aimOffset) {
          slot.aimOffset = { x: 0, y: 0 };
        }

        if (isHolding) {
          if (!slot.hasMovedAimStick) {
            let dirX = 1;
            let dirY = 0;
            const moveMag = Math.hypot(slot.movementVector.x, slot.movementVector.y);
            if (moveMag > 0.05) {
              dirX = slot.movementVector.x / moveMag;
              dirY = slot.movementVector.y / moveMag;
              slot.lastMovementInputAngle = Math.atan2(dirY, dirX);
              char.lastMovementInputAngle = slot.lastMovementInputAngle;
            } else {
              const inputAngle = slot.lastMovementInputAngle ?? char.lastMovementInputAngle ?? char.facingAngle ?? 0;
              dirX = Math.cos(inputAngle);
              dirY = Math.sin(inputAngle);
            }
            const forwardDist = 3.0;
            slot.aimPos.x = char.position.x + dirX * forwardDist;
            slot.aimPos.y = char.position.y + dirY * forwardDist;
            slot.aimOffset.x = dirX * forwardDist;
            slot.aimOffset.y = dirY * forwardDist;
          } else {
            // Preserve world aimPos instead of dragging it with player movement
            if (slot.aimPos) {
              slot.aimOffset.x = slot.aimPos.x - char.position.x;
              slot.aimOffset.y = slot.aimPos.y - char.position.y;
            }
          }

          // Holding an object: do not hide cursor at all!
          isCursorVisibleNow = true;
        } else {
          // Empty-handed: around something to grab or roaming
          if (!hasReachable) {
            // Hide cursor once nothing is within range anymore
            isCursorVisibleNow = false;
            slot.aimMovedWhileInRange = false;
            slot.aimPos.x = char.position.x;
            slot.aimPos.y = char.position.y;
            slot.aimOffset = slot.aimOffset || { x: 0, y: 0 };
            slot.aimOffset.x = 0;
            slot.aimOffset.y = 0;
          } else {
            // Has reachable items:
            if (!slot.aimMovedWhileInRange) {
              // When around something to grab, cursor starts directly at character!
              slot.aimPos.x = char.position.x;
              slot.aimPos.y = char.position.y;
              slot.aimOffset = slot.aimOffset || { x: 0, y: 0 };
              slot.aimOffset.x = 0;
              slot.aimOffset.y = 0;
            } else if (slot.aimPos) {
              slot.aimOffset = slot.aimOffset || { x: 0, y: 0 };
              slot.aimOffset.x = slot.aimPos.x - char.position.x;
              slot.aimOffset.y = slot.aimPos.y - char.position.y;
            }

            if (slot.aimMovedWhileInRange && slot.hasMovedAimStick) {
              isCursorVisibleNow = true;
            } else {
              isCursorVisibleNow = false;
            }
          }
        }

        // In both controller and keyboard mode, always select the closest object on the ground to the cursor within range of the character to grab:
        if (hasReachable) {
          const reachableGroundObjects = reachable.filter((o) => o !== char.heldObject && !o.isHeld);
          if (reachableGroundObjects.length > 0) {
            const target = (slot.aimMovedWhileInRange || isHolding)
              ? char.pickupModule!.findTargetObject(char, slot.aimPos.x, slot.aimPos.y, reachableGroundObjects, this.arena.wallHeight)
              : char.pickupModule!.findTargetObject(char, char.position.x, char.position.y, reachableGroundObjects, this.arena.wallHeight);
            if (target) {
              targetGrabEntities.set(char, target);
            }
          }
        }

        entry.wasCursorVisible = isCursorVisibleNow;
        slot.isCursorVisible = isCursorVisibleNow;

        if (isCursorVisibleNow) {
          activeAimCursors.push({
            x: slot.aimPos.x,
            y: slot.aimPos.y,
            color: char.playerColor,
            playerNumber: char.playerNumber,
            character: char,
            isGamepad: true,
          });
        }
      }
    }

    return { targetGrabEntities, activeAimCursors };
  }
}
