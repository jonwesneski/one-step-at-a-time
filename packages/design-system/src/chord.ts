if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class ChordElement extends HTMLElement {
    static totalCount: number = 0;
    private _currentCount: number;
    private _shadow: ShadowRoot;
    static get observedAttributes(): string[] {
      return ['currentCount'];
    }

    constructor() {
      super();
      this._currentCount = ++ChordElement.totalCount;
      this._shadow = this.attachShadow({ mode: 'open' });
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

    get currentCount(): number {
      const count = parseInt(
        this.getAttribute('currentCount') || this._currentCount.toString()
      );
      return count;
    }

    set currentCount(value: number) {
      this.setAttribute('currentCount', value.toString());
    }

    private render(): void {
      this._shadow.innerHTML = `
       <style>
          :host {
            position: absolute;
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
