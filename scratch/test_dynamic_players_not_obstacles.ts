import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Arena } from "../src/engine/Arena.js";
import { CollisionResolver } from "../src/engine/physics/CollisionResolver.js";
import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";

console.log("=== Testing Players as Dynamic Freebodies (Not Solid Obstacles) ===");

// 1. Direct CollisionResolver verification between two characters
const arena = new Arena(30, 20);
const charA = new Character({
  x: 10,
  y: 10,
  colliderRadius: 0.44,
  mass: 1.2,
});
charA.velocity = { x: 5, y: 0 }; // Moving right fast

const charB = new Character({
  x: 10.6,
  y: 10,
  colliderRadius: 0.44,
  mass: 1.2,
});
charB.velocity = { x: 0, y: 0 }; // Stationary

console.log(`Initial Char A pos: (${charA.position.x.toFixed(2)}, ${charA.position.y.toFixed(2)}), vx: ${charA.velocity.x.toFixed(2)}`);
console.log(`Initial Char B pos: (${charB.position.x.toFixed(2)}, ${charB.position.y.toFixed(2)}), vx: ${charB.velocity.x.toFixed(2)}`);

if (charA.isImmovable || charB.isImmovable) {
  console.error("FAIL: Characters must not be immovable!");
  process.exit(1);
}

// Resolve collision
const collided = CollisionResolver.resolveEntityCollisions([charA, charB], arena, 1 / 60, null, "discrete");
console.log(`Collision detected: ${collided}`);
console.log(`Post-collision Char A pos: (${charA.position.x.toFixed(2)}, ${charA.position.y.toFixed(2)}), vx: ${charA.velocity.x.toFixed(2)}`);
console.log(`Post-collision Char B pos: (${charB.position.x.toFixed(2)}, ${charB.position.y.toFixed(2)}), vx: ${charB.velocity.x.toFixed(2)}`);

if (charB.velocity.x <= 0) {
  console.error("FAIL: Char B was not pushed forward by Char A!");
  process.exit(1);
}
if (charB.position.x <= 10.6) {
  console.error("FAIL: Char B position did not yield forward!");
  process.exit(1);
}
console.log("✅ SUCCESS: Char B yielded dynamically to Char A and gained forward push velocity!");

// 2. Thrown object hitting Character B
const rock = new GameObject({
  position: { x: 8, y: 10, z: 0 },
  colliderRadius: 0.3,
  mass: 0.8,
  hasBounce: true,
  bounceMod: 0.5,
});
rock.velocity = { x: 15, y: 0 }; // Thrown rock flying towards Char B at (10.7, 10)
charB.position.x = 10.0;
charB.velocity = { x: 0, y: 0 };

console.log("\n--- Testing Thrown Rock Hitting Character ---");
console.log(`Rock pos: ${rock.position.x.toFixed(2)}, vx: ${rock.velocity.x.toFixed(2)}`);
console.log(`Char B pos: ${charB.position.x.toFixed(2)}, vx: ${charB.velocity.x.toFixed(2)}`);

rock.position.x = 9.5; // Contact distance with Char B at 10.0 (dist 0.5 < r1 + r2 = 0.74)
CollisionResolver.resolveEntityCollisions([rock, charB], arena, 1 / 60, null, "discrete");

console.log(`Post-impact Rock vx: ${rock.velocity.x.toFixed(2)}`);
console.log(`Post-impact Char B vx: ${charB.velocity.x.toFixed(2)}, pos: ${charB.position.x.toFixed(2)}`);

if (charB.velocity.x <= 0) {
  console.error("FAIL: Char B did not absorb momentum from thrown rock!");
  process.exit(1);
}
console.log("✅ SUCCESS: Char B absorbed impact momentum from thrown rock and was knocked back!");

// 3. Test ServerGameSimulation character sync with recent impact
console.log("\n--- Testing ServerGameSimulation Character Sync During Impact ---");
const p1 = new Character({ x: 10, y: 10, playerId: "char-1", name: "Alice", color: "#38bdf8" });
const p2 = new Character({ x: 10.5, y: 10, playerId: "char-2", name: "Bob", color: "#f59e0b" });
const sim = new ServerGameSimulation();
sim.initializeFromWorld(new Arena(30, 20), [p1, p2], []);

const sP1 = sim.allCharacters.find(c => c.playerId === "char-1")!;
const sP2 = sim.allCharacters.find(c => c.playerId === "char-2")!;

// Step simulation: p1 runs into p2
sP1.velocity = { x: 4, y: 0 };
sP2.velocity = { x: 0, y: 0 };
sim.step(1 / 60);

console.log(`After sim step, Bob vx: ${sP2.velocity.x.toFixed(2)}, pos: (${sP2.position.x.toFixed(2)}, ${sP2.position.y.toFixed(2)})`);
const preSyncBobVx = sP2.velocity.x;
if (preSyncBobVx <= 0) {
  console.error("FAIL: Bob was not pushed on server during step!");
  process.exit(1);
}

// Now Bob's client sends stale telemetry packet before it knows it was hit: vx: 0, vy: 0, x: 10.5
sim.syncCharacterFromPacket({
  id: "char-2",
  x: 10.5,
  y: 10.0,
  z: 0,
  vx: 0,
  vy: 0,
  color: "#f59e0b",
  radius: 0.44,
});

console.log(`After syncCharacterFromPacket with stale telemetry, Bob vx: ${sP2.velocity.x.toFixed(2)}, pos: (${sP2.position.x.toFixed(2)}, ${sP2.position.y.toFixed(2)})`);
if (sP2.velocity.x <= 0) {
  console.error("FAIL: Server character sync erased Bob's push velocity!");
  process.exit(1);
}
console.log("✅ SUCCESS: Server preserved Bob's physical push impulse instead of zeroing it out!");

console.log("\n🎉 ALL TESTS PASSED: Players are fully dynamic freebodies, not solid obstacles!");
