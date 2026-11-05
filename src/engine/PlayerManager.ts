import { Arena } from "./Arena.js";
import { Character } from "../character/Character.js";
import { HealthModule } from "../character/HealthModule.js";
import { GameObject } from "./GameObject.js";
import { InputManager, type GamepadSlotState } from "../ui/InputManager.js";
import { ActiveAimCursor } from "./Renderer.js";
import { PlayerInputPacket, ReliableActionCommand } from "./physics/StateHistoryBuffer.js";
import { TrajectoryRenderer } from "./rendering/TrajectoryRenderer.js";
import { ClientActionDispatcher } from "../network/ClientActionDispatcher.js";
import { ControlsInspector } from "../ui/devpanel/inspectors/ControlsInspector.js";
import { ControlSchemaArbiter } from "../input/schema/ControlSchemaArbiter.js";
import { ModularBlockEvaluator } from "../input/schema/ModularBlockEvaluator.js";
import { DefaultControlBlocks, DefaultGamepadControlBlocks } from "../input/schema/presets/DefaultControlSchemas.js";
import type { ControlExecutionContext, ControlRule } from "../input/schema/ControlSchemaTypes.js";
import { prefabManager } from "./prefab/PrefabManager.js";
import { applyCharacterConfig, serializeCharacter } from "../config/WorldConfig.js";
import { CharacterSelectModal } from "../ui/CharacterSelectModal.js";
import { GrabIntentArbiter } from "../character/capabilities/GrabIntentArbiter.js";

export interface PlayerEntry {
  id: string; // "keyboard" | "gamepad-0" | "gamepad-1" | ...
  name: string;
  deviceInfo?: string;
  playerNumber: number; // 1, 2, 3, 4
  color: string;
  isKeyboard: boolean;
  slotIndex?: number;
  character: Character;
  wasCursorVisible?: boolean;
  aimMovedWhileInRange?: boolean;
  lastCheckedMouseMoveTime?: number;
  wasHoldingObject?: boolean;
  wasThrowActive?: boolean;
}

export interface GrabSuppressionState {
  grabSuppressed: boolean;
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
  private lastHeldObjectIds: Map<string, string | null> = new Map();
  private grabSuppressedStates: Map<string, GrabSuppressionState> = new Map();
  public baseCharacter: Character;
  public onPlayerJoined?: (player: PlayerEntry) => void;
  public onPlayerRemoved?: (playerId: string) => void;
  public onObjectDepleted?: (objectId: string) => void;
  public isOnlineMode: boolean = false;
  public onPriorityGrabRequested?: (localPlayerId: string, charId: string, targetObjectId: string) => void;
  private prevKeysPressed: Set<string> = new Set();
  private prevMouseButtons: Set<number> = new Set();
  private prevGamepadButtons: Map<number, Set<number>> = new Map();

  /**
   * Retrieves or initializes the grab input suppression tracking state for an entity.
   */
  public getGrabSuppressionState(entityId: string): GrabSuppressionState {
    let state = this.grabSuppressedStates.get(entityId);
    if (!state) {
      state = {
        grabSuppressed: false,
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
    const initialSpawn = HealthModule.RESPAWN_SPAWNS[Math.floor(Math.random() * HealthModule.RESPAWN_SPAWNS.length)];
    this.baseCharacter = options.character || new Character({
      name: initialHandle,
      color: PLAYER_COLORS[0],
      x: initialSpawn.x,
      y: initialSpawn.y,
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
    if (!this.baseCharacter.prefabId) {
      this.baseCharacter.prefabId = "prefab_player";
    }
    this.inputManager.isKeyboardActive = false;
    this.arena.syncEntitiesWithWalls([this.baseCharacter]);

    // Hook input manager on-demand join & disconnect callbacks
    this.inputManager.onKeyboardJoin = () => {
      this.promptCharacterSelect("keyboard");
    };

    this.inputManager.onGamepadJoin = (slotIndex: number) => {
      const slot = this.inputManager.gamepadSlots.get(slotIndex);
      this.promptCharacterSelect(`gamepad-${slotIndex}`, slotIndex, slot?.id);
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
    if (kChar.isLaserAiming || kChar.isEatingFood) return false;
    return Boolean(kChar.isAimingTrajectory);
    /* const _isAltDown = Boolean(
      this.inputManager.isCombatModifierActive ? this.inputManager.isCombatModifierActive() : (
        this.inputManager.isAltHeld ||
        this.inputManager.isKeyPressed("AltLeft") ||
        this.inputManager.isKeyPressed("AltRight") ||
        this.inputManager.isKeyPressed("ControlLeft") ||
        this.inputManager.isKeyPressed("ControlRight") ||
        this.inputManager.isKeyPressed("KeyF")
      )
    );
    if (isAltDown) {
      return false;
    }
    if (kChar.isPrimaryAbilityNonDirectional()) {
      return Boolean(this.inputManager.isRightMouseDown || this.inputManager.isThrowingPress);
    }
    return true; */
  }

  public get allCharacters(): Character[] {
    const activeChars = Array.from(this.players.values()).map((p) => p.character);
    const remotes = Array.from(this.remotePlayers.values()).map((r: any) => r.character || r);
    const dummies = this.dummyCharacters;
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
      char.playerColor = color;
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

  public static readonly MAX_LOCAL_PLAYERS = 4;

  public getNextPlayerNumber(): number {
    const used = new Set<number>();
    for (const p of this.players.values()) {
      used.add(p.playerNumber);
    }
    for (let num = 1; num <= PlayerManager.MAX_LOCAL_PLAYERS; num++) {
      if (!used.has(num)) return num;
    }
    return Math.min(PlayerManager.MAX_LOCAL_PLAYERS, this.players.size + 1);
  }

  /**
   * Enforces sequential player slot numbers (P1, P2, P3, P4) and distinct theme colors
   * across all active local player devices, keeping character colors and name tags in sync.
   */
  public syncLocalPlayerSlots(): void {
    if (this.isOnlineMode) return;
    const entries = Array.from(this.players.values()).sort((a, b) => a.playerNumber - b.playerNumber);
    entries.forEach((p, index) => {
      const slotNum = index + 1;
      const slotColor = PLAYER_COLORS[(slotNum - 1) % PLAYER_COLORS.length];
      p.playerNumber = slotNum;
      p.color = slotColor;
      p.character.playerNumber = slotNum;
      p.character.playerColor = slotColor;
      p.character.color = slotColor;
      if (!p.character.hasCustomName || /^Player(\s+\d+)?$/i.test(p.character.name.trim())) {
        p.character.name = `Player ${slotNum}`;
        p.name = `Player ${slotNum}`;
      }
    });
    if (this.players.size === 0 && this.baseCharacter) {
      this.baseCharacter.playerNumber = 1;
      this.baseCharacter.playerColor = PLAYER_COLORS[0];
      this.baseCharacter.color = PLAYER_COLORS[0];
      if (!this.baseCharacter.hasCustomName || /^Player(\s+\d+)?$/i.test(this.baseCharacter.name.trim())) {
        this.baseCharacter.name = "Player 1";
      }
    }
  }

  public promptCharacterSelect(playerId: string, slotIndex?: number, deviceName?: string): void {
    if (this.players.has(playerId)) return;
    if (this.players.size >= PlayerManager.MAX_LOCAL_PLAYERS) return;

    const modal = CharacterSelectModal.getInstance();
    if (modal.isOpen()) return;

    const playerNum = this.getNextPlayerNumber();
    modal.open({
      playerNumber: playerNum,
      playerId,
      onSelect: (prefabId) => {
        this.spawnPlayerWithPrefab(playerId, prefabId, playerNum, slotIndex, deviceName);
      },
    });
  }

  public spawnPlayerWithPrefab(
    playerId: string,
    prefabId: string,
    playerNum: number,
    slotIndex?: number,
    deviceName?: string
  ): Character {
    const isKeyboard = playerId === "keyboard";
    const existing = this.players.get(playerId);
    if (existing) return existing.character;

    const targetPrefab = prefabManager.get(prefabId);
    const color = PLAYER_COLORS[(playerNum - 1) % PLAYER_COLORS.length];
    const slotSpawn = HealthModule.RESPAWN_SPAWNS[(playerNum - 1) % HealthModule.RESPAWN_SPAWNS.length];

    const defaultHandle = isKeyboard
      ? (() => {
          try {
            const h = localStorage.getItem("pcg_player_handle");
            if (h && h.trim()) return h.trim();
          } catch {}
          return `Player ${playerNum}`;
        })()
      : (deviceName
          ? (deviceName.length > 28 ? deviceName.slice(0, 28) + "…" : deviceName)
          : `Controller #${(slotIndex ?? 0) + 1}`);

    const isBaseUnassigned = !Array.from(this.players.values()).some((p) => p.character === this.baseCharacter);
    let char: Character;

    if (isBaseUnassigned) {
      char = this.baseCharacter;
      char.playerId = playerId;
      char.playerNumber = playerNum;
      char.playerColor = color;
      char.color = color;
      char.name = defaultHandle;
    } else {
      char = new Character({
        x: slotSpawn.x,
        y: slotSpawn.y,
        color,
        colliderRadius: 0.44,
        mass: 1.2,
        strength: 1.0,
        playerId,
        playerNumber: playerNum,
        name: defaultHandle,
        hasCustomName: false,
      });
    }

    if (targetPrefab && targetPrefab.archetype instanceof Character) {
      const config = serializeCharacter(targetPrefab.archetype);
      applyCharacterConfig(char, config);
    }

    char.position.x = slotSpawn.x;
    char.position.y = slotSpawn.y;
    char.position.z = slotSpawn.z ?? 0;
    char.playerNumber = playerNum;
    char.playerColor = color;
    char.color = color;
    char.prefabId = prefabId;
    char.playerId = playerId;

    const schemaToApply = targetPrefab?.controlSchema || (targetPrefab?.archetype instanceof Character ? targetPrefab.archetype.controlSchema : undefined);
    if (schemaToApply) {
      char.controlSchema = JSON.parse(JSON.stringify(schemaToApply));
    }

    this.arena.syncEntitiesWithWalls([char]);

    if (isKeyboard) {
      this.inputManager.isKeyboardActive = true;
    } else if (slotIndex !== undefined) {
      const slot = this.inputManager.gamepadSlots.get(slotIndex);
      if (slot) {
        slot.isActive = true;
      }
    }

    const entry: PlayerEntry = {
      id: playerId,
      name: char.name,
      playerNumber: char.playerNumber,
      color: char.playerColor,
      character: char,
      isKeyboard,
      slotIndex,
    };

    this.players.set(playerId, entry);
    this.syncLocalPlayerSlots();
    this.onPlayersChanged?.();

    return char;
  }

  public spawnKeyboardPlayer(): Character {
    const current = this.players.get("keyboard");
    if (current) return current.character;
    if (this.players.size >= PlayerManager.MAX_LOCAL_PLAYERS) {
      return this.primaryCharacter || this.baseCharacter;
    }

    // Check if baseCharacter is currently unassigned (no player device controlling it)
    const isBaseUnassigned = !Array.from(this.players.values()).some((p) => p.character === this.baseCharacter);
    let char: Character;

    if (isBaseUnassigned) {
      char = this.baseCharacter;
      char.playerId = "keyboard";
      if (!char.prefabId) {
        char.prefabId = "prefab_player";
      }
      char.playerNumber = 1;
      char.playerColor = PLAYER_COLORS[0];
      char.color = char.playerColor;
      if (!char.name || /^Player(\s+\d+)?$/i.test(char.name.trim())) {
        char.name = "Player 1";
        char.hasCustomName = false;
      }
    } else {
      const playerNum = this.getNextPlayerNumber();
      const color = PLAYER_COLORS[(playerNum - 1) % PLAYER_COLORS.length];
      const slotSpawn = HealthModule.RESPAWN_SPAWNS[(playerNum - 1) % HealthModule.RESPAWN_SPAWNS.length];
      const targetPrefabId = this.baseCharacter?.prefabId || "prefab_player";
      const targetPrefab = prefabManager.get(targetPrefabId);

      const defaultName = `Player ${playerNum}`;
      char = new Character({
        x: slotSpawn.x,
        y: slotSpawn.y,
        color,
        colliderRadius: this.baseCharacter.colliderRadius ?? 0.44,
        mass: this.baseCharacter.mass ?? 1.2,
        strength: this.baseCharacter.strength ?? 1.0,
        playerId: "keyboard",
        playerNumber: playerNum,
        name: defaultName,
        hasCustomName: false,
      });

      // Synchronize all attributes from the player prefab archetype (or baseCharacter)
      const sourceChar = (targetPrefab?.archetype instanceof Character) ? targetPrefab.archetype : this.baseCharacter;
      if (sourceChar instanceof Character) {
        const config = serializeCharacter(sourceChar);
        applyCharacterConfig(char, config);
      }

      char.position.x = slotSpawn.x;
      char.position.y = slotSpawn.y;
      char.position.z = slotSpawn.z ?? 0;
      char.playerNumber = playerNum;
      char.playerColor = color;
      char.color = color;
      char.name = defaultName;
      char.hasCustomName = false;
      char.prefabId = targetPrefabId;
      char.playerId = "keyboard";

      const schemaToApply = targetPrefab?.controlSchema || this.baseCharacter.controlSchema;
      if (schemaToApply) {
        char.controlSchema = JSON.parse(JSON.stringify(schemaToApply));
      }
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
        if (!this.inputManager.isShiftHeld()) {
          this.inputManager.isKeyboardSprintActive = false;
        }
      }
    };
    this.players.set("keyboard", entry);
    this.syncLocalPlayerSlots();

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
    this.syncLocalPlayerSlots();
    this.onPlayersChanged?.();
    this.onPlayerRemoved?.("keyboard");
  }

  public spawnGamepadPlayer(slotIndex: number, gamepadName?: string): Character {
    const key = `gamepad-${slotIndex}`;
    const existing = this.players.get(key);
    if (existing) return existing.character;
    if (this.players.size >= PlayerManager.MAX_LOCAL_PLAYERS) {
      return this.primaryCharacter || this.baseCharacter;
    }

    const cleanName = gamepadName
      ? (gamepadName.length > 28 ? gamepadName.slice(0, 28) + "…" : gamepadName)
      : `Controller #${slotIndex + 1}`;

    // If keyboard was created or placeholder exists but keyboard is NOT active (no keyboard/mouse input was ever used)
    // and keyboard is the only player holding baseCharacter, remove it so the controller claims baseCharacter!
    if (this.players.has("keyboard") && !this.inputManager.isKeyboardActive && this.players.size === 1) {
      this.removeKeyboardPlayer();
    }

    const isBaseUnassigned = !Array.from(this.players.values()).some((p) => p.character === this.baseCharacter);
    let char: Character;

    if (isBaseUnassigned) {
      char = this.baseCharacter;
      char.playerId = key;
      if (!char.prefabId) {
        char.prefabId = "prefab_player";
      }
      char.playerNumber = 1;
      char.playerColor = PLAYER_COLORS[0];
      char.color = char.playerColor;
      if (!char.hasCustomName || !char.name || /^Player(\s+\d+)?$/i.test(char.name.trim()) || /Xbox|Controller|Gamepad|DualShock|DualSense/i.test(char.name)) {
        char.name = "Player 1";
        char.hasCustomName = false;
      }
    } else {
      const playerNum = this.getNextPlayerNumber();
      const color = PLAYER_COLORS[(playerNum - 1) % PLAYER_COLORS.length];
      const slotSpawn = HealthModule.RESPAWN_SPAWNS[(playerNum - 1) % HealthModule.RESPAWN_SPAWNS.length];
      const targetPrefabId = this.baseCharacter?.prefabId || "prefab_player";
      const targetPrefab = prefabManager.get(targetPrefabId);

      const defaultName = `Player ${playerNum}`;
      char = new Character({
        x: slotSpawn.x,
        y: slotSpawn.y,
        color,
        colliderRadius: this.baseCharacter.colliderRadius ?? 0.44,
        mass: this.baseCharacter.mass ?? 1.2,
        strength: this.baseCharacter.strength ?? 1.0,
        playerId: key,
        playerNumber: playerNum,
        name: defaultName,
        hasCustomName: false,
      });

      // Synchronize all attributes from the player prefab archetype (or baseCharacter)
      const sourceChar = (targetPrefab?.archetype instanceof Character) ? targetPrefab.archetype : this.baseCharacter;
      if (sourceChar instanceof Character) {
        const config = serializeCharacter(sourceChar);
        applyCharacterConfig(char, config);
      }

      char.position.x = slotSpawn.x;
      char.position.y = slotSpawn.y;
      char.position.z = slotSpawn.z ?? 0;
      char.playerNumber = playerNum;
      char.playerColor = color;
      char.color = color;
      char.name = defaultName;
      char.hasCustomName = false;
      char.prefabId = targetPrefabId;
      char.playerId = key;

      const schemaToApply = targetPrefab?.controlSchema || this.baseCharacter.controlSchema;
      if (schemaToApply) {
        char.controlSchema = JSON.parse(JSON.stringify(schemaToApply));
      }
      this.arena.syncEntitiesWithWalls([char]);
    }

    const entry: PlayerEntry = {
      id: key,
      name: char.hasCustomName && char.name ? char.name : `Player ${char.playerNumber}`,
      deviceInfo: cleanName,
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
    this.syncLocalPlayerSlots();

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

    this.syncLocalPlayerSlots();
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

    // 1. Keyboard & Mouse Input Capture (Fully Schema-Driven via kSchema)
    const kEntry = this.players.get("keyboard");
    const isUnassignedKeyboard = !kEntry && this.players.size === 0 && input.isKeyboardActive && !input.isKeyboardSuspended;
    if ((kEntry || isUnassignedKeyboard) && !input.isKeyboardSuspended) {
      const kChar = kEntry ? kEntry.character : this.baseCharacter;
      const kSchema = ControlsInspector.getActiveSchema(kChar);
      const isHolding = kChar.heldObject !== null;
      const isHoldingConsumable = Boolean(kChar.canConsumeHeldObject ? kChar.canConsumeHeldObject() : false);

      // Target discovery in reach for pickup or swap
      let grabTargetObject: GameObject | null = null;
      if (kChar.pickupModule || kChar.grappleModule) {
        const candidateEntities = [...this.allCharacters.filter((c) => c !== kChar), ...objects].filter(
          (c) => c !== kChar.heldObject && c !== (kChar as any).grappledTarget
        );
        const target = GrabIntentArbiter.findTarget(
          kChar,
          input.actualMousePos.x,
          input.actualMousePos.y,
          candidateEntities,
          this.arena.wallHeight
        );
        if (target) {
          grabTargetObject = target;
        }
      }

      // Input state accessors for schema evaluation
      const keyStates = {
        isDown: (code: string) => input.isKeyPressed(code),
        justPressed: (code: string) => input.isKeyPressed(code) && !this.prevKeysPressed.has(code),
        justReleased: (code: string) => !input.isKeyPressed(code) && this.prevKeysPressed.has(code),
      };

      const isMouseBtnDown = (btn: number) => {
        if (btn === 0) return input.isMouseDown;
        if (btn === 1) return Boolean(input.isMiddleMouseDown);
        if (btn === 2) return input.isRightMouseDown;
        return false;
      };
      const mouseStates = {
        isDown: isMouseBtnDown,
        justPressed: (btn: number) => isMouseBtnDown(btn) && !this.prevMouseButtons.has(btn),
        justReleased: (btn: number) => !isMouseBtnDown(btn) && this.prevMouseButtons.has(btn),
        worldPos: input.actualMousePos,
      };

      const execCtx: ControlExecutionContext = {
        character: kChar,
        arena: this.arena,
        dt: 1 / 60,
        schema: kSchema,
        isHoldingItem: isHolding,
        heldItemIsEdible: isHoldingConsumable,
        heldItemHasPrimaryAbility: Boolean(kChar.hasPrimaryItemAbility ? kChar.hasPrimaryItemAbility() : false),
        targetInReach: grabTargetObject,
        isGrounded: Boolean(kChar.isRestingOnSurface),
        isClimbing: Boolean(kChar.isClimbing),
        stagedAction: kChar.stagedAction,
        stagedActions: kChar.stagedActions,
        getStage: (group = "default") => kChar.getStage(group),
        facingAngle: kChar.facingAngle ?? 0,
        mouseAimPos: input.actualMousePos,
        reticleAimPos: input.actualMousePos,
        isKeyDown: (code: string) => input.isKeyPressed(code),
        isMouseButtonDown: isMouseBtnDown,
        isGamepadButtonDown: () => false,
        getGamepadAxis: () => ({ x: 0, y: 0 }),
        keyStates,
        mouseStates,
      };

      if (!kSchema.keyboardMouse.blocks) {
        kSchema.keyboardMouse.blocks = JSON.parse(JSON.stringify(DefaultControlBlocks));
      }
      if (kSchema.keyboardMouse.blocks && kSchema.keyboardMouse.blocks.length > 0) {
        const packet = ModularBlockEvaluator.evaluateBlocks(kSchema.keyboardMouse.blocks, execCtx, input);
        map.set("keyboard", packet);
        input.aimLockRawDelta = 0;
        input.aimLockRawDx = 0;
        input.aimLockRawDy = 0;
      } else if (kSchema.keyboardMouse.channels) {
        const packet = ControlSchemaArbiter.evaluateChannels(kSchema.keyboardMouse.channels, execCtx, input);
        map.set("keyboard", packet);
        input.aimLockRawDelta = 0;
        input.aimLockRawDx = 0;
        input.aimLockRawDy = 0;
      } else {
      // 1. Locomotion Movement Vector
      let moveX = 0;
      let moveY = 0;
      const locoCfg = kSchema.keyboardMouse.locomotion;
      if (locoCfg.mode === "forwardFacingDrive") {
        const aimDx = input.actualMousePos.x - kChar.position.x;
        const aimDy = input.actualMousePos.y - kChar.position.y;
        if (Math.hypot(aimDx, aimDy) > 0.05) {
          kChar.facingAngle = Math.atan2(aimDy, aimDx);
        }

        const isFwd = locoCfg.forwardTrigger
          ? ControlSchemaArbiter.isTriggerActive(locoCfg.forwardTrigger, execCtx, keyStates, mouseStates)
          : false;

        const fwdAngle = kChar.facingAngle ?? 0;
        const fwdX = Math.cos(fwdAngle);
        const fwdY = Math.sin(fwdAngle);
        const leftX = -fwdY;
        const leftY = fwdX;

        if (isFwd) {
          moveX += fwdX;
          moveY += fwdY;
        }
        if (locoCfg.reverseKey && keyStates.isDown(locoCfg.reverseKey)) {
          moveX -= fwdX * 0.75;
          moveY -= fwdY * 0.75;
        }
        if (locoCfg.strafeLeftKey && keyStates.isDown(locoCfg.strafeLeftKey)) {
          moveX += leftX * 0.85;
          moveY += leftY * 0.85;
        }
        if (locoCfg.strafeRightKey && keyStates.isDown(locoCfg.strafeRightKey)) {
          moveX -= leftX * 0.85;
          moveY -= leftY * 0.85;
        }
      } else {
        // Direct 8-Way Vector — strictly schema-driven (no unconfigured key fallbacks)
        const upKey = locoCfg.moveForwardKey;
        const downKey = locoCfg.reverseKey;
        const leftKey = locoCfg.strafeLeftKey;
        const rightKey = locoCfg.strafeRightKey;

        if (upKey && keyStates.isDown(upKey)) moveY -= 1;
        if (downKey && keyStates.isDown(downKey)) moveY += 1;
        if (leftKey && keyStates.isDown(leftKey)) moveX -= 1;
        if (rightKey && keyStates.isDown(rightKey)) moveX += 1;
      }

      const moveMag = Math.hypot(moveX, moveY);
      if (moveMag > 1.0) {
        moveX /= moveMag;
        moveY /= moveMag;
      }

      // 2. Aiming Paradigm & Facing Angle
      const aimCfg = kSchema.keyboardMouse.aiming;
      if (aimCfg.mode === "faceMouseCursor") {
        const aimDx = input.actualMousePos.x - kChar.position.x;
        const aimDy = input.actualMousePos.y - kChar.position.y;
        if (Math.hypot(aimDx, aimDy) > 0.05) {
          kChar.facingAngle = Math.atan2(aimDy, aimDx);
        }
      } else if (aimCfg.mode === "faceMovement") {
        if (moveMag > 0.05) {
          kChar.facingAngle = Math.atan2(moveY, moveX);
        }
      }

      // 3. Schema Action Rules Evaluation (Sorted by priority descending)
      let isSprinting = false;
      let isJumpHeld = false;
      let isGrabHeld = false;
      let isDrop = false;
      let isSwap = false;
      let isThrow = false;
      let isUsingItem = false;
      let isLaserAiming = false;
      let isLaserFiring = false;
      let isMeleeRequested = false;
      let isAimingTrajectory = false;

      const executedKbmThreads = new Set<string>();
      const executeKbmRules = (ruleList: ControlRule[]) => {
        const sortedRules = [...ruleList].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
        for (const rule of sortedRules) {
          if (rule.enabled === false) continue;
          const threadKey = rule.threadId ?? null;
          if (threadKey && executedKbmThreads.has(threadKey)) {
            continue;
          }

          if (!ControlSchemaArbiter.isRuleApplicable(rule, execCtx, kSchema, "keyboardMouse", keyStates, mouseStates)) {
            continue;
          }

          if (threadKey) {
            executedKbmThreads.add(threadKey);
          }
          ControlsInspector.notifyRuleFired(rule.id);

          const statements = ControlSchemaArbiter.getRuleBody(rule);
          const effTrigger = ControlSchemaArbiter.resolveEffectiveTrigger(rule, kSchema, "keyboardMouse");

          for (const stmt of statements) {
            if (stmt.type === "action") {
              const act = stmt.action;
              const mid = act.moduleId;
              const intent = act.intent;

              if (mid === "locomotion") {
                if (intent === "jump") isJumpHeld = true;
                else if (intent === "holdSprint") isSprinting = true;
                else if (intent === "toggleSprint") {
                  if (effTrigger.mode === "press" ? (keyStates.justPressed(effTrigger.code) || mouseStates.justPressed(effTrigger.code === "MouseLeft" ? 0 : 2)) : true) {
                    kChar.setSprinting(!kChar.isSprinting);
                  }
                  isSprinting = Boolean(kChar.isSprinting);
                }
              } else if (mid === "throw" || mid === "throwPickup") {
                if (intent === "aimThrow") isAimingTrajectory = true;
                else if (intent === "releaseThrow") isThrow = true;
                else if (intent === "pickupReach") isGrabHeld = true;
                else if (intent === "dropItem") isDrop = true;
                else if (intent === "swap" || intent === "swapItem") isSwap = true;
              } else if (mid === "pickup") {
                if (intent === "pickupReach") isGrabHeld = true;
                else if (intent === "dropItem") isDrop = true;
                else if (intent === "swap" || intent === "swapItem") isSwap = true;
              } else if (mid === "laser") {
                if (intent === "aimLaser") isLaserAiming = true;
                else if (intent === "fireLaser") {
                  isLaserFiring = true;
                  isLaserAiming = true;
                }
              } else if (mid === "melee") {
                if (intent === "punch") isMeleeRequested = true;
              } else if (mid === "heldItem" || mid === "item" || mid === "consume") {
                if (intent === "primaryItemAbility" || intent === "eatHeldItem") isUsingItem = true;
              } else if (mid === "staging") {
                if (intent === "setStage") {
                  kChar.setStage(act.args?.group || act.args?.stageSet || "default", act.args?.stage || "none");
                } else if (intent.includes("Laser")) {
                  kChar.stagedAction = "laser";
                } else if (intent.includes("Throw")) {
                  kChar.stagedAction = "throw";
                } else if (intent.includes("Pickup") || intent.includes("Grab")) {
                  kChar.stagedAction = "pickup";
                } else if (intent.includes("Melee")) {
                  kChar.stagedAction = "melee";
                } else if (intent === "clearStage") {
                  kChar.stagedAction = "none";
                }
              }
            } else if (stmt.type === "nestedThread") {
              executeKbmRules(stmt.rules);
            }
          }
        }
      };

      executeKbmRules(kSchema.keyboardMouse.rules);

      kChar.isAimingTrajectory = isAimingTrajectory;
      kChar.isLaserAiming = isLaserAiming;
      kChar.isLaserFiring = isLaserFiring;
      kChar.isMeleeRequested = isMeleeRequested;

      // When aiming or holding with directional intent, face aim cursor
      if (isLaserAiming || isLaserFiring || isMeleeRequested || isAimingTrajectory) {
        const aimDx = input.actualMousePos.x - kChar.position.x;
        const aimDy = input.actualMousePos.y - kChar.position.y;
        if (Math.hypot(aimDx, aimDy) > 0.05) {
          kChar.facingAngle = Math.atan2(aimDy, aimDx);
          if (isAimingTrajectory) {
            kChar.lastThrowAimAngle = kChar.facingAngle;
          }
        }
      }

      const isMouseAiming = !isEditMode && (isLaserAiming || isAimingTrajectory);

      const kLaunchVel = isThrow && kChar.activeTrajectory?.launchVel ? kChar.activeTrajectory.launchVel : undefined;
      const kLaunchPos = isThrow && kChar.activeTrajectory?.launchPos ? kChar.activeTrajectory.launchPos : undefined;

      map.set("keyboard", {
        playerId: "keyboard",
        moveX,
        moveY,
        isSprinting: isSprinting || Boolean(kChar.isSprinting),
        isJumpHeld,
        isGrabHeld,
        grabTargetObjectId: (isGrabHeld || isSwap) && grabTargetObject ? grabTargetObject.id : null,
        isDrop,
        isThrow,
        isSwap,
        isUsingItem,
        isLaserAiming,
        isLaserFiring,
        laserAimX: input.actualMousePos.x,
        laserAimY: input.actualMousePos.y,
        isMeleeRequested,
        meleeAimDirX: (input.actualMousePos.x - kChar.position.x) / (Math.hypot(input.actualMousePos.x - kChar.position.x, input.actualMousePos.y - kChar.position.y) || 1),
        meleeAimDirY: (input.actualMousePos.y - kChar.position.y) / (Math.hypot(input.actualMousePos.x - kChar.position.x, input.actualMousePos.y - kChar.position.y) || 1),
        meleeAimX: input.actualMousePos.x,
        meleeAimY: input.actualMousePos.y,
        aimX: input.actualMousePos.x,
        aimY: input.actualMousePos.y,
        isAiming: isMouseAiming,
        isLockHeld: false,
        lockedAimPos: null,
        aimLockDelta: 0,
        facingAngle: kChar.facingAngle,
        ...(kLaunchVel ? {
          launchVx: kLaunchVel.vx,
          launchVy: kLaunchVel.vy,
          launchVz: kLaunchVel.vz,
        } : {}),
        ...(kLaunchPos ? {
          launchStartX: kLaunchPos.x,
          launchStartY: kLaunchPos.y,
          launchStartZ: kLaunchPos.z,
        } : {}),
      } as any);
        input.aimLockRawDelta = 0;
        input.aimLockRawDx = 0;
        input.aimLockRawDy = 0;
      }
    }

    // 2. Gamepads (Fully Schema-Driven via gpSchema)
    for (const entry of this.players.values()) {
      if (entry.isKeyboard || entry.slotIndex === undefined) continue;
      const slot = input.gamepadSlots.get(entry.slotIndex);
      if (!slot || !slot.connected) continue;

      const cChar = entry.character;
      const gpSchema = ControlsInspector.getActiveSchema(cChar);
      const isCharHolding = cChar.heldObject !== null;
      const isCharHoldingConsumable = Boolean(cChar.canConsumeHeldObject ? cChar.canConsumeHeldObject() : false);

      let aimX = slot.aimPos.x;
      let aimY = slot.aimPos.y;

      let grabTargetObject: GameObject | null = null;
      if (cChar.pickupModule || cChar.grappleModule) {
        const candidateEntities = [...this.allCharacters.filter((c) => c !== cChar), ...objects].filter(
          (c) => c !== cChar.heldObject && c !== (cChar as any).grappledTarget
        );
        const target = GrabIntentArbiter.findTarget(
          cChar,
          aimX,
          aimY,
          candidateEntities,
          this.arena.wallHeight
        );
        if (target) {
          grabTargetObject = target;
        }
      }

      // Gamepad button edge detection accessors
      const slotIdx = entry.slotIndex;
      let prevGpSet = this.prevGamepadButtons.get(slotIdx);
      if (!prevGpSet) {
        prevGpSet = new Set();
        this.prevGamepadButtons.set(slotIdx, prevGpSet);
      }

      const gpStates = {
        slotIndex: slotIdx,
        isDown: (btn: number) => Boolean(slot.buttons && slot.buttons[btn]),
        justPressed: (btn: number) => Boolean(slot.buttons && slot.buttons[btn] && !prevGpSet.has(btn)),
        justReleased: (btn: number) => Boolean(slot.buttons && !slot.buttons[btn] && prevGpSet.has(btn)),
        getValue: (btn: number) => slot.buttonValues?.[btn] ?? (slot.buttons?.[btn] ? 1.0 : 0.0),
        leftStick: slot.movementVector,
        rightStick: slot.aimStickVector,
      };

      const gpExecCtx: ControlExecutionContext = {
        character: cChar,
        arena: this.arena,
        dt: 1 / 60,
        schema: gpSchema,
        isHoldingItem: isCharHolding,
        heldItemIsEdible: isCharHoldingConsumable,
        heldItemHasPrimaryAbility: Boolean(cChar.hasPrimaryItemAbility ? cChar.hasPrimaryItemAbility() : false),
        targetInReach: grabTargetObject,
        isGrounded: Boolean(cChar.isRestingOnSurface),
        isClimbing: Boolean(cChar.isClimbing),
        stagedAction: cChar.stagedAction,
        stagedActions: cChar.stagedActions,
        getStage: (group = "default") => cChar.getStage(group),
        facingAngle: cChar.facingAngle ?? 0,
        mouseAimPos: { x: aimX, y: aimY },
        reticleAimPos: { x: aimX, y: aimY },
        isKeyDown: () => false,
        isMouseButtonDown: () => false,
        isGamepadButtonDown: (_sIdx: number, btn: number) => Boolean(slot.buttons && slot.buttons[btn]),
        getGamepadButtonValue: (_sIdx: number, btn: number) => slot.buttonValues?.[btn] ?? (slot.buttons?.[btn] ? 1.0 : 0.0),
        getGamepadAxis: (_sIdx: number, axis: "LeftStick" | "RightStick") =>
          axis === "LeftStick" ? slot.movementVector : (slot.aimStickVector || { x: 0, y: 0 }),
        gamepadStates: gpStates,
      };

      gpStates.leftStick = slot.movementVector;
      gpExecCtx.mouseAimPos = { x: aimX, y: aimY };
      gpExecCtx.reticleAimPos = { x: aimX, y: aimY };

      if (!gpSchema.gamepad.blocks) {
        gpSchema.gamepad.blocks = JSON.parse(JSON.stringify(DefaultGamepadControlBlocks));
      }
      const packet = ModularBlockEvaluator.evaluateBlocks(gpSchema.gamepad.blocks!, gpExecCtx, input);
      packet.playerId = entry.id;
      packet.playerName = cChar.name;
      (packet as any).isLockHeld = slot.isLockHeld ?? false;
      (packet as any).lockedAimPos = slot.lockedAimPos ? { ...slot.lockedAimPos } : null;
      map.set(entry.id, packet);
      slot.isDropRequested = false;
      slot.isThrowRequested = false;
      slot.isJumpRequested = false;
      slot.isMeleeRequested = false;
      continue;
    }

    // Update historical button buffers for edge detection (justPressed / justReleased)
    this.prevKeysPressed = new Set(input.getActiveKeys());
    this.prevMouseButtons = new Set();
    if (input.isMouseDown) this.prevMouseButtons.add(0);
    if (input.isMiddleMouseDown) this.prevMouseButtons.add(1);
    if (input.isRightMouseDown) this.prevMouseButtons.add(2);

    for (const [slotIdx, slot] of input.gamepadSlots) {
      if (!slot.connected || !slot.buttons) continue;
      const set = new Set<number>();
      for (let i = 0; i < slot.buttons.length; i++) {
        if (slot.buttons[i]) set.add(i);
      }
      this.prevGamepadButtons.set(slotIdx, set);
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
    (this.arena as any).worldObjects = objects;

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
        input.arcModulationCursor = null;
        input.arcModulationDeltaY = 0;
        if (entry && entry.slotIndex !== undefined) {
          const slot = input.gamepadSlots.get(entry.slotIndex);
          if (slot) {
            slot.isLockHeld = false;
            slot.lockedAimPos = null;
            slot.arcModulationCursor = null;
            slot.arcModulationDeltaY = 0;
            slot.lastThrowAimAngle = undefined;
          }
        }
        const actPlayerId = entry?.id || char.playerId || playerId || "keyboard";
        ClientActionDispatcher.dispatchDrop(
          this.onReliableActionDispatched,
          isReplay,
          actPlayerId,
          pkt.tick ?? 0,
          droppedObj.id
        );
      }

      // Dedicated Throw (RT / Left Click)
      if (pkt.isThrow && char.heldObject && char.throwModule) {
        if (char.isThrowCancelZone) {
          // Throw was cancelled inside character cancel deadzone
          return;
        }
        const thrownObj = char.heldObject;
        const throwAimX = aimTarget ? aimTarget.x : (char.position.x + Math.cos(char.facingAngle) * 3);
        const throwAimY = aimTarget ? aimTarget.y : (char.position.y + Math.sin(char.facingAngle) * 3);

        // Immediately orient character to throw target direction
        const aimDx = throwAimX - char.position.x;
        const aimDy = throwAimY - char.position.y;
        if (Math.hypot(aimDx, aimDy) > 0.05) {
          char.facingAngle = Math.atan2(aimDy, aimDx);
        }

        // Use the exact pre-calculated launch velocity and start position from the packet or client's active trajectory preview
        const clientLaunchVel = (pkt as any).launchVx !== undefined
          ? { vx: (pkt as any).launchVx, vy: (pkt as any).launchVy, vz: (pkt as any).launchVz }
          : char.activeTrajectory?.launchVel;
        const clientLaunchPos = (pkt as any).launchStartX !== undefined
          ? { x: (pkt as any).launchStartX, y: (pkt as any).launchStartY, z: (pkt as any).launchStartZ }
          : char.activeTrajectory?.launchPos;

        const thrown = char.throwModule.throwHeldObject(
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

        if (thrown) {
          thrown.applyKnockbackWindow(2500);
          thrown.isInFlight = true;
          thrown.wakeUp();
          (char as any)._lastThrowRecoilTime = performance.now();
          char.isUsingItem = false;
          char.eatRateWatts = 0;
          input.arcModulationCursor = null;
          input.arcModulationDeltaY = 0;

          // Once the throw completes and character is empty-handed, reset aim stick movement flags & lock state
          if (entry && entry.slotIndex !== undefined) {
            const slot = input.gamepadSlots.get(entry.slotIndex);
            if (slot) {
              slot.hasMovedAimStick = false;
              slot.aimMovedWhileInRange = false;
              slot.isLockHeld = false;
              slot.lockedAimPos = null;
              slot.arcModulationCursor = null;
              slot.arcModulationDeltaY = 0;
              slot.lastThrowAimAngle = undefined;
            }
          }

          const actPlayerId = entry?.id || char.playerId || playerId || "keyboard";
          ClientActionDispatcher.dispatchThrow(
            this.onReliableActionDispatched,
            isReplay,
            actPlayerId,
            pkt.tick ?? 0,
            thrownObj.id,
            throwAimX,
            throwAimY,
            Boolean(pkt.isLockHeld),
            clientLaunchVel,
            clientLaunchPos
          );
        } else if (char.throwModule.consumesEnergy && char.energyPool) {
          const heldMass = thrownObj.hasMass ? Math.max(0.1, thrownObj.mass) : 1.0;
          const launchSpeed = clientLaunchVel
            ? Math.hypot(clientLaunchVel.vx, clientLaunchVel.vy, clientLaunchVel.vz)
            : 10.0;
          const mechWorkJoules = 0.5 * heldMass * (launchSpeed * launchSpeed);
          const poolEfficiency = Math.max(0.01, char.energyPool.getMuscleEfficiency(char.properties));
          const metabolicJoules = Math.max(5, mechWorkJoules / poolEfficiency);
          char.energyPool.notifyInsufficientEnergy({
            abilityId: "throw",
            demandedAmount: metabolicJoules,
            isBurst: true,
            registry: char.properties,
          });
        }
      }

      if (entry?.isKeyboard) {
        this.updateArcModulation(char);
      } else if (entry?.slotIndex !== undefined) {
        const slot = input.gamepadSlots.get(entry.slotIndex);
        if (slot) {
          this.updateArcModulation(char, slot);
        }
      }

      // Set Laser inputs on character before physical capability update so laser demand is registered before bus.update
      if (char.laserModule) {
        char.isLaserAiming = Boolean((pkt as any).isLaserAiming);
        char.isLaserFiring = Boolean((pkt as any).isLaserFiring);
        char.laserAimTarget = (pkt as any).laserAimX !== undefined
          ? { x: (pkt as any).laserAimX, y: (pkt as any).laserAimY }
          : null;
        char.laserPowerFraction = typeof (pkt as any).laserPowerFraction === "number"
          ? (pkt as any).laserPowerFraction
          : 1.0;
        char.laserCandidateEntities = [...this.allCharacters.filter((c) => c !== char), ...(objects || [])];
      }

      // Set Melee inputs on character before physical capability update
      if (char.meleeModule) {
        char.isMeleeRequested = Boolean((pkt as any).isMeleeRequested);
        char.meleeAimDir = (pkt as any).meleeAimDirX !== undefined && (pkt as any).meleeAimDirY !== undefined
          ? { x: (pkt as any).meleeAimDirX, y: (pkt as any).meleeAimDirY }
          : ((pkt as any).meleeAimX !== undefined
            ? { x: (pkt as any).meleeAimX - char.position.x, y: (pkt as any).meleeAimY - char.position.y }
            : null);
        char.meleeCandidateEntities = [...this.allCharacters.filter((c) => c !== char), ...(objects || [])];
        char.onPunchExecuted = (_res, dirX, dirY) => {
          const actPlayerId = entry?.id || char.playerId || playerId || "keyboard";
          ClientActionDispatcher.dispatchPunch(
            this.onReliableActionDispatched,
            isReplay,
            actPlayerId,
            pkt.tick ?? 0,
            char.position.x + dirX * 3,
            char.position.y + dirY * 3
          );
        };
      }

      if (pkt.facingAngle !== undefined) {
        char.facingAngle = pkt.facingAngle;
      }

      char.updateCharacter(
        dt,
        { x: pkt.moveX, y: pkt.moveY },
        pkt.isAiming,
        aimTarget,
        this.arena,
        pkt.isJumpHeld,
        this.arena.entities,
        false,
        (pkt as any).lockedAimPos ?? null,
        (pkt as any).aimLockDelta ?? 0,
        pkt.facingAngle !== undefined
      );

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
              this.inputManager.isRightMouseDown ||
              this.inputManager.justPickedUp ||
              (entry?.slotIndex !== undefined && (this.inputManager.gamepadSlots.get(entry.slotIndex)?.rtHeld ?? false));
            if (isButtonHeld) {
              gState.useItemSuppressed = true;
            }
            char.isUsingItem = false;
            (char as any)._isConsumeToggledOn = false;
            (char as any)._toggledConsumeItemId = null;
            char.eatRateWatts = 0;
            char.isChargingThrow = false;
            char.isAimingWallClear = false;
            char.isHoldingThrowRelease = false;
            char.activeTrajectory = null;
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
          const actPlayerId = entry?.id || char.playerId || playerId || "keyboard";
          ClientActionDispatcher.dispatchPickup(
            this.onReliableActionDispatched,
            isReplay,
            actPlayerId,
            pkt.tick ?? 0,
            char.heldObject ? char.heldObject.id : currentHeldId
          );
        }
      }

      let justDepletedConsumable = false;
      if (char.heldObject) {
        const heldPos = char.calculateHeldObjectPosition(this.arena);
        char.heldObject.position.x = heldPos.x;
        char.heldObject.position.y = heldPos.y;
        char.heldObject.position.z = heldPos.z;

        // Primary Item Ability: Actuates held object's primary ability (e.g. consuming for consumables)
        const grabState = this.getGrabSuppressionState(char.id);
        const isUsingItem = Boolean((pkt as any).isUsingItem) && !grabState.useItemSuppressed;
        const activeConsumable = char.heldObject || char.grappledTarget;
        if (isUsingItem && activeConsumable && char.hasPrimaryItemAbility()) {
          char.isUsingItem = true;
          const heldItem = activeConsumable;
          let isDepleted = false;

          if (heldItem.hasPrimaryItemAbility()) {
            const res = heldItem.usePrimaryItemAbility(dt, char, objects, this.arena);
            char.eatRateWatts = res.watts ?? 0;
            isDepleted = Boolean(res.isDepleted);
          } else if (char.consumeModule && char.consumeModule.canConsume(heldItem)) {
            const consumeResult = char.consumeModule.consume(dt, char, heldItem, objects, this.arena);
            char.eatRateWatts = consumeResult.watts;
            isDepleted = Boolean(consumeResult.isDepleted);
          }

          if (isDepleted) {
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
            (char as any)._isConsumeToggledOn = false;
            (char as any)._toggledConsumeItemId = null;
            char.eatRateWatts = 0;
            char.isChargingThrow = false;
            char.isAimingWallClear = false;
            char.isHoldingThrowRelease = false;
            char.activeTrajectory = null;
            if (char.heldObject === heldItem) {
              char.heldObject = null;
            }
            if (char.grappledTarget === heldItem) {
              char.releaseGrapple();
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

      // Reset grab suppression as soon as the grab action is not held
      if (!pkt.isGrabHeld && !(pkt as any).isSwap) {
        grabState.grabSuppressed = false;
        grabState.mouseGrabSuppressed = false;
        grabState.keyEGrabSuppressed = false;
        grabState.rtGrabSuppressed = false;
        grabState.bGrabSuppressed = false;
      }
      if (!(pkt as any).isUsingItem) {
        grabState.useItemSuppressed = false;
      }

      const isDeviceSuppressed = grabState.grabSuppressed || (
        isKeyboardPlayer
          ? (grabState.mouseGrabSuppressed && grabState.keyEGrabSuppressed)
          : (grabState.rtGrabSuppressed && grabState.bGrabSuppressed)
      );

      // Dedicated Swap Action: drops current item, discludes it, and grabs selected item
      if (!isEditMode && (pkt as any).isSwap && !isDeviceSuppressed && char.pickupModule) {
        const currentlyHeld = char.heldObject;
        const otherEntities = [...this.allCharacters.filter((c) => c !== char), ...objects].filter((e) => e !== currentlyHeld);
        let targetObj: GameObject | null = null;
        if (pkt.grabTargetObjectId && pkt.grabTargetObjectId !== currentlyHeld?.id) {
          targetObj = otherEntities.find((e) => e.id === pkt.grabTargetObjectId) || null;
        }
        if (!targetObj && aimTarget) {
          targetObj = char.pickupModule.findTargetObject(char, aimTarget.x, aimTarget.y, otherEntities, this.arena.wallHeight);
        }

        // SWAP REQUIREMENT: If holding an item, do NOT drop it unless another object is near enough to swap with!
        if (currentlyHeld && (!targetObj || !char.pickupModule.isObjectInReach(char, targetObj, this.arena.wallHeight))) {
          // No candidate object in reach: preserve held object
        } else {
        const droppedObj = currentlyHeld;
        if (droppedObj) {
          char.pickupModule.drop(char);
          input.arcModulationCursor = null;
          input.arcModulationDeltaY = 0;
          if (entry && entry.slotIndex !== undefined) {
            const slot = input.gamepadSlots.get(entry.slotIndex);
            if (slot) {
              slot.isLockHeld = false;
              slot.lockedAimPos = null;
              slot.arcModulationCursor = null;
              slot.arcModulationDeltaY = 0;
              slot.lastThrowAimAngle = undefined;
            }
          }
          const actPlayerId = entry?.id || char.playerId || playerId || "keyboard";
          ClientActionDispatcher.dispatchDrop(
            this.onReliableActionDispatched,
            isReplay,
            actPlayerId,
            pkt.tick ?? 0,
            droppedObj.id
          );
        }

        if (targetObj && char.pickupModule.isObjectInReach(char, targetObj, this.arena.wallHeight)) {
          grabState.grabSuppressed = true;
          if (isKeyboardPlayer) {
            grabState.mouseGrabSuppressed = true;
            grabState.keyEGrabSuppressed = true;
          } else {
            grabState.rtGrabSuppressed = true;
            grabState.bGrabSuppressed = true;
          }
          const actPlayerId = entry?.id || char.playerId || playerId || "keyboard";
          if (this.isOnlineMode) {
            this.onPriorityGrabRequested?.(playerId, char.id, targetObj.id);
            ClientActionDispatcher.dispatchPickup(
              this.onReliableActionDispatched,
              isReplay,
              actPlayerId,
              pkt.tick ?? 0,
              targetObj.id
            );
          } else {
            let itemToHold: GameObject = targetObj;
            if (targetObj.spawnerModule && targetObj.spawnerModule.enabled) {
              const clone = targetObj.spawnerModule.triggerClone(targetObj, this.arena, objects);
              if (clone) itemToHold = clone;
            }
            const pickedUp = char.pickupModule.pickup(char, itemToHold);
            if (!pickedUp && itemToHold !== targetObj) {
              const idx = objects.indexOf(itemToHold);
              if (idx !== -1) objects.splice(idx, 1);
            } else if (pickedUp) {
              this.lastHeldObjectIds.set(char.id, itemToHold.id);
              char.isUsingItem = false;
              char.eatRateWatts = 0;
              ClientActionDispatcher.dispatchPickup(
                this.onReliableActionDispatched,
                isReplay,
                actPlayerId,
                pkt.tick ?? 0,
                itemToHold.id
              );
            }
          }
        } else if (aimTarget) {
          const pickedUp = char.pickupModule ? char.pickupModule.pickupAndSwap(char, otherEntities, this.arena.wallHeight, aimTarget.x, aimTarget.y) : false;
          const held = char.heldObject as GameObject | null;
          if (pickedUp && held) {
            grabState.grabSuppressed = true;
            if (isKeyboardPlayer) {
              grabState.mouseGrabSuppressed = true;
              grabState.keyEGrabSuppressed = true;
            } else {
              grabState.rtGrabSuppressed = true;
              grabState.bGrabSuppressed = true;
            }
            this.lastHeldObjectIds.set(char.id, held.id);
            char.isUsingItem = false;
            (char as any)._isConsumeToggledOn = false;
            (char as any)._toggledConsumeItemId = null;
            char.eatRateWatts = 0;
            char.isChargingThrow = false;
            char.isAimingWallClear = false;
            char.isHoldingThrowRelease = false;
            char.activeTrajectory = null;
            const actPlayerId = entry?.id || char.playerId || playerId || "keyboard";
            ClientActionDispatcher.dispatchPickup(
              this.onReliableActionDispatched,
              isReplay,
              actPlayerId,
              pkt.tick ?? 0,
              held.id
            );
          }
        }
        }
      }
      const isSeeking = !justDepletedConsumable && pkt.isGrabHeld && !isDeviceSuppressed;
      if (!isEditMode && isSeeking && !char.heldObject && !char.grappledTarget && (char.pickupModule || char.grappleModule)) {
        if (pkt.grabTargetObjectId !== undefined) {
          if (pkt.grabTargetObjectId !== null) {
            const otherEntities = [...this.allCharacters.filter((c) => c !== char), ...objects];
            const targetObj = otherEntities.find((e) => e.id === pkt.grabTargetObjectId);
            if (targetObj) {
              if (this.isOnlineMode) {
                // Online Mode: Do NOT assume pickup was successful! Send priority message to server.
                const gState = this.getGrabSuppressionState(char.id);
                gState.grabSuppressed = true;
                if (isKeyboardPlayer) {
                  gState.mouseGrabSuppressed = true;
                  gState.keyEGrabSuppressed = true;
                } else {
                  gState.rtGrabSuppressed = true;
                  gState.bGrabSuppressed = true;
                }
                const actPlayerId = entry?.id || char.playerId || playerId || "keyboard";
                this.onPriorityGrabRequested?.(playerId, char.id, targetObj.id);
                ClientActionDispatcher.dispatchPickup(
                  this.onReliableActionDispatched,
                  isReplay,
                  actPlayerId,
                  pkt.tick ?? 0,
                  targetObj.id
                );
              } else {
                let itemToHold: GameObject = targetObj;
                if (targetObj.spawnerModule && targetObj.spawnerModule.enabled) {
                  // Spawner entity stays put at its location!
                  // Dispense an identical clone without spawner behavior to go into character's hands.
                  const clone = targetObj.spawnerModule.triggerClone(targetObj, this.arena, objects);
                  if (clone) {
                    itemToHold = clone;
                  }
                }
                const result = GrabIntentArbiter.executeGrab(char, itemToHold);
                if (!result.success && itemToHold !== targetObj) {
                  // Insufficient lift energy or failed pickup: clean up orphaned clone
                  const idx = objects.indexOf(itemToHold);
                  if (idx !== -1) objects.splice(idx, 1);
                } else if (result.success) {
                  const gState = this.getGrabSuppressionState(char.id);
                  const isButtonHeld = this.inputManager.isMouseDown ||
                    this.inputManager.isRightMouseDown ||
                    this.inputManager.justPickedUp ||
                    (entry?.slotIndex !== undefined && (this.inputManager.gamepadSlots.get(entry.slotIndex)?.rtHeld ?? false));
                  if (isButtonHeld) {
                    gState.useItemSuppressed = true;
                  }
                  this.lastHeldObjectIds.set(char.id, itemToHold.id);
                  char.isUsingItem = false;
                  char.eatRateWatts = 0;
                  const actPlayerId = entry?.id || char.playerId || playerId || "keyboard";
                  ClientActionDispatcher.dispatchPickup(
                    this.onReliableActionDispatched,
                    isReplay,
                    actPlayerId,
                    pkt.tick ?? 0,
                    itemToHold.id
                  );
                }
              }
            }
          }
        } else if (aimTarget) {
          // Fallback for legacy calls without grabTargetObjectId
          const otherEntities = [...this.allCharacters.filter((c) => c !== char), ...objects];
          const target = GrabIntentArbiter.findTarget(char, aimTarget.x, aimTarget.y, otherEntities, this.arena.wallHeight);
          if (target) {
            if (this.isOnlineMode) {
              const gState = this.getGrabSuppressionState(char.id);
              gState.grabSuppressed = true;
              if (isKeyboardPlayer) {
                gState.mouseGrabSuppressed = true;
                gState.keyEGrabSuppressed = true;
              } else {
                gState.rtGrabSuppressed = true;
                gState.bGrabSuppressed = true;
              }
              const actPlayerId = entry?.id || char.playerId || playerId || "keyboard";
              this.onPriorityGrabRequested?.(playerId, char.id, target.id);
              ClientActionDispatcher.dispatchPickup(
                this.onReliableActionDispatched,
                isReplay,
                actPlayerId,
                pkt.tick ?? 0,
                target.id
              );
            } else if (target.spawnerModule && target.spawnerModule.enabled) {
              const clone = target.spawnerModule.triggerClone(target, this.arena, objects);
              if (clone) {
                const pickedUp = char.pickupModule ? char.pickupModule.pickup(char, clone) : false;
                if (!pickedUp) {
                  const idx = objects.indexOf(clone);
                  if (idx !== -1) objects.splice(idx, 1);
                } else {
                  const gState = this.getGrabSuppressionState(char.id);
                  const isButtonHeld = this.inputManager.isMouseDown ||
                    this.inputManager.isRightMouseDown ||
                    this.inputManager.justPickedUp ||
                    (entry?.slotIndex !== undefined && (this.inputManager.gamepadSlots.get(entry.slotIndex)?.rtHeld ?? false));
                  if (isButtonHeld) {
                    gState.useItemSuppressed = true;
                  }
                  this.lastHeldObjectIds.set(char.id, clone.id);
                  char.isUsingItem = false;
                  char.eatRateWatts = 0;
                  const actPlayerId = entry?.id || char.playerId || playerId || "keyboard";
                  ClientActionDispatcher.dispatchPickup(
                    this.onReliableActionDispatched,
                    isReplay,
                    actPlayerId,
                    pkt.tick ?? 0,
                    clone.id
                  );
                }
              }
            } else {
              const pickedUp = char.pickupModule ? char.pickupModule.pickupAndSwap(char, otherEntities, this.arena.wallHeight, aimTarget.x, aimTarget.y) : false;
              const held = char.heldObject as GameObject | null;
              if (pickedUp && held) {
                const gState = this.getGrabSuppressionState(char.id);
                const isButtonHeld = this.inputManager.isMouseDown ||
                  this.inputManager.isRightMouseDown ||
                  this.inputManager.justPickedUp ||
                  (entry?.slotIndex !== undefined && (this.inputManager.gamepadSlots.get(entry.slotIndex)?.rtHeld ?? false));
                if (isButtonHeld) {
                  gState.useItemSuppressed = true;
                }
                this.lastHeldObjectIds.set(char.id, held.id);
                char.isUsingItem = false;
                char.eatRateWatts = 0;
                const actPlayerId = entry?.id || char.playerId || playerId || "keyboard";
                ClientActionDispatcher.dispatchPickup(
                  this.onReliableActionDispatched,
                  isReplay,
                  actPlayerId,
                  pkt.tick ?? 0,
                  held.id
                );
              }
            }
          }
        }
      }
    }

    // When no player device is connected and no keyboard packet was processed, settle baseCharacter naturally
    if (this.players.size === 0 && !inputs.has("keyboard")) {
      if (input.draggedEntity !== this.baseCharacter) {
        if (this.baseCharacter.laserModule) {
          this.baseCharacter.isLaserAiming = false;
          this.baseCharacter.isLaserFiring = false;
          this.baseCharacter.laserAimTarget = null;
          this.baseCharacter.laserCandidateEntities = [];
        }
        if (this.baseCharacter.meleeModule) {
          this.baseCharacter.isMeleeRequested = false;
          this.baseCharacter.meleeAimDir = null;
        }
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

        // Unified single-object target selection via GrabIntentArbiter:
        if (!char.heldObject && !char.grappledTarget && (char.pickupModule?.enabled || char.grappleModule?.enabled)) {
          const candidateEntities = [...this.allCharacters.filter((c) => c !== char), ...objects].filter(
            (o) => o !== char.heldObject && o !== (char as any).grappledTarget && !o.isHeld
          );
          const target = GrabIntentArbiter.findTarget(
            char,
            this.inputManager.actualMousePos.x,
            this.inputManager.actualMousePos.y,
            candidateEntities,
            this.arena.wallHeight
          );
          if (target) {
            targetGrabEntities.set(char, target);
          }
        }

        entry.wasCursorVisible = true;
        this.inputManager.isCursorVisible = true;

        const aimPos = this.inputManager.lockedAimPos
          ? this.inputManager.lockedAimPos
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

        if (!slot.aimPos) {
          const facing = char.facingAngle ?? 0;
          slot.aimPos = {
            x: char.position.x + Math.cos(facing) * 3.0,
            y: char.position.y + Math.sin(facing) * 3.0,
          };
        }

        // Clamp cursor within arena boundaries
        slot.aimPos.x = Math.max(0.1, Math.min(this.arena.width - 0.1, slot.aimPos.x));
        slot.aimPos.y = Math.max(0.1, Math.min(this.arena.height - 0.1, slot.aimPos.y));

        if (!slot.aimOffset) {
          slot.aimOffset = { x: 0, y: 0 };
        }
        slot.aimOffset.x = slot.aimPos.x - char.position.x;
        slot.aimOffset.y = slot.aimPos.y - char.position.y;

        // Unified single-object target selection via GrabIntentArbiter:
        if (!char.heldObject && !char.grappledTarget && (char.pickupModule?.enabled || char.grappleModule?.enabled)) {
          const candidateEntities = [...this.allCharacters.filter((c) => c !== char), ...objects].filter(
            (o) => o !== char.heldObject && o !== (char as any).grappledTarget && !o.isHeld
          );
          const target = GrabIntentArbiter.findTarget(
            char,
            slot.aimPos.x,
            slot.aimPos.y,
            candidateEntities,
            this.arena.wallHeight
          );
          if (target) {
            targetGrabEntities.set(char, target);
          }
        }

        entry.wasCursorVisible = true;
        slot.isCursorVisible = true;

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

    return { targetGrabEntities, activeAimCursors };
  }

  /**
   * Updates trajectory height modulation when right-click lock is held:
   * 1. Uses the middle of the flattest (lowest) and steepest (highest) trajectories (forming a perfectly vertical line).
   * 2. Initializes the game cursor on that vertical dotted line if not yet initialized.
  /**
   * Updates trajectory height modulation when right-click lock is held:
   * 1. Uses the vertical midpoint rail calculated from the average 2D position (average X and average Y)
   *    between the object held position and the trajectory end position.
   * 2. Modulates savedArcRatio directly using vertical mouse movement along the rail.
   * 3. Clamps savedArcRatio strictly between 0.0 (lowest / flattest trajectory) and 1.0 (highest / steepest trajectory).
   */
  public updateArcModulation(char: Character, slot?: GamepadSlotState): void {
    const input = this.inputManager;
    const isModulationActive = slot
      ? Boolean(slot.isLockHeld && slot.lockedAimPos)
      : this.isKeyboardAimingTrajectory();

    if (!isModulationActive || !char.heldObject || !char.throwModule) {
      return;
    }

    const traj = char.activeTrajectory;
    if (!traj) return;

    const ppu = this.inputManager.pixelsPerUnit;
    const hoverScale = this.arena.visualAltitudeScale ?? 0.5;

    const rail = TrajectoryRenderer.calculateMidpointRail(char, this.arena, traj, ppu, hoverScale);
    if (!rail) return;

    const { midScreenX, lowScreenY, lineDy, lineLen, optRatio } = rail;

    let deltaY = 0;
    if (slot) {
      if (slot.arcModulationDeltaY) {
        deltaY = slot.arcModulationDeltaY;
        slot.arcModulationDeltaY = 0;
      }
    } else {
      if (input.arcModulationDeltaY) {
        deltaY = input.arcModulationDeltaY;
        input.arcModulationDeltaY = 0;
      }
    }

    if (lineLen <= 1) {
      return;
    }

    const effRailHeight = Math.max(30, lineLen);

    if (char.hasUserSetArcRatio && char.savedArcRatio !== undefined) {
      char.throwModule.hasUserSetArcRatio = true;
      char.throwModule.savedArcRatio = char.savedArcRatio;
    }

    if (Math.abs(deltaY) > 0.001) {
      if (!char.throwModule.hasUserSetArcRatio) {
        char.throwModule.savedArcRatio = optRatio;
      }
      // Moving up (negative deltaY) increases ratio towards 1.0 (steepest/highest)
      // Moving down (positive deltaY) decreases ratio towards 0.0 (flattest/lowest)
      const deltaRatio = -deltaY / effRailHeight;
      char.throwModule.savedArcRatio = Math.max(0.0, Math.min(1.0, char.throwModule.savedArcRatio + deltaRatio));
      char.throwModule.hasUserSetArcRatio = true;
      char.savedArcRatio = char.throwModule.savedArcRatio;
      char.hasUserSetArcRatio = true;
    } else {
      // When moving without modulating, if user hasn't customized arc yet, track optRatio live
      if (!char.throwModule.hasUserSetArcRatio) {
        char.throwModule.savedArcRatio = optRatio;
      }
    }

    // Keep cursor aligned with the current arc ratio on the live rail
    const curRatio = char.throwModule.savedArcRatio;
    const curCursorY = lowScreenY + curRatio * lineDy;

    if (slot) {
      if (!slot.arcModulationCursor) {
        slot.arcModulationCursor = { x: midScreenX, y: curCursorY };
      } else {
        slot.arcModulationCursor.x = midScreenX;
        slot.arcModulationCursor.y = curCursorY;
      }
    } else {
      if (!input.arcModulationCursor) {
        input.arcModulationCursor = { x: midScreenX, y: curCursorY };
      } else {
        input.arcModulationCursor.x = midScreenX;
        input.arcModulationCursor.y = curCursorY;
      }
    }
  }
}
