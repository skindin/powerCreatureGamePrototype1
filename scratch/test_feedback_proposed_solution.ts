import { createFeedback, getAllFeedback } from "../server/feedbackStore.js";
import { FeedbackPanel, FeedbackItem } from "../src/ui/FeedbackPanel.js";

console.log("=== Testing Feedback Proposed Solution Field ===");

// 1. Test createFeedback in store without proposed solution
const itemNoSolution = createFeedback({
  type: "suggestion",
  description: "Add a new snowy arena biome",
  author: "PlayerOne",
});

console.log("\nTest 1: Store item without proposed solution");
console.log(`   id: ${itemNoSolution.id}`);
console.log(`   description: ${itemNoSolution.description}`);
console.log(`   proposedSolution: "${itemNoSolution.proposedSolution}"`);

if (itemNoSolution.proposedSolution === "") {
  console.log("   PASS: proposedSolution defaults to empty string when not provided.");
} else {
  throw new Error(`FAILED: Expected empty string, got: ${itemNoSolution.proposedSolution}`);
}

// 2. Test createFeedback with proposed solution
const itemWithSolution = createFeedback({
  type: "bug",
  description: "Creature gets stuck on ice friction calculation",
  proposedSolution: "Clamp minimum friction coefficient to 0.05 in FrictionModule",
  author: "IceTester",
});

console.log("\nTest 2: Store item with proposed solution");
console.log(`   id: ${itemWithSolution.id}`);
console.log(`   description: ${itemWithSolution.description}`);
console.log(`   proposedSolution: "${itemWithSolution.proposedSolution}"`);

if (itemWithSolution.proposedSolution === "Clamp minimum friction coefficient to 0.05 in FrictionModule") {
  console.log("   PASS: proposedSolution correctly saved.");
} else {
  throw new Error(`FAILED: Incorrect proposedSolution saved.`);
}

// 3. Test clipboard formatting with and without proposed solution
// Minimal dummy DOM elements for FeedbackPanel instantiation if needed, or instantiate helper
const panel = Object.create(FeedbackPanel.prototype) as FeedbackPanel;

const clipNoSolution = panel.formatEntryForClipboard(itemNoSolution as FeedbackItem);
console.log("\nTest 3: Clipboard format without solution:");
console.log(`   ${clipNoSolution}`);
if (!clipNoSolution.includes("Proposed Solution")) {
  console.log("   PASS: No proposed solution line in clipboard text when blank.");
} else {
  throw new Error("FAILED: Clipboard text unexpectedly included Proposed Solution.");
}

const clipWithSolution = panel.formatEntryForClipboard(itemWithSolution as FeedbackItem);
console.log("\nTest 4: Clipboard format with solution:");
console.log(`   ${clipWithSolution}`);
if (clipWithSolution.includes("Proposed Solution: 'Clamp minimum friction coefficient to 0.05 in FrictionModule'")) {
  console.log("   PASS: Proposed solution cleanly formatted in clipboard text.");
} else {
  throw new Error("FAILED: Clipboard text missing formatted proposed solution.");
}

// 4. Test renderCardHtml output
(panel as any).formatLocalTime = () => "Sep 26, 2026, 4:30 PM";
(panel as any).selectedIds = new Set();
(panel as any).escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const htmlNoSolution = (panel as any).renderCardHtml(itemNoSolution);
console.log("\nTest 5: Card HTML without proposed solution:");
if (!htmlNoSolution.includes("feedback-item-solution")) {
  console.log("   PASS: .feedback-item-solution is completely blank/omitted when no solution data.");
} else {
  throw new Error("FAILED: Rendered empty solution box when post had no solution data!");
}

const htmlWithSolution = (panel as any).renderCardHtml(itemWithSolution);
console.log("\nTest 6: Card HTML with proposed solution:");
if (htmlWithSolution.includes("feedback-item-solution") && htmlWithSolution.includes("Clamp minimum friction coefficient to 0.05 in FrictionModule")) {
  console.log("   PASS: .feedback-item-solution rendered with escaped solution text.");
} else {
  throw new Error("FAILED: .feedback-item-solution was not rendered properly!");
}

console.log("\nALL TESTS PASSED CLEANLY!");
