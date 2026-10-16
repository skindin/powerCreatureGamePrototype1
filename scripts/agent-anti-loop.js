import fs from 'fs';
import path from 'path';

// Hook state file stored in scratch/temp
const STATE_FILE = path.resolve(process.cwd(), 'scratch/.agent_read_counter.json');
const MAX_READS_PER_TURN = 2;

try {
  let count = 0;
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      const now = Date.now();
      // Reset if last read was more than 30 seconds ago (new user prompt)
      if (now - (data.lastTimestamp || 0) < 30000) {
        count = data.count || 0;
      }
    } catch {
      count = 0;
    }
  }

  count++;
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify({ count, lastTimestamp: Date.now() }));

  if (count > MAX_READS_PER_TURN) {
    console.error(`\n[HARD STOP] Loop prevented! You have already made ${count - 1} read/grep calls this turn.`);
    console.error(`Action required: You must immediately apply an edit or respond to the user. No more file inspections allowed.\n`);
    process.exit(1);
  }

  process.exit(0);
} catch (err) {
  // If anything fails, allow tool execution to proceed
  process.exit(0);
}
