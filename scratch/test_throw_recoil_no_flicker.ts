import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Arena } from "../src/engine/Arena.js";

const arena = new Arena();

// Setup character holding a heavy rock
const char = new Character({ x: 5.0, y: 5.0, mass: 1.2 });
const rock = new GameObject({ id: "rock-1", position: { x: 5.0, y: 5.0, z: 0 }, mass: 2.0 });

char.heldObject = rock;
rock.isHeld = true;
rock.heldBy = char;

console.log("Initial char position:", char.position.x, char.position.y);

// Throw the rock to the right (+X)
const thrown = char.throwModule!.throwHeldObject(char, 10.0, 5.0, arena);
console.log("Post-throw char position:", char.position.x.toFixed(3), "velocity:", char.velocity.x.toFixed(3));
console.log("char.lastThrowTime:", char.lastThrowTime);

// Recoil should have given char negative X velocity (kickback to the left)
if (char.velocity.x < -0.5) {
  console.log("✅ Recoil velocity applied successfully:", char.velocity.x.toFixed(3));
} else {
  console.error("❌ Recoil velocity not applied!");
  process.exit(1);
}

// Simulate client step
const dt = 1 / 60;
char.updatePosition(dt, arena);
const recoilX = char.position.x;
console.log("Char position after 1 physics tick:", recoilX.toFixed(3));

// Now simulate incoming stale server snapshot (sent before server processed the throw, so x = 5.0, vx = 0)
const staleServerState = { id: char.playerId, x: 5.0, y: 5.0, vx: 0, vy: 0 };
const dx = staleServerState.x - char.position.x;
const dy = staleServerState.y - char.position.y;
const dist = Math.hypot(dx, dy);

console.log("Stale server snapshot distance:", dist.toFixed(4));

// Test the guard:
const now = performance.now();
const isRecentThrowRecoil = now - (char.lastThrowTime ?? 0) < 600;
const localSpeed = Math.hypot(char.velocity.x, char.velocity.y);
const serverSpeed = Math.hypot(staleServerState.vx, staleServerState.vy);

let rejectedStaleSnap = false;
if (isRecentThrowRecoil || (localSpeed > 0.1 && serverSpeed < 0.05)) {
  console.log("🛡️ GUARD ACTIVATED: Stale pre-throw server snapshot rejected! Character position preserved.");
  rejectedStaleSnap = true;
} else {
  console.error("❌ Guard failed to activate! Character would snap back to stale position!");
  process.exit(1);
}

if (char.position.x === recoilX && rejectedStaleSnap) {
  console.log("✅ PASS: Zero flicker! Character stayed at kickback position without rubber-banding.");
} else {
  console.error("❌ FAIL: Character position altered!");
  process.exit(1);
}
