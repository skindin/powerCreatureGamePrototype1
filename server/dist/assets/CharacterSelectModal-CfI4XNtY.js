var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const CREATURE_CHOICES = [
  "prefab_player",
  "prefab_speed_ball",
  "prefab_grower_character"
];
const _CharacterSelectModal = class _CharacterSelectModal {
  constructor() {
    __publicField(this, "containerEl", null);
    __publicField(this, "activeOptions", null);
    __publicField(this, "selectedIndex", 0);
    // 0 = Laser Goat, 1 = Speed Ball, 2 = Bio-Grower
    __publicField(this, "keyListener", null);
    __publicField(this, "pollIntervalId", null);
    __publicField(this, "lastGamepadNavDir", 0);
  }
  static getInstance() {
    if (!_CharacterSelectModal.instance) {
      _CharacterSelectModal.instance = new _CharacterSelectModal();
    }
    return _CharacterSelectModal.instance;
  }
  isOpen() {
    return this.containerEl !== null && this.activeOptions !== null;
  }
  open(options) {
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

      <div style="display: flex; gap: 18px; max-width: 980px; width: 94%; justify-content: center;">
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

        <!-- Card 3: Bio-Grower -->
        <div class="creature-card" data-index="2" data-prefab-id="prefab_grower_character" style="
          flex: 1;
          background: rgba(6, 38, 30, 0.6);
          border: 2px solid rgba(16, 185, 129, 0.35);
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
          <div style="font-size: 3.5rem; margin-bottom: 8px; filter: drop-shadow(0 2px 8px rgba(16, 185, 129, 0.45));">🧬</div>
          <h3 style="margin: 0 0 6px; font-size: 1.35rem; color: #34d399; font-weight: 700;">Bio-Grower</h3>
          <div style="font-size: 0.76rem; color: #cbd5e1; margin-bottom: 14px; line-height: 1.35;">
            Metabolic creature that dynamically grows in size, mass, reach, and power as it eats and stores energy.
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; margin-top: auto; font-size: 0.75rem; text-align: left;">
            <div style="background: rgba(15, 23, 42, 0.6); padding: 5px 8px; border-radius: 6px; color: #a7f3d0;">
              <span style="font-weight: 600;">Growth:</span> Scale With Energy (0.5x – 2.0x)
            </div>
            <div style="background: rgba(15, 23, 42, 0.6); padding: 5px 8px; border-radius: 6px; color: #a7f3d0;">
              <span style="font-weight: 600;">Ability:</span> Projectile Vomit (Key V)
            </div>
            <div style="background: rgba(15, 23, 42, 0.6); padding: 5px 8px; border-radius: 6px; color: #a7f3d0;">
              <span style="font-weight: 600;">Scaling:</span> Mass, Size, Reach & Power
            </div>
          </div>
          <button class="select-btn" style="
            margin-top: 16px;
            width: 100%;
            padding: 8px 12px;
            background: #059669;
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 700;
            font-size: 0.88rem;
            cursor: pointer;
            transition: background 0.15s ease;
          ">Choose Bio-Grower</button>
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
    const cards = overlay.querySelectorAll(".creature-card");
    cards.forEach((card) => {
      card.addEventListener("click", () => {
        const prefabId = card.dataset.prefabId;
        if (prefabId) {
          this.confirmChoice(prefabId);
        }
      });
      card.addEventListener("mouseenter", () => {
        const idx = parseInt(card.dataset.index ?? "0", 10);
        this.selectedIndex = idx;
        this.updateCardStyles();
      });
    });
    this.keyListener = (e) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        this.selectedIndex = (this.selectedIndex - 1 + CREATURE_CHOICES.length) % CREATURE_CHOICES.length;
        this.updateCardStyles();
        e.preventDefault();
      } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        this.selectedIndex = (this.selectedIndex + 1) % CREATURE_CHOICES.length;
        this.updateCardStyles();
        e.preventDefault();
      } else if (e.code === "Enter" || e.code === "Space") {
        const choice = CREATURE_CHOICES[this.selectedIndex] ?? "prefab_player";
        this.confirmChoice(choice);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", this.keyListener, { capture: true });
    this.lastGamepadNavDir = 0;
    this.pollIntervalId = window.setInterval(() => {
      var _a, _b, _c;
      if (!navigator.getGamepads) return;
      const gamepads = navigator.getGamepads();
      let activeNavDir = 0;
      for (const gp of gamepads) {
        if (!gp || !gp.connected) continue;
        const dpadLeft = (_a = gp.buttons[14]) == null ? void 0 : _a.pressed;
        const dpadRight = (_b = gp.buttons[15]) == null ? void 0 : _b.pressed;
        const stickX = gp.axes[0] ?? 0;
        const btnA = (_c = gp.buttons[0]) == null ? void 0 : _c.pressed;
        if (dpadLeft || stickX < -0.5) {
          activeNavDir = -1;
        } else if (dpadRight || stickX > 0.5) {
          activeNavDir = 1;
        }
        if (btnA) {
          const choice = CREATURE_CHOICES[this.selectedIndex] ?? "prefab_player";
          this.confirmChoice(choice);
          return;
        }
      }
      if (activeNavDir !== 0 && activeNavDir !== this.lastGamepadNavDir) {
        this.selectedIndex = (this.selectedIndex + activeNavDir + CREATURE_CHOICES.length) % CREATURE_CHOICES.length;
        this.updateCardStyles();
      }
      this.lastGamepadNavDir = activeNavDir;
    }, 100);
  }
  updateCardStyles() {
    if (!this.containerEl) return;
    const cards = this.containerEl.querySelectorAll(".creature-card");
    cards.forEach((card, idx) => {
      const el = card;
      const isSelected = idx === this.selectedIndex;
      if (idx === 0) {
        el.style.borderColor = isSelected ? "#f59e0b" : "rgba(245, 158, 11, 0.25)";
        el.style.boxShadow = isSelected ? "0 0 25px rgba(245, 158, 11, 0.45), inset 0 0 15px rgba(245, 158, 11, 0.15)" : "0 4px 20px rgba(0, 0, 0, 0.35)";
        el.style.transform = isSelected ? "translateY(-4px) scale(1.02)" : "translateY(0) scale(1.0)";
      } else if (idx === 1) {
        el.style.borderColor = isSelected ? "#38bdf8" : "rgba(56, 189, 248, 0.25)";
        el.style.boxShadow = isSelected ? "0 0 25px rgba(56, 189, 248, 0.45), inset 0 0 15px rgba(56, 189, 248, 0.15)" : "0 4px 20px rgba(0, 0, 0, 0.35)";
        el.style.transform = isSelected ? "translateY(-4px) scale(1.02)" : "translateY(0) scale(1.0)";
      } else {
        el.style.borderColor = isSelected ? "#10b981" : "rgba(16, 185, 129, 0.25)";
        el.style.boxShadow = isSelected ? "0 0 25px rgba(16, 185, 129, 0.45), inset 0 0 15px rgba(16, 185, 129, 0.15)" : "0 4px 20px rgba(0, 0, 0, 0.35)";
        el.style.transform = isSelected ? "translateY(-4px) scale(1.02)" : "translateY(0) scale(1.0)";
      }
    });
  }
  confirmChoice(prefabId) {
    var _a;
    const cb = (_a = this.activeOptions) == null ? void 0 : _a.onSelect;
    this.close();
    if (cb) {
      cb(prefabId);
    }
  }
  close() {
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
};
__publicField(_CharacterSelectModal, "instance", null);
let CharacterSelectModal = _CharacterSelectModal;
export {
  CharacterSelectModal
};
