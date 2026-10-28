import { OnlineRoomClient, type OnlineRoomStats } from "./OnlineRoomClient.js";
import type { GameLoop } from "../engine/GameLoop.js";
import type { Character } from "../character/Character.js";
import type { PlayerInputPacket } from "../engine/physics/StateHistoryBuffer.js";
import type { GhostSnapshot } from "./RelayClient.js";
import { OnlineHudController } from "./OnlineHudController.js";
import { LocalPlayerNetReconciler } from "./reconcilers/LocalPlayerNetReconciler.js";
import { RemotePlayerNetReconciler } from "./reconcilers/RemotePlayerNetReconciler.js";
import { ConsumableNetReconciler } from "./reconcilers/ConsumableNetReconciler.js";

export interface OnlineSessionDOMElements {
  badgeStatus: HTMLElement | null;
  connectBtn: HTMLElement | null;
  statusPill: HTMLElement | null;
  pingDisplay: HTMLElement | null;
  playerBadge: HTMLElement | null;
  nameDisplay: HTMLElement | null;
  mySlot: HTMLElement | null;
  myName: HTMLElement | null;
  rttCurrent: HTMLElement | null;
  playersCount: HTMLElement | null;
  rosterList: HTMLElement | null;
  persistentPingHud?: HTMLElement | null;
  persistentPingVal?: HTMLElement | null;
}

/**
 * OnlineSessionManager
 *
 * Encapsulates the online multiplayer networking session:
 * - Connects and coordinates OnlineRoomClient with GameLoop and PlayerManager
 * - Delegates HUD & UI roster updates to OnlineHudController
 * - Streams multi-character telemetry on 60Hz physics ticks
 * - Orchestrates authoritative server snapshot reconciliation across dedicated domain reconcilers
 *
 * Decouples all networking lifecycle and telemetry hooks out of main.ts.
 */
export class OnlineSessionManager {
  public client: OnlineRoomClient;
  private gameLoop: GameLoop | null = null;
  private dom: OnlineSessionDOMElements;
  private defaultCharacter: Character | null = null;
  private spawnAlignedPlayerIds: Set<string> = new Set<string>();
  private processedDeathRespawnEventIds: Set<string> = new Set<string>();

  constructor(client: OnlineRoomClient, dom: OnlineSessionDOMElements) {
    this.client = client;
    this.dom = dom;
    this.bindClientCallbacks();

    // Ensure prompt cleanup when closing the tab or navigating away
    window.addEventListener("beforeunload", () => {
      if (this.client.status === "connected") {
        this.disconnect();
      }
    });
    window.addEventListener("pagehide", () => {
      if (this.client.status === "connected") {
        this.disconnect();
      }
    });
  }

  public setGameLoop(gameLoop: GameLoop, defaultCharacter?: Character): void {
    this.gameLoop = gameLoop;
    if (defaultCharacter) {
      this.defaultCharacter = defaultCharacter;
    }
    this.setupPlayerManagerHooks();
  }

  /**
   * Connects to the online universal room, pre-populating active local players.
   */
  public connect(): void {
    this.spawnAlignedPlayerIds.clear();
    this.client.localPlayers.clear();
    if (this.gameLoop?.playerManager) {
      this.gameLoop.playerManager.isOnlineMode = true;
      for (const p of this.gameLoop.playerManager.players.values()) {
        this.client.localPlayers.set(p.id, {
          localPlayerId: p.id,
          serverCharId: p.id === "keyboard"
            ? (this.client.clientId || "keyboard")
            : `${this.client.clientId || "client"}:${p.id}`,
          playerNumber: p.playerNumber,
          color: p.color,
          name: p.character.hasCustomName ? p.character.name : `Player ${p.playerNumber}`,
        });
      }
    }

    this.client.connect();

    // If socket was already open, notify server of local players
    if (this.client.status === "connected" && this.gameLoop?.playerManager) {
      if (!this.gameLoop.playerManager.players.has("keyboard") && this.client.localPlayers.has("keyboard")) {
        this.client.removePlayer("keyboard");
        this.client.localPlayers.delete("keyboard");
      }
      for (const p of this.gameLoop.playerManager.players.values()) {
        this.client.addPlayer(
          p.id,
          p.character.hasCustomName ? p.character.name : undefined
        );
      }
    }
  }

  public disconnect(): void {
    this.spawnAlignedPlayerIds.clear();
    this.processedDeathRespawnEventIds.clear();
    if (this.gameLoop?.playerManager) {
      this.gameLoop.playerManager.isOnlineMode = false;
    }
    this.client.disconnect();
  }

  public toggleConnect(): void {
    if (this.client.status === "connected") {
      this.disconnect();
    } else {
      this.connect();
    }
  }

  /**
   * Streams local inputs and character/held-object telemetry to the server on fixed tick.
   */
  public sendTickTelemetry(): void {
    if (!this.gameLoop || this.client.status !== "connected") return;

    const activePlayers = Array.from(this.gameLoop.players.values());
    if (activePlayers.length > 0) {
      for (const p of activePlayers) {
        const pkt: PlayerInputPacket = this.gameLoop.lastInputs.get(p.id) || {
          playerId: p.id,
          playerName: p.character.name || this.client.playerName,
          tick: this.gameLoop.currentTick,
          moveX: 0,
          moveY: 0,
          isSprinting: p.character.isSprinting ?? false,
          isJumpHeld: false,
          isGrabHeld: false,
          isLockHeld: false,
          isAiming: false,
        };
        // The client must not send any position information until its position has been corrected
        // and it is fully connected and registered with an authoritative spawn position.
        const isSpawnAligned = this.spawnAlignedPlayerIds.has(p.id);
        const charToSend = isSpawnAligned ? p.character : undefined;
        const objsToSend = isSpawnAligned ? this.gameLoop.objects : undefined;
        this.client.sendPlayerInput(p.id, pkt, charToSend, objsToSend);
      }
    }
  }

  private setupPlayerManagerHooks(): void {
    if (!this.gameLoop?.playerManager) return;

    const prevOnJoined = this.gameLoop.playerManager.onPlayerJoined;
    this.gameLoop.playerManager.onPlayerJoined = (player) => {
      prevOnJoined?.(player);
      if (this.gameLoop?.activeMode === "online" && this.client.status === "connected") {
        if (player.id !== "keyboard" && !this.gameLoop!.playerManager.players.has("keyboard") && this.client.localPlayers.has("keyboard")) {
          this.client.removePlayer("keyboard");
          this.client.localPlayers.delete("keyboard");
        }
        this.client.addPlayer(
          player.id,
          player.character.hasCustomName ? player.character.name : undefined
        );
      }
    };

    const prevOnRemoved = this.gameLoop.playerManager.onPlayerRemoved;
    this.gameLoop.playerManager.onPlayerRemoved = (playerId) => {
      prevOnRemoved?.(playerId);
      if (this.gameLoop?.activeMode === "online" && this.client.status === "connected") {
        this.client.removePlayer(playerId);
      }
    };

    this.gameLoop.playerManager.onPriorityGrabRequested = (localPlayerId, _charId, targetObjectId) => {
      if (this.gameLoop?.activeMode === "online" && this.client.status === "connected") {
        this.client.sendGrabRequest(localPlayerId, targetObjectId);
      }
    };
  }

  private bindClientCallbacks(): void {
    this.client.getLocalPlayers = () => {
      const list: Array<{ localPlayerId: string; name?: string; spawnPos?: { x: number; y: number; z?: number } }> = [];
      if (this.gameLoop?.playerManager) {
        for (const p of this.gameLoop.playerManager.players.values()) {
          list.push({
            localPlayerId: p.id,
            name: p.character.hasCustomName ? p.character.name : undefined,
          });
        }
      }
      return list;
    };

    this.client.onStatsChange = (stats: OnlineRoomStats) => {
      this.updateStatsUI(stats);
    };

    this.client.onJoined = (info) => {
      this.handleJoined(info);
    };

    this.client.onPlayerRegistered = (info) => {
      this.handlePlayerRegistered(info);
    };

    this.client.onPlayerRemoved = (localPlayerId: string) => {
      this.spawnAlignedPlayerIds.delete(localPlayerId);
      if (this.gameLoop?.playerManager?.players.has(localPlayerId)) {
        if (localPlayerId === "keyboard") {
          this.gameLoop.playerManager.removeKeyboardPlayer();
        } else if (localPlayerId.startsWith("gamepad-")) {
          const slot = parseInt(localPlayerId.replace("gamepad-", ""), 10);
          if (!isNaN(slot)) {
            this.gameLoop.playerManager.removeGamepadPlayer(slot);
          }
        }
      }
    };

    this.client.onPlayerLeft = (charId: string) => {
      this.handlePlayerLeft(charId);
    };

    this.client.onClockSync = (sync) => {
      if (this.gameLoop && this.gameLoop.activeMode === "online") {
        this.gameLoop.applyClockSync(sync);
      }
    };

    this.client.onContestedGrabEvents = (events) => {
      if (this.gameLoop && this.gameLoop.activeMode === "online") {
        this.handleContestedGrabEvents(events);
      }
    };

    this.client.onGrabResult = (result) => {
      if (this.gameLoop && this.gameLoop.activeMode === "online") {
        this.handleGrabResult(result);
      }
    };

    this.client.onSnapshotReceived = (snapshot: GhostSnapshot) => {
      if (this.gameLoop && this.gameLoop.activeMode === "online") {
        this.handleSnapshotReceived(snapshot);
      }
    };
  }

  private handleContestedGrabEvents(events: import("../server/ContestedGrabArbiter.js").ContestedGrabResult[]): void {
    if (!this.gameLoop || !Array.isArray(events) || events.length === 0) return;

    for (const ev of events) {
      console.log(`⚡ [OnlineSession] Contested Grab Arbitration Event: Winner=${ev.winnerPlayerId}, Losers=[${ev.loserPlayerIds.join(", ")}], Object=${ev.targetObjectId}, Reason=${ev.reason}`);

      // Identify if any local player on this client machine lost the contest
      for (const p of this.gameLoop.players.values()) {
        const localChar = p.character;
        const matchesLoser = ev.loserPlayerIds.some((loserId) =>
          loserId === p.id ||
          loserId === localChar.playerId ||
          loserId === localChar.serverCharId ||
          (this.client.clientId !== null && (loserId === this.client.clientId || loserId === `${this.client.clientId}:${p.id}`))
        );

        if (matchesLoser) {
          // Explicit authoritative loser notification: immediately drop the object locally if held
          if (localChar.heldObject && localChar.heldObject.id === ev.targetObjectId) {
            const held = localChar.heldObject;
            held.isHeld = false;
            held.heldBy = null;
            held.wakeUp();
            localChar.heldObject = null;
          }
        }

        const matchesWinner =
          ev.winnerPlayerId === p.id ||
          ev.winnerPlayerId === localChar.playerId ||
          ev.winnerPlayerId === localChar.serverCharId ||
          (this.client.clientId !== null && (ev.winnerPlayerId === this.client.clientId || ev.winnerPlayerId === `${this.client.clientId}:${p.id}`));

        if (matchesWinner) {
          // Confirm local possession of winning object
          const targetObj = this.gameLoop.objects.find((o) => o.id === ev.targetObjectId);
          if (targetObj) {
            localChar.heldObject = targetObj;
            targetObj.isHeld = true;
            targetObj.heldBy = localChar;
          }
        }
      }
    }
  }

  private handleGrabResult(data: {
    type?: string;
    targetObjectId: string;
    playerId?: string;
    winnerPlayerId?: string;
    eventId?: string;
    tick?: number;
    loserPlayerId?: string;
    loserPlayerIds?: string[];
    success?: boolean;
  }): void {
    if (!this.gameLoop) return;
    const targetObj = this.gameLoop.objects.find((o) => o.id === data.targetObjectId);
    if (!targetObj) return;

    const winnerId = data.playerId || data.winnerPlayerId;
    if (!winnerId) return;

    // Check if winner is one of our local characters
    let localWinnerChar: Character | null = null;
    for (const p of this.gameLoop.players.values()) {
      const localChar = p.character;
      const isWinner =
        winnerId === p.id ||
        winnerId === localChar.playerId ||
        winnerId === localChar.serverCharId ||
        (this.client.clientId !== null && (winnerId === this.client.clientId || winnerId === `${this.client.clientId}:${p.id}`));
      if (isWinner) {
        localWinnerChar = localChar;
        break;
      }
    }
    if (!localWinnerChar && this.gameLoop.players.size === 0) {
      const baseChar = this.gameLoop.playerManager.baseCharacter;
      if (
        winnerId === "keyboard" ||
        winnerId === baseChar.playerId ||
        winnerId === baseChar.serverCharId ||
        (this.client.clientId !== null && winnerId === this.client.clientId)
      ) {
        localWinnerChar = baseChar;
      }
    }

    if (localWinnerChar) {
      // Local client won the grab contest!
      localWinnerChar.pickupModule?.pickup(localWinnerChar, targetObj);
      localWinnerChar.heldObject = targetObj;
      targetObj.isHeld = true;
      targetObj.heldBy = localWinnerChar;
      const relPos = localWinnerChar.calculateHeldObjectPosition(this.gameLoop.arena);
      targetObj.position.x = relPos.x;
      targetObj.position.y = relPos.y;
      targetObj.position.z = relPos.z;
    } else {
      // Remote player won or local client lost
      for (const p of this.gameLoop.players.values()) {
        if (p.character.heldObject === targetObj) {
          p.character.heldObject = null;
        }
      }
      if (this.gameLoop.playerManager.baseCharacter.heldObject === targetObj) {
        this.gameLoop.playerManager.baseCharacter.heldObject = null;
      }

      // Attach to remote winning character if found
      const remWinner = this.gameLoop.allCharacters.find(
        (c) => c.playerId === winnerId ||
               c.serverCharId === winnerId ||
               c.id === winnerId ||
               (winnerId.includes(":") && c.playerId === winnerId.split(":")[1])
      );
      if (remWinner) {
        remWinner.heldObject = targetObj;
        targetObj.isHeld = true;
        targetObj.heldBy = remWinner;
        const relPos = remWinner.calculateHeldObjectPosition(this.gameLoop.arena);
        targetObj.position.x = relPos.x;
        targetObj.position.y = relPos.y;
        targetObj.position.z = relPos.z;
      }
    }
  }

  private updateStatsUI(stats: OnlineRoomStats): void {
    OnlineHudController.updateStatsUI(this.dom, this.client, this.gameLoop, stats);
  }

  private handleJoined(info: { clientId: string; playerNumber: number; name: string; color: string }): void {
    console.log(`🌐 [OnlineSession] Joined universal room as ${info.name} (P${info.playerNumber}) with color ${info.color}`);
    const wireConsumableConsumed = (c: Character) => {
      (c as any)._onConsumableConsumed = (objId: string) => {
        this.client.unacknowledgedConsumedObjectIds.add(objId);
      };
    };
    if (this.gameLoop?.allCharacters) {
      for (const char of this.gameLoop.allCharacters) {
        (char as any)._isInOnlineMode = true;
        wireConsumableConsumed(char);
      }
    }
    const hero = this.gameLoop?.players.get("keyboard")?.character || this.defaultCharacter;
    const localChosenName = this.client.playerName && this.client.playerName.trim().length > 0
      ? this.client.playerName.trim()
      : (localStorage.getItem("pcg_player_handle") || info.name);

    const hasKeyboardPlayer = Boolean(this.gameLoop?.playerManager?.players.has("keyboard"));
    if (hero) {
      if (hasKeyboardPlayer) {
        hero.playerId = "keyboard";
      }
      hero.playerNumber = info.playerNumber;
      hero.color = info.color;
      hero.playerColor = info.color;
      hero.name = localChosenName;
    }
    if (this.gameLoop?.playerManager?.baseCharacter) {
      const base = this.gameLoop.playerManager.baseCharacter;
      if (hasKeyboardPlayer) {
        base.playerId = "keyboard";
      }
      base.playerNumber = info.playerNumber;
      base.color = info.color;
      base.playerColor = info.color;
      base.name = localChosenName;
    }
    if (this.gameLoop?.playerManager) {
      for (const p of this.gameLoop.playerManager.players.values()) {
        if (p.character === hero || p.id === "keyboard") {
          p.color = info.color;
          p.playerNumber = info.playerNumber;
        }
      }
    }
    if (this.dom.mySlot) {
      this.dom.mySlot.textContent = `P${info.playerNumber} ${info.playerNumber === 1 ? '(Host)' : ''}`;
      this.dom.mySlot.style.color = info.color;
      this.dom.mySlot.style.background = `${info.color}33`;
    }
    if (this.dom.playerBadge) {
      this.dom.playerBadge.textContent = `P${info.playerNumber}`;
      this.dom.playerBadge.style.color = info.color;
      this.dom.playerBadge.style.background = `${info.color}33`;
    }
    if (this.dom.myName) {
      this.dom.myName.textContent = info.name;
    }
  }

  private handlePlayerRegistered(info: { localPlayerId: string; serverCharId: string; playerNumber: number; color: string; name: string; spawnPos?: { x: number; y: number; z?: number } }): void {
    console.log(`🌐 [OnlineSession] Local player ${info.localPlayerId} registered as P${info.playerNumber} (${info.color}, "${info.name}") serverId=${info.serverCharId}`);
    const p = this.gameLoop?.playerManager.players.get(info.localPlayerId);
    const targetChar = p?.character || (info.localPlayerId === "keyboard" ? this.gameLoop?.playerManager.baseCharacter : null);

    if (targetChar) {
      targetChar.playerNumber = info.playerNumber;
      targetChar.color = info.color;
      targetChar.playerColor = info.color;
      targetChar.serverCharId = info.serverCharId;
      if (!targetChar.hasCustomName) {
        targetChar.name = info.name || `Player ${info.playerNumber}`;
      }

      // Authoritative Spawn Positioning (Phase 5):
      // Snap position to server-dictated spawn coordinates and cancel local held objects
      if (info.spawnPos) {
        targetChar.position.x = info.spawnPos.x;
        targetChar.position.y = info.spawnPos.y;
        targetChar.position.z = info.spawnPos.z ?? 0;
        targetChar.velocity.x = 0;
        targetChar.velocity.y = 0;
        if (targetChar.hasVerticalVelocity) {
          targetChar.verticalVelocity = 0;
        }
        targetChar.isActivelyWalking = false;
        targetChar.isSprinting = false;

        // Also ensure primaryCharacter / baseCharacter stay in sync if separate
        if (this.gameLoop?.primaryCharacter && this.gameLoop.primaryCharacter !== targetChar && info.localPlayerId === "keyboard") {
          this.gameLoop.primaryCharacter.position.x = info.spawnPos.x;
          this.gameLoop.primaryCharacter.position.y = info.spawnPos.y;
          this.gameLoop.primaryCharacter.position.z = info.spawnPos.z ?? 0;
          this.gameLoop.primaryCharacter.velocity.x = 0;
          this.gameLoop.primaryCharacter.velocity.y = 0;
        }

        // Local player is now strictly aligned with server-authoritative spawn position!
        this.spawnAlignedPlayerIds.add(info.localPlayerId);
      }

      // Clear any prior interpolator history for this character/id
      this.gameLoop?.interpolator.clearEntity(info.serverCharId);
      this.gameLoop?.interpolator.clearEntity(info.localPlayerId);

      // Release any object falsely carried over from local sandbox
      if (targetChar.heldObject) {
        const held = targetChar.heldObject;
        held.isHeld = false;
        held.heldBy = null;
        held.wakeUp();
        targetChar.heldObject = null;
      }
    }

    if (p) {
      p.color = info.color;
      p.playerNumber = info.playerNumber;
      p.name = p.character.name;
    }
    this.gameLoop?.playerManager.onPlayersChanged?.();
  }

  private handlePlayerLeft(charId: string): void {
    console.log(`🌐 [OnlineSession] Remote player left: ${charId}`);
    this.gameLoop?.playerManager.removeRemoteCharacter(charId);
    this.gameLoop?.interpolator.clearEntity(charId);
    for (const obj of this.gameLoop?.objects || []) {
      if (obj.heldBy && (obj.heldBy as any).playerId === charId) {
        obj.isHeld = false;
        obj.heldBy = null;
        obj.wakeUp();
      }
    }
  }

  private handleSnapshotReceived(snapshot: GhostSnapshot): void {
    if (!this.gameLoop) return;

    // 0. Process authoritative server death & respawn events
    LocalPlayerNetReconciler.processDeathRespawnEvents(
      this.gameLoop,
      this.client,
      this.processedDeathRespawnEventIds,
      snapshot.deathRespawnEvents
    );

    // 1. Sync characters in playerManager
    if (Array.isArray(snapshot.characters)) {
      const activeCharIds = new Set<string>();
      for (const c of snapshot.characters) {
        activeCharIds.add(c.id);
        const isDummy = c.isDummy || c.role === "dummy" || c.id === "dummy-1" || c.controllerType === "none";
        const isLocal = c.id === this.client.clientId || (this.client.clientId !== null && c.id.startsWith(`${this.client.clientId}:`));
        if (isDummy) {
          RemotePlayerNetReconciler.syncDummyCharacter(this.gameLoop, c);
        } else if (!isLocal) {
          RemotePlayerNetReconciler.syncRemoteCharacterState(this.gameLoop, c);
        } else {
          LocalPlayerNetReconciler.reconcileLocalCharacterStats(this.gameLoop, this.client, c);
        }
      }

      // Remove disconnected remote players
      RemotePlayerNetReconciler.pruneDisconnectedRemotePlayers(this.gameLoop, activeCharIds);

      // Update Roster chips UI
      this.updateRosterUI(snapshot.characters);
    }

    // 2. Push snapshot samples to RemoteEntityInterpolator
    const ghostChars = (snapshot.characters && snapshot.characters.length > 0)
      ? snapshot.characters
      : (snapshot.character ? [snapshot.character] : []);
    RemotePlayerNetReconciler.pushInterpolatorSamples(this.gameLoop, this.client, snapshot, ghostChars);

    // 2b. Synchronize external server pushes & impulses on local characters
    LocalPlayerNetReconciler.reconcileLocalCharacterPushes(this.gameLoop, this.client, ghostChars);

    // 3. Process Authoritative Object Deletion Events (e.g. food/apple depleted)
    ConsumableNetReconciler.processObjectDeletionEvents(
      this.gameLoop,
      this.client,
      snapshot.objectDeletionEvents
    );

    // 4. Sync authoritative freebody objects
    if (Array.isArray(snapshot.objects)) {
      this.gameLoop.syncAuthoritativeObjects(snapshot.objects, this.client.clientId || undefined, snapshot.seq);
    }

    // 5. Ensure physics & telemetry continue stepping at 60Hz via WebSocket I/O even if window is unfocused or minimized
    this.gameLoop.stepIfBackgrounded(performance.now());
  }

  private updateRosterUI(characters: any[]): void {
    OnlineHudController.updateRosterUI(this.dom, this.client, this.gameLoop, characters);
  }
}
