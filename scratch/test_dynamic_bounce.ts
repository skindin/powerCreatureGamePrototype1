import { Arena } from "../src/engine/Arena.js";
import { GameObject } from "../src/engine/GameObject.js";

const arena = new Arena(20, 14, 1.0);
arena.gravity = 30.0;

// Test with gravity = 30 and gravity = 100
for (const grav of [30.0, 100.0]) {
  arena.gravity = grav;
  console.log(`\n=== Testing with Gravity = ${grav} ===`);
  const stone = new GameObject({
    id: "stone-1",
    name: "Light Blue Box",
    position: { x: 10.0, y: 4.0, z: 0 },
    mass: 0.7,
    colliderRadius: 0.26,
    color: "#38bdf8",
    bounceMod: 0.25,
    visualShape: "box",
  });

  stone.velocity.x = 2.0;
  stone.verticalVelocity = -0.01;

  const dt = 1 / 60;
  const bounceThreshold = Math.max(0.25, 1.25 * arena.gravity * dt);
  console.log(`bounceThreshold = ${bounceThreshold.toFixed(4)}`);

  // Let's run 20 ticks
  for (let tick = 1; tick <= 20; tick++) {
    // Custom test of the fix
    const surfaceHeight = 0;
    if (stone.hasGravity && stone.hasVerticalVelocity) {
      if (stone.position.z > surfaceHeight || stone.verticalVelocity !== 0) {
        stone.verticalVelocity -= arena.gravity * dt;
        stone.position.z += stone.verticalVelocity * dt;

        if (stone.position.z <= surfaceHeight) {
          stone.position.z = surfaceHeight;
          if (stone.hasVerticalBounce && stone.bounceMod !== null && stone.bounceMod > 0 && Math.abs(stone.verticalVelocity) > bounceThreshold) {
            stone.verticalVelocity = -stone.verticalVelocity * stone.bounceMod;
          } else {
            stone.verticalVelocity = 0;
          }
        }
      }
    }

    const isResting = Math.abs(stone.position.z - surfaceHeight) <= 0.01 && Math.abs(stone.verticalVelocity) <= 0.05;
    if (isResting && stone.hasFriction) {
      const speed = Math.hypot(stone.velocity.x, stone.velocity.y);
      if (speed > 0) {
        const staticThreshold = arena.staticFrictionThreshold * stone.staticGroundFrictionMod;
        if (speed < staticThreshold) {
          stone.velocity.x = 0;
          stone.velocity.y = 0;
        } else {
          const frictionForce = arena.frictionCoeff * stone.dynamicGroundFrictionMod * dt;
          const newSpeed = Math.max(0, speed - frictionForce);
          const ratio = newSpeed / speed;
          stone.velocity.x *= ratio;
          stone.velocity.y *= ratio;
        }
      }
    }

    if (tick <= 5 || tick === 15 || tick === 20) {
      console.log(`Tick ${tick}: z=${stone.position.z.toFixed(4)}, vz=${stone.verticalVelocity.toFixed(4)}, vx=${stone.velocity.x.toFixed(4)}, isResting=${isResting}`);
    }
  }
}
