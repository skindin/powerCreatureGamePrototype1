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

  // Bulk copy & selection elements
  private btnSelectAll: HTMLInputElement | null;
  private labelSelectAll: HTMLElement | null;
  private selectedCounter: HTMLElement | null;
  private btnCopySelected: HTMLButtonElement | null;
  private btnCopyAll: HTMLButtonElement | null;
  public selectedIds: Set<string> = new Set();

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

    this.btnSelectAll = document.getElementById('btn-feedback-select-all') as HTMLInputElement | null;
    this.labelSelectAll = document.getElementById('label-feedback-select-all');
    this.selectedCounter = document.getElementById('feedback-selected-counter');
    this.btnCopySelected = document.getElementById('btn-copy-selected-feedback') as HTMLButtonElement | null;
    this.btnCopyAll = document.getElementById('btn-copy-all-feedback') as HTMLButtonElement | null;

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

    // Bulk Select All checkbox
    this.btnSelectAll?.addEventListener('change', () => {
      const isChecked = Boolean(this.btnSelectAll?.checked);
      if (isChecked) {
        this.items.forEach((item) => this.selectedIds.add(item.id));
      } else {
        this.selectedIds.clear();
      }
      this.updateSelectionUi();
    });

    // Copy Selected button
    this.btnCopySelected?.addEventListener('click', async () => {
      if (this.selectedIds.size === 0) return;
      // Preserve sorted order when copying
      const selectedItems = this.getSortedItems().filter((item) => this.selectedIds.has(item.id));
      if (selectedItems.length === 0) return;
      const text = this.formatEntriesForClipboard(selectedItems);
      const success = await this.copyToClipboard(text);
      if (success && this.btnCopySelected) {
        this.showButtonCopiedFeedback(this.btnCopySelected, `✓ Copied (${selectedItems.length})!`);
      }
    });

    // Copy All button
    this.btnCopyAll?.addEventListener('click', async () => {
      if (this.items.length === 0) return;
      const allItems = this.getSortedItems();
      const text = this.formatEntriesForClipboard(allItems);
      const success = await this.copyToClipboard(text);
      if (success && this.btnCopyAll) {
        this.showButtonCopiedFeedback(this.btnCopyAll, `✓ Copied All (${allItems.length})!`);
      }
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
          // Purge any selected IDs that were removed
          const validIds = new Set(this.items.map((i) => i.id));
          for (const id of Array.from(this.selectedIds)) {
            if (!validIds.has(id)) this.selectedIds.delete(id);
          }
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

  /**
   * Returns items in canonical display order:
   * 1. Open bugs (newest first)
   * 2. Resolved bugs
   * 3. Open suggestions (oldest first)
   * 4. Resolved suggestions
   */
  public getSortedItems(): FeedbackItem[] {
    const bugs = this.items.filter((i) => i.type === 'bug');
    const suggestions = this.items.filter((i) => i.type === 'suggestion');

    const openBugs = bugs
      .filter((b) => !b.completed)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const resolvedBugs = bugs
      .filter((b) => b.completed)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const openSuggestions = suggestions
      .filter((s) => !s.completed)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const resolvedSuggestions = suggestions
      .filter((s) => s.completed)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return [...openBugs, ...resolvedBugs, ...openSuggestions, ...resolvedSuggestions];
  }

  /**
   * Formats a single item as specified: `Suggestion : 'text'` or `Bug : 'text'`
   */
  public formatEntryForClipboard(item: FeedbackItem): string {
    const label = item.type === 'bug' ? 'Bug' : 'Suggestion';
    return `${label} : '${item.description}'`;
  }

  /**
   * Formats multiple entries as serialized text separated by newlines
   */
  public formatEntriesForClipboard(items: FeedbackItem[]): string {
    return items.map((item) => this.formatEntryForClipboard(item)).join('\n');
  }

  /**
   * Robust clipboard writer with fallback
   */
  public async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      // Fallback
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch (err) {
      console.error('Failed to copy text to clipboard:', err);
      return false;
    }
  }

  private showButtonCopiedFeedback(button: HTMLElement, text: string): void {
    const originalText = button.innerHTML;
    button.classList.add('copied');
    button.innerHTML = `<span>✓</span><span>${text}</span>`;
    setTimeout(() => {
      button.classList.remove('copied');
      button.innerHTML = originalText;
    }, 1600);
  }

  public updateSelectionUi(): void {
    const total = this.items.length;
    const selectedCount = this.selectedIds.size;

    // Update bulk counter pill
    if (this.selectedCounter) {
      if (selectedCount > 0) {
        this.selectedCounter.classList.remove('hidden');
        this.selectedCounter.textContent = `${selectedCount} selected`;
      } else {
        this.selectedCounter.classList.add('hidden');
      }
    }

    // Update "Copy Selected" button
    if (this.btnCopySelected) {
      this.btnCopySelected.disabled = selectedCount === 0;
      const label = document.getElementById('label-copy-selected');
      if (label) {
        label.textContent = selectedCount > 0 ? `Copy Selected (${selectedCount})` : 'Copy Selected';
      }
    }

    // Update "Copy All" button
    if (this.btnCopyAll) {
      this.btnCopyAll.disabled = total === 0;
    }

    // Update "Select All" checkbox
    if (this.btnSelectAll) {
      this.btnSelectAll.checked = total > 0 && selectedCount === total;
      this.btnSelectAll.indeterminate = selectedCount > 0 && selectedCount < total;
      if (this.labelSelectAll) {
        this.labelSelectAll.textContent = selectedCount === total && total > 0 ? 'Deselect All' : 'Select All';
      }
    }

    // Update card selected highlight class and select checkboxes in DOM
    const cards = this.panelElement?.querySelectorAll<HTMLElement>('.feedback-item-card');
    cards?.forEach((card) => {
      const id = card.getAttribute('data-id');
      if (!id) return;
      const isSelected = this.selectedIds.has(id);
      card.classList.toggle('selected', isSelected);
      const cb = card.querySelector<HTMLInputElement>('.feedback-item-select');
      if (cb) cb.checked = isSelected;
    });
  }

  private render(): void {
    // 1. Separate Suggestions from Bugs
    const suggestions = this.items.filter((i) => i.type === 'suggestion');
    const bugs = this.items.filter((i) => i.type === 'bug');

    // Requirement: "order suggestions from oldest to newest"
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

    // 3. Render Bugs First (Above Suggestions)
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

    // 4. Render Suggestions Second
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

    // 5. Bind interactive listeners
    this.bindCheckboxListeners();

    // 6. Update bulk selection UI states
    this.updateSelectionUi();
  }

  private renderCardHtml(item: FeedbackItem): string {
    const localTime = this.formatLocalTime(item.createdAt);
    const checkedAttr = item.completed ? 'checked' : '';
    const completedClass = item.completed ? 'completed' : '';
    const typeClass = item.type === 'bug' ? 'is-bug' : 'is-suggestion';
    const isSelected = this.selectedIds.has(item.id);
    const selectedClass = isSelected ? 'selected' : '';
    const selectCheckedAttr = isSelected ? 'checked' : '';
    const escapedDesc = this.escapeHtml(item.description);
    const escapedAuthor = this.escapeHtml(item.author || 'Anonymous Creature');

    return `
      <div class="feedback-item-card ${typeClass} ${completedClass} ${selectedClass}" data-id="${item.id}">
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
        <div class="feedback-item-actions">
          <button
            type="button"
            class="btn-copy-item"
            data-id="${item.id}"
            title="Copy this entry to clipboard"
          >
            <span class="copy-icon">📋</span>
            <span class="copy-text">Copy</span>
          </button>
          <label class="feedback-select-item-label" title="Select for bulk copy">
            <input
              type="checkbox"
              class="feedback-select-box feedback-item-select"
              data-id="${item.id}"
              ${selectCheckedAttr}
            />
            <span>Select</span>
          </label>
        </div>
      </div>
    `;
  }

  private bindCheckboxListeners(): void {
    // 1. Resolve / Completed Checkboxes
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

    // 2. Individual Copy Buttons
    const copyButtons = this.panelElement?.querySelectorAll<HTMLButtonElement>('.btn-copy-item');
    copyButtons?.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (!id) return;
        const item = this.items.find((i) => i.id === id);
        if (!item) return;
        const text = this.formatEntryForClipboard(item);
        const success = await this.copyToClipboard(text);
        if (success) {
          const originalHtml = btn.innerHTML;
          btn.classList.add('copied');
          btn.innerHTML = `<span>✓</span><span>Copied!</span>`;
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = originalHtml;
          }, 1500);
        }
      });
    });

    // 3. Selection Checkboxes
    const selectBoxes = this.panelElement?.querySelectorAll<HTMLInputElement>('.feedback-item-select');
    selectBoxes?.forEach((sb) => {
      sb.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const id = target.getAttribute('data-id');
        if (!id) return;
        if (target.checked) {
          this.selectedIds.add(id);
        } else {
          this.selectedIds.delete(id);
        }
        this.updateSelectionUi();
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
