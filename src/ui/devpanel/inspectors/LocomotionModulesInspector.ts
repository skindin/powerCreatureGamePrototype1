import type { Character } from "../../../character/Character.js";
import type { GameObject } from "../../../engine/GameObject.js";
import { PropertyControl } from "../../PropertyControl.js";

/**
 * Isolated DevPanel control binder for character locomotion modules:
 * Walking, Sprint, Muscle Strength, Jump, WallEdgeAssist, and Climbing.
 */
export class LocomotionModulesInspector {
  public static bindControls(
    container: HTMLElement,
    char: Character,
    bindToggleSave: (checkboxId: string, owner: GameObject, keyPath: string, label: string, onApply?: (val: boolean) => void) => void
  ): void {
    const checkWalkInAir = container.querySelector("#check-walk-in-air") as HTMLInputElement;
    checkWalkInAir?.addEventListener("change", () => {
      if (char.walkingModule) {
        char.walkingModule.walkInAir = checkWalkInAir.checked;
      }
    });
    bindToggleSave("check-walk-in-air", char, "walkInAir", "Air Control (Walk in Air)", (v) => {
      if (char.walkingModule) char.walkingModule.walkInAir = v;
    });

    const canSprintCheck = container.querySelector("#check-can-sprint") as HTMLInputElement;
    canSprintCheck?.addEventListener("change", () => {
      if (char.walkingModule) {
        char.walkingModule.canSprint = canSprintCheck.checked;
      }
    });
    bindToggleSave("check-can-sprint", char, "canSprint", "Can Sprint", (v) => {
      if (char.walkingModule) char.walkingModule.canSprint = v;
    });

    // Walking sockets
    const walkForceSocketEl = container.querySelector("#prop-socket-walk-force");
    if (walkForceSocketEl && char.walkingModule) {
      const wfCtrl = new PropertyControl({
        property: char.walkingModule.maxWalkForceProp,
        owner: char,
        label: "Max Walk Force (N)",
        step: 1.0,
      });
      walkForceSocketEl.appendChild(wfCtrl.element);
    }
    const walkSpeedSocketEl = container.querySelector("#prop-socket-walk-speed");
    if (walkSpeedSocketEl && char.walkingModule) {
      const wsCtrl = new PropertyControl({
        property: char.walkingModule.maxWalkSpeedProp,
        owner: char,
        label: "Max Walk Speed (u/s)",
        step: 0.2,
      });
      walkSpeedSocketEl.appendChild(wsCtrl.element);
    }
    const walkPowerCapSocketEl = container.querySelector("#prop-socket-walk-power-cap");
    if (walkPowerCapSocketEl && char.walkingModule) {
      const wpCtrl = new PropertyControl({
        property: char.walkingModule.maxWalkPowerProp,
        owner: char,
        label: "Max Walk Power (Watts)",
        step: 25.0,
      });
      walkPowerCapSocketEl.appendChild(wpCtrl.element);
    }
    const sprintSpeedSocketEl = container.querySelector("#prop-socket-sprint-speed");
    if (sprintSpeedSocketEl && char.walkingModule) {
      const ssCtrl = new PropertyControl({
        property: char.walkingModule.maxSprintSpeedProp,
        owner: char,
        label: "Max Sprint Speed (u/s)",
        step: 0.2,
      });
      sprintSpeedSocketEl.appendChild(ssCtrl.element);
    }
    const sprintPowerCapSocketEl = container.querySelector("#prop-socket-sprint-power-cap");
    if (sprintPowerCapSocketEl && char.walkingModule) {
      const spCtrl = new PropertyControl({
        property: char.walkingModule.maxSprintPowerProp,
        owner: char,
        label: "Max Sprint Power (Watts)",
        step: 25.0,
      });
      sprintPowerCapSocketEl.appendChild(spCtrl.element);
    }
    const airFricSocketEl = container.querySelector("#prop-socket-air-fric");
    if (airFricSocketEl && char.walkingModule) {
      const afCtrl = new PropertyControl({
        property: char.walkingModule.airFrictionProp,
        owner: char,
        label: "Air / Floating Friction",
        step: 0.05,
      });
      airFricSocketEl.appendChild(afCtrl.element);
    }

    // Energy consumption checkboxes
    const checkWalkEnergy = container.querySelector("#check-walk-energy") as HTMLInputElement;
    const fieldWalkPartialPower = container.querySelector("#field-walk-partial-power") as HTMLElement;
    const checkWalkPartialPower = container.querySelector("#check-walk-partial-power") as HTMLInputElement;
    checkWalkEnergy?.addEventListener("change", () => {
      if (char.walkingModule) {
        char.walkingModule.walkConsumesEnergy = checkWalkEnergy.checked;
        if (fieldWalkPartialPower) fieldWalkPartialPower.style.display = checkWalkEnergy.checked ? "flex" : "none";
      }
    });
    bindToggleSave("check-walk-energy", char, "walkConsumesEnergy", "Walk Consumes Energy", (v) => {
      if (char.walkingModule) char.walkingModule.walkConsumesEnergy = v;
    });
    bindToggleSave("check-walk-partial-power", char, "walkingModule.walkAllowPartialPower", "Walk Partial Power", (v) => {
      if (char.walkingModule) char.walkingModule.walkAllowPartialPower = v;
    });
    checkWalkPartialPower?.addEventListener("change", () => {
      if (char.walkingModule) {
        char.walkingModule.walkAllowPartialPower = checkWalkPartialPower.checked;
      }
    });

    const checkSprintEnergy = container.querySelector("#check-sprint-energy") as HTMLInputElement;
    const fieldSprintPartialPower = container.querySelector("#field-sprint-partial-power") as HTMLElement;
    const checkSprintPartialPower = container.querySelector("#check-sprint-partial-power") as HTMLInputElement;
    checkSprintEnergy?.addEventListener("change", () => {
      if (char.walkingModule) {
        char.walkingModule.sprintConsumesEnergy = checkSprintEnergy.checked;
        if (fieldSprintPartialPower) fieldSprintPartialPower.style.display = checkSprintEnergy.checked ? "block" : "none";
      }
    });
    bindToggleSave("check-sprint-energy", char, "sprintConsumesEnergy", "Sprint Consumes Energy", (v) => {
      if (char.walkingModule) char.walkingModule.sprintConsumesEnergy = v;
    });
    bindToggleSave("check-sprint-partial-power", char, "walkingModule.sprintAllowPartialPower", "Sprint Partial Power", (v) => {
      if (char.walkingModule) char.walkingModule.sprintAllowPartialPower = v;
    });
    checkSprintPartialPower?.addEventListener("change", () => {
      if (char.walkingModule) {
        char.walkingModule.sprintAllowPartialPower = checkSprintPartialPower.checked;
      }
    });

    // Strength
    const strSocketEl = container.querySelector("#prop-socket-strength");
    if (strSocketEl) {
      const strCtrl = new PropertyControl({
        property: char.strengthProp,
        owner: char,
        label: "Muscle Strength Ratio (×)",
        step: 0.1,
      });
      strSocketEl.appendChild(strCtrl.element);
    }

    // Jump sockets
    const jumpStrSocketEl = container.querySelector("#prop-socket-jump-strength");
    if (jumpStrSocketEl && char.jumpModule) {
      const jsCtrl = new PropertyControl({
        property: char.jumpModule.jumpStrengthProp,
        owner: char,
        label: "Jump Strength (N·s)",
        step: 0.5,
      });
      jumpStrSocketEl.appendChild(jsCtrl.element);
    }
    const jumpSpeedSocketEl = container.querySelector("#prop-socket-jump-max-speed");
    if (jumpSpeedSocketEl && char.jumpModule) {
      const jspCtrl = new PropertyControl({
        property: char.jumpModule.maxInitialSpeedProp,
        owner: char,
        label: "Max Takeoff Speed (u/s)",
        step: 0.1,
      });
      jumpSpeedSocketEl.appendChild(jspCtrl.element);
    }
    const jumpPowerCapSocketEl = container.querySelector("#prop-socket-jump-power-cap");
    if (jumpPowerCapSocketEl && char.jumpMaxPowerProp) {
      const jpCtrl = new PropertyControl({
        property: char.jumpMaxPowerProp,
        owner: char,
        label: "Max Jump Power (Watts)",
        step: 50.0,
      });
      jumpPowerCapSocketEl.appendChild(jpCtrl.element);
    }
    const checkJumpEnergy = container.querySelector("#check-jump-energy") as HTMLInputElement;
    const fieldJumpPartialPower = container.querySelector("#field-jump-partial-power") as HTMLElement;
    const checkJumpPartialPower = container.querySelector("#check-jump-partial-power") as HTMLInputElement;
    checkJumpEnergy?.addEventListener("change", () => {
      char.jumpConsumesEnergy = checkJumpEnergy.checked;
      if (fieldJumpPartialPower) fieldJumpPartialPower.style.display = checkJumpEnergy.checked ? "flex" : "none";
    });
    bindToggleSave("check-jump-energy", char, "jumpConsumesEnergy", "Consumes Energy", (v) => {
      char.jumpConsumesEnergy = v;
    });
    bindToggleSave("check-jump-partial-power", char, "jumpModule.jumpAllowPartialPower", "Jump Partial Power", (v) => {
      char.jumpAllowPartialPower = v;
    });
    checkJumpPartialPower?.addEventListener("change", () => {
      char.jumpAllowPartialPower = checkJumpPartialPower.checked;
    });

    // Wall Edge Assist
    const btnEdgeWalkOff = container.querySelector("#toggle-edge-walkoff") as HTMLButtonElement;
    btnEdgeWalkOff?.addEventListener("click", () => {
      if (char.wallEdgeAssistModule) {
        char.wallEdgeAssistModule.preventWalkOff = !char.wallEdgeAssistModule.preventWalkOff;
        btnEdgeWalkOff.classList.toggle("active", char.wallEdgeAssistModule.preventWalkOff);
        btnEdgeWalkOff.textContent = char.wallEdgeAssistModule.preventWalkOff ? "Active" : "Inactive";
      }
    });
    const edgeHangSocketEl = container.querySelector("#prop-socket-edge-hang");
    if (edgeHangSocketEl && char.wallEdgeAssistModule) {
      const ehCtrl = new PropertyControl({
        property: char.wallEdgeAssistModule.hangDistanceProp,
        owner: char,
        label: "Ledge Hang Distance (u)",
        step: 0.01,
      });
      edgeHangSocketEl.appendChild(ehCtrl.element);
    }

    // Climbing
    const btnClimbSideways = container.querySelector("#toggle-climb-sideways") as HTMLButtonElement;
    btnClimbSideways?.addEventListener("click", () => {
      if (char.climbingModule) {
        char.climbingModule.horizontalClimb = !char.climbingModule.horizontalClimb;
        btnClimbSideways.classList.toggle("active", char.climbingModule.horizontalClimb);
        btnClimbSideways.textContent = char.climbingModule.horizontalClimb ? "Active" : "Inactive";
      }
    });
    const climbAdhesionSocketEl = container.querySelector("#prop-socket-climb-adhesion");
    if (climbAdhesionSocketEl && char.climbingModule) {
      const caCtrl = new PropertyControl({
        property: char.climbingModule.maxAdhesionProp,
        owner: char,
        label: "Max Adhesion (N)",
        step: 5.0,
      });
      climbAdhesionSocketEl.appendChild(caCtrl.element);
    }
    const climbSpeedSocketEl = container.querySelector("#prop-socket-climb-speed");
    if (climbSpeedSocketEl && char.climbingModule) {
      const csCtrl = new PropertyControl({
        property: char.climbingModule.maxClimbSpeedProp,
        owner: char,
        label: "Max Climb Speed (u/s)",
        step: 0.1,
      });
      climbSpeedSocketEl.appendChild(csCtrl.element);
    }
    const climbPowerCapSocketEl = container.querySelector("#prop-socket-climb-power-cap");
    if (climbPowerCapSocketEl && char.climbingModule) {
      const cpCtrl = new PropertyControl({
        property: char.climbingModule.maxPowerProp,
        owner: char,
        label: "Max Climb Power (Watts)",
        step: 25.0,
      });
      climbPowerCapSocketEl.appendChild(cpCtrl.element);
    }
    const checkClimbEnergy = container.querySelector("#check-climb-energy") as HTMLInputElement;
    const fieldClimbPartialPower = container.querySelector("#field-climb-partial-power") as HTMLElement;
    const checkClimbPartialPower = container.querySelector("#check-climb-partial-power") as HTMLInputElement;
    checkClimbEnergy?.addEventListener("change", () => {
      if (char.climbingModule) {
        char.climbingModule.consumesEnergy = checkClimbEnergy.checked;
        if (fieldClimbPartialPower) fieldClimbPartialPower.style.display = checkClimbEnergy.checked ? "block" : "none";
      }
    });
    bindToggleSave("check-climb-energy", char, "climbConsumesEnergy", "Consumes Energy", (v) => {
      if (char.climbingModule) char.climbingModule.consumesEnergy = v;
    });
    bindToggleSave("check-climb-partial-power", char, "climbingModule.allowPartialPower", "Climb Partial Power", (v) => {
      if (char.climbingModule) char.climbingModule.allowPartialPower = v;
    });
    checkClimbPartialPower?.addEventListener("change", () => {
      if (char.climbingModule) {
        char.climbingModule.allowPartialPower = checkClimbPartialPower.checked;
      }
    });
  }
}
