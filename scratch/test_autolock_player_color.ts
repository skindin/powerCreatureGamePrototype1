import { Character } from "../src/character/Character";
import { Renderer } from "../src/engine/Renderer";
import { Arena } from "../src/engine/Arena";
import { GameObject } from "../src/engine/GameObject";

class MockCanvasContext {
  public strokeStyle: any = "";
  public fillStyle: any = "";
  public lineWidth: number = 1;
  public shadowColor: string = "";
  public shadowBlur: number = 0;
  public font: string = "";
  public lineDash: number[] = [];

  public strokes: { style: any; dash: number[] }[] = [];
  public fills: any[] = [];
  public texts: { text: string; fillStyle: any }[] = [];

  save() {}
  restore() {}
  beginPath() {}
  moveTo(x: number, y: number) {}
  lineTo(x: number, y: number) {}
  arc(x: number, y: number, r: number, sa: number, ea: number) {}
  stroke() {
    this.strokes.push({ style: this.strokeStyle, dash: [...this.lineDash] });
  }
  fill() {
    this.fills.push(this.fillStyle);
  }
  fillText(text: string, x: number, y: number) {
    this.texts.push({ text, fillStyle: this.fillStyle });
  }
  setLineDash(dash: number[]) {
    this.lineDash = dash;
  }
  clip() {}
  rect() {}
  roundRect() {}
  drawImage() {}
  clearRect() {}
}

async function testAutoLockPlayerColor() {
  console.log("Starting testAutoLockPlayerColor...");

  const mockCtx = new MockCanvasContext();
  (mockCtx as any).canvas = { width: 1000, height: 700 };

  const renderer = new Renderer(mockCtx as any);
  const arena = new Arena(20, 14);

  // Setup Player 2 (Cyan: #06b6d4)
  const p2 = new Character({ playerId: "gamepad-1", playerNumber: 2, x: 5, y: 5, color: "#06b6d4" });
  p2.playerColor = "#06b6d4";

  // Create rock to be held and rock on the ground to be locked
  const heldRock = new GameObject({ id: "held-rock", x: 5, y: 5, mass: 1.0, isStatic: false });
  const targetRock = new GameObject({ id: "target-rock", x: 8, y: 5, mass: 1.0, isStatic: false });
  p2.heldObject = heldRock;

  // Trajectory with auto-lock active onto targetRock
  const mockTrajectory = {
    points: [
      { x: 5, y: 5, z: 0.5 },
      { x: 6.5, y: 5, z: 1.2 },
      { x: 8, y: 5, z: 0.0 }
    ],
    landPoint: { x: 8, y: 5, z: 0 },
    isBlockedByWall: false,
    isLandingOnWallTop: false,
    colliderRadius: 0.35,
    targetObject: targetRock,
    isAutoLocked: true
  };

  const ppu = 50;
  const aimTarget = { x: 8.2, y: 5.1 };

  renderer.drawTrajectory(mockTrajectory as any, ppu, arena, aimTarget, p2);

  console.log("Captured stroke styles:", mockCtx.strokes.map(s => s.style));
  console.log("Captured texts:", mockCtx.texts);

  // 1. Verify that NO stroke or text uses the old hardcoded amber gold '#f59e0b' or 'rgba(245, 158, 11'
  const hasOldAmber = mockCtx.strokes.some(s => typeof s.style === "string" && (s.style.includes("245, 158, 11") || s.style === "#f59e0b"));
  if (hasOldAmber) {
    throw new Error("Found hardcoded yellow (#f59e0b / 245, 158, 11) in strokes!");
  }

  const hasOldAmberText = mockCtx.texts.some(t => typeof t.fillStyle === "string" && t.fillStyle.includes("#f59e0b"));
  if (hasOldAmberText) {
    throw new Error("Found hardcoded yellow (#f59e0b) in [LOCKED] text!");
  }

  // 2. Verify that the sightline stroke uses p2's cyan rgb: rgb(6, 182, 212)
  const hasCyanSightline = mockCtx.strokes.some(s => typeof s.style === "string" && s.style.includes("6, 182, 212") && s.dash.length > 0);
  if (!hasCyanSightline) {
    throw new Error("Did not find dashed lock sightline in Player 2's cyan color rgb(6, 182, 212)!");
  }

  // 3. Verify brackets use p2.playerColor (#06b6d4)
  const hasCyanBrackets = mockCtx.strokes.some(s => s.style === "#06b6d4");
  if (!hasCyanBrackets) {
    throw new Error("Did not find lock brackets in Player 2's cyan color #06b6d4!");
  }

  // 4. Verify [LOCKED] text uses p2.playerColor (#06b6d4)
  const hasCyanText = mockCtx.texts.some(t => t.text.includes("LOCKED") && t.fillStyle === "#06b6d4");
  if (!hasCyanText) {
    throw new Error("Did not find [LOCKED] text in Player 2's cyan color #06b6d4!");
  }

  console.log("All auto-lock player color tests passed successfully!");
}

testAutoLockPlayerColor().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
