import type { Arena } from "../Arena.js";
import type { GameObject } from "../GameObject.js";
import { Character } from "../../character/Character.js";
import type { ViewSettings } from "../Renderer.js";

export class EntityPass {
  /**
   * Draws a freebody dynamic object (boxes, rolling spheres).
   */
  public static drawFreebodyObject(
    ctx: CanvasRenderingContext2D,
    obj: GameObject,
    allCharacters: Character[],
    ppu: number,
    targetGrabEntities: GameObject | null | Map<Character, GameObject | null> | Set<GameObject> | undefined,
    arena: Arena,
    viewSettings: ViewSettings,
    effectivePos: { x: number; y: number; z: number },
    getAltitudeScale: (z: number, wallHeight: number) => number,
    isEntityOnLayer2: (entity: GameObject, wallHeight: number) => boolean,
    localHeroCharacter?: Character | null,
    isSplitScreenViewport = false,
    remoteOverrides?: Map<string, { x: number; y: number; z: number; facingAngle?: number; isClimbing?: boolean }>
  ): void {
    const useBigger = viewSettings.verticalVisuals === "bigger" || viewSettings.verticalVisuals === "both";
    const useHover = viewSettings.verticalVisuals === "hover" || viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? viewSettings.visualAltitudeScale : 0;

    const vx = obj.visualOffset ? obj.visualOffset.x : 0;
    const vy = obj.visualOffset ? obj.visualOffset.y : 0;

    const { x: posX, y: posY, z: posZ } = effectivePos;

    const x = (posX - vx) * ppu;
    const y = (posY - vy - posZ * hoverScale) * ppu;
    const altitudeScale = useBigger ? getAltitudeScale(posZ, arena.wallHeight) : 1.0;
    const visualRadius = obj.hasCollider ? obj.colliderRadius : (obj.colliderModule?.radius ?? 0.32);
    const realRadius = visualRadius * ppu;
    const renderRadius = realRadius * altitudeScale;

    const isOtherClientSim = (c: Character): boolean => {
      if (isSplitScreenViewport) {
        return localHeroCharacter ? c !== localHeroCharacter : false;
      }
      return Boolean(remoteOverrides && remoteOverrides.has(c.playerId));
    };

    const eligibleCharacters = allCharacters.filter((c) => !isOtherClientSim(c));

    const charactersInReach = eligibleCharacters.filter(
      (c) =>
        !c.isHeld &&
        c.heldObject !== obj &&
        c.pickupModule !== null &&
        c.pickupModule.enabled &&
        !obj.isHeld &&
        (c.pickupModule?.isObjectInReach(c, obj, arena.wallHeight) ?? false)
    );

    const targetingChars: Character[] = [];
    if (targetGrabEntities instanceof Map) {
      for (const [char, target] of targetGrabEntities.entries()) {
        if (isOtherClientSim(char)) continue;
        if (target === obj) targetingChars.push(char);
      }
    } else if (targetGrabEntities) {
      if (targetGrabEntities instanceof Set && targetGrabEntities.has(obj)) {
        targetingChars.push(...charactersInReach);
      } else if (targetGrabEntities === obj) {
        targetingChars.push(...charactersInReach);
      }
    }
    const isTargetGrab = targetingChars.length > 0;
    const isWithinPickupRange = charactersInReach.length > 0 || isTargetGrab;

    const isOnLayer2 = isEntityOnLayer2(obj, arena.wallHeight);
    const isHeld = obj.isHeld || allCharacters.some((c) => c.heldObject === obj);
    const isBiggerWithoutHover = useBigger && (!useHover || hoverScale <= 0);
    const shouldBeTransparent = isHeld || (isBiggerWithoutHover && isOnLayer2);

    ctx.save();
    ctx.globalAlpha = shouldBeTransparent ? 0.55 : 1.0;

    if (obj.visualShape === "box") {
      const size = renderRadius * 2;
      const cornerR = Math.max(3, renderRadius * 0.16);
      const left = x - renderRadius;
      const top = y - renderRadius;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(left, top, size, size, cornerR);
      } else {
        ctx.rect(left, top, size, size);
      }
      ctx.fillStyle = obj.color;
      ctx.fill();

      const primaryTargetChar = targetingChars[0];
      const targetColor = primaryTargetChar ? (primaryTargetChar.playerColor || "#ffffff") : "#ffffff";
      ctx.strokeStyle = isWithinPickupRange ? (isTargetGrab ? targetColor : "#ffffff") : "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = isWithinPickupRange ? 2.5 : 2;
      ctx.stroke();

      const inset = Math.max(3, renderRadius * 0.22);
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(left + inset, top + inset, size - inset * 2, size - inset * 2, cornerR * 0.7);
      } else {
        ctx.rect(left + inset, top + inset, size - inset * 2, size - inset * 2);
      }
      ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(left + inset, top + inset);
      ctx.lineTo(left + size - inset, top + size - inset);
      ctx.moveTo(left + size - inset, top + inset);
      ctx.lineTo(left + inset, top + size - inset);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.16)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, renderRadius, 0, Math.PI * 2);
      ctx.fillStyle = obj.color;
      ctx.fill();
      const primaryTargetChar = targetingChars[0];
      const targetColor = primaryTargetChar ? (primaryTargetChar.playerColor || "#ffffff") : "#ffffff";
      ctx.strokeStyle = isWithinPickupRange ? (isTargetGrab ? targetColor : "#ffffff") : "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = isWithinPickupRange ? 2.5 : 2;
      ctx.stroke();
    }

    this.drawRollIndicator(ctx, obj, x, y, renderRadius);
    ctx.restore();

    if (isWithinPickupRange) {
      const grabRadius = realRadius + 2;
      ctx.save();
      ctx.beginPath();
      if (obj.visualShape === "box") {
        const sz = grabRadius * 2;
        const cr = Math.max(3, grabRadius * 0.16);
        if (ctx.roundRect) {
          ctx.roundRect(x - grabRadius, y - grabRadius, sz, sz, cr);
        } else {
          ctx.rect(x - grabRadius, y - grabRadius, sz, sz);
        }
      } else {
        ctx.arc(x, y, grabRadius, 0, Math.PI * 2);
      }
      if (isTargetGrab) {
        const primaryTargetChar = targetingChars[0];
        const themeColor = primaryTargetChar.playerColor || "#38bdf8";
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 2.8;
        ctx.setLineDash([]);
        ctx.stroke();

        ctx.fillStyle = themeColor;
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        const badgeText =
          allCharacters.length > 1 && primaryTargetChar.playerNumber
            ? `P${primaryTargetChar.playerNumber} GRAB`
            : "GRAB";
        ctx.fillText(badgeText, x, y - grabRadius - 6);
      } else {
        const reachColor = (charactersInReach[0]?.playerColor || targetingChars[0]?.playerColor)
          ? `${(charactersInReach[0]?.playerColor || targetingChars[0]?.playerColor)}99`
          : "rgba(56, 189, 248, 0.45)";
        ctx.strokeStyle = reachColor;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (obj.isSleeping && !isWithinPickupRange && !obj.isHeld) {
      ctx.save();
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = "rgba(148, 163, 184, 0.65)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("zzz", x + renderRadius * 0.7, y - renderRadius * 0.7);
      ctx.restore();
    }
  }

  /**
   * Draws a creature character entity with eyes and facing direction.
   */
  public static drawCharacter(
    ctx: CanvasRenderingContext2D,
    char: Character,
    allCharacters: Character[],
    ppu: number,
    arena: Arena,
    viewSettings: ViewSettings,
    effectivePos: { x: number; y: number; z: number },
    getAltitudeScale: (z: number, wallHeight: number) => number,
    isEntityOnLayer2: (entity: GameObject, wallHeight: number) => boolean,
    targetGrabEntities?: GameObject | null | Map<Character, GameObject | null> | Set<GameObject>,
    localHeroCharacter?: Character | null,
    isSplitScreenViewport = false,
    remoteOverrides?: Map<string, { x: number; y: number; z: number; facingAngle?: number; isClimbing?: boolean }>
  ): void {
    const useBigger = viewSettings.verticalVisuals === "bigger" || viewSettings.verticalVisuals === "both";
    const useHover = viewSettings.verticalVisuals === "hover" || viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? viewSettings.visualAltitudeScale : 0;

    const vx = char.visualOffset ? char.visualOffset.x : 0;
    const vy = char.visualOffset ? char.visualOffset.y : 0;
    const { x: posX, y: posY, z: posZ } = effectivePos;
    const x = (posX - vx) * ppu;
    const y = (posY - vy - posZ * hoverScale) * ppu;
    const altitudeScale = useBigger ? getAltitudeScale(posZ, arena.wallHeight) : 1.0;
    const r = char.colliderRadius * ppu * altitudeScale;

    const isOtherClientSim = (c: Character): boolean => {
      if (isSplitScreenViewport) {
        return localHeroCharacter ? c !== localHeroCharacter : false;
      }
      return Boolean(remoteOverrides && remoteOverrides.has(c.playerId));
    };

    const eligibleCharacters = allCharacters.filter((c) => !isOtherClientSim(c));

    const charactersInReach = eligibleCharacters.filter(
      (c) =>
        c !== char &&
        !c.isHeld &&
        c.heldObject !== char &&
        c.pickupModule !== null &&
        c.pickupModule.enabled &&
        !char.isHeld &&
        (c.pickupModule?.isObjectInReach(c, char, arena.wallHeight) ?? false)
    );

    const targetingChars: Character[] = [];
    if (targetGrabEntities instanceof Map) {
      for (const [c, target] of targetGrabEntities.entries()) {
        if (isOtherClientSim(c)) continue;
        if (c !== char && target === char) targetingChars.push(c);
      }
    } else if (targetGrabEntities) {
      if (targetGrabEntities instanceof Set && targetGrabEntities.has(char)) {
        targetingChars.push(...charactersInReach);
      } else if (targetGrabEntities === char) {
        targetingChars.push(...charactersInReach);
      }
    }
    const isTargetGrab = targetingChars.length > 0;
    const isWithinPickupRange = charactersInReach.length > 0 || isTargetGrab;

    const isOnLayer2 = isEntityOnLayer2(char, arena.wallHeight);
    const isHeld = char.isHeld || char.heldBy !== null;
    const isBiggerWithoutHover = useBigger && (!useHover || hoverScale <= 0);
    const shouldBeTransparent = isHeld || (isBiggerWithoutHover && isOnLayer2);

    ctx.save();
    ctx.globalAlpha = shouldBeTransparent ? 0.55 : 1.0;

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = char.color;
    ctx.fill();
    ctx.strokeStyle = isWithinPickupRange && isTargetGrab
      ? (targetingChars[0].playerColor || "#ffffff")
      : "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    this.drawRollIndicator(ctx, char, x, y, r);

    const eyeSpreadAngle = 0.52;
    const eyeDist = r * 0.72;
    const eyeRadius = Math.max(3.5, r * 0.18);

    const eye1Angle = char.facingAngle - eyeSpreadAngle;
    const eye2Angle = char.facingAngle + eyeSpreadAngle;

    const eye1X = x + Math.cos(eye1Angle) * eyeDist;
    const eye1Y = y + Math.sin(eye1Angle) * eyeDist;
    const eye2X = x + Math.cos(eye2Angle) * eyeDist;
    const eye2Y = y + Math.sin(eye2Angle) * eyeDist;

    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(eye1X, eye1Y, eyeRadius, 0, Math.PI * 2);
    ctx.arc(eye2X, eye2Y, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (isWithinPickupRange) {
      const grabRadius = r + 3;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, grabRadius, 0, Math.PI * 2);
      if (isTargetGrab) {
        const primaryTargetChar = targetingChars[0];
        const themeColor = primaryTargetChar.playerColor || "#38bdf8";
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 2.8;
        ctx.setLineDash([]);
        ctx.stroke();

        ctx.fillStyle = themeColor;
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        const badgeText =
          allCharacters.length > 1 && primaryTargetChar.playerNumber
            ? `P${primaryTargetChar.playerNumber} GRAB`
            : "GRAB";
        ctx.fillText(badgeText, x, y + grabRadius + 14);
      } else {
        const reachColor = (charactersInReach[0]?.playerColor || targetingChars[0]?.playerColor)
          ? `${(charactersInReach[0]?.playerColor || targetingChars[0]?.playerColor)}99`
          : "rgba(56, 189, 248, 0.45)";
        ctx.strokeStyle = reachColor;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /**
   * Illustrates 3D roll angular velocity with rotated dash stripes and directional speed indicators.
   */
  public static drawRollIndicator(
    ctx: CanvasRenderingContext2D,
    obj: GameObject,
    x: number,
    y: number,
    renderRadius: number
  ): void {
    if (!obj.rollModule || !obj.rollModule.enabled) return;
    const roll = obj.rollModule;
    const wx = roll.angularVelocity.x;
    const wy = roll.angularVelocity.y;
    const wz = roll.angularVelocity.z;
    const wTotal = Math.hypot(wx, wy, wz);
    if (wTotal < 0.02) return;

    const wh = Math.hypot(wx, wy);
    const isPerfectVertical = wh < 0.05 * wTotal;
    const showArrows = !obj.isHeld && wTotal > 0.02;

    const strokeWidth = 2.5;
    const dashLen = 5;
    const dashGap = 4;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
    ctx.shadowBlur = 3;

    if (isPerfectVertical) {
      const innerRadius = renderRadius * 0.50;
      const outerRadius = renderRadius * 0.88;
      const spinSign = wz !== 0 ? Math.sign(wz) : 1;

      ctx.beginPath();
      ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([]);
      ctx.stroke();

      if (showArrows) {
        this.drawFixedSpeedTriangles(ctx, x, y, outerRadius, outerRadius, 0, spinSign, renderRadius, true);
      }

      ctx.beginPath();
      ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.98)";
      ctx.lineWidth = strokeWidth;
      ctx.setLineDash([dashLen, dashGap]);
      ctx.lineDashOffset = -roll.visualPhase * outerRadius * spinSign;
      ctx.stroke();
    } else {
      const rollDirAngle = Math.atan2(-wx, wy);
      const a = renderRadius * 0.90;
      const fz = Math.abs(wz) / wTotal;
      const b = a * Math.max(0.35, Math.pow(fz, 0.65));

      const vSurfX = wy;
      const vSurfY = -wx;
      const cosR = Math.cos(rollDirAngle);
      const sinR = Math.sin(rollDirAngle);

      const isHalf1Top = cosR < 0;
      const topStart = isHalf1Top ? 0 : Math.PI;
      const topEnd = isHalf1Top ? Math.PI : Math.PI * 2;
      const bottomStart = isHalf1Top ? Math.PI : 0;
      const bottomEnd = isHalf1Top ? Math.PI * 2 : Math.PI;

      const tanX = isHalf1Top ? -a * cosR : a * cosR;
      const tanY = isHalf1Top ? -a * sinR : a * sinR;
      const dotTan = tanX * vSurfX + tanY * vSurfY;

      const spinSign = dotTan >= 0 ? 1 : -1;
      const dashOffset = -spinSign * roll.visualPhase * a;

      if (showArrows) {
        this.drawFixedSpeedTriangles(ctx, x, y, a, b, rollDirAngle, spinSign, renderRadius, false);
      }

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rollDirAngle);

      ctx.beginPath();
      ctx.ellipse(0, 0, a, b, 0, topStart, topEnd);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.98)";
      ctx.lineWidth = strokeWidth;
      ctx.setLineDash([dashLen, dashGap]);
      ctx.lineDashOffset = dashOffset;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(0, 0, a, b, 0, bottomStart, bottomEnd);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([dashLen, dashGap]);
      ctx.lineDashOffset = dashOffset;
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }

  private static drawRoundedTriangle(
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number,
    x2: number, y2: number,
    x3: number, y3: number,
    radius: number
  ): void {
    ctx.beginPath();
    const midX = (x2 + x1) * 0.5;
    const midY = (y2 + y1) * 0.5;
    ctx.moveTo(midX, midY);
    ctx.arcTo(x1, y1, x3, y3, radius);
    ctx.arcTo(x3, y3, x2, y2, radius);
    ctx.arcTo(x2, y2, x1, y1, radius);
    ctx.closePath();
    ctx.fill();
  }

  private static drawFixedSpeedTriangles(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    a: number,
    b: number,
    rollDirAngle: number,
    spinSign: number,
    renderRadius: number,
    isUniformAlpha: boolean = false
  ): void {
    const fixedRate = 2.5;
    const fixedPhase = (performance.now() * 0.001 * fixedRate) % (Math.PI * 2);

    const numTriangles = renderRadius > 24 ? 3 : 2;
    const sliceAngle = (Math.PI * 2) / numTriangles;

    const L = Math.max(14, Math.min(22, renderRadius * 0.58));
    const W = Math.max(7, Math.min(12, renderRadius * 0.32));
    const cornerRadius = 1.2;

    const cosR = Math.cos(rollDirAngle);
    const sinR = Math.sin(rollDirAngle);
    const sSign = spinSign || 1;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
    ctx.shadowBlur = 3;

    for (let k = 0; k < numTriangles; k++) {
      const t = (k * sliceAngle + sSign * fixedPhase) % (Math.PI * 2);

      const lx = a * Math.cos(t);
      const ly = b * Math.sin(t);
      const sx = centerX + lx * cosR - ly * sinR;
      const sy = centerY + lx * sinR + ly * cosR;

      const dlx = -a * Math.sin(t) * sSign;
      const dly = b * Math.cos(t) * sSign;
      const dsx = dlx * cosR - dly * sinR;
      const dsy = dlx * sinR + dly * cosR;
      const speed = Math.hypot(dsx, dsy);
      if (speed < 0.0001) continue;

      const tx = dsx / speed;
      const ty = dsy / speed;
      const nx = -ty;
      const ny = tx;

      const isTopHalf = sy <= centerY;
      const alpha = isUniformAlpha ? 0.90 : (isTopHalf ? 0.90 : 0.32);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;

      const apexX = sx + tx * (L * 0.55);
      const apexY = sy + ty * (L * 0.55);

      const blX = sx - tx * (L * 0.45) + nx * (W * 0.50);
      const blY = sy - ty * (L * 0.45) + ny * (W * 0.50);
      const brX = sx - tx * (L * 0.45) - nx * (W * 0.50);
      const brY = sy - ty * (L * 0.45) - ny * (W * 0.50);

      this.drawRoundedTriangle(ctx, apexX, apexY, blX, blY, brX, brY, cornerRadius);
    }

    ctx.restore();
  }
}
