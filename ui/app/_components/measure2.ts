if (typeof window !== "undefined" && typeof customElements !== "undefined") {
  class MeasureElement extends HTMLElement {
    static totalCount: number = 0;
    private _currentCount: number;
    static get observedAttributes(): string[] {
      return ["currentCount"];
    }

    constructor() {
      super();
      this._currentCount = ++MeasureElement.totalCount;
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
        this.getAttribute("currentCount") || this._currentCount.toString()
      );
      return count;
    }

    set currentCount(value: number) {
      this.setAttribute("currentCount", value.toString());
    }

    private render(): void {
      // Save existing children
      const children = Array.from(this.childNodes);

      this.innerHTML = `
        <div class="">
          <span>${this.currentCount}</span>
        </div>
      `;

      const container = this.querySelector("div");
      if (container) {
        children.forEach((child) => container.appendChild(child));
      }
    }
  }

  customElements.define("music-measure", MeasureElement);
}
