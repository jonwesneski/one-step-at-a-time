import { DurationType } from './types';
import { createNoteSvgDom } from './utils';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class NoteElement extends HTMLElement {
    static get observedAttributes(): string[] {
      return ['duration', 'value'];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    get duration(): DurationType {
      const duration = this.getAttribute('duration');
      return (duration as DurationType) || 'quarter';
    }

    set duration(value: DurationType) {
      this.setAttribute('duration', value);
    }

    get value(): string | null {
      return this.getAttribute('value');
    }

    set value(val: string | null) {
      if (val === null) this.removeAttribute('value');
      else this.setAttribute('value', val);
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
