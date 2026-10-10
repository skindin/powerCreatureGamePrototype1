import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";

async function run() {
  console.log("=== Testing Pre-Planned Momentum Braking ===");
  const arena = new Arena();
  const char = new Character({ id: "hero", x: 2.0, y: 2.0 });
  char.position.z = 0;
  char.verticalVelocity = 0;
  char.supportingSurfaceHeight = 0;

  const dt = 1 / 60;

  // 1. Move character forward with input
  for (let i = 0; i < 60; i++) {
    char.updateCharacter(dt, { x: 1, y: 0 }, false, null, arena);
    if (i === 0) {
      console.log(`Tick 0 debug: hasFriction=${char.hasFriction}, hasStrength=${char.hasStrength}, isResting=${char.isRestingOnSurface}, vx=${char.velocity.x}`);
      console.log(`canWalk=${Boolean(char.walkingModule && char.walkingModule.enabled && char.hasFriction)}`);
      console.log(`dynamicGroundFrictionMod=${char.dynamicGroundFrictionMod}, arenaFric=${arena.frictionCoeff}`);
      console.log(`maxWalkSpeed=${char.walkingModule!.maxWalkSpeedProp.get(char.properties)}`);
    }
  }
  const speedAtRelease = Math.hypot(char.velocity.x, char.velocity.y);
  console.log(`Speed before releasing input: ${speedAtRelease.toFixed(2)} u/s`);

  // 2. Release input: character should start planned braking
  char.updateCharacter(dt, { x: 0, y: 0 }, false, null, arena);
  if (!char.walkingModule!.isBrakingPlanned) {
    throw new Error("Expected isBrakingPlanned to be true on release!");
  }
  console.log(`Planned braking duration: ${(char.walkingModule!.plannedBrakeRemainingTime * 1000).toFixed(1)}ms`);

  // 3. Step forward until braking completes
  let ticks = 0;
  while (char.walkingModule!.isBrakingPlanned && ticks < 120) {
    char.updateCharacter(dt, { x: 0, y: 0 }, false, null, arena);
    ticks++;
  }
  const speedAfterBrake = Math.hypot(char.velocity.x, char.velocity.y);
  console.log(`Speed after planned brake completes (${ticks} ticks): ${speedAfterBrake.toFixed(4)} u/s`);
  if (speedAfterBrake > 0.05) {
    throw new Error(`Expected character to be stopped, but velocity was ${speedAfterBrake}`);
  }

  // 4. Test external push while idle:
  // Character receives an external shove of (3, 0)
  char.velocity.x = 3.0;
  char.velocity.y = 0;
  // Next tick without input: character must NOT fight or cancel the external push!
  char.updateCharacter(dt, { x: 0, y: 0 }, false, null, arena);
  console.log(`Velocity after external shove without input: (${char.velocity.x.toFixed(2)}, ${char.velocity.y.toFixed(2)})`);
  if (char.velocity.x < 2.5) {
    throw new Error("Character actively resisted an external push while idle!");
  }

  console.log("✅ Pre-planned momentum braking tests passed successfully!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
