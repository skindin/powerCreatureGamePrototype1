import fs from 'fs';

// Read Antigravity hook input from stdin
let rawInput = '';
try {
  rawInput = fs.readFileSync(0, 'utf-8');
} catch {
  // If reading fails, default to allow
  console.log(JSON.stringify({ decision: 'allow' }));
  process.exit(0);
}

let payload;
try {
  payload = JSON.parse(rawInput);
} catch {
  console.log(JSON.stringify({ decision: 'allow' }));
  process.exit(0);
}

const targetFile = payload.toolCall?.args?.TargetFile;

if (!targetFile) {
  console.log(JSON.stringify({ decision: 'allow' }));
  process.exit(0);
}

// Normalize path to forward slashes for cross-platform matching
const normalized = targetFile.replace(/\\/g, '/');

// Tier 1: 🔒 Sealed & Read-Only (Feature-Complete Modules)
const TIER_1_SEALED = [
  'src/engine/MassModule.ts',
  'src/engine/FrictionModule.ts',
  'src/engine/BounceModule.ts',
  'src/engine/RollModule.ts',
  'src/engine/GravityModule.ts',
  'src/engine/VerticalPositionModule.ts',
  'src/engine/Arena.ts',
  'src/engine/ColliderModule.ts',
  'src/engine/RigidbodyModule.ts',
  'src/character/StrengthModule.ts',
  'src/character/JumpModule.ts',
  'src/character/WallEdgeAssistModule.ts',
  'src/engine/physics/StateHistoryBuffer.ts',
  'src/engine/physics/IslandManager.ts'
];

// Tier 2: 🛡️ Protected Modules (Require User Permission)
const TIER_2_PROTECTED = [
  'src/character/WalkingModule.ts',
  'src/character/ClimbingModule.ts',
  'src/character/PickupModule.ts',
  'src/character/ThrowModule.ts',
  'src/engine/physics/Snapshot.ts',
  'src/engine/physics/RemoteEntityInterpolator.ts',
  'src/engine/physics/PredictionReconciliation.ts'
];

// Check Tier 1 match -> Hard Deny
const matchedTier1 = TIER_1_SEALED.find(file => normalized.endsWith(file));
if (matchedTier1) {
  console.log(JSON.stringify({
    decision: 'deny',
    reason: `🛑 BLOCKED BY ANTIGRAVITY HOOK: ${matchedTier1} is a sealed Tier 1 module. You MUST NOT edit this file.`
  }));
  process.exit(0);
}

// Check Tier 2 match -> Force UI Prompt to User
const matchedTier2 = TIER_2_PROTECTED.find(file => normalized.endsWith(file));
if (matchedTier2) {
  console.log(JSON.stringify({
    decision: 'force_ask',
    reason: `🛡️ PROTECTED TIER 2 MODULE: ${matchedTier2} requires explicit user approval before modification.`
  }));
  process.exit(0);
}

// All other files permitted
console.log(JSON.stringify({ decision: 'allow' }));
process.exit(0);
