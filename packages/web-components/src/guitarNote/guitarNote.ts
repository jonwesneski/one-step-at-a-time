import {
  ConnectorRole,
  GuitarFret,
  IGuitarNoteElement,
} from '../types/elements';
import { DurationType } from '../types/theory';
import { parseConnectorRole } from '../utils';
import { MUSIC_GUITAR_NOTE, NOTE_EVENTS, SVG_NS } from '../utils/consts';

const CONNECTOR_ATTRS = [
  'tie',
  'slur',
  'hammer-on',
  'pull-off',
  'slide',
] as const;

const parseFret = (value: string | null): GuitarFret => {
  if (value === null) {
    return 0;
  }
  if (value === 'x' || value === 'X') {
    return 'x';
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  /**
   * A single tablature note — a fret number on a string — with optional
   * left-hand technique connectors to the next note. Used inside a
   * `<music-staff-guitar-tab>`.
   *
   * @customElement music-guitar-note
   * @attr {number | 'x'} fret - Fret number, or `x` for a muted/dead note.
   * @attr {number} string - String number, 1 = highest. Defaults to `1`.
   * @attr {DurationType} duration - Note value, optionally dotted (`dotted-quarter`); sets timing only, since the tab draws no rhythm. Defaults to `quarter`.
   * @attr {'start' | 'end'} tie - Start or end of a tie to the same fret/string.
   * @attr {'start' | 'end'} slur - Start or end of a slur.
   * @attr {'start' | 'end'} hammer-on - Start or end of a hammer-on to the next note.
   * @attr {'start' | 'end'} pull-off - Start or end of a pull-off to the next note.
   * @attr {'start' | 'end'} slide - Start or end of a slide to the next note.
   *
   * @example
   * <music-staff-guitar-tab time="4/4">
   *   <music-guitar-note string="3" fret="0" duration="quarter" hammer-on="start"></music-guitar-note>
   *   <music-guitar-note string="3" fret="2" duration="quarter" hammer-on="end"></music-guitar-note>
   * </music-staff-guitar-tab>
   */
  class GuitarNoteElement extends HTMLElement implements IGuitarNoteElement {
    static get observedAttributes(): string[] {
      return [
        'fret',
        'string',
        'duration',
        'tie',
        'slur',
        'hammer-on',
        'pull-off',
        'slide',
      ];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    get fret(): GuitarFret {
      return parseFret(this.getAttribute('fret'));
    }
    set fret(value: GuitarFret) {
      this.setAttribute('fret', value.toString());
    }

    get string(): number {
      const raw = this.getAttribute('string');
      const parsed = raw === null ? 1 : parseInt(raw, 10);
      return Number.isNaN(parsed) ? 1 : parsed;
    }
    set string(value: number) {
      this.setAttribute('string', value.toString());
    }

    get duration(): DurationType {
      return (this.getAttribute('duration') as DurationType) ?? 'quarter';
    }
    set duration(value: DurationType) {
      this.setAttribute('duration', value);
    }

    get tie(): ConnectorRole | null {
      return parseConnectorRole(this.getAttribute('tie'));
    }
    set tie(value: ConnectorRole | null) {
      if (value === null) {
        this.removeAttribute('tie');
      } else {
        this.setAttribute('tie', value);
      }
    }

    get slur(): ConnectorRole | null {
      return parseConnectorRole(this.getAttribute('slur'));
    }
    set slur(value: ConnectorRole | null) {
      if (value === null) {
        this.removeAttribute('slur');
      } else {
        this.setAttribute('slur', value);
      }
    }

    get hammerOn(): ConnectorRole | null {
      return parseConnectorRole(this.getAttribute('hammer-on'));
    }
    set hammerOn(value: ConnectorRole | null) {
      if (value === null) {
        this.removeAttribute('hammer-on');
      } else {
        this.setAttribute('hammer-on', value);
      }
    }

    get pullOff(): ConnectorRole | null {
      return parseConnectorRole(this.getAttribute('pull-off'));
    }
    set pullOff(value: ConnectorRole | null) {
      if (value === null) {
        this.removeAttribute('pull-off');
      } else {
        this.setAttribute('pull-off', value);
      }
    }

    get slide(): ConnectorRole | null {
      return parseConnectorRole(this.getAttribute('slide'));
    }
    set slide(value: ConnectorRole | null) {
      if (value === null) {
        this.removeAttribute('slide');
      } else {
        this.setAttribute('slide', value);
      }
    }

    // get bend(): string | null {
    //   return this.getAttribute('bend');
    // }
    // set bend(value: string | null) {
    //   if (value === null) {
    //     this.removeAttribute('bend');
    //   } else {
    //     this.setAttribute('bend', value);
    //   }
    // }

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

      if (CONNECTOR_ATTRS.includes(name as (typeof CONNECTOR_ATTRS)[number])) {
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.CONNECTOR_ATTRIBUTE_CHANGE, {
            bubbles: true,
            composed: true,
          })
        );
        return;
      }

      this.render();
    }

    private render(): void {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constructor creates it
      this.shadowRoot!.innerHTML = `
        <style>
          :host { display: inline-block; width: 24px; height: 60px; overflow: visible; }
          svg { overflow: visible; }
          text {
            font-family: serif;
            font-size: 14px;
            fill: currentColor;
          }
        </style>
      `;

      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('width', '24');
      svg.setAttribute('height', '60');
      svg.setAttribute('overflow', 'visible');

      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', '12');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.textContent = this.fret.toString();
      svg.appendChild(text);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constructor creates it
      this.shadowRoot!.appendChild(svg);
    }
  }

  if (!customElements.get(MUSIC_GUITAR_NOTE)) {
    customElements.define(MUSIC_GUITAR_NOTE, GuitarNoteElement);
  }
}
