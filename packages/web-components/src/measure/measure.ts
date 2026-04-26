import { scoreToFlexBasis, scoreToFlexGrow } from '../utils/busynessScore';
import { EMPTY_MEASURE_FLEX_BASIS_PX } from '../utils/notationDimensions';
import { MUSIC_COMPOSITION, STAFF_EVENTS } from '../utils';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class MeasureElement extends HTMLElement {
    static get observedAttributes(): string[] {
      return ['number', 'keysig', 'mode', 'time'];
    }

    #staffConnectorObserver: ResizeObserver;
    #staffScores = new Map<EventTarget, number>();
    #onStaffBusynessScore = (event: Event): void => {
      const customEvent = event as CustomEvent<{ score: number }>;
      if (customEvent.target) {
        this.#staffScores.set(customEvent.target, customEvent.detail.score);
      }
      const maxScore = Math.max(...this.#staffScores.values());
      const flexGrow = scoreToFlexGrow(maxScore);
      const flexBasis = scoreToFlexBasis(maxScore);
      this.style.flex = `${flexGrow} 1 ${flexBasis}px`;
    };

    constructor() {
      super();

      this.attachShadow({ mode: 'open' });
      const composition = this.closest(MUSIC_COMPOSITION);
      if (composition) {
        this.time = composition.getAttribute('time') ?? '4/4';
        this.mode = composition.getAttribute('mode') ?? 'major';
        this.keySig = composition.getAttribute('keysig') ?? 'C';
      }

      this.#staffConnectorObserver = new ResizeObserver(
        this.#updateConnectorVisibility.bind(this)
      );
    }

    get number(): number | null {
      const value = this.getAttribute('number');
      if (value === null) return null;
      return parseInt(value);
    }

    set number(value: number | null) {
      if (value === null) this.removeAttribute('number');
      else this.setAttribute('number', value.toString());
    }

    get keySig(): string {
      return this.getAttribute('keysig') ?? 'C';
    }

    set keySig(value: string) {
      this.setAttribute('keysig', value);
    }

    get mode(): string {
      return this.getAttribute('mode') ?? 'major';
    }

    set mode(value: string) {
      this.setAttribute('mode', value);
    }

    get time(): string | null {
      return this.getAttribute('time');
    }

    set time(value: string) {
      this.setAttribute('time', value);
    }

    connectedCallback(): void {
      this.render();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- won't be null
      this.#staffConnectorObserver.observe(this.parentElement!);
      this.addEventListener(
        STAFF_EVENTS.BUSYNESS_SCORE,
        this.#onStaffBusynessScore
      );
    }

    disconnectedCallback(): void {
      this.#staffConnectorObserver.disconnect();
      this.removeEventListener(
        STAFF_EVENTS.BUSYNESS_SCORE,
        this.#onStaffBusynessScore
      );
      this.#staffScores.clear();
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

    private render(): void {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- contructor creates it
      this.shadowRoot!.innerHTML = `
        <style>
          :host {
            display: block;
            flex: 1 1 ${EMPTY_MEASURE_FLEX_BASIS_PX}px;
            min-width: 100px;
            box-sizing: border-box;
            position: relative;
          }

          .staff-connector {
            position: absolute;
            left: 0;
            top: 51px;
            width: 1px;
            background-color: currentColor;
            z-index: 5;
            opacity: 1;
            transition: opacity 0.3s;
          }

          .staff-connector.hidden {
            opacity: 0;
          }
        </style>
        <div>
          <div class="staff-connector"></div>
          <span>${this.number}</span>
          <slot></slot>
        </div>
      `;
    }

    // #handleSlotChange(event: Event) {
    //   const slot = event.target as HTMLSlotElement;
    //   const staffMap = {
    //     'MUSIC-STAFF-TREBLE': true,
    //     'MUSIC-STAFF-BASS': true,
    //     'MUSIC-STAFF-GUITAR-TAB': true,
    //   };
    //   const assignedNodes = slot
    //     .assignedNodes({ flatten: true })
    //     .filter((n) => staffMap[n.nodeName as keyof typeof staffMap]);
    //   const assignedElements = slot
    //     .assignedElements({ flatten: true })
    //     .filter((e) => staffMap[e.nodeName as keyof typeof staffMap]);

    //   for (let i = 0; i < assignedElements.length; i++) {}
    // }

    #updateConnectorVisibility() {
      const staffConnector =
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- it does exist
        this.shadowRoot!.querySelector<HTMLElement>('.staff-connector')!;
      const allMeasures = Array.from(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- it does exist
        this.parentNode!.querySelectorAll('music-measure')
      );

      const currentIndex = allMeasures.indexOf(this);
      const total = Array.from(allMeasures[currentIndex].children).filter((n) =>
        n.nodeName.startsWith('MUSIC-STAFF-')
      ).length;
      const staffHeight = 44;
      const paddingAndMargin = 54;
      const connectorHeight =
        staffHeight * total + paddingAndMargin * (total - 1);
      staffConnector.style.height = `${connectorHeight}px`;

      if (currentIndex === 0) {
        // First measure always shows connector
        staffConnector.classList.remove('hidden');
        return;
      }

      const prevMeasure = allMeasures[currentIndex - 1];
      if (!prevMeasure) {
        staffConnector.classList.add('hidden');
        return;
      }

      const prevRect = prevMeasure.getBoundingClientRect();
      const currentRect = this.getBoundingClientRect();

      // Check if this measure is on a new row (wrapped)
      // Tolerance of 5px for rounding errors
      const isNewRow = Math.abs(currentRect.top - prevRect.top) > 5;
      if (isNewRow) {
        staffConnector.classList.remove('hidden');
      } else {
        staffConnector.classList.add('hidden');
      }
    }
  }

  if (!customElements.get('music-measure')) {
    customElements.define('music-measure', MeasureElement);
  }
}
