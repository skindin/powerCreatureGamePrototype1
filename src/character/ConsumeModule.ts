import type { GameObject } from "../engine/GameObject.js";
import type { Character } from "./Character.js";
import type { Arena } from "../engine/Arena.js";
import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";

export interface ConsumeModuleOptions {
  enabled?: boolean;
  acceptedTags?: string[];
  involvesDirection?: boolean;
  consumptionSpeedMultiplier?: number;
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

  /** Whether using this ability involves aiming in a direction (false for eating/drinking/consuming) */
  public involvesDirection: boolean = false;

  /** Consumption speed multiplier: scales the eating speed / consume rate (Watts) */
  public consumptionSpeedMultiplierProp: DynamicProperty;

  constructor(options?: ConsumeModuleOptions) {
    this.consumptionSpeedMultiplierProp = new DynamicProperty(options?.consumptionSpeedMultiplier ?? 1.0);
    if (options?.enabled !== undefined) this.enabled = options.enabled;
    if (options?.involvesDirection !== undefined) this.involvesDirection = options.involvesDirection;
    if (options?.acceptedTags !== undefined) {
      this.acceptedTags = options.acceptedTags.map((t) => t.trim().toLowerCase()).filter(Boolean);
    }
  }

  public get consumptionSpeedMultiplier(): number {
    return this.consumptionSpeedMultiplierProp.literalValue;
  }

  public set consumptionSpeedMultiplier(val: number) {
    this.consumptionSpeedMultiplierProp.set(Math.max(0.01, val));
  }

  public getConsumptionSpeedMultiplier(registry?: ObjectPropertiesRegistry): number {
    return Math.max(0.01, this.consumptionSpeedMultiplierProp.get(registry));
  }

  public registerProperties(registry: ObjectPropertiesRegistry): void {
    registry.add("consumptionSpeedMultiplier", this.consumptionSpeedMultiplier);
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

    const matches = this.acceptedTags.some((t) => t.trim().toLowerCase() === itemTag);
    return matches;
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
      console.warn(`🍎 [ConsumeModule] Cannot consume object ${heldObj?.id}: canConsume=${this.canConsume(heldObj)}`);
      return { watts: 0, joules: 0, isDepleted: false };
    }
    const speedMultiplier = this.getConsumptionSpeedMultiplier(consumer.properties);
    const res = heldObj.consumableModule.consume(dt, consumer, heldObj, objects, arena, speedMultiplier);
    if (res.isDepleted) {
      console.log(`🍎 [ConsumeModule] Object ${heldObj.id} depleted! isDepleted=true`);
    }
    return res;
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
