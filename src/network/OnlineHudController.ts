import type { OnlineRoomClient, OnlineRoomStats } from "./OnlineRoomClient.js";
import type { GameLoop } from "../engine/GameLoop.js";
import { PLAYER_COLORS } from "../engine/PlayerManager.js";
import type { OnlineSessionDOMElements } from "./OnlineSessionManager.js";

/**
 * Isolated DOM HUD Controller for Online Session status badges, ping pills, and player roster chips.
 */
export class OnlineHudController {
  public static updateStatsUI(
    dom: OnlineSessionDOMElements,
    client: OnlineRoomClient,
    gameLoop: GameLoop | null,
    stats: OnlineRoomStats
  ): void {
    if (dom.badgeStatus) {
      dom.badgeStatus.textContent = stats.status;
      dom.badgeStatus.className = `relay-badge-status ${stats.status}`;
    }
    if (dom.connectBtn) {
      dom.connectBtn.textContent = stats.status === "connected" ? "Disconnect" : "Connect";
    }
    const dot = dom.statusPill?.querySelector(".status-dot");
    if (dot) {
      dot.className = `status-dot ${stats.status}`;
    }
    if (dom.pingDisplay) {
      dom.pingDisplay.textContent = stats.status === "connected" ? `${stats.pingMs} ms` : stats.status;
    }
    const assignedColor = stats.color || client.assignedColor || PLAYER_COLORS[0];
    if (dom.playerBadge) {
      dom.playerBadge.textContent = `P${stats.playerNumber}`;
      dom.playerBadge.style.color = assignedColor;
      dom.playerBadge.style.background = `${assignedColor}33`;
    }
    if (dom.nameDisplay) {
      dom.nameDisplay.textContent = stats.playerName;
    }
    if (dom.myName) {
      dom.myName.textContent = stats.playerName;
    }
    if (dom.mySlot) {
      dom.mySlot.textContent = `P${stats.playerNumber} ${stats.playerNumber === 1 ? "(Host)" : ""}`;
      dom.mySlot.style.color = assignedColor;
      dom.mySlot.style.background = `${assignedColor}33`;
    }
    if (dom.rttCurrent) {
      dom.rttCurrent.textContent = stats.status === "connected" ? `${stats.pingMs} ms` : "-- ms";
      if (stats.pingMs < 70) dom.rttCurrent.style.color = "#22c55e";
      else if (stats.pingMs < 140) dom.rttCurrent.style.color = "#f59e0b";
      else dom.rttCurrent.style.color = "#ef4444";
    }

    if (dom.persistentPingVal) {
      dom.persistentPingVal.textContent = stats.status === "connected" ? `${stats.pingMs} ms` : stats.status;
      if (stats.pingMs < 70) dom.persistentPingVal.style.color = "#22c55e";
      else if (stats.pingMs < 140) dom.persistentPingVal.style.color = "#f59e0b";
      else dom.persistentPingVal.style.color = "#ef4444";
    }
    if (dom.persistentPingHud && gameLoop && gameLoop.activeMode === "online") {
      dom.persistentPingHud.classList.remove("hidden");
    }

    if (dom.playersCount) {
      dom.playersCount.textContent = `${stats.playerCount} Connected`;
    }

    if (stats.status === "disconnected" || stats.status === "error") {
      if (gameLoop?.allCharacters) {
        for (const char of gameLoop.allCharacters) {
          (char as any)._isInOnlineMode = false;
        }
      }
      gameLoop?.playerManager.clearRemoteCharacters();
      gameLoop?.interpolator.clearAll();
      for (const obj of gameLoop?.objects || []) {
        if (
          obj.heldBy &&
          (obj.heldBy as any).playerId &&
          (obj.heldBy as any).playerId !== "keyboard" &&
          !gameLoop?.players.has((obj.heldBy as any).playerId)
        ) {
          obj.isHeld = false;
          obj.heldBy = null;
          obj.wakeUp();
        }
      }
      if (dom.rosterList) {
        dom.rosterList.innerHTML = `<span style="color: #64748b; font-size: 0.78rem;">Not connected</span>`;
      }
      if (dom.playersCount) {
        dom.playersCount.textContent = `0 Connected`;
      }
    }
  }

  public static updateRosterUI(
    dom: OnlineSessionDOMElements,
    client: OnlineRoomClient,
    gameLoop: GameLoop | null,
    characters: any[]
  ): void {
    if (!dom.rosterList || !gameLoop) return;
    dom.rosterList.innerHTML = "";

    for (const c of characters) {
      if (c.isDummy || c.role === "dummy" || c.id === "dummy-1" || c.controllerType === "none") {
        continue;
      }
      const isMe =
        c.id === client.clientId ||
        (client.clientId !== null && c.id.startsWith(`${client.clientId}:`));
      const chipColor =
        c.playerColor || c.color || (isMe ? client.assignedColor : "#38bdf8") || "#38bdf8";
      const chip = document.createElement("div");
      chip.style.cssText = `display: flex; align-items: center; gap: 6px; background: rgba(15, 23, 42, 0.85); border: 1px solid ${
        isMe ? `${chipColor}bb` : "rgba(148, 163, 184, 0.25)"
      }; padding: 3px 8px; border-radius: 999px; font-size: 0.76rem; font-weight: 600;`;

      let displayName = c.name || `Player ${c.playerNumber || 1}`;
      if (isMe) {
        const localPlayerId = c.id.includes(":") ? c.id.split(":")[1] : "keyboard";
        const p = gameLoop.players.get(localPlayerId);
        const localChar =
          p?.character ||
          (localPlayerId === "keyboard"
            ? gameLoop.players.get("keyboard")?.character || gameLoop.playerManager.baseCharacter
            : null);
        if (localChar?.hasCustomName && localChar?.name) {
          displayName = localChar.name;
        } else if (
          localPlayerId === "keyboard" &&
          client.hasCustomName &&
          client.playerName
        ) {
          displayName = client.playerName;
        }
      }
      chip.innerHTML = `
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${chipColor}; box-shadow: 0 0 6px ${chipColor};"></span>
        <span style="color: ${isMe ? chipColor : "#f1f5f9"}; font-weight: ${
        isMe ? "700" : "600"
      };">${displayName} ${isMe ? "(You)" : ""}</span>
      `;
      dom.rosterList.appendChild(chip);
    }
  }
}
