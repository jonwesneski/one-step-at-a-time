import type { ResolvedTrillPitch } from '../rules/trillRules';
import type { VerticalBand } from '../rules/verticalSpaceRules';
import type {
  AccidentalType,
  ArpeggioType,
  ArticulationType,
  BarlineType,
  BendShape,
  BreathMark,
  Chord,
  ClefType,
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
  Mode,
  Note,
  NoteheadType,
  NoteLetter,
  Octave,
  OctaveContinuationMode,
  OctaveDisplayMode,
  OctaveShiftAmount,
  PercussionInstrument,
  QuarterTone,
  RestStaffSide,
  SlurStyle,
  StaffGroupType,
  StemDirection,
  StressType,
  TieStyle,
  TimeSignature,
  TremoloBeamAttach,
  TremoloBeamPosition,
  TremoloLabel,
  TremoloStrokeCount,
  TremoloValue,
  TrillContinuationMode,
  TrillFinishSlur,
  TrillLineMode,
  TupletPlacement,
  TupletRatio,
} from './theory';

export type NoteLetterOctave = `${NoteLetter}${Octave}`;

/** Which end of a tie, slur, or technique connector an element marks. */
export type ConnectorRole = 'start' | 'end';

/**
 * Value of the `tie` attribute: a `start`/`end` endpoint, or `laissez-vibrer`
 * — an open-ended tie curving off the notehead into empty space, for a note
 * left to ring (not held to a matching next notehead).
 */
export type TieValue = ConnectorRole | 'laissez-vibrer';

// The three array-valued grace properties reflect a comma-separated string
// attribute. Reads return the parsed array (internal renderers rely on that);
// writes also accept the raw string, since React and Storybook assign the JSX
// prop as a property rather than an attribute.
export type GraceNotesType = Note[] | string | null;
export type GraceOctavesType = (Octave | null)[] | string | null;
export type GraceArticulationsType =
  | (ArticulationType | null)[]
  | string
  | null;
export type GraceNoteheadsType = (NoteheadType | null)[] | string | null;
export type GraceQuarterTonesType = (QuarterTone | null)[] | string | null;

// A note's role in a unison with another voice (see rules/unisonRules.ts).
export type UnisonPart = {
  // The other voice draws the shared head.
  omitsHead: boolean;
};

export interface INoteElement {
  duration: DurationType;
  note: Note;
  // Raises or lowers `note` by a quarter-tone, drawn as an arrow on its
  // accidental; null for an ordinary pitch.
  quarterTone: QuarterTone | null;
  octave: Octave | null;
  stemUp: boolean;
  // Author override for stemUp; null leaves the pitch, voice or beam-group
  // default. A beamed group draws one direction (see StemDirection).
  stemDirection: StemDirection | null;
  // Single-note tremolo strokes through the stem; null for none.
  tremolo: TremoloValue | null;
  // Tuplet numeral for a measured tremolo; null for none.
  tremoloTuplet: number | null;
  // `trem.` / `non trem.` above the stave; null for none.
  tremoloLabel: TremoloLabel | null;
  // Repeats the articulation's length mark once per tremolo repetition.
  articulationRepeat: boolean;
  // How the tie this element starts is drawn.
  tieStyle: TieStyle;
  // How the slur this element starts is drawn.
  slurStyle: SlurStyle;
  // A breath mark after this element; null for none.
  breathMark: BreathMark | null;
  // A `< >` swell over this element's own duration.
  swell: boolean;
  // Set by the composition on the end of a dotted tie that crosses a barline,
  // which shows its accidental again.
  dottedTieAcrossBarline: boolean;
  // Notehead shape; a triangle also forces stemUp and is placed by the staff.
  // null removes the attribute (normal).
  get notehead(): NoteheadType;
  set notehead(value: NoteheadType | null);
  // The authored notehead, else a fixed position's; null when neither is set.
  readonly ownNotehead: NoteheadType | null;
  // How far a glyph head reaches left of the ellipse head's edge (px).
  readonly headLeftOverhangPx: number;
  // Right ink edge (element px) of the duration dots, or null when undotted.
  readonly augmentationDotsRightEdgePx: number | null;
  stemExtension: number;
  noFlags: boolean;
  noStem: boolean;
  // `id` shared by every element across a measure's two adjacent grand-staff
  // staves that joins one cross-staff double-stemmed beam group.
  beamGroup: string | null;
  // `id` of the other-staff element this one shares a stem with; the
  // ancestor <music-measure> draws it.
  sharedStemFor: string | null;
  // Set by the ancestor <music-measure> on an inner-voice double-stemmed
  // member, whose articulations then sit at the beam: the number of secondary
  // beam levels past the primary (0 for a plain eighth). Null otherwise. Not
  // an attribute.
  articulationStemAnchorBeamLevels: number | null;
  // Staff Ys of the dot rows, set by the staff when another voice decides
  // where this element's dots go (an empty array draws none); null uses the
  // element's own placement. Not an attribute.
  augmentationDotRows: number[] | null;
  // Set by the staff to move this note's dot column right, past the other
  // voice's head in a unison where only this (upper) part is dotted. 0 = the
  // column follows this note's own head. Not an attribute.
  augmentationDotShiftPx: number;
  // Set by the staff when this note shares a unison with another voice; null
  // draws the note as usual. Not an attribute.
  unisonPart: UnisonPart | null;
  tie: TieValue | null;
  slur: ConnectorRole | null;
  // `id` shared by every breakpoint note/chord of one continuous multi-leg
  // cross-staff phrase slur (the first/last note of each leg, never the
  // notes still covered by their own staff's ordinary beam). Resolved by
  // the ancestor <music-measure> / <music-composition>.
  slurGroup: string | null;
  /** Draw an `l.v.` label on a `tie="laissez-vibrer"` tie. */
  lvLabel: boolean;
  glissando: ConnectorRole | null;
  /** Text above the glissando line this starts. */
  glissandoHint: GlissandoHint | null;
  /** The contour of the glissando line this starts. Defaults to `straight`. */
  glissandoShape: GlissandoShape;
  /** A pitch bend: a line after this note, inside its own duration. */
  bend: BendShape | null;
  /** The pitch it bends to, in parentheses; alone, a straight bend to it. */
  bendTo: Note | null;
  /** Raises or lowers `bendTo` by a quarter-tone. */
  bendToQuarterTone: QuarterTone | null;
  dynamic: DynamicMarking | null;
  /** Centers `dynamic` between this staff and its neighbor instead of locally. */
  dynamicShared: boolean;
  /** Draws `dynamic` in brackets, as a reminder (e.g. for a repeat's return). */
  dynamicReminder: boolean;
  /** Shows the accidental in force in parentheses, as a reminder. */
  accidentalReminder: boolean;
  crescendo: HairpinRole | null;
  decrescendo: HairpinRole | null;
  // Alias for decrescendo — always mirrors it.
  diminuendo: HairpinRole | null;
  articulation: ArticulationType | null;
  stress: StressType | null;
  // Arpeggio (rolled chord) sign drawn left of the element, spanning its
  // notehead range. On a lone note the sign is ~1 notehead tall.
  arpeggio: ArpeggioType | null;
  // `id` of the upper-staff element this element continues an unbroken
  // cross-staff arpeggio from (grand staff).
  arpeggioFor: string | null;
  // A dynamic change during the roll: a vertical hairpin wedge drawn just left
  // of the arpeggio sign, spanning the chord's vertical extent, with a dynamic
  // letter outside the staff at each end. Honoured only alongside a wave-variant
  // `arpeggio`.
  arpeggioHairpin: HairpinKind | null;
  // Dynamic letter at the start of the roll (bottom end for an upward roll).
  arpeggioHairpinFrom: DynamicMarking | null;
  // Dynamic letter at the end of the roll (top end for an upward roll).
  arpeggioHairpinTo: DynamicMarking | null;
  // Set false by an ancestor <music-measure> when this element is one end of a
  // continuous cross-staff arpeggio it draws itself; the element then skips its
  // own local sign. Not an attribute.
  renderArpeggioSign: boolean;
  // Marks the start / end of a `sempre arpeggiando` passage.
  arpeggiate: ConnectorRole | null;
  // Set by the staff to `'up'` for elements inside a `sempre arpeggiando`
  // passage that carry no explicit `arpeggio`; null otherwise. Not an attribute.
  impliedArpeggio: ArpeggioType | null;
  // Marks a trill start. The "tr" sign renders above the stave (or, standalone,
  // above the notehead). The trill line spans forward through this element's
  // own `tie` chain — no attribute is needed on the notes it continues into.
  trill: boolean;
  // 'auto' (default) draws the wavy extension line, matching standard
  // engraving practice; 'none' suppresses it (e.g. for a bare-sign-only
  // isolated, untied note-value).
  trillLine: TrillLineMode;
  // Draws a vertical end-notch here instead of letting the line run to the
  // next notehead.
  trillStop: boolean;
  // Overrides only the accidental of the trilling (auxiliary) pitch —
  // normally the diatonic upper neighbor as modified by the key signature.
  // Never changes the letter itself. Ignored (with a warning) when
  // `trillNote` is also set.
  trillAccidental: ConventionalAccidentalType | null;
  // Full override of the trilling pitch, drawn as a small parenthesized
  // notehead after the main one. Wins over `trillAccidental`.
  trillNote: Note | null;
  // Raises or lowers the trilling pitch by a quarter-tone, whether it comes
  // from `trillNote`, `trillAccidental` or the diatonic neighbor.
  trillQuarterTone: QuarterTone | null;
  // How a trill restates itself after a system break; read from the element
  // that starts the trill.
  trillContinuation: TrillContinuationMode;
  // Set by the staff to the resolved trilling pitch for a trill-marked
  // element. null when not trilling, or in standalone mode (trills render
  // nothing without a staff). Not an attribute.
  resolvedTrillPitch: ResolvedTrillPitch | null;
  // Staff-written px to raise the trill sign glyph above its own nominal
  // position, when another voice's own content occupies that territory in
  // a multi-voice staff. Not an attribute; mirrors stemExtension's own
  // staff-internal, non-author-set pattern.
  trillSignExtraLift: number;
  get grace(): Note[] | null;
  set grace(value: GraceNotesType);
  // Per-grace-note octave, aligned by index with `grace`. A null slot (or a
  // missing trailing slot) falls back to the host element's own octave.
  get graceOctave(): (Octave | null)[] | null;
  set graceOctave(value: GraceOctavesType);
  // Per-grace-note quarter-tone, aligned by index with `grace`. A null slot
  // (or a missing trailing slot) is an ordinary pitch.
  get graceQuarterTone(): (QuarterTone | null)[] | null;
  set graceQuarterTone(value: GraceQuarterTonesType);
  // Per-grace-note articulation, aligned by index with `grace`. A null slot
  // (or a missing trailing slot) means no mark for that grace note.
  get graceArticulation(): (ArticulationType | null)[] | null;
  set graceArticulation(value: GraceArticulationsType);
  // Per-grace notehead aligned by index with grace; an empty slot is normal.
  get graceNotehead(): (NoteheadType | null)[] | null;
  set graceNotehead(value: GraceNoteheadsType);
  // Per grace note, how far its head reaches left of the ellipse head's edge
  // (px, at grace scale).
  readonly graceHeadLeftOverhangsPx: number[];
  graceType: GraceType;
  graceDuration: GraceDuration | null;
  graceSlur: GraceSlur;
  // Key-signature-resolved accidentals for the grace pitches, set by the
  // staff. null = standalone mode (suffix-driven accidentals).
  resolvedGraceAccidentals: (AccidentalType | null)[] | null;
  // A single dynamic for the whole grace group, independent of the host
  // note's own `dynamic`. Rendered by the staff under the first grace note.
  graceDynamic: DynamicMarking | null;
  // Grace note(s) placed *after* this element (a trill's finishing/closing
  // figure) rather than before it — same comma-separated-or-array shape as
  // `grace`. Always rendered as plain unslashed noteheads (no `grace-type`
  // equivalent) at a fixed eighth-note-or-group written value.
  get trillFinish(): Note[] | null;
  set trillFinish(value: GraceNotesType);
  // Per-trill-finish-note octave, aligned by index with `trillFinish` — same
  // shape and fallback behavior as `graceOctave`.
  get trillFinishOctave(): (Octave | null)[] | null;
  set trillFinishOctave(value: GraceOctavesType);
  // Per-trill-finish-note quarter-tone, aligned by index with `trillFinish`.
  get trillFinishQuarterTone(): (QuarterTone | null)[] | null;
  set trillFinishQuarterTone(value: GraceQuarterTonesType);
  // Which slur(s) a trill's finishing grace note(s) draw: back to this
  // element ('to-main', default), forward to the next element ('to-next'),
  // 'both', or 'none'.
  trillFinishSlur: TrillFinishSlur;
  // Key-signature-resolved accidentals for the trill-finish pitches, set by
  // the staff — same fallback shape as `resolvedGraceAccidentals`.
  resolvedTrillFinishAccidentals: (AccidentalType | null)[] | null;
  // Starts an octave-transposition span at this element. A repeated value
  // while a span carrying that same value is already open is a no-op that
  // continues the existing span rather than restarting a new one.
  octaveShift: OctaveShiftAmount | null;
  // Display mode for the span this element starts: `sign` (default, bare
  // numeral) or `col` (prose "col 8va"/"col 8va bassa" label). Meaningless
  // without a matching octaveShift.
  octaveMode: OctaveDisplayMode | null;
  // Closes the currently open octave-transposition span at this element,
  // inclusive.
  octaveStop: boolean;
  // Closes the currently open octave-transposition span at this element,
  // rendering a "loco" label alongside the closing corner — or, with no open
  // span, a standalone "(loco)" reminder.
  loco: boolean;
  // How an octave line restates itself after a system break; read from the
  // element that starts the span.
  octaveContinuation: OctaveContinuationMode;
  // undefined = auto-detect from note attribute (standalone)
  // AccidentalType = show this symbol (set by staff)
  // null = suppress (key sig or in-measure state covers it)
  showAccidental: AccidentalType | null | undefined;
  /** Set by the staff: the shown accidental is a reminder, in parentheses. */
  accidentalParenthesized: boolean;
  // Set by the staff to enable ledger line rendering. null in standalone mode.
  staffY: number | null;
  // Where the nominal pitch would sit when the head is drawn elsewhere (an
  // in-staff triangle), so ornaments stay on their real staff positions. Null
  // otherwise.
  nominalStaffY: number | null;
  batchUpdate(fn: () => void): void;
}

export type ChordNote = {
  value: Note;
  octave: Octave | null;
};
export interface IChordElement {
  duration: DurationType;
  chord: Chord | null;
  readonly notes: ChordNote[];
  stemUp: boolean;
  // See INoteElement.stemDirection.
  stemDirection: StemDirection | null;
  // See INoteElement.tremolo.
  tremolo: TremoloValue | null;
  // See INoteElement.tremoloTuplet.
  tremoloTuplet: number | null;
  // See INoteElement.tremoloLabel.
  tremoloLabel: TremoloLabel | null;
  // See INoteElement.articulationRepeat.
  articulationRepeat: boolean;
  // See INoteElement.tieStyle.
  tieStyle: TieStyle;
  // See INoteElement.slurStyle.
  slurStyle: SlurStyle;
  // See INoteElement.breathMark.
  breathMark: BreathMark | null;
  // See INoteElement.swell.
  swell: boolean;
  // See INoteElement.dottedTieAcrossBarline.
  dottedTieAcrossBarline: boolean;
  // Default for every tone; a slotted <music-note>'s own notehead overrides
  // it. Triangles are not supported on chords.
  get notehead(): NoteheadType;
  set notehead(value: NoteheadType | null);
  // Resolved per tone, in `notes` order.
  readonly toneNoteheads: NoteheadType[];
  // The widest tone's INoteElement.headLeftOverhangPx.
  readonly headLeftOverhangPx: number;
  // Right ink edge (element px) of the duration dots, or null when undotted.
  readonly augmentationDotsRightEdgePx: number | null;
  stemExtension: number;
  noFlags: boolean;
  noStem: boolean;
  // See INoteElement.beamGroup.
  beamGroup: string | null;
  // See INoteElement.sharedStemFor.
  sharedStemFor: string | null;
  // See INoteElement.articulationStemAnchorBeamLevels.
  articulationStemAnchorBeamLevels: number | null;
  // See INoteElement.augmentationDotRows.
  augmentationDotRows: number[] | null;
  staffYCoordinates: number[] | null;
  noteAccidentals: (AccidentalType | null | undefined)[];
  /** Set by the staff: per tone, the shown accidental is a reminder. */
  noteAccidentalsParenthesized: boolean[];
  /** Per tone, in `notes` order: a slotted note's own `quarter-tone`. */
  readonly toneQuarterTones: (QuarterTone | null)[];
  /** Per tone: the chord's `accidental-reminder`, or the tone's own. */
  readonly toneAccidentalReminders: boolean[];
  tie: TieValue | null;
  slur: ConnectorRole | null;
  // `id` shared by every breakpoint note/chord of one continuous multi-leg
  // cross-staff phrase slur (the first/last note of each leg, never the
  // notes still covered by their own staff's ordinary beam). Resolved by
  // the ancestor <music-measure> / <music-composition>.
  slurGroup: string | null;
  /** Draw an `l.v.` label on a `tie="laissez-vibrer"` tie. */
  lvLabel: boolean;
  glissando: ConnectorRole | null;
  /** Text above the glissando line this starts. */
  glissandoHint: GlissandoHint | null;
  /** The contour of the glissando line this starts. Defaults to `straight`. */
  glissandoShape: GlissandoShape;
  /** A pitch bend: a line after each head, inside the chord's own duration. */
  bend: BendShape | null;
  /** Notes only; ignored, with a warning, on a chord. */
  bendTo: Note | null;
  /** Applies to `bendTo`. */
  bendToQuarterTone: QuarterTone | null;
  dynamic: DynamicMarking | null;
  /** Centers `dynamic` between this staff and its neighbor instead of locally. */
  dynamicShared: boolean;
  /** Draws `dynamic` in brackets, as a reminder (e.g. for a repeat's return). */
  dynamicReminder: boolean;
  /** Shows the accidental in force in parentheses, as a reminder. */
  accidentalReminder: boolean;
  crescendo: HairpinRole | null;
  decrescendo: HairpinRole | null;
  // Alias for decrescendo — always mirrors it.
  diminuendo: HairpinRole | null;
  articulation: ArticulationType | null;
  stress: StressType | null;
  // Arpeggio (rolled chord) sign drawn left of the element, spanning its
  // notehead range. On a lone note the sign is ~1 notehead tall.
  arpeggio: ArpeggioType | null;
  // `id` of the upper-staff element this element continues an unbroken
  // cross-staff arpeggio from (grand staff).
  arpeggioFor: string | null;
  // A dynamic change during the roll: a vertical hairpin wedge drawn just left
  // of the arpeggio sign, spanning the chord's vertical extent, with a dynamic
  // letter outside the staff at each end. Honoured only alongside a wave-variant
  // `arpeggio`.
  arpeggioHairpin: HairpinKind | null;
  // Dynamic letter at the start of the roll (bottom end for an upward roll).
  arpeggioHairpinFrom: DynamicMarking | null;
  // Dynamic letter at the end of the roll (top end for an upward roll).
  arpeggioHairpinTo: DynamicMarking | null;
  // Set false by an ancestor <music-measure> when this element is one end of a
  // continuous cross-staff arpeggio it draws itself; the element then skips its
  // own local sign. Not an attribute.
  renderArpeggioSign: boolean;
  // Marks the start / end of a `sempre arpeggiando` passage.
  arpeggiate: ConnectorRole | null;
  // Set by the staff to `'up'` for elements inside a `sempre arpeggiando`
  // passage that carry no explicit `arpeggio`; null otherwise. Not an attribute.
  impliedArpeggio: ArpeggioType | null;
  // Marks a trill start. The "tr" sign renders above the stave (or, standalone,
  // above the notehead). The trill line spans forward through this element's
  // own `tie` chain — no attribute is needed on the notes it continues into.
  trill: boolean;
  // 'auto' (default) draws the wavy extension line, matching standard
  // engraving practice; 'none' suppresses it (e.g. for a bare-sign-only
  // isolated, untied note-value).
  trillLine: TrillLineMode;
  // Draws a vertical end-notch here instead of letting the line run to the
  // next notehead.
  trillStop: boolean;
  // Overrides only the accidental of the trilling (auxiliary) pitch —
  // normally the diatonic upper neighbor as modified by the key signature.
  // Never changes the letter itself. Ignored (with a warning) when
  // `trillNote` is also set.
  trillAccidental: ConventionalAccidentalType | null;
  // Full override of the trilling pitch, drawn as a small parenthesized
  // notehead after the main one. Wins over `trillAccidental`.
  trillNote: Note | null;
  // Raises or lowers the trilling pitch by a quarter-tone, whether it comes
  // from `trillNote`, `trillAccidental` or the diatonic neighbor.
  trillQuarterTone: QuarterTone | null;
  // How a trill restates itself after a system break; read from the element
  // that starts the trill.
  trillContinuation: TrillContinuationMode;
  // Set by the staff to the resolved trilling pitch for a trill-marked
  // element. null when not trilling, or in standalone mode (trills render
  // nothing without a staff). Not an attribute.
  resolvedTrillPitch: ResolvedTrillPitch | null;
  // Staff-written px to raise the trill sign glyph above its own nominal
  // position, when another voice's own content occupies that territory in
  // a multi-voice staff. Not an attribute; mirrors stemExtension's own
  // staff-internal, non-author-set pattern.
  trillSignExtraLift: number;
  get grace(): Note[] | null;
  set grace(value: GraceNotesType);
  // Per-grace-note octave, aligned by index with `grace`. A null slot (or a
  // missing trailing slot) falls back to the host element's reference octave.
  get graceOctave(): (Octave | null)[] | null;
  set graceOctave(value: GraceOctavesType);
  // Per-grace-note quarter-tone, aligned by index with `grace`. A null slot
  // (or a missing trailing slot) is an ordinary pitch.
  get graceQuarterTone(): (QuarterTone | null)[] | null;
  set graceQuarterTone(value: GraceQuarterTonesType);
  // Per-grace-note articulation, aligned by index with `grace`. A null slot
  // (or a missing trailing slot) means no mark for that grace note.
  get graceArticulation(): (ArticulationType | null)[] | null;
  set graceArticulation(value: GraceArticulationsType);
  // Per-grace notehead aligned by index with grace; an empty slot is normal.
  get graceNotehead(): (NoteheadType | null)[] | null;
  set graceNotehead(value: GraceNoteheadsType);
  // Per grace note, how far its head reaches left of the ellipse head's edge
  // (px, at grace scale).
  readonly graceHeadLeftOverhangsPx: number[];
  graceType: GraceType;
  graceDuration: GraceDuration | null;
  graceSlur: GraceSlur;
  // Key-signature-resolved accidentals for the grace pitches, set by the
  // staff. null = standalone mode (suffix-driven accidentals).
  resolvedGraceAccidentals: (AccidentalType | null)[] | null;
  // A single dynamic for the whole grace group, independent of the host
  // note's own `dynamic`. Rendered by the staff under the first grace note.
  graceDynamic: DynamicMarking | null;
  // Grace note(s) placed *after* this element (a trill's finishing/closing
  // figure) rather than before it — same comma-separated-or-array shape as
  // `grace`. Always rendered as plain unslashed noteheads (no `grace-type`
  // equivalent) at a fixed eighth-note-or-group written value.
  get trillFinish(): Note[] | null;
  set trillFinish(value: GraceNotesType);
  // Per-trill-finish-note octave, aligned by index with `trillFinish` — same
  // shape and fallback behavior as `graceOctave`.
  get trillFinishOctave(): (Octave | null)[] | null;
  set trillFinishOctave(value: GraceOctavesType);
  // Per-trill-finish-note quarter-tone, aligned by index with `trillFinish`.
  get trillFinishQuarterTone(): (QuarterTone | null)[] | null;
  set trillFinishQuarterTone(value: GraceQuarterTonesType);
  // Which slur(s) a trill's finishing grace note(s) draw: back to this
  // element ('to-main', default), forward to the next element ('to-next'),
  // 'both', or 'none'.
  trillFinishSlur: TrillFinishSlur;
  // Key-signature-resolved accidentals for the trill-finish pitches, set by
  // the staff — same fallback shape as `resolvedGraceAccidentals`.
  resolvedTrillFinishAccidentals: (AccidentalType | null)[] | null;
  // Starts an octave-transposition span at this element. A repeated value
  // while a span carrying that same value is already open is a no-op that
  // continues the existing span rather than restarting a new one.
  octaveShift: OctaveShiftAmount | null;
  // Display mode for the span this element starts: `sign` (default, bare
  // numeral) or `col` (prose "col 8va"/"col 8va bassa" label). Meaningless
  // without a matching octaveShift.
  octaveMode: OctaveDisplayMode | null;
  // Closes the currently open octave-transposition span at this element,
  // inclusive.
  octaveStop: boolean;
  // Closes the currently open octave-transposition span at this element,
  // rendering a "loco" label alongside the closing corner — or, with no open
  // span, a standalone "(loco)" reminder.
  loco: boolean;
  // How an octave line restates itself after a system break; read from the
  // element that starts the span.
  octaveContinuation: OctaveContinuationMode;
  batchUpdate(fn: () => void): void;
}

export type GuitarFret = number | 'x';
export interface IGuitarNoteElement {
  fret: GuitarFret;
  string: number;
  duration: DurationType;
  tie: ConnectorRole | null;
  slur: ConnectorRole | null;
  hammerOn: ConnectorRole | null;
  pullOff: ConnectorRole | null;
  slide: ConnectorRole | null;
  // todo
  //bend: SOMETHING | null;
}

export interface IRestElement {
  duration: DurationType;
  // Right ink edge (element px) of the duration dots, or null when undotted.
  readonly augmentationDotsRightEdgePx: number | null;
  // Correlation key only — a rest never contributes to the beam polygon, but
  // shares INoteElement.beamGroup's `id` shape so a double-stemmed group can
  // tell "this rest belongs to me" for rest-placement purposes.
  beamGroup: string | null;
  // Author override for a rest that's a member of an active beam-group;
  // meaningless (inert) otherwise. Unset (null) = auto-classified by the
  // ancestor <music-measure> from the rest's position among its group's
  // members, re-derived on every render rather than persisted here.
  restStaffSide: RestStaffSide | null;
}

export interface IClefElement {
  clef: ClefType;
}

/** `<music-barline>` — a mid-bar barline in a staff's note stream. */
export interface IBarlineElement {
  type: BarlineType;
}

/**
 * `<music-tremolo>` — a two-note (or multi-note) tremolo: its notes or chords
 * are each written at the tremolo's full duration and together fill it once,
 * joined by tremolo beams.
 */
export interface ITremoloElement {
  strokes: TremoloStrokeCount;
  beamAttach: TremoloBeamAttach | null;
  beamPosition: TremoloBeamPosition | null;
  tremoloGroup: string | null;
  readonly flatElements: NoteChordOrRestElementType[];
}

export interface ITupletElement {
  ratio: TupletRatio;
  tupletGroup: string | null;
  placement: TupletPlacement | null;
  readonly flatElements: NoteChordOrRestElementType[];
}

/**
 * `<music-arpeggio>` — the written-out arpeggiated chord: a beamed run of
 * `<music-note>`s followed by the target `<music-chord>` (or a single
 * `<music-note>`), each run note tied to its matching-pitch chord tone. This is
 * the consecutive-pitch notation; the wavy vertical line is the `arpeggio`
 * attribute on `<music-note>` / `<music-chord>`.
 */
export interface IArpeggioElement {
  /** Note value drawn for run notes that have no `duration` of their own. */
  runDuration: DurationType;
  /** What to do with a run note whose pitch is not in the target chord. */
  unmatched: 'lv' | 'skip';
  /** Draw an `l.v.` label on the laissez-vibrer ties this group produces. */
  lvLabel: boolean;
  /** The run `<music-note>`s — every `<music-note>` child except the last element child. */
  readonly runElements: NoteElementType[];
  /** The target chord/note — the last element child, or null when malformed. */
  readonly targetElement: NoteOrChordElementType | null;
}

export interface IStaffElementBase {
  group: StaffGroupType | null;
  groupId: string | null;
  /** Short margin text to the left of the staff (e.g. "r.h."/"l.h."). */
  label: string | null;
  /** Names the part this staff carries, for a tab staff's `tab-for`. */
  part: string | null;
  time: TimeSignature;
  readonly staffHeight: number;
  readonly staffLineCount: number;
  readonly contentVerticalSpace: VerticalBand;
  /** How far the staff's notes and decorations reach above its top line. */
  readonly inkAboveTopLine: number;
  /** Right edge of the staff's own clef/key/time (or TAB) start area. */
  readonly ownNotesStartX: number;
  alignVerticalSpace(space: VerticalBand): boolean;
  reserveGapClearance(space: VerticalBand): boolean;
  reserveDecorationSpace(source: string, space: VerticalBand): boolean;
  respaceToCurrentWidth(): void;
}

export interface IStaffElement extends IStaffElementBase {
  keySig: Note;
  mode: Mode;
  clef: ClefType;
}

export type NoteElementType = HTMLElement & INoteElement;

/** A fixed staff position and notehead, e.g. a drum instrument's. */
export type StaffPosition = {
  note: NoteLetter;
  octave: Octave;
  notehead: NoteheadType;
};

export interface IDrumNoteElement extends INoteElement {
  // Drumset instrument; sets this note's staff position and notehead.
  get instrument(): PercussionInstrument | null;
  set instrument(value: PercussionInstrument | null | undefined);
}
export type DrumNoteElementType = HTMLElement & IDrumNoteElement;
export type ChordElementType = HTMLElement & IChordElement;
export type RestElementType = HTMLElement & IRestElement;
export type GuitarNoteElementType = HTMLElement & IGuitarNoteElement;
export type TupletElementType = HTMLElement & ITupletElement;
export type ArpeggioElementType = HTMLElement & IArpeggioElement;
export type TremoloElementType = HTMLElement & ITremoloElement;
export type ClefElementType = HTMLElement & IClefElement;
export type BarlineElementType = HTMLElement & IBarlineElement;
export type StaffElementBaseType = HTMLElement & IStaffElementBase;
export type StaffElementType = HTMLElement & IStaffElement;
export type NoteOrChordElementType = NoteElementType | ChordElementType;
export type NoteChordOrRestElementType =
  | NoteElementType
  | ChordElementType
  | RestElementType;
export type NoteLikeElementType =
  | NoteElementType
  | GuitarNoteElementType
  | ChordElementType;

// A mid-stream <music-clef> or mid-bar <music-barline>. `afterElementIndex`
// is the flat index of the entry it follows (-1: before any), always into
// voice 1, the only voice that carries markers.
export type StreamMarkerPlacement =
  | { kind: 'clef'; afterElementIndex: number; element: ClefElementType }
  | { kind: 'barline'; afterElementIndex: number; element: BarlineElementType };

// A valid <music-tremolo> found while flattening: the flat indices of its
// members, in order. Each member takes 1/N of its written duration.
export type TremoloGroupPlacement = {
  memberIndices: number[];
  element: TremoloElementType;
};

// A `<music-arpeggio>` group: flat indices of its run notes and target.
export type ArpeggioGroupPlacement = {
  runIndices: number[];
  targetIndex: number;
  element: ArpeggioElementType;
};

export type YCoordinates = Partial<Record<NoteLetterOctave, number>>;

export type KeySignatureYCoordinates = Partial<{
  [key in Note]: number[];
}>;

export type LyricSyllablePosition = {
  text: string;
  x: number;
  y: number;
  isMelisma: boolean;
  isHyphenated: boolean;
};

export interface ILyricsElement {
  verse: string;
  updatePositions(positions: LyricSyllablePosition[]): void;
}

export type LyricsElementType = HTMLElement & ILyricsElement;
