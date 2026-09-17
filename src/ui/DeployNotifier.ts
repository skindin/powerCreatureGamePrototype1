/**
 * DeployNotifier
 * Detects when Railway has redeployed a new update to the live server
 * and displays a non-intrusive notification banner on the page without forcing a refresh.
 */
export class DeployNotifier {
  private initialDeployId: string | null = null;
  private hasNotified = false;
  private checkIntervalTimer: any = null;

  constructor() {
    this.start();
  }

  public start(): void {
    // Initial fetch to record baseline deployment ID
    this.checkDeployment(true);

    // Periodic check every 20 seconds
    this.checkIntervalTimer = setInterval(() => {
      this.checkDeployment(false);
    }, 20000);

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
    if (this.hasNotified) return;

    try {
      const res = await fetch(`/api/version?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!res.ok) return;

      const data = await res.json();
      const deployId = data.deployId || data.commit || data.bootTime;

      if (!deployId) return;

      if (isInitial || !this.initialDeployId) {
        this.initialDeployId = String(deployId);
        return;
      }

      // If deployment ID changed, Railway has restarted with a new deployment!
      if (String(deployId) !== this.initialDeployId) {
        this.hasNotified = true;
        const newCommit = data.commit || (String(deployId).length > 7 ? String(deployId).substring(0, 7) : String(deployId));
        this.showNotification(newCommit);
      }
    } catch {
      // Ignore transient network errors (e.g. while server container cuts over on Railway)
    }
  }

  private playSubtleChime(): void {
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
      // Audio context might be restricted before user interaction; ignore safely
    }
  }

  private showNotification(commit: string): void {
    this.playSubtleChime();

    // 1. Add subtle badge to top bar if header exists
    const topBar = document.querySelector(".top-bar");
    let headerBadge = document.getElementById("header-deploy-badge");
    if (!headerBadge && topBar) {
      headerBadge = document.createElement("div");
      headerBadge.id = "header-deploy-badge";
      headerBadge.className = "header-deploy-badge";
      headerBadge.innerHTML = `
        <span class="deploy-dot"></span>
        <span class="deploy-text">Update Live${commit ? ` (${commit})` : ''}</span>
      `;
      headerBadge.title = "A new version of Power Creature Game was redeployed on Railway! Click if you want to reload.";
      headerBadge.addEventListener("click", () => {
        window.location.reload();
      });
      // Insert before view settings or phone connect button
      const rightGroup = topBar.querySelector(".top-bar-right");
      if (rightGroup) {
        rightGroup.prepend(headerBadge);
      } else {
        topBar.appendChild(headerBadge);
      }
    }

    // 2. Display floating toast notification at top of screen (never auto-reloads)
    let toast = document.getElementById("deploy-toast-notification");
    if (toast) toast.remove();

    toast = document.createElement("div");
    toast.id = "deploy-toast-notification";
    toast.className = "deploy-toast-notification";
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

    // Hook up buttons: Reload is OPTIONAL; Dismiss hides toast
    document.getElementById("btn-deploy-reload")?.addEventListener("click", () => {
      window.location.reload();
    });

    document.getElementById("btn-deploy-dismiss")?.addEventListener("click", () => {
      toast?.classList.add("closing");
      setTimeout(() => toast?.remove(), 300);
    });

    // Auto-fade the floating toast after 14 seconds (the header badge stays visible)
    setTimeout(() => {
      if (toast && document.body.contains(toast)) {
        toast.classList.add("closing");
        setTimeout(() => toast?.remove(), 300);
      }
    }, 14000);
  }
}
