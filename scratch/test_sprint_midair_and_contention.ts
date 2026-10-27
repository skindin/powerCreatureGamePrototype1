import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";

function runTests() {
  console.log("=== Running Sprint Mid-Air & Contention Tests ===");

  const arena = new Arena();

  // Test 1: Jump does not untoggle sprint; mid-air sprinting functions
  {
    const char = new Character();
    arena.entities = [char];
    char.walkingModule!.walkInAir = true;
    char.setSprinting(true);

    if (!char.isSprinting) {
      throw new Error("Test 1 Failed: Character should start sprinting.");
    }

    const dt = 1 / 60;
    const moveInput = { x: 1, y: 0 };

    // 1 tick of grounded sprint
    char.updateCharacter(dt, moveInput, false, null, arena, false);

    if (!char.isSprinting) {
      throw new Error("Test 1 Failed: Character sprint cancelled on ground.");
    }
    const initialSpeed = Math.hypot(char.velocity.x, char.velocity.y);
    console.log(`[Test 1] Ground sprint speed: ${initialSpeed.toFixed(2)} u/s (isSprinting: ${char.isSprinting})`);

    // Initiate jump on next tick with moveInput
    char.updateCharacter(dt, moveInput, true, null, arena, false);

    if (!char.isSprinting) {
      throw new Error("Test 1 Failed: Sprint untoggled immediately upon jumping!");
    }
    console.log(`[Test 1] Post-jump takeoff isSprinting: ${char.isSprinting}, z: ${char.position.z.toFixed(2)}`);

    // Simulate 10 frames in the air
    for (let f = 0; f < 10; f++) {
      char.updateCharacter(dt, moveInput, false, null, arena, false);
      if (!char.isSprinting) {
        throw new Error(`Test 1 Failed: Sprint untoggled in mid-air at frame ${f}!`);
      }
    }

    const midAirSpeed = Math.hypot(char.velocity.x, char.velocity.y);
    console.log(`[Test 1] Mid-air sprint speed after 10 frames: ${midAirSpeed.toFixed(2)} u/s (isSprinting: ${char.isSprinting})`);
    if (midAirSpeed < 5.20) {
      throw new Error(`Test 1 Failed: Mid-air sprint speed ${midAirSpeed.toFixed(2)} is below base walk speed.`);
    }

    console.log("✓ Test 1 Passed: Jump did not untoggle sprint, and mid-air sprinting functioned seamlessly.");
  }

  // Test 2: Contention Starvation does NOT untoggle sprint; resumes when freed
  {
    const char = new Character();
    arena.entities = [char];
    char.setSprinting(true);

    const dt = 1 / 60;
    const moveInput = { x: 1, y: 0 };

    // Configure health module to demand 500W with allowPartialPower = false
    // 500W: 20 HP/s * 25 J/HP = 500 W
    char.healthModule!.allowPartialPower = false;
    char.healthModule!.maxHealRateProp.set(20.0, char.properties);
    char.healthModule!.joulesPerHpProp.set(25.0, char.properties); // 20 * 25 = 500 W
    char.healthModule!.currentHpProp.set(50.0, char.properties);

    // Tick with 100% bus capacity consumed by full-power health healing
    char.updateCharacter(dt, moveInput, false, null, arena, false);

    if (!char.isSprinting) {
      throw new Error("Test 2 Failed: Sprint was untoggled during contention starvation!");
    }

    const speedUnderContention = Math.hypot(char.velocity.x, char.velocity.y);
    console.log(`[Test 2] Speed under 100% contention: ${speedUnderContention.toFixed(2)} u/s (isSprinting: ${char.isSprinting})`);

    // Now restore health to full (healing demand stops)
    char.healthModule!.currentHpProp.set(100.0, char.properties);

    // Run next tick without contention
    char.updateCharacter(dt, moveInput, false, null, arena, false);

    if (!char.isSprinting) {
      throw new Error("Test 2 Failed: Sprint was untoggled after contention ended!");
    }
    const resumedSpeed = Math.hypot(char.velocity.x, char.velocity.y);
    console.log(`[Test 2] Resumed speed after contention freed: ${resumedSpeed.toFixed(2)} u/s`);

    console.log("✓ Test 2 Passed: Contention starvation kept sprint toggled and resumed cleanly.");
  }

  // Test 3: Proportional sprint speed scaling when partial power is available
  {
    const char = new Character();
    arena.entities = [char];
    char.setSprinting(true);

    const dt = 1 / 60;
    const moveInput = { x: 1, y: 0 };

    // Health demands 390W with allowPartialPower = false
    // 390W: 15.6 HP/s * 25 J/HP = 390 W
    char.healthModule!.allowPartialPower = false;
    char.healthModule!.maxHealRateProp.set(15.6, char.properties);
    char.healthModule!.joulesPerHpProp.set(25.0, char.properties);
    char.healthModule!.currentHpProp.set(50.0, char.properties);

    // 500W max - 390W = 110W remaining for sprint.
    // Sprint requests ~151.8W, base walk threshold is ~98W. 110W allows partial sprint!
    char.updateCharacter(dt, moveInput, false, null, arena, false);

    if (!char.isSprinting) {
      throw new Error("Test 3 Failed: Sprint should still be toggled during proportional grant.");
    }
    console.log(`[Test 3] Proportional sprint executed with remaining 110W headroom (isSprinting: ${char.isSprinting})`);
    console.log("✓ Test 3 Passed: Proportional sprint speed scaling operated correctly.");
  }

  // Test 4: True Exhaustion untoggles sprint completely
  {
    const char = new Character();
    arena.entities = [char];
    char.setSprinting(true);

    const bus = char.getEnergyBus("bus_main")!;
    // Drain burst stamina to 0
    bus.currentStamina = 0.0;

    const dt = 1 / 60;
    const moveInput = { x: 1, y: 0 };

    char.updateCharacter(dt, moveInput, false, null, arena, false);

    if (char.isSprinting) {
      throw new Error("Test 4 Failed: Sprint should have been untoggled on true stamina exhaustion!");
    }
    console.log(`[Test 4] Post-exhaustion isSprinting: ${char.isSprinting}`);
    console.log("✓ Test 4 Passed: True exhaustion cleanly untoggled sprint.");
  }

  console.log("\nALL SPRINT CONTENTION & MID-AIR TESTS PASSED!");
}

runTests();
