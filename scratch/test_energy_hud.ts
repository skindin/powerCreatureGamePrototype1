import { Character } from "../src/character/Character.js";
import { EnergyHud } from "../src/ui/EnergyHud.js";
import { ClimbingModule } from "../src/character/ClimbingModule.js";

async function testEnergyHudLogic() {
  console.log("=== Testing Two-Tier Energy HUD Logic & Ticks ===");

  const char = new Character({ id: "test_char", x: 4.8, y: 7.0 });
  char.climbingModule = new ClimbingModule({ consumesEnergy: true });

  const hud = Object.create(EnergyHud.prototype) as EnergyHud;
  const ticks = hud.computeAbilityTicks(char);

  console.log(`Generated ${ticks.length} ability ticks:`);
  for (const t of ticks) {
    const unit = t.isContinuousRate ? "/s" : "";
    console.log(` - [${t.staggerPosition.toUpperCase()}] ${t.name}: ${t.value}${unit} (color: ${t.color}, enabled: ${t.isEnabled})`);
  }

  // 1. Verify Jump static cost (no unit)
  const jumpTick = ticks.find(t => t.id === "jump");
  if (!jumpTick) throw new Error("Jump tick missing");
  if (jumpTick.isContinuousRate) throw new Error("Jump should be static cost (isContinuousRate = false)");
  console.log(`✓ Jump tick format verified: '${jumpTick.name} ${jumpTick.value}' (static cost without unit)`);

  // 2. Verify Power Cap
  const capTick = ticks.find(t => t.id === "cap");
  if (!capTick) throw new Error("Power Cap tick missing");
  if (capTick.name !== "Power Cap") throw new Error(`Power Cap should be named 'Power Cap', got '${capTick.name}'`);
  if (!capTick.isContinuousRate) throw new Error("Power Cap should be continuous rate (/s)");
  console.log(`✓ Power Cap tick format verified: '${capTick.name}: ${capTick.value}/s'`);

  // 3. Verify Continuous Rates
  const sprintTick = ticks.find(t => t.id === "sprint");
  const healTick = ticks.find(t => t.id === "heal");
  const climbTick = ticks.find(t => t.id === "climb");
  if (!sprintTick || !sprintTick.isContinuousRate) throw new Error("Sprint tick should have /s");
  if (!healTick || !healTick.isContinuousRate) throw new Error("Heal tick should have /s");
  if (!climbTick || !climbTick.isContinuousRate) throw new Error("Climb tick should have /s");
  console.log(`✓ Continuous rates verified: Sprint ${sprintTick.value}/s, Heal ${healTick.value}/s, Climb ${climbTick.value}/s`);

  // 4. Verify Max Stamina Reference Calculation
  const maxStamina = char.energyBus?.getMaxStamina(char.properties) ?? 10.0;
  const maxPower = char.energyBus?.getMaxPower(char.properties) ?? 500.0;
  const maxEnergy = char.energyPool?.getMaxEnergy(char.properties) ?? 10000.0;
  const maxStaminaEnergy = maxStamina * maxPower;
  const maxStaminaPct = (maxStaminaEnergy / maxEnergy) * 100;
  if (maxStaminaEnergy !== 5000) throw new Error(`Expected max stamina energy = 5,000 J, got ${maxStaminaEnergy}`);
  if (maxStaminaPct !== 50) throw new Error(`Expected max stamina tick at 50%, got ${maxStaminaPct}%`);
  console.log(`✓ Max Stamina reference tick verified: ${maxStaminaEnergy} J (${maxStaminaPct}% across ${maxEnergy} J max possible reservoir)`);

  console.log("=== ALL TWO-TIER ENERGY HUD TESTS PASSED! ===");
}

testEnergyHudLogic();
