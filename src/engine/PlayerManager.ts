import { Arena } from "./Arena.js";
import { Character } from "../character/Character.js";
import { GameObject } from "./GameObject.js";
import { InputManager } from "../ui/InputManager.js";
import { ActiveAimCursor } from "./Renderer.js";
import { PlayerInputPacket, ReliableActionCommand } from "./physics/StateHistoryBuffer.js";
import { TrajectoryPoint } from "../character/ThrowModule.js";

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

export interface GrabSuppressionState {
  mouseGrabSuppressed: boolean;
  keyEGrabSuppressed: boolean;
  rtGrabSuppressed: boolean;
  bGrabSuppressed: boolean;
  useItemSuppressed: boolean;
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
  public dummyCharacters: Character[] = [];
  public onPlayersChanged?: () => void;
  public onReliableActionDispatched?: (action: ReliableActionCommand) => void;
  private actionSeq: number = 0;
  private lastHeldObjectIds: Map<string, string | null> = new Map();
  private grabSuppressedStates: Map<string, GrabSuppressionState> = new Map();
  public baseCharacter: Character;
  public onPlayerJoined?: (player: PlayerEntry) => void;
  public onPlayerRemoved?: (playerId: string) => void;
  public onObjectDepleted?: (objectId: string) => void;

  /**
   * Retrieves or initializes the grab input suppression tracking state for an entity.
   */
  public getGrabSuppressionState(entityId: string): GrabSuppressionState {
    let state = this.grabSuppressedStates.get(entityId);
    if (!state) {
      state = {
        mouseGrabSuppressed: false,
        keyEGrabSuppressed: false,
        rtGrabSuppressed: false,
        bGrabSuppressed: false,
        useItemSuppressed: false,
      };
      this.grabSuppressedStates.set(entityId, state);
    }
    return state;
  }

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
    this.spawnKeyboardPlayer();
    this.arena.syncEntitiesWithWalls([this.baseCharacter]);

    // Hook input manager on-demand join & disconnect callbacks
    this.inputManager.onKeyboardJoin = () => {
      this.spawnKeyboardPlayer();
    };

    this.inputManager.onKeyboardJump = () => {
      const kChar = this.players.get("keyboard")?.character ?? this.primaryCharacter;
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

    this.inputManager.canLockAim = () => {
      return this.isKeyboardAimingTrajectory();
    };
  }

  /**
   * Checks whether the local keyboard player is currently in aiming / throwing / trajectory mode.
   */
  public isKeyboardAimingTrajectory(): boolean {
    if (this.inputManager.devPanel?.isEditMode) return false;
    const kChar = this.players.get("keyboard")?.character ?? this.primaryCharacter;
    if (!kChar || !kChar.heldObject) {
      return false;
    }
    if (kChar.isPrimaryAbilityNonDirectional()) {
      return Boolean(this.inputManager.isAltHeld || this.inputManager.isThrowingPress);
    }
    return true;
  }

  public get allCharacters(): Character[] {
    const activeChars = Array.from(this.players.values()).map((p) => p.character);
    const remotes = Array.from(this.remotePlayers.values());
    const dummies = this.dummyCharacters;
    if (activeChars.length === 0 && remotes.length === 0) {
      return [this.baseCharacter, ...dummies];
    }
    if (activeChars.length === 0) {
      return [this.baseCharacter, ...remotes, ...dummies];
    }
    return [...activeChars, ...remotes, ...dummies];
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
      if (data.facingAngle !== undefined) char.facingAngle = data.facingAngle;
      if (data.isClimbing !== undefined) char.isClimbing = data.isClimbing;
      this.remotePlayers.set(data.id, char);
      this.arena.syncEntitiesWithWalls(this.allCharacters);
      this.onPlayersChanged?.();
    } else {
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
    char.onSprintChange = (sprinting: boolean) => {
      if (!sprinting) {
        this.inputManager.isKeyboardSprintActive = false;
      }
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
    char.onSprintChange = (sprinting: boolean) => {
      if (!sprinting && entry.slotIndex !== undefined) {
        const gSlot = this.inputManager.gamepadSlots.get(entry.slotIndex);
        if (gSlot) gSlot.sprintArmed = false;
      }
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
      const isHolding = kChar.heldObject !== null;
      const hasPrimaryAbility = kChar.hasPrimaryItemAbility();
      const isPrimaryNonDirectional = kChar.isPrimaryAbilityNonDirectional();

      // If holding an object with an inherent ability, Alt swaps to Throw.
      // If object has no other ability, default ability is Throw.
      // Ability swap stays in effect until the swapped ability is released.
      const isThrowActive = isHolding && (!hasPrimaryAbility || input.isAltHeld || (input.isThrowingPress && input.isMouseDown));

      // Mouse aiming & trajectory are active when:
      // 1. In edit mode, or
      // 2. Mouse button is down, or
      // 3. Holding an object whose active ability is directional (e.g. Throw or a directional ability).
      // If the primary ability does not involve direction and Alt is not held, do NOT aim or anticipate throw.
      const isMouseAiming = !isEditMode && (
        (isHolding && isThrowActive) ||
        (isHolding && !isPrimaryNonDirectional) ||
        (!isHolding && input.isMouseDown)
      );

      const grabState = this.getGrabSuppressionState(kChar.id);
      const isEKeyDown = input.isEKeyDepressed || input.isKeyPressed("KeyE");

      if (isHolding) {
        // Holding an object: any button held down while holding cannot initiate subsequent grabs until released
        if (input.isMouseDown) {
          grabState.mouseGrabSuppressed = true;
        }
        if (isEKeyDown) {
          grabState.keyEGrabSuppressed = true;
        }
      } else {
        // Empty-handed: releasing the button resets suppression, allowing new grab attempts
        if (!input.isMouseDown) {
          grabState.mouseGrabSuppressed = false;
        }
        if (!isEKeyDown) {
          grabState.keyEGrabSuppressed = false;
        }
      }

      const canMouseGrab = input.isMouseDown && !grabState.mouseGrabSuppressed;
      const canKeyEGrab = isEKeyDown && !grabState.keyEGrabSuppressed;
      const isKeyboardSeekingGrab = (
        input.isKeyboardActive &&
        !input.isKeyboardSuspended &&
        !input.isThrowingPress &&
        (canMouseGrab || canKeyEGrab)
      );
      
      // Determine explicit target object in reach if grab is active
      let grabTargetObjectId: string | null = null;
      if (isKeyboardSeekingGrab && !kChar.heldObject && kChar.pickupModule) {
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

      // Ensure facingAngle is explicit:
      // If holding an object:
      // - If auto-locked onto a target, face locked target
      // - If aiming throw or directional ability, face cursor
      // - If primary ability does not involve direction and not aiming throw (Alt not held), do NOT face cursor; face movement direction
      if (kChar.heldObject) {
        if (input.lockedAimPos) {
          const aimDx = input.lockedAimPos.x - kChar.position.x;
          const aimDy = input.lockedAimPos.y - kChar.position.y;
          if (Math.hypot(aimDx, aimDy) > 0.05) {
            kChar.facingAngle = Math.atan2(aimDy, aimDx);
          }
        } else if (isThrowActive || !isPrimaryNonDirectional) {
          const aimDx = input.actualMousePos.x - kChar.position.x;
          const aimDy = input.actualMousePos.y - kChar.position.y;
          if (Math.hypot(aimDx, aimDy) > 0.05) {
            kChar.facingAngle = Math.atan2(aimDy, aimDx);
          }
        } else {
          // Non-directional primary ability (e.g. food): face movement direction
          const moveMag = Math.hypot(input.movementVector.x, input.movementVector.y);
          if (moveMag > 0.05) {
            kChar.facingAngle = Math.atan2(input.movementVector.y, input.movementVector.x);
          }
        }
      } else {
        const moveMag = Math.hypot(input.movementVector.x, input.movementVector.y);
        if (moveMag > 0.05) {
          kChar.facingAngle = Math.atan2(input.movementVector.y, input.movementVector.x);
        }
      }

      const isHoldingConsumable = Boolean(kChar.canConsumeHeldObject());
      if (!input.isMouseDown) {
        grabState.useItemSuppressed = false;
      }
      if (input.justPickedUp) {
        grabState.useItemSuppressed = true;
      }
      const canUseItem = input.isMouseDown && !grabState.useItemSuppressed && !input.justPickedUp;
      // Using primary ability requires NOT holding Alt (or holding LMB after starting primary ability until released)
      const isUsingItem = isHoldingConsumable && canUseItem && !input.isAltHeld && !input.isThrowingPress && !input.isKeyboardSuspended;

      // If cursor was locked, but character is no longer holding an object (e.g. object thrown, dropped, or consumed),
      // unhide and clear the lock:
      if (input.lockedAimPos && !kChar.heldObject) {
        if (input.recordedMousePos) {
          input.mousePos.x = input.recordedMousePos.x;
          input.mousePos.y = input.recordedMousePos.y;
          input.actualMousePos.x = input.recordedMousePos.x;
          input.actualMousePos.y = input.recordedMousePos.y;
        }
        input.lockedAimPos = null;
        input.arcModulationCursor = null;
        input.aimLockRawDelta = 0;
        input.aimLockRawDx = 0;
        input.aimLockRawDy = 0;
        input.exitPointerLock();
      }

      map.set("keyboard", {
        playerId: "keyboard",
        moveX: input.movementVector.x,
        moveY: input.movementVector.y,
        isSprinting: input.isKeyboardSprintActive,
        isJumpHeld: input.isKeyboardJumpHeld,
        isGrabHeld: isHoldingConsumable ? canKeyEGrab : isKeyboardSeekingGrab,
        grabTargetObjectId,
        isDrop: input.isKeyboardDropRequested ?? false,
        isThrow: input.isKeyboardThrowRequested ?? false,
        isUsingItem,
        aimX: (input.lockedAimPos || input.isAwaitingUnlock) && input.recordedMousePos
          ? input.recordedMousePos.x
          : input.actualMousePos.x,
        aimY: (input.lockedAimPos || input.isAwaitingUnlock) && input.recordedMousePos
          ? input.recordedMousePos.y
          : input.actualMousePos.y,
        isAiming: isMouseAiming,
        isLockHeld: Boolean(input.isRightMouseDown && input.lockedAimPos),
        lockedAimPos: input.lockedAimPos ? { ...input.lockedAimPos } : null,
        aimLockDelta: 0,
        facingAngle: kChar.facingAngle,
      } as any);
      input.aimLockRawDelta = 0; // Consume delta
      input.aimLockRawDx = 0;
      input.aimLockRawDy = 0;
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

      const isCharHolding = cChar.heldObject !== null;
      const gpGrabState = this.getGrabSuppressionState(cChar.id);

      if (isCharHolding) {
        if (slot.rtHeld) gpGrabState.rtGrabSuppressed = true;
        if (slot.bHeld) gpGrabState.bGrabSuppressed = true;
      } else {
        if (!slot.rtHeld) gpGrabState.rtGrabSuppressed = false;
        if (!slot.bHeld) gpGrabState.bGrabSuppressed = false;
      }

      const canRtGrab = (slot.rtHeld ?? false) && !gpGrabState.rtGrabSuppressed;
      const canBGrab = (slot.bHeld ?? false) && !gpGrabState.bGrabSuppressed;
      const isGamepadSeekingGrab = canRtGrab || canBGrab;

      let grabTargetObjectId: string | null = null;
      if (isGamepadSeekingGrab && !cChar.heldObject && cChar.pickupModule) {
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
        if (slot.lockedAimPos) {
          const aimDx = slot.lockedAimPos.x - cChar.position.x;
          const aimDy = slot.lockedAimPos.y - cChar.position.y;
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

      const activeLaunchVel = slot.isThrowRequested && cChar.activeTrajectory?.launchVel ? cChar.activeTrajectory.launchVel : undefined;
      const activeLaunchPos = slot.isThrowRequested && cChar.activeTrajectory?.launchPos ? cChar.activeTrajectory.launchPos : undefined;

      const isCharHoldingConsumable = Boolean(cChar.canConsumeHeldObject());
      if (!slot.rtHeld) {
        gpGrabState.useItemSuppressed = false;
      }
      const canGamepadUseItem = (slot.isUsingItem ?? false) && !gpGrabState.useItemSuppressed;
      const isUsingItem = isCharHoldingConsumable && canGamepadUseItem;

      map.set(entry.id, {
        playerId: entry.id,
        playerName: cChar.name,
        moveX: slot.movementVector.x,
        moveY: slot.movementVector.y,
        isSprinting: cChar.isSprinting ?? false,
        isJumpHeld: slot.isClimbHeld ?? false,
        isGrabHeld: isCharHoldingConsumable ? canBGrab : isGamepadSeekingGrab,
        grabTargetObjectId,
        isDrop: slot.isDropRequested ?? false,
        isThrow: slot.isThrowRequested ?? false,
        isUsingItem,
        aimX,
        aimY,
        isAiming: true,
        isLockHeld: slot.isLockHeld ?? false,
        lockedAimPos: slot.lockedAimPos ? { ...slot.lockedAimPos } : null,
        facingAngle: cChar.facingAngle,
        ...(activeLaunchVel ? {
          launchVx: activeLaunchVel.vx,
          launchVy: activeLaunchVel.vy,
          launchVz: activeLaunchVel.vz
        } : {}),
        ...(activeLaunchPos ? {
          launchStartX: activeLaunchPos.x,
          launchStartY: activeLaunchPos.y,
          launchStartZ: activeLaunchPos.z
        } : {})
      } as any);
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

        // Use the exact pre-calculated launch velocity and start position from the client's active trajectory preview if available
        const clientLaunchVel = char.activeTrajectory?.launchVel;
        const clientLaunchPos = char.activeTrajectory?.launchPos;

        char.throwModule.throwHeldObject(
          char,
          throwAimX,
          throwAimY,
          this.arena,
          undefined,
          undefined,
          pkt.isLockHeld,
          clientLaunchVel,
          clientLaunchPos
        );
        char.isUsingItem = false;
        char.eatRateWatts = 0;

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
          ...(clientLaunchVel ? {
            launchVx: clientLaunchVel.vx,
            launchVy: clientLaunchVel.vy,
            launchVz: clientLaunchVel.vz,
          } : {}),
          ...(clientLaunchPos ? {
            launchStartX: clientLaunchPos.x,
            launchStartY: clientLaunchPos.y,
            launchStartZ: clientLaunchPos.z,
          } : {})
        } as any;
        if (!isReplay) {
          this.onReliableActionDispatched?.(action);
        }
      }

      if (entry?.isKeyboard) {
        this.updateArcModulation(char);
      }

      char.updateCharacter(
        dt,
        { x: pkt.moveX, y: pkt.moveY },
        pkt.isAiming,
        aimTarget,
        this.arena,
        pkt.isJumpHeld,
        this.arena.entities,
        pkt.isLockHeld,
        (pkt as any).lockedAimPos ?? null,
        (pkt as any).aimLockDelta ?? 0
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

      // Detect newly acquired or released held object to reliably dispatch action
      const currentHeldId = char.heldObject ? char.heldObject.id : null;
      const prevHeldId = this.lastHeldObjectIds.get(char.id) ?? null;
      if (currentHeldId !== prevHeldId) {
        this.lastHeldObjectIds.set(char.id, currentHeldId);
        if (prevHeldId !== null && currentHeldId === null) {
          // Hand just became empty (eaten, dropped, thrown)!
          // Suppress grab if any grab/action input was held at this exact transition
          const gState = this.getGrabSuppressionState(char.id);
          if (this.inputManager.isMouseDown) gState.mouseGrabSuppressed = true;
          if (this.inputManager.isEKeyDepressed || this.inputManager.isKeyPressed("KeyE")) gState.keyEGrabSuppressed = true;
          if (entry?.slotIndex !== undefined) {
            const slot = this.inputManager.gamepadSlots.get(entry.slotIndex);
            if (slot?.rtHeld) gState.rtGrabSuppressed = true;
            if (slot?.bHeld) gState.bGrabSuppressed = true;
          }
        }
        if (currentHeldId) {
          if (prevHeldId === null) {
            // Newly picked up: suppress eating if primary feature button was held during pickup
            const gState = this.getGrabSuppressionState(char.id);
            const isButtonHeld = this.inputManager.isMouseDown ||
              this.inputManager.justPickedUp ||
              (entry?.slotIndex !== undefined && (this.inputManager.gamepadSlots.get(entry.slotIndex)?.rtHeld ?? false));
            if (isButtonHeld) {
              gState.useItemSuppressed = true;
            }
            char.isUsingItem = false;
            char.eatRateWatts = 0;
          }
          // Direct pickup fallback: if spawner itself was grabbed directly by external code,
          // spawn a clone for hands and restore spawner to its resting position.
          if (char.heldObject && char.heldObject.spawnerModule && char.heldObject.spawnerModule.enabled) {
            const spawner = char.heldObject;
            const sm = spawner.spawnerModule;
            if (sm && char.pickupModule) {
              const clone = sm.triggerClone(spawner, this.arena, objects);
              if (clone) {
                char.pickupModule.drop(char);
                spawner.position.x = sm.spawnPosition.x || spawner.position.x;
                spawner.position.y = sm.spawnPosition.y || spawner.position.y;
                spawner.position.z = sm.spawnPosition.z || spawner.position.z;
                spawner.velocity.x = 0;
                spawner.velocity.y = 0;
                spawner.verticalVelocity = 0;
                char.pickupModule.pickup(char, clone);
                this.lastHeldObjectIds.set(char.id, clone.id);
                const gState = this.getGrabSuppressionState(char.id);
                gState.useItemSuppressed = true;
                char.isUsingItem = false;
                char.eatRateWatts = 0;
              }
            }
          }
          if (!isReplay) {
            const actPlayerId = entry?.id || char.playerId || playerId || "keyboard";
            const action: ReliableActionCommand = {
              actionId: `act-${actPlayerId}-pickup-${++this.actionSeq}-${Date.now()}`,
              type: "pickup",
              tick: pkt.tick ?? 0,
              timestamp: performance.now(),
              playerId: actPlayerId,
              targetObjectId: char.heldObject ? char.heldObject.id : currentHeldId,
            };
            this.onReliableActionDispatched?.(action);
          }
        }
      }

      let justDepletedConsumable = false;
      if (char.heldObject) {
        const heldPos = char.calculateHeldObjectPosition(this.arena);
        char.heldObject.position.x = heldPos.x;
        char.heldObject.position.y = heldPos.y;
        char.heldObject.position.z = heldPos.z;

        // Primary Item Ability: Continuous consumption when holding consumable item
        const grabState = this.getGrabSuppressionState(char.id);
        const isUsingItem = Boolean((pkt as any).isUsingItem) && !grabState.useItemSuppressed;
        if (isUsingItem && char.consumeModule && char.consumeModule.canConsume(char.heldObject)) {
          char.isUsingItem = true;
          const heldItem = char.heldObject;
          const consumeResult = char.consumeModule.consume(dt, char, heldItem, objects, this.arena);
          char.eatRateWatts = consumeResult.watts;
          if (consumeResult.isDepleted) {
            console.log(`🍎 [PlayerManager] Local consumption of ${heldItem?.id} depleted! Removing and unlinking locally`);
            justDepletedConsumable = true;
            if (heldItem?.id) {
              this.onObjectDepleted?.(heldItem.id);
            }
            const grabState = this.getGrabSuppressionState(char.id);
            grabState.mouseGrabSuppressed = true;
            grabState.keyEGrabSuppressed = true;
            grabState.rtGrabSuppressed = true;
            grabState.bGrabSuppressed = true;
            char.isUsingItem = false;
            char.eatRateWatts = 0;
            if (char.heldObject === heldItem) {
              char.heldObject = null;
            }
            if (heldItem) {
              heldItem.isHeld = false;
              heldItem.heldBy = null;
              const idx = objects.indexOf(heldItem);
              if (idx !== -1) {
                objects.splice(idx, 1);
              }
              if (Array.isArray((this.arena as any).entities)) {
                const eIdx = (this.arena as any).entities.indexOf(heldItem);
                if (eIdx !== -1) {
                  (this.arena as any).entities.splice(eIdx, 1);
                }
              }
            }
          }
        } else {
          char.isUsingItem = false;
          char.eatRateWatts = 0;
        }
      } else {
        char.isUsingItem = false;
        char.eatRateWatts = 0;
      }

      // Explicit grab target resolution
      const grabState = this.getGrabSuppressionState(char.id);
      const isKeyboardPlayer = !entry || entry.isKeyboard;
      const isDeviceSuppressed = isKeyboardPlayer
        ? (grabState.mouseGrabSuppressed && grabState.keyEGrabSuppressed)
        : (grabState.rtGrabSuppressed && grabState.bGrabSuppressed);
      const isSeeking = !justDepletedConsumable && pkt.isGrabHeld && !isDeviceSuppressed;
      if (!isEditMode && isSeeking && !char.heldObject && char.pickupModule) {
        if (pkt.grabTargetObjectId !== undefined) {
          if (pkt.grabTargetObjectId !== null) {
            const otherEntities = [...this.allCharacters.filter((c) => c !== char), ...objects];
            const targetObj = otherEntities.find((e) => e.id === pkt.grabTargetObjectId);
            if (targetObj && char.pickupModule.isObjectInReach(char, targetObj, this.arena.wallHeight)) {
              let itemToHold: GameObject = targetObj;
              if (targetObj.spawnerModule && targetObj.spawnerModule.enabled) {
                // Spawner entity stays put at its location!
                // Dispense an identical clone without spawner behavior to go into character's hands.
                const clone = targetObj.spawnerModule.triggerClone(targetObj, this.arena, objects);
                if (clone) {
                  itemToHold = clone;
                }
              }
              const pickedUp = char.pickupModule.pickup(char, itemToHold);
              if (!pickedUp && itemToHold !== targetObj) {
                // Insufficient lift energy or failed pickup: clean up orphaned clone
                const idx = objects.indexOf(itemToHold);
                if (idx !== -1) objects.splice(idx, 1);
              } else if (pickedUp) {
                const gState = this.getGrabSuppressionState(char.id);
                const isButtonHeld = this.inputManager.isMouseDown ||
                  this.inputManager.justPickedUp ||
                  (entry?.slotIndex !== undefined && (this.inputManager.gamepadSlots.get(entry.slotIndex)?.rtHeld ?? false));
                if (isButtonHeld) {
                  gState.useItemSuppressed = true;
                }
                this.lastHeldObjectIds.set(char.id, itemToHold.id);
                char.isUsingItem = false;
                char.eatRateWatts = 0;
                if (!isReplay) {
                  const actPlayerId = entry?.id || char.playerId || playerId || "keyboard";
                  const action: ReliableActionCommand = {
                    actionId: `act-${actPlayerId}-pickup-${++this.actionSeq}-${Date.now()}`,
                    type: "pickup",
                    tick: pkt.tick ?? 0,
                    timestamp: performance.now(),
                    playerId: actPlayerId,
                    targetObjectId: itemToHold.id,
                  };
                  this.onReliableActionDispatched?.(action);
                }
              }
            }
          }
        } else if (aimTarget) {
          // Fallback for legacy calls without grabTargetObjectId
          const otherEntities = [...this.allCharacters.filter((c) => c !== char), ...objects];
          const target = char.pickupModule.findTargetObject(char, aimTarget.x, aimTarget.y, otherEntities, this.arena.wallHeight);
          if (target && target.spawnerModule && target.spawnerModule.enabled) {
            const clone = target.spawnerModule.triggerClone(target, this.arena, objects);
            if (clone) {
              const pickedUp = char.pickupModule.pickup(char, clone);
              if (!pickedUp) {
                const idx = objects.indexOf(clone);
                if (idx !== -1) objects.splice(idx, 1);
              } else {
                const gState = this.getGrabSuppressionState(char.id);
                const isButtonHeld = this.inputManager.isMouseDown ||
                  this.inputManager.justPickedUp ||
                  (entry?.slotIndex !== undefined && (this.inputManager.gamepadSlots.get(entry.slotIndex)?.rtHeld ?? false));
                if (isButtonHeld) {
                  gState.useItemSuppressed = true;
                }
                this.lastHeldObjectIds.set(char.id, clone.id);
                char.isUsingItem = false;
                char.eatRateWatts = 0;
                if (!isReplay) {
                  const actPlayerId = entry?.id || char.playerId || playerId || "keyboard";
                  const action: ReliableActionCommand = {
                    actionId: `act-${actPlayerId}-pickup-${++this.actionSeq}-${Date.now()}`,
                    type: "pickup",
                    tick: pkt.tick ?? 0,
                    timestamp: performance.now(),
                    playerId: actPlayerId,
                    targetObjectId: clone.id,
                  };
                  this.onReliableActionDispatched?.(action);
                }
              }
            }
          } else {
            const pickedUp = char.pickupModule.pickupAndSwap(char, otherEntities, this.arena.wallHeight, aimTarget.x, aimTarget.y);
            const held = char.heldObject as GameObject | null;
            if (pickedUp && held) {
              const gState = this.getGrabSuppressionState(char.id);
              const isButtonHeld = this.inputManager.isMouseDown ||
                this.inputManager.justPickedUp ||
                (entry?.slotIndex !== undefined && (this.inputManager.gamepadSlots.get(entry.slotIndex)?.rtHeld ?? false));
              if (isButtonHeld) {
                gState.useItemSuppressed = true;
              }
              this.lastHeldObjectIds.set(char.id, held.id);
              char.isUsingItem = false;
              char.eatRateWatts = 0;
              if (!isReplay) {
                const actPlayerId = entry?.id || char.playerId || playerId || "keyboard";
                const action: ReliableActionCommand = {
                  actionId: `act-${actPlayerId}-pickup-${++this.actionSeq}-${Date.now()}`,
                  type: "pickup",
                  tick: pkt.tick ?? 0,
                  timestamp: performance.now(),
                  playerId: actPlayerId,
                  targetObjectId: held.id,
                };
                this.onReliableActionDispatched?.(action);
              }
            }
          }
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

    // Update any registered player characters whose inputs were suspended or missing (e.g. window blurred/background)
    for (const [playerId, entry] of this.players) {
      if (!inputs.has(playerId)) {
        const char = entry.character;
        if (char && input.draggedEntity !== char) {
          char.updateCharacter(
            dt,
            { x: 0, y: 0 },
            false,
            null,
            this.arena,
            false,
            this.arena.entities,
            false
          );
          if (char.heldObject) {
            const heldPos = char.calculateHeldObjectPosition(this.arena);
            char.heldObject.position.x = heldPos.x;
            char.heldObject.position.y = heldPos.y;
            char.heldObject.position.z = heldPos.z;
          }
        }
      }
    }

    // Always update dummy characters physics, health and ground settling (controllerType === 'none')
    for (const dummy of this.dummyCharacters) {
      if (input.draggedEntity !== dummy) {
        dummy.updateCharacter(
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
        if (this.inputManager.lockedAimPos || this.inputManager.isAwaitingUnlock || (typeof document !== "undefined" && document.pointerLockElement)) {
          if (this.inputManager.recordedMousePos) {
            this.inputManager.mousePos.x = this.inputManager.recordedMousePos.x;
            this.inputManager.mousePos.y = this.inputManager.recordedMousePos.y;
            this.inputManager.actualMousePos.x = this.inputManager.recordedMousePos.x;
            this.inputManager.actualMousePos.y = this.inputManager.recordedMousePos.y;
          }
        } else {
          this.inputManager.mousePos.x = this.inputManager.actualMousePos.x;
          this.inputManager.mousePos.y = this.inputManager.actualMousePos.y;
        }

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

        const ppu = this.inputManager.pixelsPerUnit;
        const aimPos = (this.inputManager.isRightMouseDown && this.inputManager.lockedAimPos && this.inputManager.arcModulationCursor)
          ? {
              x: this.inputManager.arcModulationCursor.x / ppu,
              y: this.inputManager.arcModulationCursor.y / ppu,
            }
          : this.inputManager.mousePos;

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

  /**
   * Updates trajectory height modulation when right-click lock is held:
   * 1. Uses the middle of the flattest (lowest) and steepest (highest) trajectories (forming a perfectly vertical line).
   * 2. Initializes the game cursor on that vertical dotted line if not yet initialized.
   * 3. Tests if the game cursor is within the lock circle (twice as big) at the lowest midpoint -> snaps to 0.0 (most efficient).
   * 4. Otherwise smoothly interpolates savedArcRatio from 0.0 to 1.0 as the cursor moves upward.
   */
  public updateArcModulation(char: Character): void {
    const input = this.inputManager;
    if (!input.isRightMouseDown || !input.lockedAimPos || !char.heldObject || !char.throwModule) {
      return;
    }

    const traj = char.activeTrajectory;
    if (!traj) return;

    const getMidPoint = (pts: TrajectoryPoint[] | undefined) => {
      if (!pts || pts.length === 0) return null;
      return pts[Math.floor(pts.length / 2)];
    };

    const midLow = getMidPoint(traj.flattestPoints) || getMidPoint(traj.points);
    const midHigh = getMidPoint(traj.steepestPoints) || getMidPoint(traj.points);
    if (!midLow || !midHigh) return;

    const ppu = this.inputManager.pixelsPerUnit;
    const hoverScale = this.arena.visualAltitudeScale ?? 0.5;

    // Both trajectories share the identical horizontal midpoint between launch and land,
    // forming a perfectly vertical line in projected screen coordinates!
    const midScreenX = midLow.x * ppu;
    const lowScreenY = (midLow.y - midLow.z * hoverScale) * ppu;
    const highScreenY = (midHigh.y - midHigh.z * hoverScale) * ppu;

    const lineDy = highScreenY - lowScreenY; // negative (upward on screen)
    const lineLen = Math.abs(lineDy);

    // Initialize cursor position on the vertical line if not yet initialized
    if (!input.arcModulationCursor) {
      const curRatio = char.throwModule.savedArcRatio;
      input.arcModulationCursor = {
        x: midScreenX,
        y: lowScreenY + curRatio * lineDy,
      };
    }

    const cursor = input.arcModulationCursor;
    // Lock circle placed at the lowest (most efficient) trajectory midpoint (twice as big: 32px to 52px)
    const snapRadius = Math.max(32, Math.min(52, lineLen * 0.45));
    const distToLow = Math.hypot(cursor.x - midScreenX, cursor.y - lowScreenY);

    if (distToLow <= snapRadius) {
      // Snapped to most efficient trajectory!
      char.throwModule.savedArcRatio = 0.0;
    } else if (lineLen > 2) {
      // Outside lock circle: smoothly interpolate from lowest to highest trajectory
      const uY = lineDy / lineLen; // -1
      const proj = (cursor.y - lowScreenY) * uY; // positive when moving upward
      const t = Math.max(0.0, Math.min(1.0, (proj - snapRadius) / Math.max(1, lineLen - snapRadius)));
      char.throwModule.savedArcRatio = t;
    }
  }
}
