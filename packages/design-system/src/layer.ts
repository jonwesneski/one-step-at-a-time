if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class LayerElement extends HTMLElement {
    static get observedAttributes(): string[] {
      return ['line-count'];
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

    get lineCount(): number {
      const count = parseInt(this.getAttribute('line-count') || '5');
      return count === 6 ? 6 : 5;
    }

    set lineCount(value: number) {
      this.setAttribute('line-count', value.toString());
    }

    private render(): void {
      // Build horizontal staff lines
      let staffLines = '';
      for (let index = 0; index < this.lineCount; index++) {
        const y = 10 + 10 * index;
        staffLines += `
          <line
            x1="0"
            y1="${y}"
            x2="200"
            y2="${y}"
            stroke="blue"
            stroke-width="2"
          />
        `;
      }

      this.shadowRoot!.innerHTML = `
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
              stroke="blue"
              stroke-width="1"
            />
            ${staffLines}
            <line
              x1="200"
              y1="0"
              x2="200"
              y2="100"
              stroke="blue"
              stroke-width="1"
            />
          </svg>
          <div id="children-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"><slot></slot></div>
        </div>
      `;
    }
  }

  if (!customElements.get('music-layer')) {
    customElements.define('music-layer', LayerElement);
  }
}
