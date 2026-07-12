import {
  applyResolvedGraceAccidentals,
  buildGraceNoteDescriptors,
} from '../rules/graceRules';
import { ConnectorRole, INoteElement } from '../types/elements';
import {
  AccidentalType,
  ArticulationType,
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
  ACCIDENTAL_NOTE_GAP,
  ACCIDENTAL_SYMBOL_WIDTH,
  addLedgerLines,
  createGraceNotesSvg,
  createNoteSvg,
  GRACE_MAIN_GAP_PX,
  NOTE_HEAD_Y_OFFSET_CORRECTION,
  NOTE_SCALE,
  noteHeadCenter,
  parseArticulation,
  parseConnectorRole,
  parseDynamicMarking,
  parseGraceDuration,
  parseGraceNotes,
  parseGraceOctaves,
  parseGraceSlur,
  parseGraceType,
  parseStress,
} from '../utils';
import { MUSIC_NOTE, NOTE_EVENTS, OCTAVES, STAFF_TAGS } from '../utils/consts';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class NoteElement extends HTMLElement implements INoteElement {
    static get observedAttributes(): string[] {
      return [
        'duration',
        'note',
        'octave',
        'tie',
        'slur',
        'dynamic',
        'crescendo',
        'decrescendo',
        'diminuendo',
        'articulation',
        'stress',
        'grace',
        'grace-octave',
        'grace-type',
        'grace-duration',
        'grace-slur',
      ];
    }

    #stemUp = true;
    #stemExtension = 0;
    #noFlags = false;
    #noStem = false;
    // undefined = no override, infer accidental from the `note` suffix;
    // null = explicit override, suppress the accidental; value = explicit override, force this symbol
    #showAccidental: AccidentalType | null | undefined = undefined;
    #staffY: number | null = null;
    #resolvedGraceAccidentals: (AccidentalType | null)[] | null = null;
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

    get note(): Note {
      return (this.getAttribute('note') as Note) ?? 'C';
    }

    set note(value: Note | null) {
      if (value === null) this.removeAttribute('note');
      else this.setAttribute('note', value);
    }

    get octave(): Octave | null {
      const attribute = this.getAttribute('octave');
      if (attribute === null) {
        return null;
      }
      const parsed = Number(attribute) as Octave;
      return OCTAVES.includes(parsed) ? parsed : null;
    }

    set octave(val: Octave | null) {
      if (val === null) {
        this.removeAttribute('octave');
      } else {
        this.setAttribute('octave', String(val));
      }
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

    // see #showAccidental declaration for explanation of the three possible types.
    get showAccidental(): AccidentalType | null | undefined {
      return this.#showAccidental;
    }
    set showAccidental(value: AccidentalType | null | undefined) {
      this.#showAccidental = value;
      this.#scheduleRender();
    }

    get staffY(): number | null {
      return this.#staffY;
    }
    set staffY(value: number | null) {
      this.#staffY = value;
      this.#scheduleRender();
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

    get grace(): Note[] | null {
      return parseGraceNotes(this.getAttribute('grace'));
    }
    set grace(value: Note[] | null) {
      if (value === null || value.length === 0) {
        this.removeAttribute('grace');
      } else {
        this.setAttribute('grace', value.join(','));
      }
    }

    get graceOctave(): (Octave | null)[] | null {
      return parseGraceOctaves(this.getAttribute('grace-octave'));
    }
    set graceOctave(value: (Octave | null)[] | null) {
      if (value === null || value.length === 0) {
        this.removeAttribute('grace-octave');
      } else {
        this.setAttribute('grace-octave', value.map((v) => v ?? '').join(','));
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

      if (name === 'note' || name === 'octave') {
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.NOTE_Y_CHANGE, {
            bubbles: true,
            composed: true,
          })
        );
        return;
      }

      if (
        name === 'dynamic' ||
        name === 'crescendo' ||
        name === 'decrescendo'
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
        name === 'grace' ||
        name === 'grace-octave' ||
        name === 'grace-type' ||
        name === 'grace-duration' ||
        name === 'grace-slur'
      ) {
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.NOTE_Y_CHANGE, {
            bubbles: true,
            composed: true,
          })
        );
        // Is standalone mode; if not, staff will call
        // trigger a call to render() via batchUpdate()
        if (!this.closest(STAFF_TAGS)) {
          this.render();
        }
        return;
      }

      this.render();
    }

    private render(): void {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- contructor creates it
      this.shadowRoot!.innerHTML = `
        <style>
          :host { display: inline-block; width: 32px; height: 60px; overflow: visible; }
        </style>
      `;

      let accidental: AccidentalType | undefined;
      if (this.#showAccidental === undefined) {
        const suffix = this.note.slice(1);
        if (suffix === '##') {
          accidental = 'double-sharp';
        } else if (suffix === 'bb') {
          accidental = 'double-flat';
        } else if (suffix === '#') {
          accidental = 'sharp';
        } else if (suffix === 'b') {
          accidental = 'flat';
        }
      } else if (this.#showAccidental !== null) {
        accidental = this.#showAccidental;
      }

      const [noteSvg, yHeadOffset] = createNoteSvg({
        duration: this.duration,
        stemUp: this.#stemUp,
        stemExtension: this.#stemExtension,
        noFlags: this.#noFlags,
        noStem: this.#noStem,
        accidental,
        articulation: this.articulation,
        stress: this.stress,
      });

      if (this.#staffY !== null) {
        addLedgerLines(
          noteSvg,
          [this.#staffY],
          this.#stemUp,
          yHeadOffset - NOTE_HEAD_Y_OFFSET_CORRECTION - this.#staffY
        );
      }

      this.#appendGraceNotes(noteSvg, accidental);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- contructor creates it
      this.shadowRoot!.appendChild(noteSvg);

      noteSvg.addEventListener('click', (e) => {
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.CLICK, {
            bubbles: true,
            composed: true,
            detail: {
              value: this.note,
              duration: this.duration,
              originalEvent: e,
            },
          })
        );
      });
      noteSvg.addEventListener('pointerdown', (e) => {
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.POINTERDOWN, {
            bubbles: true,
            composed: true,
            detail: {
              value: this.note,
              duration: this.duration,
              originalEvent: e,
            },
          })
        );
      });
      noteSvg.addEventListener('pointerup', (e) => {
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.POINTERUP, {
            bubbles: true,
            composed: true,
            detail: {
              value: this.note,
              duration: this.duration,
              originalEvent: e,
            },
          })
        );
      });
    }

    // Grace notes render inside the note's own SVG, left of its accidental,
    // so they work identically in-staff and standalone.
    #appendGraceNotes(
      noteSvg: SVGElement,
      accidental: AccidentalType | undefined
    ): void {
      const graceNoteLetters = this.grace;
      if (graceNoteLetters === null) {
        return;
      }

      const graceNotes = buildGraceNoteDescriptors(
        graceNoteLetters,
        this.graceOctave ?? [],
        this.note[0] as NoteLetter,
        this.octave ?? 4
      );
      applyResolvedGraceAccidentals(graceNotes, this.#resolvedGraceAccidentals);

      const accidentalFootprint = accidental
        ? ACCIDENTAL_SYMBOL_WIDTH[accidental] + ACCIDENTAL_NOTE_GAP
        : 0;
      const { cx, cy } = noteHeadCenter(
        this.#stemUp,
        this.duration,
        this.#noFlags
      );
      const graceGroup = createGraceNotesSvg({
        graceNotes,
        graceType: this.graceType,
        graceDuration: this.graceDuration,
        graceSlur: this.graceSlur,
        mainHeadCenterXPx: cx * NOTE_SCALE,
        mainHeadCenterYPx: cy * NOTE_SCALE,
        // A single note has no top/bottom distinction — same point either way.
        mainTopNoteXPx: cx * NOTE_SCALE,
        mainTopNoteYPx: cy * NOTE_SCALE,
        anchorRightXPx: -accidentalFootprint - GRACE_MAIN_GAP_PX,
        mainAccidentalShown: accidental !== undefined,
        mainStemUp: this.#stemUp,
        mainStaffY: this.#staffY,
      });
      noteSvg.setAttribute('overflow', 'visible');
      noteSvg.appendChild(graceGroup);
    }
  }

  if (!customElements.get(MUSIC_NOTE)) {
    customElements.define(MUSIC_NOTE, NoteElement);
  }
}
