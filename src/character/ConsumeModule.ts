import type { GameObject } from "../engine/GameObject.js";
import type { Character } from "./Character.js";
import type { Arena } from "../engine/Arena.js";

export interface ConsumeModuleOptions {
  enabled?: boolean;
  acceptedTags?: string[];
}

/**
 * ConsumeModule: Modular capability mounted on a Character that governs their ability
 * to consume physical items in the world (e.g. food, potions, batteries).
 *
 * Characters specify a list of `acceptedTags` (e.g. ["food", "fruit"]).
 * When the character holds a consumable object whose tag matches one of their accepted tags,
 * holding Primary Action (Left Mouse Button / Gamepad RT) actively consumes the item.
 */
export class ConsumeModule {
  public id = "consume";
  public name = "Consume";
  public enabled: boolean = true;

  /** List of consumable tags this character is capable of consuming */
  public acceptedTags: string[] = ["food"];

  constructor(options?: ConsumeModuleOptions) {
    if (options?.enabled !== undefined) this.enabled = options.enabled;
    if (options?.acceptedTags !== undefined) {
      this.acceptedTags = options.acceptedTags.map((t) => t.trim().toLowerCase()).filter(Boolean);
    }
  }

  /**
   * Checks whether the given held object is valid for consumption by this character.
   */
  public canConsume(heldObj: GameObject | null): boolean {
    if (!this.enabled || !heldObj) return false;
    const mod = heldObj.consumableModule;
    if (!mod || !mod.enabled || mod.isConsumed) return false;

    const itemTag = (mod.tag || "").trim().toLowerCase();
    if (!itemTag) return false;

    return this.acceptedTags.some((t) => t.trim().toLowerCase() === itemTag);
  }

  /**
   * Performs continuous consumption of the held object.
   */
  public consume(
    dt: number,
    consumer: Character,
    heldObj: GameObject,
    objects?: GameObject[],
    arena?: Arena
  ): { watts: number; joules: number; isDepleted: boolean } {
    if (!this.canConsume(heldObj) || !heldObj.consumableModule) {
      return { watts: 0, joules: 0, isDepleted: false };
    }
    return heldObj.consumableModule.consume(dt, consumer, heldObj, objects, arena);
  }

  /**
   * Adds an accepted tag to this character's list.
   */
  public addTag(tag: string): boolean {
    const clean = tag.trim().toLowerCase();
    if (!clean || this.hasTag(clean)) return false;
    this.acceptedTags.push(clean);
    return true;
  }

  /**
   * Removes an accepted tag from this character's list.
   */
  public removeTag(tag: string): boolean {
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
  public hasTag(tag: string): boolean {
    const clean = tag.trim().toLowerCase();
    return this.acceptedTags.some((t) => t.trim().toLowerCase() === clean);
  }

  /**
   * Handles registry tag rename events.
   */
  public onTagRenamed(oldTag: string, newTag: string): void {
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
  public onTagDeleted(deletedTag: string): void {
    const clean = deletedTag.trim().toLowerCase();
    this.acceptedTags = this.acceptedTags.filter((t) => t.trim().toLowerCase() !== clean);
  }
}
