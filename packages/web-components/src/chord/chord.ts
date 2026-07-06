import { generateYCoordinates, getChordNotes } from '../rules/theoryHelpers';
import {
  ChordNote,
  ConnectorRole,
  IChordElement,
  NoteElementType,
  NoteLetterOctave,
} from '../types/elements';
import {
  AccidentalType,
  Chord,
  DurationType,
  DynamicMarking,
  HairpinRole,
  Octave,
} from '../types/theory';
import {
  addLedgerLines,
  createChordSvg,
  NOTE_HEAD_Y_OFFSET_CORRECTION,
  parseConnectorRole,
  parseDynamicMarking,
} from '../utils';
import {
  CHORD_EVENTS,
  MUSIC_CHORD,
  MUSIC_NOTE,
  NOTE_EVENTS,
  SVG_NS,
} from '../utils/consts';
import {
  MIDDLE_STAFF_Y,
  STAFF_TRANSCRIPTION_HEIGHT,
  STAFF_Y_PADDING,
} from '../utils/notationDimensions';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class ChordElement extends HTMLElement implements IChordElement {
    static get observedAttributes(): string[] {
      return [
        'duration',
        'tie',
        'slur',
        'dynamic',
        'crescendo',
        'decrescendo',
        'diminuendo',
      ];
    }

    static readonly #standaloneYCoordinates = generateYCoordinates('C6', 'C4');
    static readonly #standaloneOctaves: Octave[] = [4, 5, 6];

    #stemUp = true;
    #stemExtension = 0;
    #noFlags = false;
    #staffYCoordinates: number[] | null = null;
    #noteAccidentals: (AccidentalType | null | undefined)[] = [];
    #batchDepth = 0;
    #renderPending = false;
    #childObserver: MutationObserver | null = null;

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

    get chord(): Chord | null {
      return this.getAttribute('chord') as Chord | null;
    }

    set chord(value: Chord | null) {
      if (value === null) {
        this.removeAttribute('chord');
      } else {
        this.setAttribute('chord', value);
      }
    }

    get notes(): ChordNote[] {
      const noteElements: NodeListOf<NoteElementType> =
        this.querySelectorAll(MUSIC_NOTE);
      const notes: ChordNote[] = [];
      if (noteElements.length) {
        noteElements.forEach((node) => {
          notes.push({
            value: node.note,
            octave: node.octave,
            duration: node.duration,
          });
        });
      } else if (this.chord) {
        const chordNotes = getChordNotes(this.chord);
        chordNotes.forEach((value) => {
          notes.push({ value, octave: null, duration: this.duration });
        });
      }
      return notes;
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

    get staffYCoordinates(): number[] | null {
      return this.#staffYCoordinates;
    }
    set staffYCoordinates(v: number[] | null) {
      this.#staffYCoordinates = v;
      this.#scheduleRender();
    }

    get noteAccidentals(): (AccidentalType | null | undefined)[] {
      return this.#noteAccidentals;
    }
    set noteAccidentals(v: (AccidentalType | null | undefined)[]) {
      this.#noteAccidentals = v;
      this.#scheduleRender();
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

    get dynamic(): DynamicMarking | null {
      return parseDynamicMarking(this.getAttribute('dynamic'));
    }
    set dynamic(value: DynamicMarking | null) {
      if (value === null) {
        this.removeAttribute('dynamic');
      } else {
        this.setAttribute('dynamic', value);
      }
    }

    get crescendo(): HairpinRole | null {
      return parseConnectorRole(this.getAttribute('crescendo'));
    }
    set crescendo(value: HairpinRole | null) {
      if (value === null) {
        this.removeAttribute('crescendo');
      } else {
        this.setAttribute('crescendo', value);
      }
    }

    get decrescendo(): HairpinRole | null {
      return parseConnectorRole(this.getAttribute('decrescendo'));
    }
    set decrescendo(value: HairpinRole | null) {
      if (value === null) {
        this.removeAttribute('decrescendo');
      } else {
        this.setAttribute('decrescendo', value);
      }
    }

    // Alias for decrescendo — always mirrors it, never holds separate state.
    get diminuendo(): HairpinRole | null {
      return this.decrescendo;
    }
    set diminuendo(value: HairpinRole | null) {
      this.decrescendo = value;
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
      this.#childObserver = new MutationObserver(() => {
        this.#scheduleRender();
      });
      this.#childObserver.observe(this, { childList: true });
    }

    disconnectedCallback(): void {
      this.#childObserver?.disconnect();
      this.#childObserver = null;
    }

    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null
    ): void {
      if (oldValue === newValue) {
        return;
      }

      // diminuendo is an alias for decrescendo — normalize immediately so
      // decrescendo is the only hairpin attribute any other code ever sees.
      // Runs even before the element is connected (unlike the rest of this
      // callback) since callers commonly set attributes before appending.
      // Only forward when diminuendo is being set (newValue !== null); the
      // follow-up removeAttribute('diminuendo') below re-enters this callback
      // with newValue === null and must be a no-op, or it would immediately
      // clear the decrescendo value we just set.
      if (name === 'diminuendo') {
        if (newValue !== null) {
          this.setAttribute('decrescendo', newValue);
          this.removeAttribute('diminuendo');
        }
        return;
      }

      if (!this.isConnected) {
        return;
      }

      if (name === 'tie' || name === 'slur') {
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.CONNECTOR_ATTRIBUTE_CHANGE, {
            bubbles: true,
            composed: true,
          })
        );
        return;
      }

      if (name === 'dynamic' || name === 'crescendo' || name === 'decrescendo') {
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.DYNAMIC_ATTRIBUTE_CHANGE, {
            bubbles: true,
            composed: true,
          })
        );
        return;
      }

      this.render();
    }

    private render(): void {
      if (this.#staffYCoordinates) {
        const [chordSvg] = createChordSvg({
          duration: this.duration,
          staffYCoordinates: this.#staffYCoordinates,
          noFlags: this.#noFlags,
          stemUp: this.#stemUp,
          stemExtension: this.#stemExtension,
          qualifiedElementName: 'g',
          noteAccidentals: this.#noteAccidentals,
        });
        chordSvg.setAttribute('overflow', 'visible');
        addLedgerLines(
          chordSvg,
          this.#staffYCoordinates,
          this.#stemUp,
          STAFF_Y_PADDING - NOTE_HEAD_Y_OFFSET_CORRECTION
        );

        // Wrap in an SVG element for display
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- contructor creates it
        this.shadowRoot!.innerHTML = `
          <style>
            :host { display: inline-block; overflow: visible; }
            svg { overflow: visible; }
          </style>
        `;
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('width', '32');
        svg.setAttribute('height', `${STAFF_TRANSCRIPTION_HEIGHT}`);
        svg.setAttribute('overflow', 'visible');
        svg.appendChild(chordSvg);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constructor creates it
        this.shadowRoot!.appendChild(svg);

        svg.addEventListener('click', (e) => {
          this.dispatchEvent(
            new CustomEvent(CHORD_EVENTS.CLICK, {
              bubbles: true,
              composed: true,
              detail: {
                notes: this.notes,
                duration: this.duration,
                originalEvent: e,
              },
            })
          );
        });
        svg.addEventListener('pointerdown', (e) => {
          this.dispatchEvent(
            new CustomEvent(CHORD_EVENTS.POINTERDOWN, {
              bubbles: true,
              composed: true,
              detail: {
                notes: this.notes,
                duration: this.duration,
                originalEvent: e,
              },
            })
          );
        });
        svg.addEventListener('pointerup', (e) => {
          this.dispatchEvent(
            new CustomEvent(CHORD_EVENTS.POINTERUP, {
              bubbles: true,
              composed: true,
              detail: {
                notes: this.notes,
                duration: this.duration,
                originalEvent: e,
              },
            })
          );
        });
      } else {
        // Standalone mode: use built-in coordinate system to render a proper chord SVG.
        const notes = this.notes;

        if (notes.length === 0) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constructor creates it
          this.shadowRoot!.innerHTML = `<style>:host { display: inline-block; }</style>`;
          return;
        }

        const standaloneYCoordinates = this.#resolveStandaloneYCoordinates();
        const stemUp = Math.max(...standaloneYCoordinates) > MIDDLE_STAFF_Y;
        const noteAccidentals = this.#resolveStandaloneNoteAccidentals();

        const [chordSvg] = createChordSvg({
          duration: this.duration,
          staffYCoordinates: standaloneYCoordinates,
          stemUp,
          noteAccidentals,
          noFlags: false,
          stemExtension: 0,
          qualifiedElementName: 'g',
        });
        chordSvg.setAttribute('overflow', 'visible');

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constructor creates it
        this.shadowRoot!.innerHTML = `
          <style>
            :host { display: inline-block; overflow: visible; }
            svg { overflow: visible; }
          </style>
        `;
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('width', '32');
        svg.setAttribute('height', `${STAFF_TRANSCRIPTION_HEIGHT}`);
        svg.setAttribute('overflow', 'visible');
        svg.appendChild(chordSvg);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constructor creates it
        this.shadowRoot!.appendChild(svg);
      }
    }

    #resolveStandaloneYCoordinates(): number[] {
      const result: number[] = [];
      let previousY = Infinity;
      const yCoordinates = ChordElement.#standaloneYCoordinates;
      const octaves = ChordElement.#standaloneOctaves;

      for (const note of this.notes) {
        const letter = note.value[0].toUpperCase();
        if (note.octave !== null) {
          const y =
            yCoordinates[`${letter}${note.octave}` as NoteLetterOctave] ?? 0;
          result.push(y);
          previousY = y;
        } else {
          const candidates: number[] = [];
          for (const octave of octaves) {
            const y = yCoordinates[`${letter}${octave}` as NoteLetterOctave];
            if (y !== undefined && y > 0 && y < previousY) {
              candidates.push(y);
            }
          }
          const resolved =
            candidates.length > 0
              ? Math.max(...candidates)
              : yCoordinates[`${letter}${octaves[0]}` as NoteLetterOctave] ?? 0;
          result.push(resolved);
          previousY = resolved;
        }
      }

      return result;
    }

    #resolveStandaloneNoteAccidentals(): (AccidentalType | null | undefined)[] {
      return this.notes.map((note) => {
        if (note.value.includes('#')) {
          return 'sharp';
        } else if (note.value.length > 1 && note.value[1] === 'b') {
          return 'flat';
        }
        return null;
      });
    }
  }

  if (!customElements.get(MUSIC_CHORD)) {
    customElements.define(MUSIC_CHORD, ChordElement);
  }
}
