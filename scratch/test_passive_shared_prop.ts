import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";

function testDynamicSharedProperty() {
  console.log("=== Testing Dynamic Shared Property Live Updates ===");

  const arena = new Arena({ width: 20, height: 20 });
  const char = new Character({ strength: 1.0, mass: 1.0 });

  // Add a shared property to character properties registry
  char.properties.add("shared_boost", 20.0);

  // Link walking force and jump strength to "shared_boost"
  char.walkingModule!.maxWalkForceProp.link("shared_boost", char.properties);
  char.jumpModule!.jumpStrengthProp.link("shared_boost", char.properties);

  // Initial values before change
  console.log("Initial shared_boost: 20.0");
  console.log("Initial jumpStrength (via registry):", char.jumpModule!.jumpStrengthProp.get(char.properties));
  console.log("Initial maxWalkForce (via registry):", char.walkingModule!.maxWalkForceProp.get(char.properties));

  // Perform a jump with value = 20.0
  char.position.z = 0;
  char.supportingSurfaceHeight = 0;
  char.verticalVelocity = 0;
  char.jump(arena);
  const initialVz = char.verticalVelocity;
  console.log("Initial jump takeoff vertical velocity:", initialVz);

  if (Math.abs(initialVz - 9.67) > 0.01 && Math.abs(initialVz - 20.0) > 0.01) {
    // Note: maxInitialSpeed is capped at 9.67 by default unless altered
    console.log("Initial jump speed was capped at maxInitialSpeed or computed:", initialVz);
  }

  // Let's set maxInitialSpeed higher to clearly see takeoff speed scaling
  char.jumpModule!.maxInitialSpeedProp.literalValue = 50.0;

  char.position.z = 0;
  char.verticalVelocity = 0;
  char.jump(arena);
  const takeoffAt20 = char.verticalVelocity;
  console.log("Takeoff speed with shared_boost=20:", takeoffAt20);

  // Now mutate the shared reference property in registry WITHOUT unlinking or relinking!
  char.properties.set("shared_boost", 40.0);
  console.log("\nMutated shared_boost to 40.0 in registry (WITHOUT unlinking/relinking)");

  // Verify that jumpStrengthProp and maxWalkForceProp immediately report 40.0
  const jumpStrengthUpdated = char.jumpModule!.jumpStrengthProp.get(char.properties);
  const walkForceUpdated = char.walkingModule!.maxWalkForceProp.get(char.properties);
  console.log("Updated jumpStrength (via registry):", jumpStrengthUpdated);
  console.log("Updated maxWalkForce (via registry):", walkForceUpdated);

  if (jumpStrengthUpdated !== 40.0) {
    throw new Error(`Expected jumpStrength to be 40.0, got ${jumpStrengthUpdated}`);
  }
  if (walkForceUpdated !== 40.0) {
    throw new Error(`Expected maxWalkForce to be 40.0, got ${walkForceUpdated}`);
  }

  // Perform another jump
  char.position.z = 0;
  char.verticalVelocity = 0;
  char.jump(arena);
  const takeoffAt40 = char.verticalVelocity;
  console.log("Takeoff speed with shared_boost=40:", takeoffAt40);

  if (Math.abs(takeoffAt40 - 40.0) > 0.01) {
    throw new Error(`Expected takeoff speed to be 40.0, got ${takeoffAt40}`);
  }

  if (takeoffAt40 <= takeoffAt20) {
    throw new Error(`Takeoff speed did not increase when shared reference was updated! Before: ${takeoffAt20}, After: ${takeoffAt40}`);
  }

  console.log("✅ SUCCESS: JumpModule responded immediately and passively to shared property modification without unlinking/relinking!");
}

testDynamicSharedProperty();
