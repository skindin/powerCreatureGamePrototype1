/**
 * FloatScrubber: Reusable Blender-style drag-to-scrub numeric float field.
 * Allows click-and-drag horizontal scrubbing (left = decrease, right = increase)
 * or clicking directly to type an exact float value.
 */
export interface FloatScrubberOptions {
  value: number;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  suffix?: string;
  onChange: (val: number) => void;
}

export class FloatScrubber {
  private _element: HTMLElement;
  private _input: HTMLInputElement;
  private _value: number;
  private _min: number | undefined;
  private _max: number | undefined;
  private _step: number;
  private _decimals: number;
  private _onChange: (val: number) => void;

  constructor(options: FloatScrubberOptions) {
    this._value = options.value;
    this._min = options.min;
    this._max = options.max;
    this._step = options.step ?? 0.05;
    this._decimals = options.decimals ?? 2;
    this._onChange = options.onChange;

    this._element = document.createElement("div");
    this._element.className = "float-scrubber-field";

    if (options.label) {
      const labelSpan = document.createElement("span");
      labelSpan.className = "float-scrubber-label";
      labelSpan.textContent = options.label;
      this._element.appendChild(labelSpan);
    }

    this._input = document.createElement("input");
    this._input.type = "number";
    this._input.step = this._step.toString();
    if (this._min !== undefined) this._input.min = this._min.toString();
    if (this._max !== undefined) this._input.max = this._max.toString();
    this._input.className = "prop-number-input";
    this._input.value = this.formatValue(this._value);

    // Direct text editing
    this._input.addEventListener("change", () => {
      let parsed = parseFloat(this._input.value);
      if (isNaN(parsed)) parsed = 0;
      this.setValue(parsed, true);
    });

    this._input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this._input.blur();
      }
    });

    // Horizontal click & drag scrubber
    let isDragging = false;
    let startX = 0;
    let startVal = 0;

    this._element.addEventListener("mousedown", (e) => {
      // If clicking directly into the input to type, don't hijack unless dragging
      if (e.target === this._input && document.activeElement === this._input) return;

      isDragging = true;
      startX = e.clientX;
      startVal = this._value;

      const onMouseMove = (moveEvt: MouseEvent) => {
        if (!isDragging) return;
        const deltaX = moveEvt.clientX - startX;
        // Sensitivity scaled by current magnitude and step size
        const speed = Math.max(0.005, Math.abs(startVal) * 0.02, this._step);
        let newVal = startVal + deltaX * speed * 0.2;
        this.setValue(newVal, true);
      };

      const onMouseUp = () => {
        isDragging = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });

    this._element.appendChild(this._input);

    if (options.suffix) {
      const suffixSpan = document.createElement("span");
      suffixSpan.className = "float-scrubber-suffix";
      suffixSpan.textContent = options.suffix;
      this._element.appendChild(suffixSpan);
    }
  }

  public get element(): HTMLElement {
    return this._element;
  }

  public getValue(): number {
    return this._value;
  }

  public setValue(val: number, triggerChange: boolean = false): void {
    if (this._min !== undefined) val = Math.max(this._min, val);
    if (this._max !== undefined) val = Math.min(this._max, val);

    const rounded = Number(val.toFixed(this._decimals));
    this._value = rounded;
    this._input.value = this.formatValue(rounded);

    if (triggerChange) {
      this._onChange(rounded);
    }
  }

  private formatValue(val: number): string {
    return val.toFixed(this._decimals);
  }
}
