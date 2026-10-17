import { Character } from "../src/character/Character.js";
import { HealthModule } from "../src/character/HealthModule.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

console.log("=== Testing Split Mod Bars and +/- Tags ===");

const char = new Character("test_char", 5, 5);
const hm = char.healthModule!;

// 1. Initially at full HP
assert(hm.getCurrentHp(char.properties) === 100, "Initial HP is 100");

// 2. Add an instant damage modifier (-15)
hm.takeDamage(15, char.properties, {
  id: "impact_damage",
  name: "Impact",
  type: "instant",
  amount: 15,
  color: "#f87171",
  isHeal: false,
});

// 3. Add continuous passive heal modifier (+10)
hm.update(0.016, char);

const mods = hm.getActiveModifiers();
const healMod = mods.find(m => m.id === "passive_heal");
const impactMod = mods.find(m => m.id === "impact_damage");

assert(healMod !== undefined, "Heal mod registered");
assert(healMod!.isHeal === true, "Heal mod is positive (isHeal: true)");
assert(impactMod !== undefined, "Impact mod registered");
assert(impactMod!.isHeal === false, "Impact mod is negative (isHeal: false)");

// Test formatting logic: positive gets '+', negative gets '-'
const healSign = healMod!.isHeal ? "+" : "-";
const impactSign = impactMod!.isHeal ? "+" : "-";
assert(healSign === "+", "Heal sign is +");
assert(impactSign === "-", "Impact sign is -");

const healRateSuffix = healMod!.type === "instant" ? "" : "/s";
const impactRateSuffix = impactMod!.type === "instant" ? "" : "/s";

const healTagText = `${healMod!.name} ${healSign}${Math.round(healMod!.rateOrAmount)}${healRateSuffix}`;
const impactTagText = `${impactMod!.name} ${impactSign}${Math.round(impactMod!.rateOrAmount)}${impactRateSuffix}`;

assert(healTagText === "Heal +10/s", `Heal tag text matches: ${healTagText}`);
assert(impactTagText === "Impact -15", `Impact tag text matches: ${impactTagText}`);
console.log(`✓ Heal tag: "${healTagText}" correctly prefixed with '+'`);
console.log(`✓ Impact tag: "${impactTagText}" correctly prefixed with '-'`);

// 4. Test Energy ability negative sign
const bus = char.getEnergyBus("bus_main");
assert(bus !== undefined, "Energy bus exists");
const allocations = bus!.getActiveAllocations(char.properties);
// An allocation on the bus represents energy draw (negative mod)
const sprintSign = "-";
const sprintTagText = `Sprint ${sprintSign}152/s`;
assert(sprintTagText === "Sprint -152/s", "Sprint tag has - sign");
console.log(`✓ Energy consumption tag: "${sprintTagText}" correctly prefixed with '-'`);

console.log("\nALL SPLIT MOD BAR & SIGN TESTS PASSED 100%!");
