if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class CompositionElement extends HTMLElement {
    static get observedAttributes(): string[] {
      return ['keySig', 'mode', 'time'];
    }

    constructor() {
      super();
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
      const slot = this.shadowRoot?.querySelector('slot');
      if (slot) {
        slot.addEventListener('slotchange', this.#handleSlotChange.bind(this));
      }
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
        <div style="display: flex; flex-wrap: wrap; min-height: 100vh; width: 100%; max-width: 900px; padding-top: 8rem; padding-bottom: 8rem;">
          <slot></slot>
        </div>
      `;
    }

    #handleSlotChange(event: Event) {
      const slot = event.target as HTMLSlotElement;
      const assignedElements = slot
        .assignedElements({ flatten: true })
        .filter((e) => e.nodeName === 'MUSIC-MEASURE');

      assignedElements[0].setAttribute('time', this.time);
      for (let i = 0; i < assignedElements.length; i++) {
        assignedElements[i].setAttribute('number', (i + 1).toString());
      }
    }
  }

  if (!customElements.get('music-composition')) {
    customElements.define('music-composition', CompositionElement);
  }
}
