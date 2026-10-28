import { prefabManager } from "../../engine/prefab/PrefabManager.js";
import { sceneSpawnerManager } from "../../engine/spawner/SceneSpawnerManager.js";
import type { DevPanel } from "../DevPanel.js";

/**
 * Isolated DevPanel section for Scene Spawners management & live timer telemetry.
 * Editing Scene Spawner UI or controls happens strictly in this file.
 */
export class SpawnersPanelSection {
  public static renderSceneSpawners(panel: DevPanel): void {
    const container = (panel as any).container as HTMLElement;
    const objects = (panel as any).objects as any[];
    const arena = (panel as any).arena;
    const dirtyState = (panel as any).dirtyState;
    const listEl = container.querySelector("#scene-spawners-list") as HTMLElement | null;
    const badgeEl = container.querySelector("#badge-spawners-count") as HTMLElement | null;
    const allSpawners = sceneSpawnerManager.getAll();
    const allPrefabs = prefabManager.getAll();

    if (badgeEl) badgeEl.textContent = allSpawners.length.toString();
    if (!listEl) return;

    if (allSpawners.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); font-size: 0.74rem; padding: 12px 0;">
          No scene spawners. Click "+ Add Scene Spawner" above to create an automated background spawner.
        </div>
      `;
      return;
    }

    let html = "";
    for (const spawner of allSpawners) {
      let prefabOptsHtml = "";
      for (const p of allPrefabs) {
        const isSel = p.id === spawner.prefabId ? "selected" : "";
        prefabOptsHtml += `<option value="${p.id}" ${isSel}>${p.icon} ${p.name}</option>`;
      }
      if (allPrefabs.length === 0) {
        prefabOptsHtml = `<option value="">(No Prefabs Available)</option>`;
      }

      const activeCount = spawner.getActiveCount(objects);

      html += `
        <div class="behavior-card" data-spawner-card-id="${spawner.id}" style="border: 1px solid rgba(34, 197, 94, 0.35); background: rgba(20, 83, 45, 0.2); margin-bottom: 10px; border-radius: 6px; padding: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px; flex: 1;">
              <input type="checkbox" class="spawner-enabled-toggle" data-spawner-id="${spawner.id}" ${spawner.enabled ? "checked" : ""} style="cursor: pointer;" title="Enable / Disable Spawner" />
              <input class="dev-input input-spawner-name" data-spawner-id="${spawner.id}" value="${spawner.name}" style="flex: 1; padding: 3px 6px; font-weight: 600; font-size: 0.8rem; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 4px; color: #f1f5f9;" />
            </div>
            <div style="display: flex; align-items: center; gap: 4px; margin-left: 8px;">
              <button class="btn-secondary-action btn-spawner-spawn-now" data-spawner-id="${spawner.id}" style="padding: 3px 8px; font-size: 0.72rem; color: #4ade80; border-color: rgba(34, 197, 94, 0.4);" title="Spawn an item at a random open floor location immediately">⚡ Spawn Now</button>
              <button class="btn-icon-subtle btn-delete-spawner" data-spawner-id="${spawner.id}" style="color: #f87171; padding: 3px 6px; font-size: 0.8rem;" title="Delete Spawner">🗑️</button>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px; padding-top: 6px; border-top: 1px solid rgba(34, 197, 94, 0.15);">
            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="font-size: 0.74rem; color: #94a3b8; flex: 0 0 55px;">Prefab:</label>
              <select class="dev-select spawner-prefab-select" data-spawner-id="${spawner.id}" style="flex: 1; padding: 2px 6px; font-size: 0.74rem;">
                ${prefabOptsHtml}
              </select>
            </div>

            <div id="scrub-container-spawner-interval-${spawner.id}"></div>
            <div id="scrub-container-spawner-max-${spawner.id}"></div>

            <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 4px; padding-top: 4px; border-top: 1px dashed rgba(34, 197, 94, 0.2); display: flex; justify-content: space-between; align-items: center;">
              <span>Scene Count: <strong id="spawner-active-count-${spawner.id}" style="color: #4ade80;">${activeCount} / ${spawner.maxCount}</strong></span>
              <span id="spawner-timer-${spawner.id}" style="color: #cbd5e1;"></span>
            </div>
          </div>
        </div>
      `;
    }

    listEl.innerHTML = html;

    for (const spawner of allSpawners) {
      (panel as any).setupScrubber(`scrub-container-spawner-interval-${spawner.id}`, {
        label: `Interval (Minutes/item - ${Math.round(spawner.intervalMinutes * 60)}s)`,
        value: spawner.intervalMinutes,
        min: 0.02,
        max: 60.0,
        step: 0.05,
        decimals: 2,
        suffix: " min",
        onChange: (val: number) => {
          spawner.intervalMinutes = Math.max(0.01, val);
          dirtyState.spawners = true;
          panel.updateDirtyBadge();
        },
      });

      (panel as any).setupScrubber(`scrub-container-spawner-max-${spawner.id}`, {
        label: "Max Items in Scene",
        value: spawner.maxCount,
        min: 1,
        max: 100,
        step: 1,
        decimals: 0,
        suffix: " items",
        onChange: (val: number) => {
          spawner.maxCount = Math.max(1, Math.round(val));
          dirtyState.spawners = true;
          panel.updateDirtyBadge();
        },
      });
    }

    listEl.querySelectorAll(".input-spawner-name").forEach((input) => {
      input.addEventListener("change", (e) => {
        const sid = (input as HTMLElement).dataset.spawnerId!;
        const s = sceneSpawnerManager.get(sid);
        if (s) {
          s.name = (e.target as HTMLInputElement).value;
          dirtyState.spawners = true;
          panel.updateDirtyBadge();
        }
      });
    });

    listEl.querySelectorAll(".spawner-enabled-toggle").forEach((toggle) => {
      toggle.addEventListener("change", (e) => {
        const sid = (toggle as HTMLElement).dataset.spawnerId!;
        const s = sceneSpawnerManager.get(sid);
        if (s) {
          s.enabled = (e.target as HTMLInputElement).checked;
          dirtyState.spawners = true;
          panel.updateDirtyBadge();
        }
      });
    });

    listEl.querySelectorAll(".spawner-prefab-select").forEach((select) => {
      select.addEventListener("change", (e) => {
        const sid = (select as HTMLElement).dataset.spawnerId!;
        const s = sceneSpawnerManager.get(sid);
        if (s) {
          s.prefabId = (e.target as HTMLSelectElement).value;
          dirtyState.spawners = true;
          panel.updateDirtyBadge();
        }
      });
    });

    listEl.querySelectorAll(".btn-spawner-spawn-now").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sid = (btn as HTMLElement).dataset.spawnerId!;
        const s = sceneSpawnerManager.get(sid);
        if (s) {
          const spawned = s.spawnNow(arena, objects, prefabManager);
          if (spawned) {
            (panel as any).onSpawnObject(spawned);
            panel.updateSelectorOptions();
            panel.renderScenePrefabs();
          }
        }
      });
    });

    listEl.querySelectorAll(".btn-delete-spawner").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sid = (btn as HTMLElement).dataset.spawnerId!;
        sceneSpawnerManager.delete(sid);
        dirtyState.spawners = true;
        panel.updateDirtyBadge();
        panel.renderSceneSpawners();
      });
    });
  }

  public static updateSceneSpawnersTelemetry(panel: DevPanel): void {
    const container = (panel as any).container as HTMLElement;
    const objects = (panel as any).objects as any[];
    for (const spawner of sceneSpawnerManager.getAll()) {
      const activeEl = container.querySelector(`#spawner-active-count-${spawner.id}`);
      if (activeEl) {
        const count = spawner.getActiveCount(objects);
        activeEl.textContent = `${count} / ${spawner.maxCount}`;
      }

      const timerEl = container.querySelector(`#spawner-timer-${spawner.id}`) as HTMLElement | null;
      if (timerEl) {
        if (!spawner.enabled) {
          timerEl.textContent = "Disabled";
          timerEl.style.color = "#64748b";
        } else if (spawner.getActiveCount(objects) >= spawner.maxCount) {
          timerEl.textContent = "Max reached (paused)";
          timerEl.style.color = "#fbbf24";
        } else {
          const targetSec = spawner.intervalMinutes * 60;
          const leftSec = Math.max(0, targetSec - spawner.timerSeconds);
          timerEl.textContent = `Next in: ${leftSec.toFixed(1)}s`;
          timerEl.style.color = "#4ade80";
        }
      }
    }
  }
}

