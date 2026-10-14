import { Character } from "../src/character/Character.js";
import { HealthModule } from "../src/character/HealthModule.js";
import { DamageAuraModule } from "../src/engine/DamageAuraModule.js";
import { DamageSolverModule } from "../src/engine/DamageSolverModule.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

console.log("=== Testing Health Modifiers System ===");

// 1. Initialize character with HealthModule
const char = new Character("char_test", 5, 5);
assert(char.healthModule !== undefined, "Character has healthModule");
const hm = char.healthModule!;

// Initially full HP (100 / 100), no active modifiers
assert(hm.getCurrentHp(char.properties) === 100, "Initial HP is 100");
assert(hm.getActiveModifiers().length === 0, "No initial health modifiers");

// 2. Test Instant Damage (e.g. Collision Impact)
hm.takeDamage(15, char.properties, {
  id: "impact_damage",
  name: "Impact",
  type: "instant",
  amount: 15,
  color: "#f87171",
  isHeal: false,
});

assert(hm.getCurrentHp(char.properties) === 85, "HP is 85 after 15 impact damage");
let mods = hm.getActiveModifiers();
assert(mods.length === 1, "1 active modifier registered");
assert(mods[0].id === "impact_damage", "Modifier id is impact_damage");
assert(mods[0].name === "Impact", "Modifier name is Impact");
assert(mods[0].type === "instant", "Modifier type is instant");
assert(mods[0].rateOrAmount === 15, "Modifier amount is 15");
console.log("✓ Instant impact damage modifier registered successfully");

// 3. Test Continuous Damage (e.g. Damage Aura from hazard orb)
const auraMod = new DamageAuraModule({ damageRadius: 3.0, damageRate: 20.0 });
const hazardSource = {
  position: { x: 5, y: 5, z: 0 },
  properties: undefined as any,
};

// Simulate aura frame update (dt = 0.016s)
auraMod.update(0.016, hazardSource as any, [char]);

mods = hm.getActiveModifiers();
const auraActive = mods.find(m => m.id === "damage_aura");
assert(auraActive !== undefined, "Damage Aura continuous modifier active");
assert(auraActive!.name === "Aura", "Aura modifier name is Aura");
assert(auraActive!.type === "continuous", "Aura modifier is continuous");
assert(auraActive!.rateOrAmount === 20.0, "Aura rate is 20 HP/s");
console.log("✓ Damage aura continuous modifier registered successfully");

// 4. Test Passive Regeneration (Continuous HOT while wounded)
// Char is at ~84.68 HP, wounded. Passive regen is enabled.
hm.update(0.016, char);

mods = hm.getActiveModifiers();
const regenActive = mods.find(m => m.id === "passive_heal");
assert(regenActive !== undefined, "Passive heal modifier active while wounded");
assert(regenActive!.name === "Heal", "Regen modifier name is Heal");
assert(regenActive!.type === "continuous", "Regen modifier is continuous");
assert(regenActive!.isHeal === true, "Regen isHeal is true");
assert(regenActive!.rateOrAmount === 10.0, "Regen rate is 10 HP/s");
console.log("✓ Passive regeneration continuous modifier registered successfully");

// 5. Test Multiple Modifiers Concurrently Active
// Both Damage Aura (20 HP/s), Passive Heal (10 HP/s), and Impact Burst (15 HP) are co-existing
assert(mods.some(m => m.id === "damage_aura"), "Aura co-exists");
assert(mods.some(m => m.id === "passive_heal"), "Heal co-exists");
assert(mods.some(m => m.id === "impact_damage"), "Impact co-exists");
console.log("✓ Concurrent damage over time, instant damage, and passive healing co-exist cleanly");

// 6. Test Instant Modifier Expiration after 0.55s
hm.update(0.6, char);
mods = hm.getActiveModifiers();
assert(!mods.some(m => m.id === "impact_damage"), "Instant impact damage modifier expired after duration");
console.log("✓ Instant burst modifier cleanly expired after decay duration");

// 7. Test Continuous Aura Expiration when leaving Aura
// In this frame, player is outside aura (auraMod.update not called on char)
hm.update(0.016, char);
mods = hm.getActiveModifiers();
assert(!mods.some(m => m.id === "damage_aura"), "Aura modifier cleanly expired when leaving aura range");
console.log("✓ Continuous aura modifier cleanly expired when not reported");

// 8. Test Passive Regeneration Expiration when reaching full health
hm.currentHpProp.set(100, char.properties);
hm.update(0.016, char);
mods = hm.getActiveModifiers();
assert(!mods.some(m => m.id === "passive_heal"), "Passive heal modifier cleanly expired at full HP");
console.log("✓ Passive heal modifier cleanly expired at full HP");

// 9. Test Instant Heal (e.g. Potion or Test Button)
hm.takeDamage(30, char.properties);
hm.heal(20, char.properties, {
  id: "instant_heal",
  name: "Heal",
  type: "instant",
  amount: 20,
  color: "#22c55e",
  isHeal: true,
});
mods = hm.getActiveModifiers();
const instantHeal = mods.find(m => m.id === "instant_heal");
assert(instantHeal !== undefined, "Instant heal registered");
assert(instantHeal!.rateOrAmount === 20, "Instant heal amount is 20");
assert(instantHeal!.isHeal === true, "Instant heal isHeal is true");
console.log("✓ Instant heal modifier registered successfully");

console.log("\nALL HEALTH MODIFIERS & HUD TESTS PASSED 100%!");
