import { Character } from '../src/character/Character.js';
import { Arena } from '../src/engine/Arena.js';

console.log('=== TEST: Sprint Detoggle & Base Speed Floor ===\n');

const arena = new Arena();

// Test 1: Full sprint power available
{
  const char = new Character();
  arena.entities = [char];

  char.isSprinting = true;
  const dt = 1 / 60;
  // Move forward
  char.updateCharacter(dt, { x: 0, y: 1 }, false, null, arena, false);

  const speed = Math.hypot(char.velocity.x, char.velocity.y);
  console.log(`[Test 1] Full power sprint: isSprinting=${char.isSprinting}, speed=${speed.toFixed(2)}, livePower=${char.energyBus?.livePowerDraw.toFixed(1)}W`);
  if (!char.isSprinting) {
    throw new Error('Test 1 failed: character should be sprinting with full power');
  }
}

// Test 2: Low power budget (below threshold needed to beat base walk speed)
{
  const char = new Character();
  arena.entities = [char];

  // Set bus max power to 50W (below the ~98W needed to exceed base walk in sprint gait)
  char.energyBus.maxPowerProp.set(50.0, char.properties);
  char.isSprinting = true;

  const dt = 1 / 60;
  char.updateCharacter(dt, { x: 0, y: 1 }, false, null, arena, false);

  console.log(`[Test 2] Low power bus (50W): isSprinting=${char.isSprinting}, livePower=${char.energyBus?.livePowerDraw.toFixed(1)}W`);
  if (char.isSprinting) {
    throw new Error('Test 2 failed: character should have detoggled sprint because 50W cannot exceed base speed');
  }
  if (char.energyBus.livePowerDraw > 0.001) {
    throw new Error(`Test 2 failed: 0W should be drawn when detoggled to free walk, got ${char.energyBus.livePowerDraw}W`);
  }
}

// Test 3: Depleted stamina auto-detoggle
{
  const char = new Character();
  arena.entities = [char];

  // Zero stamina
  char.energyBus.currentStaminaProp.set(0, char.properties);
  char.energyBus.isExhausted = true;
  char.isSprinting = true;

  const dt = 1 / 60;
  char.updateCharacter(dt, { x: 0, y: 1 }, false, null, arena, false);

  console.log(`[Test 3] Zero stamina: isSprinting=${char.isSprinting}, livePower=${char.energyBus?.livePowerDraw.toFixed(1)}W`);
  if (char.isSprinting) {
    throw new Error('Test 3 failed: sprint should be detoggled when exhausted');
  }
}

// Test 4: Verify continuous movement speed never drops below base walk speed (5.20 u/s) during sprint drain
{
  const char = new Character();
  arena.entities = [char];

  // Give very low stamina (0.05s) so it drains and detoggles in 3 frames
  char.energyBus.currentStaminaProp.set(0.05, char.properties);
  char.isSprinting = true;

  const dt = 1 / 60;
  const speeds: number[] = [];

  for (let tick = 0; tick < 60; tick++) {
    char.updateCharacter(dt, { x: 0, y: 1 }, false, null, arena, false);
    // integrate velocity into speed tracking
    speeds.push(Math.hypot(char.velocity.x, char.velocity.y));
  }

  const finalSpeed = speeds[speeds.length - 1];
  console.log(`[Test 4] Transition from sprint to detoggled walk: finalSpeed=${finalSpeed.toFixed(2)}, isSprinting=${char.isSprinting}`);
  
  if (char.isSprinting) {
    throw new Error('Test 4 failed: sprint should have detoggled once stamina ran out');
  }

  // Accelerating up to base walk speed: target speed must be >= 5.20
  const maxWalk = char.walkingModule.maxWalkSpeedProp.get(char.properties);
  if (Math.abs(finalSpeed - maxWalk) > 0.1) {
    throw new Error(`Test 4 failed: final speed should match base walk speed (${maxWalk}), got ${finalSpeed}`);
  }
}

// Test 5: Partial power between base speed and full sprint (e.g. 130W)
{
  const char = new Character();
  arena.entities = [char];

  // Set bus max power to 130W (between ~98W base and ~152W sprint)
  char.energyBus.maxPowerProp.set(130.0, char.properties);
  char.isSprinting = true;

  const dt = 1 / 60;
  // Run several ticks to reach steady speed
  for (let i = 0; i < 40; i++) {
    char.updateCharacter(dt, { x: 0, y: 1 }, false, null, arena, false);
  }

  const speed = Math.hypot(char.velocity.x, char.velocity.y);
  console.log(`[Test 5] Intermediate power (130W): isSprinting=${char.isSprinting}, speed=${speed.toFixed(2)}, livePower=${char.energyBus?.livePowerDraw.toFixed(1)}W`);
  
  if (!char.isSprinting) {
    throw new Error('Test 5 failed: character should still be sprinting at 130W');
  }
  // Speed should be strictly higher than base walk (5.20) and lower than max sprint (8.06)
  if (speed <= 5.25 || speed >= 8.00) {
    throw new Error(`Test 5 failed: speed should be intermediate between 5.20 and 8.06, got ${speed}`);
  }
}

console.log('\n ALL SPRINT DETOGGLE & SPEED FLOOR TESTS PASSED!\n');
