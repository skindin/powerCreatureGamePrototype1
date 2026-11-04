import type { Character } from "../character/Character.js";
import type { GameLoop } from "../engine/GameLoop.js";
import type { DevPanel } from "./DevPanel.js";
import type { HealthModule } from "../character/HealthModule.js";

interface VisualPowerBlock {
  id: string;
  name: string;
  color: string;
  isBurst: boolean;
  allowPartialPower: boolean;
  isPositive: boolean;
  order: number;
  currentWatts: number;
  targetWatts: number;
  stableWatts: number;
  isAnticipated?: boolean;
}

interface VisualHealthBlock {
  id: string;
  name: string;
  color: string;
  isBurst: boolean;
  isPositive: boolean;
  order: number;
  currentUnits: number;
  targetUnits: number;
  stableUnits: number;
}

/**
 * SinglePlayerHud encapsulates one dual-column HTML status display:
 * - Left column: Health bar, smooth damage/heal blocks, baseline divider line, mod tags.
 * - Right column: Stamina bar (emerald/crimson), Energy reservoir (amber), power blocks, baseline divider line, ability tags.
 * - Optional player header badge for split-screen identification.
 */
export class SinglePlayerHud {
  public rootEl: HTMLElement;
  public badgeEl: HTMLElement | null = null;
  public badgeNameEl: HTMLElement | null = null;
  public badgeDotEl: HTMLElement | null = null;

  // DOM Elements - Left Column: Health System
  private healthModTagsEl: HTMLElement | null = null;
  private healthBlocksContainerEl: HTMLElement | null = null;
  private healthFillEl: HTMLElement | null = null;
  private healthBaselineLineEl: HTMLElement | null = null;

  // DOM Elements - Right Column: Energy & Power System
  private powerTagsEl: HTMLElement | null = null;
  private powerBlocksContainerEl: HTMLElement | null = null;
  private energyFillEl: HTMLElement | null = null;
  private lowerStaminaFillEl: HTMLElement | null = null;
  private flashStaminaEl: HTMLElement | null = null;
  private flashEnergyEl: HTMLElement | null = null;
  private staminaCapTickEl: HTMLElement | null = null;
  private exhaustionTickEl: HTMLElement | null = null;
  private energyBaselineLineEl: HTMLElement | null = null;
  private gunTrackWrapperEl: HTMLElement | null = null;
  private gunFillEl: HTMLElement | null = null;

  // Smooth visual state tracking for status bars (never snaps instantly, lerps down/up smoothly over frames)
  private visualHpPct: number = -1;
  private visualEnergyPct: number = -1;
  private visualMainStaminaPct: number = -1;

  // Smooth interpolation tracking: blocks smoothly grow from 0 and shrink back to 0
  private visualBlocks: Map<string, VisualPowerBlock> = new Map();
  private visualHealthBlocks: Map<string, VisualHealthBlock> = new Map();
  private lastTargetCharacter: Character | null = null;

  constructor(index: number) {
    this.rootEl = document.createElement("div");
    this.rootEl.className = "energy-hud-container";
    this.rootEl.dataset.viewportIndex = index.toString();
    this.rootEl.innerHTML = this.getTemplateHtml();

    this.bindDom();
  }

  private getTemplateHtml(): string {
    return `
      <!-- Player Header Badge (Shown in split screen modes) -->
      <div class="hud-player-badge hidden">
        <span class="hud-player-dot"></span>
        <span class="hud-player-name">P1</span>
      </div>

      <!-- Main Game HUD (Dual Column: Health on Left, Energy & Power on Right) -->
      <div class="energy-hud-body">
        <div class="hud-columns-container">
          <!-- LEFT COLUMN: HEALTH SYSTEM -->
          <div class="hud-column hud-column-health" title="Health & Modifiers">
            <!-- Active Health Modifier Tags Row (Shows HP/s for continuous, HP for instant) -->
            <div class="hud-power-tags-layer hud-health-tags-layer"></div>

            <!-- Unified Track: Health Bar Fill with Heart Symbol & Embedded Modifiers -->
            <div class="energy-hud-track-wrapper hud-track-row" title="Health (HP)">
              <div class="hud-bar-icon-wrap" title="Health">
                <span class="hud-bar-icon hud-icon-health">❤</span>
              </div>
              <div class="energy-hud-track energy-hud-track-main energy-hud-track-health">
                <!-- Current Health Fill (Ruby / Crimson Gradient) -->
                <div class="hud-bar-layer hud-bar-health" title="Health"></div>
                <!-- Embedded Active Health Modifiers Container -->
                <div class="hud-power-blocks-container hud-health-blocks"></div>
                <!-- Clear White Line for Current Health Threshold -->
                <div class="hud-baseline-line hud-health-baseline" style="left: 100%;" title="Current Health Threshold"></div>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: ENERGY & POWER SYSTEM -->
          <div class="hud-column hud-column-energy" title="Energy & Power">
            <!-- Active Ability Tags Row (Shows energy amount with /s for time-based abilities) -->
            <div class="hud-power-tags-layer hud-energy-tags-layer"></div>

            <!-- Gun Fire Time / Overheat Cooldown Stat Bar (Visible when holding a gun, situated ABOVE the energy track) -->
            <div class="hud-gun-track-wrapper hud-track-row" style="display: none; margin-bottom: 3px;" title="Gun Heat & Cooldown">
              <div class="hud-bar-icon-wrap" style="width: 18px;" title="Gun Heat">
                <span class="hud-bar-icon hud-icon-gun" style="color: #f59e0b; font-size: 10px;">🔫</span>
              </div>
              <div class="energy-hud-track" style="position: relative; height: 6px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 3px; overflow: hidden; flex: 1;">
                <div class="hud-bar-gun-fill" style="position: absolute; left: 0; top: 0; height: 100%; width: 0%; background: linear-gradient(90deg, #f59e0b, #ef4444); transition: width 0.05s linear;"></div>
              </div>
            </div>

            <!-- Unified Track: Energy, Multi-Bus Stamina, and Embedded Modifiers -->
            <div class="energy-hud-track-wrapper hud-track-row" title="Energy & Stamina">
              <div class="hud-bar-icon-wrap" title="Energy">
                <span class="hud-bar-icon hud-icon-energy">⚡</span>
              </div>
              <div class="energy-hud-track energy-hud-track-main energy-hud-track-reservoir">
                <!-- Flash Overlays for Denied Actions (Stamina top 6px, Energy bottom 21px) -->
                <div class="hud-flash-overlay hud-flash-stamina"></div>
                <div class="hud-flash-overlay hud-flash-energy"></div>

                <!-- Row 1: Main Bus Stamina (Emerald, Joules) -->
                <div class="hud-bar-layer hud-bar-lower-stamina" title="Main Stamina (J)"></div>

                <!-- Exhaustion Recovery Tick Mark (Red notch shown when exhausted) -->
                <div class="hud-cap-tick hud-cap-exhaustion" style="left: 10%; display: none;" title="Exhaustion Recovery Threshold">
                  <div class="hud-cap-line hud-cap-exhaustion-line"></div>
                </div>

                <!-- Stamina Cap Tick Notch (Green) -->
                <div class="hud-cap-tick hud-cap-stamina" style="left: 50%; display: none;">
                  <div class="hud-cap-line hud-cap-stamina-line"></div>
                </div>

                <!-- Row 2: Energy Reservoir Fill (Amber) -->
                <div class="hud-bar-layer hud-bar-energy" title="Energy Reservoir"></div>

                <!-- Row 2 Overlay: Active Energy Modifiers Container (Embedded color-coded segments) -->
                <div class="hud-power-blocks-container hud-energy-blocks"></div>

                <!-- Clear White Line for Current Energy Threshold -->
                <div class="hud-baseline-line hud-energy-baseline" style="left: 100%;" title="Current Energy Threshold"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private bindDom(): void {
    this.badgeEl = this.rootEl.querySelector(".hud-player-badge");
    this.badgeNameEl = this.rootEl.querySelector(".hud-player-name");
    this.badgeDotEl = this.rootEl.querySelector(".hud-player-dot");

    this.healthModTagsEl = this.rootEl.querySelector(".hud-health-tags-layer");
    this.healthBlocksContainerEl = this.rootEl.querySelector(".hud-health-blocks");
    this.healthFillEl = this.rootEl.querySelector(".hud-bar-health");
    this.healthBaselineLineEl = this.rootEl.querySelector(".hud-health-baseline");

    this.powerTagsEl = this.rootEl.querySelector(".hud-energy-tags-layer");
    this.powerBlocksContainerEl = this.rootEl.querySelector(".hud-energy-blocks");
    this.energyFillEl = this.rootEl.querySelector(".hud-bar-energy");
    this.lowerStaminaFillEl = this.rootEl.querySelector(".hud-bar-lower-stamina");
    this.flashStaminaEl = this.rootEl.querySelector(".hud-flash-stamina");
    this.flashEnergyEl = this.rootEl.querySelector(".hud-flash-energy");
    this.staminaCapTickEl = this.rootEl.querySelector(".hud-cap-stamina");
    this.exhaustionTickEl = this.rootEl.querySelector(".hud-cap-exhaustion");
    this.energyBaselineLineEl = this.rootEl.querySelector(".hud-energy-baseline");

    this.gunTrackWrapperEl = this.rootEl.querySelector(".hud-gun-track-wrapper");
    this.gunFillEl = this.rootEl.querySelector(".hud-bar-gun-fill");
  }

  public reset(): void {
    this.lastTargetCharacter = null;
    this.visualBlocks.clear();
    this.visualHealthBlocks.clear();
    this.visualHpPct = -1;
    this.visualEnergyPct = -1;
    this.visualMainStaminaPct = -1;
    if (this.healthBlocksContainerEl) this.healthBlocksContainerEl.innerHTML = "";
    if (this.healthModTagsEl) this.healthModTagsEl.innerHTML = "";
    if (this.powerBlocksContainerEl) this.powerBlocksContainerEl.innerHTML = "";
    if (this.powerTagsEl) this.powerTagsEl.innerHTML = "";
  }

  private smoothPct(current: number, target: number, rate: number, dt: number): number {
    if (current < 0) return target;
    const diff = target - current;
    if (Math.abs(diff) < 0.05) return target;
    return current + diff * (1 - Math.exp(-rate * dt));
  }

  public update(
    char: Character,
    dt: number,
    playerLabel?: string,
    playerColor?: string,
    showBadge = false
  ): void {
    // 1. Badge visibility
    if (showBadge && playerLabel) {
      if (this.badgeEl) {
        this.badgeEl.classList.remove("hidden");
        this.badgeEl.style.borderColor = playerColor ? `${playerColor}88` : "rgba(255,255,255,0.2)";
        this.badgeEl.style.color = playerColor || "#f8fafc";
      }
      if (this.badgeNameEl) this.badgeNameEl.textContent = playerLabel;
      if (this.badgeDotEl && playerColor) this.badgeDotEl.style.backgroundColor = playerColor;
    } else if (this.badgeEl) {
      this.badgeEl.classList.add("hidden");
    }

    // 2. Character change detection
    if (char !== this.lastTargetCharacter) {
      this.lastTargetCharacter = char;
      this.visualBlocks.clear();
      this.visualHealthBlocks.clear();
      this.visualHpPct = -1;
      this.visualEnergyPct = -1;
      this.visualMainStaminaPct = -1;
    }

    const props = char.properties;
    const pool = char.energyPool;
    const healthMod = char.healthModule;

    const curHp = healthMod ? healthMod.getCurrentHp(props) : 100;
    const maxHp = healthMod ? healthMod.getMaxHp(props) : 100;

    const curEnergy = pool ? pool.getCurrentEnergy(props) : 10000;
    const maxEnergy = pool ? pool.getMaxEnergy(props) : 10000;
    const infiniteEnergy = pool?.infiniteEnergy ?? false;

    const curStamina = pool ? pool.getCurrentStamina(props) : 5000;
    const maxStamina = pool ? pool.getMaxStamina(props) : 5000;
    const isExhausted = pool?.isExhausted ?? false;

    const energyCap = Math.max(100, maxEnergy);

    // Compute actual target percentages
    const targetHpPct = maxHp > 0 ? Math.max(0, Math.min(100, (curHp / maxHp) * 100)) : 0;
    const targetEnergyPct = infiniteEnergy ? 100 : Math.max(0, Math.min(100, (curEnergy / energyCap) * 100));
    const targetMainStaminaPct = maxStamina > 0 ? Math.max(0, Math.min(100, (curStamina / maxStamina) * 100)) : 0;

    // Initialize visual percentages on first load so there is no initial false lerp
    if (this.visualHpPct < 0) this.visualHpPct = targetHpPct;
    if (this.visualEnergyPct < 0) this.visualEnergyPct = targetEnergyPct;
    if (this.visualMainStaminaPct < 0) this.visualMainStaminaPct = targetMainStaminaPct;

    // Smooth status bar decays over a couple frames
    this.visualHpPct = this.smoothPct(this.visualHpPct, targetHpPct, 12.0, dt);
    this.visualEnergyPct = this.smoothPct(this.visualEnergyPct, targetEnergyPct, 12.0, dt);
    this.visualMainStaminaPct = this.smoothPct(this.visualMainStaminaPct, targetMainStaminaPct, 14.0, dt);

    // 3. Render Health Modifiers & Base Fill
    this.renderHealthModBlocks(char, healthMod, maxHp, curHp, dt, this.visualHpPct);

    // 4. Render Power Modifiers & Base Fill
    this.renderPowerBlocks(char, maxEnergy, curEnergy, dt, infiniteEnergy, this.visualEnergyPct);

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const alert = pool?.lastInsufficientAlert;
    const isAlertActive = Boolean(alert && alert.expiresAt > now);
    const flashStamina = isAlertActive && (alert?.limitingResource === "stamina" || alert?.limitingResource === "both");
    const flashEnergy = isAlertActive && (alert?.limitingResource === "energy" || alert?.limitingResource === "both");

    if (this.flashStaminaEl) {
      if (flashStamina) {
        this.flashStaminaEl.classList.add("hud-flash-active");
      } else {
        this.flashStaminaEl.classList.remove("hud-flash-active");
      }
    }
    if (this.flashEnergyEl) {
      if (flashEnergy) {
        this.flashEnergyEl.classList.add("hud-flash-active");
      } else {
        this.flashEnergyEl.classList.remove("hud-flash-active");
      }
    }

    // Current Stamina Fill (Solid Emerald on Row 1) - tracks visualMainStaminaPct smoothly across full row
    if (this.lowerStaminaFillEl) {
      this.lowerStaminaFillEl.style.width = `${this.visualMainStaminaPct.toFixed(2)}%`;
      if (flashStamina) {
        this.lowerStaminaFillEl.style.borderRight = "1.5px solid #ffffff";
        this.lowerStaminaFillEl.style.background = "linear-gradient(90deg, #b91c1c, #ef4444, #f87171)";
        this.lowerStaminaFillEl.style.boxShadow = "0 0 12px rgba(239, 68, 68, 0.9)";
      } else if (isExhausted) {
        this.lowerStaminaFillEl.style.borderRight = "1.5px solid #fca5a5";
        this.lowerStaminaFillEl.style.background = "linear-gradient(90deg, #991b1b, #dc2626, #ef4444)";
        this.lowerStaminaFillEl.style.boxShadow = "0 0 6px rgba(239, 68, 68, 0.6)";
      } else {
        this.lowerStaminaFillEl.style.borderRight = "1.5px solid #86efac";
        this.lowerStaminaFillEl.style.background = "linear-gradient(90deg, #15803d, #16a34a, #22c55e)";
        this.lowerStaminaFillEl.style.boxShadow = "0 0 6px rgba(34, 197, 94, 0.4)";
      }
    }

    // Stamina Cap Tick Notch: hidden since main stamina now occupies the full row width
    if (this.staminaCapTickEl) {
      this.staminaCapTickEl.style.display = "none";
    }

    // Exhaustion Recovery Tick Notch (Red tick indicating when player will recover from exhaustion)
    if (this.exhaustionTickEl) {
      if (isExhausted) {
        const recoveryRatio = pool?.recoveryThresholdRatio ?? 0.20;
        const recoveryPct = recoveryRatio * 100;
        this.exhaustionTickEl.style.left = `${recoveryPct.toFixed(2)}%`;
        this.exhaustionTickEl.style.display = "block";
      } else {
        this.exhaustionTickEl.style.display = "none";
      }
    }

    // 5. Update Gun Fire Time & Overheat Cooldown stat bar on the right
    const heldGun = char.heldObject?.gunModule;
    if (this.gunTrackWrapperEl) {
      if (heldGun && heldGun.enabled) {
        this.gunTrackWrapperEl.style.display = "flex";
        const heat = Math.min(1.0, Math.max(0.0, heldGun.heat));

        if (this.gunFillEl) {
          this.gunFillEl.style.width = `${(heat * 100).toFixed(1)}%`;
          if (heldGun.isOverheated) {
            this.gunFillEl.style.background = "linear-gradient(90deg, #b91c1c, #ef4444, #f87171)";
            this.gunFillEl.style.boxShadow = "0 0 10px rgba(239, 68, 68, 0.8)";
          } else {
            this.gunFillEl.style.background = "linear-gradient(90deg, #f59e0b, #ef4444)";
            this.gunFillEl.style.boxShadow = "0 0 6px rgba(245, 158, 11, 0.4)";
          }
        }
      } else {
        this.gunTrackWrapperEl.style.display = "none";
      }
    }
  }

  private renderHealthModBlocks(
    _char: Character,
    healthMod: HealthModule | null,
    maxHp: number,
    _curHp: number,
    dt: number,
    visualHpPct: number
  ): void {
    if (!this.healthBlocksContainerEl || !this.healthModTagsEl) return;

    const modifiers = healthMod ? healthMod.getActiveModifiers(_char.properties) : [];
    const activeIds = new Set<string>();

    for (const mod of modifiers) {
      if (mod.rateOrAmount <= 0.001) continue;
      activeIds.add(mod.id);

      let vb = this.visualHealthBlocks.get(mod.id);
      if (!vb) {
        vb = {
          id: mod.id,
          name: mod.name,
          color: mod.color,
          isBurst: mod.type === "instant",
          isPositive: mod.isHeal,
          order: mod.order,
          currentUnits: 0,
          targetUnits: mod.rateOrAmount,
          stableUnits: mod.rateOrAmount,
        };
        this.visualHealthBlocks.set(mod.id, vb);
      } else {
        vb.targetUnits = mod.rateOrAmount;
        vb.stableUnits = mod.rateOrAmount;
        vb.isBurst = mod.type === "instant";
        vb.isPositive = mod.isHeal;
        vb.name = mod.name;
        vb.color = mod.color;
      }
    }

    // Inactive blocks target 0 so their inner edge smoothly shrinks towards the right edge
    for (const [id, vb] of this.visualHealthBlocks.entries()) {
      if (!activeIds.has(id)) {
        vb.targetUnits = 0;
      }
    }

    // Smoothly interpolate currentUnits towards targetUnits
    for (const [id, vb] of this.visualHealthBlocks.entries()) {
      if (vb.currentUnits < vb.targetUnits) {
        const attackRate = vb.isBurst ? 35.0 : 18.0;
        vb.currentUnits += (vb.targetUnits - vb.currentUnits) * (1 - Math.exp(-attackRate * dt));
        if (Math.abs(vb.targetUnits - vb.currentUnits) < 0.2) {
          vb.currentUnits = vb.targetUnits;
        }
      } else if (vb.currentUnits > vb.targetUnits) {
        const decayRate = vb.isBurst ? 8.0 : 14.0;
        vb.currentUnits += (vb.targetUnits - vb.currentUnits) * (1 - Math.exp(-decayRate * dt));
        if (vb.currentUnits < 0.2) {
          vb.currentUnits = 0;
        }
      }

      if (vb.currentUnits <= 0.01 && vb.targetUnits <= 0.001) {
        this.visualHealthBlocks.delete(id);
      }
    }

    // Base health fill and white baseline line track visualHpPct smoothly
    if (this.healthFillEl) {
      this.healthFillEl.style.width = `${visualHpPct.toFixed(2)}%`;
    }
    if (this.healthBaselineLineEl) {
      if (visualHpPct <= 0.001) {
        this.healthBaselineLineEl.style.display = "none";
      } else {
        this.healthBaselineLineEl.style.display = "block";
        this.healthBaselineLineEl.style.left = `${visualHpPct.toFixed(2)}%`;
      }
    }

    const sortedBlocks = Array.from(this.visualHealthBlocks.values()).sort((a, b) => a.order - b.order);

    if (sortedBlocks.length === 0) {
      this.healthBlocksContainerEl.innerHTML = "";
      this.healthModTagsEl.innerHTML = "";
      return;
    }

    const positiveBlocks = sortedBlocks.filter((b) => b.isPositive);
    const negativeBlocks = sortedBlocks.filter((b) => !b.isPositive);

    let blocksHtml = "";

    // 1. Subtracting Modifiers (Damage, Aura, Hits):
    // Rendered ON TOP OF and COMPLETELY WITHIN the health block.
    let rightAnchorHp = visualHpPct;
    for (const vb of negativeBlocks) {
      if (vb.currentUnits <= 0.01) continue;
      const widthPct = Math.max(0.4, (vb.currentUnits / Math.max(1, maxHp)) * 100);
      const actualWidth = Math.min(rightAnchorHp, widthPct);
      const leftPct = Math.max(0, rightAnchorHp - actualWidth);
      const units = vb.stableUnits;

      blocksHtml += `
        <div class="hud-power-block hud-block-neg" style="left: ${leftPct.toFixed(2)}%; width: ${actualWidth.toFixed(2)}%; top: 0; height: 100%; background: ${vb.color}; border-right: 1px solid rgba(0, 0, 0, 0.25);" title="${vb.name}: -${Math.round(vb.stableUnits)}${vb.isBurst ? "" : "/s"} (${units.toFixed(1)} HP / sec)"></div>
      `;
      rightAnchorHp = leftPct;
    }

    // 2. Positive Modifiers (Healing):
    // Placed extending OUTWARD to the right of visualHpPct
    let posLeftPct = visualHpPct;
    for (const vb of positiveBlocks) {
      if (vb.currentUnits <= 0.01) continue;
      const units = vb.currentUnits;
      const widthPct = Math.max(0.4, (units / Math.max(1, maxHp)) * 100);
      blocksHtml += `
        <div class="hud-power-block hud-block-pos" style="left: ${posLeftPct.toFixed(2)}%; width: ${widthPct.toFixed(2)}%; top: 0; height: 100%; background: ${vb.color}; border-left: 1px solid rgba(0, 0, 0, 0.25);" title="${vb.name}: +${Math.round(vb.stableUnits)}${vb.isBurst ? "" : "/s"} (${units.toFixed(1)} HP / sec)"></div>
      `;
      posLeftPct += widthPct;
    }

    // Mod tags with + and - signs
    let tagsHtml = "";
    for (const vb of sortedBlocks) {
      if (vb.currentUnits <= 0.01) continue;

      const rateSuffix = vb.isBurst ? "" : "/s";
      const amount = Math.round(vb.stableUnits);
      const sign = vb.isPositive ? "+" : "-";
      const tagOpacity = Math.min(1, Math.max(0.1, vb.currentUnits / (vb.isBurst ? 3 : 1.5))).toFixed(2);

      tagsHtml += `
        <div class="hud-power-tag" style="border-color: ${vb.color}; background: ${vb.color}33; color: ${vb.color}; opacity: ${tagOpacity};" title="${vb.name}: ${sign}${amount}${rateSuffix}">
          <span class="hud-tag-name">${vb.name}</span>
          <span class="hud-tag-rate">${sign}${amount}${rateSuffix}</span>
        </div>
      `;
    }

    this.healthBlocksContainerEl.innerHTML = blocksHtml;
    this.healthModTagsEl.innerHTML = tagsHtml;
  }

  private renderPowerBlocks(
    _char: Character,
    maxEnergy: number,
    _curEnergy: number,
    dt: number,
    _infiniteEnergy: boolean,
    visualEnergyPct: number
  ): void {
    if (!this.powerBlocksContainerEl || !this.powerTagsEl) return;

    const energyCap = Math.max(100, maxEnergy);
    const allocations: any[] = [];
    const activeAbilityKeys = new Set<string>();

    if (_char.energyPool && _char.energyPool.enabled) {
      for (const a of _char.energyPool.getActiveAllocations(_char.properties)) {
        const watts = a.isBurst ? (a.demandedWatts || a.grantedWatts) : a.grantedWatts;
        allocations.push({
          key: a.id,
          id: a.id,
          name: a.name,
          color: a.color,
          grantedWatts: watts,
          allowPartialPower: a.allowPartialPower,
          isPositive: false,
          isBurst: a.isBurst ?? false,
          order: a.order,
          isAnticipated: false,
        });
        activeAbilityKeys.add(a.id);
      }
    }

    // Active item consumption (+Watts)
    if (_char.isUsingItem && _char.canConsumeHeldObject() && _char.heldObject?.consumableModule) {
      const cMod = _char.heldObject.consumableModule;
      const consumeWatts = cMod.getConsumeRate(_char.heldObject.properties);
      allocations.push({
        key: "consumable_nutrition",
        id: "consumable_nutrition",
        name: cMod.tag ? `Consumable (${cMod.tag})` : "Consumable",
        color: "#22c55e",
        grantedWatts: consumeWatts,
        allowPartialPower: false,
        isPositive: true,
        isBurst: false,
        order: 999,
        isAnticipated: false,
      });
      activeAbilityKeys.add("consumable_nutrition");
    }

    // Anticipated Modifiers (Throw preview, laser aiming)
    const anticipatedMods = _char.getAnticipatedModifiers ? _char.getAnticipatedModifiers() : [];
    for (const ant of anticipatedMods) {
      const canonicalKey = ant.abilityId || ant.id;
      if (activeAbilityKeys.has(canonicalKey)) continue;

      allocations.push({
        key: canonicalKey,
        id: ant.id,
        name: ant.name,
        color: ant.color,
        grantedWatts: ant.amount,
        allowPartialPower: false,
        isPositive: ant.isPositive ?? false,
        isBurst: ant.isBurst,
        order: ant.order ?? 950,
        isAnticipated: true,
      });
    }

    const activeKeys = new Set<string>();
    for (const alloc of allocations) {
      if (alloc.grantedWatts <= 0.001) continue;
      activeKeys.add(alloc.key);

      let vb = this.visualBlocks.get(alloc.key);
      if (!vb) {
        vb = {
          id: alloc.key,
          name: alloc.name,
          color: alloc.color,
          isBurst: alloc.isBurst ?? false,
          allowPartialPower: alloc.allowPartialPower,
          isPositive: alloc.isPositive ?? false,
          order: alloc.order,
          currentWatts: 0,
          targetWatts: alloc.grantedWatts,
          stableWatts: alloc.grantedWatts,
          isAnticipated: alloc.isAnticipated ?? false,
        };
        this.visualBlocks.set(alloc.key, vb);
      } else {
        vb.name = alloc.name;
        vb.color = alloc.color;
        vb.targetWatts = alloc.grantedWatts;
        vb.stableWatts = alloc.grantedWatts;
        vb.isBurst = alloc.isBurst ?? false;
        vb.allowPartialPower = alloc.allowPartialPower;
        vb.isPositive = alloc.isPositive ?? false;
        vb.order = alloc.order;
        vb.isAnticipated = alloc.isAnticipated ?? false;
      }
    }

    // Inactive blocks target 0 so their inner edge smoothly shrinks towards the right edge
    for (const [key, vb] of this.visualBlocks.entries()) {
      if (!activeKeys.has(key)) {
        vb.targetWatts = 0;
      }
    }

    // Smoothly interpolate currentWatts towards targetWatts
    for (const [key, vb] of this.visualBlocks.entries()) {
      if (vb.currentWatts < vb.targetWatts) {
        const attackRate = vb.isBurst && !vb.isAnticipated ? 35.0 : 18.0;
        vb.currentWatts += (vb.targetWatts - vb.currentWatts) * (1 - Math.exp(-attackRate * dt));
        if (Math.abs(vb.targetWatts - vb.currentWatts) < 0.5) {
          vb.currentWatts = vb.targetWatts;
        }
      } else if (vb.currentWatts > vb.targetWatts) {
        const decayRate = vb.isBurst && !vb.isAnticipated ? 8.0 : 14.0;
        vb.currentWatts += (vb.targetWatts - vb.currentWatts) * (1 - Math.exp(-decayRate * dt));
        if (vb.currentWatts < 0.5) {
          vb.currentWatts = 0;
        }
      }

      if (vb.currentWatts <= 0.01 && vb.targetWatts <= 0.001) {
        this.visualBlocks.delete(key);
      }
    }

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const alert = _char.energyPool?.lastInsufficientAlert;
    const isAlertActive = Boolean(alert && alert.expiresAt > now);
    const flashEnergy = isAlertActive && (alert?.limitingResource === "energy" || alert?.limitingResource === "both");

    // Base energy fill and white baseline line track visualEnergyPct smoothly
    if (this.energyFillEl) {
      this.energyFillEl.style.width = `${visualEnergyPct.toFixed(2)}%`;
      if (flashEnergy) {
        this.energyFillEl.style.borderRight = "1.5px solid #ffffff";
        this.energyFillEl.style.background = "linear-gradient(90deg, #b91c1c, #ef4444, #f87171)";
        this.energyFillEl.style.boxShadow = "0 0 12px rgba(239, 68, 68, 0.9)";
      } else {
        this.energyFillEl.style.borderRight = "1.5px solid #fde68a";
        this.energyFillEl.style.background = "linear-gradient(90deg, #b45309, #d97706, #fbbf24)";
        this.energyFillEl.style.boxShadow = "0 0 6px rgba(245, 158, 11, 0.4)";
      }
    }
    if (this.energyBaselineLineEl) {
      if (visualEnergyPct <= 0.001) {
        this.energyBaselineLineEl.style.display = "none";
      } else {
        this.energyBaselineLineEl.style.display = "block";
        this.energyBaselineLineEl.style.left = `${visualEnergyPct.toFixed(2)}%`;
      }
    }

    const sortedBlocks = Array.from(this.visualBlocks.values()).sort((a, b) => a.order - b.order);

    if (sortedBlocks.length === 0) {
      this.powerBlocksContainerEl.innerHTML = "";
      let emptyTagsHtml = "";
      if (isAlertActive && alert) {
        const rateSuffix = alert.isBurst ? "" : "/s";
        const amountStr = `-${alert.cost}${rateSuffix}`;
        emptyTagsHtml = `
          <div class="hud-power-tag hud-tag-denied" title="${alert.abilityName}: ${amountStr} (${alert.reason})">
            <span class="hud-tag-icon">⚠️</span>
            <span class="hud-tag-name">${alert.abilityName}</span>
            <span class="hud-tag-rate">${amountStr}</span>
          </div>
        `;
      }
      this.powerTagsEl.innerHTML = emptyTagsHtml;
      return;
    }

    const positiveBlocks = sortedBlocks.filter((b) => b.isPositive);
    const negativeBlocks = sortedBlocks.filter((b) => !b.isPositive);

    let blocksHtml = "";

    // 1. Subtracting Modifiers (Bursts, Power Draws, Anticipated Costs)
    let rightAnchorEnergy = visualEnergyPct;
    for (const vb of negativeBlocks) {
      if (vb.currentWatts <= 0.01) continue;
      const widthPct = Math.max(0.4, (vb.currentWatts / energyCap) * 100);
      const actualWidth = Math.min(rightAnchorEnergy, widthPct);
      const leftPct = Math.max(0, rightAnchorEnergy - actualWidth);
      const joules = vb.stableWatts;

      const anticipatedClass = vb.isAnticipated ? "hud-block-anticipated" : "";
      const borderStyle = vb.isAnticipated
        ? "border: 1.5px dotted rgba(255, 255, 255, 0.6);"
        : "border-right: 1px solid rgba(0, 0, 0, 0.25);";
      const opacityStyle = vb.isAnticipated ? "opacity: 0.52;" : "";

      blocksHtml += `
        <div class="hud-power-block hud-block-neg ${anticipatedClass}" style="left: ${leftPct.toFixed(2)}%; width: ${actualWidth.toFixed(2)}%; top: 0; height: 100%; background: ${vb.color}; ${borderStyle} ${opacityStyle}" title="${vb.name}${vb.isAnticipated ? " (Anticipated)" : ""}: -${Math.round(vb.stableWatts)}${vb.isBurst ? "" : "/s"} (${Math.round(joules)} J${vb.isBurst ? "" : " / sec"})"></div>
      `;
      rightAnchorEnergy = leftPct;
    }

    // 2. Positive Modifiers (Nutrition)
    let posLeftPct = visualEnergyPct;
    for (const vb of positiveBlocks) {
      if (vb.currentWatts <= 0.01) continue;
      const joules = vb.currentWatts;
      const widthPct = Math.max(0.4, (joules / energyCap) * 100);
      blocksHtml += `
        <div class="hud-power-block hud-block-pos" style="left: ${posLeftPct.toFixed(2)}%; width: ${widthPct.toFixed(2)}%; top: 0; height: 100%; background: ${vb.color}; border-left: 1px solid rgba(0, 0, 0, 0.25);" title="${vb.name}: +${Math.round(vb.stableWatts)}${vb.isBurst ? "" : "/s"} (${Math.round(joules)} J / sec)"></div>
      `;
      posLeftPct += widthPct;
    }

    // Mod tags with + and - signs
    let tagsHtml = "";
    for (const vb of sortedBlocks) {
      if (vb.currentWatts <= 0.01) continue;

      const rateSuffix = vb.isBurst ? "" : "/s";
      const energyAmount = Math.round(vb.stableWatts);
      const sign = vb.isPositive ? "+" : "-";

      const tagAnticipatedClass = vb.isAnticipated ? "hud-tag-anticipated" : "";
      const tagBorderStyle = vb.isAnticipated
        ? `border: 1.5px dotted ${vb.color};`
        : `border: 1.5px solid ${vb.color};`;
      const tagBackground = vb.isAnticipated
        ? `${vb.color}18`
        : `${vb.color}33`;
      const baseTagOpacity = vb.isAnticipated ? 0.65 : 1.0;
      const tagOpacity = Math.min(baseTagOpacity, Math.max(0.1, (vb.currentWatts / 15) * baseTagOpacity)).toFixed(2);

      tagsHtml += `
        <div class="hud-power-tag ${tagAnticipatedClass}" style="${tagBorderStyle} background: ${tagBackground}; color: ${vb.color}; opacity: ${tagOpacity};" title="${vb.name}${vb.isAnticipated ? " (Anticipated)" : ""}: ${sign}${energyAmount}${rateSuffix}">
          <span class="hud-tag-name">${vb.name}</span>
          <span class="hud-tag-rate">${sign}${energyAmount}${rateSuffix}</span>
        </div>
      `;
    }

    if (isAlertActive && alert) {
      const rateSuffix = alert.isBurst ? "" : "/s";
      const amountStr = `-${alert.cost}${rateSuffix}`;
      tagsHtml =
        `
        <div class="hud-power-tag hud-tag-denied" title="${alert.abilityName}: ${amountStr} (${alert.reason})">
          <span class="hud-tag-icon">⚠️</span>
          <span class="hud-tag-name">${alert.abilityName}</span>
          <span class="hud-tag-rate">${amountStr}</span>
        </div>
      ` + tagsHtml;
    }

    this.powerBlocksContainerEl.innerHTML = blocksHtml;
    this.powerTagsEl.innerHTML = tagsHtml;
  }
}

/**
 * EnergyHud orchestrates 1–4 SinglePlayerHud views across active viewports:
 * - Single player: 1 HUD centered at bottom, full width.
 * - 2 Players: 2 HUDs, left and right halves, scaled cleanly.
 * - 3–4 Players: 4 Quadrants (2x2 grid), with Q3 hidden in 3P mode for waiting minimap.
 */
export class EnergyHud {
  private overlay: HTMLElement | null = null;
  private miniPill: HTMLElement | null = null;
  private slots: { slotEl: HTMLElement; hud: SinglePlayerHud }[] = [];
  private gameLoop: GameLoop;
  private devPanel: DevPanel;

  public isCollapsed: boolean = false;
  private lastUpdateTime: number = 0;

  constructor(gameLoop: GameLoop, devPanel: DevPanel) {
    this.gameLoop = gameLoop;
    this.devPanel = devPanel;

    this.mount();
    this.setupListeners();
  }

  private mount(): void {
    const parent = document.querySelector(".canvas-wrapper");
    if (!parent) return;

    const overlay = document.createElement("div");
    overlay.id = "hud-split-overlay";
    overlay.className = "hud-split-overlay";

    // Collapsed Mini Pill
    const miniPill = document.createElement("div");
    miniPill.id = "energy-hud-mini";
    miniPill.className = "energy-hud-mini hidden";
    miniPill.title = "Click or press 'U' to expand HUD";
    miniPill.innerHTML = `
      <span class="hud-mini-icon" style="color: #ef4444; margin-right: 2px;">❤</span>
      <span class="hud-mini-icon" style="color: #fbbf24;">⚡</span>
      <span style="font-size: 0.72rem; font-weight: 700; margin-left: 2px;">Status</span>
      <button id="btn-energy-hud-expand" class="hud-mini-expand-btn" title="Expand HUD">▲</button>
    `;
    overlay.appendChild(miniPill);

    // Create 4 Viewport Slots
    for (let i = 0; i < 4; i++) {
      const slotEl = document.createElement("div");
      slotEl.className = "hud-viewport-slot";
      slotEl.dataset.slotIndex = i.toString();

      const hud = new SinglePlayerHud(i);
      slotEl.appendChild(hud.rootEl);
      overlay.appendChild(slotEl);

      this.slots.push({ slotEl, hud });
    }

    parent.appendChild(overlay);
    this.overlay = overlay;
    this.miniPill = miniPill;
  }

  private setupListeners(): void {
    this.miniPill?.addEventListener("click", () => this.toggleCollapse());

    // Hotkey 'U' to toggle HUD collapse
    window.addEventListener("keydown", (e) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") {
        return;
      }
      if ((e.key === "u" || e.key === "U") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        this.toggleCollapse();
      }
    });
  }

  public toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    if (this.isCollapsed) {
      this.miniPill?.classList.remove("hidden");
      for (const slot of this.slots) {
        slot.slotEl.style.display = "none";
      }
    } else {
      this.miniPill?.classList.add("hidden");
    }
  }

  /**
   * Returns the primary character to inspect in single-player mode.
   * Strictly binds to active player characters (never the arena dummy).
   */
  public getTargetCharacter(): Character | null {
    const pm = this.gameLoop?.playerManager;
    if (!pm || pm.players.size === 0) {
      return null;
    }

    if (this.devPanel?.selectedEntity instanceof Object && (this.devPanel.selectedEntity as any).isCharacter) {
      const selected = this.devPanel.selectedEntity as Character;
      for (const p of pm.players.values()) {
        if (p.character === selected) {
          return selected;
        }
      }
    }

    return (
      pm.primaryCharacter ||
      pm.baseCharacter ||
      pm.players.values().next().value?.character ||
      null
    );
  }

  /**
   * Main 60 FPS update loop.
   */
  public update(deltaSeconds?: number): void {
    if (!this.overlay) return;

    // 1. Precisely align the overlay with the displayed canvas bounds
    const canvas = document.getElementById("game-canvas") as HTMLCanvasElement | null;
    if (canvas) {
      this.overlay.style.left = `${canvas.offsetLeft}px`;
      this.overlay.style.top = `${canvas.offsetTop}px`;
      this.overlay.style.width = `${canvas.offsetWidth}px`;
      this.overlay.style.height = `${canvas.offsetHeight}px`;
    }

    const overlayW = this.overlay.offsetWidth || 1000;

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    let dt =
      deltaSeconds !== undefined && deltaSeconds > 0
        ? deltaSeconds
        : this.lastUpdateTime > 0
          ? (now - this.lastUpdateTime) / 1000
          : 0.016;
    if (dt > 0.1) dt = 0.1;
    if (dt < 0.001) dt = 0.016;
    this.lastUpdateTime = now;

    if (this.isCollapsed) {
      if (this.miniPill) this.miniPill.classList.remove("hidden");
      for (const slot of this.slots) {
        slot.slotEl.style.display = "none";
      }
      return;
    } else {
      if (this.miniPill) this.miniPill.classList.add("hidden");
    }

    const isSplit = this.gameLoop.isSplitScreen && this.gameLoop.playerManager.players.size >= 2;
    const activePlayerEntries = Array.from(this.gameLoop.playerManager.players.values()).sort(
      (a, b) => a.playerNumber - b.playerNumber
    );

    if (!isSplit || activePlayerEntries.length <= 1) {
      // =======================================================================
      // MODE 1: SINGLE PLAYER (Full Screen)
      // =======================================================================
      const char = this.getTargetCharacter();
      if (!char) {
        for (const slot of this.slots) {
          slot.slotEl.style.display = "none";
          slot.hud.reset();
        }
        return;
      }

      const s0 = this.slots[0];
      s0.slotEl.style.display = "block";
      s0.slotEl.style.left = "0px";
      s0.slotEl.style.top = "0px";
      s0.slotEl.style.width = "100%";
      s0.slotEl.style.height = "100%";

      const baseW = 820;
      const availW = overlayW - 24;
      const scale = Math.min(1.0, Math.max(0.4, availW / baseW));

      s0.hud.rootEl.style.transform = `translateX(-50%) scale(${scale.toFixed(3)})`;
      s0.hud.rootEl.style.bottom = "16px";
      s0.hud.update(char, dt, undefined, undefined, false);

      // Hide remaining slots
      for (let i = 1; i < 4; i++) {
        this.slots[i].slotEl.style.display = "none";
        this.slots[i].hud.reset();
      }
    } else if (activePlayerEntries.length === 2) {
      // =======================================================================
      // MODE 2: 2 PLAYERS (Left and Right Halves)
      // =======================================================================
      const baseW = 820;
      const halfW = overlayW * 0.5;
      const availW = halfW - 16;
      const scale = Math.min(0.85, Math.max(0.35, availW / baseW));

      for (let i = 0; i < 2; i++) {
        const pe = activePlayerEntries[i];
        const s = this.slots[i];
        s.slotEl.style.display = "block";
        s.slotEl.style.top = "0px";
        s.slotEl.style.height = "100%";
        s.slotEl.style.width = "50%";
        s.slotEl.style.left = i === 0 ? "0px" : "50%";

        s.hud.rootEl.style.transform = `translateX(-50%) scale(${scale.toFixed(3)})`;
        s.hud.rootEl.style.bottom = "12px";
        const displayName = pe.character.hasCustomName && pe.character.name ? pe.character.name : `Player ${pe.playerNumber}`;
        s.hud.update(pe.character, dt, `P${pe.playerNumber}: ${displayName}`, pe.color, true);
      }

      // Hide slots 2, 3
      for (let i = 2; i < 4; i++) {
        this.slots[i].slotEl.style.display = "none";
        this.slots[i].hud.reset();
      }
    } else {
      // =======================================================================
      // MODE 3: 3–4 PLAYERS (4 Quadrants)
      // =======================================================================
      const baseW = 820;
      const quadW = overlayW * 0.5;
      const availW = quadW - 16;
      const scale = Math.min(0.62, Math.max(0.3, availW / baseW));

      const quadCoords = [
        { left: "0px", top: "0px" }, // Q0: Top-Left (P1)
        { left: "50%", top: "0px" }, // Q1: Top-Right (P2)
        { left: "0px", top: "50%" }, // Q2: Bottom-Left (P3)
        { left: "50%", top: "50%" }, // Q3: Bottom-Right (P4)
      ];

      for (let i = 0; i < 4; i++) {
        const s = this.slots[i];
        if (i < activePlayerEntries.length) {
          const pe = activePlayerEntries[i];
          s.slotEl.style.display = "block";
          s.slotEl.style.left = quadCoords[i].left;
          s.slotEl.style.top = quadCoords[i].top;
          s.slotEl.style.width = "50%";
          s.slotEl.style.height = "50%";

          s.hud.rootEl.style.transform = `translateX(-50%) scale(${scale.toFixed(3)})`;
          s.hud.rootEl.style.bottom = "8px";
          const displayName = pe.character.hasCustomName && pe.character.name ? pe.character.name : `Player ${pe.playerNumber}`;
          s.hud.update(pe.character, dt, `P${pe.playerNumber}: ${displayName}`, pe.color, true);
        } else {
          // If only 3 players, Q3 is hidden so overview minimap is clean
          s.slotEl.style.display = "none";
          s.hud.reset();
        }
      }
    }
  }
}
