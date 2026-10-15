import type { Character } from "../character/Character.js";
import type { GameLoop } from "../engine/GameLoop.js";
import type { DevPanel } from "./DevPanel.js";
import type { EnergyBus } from "../character/EnergyBus.js";
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

export class EnergyHud {
  private container: HTMLElement | null = null;
  private gameLoop: GameLoop;
  private devPanel: DevPanel;

  // DOM Elements - Left Column: Health System
  private healthModTagsEl: HTMLElement | null = null;
  private healthBlocksContainerEl: HTMLElement | null = null;
  private healthFillEl: HTMLElement | null = null;

  // DOM Elements - Right Column: Energy & Power System
  private powerTagsEl: HTMLElement | null = null;
  private powerBlocksContainerEl: HTMLElement | null = null;
  private energyFillEl: HTMLElement | null = null;
  private lowerStaminaFillEl: HTMLElement | null = null;
  private staminaCapTickEl: HTMLElement | null = null;
  private exhaustionTickEl: HTMLElement | null = null;

  public isCollapsed: boolean = false;
  private lastUpdateTime: number = 0;
  private lastTargetCharacter: Character | null = null;

  // Smooth interpolation tracking: blocks smoothly grow from 0 and shrink back to 0
  private visualBlocks: Map<string, VisualPowerBlock> = new Map();
  private visualHealthBlocks: Map<string, VisualHealthBlock> = new Map();

  constructor(gameLoop: GameLoop, devPanel: DevPanel) {
    this.gameLoop = gameLoop;
    this.devPanel = devPanel;

    this.mount();
    this.setupListeners();
  }

  private mount(): void {
    const parent = document.querySelector(".canvas-wrapper");
    if (!parent) return;

    const hudWrapper = document.createElement("div");
    hudWrapper.id = "energy-hud";
    hudWrapper.className = "energy-hud-container";
    hudWrapper.innerHTML = `
      <!-- Collapsed Mini Pill -->
      <div id="energy-hud-mini" class="energy-hud-mini hidden" title="Click or press 'U' to expand HUD">
        <span class="hud-mini-icon" style="color: #ef4444; margin-right: 2px;">❤</span>
        <span class="hud-mini-icon" style="color: #fbbf24;">⚡</span>
        <span style="font-size: 0.72rem; font-weight: 700; margin-left: 2px;">Status</span>
        <button id="btn-energy-hud-expand" class="hud-mini-expand-btn" title="Expand HUD">▲</button>
      </div>

      <!-- Main Game HUD (Dual Column: Health on Left, Energy & Power on Right) -->
      <div id="energy-hud-body" class="energy-hud-body">
        <div class="hud-columns-container">
          <!-- LEFT COLUMN: HEALTH SYSTEM -->
          <div class="hud-column hud-column-health" title="Health & Modifiers">
            <!-- Preserved Mod List: Active Health Modifier Tags Row (Shows HP/s for continuous, HP for instant) -->
            <div id="health-hud-mod-tags" class="hud-power-tags-layer hud-health-tags-layer"></div>

            <!-- Upper Track: Health Bar Fill vs Max HP with Heart Symbol -->
            <div class="energy-hud-track-wrapper hud-track-row" title="Health (HP)">
              <div class="hud-bar-icon-wrap" title="Health">
                <span class="hud-bar-icon hud-icon-health">❤</span>
              </div>
              <div class="energy-hud-track energy-hud-track-main energy-hud-track-health" id="health-hud-track-bar">
                <!-- Current Health Fill (Ruby / Crimson Gradient) -->
                <div id="bar-hud-health-fill" class="hud-bar-layer hud-bar-health" title="Health"></div>
              </div>
            </div>

            <!-- Lower Track: Health Modifiers Bar with Heart Modifier Symbol -->
            <div class="energy-hud-track-wrapper hud-track-row" title="Health Modifiers (Damage & Healing Rates)">
              <div class="hud-bar-icon-wrap" title="Health Modifiers">
                <span class="hud-bar-icon hud-icon-health-mod">❤<small class="hud-sub-plus">±</small></span>
              </div>
              <div class="energy-hud-track energy-hud-track-mods energy-hud-track-health-mods" id="health-hud-track-mods">
                <div id="hud-health-mods-container" class="hud-power-blocks-container"></div>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: ENERGY & POWER SYSTEM -->
          <div class="hud-column hud-column-energy" title="Energy & Power">
            <!-- Preserved Mod List: Active Ability Tags Row (Shows energy amount with /s for time-based abilities) -->
            <div id="energy-hud-power-tags" class="hud-power-tags-layer"></div>

            <!-- Upper Track: Energy & Stamina Scale with Lightning Symbol -->
            <div class="energy-hud-track-wrapper hud-track-row" title="Energy & Stamina">
              <div class="hud-bar-icon-wrap" title="Energy">
                <span class="hud-bar-icon hud-icon-energy">⚡</span>
              </div>
              <div class="energy-hud-track energy-hud-track-main energy-hud-track-reservoir" id="energy-hud-track-reservoir">
                <!-- Current Energy Fill (Amber/Gold) -->
                <div id="bar-hud-energy-fill" class="hud-bar-layer hud-bar-energy" title="Energy"></div>

                <!-- Current Stamina Fill (Emerald) -->
                <div id="bar-hud-lower-stamina" class="hud-bar-layer hud-bar-lower-stamina" title="Stamina"></div>

                <!-- Exhaustion Recovery Tick Mark (Red notch shown when exhausted) -->
                <div id="tick-hud-exhaustion-recovery" class="hud-cap-tick hud-cap-exhaustion" style="left: 10%; display: none;" title="Exhaustion Recovery Threshold">
                  <div class="hud-cap-line hud-cap-exhaustion-line"></div>
                </div>

                <!-- Stamina Cap Tick Notch (Green) -->
                <div id="tick-hud-max-stamina" class="hud-cap-tick hud-cap-stamina" style="left: 50%;">
                  <div class="hud-cap-line hud-cap-stamina-line"></div>
                </div>
              </div>
            </div>

            <!-- Lower Track: Power Bar (Energy Modifiers) with Lightning Modifier Symbol -->
            <div class="energy-hud-track-wrapper hud-track-row" title="Power & Energy Consumption Rates">
              <div class="hud-bar-icon-wrap" title="Energy Modifiers (Power)">
                <span class="hud-bar-icon hud-icon-energy-mod">⚡<small class="hud-sub-plus">±</small></span>
              </div>
              <div class="energy-hud-track energy-hud-track-mods energy-hud-track-power" id="energy-hud-track-power">
                <div id="hud-power-blocks-container" class="hud-power-blocks-container"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    parent.appendChild(hudWrapper);
    this.container = hudWrapper;

    // Grab element handles - Health System
    this.healthModTagsEl = hudWrapper.querySelector("#health-hud-mod-tags");
    this.healthBlocksContainerEl = hudWrapper.querySelector("#hud-health-mods-container");
    this.healthFillEl = hudWrapper.querySelector("#bar-hud-health-fill");

    // Grab element handles - Energy & Power System
    this.powerTagsEl = hudWrapper.querySelector("#energy-hud-power-tags");
    this.powerBlocksContainerEl = hudWrapper.querySelector("#hud-power-blocks-container");
    this.energyFillEl = hudWrapper.querySelector("#bar-hud-energy-fill");
    this.lowerStaminaFillEl = hudWrapper.querySelector("#bar-hud-lower-stamina");
    this.staminaCapTickEl = hudWrapper.querySelector("#tick-hud-max-stamina");
    this.exhaustionTickEl = hudWrapper.querySelector("#tick-hud-exhaustion-recovery");
  }

  private setupListeners(): void {
    const miniPill = this.container?.querySelector("#energy-hud-mini");
    miniPill?.addEventListener("click", () => this.toggleCollapse());

    // Hotkey 'U' to toggle HUD collapse
    window.addEventListener("keydown", (e) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") {
        return;
      }
      if (e.key === "u" || e.key === "U") {
        e.preventDefault();
        this.toggleCollapse();
      }
    });
  }

  public toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    const bodyEl = this.container?.querySelector("#energy-hud-body");
    const miniEl = this.container?.querySelector("#energy-hud-mini");
    if (bodyEl && miniEl) {
      if (this.isCollapsed) {
        bodyEl.classList.add("hidden");
        miniEl.classList.remove("hidden");
      } else {
        bodyEl.classList.remove("hidden");
        miniEl.classList.add("hidden");
      }
    }
  }

  /**
   * Returns the active character to inspect.
   */
  public getTargetCharacter(): Character | null {
    if (this.devPanel?.selectedEntity instanceof Object && (this.devPanel.selectedEntity as any).isCharacter) {
      return this.devPanel.selectedEntity as Character;
    }
    return this.gameLoop?.playerManager?.primaryCharacter || this.gameLoop?.playerManager?.baseCharacter || this.gameLoop?.allCharacters?.[0] || null;
  }

  /**
   * Renders color-coded blocks in the upper Health Modifiers bar and matching tags above the bar.
   * - Shows continuous damage over time (damage aura: e.g. 'Aura 20/s')
   * - Shows instant damage bursts (impact/collision: e.g. 'Impact 15')
   * - Shows healing over time (passive regen: e.g. 'Heal 10/s')
   * - Shows instant healing (e.g. 'Heal 10')
   * - Smoothly interpolates from 0 when appearing and back to 0 when disappearing.
   */
  private renderHealthModBlocks(_char: Character, healthMod: HealthModule | null, maxHp: number, dt: number): void {
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

    // Inactive blocks target 0 so they shrink smoothly back to 0
    for (const [id, vb] of this.visualHealthBlocks.entries()) {
      if (!activeIds.has(id)) {
        vb.targetUnits = 0;
      }
    }

    // Smoothly interpolate currentUnits towards targetUnits
    for (const [id, vb] of this.visualHealthBlocks.entries()) {
      if (vb.currentUnits < vb.targetUnits) {
        const attackRate = 18.0;
        vb.currentUnits += (vb.targetUnits - vb.currentUnits) * (1 - Math.exp(-attackRate * dt));
        if (Math.abs(vb.targetUnits - vb.currentUnits) < 0.5) {
          vb.currentUnits = vb.targetUnits;
        }
      } else if (vb.currentUnits > vb.targetUnits) {
        const decayRate = 14.0;
        vb.currentUnits += (vb.targetUnits - vb.currentUnits) * (1 - Math.exp(-decayRate * dt));
        if (vb.currentUnits < 0.5) {
          vb.currentUnits = 0;
        }
      }

      if (vb.currentUnits <= 0.01 && vb.targetUnits <= 0.001) {
        this.visualHealthBlocks.delete(id);
      }
    }

    const sortedBlocks = Array.from(this.visualHealthBlocks.values()).sort((a, b) => a.order - b.order);

    if (sortedBlocks.length === 0) {
      this.healthBlocksContainerEl.innerHTML = "";
      this.healthModTagsEl.innerHTML = "";
      return;
    }

    // Split into positive (healing, top half) and negative (damage, bottom half)
    const positiveBlocks = sortedBlocks.filter(b => b.isPositive);
    const negativeBlocks = sortedBlocks.filter(b => !b.isPositive);

    // Capacity scale for modifiers: half of max HP or at least 40 HP
    const baseModCap = Math.max(40, maxHp * 0.5);
    let totalPosUnits = 0;
    for (const vb of positiveBlocks) {
      if (vb.currentUnits > 0.01) totalPosUnits += vb.currentUnits;
    }
    let totalNegUnits = 0;
    for (const vb of negativeBlocks) {
      if (vb.currentUnits > 0.01) totalNegUnits += vb.currentUnits;
    }
    const effectiveCap = Math.max(baseModCap, totalPosUnits, totalNegUnits);

    let blocksHtml = "";

    // 1. Top Lane: Positive Modifiers (Healing)
    let posLeftPct = 0;
    for (const vb of positiveBlocks) {
      if (vb.currentUnits <= 0.01) continue;
      const widthPct = Math.min(100 - posLeftPct, (vb.currentUnits / effectiveCap) * 100);
      if (widthPct <= 0.001) continue;

      blocksHtml += `
        <div class="hud-power-block hud-block-pos" style="left: ${posLeftPct.toFixed(2)}%; width: ${widthPct.toFixed(2)}%; top: 0; height: 50%; background: ${vb.color}; border-right: 1.5px solid rgba(255, 255, 255, 0.7);" title="${vb.name}"></div>
      `;
      posLeftPct += widthPct;
    }

    // 2. Bottom Lane: Negative Modifiers (Damage)
    let negLeftPct = 0;
    for (const vb of negativeBlocks) {
      if (vb.currentUnits <= 0.01) continue;
      const widthPct = Math.min(100 - negLeftPct, (vb.currentUnits / effectiveCap) * 100);
      if (widthPct <= 0.001) continue;

      blocksHtml += `
        <div class="hud-power-block hud-block-neg" style="left: ${negLeftPct.toFixed(2)}%; width: ${widthPct.toFixed(2)}%; top: 50%; height: 50%; background: ${vb.color}; border-right: 1.5px solid rgba(255, 255, 255, 0.7);" title="${vb.name}"></div>
      `;
      negLeftPct += widthPct;
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

  /**
   * Renders color-coded blocks in the Power bar and matching color-coded tags above the bar.
   * - Split vertically without dividing line: positive energy generation on top, negative power draws on bottom.
   * - Abilities stack chronologically from left to right in activation order.
   * - Blocks smoothly interpolate from 0 as they appear and back to 0 as they disappear.
   * - Tags display '+' or '-' before the value.
   */
  private renderPowerBlocks(_char: Character, bus: EnergyBus | null, maxPower: number, dt: number): void {
    if (!this.powerBlocksContainerEl || !this.powerTagsEl) return;
    const powerCap = Math.max(50, maxPower);
    const allocations = bus ? bus.getActiveAllocations(_char.properties) : [];

    // If character is actively consuming an item, register an incoming positive energy modifier (+Watts)
    if (_char.isUsingItem && _char.canConsumeHeldObject() && _char.heldObject?.consumableModule) {
      const cMod = _char.heldObject.consumableModule;
      const consumeWatts = cMod.getConsumeRate(_char.heldObject.properties);
      allocations.push({
        id: "consumable_nutrition",
        name: cMod.tag ? `Consumable (${cMod.tag})` : "Consumable",
        color: "#22c55e",
        grantedWatts: consumeWatts,
        allowPartialPower: false,
        isPositive: true,
        isBurst: false,
        order: 999,
      } as any);
    }

    // Track active allocations
    const activeIds = new Set<string>();
    for (const alloc of allocations) {
      if (alloc.grantedWatts <= 0.001) continue;
      activeIds.add(alloc.id);

      let vb = this.visualBlocks.get(alloc.id);
      if (!vb) {
        // Newly appeared: starts at 0 width and expands smoothly!
        vb = {
          id: alloc.id,
          name: alloc.name,
          color: alloc.color,
          isBurst: alloc.isBurst ?? false,
          allowPartialPower: alloc.allowPartialPower,
          isPositive: (alloc as any).isPositive ?? false,
          order: alloc.order,
          currentWatts: 0,
          targetWatts: alloc.grantedWatts,
          stableWatts: alloc.grantedWatts,
        };
        this.visualBlocks.set(alloc.id, vb);
      } else {
        vb.targetWatts = alloc.grantedWatts;
        vb.stableWatts = alloc.grantedWatts;
        vb.isBurst = alloc.isBurst ?? false;
        vb.allowPartialPower = alloc.allowPartialPower;
        vb.isPositive = (alloc as any).isPositive ?? false;
      }
    }

    // Deactivated blocks target 0 so they shrink smoothly back to 0
    for (const [id, vb] of this.visualBlocks.entries()) {
      if (!activeIds.has(id)) {
        vb.targetWatts = 0;
        // vb.stableWatts remains intact, preserving the ability's energy amount
      }
    }

    // Smoothly interpolate currentWatts towards targetWatts
    for (const [id, vb] of this.visualBlocks.entries()) {
      if (vb.currentWatts < vb.targetWatts) {
        // Fast, smooth expansion from 0
        const attackRate = 18.0;
        vb.currentWatts += (vb.targetWatts - vb.currentWatts) * (1 - Math.exp(-attackRate * dt));
        if (Math.abs(vb.targetWatts - vb.currentWatts) < 0.5) {
          vb.currentWatts = vb.targetWatts;
        }
      } else if (vb.currentWatts > vb.targetWatts) {
        // Fast, smooth contraction back to 0
        const decayRate = 14.0;
        vb.currentWatts += (vb.targetWatts - vb.currentWatts) * (1 - Math.exp(-decayRate * dt));
        if (vb.currentWatts < 0.5) {
          vb.currentWatts = 0;
        }
      }

      // Once fully decayed back to 0 and inactive, prune
      if (vb.currentWatts <= 0.01 && vb.targetWatts <= 0.001) {
        this.visualBlocks.delete(id);
      }
    }

    // Strictly sort by activation order (stacking left to right)
    const sortedBlocks = Array.from(this.visualBlocks.values()).sort((a, b) => a.order - b.order);

    if (sortedBlocks.length === 0) {
      this.powerBlocksContainerEl.innerHTML = "";
      this.powerTagsEl.innerHTML = "";
      return;
    }

    // Split into positive (energy gain / generation, top half) and negative (power consumption, bottom half)
    const positiveBlocks = sortedBlocks.filter(b => b.isPositive);
    const negativeBlocks = sortedBlocks.filter(b => !b.isPositive);

    let blocksHtml = "";

    // 1. Top Lane: Positive Modifiers (Energy Generation / Charging)
    let posLeftPct = 0;
    for (const vb of positiveBlocks) {
      if (vb.currentWatts <= 0.01) continue;
      const widthPct = Math.min(100 - posLeftPct, (vb.currentWatts / powerCap) * 100);
      if (widthPct <= 0.001) continue;

      blocksHtml += `
        <div class="hud-power-block hud-block-pos" style="left: ${posLeftPct.toFixed(2)}%; width: ${widthPct.toFixed(2)}%; top: 0; height: 50%; background: ${vb.color}; border-right: 1.5px solid rgba(255, 255, 255, 0.7);" title="${vb.name}"></div>
      `;
      posLeftPct += widthPct;
    }

    // 2. Bottom Lane: Negative Modifiers (Power Consumption: Sprint, Jump, Heal, Climb, Walk)
    let fullPowerWatts = 0;
    for (const vb of negativeBlocks) {
      if (!vb.allowPartialPower && vb.currentWatts > 0.01) {
        fullPowerWatts += vb.currentWatts;
      }
    }
    const fullPowerWidthPct = Math.min(100, (fullPowerWatts / powerCap) * 100);
    const remainingPartialWidthPct = Math.max(0, 100 - fullPowerWidthPct);

    let partialPowerWatts = 0;
    for (const vb of negativeBlocks) {
      if (vb.allowPartialPower && vb.currentWatts > 0.01) {
        partialPowerWatts += vb.currentWatts;
      }
    }

    let negLeftPct = 0;
    for (const vb of negativeBlocks) {
      if (vb.currentWatts <= 0.01) continue;

      let widthPct = 0;
      if (!vb.allowPartialPower) {
        // Full power block gets its demanded share directly
        widthPct = Math.min(100 - negLeftPct, (vb.currentWatts / powerCap) * 100);
      } else {
        // Partial power block shares remaining headroom proportionally
        const partialIdealWidth = (vb.currentWatts / powerCap) * 100;
        if (partialPowerWatts <= (powerCap - fullPowerWatts) + 0.01) {
          widthPct = Math.min(100 - negLeftPct, partialIdealWidth);
        } else if (partialPowerWatts > 0.01) {
          widthPct = Math.min(100 - negLeftPct, (vb.currentWatts / partialPowerWatts) * remainingPartialWidthPct);
        }
      }

      if (widthPct <= 0.001) continue;

      // Color-coded block in the lower lane (bottom half)
      blocksHtml += `
        <div class="hud-power-block hud-block-neg" style="left: ${negLeftPct.toFixed(2)}%; width: ${widthPct.toFixed(2)}%; top: 50%; height: 50%; background: ${vb.color}; border-right: 1.5px solid rgba(255, 255, 255, 0.7);" title="${vb.name}"></div>
      `;

      negLeftPct += widthPct;
    }

    // Mod tags with + and - signs
    let tagsHtml = "";
    for (const vb of sortedBlocks) {
      if (vb.currentWatts <= 0.01) continue;

      const rateSuffix = vb.isBurst ? "" : "/s";
      const energyAmount = Math.round(vb.stableWatts);
      const sign = vb.isPositive ? "+" : "-";
      const tagOpacity = Math.min(1, Math.max(0.1, vb.currentWatts / 15)).toFixed(2);

      tagsHtml += `
        <div class="hud-power-tag" style="border-color: ${vb.color}; background: ${vb.color}33; color: ${vb.color}; opacity: ${tagOpacity};" title="${vb.name}: ${sign}${energyAmount}${rateSuffix}">
          <span class="hud-tag-name">${vb.name}</span>
          <span class="hud-tag-rate">${sign}${energyAmount}${rateSuffix}</span>
        </div>
      `;
    }

    this.powerBlocksContainerEl.innerHTML = blocksHtml;
    this.powerTagsEl.innerHTML = tagsHtml;
  }

  /**
   * Main 60 FPS update loop.
   */
  public update(deltaSeconds?: number): void {
    if (!this.container) return;

    const char = this.getTargetCharacter();
    if (!char) {
      this.container.style.display = "none";
      return;
    }
    this.container.style.display = "block";

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    let dt = deltaSeconds !== undefined && deltaSeconds > 0
      ? deltaSeconds
      : (this.lastUpdateTime > 0 ? (now - this.lastUpdateTime) / 1000 : 0.016);
    if (dt > 0.1) dt = 0.1;
    if (dt < 0.001) dt = 0.016;
    this.lastUpdateTime = now;

    if (char !== this.lastTargetCharacter) {
      this.lastTargetCharacter = char;
      this.visualBlocks.clear();
      this.visualHealthBlocks.clear();
    }

    const props = char.properties;
    const pool = char.energyPool;
    const bus = char.getEnergyBus("bus_main");
    const healthMod = char.healthModule;

    const curHp = healthMod ? healthMod.getCurrentHp(props) : 100;
    const maxHp = healthMod ? healthMod.getMaxHp(props) : 100;

    const curEnergy = pool ? pool.getCurrentEnergy(props) : 10000;
    const maxEnergy = pool ? pool.getMaxEnergy(props) : 10000;
    const infiniteEnergy = pool?.infiniteEnergy ?? false;

    const maxPower = bus ? bus.getMaxPower(props) : 500;
    const curStamina = bus ? bus.getCurrentStamina(props) : 10;
    const maxStamina = bus ? bus.getMaxStamina(props) : 10;
    const isExhausted = bus?.isExhausted ?? false;

    if (this.isCollapsed) return;

    // =========================================================================
    // 1. LEFT COLUMN: HEALTH SYSTEM
    // =========================================================================
    // Upper Track: Current modifiers to health (Aura DOT, Impact shock, Passive heal)
    this.renderHealthModBlocks(char, healthMod, maxHp, dt);

    // Lower Track: Current Health Fill vs Max HP
    if (this.healthFillEl) {
      const hpRatio = maxHp > 0 ? Math.max(0, Math.min(1, curHp / maxHp)) : 0;
      this.healthFillEl.style.width = `${(hpRatio * 100).toFixed(2)}%`;
    }

    // =========================================================================
    // 2. RIGHT COLUMN: ENERGY & POWER SYSTEM (Squished into right side)
    // =========================================================================
    // Upper Track: Color-coded active blocks stacking left-to-right & interpolating
    this.renderPowerBlocks(char, bus, maxPower, dt);

    // Lower Track: Energy & Stamina on same bar
    const energyCap = Math.max(100, maxEnergy);

    // Current Energy Fill (Amber/Gold or Cyan in Godmode, Bottom Lane)
    if (this.energyFillEl) {
      if (infiniteEnergy) {
        this.energyFillEl.style.width = "100%";
        this.energyFillEl.style.background = "linear-gradient(90deg, #0284c7, #38bdf8, #818cf8)";
        this.energyFillEl.style.borderRight = "1.5px solid #bae6fd";
      } else {
        const energyRatio = energyCap > 0 ? Math.max(0, Math.min(1, curEnergy / energyCap)) : 0;
        this.energyFillEl.style.width = `${(energyRatio * 100).toFixed(2)}%`;
        this.energyFillEl.style.background = "linear-gradient(90deg, #b45309, #d97706, #fbbf24)";
        this.energyFillEl.style.borderRight = "1.5px solid #fde68a";
      }
    }

    // Current Stamina Fill (Solid Emerald on Top Lane, Non-Overlapping)
    if (this.lowerStaminaFillEl) {
      const curStaminaEnergy = curStamina * maxPower;
      const lowerStaminaRatio = energyCap > 0 ? Math.max(0, Math.min(1, curStaminaEnergy / energyCap)) : 0;
      this.lowerStaminaFillEl.style.width = `${(lowerStaminaRatio * 100).toFixed(2)}%`;
      if (isExhausted) {
        this.lowerStaminaFillEl.style.borderRight = "1.5px solid #fca5a5";
        this.lowerStaminaFillEl.style.background = "linear-gradient(90deg, #991b1b, #dc2626, #ef4444)";
        this.lowerStaminaFillEl.style.boxShadow = "0 0 6px rgba(239, 68, 68, 0.6)";
      } else {
        this.lowerStaminaFillEl.style.borderRight = "1.5px solid #86efac";
        this.lowerStaminaFillEl.style.background = "linear-gradient(90deg, #15803d, #16a34a, #22c55e)";
        this.lowerStaminaFillEl.style.boxShadow = "0 0 6px rgba(34, 197, 94, 0.4)";
      }
    }

    // Stamina Cap Tick Notch (at (maxStamina * maxPower) / energyCap)
    if (this.staminaCapTickEl) {
      const maxStaminaEnergy = maxStamina * maxPower;
      const staminaCapPct = energyCap > 0 ? Math.max(0, Math.min(100, (maxStaminaEnergy / energyCap) * 100)) : 50;
      this.staminaCapTickEl.style.left = `${staminaCapPct.toFixed(2)}%`;
    }

    // Exhaustion Recovery Tick Notch (Red tick indicating when player will not be exhausted anymore)
    if (this.exhaustionTickEl) {
      if (isExhausted) {
        const recoveryRatio = bus?.recoveryThresholdRatio ?? 0.20;
        const recoveryStamina = maxStamina * recoveryRatio;
        const recoveryStaminaEnergy = recoveryStamina * maxPower;
        const recoveryPct = energyCap > 0 ? Math.max(0, Math.min(100, (recoveryStaminaEnergy / energyCap) * 100)) : 10;
        this.exhaustionTickEl.style.left = `${recoveryPct.toFixed(2)}%`;
        this.exhaustionTickEl.style.display = "block";
      } else {
        this.exhaustionTickEl.style.display = "none";
      }
    }
  }
}
