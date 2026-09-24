// Test mobile fullscreen button visibility logic
class MockClassList {
  classes = new Set<string>();
  add(cls: string) { this.classes.add(cls); }
  remove(cls: string) { this.classes.delete(cls); }
  contains(cls: string) { return this.classes.has(cls); }
}

class MockElement {
  classList = new MockClassList();
  title = "";
  textContent = "";
  listeners: Record<string, Function[]> = {};
  addEventListener(event: string, fn: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  click() {
    this.listeners["click"]?.forEach(fn => fn());
  }
}

// Fullscreen test harness mimicking main.ts
let isFsActive = false;
const isFullscreenActive = () => isFsActive;

const btnMaximize = new MockElement();
const mobileFloatingFsBtn = new MockElement();

const updateFullscreenUI = () => {
  const isFs = isFullscreenActive();
  if (btnMaximize) {
    if (isFs) {
      btnMaximize.classList.add("active");
    } else {
      btnMaximize.classList.remove("active");
    }
  }
  if (mobileFloatingFsBtn) {
    if (isFs) {
      mobileFloatingFsBtn.classList.add("hidden");
    } else {
      mobileFloatingFsBtn.classList.remove("hidden");
    }
  }
};

let toggleCount = 0;
const toggleFullscreen = () => {
  toggleCount++;
  isFsActive = !isFsActive;
  updateFullscreenUI();
};

mobileFloatingFsBtn.addEventListener("click", () => toggleFullscreen());

console.log("=== Testing Mobile Fullscreen Button Logic ===");

// 1. Initial State: not in fullscreen
updateFullscreenUI();
console.log("1. Initial state (isFs = false):");
console.log("   mobileFloatingFsBtn.classList contains 'hidden'?", mobileFloatingFsBtn.classList.contains("hidden"));
if (mobileFloatingFsBtn.classList.contains("hidden")) {
  throw new Error("FAIL: Fullscreen button should NOT be hidden when not fullscreen!");
}

// 2. User clicks floating fullscreen button
console.log("2. Clicking mobile fullscreen button...");
mobileFloatingFsBtn.click();
console.log("   Toggle count:", toggleCount);
console.log("   isFsActive now:", isFsActive);
console.log("   mobileFloatingFsBtn.classList contains 'hidden'?", mobileFloatingFsBtn.classList.contains("hidden"));
if (!mobileFloatingFsBtn.classList.contains("hidden")) {
  throw new Error("FAIL: Fullscreen button SHOULD be hidden when maximized!");
}

// 3. User exits fullscreen (e.g. system back or exit)
console.log("3. Exiting fullscreen...");
isFsActive = false;
updateFullscreenUI();
console.log("   mobileFloatingFsBtn.classList contains 'hidden'?", mobileFloatingFsBtn.classList.contains("hidden"));
if (mobileFloatingFsBtn.classList.contains("hidden")) {
  throw new Error("FAIL: Fullscreen button should reappear when exiting fullscreen!");
}

console.log("SUCCESS! Mobile fullscreen button logic verified completely.");
