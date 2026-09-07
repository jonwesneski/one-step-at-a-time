import {
  applyResolvedGraceAccidentals,
  buildGraceNoteDescriptors,
  GraceNoteDescriptor,
} from '../rules/graceRules';
import { generateYCoordinates, getChordNotes } from '../rules/theoryHelpers';
import {
  ChordNote,
  ConnectorRole,
  GraceArticulationsType,
  GraceNotesType,
  GraceOctavesType,
  IChordElement,
  NoteElementType,
  NoteLetterOctave,
} from '../types/elements';
import {
  AccidentalType,
  ArpeggioType,
  ArticulationType,
  Chord,
  DurationType,
  DynamicMarking,
  GraceDuration,
  GraceSlur,
  GraceType,
  HairpinRole,
  Note,
  NoteLetter,
  Octave,
  StressType,
} from '../types/theory';
import {
  addLedgerLines,
  createChordSvg,
  graceListToAttr,
  NOTE_HEAD_Y_OFFSET_CORRECTION,
  parseArpeggio,
  parseArticulation,
  parseConnectorRole,
  parseDynamicMarking,
  parseGraceArticulations,
  parseGraceDuration,
  parseGraceNotes,
  parseGraceOctaves,
  parseGraceSlur,
  parseGraceType,
  parseStress,
} from '../utils';
import {
  CHORD_EVENTS,
  MUSIC_CHORD,
  MUSIC_NOTE,
  NOTE_EVENTS,
  STAFF_TAGS,
  SVG_NS,
} from '../utils/consts';
import {
  MIDDLE_STAFF_Y,
  STAFF_TRANSCRIPTION_HEIGHT,
  STAFF_Y_PADDING,
} from '../utils/notationDimensions';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  /**
   * A chord: several noteheads sharing one stem. Supply the notes either as a
   * chord name via the `chord` attribute (e.g. `Cmaj7`) or as slotted
   * `<music-note>` children. Supports the same articulations, dynamics, hairpins,
   * ties/slurs and grace notes as `<music-note>`. Renders standalone or spaced
   * and beamed inside a `<music-staff>`.
   *
   * @customElement music-chord
   * @attr {Chord} chord - Chord name resolved into constituent pitches, e.g. `C`, `Am`, `Cmaj7`, `G/B`.
   * @attr {DurationType} duration - Note value for the chord. Defaults to `quarter`.
   * @attr {'start' | 'end'} tie - Marks this chord as the start or end of a tie.
   * @attr {'start' | 'end'} slur - Marks this chord as the start or end of a slur.
   * @attr {string} for - `id` of the matching start element, to disambiguate interleaved same-kind ties/slurs.
   * @attr {DynamicMarking} dynamic - Dynamic marking under the chord.
   * @attr {'start' | 'end'} crescendo - Start or end of a crescendo hairpin.
   * @attr {'start' | 'end'} decrescendo - Start or end of a decrescendo hairpin.
   * @attr {'start' | 'end'} diminuendo - Alias of `decrescendo`.
   * @attr {ArticulationType} articulation - Articulation/accent mark.
   * @attr {'stressed' | 'unstressed'} stress - Schoenberg stress mark.
   * @attr {ArpeggioType} arpeggio - Arpeggio sign left of the chord, spanning its notehead range: `up`, `up-arrow`, `down`, or `non-arpeggiate` (square bracket).
   * @attr {string} grace - Comma-separated grace-note pitches preceding the chord, e.g. `"F#,G"`. The property also accepts a `Note[]`.
   * @attr {string} grace-octave - Comma-separated octaves aligned by index with `grace`. The property also accepts an `(Octave | null)[]`.
   * @attr {string} grace-articulation - Comma-separated per-grace articulation aligned by index with `grace`. The property also accepts an `(ArticulationType | null)[]`.
   * @attr {'acciaccatura' | 'appoggiatura'} grace-type - Grace-note style. Defaults to `acciaccatura`.
   * @attr {GraceDuration} grace-duration - Note value drawn for the grace notes.
   * @attr {'auto' | 'none'} grace-slur - Whether to draw the slur from the grace group to the chord. Defaults to `auto`.
   * @attr {DynamicMarking} grace-dynamic - A single dynamic for the whole grace group.
   *
   * @example
   * <music-staff clef="treble" time="4/4">
   *   <music-chord chord="Cmaj7" duration="half"></music-chord>
   *   <music-chord duration="quarter">
   *     <music-note note="D" octave="4"></music-note>
   *     <music-note note="F" octave="4"></music-note>
   *     <music-note note="A" octave="4"></music-note>
   *   </music-chord>
   * </music-staff>
   */
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
        'articulation',
        'stress',
        'arpeggio',
        'grace',
        'grace-octave',
        'grace-articulation',
        'grace-type',
        'grace-duration',
        'grace-slur',
        'grace-dynamic',
      ];
    }

    static readonly #standaloneYCoordinates = generateYCoordinates('C6', 'C4');
    static readonly #standaloneOctaves: Octave[] = [4, 5, 6];

    #stemUp = true;
    #stemExtension = 0;
    #noFlags = false;
    #staffYCoordinates: number[] | null = null;
    #noteAccidentals: (AccidentalType | null | undefined)[] = [];
    #resolvedGraceAccidentals: (AccidentalType | null)[] | null = null;
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

    get articulation(): ArticulationType | null {
      return parseArticulation(this.getAttribute('articulation'));
    }
    set articulation(value: ArticulationType | null) {
      if (value === null) {
        this.removeAttribute('articulation');
      } else {
        this.setAttribute('articulation', value);
      }
    }

    get stress(): StressType | null {
      return parseStress(this.getAttribute('stress'));
    }
    set stress(value: StressType | null) {
      if (value === null) {
        this.removeAttribute('stress');
      } else {
        this.setAttribute('stress', value);
      }
    }

    get arpeggio(): ArpeggioType | null {
      return parseArpeggio(this.getAttribute('arpeggio'));
    }
    set arpeggio(value: ArpeggioType | null) {
      if (value === null) {
        this.removeAttribute('arpeggio');
      } else {
        this.setAttribute('arpeggio', value);
      }
    }

    get grace(): Note[] | null {
      return parseGraceNotes(this.getAttribute('grace'));
    }
    // Accepts the rich array or the comma-separated attribute string (React and
    // Storybook set the JSX prop as a property, not an attribute).
    set grace(value: GraceNotesType) {
      const attr = graceListToAttr(value, parseGraceNotes);
      if (attr === null) {
        this.removeAttribute('grace');
      } else {
        this.setAttribute('grace', attr);
      }
    }

    get graceOctave(): (Octave | null)[] | null {
      return parseGraceOctaves(this.getAttribute('grace-octave'));
    }
    set graceOctave(value: GraceOctavesType) {
      const attr = graceListToAttr(value, parseGraceOctaves);
      if (attr === null) {
        this.removeAttribute('grace-octave');
      } else {
        this.setAttribute('grace-octave', attr);
      }
    }

    get graceArticulation(): (ArticulationType | null)[] | null {
      return parseGraceArticulations(this.getAttribute('grace-articulation'));
    }
    set graceArticulation(value: GraceArticulationsType) {
      const attr = graceListToAttr(value, parseGraceArticulations);
      if (attr === null) {
        this.removeAttribute('grace-articulation');
      } else {
        this.setAttribute('grace-articulation', attr);
      }
    }

    get graceType(): GraceType {
      return parseGraceType(this.getAttribute('grace-type')) ?? 'acciaccatura';
    }
    set graceType(value: GraceType | null) {
      if (value === null) {
        this.removeAttribute('grace-type');
      } else {
        this.setAttribute('grace-type', value);
      }
    }

    get graceDuration(): GraceDuration | null {
      return parseGraceDuration(this.getAttribute('grace-duration'));
    }
    set graceDuration(value: GraceDuration | null) {
      if (value === null) {
        this.removeAttribute('grace-duration');
      } else {
        this.setAttribute('grace-duration', value);
      }
    }

    get graceSlur(): GraceSlur {
      return parseGraceSlur(this.getAttribute('grace-slur')) ?? 'auto';
    }
    set graceSlur(value: GraceSlur | null) {
      if (value === null) {
        this.removeAttribute('grace-slur');
      } else {
        this.setAttribute('grace-slur', value);
      }
    }

    get resolvedGraceAccidentals(): (AccidentalType | null)[] | null {
      return this.#resolvedGraceAccidentals;
    }
    set resolvedGraceAccidentals(value: (AccidentalType | null)[] | null) {
      this.#resolvedGraceAccidentals = value;
      this.#scheduleRender();
    }

    get graceDynamic(): DynamicMarking | null {
      return parseDynamicMarking(this.getAttribute('grace-dynamic'));
    }
    set graceDynamic(value: DynamicMarking | null) {
      if (value === null) {
        this.removeAttribute('grace-dynamic');
      } else {
        this.setAttribute('grace-dynamic', value);
      }
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

      if (
        name === 'dynamic' ||
        name === 'crescendo' ||
        name === 'decrescendo' ||
        name === 'grace-dynamic'
      ) {
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.DYNAMIC_ATTRIBUTE_CHANGE, {
            bubbles: true,
            composed: true,
          })
        );
        return;
      }

      if (
        name === 'arpeggio' ||
        name === 'grace' ||
        name === 'grace-octave' ||
        name === 'grace-articulation' ||
        name === 'grace-type' ||
        name === 'grace-duration' ||
        name === 'grace-slur'
      ) {
        // arpeggio changes the chord's leftward footprint the same way a grace
        // change does, so it takes the same path.
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.NOTE_Y_CHANGE, {
            bubbles: true,
            composed: true,
          })
        );
        // Is standalone mode; if not, staff will
        //  trigger a call to render() via batchUpdate()
        if (!this.closest(STAFF_TAGS)) {
          this.render();
        }
        return;
      }

      this.render();
    }

    private render(): void {
      if (this.#staffYCoordinates) {
        const [chordSvg] = createChordSvg({
          duration: this.duration,
          staffYCoordinates: this.#staffYCoordinates,
          arpeggio: this.arpeggio,
          noFlags: this.#noFlags,
          stemUp: this.#stemUp,
          stemExtension: this.#stemExtension,
          qualifiedElementName: 'g',
          noteAccidentals: this.#noteAccidentals,
          articulation: this.articulation,
          stress: this.stress,
          graceNotes: this.#buildGraceDescriptors(this.notes),
          graceType: this.graceType,
          graceDuration: this.graceDuration,
          graceSlur: this.graceSlur,
          graceLedgerStaffY: this.#staffYCoordinates[0] ?? null,
        });
        chordSvg.setAttribute('overflow', 'visible');
        addLedgerLines(
          chordSvg,
          this.#staffYCoordinates,
          this.#stemUp,
          STAFF_Y_PADDING - NOTE_HEAD_Y_OFFSET_CORRECTION
        );

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constructor attaches the shadow root
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
          arpeggio: this.arpeggio,
          stemUp,
          noteAccidentals,
          noFlags: false,
          stemExtension: 0,
          qualifiedElementName: 'g',
          articulation: this.articulation,
          stress: this.stress,
          graceNotes: this.#buildGraceDescriptors(notes),
          graceType: this.graceType,
          graceDuration: this.graceDuration,
          graceSlur: this.graceSlur,
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

    // Grace descriptors are relative to the chord's reference note (notes[0]).
    #buildGraceDescriptors(notes: ChordNote[]): GraceNoteDescriptor[] | null {
      const graceNoteLetters = this.grace;
      if (graceNoteLetters === null || notes.length === 0) {
        return null;
      }
      const graceNotes = buildGraceNoteDescriptors(
        graceNoteLetters,
        this.graceOctave ?? [],
        notes[0].value[0] as NoteLetter,
        notes[0].octave ?? 4,
        this.graceArticulation ?? []
      );
      applyResolvedGraceAccidentals(graceNotes, this.#resolvedGraceAccidentals);
      return graceNotes;
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
