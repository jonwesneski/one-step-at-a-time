import { computeArpeggioFootprintWidth } from '../rules/arpeggioRules';
import {
  applyResolvedGraceAccidentals,
  buildGraceNoteDescriptors,
} from '../rules/graceRules';
import {
  ConnectorRole,
  GraceArticulationsType,
  GraceNotesType,
  GraceOctavesType,
  INoteElement,
  TieValue,
} from '../types/elements';
import {
  AccidentalType,
  ArpeggioType,
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
  createSempreArpeggiandoText,
  GRACE_MAIN_GAP_PX,
  graceListToAttr,
  NOTE_HEAD_Y_OFFSET_CORRECTION,
  NOTE_SCALE,
  noteHeadCenter,
  parseArpeggio,
  parseArticulation,
  parseConnectorRole,
  parseTieValue,
  parseDynamicMarking,
  parseGraceArticulations,
  parseGraceDuration,
  parseGraceNotes,
  parseGraceOctaves,
  parseGraceSlur,
  parseGraceType,
  parseStress,
  stemUpTipYPx,
} from '../utils';
import { MUSIC_NOTE, NOTE_EVENTS, OCTAVES, STAFF_TAGS } from '../utils/consts';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  /**
   * A single note: notehead, stem, flag, ledger lines, plus optional
   * articulations, dynamics, hairpins, ties/slurs and grace notes. Renders
   * standalone or, inside a `<music-staff>`, is positioned and beamed by the
   * staff.
   *
   * @customElement music-note
   * @attr {Note} note - Pitch letter with optional accidental, e.g. `C`, `F#`, `Bb`.
   * @attr {Octave} octave - Scientific-pitch octave (2–6). Falls back to the staff's clef range when unset.
   * @attr {DurationType} duration - Note value: `whole`, `half`, `quarter`, `eighth`, `sixteenth`, … Defaults to `quarter`.
   * @attr {'start' | 'end' | 'laissez-vibrer'} tie - Start or end of a tie to the same pitch, or `laissez-vibrer` (alias `lv`) for an open-ended "let ring" tie.
   * @attr {boolean} lv-label - Draw an `l.v.` label on a `tie="laissez-vibrer"` tie.
   * @attr {'start' | 'end'} slur - Marks this note as the start or end of a slur.
   * @attr {string} for - `id` of the matching start element, to disambiguate interleaved same-kind ties/slurs.
   * @attr {DynamicMarking} dynamic - Dynamic marking under the note (`p`, `mf`, `ff`, `sfz`, …).
   * @attr {'start' | 'end'} crescendo - Start or end of a crescendo hairpin spanning to another note.
   * @attr {'start' | 'end'} decrescendo - Start or end of a decrescendo hairpin.
   * @attr {'start' | 'end'} diminuendo - Alias of `decrescendo`.
   * @attr {ArticulationType} articulation - Articulation/accent mark, e.g. `staccato`, `accent`, `marcato-tenuto`, `fermata`.
   * @attr {'stressed' | 'unstressed'} stress - Schoenberg stress mark.
   * @attr {ArpeggioType} arpeggio - Arpeggio sign left of the note: `up`, `up-arrow`, `down`, or `non-arpeggiate` (square bracket).
   * @attr {string} arpeggio-for - `id` of the upper-staff element this note continues an unbroken cross-staff arpeggio from.
   * @attr {'start' | 'end'} arpeggiate - Marks the start or end of a `sempre arpeggiando` passage (every chord in it rolls unless it sets its own `arpeggio`).
   * @attr {string} grace - Comma-separated grace-note pitches preceding this note, e.g. `"F#,G"`. The property also accepts a `Note[]`.
   * @attr {string} grace-octave - Comma-separated octaves aligned by index with `grace`; empty slots use this note's octave. The property also accepts an `(Octave | null)[]`.
   * @attr {string} grace-articulation - Comma-separated per-grace articulation aligned by index with `grace`; empty slots mean none. The property also accepts an `(ArticulationType | null)[]`.
   * @attr {'acciaccatura' | 'appoggiatura'} grace-type - Grace-note style. Defaults to `acciaccatura`.
   * @attr {GraceDuration} grace-duration - Note value drawn for the grace notes.
   * @attr {'auto' | 'none'} grace-slur - Whether to draw the slur from the grace group to the main note. Defaults to `auto`.
   * @attr {DynamicMarking} grace-dynamic - A single dynamic for the whole grace group, independent of `dynamic`.
   *
   * @example
   * <music-staff clef="treble" time="4/4">
   *   <music-note note="C" octave="5" duration="quarter" articulation="staccato"></music-note>
   *   <music-note note="E" octave="5" duration="eighth"></music-note>
   * </music-staff>
   */
  class NoteElement extends HTMLElement implements INoteElement {
    static get observedAttributes(): string[] {
      return [
        'duration',
        'note',
        'octave',
        'tie',
        'lv-label',
        'slur',
        'dynamic',
        'crescendo',
        'decrescendo',
        'diminuendo',
        'articulation',
        'stress',
        'arpeggio',
        'arpeggio-for',
        'arpeggiate',
        'grace',
        'grace-octave',
        'grace-articulation',
        'grace-type',
        'grace-duration',
        'grace-slur',
        'grace-dynamic',
      ];
    }

    #stemUp = true;
    #stemExtension = 0;
    #noFlags = false;
    #noStem = false;
    #renderArpeggioSign = true;
    #impliedArpeggio: ArpeggioType | null = null;
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

    set note(value: Note | null | undefined) {
      if (value === null || value === undefined) {
        this.removeAttribute('note');
      } else {
        this.setAttribute('note', value);
      }
    }

    get octave(): Octave | null {
      const attribute = this.getAttribute('octave');
      if (attribute === null) {
        return null;
      }
      const parsed = Number(attribute) as Octave;
      return OCTAVES.includes(parsed) ? parsed : null;
    }

    set octave(val: Octave | null | undefined) {
      if (val === null || val === undefined) {
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

    get tie(): TieValue | null {
      return parseTieValue(this.getAttribute('tie'));
    }
    set tie(value: TieValue | null) {
      if (value === null) {
        this.removeAttribute('tie');
      } else {
        this.setAttribute('tie', value);
      }
    }

    get lvLabel(): boolean {
      return this.hasAttribute('lv-label');
    }
    set lvLabel(value: boolean) {
      if (value) {
        this.setAttribute('lv-label', '');
      } else {
        this.removeAttribute('lv-label');
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

    // `id` of the upper-staff element this element continues an unbroken
    // cross-staff arpeggio from. Resolved by the ancestor <music-measure>.
    get arpeggioFor(): string | null {
      return this.getAttribute('arpeggio-for');
    }
    set arpeggioFor(value: string | null) {
      if (value === null) {
        this.removeAttribute('arpeggio-for');
      } else {
        this.setAttribute('arpeggio-for', value);
      }
    }

    get renderArpeggioSign(): boolean {
      return this.#renderArpeggioSign;
    }
    set renderArpeggioSign(value: boolean) {
      if (this.#renderArpeggioSign === value) {
        return;
      }
      this.#renderArpeggioSign = value;
      this.#scheduleRender();
    }

    get arpeggiate(): ConnectorRole | null {
      return parseConnectorRole(
        this.getAttribute('arpeggiate')
      ) as ConnectorRole | null;
    }
    set arpeggiate(value: ConnectorRole | null) {
      if (value === null) {
        this.removeAttribute('arpeggiate');
      } else {
        this.setAttribute('arpeggiate', value);
      }
    }

    get impliedArpeggio(): ArpeggioType | null {
      return this.#impliedArpeggio;
    }
    set impliedArpeggio(value: ArpeggioType | null) {
      if (this.#impliedArpeggio === value) {
        return;
      }
      this.#impliedArpeggio = value;
      this.#scheduleRender();
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

      if (name === 'tie' || name === 'slur' || name === 'lv-label') {
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
        name === 'arpeggio-for' ||
        name === 'arpeggiate'
      ) {
        // The ancestor measure re-resolves cross-staff arpeggio spans; the
        // staff re-resolves `sempre arpeggiando` passages.
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.ARPEGGIO_ATTRIBUTE_CHANGE, {
            bubbles: true,
            composed: true,
          })
        );
      }

      if (
        name === 'arpeggio' ||
        name === 'arpeggio-for' ||
        name === 'arpeggiate' ||
        name === 'grace' ||
        name === 'grace-octave' ||
        name === 'grace-articulation' ||
        name === 'grace-type' ||
        name === 'grace-duration' ||
        name === 'grace-slur'
      ) {
        // arpeggio changes the element's leftward footprint the same way a
        // grace change does, so it takes the same path: the staff re-runs its
        // layout pass on NOTE_Y_CHANGE, and standalone we re-render here.
        // `arpeggio-for` reserves the same footprint for the lower end of a
        // cross-staff span, whose wave the ancestor measure draws.
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.NOTE_Y_CHANGE, {
            bubbles: true,
            composed: true,
          })
        );
        // Is standalone mode; if not, staff will
        // trigger a call to render() via batchUpdate()
        if (!this.closest(STAFF_TAGS)) {
          this.render();
        }
        return;
      }

      this.render();
    }

    private render(): void {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constructor attaches the shadow root
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
        arpeggio: this.#renderArpeggioSign
          ? this.arpeggio ?? this.#impliedArpeggio
          : null,
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

      // Standalone: the `sempre arpeggiando` instruction renders next to this
      // element. Inside a staff the staff draws it once at the passage start
      // and propagates implied signs (see StaffClassicalElementBase).
      if (this.arpeggiate === 'start' && !this.closest(STAFF_TAGS)) {
        noteSvg.setAttribute('overflow', 'visible');
        noteSvg.appendChild(createSempreArpeggiandoText(0, -2));
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constructor attaches the shadow root
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
        this.octave ?? 4,
        this.graceArticulation ?? []
      );
      applyResolvedGraceAccidentals(graceNotes, this.#resolvedGraceAccidentals);

      const accidentalFootprint = accidental
        ? ACCIDENTAL_SYMBOL_WIDTH[accidental] + ACCIDENTAL_NOTE_GAP
        : 0;
      const arpeggioFootprint = computeArpeggioFootprintWidth(
        this.arpeggio ?? this.#impliedArpeggio,
        accidental !== undefined
      );
      const { cx, cy } = noteHeadCenter(
        this.#stemUp,
        this.duration,
        this.#noFlags
      );
      // Only used for a descending grace group's stem-tip slur anchoring
      // (see buildGraceSlur) — the real stem tip when this note is
      // stem-up, or the notehead itself when stem-down (no stem to
      // project to). Unused (and harmless to compute) otherwise.
      const mainSlurTargetXPx = cx * NOTE_SCALE;
      const mainSlurTargetYPx = this.#stemUp
        ? stemUpTipYPx(this.#stemExtension)
        : cy * NOTE_SCALE;
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
        mainSlurTargetXPx,
        mainSlurTargetYPx,
        anchorRightXPx:
          -accidentalFootprint - arpeggioFootprint - GRACE_MAIN_GAP_PX,
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
