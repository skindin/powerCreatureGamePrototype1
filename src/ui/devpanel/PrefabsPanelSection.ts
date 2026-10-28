import { prefabManager } from "../../engine/prefab/PrefabManager.js";
import { consumableTagRegistry } from "../../engine/properties/ConsumableTagRegistry.js";
import type { DevPanel } from "../DevPanel.js";

/**
 * Isolated DevPanel section for Scene Prefabs management & Prefab instance override badges.
 * Editing Prefab UI or archetype scrubbers happens strictly in this file.
 */
export class PrefabsPanelSection {
  public static updatePrefabInfoBadge(panel: DevPanel): void {
    const container = (panel as any).container as HTMLElement;
    const badgeEl = container.querySelector("#selected-entity-prefab-info") as HTMLElement | null;
    if (!badgeEl) return;

    const e = panel.selectedEntity;
    if (!e || !e.prefabId) {
      badgeEl.style.display = "none";
      badgeEl.innerHTML = "";
      return;
    }

    const prefab = prefabManager.get(e.prefabId);
    const prefabName = prefab ? `${prefab.icon} ${prefab.name}` : e.prefabId;
    const overridesCount = e.overriddenProperties.size;
    const overridesBadge = overridesCount > 0
      ? `<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); margin-left: 6px;">${overridesCount} override${overridesCount > 1 ? "s" : ""}</span>`
      : `<span style="color: #94a3b8; font-size: 0.70rem; margin-left: 6px;">(Synced)</span>`;

    const revertBtn = overridesCount > 0
      ? `<button id="btn-revert-prefab-overrides" class="btn-secondary-action" style="padding: 2px 6px; font-size: 0.68rem; margin-left: auto; color: #fbbf24; border-color: rgba(245, 158, 11, 0.4);" title="Revert overridden properties back to prefab archetype values">↺ Revert</button>`
      : "";

    badgeEl.style.display = "flex";
    badgeEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        <span style="color: #c084fc; font-weight: 600;">Prefab:</span>
        <span style="color: #e2e8f0; font-weight: 500;">${prefabName}</span>
        ${overridesBadge}
      </div>
      ${revertBtn}
    `;

    if (overridesCount > 0) {
      badgeEl.querySelector("#btn-revert-prefab-overrides")?.addEventListener("click", () => {
        if (!prefab) return;
        for (const propKey of e.overriddenProperties) {
          switch (propKey) {
            case "name": e.name = prefab.archetype.name; break;
            case "color": e.color = prefab.archetype.color; break;
            case "visualShape": e.visualShape = prefab.archetype.visualShape; break;
            case "mass":
              e.mass = prefab.archetype.mass;
              if (e.rigidbodyModule) e.rigidbodyModule.massProp.literalValue = prefab.archetype.mass;
              break;
            case "colliderRadius":
              e.colliderRadius = prefab.archetype.colliderRadius;
              if (e.colliderModule) e.colliderModule.radius = prefab.archetype.colliderRadius;
              break;
            case "consumable_totalEnergy":
              if (e.consumableModule && prefab.archetype.consumableModule) {
                e.consumableModule.totalEnergyJoulesProp.literalValue = prefab.archetype.consumableModule.totalEnergyJoulesProp.literalValue;
              }
              break;
            case "consumable_consumeRate":
              if (e.consumableModule && prefab.archetype.consumableModule) {
                e.consumableModule.consumeRateWattsProp.literalValue = prefab.archetype.consumableModule.consumeRateWattsProp.literalValue;
              }
              break;
            case "consumable_healRate":
              if (e.consumableModule && prefab.archetype.consumableModule) {
                e.consumableModule.healRateProp.literalValue = prefab.archetype.consumableModule.healRateProp.literalValue;
              }
              break;
            case "consumable_tag":
              if (e.consumableModule && prefab.archetype.consumableModule) {
                e.consumableModule.tag = prefab.archetype.consumableModule.tag;
              }
              break;
          }
        }
        e.overriddenProperties.clear();
        panel.renderEntityModules();
        (panel as any).syncEntitySliders();
        panel.updatePrefabInfoBadge();
      });
    }
  }

  public static renderScenePrefabs(panel: DevPanel): void {
    const container = (panel as any).container as HTMLElement;
    const objects = (panel as any).objects as any[];
    const arena = (panel as any).arena;
    const listEl = container.querySelector("#scene-prefabs-list") as HTMLElement | null;
    const badgeEl = container.querySelector("#badge-prefabs-count") as HTMLElement | null;
    const allPrefabs = prefabManager.getAll();

    if (badgeEl) badgeEl.textContent = allPrefabs.length.toString();
    if (!listEl) return;

    if (allPrefabs.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); font-size: 0.74rem; padding: 12px 0;">
          No scene prefabs created yet. Select any scene object and click "📦 Make Prefab".
        </div>
      `;
      return;
    }

    let html = "";
    const allTags = consumableTagRegistry.getAll();

    for (const prefab of allPrefabs) {
      const liveCount = objects.filter((o) => o.prefabId === prefab.id).length;
      const arc = prefab.archetype;
      const isConsumable = Boolean(arc.consumableModule);

      let tagOptionsHtml = "";
      for (const tagName of allTags) {
        const isSel = arc.consumableModule && arc.consumableModule.tag.toLowerCase() === tagName.toLowerCase() ? "selected" : "";
        tagOptionsHtml += `<option value="${tagName}" ${isSel}>${tagName}</option>`;
      }

      html += `
        <div class="behavior-card" data-prefab-card-id="${prefab.id}" style="border: 1px solid rgba(168, 85, 247, 0.35); background: rgba(30, 27, 75, 0.25); margin-bottom: 10px; border-radius: 6px; padding: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 4px; flex: 1;">
              <span style="font-size: 1.0rem;">${prefab.icon}</span>
              <input class="dev-input input-prefab-name" data-prefab-id="${prefab.id}" value="${prefab.name}" style="flex: 1; padding: 3px 6px; font-weight: 600; font-size: 0.8rem; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 4px; color: #f1f5f9;" />
              <button class="prop-save-btn btn-save-prefab-name" data-prefab-id="${prefab.id}" title="Save Prefab Name directly to project" style="padding: 2px 6px;">💾</button>
            </div>
            <div style="display: flex; align-items: center; gap: 4px; margin-left: 8px;">
              <span class="badge" style="background: rgba(168, 85, 247, 0.2); color: #c084fc; font-size: 0.70rem;">${liveCount} live</span>
              <button class="btn-secondary-action btn-save-whole-prefab" data-prefab-id="${prefab.id}" style="padding: 3px 8px; font-size: 0.72rem; color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);" title="Save entire prefab archetype and live instances to project">💾 Save All</button>
              <button class="btn-secondary-action btn-spawn-prefab" data-prefab-id="${prefab.id}" style="padding: 3px 8px; font-size: 0.72rem; color: #c084fc; border-color: rgba(168, 85, 247, 0.4);" title="Spawn one instance on the arena floor">➕ Spawn</button>
              <button class="btn-icon-subtle btn-delete-prefab" data-prefab-id="${prefab.id}" style="color: #f87171; padding: 3px 6px; font-size: 0.8rem;" title="Delete Prefab (unlinks live instances)">🗑️</button>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px; padding-top: 6px; border-top: 1px solid rgba(168, 85, 247, 0.15);">
            <div style="display: flex; gap: 6px; align-items: center;">
              <label style="font-size: 0.74rem; color: #94a3b8; flex: 0 0 45px;">Visual:</label>
              <input type="color" class="prefab-color-picker" data-prefab-id="${prefab.id}" value="${arc.color}" style="width: 28px; height: 22px; padding: 0; border: none; cursor: pointer; background: transparent; border-radius: 3px;" title="Archetype Color" />
              <button class="btn-secondary-action prefab-shape-toggle" data-prefab-id="${prefab.id}" style="padding: 2px 8px; font-size: 0.72rem; flex: 1;">
                ${arc.visualShape === "box" ? "Box 📦" : "Circle ⚪"}
              </button>
              <button class="prop-save-btn btn-save-prefab-visuals" data-prefab-id="${prefab.id}" title="Save Visual Appearance to project" style="padding: 2px 6px;">💾</button>
            </div>

            <div id="scrub-container-prefab-mass-${prefab.id}"></div>
            <div id="scrub-container-prefab-radius-${prefab.id}"></div>

            ${isConsumable ? `
              <div style="margin-top: 4px; padding-top: 6px; border-top: 1px dashed rgba(168, 85, 247, 0.2);">
                <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px;">
                  <label style="font-size: 0.74rem; color: #f472b6; flex: 0 0 45px;">Tag:</label>
                  <select class="dev-select prefab-tag-select" data-prefab-id="${prefab.id}" style="flex: 1; padding: 2px 6px; font-size: 0.74rem;">
                    ${tagOptionsHtml}
                  </select>
                  <button class="prop-save-btn btn-save-prefab-tag" data-prefab-id="${prefab.id}" title="Save Tag to project" style="padding: 2px 6px;">💾</button>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label style="font-size: 0.74rem; color: #f472b6; cursor: pointer;">♾️ Unlimited Energy:</label>
                  <input type="checkbox" class="prefab-unlimited-chk" data-prefab-id="${prefab.id}" ${arc.consumableModule?.unlimited ? "checked" : ""} style="cursor: pointer; accent-color: #ec4899; width: 15px; height: 15px;" />
                </div>
                <div id="scrub-container-prefab-energy-${prefab.id}"></div>
                <div id="scrub-container-prefab-rate-${prefab.id}"></div>
                <div id="scrub-container-prefab-heal-${prefab.id}"></div>
              </div>
            ` : ""}
          </div>
        </div>
      `;
    }

    listEl.innerHTML = html;

    for (const prefab of allPrefabs) {
      const arc = prefab.archetype;

      (panel as any).setupScrubber(`scrub-container-prefab-mass-${prefab.id}`, {
        label: "Mass (kg)",
        value: arc.mass,
        min: 0.1,
        max: 50.0,
        step: 0.1,
        decimals: 1,
        onChange: (val: number) => {
          prefab.setProperty("mass", val, objects);
          if (panel.selectedEntity && panel.selectedEntity.prefabId === prefab.id && !panel.selectedEntity.overriddenProperties.has("mass")) {
            (panel as any).syncEntitySliders();
          }
        },
        onSave: (val: number) => panel.savePrefabProperty(prefab, "mass", val, "Mass"),
      });

      (panel as any).setupScrubber(`scrub-container-prefab-radius-${prefab.id}`, {
        label: "Collider Radius (u)",
        value: arc.colliderRadius,
        min: 0.05,
        max: 3.0,
        step: 0.02,
        decimals: 2,
        onChange: (val: number) => {
          prefab.setProperty("colliderRadius", val, objects);
          if (panel.selectedEntity && panel.selectedEntity.prefabId === prefab.id && !panel.selectedEntity.overriddenProperties.has("colliderRadius")) {
            (panel as any).syncEntitySliders();
          }
        },
        onSave: (val: number) => panel.savePrefabProperty(prefab, "colliderRadius", val, "Collider Radius"),
      });

      if (arc.consumableModule) {
        const cm = arc.consumableModule;
        (panel as any).setupScrubber(`scrub-container-prefab-energy-${prefab.id}`, {
          label: "Energy Capacity (J)",
          value: cm.totalEnergyJoulesProp.literalValue,
          min: 10,
          max: 100000,
          step: 50,
          decimals: 0,
          onChange: (val: number) => {
            prefab.setProperty("consumable_totalEnergy", val, objects);
            if (panel.selectedEntity && panel.selectedEntity.prefabId === prefab.id && !panel.selectedEntity.overriddenProperties.has("consumable_totalEnergy")) {
              panel.renderEntityModules();
            }
          },
          onSave: (val: number) => panel.savePrefabProperty(prefab, "consumable_totalEnergy", val, "Energy Capacity"),
        });

        (panel as any).setupScrubber(`scrub-container-prefab-rate-${prefab.id}`, {
          label: "Consume Rate (W)",
          value: cm.consumeRateWattsProp.literalValue,
          min: 10,
          max: 2000,
          step: 10,
          decimals: 0,
          onChange: (val: number) => {
            prefab.setProperty("consumable_consumeRate", val, objects);
            if (panel.selectedEntity && panel.selectedEntity.prefabId === prefab.id && !panel.selectedEntity.overriddenProperties.has("consumable_consumeRate")) {
              panel.renderEntityModules();
            }
          },
          onSave: (val: number) => panel.savePrefabProperty(prefab, "consumable_consumeRate", val, "Consume Rate"),
        });

        (panel as any).setupScrubber(`scrub-container-prefab-heal-${prefab.id}`, {
          label: "Heal Rate (HP/s)",
          value: cm.healRateProp.literalValue,
          min: 0,
          max: 100,
          step: 1,
          decimals: 1,
          onChange: (val: number) => {
            prefab.setProperty("consumable_healRate", val, objects);
            if (panel.selectedEntity && panel.selectedEntity.prefabId === prefab.id && !panel.selectedEntity.overriddenProperties.has("consumable_healRate")) {
              panel.renderEntityModules();
            }
          },
          onSave: (val: number) => panel.savePrefabProperty(prefab, "consumable_healRate", val, "Heal Rate"),
        });

        const unlimPrefabChk = listEl.querySelector(`.prefab-unlimited-chk[data-prefab-id="${prefab.id}"]`) as HTMLInputElement | null;
        if (unlimPrefabChk) {
          unlimPrefabChk.addEventListener("change", () => {
            if (arc.consumableModule) {
              arc.consumableModule.unlimited = unlimPrefabChk.checked;
              prefab.setProperty("consumable_unlimited", unlimPrefabChk.checked, objects);
              if (panel.selectedEntity && panel.selectedEntity.prefabId === prefab.id && !panel.selectedEntity.overriddenProperties.has("consumable_unlimited")) {
                panel.renderEntityModules();
              }
            }
          });
        }
      }
    }

    listEl.querySelectorAll(".input-prefab-name").forEach((input) => {
      input.addEventListener("change", (e) => {
        const pid = (input as HTMLElement).dataset.prefabId!;
        const p = prefabManager.get(pid);
        if (p) {
          p.name = (e.target as HTMLInputElement).value;
          p.archetype.name = p.name;
        }
      });
    });

    listEl.querySelectorAll(".btn-save-prefab-name").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const pid = (btn as HTMLElement).dataset.prefabId!;
        const p = prefabManager.get(pid);
        if (p) {
          const input = listEl.querySelector(`.input-prefab-name[data-prefab-id="${pid}"]`) as HTMLInputElement | null;
          if (input) {
            p.name = input.value;
            p.archetype.name = p.name;
          }
          await panel.savePrefabProperty(p, "name", p.name, "Prefab Name");
        }
      });
    });

    listEl.querySelectorAll(".prefab-color-picker").forEach((picker) => {
      picker.addEventListener("input", (e) => {
        const pid = (picker as HTMLElement).dataset.prefabId!;
        const p = prefabManager.get(pid);
        if (p) {
          const col = (e.target as HTMLInputElement).value;
          p.setProperty("color", col, objects);
          if (panel.selectedEntity && panel.selectedEntity.prefabId === pid && !panel.selectedEntity.overriddenProperties.has("color")) {
            (panel as any).syncEntitySliders();
          }
        }
      });
    });

    listEl.querySelectorAll(".prefab-shape-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pid = (btn as HTMLElement).dataset.prefabId!;
        const p = prefabManager.get(pid);
        if (p) {
          const newShape = p.archetype.visualShape === "box" ? "circle" : "box";
          p.setProperty("visualShape", newShape, objects);
          btn.textContent = newShape === "box" ? "Box 📦" : "Circle ⚪";
          if (panel.selectedEntity && panel.selectedEntity.prefabId === pid && !panel.selectedEntity.overriddenProperties.has("visualShape")) {
            panel.updateSelectorOptions();
          }
        }
      });
    });

    listEl.querySelectorAll(".btn-save-prefab-visuals").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const pid = (btn as HTMLElement).dataset.prefabId!;
        const p = prefabManager.get(pid);
        if (p) {
          await panel.savePrefab(p);
        }
      });
    });

    listEl.querySelectorAll(".prefab-tag-select").forEach((select) => {
      select.addEventListener("change", (e) => {
        const pid = (select as HTMLElement).dataset.prefabId!;
        const p = prefabManager.get(pid);
        if (p) {
          const newTag = (e.target as HTMLSelectElement).value;
          p.setProperty("consumable_tag", newTag, objects);
          if (panel.selectedEntity && panel.selectedEntity.prefabId === pid && !panel.selectedEntity.overriddenProperties.has("consumable_tag")) {
            panel.renderEntityModules();
          }
        }
      });
    });

    listEl.querySelectorAll(".btn-save-prefab-tag").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const pid = (btn as HTMLElement).dataset.prefabId!;
        const p = prefabManager.get(pid);
        if (p && p.archetype.consumableModule) {
          await panel.savePrefabProperty(p, "consumable_tag", p.archetype.consumableModule.tag, "Consumable Tag");
        }
      });
    });

    listEl.querySelectorAll(".btn-save-whole-prefab").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const pid = (btn as HTMLElement).dataset.prefabId!;
        const p = prefabManager.get(pid);
        if (p) {
          await panel.savePrefab(p);
        }
      });
    });

    listEl.querySelectorAll(".btn-spawn-prefab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pid = (btn as HTMLElement).dataset.prefabId!;
        const pos = { x: arena.width / 2, y: arena.height / 2, z: 0 };
        const spawned = prefabManager.spawn(pid, pos, arena, objects);
        if (spawned) {
          if (!objects.includes(spawned)) {
            objects.push(spawned);
          }
          (panel as any).onSpawnObject(spawned);
          panel.markDirty("objects", spawned);
          panel.updateSelectorOptions();
          panel.renderScenePrefabs();
        }
      });
    });

    listEl.querySelectorAll(".btn-delete-prefab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pid = (btn as HTMLElement).dataset.prefabId!;
        prefabManager.delete(pid, objects);
        panel.renderScenePrefabs();
        panel.updatePrefabInfoBadge();
      });
    });
  }
}

