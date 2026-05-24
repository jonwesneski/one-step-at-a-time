import { IRestElement } from '../types/elements';
import { DurationType } from '../types/theory';
import { NOTE_EVENTS } from '../utils/consts';
import { MUSIC_REST } from '../utils/consts';
import { createRestSvg } from '../utils/svgCreator/rest';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class RestElement extends HTMLElement implements IRestElement {
    static get observedAttributes(): string[] {
      return ['duration'];
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

    connectedCallback(): void {
      this.render();
    }

    attributeChangedCallback(
      _name: string,
      oldValue: string | null,
      newValue: string | null
    ): void {
      if (oldValue === newValue || !this.isConnected) {
        return;
      }
      this.render();
      this.dispatchEvent(
        new CustomEvent(NOTE_EVENTS.NOTE_Y_CHANGE, {
          bubbles: true,
          composed: true,
        })
      );
    }

    private render(): void {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constructor creates it
      this.shadowRoot!.innerHTML = `
        <style>
          :host { display: inline-block; width: 32px; height: 60px; overflow: visible; }
        </style>
      `;

      const [restSvg] = createRestSvg({ duration: this.duration });

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constructor creates it
      this.shadowRoot!.appendChild(restSvg);

      restSvg.addEventListener('click', (e) => {
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.CLICK, {
            bubbles: true,
            composed: true,
            detail: {
              duration: this.duration,
              originalEvent: e,
            },
          })
        );
      });
      restSvg.addEventListener('pointerdown', (e) => {
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.POINTERDOWN, {
            bubbles: true,
            composed: true,
            detail: {
              duration: this.duration,
              originalEvent: e,
            },
          })
        );
      });
      restSvg.addEventListener('pointerup', (e) => {
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.POINTERUP, {
            bubbles: true,
            composed: true,
            detail: {
              duration: this.duration,
              originalEvent: e,
            },
          })
        );
      });
    }
  }

  if (!customElements.get(MUSIC_REST)) {
    customElements.define(MUSIC_REST, RestElement);
  }
}
