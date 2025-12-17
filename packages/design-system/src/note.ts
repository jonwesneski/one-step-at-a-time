import { INoteElement } from './types/elements';
import { DurationType, Note } from './types/theory';
import { createNoteSvg } from './utils';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class NoteElement extends HTMLElement implements INoteElement {
    static get observedAttributes(): string[] {
      return ['duration', 'value'];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    get duration(): DurationType {
      return (this.getAttribute('duration') as DurationType) ?? 'quarter';
    }

    set duration(value: DurationType) {
      this.setAttribute('duration', value);
    }

    get value(): Note {
      return (this.getAttribute('value') as Note) ?? 'C';
    }

    set value(val: Note | null) {
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
    //   // if (oldValue !== newValue) {
    //   //   const measureElement = this.closest("music-measure");
    //   //   const width = measureElement?.getAttribute("width") || "100";
    //   //   this.render(parseFloat(width));
    //   //   //todo maybe i want to just call this.connectedCallback() instead
    //   // }
    // }

    private render(): void {
      const [noteSvg] = createNoteSvg({
        duration: this.duration,
      });
      this.shadowRoot!.innerHTML = noteSvg.outerHTML;
    }
  }

  if (!customElements.get('music-note')) {
    customElements.define('music-note', NoteElement);
  }
}
