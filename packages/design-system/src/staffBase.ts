// Use a runtime-safe fallback for environments without `HTMLElement` (SSR/Node).
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- prevents errrors if loaded in SSR
export const _MaybeHTMLElement: any =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- prevents errrors if loaded in SSR
  typeof globalThis !== 'undefined' && (globalThis as any).HTMLElement
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any -- prevents errrors if loaded in SSR
      (globalThis as any).HTMLElement
    : class {};

export abstract class StaffElementBase extends _MaybeHTMLElement {
  protected readonly staffContainer: HTMLDivElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.staffContainer = document.createElement('div');
  }

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(
    _name: string,
    oldValue: string | null,
    newValue: string | null
  ): void {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  protected get staffLineCount(): number {
    return 5;
  }

  protected get staffLineStart(): number {
    return 10;
  }

  protected get staffLineSpacing(): number {
    return 10;
  }

  protected buildStaffLines(container: HTMLDivElement): void {
    container.classList.add('staff-container');

    const linesY = Array.from(
      { length: this.staffLineCount },
      (_, i) => this.staffLineStart + i * this.staffLineSpacing
    );

    let yOffset = this.staffLineSpacing;
    linesY.slice(1, linesY.length - 1).forEach(() => {
      const line = document.createElement('div');
      line.classList.add('staff-line');
      line.style.top = `${yOffset}px`;
      container.appendChild(line);
      yOffset += this.staffLineSpacing;
    });
  }

  protected abstract render(): void;
}
