import { Arena } from "./Arena.js";
import { GameObject } from "./GameObject.js";
import { Character } from "../character/Character.js";
import { TrajectoryCalculation } from "../character/ThrowModule.js";

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public render(
    arena: Arena,
    character: Character,
    objects: GameObject[],
    selectedEntity?: GameObject | null,
    isEditMode = false,
    hoverEntity?: GameObject | null,
    targetGrabEntity?: GameObject | null,
    isWallEditor = false,
    hoverWallTile?: { col: number; row: number } | null
  ): void {
    const ctx = this.ctx;
    const ppu = ctx.canvas.width / arena.width; // Pixels per unit (e.g. 1000 / 20 = 50 px/u)

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 1. Floor Grid / Surface in Units
    this.drawFloorGrid(arena, ppu);

    // 2. Pure 2D Top-Down Walls
    this.drawWalls(arena, ppu);

    // 2b. Wall Tile Preview (When in Wall Editor sub-mode)
    if (isWallEditor && hoverWallTile) {
      this.drawWallEditorHover(arena, hoverWallTile, ppu);
    }

    // 3. Entities: Objects at a higher virtual position (z) always render on top of objects at a lower virtual position,
    // except objects held by a character, which render BELOW the character holding them.
    const allRenderables = [character, ...objects];
    allRenderables.sort((a, b) => {
      // Objects held by a character render BELOW that character
      if ((a.isHeld && a.heldBy === b) || (character.heldObject === a && b === character)) {
        return -1;
      }
      if ((b.isHeld && b.heldBy === a) || (character.heldObject === b && a === character)) {
        return 1;
      }

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
        this.drawCharacter(entity, ppu, arena);
      } else {
        this.drawFreebodyObject(entity, character, ppu, entity === targetGrabEntity, arena);
      }
      // Outline stays the same size as the collider and renders OVER the sprite
      this.drawObjectShadow(entity, arena, ppu);
    }

    // 5. Trajectory Line (Rendered OVER walls and entities!)
    if (character.activeTrajectory) {
      this.drawTrajectory(character.activeTrajectory, ppu, arena);
    }

    // 6. Selection & Hover Gizmos (Only active and visible during Edit Mode)
    if (isEditMode) {
      if (hoverEntity && hoverEntity !== selectedEntity) {
        this.drawHoverGizmo(hoverEntity, ppu);
      }
      if (selectedEntity) {
        this.drawSelectionGizmo(selectedEntity, isEditMode, ppu);
      }
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
   * Wall Editor Grid Cell Hover Indicator:
   * Displays a cyan "+ Draw" preview on empty floor tiles or a red "✕ Erase" preview on existing wall tiles.
   */
  private drawWallEditorHover(arena: Arena, tile: { col: number; row: number }, ppu: number): void {
    if (tile.col < 0 || tile.col >= arena.cols || tile.row < 0 || tile.row >= arena.rows) return;
    const ctx = this.ctx;
    const x = tile.col * arena.tileSize * ppu;
    const y = tile.row * arena.tileSize * ppu;
    const size = arena.tileSize * ppu;
    const hasWall = arena.hasWall(tile.col, tile.row);

    ctx.save();
    if (hasWall) {
      // Erase Preview (Red)
      ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.fillRect(x, y, size, size);
      ctx.strokeRect(x, y, size, size);

      // Icon / Label
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillStyle = "#fca5a5";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("✕ Erase", x + size / 2, y + size / 2);
    } else {
      // Draw Preview (Cyan)
      ctx.fillStyle = "rgba(56, 189, 248, 0.3)";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.5;
      ctx.fillRect(x, y, size, size);
      ctx.strokeRect(x, y, size, size);

      // Icon / Label
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillStyle = "#7dd3fc";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+ Draw", x + size / 2, y + size / 2);
    }
    ctx.restore();
  }

  /**
   * Altitude visual scaling:
   * As height z increases, the object sprite scales up (getting bigger with altitude),
   * while the physical outline stays fixed at the collider size (showing exact collider footprint).
   */
  public static getAltitudeScale(z: number, wallHeight: number): number {
    return 1.0 + (Math.max(0, z) / Math.max(0.1, wallHeight)) * 0.5;
  }

  /**
   * Checks if an entity is on Layer 2 (elevated at or above wall height, standing on a wall, or above walls).
   */
  public static isEntityOnLayer2(entity: GameObject, wallHeight: number): boolean {
    const threshold = wallHeight - 0.05;
    return (
      entity.position.z >= threshold ||
      entity.supportingSurfaceHeight >= threshold ||
      entity.standingWall !== null ||
      entity.isAboveWalls
    );
  }

  /**
   * Height Indicator Ring (Ground Shadow / Collider Footprint Outline):
   * - Plain simple dotted line matching the shape of the object at ground level (fixed at colliderRadius).
   * - If the object is higher than wall height, also draws another transparent dotted outline
   *   the size the object would be if it was exactly at wall height.
   * Only rendered when elevated above ground (z > 0.01) so true footprints are visible.
   */
  private drawObjectShadow(obj: GameObject, arena: Arena, ppu: number): void {
    const z = obj.position.z;
    if (z <= 0.01) return;

    const ctx = this.ctx;
    const groundX = obj.position.x * ppu;
    const groundY = obj.position.y * ppu;

    // 1. Plain simple dotted line of the shape of the object at ground level (does NOT expand with altitude)
    const shadowRadius = obj.colliderRadius * ppu;

    ctx.save();
    ctx.beginPath();
    if (obj.visualShape === "box") {
      const sz = shadowRadius * 2;
      const cr = Math.max(3, shadowRadius * 0.16);
      if (ctx.roundRect) {
        ctx.roundRect(groundX - shadowRadius, groundY - shadowRadius, sz, sz, cr);
      } else {
        ctx.rect(groundX - shadowRadius, groundY - shadowRadius, sz, sz);
      }
    } else {
      ctx.arc(groundX, groundY, shadowRadius, 0, Math.PI * 2);
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.stroke();

    // 2. If higher than wall height, draw another transparent dotted outline
    // the size the object would be if it was exactly at wall height
    if (z > arena.wallHeight + 0.01) {
      const wallAltScale = Renderer.getAltitudeScale(arena.wallHeight, arena.wallHeight);
      const wallRadius = obj.colliderRadius * ppu * wallAltScale;

      ctx.beginPath();
      if (obj.visualShape === "box") {
        const sz = wallRadius * 2;
        const cr = Math.max(3, wallRadius * 0.16);
        if (ctx.roundRect) {
          ctx.roundRect(groundX - wallRadius, groundY - wallRadius, sz, sz, cr);
        } else {
          ctx.rect(groundX - wallRadius, groundY - wallRadius, sz, sz);
        }
      } else {
        ctx.arc(groundX, groundY, wallRadius, 0, Math.PI * 2);
      }

      ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Freebody Object: Pure top-down at (x, y) with fixed physical radius (no scale expansion).
   * Supports both box and circle visual shapes (both using circle colliders).
   * Highlights objects within character pickup reach.
   */
  private drawFreebodyObject(
    obj: GameObject,
    character: Character,
    ppu: number,
    isTargetGrab = false,
    arena: Arena
  ): void {
    const ctx = this.ctx;
    const x = obj.position.x * ppu;
    const y = obj.position.y * ppu;
    const altitudeScale = Renderer.getAltitudeScale(obj.position.z, arena.wallHeight);
    const visualRadius = obj.hasCollider ? obj.colliderRadius : (obj.colliderModule?.radius ?? 0.32);
    const realRadius = visualRadius * ppu;
    const renderRadius = realRadius * altitudeScale;

    // Check if close enough for character to pick up, strictly respecting layer-dependent reach
    const canPickup = !character.heldObject && character.pickupModule !== null && character.pickupModule.enabled;
    const isWithinPickupRange = canPickup && !obj.isHeld && (character.pickupModule?.isObjectInReach(character, obj, arena.wallHeight) ?? false);

    // Everything on Layer 2 renders transparent regardless of whether anything is underneath it
    const isOnLayer2 = Renderer.isEntityOnLayer2(obj, arena.wallHeight);

    ctx.save();
    ctx.globalAlpha = isOnLayer2 ? 0.55 : 1.0;

    if (obj.visualShape === "box") {
      // 2D Box / Crate visualization (with circular collider of radius renderRadius)
      const size = renderRadius * 2;
      const cornerR = Math.max(3, renderRadius * 0.16);
      const left = x - renderRadius;
      const top = y - renderRadius;

      // Base colored box
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(left, top, size, size, cornerR);
      } else {
        ctx.rect(left, top, size, size);
      }
      ctx.fillStyle = obj.color;
      ctx.fill();

      // Outer border
      ctx.strokeStyle = isWithinPickupRange ? "#ffffff" : "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = isWithinPickupRange ? 2.5 : 2;
      ctx.stroke();

      // Inner crate inset details (slats / beveled border)
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

      // Subtle crate cross
      ctx.beginPath();
      ctx.moveTo(left + inset, top + inset);
      ctx.lineTo(left + size - inset, top + size - inset);
      ctx.moveTo(left + size - inset, top + inset);
      ctx.lineTo(left + inset, top + size - inset);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.16)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    } else {
      // Colored circle body
      ctx.beginPath();
      ctx.arc(x, y, renderRadius, 0, Math.PI * 2);
      ctx.fillStyle = obj.color;
      ctx.fill();
      ctx.strokeStyle = isWithinPickupRange ? "#ffffff" : "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = isWithinPickupRange ? 2.5 : 2;
      ctx.stroke();
    }

    // 3D Roll Illustration: Dotted oval / circle rotating in direction of roll if roll module attached
    this.drawRollIndicator(obj, x, y, renderRadius);

    ctx.restore();

    // Highlight ring around objects in pickup reach (matches real physical size of the object, not inflated elevation size)
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
        // Active mouse target: solid vibrant glowing cyan ring & prominent badge
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.8;
        ctx.setLineDash([]);
        ctx.stroke();

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GRAB", x, y - grabRadius - 6);
      } else {
        // In physical reach, but another object is closer to mouse: subtle dashed ring
        ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /**
   * Character: Pure top-down circle with two black circles on facing side
   */
  private drawCharacter(char: Character, ppu: number, arena: Arena): void {
    const ctx = this.ctx;
    const x = char.position.x * ppu;
    const y = char.position.y * ppu;
    const altitudeScale = Renderer.getAltitudeScale(char.position.z, arena.wallHeight);
    const r = char.colliderRadius * ppu * altitudeScale;

    // Everything on Layer 2 renders transparent regardless of whether anything is underneath it
    const isOnLayer2 = Renderer.isEntityOnLayer2(char, arena.wallHeight);

    ctx.save();
    ctx.globalAlpha = isOnLayer2 ? 0.55 : 1.0;

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

    // Stroke thickness remains fixed and does not get thicker as altitude increases
    const strokeWidth = 2.5;
    const dashLen = 5;
    const dashGap = 4;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
    ctx.shadowBlur = 3;

    if (isPerfectVertical) {
      // Perfectly vertical spin (ωz): circle with a circular outline rotating around it
      const innerRadius = renderRadius * 0.50;
      const outerRadius = renderRadius * 0.88;
      const spinSign = wz !== 0 ? Math.sign(wz) : 1;

      // Central reference circle
      ctx.beginPath();
      ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([]);
      ctx.stroke();

      // 1. Upward facing rounded, skewed triangles from player's perspective (underneath dotted line)
      this.drawFixedSpeedTriangles(ctx, x, y, outerRadius, outerRadius, 0, spinSign, renderRadius, true);

      // 2. Circular dotted outline rotating around it at physical speed
      ctx.beginPath();
      ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.98)";
      ctx.lineWidth = strokeWidth;
      ctx.setLineDash([dashLen, dashGap]);
      ctx.lineDashOffset = -roll.visualPhase * outerRadius * spinSign;
      ctx.stroke();
    } else {
      // General 3D rolling / tilted rotation:
      const rollDirAngle = Math.atan2(-wx, wy);

      // Semi-major axis a (across roll axis) and semi-minor axis b (along roll axis)
      // Generously scaled up across the sphere (90% of radius)
      const a = renderRadius * 0.90;
      const fz = Math.abs(wz) / wTotal; // Fraction vertical
      // Generous 3D oval opening (at least 35% opening even when rolling horizontally, opening to full circle)
      const b = a * Math.max(0.35, Math.pow(fz, 0.65));
      const spinSign = wz !== 0 ? Math.sign(wz) : 1;

      // 1. Upward facing rounded, skewed triangles from player's perspective (underneath dotted line)
      this.drawFixedSpeedTriangles(ctx, x, y, a, b, rollDirAngle, spinSign, renderRadius, false);

      // 2. Classic animated dotted roll oval (rotating at physical roll speed)
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rollDirAngle);

      // The LONG side of the oval across the top of the ball is OPAQUE (visible stripe)
      ctx.beginPath();
      ctx.ellipse(0, 0, a, b, 0, 0, Math.PI);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.98)";
      ctx.lineWidth = strokeWidth;
      ctx.setLineDash([dashLen, dashGap]);
      ctx.lineDashOffset = -roll.visualPhase * a * spinSign;
      ctx.stroke();

      // The other LONG side (the underside of the ball) is SEMI-TRANSPARENT
      ctx.beginPath();
      ctx.ellipse(0, 0, a, b, 0, Math.PI, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([dashLen, dashGap]);
      ctx.lineDashOffset = -roll.visualPhase * a * spinSign;
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Draws a filled triangle with rounded corners.
   */
  private drawRoundedTriangle(
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number, // Apex
    x2: number, y2: number, // Base Left
    x3: number, y3: number, // Base Right
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

  /**
   * Draws upward facing rounded, skewed triangles rotating at a fixed speed in the direction of the object,
   * rendered in 2D from the player's perspective underneath the animated dotted line.
   */
  private drawFixedSpeedTriangles(
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
    // Fixed comfortable rotation speed: ~2.5 rad/s (~0.4 rev/sec)
    const fixedRate = 2.5;
    const fixedPhase = (performance.now() * 0.001 * fixedRate) % (Math.PI * 2);

    const numTriangles = renderRadius > 24 ? 3 : 2;
    const sliceAngle = (Math.PI * 2) / numTriangles;

    // Prominent, clearly visible 2D triangle dimensions from the user's perspective
    const H = Math.max(14, Math.min(22, renderRadius * 0.58));
    const W = Math.max(11, Math.min(18, renderRadius * 0.46));
    const cornerRadius = 1.4; // Sleek, clean corner rounding that preserves crisp triangle shape

    const cosR = Math.cos(rollDirAngle);
    const sinR = Math.sin(rollDirAngle);

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
    ctx.shadowBlur = 3;

    for (let k = 0; k < numTriangles; k++) {
      const t = (k * sliceAngle + spinSign * fixedPhase) % (Math.PI * 2);

      // Current position along the oval in screen space
      const lx1 = a * Math.cos(t);
      const ly1 = b * Math.sin(t);
      const sx1 = centerX + lx1 * cosR - ly1 * sinR;
      const sy1 = centerY + lx1 * sinR + ly1 * cosR;

      // Position a moment ahead along the orbit to determine horizontal motion on screen
      const dt = 0.05 * (spinSign || 1);
      const lx2 = a * Math.cos(t + dt);
      const ly2 = b * Math.sin(t + dt);
      const sx2 = centerX + lx2 * cosR - ly2 * sinR;

      const dX = sx2 - sx1;
      const skewSign = Math.abs(dX) > 0.001 ? Math.sign(dX) : (spinSign || 1);
      const skewX = skewSign * (W * 0.32);

      // On 3D oval: upper hemisphere is opaque, underside is semi-transparent
      const isTopHalf = Math.sin(t) >= 0;
      const alpha = isUniformAlpha ? 0.90 : (isTopHalf ? 0.90 : 0.32);

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;

      // 2D Upward Facing Triangle from player's perspective:
      // Apex points straight up (-Y on screen), skewed horizontally in motion direction
      const apexX = sx1 + skewX;
      const apexY = sy1 - H * 0.55;
      const blX = sx1 - W * 0.5;
      const blY = sy1 + H * 0.45;
      const brX = sx1 + W * 0.5;
      const brY = sy1 + H * 0.45;

      this.drawRoundedTriangle(ctx, apexX, apexY, blX, blY, brX, brY, cornerRadius);
    }

    ctx.restore();
  }

  /**
   * Trajectory Line:
   * Rendered as a dotted white line where every fixed 3D distance interval (including vertical distance)
   * renders a white dot. Dots get bigger as altitude increases, and become transparent once within Layer 2.
   */
  private drawTrajectory(traj: TrajectoryCalculation, ppu: number, arena: Arena): void {
    const ctx = this.ctx;
    const points = traj.points;
    if (points.length < 2) return;

    ctx.save();

    // Subtle drop shadow so white dots stand out clearly on all backgrounds
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 3;

    // Fixed 3D distance interval between dots in world units (~19px at 50ppu)
    const base3DSpacing = 0.38;
    const baseRadius = Math.max(2.2, 0.048 * ppu);
    const layer2Threshold = arena.wallHeight - 0.05;

    let lastX = points[0].x;
    let lastY = points[0].y;
    let lastRadius = baseRadius;
    let dist3DSinceLast = 0;
    let isFirstDot = true;

    // Step through piecewise 3D linear segments and sample dots with 2D overlap prevention
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      const segLen = Math.hypot(dx, dy, dz);
      if (segLen <= 0.0001) continue;

      // Sub-sample each segment finely so we can accurately position dots
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
        const radius = baseRadius * (1.0 + altRatio * 0.75);

        if (isFirstDot) {
          if (dist3DSinceLast >= base3DSpacing * 0.5) {
            const isLayer2 = curZ >= layer2Threshold;
            ctx.fillStyle = isLayer2 ? "rgba(255, 255, 255, 0.38)" : "rgba(255, 255, 255, 0.95)";
            ctx.beginPath();
            ctx.arc(curX * ppu, curY * ppu, radius, 0, Math.PI * 2);
            ctx.fill();

            lastX = curX;
            lastY = curY;
            lastRadius = radius;
            dist3DSinceLast = 0;
            isFirstDot = false;
          }
          continue;
        }

        // 2D distance on screen in pixels from the previous placed dot
        const dist2DPx = Math.hypot(curX - lastX, curY - lastY) * ppu;

        // When dots get close to each other in 2D (due to steep vertical arc),
        // decrease how often dots are placed so dots never bunch up or overlap!
        // At minimum, ensure a visible gap between dot perimeters:
        const min2DSpacingPx = Math.max(18, lastRadius + radius + 7);

        if (dist3DSinceLast >= base3DSpacing && dist2DPx >= min2DSpacingPx) {
          // Don't draw dot on top of the landing target
          const distToLandPx = Math.hypot(curX - traj.landPoint.x, curY - traj.landPoint.y) * ppu;
          const landRadiusPx = (traj.colliderRadius ?? 0.35) * ppu;
          if (distToLandPx > landRadiusPx * 0.8) {
            const isLayer2 = curZ >= layer2Threshold;
            ctx.fillStyle = isLayer2 ? "rgba(255, 255, 255, 0.38)" : "rgba(255, 255, 255, 0.95)";
            ctx.beginPath();
            ctx.arc(curX * ppu, curY * ppu, radius, 0, Math.PI * 2);
            ctx.fill();

            lastX = curX;
            lastY = curY;
            lastRadius = radius;
            dist3DSinceLast = 0;
          }
        }
      }
    }

    ctx.shadowBlur = 0;

    // Impact or Landing Marker:
    // Matches the exact collider footprint size of the held object so the player can visualize if it will fit!
    const finalPt = points[points.length - 1];
    const targetRadius = (traj.colliderRadius ?? 0.35) * ppu;
    const landX = traj.landPoint.x * ppu;
    const landY = traj.landPoint.y * ppu;

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

    if (traj.isBlockedByWall) {
      // Wall Collision: Show exact collider footprint at collision point in dashed red, with a central red X
      const impX = finalPt.x * ppu;
      const impY = finalPt.y * ppu;

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
      ctx.save();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
      ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
      ctx.lineWidth = 2.2;
      ctx.setLineDash([]);
      drawColliderFootprint(landX, landY);
      ctx.fill();
      ctx.stroke();

      // Central pinpoint dot
      ctx.beginPath();
      ctx.arc(landX, landY, Math.min(4, targetRadius * 0.22), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(56, 189, 248, 0.95)";
      ctx.fill();
      ctx.restore();
    } else {
      // Landing Target on Ground (Layer 1: exact collider footprint size)
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

    ctx.restore();
  }

  private drawHoverGizmo(entity: GameObject, ppu: number): void {
    const ctx = this.ctx;
    const px = entity.position.x * ppu;
    const py = entity.position.y * ppu;
    const visualRadius = entity.hasCollider ? entity.colliderRadius : (entity.colliderModule?.radius ?? 0.32);
    const pad = (visualRadius + 0.08) * ppu;

    ctx.save();
    ctx.strokeStyle = "rgba(251, 191, 36, 0.6)"; // Soft amber
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.arc(px, py, pad, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawSelectionGizmo(entity: GameObject, isEditMode: boolean, ppu: number): void {
    const ctx = this.ctx;
    const px = entity.position.x * ppu;
    const py = entity.position.y * ppu;
    const visualRadius = entity.hasCollider ? entity.colliderRadius : (entity.colliderModule?.radius ?? 0.32);
    const r = visualRadius * ppu;
    const pad = r + 6;
    const bracketLen = Math.max(6, pad * 0.4);

    const color = isEditMode ? "#fbbf24" : "#38bdf8";

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    // Corner brackets around entity
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(px - pad, py - pad + bracketLen);
    ctx.lineTo(px - pad, py - pad);
    ctx.lineTo(px - pad + bracketLen, py - pad);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(px + pad - bracketLen, py - pad);
    ctx.lineTo(px + pad, py - pad);
    ctx.lineTo(px + pad, py - pad + bracketLen);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(px + pad, py + pad - bracketLen);
    ctx.lineTo(px + pad, py + pad);
    ctx.lineTo(px + pad - bracketLen, py + pad);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(px - pad + bracketLen, py + pad);
    ctx.lineTo(px - pad, py + pad);
    ctx.lineTo(px - pad, py + pad - bracketLen);
    ctx.stroke();

    // Subtle tag above entity when in Edit Mode
    if (isEditMode) {
      const text = `${entity.name} (${entity.mass.toFixed(1)}kg)`;
      ctx.font = "bold 10px 'Segoe UI', system-ui, sans-serif";
      const tm = ctx.measureText(text);
      const bgW = tm.width + 12;
      const bgH = 16;
      const bgX = px - bgW / 2;
      const bgY = py - pad - bgH - 4;

      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bgX, bgY, bgW, bgH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, px, bgY + bgH / 2);
    }

    ctx.restore();
  }
}
