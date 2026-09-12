import { Arena } from "./engine/Arena.js";
import { Character } from "./character/Character.js";
import { GameObject } from "./engine/GameObject.js";
import { RollModule } from "./engine/RollModule.js";
import { Renderer } from "./engine/Renderer.js";
import { InputManager } from "./ui/InputManager.js";
import { DevPanel } from "./ui/DevPanel.js";
import { GameLoop } from "./engine/GameLoop.js";

function bootstrap(): void {
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
  const devContainer = document.getElementById("dev-sidebar") as HTMLElement;

  if (!canvas || !devContainer) {
    console.error("Missing canvas or dev-sidebar container in DOM");
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("Failed to acquire 2D canvas context");
    return;
  }

  // 1. Initialize Arena (20 units wide x 14 units tall, 1 wall = 1 unit)
  const arena = new Arena(20, 14, 1.0);
  canvas.width = 1000;
  canvas.height = 700;

  // 2. Initialize Base Character in unit coordinates
  const character = new Character({
    x: 4.8,
    y: 7.0,
    color: "#f59e0b", // Amber body
    colliderRadius: 0.44,
    mass: 1.2,
    strength: 1.0,
  });

  // 3. Initialize Initial Freebody Objects in unit coordinates
  const objects: GameObject[] = [
    new GameObject({
      id: "stone-1",
      name: "Light Blue Box",
      position: { x: 6.8, y: 4.4, z: 0 },
      mass: 0.7,
      colliderRadius: 0.26,
      color: "#38bdf8",
      bounceMod: 0.25,
      visualShape: "box",
    }),
    new GameObject({
      id: "boulder-1",
      name: "Heavy Red Box",
      position: { x: 7.0, y: 9.2, z: 0 },
      mass: 2.6,
      colliderRadius: 0.40,
      color: "#f87171",
      bounceMod: 0.05,
      visualShape: "box",
    }),
    new GameObject({
      id: "bouncy-1",
      name: "Super Bouncy Ball",
      position: { x: 5.2, y: 3.0, z: 0.6 },
      mass: 0.5,
      colliderRadius: 0.24,
      color: "#4ade80",
      bounceMod: 0.85,
      verticalVelocity: 1.0,
    }),
    new GameObject({
      id: "rolling-1",
      name: "Rolling Ball",
      position: { x: 13.6, y: 7.0, z: 0 },
      velocity: { x: 4.5, y: 1.5 },
      mass: 0.6,
      colliderRadius: 0.28,
      color: "#a855f7",
      bounceMod: 0.95,
      rollModule: new RollModule({
        rollResistance: 0.0,
        angularVelocity: { x: -1.5 / 0.28, y: 4.5 / 0.28, z: 0 },
      }),
    }),
  ];

  // Synchronize initial entities with the arena walls so any entity placed on a wall starts at wall elevation (Layer 2)
  arena.syncEntitiesWithWalls([character, ...objects]);

  // 4. Initialize Renderer & Dev Panel
  const renderer = new Renderer(ctx);
  const devPanel = new DevPanel({
    container: devContainer,
    character,
    arena,
    objects,
    onSpawnObject: (newObj) => {
      arena.syncEntitiesWithWalls([newObj]);
      objects.push(newObj);
      devPanel.updateSelectorOptions();
    },
    onDeleteObject: (targetObj) => {
      const idx = objects.indexOf(targetObj);
      if (idx !== -1) {
        objects.splice(idx, 1);
      }
      devPanel.updateSelectorOptions();
    },
    onClearObjects: () => {
      if (character.heldObject) {
        character.heldObject.isHeld = false;
        character.heldObject.heldBy = null;
        character.heldObject = null;
      }
      objects.length = 0;
      devPanel.updateSelectorOptions();
    },
  });

  // 5. Initialize Input Manager with Dev Panel interaction
  const inputManager = new InputManager(canvas, arena);
  inputManager.handleInteractions(character, arena, objects, devPanel);
  devPanel.onSelectionChange = (entity) => {
    inputManager.selectedCanvasEntity = entity;
  };

  // 6. Start Fixed-Timestep Game Loop
  const gameLoop = new GameLoop({
    arena,
    character,
    objects,
    renderer,
    inputManager,
    devPanel,
  });

  gameLoop.start();
  console.log("🚀 Power Creature Game Prototype 1 (Phase 1.1) running!");
}

window.addEventListener("DOMContentLoaded", bootstrap);
