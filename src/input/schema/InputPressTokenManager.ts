/**
 * InputPressTokenManager — Intrinsic Input Consumption & Lifecycle Tokens
 * 
 * Manages clean button press lifecycle:
 * - Fresh: Key was pressed down and has not yet triggered any action.
 * - Claimed(actionId, target): An action triggered and claimed this press.
 * - Released: Key was released this frame, capturing release snapshots so release triggers (triggerMode: "up")
 *   can verify whether the press that was just released was clean or claimed by the same action/domain.
 * 
 * Solves multi-action hold overlap (e.g. eating with RMB then picking up a rock on the same hold,
 * or picking up a rock with RMB down and immediately throwing it on RMB up).
 */

export type ClaimPolicy = "requireCleanPress" | "allowContinuousHold" | "exclusiveClaim";

export interface InputTokenState {
  code: string;
  isDown: boolean;
  downTime: number;
  isFresh: boolean;
  claimedBy: string | null;
  claimedByBindingId: string | null;
  claimedByTarget: string | null;

  // Discrete action consumption: marks button press as spent once an action actually executes on this press
  isConsumed: boolean;
  consumedBy: string | null;
  consumedByTarget: string | null;

  // Snapshot preserved exclusively on the single frame the key transitions from down to up
  wasReleasedThisFrame: boolean;
  releasedClaimedBy: string | null;
  releasedClaimedByBindingId: string | null;
  releasedClaimedByTarget: string | null;
  wasFreshOnRelease: boolean;
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
    // 1. Clear single-frame release flags from previous tick
    for (const token of this.tokens.values()) {
      token.wasReleasedThisFrame = false;
      token.releasedClaimedBy = null;
      token.releasedClaimedByBindingId = null;
      token.releasedClaimedByTarget = null;
      token.wasFreshOnRelease = false;
    }

    // 2. Process keys that are currently down
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
          wasFreshOnRelease: false,
        });
      }
    }

    // 3. Process keys that were released this tick
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

  public isDown(code: string): boolean {
    return this.tokens.get(code)?.isDown ?? false;
  }

  public isFresh(code: string): boolean {
    const t = this.tokens.get(code);
    return Boolean(t && t.isDown && t.isFresh);
  }

  public wasReleased(code: string): boolean {
    return this.tokens.get(code)?.wasReleasedThisFrame ?? false;
  }

  public getHoldDuration(code: string, now: number): number {
    const t = this.tokens.get(code);
    if (!t || !t.isDown) return 0;
    return Math.max(0, now - t.downTime);
  }

  public claim(code: string, actionId: string, target?: string): boolean {
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

  public consume(code: string, actionId: string, target?: string): boolean {
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

  public isConsumed(code: string): boolean {
    return Boolean(this.tokens.get(code)?.isConsumed);
  }

  public isClaimedBy(code: string, actionId: string): boolean {
    const t = this.tokens.get(code);
    return Boolean(
      t &&
      t.isDown &&
      (t.claimedBy === actionId || t.claimedByBindingId === actionId || t.claimedByTarget === actionId)
    );
  }

  /**
   * Evaluates if a button press can execute while currently held or pressed down.
   */
  public canExecute(
    code: string,
    policy: ClaimPolicy,
    actionId: string,
    target?: string
  ): boolean {
    const t = this.tokens.get(code);
    if (!t || !t.isDown) return false;

    // A press consumed by a discrete one-shot action cannot execute again until physically released
    if (t.isConsumed) return false;

    if (policy === "requireCleanPress") {
      // Must be fresh OR already actively claimed by THIS action / target / domain
      if (t.isFresh) return true;
      if (t.claimedBy === actionId || t.claimedByBindingId === actionId) return true;
      if (target && t.claimedByTarget === target) return true;

      const domain = target?.split(".")[0];
      if (domain && t.claimedByTarget?.startsWith(domain)) return true;

      return false;
    }

    if (policy === "exclusiveClaim") {
      return t.isFresh && t.claimedBy === null;
    }

    // allowContinuousHold: can execute even if already held
    return true;
  }

  /**
   * Evaluates if a button release trigger (triggerMode: "up") can execute on the release frame.
   * Ensures that releasing a key only fires if the press that was released was clean or belonged to this domain.
   */
  public canExecuteRelease(
    code: string,
    policy: ClaimPolicy,
    actionId: string,
    target?: string
  ): boolean {
    const t = this.tokens.get(code);
    if (!t || !t.wasReleasedThisFrame) return false;

    if (policy === "requireCleanPress") {
      // Must have been fresh on release...
      if (t.wasFreshOnRelease || (!t.releasedClaimedBy && !t.releasedClaimedByTarget)) {
        return true;
      }
      // ...OR was claimed by this action/binding
      if (t.releasedClaimedBy === actionId || t.releasedClaimedByBindingId === actionId) {
        return true;
      }
      // ...OR was claimed by this target or related domain (e.g. throw.aim releasing into throw.fire)
      if (target && t.releasedClaimedByTarget === target) {
        return true;
      }
      const domain = target?.split(".")[0];
      if (domain && t.releasedClaimedByTarget?.startsWith(domain)) {
        return true;
      }

      return false;
    }

    if (policy === "exclusiveClaim") {
      return t.wasFreshOnRelease && t.releasedClaimedBy === null;
    }

    return true;
  }

  public reset(): void {
    this.tokens.clear();
  }
}
