import { Character } from "../../character/Character.js";
import { GameObject } from "../../engine/GameObject.js";
import type { DynamicProperty } from "../../engine/properties/DynamicProperty.js";
import type { Prefab } from "../../engine/prefab/Prefab.js";
import { prefabManager } from "../../engine/prefab/PrefabManager.js";
import { sceneSpawnerManager } from "../../engine/spawner/SceneSpawnerManager.js";
import {
  type WorldConfig,
  type WorldConfigDelta,
  type SerializedPrefabConfig,
  serializeGameObject,
  deserializeGameObject,
  serializePrefab,
} from "../../config/WorldConfig.js";
import { PlayerDeltaBuilder } from "./PlayerDeltaBuilder.js";
import type { DevPanel } from "../DevPanel.js";

/**
 * Isolated DevPanel persistence service for saving individual properties,
 * toggles, prefabs, arena/spawner configs, and git data sync.
 */
export class DevConfigPersistence {
  public static async saveIndividualProperty(
    panel: DevPanel,
    owner: GameObject,
    prop: DynamicProperty,
    value: number,
    label?: string
  ): Promise<void> {
    if ((panel as any).isOnlineLocked) {
      panel.showSaveToast("🔒 DevTools save disabled in online mode", true);
      return;
    }

    const objects = (panel as any).objects as GameObject[];
    const dirtyState = (panel as any).dirtyState;
    const getAllCharacters = (panel as any).getAllCharacters as (() => Character[]) | undefined;

    const canonicalPath = PlayerDeltaBuilder.resolvePropertyPath(owner, prop, label);
    const isChar = owner instanceof Character || (owner as any).isCharacter;
    if (isChar) {
      const char = owner as Character;
      const playerPrefab = prefabManager.get("prefab_player");
      if (playerPrefab) {
        playerPrefab.setProperty(canonicalPath, value, getAllCharacters ? getAllCharacters() : [char]);
      }

      const playerDelta = PlayerDeltaBuilder.buildSinglePropertyPlayerDelta(canonicalPath, value);
      const delta: WorldConfigDelta = {
        clientVersion: (panel as any).currentConfigVersion,
        sections: ["player"],
        player: playerDelta,
      };

      const resp = await fetch("/api/dev/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(delta),
      });

      if (!resp.ok) {
        throw new Error(`Server returned ${resp.status}`);
      }
      const res = await resp.json();
      (panel as any).currentConfigVersion = res.version ?? ((panel as any).currentConfigVersion + 1);
      dirtyState.player = false;
      panel.updateDirtyBadge();
      panel.showSaveToast(`💾 Saved ${label || canonicalPath}: ${Number(value.toFixed(2))} to Player Prefab & Config`);
    } else {
      let affectedObjects: GameObject[] = [owner];
      let prefabsUpsert: SerializedPrefabConfig[] | undefined = undefined;
      const sections: ("objects" | "prefabs")[] = ["objects"];

      if (owner.prefabId) {
        const prefab = prefabManager.get(owner.prefabId);
        if (prefab) {
          prefab.setProperty(canonicalPath, value, objects);
          prefabsUpsert = [serializePrefab(prefab)];
          sections.push("prefabs");
          affectedObjects = objects.filter((o) => o.prefabId === owner.prefabId && !o.overriddenProperties.has(canonicalPath));
          if (!affectedObjects.includes(owner)) affectedObjects.push(owner);
        }
      }

      const delta: WorldConfigDelta = {
        clientVersion: (panel as any).currentConfigVersion,
        sections,
        objectsDelta: {
          upsert: affectedObjects.map(serializeGameObject),
        },
        prefabsDelta: prefabsUpsert ? { upsert: prefabsUpsert } : undefined,
      };

      const resp = await fetch("/api/dev/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(delta),
      });

      if (!resp.ok) {
        throw new Error(`Server returned ${resp.status}`);
      }
      const res = await resp.json();
      (panel as any).currentConfigVersion = res.version ?? ((panel as any).currentConfigVersion + 1);
      for (const obj of affectedObjects) {
        dirtyState.modifiedObjects.delete(obj.id);
      }
      panel.updateDirtyBadge();
      const instanceText = affectedObjects.length > 1 ? ` (${affectedObjects.length} instances)` : "";
      panel.showSaveToast(`💾 Saved ${label || canonicalPath}: ${Number(value.toFixed(2))} to ${owner.name}${owner.prefabId ? " Prefab & Scene" : ""}${instanceText}`);
    }
  }

  public static async saveIndividualToggle(
    panel: DevPanel,
    owner: GameObject,
    keyPath: string,
    value: boolean,
    label: string,
    saveBtn?: HTMLButtonElement | null
  ): Promise<void> {
    if ((panel as any).isOnlineLocked) {
      panel.showSaveToast("🔒 DevTools save disabled in online mode", true);
      return;
    }

    const objects = (panel as any).objects as GameObject[];
    const dirtyState = (panel as any).dirtyState;
    const getAllCharacters = (panel as any).getAllCharacters as (() => Character[]) | undefined;

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.style.opacity = "0.5";
    }

    try {
      const isChar = owner instanceof Character || (owner as any).isCharacter;
      if (isChar) {
        const char = owner as Character;
        const playerPrefab = prefabManager.get("prefab_player");
        if (playerPrefab) {
          playerPrefab.setProperty(keyPath, value, getAllCharacters ? getAllCharacters() : [char]);
        }

        const playerDelta = PlayerDeltaBuilder.buildSinglePropertyPlayerDelta(keyPath, value);
        const delta: WorldConfigDelta = {
          clientVersion: (panel as any).currentConfigVersion,
          sections: ["player"],
          player: playerDelta,
        };

        const resp = await fetch("/api/dev/save-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(delta),
        });

        if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
        const res = await resp.json();
        (panel as any).currentConfigVersion = res.version ?? ((panel as any).currentConfigVersion + 1);
        dirtyState.player = false;
        panel.updateDirtyBadge();
        panel.showSaveToast(`💾 Saved ${label}: ${value ? "ON" : "OFF"} to Player Prefab & Config`);
      } else {
        let affectedObjects: GameObject[] = [owner];
        let prefabsUpsert: SerializedPrefabConfig[] | undefined = undefined;
        const sections: ("objects" | "prefabs")[] = ["objects"];

        if (owner.prefabId) {
          const prefab = prefabManager.get(owner.prefabId);
          if (prefab) {
            prefab.setProperty(keyPath, value, objects);
            prefabsUpsert = [serializePrefab(prefab)];
            sections.push("prefabs");
            affectedObjects = objects.filter((o) => o.prefabId === owner.prefabId && !o.overriddenProperties.has(keyPath));
            if (!affectedObjects.includes(owner)) affectedObjects.push(owner);
          }
        }
        const delta: WorldConfigDelta = {
          clientVersion: (panel as any).currentConfigVersion,
          sections,
          objectsDelta: {
            upsert: affectedObjects.map(serializeGameObject),
          },
          prefabsDelta: prefabsUpsert ? { upsert: prefabsUpsert } : undefined,
        };
        const resp = await fetch("/api/dev/save-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(delta),
        });
        if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
        const res = await resp.json();
        (panel as any).currentConfigVersion = res.version ?? ((panel as any).currentConfigVersion + 1);
        for (const obj of affectedObjects) {
          dirtyState.modifiedObjects.delete(obj.id);
        }
        panel.updateDirtyBadge();
        const instanceText = affectedObjects.length > 1 ? ` (${affectedObjects.length} instances)` : "";
        panel.showSaveToast(`💾 Saved ${label}: ${value ? "ON" : "OFF"} to ${owner.name}${owner.prefabId ? " Prefab & Scene" : ""}${instanceText}`);
      }
    } catch (err: any) {
      console.error(`Failed to save toggle ${label}:`, err);
      panel.showSaveToast(`❌ Failed to save ${label}: ${err.message || err}`, true);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.style.opacity = "1";
      }
    }
  }

  public static async savePrefabProperty(
    panel: DevPanel,
    prefab: Prefab,
    propKey: string,
    value: any,
    label?: string
  ): Promise<void> {
    if ((panel as any).isOnlineLocked) {
      panel.showSaveToast("🔒 DevTools save disabled in online mode", true);
      return;
    }

    const objects = (panel as any).objects as GameObject[];
    const dirtyState = (panel as any).dirtyState;

    prefab.setProperty(propKey, value, objects);
    const affectedObjects = objects.filter((o) => o.prefabId === prefab.id && !o.overriddenProperties.has(propKey));

    const delta: WorldConfigDelta = {
      clientVersion: (panel as any).currentConfigVersion,
      sections: ["prefabs", "objects"],
      prefabsDelta: {
        upsert: [serializePrefab(prefab)],
      },
      objectsDelta: {
        upsert: affectedObjects.map(serializeGameObject),
      },
    };

    const resp = await fetch("/api/dev/save-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(delta),
    });

    if (!resp.ok) {
      throw new Error(`Server returned ${resp.status}`);
    }
    const res = await resp.json();
    (panel as any).currentConfigVersion = res.version ?? ((panel as any).currentConfigVersion + 1);
    for (const obj of affectedObjects) {
      dirtyState.modifiedObjects.delete(obj.id);
    }
    panel.updateDirtyBadge();
    const valDisplay = typeof value === "number" ? Number(value.toFixed(2)) : value;
    panel.showSaveToast(`💾 Saved ${label || propKey}: ${valDisplay} to ${prefab.name} Prefab & ${affectedObjects.length} live instance${affectedObjects.length === 1 ? "" : "s"}`);
  }

  public static async savePrefab(panel: DevPanel, prefab: Prefab): Promise<void> {
    if ((panel as any).isOnlineLocked) {
      panel.showSaveToast("🔒 DevTools save disabled in online mode", true);
      return;
    }

    const objects = (panel as any).objects as GameObject[];
    const dirtyState = (panel as any).dirtyState;

    const affectedObjects = objects.filter((o) => o.prefabId === prefab.id);
    const delta: WorldConfigDelta = {
      clientVersion: (panel as any).currentConfigVersion,
      sections: ["prefabs", "objects"],
      prefabsDelta: {
        upsert: [serializePrefab(prefab)],
      },
      objectsDelta: {
        upsert: affectedObjects.map(serializeGameObject),
      },
    };

    const resp = await fetch("/api/dev/save-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(delta),
    });

    if (!resp.ok) {
      throw new Error(`Server returned ${resp.status}`);
    }
    const res = await resp.json();
    (panel as any).currentConfigVersion = res.version ?? ((panel as any).currentConfigVersion + 1);
    for (const obj of affectedObjects) {
      dirtyState.modifiedObjects.delete(obj.id);
    }
    panel.updateDirtyBadge();
    panel.showSaveToast(`💾 Saved ${prefab.name} Prefab to Project & ${affectedObjects.length} live instances`);
  }

  public static async saveProjectConfig(panel: DevPanel): Promise<void> {
    if ((panel as any).isOnlineLocked) {
      panel.showSaveToast("🔒 DevTools save disabled in online mode", true);
      return;
    }

    const container = (panel as any).container as HTMLElement;
    const arena = (panel as any).arena;
    const dirtyState = (panel as any).dirtyState;

    const sections: ("arena" | "globalPhysics" | "spawners")[] = [];
    if (dirtyState.globalPhysics) sections.push("globalPhysics");
    if (dirtyState.arena) sections.push("arena");
    if (dirtyState.spawners) sections.push("spawners");

    if (sections.length === 0) {
      sections.push("arena", "globalPhysics", "spawners");
    }

    const delta: WorldConfigDelta = {
      clientVersion: (panel as any).currentConfigVersion,
      sections,
      spawners: sceneSpawnerManager.getAll().map((s) => ({
        id: s.id,
        name: s.name,
        enabled: s.enabled,
        prefabId: s.prefabId,
        intervalMinutes: s.intervalMinutes,
        maxCount: s.maxCount,
        designatedSpawnPoints: s.designatedSpawnPoints ? [...s.designatedSpawnPoints] : [],
      })),
    };

    if (sections.includes("globalPhysics")) {
      delta.globalPhysics = {
        gravity: arena.gravity,
        collisionDamageScale: GameObject.globalWorldCollisionDamageScale ?? 1.0,
      };
    }

    if (sections.includes("arena")) {
      const tileGrid: number[][] = [];
      for (let r = 0; r < arena.rows; r++) {
        tileGrid.push([...arena.tileGrid[r]]);
      }
      delta.arena = {
        width: arena.width,
        height: arena.height,
        wallHeight: arena.wallHeight,
        presetId: arena.currentPresetId,
        tileGrid,
      };
    }

    const btn = container.querySelector("#btn-save-project-config") as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "💾 Saving...";
    }

    try {
      const resp = await fetch("/api/dev/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(delta),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || `Server responded with status ${resp.status}`);
      }

      const res = await resp.json();
      (panel as any).currentConfigVersion = res.version ?? ((panel as any).currentConfigVersion + 1);

      dirtyState.globalPhysics = false;
      dirtyState.arena = false;
      dirtyState.spawners = false;
      panel.updateDirtyBadge();

      if (btn) {
        btn.textContent = "✓ Saved Physics, Arena & Spawners!";
        setTimeout(() => {
          if (btn) {
            btn.disabled = false;
            btn.textContent = "💾 Save Physics, Arena & Spawners";
          }
        }, 1500);
      }

      panel.showSaveToast(`💾 Saved Physics, Arena & Spawners to project! (v${(panel as any).currentConfigVersion})`);
    } catch (err: any) {
      console.error("Failed to save project config:", err);
      panel.showSaveToast(`❌ Failed to save: ${err.message || String(err)}`, true);
      alert("Failed to save project configuration:\n" + (err.message || String(err)));
      if (btn) {
        btn.disabled = false;
        btn.textContent = "💾 Save Physics, Arena & Spawners";
      }
    }
  }

  public static async pushDataToGit(panel: DevPanel): Promise<void> {
    if ((panel as any).isOnlineLocked) {
      panel.showSaveToast("🔒 Git operations disabled in online mode", true);
      return;
    }

    try {
      panel.showSaveToast("⏳ Pushing data changes to GitHub...");
      const resp = await fetch("/api/dev/git-push-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || `Server responded with status ${resp.status}`);
      }

      const res = await resp.json();
      panel.showSaveToast(`✅ Data pushed to GitHub! (${res.commitSha || "synced"})`);
    } catch (err: any) {
      console.error("Failed to push data to git:", err);
      panel.showSaveToast(`❌ Failed to push: ${err.message || String(err)}`, true);
      alert("Failed to push data to GitHub:\n" + (err.message || String(err)));
    }
  }

  public static async reloadFromDisk(panel: DevPanel): Promise<void> {
    const container = (panel as any).container as HTMLElement;
    const arena = (panel as any).arena;
    const objects = (panel as any).objects as GameObject[];
    const dirtyState = (panel as any).dirtyState;
    const getAllCharacters = (panel as any).getAllCharacters as (() => Character[]) | undefined;
    const character = (panel as any).character as Character | undefined;
    const getGameLoop = (panel as any).getGameLoop as (() => any) | undefined;

    try {
      const resp = await fetch("/api/dev/world-config");
      if (!resp.ok) {
        throw new Error(`Failed to fetch world-config: ${resp.status}`);
      }
      const config: WorldConfig = await resp.json();

      if (config.arena) {
        arena.setStandardWallHeight(config.arena.wallHeight);
        if (config.arena.tileGrid && config.arena.tileGrid.length > 0) {
          arena.tileGrid = config.arena.tileGrid.map((row) => [...row]);
          arena.rebuildWalls();
        } else if (config.arena.presetId) {
          const chars = getAllCharacters ? getAllCharacters() : (character ? [character] : []);
          arena.loadWallPreset(config.arena.presetId, [...chars, ...objects]);
        }
        const chars = getAllCharacters ? getAllCharacters() : (character ? [character] : []);
        arena.syncEntitiesWithWalls([...chars, ...objects]);
        panel.updateWallPresetUI();
      }

      if (config.globalPhysics) {
        arena.gravity = config.globalPhysics.gravity;
        GameObject.globalWorldCollisionDamageScale = config.globalPhysics.collisionDamageScale;
        const loop = getGameLoop ? getGameLoop() : null;
        if (loop) {
          loop.worldCollisionDamageScale = config.globalPhysics.collisionDamageScale;
        }
      }

      if (config.objects) {
        (panel as any).onClearObjects();
        for (const ser of config.objects) {
          const obj = deserializeGameObject(ser);
          (panel as any).onSpawnObject(obj);
        }
      }

      if (config.prefabs && Array.isArray(config.prefabs)) {
        prefabManager.loadFromConfig(config.prefabs);
        panel.renderScenePrefabs();
      }

      if (config.spawners && Array.isArray(config.spawners)) {
        sceneSpawnerManager.loadFromConfig(config.spawners);
        panel.renderSceneSpawners();
      }

      (panel as any).currentConfigVersion = config.version;
      dirtyState.arena = false;
      dirtyState.globalPhysics = false;
      dirtyState.spawners = false;
      dirtyState.modifiedObjects.clear();
      dirtyState.deletedObjectIds.clear();

      panel.updateDirtyBadge();
      panel.updateSelectorOptions();
      panel.renderEntityModules();
      (panel as any).syncEntitySliders();
      panel.updateInspector();

      const popover = container.querySelector("#save-options-popover") as HTMLElement | null;
      if (popover) popover.style.display = "none";
    } catch (err: any) {
      console.error("Failed to reload config from disk:", err);
      alert("Failed to reload from disk:\n" + (err.message || String(err)));
    }
  }
}

