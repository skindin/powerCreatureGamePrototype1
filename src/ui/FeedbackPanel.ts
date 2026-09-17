export interface FeedbackItem {
  id: string;
  type: 'bug' | 'suggestion';
  description: string;
  author: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string | null;
}

export class FeedbackPanel {
  private panelElement: HTMLElement | null;
  private toggleButton: HTMLElement | null;
  private mobileButton: HTMLElement | null;
  private closeButton: HTMLElement | null;
  private badgeTextElement: HTMLElement | null;
  private mobileBadgeElement: HTMLElement | null;
  private headerCountElement: HTMLElement | null;

  // Form elements
  private btnToggleAdd: HTMLElement | null;
  private formElement: HTMLFormElement | null;
  private selectType: HTMLSelectElement | null;
  private inputAuthor: HTMLInputElement | null;
  private textareaDesc: HTMLTextAreaElement | null;
  private formMsgElement: HTMLElement | null;

  // List elements
  private listOpenSuggestions: HTMLElement | null;
  private listResolvedSuggestions: HTMLElement | null;
  private btnToggleResolvedSuggestions: HTMLButtonElement | null;
  private countOpenSuggestions: HTMLElement | null;

  private listOpenBugs: HTMLElement | null;
  private listResolvedBugs: HTMLElement | null;
  private btnToggleResolvedBugs: HTMLButtonElement | null;
  private countOpenBugs: HTMLElement | null;

  public isOpen = false;
  private isFormExpanded = false;
  private showResolvedSuggestions = false;
  private showResolvedBugs = false;
  private items: FeedbackItem[] = [];
  private pollTimer: any = null;

  constructor() {
    this.panelElement = document.getElementById('feedback-panel');
    this.toggleButton = document.getElementById('toggle-feedback-btn');
    this.mobileButton = document.getElementById('mobile-btn-feedback');
    this.closeButton = document.getElementById('btn-close-feedback-panel');
    this.badgeTextElement = document.getElementById('feedback-badge-text');
    this.mobileBadgeElement = document.getElementById('mobile-feedback-badge');
    this.headerCountElement = document.getElementById('feedback-header-count');

    this.btnToggleAdd = document.getElementById('btn-toggle-add-feedback');
    this.formElement = document.getElementById('feedback-form') as HTMLFormElement | null;
    this.selectType = document.getElementById('feedback-form-type') as HTMLSelectElement | null;
    this.inputAuthor = document.getElementById('feedback-form-author') as HTMLInputElement | null;
    this.textareaDesc = document.getElementById('feedback-form-desc') as HTMLTextAreaElement | null;
    this.formMsgElement = document.getElementById('feedback-form-msg');

    this.listOpenSuggestions = document.getElementById('list-open-suggestions');
    this.listResolvedSuggestions = document.getElementById('list-resolved-suggestions');
    this.btnToggleResolvedSuggestions = document.getElementById('btn-toggle-resolved-suggestions') as HTMLButtonElement | null;
    this.countOpenSuggestions = document.getElementById('count-open-suggestions');

    this.listOpenBugs = document.getElementById('list-open-bugs');
    this.listResolvedBugs = document.getElementById('list-resolved-bugs');
    this.btnToggleResolvedBugs = document.getElementById('btn-toggle-resolved-bugs') as HTMLButtonElement | null;
    this.countOpenBugs = document.getElementById('count-open-bugs');

    this.setupListeners();
    this.fetchFeedback();

    // Background polling every 15s to pick up other users' submissions
    this.pollTimer = setInterval(() => {
      this.fetchFeedback(true);
    }, 15000);
  }

  public open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.panelElement?.classList.remove('hidden');
    this.toggleButton?.classList.add('active');
    this.fetchFeedback();
  }

  public close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.panelElement?.classList.add('hidden');
    this.toggleButton?.classList.remove('active');
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private setupListeners(): void {
    const handleToggle = () => this.toggle();
    this.toggleButton?.addEventListener('click', handleToggle);
    this.mobileButton?.addEventListener('click', () => {
      const mobileMenu = document.getElementById('mobile-expanded-menu');
      if (mobileMenu) mobileMenu.classList.add('hidden');
      const mobileBtn = document.getElementById('mobile-menu-btn');
      if (mobileBtn) mobileBtn.classList.remove('active');
      this.open();
    });

    this.closeButton?.addEventListener('click', () => this.close());

    // Toggle add form
    this.btnToggleAdd?.addEventListener('click', () => {
      this.isFormExpanded = !this.isFormExpanded;
      if (this.formElement) {
        this.formElement.classList.toggle('hidden', !this.isFormExpanded);
      }
      const icon = document.getElementById('add-feedback-toggle-icon');
      const label = document.getElementById('add-feedback-toggle-label');
      if (icon) icon.textContent = this.isFormExpanded ? '▲' : '➕';
      if (label) label.textContent = this.isFormExpanded ? 'Hide Form' : 'Add Bug / Suggestion';
      if (this.isFormExpanded && this.textareaDesc) {
        this.textareaDesc.focus();
      }
    });

    // Form submit
    this.formElement?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });

    // Toggle resolved suggestions accordion
    this.btnToggleResolvedSuggestions?.addEventListener('click', () => {
      this.showResolvedSuggestions = !this.showResolvedSuggestions;
      if (this.listResolvedSuggestions) {
        this.listResolvedSuggestions.classList.toggle('hidden', !this.showResolvedSuggestions);
      }
      this.btnToggleResolvedSuggestions?.classList.toggle('open', this.showResolvedSuggestions);
      const arrow = this.btnToggleResolvedSuggestions?.querySelector('.toggle-arrow');
      if (arrow) arrow.textContent = this.showResolvedSuggestions ? '▼' : '▶';
    });

    // Toggle resolved bugs accordion
    this.btnToggleResolvedBugs?.addEventListener('click', () => {
      this.showResolvedBugs = !this.showResolvedBugs;
      if (this.listResolvedBugs) {
        this.listResolvedBugs.classList.toggle('hidden', !this.showResolvedBugs);
      }
      this.btnToggleResolvedBugs?.classList.toggle('open', this.showResolvedBugs);
      const arrow = this.btnToggleResolvedBugs?.querySelector('.toggle-arrow');
      if (arrow) arrow.textContent = this.showResolvedBugs ? '▼' : '▶';
    });

    // Close on background click
    this.panelElement?.addEventListener('click', (e) => {
      if (e.target === this.panelElement) {
        this.close();
      }
    });
  }

  public async fetchFeedback(silent = false): Promise<void> {
    try {
      const res = await fetch('/api/feedback');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          this.items = data;
          this.render();
        }
      }
    } catch (err) {
      if (!silent) console.warn('Could not fetch feedback:', err);
    }
  }

  private async handleSubmit(): Promise<void> {
    if (!this.textareaDesc) return;
    const desc = this.textareaDesc.value.trim();
    if (!desc) {
      this.showFormMsg('Please enter a description.', true);
      return;
    }

    const type = this.selectType?.value === 'bug' ? 'bug' : 'suggestion';
    const author = this.inputAuthor?.value.trim() || 'Anonymous Creature';

    const submitBtn = document.getElementById('btn-submit-feedback') as HTMLButtonElement | null;
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, description: desc, author }),
      });

      if (res.ok) {
        this.textareaDesc.value = '';
        if (this.selectType) this.selectType.value = 'suggestion'; // Keep suggestion as default
        this.showFormMsg('Report submitted successfully! Visible to everyone in the log.', false);
        await this.fetchFeedback();
      } else {
        this.showFormMsg('Failed to submit report. Please try again.', true);
      }
    } catch (err) {
      this.showFormMsg('Network error submitting report.', true);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  private showFormMsg(msg: string, isError: boolean): void {
    if (!this.formMsgElement) return;
    this.formMsgElement.textContent = msg;
    this.formMsgElement.className = `feedback-form-msg ${isError ? 'error' : 'success'}`;
    setTimeout(() => {
      if (this.formMsgElement && this.formMsgElement.textContent === msg) {
        this.formMsgElement.textContent = '';
      }
    }, 4500);
  }

  public async toggleItemStatus(id: string, completed: boolean): Promise<void> {
    // Optimistic update in memory
    const target = this.items.find((i) => i.id === id);
    if (target) {
      target.completed = completed;
      target.completedAt = completed ? new Date().toISOString() : null;
      this.render();
    }

    try {
      await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
    } catch (err) {
      console.warn('Failed to update feedback status:', err);
      // Re-fetch to synchronize with server state
      this.fetchFeedback();
    }
  }

  private formatLocalTime(isoStr: string): string {
    try {
      const d = new Date(isoStr);
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return isoStr;
    }
  }

  private render(): void {
    // 1. Separate Suggestions from Bugs
    const suggestions = this.items.filter((i) => i.type === 'suggestion');
    const bugs = this.items.filter((i) => i.type === 'bug');

    // Requirement: "order suggestions from oldest to newest"
    // Unchecked suggestions: oldest first (ascending createdAt timestamp)
    const openSuggestions = suggestions
      .filter((s) => !s.completed)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Checked suggestions sorted to the bottom of suggestions
    const resolvedSuggestions = suggestions
      .filter((s) => s.completed)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Bugs: Unchecked bugs (newest first), checked sorted to the bottom of bugs
    const openBugs = bugs
      .filter((b) => !b.completed)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const resolvedBugs = bugs
      .filter((b) => b.completed)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalOpen = openSuggestions.length + openBugs.length;

    // 2. Update Header & Button Badges
    if (this.badgeTextElement) {
      this.badgeTextElement.textContent = `Feedback (${totalOpen})`;
    }
    if (this.mobileBadgeElement) {
      this.mobileBadgeElement.textContent = totalOpen.toString();
    }
    if (this.headerCountElement) {
      this.headerCountElement.textContent = `${totalOpen} Open`;
    }

    if (this.countOpenSuggestions) {
      this.countOpenSuggestions.textContent = `${openSuggestions.length} Open`;
    }
    if (this.countOpenBugs) {
      this.countOpenBugs.textContent = `${openBugs.length} Open`;
    }

    // 3. Render Open Suggestions
    if (this.listOpenSuggestions) {
      if (openSuggestions.length === 0) {
        this.listOpenSuggestions.innerHTML = `
          <div class="feedback-empty-state">
            <span>💡 No open suggestions. Got an idea? Add one above!</span>
          </div>
        `;
      } else {
        this.listOpenSuggestions.innerHTML = openSuggestions.map((item) => this.renderCardHtml(item)).join('');
      }
    }

    // 4. Render Resolved Suggestions (Sorted to the bottom of suggestions, hidden by default)
    if (this.listResolvedSuggestions) {
      this.listResolvedSuggestions.innerHTML = resolvedSuggestions.map((item) => this.renderCardHtml(item)).join('');
      this.listResolvedSuggestions.classList.toggle('hidden', !this.showResolvedSuggestions);
    }
    if (this.btnToggleResolvedSuggestions) {
      this.btnToggleResolvedSuggestions.style.display = resolvedSuggestions.length > 0 ? 'flex' : 'none';
      const textSpan = this.btnToggleResolvedSuggestions.querySelector('.toggle-text');
      if (textSpan) {
        textSpan.textContent = this.showResolvedSuggestions
          ? `Hide Completed Suggestions (${resolvedSuggestions.length})`
          : `Show Completed Suggestions (${resolvedSuggestions.length})`;
      }
    }

    // 5. Render Open Bugs
    if (this.listOpenBugs) {
      if (openBugs.length === 0) {
        this.listOpenBugs.innerHTML = `
          <div class="feedback-empty-state">
            <span>🎉 No open bugs reported! Everything is running smoothly.</span>
          </div>
        `;
      } else {
        this.listOpenBugs.innerHTML = openBugs.map((item) => this.renderCardHtml(item)).join('');
      }
    }

    // 6. Render Resolved Bugs (Sorted to the bottom of bugs, hidden by default)
    if (this.listResolvedBugs) {
      this.listResolvedBugs.innerHTML = resolvedBugs.map((item) => this.renderCardHtml(item)).join('');
      this.listResolvedBugs.classList.toggle('hidden', !this.showResolvedBugs);
    }
    if (this.btnToggleResolvedBugs) {
      this.btnToggleResolvedBugs.style.display = resolvedBugs.length > 0 ? 'flex' : 'none';
      const textSpan = this.btnToggleResolvedBugs.querySelector('.toggle-text');
      if (textSpan) {
        textSpan.textContent = this.showResolvedBugs
          ? `Hide Resolved Bugs (${resolvedBugs.length})`
          : `Show Resolved Bugs (${resolvedBugs.length})`;
      }
    }

    // 7. Bind interactive checkbox listeners
    this.bindCheckboxListeners();
  }

  private renderCardHtml(item: FeedbackItem): string {
    const localTime = this.formatLocalTime(item.createdAt);
    const checkedAttr = item.completed ? 'checked' : '';
    const completedClass = item.completed ? 'completed' : '';
    const typeClass = item.type === 'bug' ? 'is-bug' : 'is-suggestion';
    const escapedDesc = this.escapeHtml(item.description);
    const escapedAuthor = this.escapeHtml(item.author || 'Anonymous Creature');

    return `
      <div class="feedback-item-card ${typeClass} ${completedClass}" data-id="${item.id}">
        <div class="feedback-checkbox-wrapper">
          <input
            type="checkbox"
            class="feedback-checkbox"
            data-id="${item.id}"
            ${checkedAttr}
            title="${item.completed ? 'Mark as open' : 'Mark as resolved'}"
          />
        </div>
        <div class="feedback-item-content">
          <p class="feedback-item-desc">${escapedDesc}</p>
          <div class="feedback-item-meta">
            <span class="meta-author">👤 ${escapedAuthor}</span>
            <span class="meta-time" title="Submitted at local time">🕒 ${localTime}</span>
          </div>
        </div>
      </div>
    `;
  }

  private bindCheckboxListeners(): void {
    const checkboxes = this.panelElement?.querySelectorAll<HTMLInputElement>('.feedback-checkbox');
    checkboxes?.forEach((cb) => {
      cb.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const id = target.getAttribute('data-id');
        if (id) {
          this.toggleItemStatus(id, target.checked);
        }
      });
    });
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  public destroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }
}
