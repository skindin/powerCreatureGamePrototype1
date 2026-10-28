import type { Character } from "../../../character/Character.js";
import type { GameObject } from "../../../engine/GameObject.js";
import { PropertyControl } from "../../PropertyControl.js";
import type { DevPanel } from "../../DevPanel.js";

/**
 * Isolated 1-to-1 DevPanel inspector binder for MeleeModule.
 */
export class MeleeInspector {
  public static bindControls(
    panel: DevPanel,
    char: Character,
    bindToggleSave: (checkboxId: string, owner: GameObject, keyPath: string, label: string, onApply?: (val: boolean) => void) => void
  ): void {
    if (!char.meleeModule) return;
    const container = (panel as any).container as HTMLElement;
    const mm = char.meleeModule;

    const forceEl = container.querySelector("#prop-socket-melee-max-force");
    if (forceEl) {
      const ctrl = new PropertyControl({
        property: mm.maxForceProp,
        owner: char,
        label: "Max Punch Force (Newtons)",
        step: 25.0,
      });
      forceEl.appendChild(ctrl.element);
    }

    const freqEl = container.querySelector("#prop-socket-melee-frequency");
    if (freqEl) {
      const ctrl = new PropertyControl({
        property: mm.punchFrequencyProp,
        owner: char,
        label: "Punch Frequency (Hz)",
        step: 0.5,
      });
      freqEl.appendChild(ctrl.element);
    }

    const reachEl = container.querySelector("#prop-socket-melee-reach");
    if (reachEl) {
      const ctrl = new PropertyControl({
        property: mm.reachProp,
        owner: char,
        label: "Attack Reach (Meters)",
        step: 0.1,
      });
      reachEl.appendChild(ctrl.element);
    }

    const widthEl = container.querySelector("#prop-socket-melee-width");
    if (widthEl) {
      const ctrl = new PropertyControl({
        property: mm.widthProp,
        owner: char,
        label: "Attack Width (Meters)",
        step: 0.1,
      });
      widthEl.appendChild(ctrl.element);
    }

    const meleePowerCapEl = container.querySelector("#prop-socket-melee-max-power");
    if (meleePowerCapEl) {
      const mpCtrl = new PropertyControl({
        property: mm.maxPowerProp,
        owner: char,
        label: "Max Attack Power (Watts)",
        step: 25.0,
      });
      meleePowerCapEl.appendChild(mpCtrl.element);
    }

    const checkPartial = container.querySelector("#check-melee-partial-power") as HTMLInputElement | null;
    checkPartial?.addEventListener("change", () => {
      mm.allowPartialPower = checkPartial.checked;
      panel.updateInspector();
    });
    bindToggleSave("check-melee-partial-power", char, "meleeModule.allowPartialPower", "Melee Partial Power", (v) => {
      mm.allowPartialPower = v;
    });
  }
}

