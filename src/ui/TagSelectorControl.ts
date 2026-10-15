import { consumableTagRegistry } from "../engine/properties/ConsumableTagRegistry.js";

export interface SingleTagSelectorOptions {
  mode: "single";
  label: string;
  currentTag: string;
  onTagSelected: (tag: string) => void;
}

export interface MultiTagSelectorOptions {
  mode: "multi";
  label: string;
  acceptedTags: string[];
  onTagsChanged: (tags: string[]) => void;
}

export type TagSelectorOptions = SingleTagSelectorOptions | MultiTagSelectorOptions;

/**
 * TagSelectorControl: Blender-style dropdown & chip management UI for consumable tags.
 * Supports:
 * - Single-select (for Consumable items)
 * - Multi-select (for Character Consume module)
 * - Search filter
 * - Inline "+ Add / Create New Tag"
 * - Inline Rename ("✎") with cascading propagation
 * - Inline Delete ("🗑") with cascading unlinking
 */
export class TagSelectorControl {
  private _container: HTMLElement;
  private _options: TagSelectorOptions;
  private _isDropdownOpen: boolean = false;
  private _searchTerm: string = "";
  private _unsubscribeRegistry?: () => void;

  constructor(options: TagSelectorOptions) {
    this._options = options;
    this._container = document.createElement("div");
    this._container.className = "tag-selector-control";

    this._unsubscribeRegistry = consumableTagRegistry.subscribe(() => {
      this.render();
    });

    this.render();
  }

  public get element(): HTMLElement {
    return this._container;
  }

  public destroy(): void {
    if (this._unsubscribeRegistry) {
      this._unsubscribeRegistry();
    }
  }

  public render(): void {
    this._container.innerHTML = "";

    // 1. Header / Label Row
    const labelRow = document.createElement("div");
    labelRow.className = "prop-socket-label-row";

    const labelSpan = document.createElement("span");
    labelSpan.className = "prop-socket-label";
    labelSpan.textContent = this._options.label;
    labelRow.appendChild(labelSpan);

    if (this._options.mode === "single") {
      const badge = document.createElement("span");
      badge.className = "prop-socket-badge badge-linked";
      badge.textContent = `🏷️ ${this._options.currentTag || "None"}`;
      labelRow.appendChild(badge);
    } else {
      const countBadge = document.createElement("span");
      countBadge.className = "prop-socket-badge";
      countBadge.style.background = "rgba(56, 189, 248, 0.15)";
      countBadge.style.color = "#38bdf8";
      countBadge.textContent = `${this._options.acceptedTags.length} active tags`;
      labelRow.appendChild(countBadge);
    }

    this._container.appendChild(labelRow);

    // 2. Control Row
    const controlRow = document.createElement("div");
    controlRow.className = "tag-control-row";
    controlRow.style.display = "flex";
    controlRow.style.flexDirection = "column";
    controlRow.style.gap = "6px";
    controlRow.style.position = "relative";

    if (this._options.mode === "single") {
      // Single Tag Selector Button
      const selectBtn = document.createElement("button");
      selectBtn.type = "button";
      selectBtn.className = "prop-dropdown-toggle-btn";
      selectBtn.style.display = "flex";
      selectBtn.style.alignItems = "center";
      selectBtn.style.justifyContent = "space-between";
      selectBtn.style.width = "100%";
      selectBtn.style.padding = "6px 10px";
      selectBtn.style.background = "#1e293b";
      selectBtn.style.border = "1px solid #334155";
      selectBtn.style.borderRadius = "4px";
      selectBtn.style.color = "#f1f5f9";
      selectBtn.style.cursor = "pointer";
      selectBtn.style.fontSize = "12px";

      selectBtn.innerHTML = `<span>🏷️ <b>${this._options.currentTag || "(None)"}</b></span> <span>${this._isDropdownOpen ? "▲" : "▼"}</span>`;
      selectBtn.addEventListener("click", () => {
        this._isDropdownOpen = !this._isDropdownOpen;
        this.render();
      });

      controlRow.appendChild(selectBtn);
    } else {
      // Multi Tag Chips Row
      const chipsContainer = document.createElement("div");
      chipsContainer.className = "tag-chips-container";
      chipsContainer.style.display = "flex";
      chipsContainer.style.flexWrap = "wrap";
      chipsContainer.style.gap = "4px";
      chipsContainer.style.alignItems = "center";

      if (this._options.acceptedTags.length === 0) {
        const emptyNotice = document.createElement("span");
        emptyNotice.style.fontSize = "11px";
        emptyNotice.style.color = "#94a3b8";
        emptyNotice.style.fontStyle = "italic";
        emptyNotice.textContent = "No tags accepted (cannot consume any items)";
        chipsContainer.appendChild(emptyNotice);
      } else {
        for (const tag of this._options.acceptedTags) {
          const chip = document.createElement("span");
          chip.className = "tag-chip";
          chip.style.display = "inline-flex";
          chip.style.alignItems = "center";
          chip.style.gap = "4px";
          chip.style.padding = "2px 8px";
          chip.style.borderRadius = "12px";
          chip.style.background = "rgba(56, 189, 248, 0.2)";
          chip.style.border = "1px solid rgba(56, 189, 248, 0.4)";
          chip.style.color = "#38bdf8";
          chip.style.fontSize = "11px";
          chip.style.fontWeight = "600";

          const tagText = document.createElement("span");
          tagText.textContent = tag;
          chip.appendChild(tagText);

          const removeBtn = document.createElement("button");
          removeBtn.type = "button";
          removeBtn.textContent = "✕";
          removeBtn.title = `Remove "${tag}"`;
          removeBtn.style.background = "none";
          removeBtn.style.border = "none";
          removeBtn.style.color = "#94a3b8";
          removeBtn.style.cursor = "pointer";
          removeBtn.style.padding = "0 2px";
          removeBtn.style.fontSize = "10px";
          removeBtn.style.lineHeight = "1";
          removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (this._options.mode === "multi") {
              const updated = this._options.acceptedTags.filter((t) => t.toLowerCase() !== tag.toLowerCase());
              this._options.acceptedTags = updated;
              this._options.onTagsChanged(updated);
              this.render();
            }
          });

          chip.appendChild(removeBtn);
          chipsContainer.appendChild(chip);
        }
      }

      // "+ Add Tag" toggle button
      const addTagToggleBtn = document.createElement("button");
      addTagToggleBtn.type = "button";
      addTagToggleBtn.className = "prop-action-btn";
      addTagToggleBtn.style.display = "inline-flex";
      addTagToggleBtn.style.alignItems = "center";
      addTagToggleBtn.style.gap = "4px";
      addTagToggleBtn.style.padding = "3px 8px";
      addTagToggleBtn.style.background = "#1e293b";
      addTagToggleBtn.style.border = "1px solid #38bdf8";
      addTagToggleBtn.style.borderRadius = "12px";
      addTagToggleBtn.style.color = "#38bdf8";
      addTagToggleBtn.style.fontSize = "11px";
      addTagToggleBtn.style.cursor = "pointer";
      addTagToggleBtn.textContent = this._isDropdownOpen ? "Close ▲" : "+ Add Tag ▼";
      addTagToggleBtn.addEventListener("click", () => {
        this._isDropdownOpen = !this._isDropdownOpen;
        this.render();
      });

      chipsContainer.appendChild(addTagToggleBtn);
      controlRow.appendChild(chipsContainer);
    }

    // 3. Dropdown Menu (if open)
    if (this._isDropdownOpen) {
      const dropdown = this._buildDropdown();
      controlRow.appendChild(dropdown);
    }

    this._container.appendChild(controlRow);
  }

  private _buildDropdown(): HTMLElement {
    const dropdown = document.createElement("div");
    dropdown.className = "prop-dropdown-menu";
    dropdown.style.marginTop = "4px";
    dropdown.style.padding = "8px";
    dropdown.style.background = "#0f172a";
    dropdown.style.border = "1px solid #334155";
    dropdown.style.borderRadius = "6px";
    dropdown.style.boxShadow = "0 8px 24px rgba(0,0,0,0.5)";
    dropdown.style.zIndex = "100";

    // Search bar
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search tags...";
    searchInput.value = this._searchTerm;
    searchInput.className = "prop-search-input";
    searchInput.style.width = "100%";
    searchInput.style.boxSizing = "border-box";
    searchInput.style.padding = "5px 8px";
    searchInput.style.marginBottom = "6px";
    searchInput.style.background = "#1e293b";
    searchInput.style.border = "1px solid #475569";
    searchInput.style.borderRadius = "4px";
    searchInput.style.color = "#f8fafc";
    searchInput.style.fontSize = "12px";
    searchInput.addEventListener("input", () => {
      this._searchTerm = searchInput.value.toLowerCase();
      this._updateTagList(listContainer);
    });
    dropdown.appendChild(searchInput);

    // Tag list container
    const listContainer = document.createElement("div");
    listContainer.className = "prop-dropdown-list";
    listContainer.style.maxHeight = "160px";
    listContainer.style.overflowY = "auto";
    listContainer.style.display = "flex";
    listContainer.style.flexDirection = "column";
    listContainer.style.gap = "3px";
    this._updateTagList(listContainer);
    dropdown.appendChild(listContainer);

    // Create New Tag Row
    const createRow = document.createElement("div");
    createRow.className = "prop-create-row";
    createRow.style.display = "flex";
    createRow.style.gap = "4px";
    createRow.style.marginTop = "8px";
    createRow.style.paddingTop = "6px";
    createRow.style.borderTop = "1px solid #334155";

    const createInput = document.createElement("input");
    createInput.type = "text";
    createInput.placeholder = "Create new tag...";
    createInput.className = "prop-create-input";
    createInput.style.flex = "1";
    createInput.style.padding = "4px 8px";
    createInput.style.background = "#1e293b";
    createInput.style.border = "1px solid #475569";
    createInput.style.borderRadius = "4px";
    createInput.style.color = "#f8fafc";
    createInput.style.fontSize = "11px";

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "prop-create-btn";
    addBtn.textContent = "+ Create";
    addBtn.style.padding = "4px 10px";
    addBtn.style.background = "#2563eb";
    addBtn.style.border = "none";
    addBtn.style.borderRadius = "4px";
    addBtn.style.color = "#ffffff";
    addBtn.style.fontSize = "11px";
    addBtn.style.fontWeight = "600";
    addBtn.style.cursor = "pointer";

    addBtn.addEventListener("click", () => {
      const name = createInput.value.trim().toLowerCase();
      if (!name) return;
      if (consumableTagRegistry.has(name)) {
        alert(`Tag "${name}" already exists!`);
        return;
      }
      consumableTagRegistry.add(name);
      if (this._options.mode === "single") {
        this._options.currentTag = name;
        this._options.onTagSelected(name);
        this._isDropdownOpen = false;
      } else {
        if (!this._options.acceptedTags.includes(name)) {
          this._options.acceptedTags.push(name);
          this._options.onTagsChanged(this._options.acceptedTags);
        }
      }
      createInput.value = "";
      this.render();
    });

    createRow.appendChild(createInput);
    createRow.appendChild(addBtn);
    dropdown.appendChild(createRow);

    return dropdown;
  }

  private _updateTagList(container: HTMLElement): void {
    container.innerHTML = "";
    const allTags = consumableTagRegistry.getAll();
    const filtered = allTags.filter((t) => t.toLowerCase().includes(this._searchTerm));

    if (filtered.length === 0) {
      const emptyItem = document.createElement("div");
      emptyItem.className = "prop-dropdown-empty";
      emptyItem.style.padding = "6px";
      emptyItem.style.fontSize = "11px";
      emptyItem.style.color = "#94a3b8";
      emptyItem.style.textAlign = "center";
      emptyItem.textContent = allTags.length === 0 ? "No tags created yet" : "No matching tags";
      container.appendChild(emptyItem);
      return;
    }

    for (const tag of filtered) {
      const itemRow = document.createElement("div");
      itemRow.className = "prop-dropdown-item";
      itemRow.style.display = "flex";
      itemRow.style.alignItems = "center";
      itemRow.style.justifyContent = "space-between";
      itemRow.style.padding = "4px 6px";
      itemRow.style.borderRadius = "4px";
      itemRow.style.background = "#1e293b";

      const isSelected =
        this._options.mode === "single"
          ? this._options.currentTag.toLowerCase() === tag.toLowerCase()
          : this._options.acceptedTags.some((t) => t.toLowerCase() === tag.toLowerCase());

      // Left: Tag selection button
      const selectBtn = document.createElement("button");
      selectBtn.type = "button";
      selectBtn.className = "prop-item-select-btn";
      selectBtn.style.flex = "1";
      selectBtn.style.textAlign = "left";
      selectBtn.style.background = "none";
      selectBtn.style.border = "none";
      selectBtn.style.color = isSelected ? "#38bdf8" : "#f1f5f9";
      selectBtn.style.cursor = "pointer";
      selectBtn.style.fontSize = "12px";
      selectBtn.style.fontWeight = isSelected ? "bold" : "normal";

      const prefix = isSelected ? "✓ " : "🏷️ ";
      selectBtn.textContent = `${prefix}${tag}`;

      selectBtn.addEventListener("click", () => {
        if (this._options.mode === "single") {
          this._options.currentTag = tag;
          this._options.onTagSelected(tag);
          this._isDropdownOpen = false;
        } else {
          if (!this._options.acceptedTags.includes(tag)) {
            this._options.acceptedTags.push(tag);
            this._options.onTagsChanged(this._options.acceptedTags);
          }
        }
        this.render();
      });

      itemRow.appendChild(selectBtn);

      // Actions: Rename (✎) & Delete (🗑)
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "prop-item-actions";
      actionsDiv.style.display = "flex";
      actionsDiv.style.gap = "4px";

      // Rename button
      const renameBtn = document.createElement("button");
      renameBtn.type = "button";
      renameBtn.innerHTML = "✎";
      renameBtn.title = `Rename tag "${tag}"`;
      renameBtn.className = "prop-action-btn btn-rename";
      renameBtn.style.background = "#334155";
      renameBtn.style.border = "none";
      renameBtn.style.borderRadius = "3px";
      renameBtn.style.color = "#cbd5e1";
      renameBtn.style.padding = "2px 6px";
      renameBtn.style.cursor = "pointer";
      renameBtn.style.fontSize = "11px";

      renameBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const newName = prompt(`Rename tag "${tag}" to:`, tag);
        if (newName && newName.trim() && newName.trim().toLowerCase() !== tag.toLowerCase()) {
          const success = consumableTagRegistry.rename(tag, newName.trim());
          if (!success) {
            alert(`Could not rename to "${newName}". Name may already exist.`);
          } else {
            if (this._options.mode === "single" && this._options.currentTag.toLowerCase() === tag.toLowerCase()) {
              this._options.currentTag = newName.trim().toLowerCase();
              this._options.onTagSelected(this._options.currentTag);
            }
          }
          this.render();
        }
      });
      actionsDiv.appendChild(renameBtn);

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.innerHTML = "🗑";
      deleteBtn.title = `Delete tag "${tag}" (removes references across items & characters)`;
      deleteBtn.className = "prop-action-btn btn-delete";
      deleteBtn.style.background = "#ef4444";
      deleteBtn.style.border = "none";
      deleteBtn.style.borderRadius = "3px";
      deleteBtn.style.color = "#ffffff";
      deleteBtn.style.padding = "2px 6px";
      deleteBtn.style.cursor = "pointer";
      deleteBtn.style.fontSize = "11px";

      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm(`Delete tag "${tag}"? All consumable items and characters referencing this tag will have it removed.`)) {
          consumableTagRegistry.delete(tag);
          if (this._options.mode === "single" && this._options.currentTag.toLowerCase() === tag.toLowerCase()) {
            this._options.currentTag = "";
            this._options.onTagSelected("");
          }
          this.render();
        }
      });
      actionsDiv.appendChild(deleteBtn);

      itemRow.appendChild(actionsDiv);
      container.appendChild(itemRow);
    }
  }
}
