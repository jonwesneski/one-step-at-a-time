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
      return ['x', 'duration', 'note'];
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

    get note(): string | null {
      return this.getAttribute('note');
    }

    set note(value: string | null) {
      if (value === null) this.removeAttribute('note');
      else this.setAttribute('note', value);
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

      // Build head
      const headHTML = `<ellipse
            cx="${this.x + 3}"
            cy="${stemStart}"
            rx="4"
            ry="3"
            transform="rotate(-20 ${this.x + 3} ${stemStart})"
            stroke="blue"
            fill="${headFill}"
            stroke-width="2"
          />`;

      const top = this.getYCoordinate() - stemLength; // adjust top based on stem
      const svgHeight = stemEnd + 5; // add small padding
      this.shadowRoot!.innerHTML = `
      <style>
        :host {
          position: absolute;
          top: ${top}px;
          left: 0;
        }
      </style>
      <svg xmlns="http://www.w3.org/2000/svg" width="${
        parentWidth / widthMap[this.duration]
      }px" height="${svgHeight}px">
        <g id="note">
          ${tailsHTML}
          ${stemHTML}
          ${headHTML}
        </g>
      </svg>
    `;
    }

    private getYCoordinate(): number {
      // Gets nearest music-layer and finds y offset from the note name as a key
      let finalY = NaN;
      const noteName = this.getAttribute('note');
      if (noteName) {
        const layerElement = this.closest('music-staff-treble') as any;
        if (layerElement && typeof layerElement.getYCoordinate === 'function') {
          const mapped = layerElement.getYCoordinate(noteName);
          if (typeof mapped === 'number' && !Number.isNaN(mapped)) {
            finalY = mapped;
          }
        } else {
          throw new Error(
            `music-note: Unable to find closest music-staff-treble for note: ${noteName}`
          );
        }
      }
      if (Number.isNaN(finalY)) {
        throw new Error(`Unable to find Y coordinate for note: ${noteName}`);
      }
      return finalY;
    }
  }

  if (!customElements.get('music-note')) {
    customElements.define('music-note', NoteElement);
  }
}
