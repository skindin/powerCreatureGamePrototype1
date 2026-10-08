import { DynamicProperty, ObjectPropertiesRegistry } from '../src/engine/properties/DynamicProperty.js';

function runTests() {
  console.log('--- Testing DynamicProperty & ObjectPropertiesRegistry ---');

  const registry = new ObjectPropertiesRegistry();

  // Test 1: Add locally unique properties
  const addedArm = registry.add('ArmStrength', 2.5);
  console.assert(addedArm === true, 'Should add ArmStrength');
  const addedDuplicate = registry.add('ArmStrength', 3.0);
  console.assert(addedDuplicate === false, 'Should reject duplicate ArmStrength');

  // Test 2: Literal property socket
  const throwPower = new DynamicProperty(1.5);
  console.assert(throwPower.get(registry) === 1.5, 'Literal value should be 1.5');
  throwPower.set(2.0, registry);
  console.assert(throwPower.get(registry) === 2.0, 'Updated literal value should be 2.0');

  // Test 3: Link to reference property
  throwPower.link('ArmStrength', registry);
  console.assert(throwPower.isReference === true, 'Should be in reference mode');
  console.assert(throwPower.get(registry) === 2.5, 'Should resolve ArmStrength (2.5)');

  // Test 4: Setting value through socket updates shared reference
  const climbPower = new DynamicProperty(1.0);
  climbPower.link('ArmStrength', registry);
  console.assert(climbPower.get(registry) === 2.5, 'Climb power should resolve 2.5');

  throwPower.set(3.5, registry);
  console.assert(registry.get('ArmStrength') === 3.5, 'Registry ArmStrength should now be 3.5');
  console.assert(climbPower.get(registry) === 3.5, 'Climb power should also now reflect 3.5');

  // Test 5: Rename propagation
  const renamed = registry.rename('ArmStrength', 'UpperBodyPower', [throwPower, climbPower]);
  console.assert(renamed === true, 'Should rename successfully');
  console.assert(throwPower.referenceKey === 'UpperBodyPower', 'throwPower should point to UpperBodyPower');
  console.assert(climbPower.referenceKey === 'UpperBodyPower', 'climbPower should point to UpperBodyPower');
  console.assert(throwPower.get(registry) === 3.5, 'Value still resolved after rename');

  // Test 6: Delete -> Limbo state
  registry.delete('UpperBodyPower');
  console.assert(throwPower.isLimbo(registry) === true, 'throwPower should be in Limbo');
  console.assert(climbPower.isLimbo(registry) === true, 'climbPower should be in Limbo');
  // In limbo, returns fallback literal
  console.assert(typeof throwPower.get(registry) === 'number', 'Still safely returns a number in limbo');

  // Test 7: Re-creating property with same name resolves limbo automatically
  registry.add('UpperBodyPower', 4.0);
  console.assert(throwPower.isLimbo(registry) === false, 'throwPower limbo resolved');
  console.assert(throwPower.get(registry) === 4.0, 'throwPower now reads recreated property');
  console.assert(climbPower.get(registry) === 4.0, 'climbPower now reads recreated property');

  console.log('✅ ALL DYNAMIC PROPERTY TESTS PASSED!');
}

runTests();
