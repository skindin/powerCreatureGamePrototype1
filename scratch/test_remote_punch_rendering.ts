import assert from "node:assert";
import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { Renderer } from "../src/engine/Renderer.js";

console.log("==================================================================");
console.log("🧪 TESTING REMOTE MELEE PUNCH RENDERING & TIMESTAMP SAFEGUARDS");
console.log("==================================================================");

// Mock Canvas 2D Context
let strokedLineWidth = 0;
let strokedStyle = "";
let filledStyle = "";
let fillCalled = false;
let strokeCalled = false;

const mockCtx = {
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  arc: () => {},
  closePath: () => {},
  fill: () => { fillCalled = true; },
  stroke: () => { strokeCalled = true; strokedLineWidth = mockCtx.lineWidth; },
  set strokeStyle(val: string) { strokedStyle = val; },
  get strokeStyle() { return strokedStyle; },
  set fillStyle(val: string) { filledStyle = val; },
  get fillStyle() { return filledStyle; },
  globalAlpha: 1.0,
  lineWidth: 1.0,
  lineCap: "round",
  lineJoin: "round",
} as any;

const mockCanvas = {
  width: 800,
  height: 600,
  getContext: () => mockCtx,
} as any;

const renderer = new Renderer(mockCanvas);
(renderer as any).ctx = mockCtx;

const arena = new Arena(20, 20);
const remoteChar = new Character({
  id: "player1-remote",
  name: "Player 1",
  position: { x: 10, y: 10, z: 0 },
  color: "#f59e0b", // Orange
  colliderRadius: 0.44,
  mass: 1.2,
});
remoteChar.playerColor = "#f59e0b";

console.log("\n--- TEST 1: Punch timestamp from another machine far in the future ---");
// Simulate remote machine whose performance.now() is 200,000ms ahead of this machine
const localNow = 10000;
remoteChar.meleeModule!.lastVisualPunchTime = localNow + 200000;
fillCalled = false;
strokeCalled = false;

renderer.drawMeleeEffect(remoteChar, 32, arena, localNow);

assert.strictEqual(fillCalled, false, "Must NOT render punch effect when punch timestamp is in the future!");
assert.strictEqual(strokeCalled, false, "Must NOT stroke canvas when punch timestamp is in the future!");
console.log("✅ Test 1 Passed: Future remote timestamps safely rejected (0 canvas calls).");

console.log("\n--- TEST 2: Punch timestamp from another machine far in the past ---");
// Simulate remote timestamp older than 140ms
remoteChar.meleeModule!.lastVisualPunchTime = localNow - 50000;
fillCalled = false;
strokeCalled = false;

renderer.drawMeleeEffect(remoteChar, 32, arena, localNow);

assert.strictEqual(fillCalled, false, "Must NOT render punch effect when punch timestamp is older than 140ms!");
assert.strictEqual(strokeCalled, false, "Must NOT stroke canvas when punch timestamp is older than 140ms!");
console.log("✅ Test 2 Passed: Stale remote timestamps safely rejected.");

console.log("\n--- TEST 3: Active punch within valid 0-140ms window ---");
// Active punch at 40ms elapsed
remoteChar.meleeModule!.lastVisualPunchTime = localNow - 40;
fillCalled = false;
strokeCalled = false;

renderer.drawMeleeEffect(remoteChar, 32, arena, localNow);

assert.strictEqual(fillCalled, true, "Must render punch glow during active window!");
assert.strictEqual(strokeCalled, true, "Must stroke punch outline during active window!");
assert.ok(strokedLineWidth >= 1.5 && strokedLineWidth <= 6.0, `Stroke line width (${strokedLineWidth}px) must be cleanly clamped between 1.5px and 6.0px (cannot blow up to 2,500px)!`);
console.log(`✅ Test 3 Passed: Active punch rendered with strictly clamped lineWidth = ${strokedLineWidth}px.`);

console.log("\n==================================================================");
console.log("🎉 ALL REMOTE PUNCH RENDERING & SCREEN-COVER TESTS PASSED 100%!");
console.log("==================================================================");
