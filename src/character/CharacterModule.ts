export type CharacterRole = "local_player" | "local_ai" | "remote_player" | "remote_ai" | "dummy";

export interface CharacterModuleOptions {
  role?: CharacterRole;
  isDummy?: boolean;
}

/**
 * CharacterModule
 * 
 * First-class module component distinguishing characters from generic freebody items.
 * Classifies entity role into:
 * - "local_player": Direct local human input (keyboard / local gamepad)
 * - "local_ai": Client-side autonomous bot/NPC
 * - "remote_player": Human player on a network peer client
 * - "remote_ai": Server-dictated bot/NPC
 * - "dummy": Inert physical entity with health/combat modules, treated physically like an inanimate object
 */
export class CharacterModule {
  public id = "character";
  public name = "Character Module";
  public enabled = true;
  public role: CharacterRole;

  constructor(options?: CharacterModuleOptions) {
    if (options?.role) {
      this.role = options.role;
    } else if (options?.isDummy) {
      this.role = "dummy";
    } else {
      this.role = "local_player";
    }
  }

  public get isDummy(): boolean {
    return this.role === "dummy";
  }

  public set isDummy(val: boolean) {
    if (val) {
      this.role = "dummy";
    } else if (this.role === "dummy") {
      this.role = "local_player";
    }
  }

  public get isPlayer(): boolean {
    return this.role === "local_player" || this.role === "remote_player";
  }

  public get isAI(): boolean {
    return this.role === "local_ai" || this.role === "remote_ai";
  }

  public get isLocal(): boolean {
    return this.role === "local_player" || this.role === "local_ai" || this.role === "dummy";
  }

  public get isRemote(): boolean {
    return this.role === "remote_player" || this.role === "remote_ai";
  }
}
