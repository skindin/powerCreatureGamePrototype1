/**
 * InputPressTokenManager — Intrinsic Input Consumption & Lifecycle Tokens
 * 
 * Manages clean button press lifecycle:
 * - Fresh: Key was pressed down and has not yet triggered any action.
 * - Claimed(actionId): An action triggered and claimed this press.
 * - Released: Key was released, resetting the token.
 * 
 * Solves multi-action hold overlap (e.g. eating with RMB then picking up a rock on the same hold)
 * without requiring custom stage conditions.
 */

export type ClaimPolicy = "requireCleanPress" | "allowContinuousHold" | "exclusiveClaim";

export interface InputTokenState {
  code: string;
  isDown: boolean;
  downTime: number;
  isFresh: boolean;
  claimedBy: string | null;
}

export class InputPressTokenManager {
  private static instance: InputPressTokenManager | null = null;
  private tokens: Map<string, InputTokenState> = new Map();

  public static getInstance(): InputPressTokenManager {
    if (!this.instance) {
      this.instance = new InputPressTokenManager();
    }
    return this.instance;
  }

  public update(currentDownKeys: Set<string>, now: number): void {
    // 1. Process keys that went down
    for (const code of currentDownKeys) {
      const existing = this.tokens.get(code);
      if (!existing || !existing.isDown) {
        this.tokens.set(code, {
          code,
          isDown: true,
          downTime: now,
          isFresh: true,
          claimedBy: null,
        });
      }
    }

    // 2. Process keys that were released
    for (const [code, token] of this.tokens.entries()) {
      if (!currentDownKeys.has(code) && token.isDown) {
        token.isDown = false;
        token.isFresh = false;
        token.claimedBy = null;
      }
    }
  }

  public isDown(code: string): boolean {
    return this.tokens.get(code)?.isDown ?? false;
  }

  public isFresh(code: string): boolean {
    const t = this.tokens.get(code);
    return Boolean(t && t.isDown && t.isFresh);
  }

  public getHoldDuration(code: string, now: number): number {
    const t = this.tokens.get(code);
    if (!t || !t.isDown) return 0;
    return Math.max(0, now - t.downTime);
  }

  public claim(code: string, actionId: string): boolean {
    const t = this.tokens.get(code);
    if (!t || !t.isDown) return false;
    t.isFresh = false;
    t.claimedBy = actionId;
    return true;
  }

  public isClaimedBy(code: string, actionId: string): boolean {
    const t = this.tokens.get(code);
    return Boolean(t && t.isDown && t.claimedBy === actionId);
  }

  public canExecute(code: string, policy: ClaimPolicy, actionId: string): boolean {
    const t = this.tokens.get(code);
    if (!t || !t.isDown) return false;

    if (policy === "requireCleanPress") {
      // Must be fresh OR already actively claimed by THIS action
      return t.isFresh || t.claimedBy === actionId;
    }

    if (policy === "exclusiveClaim") {
      return t.isFresh && t.claimedBy === null;
    }

    // allowContinuousHold: can execute even if already held
    return true;
  }

  public reset(): void {
    this.tokens.clear();
  }
}

