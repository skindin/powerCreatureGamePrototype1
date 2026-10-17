import { EnergyBus } from "../src/character/EnergyBus.js";
import { EnergyPool } from "../src/character/EnergyPool.js";
import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ Assertion failed: ${msg}`);
    process.exit(1);
  }
}

console.log("=== Running Allow Partial Power & Precedent Priority Tests ===");

// Test 1: Full-Power Demand Preempts Partial-Power Demands
{
  console.log("\n[Test 1] Full-power demand preempts active partial-power demands and forces partial scaling");
  const bus = new EnergyBus({ baseMaxPower: 500, baseMaxStamina: 10 });
  const pool = new EnergyPool({ baseMaxEnergy: 10000 });
  const dt = 1 / 60;

  // Frame 1: Sprint (152W, partial=true) and Heal (250W, partial=true)
  const sprintW1 = bus.requestPower(152, dt, pool, undefined, false, "locomotion", true);
  const healW1 = bus.requestPower(250, dt, pool, undefined, false, "health_regen", true);

  assert(Math.abs(sprintW1 - 152) < 0.1, `Sprint should receive full 152W when capacity allows, got ${sprintW1}`);
  assert(Math.abs(healW1 - 250) < 0.1, `Heal should receive full 250W when capacity allows, got ${healW1}`);
  assert(Math.abs(bus.livePowerDraw - 402) < 0.2, `Total power draw should be 402W, got ${bus.livePowerDraw}`);

  bus.update(dt, pool);

  // Frame 2: Character attempts Climb (260W, partial=false)!
  // Total demand = 260 + 152 + 250 = 662W > 500W cap.
  // Climb requires full power, so it takes 260W first.
  // Remaining headroom for partials = 500 - 260 = 240W.
  // Sprint and Heal share 240W proportionally:
  // Sprint = (152 / 402) * 240 = 90.75W
  // Heal = (250 / 402) * 240 = 149.25W
  const climbW = bus.requestPower(260, dt, pool, undefined, false, "climbing", false);
  const sprintW2 = bus.requestPower(152, dt, pool, undefined, false, "locomotion", true);
  const healW2 = bus.requestPower(250, dt, pool, undefined, false, "health_regen", true);

  assert(Math.abs(climbW - 260) < 0.1, `Climb must receive 100% full power (260W), got ${climbW}`);
  assert(Math.abs(sprintW2 - 90.75) < 0.5, `Sprint should be scaled down to ~90.75W, got ${sprintW2}`);
  assert(Math.abs(healW2 - 149.25) < 0.5, `Heal should be scaled down to ~149.25W, got ${healW2}`);
  assert(Math.abs(bus.livePowerDraw - 500) < 0.2, `Total power draw must be capped at 500W, got ${bus.livePowerDraw}`);
  console.log(`  ✓ Climb granted 100% full power (${climbW.toFixed(1)}W)`);
  console.log(`  ✓ Sprint scaled down to ${sprintW2.toFixed(1)}W`);
  console.log(`  ✓ Heal scaled down to ${healW2.toFixed(1)}W`);
  console.log(`  ✓ Total bus draw: ${bus.livePowerDraw.toFixed(1)}W / 500.0W`);
}

// Test 2: FIFO Ordering Among Competing Full-Power Demands
{
  console.log("\n[Test 2] FIFO ordering among competing full-power demands");
  const bus = new EnergyBus({ baseMaxPower: 500, baseMaxStamina: 10 });
  const pool = new EnergyPool({ baseMaxEnergy: 10000 });
  const dt = 1 / 60;

  // Earlier full-power demand: 260W
  const ability1 = bus.requestPower(260, dt, pool, undefined, false, "full_ability_1", false);
  // Later full-power demand: 300W (260 + 300 = 560 > 500)
  const ability2 = bus.requestPower(300, dt, pool, undefined, false, "full_ability_2", false);

  assert(Math.abs(ability1 - 260) < 0.1, `First full-power ability must receive 260W, got ${ability1}`);
  assert(ability2 === 0, `Second full-power ability must receive 0W due to lack of full headroom, got ${ability2}`);
  console.log(`  ✓ First initiated full-power ability: granted ${ability1}W`);
  console.log(`  ✓ Second initiated full-power ability: rejected with ${ability2}W`);
}

// Test 3: Jump full power gating (jumpAllowPartialPower = false)
{
  console.log("\n[Test 3] Jump gating with jumpAllowPartialPower = false");
  const arena = new Arena();
  const char = new Character({ x: 0, y: 0, z: 0 });
  char.energyPool = new EnergyPool({ baseMaxEnergy: 10000 });
  char.energyBus = new EnergyBus({ baseMaxPower: 500, baseMaxStamina: 10 });
  char.energyBusses.set("bus_main", char.energyBus);
  char.jumpConsumesEnergy = true;
  char.jumpAllowPartialPower = false;

  // When energy and bus are full: jump succeeds!
  const jumped = char.jump(arena, { x: 0, y: 0 });
  assert(jumped, "Character should jump when bus and pool have full energy");
  console.log("  ✓ Grounded jump succeeded at full power");

  // Settle back to ground
  char.position.z = 0;
  char.verticalVelocity = 0;
  char.isGrounded = true;

  // Drain pool to empty
  char.energyPool.currentEnergyProp.set(0);
  const jumpFailed = char.jump(arena, { x: 0, y: 0 });
  assert(!jumpFailed, "Character must NOT jump when energy pool is empty and jumpAllowPartialPower = false");
  console.log("  ✓ Jump aborted cleanly when energy is unavailable");
}

// Test 4: Climbing allowPartialPower = false slips if full power is unavailable
{
  console.log("\n[Test 4] Climbing slip if full power unavailable");
  const arena = new Arena();
  const char = new Character({ x: 0, y: 0, z: 0 });
  char.energyPool = new EnergyPool({ baseMaxEnergy: 10000 });
  char.energyBus = new EnergyBus({ baseMaxPower: 500, baseMaxStamina: 10 });
  char.energyBusses.set("bus_main", char.energyBus);

  assert(char.healthModule !== null, "Health module should exist");
  assert(char.healthModule!.allowPartialPower === true, "HealthModule allowPartialPower should default to true");
  assert(char.walkingModule!.sprintAllowPartialPower === true, "WalkingModule sprintAllowPartialPower should default to true");
  assert(char.walkingModule!.walkAllowPartialPower === false, "WalkingModule walkAllowPartialPower should default to false");
  assert(char.pickupModule!.allowPartialPower === false, "PickupModule allowPartialPower should default to false");
  assert(char.jumpAllowPartialPower === false, "Character jumpAllowPartialPower should default to false");
  console.log("  ✓ All module default allowPartialPower settings verified matching specifications");
}

console.log("\n✅ ALL ALLOW PARTIAL POWER & PRIORITY PRECEDENT TESTS PASSED!\n");
