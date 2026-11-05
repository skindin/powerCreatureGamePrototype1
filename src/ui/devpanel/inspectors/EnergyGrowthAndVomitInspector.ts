import type { Character } from "../../../character/Character.js";
import {
  EnergyGrowthModule,
  type GrowthCurveMode,
} from "../../../character/EnergyGrowthModule.js";
import { EnergyGrowthCapability } from "../../../character/capabilities/EnergyGrowthCapability.js";
import { PropertyControl } from "../../PropertyControl.js";
import type { DevPanel } from "../../DevPanel.js";

/**
 * Isolated DevPanel inspector for Scale With Energy (EnergyGrowthModule)
 * and Projectile Vomit (VomitModule).
 */
export class EnergyGrowthAndVomitInspector {
  public static bindControls(
    panel: DevPanel,
    container: HTMLElement,
    char: Character
  ): void {
    // 1. Scale With Energy (EnergyGrowthModule)
    const growthRoot = container.querySelector("#energy-growth-inspector-root") as HTMLElement | null;
    if (growthRoot && char.energyGrowthModule) {
      this.renderAndBindEnergyGrowth(panel, growthRoot, char);
    }

    // 2. Projectile Vomit (VomitModule)
    const vomitRoot = container.querySelector("#vomit-inspector-root") as HTMLElement | null;
    if (vomitRoot && char.vomitModule) {
      this.renderAndBindVomit(panel, vomitRoot, char);
    }
  }

  private static renderAndBindEnergyGrowth(
    panel: DevPanel,
    root: HTMLElement,
    char: Character
  ): void {
    const eg = char.energyGrowthModule;
    if (!eg) return;

    const availableProps = EnergyGrowthModule.getAvailableProperties(char);
    const attachedKeys = new Set(eg.scaledProperties.map((r) => r.propertyKey || r.key || ""));
    const unattachedProps = availableProps.filter((p) => !attachedKeys.has(p.key));

    const findLabel = (key: string): string => {
      const found = availableProps.find((p) => p.key === key);
      return found ? `${found.moduleLabel || found.category} → ${found.label}` : key;
    };

    root.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
        <!-- Master Scale Multipliers (Min / Starting / Max) -->
        <div style="background: rgba(15, 23, 42, 0.55); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 5px; padding: 8px;">
          <div style="font-size: 0.72rem; font-weight: 700; color: #38bdf8; text-transform: uppercase; margin-bottom: 6px;">
            Master Scale Multipliers (1.0x = Module Card Values)
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
            <div>
              <label style="font-size: 0.68rem; color: #94a3b8; display: block; margin-bottom: 2px;">Min (0 J)</label>
              <input type="number" id="input-eg-min-mult" step="0.05" min="0.05" max="10" value="${eg.minScaleMultiplier}" style="width: 100%; padding: 3px 5px; font-size: 0.78rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(148,163,184,0.3); border-radius: 4px;" />
            </div>
            <div>
              <label style="font-size: 0.68rem; color: #22c55e; display: block; margin-bottom: 2px;">Starting</label>
              <input type="number" id="input-eg-start-mult" step="0.05" min="0.05" max="10" value="${eg.startingScaleMultiplier}" style="width: 100%; padding: 3px 5px; font-size: 0.78rem; background: #0f172a; color: #22c55e; font-weight: 700; border: 1px solid rgba(34,197,94,0.4); border-radius: 4px;" />
            </div>
            <div>
              <label style="font-size: 0.68rem; color: #eab308; display: block; margin-bottom: 2px;">Max (Full J)</label>
              <input type="number" id="input-eg-max-mult" step="0.05" min="0.1" max="20" value="${eg.maxScaleMultiplier}" style="width: 100%; padding: 3px 5px; font-size: 0.78rem; background: #0f172a; color: #eab308; border: 1px solid rgba(234,179,8,0.4); border-radius: 4px;" />
            </div>
          </div>
          <button type="button" id="btn-eg-apply-start" class="btn-secondary-action" style="width: 100%; margin-top: 6px; padding: 4px 8px; font-size: 0.72rem; color: #22c55e; border-color: rgba(34, 197, 94, 0.35);">
            ↺ Set Current Energy to Starting Scale (${eg.startingScaleMultiplier}x)
          </button>
        </div>

        <!-- Automatic Body Scaling Toggles -->
        <div style="background: rgba(15, 23, 42, 0.55); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 5px; padding: 8px; display: flex; flex-direction: column; gap: 4px;">
          <div style="font-size: 0.72rem; font-weight: 700; color: #38bdf8; text-transform: uppercase; margin-bottom: 2px;">
            Automatic Body Scaling
          </div>
          <label style="display: flex; align-items: center; justify-content: space-between; font-size: 0.76rem; color: #cbd5e1; cursor: pointer;">
            <span>Scale Mass (Linear with Energy)</span>
            <input type="checkbox" id="chk-eg-scale-mass" ${eg.scaleMass ? "checked" : ""} />
          </label>
          <label style="display: flex; align-items: center; justify-content: space-between; font-size: 0.76rem; color: #cbd5e1; cursor: pointer;">
            <span>Scale Collider Radius (Cube Root of Mass)</span>
            <input type="checkbox" id="chk-eg-scale-collider" ${eg.scaleCollider ? "checked" : ""} />
          </label>
          <label style="display: flex; align-items: center; justify-content: space-between; font-size: 0.76rem; color: #cbd5e1; cursor: pointer;">
            <span>Scale Visual Sprite Radius (Cube Root of Mass)</span>
            <input type="checkbox" id="chk-eg-scale-sprite" ${eg.scaleSprite ? "checked" : ""} />
          </label>
          <label style="display: flex; align-items: center; justify-content: space-between; font-size: 0.76rem; color: #cbd5e1; cursor: pointer;">
            <span>Keep Pickup Reach Margin Outside Collider</span>
            <input type="checkbox" id="chk-eg-scale-reach" ${eg.autoScaleReachWithCollider ? "checked" : ""} />
          </label>
        </div>

        <!-- Connected Module Properties List Box -->
        <div style="background: rgba(15, 23, 42, 0.55); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 5px; padding: 8px; display: flex; flex-direction: column; gap: 6px;">
          <div style="font-size: 0.72rem; font-weight: 700; color: #38bdf8; text-transform: uppercase;">
            Connected Module Properties (${eg.scaledProperties.length})
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${
              eg.scaledProperties.length === 0
                ? `<div style="font-size: 0.72rem; color: #64748b; text-align: center; padding: 8px;">No module properties connected yet. Add one below!</div>`
                : eg.scaledProperties
                    .map((rule, idx) => {
                      const propKey = rule.propertyKey || rule.key || "";
                      const curve = rule.curveMode || rule.curve || "cross_section";
                      const baseVal = eg.baseValues[propKey];
                      const baseStr = baseVal !== undefined ? `1.0x Base: ${baseVal.toFixed(2)}` : "";
                      return `
                        <div style="background: rgba(2, 6, 23, 0.65); border: 1px solid rgba(148, 163, 184, 0.22); border-radius: 4px; padding: 6px;">
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <span style="font-size: 0.73rem; font-weight: 600; color: #e2e8f0;">${findLabel(propKey)}</span>
                            <div style="display: flex; align-items: center; gap: 6px;">
                              <span style="font-size: 0.66rem; color: #94a3b8; font-family: monospace;">${baseStr}</span>
                              <button type="button" class="btn-eg-remove-prop" data-rule-idx="${idx}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 0.75rem; padding: 0 3px;" title="Disconnect property">✕</button>
                            </div>
                          </div>
                          <div style="display: grid; grid-template-columns: 1fr 70px; gap: 6px; align-items: center;">
                            <select class="select-eg-curve dev-select" data-rule-idx="${idx}" style="font-size: 0.70rem; padding: 2px 4px; width: 100%;">
                              <option value="cross_section" ${curve === "cross_section" ? "selected" : ""}>Muscle / Area (M^2/3)</option>
                              <option value="cbrt" ${curve === "cbrt" ? "selected" : ""}>Radius / Stride (M^1/3)</option>
                              <option value="linear" ${curve === "linear" ? "selected" : ""}>Volume / Mass (M^1)</option>
                              <option value="custom" ${curve === "custom" ? "selected" : ""}>Custom Exponent</option>
                            </select>
                            <div style="display: flex; align-items: center; gap: 3px;" title="Rate Multiplier (1.0 = full curve rate)">
                              <span style="font-size: 0.65rem; color: #94a3b8;">Rate:</span>
                              <input type="number" class="input-eg-rate" data-rule-idx="${idx}" step="0.1" value="${rule.rateMultiplier ?? 1.0}" style="width: 100%; padding: 2px 4px; font-size: 0.72rem; background: #0f172a; color: #fff; border: 1px solid rgba(148,163,184,0.3); border-radius: 3px;" />
                            </div>
                          </div>
                          ${
                            curve === "custom"
                              ? `
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
                              <span style="font-size: 0.68rem; color: #94a3b8;">Custom Exponent (M^exp):</span>
                              <input type="number" class="input-eg-custom-exp" data-rule-idx="${idx}" step="0.05" value="${rule.customExponent ?? 1.0}" style="width: 70px; padding: 2px 4px; font-size: 0.72rem; background: #0f172a; color: #fff; border: 1px solid rgba(148,163,184,0.3); border-radius: 3px;" />
                            </div>
                          `
                              : ""
                          }
                        </div>
                      `;
                    })
                    .join("")
            }
          </div>

          <!-- + Add Property to Scale Row -->
          <div style="display: flex; gap: 6px; margin-top: 4px; padding-top: 6px; border-top: 1px dashed rgba(148, 163, 184, 0.2);">
            <select id="select-eg-add-prop" class="dev-select" style="flex: 1; font-size: 0.72rem; padding: 4px 6px;">
              ${
                unattachedProps.length === 0
                  ? `<option value="">All available properties connected</option>`
                  : `<option value="">+ Select property to scale...</option>` +
                    unattachedProps
                      .map(
                        (p) =>
                          `<option value="${p.key}" data-default-curve="${p.defaultCurve}">${p.moduleLabel || p.category}: ${p.label}</option>`
                      )
                      .join("")
              }
            </select>
            <button type="button" id="btn-eg-add-prop" class="btn-secondary-action" ${unattachedProps.length === 0 ? "disabled" : ""} style="padding: 4px 10px; font-size: 0.72rem; color: #38bdf8; border-color: rgba(56, 189, 248, 0.4); white-space: nowrap;">
              + Add
            </button>
          </div>
        </div>

        <button type="button" id="btn-eg-save-prefab" class="btn-secondary-action" style="width: 100%; padding: 5px 8px; font-size: 0.74rem; font-weight: 600; color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);">
          💾 Save Scale With Energy Settings to Prefab
        </button>
      </div>
    `;

    const applyLiveGrowth = () => {
      EnergyGrowthCapability.tick(char);
      panel.markDirty("player", char);
    };

    const btnSavePrefab = root.querySelector("#btn-eg-save-prefab") as HTMLButtonElement | null;
    btnSavePrefab?.addEventListener("click", () => {
      void panel.saveModuleToPrefab("energyGrowth");
    });

    const minInput = root.querySelector("#input-eg-min-mult") as HTMLInputElement | null;
    minInput?.addEventListener("change", () => {
      const val = parseFloat(minInput.value);
      if (Number.isFinite(val) && val > 0) {
        eg.minScaleMultiplier = val;
        applyLiveGrowth();
      }
    });

    const startInput = root.querySelector("#input-eg-start-mult") as HTMLInputElement | null;
    startInput?.addEventListener("change", () => {
      const val = parseFloat(startInput.value);
      if (Number.isFinite(val) && val > 0) {
        eg.startingScaleMultiplier = val;
        applyLiveGrowth();
        this.renderAndBindEnergyGrowth(panel, root, char);
      }
    });

    const maxInput = root.querySelector("#input-eg-max-mult") as HTMLInputElement | null;
    maxInput?.addEventListener("change", () => {
      const val = parseFloat(maxInput.value);
      if (Number.isFinite(val) && val > 0) {
        eg.maxScaleMultiplier = val;
        applyLiveGrowth();
      }
    });

    const btnApplyStart = root.querySelector("#btn-eg-apply-start") as HTMLButtonElement | null;
    btnApplyStart?.addEventListener("click", () => {
      if (char.energyPool) {
        const frac = eg.getStartingEnergyFraction();
        const maxE = char.energyPool.getMaxEnergy(char.properties);
        char.energyPool.setCurrentEnergy(frac * maxE, char.properties);
        applyLiveGrowth();
        panel.updateInspector();
      }
    });

    const chkMass = root.querySelector("#chk-eg-scale-mass") as HTMLInputElement | null;
    chkMass?.addEventListener("change", () => {
      eg.scaleMass = chkMass.checked;
      if (!eg.scaleMass && eg.baseValues["mass"] !== undefined) {
        char.mass = eg.baseValues["mass"];
      }
      applyLiveGrowth();
    });

    const chkCol = root.querySelector("#chk-eg-scale-collider") as HTMLInputElement | null;
    chkCol?.addEventListener("change", () => {
      eg.scaleCollider = chkCol.checked;
      if (!eg.scaleCollider && eg.baseValues["colliderRadius"] !== undefined) {
        char.colliderRadius = eg.baseValues["colliderRadius"];
        if (char.colliderModule) char.colliderModule.radius = eg.baseValues["colliderRadius"];
      }
      applyLiveGrowth();
    });

    const chkSprite = root.querySelector("#chk-eg-scale-sprite") as HTMLInputElement | null;
    chkSprite?.addEventListener("change", () => {
      eg.scaleSprite = chkSprite.checked;
      applyLiveGrowth();
    });

    const chkReach = root.querySelector("#chk-eg-scale-reach") as HTMLInputElement | null;
    chkReach?.addEventListener("change", () => {
      eg.autoScaleReachWithCollider = chkReach.checked;
      if (!eg.autoScaleReachWithCollider && eg.baseValues["pickupReach"] !== undefined && char.pickupModule) {
        char.pickupModule.pickupReachProp.set(eg.baseValues["pickupReach"], char.properties);
      }
      applyLiveGrowth();
    });

    root.querySelectorAll(".select-eg-curve").forEach((sel) => {
      sel.addEventListener("change", () => {
        const idx = Number((sel as HTMLElement).dataset.ruleIdx);
        const rule = eg.scaledProperties[idx];
        if (rule) {
          const val = (sel as HTMLSelectElement).value as GrowthCurveMode;
          rule.curveMode = val;
          rule.curve = val;
          applyLiveGrowth();
          this.renderAndBindEnergyGrowth(panel, root, char);
        }
      });
    });

    root.querySelectorAll(".input-eg-rate").forEach((inp) => {
      inp.addEventListener("change", () => {
        const idx = Number((inp as HTMLElement).dataset.ruleIdx);
        const rule = eg.scaledProperties[idx];
        const val = parseFloat((inp as HTMLInputElement).value);
        if (rule && Number.isFinite(val)) {
          rule.rateMultiplier = val;
          applyLiveGrowth();
        }
      });
    });

    root.querySelectorAll(".input-eg-custom-exp").forEach((inp) => {
      inp.addEventListener("change", () => {
        const idx = Number((inp as HTMLElement).dataset.ruleIdx);
        const rule = eg.scaledProperties[idx];
        const val = parseFloat((inp as HTMLInputElement).value);
        if (rule && Number.isFinite(val)) {
          rule.customExponent = val;
          applyLiveGrowth();
        }
      });
    });

    root.querySelectorAll(".btn-eg-remove-prop").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number((btn as HTMLElement).dataset.ruleIdx);
        const removed = eg.scaledProperties.splice(idx, 1)[0];
        const rKey = removed?.propertyKey || removed?.key;
        if (rKey && eg.baseValues[rKey] !== undefined) {
          const propDef = availableProps.find((p) => p.key === rKey);
          if (propDef) {
            propDef.applyValue(char, eg.baseValues[rKey]);
          }
        }
        applyLiveGrowth();
        this.renderAndBindEnergyGrowth(panel, root, char);
      });
    });

    const selectAdd = root.querySelector("#select-eg-add-prop") as HTMLSelectElement | null;
    const btnAdd = root.querySelector("#btn-eg-add-prop") as HTMLButtonElement | null;
    btnAdd?.addEventListener("click", () => {
      if (!selectAdd || !selectAdd.value) return;
      const key = selectAdd.value;
      const selectedOpt = selectAdd.selectedOptions[0];
      const defaultCurve = (selectedOpt?.dataset.defaultCurve as GrowthCurveMode) || "cross_section";
      eg.scaledProperties.push({
        propertyKey: key,
        key,
        enabled: true,
        curveMode: defaultCurve,
        curve: defaultCurve,
        customExponent: 1.0,
        rateMultiplier: 1.0,
      });
      applyLiveGrowth();
      this.renderAndBindEnergyGrowth(panel, root, char);
    });
  }

  private static renderAndBindVomit(
    panel: DevPanel,
    root: HTMLElement,
    char: Character
  ): void {
    const vm = char.vomitModule;
    if (!vm) return;

    root.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px;">
        <div id="prop-socket-vomit-energy"></div>
        <div id="prop-socket-vomit-floor"></div>
        <div id="prop-socket-vomit-speed"></div>
        <div id="prop-socket-vomit-vert-speed"></div>
        <div id="prop-socket-vomit-cooldown"></div>
        <div id="prop-socket-vomit-recoil"></div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
          <span style="font-size: 0.76rem; color: #cbd5e1;">Glob Color</span>
          <input type="color" id="input-vomit-color" value="${vm.globColor}" style="width: 44px; height: 22px; background: transparent; border: none; cursor: pointer;" />
        </div>
        <button type="button" id="btn-test-vomit" class="btn-secondary-action" style="margin-top: 6px; padding: 5px 8px; font-size: 0.75rem; color: #84cc16; border-color: rgba(132, 204, 22, 0.4);">
          🤮 Eject Vomit Glob Now
        </button>
      </div>
    `;

    const bindProp = (sel: string, prop: any, label: string, step: number) => {
      const el = root.querySelector(sel);
      if (el && prop) {
        const ctrl = new PropertyControl({
          property: prop,
          owner: char,
          label,
          step,
        });
        el.appendChild(ctrl.element);
      }
    };

    bindProp("#prop-socket-vomit-energy", vm.energyPerGlobProp, "Energy Per Glob (J)", 100);
    bindProp("#prop-socket-vomit-floor", vm.minRemainingEnergyFloorProp, "Min Remaining Energy Floor (J)", 100);
    bindProp("#prop-socket-vomit-speed", vm.launchSpeedProp, "Launch Speed (u/s)", 0.5);
    bindProp("#prop-socket-vomit-vert-speed", vm.launchVerticalSpeedProp, "Vertical Launch Speed (u/s)", 0.5);
    bindProp("#prop-socket-vomit-cooldown", vm.cooldownSecondsProp, "Cooldown (s)", 0.05);
    bindProp("#prop-socket-vomit-recoil", vm.recoilMultiplierProp, "Recoil Multiplier (×)", 0.1);

    const colorInput = root.querySelector("#input-vomit-color") as HTMLInputElement | null;
    colorInput?.addEventListener("change", () => {
      vm.globColor = colorInput.value;
      panel.markDirty("player", char);
    });

    const btnTest = root.querySelector("#btn-test-vomit") as HTMLButtonElement | null;
    btnTest?.addEventListener("click", () => {
      char.vomit();
      panel.updateInspector();
    });
  }

  public static updateLiveTelemetry(char: Character): void {
    if (!char.energyGrowthModule) return;
    const label = document.getElementById("label-energy-growth-live");
    if (label) {
      const eg = char.energyGrowthModule;
      label.textContent = `${eg.currentMassScale.toFixed(2)}x Mass / ${eg.currentRadiusScale.toFixed(2)}x Size`;
    }
  }
}
