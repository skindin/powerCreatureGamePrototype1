import type { Character } from "../../../character/Character.js";
import { PropertyControl } from "../../PropertyControl.js";
import type { DevPanel } from "../../DevPanel.js";
import { DevConfigPersistence } from "../DevConfigPersistence.js";

/**
 * Isolated 1-to-1 DevPanel inspector binder for EnergyPool & Stamina Reservoir.
 */
export class EnergyPoolInspector {
  public static bindControls(panel: DevPanel, char: Character): void {
    if (!char.energyPool) return;
    const container = (panel as any).container as HTMLElement;
    const ep = char.energyPool;

    const curEnergyEl = container.querySelector("#prop-socket-energy-cur");
    if (curEnergyEl) {
      const curCtrl = new PropertyControl({
        property: ep.currentEnergyProp,
        owner: char,
        label: "Current Energy (J)",
        step: 50.0,
      });
      curEnergyEl.appendChild(curCtrl.element);
    }

    const maxEnergyEl = container.querySelector("#prop-socket-energy-max");
    if (maxEnergyEl) {
      const maxCtrl = new PropertyControl({
        property: ep.maxEnergyProp,
        owner: char,
        label: "Max Energy Capacity (J)",
        step: 100.0,
      });
      maxEnergyEl.appendChild(maxCtrl.element);
    }

    const curStaminaEl = container.querySelector("#prop-socket-energy-stamina-cur");
    if (curStaminaEl) {
      const csCtrl = new PropertyControl({
        property: ep.currentStaminaProp,
        owner: char,
        label: "Current Stamina (Joules)",
        step: 50.0,
        min: 0.0,
      });
      curStaminaEl.appendChild(csCtrl.element);
    }

    const maxStaminaEl = container.querySelector("#prop-socket-energy-stamina-max");
    if (maxStaminaEl) {
      const msCtrl = new PropertyControl({
        property: ep.maxStaminaProp,
        owner: char,
        label: "Stamina Reservoir Capacity (Joules)",
        step: 100.0,
        min: 50.0,
        max: 50000.0,
      });
      maxStaminaEl.appendChild(msCtrl.element);
    }

    const regenEl = container.querySelector("#prop-socket-energy-stamina-regen");
    if (regenEl) {
      const rCtrl = new PropertyControl({
        property: ep.staminaRegenRateProp,
        owner: char,
        label: "Stamina Regen Rate (Watts = J/s)",
        step: 25.0,
        min: 0.0,
        max: 5000.0,
      });
      regenEl.appendChild(rCtrl.element);
    }

    const effEl = container.querySelector("#prop-socket-energy-efficiency");
    if (effEl) {
      const eCtrl = new PropertyControl({
        property: ep.muscleEfficiencyProp,
        owner: char,
        label: "Muscle Metabolic Efficiency (Ratio)",
        step: 0.05,
        min: 0.01,
        max: 1.0,
      });
      effEl.appendChild(eCtrl.element);
    }

    const sliderRecoveryThresh = container.querySelector("#slider-energy-recovery-thresh") as HTMLInputElement | null;
    const labelRecoveryThresh = container.querySelector("#label-energy-recovery-thresh") as HTMLElement | null;
    sliderRecoveryThresh?.addEventListener("input", (ev) => {
      const val = parseFloat((ev.target as HTMLInputElement).value);
      ep.recoveryThresholdRatio = val;
      if (labelRecoveryThresh) {
        labelRecoveryThresh.textContent = `${(val * 100).toFixed(0)}%`;
      }
    });

    const checkInfinite = container.querySelector("#check-energy-infinite") as HTMLInputElement;
    checkInfinite?.addEventListener("change", () => {
      ep.infiniteEnergy = checkInfinite.checked;
    });

    const checkAutoRefill = container.querySelector("#check-energy-autorefill") as HTMLInputElement;
    checkAutoRefill?.addEventListener("change", () => {
      ep.debugAutoRefillOnEmpty = checkAutoRefill.checked;
    });

    container.querySelector("#btn-energy-sub100")?.addEventListener("click", () => {
      ep.consume(100, char.properties);
      panel.updateInspector();
    });

    container.querySelector("#btn-energy-refill")?.addEventListener("click", async () => {
      ep.refill(char.properties);
      panel.updateInspector();
      try {
        await DevConfigPersistence.saveIndividualProperty(
          panel,
          char,
          ep.currentEnergyProp,
          ep.getCurrentEnergy(char.properties),
          "Current Energy (J)"
        );
      } catch (err) {
        console.warn("Failed to auto-save refilled energy:", err);
      }
    });
  }
}

