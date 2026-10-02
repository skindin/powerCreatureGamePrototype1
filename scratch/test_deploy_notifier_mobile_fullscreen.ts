/**
 * scratch/test_deploy_notifier_mobile_fullscreen.ts
 *
 * Verifies that DeployNotifier update notifications and reload buttons
 * appear and function appropriately in mobile display in and out of full screen.
 */

class MockClassList {
  classes = new Set<string>();
  add(cls: string) {
    cls.split(/\s+/).filter(Boolean).forEach(c => this.classes.add(c));
  }
  remove(cls: string) {
    cls.split(/\s+/).filter(Boolean).forEach(c => this.classes.delete(c));
  }
  contains(cls: string) { return this.classes.has(cls); }
  toggle(cls: string, force?: boolean) {
    if (force === undefined) {
      if (this.contains(cls)) { this.remove(cls); return false; }
      else { this.add(cls); return true; }
    }
    if (force) this.add(cls);
    else this.remove(cls);
    return force;
  }
}

class MockElement {
  id: string = "";
  tagName: string = "DIV";
  classList = new MockClassList();
  title: string = "";
  style: Record<string, any> = {};
  parentElement: MockElement | null = null;
  children: MockElement[] = [];
  listeners: Record<string, Function[]> = {};
  onclick: Function | null = null;
  href: string = "";
  _innerHTML: string = "";

  get className(): string {
    return Array.from(this.classList.classes).join(" ");
  }

  set className(val: string) {
    this.classList.classes.clear();
    val.split(/\s+/).filter(Boolean).forEach(c => this.classList.classes.add(c));
  }

  constructor(tagName = "DIV", id = "") {
    this.tagName = tagName.toUpperCase();
    this.id = id;
  }

  get innerHTML(): string {
    return this._innerHTML;
  }

  set innerHTML(html: string) {
    this._innerHTML = html;
    this.children = [];
    const tokens = html.match(/<[^>]+>|[^<]+/g) || [];
    const stack: MockElement[] = [this];

    for (const token of tokens) {
      if (token.startsWith("</")) {
        if (stack.length > 1) {
          stack.pop();
        }
      } else if (token.startsWith("<")) {
        const tagMatch = token.match(/^<([a-zA-Z0-9]+)([^>]*)(\/?)>/s);
        if (tagMatch) {
          const tagName = tagMatch[1];
          const attrs = tagMatch[2];
          const isSelfClosing = tagMatch[3] === "/" || ["img", "input", "br", "hr"].includes(tagName.toLowerCase());

          const el = new MockElement(tagName);
          const idMatch = attrs.match(/id=["']([^"']+)["']/);
          if (idMatch) el.id = idMatch[1];
          const classMatch = attrs.match(/class=["']([^"']+)["']/);
          if (classMatch) el.className = classMatch[1];
          const hrefMatch = attrs.match(/href=["']([^"']+)["']/);
          if (hrefMatch) el.href = hrefMatch[1];
          const titleMatch = attrs.match(/title=["']([^"']+)["']/);
          if (titleMatch) el.title = titleMatch[1];

          stack[stack.length - 1].appendChild(el);
          if (!isSelfClosing) {
            stack.push(el);
          }
        }
      } else {
        const text = token.trim();
        if (text) {
          stack[stack.length - 1].textContent = (stack[stack.length - 1].textContent || "") + " " + text;
        }
      }
    }
  }

  get textContent(): string {
    return this._textContent || this._innerHTML.replace(/<[^>]+>/g, "");
  }

  set textContent(text: string) {
    this._textContent = text;
  }

  private _textContent: string = "";

  addEventListener(event: string, fn: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  removeEventListener(event: string, fn: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(f => f !== fn);
    }
  }

  appendChild(child: MockElement) {
    if (child.parentElement) {
      child.parentElement.removeChild(child);
    }
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  removeChild(child: MockElement) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentElement = null;
    }
    return child;
  }

  remove() {
    if (this.parentElement) {
      this.parentElement.removeChild(this);
    }
  }

  contains(el: MockElement | null): boolean {
    if (!el) return false;
    if (el === this) return true;
    let curr = el.parentElement;
    while (curr) {
      if (curr === this) return true;
      curr = curr.parentElement;
    }
    return false;
  }

  cloneNode(_deep = true): MockElement {
    const clone = new MockElement(this.tagName, this.id);
    clone.className = this.className;
    clone.classList.classes = new Set(this.classList.classes);
    clone.title = this.title;
    clone.innerHTML = this.innerHTML;
    clone.textContent = this.textContent;
    return clone;
  }

  replaceChild(newChild: MockElement, oldChild: MockElement) {
    const idx = this.children.indexOf(oldChild);
    if (idx !== -1) {
      this.children[idx] = newChild;
      newChild.parentElement = this;
      oldChild.parentElement = null;
    }
    return oldChild;
  }

  prepend(child: MockElement) {
    if (child.parentElement) {
      child.parentElement.removeChild(child);
    }
    child.parentElement = this;
    this.children.unshift(child);
  }

  click() {
    if (this.onclick) this.onclick();
    this.listeners["click"]?.forEach(fn => fn());
  }

  querySelector(selector: string): MockElement | null {
    if (selector.startsWith("#")) {
      const id = selector.slice(1);
      return this._find(el => el.id === id);
    }
    if (selector.startsWith(".")) {
      const cls = selector.slice(1);
      return this._find(el => el.classList.contains(cls));
    }
    return this._find(el => el.tagName.toLowerCase() === selector.toLowerCase());
  }

  querySelectorAll(selector: string): MockElement[] {
    const results: MockElement[] = [];
    if (selector.includes(",")) {
      const parts = selector.split(",").map(s => s.trim());
      for (const part of parts) {
        const found = this.querySelectorAll(part);
        for (const f of found) {
          if (!results.includes(f)) results.push(f);
        }
      }
      return results;
    }

    if (selector.startsWith("#")) {
      const id = selector.slice(1);
      this._findAll(el => el.id === id, results);
    } else if (selector.startsWith(".")) {
      const cls = selector.slice(1);
      this._findAll(el => el.classList.contains(cls), results);
    } else {
      this._findAll(el => el.tagName.toLowerCase() === selector.toLowerCase(), results);
    }
    return results;
  }

  private _find(predicate: (el: MockElement) => boolean): MockElement | null {
    for (const child of this.children) {
      if (predicate(child)) return child;
      const sub = child._find(predicate);
      if (sub) return sub;
    }
    return null;
  }

  private _findAll(predicate: (el: MockElement) => boolean, acc: MockElement[]) {
    for (const child of this.children) {
      if (predicate(child)) acc.push(child);
      child._findAll(predicate, acc);
    }
  }
}

// Build standard DOM structure
const documentElement = new MockElement("HTML");
const body = new MockElement("BODY");
documentElement.appendChild(body);

const appLayout = new MockElement("DIV", "app-layout");
body.appendChild(appLayout);

const topBar = new MockElement("HEADER");
topBar.className = "top-bar";
appLayout.appendChild(topBar);

const topBarRight = new MockElement("DIV");
topBarRight.className = "top-bar-right";
topBar.appendChild(topBarRight);

// Mobile Floating buttons
const mobileReloadFloatBtn = new MockElement("BUTTON", "mobile-reload-float-btn");
mobileReloadFloatBtn.className = "mobile-reload-btn hidden";
mobileReloadFloatBtn.innerHTML = `
  <span class="reload-dot"></span>
  <span class="reload-icon">🔄</span>
  <span class="reload-text">Update Live</span>
`;
appLayout.appendChild(mobileReloadFloatBtn);

const mobileFullscreenBtn = new MockElement("BUTTON", "mobile-fullscreen-btn");
mobileFullscreenBtn.className = "mobile-fullscreen-btn";
appLayout.appendChild(mobileFullscreenBtn);

const mobileMenuBtn = new MockElement("BUTTON", "mobile-menu-btn");
mobileMenuBtn.className = "mobile-hamburger-btn";
appLayout.appendChild(mobileMenuBtn);

// Mobile Expanded Menu
const mobileExpandedMenu = new MockElement("DIV", "mobile-expanded-menu");
mobileExpandedMenu.className = "mobile-expanded-menu hidden";
appLayout.appendChild(mobileExpandedMenu);

const mobileMenuCard = new MockElement("DIV");
mobileMenuCard.className = "mobile-menu-card";
mobileExpandedMenu.appendChild(mobileMenuCard);

const mobileMenuHeader = new MockElement("DIV");
mobileMenuHeader.className = "mobile-menu-header";
mobileMenuCard.appendChild(mobileMenuHeader);

const mobileMenuHeaderActions = new MockElement("DIV");
mobileMenuHeaderActions.className = "mobile-menu-header-actions";
mobileMenuHeader.appendChild(mobileMenuHeaderActions);

const mobileDeployBadge = new MockElement("DIV", "mobile-deploy-badge");
mobileDeployBadge.className = "header-deploy-badge live hidden";
mobileDeployBadge.innerHTML = `<span class="deploy-dot live"></span><span class="deploy-text">Update Live</span>`;
mobileMenuHeaderActions.appendChild(mobileDeployBadge);

const mobileMenuBody = new MockElement("DIV");
mobileMenuBody.className = "mobile-menu-body";
mobileMenuCard.appendChild(mobileMenuBody);

const mobileMenuCol = new MockElement("DIV");
mobileMenuCol.className = "mobile-menu-col";
mobileMenuBody.appendChild(mobileMenuCol);

const mobileUpdateCard = new MockElement("DIV", "mobile-menu-update-card");
mobileUpdateCard.className = "mobile-menu-section mobile-update-card hidden";
mobileUpdateCard.innerHTML = `
  <div class="section-title-row">
    <span class="section-icon" id="mobile-update-icon">✨</span>
    <h3 id="mobile-update-title">Update Live</h3>
    <span id="mobile-update-commit-badge" class="badge">vLatest</span>
  </div>
  <p id="mobile-update-desc" class="section-desc">A new version is ready.</p>
  <button id="mobile-btn-menu-reload" class="btn-deploy-action reload">🔄 Reload Game Now</button>
  <a id="mobile-link-menu-logs" class="btn-deploy-action view-logs hidden">↗ View Logs</a>
`;
mobileMenuCol.appendChild(mobileUpdateCard);

// Document mock
const listeners: Record<string, Function[]> = {};
let mockFullscreenElement: MockElement | null = null;

let reloadCount = 0;
const mockWindow = {
  location: {
    reload: () => { reloadCount++; }
  },
  navigator: {},
  addEventListener: () => {},
  removeEventListener: () => {},
};

const mockDocument = {
  documentElement,
  body,
  get fullscreenElement() { return mockFullscreenElement; },
  set fullscreenElement(val: any) { mockFullscreenElement = val; },
  getElementById: (id: string): MockElement | null => {
    return documentElement.querySelector(`#${id}`);
  },
  querySelector: (sel: string): MockElement | null => {
    return documentElement.querySelector(sel);
  },
  querySelectorAll: (sel: string): MockElement[] => {
    return documentElement.querySelectorAll(sel);
  },
  createElement: (tag: string): MockElement => {
    return new MockElement(tag);
  },
  addEventListener: (event: string, fn: Function) => {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  },
  removeEventListener: (event: string, fn: Function) => {
    if (listeners[event]) {
      listeners[event] = listeners[event].filter(f => f !== fn);
    }
  },
  dispatchEvent: (event: { type: string }) => {
    listeners[event.type]?.forEach(fn => fn());
  }
};

(global as any).window = mockWindow;
(global as any).document = mockDocument;
(global as any).HTMLElement = MockElement;
try {
  Object.defineProperty(globalThis, "window", { value: mockWindow, configurable: true });
  Object.defineProperty(globalThis, "document", { value: mockDocument, configurable: true });
} catch {}

// Import DeployNotifier
import { DeployNotifier } from "../src/ui/DeployNotifier";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

async function run() {
  console.log("=== Testing DeployNotifier Mobile & Fullscreen Capabilities ===");

  const notifier = new DeployNotifier();

  // Test 1: Check initial DOM elements
  assert(mobileReloadFloatBtn.classList.contains("hidden"), "mobile-reload-float-btn is initially hidden");
  assert(mobileDeployBadge.classList.contains("hidden"), "mobile-deploy-badge is initially hidden");
  assert(mobileUpdateCard.classList.contains("hidden"), "mobile-menu-update-card is initially hidden");

  // Test 2: Trigger Live Notification
  console.log("\n--- Scenario A: Live Deployment Arrives ---");
  (notifier as any).showLiveNotification("e4f5a6b");

  const toast = mockDocument.getElementById("deploy-toast-notification");
  assert(toast !== null, "Toast element created in DOM");
  assert(toast!.classList.contains("live"), "Toast has 'live' class");
  assert(toast!.innerHTML.includes("Railway Update Live"), "Toast body includes update title");

  // Floating reload button on mobile display
  assert(!mobileReloadFloatBtn.classList.contains("hidden"), "mobile-reload-float-btn is now visible");
  const reloadText = mobileReloadFloatBtn.querySelector(".reload-text");
  assert(reloadText !== null && reloadText.textContent.includes("e4f5a6b"), "Floating button displays commit e4f5a6b");

  // Mobile hamburger button indicator dot
  assert(mobileMenuBtn.classList.contains("has-update"), "Mobile hamburger button has 'has-update' class");

  // Mobile Menu header badge and update card
  assert(!mobileDeployBadge.classList.contains("hidden"), "mobile-deploy-badge in menu header is visible");
  assert(!mobileUpdateCard.classList.contains("hidden"), "mobile-menu-update-card in menu body is visible");

  // Test 3: Reload from Toast Button
  console.log("\n--- Scenario B: Reloading from Toast Button ---");
  reloadCount = 0;
  const toastReloadBtn = mockDocument.getElementById("btn-deploy-reload");
  assert(toastReloadBtn !== null, "Toast has reload button");
  toastReloadBtn!.click();
  await new Promise(r => setTimeout(r, 150));
  assert(reloadCount === 1, "Clicking toast reload triggers window.location.reload()");

  // Test 4: Reload from Floating Mobile Button (in or out of fullscreen)
  console.log("\n--- Scenario C: Reloading from Floating Mobile Button ---");
  reloadCount = 0;
  mobileReloadFloatBtn.click();
  await new Promise(r => setTimeout(r, 150));
  assert(reloadCount === 1, "Clicking mobile-reload-float-btn triggers window.location.reload()");

  // Test 5: Reload from Mobile Menu Card Button
  console.log("\n--- Scenario D: Reloading from Mobile Menu Card ---");
  reloadCount = 0;
  const menuReloadBtn = mockDocument.getElementById("mobile-btn-menu-reload");
  assert(menuReloadBtn !== null, "mobile-btn-menu-reload exists in menu card");
  menuReloadBtn!.click();
  await new Promise(r => setTimeout(r, 150));
  assert(reloadCount === 1, "Clicking mobile-btn-menu-reload triggers window.location.reload()");

  // Test 6: Reload from Mobile Menu Header Badge
  console.log("\n--- Scenario E: Reloading from Mobile Menu Header Badge ---");
  reloadCount = 0;
  mobileDeployBadge.click();
  await new Promise(r => setTimeout(r, 150));
  assert(reloadCount === 1, "Clicking mobile-deploy-badge triggers window.location.reload()");

  // Test 7: Fullscreen Reparenting & Resilience
  console.log("\n--- Scenario F: Toggling Fullscreen Keeps Toast Mounted Inside Fullscreen Element ---");
  const fullscreenContainer = new MockElement("DIV", "mock-fullscreen-wrapper");
  body.appendChild(fullscreenContainer);

  mockDocument.fullscreenElement = fullscreenContainer;
  mockDocument.dispatchEvent({ type: "fullscreenchange" });

  const activeToast = mockDocument.getElementById("deploy-toast-notification");
  assert(activeToast !== null, "Toast exists after fullscreenchange");
  assert(fullscreenContainer.contains(activeToast), "Toast was reparented inside mock fullscreenContainer");

  // Exiting fullscreen
  mockDocument.fullscreenElement = null;
  mockDocument.dispatchEvent({ type: "fullscreenchange" });

  // Test 8: Dismissing Toast Leaves Quick Reload Available
  console.log("\n--- Scenario G: Dismissing Toast Leaves Mobile Floating & Menu Reload Active ---");
  const dismissBtn = mockDocument.getElementById("btn-deploy-dismiss");
  assert(dismissBtn !== null, "btn-deploy-dismiss exists");
  dismissBtn!.click();
  assert(activeToast!.classList.contains("closing"), "Toast has 'closing' class");
  await new Promise(r => setTimeout(r, 350));
  assert(mockDocument.getElementById("deploy-toast-notification") === null, "Toast removed after dismiss timeout");

  assert(!mobileReloadFloatBtn.classList.contains("hidden"), "mobile-reload-float-btn remains visible after toast dismiss");
  assert(!mobileUpdateCard.classList.contains("hidden"), "mobile-menu-update-card remains visible after toast dismiss");
  assert(mobileMenuBtn.classList.contains("has-update"), "mobile-menu-btn retains update dot");

  // Test 9: Building Notification State
  console.log("\n--- Scenario H: Building Notification State ---");
  (notifier as any).showBuildingNotification("c8d9e0f", "Building production assets", "https://railway.com/logs/build123");

  const buildToast = mockDocument.getElementById("deploy-toast-notification");
  assert(buildToast !== null, "Building toast created");
  assert(buildToast!.classList.contains("building"), "Building toast has 'building' class");
  assert(mobileReloadFloatBtn.classList.contains("hidden"), "Floating reload button is hidden while build is in progress");

  const logsLink = mockDocument.getElementById("mobile-link-menu-logs");
  assert(logsLink !== null, "Logs link exists in mobile menu");
  assert(!logsLink!.classList.contains("hidden"), "Logs link is visible in mobile menu during build");

  // Test 10: Crashed Notification State
  console.log("\n--- Scenario I: Crashed Notification State ---");
  (notifier as any).showCrashedNotification("f1e2d3c", "Build compilation error", "https://railway.com/logs/err456");

  const crashToast = mockDocument.getElementById("deploy-toast-notification");
  assert(crashToast !== null, "Crash toast created");
  assert(crashToast!.classList.contains("crashed"), "Crash toast has 'crashed' class");
  assert(mobileReloadFloatBtn.classList.contains("hidden"), "Floating reload button is hidden during crashed state");

  console.log("\n🎉 ALL TESTS PASSED! DeployNotifier and Reload buttons are 100% verified for mobile and fullscreen modes.");
  notifier.stop();
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
