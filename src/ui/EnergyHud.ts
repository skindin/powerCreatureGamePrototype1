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
  private healthBaselineLineEl: HTMLElement | null = null;

  // DOM Elements - Right Column: Energy & Power System
  private powerTagsEl: HTMLElement | null = null;
  private powerBlocksContainerEl: HTMLElement | null = null;
  private energyFillEl: HTMLElement | null = null;
  private lowerStaminaFillEl: HTMLElement | null = null;
  private laserStaminaFillEl: HTMLElement | null = null;
  private staminaCapTickEl: HTMLElement | null = null;
  private exhaustionTickEl: HTMLElement | null = null;
  private laserExhaustionTickEl: HTMLElement | null = null;
  private energyBaselineLineEl: HTMLElement | null = null;

  public isCollapsed: boolean = false;
  private lastUpdateTime: number = 0;
  private lastTargetCharacter: Character | null = null;

  // Smooth visual state tracking for status bars (never snaps instantly, lerps down/up smoothly over frames)
  private visualHpPct: number = -1;
  private visualEnergyPct: number = -1;
  private visualMainStaminaPct: number = -1;

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
                <!-- Clear White Line for Current Health Threshold -->
                <div id="line-hud-health-baseline" class="hud-baseline-line" style="left: 100%;" title="Current Health Threshold"></div>
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
                <!-- Row 1: Main Bus Stamina (Emerald, Joules) -->
                <div id="bar-hud-lower-stamina" class="hud-bar-layer hud-bar-lower-stamina" title="Main Stamina (J)"></div>

                <!-- Exhaustion Recovery Tick Mark (Red notch shown when exhausted) -->
                <div id="tick-hud-exhaustion-recovery" class="hud-cap-tick hud-cap-exhaustion" style="left: 10%; display: none;" title="Exhaustion Recovery Threshold">
                  <div class="hud-cap-line hud-cap-exhaustion-line"></div>
                </div>

                <!-- Stamina Cap Tick Notch (Green) -->
                <div id="tick-hud-max-stamina" class="hud-cap-tick hud-cap-stamina" style="left: 50%; display: none;">
                  <div class="hud-cap-line hud-cap-stamina-line"></div>
                </div>

                <!-- Row 2: Energy Reservoir Fill (Amber - expanded into space left behind by laser stamina) -->
                <div id="bar-hud-energy-fill" class="hud-bar-layer hud-bar-energy" title="Energy Reservoir"></div>

                <!-- Row 2 Overlay: Active Energy Modifiers Container (Embedded color-coded segments) -->
                <div id="hud-power-blocks-container" class="hud-power-blocks-container"></div>

                <!-- Clear White Line for Current Energy Threshold -->
                <div id="line-hud-energy-baseline" class="hud-baseline-line" style="left: 100%;" title="Current Energy Threshold"></div>
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
    this.healthBaselineLineEl = hudWrapper.querySelector("#line-hud-health-baseline");

    // Grab element handles - Energy & Power System
    this.powerTagsEl = hudWrapper.querySelector("#energy-hud-power-tags");
    this.powerBlocksContainerEl = hudWrapper.querySelector("#hud-power-blocks-container");
    this.energyFillEl = hudWrapper.querySelector("#bar-hud-energy-fill");
    this.lowerStaminaFillEl = hudWrapper.querySelector("#bar-hud-lower-stamina");
    this.laserStaminaFillEl = hudWrapper.querySelector("#bar-hud-laser-stamina");
    this.staminaCapTickEl = hudWrapper.querySelector("#tick-hud-max-stamina");
    this.exhaustionTickEl = hudWrapper.querySelector("#tick-hud-exhaustion-recovery");
    this.laserExhaustionTickEl = hudWrapper.querySelector("#tick-hud-laser-exhaustion-recovery");
    this.energyBaselineLineEl = hudWrapper.querySelector("#line-hud-energy-baseline");
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
   * Helper to smoothly interpolate a percentage towards target over frames without instant snaps.
   */
  private smoothPct(current: number, target: number, rate: number, dt: number): number {
    if (current < 0) return target;
    const diff = target - current;
    if (Math.abs(diff) < 0.05) return target;
    return current + diff * (1 - Math.exp(-rate * dt));
  }

  /**
   * Renders color-coded blocks for health modifiers directly embedded inside the Health bar.
   * - Subtracting modifiers (damage, aura, poison) render ON TOP OF and COMPLETELY WITHIN the health block.
   * - Their right edge is anchored at visualHpPct, while their inner (left) edge lerps away from and towards that edge.
   * - Positive modifiers (healing) extend outward to the right of visualHpPct.
   * - The white baseline line sits precisely at visualHpPct as the divider.
   */
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
        // Starts at 0 so the inner edge smoothly expands away from the right edge!
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

    // Split into negative (subtracting: continuous and instant) and positive (healing)
    const positiveBlocks = sortedBlocks.filter(b => b.isPositive);
    const negativeBlocks = sortedBlocks.filter(b => !b.isPositive);

    let blocksHtml = "";

    // 1. Subtracting Modifiers (Damage, Aura, Hits):
    // Rendered ON TOP OF and COMPLETELY WITHIN the health block.
    // Right edge is anchored at visualHpPct, left edge (inside edge) lerps away from and towards that edge!
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
    // Placed extending OUTWARD to the right of visualHpPct (outside the health block)
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

  /**
   * Renders color-coded blocks for energy modifiers directly embedded inside the Energy reservoir bar.
   * - Subtracting modifiers (burst jump/throw, continuous power draws) render ON TOP OF and COMPLETELY WITHIN the energy block.
   * - Their right edge is anchored at visualEnergyPct, while their inner (left) edge lerps away from and towards that edge.
   * - Positive modifiers (nutrition from food) extend outward to the right of visualEnergyPct.
   * - The white baseline line sits precisely at visualEnergyPct as the divider.
   */
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

    // Collect allocations across ALL active busses on the character (Main Bus, Laser Bus, etc.)
    const allocations: any[] = [];
    const activeAbilityKeys = new Set<string>();

    if (_char.energyPool && _char.energyPool.enabled) {
      for (const a of _char.energyPool.getActiveAllocations(_char.properties)) {
        // For instant bursts, use demandedJoules/demandedWatts so full reservoir cost is visualized
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

    // If character is actively consuming an item, register an incoming positive energy modifier (+Watts)
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

    // Anticipated Modifiers: Preview energy costs for uncommitted actions (e.g. Throw trajectory preview, Laser aiming)
    const anticipatedMods = _char.getAnticipatedModifiers ? _char.getAnticipatedModifiers() : [];
    for (const ant of anticipatedMods) {
      const canonicalKey = ant.abilityId || ant.id;
      // If the ability is ALREADY actively drawing power, ignore anticipated preview to avoid duplication/spikes!
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

    // Track active allocations using canonical key
    const activeKeys = new Set<string>();
    for (const alloc of allocations) {
      if (alloc.grantedWatts <= 0.001) continue;
      activeKeys.add(alloc.key);

      let vb = this.visualBlocks.get(alloc.key);
      if (!vb) {
        // Starts at 0 so its inner edge smoothly lerps away from the right edge!
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

    // Deactivated blocks target 0 so their inner edge smoothly shrinks back towards the right edge
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

    // Base energy fill and white baseline line track visualEnergyPct smoothly
    if (this.energyFillEl) {
      this.energyFillEl.style.width = `${visualEnergyPct.toFixed(2)}%`;
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
      this.powerTagsEl.innerHTML = "";
      return;
    }

    // Split into negative (subtracting: bursts, draws, anticipated) and positive (eating/generation)
    const positiveBlocks = sortedBlocks.filter(b => b.isPositive);
    const negativeBlocks = sortedBlocks.filter(b => !b.isPositive);

    let blocksHtml = "";

    // 1. Subtracting Modifiers (Bursts, Power Draws, Anticipated Costs):
    // Rendered ON TOP OF and COMPLETELY WITHIN the energy block.
    // Right edge is anchored at visualEnergyPct, left edge (inside edge) lerps away from and towards that edge!
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

    // 2. Positive Modifiers (Energy Generation, e.g. Eating food):
    // Placed extending OUTWARD to the right of visualEnergyPct (outside the energy block)
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

    // Main Stamina now takes up the whole width (100% of row represents maxStamina)
    const targetMainStaminaPct = maxStamina > 0 ? Math.max(0, Math.min(100, (curStamina / maxStamina) * 100)) : 0;

    // Initialize visual percentages on first load so there is no initial false lerp
    if (this.visualHpPct < 0) this.visualHpPct = targetHpPct;
    if (this.visualEnergyPct < 0) this.visualEnergyPct = targetEnergyPct;
    if (this.visualMainStaminaPct < 0) this.visualMainStaminaPct = targetMainStaminaPct;

    // Smooth status bar decays over a couple frames (rate ~12.0 = ~8-14 frames smooth decay)
    this.visualHpPct = this.smoothPct(this.visualHpPct, targetHpPct, 12.0, dt);
    this.visualEnergyPct = this.smoothPct(this.visualEnergyPct, targetEnergyPct, 12.0, dt);
    this.visualMainStaminaPct = this.smoothPct(this.visualMainStaminaPct, targetMainStaminaPct, 14.0, dt);

    if (this.isCollapsed) return;

    // =========================================================================
    // 1. LEFT COLUMN: HEALTH SYSTEM
    // =========================================================================
    this.renderHealthModBlocks(char, healthMod, maxHp, curHp, dt, this.visualHpPct);

    // =========================================================================
    // 2. RIGHT COLUMN: ENERGY & POWER SYSTEM
    // =========================================================================
    this.renderPowerBlocks(char, maxEnergy, curEnergy, dt, infiniteEnergy, this.visualEnergyPct);

    // Current Stamina Fill (Solid Emerald on Row 1) - tracks visualMainStaminaPct smoothly across full row
    if (this.lowerStaminaFillEl) {
      this.lowerStaminaFillEl.style.width = `${this.visualMainStaminaPct.toFixed(2)}%`;
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

    // Stamina Cap Tick Notch: hidden since main stamina now occupies the full row width
    if (this.staminaCapTickEl) {
      this.staminaCapTickEl.style.display = "none";
    }

    // Exhaustion Recovery Tick Notch (Red tick indicating when player will not be exhausted anymore)
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

    if (this.laserStaminaFillEl) {
      this.laserStaminaFillEl.style.display = "none";
    }
    if (this.laserExhaustionTickEl) {
      this.laserExhaustionTickEl.style.display = "none";
    }
  }
}
