import { Arena } from "../src/engine/Arena";
import { Character } from "../src/character/Character";
import { GameObject } from "../src/engine/GameObject";

console.log("=== Testing Trajectory Clamp to Closest Reachable Point ===");

const arena = new Arena();
const char = new Character({ id: "p1", x: 5, y: 10, radius: 0.35 });
const rock = new GameObject({
  id: "r1",
  name: "Rock",
  position: { x: 5, y: 10, z: 0 },
  radius: 0.35,
  mass: 1.0,
  hasGravity: true,
  hasVerticalVelocity: true,
});
char.pickupModule.pickup(char, rock);

const bus = char.getEnergyBus("bus_main");
if (!bus) throw new Error("Missing bus_main");

// 1. Full stamina and energy: can reach full aim distance
const targetX = 15;
const targetY = 10;
const fullTraj = char.throwModule.calculateTrajectory(char, targetX, targetY, arena);
console.log("fullTraj:", fullTraj);
if (!fullTraj) {
  const maxSpeed = char.throwModule.calculateMaxLaunchSpeed(char, rock);
  console.log("maxSpeed:", maxSpeed, "energyPool:", char.energyPool?.getCurrentEnergy(char.properties), "stamina:", bus.currentStaminaProp.get(char.properties));
  throw new Error("Full trajectory should not be null");
}

// 2. Reduce stamina to 0.1s: limited energy available
bus.currentStaminaProp.set(0.1, char.properties);
const limitedTraj = char.throwModule.calculateTrajectory(char, targetX, targetY, arena);
console.log("Limited energy trajectory landPoint.x:", limitedTraj?.landPoint.x.toFixed(2), "dist:", limitedTraj ? (limitedTraj.landPoint.x - 5).toFixed(2) : null);

if (!limitedTraj) {
  throw new Error("Trajectory should NOT be null when energy is limited! It should display closest point.");
}
if (limitedTraj.landPoint.x >= fullTraj.landPoint.x - 0.1) {
  throw new Error("Trajectory did not clamp to a closer reachable point!");
}

// 3. Test executing throw at limited energy
const thrown = char.throwModule.throwHeldObject(char, targetX, targetY, arena);
if (!thrown || !thrown.isInFlight) {
  throw new Error("Throw should succeed and launch rock to reachable clamped target!");
}
console.log("Rock successfully thrown with clamped velocity: vx=" + thrown.velocity.x.toFixed(2) + " vz=" + thrown.verticalVelocity.toFixed(2));

console.log("=== ALL TRAJECTORY CLAMP TESTS PASSED! ===");
