import { Character } from "../../character/Character.js";
import type { GameObject } from "../../engine/GameObject.js";
import type { DevPanel } from "../DevPanel.js";
import { PhysicsModulesInspector } from "./inspectors/PhysicsModulesInspector.js";
import { LocomotionModulesInspector } from "./inspectors/LocomotionModulesInspector.js";
import { InteractionModulesInspector } from "./inspectors/InteractionModulesInspector.js";
import { HealthAndDamageInspector } from "./inspectors/HealthAndDamageInspector.js";
import { LaserInspector } from "./inspectors/LaserInspector.js";
import { MeleeInspector } from "./inspectors/MeleeInspector.js";
import { EnergyPoolInspector } from "./inspectors/EnergyPoolInspector.js";
import { ControlsInspector } from "./inspectors/ControlsInspector.js";

/**
 * Dispatcher that delegates DevPanel module control binding to isolated,
 * domain-specific and 1-to-1 inspector modules.
 */
export class EntityModuleControlsBinder {
  public static bindDynamicModuleControls(panel: DevPanel): void {
    const e = panel.selectedEntity;
    if (!e) return;
    const container = (panel as any).container as HTMLElement;
    const isChar = e instanceof Character;
    const char = isChar ? (e as Character) : null;

    const bindToggleSave = (
      checkboxId: string,
      owner: GameObject,
      keyPath: string,
      label: string,
      onApply?: (val: boolean) => void
    ) => {
      const chk = container.querySelector(`#${checkboxId}`) as HTMLInputElement | null;
      const saveBtnId = `btn-save-${checkboxId.replace(/^check-/, "")}`;
      const btn = container.querySelector(`#${saveBtnId}`) as HTMLButtonElement | null;
      if (!chk || !btn) return;
      btn.addEventListener("click", (evt) => {
        evt.stopPropagation();
        const val = chk.checked;
        if (onApply) onApply(val);
        panel.saveIndividualToggle(owner, keyPath, val, label, btn);
      });
    };

    PhysicsModulesInspector.bindControls(panel, e, char, bindToggleSave);
    if (char) {
      LocomotionModulesInspector.bindControls(container, char, bindToggleSave);
      LaserInspector.bindControls(panel, char, bindToggleSave);
      MeleeInspector.bindControls(panel, char, bindToggleSave);
      EnergyPoolInspector.bindControls(panel, char);

      const btnControls = container.querySelector("#btn-open-character-controls") as HTMLButtonElement | null;
      if (btnControls) {
        btnControls.addEventListener("click", (evt) => {
          evt.stopPropagation();
          ControlsInspector.openModal(panel, char);
        });
      }
    }
    InteractionModulesInspector.bindControls(panel, e, char, bindToggleSave);
    HealthAndDamageInspector.bindControls(panel, e, char, bindToggleSave);
  }
}

