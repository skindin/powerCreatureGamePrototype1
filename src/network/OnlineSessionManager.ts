import { OnlineRoomClient, type OnlineRoomStats } from "./OnlineRoomClient.js";
import type { GameLoop } from "../engine/GameLoop.js";
import type { Character } from "../character/Character.js";
import type { PlayerInputPacket } from "../engine/physics/StateHistoryBuffer.js";
import type { GhostSnapshot } from "./RelayClient.js";
import { PLAYER_COLORS } from "../engine/PlayerManager.js";

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
 * - Manages HUD & UI roster updates on network telemetry events
 * - Streams multi-character telemetry on 60Hz physics ticks
 * - Synchronizes authoritative server snapshots into interpolator and world state
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
    if (this.dom.badgeStatus) {
      this.dom.badgeStatus.textContent = stats.status;
      this.dom.badgeStatus.className = `relay-badge-status ${stats.status}`;
    }
    if (this.dom.connectBtn) {
      this.dom.connectBtn.textContent = stats.status === "connected" ? "Disconnect" : "Connect";
    }
    const dot = this.dom.statusPill?.querySelector(".status-dot");
    if (dot) {
      dot.className = `status-dot ${stats.status}`;
    }
    if (this.dom.pingDisplay) {
      this.dom.pingDisplay.textContent = stats.status === "connected" ? `${stats.pingMs} ms` : stats.status;
    }
    const assignedColor = stats.color || this.client.assignedColor || PLAYER_COLORS[0];
    if (this.dom.playerBadge) {
      this.dom.playerBadge.textContent = `P${stats.playerNumber}`;
      this.dom.playerBadge.style.color = assignedColor;
      this.dom.playerBadge.style.background = `${assignedColor}33`;
    }
    if (this.dom.nameDisplay) {
      this.dom.nameDisplay.textContent = stats.playerName;
    }
    if (this.dom.myName) {
      this.dom.myName.textContent = stats.playerName;
    }
    if (this.dom.mySlot) {
      this.dom.mySlot.textContent = `P${stats.playerNumber} ${stats.playerNumber === 1 ? '(Host)' : ''}`;
      this.dom.mySlot.style.color = assignedColor;
      this.dom.mySlot.style.background = `${assignedColor}33`;
    }
    if (this.dom.rttCurrent) {
      this.dom.rttCurrent.textContent = stats.status === "connected" ? `${stats.pingMs} ms` : "-- ms";
      if (stats.pingMs < 70) this.dom.rttCurrent.style.color = "#22c55e";
      else if (stats.pingMs < 140) this.dom.rttCurrent.style.color = "#f59e0b";
      else this.dom.rttCurrent.style.color = "#ef4444";
    }

    // Persistent Top-Left Ping HUD (Always visible in online mode even when top bar / menus are hidden)
    if (this.dom.persistentPingVal) {
      this.dom.persistentPingVal.textContent = stats.status === "connected" ? `${stats.pingMs} ms` : stats.status;
      if (stats.pingMs < 70) this.dom.persistentPingVal.style.color = "#22c55e";
      else if (stats.pingMs < 140) this.dom.persistentPingVal.style.color = "#f59e0b";
      else this.dom.persistentPingVal.style.color = "#ef4444";
    }
    if (this.dom.persistentPingHud && this.gameLoop && this.gameLoop.activeMode === "online") {
      this.dom.persistentPingHud.classList.remove("hidden");
    }

    if (this.dom.playersCount) {
      this.dom.playersCount.textContent = `${stats.playerCount} Connected`;
    }

    if (stats.status === "disconnected" || stats.status === "error") {
      if (this.gameLoop?.allCharacters) {
        for (const char of this.gameLoop.allCharacters) {
          (char as any)._isInOnlineMode = false;
        }
      }
      this.gameLoop?.playerManager.clearRemoteCharacters();
      this.gameLoop?.interpolator.clearAll();
      for (const obj of this.gameLoop?.objects || []) {
        if (obj.heldBy && (obj.heldBy as any).playerId && (obj.heldBy as any).playerId !== "keyboard" && !this.gameLoop?.players.has((obj.heldBy as any).playerId)) {
          obj.isHeld = false;
          obj.heldBy = null;
          obj.wakeUp();
        }
      }
      if (this.dom.rosterList) {
        this.dom.rosterList.innerHTML = `<span style="color: #64748b; font-size: 0.78rem;">Not connected</span>`;
      }
      if (this.dom.playersCount) {
        this.dom.playersCount.textContent = `0 Connected`;
      }
    }
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

    // Process authoritative server death & respawn events
    if (snapshot.deathRespawnEvents && Array.isArray(snapshot.deathRespawnEvents)) {
      for (const ev of snapshot.deathRespawnEvents) {
        // Immediately queue acknowledgment back to server so it knows client received it
        this.client.acknowledgeDeathRespawn(ev.eventId);

        // Deduplicate: only execute dieAndRespawn once per event ID!
        if (this.processedDeathRespawnEventIds.has(ev.eventId)) {
          continue;
        }
        this.processedDeathRespawnEventIds.add(ev.eventId);
        if (this.processedDeathRespawnEventIds.size > 200) {
          const first = this.processedDeathRespawnEventIds.values().next().value;
          if (first) this.processedDeathRespawnEventIds.delete(first);
        }

        // Robust match for local character, serverCharId, playerId, or dummy
        let targetChar = this.gameLoop.allCharacters.find(
          (c) => c.id === ev.targetEntityId ||
                 c.serverCharId === ev.targetEntityId ||
                 c.playerId === ev.targetEntityId ||
                 (c.isDummy && ev.targetEntityId === "dummy-1")
        ) || Array.from(this.gameLoop.players.values()).find(
          (p) => p.character.serverCharId === ev.targetEntityId ||
                 p.id === ev.targetEntityId ||
                 p.character.id === ev.targetEntityId ||
                 p.character.playerId === ev.targetEntityId
        )?.character;

        if (!targetChar && this.gameLoop.primaryCharacter) {
          targetChar = this.gameLoop.primaryCharacter;
        }

        if (targetChar) {
          console.log(`💀 [OnlineSession] Processing authoritative death & respawn for ${targetChar.id || targetChar.name} to (${ev.respawnX}, ${ev.respawnY}, ${ev.respawnZ})`);
          targetChar.dieAndRespawn(this.gameLoop.arena, {
            x: ev.respawnX,
            y: ev.respawnY,
            z: ev.respawnZ
          });
          if (this.gameLoop.primaryCharacter && this.gameLoop.primaryCharacter !== targetChar) {
            this.gameLoop.primaryCharacter.resetDynamicValues();
          }
          targetChar.velocity.x = 0;
          targetChar.velocity.y = 0;
          if (targetChar.hasVerticalVelocity) {
            targetChar.verticalVelocity = 0;
          }
          targetChar.supportingSurfaceHeight = ev.respawnZ ?? 0;

          if (targetChar.playerId) {
            this.gameLoop.interpolator.clearEntity(targetChar.playerId);
          }
          if (targetChar.serverCharId) {
            this.gameLoop.interpolator.clearEntity(targetChar.serverCharId);
          }
          this.gameLoop.interpolator.clearEntity(targetChar.id);
          this.gameLoop.historyBuffer.clear();

          // Now that client has snapped to the respawn position, queue the acknowledgment back to server
          this.client.acknowledgeDeathRespawn(ev.eventId);
        }
      }
    }

    // 1. Sync characters in playerManager
    if (Array.isArray(snapshot.characters)) {
      const activeCharIds = new Set<string>();
      for (const c of snapshot.characters) {
        activeCharIds.add(c.id);
        const isDummy = c.isDummy || c.role === "dummy" || c.id === "dummy-1" || c.controllerType === "none";
        const isLocal = c.id === this.client.clientId || (this.client.clientId !== null && c.id.startsWith(`${this.client.clientId}:`));
        if (isDummy) {
          // Dummy character is an inert physical combat entity; sync position, velocity, and HP from server
          const dummy = this.gameLoop.playerManager.dummyCharacters.find((d) => d.id === c.id || d.id === "dummy-1")
            || this.gameLoop.allCharacters.find((ac) => ac.id === c.id || ac.id === "dummy-1");
          if (dummy) {
            if (c.currentHp !== undefined && dummy.healthModule) {
              dummy.healthModule.currentHpProp.set(c.currentHp, dummy.properties);
            }
            if (c.maxHp !== undefined && dummy.healthModule) {
              dummy.healthModule.maxHpProp.set(c.maxHp, dummy.properties);
            }

            // Sync physical coordinates and velocities
            if (c.x !== undefined && c.y !== undefined) {
              const dx = c.x - dummy.position.x;
              const dy = c.y - dummy.position.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 3.0) {
                // Hard snap on large divergence
                dummy.position.x = c.x;
                dummy.position.y = c.y;
                dummy.position.z = c.z ?? dummy.position.z;
                dummy.velocity.x = c.vx ?? 0;
                dummy.velocity.y = c.vy ?? 0;
              } else if (dist > 0.02) {
                // Smooth convergence blend
                const blend = 0.35;
                dummy.position.x += dx * blend;
                dummy.position.y += dy * blend;
                if (c.z !== undefined) {
                  dummy.position.z += (c.z - dummy.position.z) * blend;
                }
                if (c.vx !== undefined) dummy.velocity.x += (c.vx - dummy.velocity.x) * blend;
                if (c.vy !== undefined) dummy.velocity.y += (c.vy - dummy.velocity.y) * blend;
              }
              if (c.facingAngle !== undefined) {
                dummy.facingAngle = c.facingAngle;
              }
            }
          }
        } else if (!isLocal) {
          this.gameLoop.playerManager.syncRemoteCharacter(c);
          const remChar = this.gameLoop.playerManager.remotePlayers.get(c.id);
          if (remChar) {
            if (c.name && remChar.name !== c.name) {
              remChar.name = c.name;
            }
            if (c.controllerType) {
              remChar.controllerType = c.controllerType;
            }
            if (c.isUsingItem !== undefined) {
              remChar.isUsingItem = Boolean(c.isUsingItem);
            }
            if (c.currentHp !== undefined && remChar.healthModule) {
              remChar.healthModule.currentHpProp.set(c.currentHp, remChar.properties);
            }
            if (c.maxHp !== undefined && remChar.healthModule) {
              remChar.healthModule.maxHpProp.set(c.maxHp, remChar.properties);
            }
            // Sync Laser state on remote character
            if (remChar.laserModule) {
              remChar.isLaserAiming = Boolean(c.isLaserAiming);
              remChar.isLaserFiring = Boolean(c.isLaserFiring);
              remChar.laserModule.isAiming = Boolean(c.isLaserAiming);
              remChar.laserModule.isFiring = Boolean(c.isLaserFiring);
              if (c.laserAimX !== undefined && c.laserAimY !== undefined) {
                remChar.laserAimTarget = { x: c.laserAimX, y: c.laserAimY };
                remChar.laserModule.currentEndpoint = { x: c.laserAimX, y: c.laserAimY, z: remChar.position.z };
              }
              if (c.laserPowerFraction !== undefined) {
                remChar.laserPowerFraction = c.laserPowerFraction;
              }
            }
            // Sync Melee visual strike on remote character
            if (remChar.meleeModule && c.lastVisualPunchTime !== undefined) {
              if (c.lastVisualPunchTime > remChar.meleeModule.lastVisualPunchTime) {
                remChar.meleeModule.lastVisualPunchTime = c.lastVisualPunchTime;
                if (c.visualPunchDirX !== undefined && c.visualPunchDirY !== undefined) {
                  remChar.meleeModule.lastVisualPunchDir = { x: c.visualPunchDirX, y: c.visualPunchDirY };
                }
              }
            }
            // Remote character energy, stamina, and wattage are private to that client and not updated on remote entities
            if (c.heldObjectId) {
              const targetObj = this.gameLoop.objects.find((o) => o.id === c.heldObjectId);
              if (targetObj) {
                // If local character was mistakenly holding this object, release it immediately!
                for (const p of this.gameLoop.players.values()) {
                  if (p.character.heldObject === targetObj) {
                    p.character.heldObject = null;
                  }
                }
                if (this.gameLoop.playerManager.baseCharacter.heldObject === targetObj) {
                  this.gameLoop.playerManager.baseCharacter.heldObject = null;
                }
                remChar.heldObject = targetObj;
                targetObj.isHeld = true;
                targetObj.heldBy = remChar;
              }
            }
            // Note: If c.heldObjectId is absent, do NOT prematurely null remChar.heldObject here!
            // GameLoop.syncAuthoritativeObjects() needs to detect that remChar was holding it so
            // it can execute the instantaneous throw hand-off and apply ballistic launch physics.
          }
        } else {
          // Local client character! Ensure authoritative server-assigned color, number, name and HP are preserved
          const localPlayerId = c.id.includes(":") ? c.id.split(":")[1] : "keyboard";
          const p = this.gameLoop.players.get(localPlayerId);
          const localChar = p?.character || (localPlayerId === "keyboard" ? (this.gameLoop.players.get("keyboard")?.character || this.gameLoop.playerManager.baseCharacter) : null);
          if (localChar) {
            // Local client trusts its own predicted health, energy, and stamina, but softly reconciles if server diverges or applies damage
            if (c.currentHp !== undefined && localChar.healthModule) {
              const curHp = localChar.healthModule.getCurrentHp(localChar.properties);
              if (c.currentHp < curHp || Math.abs(curHp - c.currentHp) > 15.0) {
                const wasDeadOrZero = curHp <= 0.0001;
                localChar.healthModule.currentHpProp.set(c.currentHp, localChar.properties);
                // If server restored HP from 0 (respawn occurred), reset energy and stamina
                if (wasDeadOrZero && c.currentHp > 10.0) {
                  localChar.resetDynamicValues();
                }
                // If authoritative damage was taken and server reports knockback impulse:
                if (c.currentHp < curHp && c.vx !== undefined && c.vy !== undefined) {
                  const serverSpeed = Math.hypot(c.vx, c.vy);
                  if (serverSpeed > 1.5) {
                    localChar.velocity.x = c.vx;
                    localChar.velocity.y = c.vy;
                    localChar.applyKnockbackWindow(800);
                  }
                }
              }
            }
            if (c.maxHp !== undefined && localChar.healthModule) {
              localChar.healthModule.maxHpProp.set(c.maxHp, localChar.properties);
            }
            if (c.currentEnergyJoules !== undefined && localChar.energyPool) {
              const curEnergy = localChar.energyPool.getCurrentEnergy(localChar.properties);
              const isActivelyEating = Boolean(localChar.isUsingItem && localChar.canConsumeHeldObject());
              // If actively eating locally, the server's snapshots are delayed by network RTT.
              // Never roll back local energy to a lower trailing value while eating,
              // and only softly reconcile forward if server is substantially ahead (> 200 Joules).
              if (isActivelyEating) {
                if (c.currentEnergyJoules - curEnergy > 200.0) {
                  localChar.energyPool.currentEnergyProp.literalValue = c.currentEnergyJoules;
                }
              } else if (Math.abs(curEnergy - c.currentEnergyJoules) > 200.0) {
                localChar.energyPool.currentEnergyProp.literalValue = c.currentEnergyJoules;
              }
            }
            if (c.isExhausted !== undefined && localChar.energyPool) {
              localChar.energyPool.isExhausted = c.isExhausted;
            }
            const mainBus = localChar.getEnergyBus("bus_main") || localChar.energyBusses.values().next().value;
            if (mainBus && c.currentStaminaSeconds !== undefined) {
              const curStam = mainBus.getCurrentStamina(localChar.properties);
              if (Math.abs(curStam - c.currentStaminaSeconds) > 2.0) {
                mainBus.setCurrentStamina(c.currentStaminaSeconds, localChar.properties);
              }
            }
            const authoritativeColor = c.playerColor || c.color || (p ? p.color : this.client.assignedColor);
            if (authoritativeColor && (localChar.color !== authoritativeColor || localChar.playerColor !== authoritativeColor)) {
              localChar.color = authoritativeColor;
              localChar.playerColor = authoritativeColor;
              if (p) p.color = authoritativeColor;
            }
            if (c.playerNumber !== undefined && localChar.playerNumber !== c.playerNumber) {
              localChar.playerNumber = c.playerNumber;
              if (p) p.playerNumber = c.playerNumber;
            }
            if (!localChar.hasCustomName) {
              const authoritativeName = c.name || `Player ${localChar.playerNumber || 1}`;
              localChar.name = authoritativeName;
              if (p) p.name = authoritativeName;
            }
          }
        }
      }

      // Remove disconnected remote players
      for (const remId of this.gameLoop.playerManager.remotePlayers.keys()) {
        if (!activeCharIds.has(remId)) {
          this.gameLoop.playerManager.removeRemoteCharacter(remId);
          this.gameLoop.interpolator.clearEntity(remId);
          for (const obj of this.gameLoop.objects) {
            if (obj.heldBy && (obj.heldBy as any).playerId === remId) {
              obj.isHeld = false;
              obj.heldBy = null;
              obj.wakeUp();
            }
          }
        }
      }

      // Update Roster chips UI
      this.updateRosterUI(snapshot.characters);
    }

    // 2. Push snapshot samples to RemoteEntityInterpolator
    const samples: any[] = [];
    const ghostChars = (snapshot.characters && snapshot.characters.length > 0)
      ? snapshot.characters
      : (snapshot.character ? [snapshot.character] : []);

    for (const gc of ghostChars) {
      samples.push({
        id: gc.id,
        x: gc.x,
        y: gc.y,
        z: gc.z,
        vx: gc.vx,
        vy: gc.vy,
        vz: gc.vz || 0,
        facingAngle: gc.facingAngle ?? 0,
        isClimbing: gc.isClimbing,
        isAboveWalls: gc.isAboveWalls,
        isGrounded: gc.isGrounded,
        surfaceZ: gc.surfaceZ,
        heldObjectId: gc.heldObjectId || (gc.isHolding ? "held" : null),
        heldBy: gc.heldBy,
        color: gc.color,
        radius: gc.radius,
      });
    }

    // Dynamic latency-adaptive interpolation delay:
    // If the player has high ping, adapt interpDelayMs so buffered snapshots never starve into extrapolation stalls.
    if (this.client.pingMs > 0) {
      this.gameLoop.interpolator.interpDelayMs = Math.max(60, Math.min(250, Math.round(this.client.pingMs * 0.75)));
    }

    this.gameLoop.interpolator.pushSnapshot(snapshot.seq, samples, performance.now());

    // 2b. Synchronize external server pushes & impulses on local characters
    const allLocalChars: Array<{ char: Character; serverId: string }> = [];
    if (this.gameLoop.playerManager) {
      for (const p of this.gameLoop.playerManager.players.values()) {
        const sid = p.character.serverCharId || (p.id === "keyboard" ? (this.client.clientId || "keyboard") : `${this.client.clientId}:${p.id}`);
        allLocalChars.push({ char: p.character, serverId: sid });
      }
    }
    if (allLocalChars.length === 0 && this.gameLoop.primaryCharacter) {
      const localChar = this.gameLoop.primaryCharacter;
      const localServerId = localChar.serverCharId || this.client.clientId || "keyboard";
      allLocalChars.push({ char: localChar, serverId: localServerId });
    }

    for (const { char: localChar, serverId: localServerId } of allLocalChars) {
      const myServerState = ghostChars.find((gc) => gc.id === localServerId);
      if (myServerState) {
        // Local character position is dictated authoritatively by local simulation.
        // We do NOT pull or blend the local player's position toward the delayed server ghost,
        // which completely eliminates position fighting, rubberbanding, and movement slowdowns.
        // Only adopt extreme server teleports (> 6.0u) if needed (e.g. map reset / out of bounds).
        const dx = myServerState.x - localChar.position.x;
        const dy = myServerState.y - localChar.position.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 6.0) {
          localChar.position.x = myServerState.x;
          localChar.position.y = myServerState.y;
          if (myServerState.z !== undefined) {
            localChar.position.z = myServerState.z;
          }
          localChar.velocity.x = myServerState.vx ?? 0;
          localChar.velocity.y = myServerState.vy ?? 0;
        } else {
          // Massive external impulse from a tackle/explosion while local was near rest:
          const localSpeed = Math.hypot(localChar.velocity.x, localChar.velocity.y);
          const serverSpeed = Math.hypot(myServerState.vx, myServerState.vy);
          if (serverSpeed > 8.0 && localSpeed < 2.0) {
            localChar.velocity.x = myServerState.vx;
            localChar.velocity.y = myServerState.vy;
            localChar.applyKnockbackWindow(800);
          }
        }
      }
    }

    // 3. Process Authoritative Object Deletion Events (e.g. food/apple depleted)
    if (Array.isArray(snapshot.objectDeletionEvents) && snapshot.objectDeletionEvents.length > 0) {
      for (const del of snapshot.objectDeletionEvents) {
        const objId = del.objectId;
        this.gameLoop.deletedConsumableIds.add(objId);

        // Acknowledge priority deletion event back to server
        this.client.unacknowledgedObjectDeletionAcks.add(del.eventId);

        // Unconditionally delete object from gameLoop and arena
        const idx = this.gameLoop.objects.findIndex((o) => o.id === objId);
        if (idx !== -1) {
          const targetObj = this.gameLoop.objects[idx];
          if (targetObj.heldBy && (targetObj.heldBy as Character).heldObject === targetObj) {
            (targetObj.heldBy as Character).heldObject = null;
          }
          targetObj.isHeld = false;
          targetObj.heldBy = null;
          this.gameLoop.objects.splice(idx, 1);
        }
        for (const p of this.gameLoop.players.values()) {
          if (p.character.heldObject && p.character.heldObject.id === objId) {
            p.character.heldObject = null;
          }
        }
        for (const c of this.gameLoop.allCharacters) {
          if (c.heldObject && c.heldObject.id === objId) {
            c.heldObject = null;
          }
        }
        if (Array.isArray((this.gameLoop.arena as any).entities)) {
          const eIdx = (this.gameLoop.arena as any).entities.findIndex((e: any) => e.id === objId);
          if (eIdx !== -1) {
            (this.gameLoop.arena as any).entities.splice(eIdx, 1);
          }
        }
      }
    }

    // 4. Sync authoritative freebody objects
    if (Array.isArray(snapshot.objects)) {
      this.gameLoop.syncAuthoritativeObjects(snapshot.objects, this.client.clientId || undefined, snapshot.seq);
    }
  }

  private updateRosterUI(characters: any[]): void {
    if (!this.dom.rosterList || !this.gameLoop) return;
    this.dom.rosterList.innerHTML = "";

    for (const c of characters) {
      if (c.isDummy || c.role === "dummy" || c.id === "dummy-1" || c.controllerType === "none") {
        continue;
      }
      const isMe = c.id === this.client.clientId || (this.client.clientId !== null && c.id.startsWith(`${this.client.clientId}:`));
      const chipColor = c.playerColor || c.color || (isMe ? this.client.assignedColor : '#38bdf8') || '#38bdf8';
      const chip = document.createElement("div");
      chip.style.cssText = `display: flex; align-items: center; gap: 6px; background: rgba(15, 23, 42, 0.85); border: 1px solid ${isMe ? `${chipColor}bb` : 'rgba(148, 163, 184, 0.25)'}; padding: 3px 8px; border-radius: 999px; font-size: 0.76rem; font-weight: 600;`;

      let displayName = c.name || `Player ${c.playerNumber || 1}`;
      if (isMe) {
        const localPlayerId = c.id.includes(":") ? c.id.split(":")[1] : "keyboard";
        const p = this.gameLoop.players.get(localPlayerId);
        const localChar = p?.character || (localPlayerId === "keyboard" ? (this.gameLoop.players.get("keyboard")?.character || this.gameLoop.playerManager.baseCharacter) : null);
        if (localChar?.hasCustomName && localChar?.name) {
          displayName = localChar.name;
        } else if (localPlayerId === "keyboard" && this.client.hasCustomName && this.client.playerName) {
          displayName = this.client.playerName;
        }
      }
      chip.innerHTML = `
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${chipColor}; box-shadow: 0 0 6px ${chipColor};"></span>
        <span style="color: ${isMe ? chipColor : '#f1f5f9'}; font-weight: ${isMe ? '700' : '600'};">${displayName} ${isMe ? '(You)' : ''}</span>
      `;
      this.dom.rosterList.appendChild(chip);
    }
  }
}
