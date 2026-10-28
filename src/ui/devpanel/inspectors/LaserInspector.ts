import type { Character } from "../../../character/Character.js";
import type { GameObject } from "../../../engine/GameObject.js";
import { PropertyControl } from "../../PropertyControl.js";
import type { DevPanel } from "../../DevPanel.js";

/**
 * Isolated 1-to-1 DevPanel inspector binder for LaserModule.
 */
export class LaserInspector {
  public static bindControls(
    panel: DevPanel,
    char: Character,
    bindToggleSave: (checkboxId: string, owner: GameObject, keyPath: string, label: string, onApply?: (val: boolean) => void) => void
  ): void {
    if (!char.laserModule) return;
    const container = (panel as any).container as HTMLElement;
    const lm = char.laserModule;

    const dmgRateEl = container.querySelector("#prop-socket-laser-damage-rate");
    if (dmgRateEl) {
      const ctrl = new PropertyControl({
        property: lm.damageRateProp,
        owner: char,
        label: "Active Damage Rate (HP/s)",
        step: 5.0,
      });
      dmgRateEl.appendChild(ctrl.element);
    }

    const maxDmgEl = container.querySelector("#prop-socket-laser-max-damage-rate");
    if (maxDmgEl) {
      const ctrl = new PropertyControl({
        property: lm.maxDamageRateProp,
        owner: char,
        label: "Max Damage Rate (HP/s)",
        step: 10.0,
      });
      maxDmgEl.appendChild(ctrl.element);
    }

    const thickEl = container.querySelector("#prop-socket-laser-thickness");
    if (thickEl) {
      const ctrl = new PropertyControl({
        property: lm.thicknessProp,
        owner: char,
        label: "Beam Thickness (World Units)",
        step: 0.05,
      });
      thickEl.appendChild(ctrl.element);
    }

    const pwrEl = container.querySelector("#prop-socket-laser-max-power");
    if (pwrEl) {
      const ctrl = new PropertyControl({
        property: lm.maxPowerProp,
        owner: char,
        label: "Max Power Rating (Watts)",
        step: 25.0,
      });
      pwrEl.appendChild(ctrl.element);
    }

    const checkPartial = container.querySelector("#check-laser-partial-power") as HTMLInputElement | null;
    checkPartial?.addEventListener("change", () => {
      lm.allowPartialPower = checkPartial.checked;
      panel.updateInspector();
    });
    bindToggleSave("check-laser-partial-power", char, "laserModule.allowPartialPower", "Laser Partial Power", (v) => {
      lm.allowPartialPower = v;
    });
  }
}

