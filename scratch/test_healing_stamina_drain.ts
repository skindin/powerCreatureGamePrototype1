import { Character } from '../src/character/Character.js';
import { Arena } from '../src/engine/Arena.js';

console.log('=== TEST: Healing & Locomotion Unified Stamina Drain ===\n');

const arena = new Arena();

// Test 1: Damaged and healing - verify stamina decreases proportionally
{
  const char = new Character();
  arena.entities = [char];

  // Bus has 500W capacity, 10.0s stamina
  const initialStamina = char.energyBus.getCurrentStamina(char.properties);
  console.log(`Initial stamina: ${initialStamina.toFixed(2)}s`);

  // Wound character to 50 HP
  char.healthModule.currentHpProp.set(50.0, char.properties);
  char.healthModule.consumesEnergy = true;

  const dt = 1 / 60;
  // Run 1 second (60 frames) of stationary healing
  for (let i = 0; i < 60; i++) {
    char.updateCharacter(dt, { x: 0, y: 0 }, false, null, arena, false);
  }

  const staminaAfter1s = char.energyBus.getCurrentStamina(char.properties);
  const hpAfter1s = char.healthModule.getCurrentHp(char.properties);
  const wattage = char.energyBus.getCurrentWattage(char.properties);

  console.log(`After 1s stationary healing: HP=${hpAfter1s.toFixed(1)}, stamina=${staminaAfter1s.toFixed(3)}s, wattage=${wattage.toFixed(1)}W`);

  // At 250W on a 500W bus, expected stamina drain is (250 / 500) * 1.0s = 0.5s
  const drained = initialStamina - staminaAfter1s;
  console.log(`Stamina drained over 1s: ${drained.toFixed(3)}s (Expected ~0.500s)`);

  if (drained < 0.45 || drained > 0.55) {
    throw new Error(`Test 1 failed: Expected stamina drain ~0.50s, got ${drained.toFixed(3)}s`);
  }
}

// Test 2: Full healing recovery - stamina regenerates back to 10s once healed
{
  const char = new Character();
  arena.entities = [char];

  // Minor wound: 95 HP (needs only 0.5s to heal 5 HP at 10 HP/s)
  char.healthModule.currentHpProp.set(95.0, char.properties);
  char.healthModule.consumesEnergy = true;

  const dt = 1 / 60;
  // Run 3 seconds: 0.5s healing (drains 0.25s stamina to 9.75s), then 2.5s resting (recovers back to 10.0s)
  for (let i = 0; i < 180; i++) {
    char.updateCharacter(dt, { x: 0, y: 0 }, false, null, arena, false);
  }

  const finalStamina = char.energyBus.getCurrentStamina(char.properties);
  const finalHp = char.healthModule.getCurrentHp(char.properties);
  const finalWatts = char.energyBus.getCurrentWattage(char.properties);

  console.log(`[Test 2] After full recovery: HP=${finalHp.toFixed(1)}, stamina=${finalStamina.toFixed(2)}s, wattage=${finalWatts.toFixed(1)}W`);

  if (finalHp < 100.0) {
    throw new Error(`Test 2 failed: Character should have fully healed to 100 HP, got ${finalHp}`);
  }
  if (finalStamina < 9.99) {
    throw new Error(`Test 2 failed: Stamina should have regenerated back to 10.0s, got ${finalStamina}`);
  }
  if (finalWatts > 0.001) {
    throw new Error(`Test 2 failed: Wattage should be 0W once fully healed, got ${finalWatts}`);
  }
}

// Test 3: Concurrent sprint and heal drains stamina at combined rate
{
  const char = new Character();
  arena.entities = [char];

  char.healthModule.currentHpProp.set(50.0, char.properties);
  char.healthModule.consumesEnergy = true;
  char.isSprinting = true;

  const dt = 1 / 60;
  // Run 1 second of concurrent sprinting and healing
  for (let i = 0; i < 60; i++) {
    char.updateCharacter(dt, { x: 1, y: 0 }, false, null, arena, false);
  }

  const curS = char.energyBus.getCurrentStamina(char.properties);
  const drained = 10.0 - curS;
  // Sprint ~151.8W + heal 250W = ~401.8W on 500W bus => drain is (401.8 / 500) * 1.0 = ~0.804s
  console.log(`[Test 3] Concurrent sprint & heal drain: ${drained.toFixed(3)}s (Expected ~0.804s)`);

  if (drained < 0.75 || drained > 0.85) {
    throw new Error(`Test 3 failed: Expected combined stamina drain ~0.804s, got ${drained.toFixed(3)}s`);
  }
}

console.log('\n ALL HEALING & LOCOMOTION UNIFIED STAMINA TESTS PASSED!\n');
