import { Character } from "../src/character/Character.js";
import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log("🧪 Testing Character dynamic values reset on respawn and privacy filtering...");

// Test 1: Verify resetDynamicValues resets HP, Energy, and Stamina
{
  const char = new Character({
    x: 0,
    y: 0,
    playerId: "player-1",
    name: "Tester",
  });

  const hpMod = char.healthModule!;
  const energyPool = char.energyPool!;
  const bus = char.getEnergyBus("bus_main")!;

  // Verify baseline
  const maxHp = hpMod.getMaxHp(char.properties);
  const maxEnergy = energyPool.getMaxEnergy(char.properties);
  const maxStam = bus.getMaxStamina(char.properties);

  assert(maxHp === 100, `Expected maxHp 100, got ${maxHp}`);
  assert(maxEnergy === 10000, `Expected maxEnergy 10000, got ${maxEnergy}`);
  assert(maxStam === 10, `Expected maxStamina 10, got ${maxStam}`);

  // Deplete them
  hpMod.takeDamage(60, char.properties);
  energyPool.consume(4500, char.properties);
  bus.currentStaminaProp.set(2.5, char.properties);
  bus.isExhausted = true;

  assert(hpMod.getCurrentHp(char.properties) === 40, "HP should be 40 after damage");
  assert(energyPool.getCurrentEnergy(char.properties) === 5500, "Energy should be 5500 after consume");
  assert(bus.getCurrentStamina(char.properties) === 2.5, "Stamina should be 2.5 after drain");

  // Call resetDynamicValues()
  char.resetDynamicValues();

  assert(hpMod.getCurrentHp(char.properties) === maxHp, `HP should reset to ${maxHp}, got ${hpMod.getCurrentHp(char.properties)}`);
  assert(energyPool.getCurrentEnergy(char.properties) === maxEnergy, `Energy should reset to ${maxEnergy}, got ${energyPool.getCurrentEnergy(char.properties)}`);
  assert(bus.getCurrentStamina(char.properties) === maxStam, `Stamina should reset to ${maxStam}, got ${bus.getCurrentStamina(char.properties)}`);
  assert(bus.isExhausted === false, "isExhausted should be false after reset");
  console.log("  ✅ resetDynamicValues() cleanly restored HP, Energy, and Stamina.");
}

// Test 2: Verify dieAndRespawn calls resetDynamicValues()
{
  const char = new Character({
    x: 0,
    y: 0,
    playerId: "player-2",
    name: "Tester 2",
  });

  const hpMod = char.healthModule!;
  const energyPool = char.energyPool!;
  const bus = char.getEnergyBus("bus_main")!;

  energyPool.consume(8000, char.properties);
  bus.currentStaminaProp.set(1.0, char.properties);
  bus.isExhausted = true;

  // Kill character
  hpMod.takeDamage(150, char.properties);
  assert(hpMod.getCurrentHp(char.properties) === 0, "HP should be 0");

  // Advance simulation to trigger dieAndRespawn
  hpMod.update(1.0, char);

  assert(hpMod.getCurrentHp(char.properties) === 100, "HP should be fully reset on respawn");
  assert(energyPool.getCurrentEnergy(char.properties) === 10000, "Energy should be reset to 10000 on respawn");
  assert(bus.getCurrentStamina(char.properties) === 10, "Stamina should be reset to 10s on respawn");
  assert(bus.isExhausted === false, "isExhausted should be cleared on respawn");
  console.log("  ✅ dieAndRespawn() successfully invoked resetDynamicValues() and restored all attributes.");
}

// Test 3: Verify server telemetry privacy for other clients
{
  const sim = new ServerGameSimulation({ broadcastRateHz: 60, deltaCompression: false });
  sim.initializeDefaultScenario();

  const charA = new Character({ x: 2, y: 2, playerId: "client-A" });
  const charB = new Character({ x: 5, y: 5, playerId: "client-B" });

  sim.characters.set("client-A", charA);
  sim.characters.set("client-B", charB);

  // Client A requests a ghost snapshot for their client ID
  const snapForA = sim.getGhostSnapshot(0, "client-A");
  const ghostAFromSnapA = snapForA.characters.find(c => c.id === "client-A");
  const ghostBFromSnapA = snapForA.characters.find(c => c.id === "client-B");

  assert(ghostAFromSnapA !== undefined, "charA should be present in snapshot");
  assert(ghostBFromSnapA !== undefined, "charB should be present in snapshot");

  // Client A should see their own energy & stamina
  assert(ghostAFromSnapA!.currentEnergyJoules !== undefined, "Client A should receive their own energy");
  assert(ghostAFromSnapA!.currentStaminaSeconds !== undefined, "Client A should receive their own stamina");
  assert(ghostAFromSnapA!.currentHp !== undefined, "Client A should receive their own HP");

  // Client A must NOT receive Client B's energy or stamina!
  assert(ghostBFromSnapA!.currentEnergyJoules === undefined, "Client A must NOT receive Client B's energy");
  assert(ghostBFromSnapA!.maxEnergyJoules === undefined, "Client A must NOT receive Client B's maxEnergy");
  assert(ghostBFromSnapA!.currentStaminaSeconds === undefined, "Client A must NOT receive Client B's stamina");
  assert(ghostBFromSnapA!.maxStaminaSeconds === undefined, "Client A must NOT receive Client B's maxStamina");
  assert(ghostBFromSnapA!.currentWattage === undefined, "Client A must NOT receive Client B's wattage");

  // But Client A should still receive Client B's public attributes (position, HP, color, etc.)
  assert(ghostBFromSnapA!.currentHp !== undefined, "Client A should receive Client B's HP for public health bar");
  assert(ghostBFromSnapA!.x !== undefined && ghostBFromSnapA!.y !== undefined, "Client A should receive Client B's position");

  console.log("  ✅ GhostSnapshot telemetry privacy verified: energy/stamina is strictly filtered for other clients.");
}

console.log("🎉 All tests passed successfully!");
