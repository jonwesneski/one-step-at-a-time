import {
  applyResolvedGraceAccidentals,
  buildGraceNoteDescriptors,
  GraceNoteDescriptor,
} from '../rules/graceRules';
import { generateYCoordinates, getChordNotes } from '../rules/theoryHelpers';
import type {
  ChordNote,
  ConnectorRole,
  GraceArticulationsType,
  GraceNotesType,
  GraceOctavesType,
  IChordElement,
  NoteElementType,
  NoteLetterOctave,
  TieValue,
} from '../types/elements';
import type {
  AccidentalType,
  ArpeggioType,
  ArticulationType,
  Chord,
  DurationType,
  DynamicMarking,
  GraceDuration,
  GraceSlur,
  GraceType,
  HairpinKind,
  HairpinRole,
  Note,
  NoteLetter,
  Octave,
  StressType,
  TrillContinuationMode,
  TrillFinishSlur,
  TrillLineMode,
  TrillStyle,
} from '../types/theory';
import {
  addLedgerLines,
  createChordSvg,
  createSempreArpeggiandoText,
  graceListToAttr,
  NOTE_HEAD_Y_OFFSET_CORRECTION,
  parseAccidentalType,
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
  parseHairpinKind,
  parseStress,
  parseTieValue,
  parseTrillContinuationMode,
  parseTrillFinishSlur,
  parseTrillLineMode,
  parseTrillStyle,
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
   * @attr {'start' | 'end' | 'laissez-vibrer'} tie - Start or end of a tie, or `laissez-vibrer` (alias `lv`) for an open-ended "let ring" tie.
   * @attr {boolean} lv-label - Draw an `l.v.` label on a `tie="laissez-vibrer"` tie.
   * @attr {'start' | 'end'} slur - Marks this chord as the start or end of a slur.
   * @attr {string} for - `id` of the matching start element, to disambiguate interleaved same-kind ties/slurs.
   * @attr {DynamicMarking} dynamic - Dynamic marking under the chord.
   * @attr {'start' | 'end'} crescendo - Start or end of a crescendo hairpin.
   * @attr {'start' | 'end'} decrescendo - Start or end of a decrescendo hairpin.
   * @attr {'start' | 'end'} diminuendo - Alias of `decrescendo`.
   * @attr {ArticulationType} articulation - Articulation/accent mark.
   * @attr {'stressed' | 'unstressed'} stress - Schoenberg stress mark.
   * @attr {ArpeggioType} arpeggio - Arpeggio sign left of the chord, spanning its notehead range: `up`, `up-arrow`, `down`, or `non-arpeggiate` (square bracket).
   * @attr {string} arpeggio-for - `id` of the upper-staff element this chord continues an unbroken cross-staff arpeggio from.
   * @attr {'crescendo' | 'diminuendo'} arpeggio-hairpin - A dynamic change during the roll: a vertical hairpin drawn left of the arpeggio sign. Honoured only with a rolled `arpeggio` (`up` / `up-arrow` / `down`).
   * @attr {DynamicMarking} arpeggio-hairpin-from - Dynamic letter at the start of the roll (bottom end for an upward roll), placed outside the staff.
   * @attr {DynamicMarking} arpeggio-hairpin-to - Dynamic letter at the end of the roll (top end for an upward roll), placed outside the staff.
   * @attr {'start' | 'end'} arpeggiate - Marks the start or end of a `sempre arpeggiando` passage (every chord in it rolls unless it sets its own `arpeggio`).
   * @attr {string} grace - Comma-separated grace-note pitches preceding the chord, e.g. `"F#,G"`. The property also accepts a `Note[]`.
   * @attr {string} grace-octave - Comma-separated octaves aligned by index with `grace`. The property also accepts an `(Octave | null)[]`.
   * @attr {string} grace-articulation - Comma-separated per-grace articulation aligned by index with `grace`. The property also accepts an `(ArticulationType | null)[]`.
   * @attr {'acciaccatura' | 'appoggiatura' | 'trill'} grace-type - Grace-note style. `trill` is a plain unslashed notehead (unlike `acciaccatura`'s crossed-through slash), for a leading grace note that introduces a trill. Defaults to `acciaccatura`.
   * @attr {GraceDuration} grace-duration - Note value drawn for the grace notes.
   * @attr {'auto' | 'none'} grace-slur - Whether to draw the slur from the grace group to the chord. Defaults to `auto`.
   * @attr {DynamicMarking} grace-dynamic - A single dynamic for the whole grace group.
   * @attr {boolean} trill - Marks a trill start: draws the "tr" sign above the stave. Requires a staff (absent on a standalone chord). The wavy line spans forward through this chord's own `tie` chain — set `trill` once, not on every tied chord.
   * @attr {'auto' | 'none'} trill-line - `auto` (default) draws the wavy extension line, matching standard practice; `none` suppresses it (e.g. bare sign only on an isolated, untied note-value).
   * @attr {boolean} trill-stop - Draws a vertical end-notch here instead of letting the line run to the next notehead.
   * @attr {'sign' | 'abbreviation'} trill-style - `sign` (default) draws the stylized trill glyph; `abbreviation` draws plain italic `t.r.` text instead.
   * @attr {AccidentalType} trill-accidental - Overrides only the accidental of the trilling (auxiliary) pitch — normally the diatonic upper neighbor as modified by the key signature (the chord's topmost note). Never changes the letter itself. Ignored (with a warning) when `trill-note` is also set.
   * @attr {Note} trill-note - Full override of the trilling pitch (letter + accidental), rendered as a small written notehead in parentheses after the chord's own notehead column — required when the trilling pitch shares the reference note's own letter (a chromatic/semitone trill) or otherwise isn't the plain diatonic neighbor. Wins over `trill-accidental` when both are set.
   * @attr {'bracketed' | 'line-only'} trill-continuation - Controls a trill's line restatement after a system break, once its tie chain has carried it there. `bracketed` (default) redraws the sign in parentheses; `line-only` resumes with no restated sign. Ignored at an ordinary same-row barline (always resumes silently there). Meaningful only on the chord that started the trill.
   * @attr {string} trill-finish - Comma-separated grace-note pitch(es) placed *after* this chord (a trill's finishing/closing figure), e.g. `"F#,G"`. The property also accepts a `Note[]`. Always a plain unslashed notehead (no `grace-type` equivalent).
   * @attr {string} trill-finish-octave - Comma-separated octaves aligned by index with `trill-finish`; empty slots use this chord's reference octave. The property also accepts an `(Octave | null)[]`.
   * @attr {'none' | 'to-main' | 'to-next' | 'both'} trill-finish-slur - Which slur(s) the finishing grace note(s) draw: back to this chord (`to-main`, default), forward to the next note/chord (`to-next`), `both`, or `none`.
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
        'arpeggio-hairpin',
        'arpeggio-hairpin-from',
        'arpeggio-hairpin-to',
        'arpeggiate',
        'grace',
        'grace-octave',
        'grace-articulation',
        'grace-type',
        'grace-duration',
        'grace-slur',
        'grace-dynamic',
        'trill',
        'trill-line',
        'trill-stop',
        'trill-style',
        'trill-accidental',
        'trill-note',
        'trill-continuation',
        'trill-finish',
        'trill-finish-octave',
        'trill-finish-slur',
      ];
    }

    static readonly #standaloneYCoordinates = generateYCoordinates('C6', 'C4');
    static readonly #standaloneOctaves: Octave[] = [4, 5, 6];

    #stemUp = true;
    #stemExtension = 0;
    #noFlags = false;
    #renderArpeggioSign = true;
    #impliedArpeggio: ArpeggioType | null = null;
    #staffYCoordinates: number[] | null = null;
    #noteAccidentals: (AccidentalType | null | undefined)[] = [];
    #resolvedGraceAccidentals: (AccidentalType | null)[] | null = null;
    #resolvedTrillFinishAccidentals: (AccidentalType | null)[] | null = null;
    #resolvedTrillPitch: {
      letter: NoteLetter;
      accidental: AccidentalType | null;
      written: boolean;
      octave: Octave | null;
    } | null = null;
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
      if (v === this.#stemExtension) {
        return;
      }
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

    // `id` of the upper-staff element this chord continues an unbroken
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

    // Dynamic change during the roll — a vertical hairpin left of the arpeggio
    // sign. Accepts `crescendo` / `decrescendo` (`diminuendo` normalizes to
    // `decrescendo`). Honoured only alongside a wave-variant `arpeggio`.
    get arpeggioHairpin(): HairpinKind | null {
      return parseHairpinKind(this.getAttribute('arpeggio-hairpin'));
    }
    set arpeggioHairpin(value: HairpinKind | null) {
      if (value === null) {
        this.removeAttribute('arpeggio-hairpin');
      } else {
        this.setAttribute('arpeggio-hairpin', value);
      }
    }

    get arpeggioHairpinFrom(): DynamicMarking | null {
      return parseDynamicMarking(this.getAttribute('arpeggio-hairpin-from'));
    }
    set arpeggioHairpinFrom(value: DynamicMarking | null) {
      if (value === null) {
        this.removeAttribute('arpeggio-hairpin-from');
      } else {
        this.setAttribute('arpeggio-hairpin-from', value);
      }
    }

    get arpeggioHairpinTo(): DynamicMarking | null {
      return parseDynamicMarking(this.getAttribute('arpeggio-hairpin-to'));
    }
    set arpeggioHairpinTo(value: DynamicMarking | null) {
      if (value === null) {
        this.removeAttribute('arpeggio-hairpin-to');
      } else {
        this.setAttribute('arpeggio-hairpin-to', value);
      }
    }

    // The hairpin kind actually drawn — `arpeggioHairpin` when the effective
    // arpeggio (own, implied, or the `arpeggio-for` continuation) is a rolled
    // wave; null otherwise.
    #effectiveArpeggioHairpin(): HairpinKind | null {
      const hairpin = this.arpeggioHairpin;
      if (hairpin === null) {
        return null;
      }
      const arpeggio =
        this.arpeggio ??
        this.#impliedArpeggio ??
        (this.arpeggioFor !== null ? 'up' : null);
      return arpeggio === 'up' || arpeggio === 'up-arrow' || arpeggio === 'down'
        ? hairpin
        : null;
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

    // Marks a trill start. The line spans forward through this chord's own
    // `tie` chain — see NOTE_EVENTS.TRILL_ATTRIBUTE_CHANGE in
    // attributeChangedCallback.
    get trill(): boolean {
      return this.hasAttribute('trill');
    }
    set trill(value: boolean) {
      if (value) {
        this.setAttribute('trill', '');
      } else {
        this.removeAttribute('trill');
      }
    }

    get trillLine(): TrillLineMode {
      return parseTrillLineMode(this.getAttribute('trill-line'));
    }
    set trillLine(value: TrillLineMode) {
      this.setAttribute('trill-line', value);
    }

    get trillStop(): boolean {
      return this.hasAttribute('trill-stop');
    }
    set trillStop(value: boolean) {
      if (value) {
        this.setAttribute('trill-stop', '');
      } else {
        this.removeAttribute('trill-stop');
      }
    }

    get trillStyle(): TrillStyle {
      return parseTrillStyle(this.getAttribute('trill-style'));
    }
    set trillStyle(value: TrillStyle) {
      this.setAttribute('trill-style', value);
    }

    // Overrides only the accidental of the trilling (auxiliary) pitch —
    // normally the diatonic upper neighbor as modified by the key signature.
    // Ignored (with a warning) when trill-note is also set.
    get trillAccidental(): AccidentalType | null {
      return parseAccidentalType(this.getAttribute('trill-accidental'));
    }
    set trillAccidental(value: AccidentalType | null) {
      if (value === null) {
        this.removeAttribute('trill-accidental');
      } else {
        this.setAttribute('trill-accidental', value);
      }
    }

    // Full override of the trilling pitch — letter and accidental — rendered
    // as a small written notehead in parentheses after the chord's own
    // notehead column. Wins over trill-accidental when both are set.
    get trillNote(): Note | null {
      return (this.getAttribute('trill-note') as Note) ?? null;
    }
    set trillNote(value: Note | null) {
      if (value === null) {
        this.removeAttribute('trill-note');
      } else {
        this.setAttribute('trill-note', value);
      }
    }

    // Meaningful only on the trill-starting element — controls the
    // system-break restatement, resolved by the ancestor composition.
    get trillContinuation(): TrillContinuationMode {
      return parseTrillContinuationMode(
        this.getAttribute('trill-continuation')
      );
    }
    set trillContinuation(value: TrillContinuationMode) {
      this.setAttribute('trill-continuation', value);
    }

    // Set by the staff to the resolved trilling pitch. null when not
    // trilling, or in standalone mode.
    get resolvedTrillPitch(): {
      letter: NoteLetter;
      accidental: AccidentalType | null;
      written: boolean;
      octave: Octave | null;
    } | null {
      return this.#resolvedTrillPitch;
    }
    set resolvedTrillPitch(
      value: {
        letter: NoteLetter;
        accidental: AccidentalType | null;
        written: boolean;
        octave: Octave | null;
      } | null
    ) {
      this.#resolvedTrillPitch = value;
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

    // Grace note(s) placed after this chord (a trill's finishing figure) —
    // same shape and fallback rules as `grace`/`graceOctave`.
    get trillFinish(): Note[] | null {
      return parseGraceNotes(this.getAttribute('trill-finish'));
    }
    set trillFinish(value: GraceNotesType) {
      const attr = graceListToAttr(value, parseGraceNotes);
      if (attr === null) {
        this.removeAttribute('trill-finish');
      } else {
        this.setAttribute('trill-finish', attr);
      }
    }

    get trillFinishOctave(): (Octave | null)[] | null {
      return parseGraceOctaves(this.getAttribute('trill-finish-octave'));
    }
    set trillFinishOctave(value: GraceOctavesType) {
      const attr = graceListToAttr(value, parseGraceOctaves);
      if (attr === null) {
        this.removeAttribute('trill-finish-octave');
      } else {
        this.setAttribute('trill-finish-octave', attr);
      }
    }

    get trillFinishSlur(): TrillFinishSlur {
      return parseTrillFinishSlur(this.getAttribute('trill-finish-slur'));
    }
    set trillFinishSlur(value: TrillFinishSlur) {
      this.setAttribute('trill-finish-slur', value);
    }

    get resolvedTrillFinishAccidentals(): (AccidentalType | null)[] | null {
      return this.#resolvedTrillFinishAccidentals;
    }
    set resolvedTrillFinishAccidentals(
      value: (AccidentalType | null)[] | null
    ) {
      this.#resolvedTrillFinishAccidentals = value;
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

      if (name === 'tie' || name === 'slur' || name === 'lv-label') {
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
        name === 'arpeggio-for' ||
        name === 'arpeggio-hairpin' ||
        name === 'arpeggio-hairpin-from' ||
        name === 'arpeggio-hairpin-to' ||
        name === 'arpeggiate'
      ) {
        // The ancestor measure re-resolves cross-staff arpeggio spans (and the
        // continuous hairpin); the staff re-resolves `sempre arpeggiando`
        // passages.
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.ARPEGGIO_ATTRIBUTE_CHANGE, {
            bubbles: true,
            composed: true,
          })
        );
        if (
          name === 'arpeggio-hairpin' &&
          newValue !== null &&
          this.#effectiveArpeggioHairpin() === null
        ) {
          console.warn(
            `[music-chord] arpeggio-hairpin is set without a rolled arpeggio (up / up-arrow / down); it will not render`
          );
        }
      }

      if (
        name === 'trill' ||
        name === 'trill-line' ||
        name === 'trill-stop' ||
        name === 'trill-style' ||
        name === 'trill-accidental' ||
        name === 'trill-continuation'
      ) {
        // The ancestor staff resolves the trill line span (walking this
        // chord's own tie chain), re-resolves the key-signature-aware
        // trilling pitch, and redraws the line in its own overlay — both
        // synchronously within this dispatchEvent call, so the render()
        // below already sees the fresh resolvedTrillPitch. No staff-driven
        // layout/footprint dependency otherwise — re-render locally
        // unconditionally, standalone or not. `trill-continuation` affects
        // none of that (it only controls a system-break restatement an
        // ancestor <music-composition> draws), but shares the same dispatch
        // so that pass re-runs too.
        if (
          name === 'trill-accidental' &&
          newValue !== null &&
          this.trillNote !== null
        ) {
          console.warn(
            `[music-chord] trill-accidental is ignored when trill-note is also set`
          );
        }
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.TRILL_ATTRIBUTE_CHANGE, {
            bubbles: true,
            composed: true,
          })
        );
        this.render();
        return;
      }

      if (
        name === 'arpeggio' ||
        name === 'arpeggio-for' ||
        name === 'arpeggio-hairpin' ||
        name === 'arpeggio-hairpin-from' ||
        name === 'arpeggio-hairpin-to' ||
        name === 'arpeggiate' ||
        name === 'grace' ||
        name === 'grace-octave' ||
        name === 'grace-articulation' ||
        name === 'grace-type' ||
        name === 'grace-duration' ||
        name === 'grace-slur' ||
        name === 'trill-note' ||
        name === 'trill-finish' ||
        name === 'trill-finish-octave' ||
        name === 'trill-finish-slur'
      ) {
        // arpeggio/grace changes the chord's leftward footprint, and
        // trill-note/trill-finish the rightward one, the same way: it takes
        // the same path. `arpeggio-for` reserves the same footprint for the
        // lower end of a cross-staff span, whose wave the ancestor measure
        // draws. `trill-finish-slur` never changes the footprint itself but
        // shares this dispatch since the ancestor staff's cross-element
        // "slur to next" pass depends on it too.
        if (
          name === 'trill-note' &&
          newValue !== null &&
          this.trillAccidental !== null
        ) {
          console.warn(
            `[music-chord] trill-accidental is ignored when trill-note is also set`
          );
        }
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
          arpeggio: this.#renderArpeggioSign
            ? this.arpeggio ?? this.#impliedArpeggio
            : null,
          arpeggioHairpin: this.#renderArpeggioSign
            ? this.#effectiveArpeggioHairpin()
            : null,
          arpeggioHairpinFrom: this.arpeggioHairpinFrom,
          arpeggioHairpinTo: this.arpeggioHairpinTo,
          trill: this.trill,
          trillStyle: this.trillStyle,
          // A written trilling note (small notehead after the chord, drawn
          // by the staff overlay) carries its own accidental — the sign
          // itself shows one only for the accidental-only override form.
          trillAccidental:
            this.#resolvedTrillPitch?.written === false
              ? this.#resolvedTrillPitch.accidental
              : null,
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
          trillFinishNotes: this.#buildTrillFinishDescriptors(this.notes),
          trillFinishSlur: this.trillFinishSlur,
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
          arpeggio: this.#renderArpeggioSign
            ? this.arpeggio ?? this.#impliedArpeggio
            : null,
          arpeggioHairpin: this.#renderArpeggioSign
            ? this.#effectiveArpeggioHairpin()
            : null,
          arpeggioHairpinFrom: this.arpeggioHairpinFrom,
          arpeggioHairpinTo: this.arpeggioHairpinTo,
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
          trillFinishNotes: this.#buildTrillFinishDescriptors(notes),
          trillFinishSlur: this.trillFinishSlur,
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
        // Standalone: the `sempre arpeggiando` instruction renders next to this
        // element. Inside a staff the staff draws it once at the passage start.
        if (this.arpeggiate === 'start') {
          svg.appendChild(createSempreArpeggiandoText(0, -2));
        }
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

    // Trill-finish descriptors are relative to the chord's reference note
    // (notes[0]) — same relationship as #buildGraceDescriptors.
    #buildTrillFinishDescriptors(
      notes: ChordNote[]
    ): GraceNoteDescriptor[] | null {
      const trillFinishLetters = this.trillFinish;
      if (trillFinishLetters === null || notes.length === 0) {
        return null;
      }
      const trillFinishNotes = buildGraceNoteDescriptors(
        trillFinishLetters,
        this.trillFinishOctave ?? [],
        notes[0].value[0] as NoteLetter,
        notes[0].octave ?? 4
      );
      applyResolvedGraceAccidentals(
        trillFinishNotes,
        this.#resolvedTrillFinishAccidentals
      );
      return trillFinishNotes;
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
