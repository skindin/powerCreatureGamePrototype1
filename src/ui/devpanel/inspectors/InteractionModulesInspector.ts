import { Character } from "../../../character/Character.js";
import type { GameObject } from "../../../engine/GameObject.js";
import { PropertyControl } from "../../PropertyControl.js";
import { TagSelectorControl } from "../../TagSelectorControl.js";
import type { DevPanel } from "../../DevPanel.js";

/**
 * Isolated DevPanel control binder for item interaction modules:
 * Pickup, Throw, Consume, and Consumable.
 */
export class InteractionModulesInspector {
  public static bindControls(
    panel: DevPanel,
    e: GameObject,
    char: Character | null,
    bindToggleSave: (checkboxId: string, owner: GameObject, keyPath: string, label: string, onApply?: (val: boolean) => void) => void
  ): void {
    const container = (panel as any).container as HTMLElement;

    if (char) {
      // Pickup sockets
      const pickupReachSocketEl = container.querySelector("#prop-socket-pickup-reach");
      if (pickupReachSocketEl && char.pickupModule) {
        const prCtrl = new PropertyControl({
          property: char.pickupModule.pickupReachProp,
          owner: char,
          label: "Pickup Reach (3D) (u)",
          step: 0.1,
        });
        pickupReachSocketEl.appendChild(prCtrl.element);
      }
      const pickupPowerCapSocketEl = container.querySelector("#prop-socket-pickup-power-cap");
      if (pickupPowerCapSocketEl && char.pickupModule) {
        const ppCtrl = new PropertyControl({
          property: char.pickupModule.maxPowerProp,
          owner: char,
          label: "Max Pickup Power (Watts)",
          step: 25.0,
        });
        pickupPowerCapSocketEl.appendChild(ppCtrl.element);
      }
      const checkPickupEnergy = container.querySelector("#check-pickup-energy") as HTMLInputElement;
      const fieldPickupPartialPower = container.querySelector("#field-pickup-partial-power") as HTMLElement;
      const checkPickupPartialPower = container.querySelector("#check-pickup-partial-power") as HTMLInputElement;
      checkPickupEnergy?.addEventListener("change", () => {
        if (char.pickupModule) {
          char.pickupModule.consumesEnergy = checkPickupEnergy.checked;
          if (fieldPickupPartialPower) fieldPickupPartialPower.style.display = checkPickupEnergy.checked ? "block" : "none";
        }
      });
      bindToggleSave("check-pickup-energy", char, "pickupConsumesEnergy", "Consumes Energy", (v) => {
        if (char.pickupModule) char.pickupModule.consumesEnergy = v;
      });
      bindToggleSave("check-pickup-partial-power", char, "pickupModule.allowPartialPower", "Pickup Partial Power", (v) => {
        if (char.pickupModule) char.pickupModule.allowPartialPower = v;
      });
      checkPickupPartialPower?.addEventListener("change", () => {
        if (char.pickupModule) {
          char.pickupModule.allowPartialPower = checkPickupPartialPower.checked;
        }
      });

      // Throw sockets
      const throwForceSocketEl = container.querySelector("#prop-socket-throw-force");
      if (throwForceSocketEl && char.throwModule) {
        const tfCtrl = new PropertyControl({
          property: char.throwModule.maxThrowSpeedProp,
          owner: char,
          label: "Max Throw Speed (u/s)",
          step: 0.5,
        });
        throwForceSocketEl.appendChild(tfCtrl.element);
      }
      const throwHeightSocketEl = container.querySelector("#prop-socket-throw-max-height");
      if (throwHeightSocketEl && char.throwModule) {
        const thCtrl = new PropertyControl({
          property: char.throwModule.maxThrowHeightProp,
          owner: char,
          label: "Max Throw Height (u)",
          step: 0.5,
        });
        throwHeightSocketEl.appendChild(thCtrl.element);
      }
      const throwPowerCapSocketEl = container.querySelector("#prop-socket-throw-power-cap");
      if (throwPowerCapSocketEl && char.throwModule) {
        const tpCtrl = new PropertyControl({
          property: char.throwModule.maxPowerProp,
          owner: char,
          label: "Max Throw Power (Watts)",
          step: 50.0,
        });
        throwPowerCapSocketEl.appendChild(tpCtrl.element);
      }
      const checkThrowEnergy = container.querySelector("#check-throw-energy") as HTMLInputElement;
      checkThrowEnergy?.addEventListener("change", () => {
        if (char.throwModule) {
          char.throwModule.consumesEnergy = checkThrowEnergy.checked;
        }
      });
      bindToggleSave("check-throw-energy", char, "throwConsumesEnergy", "Consumes Energy", (v) => {
        if (char.throwModule) char.throwModule.consumesEnergy = v;
      });

      // Consume Module controls
      if (char.consumeModule) {
        const consumeSocketEl = container.querySelector("#prop-socket-consume-tags");
        if (consumeSocketEl) {
          const tagCtrl = new TagSelectorControl({
            mode: "multi",
            label: "Accepted Consumable Tags",
            acceptedTags: char.consumeModule.acceptedTags,
            onTagsChanged: (tags) => {
              char.consumeModule!.acceptedTags = tags;
            },
          });
          consumeSocketEl.appendChild(tagCtrl.element);
        }
      }
    }

    // Consumable Module controls (applicable to any entity with ConsumableModule)
    if (e.consumableModule) {
      const cm = e.consumableModule;

      const unlimChk = container.querySelector<HTMLInputElement>("#chk-consumable-unlimited");
      if (unlimChk) {
        unlimChk.addEventListener("change", () => {
          cm.unlimited = unlimChk.checked;
          if (e.prefabId) {
            e.overriddenProperties.add("consumable_unlimited");
            panel.updatePrefabInfoBadge();
          }
          if (!(e instanceof Character)) {
            panel.markDirty("objects", e);
          }
        });
      }

      const tagSocketEl = container.querySelector("#prop-socket-consumable-tag");
      if (tagSocketEl) {
        const tagCtrl = new TagSelectorControl({
          mode: "single",
          label: "Consumable Tag",
          currentTag: cm.tag,
          onTagSelected: (tag) => {
            cm.tag = tag;
            if (e.prefabId) {
              e.overriddenProperties.add("consumable_tag");
              panel.updatePrefabInfoBadge();
            }
            if (!(e instanceof Character)) {
              panel.markDirty("objects", e);
            }
          },
        });
        tagSocketEl.appendChild(tagCtrl.element);
      }

      const totalEnergySocketEl = container.querySelector("#prop-socket-consumable-total-energy");
      if (totalEnergySocketEl) {
        const totalCtrl = new PropertyControl({
          property: cm.totalEnergyJoulesProp,
          owner: e,
          label: "Total Energy (J)",
          step: 100.0,
          onUserChange: () => {
            if (e.prefabId) {
              e.overriddenProperties.add("consumable_totalEnergy");
              panel.updatePrefabInfoBadge();
            }
            if (!(e instanceof Character)) {
              panel.markDirty("objects", e);
            }
          },
        });
        totalEnergySocketEl.appendChild(totalCtrl.element);
      }

      const remEnergySocketEl = container.querySelector("#prop-socket-consumable-remaining-energy");
      if (remEnergySocketEl) {
        const remCtrl = new PropertyControl({
          property: cm.remainingEnergyJoulesProp,
          owner: e,
          label: "Remaining Energy (J)",
          step: 50.0,
          onUserChange: () => {
            if (!(e instanceof Character)) {
              panel.markDirty("objects", e);
            }
          },
        });
        remEnergySocketEl.appendChild(remCtrl.element);
      }

      const consumeRateSocketEl = container.querySelector("#prop-socket-consumable-consume-rate");
      if (consumeRateSocketEl) {
        const rateCtrl = new PropertyControl({
          property: cm.consumeRateWattsProp,
          owner: e,
          label: "Consume Rate (Watts = J/s)",
          step: 25.0,
          onUserChange: () => {
            if (e.prefabId) {
              e.overriddenProperties.add("consumable_consumeRate");
              panel.updatePrefabInfoBadge();
            }
            if (!(e instanceof Character)) {
              panel.markDirty("objects", e);
            }
          },
        });
        consumeRateSocketEl.appendChild(rateCtrl.element);
      }

      const healRateSocketEl = container.querySelector("#prop-socket-consumable-heal-rate");
      if (healRateSocketEl) {
        const healCtrl = new PropertyControl({
          property: cm.healRateProp,
          owner: e,
          label: "Nutritional Healing Rate (HP/s)",
          step: 1.0,
          onUserChange: () => {
            if (e.prefabId) {
              e.overriddenProperties.add("consumable_healRate");
              panel.updatePrefabInfoBadge();
            }
            if (!(e instanceof Character)) {
              panel.markDirty("objects", e);
            }
          },
        });
        healRateSocketEl.appendChild(healCtrl.element);
      }
    }
  }
}
