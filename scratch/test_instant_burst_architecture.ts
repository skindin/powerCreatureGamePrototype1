import { Character } from "../src/character/Character.js";
import { EnergyBus } from "../src/character/EnergyBus.js";
import { EnergyPool } from "../src/character/EnergyPool.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`PASS: ${msg}`);
}

console.log("=== Testing Instant Burst Architecture & HUD Power Peek ===");

// 1. Test requestInstantBurst basic mechanics
{
  const bus = new EnergyBus({ baseMaxPower: 500, baseMaxStamina: 10 });
  const pool = new EnergyPool({ baseMaxEnergy: 10000 });

  // Demanding 224 J (Jump impulse)
  const res = bus.requestInstantBurst({
    abilityId: "jump",
    demandedJoules: 224,
    allowPartialPower: false,
    pool
  });

  assert(res.granted === true, "224 J jump granted with ample stamina");
  assert(res.grantedJoules === 224, "Granted exact 224 Joules");
  assert(res.fraction === 1.0, "Granted full 1.0 fraction");
  assert(res.peakWatts === 224, "Visual peak power is exactly 224 W from standstill (not clamped to 500 W)");
  assert(Math.abs(pool.getCurrentEnergy() - 9776) < 0.1, "Energy pool deducted 224 J");
  // Stamina drain = 224 / 500 = 0.448s
  assert(Math.abs(bus.currentStamina - (10 - 0.448)) < 0.001, `Stamina deducted 0.448s (now ${bus.currentStamina.toFixed(3)}s)`);

  // Verify non-destructive read across multiple calls
  const read1 = bus.getCurrentWattage();
  const read2 = bus.getCurrentWattage();
  const read3 = bus.getCurrentWattage();
  assert(read1 === 224, `First read (e.g. DevPanel) saw peak 224 W (saw ${read1})`);
  assert(read2 === 224, `Second read (e.g. EnergyHud) saw peak 224 W without destruction (saw ${read2})`);
  assert(read3 === 224, `Third read saw peak 224 W (saw ${read3})`);
}

// 2. Test concurrent burst on top of continuous power (sprinting + jumping)
{
  const bus = new EnergyBus({ baseMaxPower: 500, baseMaxStamina: 10 });
  const pool = new EnergyPool({ baseMaxEnergy: 10000 });

  // Simulate sprinting (152 W)
  bus.beginTick();
  bus.requestPower(152, 0.016, pool, undefined, false, "sprint", true);
  assert(bus.livePowerDraw === 152, "Sprinting drawing 152 W");

  // Perform jump during sprint
  const res = bus.requestInstantBurst({
    abilityId: "jump",
    demandedJoules: 224,
    allowPartialPower: false,
    pool
  });

  // Expected peak = min(500, 152 + 224) = 376 W
  assert(res.peakWatts === 376, `Sprint (152 W) + Jump (224 J) peaks at 376 W (got ${res.peakWatts})`);
  assert(bus.getCurrentWattage() === 376, `getCurrentWattage returns 376 W (got ${bus.getCurrentWattage()})`);
}

// 3. Test burst capacity limit: currentStamina * maxPower
{
  const bus = new EnergyBus({ baseMaxPower: 500, baseMaxStamina: 10 });
  const pool = new EnergyPool({ baseMaxEnergy: 10000 });

  // Set stamina to 0.3 seconds -> max burst capacity = 0.3 * 500 = 150 Joules
  bus.currentStaminaProp.literalValue = 0.3;

  // Jump requiring 224 J without partial power -> should be rejected!
  const resFull = bus.requestInstantBurst({
    abilityId: "jump",
    demandedJoules: 224,
    allowPartialPower: false,
    pool
  });
  assert(resFull.granted === false, "224 J jump rejected when burst capacity is only 150 J and allowPartialPower = false");

  // Jump requiring 224 J with partial power -> should grant 150 J!
  const resPartial = bus.requestInstantBurst({
    abilityId: "jump",
    demandedJoules: 224,
    allowPartialPower: true,
    pool
  });
  assert(resPartial.granted === true, "Jump granted partial burst when allowPartialPower = true");
  assert(Math.abs(resPartial.grantedJoules - 150) < 0.01, `Granted 150 Joules (got ${resPartial.grantedJoules})`);
  assert(Math.abs(resPartial.fraction - (150 / 224)) < 0.01, `Fraction is 150/224 = ~0.669 (got ${resPartial.fraction.toFixed(3)})`);
  assert(bus.currentStamina <= 0.001, "Stamina is now depleted to 0");
  assert(bus.isExhausted === true, "Bus is marked exhausted");
}

{
  const char = new Character();
  char.position.z = 0;
  char.verticalVelocity = 0;
  char.supportingSurfaceHeight = 0;

  const bus = char.getEnergyBus("bus_main")!;
  assert(bus !== undefined, "Character has main energy bus");

  // Verify standing initial wattage
  assert(bus.getCurrentWattage(char.properties) === 0, "Initial wattage is 0");

  // Execute jump
  const jumped = char.jump();
  assert(jumped === true, "Character jumped successfully");

  // Check peak wattage immediately after jump
  const devPanelRead = bus.getCurrentWattage(char.properties);
  const hudRead = bus.getCurrentWattage(char.properties);
  assert(devPanelRead > 200 && devPanelRead < 300, `DevPanel read honest jump peak: ${devPanelRead} W`);
  assert(hudRead === devPanelRead, `EnergyHud read same jump peak without destruction: ${hudRead} W`);

  // Advance time past hold window (0.1s)
  bus.update(0.1, char.energyPool, char.properties);
  const postDecayRead = bus.getCurrentWattage(char.properties);
  assert(postDecayRead === 0, `Wattage returns to 0 W after hold timer expires (got ${postDecayRead})`);
}

console.log("=== All Instant Burst & HUD Verification Tests Passed! ===");
