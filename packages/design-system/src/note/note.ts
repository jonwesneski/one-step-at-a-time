import { INoteElement } from '../types/elements';
import { DurationType, Note } from '../types/theory';
import { createNoteSvg } from '../utils';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class NoteElement extends HTMLElement implements INoteElement {
    static get observedAttributes(): string[] {
      return ['duration', 'value'];
    }

    #stemUp = true;
    #stemExtension = 0;
    #noFlags = false;
    #noStem = false;
    #batchDepth = 0;
    #renderPending = false;

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

    get stemUp(): boolean {
      return this.#stemUp;
    }
    set stemUp(v: boolean) {
      this.#stemUp = v;
      this.#scheduleRender();
    }

    get stemExtension(): number {
      return this.#stemExtension;
    }
    set stemExtension(v: number) {
      this.#stemExtension = v;
      this.#scheduleRender();
    }

    get noFlags(): boolean {
      return this.#noFlags;
    }
    set noFlags(v: boolean) {
      this.#noFlags = v;
      this.#scheduleRender();
    }

    get noStem(): boolean {
      return this.#noStem;
    }
    set noStem(v: boolean) {
      this.#noStem = v;
      this.#scheduleRender();
    }

    batchUpdate(fn: () => void): void {
      this.#batchDepth++;
      try {
        fn();
      } finally {
        this.#batchDepth--;
        if (this.#batchDepth === 0 && this.#renderPending) {
          this.#renderPending = false;
          this.render();
        }
      }
    }

    #scheduleRender(): void {
      if (this.#batchDepth > 0) {
        this.#renderPending = true;
      } else if (this.shadowRoot) {
        this.render();
      }
    }

    connectedCallback(): void {
      this.render();
    }

    attributeChangedCallback(
      _name: string,
      oldValue: string | null,
      newValue: string | null
    ): void {
      if (oldValue !== newValue && this.isConnected) {
        this.render();
      }
    }

    private render(): void {
      const [noteSvg] = createNoteSvg({
        duration: this.duration,
        stemUp: this.#stemUp,
        stemExtension: this.#stemExtension,
        noFlags: this.#noFlags,
        noStem: this.#noStem,
      });
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- contructor creates it
      this.shadowRoot!.innerHTML = `
        <style>
          :host { display: inline-block; width: 32px; height: 60px; overflow: visible; }
        </style>
      `;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- contructor creates it
      this.shadowRoot!.appendChild(noteSvg);

      noteSvg.addEventListener('click', (e) => {
        this.dispatchEvent(
          new CustomEvent('note-click', {
            bubbles: true,
            composed: true,
            detail: {
              value: this.value,
              duration: this.duration,
              originalEvent: e,
            },
          })
        );
      });
      noteSvg.addEventListener('pointerdown', (e) => {
        this.dispatchEvent(
          new CustomEvent('note-pointerdown', {
            bubbles: true,
            composed: true,
            detail: {
              value: this.value,
              duration: this.duration,
              originalEvent: e,
            },
          })
        );
      });
      noteSvg.addEventListener('pointerup', (e) => {
        this.dispatchEvent(
          new CustomEvent('note-pointerup', {
            bubbles: true,
            composed: true,
            detail: {
              value: this.value,
              duration: this.duration,
              originalEvent: e,
            },
          })
        );
      });
    }
  }

  if (!customElements.get('music-note')) {
    customElements.define('music-note', NoteElement);
  }
}
