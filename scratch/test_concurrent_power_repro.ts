import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";

const arena = new Arena();
const char = new Character();
arena.entities = [char];

char.healthModule.currentHpProp.set(90, char.properties);
char.healthModule.maxHpProp.set(100, char.properties);
char.healthModule.consumesEnergy = true;

// Set stamina to 1.5s
char.energyBus.currentStaminaProp.set(1.5, char.properties);

for (let s = 1; s <= 10; s++) {
  for (let i = 0; i < 60; i++) {
    char.updateCharacter(1/60, { x: 0, y: 0 }, false, null, arena, false, arena.entities, false);
  }
  const curS = char.energyBus.getCurrentStamina(char.properties);
  const curW = char.energyBus.getCurrentWattage(char.properties);
  const hp = char.healthModule.getCurrentHp(char.properties);
  const ex = char.energyBus.isExhausted;
  console.log(`Sec ${s}: Stamina = ${curS.toFixed(2)}s, Watts = ${curW.toFixed(1)}W, HP = ${hp.toFixed(1)}, Exhausted = ${ex}`);
}
