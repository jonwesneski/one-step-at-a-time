// Use a runtime-safe fallback for environments without `HTMLElement` (SSR/Node).
const _MaybeHTMLElement: any =
  typeof globalThis !== 'undefined' && (globalThis as any).HTMLElement
    ? (globalThis as any).HTMLElement
    : class {};

export abstract class StaffElementBase extends _MaybeHTMLElement {
  protected linesY: number[] = [10, 20, 30, 40, 50];
  static get observedAttributes(): string[] {
    return [];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  // Return the y-coordinate for a given note name (e.g., 'A', 'E', 'C2')
  public abstract getYCoordinate(note: string): number;

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ): void {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  protected abstract render(): void;

  protected build(innerSvg: string = ''): string {
    // Build horizontal staff lines
    // from top to bottom
    const staffLines = ['<g>'];
    for (const y of this.linesY) {
      staffLines.push(`
          <line
            x1="0"
            y1="${y}"
            x2="200"
            y2="${y}"
            stroke="currentColor"
            stroke-width="2"
          />
        `);
    }
    staffLines.push('</g>');

    return `
        <div style="position: relative; width: 33.333333%; min-width: 300px; height: 100px;">
          <svg
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
            height="100"
            viewBox="0 0 200 100"
            preserveAspectRatio="none"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="100"
              stroke="currentColor"
              stroke-width="1"
            />
            ${innerSvg}
            ${staffLines.join('')}
            <line
              x1="200"
              y1="0"
              x2="200"
              y2="100"
              stroke="currentColor"
              stroke-width="1"
            />
          </svg>
          <div id="children-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"><slot></slot></div>
        </div>
      `;
  }
}
