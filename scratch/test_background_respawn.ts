import { Character } from '../src/character/Character';
import { Arena } from '../src/engine/Arena';
import { PlayerManager } from '../src/engine/PlayerManager';
import { InputManager } from '../src/ui/InputManager';
import { HealthModule } from '../src/character/HealthModule';
import { DamageAuraModule } from '../src/engine/DamageAuraModule';
import { GameObject } from '../src/engine/GameObject';

console.log('=== TEST: Background Character Physics & Death/Respawn Simulation ===\n');

const arena = new Arena();
const inputManager = new InputManager({} as any, arena);
const playerManager = new PlayerManager({ arena, inputManager });

// Setup registered keyboard player
const char = new Character({ id: "p1", x: 5, y: 5, color: "#3b82f6" });
char.healthModule = new HealthModule({
  baseMaxHp: 100,
  maxHp: 100,
  currentHp: 10, // low HP so death happens quickly
  baseMaxHealRate: 0, // disable regen for test
  consumesEnergy: false,
});
playerManager.players.set("keyboard", {
  id: "keyboard",
  isKeyboard: true,
  character: char,
  controllerType: "keyboard",
});
arena.entities.push(char);

// Setup damage aura source object right at character position
const orb = new GameObject({
  id: "hazard-orb",
  position: { x: 5, y: 5, z: 0 },
  color: "#ef4444",
  damageAuraModule: new DamageAuraModule({
    damageRadius: 2.5,
    damageRate: 20.0, // 20 HP/s
  }),
});
arena.entities.push(orb);

// Simulate window blur / background state
inputManager.isKeyboardSuspended = true;

console.log(`Initial state: char HP = ${char.healthModule.getCurrentHp()}, pos = (${char.position.x}, ${char.position.y})`);
console.log(`Window is blurred: isKeyboardSuspended = ${inputManager.isKeyboardSuspended}`);

// Run physics frames for 1.0 second (60 ticks of 1/60s)
const dt = 1 / 60;
let respawned = false;
char.healthModule.onDeathRespawn = (entity, respawnPos) => {
  console.log(`onDeathRespawn callback fired! New pos: (${respawnPos.x}, ${respawnPos.y}, ${respawnPos.z})`);
  respawned = true;
};

for (let tick = 0; tick < 60; tick++) {
  arena.entities = [char, orb];
  // Update damage aura emitter
  orb.damageAuraModule.update(dt, orb, [char]);

  // Update players (which captures inputs and applies them)
  playerManager.updatePlayers(dt, [orb], false);

  if (respawned) break;
}

console.log(`Post-simulation: char HP = ${char.healthModule.getCurrentHp()}, pos = (${char.position.x}, ${char.position.y})`);
console.log(`Respawn triggered while window blurred: ${respawned}`);

if (!respawned) {
  console.error("FAIL: Character failed to respawn in the background!");
  process.exit(1);
} else if (char.healthModule.getCurrentHp() < 100) {
  console.error("FAIL: Health was not restored to full on respawn!");
  process.exit(1);
} else {
  console.log("\nSUCCESS: Character smoothly took damage and respawned while window was blurred/backgrounded!");
}
