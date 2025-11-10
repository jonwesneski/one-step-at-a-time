if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class ChordElement extends HTMLElement {
    static get observedAttributes(): string[] {
      return ['currentCount'];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

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

    private render(): void {
      this.shadowRoot!.innerHTML = `
       <style>
          :host {
            display: inline-block;
          }
        </style>
        <div style="position: relative; display: flex; flex-direction: column;">
          <slot></slot>
        </div>
      `;
    }
  }

  if (!customElements.get('music-chord')) {
    customElements.define('music-chord', ChordElement);
  }
}
