import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";

export interface WallEdgeAssistModuleOptions {
  preventWalkOff?: boolean;
  hangDistance?: number;
  enabled?: boolean;
}

export class WallEdgeAssistModule {
  public id = "wallEdgeAssist";
  public name = "Wall Edge Assist";
  public enabled = true;

  /**
   * Whether to prevent walking off elevated walls when walking on wall tops.
   */
  public preventWalkOff = false;

  /**
   * Maximum distance the character is allowed to hang off of elevated walls
   * before the ledge guard clamps movement (in units).
   */
  public hangDistanceProp: DynamicProperty;

  /** Whether the assist clamp (ledge guard) is currently active/armed */
  public isAssistClampArmed = false;

  /** Tracks whether character has moved onto the wall top platform after mounting */
  public hasMovedOntoWall = false;

  /** Tracks if character has moved outside the clamp zone (> 0.1u) after dismounting */
  public hasLeftClampZoneSinceDismount = true;

  public mountStartX = 0;
  public mountStartY = 0;

  constructor(options?: WallEdgeAssistModuleOptions) {
    if (options?.preventWalkOff !== undefined) this.preventWalkOff = options.preventWalkOff;
    this.hangDistanceProp = new DynamicProperty(options?.hangDistance ?? 0.10);
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  public get hangDistance(): number {
    return this.hangDistanceProp.literalValue;
  }

  public set hangDistance(val: number) {
    this.hangDistanceProp.literalValue = val;
  }

  public getHangDistance(registry?: ObjectPropertiesRegistry): number {
    return this.hangDistanceProp.get(registry);
  }
}

