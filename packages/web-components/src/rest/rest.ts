import { IRestElement } from '../types/elements';
import { DurationType, RestStaffSide } from '../types/theory';
import { NOTE_EVENTS } from '../utils/consts';
import { MUSIC_REST } from '../utils/consts';
import { parseRestStaffSide } from '../utils/parsers';
import { createRestSvg } from '../utils/svgCreator/rest';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  /**
   * A rest of a given duration. Renders its glyph standalone or spaced inside a
   * `<music-staff>`.
   *
   * @customElement music-rest
   * @attr {DurationType} duration - Rest length: `whole`, `half`, `quarter`, `eighth`, `sixteenth`, … Defaults to `quarter`.
   * @attr {string} beam-group - `id` shared by every note/chord/rest across a measure's two adjacent grand-staff staves that joins one cross-staff double-stemmed beam group. A rest carries this purely as a correlation key — it never contributes to the beam polygon itself.
   * @attr {RestStaffSide} rest-staff-side - Placement relative to a double-stemmed beam this rest is a member of (`above`/`below` the beam itself, or `centered` in the real gap between staves) — meaningless outside an active `beam-group`. Unset = auto-classified by the ancestor `<music-measure>`.
   *
   * @example
   * <music-staff clef="treble" time="4/4">
   *   <music-note note="C" octave="4" duration="quarter"></music-note>
   *   <music-rest duration="quarter"></music-rest>
   * </music-staff>
   */
  class RestElement extends HTMLElement implements IRestElement {
    static get observedAttributes(): string[] {
      return ['duration', 'beam-group', 'rest-staff-side'];
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

    // `id` shared by every element across a measure's two adjacent grand-staff
    // staves that joins one cross-staff double-stemmed beam group. Resolved
    // by the ancestor <music-measure>.
    get beamGroup(): string | null {
      return this.getAttribute('beam-group');
    }
    set beamGroup(value: string | null) {
      if (value === null) {
        this.removeAttribute('beam-group');
      } else {
        this.setAttribute('beam-group', value);
      }
    }

    // Placement relative to a double-stemmed beam this rest is a member
    // of — meaningless (inert) outside an active beam-group. Resolved by
    // the ancestor <music-measure>.
    get restStaffSide(): RestStaffSide | null {
      return parseRestStaffSide(this.getAttribute('rest-staff-side'));
    }
    set restStaffSide(value: RestStaffSide | null) {
      if (value === null) {
        this.removeAttribute('rest-staff-side');
      } else {
        this.setAttribute('rest-staff-side', value);
      }
    }

    connectedCallback(): void {
      this.render();
    }

    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null
    ): void {
      if (oldValue === newValue || !this.isConnected) {
        return;
      }
      if (name === 'beam-group') {
        // The ancestor measure resolves cross-staff double-stemmed beam
        // groups over both staves' element streams; nothing renders locally
        // in this rest's own shadow DOM.
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.BEAM_GROUP_ATTRIBUTE_CHANGE, {
            bubbles: true,
            composed: true,
          })
        );
        return;
      }
      if (name === 'rest-staff-side') {
        // Same shape as beam-group — the ancestor measure resolves and
        // writes this rest's real position; nothing renders locally here.
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.REST_STAFF_SIDE_ATTRIBUTE_CHANGE, {
            bubbles: true,
            composed: true,
          })
        );
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
