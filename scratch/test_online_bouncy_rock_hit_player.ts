import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Arena } from "../src/engine/Arena.js";
import { GameLoop } from "../src/engine/GameLoop.js";
import { CollisionResolver } from "../src/engine/physics/CollisionResolver.js";
import { GhostEntityState } from "../src/network/UniversalProtocol.js";

console.log("=== Testing Online Bouncy Rock Hit Player & Smooth Server Sync ===");

const arena = new Arena(30, 20);

// Client 1 (Thrower) with character A at (5, 7)
const charA = new Character({ x: 5.0, y: 7.0, mass: 1.2, colliderRadius: 0.44 });

// Client 2 (Target) with character B at (8, 7)
const charB = new Character({ x: 8.0, y: 7.0, mass: 1.2, colliderRadius: 0.44 });

const bouncyRock = new GameObject({
  id: "bouncy-rock-1",
  name: "Bouncy Rock",
  position: { x: 5.0, y: 7.0, z: 0.45 },
  mass: 0.8,
  colliderRadius: 0.35,
  hasBounce: true,
  bounceMod: 0.7,
});

import { InputManager } from "../src/ui/InputManager.js";

const gameLoop = new GameLoop({
  arena,
  character: charA,
  canvas: { width: 800, height: 600, getContext: () => null } as any,
  inputManager: new InputManager({ width: 800, height: 600, addEventListener: () => {} } as any, arena),
});
gameLoop.objects = [bouncyRock];

// Add remote player B to gameLoop
gameLoop.playerManager.remotePlayers.set("client-2", charB);

// Char A picks up bouncy rock and throws it at Char B (target x=8, y=7)
charA.pickupModule.pickup(charA, bouncyRock);
charA.throwModule.throwHeldObject(charA, 8.0, 7.0, arena);

console.log(`Bouncy rock launched: vx=${bouncyRock.velocity.x.toFixed(2)}, vy=${bouncyRock.velocity.y.toFixed(2)}, vz=${bouncyRock.verticalVelocity.toFixed(2)}`);

if (bouncyRock.velocity.x <= 5.0) {
  throw new Error("Bouncy rock was not thrown with fast direct velocity!");
}

let hitOccurred = false;
let postBounceRockVx = 0;
let postBounceCharBVx = 0;

for (let tick = 1; tick <= 60; tick++) {
  // Update rock position
  bouncyRock.updatePosition(1 / 60, arena);

  // Resolve collision between rock and charB
  const collided = CollisionResolver.resolvePairDiscreteTOI(bouncyRock, charB, arena, 1 / 60);
  if (collided && !hitOccurred) {
    hitOccurred = true;
    postBounceRockVx = bouncyRock.velocity.x;
    postBounceCharBVx = charB.velocity.x;
    console.log(`Hit occurred at tick ${tick}! Rock pos=(${bouncyRock.position.x.toFixed(2)}, ${bouncyRock.position.y.toFixed(2)}), rock vx=${bouncyRock.velocity.x.toFixed(2)}, charB vx=${charB.velocity.x.toFixed(2)}`);
  }

  // Simulate server authoritative snapshot arriving for bouncy rock
  // On server, rock hit charB at approximately the same time, producing similar bounce
  if (hitOccurred) {
    const serverObjSnap: GhostEntityState = {
      id: "bouncy-rock-1",
      name: "Bouncy Rock",
      x: bouncyRock.position.x + (Math.random() - 0.5) * 0.05,
      y: bouncyRock.position.y,
      z: bouncyRock.position.z,
      vx: bouncyRock.velocity.x,
      vy: bouncyRock.velocity.y,
      vz: bouncyRock.verticalVelocity,
      isHeld: false,
      heldBy: null,
      isGrounded: false,
      radius: 0.35,
    };

    gameLoop.syncAuthoritativeObjects([serverObjSnap], "thrower-client");

    // Check that rock velocity didn't glitch or flip direction wildly
    if (Math.sign(bouncyRock.velocity.x) !== Math.sign(postBounceRockVx) && Math.abs(bouncyRock.velocity.x) > 0.5) {
      throw new Error(`Rock velocity flipped direction abruptly! vx=${bouncyRock.velocity.x}`);
    }
  }

  if (hitOccurred && tick > 35) break;
}

if (!hitOccurred) {
  throw new Error("Bouncy rock failed to hit Char B!");
}

if (postBounceCharBVx <= 1.0) {
  throw new Error("Char B did not receive momentum impulse from the bouncy rock!");
}

console.log(`Char B was smoothly knocked back: vx=${postBounceCharBVx.toFixed(2)}`);
console.log(`Bouncy rock smoothly rebounded: vx=${postBounceRockVx.toFixed(2)}`);
console.log("🎉 ALL ONLINE BOUNCY ROCK HIT PLAYER TESTS PASSED!");
