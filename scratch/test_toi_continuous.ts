import { ContinuousPhysics } from "../src/engine/ContinuousPhysics.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Arena } from "../src/engine/Arena.js";

function runTest(): void {
  console.log("=== Testing Swept TOI Continuous Collision Resolver ===");

  // 1. Test circle-circle sweep
  const pA0 = { x: 2.0, y: 5.0 };
  const pA1 = { x: 5.0, y: 5.0 }; // moving right +3 u
  const rA = 0.5;

  const pB0 = { x: 6.0, y: 5.0 };
  const pB1 = { x: 3.0, y: 5.0 }; // moving left -3 u
  const rB = 0.5;

  const hit = ContinuousPhysics.sweepCircleCircle(pA0, pA1, rA, pB0, pB1, rB);
  if (!hit) {
    throw new Error("Expected collision hit between approaching bodies!");
  }

  console.log(`Hit detected at alpha: ${hit.alpha.toFixed(3)}, normal: (${hit.normal.x.toFixed(2)}, ${hit.normal.y.toFixed(2)})`);

  // Verify distance at contact instant equals rA + rB
  const contactA = { x: pA0.x + hit.alpha * (pA1.x - pA0.x), y: pA0.y + hit.alpha * (pA1.y - pA0.y) };
  const contactB = { x: pB0.x + hit.alpha * (pB1.x - pB0.x), y: pB0.y + hit.alpha * (pB1.y - pB0.y) };
  const dist = Math.hypot(contactB.x - contactA.x, contactB.y - contactA.y);
  console.log(`Separation distance at alpha = ${dist.toFixed(5)} (expected ${rA + rB})`);

  if (Math.abs(dist - (rA + rB)) > 0.001) {
    throw new Error(`Distance at TOI rewind did not match sum of radii! Got ${dist}, expected ${rA + rB}`);
  }

  // 2. Test Altitude Gating
  const arena = new Arena(20, 14, 1.0);
  const groundObj = new GameObject({
    id: "g1",
    position: { x: 5.0, y: 5.0, z: 0 },
    colliderRadius: 0.5,
  });
  const elevatedObj = new GameObject({
    id: "e1",
    position: { x: 5.0, y: 5.0, z: 1.2 }, // Above wall height (1.0)
    colliderRadius: 0.5,
  });

  const layerG = GameObject.getEntityLayer(groundObj, arena.wallHeight);
  const layerE = GameObject.getEntityLayer(elevatedObj, arena.wallHeight);
  console.log(`Layer Ground: ${layerG}, Layer Elevated: ${layerE}`);
  if (layerG === layerE) {
    throw new Error("Elevated object should be on a different layer than ground object!");
  }

  console.log("✅ All Swept TOI Continuous Physics tests passed successfully!");
}

runTest();
