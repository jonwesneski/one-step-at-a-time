import { DurationType } from './types';
import { createNoteSvgDom } from './utils';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class NoteElement extends HTMLElement {
    static get observedAttributes(): string[] {
      return ['x', 'duration', 'note'];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    connectedCallback(): void {
      const staffElement =
        this.closest('music-staff-treble') || this.closest('music-staff-bass');
      if (!staffElement) {
        this.render();
      }
      // else let the staffElement build the note
    }

    // attributeChangedCallback(
    //   name: string,
    //   oldValue: string | null,
    //   newValue: string | null
    // ): void {
    //   if (oldValue !== newValue) {
    //     const measureElement = this.closest("music-measure");
    //     const width = measureElement?.getAttribute("width") || "100";
    //     this.render(parseFloat(width));
    //     //todo maybe i want to just call this.connectedCallback() instead
    //   }
    // }

    get x(): number {
      return parseFloat(this.getAttribute('x') || '0');
    }

    set x(value: number | string) {
      this.setAttribute('x', value.toString());
    }

    get duration(): DurationType {
      const duration = this.getAttribute('duration');
      return (duration as DurationType) || 'quarter';
    }

    set duration(value: DurationType) {
      this.setAttribute('duration', value);
    }

    get note(): string | null {
      return this.getAttribute('note');
    }

    set note(value: string | null) {
      if (value === null) this.removeAttribute('note');
      else this.setAttribute('note', value);
    }

    private render(): void {
      this.shadowRoot!.innerHTML = createNoteSvgDom({
        duration: this.duration,
      }).outerHTML;
    }
  }

  if (!customElements.get('music-note')) {
    customElements.define('music-note', NoteElement);
  }
}
