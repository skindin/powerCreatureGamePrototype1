import type { ReliableActionCommand } from "../engine/physics/StateHistoryBuffer.js";

/**
 * Isolated Client Action Dispatcher (Tier 2 Protected)
 *
 * Centralizes construction and dispatch of high-priority ReliableActionCommand
 * packets (`pickup`, `drop`, `throw`, `punch`) so local gameplay/UI branches in
 * PlayerManager cannot corrupt or skip network action payloads.
 */
export class ClientActionDispatcher {
  private static actionSeq = 0;

  public static nextSeq(): number {
    return ++this.actionSeq;
  }

  public static dispatchDrop(
    onDispatch: ((action: ReliableActionCommand) => void) | undefined,
    isReplay: boolean,
    actPlayerId: string,
    tick: number,
    targetObjectId: string
  ): void {
    if (isReplay || !onDispatch) return;
    const action: ReliableActionCommand = {
      actionId: `act-${actPlayerId}-drop-${this.nextSeq()}-${Date.now()}`,
      type: "drop",
      tick,
      timestamp: performance.now(),
      playerId: actPlayerId,
      targetObjectId,
    };
    onDispatch(action);
  }

  public static dispatchThrow(
    onDispatch: ((action: ReliableActionCommand) => void) | undefined,
    isReplay: boolean,
    actPlayerId: string,
    tick: number,
    targetObjectId: string,
    aimX: number,
    aimY: number,
    isLockHeld: boolean,
    launchVel?: { vx: number; vy: number; vz: number },
    launchPos?: { x: number; y: number; z: number }
  ): void {
    if (isReplay || !onDispatch) return;
    const action: ReliableActionCommand = {
      actionId: `act-${actPlayerId}-throw-${this.nextSeq()}-${Date.now()}`,
      type: "throw",
      tick,
      timestamp: performance.now(),
      playerId: actPlayerId,
      targetObjectId,
      aimX,
      aimY,
      isLockHeld,
      ...(launchVel
        ? {
            launchVx: launchVel.vx,
            launchVy: launchVel.vy,
            launchVz: launchVel.vz,
          }
        : {}),
      ...(launchPos
        ? {
            launchStartX: launchPos.x,
            launchStartY: launchPos.y,
            launchStartZ: launchPos.z,
          }
        : {}),
    } as any;
    onDispatch(action);
  }

  public static dispatchPunch(
    onDispatch: ((action: ReliableActionCommand) => void) | undefined,
    isReplay: boolean,
    actPlayerId: string,
    tick: number,
    aimX: number,
    aimY: number
  ): void {
    if (isReplay || !onDispatch) return;
    const action: ReliableActionCommand = {
      actionId: `act-${actPlayerId}-punch-${this.nextSeq()}-${Date.now()}`,
      type: "punch" as any,
      tick,
      timestamp: performance.now(),
      playerId: actPlayerId,
      aimX,
      aimY,
    };
    onDispatch(action);
  }

  public static dispatchPickup(
    onDispatch: ((action: ReliableActionCommand) => void) | undefined,
    isReplay: boolean,
    actPlayerId: string,
    tick: number,
    targetObjectId: string
  ): void {
    if (isReplay || !onDispatch) return;
    const action: ReliableActionCommand = {
      actionId: `act-${actPlayerId}-pickup-${this.nextSeq()}-${Date.now()}`,
      type: "pickup",
      tick,
      timestamp: performance.now(),
      playerId: actPlayerId,
      targetObjectId,
    };
    onDispatch(action);
  }
}
