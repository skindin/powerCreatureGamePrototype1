import { Arena } from "./Arena.js";
import { GameObject } from "./GameObject.js";
import { Character } from "../character/Character.js";
import { TrajectoryCalculation } from "../character/ThrowModule.js";

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public render(arena: Arena, character: Character, objects: GameObject[], _selectedEntity?: GameObject): void {
    const ctx = this.ctx;
    const ppu = ctx.canvas.width / arena.width; // Pixels per unit (e.g. 1000 / 20 = 50 px/u)

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 1. Floor Grid / Surface in Units
    this.drawFloorGrid(arena, ppu);

    // 2. Pure 2D Top-Down Walls
    this.drawWalls(arena, ppu);

    // 3. Entities: Objects at a higher virtual position (z) always render on top of objects at a lower virtual position
    const allRenderables = [character, ...objects];
    allRenderables.sort((a, b) => {
      // Primary: Objects at higher virtual position (height z) ALWAYS render on top
      if (Math.abs(a.position.z - b.position.z) > 0.001) {
        return a.position.z - b.position.z;
      }
      // Secondary: Objects with higher virtual y velocity render on top if at same elevation
      if (Math.abs(a.verticalVelocity - b.verticalVelocity) > 0.001) {
        return a.verticalVelocity - b.verticalVelocity;
      }
      // Tertiary: Higher y (closer to foreground) renders on top
      return a.position.y - b.position.y;
    });

    for (const entity of allRenderables) {
      if (entity instanceof Character) {
        this.drawCharacter(entity, objects, ppu);
      } else {
        this.drawFreebodyObject(entity, allRenderables, character, ppu);
      }
    }

    // 4. Height Indicator Rings (Rendered OVER the objects so expanding circles are visible from the center)
    for (const entity of allRenderables) {
      this.drawObjectShadow(entity, arena, ppu);
    }

    // 5. Trajectory Line (Rendered OVER walls and entities!)
    if (character.activeTrajectory) {
      this.drawTrajectory(character.activeTrajectory, ppu);
    }
  }

  private drawFloorGrid(arena: Arena, ppu: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#0f172a"; // Deep solid floor
    ctx.fillRect(0, 0, arena.width * ppu, arena.height * ppu);

    // Subtle 1-unit grid lines (1 unit = 1 wall block)
    ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 1; x < arena.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * ppu, 0);
      ctx.lineTo(x * ppu, arena.height * ppu);
      ctx.stroke();
    }
    for (let y = 1; y < arena.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * ppu);
      ctx.lineTo(arena.width * ppu, y * ppu);
      ctx.stroke();
    }

    // Arena border
    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, arena.width * ppu - 3, arena.height * ppu - 3);
  }

  /**
   * Pure 2D Top-Down Walls (No fake 3D depth, no text)
   */
  private drawWalls(arena: Arena, ppu: number): void {
    const ctx = this.ctx;
    for (const wall of arena.walls) {
      // Solid flat footprint
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(wall.x * ppu, wall.y * ppu, wall.width * ppu, wall.height * ppu);

      // Clean border
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.strokeRect(wall.x * ppu, wall.y * ppu, wall.width * ppu, wall.height * ppu);
    }
  }

  /**
   * Height Indicator Ring (Ground Shadow): A circle outline that expands as height z increases.
   * At height 0, the circle matches the size of the object collider like it was before.
   * As height z increases, the circle outline expands outward from the object.
   * Changes color (to vibrant blue/cyan) when high enough to go over walls (z > arena.wallHeight).
   */
  private drawObjectShadow(obj: GameObject, arena: Arena, ppu: number): void {
    const ctx = this.ctx;
    const groundX = obj.position.x * ppu;
    const groundY = obj.position.y * ppu;
    const z = obj.position.z;

    // Matches the object size at height 0 and expands as height increases
    const heightExpansion = 1.0 + (z / arena.wallHeight) * 1.5;
    const shadowRadius = obj.colliderRadius * ppu * heightExpansion;

    const alpha = Math.max(0.3, 0.85 - (z / (arena.wallHeight * 7)) * 0.25);

    // High enough to go over walls: change outline color
    const canClearWalls = z > arena.wallHeight;

    ctx.save();
    ctx.beginPath();
    ctx.arc(groundX, groundY, shadowRadius, 0, Math.PI * 2);

    if (canClearWalls) {
      // Blue/cyan outline indicating it will fly cleanly over walls
      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.lineWidth = 2.5;
    } else {
      // Standard white outline displaying height
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 1.8;
    }

    if (z > 0.01) {
      ctx.setLineDash([4, 3]); // Dashed when airborne
    }
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Freebody Object: Pure top-down at (x, y) with fixed physical radius (no scale expansion).
   * Highlights objects within character pickup reach.
   */
  private drawFreebodyObject(obj: GameObject, allEntities: GameObject[], character: Character, ppu: number): void {
    const ctx = this.ctx;
    const x = obj.position.x * ppu;
    const y = obj.position.y * ppu;

    // Fixed physical radius: objects do NOT expand with height
    const renderRadius = obj.colliderRadius * ppu;

    // Check if close enough for character to pick up
    const canPickup = !character.heldObject && character.pickupModule !== null && character.pickupModule.enabled;
    const distToChar = Math.hypot(obj.position.x - character.position.x, obj.position.y - character.position.y);
    const isWithinPickupRange = canPickup && !obj.isHeld && distToChar <= ((character.pickupModule?.pickupReach ?? 1.3) + obj.colliderRadius);

    // Highlight ring around objects in pickup reach
    if (isWithinPickupRange) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, renderRadius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = "#38bdf8"; // Glowing cyan highlight
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();

      // Subtle indicator badge
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("READY", x, y - renderRadius - 6);
      ctx.restore();
    }

    // Check if this object is passing over another entity (higher z or higher virtual y velocity)
    let isPassingOverAnother = false;
    if (obj.isAboveGround) {
      for (const other of allEntities) {
        if (other === obj) continue;
        const groundDist = Math.hypot(obj.position.x - other.position.x, obj.position.y - other.position.y);
        if (groundDist < obj.colliderRadius + other.colliderRadius) {
          if (obj.position.z > other.position.z ||
             (Math.abs(obj.position.z - other.position.z) <= 0.01 && obj.verticalVelocity > other.verticalVelocity)) {
            isPassingOverAnother = true;
            break;
          }
        }
      }
    }

    ctx.save();
    ctx.globalAlpha = isPassingOverAnother ? 0.55 : 1.0;

    // Colored circle body
    ctx.beginPath();
    ctx.arc(x, y, renderRadius, 0, Math.PI * 2);
    ctx.fillStyle = obj.color;
    ctx.fill();
    ctx.strokeStyle = isWithinPickupRange ? "#ffffff" : "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = isWithinPickupRange ? 2.5 : 2;
    ctx.stroke();

    // 3D Roll Illustration: Dotted oval / circle rotating in direction of roll
    this.drawRollIndicator(obj, x, y, renderRadius);

    ctx.restore();
  }

  /**
   * Character: Pure top-down circle with two black circles on facing side
   */
  private drawCharacter(char: Character, allEntities: GameObject[], ppu: number): void {
    const ctx = this.ctx;
    const x = char.position.x * ppu;
    const y = char.position.y * ppu;
    const r = char.colliderRadius * ppu;

    // Check if character is passing over another entity
    let isPassingOverAnother = false;
    if (char.isAboveGround) {
      for (const other of allEntities) {
        if (other === char) continue;
        const groundDist = Math.hypot(char.position.x - other.position.x, char.position.y - other.position.y);
        if (groundDist < char.colliderRadius + other.colliderRadius) {
          if (char.position.z > other.position.z ||
             (Math.abs(char.position.z - other.position.z) <= 0.01 && char.verticalVelocity > other.verticalVelocity)) {
            isPassingOverAnother = true;
            break;
          }
        }
      }
    }

    ctx.save();
    ctx.globalAlpha = isPassingOverAnother ? 0.55 : 1.0;

    // Base colored circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = char.color;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 3D Roll Illustration if roll module is attached to character
    this.drawRollIndicator(char, x, y, r);

    // Two black colored circles on the side it's facing
    const eyeSpreadAngle = 0.52; // ~30 degrees spread
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

    // If holding an object, draw pickup tether / hands
    if (char.heldObject) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(char.heldObject.position.x * ppu, char.heldObject.position.y * ppu);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  /**
   * Illustrates the 3D rolling behavior:
   * - Draws a dotted oval shape animated to rotate in the direction the object is rotating.
   * - Warps depending on angular velocity (elongated ellipse when rolling horizontally, opening into a circle when vertical).
   * - The half of the oval that is virtually higher up is opaque, while the other half is transparent.
   * - If the angular velocity is perfectly vertical, renders as a circle with a circular dotted outline rotating around it.
   */
  private drawRollIndicator(obj: GameObject, x: number, y: number, renderRadius: number): void {
    if (!obj.rollModule || !obj.rollModule.enabled) return;
    const roll = obj.rollModule;
    const wx = roll.angularVelocity.x;
    const wy = roll.angularVelocity.y;
    const wz = roll.angularVelocity.z;
    const wTotal = Math.hypot(wx, wy, wz);
    if (wTotal < 0.02) return; // Stationary

    const ctx = this.ctx;
    const wh = Math.hypot(wx, wy); // Horizontal angular speed
    const isPerfectVertical = wh < 0.05 * wTotal;

    ctx.save();

    if (isPerfectVertical) {
      // Perfectly vertical spin (ωz): circle with a circular outline rotating around it
      const innerRadius = renderRadius * 0.45;
      const outerRadius = renderRadius * 0.78;

      // Central reference circle
      ctx.beginPath();
      ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.stroke();

      // Circular dotted outline rotating around it
      ctx.beginPath();
      ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 2.0;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -roll.visualPhase * outerRadius * Math.sign(wz || 1);
      ctx.stroke();
    } else {
      // General 3D rolling / tilted rotation:
      // The roll motion direction across the screen (linear direction coupled to roll)
      // v_roll = (wy, -wx) -> heading angle = atan2(-wx, wy)
      const rollDirAngle = Math.atan2(-wx, wy);

      // Semi-major axis a (across roll axis) and semi-minor axis b (along roll axis)
      const a = renderRadius * 0.82;
      const fz = Math.abs(wz) / wTotal; // Fraction vertical
      // Warps from flat (b = 0) when purely horizontal up to a full circle (b = a) when vertical
      const b = a * Math.pow(fz, 0.85);

      ctx.translate(x, y);
      ctx.rotate(rollDirAngle);

      const spinSign = wz !== 0 ? Math.sign(wz) : 1;

      if (b < 0.5) {
        // Perfectly flat stripe across the top of the ball when angular velocity is perpendicular to up
        ctx.beginPath();
        ctx.moveTo(-a, 0);
        ctx.lineTo(a, 0);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.lineWidth = 2.2;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -roll.visualPhase * a;
        ctx.stroke();
      } else {
        // The LONG side of the oval across the top of the ball is OPAQUE (visible stripe)
        ctx.beginPath();
        ctx.ellipse(0, 0, a, b, 0, 0, Math.PI);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.lineWidth = 2.2;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -roll.visualPhase * a * spinSign;
        ctx.stroke();

        // The other LONG side (the underside of the ball) is TRANSPARENT
        ctx.beginPath();
        ctx.ellipse(0, 0, a, b, 0, Math.PI, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -roll.visualPhase * a * spinSign;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /**
   * Pure Top-Down Straight Trajectory (No curve, drawn OVER walls)
   */
  private drawTrajectory(traj: TrajectoryCalculation, ppu: number): void {
    const ctx = this.ctx;
    const points = traj.points;
    if (points.length < 2) return;

    ctx.save();

    // Draw straight trajectory line segment by segment in pure top-down (x, y) scaled by ppu
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      ctx.beginPath();
      ctx.moveTo(p1.x * ppu, p1.y * ppu);
      ctx.lineTo(p2.x * ppu, p2.y * ppu);

      // The entire part of the trajectory that could go over a wall is blue (even if not over a wall)
      if (p1.couldClearWall || p2.couldClearWall) {
        // High section capable of clearing standard wall height: vibrant cyan / blue
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 4;
        ctx.setLineDash([6, 3]);
      } else {
        // Normal lower flight section: amber dashed line
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
      }
      ctx.stroke();
    }

    // Impact or Landing Marker
    const finalPt = points[points.length - 1];
    if (traj.isBlockedByWall) {
      // Red Impact X on side wall collision
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      const sz = 8;
      ctx.beginPath();
      ctx.moveTo(finalPt.x * ppu - sz, finalPt.y * ppu - sz);
      ctx.lineTo(finalPt.x * ppu + sz, finalPt.y * ppu + sz);
      ctx.moveTo(finalPt.x * ppu + sz, finalPt.y * ppu - sz);
      ctx.lineTo(finalPt.x * ppu - sz, finalPt.y * ppu + sz);
      ctx.stroke();
    } else if (traj.isLandingOnWallTop) {
      // Vibrant Cyan Landing Target on Wall Top!
      ctx.strokeStyle = "#38bdf8";
      ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(traj.landPoint.x * ppu, traj.landPoint.y * ppu, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(traj.landPoint.x * ppu, traj.landPoint.y * ppu, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#38bdf8";
      ctx.fill();
    } else {
      // Landing target circle on the ground
      ctx.strokeStyle = "#22c55e";
      ctx.fillStyle = "rgba(34, 197, 94, 0.25)";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(traj.landPoint.x * ppu, traj.landPoint.y * ppu, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(traj.landPoint.x * ppu, traj.landPoint.y * ppu, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#22c55e";
      ctx.fill();
    }

    ctx.restore();
  }
}
