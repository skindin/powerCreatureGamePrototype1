import { Character, type CharacterRole } from "../../../character/Character.js";
import { CharacterModule } from "../../../character/CharacterModule.js";
import type { GameObject } from "../../../engine/GameObject.js";
import { PropertyControl } from "../../PropertyControl.js";
import type { DevPanel } from "../../DevPanel.js";

/**
 * Isolated DevPanel control binder for base physical entity modules:
 * CharacterRole, Rigidbody, Collider, Mass, Friction, Bounce, VerticalPosition, Roll, and Gravity.
 */
export class PhysicsModulesInspector {
  public static bindControls(
    panel: DevPanel,
    e: GameObject,
    char: Character | null,
    bindToggleSave: (checkboxId: string, owner: GameObject, keyPath: string, label: string, onApply?: (val: boolean) => void) => void
  ): void {
    const container = (panel as any).container as HTMLElement;
    const arena = (panel as any).arena;

    // Character Module Role Selector
    const selectCharRole = container.querySelector("#select-char-role") as HTMLSelectElement | null;
    selectCharRole?.addEventListener("change", () => {
      const newRole = selectCharRole.value as CharacterRole;
      if (char) {
        char.role = newRole;
      } else if (e.characterModule) {
        e.characterModule.role = newRole;
      } else {
        e.characterModule = new CharacterModule({ role: newRole });
      }
      const badge = container.querySelector("#badge-char-role");
      if (badge) badge.textContent = newRole.toUpperCase();
      panel.updateInspector();
    });

    // Rigidbody
    const selectRbCollision = container.querySelector("#select-rb-collision-mode") as HTMLSelectElement | null;
    selectRbCollision?.addEventListener("change", () => {
      e.collisionMode = selectRbCollision.value as "discrete" | "continuous" | "dynamic";
      const selectEntityCollision = container.querySelector("#select-entity-collision-mode") as HTMLSelectElement | null;
      if (selectEntityCollision) selectEntityCollision.value = e.collisionMode;
      const badge = container.querySelector("#badge-rb-collision-mode");
      if (badge) badge.textContent = e.collisionMode.toUpperCase();
      panel.updateInspector();
      if (!(e instanceof Character)) {
        panel.markDirty("objects", e);
      }
    });

    const btnVertVel = container.querySelector("#toggle-mod-vert-vel") as HTMLButtonElement;
    btnVertVel?.addEventListener("click", () => {
      if (!e.hasVerticalPosition) return;
      if (e.rigidbodyModule) {
        e.rigidbodyModule.hasVerticalVelocity = !e.rigidbodyModule.hasVerticalVelocity;
        if (!e.rigidbodyModule.hasVerticalVelocity) {
          e.verticalVelocity = 0;
        }
      }
      if (e.verticalPositionModule) {
        e.verticalPositionModule.hasVerticalVelocity = Boolean(e.rigidbodyModule?.hasVerticalVelocity);
      }
      panel.renderEntityModules();
      panel.updateInspector();
      if (!(e instanceof Character)) {
        panel.markDirty("objects", e);
      }
    });

    (panel as any).setupSlider("slide-entity-vert-vel", "val-entity-vert-vel", (val: number) => {
      e.verticalVelocity = val;
      if (!(e instanceof Character)) {
        panel.markDirty("objects", e);
      }
    }, 2);

    // Collider Radius
    const colRadSocketEl = container.querySelector("#prop-socket-collider-radius");
    if (colRadSocketEl && e.colliderModule) {
      const colCtrl = new PropertyControl({
        property: e.colliderModule.radiusProp,
        owner: e,
        label: "Collider Radius (u)",
        step: 0.02,
        onUserChange: () => {
          if (e.prefabId) {
            e.overriddenProperties.add("colliderRadius");
            panel.updatePrefabInfoBadge();
          }
          if (!(e instanceof Character)) {
            panel.markDirty("objects", e);
          }
        },
      });
      colRadSocketEl.appendChild(colCtrl.element);
    }

    // Mass
    const massSocketEl = container.querySelector("#prop-socket-mass");
    if (massSocketEl && e.rigidbodyModule) {
      const massCtrl = new PropertyControl({
        property: e.rigidbodyModule.massProp,
        owner: e,
        label: "Mass (kg)",
        step: 0.1,
        onUserChange: () => {
          if (e.prefabId) {
            e.overriddenProperties.add("mass");
            panel.updatePrefabInfoBadge();
          }
          if (!(e instanceof Character)) {
            panel.markDirty("objects", e);
          }
        },
      });
      massSocketEl.appendChild(massCtrl.element);
    }

    // Friction
    const staticFricSocketEl = container.querySelector("#prop-socket-static-fric");
    if (staticFricSocketEl && e.frictionModule) {
      const sfCtrl = new PropertyControl({
        property: e.frictionModule.staticFrictionProp,
        owner: e,
        label: "Static Friction Mod",
        step: 0.05,
        onUserChange: () => {
          if (!(e instanceof Character)) {
            panel.markDirty("objects", e);
          }
        },
      });
      staticFricSocketEl.appendChild(sfCtrl.element);
    }
    const dynFricSocketEl = container.querySelector("#prop-socket-dynamic-fric");
    if (dynFricSocketEl && e.frictionModule) {
      const dfCtrl = new PropertyControl({
        property: e.frictionModule.dynamicFrictionProp,
        owner: e,
        label: "Dynamic Friction Mod",
        step: 0.05,
        onUserChange: () => {
          if (!(e instanceof Character)) {
            panel.markDirty("objects", e);
          }
        },
      });
      dynFricSocketEl.appendChild(dfCtrl.element);
    }

    // Bounce
    const bounceSocketEl = container.querySelector("#prop-socket-bounce");
    if (bounceSocketEl && e.bounceModule) {
      const bCtrl = new PropertyControl({
        property: e.bounceModule.bounceModProp,
        owner: e,
        label: "Bounciness (Restitution)",
        step: 0.05,
        onUserChange: () => {
          if (!(e instanceof Character)) {
            panel.markDirty("objects", e);
          }
        },
      });
      bounceSocketEl.appendChild(bCtrl.element);
    }
    const checkVertBounce = container.querySelector("#check-mod-vert-bounce") as HTMLInputElement;
    checkVertBounce?.addEventListener("change", () => {
      if (e.bounceModule) {
        e.bounceModule.verticalBounce = checkVertBounce.checked;
      }
      panel.syncEntitySliders();
      panel.updateInspector();
      if (!(e instanceof Character)) {
        panel.markDirty("objects", e);
      }
    });
    bindToggleSave("check-mod-vert-bounce", e, "verticalBounce", "Vertical Bounce", (v) => {
      if (e.bounceModule) e.bounceModule.verticalBounce = v;
    });

    // Vertical Position
    (panel as any).setupSlider("slide-entity-elevation", "val-entity-elevation", (val: number) => {
      if (e.verticalPositionModule) {
        e.verticalPositionModule.z = val;
      }
      e.position.z = val;
      panel.syncEntitySliders();
      panel.updateInspector();
      if (!(e instanceof Character)) {
        panel.markDirty("objects", e);
      }
    }, 2);

    // Roll Resistance
    const rollResistSocketEl = container.querySelector("#prop-socket-roll-resist");
    if (rollResistSocketEl && e.rollModule) {
      const rollCtrl = new PropertyControl({
        property: e.rollModule.rollResistanceProp,
        owner: e,
        label: "Roll Resistance (u/s²)",
        step: 0.05,
        onUserChange: () => {
          if (!(e instanceof Character)) {
            panel.markDirty("objects", e);
          }
        },
      });
      rollResistSocketEl.appendChild(rollCtrl.element);
    }

    const checkBumpyRoll = container.querySelector("#check-roll-bumpy-enabled") as HTMLInputElement | null;
    if (checkBumpyRoll && e.rollModule) {
      checkBumpyRoll.addEventListener("change", () => {
        if (e.rollModule) {
          e.rollModule.bumpyRollEnabled = checkBumpyRoll.checked;
          const bumpinessEl = container.querySelector("#prop-socket-roll-bumpiness") as HTMLElement | null;
          const hopEffEl = container.querySelector("#prop-socket-roll-hop-efficiency") as HTMLElement | null;
          if (bumpinessEl) bumpinessEl.style.display = checkBumpyRoll.checked ? "block" : "none";
          if (hopEffEl) hopEffEl.style.display = checkBumpyRoll.checked ? "block" : "none";
          if (!(e instanceof Character)) {
            panel.markDirty("objects", e);
          }
        }
      });
      bindToggleSave("check-roll-bumpy-enabled", e, "bumpyRollEnabled", "Bumpy Roll", (v) => {
        if (e.rollModule) e.rollModule.bumpyRollEnabled = v;
      });
    }

    const rollBumpSocketEl = container.querySelector("#prop-socket-roll-bumpiness");
    if (rollBumpSocketEl && e.rollModule) {
      const bumpCtrl = new PropertyControl({
        property: e.rollModule.bumpinessProp,
        owner: e,
        label: "Bumpiness (0=Smooth, 1=Rocky)",
        step: 0.01,
        min: 0.0,
        max: 1.0,
        onUserChange: () => {
          if (!(e instanceof Character)) {
            panel.markDirty("objects", e);
          }
        },
      });
      rollBumpSocketEl.appendChild(bumpCtrl.element);
    }

    // Gravity Module
    if (e.gravityModule) {
      (panel as any).setupScrubber("scrub-container-mod-gravity", {
        label: "Gravity Force",
        isGlobal: true,
        value: arena.gravity,
        min: 1.0,
        max: 100.0,
        step: 0.5,
        decimals: 1,
        suffix: " u/s²",
        onChange: (val: number) => {
          arena.gravity = val;
          (panel as any).setScrubberVal("scrub-container-gravity", val);
          panel.updateInspector();
        },
      });
    }
  }
}
