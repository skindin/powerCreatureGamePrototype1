import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { InputManager } from "../src/ui/InputManager.js";
import { PlayerManager } from "../src/engine/PlayerManager.js";

async function testThrowControls(): Promise<void> {
  console.log("🧪 Testing Throw Control (Local & Online Modes)...");

  const arena = new Arena(20, 14, 1.0);
  const hero = new Character({
    x: 5.0,
    y: 7.0,
    color: "#f59e0b",
    colliderRadius: 0.44,
    mass: 1.2,
    strength: 1.0,
  });
  const rock = new GameObject({
    id: "test-rock",
    name: "Rock",
    position: { x: 5.5, y: 7.0, z: 0 },
    mass: 1.0,
    colliderRadius: 0.3,
  });

  const canvas = {
    addEventListener: () => {},
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 700 }),
    style: {},
  } as any;

  const inputManager = new InputManager(canvas, arena);
  const playerManager = new PlayerManager({
    arena,
    inputManager,
    character: hero,
  });

  inputManager.handleInteractions(hero, arena, [rock], undefined, () => playerManager.allCharacters);

  // 1. Activate keyboard player
  inputManager.isKeyboardActive = true;
  playerManager.spawnKeyboardPlayer();

  // 2. Pick up the rock
  hero.pickupModule!.pickup(hero, rock);
  if (hero.heldObject !== rock) throw new Error("Hero failed to hold rock");
  console.log("✅ Hero is holding rock");

  // 3. User clicks mouse to throw at target (10, 7)
  inputManager.actualMousePos = { x: 10.0, y: 7.0 };
  inputManager.handleClick(10.0, 7.0);

  if (!inputManager.isKeyboardThrowRequested) {
    throw new Error("handleClick did NOT set isKeyboardThrowRequested!");
  }
  console.log("✅ handleClick set isKeyboardThrowRequested = true");

  // 4. PlayerManager captures inputs
  const inputs = playerManager.capturePlayerInputs(false, [rock]);
  const kbPkt = inputs.get("keyboard");
  if (!kbPkt) throw new Error("Missing keyboard input packet");
  if (!kbPkt.isThrow) throw new Error("Input packet isThrow is false!");
  console.log("✅ capturePlayerInputs captured isThrow = true");

  // 5. PlayerManager applies inputs
  playerManager.applyPlayerInputs(inputs, 1 / 60, [rock], false);

  if (hero.heldObject !== null) {
    throw new Error("Hero is still holding rock after throw!");
  }
  if (!rock.velocity || Math.hypot(rock.velocity.x, rock.velocity.y) < 1.0) {
    throw new Error(`Rock did not receive throw impulse: vx=${rock.velocity.x}, vy=${rock.velocity.y}`);
  }
  console.log(`✅ Rock successfully thrown! Velocity: vx=${rock.velocity.x.toFixed(2)}, vy=${rock.velocity.y.toFixed(2)}`);

  console.log("🎉 ALL THROW CONTROL TESTS PASSED 100%!");
}

testThrowControls().catch((err) => {
  console.error("❌ Throw control test failed:", err);
  process.exit(1);
});
