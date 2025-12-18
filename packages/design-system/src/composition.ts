if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class CompositionElement extends HTMLElement {
    static get observedAttributes(): string[] {
      return ['keySig', 'mode', 'time'];
    }
    #observer: MutationObserver | null;
    #measureCount: number;

    constructor() {
      super();
      this.#observer = null;
      this.#measureCount = 0;
      this.attachShadow({ mode: 'open' });
    }

    get keySig(): string {
      return this.getAttribute('keySig') || 'C';
    }

    set keySig(value: string) {
      this.setAttribute('keySig', value);
    }

    get mode(): string {
      return this.getAttribute('mode') || 'major';
    }

    set mode(value: string) {
      this.setAttribute('mode', value);
    }

    get time(): string {
      return this.getAttribute('time') || '4/4';
    }

    set time(value: string) {
      this.setAttribute('time', value);
    }

    connectedCallback(): void {
      this.render();
      this.#manageMeasureCount();

      // const slot = this.shadowRoot?.querySelector('slot');
      // if (slot) {
      //   slot.addEventListener('slotchange', this.#handleSlotChange.bind(this));
      // }
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
        <div style="display: flex; flex-wrap: wrap; min-height: 100vh; width: 100%; max-width: 900px; padding-top: 8rem; padding-bottom: 8rem;">
          <slot></slot>
        </div>
      `;
    }

    #manageMeasureCount() {
      // Existing measures
      Array.from(this.children).forEach((node) => {
        if (node.nodeName === 'MUSIC-MEASURE') {
          this.#setMeasure(node as HTMLElement);
        }
      });

      // Dynamically added measures
      this.#observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeName === 'MUSIC-MEASURE') {
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

  if (!customElements.get('music-composition')) {
    customElements.define('music-composition', CompositionElement);
  }
}
