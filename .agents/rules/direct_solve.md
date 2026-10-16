# Direct Solve & Zero Exploratory Loop Rule

You MUST follow these rules for every request:

1. **Zero Exploratory Loops**:
   - Do NOT run multi-turn grep searches or read multiple files before making an edit.
   - Go directly to the target file and apply the modification on Step 1 or Step 2 maximum.

2. **No Scratch Test Scripts Unless Explicitly Requested**:
   - Do NOT create one-off test scripts in `scratch/` or spend multiple tool turns debugging temporary test runners.
   - Make the fix or feature addition directly in the codebase.

3. **Straight to the Point**:
   - Avoid long preambles, excessive planning phases, or unnecessary round-trips.
   - Deliver the solution directly and accurately on the first try.
