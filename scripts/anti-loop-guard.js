#!/usr/bin/env node
/**
 * anti-loop-guard.js
 * 
 * Strict enforcement monitor to catch and prevent AI agents from getting
 * trapped in read/search inspection loops without executing modifications.
 * 
 * Rules enforced:
 * 1. An agent must NOT perform more than 2 consecutive read/search steps on the same file.
 * 2. An agent must execute a write/edit action (replace_file_content / write_to_file) within 2 inspection steps.
 * 3. Any session breaching this rule is immediately flagged with an exit code 1 to halt the loop.
 */

import fs from "fs";
import path from "path";

const LOG_DIR = process.env.AGENT_LOG_DIR || path.resolve(process.cwd(), ".gemini");

console.log("[AntiLoopGuard] Active - Strict 2-Step Execution policy engaged.");
console.log("[AntiLoopGuard] 1 read -> 1 edit -> compile/verify -> commit & push.");

export function checkActionSequence(history) {
  let consecutiveReads = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const act = history[i];
    if (act.type === "edit" || act.type === "write") {
      break;
    }
    if (act.type === "read" || act.type === "search" || act.type === "view") {
      consecutiveReads++;
      if (consecutiveReads > 2) {
        throw new Error(
          `[AntiLoopGuard VIOLATION] Detected ${consecutiveReads} consecutive inspection actions without an edit! You are in an analysis loop. Stop inspecting and apply the edit now.`
        );
      }
    }
  }
}
