import { Arena } from "../Arena.js";
import { Vector2D } from "../GameObject.js";
import { Character } from "../../character/Character.js";
import { TrajectoryCalculation, TrajectoryPoint } from "../../character/ThrowModule.js";
import { ViewSettings } from "../Renderer.js";

/**
 * TrajectoryRenderer
 *
 * Dedicated rendering pass for ballistic throw trajectories, landing footprint previews,
 * wall impact collision markers, auto-lock target brackets, sightlines, and precision aim reticles.
 */
export class TrajectoryRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Trajectory Line:
   * Rendered as a dotted colored line where every fixed 3D distance interval (including vertical distance)
   * renders a dot. Dots get bigger as altitude increases, and become transparent once within Layer 2.
   */
  public drawTrajectory(
    traj: TrajectoryCalculation,
    ppu: number,
    arena: Arena,
    viewSettings: ViewSettings,
    aimTarget?: Vector2D | null,
    character?: Character | null
  ): void {
    const ctx = this.ctx;
    const points = traj.points;
    if (points.length < 2) return;

    ctx.save();

    // Subtle drop shadow so dots stand out clearly on all backgrounds
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 3;

    // Fixed 3D distance interval between dots in world units (~19px at 50ppu)
    const base3DSpacing = 0.38;
    const baseRadius = Math.max(2.2, 0.048 * ppu);
    const layer2Threshold = arena.wallHeight - 0.05;

    const playerHex = character?.playerColor || character?.color || "#ffffff";
    let rgb = { r: 255, g: 255, b: 255 };
    if (playerHex.startsWith("#")) {
      const hex = playerHex.slice(1);
      if (hex.length === 6) {
        rgb = {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
        };
      } else if (hex.length === 3) {
        rgb = {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16),
        };
      }
    }
    const colorOpaque = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.95)`;
    const colorTransparent = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.38)`;
    const colorGhostOpaque = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.42)`;
    const colorGhostTransparent = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.20)`;

    const useHover = viewSettings.verticalVisuals === "hover" || viewSettings.verticalVisuals === "both";
    const useBigger = viewSettings.verticalVisuals === "bigger" || viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? viewSettings.visualAltitudeScale : 0;

    // Helper to draw a dotted arc path
    const drawDottedArc = (arcPoints: TrajectoryPoint[], opColor: string, transColor: string, isGhost: boolean = false) => {
      let lastX = arcPoints[0].x;
      let lastY = arcPoints[0].y;
      let lastRadius = baseRadius;
      let dist3DSinceLast = 0;
      let isFirstDot = true;
      const dotScale = isGhost ? 0.75 : 1.0;

      for (let i = 0; i < arcPoints.length - 1; i++) {
        const p1 = arcPoints[i];
        const p2 = arcPoints[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dz = p2.z - p1.z;
        const segLen = Math.hypot(dx, dy, dz);
        if (segLen <= 0.0001) continue;

        const subSteps = Math.max(1, Math.ceil(segLen / 0.02));
        const subDx = dx / subSteps;
        const subDy = dy / subSteps;
        const subDz = dz / subSteps;
        const subLen = segLen / subSteps;

        for (let s = 1; s <= subSteps; s++) {
          const curX = p1.x + subDx * s;
          const curY = p1.y + subDy * s;
          const curZ = p1.z + subDz * s;

          dist3DSinceLast += subLen;

          const altRatio = Math.max(0, curZ) / Math.max(0.1, arena.wallHeight);
          const radius = (useBigger ? (baseRadius * (1.0 + altRatio * 0.75)) : baseRadius) * dotScale;
          const screenX = curX * ppu;
          const screenY = (curY - curZ * hoverScale) * ppu;

          if (isFirstDot) {
            if (dist3DSinceLast >= base3DSpacing * 0.5) {
              const isLayer2 = curZ >= layer2Threshold;
              ctx.fillStyle = isLayer2 ? transColor : opColor;
              ctx.beginPath();
              ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
              ctx.fill();

              lastX = screenX;
              lastY = screenY;
              lastRadius = radius;
              dist3DSinceLast = 0;
              isFirstDot = false;
            }
            continue;
          }

          const dist2DPx = Math.hypot(screenX - lastX, screenY - lastY);
          const min2DSpacingPx = Math.max(18, lastRadius + radius + 7);

          if (dist3DSinceLast >= base3DSpacing && dist2DPx >= min2DSpacingPx) {
            const landZ = traj.landPoint.z ?? (traj.isLandingOnWallTop ? arena.wallHeight : 0);
            const targetScreenY = (traj.landPoint.y - landZ * hoverScale) * ppu;
            const distToLandPx = Math.hypot(screenX - traj.landPoint.x * ppu, screenY - targetScreenY);
            const landRadiusPx = (traj.colliderRadius ?? 0.35) * ppu;
            if (distToLandPx > landRadiusPx * 0.8) {
              const isLayer2 = curZ >= layer2Threshold;
              ctx.fillStyle = isLayer2 ? transColor : opColor;
              ctx.beginPath();
              ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
              ctx.fill();

              lastX = screenX;
              lastY = screenY;
              lastRadius = radius;
              dist3DSinceLast = 0;
            }
          }
        }
      }
    };

    // Render ghost preview arcs for the flattest and steepest reachable curves only when holding right-click
    const isLockHeld = Boolean(traj.lockedTargetPos);
    let isSnapped = false;
    if (isLockHeld) {
      if (traj.flattestPoints && traj.flattestPoints.length >= 2) {
        drawDottedArc(traj.flattestPoints, colorGhostOpaque, colorGhostTransparent, true);
      }
      if (traj.steepestPoints && traj.steepestPoints.length >= 2) {
        drawDottedArc(traj.steepestPoints, colorGhostOpaque, colorGhostTransparent, true);
      }

      // Trajectory Modulation Guide & Controls (when holding right-click):
      // 1. Dotted line from peak of highest trajectory to peak of lowest trajectory
      // 2. Snap circle at lowest (most efficient) trajectory peak
      // 3. Game cursor tracking along/around the line with snap feedback & projection pip
      const findPeak = (pts: TrajectoryPoint[] | undefined) => {
        if (!pts || pts.length === 0) return null;
        let highest = pts[0];
        for (let i = 1; i < pts.length; i++) {
          if (pts[i].z > highest.z) highest = pts[i];
        }
        return highest;
      };

      const peakLow = findPeak(traj.flattestPoints) || findPeak(traj.points);
      const peakHigh = findPeak(traj.steepestPoints) || findPeak(traj.points);

      if (peakLow && peakHigh) {
        const lowScreenX = peakLow.x * ppu;
        const lowScreenY = (peakLow.y - peakLow.z * hoverScale) * ppu;
        const highScreenX = peakHigh.x * ppu;
        const highScreenY = (peakHigh.y - peakHigh.z * hoverScale) * ppu;

        const lineDx = highScreenX - lowScreenX;
        const lineDy = highScreenY - lowScreenY;
        const lineLen = Math.hypot(lineDx, lineDy);

        const snapRadius = Math.max(16, Math.min(26, lineLen * 0.28));

        const cursorScreenX = aimTarget ? aimTarget.x * ppu : lowScreenX;
        const cursorScreenY = aimTarget ? aimTarget.y * ppu : lowScreenY;
        const distToLow = Math.hypot(cursorScreenX - lowScreenX, cursorScreenY - lowScreenY);
        isSnapped = distToLow <= snapRadius;

        ctx.save();

        // 1. Dotted line from highest peak to lowest peak
        ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(highScreenX, highScreenY);
        ctx.lineTo(lowScreenX, lowScreenY);
        ctx.stroke();

        // Highest peak marker: subtle end-cap tick
        ctx.setLineDash([]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        ctx.lineWidth = 1.6;
        const cap = 4;
        ctx.beginPath();
        ctx.moveTo(highScreenX - cap, highScreenY);
        ctx.lineTo(highScreenX + cap, highScreenY);
        ctx.moveTo(highScreenX, highScreenY - cap);
        ctx.lineTo(highScreenX, highScreenY + cap);
        ctx.stroke();

        // 2. Snap circle along the line at the lowest (most efficient) trajectory peak
        ctx.beginPath();
        ctx.arc(lowScreenX, lowScreenY, snapRadius, 0, Math.PI * 2);
        if (isSnapped) {
          ctx.fillStyle = "rgba(34, 197, 94, 0.3)";
          ctx.fill();
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 2.4;
          ctx.shadowColor = "#22c55e";
          ctx.shadowBlur = 8;
          ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(34, 197, 94, 0.08)";
          ctx.fill();
          ctx.strokeStyle = "rgba(34, 197, 94, 0.65)";
          ctx.lineWidth = 1.6;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // Center pip of snap circle
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(lowScreenX, lowScreenY, isSnapped ? 3.0 : 2.0, 0, Math.PI * 2);
        ctx.fillStyle = isSnapped ? "#22c55e" : "rgba(34, 197, 94, 0.85)";
        ctx.fill();

        // 3. If game cursor is outside snap circle, draw projection connector and slider pip on the guide line
        if (!isSnapped && lineLen > 2) {
          const uX = lineDx / lineLen;
          const uY = lineDy / lineLen;
          const projDist = (cursorScreenX - lowScreenX) * uX + (cursorScreenY - lowScreenY) * uY;
          const clampedProj = Math.max(0, Math.min(lineLen, projDist));
          const projX = lowScreenX + clampedProj * uX;
          const projY = lowScreenY + clampedProj * uY;

          // Guideline connector to projected point on the line
          const distToProj = Math.hypot(cursorScreenX - projX, cursorScreenY - projY);
          if (distToProj > 3) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
            ctx.lineWidth = 1.2;
            ctx.setLineDash([2, 3]);
            ctx.beginPath();
            ctx.moveTo(cursorScreenX, cursorScreenY);
            ctx.lineTo(projX, projY);
            ctx.stroke();
          }

          // Slider pip on the dotted line at projected position
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(projX, projY, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
          ctx.shadowBlur = 3;
          ctx.fill();
        }

        ctx.restore();
      }
    }

    // Render active trajectory arc
    drawDottedArc(points, colorOpaque, colorTransparent, false);

    // STRAIGHT DOTTED SIGHTLINE from held object release position to target land position:
    // Truncated at the end of the arc (landPoint) rather than following unbounded mouse cursor.
    // Dots share the exact same sizing and layer transparency as the corresponding points along the arc.
    if (traj.launchPos && traj.landPoint) {
      const startX = traj.launchPos.x;
      const startY = traj.launchPos.y;
      const startZ = traj.launchPos.z;
      const endX = traj.landPoint.x;
      const endY = traj.landPoint.y;
      const endZ = traj.landPoint.z ?? (traj.targetSurfaceHeight ?? 0);

      const lineDx = endX - startX;
      const lineDy = endY - startY;
      const lineDz = endZ - startZ;
      const lineDist3D = Math.hypot(lineDx, lineDy, lineDz);

      if (lineDist3D > 0.3) {
        const straightDotSpacing = base3DSpacing * 1.05;
        const totalStraightDots = Math.floor(lineDist3D / straightDotSpacing);

        for (let d = 1; d <= totalStraightDots; d++) {
          const frac = d / (totalStraightDots + 1);
          const ptX = startX + lineDx * frac;
          const ptY = startY + lineDy * frac;
          const ptZ = startZ + lineDz * frac;

          const ptScreenX = ptX * ppu;
          const ptScreenY = (ptY - ptZ * hoverScale) * ppu;

          // Sample corresponding arc flight altitude at this fraction
          const flightT = frac * (traj.flightTime ?? 1.0);
          const arcZ = traj.launchVel
            ? Math.max(0, traj.launchPos.z + traj.launchVel.vz * flightT - 0.5 * arena.gravity * flightT * flightT)
            : ptZ;

          // Transparent where the arc is above Layer 1, opaque where within Layer 1
          const isLayer2 = arcZ >= layer2Threshold;
          ctx.fillStyle = isLayer2 ? colorTransparent : colorOpaque;

          // Same dot sizing equation as the arc dots
          const altRatio = Math.max(0, arcZ) / Math.max(0.1, arena.wallHeight);
          const straightRadius = useBigger ? (baseRadius * (1.0 + altRatio * 0.75)) : baseRadius;

          ctx.beginPath();
          ctx.arc(ptScreenX, ptScreenY, straightRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.shadowBlur = 0;

    // Impact or Landing Marker:
    // Matches the exact collider footprint size of the held object so the player can visualize if it will fit!
    const finalPt = points[points.length - 1];
    const targetRadius = (traj.colliderRadius ?? 0.35) * ppu;

    const drawColliderFootprint = (x: number, y: number) => {
      ctx.beginPath();
      if (traj.visualShape === "box") {
        const sz = targetRadius * 2;
        const cr = Math.max(3, targetRadius * 0.16);
        if (ctx.roundRect) {
          ctx.roundRect(x - targetRadius, y - targetRadius, sz, sz, cr);
        } else {
          ctx.rect(x - targetRadius, y - targetRadius, sz, sz);
        }
      } else {
        ctx.arc(x, y, targetRadius, 0, Math.PI * 2);
      }
    };

    let finalHitX = traj.landPoint.x * ppu;
    let finalGroundY = traj.landPoint.y * ppu;

    if (traj.isBlockedByWall) {
      // Wall Collision: Show exact collider footprint at collision point in dashed red, with a central red X
      const impX = finalPt.x * ppu;
      const impY = (finalPt.y - finalPt.z * hoverScale) * ppu;
      const groundImpY = finalPt.y * ppu;
      finalHitX = impX;
      finalGroundY = groundImpY;

      // If elevated hit above ground, draw vertical altitude connector line from ground up to hit
      if (hoverScale > 0 && finalPt.z > 0.05) {
        ctx.save();
        ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(impX, groundImpY);
        ctx.lineTo(impX, impY);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.strokeStyle = "#ef4444";
      ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
      ctx.lineWidth = 2.2;
      ctx.setLineDash([4, 3]);
      drawColliderFootprint(impX, impY);
      ctx.fill();
      ctx.stroke();

      // Red Impact X at center
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      const sz = Math.min(8, targetRadius * 0.55);
      ctx.beginPath();
      ctx.moveTo(impX - sz, impY - sz);
      ctx.lineTo(impX + sz, impY + sz);
      ctx.moveTo(impX + sz, impY - sz);
      ctx.lineTo(impX - sz, impY + sz);
      ctx.stroke();
      ctx.restore();
    } else if (traj.isLandingOnWallTop) {
      // Landing Target on Wall Top (Layer 2: semi-transparent, exact collider footprint size)
      const landX = traj.landPoint.x * ppu;
      const landZ = traj.landPoint.z ?? arena.wallHeight;
      const landY = (traj.landPoint.y - landZ * hoverScale) * ppu;
      const groundLandY = traj.landPoint.y * ppu;
      finalHitX = landX;
      finalGroundY = landY;

      // Vertical altitude connector from ground up to elevated wall top
      if (hoverScale > 0) {
        ctx.save();
        ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(landX, groundLandY);
        ctx.lineTo(landX, landY);
        ctx.stroke();
        ctx.restore();
      }

      // 1. Mask footprint fill to top of wall squares (unless landing on an airborne entity or outside walls)
      if (traj.targetObject || landZ > arena.wallHeight + 0.05 || (!arena.walls.some((w) => traj.landPoint.x >= w.x && traj.landPoint.x <= w.x + w.width && traj.landPoint.y >= w.y && traj.landPoint.y <= w.y + w.height))) {
        ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
        ctx.beginPath();
        drawColliderFootprint(landX, landY);
        ctx.fill();
      } else {
        ctx.save();
        ctx.beginPath();
        for (const wall of arena.walls) {
          const baseX = wall.x * ppu;
          const topY = (wall.y - wall.wallHeight * hoverScale) * ppu;
          ctx.rect(baseX, topY, wall.width * ppu, wall.height * ppu);
        }
        ctx.clip();

        ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
        ctx.beginPath();
        drawColliderFootprint(landX, landY);
        ctx.fill();
        ctx.restore(); // restores clip
      }

      // 2. Unmasked outline and central pinpoint
      ctx.save();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
      ctx.lineWidth = 2.2;
      ctx.setLineDash([]);
      ctx.beginPath();
      drawColliderFootprint(landX, landY);
      ctx.stroke();

      // Central pinpoint dot
      ctx.beginPath();
      ctx.arc(landX, landY, Math.min(4, targetRadius * 0.22), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(56, 189, 248, 0.95)";
      ctx.fill();
      ctx.restore();
    } else {
      // Landing Target on Ground (Layer 1: exact collider footprint size)
      const landX = traj.landPoint.x * ppu;
      const landY = traj.landPoint.y * ppu;
      finalHitX = landX;
      finalGroundY = landY;

      ctx.save();
      ctx.strokeStyle = "#22c55e";
      ctx.fillStyle = "rgba(34, 197, 94, 0.25)";
      ctx.lineWidth = 2.2;
      ctx.setLineDash([]);
      drawColliderFootprint(landX, landY);
      ctx.fill();
      ctx.stroke();

      // Central pinpoint dot
      ctx.beginPath();
      ctx.arc(landX, landY, Math.min(4, targetRadius * 0.22), 0, Math.PI * 2);
      ctx.fillStyle = "#22c55e";
      ctx.fill();
      ctx.restore();
    }

    // Aim Cursor & Target Reticle:
    // ALWAYS render a target reticle exactly where the player's cursor is on the screen!
    if (aimTarget) {
      const cursorX = aimTarget.x * ppu;
      const cursorY = aimTarget.y * ppu;

      const isLocked = Boolean(traj.lockedTargetPos);



      // If cursor is beyond the clamped throw distance, draw a subtle dashed sightline from landing target to cursor
      const distToCursor = Math.hypot(cursorX - finalHitX, cursorY - finalGroundY) / ppu;
      const isCursorAtChar = character ? (Math.hypot(cursorX - character.position.x * ppu, cursorY - (character.position.y - (character.position.z >= arena.wallHeight - 0.05 ? arena.wallHeight * (arena.visualAltitudeScale ?? 0.5) : 0)) * ppu) / ppu < 0.6) : false;
      if (distToCursor > 0.25 && !isLocked && !isCursorAtChar) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(finalHitX, finalGroundY);
        ctx.lineTo(cursorX, cursorY);
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.45)`;
        ctx.lineWidth = 1.4;
        ctx.setLineDash([3, 4]);
        ctx.stroke();
        ctx.restore();
      }

      // ALWAYS draw the player's aim reticle at the exact cursor position!
      const reticleColor = (isLocked && isSnapped) ? "#22c55e" : playerHex;
      this.drawAimReticle(cursorX, cursorY, reticleColor, isLocked);
    }

    ctx.restore();
  }

  /**
   * Draws a precision aim reticle / crosshair at the cursor position
   */
  public drawAimReticle(screenX: number, screenY: number, color = "#ffffff", isLocked = false): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 4;

    // Reticle circle
    const reticleRadius = isLocked ? 10 : 8;
    ctx.beginPath();
    ctx.arc(screenX, screenY, reticleRadius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = isLocked ? 2.4 : 1.8;
    ctx.stroke();

    // 4 Crosshair ticks extending outward
    const tickInner = reticleRadius + 2;
    const tickOuter = tickInner + (isLocked ? 6 : 5);
    ctx.beginPath();
    // Top
    ctx.moveTo(screenX, screenY - tickInner);
    ctx.lineTo(screenX, screenY - tickOuter);
    // Bottom
    ctx.moveTo(screenX, screenY + tickInner);
    ctx.lineTo(screenX, screenY + tickOuter);
    // Left
    ctx.moveTo(screenX - tickInner, screenY);
    ctx.lineTo(screenX - tickOuter, screenY);
    // Right
    ctx.moveTo(screenX + tickInner, screenY);
    ctx.lineTo(screenX + tickOuter, screenY);
    ctx.strokeStyle = color;
    ctx.lineWidth = isLocked ? 2.4 : 1.8;
    ctx.stroke();

    // Corner lock brackets if auto-locked
    if (isLocked) {
      const bsz = 14;
      const blen = 5;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      // Top-Left
      ctx.moveTo(screenX - bsz + blen, screenY - bsz);
      ctx.lineTo(screenX - bsz, screenY - bsz);
      ctx.lineTo(screenX - bsz, screenY - bsz + blen);
      // Top-Right
      ctx.moveTo(screenX + bsz - blen, screenY - bsz);
      ctx.lineTo(screenX + bsz, screenY - bsz);
      ctx.lineTo(screenX + bsz, screenY - bsz + blen);
      // Bottom-Left
      ctx.moveTo(screenX - bsz + blen, screenY + bsz);
      ctx.lineTo(screenX - bsz, screenY + bsz);
      ctx.lineTo(screenX - bsz, screenY + bsz - blen);
      // Bottom-Right
      ctx.moveTo(screenX + bsz - blen, screenY + bsz);
      ctx.lineTo(screenX + bsz, screenY + bsz);
      ctx.lineTo(screenX + bsz, screenY + bsz - blen);
      ctx.stroke();
    }

    // Center pinpoint dot
    ctx.beginPath();
    ctx.arc(screenX, screenY, isLocked ? 2.5 : 2.0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.restore();
  }
}
