import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import { GameObject } from "../engine/GameObject.js";

/**
 * PropertyControl: Renders a Blender-style dynamic property socket in the UI.
 * - Literal mode: Numeric drag scrubber / input box.
 * - Reference mode: Shows the value directly editable, but has a linked pill badge showing property name.
 * - Broken/Limbo state: Prompts warning with expedited fix (convert to literal or recreate).
 * - Dropdown menu: Searchable list, inline rename, delete, and create new property.
 */
export class PropertyControl {
  private _container: HTMLElement;
  private _property: DynamicProperty;
  private _owner: GameObject;
  private _label: string;
  private _step: number;
  private _isDropdownOpen: boolean = false;
  private _searchTerm: string = "";

  constructor(options: {
    property: DynamicProperty;
    owner: GameObject;
    label: string;
    step?: number;
  }) {
    this._property = options.property;
    this._owner = options.owner;
    this._label = options.label;
    this._step = options.step ?? 0.1;

    this._container = document.createElement("div");
    this._container.className = "prop-socket-control";

    // Auto re-render on property changes
    this._property.subscribe(() => this.render());
    this._owner.properties.subscribe(() => this.render());

    this.render();
  }

  public get element(): HTMLElement {
    return this._container;
  }

  public render(): void {
    const isRef = this._property.isReference;
    const isLimbo = this._property.isLimbo(this._owner.properties);
    const resolvedVal = this._property.get(this._owner.properties);

    this._container.innerHTML = "";

    // Header / Label row
    const labelRow = document.createElement("div");
    labelRow.className = "prop-socket-label-row";

    const labelSpan = document.createElement("span");
    labelSpan.className = "prop-socket-label";
    labelSpan.textContent = this._label;

    labelRow.appendChild(labelSpan);

    if (isRef) {
      const badge = document.createElement("span");
      badge.className = `prop-socket-badge ${isLimbo ? "badge-limbo" : "badge-linked"}`;
      badge.title = isLimbo
        ? `⚠️ Referenced property "${this._property.referenceKey}" was deleted!`
        : `Linked to object property: ${this._property.referenceKey}`;
      badge.textContent = isLimbo
        ? `⚠️ Missing: "${this._property.referenceKey}"`
        : `🔗 ${this._property.referenceKey}`;
      labelRow.appendChild(badge);
    }

    this._container.appendChild(labelRow);

    // Input Control row
    const controlRow = document.createElement("div");
    controlRow.className = "prop-socket-control-row";

    // 1. Interactive Scrub Draggable Input Field
    const scrubBox = document.createElement("div");
    scrubBox.className = `prop-scrub-field ${isRef ? "field-referenced" : ""} ${isLimbo ? "field-limbo" : ""}`;

    const numInput = document.createElement("input");
    numInput.type = "number";
    numInput.step = this._step.toString();
    numInput.value = Number(resolvedVal.toFixed(2)).toString();
    numInput.className = "prop-number-input";

    // Direct input change
    numInput.addEventListener("change", () => {
      const parsed = parseFloat(numInput.value);
      if (!isNaN(parsed)) {
        this._property.set(parsed, this._owner.properties);
      }
    });

    // Horizontal click & drag scrubber
    let isDragging = false;
    let startX = 0;
    let startVal = 0;

    scrubBox.addEventListener("mousedown", (e) => {
      // If clicking directly into the input to type, don't hijack unless dragging
      if (e.target === numInput && document.activeElement === numInput) return;

      isDragging = true;
      startX = e.clientX;
      startVal = this._property.get(this._owner.properties);

      const onMouseMove = (moveEvt: MouseEvent) => {
        if (!isDragging) return;
        const deltaX = moveEvt.clientX - startX;
        // Sensitivity scaled by current magnitude
        const speed = Math.max(0.01, Math.abs(startVal) * 0.02, this._step);
        const newVal = startVal + deltaX * speed * 0.2;
        this._property.set(Number(newVal.toFixed(2)), this._owner.properties);
        numInput.value = Number(newVal.toFixed(2)).toString();
      };

      const onMouseUp = () => {
        isDragging = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });

    scrubBox.appendChild(numInput);
    controlRow.appendChild(scrubBox);

    // 2. Link / Dropdown Toggle Button
    const linkBtn = document.createElement("button");
    linkBtn.type = "button";
    linkBtn.className = `prop-link-btn ${isRef ? "btn-active-link" : ""}`;
    linkBtn.innerHTML = isRef ? "🔗" : "⛓️";
    linkBtn.title = isRef ? "Manage or unlink reference" : "Link to reference property";
    linkBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this._isDropdownOpen = !this._isDropdownOpen;
      this.render();
    });

    controlRow.appendChild(linkBtn);
    this._container.appendChild(controlRow);

    // 3. Limbo Expedited Quick-Fix Bar (if broken reference)
    if (isLimbo) {
      const limboBar = document.createElement("div");
      limboBar.className = "prop-limbo-bar";
      limboBar.innerHTML = `
        <span>Reference missing!</span>
        <button type="button" class="btn-limbo-fix btn-recreate" title="Recreate property with this name">+ Recreate</button>
        <button type="button" class="btn-limbo-fix btn-detach" title="Detach to independent literal value">Unlink</button>
      `;

      limboBar.querySelector(".btn-recreate")?.addEventListener("click", () => {
        this._owner.properties.add(this._property.referenceKey, this._property.literalValue);
        this.render();
      });

      limboBar.querySelector(".btn-detach")?.addEventListener("click", () => {
        this._property.unlink();
        this.render();
      });

      this._container.appendChild(limboBar);
    }

    // 4. Dropdown Panel (if open)
    if (this._isDropdownOpen) {
      this._container.appendChild(this._renderDropdown());
    }
  }

  private _renderDropdown(): HTMLElement {
    const dropdown = document.createElement("div");
    dropdown.className = "prop-dropdown-panel";

    // Stop clicks from bubbling
    dropdown.addEventListener("click", (e) => e.stopPropagation());

    // Search bar
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "🔍 Search properties...";
    searchInput.value = this._searchTerm;
    searchInput.className = "prop-dropdown-search";
    searchInput.addEventListener("input", () => {
      this._searchTerm = searchInput.value.toLowerCase();
      this._updatePropertyList(listContainer);
    });
    dropdown.appendChild(searchInput);

    // Property items list
    const listContainer = document.createElement("div");
    listContainer.className = "prop-dropdown-list";
    this._updatePropertyList(listContainer);
    dropdown.appendChild(listContainer);

    // Create New Property section
    const createRow = document.createElement("div");
    createRow.className = "prop-dropdown-create-row";

    const createInput = document.createElement("input");
    createInput.type = "text";
    createInput.placeholder = "New property name...";
    createInput.className = "prop-create-input";

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "+ Add";
    addBtn.className = "prop-create-btn";
    addBtn.addEventListener("click", () => {
      const name = createInput.value.trim();
      if (!name) return;
      const success = this._owner.properties.add(name, this._property.literalValue);
      if (success) {
        // Automatically link this socket to the new property
        this._property.link(name, this._owner.properties);
        createInput.value = "";
        this._isDropdownOpen = false;
        this.render();
      } else {
        alert(`Property "${name}" already exists on this object!`);
      }
    });

    createRow.appendChild(createInput);
    createRow.appendChild(addBtn);
    dropdown.appendChild(createRow);

    // Unlink button (if currently linked)
    if (this._property.isReference) {
      const unlinkRow = document.createElement("div");
      unlinkRow.className = "prop-dropdown-footer";

      const unlinkBtn = document.createElement("button");
      unlinkBtn.type = "button";
      unlinkBtn.className = "prop-unlink-action-btn";
      unlinkBtn.textContent = "⛓️ Unlink to Independent Value";
      unlinkBtn.addEventListener("click", () => {
        this._property.unlink();
        this._isDropdownOpen = false;
        this.render();
      });

      unlinkRow.appendChild(unlinkBtn);
      dropdown.appendChild(unlinkRow);
    }

    return dropdown;
  }

  private _updatePropertyList(container: HTMLElement): void {
    container.innerHTML = "";
    const allProps = this._owner.properties.getAll();
    const filtered = allProps.filter((p) => p.name.toLowerCase().includes(this._searchTerm));

    if (filtered.length === 0) {
      const emptyItem = document.createElement("div");
      emptyItem.className = "prop-dropdown-empty";
      emptyItem.textContent = allProps.length === 0 ? "No reference properties yet" : "No matching properties";
      container.appendChild(emptyItem);
      return;
    }

    for (const prop of filtered) {
      const itemRow = document.createElement("div");
      const isCurrentlySelected = this._property.isReference && this._property.referenceKey === prop.name;
      itemRow.className = `prop-dropdown-item ${isCurrentlySelected ? "item-selected" : ""}`;

      // Left: Name & Value button
      const selectBtn = document.createElement("button");
      selectBtn.type = "button";
      selectBtn.className = "prop-item-select-btn";
      selectBtn.innerHTML = `<span>${prop.name}</span> <span class="prop-item-val">${prop.value.toFixed(2)}</span>`;
      selectBtn.addEventListener("click", () => {
        this._property.link(prop.name, this._owner.properties);
        this._isDropdownOpen = false;
        this.render();
      });

      itemRow.appendChild(selectBtn);

      // Actions: Rename (✎) & Delete (🗑)
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "prop-item-actions";

      // Rename button
      const renameBtn = document.createElement("button");
      renameBtn.type = "button";
      renameBtn.innerHTML = "✎";
      renameBtn.title = "Rename property";
      renameBtn.className = "prop-action-btn btn-rename";
      renameBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const newName = prompt(`Rename property "${prop.name}" to:`, prop.name);
        if (newName && newName.trim() && newName.trim() !== prop.name) {
          const success = this._owner.properties.rename(prop.name, newName.trim(), [this._property]);
          if (!success) {
            alert(`Could not rename to "${newName}". Name may already exist.`);
          }
          this.render();
        }
      });
      actionsDiv.appendChild(renameBtn);

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.innerHTML = "🗑";
      deleteBtn.title = "Delete property (puts references into limbo)";
      deleteBtn.className = "prop-action-btn btn-delete";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm(`Delete reference property "${prop.name}"? Referencing sockets will enter a warning state.`)) {
          this._owner.properties.delete(prop.name);
          this.render();
        }
      });
      actionsDiv.appendChild(deleteBtn);

      itemRow.appendChild(actionsDiv);
      container.appendChild(itemRow);
    }
  }
}
