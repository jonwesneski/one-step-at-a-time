import { pitchAccidental } from '../rules/accidentalRules';
import { parseBendContour } from '../rules/bendContourRules';
import { slurStyleWarning } from '../rules/connectorPlacementRules';
import { swellAttributeWarning } from '../rules/dynamicsRules';
import { resolveGlissandoLabel } from '../rules/glissandoLabelRules';
import {
  bendConsistencyWarning,
  glissandoShapeWarning,
  resolveBend,
  type ResolvedBend,
} from '../rules/glissandoRules';
import {
  applyGraceHeadOverhangs,
  applyResolvedGraceAccidentals,
  buildGraceNoteDescriptors,
  GraceNoteDescriptor,
} from '../rules/graceRules';
import {
  resolveChordToneNoteheads,
  triangleUnsupportedWarning,
} from '../rules/noteheadRules';
import { parsePhonemes, phonemesWarning } from '../rules/phonemeRules';
import { textAttributeWarning } from '../rules/techniqueTextRules';
import { durationToDotCount } from '../rules/theoryConsts';
import { generateYCoordinates, getChordNotes } from '../rules/theoryHelpers';
import {
  articulationRepeatCount,
  drawnTremoloTuplet,
  resolveStrokeCount,
  STAFF_BAND,
  tremoloConsistencyWarnings,
  unbeamedTremoloStemExtensionPx,
} from '../rules/tremoloRules';
import type { ResolvedTrillPitch } from '../rules/trillRules';
import type {
  ChordNote,
  ConnectorRole,
  GraceArticulationsType,
  GraceNoteheadsType,
  GraceNotesType,
  GraceOctavesType,
  GraceQuarterTonesType,
  IChordElement,
  NoteElementType,
  NoteLetterOctave,
  TieValue,
} from '../types/elements';
import type {
  AccidentalReminder,
  AccidentalType,
  ArpeggioType,
  ArticulationType,
  BendShape,
  BreathMark,
  Chord,
  ConventionalAccidentalType,
  DurationType,
  DynamicMarking,
  GlissandoHint,
  GlissandoShape,
  GraceDuration,
  GraceSlur,
  GraceType,
  HairpinKind,
  HairpinRole,
  Note,
  NoteheadType,
  NoteLetter,
  Octave,
  OctaveContinuationMode,
  OctaveDisplayMode,
  OctaveShiftAmount,
  QuarterTone,
  SlurStyle,
  StemDirection,
  StemMark,
  StressType,
  SwellShape,
  TextPlacement,
  TextStyle,
  TieStyle,
  TremoloLabel,
  TremoloValue,
  TrillContinuationMode,
  TrillFinishSlur,
  TrillLineMode,
  UnpitchedPlacement,
} from '../types/theory';
import {
  addLedgerLines,
  createChordSvg,
  createSempreArpeggiandoText,
  graceHeadLeftOverhangsPx,
  graceListToAttr,
  NOTE_HEAD_Y_OFFSET_CORRECTION,
  NOTE_SCALE,
  noteHeadGeometry,
  parseAccidentalType,
  parseArpeggio,
  parseArticulation,
  parseBendShape,
  parseBreathMark,
  parseConnectorRole,
  parseDynamicMarking,
  parseGlissandoHint,
  parseGlissandoShape,
  parseGraceArticulations,
  parseGraceDuration,
  parseGraceNoteheads,
  parseGraceNotes,
  parseGraceOctaves,
  parseGraceQuarterTones,
  parseGraceSlur,
  parseGraceType,
  parseHairpinKind,
  parseNote,
  parseNotehead,
  parseOctaveContinuationMode,
  parseOctaveDisplayMode,
  parseOctaveShiftAmount,
  parseQuarterTone,
  parseSlurStyle,
  parseStemDirection,
  parseStress,
  parseSwellShape,
  parseTieStyle,
  parseTieValue,
  parseTremolo,
  parseTremoloLabel,
  parseTremoloTuplet,
  parseTrillContinuationMode,
  parseTrillFinishSlur,
  parseTrillLineMode,
} from '../utils';
import {
  CHORD_EVENTS,
  isStaffNodeName,
  MUSIC_CHORD,
  MUSIC_NOTE,
  MUSIC_TREMOLO_NODE,
  NOTE_EVENTS,
  STAFF_TAGS,
  SVG_NS,
  TREMOLO_LABELS,
} from '../utils/consts';
import { MaybeHTMLElement } from '../utils/maybeHTMLElement';
import {
  MIDDLE_STAFF_Y,
  STAFF_TRANSCRIPTION_HEIGHT,
  STAFF_Y_PADDING,
} from '../utils/notationDimensions';
import {
  parseAccidentalReminder,
  parseDuration,
  parseStemMark,
  parseTextPlacement,
  parseTextStyle,
  warnIfInvalidDuration,
} from '../utils/parsers';
import type { LedgerHeadExtent } from '../utils/svgCreator';
import {
  chordAugmentationDotLayout,
  chordHeadExtentPx,
  chordHeadLeftOverhangPx,
  chordToneHeadExtentPx,
} from '../utils/svgCreator/chord';
import { techniqueTextLabel } from '../utils/svgCreator/techniqueLabel';
import { upgradeShadowedProperties } from '../utils/upgradeShadowedProperties';

/**
 * A chord: several noteheads sharing one stem. Supply the notes either as a
 * chord name via the `chord` attribute (e.g. `Cmaj7`) or as slotted
 * `<music-note>` children. Supports the same articulations, dynamics, hairpins,
 * ties/slurs and grace notes as `<music-note>`. Renders standalone or spaced
 * and beamed inside a `<music-staff>`.
 *
 * @customElement music-chord
 * @attr {Chord} chord - Chord name resolved into constituent pitches, e.g. `C`, `Am`, `Cmaj7`, `G/B`.
 * @attr {DurationType} duration - Note value for the chord, optionally dotted (`dotted-half`); every notehead takes the chord's dots. Defaults to `quarter`.
 * @attr {'start' | 'continue' | 'end' | 'laissez-vibrer'} tie - Start or end of a tie, `continue` for the middle of a tie chain (tied into and on to the next), or `laissez-vibrer` (alias `lv`) for an open-ended "let ring" tie.
 * @attr {boolean} lv-label - Draw an `l.v.` label on a `tie="laissez-vibrer"` tie.
 * @attr {'start' | 'end'} slur - Marks this chord as the start or end of a slur.
 * @attr {'start' | 'end'} glissando - Marks this chord as the start or end of a glissando or pitch bend: a line between two pitches, beside their noteheads.
 * @attr {'white-key' | 'black-key' | 'gliss'} glissando-hint - Text above the line of a `glissando="start"`: which keys it slides across ("white-note gliss." / "black-note gliss."), or plain "gliss.".
 * @attr {'straight' | 'dip' | 'wave'} glissando-shape - Contour of the line a `glissando="start"` draws: `dip` sinks a little and returns, `wave` oscillates. Defaults to `straight`.
 * @attr {string} glissando-label - Text above the stave over this chord: `gliss` ("gliss.", for a passage with no line), `quasi-gliss` ("quasi gliss."), `chrom` / `chromatic` (above the first grace note when there are grace notes), `lip`, `bend`, or any other text drawn as written, `|` starting a new line. It shifts left rather than run past the bar.
 * @attr {string} technique-text - Technique text over the chord, `|` starting a new line (see `<music-note>`).
 * @attr {TextPlacement} technique-text-placement - `below` draws the technique text under the stave. Defaults to `above`.
 * @attr {TextStyle} technique-text-style - `italic` sets the technique text in italics. Defaults to `normal`.
 * @attr {string} dynamic-text - Italic text straight after the dynamic, on its baseline. Needs `dynamic`.
 * @attr {'up' | 'down' | 'dip' | 'wave'} bend - A pitch bend: a line after each of this chord's heads, ending inside its own duration. A slotted note's own `bend` / `bend-to` replaces it for that tone. Ignored, with a warning, beside `glissando="start"` and on a `<music-tremolo>` member.
 * @attr {Note} bend-to - Notes only, slotted ones included: ignored, with a warning, on a chord.
 * @attr {string} bend-contour - Slotted notes only, one line a tone: ignored, with a warning, on a chord.
 * @attr {QuarterTone} bend-to-quarter-tone - Applies to `bend-to`.
 * @attr {string} for - `id` of the matching start element, to disambiguate interleaved same-kind ties/slurs/glissandi.
 * @attr {DynamicMarking} dynamic - Dynamic marking under the chord.
 * @attr {SwellShape} swell - A swell under this chord over its tie chain (just its own value when untied): bare or `both` draws `< >`, louder to the middle and softer after it; `crescendo` or `diminuendo` draws that wedge alone. On a chord tied into, it covers the rest of the chain; with swells on two chords of one chain, the earlier wins. Inside a `<music-composition>` it crosses barlines and system breaks. A hairpin starting, ending or running over any chord of the chain wins.
 * @attr {string} phonemes - Vowels or phonemes to form while the chord sounds, below the stave in square brackets: `,` separates them (`i,u`), `>` (or `→`) joins them with an arrow (`oo>ah`), and a trailing `>` leads to the next note's first phoneme, over a barline too. The first stands under the head; with an arrow out they are spaced evenly toward the next phoneme, else the last ends with the chord's value.
 * @attr {DynamicMarking} dynamic-end - A second dynamic at the end of the chord's span (its tie chain's, with `swell`), just before the next entry or the barline. A `swell` ends before it.
 * @attr {boolean} dynamic-shared - Marks `dynamic`, and any hairpin this chord starts, as applying to both hands: the ancestor `<music-measure>` draws them centered in the gap between this staff and its next/previous sibling staff, clear of any beam, instead of at this staff's own local placement. The hairpin may end on either staff. Requires a `<music-measure>` ancestor with an adjacent staff; on a lone staff the marking is not drawn and the hairpin keeps the staff's own placement.
 * @attr {boolean} dynamic-reminder - Draws `dynamic` in brackets, "(f)", as a reminder, e.g. at the start of a repeated section. Needs `dynamic`.
 * @attr {AccidentalReminder} accidental-reminder - Shows every tone's accidental already in force as a reminder: bare or `bracketed` in parentheses, `plain` without. A slotted `<music-note>`'s own `accidental-reminder` marks just that tone, and its own `unpitched` makes that tone unpitched.
 * @attr {StemMark} stem-mark - `cross` draws a small × through the stem, near its end (see `<music-note>`).
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
 * @attr {string} grace-quarter-tone - Comma-separated quarter-tones (`up` / `down`) aligned by index with `grace`, e.g. `"up,,down"`; an empty slot is an ordinary pitch. The property also accepts a `(QuarterTone | null)[]`.
 * @attr {string} grace-articulation - Comma-separated per-grace articulation aligned by index with `grace`. The property also accepts an `(ArticulationType | null)[]`.
 * @attr {'acciaccatura' | 'appoggiatura' | 'trill'} grace-type - Grace-note style. `trill` is a plain unslashed notehead (unlike `acciaccatura`'s crossed-through slash), for a leading grace note that introduces a trill. Defaults to `acciaccatura`.
 * @attr {GraceDuration} grace-duration - Note value drawn for the grace notes.
 * @attr {'auto' | 'none'} grace-slur - Whether to draw the slur from the grace group to the chord. Defaults to `auto`.
 * @attr {DynamicMarking} grace-dynamic - A single dynamic for the whole grace group.
 * @attr {boolean} trill - Marks a trill start: draws the "tr" sign above the stave. Requires a staff (absent on a standalone chord). The wavy line spans forward through this chord's own `tie` chain — set `trill` once, not on every tied chord.
 * @attr {'auto' | 'none'} trill-line - `auto` (default) draws the wavy extension line, matching standard practice; `none` suppresses it (e.g. bare sign only on an isolated, untied note-value).
 * @attr {boolean} trill-stop - Draws a vertical end-notch here instead of letting the line run to the next notehead.
 * @attr {ConventionalAccidentalType} trill-accidental - Overrides only the accidental of the trilling (auxiliary) pitch — normally the diatonic upper neighbor as modified by the key signature (the chord's topmost note). Never changes the letter itself. Ignored (with a warning) when `trill-note` is also set.
 * @attr {Note} trill-note - Full override of the trilling pitch (letter + accidental), rendered as a small written notehead in parentheses after the chord's own notehead column — required when the trilling pitch shares the reference note's own letter (a chromatic/semitone trill) or otherwise isn't the plain diatonic neighbor. Wins over `trill-accidental` when both are set.
 * @attr {QuarterTone} trill-quarter-tone - `up` / `down`: raises or lowers the trilling pitch by a quarter-tone, whether it comes from `trill-note`, `trill-accidental` or the diatonic neighbor.
 * @attr {'bracketed' | 'line-only'} trill-continuation - Controls a trill's line restatement after a system break, once its tie chain has carried it there. `bracketed` (default) redraws the sign in parentheses; `line-only` resumes with no restated sign. Ignored at an ordinary same-row barline (always resumes silently there). Meaningful only on the chord that started the trill.
 * @attr {string} trill-finish - Comma-separated grace-note pitch(es) placed *after* this chord (a trill's finishing/closing figure), e.g. `"F#,G"`. The property also accepts a `Note[]`. Always a plain unslashed notehead (no `grace-type` equivalent).
 * @attr {string} trill-finish-octave - Comma-separated octaves aligned by index with `trill-finish`; empty slots use this chord's reference octave. The property also accepts an `(Octave | null)[]`.
 * @attr {string} trill-finish-quarter-tone - Comma-separated quarter-tones aligned by index with `trill-finish`, as `grace-quarter-tone`.
 * @attr {'none' | 'to-main' | 'to-next' | 'both'} trill-finish-slur - Which slur(s) the finishing grace note(s) draw: back to this chord (`to-main`, default), forward to the next note/chord (`to-next`), `both`, or `none`.
 * @attr {OctaveShiftAmount} octave-shift - Starts (or, if the same value as an already-open span, continues) an octave-transposition span at this chord: `8va`/`15ma`/`22ma` shift the written pitch up, `8vb`/`15mb`/`22mb` shift it down. Requires a staff (absent on a standalone chord).
 * @attr {OctaveDisplayMode} octave-mode - Set on the chord that starts an octave-transposition span: `col` renders the span's label as prose ("col 8va"/"col 8va bassa" for the matching amount) instead of a bare numeral. Defaults to `sign`. Meaningless without a matching `octave-shift`.
 * @attr {boolean} octave-stop - Closes the currently open octave-transposition span at this chord (inclusive).
 * @attr {boolean} loco - Closes the currently open octave-transposition span at this chord, adding a "loco" label alongside the closing corner. With no open span, renders a standalone "(loco)" reminder instead.
 * @attr {'bracketed' | 'line-only'} octave-continuation - Controls an octave-transposition span's numeral restatement after a system break. `bracketed` (default) redraws it in parentheses; `line-only` resumes with no restated numeral. Ignored at an ordinary same-row barline (always resumes silently there). Meaningful only on the chord that started the span.
 * @attr {string} beam-group - `id` shared by every note/chord/rest across a measure's two adjacent grand-staff staves that joins one cross-staff double-stemmed beam group. Requires a `<music-measure>` ancestor with an adjacent staff (absent on a standalone chord).
 * @attr {string} shared-stem-for - `id` of the other-staff note/chord this one shares a single stem with (both hands occasionally playing the same beat simultaneously in otherwise single-part writing). Requires a `<music-measure>` ancestor with an adjacent staff (absent on a standalone chord).
 * @attr {string} slur-group - `id` shared by every breakpoint note/chord of one continuous multi-leg cross-staff phrase slur (only the first/last note of each leg — never the notes still covered by their own staff's ordinary beam); consecutive members, ordered by real rendered position, are each connected by their own slur curve. Requires a `<music-measure>` or `<music-composition>` ancestor (absent on a standalone chord).
 * @attr {NoteheadType} notehead - Notehead shape for every tone: `normal` (default), `x`, `diamond`, or `diamond-white` (see `<music-note>`). A slotted `<music-note>`'s own `notehead` overrides it for that tone — e.g. an artificial harmonic: a normal stopped note plus a `diamond-white` ("harmonic") touched note. `triangle-up` / `triangle-down` are not supported on chords (a normal head is drawn, with a warning).
 * @attr {string} grace-notehead - Comma-separated `NoteheadType` per grace note, aligned by index with `grace`; empty slots are `normal`. The property also accepts a `(NoteheadType | null)[]`.
 * @attr {TremoloValue} tremolo - Single-note tremolo: `1`–`4` strokes through the stem (each stroke halves the repeated value, on top of the chord's own tails or beams), or `unmeasured` for the standard unmeasured indication (three beams' worth, counting the chord's own). A semibreve chord takes them above or below its heads. The stem lengthens to carry them. Ignored on a `<music-tremolo>` member.
 * @attr {number} tremolo-tuplet - Tuplet numeral for a measured tremolo, drawn beyond the stem's end: the number of notes the chord stands for (`3`, `5`, `6`, …). Needs a `tremolo` stroke count.
 * @attr {TremoloLabel} tremolo-label - Technique label above the stave: `trem` ("trem.") marks the start of an unmeasured tremolo passage, `non-trem` ("non trem.") the first measured or plain note after one; `flz` / `flt` / `frull` mark a flutter-tongued single-note tremolo and run on over later tremolos until `ord` / `nat` / `norm` ("ord.") or another label, which goes on the ordinary note a flutter-tongued tie runs into.
 * @attr {BreathMark} breath-mark - A breath after this chord: `tick` (✓, a break in the sound) or `comma` (a short pause or lift). Drawn above the stave in the gap before the next entry; standalone, just after the chord.
 * @attr {boolean} articulation-repeat - Draws the articulation's length mark (staccato, staccatissimo, tenuto, portato, tenuto-staccatissimo) once per repetition of a measured tremolo, in a row centred on the head; a row of more than 32 draws the mark once. Accents, fermatas and stress marks stay single.
 * @attr {TieStyle} tie-style - `dotted` draws the tie this chord starts as a dotted line, as some editions do for unmeasured tremolos; the tied-in chord then repeats its accidental across a barline. Defaults to `solid`.
 * @attr {SlurStyle} slur-style - `dotted` draws the slur this chord starts as a dotted line, to mark phrase structure apart from a legato slur. Defaults to `solid`.
 * @attr {StemDirection} stem-direction - Forces this chord's stem direction (`up`/`down`), overriding the pitch-driven default. Unset (default) leaves the pitch, voice or beam-group default. On a beamed note, it applies to every note of that same-staff beam, since one beam has one stem direction; if notes of one beam force different directions, the first wins and a warning is logged.
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
export class ChordElement extends MaybeHTMLElement implements IChordElement {
  static get observedAttributes(): string[] {
    return [
      'chord',
      'duration',
      'for',
      'tie',
      'lv-label',
      'slur',
      'glissando',
      'glissando-hint',
      'glissando-shape',
      'glissando-label',
      'technique-text',
      'technique-text-placement',
      'technique-text-style',
      'dynamic-text',
      'dynamic-end',
      'bend',
      'bend-to',
      'bend-to-quarter-tone',
      'bend-contour',
      'dynamic',
      'dynamic-shared',
      'dynamic-reminder',
      'accidental-reminder',
      'stem-mark',
      'quarter-tone',
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
      'grace-quarter-tone',
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
      'trill-quarter-tone',
      'trill-continuation',
      'trill-finish',
      'trill-finish-octave',
      'trill-finish-quarter-tone',
      'trill-finish-slur',
      'octave-shift',
      'octave-mode',
      'octave-stop',
      'loco',
      'octave-continuation',
      'beam-group',
      'shared-stem-for',
      'slur-group',
      'stem-direction',
      'notehead',
      'grace-notehead',
      'tremolo',
      'tremolo-tuplet',
      'tremolo-label',
      'articulation-repeat',
      'tie-style',
      'slur-style',
      'breath-mark',
      'swell',
      'phonemes',
    ];
  }

  static readonly #standaloneYCoordinates = generateYCoordinates('C6', 'C4');
  static readonly #standaloneOctaves: Octave[] = [4, 5, 6];

  #stemUp = true;
  #stemExtension = 0;
  #dottedTieAcrossBarline = false;
  #trillSignExtraLift = 0;
  #articulationStemAnchorBeamLevels: number | null = null;
  #augmentationDotRows: number[] | null = null;
  #noFlags = false;
  #noStem = false;
  #renderArpeggioSign = true;
  #impliedArpeggio: ArpeggioType | null = null;
  #staffYCoordinates: number[] | null = null;
  #noteAccidentals: (AccidentalType | null | undefined)[] = [];
  #noteAccidentalsParenthesized: boolean[] = [];
  #resolvedGraceAccidentals: (AccidentalType | null)[] | null = null;
  #resolvedTrillFinishAccidentals: (AccidentalType | null)[] | null = null;
  #resolvedTrillPitch: ResolvedTrillPitch | null = null;
  #batchDepth = 0;
  #renderPending = false;
  #childObserver: MutationObserver | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  // Every read of this element's own attributes goes through these, so a
  // subclass can withhold attributes it doesn't support.
  protected readAttribute(name: string): string | null {
    return this.getAttribute(name);
  }

  protected readsAttribute(name: string): boolean {
    return this.hasAttribute(name);
  }

  // Tag of the child notes this chord stacks.
  protected get childNoteTag(): string {
    return MUSIC_NOTE;
  }

  get duration(): DurationType {
    return parseDuration(this.readAttribute('duration')) ?? 'quarter';
  }

  set duration(value: DurationType) {
    this.setAttribute('duration', value);
  }

  get chord(): Chord | null {
    return this.readAttribute('chord') as Chord | null;
  }

  set chord(value: Chord | null) {
    if (value === null) {
      this.removeAttribute('chord');
    } else {
      this.setAttribute('chord', value);
    }
  }

  get notes(): ChordNote[] {
    const noteElements: NodeListOf<NoteElementType> = this.querySelectorAll(
      this.childNoteTag
    );
    const notes: ChordNote[] = [];
    if (noteElements.length) {
      noteElements.forEach((node) => {
        // From parsed markup the chord connects before its notes upgrade.
        customElements.upgrade(node);
        notes.push({ value: node.note, octave: node.octave });
      });
    } else if (this.chord) {
      const chordNotes = getChordNotes(this.chord);
      this.#warnAboutUnsupportedChord(chordNotes === null);
      chordNotes?.forEach((value) => {
        notes.push({ value, octave: null });
      });
    }
    return notes;
  }

  #warnedUnsupportedChord: string | null = null;

  // `notes` is read many times per pass, so warn once per bad value.
  #warnAboutUnsupportedChord(unsupported: boolean): void {
    const chord = unsupported ? this.chord : null;
    if (chord !== null && chord !== this.#warnedUnsupportedChord) {
      console.warn(`[music-chord] unsupported chord symbol "${chord}"`);
    }
    this.#warnedUnsupportedChord = chord;
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

  get articulationStemAnchorBeamLevels(): number | null {
    return this.#articulationStemAnchorBeamLevels;
  }
  set articulationStemAnchorBeamLevels(v: number | null) {
    if (v === this.#articulationStemAnchorBeamLevels) {
      return;
    }
    this.#articulationStemAnchorBeamLevels = v;
    this.#scheduleRender();
  }

  get augmentationDotRows(): number[] | null {
    return this.#augmentationDotRows;
  }
  set augmentationDotRows(v: number[] | null) {
    const current = this.#augmentationDotRows;
    if (
      v === current ||
      (v !== null &&
        current !== null &&
        v.length === current.length &&
        v.every((row, i) => row === current[i]))
    ) {
      return;
    }
    this.#augmentationDotRows = v;
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

  get noteAccidentalsParenthesized(): boolean[] {
    return this.#noteAccidentalsParenthesized;
  }
  set noteAccidentalsParenthesized(v: boolean[]) {
    this.#noteAccidentalsParenthesized = v;
    this.#scheduleRender();
  }

  // Per tone, in `notes` order: the chord's own `accidental-reminder`, or
  // a slotted <music-note>'s.
  get toneAccidentalReminders(): (AccidentalReminder | null)[] {
    const chordReminder = this.accidentalReminder;
    const noteElements = Array.from(this.querySelectorAll(this.childNoteTag));
    return this.notes.map(
      (_, i) =>
        (noteElements[i] as NoteElementType | undefined)?.accidentalReminder ??
        chordReminder
    );
  }

  // Per tone, in `notes` order: a slotted <music-note>'s own `unpitched`.
  get toneUnpitched(): (UnpitchedPlacement | null)[] {
    const noteElements = Array.from(this.querySelectorAll(this.childNoteTag));
    return this.notes.map(
      (_, i) =>
        (noteElements[i] as NoteElementType | undefined)?.unpitched ?? null
    );
  }

  get toneQuarterTones(): (QuarterTone | null)[] {
    const noteElements: NoteElementType[] = Array.from(
      this.querySelectorAll(this.childNoteTag)
    );
    return this.notes.map((_, i) => noteElements[i]?.quarterTone ?? null);
  }

  // Per tone: a slotted note's own bend, else the chord's. A tone that starts
  // a glissando draws that line instead.
  get toneBends(): (ResolvedBend | null)[] {
    const noteElements: NoteElementType[] = Array.from(
      this.querySelectorAll(this.childNoteTag)
    );
    return this.notes.map(({ value, octave }, i) => {
      const tone: NoteElementType | undefined = noteElements[i];
      if (tone?.glissando === 'start') {
        return null;
      }
      const bend = tone?.bend ?? null;
      const bendTo = tone?.bendTo ?? null;
      const contour = parseBendContour(tone?.bendContour ?? null);
      return bend === null && bendTo === null && contour === null
        ? this.bend && { shape: this.bend, target: null }
        : resolveBend(
            bend,
            bendTo,
            tone.bendToQuarterTone,
            value,
            octave ?? 4,
            tone.quarterTone,
            contour
          );
    });
  }

  get tie(): TieValue | null {
    return parseTieValue(this.readAttribute('tie'));
  }
  set tie(value: TieValue | null) {
    if (value === null) {
      this.removeAttribute('tie');
    } else {
      this.setAttribute('tie', value);
    }
  }

  get lvLabel(): boolean {
    return this.readsAttribute('lv-label');
  }
  set lvLabel(value: boolean) {
    if (value) {
      this.setAttribute('lv-label', '');
    } else {
      this.removeAttribute('lv-label');
    }
  }

  get slur(): ConnectorRole | null {
    return parseConnectorRole(this.readAttribute('slur'));
  }
  set slur(value: ConnectorRole | null) {
    if (value === null) {
      this.removeAttribute('slur');
    } else {
      this.setAttribute('slur', value);
    }
  }

  get glissando(): ConnectorRole | null {
    return parseConnectorRole(this.readAttribute('glissando'));
  }
  set glissando(value: ConnectorRole | null) {
    if (value === null) {
      this.removeAttribute('glissando');
    } else {
      this.setAttribute('glissando', value);
    }
  }

  get glissandoHint(): GlissandoHint | null {
    return parseGlissandoHint(this.readAttribute('glissando-hint'));
  }
  set glissandoHint(value: GlissandoHint | null) {
    if (value === null) {
      this.removeAttribute('glissando-hint');
    } else {
      this.setAttribute('glissando-hint', value);
    }
  }

  get glissandoShape(): GlissandoShape {
    return parseGlissandoShape(this.readAttribute('glissando-shape'));
  }
  set glissandoShape(value: GlissandoShape) {
    if (value === 'straight') {
      this.removeAttribute('glissando-shape');
    } else {
      this.setAttribute('glissando-shape', value);
    }
  }

  get glissandoLabel(): string | null {
    return this.readAttribute('glissando-label');
  }
  set glissandoLabel(value: string | null) {
    if (value === null) {
      this.removeAttribute('glissando-label');
    } else {
      this.setAttribute('glissando-label', value);
    }
  }

  get techniqueText(): string | null {
    return this.readAttribute('technique-text');
  }
  set techniqueText(value: string | null) {
    if (value === null) {
      this.removeAttribute('technique-text');
    } else {
      this.setAttribute('technique-text', value);
    }
  }

  get techniqueTextPlacement(): TextPlacement {
    return (
      parseTextPlacement(this.readAttribute('technique-text-placement')) ??
      'above'
    );
  }
  set techniqueTextPlacement(value: TextPlacement) {
    this.setAttribute('technique-text-placement', value);
  }

  get techniqueTextStyle(): TextStyle {
    return (
      parseTextStyle(this.readAttribute('technique-text-style')) ?? 'normal'
    );
  }
  set techniqueTextStyle(value: TextStyle) {
    this.setAttribute('technique-text-style', value);
  }

  get dynamicText(): string | null {
    const value = this.readAttribute('dynamic-text')?.trim() ?? '';
    return value === '' ? null : value;
  }
  set dynamicText(value: string | null) {
    if (value === null) {
      this.removeAttribute('dynamic-text');
    } else {
      this.setAttribute('dynamic-text', value);
    }
  }

  get bend(): BendShape | null {
    return parseBendShape(this.readAttribute('bend'));
  }
  set bend(value: BendShape | null) {
    if (value === null) {
      this.removeAttribute('bend');
    } else {
      this.setAttribute('bend', value);
    }
  }

  get bendTo(): Note | null {
    return parseNote(this.readAttribute('bend-to'));
  }
  set bendTo(value: Note | null) {
    if (value === null) {
      this.removeAttribute('bend-to');
    } else {
      this.setAttribute('bend-to', value);
    }
  }

  get bendToQuarterTone(): QuarterTone | null {
    return parseQuarterTone(this.readAttribute('bend-to-quarter-tone'));
  }
  set bendToQuarterTone(value: QuarterTone | null) {
    if (value === null) {
      this.removeAttribute('bend-to-quarter-tone');
    } else {
      this.setAttribute('bend-to-quarter-tone', value);
    }
  }

  get dynamic(): DynamicMarking | null {
    return parseDynamicMarking(this.readAttribute('dynamic'));
  }
  set dynamic(value: DynamicMarking | null) {
    if (value === null) {
      this.removeAttribute('dynamic');
    } else {
      this.setAttribute('dynamic', value);
    }
  }

  get dynamicShared(): boolean {
    return this.readsAttribute('dynamic-shared');
  }
  set dynamicShared(value: boolean) {
    if (value) {
      this.setAttribute('dynamic-shared', '');
    } else {
      this.removeAttribute('dynamic-shared');
    }
  }

  get dynamicReminder(): boolean {
    return this.readsAttribute('dynamic-reminder');
  }
  set dynamicReminder(value: boolean) {
    this.toggleAttribute('dynamic-reminder', value);
  }

  get accidentalReminder(): AccidentalReminder | null {
    return parseAccidentalReminder(this.readAttribute('accidental-reminder'));
  }
  set accidentalReminder(value: AccidentalReminder | boolean | null) {
    if (value === null || value === false) {
      this.removeAttribute('accidental-reminder');
    } else {
      this.setAttribute(
        'accidental-reminder',
        value === true || value === 'bracketed' ? '' : value
      );
    }
  }

  get stemMark(): StemMark | null {
    return parseStemMark(this.readAttribute('stem-mark'));
  }
  set stemMark(value: StemMark | null) {
    if (value === null) {
      this.removeAttribute('stem-mark');
    } else {
      this.setAttribute('stem-mark', value);
    }
  }

  get crescendo(): HairpinRole | null {
    return parseConnectorRole(this.readAttribute('crescendo'));
  }
  set crescendo(value: HairpinRole | null) {
    if (value === null) {
      this.removeAttribute('crescendo');
    } else {
      this.setAttribute('crescendo', value);
    }
  }

  get decrescendo(): HairpinRole | null {
    return parseConnectorRole(this.readAttribute('decrescendo'));
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
    return parseArticulation(this.readAttribute('articulation'));
  }
  set articulation(value: ArticulationType | null) {
    if (value === null) {
      this.removeAttribute('articulation');
    } else {
      this.setAttribute('articulation', value);
    }
  }

  get stress(): StressType | null {
    return parseStress(this.readAttribute('stress'));
  }
  set stress(value: StressType | null) {
    if (value === null) {
      this.removeAttribute('stress');
    } else {
      this.setAttribute('stress', value);
    }
  }

  get arpeggio(): ArpeggioType | null {
    return parseArpeggio(this.readAttribute('arpeggio'));
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
    return this.readAttribute('arpeggio-for');
  }
  set arpeggioFor(value: string | null) {
    if (value === null) {
      this.removeAttribute('arpeggio-for');
    } else {
      this.setAttribute('arpeggio-for', value);
    }
  }

  // `id` shared by every element across a measure's two adjacent grand-staff
  // staves that joins one cross-staff double-stemmed beam group. Resolved
  // by the ancestor <music-measure>.
  // Ignored on a <music-tremolo> member, which its own tremolo beams.
  get beamGroup(): string | null {
    return this.parentElement?.nodeName === MUSIC_TREMOLO_NODE
      ? null
      : this.readAttribute('beam-group');
  }
  set beamGroup(value: string | null) {
    if (value === null) {
      this.removeAttribute('beam-group');
    } else {
      this.setAttribute('beam-group', value);
    }
  }

  // `id` shared by every breakpoint note/chord of one continuous
  // multi-leg cross-staff phrase slur. Resolved by the ancestor
  // <music-measure> / <music-composition>.
  get slurGroup(): string | null {
    return this.readAttribute('slur-group');
  }
  set slurGroup(value: string | null) {
    if (value === null) {
      this.removeAttribute('slur-group');
    } else {
      this.setAttribute('slur-group', value);
    }
  }

  get notehead(): NoteheadType {
    return parseNotehead(this.readAttribute('notehead')) ?? 'normal';
  }
  set notehead(value: NoteheadType | null) {
    if (value === null) {
      this.removeAttribute('notehead');
    } else {
      this.setAttribute('notehead', value);
    }
  }

  get headLeftOverhangPx(): number {
    return chordHeadLeftOverhangPx({
      duration: this.duration,
      staffYCoordinates: this.#resolvedStaffYCoordinates(),
      stemUp: this.#stemUp,
      noFlags: this.#noFlags,
      noteheads: this.toneNoteheads,
    });
  }

  #resolvedStaffYCoordinates(): number[] {
    return (
      this.#staffYCoordinates ??
      (this.notes.length > 0 ? this.#resolveStandaloneYCoordinates() : [])
    );
  }

  get augmentationDotsRightEdgePx(): number | null {
    const staffYCoordinates = this.#resolvedStaffYCoordinates();
    return (
      chordAugmentationDotLayout({
        duration: this.duration,
        staffYCoordinates,
        stemUp: this.#stemUp,
        noFlags: this.#noFlags,
        noStem: this.#noStem,
        noteheads: this.toneNoteheads,
        stemExtension: this.#stemExtension,
        rowStaffYs: this.#augmentationDotRows,
      })?.rightEdgeX ?? null
    );
  }

  // Per tone, in `notes` order: a slotted <music-note>'s own notehead, else
  // this chord's.
  get toneNoteheads(): NoteheadType[] {
    const noteElements: NoteElementType[] = Array.from(
      this.querySelectorAll(this.childNoteTag)
    );
    const toneNoteheads =
      noteElements.length > 0
        ? noteElements.map((node) => {
            customElements.upgrade(node);
            return node.ownNotehead;
          })
        : this.notes.map(() => null);
    return resolveChordToneNoteheads(
      parseNotehead(this.readAttribute('notehead')),
      toneNoteheads
    );
  }

  // See INoteElement.stemDirection.
  get stemDirection(): StemDirection | null {
    return parseStemDirection(this.readAttribute('stem-direction'));
  }
  set stemDirection(value: StemDirection | null) {
    if (value === null) {
      this.removeAttribute('stem-direction');
    } else {
      this.setAttribute('stem-direction', value);
    }
  }

  // A <music-tremolo>'s own beams stand for the repetition, so a member's
  // strokes are ignored.
  get tremolo(): TremoloValue | null {
    if (this.parentElement?.nodeName === MUSIC_TREMOLO_NODE) {
      return null;
    }
    return parseTremolo(this.readAttribute('tremolo'));
  }
  set tremolo(value: TremoloValue | null) {
    if (value === null) {
      this.removeAttribute('tremolo');
    } else {
      this.setAttribute('tremolo', String(value));
    }
  }

  get tremoloTuplet(): number | null {
    return parseTremoloTuplet(this.readAttribute('tremolo-tuplet'));
  }
  set tremoloTuplet(value: number | null) {
    if (value === null) {
      this.removeAttribute('tremolo-tuplet');
    } else {
      this.setAttribute('tremolo-tuplet', String(value));
    }
  }

  get tremoloLabel(): TremoloLabel | null {
    return parseTremoloLabel(this.readAttribute('tremolo-label'));
  }
  set tremoloLabel(value: TremoloLabel | null) {
    if (value === null) {
      this.removeAttribute('tremolo-label');
    } else {
      this.setAttribute('tremolo-label', value);
    }
  }

  get articulationRepeat(): boolean {
    return this.readsAttribute('articulation-repeat');
  }
  set articulationRepeat(value: boolean) {
    this.toggleAttribute('articulation-repeat', value);
  }

  get tieStyle(): TieStyle {
    return parseTieStyle(this.readAttribute('tie-style'));
  }
  set tieStyle(value: TieStyle) {
    if (value === 'solid') {
      this.removeAttribute('tie-style');
    } else {
      this.setAttribute('tie-style', value);
    }
  }

  get slurStyle(): SlurStyle {
    return parseSlurStyle(this.readAttribute('slur-style'));
  }
  set slurStyle(value: SlurStyle) {
    if (value === 'solid') {
      this.removeAttribute('slur-style');
    } else {
      this.setAttribute('slur-style', value);
    }
  }

  // A staff draws this chord's label and breath mark itself, including for a
  // combined-voices chord it builds inside its own shadow root.
  get #drawnByStaff(): boolean {
    if (this.closest(STAFF_TAGS) !== null) {
      return true;
    }
    const root = this.getRootNode();
    return root instanceof ShadowRoot && isStaffNodeName(root.host.nodeName);
  }

  get swell(): SwellShape | null {
    return parseSwellShape(this.readAttribute('swell'));
  }
  set swell(value: SwellShape | boolean | null) {
    if (value === null || value === false) {
      this.removeAttribute('swell');
    } else {
      this.setAttribute('swell', value === true ? '' : value);
    }
  }

  get phonemes(): string | null {
    return this.readAttribute('phonemes');
  }
  set phonemes(value: string | null) {
    if (value === null) {
      this.removeAttribute('phonemes');
    } else {
      this.setAttribute('phonemes', value);
    }
  }

  get dynamicEnd(): DynamicMarking | null {
    return parseDynamicMarking(this.readAttribute('dynamic-end'));
  }
  set dynamicEnd(value: DynamicMarking | null) {
    if (value === null) {
      this.removeAttribute('dynamic-end');
    } else {
      this.setAttribute('dynamic-end', value);
    }
  }

  get breathMark(): BreathMark | null {
    return parseBreathMark(this.readAttribute('breath-mark'));
  }
  set breathMark(value: BreathMark | null) {
    if (value === null) {
      this.removeAttribute('breath-mark');
    } else {
      this.setAttribute('breath-mark', value);
    }
  }

  get dottedTieAcrossBarline(): boolean {
    return this.#dottedTieAcrossBarline;
  }
  set dottedTieAcrossBarline(value: boolean) {
    if (value === this.#dottedTieAcrossBarline) {
      return;
    }
    this.#dottedTieAcrossBarline = value;
    // The staff re-resolves accidentals on a full re-layout.
    this.dispatchEvent(
      new CustomEvent(NOTE_EVENTS.NOTE_Y_CHANGE, {
        bubbles: true,
        composed: true,
      })
    );
  }

  #repeatCount(): number {
    return articulationRepeatCount({
      articulationRepeat: this.articulationRepeat,
      articulation: this.articulation,
      tremolo: this.tremolo,
      tuplet: this.tremoloTuplet,
      duration: this.duration,
    });
  }

  #tremoloStrokeCount(): number {
    const tremolo = this.tremolo;
    return tremolo === null ? 0 : resolveStrokeCount(tremolo, this.duration);
  }

  // `id` of the other-staff element this chord shares a single stem with.
  // Resolved by the ancestor <music-measure>.
  // Ignored on a <music-tremolo> member, whose stem its tremolo sets.
  get sharedStemFor(): string | null {
    return this.parentElement?.nodeName === MUSIC_TREMOLO_NODE
      ? null
      : this.readAttribute('shared-stem-for');
  }
  set sharedStemFor(value: string | null) {
    if (value === null) {
      this.removeAttribute('shared-stem-for');
    } else {
      this.setAttribute('shared-stem-for', value);
    }
  }

  // Dynamic change during the roll — a vertical hairpin left of the arpeggio
  // sign. Accepts `crescendo` / `decrescendo` (`diminuendo` normalizes to
  // `decrescendo`). Honoured only alongside a wave-variant `arpeggio`.
  get arpeggioHairpin(): HairpinKind | null {
    return parseHairpinKind(this.readAttribute('arpeggio-hairpin'));
  }
  set arpeggioHairpin(value: HairpinKind | null) {
    if (value === null) {
      this.removeAttribute('arpeggio-hairpin');
    } else {
      this.setAttribute('arpeggio-hairpin', value);
    }
  }

  get arpeggioHairpinFrom(): DynamicMarking | null {
    return parseDynamicMarking(this.readAttribute('arpeggio-hairpin-from'));
  }
  set arpeggioHairpinFrom(value: DynamicMarking | null) {
    if (value === null) {
      this.removeAttribute('arpeggio-hairpin-from');
    } else {
      this.setAttribute('arpeggio-hairpin-from', value);
    }
  }

  get arpeggioHairpinTo(): DynamicMarking | null {
    return parseDynamicMarking(this.readAttribute('arpeggio-hairpin-to'));
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
      this.readAttribute('arpeggiate')
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
    return this.readsAttribute('trill');
  }
  set trill(value: boolean) {
    if (value) {
      this.setAttribute('trill', '');
    } else {
      this.removeAttribute('trill');
    }
  }

  get trillLine(): TrillLineMode {
    return parseTrillLineMode(this.readAttribute('trill-line'));
  }
  set trillLine(value: TrillLineMode) {
    this.setAttribute('trill-line', value);
  }

  get trillStop(): boolean {
    return this.readsAttribute('trill-stop');
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
  get trillAccidental(): ConventionalAccidentalType | null {
    return parseAccidentalType(this.readAttribute('trill-accidental'));
  }
  set trillAccidental(value: ConventionalAccidentalType | null) {
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
    return (this.readAttribute('trill-note') as Note) ?? null;
  }
  set trillNote(value: Note | null) {
    if (value === null) {
      this.removeAttribute('trill-note');
    } else {
      this.setAttribute('trill-note', value);
    }
  }

  // Applies to the trilling pitch wherever it comes from: trill-note,
  // trill-accidental or the diatonic neighbor.
  get trillQuarterTone(): QuarterTone | null {
    return parseQuarterTone(this.readAttribute('trill-quarter-tone'));
  }
  set trillQuarterTone(value: QuarterTone | null) {
    if (value === null) {
      this.removeAttribute('trill-quarter-tone');
    } else {
      this.setAttribute('trill-quarter-tone', value);
    }
  }

  // Meaningful only on the trill-starting element — controls the
  // system-break restatement, resolved by the ancestor composition.
  get trillContinuation(): TrillContinuationMode {
    return parseTrillContinuationMode(this.readAttribute('trill-continuation'));
  }
  set trillContinuation(value: TrillContinuationMode) {
    this.setAttribute('trill-continuation', value);
  }

  // Set by the staff to the resolved trilling pitch. null when not
  // trilling, or in standalone mode.
  get resolvedTrillPitch(): ResolvedTrillPitch | null {
    return this.#resolvedTrillPitch;
  }
  set resolvedTrillPitch(value: ResolvedTrillPitch | null) {
    this.#resolvedTrillPitch = value;
    this.#scheduleRender();
  }

  get grace(): Note[] | null {
    return parseGraceNotes(this.readAttribute('grace'));
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
    return parseGraceOctaves(this.readAttribute('grace-octave'));
  }
  set graceOctave(value: GraceOctavesType) {
    const attr = graceListToAttr(value, parseGraceOctaves);
    if (attr === null) {
      this.removeAttribute('grace-octave');
    } else {
      this.setAttribute('grace-octave', attr);
    }
  }

  get graceQuarterTone(): (QuarterTone | null)[] | null {
    return parseGraceQuarterTones(this.readAttribute('grace-quarter-tone'));
  }
  set graceQuarterTone(value: GraceQuarterTonesType) {
    const attr = graceListToAttr(value, parseGraceQuarterTones);
    if (attr === null) {
      this.removeAttribute('grace-quarter-tone');
    } else {
      this.setAttribute('grace-quarter-tone', attr);
    }
  }

  get graceArticulation(): (ArticulationType | null)[] | null {
    return parseGraceArticulations(this.readAttribute('grace-articulation'));
  }
  set graceArticulation(value: GraceArticulationsType) {
    const attr = graceListToAttr(value, parseGraceArticulations);
    if (attr === null) {
      this.removeAttribute('grace-articulation');
    } else {
      this.setAttribute('grace-articulation', attr);
    }
  }

  get graceNotehead(): (NoteheadType | null)[] | null {
    return parseGraceNoteheads(this.readAttribute('grace-notehead'));
  }
  set graceNotehead(value: GraceNoteheadsType) {
    const attr = graceListToAttr(value, parseGraceNoteheads);
    if (attr === null) {
      this.removeAttribute('grace-notehead');
    } else {
      this.setAttribute('grace-notehead', attr);
    }
  }

  get graceHeadLeftOverhangsPx(): number[] {
    return graceHeadLeftOverhangsPx(
      this.graceNotehead,
      this.grace?.length ?? 0,
      this.graceDuration
    );
  }

  get graceType(): GraceType {
    return parseGraceType(this.readAttribute('grace-type')) ?? 'acciaccatura';
  }
  set graceType(value: GraceType | null) {
    if (value === null) {
      this.removeAttribute('grace-type');
    } else {
      this.setAttribute('grace-type', value);
    }
  }

  get graceDuration(): GraceDuration | null {
    return parseGraceDuration(this.readAttribute('grace-duration'));
  }
  set graceDuration(value: GraceDuration | null) {
    if (value === null) {
      this.removeAttribute('grace-duration');
    } else {
      this.setAttribute('grace-duration', value);
    }
  }

  get graceSlur(): GraceSlur {
    return parseGraceSlur(this.readAttribute('grace-slur')) ?? 'auto';
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
    return parseDynamicMarking(this.readAttribute('grace-dynamic'));
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
    return parseGraceNotes(this.readAttribute('trill-finish'));
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
    return parseGraceOctaves(this.readAttribute('trill-finish-octave'));
  }
  set trillFinishOctave(value: GraceOctavesType) {
    const attr = graceListToAttr(value, parseGraceOctaves);
    if (attr === null) {
      this.removeAttribute('trill-finish-octave');
    } else {
      this.setAttribute('trill-finish-octave', attr);
    }
  }

  get trillFinishQuarterTone(): (QuarterTone | null)[] | null {
    return parseGraceQuarterTones(
      this.readAttribute('trill-finish-quarter-tone')
    );
  }
  set trillFinishQuarterTone(value: GraceQuarterTonesType) {
    const attr = graceListToAttr(value, parseGraceQuarterTones);
    if (attr === null) {
      this.removeAttribute('trill-finish-quarter-tone');
    } else {
      this.setAttribute('trill-finish-quarter-tone', attr);
    }
  }

  get trillFinishSlur(): TrillFinishSlur {
    return parseTrillFinishSlur(this.readAttribute('trill-finish-slur'));
  }
  set trillFinishSlur(value: TrillFinishSlur) {
    this.setAttribute('trill-finish-slur', value);
  }

  get resolvedTrillFinishAccidentals(): (AccidentalType | null)[] | null {
    return this.#resolvedTrillFinishAccidentals;
  }
  set resolvedTrillFinishAccidentals(value: (AccidentalType | null)[] | null) {
    this.#resolvedTrillFinishAccidentals = value;
    this.#scheduleRender();
  }

  // Starts an octave-transposition span at this chord. The ancestor staff
  // resolves the span over its own element stream — see
  // NOTE_EVENTS.OCTAVE_ATTRIBUTE_CHANGE in attributeChangedCallback.
  get octaveShift(): OctaveShiftAmount | null {
    return parseOctaveShiftAmount(this.readAttribute('octave-shift'));
  }
  set octaveShift(value: OctaveShiftAmount | null) {
    if (value === null) {
      this.removeAttribute('octave-shift');
    } else {
      this.setAttribute('octave-shift', value);
    }
  }

  // Display mode for the span this chord starts. Resolved to 'sign' at
  // span-open time by rules/octaveRules.ts, not here — see
  // parseOctaveDisplayMode.
  get octaveMode(): OctaveDisplayMode | null {
    return parseOctaveDisplayMode(this.readAttribute('octave-mode'));
  }
  set octaveMode(value: OctaveDisplayMode | null) {
    if (value === null) {
      this.removeAttribute('octave-mode');
    } else {
      this.setAttribute('octave-mode', value);
    }
  }

  get octaveStop(): boolean {
    return this.readsAttribute('octave-stop');
  }
  set octaveStop(value: boolean) {
    if (value) {
      this.setAttribute('octave-stop', '');
    } else {
      this.removeAttribute('octave-stop');
    }
  }

  get loco(): boolean {
    return this.readsAttribute('loco');
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
      this.readAttribute('octave-continuation')
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

  #warnedDynamicReminder = false;
  #warnedDynamicText = false;

  // A bracketed reminder needs a dynamic to bracket, and a dynamic-text a
  // dynamic to follow; each warns once until one is set.
  #warnAboutDynamicReminder(): void {
    const missing = this.dynamicReminder && this.dynamic === null;
    if (missing && this.isConnected && !this.#warnedDynamicReminder) {
      console.warn(
        `[music-chord] dynamic-reminder needs a dynamic to draw in brackets`
      );
    }
    this.#warnedDynamicReminder = missing && this.isConnected;
    const textMissing = this.dynamicText !== null && this.dynamic === null;
    if (textMissing && this.isConnected && !this.#warnedDynamicText) {
      console.warn(`[music-chord] dynamic-text needs a dynamic to follow`);
    }
    this.#warnedDynamicText = textMissing && this.isConnected;
  }

  connectedCallback(): void {
    upgradeShadowedProperties(this);
    this.#warnAboutTremolo(null, null);
    this.#warnAboutSlurStyle(null, null);
    this.#warnAboutGlissandoShape(null, null);
    this.#warnAboutBend(null, null);
    this.#warnAboutDynamicReminder();
    this.render();
    this.#childObserver = new MutationObserver(() => {
      this.#scheduleRender();
    });
    this.#childObserver.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'notehead',
        'instrument',
        'accidental-reminder',
        'unpitched',
        'quarter-tone',
        'bend',
        'bend-to',
        'bend-to-quarter-tone',
        'bend-contour',
        'glissando',
      ],
    });
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

    if (name === 'duration') {
      warnIfInvalidDuration(this.localName, newValue);
    }

    if (name === 'quarter-tone') {
      if (this.readAttribute(name) !== null) {
        console.warn(
          `[music-chord] quarter-tone does nothing on a chord; set it on the slotted notes it raises or lowers`
        );
      }
      return;
    }

    // `diminuendo` is rewritten to `decrescendo`, even before connecting.
    // The removeAttribute below re-enters with null, which must be a no-op.
    if (name === 'diminuendo') {
      if (newValue !== null) {
        this.setAttribute('decrescendo', newValue);
        this.removeAttribute('diminuendo');
      }
      return;
    }

    if (name === 'notehead' || name === 'grace-notehead') {
      const warning =
        name === 'notehead'
          ? triangleUnsupportedWarning([this.notehead], 'a chord')
          : triangleUnsupportedWarning(
              this.graceNotehead ?? [],
              'a grace note'
            );
      if (warning) {
        console.warn(`[music-chord] ${warning}`);
      }
    }

    this.#warnAboutTremolo(name, newValue);
    this.#warnAboutSlurStyle(name, newValue);
    this.#warnAboutGlissandoShape(name, newValue);
    this.#warnAboutBend(name, newValue);
    if (
      name === 'glissando-label' &&
      newValue !== null &&
      resolveGlissandoLabel(newValue) === null
    ) {
      console.warn(`[music-chord] glissando-label is empty; drawing no label`);
    }
    const textWarning = textAttributeWarning(name, newValue);
    if (textWarning !== null) {
      console.warn(`[music-chord] ${textWarning}`);
    }
    const swellWarning = swellAttributeWarning(name, newValue);
    if (swellWarning !== null) {
      console.warn(`[music-chord] ${swellWarning}`);
    }
    if (name === 'phonemes') {
      const phonemeWarning = phonemesWarning(newValue);
      if (phonemeWarning !== null) {
        console.warn(`[music-chord] ${phonemeWarning}`);
      }
    }
    if (
      name === 'breath-mark' &&
      newValue !== null &&
      parseBreathMark(newValue) === null
    ) {
      console.warn(
        `[music-chord] breath-mark="${newValue}" is not "tick" or "comma"; ignoring it`
      );
    }

    if (!this.isConnected) {
      return;
    }

    if (
      name === 'tie' ||
      name === 'slur' ||
      name === 'lv-label' ||
      name === 'glissando' ||
      name === 'glissando-hint' ||
      name === 'glissando-shape' ||
      name === 'slur-group' ||
      name === 'tie-style' ||
      name === 'slur-style' ||
      name === 'for'
    ) {
      this.dispatchEvent(
        new CustomEvent(NOTE_EVENTS.CONNECTOR_ATTRIBUTE_CHANGE, {
          bubbles: true,
          composed: true,
        })
      );
      if (name === 'glissando') {
        // The staff keeps room after a glissando's start.
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.NOTE_Y_CHANGE, {
            bubbles: true,
            composed: true,
          })
        );
      }
      return;
    }

    if (
      name === 'dynamic' ||
      name === 'crescendo' ||
      name === 'decrescendo' ||
      name === 'grace-dynamic' ||
      name === 'dynamic-shared' ||
      name === 'dynamic-reminder' ||
      name === 'dynamic-text'
    ) {
      this.#warnAboutDynamicReminder();
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
      name === 'trill-accidental' ||
      name === 'trill-continuation'
    ) {
      // The staff re-resolves the trill synchronously, so render() below
      // sees the fresh resolvedTrillPitch.
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
      name === 'octave-shift' ||
      name === 'octave-mode' ||
      name === 'octave-stop' ||
      name === 'loco' ||
      name === 'octave-continuation'
    ) {
      // The ancestor staff resolves octave-transposition spans over its
      // own element stream and redraws the sign/line/corner in its own
      // overlay — nothing renders locally in this chord's own shadow DOM.
      this.dispatchEvent(
        new CustomEvent(NOTE_EVENTS.OCTAVE_ATTRIBUTE_CHANGE, {
          bubbles: true,
          composed: true,
        })
      );
      return;
    }

    if (name === 'stem-direction') {
      // Ancestor staff re-runs its full layout pass (same event note/
      // octave changes already reuse) — stemDirection feeds into beam
      // structure, not just this chord's own local rendering.
      this.dispatchEvent(
        new CustomEvent(NOTE_EVENTS.NOTE_Y_CHANGE, {
          bubbles: true,
          composed: true,
        })
      );
      return;
    }

    if (name === 'beam-group') {
      // The ancestor measure resolves cross-staff double-stemmed beam
      // groups over both staves' element streams; nothing renders locally
      // in this chord's own shadow DOM.
      this.dispatchEvent(
        new CustomEvent(NOTE_EVENTS.BEAM_GROUP_ATTRIBUTE_CHANGE, {
          bubbles: true,
          composed: true,
        })
      );
      return;
    }

    if (name === 'shared-stem-for') {
      // The ancestor measure resolves shared-stem pairs across both
      // staves, suppresses each end's own local stem (noStem — that
      // property's own setter re-renders this chord), and draws the real
      // connecting stem itself; nothing else to do locally here.
      this.dispatchEvent(
        new CustomEvent(NOTE_EVENTS.SHARED_STEM_ATTRIBUTE_CHANGE, {
          bubbles: true,
          composed: true,
        })
      );
      return;
    }

    if (
      name === 'chord' ||
      name === 'accidental-reminder' ||
      name === 'stem-mark' ||
      name === 'arpeggio' ||
      name === 'arpeggio-for' ||
      name === 'arpeggio-hairpin' ||
      name === 'arpeggio-hairpin-from' ||
      name === 'arpeggio-hairpin-to' ||
      name === 'arpeggiate' ||
      name === 'grace' ||
      name === 'grace-octave' ||
      name === 'grace-quarter-tone' ||
      name === 'grace-articulation' ||
      name === 'grace-notehead' ||
      name === 'notehead' ||
      name === 'grace-type' ||
      name === 'grace-duration' ||
      name === 'grace-slur' ||
      name === 'trill-note' ||
      name === 'trill-quarter-tone' ||
      name === 'trill-finish' ||
      name === 'trill-finish-octave' ||
      name === 'trill-finish-quarter-tone' ||
      name === 'trill-finish-slur' ||
      name === 'duration' ||
      name === 'tremolo' ||
      name === 'tremolo-tuplet' ||
      name === 'tremolo-label' ||
      name === 'breath-mark' ||
      name === 'swell' ||
      name === 'phonemes' ||
      name === 'dynamic-end' ||
      name === 'glissando-label' ||
      name === 'technique-text' ||
      name === 'technique-text-placement' ||
      name === 'technique-text-style' ||
      name === 'bend' ||
      name === 'bend-to' ||
      name === 'bend-to-quarter-tone' ||
      name === 'articulation-repeat'
    ) {
      // Each of these changes layout (beat time, a leftward or rightward
      // footprint, stem length, what the staff clears above) or the
      // voice-combine key, so the staff re-lays out.
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
    if (
      (name === 'articulation' || name === 'stress') &&
      this.closest(STAFF_TAGS)
    ) {
      // What sits beyond this element's marks (a tremolo label, an ending
      // bracket) is laid out by the staff and its ancestors.
      this.dispatchEvent(
        new CustomEvent(NOTE_EVENTS.NOTE_Y_CHANGE, {
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  #lastDotMismatchWarning: string | null = null;

  // Every head takes the chord's dots, so a child's own dotted duration
  // can't change them.
  #warnChildDotMismatch(): void {
    const chordDots = durationToDotCount[this.duration];
    const mismatch = [
      ...this.querySelectorAll<NoteElementType>(this.childNoteTag),
    ].find(
      (note) =>
        note.hasAttribute('duration') &&
        durationToDotCount[note.duration] !== chordDots
    );
    const warning = mismatch
      ? `child duration="${mismatch.duration}" has a different number of dots than the chord's duration="${this.duration}"; every notehead takes the chord's dots.`
      : null;
    if (warning && warning !== this.#lastDotMismatchWarning) {
      console.warn(`[music-chord] ${warning}`);
    }
    this.#lastDotMismatchWarning = warning;
  }

  // A value that doesn't parse warns as soon as it's set. Attributes that
  // don't fit together warn once connected, so markup built one attribute
  // at a time doesn't warn about a state it passes through.
  #warnAboutTremolo(changed: string | null, newValue: string | null): void {
    const invalid =
      newValue === null
        ? null
        : changed === 'tremolo' && parseTremolo(newValue) === null
        ? 'is not a stroke count (1–4) or "unmeasured"'
        : changed === 'tremolo-tuplet' && parseTremoloTuplet(newValue) === null
        ? 'is not a whole number of at least 2'
        : changed === 'tremolo-label' && parseTremoloLabel(newValue) === null
        ? `is not one of ${TREMOLO_LABELS.map((label) => `"${label}"`).join(
            ', '
          )}`
        : null;
    if (invalid !== null) {
      console.warn(
        `[music-chord] ${changed}="${newValue}" ${invalid}; ignoring it`
      );
      return;
    }
    if (changed === 'bend-contour' && newValue !== null) {
      console.warn(
        '[music-chord] bend-contour is ignored on a chord; put it on a slotted note, one line a tone'
      );
      return;
    }
    if (!this.isConnected) {
      return;
    }
    for (const warning of tremoloConsistencyWarnings({
      changed,
      tremolo: this.tremolo,
      tuplet: this.tremoloTuplet,
      articulationRepeat: this.articulationRepeat,
      articulation: this.articulation,
      duration: this.duration,
      label: this.tremoloLabel,
      inTremoloGroup: this.parentElement?.nodeName === MUSIC_TREMOLO_NODE,
    })) {
      console.warn(`[music-chord] ${warning}`);
    }
  }

  #warnAboutGlissandoShape(
    changed: string | null,
    newValue: string | null
  ): void {
    if (
      changed !== null &&
      changed !== 'glissando-shape' &&
      changed !== 'glissando'
    ) {
      return;
    }
    if (
      changed === 'glissando-shape' &&
      newValue !== null &&
      newValue !== parseGlissandoShape(newValue)
    ) {
      console.warn(
        `[music-chord] glissando-shape="${newValue}" is not "straight", "dip" or "wave"; ignoring it`
      );
      return;
    }
    if (!this.isConnected) {
      return;
    }
    const warning = glissandoShapeWarning({
      shape: this.glissandoShape,
      glissando: this.glissando,
    });
    if (warning !== null) {
      console.warn(`[music-chord] ${warning}`);
    }
  }

  #lastBendWarning: string | null = null;

  // An invalid value warns as soon as it's set; what doesn't fit together
  // warns once connected.
  #warnAboutBend(changed: string | null, newValue: string | null): void {
    const invalid =
      newValue === null
        ? null
        : changed === 'bend' && parseBendShape(newValue) === null
        ? 'is not "up", "down", "dip" or "wave"'
        : changed === 'bend-to' && parseNote(newValue) === null
        ? 'is not a pitch such as "C#"'
        : changed === 'bend-to-quarter-tone' &&
          parseQuarterTone(newValue) === null
        ? 'is not "up" or "down"'
        : null;
    if (invalid !== null) {
      console.warn(
        `[music-chord] ${changed}="${newValue}" ${invalid}; ignoring it`
      );
      return;
    }
    if (
      !this.isConnected ||
      (changed !== null &&
        changed !== 'bend' &&
        changed !== 'bend-to' &&
        changed !== 'bend-to-quarter-tone' &&
        changed !== 'glissando')
    ) {
      return;
    }
    const warning = bendConsistencyWarning({
      bend: this.bend,
      bendTo: this.bendTo,
      glissando: this.glissando,
      isChord: true,
      inTremoloGroup: this.parentElement?.nodeName === MUSIC_TREMOLO_NODE,
      onTriangle: false,
      targetDirection: null,
    });
    if (warning !== null && warning !== this.#lastBendWarning) {
      console.warn(`[music-chord] ${warning}`);
    }
    this.#lastBendWarning = warning;
  }

  #warnAboutSlurStyle(changed: string | null, newValue: string | null): void {
    if (
      changed !== null &&
      changed !== 'slur-style' &&
      changed !== 'slur' &&
      changed !== 'slur-group'
    ) {
      return;
    }
    if (
      changed === 'slur-style' &&
      newValue !== null &&
      newValue !== parseSlurStyle(newValue)
    ) {
      console.warn(
        `[music-chord] slur-style="${newValue}" is not "solid" or "dotted"; ignoring it`
      );
      return;
    }
    if (!this.isConnected) {
      return;
    }
    const warning = slurStyleWarning({
      slurStyle: this.slurStyle,
      slur: this.slur,
      slurGroup: this.slurGroup,
    });
    if (warning !== null) {
      console.warn(`[music-chord] ${warning}`);
    }
  }

  private render(): void {
    this.#warnChildDotMismatch();
    const toneNoteheads = this.toneNoteheads;
    if (this.#staffYCoordinates) {
      const [chordSvg] = createChordSvg({
        duration: this.duration,
        augmentationDotRows: this.#augmentationDotRows,
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
        // A written trilling note (small notehead after the chord, drawn
        // by the staff overlay) carries its own accidental — the sign
        // itself shows one only for the accidental-only override form.
        trillAccidental:
          this.#resolvedTrillPitch?.written === false
            ? this.#resolvedTrillPitch.accidental
            : null,
        trillSignExtraLift: this.#trillSignExtraLift,
        noFlags: this.#noFlags,
        noStem: this.#noStem,
        stemUp: this.#stemUp,
        stemExtension: this.#stemExtension,
        noteAccidentals: this.#noteAccidentals,
        noteAccidentalsParenthesized: this.#noteAccidentalsParenthesized,
        noteheads: toneNoteheads,
        articulation: this.articulation,
        stress: this.stress,
        articulationStemAnchorBeamLevels:
          this.#articulationStemAnchorBeamLevels,
        graceNotes: this.#buildGraceDescriptors(this.notes),
        graceType: this.graceType,
        graceDuration: this.graceDuration,
        graceSlur: this.graceSlur,
        graceLedgerStaffY: this.#staffYCoordinates[0] ?? null,
        trillFinishNotes: this.#buildTrillFinishDescriptors(this.notes),
        trillFinishSlur: this.trillFinishSlur,
        tremoloStrokeCount: this.#tremoloStrokeCount(),
        stemCross: this.stemMark === 'cross',
        tremoloTuplet: drawnTremoloTuplet(this.tremolo, this.tremoloTuplet),
        articulationRepeatCount: this.#repeatCount(),
        tremoloLabel: this.#drawnByStaff ? null : this.tremoloLabel,
        glissandoLabel: this.#drawnByStaff ? null : this.glissandoLabel,
        techniqueText: this.#drawnByStaff
          ? null
          : techniqueTextLabel(this.techniqueText, this.techniqueTextStyle),
        techniqueTextBelow: this.techniqueTextPlacement === 'below',
        phonemes: this.#drawnByStaff ? null : parsePhonemes(this.phonemes),
        breathMark: this.#drawnByStaff ? null : this.breathMark,
        bends: this.#standaloneBends(),
      });
      chordSvg.setAttribute('overflow', 'visible');
      // An unpitched tone takes no ledger line.
      const unpitched = this.toneUnpitched;
      const pitched = (_: unknown, i: number) => unpitched[i] === null;
      addLedgerLines(
        chordSvg,
        this.#staffYCoordinates.filter(pitched),
        this.#stemUp,
        STAFF_Y_PADDING - NOTE_HEAD_Y_OFFSET_CORRECTION,
        this.#ledgerHeadExtent(
          this.#staffYCoordinates,
          toneNoteheads,
          unpitched
        )
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

      this.#wireInteractionEvents(svg);
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
      // Standalone, a reminder shows each tone's own accidental.
      const reminders = this.toneAccidentalReminders;
      const unpitched = this.toneUnpitched;
      const noteAccidentals = this.#resolveStandaloneNoteAccidentals().map(
        (accidental, i) =>
          unpitched[i] !== null
            ? null
            : reminders[i] !== null
            ? accidental ?? 'natural'
            : accidental
      );

      const [chordSvg] = createChordSvg({
        duration: this.duration,
        augmentationDotRows: this.#augmentationDotRows,
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
        noteAccidentalsParenthesized: reminders.map(
          (reminder) => reminder === 'bracketed'
        ),
        noteheads: toneNoteheads,
        noFlags: false,
        noStem: this.#noStem,
        // Standalone, nothing else lengthens the stem for tremolo strokes.
        stemExtension: unbeamedTremoloStemExtensionPx({
          tremolo: this.tremolo,
          stemCross: this.stemMark === 'cross',
          duration: this.duration,
          headYs: standaloneYCoordinates,
          stemUp,
          staff: STAFF_BAND,
          stemExtensionPx: 0,
        }),
        articulation: this.articulation,
        stress: this.stress,
        graceNotes: this.#buildGraceDescriptors(notes),
        graceType: this.graceType,
        graceDuration: this.graceDuration,
        graceSlur: this.graceSlur,
        trillFinishNotes: this.#buildTrillFinishDescriptors(notes),
        trillFinishSlur: this.trillFinishSlur,
        tremoloStrokeCount: this.#tremoloStrokeCount(),
        stemCross: this.stemMark === 'cross',
        tremoloTuplet: drawnTremoloTuplet(this.tremolo, this.tremoloTuplet),
        articulationRepeatCount: this.#repeatCount(),
        tremoloLabel: this.#drawnByStaff ? null : this.tremoloLabel,
        glissandoLabel: this.#drawnByStaff ? null : this.glissandoLabel,
        techniqueText: this.#drawnByStaff
          ? null
          : techniqueTextLabel(this.techniqueText, this.techniqueTextStyle),
        techniqueTextBelow: this.techniqueTextPlacement === 'below',
        phonemes: this.#drawnByStaff ? null : parsePhonemes(this.phonemes),
        breathMark: this.#drawnByStaff ? null : this.breathMark,
        bends: this.#standaloneBends(),
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
      this.#wireInteractionEvents(svg);
    }
  }

  // A staff draws its chords' bends itself.
  #standaloneBends(): (ResolvedBend | null)[] {
    return this.#drawnByStaff ||
      this.glissando === 'start' ||
      this.parentElement?.nodeName === MUSIC_TREMOLO_NODE
      ? []
      : this.toneBends;
  }

  #wireInteractionEvents(svg: SVGSVGElement): void {
    const events: [string, string][] = [
      ['click', CHORD_EVENTS.CLICK],
      ['pointerdown', CHORD_EVENTS.POINTERDOWN],
      ['pointerup', CHORD_EVENTS.POINTERUP],
    ];
    for (const [nativeType, chordType] of events) {
      svg.addEventListener(nativeType, (e) => {
        this.dispatchEvent(
          new CustomEvent(chordType, {
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
    }
  }

  // Grace descriptors are relative to the chord's reference note (notes[0]).
  // Ledger lines span the widest head in the chord.
  #ledgerHeadExtent(
    staffYCoordinates: readonly number[],
    toneNoteheads: NoteheadType[],
    unpitched: readonly (UnpitchedPlacement | null)[] = []
  ): LedgerHeadExtent {
    const geometries = (
      toneNoteheads.length > 0 ? toneNoteheads : (['normal'] as const)
    ).map((notehead) =>
      noteHeadGeometry(this.#stemUp, this.duration, this.#noFlags, notehead)
    );
    const widest = geometries.reduce((a, b) =>
      b.halfWidth > a.halfWidth ? b : a
    );
    const heads = {
      duration: this.duration,
      staffYCoordinates,
      stemUp: this.#stemUp,
      noFlags: this.#noFlags,
      noteheads: toneNoteheads,
    };
    return {
      cxPx: widest.cx * NOTE_SCALE,
      halfWidthPx: widest.halfWidth * NOTE_SCALE,
      all: chordHeadExtentPx(heads),
      tones: staffYCoordinates.flatMap((staffY, index) =>
        (unpitched[index] ?? null) === null
          ? [{ staffY, ...chordToneHeadExtentPx(heads, index) }]
          : []
      ),
    };
  }

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
      this.graceArticulation ?? [],
      this.graceNotehead,
      this.graceQuarterTone
    );
    applyResolvedGraceAccidentals(graceNotes, this.#resolvedGraceAccidentals);
    applyGraceHeadOverhangs(graceNotes, this.graceHeadLeftOverhangsPx);
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
      notes[0].octave ?? 4,
      [],
      null,
      this.trillFinishQuarterTone
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
    const quarterTones = this.toneQuarterTones;
    return this.notes.map((note, i) =>
      pitchAccidental(note.value, quarterTones[i])
    );
  }
}

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  if (!customElements.get(MUSIC_CHORD)) {
    customElements.define(MUSIC_CHORD, ChordElement);
  }
}
