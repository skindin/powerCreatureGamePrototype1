import { GameObject } from "../src/engine/GameObject.js";
import { Arena } from "../src/engine/Arena.js";
import { RigidbodyModule } from "../src/engine/RigidbodyModule.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

console.log("=== Rigidbody Module & Vertical Velocity Dependency Verification ===\n");

const arena = new Arena();
const dt = 1 / 60;

// Test 1: Default GameObject has RigidbodyModule and hasRigidbody === true
console.log("--- Test 1: Default Rigidbody Initialization ---");
const defaultObj = new GameObject({
  position: { x: 5, y: 5, z: 0 },
  velocity: { x: 2, y: 3 },
  verticalVelocity: 4,
  hasVerticalPosition: true,
});

assert(defaultObj.hasRigidbody === true, "Default object hasRigidbody is true");
assert(defaultObj.rigidbodyModule !== null, "rigidbodyModule is instantiated");
assert(defaultObj.velocity.x === 2 && defaultObj.velocity.y === 3, "Linear velocity matches initial values");
assert(defaultObj.hasVerticalVelocity === true, "hasVerticalVelocity is true when both Rigidbody and VerticalPosition exist");
assert(defaultObj.verticalVelocity === 4, "verticalVelocity is 4");

// Test 2: Vertical Velocity depends on Vertical Position Module
console.log("\n--- Test 2: Vertical Velocity Dependency on Vertical Position ---");
const flat2DObj = new GameObject({
  position: { x: 5, y: 5, z: 0 },
  hasVerticalPosition: false, // 2D flat entity without vertical position
  hasVerticalVelocity: true,  // Requests vertical velocity
  verticalVelocity: 5,
});

assert(flat2DObj.hasRigidbody === true, "2D flat object still has Rigidbody");
assert(flat2DObj.hasVerticalPosition === false, "hasVerticalPosition is false");
assert(flat2DObj.hasVerticalVelocity === false, "hasVerticalVelocity is FALSE because VerticalPosition behavior is missing");
assert(flat2DObj.verticalVelocity === 0, "verticalVelocity returns 0 when hasVerticalVelocity is false");

// Test 3: Static Body (no Rigidbody) does not move or integrate velocity
console.log("\n--- Test 3: Static Body Without Rigidbody ---");
const staticObj = new GameObject({
  name: "Immovable Pillar",
  position: { x: 2, y: 2, z: 0 },
  hasRigidbody: false,
  colliderRadius: 0.35,
});

assert(staticObj.hasRigidbody === false, "Static object hasRigidbody is false");
assert(staticObj.rigidbodyModule === null, "rigidbodyModule is null");
assert(staticObj.velocity.x === 0 && staticObj.velocity.y === 0, "Static object velocity is (0,0)");
assert(staticObj.hasVerticalVelocity === false, "Static object hasVerticalVelocity is false");

// Attempt to call updatePosition on static object
staticObj.updatePosition(dt, arena);
assert(staticObj.position.x === 2 && staticObj.position.y === 2, "Static object position remains unchanged after updatePosition");

// Test 4: Attaching Rigidbody dynamically enables motion
console.log("\n--- Test 4: Dynamic Rigidbody Attachment ---");
staticObj.rigidbodyModule = new RigidbodyModule({
  velocity: { x: 6, y: 0 },
  collisionMode: "dynamic",
});

assert(staticObj.hasRigidbody === true, "After attaching RigidbodyModule, hasRigidbody is true");
assert(staticObj.velocity.x === 6, "Velocity getter routes to rigidbodyModule.velocity");

staticObj.updatePosition(dt, arena);
assert(staticObj.position.x > 2, `Object integrated motion: x = ${staticObj.position.x.toFixed(4)}`);

console.log("\n🎉 ALL RIGIDBODY MODULE VERIFICATION TESTS PASSED!");
