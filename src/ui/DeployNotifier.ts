/**
 * DeployNotifier
 * Detects when Railway is building, when a build has crashed,
 * and when a build has successfully redeployed to the live server.
 * Displays non-intrusive notification banners and header badges without forcing a reload.
 */

export interface BuildStatusInfo {
  state?: string;
  sha?: string;
  shortSha?: string;
  description?: string;
  targetUrl?: string;
  isBuilding?: boolean;
  isFailed?: boolean;
  isSuccess?: boolean;
  lastChecked?: string;
}

export interface VersionResponse {
  deployId?: string;
  commit?: string;
  bootTime?: string;
  buildStatus?: BuildStatusInfo;
}

export class DeployNotifier {
  private initialDeployId: string | null = null;
  private initialCommit: string | null = null;
  private checkIntervalTimer: any = null;

  // Track state notifications to avoid spamming the user on repeated polls
  private notifiedBuildingCommit: string | null = null;
  private notifiedCrashedCommit: string | null = null;
  private notifiedLiveCommit: string | null = null;

  constructor() {
    this.start();
  }

  public start(): void {
    // Initial fetch to record baseline deployment ID and commit
    this.checkDeployment(true);

    // Periodic check every 15 seconds
    this.checkIntervalTimer = setInterval(() => {
      this.checkDeployment(false);
    }, 15000);

    // Check immediately when user switches back to this tab
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.checkDeployment(false);
      }
    });

    // Keep toast notification mounted in active fullscreen element or layout container
    const handleFsChange = () => {
      const toast = document.getElementById("deploy-toast-notification");
      if (toast) {
        const mount = this.getToastMountContainer();
        if (toast.parentElement !== mount) {
          mount.appendChild(toast);
        }
      }
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);
    document.addEventListener("MSFullscreenChange", handleFsChange);
  }

  public stop(): void {
    if (this.checkIntervalTimer) {
      clearInterval(this.checkIntervalTimer);
      this.checkIntervalTimer = null;
    }
  }

  /**
   * Helper to ensure notifications mount into the active fullscreen root or app layout,
   * guaranteeing visibility in and out of native browser fullscreen mode.
   */
  private getToastMountContainer(): HTMLElement {
    return (
      (document.fullscreenElement as HTMLElement) ||
      document.getElementById("app-layout") ||
      document.body
    );
  }

  /**
   * Centralized reload handler with button feedback and service worker sync.
   */
  public static triggerReload(): void {
    try {
      // Visual feedback across all reload buttons
      const reloadBtns = document.querySelectorAll<HTMLElement>(
        "#btn-deploy-reload, #mobile-btn-menu-reload, #mobile-reload-float-btn, #mobile-deploy-badge, #header-deploy-badge"
      );
      reloadBtns.forEach((btn) => {
        const textSpan = btn.querySelector(".reload-text") || btn.querySelector(".deploy-text");
        if (textSpan) {
          textSpan.textContent = "Reloading...";
        } else if (btn.tagName === "BUTTON") {
          btn.textContent = "⏳ Reloading...";
        }
        btn.style.pointerEvents = "none";
        btn.style.opacity = "0.75";
      });

      // Signal service worker if installed
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
      }
    } catch {}

    // Reload cleanly
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }

  private async checkDeployment(isInitial = false): Promise<void> {
    try {
      const res = await fetch(`/api/version?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!res.ok) return;

      const data: VersionResponse = await res.json();
      const deployId = data.deployId || data.commit || data.bootTime;
      const runningCommit = data.commit || (deployId ? String(deployId).substring(0, 7) : "");

      if (!deployId) return;

      if (isInitial || !this.initialDeployId) {
        this.initialDeployId = String(deployId);
        this.initialCommit = runningCommit;
      }

      const build = data.buildStatus;

      // 1. Check if a build has CRASHED / FAILED
      if (build && (build.isFailed || build.state === "failure" || build.state === "error")) {
        const failedCommit = build.shortSha || build.sha?.substring(0, 7) || "latest";
        if (this.notifiedCrashedCommit !== failedCommit) {
          this.notifiedCrashedCommit = failedCommit;
          this.showCrashedNotification(failedCommit, build.description, build.targetUrl);
        }
        return;
      }

      // 2. Check if a build is IN THE PROCESS OF DEPLOYING (Building on Railway)
      if (build && (build.isBuilding || build.state === "pending")) {
        const buildingCommit = build.shortSha || build.sha?.substring(0, 7) || "latest";
        if (this.notifiedBuildingCommit !== buildingCommit) {
          this.notifiedBuildingCommit = buildingCommit;
          this.showBuildingNotification(buildingCommit, build.description, build.targetUrl);
        }
        return;
      }

      // Clear building notification if no longer building
      if (this.notifiedBuildingCommit) {
        this.notifiedBuildingCommit = null;
        const toast = document.getElementById("deploy-toast-notification");
        if (toast && toast.classList.contains("building")) {
          toast.remove();
        }
        const badge = document.getElementById("header-deploy-badge");
        if (badge && badge.classList.contains("building")) {
          badge.remove();
        }
        if (!this.notifiedLiveCommit && !this.notifiedCrashedCommit) {
          this.updateMobileUI("none");
        }
      }

      // 3. Check if a build has COMPLETED & is LIVE on the server
      const isNewDeployment = String(deployId) !== this.initialDeployId;
      const isNewCommitDeployed = Boolean(build?.isSuccess && build.shortSha && this.initialCommit && !this.initialCommit.startsWith(build.shortSha));

      if (isNewDeployment || isNewCommitDeployed) {
        const liveCommit = runningCommit || build?.shortSha || (deployId ? String(deployId).substring(0, 7) : "");
        if (this.notifiedLiveCommit !== liveCommit) {
          this.notifiedLiveCommit = liveCommit;
          this.showLiveNotification(liveCommit);
        }
      }
    } catch {
      // Ignore transient network errors (e.g. while server container cuts over on Railway)
    }
  }

  // --- Audio Feedback ---

  private playBuildingChime(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Soft ascending gear tone: F4 (349.23Hz) -> A4 (440.0Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(349.23, now);
      osc.frequency.exponentialRampToValueAtTime(440.0, now + 0.22);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Audio context restricted before user interaction; ignore safely
    }
  }

  private playCrashChime(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Warning alert tone: Eb5 (622.25Hz) -> C5 (523.25Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(622.25, now);
      osc.frequency.setValueAtTime(523.25, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch {
      // Audio context restricted before user interaction; ignore safely
    }
  }

  private playLiveChime(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Note 1: E5 (659.25Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: B5 (987.77Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(987.77, now + 0.12);
      gain2.gain.setValueAtTime(0.08, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.5);
    } catch {
      // Audio context restricted before user interaction; ignore safely
    }
  }

  // --- Header Badge Management ---

  private updateHeaderBadge(
    statusClass: "building" | "crashed" | "live",
    htmlContent: string,
    title: string,
    onClick?: () => void
  ): void {
    const topBar = document.querySelector(".top-bar");
    if (!topBar) return;

    let badge = document.getElementById("header-deploy-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "header-deploy-badge";
      const rightGroup = topBar.querySelector(".top-bar-right");
      if (rightGroup) {
        rightGroup.prepend(badge);
      } else {
        topBar.appendChild(badge);
      }
    }

    badge.className = `header-deploy-badge ${statusClass}`;
    badge.innerHTML = htmlContent;
    badge.title = title;

    // Clone node to replace existing event listeners cleanly
    const newBadge = badge.cloneNode(true) as HTMLElement;
    if (onClick) {
      newBadge.addEventListener("click", onClick);
    }
    badge.parentNode?.replaceChild(newBadge, badge);
  }

  // --- Mobile Display & Menu Synchronization ---

  private updateMobileUI(
    state: "building" | "crashed" | "live" | "none",
    commit?: string,
    description?: string,
    targetUrl?: string
  ): void {
    // 1. Mobile Floating Quick Reload Button (top left)
    const mobileReloadFloatBtn = document.getElementById("mobile-reload-float-btn");
    if (mobileReloadFloatBtn) {
      if (state === "live") {
        mobileReloadFloatBtn.classList.remove("hidden");
        const textSpan = mobileReloadFloatBtn.querySelector(".reload-text");
        if (textSpan) {
          textSpan.textContent = commit ? `Update (${commit})` : "Update Live";
        }
        mobileReloadFloatBtn.title = `Game update deployed${commit ? ` (${commit})` : ''}! Tap to reload now.`;
        mobileReloadFloatBtn.onclick = () => {
          DeployNotifier.triggerReload();
        };
      } else {
        mobileReloadFloatBtn.classList.add("hidden");
        mobileReloadFloatBtn.onclick = null;
      }
    }

    // 2. Mobile Hamburger Button Notification Dot
    const mobileMenuBtn = document.getElementById("mobile-menu-btn");
    if (mobileMenuBtn) {
      if (state === "live") {
        mobileMenuBtn.classList.add("has-update");
      } else {
        mobileMenuBtn.classList.remove("has-update");
      }
    }

    // 3. Mobile Menu Header Badge
    const mobileDeployBadge = document.getElementById("mobile-deploy-badge");
    if (mobileDeployBadge) {
      if (state === "none") {
        mobileDeployBadge.classList.add("hidden");
        mobileDeployBadge.onclick = null;
      } else {
        mobileDeployBadge.className = `header-deploy-badge ${state}`;
        const dot = mobileDeployBadge.querySelector(".deploy-dot");
        if (dot) dot.className = `deploy-dot ${state}`;
        const text = mobileDeployBadge.querySelector(".deploy-text");
        if (text) {
          if (state === "live") text.textContent = commit ? `Update (${commit})` : "Update Live";
          else if (state === "building") text.textContent = commit ? `Deploying (${commit})` : "Deploying...";
          else if (state === "crashed") text.textContent = commit ? `Crashed (${commit})` : "Build Crashed";
        }
        mobileDeployBadge.classList.remove("hidden");
        if (state === "live") {
          mobileDeployBadge.title = "Update Live! Tap to reload now.";
          mobileDeployBadge.onclick = () => DeployNotifier.triggerReload();
        } else if (targetUrl) {
          mobileDeployBadge.title = "Click to inspect Railway build status.";
          mobileDeployBadge.onclick = () => window.open(targetUrl, "_blank", "noopener,noreferrer");
        } else {
          mobileDeployBadge.onclick = null;
        }
      }
    }

    // 4. Mobile Menu Update Card
    const mobileUpdateCard = document.getElementById("mobile-menu-update-card");
    if (mobileUpdateCard) {
      if (state === "none") {
        mobileUpdateCard.classList.add("hidden");
      } else {
        mobileUpdateCard.classList.remove("hidden");
        const icon = document.getElementById("mobile-update-icon");
        const title = document.getElementById("mobile-update-title");
        const commitBadge = document.getElementById("mobile-update-commit-badge");
        const desc = document.getElementById("mobile-update-desc");
        const reloadBtn = document.getElementById("mobile-btn-menu-reload");
        const logsLink = document.getElementById("mobile-link-menu-logs") as HTMLAnchorElement | null;

        if (state === "live") {
          if (icon) icon.textContent = "✨";
          if (title) {
            title.textContent = "Update Live";
            title.style.color = "#4ade80";
          }
          if (commitBadge) {
            commitBadge.textContent = commit ? `commit ${commit}` : "vLatest";
            commitBadge.style.background = "rgba(34, 197, 94, 0.2)";
            commitBadge.style.color = "#4ade80";
          }
          if (desc) {
            desc.textContent = "A new version of Power Creature Game was redeployed! Tap reload whenever you're ready.";
          }
          if (reloadBtn) {
            reloadBtn.classList.remove("hidden");
            reloadBtn.onclick = () => DeployNotifier.triggerReload();
          }
          if (logsLink) logsLink.classList.add("hidden");
        } else if (state === "building") {
          if (icon) icon.textContent = "🔨";
          if (title) {
            title.textContent = "Deploying Update...";
            title.style.color = "#fbbf24";
          }
          if (commitBadge) {
            commitBadge.textContent = commit ? `commit ${commit}` : "building";
            commitBadge.style.background = "rgba(245, 158, 11, 0.2)";
            commitBadge.style.color = "#fbbf24";
          }
          if (desc) {
            desc.textContent = description || `Building & preparing commit ${commit || "latest"} on Railway.`;
          }
          if (reloadBtn) reloadBtn.classList.add("hidden");
          if (logsLink) {
            if (targetUrl) {
              logsLink.href = targetUrl;
              logsLink.className = "btn-deploy-action view-logs";
              logsLink.textContent = "↗ View Logs";
              logsLink.classList.remove("hidden");
            } else {
              logsLink.classList.add("hidden");
            }
          }
        } else if (state === "crashed") {
          if (icon) icon.textContent = "🚨";
          if (title) {
            title.textContent = "Railway Build Crashed";
            title.style.color = "#f87171";
          }
          if (commitBadge) {
            commitBadge.textContent = commit ? `commit ${commit}` : "error";
            commitBadge.style.background = "rgba(239, 68, 68, 0.2)";
            commitBadge.style.color = "#f87171";
          }
          if (desc) {
            desc.textContent = description || `Railway build failed for commit ${commit || "latest"}.`;
          }
          if (reloadBtn) reloadBtn.classList.add("hidden");
          if (logsLink) {
            if (targetUrl) {
              logsLink.href = targetUrl;
              logsLink.className = "btn-deploy-action view-logs danger";
              logsLink.textContent = "🔍 Error Logs";
              logsLink.classList.remove("hidden");
            } else {
              logsLink.classList.add("hidden");
            }
          }
        }
      }
    }
  }

  // --- Notifications ---

  /**
   * 1. Build in Progress / Deploying
   */
  private showBuildingNotification(commit: string, description?: string, targetUrl?: string): void {
    this.playBuildingChime();

    // 1. Header Badge: Amber building status (Desktop top bar)
    this.updateHeaderBadge(
      "building",
      `
        <span class="deploy-dot building"></span>
        <span class="deploy-text">Deploying (${commit})...</span>
      `,
      `A new build for commit ${commit} is currently deploying on Railway.${targetUrl ? ' Click to view logs.' : ''}`,
      () => {
        if (targetUrl) {
          window.open(targetUrl, "_blank", "noopener,noreferrer");
        }
      }
    );

    // 2. Synchronize Mobile Menu Card & Header Badge
    this.updateMobileUI("building", commit, description, targetUrl);

    // 3. Floating Toast Notification
    let toast = document.getElementById("deploy-toast-notification");
    if (toast) toast.remove();

    toast = document.createElement("div");
    toast.id = "deploy-toast-notification";
    toast.className = "deploy-toast-notification building";
    toast.innerHTML = `
      <div class="deploy-toast-content">
        <span class="deploy-toast-icon">🔨</span>
        <div class="deploy-toast-body">
          <div class="deploy-toast-title">Deploying Railway Update...</div>
          <div class="deploy-toast-desc">Building & preparing commit <code>${commit}</code>${description ? ` (${this.escapeHtml(description)})` : ''}.</div>
        </div>
        <div class="deploy-toast-actions">
          ${targetUrl ? `<a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="btn-deploy-action view-logs" title="View live build logs on Railway">↗ Logs</a>` : ''}
          <button id="btn-deploy-dismiss" class="btn-deploy-action dismiss" title="Dismiss">✕</button>
        </div>
      </div>
    `;

    this.getToastMountContainer().appendChild(toast);

    document.getElementById("btn-deploy-dismiss")?.addEventListener("click", () => {
      toast?.classList.add("closing");
      setTimeout(() => toast?.remove(), 300);
    });

    // Auto-fade toast after 10 seconds (badge stays until deployment state finishes)
    setTimeout(() => {
      if (toast && toast.parentElement) {
        toast.classList.add("closing");
        setTimeout(() => toast?.remove(), 300);
      }
    }, 10000);
  }

  /**
   * 2. Build Crashed / Failed
   */
  private showCrashedNotification(commit: string, description?: string, targetUrl?: string): void {
    this.playCrashChime();

    // 1. Header Badge: Red alert status (Desktop top bar)
    this.updateHeaderBadge(
      "crashed",
      `
        <span class="deploy-dot crashed"></span>
        <span class="deploy-text">Build Crashed (${commit})</span>
      `,
      `Railway build for commit ${commit} crashed or failed!${targetUrl ? ' Click to inspect error logs.' : ''}`,
      () => {
        if (targetUrl) {
          window.open(targetUrl, "_blank", "noopener,noreferrer");
        }
      }
    );

    // 2. Synchronize Mobile Menu Card & Header Badge
    this.updateMobileUI("crashed", commit, description, targetUrl);

    // 3. Floating Toast Notification
    let toast = document.getElementById("deploy-toast-notification");
    if (toast) toast.remove();

    toast = document.createElement("div");
    toast.id = "deploy-toast-notification";
    toast.className = "deploy-toast-notification crashed";
    toast.innerHTML = `
      <div class="deploy-toast-content">
        <span class="deploy-toast-icon">🚨</span>
        <div class="deploy-toast-body">
          <div class="deploy-toast-title">Railway Build Crashed!</div>
          <div class="deploy-toast-desc">Build/deploy failed for commit <code>${commit}</code>: <em>${this.escapeHtml(description || 'Build process encountered an error')}</em></div>
        </div>
        <div class="deploy-toast-actions">
          ${targetUrl ? `<a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="btn-deploy-action view-logs danger" title="Inspect Railway build error logs">🔍 Error Logs</a>` : ''}
          <button id="btn-deploy-dismiss" class="btn-deploy-action dismiss" title="Dismiss">✕</button>
        </div>
      </div>
    `;

    this.getToastMountContainer().appendChild(toast);

    document.getElementById("btn-deploy-dismiss")?.addEventListener("click", () => {
      toast?.classList.add("closing");
      setTimeout(() => toast?.remove(), 300);
    });

    // Toast stays up for 25 seconds for error visibility
    setTimeout(() => {
      if (toast && toast.parentElement) {
        toast.classList.add("closing");
        setTimeout(() => toast?.remove(), 300);
      }
    }, 25000);
  }

  /**
   * 3. Build Deployed & Update Live
   */
  private showLiveNotification(commit: string): void {
    this.playLiveChime();

    // 1. Header Badge: Green/cyan live update status (Desktop top bar)
    this.updateHeaderBadge(
      "live",
      `
        <span class="deploy-dot live"></span>
        <span class="deploy-text">Update Live${commit ? ` (${commit})` : ''}</span>
      `,
      `A new version of Power Creature Game was redeployed on Railway! Click to reload.`,
      () => {
        DeployNotifier.triggerReload();
      }
    );

    // 2. Synchronize Mobile Floating Button, Menu Card, and Hamburger Indicator
    this.updateMobileUI("live", commit);

    // 3. Floating Toast Notification
    let toast = document.getElementById("deploy-toast-notification");
    if (toast) toast.remove();

    toast = document.createElement("div");
    toast.id = "deploy-toast-notification";
    toast.className = "deploy-toast-notification live";
    toast.innerHTML = `
      <div class="deploy-toast-content">
        <span class="deploy-toast-icon">✨</span>
        <div class="deploy-toast-body">
          <div class="deploy-toast-title">Railway Update Live</div>
          <div class="deploy-toast-desc">New version redeployed${commit ? ` (commit <code>${commit}</code>)` : ''}. Reload whenever you're ready!</div>
        </div>
        <div class="deploy-toast-actions">
          <button id="btn-deploy-reload" class="btn-deploy-action reload" title="Reload to get latest version">🔄 Reload</button>
          <button id="btn-deploy-dismiss" class="btn-deploy-action dismiss" title="Dismiss">✕</button>
        </div>
      </div>
    `;

    this.getToastMountContainer().appendChild(toast);

    document.getElementById("btn-deploy-reload")?.addEventListener("click", () => {
      DeployNotifier.triggerReload();
    });

    document.getElementById("btn-deploy-dismiss")?.addEventListener("click", () => {
      toast?.classList.add("closing");
      setTimeout(() => toast?.remove(), 300);
    });

    // Auto-fade after 25 seconds (floating button and mobile menu remain active)
    setTimeout(() => {
      if (toast && toast.parentElement) {
        toast.classList.add("closing");
        setTimeout(() => toast?.remove(), 300);
      }
    }, 25000);
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
