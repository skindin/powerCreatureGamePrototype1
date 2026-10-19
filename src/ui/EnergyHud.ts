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
  private laserStaminaFillEl: HTMLElement | null = null;
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
            <!-- Active Health Modifier Tags Row (Shows HP/s for continuous, HP for instant) -->
            <div id="health-hud-mod-tags" class="hud-power-tags-layer hud-health-tags-layer"></div>

            <!-- Unified Track: Health Bar Fill with Heart Symbol & Embedded Modifiers -->
            <div class="energy-hud-track-wrapper hud-track-row" title="Health (HP)">
              <div class="hud-bar-icon-wrap" title="Health">
                <span class="hud-bar-icon hud-icon-health">❤</span>
              </div>
              <div class="energy-hud-track energy-hud-track-main energy-hud-track-health" id="health-hud-track-bar">
                <!-- Current Health Fill (Ruby / Crimson Gradient) -->
                <div id="bar-hud-health-fill" class="hud-bar-layer hud-bar-health" title="Health"></div>
                <!-- Embedded Active Health Modifiers Container -->
                <div id="hud-health-mods-container" class="hud-power-blocks-container"></div>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: ENERGY & POWER SYSTEM -->
          <div class="hud-column hud-column-energy" title="Energy & Power">
            <!-- Active Ability Tags Row (Shows energy amount with /s for time-based abilities) -->
            <div id="energy-hud-power-tags" class="hud-power-tags-layer"></div>

            <!-- Unified Track: Energy, Multi-Bus Stamina, and Embedded Modifiers -->
            <div class="energy-hud-track-wrapper hud-track-row" title="Energy & Stamina">
              <div class="hud-bar-icon-wrap" title="Energy">
                <span class="hud-bar-icon hud-icon-energy">⚡</span>
              </div>
              <div class="energy-hud-track energy-hud-track-main energy-hud-track-reservoir" id="energy-hud-track-reservoir">
                <!-- Row 1: Main Bus Stamina (Emerald, 10s) -->
                <div id="bar-hud-lower-stamina" class="hud-bar-layer hud-bar-lower-stamina" title="Main Stamina (10s)"></div>

                <!-- Row 2: Laser Bus Stamina (Smaller row, Bright Cyan, 5s) -->
                <div id="bar-hud-laser-stamina" class="hud-bar-layer hud-bar-laser-stamina" title="Laser Stamina (5s)"></div>

                <!-- Exhaustion Recovery Tick Mark (Red notch shown when exhausted) -->
                <div id="tick-hud-exhaustion-recovery" class="hud-cap-tick hud-cap-exhaustion" style="left: 10%; display: none;" title="Exhaustion Recovery Threshold">
                  <div class="hud-cap-line hud-cap-exhaustion-line"></div>
                </div>

                <!-- Stamina Cap Tick Notch (Green) -->
                <div id="tick-hud-max-stamina" class="hud-cap-tick hud-cap-stamina" style="left: 50%;">
                  <div class="hud-cap-line hud-cap-stamina-line"></div>
                </div>

                <!-- Row 3: Energy Reservoir Fill (Amber) -->
                <div id="bar-hud-energy-fill" class="hud-bar-layer hud-bar-energy" title="Energy Reservoir"></div>

                <!-- Row 3 Overlay: Active Energy Modifiers Container (Embedded color-coded segments) -->
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
    this.laserStaminaFillEl = hudWrapper.querySelector("#bar-hud-laser-stamina");
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
   * Renders color-coded blocks for health modifiers directly embedded inside the Health bar.
   * - Time-based modifiers occupy width proportional to windowed consumption (rate * windowSeconds).
   * - Negative modifiers (damage) sit at the leading edge of current health.
   * - Positive modifiers (healing) extend outward from current health.
   */
  private renderHealthModBlocks(
    _char: Character,
    healthMod: HealthModule | null,
    maxHp: number,
    curHp: number,
    dt: number
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

    const curHpPct = maxHp > 0 ? Math.max(0, Math.min(100, (curHp / maxHp) * 100)) : 0;
    const sortedBlocks = Array.from(this.visualHealthBlocks.values()).sort((a, b) => a.order - b.order);

    if (sortedBlocks.length === 0) {
      this.healthBlocksContainerEl.innerHTML = "";
      this.healthModTagsEl.innerHTML = "";
      if (this.healthFillEl) {
        this.healthFillEl.style.width = `${curHpPct.toFixed(2)}%`;
      }
      return;
    }

    const windowSeconds = this.gameLoop.renderer?.modHistoryWindowSeconds ?? 0.10;

    // Split into positive (healing) and negative (damage)
    const positiveBlocks = sortedBlocks.filter(b => b.isPositive);
    const negativeBlocks = sortedBlocks.filter(b => !b.isPositive);

    // Calculate windowed segment widths
    let totalNegPct = 0;
    const negBlockWidths: { vb: VisualHealthBlock; widthPct: number }[] = [];
    for (const vb of negativeBlocks) {
      if (vb.currentUnits <= 0.01) continue;
      const units = vb.isBurst ? vb.currentUnits : (vb.currentUnits * windowSeconds);
      const widthPct = Math.max(0.4, (units / Math.max(1, maxHp)) * 100);
      negBlockWidths.push({ vb, widthPct });
      totalNegPct += widthPct;
    }

    // Base health fill is pulled back by active damage segments embedded at its leading edge
    const baseFillPct = Math.max(0, curHpPct - totalNegPct);
    if (this.healthFillEl) {
      this.healthFillEl.style.width = `${baseFillPct.toFixed(2)}%`;
    }

    let blocksHtml = "";

    // 1. Negative Modifiers (Damage) - placed right after base health fill up to curHpPct
    let negLeftPct = baseFillPct;
    for (const { vb, widthPct } of negBlockWidths) {
      const units = vb.isBurst ? vb.stableUnits : (vb.stableUnits * windowSeconds);
      blocksHtml += `
        <div class="hud-power-block hud-block-neg" style="left: ${negLeftPct.toFixed(2)}%; width: ${widthPct.toFixed(2)}%; top: 0; height: 100%; background: ${vb.color}; border-right: 1.5px solid rgba(255, 255, 255, 0.85);" title="${vb.name}: -${Math.round(vb.stableUnits)}${vb.isBurst ? "" : "/s"} (${units.toFixed(1)} HP in ${windowSeconds.toFixed(2)}s window)"></div>
      `;
      negLeftPct += widthPct;
    }

    // 2. Positive Modifiers (Healing) - placed extending outward from curHpPct
    let posLeftPct = curHpPct;
    for (const vb of positiveBlocks) {
      if (vb.currentUnits <= 0.01) continue;
      const units = vb.isBurst ? vb.currentUnits : (vb.currentUnits * windowSeconds);
      const widthPct = Math.max(0.4, (units / Math.max(1, maxHp)) * 100);
      blocksHtml += `
        <div class="hud-power-block hud-block-pos" style="left: ${posLeftPct.toFixed(2)}%; width: ${widthPct.toFixed(2)}%; top: 0; height: 100%; background: ${vb.color};" title="${vb.name}: +${Math.round(vb.stableUnits)}${vb.isBurst ? "" : "/s"} (${units.toFixed(1)} HP in ${windowSeconds.toFixed(2)}s window)"></div>
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

  /**
   * Renders color-coded blocks for energy modifiers directly embedded inside the Energy reservoir bar.
   * - Time-based modifiers occupy width proportional to windowed consumption (Watts * windowSeconds).
   * - Considers allocations from all active busses (bus_main, bus_laser, etc.).
   * - Negative modifiers (power draws) sit at the leading edge of current energy.
   * - Positive modifiers (nutrition) extend outward from current energy.
   */
  private renderPowerBlocks(
    _char: Character,
    maxEnergy: number,
    curEnergy: number,
    dt: number,
    infiniteEnergy: boolean
  ): void {
    if (!this.powerBlocksContainerEl || !this.powerTagsEl) return;

    // Collect allocations across ALL active busses on the character (Main Bus, Laser Bus, etc.)
    const allocations: any[] = [];
    if (_char.energyBusses && _char.energyBusses.size > 0) {
      for (const b of _char.energyBusses.values()) {
        if (b && b.enabled) {
          allocations.push(...b.getActiveAllocations(_char.properties));
        }
      }
    } else if (_char.energyBus && _char.energyBus.enabled) {
      allocations.push(..._char.energyBus.getActiveAllocations(_char.properties));
    }

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

    // Anticipated Modifiers: Preview energy costs for uncommitted actions (e.g. Throw trajectory preview, Laser aiming)
    const anticipatedMods = _char.getAnticipatedModifiers ? _char.getAnticipatedModifiers() : [];
    for (const ant of anticipatedMods) {
      allocations.push({
        id: ant.id,
        name: ant.name,
        color: ant.color,
        grantedWatts: ant.amount,
        allowPartialPower: false,
        isPositive: ant.isPositive ?? false,
        isBurst: ant.isBurst,
        order: ant.order ?? 950,
        isAnticipated: true,
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
          isAnticipated: (alloc as any).isAnticipated ?? false,
        };
        this.visualBlocks.set(alloc.id, vb);
      } else {
        vb.targetWatts = alloc.grantedWatts;
        vb.stableWatts = alloc.grantedWatts;
        vb.isBurst = alloc.isBurst ?? false;
        vb.allowPartialPower = alloc.allowPartialPower;
        vb.isPositive = (alloc as any).isPositive ?? false;
        vb.isAnticipated = (alloc as any).isAnticipated ?? false;
      }
    }

    // Deactivated blocks target 0 so they shrink smoothly back to 0
    for (const [id, vb] of this.visualBlocks.entries()) {
      if (!activeIds.has(id)) {
        vb.targetWatts = 0;
      }
    }

    // Smoothly interpolate currentWatts towards targetWatts
    for (const [id, vb] of this.visualBlocks.entries()) {
      if (vb.currentWatts < vb.targetWatts) {
        const attackRate = 18.0;
        vb.currentWatts += (vb.targetWatts - vb.currentWatts) * (1 - Math.exp(-attackRate * dt));
        if (Math.abs(vb.targetWatts - vb.currentWatts) < 0.5) {
          vb.currentWatts = vb.targetWatts;
        }
      } else if (vb.currentWatts > vb.targetWatts) {
        const decayRate = 14.0;
        vb.currentWatts += (vb.targetWatts - vb.currentWatts) * (1 - Math.exp(-decayRate * dt));
        if (vb.currentWatts < 0.5) {
          vb.currentWatts = 0;
        }
      }

      if (vb.currentWatts <= 0.01 && vb.targetWatts <= 0.001) {
        this.visualBlocks.delete(id);
      }
    }

    const energyCap = Math.max(100, maxEnergy);
    const curEnergyPct = infiniteEnergy ? 100 : Math.max(0, Math.min(100, (curEnergy / energyCap) * 100));
    const sortedBlocks = Array.from(this.visualBlocks.values()).sort((a, b) => a.order - b.order);

    if (sortedBlocks.length === 0) {
      this.powerBlocksContainerEl.innerHTML = "";
      this.powerTagsEl.innerHTML = "";
      if (this.energyFillEl) {
        this.energyFillEl.style.width = `${curEnergyPct.toFixed(2)}%`;
      }
      return;
    }

    const windowSeconds = this.gameLoop.renderer?.modHistoryWindowSeconds ?? 0.10;

    // Split into positive (energy gain) and negative (power consumption)
    const positiveBlocks = sortedBlocks.filter(b => b.isPositive);
    const negativeBlocks = sortedBlocks.filter(b => !b.isPositive);

    // Calculate windowed segment widths
    let totalNegPct = 0;
    const negBlockWidths: { vb: VisualPowerBlock; widthPct: number }[] = [];
    for (const vb of negativeBlocks) {
      if (vb.currentWatts <= 0.01) continue;
      const joules = vb.isBurst ? vb.currentWatts : (vb.currentWatts * windowSeconds);
      const widthPct = Math.max(0.4, (joules / energyCap) * 100);
      negBlockWidths.push({ vb, widthPct });
      totalNegPct += widthPct;
    }

    // Base energy fill is pulled back by active power draining segments embedded at its leading edge
    const baseEnergyPct = infiniteEnergy ? 100 : Math.max(0, curEnergyPct - totalNegPct);
    if (this.energyFillEl) {
      this.energyFillEl.style.width = `${baseEnergyPct.toFixed(2)}%`;
    }

    let blocksHtml = "";

    // 1. Negative Modifiers (Power Draws) - placed right after base energy fill up to curEnergyPct
    let negLeftPct = baseEnergyPct;
    for (const { vb, widthPct } of negBlockWidths) {
      const joules = vb.isBurst ? vb.stableWatts : (vb.stableWatts * windowSeconds);
      const anticipatedClass = vb.isAnticipated ? "hud-block-anticipated" : "";
      const borderStyle = vb.isAnticipated
        ? "border: 1.5px dotted rgba(255, 255, 255, 0.95); border-right: 1.5px dotted rgba(255, 255, 255, 0.95);"
        : "border-right: 1.5px solid rgba(255, 255, 255, 0.85);";
      const opacityStyle = vb.isAnticipated ? "opacity: 0.52;" : "";

      blocksHtml += `
        <div class="hud-power-block hud-block-neg ${anticipatedClass}" style="left: ${negLeftPct.toFixed(2)}%; width: ${widthPct.toFixed(2)}%; top: 0; height: 100%; background: ${vb.color}; ${borderStyle} ${opacityStyle}" title="${vb.name}${vb.isAnticipated ? " (Anticipated)" : ""}: -${Math.round(vb.stableWatts)}${vb.isBurst ? "" : "/s"} (${Math.round(joules)}J in ${windowSeconds.toFixed(2)}s window)"></div>
      `;
      negLeftPct += widthPct;
    }

    // 2. Positive Modifiers (Energy Generation, e.g. Eating food) - extending outward from curEnergyPct
    let posLeftPct = curEnergyPct;
    for (const vb of positiveBlocks) {
      if (vb.currentWatts <= 0.01) continue;
      const joules = vb.isBurst ? vb.currentWatts : (vb.currentWatts * windowSeconds);
      const widthPct = Math.max(0.4, (joules / energyCap) * 100);
      blocksHtml += `
        <div class="hud-power-block hud-block-pos" style="left: ${posLeftPct.toFixed(2)}%; width: ${widthPct.toFixed(2)}%; top: 0; height: 100%; background: ${vb.color};" title="${vb.name}: +${Math.round(vb.stableWatts)}${vb.isBurst ? "" : "/s"} (${Math.round(joules)}J in ${windowSeconds.toFixed(2)}s window)"></div>
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
    this.renderHealthModBlocks(char, healthMod, maxHp, curHp, dt);

    // =========================================================================
    // 2. RIGHT COLUMN: ENERGY & POWER SYSTEM
    // =========================================================================
    this.renderPowerBlocks(char, maxEnergy, curEnergy, dt, infiniteEnergy);

    const energyCap = Math.max(100, maxEnergy);

    // Current Stamina Fill (Solid Emerald on Row 1)
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

    // Laser Bus Stamina Fill (Bright Cyan on Row 2, 5s capacity)
    const laserBus = char.getEnergyBus("bus_laser");
    if (this.laserStaminaFillEl) {
      if (laserBus && laserBus.enabled) {
        this.laserStaminaFillEl.style.display = "block";
        const curLaserStamina = laserBus.getCurrentStamina(props);
        const maxLaserStamina = laserBus.getMaxStamina(props);
        const isLaserExhausted = laserBus.isExhausted;
        const laserStaminaRatio = maxLaserStamina > 0
          ? Math.max(0, Math.min(1, curLaserStamina / maxLaserStamina))
          : 0;
        this.laserStaminaFillEl.style.width = `${(laserStaminaRatio * 100).toFixed(2)}%`;
        if (isLaserExhausted) {
          this.laserStaminaFillEl.style.borderRight = "1.5px solid #fca5a5";
          this.laserStaminaFillEl.style.background = "linear-gradient(90deg, #991b1b, #dc2626, #ef4444)";
          this.laserStaminaFillEl.style.boxShadow = "0 0 6px rgba(239, 68, 68, 0.6)";
        } else {
          this.laserStaminaFillEl.style.borderRight = "1.5px solid #67e8f9";
          this.laserStaminaFillEl.style.background = "linear-gradient(90deg, #0284c7, #06b6d4, #22d3ee)";
          this.laserStaminaFillEl.style.boxShadow = "0 0 6px rgba(6, 182, 212, 0.4)";
        }
      } else {
        this.laserStaminaFillEl.style.display = "none";
      }
    }
  }
}
