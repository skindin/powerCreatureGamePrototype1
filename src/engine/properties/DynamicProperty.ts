/**
 * DynamicProperty: A Blender-style property socket that can either hold
 * an independent literal number, or reference a named property on an entity.
 */

export interface ObjectPropertyDefinition {
  name: string;
  value: number;
}

export type DynamicPropertyChangeCallback = (prop: DynamicProperty) => void;

export class DynamicProperty {
  public isReference: boolean = false;
  public referenceKey: string = '';
  public literalValue: number = 0;

  // Listeners for UI reactivity (e.g. syncing DevPanel inputs)
  private _listeners: Set<DynamicPropertyChangeCallback> = new Set();

  constructor(initialValue: number = 0, isReference: boolean = false, referenceKey: string = '') {
    this.literalValue = initialValue;
    this.isReference = isReference;
    this.referenceKey = referenceKey;
  }

  /**
   * Resolves the current numeric value given an owner registry.
   * If in reference mode and the property doesn't exist, it remains in
   * "limbo" and returns literalValue as fallback.
   */
  public get(registry?: ObjectPropertiesRegistry | null): number {
    if (this.isReference && this.referenceKey && registry) {
      const ref = registry.get(this.referenceKey);
      if (ref !== undefined) {
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
  public set(value: number, registry?: ObjectPropertiesRegistry | null): void {
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
  public isLimbo(registry?: ObjectPropertiesRegistry | null): boolean {
    if (!this.isReference || !this.referenceKey) return false;
    if (!registry) return true;
    return !registry.has(this.referenceKey);
  }

  /**
   * Switches to reference mode and links to a specific key.
   */
  public link(referenceKey: string, registry?: ObjectPropertiesRegistry | null): void {
    this.isReference = true;
    this.referenceKey = referenceKey;
    if (registry && registry.has(referenceKey)) {
      // Sync initial literal value to matched reference
      this.literalValue = registry.get(referenceKey)!;
    }
    this.notify();
  }

  /**
   * Unlinks from reference mode and becomes a standalone literal value.
   */
  public unlink(): void {
    this.isReference = false;
    this.referenceKey = '';
    this.notify();
  }

  public subscribe(cb: DynamicPropertyChangeCallback): () => void {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  public notify(): void {
    for (const cb of this._listeners) {
      cb(this);
    }
  }

  public clone(): DynamicProperty {
    const p = new DynamicProperty(this.literalValue, this.isReference, this.referenceKey);
    return p;
  }
}

/**
 * ObjectPropertiesRegistry: Manages named referenceable properties for a specific GameObject.
 * Enforces locally unique names and supports rename propagation, creation, and deletion.
 */
export class ObjectPropertiesRegistry {
  private _properties: Map<string, number> = new Map();
  private _changeListeners: Set<() => void> = new Set();

  constructor(initialEntries?: Record<string, number>) {
    if (initialEntries) {
      for (const [k, v] of Object.entries(initialEntries)) {
        this._properties.set(k, v);
      }
    }
  }

  public has(name: string): boolean {
    return this._properties.has(name);
  }

  public get(name: string): number | undefined {
    return this._properties.get(name);
  }

  public set(name: string, value: number): void {
    this._properties.set(name, value);
    this.notify();
  }

  /**
   * Adds a new named property with uniqueness enforcement.
   * If the name already exists, returns false or throws.
   */
  public add(name: string, initialValue: number = 1.0): boolean {
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
  public delete(name: string): boolean {
    const deleted = this._properties.delete(name);
    if (deleted) {
      this.notify();
    }
    return deleted;
  }

  /**
   * Renames a property. Updates all registered DynamicProperty sockets pointing to oldName to newName.
   */
  public rename(oldName: string, newName: string, socketsToUpdate?: DynamicProperty[]): boolean {
    const trimmedNew = newName.trim();
    if (!trimmedNew || trimmedNew === oldName) return false;
    if (this._properties.has(trimmedNew)) return false; // Name collision

    const val = this._properties.get(oldName);
    if (val === undefined) return false;

    this._properties.delete(oldName);
    this._properties.set(trimmedNew, val);

    // Update all matching sockets
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

  public getAll(): ObjectPropertyDefinition[] {
    const list: ObjectPropertyDefinition[] = [];
    for (const [name, value] of this._properties.entries()) {
      list.push({ name, value });
    }
    return list;
  }

  public subscribe(cb: () => void): () => void {
    this._changeListeners.add(cb);
    return () => this._changeListeners.delete(cb);
  }

  public notify(): void {
    for (const cb of this._changeListeners) {
      cb();
    }
  }

  public toJSON(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of this._properties.entries()) {
      out[k] = v;
    }
    return out;
  }

  public static fromJSON(data: Record<string, number>): ObjectPropertiesRegistry {
    return new ObjectPropertiesRegistry(data);
  }
}
