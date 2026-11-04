/**
 * CharacterSelectModal: Interactive selection window for picking creature archetypes.
 * Players choose between the Laser Goat (walking & laser) and Speed Ball (high-speed rolling).
 * Supports Keyboard (A/D/Arrows/Enter/Space), Gamepad (Stick/D-Pad/(A)), and Mouse clicks.
 */
export interface CharacterSelectOptions {
  playerNumber: number;
  playerId: string;
  onSelect: (prefabId: string) => void;
}

export class CharacterSelectModal {
  private static instance: CharacterSelectModal | null = null;
  private containerEl: HTMLElement | null = null;
  private activeOptions: CharacterSelectOptions | null = null;
  private selectedIndex: number = 0; // 0 = Laser Goat, 1 = Speed Ball
  private keyListener: ((e: KeyboardEvent) => void) | null = null;
  private pollIntervalId: number | null = null;

  public static getInstance(): CharacterSelectModal {
    if (!CharacterSelectModal.instance) {
      CharacterSelectModal.instance = new CharacterSelectModal();
    }
    return CharacterSelectModal.instance;
  }

  public isOpen(): boolean {
    return this.containerEl !== null && this.activeOptions !== null;
  }

  public open(options: CharacterSelectOptions): void {
    if (this.isOpen()) {
      this.close();
    }
    this.activeOptions = options;
    this.selectedIndex = 0;

    const wrapper = document.getElementById("canvas-wrapper") || document.body;

    const overlay = document.createElement("div");
    overlay.id = "character-select-overlay";
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(10, 10, 20, 0.82);
      backdrop-filter: blur(6px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      user-select: none;
      animation: fadeIn 0.18s ease-out;
    `;

    overlay.innerHTML = `
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 0.85rem; letter-spacing: 2px; text-transform: uppercase; color: #a855f7; font-weight: 700; margin-bottom: 4px;">
          Player ${options.playerNumber} Join
        </div>
        <h2 style="margin: 0; font-size: 1.85rem; font-weight: 800; color: #f8fafc; letter-spacing: 0.5px;">
          Choose Your Creature
        </h2>
        <p style="margin: 6px 0 0; color: #94a3b8; font-size: 0.88rem;">
          Select your combat archetype to enter the arena
        </p>
      </div>

      <div style="display: flex; gap: 20px; max-width: 680px; width: 90%; justify-content: center;">
        <!-- Card 1: Laser Goat -->
        <div class="creature-card" data-index="0" data-prefab-id="prefab_player" style="
          flex: 1;
          background: rgba(30, 27, 75, 0.6);
          border: 2px solid rgba(245, 158, 11, 0.5);
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.18s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
        ">
          <div style="font-size: 3.5rem; margin-bottom: 8px; filter: drop-shadow(0 2px 8px rgba(245, 158, 11, 0.4));">🐐</div>
          <h3 style="margin: 0 0 6px; font-size: 1.35rem; color: #fbbf24; font-weight: 700;">Laser Goat</h3>
          <div style="font-size: 0.76rem; color: #cbd5e1; margin-bottom: 14px; line-height: 1.35;">
            Ground trotting beast with foot friction, high grip, and high-power thermal laser beam.
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; margin-top: auto; font-size: 0.75rem; text-align: left;">
            <div style="background: rgba(15, 23, 42, 0.6); padding: 5px 8px; border-radius: 6px; color: #fde68a;">
              <span style="font-weight: 600;">Drive:</span> Ground Locomotion
            </div>
            <div style="background: rgba(15, 23, 42, 0.6); padding: 5px 8px; border-radius: 6px; color: #fde68a;">
              <span style="font-weight: 600;">Weapon:</span> Thermal Laser Beam
            </div>
            <div style="background: rgba(15, 23, 42, 0.6); padding: 5px 8px; border-radius: 6px; color: #fde68a;">
              <span style="font-weight: 600;">Bounciness:</span> Low (0.15)
            </div>
          </div>
          <button class="select-btn" style="
            margin-top: 16px;
            width: 100%;
            padding: 8px 12px;
            background: #d97706;
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 700;
            font-size: 0.88rem;
            cursor: pointer;
            transition: background 0.15s ease;
          ">Choose Laser Goat</button>
        </div>

        <!-- Card 2: Speed Ball -->
        <div class="creature-card" data-index="1" data-prefab-id="prefab_speed_ball" style="
          flex: 1;
          background: rgba(15, 23, 42, 0.6);
          border: 2px solid rgba(56, 189, 248, 0.3);
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.18s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
        ">
          <div style="font-size: 3.5rem; margin-bottom: 8px; filter: drop-shadow(0 2px 8px rgba(56, 189, 248, 0.4));">⚡</div>
          <h3 style="margin: 0 0 6px; font-size: 1.35rem; color: #38bdf8; font-weight: 700;">Speed Ball</h3>
          <div style="font-size: 0.76rem; color: #cbd5e1; margin-bottom: 14px; line-height: 1.35;">
            Spherical speedster driven by torque. Keeps rolling endlessly with low resistance until active brake.
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; margin-top: auto; font-size: 0.75rem; text-align: left;">
            <div style="background: rgba(15, 23, 42, 0.6); padding: 5px 8px; border-radius: 6px; color: #bae6fd;">
              <span style="font-weight: 600;">Drive:</span> 3D Angular Roll Torque
            </div>
            <div style="background: rgba(15, 23, 42, 0.6); padding: 5px 8px; border-radius: 6px; color: #bae6fd;">
              <span style="font-weight: 600;">Momentum:</span> Continuous Free Roll
            </div>
            <div style="background: rgba(15, 23, 42, 0.6); padding: 5px 8px; border-radius: 6px; color: #bae6fd;">
              <span style="font-weight: 600;">Bounciness:</span> Ultra Bouncy (0.85)
            </div>
          </div>
          <button class="select-btn" style="
            margin-top: 16px;
            width: 100%;
            padding: 8px 12px;
            background: #0284c7;
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 700;
            font-size: 0.88rem;
            cursor: pointer;
            transition: background 0.15s ease;
          ">Choose Speed Ball</button>
        </div>
      </div>

      <div style="margin-top: 24px; color: #64748b; font-size: 0.78rem; display: flex; gap: 16px; align-items: center;">
        <span>🎮 <b>Navigate:</b> A / D, Arrows or D-Pad</span>
        <span>•</span>
        <span>✅ <b>Confirm:</b> Enter, Space or (A) Button</span>
      </div>
    `;

    wrapper.appendChild(overlay);
    this.containerEl = overlay;

    this.updateCardStyles();

    // Mouse click bindings
    const cards = overlay.querySelectorAll(".creature-card");
    cards.forEach((card) => {
      card.addEventListener("click", () => {
        const prefabId = (card as HTMLElement).dataset.prefabId;
        if (prefabId) {
          this.confirmChoice(prefabId);
        }
      });
      card.addEventListener("mouseenter", () => {
        const idx = parseInt((card as HTMLElement).dataset.index ?? "0", 10);
        this.selectedIndex = idx;
        this.updateCardStyles();
      });
    });

    // Keyboard listener
    this.keyListener = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        this.selectedIndex = 0;
        this.updateCardStyles();
        e.preventDefault();
      } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        this.selectedIndex = 1;
        this.updateCardStyles();
        e.preventDefault();
      } else if (e.code === "Enter" || e.code === "Space") {
        const choice = this.selectedIndex === 0 ? "prefab_player" : "prefab_speed_ball";
        this.confirmChoice(choice);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", this.keyListener, { capture: true });

    // Gamepad polling
    this.pollIntervalId = window.setInterval(() => {
      if (!navigator.getGamepads) return;
      const gamepads = navigator.getGamepads();
      for (const gp of gamepads) {
        if (!gp || !gp.connected) continue;
        const dpadLeft = gp.buttons[14]?.pressed;
        const dpadRight = gp.buttons[15]?.pressed;
        const stickX = gp.axes[0] ?? 0;
        const btnA = gp.buttons[0]?.pressed;

        if (dpadLeft || stickX < -0.5) {
          if (this.selectedIndex !== 0) {
            this.selectedIndex = 0;
            this.updateCardStyles();
          }
        } else if (dpadRight || stickX > 0.5) {
          if (this.selectedIndex !== 1) {
            this.selectedIndex = 1;
            this.updateCardStyles();
          }
        }

        if (btnA) {
          const choice = this.selectedIndex === 0 ? "prefab_player" : "prefab_speed_ball";
          this.confirmChoice(choice);
          break;
        }
      }
    }, 100);
  }

  private updateCardStyles(): void {
    if (!this.containerEl) return;
    const cards = this.containerEl.querySelectorAll(".creature-card");
    cards.forEach((card, idx) => {
      const el = card as HTMLElement;
      const isSelected = idx === this.selectedIndex;
      if (idx === 0) {
        // Laser Goat
        el.style.borderColor = isSelected ? "#f59e0b" : "rgba(245, 158, 11, 0.25)";
        el.style.boxShadow = isSelected
          ? "0 0 25px rgba(245, 158, 11, 0.45), inset 0 0 15px rgba(245, 158, 11, 0.15)"
          : "0 4px 20px rgba(0, 0, 0, 0.35)";
        el.style.transform = isSelected ? "translateY(-4px) scale(1.02)" : "translateY(0) scale(1.0)";
      } else {
        // Speed Ball
        el.style.borderColor = isSelected ? "#38bdf8" : "rgba(56, 189, 248, 0.25)";
        el.style.boxShadow = isSelected
          ? "0 0 25px rgba(56, 189, 248, 0.45), inset 0 0 15px rgba(56, 189, 248, 0.15)"
          : "0 4px 20px rgba(0, 0, 0, 0.35)";
        el.style.transform = isSelected ? "translateY(-4px) scale(1.02)" : "translateY(0) scale(1.0)";
      }
    });
  }

  private confirmChoice(prefabId: string): void {
    const cb = this.activeOptions?.onSelect;
    this.close();
    if (cb) {
      cb(prefabId);
    }
  }

  public close(): void {
    if (this.keyListener) {
      window.removeEventListener("keydown", this.keyListener, { capture: true });
      this.keyListener = null;
    }
    if (this.pollIntervalId !== null) {
      window.clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    if (this.containerEl) {
      this.containerEl.remove();
      this.containerEl = null;
    }
    this.activeOptions = null;
  }
}

