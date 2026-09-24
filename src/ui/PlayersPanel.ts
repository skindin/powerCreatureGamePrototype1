import type { GameLoop } from "../engine/GameLoop.js";
import type { InputManager } from "./InputManager.js";

export class PlayersPanel {
  private panelElement: HTMLElement | null;
  private toggleButton: HTMLElement | null;
  private quickButton: HTMLElement | null;
  private closeButton: HTMLElement | null;
  private activeListElement: HTMLElement | null;
  private inactiveListElement: HTMLElement | null;
  private badgeTextElement: HTMLElement | null;
  private headerCountElement: HTMLElement | null;

  private gameLoop: GameLoop;
  private inputManager: InputManager;
  public isOpen = false;

  constructor(gameLoop: GameLoop, inputManager: InputManager) {
    this.gameLoop = gameLoop;
    this.inputManager = inputManager;

    this.panelElement = document.getElementById("players-panel");
    this.toggleButton = document.getElementById("toggle-players-btn");
    this.quickButton = document.getElementById("btn-quick-players");
    this.closeButton = document.getElementById("btn-close-players-panel");
    this.activeListElement = document.getElementById("active-players-list");
    this.inactiveListElement = document.getElementById("inactive-players-list");
    this.badgeTextElement = document.getElementById("players-badge-text");
    this.headerCountElement = document.getElementById("players-header-count");

    this.setupListeners();
    this.updateUI();

    // Hook into gameLoop players changes
    const prevPlayersChanged = this.gameLoop.onPlayersChanged;
    this.gameLoop.onPlayersChanged = () => {
      prevPlayersChanged?.();
      this.updateUI();
    };

    const prevGamepadStatusChange = this.inputManager.onGamepadStatusChange;
    this.inputManager.onGamepadStatusChange = (conn, name) => {
      prevGamepadStatusChange?.(conn, name);
      this.updateUI();
    };
  }

  private setupListeners(): void {
    const toggle = () => this.toggle();

    this.toggleButton?.addEventListener("click", toggle);
    this.quickButton?.addEventListener("click", toggle);
    this.closeButton?.addEventListener("click", () => this.close());

    // Keyboard hotkey 'P' to toggle players panel
    window.addEventListener("keydown", (e) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        Boolean((e.target as HTMLElement)?.isContentEditable)
      ) return;
      if (e.code === "KeyP") {
        e.preventDefault();
        this.toggle();
      } else if (e.code === "Escape" && this.isOpen) {
        this.close();
      }
    });

    // Close on background click outside card
    this.panelElement?.addEventListener("click", (e) => {
      if (e.target === this.panelElement) {
        this.close();
      }
    });
  }

  public open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.panelElement?.classList.remove("hidden");
    this.toggleButton?.classList.add("active");
    this.updateUI();
  }

  public close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.panelElement?.classList.add("hidden");
    this.toggleButton?.classList.remove("active");
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public updateUI(): void {
    const activePlayers = Array.from(this.gameLoop.players.values());
    const count = activePlayers.length;

    // 1. Update Header badge and button texts
    if (this.badgeTextElement) {
      this.badgeTextElement.textContent = `Players (${count})`;
    }
    const countPill = document.getElementById("players-count-pill");
    if (countPill) {
      countPill.textContent = count.toString();
    }
    if (this.quickButton) {
      this.quickButton.textContent = `👥 ${count} PLAYER${count === 1 ? "" : "S"}`;
      this.quickButton.classList.toggle("has-players", count > 0);
    }
    if (this.headerCountElement) {
      this.headerCountElement.textContent = `${count} Active`;
    }

    // 2. Render Active Players list
    if (this.activeListElement) {
      if (count === 0) {
        this.activeListElement.innerHTML = `
          <div class="player-empty-state">
            <p>No controllers or keyboard connected.</p>
            <p class="sub-hint">Press <kbd>Space</kbd> for Keyboard or <kbd>A</kbd> on any controller to jump in!</p>
          </div>
        `;
      } else {
        this.activeListElement.innerHTML = activePlayers
          .map((p) => {
            const isHolding = p.character.heldObject !== null;
            const holdingTag = isHolding ? `<span class="player-holding-pill">Holding Object</span>` : "";
            return `
              <div class="player-card" style="--player-accent: ${p.color}; border-left-color: ${p.color};">
                <div class="player-card-left">
                  <span class="player-color-swatch" style="background: ${p.color}; box-shadow: 0 0 10px ${p.color}88;">P${p.playerNumber}</span>
                  <div class="player-meta-col">
                    <div class="player-title-row">
                      <span class="player-name-text">Player ${p.playerNumber}</span>
                      <span class="player-color-label" style="color: ${p.color};">●</span>
                      ${holdingTag}
                    </div>
                    <div class="player-device-text">${escapeHtml(p.name)}</div>
                  </div>
                </div>
                <button class="btn-remove-player" data-player-id="${p.id}" title="Disconnect this player device">
                  ✕ Remove
                </button>
              </div>
            `;
          })
          .join("");

        // Wire remove buttons
        const removeButtons = this.activeListElement.querySelectorAll<HTMLButtonElement>(".btn-remove-player");
        removeButtons.forEach((btn) => {
          btn.addEventListener("click", () => {
            const playerId = btn.getAttribute("data-player-id");
            if (playerId) {
              this.gameLoop.removePlayer(playerId);
              this.updateUI();
            }
          });
        });
      }
    }

    // 3. Render Inactive / Available Slots list
    if (this.inactiveListElement) {
      const inactiveItems: string[] = [];

      // Keyboard option if removed
      if (!this.inputManager.isKeyboardActive || !this.gameLoop.players.has("keyboard")) {
        inactiveItems.push(`
          <div class="player-card inactive">
            <div class="player-card-left">
              <span class="player-color-swatch inactive">⌨️</span>
              <div class="player-meta-col">
                <div class="player-title-row">
                  <span class="player-name-text">Keyboard & Mouse</span>
                  <span class="player-inactive-badge">Available</span>
                </div>
                <div class="player-device-text">Press <kbd>Space</kbd> or click Add to spawn character</div>
              </div>
            </div>
            <button class="btn-join-player" data-join-type="keyboard">
              + Add
            </button>
          </div>
        `);
      }

      // Check each connected controller
      for (const slot of this.inputManager.gamepadSlots.values()) {
        if (slot.connected && !this.gameLoop.players.has(`gamepad-${slot.index}`)) {
          inactiveItems.push(`
            <div class="player-card inactive">
              <div class="player-card-left">
                <span class="player-color-swatch inactive">🎮</span>
                <div class="player-meta-col">
                  <div class="player-title-row">
                    <span class="player-name-text">Controller #${slot.index + 1}</span>
                    <span class="player-inactive-badge">Ready</span>
                  </div>
                  <div class="player-device-text">${escapeHtml(slot.id)} — Press <kbd>A</kbd> on controller</div>
                </div>
              </div>
              <button class="btn-join-player" data-join-type="gamepad" data-slot="${slot.index}">
                + Add
              </button>
            </div>
          `);
        }
      }

      if (inactiveItems.length === 0) {
        this.inactiveListElement.innerHTML = `
          <div class="player-empty-state">
            <p>All connected controllers & keyboard are active in the arena.</p>
            <p class="sub-hint">Plug in an Xbox / PlayStation / USB controller to add more local players!</p>
          </div>
        `;
      } else {
        this.inactiveListElement.innerHTML = inactiveItems.join("");

        // Wire join buttons
        const joinButtons = this.inactiveListElement.querySelectorAll<HTMLButtonElement>(".btn-join-player");
        joinButtons.forEach((btn) => {
          btn.addEventListener("click", () => {
            const joinType = btn.getAttribute("data-join-type");
            if (joinType === "keyboard") {
              this.gameLoop.spawnKeyboardPlayer();
            } else if (joinType === "gamepad") {
              const slotIdx = parseInt(btn.getAttribute("data-slot") || "0", 10);
              const slot = this.inputManager.gamepadSlots.get(slotIdx);
              this.gameLoop.spawnGamepadPlayer(slotIdx, slot?.id);
            }
            this.updateUI();
          });
        });
      }
    }
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
