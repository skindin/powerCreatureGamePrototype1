var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { WebSocketServer, WebSocket } from "ws";
import fs from "node:fs";
import path from "node:path";
class VerticalPositionModule {
  constructor(options = {}) {
    __publicField(this, "z");
    __publicField(this, "hasVerticalVelocity");
    __publicField(this, "verticalVelocity");
    __publicField(this, "enabled");
    this.z = options.z ?? 0;
    this.hasVerticalVelocity = options.hasVerticalVelocity !== void 0 ? options.hasVerticalVelocity : true;
    this.verticalVelocity = options.verticalVelocity ?? 0;
    this.enabled = options.enabled !== void 0 ? options.enabled : true;
  }
}
const _Arena = class _Arena {
  constructor(width = 20, height = 14, tileSize = 1) {
    __publicField(this, "width");
    __publicField(this, "height");
    __publicField(this, "tileSize");
    __publicField(this, "cols");
    __publicField(this, "rows");
    __publicField(this, "wallHeight");
    // Standard height for all walls
    __publicField(this, "gravity");
    __publicField(this, "frictionCoeff");
    __publicField(this, "staticFrictionThreshold");
    __publicField(this, "tileGrid");
    __publicField(this, "walls", []);
    __publicField(this, "currentPresetId", "standard");
    /** All active game objects and characters in the arena */
    __publicField(this, "entities", []);
    /** Active visual altitude scale for pseudo-3D elevation */
    __publicField(this, "visualAltitudeScale", 0.5);
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
    this.cols = Math.floor(width / tileSize);
    this.rows = Math.floor(height / tileSize);
    this.wallHeight = 1;
    this.gravity = 30;
    this.frictionCoeff = 10.4;
    this.staticFrictionThreshold = 0.16;
    this.tileGrid = Array.from(
      { length: this.rows },
      () => Array.from({ length: this.cols }, () => 0)
    );
    this.loadWallPreset("standard");
  }
  /**
   * Reconstructs the physical wall array from the tile grid using standard wall height
   */
  rebuildWalls() {
    this.walls = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.tileGrid[r][c] === 1) {
          this.walls.push({
            id: `wall-${c}-${r}`,
            x: c * this.tileSize,
            y: r * this.tileSize,
            width: this.tileSize,
            height: this.tileSize,
            wallHeight: this.wallHeight
            // All walls have this standard height
          });
        }
      }
    }
  }
  /**
   * Updates standard wall height and synchronizes all walls
   */
  setStandardWallHeight(newHeight) {
    this.wallHeight = newHeight;
    this.rebuildWalls();
  }
  /**
   * Sets a specific grid cell to wall (1) or empty (0) and rebuilds physical walls
   */
  setWallTile(col, row, isWall) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    const val = isWall ? 1 : 0;
    if (this.tileGrid[row][col] === val) return false;
    this.tileGrid[row][col] = val;
    this.rebuildWalls();
    return true;
  }
  /**
   * Checks if a grid cell has a wall
   */
  hasWall(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    return this.tileGrid[row][col] === 1;
  }
  /**
   * Loads a predefined wall layout by preset ID and optionally syncs entity elevations
   */
  loadWallPreset(presetId, entities) {
    const preset = _Arena.WALL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return false;
    this.currentPresetId = presetId;
    this.tileGrid = preset.generate(this.cols, this.rows);
    this.rebuildWalls();
    this.syncEntitiesWithWalls(entities);
    return true;
  }
  /**
   * Synchronizes entity elevations: any entity on the ground overlapping a newly placed wall
   * is smoothly elevated to the wall height.
   */
  syncEntitiesWithWalls(entities) {
    var _a;
    if (!entities) return;
    for (const ent of entities) {
      const r = ent.hasCollider ? ent.colliderRadius : ((_a = ent.colliderModule) == null ? void 0 : _a.radius) ?? 0.32;
      const supportingWall = this.getSupportingWall(ent.position.x, ent.position.y, r);
      if (supportingWall) {
        if (ent.position.z < supportingWall.wallHeight) {
          if (!ent.hasVerticalPosition) {
            if (!ent.verticalPositionModule) {
              ent.verticalPositionModule = new VerticalPositionModule({
                z: supportingWall.wallHeight,
                hasVerticalVelocity: true
              });
            } else {
              ent.verticalPositionModule.enabled = true;
            }
          }
          ent.position.z = supportingWall.wallHeight;
          ent.supportingSurfaceHeight = supportingWall.wallHeight;
          ent.standingWall = supportingWall;
          ent.verticalVelocity = 0;
        } else {
          ent.standingWall = supportingWall;
          ent.supportingSurfaceHeight = supportingWall.wallHeight;
        }
      } else {
        if (ent.supportingSurfaceHeight >= this.wallHeight - 0.05 || ent.standingWall !== null) {
          ent.standingWall = null;
          ent.supportingSurfaceHeight = 0;
          if (ent.isCharacter) {
            const char = ent;
            if (char.climbingModule) {
              char.climbingModule.isDismountFreefall = true;
            }
          }
        }
      }
    }
  }
  /**
   * Clears all internal walls from the arena
   */
  clearAllWalls(entities) {
    this.loadWallPreset("empty", entities);
  }
  /**
   * Resets the arena to its default layout (Standard Arena)
   */
  resetDefaultWalls(entities) {
    this.loadWallPreset("standard", entities);
  }
  /**
   * Checks if a point (x, y) is located within the footprint of a wall
   */
  getWallAt(x, y) {
    for (const wall of this.walls) {
      if (x >= wall.x && x <= wall.x + wall.width && y >= wall.y && y <= wall.y + wall.height) {
        return wall;
      }
    }
    return null;
  }
  /**
   * Tests if a circle collider at (x, y) with radius overlaps a wall's 2D footprint.
   */
  testWallOverlap(x, y, radius, wall) {
    const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
    const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
    const dx = x - closestX;
    const dy = y - closestY;
    return dx * dx + dy * dy <= radius * radius + 1e-6;
  }
  /**
   * Finds the wall supporting an entity at (x, y) with given collider radius.
   * If the collider overlaps any wall, that wall supports the entity.
   */
  getSupportingWall(x, y, radius = 0) {
    if (radius <= 0) {
      return this.getWallAt(x, y);
    }
    for (const wall of this.walls) {
      if (this.testWallOverlap(x, y, radius, wall)) {
        return wall;
      }
    }
    return null;
  }
  /**
   * Tests if two walls touch or are contiguous (share an edge or corner with no gap)
   */
  areWallsContiguous(w1, w2) {
    if (w1.id === w2.id) return true;
    const xDist = Math.max(0, Math.max(w1.x, w2.x) - Math.min(w1.x + w1.width, w2.x + w2.width));
    const yDist = Math.max(0, Math.max(w1.y, w2.y) - Math.min(w1.y + w1.height, w2.y + w2.height));
    const xOverlap = Math.min(w1.x + w1.width, w2.x + w2.width) - Math.max(w1.x, w2.x);
    const yOverlap = Math.min(w1.y + w1.height, w2.y + w2.height) - Math.max(w1.y, w2.y);
    return xDist < 1e-3 && yOverlap > 0.05 || yDist < 1e-3 && xOverlap > 0.05;
  }
  /**
   * Returns the elevation of the physical surface directly beneath (x, y) for a collider of radius.
   * If the collider overlaps a wall, returns wall.wallHeight.
   * Otherwise returns 0 (ground level).
   */
  getSupportingSurfaceHeight(x, y, radius = 0) {
    const wall = this.getSupportingWall(x, y, radius);
    return wall ? wall.wallHeight : 0;
  }
};
__publicField(_Arena, "WALL_PRESETS", [
  {
    id: "standard",
    name: "🏛️ Standard Arena",
    badge: "Balanced",
    description: "Center dividing wall with an open gateway and two 2×2 cover obstacles.",
    generate: (cols, rows) => {
      const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
      const midCol = 10;
      for (let r = 1; r <= 4; r++) grid[r][midCol] = 1;
      for (let r = 8; r <= 12; r++) grid[r][midCol] = 1;
      grid[4][4] = 1;
      grid[5][4] = 1;
      grid[4][5] = 1;
      grid[5][5] = 1;
      grid[7][15] = 1;
      grid[8][15] = 1;
      grid[7][16] = 1;
      grid[8][16] = 1;
      return grid;
    }
  },
  {
    id: "trenches",
    name: "⛏️ Trench Tunnels",
    badge: "Dense Walls",
    description: "Mostly elevated walls with a winding network of 1-tile-wide ground-level trench tunnels.",
    generate: (cols, rows) => {
      const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 1));
      for (let c = 2; c <= 17; c++) {
        grid[3][c] = 0;
        grid[7][c] = 0;
        grid[10][c] = 0;
      }
      for (let r = 2; r <= 11; r++) {
        grid[r][5] = 0;
        grid[r][10] = 0;
        grid[r][14] = 0;
      }
      grid[1][10] = 0;
      grid[12][10] = 0;
      grid[7][1] = 0;
      grid[7][18] = 0;
      for (let r = 5; r <= 9; r++) grid[r][2] = 0;
      for (let r = 5; r <= 9; r++) grid[r][17] = 0;
      for (let c = 2; c <= 5; c++) grid[5][c] = 0;
      for (let c = 10; c <= 14; c++) grid[5][c] = 0;
      for (let c = 5; c <= 10; c++) grid[9][c] = 0;
      for (let c = 14; c <= 17; c++) grid[9][c] = 0;
      grid[7][5] = 0;
      return grid;
    }
  },
  {
    id: "courtyards",
    name: "🏰 Courtyards & Platforms",
    badge: "4 Quadrants",
    description: "Four large raised platforms in each corner with a central dais and open courtyards.",
    generate: (cols, rows) => {
      const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
      for (let r = 2; r <= 4; r++) {
        for (let c = 3; c <= 6; c++) grid[r][c] = 1;
        for (let c = 13; c <= 16; c++) grid[r][c] = 1;
      }
      for (let r = 9; r <= 11; r++) {
        for (let c = 3; c <= 6; c++) grid[r][c] = 1;
        for (let c = 13; c <= 16; c++) grid[r][c] = 1;
      }
      for (let r = 6; r <= 7; r++) {
        for (let c = 9; c <= 10; c++) grid[r][c] = 1;
      }
      return grid;
    }
  },
  {
    id: "pillars",
    name: "🗿 Pillars & Monoliths",
    badge: "Tactical Cover",
    description: "Raised monoliths and stepping-stone pillars scattered across the arena.",
    generate: (cols, rows) => {
      const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
      const pillarCoords = [
        [3, 2],
        [8, 2],
        [15, 2],
        [3, 10],
        [8, 10],
        [15, 10],
        [5, 6],
        [13, 6],
        [9, 6]
      ];
      for (const [pc, pr] of pillarCoords) {
        grid[pr][pc] = 1;
        grid[pr + 1][pc] = 1;
        grid[pr][pc + 1] = 1;
        grid[pr + 1][pc + 1] = 1;
      }
      return grid;
    }
  },
  {
    id: "maze",
    name: "🌀 Labyrinth Maze",
    badge: "Winding Paths",
    description: "Interlocking corridors and winding paths with high walls to climb over or navigate.",
    generate: (cols, rows) => {
      const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
      for (let r = 1; r <= 9; r++) grid[r][4] = 1;
      for (let r = 4; r <= 12; r++) grid[r][7] = 1;
      for (let r = 1; r <= 9; r++) grid[r][10] = 1;
      for (let r = 4; r <= 12; r++) grid[r][13] = 1;
      for (let r = 1; r <= 9; r++) grid[r][16] = 1;
      for (let c = 7; c <= 10; c++) grid[4][c] = 1;
      for (let c = 13; c <= 16; c++) grid[4][c] = 1;
      for (let c = 4; c <= 7; c++) grid[9][c] = 1;
      for (let c = 10; c <= 13; c++) grid[9][c] = 1;
      return grid;
    }
  },
  {
    id: "empty",
    name: "⬜ Empty (Open Arena)",
    badge: "Clean Slate",
    description: "Completely open arena with zero walls for custom level design.",
    generate: (cols, rows) => {
      return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
    }
  }
]);
let Arena = _Arena;
class DynamicProperty {
  constructor(initialValue = 0, isReference = false, referenceKey = "") {
    __publicField(this, "isReference", false);
    __publicField(this, "referenceKey", "");
    __publicField(this, "literalValue", 0);
    // Listeners for UI reactivity (e.g. syncing DevPanel inputs)
    __publicField(this, "_listeners", /* @__PURE__ */ new Set());
    this.literalValue = initialValue;
    this.isReference = isReference;
    this.referenceKey = referenceKey;
  }
  /**
   * Resolves the current numeric value given an owner registry.
   * If in reference mode and the property doesn't exist, it remains in
   * "limbo" and returns literalValue as fallback.
   */
  get(registry) {
    if (this.isReference && this.referenceKey && registry) {
      const ref = registry.get(this.referenceKey);
      if (ref !== void 0) {
        return ref;
      }
    }
    return this.literalValue;
  }
  /**
   * Sets the numeric value.
   * If in reference mode and the reference exists in the registry,
   * it updates the shared registry value (which updates all sockets referencing it).
   * Otherwise, updates the literal value.
   */
  set(value, registry) {
    if (this.isReference && this.referenceKey && registry && registry.has(this.referenceKey)) {
      registry.set(this.referenceKey, value);
    } else {
      this.literalValue = value;
    }
    this.notify();
  }
  /**
   * Check if this property is in a "limbo/broken" state (referencing a key that does not exist).
   */
  isLimbo(registry) {
    if (!this.isReference || !this.referenceKey) return false;
    if (!registry) return true;
    return !registry.has(this.referenceKey);
  }
  /**
   * Switches to reference mode and links to a specific key.
   */
  link(referenceKey, registry) {
    this.isReference = true;
    this.referenceKey = referenceKey;
    if (registry && registry.has(referenceKey)) {
      this.literalValue = registry.get(referenceKey);
    }
    this.notify();
  }
  /**
   * Unlinks from reference mode and becomes a standalone literal value.
   */
  unlink() {
    this.isReference = false;
    this.referenceKey = "";
    this.notify();
  }
  subscribe(cb) {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }
  notify() {
    for (const cb of this._listeners) {
      cb(this);
    }
  }
  clone() {
    const p = new DynamicProperty(this.literalValue, this.isReference, this.referenceKey);
    return p;
  }
}
class ObjectPropertiesRegistry {
  constructor(initialEntries) {
    __publicField(this, "_properties", /* @__PURE__ */ new Map());
    __publicField(this, "_changeListeners", /* @__PURE__ */ new Set());
    if (initialEntries) {
      for (const [k, v] of Object.entries(initialEntries)) {
        this._properties.set(k, v);
      }
    }
  }
  has(name) {
    return this._properties.has(name);
  }
  get(name) {
    return this._properties.get(name);
  }
  set(name, value) {
    this._properties.set(name, value);
    this.notify();
  }
  /**
   * Adds a new named property with uniqueness enforcement.
   * If the name already exists, returns false or throws.
   */
  add(name, initialValue = 1) {
    const trimmed = name.trim();
    if (!trimmed || this._properties.has(trimmed)) {
      return false;
    }
    this._properties.set(trimmed, initialValue);
    this.notify();
    return true;
  }
  /**
   * Deletes a named property. Referencing sockets will remain referencing this string
   * but enter a Limbo/Warning state.
   */
  delete(name) {
    const deleted = this._properties.delete(name);
    if (deleted) {
      this.notify();
    }
    return deleted;
  }
  /**
   * Renames a property. Updates all registered DynamicProperty sockets pointing to oldName to newName.
   */
  rename(oldName, newName, socketsToUpdate) {
    const trimmedNew = newName.trim();
    if (!trimmedNew || trimmedNew === oldName) return false;
    if (this._properties.has(trimmedNew)) return false;
    const val = this._properties.get(oldName);
    if (val === void 0) return false;
    this._properties.delete(oldName);
    this._properties.set(trimmedNew, val);
    if (socketsToUpdate) {
      for (const socket of socketsToUpdate) {
        if (socket.isReference && socket.referenceKey === oldName) {
          socket.referenceKey = trimmedNew;
          socket.notify();
        }
      }
    }
    this.notify();
    return true;
  }
  getAll() {
    const list = [];
    for (const [name, value] of this._properties.entries()) {
      list.push({ name, value });
    }
    return list;
  }
  subscribe(cb) {
    this._changeListeners.add(cb);
    return () => this._changeListeners.delete(cb);
  }
  notify() {
    for (const cb of this._changeListeners) {
      cb();
    }
  }
  toJSON() {
    const out = {};
    for (const [k, v] of this._properties.entries()) {
      out[k] = v;
    }
    return out;
  }
  static fromJSON(data) {
    return new ObjectPropertiesRegistry(data);
  }
}
class ColliderModule {
  constructor(options = {}) {
    __publicField(this, "radiusProp");
    __publicField(this, "ccdThresholdRatioProp");
    __publicField(this, "enabled");
    __publicField(this, "canSweep");
    this.radiusProp = new DynamicProperty(options.radius ?? 0.32);
    this.ccdThresholdRatioProp = new DynamicProperty(options.ccdThresholdRatio ?? 0.5);
    this.enabled = options.enabled ?? true;
    this.canSweep = options.canSweep ?? true;
  }
  get radius() {
    return this.radiusProp.literalValue;
  }
  set radius(val) {
    this.radiusProp.literalValue = val;
  }
  get ccdThresholdRatio() {
    return this.ccdThresholdRatioProp.literalValue;
  }
  set ccdThresholdRatio(val) {
    this.ccdThresholdRatioProp.literalValue = val;
  }
  getRadius(registry) {
    return this.radiusProp.get(registry);
  }
  getCcdThresholdRatio(registry) {
    return this.ccdThresholdRatioProp.get(registry);
  }
}
class FrictionModule {
  constructor(options = {}) {
    __publicField(this, "staticFrictionProp");
    __publicField(this, "dynamicFrictionProp");
    __publicField(this, "enabled");
    this.staticFrictionProp = new DynamicProperty(options.staticFrictionMod ?? 1);
    this.dynamicFrictionProp = new DynamicProperty(options.dynamicFrictionMod ?? 1);
    this.enabled = options.enabled ?? true;
  }
  get staticFrictionMod() {
    return this.staticFrictionProp.literalValue;
  }
  set staticFrictionMod(val) {
    this.staticFrictionProp.literalValue = val;
  }
  get dynamicFrictionMod() {
    return this.dynamicFrictionProp.literalValue;
  }
  set dynamicFrictionMod(val) {
    this.dynamicFrictionProp.literalValue = val;
  }
  getStaticFrictionMod(registry) {
    return this.staticFrictionProp.get(registry);
  }
  getDynamicFrictionMod(registry) {
    return this.dynamicFrictionProp.get(registry);
  }
}
class BounceModule {
  constructor(options = {}) {
    __publicField(this, "bounceModProp");
    __publicField(this, "verticalBounce");
    __publicField(this, "enabled");
    this.bounceModProp = new DynamicProperty(options.bounceMod ?? 0.4);
    this.verticalBounce = options.verticalBounce ?? true;
    this.enabled = options.enabled ?? true;
  }
  get bounceMod() {
    return this.bounceModProp.literalValue;
  }
  set bounceMod(val) {
    this.bounceModProp.literalValue = val;
  }
  getBounceMod(registry) {
    return this.bounceModProp.get(registry);
  }
}
class GravityModule {
  constructor(options = {}) {
    __publicField(this, "enabled");
    this.enabled = options.enabled ?? true;
  }
}
class RigidbodyModule {
  constructor(options = {}) {
    __publicField(this, "massProp");
    __publicField(this, "velocity");
    __publicField(this, "hasVerticalVelocity");
    __publicField(this, "verticalVelocity");
    __publicField(this, "collisionMode");
    __publicField(this, "isKinematic");
    __publicField(this, "enabled");
    var _a, _b;
    if (options.mass instanceof DynamicProperty) {
      this.massProp = options.mass;
    } else {
      this.massProp = new DynamicProperty(options.mass ?? 1);
    }
    this.velocity = {
      x: ((_a = options.velocity) == null ? void 0 : _a.x) ?? 0,
      y: ((_b = options.velocity) == null ? void 0 : _b.y) ?? 0
    };
    this.hasVerticalVelocity = options.hasVerticalVelocity !== void 0 ? options.hasVerticalVelocity : true;
    this.verticalVelocity = options.verticalVelocity ?? 0;
    this.collisionMode = options.collisionMode ?? "dynamic";
    this.isKinematic = options.isKinematic ?? false;
    this.enabled = options.enabled !== void 0 ? options.enabled : true;
  }
  get mass() {
    return this.massProp.literalValue;
  }
  set mass(val) {
    this.massProp.literalValue = val;
    this.massProp.notify();
  }
}
class SurfaceSupportModule {
  /**
   * Determines the supporting surface elevation (floor z=0 or wall top z=wallHeight)
   * and current standing wall for an entity.
   */
  static evaluateSupportingSurface(entity, arena2) {
    var _a, _b, _c;
    if (!entity.hasCollider || !entity.hasVerticalPosition || !arena2.walls || arena2.walls.length === 0) {
      return { surfaceHeight: 0, standingWall: null };
    }
    const isAtWallLayer = entity.position.z >= arena2.wallHeight - 0.05 || (entity.supportingSurfaceHeight ?? 0) >= arena2.wallHeight - 0.05 && entity.position.z >= arena2.wallHeight - 0.2 || entity.standingWall !== null;
    if (!isAtWallLayer) {
      return { surfaceHeight: 0, standingWall: null };
    }
    const char = entity.isCharacter ? entity : null;
    const isDismountFalling = Boolean(
      ((_a = char == null ? void 0 : char.climbingModule) == null ? void 0 : _a.isDismountFreefall) || ((_b = char == null ? void 0 : char.climbingModule) == null ? void 0 : _b.climbSuppressedUntilRePress)
    );
    if (isDismountFalling) {
      return { surfaceHeight: 0, standingWall: null };
    }
    if (!entity.isCharacter) {
      const supportingWall = arena2.getSupportingWall(entity.position.x, entity.position.y, entity.colliderRadius);
      if (supportingWall) {
        return { surfaceHeight: supportingWall.wallHeight, standingWall: supportingWall };
      }
      return { surfaceHeight: 0, standingWall: null };
    }
    if (entity.standingWall) {
      const wallStillExists = arena2.walls.find((w) => w.id === entity.standingWall.id);
      const supportRadius = entity.colliderRadius;
      const touchesCurrent = wallStillExists ? arena2.testWallOverlap(entity.position.x, entity.position.y, supportRadius, wallStillExists) : false;
      if (touchesCurrent && wallStillExists) {
        return { surfaceHeight: wallStillExists.wallHeight, standingWall: wallStillExists };
      }
      if (wallStillExists && ((_c = char == null ? void 0 : char.climbingModule) == null ? void 0 : _c.dismountSuppressedUntilRelease)) {
        return { surfaceHeight: wallStillExists.wallHeight, standingWall: wallStillExists };
      }
      let nextSupport = null;
      if (wallStillExists) {
        for (const wall of arena2.walls) {
          if (arena2.areWallsContiguous(wallStillExists, wall) && arena2.testWallOverlap(entity.position.x, entity.position.y, supportRadius, wall)) {
            nextSupport = wall;
            break;
          }
        }
      } else {
        nextSupport = arena2.getSupportingWall(entity.position.x, entity.position.y, supportRadius);
      }
      if (nextSupport) {
        return { surfaceHeight: nextSupport.wallHeight, standingWall: nextSupport };
      }
      if (char == null ? void 0 : char.climbingModule) {
        char.climbingModule.isDismountFreefall = true;
      }
      return { surfaceHeight: 0, standingWall: null };
    }
    if (!entity.isClimbing && entity.verticalVelocity <= 0.5 && (entity.position.z >= arena2.wallHeight - 0.05 || (entity.supportingSurfaceHeight ?? 0) >= arena2.wallHeight - 0.05)) {
      const wall = arena2.getSupportingWall(entity.position.x, entity.position.y, entity.colliderRadius);
      if (wall) {
        return { surfaceHeight: wall.wallHeight, standingWall: wall };
      }
    }
    return { surfaceHeight: 0, standingWall: null };
  }
}
class MotionIntegrator {
  /**
   * Integrates vertical velocity and position under gravity, resolving surface contact and bounces.
   */
  static integrateVerticalMotion(entity, surfaceHeight, dt, arena2) {
    if (entity.hasGravity && entity.hasVerticalVelocity) {
      if (entity.position.z > surfaceHeight || entity.verticalVelocity !== 0) {
        entity.verticalVelocity -= arena2.gravity * dt;
        entity.position.z += entity.verticalVelocity * dt;
        if (entity.position.z <= surfaceHeight) {
          entity.position.z = surfaceHeight;
          if (entity.rollModule) {
            entity.rollModule.lastContactRadius = 0;
          }
          if (entity.isInFlight) {
            entity.isInFlight = false;
          }
          const bounceThreshold = Math.max(0.25, 1.25 * arena2.gravity * dt);
          if (!entity.isCharacter && entity.hasVerticalBounce && entity.bounceMod !== null && entity.bounceMod > 0 && Math.abs(entity.verticalVelocity) > bounceThreshold) {
            const impactVz = Math.abs(entity.verticalVelocity);
            entity.verticalVelocity = -entity.verticalVelocity * entity.bounceMod;
            if (entity.hasFriction && entity.rollModule && entity.rollModule.enabled) {
              const roll = entity.rollModule;
              const R = entity.colliderRadius > 0 ? entity.colliderRadius : 0.3;
              const beta = 0.4;
              const e = entity.bounceMod;
              const normalImpulse = (1 + e) * entity.mass * impactVz;
              const muBounce = arena2.frictionCoeff * entity.dynamicGroundFrictionMod * 0.05;
              const vSlipX = entity.velocity.x - roll.angularVelocity.y * R;
              const vSlipY = entity.velocity.y + roll.angularVelocity.x * R;
              const slipSpeed = Math.hypot(vSlipX, vSlipY);
              if (slipSpeed > 1e-3 && muBounce > 0) {
                const maxFricImpulse = muBounce * normalImpulse;
                const stickImpulse = slipSpeed * entity.mass / (1 + 1 / beta);
                const actualImpulse = Math.min(stickImpulse, maxFricImpulse);
                const impX = vSlipX / slipSpeed * actualImpulse;
                const impY = vSlipY / slipSpeed * actualImpulse;
                entity.velocity.x -= impX / entity.mass;
                entity.velocity.y -= impY / entity.mass;
                roll.angularVelocity.y += impX / (beta * entity.mass * R);
                roll.angularVelocity.x -= impY / (beta * entity.mass * R);
              }
              const spinDamp = Math.max(0.65, 1 - (1 - e) * 0.35);
              roll.angularVelocity.x *= spinDamp;
              roll.angularVelocity.y *= spinDamp;
              roll.angularVelocity.z *= spinDamp;
            }
          } else {
            entity.verticalVelocity = 0;
          }
        }
      }
    } else {
      if (entity.hasVerticalVelocity && entity.verticalVelocity !== 0) {
        entity.position.z += entity.verticalVelocity * dt;
        if (entity.position.z <= surfaceHeight) {
          entity.position.z = surfaceHeight;
          if (entity.isInFlight) {
            entity.isInFlight = false;
          }
          const bounceThreshold = Math.max(0.25, 1.25 * arena2.gravity * dt);
          if (entity.hasVerticalBounce && entity.bounceMod !== null && entity.bounceMod > 0 && Math.abs(entity.verticalVelocity) > bounceThreshold) {
            entity.verticalVelocity = -entity.verticalVelocity * entity.bounceMod;
          } else {
            entity.verticalVelocity = 0;
          }
        }
      }
    }
  }
  /**
   * Applies ground friction, roll resistance, and rolling angular coupling to an entity resting on a surface.
   */
  static integrateGroundFrictionAndRoll(entity, surfaceHeight, dt, arena2) {
    var _a;
    const restVzThreshold = Math.max(0.05, 1.1 * arena2.gravity * dt);
    const isResting = Math.abs(entity.position.z - surfaceHeight) <= 0.02 && Math.abs(entity.verticalVelocity) <= restVzThreshold;
    if (isResting && entity.hasFriction) {
      const isActivelyWalking = entity.isCharacter && ((_a = entity.walkingModule) == null ? void 0 : _a.enabled) && entity.isActivelyWalking;
      if (!isActivelyWalking) {
        if (entity.rollModule && entity.rollModule.enabled) {
          const roll = entity.rollModule;
          const R = entity.colliderRadius > 0 ? entity.colliderRadius : 0.3;
          const muG = arena2.frictionCoeff * entity.dynamicGroundFrictionMod;
          const beta = 0.4;
          const vSlipX = entity.velocity.x - roll.angularVelocity.y * R;
          const vSlipY = entity.velocity.y + roll.angularVelocity.x * R;
          const slipSpeed = Math.hypot(vSlipX, vSlipY);
          if (muG > 0 && slipSpeed > 1e-3) {
            const maxSlipDelta = muG * (1 + 1 / beta) * dt;
            if (slipSpeed <= maxSlipDelta) {
              const totalMomX = entity.velocity.x + beta * roll.angularVelocity.y * R;
              const totalMomY = entity.velocity.y - beta * roll.angularVelocity.x * R;
              const rollVx = totalMomX / (1 + beta);
              const rollVy = totalMomY / (1 + beta);
              entity.velocity.x = rollVx;
              entity.velocity.y = rollVy;
              roll.angularVelocity.y = rollVx / R;
              roll.angularVelocity.x = -rollVy / R;
            } else {
              const fx = vSlipX / slipSpeed * muG * dt;
              const fy = vSlipY / slipSpeed * muG * dt;
              entity.velocity.x -= fx;
              entity.velocity.y -= fy;
              roll.angularVelocity.y += fx / (beta * R);
              roll.angularVelocity.x -= fy / (beta * R);
            }
          }
          const speed = Math.hypot(entity.velocity.x, entity.velocity.y);
          const rollResistance = roll.rollResistanceProp.get(entity.properties);
          if (speed > 0) {
            if (rollResistance > 0) {
              const decel = rollResistance * dt;
              const newSpeed = Math.max(0, speed - decel);
              if (newSpeed < 5e-3) {
                entity.velocity.x = 0;
                entity.velocity.y = 0;
                roll.angularVelocity.x = 0;
                roll.angularVelocity.y = 0;
              } else {
                const ratio = newSpeed / speed;
                entity.velocity.x *= ratio;
                entity.velocity.y *= ratio;
                roll.angularVelocity.x *= ratio;
                roll.angularVelocity.y *= ratio;
              }
            }
          } else {
            const spinSpeed = Math.hypot(roll.angularVelocity.x, roll.angularVelocity.y);
            if (spinSpeed > 0 && muG > 0) {
              const spinDecel = muG / (beta * R) * dt;
              const newSpin = Math.max(0, spinSpeed - spinDecel);
              const ratio = spinSpeed > 0 ? newSpin / spinSpeed : 0;
              roll.angularVelocity.x *= ratio;
              roll.angularVelocity.y *= ratio;
            }
          }
          if (Math.abs(roll.angularVelocity.z) > 1e-3) {
            if (rollResistance > 0) {
              const zDecel = rollResistance / (beta * R) * dt;
              const signZ = Math.sign(roll.angularVelocity.z);
              const magZ = Math.abs(roll.angularVelocity.z);
              roll.angularVelocity.z = magZ <= zDecel ? 0 : signZ * (magZ - zDecel);
            }
          }
          if (roll.bumpyRollEnabled && dt > 0) {
            const currentR = roll.getContactRadius(R, entity.properties);
            if (roll.lastContactRadius <= 0) {
              roll.lastContactRadius = currentR;
            }
            const deltaR = currentR - roll.lastContactRadius;
            roll.lastContactRadius = currentR;
            const vzBump = deltaR / dt;
            const currentSpeed = Math.hypot(entity.velocity.x, entity.velocity.y);
            if (vzBump > 0.08 && currentSpeed > 0.1) {
              const mass = entity.mass > 0 ? entity.mass : 1;
              const curKinetic = 0.5 * mass * (currentSpeed * currentSpeed);
              const vzLift = Math.min(vzBump, currentSpeed);
              const liftEnergy = 0.5 * mass * (vzLift * vzLift);
              entity.verticalVelocity = Math.max(entity.verticalVelocity, vzLift);
              const newKinetic = Math.max(0, curKinetic - liftEnergy);
              const speedRatio = curKinetic > 1e-4 ? Math.sqrt(newKinetic / curKinetic) : 0;
              entity.velocity.x *= speedRatio;
              entity.velocity.y *= speedRatio;
              roll.angularVelocity.x *= speedRatio;
              roll.angularVelocity.y *= speedRatio;
            }
          }
          roll.updateVisualPhase(dt);
        } else {
          const speed = Math.hypot(entity.velocity.x, entity.velocity.y);
          if (speed > 0) {
            const staticThreshold = arena2.staticFrictionThreshold * entity.staticGroundFrictionMod;
            if (speed < staticThreshold) {
              entity.velocity.x = 0;
              entity.velocity.y = 0;
            } else {
              const frictionForce = arena2.frictionCoeff * entity.dynamicGroundFrictionMod * dt;
              const newSpeed = Math.max(0, speed - frictionForce);
              const ratio = newSpeed / speed;
              entity.velocity.x *= ratio;
              entity.velocity.y *= ratio;
            }
          }
        }
      }
    } else {
      if (entity.rollModule && entity.rollModule.enabled) {
        entity.rollModule.updateVisualPhase(dt);
      }
    }
  }
}
const _GameObject = class _GameObject {
  constructor(options = {}) {
    __publicField(this, "id");
    __publicField(this, "name");
    __publicField(this, "position");
    __publicField(this, "color");
    __publicField(this, "isHeld");
    __publicField(this, "_heldBy", null);
    __publicField(this, "lastHolder", null);
    __publicField(this, "lastDroppedTime", 0);
    __publicField(this, "lastThrower", null);
    __publicField(this, "originalThrower", null);
    __publicField(this, "isInFlight", false);
    __publicField(this, "isCharacter", false);
    __publicField(this, "isClimbing", false);
    __publicField(this, "visualShape", "circle");
    __publicField(this, "lastCollisionType", "none");
    __publicField(this, "lastContactPoint", null);
    __publicField(this, "lastContactNormal", null);
    __publicField(this, "isSweptActive", false);
    __publicField(this, "lastCollisionTime", 0);
    // Phase 3: Sleeping Freebody & Island Optimization
    __publicField(this, "isSleeping", false);
    __publicField(this, "sleepTimer", 0);
    // Number of consecutive ticks with near-zero kinetic energy
    // Phase 8: Client Prediction Reconciliation & Visual Smoothing Dampener
    __publicField(this, "visualOffset", { x: 0, y: 0 });
    // Phase 9 & 10: Remote Entity Proxy & Immovable Solver Flag
    // When true (e.g. for remote characters on client simulation), the entity acts as a kinematic/immovable obstacle,
    // preventing the local client from authoring its coordinates and eliminating 60Hz bounce-back tethering.
    __publicField(this, "isImmovable", false);
    __publicField(this, "serverCharId");
    /** Timestamp until which the entity is considered under involuntary knockback / flung momentum */
    __publicField(this, "knockbackUntilTime", 0);
    // Phase 11: Dynamic Properties Registry (Blender Socket Architecture)
    __publicField(this, "properties", new ObjectPropertiesRegistry());
    __publicField(this, "_staticVelocity", { x: 0, y: 0 });
    // Modular behavior components
    __publicField(this, "rigidbodyModule", null);
    __publicField(this, "colliderModule", null);
    __publicField(this, "frictionModule", null);
    __publicField(this, "bounceModule", null);
    __publicField(this, "verticalPositionModule", null);
    __publicField(this, "gravityModule", null);
    __publicField(this, "rollModule", null);
    __publicField(this, "healthModule", null);
    __publicField(this, "damageAuraModule", null);
    __publicField(this, "damageSolverModule", null);
    __publicField(this, "characterModule", null);
    __publicField(this, "foodModule", null);
    __publicField(this, "consumableModule", null);
    __publicField(this, "spawnerModule", null);
    /** Reference to the Scene Prefab archetype this object was instantiated from (if any) */
    __publicField(this, "prefabId", null);
    /** Set of property keys that have been explicitly edited on this live instance, overriding the prefab */
    __publicField(this, "overriddenProperties", /* @__PURE__ */ new Set());
    /** Elevation of the physical supporting surface directly beneath (ground or wall top) */
    __publicField(this, "supportingSurfaceHeight", 0);
    /** The specific wall the entity is currently standing on (if supported on layer 2) */
    __publicField(this, "standingWall", null);
    var _a, _b, _c;
    this.id = options.id ?? `obj-${Math.random().toString(36).substring(2, 9)}`;
    this.name = options.name ?? "Entity";
    if (options.prefabId !== void 0) {
      this.prefabId = options.prefabId;
    }
    this.position = {
      x: ((_a = options.position) == null ? void 0 : _a.x) ?? 0,
      y: ((_b = options.position) == null ? void 0 : _b.y) ?? 0,
      z: ((_c = options.position) == null ? void 0 : _c.z) ?? 0
    };
    this.color = options.color ?? "#94a3b8";
    this.isHeld = false;
    this.heldBy = null;
    this.visualShape = options.visualShape ?? "circle";
    this.rigidbodyModule = options.rigidbodyModule !== void 0 ? options.rigidbodyModule : options.hasRigidbody === false ? null : new RigidbodyModule({
      mass: options.mass ?? 1,
      velocity: options.velocity ? { x: options.velocity.x ?? 0, y: options.velocity.y ?? 0 } : void 0,
      hasVerticalVelocity: options.hasVerticalVelocity !== false,
      verticalVelocity: options.verticalVelocity ?? 0,
      collisionMode: options.collisionMode ?? "dynamic"
    });
    this.colliderModule = options.colliderModule !== void 0 ? options.colliderModule : options.colliderRadius !== void 0 ? new ColliderModule({ radius: options.colliderRadius }) : new ColliderModule({ radius: 0.35 });
    this.frictionModule = options.frictionModule !== void 0 ? options.frictionModule : new FrictionModule({
      staticFrictionMod: options.staticGroundFrictionMod ?? 1,
      dynamicFrictionMod: options.dynamicGroundFrictionMod ?? 1
    });
    this.bounceModule = options.bounceModule !== void 0 ? options.bounceModule : options.bounceMod !== void 0 && options.bounceMod !== null ? new BounceModule({ bounceMod: options.bounceMod }) : new BounceModule({ bounceMod: 0.4 });
    this.verticalPositionModule = options.verticalPositionModule !== void 0 ? options.verticalPositionModule : options.hasVerticalPosition === false ? null : new VerticalPositionModule({
      z: this.position.z,
      hasVerticalVelocity: options.hasVerticalVelocity !== false,
      verticalVelocity: options.verticalVelocity ?? 0
    });
    if (!this.hasVerticalPosition) {
      this.position.z = 0;
    }
    this.gravityModule = options.gravityModule !== void 0 ? options.gravityModule : options.hasGravity === false ? null : new GravityModule();
    this.rollModule = options.rollModule ?? null;
    this.healthModule = options.healthModule ?? null;
    this.damageAuraModule = options.damageAuraModule ?? null;
    this.damageSolverModule = options.damageSolverModule ?? null;
    this.characterModule = options.characterModule ?? null;
    this.consumableModule = options.consumableModule ?? options.foodModule ?? null;
    this.foodModule = this.consumableModule;
    this.spawnerModule = options.spawnerModule ?? null;
    if (this.spawnerModule && (this.spawnerModule.spawnPosition.x === 0 && this.spawnerModule.spawnPosition.y === 0 && this.spawnerModule.spawnPosition.z === 0)) {
      this.spawnerModule.spawnPosition = { ...this.position };
    }
    if (this.consumableModule) {
      this.consumableModule.initialColliderRadius = options.colliderRadius ?? (this.colliderModule ? this.colliderModule.radius : 0.26);
    }
  }
  get heldBy() {
    return this._heldBy;
  }
  set heldBy(val) {
    if (val) {
      this.lastHolder = val;
    } else if (this._heldBy) {
      this.lastHolder = this._heldBy;
      this.lastDroppedTime = performance.now();
    }
    this._heldBy = val;
  }
  /**
   * Applies an involuntary knockback momentum window to this entity (in milliseconds).
   * While under knockback, characters are eligible for high-impact wall-collision shock.
   */
  applyKnockbackWindow(durationMs = 600) {
    const until = performance.now() + durationMs;
    if (until > this.knockbackUntilTime) {
      this.knockbackUntilTime = until;
    }
  }
  /**
   * Returns true if the entity is currently within an involuntary knockback momentum window.
   */
  get isUnderKnockback() {
    return performance.now() <= this.knockbackUntilTime;
  }
  /**
   * Decays the visual smoothing offset smoothly toward zero (default: 0.70x / frame).
   * Eliminates visual popping when physical prediction reconciles.
   */
  decayVisualOffset(factor = 0.7) {
    if (this.visualOffset.x === 0 && this.visualOffset.y === 0) return;
    this.visualOffset.x *= factor;
    this.visualOffset.y *= factor;
    if (Math.abs(this.visualOffset.x) < 1e-3) this.visualOffset.x = 0;
    if (Math.abs(this.visualOffset.y) < 1e-3) this.visualOffset.y = 0;
  }
  /**
   * Immediately wakes up a sleeping body.
   */
  wakeUp() {
    if (this.isSleeping) {
      this.isSleeping = false;
      this.sleepTimer = 0;
    }
  }
  /**
   * Puts body to sleep, freezing velocities to absolute zero.
   */
  putToSleep() {
    if (this.isCharacter || this.isHeld || this.heldBy !== null) return;
    this.isSleeping = true;
    this.isInFlight = false;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.verticalVelocity = 0;
    if (this.rollModule) {
      this.rollModule.angularVelocity.x = 0;
      this.rollModule.angularVelocity.y = 0;
      this.rollModule.angularVelocity.z = 0;
    }
  }
  /**
   * Dispatches a physical impact shock event to attached modules (such as DamageSolverModule).
   */
  dispatchImpact(event, worldCollisionDamageScale = _GameObject.globalWorldCollisionDamageScale) {
    if (this.damageSolverModule && this.damageSolverModule.enabled && this.healthModule) {
      return this.damageSolverModule.handleImpact(event, this, this.healthModule, worldCollisionDamageScale);
    }
    return 0;
  }
  /**
   * Returns whether this object has a primary item ability when held by a creature.
   * Any consumable object has a primary item ability.
   */
  hasPrimaryItemAbility() {
    if (this.consumableModule && this.consumableModule.enabled && !this.consumableModule.isConsumed) {
      return true;
    }
    return false;
  }
  /**
   * Returns the primary item ability type of this object.
   * For any consumable object, its primary item ability is 'consume'.
   */
  getPrimaryItemAbilityType() {
    if (this.consumableModule && this.consumableModule.enabled && !this.consumableModule.isConsumed) {
      return "consume";
    }
    return null;
  }
  /**
   * Actuates the primary item ability of this held object when used by a holder.
   * For a consumable object, its primary ability is to be consumed by the holder.
   */
  usePrimaryItemAbility(dt, holder, objects2, arena2) {
    if (this.consumableModule && this.consumableModule.enabled && !this.consumableModule.isConsumed) {
      if (holder.consumeModule && holder.consumeModule.canConsume(this)) {
        const result = holder.consumeModule.consume(dt, holder, this, objects2, arena2);
        return {
          success: true,
          abilityType: "consume",
          isDepleted: result.isDepleted,
          watts: result.watts,
          joules: result.joules
        };
      }
    }
    return { success: false, abilityType: "none" };
  }
  // --- Convenience Getters & Setters ---
  get hasRigidbody() {
    return Boolean(this.rigidbodyModule && this.rigidbodyModule.enabled);
  }
  get velocity() {
    if (this.hasRigidbody && this.rigidbodyModule) {
      return this.rigidbodyModule.velocity;
    }
    return this._staticVelocity;
  }
  set velocity(val) {
    if (this.rigidbodyModule) {
      this.rigidbodyModule.velocity = { x: val.x, y: val.y };
    } else {
      this._staticVelocity = { x: val.x, y: val.y };
    }
  }
  get collisionMode() {
    return this.hasRigidbody && this.rigidbodyModule ? this.rigidbodyModule.collisionMode : "discrete";
  }
  set collisionMode(val) {
    if (this.rigidbodyModule) {
      this.rigidbodyModule.collisionMode = val;
    }
  }
  get hasCollider() {
    return Boolean(this.colliderModule && this.colliderModule.enabled);
  }
  /**
   * Evaluates whether this body acts as 'discrete' or 'continuous' on the current tick.
   * If collisionMode is 'dynamic', tests if movement distance (v * dt) exceeds ccdThresholdRatio * radius.
   */
  getEffectiveCollisionMode(dt = 1 / 60) {
    var _a;
    if (this.collisionMode === "continuous") return "continuous";
    if (this.collisionMode === "discrete") return "discrete";
    if (!this.hasCollider || !((_a = this.colliderModule) == null ? void 0 : _a.canSweep)) return "discrete";
    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    const r = Math.max(0.01, this.colliderRadius);
    const displacement = speed * dt;
    const threshold = this.colliderModule.ccdThresholdRatioProp.get(this.properties) ?? 0.5;
    return displacement / r >= threshold ? "continuous" : "discrete";
  }
  get colliderRadius() {
    return this.colliderModule && this.colliderModule.enabled ? this.colliderModule.radiusProp.get(this.properties) : 0;
  }
  set colliderRadius(val) {
    if (this.colliderModule) {
      this.colliderModule.radiusProp.set(val, this.properties);
    } else {
      this.colliderModule = new ColliderModule({ radius: val });
    }
  }
  get hasMass() {
    return Boolean(
      this.hasRigidbody && this.rigidbodyModule.enabled && this.rigidbodyModule.massProp.get(this.properties) > 0
    );
  }
  get mass() {
    return this.hasRigidbody && this.rigidbodyModule.enabled ? this.rigidbodyModule.massProp.get(this.properties) : 0;
  }
  set mass(val) {
    if (this.rigidbodyModule) {
      this.rigidbodyModule.massProp.set(val, this.properties);
    } else {
      this.rigidbodyModule = new RigidbodyModule({ mass: val });
    }
  }
  /**
   * Friction requires both MassModule and FrictionModule. Without mass, normal force is 0.
   */
  get hasFriction() {
    return Boolean(this.hasMass && this.frictionModule && this.frictionModule.enabled);
  }
  get staticGroundFrictionMod() {
    return this.hasFriction && this.frictionModule ? this.frictionModule.staticFrictionProp.get(this.properties) : 0;
  }
  set staticGroundFrictionMod(val) {
    if (this.frictionModule) {
      this.frictionModule.staticFrictionProp.set(val, this.properties);
    } else {
      this.frictionModule = new FrictionModule({ staticFrictionMod: val });
    }
  }
  get dynamicGroundFrictionMod() {
    return this.hasFriction && this.frictionModule ? this.frictionModule.dynamicFrictionProp.get(this.properties) : 0;
  }
  set dynamicGroundFrictionMod(val) {
    if (this.frictionModule) {
      this.frictionModule.dynamicFrictionProp.set(val, this.properties);
    } else {
      this.frictionModule = new FrictionModule({ dynamicFrictionMod: val });
    }
  }
  /**
   * Bounciness requires both MassModule and BounceModule. Without mass, restitution is ignored.
   */
  get hasBounce() {
    return Boolean(this.hasMass && this.bounceModule && this.bounceModule.enabled);
  }
  get bounceMod() {
    return this.hasBounce && this.bounceModule ? this.bounceModule.bounceModProp.get(this.properties) : null;
  }
  set bounceMod(val) {
    if (val === null || val <= 0.01) {
      this.bounceModule = null;
    } else if (this.bounceModule) {
      this.bounceModule.bounceModProp.set(val, this.properties);
    } else {
      this.bounceModule = new BounceModule({ bounceMod: val });
    }
  }
  get hasVerticalPosition() {
    return Boolean(this.verticalPositionModule && this.verticalPositionModule.enabled);
  }
  /**
   * Vertical velocity is physically dynamic, so it lives on RigidbodyModule,
   * but strictly requires VerticalPositionModule (spatial altitude z-axis).
   * Without VerticalPositionModule, vertical velocity cannot exist.
   */
  get hasVerticalVelocity() {
    var _a;
    return Boolean(
      this.hasRigidbody && ((_a = this.rigidbodyModule) == null ? void 0 : _a.hasVerticalVelocity) && this.hasVerticalPosition
    );
  }
  get verticalVelocity() {
    if (this.hasVerticalVelocity && this.rigidbodyModule) {
      return this.rigidbodyModule.verticalVelocity;
    }
    return 0;
  }
  set verticalVelocity(val) {
    if (this.rigidbodyModule) {
      this.rigidbodyModule.verticalVelocity = val;
    }
    if (this.verticalPositionModule) {
      this.verticalPositionModule.verticalVelocity = val;
    }
  }
  /**
   * Vertical bounce requires MassModule, BounceModule (with verticalBounce=true), and Vertical Velocity.
   */
  get hasVerticalBounce() {
    var _a;
    return Boolean(
      this.hasBounce && ((_a = this.bounceModule) == null ? void 0 : _a.verticalBounce) && this.hasVerticalVelocity
    );
  }
  get hasGravity() {
    return Boolean(this.gravityModule && this.gravityModule.enabled);
  }
  /** True if entity is actively resting on a supporting surface (ground or wall top) */
  get isRestingOnSurface() {
    return Math.abs(this.position.z - this.supportingSurfaceHeight) <= 0.02 && Math.abs(this.verticalVelocity) <= 0.1;
  }
  /** Readonly getter: true if elevated above ground level (z > 0) */
  get isAboveGround() {
    return this.hasVerticalPosition && this.position.z > 1e-3;
  }
  /** Readonly getter: true if elevated at or above standard arena wall height (1.0 unit) or resting on a wall */
  get isAboveWalls() {
    return this.hasVerticalPosition && (this.position.z >= 0.85 || this.supportingSurfaceHeight >= 0.85 || this.standingWall !== null);
  }
  /**
   * Virtual Infinite Layer System:
   * Objects only collide if they are on the exact same layer.
   * Virtually infinite layers where layer = Math.floor(objectHeight / wallHeight) + 1.
   * - Layer 1 (0 <= z < wallHeight): Ground layer (only layer with walls).
   * - Layer 2 (wallHeight <= z < 2 * wallHeight): Wall elevation / first elevated layer.
   * - Layer 3, 4, ...: Infinite higher altitude layers.
   */
  static getEntityLayer(entity, wallHeight = 1) {
    const effectiveH = Math.max(
      0,
      entity.position.z,
      entity.supportingSurfaceHeight ?? 0,
      entity.standingWall ? wallHeight : 0
    );
    const safeWallH = Math.max(0.01, wallHeight);
    return Math.floor(effectiveH / safeWallH) + 1;
  }
  /** Update physics, gravity, friction, and ground/wall collision */
  updatePosition(dt, arena2) {
    var _a, _b, _c, _d, _e, _f;
    if (this.isHeld) {
      return;
    }
    if (!this.hasRigidbody) {
      return;
    }
    if (this.isSleeping) {
      if (Math.abs(this.velocity.x) > 1e-3 || Math.abs(this.velocity.y) > 1e-3 || Math.abs(this.verticalVelocity) > 1e-3) {
        this.wakeUp();
      } else {
        return;
      }
    }
    this.isSweptActive = this.getEffectiveCollisionMode(dt) === "continuous";
    if (this.lastThrower) {
      const reach = ((_a = this.lastThrower.pickupModule) == null ? void 0 : _a.pickupReach) ?? 1.3;
      const throwerZ = Math.max(
        this.lastThrower.position.z,
        this.lastThrower.supportingSurfaceHeight ?? 0,
        this.lastThrower.standingWall ? arena2.wallHeight : 0
      );
      const myZ = Math.max(
        this.position.z,
        this.supportingSurfaceHeight ?? 0,
        this.standingWall ? arena2.wallHeight : 0
      );
      const dist3D = Math.hypot(
        this.position.x - this.lastThrower.position.x,
        this.position.y - this.lastThrower.position.y,
        myZ - throwerZ
      );
      if (dist3D > reach || this.isRestingOnSurface) {
        this.lastThrower = null;
      }
    }
    if (this.isInFlight && (this.isRestingOnSurface || this.isHeld)) {
      this.isInFlight = false;
      this.originalThrower = null;
    }
    if (!this.hasVerticalPosition) {
      this.position.z = 0;
      this.verticalVelocity = 0;
      this.supportingSurfaceHeight = 0;
    }
    const { surfaceHeight, standingWall } = SurfaceSupportModule.evaluateSupportingSurface(this, arena2);
    let effectiveSurfaceHeight = surfaceHeight;
    this.standingWall = standingWall;
    if (this.isClimbing) {
      effectiveSurfaceHeight = Math.max(effectiveSurfaceHeight, this.position.z);
      this.verticalVelocity = 0;
    }
    this.supportingSurfaceHeight = effectiveSurfaceHeight;
    MotionIntegrator.integrateVerticalMotion(this, effectiveSurfaceHeight, dt, arena2);
    MotionIntegrator.integrateGroundFrictionAndRoll(this, effectiveSurfaceHeight, dt, arena2);
    const char = this.isCharacter ? this : null;
    const edgeMod = (char == null ? void 0 : char.wallEdgeAssistModule) ?? (char == null ? void 0 : char.climbingModule);
    const isStandingOnWallTop = Boolean(
      char && !this.isClimbing && this.standingWall !== null && Math.abs(this.position.z - this.standingWall.wallHeight) <= 0.01 && Math.abs(this.supportingSurfaceHeight - this.standingWall.wallHeight) <= 0.01 && this.isRestingOnSurface
    );
    const hangDistance = Math.max(0.01, (edgeMod == null ? void 0 : edgeMod.hangDistance) ?? 0.1);
    if (edgeMod) {
      if (!isStandingOnWallTop) {
        edgeMod.isAssistClampArmed = false;
        edgeMod.hasLeftClampZoneSinceDismount = true;
      } else if (this.standingWall) {
        const standing = this.standingWall;
        const platformWalls = [standing];
        for (const w of arena2.walls) {
          if (w.id !== standing.id && arena2.areWallsContiguous(standing, w)) {
            platformWalls.push(w);
          }
        }
        let distToPlatform = Infinity;
        for (const w of platformWalls) {
          const cx = Math.max(w.x, Math.min(this.position.x, w.x + w.width));
          const cy = Math.max(w.y, Math.min(this.position.y, w.y + w.height));
          const d = Math.hypot(this.position.x - cx, this.position.y - cy);
          if (d < distToPlatform) distToPlatform = d;
        }
        const isInsideClampZone = distToPlatform <= hangDistance + 1e-3;
        if (isInsideClampZone) {
          if (edgeMod.hasLeftClampZoneSinceDismount) {
            edgeMod.isAssistClampArmed = true;
          }
        } else {
          edgeMod.hasLeftClampZoneSinceDismount = true;
          edgeMod.isAssistClampArmed = false;
        }
        if (!edgeMod.hasMovedOntoWall) {
          const distMoved = Math.hypot(this.position.x - edgeMod.mountStartX, this.position.y - edgeMod.mountStartY);
          let centerInsideWall = false;
          for (const w of platformWalls) {
            if (this.position.x >= w.x && this.position.x <= w.x + w.width && this.position.y >= w.y && this.position.y <= w.y + w.height) {
              centerInsideWall = true;
              break;
            }
          }
          if (distMoved >= 0.2 || centerInsideWall) {
            edgeMod.hasMovedOntoWall = true;
          }
        }
      }
    }
    const isPreventWalkOffActive = Boolean(
      isStandingOnWallTop && (edgeMod == null ? void 0 : edgeMod.enabled) && (edgeMod == null ? void 0 : edgeMod.preventWalkOff) && (edgeMod == null ? void 0 : edgeMod.isAssistClampArmed)
    );
    const deltaX = this.velocity.x * dt;
    const deltaY = this.velocity.y * dt;
    const moveDist = Math.hypot(deltaX, deltaY);
    if (moveDist > 1e-4) {
      if (isPreventWalkOffActive) {
        let currentWall = this.standingWall;
        const candidateX = this.position.x + deltaX;
        const candidateY = this.position.y + deltaY;
        const platformWalls = [];
        if (currentWall) {
          platformWalls.push(currentWall);
          for (const w of arena2.walls) {
            if (w.id !== currentWall.id && arena2.areWallsContiguous(currentWall, w)) {
              platformWalls.push(w);
            }
          }
        }
        let supportedWall = null;
        for (const w of platformWalls) {
          if (arena2.testWallOverlap(candidateX, candidateY, hangDistance, w)) {
            supportedWall = w;
            break;
          }
        }
        if (supportedWall) {
          this.position.x = candidateX;
          this.position.y = candidateY;
          this.standingWall = supportedWall;
        } else if (platformWalls.length > 0) {
          let bestDistSq = Infinity;
          let closest = null;
          for (const wall of platformWalls) {
            const cx = Math.max(wall.x, Math.min(candidateX, wall.x + wall.width));
            const cy = Math.max(wall.y, Math.min(candidateY, wall.y + wall.height));
            const dx = candidateX - cx;
            const dy = candidateY - cy;
            const distSq = dx * dx + dy * dy;
            if (distSq < bestDistSq) {
              bestDistSq = distSq;
              closest = { wall, closestX: cx, closestY: cy, dist: Math.sqrt(distSq), dx, dy };
            }
          }
          if (closest && closest.dist > 0) {
            const normalX = closest.dx / closest.dist;
            const normalY = closest.dy / closest.dist;
            const outwardVel = this.velocity.x * normalX + this.velocity.y * normalY;
            const moveInput = (char == null ? void 0 : char.movementInput) ?? { x: 0, y: 0 };
            const outwardInput = moveInput.x * normalX + moveInput.y * normalY;
            const isPushingAgainstGuardrail = outwardVel > 1e-3 || outwardInput > 0.05;
            const canDismount = !edgeMod || edgeMod.hasMovedOntoWall;
            if (isPushingAgainstGuardrail && (char == null ? void 0 : char.isClimbInputHeld) && canDismount) {
              if (edgeMod) {
                edgeMod.isAssistClampArmed = false;
                edgeMod.hasLeftClampZoneSinceDismount = false;
              }
              this.position.x = candidateX;
              this.position.y = candidateY;
            } else {
              if (outwardVel > 0) {
                this.velocity.x -= outwardVel * normalX;
                this.velocity.y -= outwardVel * normalY;
              }
              const maxAllowedDist = hangDistance - 2e-3;
              if (closest.dist > maxAllowedDist) {
                this.position.x = closest.closestX + normalX * maxAllowedDist;
                this.position.y = closest.closestY + normalY * maxAllowedDist;
              } else {
                this.position.x = candidateX;
                this.position.y = candidateY;
              }
              const newSupport = arena2.testWallOverlap(this.position.x, this.position.y, hangDistance, closest.wall) ? closest.wall : platformWalls.find((w) => arena2.testWallOverlap(this.position.x, this.position.y, hangDistance, w));
              if (newSupport) {
                this.standingWall = newSupport;
              }
            }
          } else {
            this.velocity.x = 0;
            this.velocity.y = 0;
          }
        }
      } else {
        const stepSize = 0.01;
        const numSteps = Math.max(1, Math.ceil(moveDist / stepSize));
        const stepDx = deltaX / numSteps;
        const stepDy = deltaY / numSteps;
        let currentWall = this.standingWall ?? (isStandingOnWallTop ? arena2.getSupportingWall(this.position.x, this.position.y, this.colliderRadius) : null);
        let hasDismountedIntoGap = false;
        const canDismount = !edgeMod || edgeMod.hasMovedOntoWall;
        for (let s = 1; s <= numSteps; s++) {
          let candX = this.position.x + stepDx;
          let candY = this.position.y + stepDy;
          if (currentWall) {
            let nextSupport = null;
            if (arena2.testWallOverlap(candX, candY, this.colliderRadius, currentWall)) {
              nextSupport = currentWall;
            } else {
              for (const w of arena2.walls) {
                if (arena2.areWallsContiguous(currentWall, w) && arena2.testWallOverlap(candX, candY, this.colliderRadius, w)) {
                  nextSupport = w;
                  break;
                }
              }
            }
            if (nextSupport) {
              currentWall = nextSupport;
              this.standingWall = nextSupport;
            } else if (canDismount) {
              hasDismountedIntoGap = true;
              currentWall = null;
              this.standingWall = null;
              this.supportingSurfaceHeight = 0;
              if (char == null ? void 0 : char.climbingModule) {
                char.climbingModule.isDismountFreefall = true;
              }
            } else {
              candX = this.position.x;
              candY = this.position.y;
            }
          }
          this.position.x = candX;
          this.position.y = candY;
          const isFallingInGap = !this.isClimbing && (hasDismountedIntoGap || !this.standingWall && Boolean(((_b = char == null ? void 0 : char.climbingModule) == null ? void 0 : _b.isDismountFreefall) || ((_c = char == null ? void 0 : char.climbingModule) == null ? void 0 : _c.climbSuppressedUntilRePress)));
          if (isFallingInGap && this.hasCollider) {
            for (const wall of arena2.walls) {
              if (this.position.z <= wall.wallHeight) {
                this.resolveWallCollision(wall);
              }
            }
          }
        }
      }
    }
    if (this.hasCollider) {
      const r = this.colliderRadius;
      const minX = r;
      const maxX = arena2.width - r;
      const minY = r;
      const maxY = arena2.height - r;
      const bRestitution = this.isCharacter ? 0 : this.hasBounce && this.bounceMod !== null ? this.bounceMod : 0;
      if (this.position.x < minX) {
        this.position.x = minX;
        this.lastContactPoint = { x: 0, y: this.position.y };
        this.lastContactNormal = { x: 1, y: 0 };
        this.lastCollisionType = this.isSweptActive ? "continuous_swept" : "discrete_toi";
        this.lastCollisionTime = performance.now();
        this.resolveWallImpact(1, 0, bRestitution);
      } else if (this.position.x > maxX) {
        this.position.x = maxX;
        this.lastContactPoint = { x: arena2.width, y: this.position.y };
        this.lastContactNormal = { x: -1, y: 0 };
        this.lastCollisionType = this.isSweptActive ? "continuous_swept" : "discrete_toi";
        this.lastCollisionTime = performance.now();
        this.resolveWallImpact(-1, 0, bRestitution);
      }
      if (this.position.y < minY) {
        this.position.y = minY;
        this.lastContactPoint = { x: this.position.x, y: 0 };
        this.lastContactNormal = { x: 0, y: 1 };
        this.lastCollisionType = this.isSweptActive ? "continuous_swept" : "discrete_toi";
        this.lastCollisionTime = performance.now();
        this.resolveWallImpact(0, 1, bRestitution);
      } else if (this.position.y > maxY) {
        this.position.y = maxY;
        this.lastContactPoint = { x: this.position.x, y: arena2.height };
        this.lastContactNormal = { x: 0, y: -1 };
        this.lastCollisionType = this.isSweptActive ? "continuous_swept" : "discrete_toi";
        this.lastCollisionTime = performance.now();
        this.resolveWallImpact(0, -1, bRestitution);
      }
      const isDismountFallingNow = Boolean(((_d = char == null ? void 0 : char.climbingModule) == null ? void 0 : _d.isDismountFreefall) || ((_e = char == null ? void 0 : char.climbingModule) == null ? void 0 : _e.climbSuppressedUntilRePress));
      for (const wall of arena2.walls) {
        if (this.position.z <= wall.wallHeight) {
          const isAtWallTop = this.position.z >= wall.wallHeight - 0.05 && !isDismountFallingNow;
          if (isAtWallTop && (((_f = this.standingWall) == null ? void 0 : _f.id) === wall.id || arena2.testWallOverlap(this.position.x, this.position.y, this.colliderRadius, wall))) {
            continue;
          }
          if (this.position.z < wall.wallHeight - 0.05 || isDismountFallingNow || this.standingWall === null) {
            if (this.standingWall && (this.standingWall.id === wall.id || arena2.areWallsContiguous(this.standingWall, wall))) {
              continue;
            }
            this.resolveWallCollision(wall);
          }
        }
      }
    }
    const maxLinearSpeed = 100;
    const currentSpeed = Math.hypot(this.velocity.x, this.velocity.y);
    if (currentSpeed > maxLinearSpeed) {
      const scale = maxLinearSpeed / currentSpeed;
      this.velocity.x *= scale;
      this.velocity.y *= scale;
    }
    if (this.rollModule && this.rollModule.enabled) {
      const maxAngSpeed = 35;
      const currentAngSpeed = this.rollModule.angularSpeed;
      if (currentAngSpeed > maxAngSpeed) {
        const scale = maxAngSpeed / currentAngSpeed;
        this.rollModule.angularVelocity.x *= scale;
        this.rollModule.angularVelocity.y *= scale;
        this.rollModule.angularVelocity.z *= scale;
      }
    }
    if (this.verticalPositionModule) {
      this.verticalPositionModule.z = this.position.z;
    }
    if (!this.isCharacter && !this.isHeld && this.heldBy === null) {
      const speed = Math.hypot(this.velocity.x, this.velocity.y);
      const angSpeed = this.rollModule && this.rollModule.enabled ? this.rollModule.angularSpeed : 0;
      const isResting = this.isRestingOnSurface;
      if (isResting && speed < 0.02 && Math.abs(this.verticalVelocity) < 0.01 && angSpeed < 0.05) {
        this.sleepTimer++;
        if (this.sleepTimer >= 15) {
          this.putToSleep();
        }
      } else {
        this.sleepTimer = 0;
      }
    }
  }
  /**
   * Finds the closest point on any wall footprint in the arena to (x, y),
   * along with distance and normal vector components.
   */
  static getClosestWallPoint(x, y, arena2) {
    if (!arena2.walls || arena2.walls.length === 0) return null;
    let bestDistSq = Infinity;
    let bestResult = null;
    for (const wall of arena2.walls) {
      const cx = Math.max(wall.x, Math.min(x, wall.x + wall.width));
      const cy = Math.max(wall.y, Math.min(y, wall.y + wall.height));
      const dx = x - cx;
      const dy = y - cy;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestResult = {
          wall,
          closestX: cx,
          closestY: cy,
          dist: Math.sqrt(distSq),
          dx,
          dy
        };
      }
    }
    return bestResult;
  }
  /**
   * Applies realistic wall/boundary impact dynamics
   */
  resolveWallImpact(normalX, normalY, restitution) {
    var _a, _b;
    this.lastThrower = null;
    const dot = this.velocity.x * normalX + this.velocity.y * normalY;
    if (dot >= 0) return;
    const normalVel = dot;
    const impactSpeed = Math.abs(normalVel);
    if (restitution > 0 && this.hasMass) {
      this.velocity.x -= (1 + restitution) * normalVel * normalX;
      this.velocity.y -= (1 + restitution) * normalVel * normalY;
    } else {
      this.velocity.x -= normalVel * normalX;
      this.velocity.y -= normalVel * normalY;
    }
    const bMod = this.hasBounce && this.bounceMod !== null ? this.bounceMod : this.isCharacter ? 0.2 : 0;
    const absorbedFraction = Math.max(0, 1 - Math.min(1, bMod * bMod));
    const isVoluntary = this.isCharacter && (Boolean(this.isActivelyWalking) || Boolean(this.isSprinting) || Math.hypot(((_a = this.movementInput) == null ? void 0 : _a.x) ?? 0, ((_b = this.movementInput) == null ? void 0 : _b.y) ?? 0) > 0.01);
    const isThreat = !isVoluntary && this.isUnderKnockback || this.isInFlight;
    const kSelf = isThreat ? 1 : this.damageSolverModule ? Math.max(0, Math.min(1, this.damageSolverModule.getSelfImpactWeight(this.properties))) : 0;
    const effectiveSpeed = impactSpeed * kSelf;
    const shockDeceleration = effectiveSpeed * 60 * absorbedFraction;
    if (shockDeceleration > 0.01) {
      this.dispatchImpact({
        absorbedShock: shockDeceleration,
        impactSpeed: effectiveSpeed,
        otherEntity: null,
        normalX,
        normalY
      });
    }
    if (this.hasFriction && this.rollModule && this.rollModule.enabled) {
      const roll = this.rollModule;
      const R = this.colliderRadius > 0 ? this.colliderRadius : 0.3;
      const beta = 0.4;
      const muWall = 0.35;
      const tangentX = -normalY;
      const tangentY = normalX;
      const tangentVel = this.velocity.x * tangentX + this.velocity.y * tangentY;
      const normalImpulse = -(1 + restitution) * this.mass * normalVel;
      const vContactT = tangentVel - roll.angularVelocity.z * R;
      const stickImpulse = Math.abs(vContactT) * this.mass / (1 + 1 / beta);
      const maxFricImpulse = muWall * normalImpulse;
      const fricImpulseMag = Math.min(stickImpulse, maxFricImpulse);
      const fricImpulse = -Math.sign(vContactT) * fricImpulseMag;
      const oldTangentVel = tangentVel;
      const proposedTangentVel = oldTangentVel + fricImpulse / this.mass;
      const actualDeltaVt = Math.abs(proposedTangentVel) <= Math.abs(oldTangentVel) + 0.01 ? proposedTangentVel - oldTangentVel : -oldTangentVel * 0.1;
      this.velocity.x += actualDeltaVt * tangentX;
      this.velocity.y += actualDeltaVt * tangentY;
      const actualFricImpulse = actualDeltaVt * this.mass;
      const deltaWz = -actualFricImpulse / (beta * this.mass * R);
      roll.angularVelocity.z += deltaWz;
      roll.angularVelocity.z = Math.max(-30, Math.min(30, roll.angularVelocity.z));
      roll.angularVelocity.y = this.velocity.x / R;
      roll.angularVelocity.x = -this.velocity.y / R;
    }
  }
  /** Resolves 2D circle-AABB wall collision on the ground plane */
  resolveWallCollision(wall) {
    if (!this.hasCollider) return;
    const r = this.colliderRadius;
    const closestX = Math.max(wall.x, Math.min(this.position.x, wall.x + wall.width));
    const closestY = Math.max(wall.y, Math.min(this.position.y, wall.y + wall.height));
    const dx = this.position.x - closestX;
    const dy = this.position.y - closestY;
    const distSq = dx * dx + dy * dy;
    if (distSq < r * r) {
      this.lastThrower = null;
      const dist = Math.sqrt(distSq);
      let normalX = 0;
      let normalY = 0;
      let overlap = 0;
      if (dist === 0) {
        const leftDist = Math.abs(this.position.x - wall.x);
        const rightDist = Math.abs(wall.x + wall.width - this.position.x);
        const topDist = Math.abs(this.position.y - wall.y);
        const bottomDist = Math.abs(wall.y + wall.height - this.position.y);
        const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);
        if (minDist === leftDist) {
          normalX = -1;
          overlap = leftDist + r;
        } else if (minDist === rightDist) {
          normalX = 1;
          overlap = rightDist + r;
        } else if (minDist === topDist) {
          normalY = -1;
          overlap = topDist + r;
        } else {
          normalY = 1;
          overlap = bottomDist + r;
        }
      } else {
        overlap = r - dist;
        normalX = dx / dist;
        normalY = dy / dist;
      }
      this.position.x += normalX * overlap;
      this.position.y += normalY * overlap;
      this.lastContactPoint = { x: closestX, y: closestY };
      this.lastContactNormal = { x: normalX, y: normalY };
      this.lastCollisionType = this.isSweptActive ? "continuous_swept" : "discrete_toi";
      this.lastCollisionTime = performance.now();
      const restitution = this.isCharacter ? 0 : this.hasBounce && this.bounceMod !== null ? this.bounceMod : 0;
      this.resolveWallImpact(normalX, normalY, restitution);
    }
  }
};
/** Global world scale for converting absorbed collision shock to raw HP damage */
__publicField(_GameObject, "globalWorldCollisionDamageScale", 0.1);
let GameObject = _GameObject;
class WalkingModule {
  constructor(options) {
    __publicField(this, "id", "walking");
    __publicField(this, "name", "Walking Module");
    __publicField(this, "enabled", true);
    // Maximum propulsion / braking force exerted by the character's legs (in Newtons / Force units)
    __publicField(this, "maxWalkForceProp");
    // Maximum physical leg stride / cadence speed cap (u/s)
    __publicField(this, "maxWalkSpeedProp");
    // Whether sprinting is allowed
    __publicField(this, "canSprint", true);
    // Explicit maximum speed cap when sprinting (u/s)
    __publicField(this, "maxSprintSpeedProp");
    // Behavior-driven maximum power capacities (Watts)
    __publicField(this, "maxSprintPowerProp");
    __publicField(this, "maxWalkPowerProp");
    // Legacy bus identifiers for backwards compatibility
    __publicField(this, "sprintEnergyBusId", "bus_main");
    __publicField(this, "walkEnergyBusId", "bus_main");
    // Energy consumption toggles
    __publicField(this, "sprintConsumesEnergy", false);
    /** Whether sprinting is allowed to run at partial power between walk speed and sprint speed */
    __publicField(this, "sprintAllowPartialPower", true);
    __publicField(this, "walkConsumesEnergy", false);
    /** Whether walking is allowed to run at reduced speed/force when power cannot provide 100% */
    __publicField(this, "walkAllowPartialPower", false);
    __publicField(this, "consumesEnergy", false);
    // Drag damping factor for backwards compatibility / reference
    __publicField(this, "dragDamping", 8.01);
    // When enabled, walking force applies in the air, granting air control / steering
    __publicField(this, "walkInAir", true);
    // Air friction multiplier applied when airborne (floating friction to stay still)
    __publicField(this, "airFrictionProp");
    // Planned momentum braking state:
    // When movement input drops to zero, computes the exact force and duration required
    // to brake the character's release velocity to zero. The module continues executing
    // this pre-planned deceleration until the timer expires, without fighting external pushes!
    __publicField(this, "isBrakingPlanned", false);
    __publicField(this, "plannedBrakeRemainingTime", 0);
    __publicField(this, "plannedBrakeDirX", 0);
    __publicField(this, "plannedBrakeDirY", 0);
    __publicField(this, "plannedBrakeAccel", 0);
    __publicField(this, "wasMovingLastTick", false);
    this.maxWalkForceProp = new DynamicProperty((options == null ? void 0 : options.maxWalkForce) ?? 35);
    this.maxWalkSpeedProp = new DynamicProperty((options == null ? void 0 : options.maxWalkSpeed) ?? 5.2);
    if ((options == null ? void 0 : options.canSprint) !== void 0) this.canSprint = options.canSprint;
    this.maxSprintSpeedProp = new DynamicProperty((options == null ? void 0 : options.maxSprintSpeed) ?? 8.06);
    this.maxSprintPowerProp = new DynamicProperty((options == null ? void 0 : options.sprintPowerCapacity) ?? (options == null ? void 0 : options.maxSprintPower) ?? 500);
    this.maxWalkPowerProp = new DynamicProperty((options == null ? void 0 : options.walkPowerCapacity) ?? (options == null ? void 0 : options.maxWalkPower) ?? 300);
    if ((options == null ? void 0 : options.sprintConsumesEnergy) !== void 0) this.sprintConsumesEnergy = options.sprintConsumesEnergy;
    if ((options == null ? void 0 : options.sprintAllowPartialPower) !== void 0) this.sprintAllowPartialPower = options.sprintAllowPartialPower;
    if ((options == null ? void 0 : options.walkConsumesEnergy) !== void 0) this.walkConsumesEnergy = options.walkConsumesEnergy;
    if ((options == null ? void 0 : options.walkAllowPartialPower) !== void 0) this.walkAllowPartialPower = options.walkAllowPartialPower;
    if ((options == null ? void 0 : options.consumesEnergy) !== void 0) this.consumesEnergy = options.consumesEnergy;
    if ((options == null ? void 0 : options.dragDamping) !== void 0) this.dragDamping = options.dragDamping;
    if ((options == null ? void 0 : options.walkInAir) !== void 0) this.walkInAir = options.walkInAir;
    this.airFrictionProp = new DynamicProperty((options == null ? void 0 : options.airFriction) ?? 1);
    if ((options == null ? void 0 : options.enabled) !== void 0) this.enabled = options.enabled;
  }
  // Aliases for backwards compatibility
  get sprintPowerCapacityProp() {
    return this.maxSprintPowerProp;
  }
  set sprintPowerCapacityProp(prop) {
    this.maxSprintPowerProp = prop;
  }
  get walkPowerCapacityProp() {
    return this.maxWalkPowerProp;
  }
  set walkPowerCapacityProp(prop) {
    this.maxWalkPowerProp = prop;
  }
  get maxWalkForce() {
    return this.maxWalkForceProp.literalValue;
  }
  set maxWalkForce(val) {
    this.maxWalkForceProp.literalValue = val;
  }
  get maxWalkSpeed() {
    return this.maxWalkSpeedProp.literalValue;
  }
  set maxWalkSpeed(val) {
    this.maxWalkSpeedProp.literalValue = val;
  }
  get maxSprintSpeed() {
    return this.maxSprintSpeedProp.literalValue;
  }
  set maxSprintSpeed(val) {
    this.maxSprintSpeedProp.literalValue = val;
  }
  getMaxSprintSpeed(registry) {
    return this.maxSprintSpeedProp.get(registry);
  }
  get maxSprintPower() {
    return this.maxSprintPowerProp.literalValue;
  }
  set maxSprintPower(val) {
    this.maxSprintPowerProp.literalValue = val;
  }
  getMaxSprintPower(registry) {
    return this.maxSprintPowerProp.get(registry);
  }
  get sprintPowerCapacity() {
    return this.maxSprintPowerProp.literalValue;
  }
  set sprintPowerCapacity(val) {
    this.maxSprintPowerProp.literalValue = val;
  }
  getSprintPowerCapacity(registry) {
    return this.maxSprintPowerProp.get(registry);
  }
  get maxWalkPower() {
    return this.maxWalkPowerProp.literalValue;
  }
  set maxWalkPower(val) {
    this.maxWalkPowerProp.literalValue = val;
  }
  getMaxWalkPower(registry) {
    return this.maxWalkPowerProp.get(registry);
  }
  get walkPowerCapacity() {
    return this.maxWalkPowerProp.literalValue;
  }
  set walkPowerCapacity(val) {
    this.maxWalkPowerProp.literalValue = val;
  }
  getWalkPowerCapacity(registry) {
    return this.maxWalkPowerProp.get(registry);
  }
  get airFriction() {
    return this.airFrictionProp.literalValue;
  }
  set airFriction(val) {
    this.airFrictionProp.literalValue = val;
  }
  getMaxWalkForce(registry) {
    return this.maxWalkForceProp.get(registry);
  }
  getMaxWalkSpeed(registry) {
    return this.maxWalkSpeedProp.get(registry);
  }
  getAirFriction(registry) {
    return this.airFrictionProp.get(registry);
  }
  /**
   * Symmetrical Force-Based Locomotion & Air Friction:
   * - Accelerating and stopping step toward target velocity at symmetrical rate:
   *   maxAccel = (maxWalkForce * strength / totalMass) * grip.
   * - On ground, grip scales by ground friction. In air, airFriction applies floating friction to stay still.
   * - Carrying heavy objects increases totalMass, reducing acceleration and smoothly lowering top speed.
   * - When not standing on something (airborne), max speed is not clamped to effective walking speed,
   *   preserving high velocity capacity from launches and jumps while allowing steering and floating friction braking.
   */
  calculateAchievableInputVelocity(character, desiredVx, desiredVy, arena2) {
    let vx = desiredVx;
    let vy = desiredVy;
    const r = character.colliderRadius;
    const skin = 0.06;
    const contactDist = r + skin;
    const charZ = character.position.z ?? 0;
    const charX = character.position.x;
    const charY = character.position.y;
    if (charX <= contactDist && vx < 0) {
      vx = 0;
    } else if (charX >= arena2.width - contactDist && vx > 0) {
      vx = 0;
    }
    if (charY <= contactDist && vy < 0) {
      vy = 0;
    } else if (charY >= arena2.height - contactDist && vy > 0) {
      vy = 0;
    }
    if (arena2.walls && arena2.walls.length > 0) {
      for (const wall of arena2.walls) {
        if (charZ > wall.wallHeight) continue;
        const cx = Math.max(wall.x, Math.min(charX, wall.x + wall.width));
        const cy = Math.max(wall.y, Math.min(charY, wall.y + wall.height));
        const dx = charX - cx;
        const dy = charY - cy;
        const distSq = dx * dx + dy * dy;
        if (distSq < contactDist * contactDist) {
          const dist = Math.sqrt(distSq);
          let nx = 0;
          let ny = 0;
          if (dist > 1e-4) {
            nx = dx / dist;
            ny = dy / dist;
          } else {
            const vMag = Math.hypot(vx, vy);
            if (vMag > 1e-4) {
              nx = -vx / vMag;
              ny = -vy / vMag;
            }
          }
          const dot = vx * nx + vy * ny;
          if (dot < 0) {
            vx -= dot * nx;
            vy -= dot * ny;
          }
        }
      }
    }
    const speed = Math.hypot(vx, vy);
    return { vx, vy, speed };
  }
  update(character, inputVector, dt, arena2) {
    var _a;
    const isAirborne = !character.isRestingOnSurface;
    if (!this.enabled || isAirborne && !this.walkInAir || character.isClimbing) {
      character.isActivelyWalking = false;
      this.isBrakingPlanned = false;
      return;
    }
    if (!character.hasMass || !character.hasStrength || character.strength <= 0) {
      character.isActivelyWalking = false;
      this.isBrakingPlanned = false;
      return;
    }
    if (!isAirborne && (!character.hasFriction || !((_a = character.frictionModule) == null ? void 0 : _a.enabled) || character.dynamicGroundFrictionMod <= 1e-3)) {
      character.isActivelyWalking = false;
      this.isBrakingPlanned = false;
      return;
    }
    const inputMag = Math.hypot(inputVector.x, inputVector.y);
    const isMoving = inputMag > 0.05;
    character.isActivelyWalking = isMoving;
    const totalMass = character.hasMass ? Math.max(0.2, character.mass) : 1;
    if (totalMass <= 0.01) return;
    const airFriction = this.airFrictionProp.get(character.properties);
    const grip = isAirborne ? airFriction : character.dynamicGroundFrictionMod * (arena2.frictionCoeff / 10);
    if (grip <= 1e-3) {
      return;
    }
    const carriedMass = character.carriedMass;
    const loadFactor = carriedMass / (Math.max(0.1, character.strength) * 8);
    const isActivelySprinting = this.canSprint && character.isSprinting;
    let sprintingNow = isActivelySprinting;
    if (sprintingNow && this.sprintConsumesEnergy) {
      const ep = character.energyPool;
      if (ep && (ep.isExhausted || ep.getCurrentStamina(character.properties) <= 1e-4)) {
        sprintingNow = false;
        character.setSprinting(false);
      }
    }
    const maxWalkForce = this.maxWalkForceProp.get(character.properties);
    const maxWalkSpeed = this.maxWalkSpeedProp.get(character.properties);
    const maxSprintSpeed = this.maxSprintSpeedProp.get(character.properties);
    let effectiveWalkForce = sprintingNow ? maxWalkForce * 1.5 : maxWalkForce;
    let effectiveTargetSpeed = sprintingNow ? maxSprintSpeed : maxWalkSpeed;
    const baseWalkTargetSpeed = maxWalkSpeed / (1 + loadFactor);
    const sprintTargetSpeed = maxSprintSpeed / (1 + loadFactor);
    const g = 9.81;
    if (isMoving) {
      const dirX = inputVector.x / inputMag;
      const dirY = inputVector.y / inputMag;
      if (sprintingNow && this.sprintConsumesEnergy) {
        const pool = character.energyPool;
        if (pool) {
          const CrSprint = 0.4;
          const resForceSprint = totalMass * g * CrSprint;
          const fullSprintWatts = resForceSprint * sprintTargetSpeed / 0.25;
          const sprintCap = this.maxSprintPowerProp.get(character.properties);
          const { speed: achievableInputSpeed } = this.calculateAchievableInputVelocity(
            character,
            dirX * sprintTargetSpeed,
            dirY * sprintTargetSpeed,
            arena2
          );
          let requestedWatts = 0;
          if (achievableInputSpeed <= 1e-3) {
            requestedWatts = 0;
          } else if (achievableInputSpeed <= baseWalkTargetSpeed) {
            if (this.walkConsumesEnergy) {
              const CrWalk = 0.28;
              const resForceWalk = totalMass * g * CrWalk;
              const maxWalkWatts = resForceWalk * baseWalkTargetSpeed / 0.25;
              const walkRatio = baseWalkTargetSpeed > 1e-3 ? achievableInputSpeed / baseWalkTargetSpeed : 0;
              requestedWatts = maxWalkWatts * walkRatio;
            } else {
              requestedWatts = 0;
            }
          } else {
            const excessSpeed = achievableInputSpeed - baseWalkTargetSpeed;
            const maxExcessSpeed = Math.max(1e-3, sprintTargetSpeed - baseWalkTargetSpeed);
            const excessRatio = Math.min(1, Math.max(0, excessSpeed / maxExcessSpeed));
            if (this.walkConsumesEnergy) {
              const CrWalk = 0.28;
              const resForceWalk = totalMass * g * CrWalk;
              const maxWalkWatts = resForceWalk * baseWalkTargetSpeed / 0.25;
              requestedWatts = maxWalkWatts + (fullSprintWatts - maxWalkWatts) * excessRatio;
            } else {
              requestedWatts = fullSprintWatts * excessRatio;
            }
          }
          if (requestedWatts > sprintCap) {
            requestedWatts = this.sprintAllowPartialPower ? sprintCap : 0;
          }
          if (requestedWatts <= 1e-4) {
            pool.registerDemand("locomotion", 0, this.sprintAllowPartialPower);
            effectiveTargetSpeed = sprintTargetSpeed * (1 + loadFactor);
            effectiveWalkForce = maxWalkForce;
          } else {
            const minSprintWatts = this.sprintAllowPartialPower ? 1 : requestedWatts - 1e-3;
            const canSprintEitherWay = pool.canSupportPowerInIsolation(
              requestedWatts,
              minSprintWatts,
              dt,
              character.properties
            );
            if (!canSprintEitherWay) {
              character.setSprinting(false);
              sprintingNow = false;
              effectiveWalkForce = maxWalkForce;
              effectiveTargetSpeed = maxWalkSpeed;
              pool.registerDemand("locomotion", 0, this.sprintAllowPartialPower);
            } else {
              const peekedWatts = pool.peekPower(requestedWatts, dt, character.properties, false, this.sprintAllowPartialPower, "locomotion");
              if (peekedWatts < minSprintWatts) {
                sprintingNow = false;
                effectiveWalkForce = maxWalkForce;
                effectiveTargetSpeed = maxWalkSpeed;
                pool.registerDemand("locomotion", 0, this.sprintAllowPartialPower);
                if (this.walkConsumesEnergy) {
                  const CrWalk = 0.28;
                  const resForceWalk = totalMass * g * CrWalk;
                  const rawWalkWatts = resForceWalk * baseWalkTargetSpeed / 0.25;
                  const walkCap = this.maxWalkPowerProp.get(character.properties);
                  let walkRequested = rawWalkWatts;
                  if (walkRequested > walkCap) {
                    walkRequested = this.walkAllowPartialPower ? walkCap : 0;
                  }
                  const walkGranted = pool.requestPower(walkRequested, dt, character.properties, false, "locomotion", this.walkAllowPartialPower);
                  const fraction = walkRequested > 0 ? Math.min(1, walkGranted / walkRequested) : 0;
                  if (fraction <= 0 || !this.walkAllowPartialPower && fraction < 1) {
                    effectiveWalkForce = 0;
                    effectiveTargetSpeed = 0;
                    character.isActivelyWalking = false;
                  } else {
                    effectiveWalkForce *= fraction;
                    effectiveTargetSpeed *= fraction;
                  }
                }
              } else {
                const grantedWatts = pool.requestPower(requestedWatts, dt, character.properties, false, "locomotion", this.sprintAllowPartialPower);
                if (grantedWatts < minSprintWatts) {
                  sprintingNow = false;
                  effectiveWalkForce = maxWalkForce;
                  effectiveTargetSpeed = maxWalkSpeed;
                } else {
                  effectiveTargetSpeed = sprintTargetSpeed * (1 + loadFactor);
                  effectiveWalkForce = maxWalkForce * 1.5;
                }
              }
            }
          }
        }
      } else if (!sprintingNow && this.walkConsumesEnergy) {
        const pool = character.energyPool;
        if (pool) {
          const { speed: achievableWalkSpeed } = this.calculateAchievableInputVelocity(
            character,
            dirX * baseWalkTargetSpeed,
            dirY * baseWalkTargetSpeed,
            arena2
          );
          if (achievableWalkSpeed <= 1e-3) {
            pool.registerDemand("locomotion", 0, this.walkAllowPartialPower);
            effectiveWalkForce = 0;
            effectiveTargetSpeed = 0;
            character.isActivelyWalking = false;
          } else {
            const Cr = 0.28;
            const resForce = totalMass * g * Cr;
            const rawWatts = resForce * achievableWalkSpeed / 0.25;
            const walkCap = this.maxWalkPowerProp.get(character.properties);
            let requestedWatts = rawWatts;
            if (requestedWatts > walkCap) {
              requestedWatts = this.walkAllowPartialPower ? walkCap : 0;
            }
            const grantedWatts = pool.requestPower(requestedWatts, dt, character.properties, false, "locomotion", this.walkAllowPartialPower);
            const fraction = requestedWatts > 0 ? Math.min(1, grantedWatts / requestedWatts) : 0;
            if (fraction <= 0 || !this.walkAllowPartialPower && fraction < 1) {
              effectiveWalkForce = 0;
              effectiveTargetSpeed = 0;
              character.isActivelyWalking = false;
            } else {
              effectiveWalkForce *= fraction;
              effectiveTargetSpeed *= fraction;
            }
          }
        }
      }
    }
    const effectiveSpeed = effectiveTargetSpeed / (1 + loadFactor);
    const maxAccel = effectiveWalkForce * character.strength / totalMass * grip;
    if (isMoving) {
      this.isBrakingPlanned = false;
      this.wasMovingLastTick = true;
      const dirX = inputVector.x / inputMag;
      const dirY = inputVector.y / inputMag;
      let targetVx = 0;
      let targetVy = 0;
      if (isAirborne) {
        const currentSpeed = Math.hypot(character.velocity.x, character.velocity.y);
        const airTargetSpeed = Math.max(effectiveSpeed, currentSpeed);
        targetVx = dirX * airTargetSpeed;
        targetVy = dirY * airTargetSpeed;
      } else {
        targetVx = dirX * effectiveSpeed;
        targetVy = dirY * effectiveSpeed;
      }
      const diffX = targetVx - character.velocity.x;
      const diffY = targetVy - character.velocity.y;
      const diffSpeed = Math.hypot(diffX, diffY);
      if (diffSpeed < 1e-3) {
        character.velocity.x = targetVx;
        character.velocity.y = targetVy;
        return;
      }
      const maxStep = maxAccel * dt;
      if (diffSpeed <= maxStep) {
        character.velocity.x = targetVx;
        character.velocity.y = targetVy;
      } else {
        const stepRatio = maxStep / diffSpeed;
        character.velocity.x += diffX * stepRatio;
        character.velocity.y += diffY * stepRatio;
      }
    } else {
      const currentSpeed = Math.hypot(character.velocity.x, character.velocity.y);
      const staticThreshold = Math.max(0.02, arena2.staticFrictionThreshold * character.staticGroundFrictionMod);
      if (!this.isBrakingPlanned && this.wasMovingLastTick) {
        this.wasMovingLastTick = false;
        if (currentSpeed > staticThreshold && maxAccel > 1e-3) {
          this.isBrakingPlanned = true;
          this.plannedBrakeRemainingTime = currentSpeed / maxAccel;
          this.plannedBrakeDirX = character.velocity.x / currentSpeed;
          this.plannedBrakeDirY = character.velocity.y / currentSpeed;
          this.plannedBrakeAccel = maxAccel;
        } else {
          if (!isAirborne && currentSpeed < staticThreshold) {
            character.velocity.x = 0;
            character.velocity.y = 0;
          }
          return;
        }
      } else if (!this.isBrakingPlanned) {
        this.wasMovingLastTick = false;
        return;
      }
      if (this.isBrakingPlanned) {
        const stepDt = Math.min(dt, this.plannedBrakeRemainingTime);
        const decelStep = this.plannedBrakeAccel * stepDt;
        character.velocity.x -= this.plannedBrakeDirX * decelStep;
        character.velocity.y -= this.plannedBrakeDirY * decelStep;
        this.plannedBrakeRemainingTime -= dt;
        if (this.plannedBrakeRemainingTime <= 1e-4) {
          this.isBrakingPlanned = false;
          const dot = character.velocity.x * this.plannedBrakeDirX + character.velocity.y * this.plannedBrakeDirY;
          if (dot <= staticThreshold) {
            character.velocity.x -= dot * this.plannedBrakeDirX;
            character.velocity.y -= dot * this.plannedBrakeDirY;
          }
          const postSpeed = Math.hypot(character.velocity.x, character.velocity.y);
          if (!isAirborne && postSpeed < staticThreshold) {
            character.velocity.x = 0;
            character.velocity.y = 0;
          }
        }
      }
    }
  }
}
class PickupModule {
  constructor(options) {
    __publicField(this, "id", "pickup");
    __publicField(this, "name", "Pickup Ability");
    __publicField(this, "enabled", true);
    __publicField(this, "pickupReachProp");
    __publicField(this, "crossLayerReachRatio", 1);
    // Deprecated: single 3D pickup range now governs reach across all layers
    /**
     * Whether picking up objects consumes energy from EnergyPool.
     */
    __publicField(this, "consumesEnergy", false);
    /** Whether picking up is allowed when power cannot provide 100% full lift */
    __publicField(this, "allowPartialPower", false);
    // Behavior-driven maximum pickup power capacity (Watts)
    __publicField(this, "maxPowerProp");
    this.pickupReachProp = new DynamicProperty((options == null ? void 0 : options.pickupReach) ?? 1.3);
    this.maxPowerProp = new DynamicProperty((options == null ? void 0 : options.maxPower) ?? 250);
    if ((options == null ? void 0 : options.consumesEnergy) !== void 0) this.consumesEnergy = options.consumesEnergy;
    if ((options == null ? void 0 : options.allowPartialPower) !== void 0) this.allowPartialPower = options.allowPartialPower;
    if ((options == null ? void 0 : options.enabled) !== void 0) this.enabled = options.enabled;
  }
  get maxPower() {
    return this.maxPowerProp.literalValue;
  }
  set maxPower(val) {
    this.maxPowerProp.literalValue = val;
  }
  getMaxPower(registry) {
    return this.maxPowerProp.get(registry);
  }
  get pickupReach() {
    return this.pickupReachProp.literalValue;
  }
  set pickupReach(val) {
    this.pickupReachProp.literalValue = val;
  }
  getPickupReach(registry) {
    return this.pickupReachProp.get(registry);
  }
  /**
   * Returns true if the object is within the character's physical grab reach using true 3D math.
   * Gets the delta magnitude of the 3D positions (dx, dy, dz) and forces the character
   * to be within a single pickup range.
   */
  isObjectInReach(character, obj, wallHeight = 1) {
    if (!this.enabled || obj === character || obj.isHeld || obj.isCharacter) return false;
    if (obj.lastThrower === character) return false;
    const charZ = Math.max(
      character.position.z,
      character.supportingSurfaceHeight ?? 0,
      character.standingWall ? wallHeight : 0
    );
    const objZ = Math.max(
      obj.position.z,
      obj.supportingSurfaceHeight ?? 0,
      obj.standingWall ? wallHeight : 0
    );
    const dx = obj.position.x - character.position.x;
    const dy = obj.position.y - character.position.y;
    const dz = objZ - charZ;
    const deltaMagnitude = Math.hypot(dx, dy, dz);
    const reach = this.pickupReachProp.get(character.properties);
    return deltaMagnitude <= reach;
  }
  /**
   * Finds the nearest grabbable object to the mouse/aim location within character reach
   */
  findTargetObject(character, targetX, targetY, objects2, wallHeight = 1, maxSelectDistance = Infinity) {
    if (!this.enabled) return null;
    let bestCandidate = null;
    let shortestDist = Infinity;
    for (const obj of objects2) {
      if (obj === character.heldObject || obj.isHeld) continue;
      if (!this.isObjectInReach(character, obj, wallHeight)) continue;
      const distToMouse = Math.hypot(obj.position.x - targetX, obj.position.y - targetY);
      if (distToMouse <= maxSelectDistance && distToMouse < shortestDist) {
        shortestDist = distToMouse;
        bestCandidate = obj;
      }
    }
    return bestCandidate;
  }
  /**
   * Picks up the specified object and transfers its incoming momentum/force to the character
   */
  pickup(character, target) {
    if (!this.enabled) return false;
    if (character.heldObject) return false;
    if (this.consumesEnergy) {
      const pool = character.energyPool;
      if (pool) {
        const targetMass = target.hasMass ? Math.max(0.2, target.mass) : 0.5;
        const liftHeight = 0.45;
        const rawMetabolicJoules = Math.max(5, targetMass * 9.81 * liftHeight / 0.25);
        const maxPower = this.maxPowerProp.get(character.properties);
        let metabolicJoules = rawMetabolicJoules;
        if (metabolicJoules > maxPower) {
          if (!this.allowPartialPower) {
            return false;
          }
          metabolicJoules = maxPower;
        }
        const fraction = pool.requestEnergy(metabolicJoules, 0.15, character.properties, this.allowPartialPower, "pickup");
        if (fraction <= 0 || !this.allowPartialPower && fraction < 1) {
          return false;
        }
      }
    }
    const objVx = target.velocity.x;
    const objVy = target.velocity.y;
    const momentumRatio = target.mass / Math.max(0.2, character.mass);
    character.velocity.x += objVx * momentumRatio;
    character.velocity.y += objVy * momentumRatio;
    if (character.isAboveGround && Math.abs(target.verticalVelocity) > 0.1) {
      character.verticalVelocity += target.verticalVelocity * momentumRatio;
    }
    character.heldObject = target;
    target.wakeUp();
    target.isHeld = true;
    target.heldBy = character;
    target.isInFlight = false;
    target.lastThrower = null;
    target.originalThrower = null;
    target.velocity.x = 0;
    target.velocity.y = 0;
    target.verticalVelocity = 0;
    if (target.rollModule) {
      target.rollModule.angularVelocity.x = 0;
      target.rollModule.angularVelocity.y = 0;
      target.rollModule.angularVelocity.z = 0;
    }
    const heldPos = character.calculateHeldObjectPosition();
    target.position.x = heldPos.x;
    target.position.y = heldPos.y;
    target.position.z = heldPos.z;
    return true;
  }
  /**
   * Drops the currently held object onto the ground, inheriting character velocity
   */
  drop(character) {
    if (!character.heldObject) return null;
    const dropped = character.heldObject;
    character.heldObject = null;
    dropped.wakeUp();
    dropped.isHeld = false;
    dropped.heldBy = null;
    dropped.lastThrower = null;
    dropped.originalThrower = null;
    dropped.isInFlight = false;
    dropped.velocity.x = character.velocity.x;
    dropped.velocity.y = character.velocity.y;
    dropped.verticalVelocity = character.isAboveGround ? character.verticalVelocity : 0;
    if (dropped.hasFriction && dropped.rollModule && dropped.rollModule.enabled) {
      const R = dropped.colliderRadius > 0 ? dropped.colliderRadius : 0.3;
      dropped.rollModule.angularVelocity.y = dropped.velocity.x / R;
      dropped.rollModule.angularVelocity.x = -dropped.velocity.y / R;
    }
    return dropped;
  }
  /**
   * Pickup and swap:
   * - If aimX/aimY provided, targets reachable object closest to the cursor.
   * - If holding an object and another reachable object is nearby, drops the held object and grabs the new one.
   * - If holding an object and no other object is nearby, drops the held object.
   * - If not holding an object, picks up the closest reachable object.
   */
  pickupAndSwap(character, objects2, wallHeight, aimX, aimY) {
    if (!this.enabled) return false;
    let bestTarget = null;
    if (aimX !== void 0 && aimY !== void 0) {
      bestTarget = this.findTargetObject(character, aimX, aimY, objects2, wallHeight);
    }
    if (!bestTarget) {
      let bestDist = Infinity;
      const charZ = Math.max(
        character.position.z,
        character.supportingSurfaceHeight ?? 0,
        character.standingWall ? wallHeight : 0
      );
      for (const obj of objects2) {
        if (obj === character.heldObject || obj.isHeld) continue;
        if (this.isObjectInReach(character, obj, wallHeight)) {
          const objZ = Math.max(
            obj.position.z,
            obj.supportingSurfaceHeight ?? 0,
            obj.standingWall ? wallHeight : 0
          );
          const d = Math.hypot(
            obj.position.x - character.position.x,
            obj.position.y - character.position.y,
            objZ - charZ
          );
          if (d < bestDist) {
            bestDist = d;
            bestTarget = obj;
          }
        }
      }
    }
    if (character.heldObject) {
      if (bestTarget) {
        this.drop(character);
        return this.pickup(character, bestTarget);
      }
      return false;
    } else {
      if (bestTarget) {
        return this.pickup(character, bestTarget);
      }
    }
    return false;
  }
}
class ThrowModule {
  constructor(options) {
    __publicField(this, "id", "throw");
    __publicField(this, "name", "Throw Ability");
    __publicField(this, "enabled", true);
    // Tunable throw physics in wall-based units
    __publicField(this, "maxThrowSpeedProp");
    __publicField(this, "maxThrowAimDistanceProp");
    __publicField(this, "maxThrowHeightProp");
    // Behavior-driven maximum throw power capacity (Watts)
    __publicField(this, "maxPowerProp");
    /**
     * Whether throwing consumes energy from EnergyPool.
     */
    __publicField(this, "consumesEnergy", true);
    // Legacy bus identifier for backwards compatibility
    __publicField(this, "energyBusId", "bus_main");
    /**
     * Remembered arc ratio: 0.0 (shortest / flattest possible arc) to 1.0 (tallest / steepest possible arc).
     * Trajectory manipulation is based on this ratio between the shortest and tallest arc available.
     * If the target moves farther so the maximum arc height flattens, ratio 1.0 continues to track the highest possible arc.
     */
    __publicField(this, "savedArcRatio", 0);
    __publicField(this, "hasUserSetArcRatio", false);
    const initialSpeed = (options == null ? void 0 : options.maxThrowSpeed) ?? (options == null ? void 0 : options.baseThrowForce) ?? 100;
    this.maxThrowSpeedProp = new DynamicProperty(initialSpeed);
    this.maxThrowAimDistanceProp = new DynamicProperty((options == null ? void 0 : options.maxThrowAimDistance) ?? 13);
    this.maxThrowHeightProp = new DynamicProperty((options == null ? void 0 : options.maxThrowHeight) ?? 5);
    this.maxPowerProp = new DynamicProperty((options == null ? void 0 : options.maxPower) ?? (options == null ? void 0 : options.throwPowerCapacity) ?? 1e3);
    if ((options == null ? void 0 : options.consumesEnergy) !== void 0) this.consumesEnergy = options.consumesEnergy;
    if ((options == null ? void 0 : options.enabled) !== void 0) this.enabled = options.enabled;
  }
  // Backwards-compatible aliases
  get throwPowerCapacityProp() {
    return this.maxPowerProp;
  }
  set throwPowerCapacityProp(prop) {
    this.maxPowerProp = prop;
  }
  /**
   * Alias for backward compatibility with baseThrowForceProp.
   */
  get baseThrowForceProp() {
    return this.maxThrowSpeedProp;
  }
  set baseThrowForceProp(prop) {
    this.maxThrowSpeedProp = prop;
  }
  get savedArcSteepness() {
    return this.savedArcRatio * 2 - 1;
  }
  set savedArcSteepness(val) {
    this.savedArcRatio = Math.max(0, Math.min(1, (val + 1) / 2));
    this.hasUserSetArcRatio = true;
  }
  get maxPower() {
    return this.maxPowerProp.literalValue;
  }
  set maxPower(val) {
    this.maxPowerProp.literalValue = val;
  }
  getMaxPower(registry) {
    return this.maxPowerProp.get(registry);
  }
  get throwPowerCapacity() {
    return this.maxPowerProp.literalValue;
  }
  set throwPowerCapacity(val) {
    this.maxPowerProp.literalValue = val;
  }
  getThrowPowerCapacity(registry) {
    return this.maxPowerProp.get(registry);
  }
  get maxThrowSpeed() {
    return this.maxThrowSpeedProp.literalValue;
  }
  set maxThrowSpeed(val) {
    this.maxThrowSpeedProp.literalValue = val;
  }
  get baseThrowForce() {
    return this.maxThrowSpeed;
  }
  set baseThrowForce(val) {
    this.maxThrowSpeed = val;
  }
  get maxThrowAimDistance() {
    return this.maxThrowAimDistanceProp.literalValue;
  }
  set maxThrowAimDistance(val) {
    this.maxThrowAimDistanceProp.literalValue = val;
  }
  get maxThrowHeight() {
    return this.maxThrowHeightProp.literalValue;
  }
  set maxThrowHeight(val) {
    this.maxThrowHeightProp.literalValue = val;
  }
  getMaxThrowSpeed(registry) {
    return this.maxThrowSpeedProp.get(registry);
  }
  getBaseThrowForce(registry) {
    return this.getMaxThrowSpeed(registry);
  }
  getMaxThrowAimDistance(registry) {
    return this.maxThrowAimDistanceProp.get(registry);
  }
  getMaxThrowHeight(registry) {
    return this.maxThrowHeightProp.get(registry);
  }
  /**
   * Helper: tests circle-AABB intersection with a wall tile (matching GameObject collision)
   */
  static testWallIntersection(x, y, radius, wall) {
    const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
    const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
    const dx = x - closestX;
    const dy = y - closestY;
    return dx * dx + dy * dy < radius * radius;
  }
  /**
   * Clamps an object's start position so that it does not overlap any wall if starting on the ground.
   * If overlapping, pushes it out to the closest valid position outside the wall.
   * Also exposes a near-wall check: if the clamped position is within `safeDistance` of any wall
   * face, the caller should pull the start back to the character's own position.
   */
  static clampStartOutsideWalls(x, y, radius, arena2, charZ, charX, charY) {
    if (charZ >= arena2.wallHeight) {
      return { x, y, nearWall: false };
    }
    let clampedX = x;
    let clampedY = y;
    const r = radius > 0 ? radius : 0.3;
    const requiredClearance = r + 0.04;
    const nearWallThreshold = r + 0.3;
    for (let iter = 0; iter < 3; iter++) {
      let collided = false;
      for (const wall of arena2.walls) {
        const closestX = Math.max(wall.x, Math.min(clampedX, wall.x + wall.width));
        const closestY = Math.max(wall.y, Math.min(clampedY, wall.y + wall.height));
        const dx = clampedX - closestX;
        const dy = clampedY - closestY;
        const distSq = dx * dx + dy * dy;
        if (distSq < requiredClearance * requiredClearance) {
          collided = true;
          const dist = Math.sqrt(distSq);
          if (dist > 1e-4) {
            const pushDist = requiredClearance + 0.01 - dist;
            clampedX += dx / dist * pushDist;
            clampedY += dy / dist * pushDist;
          } else {
            const cdx = charX - closestX;
            const cdy = charY - closestY;
            const cdist = Math.hypot(cdx, cdy);
            if (cdist > 1e-4) {
              clampedX = closestX + cdx / cdist * (requiredClearance + 0.01);
              clampedY = closestY + cdy / cdist * (requiredClearance + 0.01);
            } else {
              const dL = clampedX - wall.x;
              const dR = wall.x + wall.width - clampedX;
              const dT = clampedY - wall.y;
              const dB = wall.y + wall.height - clampedY;
              const minD = Math.min(dL, dR, dT, dB);
              if (minD === dL) clampedX = wall.x - requiredClearance - 0.01;
              else if (minD === dR) clampedX = wall.x + wall.width + requiredClearance + 0.01;
              else if (minD === dT) clampedY = wall.y - requiredClearance - 0.01;
              else clampedY = wall.y + wall.height + requiredClearance + 0.01;
            }
          }
        }
      }
      if (!collided) break;
    }
    let nearWall = false;
    for (const wall of arena2.walls) {
      const closestX = Math.max(wall.x, Math.min(clampedX, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(clampedY, wall.y + wall.height));
      const dx = clampedX - closestX;
      const dy = clampedY - closestY;
      if (dx * dx + dy * dy < nearWallThreshold * nearWallThreshold) {
        nearWall = true;
        break;
      }
    }
    return { x: clampedX, y: clampedY, nearWall };
  }
  /**
   * Finds the entity directly under the aim target cursor (x, y), if any.
   * Excludes the thrower and the thrower's held object.
   * Checks both physical 2D ground footprint and pseudo-3D isometric visual position.
   */
  findHoveredEntity(aimX, aimY, arena2, exclude, heldObject, entities, hoverScale, tolerance = 0.35) {
    var _a;
    const list = entities ?? arena2.entities ?? [];
    const scale = hoverScale !== void 0 ? hoverScale : arena2.visualAltitudeScale ?? 0.5;
    let bestEntity = null;
    let bestDist = Infinity;
    for (let i = list.length - 1; i >= 0; i--) {
      const ent = list[i];
      if (ent === exclude || ent === heldObject || ent.isHeld) continue;
      const r = ent.hasCollider ? ent.colliderRadius : ((_a = ent.colliderModule) == null ? void 0 : _a.radius) ?? 0.35;
      const effectiveR = r > 0 ? r : 0.35;
      const distGround = Math.hypot(ent.position.x - aimX, ent.position.y - aimY);
      const z = ent.position.z ?? 0;
      const visualY = ent.position.y - z * scale;
      const distVisual = Math.hypot(ent.position.x - aimX, visualY - aimY);
      const dist1to1 = Math.hypot(ent.position.x - aimX, ent.position.y - z - aimY);
      const minDist = Math.min(distGround, distVisual, dist1to1);
      if (minDist <= effectiveR + tolerance) {
        if (minDist < bestDist) {
          bestDist = minDist;
          bestEntity = ent;
        }
      }
    }
    return bestEntity;
  }
  /**
   * Helper: tests if (aimX, aimY) in screen space is over a wall's pseudo-3D roof or front face.
   * If found, maps the screen aim point back to physical 3D world coordinates (physX, physY)
   * on top of the wall so that rendering at (physX, physY - wallHeight * hoverScale) aligns
   * EXACTLY with (aimX, aimY) on screen!
   */
  static getWallUnderCursor(aimX, aimY, arena2, hoverScale = 0) {
    const hScale = hoverScale > 0 ? hoverScale : 0;
    const sortedWalls = [...arena2.walls].sort((a, b) => b.y - a.y);
    for (const wall of sortedWalls) {
      const roofTopY = wall.y - wall.wallHeight * hScale;
      const roofBottomY = wall.y + wall.height - wall.wallHeight * hScale;
      const baseBottomY = wall.y + wall.height;
      if (aimX >= wall.x - 0.05 && aimX <= wall.x + wall.width + 0.05) {
        if (aimY >= roofTopY && aimY <= roofBottomY) {
          const physX = Math.max(wall.x + 0.05, Math.min(wall.x + wall.width - 0.05, aimX));
          const physY = Math.max(wall.y + 0.05, Math.min(wall.y + wall.height - 0.05, aimY + wall.wallHeight * hScale));
          return { wall, physX, physY };
        }
        if (aimY > roofBottomY && aimY <= baseBottomY + 0.05) {
          const physX = Math.max(wall.x + 0.05, Math.min(wall.x + wall.width - 0.05, aimX));
          const physY = Math.max(wall.y + 0.05, Math.min(wall.y + wall.height - 0.05, wall.y + wall.height - 0.15));
          return { wall, physX, physY };
        }
        if (hScale === 0 && aimY >= wall.y && aimY <= wall.y + wall.height) {
          const physX = Math.max(wall.x + 0.05, Math.min(wall.x + wall.width - 0.05, aimX));
          const physY = Math.max(wall.y + 0.05, Math.min(wall.y + wall.height - 0.05, aimY));
          return { wall, physX, physY };
        }
      }
    }
    return null;
  }
  /**
   * Helper: tests if an aim point (aimX, aimY) is directly over a wall tile footprint.
   * Only considers whether the cursor is over the physical 2D wall tile,
   * completely ignoring the upward-projected roof sprite depth so that the space
   * behind the wall can be freely targeted on open ground.
   */
  static findWallOverlappingCollider(aimX, aimY, _radius = 0, arena2, _hoverScale = 0) {
    let bestWall = null;
    let bestDist = Infinity;
    for (const wall of arena2.walls) {
      const isOverWallTile = aimX >= wall.x && aimX <= wall.x + wall.width && aimY >= wall.y && aimY <= wall.y + wall.height;
      if (isOverWallTile) {
        const midX = wall.x + wall.width * 0.5;
        const midY = wall.y + wall.height * 0.5;
        const d = Math.hypot(midX - aimX, midY - aimY);
        if (d < bestDist) {
          bestDist = d;
          bestWall = wall;
        }
      }
    }
    if (bestWall) {
      return {
        wall: bestWall,
        targetSurfaceHeight: bestWall.wallHeight,
        physX: aimX,
        physY: aimY
      };
    }
    return null;
  }
  /**
   * Helper: calculates the distance along ray (startX, startY) + s * (dirX, dirY)
   * where the ray enters and exits a wall's 2D bounding box.
   */
  static getRayWallEnterDistance(startX, startY, dirX, dirY, wall) {
    let tNear = -Infinity;
    let tFar = Infinity;
    if (Math.abs(dirX) > 1e-6) {
      let t1 = (wall.x - startX) / dirX;
      let t2 = (wall.x + wall.width - startX) / dirX;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tNear = Math.max(tNear, t1);
      tFar = Math.min(tFar, t2);
    } else {
      if (startX <= wall.x || startX >= wall.x + wall.width) return null;
    }
    if (Math.abs(dirY) > 1e-6) {
      let t1 = (wall.y - startY) / dirY;
      let t2 = (wall.y + wall.height - startY) / dirY;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tNear = Math.max(tNear, t1);
      tFar = Math.min(tFar, t2);
    } else {
      if (startY <= wall.y || startY >= wall.y + wall.height) return null;
    }
    if (tNear <= tFar && tFar >= 0) {
      return { enterDist: Math.max(0, tNear), exitDist: tFar };
    }
    return null;
  }
  /**
   * Calculates the maximum launch speed for an object given:
   * 1. Character's maxThrowSpeed (governs light objects) scaled by character strength.
   * 2. Object mass and character energy bus power/energy limit (governs heavier objects).
   */
  calculateMaxLaunchSpeed(thrower, heldObject) {
    const rawMaxSpeed = this.maxThrowSpeedProp.get(thrower == null ? void 0 : thrower.properties);
    const strength = (thrower == null ? void 0 : thrower.strength) ?? 1;
    const speedCap = Math.max(1, rawMaxSpeed * strength);
    if (!heldObject || !heldObject.hasMass) {
      return speedCap;
    }
    const mass = Math.max(0.05, heldObject.mass);
    if (this.consumesEnergy && thrower) {
      const ep = thrower.energyPool;
      if (ep && ep.enabled) {
        const throwCap = this.maxPowerProp.get(thrower.properties);
        const efficiency = Math.max(0.01, ep.getMuscleEfficiency(thrower.properties));
        const currentStamina = ep.currentStaminaProp.get(thrower.properties);
        const poolEnergy = ep.infiniteEnergy ? Infinity : ep.getCurrentEnergy(thrower.properties);
        const maxDeliverableMetabolicJoules = Math.min(
          throwCap * strength,
          currentStamina,
          poolEnergy
        );
        const availableMechJoules = Math.max(0, maxDeliverableMetabolicJoules) * efficiency;
        const massLimitedSpeed2 = Math.sqrt(2 * Math.max(0.1, availableMechJoules) / mass);
        return massLimitedSpeed2;
      }
    }
    const massLimitedSpeed = speedCap * Math.sqrt(strength) / Math.sqrt(Math.max(0.1, mass));
    return Math.min(speedCap, massLimitedSpeed);
  }
  /**
   * Computes launch velocities vx, vy, vz given start position, target position, arena parameters, and strength.
   * Adjusts total flight time and launch angles so the object lands EXACTLY at the targeted position,
   * whether on the ground, on top of an elevated wall, or on the layer of a targeted object.
   * If autoLock is true (e.g. holding right click), locks 2D coordinates to the overlapped object center.
   */
  computeLaunchVelocity(startX, startY, startZ, targetX, targetY, arena2, throwPower, hasGravity = true, hasVerticalVelocity = true, _colliderRadius = 0.35, _charVel, _candidateEntities, hoverScale, thrower, _heldObject, _autoLock = false, lockedTargetPos, _aimLockDelta = 0) {
    const scale = hoverScale !== void 0 ? hoverScale : arena2.visualAltitudeScale ?? 0.5;
    const effectiveTargetX = lockedTargetPos ? lockedTargetPos.x : targetX;
    const effectiveTargetY = lockedTargetPos ? lockedTargetPos.y : targetY;
    const radius = _colliderRadius > 0 ? _colliderRadius : 0.35;
    let finalTargetX = effectiveTargetX;
    let finalTargetY = effectiveTargetY;
    let targetSurfaceHeight = 0;
    const wallOverlapping = ThrowModule.findWallOverlappingCollider(effectiveTargetX, effectiveTargetY, radius, arena2, scale);
    if (wallOverlapping) {
      targetSurfaceHeight = wallOverlapping.targetSurfaceHeight;
      const desiredPhysX = wallOverlapping.physX;
      const desiredPhysY = wallOverlapping.physY;
      const wall = wallOverlapping.wall;
      const supWall = arena2.getSupportingWall(desiredPhysX, desiredPhysY, radius) || wall;
      if (ThrowModule.testWallIntersection(desiredPhysX, desiredPhysY, radius, supWall)) {
        finalTargetX = desiredPhysX;
        finalTargetY = desiredPhysY;
      } else {
        const closestX = Math.max(supWall.x, Math.min(supWall.x + supWall.width, desiredPhysX));
        const closestY = Math.max(supWall.y, Math.min(supWall.y + supWall.height, desiredPhysY));
        const dx2 = desiredPhysX - closestX;
        const dy2 = desiredPhysY - closestY;
        const d = Math.hypot(dx2, dy2);
        if (d > 1e-4) {
          finalTargetX = closestX + dx2 / d * (radius - 0.02);
          finalTargetY = closestY + dy2 / d * (radius - 0.02);
        } else {
          finalTargetX = desiredPhysX;
          finalTargetY = desiredPhysY;
        }
      }
    } else {
      targetSurfaceHeight = 0;
      finalTargetX = effectiveTargetX;
      finalTargetY = effectiveTargetY;
    }
    const maxThrowHeight = this.maxThrowHeightProp.get(thrower == null ? void 0 : thrower.properties);
    const effectiveMaxHeight = maxThrowHeight * ((thrower == null ? void 0 : thrower.strength) ?? 1);
    const maxAllowedTargetZ = startZ + effectiveMaxHeight;
    if (targetSurfaceHeight > maxAllowedTargetZ) {
      targetSurfaceHeight = maxAllowedTargetZ;
    }
    let dx = finalTargetX - startX;
    let dy = finalTargetY - startY;
    let dist = Math.hypot(dx, dy);
    if (dist < 0.1) return null;
    const launchSpeed = Math.max(1, throwPower);
    const g = arena2.gravity;
    if (!hasGravity || !hasVerticalVelocity) {
      const totalTime2 = Math.max(0.14, dist / launchSpeed);
      const vx2 = dx / dist * (dist / totalTime2);
      const vy2 = dy / dist * (dist / totalTime2);
      const vz2 = 0;
      return { vx: vx2, vy: vy2, vz: vz2, totalTime: totalTime2, finalTargetX, finalTargetY, targetSurfaceHeight: startZ, targetObject: null, isAutoLocked: false };
    }
    const dirX = dist > 1e-4 ? dx / dist : 0;
    const dirY = dist > 1e-4 ? dy / dist : 0;
    if (targetSurfaceHeight === 0) {
      let nearestBlockingWallDist = Infinity;
      for (const wall of arena2.walls) {
        const rayHit = ThrowModule.getRayWallEnterDistance(startX, startY, dirX, dirY, wall);
        if (rayHit && rayHit.enterDist < dist && rayHit.enterDist > 0.1) {
          const maxApexHeight = launchSpeed * launchSpeed / (2 * g);
          if (startZ + maxApexHeight < wall.wallHeight + 0.15) {
            if (rayHit.enterDist < nearestBlockingWallDist) {
              nearestBlockingWallDist = rayHit.enterDist;
            }
          }
        }
      }
      if (nearestBlockingWallDist < Infinity) {
        const safeDist = Math.max(0.2, nearestBlockingWallDist - radius - 0.05);
        if (dist > safeDist) {
          dist = safeDist;
          finalTargetX = startX + dirX * dist;
          finalTargetY = startY + dirY * dist;
        }
      }
    }
    let deltaZ = targetSurfaceHeight - startZ;
    const apexMax = launchSpeed * launchSpeed / (2 * g) - 0.02;
    if (targetSurfaceHeight > 0) {
      const canReachHeight = deltaZ <= apexMax;
      const reachRadicand = canReachHeight ? Math.max(0, launchSpeed * launchSpeed - 2 * g * deltaZ) : 0;
      const maxReachWall = canReachHeight ? launchSpeed / g * Math.sqrt(reachRadicand) : 0;
      if (!canReachHeight || dist > maxReachWall) {
        if (canReachHeight && maxReachWall > 0.2) {
          dist = maxReachWall;
          finalTargetX = startX + dirX * dist;
          finalTargetY = startY + dirY * dist;
        } else {
          targetSurfaceHeight = 0;
          deltaZ = targetSurfaceHeight - startZ;
          const groundRadicand = Math.max(0, launchSpeed * launchSpeed - 2 * g * deltaZ);
          const maxReachGround = launchSpeed / g * Math.sqrt(groundRadicand);
          dist = Math.min(dist, maxReachGround);
          finalTargetX = startX + dirX * dist;
          finalTargetY = startY + dirY * dist;
        }
      }
    } else {
      const reachRadicand = Math.max(0, launchSpeed * launchSpeed - 2 * g * deltaZ);
      const maxReach = launchSpeed / g * Math.sqrt(reachRadicand);
      if (dist > maxReach) {
        dist = maxReach;
        finalTargetX = startX + dirX * dist;
        finalTargetY = startY + dirY * dist;
      }
    }
    const maxThrowAimDistance = this.maxThrowAimDistanceProp.get(thrower == null ? void 0 : thrower.properties);
    if (maxThrowAimDistance !== void 0 && maxThrowAimDistance > 0 && dist > maxThrowAimDistance) {
      dist = maxThrowAimDistance;
      finalTargetX = startX + dirX * dist;
      finalTargetY = startY + dirY * dist;
    }
    dx = finalTargetX - startX;
    dy = finalTargetY - startY;
    dist = Math.hypot(dx, dy);
    deltaZ = targetSurfaceHeight - startZ;
    const dist3D = Math.sqrt(dist * dist + deltaZ * deltaZ);
    const tOpt = Math.sqrt(2 * dist3D / g);
    const aCoeff = 0.25 * g * g;
    const bCoeffMax = -(launchSpeed * launchSpeed - g * deltaZ);
    const cCoeff = dist * dist + deltaZ * deltaZ;
    const discMax = Math.max(0, bCoeffMax * bCoeffMax - 4 * aCoeff * cCoeff);
    const uLow = (-bCoeffMax - Math.sqrt(discMax)) / (2 * aCoeff);
    const tFlat = uLow > 0 ? Math.sqrt(uLow) : dist / launchSpeed;
    const uHigh = (-bCoeffMax + Math.sqrt(discMax)) / (2 * aCoeff);
    const tHigh = uHigh > 0 ? Math.sqrt(uHigh) : tFlat;
    const tMin = Math.max(0.02, tFlat);
    const tMax = Math.max(tMin, tHigh);
    let totalTime = 1;
    if (!this.hasUserSetArcRatio) {
      const optRatio = tMax - tMin > 1e-3 ? Math.max(0, Math.min(1, (tOpt - tMin) / (tMax - tMin))) : 0;
      this.savedArcRatio = optRatio;
      totalTime = Math.max(tMin, Math.min(tMax, tOpt));
    } else {
      totalTime = tMin + this.savedArcRatio * (tMax - tMin);
    }
    if (totalTime <= 0) {
      totalTime = Math.max(0.02, dist / launchSpeed);
    }
    if (deltaZ > 0) {
      totalTime = Math.max(totalTime, Math.sqrt(2 * deltaZ / g));
    }
    totalTime = Math.max(0.02, totalTime);
    const dtFixed = 1 / 60;
    let vz = (deltaZ + 0.5 * g * totalTime * (totalTime + dtFixed)) / totalTime;
    const horizontalSpeed = dist / totalTime;
    let vx = dirX * horizontalSpeed;
    let vy = dirY * horizontalSpeed;
    const eulerMargin = 0.5 * g * dtFixed + 0.05;
    const computedSpeed = Math.hypot(vx, vy, vz);
    if (computedSpeed > launchSpeed + eulerMargin && computedSpeed > 1e-3) {
      const scale2 = (launchSpeed + eulerMargin) / computedSpeed;
      vx *= scale2;
      vy *= scale2;
      vz *= scale2;
    }
    return {
      vx,
      vy,
      vz,
      totalTime,
      finalTargetX,
      finalTargetY,
      targetSurfaceHeight,
      targetObject: null,
      isAutoLocked: false,
      tMin,
      tMax,
      tOpt
    };
  }
  /**
   * Pre-calculates trajectory points for real-time visualization overlay
   */
  calculateTrajectory(character, aimTargetX, aimTargetY, arena2, _entities, hoverScale, _autoLock = false, lockedTargetPos, aimLockDelta = 0) {
    if (!this.enabled || !character.heldObject) return null;
    const held = character.heldObject;
    const scale = hoverScale !== void 0 ? hoverScale : arena2.visualAltitudeScale ?? 0.5;
    const targetAimX = lockedTargetPos ? lockedTargetPos.x : aimTargetX;
    const targetAimY = lockedTargetPos ? lockedTargetPos.y : aimTargetY;
    const charAimDx = targetAimX - character.position.x;
    const charAimDy = targetAimY - character.position.y;
    if (Math.hypot(charAimDx, charAimDy) > 0.05) {
      character.facingAngle = Math.atan2(charAimDy, charAimDx);
      const alignedHeldPos = character.calculateHeldObjectPosition(arena2);
      held.position.x = alignedHeldPos.x;
      held.position.y = alignedHeldPos.y;
      held.position.z = alignedHeldPos.z;
    }
    let startX = held.position.x;
    let startY = held.position.y;
    let startZ = held.position.z;
    if (character.position.z < arena2.wallHeight) {
      const clamped = ThrowModule.clampStartOutsideWalls(
        startX,
        startY,
        held.colliderRadius,
        arena2,
        character.position.z,
        character.position.x,
        character.position.y
      );
      startX = clamped.x;
      startY = clamped.y;
    }
    let maxSpeed = this.calculateMaxLaunchSpeed(character, held);
    const canFlyVertically = held.hasGravity && held.hasVerticalVelocity;
    if (this.consumesEnergy) {
      const ep = character.energyPool;
      if (ep && ep.enabled) {
        if (ep.isExhausted) return null;
        const poolJoules = ep.infiniteEnergy ? Infinity : ep.getCurrentEnergy(character.properties);
        const currentStamina = ep.currentStaminaProp.get(character.properties);
        const throwCap = this.maxPowerProp.get(character.properties);
        if (currentStamina < 0.5 || poolJoules < 0.5) return null;
        const strength = character.strength ?? 1;
        const maxDeliverableMetabolicJoules = Math.min(
          throwCap * strength,
          currentStamina,
          poolJoules
        );
        const busEfficiency = Math.max(0.01, ep.getMuscleEfficiency(character.properties));
        const maxAffordableMechWork = maxDeliverableMetabolicJoules * busEfficiency;
        const heldMass = held.hasMass ? Math.max(0.1, held.mass) : 1;
        const maxSpeedFromEnergy = Math.sqrt(2 * maxAffordableMechWork / heldMass);
        if (maxSpeedFromEnergy < 0.2) return null;
        maxSpeed = Math.min(maxSpeed, maxSpeedFromEnergy);
      }
    }
    const launch = this.computeLaunchVelocity(
      startX,
      startY,
      startZ,
      targetAimX,
      targetAimY,
      arena2,
      maxSpeed,
      held.hasGravity,
      held.hasVerticalVelocity,
      held.colliderRadius,
      void 0,
      _entities,
      scale,
      character,
      held,
      _autoLock,
      lockedTargetPos,
      aimLockDelta
    );
    if (!launch) return null;
    let { vx, vy, vz, totalTime, finalTargetX, finalTargetY, targetSurfaceHeight, tMin, tMax } = launch;
    if (this.consumesEnergy) {
      const ep = character.energyPool;
      if (ep && ep.enabled) {
        const heldMass = held.hasMass ? Math.max(0.1, held.mass) : 1;
        const poolEfficiency = Math.max(0.01, ep.getMuscleEfficiency(character.properties));
        const poolJoules = ep.infiniteEnergy ? Infinity : ep.getCurrentEnergy(character.properties);
        const currentStamina = ep.currentStaminaProp.get(character.properties);
        const throwCap = this.maxPowerProp.get(character.properties);
        const strength = character.strength ?? 1;
        const maxDeliverableMetabolicJoules = Math.min(
          throwCap * strength,
          currentStamina,
          poolJoules
        );
        const eulerMargin = 0.5 * arena2.gravity * (1 / 60) + 0.05;
        let actualLaunchSpeed = Math.hypot(vx, vy, vz);
        if (actualLaunchSpeed > maxSpeed + eulerMargin && actualLaunchSpeed > 1e-3) {
          const scale2 = (maxSpeed + eulerMargin) / actualLaunchSpeed;
          vx *= scale2;
          vy *= scale2;
          vz *= scale2;
          actualLaunchSpeed = Math.hypot(vx, vy, vz);
        }
        const mechWorkJoules = 0.5 * heldMass * (actualLaunchSpeed * actualLaunchSpeed);
        const metabolicJoules = Math.min(maxDeliverableMetabolicJoules, Math.max(0.1, mechWorkJoules / poolEfficiency));
        if (!ep.canSatisfyFullEnergy(metabolicJoules, 0.08, character.properties)) {
          return null;
        }
      }
    }
    const resolvedSurfaceHeight = targetSurfaceHeight;
    const deltaZ = targetSurfaceHeight - startZ;
    const g = arena2.gravity;
    const dx = finalTargetX - startX;
    const dy = finalTargetY - startY;
    const dist = Math.hypot(dx, dy);
    const dirX = dist > 1e-4 ? dx / dist : 0;
    const dirY = dist > 1e-4 ? dy / dist : 0;
    const steps = 90;
    const dtStep = totalTime / steps;
    const points = [];
    let isBlocked = false;
    let isLandingOnWallTop = resolvedSurfaceHeight > 0;
    let blockedWallId;
    let peakHeight = startZ;
    for (let step = 0; step <= steps; step++) {
      const t = step * dtStep;
      const currentX = step === steps ? finalTargetX : startX + vx * t;
      const currentY = step === steps ? finalTargetY : startY + vy * t;
      const dtFixed = 1 / 60;
      const calculatedZ = canFlyVertically ? startZ + (vz - 0.5 * arena2.gravity * dtFixed) * t - 0.5 * arena2.gravity * t * t : startZ;
      const currentZ = canFlyVertically ? step === steps ? resolvedSurfaceHeight : step > steps - 3 ? Math.max(resolvedSurfaceHeight, calculatedZ) : Math.max(0, calculatedZ) : startZ;
      const currentVz = canFlyVertically ? vz - 0.5 * arena2.gravity * dtFixed - arena2.gravity * t : 0;
      if (currentZ > peakHeight) {
        peakHeight = currentZ;
      }
      const couldClearWall = currentZ > arena2.wallHeight;
      let isOverWall = false;
      let collidesWall = false;
      for (const wall of arena2.walls) {
        if (ThrowModule.testWallIntersection(currentX, currentY, held.colliderRadius, wall)) {
          isOverWall = true;
          if (currentZ <= wall.wallHeight + 1e-3) {
            const wasAbove = points.length > 0 && points[points.length - 1].z >= wall.wallHeight - 0.05;
            if (wasAbove && currentVz <= 0) {
              const isTargetedWall = targetSurfaceHeight > 0 && ThrowModule.testWallIntersection(finalTargetX, finalTargetY, held.colliderRadius + 0.05, wall);
              if (isTargetedWall || targetSurfaceHeight > 0 && step >= steps - 3) {
                isLandingOnWallTop = true;
                break;
              } else if (targetSurfaceHeight === 0) {
                isLandingOnWallTop = true;
                collidesWall = true;
                isBlocked = true;
                blockedWallId = wall.id;
                break;
              }
            } else if (currentZ < wall.wallHeight - 0.05) {
              const isGroundTouchdown = targetSurfaceHeight === 0 && step >= steps - 2 && currentZ <= 0.08;
              if (step > 1 && !isGroundTouchdown) {
                collidesWall = true;
                isBlocked = true;
                blockedWallId = wall.id;
                break;
              }
            }
          }
        }
      }
      points.push({
        x: currentX,
        y: currentY,
        z: currentZ,
        t,
        couldClearWall,
        isOverWall,
        collidesWall
      });
      if (collidesWall) {
        break;
      }
    }
    const simulateGhostArc = (simFlightTime) => {
      const gTime = Math.max(0.02, simFlightTime);
      const dtFixed = 1 / 60;
      const gVz = (deltaZ + 0.5 * g * gTime * (gTime + dtFixed)) / gTime;
      const gHSpd = dist / gTime;
      const gVx = dirX * gHSpd;
      const gVy = dirY * gHSpd;
      const gSteps = 60;
      const gDt = gTime / gSteps;
      const gPts = [];
      for (let s = 0; s <= gSteps; s++) {
        const t = s * gDt;
        const curX = s === gSteps ? finalTargetX : startX + gVx * t;
        const curY = s === gSteps ? finalTargetY : startY + gVy * t;
        const calcZ = canFlyVertically ? startZ + (gVz - 0.5 * arena2.gravity * dtFixed) * t - 0.5 * arena2.gravity * t * t : startZ;
        const curZ = canFlyVertically ? s === gSteps ? resolvedSurfaceHeight : s > gSteps - 3 ? Math.max(resolvedSurfaceHeight, calcZ) : Math.max(0, calcZ) : startZ;
        let isOver = false;
        let collides = false;
        for (const wall of arena2.walls) {
          if (ThrowModule.testWallIntersection(curX, curY, held.colliderRadius, wall)) {
            isOver = true;
            if (curZ <= wall.wallHeight + 1e-3 && s > 1) {
              collides = true;
              break;
            }
          }
        }
        gPts.push({
          x: curX,
          y: curY,
          z: curZ,
          t,
          couldClearWall: curZ > arena2.wallHeight,
          isOverWall: isOver,
          collidesWall: collides
        });
        if (collides) break;
      }
      return gPts;
    };
    const hasArcRange = tMax !== void 0 && tMin !== void 0 && tMax - tMin > 0.05;
    const flattestPoints = hasArcRange && tMin !== void 0 ? simulateGhostArc(tMin) : void 0;
    const steepestPoints = hasArcRange && tMax !== void 0 ? simulateGhostArc(tMax) : void 0;
    const lastPoint = points[points.length - 1];
    return {
      points,
      flattestPoints,
      steepestPoints,
      landPoint: {
        x: isBlocked ? lastPoint.x : finalTargetX,
        y: isBlocked ? lastPoint.y : finalTargetY,
        z: isBlocked ? lastPoint.z : targetSurfaceHeight
      },
      isBlockedByWall: isBlocked,
      isLandingOnWallTop: isBlocked ? isLandingOnWallTop : targetSurfaceHeight > 0,
      blockedAtWallId: blockedWallId,
      targetObject: null,
      targetSurfaceHeight,
      isAutoLocked: false,
      peakHeight,
      flightTime: totalTime,
      colliderRadius: held.colliderRadius,
      visualShape: held.visualShape,
      launchVel: { vx, vy, vz },
      launchPos: { x: startX, y: startY, z: startZ },
      lockedTargetPos: lockedTargetPos ? { ...lockedTargetPos } : null
    };
  }
  /**
   * Executes the throw of the held object using the exact same launch parameters
   */
  throwHeldObject(character, aimTargetX, aimTargetY, arena2, entities, hoverScale, autoLock = false, launchVel, launchPos) {
    if (!this.enabled || !character.heldObject) return null;
    const held = character.heldObject;
    let targetAimX = aimTargetX;
    let targetAimY = aimTargetY;
    if (!launchPos) {
      const aimDx2 = targetAimX - character.position.x;
      const aimDy2 = targetAimY - character.position.y;
      if (Math.hypot(aimDx2, aimDy2) > 0.05) {
        character.facingAngle = Math.atan2(aimDy2, aimDx2);
        const alignedHeldPos = character.calculateHeldObjectPosition(arena2);
        held.position.x = alignedHeldPos.x;
        held.position.y = alignedHeldPos.y;
        held.position.z = alignedHeldPos.z;
      }
    }
    let startX = launchPos ? launchPos.x : held.position.x;
    let startY = launchPos ? launchPos.y : held.position.y;
    let startZ = launchPos ? launchPos.z : held.position.z;
    if (!launchPos && character.position.z < arena2.wallHeight) {
      const clamped = ThrowModule.clampStartOutsideWalls(
        startX,
        startY,
        held.colliderRadius,
        arena2,
        character.position.z,
        character.position.x,
        character.position.y
      );
      startX = clamped.x;
      startY = clamped.y;
    }
    const candidateEntities = entities ?? arena2.entities;
    const scale = hoverScale !== void 0 ? hoverScale : arena2.visualAltitudeScale ?? 0.5;
    const charVel = {
      x: character.velocity.x,
      y: character.velocity.y,
      z: character.isAboveGround ? character.verticalVelocity : 0
    };
    let maxSpeed = this.calculateMaxLaunchSpeed(character, held);
    const canFlyVertically = held.hasGravity && held.hasVerticalVelocity;
    if (this.consumesEnergy && !launchVel) {
      const pool = character.energyPool;
      if (pool && pool.enabled) {
        if (pool.isExhausted) return null;
        const poolJoules = pool.infiniteEnergy ? Infinity : pool.getCurrentEnergy(character.properties);
        const currentStamina = pool.getCurrentStamina(character.properties);
        const throwCap = this.maxPowerProp.get(character.properties);
        if (currentStamina < 0.5 || poolJoules < 0.5) return null;
        const strength = character.strength ?? 1;
        const maxDeliverableMetabolicJoules = Math.min(
          throwCap * strength,
          currentStamina,
          poolJoules
        );
        const poolEfficiency = Math.max(0.01, pool.getMuscleEfficiency(character.properties));
        const maxAffordableMechWork = maxDeliverableMetabolicJoules * poolEfficiency;
        const heldMass = held.hasMass ? Math.max(0.1, held.mass) : 1;
        const maxSpeedFromEnergy = Math.sqrt(2 * maxAffordableMechWork / heldMass);
        if (maxSpeedFromEnergy < 0.2) return null;
        maxSpeed = Math.min(maxSpeed, maxSpeedFromEnergy);
      }
    }
    const aimDx = targetAimX - startX;
    const aimDy = targetAimY - startY;
    const aimDist = Math.hypot(aimDx, aimDy);
    let effectiveAimX = targetAimX;
    let effectiveAimY = targetAimY;
    if (!launchVel && aimDist > 0.05 && canFlyVertically) {
      const g = arena2.gravity;
      const maxReach = maxSpeed / g * Math.sqrt(maxSpeed * maxSpeed + 2 * g * Math.max(0, startZ));
      if (aimDist > maxReach) {
        const clampedDist = Math.max(0.1, maxReach);
        effectiveAimX = startX + aimDx / aimDist * clampedDist;
        effectiveAimY = startY + aimDy / aimDist * clampedDist;
      }
    }
    let launch = launchVel ? {
      vx: launchVel.vx,
      vy: launchVel.vy,
      vz: launchVel.vz
    } : this.computeLaunchVelocity(
      startX,
      startY,
      startZ,
      effectiveAimX,
      effectiveAimY,
      arena2,
      maxSpeed,
      held.hasGravity,
      held.hasVerticalVelocity,
      held.colliderRadius,
      charVel,
      candidateEntities,
      scale,
      character,
      held,
      autoLock
    );
    if (!launch) return null;
    if (this.consumesEnergy) {
      const pool = character.energyPool;
      if (pool && pool.enabled) {
        if (pool.isExhausted) {
          return null;
        }
        const throwCap = this.maxPowerProp.get(character.properties);
        const currentStamina = pool.getCurrentStamina(character.properties);
        const poolEnergy = pool.infiniteEnergy ? Infinity : pool.getCurrentEnergy(character.properties);
        const maxDeliverableMetabolicJoules = Math.min(
          throwCap * (character.strength ?? 1),
          currentStamina,
          poolEnergy
        );
        if (maxDeliverableMetabolicJoules <= 1e-3) {
          return null;
        }
        const heldMass = held.hasMass ? Math.max(0.1, held.mass) : 1;
        const poolEfficiency = Math.max(0.01, pool.getMuscleEfficiency(character.properties));
        let actualLaunchSpeed = Math.hypot(launch.vx, launch.vy, launch.vz);
        let mechWorkJoules = 0.5 * heldMass * (actualLaunchSpeed * actualLaunchSpeed);
        let metabolicJoules = Math.min(maxDeliverableMetabolicJoules, Math.max(0.1, mechWorkJoules / poolEfficiency));
        const eulerMargin = 0.5 * arena2.gravity * (1 / 60) + 0.05;
        if (actualLaunchSpeed > maxSpeed + eulerMargin && actualLaunchSpeed > 1e-3) {
          const scale2 = (maxSpeed + eulerMargin) / actualLaunchSpeed;
          launch.vx *= scale2;
          launch.vy *= scale2;
          launch.vz *= scale2;
          actualLaunchSpeed = Math.hypot(launch.vx, launch.vy, launch.vz);
          mechWorkJoules = 0.5 * heldMass * (actualLaunchSpeed * actualLaunchSpeed);
          metabolicJoules = Math.min(maxDeliverableMetabolicJoules, Math.max(0.1, mechWorkJoules / poolEfficiency));
        }
        if (!pool.canSatisfyFullEnergy(metabolicJoules, 0.08, character.properties)) {
          return null;
        }
        const burstRes = pool.requestInstantBurst({
          abilityId: "throw",
          demandedJoules: metabolicJoules,
          allowPartialPower: false,
          registry: character.properties
        });
        if (!burstRes.granted || burstRes.fraction < 1) {
          return null;
        }
      }
    }
    if (Math.hypot(launch.vx, launch.vy) > 0.05) {
      character.facingAngle = Math.atan2(launch.vy, launch.vx);
    }
    if (!launchPos) {
      const heldPos = character.calculateHeldObjectPosition(arena2);
      startX = heldPos.x;
      startY = heldPos.y;
      startZ = heldPos.z;
    }
    held.isHeld = false;
    held.heldBy = null;
    held.lastThrower = character;
    held.originalThrower = character;
    held.isInFlight = true;
    held.wakeUp();
    held.position.x = startX;
    held.position.y = startY;
    held.velocity.x = launch.vx;
    held.velocity.y = launch.vy;
    held.verticalVelocity = launch.vz;
    held.position.z = held.hasVerticalPosition ? Math.max(startZ, held.position.z) : 0;
    if (held.hasFriction && held.rollModule && held.rollModule.enabled) {
      const R = held.colliderRadius > 0 ? held.colliderRadius : 0.3;
      held.rollModule.angularVelocity.y = launch.vx / R;
      held.rollModule.angularVelocity.x = -launch.vy / R;
    }
    const carriedMass = held.hasMass ? held.mass : 0;
    const charBaseMass = character.hasMass ? Math.max(0.2, character.baseMass) : 0;
    const recoilRatio = carriedMass > 0 && charBaseMass > 0 ? carriedMass / charBaseMass : 0;
    character.heldObject = null;
    const deltaVx = launch.vx - character.velocity.x;
    const deltaVy = launch.vy - character.velocity.y;
    character.velocity.x -= deltaVx * recoilRatio;
    character.velocity.y -= deltaVy * recoilRatio;
    if (character.isAboveGround && held.hasVerticalVelocity) {
      const deltaVz = launch.vz - character.verticalVelocity;
      character.verticalVelocity -= deltaVz * recoilRatio;
    }
    return held;
  }
}
class JumpModule {
  constructor(options) {
    __publicField(this, "id", "jump");
    __publicField(this, "name", "Jump Ability");
    __publicField(this, "enabled", true);
    /**
     * Jump strength (impulse in N·s).
     */
    __publicField(this, "jumpStrengthProp");
    /**
     * Maximum initial takeoff speed cap (in units per second).
     */
    __publicField(this, "maxInitialSpeedProp");
    this.jumpStrengthProp = new DynamicProperty((options == null ? void 0 : options.jumpStrength) ?? 18.5);
    this.maxInitialSpeedProp = new DynamicProperty((options == null ? void 0 : options.maxInitialSpeed) ?? 9.67);
    if ((options == null ? void 0 : options.enabled) !== void 0) this.enabled = options.enabled;
  }
  get jumpStrength() {
    return this.jumpStrengthProp.literalValue;
  }
  set jumpStrength(val) {
    this.jumpStrengthProp.literalValue = val;
  }
  get maxInitialSpeed() {
    return this.maxInitialSpeedProp.literalValue;
  }
  set maxInitialSpeed(val) {
    this.maxInitialSpeedProp.literalValue = val;
  }
  getJumpStrength(registry) {
    return this.jumpStrengthProp.get(registry);
  }
  getMaxInitialSpeed(registry) {
    return this.maxInitialSpeedProp.get(registry);
  }
  /**
   * Attempts to jump from the current supporting surface (ground or wall top).
   * Returns true if jump was initiated, false otherwise.
   */
  jump(character, _arena, _movementInput) {
    if (!this.enabled || !character.hasVerticalPosition) return false;
    if (character.isHeld) return false;
    const surfaceZ = character.supportingSurfaceHeight ?? 0;
    const isGrounded = character.isRestingOnSurface || Math.abs(character.position.z - surfaceZ) <= 0.08 && Math.abs(character.verticalVelocity) <= 0.8;
    if (!isGrounded) {
      return false;
    }
    const totalMass = Math.max(0.2, character.mass);
    const jumpStrength = this.jumpStrengthProp.get(character.properties);
    const maxInitialSpeed = this.maxInitialSpeedProp.get(character.properties);
    const takeoffSpeed = Math.min(maxInitialSpeed, jumpStrength / totalMass);
    if (takeoffSpeed <= 0.01) return false;
    character.verticalVelocity = takeoffSpeed;
    character.position.z = Math.max(character.position.z, surfaceZ + 0.02);
    if (character.standingWall) {
      character.standingWall = null;
    }
    if (character.wallEdgeAssistModule) {
      character.wallEdgeAssistModule.isAssistClampArmed = false;
      character.wallEdgeAssistModule.hasLeftClampZoneSinceDismount = true;
    }
    return true;
  }
}
class WallEdgeAssistModule {
  constructor(options) {
    __publicField(this, "id", "wallEdgeAssist");
    __publicField(this, "name", "Wall Edge Assist");
    __publicField(this, "enabled", true);
    /**
     * Whether to prevent walking off elevated walls when walking on wall tops.
     */
    __publicField(this, "preventWalkOff", false);
    /**
     * Maximum distance the character is allowed to hang off of elevated walls
     * before the ledge guard clamps movement (in units).
     */
    __publicField(this, "hangDistanceProp");
    /** Whether the assist clamp (ledge guard) is currently active/armed */
    __publicField(this, "isAssistClampArmed", false);
    /** Tracks whether character has moved onto the wall top platform after mounting */
    __publicField(this, "hasMovedOntoWall", false);
    /** Tracks if character has moved outside the clamp zone (> 0.1u) after dismounting */
    __publicField(this, "hasLeftClampZoneSinceDismount", true);
    __publicField(this, "mountStartX", 0);
    __publicField(this, "mountStartY", 0);
    if ((options == null ? void 0 : options.preventWalkOff) !== void 0) this.preventWalkOff = options.preventWalkOff;
    this.hangDistanceProp = new DynamicProperty((options == null ? void 0 : options.hangDistance) ?? 0.1);
    if ((options == null ? void 0 : options.enabled) !== void 0) this.enabled = options.enabled;
  }
  get hangDistance() {
    return this.hangDistanceProp.literalValue;
  }
  set hangDistance(val) {
    this.hangDistanceProp.literalValue = val;
  }
  getHangDistance(registry) {
    return this.hangDistanceProp.get(registry);
  }
}
class HealthModule {
  constructor(options) {
    __publicField(this, "id", "health");
    __publicField(this, "name", "Health & Vitality");
    __publicField(this, "enabled", true);
    /**
     * When true (on remote player ghosts and online combat dummies), HP changes are
     * driven strictly by authoritative server snapshots so local predicted impacts or
     * local regen ticks never fight with trailing server snapshots and cause health bar jitter.
     */
    __publicField(this, "isServerAuthoritativeOnly", false);
    /** Timestamp (performance.now()) when this entity last took damage locally */
    __publicField(this, "lastDamageTime", 0);
    /** Active health modifiers (continuous DOT/HOT and instant bursts) */
    __publicField(this, "_activeModifiers", /* @__PURE__ */ new Map());
    __publicField(this, "_nextModifierOrder", 1);
    __publicField(this, "_currentTick", 0);
    /** Baseline max health value */
    __publicField(this, "baseMaxHp");
    /** Effective maximum health (can be modified by buffs/debuffs) */
    __publicField(this, "maxHpProp");
    /** Current live HP */
    __publicField(this, "currentHpProp");
    /** Baseline max heal rate (HP / second) */
    __publicField(this, "baseMaxHealRate");
    /** Effective max heal rate (HP / second) */
    __publicField(this, "maxHealRateProp");
    /** Biological healing metabolic cost: how many Joules of energy each 1 HP costs */
    __publicField(this, "joulesPerHpProp");
    /** Toggle indicating whether healing draws energy from EnergyPool */
    __publicField(this, "consumesEnergy", false);
    /** Whether healing is allowed to run when pool power cannot provide 100% full wattage */
    __publicField(this, "allowPartialPower", true);
    // Behavior-driven maximum healing power capacity (Watts)
    __publicField(this, "maxPowerProp");
    /** Optional callback invoked when entity dies and respawns */
    __publicField(this, "onDeathRespawn");
    this.baseMaxHp = (options == null ? void 0 : options.baseMaxHp) ?? 100;
    const initialMaxHp = (options == null ? void 0 : options.maxHp) ?? this.baseMaxHp;
    this.maxHpProp = new DynamicProperty(initialMaxHp);
    this.currentHpProp = new DynamicProperty((options == null ? void 0 : options.currentHp) ?? initialMaxHp);
    this.baseMaxHealRate = (options == null ? void 0 : options.baseMaxHealRate) ?? 5;
    this.maxHealRateProp = new DynamicProperty((options == null ? void 0 : options.maxHealRate) ?? this.baseMaxHealRate);
    let initialJoulesPerHp = 25;
    if ((options == null ? void 0 : options.joulesPerHp) !== void 0) {
      initialJoulesPerHp = options.joulesPerHp;
    } else if ((options == null ? void 0 : options.hpPerJoule) !== void 0) {
      initialJoulesPerHp = options.hpPerJoule < 1 ? 1 / Math.max(1e-4, options.hpPerJoule) : options.hpPerJoule;
    }
    this.joulesPerHpProp = new DynamicProperty(initialJoulesPerHp);
    this.maxPowerProp = new DynamicProperty((options == null ? void 0 : options.maxPower) ?? 300);
    if ((options == null ? void 0 : options.consumesEnergy) !== void 0) this.consumesEnergy = options.consumesEnergy;
    if ((options == null ? void 0 : options.allowPartialPower) !== void 0) this.allowPartialPower = options.allowPartialPower;
    if ((options == null ? void 0 : options.enabled) !== void 0) this.enabled = options.enabled;
  }
  /** Alias for backwards compatibility */
  get hpPerJouleProp() {
    return this.joulesPerHpProp;
  }
  set hpPerJouleProp(prop) {
    this.joulesPerHpProp = prop;
  }
  get maxPower() {
    return this.maxPowerProp.literalValue;
  }
  set maxPower(val) {
    this.maxPowerProp.literalValue = val;
  }
  getMaxPower(registry) {
    return this.maxPowerProp.get(registry);
  }
  get maxHp() {
    return this.maxHpProp.literalValue;
  }
  set maxHp(val) {
    this.maxHpProp.literalValue = Math.max(1, val);
  }
  get currentHp() {
    return this.currentHpProp.literalValue;
  }
  set currentHp(val) {
    this.currentHpProp.literalValue = Math.max(0, Math.min(this.maxHp, val));
  }
  get maxHealRate() {
    return this.maxHealRateProp.literalValue;
  }
  set maxHealRate(val) {
    this.maxHealRateProp.literalValue = Math.max(0, val);
  }
  get joulesPerHp() {
    return this.joulesPerHpProp.literalValue;
  }
  set joulesPerHp(val) {
    this.joulesPerHpProp.literalValue = Math.max(1e-4, val);
  }
  getJoulesPerHp(registry) {
    return Math.max(1e-4, this.joulesPerHpProp.get(registry));
  }
  get hpPerJoule() {
    return this.joulesPerHpProp.literalValue;
  }
  set hpPerJoule(val) {
    this.joulesPerHpProp.literalValue = Math.max(1e-4, val);
  }
  getHpPerJoule(registry) {
    return this.getJoulesPerHp(registry);
  }
  getMaxHp(registry) {
    return this.maxHpProp.get(registry);
  }
  getCurrentHp(registry) {
    return this.currentHpProp.get(registry);
  }
  getMaxHealRate(registry) {
    return this.maxHealRateProp.get(registry);
  }
  getActiveModifiers(_registry) {
    return Array.from(this._activeModifiers.values());
  }
  registerContinuousModifier(source) {
    const existing = this._activeModifiers.get(source.id);
    if (!existing) {
      this._activeModifiers.set(source.id, {
        id: source.id,
        name: source.name,
        color: source.color ?? (source.isHeal ? "#22c55e" : "#ef4444"),
        type: "continuous",
        isHeal: source.isHeal ?? false,
        order: this._nextModifierOrder++,
        rateOrAmount: source.rate ?? 0,
        lastReportedTick: this._currentTick
      });
    } else {
      existing.rateOrAmount = source.rate ?? existing.rateOrAmount;
      existing.lastReportedTick = this._currentTick;
      if (source.name) existing.name = source.name;
      if (source.color) existing.color = source.color;
    }
  }
  registerInstantModifier(source, amount) {
    const existing = this._activeModifiers.get(source.id);
    if (!existing) {
      this._activeModifiers.set(source.id, {
        id: source.id,
        name: source.name,
        color: source.color ?? (source.isHeal ? "#22c55e" : "#f87171"),
        type: "instant",
        isHeal: source.isHeal ?? false,
        order: this._nextModifierOrder++,
        rateOrAmount: amount,
        duration: 0.75,
        lastReportedTick: this._currentTick
      });
    } else {
      existing.rateOrAmount = amount;
      existing.duration = 0.75;
      existing.lastReportedTick = this._currentTick;
    }
  }
  takeDamage(amount, registry, source) {
    if (!this.enabled || amount <= 0) return;
    if (this.isServerAuthoritativeOnly && !(source == null ? void 0 : source.fromServer)) return;
    this.lastDamageTime = performance.now();
    const cur = this.getCurrentHp(registry);
    const updated = Math.max(0, cur - amount);
    this.currentHpProp.set(updated, registry);
    if (source && source.type === "continuous") {
      this.registerContinuousModifier({
        id: source.id,
        name: source.name,
        color: source.color ?? "#a855f7",
        type: "continuous",
        isHeal: false,
        rate: source.rate ?? amount * 60
      });
    } else {
      this.registerInstantModifier({
        id: (source == null ? void 0 : source.id) ?? "collision_damage",
        name: (source == null ? void 0 : source.name) ?? "Collision",
        color: (source == null ? void 0 : source.color) ?? "#f87171",
        type: "instant",
        isHeal: false
      }, (source == null ? void 0 : source.amount) ?? amount);
    }
  }
  heal(amount, registry, source) {
    if (!this.enabled || amount <= 0) return;
    if (this.isServerAuthoritativeOnly && !(source == null ? void 0 : source.fromServer)) return;
    const cur = this.getCurrentHp(registry);
    const max = this.getMaxHp(registry);
    const updated = Math.min(max, cur + amount);
    this.currentHpProp.set(updated, registry);
    if (source && source.type === "continuous") {
      this.registerContinuousModifier({
        id: source.id,
        name: source.name,
        color: source.color ?? "#22c55e",
        type: "continuous",
        isHeal: true,
        rate: source.rate ?? amount * 60
      });
    } else {
      this.registerInstantModifier({
        id: (source == null ? void 0 : source.id) ?? "heal",
        name: (source == null ? void 0 : source.name) ?? "Heal",
        color: (source == null ? void 0 : source.color) ?? "#22c55e",
        type: "instant",
        isHeal: true
      }, (source == null ? void 0 : source.amount) ?? amount);
    }
  }
  /**
   * Resets health state back to full health and clears active modifiers.
   */
  reset(registry) {
    const max = this.getMaxHp(registry);
    this.currentHpProp.set(max, registry);
    this._activeModifiers.clear();
  }
  /**
   * Continuous per-frame health tick:
   * Heals current HP up to maxHp at maxHealRate * dt.
   * If HP drops to 0 or below, triggers character death and respawn.
   */
  update(dt, character, arena2) {
    if (!this.enabled) return;
    const isOnline = character._isInOnlineMode === true;
    if (!isOnline && !character.isRemotePlayer) {
      this.isServerAuthoritativeOnly = false;
    }
    const registry = character.properties;
    const current = this.getCurrentHp(registry);
    const max = this.getMaxHp(registry);
    let activeHealRate = 0;
    if (current > 0 && current < max - 1e-3) {
      const healRate = this.getMaxHealRate(registry);
      if (healRate > 0) {
        let effectiveHealRate = healRate;
        if (this.consumesEnergy && !this.isServerAuthoritativeOnly) {
          const pool = character.energyPool;
          if (pool) {
            const joulesPerHp = this.getJoulesPerHp(registry);
            const rawPowerWatts = healRate * Math.max(1e-4, joulesPerHp);
            const maxPower = this.maxPowerProp.get(registry);
            let powerWatts = rawPowerWatts;
            if (powerWatts > maxPower) {
              if (!this.allowPartialPower) {
                effectiveHealRate = 0;
                powerWatts = 0;
              } else {
                powerWatts = maxPower;
              }
            }
            if (powerWatts > 0) {
              const granted = pool.requestPower(powerWatts, dt, registry, false, "health_regen", this.allowPartialPower);
              if (granted <= 0) {
                effectiveHealRate = 0;
              } else {
                effectiveHealRate = healRate * Math.min(1, granted / rawPowerWatts);
              }
            }
          }
        }
        if (effectiveHealRate > 0) {
          activeHealRate = effectiveHealRate;
          if (!this.isServerAuthoritativeOnly) {
            const nextHp = Math.min(max, current + effectiveHealRate * dt);
            if (nextHp >= max - 1e-3) {
              this.currentHpProp.set(max, registry);
            } else {
              this.currentHpProp.set(nextHp, registry);
            }
          }
        }
      }
    } else if (!this.isServerAuthoritativeOnly && current >= max - 1e-3 && current !== max) {
      this.currentHpProp.set(max, registry);
    }
    if (activeHealRate > 1e-3) {
      this.registerContinuousModifier({
        id: "passive_heal",
        name: "Heal",
        color: "#22c55e",
        type: "continuous",
        isHeal: true,
        rate: activeHealRate
      });
    } else {
      this._activeModifiers.delete("passive_heal");
    }
    for (const [id, mod] of this._activeModifiers.entries()) {
      if (mod.type === "continuous") {
        if (mod.lastReportedTick !== this._currentTick) {
          this._activeModifiers.delete(id);
        }
      } else if (mod.type === "instant") {
        if (mod.duration !== void 0) {
          mod.duration -= dt;
          if (mod.duration <= 0) {
            this._activeModifiers.delete(id);
          }
        }
      }
    }
    this._currentTick++;
    if (this.getCurrentHp(registry) <= 1e-4) {
      if (isOnline) {
        if (character.heldObject) {
          const dropPos = arena2 ? character.calculateHeldObjectPosition(arena2) : { ...character.position };
          character.heldObject.position.x = dropPos.x;
          character.heldObject.position.y = dropPos.y;
          character.heldObject.position.z = dropPos.z;
          character.heldObject.velocity.x = 0;
          character.heldObject.velocity.y = 0;
          character.heldObject.verticalVelocity = 0;
          character.heldObject.isHeld = false;
          character.heldObject.heldBy = null;
          character.heldObject = null;
        }
        character.isAwaitingRespawn = true;
        character.hasDiedAwaitingNewPickup = true;
      } else {
        this.dieAndRespawn(character, arena2);
      }
    }
  }
  /**
   * Resets character state on death:
   * Delegates directly to character.dieAndRespawn to restore HP, energy pool, and energy buses.
   */
  dieAndRespawn(character, arena2, explicitPos) {
    character.dieAndRespawn(arena2, explicitPos);
  }
}
/**
 * Authoritative clearing spawn points (West, East, Southwest, Southeast).
 * Open clearings safely away from arena cover walls.
 */
__publicField(HealthModule, "RESPAWN_SPAWNS", [
  { x: 7.5, y: 7.5, z: 0 },
  // Slot 1 (Northwest quadrant)
  { x: 22.5, y: 7.5, z: 0 },
  // Slot 2 (Northeast quadrant)
  { x: 7.5, y: 22.5, z: 0 },
  // Slot 3 (Southwest quadrant)
  { x: 22.5, y: 22.5, z: 0 },
  // Slot 4 (Southeast quadrant)
  { x: 15, y: 7, z: 0 },
  // Slot 5 (North midfield clearing)
  { x: 15, y: 23, z: 0 },
  // Slot 6 (South midfield clearing)
  { x: 7, y: 15, z: 0 },
  // Slot 7 (West midfield clearing)
  { x: 23, y: 15, z: 0 }
  // Slot 8 (East midfield clearing)
]);
class DamageSolverModule {
  // 60ms ~ 3-4 frames
  constructor(options) {
    __publicField(this, "id", "damageSolver");
    __publicField(this, "name", "Damage Solver & Armor");
    __publicField(this, "enabled", true);
    /**
     * Multiplier / susceptibility percentage for blunt physical impacts.
     * 1.0 = 100% normal damage, 0.0 = completely immune, 0.5 = 50% armored resistance.
     */
    __publicField(this, "impactSusceptibilityProp");
    /**
     * Flat amount of HP subtracted from the incoming scaled impact damage before health is lost.
     * Clamps the final HP deduction at 0 (e.g., a threshold of 5.0 HP absorbs the first 5 HP of any impact).
     */
    __publicField(this, "damageThresholdHpProp");
    /**
     * Symmetrical multiplier [0.0, 1.0] for voluntary locomotion (walking/running) impact damage.
     * 0.0 = arcade (voluntary walking into walls or stationary characters inflicts 0 damage on self and other).
     * 1.0 = Newtonian simulation (walking/sprinting into walls or characters deals full physical shock to both).
     * Note: Active threats (airborne projectiles, bodies under knockback) always use 1.0.
     */
    __publicField(this, "selfImpactWeightProp");
    /** Cooldown timer to prevent multi-substep collision spam in a single frame */
    __publicField(this, "lastImpactTime", 0);
    __publicField(this, "impactCooldownMs", 60);
    this.impactSusceptibilityProp = new DynamicProperty((options == null ? void 0 : options.impactSusceptibility) ?? 1);
    const initialThresh = (options == null ? void 0 : options.damageThresholdHp) ?? (options == null ? void 0 : options.minShockThreshold) ?? 5;
    this.damageThresholdHpProp = new DynamicProperty(initialThresh);
    this.selfImpactWeightProp = new DynamicProperty((options == null ? void 0 : options.selfImpactWeight) ?? 0);
    if ((options == null ? void 0 : options.enabled) !== void 0) this.enabled = options.enabled;
  }
  get minShockThresholdProp() {
    return this.damageThresholdHpProp;
  }
  getImpactSusceptibility(registry) {
    return this.impactSusceptibilityProp.get(registry);
  }
  getDamageThresholdHp(registry) {
    return this.damageThresholdHpProp.get(registry);
  }
  getSelfImpactWeight(registry) {
    return this.selfImpactWeightProp.get(registry);
  }
  /** Backwards compatibility alias for getDamageThresholdHp */
  getMinShockThreshold(registry) {
    return this.getDamageThresholdHp(registry);
  }
  /**
   * Evaluates an incoming physical impact shock event against thresholds
   * and deducts damage from the entity's HealthModule.
   *
   * Formula:
   *   baseDamage = absorbedShock * worldCollisionDamageScale * susceptibility
   *   finalDamage = max(0, baseDamage - damageThresholdHp)
   */
  handleImpact(event, entity, healthModule, worldCollisionDamageScale) {
    if (!this.enabled || !healthModule || !healthModule.enabled) return 0;
    const now = performance.now();
    if (now - this.lastImpactTime < this.impactCooldownMs) {
      return 0;
    }
    const registry = entity.properties;
    const susceptibility = this.getImpactSusceptibility(registry);
    if (susceptibility <= 0) return 0;
    const baseDamage = event.absorbedShock * worldCollisionDamageScale * susceptibility;
    if (baseDamage <= 1e-4) return 0;
    const thresholdHp = this.getDamageThresholdHp(registry);
    const finalDamage = Math.max(0, baseDamage - thresholdHp);
    if (finalDamage > 1e-3) {
      this.lastImpactTime = now;
      healthModule.takeDamage(finalDamage, registry, {
        id: "collision_damage",
        name: "Collision",
        type: "instant",
        amount: finalDamage,
        color: "#f87171",
        isHeal: false
      });
      return finalDamage;
    }
    return 0;
  }
}
class CharacterModule {
  constructor(options) {
    __publicField(this, "id", "character");
    __publicField(this, "name", "Character Module");
    __publicField(this, "enabled", true);
    __publicField(this, "role");
    if (options == null ? void 0 : options.role) {
      this.role = options.role;
    } else if (options == null ? void 0 : options.isDummy) {
      this.role = "dummy";
    } else {
      this.role = "local_player";
    }
  }
  get isDummy() {
    return this.role === "dummy";
  }
  set isDummy(val) {
    if (val) {
      this.role = "dummy";
    } else if (this.role === "dummy") {
      this.role = "local_player";
    }
  }
  get isPlayer() {
    return this.role === "local_player" || this.role === "remote_player";
  }
  get isAI() {
    return this.role === "local_ai" || this.role === "remote_ai";
  }
  get isLocal() {
    return this.role === "local_player" || this.role === "local_ai" || this.role === "dummy";
  }
  get isRemote() {
    return this.role === "remote_player" || this.role === "remote_ai";
  }
}
const ABILITY_METADATA = {
  sprint: { name: "Sprint", color: "#6366f1" },
  walk: { name: "Walk", color: "#38bdf8" },
  jump: { name: "Jump", color: "#ec4899" },
  climb: { name: "Climb", color: "#a855f7" },
  health_regen: { name: "Heal", color: "#22c55e" },
  pickup: { name: "Pickup", color: "#14b8a6" },
  throw: { name: "Throw", color: "#f43f5e" },
  instant_burst: { name: "Burst", color: "#ec4899" },
  laser_blast: { name: "Laser", color: "#06b6d4" },
  melee: { name: "Melee", color: "#f97316" }
};
class EnergyPool {
  constructor(options) {
    __publicField(this, "id", "energy_pool");
    __publicField(this, "name", "Energy Pool");
    __publicField(this, "enabled", true);
    // --- Food / Caloric Energy Sockets (Joules) ---
    __publicField(this, "baseMaxEnergyProp");
    __publicField(this, "maxEnergyProp");
    __publicField(this, "currentEnergyProp");
    // --- Stamina Sockets (Joules) ---
    __publicField(this, "baseMaxStaminaProp");
    __publicField(this, "maxStaminaProp");
    __publicField(this, "currentStaminaProp");
    // --- Stamina Recovery Rate (Watts = Joules / sec) ---
    __publicField(this, "staminaRegenRateProp");
    /**
     * Exhaustion threshold ratio: how much of maxStamina must be recovered
     * after hitting 0 before the creature can use energy again (default 0.20 = 20%).
     */
    __publicField(this, "recoveryThresholdRatio", 0.2);
    __publicField(this, "isExhausted", false);
    // Muscle mechanical-to-metabolic efficiency ratio (default 0.25 = 25% efficiency)
    __publicField(this, "muscleEfficiencyProp");
    // Live power telemetry
    __publicField(this, "livePowerDraw", 0);
    __publicField(this, "currentWattageProp");
    __publicField(this, "hadPhysicalExertion", false);
    // Retains peak power spike between render frames to prevent multi-tick fixed timesteps from dropping spikes
    __publicField(this, "recentPeakWattage", 0);
    __publicField(this, "recentPeakHoldTimer", 0);
    // Dynamically tracks whether continuous locomotion is currently sprinting or walking
    __publicField(this, "activeLocomotionId", "sprint");
    /**
     * When enabled, energy & stamina consumption is bypassed (godmode / testing).
     */
    __publicField(this, "infiniteEnergy", false);
    /**
     * When enabled, automatically refills currentEnergy back to maxEnergy immediately upon hitting 0.
     */
    __publicField(this, "debugAutoRefillOnEmpty", false);
    // Retains most recent insufficient energy/stamina denial for HUD alert flash
    __publicField(this, "lastInsufficientAlert", null);
    // Registered ability power demands
    __publicField(this, "_demands", /* @__PURE__ */ new Map());
    __publicField(this, "_totalDemand", 0);
    __publicField(this, "_currentTick", 0);
    __publicField(this, "_nextOrderId", 0);
    // Active color-coded power allocations for visualization and telemetry
    __publicField(this, "_activeAllocations", /* @__PURE__ */ new Map());
    const baseEnergy = (options == null ? void 0 : options.baseMaxEnergy) ?? 1e4;
    const maxEnergy = (options == null ? void 0 : options.maxEnergy) ?? baseEnergy;
    const curEnergy = (options == null ? void 0 : options.currentEnergy) ?? maxEnergy;
    this.baseMaxEnergyProp = new DynamicProperty(baseEnergy);
    this.maxEnergyProp = new DynamicProperty(maxEnergy);
    this.currentEnergyProp = new DynamicProperty(curEnergy);
    const rawStamina = (options == null ? void 0 : options.baseMaxStamina) ?? 5e3;
    const baseStamina = rawStamina <= 60 ? rawStamina * 500 : rawStamina;
    const maxStamina = (options == null ? void 0 : options.maxStamina) ? options.maxStamina <= 60 ? options.maxStamina * 500 : options.maxStamina : baseStamina;
    const curStamina = (options == null ? void 0 : options.currentStamina) !== void 0 ? options.currentStamina <= 60 ? options.currentStamina * 500 : options.currentStamina : maxStamina;
    this.baseMaxStaminaProp = new DynamicProperty(baseStamina);
    this.maxStaminaProp = new DynamicProperty(maxStamina);
    this.currentStaminaProp = new DynamicProperty(curStamina);
    const rawRegen = (options == null ? void 0 : options.staminaRegenRate) ?? 500;
    const regenWatts = rawRegen <= 10 ? rawRegen * 500 : rawRegen;
    this.staminaRegenRateProp = new DynamicProperty(regenWatts);
    if ((options == null ? void 0 : options.recoveryThresholdRatio) !== void 0) {
      this.recoveryThresholdRatio = options.recoveryThresholdRatio;
    }
    this.muscleEfficiencyProp = new DynamicProperty((options == null ? void 0 : options.muscleEfficiency) ?? 0.25);
    this.currentWattageProp = new DynamicProperty(0);
    if ((options == null ? void 0 : options.infiniteEnergy) !== void 0) this.infiniteEnergy = options.infiniteEnergy;
    if ((options == null ? void 0 : options.debugAutoRefillOnEmpty) !== void 0) this.debugAutoRefillOnEmpty = options.debugAutoRefillOnEmpty;
    if ((options == null ? void 0 : options.enabled) !== void 0) this.enabled = options.enabled;
  }
  // --- Caloric Energy Getters & Setters ---
  getBaseMaxEnergy(registry) {
    return this.baseMaxEnergyProp.get(registry);
  }
  getMaxEnergy(registry) {
    return this.maxEnergyProp.get(registry);
  }
  getCurrentEnergy(registry) {
    return this.currentEnergyProp.get(registry);
  }
  setCurrentEnergy(val, registry) {
    const max = this.getMaxEnergy(registry);
    const clamped = Math.max(0, Math.min(max, val));
    this.currentEnergyProp.set(clamped, registry);
  }
  // --- Stamina Getters & Setters ---
  getBaseMaxStamina(registry) {
    return this.baseMaxStaminaProp.get(registry);
  }
  getMaxStamina(registry) {
    return this.maxStaminaProp.get(registry);
  }
  get currentStamina() {
    return this.currentStaminaProp.literalValue;
  }
  set currentStamina(val) {
    this.currentStaminaProp.literalValue = Math.max(0, val);
  }
  getCurrentStamina(registry) {
    return this.currentStaminaProp.get(registry);
  }
  setCurrentStamina(val, registry) {
    const max = this.getMaxStamina(registry);
    const clamped = Math.max(0, Math.min(max, val));
    this.currentStaminaProp.set(clamped, registry);
    if (clamped <= 1e-4) {
      this.isExhausted = true;
    } else if (this.isExhausted && clamped >= max * this.recoveryThresholdRatio) {
      this.isExhausted = false;
    }
  }
  getStaminaRegenRate(registry) {
    return this.staminaRegenRateProp.get(registry);
  }
  get muscleEfficiency() {
    return this.muscleEfficiencyProp.literalValue;
  }
  set muscleEfficiency(val) {
    this.muscleEfficiencyProp.literalValue = Math.max(0.01, Math.min(1, val));
  }
  getMuscleEfficiency(registry) {
    return Math.max(0.01, Math.min(1, this.muscleEfficiencyProp.get(registry)));
  }
  getCurrentWattage(registry) {
    const val = this.currentWattageProp.get(registry);
    return Math.max(val, this.recentPeakWattage);
  }
  // --- Demand and Allocation Telemetry ---
  getActiveAllocations(_registry) {
    return Array.from(this._activeAllocations.values()).sort((a, b) => a.order - b.order);
  }
  beginTick() {
    this.livePowerDraw = 0;
  }
  registerDemand(abilityId, demandedWatts, allowPartialPower = true) {
    const effectiveAbilityId = abilityId === "locomotion" ? this.activeLocomotionId : abilityId;
    if (demandedWatts > 1e-3) {
      const existing = this._demands.get(effectiveAbilityId);
      if (existing) {
        existing.demandedWatts = demandedWatts;
        existing.allowPartialPower = allowPartialPower;
        existing.lastRequestedTick = this._currentTick;
      } else {
        this._nextOrderId++;
        this._demands.set(effectiveAbilityId, {
          demandedWatts,
          allowPartialPower,
          order: this._nextOrderId,
          lastRequestedTick: this._currentTick
        });
      }
    } else {
      this._demands.delete(effectiveAbilityId);
    }
    let sum = 0;
    for (const d of this._demands.values()) {
      sum += d.demandedWatts;
    }
    this._totalDemand = sum;
  }
  getDemand(abilityId) {
    var _a;
    return ((_a = this._demands.get(abilityId)) == null ? void 0 : _a.demandedWatts) ?? 0;
  }
  getTotalDemand() {
    return this._totalDemand;
  }
  clearDemands() {
    this._demands.clear();
    this._totalDemand = 0;
  }
  notifyInsufficientEnergy(options) {
    const isBurst = options.isBurst ?? true;
    const demandedAmount = Math.max(0.1, options.demandedAmount);
    const registry = options.registry;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (this.lastInsufficientAlert && this.lastInsufficientAlert.abilityId === options.abilityId && now < this.lastInsufficientAlert.timestamp + 350) {
      this.lastInsufficientAlert.expiresAt = Math.max(this.lastInsufficientAlert.expiresAt, now + 1400);
      return this.lastInsufficientAlert;
    }
    const curStamina = this.getCurrentStamina(registry);
    const curEnergy = this.getCurrentEnergy(registry);
    const isExhausted = this.isExhausted;
    let limitingResource = "stamina";
    let reason = options.customReason || "Insufficient Stamina";
    if (!options.customReason) {
      if (isExhausted) {
        limitingResource = "stamina";
        reason = "Exhausted (Stamina Depleted)";
      } else if (isBurst) {
        const staminaLack = curStamina < demandedAmount;
        const energyLack = curEnergy < demandedAmount;
        if (staminaLack && energyLack) {
          limitingResource = "both";
          reason = "Low Stamina + Energy";
        } else if (staminaLack) {
          limitingResource = "stamina";
          reason = "Insufficient Stamina";
        } else if (energyLack) {
          limitingResource = "energy";
          reason = "Insufficient Energy";
        } else {
          limitingResource = "stamina";
          reason = "Insufficient Stamina";
        }
      } else {
        const staminaLack = curStamina <= 1e-3;
        const energyLack = curEnergy <= 1e-3;
        if (staminaLack && energyLack) {
          limitingResource = "both";
          reason = "Out of Stamina + Energy";
        } else if (staminaLack) {
          limitingResource = "stamina";
          reason = "Insufficient Stamina";
        } else if (energyLack) {
          limitingResource = "energy";
          reason = "Insufficient Energy";
        } else {
          limitingResource = "stamina";
          reason = "Insufficient Stamina";
        }
      }
    } else {
      limitingResource = isExhausted || curStamina <= 1e-3 ? "stamina" : curEnergy <= 1e-3 ? "energy" : "stamina";
    }
    const meta = ABILITY_METADATA[options.abilityId];
    const abilityName = (meta == null ? void 0 : meta.name) ?? options.abilityId.charAt(0).toUpperCase() + options.abilityId.slice(1);
    const unit = options.unit ?? (isBurst ? "J" : "W");
    const alert2 = {
      abilityId: options.abilityId,
      abilityName,
      cost: Math.round(demandedAmount),
      unit,
      isBurst,
      limitingResource,
      reason,
      timestamp: now,
      expiresAt: now + 1600
    };
    this.lastInsufficientAlert = alert2;
    return alert2;
  }
  // --- Affordability Gatekeeping ---
  /**
   * Unified gatekeeper checking whether stamina and energy pool can satisfy an energy or power demand.
   * Centralizes all validation: enabled state, exhaustion, stamina reserves, and energy pool limits.
   */
  canAfford(options) {
    if (!this.enabled) return false;
    if (this.isExhausted && !options.allowWhenExhausted) return false;
    const curStamina = this.getCurrentStamina(options.registry);
    if (curStamina <= 1e-4 && !this.infiniteEnergy) return false;
    const dt = options.dt ?? 0.05;
    const demandedJoules = options.joules ?? (options.watts ? options.watts * dt : 0);
    if (demandedJoules <= 0) return true;
    if (!this.infiniteEnergy) {
      if (!options.allowPartialPower && demandedJoules > curStamina + 1e-3) {
        return false;
      }
      const poolEnergy = this.getCurrentEnergy(options.registry);
      if (!options.allowPartialPower && poolEnergy < demandedJoules - 1e-3) {
        return false;
      }
    }
    return true;
  }
  canSatisfyFullPower(demandedWatts, dt, registry, _abilityId) {
    if (!this.enabled || dt <= 0 || demandedWatts <= 0) return false;
    if (this.infiniteEnergy) return true;
    const curS = this.getCurrentStamina(registry);
    if (this.isExhausted || curS <= 1e-4) return false;
    const demandedJoules = demandedWatts * dt;
    if (curS < demandedJoules - 1e-3) return false;
    const curPoolE = this.getCurrentEnergy(registry);
    if (curPoolE < demandedJoules - 1e-3) return false;
    return true;
  }
  canSatisfyFullEnergy(joules, _minDt, registry) {
    if (joules <= 0) return true;
    if (!this.enabled) return false;
    if (this.infiniteEnergy) return true;
    if (this.isExhausted) return false;
    const curStamina = this.getCurrentStamina(registry);
    if (joules > curStamina + 1e-3) return false;
    if (this.getCurrentEnergy(registry) < joules - 1e-3) return false;
    return true;
  }
  canSupportPowerInIsolation(_demandedWatts, minWattsThreshold, dt, registry) {
    if (!this.enabled || dt <= 0) return false;
    if (this.infiniteEnergy) return true;
    if (this.isExhausted) return false;
    const curStamina = this.getCurrentStamina(registry);
    if (curStamina <= 1e-3) return false;
    const maxWattsFromStamina = curStamina / dt;
    if (maxWattsFromStamina < minWattsThreshold - 1e-3) return false;
    const curEnergy = this.getCurrentEnergy(registry);
    if (curEnergy < minWattsThreshold * dt - 1e-3) return false;
    return true;
  }
  // --- Power Consumption APIs ---
  /**
   * Peeks how much power (in Watts) would be granted without consuming pool energy or draining stamina.
   */
  peekPower(requestedPowerWatts, dt, registry, allowWhenExhausted = false, allowPartialPower = true, _abilityId) {
    if (!this.enabled || dt <= 0 || requestedPowerWatts <= 0) {
      return 0;
    }
    if (this.infiniteEnergy) return requestedPowerWatts;
    const curS = this.getCurrentStamina(registry);
    if (this.isExhausted && !allowWhenExhausted || curS <= 1e-4) {
      return 0;
    }
    const maxWattsFromStamina = curS / dt;
    let targetWatts = requestedPowerWatts;
    if (targetWatts > maxWattsFromStamina) {
      if (!allowPartialPower) return 0;
      targetWatts = maxWattsFromStamina;
    }
    if (targetWatts <= 1e-4) return 0;
    const curPoolE = this.getCurrentEnergy(registry);
    if (curPoolE <= 1e-4) return 0;
    const energyNeededJoules = targetWatts * dt;
    if (!allowPartialPower && curPoolE < energyNeededJoules - 1e-3) return 0;
    const grantedJoules = Math.min(curPoolE, energyNeededJoules);
    return grantedJoules / dt;
  }
  /**
   * Requests continuous power draw (in Watts) over dt seconds.
   * Drains both stamina and caloric energy pool simultaneously by (grantedWatts * dt) Joules.
   */
  requestPower(requestedPowerWatts, dt, registry, allowWhenExhausted = false, abilityId, allowPartialPower = true) {
    var _a;
    if (!this.enabled || dt <= 0 || requestedPowerWatts <= 0) {
      return 0;
    }
    const effectiveAbilityId = abilityId === "locomotion" ? this.activeLocomotionId : abilityId;
    if (this.infiniteEnergy) {
      if (effectiveAbilityId) {
        this.registerDemand(effectiveAbilityId, requestedPowerWatts, allowPartialPower);
      }
      this.livePowerDraw += requestedPowerWatts;
      this.recentPeakWattage = Math.max(this.recentPeakWattage, this.livePowerDraw);
      this.currentWattageProp.set(this.livePowerDraw, registry);
      return requestedPowerWatts;
    }
    const curS = this.getCurrentStamina(registry);
    if (this.isExhausted && !allowWhenExhausted || curS <= 1e-4) {
      return 0;
    }
    if (effectiveAbilityId) {
      this.registerDemand(effectiveAbilityId, requestedPowerWatts, allowPartialPower);
    }
    const remainingStaminaJoules = Math.max(0, curS - this.livePowerDraw * dt);
    const maxWattsFromStamina = remainingStaminaJoules / dt;
    let targetWatts = requestedPowerWatts;
    if (targetWatts > maxWattsFromStamina + 1e-3) {
      if (!allowPartialPower) {
        if (effectiveAbilityId) this._activeAllocations.delete(effectiveAbilityId);
        return 0;
      }
      targetWatts = maxWattsFromStamina;
    }
    if (targetWatts <= 1e-4) {
      this.isExhausted = true;
      if (effectiveAbilityId) {
        this._activeAllocations.delete(effectiveAbilityId);
        this.notifyInsufficientEnergy({ abilityId: effectiveAbilityId, demandedAmount: requestedPowerWatts, isBurst: false, unit: "W/s", registry });
      }
      return 0;
    }
    const energyNeededJoules = targetWatts * dt;
    const curPoolE = this.getCurrentEnergy(registry);
    if (!allowPartialPower && curPoolE < energyNeededJoules - 1e-3) {
      if (effectiveAbilityId) this._activeAllocations.delete(effectiveAbilityId);
      return 0;
    }
    const grantedJoules = this.consumePartial(energyNeededJoules, registry);
    if (grantedJoules <= 1e-4) {
      if (effectiveAbilityId) {
        this._activeAllocations.delete(effectiveAbilityId);
        this.notifyInsufficientEnergy({ abilityId: effectiveAbilityId, demandedAmount: requestedPowerWatts, isBurst: false, unit: "W/s", registry });
      }
      return 0;
    }
    const grantedWatts = grantedJoules / dt;
    if (!allowPartialPower && grantedWatts < requestedPowerWatts - 1e-3) {
      if (effectiveAbilityId) this._activeAllocations.delete(effectiveAbilityId);
      return 0;
    }
    if (grantedWatts > 0) {
      this.hadPhysicalExertion = true;
      const staminaDrainJoules = grantedWatts * dt;
      const nextS = Math.max(0, curS - staminaDrainJoules);
      this.currentStaminaProp.set(nextS, registry);
      if (nextS <= 1e-4) {
        this.isExhausted = true;
      }
    }
    if (effectiveAbilityId) {
      if (grantedWatts > 1e-3) {
        const meta = ABILITY_METADATA[effectiveAbilityId] || {
          name: effectiveAbilityId.charAt(0).toUpperCase() + effectiveAbilityId.slice(1),
          color: "#06b6d4"
        };
        this._activeAllocations.set(effectiveAbilityId, {
          id: effectiveAbilityId,
          name: meta.name,
          color: meta.color,
          demandedWatts: requestedPowerWatts,
          grantedWatts,
          fraction: requestedPowerWatts > 0 ? grantedWatts / requestedPowerWatts : 1,
          allowPartialPower,
          order: ((_a = this._demands.get(effectiveAbilityId)) == null ? void 0 : _a.order) ?? this._nextOrderId,
          isBurst: false,
          lastTick: this._currentTick
        });
      } else {
        this._activeAllocations.delete(effectiveAbilityId);
      }
    }
    this.livePowerDraw += grantedWatts;
    this.recentPeakWattage = Math.max(this.recentPeakWattage, this.livePowerDraw);
    this.currentWattageProp.set(this.livePowerDraw, registry);
    return grantedWatts;
  }
  /**
   * Dedicated API for instantaneous work actions (jump, throw, pickup).
   * Deducts Joules directly from both currentStamina and caloric energy.
   * Emits a visual equivalent power surge so the power bar peaks at:
   *   current continuous power + burst power consumption.
   */
  requestInstantBurst(options) {
    const {
      abilityId,
      demandedJoules,
      allowPartialPower = false,
      registry
    } = options;
    if (demandedJoules <= 0) {
      return { granted: true, grantedJoules: 0, fraction: 1, peakWatts: 0 };
    }
    if (!this.enabled || this.isExhausted && !this.infiniteEnergy) {
      if (this.enabled) this.notifyInsufficientEnergy({ abilityId, demandedAmount: demandedJoules, isBurst: true, registry });
      return { granted: false, grantedJoules: 0, fraction: 0, peakWatts: 0 };
    }
    if (this.infiniteEnergy) {
      const continuousBaseline2 = this.livePowerDraw;
      const burstWatts2 = demandedJoules;
      const peakWatts2 = continuousBaseline2 + burstWatts2;
      this.recentPeakWattage = Math.max(this.recentPeakWattage, peakWatts2);
      this.recentPeakHoldTimer = 0.08;
      return { granted: true, grantedJoules: demandedJoules, fraction: 1, peakWatts: peakWatts2 };
    }
    const curStamina = this.getCurrentStamina(registry);
    const poolEnergy = this.getCurrentEnergy(registry);
    const availableJoules = Math.min(poolEnergy, curStamina);
    if (curStamina <= 1e-4) {
      this.isExhausted = true;
      this.notifyInsufficientEnergy({ abilityId, demandedAmount: demandedJoules, isBurst: true, registry });
      return { granted: false, grantedJoules: 0, fraction: 0, peakWatts: 0 };
    }
    if (availableJoules <= 1e-3) {
      this.notifyInsufficientEnergy({ abilityId, demandedAmount: demandedJoules, isBurst: true, registry });
      return { granted: false, grantedJoules: 0, fraction: 0, peakWatts: 0 };
    }
    let grantedJoules = 0;
    let fraction = 0;
    if (demandedJoules <= availableJoules + 1e-3) {
      grantedJoules = demandedJoules;
      fraction = 1;
    } else if (allowPartialPower) {
      grantedJoules = availableJoules;
      fraction = availableJoules / demandedJoules;
    } else {
      this.notifyInsufficientEnergy({ abilityId, demandedAmount: demandedJoules, isBurst: true, registry });
      return { granted: false, grantedJoules: 0, fraction: 0, peakWatts: 0 };
    }
    this.consumePartial(grantedJoules, registry);
    const nextStamina = Math.max(0, curStamina - grantedJoules);
    this.currentStaminaProp.set(nextStamina, registry);
    if (nextStamina <= 1e-4) {
      this.isExhausted = true;
    }
    this.hadPhysicalExertion = true;
    const continuousBaseline = this.livePowerDraw;
    const burstWatts = grantedJoules;
    const peakWatts = continuousBaseline + burstWatts;
    this.recentPeakWattage = Math.max(this.recentPeakWattage, peakWatts);
    this.recentPeakHoldTimer = 0.08;
    if (grantedJoules > 1e-3) {
      this._nextOrderId++;
      const meta = ABILITY_METADATA[abilityId] || {
        name: abilityId ? abilityId.charAt(0).toUpperCase() + abilityId.slice(1) : "Burst",
        color: "#ec4899"
      };
      this._activeAllocations.set(abilityId, {
        id: abilityId,
        name: meta.name,
        color: meta.color,
        demandedWatts: grantedJoules,
        grantedWatts: grantedJoules,
        fraction,
        allowPartialPower,
        order: this._nextOrderId,
        isBurst: true,
        burstTimer: 0.55,
        lastTick: this._currentTick
      });
    }
    return {
      granted: true,
      grantedJoules,
      fraction,
      peakWatts
    };
  }
  /**
   * Charges a discrete burst of metabolic energy (Joules) for an instantaneous action.
   * Delegates to requestInstantBurst so burst limits and visual peaks are unified.
   */
  requestEnergy(joules, minDt, registry, allowPartialPower = true, abilityId = "instant_burst") {
    const inferredId = abilityId !== "instant_burst" ? abilityId : Math.abs(minDt - 0.15) < 0.01 ? "pickup" : Math.abs(minDt - 0.08) < 0.01 ? "throw" : "instant_burst";
    const res = this.requestInstantBurst({
      abilityId: inferredId,
      demandedJoules: joules,
      allowPartialPower,
      registry
    });
    return res.fraction;
  }
  // --- Caloric Energy Direct Operations ---
  consume(amount, registry) {
    if (!this.enabled || amount <= 0) return true;
    if (this.infiniteEnergy) return true;
    const cur = this.getCurrentEnergy(registry);
    if (cur >= amount) {
      const next = cur - amount;
      this.currentEnergyProp.set(next, registry);
      if (next <= 1e-4 && this.debugAutoRefillOnEmpty) {
        this.refill(registry);
      }
      return true;
    }
    this.currentEnergyProp.set(0, registry);
    if (this.debugAutoRefillOnEmpty) {
      this.refill(registry);
    }
    return false;
  }
  consumePartial(amount, registry) {
    if (!this.enabled || amount <= 0) return 0;
    if (this.infiniteEnergy) return amount;
    const cur = this.getCurrentEnergy(registry);
    if (cur <= 1e-4) {
      this.currentEnergyProp.set(0, registry);
      if (this.debugAutoRefillOnEmpty) {
        this.refill(registry);
      }
      return 0;
    }
    const granted = Math.min(cur, amount);
    const next = cur - granted;
    this.currentEnergyProp.set(next, registry);
    if (next <= 1e-4 && this.debugAutoRefillOnEmpty) {
      this.refill(registry);
    }
    return granted;
  }
  addEnergy(amount, registry) {
    if (!this.enabled || amount <= 0) return;
    const cur = this.getCurrentEnergy(registry);
    const max = this.getMaxEnergy(registry);
    this.currentEnergyProp.set(Math.min(max, cur + amount), registry);
  }
  addStamina(amount, registry) {
    if (!this.enabled || amount <= 0) return;
    const cur = this.getCurrentStamina(registry);
    const max = this.getMaxStamina(registry);
    const next = Math.min(max, cur + amount);
    this.currentStaminaProp.set(next, registry);
    if (this.isExhausted && next >= max * this.recoveryThresholdRatio) {
      this.isExhausted = false;
    }
  }
  refill(registry) {
    const maxE = this.getMaxEnergy(registry);
    this.currentEnergyProp.set(maxE, registry);
    const maxS = this.getMaxStamina(registry);
    this.currentStaminaProp.set(maxS, registry);
    this.isExhausted = false;
  }
  reset(registry) {
    this.refill(registry);
    this.livePowerDraw = 0;
    this.currentWattageProp.set(0, registry);
    this.recentPeakWattage = 0;
    this.recentPeakHoldTimer = 0;
    this.hadPhysicalExertion = false;
    this.clearDemands();
    this._activeAllocations.clear();
  }
  // --- Per-Tick Update ---
  update(dt, registry) {
    if (!this.enabled || dt <= 0) return;
    this._currentTick++;
    for (const [id, rec] of this._demands.entries()) {
      if (rec.lastRequestedTick < this._currentTick - 1) {
        this._demands.delete(id);
      }
    }
    let sum = 0;
    for (const d of this._demands.values()) {
      sum += d.demandedWatts;
    }
    this._totalDemand = sum;
    for (const [id, alloc] of this._activeAllocations.entries()) {
      if (alloc.isBurst) {
        if (alloc.burstTimer !== void 0) {
          alloc.burstTimer -= dt;
          if (alloc.burstTimer <= 0) {
            this._activeAllocations.delete(id);
          }
        }
      } else {
        if (alloc.lastTick !== void 0 && alloc.lastTick < this._currentTick - 1) {
          this._activeAllocations.delete(id);
        }
      }
    }
    this.currentWattageProp.set(this.livePowerDraw, registry);
    if (this.recentPeakHoldTimer > 0) {
      this.recentPeakHoldTimer -= dt;
      if (this.recentPeakHoldTimer <= 0) {
        this.recentPeakWattage = this.livePowerDraw;
      }
    } else {
      this.recentPeakWattage = this.livePowerDraw;
    }
    this.livePowerDraw = 0;
    const maxS = this.getMaxStamina(registry);
    let curS = this.getCurrentStamina(registry);
    const regen = this.getStaminaRegenRate(registry);
    const isResting = !this.hadPhysicalExertion;
    if (isResting && curS < maxS) {
      curS = Math.min(maxS, curS + regen * dt);
      this.currentStaminaProp.set(curS, registry);
    }
    if (this.isExhausted) {
      const recoveryThreshold = maxS * this.recoveryThresholdRatio;
      if (curS >= recoveryThreshold) {
        this.isExhausted = false;
      }
    }
    this.hadPhysicalExertion = false;
  }
}
class ConsumeModule {
  constructor(options) {
    __publicField(this, "id", "consume");
    __publicField(this, "name", "Consume");
    __publicField(this, "enabled", true);
    /** List of consumable tags this character is capable of consuming */
    __publicField(this, "acceptedTags", ["food"]);
    /** Whether using this ability involves aiming in a direction (false for eating/drinking/consuming) */
    __publicField(this, "involvesDirection", false);
    if ((options == null ? void 0 : options.enabled) !== void 0) this.enabled = options.enabled;
    if ((options == null ? void 0 : options.involvesDirection) !== void 0) this.involvesDirection = options.involvesDirection;
    if ((options == null ? void 0 : options.acceptedTags) !== void 0) {
      this.acceptedTags = options.acceptedTags.map((t) => t.trim().toLowerCase()).filter(Boolean);
    }
  }
  /**
   * Checks whether the given held object is valid for consumption by this character.
   */
  canConsume(heldObj) {
    if (!this.enabled || !heldObj) return false;
    const mod = heldObj.consumableModule;
    if (!mod || !mod.enabled || mod.isConsumed) return false;
    const itemTag = (mod.tag || "").trim().toLowerCase();
    if (!itemTag) return false;
    const matches = this.acceptedTags.some((t) => t.trim().toLowerCase() === itemTag);
    return matches;
  }
  /**
   * Performs continuous consumption of the held object.
   */
  consume(dt, consumer, heldObj, objects2, arena2) {
    if (!this.canConsume(heldObj) || !heldObj.consumableModule) {
      console.warn(`🍎 [ConsumeModule] Cannot consume object ${heldObj == null ? void 0 : heldObj.id}: canConsume=${this.canConsume(heldObj)}`);
      return { watts: 0, joules: 0, isDepleted: false };
    }
    const res = heldObj.consumableModule.consume(dt, consumer, heldObj, objects2, arena2);
    if (res.isDepleted) {
      console.log(`🍎 [ConsumeModule] Object ${heldObj.id} depleted! isDepleted=true`);
    }
    return res;
  }
  /**
   * Adds an accepted tag to this character's list.
   */
  addTag(tag) {
    const clean = tag.trim().toLowerCase();
    if (!clean || this.hasTag(clean)) return false;
    this.acceptedTags.push(clean);
    return true;
  }
  /**
   * Removes an accepted tag from this character's list.
   */
  removeTag(tag) {
    const clean = tag.trim().toLowerCase();
    const idx = this.acceptedTags.findIndex((t) => t.trim().toLowerCase() === clean);
    if (idx !== -1) {
      this.acceptedTags.splice(idx, 1);
      return true;
    }
    return false;
  }
  /**
   * Checks if an accepted tag is present on this character.
   */
  hasTag(tag) {
    const clean = tag.trim().toLowerCase();
    return this.acceptedTags.some((t) => t.trim().toLowerCase() === clean);
  }
  /**
   * Handles registry tag rename events.
   */
  onTagRenamed(oldTag, newTag) {
    const cleanOld = oldTag.trim().toLowerCase();
    const cleanNew = newTag.trim().toLowerCase();
    const idx = this.acceptedTags.findIndex((t) => t.trim().toLowerCase() === cleanOld);
    if (idx !== -1) {
      this.acceptedTags[idx] = cleanNew;
    }
  }
  /**
   * Handles registry tag deletion events.
   */
  onTagDeleted(deletedTag) {
    const clean = deletedTag.trim().toLowerCase();
    this.acceptedTags = this.acceptedTags.filter((t) => t.trim().toLowerCase() !== clean);
  }
}
class ElevationRaycaster {
  /**
   * Tests if an aim point (aimX, aimY) is directly over a wall tile footprint.
   * Only considers whether the cursor is over the physical 2D wall tile,
   * ignoring upward-projected roof depth so space behind walls can be targeted.
   */
  static findWallOverlappingCollider(aimX, aimY, _radius = 0, arena2, _hoverScale = 0) {
    let bestWall = null;
    let bestDist = Infinity;
    for (const wall of arena2.walls) {
      const isOverWallTile = aimX >= wall.x && aimX <= wall.x + wall.width && aimY >= wall.y && aimY <= wall.y + wall.height;
      if (isOverWallTile) {
        const midX = wall.x + wall.width * 0.5;
        const midY = wall.y + wall.height * 0.5;
        const d = Math.hypot(midX - aimX, midY - aimY);
        if (d < bestDist) {
          bestDist = d;
          bestWall = wall;
        }
      }
    }
    if (bestWall) {
      return {
        wall: bestWall,
        targetSurfaceHeight: bestWall.wallHeight,
        physX: aimX,
        physY: aimY
      };
    }
    return null;
  }
  /**
   * Calculates the distance along ray (startX, startY) + s * (dirX, dirY)
   * where the ray enters and exits a wall's 2D bounding box.
   */
  static getRayWallEnterDistance(startX, startY, dirX, dirY, wall) {
    let tNear = -Infinity;
    let tFar = Infinity;
    if (Math.abs(dirX) > 1e-6) {
      let t1 = (wall.x - startX) / dirX;
      let t2 = (wall.x + wall.width - startX) / dirX;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tNear = Math.max(tNear, t1);
      tFar = Math.min(tFar, t2);
    } else {
      if (startX <= wall.x || startX >= wall.x + wall.width) return null;
    }
    if (Math.abs(dirY) > 1e-6) {
      let t1 = (wall.y - startY) / dirY;
      let t2 = (wall.y + wall.height - startY) / dirY;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tNear = Math.max(tNear, t1);
      tFar = Math.min(tFar, t2);
    } else {
      if (startY <= wall.y || startY >= wall.y + wall.height) return null;
    }
    if (tNear <= tFar && tFar >= 0) {
      return { enterDist: Math.max(0, tNear), exitDist: tFar };
    }
    return null;
  }
}
class LaserModule {
  constructor(options) {
    __publicField(this, "id", "laser_blast");
    __publicField(this, "name", "Laser Blast");
    __publicField(this, "enabled", true);
    /** Current active damage rate (HP / second). Persists when laser turns off! */
    __publicField(this, "damageRateProp");
    /** Maximum damage rate (HP / second) */
    __publicField(this, "maxDamageRateProp");
    /** Width/thickness of the laser beam in world units (dev tool property, effects hit detection) */
    __publicField(this, "thicknessProp");
    /** Maximum power rating (Watts) demanded when operating at max damage rate */
    __publicField(this, "maxPowerProp");
    /** Whether to allow partial power firing when pool cannot satisfy 100% wattage */
    __publicField(this, "allowPartialPower", true);
    /** Live state */
    __publicField(this, "isAiming", false);
    __publicField(this, "isFiring", false);
    __publicField(this, "throttle", 1);
    __publicField(this, "actualPowerWatts", 0);
    __publicField(this, "actualDamageRate", 0);
    __publicField(this, "currentEndpoint", null);
    __publicField(this, "startPoint", null);
    __publicField(this, "hitWall", null);
    __publicField(this, "hitEntities", []);
    if ((options == null ? void 0 : options.enabled) !== void 0) this.enabled = options.enabled;
    if ((options == null ? void 0 : options.allowPartialPower) !== void 0) this.allowPartialPower = options.allowPartialPower;
    const baseDamage = (options == null ? void 0 : options.damageRate) ?? 50;
    const baseMaxDamage = (options == null ? void 0 : options.maxDamageRate) ?? 50;
    const baseThickness = (options == null ? void 0 : options.thickness) ?? 0.35;
    const baseMaxPower = (options == null ? void 0 : options.maxPower) ?? 2e3;
    this.damageRateProp = new DynamicProperty(baseDamage);
    this.maxDamageRateProp = new DynamicProperty(baseMaxDamage);
    this.thicknessProp = new DynamicProperty(baseThickness);
    this.maxPowerProp = new DynamicProperty(baseMaxPower);
  }
  get damageRate() {
    return this.damageRateProp.literalValue;
  }
  get maxDamageRate() {
    return this.maxDamageRateProp.literalValue;
  }
  get thickness() {
    return this.thicknessProp.literalValue;
  }
  get maxPower() {
    return this.maxPowerProp.literalValue;
  }
  getDamageRate(registry) {
    return this.damageRateProp.get(registry);
  }
  setDamageRate(val, registry) {
    const max = this.getMaxDamageRate(registry);
    const clamped = Math.max(0, Math.min(max, val));
    this.damageRateProp.set(clamped, registry);
  }
  adjustDamageRate(delta, registry) {
    const cur = this.getDamageRate(registry);
    this.setDamageRate(cur + delta, registry);
  }
  getMaxDamageRate(registry) {
    return this.maxDamageRateProp.get(registry);
  }
  setMaxDamageRate(val, registry) {
    this.maxDamageRateProp.set(Math.max(1, val), registry);
  }
  getThickness(registry) {
    return this.thicknessProp.get(registry);
  }
  setThickness(val, registry) {
    this.thicknessProp.set(Math.max(0.05, Math.min(3, val)), registry);
  }
  getMaxPower(registry) {
    return this.maxPowerProp.get(registry);
  }
  setMaxPower(val, registry) {
    this.maxPowerProp.set(Math.max(1, val), registry);
  }
  /**
   * Calculates the demanded power in Watts based on current damage rate, max power property, and analog throttle:
   * Power = (damageRate / maxDamageRate) * maxPower * throttle
   */
  calculateDemandedPower(registry, throttle = 1) {
    const maxDamage = Math.max(1, this.getMaxDamageRate(registry));
    const curDamage = Math.max(0, this.getDamageRate(registry));
    const maxPower = Math.max(0, this.getMaxPower(registry));
    const clampedThrottle = Math.max(0, Math.min(1, throttle));
    return curDamage / maxDamage * maxPower * clampedThrottle;
  }
  /**
   * Computes the 3D laser ray from the character to the aim target, testing for wall obstructions.
   */
  calculateLaserRay(character, targetScreenX, targetScreenY, arena2, hoverScale = 0) {
    const startZ = character.position.z;
    const startX = character.position.x;
    const startY = character.position.y;
    const scale = hoverScale > 0 ? hoverScale : arena2.visualAltitudeScale ?? 0.5;
    const wallOver = ElevationRaycaster.findWallOverlappingCollider(targetScreenX, targetScreenY, 0.2, arena2, scale);
    const targetSurfaceHeight = wallOver ? wallOver.targetSurfaceHeight : arena2.getSupportingSurfaceHeight(targetScreenX, targetScreenY, 0);
    const targetX = targetScreenX;
    const targetY = targetScreenY;
    const targetZ = targetSurfaceHeight;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const dz = targetZ - startZ;
    const dist2D = Math.hypot(dx, dy);
    let dirX = 1;
    let dirY = 0;
    let slopeZ = 0;
    if (dist2D >= 0.05) {
      dirX = dx / dist2D;
      dirY = dy / dist2D;
      slopeZ = dz / dist2D;
    } else {
      const angle = character.facingAngle ?? 0;
      dirX = Math.cos(angle);
      dirY = Math.sin(angle);
      slopeZ = 0;
    }
    const maxLaserRange = 150;
    let closestWallDist = maxLaserRange;
    let hitWall = null;
    let isBlocked = false;
    for (const wall of arena2.walls) {
      const enterInfo = ElevationRaycaster.getRayWallEnterDistance(startX, startY, dirX, dirY, wall);
      if (enterInfo && enterInfo.enterDist > 0.05 && enterInfo.enterDist < closestWallDist) {
        const beamZ = startZ + slopeZ * enterInfo.enterDist;
        if (beamZ <= wall.wallHeight + 0.01) {
          closestWallDist = enterInfo.enterDist;
          hitWall = wall;
          isBlocked = true;
        }
      }
    }
    const endX = startX + dirX * closestWallDist;
    const endY = startY + dirY * closestWallDist;
    const endZ = Math.max(0, startZ + slopeZ * closestWallDist);
    return {
      endpoint: { x: endX, y: endY, z: endZ },
      hitWall,
      hitEntities: [],
      isBlockedByWall: isBlocked
    };
  }
  /**
   * Finds all entities intersecting the 3D laser capsule segment.
   */
  findIntersectingEntities(start, end, thickness, candidates, exclude) {
    var _a;
    const hits = [];
    const segDx = end.x - start.x;
    const segDy = end.y - start.y;
    const segDz = end.z - start.z;
    const segLenSq = segDx * segDx + segDy * segDy + segDz * segDz;
    if (segLenSq < 1e-4) return hits;
    for (const ent of candidates) {
      if (ent === exclude || ent.isHeld) continue;
      const entRadius = ent.hasCollider ? ent.colliderRadius : ((_a = ent.colliderModule) == null ? void 0 : _a.radius) ?? 0.35;
      const hitRadius = entRadius + thickness * 0.5;
      const pDx = ent.position.x - start.x;
      const pDy = ent.position.y - start.y;
      const pDz = (ent.position.z ?? 0) - start.z;
      const t = Math.max(0, Math.min(1, (pDx * segDx + pDy * segDy + pDz * segDz) / segLenSq));
      const projX = start.x + segDx * t;
      const projY = start.y + segDy * t;
      const projZ = start.z + segDz * t;
      const distSq = (ent.position.x - projX) ** 2 + (ent.position.y - projY) ** 2 + ((ent.position.z ?? 0) - projZ) ** 2;
      if (distSq <= hitRadius * hitRadius) {
        hits.push(ent);
      }
    }
    return hits;
  }
  /**
   * Per-frame update for LaserModule.
   * @param powerFraction Degree of trigger pull (0.0 to 1.0) scaling laser wattage and damage rate
   */
  update(dt, character, arena2, targetPos, isAimingInput, isFiringInput, candidateEntities, hoverScale = 0, powerFraction = 1) {
    if (!this.enabled || dt <= 0) {
      this.isAiming = false;
      this.isFiring = false;
      this.throttle = 1;
      this.actualPowerWatts = 0;
      this.actualDamageRate = 0;
      this.currentEndpoint = null;
      this.startPoint = null;
      this.hitWall = null;
      this.hitEntities = [];
      return;
    }
    const targetScreenX = targetPos ? targetPos.x : character.position.x + Math.cos(character.facingAngle) * 5;
    const targetScreenY = targetPos ? targetPos.y : character.position.y + Math.sin(character.facingAngle) * 5;
    this.isAiming = isAimingInput;
    this.isFiring = isAimingInput && isFiringInput;
    if (!this.isAiming && !this.isFiring) {
      this.throttle = 1;
      this.actualPowerWatts = 0;
      this.actualDamageRate = 0;
      this.currentEndpoint = null;
      this.startPoint = null;
      this.hitWall = null;
      this.hitEntities = [];
      return;
    }
    const aimDx = targetScreenX - character.position.x;
    const aimDy = targetScreenY - character.position.y;
    if (Math.hypot(aimDx, aimDy) > 0.05) {
      character.facingAngle = Math.atan2(aimDy, aimDx);
    }
    const rayResult = this.calculateLaserRay(character, targetScreenX, targetScreenY, arena2, hoverScale);
    this.currentEndpoint = rayResult.endpoint;
    this.startPoint = {
      x: character.position.x,
      y: character.position.y,
      z: character.position.z
    };
    this.hitWall = rayResult.hitWall;
    const registry = character.properties;
    const thickness = this.getThickness(registry);
    if (this.isFiring) {
      const throttle = Math.max(0.01, Math.min(1, powerFraction));
      this.throttle = throttle;
      const demandedWatts = this.calculateDemandedPower(registry, throttle);
      let grantedWatts = 0;
      if (demandedWatts > 0) {
        const pool = character.energyPool;
        if (pool && pool.enabled && !pool.isExhausted) {
          grantedWatts = pool.requestPower(
            demandedWatts,
            dt,
            registry,
            false,
            "laser_blast",
            this.allowPartialPower
          );
        }
      }
      this.actualPowerWatts = grantedWatts;
      if (demandedWatts > 0 && grantedWatts <= 1e-3) {
        if (character.energyPool) {
          character.energyPool.notifyInsufficientEnergy({
            abilityId: "laser_blast",
            demandedAmount: demandedWatts,
            isBurst: false,
            unit: "W/s",
            registry
          });
        }
        this.actualDamageRate = 0;
        this.isFiring = false;
        character.isLaserFiring = false;
        this.hitEntities = [];
        return;
      }
      const powerRatio = demandedWatts > 0 ? Math.min(1, grantedWatts / demandedWatts) : 1;
      const effectiveDamageRate = this.getDamageRate(registry) * throttle * powerRatio;
      this.actualDamageRate = effectiveDamageRate;
      const list = candidateEntities ?? arena2.entities ?? [];
      this.hitEntities = this.findIntersectingEntities(this.startPoint, this.currentEndpoint, thickness, list, character);
      const damageTick = effectiveDamageRate * dt;
      for (const ent of this.hitEntities) {
        if (ent.isCharacter) {
          const targetChar = ent;
          if (targetChar.healthModule && targetChar.healthModule.enabled) {
            targetChar.healthModule.takeDamage(damageTick, targetChar.properties, {
              id: "laser_blast",
              name: "Laser Blast",
              type: "continuous",
              rate: effectiveDamageRate,
              color: "#06b6d4"
            });
          }
        }
      }
    } else {
      this.throttle = 1;
      this.actualPowerWatts = 0;
      this.actualDamageRate = 0;
      this.hitEntities = [];
    }
  }
}
class MeleeModule {
  constructor(options) {
    __publicField(this, "id", "melee_attack");
    __publicField(this, "name", "Melee Attack");
    __publicField(this, "enabled", true);
    /** Maximum peak force (Newtons) delivered by a full punch */
    __publicField(this, "maxForceProp");
    /** Punches per second (Hz) */
    __publicField(this, "punchFrequencyProp");
    /** Forward length of the rectangular attack zone (world units / meters) */
    __publicField(this, "reachProp");
    /** Perpendicular width of the rectangular attack zone (world units / meters) */
    __publicField(this, "widthProp");
    // Behavior-driven maximum melee power capacity (Watts)
    __publicField(this, "maxPowerProp");
    /** Whether to allow punches at partial force when pool cannot grant 100% burst energy */
    __publicField(this, "allowPartialPower", true);
    /** Time of last punch execution (performance.now ms) */
    __publicField(this, "lastPunchTime", 0);
    /** Visual indicator state: timestamp of recent punch for rendering strike effect */
    __publicField(this, "lastVisualPunchTime", 0);
    __publicField(this, "lastVisualPunchDir", { x: 1, y: 0 });
    __publicField(this, "lastVisualPunchReach", 1.2);
    __publicField(this, "lastVisualPunchWidth", 0.8);
    if ((options == null ? void 0 : options.enabled) !== void 0) this.enabled = options.enabled;
    if ((options == null ? void 0 : options.allowPartialPower) !== void 0) this.allowPartialPower = options.allowPartialPower;
    this.maxForceProp = new DynamicProperty((options == null ? void 0 : options.maxForce) ?? 350);
    this.punchFrequencyProp = new DynamicProperty((options == null ? void 0 : options.punchFrequency) ?? 4);
    this.reachProp = new DynamicProperty((options == null ? void 0 : options.reach) ?? 1.2);
    this.widthProp = new DynamicProperty((options == null ? void 0 : options.width) ?? 0.8);
    this.maxPowerProp = new DynamicProperty((options == null ? void 0 : options.maxPower) ?? 2e3);
  }
  get maxPower() {
    return this.maxPowerProp.literalValue;
  }
  set maxPower(val) {
    this.maxPowerProp.literalValue = val;
  }
  getMaxPower(registry) {
    return this.maxPowerProp.get(registry);
  }
  get maxForce() {
    return this.maxForceProp.literalValue;
  }
  set maxForce(val) {
    this.maxForceProp.literalValue = val;
  }
  get punchFrequency() {
    return this.punchFrequencyProp.literalValue;
  }
  set punchFrequency(val) {
    this.punchFrequencyProp.literalValue = val;
  }
  get reach() {
    return this.reachProp.literalValue;
  }
  set reach(val) {
    this.reachProp.literalValue = val;
  }
  get width() {
    return this.widthProp.literalValue;
  }
  set width(val) {
    this.widthProp.literalValue = val;
  }
  getMaxForce(registry) {
    return Math.max(1, this.maxForceProp.get(registry));
  }
  getPunchFrequency(registry) {
    return Math.max(0.1, this.punchFrequencyProp.get(registry));
  }
  getReach(registry) {
    return Math.max(0.1, this.reachProp.get(registry));
  }
  getWidth(registry) {
    return Math.max(0.1, this.widthProp.get(registry));
  }
  /**
   * Checks whether the cooldown interval between punches has elapsed.
   */
  canPunchNow(now, registry) {
    const freq = this.getPunchFrequency(registry);
    const cooldownMs = 1 / freq * 1e3;
    return now - this.lastPunchTime >= cooldownMs;
  }
  /**
   * Executes a melee strike from the attacker along the given normalized direction vector.
   */
  executePunch(attacker, dirX, dirY, potentialTargets, _arena, now = performance.now()) {
    if (!this.enabled) return null;
    if (!this.canPunchNow(now, attacker.properties)) return null;
    const registry = attacker.properties;
    const maxForce = this.getMaxForce(registry);
    const reach = this.getReach(registry);
    const width = this.getWidth(registry);
    const dirMag = Math.hypot(dirX, dirY);
    let uX = 1;
    let uY = 0;
    if (dirMag > 1e-3) {
      uX = dirX / dirMag;
      uY = dirY / dirMag;
    } else {
      const facing = attacker.facingAngle ?? 0;
      uX = Math.cos(facing);
      uY = Math.sin(facing);
    }
    const muscleEff = (registry == null ? void 0 : registry.get("muscleEfficiency")) ?? 0.25;
    const mechanicalWorkJoules = maxForce * reach;
    const rawDemandedJoules = mechanicalWorkJoules / Math.max(0.01, muscleEff);
    const maxPower = this.maxPowerProp.get(registry);
    const demandedJoules = Math.min(rawDemandedJoules, Math.max(0, maxPower));
    const pool = attacker.energyPool;
    let actualForce = maxForce;
    let energySpent = 0;
    if (pool) {
      if (pool.isExhausted) {
        pool.notifyInsufficientEnergy({
          abilityId: "melee",
          demandedAmount: demandedJoules,
          isBurst: true,
          registry
        });
        return null;
      }
      const burstRes = pool.requestInstantBurst({
        abilityId: "melee",
        demandedJoules,
        allowPartialPower: this.allowPartialPower,
        registry
      });
      if (!burstRes.granted || burstRes.fraction <= 1e-3) {
        return null;
      }
      actualForce = maxForce * burstRes.fraction * (demandedJoules / rawDemandedJoules);
      energySpent = burstRes.grantedJoules;
    }
    this.lastPunchTime = now;
    this.lastVisualPunchTime = now;
    this.lastVisualPunchDir = { x: uX, y: uY };
    this.lastVisualPunchReach = reach;
    this.lastVisualPunchWidth = width;
    const perpX = -uY;
    const perpY = uX;
    const startX = attacker.position.x;
    const startY = attacker.position.y;
    const halfWidth = width * 0.5;
    const hitTargets = [];
    for (const obj of potentialTargets) {
      if (obj === attacker) continue;
      if (obj.isDead) continue;
      if (attacker.heldObject === obj) continue;
      const objRadius = obj.colliderRadius > 0 ? obj.colliderRadius : 0.3;
      const dx = obj.position.x - startX;
      const dy = obj.position.y - startY;
      const forwardProj = dx * uX + dy * uY;
      const lateralProj = dx * perpX + dy * perpY;
      if (forwardProj >= -objRadius * 0.5 && forwardProj <= reach + objRadius && Math.abs(lateralProj) <= halfWidth + objRadius) {
        const attackerZ = attacker.position.z;
        const targetZ = obj.position.z;
        const attackerHeight = attacker.height ?? attacker.colliderRadius * 2;
        const targetHeight = obj.height ?? obj.colliderRadius * 2;
        const attackerMinZ = attackerZ - 0.3;
        const attackerMaxZ = attackerZ + attackerHeight + 0.3;
        const targetMinZ = targetZ;
        const targetMaxZ = targetZ + targetHeight;
        if (targetMaxZ >= attackerMinZ && targetMinZ <= attackerMaxZ) {
          hitTargets.push(obj);
        }
      }
    }
    const contactDt = 0.05;
    const totalImpulse = actualForce * contactDt;
    let recoilVx = 0;
    let recoilVy = 0;
    if (hitTargets.length > 0) {
      const impulsePerTarget = totalImpulse / hitTargets.length;
      const attackerMass = Math.max(0.2, attacker.mass);
      for (const target of hitTargets) {
        const targetMass = Math.max(0.2, target.mass);
        const targetDv = impulsePerTarget / targetMass;
        const currentInwardVel = target.velocity.x * uX + target.velocity.y * uY;
        if (currentInwardVel < 0) {
          target.velocity.x -= uX * currentInwardVel;
          target.velocity.y -= uY * currentInwardVel;
        }
        if (target.rigidbodyModule && target.rigidbodyModule.enabled) {
          target.velocity.x += uX * targetDv;
          target.velocity.y += uY * targetDv;
        } else {
          target.velocity.x = (target.velocity.x ?? 0) + uX * targetDv;
          target.velocity.y = (target.velocity.y ?? 0) + uY * targetDv;
        }
        if (typeof target.wakeUp === "function") {
          target.wakeUp();
        }
        target.lastCollisionTime = now;
        target.lastContactNormal = { x: -uX, y: -uY };
        const targetBounce = target.hasBounce && target.bounceMod !== null ? target.bounceMod : target.isCharacter ? 0.2 : 0;
        const absFrac = Math.max(0.1, 1 - Math.min(1, targetBounce * targetBounce));
        const shock = targetDv * 60 * absFrac;
        const damageDealt = target.dispatchImpact({
          absorbedShock: shock,
          impactSpeed: targetDv,
          otherEntity: attacker,
          normalX: -uX,
          normalY: -uY
        });
        if (damageDealt <= 1e-3 && target.healthModule && target.healthModule.enabled) {
          if (!target.damageSolverModule || !target.damageSolverModule.enabled) {
            const fallbackDamage = Math.max(5, targetDv * 2);
            target.healthModule.takeDamage(fallbackDamage, target.properties, {
              id: "collision_damage",
              name: "Collision",
              type: "instant",
              amount: fallbackDamage,
              color: "#f87171",
              isHeal: false
            });
          }
        }
        target.applyKnockbackWindow(350);
        const recoilDv = impulsePerTarget / attackerMass;
        recoilVx -= uX * recoilDv;
        recoilVy -= uY * recoilDv;
      }
      if (attacker.rigidbodyModule && attacker.rigidbodyModule.enabled) {
        attacker.velocity.x += recoilVx;
        attacker.velocity.y += recoilVy;
      } else {
        attacker.velocity.x += recoilVx;
        attacker.velocity.y += recoilVy;
      }
    }
    return {
      hitTargets,
      actualForce,
      energySpentJoules: energySpent,
      recoilVx,
      recoilVy
    };
  }
}
class LocomotionCapability {
  static canWalk(char) {
    return Boolean(
      char.walkingModule && char.walkingModule.enabled && (char.isRestingOnSurface ? char.hasFriction : char.walkingModule.walkInAir)
    );
  }
  static registerDemand(char, movementInput) {
    var _a, _b, _c, _d;
    const canWalk = LocomotionCapability.canWalk(char);
    const inputMag = Math.hypot(movementInput.x, movementInput.y);
    const isMoving = inputMag > 0.05;
    const isActivelySprinting = Boolean(((_a = char.walkingModule) == null ? void 0 : _a.canSprint) && char.isSprinting);
    let sprintingNow = isActivelySprinting;
    if (sprintingNow && ((_b = char.walkingModule) == null ? void 0 : _b.sprintConsumesEnergy)) {
      if (char.energyPool && (char.energyPool.isExhausted || char.energyPool.getCurrentStamina(char.properties) <= 1e-4)) {
        sprintingNow = false;
        char.setSprinting(false);
        const Cr = 0.4;
        const totalMass = char.hasMass ? Math.max(0.2, char.mass) : 1;
        const targetSpeed = char.walkingModule.maxSprintSpeedProp.get(char.properties);
        const rawSprintWatts = totalMass * 9.81 * Cr * targetSpeed / 0.25;
        char.energyPool.notifyInsufficientEnergy({
          abilityId: "sprint",
          demandedAmount: rawSprintWatts,
          isBurst: false,
          unit: "W/s",
          registry: char.properties
        });
      }
    }
    const locomotionConsumesEnergy = sprintingNow ? (_c = char.walkingModule) == null ? void 0 : _c.sprintConsumesEnergy : (_d = char.walkingModule) == null ? void 0 : _d.walkConsumesEnergy;
    if (canWalk && isMoving && locomotionConsumesEnergy && char.walkingModule && char.energyPool) {
      const carriedMass = char.carriedMass;
      const loadFactor = carriedMass / (Math.max(0.1, char.strength) * 8);
      const targetSpeed = sprintingNow ? char.walkingModule.maxSprintSpeedProp.get(char.properties) : char.walkingModule.maxWalkSpeedProp.get(char.properties);
      const v = targetSpeed / (1 + loadFactor);
      const g = 9.81;
      const Cr = sprintingNow ? 0.4 : 0.28;
      const totalMass = char.hasMass ? Math.max(0.2, char.mass) : 1;
      const resForce = totalMass * g * Cr;
      const rawLocomotionWatts = resForce * v / 0.25;
      const cap = sprintingNow ? char.walkingModule.maxSprintPowerProp.get(char.properties) : char.walkingModule.maxWalkPowerProp.get(char.properties);
      const allowPartial = sprintingNow ? char.walkingModule.sprintAllowPartialPower : char.walkingModule.walkAllowPartialPower;
      let locomotionWatts = rawLocomotionWatts;
      if (locomotionWatts > cap) {
        locomotionWatts = allowPartial ? cap : 0;
      }
      const locomotionId = sprintingNow ? "sprint" : "walk";
      char.energyPool.activeLocomotionId = locomotionId;
      char.energyPool.registerDemand(locomotionId, locomotionWatts, allowPartial);
    }
    return canWalk;
  }
  static actuate(char, canWalk, movementInput, dt, arena2) {
    if (canWalk && char.walkingModule) {
      char.walkingModule.update(char, movementInput, dt, arena2);
    } else {
      char.isActivelyWalking = false;
    }
  }
}
class ClimbingCapability {
  static canClimb(char) {
    return Boolean(
      char.climbingModule && char.climbingModule.enabled && char.hasVerticalPosition && char.hasStrength
    );
  }
  static registerDemand(char, isClimbInput, arena2) {
    var _a;
    const canClimb = ClimbingCapability.canClimb(char);
    if (canClimb && char.isClimbing && ((_a = char.climbingModule) == null ? void 0 : _a.consumesEnergy) && char.energyPool) {
      const totalMass = char.mass;
      const g = arena2.gravity || 9.81;
      const isometricHoldingWatts = totalMass * g * 0.35 / 0.25;
      const maxAscentSpeed = char.climbingModule.maxClimbSpeedProp.get(char.properties);
      const ascentWatts = isClimbInput ? totalMass * g * maxAscentSpeed / 0.25 : 0;
      const rawClimbWatts = isometricHoldingWatts + ascentWatts;
      const climbCap = char.climbingModule.maxPowerProp.get(char.properties);
      let climbWatts = rawClimbWatts;
      if (climbWatts > climbCap) {
        climbWatts = char.climbingModule.allowPartialPower ? climbCap : 0;
      }
      char.energyPool.registerDemand("climb", climbWatts, char.climbingModule.allowPartialPower);
    }
    return canClimb;
  }
  static actuate(char, canClimb, movementInput, isClimbInput, dt, arena2) {
    if (canClimb && char.climbingModule) {
      char.climbingModule.update(char, movementInput, isClimbInput, dt, arena2);
    } else if (char.isClimbing) {
      char.isClimbing = false;
    }
  }
}
class JumpCapability {
  static canJump(char) {
    return Boolean(char.jumpModule && char.jumpModule.enabled && char.hasVerticalPosition);
  }
  static executeJump(char, arena2, movementInput) {
    if (!char.jumpModule || !char.jumpModule.enabled || !char.hasVerticalPosition) {
      return false;
    }
    const surfaceZ = char.supportingSurfaceHeight ?? 0;
    const isGrounded = char.isRestingOnSurface || Math.abs(char.position.z - surfaceZ) <= 0.08 && Math.abs(char.verticalVelocity) <= 0.8;
    if (!isGrounded || char.isHeld) {
      return false;
    }
    const baseMass = Math.max(0.2, char.baseMass ?? 1.2);
    const totalMass = Math.max(0.2, char.mass);
    const jumpStrength = char.jumpModule.jumpStrengthProp.get(char.properties);
    const maxInitialSpeed = char.jumpModule.maxInitialSpeedProp.get(char.properties);
    const targetTakeoffSpeed = Math.min(maxInitialSpeed, jumpStrength / baseMass);
    if (targetTakeoffSpeed <= 0.01) return false;
    const mechanicalJoules = 0.5 * totalMass * (targetTakeoffSpeed * targetTakeoffSpeed);
    const pool = char.energyPool;
    const efficiency = Math.max(0.01, pool ? pool.getMuscleEfficiency(char.properties) : 0.25);
    const rawMetabolicJoules = Math.max(15, mechanicalJoules / efficiency);
    const jumpCap = char.jumpMaxPowerProp ? char.jumpMaxPowerProp.get(char.properties) : 1200;
    const metabolicJoules = Math.min(rawMetabolicJoules, Math.max(0, jumpCap));
    let energyFraction = 1;
    if (char.jumpConsumesEnergy) {
      if (pool) {
        if (pool.isExhausted) {
          pool.notifyInsufficientEnergy({
            abilityId: "jump",
            demandedAmount: metabolicJoules,
            isBurst: true,
            registry: char.properties
          });
          return false;
        }
        if (!char.jumpAllowPartialPower && !pool.canSatisfyFullEnergy(metabolicJoules, 0.05, char.properties)) {
          pool.notifyInsufficientEnergy({
            abilityId: "jump",
            demandedAmount: metabolicJoules,
            isBurst: true,
            registry: char.properties
          });
          return false;
        }
        const burstRes = pool.requestInstantBurst({
          abilityId: "jump",
          demandedJoules: metabolicJoules,
          allowPartialPower: char.jumpAllowPartialPower,
          registry: char.properties
        });
        if (!burstRes.granted || burstRes.grantedJoules <= 1e-3 || !char.jumpAllowPartialPower && burstRes.fraction < 1) {
          return false;
        }
        energyFraction = burstRes.fraction * (metabolicJoules / rawMetabolicJoules);
      }
    }
    const jumped = char.jumpModule.jump(char, arena2, movementInput);
    if (jumped) {
      const achievableSpeed = targetTakeoffSpeed * Math.sqrt(energyFraction);
      char.verticalVelocity = achievableSpeed;
    }
    return jumped;
  }
}
class HealthRegenCapability {
  static registerDemand(char) {
    if (char.healthModule && char.healthModule.enabled && char.healthModule.consumesEnergy && char.energyPool) {
      const curHp = char.healthModule.getCurrentHp(char.properties);
      const maxHp = char.healthModule.getMaxHp(char.properties);
      if (curHp > 0 && curHp < maxHp - 1e-3) {
        const healRate = char.healthModule.getMaxHealRate(char.properties);
        if (healRate > 0) {
          const joulesPerHp = char.healthModule.getJoulesPerHp(char.properties);
          const rawHealthWatts = healRate * Math.max(1e-4, joulesPerHp);
          const maxPower = char.healthModule.maxPowerProp.get(char.properties);
          let healthWatts = rawHealthWatts;
          if (healthWatts > maxPower) {
            healthWatts = char.healthModule.allowPartialPower ? maxPower : 0;
          }
          char.energyPool.registerDemand("health_regen", healthWatts, char.healthModule.allowPartialPower);
        }
      }
    }
  }
  static actuate(char, dt, arena2) {
    if (char.healthModule && char.healthModule.enabled) {
      char.healthModule.update(dt, char, arena2);
    }
  }
}
class ThrowCapability {
  static getAnticipatedModifier(char) {
    if (char.activeTrajectory && char.heldObject && char.throwModule && char.throwModule.enabled && char.throwModule.consumesEnergy) {
      const launchVel = char.activeTrajectory.launchVel;
      if (launchVel) {
        const heldMass = char.heldObject.hasMass ? Math.max(0.1, char.heldObject.mass) : 1;
        const actualLaunchSpeed = Math.hypot(launchVel.vx, launchVel.vy, launchVel.vz);
        const mechWorkJoules = 0.5 * heldMass * (actualLaunchSpeed * actualLaunchSpeed);
        const pool = char.energyPool;
        const poolEfficiency = Math.max(0.01, pool ? pool.getMuscleEfficiency(char.properties) : 0.25);
        let metabolicJoules = Math.max(5, mechWorkJoules / poolEfficiency);
        if (pool && pool.enabled) {
          const throwCap = char.throwModule.maxPowerProp.get(char.properties);
          const currentStamina = pool.currentStaminaProp.get(char.properties);
          const poolEnergy = pool.infiniteEnergy ? Infinity : pool.getCurrentEnergy(char.properties);
          const maxDeliverable = Math.min(
            throwCap * char.strength,
            currentStamina,
            poolEnergy
          );
          metabolicJoules = Math.min(maxDeliverable, metabolicJoules);
          if (pool.isExhausted || !pool.canSatisfyFullEnergy(metabolicJoules, 0.08, char.properties)) {
            return null;
          }
        }
        return {
          id: "anticipated_throw",
          abilityId: "throw",
          name: "Throw",
          color: "#f43f5e",
          amount: Math.round(metabolicJoules),
          isBurst: true,
          isPositive: false,
          order: 950
        };
      }
    }
    return null;
  }
  static syncHeldObjectTransform(char, arena2) {
    if (char.heldObject) {
      const heldPos = ThrowCapability.calculateHeldObjectPosition(char, arena2);
      char.heldObject.position.x = heldPos.x;
      char.heldObject.position.y = heldPos.y;
      char.heldObject.position.z = heldPos.z;
      char.heldObject.velocity.x = char.velocity.x;
      char.heldObject.velocity.y = char.velocity.y;
      char.heldObject.verticalVelocity = 0;
    }
  }
  static updateTrajectoryPreview(char, isAimingInput, aimTargetPos, canAimThrow, isLaserModeActive, arena2, entities, autoLock = false, lockedAimPos = null, aimLockDelta = 0) {
    var _a, _b, _c, _d, _e, _f, _g;
    const preservedFacing = char.facingAngle;
    char.isAiming = isAimingInput;
    char.aimTarget = isAimingInput ? aimTargetPos : null;
    if (!isLaserModeActive && char.heldObject && canAimThrow && char.throwModule && char.throwModule.enabled && char.hasStrength && isAimingInput && aimTargetPos) {
      const throwBlock = (_e = ((_b = (_a = char.controlSchema) == null ? void 0 : _a.gamepad) == null ? void 0 : _b.blocks) || ((_d = (_c = char.controlSchema) == null ? void 0 : _c.keyboardMouse) == null ? void 0 : _d.blocks)) == null ? void 0 : _e.find(
        (b) => b.type === "throw"
      );
      const shouldCheckCancel = Boolean(throwBlock == null ? void 0 : throwBlock.enableProximityCancel);
      const cancelRadius = (throwBlock == null ? void 0 : throwBlock.cancelRadius) ?? Math.max(1, (char.colliderRadius ?? 0.35) + 0.65);
      if (char.isChargingThrow) {
        if (shouldCheckCancel) {
          const aimDx = aimTargetPos.x - char.position.x;
          const aimDy = aimTargetPos.y - char.position.y;
          const distToAim = Math.hypot(aimDx, aimDy);
          if (distToAim < cancelRadius) {
            char.activeTrajectory = null;
            char.isThrowCancelZone = true;
            if (char.isSteeringCursor) char.facingAngle = preservedFacing;
            return;
          }
        }
        char.isThrowCancelZone = false;
        const clearTraj = ThrowCapability.findLowestEnergyWallClearTrajectory(
          char,
          arena2,
          aimTargetPos.x,
          aimTargetPos.y,
          entities,
          autoLock,
          lockedAimPos,
          aimLockDelta
        );
        const startRatio = char.savedArcRatio ?? char.throwModule.savedArcRatio ?? 0.5;
        const flattestBlocked = Boolean((_f = clearTraj == null ? void 0 : clearTraj.flattestPoints) == null ? void 0 : _f.some((pt) => pt.collidesWall));
        const now = performance.now();
        const start = char.throwChargeStartTime ?? now;
        const holdMs = Math.max(0, now - start);
        const chargeDurationMs = 700;
        const chargeProgress = Math.min(1, holdMs / chargeDurationMs);
        char.throwChargeProgress = chargeProgress;
        const targetRatio = flattestBlocked ? 1 : 0;
        const chargedRatio = startRatio + (targetRatio - startRatio) * chargeProgress;
        char.throwChargingTowards = flattestBlocked ? "steepest" : "flattest";
        char.throwModule.hasUserSetArcRatio = true;
        char.throwModule.savedArcRatio = chargedRatio;
        char.hasUserSetArcRatio = true;
        char.savedArcRatio = chargedRatio;
        char.activeTrajectory = chargeProgress > 1e-3 ? char.throwModule.calculateTrajectory(
          char,
          aimTargetPos.x,
          aimTargetPos.y,
          arena2,
          entities ?? arena2.entities,
          arena2.visualAltitudeScale,
          autoLock,
          lockedAimPos,
          aimLockDelta
        ) : clearTraj;
        if (char.activeTrajectory) {
          char.activeTrajectory.chargingTowards = char.throwChargingTowards;
        }
      } else if (char.isHoldingThrowRelease) {
        if (shouldCheckCancel) {
          const aimDx = aimTargetPos.x - char.position.x;
          const aimDy = aimTargetPos.y - char.position.y;
          const distToAim = Math.hypot(aimDx, aimDy);
          if (distToAim < cancelRadius) {
            char.activeTrajectory = null;
            char.isThrowCancelZone = true;
            if (char.isSteeringCursor) char.facingAngle = preservedFacing;
            return;
          }
        }
        char.isThrowCancelZone = false;
        char.hasUserSetArcRatio = false;
        if (char.throwModule) {
          char.throwModule.hasUserSetArcRatio = false;
        }
        char.throwChargingTowards = void 0;
        ThrowCapability.findLowestEnergyWallClearTrajectory(
          char,
          arena2,
          aimTargetPos.x,
          aimTargetPos.y,
          entities,
          autoLock,
          lockedAimPos,
          aimLockDelta
        );
      } else if (char.isAimingWallClear) {
        if (shouldCheckCancel) {
          const aimDx = aimTargetPos.x - char.position.x;
          const aimDy = aimTargetPos.y - char.position.y;
          const distToAim = Math.hypot(aimDx, aimDy);
          if (distToAim < cancelRadius) {
            char.activeTrajectory = null;
            char.isThrowCancelZone = true;
            if (char.isSteeringCursor) char.facingAngle = preservedFacing;
            return;
          }
        }
        char.isThrowCancelZone = false;
        ThrowCapability.findLowestEnergyWallClearTrajectory(
          char,
          arena2,
          aimTargetPos.x,
          aimTargetPos.y,
          entities,
          autoLock,
          lockedAimPos,
          aimLockDelta
        );
      } else if (char.isTriggerPullThrowing) {
        if (shouldCheckCancel) {
          const aimDx = aimTargetPos.x - char.position.x;
          const aimDy = aimTargetPos.y - char.position.y;
          const distToAim = Math.hypot(aimDx, aimDy);
          if (distToAim < cancelRadius) {
            char.activeTrajectory = null;
            char.isThrowCancelZone = true;
            if (char.isSteeringCursor) char.facingAngle = preservedFacing;
            return;
          }
        }
        char.isThrowCancelZone = false;
        const clearTraj = ThrowCapability.findLowestEnergyWallClearTrajectory(
          char,
          arena2,
          aimTargetPos.x,
          aimTargetPos.y,
          entities,
          autoLock,
          lockedAimPos,
          aimLockDelta
        );
        const startRatio = char.savedArcRatio ?? char.throwModule.savedArcRatio ?? 0.5;
        const flattestBlocked = Boolean((_g = clearTraj == null ? void 0 : clearTraj.flattestPoints) == null ? void 0 : _g.some((pt) => pt.collidesWall));
        const targetRatio = flattestBlocked ? 1 : 0;
        const f = char.triggerThrowPower ?? 0;
        const scaledRatio = startRatio + (targetRatio - startRatio) * f;
        char.throwChargingTowards = flattestBlocked ? "steepest" : "flattest";
        char.throwModule.hasUserSetArcRatio = true;
        char.throwModule.savedArcRatio = scaledRatio;
        char.hasUserSetArcRatio = true;
        char.savedArcRatio = scaledRatio;
        char.activeTrajectory = f > 1e-3 ? char.throwModule.calculateTrajectory(
          char,
          aimTargetPos.x,
          aimTargetPos.y,
          arena2,
          entities ?? arena2.entities,
          arena2.visualAltitudeScale,
          autoLock,
          lockedAimPos,
          aimLockDelta
        ) : clearTraj;
        if (char.activeTrajectory) {
          char.activeTrajectory.chargingTowards = char.throwChargingTowards;
          char.activeTrajectory.isTriggerPull = true;
          if (clearTraj) {
            char.activeTrajectory.optimalTrajectoryPoints = clearTraj.points;
            char.activeTrajectory.flattestBlocked = flattestBlocked;
          }
        }
      } else {
        char.isThrowCancelZone = false;
        char.throwChargingTowards = void 0;
        if (char.hasUserSetArcRatio && char.savedArcRatio !== void 0) {
          char.throwModule.hasUserSetArcRatio = true;
          char.throwModule.savedArcRatio = char.savedArcRatio;
        } else if (char.throwModule.hasUserSetArcRatio) {
          char.hasUserSetArcRatio = true;
          char.savedArcRatio = char.throwModule.savedArcRatio;
        }
        char.activeTrajectory = char.throwModule.calculateTrajectory(
          char,
          aimTargetPos.x,
          aimTargetPos.y,
          arena2,
          entities ?? arena2.entities,
          arena2.visualAltitudeScale,
          autoLock,
          lockedAimPos,
          aimLockDelta
        );
      }
      if (canAimThrow && lockedAimPos && char.heldObject) {
        const lockDx = lockedAimPos.x - char.position.x;
        const lockDy = lockedAimPos.y - char.position.y;
        if (Math.hypot(lockDx, lockDy) > 0.05) {
          char.facingAngle = Math.atan2(lockDy, lockDx);
          const heldPos = ThrowCapability.calculateHeldObjectPosition(char, arena2);
          char.heldObject.position.x = heldPos.x;
          char.heldObject.position.y = heldPos.y;
          char.heldObject.position.z = heldPos.z;
        }
      }
    } else {
      char.activeTrajectory = null;
      char.isThrowCancelZone = false;
      char.throwChargingTowards = void 0;
    }
    if (char.isSteeringCursor) {
      char.facingAngle = preservedFacing;
    }
  }
  static calculateHeldObjectPosition(char, arena2) {
    if (!char.heldObject) {
      return { x: char.position.x, y: char.position.y, z: char.position.z };
    }
    const defaultHandDist = char.colliderRadius + char.heldObject.colliderRadius * 0.5 + 0.08;
    const dirX = Math.cos(char.facingAngle);
    const dirY = Math.sin(char.facingAngle);
    const heldZ = char.heldObject.hasVerticalPosition ? char.position.z + 0.45 : 0;
    if (!arena2 || char.position.z >= arena2.wallHeight) {
      return {
        x: char.position.x + dirX * defaultHandDist,
        y: char.position.y + dirY * defaultHandDist,
        z: heldZ
      };
    }
    const objRadius = char.heldObject.colliderRadius > 0 ? char.heldObject.colliderRadius : 0.26;
    const safetyMargin = 0.12;
    const requiredClearance = objRadius + safetyMargin;
    const extraThrowClearback = 0.08;
    let minHitDistance = Infinity;
    for (const wall of arena2.walls) {
      const x1 = wall.x;
      const x2 = wall.x + wall.width;
      const y1 = wall.y;
      const y2 = wall.y + wall.height;
      const R = requiredClearance;
      if (dirX > 1e-4 && char.position.x < x1 - R) {
        const t = (x1 - R - char.position.x) / dirX;
        if (t > 0 && t < minHitDistance) {
          const hitY = char.position.y + t * dirY;
          if (hitY >= y1 && hitY <= y2) minHitDistance = t;
        }
      }
      if (dirX < -1e-4 && char.position.x > x2 + R) {
        const t = (x2 + R - char.position.x) / dirX;
        if (t > 0 && t < minHitDistance) {
          const hitY = char.position.y + t * dirY;
          if (hitY >= y1 && hitY <= y2) minHitDistance = t;
        }
      }
      if (dirY > 1e-4 && char.position.y < y1 - R) {
        const t = (y1 - R - char.position.y) / dirY;
        if (t > 0 && t < minHitDistance) {
          const hitX = char.position.x + t * dirX;
          if (hitX >= x1 && hitX <= x2) minHitDistance = t;
        }
      }
      if (dirY < -1e-4 && char.position.y > y2 + R) {
        const t = (y2 + R - char.position.y) / dirY;
        if (t > 0 && t < minHitDistance) {
          const hitX = char.position.x + t * dirX;
          if (hitX >= x1 && hitX <= x2) minHitDistance = t;
        }
      }
      const corners = [
        { kx: x1, ky: y1, isExterior: (px, py) => px <= x1 && py <= y1 },
        { kx: x2, ky: y1, isExterior: (px, py) => px >= x2 && py <= y1 },
        { kx: x1, ky: y2, isExterior: (px, py) => px <= x1 && py >= y2 },
        { kx: x2, ky: y2, isExterior: (px, py) => px >= x2 && py >= y2 }
      ];
      for (const corner of corners) {
        const wx = char.position.x - corner.kx;
        const wy = char.position.y - corner.ky;
        const B = 2 * (dirX * wx + dirY * wy);
        const C_quad = wx * wx + wy * wy - R * R;
        const disc = B * B - 4 * C_quad;
        if (disc >= 0) {
          const sqrtDisc = Math.sqrt(disc);
          const t1 = (-B - sqrtDisc) * 0.5;
          if (t1 > 0 && t1 < minHitDistance) {
            const px = char.position.x + t1 * dirX;
            const py = char.position.y + t1 * dirY;
            if (corner.isExterior(px, py)) {
              minHitDistance = t1;
            }
          }
        }
      }
    }
    let safeDistance = defaultHandDist;
    if (minHitDistance < Infinity) {
      safeDistance = Math.max(0, Math.min(defaultHandDist, minHitDistance - extraThrowClearback));
    }
    let targetX = char.position.x + dirX * safeDistance;
    let targetY = char.position.y + dirY * safeDistance;
    for (let iter = 0; iter < 3; iter++) {
      let adjusted = false;
      for (const wall of arena2.walls) {
        const closestX = Math.max(wall.x, Math.min(targetX, wall.x + wall.width));
        const closestY = Math.max(wall.y, Math.min(targetY, wall.y + wall.height));
        const dx = targetX - closestX;
        const dy = targetY - closestY;
        const distSq = dx * dx + dy * dy;
        if (distSq < objRadius * objRadius) {
          adjusted = true;
          const dist = Math.sqrt(distSq);
          if (dist > 1e-4) {
            targetX += dx / dist * (objRadius + 0.02 - dist);
            targetY += dy / dist * (objRadius + 0.02 - dist);
          } else {
            targetX = char.position.x;
            targetY = char.position.y;
          }
        }
      }
      if (!adjusted) break;
    }
    return { x: targetX, y: targetY, z: heldZ };
  }
  /**
   * Calculates the lowest energy trajectory that does not collide with any wall, if one exists.
   * If the base optimal trajectory is already collision-free, it is returned directly.
   * Otherwise, samples candidate arc ratios to find the trajectory that reaches the target
   * without colliding with a wall while minimizing launch kinetic energy.
   * If no wall-clearing trajectory exists, falls back to the baseline optimal trajectory.
   */
  static findLowestEnergyWallClearTrajectory(char, arena2, aimTargetX, aimTargetY, entities, autoLock = false, lockedAimPos = null, aimLockDelta = 0) {
    var _a, _b, _c, _d, _e, _f;
    if (!char.throwModule || !char.throwModule.enabled) {
      return null;
    }
    const preservedFacing = char.facingAngle;
    char.throwModule.hasUserSetArcRatio = false;
    const baseTraj = char.throwModule.calculateTrajectory(
      char,
      aimTargetX,
      aimTargetY,
      arena2,
      entities ?? arena2.entities,
      arena2.visualAltitudeScale,
      autoLock,
      lockedAimPos,
      aimLockDelta
    );
    if (!baseTraj) {
      char.activeTrajectory = null;
      if (char.isSteeringCursor) char.facingAngle = preservedFacing;
      return null;
    }
    const isBaseClear = !baseTraj.isBlockedByWall && !baseTraj.points.some((p) => p.collidesWall);
    if (isBaseClear) {
      const optRatio = char.throwModule.savedArcRatio ?? 0.5;
      char.throwModule.hasUserSetArcRatio = true;
      char.throwModule.savedArcRatio = optRatio;
      char.hasUserSetArcRatio = true;
      char.savedArcRatio = optRatio;
      char.activeTrajectory = baseTraj;
      if (char.isSteeringCursor) char.facingAngle = preservedFacing;
      return baseTraj;
    }
    let bestRatio = null;
    let bestEnergy = Infinity;
    let bestTraj = null;
    const samples = 25;
    for (let i = 0; i <= samples; i++) {
      const r = i / samples;
      char.throwModule.hasUserSetArcRatio = true;
      char.throwModule.savedArcRatio = r;
      const candTraj = char.throwModule.calculateTrajectory(
        char,
        aimTargetX,
        aimTargetY,
        arena2,
        entities ?? arena2.entities,
        arena2.visualAltitudeScale,
        autoLock,
        lockedAimPos,
        aimLockDelta
      );
      if (candTraj && !candTraj.isBlockedByWall && !candTraj.points.some((p) => p.collidesWall)) {
        const vx = ((_a = candTraj.launchVel) == null ? void 0 : _a.vx) ?? 0;
        const vy = ((_b = candTraj.launchVel) == null ? void 0 : _b.vy) ?? 0;
        const vz = ((_c = candTraj.launchVel) == null ? void 0 : _c.vz) ?? 0;
        const energy = vx * vx + vy * vy + vz * vz;
        if (energy < bestEnergy) {
          bestEnergy = energy;
          bestRatio = r;
          bestTraj = candTraj;
        }
      }
    }
    if (bestRatio !== null) {
      const rCenter = bestRatio;
      for (let offset = -0.03; offset <= 0.03; offset += 0.01) {
        const r = Math.max(0, Math.min(1, rCenter + offset));
        char.throwModule.hasUserSetArcRatio = true;
        char.throwModule.savedArcRatio = r;
        const fineTraj = char.throwModule.calculateTrajectory(
          char,
          aimTargetX,
          aimTargetY,
          arena2,
          entities ?? arena2.entities,
          arena2.visualAltitudeScale,
          autoLock,
          lockedAimPos,
          aimLockDelta
        );
        if (fineTraj && !fineTraj.isBlockedByWall && !fineTraj.points.some((p) => p.collidesWall)) {
          const vx = ((_d = fineTraj.launchVel) == null ? void 0 : _d.vx) ?? 0;
          const vy = ((_e = fineTraj.launchVel) == null ? void 0 : _e.vy) ?? 0;
          const vz = ((_f = fineTraj.launchVel) == null ? void 0 : _f.vz) ?? 0;
          const energy = vx * vx + vy * vy + vz * vz;
          if (energy < bestEnergy) {
            bestEnergy = energy;
            bestRatio = r;
            bestTraj = fineTraj;
          }
        }
      }
      char.throwModule.hasUserSetArcRatio = true;
      char.throwModule.savedArcRatio = bestRatio;
      char.hasUserSetArcRatio = true;
      char.savedArcRatio = bestRatio;
      char.activeTrajectory = bestTraj;
      if (char.isSteeringCursor) char.facingAngle = preservedFacing;
      return bestTraj;
    }
    char.throwModule.hasUserSetArcRatio = false;
    char.hasUserSetArcRatio = false;
    char.activeTrajectory = baseTraj;
    if (char.isSteeringCursor) char.facingAngle = preservedFacing;
    return baseTraj;
  }
}
class LaserCapability {
  static getAnticipatedModifier(char) {
    if (char.laserModule && char.laserModule.enabled && char.laserModule.isAiming && !char.laserModule.isFiring) {
      const demandedPower = char.laserModule.calculateDemandedPower(
        char.properties,
        char.laserPowerFraction > 0 ? char.laserPowerFraction : 1
      );
      const pool = char.energyPool;
      if (demandedPower > 0 && (!pool || !pool.isExhausted)) {
        return {
          id: "anticipated_laser",
          abilityId: "laser_blast",
          name: "Laser",
          color: "#06b6d4",
          amount: Math.round(demandedPower),
          isBurst: false,
          isPositive: false,
          order: 940
        };
      }
    }
    return null;
  }
  static isLaserModeActive(char) {
    return Boolean(
      char.isLaserAiming || char.isLaserFiring || char.laserModule && (char.laserModule.isAiming || char.laserModule.isFiring)
    );
  }
  static actuate(char, dt, arena2) {
    if (char.laserModule && char.laserModule.enabled) {
      char.laserModule.update(
        dt,
        char,
        arena2,
        char.laserAimTarget,
        char.isLaserAiming,
        char.isLaserFiring,
        char.laserCandidateEntities,
        0,
        char.laserPowerFraction
      );
      char.isLaserFiring = char.laserModule.isFiring;
    }
  }
}
class MeleeCapability {
  static executeMelee(char, arena2, potentialTargets, dirX, dirY) {
    if (!char.meleeModule || !char.meleeModule.enabled) return null;
    const dx = dirX !== void 0 ? dirX : Math.cos(char.facingAngle ?? 0);
    const dy = dirY !== void 0 ? dirY : Math.sin(char.facingAngle ?? 0);
    return char.meleeModule.executePunch(char, dx, dy, potentialTargets, arena2);
  }
  static actuate(char, arena2) {
    if (char.meleeModule && char.meleeModule.enabled && char.isMeleeRequested) {
      const candidates = char.meleeCandidateEntities ?? arena2.entities;
      const dirX = char.meleeAimDir ? char.meleeAimDir.x : Math.cos(char.facingAngle ?? 0);
      const dirY = char.meleeAimDir ? char.meleeAimDir.y : Math.sin(char.facingAngle ?? 0);
      const mag = Math.hypot(dirX, dirY);
      const normDirX = mag > 1e-3 ? dirX / mag : Math.cos(char.facingAngle ?? 0);
      const normDirY = mag > 1e-3 ? dirY / mag : Math.sin(char.facingAngle ?? 0);
      const hitResult = char.meleeModule.executePunch(char, normDirX, normDirY, candidates, arena2);
      if (hitResult && char.onPunchExecuted) {
        char.onPunchExecuted(hitResult, normDirX, normDirY);
      }
    }
  }
}
class Character extends GameObject {
  constructor(options = {}) {
    var _a;
    const initialColor = options.color ?? "#f59e0b";
    const determinedRole = options.role ?? (options.controllerType === "none" ? "dummy" : options.controllerType === "remote" ? "remote_player" : options.controllerType === "ai" ? "local_ai" : "local_player");
    const initialCharacterModule = options.characterModule !== void 0 ? options.characterModule : new CharacterModule({ role: determinedRole });
    const initX = options.position ? options.position.x : options.x ?? 5;
    const initY = options.position ? options.position.y : options.y ?? 7;
    const initZ = ((_a = options.position) == null ? void 0 : _a.z) ?? 0;
    super({
      id: options.id,
      name: options.name ?? (determinedRole === "dummy" ? "Sparring Dummy" : `Player ${options.playerNumber ?? 1}`),
      position: { x: initX, y: initY, z: initZ },
      mass: options.mass ?? 1.2,
      colliderRadius: options.colliderRadius ?? 0.44,
      color: initialColor,
      bounceMod: 0.1,
      dynamicGroundFrictionMod: options.dynamicGroundFrictionMod ?? 2,
      staticGroundFrictionMod: options.staticGroundFrictionMod ?? 2,
      damageSolverModule: options.damageSolverModule !== void 0 ? options.damageSolverModule : new DamageSolverModule(),
      characterModule: initialCharacterModule
    });
    __publicField(this, "strengthProp");
    __publicField(this, "facingAngle");
    // Angle in radians
    __publicField(this, "lastMovementInputAngle", 0);
    // Most recent movement input angle in radians
    __publicField(this, "lastThrowAimAngle");
    // Preserved direction angle from character to cursor when throw mode was active
    __publicField(this, "savedArcRatio");
    // Preserved trajectory ratio between min and max arcs (never reset per character)
    __publicField(this, "hasUserSetArcRatio", false);
    __publicField(this, "isChargingThrow", false);
    __publicField(this, "throwChargeStartTime", null);
    __publicField(this, "throwChargeProgress", 0);
    __publicField(this, "throwChargingTowards");
    __publicField(this, "isThrowCancelZone", false);
    __publicField(this, "isAimingWallClear", false);
    __publicField(this, "isHoldingThrowRelease", false);
    __publicField(this, "isTriggerPullThrowing", false);
    __publicField(this, "triggerThrowPower", 0);
    __publicField(this, "hasDiedAwaitingNewPickup", false);
    __publicField(this, "_heldObject", null);
    __publicField(this, "isCharacter", true);
    __publicField(this, "isActivelyWalking", false);
    __publicField(this, "isClimbInputHeld", false);
    __publicField(this, "movementInput", { x: 0, y: 0 });
    __publicField(this, "isSprinting", false);
    __publicField(this, "onSprintChange");
    // Base mass when not carrying anything
    __publicField(this, "baseMass", 1.2);
    /** Spawn location used when respawning or resetting */
    __publicField(this, "spawnPos");
    // Removable Modules
    __publicField(this, "walkingModule");
    __publicField(this, "pickupModule");
    __publicField(this, "throwModule");
    __publicField(this, "jumpModule");
    __publicField(this, "wallEdgeAssistModule");
    __publicField(this, "climbingModule");
    __publicField(this, "healthModule");
    __publicField(this, "consumeModule", new ConsumeModule());
    __publicField(this, "laserModule", null);
    __publicField(this, "energyPool");
    /** Toggle indicating if jumping consumes energy from EnergyPool */
    __publicField(this, "jumpConsumesEnergy", true);
    /** Whether jumping is allowed to run at partial impulse when pool power cannot provide 100% */
    __publicField(this, "jumpAllowPartialPower", false);
    __publicField(this, "jumpMaxPowerProp");
    // Player identity & multiplayer slot
    __publicField(this, "controllerType", "local");
    __publicField(this, "playerId", "keyboard");
    __publicField(this, "playerNumber", 1);
    __publicField(this, "playerColor", "#f59e0b");
    __publicField(this, "hasCustomName", false);
    // Aiming state
    __publicField(this, "isAiming");
    __publicField(this, "aimTarget");
    __publicField(this, "activeTrajectory");
    __publicField(this, "isAimingTrajectory", false);
    // Laser aiming/firing inputs processed per tick
    __publicField(this, "isLaserAiming", false);
    __publicField(this, "isLaserFiring", false);
    __publicField(this, "laserAimTarget", null);
    __publicField(this, "laserCandidateEntities");
    __publicField(this, "laserPowerFraction", 1);
    // Gamepad cursor mode state
    __publicField(this, "isCursorModeActive", false);
    __publicField(this, "isSteeringCursor", false);
    // Melee attack inputs processed per tick
    __publicField(this, "meleeModule", null);
    __publicField(this, "isMeleeRequested", false);
    __publicField(this, "meleeAimDir", null);
    __publicField(this, "meleeCandidateEntities");
    __publicField(this, "onPunchExecuted");
    /**
     * Currently active modal or stage state set by custom control schemes (defaults to immutable "none").
     */
    __publicField(this, "stagedAction", "none");
    /**
     * Named stage set dictionary supporting multiple concurrent stage groups.
     */
    __publicField(this, "stagedActions", { default: "none" });
    /**
     * Character-specific control schema loaded from its archetype or Prefab.
     */
    __publicField(this, "controlSchema");
    __publicField(this, "isUsingItem", false);
    __publicField(this, "eatRateWatts", 0);
    this.controllerType = options.controllerType ?? (determinedRole === "dummy" ? "none" : "local");
    this.playerId = options.playerId ?? (determinedRole === "dummy" ? "dummy-1" : "keyboard");
    this.playerNumber = options.playerNumber !== void 0 ? options.playerNumber : determinedRole === "dummy" ? 0 : 1;
    this.playerColor = initialColor;
    const isExplicitCustom = options.name ? !/^Player(\s+\d+)?$/i.test(options.name.trim()) && !/^Controller\s+#\d+$/i.test(options.name.trim()) && !/Xbox|XInput|DualShock|DualSense|PlayStation|Wireless Controller|Gamepad|Joystick|STANDARD GAMEPAD|Vendor:|Product:/i.test(options.name) : false;
    this.hasCustomName = options.hasCustomName ?? isExplicitCustom;
    this.baseMass = options.mass ?? 1.2;
    this.facingAngle = 0;
    this.heldObject = null;
    this.isAiming = false;
    this.aimTarget = null;
    this.activeTrajectory = null;
    this.strengthProp = new DynamicProperty(options.strength ?? (determinedRole === "dummy" ? 0 : 1));
    this.properties.add("strength", this.strengthProp.literalValue);
    if (determinedRole === "dummy") {
      this.walkingModule = null;
      this.pickupModule = null;
      this.throwModule = null;
      this.jumpModule = null;
      this.wallEdgeAssistModule = null;
    } else {
      this.walkingModule = new WalkingModule({
        walkConsumesEnergy: false,
        walkAllowPartialPower: false,
        sprintConsumesEnergy: true,
        sprintAllowPartialPower: true
      });
      this.pickupModule = new PickupModule({ consumesEnergy: false, allowPartialPower: false });
      this.throwModule = new ThrowModule({ consumesEnergy: true });
      this.jumpModule = new JumpModule();
      this.jumpConsumesEnergy = true;
      this.jumpAllowPartialPower = true;
      this.wallEdgeAssistModule = new WallEdgeAssistModule();
    }
    this.jumpMaxPowerProp = new DynamicProperty(1200);
    this.climbingModule = null;
    this.healthModule = new HealthModule({ consumesEnergy: true, allowPartialPower: true });
    this.energyPool = new EnergyPool();
    this.properties.add("joulesPerHp", this.healthModule.joulesPerHp);
    this.properties.add("hpPerJoule", this.healthModule.joulesPerHp);
    this.properties.add("muscleEfficiency", this.energyPool.muscleEfficiency);
    if (!this.damageSolverModule) {
      this.damageSolverModule = new DamageSolverModule();
    }
    this.meleeModule = new MeleeModule({
      maxForce: 350,
      punchFrequency: 4,
      reach: 1.2,
      width: 0.8,
      maxPower: 2e3
    });
    this.properties.add("meleeMaxForce", this.meleeModule.maxForce);
    this.properties.add("meleeFrequency", this.meleeModule.punchFrequency);
    this.properties.add("meleeReach", this.meleeModule.reach);
    this.properties.add("meleeWidth", this.meleeModule.width);
    this.properties.add("meleeMaxPower", this.meleeModule.maxPower);
    if (determinedRole !== "dummy") {
      this.laserModule = new LaserModule({
        maxPower: 2e3
      });
      this.properties.add("laserDamageRate", this.laserModule.damageRate);
      this.properties.add("laserMaxDamageRate", this.laserModule.maxDamageRate);
      this.properties.add("laserThickness", this.laserModule.thickness);
      this.properties.add("laserMaxPower", this.laserModule.maxPower);
    }
  }
  get hasStrength() {
    return this.strength > 0;
  }
  get strength() {
    return this.strengthProp.get(this.properties);
  }
  set strength(val) {
    this.strengthProp.set(Math.max(0.1, val), this.properties);
  }
  get heldObject() {
    return this._heldObject;
  }
  set heldObject(obj) {
    this._heldObject = obj;
    if (obj) {
      this.hasDiedAwaitingNewPickup = false;
    }
  }
  setSprinting(sprint) {
    var _a;
    if (this.isSprinting !== sprint) {
      this.isSprinting = sprint;
      (_a = this.onSprintChange) == null ? void 0 : _a.call(this, this.isSprinting);
    }
  }
  /**
   * Effective mass: base character mass plus the mass of any currently carried object.
   */
  get mass() {
    const base = this.hasMass && this.rigidbodyModule ? this.rigidbodyModule.massProp.get(this.properties) : 0;
    const carried = this.heldObject && this.heldObject.hasMass ? this.heldObject.mass : 0;
    return base + carried;
  }
  set mass(val) {
    this.baseMass = Math.max(0.1, val);
    if (this.rigidbodyModule) {
      this.rigidbodyModule.massProp.set(this.baseMass, this.properties);
    }
  }
  get carriedMass() {
    return this.heldObject && this.heldObject.hasMass ? this.heldObject.mass : 0;
  }
  get hangDistance() {
    return this.wallEdgeAssistModule ? this.wallEdgeAssistModule.hangDistanceProp.get(this.properties) : 0.1;
  }
  set hangDistance(val) {
    if (this.wallEdgeAssistModule) {
      this.wallEdgeAssistModule.hangDistanceProp.set(Math.max(0, val), this.properties);
    }
  }
  /** Backwards compatibility getter for energy bus references */
  get energyBus() {
    return this.energyPool;
  }
  get energyBusses() {
    const map = /* @__PURE__ */ new Map();
    if (this.energyPool) map.set(this.energyPool.id, this.energyPool);
    return map;
  }
  getEnergyBus(_busId) {
    return this.energyPool;
  }
  // Backwards-compatible aliases
  get jumpPowerCapacityProp() {
    return this.jumpMaxPowerProp;
  }
  set jumpPowerCapacityProp(prop) {
    this.jumpMaxPowerProp = prop;
  }
  get role() {
    return this.characterModule ? this.characterModule.role : "local_player";
  }
  set role(val) {
    if (this.characterModule) {
      this.characterModule.role = val;
    } else {
      this.characterModule = new CharacterModule({ role: val });
    }
  }
  get isDummy() {
    return this.role === "dummy";
  }
  getStage(group = "default") {
    return this.stagedActions[group] ?? (group === "default" ? this.stagedAction : "none") ?? "none";
  }
  setStage(group = "default", stage = "none") {
    if (!this.stagedActions) this.stagedActions = {};
    this.stagedActions[group] = stage;
    if (group === "default" || group === "main") {
      this.stagedAction = stage;
    }
  }
  /**
   * Retrieves any currently anticipated energy modifiers (e.g. previewing throw trajectory cost, charging laser, etc.).
   * Delegated to 1-to-1 capability slices in src/character/capabilities/.
   */
  getAnticipatedModifiers() {
    const list = [];
    const throwMod = ThrowCapability.getAnticipatedModifier(this);
    if (throwMod) list.push(throwMod);
    const laserMod = LaserCapability.getAnticipatedModifier(this);
    if (laserMod) list.push(laserMod);
    return list;
  }
  canConsumeHeldObject() {
    return this.consumeModule ? this.consumeModule.canConsume(this.heldObject) : false;
  }
  /**
   * Returns true if the currently held object has an inherent primary ability other than throw.
   */
  hasPrimaryItemAbility() {
    var _a, _b, _c, _d;
    if (!this.heldObject) return false;
    if ((_b = (_a = this.heldObject).hasPrimaryItemAbility) == null ? void 0 : _b.call(_a)) {
      const type = (_d = (_c = this.heldObject).getPrimaryItemAbilityType) == null ? void 0 : _d.call(_c);
      if (type === "consume") {
        return this.canConsumeHeldObject();
      }
      return true;
    }
    return this.canConsumeHeldObject();
  }
  /**
   * Returns true if the held object's primary ability does not require directional aiming (e.g. eating food).
   */
  isPrimaryAbilityNonDirectional() {
    var _a, _b, _c, _d;
    if (!this.heldObject) return false;
    if ((_b = (_a = this.heldObject).hasPrimaryItemAbility) == null ? void 0 : _b.call(_a)) {
      const type = (_d = (_c = this.heldObject).getPrimaryItemAbilityType) == null ? void 0 : _d.call(_c);
      if (type === "consume") {
        return this.consumeModule ? !this.consumeModule.involvesDirection : true;
      }
    }
    if (this.canConsumeHeldObject()) {
      return this.consumeModule ? !this.consumeModule.involvesDirection : true;
    }
    return false;
  }
  get isEatingFood() {
    return Boolean(this.canConsumeHeldObject() && this.isUsingItem);
  }
  get isConsumingItem() {
    return Boolean(this.canConsumeHeldObject() && this.isUsingItem);
  }
  /**
   * Actuates the primary item ability of the currently held object.
   * For any consumable object, its primary ability is to be consumed.
   */
  useHeldItemPrimaryAbility(dt, objects2, arena2) {
    var _a, _b;
    if (!this.heldObject) return false;
    if ((_b = (_a = this.heldObject).hasPrimaryItemAbility) == null ? void 0 : _b.call(_a)) {
      const res = this.heldObject.usePrimaryItemAbility(dt, this, objects2, arena2);
      if (res.success && res.watts !== void 0) {
        this.eatRateWatts = res.watts;
      }
      return res.success;
    }
    if (this.consumeModule && this.canConsumeHeldObject()) {
      const res = this.consumeModule.consume(dt, this, this.heldObject, objects2, arena2);
      this.eatRateWatts = res.watts;
      return true;
    }
    return false;
  }
  /**
   * Drops or unholds the currently held object safely.
   */
  unhold() {
    if (!this.heldObject) return null;
    const obj = this.heldObject;
    this.heldObject = null;
    obj.isHeld = false;
    obj.heldBy = null;
    return obj;
  }
  get jumpMaxPower() {
    return this.jumpMaxPowerProp.literalValue;
  }
  set jumpMaxPower(val) {
    this.jumpMaxPowerProp.literalValue = val;
  }
  getJumpMaxPower(registry) {
    return this.jumpMaxPowerProp.get(registry);
  }
  get jumpPowerCapacity() {
    return this.jumpMaxPowerProp.literalValue;
  }
  set jumpPowerCapacity(val) {
    this.jumpMaxPowerProp.literalValue = val;
  }
  getJumpPowerCapacity(registry) {
    return this.jumpMaxPowerProp.get(registry);
  }
  /**
   * Attempts to jump using JumpCapability.
   */
  jump(arena2, movementInput) {
    return JumpCapability.executeJump(this, arena2, movementInput);
  }
  /**
   * Attempts to execute a burst melee punch attack in the specified or current facing direction.
   */
  melee(arena2, potentialTargets, dirX, dirY) {
    return MeleeCapability.executeMelee(this, arena2, potentialTargets, dirX, dirY);
  }
  /**
   * Safely releases any held objects, clears references, and dismounts
   * when this character is removed from the arena.
   */
  cleanupBeforeRemoval() {
    if (this.heldObject) {
      this.heldObject.isHeld = false;
      this.heldObject.heldBy = null;
      this.heldObject = null;
    }
    if (this.isHeld && this.heldBy) {
      if (this.heldBy instanceof Character && this.heldBy.heldObject === this) {
        this.heldBy.heldObject = null;
      }
      this.isHeld = false;
      this.heldBy = null;
    }
    this.activeTrajectory = null;
    this.isActivelyWalking = false;
    this.isSprinting = false;
  }
  /**
   * Updates character facing direction:
   * Faces in the direction the player is aiming. If not aiming (or no aim function),
   * faces in the direction the player INTENDS to move (movement input), not post-collision velocity.
   */
  updateFacingDirection(isAimingInput, aimTargetPos, movementInput, hasAuthoredFacingAngle = false) {
    if (hasAuthoredFacingAngle || this.isSteeringCursor) return;
    if ((this.isLaserAiming || this.isLaserFiring) && this.laserAimTarget) {
      const dx = this.laserAimTarget.x - this.position.x;
      const dy = this.laserAimTarget.y - this.position.y;
      if (Math.hypot(dx, dy) > 0.05) {
        this.facingAngle = Math.atan2(dy, dx);
        return;
      }
    }
    const shouldFaceCursor = Boolean(this.heldObject && aimTargetPos && (isAimingInput || this.isAimingTrajectory));
    if (shouldFaceCursor && aimTargetPos) {
      const dx = aimTargetPos.x - this.position.x;
      const dy = aimTargetPos.y - this.position.y;
      if (Math.hypot(dx, dy) > 0.05) {
        this.facingAngle = Math.atan2(dy, dx);
        return;
      }
    }
    if (movementInput) {
      const inputMag = Math.hypot(movementInput.x, movementInput.y);
      if (inputMag > 0.05) {
        this.lastMovementInputAngle = Math.atan2(movementInput.y, movementInput.x);
        this.facingAngle = this.lastMovementInputAngle;
      }
    }
  }
  /**
   * Main character update tick.
   * Orchestrates 1-to-1 capability slices in a fixed deterministic order.
   */
  updateCharacter(dt, movementInput, isAimingInput, aimTargetPos, arena2, isClimbInput = false, entities, autoLock = false, lockedAimPos = null, aimLockDelta = 0, hasAuthoredFacingAngle = false) {
    this.movementInput.x = movementInput.x;
    this.movementInput.y = movementInput.y;
    this.isClimbInputHeld = isClimbInput;
    if (this.energyPool && this.energyPool.enabled) {
      this.energyPool.beginTick();
    }
    const canWalk = LocomotionCapability.registerDemand(this, movementInput);
    HealthRegenCapability.registerDemand(this);
    const canClimb = ClimbingCapability.registerDemand(this, isClimbInput, arena2);
    ClimbingCapability.actuate(this, canClimb, movementInput, isClimbInput, dt, arena2);
    const canJump = JumpCapability.canJump(this);
    if (isClimbInput && !this.isClimbing && canJump) {
      this.jump(arena2, movementInput);
    }
    LocomotionCapability.actuate(this, canWalk, movementInput, dt, arena2);
    this.updatePosition(dt, arena2);
    HealthRegenCapability.actuate(this, dt, arena2);
    if (isClimbInput && !this.isClimbing && canJump) {
      this.jump(arena2, movementInput);
    }
    LaserCapability.actuate(this, dt, arena2);
    MeleeCapability.actuate(this, arena2);
    if (this.energyPool && this.energyPool.enabled) {
      this.energyPool.update(dt, this.properties);
    }
    const canAimThrow = Boolean(isAimingInput || this.isAimingTrajectory);
    const targetFacePos = canAimThrow && lockedAimPos ? lockedAimPos : aimTargetPos;
    this.updateFacingDirection(isAimingInput, targetFacePos, movementInput, hasAuthoredFacingAngle);
    ThrowCapability.syncHeldObjectTransform(this, arena2);
    const isLaserModeActive = LaserCapability.isLaserModeActive(this);
    ThrowCapability.updateTrajectoryPreview(
      this,
      isAimingInput,
      aimTargetPos,
      canAimThrow,
      isLaserModeActive,
      arena2,
      entities,
      autoLock,
      lockedAimPos,
      aimLockDelta
    );
  }
  /**
   * Calculates the physical position of an object held in the character's hands.
   * Delegated to ThrowCapability.
   */
  calculateHeldObjectPosition(arena2) {
    return ThrowCapability.calculateHeldObjectPosition(this, arena2);
  }
  /**
   * Resets all dynamic properties and module states of the character
   * back to their original/maximum values (such as HP, energy pool, and stamina).
   */
  resetDynamicValues() {
    if (this.healthModule) {
      this.healthModule.reset(this.properties);
    }
    if (this.energyPool) {
      this.energyPool.reset(this.properties);
    }
    const origStrength = this.properties.get("strength");
    if (origStrength !== void 0) {
      this.strengthProp.set(origStrength, this.properties);
    }
  }
  /**
   * Primary entry point for dying and respawning.
   */
  dieAndRespawn(_arena, explicitPos) {
    var _a;
    if (this.heldObject) {
      if (_arena) {
        const dropPos = this.calculateHeldObjectPosition(_arena);
        this.heldObject.position.x = dropPos.x;
        this.heldObject.position.y = dropPos.y;
        this.heldObject.position.z = dropPos.z;
      } else {
        this.heldObject.position.x = this.position.x;
        this.heldObject.position.y = this.position.y;
        this.heldObject.position.z = this.position.z;
      }
      this.heldObject.velocity.x = 0;
      this.heldObject.velocity.y = 0;
      this.heldObject.verticalVelocity = 0;
      this.heldObject.isHeld = false;
      this.heldObject.heldBy = null;
      this.heldObject = null;
    }
    this.hasDiedAwaitingNewPickup = true;
    this.isClimbing = false;
    this.standingWall = null;
    if (this.wallEdgeAssistModule) {
      this.wallEdgeAssistModule.isAssistClampArmed = false;
      this.wallEdgeAssistModule.hasMovedOntoWall = false;
    }
    this.velocity = { x: 0, y: 0 };
    this.verticalVelocity = 0;
    const spawns = HealthModule.RESPAWN_SPAWNS;
    const picked = explicitPos ?? this.spawnPos ?? spawns[Math.floor(Math.random() * spawns.length)];
    const chosenSpawn = { x: picked.x, y: picked.y, z: picked.z ?? 0 };
    this.position.x = chosenSpawn.x;
    this.position.y = chosenSpawn.y;
    this.position.z = chosenSpawn.z;
    this.supportingSurfaceHeight = 0;
    this.isRespawnLocked = true;
    this.authoritativeRespawnPos = { ...chosenSpawn };
    this.isAwaitingRespawn = false;
    this.resetDynamicValues();
    if ((_a = this.healthModule) == null ? void 0 : _a.onDeathRespawn) {
      this.healthModule.onDeathRespawn(this, chosenSpawn);
    }
  }
}
class SweptMath {
  /**
   * Solves quadratic earliest Time-of-Impact for two moving spheres over interval dt.
   * Tests: || (pB0 + vB * t) - (pA0 + vA * t) ||^2 = (rA + rB)^2 for t in [0, dt].
   * Returns hit details if an impact occurs, or null if trajectories miss or separate.
   */
  static sweepCircleVsCircle(pA0, vA, rA, pB0, vB, rB, dt) {
    const minDist = rA + rB;
    const r0x = pB0.x - pA0.x;
    const r0y = pB0.y - pA0.y;
    const vRelX = vB.x - vA.x;
    const vRelY = vB.y - vA.y;
    const aQuad = vRelX * vRelX + vRelY * vRelY;
    const bQuad = 2 * (r0x * vRelX + r0y * vRelY);
    const cQuad = r0x * r0x + r0y * r0y - minDist * minDist;
    if (cQuad < -1e-4) {
      return null;
    }
    if (aQuad < 1e-7) {
      return null;
    }
    const disc = bQuad * bQuad - 4 * aQuad * cQuad;
    if (disc < 0) {
      return null;
    }
    const tHit = Math.max(0, (-bQuad - Math.sqrt(Math.max(0, disc))) / (2 * aQuad));
    if (tHit > dt) {
      return null;
    }
    const pAtX = pA0.x + vA.x * tHit;
    const pAtY = pA0.y + vA.y * tHit;
    const pBtX = pB0.x + vB.x * tHit;
    const pBtY = pB0.y + vB.y * tHit;
    const contactDx = pBtX - pAtX;
    const contactDy = pBtY - pAtY;
    const contactDist = Math.hypot(contactDx, contactDy);
    const normX = contactDist > 1e-4 ? contactDx / contactDist : 1;
    const normY = contactDist > 1e-4 ? contactDy / contactDist : 0;
    const velAlongNormal = vRelX * normX + vRelY * normY;
    if (velAlongNormal >= -1e-4) {
      return null;
    }
    return {
      tHit,
      contactDx,
      contactDy,
      contactDist,
      normX,
      normY,
      velAlongNormal
    };
  }
  /**
   * Tests contact between a moving circle and an axis-aligned bounding box wall.
   */
  static testCircleVsWall(posX, posY, radius, velX, velY, wallX, wallY, wallWidth, wallHeight, dt) {
    const cx = Math.max(wallX, Math.min(posX, wallX + wallWidth));
    const cy = Math.max(wallY, Math.min(posY, wallY + wallHeight));
    const dx = posX - cx;
    const dy = posY - cy;
    const distSq = dx * dx + dy * dy;
    if (distSq >= radius * radius) {
      return null;
    }
    const dist = Math.sqrt(distSq);
    const normX = dist > 1e-4 ? dx / dist : velX < 0 ? 1 : -1;
    const normY = dist > 1e-4 ? dy / dist : velY < 0 ? 1 : -1;
    const overlap = radius - dist;
    const speed = Math.hypot(velX, velY);
    let alpha = 0;
    if (speed > 1e-4) {
      alpha = Math.min(1, Math.max(0, overlap / (speed * dt)));
    }
    return {
      tHitFraction: alpha,
      cx,
      cy,
      normX,
      normY,
      overlap
    };
  }
}
class CollisionResolver {
  /**
   * Resolves all pairwise freebody-to-freebody collisions across characters and dynamic objects.
   */
  static resolveEntityCollisions(entities, arena2, dt, draggedEntity = null, globalMode = "dynamic") {
    const count = entities.length;
    const now = performance.now();
    for (let i = 0; i < count; i++) {
      const e = entities[i];
      e.isSweptActive = globalMode === "continuous" || globalMode !== "naive" && globalMode !== "discrete" && e.getEffectiveCollisionMode(dt) === "continuous";
      if (e.lastCollisionTime > 0 && now - e.lastCollisionTime > 1200) {
        e.lastCollisionType = "none";
      }
    }
    if (globalMode === "naive") {
      this.resolveNaiveIterative(entities, arena2, draggedEntity);
      return;
    }
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const a = entities[i];
        const b = entities[j];
        if (a.isHeld || b.isHeld || a === draggedEntity || b === draggedEntity) continue;
        if (!a.hasCollider || !b.hasCollider) continue;
        if (a.isInFlight && a.lastThrower === b || b.isInFlight && b.lastThrower === a) {
          const sepDx = b.position.x - a.position.x;
          const sepDy = b.position.y - a.position.y;
          const sepRelVx = b.velocity.x - a.velocity.x;
          const sepRelVy = b.velocity.y - a.velocity.y;
          if (sepRelVx * sepDx + sepRelVy * sepDy >= -0.05) {
            continue;
          }
        }
        if (a.isSleeping && b.isSleeping) continue;
        const layerA = GameObject.getEntityLayer(a, arena2.wallHeight);
        const layerB = GameObject.getEntityLayer(b, arena2.wallHeight);
        if (a.isRestingOnSurface && b.isRestingOnSurface && layerA !== layerB) {
          continue;
        }
        const charHeight = 0.9;
        const zMinA = a.isCharacter ? Math.max(0, a.position.z, a.supportingSurfaceHeight ?? 0) : Math.max(0, a.position.z - a.colliderRadius);
        const zMaxA = a.isCharacter ? zMinA + charHeight : Math.max(zMinA + 0.1, a.position.z + a.colliderRadius);
        const zMinB = b.isCharacter ? Math.max(0, b.position.z, b.supportingSurfaceHeight ?? 0) : Math.max(0, b.position.z - b.colliderRadius);
        const zMaxB = b.isCharacter ? zMinB + charHeight : Math.max(zMinB + 0.1, b.position.z + b.colliderRadius);
        if (zMaxA < zMinB || zMaxB < zMinA) {
          continue;
        }
        let useContinuous = false;
        if (globalMode === "continuous") {
          useContinuous = true;
        } else if (globalMode === "discrete") {
          useContinuous = false;
        } else {
          const modeA = a.getEffectiveCollisionMode(dt);
          const modeB = b.getEffectiveCollisionMode(dt);
          useContinuous = modeA === "continuous" || modeB === "continuous";
        }
        if (useContinuous) {
          this.resolvePairContinuousSwept(a, b, arena2, dt);
        } else {
          this.resolvePairDiscreteTOI(a, b, arena2, dt);
        }
      }
    }
  }
  /**
   * Discrete Time-of-Impact (TOI) Rollback:
   * Objects have stepped forward. If overlapping, rolls both bodies back along their travel paths
   * to the exact tangent contact point, applies mass/restitution impulses, then finishes the step.
   */
  static resolvePairDiscreteTOI(a, b, _arena, _dt) {
    const minDist = a.colliderRadius + b.colliderRadius;
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;
    const distSq = dx * dx + dy * dy;
    if (distSq >= minDist * minDist) {
      return false;
    }
    if (a.isImmovable && b.isImmovable) {
      return false;
    }
    const dist = Math.sqrt(distSq);
    const overlap = minDist - dist;
    let normX;
    let normY;
    if (dist > 1e-4) {
      normX = dx / dist;
      normY = dy / dist;
    } else {
      normX = 1;
      normY = 0;
    }
    const relVx = (b.isImmovable ? 0 : b.velocity.x) - (a.isImmovable ? 0 : a.velocity.x);
    const relVy = (b.isImmovable ? 0 : b.velocity.y) - (a.isImmovable ? 0 : a.velocity.y);
    const velAlongNormal = relVx * normX + relVy * normY;
    const vzA = !a.isImmovable && a.hasVerticalVelocity ? a.verticalVelocity : 0;
    const vzB = !b.isImmovable && b.hasVerticalVelocity ? b.verticalVelocity : 0;
    const relVz = vzB - vzA;
    const isClosingVertically = b.position.z >= a.position.z && relVz < -0.05 || a.position.z >= b.position.z && relVz > 0.05;
    const closingVertSpeed = isClosingVertically ? Math.abs(relVz) : 0;
    let effectiveImpactSpeed = velAlongNormal < 0 ? Math.abs(velAlongNormal) : 0;
    if (closingVertSpeed > 0.05) {
      effectiveImpactSpeed = Math.hypot(effectiveImpactSpeed, closingVertSpeed);
    }
    const mA = a.hasMass ? a.mass : 0;
    const mB = b.hasMass ? b.mass : 0;
    const invA = a.isImmovable || !a.hasMass ? 0 : 1 / mA;
    const invB = b.isImmovable || !b.hasMass ? 0 : 1 / mB;
    const invSum = invA + invB;
    if (invSum > 1e-4) {
      const fixA = overlap * (invA / invSum);
      const fixB = overlap * (invB / invSum);
      if (!a.isImmovable) {
        a.position.x -= normX * fixA;
        a.position.y -= normY * fixA;
      }
      if (!b.isImmovable) {
        b.position.x += normX * fixB;
        b.position.y += normY * fixB;
      }
    } else {
      if (!a.isImmovable && !b.isImmovable) {
        const fix = overlap * 0.5;
        a.position.x -= normX * fix;
        a.position.y -= normY * fix;
        b.position.x += normX * fix;
        b.position.y += normY * fix;
      } else if (!a.isImmovable) {
        a.position.x -= normX * overlap;
        a.position.y -= normY * overlap;
      } else if (!b.isImmovable) {
        b.position.x += normX * overlap;
        b.position.y += normY * overlap;
      }
    }
    const isCharCharContact = a.isCharacter && b.isCharacter;
    if (isCharCharContact || velAlongNormal < 0 || closingVertSpeed > 0.05) {
      const nowContact = performance.now();
      a.lastCollisionTime = nowContact;
      b.lastCollisionTime = nowContact;
    }
    const bounceA = a.hasBounce && a.bounceMod !== null ? a.bounceMod : 0;
    const bounceB = b.hasBounce && b.bounceMod !== null ? b.bounceMod : 0;
    const restitution = isCharCharContact ? 0 : Math.max(bounceA, bounceB);
    const normZ = closingVertSpeed > 1e-3 ? b.position.z >= a.position.z ? 1 : -1 : 0;
    this.applyImpulseAtContact(
      a,
      b,
      normX,
      normY,
      velAlongNormal,
      restitution,
      "discrete_toi",
      effectiveImpactSpeed,
      normZ
    );
    return true;
  }
  /**
   * Continuous Swept Circle Collision (CCD):
   * Tests swept trajectories of both bodies over dt. If they collide during the tick,
   * advances to exact time of impact, reflects velocities, and steps remainder.
   */
  static resolvePairContinuousSwept(a, b, _arena, dt) {
    if (a.isImmovable && b.isImmovable) {
      return false;
    }
    const pA0 = {
      x: a.isImmovable ? a.position.x : a.position.x - a.velocity.x * dt,
      y: a.isImmovable ? a.position.y : a.position.y - a.velocity.y * dt
    };
    const pB0 = {
      x: b.isImmovable ? b.position.x : b.position.x - b.velocity.x * dt,
      y: b.isImmovable ? b.position.y : b.position.y - b.velocity.y * dt
    };
    const vA = { x: a.isImmovable ? 0 : a.velocity.x, y: a.isImmovable ? 0 : a.velocity.y };
    const vB = { x: b.isImmovable ? 0 : b.velocity.x, y: b.isImmovable ? 0 : b.velocity.y };
    const sweptHit = SweptMath.sweepCircleVsCircle(
      pA0,
      vA,
      a.colliderRadius,
      pB0,
      vB,
      b.colliderRadius,
      dt
    );
    if (!sweptHit) {
      const r0x = pB0.x - pA0.x;
      const r0y = pB0.y - pA0.y;
      const minDist = a.colliderRadius + b.colliderRadius;
      if (r0x * r0x + r0y * r0y < minDist * minDist) {
        return this.resolvePairDiscreteTOI(a, b, _arena, dt);
      }
      return false;
    }
    const { tHit, normX, normY, velAlongNormal } = sweptHit;
    if (!a.isImmovable) {
      a.position.x = pA0.x + a.velocity.x * tHit;
      a.position.y = pA0.y + a.velocity.y * tHit;
    }
    if (!b.isImmovable) {
      b.position.x = pB0.x + b.velocity.x * tHit;
      b.position.y = pB0.y + b.velocity.y * tHit;
    }
    const bounceA = a.hasBounce && a.bounceMod !== null ? a.bounceMod : 0;
    const bounceB = b.hasBounce && b.bounceMod !== null ? b.bounceMod : 0;
    const restitution = Math.max(bounceA, bounceB);
    const vzA = !a.isImmovable && a.hasVerticalVelocity ? a.verticalVelocity : 0;
    const vzB = !b.isImmovable && b.hasVerticalVelocity ? b.verticalVelocity : 0;
    const relVz = vzB - vzA;
    const isClosingVertically = b.position.z >= a.position.z && relVz < -0.05 || a.position.z >= b.position.z && relVz > 0.05;
    const closingVertSpeed = isClosingVertically ? Math.abs(relVz) : 0;
    let effectiveImpactSpeed = velAlongNormal < 0 ? Math.abs(velAlongNormal) : 0;
    if (closingVertSpeed > 0.05) {
      effectiveImpactSpeed = Math.hypot(effectiveImpactSpeed, closingVertSpeed);
    }
    const normZ = closingVertSpeed > 1e-3 ? b.position.z >= a.position.z ? 1 : -1 : 0;
    this.applyImpulseAtContact(
      a,
      b,
      normX,
      normY,
      velAlongNormal,
      restitution,
      "continuous_swept",
      effectiveImpactSpeed,
      normZ
    );
    const remDt = dt - tHit;
    if (!a.isImmovable) {
      a.position.x += a.velocity.x * remDt;
      a.position.y += a.velocity.y * remDt;
    }
    if (!b.isImmovable) {
      b.position.x += b.velocity.x * remDt;
      b.position.y += b.velocity.y * remDt;
    }
    return true;
  }
  /**
   * Resolves entity collision with an arena wall using discrete rollback or continuous sweep.
   */
  static resolveEntityWallCollision(entity, wall, _arena, dt, globalMode = "dynamic") {
    var _a, _b;
    if (!entity.hasCollider) return false;
    if (entity.position.z > wall.wallHeight) return false;
    const r = entity.colliderRadius;
    const mode = globalMode === "naive" ? "naive" : globalMode === "continuous" ? "continuous" : globalMode === "discrete" ? "discrete" : entity.getEffectiveCollisionMode(dt);
    const wallHit = SweptMath.testCircleVsWall(
      entity.position.x,
      entity.position.y,
      r,
      entity.velocity.x,
      entity.velocity.y,
      wall.x,
      wall.y,
      wall.width,
      wall.height,
      dt
    );
    if (!wallHit) {
      return false;
    }
    const { tHitFraction: alpha, cx, cy, normX, normY } = wallHit;
    const bRestitution = entity.hasBounce && entity.bounceMod !== null ? entity.bounceMod : entity.isCharacter ? 0.2 : 0;
    if (mode === "naive") {
      entity.position.x = cx + normX * r;
      entity.position.y = cy + normY * r;
      const vn2 = entity.velocity.x * normX + entity.velocity.y * normY;
      if (vn2 < 0) {
        entity.velocity.x -= (1 + bRestitution) * vn2 * normX;
        entity.velocity.y -= (1 + bRestitution) * vn2 * normY;
      }
      entity.lastCollisionType = "naive";
      return true;
    }
    entity.position.x = cx + normX * (r + 1e-3);
    entity.position.y = cy + normY * (r + 1e-3);
    const vn = entity.velocity.x * normX + entity.velocity.y * normY;
    if (vn < 0) {
      entity.velocity.x -= (1 + bRestitution) * vn * normX;
      entity.velocity.y -= (1 + bRestitution) * vn * normY;
    }
    const remDt = (1 - alpha) * dt;
    entity.position.x += entity.velocity.x * remDt;
    entity.position.y += entity.velocity.y * remDt;
    const nowWall = performance.now();
    entity.lastCollisionType = mode === "continuous" ? "continuous_swept" : "discrete_toi";
    entity.lastContactPoint = { x: cx, y: cy };
    entity.lastContactNormal = { x: normX, y: normY };
    entity.lastCollisionTime = nowWall;
    if (vn < 0) {
      const impactSpeed = Math.abs(vn);
      const absFrac = Math.max(0, 1 - Math.min(1, bRestitution * bRestitution));
      const isVoluntary = entity.isCharacter && (Boolean(entity.isActivelyWalking) || Boolean(entity.isSprinting) || Math.hypot(((_a = entity.movementInput) == null ? void 0 : _a.x) ?? 0, ((_b = entity.movementInput) == null ? void 0 : _b.y) ?? 0) > 0.01);
      const isThreat = !isVoluntary && entity.isUnderKnockback || entity.isInFlight;
      const kSelf = isThreat ? 1 : entity.damageSolverModule ? Math.max(0, Math.min(1, entity.damageSolverModule.getSelfImpactWeight(entity.properties))) : 0;
      const threatRatio = CollisionResolver.calculateThreatRatio(impactSpeed, 0, kSelf, 0, isThreat, false);
      const effectiveSpeed = impactSpeed * threatRatio;
      const shock = effectiveSpeed * 60 * absFrac;
      if (shock > 0.01) {
        entity.dispatchImpact({
          absorbedShock: shock,
          impactSpeed: effectiveSpeed,
          otherEntity: null,
          normalX: normX,
          normalY: normY
        });
      }
    }
    return true;
  }
  /**
   * Calculates the threat ratio [0.0, 1.0] for an entity in a collision.
   *
   * uSelf: this entity's forward velocity towards the other entity along normal.
   * uOther: the other entity's forward velocity towards this entity along normal.
   * kSelf: this entity's voluntary multiplier (0.0 = arcade self-damage immunity, 1.0 = Newtonian).
   * kOther: the other entity's threat multiplier (0.0 = voluntary bump, 1.0 = active projectile / knockback).
   * isThreatSelf / isThreatOther: whether each entity is an active physical threat (in flight or under knockback).
   *
   * Symmetrical guarantee:
   * If Character A voluntarily walks into resting Character B with kSelfA = 0, both A and B experience threatRatio = 0.
   * If kSelfA is decreased or removed due to gamification, the threat delivered to B scales down by that exact same proportion.
   */
  static calculateThreatRatio(uSelf, uOther, kSelf, kOther, isThreatSelf = false, isThreatOther = false) {
    const totalClosing = uSelf + uOther;
    if (totalClosing <= 1e-4) return 0;
    const effectiveThreatFromOther = isThreatOther ? uOther : uOther * kOther;
    const effectiveSelfRecoil = isThreatSelf ? uSelf : uSelf * kSelf;
    const effectiveSpeed = effectiveThreatFromOther + effectiveSelfRecoil;
    return Math.max(0, Math.min(1, effectiveSpeed / totalClosing));
  }
  /**
   * Applies impulse at contact point respecting the Massless vs Massive rule.
   */
  static applyImpulseAtContact(a, b, normX, normY, velAlongNormal, restitution, collisionType, customImpactSpeed, _normZ = 0) {
    var _a, _b, _c, _d, _e, _f;
    const isClosingIn2D = velAlongNormal < 0;
    const impactSpeed = customImpactSpeed !== void 0 ? customImpactSpeed : isClosingIn2D ? Math.abs(velAlongNormal) : 0;
    const vAn0 = a.isImmovable ? 0 : a.velocity.x * normX + a.velocity.y * normY;
    const vBn0 = b.isImmovable ? 0 : b.velocity.x * normX + b.velocity.y * normY;
    const vzA0 = !a.isImmovable && a.hasVerticalVelocity ? a.verticalVelocity : 0;
    const vzB0 = !b.isImmovable && b.hasVerticalVelocity ? b.verticalVelocity : 0;
    if (!isClosingIn2D && impactSpeed <= 0.05) return;
    a.wakeUp();
    b.wakeUp();
    const isMasslessA = !a.hasMass;
    const isMasslessB = !b.hasMass;
    const now = performance.now();
    const midX = (a.position.x + b.position.x) * 0.5;
    const midY = (a.position.y + b.position.y) * 0.5;
    a.lastContactPoint = { x: midX, y: midY };
    b.lastContactPoint = { x: midX, y: midY };
    a.lastContactNormal = { x: -normX, y: -normY };
    b.lastContactNormal = { x: normX, y: normY };
    a.lastCollisionType = collisionType;
    b.lastCollisionType = collisionType;
    a.lastCollisionTime = now;
    b.lastCollisionTime = now;
    if (a.isImmovable && b.isImmovable) return;
    let normalImpulse = 0;
    const mA = a.hasMass ? a.mass : 0;
    const mB = b.hasMass ? b.mass : 0;
    const invMassA = a.isImmovable || !a.hasMass ? 0 : 1 / mA;
    const invMassB = b.isImmovable || !b.hasMass ? 0 : 1 / mB;
    const invMassSum = invMassA + invMassB;
    if (isClosingIn2D) {
      if (b.isImmovable) {
        if (isMasslessA) {
          const closingSpeed = Math.abs(velAlongNormal);
          a.velocity.x -= normX * closingSpeed * (1 + restitution);
          a.velocity.y -= normY * closingSpeed * (1 + restitution);
        } else {
          normalImpulse = -(1 + restitution) * velAlongNormal / invMassA;
          a.velocity.x -= normalImpulse * invMassA * normX;
          a.velocity.y -= normalImpulse * invMassA * normY;
        }
      } else if (a.isImmovable) {
        if (isMasslessB) {
          const closingSpeed = Math.abs(velAlongNormal);
          b.velocity.x += normX * closingSpeed * (1 + restitution);
          b.velocity.y += normY * closingSpeed * (1 + restitution);
        } else {
          normalImpulse = -(1 + restitution) * velAlongNormal / invMassB;
          b.velocity.x += normalImpulse * invMassB * normX;
          b.velocity.y += normalImpulse * invMassB * normY;
        }
      } else if (isMasslessA && isMasslessB) {
        const impulse = -velAlongNormal * 0.5 * (1 + restitution);
        a.velocity.x -= impulse * normX;
        a.velocity.y -= impulse * normY;
        b.velocity.x += impulse * normX;
        b.velocity.y += impulse * normY;
      } else if (!isMasslessA && isMasslessB) {
        const closingSpeed = Math.abs(velAlongNormal);
        b.velocity.x += normX * closingSpeed * (1 + restitution);
        b.velocity.y += normY * closingSpeed * (1 + restitution);
      } else if (isMasslessA && !isMasslessB) {
        const closingSpeed = Math.abs(velAlongNormal);
        a.velocity.x -= normX * closingSpeed * (1 + restitution);
        a.velocity.y -= normY * closingSpeed * (1 + restitution);
      } else {
        normalImpulse = -(1 + restitution) * velAlongNormal / invMassSum;
        a.velocity.x -= normalImpulse * invMassA * normX;
        a.velocity.y -= normalImpulse * invMassA * normY;
        b.velocity.x += normalImpulse * invMassB * normX;
        b.velocity.y += normalImpulse * invMassB * normY;
        const nowContact = performance.now();
        a.lastCollisionTime = nowContact;
        b.lastCollisionTime = nowContact;
        const isCharCharContact = a.isCharacter && b.isCharacter;
        const tangX = -normY;
        const tangY = normX;
        const relVx = b.velocity.x - a.velocity.x;
        const relVy = b.velocity.y - a.velocity.y;
        const relVt = relVx * tangX + relVy * tangY;
        if (!isCharCharContact && Math.abs(relVt) > 1e-3) {
          const muObj = 0.35 * Math.sqrt(a.dynamicGroundFrictionMod * b.dynamicGroundFrictionMod);
          const beta = 0.4;
          const stickImpulse = Math.abs(relVt) / (invMassSum * (1 + 1 / beta));
          const maxFricImpulse = muObj * Math.abs(normalImpulse);
          const fricImpulse = Math.min(stickImpulse, maxFricImpulse) * Math.sign(relVt);
          a.velocity.x += fricImpulse * invMassA * tangX;
          a.velocity.y += fricImpulse * invMassA * tangY;
          b.velocity.x -= fricImpulse * invMassB * tangX;
          b.velocity.y -= fricImpulse * invMassB * tangY;
          if (a.rollModule && a.rollModule.enabled && a.colliderRadius > 0) {
            const spinImpulse = fricImpulse / (beta * a.mass * a.colliderRadius);
            a.rollModule.angularVelocity.z += spinImpulse;
            a.rollModule.angularVelocity.z = Math.max(-30, Math.min(30, a.rollModule.angularVelocity.z));
          }
          if (b.rollModule && b.rollModule.enabled && b.colliderRadius > 0) {
            const spinImpulseB = fricImpulse / (beta * b.mass * b.colliderRadius);
            b.rollModule.angularVelocity.z -= spinImpulseB;
            b.rollModule.angularVelocity.z = Math.max(-30, Math.min(30, b.rollModule.angularVelocity.z));
          }
        }
      }
    }
    const relSpeed = impactSpeed;
    const bModA = a.hasBounce && a.bounceMod !== null ? a.bounceMod : a.isCharacter ? 0.2 : 0;
    const bModB = b.hasBounce && b.bounceMod !== null ? b.bounceMod : b.isCharacter ? 0.2 : 0;
    const absFracA = Math.max(0, 1 - Math.min(1, bModA * bModA));
    const absFracB = Math.max(0, 1 - Math.min(1, bModB * bModB));
    let deltaVa = relSpeed * 0.5;
    let deltaVb = relSpeed * 0.5;
    if (a.isImmovable && !b.isImmovable) {
      deltaVa = 0;
      deltaVb = relSpeed;
    } else if (!a.isImmovable && b.isImmovable) {
      deltaVa = relSpeed;
      deltaVb = 0;
    } else if (!isMasslessA && !isMasslessB && invMassSum > 1e-4) {
      deltaVa = relSpeed * (invMassA / invMassSum);
      deltaVb = relSpeed * (invMassB / invMassSum);
    } else if (isMasslessA && !isMasslessB) {
      deltaVa = relSpeed;
      deltaVb = 0;
    } else if (!isMasslessA && isMasslessB) {
      deltaVa = 0;
      deltaVb = relSpeed;
    }
    const hardnessA = ((_a = a.consumableModule) == null ? void 0 : _a.tag) === "food" ? 0.2 : 1;
    const hardnessB = ((_b = b.consumableModule) == null ? void 0 : _b.tag) === "food" ? 0.2 : 1;
    const massA = Math.max(0.1, a.mass);
    const massB = Math.max(0.1, b.mass);
    const massRatioA = massB / (massA + massB);
    const massRatioB = massA / (massA + massB);
    const relNorm0 = vAn0 - vBn0;
    let uA = 0;
    let uB = 0;
    if (relNorm0 > 1e-4) {
      if (vAn0 > 0 && vBn0 < 0) {
        uA = vAn0;
        uB = -vBn0;
      } else if (vAn0 > 0 && vBn0 >= 0) {
        uA = relNorm0;
        uB = 0;
      } else if (vAn0 <= 0 && vBn0 < 0) {
        uA = 0;
        uB = relNorm0;
      } else {
        uA = relNorm0 * 0.5;
        uB = relNorm0 * 0.5;
      }
    }
    const relVz0 = vzB0 - vzA0;
    if (b.position.z >= a.position.z && relVz0 < -0.05) {
      uB = Math.hypot(uB, Math.abs(relVz0));
    } else if (a.position.z >= b.position.z && relVz0 > 0.05) {
      uA = Math.hypot(uA, Math.abs(relVz0));
    }
    const isVoluntaryA = a.isCharacter && (Boolean(a.isActivelyWalking) || Boolean(a.isSprinting) || Math.hypot(((_c = a.movementInput) == null ? void 0 : _c.x) ?? 0, ((_d = a.movementInput) == null ? void 0 : _d.y) ?? 0) > 0.01);
    const isVoluntaryB = b.isCharacter && (Boolean(b.isActivelyWalking) || Boolean(b.isSprinting) || Math.hypot(((_e = b.movementInput) == null ? void 0 : _e.x) ?? 0, ((_f = b.movementInput) == null ? void 0 : _f.y) ?? 0) > 0.01);
    const isThreatA = Boolean(!isVoluntaryA && a.isUnderKnockback || a.isInFlight);
    const isThreatB = Boolean(!isVoluntaryB && b.isUnderKnockback || b.isInFlight);
    const multA = isThreatA ? 1 : a.damageSolverModule ? Math.max(0, Math.min(1, a.damageSolverModule.getSelfImpactWeight(a.properties))) : 0;
    const multB = isThreatB ? 1 : b.damageSolverModule ? Math.max(0, Math.min(1, b.damageSolverModule.getSelfImpactWeight(b.properties))) : 0;
    const threatRatioA = CollisionResolver.calculateThreatRatio(uA, uB, multA, multB, isThreatA, isThreatB);
    const threatRatioB = CollisionResolver.calculateThreatRatio(uB, uA, multB, multA, isThreatB, isThreatA);
    const effectiveDeltaVa = deltaVa * threatRatioA;
    const effectiveDeltaVb = deltaVb * threatRatioB;
    const shockA = Math.abs(effectiveDeltaVa) * 60 * absFracA * hardnessB * (massRatioA * 2);
    const shockB = Math.abs(effectiveDeltaVb) * 60 * absFracB * hardnessA * (massRatioB * 2);
    if (shockA > 0.01) {
      a.dispatchImpact({
        absorbedShock: shockA,
        impactSpeed: relSpeed * threatRatioA,
        otherEntity: b,
        normalX: -normX,
        normalY: -normY
      });
      if (b.isInFlight || shockA > 100) {
        a.applyKnockbackWindow(600);
      }
    }
    if (shockB > 0.01) {
      b.dispatchImpact({
        absorbedShock: shockB,
        impactSpeed: relSpeed * threatRatioB,
        otherEntity: a,
        normalX: normX,
        normalY: normY
      });
      if (a.isInFlight || shockB > 100) {
        b.applyKnockbackWindow(600);
      }
    }
  }
  /**
   * Fallback naive iterative separation solver (Legacy baseline comparison).
   */
  static resolveNaiveIterative(entities, arena2, draggedEntity) {
    const iterations = 3;
    const count = entities.length;
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const a = entities[i];
          const b = entities[j];
          if (a.isHeld || b.isHeld || a === draggedEntity || b === draggedEntity) continue;
          if (!a.hasCollider || !b.hasCollider) continue;
          const layerA = GameObject.getEntityLayer(a, arena2.wallHeight);
          const layerB = GameObject.getEntityLayer(b, arena2.wallHeight);
          if (layerA !== layerB) continue;
          const dx = b.position.x - a.position.x;
          const dy = b.position.y - a.position.y;
          const dist2DSq = dx * dx + dy * dy;
          const minDist = a.colliderRadius + b.colliderRadius;
          if (dist2DSq < minDist * minDist) {
            const dist = Math.sqrt(dist2DSq);
            const overlap = minDist - dist;
            let normX;
            let normY;
            if (dist > 1e-4) {
              normX = dx / dist;
              normY = dy / dist;
            } else {
              normX = 1;
              normY = 0;
            }
            const relVx = (b.isImmovable ? 0 : b.velocity.x) - (a.isImmovable ? 0 : a.velocity.x);
            const relVy = (b.isImmovable ? 0 : b.velocity.y) - (a.isImmovable ? 0 : a.velocity.y);
            const velAlongNormal = relVx * normX + relVy * normY;
            const nowNaive = performance.now();
            a.lastCollisionType = "naive";
            b.lastCollisionType = "naive";
            a.lastCollisionTime = nowNaive;
            b.lastCollisionTime = nowNaive;
            const midX = (a.position.x + b.position.x) * 0.5;
            const midY = (a.position.y + b.position.y) * 0.5;
            a.lastContactPoint = { x: midX, y: midY };
            b.lastContactPoint = { x: midX, y: midY };
            a.lastContactNormal = { x: -normX, y: -normY };
            b.lastContactNormal = { x: normX, y: normY };
            if (a.isImmovable && b.isImmovable) continue;
            if (b.isImmovable) {
              a.position.x -= normX * overlap;
              a.position.y -= normY * overlap;
              if (velAlongNormal < 0) {
                const bounceA = a.hasBounce && a.bounceMod !== null ? a.bounceMod : 0;
                const restitution = bounceA;
                const closingSpeed = Math.abs(velAlongNormal);
                a.velocity.x -= normX * closingSpeed * (1 + restitution);
                a.velocity.y -= normY * closingSpeed * (1 + restitution);
              }
              continue;
            }
            if (a.isImmovable) {
              b.position.x += normX * overlap;
              b.position.y += normY * overlap;
              if (velAlongNormal < 0) {
                const bounceB = b.hasBounce && b.bounceMod !== null ? b.bounceMod : 0;
                const restitution = bounceB;
                const closingSpeed = Math.abs(velAlongNormal);
                b.velocity.x += normX * closingSpeed * (1 + restitution);
                b.velocity.y += normY * closingSpeed * (1 + restitution);
              }
              continue;
            }
            const isMasslessA = !a.hasMass;
            const isMasslessB = !b.hasMass;
            if (isMasslessA && isMasslessB) {
              a.position.x -= normX * overlap * 0.5;
              a.position.y -= normY * overlap * 0.5;
              b.position.x += normX * overlap * 0.5;
              b.position.y += normY * overlap * 0.5;
              if (velAlongNormal < 0) {
                const impulse = -velAlongNormal * 0.5;
                a.velocity.x -= impulse * normX;
                a.velocity.y -= impulse * normY;
                b.velocity.x += impulse * normX;
                b.velocity.y += impulse * normY;
              }
              continue;
            }
            if (!isMasslessA && isMasslessB) {
              b.position.x += normX * overlap;
              b.position.y += normY * overlap;
              if (velAlongNormal < 0) {
                const closingSpeed = Math.abs(velAlongNormal);
                b.velocity.x += normX * closingSpeed;
                b.velocity.y += normY * closingSpeed;
              }
              continue;
            }
            if (isMasslessA && !isMasslessB) {
              a.position.x -= normX * overlap;
              a.position.y -= normY * overlap;
              if (velAlongNormal < 0) {
                const closingSpeed = Math.abs(velAlongNormal);
                a.velocity.x -= normX * closingSpeed;
                a.velocity.y -= normY * closingSpeed;
              }
              continue;
            }
            const mA = a.mass;
            const mB = b.mass;
            const totalM = mA + mB;
            const ratioA = mB / totalM;
            const ratioB = mA / totalM;
            a.position.x -= normX * overlap * ratioA;
            a.position.y -= normY * overlap * ratioA;
            b.position.x += normX * overlap * ratioB;
            b.position.y += normY * overlap * ratioB;
            if (velAlongNormal < 0) {
              const bounceA = a.hasBounce && a.bounceMod !== null ? a.bounceMod : 0;
              const bounceB = b.hasBounce && b.bounceMod !== null ? b.bounceMod : 0;
              const restitution = Math.max(bounceA, bounceB);
              const impulse = -(1 + restitution) * velAlongNormal / (1 / mA + 1 / mB);
              a.velocity.x -= impulse / mA * normX;
              a.velocity.y -= impulse / mA * normY;
              b.velocity.x += impulse / mB * normX;
              b.velocity.y += impulse / mB * normY;
            }
          }
        }
      }
    }
  }
}
class IslandManager {
  constructor() {
    __publicField(this, "islands", /* @__PURE__ */ new Map());
    __publicField(this, "entityToIsland", /* @__PURE__ */ new Map());
    __publicField(this, "nextIslandId", 1);
  }
  /**
   * Rebuilds the dynamic interaction graph for the current simulation frame.
   * Adjacency is formed by:
   * 1. Character holding an object (holder <-> heldObject).
   * 2. Recent contact between entities (lastContactPoint set & speed > 0).
   * 3. Proximity overlap between non-sleeping entities.
   */
  updateIslands(characters, objects2, currentTick, arena2) {
    var _a, _b, _c, _d;
    this.islands.clear();
    this.entityToIsland.clear();
    const allEntities = [...characters, ...objects2];
    const visited = /* @__PURE__ */ new Set();
    const adj = /* @__PURE__ */ new Map();
    for (const e of allEntities) {
      adj.set(e.id, /* @__PURE__ */ new Set());
    }
    for (const char of characters) {
      if (char.heldObject) {
        (_a = adj.get(char.id)) == null ? void 0 : _a.add(char.heldObject);
        (_b = adj.get(char.heldObject.id)) == null ? void 0 : _b.add(char);
      }
    }
    const activeEntities = allEntities.filter((e) => !e.isSleeping || e.isCharacter);
    const activeCount = activeEntities.length;
    for (let i = 0; i < activeCount; i++) {
      for (let j = i + 1; j < activeCount; j++) {
        const a = activeEntities[i];
        const b = activeEntities[j];
        if (GameObject.getEntityLayer(a, arena2.wallHeight) !== GameObject.getEntityLayer(b, arena2.wallHeight)) {
          continue;
        }
        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const distSq = dx * dx + dy * dy;
        const touchDist = a.colliderRadius + b.colliderRadius + 0.05;
        if (distSq <= touchDist * touchDist) {
          (_c = adj.get(a.id)) == null ? void 0 : _c.add(b);
          (_d = adj.get(b.id)) == null ? void 0 : _d.add(a);
        }
      }
    }
    for (const e of allEntities) {
      if (visited.has(e.id)) continue;
      const neighbors = adj.get(e.id);
      if (e.isSleeping && (!neighbors || neighbors.size === 0)) {
        visited.add(e.id);
        const dormantIsland = {
          id: `island-dormant-${e.id}`,
          entities: /* @__PURE__ */ new Set([e]),
          hasPlayer: false,
          lastActiveTick: currentTick
        };
        this.islands.set(dormantIsland.id, dormantIsland);
        this.entityToIsland.set(e.id, dormantIsland);
        continue;
      }
      const islandEntities = /* @__PURE__ */ new Set();
      const queue = [e];
      visited.add(e.id);
      let islandHasPlayer = false;
      while (queue.length > 0) {
        const curr = queue.shift();
        islandEntities.add(curr);
        if (curr.isCharacter) {
          islandHasPlayer = true;
        }
        const currNeighbors = adj.get(curr.id);
        if (currNeighbors) {
          for (const n of currNeighbors) {
            if (!visited.has(n.id)) {
              visited.add(n.id);
              queue.push(n);
            }
          }
        }
      }
      const island = {
        id: `island-${this.nextIslandId++}`,
        entities: islandEntities,
        hasPlayer: islandHasPlayer,
        lastActiveTick: currentTick
      };
      this.islands.set(island.id, island);
      for (const ent of islandEntities) {
        this.entityToIsland.set(ent.id, island);
      }
    }
  }
  /**
   * Retrieves the active island containing the specified entity.
   */
  getIslandForEntity(entityId) {
    return this.entityToIsland.get(entityId);
  }
  /**
   * Returns all entities in the island containing the specified character or entity.
   * If the entity is not found or isolated, returns a set containing just that entity.
   */
  getInfluencedEntities(entityId) {
    const island = this.entityToIsland.get(entityId);
    if (island) {
      return island.entities;
    }
    return /* @__PURE__ */ new Set();
  }
  /**
   * Returns statistics about the active islands.
   */
  getStats() {
    let activeIslands = 0;
    let sleepingCount = 0;
    let totalEntities = 0;
    for (const island of this.islands.values()) {
      totalEntities += island.entities.size;
      let allSleeping = true;
      for (const e of island.entities) {
        if (e.isSleeping) sleepingCount++;
        else allSleeping = false;
      }
      if (!allSleeping) {
        activeIslands++;
      }
    }
    return {
      totalIslands: this.islands.size,
      activeIslands,
      sleepingCount,
      totalEntities
    };
  }
}
class SnapshotManager {
  /**
   * Captures the physical state of all entities at the given simulation tick.
   * If quantize is true, numbers are rounded to 4 decimals for network packets;
   * otherwise, exact 64-bit IEEE floats are retained for local rollback determinism.
   */
  static capture(tick, characters, objects2, quantize = false) {
    const all = [...characters, ...objects2];
    const entities = all.map((e) => {
      const isChar = e.isCharacter;
      const char = isChar ? e : null;
      const roll = e.rollModule;
      return {
        id: e.id,
        name: e.name,
        x: quantize ? Number(e.position.x.toFixed(4)) : e.position.x,
        y: quantize ? Number(e.position.y.toFixed(4)) : e.position.y,
        z: quantize ? Number(e.position.z.toFixed(4)) : e.position.z,
        vx: quantize ? Number(e.velocity.x.toFixed(4)) : e.velocity.x,
        vy: quantize ? Number(e.velocity.y.toFixed(4)) : e.velocity.y,
        vz: quantize ? Number(e.verticalVelocity.toFixed(4)) : e.verticalVelocity,
        isHeld: e.isHeld,
        heldById: e.heldBy ? e.heldBy.id : null,
        isClimbing: e.isClimbing,
        isCharacter: isChar,
        facingAngle: char ? char.facingAngle : void 0,
        isSprinting: char ? char.isSprinting : void 0,
        standingWallId: e.standingWall ? e.standingWall.id : null,
        isSleeping: e.isSleeping,
        isInFlight: e.isInFlight,
        angX: roll && roll.enabled ? quantize ? Number(roll.angularVelocity.x.toFixed(4)) : roll.angularVelocity.x : void 0,
        angY: roll && roll.enabled ? quantize ? Number(roll.angularVelocity.y.toFixed(4)) : roll.angularVelocity.y : void 0,
        angZ: roll && roll.enabled ? quantize ? Number(roll.angularVelocity.z.toFixed(4)) : roll.angularVelocity.z : void 0
      };
    });
    return {
      tick,
      timestamp: performance.now(),
      entities
    };
  }
  /**
   * Restores entities to the exact state captured in a snapshot.
   * If filterEntities is provided, only restores entities present in that set (Phase 3 Island optimization).
   */
  static apply(snapshot, characters, objects2, filterEntities) {
    const allMap = /* @__PURE__ */ new Map();
    for (const c of characters) {
      if (!filterEntities || filterEntities.has(c)) {
        allMap.set(c.id, c);
        c.heldObject = null;
      }
    }
    for (const o of objects2) {
      if (!filterEntities || filterEntities.has(o)) {
        allMap.set(o.id, o);
      }
    }
    for (const snap of snapshot.entities) {
      const entity = allMap.get(snap.id);
      if (!entity) continue;
      entity.position.x = snap.x;
      entity.position.y = snap.y;
      entity.position.z = snap.z;
      entity.velocity.x = snap.vx;
      entity.velocity.y = snap.vy;
      entity.verticalVelocity = snap.vz;
      entity.isHeld = snap.isHeld;
      entity.isClimbing = snap.isClimbing;
      entity.isSleeping = snap.isSleeping ?? false;
      if (snap.isCharacter && entity.isCharacter) {
        const char = entity;
        if (snap.facingAngle !== void 0) char.facingAngle = snap.facingAngle;
        if (snap.isSprinting !== void 0) char.isSprinting = snap.isSprinting;
      }
      if (entity.rollModule && entity.rollModule.enabled && snap.angX !== void 0) {
        entity.rollModule.angularVelocity.x = snap.angX;
        entity.rollModule.angularVelocity.y = snap.angY ?? 0;
        entity.rollModule.angularVelocity.z = snap.angZ ?? 0;
      }
      if (snap.isInFlight !== void 0) {
        entity.isInFlight = snap.isInFlight;
      }
      if (snap.heldById) {
        const holder = allMap.get(snap.heldById);
        entity.heldBy = holder ?? null;
        if (holder && holder.heldObject !== void 0) {
          holder.heldObject = entity;
        }
      } else {
        entity.heldBy = null;
      }
    }
  }
  /**
   * Compares two snapshots and evaluates divergence.
   */
  static hasDivergence(a, b, posThreshold = 0.05, velThreshold = 0.1) {
    const mapB = new Map(b.entities.map((e) => [e.id, e]));
    let maxDeltaPos = 0;
    let maxDeltaVel = 0;
    let divergedEntityId;
    for (const entA of a.entities) {
      const entB = mapB.get(entA.id);
      if (!entB) continue;
      const dx = entA.x - entB.x;
      const dy = entA.y - entB.y;
      const dz = entA.z - entB.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > maxDeltaPos) maxDeltaPos = dist;
      const dvx = entA.vx - entB.vx;
      const dvy = entA.vy - entB.vy;
      const dvz = entA.vz - entB.vz;
      const velDiff = Math.hypot(dvx, dvy, dvz);
      if (velDiff > maxDeltaVel) maxDeltaVel = velDiff;
      if (!divergedEntityId && (dist > posThreshold || velDiff > velThreshold)) {
        divergedEntityId = entA.id;
      }
    }
    return {
      diverged: divergedEntityId !== void 0,
      entityId: divergedEntityId,
      deltaPos: maxDeltaPos,
      maxDeltaPos,
      maxDeltaVel
    };
  }
}
class SceneSpawner {
  constructor(options) {
    __publicField(this, "id");
    __publicField(this, "name");
    __publicField(this, "enabled", true);
    __publicField(this, "prefabId");
    /** Interval in minutes between spawn attempts (e.g. 0.20 min = 12s, 1.0 min = 60s) */
    __publicField(this, "intervalMinutes", 0.2);
    /** Maximum number of active live instances of this prefab allowed in the scene */
    __publicField(this, "maxCount", 5);
    /** Elapsed time in seconds towards next spawn */
    __publicField(this, "timerSeconds", 0);
    /** Optional explicit candidate spawn locations distributed throughout the map */
    __publicField(this, "designatedSpawnPoints", []);
    this.id = options.id;
    this.name = options.name || "Scene Spawner";
    if (options.enabled !== void 0) this.enabled = options.enabled;
    this.prefabId = options.prefabId;
    if (options.intervalMinutes !== void 0) this.intervalMinutes = Math.max(0.01, options.intervalMinutes);
    if (options.maxCount !== void 0) this.maxCount = Math.max(1, options.maxCount);
    if (options.designatedSpawnPoints) this.designatedSpawnPoints = [...options.designatedSpawnPoints];
  }
  /**
   * Returns current count of active live instances of this prefab in the scene.
   */
  getActiveCount(objects2) {
    return objects2.filter((o) => o.prefabId === this.prefabId).length;
  }
  /**
   * Advances timer and spawns an instance when interval expires, unless maxCount is reached.
   */
  update(dt, arena2, objects2, prefabManager2) {
    if (!this.enabled || !arena2) return null;
    const activeCount = this.getActiveCount(objects2);
    if (activeCount >= this.maxCount) {
      return null;
    }
    this.timerSeconds += dt;
    const targetIntervalSec = this.intervalMinutes * 60;
    if (this.timerSeconds >= targetIntervalSec) {
      this.timerSeconds = 0;
      return this.spawnNow(arena2, objects2, prefabManager2);
    }
    return null;
  }
  /**
   * Immediately spawns an instance of the assigned prefab at a valid random open ground spot.
   */
  spawnNow(arena2, objects2, prefabManager2) {
    if (!arena2) return null;
    const activeCount = this.getActiveCount(objects2);
    if (activeCount >= this.maxCount) {
      return null;
    }
    let pos;
    if (this.designatedSpawnPoints.length > 0) {
      const openPoints = this.designatedSpawnPoints.filter((pt) => {
        const isWall = arena2.hasWall(Math.floor(pt.x), Math.floor(pt.y));
        if (isWall) return false;
        const occupied = objects2.some((o) => Math.hypot(o.position.x - pt.x, o.position.y - pt.y) < 0.8);
        return !occupied;
      });
      if (openPoints.length > 0) {
        const choice = openPoints[Math.floor(Math.random() * openPoints.length)];
        pos = { x: choice.x, y: choice.y, z: choice.z ?? 0 };
      } else {
        const choice = this.designatedSpawnPoints[Math.floor(Math.random() * this.designatedSpawnPoints.length)];
        pos = { x: choice.x, y: choice.y, z: choice.z ?? 0 };
      }
    } else {
      pos = this.findRandomGroundPosition(arena2);
    }
    const instance = prefabManager2.spawn(this.prefabId, pos, arena2, objects2);
    return instance;
  }
  /**
   * Finds a random open ground coordinate in the arena away from perimeter and solid walls.
   */
  findRandomGroundPosition(arena2) {
    const margin = 1.5;
    const minX = margin;
    const maxX = Math.max(margin + 1, arena2.width - margin);
    const minY = margin;
    const maxY = Math.max(margin + 1, arena2.height - margin);
    for (let i = 0; i < 25; i++) {
      const rx = minX + Math.random() * (maxX - minX);
      const ry = minY + Math.random() * (maxY - minY);
      const tileX = Math.floor(rx);
      const tileY = Math.floor(ry);
      if (!arena2.hasWall(tileX, tileY)) {
        return { x: rx, y: ry, z: 0 };
      }
    }
    return { x: arena2.width / 2, y: arena2.height / 2, z: 0 };
  }
}
class ConsumableModule {
  constructor(options) {
    __publicField(this, "id", "consumable");
    __publicField(this, "name", "Consumable");
    __publicField(this, "enabled", true);
    /** Primary item ability of any consumable object is to be consumed */
    __publicField(this, "primaryAbilityType", "consume");
    /** Category/type tag of this consumable (e.g. "food", "potion", "battery") */
    __publicField(this, "tag", "food");
    /** Total initial energy capacity stored within this consumable (Joules) */
    __publicField(this, "totalEnergyJoulesProp");
    /** Current remaining energy available to be consumed (Joules) */
    __publicField(this, "remainingEnergyJoulesProp");
    /** Rate at which nutrition is absorbed while being consumed (Watts = Joules / sec) */
    __publicField(this, "consumeRateWattsProp");
    /** Optional bonus healing rate while consuming (HP / sec) */
    __publicField(this, "healRateProp");
    /** Minimum visual scale floor (e.g. 0.40 = 40% of original size) to keep partially eaten items visible */
    __publicField(this, "minScaleFloor", 0.4);
    /** Minimum absolute physical collider radius (units) */
    __publicField(this, "minRadiusFloor", 0.15);
    /** Track initial unscaled radius of the parent object */
    __publicField(this, "initialColliderRadius", 0.26);
    /** Flag indicating whether the item has been completely consumed */
    __publicField(this, "isConsumed", false);
    /** If true, this consumable has infinite energy, never depletes, never shrinks, and cannot be destroyed */
    __publicField(this, "unlimited", false);
    this.tag = ((options == null ? void 0 : options.tag) ?? "food").trim().toLowerCase() || "food";
    const total = (options == null ? void 0 : options.totalEnergyJoules) ?? 4e3;
    this.totalEnergyJoulesProp = new DynamicProperty(total);
    this.remainingEnergyJoulesProp = new DynamicProperty((options == null ? void 0 : options.remainingEnergyJoules) ?? total);
    this.consumeRateWattsProp = new DynamicProperty((options == null ? void 0 : options.consumeRateWatts) ?? (options == null ? void 0 : options.eatRateWatts) ?? 800);
    this.healRateProp = new DynamicProperty((options == null ? void 0 : options.healRate) ?? 0);
    if ((options == null ? void 0 : options.minScaleFloor) !== void 0) this.minScaleFloor = Math.max(0.2, options.minScaleFloor);
    if ((options == null ? void 0 : options.minRadiusFloor) !== void 0) this.minRadiusFloor = Math.max(0.08, options.minRadiusFloor);
    if ((options == null ? void 0 : options.enabled) !== void 0) this.enabled = options.enabled;
    if ((options == null ? void 0 : options.unlimited) !== void 0) this.unlimited = options.unlimited;
  }
  get totalEnergyJoules() {
    return this.totalEnergyJoulesProp.literalValue;
  }
  set totalEnergyJoules(val) {
    this.totalEnergyJoulesProp.set(Math.max(10, val));
  }
  get remainingEnergyJoules() {
    return this.unlimited ? this.totalEnergyJoules : this.remainingEnergyJoulesProp.literalValue;
  }
  set remainingEnergyJoules(val) {
    if (this.unlimited) {
      this.remainingEnergyJoulesProp.set(this.totalEnergyJoules);
      return;
    }
    this.remainingEnergyJoulesProp.set(Math.max(0, Math.min(this.totalEnergyJoules, val)));
  }
  get consumeRateWatts() {
    return this.consumeRateWattsProp.literalValue;
  }
  set consumeRateWatts(val) {
    this.consumeRateWattsProp.set(Math.max(10, val));
  }
  // Legacy alias for eatRateWatts
  get eatRateWatts() {
    return this.consumeRateWatts;
  }
  set eatRateWatts(val) {
    this.consumeRateWatts = val;
  }
  get healRate() {
    return this.healRateProp.literalValue;
  }
  set healRate(val) {
    this.healRateProp.literalValue = Math.max(0, val);
  }
  getTotalEnergy(registry) {
    return Math.max(1, this.totalEnergyJoulesProp.get(registry));
  }
  getRemainingEnergy(registry) {
    if (this.unlimited) {
      return this.getTotalEnergy(registry);
    }
    return Math.max(0, this.remainingEnergyJoulesProp.get(registry));
  }
  getConsumeRate(registry) {
    return Math.max(1, this.consumeRateWattsProp.get(registry));
  }
  getEatRate(registry) {
    return this.getConsumeRate(registry);
  }
  getHealRate(registry) {
    return Math.max(0, this.healRateProp.get(registry));
  }
  /**
   * Calculates the current volumetric scale factor based on remaining energy.
   * Uses cube-root volumetric scaling with a configurable minimum scale floor,
   * ensuring that even low-energy crumbs remain easily visible and grabbable.
   */
  getScale(registry) {
    if (this.unlimited) return 1;
    const total = this.getTotalEnergy(registry);
    const remaining = this.getRemainingEnergy(registry);
    if (remaining <= 1e-3) return 0;
    const ratio = Math.max(0, Math.min(1, remaining / total));
    const volumetricScale = Math.cbrt(ratio);
    return Math.max(this.minScaleFloor, volumetricScale);
  }
  /**
   * Continuous consume action executed when a character consumes this held object.
   * Transfers energy into the consumer's EnergyPool, optionally restores HP,
   * updates physical size, and disposes of the object when 100% depleted.
   */
  consume(dt, consumer, consumableObj, objects2, arena2) {
    if (!this.enabled || dt <= 0 || this.isConsumed) {
      return { watts: 0, joules: 0, isDepleted: this.isConsumed };
    }
    const registry = consumableObj.properties;
    if (this.unlimited) {
      const rateWatts2 = this.getConsumeRate(registry);
      const demandJoules2 = rateWatts2 * dt;
      if (consumer.energyPool && consumer.energyPool.enabled) {
        const curEnergy = consumer.energyPool.getCurrentEnergy(consumer.properties);
        const maxEnergy = consumer.energyPool.getMaxEnergy(consumer.properties);
        const updatedEnergy = Math.min(maxEnergy, curEnergy + demandJoules2);
        consumer.energyPool.currentEnergyProp.set(updatedEnergy, consumer.properties);
      }
      const healHpPerSec2 = this.getHealRate(registry);
      if (healHpPerSec2 > 0 && consumer.healthModule && consumer.healthModule.enabled) {
        const healAmt = healHpPerSec2 * dt;
        consumer.healthModule.heal(healAmt, consumer.properties, {
          id: "consumable_nutrition",
          name: this.tag ? `Consumable (${this.tag})` : "Consumable",
          type: "continuous",
          rate: healHpPerSec2,
          color: "#ec4899",
          isHeal: true
        });
      }
      return {
        watts: rateWatts2,
        joules: demandJoules2,
        isDepleted: false
      };
    }
    const remaining = this.getRemainingEnergy(registry);
    if (remaining <= 1e-3) {
      this.finishConsumption(consumer, consumableObj, objects2, arena2);
      return { watts: 0, joules: 0, isDepleted: true };
    }
    const rateWatts = this.getConsumeRate(registry);
    const demandJoules = rateWatts * dt;
    const transferJoules = Math.min(remaining, demandJoules);
    const newRemaining = Math.max(0, remaining - transferJoules);
    this.remainingEnergyJoulesProp.set(newRemaining, registry);
    if (consumer.energyPool && consumer.energyPool.enabled) {
      const curEnergy = consumer.energyPool.getCurrentEnergy(consumer.properties);
      const maxEnergy = consumer.energyPool.getMaxEnergy(consumer.properties);
      const updatedEnergy = Math.min(maxEnergy, curEnergy + transferJoules);
      consumer.energyPool.currentEnergyProp.set(updatedEnergy, consumer.properties);
    }
    const healHpPerSec = this.getHealRate(registry);
    if (healHpPerSec > 0 && consumer.healthModule && consumer.healthModule.enabled) {
      const healAmt = healHpPerSec * dt;
      consumer.healthModule.heal(healAmt, consumer.properties, {
        id: "consumable_nutrition",
        name: this.tag ? `Consumable (${this.tag})` : "Consumable",
        type: "continuous",
        rate: healHpPerSec,
        color: "#22c55e",
        isHeal: true
      });
    }
    if (!this.initialColliderRadius || this.initialColliderRadius <= 0) {
      this.initialColliderRadius = consumableObj.colliderRadius > 0 ? consumableObj.colliderRadius : 0.26;
    }
    const currentScale = this.getScale(registry);
    const targetRadius = Math.max(this.minRadiusFloor, this.initialColliderRadius * currentScale);
    consumableObj.colliderRadius = targetRadius;
    if (consumableObj.colliderModule) {
      consumableObj.colliderModule.radius = targetRadius;
    }
    const isDepleted = newRemaining <= 1e-3;
    if (isDepleted) {
      this.finishConsumption(consumer, consumableObj, objects2, arena2);
    }
    return {
      watts: rateWatts,
      joules: transferJoules,
      isDepleted
    };
  }
  // Legacy eat alias
  eat(dt, consumer, consumableObj, arena2, objects2) {
    return this.consume(dt, consumer, consumableObj, objects2, arena2);
  }
  /**
   * Finalizes the consumption of food when all Joules are drained.
   * Drops the object from the character's hands and removes it from the world.
   */
  finishConsumption(consumer, consumableObj, objects2, _arena) {
    var _a, _b;
    if (this.unlimited) {
      console.warn(`🍎 [Consumable] finishConsumption blocked on unlimited consumable ${consumableObj.id}`);
      return;
    }
    console.log(`🍎 [Consumable] finishConsumption called for ${consumableObj.id} heldBy=${((_a = consumableObj.heldBy) == null ? void 0 : _a.name) || consumer.name}`);
    this.isConsumed = true;
    this.remainingEnergyJoulesProp.set(0, consumableObj.properties);
    if (typeof consumer._onConsumableConsumed === "function") {
      try {
        consumer._onConsumableConsumed(consumableObj.id);
      } catch (_) {
      }
    }
    if (typeof consumableObj._onConsumed === "function") {
      try {
        consumableObj._onConsumed(consumableObj.id);
      } catch (_) {
      }
    }
    if (consumer.heldObject === consumableObj) {
      consumer.heldObject = null;
    }
    consumableObj.isHeld = false;
    consumableObj.heldBy = null;
    const isOnline = Boolean(
      consumer._isInOnlineMode || typeof window !== "undefined" && (window._isOnlineModeActive || ((_b = window.onlineSessionManager) == null ? void 0 : _b.isConnected))
    );
    if (isOnline) {
      return;
    }
    if (objects2 && Array.isArray(objects2)) {
      const idx = objects2.indexOf(consumableObj);
      if (idx !== -1) {
        objects2.splice(idx, 1);
      }
    }
    if (_arena && Array.isArray(_arena.entities)) {
      const aIdx = _arena.entities.indexOf(consumableObj);
      if (aIdx !== -1) {
        _arena.entities.splice(aIdx, 1);
      }
    }
  }
}
function lcgRandom(seed) {
  let s = seed >>> 0 || 12345;
  return () => {
    s = Math.imul(1664525, s) + 1013904223 >>> 0;
    return s / 4294967296;
  };
}
class RollModule {
  constructor(options = {}) {
    __publicField(this, "enabled", true);
    /** Dynamic angular velocity in 3 dimensions (rad/s around X, Y, Z axes) */
    __publicField(this, "angularVelocity", { x: 0, y: 0, z: 0 });
    /** 3D rotation quaternion tracking orientation in world space */
    __publicField(this, "orientation", { x: 0, y: 0, z: 0, w: 1 });
    /**
     * Roll resistance property: deceleration force (in u/s²) that opposes rolling.
     * If rollResistance === 0, the object has zero rolling resistance and will roll until it hits a wall!
     */
    __publicField(this, "rollResistanceProp");
    /**
     * Toggleable bumpy rolling feature: simulates irregular rock roughness and airborne hops.
     * Independent from baseline roll resistance.
     */
    __publicField(this, "bumpyRollEnabled", true);
    /**
     * Bumpiness magnitude property (0.0 = perfectly smooth circle, 0.3 = natural rock, 1.0 = heavy rugged stone).
     * Dictates how deeply flatter facets are carved inward below the collider envelope.
     */
    __publicField(this, "bumpinessProp");
    /** Seed used to deterministically generate this object's static 3D surface roughness */
    __publicField(this, "seed");
    /** Last measured ground contact radius (used to calculate vertical rate of change dr/dt) */
    __publicField(this, "lastContactRadius", 0);
    /** Animated phase accumulator (radians) used for rendering the rotating dotted oval */
    __publicField(this, "visualPhase", 0);
    __publicField(this, "_coeff");
    var _a, _b, _c;
    this.enabled = options.enabled ?? true;
    this.angularVelocity = {
      x: ((_a = options.angularVelocity) == null ? void 0 : _a.x) ?? 0,
      y: ((_b = options.angularVelocity) == null ? void 0 : _b.y) ?? 0,
      z: ((_c = options.angularVelocity) == null ? void 0 : _c.z) ?? 0
    };
    this.rollResistanceProp = new DynamicProperty(options.rollResistance ?? 0.4);
    this.bumpyRollEnabled = options.bumpyRollEnabled ?? true;
    this.bumpinessProp = new DynamicProperty(options.bumpiness ?? 0.22);
    this.seed = options.seed ?? Math.floor(Math.random() * 1e5);
    const rng = lcgRandom(this.seed);
    this._coeff = {
      a1: rng() * 2 - 1,
      a2: rng() * 2 - 1,
      a3: rng() * 2 - 1,
      b1: rng() * 2 - 1,
      b2: rng() * 2 - 1,
      b3: rng() * 2 - 1,
      c1: rng() * 2 - 1,
      c2: rng() * 2 - 1,
      c3: rng() * 2 - 1
    };
  }
  get rollResistance() {
    return this.rollResistanceProp.literalValue;
  }
  set rollResistance(val) {
    this.rollResistanceProp.literalValue = val;
  }
  getRollResistance(registry) {
    return this.rollResistanceProp.get(registry);
  }
  get bumpiness() {
    return this.bumpinessProp.literalValue;
  }
  set bumpiness(val) {
    this.bumpinessProp.literalValue = Math.max(0, Math.min(1, val));
  }
  getBumpiness(registry) {
    return Math.max(0, Math.min(1, this.bumpinessProp.get(registry)));
  }
  /**
   * Total magnitude of 3D angular velocity (|ω| in rad/s)
   */
  get angularSpeed() {
    return Math.hypot(this.angularVelocity.x, this.angularVelocity.y, this.angularVelocity.z);
  }
  /**
   * Evaluates the 3D spherical harmonic roughness in local body space.
   * Returns a normalized value in [0, 1] where 1.0 = peak bump (nominal radius), 0.0 = deepest flat.
   */
  getRoughnessOffset(x, y, z) {
    const c = this._coeff;
    const h1 = c.a1 * x * x + c.a2 * y * y + c.a3 * z * z;
    const h2 = c.b1 * x * y + c.b2 * y * z + c.b3 * z * x;
    const h3 = c.c1 * (x * x * x - 3 * x * y * y) + c.c2 * (y * y * y - 3 * y * z * z) + c.c3 * (z * z * z - 3 * z * x * x);
    const raw = 0.5 + 0.25 * h1 + 0.15 * h2 + 0.1 * h3;
    return Math.max(0, Math.min(1, raw));
  }
  /**
   * Calculates the ground contact radius at the bottom touchpoint.
   * Guarantees the radius is ALWAYS <= nominalRadius so the rock never extends above/beyond
   * the circular collider and never visually floats above the floor.
   */
  getContactRadius(nominalRadius, registry) {
    if (!this.bumpyRollEnabled) return nominalRadius;
    const bumpiness = this.getBumpiness(registry);
    if (bumpiness <= 1e-3) return nominalRadius;
    const q = this.orientation;
    const qx = -q.x, qy = -q.y, qz = -q.z, qw = q.w;
    const vx = 0, vy = 0, vz = -1;
    const ix = qw * vx + qy * vz - qz * vy;
    const iy = qw * vy + qz * vx - qx * vz;
    const iz = qw * vz + qx * vy - qy * vx;
    const iw = -qx * vx - qy * vy - qz * vz;
    const ux = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    const uy = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    const uz = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    const rough = this.getRoughnessOffset(ux, uy, uz);
    return nominalRadius * (1 - bumpiness * (1 - rough));
  }
  /**
   * Evaluates the radius at an arbitrary direction in world space, rotated by current orientation.
   * Useful for visual rendering passes.
   */
  getRadiusAtWorldDirection(worldDir, nominalRadius, registry) {
    if (!this.bumpyRollEnabled) return nominalRadius;
    const bumpiness = this.getBumpiness(registry);
    if (bumpiness <= 1e-3) return nominalRadius;
    const q = this.orientation;
    const qx = -q.x, qy = -q.y, qz = -q.z, qw = q.w;
    const vx = worldDir.x, vy = worldDir.y, vz = worldDir.z;
    const ix = qw * vx + qy * vz - qz * vy;
    const iy = qw * vy + qz * vx - qx * vz;
    const iz = qw * vz + qx * vy - qy * vx;
    const iw = -qx * vx - qy * vy - qz * vz;
    const ux = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    const uy = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    const uz = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    const rough = this.getRoughnessOffset(ux, uy, uz);
    return nominalRadius * (1 - bumpiness * (1 - rough));
  }
  /**
   * Advance 3D orientation quaternion based on angular velocity.
   */
  updateOrientation(dt) {
    const wx = this.angularVelocity.x;
    const wy = this.angularVelocity.y;
    const wz = this.angularVelocity.z;
    const speed = Math.hypot(wx, wy, wz);
    if (speed > 1e-4 && dt > 0) {
      const halfAngle = speed * dt * 0.5;
      const sinHalf = Math.sin(halfAngle);
      const dqx = wx / speed * sinHalf;
      const dqy = wy / speed * sinHalf;
      const dqz = wz / speed * sinHalf;
      const dqw = Math.cos(halfAngle);
      const q = this.orientation;
      const nx = dqw * q.x + dqx * q.w + dqy * q.z - dqz * q.y;
      const ny = dqw * q.y - dqx * q.z + dqy * q.w + dqz * q.x;
      const nz = dqw * q.z + dqx * q.y - dqy * q.x + dqz * q.w;
      const nw = dqw * q.w - dqx * q.x - dqy * q.y - dqz * q.z;
      const mag = Math.hypot(nx, ny, nz, nw);
      if (mag > 1e-5) {
        this.orientation.x = nx / mag;
        this.orientation.y = ny / mag;
        this.orientation.z = nz / mag;
        this.orientation.w = nw / mag;
      }
    }
  }
  /**
   * Advance the visual rotation phase based on current angular velocity
   */
  updateVisualPhase(dt) {
    const speed = this.angularSpeed;
    if (speed > 1e-3) {
      this.visualPhase = (this.visualPhase + speed * dt) % (Math.PI * 2);
    }
    this.updateOrientation(dt);
  }
}
class Prefab {
  constructor(options) {
    __publicField(this, "id");
    __publicField(this, "name");
    __publicField(this, "icon");
    __publicField(this, "archetype");
    __publicField(this, "controlSchema");
    this.id = options.id;
    this.name = options.name;
    this.icon = options.icon ?? "📦";
    this.archetype = options.archetype;
    this.controlSchema = options.controlSchema;
  }
  /**
   * Instantiates a new live GameObject from this prefab.
   */
  instantiate(pos, arena2) {
    const GameObjectClass = this.archetype.constructor;
    let cloneConsumable = null;
    if (this.archetype.consumableModule) {
      const src = this.archetype.consumableModule;
      cloneConsumable = new ConsumableModule({
        tag: src.tag,
        totalEnergyJoules: src.totalEnergyJoulesProp.literalValue,
        remainingEnergyJoules: src.totalEnergyJoulesProp.literalValue,
        consumeRateWatts: src.consumeRateWattsProp.literalValue,
        healRate: src.healRateProp.literalValue,
        minScaleFloor: src.minScaleFloor,
        minRadiusFloor: src.minRadiusFloor,
        unlimited: src.unlimited
      });
      cloneConsumable.initialColliderRadius = src.initialColliderRadius;
    }
    let cloneRoll = null;
    if (this.archetype.rollModule) {
      cloneRoll = new RollModule({
        enabled: this.archetype.rollModule.enabled,
        rollResistance: this.archetype.rollModule.rollResistance,
        bumpyRollEnabled: this.archetype.rollModule.bumpyRollEnabled,
        bumpiness: this.archetype.rollModule.bumpiness,
        seed: this.archetype.rollModule.seed
      });
    }
    const spawnPos = {
      x: (pos == null ? void 0 : pos.x) ?? this.archetype.position.x,
      y: (pos == null ? void 0 : pos.y) ?? this.archetype.position.y,
      z: (pos == null ? void 0 : pos.z) ?? this.archetype.position.z
    };
    const instance = new GameObjectClass({
      name: this.archetype.name,
      position: spawnPos,
      color: this.archetype.color,
      visualShape: this.archetype.visualShape,
      mass: this.archetype.mass,
      colliderRadius: this.archetype.consumableModule ? this.archetype.consumableModule.initialColliderRadius || this.archetype.colliderRadius : this.archetype.colliderRadius,
      bounceMod: this.archetype.bounceMod,
      hasGravity: this.archetype.hasGravity,
      hasVerticalPosition: this.archetype.hasVerticalPosition,
      consumableModule: cloneConsumable,
      rollModule: cloneRoll
    });
    instance.prefabId = this.id;
    instance.overriddenProperties = /* @__PURE__ */ new Set();
    if (this.archetype instanceof Character && instance instanceof Character) {
      const srcChar = this.archetype;
      const targetChar = instance;
      targetChar.strength = srcChar.strength;
      if (srcChar.laserModule) {
        targetChar.laserModule = new LaserModule({
          damageRate: srcChar.laserModule.damageRateProp.literalValue,
          maxDamageRate: srcChar.laserModule.maxDamageRateProp.literalValue,
          thickness: srcChar.laserModule.thicknessProp.literalValue,
          maxPower: srcChar.laserModule.maxPowerProp.literalValue
        });
      }
      if (srcChar.meleeModule) {
        targetChar.meleeModule = new MeleeModule({
          maxForce: srcChar.meleeModule.maxForceProp.literalValue,
          reach: srcChar.meleeModule.reachProp.literalValue,
          punchFrequency: srcChar.meleeModule.punchFrequencyProp.literalValue
        });
      }
      if (!srcChar.walkingModule) targetChar.walkingModule = null;
      if (!srcChar.pickupModule) targetChar.pickupModule = null;
      if (!srcChar.throwModule) targetChar.throwModule = null;
      if (!srcChar.jumpModule) targetChar.jumpModule = null;
      if (!srcChar.climbingModule) targetChar.climbingModule = null;
      const schemaToApply = this.controlSchema || srcChar.controlSchema;
      if (schemaToApply) {
        targetChar.controlSchema = JSON.parse(JSON.stringify(schemaToApply));
      }
    }
    if (arena2 && typeof arena2.syncEntitiesWithWalls === "function") {
      arena2.syncEntitiesWithWalls([instance]);
    }
    return instance;
  }
  /**
   * Updates a property on the prefab archetype and cascades the change to all
   * live instances that have not overridden this property.
   */
  setProperty(propKey, value, liveObjects) {
    this.applyPropertyToEntity(this.archetype, propKey, value);
    for (const obj of liveObjects) {
      if (obj.prefabId === this.id) {
        if (!obj.overriddenProperties.has(propKey)) {
          this.applyPropertyToEntity(obj, propKey, value);
        }
      }
    }
  }
  applyPropertyToEntity(ent, propKey, value) {
    switch (propKey) {
      case "name":
        ent.name = String(value);
        break;
      case "color":
        ent.color = String(value);
        break;
      case "visualShape":
        ent.visualShape = value === "box" ? "box" : "circle";
        break;
      case "mass":
        ent.mass = Number(value);
        if (ent.rigidbodyModule) ent.rigidbodyModule.massProp.literalValue = Number(value);
        break;
      case "colliderRadius":
        ent.colliderRadius = Number(value);
        if (ent.colliderModule) ent.colliderModule.radius = Number(value);
        if (ent.consumableModule) ent.consumableModule.initialColliderRadius = Number(value);
        break;
      case "consumable_totalEnergy":
        if (ent.consumableModule) {
          ent.consumableModule.totalEnergyJoulesProp.literalValue = Number(value);
          if (ent.consumableModule.remainingEnergyJoulesProp.literalValue > Number(value)) {
            ent.consumableModule.remainingEnergyJoulesProp.literalValue = Number(value);
          }
        }
        break;
      case "consumable_consumeRate":
        if (ent.consumableModule) {
          ent.consumableModule.consumeRateWattsProp.literalValue = Number(value);
        }
        break;
      case "consumable_healRate":
        if (ent.consumableModule) {
          ent.consumableModule.healRateProp.literalValue = Number(value);
        }
        break;
      case "consumable_tag":
        if (ent.consumableModule) {
          ent.consumableModule.tag = String(value);
        }
        break;
      case "consumable_unlimited":
        if (ent.consumableModule) {
          ent.consumableModule.unlimited = Boolean(value);
        }
        break;
    }
  }
}
class ClimbingModule {
  constructor(options) {
    __publicField(this, "id", "climbing");
    __publicField(this, "name", "Climbing Module");
    __publicField(this, "enabled", true);
    // Maximum adhesive grip force before character slips and cannot climb/cling (in Newtons)
    __publicField(this, "maxAdhesionProp");
    // Maximum vertical speed cap when climbing walls (in units per second)
    __publicField(this, "maxClimbSpeedProp");
    // Whether to allow climbing sideways along wall faces while maintaining mid-layer altitude
    __publicField(this, "horizontalClimb", false);
    // When climbing up onto a wall top, dismount is suppressed until climb control is released
    __publicField(this, "dismountSuppressedUntilRelease", false);
    // When stepping/jumping off a wall with climb key held, suppress re-grabbing until released or grounded
    __publicField(this, "climbSuppressedUntilRelease", false);
    // Set when dismounting or stepping into an open gap until hitting ground or fresh press
    __publicField(this, "isDismountFreefall", false);
    // Previous frame climb key state to detect fresh presses
    __publicField(this, "wasClimbHeldLastTick", false);
    /**
     * Whether climbing consumes energy from EnergyPool.
     */
    __publicField(this, "consumesEnergy", false);
    /** Whether climbing is allowed to run when power cannot provide 100% */
    __publicField(this, "allowPartialPower", false);
    // Behavior-driven maximum climbing power capacity (Watts)
    __publicField(this, "maxPowerProp");
    this.maxAdhesionProp = new DynamicProperty((options == null ? void 0 : options.maxAdhesion) ?? 105);
    this.maxClimbSpeedProp = new DynamicProperty((options == null ? void 0 : options.maxClimbSpeed) ?? 3);
    this.maxPowerProp = new DynamicProperty((options == null ? void 0 : options.maxPower) ?? (options == null ? void 0 : options.climbPowerCapacity) ?? 400);
    if ((options == null ? void 0 : options.horizontalClimb) !== void 0) this.horizontalClimb = options.horizontalClimb;
    if ((options == null ? void 0 : options.consumesEnergy) !== void 0) this.consumesEnergy = options.consumesEnergy;
    if ((options == null ? void 0 : options.allowPartialPower) !== void 0) this.allowPartialPower = options.allowPartialPower;
    if ((options == null ? void 0 : options.enabled) !== void 0) this.enabled = options.enabled;
  }
  get climbSuppressedUntilRePress() {
    return this.isDismountFreefall || this.climbSuppressedUntilRelease;
  }
  set climbSuppressedUntilRePress(val) {
    this.isDismountFreefall = val;
    this.climbSuppressedUntilRelease = val;
  }
  // Backwards-compatible alias
  get climbPowerCapacityProp() {
    return this.maxPowerProp;
  }
  set climbPowerCapacityProp(prop) {
    this.maxPowerProp = prop;
  }
  get maxAdhesion() {
    return this.maxAdhesionProp.literalValue;
  }
  set maxAdhesion(val) {
    this.maxAdhesionProp.literalValue = val;
  }
  get maxClimbSpeed() {
    return this.maxClimbSpeedProp.literalValue;
  }
  set maxClimbSpeed(val) {
    this.maxClimbSpeedProp.literalValue = val;
  }
  get maxPower() {
    return this.maxPowerProp.literalValue;
  }
  set maxPower(val) {
    this.maxPowerProp.literalValue = val;
  }
  getMaxPower(registry) {
    return this.maxPowerProp.get(registry);
  }
  get climbPowerCapacity() {
    return this.maxPowerProp.literalValue;
  }
  set climbPowerCapacity(val) {
    this.maxPowerProp.literalValue = val;
  }
  getClimbPowerCapacity(registry) {
    return this.maxPowerProp.get(registry);
  }
  getMaxAdhesion(registry) {
    return this.maxAdhesionProp.get(registry);
  }
  getMaxClimbSpeed(registry) {
    return this.maxClimbSpeedProp.get(registry);
  }
  /**
   * Checks if the character is intending to move towards an adjacent wall that is higher than current elevation.
   * If so, and if isClimbHeld is true, increases character's elevation until they reach the top of the wall.
   * While elevated on a wall, releasing Space bar does NOT cause falling — character maintains cling grip.
   * Falling only occurs when the player actively moves in the opposite direction (away from the wall).
   * Returns true if character is actively climbing or clinging to the wall.
   */
  update(character, movementInput, isClimbHeld, dt, arena2) {
    const isFreshClimbPress = isClimbHeld && !this.wasClimbHeldLastTick;
    this.wasClimbHeldLastTick = isClimbHeld;
    if (!isClimbHeld || character.position.z <= 0.05) {
      this.dismountSuppressedUntilRelease = false;
      this.climbSuppressedUntilRelease = false;
    }
    if (character.position.z <= 0.05 || isFreshClimbPress) {
      this.isDismountFreefall = false;
      if (character.position.z <= 0.05 && character.wallEdgeAssistModule) {
        character.wallEdgeAssistModule.isAssistClampArmed = false;
        character.wallEdgeAssistModule.hasLeftClampZoneSinceDismount = true;
        character.wallEdgeAssistModule.hasMovedOntoWall = false;
      }
    }
    if (!this.enabled || !character.hasVerticalPosition || !character.hasStrength || character.strength <= 0) {
      character.isClimbing = false;
      return false;
    }
    const r = character.hasCollider ? character.colliderRadius : 0.44;
    const inputMag = Math.hypot(movementInput.x, movementInput.y);
    const hasMoveInput = inputMag >= 0.05;
    const moveDirX = hasMoveInput ? movementInput.x / inputMag : 0;
    const moveDirY = hasMoveInput ? movementInput.y / inputMag : 0;
    if (!character.isClimbing && (character.standingWall !== null || character.position.z >= arena2.wallHeight)) {
      character.isClimbing = false;
      return false;
    }
    let targetWall = null;
    let shortestDist = Infinity;
    let targetDot = 0;
    let targetDx = 0;
    let targetDy = 0;
    for (const wall of arena2.walls) {
      const closestX = Math.max(wall.x, Math.min(character.position.x, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(character.position.y, wall.y + wall.height));
      const dx = closestX - character.position.x;
      const dy = closestY - character.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= r + 0.15 && dist < shortestDist) {
        shortestDist = dist;
        targetWall = wall;
        targetDot = hasMoveInput ? moveDirX * dx + moveDirY * dy : 0;
        targetDx = dx;
        targetDy = dy;
      }
    }
    if (!targetWall) {
      character.isClimbing = false;
      return false;
    }
    const totalMass = character.mass;
    const requiredForce = totalMass * arena2.gravity;
    const maxAdhesion = this.maxAdhesionProp.get(character.properties);
    if (requiredForce > maxAdhesion) {
      character.isClimbing = false;
      return false;
    }
    const isEstablishedClimb = character.isClimbing;
    if (isEstablishedClimb && character.position.z < targetWall.wallHeight) {
      const wallNormalX = shortestDist > 1e-3 ? targetDx / shortestDist : 0;
      const wallNormalY = shortestDist > 1e-3 ? targetDy / shortestDist : 0;
      const tangentX = -wallNormalY;
      const tangentY = wallNormalX;
      const inputDotNormal = hasMoveInput ? moveDirX * wallNormalX + moveDirY * wallNormalY : 0;
      const inputDotTangent = hasMoveInput ? moveDirX * tangentX + moveDirY * tangentY : 0;
      if (hasMoveInput && (inputDotNormal < -0.3 || !this.horizontalClimb && targetDot < -0.1)) {
        character.isClimbing = false;
        character.velocity.x = moveDirX * 3;
        character.velocity.y = moveDirY * 3;
        return false;
      }
      character.isClimbing = true;
      character.verticalVelocity = 0;
      character.standingWall = null;
      let climbPowerScale = 1;
      if (this.consumesEnergy) {
        const pool = character.energyPool;
        if (pool) {
          const g = arena2.gravity || 9.81;
          const isometricHoldingWatts = totalMass * g * 0.35 / 0.25;
          const maxAscentSpeed = this.maxClimbSpeedProp.get(character.properties);
          const ascentWatts = isClimbHeld ? totalMass * g * maxAscentSpeed / 0.25 : 0;
          const rawPowerReq = isometricHoldingWatts + ascentWatts;
          const maxPower = this.maxPowerProp.get(character.properties);
          let powerReq = rawPowerReq;
          if (powerReq > maxPower) {
            if (!this.allowPartialPower) {
              character.isClimbing = false;
              this.climbSuppressedUntilRelease = true;
              pool.registerDemand("climb", 0, this.allowPartialPower);
              return false;
            }
            powerReq = maxPower;
          }
          const granted = pool.requestPower(powerReq, dt, character.properties, false, "climb", this.allowPartialPower);
          if (granted <= 0 || pool.isExhausted || !this.allowPartialPower && granted < powerReq - 1e-3) {
            character.isClimbing = false;
            this.climbSuppressedUntilRelease = true;
            pool.registerDemand("climb", 0, this.allowPartialPower);
            return false;
          }
          climbPowerScale = Math.min(1, granted / powerReq);
        }
      }
      const maxClimbSpeed = this.maxClimbSpeedProp.get(character.properties);
      if (this.horizontalClimb && hasMoveInput && Math.abs(inputDotTangent) >= 0.1) {
        const baseMass = character.baseMass;
        const traverseSpeed = Math.max(
          0.5,
          Math.min(maxClimbSpeed, maxClimbSpeed * baseMass * character.strength / Math.max(0.1, totalMass))
        );
        character.velocity.x = tangentX * inputDotTangent * traverseSpeed;
        character.velocity.y = tangentY * inputDotTangent * traverseSpeed;
      } else {
        character.velocity.x = 0;
        character.velocity.y = 0;
      }
      if (isClimbHeld) {
        const baseMass = character.baseMass;
        const effectiveClimbSpeed = Math.max(
          0.1,
          Math.min(maxClimbSpeed, maxClimbSpeed * baseMass * character.strength / Math.max(0.1, totalMass))
        ) * climbPowerScale;
        character.position.z += effectiveClimbSpeed * dt;
        if (character.position.z >= targetWall.wallHeight) {
          character.position.z = targetWall.wallHeight;
          character.supportingSurfaceHeight = targetWall.wallHeight;
          character.standingWall = targetWall;
          character.verticalVelocity = 0;
          character.isClimbing = false;
          this.dismountSuppressedUntilRelease = false;
          character.velocity.x = 0;
          character.velocity.y = 0;
          if (shortestDist > 1e-3) {
            const surfaceX = character.position.x + targetDx;
            const surfaceY = character.position.y + targetDy;
            character.position.x = surfaceX - wallNormalX * r;
            character.position.y = surfaceY - wallNormalY * r;
          }
          if (character.wallEdgeAssistModule) {
            character.wallEdgeAssistModule.hasMovedOntoWall = false;
            character.wallEdgeAssistModule.mountStartX = character.position.x;
            character.wallEdgeAssistModule.mountStartY = character.position.y;
            character.wallEdgeAssistModule.isAssistClampArmed = true;
            character.wallEdgeAssistModule.hasLeftClampZoneSinceDismount = false;
          }
        }
      }
      return true;
    }
    const contactTolerance = 0.03;
    if (isClimbHeld && hasMoveInput && targetDot > 0.01 && shortestDist <= r + contactTolerance && character.position.z < targetWall.wallHeight) {
      if (this.consumesEnergy) {
        const pool = character.energyPool;
        if (pool) {
          const g = arena2.gravity || 9.81;
          const isometricHoldingWatts = totalMass * g * 0.35 / 0.25;
          const maxAscentSpeed = this.maxClimbSpeedProp.get(character.properties);
          const rawPowerReq = isometricHoldingWatts + totalMass * g * maxAscentSpeed / 0.25;
          const maxPower = this.maxPowerProp.get(character.properties);
          if (rawPowerReq > maxPower && !this.allowPartialPower) {
            character.isClimbing = false;
            return false;
          }
          const powerReq = Math.min(maxPower, rawPowerReq);
          if (!this.allowPartialPower && !pool.canSatisfyFullPower(powerReq, dt, character.properties, "climb")) {
            character.isClimbing = false;
            return false;
          }
        }
      }
      if (shortestDist > 1e-3) {
        const wallNormalX = targetDx / shortestDist;
        const wallNormalY = targetDy / shortestDist;
        character.position.x = character.position.x + targetDx - wallNormalX * r;
        character.position.y = character.position.y + targetDy - wallNormalY * r;
      }
      character.isClimbing = true;
      character.verticalVelocity = 0;
      character.velocity.x = 0;
      character.velocity.y = 0;
      this.isDismountFreefall = false;
      if (character.wallEdgeAssistModule) {
        character.wallEdgeAssistModule.hasMovedOntoWall = false;
      }
      character.standingWall = null;
      const baseMass = character.baseMass;
      const effectiveClimbSpeed = Math.max(
        0.2,
        Math.min(this.maxClimbSpeed, this.maxClimbSpeed * baseMass * character.strength / Math.max(0.1, totalMass))
      );
      character.position.z += effectiveClimbSpeed * dt;
      return true;
    }
    if (this.consumesEnergy && character.energyPool) {
      character.energyPool.registerDemand("climb", 0, this.allowPartialPower);
    }
    character.isClimbing = false;
    return false;
  }
}
class DamageAuraModule {
  constructor(options) {
    __publicField(this, "id", "damageAura");
    __publicField(this, "name", "Damage Aura");
    __publicField(this, "enabled", true);
    /** Radius in world units within which objects take damage */
    __publicField(this, "damageRadiusProp");
    /** Health points drained per second (HP / s) */
    __publicField(this, "damageRateProp");
    this.damageRadiusProp = new DynamicProperty((options == null ? void 0 : options.damageRadius) ?? 2.5);
    this.damageRateProp = new DynamicProperty((options == null ? void 0 : options.damageRate) ?? 25);
    if ((options == null ? void 0 : options.enabled) !== void 0) this.enabled = options.enabled;
  }
  get damageRadius() {
    return this.damageRadiusProp.literalValue;
  }
  set damageRadius(val) {
    this.damageRadiusProp.literalValue = Math.max(0.1, val);
  }
  get damageRate() {
    return this.damageRateProp.literalValue;
  }
  set damageRate(val) {
    this.damageRateProp.literalValue = Math.max(0, val);
  }
  getDamageRadius(registry) {
    return this.damageRadiusProp.get(registry);
  }
  getDamageRate(registry) {
    return this.damageRateProp.get(registry);
  }
  /**
   * Continuous update tick:
   * Applies damage to any entity in the arena that has a HealthModule and is within 3D spherical radius.
   */
  update(dt, sourceEntity, arenaOrTargets) {
    if (!this.enabled || dt <= 0) return;
    const registry = sourceEntity.properties;
    const radius = this.getDamageRadius(registry);
    const rate = this.getDamageRate(registry);
    if (radius <= 0.01 || rate <= 0) return;
    const damageThisFrame = rate * dt;
    const srcX = sourceEntity.position.x;
    const srcY = sourceEntity.position.y;
    const srcZ = sourceEntity.position.z ?? 0;
    const radiusSq = radius * radius;
    const entities = Array.isArray(arenaOrTargets) ? arenaOrTargets : arenaOrTargets.entities ?? [];
    for (const target of entities) {
      if (target === sourceEntity) continue;
      const healthMod = target.healthModule;
      if (!healthMod || !healthMod.enabled) continue;
      const targetX = target.position.x;
      const targetY = target.position.y;
      const targetZ = target.position.z ?? 0;
      const dx = targetX - srcX;
      const dy = targetY - srcY;
      const dz = targetZ - srcZ;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq <= radiusSq) {
        healthMod.takeDamage(damageThisFrame, target.properties, {
          id: "damage_aura",
          name: "Aura",
          type: "continuous",
          rate,
          color: "#a855f7",
          isHeal: false
        });
      }
    }
  }
}
const quarryPreset = {
  id: "quarry",
  name: "🪨 The Stone Quarry",
  badge: "Tactical Boulders",
  description: "Natural quarry ridges and elevated rock ramparts ideal for stone throwing, vertical climbs, and physical cover.",
  generate: (cols, rows) => {
    const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
    if (cols >= 24 && rows >= 24) {
      for (let r = 3; r <= 6; r++) {
        for (let c = 3; c <= 6; c++) {
          if (!(r === 6 && c === 6)) grid[r][c] = 1;
        }
      }
      for (let r = 3; r <= 6; r++) {
        for (let c = cols - 7; c <= cols - 4; c++) {
          if (!(r === 6 && c === cols - 7)) grid[r][c] = 1;
        }
      }
      for (let r = rows - 7; r <= rows - 4; r++) {
        for (let c = 3; c <= 6; c++) {
          if (!(r === rows - 7 && c === 6)) grid[r][c] = 1;
        }
      }
      for (let r = rows - 7; r <= rows - 4; r++) {
        for (let c = cols - 7; c <= cols - 4; c++) {
          if (!(r === rows - 7 && c === cols - 7)) grid[r][c] = 1;
        }
      }
      const midR = Math.floor(rows / 2);
      const midC = Math.floor(cols / 2);
      for (let r = midR - 4; r <= midR - 2; r++) {
        for (let c = midC - 4; c <= midC - 2; c++) grid[r][c] = 1;
      }
      for (let r = midR - 4; r <= midR - 2; r++) {
        for (let c = midC + 2; c <= midC + 4; c++) grid[r][c] = 1;
      }
      for (let r = midR + 2; r <= midR + 4; r++) {
        for (let c = midC - 4; c <= midC - 2; c++) grid[r][c] = 1;
      }
      for (let r = midR + 2; r <= midR + 4; r++) {
        for (let c = midC + 2; c <= midC + 4; c++) grid[r][c] = 1;
      }
      for (let r = midR - 1; r <= midR + 1; r++) {
        grid[r][4] = 1;
        grid[r][cols - 5] = 1;
      }
      for (let c = midC - 1; c <= midC + 1; c++) {
        grid[4][c] = 1;
        grid[rows - 5][c] = 1;
      }
      return grid;
    }
    for (let c = 4; c <= 7; c++) grid[2][c] = 1;
    for (let c = 5; c <= 8; c++) grid[3][c] = 1;
    for (let c = 12; c <= 15; c++) grid[2][c] = 1;
    for (let c = 12; c <= 15; c++) grid[11][c] = 1;
    for (let c = 11; c <= 14; c++) grid[10][c] = 1;
    for (let c = 4; c <= 7; c++) grid[11][c] = 1;
    grid[5][9] = 1;
    grid[5][10] = 1;
    grid[6][9] = 1;
    grid[6][10] = 1;
    grid[8][9] = 1;
    grid[8][10] = 1;
    grid[9][9] = 1;
    grid[9][10] = 1;
    grid[5][2] = 1;
    grid[6][2] = 1;
    grid[7][2] = 1;
    grid[8][2] = 1;
    grid[5][17] = 1;
    grid[6][17] = 1;
    grid[7][17] = 1;
    grid[8][17] = 1;
    return grid;
  }
};
if (!Arena.WALL_PRESETS.some((p) => p.id === quarryPreset.id)) {
  Arena.WALL_PRESETS.unshift(quarryPreset);
}
const QUARRY_APPLE_SPAWN_POINTS = [
  { x: 15, y: 7, z: 0 },
  // North clearing
  { x: 15, y: 23, z: 0 },
  // South clearing
  { x: 7, y: 15, z: 0 },
  // West clearing
  { x: 23, y: 15, z: 0 },
  // East clearing
  { x: 15, y: 15, z: 0 }
  // Center gateway
];
const QUARRY_DUMMY_SPAWN = { x: 15, y: 10 };
function createQuarryStones() {
  return [
    // --- King of the Hill: Central Super Apple ---
    new GameObject({
      id: "super-apple-center",
      name: "Super Apple",
      prefabId: "prefab_super_apple",
      position: { x: 15, y: 15, z: 0 },
      mass: 0.45,
      colliderRadius: 0.3,
      color: "#ff1493",
      bounceMod: 0.2,
      hasGravity: true,
      hasVerticalPosition: true,
      consumableModule: new ConsumableModule({
        tag: "food",
        unlimited: true,
        totalEnergyJoules: 1e4,
        remainingEnergyJoules: 1e4,
        consumeRateWatts: 2e3,
        healRate: 0,
        minScaleFloor: 1,
        minRadiusFloor: 0.3
      })
    }),
    // --- Ground Level Throwing Stones (Distributed across all 4 Quadrants) ---
    // Northwest Quadrant (P1 area)
    new GameObject({
      id: "stone-nw-1",
      name: "Small Throwing Stone",
      prefabId: "prefab_stone",
      position: { x: 6.2, y: 6.8, z: 0 },
      mass: 0.65,
      colliderRadius: 0.18,
      color: "#a8a29e",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 })
    }),
    new GameObject({
      id: "stone-nw-2",
      name: "Throwing Stone",
      prefabId: "prefab_stone",
      position: { x: 8.8, y: 8.5, z: 0 },
      mass: 0.85,
      colliderRadius: 0.22,
      color: "#78716c",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 })
    }),
    // Northeast Quadrant (P2 area)
    new GameObject({
      id: "stone-ne-1",
      name: "Throwing Stone",
      prefabId: "prefab_stone",
      position: { x: 21.2, y: 6.8, z: 0 },
      mass: 0.85,
      colliderRadius: 0.22,
      color: "#78716c",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 })
    }),
    new GameObject({
      id: "stone-ne-2",
      name: "Heavy Stone",
      prefabId: "prefab_stone",
      position: { x: 23.5, y: 8.5, z: 0 },
      mass: 1.25,
      colliderRadius: 0.28,
      color: "#57534e",
      bounceMod: 0.1,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.5 })
    }),
    // Southwest Quadrant (P3 area)
    new GameObject({
      id: "stone-sw-1",
      name: "Small Throwing Stone",
      prefabId: "prefab_stone",
      position: { x: 6.5, y: 21.5, z: 0 },
      mass: 0.65,
      colliderRadius: 0.18,
      color: "#a8a29e",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 })
    }),
    new GameObject({
      id: "stone-sw-2",
      name: "Throwing Stone",
      prefabId: "prefab_stone",
      position: { x: 8.8, y: 23.2, z: 0 },
      mass: 0.85,
      colliderRadius: 0.22,
      color: "#78716c",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 })
    }),
    // Southeast Quadrant (P4 area)
    new GameObject({
      id: "stone-se-1",
      name: "Small Throwing Stone",
      prefabId: "prefab_stone",
      position: { x: 21.5, y: 21.5, z: 0 },
      mass: 0.65,
      colliderRadius: 0.18,
      color: "#a8a29e",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 })
    }),
    new GameObject({
      id: "stone-se-2",
      name: "Heavy Stone",
      prefabId: "prefab_stone",
      position: { x: 23.8, y: 23.2, z: 0 },
      mass: 1.25,
      colliderRadius: 0.28,
      color: "#57534e",
      bounceMod: 0.1,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.5 })
    }),
    // Central Tactical Ammunition
    new GameObject({
      id: "stone-center-1",
      name: "Central Heavy Boulder",
      prefabId: "prefab_stone",
      position: { x: 15, y: 13.2, z: 0 },
      mass: 1.5,
      colliderRadius: 0.32,
      color: "#57534e",
      bounceMod: 0.1,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.5 })
    }),
    new GameObject({
      id: "stone-center-2",
      name: "Central Throwing Stone",
      prefabId: "prefab_stone",
      position: { x: 15, y: 16.8, z: 0 },
      mass: 0.85,
      colliderRadius: 0.22,
      color: "#78716c",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 })
    }),
    // --- Elevated Stones on Rock Ramparts (Climb to access high-ground ammunition!) ---
    new GameObject({
      id: "stone-elevated-nw",
      name: "Rampart Stone NW",
      prefabId: "prefab_stone",
      position: { x: 4.5, y: 4.5, z: 1 },
      mass: 0.9,
      colliderRadius: 0.23,
      color: "#78716c",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 })
    }),
    new GameObject({
      id: "stone-elevated-ne",
      name: "Rampart Stone NE",
      prefabId: "prefab_stone",
      position: { x: 24.5, y: 4.5, z: 1 },
      mass: 0.9,
      colliderRadius: 0.23,
      color: "#78716c",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 })
    }),
    new GameObject({
      id: "stone-elevated-sw",
      name: "Rampart Stone SW",
      prefabId: "prefab_stone",
      position: { x: 4.5, y: 24.5, z: 1 },
      mass: 0.9,
      colliderRadius: 0.23,
      color: "#78716c",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 })
    }),
    new GameObject({
      id: "stone-elevated-se",
      name: "Rampart Stone SE",
      prefabId: "prefab_stone",
      position: { x: 24.5, y: 24.5, z: 1 },
      mass: 0.9,
      colliderRadius: 0.23,
      color: "#78716c",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 })
    })
  ];
}
function applyCharacterConfig(char, config) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F, _G, _H, _I, _J, _K, _L, _M, _N, _O, _P;
  if (config.controlSchema) {
    char.controlSchema = JSON.parse(JSON.stringify(config.controlSchema));
  }
  if (config.name) char.name = config.name;
  if (config.color) char.color = config.color;
  if (config.mass !== void 0) {
    char.mass = config.mass;
    if (char.rigidbodyModule) char.rigidbodyModule.massProp.set(config.mass, char.properties);
    (_a = char.properties) == null ? void 0 : _a.set("mass", config.mass);
  }
  if (config.colliderRadius !== void 0) {
    char.colliderRadius = config.colliderRadius;
    if (char.colliderModule) char.colliderModule.radiusProp.set(config.colliderRadius, char.properties);
    (_b = char.properties) == null ? void 0 : _b.set("colliderRadius", config.colliderRadius);
  }
  if (config.strength !== void 0) {
    char.strength = config.strength;
    if (char.strengthProp) char.strengthProp.set(config.strength, char.properties);
    (_c = char.properties) == null ? void 0 : _c.set("strength", config.strength);
  }
  if (config.hasWalking === false) {
    char.walkingModule = null;
  } else if (config.walkingModule && char.walkingModule) {
    char.walkingModule.enabled = true;
    if (config.walkingModule.maxWalkForce !== void 0) {
      char.walkingModule.maxWalkForceProp.set(config.walkingModule.maxWalkForce, char.properties);
      (_d = char.properties) == null ? void 0 : _d.set("maxWalkForce", config.walkingModule.maxWalkForce);
    }
    if (config.walkingModule.maxWalkSpeed !== void 0) {
      char.walkingModule.maxWalkSpeedProp.set(config.walkingModule.maxWalkSpeed, char.properties);
      (_e = char.properties) == null ? void 0 : _e.set("maxWalkSpeed", config.walkingModule.maxWalkSpeed);
    }
    if (config.walkingModule.sprintSpeed !== void 0) {
      char.walkingModule.maxSprintSpeedProp.set(config.walkingModule.sprintSpeed, char.properties);
      (_f = char.properties) == null ? void 0 : _f.set("sprintSpeed", config.walkingModule.sprintSpeed);
    }
    if (config.walkingModule.canSprint !== void 0) char.walkingModule.canSprint = config.walkingModule.canSprint;
    if (config.walkingModule.walkInAir !== void 0) char.walkingModule.walkInAir = config.walkingModule.walkInAir;
    if (config.walkingModule.walkConsumesEnergy !== void 0) char.walkingModule.walkConsumesEnergy = config.walkingModule.walkConsumesEnergy;
    if (config.walkingModule.walkAllowPartialPower !== void 0) char.walkingModule.walkAllowPartialPower = config.walkingModule.walkAllowPartialPower;
    if (config.walkingModule.sprintConsumesEnergy !== void 0) char.walkingModule.sprintConsumesEnergy = config.walkingModule.sprintConsumesEnergy;
    if (config.walkingModule.sprintAllowPartialPower !== void 0) char.walkingModule.sprintAllowPartialPower = config.walkingModule.sprintAllowPartialPower;
    const walkPower = config.walkingModule.maxWalkPower ?? config.walkingModule.walkPowerCapacity;
    if (walkPower !== void 0 && char.walkingModule.maxWalkPowerProp) {
      char.walkingModule.maxWalkPowerProp.set(walkPower, char.properties);
      (_g = char.properties) == null ? void 0 : _g.set("walkPowerCapacity", walkPower);
    }
    const sprintPower = config.walkingModule.maxSprintPower ?? config.walkingModule.sprintPowerCapacity;
    if (sprintPower !== void 0 && char.walkingModule.maxSprintPowerProp) {
      char.walkingModule.maxSprintPowerProp.set(sprintPower, char.properties);
      (_h = char.properties) == null ? void 0 : _h.set("sprintPowerCapacity", sprintPower);
    }
    if (config.walkingModule.airFriction !== void 0 && char.walkingModule.airFrictionProp) {
      char.walkingModule.airFrictionProp.set(config.walkingModule.airFriction, char.properties);
      (_i = char.properties) == null ? void 0 : _i.set("airFriction", config.walkingModule.airFriction);
    }
  }
  if (config.hasJump === false) {
    char.jumpModule = null;
  } else if (config.jumpModule && char.jumpModule) {
    char.jumpModule.enabled = true;
    if (config.jumpModule.jumpImpulse !== void 0) {
      char.jumpModule.jumpStrengthProp.set(config.jumpModule.jumpImpulse, char.properties);
      (_j = char.properties) == null ? void 0 : _j.set("jumpImpulse", config.jumpModule.jumpImpulse);
    }
    if (config.jumpModule.maxInitialSpeed !== void 0) {
      char.jumpModule.maxInitialSpeedProp.set(config.jumpModule.maxInitialSpeed, char.properties);
      (_k = char.properties) == null ? void 0 : _k.set("maxInitialSpeed", config.jumpModule.maxInitialSpeed);
    }
    const jumpPower = config.jumpModule.jumpPowerCapacity ?? config.jumpModule.maxPower;
    if (jumpPower !== void 0 && char.jumpPowerCapacityProp) {
      char.jumpPowerCapacityProp.set(jumpPower, char.properties);
      (_l = char.properties) == null ? void 0 : _l.set("jumpPowerCapacity", jumpPower);
    }
    if (config.jumpModule.jumpConsumesEnergy !== void 0) char.jumpConsumesEnergy = config.jumpModule.jumpConsumesEnergy;
    if (config.jumpModule.jumpAllowPartialPower !== void 0) char.jumpAllowPartialPower = config.jumpModule.jumpAllowPartialPower;
  }
  if (config.hasThrow === false) {
    char.throwModule = null;
  } else if (config.throwModule && char.throwModule) {
    char.throwModule.enabled = true;
    if (config.throwModule.throwForce !== void 0) {
      char.throwModule.baseThrowForceProp.set(config.throwModule.throwForce, char.properties);
      (_m = char.properties) == null ? void 0 : _m.set("throwForce", config.throwModule.throwForce);
    }
    const throwPower = config.throwModule.throwPowerCapacity ?? config.throwModule.maxPower;
    if (throwPower !== void 0) {
      char.throwModule.maxPowerProp.set(throwPower, char.properties);
      (_n = char.properties) == null ? void 0 : _n.set("throwPowerCapacity", throwPower);
    }
    if (config.throwModule.maxThrowSpeed !== void 0) {
      char.throwModule.maxThrowSpeedProp.set(config.throwModule.maxThrowSpeed, char.properties);
      (_o = char.properties) == null ? void 0 : _o.set("maxThrowSpeed", config.throwModule.maxThrowSpeed);
    }
    if (config.throwModule.maxThrowHeight !== void 0) {
      char.throwModule.maxThrowHeightProp.set(config.throwModule.maxThrowHeight, char.properties);
      (_p = char.properties) == null ? void 0 : _p.set("maxThrowHeight", config.throwModule.maxThrowHeight);
    }
    if (config.throwModule.consumesEnergy !== void 0) char.throwModule.consumesEnergy = config.throwModule.consumesEnergy;
  }
  if (config.hasPickup === false) {
    char.pickupModule = null;
  } else if (config.pickupModule && char.pickupModule) {
    char.pickupModule.enabled = true;
    if (config.pickupModule.pickupReach !== void 0 && char.pickupModule.pickupReachProp) {
      char.pickupModule.pickupReachProp.set(config.pickupModule.pickupReach, char.properties);
      (_q = char.properties) == null ? void 0 : _q.set("pickupReach", config.pickupModule.pickupReach);
    }
    const pickupPower = config.pickupModule.maxPower ?? config.pickupModule.pickupPowerCapacity;
    if (pickupPower !== void 0 && char.pickupModule.maxPowerProp) {
      char.pickupModule.maxPowerProp.set(pickupPower, char.properties);
      (_r = char.properties) == null ? void 0 : _r.set("pickupPowerCapacity", pickupPower);
    }
    if (config.pickupModule.consumesEnergy !== void 0) char.pickupModule.consumesEnergy = config.pickupModule.consumesEnergy;
    if (config.pickupModule.allowPartialPower !== void 0) char.pickupModule.allowPartialPower = config.pickupModule.allowPartialPower;
  }
  if (config.hasClimbing === false) {
    char.climbingModule = null;
  } else if (config.climbingModule) {
    if (!char.climbingModule) {
      char.climbingModule = new ClimbingModule();
    }
    char.climbingModule.enabled = true;
    const climbSpeed = config.climbingModule.climbSpeed ?? config.climbingModule.maxClimbSpeed;
    if (climbSpeed !== void 0 && char.climbingModule.maxClimbSpeedProp) {
      char.climbingModule.maxClimbSpeedProp.set(climbSpeed, char.properties);
      (_s = char.properties) == null ? void 0 : _s.set("climbSpeed", climbSpeed);
    }
    const adhesion = config.climbingModule.maxAdhesion ?? config.climbingModule.wallAdhesionRange;
    if (adhesion !== void 0 && char.climbingModule.maxAdhesionProp) {
      char.climbingModule.maxAdhesionProp.set(adhesion, char.properties);
      (_t = char.properties) == null ? void 0 : _t.set("wallAdhesionRange", adhesion);
    }
    const climbPower = config.climbingModule.maxPower ?? config.climbingModule.climbPowerCapacity;
    if (climbPower !== void 0 && char.climbingModule.maxPowerProp) {
      char.climbingModule.maxPowerProp.set(climbPower, char.properties);
      (_u = char.properties) == null ? void 0 : _u.set("climbPowerCapacity", climbPower);
    }
    if (config.climbingModule.horizontalClimb !== void 0) char.climbingModule.horizontalClimb = config.climbingModule.horizontalClimb;
    if (config.climbingModule.horizontalClimbMultiplier !== void 0 && char.climbingModule.horizontalClimbMultiplierProp) {
      char.climbingModule.horizontalClimbMultiplierProp.set(config.climbingModule.horizontalClimbMultiplier, char.properties);
    }
    if (config.climbingModule.consumesEnergy !== void 0) char.climbingModule.consumesEnergy = config.climbingModule.consumesEnergy;
    if (config.climbingModule.allowPartialPower !== void 0) char.climbingModule.allowPartialPower = config.climbingModule.allowPartialPower;
  }
  if (config.hasHealth === false) {
    char.healthModule = null;
  } else if (config.healthModule && char.healthModule) {
    char.healthModule.enabled = true;
    if (config.healthModule.maxHp !== void 0) {
      char.healthModule.maxHp = config.healthModule.maxHp;
      (_v = char.properties) == null ? void 0 : _v.set("maxHp", config.healthModule.maxHp);
    }
    if (config.healthModule.currentHp !== void 0) char.healthModule.currentHp = config.healthModule.currentHp;
    if (config.healthModule.naturalHealRate !== void 0) {
      char.healthModule.maxHealRate = config.healthModule.naturalHealRate;
      (_w = char.properties) == null ? void 0 : _w.set("naturalHealRate", config.healthModule.naturalHealRate);
    }
    if (config.healthModule.joulesPerHp !== void 0 && char.healthModule.joulesPerHpProp) {
      char.healthModule.joulesPerHpProp.set(config.healthModule.joulesPerHp, char.properties);
      (_x = char.properties) == null ? void 0 : _x.set("joulesPerHp", config.healthModule.joulesPerHp);
      (_y = char.properties) == null ? void 0 : _y.set("hpPerJoule", config.healthModule.joulesPerHp);
    } else if (config.healthModule.hpPerJoule !== void 0 && char.healthModule.joulesPerHpProp) {
      const val = config.healthModule.hpPerJoule;
      const converted = val < 1 ? 1 / Math.max(1e-4, val) : val;
      char.healthModule.joulesPerHpProp.set(converted, char.properties);
      (_z = char.properties) == null ? void 0 : _z.set("joulesPerHp", converted);
      (_A = char.properties) == null ? void 0 : _A.set("hpPerJoule", converted);
    }
    if (config.healthModule.maxPower !== void 0 && char.healthModule.maxPowerProp) {
      char.healthModule.maxPowerProp.set(config.healthModule.maxPower, char.properties);
      (_B = char.properties) == null ? void 0 : _B.set("healthMaxPower", config.healthModule.maxPower);
    }
    if (config.healthModule.consumesEnergy !== void 0) char.healthModule.consumesEnergy = config.healthModule.consumesEnergy;
    if (config.healthModule.allowPartialPower !== void 0) char.healthModule.allowPartialPower = config.healthModule.allowPartialPower;
  }
  if (config.hasEnergyPool === false) {
    char.energyPool = null;
  } else if (config.energyPool && char.energyPool) {
    char.energyPool.enabled = true;
    if (config.energyPool.staminaCapacity !== void 0 && char.energyPool.maxStaminaProp) {
      char.energyPool.maxStaminaProp.set(config.energyPool.staminaCapacity, char.properties);
      (_C = char.properties) == null ? void 0 : _C.set("staminaCapacity", config.energyPool.staminaCapacity);
    }
    if (config.energyPool.staminaRegenRate !== void 0 && char.energyPool.staminaRegenRateProp) {
      char.energyPool.staminaRegenRateProp.set(config.energyPool.staminaRegenRate, char.properties);
      (_D = char.properties) == null ? void 0 : _D.set("staminaRegenRate", config.energyPool.staminaRegenRate);
    }
    if (config.energyPool.energyPoolCapacity !== void 0 && char.energyPool.maxEnergyProp) {
      char.energyPool.maxEnergyProp.set(config.energyPool.energyPoolCapacity, char.properties);
      (_E = char.properties) == null ? void 0 : _E.set("energyPoolCapacity", config.energyPool.energyPoolCapacity);
    }
    if (config.energyPool.muscleEfficiency !== void 0 && char.energyPool.muscleEfficiencyProp) {
      char.energyPool.muscleEfficiencyProp.set(config.energyPool.muscleEfficiency, char.properties);
      (_F = char.properties) == null ? void 0 : _F.set("muscleEfficiency", config.energyPool.muscleEfficiency);
    }
    if (config.energyPool.currentStamina !== void 0 && char.energyPool.currentStaminaProp) char.energyPool.currentStaminaProp.set(config.energyPool.currentStamina, char.properties);
    if (config.energyPool.currentEnergy !== void 0 && char.energyPool.currentEnergyProp) char.energyPool.currentEnergyProp.set(config.energyPool.currentEnergy, char.properties);
    if (config.energyPool.infiniteEnergy !== void 0) char.energyPool.infiniteEnergy = config.energyPool.infiniteEnergy;
    if (config.energyPool.debugAutoRefillOnEmpty !== void 0) char.energyPool.debugAutoRefillOnEmpty = config.energyPool.debugAutoRefillOnEmpty;
  }
  if (config.wallEdgeAssistModule && char.wallEdgeAssistModule) {
    const hang = config.wallEdgeAssistModule.hangDistance ?? config.wallEdgeAssistModule.assistRadius;
    if (hang !== void 0 && char.wallEdgeAssistModule.hangDistanceProp) {
      char.wallEdgeAssistModule.hangDistanceProp.set(hang, char.properties);
      (_G = char.properties) == null ? void 0 : _G.set("hangDistance", hang);
      (_H = char.properties) == null ? void 0 : _H.set("assistRadius", hang);
    }
    if (config.wallEdgeAssistModule.preventWalkOff !== void 0) char.wallEdgeAssistModule.preventWalkOff = config.wallEdgeAssistModule.preventWalkOff;
  }
  if (config.hasLaser === false) {
    char.laserModule = null;
  } else if (config.laserModule) {
    if (!char.laserModule) char.laserModule = new LaserModule();
    char.laserModule.enabled = true;
    if (config.laserModule.damageRate !== void 0 && char.laserModule.damageRateProp) {
      char.laserModule.damageRateProp.set(config.laserModule.damageRate, char.properties);
      (_I = char.properties) == null ? void 0 : _I.set("laserDamageRate", config.laserModule.damageRate);
    }
    if (config.laserModule.thickness !== void 0 && char.laserModule.thicknessProp) {
      char.laserModule.thicknessProp.set(config.laserModule.thickness, char.properties);
      (_J = char.properties) == null ? void 0 : _J.set("laserThickness", config.laserModule.thickness);
    }
    const laserPower = config.laserModule.maxPower ?? config.laserModule.powerRating;
    if (laserPower !== void 0 && char.laserModule.maxPowerProp) {
      char.laserModule.maxPowerProp.set(laserPower, char.properties);
      (_K = char.properties) == null ? void 0 : _K.set("laserMaxPower", laserPower);
    }
    if (config.laserModule.allowPartialPower !== void 0) char.laserModule.allowPartialPower = config.laserModule.allowPartialPower;
  }
  if (config.hasMelee === false) {
    char.meleeModule = null;
  } else if (config.meleeModule) {
    if (!char.meleeModule) char.meleeModule = new MeleeModule();
    char.meleeModule.enabled = true;
    if (config.meleeModule.impactForce !== void 0 && char.meleeModule.maxForceProp) {
      char.meleeModule.maxForceProp.set(config.meleeModule.impactForce, char.properties);
      (_L = char.properties) == null ? void 0 : _L.set("meleeMaxForce", config.meleeModule.impactForce);
    }
    if (config.meleeModule.maxPower !== void 0 && char.meleeModule.maxPowerProp) {
      char.meleeModule.maxPowerProp.set(config.meleeModule.maxPower, char.properties);
      (_M = char.properties) == null ? void 0 : _M.set("meleeMaxPower", config.meleeModule.maxPower);
    }
    if (config.meleeModule.punchFrequency !== void 0 && char.meleeModule.punchFrequencyProp) {
      char.meleeModule.punchFrequencyProp.set(config.meleeModule.punchFrequency, char.properties);
      (_N = char.properties) == null ? void 0 : _N.set("meleeFrequency", config.meleeModule.punchFrequency);
    }
    if (config.meleeModule.reach !== void 0 && char.meleeModule.reachProp) {
      char.meleeModule.reachProp.set(config.meleeModule.reach, char.properties);
      (_O = char.properties) == null ? void 0 : _O.set("meleeReach", config.meleeModule.reach);
    }
    if (config.meleeModule.width !== void 0 && char.meleeModule.widthProp) {
      char.meleeModule.widthProp.set(config.meleeModule.width, char.properties);
      (_P = char.properties) == null ? void 0 : _P.set("meleeWidth", config.meleeModule.width);
    }
    if (config.meleeModule.allowPartialPower !== void 0) char.meleeModule.allowPartialPower = config.meleeModule.allowPartialPower;
  }
  if (config.damageAuraModule && char.damageAuraModule) {
    if (config.damageAuraModule.damageRadius !== void 0) char.damageAuraModule.damageRadiusProp.set(config.damageAuraModule.damageRadius, char.properties);
    if (config.damageAuraModule.damageRate !== void 0) char.damageAuraModule.damageRateProp.set(config.damageAuraModule.damageRate, char.properties);
  }
  if (config.damageSolverModule && char.damageSolverModule) {
    if (config.damageSolverModule.impactSusceptibility !== void 0) char.damageSolverModule.impactSusceptibilityProp.set(config.damageSolverModule.impactSusceptibility, char.properties);
    if (config.damageSolverModule.minShockThreshold !== void 0) char.damageSolverModule.damageThresholdHpProp.set(config.damageSolverModule.minShockThreshold, char.properties);
    if (config.damageSolverModule.selfImpactWeight !== void 0) char.damageSolverModule.selfImpactWeightProp.set(config.damageSolverModule.selfImpactWeight, char.properties);
  }
}
function serializeGameObject(obj) {
  var _a;
  const result = {
    id: obj.id,
    name: obj.name,
    prefabId: obj.prefabId || void 0,
    position: {
      x: Math.round(obj.position.x * 100) / 100,
      y: Math.round(obj.position.y * 100) / 100,
      z: Math.round(obj.position.z * 100) / 100
    },
    color: obj.color,
    visualShape: obj.visualShape,
    isSleeping: obj.isSleeping,
    hasRigidbody: obj.rigidbodyModule !== null,
    hasCollider: obj.colliderModule !== null,
    hasFriction: obj.frictionModule !== null,
    hasBounce: obj.bounceModule !== null,
    hasVerticalPosition: obj.verticalPositionModule !== null,
    hasGravity: obj.gravityModule !== null,
    hasRollModule: obj.rollModule !== null,
    hasConsumableModule: obj.consumableModule !== null,
    hasHealthModule: obj.healthModule !== null,
    hasDamageAuraModule: obj.damageAuraModule !== null,
    hasDamageSolverModule: obj.damageSolverModule !== null,
    mass: obj.rigidbodyModule ? obj.rigidbodyModule.massProp.get(obj.properties) : 1,
    colliderRadius: obj.colliderModule ? obj.colliderModule.radiusProp.get(obj.properties) : 0.35,
    bounceMod: obj.bounceModule ? obj.bounceModule.bounceModProp.get(obj.properties) : 0.4,
    verticalBounce: ((_a = obj.bounceModule) == null ? void 0 : _a.verticalBounce) ?? false,
    staticGroundFrictionMod: obj.frictionModule ? obj.frictionModule.staticFrictionProp.get(obj.properties) : 1,
    dynamicGroundFrictionMod: obj.frictionModule ? obj.frictionModule.dynamicFrictionProp.get(obj.properties) : 1
  };
  if (obj.rigidbodyModule) {
    result.rigidbodyModule = {
      enabled: obj.rigidbodyModule.enabled,
      mass: obj.rigidbodyModule.massProp.get(obj.properties),
      collisionMode: obj.collisionMode,
      hasVerticalVelocity: obj.rigidbodyModule.hasVerticalVelocity
    };
  }
  if (obj.colliderModule) {
    result.colliderModule = {
      enabled: obj.colliderModule.enabled,
      radius: obj.colliderModule.radiusProp.get(obj.properties)
    };
  }
  if (obj.frictionModule) {
    result.frictionModule = {
      enabled: obj.frictionModule.enabled,
      staticFrictionMod: obj.frictionModule.staticFrictionProp.get(obj.properties),
      dynamicFrictionMod: obj.frictionModule.dynamicFrictionProp.get(obj.properties)
    };
  }
  if (obj.bounceModule) {
    result.bounceModule = {
      enabled: obj.bounceModule.enabled,
      bounceMod: obj.bounceModule.bounceModProp.get(obj.properties),
      verticalBounce: obj.bounceModule.verticalBounce
    };
  }
  if (obj.verticalPositionModule) {
    result.verticalPositionModule = {
      enabled: obj.verticalPositionModule.enabled,
      z: Math.round(obj.position.z * 100) / 100
    };
  }
  if (obj.gravityModule) {
    result.gravityModule = {
      enabled: obj.gravityModule.enabled
    };
  }
  if (obj.rollModule) {
    result.rollModule = {
      enabled: obj.rollModule.enabled,
      rollResistance: obj.rollModule.rollResistanceProp.get(obj.properties),
      bumpyRollEnabled: obj.rollModule.bumpyRollEnabled,
      bumpiness: obj.rollModule.bumpinessProp.get(obj.properties),
      seed: obj.rollModule.seed
    };
  }
  if (obj.consumableModule) {
    result.consumableModule = {
      enabled: obj.consumableModule.enabled,
      tag: obj.consumableModule.tag,
      totalEnergyJoules: obj.consumableModule.getTotalEnergy(obj.properties),
      remainingEnergyJoules: obj.consumableModule.getRemainingEnergy(obj.properties),
      consumeRateWatts: obj.consumableModule.getConsumeRate(obj.properties),
      healRate: obj.consumableModule.getHealRate(obj.properties),
      minScaleFloor: obj.consumableModule.minScaleFloor,
      minRadiusFloor: obj.consumableModule.minRadiusFloor,
      unlimited: obj.consumableModule.unlimited
    };
  }
  if (obj.healthModule) {
    result.healthModule = {
      enabled: obj.healthModule.enabled,
      maxHp: obj.healthModule.getMaxHp(obj.properties),
      currentHp: obj.healthModule.getCurrentHp(obj.properties),
      naturalHealRate: obj.healthModule.getMaxHealRate(obj.properties)
    };
  }
  if (obj.damageAuraModule) {
    result.damageAuraModule = {
      enabled: obj.damageAuraModule.enabled,
      damageRadius: obj.damageAuraModule.damageRadiusProp.get(obj.properties),
      damageRate: obj.damageAuraModule.damageRateProp.get(obj.properties)
    };
  }
  if (obj.damageSolverModule) {
    result.damageSolverModule = {
      enabled: obj.damageSolverModule.enabled,
      impactSusceptibility: obj.damageSolverModule.impactSusceptibilityProp.get(obj.properties),
      minShockThreshold: obj.damageSolverModule.damageThresholdHpProp.get(obj.properties),
      selfImpactWeight: obj.damageSolverModule.selfImpactWeightProp.get(obj.properties)
    };
  }
  return result;
}
function deserializeGameObject(config) {
  const options = {
    id: config.id,
    name: config.name,
    prefabId: config.prefabId,
    position: { x: config.position.x, y: config.position.y, z: config.position.z },
    color: config.color,
    visualShape: config.visualShape || "circle"
  };
  if (config.hasRigidbody === false) {
    options.rigidbodyModule = null;
    options.hasRigidbody = false;
  } else if (config.rigidbodyModule) {
    options.rigidbodyModule = new RigidbodyModule({
      mass: config.rigidbodyModule.mass ?? config.mass ?? 1,
      velocity: { x: 0, y: 0 },
      hasVerticalVelocity: config.rigidbodyModule.hasVerticalVelocity ?? true,
      verticalVelocity: 0,
      collisionMode: config.rigidbodyModule.collisionMode ?? "dynamic",
      enabled: config.rigidbodyModule.enabled ?? true
    });
  } else {
    options.mass = config.mass ?? 1;
  }
  if (config.hasCollider === false) {
    options.colliderModule = null;
  } else if (config.colliderModule) {
    options.colliderModule = new ColliderModule({
      radius: config.colliderModule.radius ?? config.colliderRadius ?? 0.35,
      enabled: config.colliderModule.enabled ?? true
    });
  } else if (config.colliderRadius !== void 0) {
    options.colliderRadius = config.colliderRadius;
  }
  if (config.hasFriction === false) {
    options.frictionModule = null;
  } else if (config.frictionModule) {
    options.frictionModule = new FrictionModule({
      staticFrictionMod: config.frictionModule.staticFrictionMod ?? config.staticGroundFrictionMod ?? 1,
      dynamicFrictionMod: config.frictionModule.dynamicFrictionMod ?? config.dynamicGroundFrictionMod ?? 1,
      enabled: config.frictionModule.enabled ?? true
    });
  } else {
    options.staticGroundFrictionMod = config.staticGroundFrictionMod ?? 1;
    options.dynamicGroundFrictionMod = config.dynamicGroundFrictionMod ?? 1;
  }
  if (config.hasBounce === false) {
    options.bounceModule = null;
  } else if (config.bounceModule) {
    options.bounceModule = new BounceModule({
      bounceMod: config.bounceModule.bounceMod ?? config.bounceMod ?? 0.4,
      verticalBounce: config.bounceModule.verticalBounce ?? config.verticalBounce ?? false,
      enabled: config.bounceModule.enabled ?? true
    });
  } else if (config.bounceMod !== void 0) {
    options.bounceMod = config.bounceMod;
  }
  if (config.hasVerticalPosition === false) {
    options.verticalPositionModule = null;
    options.hasVerticalPosition = false;
  } else if (config.verticalPositionModule) {
    options.verticalPositionModule = new VerticalPositionModule({
      z: config.verticalPositionModule.z ?? config.position.z ?? 0,
      hasVerticalVelocity: true,
      verticalVelocity: 0,
      enabled: config.verticalPositionModule.enabled ?? true
    });
  } else {
    options.hasVerticalPosition = true;
  }
  if (config.hasGravity === false) {
    options.gravityModule = null;
    options.hasGravity = false;
  } else if (config.gravityModule) {
    options.gravityModule = new GravityModule({
      enabled: config.gravityModule.enabled ?? true
    });
  } else {
    options.hasGravity = true;
  }
  if (config.hasRollModule === false) {
    options.rollModule = null;
  } else if (config.rollModule) {
    options.rollModule = new RollModule({
      enabled: config.rollModule.enabled,
      rollResistance: config.rollModule.rollResistance,
      bumpyRollEnabled: config.rollModule.bumpyRollEnabled ?? true,
      bumpiness: config.rollModule.bumpiness ?? 0.22,
      seed: config.rollModule.seed
    });
  }
  if (config.hasConsumableModule === false) {
    options.consumableModule = null;
  } else if (config.consumableModule) {
    options.consumableModule = new ConsumableModule({
      enabled: config.consumableModule.enabled,
      tag: config.consumableModule.tag,
      totalEnergyJoules: config.consumableModule.totalEnergyJoules,
      remainingEnergyJoules: config.consumableModule.remainingEnergyJoules,
      consumeRateWatts: config.consumableModule.consumeRateWatts,
      healRate: config.consumableModule.healRate,
      minScaleFloor: config.consumableModule.minScaleFloor,
      minRadiusFloor: config.consumableModule.minRadiusFloor,
      unlimited: config.consumableModule.unlimited
    });
  }
  if (config.hasHealthModule === false) {
    options.healthModule = null;
  } else if (config.healthModule) {
    options.healthModule = new HealthModule({
      enabled: config.healthModule.enabled,
      baseMaxHp: config.healthModule.maxHp,
      maxHp: config.healthModule.maxHp,
      currentHp: config.healthModule.currentHp,
      baseMaxHealRate: config.healthModule.naturalHealRate,
      maxHealRate: config.healthModule.naturalHealRate,
      consumesEnergy: false
    });
  }
  if (config.hasDamageAuraModule === false) {
    options.damageAuraModule = null;
  } else if (config.damageAuraModule) {
    options.damageAuraModule = new DamageAuraModule({
      enabled: config.damageAuraModule.enabled,
      damageRadius: config.damageAuraModule.damageRadius,
      damageRate: config.damageAuraModule.damageRate
    });
  }
  if (config.hasDamageSolverModule === false) {
    options.damageSolverModule = null;
  } else if (config.damageSolverModule) {
    options.damageSolverModule = new DamageSolverModule({
      enabled: config.damageSolverModule.enabled,
      impactSusceptibility: config.damageSolverModule.impactSusceptibility,
      damageThresholdHp: config.damageSolverModule.minShockThreshold,
      selfImpactWeight: config.damageSolverModule.selfImpactWeight
    });
  }
  const obj = new GameObject(options);
  if (config.isSleeping !== void 0) {
    obj.isSleeping = config.isSleeping;
  }
  if (config.controlSchema && obj instanceof Character) {
    obj.controlSchema = JSON.parse(JSON.stringify(config.controlSchema));
  }
  return obj;
}
function serializePrefab(prefab) {
  const schema = prefab.controlSchema || (prefab.archetype instanceof Character ? prefab.archetype.controlSchema : void 0);
  return {
    id: prefab.id,
    name: prefab.name,
    icon: prefab.icon,
    archetype: serializeGameObject(prefab.archetype),
    ...schema ? { controlSchema: schema } : {}
  };
}
const DefaultControlBlocks = [
  {
    type: "locomotion",
    id: "block-locomotion",
    name: "Locomotion",
    enabled: true,
    mode: "wasd",
    moveKeys: {
      upKey: "KeyW",
      downKey: "KeyS",
      leftKey: "KeyA",
      rightKey: "KeyD",
      requireCleanPress: false
    },
    forwardTrigger: { code: "MouseRight", requireCleanPress: false },
    reverseKey: "KeyS",
    strafeLeftKey: "KeyA",
    strafeRightKey: "KeyD",
    jump: { code: "Space", requireCleanPress: true },
    sprint: { code: "ShiftLeft", mode: "hold", requireCleanPress: false }
  },
  {
    type: "itemInteraction",
    id: "block-items",
    name: "Item Interaction",
    enabled: true,
    pickup: { code: "MouseLeft", requireCleanPress: true },
    drop: { code: "KeyQ", requireCleanPress: true },
    swap: { code: "KeyF", requireCleanPress: true },
    consume: { code: "KeyE", requireCleanPress: false },
    swapRequiresHolding: false,
    triggerPickupWhenEmptyHanded: true
  },
  {
    type: "throw",
    id: "block-throw",
    name: "Throwing & Ballistics",
    enabled: true,
    mode: "chargeAndRelease",
    chargeTrigger: { code: "MouseLeft", requireCleanPress: true },
    aimTrigger: { code: "MouseRight", requireCleanPress: false },
    fireTrigger: { code: "MouseLeft", requireCleanPress: true },
    quickTrigger: { code: "MouseLeft", requireCleanPress: true },
    arcModulation: { source: "mouseDeltaY", autoCursorLock: true, sensitivity: 5e-3 },
    enableProximityCancel: false,
    cancelRadius: 1.5
  },
  {
    type: "melee",
    id: "block-melee",
    name: "Melee Combat",
    enabled: true,
    punch: { code: "KeyF", requireCleanPress: true }
  },
  {
    type: "laser",
    id: "block-laser",
    name: "Laser Beam",
    enabled: true,
    aimTrigger: { code: "MouseRight", gateButtons: ["AltLeft"], requireCleanPress: false },
    aimMode: "mouseWorldPos",
    fireTrigger: { code: "MouseLeft", autoFireWhenAiming: false, requireCleanPress: false },
    powerLevel: { source: "mouseWheel", sensitivity: 1 }
  },
  {
    type: "facing",
    id: "block-facing",
    name: "Aim / Heading Facing",
    enabled: true,
    mode: "mouseWorldPos"
  }
];
const DefaultGamepadControlBlocks = [
  {
    type: "locomotion",
    id: "block-locomotion-gp",
    name: "Locomotion",
    enabled: true,
    mode: "stickDirectionDriveButton",
    moveKeys: {
      upKey: "GamepadDpadUp",
      downKey: "GamepadDpadDown",
      leftKey: "GamepadDpadLeft",
      rightKey: "GamepadDpadRight",
      requireCleanPress: false
    },
    jump: { code: "GamepadA", requireCleanPress: true },
    sprint: { code: "GamepadLS", mode: "hold", requireCleanPress: false },
    forwardTrigger: { code: "GamepadRT" },
    cursorSteerTrigger: { code: "GamepadLB" },
    cursorSteerMode: "toggleButton",
    rawDirectionWhileWalking: true
  },
  {
    type: "itemInteraction",
    id: "block-items-gp",
    name: "Item Interaction",
    enabled: true,
    pickup: { code: "GamepadX", requireCleanPress: true },
    drop: { code: "GamepadY", requireCleanPress: true },
    swap: { code: "GamepadB", requireCleanPress: true },
    consume: { code: "GamepadRB", requireCleanPress: false },
    swapRequiresHolding: false,
    triggerPickupWhenEmptyHanded: true
  },
  {
    type: "throw",
    id: "block-throw-gp",
    name: "Throwing & Ballistics",
    enabled: true,
    mode: "chargeAndRelease",
    chargeTrigger: { code: "GamepadRT", requireCleanPress: true },
    aimTrigger: { code: "GamepadLT", requireCleanPress: false },
    fireTrigger: { code: "GamepadRT", requireCleanPress: true },
    quickTrigger: { code: "GamepadRT", requireCleanPress: true },
    triggerMargin: 0.15,
    arcModulation: { source: "none", autoCursorLock: false, sensitivity: 5e-3 },
    enableProximityCancel: false,
    cancelRadius: 1.5
  },
  {
    type: "melee",
    id: "block-melee-gp",
    name: "Melee Combat",
    enabled: true,
    punch: { code: "GamepadB", requireCleanPress: true }
  },
  {
    type: "laser",
    id: "block-laser-gp",
    name: "Laser Beam",
    enabled: true,
    aimTrigger: { code: "GamepadLT", requireCleanPress: false },
    aimMode: "mouseWorldPos",
    fireTrigger: { code: "GamepadRT", autoFireWhenAiming: false, requireCleanPress: false },
    powerLevel: { source: "none", sensitivity: 1 }
  },
  {
    type: "facing",
    id: "block-facing-gp",
    name: "Aim / Heading Facing",
    enabled: true,
    mode: "mouseWorldPos"
  }
];
const DefaultPipelineBindings = [
  {
    id: "pipe-facing",
    name: "Aim / Facing Heading",
    enabled: true,
    source: { type: "2d_vector", source: "mouseWorldPos" },
    processor: { type: "facing", mode: "fromMousePos" },
    target: "character.facing"
  },
  {
    id: "pipe-loco-move",
    name: "WASD Movement Vector",
    enabled: true,
    source: {
      type: "composite_4key",
      upKey: "KeyW",
      downKey: "KeyS",
      leftKey: "KeyA",
      rightKey: "KeyD"
    },
    processor: { type: "2d_vector", mode: "direct" },
    target: "locomotion.moveVector"
  },
  {
    id: "pipe-loco-sprint",
    name: "Sprint",
    enabled: true,
    source: { type: "button", device: "keyboard", code: "ShiftLeft" },
    processor: { type: "button", triggerMode: "hold" },
    target: "locomotion.sprint"
  },
  {
    id: "pipe-loco-jump",
    name: "Jump / Hop",
    enabled: true,
    source: { type: "button", device: "keyboard", code: "Space" },
    processor: { type: "button", triggerMode: "down", requireCleanPress: true, claimOnFire: true },
    target: "locomotion.jump"
  },
  {
    id: "pipe-throw-aim",
    name: "Throw Aim Arc",
    enabled: true,
    condition: "holdingItem",
    source: { type: "button", device: "mouse", code: "MouseRight" },
    processor: { type: "button", triggerMode: "hold" },
    target: "throw.aim"
  },
  {
    id: "pipe-throw-arc",
    name: "Throw Arc Height Modulation",
    enabled: true,
    condition: "holdingItem",
    source: { type: "1d_scalar", source: "mouseDeltaY" },
    processor: {
      type: "1d_scalar",
      mode: "accumulator",
      sensitivity: 5e-3,
      clampMin: 0,
      clampMax: 1,
      initialValue: 0.5,
      gateButton: { device: "mouse", code: "MouseLeft", mode: "hold" },
      autoCursorLock: true
    },
    target: "throw.arcHeight"
  },
  {
    id: "pipe-throw-fire",
    name: "Throw Fire Release",
    enabled: true,
    condition: "holdingItem",
    source: { type: "button", device: "mouse", code: "MouseLeft" },
    processor: { type: "button", triggerMode: "up", requireCleanPress: false, claimOnFire: true },
    target: "throw.fire"
  },
  {
    id: "pipe-pickup-grab",
    name: "Grab Ground Item",
    enabled: true,
    condition: "emptyHanded",
    source: { type: "button", device: "mouse", code: "MouseLeft" },
    processor: { type: "button", triggerMode: "down", requireCleanPress: true, claimOnFire: true },
    target: "pickup.grab"
  },
  {
    id: "pipe-pickup-drop",
    name: "Drop Held Item",
    enabled: true,
    condition: "holdingItem",
    source: { type: "button", device: "keyboard", code: "KeyQ" },
    processor: { type: "button", triggerMode: "down", requireCleanPress: true, claimOnFire: true },
    target: "pickup.drop"
  },
  {
    id: "pipe-consume-bite",
    name: "Bite / Eat Held Item",
    enabled: true,
    condition: "holdingConsumable",
    source: { type: "button", device: "keyboard", code: "KeyE" },
    processor: { type: "button", triggerMode: "hold", requireCleanPress: true, claimOnFire: true },
    target: "consume.bite"
  },
  {
    id: "pipe-melee-punch",
    name: "Melee Punch",
    enabled: true,
    source: { type: "button", device: "keyboard", code: "KeyF" },
    processor: { type: "button", triggerMode: "down", requireCleanPress: true, claimOnFire: true },
    target: "melee.punch"
  },
  {
    id: "pipe-laser-aim",
    name: "Laser Aim Chord",
    enabled: true,
    source: { type: "button", device: "mouse", code: "MouseRight", additionalCodes: ["AltLeft"] },
    processor: { type: "button", triggerMode: "hold" },
    target: "laser.aim"
  },
  {
    id: "pipe-laser-fire",
    name: "Laser Fire",
    enabled: true,
    source: { type: "button", device: "mouse", code: "MouseLeft" },
    processor: { type: "button", triggerMode: "hold" },
    target: "laser.fire"
  },
  {
    id: "pipe-laser-power",
    name: "Laser Power Modulation",
    enabled: true,
    source: { type: "1d_scalar", source: "mouseWheel" },
    processor: {
      type: "1d_scalar",
      mode: "accumulator",
      sensitivity: 0.05,
      clampMin: 0,
      clampMax: 1,
      initialValue: 0.5,
      autoCursorLock: false
    },
    target: "laser.power"
  }
];
const DefaultPrebuiltChannels = {
  locomotion: {
    mode: "directVector",
    upKeys: ["KeyW", "ArrowUp"],
    downKeys: ["KeyS", "ArrowDown"],
    leftKeys: ["KeyA", "ArrowLeft"],
    rightKeys: ["KeyD", "ArrowRight"],
    sprintKey: "ShiftLeft",
    sprintMode: "hold",
    jumpKey: "Space"
  },
  aiming: {
    mode: "faceMouseCursor",
    rawMouseDragEnabled: true
  },
  interaction: {
    enabled: true,
    trigger: { device: "mouse", code: "MouseLeft", mode: "press" },
    claimPolicy: "requireCleanPress",
    allowSwapWhenHolding: true
  },
  throw: {
    enabled: true,
    aimTrigger: { device: "mouse", code: "MouseRight", mode: "hold" },
    fireTrigger: { device: "mouse", code: "MouseLeft", mode: "press" },
    fireOnReleaseAim: false,
    arcModulationSource: "mouseDragY",
    arcDragHoldThresholdMs: 200,
    claimPolicy: "requireCleanPress"
  },
  consume: {
    enabled: true,
    trigger: { device: "keyboard", code: "KeyE", mode: "hold" },
    claimPolicy: "requireCleanPress"
  },
  melee: {
    enabled: true,
    trigger: { device: "keyboard", code: "KeyF", mode: "press" },
    claimPolicy: "requireCleanPress"
  },
  laser: {
    enabled: true,
    aimTrigger: { device: "mouse", code: "MouseRight", chordModifiers: ["AltLeft"], mode: "hold" },
    fireTrigger: { device: "mouse", code: "MouseLeft", mode: "hold" },
    powerModulationSource: "mouseWheel"
  }
};
const DefaultControlSchema = {
  id: "default",
  name: "Default (Action Context)",
  description: "Standard twin-stick and WASD setup with smart contextual action triggers.",
  activeDevice: "keyboardMouse",
  stages: ["none", "laser", "throw", "melee"],
  stageGroups: [{ name: "default", stages: ["none", "laser", "throw", "melee"] }],
  pipeline: JSON.parse(JSON.stringify(DefaultPipelineBindings)),
  keyboardMouse: {
    pipeline: JSON.parse(JSON.stringify(DefaultPipelineBindings)),
    channels: JSON.parse(JSON.stringify(DefaultPrebuiltChannels)),
    aiming: { mode: "faceMouseCursor" },
    locomotion: {
      mode: "directVector",
      moveForwardKey: "KeyW",
      strafeLeftKey: "KeyA",
      reverseKey: "KeyS",
      strafeRightKey: "KeyD"
    },
    rules: [
      // 1. Laser Beam: Aim with Alt + RMB or Stage, Fire with Alt + LMB or Staged LMB
      {
        id: "kbm-laser-aim-alt",
        name: "Aim Laser (Alt + RMB)",
        enabled: true,
        priority: 110,
        trigger: { device: "mouse", code: "MouseRight", chordModifiers: ["AltLeft"], mode: "hold" },
        condition: { type: "always" },
        action: { moduleId: "laser", intent: "aimLaser" }
      },
      {
        id: "kbm-laser-fire-alt",
        name: "Fire Laser (Alt + LMB)",
        enabled: true,
        priority: 105,
        trigger: { device: "mouse", code: "MouseLeft", chordModifiers: ["AltLeft"], mode: "hold" },
        condition: { type: "always" },
        action: { moduleId: "laser", intent: "fireLaser" }
      },
      {
        id: "kbm-laser-fire",
        name: "Fire Laser (Staged)",
        enabled: true,
        priority: 100,
        trigger: { device: "mouse", code: "MouseLeft", mode: "hold" },
        condition: { type: "stagedActionIs", param: "laser" },
        action: { moduleId: "laser", intent: "fireLaser" }
      },
      // 2. Throwing: RMB previews trajectory arc, releasing LMB executes throw
      {
        id: "kbm-throw-aim-rmb",
        name: "Aim Throw Trajectory (RMB)",
        enabled: true,
        priority: 95,
        trigger: { device: "mouse", code: "MouseRight", mode: "hold" },
        condition: { type: "holdingObject" },
        action: { moduleId: "throw", intent: "aimThrow" }
      },
      {
        id: "kbm-throw-release",
        name: "Throw Held Item (Release LMB)",
        enabled: true,
        priority: 90,
        trigger: { device: "mouse", code: "MouseLeft", mode: "release" },
        condition: { type: "holdingObject" },
        action: { moduleId: "throw", intent: "releaseThrow" }
      },
      // 3. Melee Punch: Alt + F or direct F
      {
        id: "kbm-melee-punch-alt",
        name: "Melee Punch (Alt + F)",
        enabled: true,
        priority: 88,
        trigger: { device: "keyboard", code: "KeyF", chordModifiers: ["AltLeft"], mode: "press" },
        condition: { type: "always" },
        action: { moduleId: "melee", intent: "punch" }
      },
      {
        id: "kbm-melee-punch",
        name: "Melee Punch (F Key)",
        enabled: true,
        priority: 85,
        trigger: { device: "keyboard", code: "KeyF", mode: "press" },
        condition: { type: "always" },
        action: { moduleId: "melee", intent: "punch" }
      },
      // 4. Pickup: Press E or click LMB when in reach
      {
        id: "kbm-pickup-key-e",
        name: "Pick Up Object (E Key)",
        enabled: true,
        priority: 82,
        trigger: { device: "keyboard", code: "KeyE", mode: "press" },
        condition: { type: "targetInReach" },
        action: { moduleId: "pickup", intent: "pickupReach" }
      },
      {
        id: "kbm-pickup-click",
        name: "Pick Up Object (LMB Click)",
        enabled: true,
        priority: 80,
        trigger: { device: "mouse", code: "MouseLeft", mode: "press" },
        condition: { type: "targetInReach" },
        action: { moduleId: "pickup", intent: "pickupReach" }
      },
      // 5. Held Item Primary Ability: Hold C to use primary ability of held item (consumables eaten)
      {
        id: "kbm-item-primary",
        name: "Primary Item Ability (C Key)",
        enabled: true,
        priority: 70,
        trigger: { device: "keyboard", code: "KeyC", mode: "hold" },
        condition: { type: "holdingItemWithPrimaryAbility" },
        action: { moduleId: "heldItem", intent: "primaryItemAbility" }
      },
      // 6. Locomotion: Jump, Sprint, Drop
      {
        id: "kbm-jump",
        name: "Jump (Space)",
        enabled: true,
        priority: 60,
        trigger: { device: "keyboard", code: "Space", mode: "press" },
        condition: { type: "always" },
        action: { moduleId: "locomotion", intent: "jump" }
      },
      {
        id: "kbm-sprint",
        name: "Hold Sprint (Shift)",
        enabled: true,
        priority: 50,
        trigger: { device: "keyboard", code: "ShiftLeft", mode: "hold" },
        condition: { type: "always" },
        action: { moduleId: "locomotion", intent: "holdSprint" }
      },
      {
        id: "kbm-drop",
        name: "Drop Item (Q Key)",
        enabled: true,
        priority: 40,
        trigger: { device: "keyboard", code: "KeyQ", mode: "press" },
        condition: { type: "holdingObject" },
        action: { moduleId: "pickup", intent: "dropItem" }
      }
    ]
  },
  gamepad: {
    blocks: JSON.parse(JSON.stringify(DefaultGamepadControlBlocks)),
    leftStick: {
      primaryMode: "directLocomotion",
      dynamicOverride: {
        triggerCondition: "whenLtHeld",
        overrideMode: "cursorSteer"
      },
      cursorSteerSpeed: 14,
      cursorClampRadius: 7.5
    },
    rightStick: { mode: "twinStickAim" },
    rules: [
      {
        id: "pad-laser-aim-lt",
        name: "Aim Laser (LT)",
        enabled: true,
        priority: 105,
        trigger: { device: "gamepad", code: "GamepadLT", mode: "hold" },
        condition: { type: "always" },
        action: { moduleId: "laser", intent: "aimLaser" }
      },
      {
        id: "pad-laser-fire",
        name: "Fire Laser (RT)",
        enabled: true,
        priority: 100,
        trigger: { device: "gamepad", code: "GamepadRT", mode: "hold" },
        condition: { type: "always" },
        action: { moduleId: "laser", intent: "fireLaser" }
      },
      {
        id: "pad-throw-aim-lt",
        name: "Aim Throw Trajectory (LT)",
        enabled: true,
        priority: 95,
        trigger: { device: "gamepad", code: "GamepadLT", mode: "hold" },
        condition: { type: "holdingObject" },
        action: { moduleId: "throw", intent: "aimThrow" }
      },
      {
        id: "pad-throw-release",
        name: "Throw Held Item (RT)",
        enabled: true,
        priority: 90,
        trigger: { device: "gamepad", code: "GamepadRT", mode: "release" },
        condition: { type: "holdingObject" },
        action: { moduleId: "throw", intent: "releaseThrow" }
      },
      {
        id: "pad-pickup-rt",
        name: "Pick Up Object (RT)",
        enabled: true,
        priority: 80,
        trigger: { device: "gamepad", code: "GamepadRT", mode: "press" },
        condition: { type: "targetInReach" },
        action: { moduleId: "pickup", intent: "pickupReach" }
      },
      {
        id: "pad-melee-b",
        name: "Melee Punch (B)",
        enabled: true,
        priority: 75,
        trigger: { device: "gamepad", code: "GamepadB", mode: "press" },
        condition: { type: "emptyHanded" },
        action: { moduleId: "melee", intent: "punch" }
      },
      {
        id: "pad-jump",
        name: "Jump (A)",
        enabled: true,
        priority: 70,
        trigger: { device: "gamepad", code: "GamepadA", mode: "press" },
        condition: { type: "always" },
        action: { moduleId: "locomotion", intent: "jump" }
      },
      {
        id: "pad-sprint-toggle",
        name: "Toggle Sprint (LS)",
        enabled: true,
        priority: 60,
        trigger: { device: "gamepad", code: "GamepadLS", mode: "press" },
        condition: { type: "always" },
        action: { moduleId: "locomotion", intent: "toggleSprint" }
      },
      {
        id: "pad-drop",
        name: "Drop Item (X)",
        enabled: true,
        priority: 50,
        trigger: { device: "gamepad", code: "GamepadX", mode: "press" },
        condition: { type: "holdingObject" },
        action: { moduleId: "pickup", intent: "dropItem" }
      }
    ]
  },
  touch: {
    widgets: [
      {
        id: "touch-move-stick",
        type: "joystick",
        label: "Move",
        anchor: "bottomLeft",
        offset: { x: 90, y: 90 },
        radius: 65,
        centering: "floating",
        snapBackOnRelease: true,
        rings: [
          { id: "deadzone", minDeflection: 0, maxDeflection: 0.15, signalId: "idle" },
          { id: "walk", minDeflection: 0.15, maxDeflection: 0.65, signalId: "walk" },
          { id: "sprint", minDeflection: 0.65, maxDeflection: 1, signalId: "sprint" }
        ]
      },
      {
        id: "touch-aim-stick",
        type: "joystick",
        label: "Aim",
        anchor: "bottomRight",
        offset: { x: -90, y: 90 },
        radius: 65,
        centering: "floating",
        snapBackOnRelease: true,
        rings: []
      },
      {
        id: "touch-jump-btn",
        type: "actionButton",
        label: "JUMP",
        anchor: "bottomRight",
        offset: { x: -80, y: 190 },
        radius: 35,
        centering: "fixed",
        snapBackOnRelease: true,
        rings: [],
        tapAction: "jump"
      }
    ],
    rules: []
  }
};
const HunterControlSchema = {
  id: "hunter-mouse-drive",
  name: "Hunter (Mouse-Facing Forward Drive)",
  description: "Character faces the mouse. Right-click drives forward. Left hand stages abilities, left-click executes.",
  activeDevice: "keyboardMouse",
  stages: ["none", "laser", "throw", "melee"],
  stageGroups: [{ name: "default", stages: ["none", "laser", "throw", "melee"] }],
  keyboardMouse: {
    aiming: { mode: "faceMouseCursor" },
    locomotion: {
      mode: "forwardFacingDrive",
      forwardTrigger: { device: "mouse", code: "MouseRight", mode: "hold" }
    },
    rules: [
      // Left-hand Staging
      {
        id: "hunter-stage-laser",
        name: "Stage Laser (Q)",
        enabled: true,
        priority: 100,
        trigger: { device: "keyboard", code: "KeyQ", mode: "press" },
        condition: { type: "always" },
        action: { moduleId: "staging", intent: "setStage", args: { stage: "laser" } }
      },
      {
        id: "hunter-stage-throw",
        name: "Stage Throw (E)",
        enabled: true,
        priority: 100,
        trigger: { device: "keyboard", code: "KeyE", mode: "press" },
        condition: { type: "always" },
        action: { moduleId: "staging", intent: "setStage", args: { stage: "throw" } }
      },
      {
        id: "hunter-stage-melee",
        name: "Stage Melee Punch (F)",
        enabled: true,
        priority: 100,
        trigger: { device: "keyboard", code: "KeyF", mode: "press" },
        condition: { type: "always" },
        action: { moduleId: "staging", intent: "setStage", args: { stage: "melee" } }
      },
      {
        id: "hunter-item-primary",
        name: "Primary Item Ability (C)",
        enabled: true,
        priority: 95,
        trigger: { device: "keyboard", code: "KeyC", mode: "hold" },
        condition: { type: "holdingItemWithPrimaryAbility" },
        action: { moduleId: "heldItem", intent: "primaryItemAbility" }
      },
      {
        id: "hunter-jump",
        name: "Jump (Space)",
        enabled: true,
        priority: 90,
        trigger: { device: "keyboard", code: "Space", mode: "press" },
        condition: { type: "always" },
        action: { moduleId: "locomotion", intent: "jump" }
      },
      {
        id: "hunter-sprint",
        name: "Sprint (Shift)",
        enabled: true,
        priority: 85,
        trigger: { device: "keyboard", code: "ShiftLeft", mode: "hold" },
        condition: { type: "always" },
        action: { moduleId: "locomotion", intent: "holdSprint" }
      },
      // Mouse Left Click Execution based on Staged state or context
      {
        id: "hunter-exec-laser",
        name: "Fire Laser (Staged)",
        enabled: true,
        priority: 80,
        trigger: { device: "mouse", code: "MouseLeft", mode: "hold" },
        condition: { type: "stagedActionIs", param: "laser" },
        action: { moduleId: "laser", intent: "fireLaser" }
      },
      {
        id: "hunter-exec-melee",
        name: "Punch (Staged)",
        enabled: true,
        priority: 75,
        trigger: { device: "mouse", code: "MouseLeft", mode: "press" },
        condition: { type: "stagedActionIs", param: "melee" },
        action: { moduleId: "melee", intent: "punch" }
      },
      {
        id: "hunter-exec-throw",
        name: "Throw Held Object",
        enabled: true,
        priority: 70,
        trigger: { device: "mouse", code: "MouseLeft", mode: "release" },
        condition: { type: "holdingObject" },
        action: { moduleId: "throw", intent: "releaseThrow" }
      },
      {
        id: "hunter-exec-pickup",
        name: "Pick Up Object",
        enabled: true,
        priority: 60,
        trigger: { device: "mouse", code: "MouseLeft", mode: "press" },
        condition: { type: "targetInReach" },
        action: { moduleId: "pickup", intent: "pickupReach" }
      }
    ]
  },
  gamepad: DefaultControlSchema.gamepad,
  touch: DefaultControlSchema.touch
};
const GamepadHybridSchema = {
  id: "gamepad-hybrid-cursor",
  name: "Gamepad Hybrid (Left-Stick Cursor Steer)",
  description: "Left stick walks normally. Holding LT (or aiming) dynamically switches left stick to steer an aiming reticle.",
  activeDevice: "gamepad",
  keyboardMouse: DefaultControlSchema.keyboardMouse,
  gamepad: {
    blocks: JSON.parse(JSON.stringify(DefaultGamepadControlBlocks)),
    leftStick: {
      primaryMode: "directLocomotion",
      dynamicOverride: {
        triggerCondition: "whenLtHeld",
        overrideMode: "cursorSteer"
      },
      cursorSteerSpeed: 14,
      cursorClampRadius: 7.5
    },
    rightStick: { mode: "twinStickAim" },
    rules: [
      ...DefaultControlSchema.gamepad.rules
    ]
  },
  touch: DefaultControlSchema.touch
};
const BuiltinControlSchemas = [
  DefaultControlSchema,
  HunterControlSchema,
  GamepadHybridSchema
];
class PrefabManager {
  constructor() {
    __publicField(this, "prefabs", /* @__PURE__ */ new Map());
    __publicField(this, "onPrefabChangedCallbacks", /* @__PURE__ */ new Set());
    this.initDefaultPrefabs();
  }
  initDefaultPrefabs() {
    const appleArchetype = new GameObject({
      id: "archetype_apple",
      name: "Apple",
      position: { x: 0, y: 0, z: 0 },
      color: "#22c55e",
      visualShape: "circle",
      mass: 0.35,
      colliderRadius: 0.25,
      bounceMod: 0.2,
      hasGravity: true,
      hasVerticalPosition: true,
      consumableModule: new ConsumableModule({
        tag: "food",
        totalEnergyJoules: 4e3,
        remainingEnergyJoules: 4e3,
        consumeRateWatts: 800,
        healRate: 0,
        minScaleFloor: 0.35,
        minRadiusFloor: 0.12
      })
    });
    const applePrefab = new Prefab({
      id: "prefab_apple",
      name: "Apple",
      icon: "🍏",
      archetype: appleArchetype
    });
    this.prefabs.set(applePrefab.id, applePrefab);
    const superAppleArchetype = new GameObject({
      id: "archetype_super_apple",
      name: "Super Apple",
      position: { x: 0, y: 0, z: 0 },
      color: "#ff1493",
      visualShape: "circle",
      mass: 0.45,
      colliderRadius: 0.3,
      bounceMod: 0.2,
      hasGravity: true,
      hasVerticalPosition: true,
      consumableModule: new ConsumableModule({
        tag: "food",
        unlimited: true,
        totalEnergyJoules: 1e4,
        remainingEnergyJoules: 1e4,
        consumeRateWatts: 2e3,
        healRate: 0,
        minScaleFloor: 1,
        minRadiusFloor: 0.3
      })
    });
    const superApplePrefab = new Prefab({
      id: "prefab_super_apple",
      name: "Super Apple",
      icon: "💖",
      archetype: superAppleArchetype
    });
    this.prefabs.set(superApplePrefab.id, superApplePrefab);
    const stoneArchetype = new GameObject({
      id: "archetype_stone",
      name: "Stone",
      position: { x: 0, y: 0, z: 0 },
      color: "#78716c",
      visualShape: "circle",
      mass: 0.85,
      colliderRadius: 0.22,
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({
        rollResistance: 0.45,
        bumpyRollEnabled: true,
        bumpiness: 0.28
      })
    });
    const stonePrefab = new Prefab({
      id: "prefab_stone",
      name: "Stone",
      icon: "🪨",
      archetype: stoneArchetype
    });
    this.prefabs.set(stonePrefab.id, stonePrefab);
    const playerArchetype = new Character({
      id: "archetype_player",
      name: "Player",
      color: "#f59e0b",
      colliderRadius: 0.44,
      mass: 1.2,
      strength: 1
    });
    const playerPrefab = new Prefab({
      id: "prefab_player",
      name: "Player",
      icon: "🧙",
      archetype: playerArchetype
    });
    playerArchetype.controlSchema = JSON.parse(JSON.stringify(DefaultControlSchema));
    playerPrefab.controlSchema = JSON.parse(JSON.stringify(DefaultControlSchema));
    this.prefabs.set(playerPrefab.id, playerPrefab);
    const hunterArchetype = new Character({
      id: "archetype_hunter",
      name: "Hunter",
      color: "#06b6d4",
      colliderRadius: 0.44,
      mass: 1.1,
      strength: 1.2
    });
    hunterArchetype.controlSchema = JSON.parse(JSON.stringify(HunterControlSchema));
    const hunterPrefab = new Prefab({
      id: "prefab_hunter",
      name: "Hunter",
      icon: "🏹",
      archetype: hunterArchetype,
      controlSchema: JSON.parse(JSON.stringify(HunterControlSchema))
    });
    this.prefabs.set(hunterPrefab.id, hunterPrefab);
    const fighterArchetype = new Character({
      id: "archetype_fighter",
      name: "Fighter",
      color: "#f43f5e",
      colliderRadius: 0.48,
      mass: 1.4,
      strength: 1.5
    });
    fighterArchetype.controlSchema = JSON.parse(JSON.stringify(GamepadHybridSchema));
    const fighterPrefab = new Prefab({
      id: "prefab_fighter",
      name: "Fighter",
      icon: "🥊",
      archetype: fighterArchetype,
      controlSchema: JSON.parse(JSON.stringify(GamepadHybridSchema))
    });
    this.prefabs.set(fighterPrefab.id, fighterPrefab);
  }
  getAll() {
    return Array.from(this.prefabs.values());
  }
  get(id) {
    return this.prefabs.get(id);
  }
  /**
   * Loads or updates prefab definitions from serialized world configuration.
   */
  loadFromConfig(configs) {
    if (!configs || !Array.isArray(configs)) return;
    for (const cfg of configs) {
      if (!cfg || !cfg.id || !cfg.archetype) continue;
      const archetype = deserializeGameObject(cfg.archetype);
      const existing = this.prefabs.get(cfg.id);
      if (existing) {
        existing.name = cfg.name;
        if (cfg.icon) existing.icon = cfg.icon;
        existing.archetype = archetype;
        existing.controlSchema = cfg.controlSchema;
      } else {
        const prefab = new Prefab({
          id: cfg.id,
          name: cfg.name,
          icon: cfg.icon,
          archetype,
          controlSchema: cfg.controlSchema
        });
        this.prefabs.set(cfg.id, prefab);
      }
    }
    this.notifyChanged();
  }
  exportAll() {
    return Array.from(this.prefabs.values()).map(serializePrefab);
  }
  /**
   * Creates a new Prefab from an existing scene GameObject.
   * Links the source entity to the new prefab as its first instance.
   */
  createFromEntity(entity, name) {
    const id = `prefab_${Date.now()}_${Math.floor(Math.random() * 1e3)}`;
    const prefabName = name || entity.name || "Custom Prefab";
    const icon = entity.consumableModule ? "🍎" : entity.visualShape === "box" ? "📦" : "⚪";
    const GameObjectClass = entity.constructor;
    let cloneConsumable = null;
    if (entity.consumableModule) {
      const src = entity.consumableModule;
      cloneConsumable = new ConsumableModule({
        tag: src.tag,
        totalEnergyJoules: src.totalEnergyJoulesProp.literalValue,
        remainingEnergyJoules: src.totalEnergyJoulesProp.literalValue,
        consumeRateWatts: src.consumeRateWattsProp.literalValue,
        healRate: src.healRateProp.literalValue,
        minScaleFloor: src.minScaleFloor,
        minRadiusFloor: src.minRadiusFloor,
        unlimited: src.unlimited
      });
      cloneConsumable.initialColliderRadius = src.initialColliderRadius;
    }
    let cloneRoll = null;
    if (entity.rollModule) {
      cloneRoll = new RollModule({
        enabled: entity.rollModule.enabled,
        rollResistance: entity.rollModule.rollResistance,
        bumpyRollEnabled: entity.rollModule.bumpyRollEnabled,
        bumpiness: entity.rollModule.bumpiness,
        seed: entity.rollModule.seed
      });
    }
    const archetype = new GameObjectClass({
      name: prefabName,
      position: { x: 0, y: 0, z: 0 },
      color: entity.color,
      visualShape: entity.visualShape,
      mass: entity.mass,
      colliderRadius: entity.consumableModule ? entity.consumableModule.initialColliderRadius || entity.colliderRadius : entity.colliderRadius,
      bounceMod: entity.bounceMod,
      hasGravity: entity.hasGravity,
      hasVerticalPosition: entity.hasVerticalPosition,
      consumableModule: cloneConsumable,
      rollModule: cloneRoll
    });
    const prefab = new Prefab({
      id,
      name: prefabName,
      icon,
      archetype,
      controlSchema: entity instanceof Character && entity.controlSchema ? JSON.parse(JSON.stringify(entity.controlSchema)) : void 0
    });
    this.prefabs.set(id, prefab);
    entity.prefabId = id;
    entity.overriddenProperties.clear();
    this.notifyChanged();
    return prefab;
  }
  /**
   * Instantiates a prefab into the scene.
   */
  spawn(prefabId, pos, arena2, objects2) {
    const prefab = this.prefabs.get(prefabId);
    if (!prefab) return null;
    const instance = prefab.instantiate(pos, arena2);
    if (objects2 && !objects2.includes(instance)) {
      objects2.push(instance);
    }
    return instance;
  }
  /**
   * Deletes a prefab without deleting live instances.
   * Any live instances simply have their prefabId cleared.
   */
  delete(prefabId, liveObjects) {
    if (!this.prefabs.has(prefabId)) return false;
    this.prefabs.delete(prefabId);
    if (liveObjects) {
      for (const obj of liveObjects) {
        if (obj.prefabId === prefabId) {
          obj.prefabId = null;
          obj.overriddenProperties.clear();
        }
      }
    }
    this.notifyChanged();
    return true;
  }
  onPrefabsChanged(cb) {
    this.onPrefabChangedCallbacks.add(cb);
    return () => this.onPrefabChangedCallbacks.delete(cb);
  }
  notifyChanged() {
    for (const cb of this.onPrefabChangedCallbacks) {
      cb();
    }
  }
}
const prefabManager = new PrefabManager();
class SceneSpawnerManager {
  constructor(pm = prefabManager) {
    __publicField(this, "spawners", /* @__PURE__ */ new Map());
    __publicField(this, "onSpawnersChangedCallbacks", /* @__PURE__ */ new Set());
    __publicField(this, "prefabManager");
    this.prefabManager = pm;
    this.initDefaultSpawners();
  }
  initDefaultSpawners() {
    const appleSpawner = new SceneSpawner({
      id: "spawner_apple_default",
      name: "Apple Spawner",
      enabled: true,
      prefabId: "prefab_apple",
      intervalMinutes: 0.25,
      // every 15 seconds
      maxCount: 5,
      // up to 5 apples in scene at once
      designatedSpawnPoints: QUARRY_APPLE_SPAWN_POINTS
    });
    this.spawners.set(appleSpawner.id, appleSpawner);
  }
  getAll() {
    return Array.from(this.spawners.values());
  }
  get(id) {
    return this.spawners.get(id);
  }
  create(options) {
    const spawner = new SceneSpawner(options);
    this.spawners.set(spawner.id, spawner);
    this.notifyChanged();
    return spawner;
  }
  delete(id) {
    const deleted = this.spawners.delete(id);
    if (deleted) {
      this.notifyChanged();
    }
    return deleted;
  }
  loadFromConfig(spawnersData) {
    this.spawners.clear();
    for (const data of spawnersData) {
      const spawner = new SceneSpawner(data);
      this.spawners.set(spawner.id, spawner);
    }
    this.notifyChanged();
  }
  update(dt, arena2, objects2) {
    for (const spawner of this.spawners.values()) {
      if (spawner.enabled) {
        spawner.update(dt, arena2, objects2, this.prefabManager);
      }
    }
  }
  onSpawnersChanged(cb) {
    this.onSpawnersChangedCallbacks.add(cb);
    return () => this.onSpawnersChangedCallbacks.delete(cb);
  }
  notifyChanged() {
    for (const cb of this.onSpawnersChangedCallbacks) {
      cb();
    }
  }
}
const sceneSpawnerManager = new SceneSpawnerManager();
class PlayerJitterQueue {
  constructor(playerId, config) {
    __publicField(this, "playerId");
    __publicField(this, "targetDepth");
    __publicField(this, "maxCapacity");
    __publicField(this, "burstDrainThreshold");
    __publicField(this, "queue", []);
    __publicField(this, "lastConsumedTick", null);
    __publicField(this, "lastKnownInput", null);
    // Diagnostics counters
    __publicField(this, "starvations", 0);
    __publicField(this, "overflows", 0);
    __publicField(this, "duplicates", 0);
    __publicField(this, "burstDrains", 0);
    __publicField(this, "receivedCount", 0);
    __publicField(this, "consumedCount", 0);
    __publicField(this, "hasPrimed", false);
    this.playerId = playerId;
    this.targetDepth = (config == null ? void 0 : config.targetDepth) ?? 2;
    this.maxCapacity = (config == null ? void 0 : config.maxCapacity) ?? 60;
    this.burstDrainThreshold = (config == null ? void 0 : config.burstDrainThreshold) ?? Math.max(4, this.targetDepth + 2);
  }
  /**
   * Current number of input packets waiting in the jitter buffer.
   */
  get length() {
    return this.queue.length;
  }
  /**
   * Enqueues an incoming input packet into the priority queue, sorted ascending by tick.
   * Drops duplicates and stale packets. Clamps at max capacity.
   *
   * @returns true if packet was enqueued, false if rejected (duplicate or stale).
   */
  push(packet) {
    if (packet.tick !== void 0) {
      if (this.lastConsumedTick !== null && packet.tick <= this.lastConsumedTick) {
        this.duplicates++;
        return false;
      }
      if (this.queue.some((p) => p.tick === packet.tick)) {
        this.duplicates++;
        return false;
      }
    }
    if (packet.tick !== void 0) {
      let insertIdx = 0;
      while (insertIdx < this.queue.length && (this.queue[insertIdx].tick ?? -Infinity) <= packet.tick) {
        insertIdx++;
      }
      this.queue.splice(insertIdx, 0, packet);
    } else {
      this.queue.push(packet);
    }
    if (this.queue.length > this.maxCapacity) {
      this.queue.shift();
      this.overflows++;
    }
    this.receivedCount++;
    return true;
  }
  /**
   * Consumes the next input packet for the current server simulation tick.
   *
   * - If queue has burst backlog exceeding target depth, excess intermediate packets
   *   are drained and returned in `drainedPackets` so the caller can apply fast-forward updates.
   * - If queue has available inputs and is primed, pops the oldest sorted packet.
   * - When a player first joins, waits until targetDepth (e.g. 2 packets) are primed before consuming,
   *   preventing high-ping players from stuttering in half-speed slow motion.
   * - If queue is starved (empty), generates a safe neutral packet with zero movement
   *   to prevent runaway ghost overshoot while preserving last known aim direction.
   */
  consume(serverTick) {
    var _a, _b, _c, _d;
    const drainedPackets = [];
    if (!this.hasPrimed && this.queue.length > 0) {
      this.hasPrimed = true;
    }
    if (this.queue.length > this.burstDrainThreshold) {
      const excessCount = this.queue.length - (this.targetDepth + 1);
      for (let i = 0; i < excessCount; i++) {
        const excessPkt = this.queue.shift();
        if (excessPkt) {
          drainedPackets.push(excessPkt);
          this.consumedCount++;
          if (excessPkt.tick !== void 0) {
            this.lastConsumedTick = excessPkt.tick;
          }
          this.lastKnownInput = excessPkt;
          this.burstDrains++;
        }
      }
    }
    if (this.queue.length > 0) {
      const pkt = this.queue.shift();
      this.consumedCount++;
      if (pkt.tick !== void 0) {
        this.lastConsumedTick = pkt.tick;
      }
      this.lastKnownInput = pkt;
      return {
        packet: pkt,
        isStarved: false,
        drainedPackets
      };
    }
    this.starvations++;
    const neutralPacket = {
      playerId: this.playerId,
      tick: serverTick,
      moveX: 0,
      moveY: 0,
      isSprinting: false,
      isJumpHeld: false,
      isGrabHeld: false,
      isDrop: false,
      isThrow: false,
      isAiming: false,
      isLockHeld: false,
      // Retain last known aim coordinates so player orientation doesn't snap abruptly
      aimX: (_a = this.lastKnownInput) == null ? void 0 : _a.aimX,
      aimY: (_b = this.lastKnownInput) == null ? void 0 : _b.aimY,
      facingAngle: (_c = this.lastKnownInput) == null ? void 0 : _c.facingAngle
    };
    neutralPacket.isUsingItem = ((_d = this.lastKnownInput) == null ? void 0 : _d.isUsingItem) ?? false;
    return {
      packet: neutralPacket,
      isStarved: true,
      drainedPackets
    };
  }
  /**
   * Peeks at the next packet in the queue without removing it.
   */
  peek() {
    return this.queue[0] ?? null;
  }
  /**
   * Resets the queue state.
   */
  clear() {
    this.queue = [];
    this.lastConsumedTick = null;
    this.lastKnownInput = null;
    this.hasPrimed = false;
  }
  /**
   * Returns telemetry statistics for this jitter buffer queue.
   */
  getStats() {
    const oldestTick = this.queue.length > 0 ? this.queue[0].tick ?? null : null;
    const newestTick = this.queue.length > 0 ? this.queue[this.queue.length - 1].tick ?? null : null;
    return {
      playerId: this.playerId,
      currentDepth: this.queue.length,
      targetDepth: this.targetDepth,
      oldestTick,
      newestTick,
      lastConsumedTick: this.lastConsumedTick,
      starvations: this.starvations,
      overflows: this.overflows,
      duplicates: this.duplicates,
      burstDrains: this.burstDrains,
      receivedCount: this.receivedCount,
      consumedCount: this.consumedCount
    };
  }
  /**
   * Computes the adaptive time dilation factor to maintain steady target depth (Phase 6).
   * - Underflow (< 1 frame): 1.015 (speed up 1.5% to avoid starvation)
   * - Overflow (> 3 frames): 0.990 or 0.985 (slow down 1.0% to 1.5% to drain backlog)
   * - Steady (1 to 3 frames): 1.000 (steady cruise speed)
   * Clamped strictly between [0.98, 1.02].
   */
  computeDilationFactor() {
    const depth = this.queue.length;
    if (depth < 1) {
      return 1.015;
    } else if (depth > 3) {
      return depth >= 5 ? 0.985 : 0.99;
    }
    return 1;
  }
}
class ServerJitterBufferManager {
  constructor(config) {
    __publicField(this, "queues", /* @__PURE__ */ new Map());
    __publicField(this, "config");
    this.config = config;
  }
  /**
   * Retrieves or creates the jitter queue for the given player.
   */
  getQueue(playerId) {
    let queue = this.queues.get(playerId);
    if (!queue) {
      queue = new PlayerJitterQueue(playerId, this.config);
      this.queues.set(playerId, queue);
    }
    return queue;
  }
  /**
   * Enqueues an incoming input packet for its target player.
   */
  push(packet) {
    return this.getQueue(packet.playerId).push(packet);
  }
  /**
   * Consumes an input packet for a player on the current server tick.
   */
  consume(playerId, serverTick) {
    return this.getQueue(playerId).consume(serverTick);
  }
  /**
   * Evaluates the clock sync packet for a player at the current server tick (Phase 6).
   */
  evaluateClockSync(playerId, serverTick) {
    const queue = this.getQueue(playerId);
    const dilation = queue.computeDilationFactor();
    return {
      type: "clock_sync",
      serverTick,
      targetQueueDepth: queue.targetDepth,
      currentQueueDepth: queue.length,
      dilationFactor: dilation,
      playerId
    };
  }
  /**
   * Returns telemetry stats for a specific player's jitter buffer.
   */
  getStats(playerId) {
    const queue = this.queues.get(playerId);
    return queue ? queue.getStats() : null;
  }
  /**
   * Returns telemetry stats for all active player jitter queues.
   */
  getAllStats() {
    return Array.from(this.queues.values()).map((q) => q.getStats());
  }
  /**
   * Clears a specific player's queue or all queues.
   */
  clear(playerId) {
    var _a;
    if (playerId) {
      (_a = this.queues.get(playerId)) == null ? void 0 : _a.clear();
    } else {
      for (const queue of this.queues.values()) {
        queue.clear();
      }
      this.queues.clear();
    }
  }
}
class AuthoritativeSnapshotManager {
  constructor(config) {
    __publicField(this, "broadcastRateHz");
    __publicField(this, "keyframeIntervalTicks");
    __publicField(this, "deltaCompression");
    __publicField(this, "lastSentEntityStates", /* @__PURE__ */ new Map());
    __publicField(this, "lastBroadcastTick", 0);
    // Diagnostics metrics
    __publicField(this, "totalSnapshotsSent", 0);
    __publicField(this, "deltaSnapshotsSent", 0);
    __publicField(this, "keyframeSnapshotsSent", 0);
    __publicField(this, "totalEntitiesOmittedByDelta", 0);
    this.broadcastRateHz = (config == null ? void 0 : config.broadcastRateHz) ?? 60;
    this.keyframeIntervalTicks = (config == null ? void 0 : config.keyframeIntervalTicks) ?? 60;
    this.deltaCompression = (config == null ? void 0 : config.deltaCompression) ?? true;
  }
  /**
   * Evaluates if a snapshot broadcast is due on the given server simulation tick.
   * - 60Hz: broadcast on every tick.
   * - 30Hz: broadcast on every second tick (tick % 2 === 0).
   */
  isBroadcastDue(serverTick) {
    if (this.broadcastRateHz === 60) {
      return true;
    }
    const intervalTicks = Math.round(60 / this.broadcastRateHz);
    return serverTick % intervalTicks === 0;
  }
  /**
   * Compresses and quantizes an active entity state (3 decimal places for position, 2 for velocity).
   */
  static compressEntity(entity) {
    const isChar = entity instanceof Character;
    const isSleeping = !isChar && entity.isSleeping;
    const hasVz = entity.hasVerticalVelocity;
    const roll = !isChar && entity.rollModule ? entity.rollModule : null;
    let heldByStr = null;
    if (isChar && entity.heldObject) {
      heldByStr = entity.heldObject.id;
    } else if (!isChar && entity.heldBy) {
      heldByStr = entity.heldBy.playerId || entity.heldBy.id || "player";
    }
    return {
      id: isChar ? entity.playerId || entity.id : entity.id,
      x: Number(entity.position.x.toFixed(3)),
      y: Number(entity.position.y.toFixed(3)),
      z: Number(entity.position.z.toFixed(3)),
      vx: Number(entity.velocity.x.toFixed(2)),
      vy: Number(entity.velocity.y.toFixed(2)),
      vz: Number((hasVz ? entity.verticalVelocity : 0).toFixed(2)),
      angX: roll ? Number(roll.angularVelocity.x.toFixed(2)) : void 0,
      angY: roll ? Number(roll.angularVelocity.y.toFixed(2)) : void 0,
      angZ: roll ? Number(roll.angularVelocity.z.toFixed(2)) : void 0,
      heldBy: heldByStr,
      isClimbing: isChar ? entity.isClimbing : false,
      facingAngle: isChar ? Number(entity.facingAngle.toFixed(4)) : void 0,
      isSleeping
    };
  }
  /**
   * Generates an AuthoritativeWorldSnapshot from the server world entities.
   * Omits sleeping and stationary entities when delta compression is active.
   */
  createSnapshot(serverTick, characters, objects2, lastProcessedInputTick, ackActionIds, clockSync, forceKeyframe = false) {
    const isKeyframe = forceKeyframe || !this.deltaCompression || serverTick % this.keyframeIntervalTicks === 0;
    const allCompressed = [];
    for (const char of characters) {
      allCompressed.push(AuthoritativeSnapshotManager.compressEntity(char));
    }
    for (const obj of objects2) {
      allCompressed.push(AuthoritativeSnapshotManager.compressEntity(obj));
    }
    let entitiesToBroadcast = [];
    if (isKeyframe) {
      entitiesToBroadcast = allCompressed;
      for (const ent of allCompressed) {
        this.lastSentEntityStates.set(ent.id, ent);
      }
      this.keyframeSnapshotsSent++;
    } else {
      for (const ent of allCompressed) {
        const prev = this.lastSentEntityStates.get(ent.id);
        if (prev) {
          if (ent.isSleeping && prev.isSleeping) {
            this.totalEntitiesOmittedByDelta++;
            continue;
          }
          const isPosSame = Math.abs(ent.x - prev.x) < 1e-3 && Math.abs(ent.y - prev.y) < 1e-3 && Math.abs(ent.z - prev.z) < 1e-3;
          const isVelSame = Math.abs(ent.vx - prev.vx) < 0.01 && Math.abs(ent.vy - prev.vy) < 0.01 && Math.abs(ent.vz - prev.vz) < 0.01;
          const isHeldSame = ent.heldBy === prev.heldBy;
          const isClimbSame = ent.isClimbing === prev.isClimbing;
          const isAngleSame = ent.facingAngle === prev.facingAngle || ent.facingAngle !== void 0 && prev.facingAngle !== void 0 && Math.abs(ent.facingAngle - prev.facingAngle) < 0.01;
          const isSleepingSame = ent.isSleeping === prev.isSleeping;
          if (isPosSame && isVelSame && isAngleSame && isHeldSame && isClimbSame && isSleepingSame) {
            this.totalEntitiesOmittedByDelta++;
            continue;
          }
        }
        entitiesToBroadcast.push(ent);
        this.lastSentEntityStates.set(ent.id, ent);
      }
      this.deltaSnapshotsSent++;
    }
    this.totalSnapshotsSent++;
    this.lastBroadcastTick = serverTick;
    return {
      type: "world_snapshot",
      tick: serverTick,
      serverTime: performance.now(),
      lastProcessedInputTick,
      entities: entitiesToBroadcast,
      ackActionIds: ackActionIds && ackActionIds.length > 0 ? ackActionIds : void 0,
      clockSync,
      isDelta: !isKeyframe
    };
  }
  /**
   * Client-side helper: Merges a received delta snapshot into an accumulated entity state map.
   */
  static mergeSnapshot(currentState, snapshot) {
    if (!snapshot.isDelta) {
      currentState.clear();
    }
    for (const ent of snapshot.entities) {
      currentState.set(ent.id, ent);
    }
    return currentState;
  }
  /**
   * Resets internal snapshot reference state.
   */
  reset() {
    this.lastSentEntityStates.clear();
    this.lastBroadcastTick = 0;
  }
}
class ServerTelemetryBroadcaster {
  /**
   * Builds an uncompressed GhostSnapshot suitable for canvas rendering or client interpolation.
   */
  static createGhostSnapshot(currentTick, allCharacters, charactersMap, objects2, arena2, latestClockSync, recentAckedActionIds, contestedGrabEvents, rttMs = 0, forPlayerId, deathRespawnEvents, objectDeletionEvents, prefabManagerInstance) {
    const primaryChar = charactersMap.get("keyboard") || allCharacters[0];
    const targetPId = forPlayerId || (primaryChar ? primaryChar.playerId : "keyboard");
    const clockSync = latestClockSync.get(targetPId) || latestClockSync.get("keyboard");
    const pm = prefabManagerInstance || prefabManager;
    const ghostChar = {
      id: primaryChar ? primaryChar.playerId : "player",
      x: primaryChar ? Number(primaryChar.position.x.toFixed(3)) : 0,
      y: primaryChar ? Number(primaryChar.position.y.toFixed(3)) : 0,
      z: primaryChar ? Number(primaryChar.position.z.toFixed(3)) : 0,
      vx: primaryChar ? Number(primaryChar.velocity.x.toFixed(3)) : 0,
      vy: primaryChar ? Number(primaryChar.velocity.y.toFixed(3)) : 0,
      vz: primaryChar ? Number((primaryChar.hasVerticalVelocity ? primaryChar.verticalVelocity : 0).toFixed(3)) : 0,
      surfaceZ: primaryChar ? Number((primaryChar.supportingSurfaceHeight ?? 0).toFixed(3)) : 0,
      isGrounded: primaryChar ? primaryChar.isRestingOnSurface || primaryChar.position.z <= 5e-3 : true,
      radius: primaryChar ? primaryChar.colliderRadius : 0.44,
      color: primaryChar ? primaryChar.playerColor || primaryChar.color : "#f59e0b",
      playerColor: primaryChar ? primaryChar.playerColor || primaryChar.color : "#f59e0b",
      playerNumber: primaryChar ? primaryChar.playerNumber : 1,
      isClimbing: primaryChar ? primaryChar.isClimbing : false,
      isAboveWalls: primaryChar ? primaryChar.isAboveWalls : false,
      facingAngle: primaryChar ? Number(primaryChar.facingAngle.toFixed(4)) : 0
    };
    const ghostObjects = objects2.map((obj) => {
      const holder = (obj.heldBy instanceof Character ? obj.heldBy : null) || allCharacters.find((c) => c.heldObject === obj);
      let posX = obj.position.x;
      let posY = obj.position.y;
      let posZ = obj.position.z;
      if ((obj.isHeld || holder) && holder) {
        const relPos = holder.calculateHeldObjectPosition(arena2);
        posX = relPos.x;
        posY = relPos.y;
        posZ = relPos.z;
      }
      const pId = obj.prefabId || (obj.name === "Apple" || obj.id.startsWith("apple-") ? "prefab_apple" : void 0);
      const prefab = pId ? pm.get(pId) : void 0;
      const baseState = {
        id: obj.id,
        x: Number(posX.toFixed(3)),
        y: Number(posY.toFixed(3)),
        z: Number(posZ.toFixed(3)),
        vx: Number(obj.velocity.x.toFixed(3)),
        vy: Number(obj.velocity.y.toFixed(3)),
        vz: Number((obj.hasVerticalVelocity ? obj.verticalVelocity : 0).toFixed(3)),
        surfaceZ: Number((obj.supportingSurfaceHeight ?? 0).toFixed(3)),
        isGrounded: obj.isRestingOnSurface || obj.position.z <= 5e-3,
        isHeld: obj.isHeld || Boolean(holder),
        heldBy: holder ? holder.playerId || (holder === primaryChar ? "player" : holder.id) : obj.heldBy ? obj.heldBy.playerId || obj.heldBy.id : null,
        isInFlight: Boolean(obj.isInFlight),
        isAboveWalls: obj.isAboveWalls,
        angX: obj.rollModule ? Number(obj.rollModule.angularVelocity.x.toFixed(3)) : void 0,
        angY: obj.rollModule ? Number(obj.rollModule.angularVelocity.y.toFixed(3)) : void 0,
        angZ: obj.rollModule ? Number(obj.rollModule.angularVelocity.z.toFixed(3)) : void 0,
        isSleeping: obj.isSleeping
      };
      if (prefab && prefab.archetype) {
        const arch = prefab.archetype;
        baseState.prefabId = pId;
        if (obj.name !== arch.name) {
          baseState.name = obj.name;
        }
        if (obj.color !== arch.color) {
          baseState.color = obj.color;
        }
        if (obj.visualShape !== arch.visualShape) {
          baseState.shape = obj.visualShape;
        }
        const archRadius = arch.consumableModule ? arch.consumableModule.initialColliderRadius || arch.colliderRadius : arch.colliderRadius;
        if (Math.abs(obj.colliderRadius - archRadius) > 5e-3) {
          baseState.radius = Number(obj.colliderRadius.toFixed(3));
        }
        if (Math.abs(obj.mass - arch.mass) > 1e-3) {
          baseState.mass = Number(obj.mass.toFixed(3));
        }
        const objBounce = obj.bounceMod ?? 0;
        const archBounce = arch.bounceMod ?? 0;
        if (Math.abs(objBounce - archBounce) > 1e-3) {
          baseState.bounceMod = Number(objBounce.toFixed(3));
        }
        if (obj.consumableModule && obj.consumableModule.enabled) {
          const archConsumable = arch.consumableModule && arch.consumableModule.enabled ? arch.consumableModule : null;
          if (!archConsumable || obj.consumableModule.tag !== archConsumable.tag) {
            baseState.consumableTag = obj.consumableModule.tag;
          }
          const objTotal = obj.consumableModule.getTotalEnergy(obj.properties);
          const archTotal = archConsumable ? archConsumable.getTotalEnergy(arch.properties) : 0;
          if (Math.abs(objTotal - archTotal) > 0.1) {
            baseState.totalEnergyJoules = Number(objTotal.toFixed(1));
          }
          const objRem = obj.consumableModule.getRemainingEnergy(obj.properties);
          if (obj.isHeld || Math.abs(objRem - objTotal) > 0.1 || archConsumable && Math.abs(objRem - archTotal) > 0.1) {
            baseState.remainingEnergyJoules = Number(objRem.toFixed(1));
          }
          if (obj.consumableModule.unlimited !== (archConsumable ? archConsumable.unlimited : false)) {
            baseState.unlimited = obj.consumableModule.unlimited;
          }
        }
        if (obj.healthModule && obj.healthModule.enabled) {
          const curHp = obj.healthModule.getCurrentHp(obj.properties);
          const maxHp = obj.healthModule.getMaxHp(obj.properties);
          const archCurHp = arch.healthModule && arch.healthModule.enabled ? arch.healthModule.getCurrentHp(arch.properties) : void 0;
          const archMaxHp = arch.healthModule && arch.healthModule.enabled ? arch.healthModule.getMaxHp(arch.properties) : void 0;
          if (archCurHp === void 0 || Math.abs(curHp - archCurHp) > 0.1) {
            baseState.currentHp = Number(curHp.toFixed(1));
          }
          if (archMaxHp === void 0 || Math.abs(maxHp - archMaxHp) > 0.1) {
            baseState.maxHp = Number(maxHp.toFixed(1));
          }
        }
        if (obj.damageAuraModule && obj.damageAuraModule.enabled) {
          const auraRadius = obj.damageAuraModule.getDamageRadius(obj.properties);
          const auraRate = obj.damageAuraModule.getDamageRate(obj.properties);
          const archRadius2 = arch.damageAuraModule && arch.damageAuraModule.enabled ? arch.damageAuraModule.getDamageRadius(arch.properties) : void 0;
          const archRate = arch.damageAuraModule && arch.damageAuraModule.enabled ? arch.damageAuraModule.getDamageRate(arch.properties) : void 0;
          if (archRadius2 === void 0 || Math.abs(auraRadius - archRadius2) > 0.05) {
            baseState.damageAuraRadius = Number(auraRadius.toFixed(2));
          }
          if (archRate === void 0 || Math.abs(auraRate - archRate) > 0.05) {
            baseState.damageAuraRate = Number(auraRate.toFixed(2));
          }
        }
      } else {
        baseState.name = obj.name;
        baseState.radius = obj.colliderRadius;
        baseState.color = obj.color;
        baseState.shape = obj.visualShape;
        baseState.mass = Number(obj.mass.toFixed(3));
        baseState.bounceMod = obj.bounceMod !== null ? Number(obj.bounceMod.toFixed(3)) : void 0;
        baseState.currentHp = obj.healthModule && obj.healthModule.enabled ? Number(obj.healthModule.getCurrentHp(obj.properties).toFixed(1)) : void 0;
        baseState.maxHp = obj.healthModule && obj.healthModule.enabled ? Number(obj.healthModule.getMaxHp(obj.properties).toFixed(1)) : void 0;
        baseState.consumableTag = obj.consumableModule && obj.consumableModule.enabled ? obj.consumableModule.tag : void 0;
        baseState.remainingEnergyJoules = obj.consumableModule && obj.consumableModule.enabled ? Number(obj.consumableModule.getRemainingEnergy(obj.properties).toFixed(1)) : void 0;
        baseState.totalEnergyJoules = obj.consumableModule && obj.consumableModule.enabled ? Number(obj.consumableModule.getTotalEnergy(obj.properties).toFixed(1)) : void 0;
        baseState.damageAuraRadius = obj.damageAuraModule && obj.damageAuraModule.enabled ? Number(obj.damageAuraModule.getDamageRadius(obj.properties).toFixed(2)) : void 0;
        baseState.damageAuraRate = obj.damageAuraModule && obj.damageAuraModule.enabled ? Number(obj.damageAuraModule.getDamageRate(obj.properties).toFixed(2)) : void 0;
      }
      return baseState;
    });
    const ghostCharacters = allCharacters.map((c) => {
      var _a, _b;
      const mainBus = c.getEnergyBus("bus_main") || c.energyBusses.values().next().value;
      const charId = c.playerId || c.id || "player";
      const isOwnedByRecipient = !targetPId || (charId === targetPId || charId.startsWith(`${targetPId}:`) || targetPId === "keyboard" && (c === primaryChar || charId === "player" || charId === "keyboard"));
      return {
        id: charId,
        name: c.name,
        x: Number(c.position.x.toFixed(3)),
        y: Number(c.position.y.toFixed(3)),
        z: Number(c.position.z.toFixed(3)),
        vx: Number(c.velocity.x.toFixed(3)),
        vy: Number(c.velocity.y.toFixed(3)),
        vz: Number((c.hasVerticalVelocity ? c.verticalVelocity : 0).toFixed(3)),
        surfaceZ: Number((c.supportingSurfaceHeight ?? 0).toFixed(3)),
        isGrounded: c.isRestingOnSurface || c.position.z <= 5e-3,
        radius: c.colliderRadius,
        color: c.playerColor || c.color,
        playerColor: c.playerColor || c.color,
        playerNumber: c.playerNumber,
        isClimbing: c.isClimbing,
        isAboveWalls: c.isAboveWalls,
        facingAngle: Number(c.facingAngle.toFixed(4)),
        heldObjectId: c.heldObject ? c.heldObject.id : null,
        isHolding: Boolean(c.heldObject),
        isUsingItem: Boolean(c.isUsingItem),
        isDummy: ((_a = c.characterModule) == null ? void 0 : _a.role) === "dummy" || c.controllerType === "none" || c.id === "dummy-1",
        role: ((_b = c.characterModule) == null ? void 0 : _b.role) ?? (c.controllerType === "none" ? "dummy" : "remote_player"),
        controllerType: c.controllerType,
        currentHp: c.healthModule && c.healthModule.enabled ? Number(c.healthModule.getCurrentHp(c.properties).toFixed(1)) : void 0,
        maxHp: c.healthModule && c.healthModule.enabled ? Number(c.healthModule.getMaxHp(c.properties).toFixed(1)) : void 0,
        currentEnergyJoules: isOwnedByRecipient && c.energyPool ? Number(c.energyPool.getCurrentEnergy(c.properties).toFixed(1)) : void 0,
        maxEnergyJoules: isOwnedByRecipient && c.energyPool ? Number(c.energyPool.getMaxEnergy(c.properties).toFixed(1)) : void 0,
        currentStaminaSeconds: isOwnedByRecipient && mainBus ? Number(mainBus.getCurrentStamina(c.properties).toFixed(2)) : void 0,
        maxStaminaSeconds: isOwnedByRecipient && mainBus ? Number(mainBus.getMaxStamina(c.properties).toFixed(2)) : void 0,
        currentWattage: isOwnedByRecipient && mainBus ? Number(mainBus.getCurrentWattage(c.properties).toFixed(1)) : void 0,
        isExhausted: isOwnedByRecipient && c.energyPool ? Boolean(c.energyPool.isExhausted) : void 0,
        lastVisualPunchTime: c.meleeModule ? c.meleeModule.lastVisualPunchTime : void 0,
        visualPunchDirX: c.meleeModule ? Number(c.meleeModule.lastVisualPunchDir.x.toFixed(3)) : void 0,
        visualPunchDirY: c.meleeModule ? Number(c.meleeModule.lastVisualPunchDir.y.toFixed(3)) : void 0,
        isUnderKnockback: Boolean(c.isUnderKnockback),
        isLaserAiming: Boolean(c.isLaserAiming),
        isLaserFiring: Boolean(c.laserModule ? c.laserModule.enabled && c.laserModule.isFiring : c.isLaserFiring),
        laserAimX: c.laserAimTarget ? Number(c.laserAimTarget.x.toFixed(3)) : void 0,
        laserAimY: c.laserAimTarget ? Number(c.laserAimTarget.y.toFixed(3)) : void 0,
        laserPowerFraction: typeof c.laserPowerFraction === "number" ? Number(c.laserPowerFraction.toFixed(2)) : void 0
      };
    });
    return {
      seq: currentTick,
      sentAt: performance.now(),
      receivedAt: performance.now(),
      rttMs,
      character: ghostChar,
      characters: ghostCharacters,
      objects: ghostObjects,
      ackActionIds: recentAckedActionIds,
      contestedGrabEvents: contestedGrabEvents && contestedGrabEvents.length > 0 ? [...contestedGrabEvents] : void 0,
      deathRespawnEvents: deathRespawnEvents && deathRespawnEvents.length > 0 ? [...deathRespawnEvents] : void 0,
      objectDeletionEvents: objectDeletionEvents && objectDeletionEvents.length > 0 ? [...objectDeletionEvents] : void 0,
      clockSync
    };
  }
  /**
   * Generates a quantized, delta-compressed AuthoritativeWorldSnapshot for network broadcast.
   */
  static createAuthoritativeWorldSnapshot(simulation, forceKeyframe = false) {
    const lastProcessedInputTick = {};
    for (const [pId] of simulation.characters) {
      const stats = simulation.jitterBuffer.getStats(pId);
      if (stats && stats.lastConsumedTick !== null) {
        lastProcessedInputTick[pId] = stats.lastConsumedTick;
      }
    }
    const primaryChar = simulation.characters.get("keyboard") || simulation.allCharacters[0];
    const targetPId = primaryChar ? primaryChar.playerId : "keyboard";
    const clockSync = simulation.latestClockSync.get(targetPId) || simulation.latestClockSync.get("keyboard") || void 0;
    return simulation.snapshotManager.createSnapshot(
      simulation.currentTick,
      simulation.allCharacters,
      simulation.objects,
      lastProcessedInputTick,
      simulation.getRecentAckedActionIds(),
      clockSync,
      forceKeyframe
    );
  }
}
class ServerWorldInitializer {
  /**
   * Initializes or syncs the server simulation world from the client arena and entities.
   */
  static initializeFromWorld(sim, clientArena, clientCharacters, clientObjects) {
    sim.arena.width = clientArena.width;
    sim.arena.height = clientArena.height;
    sim.arena.tileSize = clientArena.tileSize;
    sim.arena.setStandardWallHeight(clientArena.wallHeight);
    sim.arena.tileGrid = clientArena.tileGrid.map((row) => [...row]);
    sim.arena.rebuildWalls();
    sim.characters.clear();
    for (const c of clientCharacters) {
      const serverChar = new Character({
        x: c.position.x,
        y: c.position.y,
        color: c.playerColor || c.color || "#f59e0b",
        colliderRadius: c.colliderRadius,
        mass: c.baseMass || 1.2,
        strength: c.strength,
        playerId: c.playerId || "keyboard",
        playerNumber: c.playerNumber || 1,
        name: c.name || "Server Character"
      });
      serverChar.position.z = c.position.z;
      serverChar.velocity.x = c.velocity.x;
      serverChar.velocity.y = c.velocity.y;
      serverChar.verticalVelocity = c.verticalVelocity;
      serverChar.facingAngle = c.facingAngle;
      serverChar.isClimbing = c.isClimbing;
      serverChar.isSprinting = c.isSprinting;
      sim.characters.set(serverChar.playerId, serverChar);
    }
    sim.objects = clientObjects.map((o) => {
      const serverObj = new GameObject({
        id: o.id,
        name: o.name,
        position: { x: o.position.x, y: o.position.y, z: o.position.z },
        velocity: { x: o.velocity.x, y: o.velocity.y },
        verticalVelocity: o.verticalVelocity,
        mass: o.mass,
        colliderRadius: o.colliderRadius,
        color: o.color,
        bounceMod: o.bounceMod,
        staticGroundFrictionMod: o.staticGroundFrictionMod,
        dynamicGroundFrictionMod: o.dynamicGroundFrictionMod,
        visualShape: o.visualShape,
        rollModule: o.rollModule ? new RollModule({
          rollResistance: o.rollModule.rollResistance,
          angularVelocity: { ...o.rollModule.angularVelocity },
          bumpyRollEnabled: o.rollModule.bumpyRollEnabled,
          bumpiness: o.rollModule.bumpiness,
          seed: o.rollModule.seed
        }) : void 0,
        consumableModule: o.consumableModule ? new ConsumableModule({
          tag: o.consumableModule.tag,
          totalEnergyJoules: o.consumableModule.getTotalEnergy(o.properties),
          remainingEnergyJoules: o.consumableModule.getRemainingEnergy(o.properties),
          consumeRateWatts: o.consumableModule.getConsumeRate(o.properties),
          healRate: o.consumableModule.getHealRate(o.properties),
          minScaleFloor: o.consumableModule.minScaleFloor,
          minRadiusFloor: o.consumableModule.minRadiusFloor,
          enabled: o.consumableModule.enabled
        }) : void 0
      });
      serverObj.isSleeping = o.isSleeping;
      return serverObj;
    });
    for (const clientChar of clientCharacters) {
      if (clientChar.heldObject) {
        const sChar = sim.characters.get(clientChar.playerId || "keyboard");
        const sObj = sim.objects.find((o) => o.id === clientChar.heldObject.id);
        if (sChar && sObj) {
          sChar.heldObject = sObj;
          sObj.isHeld = true;
          sObj.heldBy = sChar;
        }
      }
    }
    sim.arena.syncEntitiesWithWalls([...sim.allCharacters, ...sim.objects]);
    sim.jitterBuffer.clear();
  }
  /**
   * Initializes default standard arena and freebodies if starting standalone without client.
   */
  static initializeDefaultScenario(sim) {
    sim.arena.loadWallPreset(quarryPreset.id);
    const p1Spawn = HealthModule.RESPAWN_SPAWNS[0];
    const player1 = new Character({
      x: p1Spawn.x,
      y: p1Spawn.y,
      color: "#f59e0b",
      colliderRadius: 0.44,
      mass: 1.2,
      strength: 1,
      playerId: "player-1",
      playerNumber: 1,
      name: "Server Player 1"
    });
    player1.position.z = p1Spawn.z ?? 0;
    sim.characters.set(player1.playerId, player1);
    const dummy = new Character({
      id: "dummy-1",
      x: QUARRY_DUMMY_SPAWN.x,
      y: QUARRY_DUMMY_SPAWN.y,
      color: "#64748b",
      colliderRadius: 0.44,
      mass: 1.5,
      strength: 0,
      name: "Sparring Dummy",
      controllerType: "none",
      role: "dummy"
    });
    sim.characters.set(dummy.id, dummy);
    sim.objects = createQuarryStones();
    sim.arena.syncEntitiesWithWalls([...sim.allCharacters, ...sim.objects]);
    sim.jitterBuffer.clear();
  }
  /**
   * Initializes or hot-reloads the authoritative server simulation world from a persistent WorldConfig.
   */
  static initializeFromConfig(sim, config) {
    var _a;
    if (config.arena) {
      if (config.arena.width && config.arena.height) {
        sim.arena.width = config.arena.width;
        sim.arena.height = config.arena.height;
      }
      if (config.arena.wallHeight !== void 0) {
        sim.arena.setStandardWallHeight(config.arena.wallHeight);
      }
      if (config.arena.tileGrid) {
        sim.arena.tileGrid = config.arena.tileGrid.map((row) => [...row]);
        sim.arena.rebuildWalls();
      } else if (config.arena.presetId) {
        sim.arena.loadWallPreset(config.arena.presetId);
      }
    }
    if (config.globalPhysics) {
      if (config.globalPhysics.gravity !== void 0) {
        sim.arena.gravity = config.globalPhysics.gravity;
      }
      if (config.globalPhysics.collisionDamageScale !== void 0) {
        GameObject.globalWorldCollisionDamageScale = config.globalPhysics.collisionDamageScale;
      }
      if (config.globalPhysics.collisionMode) {
        sim.collisionMode = config.globalPhysics.collisionMode;
      }
    }
    if (sim.characters.size === 0) {
      const p1Spawn = HealthModule.RESPAWN_SPAWNS[0];
      const player1 = new Character({
        x: p1Spawn.x,
        y: p1Spawn.y,
        color: "#f59e0b",
        colliderRadius: 0.44,
        mass: 1.2,
        strength: 1,
        playerId: "player-1",
        playerNumber: 1,
        name: "Server Player 1"
      });
      player1.position.z = p1Spawn.z ?? 0;
      if (config.player) {
        applyCharacterConfig(player1, config.player);
        player1.playerId = "player-1";
        player1.playerNumber = 1;
      }
      sim.characters.set(player1.playerId, player1);
      const dummy = new Character({
        id: "dummy-1",
        x: QUARRY_DUMMY_SPAWN.x,
        y: QUARRY_DUMMY_SPAWN.y,
        color: "#64748b",
        colliderRadius: 0.44,
        mass: 1.5,
        strength: 0,
        name: "Sparring Dummy",
        controllerType: "none",
        role: "dummy"
      });
      sim.characters.set(dummy.id, dummy);
    } else if (config.player) {
      for (const char of sim.characters.values()) {
        if (((_a = char.characterModule) == null ? void 0 : _a.role) === "dummy" || char.controllerType === "none") continue;
        const savedPlayerId = char.playerId;
        const savedPlayerNum = char.playerNumber;
        const savedColor = char.color;
        const savedName = char.name;
        const hasCustom = char.hasCustomName;
        applyCharacterConfig(char, config.player);
        char.playerId = savedPlayerId;
        char.playerNumber = savedPlayerNum;
        char.color = savedColor;
        if (hasCustom) {
          char.name = savedName;
          char.hasCustomName = true;
        }
      }
    }
    if (config.prefabs && Array.isArray(config.prefabs)) {
      sim.prefabManager.loadFromConfig(config.prefabs);
    }
    if (config.spawners && Array.isArray(config.spawners)) {
      sim.sceneSpawnerManager.loadFromConfig(config.spawners);
    }
    if (sim.objects.length === 0) {
      if (config.objects && config.objects.length > 0) {
        sim.objects = config.objects.map(deserializeGameObject);
      } else {
        sim.objects = createQuarryStones();
      }
      sim.arena.syncEntitiesWithWalls([...sim.allCharacters, ...sim.objects]);
      sim.jitterBuffer.clear();
    }
  }
}
class ContestedGrabArbiter {
  /**
   * Resolves a list of grab requests on a given tick, granting the target object
   * to the winning character and logging the outcome to an audit history array.
   */
  static arbitrate(grabRequests, currentTick, auditLog, arena2, objects2) {
    var _a, _b;
    const results = [];
    if (!grabRequests || grabRequests.length === 0) return results;
    const targetGroups = /* @__PURE__ */ new Map();
    for (const req of grabRequests) {
      const objId = req.target.id;
      let group = targetGroups.get(objId);
      if (!group) {
        group = [];
        targetGroups.set(objId, group);
      }
      group.push(req);
    }
    for (const [objId, requests] of targetGroups) {
      if (requests.length === 1) {
        const req = requests[0];
        if (req.target.isHeld && req.target.heldBy && req.target.heldBy !== req.char) {
          continue;
        }
        let itemToHold2 = req.target;
        if (req.target.spawnerModule && req.target.spawnerModule.enabled) {
          const clone = req.target.spawnerModule.triggerClone(req.target, arena2, objects2);
          if (clone) itemToHold2 = clone;
        }
        (_a = req.char.pickupModule) == null ? void 0 : _a.pickup(req.char, itemToHold2);
        itemToHold2.isHeld = true;
        itemToHold2.heldBy = req.char;
        req.char.heldObject = itemToHold2;
        continue;
      }
      requests.sort((a, b) => {
        if (Math.abs(b.char.strength - a.char.strength) > 1e-3) {
          return b.char.strength - a.char.strength;
        }
        const distA = Math.hypot(
          a.target.position.x - a.char.position.x,
          a.target.position.y - a.char.position.y,
          a.target.position.z - a.char.position.z
        );
        const distB = Math.hypot(
          b.target.position.x - b.char.position.x,
          b.target.position.y - b.char.position.y,
          b.target.position.z - b.char.position.z
        );
        if (Math.abs(distA - distB) > 1e-3) {
          return distA - distB;
        }
        return a.char.playerId.localeCompare(b.char.playerId);
      });
      const winner = requests[0];
      const losers = requests.slice(1);
      let reason = "id_priority";
      if (Math.abs(winner.char.strength - losers[0].char.strength) > 1e-3) {
        reason = "strength";
      } else {
        const distWin = Math.hypot(
          winner.target.position.x - winner.char.position.x,
          winner.target.position.y - winner.char.position.y,
          winner.target.position.z - winner.char.position.z
        );
        const distLose = Math.hypot(
          losers[0].target.position.x - losers[0].char.position.x,
          losers[0].target.position.y - losers[0].char.position.y,
          losers[0].target.position.z - losers[0].char.position.z
        );
        if (Math.abs(distWin - distLose) > 1e-3) {
          reason = "proximity";
        }
      }
      const outcome = {
        eventId: `grab-${objId}-${currentTick}-${winner.char.playerId}`,
        tick: currentTick,
        targetObjectId: objId,
        winnerPlayerId: winner.char.playerId,
        loserPlayerIds: losers.map((l) => l.char.playerId),
        reason
      };
      results.push(outcome);
      if (auditLog) {
        auditLog.push(outcome);
      }
      let itemToHold = winner.target;
      if (winner.target.spawnerModule && winner.target.spawnerModule.enabled) {
        const clone = winner.target.spawnerModule.triggerClone(winner.target, arena2, objects2);
        if (clone) itemToHold = clone;
      }
      (_b = winner.char.pickupModule) == null ? void 0 : _b.pickup(winner.char, itemToHold);
      itemToHold.isHeld = true;
      itemToHold.heldBy = winner.char;
      winner.char.heldObject = itemToHold;
    }
    return results;
  }
}
class ServerEventQueueManager {
  /**
   * Resolves contested grabs when multiple characters attempt to grab the same object on this tick (Phase 4.3).
   * Keeps active unacknowledged events in pendingContestedEvents until all involved clients acknowledge them.
   */
  static arbitrateContestedGrabs(sim, grabRequests) {
    const results = ContestedGrabArbiter.arbitrate(grabRequests, sim.currentTick, sim.contestedGrabEvents, sim.arena, sim.objects);
    for (const res of results) {
      sim.pendingContestedEvents.set(res.eventId, {
        event: res,
        createdTick: sim.currentTick,
        acks: /* @__PURE__ */ new Set()
      });
      if (sim.onGrabResult) {
        sim.onGrabResult({
          type: "grab_result",
          eventId: res.eventId,
          tick: res.tick,
          targetObjectId: res.targetObjectId,
          playerId: res.winnerPlayerId
        });
      }
    }
  }
  /**
   * Acknowledges that a client character has received and processed contested grab events.
   */
  static acknowledgeContestedEvents(sim, clientCharId, eventIds) {
    if (!eventIds || !Array.isArray(eventIds)) return;
    for (const id of eventIds) {
      const pending = sim.pendingContestedEvents.get(id);
      if (pending) {
        pending.acks.add(clientCharId);
        const needed = [pending.event.winnerPlayerId, ...pending.event.loserPlayerIds];
        const allAcked = needed.every((pId) => pending.acks.has(pId));
        if (allAcked) {
          sim.pendingContestedEvents.delete(id);
        }
      }
    }
  }
  /**
   * Returns all active unacknowledged contested grab events for broadcast.
   * Evicts expired events older than 180 ticks (3 seconds) to prevent infinite accumulation.
   */
  static getActiveContestedEvents(sim) {
    const active = [];
    const nowTick = sim.currentTick;
    for (const [id, record] of sim.pendingContestedEvents.entries()) {
      if (nowTick - record.createdTick > 180) {
        sim.pendingContestedEvents.delete(id);
      } else {
        active.push(record.event);
      }
    }
    return active;
  }
  /**
   * Acknowledges that a client character has received and processed death & respawn events.
   */
  static acknowledgeDeathRespawnEvents(sim, clientCharId, eventIds) {
    if (!eventIds || !Array.isArray(eventIds)) return;
    for (const id of eventIds) {
      const pending = sim.pendingDeathRespawnEvents.get(id);
      if (pending) {
        pending.acks.add(clientCharId);
        const targetChar = sim.characters.get(pending.event.targetEntityId) || Array.from(sim.characters.values()).find(
          (c) => c.id === clientCharId || c.playerId === clientCharId || c.serverCharId === clientCharId || c.id === pending.event.targetEntityId || c.playerId === pending.event.targetEntityId || c.serverCharId === pending.event.targetEntityId
        );
        if (targetChar) {
          targetChar.isRespawnLocked = false;
        }
        const isTargetAck = clientCharId === pending.event.targetEntityId || targetChar && (clientCharId === targetChar.id || clientCharId === targetChar.playerId || clientCharId === targetChar.serverCharId);
        if (isTargetAck) {
          sim.pendingDeathRespawnEvents.delete(id);
        } else {
          const allClientChars = Array.from(sim.characters.keys()).filter((k) => k !== "dummy-1");
          const allAcked = allClientChars.length === 0 || allClientChars.every((cId) => pending.acks.has(cId));
          if (allAcked) {
            sim.pendingDeathRespawnEvents.delete(id);
          }
        }
      }
    }
  }
  /**
   * Returns all active unacknowledged death respawn events for continuous broadcast.
   */
  static getActiveDeathRespawnEvents(sim) {
    const active = [];
    const nowTick = sim.currentTick;
    for (const [id, record] of sim.pendingDeathRespawnEvents.entries()) {
      if (nowTick - record.createdTick > 300) {
        sim.pendingDeathRespawnEvents.delete(id);
      } else {
        active.push(record.event);
      }
    }
    return active;
  }
  /**
   * Triggers an authoritative object deletion event broadcasted reliably until acknowledged.
   */
  static triggerObjectDeletion(sim, objectId) {
    sim.deletedObjectIds.add(objectId);
    const idx = sim.objects.findIndex((o) => o.id === objectId);
    if (idx !== -1) {
      const obj = sim.objects[idx];
      if (obj.heldBy && obj.heldBy.heldObject === obj) {
        obj.heldBy.heldObject = null;
      }
      obj.isHeld = false;
      obj.heldBy = null;
      sim.objects.splice(idx, 1);
    }
    if (Array.isArray(sim.arena.entities)) {
      const eIdx = sim.arena.entities.findIndex((e) => e.id === objectId);
      if (eIdx !== -1) {
        sim.arena.entities.splice(eIdx, 1);
      }
    }
    const eventId = `del_${objectId}_${sim.currentTick}`;
    const event = {
      eventId,
      objectId,
      tick: sim.currentTick
    };
    sim.pendingObjectDeletionEvents.set(eventId, {
      event,
      createdTick: sim.currentTick,
      acks: /* @__PURE__ */ new Set()
    });
  }
  /**
   * Acknowledges that a client character has received and processed object deletion events.
   */
  static acknowledgeObjectDeletionEvents(sim, clientCharId, eventIds) {
    if (!eventIds || !Array.isArray(eventIds)) return;
    for (const id of eventIds) {
      const pending = sim.pendingObjectDeletionEvents.get(id);
      if (pending) {
        pending.acks.add(clientCharId);
        const allClientChars = Array.from(sim.characters.keys()).filter((k) => k !== "dummy-1");
        const allAcked = allClientChars.length === 0 || allClientChars.every((cId) => pending.acks.has(cId));
        if (allAcked) {
          sim.pendingObjectDeletionEvents.delete(id);
        }
      }
    }
  }
  /**
   * Returns all active unacknowledged object deletion events for continuous broadcast.
   */
  static getActiveObjectDeletionEvents(sim) {
    const active = [];
    const nowTick = sim.currentTick;
    for (const [id, record] of sim.pendingObjectDeletionEvents.entries()) {
      if (nowTick - record.createdTick > 300) {
        sim.pendingObjectDeletionEvents.delete(id);
      } else {
        active.push(record.event);
      }
    }
    return active;
  }
}
class ServerReliableActionProcessor {
  /**
   * Authoritatively processes high-priority reliable action commands (pickup, drop, throw, punch).
   */
  static processReliableActions(sim, actions, processedActionIds, recentAckedActionIds) {
    const newlyAcked = [];
    for (const act of actions) {
      newlyAcked.push(act.actionId);
      if (!recentAckedActionIds.includes(act.actionId)) {
        recentAckedActionIds.push(act.actionId);
        if (recentAckedActionIds.length > 100) {
          recentAckedActionIds.shift();
        }
      }
      if (processedActionIds.has(act.actionId)) {
        continue;
      }
      processedActionIds.add(act.actionId);
      if (processedActionIds.size > 2e3) {
        const first = processedActionIds.values().next().value;
        if (first) processedActionIds.delete(first);
      }
      let char = sim.characters.get(act.playerId || "keyboard");
      if (!char && act.playerId) {
        char = sim.allCharacters.find(
          (c) => c.playerId === act.playerId || c.playerId.endsWith(`:${act.playerId}`) || c.id === act.playerId
        );
      }
      if (!char) {
        char = sim.allCharacters[0];
      }
      if (!char) continue;
      if (act.type === "pickup") {
        if (!char.heldObject && char.pickupModule && act.targetObjectId) {
          const target = sim.objects.find((o) => o.id === act.targetObjectId);
          if (target && (!target.isHeld || target.heldBy === char)) {
            let itemToHold = target;
            if (target.spawnerModule && target.spawnerModule.enabled) {
              const clone = target.spawnerModule.triggerClone(target, sim.arena, sim.objects);
              if (clone) itemToHold = clone;
            }
            char.pickupModule.pickup(char, itemToHold);
            itemToHold.isHeld = true;
            itemToHold.heldBy = char;
            char.heldObject = itemToHold;
            if (sim.onGrabResult) {
              sim.onGrabResult({
                type: "grab_result",
                eventId: `grab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                tick: sim.currentTick,
                targetObjectId: itemToHold.id,
                playerId: char.playerId || char.id
              });
            }
          }
        }
      } else if (act.type === "drop") {
        if (char.heldObject && char.pickupModule) {
          char.pickupModule.drop(char);
        }
      } else if (act.type === "throw") {
        const throwTarget = char.heldObject || (act.targetObjectId ? sim.objects.find((o) => o.id === act.targetObjectId && (!o.isHeld || o.heldBy === char)) : null);
        if (throwTarget && char.throwModule) {
          if (!char.heldObject) {
            char.heldObject = throwTarget;
            throwTarget.isHeld = true;
            throwTarget.heldBy = char;
          }
          const aimX = act.aimX ?? char.position.x + Math.cos(char.facingAngle) * 3;
          const aimY = act.aimY ?? char.position.y + Math.sin(char.facingAngle) * 3;
          const launchVel = act.launchVx !== void 0 ? {
            vx: act.launchVx,
            vy: act.launchVy,
            vz: act.launchVz ?? 0
          } : void 0;
          const launchPos = act.launchStartX !== void 0 ? {
            x: act.launchStartX,
            y: act.launchStartY,
            z: act.launchStartZ ?? 0
          } : void 0;
          if (char.energyPool && launchVel) {
            const pool = char.energyPool;
            const heldMass = throwTarget.hasMass ? Math.max(0.1, throwTarget.mass) : 1;
            const launchSpeed = Math.hypot(launchVel.vx, launchVel.vy, launchVel.vz);
            const poolEfficiency = Math.max(0.01, pool.getMuscleEfficiency(char.properties));
            const neededJoules = 0.5 * heldMass * launchSpeed * launchSpeed / poolEfficiency + 100;
            pool.isExhausted = false;
            const curStam = pool.getCurrentStamina(char.properties);
            if (curStam < neededJoules) {
              pool.currentStaminaProp.set(neededJoules, char.properties);
            }
            if (!pool.infiniteEnergy && pool.getCurrentEnergy(char.properties) < neededJoules) {
              pool.currentEnergyProp.set(neededJoules, char.properties);
            }
            if (char.throwModule && char.throwModule.maxPowerProp.get(char.properties) < neededJoules) {
              char.throwModule.maxPowerProp.set(neededJoules, char.properties);
            }
          }
          const thrown = char.throwModule.throwHeldObject(
            char,
            aimX,
            aimY,
            sim.arena,
            void 0,
            void 0,
            act.isLockHeld ?? false,
            launchVel,
            launchPos
          );
          if (thrown) {
            char._lastServerThrowTime = performance.now();
            char._pendingThrowUntilMs = 0;
          }
        }
      } else if (act.type === "punch") {
        if (char.meleeModule && char.meleeModule.enabled) {
          const aimX = act.aimX !== void 0 ? act.aimX : char.position.x + Math.cos(char.facingAngle) * 3;
          const aimY = act.aimY !== void 0 ? act.aimY : char.position.y + Math.sin(char.facingAngle) * 3;
          const dirX = aimX - char.position.x;
          const dirY = aimY - char.position.y;
          const mag = Math.hypot(dirX, dirY);
          const normDirX = mag > 1e-3 ? dirX / mag : Math.cos(char.facingAngle);
          const normDirY = mag > 1e-3 ? dirY / mag : Math.sin(char.facingAngle);
          char.facingAngle = Math.atan2(normDirY, normDirX);
          const candidates = [...sim.allCharacters.filter((c) => c !== char), ...sim.objects];
          char.melee(sim.arena, candidates, normDirX, normDirY);
        }
      }
    }
    return newlyAcked;
  }
}
class ServerCharacterSync {
  /**
   * Synchronizes all authoritative server characters from client telemetry packets.
   */
  static syncCharactersFromPacket(sim, clientChars) {
    if (!Array.isArray(clientChars) || clientChars.length === 0) return;
    for (const c of clientChars) {
      ServerCharacterSync.syncCharacterFromPacket(sim, c);
    }
  }
  /**
   * Synchronizes the authoritative server character from client telemetry packets.
   * Updates velocity and coordinates directly so the server player ghost stays locked to the client.
   */
  static syncCharacterFromPacket(sim, clientChar) {
    if (!clientChar) return;
    const charId = clientChar.id || "keyboard";
    const sChar = sim.characters.get(charId);
    if (!sChar) {
      return;
    }
    if (sChar.isRespawnLocked && sChar.authoritativeRespawnPos) {
      const respawnPos = sChar.authoritativeRespawnPos;
      const distToRespawn = Math.hypot(clientChar.x - respawnPos.x, clientChar.y - respawnPos.y);
      if (distToRespawn <= 1.5) {
        sChar.isRespawnLocked = false;
      } else {
        sChar.position.x = respawnPos.x;
        sChar.position.y = respawnPos.y;
        sChar.position.z = respawnPos.z;
        sChar.velocity.x = 0;
        sChar.velocity.y = 0;
        if (sChar.hasVerticalVelocity) sChar.verticalVelocity = 0;
        return;
      }
    }
    for (const pending of sim.pendingDeathRespawnEvents.values()) {
      const isTarget = pending.event.targetEntityId === charId || pending.event.targetEntityId === sChar.id || pending.event.targetEntityId === sChar.playerId || pending.event.targetEntityId === sChar.serverCharId;
      const hasAcked = pending.acks.has(charId) || pending.acks.has(sChar.id) || sChar.playerId && pending.acks.has(sChar.playerId) || sChar.serverCharId && pending.acks.has(sChar.serverCharId);
      if (isTarget && !hasAcked) {
        sChar.position.x = pending.event.respawnX;
        sChar.position.y = pending.event.respawnY;
        sChar.position.z = pending.event.respawnZ;
        sChar.velocity.x = 0;
        sChar.velocity.y = 0;
        if (sChar.hasVerticalVelocity) sChar.verticalVelocity = 0;
        return;
      }
    }
    const now = performance.now();
    const hasRecentImpact = sChar.isUnderKnockback || sChar.lastCollisionTime > 0 && now - sChar.lastCollisionTime < 400;
    const isClientMoving = Math.hypot(clientChar.vx, clientChar.vy) > 0.1;
    if (hasRecentImpact) {
      if (isClientMoving) {
        sChar.velocity.x += (clientChar.vx - sChar.velocity.x) * 0.3;
        sChar.velocity.y += (clientChar.vy - sChar.velocity.y) * 0.3;
      }
    } else {
      sChar.velocity.x = clientChar.vx;
      sChar.velocity.y = clientChar.vy;
    }
    if (sChar.hasVerticalVelocity && clientChar.vz !== void 0) {
      const surfaceZ = sChar.supportingSurfaceHeight ?? 0;
      const isServerGrounded = sChar.isRestingOnSurface || Math.abs(sChar.position.z - surfaceZ) <= 0.08 && Math.abs(sChar.verticalVelocity) <= 0.8;
      if (isServerGrounded && !sChar.isClimbing && !sChar.isHeld && !hasRecentImpact && clientChar.vz > 1) {
        const moveInput = isClientMoving ? { x: clientChar.vx, y: clientChar.vy } : void 0;
        sChar.jump(sim.arena, moveInput);
      }
      if (!hasRecentImpact || clientChar.vz > sChar.verticalVelocity) {
        sChar.verticalVelocity = clientChar.vz;
      }
    }
    const dx = clientChar.x - sChar.position.x;
    const dy = clientChar.y - sChar.position.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 2.5) {
      sChar.position.x = clientChar.x;
      sChar.position.y = clientChar.y;
      sChar.position.z = clientChar.z;
    } else if (hasRecentImpact) {
      if (isClientMoving) {
        sChar.position.x += dx * 0.25;
        sChar.position.y += dy * 0.25;
      }
      sChar.position.z = clientChar.z;
    } else {
      sChar.position.x = clientChar.x;
      sChar.position.y = clientChar.y;
      sChar.position.z = clientChar.z;
    }
    if (clientChar.surfaceZ !== void 0) {
      sChar.supportingSurfaceHeight = clientChar.surfaceZ;
    }
    if (clientChar.isGrounded) {
      const surfaceZ = clientChar.surfaceZ ?? 0;
      if (sChar.position.z <= surfaceZ + 0.1) {
        sChar.position.z = surfaceZ;
        sChar.verticalVelocity = 0;
      }
    }
    if (clientChar.isClimbing !== void 0) {
      sChar.isClimbing = clientChar.isClimbing;
    }
    if (clientChar.facingAngle !== void 0) {
      sChar.facingAngle = clientChar.facingAngle;
    }
    if (clientChar.isUsingItem !== void 0) {
      sChar.isUsingItem = Boolean(clientChar.isUsingItem);
    }
    if (clientChar.heldObjectId) {
      if (sChar.hasDiedAwaitingNewPickup) ;
      else {
        const sObj = sim.objects.find((o) => o.id === clientChar.heldObjectId);
        if (sObj && sObj.heldBy === sChar && sChar.heldObject === sObj) {
          const relPos = sChar.calculateHeldObjectPosition(sim.arena);
          sObj.position.x = relPos.x;
          sObj.position.y = relPos.y;
          sObj.position.z = relPos.z;
          sObj.velocity.x = sChar.velocity.x;
          sObj.velocity.y = sChar.velocity.y;
          sObj.verticalVelocity = 0;
        }
      }
    } else if (sChar.heldObject && clientChar.isHolding === false) {
      const hasPendingThrow = (sChar._pendingThrowUntilMs ?? 0) > now || now - (sChar._lastServerThrowTime ?? 0) < 250;
      if (hasPendingThrow) {
        return;
      }
      const sObj = sChar.heldObject;
      if (sObj.consumableModule && (sObj.consumableModule.isConsumed || sObj.consumableModule.getRemainingEnergy(sObj.properties) <= 0.05)) {
        sim.triggerObjectDeletion(sObj.id);
      } else {
        sObj.isHeld = false;
        sObj.heldBy = null;
        sChar.heldObject = null;
      }
    }
  }
}
class ServerObjectSync {
  /**
   * Synchronizes server simulation objects from incoming client telemetry packets.
   */
  static syncObjectsFromPacket(sim, clientObjects, senderClientId) {
    if (!clientObjects || clientObjects.length === 0) return;
    const now = performance.now();
    for (const cObj of clientObjects) {
      if (sim.deletedObjectIds.has(cObj.id)) {
        continue;
      }
      if (cObj.remainingEnergyJoules !== void 0 && cObj.remainingEnergyJoules <= 1e-3) {
        sim.triggerObjectDeletion(cObj.id);
        continue;
      }
      let sObj = sim.objects.find((o) => o.id === cObj.id);
      if (!sObj) {
        const pId = cObj.prefabId || (cObj.name === "Apple" || cObj.id.startsWith("apple-") ? "prefab_apple" : void 0);
        const prefab = pId ? sim.prefabManager.get(pId) : void 0;
        if (prefab) {
          sObj = prefab.instantiate({ x: cObj.x, y: cObj.y, z: cObj.z }, sim.arena);
          sObj.id = cObj.id;
          sObj.velocity.x = cObj.vx;
          sObj.velocity.y = cObj.vy;
          sObj.verticalVelocity = cObj.vz ?? 0;
          if (cObj.name !== void 0) sObj.name = cObj.name;
          if (cObj.color !== void 0) sObj.color = cObj.color;
          if (cObj.shape !== void 0) sObj.visualShape = cObj.shape;
          if (cObj.radius !== void 0) {
            sObj.colliderRadius = cObj.radius;
            if (sObj.consumableModule) {
              sObj.consumableModule.initialColliderRadius = cObj.radius;
            }
          }
          if (cObj.mass !== void 0) sObj.mass = cObj.mass;
          if (cObj.bounceMod !== void 0) sObj.bounceMod = cObj.bounceMod;
        } else {
          sObj = new GameObject({
            id: cObj.id,
            name: cObj.name || "Object",
            position: { x: cObj.x, y: cObj.y, z: cObj.z },
            mass: cObj.mass ?? 1,
            bounceMod: cObj.bounceMod ?? 0,
            color: cObj.color || "#38bdf8",
            colliderRadius: cObj.radius || 0.35,
            visualShape: cObj.shape || "circle",
            consumableModule: cObj.consumableTag ? new ConsumableModule({
              tag: cObj.consumableTag,
              totalEnergyJoules: cObj.totalEnergyJoules ?? 4e3,
              remainingEnergyJoules: cObj.remainingEnergyJoules ?? cObj.totalEnergyJoules ?? 4e3
            }) : void 0
          });
        }
        sim.objects.push(sObj);
        sim.arena.entities = [...sim.allCharacters, ...sim.objects];
      }
      if (sObj.consumableModule && cObj.remainingEnergyJoules !== void 0 && !sObj.consumableModule.unlimited) {
        const curServerRemaining = sObj.consumableModule.getRemainingEnergy(sObj.properties);
        const clientRemaining = cObj.remainingEnergyJoules;
        if (sObj.isHeld) {
          if (clientRemaining < curServerRemaining) {
            const energyEaten = curServerRemaining - clientRemaining;
            const holder = sObj.heldBy instanceof Character ? sObj.heldBy : null;
            if (holder && holder.energyPool && holder.energyPool.enabled) {
              const curPool = holder.energyPool.getCurrentEnergy(holder.properties);
              const maxPool = holder.energyPool.getMaxEnergy(holder.properties);
              holder.energyPool.currentEnergyProp.set(Math.min(maxPool, curPool + energyEaten), holder.properties);
            }
            const healRate = sObj.consumableModule.getHealRate(sObj.properties);
            const consumeRate = sObj.consumableModule.getConsumeRate(sObj.properties);
            if (healRate > 0 && consumeRate > 0 && holder && holder.healthModule && holder.healthModule.enabled) {
              const secondsEaten = energyEaten / consumeRate;
              holder.healthModule.heal(healRate * secondsEaten, holder.properties, {
                id: "consumable_nutrition",
                name: sObj.consumableModule.tag ? `Consumable (${sObj.consumableModule.tag})` : "Consumable",
                type: "continuous",
                rate: healRate,
                color: "#22c55e",
                isHeal: true
              });
            }
            sObj.consumableModule.remainingEnergyJoulesProp.set(clientRemaining, sObj.properties);
            const currentScale = sObj.consumableModule.getScale(sObj.properties);
            const initialRadius = sObj.consumableModule.initialColliderRadius || sObj.colliderRadius;
            sObj.colliderRadius = Math.max(sObj.consumableModule.minRadiusFloor, initialRadius * currentScale);
            if (sObj.colliderModule) sObj.colliderModule.radius = sObj.colliderRadius;
          } else if (Math.abs(clientRemaining - curServerRemaining) > 100) {
            sObj.consumableModule.remainingEnergyJoulesProp.set(clientRemaining, sObj.properties);
          }
        } else {
          sObj.consumableModule.remainingEnergyJoulesProp.set(clientRemaining, sObj.properties);
        }
      }
      if (cObj.isHeld) {
        const holderId = cObj.heldBy || senderClientId;
        const sChar = holderId ? sim.characters.get(holderId) || sim.allCharacters.find((c) => c.playerId === holderId || c.id === holderId) : null;
        if (sChar) {
          if (sChar.hasDiedAwaitingNewPickup) {
            continue;
          }
          if (sObj.isHeld && sObj.heldBy && sObj.heldBy !== sChar) {
            continue;
          }
          sObj.isHeld = true;
          sObj.heldBy = sChar;
          sChar.heldObject = sObj;
          const relPos = sChar.calculateHeldObjectPosition(sim.arena);
          sObj.position.x = relPos.x;
          sObj.position.y = relPos.y;
          sObj.position.z = relPos.z;
          sObj.velocity.x = sChar.velocity.x;
          sObj.velocity.y = sChar.velocity.y;
          sObj.verticalVelocity = 0;
        }
        continue;
      } else if (sObj.isHeld) {
        const holderChar = sObj.heldBy instanceof Character ? sObj.heldBy : null;
        const holderId = holderChar ? holderChar.playerId || holderChar.id : null;
        if (senderClientId && holderId && holderId !== senderClientId) {
          continue;
        }
        if (holderChar) {
          const hasPendingThrow = (holderChar._pendingThrowUntilMs ?? 0) > now || now - (holderChar._lastServerThrowTime ?? 0) < 250;
          if (hasPendingThrow) {
            continue;
          }
        }
        sObj.isHeld = false;
        if (sObj.heldBy && sObj.heldBy instanceof Character) {
          sObj.heldBy.heldObject = null;
        }
        sObj.heldBy = null;
        if (sObj.consumableModule && (sObj.consumableModule.isConsumed || sObj.consumableModule.getRemainingEnergy(sObj.properties) <= 1e-3)) {
          sim.triggerObjectDeletion(sObj.id);
          continue;
        }
      }
      continue;
    }
  }
  /**
   * Settles a consumable the client reports as fully eaten.
   */
  static settleClientConsumedObject(sim, serverCharId, objectId) {
    var _a;
    const sChar = sim.characters.get(serverCharId);
    const obj = sim.objects.find((o) => o.id === objectId) || (((_a = sChar == null ? void 0 : sChar.heldObject) == null ? void 0 : _a.id) === objectId ? sChar.heldObject : null);
    const holder = obj && obj.heldBy instanceof Character ? obj.heldBy : sChar;
    const isHolder = Boolean(holder && (holder === sChar || holder.id === serverCharId || holder.playerId === serverCharId || holder.serverCharId === serverCharId));
    if (obj && holder && isHolder && obj.consumableModule) {
      if (obj.consumableModule.unlimited) return;
      const cm = obj.consumableModule;
      const remaining = cm.getRemainingEnergy(obj.properties);
      if (remaining > 1e-3) {
        if (holder.energyPool && holder.energyPool.enabled) {
          const pool = holder.energyPool;
          const cur = pool.getCurrentEnergy(holder.properties);
          const max = pool.getMaxEnergy(holder.properties);
          pool.currentEnergyProp.set(Math.min(max, cur + remaining), holder.properties);
        }
        const healRate = cm.getHealRate(obj.properties);
        if (healRate > 0 && holder.healthModule && holder.healthModule.enabled) {
          const secondsLeft = remaining / cm.getConsumeRate(obj.properties);
          holder.healthModule.heal(healRate * secondsLeft, holder.properties, {
            id: "consumable_nutrition",
            name: cm.tag ? `Consumable (${cm.tag})` : "Consumable",
            type: "continuous",
            rate: healRate,
            color: "#22c55e",
            isHeal: true
          });
        }
        cm.remainingEnergyJoulesProp.set(0, obj.properties);
      }
    }
    sim.triggerObjectDeletion(objectId);
  }
}
class ServerGameSimulation {
  constructor(config) {
    __publicField(this, "arena");
    __publicField(this, "characters", /* @__PURE__ */ new Map());
    __publicField(this, "objects", []);
    __publicField(this, "islandManager");
    __publicField(this, "currentTick", 0);
    __publicField(this, "fixedDt", 1 / 60);
    __publicField(this, "collisionMode", "dynamic");
    // Background scene spawner manager (authoritative item dispensing on server)
    __publicField(this, "sceneSpawnerManager");
    __publicField(this, "prefabManager");
    // Per-player input jitter buffer (Phase 5.2)
    __publicField(this, "jitterBuffer");
    // Adaptive Clock Sync & Time Dilation (Phase 6)
    __publicField(this, "latestClockSync", /* @__PURE__ */ new Map());
    __publicField(this, "clockSyncCheckInterval", 10);
    // Check every 10 ticks (6.1)
    // Authoritative Snapshot Broadcast & Delta Compression (Phase 7)
    __publicField(this, "snapshotManager");
    __publicField(this, "clientAckedTicks", /* @__PURE__ */ new Map());
    // Client confirmed server ticks (7.3)
    // Contested grab arbitration audit log & active reliable retry map
    __publicField(this, "contestedGrabEvents", []);
    __publicField(this, "pendingContestedEvents", /* @__PURE__ */ new Map());
    // Authoritative death & respawn reliable retry map
    __publicField(this, "pendingDeathRespawnEvents", /* @__PURE__ */ new Map());
    // Authoritative object deletion reliable retry map (e.g. eaten consumables)
    __publicField(this, "pendingObjectDeletionEvents", /* @__PURE__ */ new Map());
    // Reliable action deduplication & ACK tracking
    __publicField(this, "processedActionIds", /* @__PURE__ */ new Set());
    __publicField(this, "recentAckedActionIds", []);
    // Track deleted object IDs so client telemetry packets cannot resurrect deleted items (e.g. eaten food)
    __publicField(this, "deletedObjectIds", /* @__PURE__ */ new Set());
    // Authoritative grab result priority broadcast callback
    __publicField(this, "onGrabResult");
    const width = (config == null ? void 0 : config.arenaWidth) ?? 20;
    const height = (config == null ? void 0 : config.arenaHeight) ?? 14;
    const wallH = (config == null ? void 0 : config.wallHeight) ?? 1;
    this.arena = new Arena(width, height, wallH);
    this.islandManager = new IslandManager();
    if (config == null ? void 0 : config.collisionMode) this.collisionMode = config.collisionMode;
    if (config == null ? void 0 : config.fixedDt) this.fixedDt = config.fixedDt;
    this.jitterBuffer = new ServerJitterBufferManager({
      targetDepth: (config == null ? void 0 : config.jitterTargetDepth) ?? 2,
      maxCapacity: 60
    });
    this.snapshotManager = new AuthoritativeSnapshotManager({
      broadcastRateHz: (config == null ? void 0 : config.broadcastRateHz) ?? 60,
      deltaCompression: (config == null ? void 0 : config.deltaCompression) ?? true
    });
    this.prefabManager = new PrefabManager();
    this.sceneSpawnerManager = new SceneSpawnerManager(this.prefabManager);
  }
  get allCharacters() {
    return Array.from(this.characters.values());
  }
  initializeFromWorld(clientArena, clientCharacters, clientObjects) {
    ServerWorldInitializer.initializeFromWorld(this, clientArena, clientCharacters, clientObjects);
  }
  initializeDefaultScenario() {
    ServerWorldInitializer.initializeDefaultScenario(this);
  }
  initializeFromConfig(config) {
    ServerWorldInitializer.initializeFromConfig(this, config);
  }
  /**
   * Enqueues an incoming input packet from a player into the server jitter buffer.
   * Also tracks client acknowledged server ticks (Phase 7.3) and pending throw guard window.
   */
  queueInput(packet) {
    if (packet.lastReceivedServerTick !== void 0) {
      const cur = this.clientAckedTicks.get(packet.playerId) ?? 0;
      if (packet.lastReceivedServerTick > cur) {
        this.clientAckedTicks.set(packet.playerId, packet.lastReceivedServerTick);
      }
    }
    const sChar = packet.playerId ? this.characters.get(packet.playerId) : void 0;
    if (packet.playerId && !sChar) {
      return false;
    }
    if (sChar && packet.isThrow) {
      sChar._pendingThrowUntilMs = performance.now() + 250;
    }
    return this.jitterBuffer.push(packet);
  }
  getClientAckedTick(playerId) {
    return this.clientAckedTicks.get(playerId) ?? 0;
  }
  getJitterStats(playerId) {
    return this.jitterBuffer.getStats(playerId);
  }
  getAllJitterStats() {
    return this.jitterBuffer.getAllStats();
  }
  /**
   * Evaluates jitter buffer depths and computes adaptive clock sync packets for all players (Phase 6).
   */
  evaluateClockSync() {
    for (const [pId] of this.characters) {
      const syncPacket = this.jitterBuffer.evaluateClockSync(pId, this.currentTick);
      this.latestClockSync.set(pId, syncPacket);
    }
    if (!this.characters.has("keyboard")) {
      const syncPacket = this.jitterBuffer.evaluateClockSync("keyboard", this.currentTick);
      this.latestClockSync.set("keyboard", syncPacket);
    }
  }
  getLatestClockSync(playerId) {
    return this.latestClockSync.get(playerId) ?? null;
  }
  syncObjectsFromPacket(clientObjects, senderClientId) {
    ServerObjectSync.syncObjectsFromPacket(this, clientObjects, senderClientId);
  }
  syncCharactersFromPacket(clientChars) {
    ServerCharacterSync.syncCharactersFromPacket(this, clientChars);
  }
  syncCharacterFromPacket(clientChar) {
    ServerCharacterSync.syncCharacterFromPacket(this, clientChar);
  }
  processReliableActions(actions) {
    return ServerReliableActionProcessor.processReliableActions(
      this,
      actions,
      this.processedActionIds,
      this.recentAckedActionIds
    );
  }
  getRecentAckedActionIds() {
    return [...this.recentAckedActionIds];
  }
  arbitrateContestedGrabs(grabRequests) {
    ServerEventQueueManager.arbitrateContestedGrabs(this, grabRequests);
  }
  acknowledgeContestedEvents(clientCharId, eventIds) {
    ServerEventQueueManager.acknowledgeContestedEvents(this, clientCharId, eventIds);
  }
  getActiveContestedEvents() {
    return ServerEventQueueManager.getActiveContestedEvents(this);
  }
  acknowledgeDeathRespawnEvents(clientCharId, eventIds) {
    ServerEventQueueManager.acknowledgeDeathRespawnEvents(this, clientCharId, eventIds);
  }
  getActiveDeathRespawnEvents() {
    return ServerEventQueueManager.getActiveDeathRespawnEvents(this);
  }
  triggerObjectDeletion(objectId) {
    ServerEventQueueManager.triggerObjectDeletion(this, objectId);
  }
  acknowledgeObjectDeletionEvents(clientCharId, eventIds) {
    ServerEventQueueManager.acknowledgeObjectDeletionEvents(this, clientCharId, eventIds);
  }
  getActiveObjectDeletionEvents() {
    return ServerEventQueueManager.getActiveObjectDeletionEvents(this);
  }
  /**
   * Applies exactly one tick of held-item primary ability use (e.g. eating for consumables) for a character.
   */
  applyItemUse(char, isUsing, dt) {
    var _a, _b, _c;
    if (!isUsing || !char.heldObject) return;
    const heldObj = char.heldObject;
    if ((_a = heldObj.hasPrimaryItemAbility) == null ? void 0 : _a.call(heldObj)) {
      const res = heldObj.usePrimaryItemAbility(dt, char, this.objects, this.arena);
      if (res.isDepleted && !((_b = heldObj.consumableModule) == null ? void 0 : _b.unlimited)) {
        this.triggerObjectDeletion(heldObj.id);
      }
    } else if (char.consumeModule && char.consumeModule.canConsume(heldObj)) {
      const result = char.consumeModule.consume(dt, char, heldObj, this.objects, this.arena);
      if (result.isDepleted && !((_c = heldObj.consumableModule) == null ? void 0 : _c.unlimited)) {
        this.triggerObjectDeletion(heldObj.id);
      }
    }
  }
  settleClientConsumedObject(serverCharId, objectId) {
    ServerObjectSync.settleClientConsumedObject(this, serverCharId, objectId);
  }
  /**
   * Advances the authoritative simulation by 1 fixed physics tick.
   * Deterministically applies player inputs, freebody updates, and collision resolution.
   */
  step(dt = this.fixedDt) {
    this.currentTick++;
    this.arena.entities = [...this.allCharacters, ...this.objects];
    const grabRequests = [];
    const inputDrivenChars = /* @__PURE__ */ new Set();
    for (const [pId, char] of this.characters) {
      const { packet: pkt, drainedPackets, isStarved } = this.jitterBuffer.consume(pId, this.currentTick);
      inputDrivenChars.add(char);
      for (const catchupPkt of drainedPackets) {
        char.updateCharacter(
          dt,
          { x: catchupPkt.moveX, y: catchupPkt.moveY },
          catchupPkt.isAiming,
          catchupPkt.aimX !== void 0 && catchupPkt.aimY !== void 0 ? { x: catchupPkt.aimX, y: catchupPkt.aimY } : null,
          this.arena,
          catchupPkt.isJumpHeld,
          this.arena.entities,
          catchupPkt.isLockHeld
        );
        if (catchupPkt.facingAngle !== void 0) {
          char.facingAngle = catchupPkt.facingAngle;
        }
        if (char.heldObject) {
          const heldPos = char.calculateHeldObjectPosition(this.arena);
          char.heldObject.position.x = heldPos.x;
          char.heldObject.position.y = heldPos.y;
          char.heldObject.position.z = heldPos.z;
        }
        this.applyItemUse(char, Boolean(catchupPkt.isUsingItem), dt);
      }
      if (pkt) {
        if (pkt.isUsingItem !== void 0) {
          char.isUsingItem = Boolean(pkt.isUsingItem);
        } else if (!char.heldObject || !char.canConsumeHeldObject()) {
          char.isUsingItem = false;
        }
        if (char.isSprinting !== pkt.isSprinting) {
          char.setSprinting(pkt.isSprinting);
        }
        const aimTarget = pkt.aimX !== void 0 && pkt.aimY !== void 0 ? { x: pkt.aimX, y: pkt.aimY } : null;
        if (pkt.isDrop && char.heldObject && char.pickupModule) {
          char.pickupModule.drop(char);
        }
        if (pkt.isThrow && char.heldObject && char.throwModule) {
          const aimX = aimTarget ? aimTarget.x : pkt.aimX !== void 0 ? pkt.aimX : char.position.x + Math.cos(char.facingAngle) * 3;
          const aimY = aimTarget ? aimTarget.y : pkt.aimY !== void 0 ? pkt.aimY : char.position.y + Math.sin(char.facingAngle) * 3;
          const launchVel = pkt.launchVx !== void 0 ? {
            vx: pkt.launchVx,
            vy: pkt.launchVy,
            vz: pkt.launchVz ?? 0
          } : void 0;
          const launchPos = pkt.launchStartX !== void 0 ? {
            x: pkt.launchStartX,
            y: pkt.launchStartY,
            z: pkt.launchStartZ ?? 0
          } : void 0;
          if (char.energyPool && launchVel) {
            const pool = char.energyPool;
            const heldMass = char.heldObject.hasMass ? Math.max(0.1, char.heldObject.mass) : 1;
            const launchSpeed = Math.hypot(launchVel.vx, launchVel.vy, launchVel.vz);
            const poolEfficiency = Math.max(0.01, pool.getMuscleEfficiency(char.properties));
            const neededJoules = 0.5 * heldMass * launchSpeed * launchSpeed / poolEfficiency + 100;
            pool.isExhausted = false;
            const curStam = pool.getCurrentStamina(char.properties);
            if (curStam < neededJoules) {
              pool.currentStaminaProp.set(neededJoules, char.properties);
            }
            if (!pool.infiniteEnergy && pool.getCurrentEnergy(char.properties) < neededJoules) {
              pool.currentEnergyProp.set(neededJoules, char.properties);
            }
            if (char.throwModule && char.throwModule.maxPowerProp.get(char.properties) < neededJoules) {
              char.throwModule.maxPowerProp.set(neededJoules, char.properties);
            }
          }
          const thrown = char.throwModule.throwHeldObject(
            char,
            aimX,
            aimY,
            this.arena,
            void 0,
            void 0,
            pkt.isLockHeld,
            launchVel,
            launchPos
          );
          if (thrown) {
            char._lastServerThrowTime = performance.now();
            char._pendingThrowUntilMs = 0;
          }
        }
        if (pkt.isGrabHeld && !char.heldObject && char.pickupModule) {
          const others = [...this.allCharacters.filter((c) => c !== char), ...this.objects];
          let target = null;
          if (pkt.grabTargetObjectId !== void 0) {
            if (pkt.grabTargetObjectId !== null) {
              const explicitTarget = others.find((o) => o.id === pkt.grabTargetObjectId);
              if (explicitTarget && (!explicitTarget.isHeld || explicitTarget.heldBy === char)) {
                const maxReach = char.pickupModule.pickupReach * 1.35;
                const charZ = Math.max(char.position.z, char.supportingSurfaceHeight ?? 0);
                const targetZ = Math.max(explicitTarget.position.z, explicitTarget.supportingSurfaceHeight ?? 0);
                const dist3D = Math.hypot(
                  explicitTarget.position.x - char.position.x,
                  explicitTarget.position.y - char.position.y,
                  targetZ - charZ
                );
                if (dist3D <= maxReach) {
                  target = explicitTarget;
                }
              }
            }
          } else {
            const grabAimX = aimTarget ? aimTarget.x : char.position.x;
            const grabAimY = aimTarget ? aimTarget.y : char.position.y;
            target = char.pickupModule.findTargetObject(char, grabAimX, grabAimY, others, this.arena.wallHeight);
          }
          if (target && (!target.isHeld || target.heldBy === char)) {
            grabRequests.push({ char, target, pkt });
          }
        }
        if (pkt.isSwap && char.pickupModule) {
          const dropped = char.heldObject;
          if (dropped) {
            char.pickupModule.drop(char);
          }
          const others = [...this.allCharacters.filter((c) => c !== char), ...this.objects].filter((o) => o !== dropped);
          let target = null;
          if (pkt.grabTargetObjectId && pkt.grabTargetObjectId !== (dropped == null ? void 0 : dropped.id)) {
            const explicitTarget = others.find((o) => o.id === pkt.grabTargetObjectId);
            if (explicitTarget && (!explicitTarget.isHeld || explicitTarget.heldBy === char)) {
              const maxReach = char.pickupModule.pickupReach * 1.35;
              const charZ = Math.max(char.position.z, char.supportingSurfaceHeight ?? 0);
              const targetZ = Math.max(explicitTarget.position.z, explicitTarget.supportingSurfaceHeight ?? 0);
              const dist3D = Math.hypot(
                explicitTarget.position.x - char.position.x,
                explicitTarget.position.y - char.position.y,
                targetZ - charZ
              );
              if (dist3D <= maxReach) {
                target = explicitTarget;
              }
            }
          } else {
            const grabAimX = aimTarget ? aimTarget.x : char.position.x;
            const grabAimY = aimTarget ? aimTarget.y : char.position.y;
            target = char.pickupModule.findTargetObject(char, grabAimX, grabAimY, others, this.arena.wallHeight);
          }
          if (target && (!target.isHeld || target.heldBy === char)) {
            grabRequests.push({ char, target, pkt });
          }
        }
        if (char.laserModule) {
          char.isLaserAiming = Boolean(pkt.isLaserAiming);
          char.isLaserFiring = Boolean(pkt.isLaserFiring);
          char.laserStarvedTicks = 0;
          if (pkt.laserAimX !== void 0 && pkt.laserAimY !== void 0) {
            char.laserAimTarget = { x: pkt.laserAimX, y: pkt.laserAimY };
          }
          char.laserPowerFraction = typeof pkt.laserPowerFraction === "number" ? pkt.laserPowerFraction : 1;
          char.laserCandidateEntities = [...this.allCharacters.filter((c) => c !== char), ...this.objects];
        }
        if (char.meleeModule) {
          char.isMeleeRequested = Boolean(pkt.isMeleeRequested);
          char.meleeAimDir = pkt.meleeAimDirX !== void 0 && pkt.meleeAimDirY !== void 0 ? { x: pkt.meleeAimDirX, y: pkt.meleeAimDirY } : pkt.meleeAimX !== void 0 ? { x: pkt.meleeAimX - char.position.x, y: pkt.meleeAimY - char.position.y } : null;
          char.meleeCandidateEntities = [...this.allCharacters.filter((c) => c !== char), ...this.objects];
        }
        char.updateCharacter(
          dt,
          { x: pkt.moveX, y: pkt.moveY },
          pkt.isAiming,
          aimTarget,
          this.arena,
          pkt.isJumpHeld,
          this.arena.entities,
          pkt.isLockHeld,
          pkt.lockedAimPos ?? null
        );
        if (pkt.lockedAimPos) {
          const lPos = pkt.lockedAimPos;
          const dx = lPos.x - char.position.x;
          const dy = lPos.y - char.position.y;
          if (Math.hypot(dx, dy) > 0.05) {
            char.facingAngle = Math.atan2(dy, dx);
          }
        } else if (pkt.facingAngle !== void 0) {
          char.facingAngle = pkt.facingAngle;
        }
        if (char.heldObject) {
          const heldPos = char.calculateHeldObjectPosition(this.arena);
          char.heldObject.position.x = heldPos.x;
          char.heldObject.position.y = heldPos.y;
          char.heldObject.position.z = heldPos.z;
        }
        if (!isStarved) {
          this.applyItemUse(char, char.isUsingItem, dt);
        }
      } else {
        if (!char.heldObject || !char.canConsumeHeldObject()) {
          char.isUsingItem = false;
        }
        if (char.laserModule) {
          const starved = (char.laserStarvedTicks ?? 0) + 1;
          char.laserStarvedTicks = starved;
          if (starved > 8 || !char.isLaserFiring) {
            char.isLaserAiming = false;
            char.isLaserFiring = false;
            char.laserAimTarget = null;
          }
        }
        if (char.meleeModule) {
          char.isMeleeRequested = false;
          char.meleeAimDir = null;
        }
        char.updateCharacter(dt, { x: 0, y: 0 }, false, null, this.arena, false, this.arena.entities, false);
      }
    }
    if (grabRequests.length > 0) {
      this.arbitrateContestedGrabs(grabRequests);
    }
    for (const obj of this.objects) {
      if (obj.isHeld && obj.heldBy && obj.heldBy instanceof Character) {
        const relPos = obj.heldBy.calculateHeldObjectPosition(this.arena);
        obj.position.x = relPos.x;
        obj.position.y = relPos.y;
        obj.position.z = relPos.z;
        obj.velocity.x = obj.heldBy.velocity.x;
        obj.velocity.y = obj.heldBy.velocity.y;
        obj.verticalVelocity = 0;
        continue;
      }
      obj.updatePosition(dt, this.arena);
      if (obj.healthModule && obj.healthModule.enabled && !obj.isCharacter) {
        obj.healthModule.update(dt, obj, this.arena);
      }
    }
    for (const char of this.allCharacters) {
      if (!inputDrivenChars.has(char)) {
        this.applyItemUse(char, char.isUsingItem, dt);
      }
    }
    const allEntities = [...this.allCharacters, ...this.objects];
    for (const ent of allEntities) {
      if (ent.damageAuraModule && ent.damageAuraModule.enabled) {
        ent.damageAuraModule.update(dt, ent, this.arena);
      }
    }
    this.sceneSpawnerManager.update(dt, this.arena, this.objects);
    for (const char of this.allCharacters) {
      if (char.healthModule && !char.healthModule.onDeathRespawn) {
        char.healthModule.onDeathRespawn = (entity, respawnPos) => {
          const charId = entity.playerId || entity.serverCharId || entity.id;
          const eventId = `death-${charId}-${this.currentTick}`;
          this.pendingDeathRespawnEvents.set(eventId, {
            event: {
              eventId,
              targetEntityId: charId,
              tick: this.currentTick,
              respawnX: respawnPos.x,
              respawnY: respawnPos.y,
              respawnZ: respawnPos.z,
              maxHp: entity.healthModule ? entity.healthModule.getMaxHp(entity.properties) : 100
            },
            createdTick: this.currentTick,
            acks: /* @__PURE__ */ new Set()
          });
        };
      }
    }
    CollisionResolver.resolveEntityCollisions(
      [...this.allCharacters, ...this.objects],
      this.arena,
      dt,
      null,
      this.collisionMode
    );
    this.islandManager.updateIslands(this.allCharacters, this.objects, this.currentTick, this.arena);
    if (this.currentTick % this.clockSyncCheckInterval === 0) {
      this.evaluateClockSync();
    }
    return SnapshotManager.capture(this.currentTick, this.allCharacters, this.objects, false);
  }
  getAuthoritativeWorldSnapshot(forceKeyframe = false) {
    return ServerTelemetryBroadcaster.createAuthoritativeWorldSnapshot(this, forceKeyframe);
  }
  getGhostSnapshot(rttMs = 0, forPlayerId) {
    return ServerTelemetryBroadcaster.createGhostSnapshot(
      this.currentTick,
      this.allCharacters,
      this.characters,
      this.objects,
      this.arena,
      this.latestClockSync,
      this.getRecentAckedActionIds(),
      this.getActiveContestedEvents(),
      rttMs,
      forPlayerId,
      this.getActiveDeathRespawnEvents(),
      this.getActiveObjectDeletionEvents(),
      this.prefabManager
    );
  }
}
class ControlActionCatalog {
  static findAction(moduleId, intent) {
    if (moduleId === "throwPickup") {
      if (intent === "pickupReach" || intent === "dropItem") {
        moduleId = "pickup";
      } else {
        moduleId = "throw";
      }
    }
    if ((moduleId === "consume" || moduleId === "heldItem") && (intent === "eatHeldItem" || intent === "primaryItemAbility")) {
      const heldCat = this.categories.find((c) => c.id === "heldItem");
      const action = heldCat == null ? void 0 : heldCat.actions.find((a) => a.id === "primaryItemAbility");
      if (action) return action;
    }
    const cat = this.categories.find((c) => c.id === moduleId);
    return cat == null ? void 0 : cat.actions.find((a) => a.id === intent);
  }
  static getCategorizedForCharacter(char) {
    const attached = [];
    const unattached = [];
    for (const cat of this.categories) {
      if (cat.isAttached(char)) {
        attached.push(cat);
      } else {
        unattached.push(cat);
      }
    }
    return { attached, unattached };
  }
}
__publicField(ControlActionCatalog, "categories", [
  // 1. Locomotion
  {
    id: "locomotion",
    label: "Locomotion & Mobility",
    icon: "🏃",
    requiredModule: "walkingModule",
    isAttached: (char) => Boolean(char.walkingModule && char.walkingModule.enabled),
    actions: [
      {
        id: "jump",
        label: "Jump (Impulse)",
        description: "Performs a vertical physical takeoff jump",
        recommendedMode: "press",
        execute: (ctx) => {
          if (ctx.character.jumpModule) {
            ctx.character.jump();
          }
        }
      },
      {
        id: "toggleSprint",
        label: "Toggle Sprint",
        description: "Toggles sprinting locomotion state",
        recommendedMode: "press",
        execute: (ctx) => {
          ctx.character.setSprinting(!ctx.character.isSprinting);
        }
      },
      {
        id: "holdSprint",
        label: "Hold Sprint",
        description: "Sprints while trigger is held down",
        recommendedMode: "hold",
        execute: (ctx) => {
          ctx.character.setSprinting(true);
        },
        stop: (ctx) => {
          ctx.character.setSprinting(false);
        }
      }
    ]
  },
  // 2. Climbing
  {
    id: "climbing",
    label: "Wall Climbing",
    icon: "🧗",
    requiredModule: "climbingModule",
    isAttached: (char) => Boolean(char.climbingModule && char.climbingModule.enabled),
    actions: [
      {
        id: "mountOrClimb",
        label: "Mount / Hold Wall",
        description: "Mounts and climbs wall when touching a climbable edge",
        recommendedMode: "hold",
        execute: (ctx) => {
          if (ctx.character.climbingModule && !ctx.character.isClimbing) {
            ctx.character.isClimbing = true;
          }
        },
        stop: (ctx) => {
          if (ctx.character.climbingModule) {
            ctx.character.isClimbing = false;
          }
        }
      }
    ]
  },
  // 3. Throwing
  {
    id: "throw",
    label: "Throwing & Trajectory",
    icon: "🎯",
    requiredModule: "throwModule",
    isAttached: (char) => Boolean(char.throwModule && char.throwModule.enabled),
    actions: [
      {
        id: "aimThrow",
        label: "Aim Throw Trajectory",
        description: "Shows anticipatory parabolic trajectory while held",
        recommendedMode: "hold",
        execute: (ctx) => {
          if (ctx.character.heldObject) {
            ctx.character.isAimingTrajectory = true;
          }
        },
        stop: (ctx) => {
          ctx.character.isAimingTrajectory = false;
        }
      },
      {
        id: "releaseThrow",
        label: "Release Throw",
        description: "Throws held item along trajectory to aim position",
        recommendedMode: "release",
        execute: (ctx) => {
          if (ctx.character.heldObject && ctx.character.throwModule && ctx.arena) {
            const aim = ctx.mouseAimPos || ctx.reticleAimPos;
            ctx.character.throwModule.throwHeldObject(ctx.character, aim.x, aim.y, ctx.arena);
          }
        }
      }
    ]
  },
  // 4. Grabbing & Pickup
  {
    id: "pickup",
    label: "Grabbing & Pickup",
    icon: "✋",
    requiredModule: "pickupModule",
    isAttached: (char) => Boolean(char.pickupModule && char.pickupModule.enabled),
    actions: [
      {
        id: "pickupReach",
        label: "Pick Up / Grab Object",
        description: "Picks up the target object currently within reach",
        recommendedMode: "press",
        execute: (ctx) => {
          if (!ctx.character.heldObject && ctx.targetInReach && ctx.character.pickupModule) {
            ctx.character.pickupModule.pickup(ctx.character, ctx.targetInReach);
          }
        }
      },
      {
        id: "dropItem",
        label: "Drop Held Object",
        description: "Gently drops the held object onto the ground",
        recommendedMode: "press",
        execute: (ctx) => {
          if (ctx.character.heldObject) {
            ctx.character.unhold();
          }
        }
      },
      {
        id: "swap",
        label: "Swap Item",
        description: "Drops currently held item and picks up the selected item (excluding the dropped item)",
        recommendedMode: "press",
        execute: (ctx) => {
          const pickupMod = ctx.character.pickupModule;
          if (!pickupMod) return;
          const char = ctx.character;
          const dropped = char.heldObject;
          if (dropped) {
            pickupMod.drop(char);
          }
          const target = ctx.targetInReach && ctx.targetInReach !== dropped ? ctx.targetInReach : null;
          if (target) {
            pickupMod.pickup(char, target);
          } else if (ctx.candidateEntities && ctx.arena) {
            const aim = ctx.mouseAimPos || ctx.reticleAimPos;
            const candidates = ctx.candidateEntities.filter((e) => e !== dropped && e.colliderModule);
            pickupMod.pickupAndSwap(char, candidates, ctx.arena.wallHeight, aim == null ? void 0 : aim.x, aim == null ? void 0 : aim.y);
          }
        }
      }
    ]
  },
  // 4. Laser Module
  {
    id: "laser",
    label: "Laser Beam",
    icon: "⚡",
    requiredModule: "laserModule",
    isAttached: (char) => Boolean(char.laserModule && char.laserModule.enabled),
    actions: [
      {
        id: "fireLaser",
        label: "Fire Laser (Held)",
        description: "Fires continuous directed laser beam towards aim cursor",
        recommendedMode: "hold",
        execute: (ctx) => {
          if (ctx.character.laserModule) {
            ctx.character.isLaserAiming = true;
            ctx.character.isLaserFiring = true;
            ctx.character.laserModule.isAiming = true;
            ctx.character.laserModule.isFiring = true;
          }
        },
        stop: (ctx) => {
          if (ctx.character.laserModule) {
            ctx.character.isLaserFiring = false;
            ctx.character.isLaserAiming = false;
            ctx.character.laserModule.isFiring = false;
            ctx.character.laserModule.isAiming = false;
          }
        }
      },
      {
        id: "aimLaser",
        label: "Aim Laser Reticle",
        description: "Shows laser aiming guide without firing energy",
        recommendedMode: "hold",
        execute: (ctx) => {
          if (ctx.character.laserModule) {
            ctx.character.isLaserAiming = true;
            ctx.character.laserModule.isAiming = true;
          }
        },
        stop: (ctx) => {
          if (ctx.character.laserModule) {
            ctx.character.isLaserAiming = false;
            ctx.character.laserModule.isAiming = false;
          }
        }
      }
    ]
  },
  // 5. Melee Module
  {
    id: "melee",
    label: "Melee Punch",
    icon: "🥊",
    requiredModule: "meleeModule",
    isAttached: (char) => Boolean(char.meleeModule && char.meleeModule.enabled),
    actions: [
      {
        id: "punch",
        label: "Directional Punch",
        description: "Executes a fast physical punch in the facing or aim direction",
        recommendedMode: "press",
        execute: (ctx) => {
          if (ctx.character.meleeModule) {
            const aim = ctx.mouseAimPos || ctx.reticleAimPos;
            const dir = aim ? { x: aim.x - ctx.character.position.x, y: aim.y - ctx.character.position.y } : { x: Math.cos(ctx.facingAngle), y: Math.sin(ctx.facingAngle) };
            const len = Math.hypot(dir.x, dir.y);
            const normDir = len > 1e-3 ? { x: dir.x / len, y: dir.y / len } : { x: 1, y: 0 };
            ctx.character.isMeleeRequested = true;
            ctx.character.meleeAimDir = normDir;
          }
        }
      }
    ]
  },
  // 6. Held Item Abilities
  {
    id: "heldItem",
    label: "Held Item Abilities",
    icon: "✨",
    isAttached: (char) => Boolean(char.pickupModule && char.pickupModule.enabled),
    actions: [
      {
        id: "primaryItemAbility",
        label: "Primary Item Ability",
        description: "Uses the primary ability of the held item (e.g. consuming food or activating tools)",
        recommendedMode: "hold",
        execute: (ctx) => {
          if (ctx.character.heldObject) {
            ctx.character.isUsingItem = true;
          }
        },
        stop: (ctx) => {
          ctx.character.isUsingItem = false;
        }
      }
    ]
  },
  // 7. Control Staging
  {
    id: "staging",
    label: "Stage",
    icon: "🎭",
    isAttached: () => true,
    // Always available
    actions: [
      {
        id: "setStage",
        label: "Set Stage",
        description: "Sets the active stage state to a chosen stage value",
        recommendedMode: "press",
        execute: (ctx, args) => {
          var _a;
          const group = (args == null ? void 0 : args.group) || (args == null ? void 0 : args.stageSet) || "default";
          const targetStage = (args == null ? void 0 : args.stage) || "none";
          if ((_a = ctx.character) == null ? void 0 : _a.setStage) {
            ctx.character.setStage(group, targetStage);
          } else {
            if (!ctx.character.stagedActions) ctx.character.stagedActions = {};
            ctx.character.stagedActions[group] = targetStage;
            if (group === "default" || group === "main") {
              ctx.character.stagedAction = targetStage;
            }
          }
        }
      }
    ]
  }
]);
const _InputPressTokenManager = class _InputPressTokenManager {
  constructor() {
    __publicField(this, "tokens", /* @__PURE__ */ new Map());
  }
  static getInstance(playerId = "default") {
    let inst = this.instances.get(playerId);
    if (!inst) {
      inst = new _InputPressTokenManager();
      this.instances.set(playerId, inst);
    }
    return inst;
  }
  update(currentDownKeys, now) {
    for (const token of this.tokens.values()) {
      token.wasReleasedThisFrame = false;
      token.releasedClaimedBy = null;
      token.releasedClaimedByBindingId = null;
      token.releasedClaimedByTarget = null;
      token.wasFreshOnRelease = false;
    }
    for (const code of currentDownKeys) {
      const existing = this.tokens.get(code);
      if (!existing || !existing.isDown) {
        this.tokens.set(code, {
          code,
          isDown: true,
          downTime: now,
          isFresh: true,
          claimedBy: null,
          claimedByBindingId: null,
          claimedByTarget: null,
          isConsumed: false,
          consumedBy: null,
          consumedByTarget: null,
          wasReleasedThisFrame: false,
          releasedClaimedBy: null,
          releasedClaimedByBindingId: null,
          releasedClaimedByTarget: null,
          wasFreshOnRelease: false
        });
      }
    }
    for (const [code, token] of this.tokens.entries()) {
      if (!currentDownKeys.has(code) && token.isDown) {
        token.isDown = false;
        token.wasReleasedThisFrame = true;
        token.releasedClaimedBy = token.claimedBy;
        token.releasedClaimedByBindingId = token.claimedByBindingId;
        token.releasedClaimedByTarget = token.claimedByTarget;
        token.wasFreshOnRelease = token.isFresh;
        token.isFresh = false;
        token.claimedBy = null;
        token.claimedByBindingId = null;
        token.claimedByTarget = null;
        token.isConsumed = false;
        token.consumedBy = null;
        token.consumedByTarget = null;
      }
    }
  }
  isDown(code) {
    var _a;
    return ((_a = this.tokens.get(code)) == null ? void 0 : _a.isDown) ?? false;
  }
  isFresh(code) {
    const t = this.tokens.get(code);
    return Boolean(t && t.isDown && t.isFresh);
  }
  wasReleased(code) {
    var _a;
    return ((_a = this.tokens.get(code)) == null ? void 0 : _a.wasReleasedThisFrame) ?? false;
  }
  getHoldDuration(code, now) {
    const t = this.tokens.get(code);
    if (!t || !t.isDown) return 0;
    return Math.max(0, now - t.downTime);
  }
  claim(code, actionId, target) {
    const t = this.tokens.get(code);
    if (!t || !t.isDown) return false;
    t.isFresh = false;
    t.claimedBy = actionId;
    t.claimedByBindingId = actionId;
    if (target) {
      t.claimedByTarget = target;
    }
    return true;
  }
  consume(code, actionId, target) {
    const t = this.tokens.get(code);
    if (!t || !t.isDown) return false;
    t.isFresh = false;
    t.isConsumed = true;
    t.consumedBy = actionId;
    t.consumedByTarget = target ?? null;
    t.claimedBy = actionId;
    t.claimedByBindingId = actionId;
    if (target) {
      t.claimedByTarget = target;
    }
    return true;
  }
  isConsumed(code) {
    var _a;
    return Boolean((_a = this.tokens.get(code)) == null ? void 0 : _a.isConsumed);
  }
  isClaimedBy(code, actionId) {
    const t = this.tokens.get(code);
    return Boolean(
      t && t.isDown && (t.claimedBy === actionId || t.claimedByBindingId === actionId || t.claimedByTarget === actionId)
    );
  }
  /**
   * Evaluates if a button press can execute while currently held or pressed down.
   */
  canExecute(code, policy, actionId, target) {
    var _a;
    const t = this.tokens.get(code);
    if (!t || !t.isDown) return false;
    if (t.isConsumed) return false;
    if (policy === "requireCleanPress") {
      if (t.isFresh) return true;
      if (t.claimedBy === actionId || t.claimedByBindingId === actionId) return true;
      if (target && t.claimedByTarget === target) return true;
      const domain = target == null ? void 0 : target.split(".")[0];
      if (domain && ((_a = t.claimedByTarget) == null ? void 0 : _a.startsWith(domain))) return true;
      return false;
    }
    if (policy === "exclusiveClaim") {
      return t.isFresh && t.claimedBy === null;
    }
    return true;
  }
  /**
   * Evaluates if a button release trigger (triggerMode: "up") can execute on the release frame.
   * Ensures that releasing a key only fires if the press that was released was clean or belonged to this domain.
   */
  canExecuteRelease(code, policy, actionId, target) {
    var _a;
    const t = this.tokens.get(code);
    if (!t || !t.wasReleasedThisFrame) return false;
    if (policy === "requireCleanPress") {
      if (t.wasFreshOnRelease || !t.releasedClaimedBy && !t.releasedClaimedByTarget) {
        return true;
      }
      if (t.releasedClaimedBy === actionId || t.releasedClaimedByBindingId === actionId) {
        return true;
      }
      if (target && t.releasedClaimedByTarget === target) {
        return true;
      }
      const domain = target == null ? void 0 : target.split(".")[0];
      if (domain && ((_a = t.releasedClaimedByTarget) == null ? void 0 : _a.startsWith(domain))) {
        return true;
      }
      return false;
    }
    if (policy === "exclusiveClaim") {
      return t.wasFreshOnRelease && t.releasedClaimedBy === null;
    }
    return true;
  }
  reset() {
    this.tokens.clear();
  }
};
__publicField(_InputPressTokenManager, "instances", /* @__PURE__ */ new Map());
let InputPressTokenManager = _InputPressTokenManager;
const _ControlSchemaArbiter = class _ControlSchemaArbiter {
  static getCursorOffset(characterId) {
    let offset = this.cursorReticleOffsets.get(characterId);
    if (!offset) {
      offset = { x: 3, y: 0 };
      this.cursorReticleOffsets.set(characterId, offset);
    }
    return offset;
  }
  static getRuleConditions(rule) {
    if (rule.conditions && rule.conditions.length > 0) return rule.conditions;
    if (rule.condition) return [rule.condition];
    return [{ type: "always" }];
  }
  static getRuleActions(rule) {
    if (rule.body && rule.body.length > 0) {
      return rule.body.filter((s) => s.type === "action").map((s) => s.action);
    }
    if (rule.actions && rule.actions.length > 0) return rule.actions;
    if (rule.action) return [rule.action];
    return [];
  }
  static getRuleBody(rule) {
    if (rule.body && rule.body.length > 0) {
      return rule.body;
    }
    const statements = [];
    const actions = this.getRuleActions(rule);
    for (const act of actions) {
      statements.push({ type: "action", action: act });
    }
    if (rule.children && rule.children.length > 0) {
      const threadMap = /* @__PURE__ */ new Map();
      for (const child of rule.children) {
        const tId = child.threadId || `thread-${child.id}`;
        if (!threadMap.has(tId)) threadMap.set(tId, []);
        threadMap.get(tId).push(child);
      }
      for (const [threadId, rules] of threadMap.entries()) {
        statements.push({ type: "nestedThread", threadId, rules });
      }
    }
    return statements;
  }
  static syncRuleFromStatements(rule) {
    if (!rule.body) return;
    const actions = [];
    const children = [];
    for (const stmt of rule.body) {
      if (stmt.type === "action") {
        actions.push(stmt.action);
      } else if (stmt.type === "nestedThread") {
        children.push(...stmt.rules);
      }
    }
    rule.actions = actions;
    rule.action = actions[0];
    rule.children = children;
  }
  static resolveEffectiveTrigger(rule, schema, device) {
    var _a, _b;
    if (rule.tagId && schema && device) {
      const cfg = device === "keyboardMouse" ? schema.keyboardMouse : device === "gamepad" ? schema.gamepad : schema.touch;
      const tags = cfg.tags ?? [];
      const tag = tags.find((t) => t.id === rule.tagId);
      if (tag) {
        return {
          ...tag.trigger,
          mode: ((_a = rule.trigger) == null ? void 0 : _a.mode) ?? tag.trigger.mode ?? "press"
        };
      }
    }
    if (!rule.tagId && (!((_b = rule.trigger) == null ? void 0 : _b.code) || rule.trigger.code === "None" || rule.trigger.code === "Always" || rule.trigger.code === "")) {
      return { device: "keyboard", code: "Always", mode: "press" };
    }
    return rule.trigger;
  }
  static evaluateAllConditions(rule, ctx) {
    const conds = this.getRuleConditions(rule);
    if (conds.length === 0) return true;
    const op = rule.conditionOp ?? "and";
    if (op === "or") {
      return conds.some((cond) => this.evaluateCondition(cond, ctx, rule));
    }
    return conds.every((cond) => this.evaluateCondition(cond, ctx, rule));
  }
  static evaluateCondition(cond, ctx, _rule) {
    var _a, _b, _c, _d, _e;
    let result = false;
    switch (cond.type) {
      case "group": {
        const subConds = cond.conditions ?? [];
        if (subConds.length === 0) {
          result = true;
        } else {
          const groupOp = cond.op ?? "or";
          if (groupOp === "or") {
            result = subConds.some((c) => this.evaluateCondition(c, ctx, _rule));
          } else {
            result = subConds.every((c) => this.evaluateCondition(c, ctx, _rule));
          }
        }
        break;
      }
      case "always":
        result = true;
        break;
      case "holdingObject":
        result = ctx.isHoldingItem;
        break;
      case "holdingPlainObject":
      case "holdingObjectWithoutAbility":
        result = ctx.isHoldingItem && !ctx.heldItemHasPrimaryAbility && !ctx.heldItemIsEdible;
        break;
      case "holdingItemWithPrimaryAbility":
      case "holdingEdible":
        result = ctx.isHoldingItem && Boolean(ctx.heldItemHasPrimaryAbility ?? ctx.heldItemIsEdible);
        break;
      case "emptyHanded":
        result = !ctx.isHoldingItem;
        break;
      case "targetInReach":
        result = ctx.targetInReach !== null;
        break;
      case "stagedActionIs": {
        const group = cond.stageGroup || "default";
        const current = ((_a = ctx.character) == null ? void 0 : _a.getStage) ? ctx.character.getStage(group) : ((_b = ctx.stagedActions) == null ? void 0 : _b[group]) ?? (group === "default" ? ctx.stagedAction : "none") ?? "none";
        const expected = cond.param || "none";
        result = current === expected;
        break;
      }
      case "grounded":
        result = ctx.isGrounded;
        break;
      case "climbing":
        result = ctx.isClimbing;
        break;
      case "tagHeld":
      case "tagPressed":
      case "tagReleased":
        if (cond.param && ctx.schema) {
          const mode = cond.type === "tagHeld" ? "hold" : cond.type === "tagPressed" ? "press" : "release";
          const tags = [
            ...((_c = ctx.schema.keyboardMouse) == null ? void 0 : _c.tags) ?? [],
            ...((_d = ctx.schema.gamepad) == null ? void 0 : _d.tags) ?? [],
            ...((_e = ctx.schema.touch) == null ? void 0 : _e.tags) ?? []
          ];
          const tag = tags.find((t) => t.id === cond.param || t.name === cond.param);
          if (tag) {
            const eff = { ...tag.trigger, mode };
            const dummyKeys = { isDown: ctx.isKeyDown, justPressed: () => false, justReleased: () => false };
            const dummyMouse = { isDown: ctx.isMouseButtonDown, justPressed: () => false, justReleased: () => false };
            result = this.isTriggerActive(
              eff,
              ctx,
              ctx.keyStates ?? dummyKeys,
              ctx.mouseStates ?? dummyMouse,
              ctx.gamepadStates
            );
          }
        }
        break;
      case "buttonHeld":
        if (cond.param) {
          const p = cond.param.trim();
          if (p === "MouseLeft") result = ctx.isMouseButtonDown(0);
          else if (p === "MouseMiddle") result = ctx.isMouseButtonDown(1);
          else if (p === "MouseRight") result = ctx.isMouseButtonDown(2);
          else if (p.startsWith("Gamepad")) {
            const btn = _ControlSchemaArbiter.parseGamepadButtonCode(p);
            result = ctx.isGamepadButtonDown(0, btn);
          } else {
            result = ctx.isKeyDown(p);
          }
        }
        break;
      case "isAiming":
        result = Boolean(ctx.character.isAimingTrajectory || ctx.character.isLaserAiming);
        break;
      case "isAimingTrajectory":
        result = Boolean(ctx.character.isAimingTrajectory);
        break;
      case "isLaserAiming":
        result = Boolean(ctx.character.isLaserAiming);
        break;
      default:
        result = true;
    }
    return cond.negate ? !result : result;
  }
  static isTriggerActive(trigger, _ctx, keyStates, mouseStates, gamepadStates) {
    if (!trigger || !trigger.code || trigger.code === "Always" || trigger.code === "None") {
      return true;
    }
    if (trigger.chordModifiers && trigger.chordModifiers.length > 0) {
      for (const mod of trigger.chordModifiers) {
        let isModDown = false;
        if (mod.startsWith("Alt")) {
          isModDown = keyStates.isDown("AltLeft") || keyStates.isDown("AltRight") || keyStates.isDown("Alt");
        } else if (mod.startsWith("Shift")) {
          isModDown = keyStates.isDown("ShiftLeft") || keyStates.isDown("ShiftRight") || keyStates.isDown("Shift");
        } else if (mod.startsWith("Control") || mod.startsWith("Ctrl")) {
          isModDown = keyStates.isDown("ControlLeft") || keyStates.isDown("ControlRight") || keyStates.isDown("Control");
        } else {
          isModDown = keyStates.isDown(mod);
        }
        if (!isModDown) {
          return false;
        }
      }
    }
    if (trigger.device === "keyboard") {
      if (trigger.mode === "press") return keyStates.justPressed(trigger.code);
      if (trigger.mode === "release") return keyStates.justReleased(trigger.code);
      return keyStates.isDown(trigger.code);
    }
    if (trigger.device === "mouse") {
      const btn = trigger.code === "MouseLeft" ? 0 : trigger.code === "MouseMiddle" ? 1 : 2;
      if (trigger.mode === "press") return mouseStates.justPressed(btn);
      if (trigger.mode === "release") return mouseStates.justReleased(btn);
      return mouseStates.isDown(btn);
    }
    if (trigger.device === "gamepad" && gamepadStates) {
      const btn = this.parseGamepadButtonCode(trigger.code);
      if (btn !== -1) {
        if (trigger.mode === "press") return gamepadStates.justPressed(btn);
        if (trigger.mode === "release") return gamepadStates.justReleased(btn);
        return gamepadStates.isDown(btn);
      }
    }
    return false;
  }
  static containsInputCondition(cond) {
    if (cond.type === "tagHeld" || cond.type === "tagPressed" || cond.type === "tagReleased" || cond.type === "buttonHeld") {
      return true;
    }
    if (cond.type === "group" && cond.conditions) {
      return cond.conditions.some((c) => this.containsInputCondition(c));
    }
    return false;
  }
  static isRuleApplicable(rule, ctx, schema, device, keyStates, mouseStates, gamepadStates) {
    if (rule.enabled === false) return false;
    if (!this.evaluateAllConditions(rule, ctx)) {
      return false;
    }
    const conds = this.getRuleConditions(rule);
    const hasInputCondition = conds.some((c) => this.containsInputCondition(c));
    const effTrigger = this.resolveEffectiveTrigger(rule, schema, device);
    const isPassiveTrigger = !effTrigger || !effTrigger.code || effTrigger.code === "Always" || effTrigger.code === "None";
    if (hasInputCondition || isPassiveTrigger) {
      return true;
    }
    const kStates = keyStates ?? ctx.keyStates ?? { isDown: ctx.isKeyDown, justPressed: () => false, justReleased: () => false };
    const mStates = mouseStates ?? ctx.mouseStates ?? { isDown: ctx.isMouseButtonDown, justPressed: () => false, justReleased: () => false };
    return this.isTriggerActive(effTrigger, ctx, kStates, mStates, gamepadStates ?? ctx.gamepadStates);
  }
  static parseGamepadButtonCode(code) {
    switch (code) {
      case "GamepadA":
        return 0;
      case "GamepadB":
        return 1;
      case "GamepadX":
        return 2;
      case "GamepadY":
        return 3;
      case "GamepadLB":
        return 4;
      case "GamepadRB":
        return 5;
      case "GamepadLT":
        return 6;
      case "GamepadRT":
        return 7;
      case "GamepadBack":
        return 8;
      case "GamepadStart":
        return 9;
      case "GamepadLS":
        return 10;
      case "GamepadRS":
        return 11;
      case "GamepadDpadUp":
        return 12;
      case "GamepadDpadDown":
        return 13;
      case "GamepadDpadLeft":
        return 14;
      case "GamepadDpadRight":
        return 15;
      default:
        return -1;
    }
  }
  static formatGamepadButtonIndex(btn) {
    switch (btn) {
      case 0:
        return "GamepadA";
      case 1:
        return "GamepadB";
      case 2:
        return "GamepadX";
      case 3:
        return "GamepadY";
      case 4:
        return "GamepadLB";
      case 5:
        return "GamepadRB";
      case 6:
        return "GamepadLT";
      case 7:
        return "GamepadRT";
      case 8:
        return "GamepadBack";
      case 9:
        return "GamepadStart";
      case 10:
        return "GamepadLS";
      case 11:
        return "GamepadRS";
      case 12:
        return "GamepadDpadUp";
      case 13:
        return "GamepadDpadDown";
      case 14:
        return "GamepadDpadLeft";
      case 15:
        return "GamepadDpadRight";
      default:
        return `GamepadBtn${btn}`;
    }
  }
  static evaluateFrame(schema, ctx, device, keyStates, mouseStates, gamepadStates) {
    const activeRules = [];
    const ruleStates = /* @__PURE__ */ new Map();
    let moveX = 0;
    let moveY = 0;
    let aimTarget = null;
    let facingAngle = ctx.facingAngle;
    if (device === "keyboardMouse") {
      const cfg = schema.keyboardMouse;
      if (cfg.aiming.mode === "faceMouseCursor") {
        aimTarget = { x: mouseStates.worldPos.x, y: mouseStates.worldPos.y };
        facingAngle = Math.atan2(
          aimTarget.y - ctx.character.position.y,
          aimTarget.x - ctx.character.position.x
        );
      }
      if (cfg.locomotion.mode === "forwardFacingDrive") {
        const isFwd = cfg.locomotion.forwardTrigger ? this.isTriggerActive(cfg.locomotion.forwardTrigger, ctx, keyStates, mouseStates) : false;
        const fwdX = Math.cos(facingAngle);
        const fwdY = Math.sin(facingAngle);
        const leftX = -fwdY;
        const leftY = fwdX;
        if (isFwd) {
          moveX += fwdX;
          moveY += fwdY;
        }
        if (cfg.locomotion.reverseKey && keyStates.isDown(cfg.locomotion.reverseKey)) {
          moveX -= fwdX * 0.75;
          moveY -= fwdY * 0.75;
        }
        if (cfg.locomotion.strafeLeftKey && keyStates.isDown(cfg.locomotion.strafeLeftKey)) {
          moveX += leftX * 0.85;
          moveY += leftY * 0.85;
        }
        if (cfg.locomotion.strafeRightKey && keyStates.isDown(cfg.locomotion.strafeRightKey)) {
          moveX -= leftX * 0.85;
          moveY -= leftY * 0.85;
        }
        const mag = Math.hypot(moveX, moveY);
        if (mag > 1) {
          moveX /= mag;
          moveY /= mag;
        }
      } else {
        if (cfg.locomotion.moveForwardKey && keyStates.isDown(cfg.locomotion.moveForwardKey)) moveY -= 1;
        if (cfg.locomotion.reverseKey && keyStates.isDown(cfg.locomotion.reverseKey)) moveY += 1;
        if (cfg.locomotion.strafeLeftKey && keyStates.isDown(cfg.locomotion.strafeLeftKey)) moveX -= 1;
        if (cfg.locomotion.strafeRightKey && keyStates.isDown(cfg.locomotion.strafeRightKey)) moveX += 1;
        const mag = Math.hypot(moveX, moveY);
        if (mag > 1) {
          moveX /= mag;
          moveY /= mag;
        }
      }
      const sortedRules = [...cfg.rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      const executedThreads = /* @__PURE__ */ new Set();
      for (const rule of sortedRules) {
        if (rule.enabled === false) continue;
        const threadKey = rule.threadId ?? (rule.tagId ? `${rule.tagId}:${rule.trigger.mode}` : null);
        if (threadKey && executedThreads.has(threadKey)) {
          ruleStates.set(rule.id, { matchesCondition: false, isTriggerActive: false });
          continue;
        }
        const matchesCondition = this.evaluateAllConditions(rule, ctx);
        const effTrigger = this.resolveEffectiveTrigger(rule, schema, "keyboardMouse");
        const triggerActive = this.isTriggerActive(effTrigger, ctx, keyStates, mouseStates);
        ruleStates.set(rule.id, { matchesCondition, isTriggerActive: triggerActive });
        if (matchesCondition && triggerActive) {
          if (threadKey) {
            executedThreads.add(threadKey);
          }
          activeRules.push(rule);
          const actions = this.getRuleActions(rule);
          for (const act of actions) {
            const actDef = ControlActionCatalog.findAction(act.moduleId, act.intent);
            if (actDef) {
              actDef.execute(ctx, act.args);
            }
          }
        }
      }
    } else if (device === "gamepad" && gamepadStates) {
      const cfg = schema.gamepad;
      const leftStick = gamepadStates.leftStick;
      const rightStick = gamepadStates.rightStick;
      let isOverridden = false;
      if (cfg.leftStick.dynamicOverride) {
        const cond = cfg.leftStick.dynamicOverride.triggerCondition;
        if (cond === "whenLtHeld" && gamepadStates.isDown(6)) {
          isOverridden = true;
        } else if (cond === "whenHoldingItem" && ctx.isHoldingItem) {
          isOverridden = true;
        } else if (cond === "whenAiming" && (ctx.stagedAction === "laser" || ctx.isHoldingItem)) {
          isOverridden = true;
        }
      }
      const activeLeftMode = isOverridden ? cfg.leftStick.dynamicOverride.overrideMode : cfg.leftStick.primaryMode;
      if (activeLeftMode === "cursorSteer") {
        const reticleSpeed = cfg.leftStick.cursorSteerSpeed ?? 14;
        const clampRadius = cfg.leftStick.cursorClampRadius ?? 7.5;
        const offset = this.getCursorOffset(ctx.character.id);
        offset.x += leftStick.x * reticleSpeed * ctx.dt;
        offset.y += leftStick.y * reticleSpeed * ctx.dt;
        const dist = Math.hypot(offset.x, offset.y);
        if (dist > clampRadius) {
          offset.x = offset.x / dist * clampRadius;
          offset.y = offset.y / dist * clampRadius;
        }
        aimTarget = {
          x: ctx.character.position.x + offset.x,
          y: ctx.character.position.y + offset.y
        };
      } else {
        moveX = leftStick.x;
        moveY = leftStick.y;
      }
      if (cfg.rightStick.mode === "twinStickAim") {
        const rMag = Math.hypot(rightStick.x, rightStick.y);
        if (rMag > 0.15) {
          aimTarget = {
            x: ctx.character.position.x + rightStick.x * 5,
            y: ctx.character.position.y + rightStick.y * 5
          };
        }
      }
      const sortedRules = [...cfg.rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      const executedThreads = /* @__PURE__ */ new Set();
      for (const rule of sortedRules) {
        if (rule.enabled === false) continue;
        const threadKey = rule.threadId ?? (rule.tagId ? `${rule.tagId}:${rule.trigger.mode}` : null);
        if (threadKey && executedThreads.has(threadKey)) {
          ruleStates.set(rule.id, { matchesCondition: false, isTriggerActive: false });
          continue;
        }
        const matchesCondition = this.evaluateAllConditions(rule, ctx);
        const effTrigger = this.resolveEffectiveTrigger(rule, schema, "gamepad");
        const triggerActive = this.isTriggerActive(effTrigger, ctx, keyStates, mouseStates, gamepadStates);
        ruleStates.set(rule.id, { matchesCondition, isTriggerActive: triggerActive });
        if (matchesCondition && triggerActive) {
          if (threadKey) {
            executedThreads.add(threadKey);
          }
          activeRules.push(rule);
          const actions = this.getRuleActions(rule);
          for (const act of actions) {
            const actDef = ControlActionCatalog.findAction(act.moduleId, act.intent);
            if (actDef) {
              actDef.execute(ctx, act.args);
            }
          }
        }
      }
    }
    return {
      movementVector: { x: moveX, y: moveY },
      aimTarget,
      facingAngle,
      activeRules,
      ruleStates
    };
  }
  static evaluateChannels(channels, execCtx, input) {
    var _a, _b, _c, _d;
    const char = execCtx.character;
    const now = performance.now();
    const playerId = execCtx.gamepadStates ? `gamepad-${execCtx.gamepadStates.slotIndex}` : char.playerId || "keyboard";
    const tokens = InputPressTokenManager.getInstance(playerId);
    const activeKeys = /* @__PURE__ */ new Set();
    if (input.isMouseDown) activeKeys.add("MouseLeft");
    if (input.isMiddleMouseDown) activeKeys.add("MouseMiddle");
    if (input.isRightMouseDown) activeKeys.add("MouseRight");
    for (const key of input.getActiveKeys()) {
      activeKeys.add(key);
    }
    tokens.update(activeKeys, now);
    let moveX = 0;
    let moveY = 0;
    const loco = channels.locomotion;
    if (loco.mode === "directVector") {
      for (const k of loco.upKeys) if (tokens.isDown(k)) {
        moveY -= 1;
        break;
      }
      for (const k of loco.downKeys) if (tokens.isDown(k)) {
        moveY += 1;
        break;
      }
      for (const k of loco.leftKeys) if (tokens.isDown(k)) {
        moveX -= 1;
        break;
      }
      for (const k of loco.rightKeys) if (tokens.isDown(k)) {
        moveX += 1;
        break;
      }
    } else if (loco.mode === "forwardFacingDrive") {
      const fwdAngle = char.facingAngle ?? 0;
      const fwdX = Math.cos(fwdAngle);
      const fwdY = Math.sin(fwdAngle);
      const leftX = -fwdY;
      const leftY = fwdX;
      const fwdKey = loco.forwardKey || loco.upKeys[0];
      if (fwdKey && tokens.isDown(fwdKey)) {
        moveX += fwdX;
        moveY += fwdY;
      }
      for (const k of loco.downKeys) if (tokens.isDown(k)) {
        moveX -= fwdX * 0.75;
        moveY -= fwdY * 0.75;
        break;
      }
      for (const k of loco.leftKeys) if (tokens.isDown(k)) {
        moveX += leftX * 0.85;
        moveY += leftY * 0.85;
        break;
      }
      for (const k of loco.rightKeys) if (tokens.isDown(k)) {
        moveX -= leftX * 0.85;
        moveY -= leftY * 0.85;
        break;
      }
    } else if (loco.mode === "facingRelativeStrafe") {
      const fwdAngle = char.facingAngle ?? 0;
      const fwdX = Math.cos(fwdAngle);
      const fwdY = Math.sin(fwdAngle);
      const leftX = -fwdY;
      const leftY = fwdX;
      for (const k of loco.upKeys) if (tokens.isDown(k)) {
        moveX += fwdX;
        moveY += fwdY;
        break;
      }
      for (const k of loco.downKeys) if (tokens.isDown(k)) {
        moveX -= fwdX;
        moveY -= fwdY;
        break;
      }
      for (const k of loco.leftKeys) if (tokens.isDown(k)) {
        moveX += leftX;
        moveY += leftY;
        break;
      }
      for (const k of loco.rightKeys) if (tokens.isDown(k)) {
        moveX -= leftX;
        moveY -= leftY;
        break;
      }
    }
    const moveMag = Math.hypot(moveX, moveY);
    if (moveMag > 1) {
      moveX /= moveMag;
      moveY /= moveMag;
    }
    let isSprinting = false;
    if (loco.sprintKey) {
      if (loco.sprintMode === "toggle") {
        if (tokens.isFresh(loco.sprintKey)) {
          char.setSprinting(!char.isSprinting);
          tokens.claim(loco.sprintKey, "toggleSprint");
        }
        isSprinting = Boolean(char.isSprinting);
      } else {
        isSprinting = tokens.isDown(loco.sprintKey);
      }
    }
    const isJumpHeld = loco.jumpKey ? tokens.isDown(loco.jumpKey) : false;
    if (channels.aiming.mode === "faceMouseCursor") {
      const aimDx = input.actualMousePos.x - char.position.x;
      const aimDy = input.actualMousePos.y - char.position.y;
      if (Math.hypot(aimDx, aimDy) > 0.05) {
        char.facingAngle = Math.atan2(aimDy, aimDx);
      }
    } else if (channels.aiming.mode === "faceMovement") {
      if (moveMag > 0.05) {
        char.facingAngle = Math.atan2(moveY, moveX);
      }
    }
    let isMeleeRequested = false;
    if (channels.melee.enabled) {
      const code = channels.melee.trigger.code;
      if (tokens.canExecute(code, channels.melee.claimPolicy, "melee")) {
        tokens.claim(code, "melee");
        isMeleeRequested = true;
      }
    }
    let isLaserAiming = false;
    let isLaserFiring = false;
    if (channels.laser.enabled) {
      const aimTrig = channels.laser.aimTrigger;
      const isAltChord = (aimTrig.chordModifiers || []).every((m) => tokens.isDown(m));
      if (isAltChord && tokens.isDown(aimTrig.code)) {
        isLaserAiming = true;
        if (tokens.isDown(channels.laser.fireTrigger.code)) {
          isLaserFiring = true;
        }
      }
    }
    let isUsingItem = false;
    const canUseItem = execCtx.isHoldingItem && (execCtx.heldItemIsEdible || execCtx.heldItemHasPrimaryAbility);
    if (canUseItem && channels.consume.enabled) {
      const code = channels.consume.trigger.code;
      if (tokens.canExecute(code, channels.consume.claimPolicy, "consume")) {
        tokens.claim(code, "consume");
        isUsingItem = true;
      }
    }
    let isAimingTrajectory = false;
    let isThrow = false;
    if (execCtx.isHoldingItem && channels.throw.enabled) {
      const aimCode = channels.throw.aimTrigger.code;
      const isAimHeld = tokens.isDown(aimCode);
      if (isAimHeld) {
        isAimingTrajectory = true;
        const fireCode = channels.throw.fireTrigger.code;
        const fireHeldMs = tokens.getHoldDuration(fireCode, now);
        if (channels.throw.arcModulationSource === "mouseDragY") {
          if (tokens.isDown(fireCode)) {
            if (fireHeldMs >= (channels.throw.arcDragHoldThresholdMs || 200)) {
              if (!input.isRawDragging) {
                input.beginRawDrag((_dx, dy) => {
                  if (char.throwModule) {
                    const cur = char.throwModule.savedArcRatio ?? 0.5;
                    const next = Math.max(0, Math.min(1, cur + -dy * 5e-3));
                    char.throwModule.savedArcRatio = next;
                    char.savedArcRatio = next;
                    char.throwModule.hasUserSetArcRatio = true;
                    char.hasUserSetArcRatio = true;
                  }
                });
              }
            }
          }
        }
        const wasFireDown = ((_a = execCtx.mouseStates) == null ? void 0 : _a.justReleased(fireCode === "MouseLeft" ? 0 : 2)) || (((_b = execCtx.keyStates) == null ? void 0 : _b.justReleased(fireCode)) ?? false);
        if (wasFireDown) {
          if (input.isRawDragging) {
            input.endRawDrag();
            if (channels.throw.fireOnReleaseAim !== true) {
              isThrow = true;
              tokens.claim(fireCode, "throw");
            }
          } else if (fireHeldMs < (channels.throw.arcDragHoldThresholdMs || 200)) {
            isThrow = true;
            tokens.claim(fireCode, "throw");
          }
        }
      } else {
        if (input.isRawDragging) {
          input.endRawDrag();
        }
      }
    }
    let isGrabHeld = false;
    let isSwap = false;
    if (channels.interaction.enabled) {
      const code = channels.interaction.trigger.code;
      if (!execCtx.isHoldingItem) {
        if (tokens.canExecute(code, channels.interaction.claimPolicy, "interact") && execCtx.targetInReach) {
          tokens.claim(code, "interact");
          isGrabHeld = true;
        }
      } else if (channels.interaction.allowSwapWhenHolding && execCtx.targetInReach && !isAimingTrajectory && !isUsingItem) {
        if (tokens.canExecute(code, channels.interaction.claimPolicy, "swap")) {
          tokens.claim(code, "swap");
          isSwap = true;
        }
      }
    }
    char.isAimingTrajectory = isAimingTrajectory;
    char.isLaserAiming = isLaserAiming;
    char.isLaserFiring = isLaserFiring;
    char.isMeleeRequested = isMeleeRequested;
    if (isAimingTrajectory && char.facingAngle !== void 0) {
      char.lastThrowAimAngle = char.facingAngle;
    }
    const isAiming = isLaserAiming || isAimingTrajectory;
    const kLaunchVel = isThrow && ((_c = char.activeTrajectory) == null ? void 0 : _c.launchVel) ? char.activeTrajectory.launchVel : void 0;
    const kLaunchPos = isThrow && ((_d = char.activeTrajectory) == null ? void 0 : _d.launchPos) ? char.activeTrajectory.launchPos : void 0;
    return {
      playerId: "keyboard",
      moveX,
      moveY,
      isSprinting: isSprinting || Boolean(char.isSprinting),
      isJumpHeld,
      isGrabHeld,
      grabTargetObjectId: (isGrabHeld || isSwap) && execCtx.targetInReach ? execCtx.targetInReach.id : null,
      isDrop: false,
      isThrow,
      isSwap,
      isUsingItem,
      isLaserAiming,
      isLaserFiring,
      laserAimX: input.actualMousePos.x,
      laserAimY: input.actualMousePos.y,
      isMeleeRequested,
      meleeAimDirX: (input.actualMousePos.x - char.position.x) / (Math.hypot(input.actualMousePos.x - char.position.x, input.actualMousePos.y - char.position.y) || 1),
      meleeAimDirY: (input.actualMousePos.y - char.position.y) / (Math.hypot(input.actualMousePos.x - char.position.x, input.actualMousePos.y - char.position.y) || 1),
      meleeAimX: input.actualMousePos.x,
      meleeAimY: input.actualMousePos.y,
      aimX: input.actualMousePos.x,
      aimY: input.actualMousePos.y,
      isAiming,
      isLockHeld: Boolean(input.lockedAimPos),
      lockedAimPos: input.lockedAimPos,
      aimLockDelta: 0,
      facingAngle: char.facingAngle,
      ...kLaunchVel ? {
        launchVx: kLaunchVel.vx,
        launchVy: kLaunchVel.vy,
        launchVz: kLaunchVel.vz
      } : {},
      ...kLaunchPos ? {
        launchStartX: kLaunchPos.x,
        launchStartY: kLaunchPos.y,
        launchStartZ: kLaunchPos.z
      } : {}
    };
  }
};
// Reticle steering offset state per character ID
__publicField(_ControlSchemaArbiter, "cursorReticleOffsets", /* @__PURE__ */ new Map());
let ControlSchemaArbiter = _ControlSchemaArbiter;
class PlayerDeltaBuilder {
  static setNestedProperty(target, path2, value) {
    const parts = path2.split(".");
    let curr = target;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!curr[parts[i]] || typeof curr[parts[i]] !== "object") {
        curr[parts[i]] = {};
      }
      curr = curr[parts[i]];
    }
    curr[parts[parts.length - 1]] = value;
  }
  static resolvePropertyPath(owner, prop, label) {
    const isChar = owner instanceof Character || owner.isCharacter;
    if (isChar) {
      const char = owner;
      if (char.walkingModule) {
        if (prop === char.walkingModule.maxWalkForceProp) return "walkingModule.maxWalkForce";
        if (prop === char.walkingModule.maxWalkSpeedProp) return "walkingModule.maxWalkSpeed";
        if (prop === char.walkingModule.maxSprintSpeedProp) return "walkingModule.sprintSpeed";
        if (prop === char.walkingModule.maxWalkPowerProp || prop === char.walkingModule.walkPowerCapacityProp) return "walkingModule.maxWalkPower";
        if (prop === char.walkingModule.maxSprintPowerProp || prop === char.walkingModule.sprintPowerCapacityProp) return "walkingModule.maxSprintPower";
        if (prop === char.walkingModule.airFrictionProp) return "walkingModule.airFriction";
      }
      if (char.jumpModule) {
        if (prop === char.jumpModule.jumpStrengthProp) return "jumpModule.jumpImpulse";
        if (prop === char.jumpModule.maxInitialSpeedProp) return "jumpModule.maxInitialSpeed";
      }
      if (char.jumpPowerCapacityProp && prop === char.jumpPowerCapacityProp) {
        return "jumpModule.jumpPowerCapacity";
      }
      if (char.throwModule) {
        if (prop === char.throwModule.maxPowerProp) return "throwModule.throwPowerCapacity";
        if (prop === char.throwModule.maxThrowSpeedProp) return "throwModule.maxThrowSpeed";
        if (prop === char.throwModule.maxThrowHeightProp) return "throwModule.maxThrowHeight";
      }
      if (char.pickupModule) {
        if (prop === char.pickupModule.pickupReachProp) return "pickupModule.pickupReach";
        if (prop === char.pickupModule.maxPowerProp) return "pickupModule.maxPower";
      }
      if (char.climbingModule) {
        if (prop === char.climbingModule.maxClimbSpeedProp) return "climbingModule.climbSpeed";
        if (prop === char.climbingModule.maxPowerProp) return "climbingModule.maxPower";
        if (prop === char.climbingModule.maxAdhesionProp) return "climbingModule.maxAdhesion";
      }
      if (char.laserModule) {
        if (prop === char.laserModule.damageRateProp) return "laserModule.damageRate";
        if (prop === char.laserModule.thicknessProp) return "laserModule.thickness";
        if (prop === char.laserModule.maxPowerProp) return "laserModule.maxPower";
      }
      if (char.meleeModule) {
        if (prop === char.meleeModule.maxForceProp) return "meleeModule.impactForce";
        if (prop === char.meleeModule.maxPowerProp) return "meleeModule.maxPower";
        if (prop === char.meleeModule.punchFrequencyProp) return "meleeModule.punchFrequency";
        if (prop === char.meleeModule.reachProp) return "meleeModule.reach";
        if (prop === char.meleeModule.widthProp) return "meleeModule.width";
      }
      if (char.healthModule) {
        if (prop === char.healthModule.maxHpProp) return "healthModule.maxHp";
        if (prop === char.healthModule.currentHpProp) return "healthModule.currentHp";
        if (prop === char.healthModule.maxHealRateProp) return "healthModule.naturalHealRate";
        if (prop === char.healthModule.maxPowerProp) return "healthModule.maxPower";
        if (prop === char.healthModule.joulesPerHpProp) return "healthModule.joulesPerHp";
      }
      if (char.energyPool) {
        if (prop === char.energyPool.currentEnergyProp) return "energyPool.currentEnergy";
        if (prop === char.energyPool.maxEnergyProp) return "energyPool.energyPoolCapacity";
        if (prop === char.energyPool.currentStaminaProp) return "energyPool.currentStamina";
        if (prop === char.energyPool.maxStaminaProp) return "energyPool.staminaCapacity";
        if (prop === char.energyPool.staminaRegenRateProp) return "energyPool.staminaRegenRate";
        if (prop === char.energyPool.muscleEfficiencyProp) return "energyPool.muscleEfficiency";
      }
      if (char.wallEdgeAssistModule) {
        if (prop === char.wallEdgeAssistModule.hangDistanceProp) return "wallEdgeAssistModule.hangDistance";
      }
      if (char.strengthProp && prop === char.strengthProp) return "strength";
      if (char.colliderModule && prop === char.colliderModule.radiusProp) return "colliderRadius";
      if (char.rigidbodyModule && prop === char.rigidbodyModule.massProp) return "mass";
    }
    if (owner.rigidbodyModule && prop === owner.rigidbodyModule.massProp) return "mass";
    if (owner.colliderModule && prop === owner.colliderModule.radiusProp) return "colliderRadius";
    if (owner.frictionModule) {
      if (prop === owner.frictionModule.staticFrictionProp) return "friction";
      if (prop === owner.frictionModule.dynamicFrictionProp) return "dynamicFriction";
    }
    if (owner.bounceModule && prop === owner.bounceModule.bounceModProp) return "restitution";
    if (owner.rollModule) {
      if (prop === owner.rollModule.rollResistanceProp) return "rollResistance";
      if (prop === owner.rollModule.bumpinessProp) return "bumpiness";
    }
    if (owner.consumableModule) {
      if (prop === owner.consumableModule.totalEnergyJoulesProp) return "consumableModule.totalEnergyJoules";
      if (prop === owner.consumableModule.remainingEnergyJoulesProp) return "consumableModule.remainingEnergyJoules";
      if (prop === owner.consumableModule.consumeRateWattsProp) return "consumableModule.consumeRateWatts";
      if (prop === owner.consumableModule.healRateProp) return "consumableModule.healRate";
    }
    if (owner.damageAuraModule) {
      if (prop === owner.damageAuraModule.damageRadiusProp) return "damageAuraModule.damageRadius";
      if (prop === owner.damageAuraModule.damageRateProp) return "damageAuraModule.damageRate";
    }
    if (owner.damageSolverModule) {
      if (prop === owner.damageSolverModule.impactSusceptibilityProp) return "damageSolverModule.impactSusceptibility";
      if (prop === owner.damageSolverModule.damageThresholdHpProp) return "damageSolverModule.minShockThreshold";
      if (prop === owner.damageSolverModule.selfImpactWeightProp) return "damageSolverModule.selfImpactWeight";
    }
    if (prop.referenceKey && prop.referenceKey.trim().length > 0) {
      return prop.referenceKey.trim();
    }
    if (label) {
      const l = label.trim().toLowerCase();
      if (l.includes("walk force")) return "walkingModule.maxWalkForce";
      if (l.includes("walk speed")) return "walkingModule.maxWalkSpeed";
      if (l.includes("sprint speed")) return "walkingModule.sprintSpeed";
      if (l.includes("walk power")) return "walkingModule.maxWalkPower";
      if (l.includes("sprint power")) return "walkingModule.maxSprintPower";
      if (l.includes("air control") || l.includes("walk in air")) return "walkingModule.walkInAir";
      if (l.includes("air fric")) return "walkingModule.airFriction";
      if (l.includes("can sprint")) return "walkingModule.canSprint";
      if (l.includes("jump impulse") || l.includes("jump strength")) return "jumpModule.jumpImpulse";
      if (l.includes("takeoff speed")) return "jumpModule.maxInitialSpeed";
      if (l.includes("jump power")) return "jumpModule.jumpPowerCapacity";
      if (l.includes("throw speed") || l.includes("throw force")) return "throwModule.maxThrowSpeed";
      if (l.includes("throw height")) return "throwModule.maxThrowHeight";
      if (l.includes("throw power") || l.includes("throw wattage")) return "throwModule.throwPowerCapacity";
      if (l.includes("pickup reach")) return "pickupModule.pickupReach";
      if (l.includes("pickup power")) return "pickupModule.maxPower";
      if (l.includes("climb speed")) return "climbingModule.climbSpeed";
      if (l.includes("climb power")) return "climbingModule.maxPower";
      if (l.includes("sideways climb") || l.includes("horizontal climb")) return "climbingModule.horizontalClimbMultiplier";
      if (l.includes("adhesion")) return "climbingModule.wallAdhesionRange";
      if (l.includes("laser max power") || l.includes("power rating")) return "laserModule.maxPower";
      if (l.includes("beam range") || l.includes("laser range")) return "laserModule.maxRange";
      if (l.includes("beam damage") || l.includes("laser damage")) return "laserModule.damageRate";
      if (l.includes("beam width") || l.includes("beam thickness") || l.includes("laser thickness")) return "laserModule.thickness";
      if (l.includes("punch force") || l.includes("attack force")) return "meleeModule.impactForce";
      if (l.includes("attack power") || l.includes("punch power") || l.includes("melee max power")) return "meleeModule.maxPower";
      if (l.includes("punch freq") || l.includes("attack freq")) return "meleeModule.punchFrequency";
      if (l.includes("punch reach") || l.includes("attack reach")) return "meleeModule.reach";
      if (l.includes("attack width") || l.includes("punch width")) return "meleeModule.width";
      if (l.includes("current hp") || l.includes("current health")) return "healthModule.currentHp";
      if (l.includes("max hp") || l.includes("max health")) return "healthModule.maxHp";
      if (l.includes("heal rate") || l.includes("natural heal")) return "healthModule.naturalHealRate";
      if (l.includes("health power") || l.includes("heal power")) return "healthModule.maxPower";
      if (l.includes("energy cost per hp") || l.includes("joules/hp") || l.includes("joule per hp") || l.includes("hp per joule")) return "healthModule.joulesPerHp";
      if (l.includes("current stamina")) return "energyPool.currentStamina";
      if (l.includes("stamina cap")) return "energyPool.staminaCapacity";
      if (l.includes("stamina regen")) return "energyPool.staminaRegenRate";
      if (l.includes("current energy")) return "energyPool.currentEnergy";
      if (l.includes("energy capacity") || l.includes("calorie")) return "energyPool.energyPoolCapacity";
      if (l.includes("max power out")) return "energyPool.maxPowerOutput";
      if (l.includes("muscle") || l.includes("metabolic eff")) return "energyPool.muscleEfficiency";
      if (l.includes("edge assist") || l.includes("hang radius")) return "wallEdgeAssistModule.hangDistance";
      if (l.includes("mass")) return "mass";
      if (l.includes("strength")) return "strength";
      if (l.includes("collider radius")) return "colliderRadius";
      if (l.includes("friction")) return "friction";
      if (l.includes("bounciness") || l.includes("restitution")) return "restitution";
      if (l.includes("roll resist")) return "rollResistance";
    }
    return label || "prop";
  }
  static buildSinglePropertyPlayerDelta(propKey, value) {
    const norm = (propKey || "").trim();
    let canonical = norm;
    const aliasMap = {
      walkInAir: "walkingModule.walkInAir",
      "Air Control (Walk in Air)": "walkingModule.walkInAir",
      canSprint: "walkingModule.canSprint",
      "Can Sprint": "walkingModule.canSprint",
      "Can Sprint (Shift / Gamepad)": "walkingModule.canSprint",
      walkConsumesEnergy: "walkingModule.walkConsumesEnergy",
      "Walk Consumes Energy": "walkingModule.walkConsumesEnergy",
      walkAllowPartialPower: "walkingModule.walkAllowPartialPower",
      sprintConsumesEnergy: "walkingModule.sprintConsumesEnergy",
      "Sprint Consumes Energy": "walkingModule.sprintConsumesEnergy",
      sprintAllowPartialPower: "walkingModule.sprintAllowPartialPower",
      maxWalkForce: "walkingModule.maxWalkForce",
      walkForce: "walkingModule.maxWalkForce",
      "Max Walk Force (N)": "walkingModule.maxWalkForce",
      maxWalkSpeed: "walkingModule.maxWalkSpeed",
      walkSpeed: "walkingModule.maxWalkSpeed",
      "Max Walk Speed (u/s)": "walkingModule.maxWalkSpeed",
      sprintSpeed: "walkingModule.sprintSpeed",
      maxSprintSpeed: "walkingModule.sprintSpeed",
      "Max Sprint Speed (u/s)": "walkingModule.sprintSpeed",
      walkPowerCapacity: "walkingModule.maxWalkPower",
      maxWalkPower: "walkingModule.maxWalkPower",
      "Max Walk Power (Watts)": "walkingModule.maxWalkPower",
      sprintPowerCapacity: "walkingModule.maxSprintPower",
      maxSprintPower: "walkingModule.maxSprintPower",
      "Max Sprint Power (Watts)": "walkingModule.maxSprintPower",
      airFriction: "walkingModule.airFriction",
      jumpImpulse: "jumpModule.jumpImpulse",
      jumpStrength: "jumpModule.jumpImpulse",
      "Jump Impulse (N·s)": "jumpModule.jumpImpulse",
      "Jump Strength (N·s)": "jumpModule.jumpImpulse",
      maxInitialSpeed: "jumpModule.maxInitialSpeed",
      "Max Takeoff Speed (u/s)": "jumpModule.maxInitialSpeed",
      jumpPowerCapacity: "jumpModule.jumpPowerCapacity",
      maxJumpPower: "jumpModule.jumpPowerCapacity",
      "Max Jump Power (Watts)": "jumpModule.jumpPowerCapacity",
      jumpConsumesEnergy: "jumpModule.jumpConsumesEnergy",
      jumpAllowPartialPower: "jumpModule.jumpAllowPartialPower",
      throwForce: "throwModule.maxThrowSpeed",
      maxThrowSpeed: "throwModule.maxThrowSpeed",
      "Max Throw Speed (u/s)": "throwModule.maxThrowSpeed",
      maxThrowHeight: "throwModule.maxThrowHeight",
      "Max Throw Height (u)": "throwModule.maxThrowHeight",
      throwPowerCapacity: "throwModule.throwPowerCapacity",
      maxPower: "throwModule.throwPowerCapacity",
      maxThrowPower: "throwModule.throwPowerCapacity",
      throwWattage: "throwModule.throwPowerCapacity",
      "Max Throw Power (Watts)": "throwModule.throwPowerCapacity",
      throwConsumesEnergy: "throwModule.consumesEnergy",
      pickupReach: "pickupModule.pickupReach",
      "Pickup Reach (3D) (u)": "pickupModule.pickupReach",
      maxPickupPower: "pickupModule.maxPower",
      pickupPowerCapacity: "pickupModule.maxPower",
      "Max Pickup Power (Watts)": "pickupModule.maxPower",
      pickupConsumesEnergy: "pickupModule.consumesEnergy",
      pickupAllowPartialPower: "pickupModule.allowPartialPower",
      climbSpeed: "climbingModule.climbSpeed",
      "Max Climb Speed (u/s)": "climbingModule.climbSpeed",
      climbPowerCapacity: "climbingModule.maxPower",
      maxClimbPower: "climbingModule.maxPower",
      "Max Climb Power (Watts)": "climbingModule.maxPower",
      climbConsumesEnergy: "climbingModule.consumesEnergy",
      climbAllowPartialPower: "climbingModule.allowPartialPower",
      horizontalClimbMultiplier: "climbingModule.horizontalClimbMultiplier",
      wallAdhesionRange: "climbingModule.wallAdhesionRange",
      maxHp: "healthModule.maxHp",
      "Max Health (HP)": "healthModule.maxHp",
      naturalHealRate: "healthModule.naturalHealRate",
      "Natural Heal Rate (HP/s)": "healthModule.naturalHealRate",
      healthMaxPower: "healthModule.maxPower",
      healthConsumesEnergy: "healthModule.consumesEnergy",
      healthAllowPartialPower: "healthModule.allowPartialPower",
      joulesPerHp: "healthModule.joulesPerHp",
      "Energy Cost per HP (Joules/HP)": "healthModule.joulesPerHp",
      hpPerJoule: "healthModule.joulesPerHp",
      "Healing Efficiency (HP/Joule)": "healthModule.joulesPerHp",
      laserMaxPower: "laserModule.maxPower",
      laserPowerCapacity: "laserModule.maxPower",
      laserMaxRange: "laserModule.maxRange",
      laserDamageRate: "laserModule.damageRate",
      laserThickness: "laserModule.thickness",
      laserAllowPartialPower: "laserModule.allowPartialPower",
      meleeImpactForce: "meleeModule.impactForce",
      meleeMaxPower: "meleeModule.maxPower",
      meleePunchFrequency: "meleeModule.punchFrequency",
      meleeReach: "meleeModule.reach",
      meleeWidth: "meleeModule.width",
      meleeAllowPartialPower: "meleeModule.allowPartialPower",
      currentHp: "healthModule.currentHp",
      "Current Health (HP)": "healthModule.currentHp",
      currentStamina: "energyPool.currentStamina",
      "Current Stamina (Joules)": "energyPool.currentStamina",
      "Current Stamina (J)": "energyPool.currentStamina",
      staminaCapacity: "energyPool.staminaCapacity",
      "Stamina Capacity (J)": "energyPool.staminaCapacity",
      staminaRegenRate: "energyPool.staminaRegenRate",
      "Stamina Regen Rate (W)": "energyPool.staminaRegenRate",
      currentEnergy: "energyPool.currentEnergy",
      "Current Energy (J)": "energyPool.currentEnergy",
      energyPoolCapacity: "energyPool.energyPoolCapacity",
      "Energy Pool (Calorie) Capacity (J)": "energyPool.energyPoolCapacity",
      maxPowerOutput: "energyPool.maxPowerOutput",
      muscleEfficiency: "energyPool.muscleEfficiency",
      "Muscle Metabolic Efficiency (Ratio)": "energyPool.muscleEfficiency",
      assistRadius: "wallEdgeAssistModule.hangDistance",
      hangDistance: "wallEdgeAssistModule.hangDistance",
      "Edge Assist Radius (u)": "wallEdgeAssistModule.hangDistance"
    };
    if (aliasMap[norm]) {
      canonical = aliasMap[norm];
    }
    const res = {};
    if (canonical.includes(".")) {
      PlayerDeltaBuilder.setNestedProperty(res, canonical, value);
    } else {
      res[canonical] = value;
    }
    return res;
  }
}
class DevConfigPersistence {
  static async saveIndividualProperty(panel, owner, prop, value, label) {
    if (panel.isOnlineLocked) {
      panel.showSaveToast("🔒 DevTools save disabled in online mode", true);
      return;
    }
    const objects2 = panel.objects;
    const dirtyState = panel.dirtyState;
    const getAllCharacters = panel.getAllCharacters;
    const canonicalPath = PlayerDeltaBuilder.resolvePropertyPath(owner, prop, label);
    const isChar = owner instanceof Character || owner.isCharacter;
    if (isChar) {
      const char = owner;
      const playerPrefab = prefabManager.get("prefab_player");
      if (playerPrefab) {
        playerPrefab.setProperty(canonicalPath, value, getAllCharacters ? getAllCharacters() : [char]);
      }
      const playerDelta = PlayerDeltaBuilder.buildSinglePropertyPlayerDelta(canonicalPath, value);
      const delta = {
        clientVersion: panel.currentConfigVersion,
        sections: ["player"],
        player: playerDelta
      };
      const resp = await fetch("/api/dev/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(delta)
      });
      if (!resp.ok) {
        throw new Error(`Server returned ${resp.status}`);
      }
      const res = await resp.json();
      panel.currentConfigVersion = res.version ?? panel.currentConfigVersion + 1;
      dirtyState.player = false;
      panel.updateDirtyBadge();
      panel.showSaveToast(`💾 Saved ${label || canonicalPath}: ${Number(value.toFixed(2))} to Player Prefab & Config`);
    } else {
      let affectedObjects = [owner];
      let prefabsUpsert = void 0;
      const sections = ["objects"];
      if (owner.prefabId) {
        const prefab = prefabManager.get(owner.prefabId);
        if (prefab) {
          prefab.setProperty(canonicalPath, value, objects2);
          prefabsUpsert = [serializePrefab(prefab)];
          sections.push("prefabs");
          affectedObjects = objects2.filter((o) => o.prefabId === owner.prefabId && !o.overriddenProperties.has(canonicalPath));
          if (!affectedObjects.includes(owner)) affectedObjects.push(owner);
        }
      }
      const delta = {
        clientVersion: panel.currentConfigVersion,
        sections,
        objectsDelta: {
          upsert: affectedObjects.map(serializeGameObject)
        },
        prefabsDelta: prefabsUpsert ? { upsert: prefabsUpsert } : void 0
      };
      const resp = await fetch("/api/dev/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(delta)
      });
      if (!resp.ok) {
        throw new Error(`Server returned ${resp.status}`);
      }
      const res = await resp.json();
      panel.currentConfigVersion = res.version ?? panel.currentConfigVersion + 1;
      for (const obj of affectedObjects) {
        dirtyState.modifiedObjects.delete(obj.id);
      }
      panel.updateDirtyBadge();
      const instanceText = affectedObjects.length > 1 ? ` (${affectedObjects.length} instances)` : "";
      panel.showSaveToast(`💾 Saved ${label || canonicalPath}: ${Number(value.toFixed(2))} to ${owner.name}${owner.prefabId ? " Prefab & Scene" : ""}${instanceText}`);
    }
  }
  static async saveIndividualToggle(panel, owner, keyPath, value, label, saveBtn) {
    if (panel.isOnlineLocked) {
      panel.showSaveToast("🔒 DevTools save disabled in online mode", true);
      return;
    }
    const objects2 = panel.objects;
    const dirtyState = panel.dirtyState;
    const getAllCharacters = panel.getAllCharacters;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.style.opacity = "0.5";
    }
    try {
      const isChar = owner instanceof Character || owner.isCharacter;
      if (isChar) {
        const char = owner;
        const playerPrefab = prefabManager.get("prefab_player");
        if (playerPrefab) {
          playerPrefab.setProperty(keyPath, value, getAllCharacters ? getAllCharacters() : [char]);
        }
        const playerDelta = PlayerDeltaBuilder.buildSinglePropertyPlayerDelta(keyPath, value);
        const delta = {
          clientVersion: panel.currentConfigVersion,
          sections: ["player"],
          player: playerDelta
        };
        const resp = await fetch("/api/dev/save-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(delta)
        });
        if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
        const res = await resp.json();
        panel.currentConfigVersion = res.version ?? panel.currentConfigVersion + 1;
        dirtyState.player = false;
        panel.updateDirtyBadge();
        panel.showSaveToast(`💾 Saved ${label}: ${value ? "ON" : "OFF"} to Player Prefab & Config`);
      } else {
        let affectedObjects = [owner];
        let prefabsUpsert = void 0;
        const sections = ["objects"];
        if (owner.prefabId) {
          const prefab = prefabManager.get(owner.prefabId);
          if (prefab) {
            prefab.setProperty(keyPath, value, objects2);
            prefabsUpsert = [serializePrefab(prefab)];
            sections.push("prefabs");
            affectedObjects = objects2.filter((o) => o.prefabId === owner.prefabId && !o.overriddenProperties.has(keyPath));
            if (!affectedObjects.includes(owner)) affectedObjects.push(owner);
          }
        }
        const delta = {
          clientVersion: panel.currentConfigVersion,
          sections,
          objectsDelta: {
            upsert: affectedObjects.map(serializeGameObject)
          },
          prefabsDelta: prefabsUpsert ? { upsert: prefabsUpsert } : void 0
        };
        const resp = await fetch("/api/dev/save-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(delta)
        });
        if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
        const res = await resp.json();
        panel.currentConfigVersion = res.version ?? panel.currentConfigVersion + 1;
        for (const obj of affectedObjects) {
          dirtyState.modifiedObjects.delete(obj.id);
        }
        panel.updateDirtyBadge();
        const instanceText = affectedObjects.length > 1 ? ` (${affectedObjects.length} instances)` : "";
        panel.showSaveToast(`💾 Saved ${label}: ${value ? "ON" : "OFF"} to ${owner.name}${owner.prefabId ? " Prefab & Scene" : ""}${instanceText}`);
      }
    } catch (err) {
      console.error(`Failed to save toggle ${label}:`, err);
      panel.showSaveToast(`❌ Failed to save ${label}: ${err.message || err}`, true);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.style.opacity = "1";
      }
    }
  }
  static async savePrefabProperty(panel, prefab, propKey, value, label) {
    if (panel.isOnlineLocked) {
      panel.showSaveToast("🔒 DevTools save disabled in online mode", true);
      return;
    }
    const objects2 = panel.objects;
    const dirtyState = panel.dirtyState;
    prefab.setProperty(propKey, value, objects2);
    const affectedObjects = objects2.filter((o) => o.prefabId === prefab.id && !o.overriddenProperties.has(propKey));
    const delta = {
      clientVersion: panel.currentConfigVersion,
      sections: ["prefabs", "objects"],
      prefabsDelta: {
        upsert: [serializePrefab(prefab)]
      },
      objectsDelta: {
        upsert: affectedObjects.map(serializeGameObject)
      }
    };
    const resp = await fetch("/api/dev/save-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(delta)
    });
    if (!resp.ok) {
      throw new Error(`Server returned ${resp.status}`);
    }
    const res = await resp.json();
    panel.currentConfigVersion = res.version ?? panel.currentConfigVersion + 1;
    for (const obj of affectedObjects) {
      dirtyState.modifiedObjects.delete(obj.id);
    }
    panel.updateDirtyBadge();
    const valDisplay = typeof value === "number" ? Number(value.toFixed(2)) : value;
    panel.showSaveToast(`💾 Saved ${label || propKey}: ${valDisplay} to ${prefab.name} Prefab & ${affectedObjects.length} live instance${affectedObjects.length === 1 ? "" : "s"}`);
  }
  static async savePrefab(panel, prefab) {
    if (panel.isOnlineLocked) {
      panel.showSaveToast("🔒 DevTools save disabled in online mode", true);
      return;
    }
    const objects2 = panel.objects;
    const dirtyState = panel.dirtyState;
    const affectedObjects = objects2.filter((o) => o.prefabId === prefab.id);
    const delta = {
      clientVersion: panel.currentConfigVersion,
      sections: ["prefabs", "objects"],
      prefabsDelta: {
        upsert: [serializePrefab(prefab)]
      },
      objectsDelta: {
        upsert: affectedObjects.map(serializeGameObject)
      }
    };
    const resp = await fetch("/api/dev/save-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(delta)
    });
    if (!resp.ok) {
      throw new Error(`Server returned ${resp.status}`);
    }
    const res = await resp.json();
    panel.currentConfigVersion = res.version ?? panel.currentConfigVersion + 1;
    for (const obj of affectedObjects) {
      dirtyState.modifiedObjects.delete(obj.id);
    }
    panel.updateDirtyBadge();
    panel.showSaveToast(`💾 Saved ${prefab.name} Prefab to Project & ${affectedObjects.length} live instances`);
  }
  static async saveControlSchema(panel, char, schema) {
    var _a;
    if (panel == null ? void 0 : panel.isOnlineLocked) {
      panel == null ? void 0 : panel.showSaveToast("🔒 DevTools save disabled in online mode", true);
      return;
    }
    char.controlSchema = JSON.parse(JSON.stringify(schema));
    const sections = [];
    const clientVersion = (panel == null ? void 0 : panel.currentConfigVersion) ?? 1;
    const delta = {
      clientVersion,
      sections
    };
    const targetPrefabId = char.prefabId || "prefab_player";
    const prefab = prefabManager.get(targetPrefabId);
    if (prefab) {
      prefab.controlSchema = JSON.parse(JSON.stringify(schema));
      if (prefab.archetype instanceof Character) {
        prefab.archetype.controlSchema = JSON.parse(JSON.stringify(schema));
      }
      if (panel) {
        for (const ent of panel.getActiveCharacters()) {
          if (ent.prefabId === targetPrefabId || !ent.prefabId && targetPrefabId === "prefab_player") {
            ent.controlSchema = JSON.parse(JSON.stringify(schema));
          }
        }
      }
      sections.push("prefabs");
      delta.prefabsDelta = {
        upsert: [serializePrefab(prefab)]
      };
    }
    sections.push("player");
    delta.player = {
      controlSchema: JSON.parse(JSON.stringify(schema))
    };
    const resp = await fetch("/api/dev/save-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(delta)
    });
    if (!resp.ok) {
      throw new Error(`Server returned status ${resp.status}`);
    }
    const res = await resp.json();
    if (panel) {
      panel.currentConfigVersion = res.version ?? clientVersion + 1;
      (_a = panel.updateDirtyBadge) == null ? void 0 : _a.call(panel);
      panel.showSaveToast(`💾 Saved & persisted controls for ${char.name || "Character"}${prefab ? ` to ${prefab.name} Prefab` : ""}!`);
    }
  }
  static async saveProjectConfig(panel) {
    if (panel.isOnlineLocked) {
      panel.showSaveToast("🔒 DevTools save disabled in online mode", true);
      return;
    }
    const container = panel.container;
    const arena2 = panel.arena;
    const dirtyState = panel.dirtyState;
    const sections = [];
    if (dirtyState.globalPhysics) sections.push("globalPhysics");
    if (dirtyState.arena) sections.push("arena");
    if (dirtyState.spawners) sections.push("spawners");
    if (sections.length === 0) {
      sections.push("arena", "globalPhysics", "spawners");
    }
    const delta = {
      clientVersion: panel.currentConfigVersion,
      sections,
      spawners: sceneSpawnerManager.getAll().map((s) => ({
        id: s.id,
        name: s.name,
        enabled: s.enabled,
        prefabId: s.prefabId,
        intervalMinutes: s.intervalMinutes,
        maxCount: s.maxCount,
        designatedSpawnPoints: s.designatedSpawnPoints ? [...s.designatedSpawnPoints] : []
      }))
    };
    if (sections.includes("globalPhysics")) {
      delta.globalPhysics = {
        gravity: arena2.gravity,
        collisionDamageScale: GameObject.globalWorldCollisionDamageScale ?? 1
      };
    }
    if (sections.includes("arena")) {
      const tileGrid = [];
      for (let r = 0; r < arena2.rows; r++) {
        tileGrid.push([...arena2.tileGrid[r]]);
      }
      delta.arena = {
        width: arena2.width,
        height: arena2.height,
        wallHeight: arena2.wallHeight,
        presetId: arena2.currentPresetId,
        tileGrid
      };
    }
    const btn = container.querySelector("#btn-save-project-config");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "💾 Saving...";
    }
    try {
      const resp = await fetch("/api/dev/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(delta)
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || `Server responded with status ${resp.status}`);
      }
      const res = await resp.json();
      panel.currentConfigVersion = res.version ?? panel.currentConfigVersion + 1;
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
      panel.showSaveToast(`💾 Saved Physics, Arena & Spawners to project! (v${panel.currentConfigVersion})`);
    } catch (err) {
      console.error("Failed to save project config:", err);
      panel.showSaveToast(`❌ Failed to save: ${err.message || String(err)}`, true);
      alert("Failed to save project configuration:\n" + (err.message || String(err)));
      if (btn) {
        btn.disabled = false;
        btn.textContent = "💾 Save Physics, Arena & Spawners";
      }
    }
  }
  static async pushDataToGit(panel) {
    if (panel.isOnlineLocked) {
      panel.showSaveToast("🔒 Git operations disabled in online mode", true);
      return;
    }
    try {
      panel.showSaveToast("⏳ Pushing data changes to GitHub...");
      const resp = await fetch("/api/dev/git-push-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || `Server responded with status ${resp.status}`);
      }
      const res = await resp.json();
      panel.showSaveToast(`✅ Data pushed to GitHub! (${res.commitSha || "synced"})`);
    } catch (err) {
      console.error("Failed to push data to git:", err);
      panel.showSaveToast(`❌ Failed to push: ${err.message || String(err)}`, true);
      alert("Failed to push data to GitHub:\n" + (err.message || String(err)));
    }
  }
  static async reloadFromDisk(panel) {
    const container = panel.container;
    const arena2 = panel.arena;
    const objects2 = panel.objects;
    const dirtyState = panel.dirtyState;
    const getAllCharacters = panel.getAllCharacters;
    const character = panel.character;
    const getGameLoop = panel.getGameLoop;
    try {
      const resp = await fetch("/api/dev/world-config");
      if (!resp.ok) {
        throw new Error(`Failed to fetch world-config: ${resp.status}`);
      }
      const config = await resp.json();
      if (config.arena) {
        arena2.setStandardWallHeight(config.arena.wallHeight);
        if (config.arena.tileGrid && config.arena.tileGrid.length > 0) {
          arena2.tileGrid = config.arena.tileGrid.map((row) => [...row]);
          arena2.rebuildWalls();
        } else if (config.arena.presetId) {
          const chars2 = getAllCharacters ? getAllCharacters() : character ? [character] : [];
          arena2.loadWallPreset(config.arena.presetId, [...chars2, ...objects2]);
        }
        const chars = getAllCharacters ? getAllCharacters() : character ? [character] : [];
        arena2.syncEntitiesWithWalls([...chars, ...objects2]);
        panel.updateWallPresetUI();
      }
      if (config.globalPhysics) {
        arena2.gravity = config.globalPhysics.gravity;
        GameObject.globalWorldCollisionDamageScale = config.globalPhysics.collisionDamageScale;
        const loop = getGameLoop ? getGameLoop() : null;
        if (loop) {
          loop.worldCollisionDamageScale = config.globalPhysics.collisionDamageScale;
        }
      }
      if (config.objects) {
        panel.onClearObjects();
        for (const ser of config.objects) {
          const obj = deserializeGameObject(ser);
          panel.onSpawnObject(obj);
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
      panel.currentConfigVersion = config.version;
      dirtyState.arena = false;
      dirtyState.globalPhysics = false;
      dirtyState.spawners = false;
      dirtyState.modifiedObjects.clear();
      dirtyState.deletedObjectIds.clear();
      panel.updateDirtyBadge();
      panel.updateSelectorOptions();
      panel.renderEntityModules();
      panel.syncEntitySliders();
      panel.updateInspector();
      const popover = container.querySelector("#save-options-popover");
      if (popover) popover.style.display = "none";
    } catch (err) {
      console.error("Failed to reload config from disk:", err);
      alert("Failed to reload from disk:\n" + (err.message || String(err)));
    }
  }
}
const _ControlsInspector = class _ControlsInspector {
  // --- Public API ---
  static isWindowOpen() {
    return Boolean(this.popoutWindow && !this.popoutWindow.closed);
  }
  static isModalOpen() {
    return Boolean(this.modalOverlay && document.body.contains(this.modalOverlay));
  }
  static ensureChannels(schema) {
    if (!schema) return;
    if (!schema.keyboardMouse.blocks) {
      schema.keyboardMouse.blocks = JSON.parse(JSON.stringify(DefaultControlBlocks));
    }
    if (!schema.gamepad.blocks) {
      schema.gamepad.blocks = JSON.parse(JSON.stringify(DefaultGamepadControlBlocks));
    }
    if (!schema.keyboardMouse.pipeline) {
      schema.keyboardMouse.pipeline = JSON.parse(JSON.stringify(DefaultPipelineBindings));
    }
    if (!schema.pipeline) {
      schema.pipeline = schema.keyboardMouse.pipeline;
    }
    if (!schema.keyboardMouse.channels) {
      schema.keyboardMouse.channels = JSON.parse(JSON.stringify(DefaultPrebuiltChannels));
    }
    const migratePipeline = (pl) => {
      if (!Array.isArray(pl)) return;
      for (const b of pl) {
        if (b && b.source && b.source.chordModifiers && Array.isArray(b.source.chordModifiers)) {
          const chords = b.source.chordModifiers;
          if (chords.length > 0) {
            if (!b.source.additionalCodes) b.source.additionalCodes = [];
            for (const c of chords) {
              if (c && !b.source.additionalCodes.includes(c)) {
                b.source.additionalCodes.push(c);
              }
            }
          }
          delete b.source.chordModifiers;
        }
      }
    };
    if (schema.keyboardMouse.pipeline) migratePipeline(schema.keyboardMouse.pipeline);
    if (schema.pipeline) migratePipeline(schema.pipeline);
  }
  static getActiveBlocks(schema) {
    if (this.activeTab === "gamepad") {
      if (!schema.gamepad.blocks) {
        schema.gamepad.blocks = JSON.parse(JSON.stringify(DefaultGamepadControlBlocks));
      }
      return schema.gamepad.blocks;
    }
    if (!schema.keyboardMouse.blocks) {
      schema.keyboardMouse.blocks = JSON.parse(JSON.stringify(DefaultControlBlocks));
    }
    return schema.keyboardMouse.blocks;
  }
  static ensureSchemaTags(schema) {
    if (!schema) return;
    this.ensureChannels(schema);
    if (!schema.keyboardMouse.tags) {
      schema.keyboardMouse.tags = [];
    }
    schema.keyboardMouse.tags = schema.keyboardMouse.tags.filter(
      (t) => t.trigger.code !== "Always" && t.trigger.code !== "None" && Boolean(t.trigger.code)
    );
    const kTags = schema.keyboardMouse.tags;
    if (kTags.length === 0) {
      kTags.push({
        id: "tag-kbm-action",
        name: "Action",
        trigger: { device: "mouse", code: "MouseRight", mode: "hold" }
      });
    }
    for (const rule of schema.keyboardMouse.rules) {
      if (rule.trigger.code === "Always" || rule.trigger.code === "None" || !rule.trigger.code) {
        rule.tagId = void 0;
        continue;
      }
      if (!rule.tagId) {
        let matchingTag = kTags.find(
          (t) => {
            var _a, _b;
            return t.trigger.code === rule.trigger.code && t.trigger.device === rule.trigger.device && (((_a = t.trigger.chordModifiers) == null ? void 0 : _a.join(",")) ?? "") === (((_b = rule.trigger.chordModifiers) == null ? void 0 : _b.join(",")) ?? "");
          }
        );
        if (!matchingTag) {
          const tagId = "tag-kbm-" + Math.random().toString(36).substring(2, 8);
          matchingTag = {
            id: tagId,
            name: rule.name ? rule.name.replace(/\s*\(.*\)/, "").trim() : `${rule.trigger.code}`,
            trigger: {
              device: rule.trigger.device,
              code: rule.trigger.code,
              chordModifiers: rule.trigger.chordModifiers ? [...rule.trigger.chordModifiers] : void 0,
              mode: rule.trigger.mode ?? "press"
            }
          };
          kTags.push(matchingTag);
        }
        rule.tagId = matchingTag.id;
      }
    }
    if (!schema.gamepad.tags) {
      schema.gamepad.tags = [];
    }
    schema.gamepad.tags = schema.gamepad.tags.filter(
      (t) => t.trigger.code !== "Always" && t.trigger.code !== "None" && Boolean(t.trigger.code)
    );
    const gpTags = schema.gamepad.tags;
    if (gpTags.length === 0) {
      gpTags.push({
        id: "tag-pad-action",
        name: "Action",
        trigger: { device: "gamepad", code: "GamepadRT", mode: "hold" }
      });
    }
    for (const rule of schema.gamepad.rules) {
      if (rule.trigger.code === "Always" || rule.trigger.code === "None" || !rule.trigger.code) {
        rule.tagId = void 0;
        continue;
      }
      if (!rule.tagId) {
        let matchingTag = gpTags.find((t) => t.trigger.code === rule.trigger.code);
        if (!matchingTag) {
          const tagId = "tag-pad-" + Math.random().toString(36).substring(2, 8);
          matchingTag = {
            id: tagId,
            name: rule.name ? rule.name.replace(/\s*\(.*\)/, "").trim() : `${rule.trigger.code}`,
            trigger: {
              device: "gamepad",
              code: rule.trigger.code,
              mode: rule.trigger.mode ?? "press"
            }
          };
          gpTags.push(matchingTag);
        }
        rule.tagId = matchingTag.id;
      }
    }
    if (!schema.touch.tags) {
      schema.touch.tags = [];
    }
  }
  static getActiveDeviceTags(schema) {
    if (this.activeTab === "keyboardMouse") {
      if (!schema.keyboardMouse.tags) schema.keyboardMouse.tags = [];
      return schema.keyboardMouse.tags;
    }
    if (this.activeTab === "gamepad") {
      if (!schema.gamepad.tags) schema.gamepad.tags = [];
      return schema.gamepad.tags;
    }
    if (!schema.touch.tags) schema.touch.tags = [];
    return schema.touch.tags;
  }
  static getActiveSchema(char) {
    const prefabId = char.prefabId || "prefab_player";
    const prefab = prefabManager.get(prefabId);
    if (prefab == null ? void 0 : prefab.controlSchema) {
      char.controlSchema = prefab.controlSchema;
      this.ensureSchemaTags(char.controlSchema);
      return char.controlSchema;
    }
    if (char.controlSchema) {
      this.ensureSchemaTags(char.controlSchema);
      return char.controlSchema;
    }
    char.controlSchema = JSON.parse(JSON.stringify(DefaultControlSchema));
    this.ensureSchemaTags(char.controlSchema);
    return char.controlSchema;
  }
  static setActiveSchema(char, schema) {
    const copy = JSON.parse(JSON.stringify(schema));
    char.controlSchema = copy;
    const targetPrefabId = char.prefabId || "prefab_player";
    const prefab = prefabManager.get(targetPrefabId);
    if (prefab) {
      prefab.controlSchema = copy;
      if (prefab.archetype instanceof Character) {
        prefab.archetype.controlSchema = copy;
      }
    }
    if (this.modalPanel) {
      for (const ent of this.modalPanel.getActiveCharacters()) {
        if (ent.prefabId === targetPrefabId || !ent.prefabId && targetPrefabId === "prefab_player") {
          ent.controlSchema = copy;
        }
      }
    }
  }
  static syncLiveWorkingSchema() {
    if (!this.modalChar || !this.workingSchema) return;
    const schemaCopy = JSON.parse(JSON.stringify(this.workingSchema));
    this.modalChar.controlSchema = schemaCopy;
    const targetPrefabId = this.modalChar.prefabId || "prefab_player";
    const prefab = prefabManager.get(targetPrefabId);
    if (prefab) {
      prefab.controlSchema = schemaCopy;
      if (prefab.archetype instanceof Character) {
        prefab.archetype.controlSchema = schemaCopy;
      }
    }
    if (this.modalPanel) {
      for (const ent of this.modalPanel.getActiveCharacters()) {
        if (ent.prefabId === targetPrefabId || !ent.prefabId && targetPrefabId === "prefab_player") {
          ent.controlSchema = schemaCopy;
        }
      }
    }
  }
  static notifyRuleFired(ruleId) {
    if (this.popoutWindow && !this.popoutWindow.closed) {
      const doc = this.popoutWindow.document;
      const card = doc.getElementById(`rule-card-${ruleId}`);
      if (card) {
        card.style.borderColor = "#38bdf8";
        card.style.boxShadow = "0 0 12px rgba(56, 189, 248, 0.8)";
        setTimeout(() => {
          if (card) {
            card.style.borderColor = "rgba(255, 255, 255, 0.08)";
            card.style.boxShadow = "none";
          }
        }, 150);
      }
    }
    if (this.modalOverlay) {
      const card = this.modalOverlay.querySelector(`#rule-card-${ruleId}`);
      if (card) {
        card.style.borderColor = "#38bdf8";
        card.style.boxShadow = "0 0 12px rgba(56, 189, 248, 0.8)";
        setTimeout(() => {
          if (card) {
            card.style.borderColor = "rgba(255, 255, 255, 0.08)";
            card.style.boxShadow = "none";
          }
        }, 150);
      }
    }
  }
  static updateLiveDiagnostics(char, ctx) {
    const isPopoutActive = Boolean(this.popoutWindow && !this.popoutWindow.closed);
    const isModalActive = this.isModalOpen();
    if (!isPopoutActive && !isModalActive) return;
    if (this.modalChar !== char || !this.workingSchema) return;
    const rules = this.activeTab === "keyboardMouse" ? this.workingSchema.keyboardMouse.rules : this.activeTab === "gamepad" ? this.workingSchema.gamepad.rules : this.workingSchema.touch.rules;
    const effectiveCtx = ctx ?? {
      character: char,
      dt: 1 / 60,
      isHoldingItem: Boolean(char.heldObject),
      heldItemIsEdible: Boolean(char.canConsumeHeldObject()),
      heldItemHasPrimaryAbility: Boolean(char.hasPrimaryItemAbility()),
      targetInReach: null,
      isGrounded: Boolean(char.isRestingOnSurface),
      isClimbing: Boolean(char.isClimbing),
      stagedAction: char.stagedAction,
      facingAngle: char.facingAngle ?? 0,
      mouseAimPos: { x: 0, y: 0 },
      reticleAimPos: { x: 0, y: 0 },
      isKeyDown: () => false,
      isMouseButtonDown: () => false,
      isGamepadButtonDown: () => false,
      getGamepadAxis: () => ({ x: 0, y: 0 }),
      schema: this.workingSchema
    };
    const checkRules = (ruleList) => {
      for (const rule of ruleList) {
        const match = ControlSchemaArbiter.evaluateAllConditions(rule, effectiveCtx);
        if (isPopoutActive) {
          const pip = this.popoutWindow.document.getElementById(`pip-${rule.id}`);
          if (pip) {
            pip.style.background = match ? "#10b981" : "#475569";
            pip.style.boxShadow = match ? "0 0 6px rgba(16, 185, 129, 0.85)" : "none";
          }
        }
        if (isModalActive && this.modalOverlay) {
          const pip = this.modalOverlay.querySelector(`#pip-${rule.id}`);
          if (pip) {
            pip.style.background = match ? "#10b981" : "#475569";
            pip.style.boxShadow = match ? "0 0 6px rgba(16, 185, 129, 0.85)" : "none";
          }
        }
        for (const stmt of ControlSchemaArbiter.getRuleBody(rule)) {
          if (stmt.type === "nestedThread") {
            checkRules(stmt.rules);
          }
        }
      }
    };
    checkRules(rules);
  }
  // --- Window / Modal Open & Lifecycle ---
  static getWindowName(char) {
    return "ControlsSchemaWindow_" + ((char == null ? void 0 : char.playerId) || "keyboard");
  }
  static openModal(panel, char) {
    this.openWindow(panel, char);
  }
  static openWindow(panel, char) {
    this.modalChar = char;
    this.modalPanel = panel;
    const schema = this.getActiveSchema(char);
    this.ensureChannels(schema);
    this.workingSchema = JSON.parse(JSON.stringify(schema));
    this.showJsonEditor = false;
    this.jsonErrorMessage = null;
    this.listeningRuleId = null;
    this.listeningForwardTrigger = false;
    this.listeningLocoKey = null;
    this.listeningBlockTarget = null;
    if (typeof document !== "undefined" && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {
      }
    }
    try {
      localStorage.setItem("pcg_controls_popout_open", "true");
    } catch {
    }
    if (this.popoutWindow && !this.popoutWindow.closed) {
      try {
        this.popoutWindow.document.title = `🎮 Controls Schema — ${char.name || "Character"}`;
        this.popoutWindow.focus();
        this.renderActiveView();
        return;
      } catch {
        this.popoutWindow = null;
      }
    }
    const width = 840;
    const height = 900;
    const left = Math.max(20, window.screenX + 30);
    const top = Math.max(20, window.screenY + 30);
    const windowFeatures = `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`;
    let popout = null;
    try {
      popout = window.open("", this.getWindowName(char), windowFeatures);
    } catch {
      popout = null;
    }
    if (popout && !popout.closed) {
      this.setupPopoutWindow(popout, char);
      return;
    }
    this.openInCanvasModal(panel, char);
  }
  static setupPopoutWindow(popout, char) {
    this.popoutWindow = popout;
    this.isParentReloading = false;
    this.lastRebindTime = Date.now();
    if (this.modalOverlay) {
      this.modalOverlay.remove();
      this.modalOverlay = null;
    }
    try {
      popout.document.open();
      popout.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>🎮 Controls Schema — ${char.name || "Character"}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: #090d16;
      color: #e2e8f0;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.6); }
    ::-webkit-scrollbar-thumb { background: #38bdf8; border-radius: 5px; }
    ::-webkit-scrollbar-thumb:hover { background: #7dd3fc; }
    .btn-secondary-action {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 5px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-secondary-action:hover {
      background: #334155;
      color: #f8fafc;
      border-color: rgba(255, 255, 255, 0.25);
    }
    .dev-select {
      background: #0f172a;
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 5px;
      padding: 4px 6px;
      outline: none;
    }
    .dev-select:focus {
      border-color: #38bdf8;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
</head>
<body>
  <div id="controls-window-root" style="flex: 1; display: flex; flex-direction: column; height: 100%; overflow: hidden;"></div>
  <script>
    (function() {
      function tryRebind() {
        try {
          if (window.opener && window.opener.ControlsInspector && typeof window.opener.ControlsInspector.rebindPopoutWindow === "function") {
            window.opener.ControlsInspector.rebindPopoutWindow(window);
            return true;
          }
        } catch(e) {}
        return false;
      }

      window.addEventListener("DOMContentLoaded", function() {
        setTimeout(tryRebind, 50);
      });

      setInterval(function() {
        try {
          if (!window.opener || window.opener.closed) return;
          if (window.__needsRebind && window.opener.ControlsInspector) {
            window.__needsRebind = false;
            tryRebind();
          }
        } catch(e) {}
      }, 250);
    })();
  <\/script>
</body>
</html>`);
      popout.document.close();
      document.querySelectorAll("link[rel='stylesheet'], style").forEach((tag) => {
        try {
          popout.document.head.appendChild(tag.cloneNode(true));
        } catch {
        }
      });
      popout.addEventListener("unload", () => {
        if (!_ControlsInspector.isParentReloading) {
          try {
            localStorage.removeItem("pcg_controls_popout_open");
          } catch {
          }
          _ControlsInspector.popoutWindow = null;
        }
      });
    } catch (e) {
      console.warn("Could not setup popout document:", e);
    }
    this.renderActiveView();
  }
  static restorePopoutIfPreviouslyOpen(panel, char) {
    let wasOpen = false;
    try {
      wasOpen = localStorage.getItem("pcg_controls_popout_open") === "true";
    } catch {
    }
    if (!wasOpen) return;
    this.modalChar = char;
    this.modalPanel = panel;
    const windowName = this.getWindowName(char);
    let popout = null;
    try {
      popout = window.open("", windowName);
    } catch {
      popout = null;
    }
    if (popout && !popout.closed) {
      const schema = this.getActiveSchema(char);
      this.ensureChannels(schema);
      this.workingSchema = JSON.parse(JSON.stringify(schema));
      this.setupPopoutWindow(popout, char);
    }
  }
  static rebindPopoutWindow(popout) {
    if (!popout || popout.closed) return;
    if (Date.now() - this.lastRebindTime < 350) return;
    this.lastRebindTime = Date.now();
    this.popoutWindow = popout;
    this.isParentReloading = false;
    if (!this.modalChar && window.character) {
      this.modalChar = window.character;
    }
    if (!this.modalPanel && window.devPanel) {
      this.modalPanel = window.devPanel;
    }
    if (this.modalChar) {
      const schema = this.getActiveSchema(this.modalChar);
      this.ensureChannels(schema);
      this.workingSchema = JSON.parse(JSON.stringify(schema));
      this.setupPopoutWindow(popout, this.modalChar);
    }
  }
  static openInCanvasModal(_panel, _char) {
    if (typeof document !== "undefined" && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {
      }
    }
    if (this.modalOverlay) {
      this.modalOverlay.remove();
    }
    const overlay = document.createElement("div");
    overlay.id = "controls-modal-overlay";
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(3, 7, 18, 0.80);
      backdrop-filter: blur(6px);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
      overflow: hidden;
      box-sizing: border-box;
    `;
    document.body.appendChild(overlay);
    this.modalOverlay = overlay;
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        this.closeModal();
      }
    };
    this.keydownListener = (e) => {
      if (e.code === "Escape") {
        if (this.listeningRuleId || this.listeningForwardTrigger) return;
        this.closeModal();
      }
    };
    window.addEventListener("keydown", this.keydownListener);
    this.renderActiveView();
  }
  static closeModal() {
    try {
      localStorage.removeItem("pcg_controls_popout_open");
    } catch {
    }
    if (this.recorderCleanup) {
      this.recorderCleanup();
      this.recorderCleanup = null;
    }
    if (this.keydownListener) {
      window.removeEventListener("keydown", this.keydownListener);
      this.keydownListener = null;
    }
    if (this.popoutWindow && !this.popoutWindow.closed) {
      this.popoutWindow.close();
      this.popoutWindow = null;
    }
    if (this.modalOverlay) {
      this.modalOverlay.remove();
      this.modalOverlay = null;
    }
    const popover = document.getElementById("action-picker-popover");
    if (popover) popover.remove();
    this.modalChar = null;
    this.modalPanel = null;
    this.workingSchema = null;
    this.listeningRuleId = null;
    this.listeningForwardTrigger = false;
    this.listeningLocoKey = null;
    this.listeningBlockTarget = null;
  }
  static async saveAndCommit() {
    if (!this.modalChar || !this.workingSchema) return;
    const char = this.modalChar;
    const schema = this.workingSchema;
    const root = this.getRootContainer();
    if (root) {
      root.querySelectorAll(".select-action-stage-group").forEach((sel) => {
        const rId = sel.dataset.ruleId;
        const sIdx = parseInt(sel.dataset.statementIdx ?? "0", 10);
        const val = sel.value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const stmts = ControlSchemaArbiter.getRuleBody(rule);
          if (stmts[sIdx] && stmts[sIdx].type === "action") {
            const act = stmts[sIdx].action;
            act.args = { ...act.args || {}, group: val };
            rule.body = stmts;
            ControlSchemaArbiter.syncRuleFromStatements(rule);
          }
        }
      });
      root.querySelectorAll(".select-action-stage").forEach((sel) => {
        const rId = sel.dataset.ruleId;
        const sIdx = parseInt(sel.dataset.statementIdx ?? "0", 10);
        const val = sel.value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const stmts = ControlSchemaArbiter.getRuleBody(rule);
          if (stmts[sIdx] && stmts[sIdx].type === "action") {
            const act = stmts[sIdx].action;
            act.args = { ...act.args || {}, stage: val };
            rule.body = stmts;
            ControlSchemaArbiter.syncRuleFromStatements(rule);
          }
        }
      });
      root.querySelectorAll(".select-cond-stage-group").forEach((sel) => {
        const rId = sel.dataset.ruleId;
        const cPath = sel.dataset.condPath ?? "";
        const val = sel.value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const targetCond = _ControlsInspector.getConditionByPath(rule, cPath);
          if (targetCond) {
            targetCond.stageGroup = val;
          }
        }
      });
      root.querySelectorAll(".select-cond-stage").forEach((sel) => {
        const rId = sel.dataset.ruleId;
        const cPath = sel.dataset.condPath ?? "";
        const val = sel.value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const targetCond = _ControlsInspector.getConditionByPath(rule, cPath);
          if (targetCond) {
            targetCond.param = val;
          }
        }
      });
      root.querySelectorAll(".input-cond-param").forEach((inp) => {
        const rId = inp.dataset.ruleId;
        const cPath = inp.dataset.condPath ?? "";
        const val = inp.value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const targetCond = _ControlsInspector.getConditionByPath(rule, cPath);
          if (targetCond) {
            targetCond.param = val;
          }
        }
      });
    }
    const saveBtn = root == null ? void 0 : root.querySelector("#btn-modal-save-close");
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "⏳ Saving to Project...";
    }
    try {
      await DevConfigPersistence.saveControlSchema(this.modalPanel, char, schema);
      const prefab = char.prefabId ? prefabManager.get(char.prefabId) : void 0;
      const targetDesc = prefab ? `${char.name || "Character"} & ${prefab.name} Prefab` : char.name || "Character";
      this.showToast(`✓ Saved & persisted controls for ${targetDesc} to worldConfig.json!`);
    } catch (err) {
      console.error("Failed to save controls:", err);
      this.showToast(`❌ Save failed: ${err.message || err}`, true);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "💾 Save & Apply";
      }
      this.renderActiveView();
    }
  }
  static showToast(message, isError = false) {
    const targets = [document];
    if (this.popoutWindow && !this.popoutWindow.closed) {
      targets.push(this.popoutWindow.document);
    }
    for (const doc of targets) {
      const existing = doc.getElementById("controls-save-toast");
      if (existing) existing.remove();
      const toast = doc.createElement("div");
      toast.id = "controls-save-toast";
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: ${isError ? "rgba(239, 68, 68, 0.95)" : "rgba(16, 185, 129, 0.95)"};
        color: #ffffff;
        padding: 10px 18px;
        border-radius: 8px;
        font-size: 0.82rem;
        font-weight: 600;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        z-index: 10001;
        display: flex;
        align-items: center;
        gap: 8px;
        pointer-events: none;
      `;
      toast.innerHTML = `<span>${isError ? "⚠️" : "✓"}</span> <span>${message}</span>`;
      doc.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s ease-out";
        setTimeout(() => toast.remove(), 300);
      }, 2e3);
    }
  }
  // --- View Rendering (Popout Window or In-Canvas Dialog) ---
  static getRootContainer() {
    if (this.popoutWindow && !this.popoutWindow.closed) {
      return this.popoutWindow.document.getElementById("controls-window-root");
    }
    if (this.modalOverlay) {
      return this.modalOverlay;
    }
    return null;
  }
  static renderActiveView() {
    const root = this.getRootContainer();
    if (!root || !this.modalChar || !this.workingSchema) return;
    const existingBody = root.querySelector("#controls-scroll-body");
    const prevScrollTop = existingBody ? existingBody.scrollTop : 0;
    const char = this.modalChar;
    const schema = this.workingSchema;
    const prefab = char.prefabId ? prefabManager.get(char.prefabId) : void 0;
    const prefabName = prefab ? `${prefab.icon} ${prefab.name}` : null;
    const isPopout = Boolean(this.popoutWindow && !this.popoutWindow.closed);
    const activeRulesCount = this.activeTab === "keyboardMouse" ? schema.keyboardMouse.rules.length : this.activeTab === "gamepad" ? schema.gamepad.rules.length : schema.touch.rules.length;
    const dialogHtml = `
      <div id="controls-dialog-container" style="
        background: #0b1120;
        ${isPopout ? "height: 100%; border: none; border-radius: 0;" : "border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 10px; width: 880px; max-width: 96vw; height: min(900px, calc(100vh - 28px)); max-height: calc(100vh - 28px);"}
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #ffffff;
        box-shadow: ${isPopout ? "none" : "0 25px 60px rgba(0, 0, 0, 0.85)"};
      ">
        <style>
          #controls-scroll-body::-webkit-scrollbar { width: 10px; height: 10px; }
          #controls-scroll-body::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.6); border-radius: 5px; }
          #controls-scroll-body::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.35); border-radius: 5px; border: 2px solid rgba(15, 23, 42, 0.6); }
          #controls-scroll-body::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.55); }
        </style>
        <!-- Title Bar / Header -->
        <div style="flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: rgba(15, 23, 42, 0.98); border-bottom: 1px solid rgba(148, 163, 184, 0.2);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.15rem;">🎮</span>
            <div>
              <div style="font-weight: 700; font-size: 0.94rem; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                Controls Schema: <span style="color: #ffffff;">${char.name || "Character"}</span>
                <span class="badge" style="background: rgba(255, 255, 255, 0.08); color: #ffffff; font-size: 0.68rem; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(148, 163, 184, 0.2);">ID: ${char.id}</span>
                ${isPopout ? `<span class="badge" style="background: rgba(255, 255, 255, 0.08); color: #ffffff; font-size: 0.68rem; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(148, 163, 184, 0.2);">🪟 Separate Window</span>` : ""}
              </div>
            </div>
          </div>
          <button id="btn-close-controls-modal" class="btn-secondary-action" style="padding: 4px 10px; font-size: 0.82rem; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.25); background: transparent;" title="Close Window">✕ Close</button>
        </div>

        <!-- Subheader: Linked Prefab Bar & Preset Selector -->
        <div style="flex-shrink: 0; padding: 10px 18px; background: rgba(15, 23, 42, 0.7); border-bottom: 1px solid rgba(148, 163, 184, 0.15); display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 6px; padding: 6px 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.76rem; color: #94a3b8; font-weight: 600;">Linked Archetype:</span>
              <span style="font-size: 0.78rem; color: #ffffff; font-weight: 600;">${prefabName || "(Standalone Character)"}</span>
              ${prefab ? `<span class="badge" style="background: rgba(255, 255, 255, 0.08); color: #ffffff; font-size: 0.68rem; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(148, 163, 184, 0.2);">Auto-Persists to Prefab on Save</span>` : ""}
            </div>
            <div style="display: flex; gap: 6px;">
              ${prefab ? `
                <button id="btn-revert-controls-from-prefab" class="btn-secondary-action" style="font-size: 0.72rem; padding: 3px 8px; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.25); background: rgba(255, 255, 255, 0.05);" title="Discard unsaved changes and reload clean controls from prefab archetype">↺ Reset to Prefab Defaults</button>
              ` : `
                <button id="btn-make-char-prefab" class="btn-secondary-action" style="font-size: 0.72rem; padding: 3px 8px; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.25); background: rgba(255, 255, 255, 0.05);" title="Turn this character into a reusable Character Prefab with this control schema">📦 Save as New Prefab</button>
              `}
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <label style="font-size: 0.78rem; font-weight: 600; color: #94a3b8; white-space: nowrap;">Preset Template:</label>
            <select id="select-control-preset" class="dev-select" style="flex: 1; font-size: 0.76rem; color: #ffffff; background: #0f172a; border: 1px solid rgba(148, 163, 184, 0.25);">
              ${BuiltinControlSchemas.map(
      (p) => `<option value="${p.id}" ${p.id === schema.id ? "selected" : ""}>${p.name}</option>`
    ).join("")}
              <option value="custom" ${!BuiltinControlSchemas.some((b) => b.id === schema.id) ? "selected" : ""}>Custom (User Modified)</option>
            </select>
          </div>
        </div>

        <!-- Device Channel Tabs -->
        <div style="flex-shrink: 0; display: flex; gap: 4px; padding: 8px 18px 0 18px; background: rgba(15, 23, 42, 0.5);">
          <button id="tab-btn-kbm" class="btn-secondary-action" style="flex: 1; font-size: 0.78rem; padding: 7px 12px; font-weight: 600; border-bottom: none; border-bottom-left-radius: 0; border-bottom-right-radius: 0; ${this.activeTab === "keyboardMouse" ? "background: #0f172a; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.35); border-bottom: 2px solid #ffffff;" : "background: transparent; color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2);"}" >
            ⌨️ Keyboard & Mouse
          </button>
          <button id="tab-btn-pad" class="btn-secondary-action" style="flex: 1; font-size: 0.78rem; padding: 7px 12px; font-weight: 600; border-bottom: none; border-bottom-left-radius: 0; border-bottom-right-radius: 0; ${this.activeTab === "gamepad" ? "background: #0f172a; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.35); border-bottom: 2px solid #ffffff;" : "background: transparent; color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2);"}" >
            🎮 Gamepad
          </button>
          <button id="tab-btn-tch" class="btn-secondary-action" style="flex: 1; font-size: 0.78rem; padding: 7px 12px; font-weight: 600; border-bottom: none; border-bottom-left-radius: 0; border-bottom-right-radius: 0; ${this.activeTab === "touch" ? "background: #0f172a; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.35); border-bottom: 2px solid #ffffff;" : "background: transparent; color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2);"}" >
            📱 Mobile Touch
          </button>
        </div>

        <!-- Scrollable Modal Body -->
        <div id="controls-scroll-body" style="flex: 1 1 0px; min-height: 0; overflow-y: scroll; scrollbar-width: thin; scrollbar-color: rgba(148, 163, 184, 0.4) rgba(15, 23, 42, 0.6); padding: 14px 18px; display: flex; flex-direction: column; gap: 12px; background: #090d16;">
          
          ${this.activeTab === "keyboardMouse" || this.activeTab === "gamepad" ? `
            ${this.renderBlocksHtml(schema)}
          ` : `
            <!-- Touch Locomotion Paradigm Section -->
            <div id="section-locomotion" style="background: rgba(15, 23, 42, 0.85); border-radius: 8px; border: 1px solid rgba(148, 163, 184, 0.25); padding: 12px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(148, 163, 184, 0.15); padding-bottom: 8px;">
                <span style="font-size: 0.84rem; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 6px;">
                  📱 Touch Locomotion & Widgets
                </span>
              </div>
              <div id="controls-paradigms-container">
                ${this.renderParadigmsHtml(schema)}
              </div>
            </div>

            <!-- Rules Matrix Header -->
            <div id="section-rules-header" style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 6px; border-top: 1px solid rgba(148, 163, 184, 0.15);">
              <span style="font-size: 0.80rem; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 6px;">
                ⚡ Action Threads (${activeRulesCount} branches)
              </span>
              <div style="display: flex; gap: 6px; align-items: center;">
                <button id="btn-add-control-rule" class="btn-secondary-action" type="button" style="font-size: 0.74rem; padding: 4px 12px; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.35); background: rgba(255, 255, 255, 0.08); font-weight: 600;">
                  + Add Rule
                </button>
              </div>
            </div>

            <!-- Rules List Container -->
            <div id="rules-list-container" style="display: flex; flex-direction: column; gap: 8px;">
              ${this.renderRulesListHtml(char, schema)}
            </div>
          `}

          <!-- Collapsible Raw JSON Editor Drawer -->
          <div style="margin-top: 8px; border-top: 1px solid rgba(148, 163, 184, 0.15); padding-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <button id="btn-toggle-json-drawer" class="btn-secondary-action" type="button" style="font-size: 0.74rem; padding: 4px 10px; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.25); background: transparent;">
                ${this.showJsonEditor ? "▲ Hide Raw JSON" : "📋 View / Edit Raw JSON"}
              </button>
              <span style="font-size: 0.70rem; color: #64748b;">Direct JSON Schema inspection & export</span>
            </div>

            ${this.showJsonEditor ? `
              <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 6px; padding: 8px;">
                ${this.jsonErrorMessage ? `<div style="color: #ffffff; font-size: 0.72rem; background: rgba(239, 68, 68, 0.2); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.4);">⚠️ ${this.jsonErrorMessage}</div>` : ""}
                <textarea id="textarea-controls-json" style="width: 100%; height: 200px; font-family: monospace; font-size: 0.72rem; background: #090d16; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 4px; padding: 8px; resize: vertical; box-sizing: border-box;" spellcheck="false">${JSON.stringify(
      schema,
      null,
      2
    )}</textarea>
                <div style="display: flex; justify-content: flex-end; gap: 6px;">
                  <button id="btn-copy-json" class="btn-secondary-action" style="font-size: 0.72rem; padding: 3px 8px; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.25); background: transparent;">📋 Copy JSON</button>
                  <button id="btn-apply-json" class="btn-secondary-action" style="font-size: 0.72rem; padding: 3px 12px; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.35); background: rgba(255, 255, 255, 0.08); font-weight: 600;">Apply JSON Changes</button>
                </div>
              </div>
            ` : ""}
          </div>
        </div>

        <!-- Footer Bar -->
        <div style="flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: rgba(15, 23, 42, 0.98); border-top: 1px solid rgba(148, 163, 184, 0.15);">
          <div style="font-size: 0.74rem; color: #94a3b8;">
            Schema: <strong style="color: #ffffff;">${schema.name}</strong>
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="btn-modal-cancel" class="btn-secondary-action" style="padding: 6px 14px; font-size: 0.78rem; color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2); background: transparent;">Close</button>
            <button id="btn-modal-save-close" class="btn-secondary-action" style="padding: 6px 18px; font-size: 0.78rem; font-weight: 700; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.4); background: rgba(255, 255, 255, 0.12);" title="Saves live controls, updates the linked prefab archetype, and permanently persists to worldConfig.json on disk">
              💾 Save & Apply
            </button>
          </div>
        </div>
      </div>
    `;
    root.innerHTML = dialogHtml;
    if (prevScrollTop > 0) {
      const newBody = root.querySelector("#controls-scroll-body");
      if (newBody) newBody.scrollTop = prevScrollTop;
    }
    this.attachEventListeners(root);
  }
  // --- Sub-Section HTML Builders ---
  static renderTagsSectionHtml(schema) {
    const tags = this.getActiveDeviceTags(schema);
    if (tags.length === 0) {
      return `
        <div style="text-align: center; color: #94a3b8; font-size: 0.74rem; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 4px; border: 1px solid rgba(148, 163, 184, 0.2);">
          No action keybind tags defined yet. Click "+ Add Keybind Tag" to create one.
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
          <button id="btn-add-tag" class="btn-secondary-action" type="button" style="font-size: 0.72rem; padding: 3px 10px; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.3); background: rgba(255, 255, 255, 0.05);">
            + Add Keybind Tag
          </button>
        </div>
      `;
    }
    return `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div style="display: grid; grid-template-columns: 1fr 150px 32px; gap: 8px; font-size: 0.68rem; font-weight: 700; color: #94a3b8; padding: 0 4px;">
          <span>ACTION NAME</span>
          <span>KEY / BUTTON BIND</span>
          <span></span>
        </div>
        ${tags.map((tag) => {
      const isListening = this.listeningTagId === tag.id;
      const triggerLabel = this.formatTriggerLabel(tag);
      return `
            <div class="keybind-tag-row" style="display: grid; grid-template-columns: 1fr 150px 32px; gap: 8px; align-items: center; background: rgba(0,0,0,0.25); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 4px; padding: 4px 6px;">
              <input type="text" class="input-tag-name dev-input" data-tag-id="${tag.id}" value="${tag.name}" placeholder="e.g. Action, Sprint, Aim, Jump..." style="font-size: 0.74rem; padding: 2px 6px; font-weight: 600; color: #ffffff; background: #0f172a; border: 1px solid rgba(148, 163, 184, 0.25);" />
              <button class="btn-bind-tag btn-secondary-action" data-tag-id="${tag.id}" style="font-size: 0.72rem; padding: 3px 8px; font-weight: 600; text-align: center; border: 1px solid rgba(148, 163, 184, 0.25); ${isListening ? "background: #ef4444; color: #fff; animation: pulse 1s infinite;" : "color: #ffffff; background: rgba(255, 255, 255, 0.05);"}" title="Click to bind key or mouse button">
                ${isListening ? "🔴 Press key..." : triggerLabel}
              </button>
              <button class="btn-delete-tag btn-secondary-action" data-tag-id="${tag.id}" style="padding: 2px 4px; color: #94a3b8; font-size: 0.70rem; border: 1px solid rgba(148, 163, 184, 0.2); background: transparent;" title="Delete Tag">
                🗑️
              </button>
            </div>
          `;
    }).join("")}
        <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
          <button id="btn-add-tag" class="btn-secondary-action" type="button" style="font-size: 0.72rem; padding: 3px 10px; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.3); background: rgba(255, 255, 255, 0.05);">
            + Add Keybind Tag
          </button>
        </div>
      </div>
    `;
  }
  static getActiveStageGroups(schema) {
    if (!schema.stageGroups || !Array.isArray(schema.stageGroups) || schema.stageGroups.length === 0) {
      if (schema.stages && Array.isArray(schema.stages) && schema.stages.length > 0) {
        schema.stageGroups = [{ name: "default", stages: [...schema.stages] }];
      } else {
        schema.stageGroups = [{ name: "default", stages: ["none"] }];
      }
    }
    for (const g of schema.stageGroups) {
      if (!g.stages || !Array.isArray(g.stages) || g.stages.length === 0) {
        g.stages = ["none"];
      } else if (!g.stages.includes("none")) {
        g.stages.unshift("none");
      } else if (g.stages[0] !== "none") {
        g.stages = ["none", ...g.stages.filter((s) => s !== "none")];
      }
    }
    schema.stages = schema.stageGroups[0].stages;
    return schema.stageGroups;
  }
  static getStagesForGroup(schema, groupName) {
    const groups = this.getActiveStageGroups(schema);
    const g = groups.find((grp) => grp.name === (groupName || "default")) || groups[0];
    return g ? g.stages : ["none"];
  }
  static getActiveStages(schema) {
    return this.getActiveStageGroups(schema)[0].stages;
  }
  static renameStageGroupInRules(schema, oldGroupName, newGroupName) {
    var _a, _b, _c;
    const processRule = (rule) => {
      var _a2, _b2;
      const conds = ControlSchemaArbiter.getRuleConditions(rule);
      let condsChanged = false;
      const updateCond = (cond) => {
        if (cond.type === "stagedActionIs" && (cond.stageGroup === oldGroupName || !cond.stageGroup && oldGroupName === "default")) {
          cond.stageGroup = newGroupName;
          condsChanged = true;
        }
        if (cond.type === "group" && cond.conditions) {
          for (const sub of cond.conditions) {
            updateCond(sub);
          }
        }
      };
      for (const cond of conds) {
        updateCond(cond);
      }
      if (condsChanged) {
        rule.conditions = conds;
        rule.condition = conds[0];
      }
      const stmts = ControlSchemaArbiter.getRuleBody(rule);
      let stmtsChanged = false;
      for (const stmt of stmts) {
        if (stmt.type === "action") {
          if (stmt.action.moduleId === "staging" && stmt.action.intent === "setStage") {
            if (((_a2 = stmt.action.args) == null ? void 0 : _a2.group) === oldGroupName || !((_b2 = stmt.action.args) == null ? void 0 : _b2.group) && oldGroupName === "default") {
              stmt.action.args = { ...stmt.action.args || {}, group: newGroupName };
              stmtsChanged = true;
            }
          }
        } else if (stmt.type === "nestedThread") {
          for (const childRule of stmt.rules) {
            processRule(childRule);
          }
        }
      }
      if (stmtsChanged) {
        rule.body = stmts;
        ControlSchemaArbiter.syncRuleFromStatements(rule);
      }
    };
    if ((_a = schema.keyboardMouse) == null ? void 0 : _a.rules) {
      for (const r of schema.keyboardMouse.rules) processRule(r);
    }
    if ((_b = schema.gamepad) == null ? void 0 : _b.rules) {
      for (const r of schema.gamepad.rules) processRule(r);
    }
    if ((_c = schema.touch) == null ? void 0 : _c.rules) {
      for (const r of schema.touch.rules) processRule(r);
    }
  }
  static renameStageInRules(schema, groupName, oldName, newName) {
    var _a, _b, _c;
    const processRule = (rule) => {
      var _a2, _b2, _c2;
      const conds = ControlSchemaArbiter.getRuleConditions(rule);
      let condsChanged = false;
      const updateCond = (cond) => {
        const matchesGroup = (cond.stageGroup || "default") === (groupName || "default");
        if (cond.type === "stagedActionIs" && matchesGroup && (cond.param === oldName || !cond.param && oldName === "none")) {
          cond.param = newName;
          condsChanged = true;
        }
        if (cond.type === "group" && cond.conditions) {
          for (const sub of cond.conditions) {
            updateCond(sub);
          }
        }
      };
      for (const cond of conds) {
        updateCond(cond);
      }
      if (condsChanged) {
        rule.conditions = conds;
        rule.condition = conds[0];
      }
      const stmts = ControlSchemaArbiter.getRuleBody(rule);
      let stmtsChanged = false;
      for (const stmt of stmts) {
        if (stmt.type === "action") {
          if (stmt.action.moduleId === "staging" && stmt.action.intent === "setStage") {
            const matchesGroup = (((_a2 = stmt.action.args) == null ? void 0 : _a2.group) || "default") === (groupName || "default");
            if (matchesGroup && (((_b2 = stmt.action.args) == null ? void 0 : _b2.stage) === oldName || !((_c2 = stmt.action.args) == null ? void 0 : _c2.stage) && oldName === "none")) {
              stmt.action.args = { ...stmt.action.args || {}, stage: newName };
              stmtsChanged = true;
            }
          }
        } else if (stmt.type === "nestedThread") {
          for (const childRule of stmt.rules) {
            processRule(childRule);
          }
        }
      }
      if (stmtsChanged) {
        rule.body = stmts;
        ControlSchemaArbiter.syncRuleFromStatements(rule);
      }
    };
    if ((_a = schema.keyboardMouse) == null ? void 0 : _a.rules) {
      for (const r of schema.keyboardMouse.rules) processRule(r);
    }
    if ((_b = schema.gamepad) == null ? void 0 : _b.rules) {
      for (const r of schema.gamepad.rules) processRule(r);
    }
    if ((_c = schema.touch) == null ? void 0 : _c.rules) {
      for (const r of schema.touch.rules) processRule(r);
    }
  }
  static deleteStageGroupInRules(schema, deletedGroupName) {
    var _a, _b;
    const firstGroup = ((_b = (_a = schema.stageGroups) == null ? void 0 : _a[0]) == null ? void 0 : _b.name) || "default";
    this.renameStageGroupInRules(schema, deletedGroupName, firstGroup);
  }
  static deleteStageInRules(schema, groupName, deletedStageName) {
    this.renameStageInRules(schema, groupName, deletedStageName, "none");
  }
  static getConditionListAndIndex(rule, pathStr) {
    if (!pathStr && pathStr !== "0") return null;
    const parts = pathStr.split(".").map((p) => parseInt(p, 10));
    if (parts.some(isNaN)) return null;
    const conds = ControlSchemaArbiter.getRuleConditions(rule);
    let currentList = conds;
    for (let i = 0; i < parts.length - 1; i++) {
      const idx = parts[i];
      const parentGate = currentList[idx];
      if (!parentGate || parentGate.type !== "group" || !parentGate.conditions) {
        return null;
      }
      currentList = parentGate.conditions;
    }
    return { list: currentList, index: parts[parts.length - 1] };
  }
  static getConditionByPath(rule, pathStr) {
    const res = this.getConditionListAndIndex(rule, pathStr);
    if (!res || !res.list[res.index]) return null;
    return res.list[res.index];
  }
  static getConditionGroupList(rule, pathStr) {
    const conds = ControlSchemaArbiter.getRuleConditions(rule);
    if (!pathStr || pathStr.trim() === "") {
      return { list: conds };
    }
    const parts = pathStr.split(".").map((p) => parseInt(p, 10));
    if (parts.some(isNaN)) return null;
    let currentGroup;
    let currentList = conds;
    for (let i = 0; i < parts.length; i++) {
      const idx = parts[i];
      currentGroup = currentList[idx];
      if (!currentGroup || currentGroup.type !== "group" || !currentGroup.conditions) {
        return null;
      }
      currentList = currentGroup.conditions;
    }
    return { list: currentList, group: currentGroup };
  }
  static renderStagesSectionHtml(schema) {
    const stageGroups = this.getActiveStageGroups(schema);
    return `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${stageGroups.map((group, gIdx) => `
          <div class="stage-group-card" style="display: flex; flex-direction: column; gap: 6px; background: rgba(0, 0, 0, 0.28); border: 1px solid rgba(167, 139, 250, 0.25); border-radius: 6px; padding: 7px 9px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; border-bottom: 1px solid rgba(167, 139, 250, 0.2); padding-bottom: 5px;">
              <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;">
                <span style="font-size: 0.74rem;">📁</span>
                <span style="font-size: 0.66rem; font-weight: 700; color: #a78bfa; text-transform: uppercase;">SET:</span>
                <input
                  type="text"
                  class="input-stage-group-name dev-input"
                  data-group-idx="${gIdx}"
                  value="${group.name}"
                  placeholder="Set name (e.g. default, stance)..."
                  style="font-size: 0.72rem; padding: 2px 6px; font-weight: 700; color: #ffffff; background: #0f172a; border: 1px solid rgba(167, 139, 250, 0.35); max-width: 140px;"
                />
                ${gIdx === 0 ? `<span style="font-size: 0.62rem; color: #64748b; font-style: italic;">(Primary Set)</span>` : ""}
              </div>
              <div>
                ${stageGroups.length > 1 ? `
                  <button class="btn-delete-stage-group btn-secondary-action" data-group-idx="${gIdx}" style="padding: 2px 6px; color: #f87171; font-size: 0.66rem; border: 1px solid rgba(248, 113, 113, 0.3); background: transparent; cursor: pointer;" title="Delete Stage Set">
                    🗑️ Delete Set
                  </button>
                ` : ""}
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px; padding-left: 4px;">
              ${group.stages.map((stg, sIdx) => {
      const isNone = stg === "none";
      return `
                  <div class="control-stage-row" style="display: grid; grid-template-columns: 1fr 32px; gap: 8px; align-items: center; background: rgba(255,255,255,0.02); border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 4px; padding: 3px 6px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span style="font-size: 0.70rem;">🎭</span>
                      <input
                        type="text"
                        class="input-stage-name dev-input"
                        data-group-idx="${gIdx}"
                        data-stage-idx="${sIdx}"
                        value="${stg}"
                        placeholder="Stage name..."
                        ${isNone ? "disabled" : ""}
                        style="font-size: 0.72rem; padding: 2px 6px; font-weight: 600; color: ${isNone ? "#94a3b8" : "#ffffff"}; background: ${isNone ? "rgba(255,255,255,0.03)" : "#0f172a"}; border: 1px solid rgba(148, 163, 184, 0.25); flex: 1;"
                      />
                      ${isNone ? `<span style="font-size: 0.62rem; color: #64748b; font-style: italic; white-space: nowrap;">(Immutable Default)</span>` : ""}
                    </div>
                    <div>
                      ${!isNone ? `
                        <button class="btn-delete-stage btn-secondary-action" data-group-idx="${gIdx}" data-stage-idx="${sIdx}" style="padding: 2px 4px; color: #94a3b8; font-size: 0.68rem; border: 1px solid rgba(148, 163, 184, 0.2); background: transparent; cursor: pointer;" title="Delete Stage">
                          🗑️
                        </button>
                      ` : ""}
                    </div>
                  </div>
                `;
    }).join("")}
              <div style="display: flex; justify-content: flex-start; margin-top: 2px;">
                <button class="btn-add-stage btn-secondary-action" data-group-idx="${gIdx}" type="button" style="font-size: 0.68rem; padding: 2px 8px; color: #ffffff; border: 1px dashed rgba(148, 163, 184, 0.3); background: rgba(255, 255, 255, 0.03); cursor: pointer;">
                  + Add Stage to "${group.name}"
                </button>
              </div>
            </div>
          </div>
        `).join("")}
        <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
          <button id="btn-add-stage-group" class="btn-secondary-action" type="button" style="font-size: 0.72rem; padding: 3px 10px; color: #a78bfa; border: 1px solid rgba(167, 139, 250, 0.35); background: rgba(167, 139, 250, 0.08); cursor: pointer;">
            + Add Stage Set
          </button>
        </div>
      </div>
    `;
  }
  static formatChannelKeyLabel(code, chordModifiers) {
    if (!code) return "None";
    let base = code;
    if (base.startsWith("Gamepad")) {
      switch (base) {
        case "GamepadA":
          return "A (South)";
        case "GamepadB":
          return "B (East)";
        case "GamepadX":
          return "X (West)";
        case "GamepadY":
          return "Y (North)";
        case "GamepadLB":
          return "LB";
        case "GamepadRB":
          return "RB";
        case "GamepadLT":
          return "LT";
        case "GamepadRT":
          return "RT";
        case "GamepadLS":
          return "LS (Click)";
        case "GamepadRS":
          return "RS (Click)";
        case "GamepadDpadUp":
          return "D-Pad Up";
        case "GamepadDpadDown":
          return "D-Pad Down";
        case "GamepadDpadLeft":
          return "D-Pad Left";
        case "GamepadDpadRight":
          return "D-Pad Right";
        case "GamepadStart":
          return "Start";
        case "GamepadBack":
          return "Select / Back";
        default:
          return base.replace("Gamepad", "Pad ");
      }
    }
    if (base.startsWith("Key")) base = base.substring(3);
    else if (base.startsWith("Digit")) base = base.substring(5);
    else if (base === "MouseLeft") base = "LMB";
    else if (base === "MouseRight") base = "RMB";
    else if (base === "MouseMiddle") base = "MMB";
    else if (base === "Space") base = "Space";
    else if (base === "ShiftLeft") base = "Shift";
    else if (base === "ControlLeft") base = "Ctrl";
    else if (base === "AltLeft") base = "Alt";
    else if (base === "ArrowUp") base = "↑";
    else if (base === "ArrowDown") base = "↓";
    else if (base === "ArrowLeft") base = "←";
    else if (base === "ArrowRight") base = "→";
    if (chordModifiers && chordModifiers.length > 0) {
      const mods = chordModifiers.map((m) => {
        if (m.startsWith("Alt")) return "Alt";
        if (m.startsWith("Shift")) return "Shift";
        if (m.startsWith("Control") || m.startsWith("Ctrl")) return "Ctrl";
        return m;
      });
      return `${mods.join(" + ")} + ${base}`;
    }
    return base;
  }
  static defaultCleanForSlot(slotName) {
    if (slotName === "forwardTrigger" || slotName === "sprint" || slotName === "aimTrigger" || slotName === "consume") {
      return false;
    }
    return true;
  }
  static renderInputSlot(blockId, slotName, slot, labelPrefix = "") {
    const isListeningPrimary = this.listeningBlockTarget && this.listeningBlockTarget.blockId === blockId && this.listeningBlockTarget.slotName === slotName && this.listeningBlockTarget.gateIdx === void 0 && !this.listeningBlockTarget.isMoveKey;
    const code = slot == null ? void 0 : slot.code;
    const label = code ? this.formatChannelKeyLabel(code) : "None (Unassigned)";
    const gateButtons = (slot == null ? void 0 : slot.gateButtons) || [];
    const isClean = (slot == null ? void 0 : slot.requireCleanPress) !== void 0 ? Boolean(slot.requireCleanPress) : this.defaultCleanForSlot(slotName);
    return `
      <div style="display: flex; flex-direction: column; gap: 3px;">
        ${labelPrefix ? `<span style="font-size: 0.64rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">${labelPrefix}</span>` : ""}
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px;">
          <!-- Primary Input Slot Badge -->
          <div style="display: inline-flex; align-items: center; gap: 2px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 4px; padding: 1px 4px;">
            <button class="btn-block-slot-bind btn-secondary-action" data-block-id="${blockId}" data-slot-name="${slotName}" type="button" style="
              font-size: 0.72rem;
              padding: 2px 6px;
              font-weight: 600;
              border: none;
              background: transparent;
              ${isListeningPrimary ? "color: #ef4444; font-weight: 700; animation: pulse 1s infinite;" : code ? "color: #fff;" : "color: #64748b; font-style: italic;"}
            " title="Click to bind key or mouse button">
              ${isListeningPrimary ? "🔴 Press button / key..." : code ? code.startsWith("Gamepad") ? `🎮 ${label}` : code.startsWith("Mouse") ? `🖱️ ${label}` : `⌨️ ${label}` : "🚫 None (Unassigned)"}
            </button>
            ${code ? `
              <button class="btn-block-slot-clear" data-block-id="${blockId}" data-slot-name="${slotName}" type="button" style="
                font-size: 0.64rem;
                color: #ef4444;
                background: transparent;
                border: none;
                cursor: pointer;
                padding: 0 3px;
                line-height: 1;
              " title="Clear this input (disable completely)">✕</button>
            ` : ""}
          </div>

          <!-- Gate Hold Keys Badges -->
          ${gateButtons.map((gCode, gIdx) => {
      const isListeningGate = this.listeningBlockTarget && this.listeningBlockTarget.blockId === blockId && this.listeningBlockTarget.slotName === slotName && this.listeningBlockTarget.gateIdx === gIdx;
      const gLabel = this.formatChannelKeyLabel(gCode);
      return `
              <div style="display: inline-flex; align-items: center; gap: 2px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 4px; padding: 1px 4px;">
                <span style="font-size: 0.62rem; color: #38bdf8; font-weight: 700;">+</span>
                <button class="btn-block-slot-gate-bind btn-secondary-action" data-block-id="${blockId}" data-slot-name="${slotName}" data-gate-idx="${gIdx}" type="button" style="
                  font-size: 0.68rem;
                  padding: 1px 4px;
                  font-weight: 600;
                  border: none;
                  background: transparent;
                  color: #fff;
                  ${isListeningGate ? "color: #ef4444; font-weight: 700;" : ""}
                " title="Click to rebind held gate button">
                  ${isListeningGate ? "🔴 Press..." : gCode.startsWith("Gamepad") ? `🎮 ${gLabel}` : gCode.startsWith("Mouse") ? `🖱️ ${gLabel}` : `⌨️ ${gLabel}`}
                </button>
                <button class="btn-block-slot-gate-remove" data-block-id="${blockId}" data-slot-name="${slotName}" data-gate-idx="${gIdx}" type="button" style="
                  font-size: 0.62rem;
                  color: #ef4444;
                  background: transparent;
                  border: none;
                  cursor: pointer;
                  padding: 0 2px;
                  line-height: 1;
                " title="Remove this held button requirement">✕</button>
              </div>
            `;
    }).join("")}

          <!-- Add Gate Button Button -->
          <button class="btn-block-slot-add-gate btn-secondary-action" data-block-id="${blockId}" data-slot-name="${slotName}" type="button" style="
            font-size: 0.60rem;
            font-weight: 600;
            padding: 2px 5px;
            background: rgba(56, 189, 248, 0.08);
            border: 1px dashed rgba(56, 189, 248, 0.4);
            color: #38bdf8;
            border-radius: 3px;
            cursor: pointer;
          " title="Require an additional held button for this action">+ Key</button>

          <!-- Clean Press Toggle Checkbox -->
          <label style="display: inline-flex; align-items: center; gap: 3px; margin-left: 6px; cursor: pointer; user-select: none;" title="Require clean press: button must be released before triggering this action again (prevents continuous auto-repeat)">
            <input type="checkbox" class="block-slot-clean-toggle" data-block-id="${blockId}" data-slot-name="${slotName}" ${isClean ? "checked" : ""} style="cursor: pointer; width: 12px; height: 12px; accent-color: #38bdf8;" />
            <span style="font-size: 0.62rem; font-weight: 600; ${isClean ? "color: #38bdf8;" : "color: #64748b;"}">Clean</span>
          </label>
        </div>
      </div>
    `;
  }
  static renderBlockBodyHtml(block) {
    var _a, _b;
    switch (block.type) {
      case "locomotion": {
        const b = block;
        b.mode = b.mode || "wasd";
        b.moveKeys = b.moveKeys || { upKey: "KeyW", downKey: "KeyS", leftKey: "KeyA", rightKey: "KeyD" };
        b.forwardTrigger = b.forwardTrigger || { code: "MouseRight" };
        b.reverseKey = b.reverseKey !== void 0 ? b.reverseKey : "KeyS";
        b.strafeLeftKey = b.strafeLeftKey !== void 0 ? b.strafeLeftKey : "KeyA";
        b.strafeRightKey = b.strafeRightKey !== void 0 ? b.strafeRightKey : "KeyD";
        b.cursorSteerTrigger = b.cursorSteerTrigger || { code: "GamepadLB" };
        b.cursorSteerMode = b.cursorSteerMode || "whenHoldingButton";
        b.jump = b.jump || { code: "Space" };
        b.sprint = b.sprint || { code: "ShiftLeft", mode: "hold" };
        const renderMoveKey = (dir, keyName) => {
          var _a2, _b2;
          const isListening = ((_a2 = this.listeningBlockTarget) == null ? void 0 : _a2.blockId) === b.id && ((_b2 = this.listeningBlockTarget) == null ? void 0 : _b2.isMoveKey) === keyName;
          const code = keyName === "reverseKey" || keyName === "strafeLeftKey" || keyName === "strafeRightKey" ? b[keyName] : b.moveKeys[keyName];
          const lbl = code ? this.formatChannelKeyLabel(code) : "None";
          return `
            <div style="display: inline-flex; align-items: center; gap: 2px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 4px; padding: 1px 4px;">
              <span style="font-size: 0.64rem; color: #94a3b8; font-weight: 700;">${dir}</span>
              <button class="btn-block-move-key btn-secondary-action" data-block-id="${b.id}" data-move-key="${keyName}" type="button" style="
                font-size: 0.68rem; padding: 2px 6px; font-weight: 600; border: none; background: transparent; ${isListening ? "color: #ef4444; font-weight: 700;" : code ? "color: #fff;" : "color: #64748b; font-style: italic;"}
              ">${isListening ? "🔴 Press..." : lbl}</button>
              ${code ? `<button class="btn-block-move-key-clear" data-block-id="${b.id}" data-move-key="${keyName}" type="button" style="font-size: 0.62rem; color: #ef4444; background: transparent; border: none; cursor: pointer; padding: 0 2px;">✕</button>` : ""}
            </div>
          `;
        };
        return `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #38bdf8;">Locomotion Mode:</span>
              <select class="block-loco-mode dev-select" data-block-id="${b.id}" style="font-size: 0.72rem; padding: 3px 8px; background: #0f172a; color: #fff; border: 1px solid rgba(56,189,248,0.4); border-radius: 4px;">
                <option value="stickDirectionDriveButton" ${b.mode === "stickDirectionDriveButton" ? "selected" : ""}>🕹️ Stick Controls Direction (Hold Button to Move Forward)</option>
                <option value="analogStick" ${b.mode === "analogStick" ? "selected" : ""}>🕹️ Left Stick Direct Analog Movement (Stick directly walks player)</option>
                <option value="wasd" ${b.mode === "wasd" || !b.mode ? "selected" : ""}>🎮 Directional Buttons / Keys (WASD / D-Pad Buttons)</option>
                <option value="walkToMouse" ${b.mode === "walkToMouse" ? "selected" : ""}>🖱️ Walk to Mouse (Forward Drive Toward Cursor)</option>
              </select>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; align-items: start;">
              ${b.mode === "analogStick" ? `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <div style="font-size: 0.64rem; color: #94a3b8; font-weight: 600;">
                    🕹️ Left Stick Direct Movement
                  </div>
                  <div style="font-size: 0.60rem; color: #64748b; line-height: 1.3;">
                    Left stick directly accelerates the creature in full 360° analog directions.
                  </div>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 2px;">
                    <div>
                      ${this.renderInputSlot(b.id, "cursorSteerTrigger", b.cursorSteerTrigger, "Cursor Steering Button (e.g. GamepadLB)")}
                    </div>
                    <div>
                      <span style="font-size: 0.64rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Cursor Steer Mode</span>
                      <select class="block-loco-cursor-mode dev-select" data-block-id="${b.id}" style="margin-top: 4px; font-size: 0.68rem; padding: 2px 6px; background: #0f172a; color: #fff; border: 1px solid rgba(148,163,184,0.3); border-radius: 3px; width: 100%;">
                        <option value="toggleButton" ${b.cursorSteerMode === "toggleButton" ? "selected" : ""}>🔄 Toggle Cursor Mode (Press button to toggle)</option>
                        <option value="cursorWhenIdle" ${b.cursorSteerMode === "cursorWhenIdle" ? "selected" : ""}>🕹️ Cursor When Stopped / Raw When Walking (Forward switch switches mode)</option>
                        <option value="whenHoldingButton" ${b.cursorSteerMode === "whenHoldingButton" ? "selected" : ""}>✋ Hold Modifier Button (Hold to steer cursor)</option>
                        <option value="whenAiming" ${b.cursorSteerMode === "whenAiming" ? "selected" : ""}>🎯 When Aiming / Throwing (Auto-steer when aiming)</option>
                        <option value="never" ${b.cursorSteerMode === "never" ? "selected" : ""}>🚫 Never (Stick always controls direction)</option>
                      </select>
                    </div>
                  </div>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; margin-top: 6px;">
                    <input type="checkbox" class="block-loco-raw-walking-toggle" data-block-id="${b.id}" ${b.rawDirectionWhileWalking ? "checked" : ""} style="cursor: pointer; width: 13px; height: 13px; accent-color: #38bdf8;" />
                    <span style="font-size: 0.64rem; font-weight: 600; color: #e2e8f0;">🚶 Forward Switch Overrides to Raw Direction While Walking</span>
                  </label>
                  <div style="font-size: 0.58rem; color: #64748b; margin-top: 2px; line-height: 1.25;">
                    When toggled on: releasing forward switch uses cursor mode; holding forward switch walks and attacks in raw stick direction.
                  </div>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; margin-top: 6px;">
                    <input type="checkbox" class="block-loco-stick-cursor-toggle" data-block-id="${b.id}" ${b.stickCursorInFront ? "checked" : ""} style="cursor: pointer; width: 13px; height: 13px; accent-color: #38bdf8;" />
                    <span style="font-size: 0.64rem; font-weight: 600; color: #e2e8f0;">🎯 Stick Cursor In Front Outside Cursor Mode</span>
                  </label>
                  <div style="font-size: 0.58rem; color: #64748b; margin-top: 2px; line-height: 1.25;">
                    When outside/exiting cursor mode: sticks cursor directly in front along facing direction, with distance scaled by stick magnitude.
                  </div>
                  ${b.stickCursorInFront ? `
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                      <span style="font-size: 0.62rem; color: #94a3b8; font-weight: 600;">Max / Clamp Distance:</span>
                      <input type="number" step="0.5" min="1" max="30" class="block-loco-cursor-max-dist dev-input" data-block-id="${b.id}" value="${b.cursorMaxDistance ?? 6}" style="width: 60px; font-size: 0.68rem; padding: 2px 4px; background: #0f172a; color: #38bdf8; border: 1px solid rgba(56,189,248,0.4); border-radius: 3px;" />
                      <span style="font-size: 0.58rem; color: #64748b;">units</span>
                    </div>
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; margin-top: 4px;">
                      <input type="checkbox" class="block-loco-lock-max-dist-toggle" data-block-id="${b.id}" ${b.lockCursorDistanceToMax ? "checked" : ""} style="cursor: pointer; width: 13px; height: 13px; accent-color: #38bdf8;" />
                      <span style="font-size: 0.64rem; font-weight: 600; color: #e2e8f0;">🔒 Lock Cursor Distance to Max (Fixed distance, ignores stick magnitude)</span>
                    </label>
                  ` : ""}
                </div>
              ` : b.mode === "stickDirectionDriveButton" ? `
                <div style="display: flex; flex-direction: column; gap: 10px;">
                  <div>
                    ${this.renderInputSlot(b.id, "forwardTrigger", b.forwardTrigger, "Forward Drive Button / Trigger (e.g. GamepadRT)")}
                    <div style="font-size: 0.62rem; color: #64748b; margin-top: 3px;">
                      Point left stick in desired heading; hold this button down to move forward. Left stick alone points direction without moving.
                    </div>
                  </div>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 2px;">
                    <div>
                      ${this.renderInputSlot(b.id, "cursorSteerTrigger", b.cursorSteerTrigger, "Cursor Steering Button (e.g. GamepadLB)")}
                    </div>
                    <div>
                      <span style="font-size: 0.64rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Cursor Steer Mode</span>
                      <select class="block-loco-cursor-mode dev-select" data-block-id="${b.id}" style="margin-top: 4px; font-size: 0.68rem; padding: 2px 6px; background: #0f172a; color: #fff; border: 1px solid rgba(148,163,184,0.3); border-radius: 3px; width: 100%;">
                        <option value="toggleButton" ${b.cursorSteerMode === "toggleButton" ? "selected" : ""}>🔄 Toggle Cursor Mode (Press button to toggle)</option>
                        <option value="cursorWhenIdle" ${b.cursorSteerMode === "cursorWhenIdle" ? "selected" : ""}>🕹️ Cursor When Stopped / Raw When Walking (Forward switch switches mode)</option>
                        <option value="whenHoldingButton" ${b.cursorSteerMode === "whenHoldingButton" ? "selected" : ""}>✋ Hold Modifier Button (Hold to steer cursor)</option>
                        <option value="whenAiming" ${b.cursorSteerMode === "whenAiming" ? "selected" : ""}>🎯 When Aiming / Throwing (Auto-steer when aiming)</option>
                        <option value="never" ${b.cursorSteerMode === "never" ? "selected" : ""}>🚫 Never (Stick always controls direction)</option>
                      </select>
                    </div>
                  </div>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; margin-top: 6px;">
                    <input type="checkbox" class="block-loco-raw-walking-toggle" data-block-id="${b.id}" ${b.rawDirectionWhileWalking ? "checked" : ""} style="cursor: pointer; width: 13px; height: 13px; accent-color: #38bdf8;" />
                    <span style="font-size: 0.64rem; font-weight: 600; color: #e2e8f0;">🚶 Forward Switch Overrides to Raw Direction While Walking</span>
                  </label>
                  <div style="font-size: 0.58rem; color: #64748b; margin-top: 2px; line-height: 1.25;">
                    When toggled on: releasing forward switch uses cursor mode; holding forward switch walks and attacks in raw stick direction.
                  </div>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; margin-top: 6px;">
                    <input type="checkbox" class="block-loco-stick-cursor-toggle" data-block-id="${b.id}" ${b.stickCursorInFront ? "checked" : ""} style="cursor: pointer; width: 13px; height: 13px; accent-color: #38bdf8;" />
                    <span style="font-size: 0.64rem; font-weight: 600; color: #e2e8f0;">🎯 Stick Cursor In Front Outside Cursor Mode</span>
                  </label>
                  <div style="font-size: 0.58rem; color: #64748b; margin-top: 2px; line-height: 1.25;">
                    When outside/exiting cursor mode: sticks cursor directly in front along facing direction, with distance scaled by stick magnitude.
                  </div>
                  ${b.stickCursorInFront ? `
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                      <span style="font-size: 0.62rem; color: #94a3b8; font-weight: 600;">Max / Clamp Distance:</span>
                      <input type="number" step="0.5" min="1" max="30" class="block-loco-cursor-max-dist dev-input" data-block-id="${b.id}" value="${b.cursorMaxDistance ?? 6}" style="width: 60px; font-size: 0.68rem; padding: 2px 4px; background: #0f172a; color: #38bdf8; border: 1px solid rgba(56,189,248,0.4); border-radius: 3px;" />
                      <span style="font-size: 0.58rem; color: #64748b;">units</span>
                    </div>
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; margin-top: 4px;">
                      <input type="checkbox" class="block-loco-lock-max-dist-toggle" data-block-id="${b.id}" ${b.lockCursorDistanceToMax ? "checked" : ""} style="cursor: pointer; width: 13px; height: 13px; accent-color: #38bdf8;" />
                      <span style="font-size: 0.64rem; font-weight: 600; color: #e2e8f0;">🔒 Lock Cursor Distance to Max (Fixed distance, ignores stick magnitude)</span>
                    </label>
                  ` : ""}
                </div>
              ` : b.mode === "walkToMouse" ? `
                <div>
                  ${this.renderInputSlot(b.id, "forwardTrigger", b.forwardTrigger, "Forward Drive Button (Toward Cursor)")}
                  <div style="font-size: 0.62rem; color: #64748b; margin-top: 3px;">
                    Hold to run directly toward cursor. Facing automatically follows the mouse.
                  </div>
                  <div style="margin-top: 6px;">
                    <span style="font-size: 0.62rem; color: #94a3b8; font-weight: 600;">Optional Relative Keys:</span>
                    <div style="display: flex; gap: 4px; margin-top: 2px; flex-wrap: wrap;">
                      ${renderMoveKey("Back", "reverseKey")}
                      ${renderMoveKey("Left", "strafeLeftKey")}
                      ${renderMoveKey("Right", "strafeRightKey")}
                    </div>
                  </div>
                </div>
              ` : `
                <div>
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span style="font-size: 0.64rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Directional Movement (WASD / D-Pad Buttons)</span>
                    <label style="display: inline-flex; align-items: center; gap: 3px; cursor: pointer; user-select: none;" title="Require clean tap for movement (step-by-step)">
                      <input type="checkbox" class="block-move-keys-clean-toggle" data-block-id="${b.id}" ${((_a = b.moveKeys) == null ? void 0 : _a.requireCleanPress) ? "checked" : ""} style="cursor: pointer; width: 11px; height: 11px; accent-color: #38bdf8;" />
                      <span style="font-size: 0.58rem; font-weight: 600; ${((_b = b.moveKeys) == null ? void 0 : _b.requireCleanPress) ? "color: #38bdf8;" : "color: #64748b;"}">Clean Tap</span>
                    </label>
                  </div>
                  <div style="display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap;">
                    ${renderMoveKey("↑", "upKey")}
                    ${renderMoveKey("↓", "downKey")}
                    ${renderMoveKey("←", "leftKey")}
                    ${renderMoveKey("→", "rightKey")}
                  </div>
                  <div style="font-size: 0.60rem; color: #64748b; margin-top: 3px;">
                    Only the bound buttons above move the creature. The left joystick will not move the creature in this mode.
                  </div>
                </div>
              `}
              <div>
                ${this.renderInputSlot(b.id, "jump", b.jump, "Jump / Vertical Hop")}
              </div>
              <div>
                ${this.renderInputSlot(b.id, "sprint", b.sprint, "Sprint")}
                <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 0.62rem; color: #94a3b8;">Sprint Mode:</span>
                  <select class="block-sprint-mode dev-select" data-block-id="${b.id}" style="font-size: 0.68rem; padding: 2px 6px; background: #0f172a; color: #fff; border: 1px solid rgba(148,163,184,0.3); border-radius: 3px;">
                    <option value="hold" ${b.sprint.mode !== "toggle" ? "selected" : ""}>Hold to Sprint</option>
                    <option value="toggle" ${b.sprint.mode === "toggle" ? "selected" : ""}>Toggle Sprint</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        `;
      }
      case "melee": {
        const b = block;
        b.punch = b.punch || { code: "KeyF" };
        return `
          <div style="display: flex; gap: 16px; align-items: start;">
            <div>
              ${this.renderInputSlot(b.id, "punch", b.punch, "Melee Punch / Attack")}
            </div>
            <div style="font-size: 0.68rem; color: #64748b; padding-top: 14px;">
              Strikes in the direction of the aim cursor with physical punch force and cooldown.
            </div>
          </div>
        `;
      }
      case "laser": {
        const b = block;
        b.aimTrigger = b.aimTrigger || { code: "MouseRight", gateButtons: ["AltLeft"] };
        b.fireTrigger = b.fireTrigger || { code: "MouseLeft" };
        b.powerLevel = b.powerLevel || { source: "mouseWheel", sensitivity: 1 };
        return `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; align-items: start;">
            <div>
              ${this.renderInputSlot(b.id, "aimTrigger", b.aimTrigger, "Aim Feature Trigger")}
              <div style="margin-top: 4px; display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 0.62rem; color: #94a3b8;">Aim Method (2D Input):</span>
                <select class="block-laser-aim-mode dev-select" data-block-id="${b.id}" style="font-size: 0.68rem; padding: 2px 6px; background: #0f172a; color: #fff; border: 1px solid rgba(148,163,184,0.3); border-radius: 3px;">
                  <option value="mouseWorldPos" ${b.aimMode !== "rawDirection" && b.aimMode !== "mouseScreenPos" ? "selected" : ""}>🌐 Game Cursor (Mouse World Pos)</option>
                  <option value="mouseScreenPos" ${b.aimMode === "mouseScreenPos" ? "selected" : ""}>🖥️ Screen Coordinates</option>
                  <option value="rawDirection" ${b.aimMode === "rawDirection" ? "selected" : ""}>🧭 Raw Direction Heading</option>
                </select>
              </div>
            </div>
            <div>
              ${this.renderInputSlot(b.id, "fireTrigger", b.fireTrigger, "Fire Laser Trigger")}
              <div style="margin-top: 4px;">
                <label style="display: flex; align-items: center; gap: 4px; font-size: 0.64rem; color: #94a3b8; cursor: pointer;">
                  <input type="checkbox" class="block-laser-autofire" data-block-id="${b.id}" ${b.fireTrigger.autoFireWhenAiming ? "checked" : ""} />
                  <span>Auto-fire continuously while aiming</span>
                </label>
              </div>
            </div>
            <div>
              <span style="font-size: 0.64rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Power Level (1D Input)</span>
              <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                <select class="block-laser-power-source dev-select" data-block-id="${b.id}" style="font-size: 0.68rem; padding: 2px 6px; background: #0f172a; color: #fff; border: 1px solid rgba(148,163,184,0.3); border-radius: 3px;">
                  <option value="mouseWheel" ${b.powerLevel.source === "mouseWheel" ? "selected" : ""}>🎡 Mouse Scroll Wheel</option>
                  <option value="mouseDeltaY" ${b.powerLevel.source === "mouseDeltaY" ? "selected" : ""}>🖱️ Mouse Delta Y (Vertical Drag)</option>
                  <option value="none" ${b.powerLevel.source === "none" ? "selected" : ""}>🚫 None / Fixed Power</option>
                </select>
                ${b.powerLevel.source !== "none" ? `
                  <button class="btn-block-laser-power-clear" data-block-id="${b.id}" type="button" style="font-size: 0.62rem; color: #ef4444; background: transparent; border: none; cursor: pointer; padding: 0 3px;" title="Disable power level modulation">✕</button>
                ` : ""}
              </div>
            </div>
          </div>
        `;
      }
      case "throw": {
        const b = block;
        b.mode = b.mode || "chargeAndRelease";
        b.chargeTrigger = b.chargeTrigger || { code: "MouseLeft" };
        b.aimTrigger = b.aimTrigger || { code: "MouseRight" };
        b.fireTrigger = b.fireTrigger || { code: "MouseLeft" };
        b.quickTrigger = b.quickTrigger || { code: "MouseLeft" };
        b.arcModulation = b.arcModulation || { source: "mouseDeltaY", autoCursorLock: true, sensitivity: 5e-3 };
        b.enableProximityCancel = Boolean(b.enableProximityCancel);
        b.cancelRadius = b.cancelRadius ?? 1.5;
        b.triggerMargin = b.triggerMargin ?? 0.15;
        let modeSpecificHtml = "";
        if (b.mode === "chargeAndRelease") {
          modeSpecificHtml = `
            <div>
              ${this.renderInputSlot(b.id, "chargeTrigger", b.chargeTrigger, "Charge & Release Throw Button")}
              <div style="font-size: 0.62rem; color: #64748b; margin-top: 3px;">
                Hold to charge trajectory/power, release to throw.
              </div>
            </div>
          `;
        } else if (b.mode === "triggerPullForce") {
          modeSpecificHtml = `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div>
                ${this.renderInputSlot(b.id, "chargeTrigger", b.chargeTrigger, "Analog Throw Trigger (e.g. GamepadRT)")}
                <div style="font-size: 0.62rem; color: #64748b; margin-top: 3px;">
                  Pull trigger to scale throw force & trajectory height. Releasing the trigger fires the throw.
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                <span style="font-size: 0.68rem; color: #94a3b8;">Trigger Deadzone Margin:</span>
                <input type="number" step="0.05" min="0.0" max="0.5" class="block-throw-trigger-margin dev-input" data-block-id="${b.id}" value="${b.triggerMargin ?? 0.15}" style="width: 55px; font-size: 0.72rem; padding: 2px 4px; background: #0f172a; color: #fff; border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 4px; text-align: center;" />
                <span style="font-size: 0.65rem; color: #64748b;">(0.0–0.5 threshold before force begins increasing)</span>
              </div>
            </div>
          `;
        } else if (b.mode === "holdAndRelease") {
          modeSpecificHtml = `
            <div>
              ${this.renderInputSlot(b.id, "chargeTrigger", b.chargeTrigger, "Hold to Aim & Release Button")}
              <div style="font-size: 0.62rem; color: #64748b; margin-top: 3px;">
                Hold to preview lowest energy trajectory that reaches target without charging. Release to throw.
              </div>
            </div>
          `;
        } else if (b.mode === "aimAndFire") {
          modeSpecificHtml = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
              <div>
                ${this.renderInputSlot(b.id, "aimTrigger", b.aimTrigger, "Aim Arc Preview Button")}
              </div>
              <div>
                ${this.renderInputSlot(b.id, "fireTrigger", b.fireTrigger, "Launch / Fire Throw Button")}
              </div>
              <div>
                <span style="font-size: 0.64rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Arc Modulation (1D Input)</span>
                <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                  <select class="block-throw-arc-source dev-select" data-block-id="${b.id}" style="font-size: 0.68rem; padding: 2px 6px; background: #0f172a; color: #fff; border: 1px solid rgba(148,163,184,0.3); border-radius: 3px;">
                    <option value="mouseDeltaY" ${b.arcModulation.source === "mouseDeltaY" ? "selected" : ""}>🖱️ Mouse Delta Y (Vertical Drag)</option>
                    <option value="mouseWheel" ${b.arcModulation.source === "mouseWheel" ? "selected" : ""}>🎡 Mouse Scroll Wheel</option>
                    <option value="none" ${b.arcModulation.source === "none" ? "selected" : ""}>🚫 None / Fixed Arc</option>
                  </select>
                </div>
              </div>
            </div>
          `;
        } else if (b.mode === "quickOptimal") {
          modeSpecificHtml = `
            <div>
              ${this.renderInputSlot(b.id, "quickTrigger", b.quickTrigger, "Instant Optimal Throw Button")}
              <div style="font-size: 0.62rem; color: #64748b; margin-top: 3px;">
                Throws the item immediately along the most efficient flattest ballistic arc on press.
              </div>
            </div>
          `;
        } else if (b.mode === "quickWallClear") {
          modeSpecificHtml = `
            <div>
              ${this.renderInputSlot(b.id, "quickTrigger", b.quickTrigger, "Instant Wall-Clear Throw Button")}
              <div style="font-size: 0.62rem; color: #64748b; margin-top: 3px;">
                Instantly calculates and fires the lowest energy trajectory that clears all intervening walls.
              </div>
            </div>
          `;
        } else if (b.mode === "aimWallClear") {
          modeSpecificHtml = `
            <div>
              ${this.renderInputSlot(b.id, "aimTrigger", b.aimTrigger, "Aim Wall-Clear Button")}
              <div style="font-size: 0.62rem; color: #64748b; margin-top: 3px;">
                Hold to preview lowest energy trajectory that clears intervening walls, release to fire.
              </div>
            </div>
          `;
        }
        const isHoldAndReleaseMode = b.mode === "chargeAndRelease" || b.mode === "aimWallClear" || b.mode === "holdAndRelease" || b.mode === "triggerPullForce";
        const proximityCancelHtml = isHoldAndReleaseMode ? `
            <div style="margin-top: 6px; padding-top: 8px; border-top: 1px solid rgba(148, 163, 184, 0.15); display: flex; flex-wrap: wrap; align-items: center; gap: 12px;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.72rem; color: #e2e8f0;">
                <input type="checkbox" class="block-throw-cancel-toggle" data-block-id="${b.id}" ${b.enableProximityCancel ? "checked" : ""} style="cursor: pointer; accent-color: #38bdf8;" />
                <span>Cancel throw when target pos is close to character</span>
              </label>
              ${b.enableProximityCancel ? `
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 0.68rem; color: #94a3b8;">Cancel Radius:</span>
                  <input type="number" step="0.1" min="0.2" max="10" class="block-throw-cancel-radius dev-input" data-block-id="${b.id}" value="${b.cancelRadius ?? 1.5}" style="width: 55px; font-size: 0.72rem; padding: 2px 4px; background: #0f172a; color: #fff; border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 4px; text-align: center;" />
                  <span style="font-size: 0.65rem; color: #64748b;">tiles</span>
                </div>
              ` : ""}
            </div>
          ` : "";
        return `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #38bdf8;">Trajectory Manipulation Style:</span>
              <select class="block-throw-mode dev-select" data-block-id="${b.id}" style="font-size: 0.72rem; padding: 3px 8px; background: #0f172a; color: #fff; border: 1px solid rgba(56,189,248,0.4); border-radius: 4px;">
                <option value="chargeAndRelease" ${b.mode === "chargeAndRelease" ? "selected" : ""}>🏹 Charge and Release (Bow style)</option>
                <option value="triggerPullForce" ${b.mode === "triggerPullForce" ? "selected" : ""}>🎮 Analog Trigger Pull Force (Scale Force with Trigger, Release to Fire)</option>
                <option value="holdAndRelease" ${b.mode === "holdAndRelease" ? "selected" : ""}>🏹 Hold & Release (Static Lowest Energy Arc)</option>
                <option value="aimAndFire" ${b.mode === "aimAndFire" ? "selected" : ""}>🎯 Aim & Fire (Preview button + Launch button)</option>
                <option value="quickOptimal" ${b.mode === "quickOptimal" ? "selected" : ""}>⚡ Most Efficient (Quick Optimal Arc)</option>
                <option value="quickWallClear" ${b.mode === "quickWallClear" ? "selected" : ""}>🧱 Quick Wall-Clear (Lowest Energy No Wall Collision)</option>
                <option value="aimWallClear" ${b.mode === "aimWallClear" ? "selected" : ""}>🏹 Aim Wall-Clear (Aim Lowest Energy, Release to Fire)</option>
              </select>
            </div>
            ${modeSpecificHtml}
            ${proximityCancelHtml}
          </div>
        `;
      }
      case "itemInteraction": {
        const b = block;
        b.pickup = b.pickup || { code: "MouseLeft" };
        b.drop = b.drop || { code: "KeyQ" };
        b.swap = b.swap || { code: "KeyF" };
        b.consume = b.consume || { code: "KeyE" };
        b.swapRequiresHolding = Boolean(b.swapRequiresHolding);
        b.triggerPickupWhenEmptyHanded = b.triggerPickupWhenEmptyHanded ?? true;
        return `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; align-items: start;">
              <div>
                ${this.renderInputSlot(b.id, "pickup", b.pickup, "Pick Up Ground Item")}
              </div>
              <div>
                ${this.renderInputSlot(b.id, "drop", b.drop, "Drop Held Item")}
              </div>
              <div>
                ${this.renderInputSlot(b.id, "swap", b.swap, "Swap Ground/Held Item")}
              </div>
              <div>
                ${this.renderInputSlot(b.id, "consume", b.consume, "Consume / Bite Item")}
              </div>
            </div>
            
            <!-- Prebuilt Options -->
            <div style="display: flex; flex-wrap: wrap; gap: 16px; padding-top: 8px; border-top: 1px dashed rgba(148,163,184,0.2); font-size: 0.68rem; color: #94a3b8;">
              <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                <input type="checkbox" class="block-item-swap-requires-holding" data-block-id="${b.id}" ${b.swapRequiresHolding ? "checked" : ""} />
                <span>Swap requires already holding an item (strict swap)</span>
              </label>
              <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                <input type="checkbox" class="block-item-trigger-pickup-empty" data-block-id="${b.id}" ${b.triggerPickupWhenEmptyHanded ? "checked" : ""} />
                <span>Swap button triggers pickup when empty-handed</span>
              </label>
            </div>

            <!-- Additional Pickup Slot -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="min-width: 200px;">
                ${this.renderInputSlot(b.id, "additionalPickup", b.additionalPickup, "Additional Empty-Handed Pickup Button (Optional)")}
              </div>
              <span style="font-size: 0.62rem; color: #64748b; padding-top: 12px;">Extra dedicated button to pick up when empty-handed.</span>
            </div>
          </div>
        `;
      }
      case "facing": {
        const b = block;
        b.mode = b.mode || "mouseWorldPos";
        return `
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 0.68rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Heading / Facing Direction:</span>
            <select class="block-facing-mode dev-select" data-block-id="${b.id}" style="font-size: 0.72rem; padding: 2px 8px; background: #0f172a; color: #fff; border: 1px solid rgba(148,163,184,0.3); border-radius: 4px;">
              <option value="mouseWorldPos" ${b.mode === "mouseWorldPos" ? "selected" : ""}>🎯 Face Mouse Cursor / Reticle</option>
              <option value="fromMovement" ${b.mode === "fromMovement" ? "selected" : ""}>🏃 Face Movement Vector Direction</option>
            </select>
          </div>
        `;
      }
    }
    return "";
  }
  static renderBlocksHtml(schema) {
    const blocks = this.getActiveBlocks(schema);
    const isGamepad = this.activeTab === "gamepad";
    return `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <!-- Header with Add Control Module dropdown -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 6px; padding: 8px 14px;">
          <div style="font-size: 0.74rem; color: #cbd5e1;">
            <strong style="color: #38bdf8;">${isGamepad ? "🎮 Gamepad Modular Controls" : "🧱 Modular Control System"}:</strong>
            ${isGamepad ? "Configure controller bindings with prebuilt capability modules. Click any slot to bind by pressing a controller button/trigger or key, or click <strong>✕</strong> to clear/disable." : "Each capability has its own self-contained block with prebuilt logic. Click any slot to rebind, or click <strong>✕</strong> to clear/disable."}
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <select id="select-add-control-block" class="dev-select" style="font-size: 0.72rem; font-weight: 700; padding: 4px 8px; background: rgba(56,189,248,0.15); border: 1px solid #38bdf8; color: #38bdf8; border-radius: 4px;">
              <option value="" disabled selected>+ Add Control Module...</option>
              <option value="locomotion">+ Locomotion (Move, Jump, Sprint)</option>
              <option value="itemInteraction">+ Item Interaction (Pickup, Drop, Swap, Eat)</option>
              <option value="throw">+ Throwing & Ballistics</option>
              <option value="melee">+ Melee Combat</option>
              <option value="laser">+ Laser Beam</option>
              <option value="facing">+ Heading / Facing Angle</option>
            </select>
          </div>
        </div>

        <!-- Blocks Container -->
        <div id="control-blocks-container" style="display: flex; flex-direction: column; gap: 10px;">
          ${blocks.length === 0 ? `
            <div style="text-align: center; color: #64748b; font-size: 0.76rem; padding: 24px; background: rgba(0,0,0,0.2); border-radius: 6px; border: 1px dashed rgba(148,163,184,0.2);">
              No control blocks assigned. Select an option from "+ Add Control Module" to assign controls!
            </div>
          ` : blocks.map((b) => {
      const typeIcons = {
        locomotion: "🏃",
        itemInteraction: "📦",
        throw: "🏹",
        melee: "🥊",
        laser: "⚡",
        facing: "🎯"
      };
      const icon = typeIcons[b.type] || "🎮";
      return `
              <div class="control-block-card" data-block-id="${b.id}" style="
                display: flex;
                flex-direction: column;
                gap: 8px;
                background: rgba(15, 23, 42, 0.85);
                border: 1px solid ${b.enabled ? "rgba(148, 163, 184, 0.25)" : "rgba(239, 68, 68, 0.25)"};
                border-radius: 6px;
                padding: 10px 14px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.25);
                opacity: ${b.enabled ? "1" : "0.6"};
              ">
                <!-- Block Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(148, 163, 184, 0.15); padding-bottom: 6px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.90rem;">${icon}</span>
                    <span style="font-size: 0.78rem; font-weight: 700; color: #f8fafc;">${b.name || b.type.toUpperCase()}</span>
                    <span style="font-size: 0.60rem; padding: 1px 5px; background: rgba(56,189,248,0.15); color: #38bdf8; border-radius: 3px; font-weight: 700; text-transform: uppercase;">${b.type}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="display: flex; align-items: center; gap: 4px; font-size: 0.68rem; color: #94a3b8; cursor: pointer;">
                      <input type="checkbox" class="block-toggle-enabled" data-block-id="${b.id}" ${b.enabled ? "checked" : ""} />
                      <span>Enabled</span>
                    </label>
                    <button class="btn-block-delete btn-secondary-action" data-block-id="${b.id}" type="button" style="
                      font-size: 0.66rem;
                      color: #ef4444;
                      padding: 2px 6px;
                      border: 1px solid rgba(239, 68, 68, 0.3);
                      background: rgba(239, 68, 68, 0.1);
                      border-radius: 3px;
                      cursor: pointer;
                    " title="Remove this control module">🗑️ Remove</button>
                  </div>
                </div>

                <!-- Block Body -->
                <div class="control-block-body">
                  ${this.renderBlockBodyHtml(b)}
                </div>
              </div>
            `;
    }).join("")}
        </div>
      </div>
    `;
  }
  static startBlockKeyListening(blockId, slotName, gateIdx, isMoveKey) {
    if (this.recorderCleanup) {
      this.recorderCleanup();
      this.recorderCleanup = null;
    }
    this.listeningBlockTarget = { blockId, slotName, gateIdx, isMoveKey };
    this.renderActiveView();
    const commitTrigger = (code) => {
      const schema = this.workingSchema;
      if (!schema) return;
      const blocks = this.getActiveBlocks(schema);
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;
      if (isMoveKey && block.type === "locomotion") {
        const loco = block;
        if (isMoveKey === "reverseKey" || isMoveKey === "strafeLeftKey" || isMoveKey === "strafeRightKey") {
          loco[isMoveKey] = code;
        } else {
          loco.moveKeys = loco.moveKeys || {};
          loco.moveKeys[isMoveKey] = code;
        }
      } else {
        const slot = block[slotName];
        if (gateIdx !== void 0) {
          if (slot && slot.gateButtons) {
            slot.gateButtons[gateIdx] = code;
          }
        } else {
          if (slot) {
            slot.code = code;
          } else {
            block[slotName] = { code };
          }
        }
      }
      _ControlsInspector.syncLiveWorkingSchema();
      cleanup();
      this.listeningBlockTarget = null;
      this.renderActiveView();
    };
    let isGamepadPolling = true;
    let animId = null;
    const pollGamepad = () => {
      if (!isGamepadPolling) return;
      const gamepads = typeof navigator.getGamepads === "function" ? navigator.getGamepads() : [];
      for (let g = 0; g < gamepads.length; g++) {
        const gp = gamepads[g];
        if (!gp) continue;
        for (let b = 0; b < gp.buttons.length; b++) {
          if (gp.buttons[b].pressed || gp.buttons[b].value > 0.5) {
            const code = ControlSchemaArbiter.formatGamepadButtonIndex(b);
            commitTrigger(code);
            return;
          }
        }
      }
      animId = requestAnimationFrame(pollGamepad);
    };
    animId = requestAnimationFrame(pollGamepad);
    const onKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "Escape") {
        cleanup();
        this.listeningBlockTarget = null;
        this.renderActiveView();
        return;
      }
      commitTrigger(e.code);
    };
    const onMouseDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const buttonMap = {
        0: "MouseLeft",
        1: "MouseMiddle",
        2: "MouseRight",
        3: "MouseBack",
        4: "MouseForward"
      };
      commitTrigger(buttonMap[e.button] || `MouseButton${e.button}`);
    };
    const cleanup = () => {
      isGamepadPolling = false;
      if (animId !== null) cancelAnimationFrame(animId);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("mousedown", onMouseDown, true);
      if (this.popoutWindow && !this.popoutWindow.closed) {
        this.popoutWindow.removeEventListener("keydown", onKeyDown, true);
        this.popoutWindow.removeEventListener("mousedown", onMouseDown, true);
      }
      this.recorderCleanup = null;
    };
    this.recorderCleanup = cleanup;
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("mousedown", onMouseDown, true);
    if (this.popoutWindow && !this.popoutWindow.closed) {
      this.popoutWindow.addEventListener("keydown", onKeyDown, true);
      this.popoutWindow.addEventListener("mousedown", onMouseDown, true);
    }
  }
  static renderParadigmsHtml(schema) {
    var _a, _b, _c, _d, _e;
    if (this.activeTab === "keyboardMouse") {
      const cfg = schema.keyboardMouse;
      const isFwd = cfg.locomotion.mode === "forwardFacingDrive";
      const fwdCode = ((_a = cfg.locomotion.forwardTrigger) == null ? void 0 : _a.code) || "MouseRight";
      const isListeningFwd = this.listeningForwardTrigger;
      const renderLocoKeyRow = (label, keyName) => {
        const val = cfg.locomotion[keyName];
        const isListening = this.listeningLocoKey === keyName;
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.4); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(148, 163, 184, 0.18);">
            <span style="font-size: 0.74rem; color: #94a3b8; font-weight: 500;">${label}:</span>
            <div style="display: flex; gap: 4px; align-items: center;">
              <button data-loco-key="${keyName}" class="btn-bind-loco-key btn-secondary-action" style="font-size: 0.74rem; padding: 2px 8px; font-weight: 600; border: 1px solid rgba(148, 163, 184, 0.25); background: rgba(255, 255, 255, 0.05); ${isListening ? "background: #ef4444; color: #fff; animation: pulse 1s infinite;" : val ? "color: #ffffff;" : "color: #64748b; font-style: italic;"}">
                ${isListening ? "🔴 Press key..." : val ? `⌨️ ${val}` : "(Unbound)"}
              </button>
              ${val ? `<button data-clear-loco-key="${keyName}" class="btn-clear-loco-key btn-icon" style="padding: 2px 6px; font-size: 0.70rem; color: #94a3b8; background: transparent; border: 1px solid rgba(148, 163, 184, 0.2);" title="Unbind key">✕</button>` : ""}
            </div>
          </div>
        `;
      };
      return `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 0.76rem; color: #ffffff; font-weight: 600;">Locomotion Mode:</label>
            <select id="select-loco-mode" class="dev-select" style="width: 58%; font-size: 0.74rem; color: #ffffff; background: #0f172a; border: 1px solid rgba(148, 163, 184, 0.25);">
              <option value="directVector" ${cfg.locomotion.mode === "directVector" ? "selected" : ""}>Direct 8-Way (WASD)</option>
              <option value="forwardFacingDrive" ${isFwd ? "selected" : ""}>Forward-Facing Drive (Move to Mouse)</option>
            </select>
          </div>

          ${isFwd ? `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.04); padding: 6px 8px; border-radius: 4px; border: 1px solid rgba(148, 163, 184, 0.2);">
              <span style="font-size: 0.74rem; color: #ffffff; font-weight: 600;">Forward Drive Trigger:</span>
              <button id="btn-bind-fwd-trigger" class="btn-secondary-action" style="font-size: 0.74rem; padding: 2px 8px; font-weight: 600; border: 1px solid rgba(148, 163, 184, 0.25); background: rgba(255, 255, 255, 0.05); ${isListeningFwd ? "background: #ef4444; color: #fff; animation: pulse 1s infinite;" : "color: #ffffff;"}">
                ${isListeningFwd ? "🔴 Press key/mouse..." : `⌨️ ${fwdCode}`}
              </button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 2px;">
              ${renderLocoKeyRow("Reverse (Optional)", "reverseKey")}
              ${renderLocoKeyRow("Strafe Left (Optional)", "strafeLeftKey")}
              ${renderLocoKeyRow("Strafe Right (Optional)", "strafeRightKey")}
            </div>
            <span style="font-size: 0.70rem; color: #94a3b8; line-height: 1.3;">
              Creature faces mouse cursor. Drive trigger moves forward. Reverse and strafe keys are optional — click ✕ to unbind them and free A, S, D for abilities.
            </span>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${renderLocoKeyRow("Move Forward / Up", "moveForwardKey")}
              ${renderLocoKeyRow("Move Backward / Down", "reverseKey")}
              ${renderLocoKeyRow("Strafe Left", "strafeLeftKey")}
              ${renderLocoKeyRow("Strafe Right", "strafeRightKey")}
            </div>
            <span style="font-size: 0.70rem; color: #64748b; line-height: 1.3;">
              Direct directional movement. Unbound keys will produce zero movement.
            </span>
          `}

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 0.76rem; color: #cbd5e1; font-weight: 600;">Aiming Mode:</label>
            <select id="select-aim-mode" class="dev-select" style="width: 58%; font-size: 0.74rem;">
              <option value="faceMouseCursor" ${cfg.aiming.mode === "faceMouseCursor" ? "selected" : ""}>Face Mouse Cursor</option>
              <option value="faceMovement" ${cfg.aiming.mode === "faceMovement" ? "selected" : ""}>Face Movement Direction</option>
            </select>
          </div>
        </div>
      `;
    }
    if (this.activeTab === "gamepad") {
      const cfg = schema.gamepad;
      return `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 0.76rem; color: #cbd5e1; font-weight: 600;">Left Stick Primary:</label>
            <select id="select-pad-left-primary" class="dev-select" style="width: 58%; font-size: 0.74rem;">
              <option value="directLocomotion" ${cfg.leftStick.primaryMode === "directLocomotion" ? "selected" : ""}>Direct Locomotion (Walk)</option>
              <option value="cursorSteer" ${cfg.leftStick.primaryMode === "cursorSteer" ? "selected" : ""}>Cursor Reticle Steer</option>
            </select>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 0.76rem; color: #cbd5e1; font-weight: 600;">Dynamic Override:</label>
            <select id="select-pad-dynamic-override" class="dev-select" style="width: 58%; font-size: 0.74rem;">
              <option value="never" ${((_b = cfg.leftStick.dynamicOverride) == null ? void 0 : _b.triggerCondition) === "never" ? "selected" : ""}>Disabled (Always Primary)</option>
              <option value="whenLtHeld" ${((_c = cfg.leftStick.dynamicOverride) == null ? void 0 : _c.triggerCondition) === "whenLtHeld" ? "selected" : ""}>When Left Trigger (LT) Held</option>
              <option value="whenAiming" ${((_d = cfg.leftStick.dynamicOverride) == null ? void 0 : _d.triggerCondition) === "whenAiming" ? "selected" : ""}>When Aiming Ability (Laser/Throw)</option>
              <option value="whenHoldingItem" ${((_e = cfg.leftStick.dynamicOverride) == null ? void 0 : _e.triggerCondition) === "whenHoldingItem" ? "selected" : ""}>When Holding Any Object</option>
            </select>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 0.76rem; color: #cbd5e1; font-weight: 600;">Right Stick:</label>
            <select id="select-pad-right-mode" class="dev-select" style="width: 58%; font-size: 0.74rem;">
              <option value="twinStickAim" ${cfg.rightStick.mode === "twinStickAim" ? "selected" : ""}>Twin Stick 360 Aim</option>
              <option value="disabled" ${cfg.rightStick.mode === "disabled" ? "selected" : ""}>Disabled</option>
            </select>
          </div>
        </div>
      `;
    }
    return `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <span style="font-size: 0.76rem; color: #38bdf8; font-weight: 600;">📱 Mobile Virtual Joysticks & Action Buttons</span>
        <span style="font-size: 0.70rem; color: #94a3b8; line-height: 1.3;">
          Supports multi-joystick layouts with concentric walk/sprint rings, dynamic follow-drag centers, tap-to-trigger actions, and responsive screen anchors.
        </span>
      </div>
    `;
  }
  static renderRulesListHtml(char, schema) {
    var _a;
    const rules = this.activeTab === "keyboardMouse" ? schema.keyboardMouse.rules : this.activeTab === "gamepad" ? schema.gamepad.rules : schema.touch.rules;
    const tags = this.getActiveDeviceTags(schema);
    const stageGroups = this.getActiveStageGroups(schema);
    for (const rule of rules) {
      if (rule.tagId) {
        const mode = ((_a = rule.trigger) == null ? void 0 : _a.mode) || "press";
        const condType = mode === "hold" ? "tagHeld" : mode === "release" ? "tagReleased" : "tagPressed";
        const conds = ControlSchemaArbiter.getRuleConditions(rule);
        if (conds.length === 1 && conds[0].type === "always") {
          rule.conditions = [{ type: condType, param: rule.tagId }];
        } else if (!conds.some((c) => c.type === "tagHeld" || c.type === "tagPressed" || c.type === "tagReleased")) {
          rule.conditions = [{ type: condType, param: rule.tagId }, ...conds];
        } else {
          rule.conditions = conds;
        }
        rule.condition = rule.conditions[0];
        if (!rule.threadId) {
          rule.threadId = `thread-${rule.tagId}`;
        }
        rule.tagId = void 0;
        rule.trigger = { device: "keyboard", code: "Always", mode: "hold" };
      }
      if (!rule.threadId) {
        rule.threadId = `thread-${rule.id}`;
      }
    }
    if (rules.length === 0) {
      return `
        <div style="text-align: center; color: #94a3b8; font-size: 0.76rem; padding: 18px; background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 6px;">
          No conditional threads defined. Click "+ Add New Conditional Thread" to build a control cascade.
        </div>
      `;
    }
    const renderActionStatementHtml = (rule, act, sIdx, totalStmts) => {
      const actionDef = ControlActionCatalog.findAction(act.moduleId, act.intent);
      const actionLabel = actionDef ? actionDef.label : `${act.moduleId}:${act.intent}`;
      const cat = ControlActionCatalog.categories.find((c) => c.id === act.moduleId);
      const isModuleMissing = cat && !cat.isAttached(char);
      return `
        <div class="then-statement-action" style="display: flex; align-items: center; justify-content: space-between; gap: 6px; background: rgba(255,255,255,0.02); border: 1px solid rgba(148,163,184,0.15); border-radius: 3px; padding: 2px 6px;">
          <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;">
            <span style="font-size: 0.62rem; color: #94a3b8; width: 14px;">${sIdx + 1}.</span>
            <button class="btn-open-action-picker btn-secondary-action" data-rule-id="${rule.id}" data-statement-idx="${sIdx}" style="font-size: 0.68rem; padding: 2px 8px; color: #ffffff; border: 1px solid rgba(148,163,184,0.25); background: rgba(255,255,255,0.05); border-radius: 3px; text-align: left; flex: 1;" title="Change Action Function">
              ${actionLabel} ▼
            </button>
            ${act.moduleId === "staging" ? (() => {
        var _a2, _b;
        const currentGroup = ((_a2 = act.args) == null ? void 0 : _a2.group) || ((_b = stageGroups[0]) == null ? void 0 : _b.name) || "default";
        const stagesInGroup = _ControlsInspector.getStagesForGroup(schema, currentGroup);
        return `
                <select class="select-action-stage-group dev-select" data-rule-id="${rule.id}" data-statement-idx="${sIdx}" style="font-size: 0.68rem; padding: 1px 4px; color: #a78bfa; border: 1px solid rgba(167,139,250,0.3); background: #0f172a; max-width: 95px;" title="Target Stage Set">
                  ${stageGroups.map((g) => `<option value="${g.name}" ${currentGroup === g.name ? "selected" : ""}>📁 ${g.name}</option>`).join("")}
                </select>
                <select class="select-action-stage dev-select" data-rule-id="${rule.id}" data-statement-idx="${sIdx}" style="font-size: 0.68rem; padding: 1px 6px; color: #ffffff; border: 1px solid rgba(148,163,184,0.25); background: #0f172a; max-width: 105px;" title="Target Stage within ${currentGroup}">
                  ${stagesInGroup.map((stg) => {
          var _a3;
          return `<option value="${stg}" ${(((_a3 = act.args) == null ? void 0 : _a3.stage) || "none") === stg ? "selected" : ""}>🎭 ${stg}</option>`;
        }).join("")}
                </select>
              `;
      })() : ""}
            ${isModuleMissing ? `<span style="font-size: 0.58rem; color: #94a3b8;" title="Character lacks this behavior module">⚠️ Missing</span>` : ""}
          </div>
          <div style="display: flex; align-items: center; gap: 3px; flex-shrink: 0;">
            <button class="btn-move-statement-up btn-icon" data-rule-id="${rule.id}" data-statement-idx="${sIdx}" style="font-size: 0.58rem; padding: 1px 4px; color: ${sIdx > 0 ? "#ffffff" : "#475569"}; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: ${sIdx > 0 ? "pointer" : "default"};" ${sIdx === 0 ? "disabled" : ""} title="Move Action Up">▲</button>
            <button class="btn-move-statement-down btn-icon" data-rule-id="${rule.id}" data-statement-idx="${sIdx}" style="font-size: 0.58rem; padding: 1px 4px; color: ${sIdx < totalStmts - 1 ? "#ffffff" : "#475569"}; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: ${sIdx < totalStmts - 1 ? "pointer" : "default"};" ${sIdx === totalStmts - 1 ? "disabled" : ""} title="Move Action Down">▼</button>
            <button class="btn-delete-statement btn-icon" data-rule-id="${rule.id}" data-statement-idx="${sIdx}" style="font-size: 0.58rem; padding: 1px 4px; color: #94a3b8; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: pointer;" title="Remove Action">✕</button>
          </div>
        </div>
      `;
    };
    const renderNestedThreadStatementHtml = (parentRule, stmt, sIdx, totalStmts, depth) => {
      const threadRules = stmt.rules;
      const bg = "rgba(10, 15, 29, 0.85)";
      const border = "rgba(148, 163, 184, 0.25)";
      return `
        <div class="control-thread-card nested-thread-card" data-parent-rule-id="${parentRule.id}" data-thread-id="${stmt.threadId}" style="display: flex; flex-direction: column; gap: 6px; background: ${bg}; border: 1px solid ${border}; border-radius: 6px; padding: 8px 10px; margin-top: 3px; margin-bottom: 3px;">
          <!-- Nested Thread Card Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(148, 163, 184, 0.15); padding-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 0.62rem; color: #94a3b8; width: 14px;">${sIdx + 1}.</span>
              <span style="font-size: 0.66rem; font-weight: 700; color: #ffffff; letter-spacing: 0.03em;">🔀 Nested Cascade Block</span>
            </div>
            <div style="display: flex; align-items: center; gap: 3px;">
              <button class="btn-move-statement-up btn-icon" data-rule-id="${parentRule.id}" data-statement-idx="${sIdx}" style="font-size: 0.58rem; padding: 1px 4px; color: ${sIdx > 0 ? "#ffffff" : "#475569"}; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: ${sIdx > 0 ? "pointer" : "default"};" ${sIdx === 0 ? "disabled" : ""} title="Move Nested Thread Up">▲ Thread</button>
              <button class="btn-move-statement-down btn-icon" data-rule-id="${parentRule.id}" data-statement-idx="${sIdx}" style="font-size: 0.58rem; padding: 1px 4px; color: ${sIdx < totalStmts - 1 ? "#ffffff" : "#475569"}; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: ${sIdx < totalStmts - 1 ? "pointer" : "default"};" ${sIdx === totalStmts - 1 ? "disabled" : ""} title="Move Nested Thread Down">▼ Thread</button>
              <button class="btn-delete-statement btn-icon" data-rule-id="${parentRule.id}" data-statement-idx="${sIdx}" style="font-size: 0.58rem; padding: 1px 4px; color: #94a3b8; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: pointer;" title="Remove Entire Nested Thread">🗑️</button>
            </div>
          </div>

          <!-- Cascade Branches in Block -->
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${threadRules.map((r, rIdx) => {
        const isLast = rIdx === threadRules.length - 1;
        const conds = ControlSchemaArbiter.getRuleConditions(r);
        const isAlways = conds.length === 1 && conds[0].type === "always";
        const badge = rIdx === 0 ? "IF" : isLast && isAlways ? "ELSE" : "ELSE IF";
        return renderBranchRowHtml(r, badge, depth, rIdx, threadRules.length, stmt.threadId);
      }).join("")}
          </div>

          <!-- Add Branch to this Cascade Block -->
          <div style="display: flex; justify-content: flex-start; margin-top: 2px;">
            <button class="btn-add-thread-branch btn-secondary-action" data-thread-id="${stmt.threadId}" style="font-size: 0.64rem; padding: 3px 8px; color: #ffffff; border: 1px dashed rgba(148, 163, 184, 0.3); background: rgba(255, 255, 255, 0.03); border-radius: 4px; cursor: pointer;">
              + Add Else If Branch
            </button>
          </div>
        </div>
      `;
    };
    const renderConditionTreeHtml = (rule, condList, op, parentPath, depth = 0) => {
      const isRoot = parentPath === "";
      return `
        <div style="display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px;">
          ${condList.map((cond, cIdx) => {
        const currentPath = parentPath !== "" ? `${parentPath}.${cIdx}` : `${cIdx}`;
        const opBadgeHtml = cIdx > 0 ? `
                <button class="btn-toggle-cond-op" data-rule-id="${rule.id}" data-group-path="${parentPath}" type="button" style="font-size: 0.60rem; font-weight: 800; color: ${op === "or" ? "#f59e0b" : "#38bdf8"}; background: ${op === "or" ? "rgba(245, 158, 11, 0.15)" : "rgba(56, 189, 248, 0.15)"}; border: 1px solid ${op === "or" ? "rgba(245, 158, 11, 0.4)" : "rgba(56, 189, 248, 0.4)"}; border-radius: 3px; padding: 0 4px; cursor: pointer; text-transform: uppercase;" title="Click to toggle between AND / OR">${op.toUpperCase()}</button>
              ` : "";
        if (cond.type === "group") {
          const groupOp = cond.op || "or";
          const subConds = cond.conditions || [];
          return `
                  ${opBadgeHtml}
                  <div class="cond-group-block" style="display: inline-flex; align-items: center; gap: 3px; background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 4px; padding: 1px 4px;">
                    <span style="font-size: 0.82rem; font-weight: 800; color: #c084fc; user-select: none;">(</span>
                    ${renderConditionTreeHtml(rule, subConds, groupOp, currentPath, depth + 1)}
                    <span style="font-size: 0.82rem; font-weight: 800; color: #c084fc; user-select: none;">)</span>
                    <button class="btn-delete-condition btn-icon" data-rule-id="${rule.id}" data-cond-path="${currentPath}" type="button" style="font-size: 0.58rem; padding: 0 3px; color: #f87171; background: transparent; border: 1px solid rgba(248, 113, 113, 0.3); border-radius: 2px; cursor: pointer;" title="Remove Condition Group">✕</button>
                  </div>
                `;
        }
        return `
                ${opBadgeHtml}
                <div style="display: inline-flex; align-items: center; gap: 3px; background: rgba(255,255,255,0.04); border: 1px solid rgba(148,163,184,0.2); border-radius: 3px; padding: 1px 4px;">
                  <select class="select-rule-cond dev-select" data-rule-id="${rule.id}" data-cond-path="${currentPath}" style="font-size: 0.68rem; padding: 1px 4px; color: #ffffff; border: 1px solid rgba(148,163,184,0.2); background: #0f172a;">
                    <optgroup label="🎮 Keybind / Control Inputs">
                      <option value="tagPressed" ${cond.type === "tagPressed" ? "selected" : ""}>Keybind: Press</option>
                      <option value="tagHeld" ${cond.type === "tagHeld" ? "selected" : ""}>Keybind: Hold</option>
                      <option value="tagReleased" ${cond.type === "tagReleased" ? "selected" : ""}>Keybind: Release</option>
                      <option value="buttonHeld" ${cond.type === "buttonHeld" ? "selected" : ""}>Raw Key/Button Code...</option>
                    </optgroup>
                    <optgroup label="🌍 Game Conditions">
                      <option value="always" ${cond.type === "always" ? "selected" : ""}>Always (Unconditional)</option>
                      <option value="stagedActionIs" ${cond.type === "stagedActionIs" ? "selected" : ""}>Stage Is...</option>
                      <option value="emptyHanded" ${cond.type === "emptyHanded" ? "selected" : ""}>Empty-Handed</option>
                      <option value="holdingPlainObject" ${cond.type === "holdingPlainObject" || cond.type === "holdingObjectWithoutAbility" ? "selected" : ""}>Holding Plain Item (No Ability)</option>
                      <option value="holdingItemWithPrimaryAbility" ${cond.type === "holdingItemWithPrimaryAbility" || cond.type === "holdingEdible" ? "selected" : ""}>Holding Item With Ability</option>
                      <option value="holdingObject" ${cond.type === "holdingObject" ? "selected" : ""}>Holding Any Item</option>
                      <option value="targetInReach" ${cond.type === "targetInReach" ? "selected" : ""}>Target in Reach</option>
                      <option value="grounded" ${cond.type === "grounded" ? "selected" : ""}>On Ground</option>
                      <option value="climbing" ${cond.type === "climbing" ? "selected" : ""}>Climbing Wall</option>
                      <option value="isAimingTrajectory" ${cond.type === "isAimingTrajectory" ? "selected" : ""}>Aiming Trajectory (Throw)</option>
                      <option value="isLaserAiming" ${cond.type === "isLaserAiming" ? "selected" : ""}>Aiming Laser</option>
                      <option value="isAiming" ${cond.type === "isAiming" ? "selected" : ""}>Aiming (Any)</option>
                    </optgroup>
                  </select>
                  ${cond.type === "tagPressed" || cond.type === "tagHeld" || cond.type === "tagReleased" ? `
                    <select class="select-cond-tag dev-select" data-rule-id="${rule.id}" data-cond-path="${currentPath}" style="font-size: 0.68rem; padding: 1px 4px; max-width: 140px; color: #ffffff; border: 1px solid rgba(148,163,184,0.2); background: #0f172a;" title="Select keybind tag to check">
                      ${tags.map((tg) => `<option value="${tg.id}" ${cond.param === tg.id || cond.param === tg.name ? "selected" : ""}>🏷️ ${tg.name}</option>`).join("")}
                    </select>
                  ` : cond.type === "stagedActionIs" ? (() => {
          var _a2;
          const currentGroup = cond.stageGroup || ((_a2 = stageGroups[0]) == null ? void 0 : _a2.name) || "default";
          const stagesInGroup = _ControlsInspector.getStagesForGroup(schema, currentGroup);
          return `
                          <select class="select-cond-stage-group dev-select" data-rule-id="${rule.id}" data-cond-path="${currentPath}" style="font-size: 0.68rem; padding: 1px 4px; max-width: 95px; color: #a78bfa; border: 1px solid rgba(167,139,250,0.3); background: #0f172a;" title="Stage Set">
                            ${stageGroups.map((g) => `<option value="${g.name}" ${currentGroup === g.name ? "selected" : ""}>📁 ${g.name}</option>`).join("")}
                          </select>
                          <select class="select-cond-stage dev-select" data-rule-id="${rule.id}" data-cond-path="${currentPath}" style="font-size: 0.68rem; padding: 1px 4px; max-width: 105px; color: #ffffff; border: 1px solid rgba(148,163,184,0.2); background: #0f172a;" title="Stage within ${currentGroup}">
                            ${stagesInGroup.map((stg) => `<option value="${stg}" ${(cond.param || "none") === stg ? "selected" : ""}>🎭 ${stg}</option>`).join("")}
                          </select>
                        `;
        })() : cond.type === "buttonHeld" ? `<input class="input-cond-param dev-input" data-rule-id="${rule.id}" data-cond-path="${currentPath}" value="${cond.param ?? "MouseRight"}" placeholder="e.g. MouseRight" style="font-size: 0.68rem; padding: 1px 4px; width: 90px; color: #ffffff; border: 1px solid rgba(148,163,184,0.2); background: #0f172a;" />` : ""}
                  ${condList.length > 1 || !isRoot ? `<button class="btn-delete-condition btn-icon" data-rule-id="${rule.id}" data-cond-path="${currentPath}" type="button" style="font-size: 0.58rem; padding: 0 3px; color: #94a3b8; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: pointer;" title="Remove Condition">✕</button>` : ""}
                </div>
              `;
      }).join("")}
          <button class="btn-add-condition btn-secondary-action" data-rule-id="${rule.id}" data-group-path="${parentPath}" type="button" style="font-size: 0.60rem; padding: 1px 5px; color: #ffffff; border: 1px solid rgba(148,163,184,0.25); background: rgba(255,255,255,0.04); border-radius: 3px;" title="Add condition">+ Cond</button>
          <button class="btn-add-cond-group btn-secondary-action" data-rule-id="${rule.id}" data-group-path="${parentPath}" type="button" style="font-size: 0.60rem; padding: 1px 5px; color: #c084fc; border: 1px solid rgba(168,85,247,0.35); background: rgba(168,85,247,0.1); border-radius: 3px;" title="Add nested condition group (OR / AND)">${isRoot ? "+ (Group)" : "+ ( )"}</button>
        </div>
      `;
    };
    const renderBranchRowHtml = (rule, branchBadge, depth = 0, branchIdx = 0, totalBranches = 1, threadId = "") => {
      const conds = ControlSchemaArbiter.getRuleConditions(rule);
      const rootOp = rule.conditionOp || "and";
      const statements = ControlSchemaArbiter.getRuleBody(rule);
      return `
        <div class="thread-branch-block" id="rule-card-${rule.id}" style="display: flex; flex-direction: column; gap: 6px; background: rgba(0, 0, 0, 0.28); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 5px; padding: 7px 10px;">
          <!-- Top Row: Branch Label + Status Pip + Horizontally Stacked Conditions with Nested Groups -->
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px;">
            <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px; flex: 1; min-width: 0;">
              <span class="rule-status-pip" id="pip-${rule.id}" style="width: 7px; height: 7px; border-radius: 50%; background: #475569; flex-shrink: 0;" title="Live Condition Status"></span>

              <span style="font-size: 0.66rem; font-weight: 700; color: #ffffff; background: rgba(255,255,255,0.08); border: 1px solid rgba(148,163,184,0.25); padding: 1px 6px; border-radius: 3px; letter-spacing: 0.04em;">
                ${branchBadge}:
              </span>

              <!-- Stacked Conditions (Listed Horizontally with Nested Groups) -->
              ${renderConditionTreeHtml(rule, conds, rootOp, "")}
            </div>

            <!-- Branch Reorder & Delete Buttons -->
            <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
              ${totalBranches > 1 ? `
                <button class="btn-move-branch-up btn-icon" data-thread-id="${threadId}" data-branch-idx="${branchIdx}" style="font-size: 0.58rem; padding: 1px 4px; color: ${branchIdx > 0 ? "#ffffff" : "#475569"}; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: ${branchIdx > 0 ? "pointer" : "default"};" ${branchIdx === 0 ? "disabled" : ""} title="Move Branch Up">▲</button>
                <button class="btn-move-branch-down btn-icon" data-thread-id="${threadId}" data-branch-idx="${branchIdx}" style="font-size: 0.58rem; padding: 1px 4px; color: ${branchIdx < totalBranches - 1 ? "#ffffff" : "#475569"}; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: ${branchIdx < totalBranches - 1 ? "pointer" : "default"};" ${branchIdx === totalBranches - 1 ? "disabled" : ""} title="Move Branch Down">▼</button>
              ` : ""}
              <button class="btn-delete-rule btn-secondary-action" data-rule-id="${rule.id}" style="flex: 0 0 20px; width: 20px; height: 20px; padding: 0; display: inline-flex; align-items: center; justify-content: center; color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2); font-size: 0.66rem; border-radius: 3px; background: transparent; cursor: pointer;" title="Remove Branch">
                🗑️
              </button>
            </div>
          </div>

          <!-- Bottom Block: THEN Action Execution (Stacked Vertically Like Classic Code) -->
          <div style="display: flex; flex-direction: column; gap: 4px; padding-left: 14px; border-left: 2px solid rgba(148, 163, 184, 0.25); margin-left: 6px; margin-top: 3px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 0.66rem; font-weight: 700; color: #ffffff; letter-spacing: 0.04em;">
                THEN:
              </span>
              <div style="display: flex; gap: 4px;">
                <button class="btn-add-action btn-secondary-action" data-rule-id="${rule.id}" style="font-size: 0.60rem; padding: 1px 6px; color: #ffffff; border: 1px solid rgba(148,163,184,0.25); background: rgba(255,255,255,0.04); border-radius: 3px; cursor: pointer;" title="Add action function">+ Add Action</button>
                <button class="btn-add-nested-thread btn-secondary-action" data-rule-id="${rule.id}" style="font-size: 0.60rem; padding: 1px 6px; color: #ffffff; border: 1px solid rgba(148,163,184,0.25); background: rgba(255,255,255,0.04); border-radius: 3px; cursor: pointer;" title="Add nested IF/THEN block inside this action">+ Add Nested Thread</button>
              </div>
            </div>

            <!-- Vertically Ordered Statements in THEN Body (Actions & Nested Cascade Blocks Interleaved) -->
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${statements.length === 0 ? `<div style="font-size: 0.62rem; color: #64748b; font-style: italic; padding: 2px 4px;">No actions or nested blocks in this THEN body.</div>` : statements.map((stmt, sIdx) => {
        if (stmt.type === "action") {
          return renderActionStatementHtml(rule, stmt.action, sIdx, statements.length);
        } else {
          return renderNestedThreadStatementHtml(rule, stmt, sIdx, statements.length, depth + 1);
        }
      }).join("")}
            </div>
          </div>
        </div>
      `;
    };
    const renderCascadeBlocksHtml = (ruleList, depth = 0) => {
      const threadMap = /* @__PURE__ */ new Map();
      for (const rule of ruleList) {
        if (!rule.threadId) {
          rule.threadId = `thread-${rule.id}`;
        }
        const tId = rule.threadId;
        if (!threadMap.has(tId)) threadMap.set(tId, []);
        threadMap.get(tId).push(rule);
      }
      const threadCards = [];
      const totalBlocks = threadMap.size;
      let bIdx = 0;
      for (const [tId, threadRules] of threadMap.entries()) {
        const bg = depth === 0 ? "rgba(15, 23, 42, 0.7)" : "rgba(10, 15, 29, 0.85)";
        const border = depth === 0 ? "rgba(148, 163, 184, 0.2)" : "rgba(148, 163, 184, 0.25)";
        threadCards.push(`
          <div class="control-thread-card" style="display: flex; flex-direction: column; gap: 8px; background: ${bg}; border: 1px solid ${border}; border-radius: 6px; padding: ${depth === 0 ? "10px 12px" : "8px 10px"}; margin-top: ${depth > 0 ? "6px" : "0"};">
            ${depth === 0 && totalBlocks > 1 ? `
              <!-- Top-level Block Reorder Controls -->
              <div style="display: flex; justify-content: flex-end; align-items: center; gap: 4px; margin-bottom: -2px;">
                <button class="btn-move-cascade-block-up btn-icon" data-thread-id="${tId}" style="font-size: 0.58rem; padding: 1px 6px; color: ${bIdx > 0 ? "#ffffff" : "#475569"}; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: ${bIdx > 0 ? "pointer" : "default"};" ${bIdx === 0 ? "disabled" : ""} title="Move Entire Block Up">▲ Block</button>
                <button class="btn-move-cascade-block-down btn-icon" data-thread-id="${tId}" style="font-size: 0.58rem; padding: 1px 6px; color: ${bIdx < totalBlocks - 1 ? "#ffffff" : "#475569"}; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: ${bIdx < totalBlocks - 1 ? "pointer" : "default"};" ${bIdx === totalBlocks - 1 ? "disabled" : ""} title="Move Entire Block Down">▼ Block</button>
              </div>
            ` : ""}

            <!-- Cascade Branches in Block -->
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${threadRules.map((r, rIdx) => {
          const isLast = rIdx === threadRules.length - 1;
          const conds = ControlSchemaArbiter.getRuleConditions(r);
          const isAlways = conds.length === 1 && conds[0].type === "always";
          const badge = rIdx === 0 ? "IF" : isLast && isAlways ? "ELSE" : "ELSE IF";
          return renderBranchRowHtml(r, badge, depth, rIdx, threadRules.length, tId);
        }).join("")}
            </div>

            <!-- Add Branch to this Cascade Block -->
            <div style="display: flex; justify-content: flex-start; margin-top: 2px;">
              <button class="btn-add-thread-branch btn-secondary-action" data-thread-id="${tId}" style="font-size: 0.64rem; padding: 3px 8px; color: #ffffff; border: 1px dashed rgba(148, 163, 184, 0.3); background: rgba(255, 255, 255, 0.03); border-radius: 4px; cursor: pointer;">
                + Add Else If Branch
              </button>
            </div>
          </div>
        `);
        bIdx++;
      }
      return threadCards.join("");
    };
    return `
      ${renderCascadeBlocksHtml(rules, 0)}
      <div style="display: flex; justify-content: flex-end; margin-top: 6px;">
        <button id="btn-add-control-thread" class="btn-secondary-action" style="font-size: 0.72rem; padding: 4px 12px; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.35); background: rgba(255, 255, 255, 0.08); font-weight: 600; cursor: pointer;">
          + Add Cascade Block
        </button>
      </div>
    `;
  }
  static formatTriggerLabel(item) {
    const t = "trigger" in item ? item.trigger : item;
    const devIcon = t.device === "keyboard" ? "⌨️" : t.device === "mouse" ? "🖱️" : "🎮";
    const chord = t.chordModifiers && t.chordModifiers.length > 0 ? `${t.chordModifiers.join("+")} + ` : "";
    return `${devIcon} ${chord}${t.code}`;
  }
  // --- Event Listeners Attachment ---
  static attachEventListeners(root) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s;
    if (!this.modalChar || !this.workingSchema) return;
    const char = this.modalChar;
    const schema = this.workingSchema;
    const prefab = char.prefabId ? prefabManager.get(char.prefabId) : void 0;
    (_a = root.querySelector("#btn-close-controls-modal")) == null ? void 0 : _a.addEventListener("click", () => {
      this.closeModal();
    });
    (_b = root.querySelector("#btn-modal-cancel")) == null ? void 0 : _b.addEventListener("click", () => {
      this.closeModal();
    });
    (_c = root.querySelector("#btn-modal-save-close")) == null ? void 0 : _c.addEventListener("click", () => {
      this.saveAndCommit();
    });
    (_d = root.querySelector("#btn-revert-controls-from-prefab")) == null ? void 0 : _d.addEventListener("click", () => {
      if (prefab == null ? void 0 : prefab.controlSchema) {
        this.workingSchema = JSON.parse(JSON.stringify(prefab.controlSchema));
        this.showToast(`Reset to default ${prefab.name} controls`);
        this.renderActiveView();
      }
    });
    (_e = root.querySelector("#btn-make-char-prefab")) == null ? void 0 : _e.addEventListener("click", async () => {
      const p = prefabManager.createFromEntity(char);
      p.controlSchema = JSON.parse(JSON.stringify(schema));
      char.controlSchema = JSON.parse(JSON.stringify(schema));
      char.prefabId = p.id;
      await DevConfigPersistence.saveControlSchema(this.modalPanel, char, schema);
      this.showToast(`Created Prefab: ${p.name} and saved to project!`);
      this.renderActiveView();
    });
    const selectPreset = root.querySelector("#select-control-preset");
    if (selectPreset) {
      selectPreset.addEventListener("change", () => {
        const pId = selectPreset.value;
        const found = BuiltinControlSchemas.find((b) => b.id === pId);
        if (found) {
          this.workingSchema = JSON.parse(JSON.stringify(found));
          this.renderActiveView();
        }
      });
    }
    (_f = root.querySelector("#tab-btn-kbm")) == null ? void 0 : _f.addEventListener("click", () => {
      this.activeTab = "keyboardMouse";
      this.renderActiveView();
    });
    (_g = root.querySelector("#tab-btn-pad")) == null ? void 0 : _g.addEventListener("click", () => {
      this.activeTab = "gamepad";
      this.renderActiveView();
    });
    (_h = root.querySelector("#tab-btn-tch")) == null ? void 0 : _h.addEventListener("click", () => {
      this.activeTab = "touch";
      this.renderActiveView();
    });
    if (this.activeTab === "keyboardMouse" || this.activeTab === "gamepad") {
      const blocks = this.getActiveBlocks(schema);
      const isGamepad = this.activeTab === "gamepad";
      const selectAddBlock = root.querySelector("#select-add-control-block");
      if (selectAddBlock) {
        selectAddBlock.addEventListener("change", () => {
          const type = selectAddBlock.value;
          if (!type) return;
          const newId = `block-${type}-${Date.now().toString(36)}`;
          if (type === "locomotion") {
            blocks.push(isGamepad ? {
              type: "locomotion",
              id: newId,
              name: "Locomotion",
              enabled: true,
              mode: "wasd",
              moveKeys: { upKey: "GamepadDpadUp", downKey: "GamepadDpadDown", leftKey: "GamepadDpadLeft", rightKey: "GamepadDpadRight", requireCleanPress: false },
              jump: { code: "GamepadA", requireCleanPress: true },
              sprint: { code: "GamepadLS", mode: "hold", requireCleanPress: false }
            } : {
              type: "locomotion",
              id: newId,
              name: "Locomotion",
              enabled: true,
              mode: "wasd",
              moveKeys: { upKey: "KeyW", downKey: "KeyS", leftKey: "KeyA", rightKey: "KeyD" },
              jump: { code: "Space" },
              sprint: { code: "ShiftLeft", mode: "hold" }
            });
          } else if (type === "itemInteraction") {
            blocks.push(isGamepad ? {
              type: "itemInteraction",
              id: newId,
              name: "Item Interaction",
              enabled: true,
              pickup: { code: "GamepadX", requireCleanPress: true },
              drop: { code: "GamepadY", requireCleanPress: true },
              swap: { code: "GamepadB", requireCleanPress: true },
              consume: { code: "GamepadLB", requireCleanPress: false },
              swapRequiresHolding: false,
              triggerPickupWhenEmptyHanded: true
            } : {
              type: "itemInteraction",
              id: newId,
              name: "Item Interaction",
              enabled: true,
              pickup: { code: "MouseLeft" },
              drop: { code: "KeyQ" },
              swap: { code: "KeyF" },
              consume: { code: "KeyE" },
              swapRequiresHolding: false,
              triggerPickupWhenEmptyHanded: true
            });
          } else if (type === "throw") {
            blocks.push(isGamepad ? {
              type: "throw",
              id: newId,
              name: "Throwing & Ballistics",
              enabled: true,
              mode: "chargeAndRelease",
              chargeTrigger: { code: "GamepadRT", requireCleanPress: true },
              aimTrigger: { code: "GamepadLT", requireCleanPress: false },
              fireTrigger: { code: "GamepadRT", requireCleanPress: true },
              quickTrigger: { code: "GamepadRT", requireCleanPress: true },
              arcModulation: { source: "none", autoCursorLock: false, sensitivity: 5e-3 },
              enableProximityCancel: false,
              cancelRadius: 1.5
            } : {
              type: "throw",
              id: newId,
              name: "Throwing & Ballistics",
              enabled: true,
              mode: "chargeAndRelease",
              chargeTrigger: { code: "MouseLeft" },
              aimTrigger: { code: "MouseRight" },
              fireTrigger: { code: "MouseLeft" },
              quickTrigger: { code: "MouseLeft" },
              arcModulation: { source: "mouseDeltaY", autoCursorLock: true, sensitivity: 5e-3 },
              enableProximityCancel: false,
              cancelRadius: 1.5
            });
          } else if (type === "melee") {
            blocks.push(isGamepad ? {
              type: "melee",
              id: newId,
              name: "Melee Combat",
              enabled: true,
              punch: { code: "GamepadB", requireCleanPress: true }
            } : {
              type: "melee",
              id: newId,
              name: "Melee Combat",
              enabled: true,
              punch: { code: "KeyF" }
            });
          } else if (type === "laser") {
            blocks.push(isGamepad ? {
              type: "laser",
              id: newId,
              name: "Laser Beam",
              enabled: true,
              aimTrigger: { code: "GamepadLT", requireCleanPress: false },
              aimMode: "mouseWorldPos",
              fireTrigger: { code: "GamepadRT", autoFireWhenAiming: false, requireCleanPress: false },
              powerLevel: { source: "none", sensitivity: 1 }
            } : {
              type: "laser",
              id: newId,
              name: "Laser Beam",
              enabled: true,
              aimTrigger: { code: "MouseRight", gateButtons: ["AltLeft"] },
              aimMode: "mouseWorldPos",
              fireTrigger: { code: "MouseLeft", autoFireWhenAiming: false },
              powerLevel: { source: "mouseWheel", sensitivity: 1 }
            });
          } else if (type === "facing") {
            blocks.push({
              type: "facing",
              id: newId,
              name: "Aim / Heading Facing",
              enabled: true,
              mode: "mouseWorldPos"
            });
          }
          this.renderActiveView();
        });
      }
      root.querySelectorAll(".btn-block-delete").forEach((btn) => {
        btn.addEventListener("click", () => {
          const bId = btn.dataset.blockId;
          const idx = blocks.findIndex((b) => b.id === bId);
          if (idx >= 0) {
            blocks.splice(idx, 1);
            this.renderActiveView();
          }
        });
      });
      root.querySelectorAll(".block-toggle-enabled").forEach((chk) => {
        chk.addEventListener("change", (e) => {
          const bId = chk.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block) {
            block.enabled = e.target.checked;
            this.renderActiveView();
          }
        });
      });
      root.querySelectorAll(".btn-block-slot-bind").forEach((btn) => {
        btn.addEventListener("click", () => {
          const bId = btn.dataset.blockId;
          const slotName = btn.dataset.slotName;
          if (bId && slotName) {
            this.startBlockKeyListening(bId, slotName);
          }
        });
      });
      root.querySelectorAll(".btn-block-slot-clear").forEach((btn) => {
        btn.addEventListener("click", () => {
          const bId = btn.dataset.blockId;
          const slotName = btn.dataset.slotName;
          const block = blocks.find((b) => b.id === bId);
          if (block && slotName) {
            const slot = block[slotName];
            if (slot) {
              slot.code = null;
            }
            this.renderActiveView();
          }
        });
      });
      root.querySelectorAll(".btn-block-slot-gate-bind").forEach((btn) => {
        btn.addEventListener("click", () => {
          const bId = btn.dataset.blockId;
          const slotName = btn.dataset.slotName;
          const gateIdx = parseInt(btn.dataset.gateIdx || "-1", 10);
          if (bId && slotName && gateIdx >= 0) {
            this.startBlockKeyListening(bId, slotName, gateIdx);
          }
        });
      });
      root.querySelectorAll(".btn-block-slot-gate-remove").forEach((btn) => {
        btn.addEventListener("click", () => {
          const bId = btn.dataset.blockId;
          const slotName = btn.dataset.slotName;
          const gateIdx = parseInt(btn.dataset.gateIdx || "-1", 10);
          const block = blocks.find((b) => b.id === bId);
          if (block && slotName && gateIdx >= 0) {
            const slot = block[slotName];
            if (slot && slot.gateButtons) {
              slot.gateButtons.splice(gateIdx, 1);
            }
            this.renderActiveView();
          }
        });
      });
      root.querySelectorAll(".btn-block-slot-add-gate").forEach((btn) => {
        btn.addEventListener("click", () => {
          const bId = btn.dataset.blockId;
          const slotName = btn.dataset.slotName;
          const block = blocks.find((b) => b.id === bId);
          if (bId && block && slotName) {
            let slot = block[slotName];
            if (!slot) {
              slot = { code: null, gateButtons: [] };
              block[slotName] = slot;
            }
            slot.gateButtons = slot.gateButtons || [];
            const newIdx = slot.gateButtons.length;
            slot.gateButtons.push("KeyD");
            this.startBlockKeyListening(bId, slotName, newIdx);
          }
        });
      });
      root.querySelectorAll(".btn-block-move-key").forEach((btn) => {
        btn.addEventListener("click", () => {
          const bId = btn.dataset.blockId;
          const moveKey = btn.dataset.moveKey;
          if (bId && moveKey) {
            this.startBlockKeyListening(bId, "moveKeys", void 0, moveKey);
          }
        });
      });
      root.querySelectorAll(".btn-block-move-key-clear").forEach((btn) => {
        btn.addEventListener("click", () => {
          const bId = btn.dataset.blockId;
          const moveKey = btn.dataset.moveKey;
          const block = blocks.find((b) => b.id === bId);
          if (block && block.type === "locomotion" && moveKey) {
            const loco = block;
            if (moveKey === "reverseKey" || moveKey === "strafeLeftKey" || moveKey === "strafeRightKey") {
              loco[moveKey] = null;
            } else if (loco.moveKeys) {
              loco.moveKeys[moveKey] = null;
            }
            this.renderActiveView();
          }
        });
      });
      root.querySelectorAll(".block-loco-mode").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          const bId = sel.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block) {
            block.mode = e.target.value;
            this.renderActiveView();
          }
        });
      });
      root.querySelectorAll(".block-slot-clean-toggle").forEach((chk) => {
        chk.addEventListener("change", (e) => {
          const bId = chk.dataset.blockId;
          const slotName = chk.dataset.slotName;
          const block = blocks.find((b) => b.id === bId);
          if (block && slotName) {
            const slot = block[slotName];
            const checked = e.target.checked;
            if (slot) {
              slot.requireCleanPress = checked;
            } else {
              block[slotName] = { code: null, requireCleanPress: checked };
            }
            this.renderActiveView();
          }
        });
      });
      root.querySelectorAll(".block-move-keys-clean-toggle").forEach((chk) => {
        chk.addEventListener("change", (e) => {
          const bId = chk.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block && block.type === "locomotion") {
            const loco = block;
            loco.moveKeys = loco.moveKeys || {};
            loco.moveKeys.requireCleanPress = e.target.checked;
            this.renderActiveView();
          }
        });
      });
      root.querySelectorAll(".block-sprint-mode").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          const bId = sel.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block && block.sprint) {
            block.sprint.mode = e.target.value;
            _ControlsInspector.syncLiveWorkingSchema();
          }
        });
      });
      root.querySelectorAll(".block-laser-aim-mode").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          const bId = sel.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block) {
            block.aimMode = e.target.value;
          }
        });
      });
      root.querySelectorAll(".block-laser-autofire").forEach((chk) => {
        chk.addEventListener("change", (e) => {
          const bId = chk.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block && block.fireTrigger) {
            block.fireTrigger.autoFireWhenAiming = e.target.checked;
          }
        });
      });
      root.querySelectorAll(".block-laser-power-source").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          const bId = sel.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block) {
            block.powerLevel = block.powerLevel || {};
            block.powerLevel.source = e.target.value;
            this.renderActiveView();
          }
        });
      });
      root.querySelectorAll(".btn-block-laser-power-clear").forEach((btn) => {
        btn.addEventListener("click", () => {
          const bId = btn.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block && block.powerLevel) {
            block.powerLevel.source = "none";
            this.renderActiveView();
          }
        });
      });
      root.querySelectorAll(".block-throw-mode").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          const bId = sel.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block) {
            block.mode = e.target.value;
            this.renderActiveView();
          }
        });
      });
      root.querySelectorAll(".block-throw-arc-source").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          const bId = sel.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block) {
            block.arcModulation = block.arcModulation || {};
            block.arcModulation.source = e.target.value;
            this.renderActiveView();
          }
        });
      });
      root.querySelectorAll(".block-throw-cancel-toggle").forEach((chk) => {
        chk.addEventListener("change", (e) => {
          const bId = chk.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block) {
            block.enableProximityCancel = e.target.checked;
            if (block.cancelRadius === void 0) block.cancelRadius = 1.5;
            this.renderActiveView();
          }
        });
      });
      root.querySelectorAll(".block-throw-cancel-radius").forEach((inp) => {
        inp.addEventListener("change", (e) => {
          const bId = inp.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block) {
            const val = parseFloat(e.target.value);
            block.cancelRadius = isNaN(val) ? 1.5 : Math.max(0.1, val);
            this.renderActiveView();
          }
        });
      });
      root.querySelectorAll(".block-throw-trigger-margin").forEach((inp) => {
        inp.addEventListener("change", (e) => {
          const bId = inp.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block) {
            const val = parseFloat(e.target.value);
            block.triggerMargin = isNaN(val) ? 0.15 : Math.max(0, Math.min(0.5, val));
            this.renderActiveView();
          }
        });
      });
      root.querySelectorAll(".block-loco-cursor-mode").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          const bId = sel.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block) {
            block.cursorSteerMode = e.target.value;
            _ControlsInspector.syncLiveWorkingSchema();
            this.renderActiveView();
          }
        });
      });
      root.querySelectorAll(".block-loco-raw-walking-toggle").forEach((chk) => {
        chk.addEventListener("change", (e) => {
          const bId = chk.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block) {
            block.rawDirectionWhileWalking = e.target.checked;
            _ControlsInspector.syncLiveWorkingSchema();
          }
        });
      });
      root.querySelectorAll(".block-loco-stick-cursor-toggle").forEach((chk) => {
        chk.addEventListener("change", (e) => {
          const bId = chk.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block) {
            block.stickCursorInFront = e.target.checked;
            _ControlsInspector.syncLiveWorkingSchema();
            this.renderActiveView();
          }
        });
      });
      root.querySelectorAll(".block-loco-lock-max-dist-toggle").forEach((chk) => {
        chk.addEventListener("change", (e) => {
          const bId = chk.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block) {
            block.lockCursorDistanceToMax = e.target.checked;
            _ControlsInspector.syncLiveWorkingSchema();
          }
        });
      });
      root.querySelectorAll(".block-loco-cursor-max-dist").forEach((inp) => {
        inp.addEventListener("change", (e) => {
          const bId = inp.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block) {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val > 0) {
              block.cursorMaxDistance = val;
              _ControlsInspector.syncLiveWorkingSchema();
            }
          }
        });
      });
      root.querySelectorAll(".block-item-swap-requires-holding").forEach((chk) => {
        chk.addEventListener("change", (e) => {
          const bId = chk.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block) {
            block.swapRequiresHolding = e.target.checked;
          }
        });
      });
      root.querySelectorAll(".block-item-trigger-pickup-empty").forEach((chk) => {
        chk.addEventListener("change", (e) => {
          const bId = chk.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block) {
            block.triggerPickupWhenEmptyHanded = e.target.checked;
          }
        });
      });
      root.querySelectorAll(".block-facing-mode").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          const bId = sel.dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block) {
            block.mode = e.target.value;
          }
        });
      });
    }
    const selectLoco = root.querySelector("#select-loco-mode");
    if (selectLoco) {
      selectLoco.addEventListener("change", () => {
        schema.keyboardMouse.locomotion.mode = selectLoco.value;
        this.renderActiveView();
      });
    }
    const btnFwdTrigger = root.querySelector("#btn-bind-fwd-trigger");
    if (btnFwdTrigger) {
      btnFwdTrigger.addEventListener("click", () => {
        this.startForwardTriggerListening();
      });
    }
    root.querySelectorAll(".btn-bind-loco-key").forEach((btn) => {
      btn.addEventListener("click", () => {
        const keyName = btn.dataset.locoKey;
        if (keyName) this.startLocoKeyListening(keyName);
      });
    });
    root.querySelectorAll(".btn-clear-loco-key").forEach((btn) => {
      btn.addEventListener("click", () => {
        const keyName = btn.dataset.clearLocoKey;
        if (keyName && schema.keyboardMouse.locomotion) {
          delete schema.keyboardMouse.locomotion[keyName];
          this.renderActiveView();
        }
      });
    });
    const selectAim = root.querySelector("#select-aim-mode");
    if (selectAim) {
      selectAim.addEventListener("change", () => {
        schema.keyboardMouse.aiming.mode = selectAim.value;
      });
    }
    const selectPadLeft = root.querySelector("#select-pad-left-primary");
    if (selectPadLeft) {
      selectPadLeft.addEventListener("change", () => {
        schema.gamepad.leftStick.primaryMode = selectPadLeft.value;
      });
    }
    const selectPadOverride = root.querySelector("#select-pad-dynamic-override");
    if (selectPadOverride) {
      selectPadOverride.addEventListener("change", () => {
        if (!schema.gamepad.leftStick.dynamicOverride) {
          schema.gamepad.leftStick.dynamicOverride = {
            triggerCondition: "whenLtHeld",
            overrideMode: "cursorSteer"
          };
        }
        schema.gamepad.leftStick.dynamicOverride.triggerCondition = selectPadOverride.value;
      });
    }
    const selectPadRight = root.querySelector("#select-pad-right-mode");
    if (selectPadRight) {
      selectPadRight.addEventListener("change", () => {
        schema.gamepad.rightStick.mode = selectPadRight.value;
      });
    }
    (_i = root.querySelector("#btn-collapse-all-rules")) == null ? void 0 : _i.addEventListener("click", () => {
      const rules = this.activeTab === "keyboardMouse" ? schema.keyboardMouse.rules : this.activeTab === "gamepad" ? schema.gamepad.rules : schema.touch.rules;
      for (const r of rules) {
        this.collapsedRuleIds.add(r.id);
      }
      this.renderActiveView();
    });
    (_j = root.querySelector("#btn-expand-all-rules")) == null ? void 0 : _j.addEventListener("click", () => {
      this.collapsedRuleIds.clear();
      this.renderActiveView();
    });
    (_k = root.querySelector("#btn-jump-to-tags")) == null ? void 0 : _k.addEventListener("click", () => {
      const scrollBody = root.querySelector("#controls-scroll-body");
      if (scrollBody) {
        scrollBody.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
    (_l = root.querySelector("#btn-jump-to-rules")) == null ? void 0 : _l.addEventListener("click", () => {
      const rulesHeader = root.querySelector("#section-rules-header");
      if (rulesHeader) {
        rulesHeader.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    (_m = root.querySelector("#btn-add-tag")) == null ? void 0 : _m.addEventListener("click", () => {
      const tags = this.getActiveDeviceTags(schema);
      const isPad = this.activeTab === "gamepad";
      const newTag = {
        id: (isPad ? "tag-pad-" : "tag-kbm-") + Math.random().toString(36).substring(2, 8),
        name: `Tag ${tags.length + 1}`,
        trigger: isPad ? { device: "gamepad", code: "GamepadA", mode: "press" } : { device: "keyboard", code: "KeyF", mode: "press" }
      };
      tags.push(newTag);
      this.renderActiveView();
    });
    root.querySelectorAll(".input-tag-name").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const tagId = inp.dataset.tagId;
        const val = e.target.value;
        const tags = this.getActiveDeviceTags(schema);
        const tag = tags.find((t) => t.id === tagId);
        if (tag) tag.name = val;
      });
      inp.addEventListener("change", () => {
        this.renderActiveView();
      });
    });
    root.querySelectorAll(".btn-bind-tag").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tagId = btn.dataset.tagId;
        if (tagId) {
          this.startTagTriggerListening(tagId);
        }
      });
    });
    root.querySelectorAll(".btn-delete-tag").forEach((btn) => {
      btn.addEventListener("click", () => {
        var _a2;
        const tagId = btn.dataset.tagId;
        const tags = this.getActiveDeviceTags(schema);
        const idx = tags.findIndex((t) => t.id === tagId);
        if (idx !== -1) {
          tags.splice(idx, 1);
          const rules = this.activeTab === "keyboardMouse" ? schema.keyboardMouse.rules : this.activeTab === "gamepad" ? schema.gamepad.rules : schema.touch.rules;
          for (const rule of rules) {
            if (rule.tagId === tagId) {
              rule.tagId = (_a2 = tags[0]) == null ? void 0 : _a2.id;
              if (tags[0]) {
                rule.trigger.code = tags[0].trigger.code;
                rule.trigger.device = tags[0].trigger.device;
                rule.trigger.chordModifiers = tags[0].trigger.chordModifiers ? [...tags[0].trigger.chordModifiers] : void 0;
              }
            }
          }
          this.renderActiveView();
        }
      });
    });
    (_n = root.querySelector("#btn-add-stage-group")) == null ? void 0 : _n.addEventListener("click", () => {
      const groups = _ControlsInspector.getActiveStageGroups(schema);
      let counter = groups.length + 1;
      let newName = `set_${counter}`;
      while (groups.some((g) => g.name === newName)) {
        counter++;
        newName = `set_${counter}`;
      }
      groups.push({ name: newName, stages: ["none"] });
      this.renderActiveView();
    });
    root.querySelectorAll(".input-stage-group-name").forEach((inp) => {
      inp.addEventListener("change", (e) => {
        const gIdx = parseInt(inp.dataset.groupIdx ?? "-1", 10);
        const groups = _ControlsInspector.getActiveStageGroups(schema);
        if (gIdx >= 0 && groups[gIdx]) {
          const oldName = groups[gIdx].name;
          const newName = e.target.value.trim();
          if (!newName || groups.some((g, i) => i !== gIdx && g.name === newName)) {
            e.target.value = oldName;
            return;
          }
          groups[gIdx].name = newName;
          _ControlsInspector.renameStageGroupInRules(schema, oldName, newName);
          this.renderActiveView();
        }
      });
    });
    root.querySelectorAll(".btn-delete-stage-group").forEach((btn) => {
      btn.addEventListener("click", () => {
        const gIdx = parseInt(btn.dataset.groupIdx ?? "-1", 10);
        const groups = _ControlsInspector.getActiveStageGroups(schema);
        if (groups.length > 1 && gIdx >= 0 && groups[gIdx]) {
          const oldName = groups[gIdx].name;
          groups.splice(gIdx, 1);
          _ControlsInspector.deleteStageGroupInRules(schema, oldName);
          this.renderActiveView();
        }
      });
    });
    root.querySelectorAll(".btn-add-stage").forEach((btn) => {
      btn.addEventListener("click", () => {
        const gIdx = parseInt(btn.dataset.groupIdx ?? "0", 10);
        const groups = _ControlsInspector.getActiveStageGroups(schema);
        if (groups[gIdx]) {
          const group = groups[gIdx];
          let counter = 1;
          let newName = `stage_${counter}`;
          while (group.stages.includes(newName)) {
            counter++;
            newName = `stage_${counter}`;
          }
          group.stages.push(newName);
          this.renderActiveView();
        }
      });
    });
    root.querySelectorAll(".input-stage-name").forEach((inp) => {
      inp.addEventListener("change", (e) => {
        const gIdx = parseInt(inp.dataset.groupIdx ?? "0", 10);
        const sIdx = parseInt(inp.dataset.stageIdx ?? "-1", 10);
        if (sIdx <= 0) return;
        const groups = _ControlsInspector.getActiveStageGroups(schema);
        if (groups[gIdx] && groups[gIdx].stages[sIdx]) {
          const group = groups[gIdx];
          const oldName = group.stages[sIdx];
          const newName = e.target.value.trim();
          if (!newName || newName === "none" || group.stages.includes(newName) && group.stages.indexOf(newName) !== sIdx) {
            e.target.value = oldName;
            return;
          }
          group.stages[sIdx] = newName;
          _ControlsInspector.renameStageInRules(schema, group.name, oldName, newName);
          this.renderActiveView();
        }
      });
    });
    root.querySelectorAll(".btn-delete-stage").forEach((btn) => {
      btn.addEventListener("click", () => {
        const gIdx = parseInt(btn.dataset.groupIdx ?? "0", 10);
        const sIdx = parseInt(btn.dataset.stageIdx ?? "-1", 10);
        if (sIdx <= 0) return;
        const groups = _ControlsInspector.getActiveStageGroups(schema);
        if (groups[gIdx] && groups[gIdx].stages[sIdx]) {
          const group = groups[gIdx];
          const oldName = group.stages[sIdx];
          group.stages.splice(sIdx, 1);
          _ControlsInspector.deleteStageInRules(schema, group.name, oldName);
          this.renderActiveView();
        }
      });
    });
    const addNewThread = () => {
      const rules = this.activeTab === "keyboardMouse" ? schema.keyboardMouse.rules : this.activeTab === "gamepad" ? schema.gamepad.rules : schema.touch.rules;
      const threadId = `thread-${Date.now().toString(36)}`;
      const newRule = {
        id: "rule-" + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        name: "Action Branch",
        enabled: true,
        priority: 50,
        threadId,
        trigger: { device: "keyboard", code: "Always", mode: "hold" },
        conditions: [{ type: "always" }],
        condition: { type: "always" },
        actions: [{ moduleId: "throwPickup", intent: "grabItem" }],
        action: { moduleId: "throwPickup", intent: "grabItem" }
      };
      rules.push(newRule);
      this.renderActiveView();
    };
    (_o = root.querySelector("#btn-add-control-rule")) == null ? void 0 : _o.addEventListener("click", addNewThread);
    (_p = root.querySelector("#btn-add-control-thread")) == null ? void 0 : _p.addEventListener("click", addNewThread);
    root.querySelectorAll(".btn-add-thread-branch").forEach((btn) => {
      btn.addEventListener("click", () => {
        const threadId = btn.dataset.threadId || `thread-${Date.now().toString(36)}`;
        const rootRules = this.activeTab === "keyboardMouse" ? schema.keyboardMouse.rules : this.activeTab === "gamepad" ? schema.gamepad.rules : schema.touch.rules;
        const targetList = this.findRuleListForThread(schema, threadId) ?? rootRules;
        const newRule = {
          id: "rule-" + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
          name: "Action Branch",
          enabled: true,
          priority: 50,
          threadId,
          trigger: { device: "keyboard", code: "Always", mode: "hold" },
          conditions: [{ type: "always" }],
          condition: { type: "always" },
          actions: [{ moduleId: "throwPickup", intent: "grabItem" }],
          action: { moduleId: "throwPickup", intent: "grabItem" }
        };
        targetList.push(newRule);
        this.renderActiveView();
      });
    });
    root.querySelectorAll(".btn-add-nested-thread").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = btn.dataset.ruleId;
        const rule = this.findRule(schema, rId);
        if (rule) {
          this.addNestedThreadToRule(rule);
        }
      });
    });
    root.querySelectorAll(".btn-toggle-rule-collapse").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = btn.dataset.ruleId;
        if (rId) {
          if (this.collapsedRuleIds.has(rId)) {
            this.collapsedRuleIds.delete(rId);
          } else {
            this.collapsedRuleIds.add(rId);
          }
          this.renderActiveView();
        }
      });
    });
    root.querySelectorAll(".select-rule-tag").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const rId = sel.dataset.ruleId;
        const tagId = e.target.value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          if (!tagId) {
            rule.tagId = void 0;
            rule.trigger.code = "Always";
            rule.trigger.device = "keyboard";
            rule.trigger.chordModifiers = void 0;
          } else {
            rule.tagId = tagId;
            const tags = this.getActiveDeviceTags(schema);
            const tag = tags.find((t) => t.id === tagId);
            if (tag) {
              rule.trigger.code = tag.trigger.code;
              rule.trigger.device = tag.trigger.device;
              rule.trigger.chordModifiers = tag.trigger.chordModifiers ? [...tag.trigger.chordModifiers] : void 0;
            }
          }
          this.renderActiveView();
        }
      });
    });
    root.querySelectorAll(".select-rule-mode").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const rId = sel.dataset.ruleId;
        const rule = this.findRule(schema, rId);
        if (rule) {
          rule.trigger.mode = e.target.value;
          this.renderActiveView();
        }
      });
    });
    root.querySelectorAll(".btn-toggle-cond-op").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = btn.dataset.ruleId;
        const gPath = btn.dataset.groupPath ?? "";
        const rule = this.findRule(schema, rId);
        if (rule) {
          if (gPath === "") {
            rule.conditionOp = (rule.conditionOp ?? "and") === "and" ? "or" : "and";
          } else {
            const res = _ControlsInspector.getConditionGroupList(rule, gPath);
            if (res == null ? void 0 : res.group) {
              res.group.op = (res.group.op ?? "or") === "and" ? "or" : "and";
            }
          }
          this.renderActiveView();
        }
      });
    });
    root.querySelectorAll(".btn-add-condition").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = btn.dataset.ruleId;
        const gPath = btn.dataset.groupPath ?? "";
        const rule = this.findRule(schema, rId);
        if (rule) {
          const res = _ControlsInspector.getConditionGroupList(rule, gPath);
          if (res) {
            res.list.push({ type: "always" });
            rule.conditions = ControlSchemaArbiter.getRuleConditions(rule);
            rule.condition = rule.conditions[0];
            this.renderActiveView();
          }
        }
      });
    });
    root.querySelectorAll(".btn-add-cond-group").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = btn.dataset.ruleId;
        const gPath = btn.dataset.groupPath ?? "";
        const rule = this.findRule(schema, rId);
        if (rule) {
          const res = _ControlsInspector.getConditionGroupList(rule, gPath);
          if (res) {
            res.list.push({
              type: "group",
              op: "or",
              conditions: [{ type: "always" }, { type: "always" }]
            });
            rule.conditions = ControlSchemaArbiter.getRuleConditions(rule);
            rule.condition = rule.conditions[0];
            this.renderActiveView();
          }
        }
      });
    });
    root.querySelectorAll(".btn-delete-condition").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = btn.dataset.ruleId;
        const cPath = btn.dataset.condPath ?? "";
        const rule = this.findRule(schema, rId);
        if (rule) {
          const res = _ControlsInspector.getConditionListAndIndex(rule, cPath);
          if (res) {
            if (res.list.length > 1) {
              res.list.splice(res.index, 1);
            } else {
              res.list[0] = { type: "always" };
            }
            rule.conditions = ControlSchemaArbiter.getRuleConditions(rule);
            rule.condition = rule.conditions[0];
            this.renderActiveView();
          }
        }
      });
    });
    root.querySelectorAll(".select-rule-cond").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        var _a2, _b2, _c2;
        const rId = sel.dataset.ruleId;
        const cPath = sel.dataset.condPath ?? "";
        const val = e.target.value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const targetCond = _ControlsInspector.getConditionByPath(rule, cPath);
          if (targetCond) {
            if (val === "stagedActionIs") {
              targetCond.type = "stagedActionIs";
              const groups = _ControlsInspector.getActiveStageGroups(schema);
              if (!targetCond.stageGroup || !groups.some((g) => g.name === targetCond.stageGroup)) {
                targetCond.stageGroup = ((_a2 = groups[0]) == null ? void 0 : _a2.name) || "default";
              }
              const stages = _ControlsInspector.getStagesForGroup(schema, targetCond.stageGroup);
              if (!targetCond.param || !stages.includes(targetCond.param)) {
                targetCond.param = "none";
              }
            } else if (val === "tagPressed" || val === "tagHeld" || val === "tagReleased") {
              targetCond.type = val;
              const tags = this.getActiveDeviceTags(schema);
              if (!targetCond.param || !tags.some((t) => t.id === targetCond.param)) {
                targetCond.param = ((_b2 = tags[0]) == null ? void 0 : _b2.id) ?? "";
              }
            } else if (val === "buttonHeld") {
              targetCond.type = "buttonHeld";
              if (!targetCond.param) targetCond.param = "MouseRight";
            } else {
              targetCond.type = val;
              targetCond.param = void 0;
            }
            rule.condition = (_c2 = rule.conditions) == null ? void 0 : _c2[0];
            this.renderActiveView();
          }
        }
      });
    });
    root.querySelectorAll(".select-cond-tag").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        var _a2;
        const rId = sel.dataset.ruleId;
        const cPath = sel.dataset.condPath ?? "";
        const val = e.target.value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const targetCond = _ControlsInspector.getConditionByPath(rule, cPath);
          if (targetCond) {
            targetCond.param = val;
            rule.condition = (_a2 = rule.conditions) == null ? void 0 : _a2[0];
            this.renderActiveView();
          }
        }
      });
    });
    root.querySelectorAll(".select-cond-stage-group").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        var _a2;
        const rId = sel.dataset.ruleId;
        const cPath = sel.dataset.condPath ?? "";
        const val = e.target.value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const targetCond = _ControlsInspector.getConditionByPath(rule, cPath);
          if (targetCond) {
            targetCond.stageGroup = val;
            const stages = _ControlsInspector.getStagesForGroup(schema, val);
            if (!targetCond.param || !stages.includes(targetCond.param)) {
              targetCond.param = "none";
            }
            rule.condition = (_a2 = rule.conditions) == null ? void 0 : _a2[0];
            this.renderActiveView();
          }
        }
      });
    });
    root.querySelectorAll(".select-cond-stage").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        var _a2;
        const rId = sel.dataset.ruleId;
        const cPath = sel.dataset.condPath ?? "";
        const val = e.target.value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const targetCond = _ControlsInspector.getConditionByPath(rule, cPath);
          if (targetCond) {
            targetCond.param = val;
            rule.condition = (_a2 = rule.conditions) == null ? void 0 : _a2[0];
            this.renderActiveView();
          }
        }
      });
    });
    root.querySelectorAll(".input-cond-param").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const rId = inp.dataset.ruleId;
        const cPath = inp.dataset.condPath ?? "";
        const val = e.target.value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const targetCond = _ControlsInspector.getConditionByPath(rule, cPath);
          if (targetCond) {
            targetCond.param = val;
          }
        }
      });
    });
    root.querySelectorAll(".select-action-stage-group").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const rId = sel.dataset.ruleId;
        const sIdx = parseInt(sel.dataset.statementIdx ?? "0", 10);
        const val = e.target.value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const stmts = ControlSchemaArbiter.getRuleBody(rule);
          if (stmts[sIdx] && stmts[sIdx].type === "action") {
            const act = stmts[sIdx].action;
            act.args = { ...act.args || {}, group: val };
            const stages = _ControlsInspector.getStagesForGroup(schema, val);
            if (!act.args.stage || !stages.includes(act.args.stage)) {
              act.args.stage = "none";
            }
            rule.body = stmts;
            ControlSchemaArbiter.syncRuleFromStatements(rule);
            this.renderActiveView();
          }
        }
      });
    });
    root.querySelectorAll(".select-action-stage").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const rId = sel.dataset.ruleId;
        const sIdx = parseInt(sel.dataset.statementIdx ?? "0", 10);
        const val = e.target.value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const stmts = ControlSchemaArbiter.getRuleBody(rule);
          if (stmts[sIdx] && stmts[sIdx].type === "action") {
            const act = stmts[sIdx].action;
            act.args = { ...act.args || {}, stage: val };
            rule.body = stmts;
            ControlSchemaArbiter.syncRuleFromStatements(rule);
            this.renderActiveView();
          }
        }
      });
    });
    root.querySelectorAll(".btn-add-action").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = btn.dataset.ruleId;
        const rule = this.findRule(schema, rId);
        if (rule) {
          this.addActionToRule(rule);
        }
      });
    });
    root.querySelectorAll(".btn-move-statement-up").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = btn.dataset.ruleId;
        const sIdx = parseInt(btn.dataset.statementIdx ?? "0", 10);
        const rule = this.findRule(schema, rId);
        if (rule) {
          this.moveStatement(rule, sIdx, -1);
        }
      });
    });
    root.querySelectorAll(".btn-move-statement-down").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = btn.dataset.ruleId;
        const sIdx = parseInt(btn.dataset.statementIdx ?? "0", 10);
        const rule = this.findRule(schema, rId);
        if (rule) {
          this.moveStatement(rule, sIdx, 1);
        }
      });
    });
    root.querySelectorAll(".btn-delete-statement").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = btn.dataset.ruleId;
        const sIdx = parseInt(btn.dataset.statementIdx ?? "0", 10);
        const rule = this.findRule(schema, rId);
        if (rule) {
          this.deleteStatement(rule, sIdx);
        }
      });
    });
    root.querySelectorAll(".btn-move-branch-up").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tId = btn.dataset.threadId;
        const bIdx = parseInt(btn.dataset.branchIdx ?? "0", 10);
        if (tId) {
          this.moveBranch(schema, tId, bIdx, -1);
        }
      });
    });
    root.querySelectorAll(".btn-move-branch-down").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tId = btn.dataset.threadId;
        const bIdx = parseInt(btn.dataset.branchIdx ?? "0", 10);
        if (tId) {
          this.moveBranch(schema, tId, bIdx, 1);
        }
      });
    });
    root.querySelectorAll(".btn-move-cascade-block-up").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tId = btn.dataset.threadId;
        if (tId) {
          this.moveCascadeBlock(schema, tId, -1);
        }
      });
    });
    root.querySelectorAll(".btn-move-cascade-block-down").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tId = btn.dataset.threadId;
        if (tId) {
          this.moveCascadeBlock(schema, tId, 1);
        }
      });
    });
    root.querySelectorAll(".btn-open-action-picker").forEach((btn) => {
      btn.addEventListener("click", (evt) => {
        evt.stopPropagation();
        const rId = btn.dataset.ruleId;
        const sIdx = parseInt(btn.dataset.statementIdx ?? btn.dataset.actionIdx ?? "0", 10);
        if (rId) {
          this.showActionPickerMenu(rId, sIdx, btn);
        }
      });
    });
    root.querySelectorAll(".btn-delete-rule").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = btn.dataset.ruleId;
        this.deleteRule(schema, rId);
        this.renderActiveView();
      });
    });
    (_q = root.querySelector("#btn-toggle-json-drawer")) == null ? void 0 : _q.addEventListener("click", () => {
      this.showJsonEditor = !this.showJsonEditor;
      this.jsonErrorMessage = null;
      this.renderActiveView();
    });
    (_r = root.querySelector("#btn-apply-json")) == null ? void 0 : _r.addEventListener("click", () => {
      const textarea = root.querySelector("#textarea-controls-json");
      if (!textarea) return;
      try {
        const parsed = JSON.parse(textarea.value);
        if (!parsed.id || !parsed.name || !parsed.keyboardMouse || !parsed.gamepad) {
          throw new Error("JSON missing essential ControlSchema properties (id, name, keyboardMouse, gamepad).");
        }
        this.workingSchema = parsed;
        this.jsonErrorMessage = null;
        this.showToast("Parsed & Applied JSON Schema");
        this.renderActiveView();
      } catch (err) {
        this.jsonErrorMessage = err.message || "Invalid JSON syntax";
        this.renderActiveView();
      }
    });
    (_s = root.querySelector("#btn-copy-json")) == null ? void 0 : _s.addEventListener("click", () => {
      const textarea = root.querySelector("#textarea-controls-json");
      if (textarea) {
        navigator.clipboard.writeText(textarea.value);
        this.showToast("Copied JSON to clipboard");
      }
    });
  }
  static findRule(schema, ruleId) {
    if (!ruleId) return void 0;
    const rootRules = this.activeTab === "keyboardMouse" ? schema.keyboardMouse.rules : this.activeTab === "gamepad" ? schema.gamepad.rules : schema.touch.rules;
    function search(list) {
      for (const r of list) {
        if (r.id === ruleId) return r;
        for (const stmt of ControlSchemaArbiter.getRuleBody(r)) {
          if (stmt.type === "nestedThread") {
            const found = search(stmt.rules);
            if (found) return found;
          }
        }
        if (r.children && r.children.length > 0) {
          const found = search(r.children);
          if (found) return found;
        }
      }
      return void 0;
    }
    return search(rootRules);
  }
  static deleteRule(schema, ruleId) {
    if (!ruleId) return;
    const rootRules = this.activeTab === "keyboardMouse" ? schema.keyboardMouse.rules : this.activeTab === "gamepad" ? schema.gamepad.rules : schema.touch.rules;
    function remove(list) {
      const idx = list.findIndex((r) => r.id === ruleId);
      if (idx !== -1) {
        list.splice(idx, 1);
        return true;
      }
      for (const r of list) {
        for (const stmt of ControlSchemaArbiter.getRuleBody(r)) {
          if (stmt.type === "nestedThread") {
            if (remove(stmt.rules)) {
              ControlSchemaArbiter.syncRuleFromStatements(r);
              return true;
            }
          }
        }
        if (r.children && r.children.length > 0) {
          if (remove(r.children)) return true;
        }
      }
      return false;
    }
    remove(rootRules);
  }
  static findRuleListForThread(schema, threadId) {
    const rootRules = this.activeTab === "keyboardMouse" ? schema.keyboardMouse.rules : this.activeTab === "gamepad" ? schema.gamepad.rules : schema.touch.rules;
    function search(list) {
      if (list.some((r) => r.threadId === threadId)) {
        return list;
      }
      for (const r of list) {
        for (const stmt of ControlSchemaArbiter.getRuleBody(r)) {
          if (stmt.type === "nestedThread") {
            const found = search(stmt.rules);
            if (found) return found;
          }
        }
        if (r.children && r.children.length > 0) {
          const found = search(r.children);
          if (found) return found;
        }
      }
      return null;
    }
    return search(rootRules);
  }
  static addActionToRule(rule) {
    const stmts = ControlSchemaArbiter.getRuleBody(rule);
    stmts.push({
      type: "action",
      action: { moduleId: "locomotion", intent: "jump" }
    });
    rule.body = stmts;
    ControlSchemaArbiter.syncRuleFromStatements(rule);
    this.renderActiveView();
  }
  static addNestedThreadToRule(rule) {
    const stmts = ControlSchemaArbiter.getRuleBody(rule);
    const subThreadId = `subthread-${Date.now().toString(36)}${Math.random().toString(36).substring(2, 5)}`;
    const newChildRule = {
      id: "rule-" + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      name: "Nested Action Branch",
      enabled: true,
      priority: 50,
      threadId: subThreadId,
      trigger: { device: "keyboard", code: "Always", mode: "hold" },
      conditions: [{ type: "always" }],
      condition: { type: "always" },
      actions: [{ moduleId: "throwPickup", intent: "grabItem" }],
      action: { moduleId: "throwPickup", intent: "grabItem" },
      body: [{ type: "action", action: { moduleId: "throwPickup", intent: "grabItem" } }]
    };
    stmts.push({
      type: "nestedThread",
      threadId: subThreadId,
      rules: [newChildRule]
    });
    rule.body = stmts;
    ControlSchemaArbiter.syncRuleFromStatements(rule);
    this.renderActiveView();
  }
  static moveStatement(rule, stmtIdx, delta) {
    const stmts = ControlSchemaArbiter.getRuleBody(rule);
    const targetIdx = stmtIdx + delta;
    if (targetIdx < 0 || targetIdx >= stmts.length) return;
    const temp = stmts[stmtIdx];
    stmts[stmtIdx] = stmts[targetIdx];
    stmts[targetIdx] = temp;
    rule.body = stmts;
    ControlSchemaArbiter.syncRuleFromStatements(rule);
    this.renderActiveView();
  }
  static deleteStatement(rule, stmtIdx) {
    const stmts = ControlSchemaArbiter.getRuleBody(rule);
    if (stmtIdx >= 0 && stmtIdx < stmts.length) {
      stmts.splice(stmtIdx, 1);
      rule.body = stmts;
      ControlSchemaArbiter.syncRuleFromStatements(rule);
      this.renderActiveView();
    }
  }
  static moveBranch(schema, threadId, branchIdx, delta) {
    const list = this.findRuleListForThread(schema, threadId);
    if (!list) return;
    const threadRules = list.filter((r) => r.threadId === threadId);
    const targetBranchIdx = branchIdx + delta;
    if (targetBranchIdx < 0 || targetBranchIdx >= threadRules.length) return;
    const ruleA = threadRules[branchIdx];
    const ruleB = threadRules[targetBranchIdx];
    const idxA = list.indexOf(ruleA);
    const idxB = list.indexOf(ruleB);
    if (idxA !== -1 && idxB !== -1) {
      list[idxA] = ruleB;
      list[idxB] = ruleA;
      this.renderActiveView();
    }
  }
  static moveCascadeBlock(schema, threadId, delta) {
    var _a;
    const rootRules = this.activeTab === "keyboardMouse" ? schema.keyboardMouse.rules : this.activeTab === "gamepad" ? schema.gamepad.rules : schema.touch.rules;
    const distinctThreadIds = [];
    for (const r of rootRules) {
      const tId = r.threadId || `thread-${r.id}`;
      if (!distinctThreadIds.includes(tId)) {
        distinctThreadIds.push(tId);
      }
    }
    const curIdx = distinctThreadIds.indexOf(threadId);
    const targetIdx = curIdx + delta;
    if (curIdx === -1 || targetIdx < 0 || targetIdx >= distinctThreadIds.length) return;
    const otherThreadId = distinctThreadIds[targetIdx];
    const groups = /* @__PURE__ */ new Map();
    for (const tId of distinctThreadIds) {
      groups.set(tId, []);
    }
    for (const r of rootRules) {
      const tId = r.threadId || `thread-${r.id}`;
      (_a = groups.get(tId)) == null ? void 0 : _a.push(r);
    }
    distinctThreadIds[curIdx] = otherThreadId;
    distinctThreadIds[targetIdx] = threadId;
    rootRules.length = 0;
    for (const tId of distinctThreadIds) {
      const grp = groups.get(tId);
      if (grp) rootRules.push(...grp);
    }
    this.renderActiveView();
  }
  // --- "Press Input to Bind" Tag Recorder (Layer 1) ---
  static syncRulesForTag(schema, tag) {
    const rules = this.activeTab === "keyboardMouse" ? schema.keyboardMouse.rules : this.activeTab === "gamepad" ? schema.gamepad.rules : schema.touch.rules;
    for (const rule of rules) {
      if (rule.tagId === tag.id) {
        rule.trigger.device = tag.trigger.device;
        rule.trigger.code = tag.trigger.code;
        rule.trigger.chordModifiers = tag.trigger.chordModifiers ? [...tag.trigger.chordModifiers] : void 0;
      }
    }
  }
  static startTagTriggerListening(tagId) {
    if (this.recorderCleanup) this.recorderCleanup();
    this.listeningTagId = tagId;
    this.renderActiveView();
    if (!this.workingSchema) return;
    const schema = this.workingSchema;
    const tags = this.getActiveDeviceTags(schema);
    const tag = tags.find((t) => t.id === tagId);
    if (!tag) return;
    if (this.activeTab === "gamepad") {
      let isDone = false;
      let animId = null;
      const pollGamepad = () => {
        if (isDone) return;
        const gamepads = typeof navigator.getGamepads === "function" ? navigator.getGamepads() : [];
        for (let g = 0; g < gamepads.length; g++) {
          const gp = gamepads[g];
          if (!gp) continue;
          for (let b = 0; b < gp.buttons.length; b++) {
            if (gp.buttons[b].pressed || gp.buttons[b].value > 0.5) {
              const code = ControlSchemaArbiter.formatGamepadButtonIndex(b);
              tag.trigger = {
                device: "gamepad",
                code,
                mode: "press"
              };
              this.syncRulesForTag(schema, tag);
              cleanup2();
              this.listeningTagId = null;
              this.renderActiveView();
              return;
            }
          }
        }
        animId = requestAnimationFrame(pollGamepad);
      };
      const cleanup2 = () => {
        isDone = true;
        if (animId !== null) cancelAnimationFrame(animId);
        window.removeEventListener("keydown", onKeyDown2, true);
        if (this.popoutWindow && !this.popoutWindow.closed) {
          this.popoutWindow.removeEventListener("keydown", onKeyDown2, true);
        }
        this.recorderCleanup = null;
      };
      const onKeyDown2 = (e) => {
        if (e.code === "Escape") {
          cleanup2();
          this.listeningTagId = null;
          this.renderActiveView();
        }
      };
      this.recorderCleanup = cleanup2;
      window.addEventListener("keydown", onKeyDown2, true);
      if (this.popoutWindow && !this.popoutWindow.closed) {
        this.popoutWindow.addEventListener("keydown", onKeyDown2, true);
      }
      animId = requestAnimationFrame(pollGamepad);
      return;
    }
    let heldModifier = null;
    let chordTimer = null;
    const commitTrigger = (device, code, chordModifiers) => {
      tag.trigger = {
        device,
        code,
        chordModifiers: chordModifiers && chordModifiers.length > 0 ? chordModifiers : void 0,
        mode: "press"
      };
      this.syncRulesForTag(schema, tag);
      cleanup();
      this.listeningTagId = null;
      this.renderActiveView();
    };
    const isModifier = (code) => ["AltLeft", "AltRight", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "MetaLeft", "MetaRight"].includes(code);
    const onKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "Escape") {
        cleanup();
        this.listeningTagId = null;
        this.renderActiveView();
        return;
      }
      if (isModifier(e.code)) {
        if (!heldModifier) {
          heldModifier = e.code;
          chordTimer = setTimeout(() => {
            if (heldModifier) {
              commitTrigger("keyboard", heldModifier);
            }
          }, 250);
        }
        return;
      }
      if (heldModifier) {
        if (chordTimer) clearTimeout(chordTimer);
        commitTrigger("keyboard", e.code, [heldModifier]);
      } else {
        commitTrigger("keyboard", e.code);
      }
    };
    const onKeyUp = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (heldModifier && e.code === heldModifier) {
        if (chordTimer) clearTimeout(chordTimer);
        commitTrigger("keyboard", heldModifier);
      }
    };
    const onMouseDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const btnName = e.button === 0 ? "MouseLeft" : e.button === 1 ? "MouseMiddle" : "MouseRight";
      if (heldModifier) {
        if (chordTimer) clearTimeout(chordTimer);
        commitTrigger("mouse", btnName, [heldModifier]);
      } else {
        commitTrigger("mouse", btnName);
      }
    };
    const onContextMenu = (e) => {
      e.preventDefault();
    };
    const cleanup = () => {
      if (chordTimer) clearTimeout(chordTimer);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("contextmenu", onContextMenu, true);
      if (this.popoutWindow && !this.popoutWindow.closed) {
        this.popoutWindow.removeEventListener("keydown", onKeyDown, true);
        this.popoutWindow.removeEventListener("keyup", onKeyUp, true);
        this.popoutWindow.removeEventListener("mousedown", onMouseDown, true);
        this.popoutWindow.removeEventListener("contextmenu", onContextMenu, true);
      }
      this.recorderCleanup = null;
    };
    this.recorderCleanup = cleanup;
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("contextmenu", onContextMenu, true);
    if (this.popoutWindow && !this.popoutWindow.closed) {
      this.popoutWindow.addEventListener("keydown", onKeyDown, true);
      this.popoutWindow.addEventListener("keyup", onKeyUp, true);
      this.popoutWindow.addEventListener("mousedown", onMouseDown, true);
      this.popoutWindow.addEventListener("contextmenu", onContextMenu, true);
    }
  }
  static startForwardTriggerListening() {
    if (this.recorderCleanup) this.recorderCleanup();
    this.listeningForwardTrigger = true;
    this.renderActiveView();
    if (!this.workingSchema) return;
    const schema = this.workingSchema;
    const onKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "Escape") {
        cleanup();
        this.listeningForwardTrigger = false;
        this.renderActiveView();
        return;
      }
      schema.keyboardMouse.locomotion.forwardTrigger = {
        device: "keyboard",
        code: e.code,
        mode: "hold"
      };
      cleanup();
      this.listeningForwardTrigger = false;
      this.renderActiveView();
    };
    const onMouseDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const btnName = e.button === 0 ? "MouseLeft" : e.button === 1 ? "MouseMiddle" : "MouseRight";
      schema.keyboardMouse.locomotion.forwardTrigger = {
        device: "mouse",
        code: btnName,
        mode: "hold"
      };
      cleanup();
      this.listeningForwardTrigger = false;
      this.renderActiveView();
    };
    const onContextMenu = (e) => {
      e.preventDefault();
    };
    const cleanup = () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("contextmenu", onContextMenu, true);
      if (this.popoutWindow && !this.popoutWindow.closed) {
        this.popoutWindow.removeEventListener("keydown", onKeyDown, true);
        this.popoutWindow.removeEventListener("mousedown", onMouseDown, true);
        this.popoutWindow.removeEventListener("contextmenu", onContextMenu, true);
      }
      this.recorderCleanup = null;
    };
    this.recorderCleanup = cleanup;
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("contextmenu", onContextMenu, true);
    if (this.popoutWindow && !this.popoutWindow.closed) {
      this.popoutWindow.addEventListener("keydown", onKeyDown, true);
      this.popoutWindow.addEventListener("mousedown", onMouseDown, true);
      this.popoutWindow.addEventListener("contextmenu", onContextMenu, true);
    }
  }
  static startLocoKeyListening(keyName) {
    if (this.recorderCleanup) this.recorderCleanup();
    this.listeningLocoKey = keyName;
    this.renderActiveView();
    if (!this.workingSchema) return;
    const schema = this.workingSchema;
    const onKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "Escape") {
        cleanup();
        this.listeningLocoKey = null;
        this.renderActiveView();
        return;
      }
      schema.keyboardMouse.locomotion[keyName] = e.code;
      cleanup();
      this.listeningLocoKey = null;
      this.renderActiveView();
    };
    const cleanup = () => {
      window.removeEventListener("keydown", onKeyDown, true);
      if (this.popoutWindow && !this.popoutWindow.closed) {
        this.popoutWindow.removeEventListener("keydown", onKeyDown, true);
      }
      this.recorderCleanup = null;
    };
    this.recorderCleanup = cleanup;
    window.addEventListener("keydown", onKeyDown, true);
    if (this.popoutWindow && !this.popoutWindow.closed) {
      this.popoutWindow.addEventListener("keydown", onKeyDown, true);
    }
  }
  // --- Categorized Action Function Popover ---
  static showActionPickerMenu(ruleId, statementIdx, anchorBtn) {
    const activeDoc = this.popoutWindow && !this.popoutWindow.closed ? this.popoutWindow.document : document;
    const existing = activeDoc.getElementById("action-picker-popover");
    if (existing) existing.remove();
    if (!this.modalChar || !this.workingSchema) return;
    const char = this.modalChar;
    const rule = this.findRule(this.workingSchema, ruleId);
    if (!rule) return;
    const { attached, unattached } = ControlActionCatalog.getCategorizedForCharacter(char);
    const popover = activeDoc.createElement("div");
    popover.id = "action-picker-popover";
    popover.style.cssText = `
      position: fixed;
      z-index: 10005;
      background: #090d16;
      border: 1px solid rgba(148, 163, 184, 0.3);
      border-radius: 8px;
      padding: 10px;
      max-height: 340px;
      width: 290px;
      overflow-y: auto;
      box-shadow: 0 15px 35px rgba(0,0,0,0.85);
      backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-family: inherit;
    `;
    const rect = anchorBtn.getBoundingClientRect();
    const winHeight = this.popoutWindow && !this.popoutWindow.closed ? this.popoutWindow.innerHeight : window.innerHeight;
    const winWidth = this.popoutWindow && !this.popoutWindow.closed ? this.popoutWindow.innerWidth : window.innerWidth;
    popover.style.top = `${Math.min(winHeight - 360, rect.bottom + 4)}px`;
    popover.style.left = `${Math.max(10, Math.min(winWidth - 310, rect.left - 100))}px`;
    popover.innerHTML = `
      <div style="font-size: 0.74rem; font-weight: 700; color: #ffffff; padding-bottom: 6px; border-bottom: 1px solid rgba(148, 163, 184, 0.2);">
        Select Target Action Function
      </div>

      <!-- Attached Modules (Prioritized) -->
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <span style="font-size: 0.66rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">⭐ ATTACHED MODULES</span>
        ${attached.map(
      (cat) => `
          <div style="display: flex; flex-direction: column; background: rgba(255,255,255,0.03); border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 4px; padding: 4px;">
            <span style="font-size: 0.70rem; font-weight: 600; color: #ffffff;">${cat.icon} ${cat.label}</span>
            <div style="display: flex; flex-direction: column; gap: 2px; margin-top: 2px; padding-left: 6px;">
              ${cat.actions.map(
        (act) => `
                <button class="btn-select-action" data-mod="${cat.id}" data-intent="${act.id}" style="text-align: left; background: none; border: none; color: #ffffff; font-size: 0.70rem; padding: 3px 4px; border-radius: 3px; cursor: pointer;">
                  • <strong style="color: #ffffff;">${act.label}</strong>
                </button>
              `
      ).join("")}
            </div>
          </div>
        `
    ).join("")}
      </div>

      <!-- Unattached Modules (Collapsed by default) -->
      ${unattached.length > 0 ? `
        <details style="margin-top: 4px;">
          <summary style="font-size: 0.66rem; font-weight: 700; color: #94a3b8; cursor: pointer;">
            📦 OTHER MODULES (${unattached.length})
          </summary>
          <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
            ${unattached.map(
      (cat) => `
              <div style="display: flex; flex-direction: column; background: rgba(0,0,0,0.3); border-radius: 4px; padding: 4px;">
                <span style="font-size: 0.68rem; color: #64748b;">${cat.icon} ${cat.label}</span>
                <div style="display: flex; flex-direction: column; gap: 2px; padding-left: 6px;">
                  ${cat.actions.map(
        (act) => `
                    <button class="btn-select-action" data-mod="${cat.id}" data-intent="${act.id}" style="text-align: left; background: none; border: none; color: #64748b; font-size: 0.68rem; padding: 2px 4px; cursor: pointer;">
                      • ${act.label}
                    </button>
                  `
      ).join("")}
                </div>
              </div>
            `
    ).join("")}
          </div>
        </details>
      ` : ""}
    `;
    activeDoc.body.appendChild(popover);
    popover.querySelectorAll(".btn-select-action").forEach((btn) => {
      btn.addEventListener("click", () => {
        var _a, _b, _c;
        if (!this.workingSchema) return;
        const schema = this.workingSchema;
        const mod = btn.dataset.mod;
        const intent = btn.dataset.intent;
        if (mod && intent) {
          const actDef = ControlActionCatalog.findAction(mod, intent);
          if ((actDef == null ? void 0 : actDef.recommendedMode) && rule.trigger.mode === "press") {
            rule.trigger.mode = actDef.recommendedMode;
          }
          const stmts = ControlSchemaArbiter.getRuleBody(rule);
          if (stmts[statementIdx] && stmts[statementIdx].type === "action") {
            stmts[statementIdx].action.moduleId = mod;
            stmts[statementIdx].action.intent = intent;
            if (mod === "staging" && intent === "setStage") {
              const defaultGrp = ((_a = _ControlsInspector.getActiveStageGroups(schema)[0]) == null ? void 0 : _a.name) || "default";
              const existingArgs = stmts[statementIdx].action.args || {};
              stmts[statementIdx].action.args = {
                group: existingArgs.group || defaultGrp,
                stage: existingArgs.stage || "none"
              };
            }
          } else {
            const actions = ControlSchemaArbiter.getRuleActions(rule);
            if (actions[statementIdx]) {
              actions[statementIdx].moduleId = mod;
              actions[statementIdx].intent = intent;
              if (mod === "staging" && intent === "setStage") {
                const defaultGrp = ((_b = _ControlsInspector.getActiveStageGroups(schema)[0]) == null ? void 0 : _b.name) || "default";
                const existingArgs = actions[statementIdx].args || {};
                actions[statementIdx].args = {
                  group: existingArgs.group || defaultGrp,
                  stage: existingArgs.stage || "none"
                };
              }
            } else {
              const defaultGrp = ((_c = _ControlsInspector.getActiveStageGroups(schema)[0]) == null ? void 0 : _c.name) || "default";
              actions.push({
                moduleId: mod,
                intent,
                args: mod === "staging" ? { group: defaultGrp, stage: "none" } : void 0
              });
            }
            rule.actions = actions;
            rule.action = actions[0];
          }
          rule.body = stmts;
          ControlSchemaArbiter.syncRuleFromStatements(rule);
          popover.remove();
          this.renderActiveView();
        }
      });
    });
    const onDocClick = (e) => {
      if (!popover.contains(e.target) && e.target !== anchorBtn) {
        popover.remove();
        activeDoc.removeEventListener("click", onDocClick);
      }
    };
    setTimeout(() => activeDoc.addEventListener("click", onDocClick), 10);
  }
};
__publicField(_ControlsInspector, "modalChar", null);
__publicField(_ControlsInspector, "modalPanel", null);
__publicField(_ControlsInspector, "popoutWindow", null);
__publicField(_ControlsInspector, "isParentReloading", false);
__publicField(_ControlsInspector, "lastRebindTime", 0);
__publicField(_ControlsInspector, "modalOverlay", null);
__publicField(_ControlsInspector, "workingSchema", null);
__publicField(_ControlsInspector, "activeTab", "keyboardMouse");
__publicField(_ControlsInspector, "listeningBlockTarget", null);
__publicField(_ControlsInspector, "showJsonEditor", false);
__publicField(_ControlsInspector, "jsonErrorMessage", null);
__publicField(_ControlsInspector, "collapsedRuleIds", /* @__PURE__ */ new Set());
__publicField(_ControlsInspector, "listeningTagId", null);
__publicField(_ControlsInspector, "listeningRuleId", null);
__publicField(_ControlsInspector, "listeningForwardTrigger", false);
__publicField(_ControlsInspector, "listeningLocoKey", null);
__publicField(_ControlsInspector, "recorderCleanup", null);
__publicField(_ControlsInspector, "keydownListener", null);
let ControlsInspector = _ControlsInspector;
if (typeof window !== "undefined") {
  window.ControlsInspector = ControlsInspector;
  window.addEventListener("beforeunload", () => {
    ControlsInspector.isParentReloading = true;
    if (ControlsInspector.popoutWindow && !ControlsInspector.popoutWindow.closed) {
      try {
        ControlsInspector.popoutWindow.__needsRebind = true;
        const root = ControlsInspector.popoutWindow.document.getElementById("controls-window-root");
        if (root) {
          root.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; color:#94a3b8; background:#090d16;">
              <div style="font-size:2rem; animation: pulse 1s infinite;">🔄</div>
              <div style="margin-top:12px; font-size:1rem; font-weight:600; color:#ffffff;">Reloading with Game...</div>
              <div style="margin-top:4px; font-size:0.75rem;">Reconnecting controls schema to refreshed game instance</div>
            </div>
          `;
        }
      } catch {
      }
    }
  });
}
const PLAYER_COLORS = [
  "#f59e0b",
  // P1: Amber Gold
  "#06b6d4",
  // P2: Cyan
  "#10b981",
  // P3: Emerald
  "#a855f7",
  // P4: Violet
  "#f43f5e",
  // P5: Rose
  "#3b82f6"
  // P6: Blue
];
const version = 258;
const lastSaved = "2026-11-03T09:00:12.260Z";
const arena = { "width": 30, "height": 30, "wallHeight": 1, "presetId": "quarry", "tileGrid": [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0], [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0], [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0], [0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0], [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0], [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0], [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0], [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0], [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]] };
const globalPhysics = { "gravity": 30, "collisionDamageScale": 0.1, "collisionMode": "dynamic" };
const player = /* @__PURE__ */ JSON.parse('{"name":"Player 1","prefabId":"prefab_player","color":"#f59e0b","mass":1.2,"colliderRadius":0.44,"hasWalking":true,"walkingModule":{"walkInAir":true,"canSprint":true,"maxWalkForce":35,"maxWalkSpeed":5.2,"sprintSpeed":8.06,"walkPowerCapacity":400,"sprintPowerCapacity":1200,"airFriction":1,"walkConsumesEnergy":false,"walkAllowPartialPower":false,"sprintConsumesEnergy":true,"sprintAllowPartialPower":true,"maxWalkPower":400,"maxSprintPower":1200},"hasJump":true,"jumpModule":{"jumpImpulse":16.5,"maxInitialSpeed":8.8,"jumpPowerCapacity":1200,"jumpConsumesEnergy":true,"jumpAllowPartialPower":true},"hasThrow":true,"throwModule":{"throwPowerCapacity":1200,"maxPower":1200,"maxThrowSpeed":69,"throwForce":69,"maxThrowHeight":5,"consumesEnergy":true},"hasHealth":true,"healthModule":{"maxHp":100,"naturalHealRate":2,"joulesPerHp":80,"maxPower":500,"currentHp":100,"hpPerJoule":80,"consumesEnergy":true,"allowPartialPower":true},"hasEnergyPool":true,"energyPool":{"staminaCapacity":5000,"staminaRegenRate":500,"energyPoolCapacity":10000,"currentStamina":5000,"currentEnergy":10000,"muscleEfficiency":0.25,"infiniteEnergy":false,"debugAutoRefillOnEmpty":false},"hasMelee":true,"meleeModule":{"impactForce":350,"maxPower":500,"allowPartialPower":true,"punchFrequency":4,"reach":1.2,"width":0.8},"hasLaser":true,"laserModule":{"maxPower":2000,"maxRange":15,"damageRate":50,"thickness":0.35,"allowPartialPower":true},"damageSolverModule":{"selfImpactWeight":0,"minShockThreshold":0,"enabled":true,"impactSusceptibility":1},"id":"obj-a0git3s","controlSchema":{"id":"default","name":"Default (Action Context)","description":"Standard twin-stick and WASD setup with smart contextual action triggers.","activeDevice":"keyboardMouse","keyboardMouse":{"aiming":{"mode":"faceMouseCursor"},"locomotion":{"mode":"forwardFacingDrive","forwardTrigger":{"device":"mouse","code":"MouseLeft","mode":"hold"}},"rules":[{"id":"rule-mvutadk33p6","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvutadk3","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"holdingPlainObject"}],"condition":{"type":"holdingPlainObject"},"actions":[{"moduleId":"throw","intent":"aimThrow"},{"moduleId":"staging","intent":"setStage","args":{"stage":"throw","group":"action"}}],"action":{"moduleId":"throw","intent":"aimThrow"},"body":[{"type":"action","action":{"moduleId":"throw","intent":"aimThrow"}},{"type":"action","action":{"moduleId":"staging","intent":"setStage","args":{"stage":"throw","group":"action"}}}],"children":[]},{"id":"rule-mvutfwetv21","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvutbcys","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"stagedActionIs","param":"throw","stageGroup":"action"},{"type":"tagPressed","param":"tag-kbm-ffc1ts"}],"condition":{"type":"stagedActionIs","param":"throw","stageGroup":"action"},"actions":[{"moduleId":"throw","intent":"releaseThrow"}],"action":{"moduleId":"throw","intent":"releaseThrow"},"body":[{"type":"action","action":{"moduleId":"throw","intent":"releaseThrow"}}],"children":[]},{"id":"rule-mvutbcys4cb","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvutbcys","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagHeld","param":"tag-kbm-ffc1ts"}],"condition":{"type":"tagHeld","param":"tag-kbm-ffc1ts"},"actions":[],"body":[{"type":"nestedThread","threadId":"subthread-mvutc9vqisq","rules":[{"id":"rule-mvutd4mgd4n","name":"Action Branch","enabled":true,"priority":50,"threadId":"subthread-mvutc9vqisq","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"stagedActionIs","param":"laser","stageGroup":"action"}],"condition":{"type":"stagedActionIs","param":"laser","stageGroup":"action"},"actions":[{"moduleId":"laser","intent":"fireLaser"}],"action":{"moduleId":"laser","intent":"fireLaser"},"body":[{"type":"action","action":{"moduleId":"laser","intent":"fireLaser"}}],"children":[]},{"id":"rule-mvutdcii7fj","name":"Action Branch","enabled":true,"priority":50,"threadId":"subthread-mvutc9vqisq","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"holdingItemWithPrimaryAbility"},{"type":"group","op":"or","conditions":[{"type":"stagedActionIs","param":"none","stageGroup":"action"},{"type":"stagedActionIs","param":"itemAbility","stageGroup":"action"}]}],"condition":{"type":"holdingItemWithPrimaryAbility"},"actions":[{"moduleId":"heldItem","intent":"primaryItemAbility"},{"moduleId":"staging","intent":"setStage","args":{"stage":"itemAbility","group":"action"}}],"action":{"moduleId":"heldItem","intent":"primaryItemAbility"},"body":[{"type":"action","action":{"moduleId":"heldItem","intent":"primaryItemAbility"}},{"type":"action","action":{"moduleId":"staging","intent":"setStage","args":{"stage":"itemAbility","group":"action"}}}],"children":[]},{"id":"rule-mvutegn9ot6","name":"Action Branch","enabled":true,"priority":50,"threadId":"subthread-mvutc9vqisq","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"emptyHanded"},{"type":"group","op":"or","conditions":[{"type":"stagedActionIs","param":"none","stageGroup":"action"},{"type":"stagedActionIs","param":"grab","stageGroup":"action"}]}],"condition":{"type":"emptyHanded"},"actions":[{"moduleId":"pickup","intent":"pickupReach"},{"moduleId":"staging","intent":"setStage","args":{"stage":"grab","group":"action"}}],"action":{"moduleId":"pickup","intent":"pickupReach"},"body":[{"type":"action","action":{"moduleId":"pickup","intent":"pickupReach"}},{"type":"action","action":{"moduleId":"staging","intent":"setStage","args":{"stage":"grab","group":"action"}}}],"children":[]}]}],"children":[{"id":"rule-mvutd4mgd4n","name":"Action Branch","enabled":true,"priority":50,"threadId":"subthread-mvutc9vqisq","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"stagedActionIs","param":"laser"}],"condition":{"type":"stagedActionIs","param":"laser"},"actions":[{"moduleId":"laser","intent":"fireLaser"}],"action":{"moduleId":"laser","intent":"fireLaser"},"body":[{"type":"action","action":{"moduleId":"laser","intent":"fireLaser"}}],"children":[]},{"id":"rule-mvutdcii7fj","name":"Action Branch","enabled":true,"priority":50,"threadId":"subthread-mvutc9vqisq","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"holdingItemWithPrimaryAbility"}],"condition":{"type":"holdingItemWithPrimaryAbility"},"actions":[{"moduleId":"heldItem","intent":"primaryItemAbility"}],"action":{"moduleId":"heldItem","intent":"primaryItemAbility"},"body":[{"type":"action","action":{"moduleId":"heldItem","intent":"primaryItemAbility"}}],"children":[]},{"id":"rule-mvutegn9ot6","name":"Action Branch","enabled":true,"priority":50,"threadId":"subthread-mvutc9vqisq","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"emptyHanded"}],"condition":{"type":"emptyHanded"},"actions":[{"moduleId":"pickup","intent":"pickupReach"}],"action":{"moduleId":"pickup","intent":"pickupReach"},"body":[{"type":"action","action":{"moduleId":"pickup","intent":"pickupReach"}}],"children":[]}]},{"id":"rule-mvuxjb3jumc","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuxjb3j","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagReleased","param":"tag-kbm-ffc1ts"}],"condition":{"type":"tagReleased","param":"tag-kbm-ffc1ts"},"actions":[{"moduleId":"staging","intent":"setStage","args":{"stage":"none","group":"action"}}],"action":{"moduleId":"staging","intent":"setStage","args":{"stage":"none","group":"action"}},"body":[{"type":"action","action":{"moduleId":"staging","intent":"setStage","args":{"stage":"none","group":"action"}}}],"children":[]},{"id":"rule-mvuyuaktqyz","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuyuakt","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagHeld","param":"tag-kbm-scjxrr"}],"condition":{"type":"tagHeld","param":"tag-kbm-scjxrr"},"actions":[{"moduleId":"locomotion","intent":"jump"}],"action":{"moduleId":"locomotion","intent":"jump"},"body":[{"type":"action","action":{"moduleId":"locomotion","intent":"jump"}}],"children":[]},{"id":"rule-mvuyukiqe8r","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuyukiq","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagPressed","param":"tag-kbm-i3csb0"}],"condition":{"type":"tagPressed","param":"tag-kbm-i3csb0"},"actions":[{"moduleId":"melee","intent":"punch"}],"action":{"moduleId":"melee","intent":"punch"},"body":[{"type":"action","action":{"moduleId":"melee","intent":"punch"}}],"children":[]},{"id":"rule-mvuyutgqxj8","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuyutgq","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagHeld","param":"tag-kbm-mxj04b"}],"condition":{"type":"tagHeld","param":"tag-kbm-mxj04b"},"actions":[{"moduleId":"staging","intent":"setStage","args":{"stage":"laser","group":"action"}},{"moduleId":"laser","intent":"aimLaser"}],"action":{"moduleId":"staging","intent":"setStage","args":{"stage":"laser","group":"action"}},"body":[{"type":"action","action":{"moduleId":"staging","intent":"setStage","args":{"stage":"laser","group":"action"}}},{"type":"action","action":{"moduleId":"laser","intent":"aimLaser"}}],"children":[]},{"id":"rule-mvuz1v84zsz","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuyutgq","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagReleased","param":"tag-kbm-mxj04b"},{"type":"stagedActionIs","param":"laser","stageGroup":"action"}],"condition":{"type":"tagReleased","param":"tag-kbm-mxj04b"},"actions":[{"moduleId":"staging","intent":"setStage","args":{"stage":"none","group":"action"}}],"action":{"moduleId":"staging","intent":"setStage","args":{"stage":"none","group":"action"}},"body":[{"type":"action","action":{"moduleId":"staging","intent":"setStage","args":{"stage":"none","group":"action"}}}],"children":[]},{"id":"rule-mvuyy7gta43","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuyy7gt","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagHeld","param":"tag-kbm-5ftccu"}],"condition":{"type":"tagHeld","param":"tag-kbm-5ftccu"},"actions":[{"moduleId":"throw","intent":"aimThrow"},{"moduleId":"staging","intent":"setStage","args":{"stage":"throw","group":"action"}}],"action":{"moduleId":"throw","intent":"aimThrow"},"body":[{"type":"action","action":{"moduleId":"throw","intent":"aimThrow"}},{"type":"action","action":{"moduleId":"staging","intent":"setStage","args":{"stage":"throw","group":"action"}}}],"children":[]},{"id":"rule-mvuyzn14ezj","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuyy7gt","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagReleased","param":"tag-kbm-5ftccu"},{"type":"stagedActionIs","param":"throw","stageGroup":"action"}],"condition":{"type":"tagReleased","param":"tag-kbm-5ftccu"},"actions":[{"moduleId":"staging","intent":"setStage","args":{"stage":"none","group":"action"}}],"action":{"moduleId":"staging","intent":"setStage","args":{"stage":"none","group":"action"}},"body":[{"type":"action","action":{"moduleId":"staging","intent":"setStage","args":{"stage":"none","group":"action"}}}],"children":[]},{"id":"rule-mvuz2yjunae","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuz2yju","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagHeld","param":"tag-kbm-6o3l7h"}],"condition":{"type":"tagHeld","param":"tag-kbm-6o3l7h"},"actions":[{"moduleId":"locomotion","intent":"holdSprint"}],"action":{"moduleId":"locomotion","intent":"holdSprint"},"body":[{"type":"action","action":{"moduleId":"locomotion","intent":"holdSprint"}}],"children":[]},{"id":"rule-mvuz5lavrjc","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuz5lav","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagHeld","param":"tag-kbm-tn6irx"},{"type":"emptyHanded"}],"condition":{"type":"tagHeld","param":"tag-kbm-tn6irx"},"actions":[{"moduleId":"pickup","intent":"pickupReach"}],"action":{"moduleId":"pickup","intent":"pickupReach"},"body":[{"type":"action","action":{"moduleId":"pickup","intent":"pickupReach"}}],"children":[]},{"id":"rule-mvuz7b3sp8t","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuz7b3s","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagHeld","param":"tag-kbm-tn6irx"},{"type":"holdingObject"},{"type":"targetInReach"},{"type":"stagedActionIs","stageGroup":"interact","param":"none"}],"condition":{"type":"tagHeld","param":"tag-kbm-tn6irx"},"actions":[{"moduleId":"pickup","intent":"swap"},{"moduleId":"staging","intent":"setStage","args":{"group":"interact","stage":"dirty"}}],"action":{"moduleId":"pickup","intent":"swap"},"body":[{"type":"action","action":{"moduleId":"pickup","intent":"swap"}},{"type":"action","action":{"moduleId":"staging","intent":"setStage","args":{"group":"interact","stage":"dirty"}}}],"children":[]},{"id":"rule-mvuz63kzy0m","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuz63kz","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagPressed","param":"tag-kbm-5j0zp9"}],"condition":{"type":"tagPressed","param":"tag-kbm-5j0zp9"},"actions":[{"moduleId":"pickup","intent":"dropItem"}],"action":{"moduleId":"pickup","intent":"dropItem"},"body":[{"type":"action","action":{"moduleId":"pickup","intent":"dropItem"}}],"children":[]},{"id":"rule-mvv00aqr8yr","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvv00aqr","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagReleased","param":"tag-kbm-tn6irx"}],"condition":{"type":"tagReleased","param":"tag-kbm-tn6irx"},"actions":[{"moduleId":"staging","intent":"setStage","args":{"group":"interact","stage":"none"}}],"action":{"moduleId":"staging","intent":"setStage","args":{"group":"interact","stage":"none"}},"body":[{"type":"action","action":{"moduleId":"staging","intent":"setStage","args":{"group":"interact","stage":"none"}}}],"children":[]}],"tags":[{"id":"tag-kbm-ffc1ts","name":"Action","trigger":{"device":"mouse","code":"MouseRight","mode":"hold"}},{"id":"tag-kbm-5j0zp9","name":"Drop Item","trigger":{"device":"keyboard","code":"KeyQ","mode":"press"}},{"id":"tag-kbm-5ftccu","name":" Throw Mode","trigger":{"device":"keyboard","code":"KeyA","mode":"hold"}},{"id":"tag-kbm-tn6irx","name":"Interact","trigger":{"device":"keyboard","code":"KeyF","mode":"press"}},{"id":"tag-kbm-scjxrr","name":"Jump","trigger":{"device":"keyboard","code":"Space","mode":"press"}},{"id":"tag-kbm-6o3l7h","name":"Sprint","trigger":{"device":"keyboard","code":"ShiftLeft","mode":"press"}},{"id":"tag-kbm-i3csb0","name":"Melee","trigger":{"device":"keyboard","code":"KeyD","mode":"press"}},{"id":"tag-kbm-mxj04b","name":"Laser","trigger":{"device":"keyboard","code":"KeyS","mode":"press"}}],"channels":{"locomotion":{"mode":"forwardFacingDrive","upKeys":["KeyW","ArrowUp"],"downKeys":["KeyS","ArrowDown"],"leftKeys":["KeyA","ArrowLeft"],"rightKeys":["KeyD","ArrowRight"],"sprintKey":"ShiftLeft","sprintMode":"hold","jumpKey":"Space"},"aiming":{"mode":"faceMouseCursor","rawMouseDragEnabled":true},"interaction":{"enabled":true,"trigger":{"device":"mouse","code":"MouseLeft","mode":"press"},"claimPolicy":"requireCleanPress","allowSwapWhenHolding":true},"throw":{"enabled":true,"aimTrigger":{"device":"mouse","code":"MouseRight","mode":"hold"},"fireTrigger":{"device":"mouse","code":"MouseLeft","mode":"press"},"fireOnReleaseAim":false,"arcModulationSource":"mouseDragY","arcDragHoldThresholdMs":200,"claimPolicy":"requireCleanPress"},"consume":{"enabled":true,"trigger":{"device":"keyboard","code":"KeyE","mode":"hold"},"claimPolicy":"requireCleanPress"},"melee":{"enabled":true,"trigger":{"device":"keyboard","code":"KeyF","mode":"press"},"claimPolicy":"requireCleanPress"},"laser":{"enabled":true,"aimTrigger":{"device":"mouse","code":"MouseRight","chordModifiers":["AltLeft"],"mode":"hold"},"fireTrigger":{"device":"mouse","code":"MouseLeft","mode":"hold"},"powerModulationSource":"mouseWheel"}},"pipeline":[{"id":"pipe-facing","name":"Aim / Facing Heading","enabled":true,"source":{"type":"2d_vector","source":"mouseWorldPos"},"processor":{"type":"facing","mode":"fromMousePos"},"target":"character.facing"},{"id":"pipe-loco-move","name":"WASD Movement Vector","enabled":true,"source":{"type":"button","device":"mouse","code":"MouseLeft"},"processor":{"type":"button","triggerMode":"hold","requireCleanPress":true,"claimOnFire":true},"target":"locomotion.forwardThrust"},{"id":"pipe-loco-sprint","name":"Sprint","enabled":true,"source":{"type":"button","device":"keyboard","code":"ShiftLeft"},"processor":{"type":"button","triggerMode":"hold"},"target":"locomotion.sprint"},{"id":"pipe-loco-jump","name":"Jump / Hop","enabled":true,"source":{"type":"button","device":"keyboard","code":"Space"},"processor":{"type":"button","triggerMode":"down","requireCleanPress":true,"claimOnFire":true},"target":"locomotion.jump"},{"id":"pipe-pickup-grab","name":"Grab Ground Item","enabled":true,"condition":"emptyHanded","source":{"type":"button","device":"mouse","code":"MouseRight"},"processor":{"type":"button","triggerMode":"down","requireCleanPress":true,"claimOnFire":true},"target":"pickup.grab"},{"id":"pipe-pickup-drop","name":"Drop Held Item","enabled":true,"condition":"holdingItem","source":{"type":"button","device":"keyboard","code":"KeyQ"},"processor":{"type":"button","triggerMode":"down","requireCleanPress":true,"claimOnFire":true},"target":"pickup.drop"},{"id":"pipe-consume-bite","name":"Bite / Eat Held Item","enabled":true,"condition":"holdingConsumable","source":{"type":"button","device":"keyboard","code":"KeyE"},"processor":{"type":"button","triggerMode":"hold","requireCleanPress":true,"claimOnFire":true},"target":"consume.bite"},{"id":"pipe-melee-punch","name":"Melee Punch","enabled":true,"source":{"type":"button","device":"keyboard","code":"KeyS"},"processor":{"type":"button","triggerMode":"down","requireCleanPress":true,"claimOnFire":true},"target":"melee.punch"},{"id":"pipe-laser-aim","name":"Laser Aim Chord","enabled":true,"source":{"type":"button","device":"keyboard","code":"KeyD","additionalCodes":[]},"processor":{"type":"button","triggerMode":"hold","claimOnFire":true},"target":"laser.aim"},{"id":"pipe-laser-fire","name":"Laser Fire","enabled":true,"source":{"type":"button","device":"mouse","code":"MouseRight","additionalCodes":["KeyD"]},"processor":{"type":"button","triggerMode":"hold","claimOnFire":true},"target":"laser.fire"},{"id":"pipe-laser-power","name":"Laser Power Modulation","enabled":true,"source":{"type":"1d_scalar","source":"mouseWheel"},"processor":{"type":"1d_scalar","mode":"accumulator","sensitivity":0.005,"clampMin":0,"clampMax":1,"initialValue":0.5,"autoCursorLock":false,"gateButton":{"device":"keyboard","code":"KeyD","mode":"hold"}},"target":"laser.power"},{"id":"pipe-mvxlcfjepx7","name":"New Binding","enabled":true,"source":{"type":"button","device":"keyboard","code":"KeyF"},"processor":{"type":"button","triggerMode":"hold","requireCleanPress":true,"claimOnFire":true},"target":"pickup.swap"},{"id":"pipe-mvxm2asjf1q","name":"New Binding","enabled":true,"source":{"type":"button","device":"mouse","code":"MouseRight"},"processor":{"type":"button","triggerMode":"hold","requireCleanPress":true,"claimOnFire":true},"target":"throw.chargeBow"}],"blocks":[{"type":"locomotion","id":"block-locomotion","name":"Locomotion","enabled":true,"moveKeys":{"upKey":"KeyW","downKey":"KeyS","leftKey":"KeyA","rightKey":"MouseLeft"},"jump":{"code":"Space"},"sprint":{"code":"ShiftLeft","mode":"hold"},"mode":"walkToMouse","forwardTrigger":{"code":"MouseLeft"},"reverseKey":null,"strafeLeftKey":null,"strafeRightKey":null,"cursorSteerTrigger":{"code":"GamepadLB"},"cursorSteerMode":"whenHoldingButton"},{"type":"itemInteraction","id":"block-items","name":"Item Interaction","enabled":true,"pickup":{"code":null},"drop":{"code":"KeyQ"},"swap":{"code":"KeyF"},"consume":{"code":"KeyE","requireCleanPress":true},"swapRequiresHolding":false,"triggerPickupWhenEmptyHanded":true,"additionalPickup":{"code":"MouseRight","gateButtons":[]}},{"type":"throw","id":"block-throw","name":"Throwing & Ballistics","enabled":true,"mode":"aimWallClear","chargeTrigger":{"code":"MouseRight","requireCleanPress":false},"aimTrigger":{"code":"MouseRight","requireCleanPress":false},"fireTrigger":{"code":"MouseLeft","requireCleanPress":true},"quickTrigger":{"code":"MouseRight"},"arcModulation":{"source":"mouseDeltaY","autoCursorLock":true,"sensitivity":0.005},"enableProximityCancel":true,"cancelRadius":1.5,"triggerMargin":0.15},{"type":"melee","id":"block-melee","name":"Melee Combat","enabled":true,"punch":{"code":"KeyS"}},{"type":"laser","id":"block-laser","name":"Laser Beam","enabled":true,"aimTrigger":{"code":"KeyD","gateButtons":[]},"aimMode":"mouseWorldPos","fireTrigger":{"code":"MouseRight","autoFireWhenAiming":false},"powerLevel":{"source":"mouseWheel","sensitivity":1}},{"type":"facing","id":"block-facing","name":"Aim / Heading Facing","enabled":true,"mode":"mouseWorldPos"}]},"gamepad":{"leftStick":{"primaryMode":"directLocomotion","dynamicOverride":{"triggerCondition":"whenLtHeld","overrideMode":"cursorSteer"},"cursorSteerSpeed":14,"cursorClampRadius":7.5},"rightStick":{"mode":"twinStickAim"},"rules":[{"id":"pad-laser-aim-lt","name":"Aim Laser (LT)","enabled":true,"priority":105,"trigger":{"device":"gamepad","code":"GamepadLT","mode":"hold"},"condition":{"type":"always"},"action":{"moduleId":"laser","intent":"aimLaser"},"tagId":"tag-pad-qq9kph"},{"id":"pad-laser-fire","name":"Fire Laser (RT)","enabled":true,"priority":100,"trigger":{"device":"gamepad","code":"GamepadRT","mode":"hold"},"condition":{"type":"always"},"action":{"moduleId":"laser","intent":"fireLaser"},"tagId":"tag-pad-yg4ita"},{"id":"pad-throw-aim-lt","name":"Aim Throw Trajectory (LT)","enabled":true,"priority":95,"trigger":{"device":"gamepad","code":"GamepadLT","mode":"hold"},"condition":{"type":"holdingObject"},"action":{"moduleId":"throwPickup","intent":"aimThrow"},"tagId":"tag-pad-qq9kph"},{"id":"pad-throw-release","name":"Throw Held Item (RT)","enabled":true,"priority":90,"trigger":{"device":"gamepad","code":"GamepadRT","mode":"release"},"condition":{"type":"holdingObject"},"action":{"moduleId":"throwPickup","intent":"releaseThrow"},"tagId":"tag-pad-yg4ita"},{"id":"pad-pickup-rt","name":"Pick Up Object (RT)","enabled":true,"priority":80,"trigger":{"device":"gamepad","code":"GamepadRT","mode":"press"},"condition":{"type":"targetInReach"},"action":{"moduleId":"throwPickup","intent":"pickupReach"},"tagId":"tag-pad-yg4ita"},{"id":"pad-melee-b","name":"Melee Punch (B)","enabled":true,"priority":75,"trigger":{"device":"gamepad","code":"GamepadB","mode":"press"},"condition":{"type":"emptyHanded"},"action":{"moduleId":"melee","intent":"punch"},"tagId":"tag-pad-wbxscb"},{"id":"pad-jump","name":"Jump (A)","enabled":true,"priority":70,"trigger":{"device":"gamepad","code":"GamepadA","mode":"press"},"condition":{"type":"always"},"action":{"moduleId":"locomotion","intent":"jump"},"tagId":"tag-pad-i8r8qh"},{"id":"pad-sprint-toggle","name":"Toggle Sprint (LS)","enabled":true,"priority":60,"trigger":{"device":"gamepad","code":"GamepadLS","mode":"press"},"condition":{"type":"always"},"action":{"moduleId":"locomotion","intent":"toggleSprint"},"tagId":"tag-pad-r7p78d"},{"id":"pad-drop","name":"Drop Item (X)","enabled":true,"priority":50,"trigger":{"device":"gamepad","code":"GamepadX","mode":"press"},"condition":{"type":"holdingObject"},"action":{"moduleId":"throwPickup","intent":"dropItem"},"tagId":"tag-pad-1wlz43"}],"tags":[{"id":"tag-pad-qq9kph","name":"Aim Laser","trigger":{"device":"gamepad","code":"GamepadLT","mode":"hold"}},{"id":"tag-pad-yg4ita","name":"Fire Laser","trigger":{"device":"gamepad","code":"GamepadRT","mode":"hold"}},{"id":"tag-pad-wbxscb","name":"Melee Punch","trigger":{"device":"gamepad","code":"GamepadB","mode":"press"}},{"id":"tag-pad-i8r8qh","name":"Jump","trigger":{"device":"gamepad","code":"GamepadA","mode":"press"}},{"id":"tag-pad-r7p78d","name":"Toggle Sprint","trigger":{"device":"gamepad","code":"GamepadLS","mode":"press"}},{"id":"tag-pad-1wlz43","name":"Drop Item","trigger":{"device":"gamepad","code":"GamepadX","mode":"press"}}],"blocks":[{"type":"locomotion","id":"block-locomotion-gp","name":"Locomotion","enabled":true,"mode":"analogStick","moveKeys":{"upKey":"GamepadDpadUp","downKey":"GamepadDpadDown","leftKey":"GamepadDpadLeft","rightKey":"GamepadDpadRight","requireCleanPress":false},"jump":{"code":"GamepadA","requireCleanPress":true},"sprint":{"code":"GamepadLS","mode":"toggle","requireCleanPress":true},"forwardTrigger":{"code":"GamepadLT"},"cursorSteerTrigger":{"code":"GamepadLT"},"cursorSteerMode":"whenHoldingButton","reverseKey":"KeyS","strafeLeftKey":"KeyA","strafeRightKey":"KeyD","rawDirectionWhileWalking":true,"stickCursorInFront":true,"cursorMaxDistance":4,"lockCursorDistanceToMax":true},{"type":"itemInteraction","id":"block-items-gp","name":"Item Interaction","enabled":true,"pickup":{"code":null,"requireCleanPress":true},"drop":{"code":"GamepadY","requireCleanPress":true},"swap":{"code":"GamepadB","requireCleanPress":true},"consume":{"code":"GamepadRB","requireCleanPress":false},"swapRequiresHolding":false,"triggerPickupWhenEmptyHanded":true,"additionalPickup":{"code":"GamepadRT"}},{"type":"throw","id":"block-throw-gp","name":"Throwing & Ballistics","enabled":true,"mode":"triggerPullForce","chargeTrigger":{"code":"GamepadRT","requireCleanPress":true},"aimTrigger":{"code":"GamepadLT","requireCleanPress":false},"fireTrigger":{"code":"GamepadRT","requireCleanPress":true},"quickTrigger":{"code":"GamepadRT","requireCleanPress":true},"triggerMargin":0.15,"arcModulation":{"source":"none","autoCursorLock":false,"sensitivity":0.005},"enableProximityCancel":true,"cancelRadius":1.5},{"type":"melee","id":"block-melee-gp","name":"Melee Combat","enabled":true,"punch":{"code":"GamepadX","requireCleanPress":true}},{"type":"laser","id":"block-laser-gp","name":"Laser Beam","enabled":true,"aimTrigger":{"code":null,"requireCleanPress":false},"aimMode":"mouseWorldPos","fireTrigger":{"code":"GamepadRT","autoFireWhenAiming":false,"requireCleanPress":false},"powerLevel":{"source":"none","sensitivity":1}},{"type":"facing","id":"block-facing-gp","name":"Aim / Heading Facing","enabled":true,"mode":"mouseWorldPos"}]},"touch":{"widgets":[{"id":"touch-move-stick","type":"joystick","label":"Move","anchor":"bottomLeft","offset":{"x":90,"y":90},"radius":65,"centering":"floating","snapBackOnRelease":true,"rings":[{"id":"deadzone","minDeflection":0,"maxDeflection":0.15,"signalId":"idle"},{"id":"walk","minDeflection":0.15,"maxDeflection":0.65,"signalId":"walk"},{"id":"sprint","minDeflection":0.65,"maxDeflection":1,"signalId":"sprint"}]},{"id":"touch-aim-stick","type":"joystick","label":"Aim","anchor":"bottomRight","offset":{"x":-90,"y":90},"radius":65,"centering":"floating","snapBackOnRelease":true,"rings":[]},{"id":"touch-jump-btn","type":"actionButton","label":"JUMP","anchor":"bottomRight","offset":{"x":-80,"y":190},"radius":35,"centering":"fixed","snapBackOnRelease":true,"rings":[],"tapAction":"jump"}],"rules":[],"tags":[]},"stages":["none","laser","throw","itemAbility","grab"],"stageGroups":[{"name":"action","stages":["none","laser","throw","itemAbility","grab"]},{"name":"interact","stages":["none","dirty"]}],"pipeline":[{"id":"pipe-facing","name":"Aim / Facing Heading","enabled":true,"source":{"type":"2d_vector","source":"mouseWorldPos"},"processor":{"type":"facing","mode":"fromMousePos"},"target":"character.facing"},{"id":"pipe-loco-move","name":"WASD Movement Vector","enabled":true,"source":{"type":"button","device":"mouse","code":"MouseLeft"},"processor":{"type":"button","triggerMode":"hold","requireCleanPress":true,"claimOnFire":true},"target":"locomotion.forwardThrust"},{"id":"pipe-loco-sprint","name":"Sprint","enabled":true,"source":{"type":"button","device":"keyboard","code":"ShiftLeft"},"processor":{"type":"button","triggerMode":"hold"},"target":"locomotion.sprint"},{"id":"pipe-loco-jump","name":"Jump / Hop","enabled":true,"source":{"type":"button","device":"keyboard","code":"Space"},"processor":{"type":"button","triggerMode":"down","requireCleanPress":true,"claimOnFire":true},"target":"locomotion.jump"},{"id":"pipe-pickup-grab","name":"Grab Ground Item","enabled":true,"condition":"emptyHanded","source":{"type":"button","device":"mouse","code":"MouseRight"},"processor":{"type":"button","triggerMode":"down","requireCleanPress":true,"claimOnFire":true},"target":"pickup.grab"},{"id":"pipe-pickup-drop","name":"Drop Held Item","enabled":true,"condition":"holdingItem","source":{"type":"button","device":"keyboard","code":"KeyQ"},"processor":{"type":"button","triggerMode":"down","requireCleanPress":true,"claimOnFire":true},"target":"pickup.drop"},{"id":"pipe-consume-bite","name":"Bite / Eat Held Item","enabled":true,"condition":"holdingConsumable","source":{"type":"button","device":"keyboard","code":"KeyE"},"processor":{"type":"button","triggerMode":"hold","requireCleanPress":true,"claimOnFire":true},"target":"consume.bite"},{"id":"pipe-melee-punch","name":"Melee Punch","enabled":true,"source":{"type":"button","device":"keyboard","code":"KeyS"},"processor":{"type":"button","triggerMode":"down","requireCleanPress":true,"claimOnFire":true},"target":"melee.punch"},{"id":"pipe-laser-aim","name":"Laser Aim Chord","enabled":true,"source":{"type":"button","device":"keyboard","code":"KeyD","additionalCodes":[]},"processor":{"type":"button","triggerMode":"hold","claimOnFire":true},"target":"laser.aim"},{"id":"pipe-laser-fire","name":"Laser Fire","enabled":true,"source":{"type":"button","device":"mouse","code":"MouseRight","additionalCodes":["KeyD"]},"processor":{"type":"button","triggerMode":"hold","claimOnFire":true},"target":"laser.fire"},{"id":"pipe-laser-power","name":"Laser Power Modulation","enabled":true,"source":{"type":"1d_scalar","source":"mouseWheel"},"processor":{"type":"1d_scalar","mode":"accumulator","sensitivity":0.005,"clampMin":0,"clampMax":1,"initialValue":0.5,"autoCursorLock":false,"gateButton":{"device":"keyboard","code":"KeyD","mode":"hold"}},"target":"laser.power"},{"id":"pipe-mvxlcfjepx7","name":"New Binding","enabled":true,"source":{"type":"button","device":"keyboard","code":"KeyF"},"processor":{"type":"button","triggerMode":"hold","requireCleanPress":true,"claimOnFire":true},"target":"pickup.swap"},{"id":"pipe-mvxm2asjf1q","name":"New Binding","enabled":true,"source":{"type":"button","device":"mouse","code":"MouseRight"},"processor":{"type":"button","triggerMode":"hold","requireCleanPress":true,"claimOnFire":true},"target":"throw.chargeBow"}]},"strength":1,"hasPickup":true,"pickupModule":{"pickupReach":1.3,"maxPower":250,"consumesEnergy":false,"allowPartialPower":false},"hasClimbing":false,"wallEdgeAssistModule":{"hangDistance":0.1,"preventWalkOff":false},"hasDamageSolverModule":true}');
const objects = /* @__PURE__ */ JSON.parse('[{"id":"stone-ground-1","name":"Small Throwing Stone","prefabId":"prefab_stone","position":{"x":4.2,"y":5.8,"z":0},"color":"#a8a29e","visualShape":"circle","isSleeping":true,"hasRigidbody":true,"hasCollider":true,"hasFriction":true,"hasBounce":true,"hasVerticalPosition":true,"hasGravity":true,"hasRollModule":true,"hasConsumableModule":false,"hasHealthModule":false,"hasDamageAuraModule":false,"hasDamageSolverModule":false,"mass":0.65,"colliderRadius":0.18,"bounceMod":0.15,"verticalBounce":true,"staticGroundFrictionMod":1,"dynamicGroundFrictionMod":1,"rigidbodyModule":{"enabled":true,"mass":0.65,"collisionMode":"dynamic","hasVerticalVelocity":true},"colliderModule":{"enabled":true,"radius":0.18},"frictionModule":{"enabled":true,"staticFrictionMod":1,"dynamicFrictionMod":1},"bounceModule":{"enabled":true,"bounceMod":0.15,"verticalBounce":true},"verticalPositionModule":{"enabled":true,"z":0},"gravityModule":{"enabled":true},"rollModule":{"enabled":true,"rollResistance":0.45,"bumpyRollEnabled":true,"bumpiness":0.28,"seed":101}},{"id":"stone-ground-2","name":"Throwing Stone","prefabId":"prefab_stone","position":{"x":4.8,"y":8.5,"z":0},"color":"#78716c","visualShape":"circle","isSleeping":true,"hasRigidbody":true,"hasCollider":true,"hasFriction":true,"hasBounce":true,"hasVerticalPosition":true,"hasGravity":true,"hasRollModule":true,"hasConsumableModule":false,"hasHealthModule":false,"hasDamageAuraModule":false,"hasDamageSolverModule":false,"mass":0.85,"colliderRadius":0.22,"bounceMod":0.15,"verticalBounce":true,"staticGroundFrictionMod":1,"dynamicGroundFrictionMod":1,"rigidbodyModule":{"enabled":true,"mass":0.85,"collisionMode":"dynamic","hasVerticalVelocity":true},"colliderModule":{"enabled":true,"radius":0.22},"frictionModule":{"enabled":true,"staticFrictionMod":1,"dynamicFrictionMod":1},"bounceModule":{"enabled":true,"bounceMod":0.15,"verticalBounce":true},"verticalPositionModule":{"enabled":true,"z":0.45},"gravityModule":{"enabled":true},"rollModule":{"enabled":true,"rollResistance":0.45,"bumpyRollEnabled":true,"bumpiness":0.28,"seed":102}},{"id":"stone-ground-3","name":"Heavy Stone","prefabId":"prefab_stone","position":{"x":8.2,"y":4.5,"z":0},"color":"#57534e","visualShape":"circle","isSleeping":true,"hasRigidbody":true,"hasCollider":true,"hasFriction":true,"hasBounce":true,"hasVerticalPosition":true,"hasGravity":true,"hasRollModule":true,"hasConsumableModule":false,"hasHealthModule":false,"hasDamageAuraModule":false,"hasDamageSolverModule":false,"mass":1.25,"colliderRadius":0.28,"bounceMod":0.1,"verticalBounce":true,"staticGroundFrictionMod":1,"dynamicGroundFrictionMod":1,"rigidbodyModule":{"enabled":true,"mass":1.25,"collisionMode":"dynamic","hasVerticalVelocity":true},"colliderModule":{"enabled":true,"radius":0.28},"frictionModule":{"enabled":true,"staticFrictionMod":1,"dynamicFrictionMod":1},"bounceModule":{"enabled":true,"bounceMod":0.1,"verticalBounce":true},"verticalPositionModule":{"enabled":true,"z":0},"gravityModule":{"enabled":true},"rollModule":{"enabled":true,"rollResistance":0.5,"bumpyRollEnabled":true,"bumpiness":0.28,"seed":103}},{"id":"stone-ground-4","name":"Throwing Stone","prefabId":"prefab_stone","position":{"x":11.8,"y":9.5,"z":0},"color":"#78716c","visualShape":"circle","isSleeping":true,"hasRigidbody":true,"hasCollider":true,"hasFriction":true,"hasBounce":true,"hasVerticalPosition":true,"hasGravity":true,"hasRollModule":true,"hasConsumableModule":false,"hasHealthModule":false,"hasDamageAuraModule":false,"hasDamageSolverModule":false,"mass":0.85,"colliderRadius":0.22,"bounceMod":0.15,"verticalBounce":true,"staticGroundFrictionMod":1,"dynamicGroundFrictionMod":1,"rigidbodyModule":{"enabled":true,"mass":0.85,"collisionMode":"dynamic","hasVerticalVelocity":true},"colliderModule":{"enabled":true,"radius":0.22},"frictionModule":{"enabled":true,"staticFrictionMod":1,"dynamicFrictionMod":1},"bounceModule":{"enabled":true,"bounceMod":0.15,"verticalBounce":true},"verticalPositionModule":{"enabled":true,"z":0},"gravityModule":{"enabled":true},"rollModule":{"enabled":true,"rollResistance":0.45,"bumpyRollEnabled":true,"bumpiness":0.28,"seed":104}},{"id":"stone-ground-5","name":"Small Throwing Stone","prefabId":"prefab_stone","position":{"x":15.2,"y":5.8,"z":0},"color":"#a8a29e","visualShape":"circle","isSleeping":true,"hasRigidbody":true,"hasCollider":true,"hasFriction":true,"hasBounce":true,"hasVerticalPosition":true,"hasGravity":true,"hasRollModule":true,"hasConsumableModule":false,"hasHealthModule":false,"hasDamageAuraModule":false,"hasDamageSolverModule":false,"mass":0.65,"colliderRadius":0.18,"bounceMod":0.15,"verticalBounce":true,"staticGroundFrictionMod":1,"dynamicGroundFrictionMod":1,"rigidbodyModule":{"enabled":true,"mass":0.65,"collisionMode":"dynamic","hasVerticalVelocity":true},"colliderModule":{"enabled":true,"radius":0.18},"frictionModule":{"enabled":true,"staticFrictionMod":1,"dynamicFrictionMod":1},"bounceModule":{"enabled":true,"bounceMod":0.15,"verticalBounce":true},"verticalPositionModule":{"enabled":true,"z":0},"gravityModule":{"enabled":true},"rollModule":{"enabled":true,"rollResistance":0.45,"bumpyRollEnabled":true,"bumpiness":0.28,"seed":105}},{"id":"stone-ground-6","name":"Heavy Stone","prefabId":"prefab_stone","position":{"x":15.8,"y":8.5,"z":0},"color":"#57534e","visualShape":"circle","isSleeping":true,"hasRigidbody":true,"hasCollider":true,"hasFriction":true,"hasBounce":true,"hasVerticalPosition":true,"hasGravity":true,"hasRollModule":true,"hasConsumableModule":false,"hasHealthModule":false,"hasDamageAuraModule":false,"hasDamageSolverModule":false,"mass":1.25,"colliderRadius":0.28,"bounceMod":0.1,"verticalBounce":true,"staticGroundFrictionMod":1,"dynamicGroundFrictionMod":1,"rigidbodyModule":{"enabled":true,"mass":1.25,"collisionMode":"dynamic","hasVerticalVelocity":true},"colliderModule":{"enabled":true,"radius":0.28},"frictionModule":{"enabled":true,"staticFrictionMod":1,"dynamicFrictionMod":1},"bounceModule":{"enabled":true,"bounceMod":0.1,"verticalBounce":true},"verticalPositionModule":{"enabled":true,"z":0},"gravityModule":{"enabled":true},"rollModule":{"enabled":true,"rollResistance":0.5,"bumpyRollEnabled":true,"bumpiness":0.28,"seed":106}},{"id":"stone-elevated-1","name":"Rampart Stone","prefabId":"prefab_stone","position":{"x":6.5,"y":2.5,"z":1},"color":"#78716c","visualShape":"circle","isSleeping":true,"hasRigidbody":true,"hasCollider":true,"hasFriction":true,"hasBounce":true,"hasVerticalPosition":true,"hasGravity":true,"hasRollModule":true,"hasConsumableModule":false,"hasHealthModule":false,"hasDamageAuraModule":false,"hasDamageSolverModule":false,"mass":0.9,"colliderRadius":0.23,"bounceMod":0.15,"verticalBounce":true,"staticGroundFrictionMod":1,"dynamicGroundFrictionMod":1,"rigidbodyModule":{"enabled":true,"mass":0.9,"collisionMode":"dynamic","hasVerticalVelocity":true},"colliderModule":{"enabled":true,"radius":0.23},"frictionModule":{"enabled":true,"staticFrictionMod":1,"dynamicFrictionMod":1},"bounceModule":{"enabled":true,"bounceMod":0.15,"verticalBounce":true},"verticalPositionModule":{"enabled":true,"z":1},"gravityModule":{"enabled":true},"rollModule":{"enabled":true,"rollResistance":0.45,"bumpyRollEnabled":true,"bumpiness":0.28,"seed":107}},{"id":"stone-elevated-2","name":"Rampart Stone","prefabId":"prefab_stone","position":{"x":13.5,"y":11.5,"z":1},"color":"#78716c","visualShape":"circle","isSleeping":true,"hasRigidbody":true,"hasCollider":true,"hasFriction":true,"hasBounce":true,"hasVerticalPosition":true,"hasGravity":true,"hasRollModule":true,"hasConsumableModule":false,"hasHealthModule":false,"hasDamageAuraModule":false,"hasDamageSolverModule":false,"mass":0.9,"colliderRadius":0.23,"bounceMod":0.15,"verticalBounce":true,"staticGroundFrictionMod":1,"dynamicGroundFrictionMod":1,"rigidbodyModule":{"enabled":true,"mass":0.9,"collisionMode":"dynamic","hasVerticalVelocity":true},"colliderModule":{"enabled":true,"radius":0.23},"frictionModule":{"enabled":true,"staticFrictionMod":1,"dynamicFrictionMod":1},"bounceModule":{"enabled":true,"bounceMod":0.15,"verticalBounce":true},"verticalPositionModule":{"enabled":true,"z":1},"gravityModule":{"enabled":true},"rollModule":{"enabled":true,"rollResistance":0.45,"bumpyRollEnabled":true,"bumpiness":0.28,"seed":108}},{"id":"obj-u5fhrng","name":"Apple","prefabId":"prefab_apple","position":{"x":10,"y":2.2,"z":0},"color":"#22c55e","visualShape":"circle","isSleeping":true,"hasRigidbody":true,"hasCollider":true,"hasFriction":true,"hasBounce":true,"hasVerticalPosition":true,"hasGravity":true,"hasRollModule":false,"hasConsumableModule":true,"hasHealthModule":false,"hasDamageAuraModule":false,"hasDamageSolverModule":false,"mass":0.35,"colliderRadius":0.25,"bounceMod":0.2,"verticalBounce":true,"staticGroundFrictionMod":1,"dynamicGroundFrictionMod":1,"rigidbodyModule":{"enabled":true,"mass":0.35,"collisionMode":"dynamic","hasVerticalVelocity":true},"colliderModule":{"enabled":true,"radius":0.25},"frictionModule":{"enabled":true,"staticFrictionMod":1,"dynamicFrictionMod":1},"bounceModule":{"enabled":true,"bounceMod":0.2,"verticalBounce":true},"verticalPositionModule":{"enabled":true,"z":0},"gravityModule":{"enabled":true},"consumableModule":{"enabled":true,"tag":"food","totalEnergyJoules":4000,"remainingEnergyJoules":4000,"consumeRateWatts":1200,"healRate":0,"minScaleFloor":0.35,"minRadiusFloor":0.12}},{"id":"super-apple-center","name":"Super Apple","prefabId":"prefab_super_apple","position":{"x":10,"y":7,"z":0},"color":"#ff1493","visualShape":"circle","isSleeping":true,"hasRigidbody":true,"hasCollider":true,"hasFriction":true,"hasBounce":true,"hasVerticalPosition":true,"hasGravity":true,"hasRollModule":false,"hasConsumableModule":true,"hasHealthModule":false,"hasDamageAuraModule":false,"hasDamageSolverModule":false,"mass":0.45,"colliderRadius":0.3,"bounceMod":0.2,"verticalBounce":true,"staticGroundFrictionMod":1,"dynamicGroundFrictionMod":1,"rigidbodyModule":{"enabled":true,"mass":0.45,"collisionMode":"dynamic","hasVerticalVelocity":true},"colliderModule":{"enabled":true,"radius":0.3},"frictionModule":{"enabled":true,"staticFrictionMod":1,"dynamicFrictionMod":1},"bounceModule":{"enabled":true,"bounceMod":0.2,"verticalBounce":true},"verticalPositionModule":{"enabled":true,"z":0},"gravityModule":{"enabled":true},"consumableModule":{"enabled":true,"tag":"food","unlimited":true,"totalEnergyJoules":10000,"remainingEnergyJoules":10000,"consumeRateWatts":2000,"healRate":0,"minScaleFloor":1,"minRadiusFloor":0.3}},{"id":"obj-zblid1b","name":"Apple","prefabId":"prefab_apple","position":{"x":3.5,"y":7,"z":0},"color":"#22c55e","visualShape":"circle","isSleeping":true,"hasRigidbody":true,"hasCollider":true,"hasFriction":true,"hasBounce":true,"hasVerticalPosition":true,"hasGravity":true,"hasRollModule":false,"hasConsumableModule":true,"hasHealthModule":false,"hasDamageAuraModule":false,"hasDamageSolverModule":false,"mass":0.35,"colliderRadius":0.25,"bounceMod":0.2,"verticalBounce":true,"staticGroundFrictionMod":1,"dynamicGroundFrictionMod":1,"rigidbodyModule":{"enabled":true,"mass":0.35,"collisionMode":"dynamic","hasVerticalVelocity":true},"colliderModule":{"enabled":true,"radius":0.25},"frictionModule":{"enabled":true,"staticFrictionMod":1,"dynamicFrictionMod":1},"bounceModule":{"enabled":true,"bounceMod":0.2,"verticalBounce":true},"verticalPositionModule":{"enabled":true,"z":0},"gravityModule":{"enabled":true},"consumableModule":{"enabled":true,"tag":"food","totalEnergyJoules":4000,"remainingEnergyJoules":4000,"consumeRateWatts":1200,"healRate":0,"minScaleFloor":0.35,"minRadiusFloor":0.12}},{"id":"obj-3veyg9h","name":"Apple","prefabId":"prefab_apple","position":{"x":16.5,"y":7,"z":0},"color":"#22c55e","visualShape":"circle","isSleeping":true,"hasRigidbody":true,"hasCollider":true,"hasFriction":true,"hasBounce":true,"hasVerticalPosition":true,"hasGravity":true,"hasRollModule":false,"hasConsumableModule":true,"hasHealthModule":false,"hasDamageAuraModule":false,"hasDamageSolverModule":false,"mass":0.35,"colliderRadius":0.25,"bounceMod":0.2,"verticalBounce":true,"staticGroundFrictionMod":1,"dynamicGroundFrictionMod":1,"rigidbodyModule":{"enabled":true,"mass":0.35,"collisionMode":"dynamic","hasVerticalVelocity":true},"colliderModule":{"enabled":true,"radius":0.25},"frictionModule":{"enabled":true,"staticFrictionMod":1,"dynamicFrictionMod":1},"bounceModule":{"enabled":true,"bounceMod":0.2,"verticalBounce":true},"verticalPositionModule":{"enabled":true,"z":0},"gravityModule":{"enabled":true},"consumableModule":{"enabled":true,"tag":"food","totalEnergyJoules":4000,"remainingEnergyJoules":4000,"consumeRateWatts":1200,"healRate":0,"minScaleFloor":0.35,"minRadiusFloor":0.12}},{"id":"obj-mcnn4yg","name":"Apple","prefabId":"prefab_apple","position":{"x":10,"y":11.8,"z":0},"color":"#22c55e","visualShape":"circle","isSleeping":true,"hasRigidbody":true,"hasCollider":true,"hasFriction":true,"hasBounce":true,"hasVerticalPosition":true,"hasGravity":true,"hasRollModule":false,"hasConsumableModule":true,"hasHealthModule":false,"hasDamageAuraModule":false,"hasDamageSolverModule":false,"mass":0.35,"colliderRadius":0.25,"bounceMod":0.2,"verticalBounce":true,"staticGroundFrictionMod":1,"dynamicGroundFrictionMod":1,"rigidbodyModule":{"enabled":true,"mass":0.35,"collisionMode":"dynamic","hasVerticalVelocity":true},"colliderModule":{"enabled":true,"radius":0.25},"frictionModule":{"enabled":true,"staticFrictionMod":1,"dynamicFrictionMod":1},"bounceModule":{"enabled":true,"bounceMod":0.2,"verticalBounce":true},"verticalPositionModule":{"enabled":true,"z":0},"gravityModule":{"enabled":true},"consumableModule":{"enabled":true,"tag":"food","totalEnergyJoules":4000,"remainingEnergyJoules":4000,"consumeRateWatts":1200,"healRate":0,"minScaleFloor":0.35,"minRadiusFloor":0.12}}]');
const prefabs = /* @__PURE__ */ JSON.parse('[{"id":"prefab_apple","name":"Apple","icon":"🍏","archetype":{"id":"archetype_apple","name":"Apple","position":{"x":0,"y":0,"z":0},"color":"#22c55e","visualShape":"circle","isSleeping":false,"hasRigidbody":true,"hasCollider":true,"hasFriction":true,"hasBounce":true,"hasVerticalPosition":true,"hasGravity":true,"hasRollModule":false,"hasConsumableModule":true,"hasHealthModule":false,"hasDamageAuraModule":false,"hasDamageSolverModule":false,"mass":0.35,"colliderRadius":0.25,"bounceMod":0.2,"verticalBounce":true,"staticGroundFrictionMod":1,"dynamicGroundFrictionMod":1,"rigidbodyModule":{"enabled":true,"mass":0.35,"collisionMode":"dynamic","hasVerticalVelocity":true},"colliderModule":{"enabled":true,"radius":0.25},"frictionModule":{"enabled":true,"staticFrictionMod":1,"dynamicFrictionMod":1},"bounceModule":{"enabled":true,"bounceMod":0.2,"verticalBounce":true},"verticalPositionModule":{"enabled":true,"z":0},"gravityModule":{"enabled":true},"consumableModule":{"enabled":true,"tag":"food","totalEnergyJoules":4000,"remainingEnergyJoules":4000,"consumeRateWatts":1200,"healRate":0,"minScaleFloor":0.35,"minRadiusFloor":0.12}}},{"id":"prefab_super_apple","name":"Super Apple","icon":"💖","archetype":{"id":"archetype_super_apple","name":"Super Apple","position":{"x":0,"y":0,"z":0},"color":"#ff1493","visualShape":"circle","isSleeping":false,"hasRigidbody":true,"hasCollider":true,"hasFriction":true,"hasBounce":true,"hasVerticalPosition":true,"hasGravity":true,"hasRollModule":false,"hasConsumableModule":true,"hasHealthModule":false,"hasDamageAuraModule":false,"hasDamageSolverModule":false,"mass":0.45,"colliderRadius":0.3,"bounceMod":0.2,"verticalBounce":true,"staticGroundFrictionMod":1,"dynamicGroundFrictionMod":1,"rigidbodyModule":{"enabled":true,"mass":0.45,"collisionMode":"dynamic","hasVerticalVelocity":true},"colliderModule":{"enabled":true,"radius":0.3},"frictionModule":{"enabled":true,"staticFrictionMod":1,"dynamicFrictionMod":1},"bounceModule":{"enabled":true,"bounceMod":0.2,"verticalBounce":true},"verticalPositionModule":{"enabled":true,"z":0},"gravityModule":{"enabled":true},"consumableModule":{"enabled":true,"tag":"food","unlimited":true,"totalEnergyJoules":10000,"remainingEnergyJoules":10000,"consumeRateWatts":2000,"healRate":0,"minScaleFloor":1,"minRadiusFloor":0.3}}},{"id":"prefab_stone","name":"Stone","icon":"🪨","archetype":{"id":"archetype_stone","name":"Stone","position":{"x":0,"y":0,"z":0},"color":"#78716c","visualShape":"circle","mass":0.85,"colliderRadius":0.22,"bounceMod":0.15,"verticalBounce":true,"hasRigidbody":true,"hasCollider":true,"hasFriction":true,"hasBounce":true,"hasVerticalPosition":true,"hasGravity":true,"hasRollModule":true,"hasConsumableModule":false,"hasHealthModule":false,"hasDamageAuraModule":false,"hasDamageSolverModule":false,"rigidbodyModule":{"enabled":true,"mass":0.85,"collisionMode":"dynamic","hasVerticalVelocity":true},"colliderModule":{"enabled":true,"radius":0.22},"frictionModule":{"enabled":true,"staticFrictionMod":1,"dynamicFrictionMod":1},"bounceModule":{"enabled":true,"bounceMod":0.15,"verticalBounce":true},"verticalPositionModule":{"enabled":true,"z":0},"gravityModule":{"enabled":true},"rollModule":{"enabled":true,"rollResistance":0.45,"bumpyRollEnabled":true,"bumpiness":0.28,"seed":100}}},{"id":"prefab_player","name":"Player","icon":"🧙","archetype":{"id":"archetype_player","name":"Player","position":{"x":5,"y":7,"z":0},"color":"#f59e0b","visualShape":"circle","isSleeping":false,"hasRigidbody":true,"hasCollider":true,"hasFriction":true,"hasBounce":true,"hasVerticalPosition":true,"hasGravity":true,"hasRollModule":false,"hasConsumableModule":false,"hasHealthModule":true,"hasDamageAuraModule":false,"hasDamageSolverModule":true,"mass":1.2,"colliderRadius":0.44,"bounceMod":0.1,"verticalBounce":true,"staticGroundFrictionMod":2,"dynamicGroundFrictionMod":2,"rigidbodyModule":{"enabled":true,"mass":1.2,"collisionMode":"dynamic","hasVerticalVelocity":true},"colliderModule":{"enabled":true,"radius":0.44},"frictionModule":{"enabled":true,"staticFrictionMod":2,"dynamicFrictionMod":2},"bounceModule":{"enabled":true,"bounceMod":0.1,"verticalBounce":true},"verticalPositionModule":{"enabled":true,"z":0},"gravityModule":{"enabled":true},"healthModule":{"enabled":true,"maxHp":100,"currentHp":100,"naturalHealRate":5},"damageSolverModule":{"enabled":true,"impactSusceptibility":1,"minShockThreshold":5,"selfImpactWeight":0}},"controlSchema":{"id":"default","name":"Default (Action Context)","description":"Standard twin-stick and WASD setup with smart contextual action triggers.","activeDevice":"keyboardMouse","keyboardMouse":{"aiming":{"mode":"faceMouseCursor"},"locomotion":{"mode":"forwardFacingDrive","forwardTrigger":{"device":"mouse","code":"MouseLeft","mode":"hold"}},"rules":[{"id":"rule-mvutadk33p6","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvutadk3","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"holdingPlainObject"}],"condition":{"type":"holdingPlainObject"},"actions":[{"moduleId":"throw","intent":"aimThrow"},{"moduleId":"staging","intent":"setStage","args":{"stage":"throw","group":"action"}}],"action":{"moduleId":"throw","intent":"aimThrow"},"body":[{"type":"action","action":{"moduleId":"throw","intent":"aimThrow"}},{"type":"action","action":{"moduleId":"staging","intent":"setStage","args":{"stage":"throw","group":"action"}}}],"children":[]},{"id":"rule-mvutfwetv21","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvutbcys","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"stagedActionIs","param":"throw","stageGroup":"action"},{"type":"tagPressed","param":"tag-kbm-ffc1ts"}],"condition":{"type":"stagedActionIs","param":"throw","stageGroup":"action"},"actions":[{"moduleId":"throw","intent":"releaseThrow"}],"action":{"moduleId":"throw","intent":"releaseThrow"},"body":[{"type":"action","action":{"moduleId":"throw","intent":"releaseThrow"}}],"children":[]},{"id":"rule-mvutbcys4cb","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvutbcys","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagHeld","param":"tag-kbm-ffc1ts"}],"condition":{"type":"tagHeld","param":"tag-kbm-ffc1ts"},"actions":[],"body":[{"type":"nestedThread","threadId":"subthread-mvutc9vqisq","rules":[{"id":"rule-mvutd4mgd4n","name":"Action Branch","enabled":true,"priority":50,"threadId":"subthread-mvutc9vqisq","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"stagedActionIs","param":"laser","stageGroup":"action"}],"condition":{"type":"stagedActionIs","param":"laser","stageGroup":"action"},"actions":[{"moduleId":"laser","intent":"fireLaser"}],"action":{"moduleId":"laser","intent":"fireLaser"},"body":[{"type":"action","action":{"moduleId":"laser","intent":"fireLaser"}}],"children":[]},{"id":"rule-mvutdcii7fj","name":"Action Branch","enabled":true,"priority":50,"threadId":"subthread-mvutc9vqisq","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"holdingItemWithPrimaryAbility"},{"type":"group","op":"or","conditions":[{"type":"stagedActionIs","param":"none","stageGroup":"action"},{"type":"stagedActionIs","param":"itemAbility","stageGroup":"action"}]}],"condition":{"type":"holdingItemWithPrimaryAbility"},"actions":[{"moduleId":"heldItem","intent":"primaryItemAbility"},{"moduleId":"staging","intent":"setStage","args":{"stage":"itemAbility","group":"action"}}],"action":{"moduleId":"heldItem","intent":"primaryItemAbility"},"body":[{"type":"action","action":{"moduleId":"heldItem","intent":"primaryItemAbility"}},{"type":"action","action":{"moduleId":"staging","intent":"setStage","args":{"stage":"itemAbility","group":"action"}}}],"children":[]},{"id":"rule-mvutegn9ot6","name":"Action Branch","enabled":true,"priority":50,"threadId":"subthread-mvutc9vqisq","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"emptyHanded"},{"type":"group","op":"or","conditions":[{"type":"stagedActionIs","param":"none","stageGroup":"action"},{"type":"stagedActionIs","param":"grab","stageGroup":"action"}]}],"condition":{"type":"emptyHanded"},"actions":[{"moduleId":"pickup","intent":"pickupReach"},{"moduleId":"staging","intent":"setStage","args":{"stage":"grab","group":"action"}}],"action":{"moduleId":"pickup","intent":"pickupReach"},"body":[{"type":"action","action":{"moduleId":"pickup","intent":"pickupReach"}},{"type":"action","action":{"moduleId":"staging","intent":"setStage","args":{"stage":"grab","group":"action"}}}],"children":[]}]}],"children":[{"id":"rule-mvutd4mgd4n","name":"Action Branch","enabled":true,"priority":50,"threadId":"subthread-mvutc9vqisq","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"stagedActionIs","param":"laser"}],"condition":{"type":"stagedActionIs","param":"laser"},"actions":[{"moduleId":"laser","intent":"fireLaser"}],"action":{"moduleId":"laser","intent":"fireLaser"},"body":[{"type":"action","action":{"moduleId":"laser","intent":"fireLaser"}}],"children":[]},{"id":"rule-mvutdcii7fj","name":"Action Branch","enabled":true,"priority":50,"threadId":"subthread-mvutc9vqisq","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"holdingItemWithPrimaryAbility"}],"condition":{"type":"holdingItemWithPrimaryAbility"},"actions":[{"moduleId":"heldItem","intent":"primaryItemAbility"}],"action":{"moduleId":"heldItem","intent":"primaryItemAbility"},"body":[{"type":"action","action":{"moduleId":"heldItem","intent":"primaryItemAbility"}}],"children":[]},{"id":"rule-mvutegn9ot6","name":"Action Branch","enabled":true,"priority":50,"threadId":"subthread-mvutc9vqisq","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"emptyHanded"}],"condition":{"type":"emptyHanded"},"actions":[{"moduleId":"pickup","intent":"pickupReach"}],"action":{"moduleId":"pickup","intent":"pickupReach"},"body":[{"type":"action","action":{"moduleId":"pickup","intent":"pickupReach"}}],"children":[]}]},{"id":"rule-mvuxjb3jumc","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuxjb3j","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagReleased","param":"tag-kbm-ffc1ts"}],"condition":{"type":"tagReleased","param":"tag-kbm-ffc1ts"},"actions":[{"moduleId":"staging","intent":"setStage","args":{"stage":"none","group":"action"}}],"action":{"moduleId":"staging","intent":"setStage","args":{"stage":"none","group":"action"}},"body":[{"type":"action","action":{"moduleId":"staging","intent":"setStage","args":{"stage":"none","group":"action"}}}],"children":[]},{"id":"rule-mvuyuaktqyz","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuyuakt","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagHeld","param":"tag-kbm-scjxrr"}],"condition":{"type":"tagHeld","param":"tag-kbm-scjxrr"},"actions":[{"moduleId":"locomotion","intent":"jump"}],"action":{"moduleId":"locomotion","intent":"jump"},"body":[{"type":"action","action":{"moduleId":"locomotion","intent":"jump"}}],"children":[]},{"id":"rule-mvuyukiqe8r","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuyukiq","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagPressed","param":"tag-kbm-i3csb0"}],"condition":{"type":"tagPressed","param":"tag-kbm-i3csb0"},"actions":[{"moduleId":"melee","intent":"punch"}],"action":{"moduleId":"melee","intent":"punch"},"body":[{"type":"action","action":{"moduleId":"melee","intent":"punch"}}],"children":[]},{"id":"rule-mvuyutgqxj8","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuyutgq","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagHeld","param":"tag-kbm-mxj04b"}],"condition":{"type":"tagHeld","param":"tag-kbm-mxj04b"},"actions":[{"moduleId":"staging","intent":"setStage","args":{"stage":"laser","group":"action"}},{"moduleId":"laser","intent":"aimLaser"}],"action":{"moduleId":"staging","intent":"setStage","args":{"stage":"laser","group":"action"}},"body":[{"type":"action","action":{"moduleId":"staging","intent":"setStage","args":{"stage":"laser","group":"action"}}},{"type":"action","action":{"moduleId":"laser","intent":"aimLaser"}}],"children":[]},{"id":"rule-mvuz1v84zsz","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuyutgq","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagReleased","param":"tag-kbm-mxj04b"},{"type":"stagedActionIs","param":"laser","stageGroup":"action"}],"condition":{"type":"tagReleased","param":"tag-kbm-mxj04b"},"actions":[{"moduleId":"staging","intent":"setStage","args":{"stage":"none","group":"action"}}],"action":{"moduleId":"staging","intent":"setStage","args":{"stage":"none","group":"action"}},"body":[{"type":"action","action":{"moduleId":"staging","intent":"setStage","args":{"stage":"none","group":"action"}}}],"children":[]},{"id":"rule-mvuyy7gta43","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuyy7gt","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagHeld","param":"tag-kbm-5ftccu"}],"condition":{"type":"tagHeld","param":"tag-kbm-5ftccu"},"actions":[{"moduleId":"throw","intent":"aimThrow"},{"moduleId":"staging","intent":"setStage","args":{"stage":"throw","group":"action"}}],"action":{"moduleId":"throw","intent":"aimThrow"},"body":[{"type":"action","action":{"moduleId":"throw","intent":"aimThrow"}},{"type":"action","action":{"moduleId":"staging","intent":"setStage","args":{"stage":"throw","group":"action"}}}],"children":[]},{"id":"rule-mvuyzn14ezj","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuyy7gt","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagReleased","param":"tag-kbm-5ftccu"},{"type":"stagedActionIs","param":"throw","stageGroup":"action"}],"condition":{"type":"tagReleased","param":"tag-kbm-5ftccu"},"actions":[{"moduleId":"staging","intent":"setStage","args":{"stage":"none","group":"action"}}],"action":{"moduleId":"staging","intent":"setStage","args":{"stage":"none","group":"action"}},"body":[{"type":"action","action":{"moduleId":"staging","intent":"setStage","args":{"stage":"none","group":"action"}}}],"children":[]},{"id":"rule-mvuz2yjunae","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuz2yju","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagHeld","param":"tag-kbm-6o3l7h"}],"condition":{"type":"tagHeld","param":"tag-kbm-6o3l7h"},"actions":[{"moduleId":"locomotion","intent":"holdSprint"}],"action":{"moduleId":"locomotion","intent":"holdSprint"},"body":[{"type":"action","action":{"moduleId":"locomotion","intent":"holdSprint"}}],"children":[]},{"id":"rule-mvuz5lavrjc","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuz5lav","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagHeld","param":"tag-kbm-tn6irx"},{"type":"emptyHanded"}],"condition":{"type":"tagHeld","param":"tag-kbm-tn6irx"},"actions":[{"moduleId":"pickup","intent":"pickupReach"}],"action":{"moduleId":"pickup","intent":"pickupReach"},"body":[{"type":"action","action":{"moduleId":"pickup","intent":"pickupReach"}}],"children":[]},{"id":"rule-mvuz7b3sp8t","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuz7b3s","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagHeld","param":"tag-kbm-tn6irx"},{"type":"holdingObject"},{"type":"targetInReach"},{"type":"stagedActionIs","stageGroup":"interact","param":"none"}],"condition":{"type":"tagHeld","param":"tag-kbm-tn6irx"},"actions":[{"moduleId":"pickup","intent":"swap"},{"moduleId":"staging","intent":"setStage","args":{"group":"interact","stage":"dirty"}}],"action":{"moduleId":"pickup","intent":"swap"},"body":[{"type":"action","action":{"moduleId":"pickup","intent":"swap"}},{"type":"action","action":{"moduleId":"staging","intent":"setStage","args":{"group":"interact","stage":"dirty"}}}],"children":[]},{"id":"rule-mvuz63kzy0m","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvuz63kz","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagPressed","param":"tag-kbm-5j0zp9"}],"condition":{"type":"tagPressed","param":"tag-kbm-5j0zp9"},"actions":[{"moduleId":"pickup","intent":"dropItem"}],"action":{"moduleId":"pickup","intent":"dropItem"},"body":[{"type":"action","action":{"moduleId":"pickup","intent":"dropItem"}}],"children":[]},{"id":"rule-mvv00aqr8yr","name":"Action Branch","enabled":true,"priority":50,"threadId":"thread-mvv00aqr","trigger":{"device":"keyboard","code":"Always","mode":"hold"},"conditions":[{"type":"tagReleased","param":"tag-kbm-tn6irx"}],"condition":{"type":"tagReleased","param":"tag-kbm-tn6irx"},"actions":[{"moduleId":"staging","intent":"setStage","args":{"group":"interact","stage":"none"}}],"action":{"moduleId":"staging","intent":"setStage","args":{"group":"interact","stage":"none"}},"body":[{"type":"action","action":{"moduleId":"staging","intent":"setStage","args":{"group":"interact","stage":"none"}}}],"children":[]}],"tags":[{"id":"tag-kbm-ffc1ts","name":"Action","trigger":{"device":"mouse","code":"MouseRight","mode":"hold"}},{"id":"tag-kbm-5j0zp9","name":"Drop Item","trigger":{"device":"keyboard","code":"KeyQ","mode":"press"}},{"id":"tag-kbm-5ftccu","name":" Throw Mode","trigger":{"device":"keyboard","code":"KeyA","mode":"hold"}},{"id":"tag-kbm-tn6irx","name":"Interact","trigger":{"device":"keyboard","code":"KeyF","mode":"press"}},{"id":"tag-kbm-scjxrr","name":"Jump","trigger":{"device":"keyboard","code":"Space","mode":"press"}},{"id":"tag-kbm-6o3l7h","name":"Sprint","trigger":{"device":"keyboard","code":"ShiftLeft","mode":"press"}},{"id":"tag-kbm-i3csb0","name":"Melee","trigger":{"device":"keyboard","code":"KeyD","mode":"press"}},{"id":"tag-kbm-mxj04b","name":"Laser","trigger":{"device":"keyboard","code":"KeyS","mode":"press"}}],"channels":{"locomotion":{"mode":"forwardFacingDrive","upKeys":["KeyW","ArrowUp"],"downKeys":["KeyS","ArrowDown"],"leftKeys":["KeyA","ArrowLeft"],"rightKeys":["KeyD","ArrowRight"],"sprintKey":"ShiftLeft","sprintMode":"hold","jumpKey":"Space"},"aiming":{"mode":"faceMouseCursor","rawMouseDragEnabled":true},"interaction":{"enabled":true,"trigger":{"device":"mouse","code":"MouseLeft","mode":"press"},"claimPolicy":"requireCleanPress","allowSwapWhenHolding":true},"throw":{"enabled":true,"aimTrigger":{"device":"mouse","code":"MouseRight","mode":"hold"},"fireTrigger":{"device":"mouse","code":"MouseLeft","mode":"press"},"fireOnReleaseAim":false,"arcModulationSource":"mouseDragY","arcDragHoldThresholdMs":200,"claimPolicy":"requireCleanPress"},"consume":{"enabled":true,"trigger":{"device":"keyboard","code":"KeyE","mode":"hold"},"claimPolicy":"requireCleanPress"},"melee":{"enabled":true,"trigger":{"device":"keyboard","code":"KeyF","mode":"press"},"claimPolicy":"requireCleanPress"},"laser":{"enabled":true,"aimTrigger":{"device":"mouse","code":"MouseRight","chordModifiers":["AltLeft"],"mode":"hold"},"fireTrigger":{"device":"mouse","code":"MouseLeft","mode":"hold"},"powerModulationSource":"mouseWheel"}},"pipeline":[{"id":"pipe-facing","name":"Aim / Facing Heading","enabled":true,"source":{"type":"2d_vector","source":"mouseWorldPos"},"processor":{"type":"facing","mode":"fromMousePos"},"target":"character.facing"},{"id":"pipe-loco-move","name":"WASD Movement Vector","enabled":true,"source":{"type":"button","device":"mouse","code":"MouseLeft"},"processor":{"type":"button","triggerMode":"hold","requireCleanPress":true,"claimOnFire":true},"target":"locomotion.forwardThrust"},{"id":"pipe-loco-sprint","name":"Sprint","enabled":true,"source":{"type":"button","device":"keyboard","code":"ShiftLeft"},"processor":{"type":"button","triggerMode":"hold"},"target":"locomotion.sprint"},{"id":"pipe-loco-jump","name":"Jump / Hop","enabled":true,"source":{"type":"button","device":"keyboard","code":"Space"},"processor":{"type":"button","triggerMode":"down","requireCleanPress":true,"claimOnFire":true},"target":"locomotion.jump"},{"id":"pipe-pickup-grab","name":"Grab Ground Item","enabled":true,"condition":"emptyHanded","source":{"type":"button","device":"mouse","code":"MouseRight"},"processor":{"type":"button","triggerMode":"down","requireCleanPress":true,"claimOnFire":true},"target":"pickup.grab"},{"id":"pipe-pickup-drop","name":"Drop Held Item","enabled":true,"condition":"holdingItem","source":{"type":"button","device":"keyboard","code":"KeyQ"},"processor":{"type":"button","triggerMode":"down","requireCleanPress":true,"claimOnFire":true},"target":"pickup.drop"},{"id":"pipe-consume-bite","name":"Bite / Eat Held Item","enabled":true,"condition":"holdingConsumable","source":{"type":"button","device":"keyboard","code":"KeyE"},"processor":{"type":"button","triggerMode":"hold","requireCleanPress":true,"claimOnFire":true},"target":"consume.bite"},{"id":"pipe-melee-punch","name":"Melee Punch","enabled":true,"source":{"type":"button","device":"keyboard","code":"KeyS"},"processor":{"type":"button","triggerMode":"down","requireCleanPress":true,"claimOnFire":true},"target":"melee.punch"},{"id":"pipe-laser-aim","name":"Laser Aim Chord","enabled":true,"source":{"type":"button","device":"keyboard","code":"KeyD","additionalCodes":[]},"processor":{"type":"button","triggerMode":"hold","claimOnFire":true},"target":"laser.aim"},{"id":"pipe-laser-fire","name":"Laser Fire","enabled":true,"source":{"type":"button","device":"mouse","code":"MouseRight","additionalCodes":["KeyD"]},"processor":{"type":"button","triggerMode":"hold","claimOnFire":true},"target":"laser.fire"},{"id":"pipe-laser-power","name":"Laser Power Modulation","enabled":true,"source":{"type":"1d_scalar","source":"mouseWheel"},"processor":{"type":"1d_scalar","mode":"accumulator","sensitivity":0.005,"clampMin":0,"clampMax":1,"initialValue":0.5,"autoCursorLock":false,"gateButton":{"device":"keyboard","code":"KeyD","mode":"hold"}},"target":"laser.power"},{"id":"pipe-mvxlcfjepx7","name":"New Binding","enabled":true,"source":{"type":"button","device":"keyboard","code":"KeyF"},"processor":{"type":"button","triggerMode":"hold","requireCleanPress":true,"claimOnFire":true},"target":"pickup.swap"},{"id":"pipe-mvxm2asjf1q","name":"New Binding","enabled":true,"source":{"type":"button","device":"mouse","code":"MouseRight"},"processor":{"type":"button","triggerMode":"hold","requireCleanPress":true,"claimOnFire":true},"target":"throw.chargeBow"}],"blocks":[{"type":"locomotion","id":"block-locomotion","name":"Locomotion","enabled":true,"moveKeys":{"upKey":"KeyW","downKey":"KeyS","leftKey":"KeyA","rightKey":"MouseLeft"},"jump":{"code":"Space"},"sprint":{"code":"ShiftLeft","mode":"hold"},"mode":"walkToMouse","forwardTrigger":{"code":"MouseLeft"},"reverseKey":null,"strafeLeftKey":null,"strafeRightKey":null,"cursorSteerTrigger":{"code":"GamepadLB"},"cursorSteerMode":"whenHoldingButton"},{"type":"itemInteraction","id":"block-items","name":"Item Interaction","enabled":true,"pickup":{"code":null},"drop":{"code":"KeyQ"},"swap":{"code":"KeyF"},"consume":{"code":"KeyE","requireCleanPress":true},"swapRequiresHolding":false,"triggerPickupWhenEmptyHanded":true,"additionalPickup":{"code":"MouseRight","gateButtons":[]}},{"type":"throw","id":"block-throw","name":"Throwing & Ballistics","enabled":true,"mode":"aimWallClear","chargeTrigger":{"code":"MouseRight","requireCleanPress":false},"aimTrigger":{"code":"MouseRight","requireCleanPress":false},"fireTrigger":{"code":"MouseLeft","requireCleanPress":true},"quickTrigger":{"code":"MouseRight"},"arcModulation":{"source":"mouseDeltaY","autoCursorLock":true,"sensitivity":0.005},"enableProximityCancel":true,"cancelRadius":1.5,"triggerMargin":0.15},{"type":"melee","id":"block-melee","name":"Melee Combat","enabled":true,"punch":{"code":"KeyS"}},{"type":"laser","id":"block-laser","name":"Laser Beam","enabled":true,"aimTrigger":{"code":"KeyD","gateButtons":[]},"aimMode":"mouseWorldPos","fireTrigger":{"code":"MouseRight","autoFireWhenAiming":false},"powerLevel":{"source":"mouseWheel","sensitivity":1}},{"type":"facing","id":"block-facing","name":"Aim / Heading Facing","enabled":true,"mode":"mouseWorldPos"}]},"gamepad":{"leftStick":{"primaryMode":"directLocomotion","dynamicOverride":{"triggerCondition":"whenLtHeld","overrideMode":"cursorSteer"},"cursorSteerSpeed":14,"cursorClampRadius":7.5},"rightStick":{"mode":"twinStickAim"},"rules":[{"id":"pad-laser-aim-lt","name":"Aim Laser (LT)","enabled":true,"priority":105,"trigger":{"device":"gamepad","code":"GamepadLT","mode":"hold"},"condition":{"type":"always"},"action":{"moduleId":"laser","intent":"aimLaser"},"tagId":"tag-pad-qq9kph"},{"id":"pad-laser-fire","name":"Fire Laser (RT)","enabled":true,"priority":100,"trigger":{"device":"gamepad","code":"GamepadRT","mode":"hold"},"condition":{"type":"always"},"action":{"moduleId":"laser","intent":"fireLaser"},"tagId":"tag-pad-yg4ita"},{"id":"pad-throw-aim-lt","name":"Aim Throw Trajectory (LT)","enabled":true,"priority":95,"trigger":{"device":"gamepad","code":"GamepadLT","mode":"hold"},"condition":{"type":"holdingObject"},"action":{"moduleId":"throwPickup","intent":"aimThrow"},"tagId":"tag-pad-qq9kph"},{"id":"pad-throw-release","name":"Throw Held Item (RT)","enabled":true,"priority":90,"trigger":{"device":"gamepad","code":"GamepadRT","mode":"release"},"condition":{"type":"holdingObject"},"action":{"moduleId":"throwPickup","intent":"releaseThrow"},"tagId":"tag-pad-yg4ita"},{"id":"pad-pickup-rt","name":"Pick Up Object (RT)","enabled":true,"priority":80,"trigger":{"device":"gamepad","code":"GamepadRT","mode":"press"},"condition":{"type":"targetInReach"},"action":{"moduleId":"throwPickup","intent":"pickupReach"},"tagId":"tag-pad-yg4ita"},{"id":"pad-melee-b","name":"Melee Punch (B)","enabled":true,"priority":75,"trigger":{"device":"gamepad","code":"GamepadB","mode":"press"},"condition":{"type":"emptyHanded"},"action":{"moduleId":"melee","intent":"punch"},"tagId":"tag-pad-wbxscb"},{"id":"pad-jump","name":"Jump (A)","enabled":true,"priority":70,"trigger":{"device":"gamepad","code":"GamepadA","mode":"press"},"condition":{"type":"always"},"action":{"moduleId":"locomotion","intent":"jump"},"tagId":"tag-pad-i8r8qh"},{"id":"pad-sprint-toggle","name":"Toggle Sprint (LS)","enabled":true,"priority":60,"trigger":{"device":"gamepad","code":"GamepadLS","mode":"press"},"condition":{"type":"always"},"action":{"moduleId":"locomotion","intent":"toggleSprint"},"tagId":"tag-pad-r7p78d"},{"id":"pad-drop","name":"Drop Item (X)","enabled":true,"priority":50,"trigger":{"device":"gamepad","code":"GamepadX","mode":"press"},"condition":{"type":"holdingObject"},"action":{"moduleId":"throwPickup","intent":"dropItem"},"tagId":"tag-pad-1wlz43"}],"tags":[{"id":"tag-pad-qq9kph","name":"Aim Laser","trigger":{"device":"gamepad","code":"GamepadLT","mode":"hold"}},{"id":"tag-pad-yg4ita","name":"Fire Laser","trigger":{"device":"gamepad","code":"GamepadRT","mode":"hold"}},{"id":"tag-pad-wbxscb","name":"Melee Punch","trigger":{"device":"gamepad","code":"GamepadB","mode":"press"}},{"id":"tag-pad-i8r8qh","name":"Jump","trigger":{"device":"gamepad","code":"GamepadA","mode":"press"}},{"id":"tag-pad-r7p78d","name":"Toggle Sprint","trigger":{"device":"gamepad","code":"GamepadLS","mode":"press"}},{"id":"tag-pad-1wlz43","name":"Drop Item","trigger":{"device":"gamepad","code":"GamepadX","mode":"press"}}],"blocks":[{"type":"locomotion","id":"block-locomotion-gp","name":"Locomotion","enabled":true,"mode":"analogStick","moveKeys":{"upKey":"GamepadDpadUp","downKey":"GamepadDpadDown","leftKey":"GamepadDpadLeft","rightKey":"GamepadDpadRight","requireCleanPress":false},"jump":{"code":"GamepadA","requireCleanPress":true},"sprint":{"code":"GamepadLS","mode":"toggle","requireCleanPress":true},"forwardTrigger":{"code":"GamepadLT"},"cursorSteerTrigger":{"code":"GamepadLT"},"cursorSteerMode":"whenHoldingButton","reverseKey":"KeyS","strafeLeftKey":"KeyA","strafeRightKey":"KeyD","rawDirectionWhileWalking":true,"stickCursorInFront":true,"cursorMaxDistance":4,"lockCursorDistanceToMax":true},{"type":"itemInteraction","id":"block-items-gp","name":"Item Interaction","enabled":true,"pickup":{"code":null,"requireCleanPress":true},"drop":{"code":"GamepadY","requireCleanPress":true},"swap":{"code":"GamepadB","requireCleanPress":true},"consume":{"code":"GamepadRB","requireCleanPress":false},"swapRequiresHolding":false,"triggerPickupWhenEmptyHanded":true,"additionalPickup":{"code":"GamepadRT"}},{"type":"throw","id":"block-throw-gp","name":"Throwing & Ballistics","enabled":true,"mode":"triggerPullForce","chargeTrigger":{"code":"GamepadRT","requireCleanPress":true},"aimTrigger":{"code":"GamepadLT","requireCleanPress":false},"fireTrigger":{"code":"GamepadRT","requireCleanPress":true},"quickTrigger":{"code":"GamepadRT","requireCleanPress":true},"triggerMargin":0.15,"arcModulation":{"source":"none","autoCursorLock":false,"sensitivity":0.005},"enableProximityCancel":true,"cancelRadius":1.5},{"type":"melee","id":"block-melee-gp","name":"Melee Combat","enabled":true,"punch":{"code":"GamepadX","requireCleanPress":true}},{"type":"laser","id":"block-laser-gp","name":"Laser Beam","enabled":true,"aimTrigger":{"code":null,"requireCleanPress":false},"aimMode":"mouseWorldPos","fireTrigger":{"code":"GamepadRT","autoFireWhenAiming":false,"requireCleanPress":false},"powerLevel":{"source":"none","sensitivity":1}},{"type":"facing","id":"block-facing-gp","name":"Aim / Heading Facing","enabled":true,"mode":"mouseWorldPos"}]},"touch":{"widgets":[{"id":"touch-move-stick","type":"joystick","label":"Move","anchor":"bottomLeft","offset":{"x":90,"y":90},"radius":65,"centering":"floating","snapBackOnRelease":true,"rings":[{"id":"deadzone","minDeflection":0,"maxDeflection":0.15,"signalId":"idle"},{"id":"walk","minDeflection":0.15,"maxDeflection":0.65,"signalId":"walk"},{"id":"sprint","minDeflection":0.65,"maxDeflection":1,"signalId":"sprint"}]},{"id":"touch-aim-stick","type":"joystick","label":"Aim","anchor":"bottomRight","offset":{"x":-90,"y":90},"radius":65,"centering":"floating","snapBackOnRelease":true,"rings":[]},{"id":"touch-jump-btn","type":"actionButton","label":"JUMP","anchor":"bottomRight","offset":{"x":-80,"y":190},"radius":35,"centering":"fixed","snapBackOnRelease":true,"rings":[],"tapAction":"jump"}],"rules":[],"tags":[]},"stages":["none","laser","throw","itemAbility","grab"],"stageGroups":[{"name":"action","stages":["none","laser","throw","itemAbility","grab"]},{"name":"interact","stages":["none","dirty"]}],"pipeline":[{"id":"pipe-facing","name":"Aim / Facing Heading","enabled":true,"source":{"type":"2d_vector","source":"mouseWorldPos"},"processor":{"type":"facing","mode":"fromMousePos"},"target":"character.facing"},{"id":"pipe-loco-move","name":"WASD Movement Vector","enabled":true,"source":{"type":"button","device":"mouse","code":"MouseLeft"},"processor":{"type":"button","triggerMode":"hold","requireCleanPress":true,"claimOnFire":true},"target":"locomotion.forwardThrust"},{"id":"pipe-loco-sprint","name":"Sprint","enabled":true,"source":{"type":"button","device":"keyboard","code":"ShiftLeft"},"processor":{"type":"button","triggerMode":"hold"},"target":"locomotion.sprint"},{"id":"pipe-loco-jump","name":"Jump / Hop","enabled":true,"source":{"type":"button","device":"keyboard","code":"Space"},"processor":{"type":"button","triggerMode":"down","requireCleanPress":true,"claimOnFire":true},"target":"locomotion.jump"},{"id":"pipe-pickup-grab","name":"Grab Ground Item","enabled":true,"condition":"emptyHanded","source":{"type":"button","device":"mouse","code":"MouseRight"},"processor":{"type":"button","triggerMode":"down","requireCleanPress":true,"claimOnFire":true},"target":"pickup.grab"},{"id":"pipe-pickup-drop","name":"Drop Held Item","enabled":true,"condition":"holdingItem","source":{"type":"button","device":"keyboard","code":"KeyQ"},"processor":{"type":"button","triggerMode":"down","requireCleanPress":true,"claimOnFire":true},"target":"pickup.drop"},{"id":"pipe-consume-bite","name":"Bite / Eat Held Item","enabled":true,"condition":"holdingConsumable","source":{"type":"button","device":"keyboard","code":"KeyE"},"processor":{"type":"button","triggerMode":"hold","requireCleanPress":true,"claimOnFire":true},"target":"consume.bite"},{"id":"pipe-melee-punch","name":"Melee Punch","enabled":true,"source":{"type":"button","device":"keyboard","code":"KeyS"},"processor":{"type":"button","triggerMode":"down","requireCleanPress":true,"claimOnFire":true},"target":"melee.punch"},{"id":"pipe-laser-aim","name":"Laser Aim Chord","enabled":true,"source":{"type":"button","device":"keyboard","code":"KeyD","additionalCodes":[]},"processor":{"type":"button","triggerMode":"hold","claimOnFire":true},"target":"laser.aim"},{"id":"pipe-laser-fire","name":"Laser Fire","enabled":true,"source":{"type":"button","device":"mouse","code":"MouseRight","additionalCodes":["KeyD"]},"processor":{"type":"button","triggerMode":"hold","claimOnFire":true},"target":"laser.fire"},{"id":"pipe-laser-power","name":"Laser Power Modulation","enabled":true,"source":{"type":"1d_scalar","source":"mouseWheel"},"processor":{"type":"1d_scalar","mode":"accumulator","sensitivity":0.005,"clampMin":0,"clampMax":1,"initialValue":0.5,"autoCursorLock":false,"gateButton":{"device":"keyboard","code":"KeyD","mode":"hold"}},"target":"laser.power"},{"id":"pipe-mvxlcfjepx7","name":"New Binding","enabled":true,"source":{"type":"button","device":"keyboard","code":"KeyF"},"processor":{"type":"button","triggerMode":"hold","requireCleanPress":true,"claimOnFire":true},"target":"pickup.swap"},{"id":"pipe-mvxm2asjf1q","name":"New Binding","enabled":true,"source":{"type":"button","device":"mouse","code":"MouseRight"},"processor":{"type":"button","triggerMode":"hold","requireCleanPress":true,"claimOnFire":true},"target":"throw.chargeBow"}]}}]');
const spawners = [{ "id": "spawner_apple_default", "name": "Apple Spawner", "enabled": true, "prefabId": "prefab_apple", "intervalMinutes": 0.1, "maxCount": 10, "designatedSpawnPoints": [{ "x": 10, "y": 2.2, "z": 0 }, { "x": 10, "y": 11.8, "z": 0 }, { "x": 3.5, "y": 7, "z": 0 }, { "x": 16.5, "y": 7, "z": 0 }, { "x": 10, "y": 7, "z": 0 }] }];
const initialWorldConfig = {
  version,
  lastSaved,
  arena,
  globalPhysics,
  player,
  objects,
  prefabs,
  spawners
};
if (typeof process !== "undefined" && process.env) {
  process.env.WS_NO_BUFFER_UTIL = "1";
  process.env.WS_NO_UTF_8_VALIDATE = "1";
}
const _UniversalRoomManager = class _UniversalRoomManager {
  constructor() {
    __publicField(this, "simulation");
    __publicField(this, "clients", /* @__PURE__ */ new Map());
    __publicField(this, "isRunning", false);
    __publicField(this, "currentWorldConfig", null);
    __publicField(this, "needsMapReload", false);
    __publicField(this, "loopInterval", null);
    __publicField(this, "heartbeatInterval", null);
    __publicField(this, "lastTimeHr", process.hrtime.bigint());
    __publicField(this, "accumulator", 0);
    __publicField(this, "fixedDt", 1 / 60);
    this.simulation = new ServerGameSimulation({
      broadcastRateHz: 60,
      deltaCompression: false
    });
    this.simulation.onGrabResult = (result) => {
      this.broadcastMessage(result);
    };
    this.loadInitialWorldConfig();
  }
  loadInitialWorldConfig() {
    if (initialWorldConfig) {
      this.currentWorldConfig = initialWorldConfig;
    }
    try {
      const candidates = [
        path.resolve(process.cwd(), "src/config/worldConfig.json"),
        path.resolve(process.cwd(), "dist/config/worldConfig.json"),
        path.resolve(process.cwd(), "config/worldConfig.json")
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, "utf8");
          const config = JSON.parse(raw);
          console.log(`🌐 [UniversalRoom] Loaded persistent world config (v${config.version}) from ${p}`);
          this.currentWorldConfig = config;
          this.simulation.initializeFromConfig(config);
          return;
        }
      }
    } catch (err) {
      console.warn("⚠️ [UniversalRoom] Could not load worldConfig.json from disk, using bundled baseline:", err);
    }
    if (this.currentWorldConfig) {
      console.log(`🌐 [UniversalRoom] Initializing from bundled world config (v${this.currentWorldConfig.version})`);
      this.simulation.initializeFromConfig(this.currentWorldConfig);
    } else {
      this.simulation.initializeDefaultScenario();
    }
  }
  /**
   * Hot-reloads the authoritative simulation with newly saved world settings without dropping connections.
   */
  reloadWorldConfig(config) {
    console.log(`🌐 [UniversalRoom] Hot-reloading world configuration (v${config.version})...`);
    this.currentWorldConfig = config;
    this.simulation.initializeFromConfig(config);
  }
  static getInstance() {
    if (!_UniversalRoomManager.instance) {
      _UniversalRoomManager.instance = new _UniversalRoomManager();
      _UniversalRoomManager.instance.start();
    }
    return _UniversalRoomManager.instance;
  }
  /**
   * Attaches the WebSocket server to an existing Node.js HTTP server at path '/ws'.
   */
  static attach(httpServer) {
    const manager = _UniversalRoomManager.getInstance();
    const wss = new WebSocketServer({ noServer: true });
    httpServer.on("upgrade", (req, socket, head) => {
      try {
        const rawUrl = (req.url || "/").split("?")[0].replace(/\/+$/, "");
        const isWsPath = rawUrl === "/ws" || rawUrl.endsWith("/ws");
        if (isWsPath) {
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req);
          });
        }
      } catch (err) {
        console.warn("[UniversalRoom] Upgrade error:", err);
      }
    });
    wss.on("connection", (ws, req) => {
      manager.handleConnection(ws, req);
    });
    console.log("🌐 [UniversalRoom] Attached WebSocket server at /ws");
    return manager;
  }
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimeHr = process.hrtime.bigint();
    this.accumulator = 0;
    this.loopInterval = setInterval(() => {
      this.tick();
    }, 4);
    this.heartbeatInterval = setInterval(() => {
      this.checkClientLiveness();
    }, 1e3);
    console.log(`🌐 [UniversalRoom] Authoritative 60Hz physics world active. Ticks: #${this.simulation.currentTick}`);
  }
  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  /**
   * Drops dead / silent clients whose connection was abruptly terminated
   * without a clean WebSocket close frame (e.g. WiFi cut, laptop sleep, crashed tab).
   */
  checkClientLiveness() {
    const now = Date.now();
    const TIMEOUT_MS = 3500;
    for (const [clientId, client] of Array.from(this.clients.entries())) {
      if (now - client.lastSeen > TIMEOUT_MS) {
        console.warn(
          `⚠️ [UniversalRoom] Connection lost for client ${clientId} (silent for ${now - client.lastSeen}ms). Evicting character immediately.`
        );
        try {
          client.ws.terminate();
        } catch (_) {
        }
        this.handleDisconnection(clientId);
      }
    }
  }
  tick() {
    if (!this.isRunning) return;
    if (this.clients.size === 0) {
      this.lastTimeHr = process.hrtime.bigint();
      this.accumulator = 0;
      return;
    }
    const nowHr = process.hrtime.bigint();
    const elapsedSec = Number(nowHr - this.lastTimeHr) / 1e9;
    this.lastTimeHr = nowHr;
    this.accumulator += Math.min(0.2, elapsedSec);
    while (this.accumulator >= this.fixedDt) {
      this.simulation.step(this.fixedDt);
      this.accumulator -= this.fixedDt;
      this.broadcastSnapshot();
    }
  }
  broadcastSnapshot() {
    if (this.clients.size === 0) return;
    const worldSnapshot = this.simulation.getAuthoritativeWorldSnapshot();
    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          const snapshot = this.simulation.getGhostSnapshot(client.lastPingMs || 0, clientId);
          const clockSync = this.simulation.getLatestClockSync(clientId);
          if (clockSync) {
            snapshot.clockSync = clockSync;
          }
          const payload = JSON.stringify({
            type: "pc_server_snapshot",
            snapshot,
            worldSnapshot,
            playerCount: this.simulation.characters.size
          });
          client.ws.send(payload);
        } catch (err) {
          console.warn(`[UniversalRoom] Failed to send snapshot to ${clientId}:`, err);
        }
      }
    }
  }
  broadcastMessage(msg) {
    const payload = typeof msg === "string" ? msg : JSON.stringify(msg);
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(payload);
        } catch (_) {
        }
      }
    }
  }
  handleAuthoritativeGrab(serverCharId, targetObjectId) {
    var _a;
    let sChar = this.simulation.characters.get(serverCharId);
    if (!sChar) {
      sChar = this.simulation.allCharacters.find(
        (c) => c.playerId === serverCharId || c.playerId.endsWith(`:${serverCharId}`) || c.id === serverCharId
      );
    }
    if (!sChar || sChar.healthModule && sChar.healthModule.getCurrentHp(sChar.properties) <= 1e-3) return;
    if (sChar.heldObject) return;
    const target = this.simulation.objects.find((o) => o.id === targetObjectId);
    if (!target) return;
    const maxReach = sChar.pickupModule ? sChar.pickupModule.pickupReach * 1.5 : 2.5;
    const charZ = Math.max(sChar.position.z, sChar.supportingSurfaceHeight ?? 0);
    const targetZ = Math.max(target.position.z, target.supportingSurfaceHeight ?? 0);
    const dist3D = Math.hypot(
      target.position.x - sChar.position.x,
      target.position.y - sChar.position.y,
      targetZ - charZ
    );
    if (dist3D > maxReach) return;
    if (target.isHeld && target.heldBy && target.heldBy !== sChar) {
      return;
    }
    let itemToHold = target;
    if (target.spawnerModule && target.spawnerModule.enabled) {
      const clone = target.spawnerModule.triggerClone(target, this.simulation.arena, this.simulation.objects);
      if (clone) itemToHold = clone;
    }
    (_a = sChar.pickupModule) == null ? void 0 : _a.pickup(sChar, itemToHold);
    itemToHold.isHeld = true;
    itemToHold.heldBy = sChar;
    sChar.heldObject = itemToHold;
    const resultMsg = {
      type: "grab_result",
      eventId: `grab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tick: this.simulation.currentTick,
      targetObjectId: itemToHold.id,
      playerId: sChar.playerId || serverCharId
    };
    this.broadcastMessage(resultMsg);
  }
  allocatePlayerNumber() {
    var _a;
    const used = /* @__PURE__ */ new Set();
    for (const char of this.simulation.characters.values()) {
      if (((_a = char.characterModule) == null ? void 0 : _a.role) === "dummy" || char.controllerType === "none" || char.id === "dummy-1") {
        continue;
      }
      if (char.playerNumber && char.playerNumber > 0) {
        used.add(char.playerNumber);
      }
    }
    for (const client of this.clients.values()) {
      for (const entry of client.characters.values()) {
        if (entry.playerNumber && entry.playerNumber > 0) {
          used.add(entry.playerNumber);
        }
      }
    }
    for (let i = 1; i <= 16; i++) {
      if (!used.has(i)) return i;
    }
    return this.simulation.characters.size + 1;
  }
  resolveActionPlayerId(client, act, fallbackServerCharId) {
    if (!act.playerId) return fallbackServerCharId;
    for (const charEntry of client.characters.values()) {
      if (act.playerId === charEntry.serverCharId) {
        return charEntry.serverCharId;
      }
    }
    if (client.characters.has(act.playerId)) {
      return client.characters.get(act.playerId).serverCharId;
    }
    if (act.playerId.startsWith(`${client.id}:`)) {
      return act.playerId;
    }
    return fallbackServerCharId;
  }
  /**
   * Trashes any memory of the online map the moment no players are connected.
   */
  trashMapMemory() {
    console.log("🌐 [UniversalRoom] All players left. Trashing online map memory...");
    for (const obj of this.simulation.objects) {
      obj.isHeld = false;
      obj.heldBy = null;
    }
    for (const char of this.simulation.characters.values()) {
      char.cleanupBeforeRemoval();
    }
    this.simulation.characters.clear();
    this.simulation.objects = [];
    this.simulation.jitterBuffer.clear();
    this.simulation.arena.entities = [];
    this.accumulator = 0;
    this.needsMapReload = true;
    console.log("🌐 [UniversalRoom] Online map memory trashed cleanly.");
  }
  /**
   * Reloads the pristine default scenario when a player tries to connect to an empty room.
   */
  reloadMap() {
    console.log("🌐 [UniversalRoom] Player connecting. Reloading fresh online map...");
    if (this.currentWorldConfig) {
      this.simulation.initializeFromConfig(this.currentWorldConfig);
    } else {
      this.simulation.initializeDefaultScenario();
    }
    if (this.simulation.characters.has("player-1")) {
      const p1 = this.simulation.characters.get("player-1");
      p1 == null ? void 0 : p1.cleanupBeforeRemoval();
      this.simulation.characters.delete("player-1");
      this.simulation.arena.entities = [...this.simulation.allCharacters, ...this.simulation.objects];
    }
    this.lastTimeHr = process.hrtime.bigint();
    this.accumulator = 0;
    this.needsMapReload = false;
    console.log("🌐 [UniversalRoom] Fresh online map reloaded. Ready for players.");
  }
  registerCharacter(client, localPlayerId, name, _spawnPos) {
    var _a;
    const existing = client.characters.get(localPlayerId);
    if (existing) {
      if (name && name.trim().length > 0 && !/^Player(\s+\d+)?$/i.test(name.trim()) && !/^Controller\s+#\d+$/i.test(name.trim())) {
        existing.name = name.trim();
        const sChar = this.simulation.characters.get(existing.serverCharId);
        if (sChar) {
          sChar.name = existing.name;
          sChar.hasCustomName = true;
        }
      }
      return existing;
    }
    const playerNumber = this.allocatePlayerNumber();
    const color = PLAYER_COLORS[(playerNumber - 1) % PLAYER_COLORS.length];
    const serverCharId = localPlayerId === "keyboard" ? client.id : `${client.id}:${localPlayerId}`;
    const isExplicitCustom = Boolean(
      name && name.trim().length > 0 && !/^Player(\s+\d+)?$/i.test(name.trim()) && !/^Controller\s+#\d+$/i.test(name.trim()) && !/Xbox|XInput|DualShock|DualSense|PlayStation|Wireless Controller|Gamepad|Joystick|STANDARD GAMEPAD|Vendor:|Product:/i.test(name)
    );
    const charName = isExplicitCustom ? name.trim() : `Player ${playerNumber}`;
    const availableSpawns = HealthModule.RESPAWN_SPAWNS.filter((sp) => {
      for (const char of this.simulation.characters.values()) {
        if (Math.hypot(char.position.x - sp.x, char.position.y - sp.y) < 2) {
          return false;
        }
      }
      return true;
    });
    const pool = availableSpawns.length > 0 ? availableSpawns : HealthModule.RESPAWN_SPAWNS;
    const defaultSpawn = pool[Math.floor(Math.random() * pool.length)];
    const spawnX = defaultSpawn.x;
    const spawnY = defaultSpawn.y;
    const spawnZ = defaultSpawn.z ?? 0;
    const character = new Character({
      x: spawnX,
      y: spawnY,
      color,
      colliderRadius: 0.44,
      mass: 1.2,
      strength: 1,
      playerId: serverCharId,
      playerNumber,
      name: charName,
      hasCustomName: isExplicitCustom
    });
    character.position.z = spawnZ;
    if ((_a = this.currentWorldConfig) == null ? void 0 : _a.player) {
      applyCharacterConfig(character, this.currentWorldConfig.player);
      character.playerId = serverCharId;
      character.playerNumber = playerNumber;
      character.color = color;
      character.playerColor = color;
      if (isExplicitCustom) {
        character.name = charName;
        character.hasCustomName = true;
      }
    }
    const otherEntities = [
      ...this.simulation.allCharacters,
      ...this.simulation.objects
    ];
    for (const ent of otherEntities) {
      if (ent.isHeld) continue;
      const minDistance = character.colliderRadius + ent.colliderRadius;
      const ox = ent.position.x - character.position.x;
      const oy = ent.position.y - character.position.y;
      const oDist = Math.hypot(ox, oy);
      if (oDist < minDistance) {
        const charZ = character.position.z;
        const entZ = ent.position.z;
        if (Math.abs(charZ - entZ) < 0.8) {
          const overlap = minDistance - oDist + 0.04;
          let nx;
          let ny;
          if (oDist > 1e-3) {
            nx = ox / oDist;
            ny = oy / oDist;
          } else {
            const randomAngle = Math.random() * Math.PI * 2;
            nx = Math.cos(randomAngle);
            ny = Math.sin(randomAngle);
          }
          character.position.x -= nx * (overlap * 0.5);
          character.position.y -= ny * (overlap * 0.5);
          ent.position.x += nx * (overlap * 0.5);
          ent.position.y += ny * (overlap * 0.5);
          ent.wakeUp();
        }
      }
    }
    this.simulation.characters.set(serverCharId, character);
    this.simulation.arena.entities = [...this.simulation.allCharacters, ...this.simulation.objects];
    const entry = {
      localPlayerId,
      serverCharId,
      playerNumber,
      color,
      name: charName,
      spawnPos: { x: character.position.x, y: character.position.y, z: character.position.z }
    };
    client.characters.set(localPlayerId, entry);
    console.log(
      `🌐 [UniversalRoom] Acknowledged character: ${serverCharId} as P${playerNumber} (${color}, "${charName}") for client ${client.id}`
    );
    return entry;
  }
  unregisterCharacter(client, localPlayerId) {
    const entry = client.characters.get(localPlayerId);
    if (!entry) return;
    client.characters.delete(localPlayerId);
    const sChar = this.simulation.characters.get(entry.serverCharId);
    if (sChar) {
      if (sChar.heldObject) {
        sChar.heldObject.isHeld = false;
        sChar.heldObject.heldBy = null;
        sChar.heldObject.wakeUp();
        sChar.heldObject = null;
      }
      sChar.cleanupBeforeRemoval();
      this.simulation.characters.delete(entry.serverCharId);
      this.simulation.arena.entities = [...this.simulation.allCharacters, ...this.simulation.objects];
    }
    this.simulation.jitterBuffer.clear(entry.serverCharId);
    this.simulation.latestClockSync.delete(entry.serverCharId);
    this.simulation.clientAckedTicks.delete(entry.serverCharId);
    console.log(`🌐 [UniversalRoom] Character removed: ${entry.serverCharId} from client ${client.id}`);
    const leftPayload = JSON.stringify({
      type: "player_left",
      clientId: client.id,
      removedCharIds: [entry.serverCharId],
      playerCount: this.simulation.characters.size
    });
    for (const other of this.clients.values()) {
      if (other.ws.readyState === WebSocket.OPEN) {
        try {
          other.ws.send(leftPayload);
        } catch (_) {
        }
      }
    }
    this.broadcastSnapshot();
  }
  handleConnection(ws, _req) {
    if (this.needsMapReload || this.clients.size === 0) {
      this.reloadMap();
    }
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const client = {
      id: clientId,
      ws,
      characters: /* @__PURE__ */ new Map(),
      lastPingMs: 0,
      lastSeen: Date.now()
    };
    this.clients.set(clientId, client);
    console.log(`🌐 [UniversalRoom] Client connected: ${clientId} (Total clients in room: ${this.clients.size})`);
    ws.on("message", (raw) => {
      var _a, _b, _c, _d;
      try {
        client.lastSeen = Date.now();
        const text = raw.toString();
        const data = JSON.parse(text);
        if (data.type === "leave_room") {
          this.handleDisconnection(clientId);
          try {
            ws.close();
          } catch (_) {
          }
          return;
        }
        if (data.type === "join_room") {
          if (Array.isArray(data.localPlayers) && data.localPlayers.length > 0) {
            const requestedLocalIds = new Set(data.localPlayers.map((lp) => lp.localPlayerId).filter(Boolean));
            for (const localId of Array.from(client.characters.keys())) {
              if (!requestedLocalIds.has(localId)) {
                this.unregisterCharacter(client, localId);
              }
            }
            for (const lp of data.localPlayers) {
              if (lp.localPlayerId) {
                const reg = this.registerCharacter(client, lp.localPlayerId, lp.name, lp.spawnPos);
                if (lp.localPlayerId !== "keyboard") {
                  reg.isDefaultPlaceholder = false;
                }
              }
            }
          } else {
            if (!client.characters.has("keyboard")) {
              this.registerCharacter(client, "keyboard", data.name, data.spawnPos);
            } else if (data.name && typeof data.name === "string" && data.name.trim().length > 0) {
              const entry = client.characters.get("keyboard");
              if (!/^Player(\s+\d+)?$/i.test(data.name.trim()) && !/^Controller\s+#\d+$/i.test(data.name.trim()) && !/Xbox|XInput|DualShock|DualSense|PlayStation|Wireless Controller|Gamepad|Joystick|STANDARD GAMEPAD|Vendor:|Product:/i.test(data.name)) {
                entry.name = data.name.trim();
                const sChar = this.simulation.characters.get(entry.serverCharId);
                if (sChar) {
                  sChar.name = entry.name;
                  sChar.hasCustomName = true;
                }
              }
            }
          }
          const primary = client.characters.get("keyboard") || client.characters.values().next().value;
          const playerNumber = primary ? primary.playerNumber : 1;
          const name = primary ? primary.name : "Player 1";
          const color = primary ? primary.color : PLAYER_COLORS[0];
          ws.send(JSON.stringify({
            type: "room_joined",
            clientId,
            playerNumber,
            name,
            color,
            registeredPlayers: Array.from(client.characters.values()),
            arena: {
              width: this.simulation.arena.width,
              height: this.simulation.arena.height,
              wallHeight: this.simulation.arena.wallHeight,
              tileGrid: this.simulation.arena.tileGrid
            },
            worldSnapshot: this.simulation.getAuthoritativeWorldSnapshot()
          }));
          return;
        }
        if (data.type === "add_player") {
          const localPlayerId = data.localPlayerId || `player-${client.characters.size + 1}`;
          const kbEntry = client.characters.get("keyboard");
          if (localPlayerId !== "keyboard" && kbEntry && kbEntry.isDefaultPlaceholder && !client.hasReceivedKeyboardInput && client.characters.size === 1) {
            console.log(`🌐 [UniversalRoom] Replacing unused default placeholder "keyboard" with first real player "${localPlayerId}" for client ${clientId}`);
            this.unregisterCharacter(client, "keyboard");
          }
          const entry = this.registerCharacter(client, localPlayerId, data.name, data.spawnPos);
          entry.isDefaultPlaceholder = false;
          ws.send(JSON.stringify({
            type: "player_added",
            localPlayerId: entry.localPlayerId,
            serverCharId: entry.serverCharId,
            playerNumber: entry.playerNumber,
            color: entry.color,
            name: entry.name,
            spawnPos: entry.spawnPos
          }));
          return;
        }
        if (data.type === "remove_player") {
          const localPlayerId = data.localPlayerId;
          if (localPlayerId) {
            this.unregisterCharacter(client, localPlayerId);
            ws.send(JSON.stringify({
              type: "player_removed",
              localPlayerId
            }));
          }
          return;
        }
        if (data.type === "player_input" && data.packet) {
          const localPlayerId = data.localPlayerId || "keyboard";
          let charEntry = client.characters.get(localPlayerId);
          if (!charEntry) {
            if (client.characters.size === 0) {
              charEntry = this.registerCharacter(client, localPlayerId, (_a = data.character) == null ? void 0 : _a.name);
            } else {
              return;
            }
          }
          const serverCharId = charEntry.serverCharId;
          const pkt = data.packet;
          pkt.playerId = serverCharId;
          if (localPlayerId === "keyboard") {
            if (pkt.moveX !== 0 || pkt.moveY !== 0 || pkt.isJumpHeld || pkt.isGrabHeld || pkt.isAiming) {
              charEntry.isDefaultPlaceholder = false;
              client.hasReceivedKeyboardInput = true;
            }
          }
          let sChar = this.simulation.characters.get(serverCharId);
          if (!sChar) {
            const fallbackSpawn = HealthModule.RESPAWN_SPAWNS[Math.floor(Math.random() * HealthModule.RESPAWN_SPAWNS.length)];
            const spawnX = ((_b = charEntry.spawnPos) == null ? void 0 : _b.x) ?? fallbackSpawn.x;
            const spawnY = ((_c = charEntry.spawnPos) == null ? void 0 : _c.y) ?? fallbackSpawn.y;
            const spawnZ = ((_d = charEntry.spawnPos) == null ? void 0 : _d.z) ?? (fallbackSpawn.z ?? 0);
            const newChar = new Character({
              id: serverCharId,
              x: spawnX,
              y: spawnY,
              color: charEntry.color,
              colliderRadius: 0.44,
              mass: 1.2,
              strength: 1,
              playerId: serverCharId,
              playerNumber: charEntry.playerNumber,
              name: charEntry.name,
              hasCustomName: !/^Player(\s+\d+)?$/i.test(charEntry.name.trim())
            });
            newChar.serverCharId = serverCharId;
            newChar.position.z = spawnZ;
            this.simulation.characters.set(serverCharId, newChar);
            this.simulation.arena.entities = [...this.simulation.allCharacters, ...this.simulation.objects];
            sChar = newChar;
          }
          if (sChar && pkt.playerName && pkt.playerName !== sChar.name) {
            if (!/^Player(\s+\d+)?$/i.test(pkt.playerName.trim()) && !/^Controller\s+#\d+$/i.test(pkt.playerName.trim()) && !/Xbox|XInput|DualShock|DualSense|PlayStation|Wireless Controller|Gamepad|Joystick|STANDARD GAMEPAD|Vendor:|Product:/i.test(pkt.playerName)) {
              sChar.name = pkt.playerName.trim();
              sChar.hasCustomName = true;
              charEntry.name = pkt.playerName.trim();
            }
          }
          this.simulation.queueInput(pkt);
          if (Array.isArray(data.consumedObjectIds) && data.consumedObjectIds.length > 0) {
            for (const objId of data.consumedObjectIds) {
              this.simulation.settleClientConsumedObject(serverCharId, objId);
            }
          }
          if (Array.isArray(data.ackContestedEventIds) && data.ackContestedEventIds.length > 0) {
            this.simulation.acknowledgeContestedEvents(serverCharId, data.ackContestedEventIds);
          }
          if (Array.isArray(data.ackDeathRespawnEventIds) && data.ackDeathRespawnEventIds.length > 0) {
            this.simulation.acknowledgeDeathRespawnEvents(serverCharId, data.ackDeathRespawnEventIds);
          }
          if (Array.isArray(data.ackObjectDeletionEventIds) && data.ackObjectDeletionEventIds.length > 0) {
            this.simulation.acknowledgeObjectDeletionEvents(serverCharId, data.ackObjectDeletionEventIds);
          }
          if (Array.isArray(data.reliableActions) && data.reliableActions.length > 0) {
            for (const act of data.reliableActions) {
              act.playerId = this.resolveActionPlayerId(client, act, serverCharId);
            }
            this.simulation.processReliableActions(data.reliableActions);
          }
          if (data.character) {
            data.character.id = serverCharId;
            if (sChar) {
              data.character.name = sChar.name;
              data.character.color = sChar.color;
              if (data.character.isUsingItem !== void 0) {
                sChar.isUsingItem = Boolean(data.character.isUsingItem);
              }
              if (data.character.lastVisualPunchTime !== void 0 && sChar.meleeModule) {
                const prevPunch = sChar._lastTelemetryPunchTime ?? 0;
                if (data.character.lastVisualPunchTime !== prevPunch && data.character.lastVisualPunchTime > 0) {
                  sChar._lastTelemetryPunchTime = data.character.lastVisualPunchTime;
                  sChar.meleeModule.lastVisualPunchTime = this.simulation.currentTick;
                  if (data.character.visualPunchDirX !== void 0 && data.character.visualPunchDirY !== void 0) {
                    sChar.meleeModule.lastVisualPunchDir = { x: data.character.visualPunchDirX, y: data.character.visualPunchDirY };
                  }
                }
              }
              if (sChar.laserModule && data.character.isLaserAiming !== void 0) {
                sChar.isLaserAiming = Boolean(data.character.isLaserAiming);
                sChar.isLaserFiring = Boolean(data.character.isLaserFiring);
                if (data.character.laserAimX !== void 0 && data.character.laserAimY !== void 0) {
                  sChar.laserAimTarget = { x: data.character.laserAimX, y: data.character.laserAimY };
                }
              }
            }
            this.simulation.syncCharacterFromPacket(data.character);
          }
          if (Array.isArray(data.objects) && data.objects.length > 0) {
            this.simulation.syncObjectsFromPacket(data.objects, serverCharId);
          }
          return;
        }
        if (data.type === "laser_fire_state") {
          const localPlayerId = data.localPlayerId || "keyboard";
          const charEntry = client.characters.get(localPlayerId);
          const serverCharId = charEntry ? charEntry.serverCharId : data.serverCharId || clientId;
          const sChar = this.simulation.characters.get(serverCharId);
          if (sChar && sChar.laserModule) {
            const isFiring = Boolean(data.isFiring);
            sChar.isLaserFiring = isFiring;
            sChar.laserModule.isFiring = isFiring;
            sChar.laserStarvedTicks = isFiring ? 0 : 999;
            if (data.laserAimX !== void 0 && data.laserAimY !== void 0) {
              sChar.laserAimTarget = { x: data.laserAimX, y: data.laserAimY };
            }
            if (data.laserPowerFraction !== void 0) {
              sChar.laserPowerFraction = data.laserPowerFraction;
            }
          }
          return;
        }
        if (data.type === "grab_request" && data.targetObjectId) {
          const localPlayerId = data.localPlayerId || "keyboard";
          const charEntry = client.characters.get(localPlayerId);
          const serverCharId = charEntry ? charEntry.serverCharId : data.serverCharId || clientId;
          this.handleAuthoritativeGrab(serverCharId, data.targetObjectId);
          return;
        }
        if (data.type === "reliable_action" && data.action) {
          const localPlayerId = data.localPlayerId || "keyboard";
          const charEntry = client.characters.get(localPlayerId);
          const fallbackServerCharId = charEntry ? charEntry.serverCharId : data.serverCharId || clientId;
          const act = data.action;
          act.playerId = this.resolveActionPlayerId(client, act, fallbackServerCharId);
          this.simulation.processReliableActions([act]);
          return;
        }
        if (data.type === "rename_player") {
          if (data.name && typeof data.name === "string" && data.name.trim().length > 0) {
            const trimmed = data.name.trim();
            const localPlayerId = data.localPlayerId || "keyboard";
            let charEntry = client.characters.get(localPlayerId);
            if (!charEntry) {
              charEntry = client.characters.get("keyboard") || client.characters.values().next().value;
            }
            if (charEntry) {
              charEntry.name = trimmed;
              const sChar = this.simulation.characters.get(charEntry.serverCharId);
              if (sChar) sChar.name = trimmed;
            } else if (data.serverCharId) {
              const sChar = this.simulation.characters.get(data.serverCharId);
              if (sChar) sChar.name = trimmed;
            }
            this.broadcastSnapshot();
          }
          return;
        }
        if (data.type === "ping") {
          if (typeof data.clientTimestamp === "number") {
            client.lastPingMs = Math.max(1, Math.round(performance.now() - data.clientTimestamp));
          }
          ws.send(JSON.stringify({
            type: "pong",
            clientTimestamp: data.clientTimestamp,
            serverTick: this.simulation.currentTick
          }));
          return;
        }
      } catch (err) {
        console.warn(`[UniversalRoom] Error handling packet from ${clientId}:`, err);
      }
    });
    ws.on("close", () => {
      this.handleDisconnection(clientId);
    });
    ws.on("error", (err) => {
      console.warn(`[UniversalRoom] Socket error for ${clientId}:`, err.message);
      this.handleDisconnection(clientId);
    });
    ws.send(JSON.stringify({
      type: "room_welcome",
      clientId
    }));
  }
  handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;
    const removedCharIds = [];
    for (const entry of client.characters.values()) {
      removedCharIds.push(entry.serverCharId);
      const char = this.simulation.characters.get(entry.serverCharId);
      if (char) {
        if (char.heldObject) {
          char.heldObject.isHeld = false;
          char.heldObject.heldBy = null;
          char.heldObject.wakeUp();
          char.heldObject = null;
        }
        char.cleanupBeforeRemoval();
        this.simulation.characters.delete(entry.serverCharId);
      }
      this.simulation.jitterBuffer.clear(entry.serverCharId);
      this.simulation.latestClockSync.delete(entry.serverCharId);
      this.simulation.clientAckedTicks.delete(entry.serverCharId);
    }
    this.simulation.arena.entities = [...this.simulation.allCharacters, ...this.simulation.objects];
    this.clients.delete(clientId);
    console.log(
      `🌐 [UniversalRoom] Client disconnected: ${clientId} (Remaining clients: ${this.clients.size}, removed characters: ${removedCharIds.join(", ")})`
    );
    if (this.clients.size === 0) {
      this.trashMapMemory();
    } else {
      const leftPayload = JSON.stringify({
        type: "player_left",
        clientId,
        removedCharIds,
        playerCount: this.simulation.characters.size
      });
      for (const other of this.clients.values()) {
        if (other.ws.readyState === WebSocket.OPEN) {
          try {
            other.ws.send(leftPayload);
          } catch (_) {
          }
        }
      }
      this.broadcastSnapshot();
    }
  }
};
__publicField(_UniversalRoomManager, "instance", null);
let UniversalRoomManager = _UniversalRoomManager;
export {
  UniversalRoomManager
};
