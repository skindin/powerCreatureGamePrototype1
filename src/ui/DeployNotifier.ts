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
  }

  public stop(): void {
    if (this.checkIntervalTimer) {
      clearInterval(this.checkIntervalTimer);
      this.checkIntervalTimer = null;
    }
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

  // --- Notifications ---

  /**
   * 1. Build in Progress / Deploying
   */
  private showBuildingNotification(commit: string, description?: string, targetUrl?: string): void {
    this.playBuildingChime();

    // 1. Header Badge: Amber building status
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

    // 2. Floating Toast Notification
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

    document.body.appendChild(toast);

    document.getElementById("btn-deploy-dismiss")?.addEventListener("click", () => {
      toast?.classList.add("closing");
      setTimeout(() => toast?.remove(), 300);
    });

    // Auto-fade toast after 10 seconds (badge stays until deployment state finishes)
    setTimeout(() => {
      if (toast && document.body.contains(toast)) {
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

    // 1. Header Badge: Red alert status
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

    // 2. Floating Toast Notification
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

    document.body.appendChild(toast);

    document.getElementById("btn-deploy-dismiss")?.addEventListener("click", () => {
      toast?.classList.add("closing");
      setTimeout(() => toast?.remove(), 300);
    });

    // Toast stays up for 25 seconds for error visibility
    setTimeout(() => {
      if (toast && document.body.contains(toast)) {
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

    // 1. Header Badge: Green/cyan live update status
    this.updateHeaderBadge(
      "live",
      `
        <span class="deploy-dot live"></span>
        <span class="deploy-text">Update Live${commit ? ` (${commit})` : ''}</span>
      `,
      `A new version of Power Creature Game was redeployed on Railway! Click if you want to reload.`,
      () => {
        window.location.reload();
      }
    );

    // 2. Floating Toast Notification
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
          <div class="deploy-toast-desc">New version redeployed${commit ? ` (commit <code>${commit}</code>)` : ''}. You can reload whenever you're ready!</div>
        </div>
        <div class="deploy-toast-actions">
          <button id="btn-deploy-reload" class="btn-deploy-action reload">Reload</button>
          <button id="btn-deploy-dismiss" class="btn-deploy-action dismiss" title="Dismiss">✕</button>
        </div>
      </div>
    `;

    document.body.appendChild(toast);

    document.getElementById("btn-deploy-reload")?.addEventListener("click", () => {
      window.location.reload();
    });

    document.getElementById("btn-deploy-dismiss")?.addEventListener("click", () => {
      toast?.classList.add("closing");
      setTimeout(() => toast?.remove(), 300);
    });

    // Auto-fade after 14 seconds
    setTimeout(() => {
      if (toast && document.body.contains(toast)) {
        toast.classList.add("closing");
        setTimeout(() => toast?.remove(), 300);
      }
    }, 14000);
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
