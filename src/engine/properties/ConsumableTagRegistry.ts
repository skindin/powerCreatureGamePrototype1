/**
 * ConsumableTagRegistry: Global registry managing user-created consumable tags
 * (e.g. "food", "drink", "potion", "battery").
 *
 * Provides:
 * - Searchable tag list
 * - Inline tag creation
 * - Renaming with cascading propagation to all consumable items and character consume modules
 * - Deletion with unlinking / removal from all consumable items and character consume modules
 * - Event subscription for UI reactivity (DevPanel)
 */

export type TagChangeListener = () => void;
export type TagRenameListener = (oldTag: string, newTag: string) => void;
export type TagDeleteListener = (deletedTag: string) => void;

export class ConsumableTagRegistry {
  private _tags: Set<string> = new Set();
  private _changeListeners: Set<TagChangeListener> = new Set();
  private _renameListeners: Set<TagRenameListener> = new Set();
  private _deleteListeners: Set<TagDeleteListener> = new Set();

  constructor(initialTags: string[] = ["food", "drink", "potion", "battery"]) {
    for (const tag of initialTags) {
      const clean = tag.trim().toLowerCase();
      if (clean) this._tags.add(clean);
    }
  }

  /**
   * Returns a sorted array of all registered tags.
   */
  public getAll(): string[] {
    return Array.from(this._tags).sort();
  }

  /**
   * Check if a tag exists (case-insensitive).
   */
  public has(tag: string): boolean {
    return this._tags.has(tag.trim().toLowerCase());
  }

  /**
   * Add a new tag to the registry. Returns true if added, false if already exists or invalid.
   */
  public add(tag: string): boolean {
    const clean = tag.trim().toLowerCase();
    if (!clean || this._tags.has(clean)) {
      return false;
    }
    this._tags.add(clean);
    this.notify();
    return true;
  }

  /**
   * Renames a tag in the registry and cascades the change to all listeners.
   */
  public rename(oldTag: string, newTag: string): boolean {
    const cleanOld = oldTag.trim().toLowerCase();
    const cleanNew = newTag.trim().toLowerCase();
    if (!cleanOld || !cleanNew || cleanOld === cleanNew) return false;
    if (!this._tags.has(cleanOld)) return false;
    if (this._tags.has(cleanNew)) return false; // Collision

    this._tags.delete(cleanOld);
    this._tags.add(cleanNew);

    // Notify rename listeners first so entities can update their references
    for (const listener of this._renameListeners) {
      try {
        listener(cleanOld, cleanNew);
      } catch (err) {
        console.error("Error in tag rename listener:", err);
      }
    }

    this.notify();
    return true;
  }

  /**
   * Deletes a tag from the registry and notifies listeners to remove/unlink references.
   */
  public delete(tag: string): boolean {
    const clean = tag.trim().toLowerCase();
    if (!this._tags.has(clean)) return false;

    this._tags.delete(clean);

    // Notify delete listeners first so entities can clear references
    for (const listener of this._deleteListeners) {
      try {
        listener(clean);
      } catch (err) {
        console.error("Error in tag delete listener:", err);
      }
    }

    this.notify();
    return true;
  }

  /**
   * Subscribes to general registry changes (add, rename, delete).
   */
  public subscribe(listener: TagChangeListener): () => void {
    this._changeListeners.add(listener);
    return () => this._changeListeners.delete(listener);
  }

  /**
   * Subscribes specifically to rename events for propagating name changes.
   */
  public onRename(listener: TagRenameListener): () => void {
    this._renameListeners.add(listener);
    return () => this._renameListeners.delete(listener);
  }

  /**
   * Subscribes specifically to delete events for propagating deletions.
   */
  public onDelete(listener: TagDeleteListener): () => void {
    this._deleteListeners.add(listener);
    return () => this._deleteListeners.delete(listener);
  }

  public notify(): void {
    for (const listener of this._changeListeners) {
      try {
        listener();
      } catch (err) {
        console.error("Error in tag change listener:", err);
      }
    }
  }
}

/** Global shared singleton registry for consumable tags across the game */
export const consumableTagRegistry = new ConsumableTagRegistry();
