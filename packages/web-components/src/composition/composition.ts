import {
  buildConnectorSvgs,
  collectNoteLikeElements,
  pairConnectors,
} from '../utils/connectorsBuilder';
import {
  MUSIC_COMPOSITION,
  MUSIC_MEASURE,
  MUSIC_MEASURE_NODE,
  MUSIC_STAFF_BASS,
  MUSIC_STAFF_GUITAR_TAB,
  MUSIC_STAFF_TREBLE,
  MUSIC_STAFF_VOCAL,
} from '../utils/consts';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class CompositionElement extends HTMLElement {
    static get observedAttributes(): string[] {
      // All attributes need to be all lower case because jsdom lowers then
      // in it's life-cycle
      return ['keysig', 'mode', 'time'];
    }

    #observer: MutationObserver | null;
    #measureCount: number;
    #resizeObserver: ResizeObserver | null;
    #redrawScheduled: boolean;
    #boundRedraw: () => void;

    constructor() {
      super();
      this.#observer = null;
      this.#measureCount = 0;
      this.#resizeObserver = null;
      this.#redrawScheduled = false;
      this.#boundRedraw = () => this.#scheduleRedraw();
      this.attachShadow({ mode: 'open' });
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

    get time(): string {
      return this.getAttribute('time') ?? '4/4';
    }

    set time(value: string) {
      this.setAttribute('time', value);
    }

    connectedCallback(): void {
      this.render();
      this.#manageMeasureCount();
      this.#observeForRedraws();
    }

    disconnectedCallback(): void {
      this.#observer?.disconnect();
      this.#observer = null;
      this.#resizeObserver?.disconnect();
      this.#resizeObserver = null;
      this.removeEventListener('staff-notes-positioned', this.#boundRedraw);
      this.removeEventListener('connector-attribute-change', this.#boundRedraw);
    }

    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null
    ): void {
      if (oldValue === newValue) {
        return;
      }
      this.render();
      if (name === 'keysig' || name === 'mode' || name === 'time') {
        Array.from(this.querySelectorAll('*'))
          .filter((el) => el.nodeName.startsWith('MUSIC-STAFF-'))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duck-typed call to avoid cross-module import
          .forEach((staff) => (staff as any).refreshInheritedAttrs?.());
      }
    }

    private render(): void {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- contructor creates it
      this.shadowRoot!.innerHTML = `
        <style>
          .composition-wrapper {
            position: relative;
            width: 100%;
            max-width: 900px;
          }

          .composition-grid {
            position: relative;
            display: flex;
            flex-wrap: wrap;
            width: 100%;
            padding-right: 10px;
          }

          ${MUSIC_MEASURE} {
            min-width: 100px;
            box-sizing: border-box;
          }

          .connectors-overlay {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: visible;
            color: currentColor;
          }
        </style>
        <div class="composition-wrapper">
          <div class="composition-grid">
            <slot></slot>
          </div>
          <svg class="connectors-overlay"></svg>
        </div>
      `;
    }

    #observeForRedraws() {
      this.#resizeObserver = new ResizeObserver(this.#boundRedraw);
      this.#resizeObserver.observe(this);

      const slot = this.shadowRoot?.querySelector('slot');
      slot?.addEventListener('slotchange', this.#boundRedraw);

      this.addEventListener('staff-notes-positioned', this.#boundRedraw);
      this.addEventListener('connector-attribute-change', this.#boundRedraw);
    }

    #scheduleRedraw() {
      if (this.#redrawScheduled) {
        return;
      }

      this.#redrawScheduled = true;
      requestAnimationFrame(() => {
        this.#redrawScheduled = false;
        this.#redrawConnectors();
        requestAnimationFrame(() => this.#updateClefVisibility());
      });
    }

    #redrawConnectors() {
      const overlay = this.shadowRoot?.querySelector<SVGSVGElement>(
        '.connectors-overlay'
      );
      const wrapper = this.shadowRoot?.querySelector<HTMLElement>(
        '.composition-wrapper'
      );
      if (!overlay || !wrapper) {
        return;
      }

      // Remove previously drawn connector curves before redrawing;
      // replaceChildren is not used for broader browser compatibility.
      while (overlay.firstChild) {
        overlay.removeChild(overlay.firstChild);
      }

      const notes = collectNoteLikeElements(this);
      if (notes.length === 0) {
        return;
      }

      const pairs = pairConnectors(notes);
      if (pairs.length === 0) {
        return;
      }

      const rootRect = wrapper.getBoundingClientRect();
      const rowLeft = this.#computeNotesAreaLeft(rootRect);
      const svgs = buildConnectorSvgs(pairs, {
        rootRect,
        rowLeft,
        rowRight: rootRect.width,
      });
      for (const svg of svgs) overlay.appendChild(svg);
    }

    #computeNotesAreaLeft(rootRect: DOMRect): number {
      const firstStaff = this.querySelector(
        `${MUSIC_STAFF_TREBLE}, ${MUSIC_STAFF_BASS}, ${MUSIC_STAFF_VOCAL}, ${MUSIC_STAFF_GUITAR_TAB}`
      ) as HTMLElement | null;
      if (!firstStaff?.shadowRoot) {
        return 0;
      }
      const describeContainer = firstStaff.shadowRoot.querySelector(
        '.describe-container'
      );
      if (!describeContainer) {
        return 0;
      }
      return describeContainer.getBoundingClientRect().right - rootRect.left;
    }

    #updateClefVisibility() {
      const measures = Array.from(
        this.querySelectorAll('music-measure')
      ) as HTMLElement[];
      let previousTop: number | null = null;

      for (const measure of measures) {
        const top = measure.getBoundingClientRect().top;
        const isFirstInRow =
          previousTop === null || Math.abs(top - previousTop) > 5;
        previousTop = top;

        Array.from(measure.children)
          .filter((el) => el.nodeName.startsWith('MUSIC-STAFF-'))
          .forEach((staff) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duck-typed, same pattern as refreshInheritedAttrs
            (staff as any).showClef = isFirstInRow;
          });
      }
    }

    #manageMeasureCount() {
      // Existing measures
      Array.from(this.children).forEach((node) => {
        if (node.nodeName === MUSIC_MEASURE_NODE) {
          this.#setMeasure(node as HTMLElement);
        }
      });

      // Dynamically added measures
      this.#observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeName === MUSIC_MEASURE_NODE) {
              this.#setMeasure(node as HTMLElement);
            }
          }
        }
      });

      this.#observer.observe(this, {
        childList: true,
      });
    }

    #setMeasure(measure: HTMLElement) {
      if (this.#measureCount === 0) {
        measure.setAttribute('time', this.time);
      }
      measure.setAttribute('number', (++this.#measureCount).toString());
    }

    // #handleSlotChange(event: Event) {
    //   // TODO: see if I still need this
    //   // right now I'm adjusting in #manageMeasureCount
    //   // slotChange event gets fired after all children it's children are rendered first
    //   const slot = event.target as HTMLSlotElement;
    //   const assignedElements = slot
    //     .assignedElements({ flatten: true })
    //     .filter((e) => e.nodeName === 'MUSIC-MEASURE');
    // }
  }

  if (!customElements.get(MUSIC_COMPOSITION)) {
    customElements.define(MUSIC_COMPOSITION, CompositionElement);
  }
}
