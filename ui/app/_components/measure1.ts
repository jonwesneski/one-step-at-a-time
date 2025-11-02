if (typeof window !== "undefined" && typeof customElements !== "undefined") {
  class MeasureElement extends HTMLElement {
    static get observedAttributes(): string[] {
      return ["line-count"];
    }

    constructor() {
      super();
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
      const count = parseInt(this.getAttribute("line-count") || "5");
      return count === 6 ? 6 : 5;
    }

    set lineCount(value: number) {
      this.setAttribute("line-count", value.toString());
    }

    private render(): void {
      // Save existing children
      const children = Array.from(this.childNodes);

      // Build horizontal staff lines
      let staffLines = "";
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

      this.innerHTML = `
        <div class="relative w-1/3 min-w-[300px] h-[100px]">
          <svg
            class="absolute top-0 left-0 w-full h-full"
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
          <div class="absolute top-0 left-0 w-full h-full pointer-events-none"></div>
        </div>
      `;

      const container = this.querySelector("div > div");
      if (container) {
        children.forEach((child) => container.appendChild(child));
      }
    }
  }

  customElements.define("music-measure", MeasureElement);
}
