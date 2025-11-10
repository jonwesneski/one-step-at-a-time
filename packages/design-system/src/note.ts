type DurationType = 'sixteenth' | 'eighth' | 'quarter' | 'half' | 'whole';
const widthMap: Record<DurationType, number> = {
  eighth: 8,
  half: 2,
  quarter: 4,
  whole: 1,
  sixteenth: 16,
};

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class NoteElement extends HTMLElement {
    private durationToTailCountMap: Map<DurationType, number>;

    static get observedAttributes(): string[] {
      return ['x', 'duration'];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });

      this.durationToTailCountMap = new Map<DurationType, number>([
        ['sixteenth', 2],
        ['eighth', 1],
      ]);
    }

    connectedCallback(): void {
      const measureElement = this.closest('music-measure');
      const width = measureElement?.getAttribute('width') || '100';
      this.render(parseFloat(width));
    }

    // attributeChangedCallback(
    //   name: string,
    //   oldValue: string | null,
    //   newValue: string | null
    // ): void {
    //   if (oldValue !== newValue) {
    //     const measureElement = this.closest("music-measure");
    //     const width = measureElement?.getAttribute("width") || "100";
    //     this.render(parseFloat(width));
    //     //todo maybe i want to just call this.connectedCallback() instead
    //   }
    // }

    get x(): number {
      return parseFloat(this.getAttribute('x') || '0');
    }

    set x(value: number | string) {
      this.setAttribute('x', value.toString());
    }

    get duration(): DurationType {
      const duration = this.getAttribute('duration');
      return (duration as DurationType) || 'quarter';
    }

    set duration(value: DurationType) {
      this.setAttribute('duration', value);
    }

    private render(parentWidth: number): void {
      const stemStart = 10;
      const stemLength = 25;
      const stemEnd = stemStart + stemLength;
      const headFill =
        this.duration === 'half' || this.duration === 'whole' ? 'none' : 'blue';
      const tailCount = this.durationToTailCountMap.get(this.duration) || 0;

      // Build tails
      let tailsHTML = '';
      for (let index = 0; index < tailCount; index++) {
        const y = stemEnd - 5 * index;
        tailsHTML += `
        <path
          d="M ${this.x} ${y} Q ${this.x + 8} ${y - 2} ${this.x + 6} ${y + 5}"
          fill="blue"
          stroke="none"
        />
      `;
      }

      // Build stem
      const stemHTML =
        this.duration !== 'whole'
          ? `
      <line
        x1="${this.x}"
        y1="${stemStart}"
        x2="${this.x}"
        y2="${stemEnd}"
        stroke="blue"
        stroke-width="1"
      />
    `
          : '';

      const y = this.getAttribute('y') || '50';
      this.shadowRoot!.innerHTML = `
      <style>
        :host {
          position: absolute;
          top: ${y}%;
          width: 100px;
          transform: translateY(-50%);
        }
      </style>
      <svg xmlns="http://www.w3.org/2000/svg" width="${
        parentWidth / widthMap[this.duration]
      }px" height="100%">
        <g id="note">
          ${tailsHTML}
          ${stemHTML}
          <ellipse
            cx="${this.x + 3}"
            cy="${stemStart}"
            rx="4"
            ry="3"
            transform="rotate(-20 ${this.x + 3} ${stemStart})"
            stroke="blue"
            fill="${headFill}"
            stroke-width="2"
          />
        </g>
      </svg>
    `;
    }
  }

  if (!customElements.get('music-note')) {
    customElements.define('music-note', NoteElement);
  }
}
