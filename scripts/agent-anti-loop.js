import fs from 'fs';
import path from 'path';

// Read JSON input from stdin
let inputData = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  inputData += chunk;
});

process.stdin.on('end', () => {
  try {
    const payload = inputData ? JSON.parse(inputData) : {};
    const toolCall = payload.toolCall || {};
    const toolName = toolCall.name || '';
    const args = toolCall.args || {};

    const targetPath = args.AbsolutePath || args.SearchPath || args.TargetFile || args.DirectoryPath || '';

    // File tracking state stored in scratch
    const STATE_FILE = path.resolve(process.cwd(), 'scratch/.agent_tool_guard_state.json');
    let state = { reads: {}, totalReadsThisTurn: 0, lastTimestamp: Date.now() };

    if (fs.existsSync(STATE_FILE)) {
      try {
        const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        const now = Date.now();
        // If last tool was within 45 seconds, consider it the same turn/interaction
        if (now - (raw.lastTimestamp || 0) < 45000) {
          state = raw;
        }
      } catch {
        // use default state
      }
    }

    state.lastTimestamp = Date.now();

    // Check if this is a read / search tool
    if (toolName === 'view_file' || toolName === 'grep_search' || toolName === 'list_dir') {
      state.totalReadsThisTurn = (state.totalReadsThisTurn || 0) + 1;
      const fileKey = targetPath ? targetPath.toLowerCase() : toolName;
      state.reads[fileKey] = (state.reads[fileKey] || 0) + 1;

      fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

      // 1. Check repeated read of the exact same target
      if (state.reads[fileKey] > 2) {
        const out = {
          decision: "deny",
          reason: `[PERMANENT GUARD BLOCK] You have already viewed or searched "${targetPath}" ${state.reads[fileKey] - 1} times. Repeated inspection of the same file is strictly prohibited. You must take action (edit or reply) immediately.`
        };
        process.stdout.write(JSON.stringify(out));
        process.exit(0);
      }

      // 2. Check total reads across all files in one turn
      if (state.totalReadsThisTurn > 6) {
        const out = {
          decision: "deny",
          reason: `[PERMANENT GUARD BLOCK] Maximum turn inspection limit reached (${state.totalReadsThisTurn} total read/search calls). No more reading permitted. Apply edits or respond immediately.`
        };
        process.stdout.write(JSON.stringify(out));
        process.exit(0);
      }
    }

    // Allow tool execution
    process.stdout.write(JSON.stringify({ decision: "allow" }));
    process.exit(0);
  } catch (err) {
    // If anything fails, explicitly deny to prevent runaway loops
    process.stdout.write(JSON.stringify({
      decision: "deny",
      reason: `Guard error: ${err.message}`
    }));
    process.exit(0);
  }
});
