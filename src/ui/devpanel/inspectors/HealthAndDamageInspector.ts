import { Character } from "../../../character/Character.js";
import { GameObject } from "../../../engine/GameObject.js";
import { PropertyControl } from "../../PropertyControl.js";
import type { DevPanel } from "../../DevPanel.js";

/**
 * Isolated DevPanel inspector binder for HealthModule, DamageAuraModule, and DamageSolverModule.
 */
export class HealthAndDamageInspector {
  public static bindControls(
    panel: DevPanel,
    e: GameObject,
    char: Character | null,
    bindToggleSave: (checkboxId: string, owner: GameObject, keyPath: string, label: string, onApply?: (val: boolean) => void) => void
  ): void {
    const container = (panel as any).container as HTMLElement;
    const arena = (panel as any).arena;
    const isChar = e instanceof Character;

    // Health & Vitality Module controls
    if (e.healthModule) {
      const hm = e.healthModule;

      const hpCurSocketEl = container.querySelector("#prop-socket-health-cur");
      if (hpCurSocketEl) {
        const curCtrl = new PropertyControl({
          property: hm.currentHpProp,
          owner: e,
          label: "Current Health (HP)",
          step: 1.0,
          onUserChange: () => {
            if (!(e instanceof Character)) {
              panel.markDirty("objects", e);
            }
          },
        });
        hpCurSocketEl.appendChild(curCtrl.element);
      }

      const hpMaxSocketEl = container.querySelector("#prop-socket-health-max");
      if (hpMaxSocketEl) {
        const maxCtrl = new PropertyControl({
          property: hm.maxHpProp,
          owner: e,
          label: "Max Health (HP)",
          step: 5.0,
          onUserChange: () => {
            if (!(e instanceof Character)) {
              panel.markDirty("objects", e);
            }
          },
        });
        hpMaxSocketEl.appendChild(maxCtrl.element);
      }

      const hpHealSocketEl = container.querySelector("#prop-socket-health-healrate");
      if (hpHealSocketEl) {
        const hrCtrl = new PropertyControl({
          property: hm.maxHealRateProp,
          owner: e,
          label: "Passive Heal Rate (HP/s)",
          step: 0.5,
          onUserChange: () => {
            if (!(e instanceof Character)) {
              panel.markDirty("objects", e);
            }
          },
        });
        hpHealSocketEl.appendChild(hrCtrl.element);
      }

      const joulesPerHpSocketEl = container.querySelector("#prop-socket-health-joulesperhp") || container.querySelector("#prop-socket-health-hpperjoule");
      if (joulesPerHpSocketEl) {
        const jCtrl = new PropertyControl({
          property: hm.joulesPerHpProp,
          owner: e,
          label: "Energy Cost per HP (Joules/HP)",
          step: 1.0,
          onUserChange: () => {
            if (!(e instanceof Character)) {
              panel.markDirty("objects", e);
            }
          },
        });
        joulesPerHpSocketEl.appendChild(jCtrl.element);
      }

      const hpPowerCapSocketEl = container.querySelector("#prop-socket-health-power-cap");
      if (hpPowerCapSocketEl) {
        const pCtrl = new PropertyControl({
          property: hm.maxPowerProp,
          owner: e,
          label: "Max Healing Power (Watts)",
          step: 25.0,
          onUserChange: () => {
            if (!(e instanceof Character)) {
              panel.markDirty("objects", e);
            }
          },
        });
        hpPowerCapSocketEl.appendChild(pCtrl.element);
      }

      const checkHealthEnergy = container.querySelector("#check-health-energy") as HTMLInputElement;
      const fieldHealthPartialPower = container.querySelector("#field-health-partial-power") as HTMLElement;
      const checkHealthPartialPower = container.querySelector("#check-health-partial-power") as HTMLInputElement;
      checkHealthEnergy?.addEventListener("change", () => {
        hm.consumesEnergy = checkHealthEnergy.checked;
        if (fieldHealthPartialPower) fieldHealthPartialPower.style.display = checkHealthEnergy.checked ? "block" : "none";
        if (!(e instanceof Character)) {
          panel.markDirty("objects", e);
        }
      });
      bindToggleSave("check-health-energy", e, "healthConsumesEnergy", "Healing Consumes Energy", (v) => {
        hm.consumesEnergy = v;
      });
      bindToggleSave("check-health-partial-power", e, "healthModule.allowPartialPower", "Health Partial Power", (v) => {
        hm.allowPartialPower = v;
      });
      checkHealthPartialPower?.addEventListener("change", () => {
        hm.allowPartialPower = checkHealthPartialPower.checked;
        if (!(e instanceof Character)) {
          panel.markDirty("objects", e);
        }
      });

      container.querySelector("#btn-health-sub10")?.addEventListener("click", () => {
        hm.takeDamage(10, e.properties, {
          id: "damage",
          name: "Damage",
          type: "instant",
          amount: 10,
          color: "#ef4444",
          isHeal: false,
        });
        panel.updateInspector();
      });
      container.querySelector("#btn-health-add10")?.addEventListener("click", () => {
        hm.heal(10, e.properties, {
          id: "heal",
          name: "Heal",
          type: "instant",
          amount: 10,
          color: "#22c55e",
          isHeal: true,
        });
        panel.updateInspector();
      });
      container.querySelector("#btn-health-kill")?.addEventListener("click", () => {
        hm.currentHpProp.set(0, e.properties);
        if (isChar && char) {
          hm.dieAndRespawn(char, arena);
        }
        panel.updateInspector();
      });
      container.querySelector("#btn-health-full")?.addEventListener("click", () => {
        hm.currentHpProp.set(hm.getMaxHp(e.properties), e.properties);
        panel.updateInspector();
      });
    }

    // Damage Aura Module controls
    if (e.damageAuraModule) {
      const da = e.damageAuraModule;

      const auraRadiusSocketEl = container.querySelector("#prop-socket-aura-radius");
      if (auraRadiusSocketEl) {
        const arCtrl = new PropertyControl({
          property: da.damageRadiusProp,
          owner: e,
          label: "Aura Radius (3D) (u)",
          step: 0.2,
          onUserChange: () => {
            if (!(e instanceof Character)) {
              panel.markDirty("objects", e);
            }
          },
        });
        auraRadiusSocketEl.appendChild(arCtrl.element);
      }

      const auraRateSocketEl = container.querySelector("#prop-socket-aura-rate");
      if (auraRateSocketEl) {
        const rateCtrl = new PropertyControl({
          property: da.damageRateProp,
          owner: e,
          label: "Damage Rate (HP/s)",
          step: 2.0,
          onUserChange: () => {
            if (!(e instanceof Character)) {
              panel.markDirty("objects", e);
            }
          },
        });
        auraRateSocketEl.appendChild(rateCtrl.element);
      }
    }

    // Damage Solver & Armor Module controls
    if (e.damageSolverModule) {
      const ds = e.damageSolverModule;

      const suscSocketEl = container.querySelector("#prop-socket-impact-susceptibility");
      if (suscSocketEl) {
        const suscCtrl = new PropertyControl({
          property: ds.impactSusceptibilityProp,
          owner: e,
          label: "Impact Susceptibility (Multiplier)",
          step: 0.1,
          onUserChange: () => {
            if (!(e instanceof Character)) {
              panel.markDirty("objects", e);
            }
          },
        });
        suscSocketEl.appendChild(suscCtrl.element);
      }

      const threshSocketEl = container.querySelector("#prop-socket-min-shock-thresh");
      if (threshSocketEl) {
        const threshCtrl = new PropertyControl({
          property: ds.damageThresholdHpProp,
          owner: e,
          label: "Collision Damage Threshold (HP)",
          step: 1.0,
          onUserChange: () => {
            if (!(e instanceof Character)) {
              panel.markDirty("objects", e);
            }
          },
        });
        threshSocketEl.appendChild(threshCtrl.element);
      }

      const selfWeightSocketEl = container.querySelector("#prop-socket-self-impact-weight");
      if (selfWeightSocketEl) {
        const selfWeightCtrl = new PropertyControl({
          property: ds.selfImpactWeightProp,
          owner: e,
          label: "Voluntary Bump Weight (0 = Arcade, 1 = Realism)",
          step: 0.05,
          min: 0.0,
          max: 1.0,
          onUserChange: () => {
            if (!(e instanceof Character)) {
              panel.markDirty("objects", e);
            }
          },
        });
        selfWeightSocketEl.appendChild(selfWeightCtrl.element);
      }

      (panel as any).setupScrubber("scrub-container-mod-collision-damage-scale", {
        label: "Collision Damage Scale",
        isGlobal: true,
        value: GameObject.globalWorldCollisionDamageScale,
        min: 0.0,
        max: 5.0,
        step: 0.005,
        decimals: 3,
        suffix: " HP/Shock",
        onChange: (val: number) => {
          GameObject.globalWorldCollisionDamageScale = val;
          const getGameLoop = (panel as any).getGameLoop as (() => any) | undefined;
          const loop = getGameLoop ? getGameLoop() : null;
          if (loop) {
            loop.worldCollisionDamageScale = val;
          }
          (panel as any).setScrubberVal("scrub-container-collision-damage-scale", val);
        },
      });
    }
  }
}

