import {
  computeArpeggioFootprintWidth,
  computeArpeggioHairpinFootprintWidth,
} from '../rules/arpeggioRules';
import {
  applyResolvedGraceAccidentals,
  buildGraceNoteDescriptors,
} from '../rules/graceRules';
import type {
  ConnectorRole,
  GraceArticulationsType,
  GraceNotesType,
  GraceOctavesType,
  INoteElement,
  TieValue,
} from '../types/elements';
import type {
  AccidentalType,
  ArpeggioType,
  ArticulationType,
  DurationType,
  DynamicMarking,
  GlissandoHint,
  GraceDuration,
  GraceSlur,
  GraceType,
  HairpinKind,
  HairpinRole,
  Note,
  NoteLetter,
  Octave,
  OctaveContinuationMode,
  OctaveDisplayMode,
  OctaveShiftAmount,
  StressType,
  TrillContinuationMode,
  TrillFinishSlur,
  TrillLineMode,
} from '../types/theory';
import {
  ACCIDENTAL_NOTE_GAP,
  ACCIDENTAL_SYMBOL_WIDTH,
  addLedgerLines,
  createGraceNotesSvg,
  createNoteSvg,
  createSempreArpeggiandoText,
  createTrillFinishNotesSvg,
  GRACE_MAIN_GAP_PX,
  graceListToAttr,
  NOTE_HEAD_Y_OFFSET_CORRECTION,
  NOTE_SCALE,
  noteHeadCenter,
  parseAccidentalType,
  parseArpeggio,
  parseArticulation,
  parseConnectorRole,
  parseDynamicMarking,
  parseGlissandoHint,
  parseGraceArticulations,
  parseGraceDuration,
  parseGraceNotes,
  parseGraceOctaves,
  parseGraceSlur,
  parseGraceType,
  parseHairpinKind,
  parseOctaveContinuationMode,
  parseOctaveDisplayMode,
  parseOctaveShiftAmount,
  parseStress,
  parseTieValue,
  parseTrillContinuationMode,
  parseTrillFinishSlur,
  parseTrillLineMode,
  stemUpTipYPx,
} from '../utils';
import { MUSIC_NOTE, NOTE_EVENTS, OCTAVES, STAFF_TAGS } from '../utils/consts';
import { NOTE_SVG_WIDTH } from '../utils/svgCreator/note';

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
   * @attr {'start' | 'end'} glissando - Marks this note as the start or end of a glissando (a straight line indicating a continuous slide between pitches).
   * @attr {'white-key' | 'black-key'} glissando-hint - Shown as text near a `glissando="start"` line ("white-note gliss." / "black-note gliss.") clarifying which keys it slides across.
   * @attr {string} for - `id` of the matching start element, to disambiguate interleaved same-kind ties/slurs/glissandi.
   * @attr {DynamicMarking} dynamic - Dynamic marking under the note (`p`, `mf`, `ff`, `sfz`, …).
   * @attr {boolean} dynamic-shared - Renders `dynamic` centered in the gap between this staff and its next/previous sibling staff (e.g. a keyboard dynamic marking both hands) instead of at this staff's own local placement. Requires a `<music-measure>` (or `<music-composition>`) ancestor with an adjacent staff; a lone/standalone note falls back to no rendering rather than guessing a position.
   * @attr {'start' | 'end'} crescendo - Start or end of a crescendo hairpin spanning to another note.
   * @attr {'start' | 'end'} decrescendo - Start or end of a decrescendo hairpin.
   * @attr {'start' | 'end'} diminuendo - Alias of `decrescendo`.
   * @attr {ArticulationType} articulation - Articulation/accent mark, e.g. `staccato`, `accent`, `marcato-tenuto`, `fermata`.
   * @attr {'stressed' | 'unstressed'} stress - Schoenberg stress mark.
   * @attr {ArpeggioType} arpeggio - Arpeggio sign left of the note: `up`, `up-arrow`, `down`, or `non-arpeggiate` (square bracket).
   * @attr {string} arpeggio-for - `id` of the upper-staff element this note continues an unbroken cross-staff arpeggio from.
   * @attr {'crescendo' | 'diminuendo'} arpeggio-hairpin - A dynamic change during the roll: a vertical hairpin drawn left of the arpeggio sign. Honoured only with a rolled `arpeggio` (`up` / `up-arrow` / `down`).
   * @attr {DynamicMarking} arpeggio-hairpin-from - Dynamic letter at the start of the roll (bottom end for an upward roll), placed outside the staff.
   * @attr {DynamicMarking} arpeggio-hairpin-to - Dynamic letter at the end of the roll (top end for an upward roll), placed outside the staff.
   * @attr {'start' | 'end'} arpeggiate - Marks the start or end of a `sempre arpeggiando` passage (every chord in it rolls unless it sets its own `arpeggio`).
   * @attr {string} grace - Comma-separated grace-note pitches preceding this note, e.g. `"F#,G"`. The property also accepts a `Note[]`.
   * @attr {string} grace-octave - Comma-separated octaves aligned by index with `grace`; empty slots use this note's octave. The property also accepts an `(Octave | null)[]`.
   * @attr {string} grace-articulation - Comma-separated per-grace articulation aligned by index with `grace`; empty slots mean none. The property also accepts an `(ArticulationType | null)[]`.
   * @attr {'acciaccatura' | 'appoggiatura' | 'trill'} grace-type - Grace-note style. `trill` is a plain unslashed notehead (unlike `acciaccatura`'s crossed-through slash), for a leading grace note that introduces a trill. Defaults to `acciaccatura`.
   * @attr {GraceDuration} grace-duration - Note value drawn for the grace notes.
   * @attr {'auto' | 'none'} grace-slur - Whether to draw the slur from the grace group to the main note. Defaults to `auto`.
   * @attr {DynamicMarking} grace-dynamic - A single dynamic for the whole grace group, independent of `dynamic`.
   * @attr {boolean} trill - Marks a trill start: draws the "tr" sign above the stave. Requires a staff (absent on a standalone note). The wavy line spans forward through this note's own `tie` chain — set `trill` once, not on every tied note.
   * @attr {'auto' | 'none'} trill-line - `auto` (default) draws the wavy extension line, matching standard practice; `none` suppresses it (e.g. bare sign only on an isolated, untied note-value).
   * @attr {boolean} trill-stop - Draws a vertical end-notch here instead of letting the line run to the next notehead.
   * @attr {AccidentalType} trill-accidental - Overrides only the accidental of the trilling (auxiliary) pitch — normally the diatonic upper neighbor as modified by the key signature. Never changes the letter itself. Ignored (with a warning) when `trill-note` is also set.
   * @attr {Note} trill-note - Full override of the trilling pitch (letter + accidental), rendered as a small written notehead in parentheses after the main notehead — required when the trilling pitch shares this note's own letter (a chromatic/semitone trill) or otherwise isn't the plain diatonic neighbor. Wins over `trill-accidental` when both are set.
   * @attr {'bracketed' | 'line-only'} trill-continuation - Controls a trill's line restatement after a system break, once its tie chain has carried it there. `bracketed` (default) redraws the sign in parentheses; `line-only` resumes with no restated sign. Ignored at an ordinary same-row barline (always resumes silently there). Meaningful only on the note that started the trill.
   * @attr {string} trill-finish - Comma-separated grace-note pitch(es) placed *after* this note (a trill's finishing/closing figure), e.g. `"F#,G"`. The property also accepts a `Note[]`. Always a plain unslashed notehead (no `grace-type` equivalent).
   * @attr {string} trill-finish-octave - Comma-separated octaves aligned by index with `trill-finish`; empty slots use this note's octave. The property also accepts an `(Octave | null)[]`.
   * @attr {'none' | 'to-main' | 'to-next' | 'both'} trill-finish-slur - Which slur(s) the finishing grace note(s) draw: back to this note (`to-main`, default), forward to the next note/chord (`to-next`), `both`, or `none`.
   * @attr {OctaveShiftAmount} octave-shift - Starts (or, if the same value as an already-open span, continues) an octave-transposition span at this note: `8va`/`15ma`/`22ma` shift the written pitch up, `8vb`/`15mb`/`22mb` shift it down. Requires a staff (absent on a standalone note).
   * @attr {OctaveDisplayMode} octave-mode - Set on the note that starts an octave-transposition span: `col` renders the span's label as prose ("col 8va"/"col 8va bassa" for the matching amount) instead of a bare numeral. Defaults to `sign`. Meaningless without a matching `octave-shift`.
   * @attr {boolean} octave-stop - Closes the currently open octave-transposition span at this note (inclusive).
   * @attr {boolean} loco - Closes the currently open octave-transposition span at this note, adding a "loco" label alongside the closing corner. With no open span, renders a standalone "(loco)" reminder instead.
   * @attr {'bracketed' | 'line-only'} octave-continuation - Controls an octave-transposition span's numeral restatement after a system break. `bracketed` (default) redraws it in parentheses; `line-only` resumes with no restated numeral. Ignored at an ordinary same-row barline (always resumes silently there). Meaningful only on the note that started the span.
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
        'glissando',
        'glissando-hint',
        'dynamic',
        'dynamic-shared',
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
        'trill-accidental',
        'trill-note',
        'trill-continuation',
        'trill-finish',
        'trill-finish-octave',
        'trill-finish-slur',
        'octave-shift',
        'octave-mode',
        'octave-stop',
        'loco',
        'octave-continuation',
      ];
    }

    #stemUp = true;
    #stemExtension = 0;
    #trillSignExtraLift = 0;
    #noFlags = false;
    #noStem = false;
    #renderArpeggioSign = true;
    #impliedArpeggio: ArpeggioType | null = null;
    // undefined = no override, infer accidental from the `note` suffix;
    // null = explicit override, suppress the accidental; value = explicit override, force this symbol
    #showAccidental: AccidentalType | null | undefined = undefined;
    #staffY: number | null = null;
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
      if (v === this.#stemExtension) {
        return;
      }
      this.#stemExtension = v;
      this.#scheduleRender();
    }

    get trillSignExtraLift(): number {
      return this.#trillSignExtraLift;
    }
    set trillSignExtraLift(v: number) {
      if (v === this.#trillSignExtraLift) {
        return;
      }
      this.#trillSignExtraLift = v;
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

    get glissando(): ConnectorRole | null {
      return parseConnectorRole(this.getAttribute('glissando'));
    }
    set glissando(value: ConnectorRole | null) {
      if (value === null) {
        this.removeAttribute('glissando');
      } else {
        this.setAttribute('glissando', value);
      }
    }

    get glissandoHint(): GlissandoHint | null {
      return parseGlissandoHint(this.getAttribute('glissando-hint'));
    }
    set glissandoHint(value: GlissandoHint | null) {
      if (value === null) {
        this.removeAttribute('glissando-hint');
      } else {
        this.setAttribute('glissando-hint', value);
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

    get dynamicShared(): boolean {
      return this.hasAttribute('dynamic-shared');
    }
    set dynamicShared(value: boolean) {
      if (value) {
        this.setAttribute('dynamic-shared', '');
      } else {
        this.removeAttribute('dynamic-shared');
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

    // Marks a trill start. The line spans forward through this note's own
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
    // as a small written notehead in parentheses after the main notehead.
    // Wins over trill-accidental when both are set.
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

    // Grace note(s) placed after this note (a trill's finishing figure) —
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

    // Starts an octave-transposition span at this note. The ancestor staff
    // resolves the span over its own element stream — see
    // NOTE_EVENTS.OCTAVE_ATTRIBUTE_CHANGE in attributeChangedCallback.
    get octaveShift(): OctaveShiftAmount | null {
      return parseOctaveShiftAmount(this.getAttribute('octave-shift'));
    }
    set octaveShift(value: OctaveShiftAmount | null) {
      if (value === null) {
        this.removeAttribute('octave-shift');
      } else {
        this.setAttribute('octave-shift', value);
      }
    }

    // Display mode for the span this note starts. Resolved to 'sign' at
    // span-open time by rules/octaveRules.ts, not here — see
    // parseOctaveDisplayMode.
    get octaveMode(): OctaveDisplayMode | null {
      return parseOctaveDisplayMode(this.getAttribute('octave-mode'));
    }
    set octaveMode(value: OctaveDisplayMode | null) {
      if (value === null) {
        this.removeAttribute('octave-mode');
      } else {
        this.setAttribute('octave-mode', value);
      }
    }

    get octaveStop(): boolean {
      return this.hasAttribute('octave-stop');
    }
    set octaveStop(value: boolean) {
      if (value) {
        this.setAttribute('octave-stop', '');
      } else {
        this.removeAttribute('octave-stop');
      }
    }

    get loco(): boolean {
      return this.hasAttribute('loco');
    }
    set loco(value: boolean) {
      if (value) {
        this.setAttribute('loco', '');
      } else {
        this.removeAttribute('loco');
      }
    }

    // Meaningful only on the octave-span-starting element — controls the
    // system-break restatement, resolved by the ancestor composition.
    get octaveContinuation(): OctaveContinuationMode {
      return parseOctaveContinuationMode(
        this.getAttribute('octave-continuation')
      );
    }
    set octaveContinuation(value: OctaveContinuationMode) {
      this.setAttribute('octave-continuation', value);
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

      if (
        name === 'tie' ||
        name === 'slur' ||
        name === 'lv-label' ||
        name === 'glissando' ||
        name === 'glissando-hint'
      ) {
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
        name === 'grace-dynamic' ||
        name === 'dynamic-shared'
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
            `[music-note] arpeggio-hairpin is set without a rolled arpeggio (up / up-arrow / down); it will not render`
          );
        }
      }

      if (
        name === 'trill' ||
        name === 'trill-line' ||
        name === 'trill-stop' ||
        name === 'trill-accidental' ||
        name === 'trill-continuation'
      ) {
        // The ancestor staff resolves the trill line span (walking this
        // element's own tie chain), re-resolves the key-signature-aware
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
            `[music-note] trill-accidental is ignored when trill-note is also set`
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
        name === 'octave-shift' ||
        name === 'octave-mode' ||
        name === 'octave-stop' ||
        name === 'loco' ||
        name === 'octave-continuation'
      ) {
        // The ancestor staff resolves octave-transposition spans over its
        // own element stream and redraws the sign/line/corner in its own
        // overlay — nothing renders locally in this note's own shadow DOM.
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.OCTAVE_ATTRIBUTE_CHANGE, {
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
        // arpeggio/grace changes the element's leftward footprint, and
        // trill-note/trill-finish the rightward one, the same way: the staff
        // re-runs its layout pass on NOTE_Y_CHANGE, and standalone we
        // re-render here. `arpeggio-for` reserves the same footprint for the
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
            `[music-note] trill-accidental is ignored when trill-note is also set`
          );
        }
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
        arpeggioHairpin: this.#renderArpeggioSign
          ? this.#effectiveArpeggioHairpin()
          : null,
        arpeggioHairpinFrom: this.arpeggioHairpinFrom,
        arpeggioHairpinTo: this.arpeggioHairpinTo,
        trill: this.trill,
        // A written trilling note (small notehead after the main note,
        // drawn by the staff overlay) carries its own accidental — the sign
        // itself shows one only for the accidental-only override form.
        trillAccidental:
          this.#resolvedTrillPitch?.written === false
            ? this.#resolvedTrillPitch.accidental
            : null,
        staffY: this.#staffY,
        trillSignExtraLift: this.#trillSignExtraLift,
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
      this.#appendTrillFinishNotes(noteSvg);

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
      const arpeggioFootprint =
        computeArpeggioFootprintWidth(
          this.arpeggio ?? this.#impliedArpeggio,
          accidental !== undefined
        ) +
        computeArpeggioHairpinFootprintWidth(
          this.#effectiveArpeggioHairpin(),
          this.arpeggioHairpinFrom,
          this.arpeggioHairpinTo
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

    // Renders the finishing grace note(s) and, when requested, the
    // self-contained "to-main" slur. A 'to-next'/'both' slur reaches a
    // sibling element this note doesn't know about, so the ancestor staff
    // draws that half itself (see staffClassicalBase.ts).
    #appendTrillFinishNotes(noteSvg: SVGElement): void {
      const trillFinishLetters = this.trillFinish;
      if (trillFinishLetters === null) {
        return;
      }

      const trillFinishNotes = buildGraceNoteDescriptors(
        trillFinishLetters,
        this.trillFinishOctave ?? [],
        this.note[0] as NoteLetter,
        this.octave ?? 4
      );
      applyResolvedGraceAccidentals(
        trillFinishNotes,
        this.#resolvedTrillFinishAccidentals
      );

      const { cx, cy } = noteHeadCenter(
        this.#stemUp,
        this.duration,
        this.#noFlags
      );
      const { element } = createTrillFinishNotesSvg({
        trillFinishNotes,
        trillFinishSlur: this.trillFinishSlur,
        mainHeadCenterXPx: cx * NOTE_SCALE,
        mainHeadCenterYPx: cy * NOTE_SCALE,
        anchorLeftXPx: NOTE_SVG_WIDTH + GRACE_MAIN_GAP_PX,
        mainStaffY: this.#staffY,
      });
      noteSvg.setAttribute('overflow', 'visible');
      noteSvg.appendChild(element);
    }
  }

  if (!customElements.get(MUSIC_NOTE)) {
    customElements.define(MUSIC_NOTE, NoteElement);
  }
}
