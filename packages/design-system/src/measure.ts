if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class MeasureElement extends HTMLElement {
    static get observedAttributes(): string[] {
      return ['number', 'key', 'mode', 'time'];
    }

    constructor() {
      super();

      this.attachShadow({ mode: 'open' });
      const composition = this.closest('music-composition');
      if (composition) {
        //this.time = composition.getAttribute('time') ?? '4/4';
        this.mode = composition.getAttribute('mode') ?? 'major';
        this.keySig = composition.getAttribute('keySig') ?? 'C';
      }
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
      return this.getAttribute('keySig') ?? 'C';
    }

    set keySig(value: string) {
      this.setAttribute('keySig', value);
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
      this.shadowRoot!.innerHTML = `
        <div>
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
  }

  if (!customElements.get('music-measure')) {
    customElements.define('music-measure', MeasureElement);
  }
}
