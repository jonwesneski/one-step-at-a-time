import {
  accidentalSymbolWidth,
  computeInterNoteSpacing,
  computeNoteAccidentals,
  parseAccidentalSuffix,
  suffixToType,
  totalChordAccidentalWidth,
} from './rules/accidentalRules';
import {
  computeArpeggioFootprintWidth,
  computeArpeggioHairpinFootprintWidth,
} from './rules/arpeggioRules';
import {
  barlineGlyphWidth,
  midBarBarlineSlotWidth,
} from './rules/barlineRules';
import type { BeamObstacle } from './rules/beamPlacementRules';
import { buildBeamsRenderer } from './rules/beamRules';
import {
  computeBeatOffsets,
  computeTremoloScaleByIndex,
  durationContribution,
} from './rules/beatRules';
import { computeAdjacentDisplacements } from './rules/chordRules';
import { CLEF_DEFINITIONS, getClefRenderData } from './rules/clefRules';
import type { CrossStaffTremoloRole } from './rules/crossStaffTremoloRules';
import { CrossStaffTupletRole } from './rules/crossStaffTupletRules';
import {
  type HairpinPair,
  pairHairpinsWithLeftovers,
} from './rules/dynamicsRules';
import {
  applyResolvedGraceAccidentals,
  buildGraceNoteDescriptors,
  computeFirstGraceHeadX,
  computeGraceFootprintWidth,
  computeGraceLayout,
} from './rules/graceRules';
import type {
  CrossStaffDynamicsOverride,
  DynamicsPlacement,
  DynamicsSide,
  StaffHairpinDefaults,
  StaffHairpinPlacement,
} from './rules/hairpinPlacementRules';
import {
  type EndWarnings,
  endWarningsEqual,
  endWarningWidth,
  type KeyChange,
  keyChangeEquals,
  type KeySignatureState,
  resolveCancellationNaturals,
  timeSignatureWidth,
} from './rules/keySignatureChangeRules';
import { computeAllowedElementCount } from './rules/measureRules';
import {
  forcedStemUp,
  isTriangle,
  resolveNoteheadGlyph,
  resolveStemTipY,
  resolveTriangleStaffYs,
  type TrianglePlacementEntry,
} from './rules/noteheadRules';
import {
  isOctaveRaise,
  OctaveSpan,
  resolveOctaveSpanExtremalStaffY,
  resolveOctaveSpans,
  splitOctaveSpanIntoRuns,
} from './rules/octaveRules';
import {
  type Component,
  type DescribeReminder,
  describeReminderEquals,
} from './rules/repeatWarningRules';
import { restToYCoordinate } from './rules/restRules';
import {
  computeMeasureProportionalOffsets,
  computeSpacingWeights,
} from './rules/spacingRules';
import { getStaffYs } from './rules/staffNoteRules';
import {
  calculateStaffMinWidth,
  calculateStaffNaturalWidth,
  computeMinimumEntryAdvance,
  type StaffStrutInputs,
} from './rules/staffWidth';
import {
  determineVoiceStemDirections,
  unbeamedStemExtensionPx,
} from './rules/stemRules';
import {
  activeClefChangeIndex,
  MARKER_BEAT_EPSILON,
  type MarkerBeat,
  markerBeat,
  markerWidthReached,
  mergeMarkerBeats,
  totalMarkerWidth,
} from './rules/streamMarkerRules';
import {
  durationToBase,
  durationToDotCount,
  durationToFlagCountMap,
  isStemlessDuration,
} from './rules/theoryConsts';
import { extrapolateYCoordinate } from './rules/theoryHelpers';
import {
  STAFF_BAND,
  stemlessTremoloReachPx,
  tremoloInkPastStemPx,
  unbeamedTremoloStemExtensionPx,
} from './rules/tremoloRules';
import {
  resolveTrillPitch,
  resolveTrillSpans,
  type TrillLineSpan,
} from './rules/trillRules';
import {
  buildTupletGroups,
  computeOuterBracketBaseY,
  computeTupletBracketGeometry,
  computeTupletScaleByIndex,
  getStaffYForIndex,
  naturalStemTipY,
  noteheadEdgeY,
  resolveTupletBracketAbove,
  stemTipYFromStaffY,
  TupletBracketGeometry,
  TupletGroup,
} from './rules/tupletRules';
import {
  resolveStemlessClusters,
  type UnisonPartDescriptor,
} from './rules/unisonRules';
import {
  CombinedGroup,
  detectCombinableGroups,
  VoiceCombineInput,
} from './rules/voiceCombineRules';
import {
  detectSharedWholeMeasureRest,
  sharedRestGlyphX,
} from './rules/voiceRestRules';
import {
  computeCrossVoiceDisplacements,
  resolveCrossVoiceDotRows,
  resolveVoiceDirections,
  VoiceDirection,
  VoiceDirectionInput,
  VoiceNoteheadPlacement,
  VoicePartGeometry,
} from './rules/voiceRules';
import {
  type BarlineSlotLeft,
  type EndWarningSpace,
  StaffElementBase,
} from './staffBase';
import type {
  ArpeggioGroupPlacement,
  ChordElementType,
  ChordNote,
  IChordElement,
  INoteElement,
  NoteChordOrRestElementType,
  NoteElementType,
  NoteLetterOctave,
  NoteOrChordElementType,
  RestElementType,
  StreamMarkerPlacement,
  TremoloElementType,
  TremoloGroupPlacement,
  TupletElementType,
  UnisonPart,
  YCoordinates,
} from './types/elements';
import type {
  AccidentalType,
  ArpeggioType,
  BarlineType,
  BeatsInMeasure,
  BeatTypeInMeasure,
  ClefType,
  DurationType,
  DynamicMarking,
  HairpinKind,
  Mode,
  Note,
  NoteLetter,
  Octave,
  OctaveShiftAmount,
  TimeSignature,
  TremoloLabel,
  TupletPlacement,
  VoiceNumber,
} from './types/theory';
import {
  BeamsBuilder,
  computeYHeadOffset,
  createBarlineSvg,
  createDynamicMarkingSvg,
  createFlatSvg,
  createHairpinSvg,
  createNaturalSvg,
  createOctaveCornerSvg,
  createOctaveExtensionLineSvg,
  createOctaveLocoLabelSvg,
  createOctaveSignSvg,
  createOrnamentConnectorSlur,
  createParenthesisSvg,
  createSempreArpeggiandoText,
  createSharpSvg,
  createStartRepeatSvg,
  createTimeSignatureSvg,
  NOTE_HEAD_RADIUS_PX,
  NOTE_HEAD_Y_OFFSET_CORRECTION,
  octaveSignWidth,
  TRILL_FINISH_HEAD_RY,
  trillFinishTailOverhangPx,
} from './utils';
import {
  CLEF_EVENTS,
  COMMON_ATTRIBUTES,
  isStaffNodeName,
  MUSIC_ARPEGGIO_NODE,
  MUSIC_BARLINE_NODE,
  MUSIC_CHORD,
  MUSIC_CHORD_NODE,
  MUSIC_CLEF_NODE,
  MUSIC_COMPOSITION,
  MUSIC_MEASURE,
  MUSIC_NOTE,
  MUSIC_NOTE_NODE,
  MUSIC_REST,
  MUSIC_REST_NODE,
  MUSIC_TREMOLO_NODE,
  MUSIC_TUPLET_NODE,
  MUSIC_VOICE_NODE,
  NOTE_EVENTS,
  STAFF_EVENTS,
  STAFF_TAGS,
  SVG_NS,
  TREMOLO_EVENTS,
  TUPLET_EVENTS,
} from './utils/consts';
import {
  ACCIDENTAL_SYMBOL_HEIGHT,
  ARPEGGIO_HAIRPIN_DYNAMIC_GAP_PX,
  ARPEGGIO_HAIRPIN_VERTICAL_OVERSHOOT_PX,
  ARPEGGIO_TEXT_ABOVE_STAFF_PX,
  ARPEGGIO_TEXT_FONT_SIZE,
  BARLINE_THICK_PX,
  BASE_STEM_LENGTH_PX,
  BEAM_THICKNESS_PX,
  CLEF_CHANGE_RESERVED_WIDTH_PX,
  CLEF_X_OFFSET,
  CLUSTER_BRACKET_RISE_PX,
  COURTESY_CLEF_SCALE,
  COURTESY_CLEF_WIDTH_PX,
  CROSS_STAFF_TUPLET_BEAM_Y_EPSILON_PX,
  DYNAMICS_ABOVE_BASELINE_Y,
  DYNAMICS_BASELINE_Y,
  DYNAMICS_FONT_SIZE,
  END_WARNING_GAP_PX,
  GRACE_MAIN_GAP_PX,
  HAIRPIN_OPEN_HEIGHT,
  KEY_SIG_CANCEL_GAP_PX,
  KEY_SIG_FLAT_WIDTH,
  KEY_SIG_FLAT_Y_OFFSET,
  KEY_SIG_NATURAL_WIDTH,
  KEY_SIG_NATURAL_Y_OFFSET,
  KEY_SIG_SHARP_WIDTH,
  LEADING_NOTE_GAP_PX,
  MID_BAR_BARLINE_PADDING_PX,
  MID_BAR_WARNING_CLEF_WIDTH_PX,
  MID_STREAM_CLEF_SVG_HEIGHT_PX,
  MID_STREAM_CLEF_WIDTH_PX,
  MID_STREAM_CLEF_Y_OFFSET,
  MIN_NOTE_WIDTH,
  NOTE_AFTER_UP_TAIL_EXTRA_ADVANCE_PX,
  NOTES_AREA_LEFT_MARGIN,
  OCTAVE_LOCO_ESTIMATED_WIDTH_PX,
  OCTAVE_LOCO_GAP_PX,
  OCTAVE_SIGN_ABOVE_STAFF_Y,
  OCTAVE_SIGN_BELOW_STAFF_Y,
  OCTAVE_SIGN_CORNER_PX,
  OCTAVE_SIGN_LEADING_GAP_PX,
  OCTAVE_SIGN_NOTEHEAD_CLEARANCE_PX,
  OCTAVE_SIGN_TRAILING_GAP_PX,
  REMINDER_PAREN_GAP_PX,
  REMINDER_PAREN_OVERHANG_PX,
  REMINDER_PAREN_WIDTH_PX,
  REPEAT_START_LEAD_PX,
  REST_AFTER_DOWN_TAIL_EXTRA_ADVANCE_PX,
  REST_AFTER_UP_TAIL_EXTRA_ADVANCE_PX,
  STAFF_BOTTOM_LINE_Y,
  STAFF_LINE_SPACING,
  STAFF_LINE_START,
  STAFF_TOP_LINE_Y,
  STAFF_TRANSCRIPTION_HEIGHT,
  STAFF_Y_PADDING,
  STAFF_Y_STEP,
  TIME_SIG_GLYPH_CENTER_X_PX,
  TIME_SIG_Y_TRANSLATE,
  TREMOLO_LABEL_FONT_SIZE_PX,
  TREMOLO_LABEL_GAP_PX,
  TRIANGLE_OUTSIDE_STAFF_PX,
  TRIANGLE_RUN_CLEARANCE_PX,
  TRILL_ABOVE_STAFF_GAP_PX,
  TRILL_ACCIDENTAL_GAP_PX,
  TRILL_ACCIDENTAL_SCALE,
  TRILL_LINE_END_GAP_PX,
  TRILL_SIGN_HEIGHT_PX,
  TRILL_SIGN_LINE_GAP_PX,
  TRILL_WRITTEN_NOTE_GAP_PX,
  TUPLET_HOOK_LENGTH_PX,
  TUPLET_NUMERAL_BEAM_GAP_PX,
  TUPLET_NUMERAL_FONT_SIZE,
  TUPLET_STAFF_CLEARANCE_PX,
} from './utils/notationDimensions';
import {
  flattenStaffSlotElements,
  VoiceFlattenResult,
} from './utils/slotElements';
import { articulationStackDepth } from './utils/svgCreator/articulations';
import {
  chordHeadExtentPx,
  chordToneHeadCenterY,
  chordToneHeadExtentPx,
} from './utils/svgCreator/chord';
import {
  ACCIDENTAL_NOTE_GAP,
  flagStemExtensionPx,
  NOTE_SCALE,
  NOTE_SVG_WIDTH,
  noteHeadGeometry,
  stemTipPosition,
  TAIL_UP_WIDTH_PX,
  trillSignLeftX,
} from './utils/svgCreator/note';
import {
  createTremoloLabel,
  tremoloLabelWidthPx,
} from './utils/svgCreator/tremolo';
import {
  computeWrittenTrillNoteWidth,
  createTrillLineSvg,
  createTrillNotchSvg,
  createWrittenTrillNoteSvg,
  TRILL_SIGN_WIDTH_PX,
} from './utils/svgCreator/trill';
import { createTupletBracketSvg } from './utils/svgCreator/tuplet';
import { createUnisonBracketSvg } from './utils/svgCreator/unison';

// The `Note` suffix for an accidental — the inverse of
// rules/accidentalRules.ts's parseAccidentalSuffix/suffixToType, needed to
// rebuild a resolved trilling pitch (letter + AccidentalType) into a `Note`
// string for noteToYCoordinate.
function accidentalSuffix(accidental: AccidentalType | null): string {
  switch (accidental) {
    case 'sharp':
      return '#';
    case 'flat':
      return 'b';
    case 'double-sharp':
      return '##';
    case 'double-flat':
      return 'bb';
    default:
      return '';
  }
}

// Undoes what the staff's cross-voice pass sets on an element, so a note or
// chord that leaves the staff draws as its own again.
function resetCrossVoiceState(
  element: NoteElementType | ChordElementType
): void {
  element.augmentationDotRows = null;
  if (element.nodeName === MUSIC_NOTE_NODE) {
    (element as NoteElementType).unisonPart = null;
    (element as NoteElementType).augmentationDotShiftPx = 0;
  }
}

// The arpeggio sign a note/chord actually draws — its own `arpeggio` if set,
// otherwise a `sempre arpeggiando` passage's implied one.
function effectiveArpeggio(element: NoteElementType | ChordElementType) {
  return element.arpeggio ?? element.impliedArpeggio;
}

// The arpeggio that reserves this element's leftward footprint: its own sign,
// an implied `sempre arpeggiando` sign, or the measure-drawn wave on an
// `arpeggio-for` end. Every variant reserves the same width.
function footprintArpeggio(element: NoteElementType | ChordElementType) {
  return (
    effectiveArpeggio(element) ?? (element.arpeggioFor !== null ? 'up' : null)
  );
}

const isArpeggioWave = (arpeggio: ArpeggioType | null): boolean =>
  arpeggio === 'up' || arpeggio === 'up-arrow' || arpeggio === 'down';

// A trill sign's/line's bottom edge, at a fixed height above the top line
// whatever the pitch (matches svgCreator/note.ts's trillSignBottomY).
const TRILL_ABOVE_STAFF_BOTTOM_Y =
  STAFF_Y_PADDING +
  STAFF_TOP_LINE_Y -
  NOTE_HEAD_Y_OFFSET_CORRECTION -
  TRILL_ABOVE_STAFF_GAP_PX;

// The note/chord paired with this one in a cross-staff arpeggio, in either
// direction of `arpeggio-for`. Only a partner on a different staff of the same
// <music-measure> counts; the measure then draws the span.
function crossStaffArpeggioPartner(
  element: NoteElementType | ChordElementType
): NoteElementType | ChordElementType | null {
  const measure = element.closest(MUSIC_MEASURE);
  if (measure === null) {
    return null;
  }
  let candidate: Element | null = null;
  if (element.arpeggioFor !== null) {
    const wantedId = element.arpeggioFor;
    candidate =
      Array.from(measure.querySelectorAll('[id]')).find(
        (other) => other.id === wantedId
      ) ?? null;
  } else if (element.id !== '') {
    candidate =
      Array.from(measure.querySelectorAll('[arpeggio-for]')).find(
        (other) => other.getAttribute('arpeggio-for') === element.id
      ) ?? null;
  }
  if (
    candidate === null ||
    (candidate.nodeName !== MUSIC_NOTE_NODE &&
      candidate.nodeName !== MUSIC_CHORD_NODE) ||
    candidate.closest(STAFF_TAGS) === element.closest(STAFF_TAGS)
  ) {
    return null;
  }
  return candidate as NoteElementType | ChordElementType;
}

// The hairpin whose leftward footprint this element reserves — its own
// `arpeggioHairpin` alongside an effective rolled wave, or the one authored on
// its cross-staff partner (the continuous hairpin the measure draws spans both
// ends and aligns to whichever sits further left, so both ends must reserve it).
function footprintArpeggioHairpin(
  element: NoteElementType | ChordElementType,
  partner: NoteElementType | ChordElementType | null
): {
  kind: HairpinKind;
  from: DynamicMarking | null;
  to: DynamicMarking | null;
} | null {
  if (
    element.arpeggioHairpin !== null &&
    isArpeggioWave(footprintArpeggio(element))
  ) {
    return {
      kind: element.arpeggioHairpin,
      from: element.arpeggioHairpinFrom,
      to: element.arpeggioHairpinTo,
    };
  }
  if (partner !== null && partner.arpeggioHairpin !== null) {
    return {
      kind: partner.arpeggioHairpin,
      from: partner.arpeggioHairpinFrom,
      to: partner.arpeggioHairpinTo,
    };
  }
  return null;
}

// A stem-down chord's adjacent second shifts its head left by
// ADJACENT_NOTE_X_DISPLACEMENT_PX, past the notehead inset the arpeggio
// footprint constants assume — reserve that delta when the chord shows a sign.
function chordLeftHeadDisplacementPx(chord: ChordElementType): number {
  const coords = chord.staffYCoordinates;
  if (coords === null || coords.length < 2) {
    return 0;
  }
  return Math.max(
    0,
    ...computeAdjacentDisplacements(coords, chord.stemUp).map(
      (displacement) => -displacement.xOffset
    )
  );
}

// Whether a note/chord currently shows an accidental — the arpeggio sign sits
// left of the accidental column, so its reserved footprint depends on this.
function elementHasShownAccidental(
  element: NoteElementType | ChordElementType
): boolean {
  if (element.nodeName === MUSIC_NOTE_NODE) {
    return (element as NoteElementType).showAccidental != null;
  }
  const chord = element as ChordElementType;
  return (
    !!chord.staffYCoordinates && chord.noteAccidentals.some((a) => a != null)
  );
}

// A real voice number, or one of the two synthetic v1-scoped tracks: a
// combined-voices stem (rules/voiceCombineRules.ts) or the shared whole-bar
// rest (rules/voiceRestRules.ts).
type VoiceKey = VoiceNumber | 'combined' | 'shared-rest';

// One real voice's resolved Y-coordinates — the shared shape Pass 1.5
// precomputes per voice (for resolveVoiceDirections' 3-voice heuristic) and
// hands to #buildVoiceRenderState so it isn't recomputed there too.
type VoiceStaffYCoords = {
  noteStaffYCoords: Map<NoteElementType, number>;
  chordStaffYCoords: Map<ChordElementType, number[]>;
};

// One octave line crossing a barline, as it touches this staff — see
// StaffClassicalElementBase#octaveContinuations.
type OctaveContinuationRow = {
  rowY: number;
  raisesPitch: boolean;
  starts: boolean;
};

function tremoloLabelOf(
  element: NoteChordOrRestElementType
): TremoloLabel | null {
  return element.nodeName === MUSIC_REST_NODE
    ? null
    : (element as NoteElementType | ChordElementType).tremoloLabel ?? null;
}

// One voice's snapshot of a render pass; one per active VoiceKey.
type VoiceRenderState = {
  elements: NoteChordOrRestElementType[];
  beatOffsets: number[];
  tupletsByIndex: Map<number, TupletElementType[]>;
  tupletGroups: TupletGroup[];
  beamRenderer: ReturnType<BeamsBuilder['buildRenderer']> | null;
  stemDirections: boolean[];
  // What each unbeamed stem draws beyond the base length, from the head it
  // starts at (chord spread and tails included). 0 for beamed entries, whose
  // tips come from the beam line, and for stemless ones.
  unbeamedStemTipExtensionsPx: number[];
  // How far each entry's tremolo reaches past its stem's end on the stem
  // side (a numeral, or a stemless head's strokes); counted as stem ink.
  tremoloInkPastStemPx: number[];
  // Each `<music-tremolo>` member's share of its written value.
  tremoloScaleByIndex: Map<number, number>;
  beamedIndices: Set<number>;
  // Indices whose stemExtension the ancestor <music-measure> writes (beam-group
  // and cross-staff tremolo members). Every staff-local stemExtension write
  // must skip them, or the next re-render resets them to 0.
  externallyBeamedIndices: ReadonlySet<number>;
  // Rest indices whose Y the ancestor <music-measure> writes; #spaceElements()
  // skips them.
  externallyPositionedRestIndices: ReadonlySet<number>;
  noteStaffYCoords: Map<NoteElementType, number>;
  chordStaffYCoords: Map<ChordElementType, number[]>;
  noteXPositions: Map<number, number>;
  firstGraceHeadXPositions: Map<number, number>;
  writtenTrillFootprints: Map<number, number>;
  trillFinishFootprints: Map<number, number>;
  // The voice policy's stem direction; null for a pitch-driven track (a
  // single-voice staff, or the 'combined' track).
  direction: VoiceDirection | null;
};

// How far `oldIndex` shifts down once every index in `removedIndices` has
// been spliced out; re-anchors a voice's tupletsByIndex/arpeggioGroups after
// auto-combine removes its matched entries.
function remapIndexAfterRemoval(
  oldIndex: number,
  removedIndices: ReadonlySet<number>
): number {
  let shift = 0;
  for (const removed of removedIndices) {
    if (removed < oldIndex) {
      shift++;
    }
  }
  return oldIndex - shift;
}

function reindexTupletsByIndex(
  tupletsByIndex: ReadonlyMap<number, TupletElementType[]>,
  removedIndices: ReadonlySet<number>
): Map<number, TupletElementType[]> {
  const result = new Map<number, TupletElementType[]>();
  for (const [oldIndex, tuplets] of tupletsByIndex) {
    // Defensive: a combine-eligible entry is never a tuplet member.
    if (removedIndices.has(oldIndex)) {
      continue;
    }
    result.set(remapIndexAfterRemoval(oldIndex, removedIndices), tuplets);
  }
  return result;
}

function reindexTremoloGroups(
  groups: readonly TremoloGroupPlacement[],
  removedIndices: ReadonlySet<number>
): TremoloGroupPlacement[] {
  return groups.map((group) => ({
    ...group,
    memberIndices: group.memberIndices.map((i) =>
      remapIndexAfterRemoval(i, removedIndices)
    ),
  }));
}

function reindexArpeggioGroups(
  groups: readonly ArpeggioGroupPlacement[],
  removedIndices: ReadonlySet<number>
): ArpeggioGroupPlacement[] {
  return groups.map((group) => ({
    ...group,
    runIndices: group.runIndices.map((i) =>
      remapIndexAfterRemoval(i, removedIndices)
    ),
    targetIndex: remapIndexAfterRemoval(group.targetIndex, removedIndices),
  }));
}

type ClefMarker = Extract<StreamMarkerPlacement, { kind: 'clef' }>;
// One part of a mid-row describe area: a change, or a bracketed reminder.
type DescribeItem = { component: Component; bracketed: boolean };
type MarkerSlot = {
  marker: MarkerBeat;
  /** Index into the measure-wide marker list. */
  layoutIndex: number;
  clef: ClefMarker | null;
};

export abstract class StaffClassicalElementBase extends StaffElementBase {
  static get observedAttributes(): string[] {
    // All attributes need to be all lower case because jsdom lowers then
    // in it's life-cycle
    return [
      COMMON_ATTRIBUTES.KEY_SIG,
      COMMON_ATTRIBUTES.MODE,
      COMMON_ATTRIBUTES.TIME,
      'group',
      'group-id',
      'label',
      'part',
    ];
  }

  #effectiveMode: Mode;
  #effectiveKeySig: Note;
  #describeContainer: SVGGElement;
  // Kept apart from #describeContainer so the describe area's own extent
  // decides where a start repeat goes.
  #startRepeatContainer: SVGGElement;
  #midBarBarlinesContainer: SVGGElement;
  #ownDescribeEndX = 0;
  #currentStrutInputs: StaffStrutInputs | null = null;
  #showDescribe = true;
  #clefChangeAtBoundary = false;
  #timeChangeAtBoundary = false;
  #keyChangeAtBoundary: KeyChange | null = null;
  #describeReminder: DescribeReminder | null = null;
  // Beat of each mid-bar end repeat → the clef to reinstate before it.
  #markerWarnings: ReadonlyMap<number, ClefType> = new Map();
  #endWarnings: EndWarnings | null = null;
  #endWarningsContainer: SVGGElement;
  #crossStaffBeamStemOverrides: ReadonlyMap<
    NoteChordOrRestElementType,
    boolean
  > | null = null;
  #crossStaffTupletBeamY: ReadonlyMap<
    NoteChordOrRestElementType,
    number
  > | null = null;
  #crossStaffTupletRoles: ReadonlyMap<
    TupletElementType,
    CrossStaffTupletRole
  > | null = null;
  #crossStaffTremoloRoles: ReadonlyMap<
    TremoloElementType,
    CrossStaffTremoloRole
  > | null = null;
  #crossStaffDynamicsOverrides: ReadonlyMap<
    NoteOrChordElementType,
    CrossStaffDynamicsOverride
  > | null = null;
  #crossStaffOctaveBreakAfter: ReadonlySet<NoteChordOrRestElementType> | null =
    null;
  #octaveContinuations: ReadonlyMap<Element, OctaveContinuationRow> | null =
    null;
  #streamMarkers: StreamMarkerPlacement[] = [];
  // #streamMarkers' clef changes, refreshed whenever it changes.
  #clefMarkers: ClefMarker[] = [];
  // Where each mid-bar barline's slot would sit from this staff's own
  // entries, per #spaceElements() pass (see ownBarlineSlotLefts).
  #ownBarlineSlotLefts: BarlineSlotLeft[] = [];
  // Voice 1's beat-offsets, per #renderNotes() pass: clef markers and
  // noteToYCoordinate()'s `elementIndex` both index into voice 1.
  #voice1BeatOffsets: number[] = [];
  // Where each of voice 1's entries ends, from the same pass: a clef change
  // takes effect at the end of the entry it follows (#clefMarkerBeatOffset).
  #voice1BeatEnds: number[] = [];
  // Every voice's elements' beat-offsets from the same pass — see
  // beatOffsetOf().
  #beatOffsetByElement = new Map<Element, number>();
  // Voice-partitioned flattening result (always >=1 entry — see
  // flattenStaffSlotElements()).
  #voices: Map<VoiceNumber, VoiceFlattenResult> = new Map();
  // One VoiceRenderState per active voice key.
  #voiceRenderStates: Map<VoiceKey, VoiceRenderState> = new Map();
  // One per voice key (#containerFor), hidden rather than removed when the
  // key goes inactive.
  #beamsContainers: Map<VoiceKey, SVGSVGElement> = new Map();
  #tupletContainers: Map<VoiceKey, SVGSVGElement> = new Map();
  #dynamicsContainers: Map<VoiceKey, SVGSVGElement> = new Map();
  #trillLinesContainers: Map<VoiceKey, SVGSVGElement> = new Map();
  // One staff-wide overlay (key 1): a unison's diagonal stems and cluster brackets.
  #unisonContainers: Map<VoiceKey, SVGSVGElement> = new Map();
  #warnedSemibreveOverlap = false;
  // Every note and chord the last pass laid out: what it set on them (dot
  // rows, unison parts) is cleared once they leave.
  #crossVoiceElements = new Set<NoteElementType | ChordElementType>();
  // Px a unison on an entry's beat moves a part right, per voice and index:
  // the entry after it keeps clear of that (see #reserveUnisonRoom).
  #unisonReserves = new Map<VoiceKey, Map<number, number>>();
  #octaveSignsContainers: Map<VoiceKey, SVGSVGElement> = new Map();
  #tremoloLabelContainers: Map<VoiceKey, SVGSVGElement> = new Map();
  #boundDrawConnectors = (event?: Event) => {
    const path =
      (event as CustomEvent | undefined)?.composedPath?.() ??
      ([] as EventTarget[]);
    if (
      path.some(
        (node) =>
          (node as Node)?.nodeName === MUSIC_ARPEGGIO_NODE ||
          (node as Node)?.nodeName === MUSIC_VOICE_NODE
      )
    ) {
      // A <music-arpeggio> or <music-voice> changed — re-flatten so bar-fit /
      // beams / voice partitioning re-resolve, then the tie overlay redraws too.
      this.#reRenderFromCurrentSlot();
      return;
    }
    // A trill span's end and a written trilling notehead's footprint depend
    // on `tie`, so with a trill present a tie change needs a full re-layout.
    if (this.#hasTrillMarkedElement()) {
      this.#boundNoteYChange();
      return;
    }
    this.drawConnectorsWhenStandalone();
  };
  #boundRenderDynamics = () => {
    for (const [voiceKey, container] of this.#dynamicsContainers) {
      container.innerHTML = '';
      this.#renderDynamics(voiceKey);
    }
  };
  #boundRenderOctaveSigns = () => {
    for (const [voiceKey, container] of this.#octaveSignsContainers) {
      container.innerHTML = '';
      this.#renderOctaveSigns(voiceKey);
    }
  };
  #boundNoteYChange = (event?: Event) => {
    if (this.#voices.size === 0) {
      return;
    }
    // A tremolo member's change can make or break its group (every member
    // shares one duration), which only flattening decides.
    const target = event?.target as Element | null | undefined;
    if (target?.parentElement?.nodeName === MUSIC_TREMOLO_NODE) {
      this.#reRenderFromCurrentSlot();
      return;
    }
    this.#renderNotes();
  };
  // A <music-tremolo>'s children, and which it accepts (its `tremolo-group`),
  // decide its members.
  #boundTremoloChange = () => {
    if (this.#voices.size > 0) {
      this.#reRenderFromCurrentSlot();
    }
  };
  #boundClefMarkerChange = () => {
    if (this.#voices.size > 0) {
      this.#renderNotes();
    }
  };

  // Where the clef/key/time area ends: this staff's own, or the widest in
  // its measure so every staff starts its notes at the same x.
  protected get describeEndX(): number {
    return Math.max(this.#ownDescribeEndX, this.measureNotesStartX);
  }

  /**
   * The staff's voice-partitioned flattening result (always >=1 entry — see
   * flattenStaffSlotElements()).
   */
  protected get voices(): ReadonlyMap<VoiceNumber, VoiceFlattenResult> {
    return this.#voices;
  }

  // Every active voice key's elements, concatenated in key order.
  get #allElements(): NoteChordOrRestElementType[] {
    return [...this.#voiceRenderStates.values()].flatMap((s) => s.elements);
  }

  // One container per voice, created on first use, so one voice's
  // clear-and-rebuild never clobbers another's decorations.
  #containerFor(
    containers: Map<VoiceKey, SVGSVGElement>,
    voiceKey: VoiceKey,
    cssClass: string
  ): SVGSVGElement {
    const existing = containers.get(voiceKey);
    if (existing) {
      return existing;
    }
    const container = document.createElementNS(SVG_NS, 'svg');
    container.classList.add(cssClass);
    container.style.overflow = 'visible';
    container.style.pointerEvents = 'none';
    this.transcribeContainer.appendChild(container);
    containers.set(voiceKey, container);
    return container;
  }

  // Clears every container and hides those not in `activeKeys`, so a voice
  // that disappears leaves nothing stale.
  #prepareVoiceContainers(
    containers: Map<VoiceKey, SVGSVGElement>,
    activeKeys: ReadonlySet<VoiceKey>
  ): void {
    for (const [voiceKey, container] of containers) {
      container.innerHTML = '';
      container.style.display = activeKeys.has(voiceKey) ? '' : 'none';
    }
  }

  /**
   * What the widest voice's widths were summed from, set on every #renderNotes()
   * pass; null with no entries. StaffVocalElement re-scores it against lyrics.
   */
  protected get currentStrutInputs(): StaffStrutInputs | null {
    return this.#currentStrutInputs;
  }

  get showDescribe(): boolean {
    return this.#showDescribe;
  }

  set showDescribe(value: boolean) {
    if (this.#showDescribe === value) {
      return;
    }
    this.#showDescribe = value;
    this.#refreshDescribe();
  }

  // Set by composition.ts when this staff starts a new visual row and its
  // effectiveStartClef differs from the previous row's matching staff's
  // effectiveEndClef — keeps the clef glyph visible (but not key/time
  // signature) even though showDescribe is false for non-first-in-row staves.
  get clefChangeAtBoundary(): boolean {
    return this.#clefChangeAtBoundary;
  }

  set clefChangeAtBoundary(value: boolean) {
    if (this.#clefChangeAtBoundary === value) {
      return;
    }
    this.#clefChangeAtBoundary = value;
    this.#refreshDescribe();
  }

  // Set by composition.ts when this staff's resolved time signature differs
  // from the previous measure's — keeps the time signature glyph visible even
  // though this isn't the first measure in the composition.
  get timeChangeAtBoundary(): boolean {
    return this.#timeChangeAtBoundary;
  }

  set timeChangeAtBoundary(value: boolean) {
    if (this.#timeChangeAtBoundary === value) {
      return;
    }
    this.#timeChangeAtBoundary = value;
    this.#refreshDescribe();
  }

  // Set by composition.ts when this bar's key signature differs from the
  // previous bar's: mid-row, the describe area draws the cancellation
  // naturals and the new key.
  get keyChangeAtBoundary(): KeyChange | null {
    return this.#keyChangeAtBoundary;
  }

  set keyChangeAtBoundary(value: KeyChange | null) {
    if (keyChangeEquals(this.#keyChangeAtBoundary, value)) {
      return;
    }
    this.#keyChangeAtBoundary = value;
    this.#refreshDescribe();
  }

  // Set by composition.ts on a later ending's first bar: the clef/key/time
  // the music resumes in, drawn in brackets as a reminder.
  get describeReminder(): DescribeReminder | null {
    return this.#describeReminder;
  }

  set describeReminder(value: DescribeReminder | null) {
    const next =
      value !== null && (value.clef || value.key || value.time)
        ? { ...value }
        : null;
    if (describeReminderEquals(this.#describeReminder, next)) {
      return;
    }
    this.#describeReminder = next;
    this.#refreshDescribe();
  }

  // Set by composition.ts: the clef reinstated before each mid-bar end
  // repeat, by the barline's beat.
  get markerWarnings(): ReadonlyMap<number, ClefType> {
    return this.#markerWarnings;
  }

  set markerWarnings(value: ReadonlyMap<number, ClefType>) {
    const current = this.#markerWarnings;
    const unchanged =
      current.size === value.size &&
      [...value].every(([beat, clef]) =>
        [...current].some(
          ([other, otherClef]) =>
            Math.abs(other - beat) <= MARKER_BEAT_EPSILON && otherClef === clef
        )
      );
    if (unchanged) {
      return;
    }
    this.#markerWarnings = new Map(value);
    if (this.#voices.size > 0) {
      this.#renderNotes();
    }
  }

  #markerWarningAt(beat: number): ClefType | null {
    for (const [other, clef] of this.#markerWarnings) {
      if (Math.abs(other - beat) <= MARKER_BEAT_EPSILON) {
        return clef;
      }
    }
    return null;
  }

  // The clef in force at `beat` of this bar (a whole-note fraction).
  clefAtBeat(beat: number): ClefType | null {
    return this.#activeClefAt(beat) ?? this.ownClef;
  }

  // The clef, key and time this staff warns of before its end barline, set
  // by composition.ts.
  get endWarnings(): EndWarnings | null {
    return this.#endWarnings;
  }

  set endWarnings(value: EndWarnings | null) {
    if (endWarningsEqual(this.#endWarnings, value)) {
      return;
    }
    this.#endWarnings = value;
    if (this.#voices.size > 0) {
      this.#renderNotes();
    }
  }

  override get ownEndWarningSpace(): EndWarningSpace {
    const width = endWarningWidth(this.#endWarnings);
    return {
      width,
      reserved: this.#endWarnings?.reservesWidth === true ? width : 0,
    };
  }

  get effectiveKeySignature(): KeySignatureState {
    return { keySig: this.#effectiveKeySig, mode: this.#effectiveMode };
  }

  // Set by the ancestor <music-measure> for cross-staff double-stemmed beam
  // members, `true` meaning stem-up. Keyed by element, since each voice reads
  // it against its own local array. The measure rebuilds the map on every
  // relayout and a change re-renders (which re-fires STAFF_MIN_WIDTH), so the
  // setter compares content to avoid looping.
  get crossStaffBeamStemOverrides(): ReadonlyMap<
    NoteChordOrRestElementType,
    boolean
  > | null {
    return this.#crossStaffBeamStemOverrides;
  }

  set crossStaffBeamStemOverrides(
    value: ReadonlyMap<NoteChordOrRestElementType, boolean> | null
  ) {
    const current = this.#crossStaffBeamStemOverrides;
    const unchanged =
      current === value ||
      (current !== null &&
        value !== null &&
        current.size === value.size &&
        [...current].every(
          ([element, stemUp]) => value.get(element) === stemUp
        ));
    if (unchanged) {
      return;
    }
    this.#crossStaffBeamStemOverrides = value;
    this.#renderNotes();
  }

  // Set by the ancestor <music-measure> for each of this staff's
  // `<music-tremolo tremolo-group>` wrappers that joined a resolved
  // cross-staff tremolo (measure.ts#redrawCrossStaffTremolos): their notes'
  // stems point into the gap, and the measure draws the beams and writes the
  // stem lengths, so this staff beams none of them. Compared by content, like
  // crossStaffTupletRoles below.
  get crossStaffTremoloRoles(): ReadonlyMap<
    TremoloElementType,
    CrossStaffTremoloRole
  > | null {
    return this.#crossStaffTremoloRoles;
  }

  set crossStaffTremoloRoles(
    value: ReadonlyMap<TremoloElementType, CrossStaffTremoloRole> | null
  ) {
    const current = this.#crossStaffTremoloRoles;
    const unchanged =
      current === value ||
      (current !== null &&
        value !== null &&
        current.size === value.size &&
        [...current].every(
          ([tremolo, role]) => value.get(tremolo)?.stemUp === role.stemUp
        ));
    if (unchanged) {
      return;
    }
    this.#crossStaffTremoloRoles = value;
    this.#renderNotes();
  }

  // `<music-tuplet tuplet-group>` wrappers that joined a resolved cross-staff
  // tuplet (measure.ts#redrawCrossStaffTuplets): forces its members' stems
  // into the gap and either suppresses its bracket or forces its side.
  // Structural values (no measured pixels), compared by content for the same
  // reason as crossStaffBeamStemOverrides above.
  get crossStaffTupletRoles(): ReadonlyMap<
    TupletElementType,
    CrossStaffTupletRole
  > | null {
    return this.#crossStaffTupletRoles;
  }

  set crossStaffTupletRoles(
    value: ReadonlyMap<TupletElementType, CrossStaffTupletRole> | null
  ) {
    const current = this.#crossStaffTupletRoles;
    const unchanged =
      current === value ||
      (current !== null &&
        value !== null &&
        current.size === value.size &&
        [...current].every(([tuplet, role]) => {
          const other = value.get(tuplet);
          return (
            other !== undefined &&
            other.stemUp === role.stemUp &&
            other.rendering === role.rendering
          );
        }));
    if (unchanged) {
      return;
    }
    this.#crossStaffTupletRoles = value;
    this.#renderNotes();
  }

  // Set by the ancestor <music-measure> for a tuplet member that is also a
  // double-stemmed beam member, so its numeral/bracket clears the shared beam
  // this staff never draws. Keyed by element, like
  // crossStaffBeamStemOverrides. The value is a px delta (beam Y minus the
  // element's zero-extension stem tip), added to naturalStemTipY: a delta is
  // origin-independent, whereas an absolute Y would need this staff's internal
  // CSS layout, which the measure can't see.
  get crossStaffTupletBeamY(): ReadonlyMap<
    NoteChordOrRestElementType,
    number
  > | null {
    return this.#crossStaffTupletBeamY;
  }

  set crossStaffTupletBeamY(
    value: ReadonlyMap<NoteChordOrRestElementType, number> | null
  ) {
    const current = this.#crossStaffTupletBeamY;
    // A tolerance, since the value is re-measured each redraw and a change
    // triggers the next one: sub-pixel jitter must not loop forever.
    const unchanged =
      current === value ||
      (current !== null &&
        value !== null &&
        current.size === value.size &&
        [...current].every(([element, y]) => {
          const otherY = value.get(element);
          return (
            otherY !== undefined &&
            Math.abs(otherY - y) < CROSS_STAFF_TUPLET_BEAM_Y_EPSILON_PX
          );
        }));
    if (unchanged) {
      return;
    }
    this.#crossStaffTupletBeamY = value;
    this.#renderNotes();
  }

  // Set by the ancestor <music-measure> for hairpins and markings it places
  // with both staves' geometry (measure.ts#redrawMeasureDynamics): 'measure'
  // hands drawing over to it, 'above'/'below' force this staff's own row.
  // Compared by content, like crossStaffBeamStemOverrides. Only a forced side
  // changes vertical space, so only that needs a full re-layout; handing a
  // hairpin over redraws just the dynamics containers, firing no events.
  get crossStaffDynamicsOverrides(): ReadonlyMap<
    NoteOrChordElementType,
    CrossStaffDynamicsOverride
  > | null {
    return this.#crossStaffDynamicsOverrides;
  }

  set crossStaffDynamicsOverrides(
    value: ReadonlyMap<
      NoteOrChordElementType,
      CrossStaffDynamicsOverride
    > | null
  ) {
    const current = this.#crossStaffDynamicsOverrides;
    const elements = new Set([
      ...(current?.keys() ?? []),
      ...(value?.keys() ?? []),
    ]);
    let changed = false;
    let sideChanged = false;
    for (const element of elements) {
      const before = current?.get(element);
      const after = value?.get(element);
      if (
        before?.hairpin === after?.hairpin &&
        before?.marking === after?.marking &&
        (before === undefined) === (after === undefined)
      ) {
        continue;
      }
      changed = true;
      const forcesSide = (placement: DynamicsPlacement | null | undefined) =>
        placement === 'above' || placement === 'below';
      if (
        forcesSide(before?.hairpin) ||
        forcesSide(before?.marking) ||
        forcesSide(after?.hairpin) ||
        forcesSide(after?.marking)
      ) {
        sideChanged = true;
      }
    }
    if (!changed) {
      return;
    }
    this.#crossStaffDynamicsOverrides = value;
    if (sideChanged) {
      this.#renderNotes();
      return;
    }
    this.#boundRenderDynamics();
  }

  // Set by the ancestor <music-measure>: this staff's octave lines break
  // after these elements, so a one-hand line under a double-stemmed beam
  // encloses only its own notes (see measure.ts#crossStaffOctaveBreaks).
  // Compared by content; a change re-lays the staff, since a run's row can
  // differ from the whole span's and the vertical budget follows it.
  get crossStaffOctaveBreakAfter(): ReadonlySet<NoteChordOrRestElementType> | null {
    return this.#crossStaffOctaveBreakAfter;
  }

  set crossStaffOctaveBreakAfter(
    value: ReadonlySet<NoteChordOrRestElementType> | null
  ) {
    const current = this.#crossStaffOctaveBreakAfter;
    const unchanged =
      (current?.size ?? 0) === (value?.size ?? 0) &&
      [...(current ?? [])].every((element) => value?.has(element));
    if (unchanged) {
      return;
    }
    this.#crossStaffOctaveBreakAfter = value;
    this.#renderNotes();
  }
  // Set by the ancestor <music-composition> for every octave line crossing a
  // barline here: the row the line takes in this system, keyed by the first
  // element it covers. A line that `starts` here is drawn by this staff to its
  // end with no corner; one that only passes over is drawn by the composition,
  // but this staff still makes headroom for it. Compared by content.
  get octaveContinuations(): ReadonlyMap<
    Element,
    OctaveContinuationRow
  > | null {
    return this.#octaveContinuations;
  }

  set octaveContinuations(
    value: ReadonlyMap<Element, OctaveContinuationRow> | null
  ) {
    const current = this.#octaveContinuations;
    const unchanged =
      (current?.size ?? 0) === (value?.size ?? 0) &&
      [...(current ?? [])].every(([element, row]) => {
        const next = value?.get(element);
        return (
          next !== undefined &&
          next.starts === row.starts &&
          next.raisesPitch === row.raisesPitch &&
          Math.abs(next.rowY - row.rowY) < 0.5
        );
      });
    if (unchanged) {
      return;
    }
    this.#octaveContinuations = value;
    this.#renderNotes();
  }

  // The row an octave line over `elements` (from this staff's own render)
  // needs, in this staff's local coordinates — the same note clearance and
  // decoration push-out as its own lines. Null when it rendered none of them.
  octaveRowY(
    elements: readonly Element[],
    amount: OctaveShiftAmount
  ): number | null {
    for (const [voiceKey, state] of this.#voiceRenderStates) {
      const indices = elements
        .map((element) =>
          state.elements.indexOf(element as NoteChordOrRestElementType)
        )
        .filter((index) => index >= 0)
        .sort((a, b) => a - b);
      if (indices.length === 0) {
        continue;
      }
      const span: OctaveSpan = {
        amount,
        mode: 'sign',
        startIndex: indices[0],
        stopIndex: indices[indices.length - 1],
        members: indices.map((index) => ({
          index,
          isRest: state.elements[index].nodeName === MUSIC_REST_NODE,
        })),
        closedBy: 'implicit',
      };
      return this.#octaveSignRowY(span, isOctaveRaise(amount), voiceKey, state);
    }
    return null;
  }

  // A local octave-sign Y (see octaveRowY) in client coordinates.
  octaveLocalToClientY(y: number): number {
    const container = this.#octaveSignsContainers.values().next().value;
    const matrix = container?.getScreenCTM?.();
    if (matrix) {
      return matrix.d * y + matrix.f;
    }
    return this.transcribeContainer.getBoundingClientRect().top + y;
  }

  // Where this staff would draw each of its hairpins with no
  // crossStaffDynamicsOverrides in effect. The measure decides placement
  // from this, so it must never reflect an override, or a forced side would
  // feed back into the next decision.
  hairpinDefaultsForMeasure(): StaffHairpinDefaults {
    const result: StaffHairpinDefaults = {
      pairs: [],
      unpairedStarts: [],
      orphanEnds: [],
    };
    for (const [voiceKey, state] of this.#voiceRenderStates) {
      const side = this.#defaultDynamicsSide(voiceKey, state);
      const placement: StaffHairpinPlacement = {
        kind: 'crescendo',
        side,
        baselineClientY: this.#dynamicsLocalToClientY(
          voiceKey,
          this.#dynamicsBaselineFor(state, side === 'above')
        ),
      };
      const pairing = pairHairpinsWithLeftovers(
        state.elements,
        state.noteXPositions,
        { warnOrphans: false }
      );
      for (const pair of pairing.pairs) {
        result.pairs.push({
          ...placement,
          kind: pair.kind,
          startElement: pair.startElement,
          endElement: pair.endElement,
        });
      }
      for (const start of pairing.unpairedStarts) {
        result.unpairedStarts.push({ ...placement, ...start });
      }
      result.orphanEnds.push(...pairing.orphanEnds);
    }
    return result;
  }

  constructor() {
    super();

    this.#effectiveMode = this.resolveInheritedValue(
      COMMON_ATTRIBUTES.MODE,
      'major'
    ) as Mode;
    this.#effectiveKeySig = this.resolveInheritedValue(
      COMMON_ATTRIBUTES.KEY_SIG,
      'C'
    ) as Note;

    this.#describeContainer = document.createElementNS(SVG_NS, 'g');
    this.#startRepeatContainer = document.createElementNS(SVG_NS, 'g');
    this.#startRepeatContainer.classList.add('start-repeat-container');
    this.#midBarBarlinesContainer = document.createElementNS(SVG_NS, 'g');
    this.#midBarBarlinesContainer.classList.add('mid-bar-barlines-container');
    this.#endWarningsContainer = document.createElementNS(SVG_NS, 'g');
    this.#endWarningsContainer.classList.add('end-warnings-container');
  }

  get staffLineCount(): number {
    return 5;
  }

  protected override get additionalStyles(): string {
    return `
      ::slotted(music-note),
      ::slotted(music-chord),
      ::slotted(music-rest) {
        position: absolute;
      }

      ::slotted(music-tuplet),
      ::slotted(music-tremolo) {
        display: contents;
      }
    `;
  }

  get keySig(): Note {
    return this.#effectiveKeySig;
  }

  set keySig(value: string) {
    this.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, value);
  }

  get mode(): Mode {
    return this.#effectiveMode;
  }

  set mode(value: string) {
    this.setAttribute(COMMON_ATTRIBUTES.MODE, value);
  }

  abstract get yCoordinates(): YCoordinates;

  abstract get octaves(): Octave[];

  public getKeyYCoordinates(): { useSharps: boolean; coordinates: number[] } {
    return this.getKeyYCoordinatesFor(this.effectiveKeySignature);
  }

  // Where `state`'s accidentals sit on this staff, in its own clef or in
  // `clef` where the staff can draw that clef.
  public abstract getKeyYCoordinatesFor(
    state: KeySignatureState,
    clef?: ClefType | null
  ): { useSharps: boolean; coordinates: number[] };

  protected abstract get clefSvg(): string;

  protected onConnectedCallback() {
    // Re-resolve inherited attrs now that ancestors are reachable via closest()
    this.effectiveTimeSig = this.convertTotimeInts(
      this.resolveInheritedValue(COMMON_ATTRIBUTES.TIME, '4/4')
    );
    this.#effectiveMode = this.resolveInheritedValue(
      COMMON_ATTRIBUTES.MODE,
      'major'
    ) as Mode;
    this.#effectiveKeySig = this.resolveInheritedValue(
      COMMON_ATTRIBUTES.KEY_SIG,
      'C'
    ) as Note;

    this.#buildDescribe();
    this.addEventListener(
      NOTE_EVENTS.CONNECTOR_ATTRIBUTE_CHANGE,
      this.#boundDrawConnectors
    );
    this.addEventListener(NOTE_EVENTS.NOTE_Y_CHANGE, this.#boundNoteYChange);
    this.addEventListener(
      NOTE_EVENTS.DYNAMIC_ATTRIBUTE_CHANGE,
      this.#boundRenderDynamics
    );
    this.addEventListener(
      NOTE_EVENTS.OCTAVE_ATTRIBUTE_CHANGE,
      this.#boundRenderOctaveSigns
    );
    // A trill change can move the written notehead's rightward footprint,
    // which only #renderNotes() recomputes.
    this.addEventListener(
      NOTE_EVENTS.TRILL_ATTRIBUTE_CHANGE,
      this.#boundNoteYChange
    );
    this.addEventListener(
      CLEF_EVENTS.ATTRIBUTE_CHANGE,
      this.#boundClefMarkerChange
    );
    this.addEventListener(
      TUPLET_EVENTS.ATTRIBUTE_CHANGE,
      this.#boundNoteYChange
    );
    this.addEventListener(
      TREMOLO_EVENTS.ATTRIBUTE_CHANGE,
      this.#boundTremoloChange
    );
  }

  // Describe is: clef, key signature, time signature, and beams overlay
  #buildDescribe() {
    this.#describeContainer.classList.add('describe-container');
    this.transcribeContainer.appendChild(this.#describeContainer);
    this.#drawDescribeGlyphs();

    // Voice 1's containers up front; other voices' and the synthetic tracks'
    // are created on first use by #containerFor.
    this.#containerFor(this.#beamsContainers, 1, 'beams-container');
    this.#containerFor(this.#tupletContainers, 1, 'tuplets-container');
    this.#containerFor(this.#dynamicsContainers, 1, 'dynamics-container');
    this.#containerFor(this.#trillLinesContainers, 1, 'trill-lines-container');
    this.#containerFor(
      this.#octaveSignsContainers,
      1,
      'octave-signs-container'
    );
  }

  // At a row start: clef, key, time. Mid-row: a changed clef, then a key
  // change's naturals and new key, then a changed time signature.
  #drawDescribeGlyphs() {
    const reminder = this.#describeReminder;
    if (this.#showDescribe) {
      this.#describeContainer.innerHTML = this.clefSvg;
      const keyEnd = this.#appendKeySignatureSvg(
        this.#describeContainer,
        CLEF_X_OFFSET
      );
      if (reminder?.time) {
        // The key's glyphs end CLEF_X_OFFSET past the offset it returns (see
        // #appendKeySignatureSvg); a row start shows the clef and key anyway.
        this.#appendDescribeSequence(keyEnd + CLEF_X_OFFSET, [
          { component: 'time', bracketed: true },
        ]);
      } else {
        this.#appendTimeSignatureSvgIfNecessary(
          this.#describeContainer,
          keyEnd + 5
        );
      }
      return;
    }
    if (reminder !== null) {
      this.#describeContainer.innerHTML = '';
      const items: DescribeItem[] = [];
      if (reminder.clef || this.#clefChangeAtBoundary) {
        items.push({ component: 'clef', bracketed: reminder.clef });
      }
      if (reminder.key || this.#keyChangeAtBoundary !== null) {
        items.push({ component: 'key', bracketed: reminder.key });
      }
      if (reminder.time || this.#timeChangeAtBoundary) {
        items.push({ component: 'time', bracketed: reminder.time });
      }
      this.#appendDescribeSequence(END_WARNING_GAP_PX, items);
      return;
    }
    const showClef = this.#clefChangeAtBoundary;
    this.#describeContainer.innerHTML = showClef ? this.clefSvg : '';
    const keyChange = this.#keyChangeAtBoundary;
    if (keyChange === null) {
      this.#appendTimeSignatureSvgIfNecessary(
        this.#describeContainer,
        CLEF_X_OFFSET + 5
      );
      return;
    }
    // The row-start key's first accidental sits at twice CLEF_X_OFFSET (see
    // #appendKeySignatureSvg); a key change after a clef starts there too.
    const keyEnd = this.#appendKeyChangeSvg(
      this.#describeContainer,
      showClef ? CLEF_X_OFFSET * 2 : END_WARNING_GAP_PX,
      keyChange,
      null
    );
    if (this.#timeChangeAtBoundary) {
      this.#describeContainer.appendChild(
        this.#timeSignatureSvgAt(
          keyEnd + END_WARNING_GAP_PX,
          this.effectiveTimeSig
        )
      );
    }
  }

  // Clef, key and time from `left`, the bracketed ones inside one pair of
  // parentheses. A bracketed key is a reminder, so it has no naturals.
  #appendDescribeSequence(left: number, items: readonly DescribeItem[]) {
    const container = this.#describeContainer;
    const firstBracketed = items.findIndex((item) => item.bracketed);
    const lastBracketed = items.map((item) => item.bracketed).lastIndexOf(true);
    const parenTop = STAFF_LINE_START - REMINDER_PAREN_OVERHANG_PX;
    const parenHeight =
      (this.staffLineCount - 1) * STAFF_LINE_SPACING +
      REMINDER_PAREN_OVERHANG_PX * 2;
    let x = left;
    items.forEach((item, i) => {
      if (i === firstBracketed) {
        container.appendChild(
          createParenthesisSvg(
            'open',
            x,
            parenTop,
            REMINDER_PAREN_WIDTH_PX,
            parenHeight
          )
        );
        x += REMINDER_PAREN_WIDTH_PX + REMINDER_PAREN_GAP_PX;
      }
      if (item.component === 'clef') {
        const clef = document.createElementNS(SVG_NS, 'g');
        clef.setAttribute('transform', `translate(${x}, 0)`);
        clef.innerHTML = this.clefSvg;
        container.appendChild(clef);
        x += CLEF_X_OFFSET * 2;
      } else if (item.component === 'key') {
        const state = this.effectiveKeySignature;
        const change =
          item.bracketed || this.#keyChangeAtBoundary === null
            ? { from: state, to: state }
            : this.#keyChangeAtBoundary;
        x = this.#appendKeyChangeSvg(container, x, change, null);
      } else {
        const [beats, beatType] = this.effectiveTimeSig;
        container.appendChild(
          this.#timeSignatureSvgAt(x, this.effectiveTimeSig)
        );
        x += timeSignatureWidth(`${beats}/${beatType}` as TimeSignature);
      }
      if (i === lastBracketed) {
        x += REMINDER_PAREN_GAP_PX;
        container.appendChild(
          createParenthesisSvg(
            'close',
            x,
            parenTop,
            REMINDER_PAREN_WIDTH_PX,
            parenHeight
          )
        );
        x += REMINDER_PAREN_WIDTH_PX;
      }
      if (item.component !== 'clef' && i < items.length - 1) {
        x += END_WARNING_GAP_PX;
      }
    });
  }

  #refreshDescribe() {
    if (!this.isConnected) return;
    this.#drawDescribeGlyphs();
    if (this.#voices.size > 0) {
      this.#renderNotes();
    }
  }

  refreshInheritedAttrs() {
    this.effectiveTimeSig = this.convertTotimeInts(
      this.resolveInheritedValue(COMMON_ATTRIBUTES.TIME, '4/4')
    );
    this.#effectiveMode = this.resolveInheritedValue(
      COMMON_ATTRIBUTES.MODE,
      'major'
    ) as Mode;
    this.#effectiveKeySig = this.resolveInheritedValue(
      COMMON_ATTRIBUTES.KEY_SIG,
      'C'
    ) as Note;
    this.#refreshDescribe();
  }

  #appendKeySignatureSvg(svg: SVGElement, xOffset: number) {
    const { useSharps, coordinates } = this.getKeyYCoordinates();
    const g = document.createElementNS(SVG_NS, 'svg');
    g.setAttribute('class', 'key-signature');
    g.setAttribute('x', xOffset.toString());
    g.setAttribute('y', '-15');
    if (coordinates.length) {
      const createSvgFunc = useSharps ? createSharpSvg : createFlatSvg;
      const Width = useSharps ? KEY_SIG_SHARP_WIDTH : KEY_SIG_FLAT_WIDTH;
      const yOffset = useSharps ? 0 : KEY_SIG_FLAT_Y_OFFSET;
      for (const y of coordinates) {
        const svg = createSvgFunc();
        svg.setAttribute('transform', `translate(${xOffset}, ${y + yOffset})`);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        g.appendChild(svg);
        xOffset += Width;
      }
    }

    svg.appendChild(g);

    return xOffset;
  }

  // A key change from `left`: the naturals cancelling the old key, then the
  // new key, in `clef` where given. Returns where it ends.
  #appendKeyChangeSvg(
    parent: SVGElement,
    left: number,
    change: KeyChange,
    clef: ClefType | null
  ): number {
    const group = document.createElementNS(SVG_NS, 'svg');
    group.setAttribute('class', 'key-change');
    group.setAttribute('y', '-15');
    let x = left;
    const naturals = resolveCancellationNaturals(change.from, change.to);
    const old = this.getKeyYCoordinatesFor(change.from, clef).coordinates;
    for (const natural of naturals) {
      const glyph = createNaturalSvg();
      glyph.classList.add('cancellation-natural');
      glyph.setAttribute(
        'transform',
        `translate(${x}, ${
          (old[natural.orderIndex] ?? 0) + KEY_SIG_NATURAL_Y_OFFSET
        })`
      );
      group.appendChild(glyph);
      x += KEY_SIG_NATURAL_WIDTH;
    }
    const { useSharps, coordinates } = this.getKeyYCoordinatesFor(
      change.to,
      clef
    );
    if (naturals.length > 0 && coordinates.length > 0) {
      x += KEY_SIG_CANCEL_GAP_PX;
    }
    for (const y of coordinates) {
      const glyph = useSharps ? createSharpSvg() : createFlatSvg();
      glyph.setAttribute(
        'transform',
        `translate(${x}, ${y + (useSharps ? 0 : KEY_SIG_FLAT_Y_OFFSET)})`
      );
      group.appendChild(glyph);
      x += useSharps ? KEY_SIG_SHARP_WIDTH : KEY_SIG_FLAT_WIDTH;
    }
    parent.appendChild(group);
    return x;
  }

  // A time signature whose numerals start at `left`.
  #timeSignatureSvgAt(
    left: number,
    [beats, beatType]: [BeatsInMeasure, BeatTypeInMeasure]
  ): SVGSVGElement {
    const width = timeSignatureWidth(`${beats}/${beatType}` as TimeSignature);
    const svg = createTimeSignatureSvg(beats, beatType);
    svg.setAttribute(
      'transform',
      `translate(${
        left - TIME_SIG_GLYPH_CENTER_X_PX + width / 2
      }, ${TIME_SIG_Y_TRANSLATE})`
    );
    return svg;
  }

  #appendTimeSignatureSvgIfNecessary(parentSvg: SVGElement, xOffset: number) {
    const measure = this.closest(MUSIC_MEASURE);
    const composition = this.closest(MUSIC_COMPOSITION);
    // "First measure" from DOM position: the composition writes `number` in a
    // microtask, too late for a staff mounted with a fresh first measure.
    // `number` is the fallback for a standalone <music-measure>.
    const isFirstMeasure =
      measure != null &&
      (composition != null
        ? composition.querySelector(MUSIC_MEASURE) === measure
        : measure.getAttribute('number') === '1');

    if (isFirstMeasure || measure == null || this.#timeChangeAtBoundary) {
      const timeSigSvg = createTimeSignatureSvg(...this.effectiveTimeSig);
      timeSigSvg.setAttribute(
        'transform',
        `translate(${xOffset}, ${TIME_SIG_Y_TRANSLATE})`
      );
      parentSvg.appendChild(timeSigSvg);
    }
  }

  protected override onDisconnectedCallback(): void {
    for (const element of this.#crossVoiceElements) {
      resetCrossVoiceState(element);
    }
    this.#crossVoiceElements.clear();
    this.removeEventListener(
      NOTE_EVENTS.CONNECTOR_ATTRIBUTE_CHANGE,
      this.#boundDrawConnectors
    );
    this.removeEventListener(NOTE_EVENTS.NOTE_Y_CHANGE, this.#boundNoteYChange);
    this.removeEventListener(
      NOTE_EVENTS.DYNAMIC_ATTRIBUTE_CHANGE,
      this.#boundRenderDynamics
    );
    this.removeEventListener(
      NOTE_EVENTS.TRILL_ATTRIBUTE_CHANGE,
      this.#boundNoteYChange
    );
    this.removeEventListener(
      CLEF_EVENTS.ATTRIBUTE_CHANGE,
      this.#boundClefMarkerChange
    );
    this.removeEventListener(
      TUPLET_EVENTS.ATTRIBUTE_CHANGE,
      this.#boundNoteYChange
    );
    this.removeEventListener(
      TREMOLO_EVENTS.ATTRIBUTE_CHANGE,
      this.#boundTremoloChange
    );
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ): void {
    if (oldValue === newValue) {
      return;
    }

    if (name === 'group' || name === 'group-id') {
      this.dispatchGroupAttributeChange();
      return;
    }

    if (name === 'label') {
      this.dispatchLabelAttributeChange();
      return;
    }

    if (name === 'part') {
      this.dispatchTabLinkAttributeChange();
      return;
    }

    if (name === COMMON_ATTRIBUTES.TIME) {
      this.effectiveTimeSig = this.convertTotimeInts(
        this.resolveInheritedValue(COMMON_ATTRIBUTES.TIME, '4/4')
      );
    } else if (name === COMMON_ATTRIBUTES.MODE) {
      this.#effectiveMode = this.resolveInheritedValue(
        COMMON_ATTRIBUTES.MODE,
        'major'
      ) as Mode;
    } else if (name === COMMON_ATTRIBUTES.KEY_SIG) {
      this.#effectiveKeySig = this.resolveInheritedValue(
        COMMON_ATTRIBUTES.KEY_SIG,
        'C'
      ) as Note;
    }
    this.#refreshDescribe();
  }

  protected onHandleSlotChange(event: Event) {
    this.#renderFromSlot(event.target as HTMLSlotElement);
  }

  // Re-run the full slot pipeline (flatten → bar-fit → beams → render). Needed
  // when a `<music-arpeggio>` mutates: its run notes gain a `duration` and the
  // groups must be re-flattened, which the cached per-voice state can't do.
  #reRenderFromCurrentSlot(): void {
    const slot = this.shadowRoot?.querySelector('slot');
    if (slot) {
      this.#renderFromSlot(slot as HTMLSlotElement);
    }
  }

  #renderFromSlot(slot: HTMLSlotElement) {
    const assignedElements = slot.assignedElements();
    this.upgradeAssignedElements(assignedElements);
    const assigned = assignedElements.filter(
      (e) =>
        e.nodeName === MUSIC_NOTE_NODE ||
        e.nodeName === MUSIC_CHORD_NODE ||
        e.nodeName === MUSIC_REST_NODE ||
        e.nodeName === MUSIC_TUPLET_NODE ||
        e.nodeName === MUSIC_ARPEGGIO_NODE ||
        e.nodeName === MUSIC_TREMOLO_NODE ||
        e.nodeName === MUSIC_CLEF_NODE ||
        e.nodeName === MUSIC_BARLINE_NODE ||
        e.nodeName === MUSIC_VOICE_NODE
    );

    const { voices, streamMarkers } = flattenStaffSlotElements(assigned);
    this.#voices = voices;
    this.#setStreamMarkers(streamMarkers);
    this.#renderNotes();
  }

  // Synthetic elements (a combined-voices chord or shared whole-measure rest)
  // are re-derived every pass: removed and recreated, never diffed.
  #syntheticElements: HTMLElement[] = [];
  #clearSyntheticElements(): void {
    for (const element of this.#syntheticElements) {
      element.remove();
    }
    this.#syntheticElements = [];
  }

  // Builds the <music-chord> for an auto-combine group, fully assembled before
  // it connects so its `.notes` sees every tone from the start.
  #synthesizeCombinedChord(group: CombinedGroup): ChordElementType {
    const chord = document.createElement(MUSIC_CHORD) as ChordElementType;
    chord.setAttribute('duration', group.duration);
    const reference = group.members[0].element;
    if (reference.articulation !== null) {
      chord.setAttribute('articulation', reference.articulation);
    }
    if (reference.dynamic !== null) {
      chord.setAttribute('dynamic', reference.dynamic);
    }
    if (reference.crescendo !== null) {
      chord.setAttribute('crescendo', reference.crescendo);
    }
    if (reference.decrescendo !== null) {
      chord.setAttribute('decrescendo', reference.decrescendo);
    }
    if (reference.tremolo !== null) {
      chord.setAttribute('tremolo', String(reference.tremolo));
    }
    if (reference.tremoloTuplet !== null) {
      chord.setAttribute('tremolo-tuplet', String(reference.tremoloTuplet));
    }
    if (reference.tremoloLabel !== null) {
      chord.setAttribute('tremolo-label', reference.tremoloLabel);
    }
    if (reference.articulationRepeat) {
      chord.setAttribute('articulation-repeat', '');
    }
    for (const tone of group.tones) {
      const note = document.createElement(MUSIC_NOTE);
      note.setAttribute('note', tone.value);
      if (tone.octave !== null) {
        note.setAttribute('octave', `${tone.octave}`);
      }
      chord.appendChild(note);
    }
    (this.wrapperElement ?? this.staffContainer).appendChild(chord);
    this.#syntheticElements.push(chord);
    return chord;
  }

  // Builds the synthetic <music-rest> for a v1-scoped shared whole-measure
  // rest (rules/voiceRestRules.ts) — represents every voice's silence at
  // once, so it carries no voice-specific state at all.
  #synthesizeSharedRest(duration: DurationType): RestElementType {
    const rest = document.createElement(MUSIC_REST) as RestElementType;
    rest.setAttribute('duration', duration);
    (this.wrapperElement ?? this.staffContainer).appendChild(rest);
    this.#syntheticElements.push(rest);
    return rest;
  }

  // One voice's staff-Y coordinates; each element's beat-offset picks its clef
  // segment. Used by Pass 1.5, and by #buildVoiceRenderState for tracks that
  // don't exist yet then (the synthetic ones).
  #resolveVoiceStaffYCoords(
    elements: NoteChordOrRestElementType[],
    beatOffsets: number[]
  ): VoiceStaffYCoords {
    const noteStaffYCoords = new Map<NoteElementType, number>();
    const chordStaffYCoords = new Map<ChordElementType, number[]>();
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const beatOffset = beatOffsets[i];
      if (element.nodeName === MUSIC_NOTE_NODE) {
        const noteElement = element as NoteElementType;
        noteStaffYCoords.set(
          noteElement,
          this.#noteToYCoordinateAtBeatOffset(
            noteElement.note,
            noteElement.octave ?? undefined,
            beatOffset
          )
        );
      } else if (element.nodeName === MUSIC_CHORD_NODE) {
        const chordElement = element as ChordElementType;
        chordStaffYCoords.set(
          chordElement,
          this.#resolveChordStaffYCoordinates(chordElement.notes, beatOffset)
        );
      }
    }
    this.#placeTriangles(elements, noteStaffYCoords, chordStaffYCoords);
    return { noteStaffYCoords, chordStaffYCoords };
  }

  // Triangles have no defined pitch: their Y replaces the pitch-derived one
  // (see rules/noteheadRules.ts#resolveTriangleStaffYs). Runs twice per pass,
  // because voice 3's direction heuristic reads these Ys before any stem is
  // known: first against heads alone, then with `resolvedStem` once
  // buildBeamsRenderer has settled directions and extensions. The second run
  // only moves a triangle further out, so entries the first run saw but the
  // second no longer has (moved to the 'combined' track) stay cleared.
  #placeTriangles(
    elements: NoteChordOrRestElementType[],
    noteStaffYCoords: Map<NoteElementType, number>,
    chordStaffYCoords: Map<ChordElementType, number[]>,
    resolvedStem?: (index: number) => {
      stemUp: boolean;
      stemExtensionPx: number;
      noFlags: boolean;
    }
  ): void {
    if (
      !elements.some(
        (element) =>
          element.nodeName === MUSIC_NOTE_NODE &&
          isTriangle((element as NoteElementType).notehead)
      )
    ) {
      return;
    }
    const entries = elements.map((element, i): TrianglePlacementEntry => {
      if (element.nodeName === MUSIC_REST_NODE) {
        return { kind: 'break' };
      }
      if (element.nodeName === MUSIC_NOTE_NODE) {
        const notehead = (element as NoteElementType).notehead;
        if (notehead === 'triangle-up' || notehead === 'triangle-down') {
          const previous = elements[i - 1];
          return {
            kind: 'triangle',
            notehead,
            tiedFromPrevious:
              previous?.nodeName === MUSIC_NOTE_NODE &&
              (previous as NoteElementType).tie === 'start',
          };
        }
      }
      const headYs = getStaffYs(element, noteStaffYCoords, chordStaffYCoords);
      const stem = resolvedStem?.(i);
      const duration = (element as NoteElementType | ChordElementType).duration;
      return {
        kind: 'pitched',
        headYs,
        stemTipY: stem
          ? resolveStemTipY({
              headYs,
              stemUp: stem.stemUp,
              stemless: isStemlessDuration(duration),
              noFlags: stem.noFlags,
              stemExtensionPx: stem.stemExtensionPx,
              baseStemLengthPx: BASE_STEM_LENGTH_PX,
              flagExtensionPx: flagStemExtensionPx(
                durationToFlagCountMap.get(duration) ?? 0
              ),
            })
          : null,
      };
    });
    const triangleYs = resolveTriangleStaffYs(entries, {
      topLineY: STAFF_TOP_LINE_Y,
      bottomLineY: STAFF_BOTTOM_LINE_Y,
      outsideStaffPx: TRIANGLE_OUTSIDE_STAFF_PX,
      runClearancePx: TRIANGLE_RUN_CLEARANCE_PX,
    });
    for (const [i, y] of triangleYs) {
      const triangle = elements[i] as NoteElementType;
      const firstRunY = noteStaffYCoords.get(triangle) ?? y;
      const outerY = forcedStemUp(triangle.notehead)
        ? Math.max(firstRunY, y)
        : Math.min(firstRunY, y);
      noteStaffYCoords.set(triangle, resolvedStem ? outerY : y);
    }
  }

  #crossStaffTremoloRoleOf(
    element: NoteChordOrRestElementType
  ): CrossStaffTremoloRole | undefined {
    const parent = element.parentElement;
    return parent?.nodeName === MUSIC_TREMOLO_NODE
      ? this.#crossStaffTremoloRoles?.get(parent as TremoloElementType)
      : undefined;
  }

  // Builds one voice key's VoiceRenderState. Stems are policy-driven on a real
  // multi-voice track, pitch-driven for a single voice and the 'combined'
  // track.
  #buildVoiceRenderState(
    voiceKey: VoiceKey,
    elements: NoteChordOrRestElementType[],
    beatOffsets: number[],
    tupletsByIndex: Map<number, TupletElementType[]>,
    arpeggioGroups: ArpeggioGroupPlacement[],
    tremoloGroups: TremoloGroupPlacement[],
    direction: VoiceDirection,
    pitchDriven: boolean,
    accidentals: ReturnType<typeof computeNoteAccidentals>,
    precomputedYCoords?: VoiceStaffYCoords
  ): VoiceRenderState {
    const { noteStaffYCoords, chordStaffYCoords } =
      precomputedYCoords ??
      this.#resolveVoiceStaffYCoords(elements, beatOffsets);

    const arpeggioRunIndices = new Set<number>(
      arpeggioGroups.flatMap((group) => group.runIndices)
    );
    const stemDirectionsOverride = pitchDriven
      ? undefined
      : determineVoiceStemDirections(elements, direction);
    // A beam-group or cross-staff tremolo member is beamed by the ancestor
    // <music-measure>; excluded here, it still reads as beamed (no flag)
    // without joining a same-staff run.
    const externallyBeamedIndices = new Set(
      elements
        .map((_, i) => i)
        .filter((i) => {
          const element = elements[i];
          return (
            element.nodeName !== MUSIC_REST_NODE &&
            ((element as NoteElementType | ChordElementType).beamGroup !==
              null ||
              this.#crossStaffTremoloRoleOf(element) !== undefined)
          );
        })
    );
    // A rest in a cross-staff beam group is positioned by the ancestor
    // <music-measure>, so #spaceElements() skips it.
    const externallyPositionedRestIndices = new Set(
      elements
        .map((_, i) => i)
        .filter((i) => {
          const element = elements[i];
          return (
            element.nodeName === MUSIC_REST_NODE &&
            (element as RestElementType).beamGroup !== null
          );
        })
    );
    // `stem-direction` merges into the cross-staff override map; spread
    // order makes the author's choice win.
    const authoredStemOverrides = new Map<
      NoteChordOrRestElementType,
      boolean
    >();
    for (const element of elements) {
      if (element.nodeName === MUSIC_REST_NODE) {
        continue;
      }
      const stemDirection = (element as NoteElementType | ChordElementType)
        .stemDirection;
      const triangleStemUp =
        element.nodeName === MUSIC_NOTE_NODE
          ? forcedStemUp((element as NoteElementType).notehead)
          : null;
      if (triangleStemUp !== null) {
        if (
          stemDirection !== null &&
          (stemDirection === 'up') !== triangleStemUp
        ) {
          console.warn(
            `[music-note] stem-direction="${stemDirection}" is ignored: a ${
              (element as NoteElementType).notehead
            } notehead's stem always points away from its tip.`
          );
        }
        authoredStemOverrides.set(element, triangleStemUp);
      } else if (stemDirection !== null) {
        authoredStemOverrides.set(element, stemDirection === 'up');
      }
    }
    const crossStaffTupletStemOverrides = new Map<
      NoteChordOrRestElementType,
      boolean
    >();
    if (this.#crossStaffTupletRoles !== null) {
      for (let i = 0; i < elements.length; i++) {
        const role = tupletsByIndex
          .get(i)
          ?.map((tuplet) => this.#crossStaffTupletRoles?.get(tuplet))
          .find((found) => found !== undefined);
        if (role !== undefined && elements[i].nodeName !== MUSIC_REST_NODE) {
          crossStaffTupletStemOverrides.set(elements[i], role.stemUp);
        }
      }
    }
    const crossStaffTremoloStemOverrides = new Map<
      NoteChordOrRestElementType,
      boolean
    >();
    for (const element of elements) {
      const role = this.#crossStaffTremoloRoleOf(element);
      if (role !== undefined && element.nodeName !== MUSIC_REST_NODE) {
        crossStaffTremoloStemOverrides.set(element, role.stemUp);
      }
    }
    const combinedStemOverrides:
      | ReadonlyMap<NoteChordOrRestElementType, boolean>
      | undefined =
      authoredStemOverrides.size > 0 ||
      crossStaffTupletStemOverrides.size > 0 ||
      crossStaffTremoloStemOverrides.size > 0 ||
      this.#crossStaffBeamStemOverrides
        ? new Map([
            ...(this.#crossStaffBeamStemOverrides ?? []),
            ...crossStaffTupletStemOverrides,
            ...crossStaffTremoloStemOverrides,
            ...authoredStemOverrides,
          ])
        : undefined;
    const { beamsBuilder, beamRenderer, stemDirections } = buildBeamsRenderer(
      elements,
      this.effectiveTimeSig,
      noteStaffYCoords,
      chordStaffYCoords,
      tupletsByIndex,
      arpeggioRunIndices,
      // The 'combined' track's own array indices are contiguous (0..N-1)
      // but its real beat-time gaps between entries are not — see
      // rules/voiceCombineRules.ts. Every other track's positions are
      // still derived by BeamsBuilder's own sequential accumulation.
      voiceKey === 'combined' ? beatOffsets : undefined,
      stemDirectionsOverride,
      externallyBeamedIndices,
      combinedStemOverrides,
      this.#clefMarkers.map((marker) => this.#markerBeatOffset(marker)),
      tremoloGroups,
      mergeMarkerBeats(this.ownMarkerBeats, this.measureMarkerBeats)
        .filter((marker) => marker.kind === 'barline')
        .map((marker) => marker.beat)
    );
    // Beamed lengths come from the beam line and cross-staff ones from the
    // ancestor <music-measure>, so only unbeamed stems take their rule length.
    const hasOwnStem = (i: number): boolean => {
      const { nodeName, duration } = elements[i];
      return (
        nodeName !== MUSIC_REST_NODE &&
        !beamsBuilder.isBeamed(i) &&
        !isStemlessDuration(duration)
      );
    };
    const unbeamedExtensionPx = (i: number): number => {
      if (!hasOwnStem(i)) {
        return 0;
      }
      const element = elements[i] as NoteElementType | ChordElementType;
      const headYs = getStaffYs(element, noteStaffYCoords, chordStaffYCoords);
      return unbeamedTremoloStemExtensionPx({
        tremolo: element.tremolo,
        duration: element.duration,
        headYs,
        stemUp: stemDirections[i],
        staff: STAFF_BAND,
        stemExtensionPx: unbeamedStemExtensionPx(
          headYs,
          stemDirections[i],
          durationToFlagCountMap.get(element.duration) ?? 0,
          !(
            element.nodeName === MUSIC_NOTE_NODE &&
            isTriangle((element as NoteElementType).notehead)
          )
        ),
      });
    };
    this.#placeTriangles(
      elements,
      noteStaffYCoords,
      chordStaffYCoords,
      (i) => ({
        stemUp: stemDirections[i],
        stemExtensionPx: beamRenderer.stemExtension(i) + unbeamedExtensionPx(i),
        noFlags: beamsBuilder.isBeamed(i),
      })
    );
    const unbeamedExtensionsPx = elements.map((_, i) => unbeamedExtensionPx(i));
    const unbeamedStemTipExtensionsPx = elements.map((element, i) => {
      if (!hasOwnStem(i)) {
        return 0;
      }
      const headYs = getStaffYs(element, noteStaffYCoords, chordStaffYCoords);
      return (
        unbeamedExtensionsPx[i] +
        (Math.max(...headYs) - Math.min(...headYs)) +
        flagStemExtensionPx(durationToFlagCountMap.get(element.duration) ?? 0)
      );
    });

    const tremoloInks = elements.map((element, i) => {
      if (element.nodeName === MUSIC_REST_NODE) {
        return 0;
      }
      const noteOrChord = element as NoteElementType | ChordElementType;
      const headYs = getStaffYs(element, noteStaffYCoords, chordStaffYCoords);
      if (headYs.length === 0) {
        return 0;
      }
      return tremoloInkPastStemPx({
        tremolo: noteOrChord.tremolo ?? null,
        tuplet: noteOrChord.tremoloTuplet ?? null,
        duration: element.duration,
        headY: stemDirections[i] ? Math.min(...headYs) : Math.max(...headYs),
        stemUp: stemDirections[i],
      });
    });

    const beamedIndices = new Set(
      elements.map((_, i) => i).filter((i) => beamsBuilder.isBeamed(i))
    );
    const tupletGroups = buildTupletGroups(elements, tupletsByIndex);

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const stemUp = stemDirections[i];
      const isBeamed = beamsBuilder.isBeamed(i);
      // The measure writes an externally beamed member's stemExtension.
      const isExternallyBeamed = externallyBeamedIndices.has(i);
      const extension = beamRenderer.stemExtension(i);

      if (element.nodeName === MUSIC_REST_NODE) {
        // no stem/beam/accidental properties — position is set in
        // #spaceElements() via restToYCoordinate(duration, voiceRestContext)
      } else if (element.nodeName === MUSIC_NOTE_NODE) {
        const noteElement = element as NoteElementType;
        const staffY = noteStaffYCoords.get(noteElement) ?? null;
        const triangle = isTriangle(noteElement.notehead);
        noteElement.batchUpdate(() => {
          noteElement.stemUp = stemUp;
          if (!isExternallyBeamed) {
            noteElement.stemExtension = isBeamed
              ? extension
              : unbeamedExtensionsPx[i];
          }
          noteElement.noFlags = isBeamed;
          noteElement.showAccidental =
            accidentals.noteShowAccidentals.get(noteElement);
          noteElement.accidentalParenthesized =
            accidentals.parenthesizedAccidentals.has(noteElement);
          noteElement.staffY = staffY;
          noteElement.nominalStaffY = triangle
            ? this.#noteToYCoordinateAtBeatOffset(
                noteElement.note,
                noteElement.octave ?? 4,
                beatOffsets[i]
              )
            : null;
          noteElement.resolvedGraceAccidentals =
            accidentals.graceShowAccidentals.get(noteElement) ?? null;
          noteElement.resolvedTrillFinishAccidentals =
            accidentals.trillFinishShowAccidentals.get(noteElement) ?? null;
          noteElement.resolvedTrillPitch = noteElement.trill
            ? resolveTrillPitch(
                noteElement.note,
                noteElement.octave ?? 4,
                this.#effectiveKeySig,
                this.#effectiveMode,
                noteElement.trillAccidental,
                noteElement.trillNote
              )
            : null;
        });
      } else {
        const chordElement = element as ChordElementType;
        const staffYCoordinates = chordStaffYCoords.get(chordElement) ?? [];
        const chordAccidentals =
          accidentals.chordNoteAccidentals.get(chordElement) ?? [];
        chordElement.batchUpdate(() => {
          chordElement.stemUp = stemUp;
          if (!isExternallyBeamed) {
            chordElement.stemExtension = isBeamed
              ? extension
              : unbeamedExtensionsPx[i];
          }
          chordElement.noFlags = isBeamed;
          chordElement.staffYCoordinates = staffYCoordinates;
          chordElement.noteAccidentals = chordAccidentals;
          chordElement.noteAccidentalsParenthesized =
            accidentals.chordParenthesizedAccidentals.get(chordElement) ?? [];
          chordElement.resolvedGraceAccidentals =
            accidentals.graceShowAccidentals.get(chordElement) ?? null;
          chordElement.resolvedTrillFinishAccidentals =
            accidentals.trillFinishShowAccidentals.get(chordElement) ?? null;
          chordElement.resolvedTrillPitch = chordElement.trill
            ? this.#resolveChordTrillPitch(chordElement, staffYCoordinates)
            : null;
        });
      }
    }

    const state: VoiceRenderState = {
      elements,
      beatOffsets,
      tupletsByIndex,
      tupletGroups,
      beamRenderer,
      stemDirections,
      unbeamedStemTipExtensionsPx,
      tremoloInkPastStemPx: tremoloInks,
      tremoloScaleByIndex: computeTremoloScaleByIndex(tremoloGroups),
      beamedIndices,
      externallyBeamedIndices,
      externallyPositionedRestIndices,
      noteStaffYCoords,
      chordStaffYCoords,
      noteXPositions: new Map(),
      firstGraceHeadXPositions: new Map(),
      writtenTrillFootprints: new Map(),
      trillFinishFootprints: new Map(),
      direction: pitchDriven ? null : direction,
    };
    // Resolved before #spaceElements(), which reads them.
    state.writtenTrillFootprints = this.#computeWrittenTrillFootprints(state);
    state.trillFinishFootprints = this.#computeTrillFinishFootprints(state);
    return state;
  }

  #renderNotes(): void {
    this.#clearSyntheticElements();

    const voiceNumbers = [...this.#voices.keys()];
    const isMultiVoice = voiceNumbers.length > 1;

    // Pass 1: per real voice — bar-fit truncate, compute beat offsets.
    type Pass1Voice = {
      elements: NoteChordOrRestElementType[];
      beatOffsets: number[];
      tupletsByIndex: Map<number, TupletElementType[]>;
      arpeggioGroups: ArpeggioGroupPlacement[];
      tremoloGroups: TremoloGroupPlacement[];
    };
    const pass1ByVoice = new Map<VoiceNumber, Pass1Voice>();
    this.#beatOffsetByElement = new Map();
    for (const voiceNumber of voiceNumbers) {
      const voiceData = this.#voices.get(voiceNumber);
      if (!voiceData) {
        continue;
      }
      const { allowedElementCount, error } = computeAllowedElementCount(
        voiceData.flatElements,
        this.effectiveTimeSig,
        voiceData.tupletsByIndex,
        voiceData.arpeggioGroups,
        voiceData.tremoloGroups
      );
      if (error !== null) {
        console.warn(isMultiVoice ? `[voice ${voiceNumber}] ${error}` : error);
      }
      for (let i = 0; i < voiceData.flatElements.length; i++) {
        voiceData.flatElements[i].style.display =
          i < allowedElementCount ? '' : 'none';
      }
      const elements = voiceData.flatElements.slice(0, allowedElementCount);
      const arpeggioRunIndices = new Set<number>(
        voiceData.arpeggioGroups.flatMap((group) => group.runIndices)
      );
      // A tremolo cut by the bar-fit falls back to plain notes.
      const tremoloGroups = voiceData.tremoloGroups.filter((group) =>
        group.memberIndices.every((index) => index < allowedElementCount)
      );
      const beatOffsets = computeBeatOffsets(
        elements,
        voiceData.tupletsByIndex,
        arpeggioRunIndices,
        computeTremoloScaleByIndex(tremoloGroups)
      );
      elements.forEach((element, i) =>
        this.#beatOffsetByElement.set(element, beatOffsets[i])
      );
      pass1ByVoice.set(voiceNumber, {
        elements,
        beatOffsets,
        tupletsByIndex: voiceData.tupletsByIndex,
        arpeggioGroups: voiceData.arpeggioGroups,
        tremoloGroups,
      });
    }

    // Clef markers index into voice 1; #voice1BeatOffsets converts those
    // indices into beat-offsets every voice can compare against.
    const voice1 = pass1ByVoice.get(1);
    const allowedElementCount = voice1?.elements.length ?? 0;
    this.#voice1BeatOffsets = voice1?.beatOffsets ?? [];
    const voice1ArpeggioRunIndices = new Set<number>(
      voice1?.arpeggioGroups.flatMap((group) => group.runIndices) ?? []
    );
    this.#voice1BeatEnds = (voice1?.elements ?? []).map(
      (element, i) =>
        this.#voice1BeatOffsets[i] +
        durationContribution(
          element,
          i,
          voice1?.tupletsByIndex ?? new Map(),
          voice1ArpeggioRunIndices,
          computeTremoloScaleByIndex(voice1?.tremoloGroups ?? [])
        )
    );
    const survivingMarkers: StreamMarkerPlacement[] = [];
    for (const marker of this.#streamMarkers) {
      if (marker.afterElementIndex < allowedElementCount) {
        survivingMarkers.push(marker);
      } else {
        marker.element.style.display = 'none';
      }
    }
    this.#setStreamMarkers(survivingMarkers);

    // Cross-voice pre-pass: shared-rest detection (v1-scoped, only ever
    // considered once 2+ voices are active), then — only if it didn't fire
    // — combine detection (also v1-scoped, 2+ voices).
    type TrackInput = Pass1Voice;
    const trackInputs = new Map<VoiceKey, TrackInput>();

    // Pass 1.5: each real voice's Y-coordinates, computed once for combine
    // detection (unisons), voice 3's direction and Pass 2.
    const yCoordsByVoice = new Map<VoiceNumber, VoiceStaffYCoords>();
    for (const [voiceNumber, p] of pass1ByVoice) {
      yCoordsByVoice.set(
        voiceNumber,
        this.#resolveVoiceStaffYCoords(p.elements, p.beatOffsets)
      );
    }

    const sharedRestDuration = isMultiVoice
      ? detectSharedWholeMeasureRest(
          new Map(
            [...pass1ByVoice.entries()].map(([vn, p]) => [vn, p.elements])
          ),
          this.effectiveTimeSig
        )
      : null;

    if (sharedRestDuration !== null) {
      for (const p of pass1ByVoice.values()) {
        for (const element of p.elements) {
          element.style.display = 'none';
        }
      }
      const sharedRest = this.#synthesizeSharedRest(sharedRestDuration);
      trackInputs.set('shared-rest', {
        elements: [sharedRest],
        beatOffsets: [0],
        tupletsByIndex: new Map(),
        arpeggioGroups: [],
        tremoloGroups: [],
      });
    } else {
      const combineInputs = new Map<VoiceNumber, VoiceCombineInput>();
      for (const [voiceNumber, p] of pass1ByVoice) {
        combineInputs.set(voiceNumber, {
          elements: p.elements,
          beatOffsets: p.beatOffsets,
          tupletsByIndex: p.tupletsByIndex,
          arpeggioRunIndices: new Set(
            p.arpeggioGroups.flatMap((group) => group.runIndices)
          ),
          arpeggioTargetIndices: new Set(
            p.arpeggioGroups.map((group) => group.targetIndex)
          ),
          tremoloMemberIndices: new Set(
            p.tremoloGroups.flatMap((group) => group.memberIndices)
          ),
          staffYsOf: (index) => {
            const coords = yCoordsByVoice.get(voiceNumber);
            return coords
              ? getStaffYs(
                  p.elements[index],
                  coords.noteStaffYCoords,
                  coords.chordStaffYCoords
                )
              : [];
          },
        });
      }
      const combinedGroups = isMultiVoice
        ? detectCombinableGroups(combineInputs)
        : [];

      const removedIndicesByVoice = new Map<VoiceNumber, Set<number>>();
      for (const group of combinedGroups) {
        for (const member of group.members) {
          const set =
            removedIndicesByVoice.get(member.voiceNumber) ?? new Set<number>();
          set.add(member.index);
          removedIndicesByVoice.set(member.voiceNumber, set);
        }
      }

      for (const [voiceNumber, p] of pass1ByVoice) {
        const removed = removedIndicesByVoice.get(voiceNumber);
        if (!removed || removed.size === 0) {
          trackInputs.set(voiceNumber, p);
          continue;
        }
        const keptElements: NoteChordOrRestElementType[] = [];
        const keptBeatOffsets: number[] = [];
        for (let i = 0; i < p.elements.length; i++) {
          if (removed.has(i)) {
            p.elements[i].style.display = 'none';
            continue;
          }
          keptElements.push(p.elements[i]);
          keptBeatOffsets.push(p.beatOffsets[i]);
        }
        trackInputs.set(voiceNumber, {
          elements: keptElements,
          beatOffsets: keptBeatOffsets,
          tupletsByIndex: reindexTupletsByIndex(p.tupletsByIndex, removed),
          arpeggioGroups: reindexArpeggioGroups(p.arpeggioGroups, removed),
          tremoloGroups: reindexTremoloGroups(p.tremoloGroups, removed),
        });
      }

      if (combinedGroups.length > 0) {
        const combinedElements = combinedGroups.map((group) =>
          this.#synthesizeCombinedChord(group)
        );
        trackInputs.set('combined', {
          elements: combinedElements,
          beatOffsets: combinedGroups.map((group) => group.beatOffset),
          tupletsByIndex: new Map(),
          arpeggioGroups: [],
          tremoloGroups: [],
        });
      }
    }

    // One sequence across every track, merged by beat-offset: an accidental
    // in one voice applies to every voice on the staff for the rest of the bar.
    const mergedForAccidentals: {
      element: NoteChordOrRestElementType;
      beatOffset: number;
    }[] = [];
    for (const input of trackInputs.values()) {
      for (let i = 0; i < input.elements.length; i++) {
        mergedForAccidentals.push({
          element: input.elements[i],
          beatOffset: input.beatOffsets[i],
        });
      }
    }
    mergedForAccidentals.sort((a, b) => a.beatOffset - b.beatOffset);
    const accidentals = computeNoteAccidentals(
      mergedForAccidentals.map((m) => m.element),
      this.#effectiveKeySig,
      this.#effectiveMode
    );

    const staffYsByVoice = new Map<VoiceNumber, VoiceDirectionInput[]>();
    for (const [voiceNumber, p] of pass1ByVoice) {
      const y = yCoordsByVoice.get(voiceNumber);
      if (!y) {
        continue;
      }
      staffYsByVoice.set(
        voiceNumber,
        p.elements.map((element, i) => ({
          staffYs: getStaffYs(element, y.noteStaffYCoords, y.chordStaffYCoords),
          beatOffset: p.beatOffsets[i],
        }))
      );
    }

    // Pass 2: per active voice key — Y-resolution, beams/stems, rest-Y
    // context, per-element property writes, tuplet groups, trill footprints.
    const directionsByVoice = resolveVoiceDirections(
      voiceNumbers,
      staffYsByVoice
    );
    const newRenderStates = new Map<VoiceKey, VoiceRenderState>();
    const activeKeys = new Set<VoiceKey>(trackInputs.keys());

    for (const [voiceKey, input] of trackInputs) {
      const direction: VoiceDirection =
        typeof voiceKey === 'number'
          ? directionsByVoice.get(voiceKey) ?? 'up'
          : 'up';
      const pitchDriven = !isMultiVoice || voiceKey === 'combined';
      const state = this.#buildVoiceRenderState(
        voiceKey,
        input.elements,
        input.beatOffsets,
        input.tupletsByIndex,
        input.arpeggioGroups,
        input.tremoloGroups,
        direction,
        pitchDriven,
        accidentals,
        typeof voiceKey === 'number' ? yCoordsByVoice.get(voiceKey) : undefined
      );
      newRenderStates.set(voiceKey, state);
    }

    // Every voice key's previous elements, so a dropped element's
    // impliedArpeggio is cleared whichever voice it came from.
    const previousStates = this.#voiceRenderStates;
    for (const [voiceKey, state] of newRenderStates) {
      this.#resolveArpeggiandoPassages(
        state.elements,
        previousStates.get(voiceKey)?.elements ?? []
      );
    }
    for (const [voiceKey, previous] of previousStates) {
      if (!newRenderStates.has(voiceKey)) {
        this.#resolveArpeggiandoPassages([], previous.elements);
      }
    }

    this.#voiceRenderStates = newRenderStates;

    this.#prepareVoiceContainers(this.#beamsContainers, activeKeys);
    this.#prepareVoiceContainers(this.#tupletContainers, activeKeys);
    this.#prepareVoiceContainers(this.#dynamicsContainers, activeKeys);
    this.#prepareVoiceContainers(this.#trillLinesContainers, activeKeys);
    this.#prepareVoiceContainers(this.#octaveSignsContainers, activeKeys);
    this.#prepareVoiceContainers(this.#tremoloLabelContainers, activeKeys);

    this.#spaceElements();

    for (const [voiceKey, state] of this.#voiceRenderStates) {
      const container = this.#containerFor(
        this.#beamsContainers,
        voiceKey,
        'beams-container'
      );
      for (const svgGroup of state.beamRenderer?.svgGroups ?? []) {
        container.appendChild(svgGroup);
      }
    }

    this.dispatchEvent(
      new CustomEvent(STAFF_EVENTS.NOTES_POSITIONED, {
        bubbles: true,
        composed: true,
      })
    );

    this.drawConnectorsWhenStandalone();

    // Min/natural width per voice key; the staff reports the max. Two voices
    // wanting room at one beat could need more than either alone, but
    // #spaceElements() still clamps collisions per voice.
    let maxMinWidth = 0;
    let maxNaturalWidth = 0;
    let strutInputs: StaffStrutInputs | null = null;
    let anyVoiceHasContent = false;
    for (const [voiceKey, state] of this.#voiceRenderStates) {
      if (state.elements.length === 0) {
        continue;
      }
      anyVoiceHasContent = true;
      // The first entry's accidental sits before the describe area; every
      // later one's sits between two entries (see #entryLeftwardExtent).
      let leftwardWidth = this.#entryLeftwardExtent(state.elements[0]);
      for (let i = 1; i < state.elements.length; i++) {
        leftwardWidth += this.#entryLeftwardExtent(state.elements[i], false);
      }
      let rightwardWidth =
        totalMarkerWidth(
          mergeMarkerBeats(this.ownMarkerBeats, this.measureMarkerBeats)
        ) + this.endBarlineReserve;
      const reservedEndWarningWidth = this.endWarningSpace.reserved;
      for (let i = 0; i < state.elements.length; i++) {
        rightwardWidth += this.#rightwardFootprint(voiceKey, i);
        if (i > 0) {
          rightwardWidth += this.#advanceBeyondStrutTerms(voiceKey, state, i);
        }
      }
      const noteCount = state.elements.length;
      const minWidth = calculateStaffMinWidth(
        this.describeEndX,
        noteCount,
        leftwardWidth,
        rightwardWidth,
        reservedEndWarningWidth
      );
      const tupletScales = computeTupletScaleByIndex(
        state.elements,
        state.tupletsByIndex
      );
      const { totalWeight } = computeSpacingWeights(
        state.elements,
        new Map(
          state.elements.map((_, i) => [
            i,
            (tupletScales.get(i) ?? 1) *
              (state.tremoloScaleByIndex.get(i) ?? 1),
          ])
        )
      );
      const naturalWidth = calculateStaffNaturalWidth(minWidth, totalWeight);
      if (minWidth > maxMinWidth) {
        strutInputs = {
          noteCount,
          leftwardWidth,
          rightwardWidth,
          endWarningWidth: reservedEndWarningWidth,
          totalSlackWeight: totalWeight,
        };
      }
      maxMinWidth = Math.max(maxMinWidth, minWidth);
      maxNaturalWidth = Math.max(maxNaturalWidth, naturalWidth);
    }
    this.#currentStrutInputs = strutInputs;
    if (anyVoiceHasContent) {
      this.dispatchEvent(
        new CustomEvent(STAFF_EVENTS.STAFF_MIN_WIDTH, {
          bubbles: true,
          composed: false,
          detail: { minWidth: maxMinWidth, naturalWidth: maxNaturalWidth },
        })
      );
    }
  }

  #resolveChordStaffYCoordinates(
    notes: ChordNote[],
    beatOffset: number
  ): number[] {
    const result: number[] = [];
    let previousY = Infinity;
    const { octaves } = this.#renderDataForBeatOffset(beatOffset);

    for (const note of notes) {
      if (note.octave !== null) {
        const y = this.#noteToYCoordinateAtBeatOffset(
          note.value,
          note.octave ?? undefined,
          beatOffset
        );
        result.push(y);
        previousY = y;
      } else {
        // For notes without an explicit octave, find the largest Y (lowest pitch)
        // that is still strictly below the previous note's Y, ensuring ascending
        // pitch (root-position close voicing).
        const candidates: number[] = [];
        for (const octave of octaves) {
          const y = this.#noteToYCoordinateAtBeatOffset(
            note.value,
            octave,
            beatOffset
          );
          if (y > 0 && y < previousY) {
            candidates.push(y);
          }
        }
        const resolved =
          candidates.length > 0
            ? Math.max(...candidates)
            : this.#noteToYCoordinateAtBeatOffset(
                note.value,
                undefined,
                beatOffset
              );
        result.push(resolved);
        previousY = resolved;
      }
    }

    return result;
  }

  // The latest clef marker taking effect at or before `beatOffset`, or null
  // for the staff's own clef. Beat-anchored so it works for every voice.
  #activeClefAt(beatOffset: number): ClefType | null {
    const active = activeClefChangeIndex(
      this.#clefMarkers.map((marker) => this.#markerBeatOffset(marker)),
      beatOffset
    );
    return active === -1 ? null : this.#clefMarkers[active].element.clef;
  }

  // Each marker's voice-1 `afterElementIndex` as a beat-offset, in stream
  // order, with the room it takes.
  // Its own markers, and any other staff's barline it warns of a clef
  // before, so every staff makes room for the warning.
  override get ownMarkerBeats(): readonly MarkerBeat[] {
    const warningWidth = (beat: number) =>
      this.#markerWarningAt(beat) === null ? 0 : MID_BAR_WARNING_CLEF_WIDTH_PX;
    const own: MarkerBeat[] = this.#streamMarkers.map((marker) => {
      const beat = this.#markerBeatOffset(marker);
      return marker.kind === 'clef'
        ? {
            beat,
            kind: 'clef',
            width: CLEF_CHANGE_RESERVED_WIDTH_PX,
            barlineType: null,
          }
        : {
            beat,
            kind: 'barline',
            width:
              midBarBarlineSlotWidth(marker.element.type) + warningWidth(beat),
            barlineType: marker.element.type,
          };
    });
    for (const marker of this.measureMarkerBeats) {
      if (
        marker.kind === 'barline' &&
        marker.barlineType !== null &&
        warningWidth(marker.beat) > 0 &&
        !own.some(
          (mine) =>
            mine.kind === 'barline' &&
            Math.abs(mine.beat - marker.beat) <= MARKER_BEAT_EPSILON
        )
      ) {
        own.push({
          ...marker,
          width:
            midBarBarlineSlotWidth(marker.barlineType) +
            MID_BAR_WARNING_CLEF_WIDTH_PX,
        });
      }
    }
    return own;
  }

  override get ownBarlineSlotLefts(): readonly BarlineSlotLeft[] {
    return this.#ownBarlineSlotLefts;
  }

  #setStreamMarkers(markers: StreamMarkerPlacement[]): void {
    this.#streamMarkers = markers;
    this.#clefMarkers = markers.filter(
      (marker): marker is ClefMarker => marker.kind === 'clef'
    );
  }

  override get ownNotesStartX(): number {
    return this.#ownDescribeEndX;
  }

  protected override onMeasureLayoutChange(): void {
    this.#renderNotes();
  }

  protected override onBarlinesChange(): void {
    if (this.#voices.size > 0) {
      this.#renderNotes();
    }
  }

  // The markers whose slots this staff fills, with their index in `markers`:
  // its own clef changes and every barline in the measure.
  #markerSlots(markers: readonly MarkerBeat[]): MarkerSlot[] {
    const sameBeat = (marker: StreamMarkerPlacement, beat: number) =>
      Math.abs(this.#markerBeatOffset(marker) - beat) <= MARKER_BEAT_EPSILON;
    const unusedClefs = [...this.#clefMarkers];
    const slots: MarkerSlot[] = [];
    markers.forEach((marker, layoutIndex) => {
      if (marker.kind === 'barline') {
        slots.push({ marker, layoutIndex, clef: null });
        return;
      }
      const ownIndex = unusedClefs.findIndex((own) =>
        sameBeat(own, marker.beat)
      );
      if (ownIndex !== -1) {
        const [clef] = unusedClefs.splice(ownIndex, 1);
        slots.push({ marker, layoutIndex, clef });
      }
    });
    return slots;
  }

  // Each mid-bar barline glyph at the right of its slot, so it lines up
  // across staves whichever of them warn of a clef before it, and any
  // warning clef at the slot's left.
  #drawMidBarBarlines(
    slots: readonly {
      left: number;
      width: number;
      type: BarlineType;
      warning: ClefType | null;
    }[]
  ) {
    if (this.#midBarBarlinesContainer.parentNode !== this.transcribeContainer) {
      this.transcribeContainer.appendChild(this.#midBarBarlinesContainer);
    }
    this.#midBarBarlinesContainer.replaceChildren(
      ...slots.flatMap(({ left, width, type, warning }) => {
        const glyphs: SVGElement[] = [
          createBarlineSvg(
            type,
            this.staffLineCount,
            left + width - MID_BAR_BARLINE_PADDING_PX - barlineGlyphWidth(type)
          ),
        ];
        if (warning !== null) {
          glyphs.push(
            this.#courtesyClefSvg(warning, left + MID_BAR_BARLINE_PADDING_PX)
          );
        }
        return glyphs;
      })
    );
  }

  // A clef at COURTESY_CLEF_SCALE from `x`, scaled about the line it marks
  // so it still marks it.
  #courtesyClefSvg(clef: ClefType, x: number): SVGGElement {
    const pivotY =
      STAFF_LINE_START +
      STAFF_LINE_SPACING * CLEF_DEFINITIONS[clef].referenceLineIndex;
    const group = document.createElementNS(SVG_NS, 'g');
    group.classList.add('courtesy-clef');
    group.setAttribute(
      'transform',
      `translate(${x}, ${pivotY}) scale(${COURTESY_CLEF_SCALE}) translate(0, ${-pivotY})`
    );
    group.innerHTML = getClefRenderData(clef).clefSvg;
    return group;
  }

  // Draws the end-of-measure warnings right to left from `rightEdge`: time,
  // then the key change, then the clef, so they read clef → key → time.
  #drawEndWarnings(rightEdge: number) {
    if (this.#endWarningsContainer.parentNode !== this.transcribeContainer) {
      this.transcribeContainer.appendChild(this.#endWarningsContainer);
    }
    this.#endWarningsContainer.replaceChildren();
    const warnings = this.#endWarnings;
    if (warnings === null) {
      return;
    }
    let x = rightEdge - END_WARNING_GAP_PX;
    if (warnings.time !== null) {
      x -= timeSignatureWidth(warnings.time);
      this.#endWarningsContainer.appendChild(
        this.#timeSignatureSvgAt(x, this.convertTotimeInts(warnings.time))
      );
      x -= END_WARNING_GAP_PX;
    }
    if (warnings.key !== null) {
      const keyGroup = document.createElementNS(SVG_NS, 'g');
      const keyEnd = this.#appendKeyChangeSvg(
        keyGroup,
        0,
        warnings.key,
        warnings.clef ?? this.effectiveEndClef
      );
      x -= keyEnd;
      keyGroup.setAttribute('transform', `translate(${x}, 0)`);
      this.#endWarningsContainer.appendChild(keyGroup);
      x -= END_WARNING_GAP_PX;
    }
    if (warnings.clef !== null) {
      x -= COURTESY_CLEF_WIDTH_PX;
      this.#endWarningsContainer.appendChild(
        this.#courtesyClefSvg(warnings.clef, x)
      );
    }
  }

  // Draws the start repeat after the clef/key/time glyphs (or centred on the
  // barline it replaces) and returns where the start area now ends.
  #drawStartRepeat(describeEndX: number): number {
    if (this.#startRepeatContainer.parentNode !== this.transcribeContainer) {
      this.transcribeContainer.appendChild(this.#startRepeatContainer);
    }
    this.#startRepeatContainer.replaceChildren();
    const mode = this.startRepeat;
    if (mode === 'none') {
      return describeEndX;
    }
    const x = mode === 'shared-thick' ? 0 : describeEndX + REPEAT_START_LEAD_PX;
    const glyph = createStartRepeatSvg(mode, this.staffLineCount, x);
    this.#startRepeatContainer.appendChild(glyph);
    const width = barlineGlyphWidth('repeat-start');
    return Math.max(
      describeEndX,
      mode === 'shared-thick' ? width - BARLINE_THICK_PX / 2 : x + width
    );
  }

  #markerBeatOffset(marker: StreamMarkerPlacement): number {
    return markerBeat(marker.afterElementIndex, this.#voice1BeatEnds);
  }

  #renderDataForBeatOffset(beatOffset: number): {
    yCoordinates: YCoordinates;
    octaves: Octave[];
  } {
    const clef = this.#activeClefAt(beatOffset);
    if (clef === null) {
      return { yCoordinates: this.yCoordinates, octaves: this.octaves };
    }
    const { yCoordinates, octaves } = getClefRenderData(clef);
    return { yCoordinates, octaves };
  }

  // Null on staves with no comparable clef (vocal); courtesy-clef logic
  // skips them.
  protected get ownClef(): ClefType | null {
    return null;
  }

  // The clef at the start of the note stream. A leading <music-clef> sits at
  // beat-offset -1, so querying -0.5 finds only that one.
  public get effectiveStartClef(): ClefType | null {
    return this.#activeClefAt(-0.5) ?? this.ownClef;
  }

  // The clef in effect after the last note/chord/rest — the last marker's
  // clef, or the start clef if there are no markers.
  public get effectiveEndClef(): ClefType | null {
    return this.#activeClefAt(Number.POSITIVE_INFINITY) ?? this.ownClef;
  }

  // When `element` starts within this measure, as a whole-note fraction —
  // the offset its x is laid out from, so it compares across staves without
  // waiting for layout. Null for an element this staff didn't render.
  beatOffsetOf(element: Element): number | null {
    return this.#beatOffsetByElement.get(element) ?? null;
  }

  // `elementIndex` indexes voice 1 (the host-app contract). With no index the
  // staff's own clef applies; an index past the end resolves as "after
  // everything". Internal per-voice callers use
  // #noteToYCoordinateAtBeatOffset instead.
  public noteToYCoordinate(
    note: Note,
    octave?: Octave,
    elementIndex?: number
  ): number {
    let beatOffset = Number.NEGATIVE_INFINITY;
    if (elementIndex !== undefined) {
      beatOffset =
        elementIndex < this.#voice1BeatOffsets.length
          ? this.#voice1BeatOffsets[elementIndex]
          : Number.POSITIVE_INFINITY;
    }
    return this.#noteToYCoordinateAtBeatOffset(note, octave, beatOffset);
  }

  #noteToYCoordinateAtBeatOffset(
    note: Note,
    octave: Octave | undefined,
    beatOffset: number
  ): number {
    if (!note) {
      return 0;
    }

    // Strip accidentals: take the first character (always the letter A-G).
    const letter = note[0].toUpperCase();
    const { yCoordinates, octaves } = this.#renderDataForBeatOffset(beatOffset);

    if (octave !== undefined) {
      const yCoordinate =
        yCoordinates[`${letter}${octave}` as NoteLetterOctave];
      if (yCoordinate !== undefined) {
        return yCoordinate;
      }
      return extrapolateYCoordinate(letter, octave, yCoordinates);
    }

    for (const n of octaves) {
      const yCoordinate = yCoordinates[`${letter}${n}` as NoteLetterOctave];
      if (yCoordinate !== undefined) {
        return yCoordinate;
      }
    }
    return extrapolateYCoordinate(letter, octaves[0] ?? 4, yCoordinates);
  }

  // Rightward footprint (px) per writtenNoteAnchorIndex of a written trilling
  // notehead (trill-note). Call after resolvedTrillPitch is set for this pass.
  #computeWrittenTrillFootprints(state: VoiceRenderState): Map<number, number> {
    const footprints = new Map<number, number>();
    for (const span of resolveTrillSpans(state.elements)) {
      const startElement = state.elements[span.startIndex];
      if (
        startElement.nodeName !== MUSIC_NOTE_NODE &&
        startElement.nodeName !== MUSIC_CHORD_NODE
      ) {
        continue;
      }
      const resolvedTrillPitch = (
        startElement as NoteElementType | ChordElementType
      ).resolvedTrillPitch;
      if (resolvedTrillPitch?.written !== true) {
        continue;
      }
      const width = computeWrittenTrillNoteWidth(resolvedTrillPitch.accidental);
      footprints.set(
        span.writtenNoteAnchorIndex,
        (footprints.get(span.writtenNoteAnchorIndex) ?? 0) + width
      );
    }
    return footprints;
  }

  // Rightward footprint (px) per index of `trill-finish` grace notes, always
  // at their own host index.
  #computeTrillFinishFootprints(state: VoiceRenderState): Map<number, number> {
    const footprints = new Map<number, number>();
    for (let i = 0; i < state.elements.length; i++) {
      const element = state.elements[i];
      if (
        element.nodeName !== MUSIC_NOTE_NODE &&
        element.nodeName !== MUSIC_CHORD_NODE
      ) {
        continue;
      }
      const hostElement = element as NoteElementType | ChordElementType;
      const trillFinish = hostElement.trillFinish;
      if (trillFinish === null || trillFinish.length === 0) {
        continue;
      }
      const width = computeGraceFootprintWidth(
        trillFinish,
        hostElement.resolvedTrillFinishAccidentals
      );
      footprints.set(i, width + trillFinishTailOverhangPx(trillFinish.length));
    }
    return footprints;
  }

  // Extra advance (px) for an entry straight after a tail, which at the minimum
  // advance would crowd it. A rest's ink sits further left in its box than a
  // notehead's, so it needs more, and an up-stem's tail reaches further right
  // than a down-stem's, which leaves a following notehead enough room as it is.
  #tailFollowerRoom(state: VoiceRenderState, index: number): number {
    if (index === 0) {
      return 0;
    }
    const previous = state.elements[index - 1];
    if (previous.nodeName === MUSIC_REST_NODE) {
      return 0;
    }
    const { stemUp, noFlags, duration } = previous as
      | NoteElementType
      | ChordElementType;
    if (noFlags || (durationToFlagCountMap.get(duration) ?? 0) === 0) {
      return 0;
    }
    if (state.elements[index].nodeName === MUSIC_REST_NODE) {
      return stemUp
        ? REST_AFTER_UP_TAIL_EXTRA_ADVANCE_PX
        : REST_AFTER_DOWN_TAIL_EXTRA_ADVANCE_PX;
    }
    return stemUp ? NOTE_AFTER_UP_TAIL_EXTRA_ADVANCE_PX : 0;
  }

  // What entry `index`'s minimum advance needs beyond the strut's own terms for
  // it: MIN_NOTE_WIDTH, its non-accidental leftward extent and the previous
  // entry's rightward footprint. Mirrors the clamps in #spaceElements().
  #advanceBeyondStrutTerms(
    voiceKey: VoiceKey,
    state: VoiceRenderState,
    index: number
  ): number {
    const element = state.elements[index];
    const previousFootprint = this.#rightwardFootprint(voiceKey, index - 1);
    const advance = computeMinimumEntryAdvance(
      this.#tailFollowerRoom(state, index),
      this.#entryLeftwardExtent(element),
      previousFootprint
    );
    return Math.max(
      0,
      advance -
        MIN_NOTE_WIDTH -
        this.#entryLeftwardExtent(element, false) -
        previousFootprint
    );
  }

  // An entry's x (wrapper px) from its beat alone: its share of the width
  // left after the leading gap and every marker's reserved room, shifted
  // past each marker it comes after. Every voice uses the same formula, so
  // entries on the same beat line up across voices.
  #proportionalEntryX(
    state: VoiceRenderState,
    markers: readonly MarkerBeat[],
    remainingWidth: number,
    measureCapacity: number
  ): (i: number) => number {
    const measureOffsets = computeMeasureProportionalOffsets(
      state.beatOffsets,
      measureCapacity,
      remainingWidth - LEADING_NOTE_GAP_PX - totalMarkerWidth(markers)
    );
    return (i) =>
      this.describeEndX +
      LEADING_NOTE_GAP_PX +
      markerWidthReached(markers, state.beatOffsets[i]) +
      measureOffsets[i];
  }

  // Where the slot of `markers[index]` starts from its beat alone: just
  // before the entries on its beat, by the same formula as
  // #proportionalEntryX.
  #proportionalMarkerLeft(
    markers: readonly MarkerBeat[],
    index: number,
    remainingWidth: number,
    measureCapacity: number
  ): number {
    const [offset] = computeMeasureProportionalOffsets(
      [Math.max(0, markers[index].beat)],
      measureCapacity,
      remainingWidth - LEADING_NOTE_GAP_PX - totalMarkerWidth(markers)
    );
    return (
      this.describeEndX +
      LEADING_NOTE_GAP_PX +
      totalMarkerWidth(markers.slice(0, index)) +
      offset
    );
  }

  // Each entry's x (wrapper px) and leftward extent, floored against the entry
  // before it and kept clear of every marker whose slot is known
  // (`slotLefts` may cover only the earlier markers). Stops before `endBeat`.
  // Reads layout state only, so marker slots can be resolved from it before
  // anything is placed.
  #layoutVoiceEntries(
    voiceKey: VoiceKey,
    state: VoiceRenderState,
    slots: readonly MarkerBeat[],
    slotLefts: readonly number[],
    proportionalX: (i: number) => number,
    endBeat = Number.POSITIVE_INFINITY
  ): { x: number; leftwardWidth: number; rightEdge: number }[] {
    const placements: {
      x: number;
      leftwardWidth: number;
      rightEdge: number;
    }[] = [];
    let previousNoteX: number | null = null;
    let previousRightEdge = this.describeEndX + LEADING_NOTE_GAP_PX;
    let markersPassed = 0;
    for (let i = 0; i < state.elements.length; i++) {
      const beat = state.beatOffsets[i];
      if (beat >= endBeat - MARKER_BEAT_EPSILON) {
        break;
      }
      let markerRight: number | null = null;
      while (
        markersPassed < slotLefts.length &&
        slots[markersPassed].beat <= beat + MARKER_BEAT_EPSILON
      ) {
        markerRight = slotLefts[markersPassed] + slots[markersPassed].width;
        previousRightEdge = Math.max(previousRightEdge, markerRight);
        markersPassed++;
      }

      let x = proportionalX(i);
      // Collision floor: the proportional position has no built-in minimum
      // gap, so enforce one against the *previous* entry alone — never
      // looking ahead, so appending a new entry never moves a placed one.
      if (previousNoteX !== null) {
        x = Math.max(
          x,
          previousNoteX + MIN_NOTE_WIDTH + this.#tailFollowerRoom(state, i)
        );
      }
      // Everything drawn left of this entry (see #entryLeftwardExtent, the
      // single source of truth) must not cross into the describe area.
      const leftwardWidth = this.#entryLeftwardExtent(state.elements[i]);
      if (leftwardWidth > 0) {
        x = Math.max(
          x,
          this.describeEndX + NOTES_AREA_LEFT_MARGIN + leftwardWidth
        );
      }
      x = computeInterNoteSpacing(x, leftwardWidth, previousRightEdge);
      // A rightward-reserving decoration on the previous entry (a written
      // trilling notehead, a trill's finishing grace notes) reserves room
      // whether or not this entry has leftward decorations of its own.
      if (i > 0 && this.#rightwardFootprint(voiceKey, i - 1) > 0) {
        x = Math.max(x, previousRightEdge);
      }
      if (markerRight !== null) {
        x = Math.max(x, markerRight + leftwardWidth);
      }

      const rightEdge =
        x + NOTE_SVG_WIDTH + this.#rightwardFootprint(voiceKey, i);
      placements.push({ x, leftwardWidth, rightEdge });
      previousNoteX = x;
      previousRightEdge = rightEdge;
    }
    return placements;
  }

  // Left edge (wrapper px) of each marker's slot, in `slots` order: right
  // after the last entry, in any voice, that starts before the marker. A
  // barline also keeps to its proportional place (`barlineFloor`) so it sits
  // midway between the beats either side, and to the measure's shared x so
  // it runs through every staff at once.
  #resolveMarkerSlots(
    slots: readonly MarkerBeat[],
    proportionalXByVoice: ReadonlyMap<VoiceKey, (i: number) => number>,
    barlineFloor: (slotIndex: number) => number
  ): number[] {
    const slotLefts: number[] = [];
    const ownBarlineSlotLefts: BarlineSlotLeft[] = [];
    for (const [slotIndex, slot] of slots.entries()) {
      const changeBeat = slot.beat;
      let left = this.describeEndX + LEADING_NOTE_GAP_PX;
      for (const [voiceKey, proportionalX] of proportionalXByVoice) {
        const state = this.#voiceRenderStates.get(voiceKey);
        if (!state) {
          continue;
        }
        const before = this.#layoutVoiceEntries(
          voiceKey,
          state,
          slots,
          slotLefts,
          proportionalX,
          changeBeat
        );
        if (before.length > 0) {
          left = Math.max(left, before[before.length - 1].rightEdge);
        }
      }
      if (slot.kind === 'barline') {
        left = Math.max(left, barlineFloor(slotIndex));
        ownBarlineSlotLefts.push({ beat: changeBeat, left });
        const shared = this.measureBarlineSlotLefts.find(
          (candidate) =>
            Math.abs(candidate.beat - changeBeat) <= MARKER_BEAT_EPSILON
        );
        if (shared !== undefined) {
          left = Math.max(left, shared.left);
        }
      }
      slotLefts.push(left);
    }
    this.#ownBarlineSlotLefts = ownBarlineSlotLefts;
    return slotLefts;
  }

  // The box a mid-stream clef glyph covers, in beams-container px: measured
  // from the glyph when laid out, otherwise the clef's whole drawing box.
  #clefBeamObstacle(marker: ClefMarker, leftInWrapper: number): BeamObstacle {
    const left = leftInWrapper - this.describeEndX;
    const hostTop = marker.element.getBoundingClientRect().top;
    const glyphRects = Array.from(
      marker.element.shadowRoot?.querySelectorAll('path') ?? []
    )
      .map((path) => path.getBoundingClientRect())
      .filter((rect) => rect.height > 0);
    const [top, bottom] =
      glyphRects.length > 0
        ? [
            Math.min(...glyphRects.map((rect) => rect.top)) - hostTop,
            Math.max(...glyphRects.map((rect) => rect.bottom)) - hostTop,
          ]
        : [0, MID_STREAM_CLEF_SVG_HEIGHT_PX];
    return {
      left,
      right: left + MID_STREAM_CLEF_WIDTH_PX,
      top: MID_STREAM_CLEF_Y_OFFSET + top,
      bottom: MID_STREAM_CLEF_Y_OFFSET + bottom,
    };
  }

  // What this part contributes to a unison with another voice.
  #unisonDescriptor(
    element: NoteElementType | ChordElementType,
    duration: DurationType,
    staffYs: readonly number[]
  ): UnisonPartDescriptor {
    if (element.nodeName === MUSIC_NOTE_NODE) {
      const note = element as NoteElementType;
      const pitchAccidental = suffixToType(parseAccidentalSuffix(note.note));
      return {
        duration: durationToBase[duration],
        pitchAccidental,
        shownAccidental:
          note.showAccidental === undefined
            ? pitchAccidental
            : note.showAccidental,
        notehead: resolveNoteheadGlyph(note.notehead, duration),
        isChord: false,
      };
    }
    const chord = element as ChordElementType;
    const headInput = {
      duration,
      staffYCoordinates: staffYs,
      stemUp: chord.stemUp,
      noFlags: chord.noFlags,
      noteheads: chord.toneNoteheads,
    };
    return {
      duration: durationToBase[duration],
      pitchAccidental: null,
      shownAccidental: null,
      isChord: true,
      tones: chord.notes.map((tone, index) => {
        const pitchAccidental = suffixToType(parseAccidentalSuffix(tone.value));
        const { left, right } = chordToneHeadExtentPx(headInput, index);
        return {
          staffY: staffYs[index],
          pitchAccidental,
          shownAccidental: chord.noteAccidentals[index] ?? null,
          headCenterX: (left + right) / 2,
          headLeftX: left,
          headRightX: right,
          notehead: resolveNoteheadGlyph(
            chord.toneNoteheads[index] ?? 'normal',
            duration
          ),
        };
      }),
      accidentalReachPx: chord.noteAccidentals.some((a) => a != null)
        ? totalChordAccidentalWidth(chord.noteAccidentals, [...staffYs])
        : 0,
    };
  }

  // Element-local head, stem and dot extents a cross-voice offset is
  // measured against.
  #voicePartGeometry(
    element: NoteElementType | ChordElementType,
    staffYs: readonly number[]
  ): VoicePartGeometry {
    const { stemUp, noFlags, duration } = element;
    let headLeftX: number;
    let headRightX: number;
    if (element.nodeName === MUSIC_NOTE_NODE) {
      const head = noteHeadGeometry(
        stemUp,
        duration,
        noFlags,
        (element as NoteElementType).notehead
      );
      headLeftX = (head.cx - head.halfWidth) * NOTE_SCALE;
      headRightX = (head.cx + head.halfWidth) * NOTE_SCALE;
    } else {
      const extent = chordHeadExtentPx({
        duration,
        staffYCoordinates: staffYs,
        stemUp,
        noFlags,
        noteheads: (element as ChordElementType).toneNoteheads,
      });
      headLeftX = extent.left;
      headRightX = extent.right;
    }
    const stemX = isStemlessDuration(duration)
      ? null
      : stemTipPosition(stemUp, duration, noFlags, 0).x * NOTE_SCALE;
    const drawsTails =
      stemUp &&
      !noFlags &&
      !element.noStem &&
      (durationToFlagCountMap.get(durationToBase[duration]) ?? 0) > 0;
    return {
      headLeftX,
      headRightX,
      stemX,
      dotsRightEdgeX: element.augmentationDotsRightEdgePx,
      tailRightX:
        drawsTails && stemX !== null ? stemX + TAIL_UP_WIDTH_PX : null,
    };
  }

  // Every decoration reserving room after an entry's right edge, summed.
  // Add new ones here, not at the call sites.
  #rightwardFootprint(voiceKey: VoiceKey, index: number): number {
    const state = this.#voiceRenderStates.get(voiceKey);
    if (!state) {
      return 0;
    }
    return (
      this.#augmentationDotFootprint(state, index) +
      (state.writtenTrillFootprints.get(index) ?? 0) +
      (state.trillFinishFootprints.get(index) ?? 0) +
      (this.#unisonReserves.get(voiceKey)?.get(index) ?? 0)
    );
  }

  // How far (px) an entry's duration dots reach past its own SVG box. The
  // written trilling notehead and trill-finish notes start after the dots.
  #augmentationDotFootprint(state: VoiceRenderState, index: number): number {
    const element = state.elements[index];
    const rightEdge = element?.augmentationDotsRightEdgePx ?? null;
    return rightEdge === null ? 0 : Math.max(0, rightEdge - NOTE_SVG_WIDTH);
  }

  // Total px an entry paints / needs left of its own SVG left edge (x = 0), from
  // every decoration drawn before it — wherever the pass that draws it lives:
  // this staff (accidental, grace run, element-local arpeggio sign + hairpin), or
  // an ancestor <music-measure>'s cross-staff arpeggio overlay (the span's wave +
  // continuous hairpin). Single source of truth for the "barline constraint" in
  // #spaceElements() and the strut min width in #renderNotes(). Add any new
  // left-of-entry decoration here, not at the call sites.
  //
  // Ties/slurs, ledger lines and tuplet brackets never reach past the
  // entry's own box, so they aren't counted.
  //
  // `includeAccidental` is false only for the non-first entries of the strut
  // min-width sum: their accidental column sits between two entries, so
  // #advanceBeyondStrutTerms() counts it. The first entry's column has only the
  // describe area to its left, so it always counts.
  #entryLeftwardExtent(
    element: NoteChordOrRestElementType,
    includeAccidental = true
  ): number {
    if (
      element.nodeName !== MUSIC_NOTE_NODE &&
      element.nodeName !== MUSIC_CHORD_NODE
    ) {
      return 0;
    }
    const el = element as NoteElementType | ChordElementType;
    let extent = 0;

    if (includeAccidental) {
      if (el.nodeName === MUSIC_NOTE_NODE) {
        const note = el as NoteElementType;
        const accidental = note.showAccidental;
        if (accidental) {
          extent +=
            accidentalSymbolWidth(accidental, note.accidentalParenthesized) +
            ACCIDENTAL_NOTE_GAP;
        }
      } else {
        const chord = el as ChordElementType;
        if (
          chord.staffYCoordinates &&
          chord.noteAccidentals.some((a) => a != null)
        ) {
          extent += totalChordAccidentalWidth(
            chord.noteAccidentals,
            chord.staffYCoordinates,
            chord.noteAccidentalsParenthesized
          );
        }
      }
    }

    extent += computeGraceFootprintWidth(
      el.grace,
      el.resolvedGraceAccidentals,
      el.graceHeadLeftOverhangsPx
    );

    const partner = crossStaffArpeggioPartner(el);
    // The wave may be authored only on the partner (lower) end, so fall back
    // to the partner's variant.
    const ownArpeggio = footprintArpeggio(el);
    const resolvedArpeggio =
      ownArpeggio ?? (partner !== null ? footprintArpeggio(partner) : null);
    extent += computeArpeggioFootprintWidth(
      resolvedArpeggio,
      elementHasShownAccidental(el),
      partner !== null
    );

    const hairpin = footprintArpeggioHairpin(el, partner);
    extent += computeArpeggioHairpinFootprintWidth(
      hairpin?.kind ?? null,
      hairpin?.from ?? null,
      hairpin?.to ?? null
    );

    // A glyph head wider than the ellipse pushes everything drawn left of it
    // further left (see noteHeadLeftOverhangPx).
    if (extent > 0) {
      extent += el.headLeftOverhangPx;
    }

    if (el.nodeName === MUSIC_CHORD_NODE && footprintArpeggio(el) !== null) {
      // A cluster chord's leftward-displaced second head only clears the entry's
      // SVG left edge once the arpeggio sign — positioned off that displaced
      // head — is present; without a sign the displaced head stays inside the
      // SVG's own left padding.
      extent += chordLeftHeadDisplacementPx(el as ChordElementType);
    }

    return extent;
  }

  // Sets the standard x/width/viewBox/height attributes shared by every
  // per-voice overlay container (beams/tuplets/dynamics/trill-lines) — they
  // all cover exactly the same notes area.
  #sizeVoiceContainer(container: SVGSVGElement, remainingWidth: number): void {
    container.setAttribute('x', `${this.describeEndX}`);
    container.setAttribute('width', `${remainingWidth}`);
    container.setAttribute(
      'viewBox',
      `0 0 ${remainingWidth} ${STAFF_TRANSCRIPTION_HEIGHT}`
    );
    container.setAttribute('height', `${STAFF_TRANSCRIPTION_HEIGHT}`);
  }

  // Every real voice's notes and chords, clustered by beat, for the
  // cross-voice pass ('combined'/'shared-rest' already merged or represent
  // every voice at once, so neither has anything left to collide with — see
  // rules/voiceRules.ts). `xOf` is where each entry sits.
  #collectPlacementColumns(
    xOf: (voiceNumber: VoiceNumber, index: number) => number | undefined
  ): { beatOffset: number; placements: VoiceNoteheadPlacement[] }[] {
    const columns: {
      beatOffset: number;
      placements: VoiceNoteheadPlacement[];
    }[] = [];
    for (const [voiceKey, state] of this.#voiceRenderStates) {
      if (typeof voiceKey !== 'number' || state.direction === null) {
        continue;
      }
      for (let i = 0; i < state.elements.length; i++) {
        const element = state.elements[i];
        if (element.nodeName === MUSIC_REST_NODE) {
          continue;
        }
        const noteOrChord = element as NoteElementType | ChordElementType;
        const duration = element.duration as DurationType;
        const staffYs = getStaffYs(
          element,
          state.noteStaffYCoords,
          state.chordStaffYCoords
        );
        const beatOffset = state.beatOffsets[i];
        let column = columns.find(
          (candidate) => Math.abs(candidate.beatOffset - beatOffset) < 1e-9
        );
        if (!column) {
          column = { beatOffset, placements: [] };
          columns.push(column);
        }
        column.placements.push({
          voiceNumber: voiceKey,
          localIndex: i,
          staffYCoordinates: staffYs,
          // The stem as drawn: `stem-direction` can overrule the voice's.
          direction: noteOrChord.stemUp ? 'up' : 'down',
          x: xOf(voiceKey, i),
          hasFlagOrBeam:
            state.beamedIndices.has(i) ||
            (durationToFlagCountMap.get(duration) ?? 0) > 0,
          dotCount: durationToDotCount[duration],
          geometry: this.#voicePartGeometry(noteOrChord, staffYs),
          unison: this.#unisonDescriptor(noteOrChord, duration, staffYs),
        });
      }
    }
    return columns;
  }

  // A unison moves a part right of its beat x, so the next beat must leave
  // room for it before it is placed: a trial layout finds each move and
  // #rightwardFootprint reserves it on every voice's entry at that beat. Reserving room can move a
  // later unison's parts apart, changing what that one needs, so this repeats
  // until nothing changes; each pass settles at least one more column, in beat
  // order. Returns the marker slots for the final reservation.
  #reserveUnisonRoom(
    isMultiVoice: boolean,
    slots: readonly MarkerBeat[],
    proportionalXByVoice: ReadonlyMap<VoiceKey, (i: number) => number>,
    barlineFloor: (slotIndex: number) => number
  ): number[] {
    this.#unisonReserves = new Map();
    let slotLefts = this.#resolveMarkerSlots(
      slots,
      proportionalXByVoice,
      barlineFloor
    );
    if (!isMultiVoice) {
      return slotLefts;
    }
    let passesLeft = Infinity;
    while (passesLeft-- > 0) {
      const xByVoice = new Map<VoiceKey, number[]>();
      for (const [voiceKey, proportionalX] of proportionalXByVoice) {
        const state = this.#voiceRenderStates.get(voiceKey);
        if (state) {
          xByVoice.set(
            voiceKey,
            this.#layoutVoiceEntries(
              voiceKey,
              state,
              slots,
              slotLefts,
              proportionalX
            ).map((placement) => placement.x)
          );
        }
      }
      const columns = this.#collectPlacementColumns(
        (voiceNumber, index) => xByVoice.get(voiceNumber)?.[index]
      ).filter((column) => column.placements.length >= 2);
      if (passesLeft === Infinity) {
        passesLeft = columns.length;
      }
      const reserves = new Map<VoiceKey, Map<number, number>>();
      for (const column of columns) {
        const reserve = Math.max(
          0,
          ...computeCrossVoiceDisplacements(column.placements)
            .filter((displacement) => displacement.isUnison)
            .map((displacement) => displacement.xOffset)
        );
        if (reserve === 0) {
          continue;
        }
        // Every voice's entry on that beat, rests too, so the next beat
        // stays one column across voices.
        for (const [voiceKey, state] of this.#voiceRenderStates) {
          if (voiceKey === 'shared-rest') {
            continue;
          }
          const index = state.beatOffsets.findIndex(
            (beatOffset) => Math.abs(beatOffset - column.beatOffset) < 1e-9
          );
          if (index >= 0) {
            const voiceReserves =
              reserves.get(voiceKey) ?? new Map<number, number>();
            voiceReserves.set(index, reserve);
            reserves.set(voiceKey, voiceReserves);
          }
        }
      }
      const unchanged =
        reserves.size === this.#unisonReserves.size &&
        [...reserves].every(([voiceKey, voiceReserves]) => {
          const previous = this.#unisonReserves.get(voiceKey);
          return (
            previous?.size === voiceReserves.size &&
            [...voiceReserves].every(
              ([index, reserve]) => previous.get(index) === reserve
            )
          );
        });
      if (unchanged) {
        break;
      }
      this.#unisonReserves = reserves;
      slotLefts = this.#resolveMarkerSlots(
        slots,
        proportionalXByVoice,
        barlineFloor
      );
    }
    return slotLefts;
  }

  // The square bracket over a stemless cluster, drawn from final positions.
  #renderUnisonOverlay(
    placementColumns: readonly {
      placements: readonly VoiceNoteheadPlacement[];
    }[],
    remainingWidth: number
  ): void {
    const container = this.#containerFor(
      this.#unisonContainers,
      1,
      'unison-container'
    );
    this.#sizeVoiceContainer(container, remainingWidth);
    container.innerHTML = '';

    // The head at one staff position of a note or chord part, from final
    // positions.
    const headAt = (
      voiceNumber: VoiceNumber,
      localIndex: number,
      staffY: number
    ) => {
      const state = this.#voiceRenderStates.get(voiceNumber);
      const element = state?.elements[localIndex];
      if (!state) {
        return null;
      }
      const x = state.noteXPositions.get(localIndex) ?? 0;
      if (element?.nodeName === MUSIC_NOTE_NODE) {
        const note = element as NoteElementType;
        const top = parseFloat(note.style.top || '0');
        const head = noteHeadGeometry(
          note.stemUp,
          note.duration,
          note.noFlags,
          note.notehead
        );
        return {
          left: x + (head.cx - head.halfWidth) * NOTE_SCALE,
          right: x + (head.cx + head.halfWidth) * NOTE_SCALE,
          centerY: top + head.cy * NOTE_SCALE,
          halfHeight: head.halfHeight * NOTE_SCALE,
        };
      }
      if (element?.nodeName === MUSIC_CHORD_NODE) {
        const chord = element as ChordElementType;
        const staffYs = state.chordStaffYCoords.get(chord) ?? [];
        const toneIndex = staffYs.indexOf(staffY);
        if (toneIndex < 0) {
          return null;
        }
        const extent = chordToneHeadExtentPx(
          {
            duration: chord.duration,
            staffYCoordinates: staffYs,
            stemUp: chord.stemUp,
            noFlags: chord.noFlags,
            noteheads: chord.toneNoteheads,
          },
          toneIndex
        );
        const head = noteHeadGeometry(
          chord.stemUp,
          chord.duration,
          chord.noFlags,
          chord.toneNoteheads[toneIndex] ?? 'normal'
        );
        return {
          left: x + extent.left,
          right: x + extent.right,
          centerY: chordToneHeadCenterY(
            staffY,
            chord.stemUp,
            chord.duration,
            chord.noFlags,
            chord.toneNoteheads[toneIndex] ?? 'normal'
          ),
          halfHeight: head.halfHeight * NOTE_SCALE,
        };
      }
      return null;
    };

    for (const column of placementColumns) {
      for (const cluster of resolveStemlessClusters(column.placements)) {
        const members = cluster.members
          .map((ref) => headAt(ref.voiceNumber, ref.localIndex, cluster.staffY))
          .filter((member): member is NonNullable<typeof member> => !!member);
        if (members.length < 2) {
          continue;
        }
        container.appendChild(
          createUnisonBracketSvg({
            leftX: Math.min(...members.map((member) => member.left)),
            rightX: Math.max(...members.map((member) => member.right)),
            topY:
              Math.min(...members.map((member) => member.centerY)) -
              members[0].halfHeight -
              CLUSTER_BRACKET_RISE_PX,
          })
        );
      }
    }
  }

  #spaceElements(): void {
    const transcribeRect = this.transcribeContainer.getBoundingClientRect();
    let describeEndX: number;
    if (typeof this.#describeContainer.getBBox === 'function') {
      const describeBBox = this.#describeContainer.getBBox();
      describeEndX = describeBBox.x + describeBBox.width;
    } else {
      const describeRect = this.#describeContainer.getBoundingClientRect();
      describeEndX = describeRect.right - transcribeRect.left;
    }
    this.#ownDescribeEndX = Math.round(this.#drawStartRepeat(describeEndX));
    // A drawn end barline is wider than the plain one, and end-of-measure
    // warnings sit before it, so the notes stop short of both.
    const remainingWidth =
      transcribeRect.width -
      this.describeEndX -
      this.endBarlineReserve -
      this.endWarningSpace.width;
    this.#drawEndWarnings(transcribeRect.width - this.endBarlineReserve);

    // Conservative budgets, before notes are positioned.
    const aboveStaffBudget = this.#estimateAboveStaffBudget();
    const belowStaffBudget = this.#estimateBelowStaffBudget();
    const containerWidth = Math.round(transcribeRect.width);
    const totalHeight =
      STAFF_TRANSCRIPTION_HEIGHT + aboveStaffBudget + belowStaffBudget;
    this.transcribeContainer.style.top =
      aboveStaffBudget > 0 ? `-${aboveStaffBudget}px` : '0px';
    this.transcribeContainer.style.height = `${totalHeight}px`;
    this.transcribeContainer.setAttribute(
      'viewBox',
      `0 -${aboveStaffBudget} ${containerWidth} ${totalHeight}`
    );

    // The containers are absolutely positioned in a fixed-height wrapper, so
    // the budgets only take page space through the host's margin.
    this.reserveVerticalSpace('transcription', {
      top: aboveStaffBudget,
      bottom: belowStaffBudget,
    });

    // An entry's x is its beat-offset over the measure's fixed beat capacity,
    // scaled by the available width. Neither depends on entry count, so
    // appending never moves a placed entry, and same-beat entries line up
    // across voices.
    const [beatsInMeasure, beatType] = this.effectiveTimeSig;
    const measureCapacity = beatsInMeasure / beatType;
    const isMultiVoice = this.#voices.size > 1;

    // Markers are staff-wide: every voice makes room for each one, and every
    // staff in the measure makes room for each other's too, so same-beat
    // entries stay aligned across voices and staves.
    const layoutMarkers = mergeMarkerBeats(
      this.ownMarkerBeats,
      this.measureMarkerBeats
    );
    const proportionalXByVoice = new Map<VoiceKey, (i: number) => number>();
    for (const [voiceKey, state] of this.#voiceRenderStates) {
      if (voiceKey !== 'shared-rest') {
        proportionalXByVoice.set(
          voiceKey,
          this.#proportionalEntryX(
            state,
            layoutMarkers,
            remainingWidth,
            measureCapacity
          )
        );
      }
    }
    // The slots this staff fills: its own clef changes (other staves' only
    // shift its entries) and every barline in the measure, which runs
    // through all of its staves.
    const slots = this.#markerSlots(layoutMarkers);
    const slotLefts = this.#reserveUnisonRoom(
      isMultiVoice,
      slots.map((slot) => slot.marker),
      proportionalXByVoice,
      (slotIndex) =>
        this.#proportionalMarkerLeft(
          layoutMarkers,
          slots[slotIndex].layoutIndex,
          remainingWidth,
          measureCapacity
        )
    );
    const clefObstacles: BeamObstacle[] = [];
    const barlineSlots: {
      left: number;
      width: number;
      type: BarlineType;
      warning: ClefType | null;
    }[] = [];
    slots.forEach((slot, k) => {
      if (slot.clef !== null) {
        const element = slot.clef.element;
        element.style.position = 'absolute';
        element.style.left = `${slotLefts[k]}px`;
        element.style.top = `${MID_STREAM_CLEF_Y_OFFSET}px`;
        element.style.display = '';
        clefObstacles.push(this.#clefBeamObstacle(slot.clef, slotLefts[k]));
      }
      if (slot.marker.kind === 'barline' && slot.marker.barlineType !== null) {
        barlineSlots.push({
          left: slotLefts[k],
          width: slot.marker.width,
          type: slot.marker.barlineType,
          warning: this.#markerWarningAt(slot.marker.beat),
        });
      }
    });
    this.#drawMidBarBarlines(barlineSlots);
    const slotMarkers = slots.map((slot) => slot.marker);

    for (const [voiceKey, state] of this.#voiceRenderStates) {
      state.noteXPositions.clear();
      state.firstGraceHeadXPositions.clear();

      const beamsContainer = this.#containerFor(
        this.#beamsContainers,
        voiceKey,
        'beams-container'
      );
      this.#sizeVoiceContainer(beamsContainer, remainingWidth);

      if (voiceKey === 'shared-rest') {
        // Every voice's silence at once: centred across the notes area, at
        // the undisplaced rest Y.
        const restElement = state.elements[0];
        if (restElement) {
          const x = sharedRestGlyphX(
            this.describeEndX,
            remainingWidth,
            NOTE_SVG_WIDTH
          );
          restElement.style.position = 'absolute';
          restElement.style.left = `${x}px`;
          restElement.style.top = `${restToYCoordinate(
            restElement.duration
          )}px`;
          state.noteXPositions.set(0, x - this.describeEndX);
        }
        continue;
      }

      const placements = this.#layoutVoiceEntries(
        voiceKey,
        state,
        slotMarkers,
        slotLefts,
        proportionalXByVoice.get(voiceKey) ?? (() => this.describeEndX)
      );

      for (let i = 0; i < state.elements.length; i++) {
        const element = state.elements[i];
        const duration = element.duration as DurationType;
        const { x: xInWrapper, leftwardWidth } = placements[i];

        // Notify beam renderer of final position after any accidental shift, so beam
        // endpoints stay in sync with the DOM positions of the chord elements.
        const xInBeamsContainer = xInWrapper - this.describeEndX;
        state.beamRenderer?.setX(i, xInBeamsContainer);
        state.noteXPositions.set(i, xInBeamsContainer);

        // Only needed when the element actually has a grace-dynamic to place —
        // computeFirstGraceHeadX still needs `grace` itself (a grace-dynamic
        // with no grace notes has nothing to anchor to and is simply skipped
        // by #renderDynamics via the same null check).
        const noteOrChordForGrace = element as INoteElement | IChordElement;
        if (
          element.nodeName !== MUSIC_REST_NODE &&
          noteOrChordForGrace.graceDynamic !== null &&
          noteOrChordForGrace.grace !== null
        ) {
          state.firstGraceHeadXPositions.set(
            i,
            computeFirstGraceHeadX(
              xInBeamsContainer,
              leftwardWidth,
              noteOrChordForGrace.grace,
              noteOrChordForGrace.resolvedGraceAccidentals,
              noteOrChordForGrace.graceHeadLeftOverhangsPx
            )
          );
        }

        element.style.position = 'absolute';
        element.style.left = `${xInWrapper}px`;

        if (element.nodeName === MUSIC_REST_NODE) {
          if (!state.externallyPositionedRestIndices.has(i)) {
            element.style.top = `${restToYCoordinate(
              element.duration,
              state.direction === null
                ? undefined
                : { direction: state.direction }
            )}px`;
          }
        } else if (element.nodeName === MUSIC_NOTE_NODE) {
          const noteElement = element as NoteElementType;
          const yHeadOffset = computeYHeadOffset(
            noteElement.stemUp,
            duration,
            noteElement.noFlags
          );
          // Pass 2's value: noteToYCoordinate()'s index means voice 1, so it
          // would pick the wrong clef segment for voice 2/3.
          const noteY =
            STAFF_Y_PADDING +
            (state.noteStaffYCoords.get(noteElement) ?? 0) -
            yHeadOffset;
          element.style.top = `${noteY}px`;
        } else {
          // Chord y-positioning is handled internally by the chord's own SVG rendering
          element.style.top = '0px';
        }
      }
    }

    // Beat-offset-clustered noteheads across every real voice, for the
    // cross-voice collision pass below (needs every voice's positions
    // resolved first — see rules/voiceRules.ts#computeCrossVoiceDisplacements).
    const placementColumns = this.#collectPlacementColumns(
      (voiceNumber, index) =>
        this.#voiceRenderStates.get(voiceNumber)?.noteXPositions.get(index)
    );

    for (const state of this.#voiceRenderStates.values()) {
      state.beamRenderer?.setObstacles(clefObstacles);
      state.beamRenderer?.spaceAll();
    }

    // Cross-voice collision pass (2+ real voices): a horizontal nudge on top
    // of the beat-position x.
    // Dot rows another voice decides (a dropped lower dot, one shared
    // column); every other element places its own, so stale rows reset.
    const dotRowsByElement = new Map<Element, number[]>();
    const dotShiftByElement = new Map<Element, number>();
    if (isMultiVoice) {
      for (const column of placementColumns) {
        if (column.placements.length < 2) {
          continue;
        }
        for (const rows of resolveCrossVoiceDotRows(column.placements)) {
          const element = this.#voiceRenderStates.get(rows.voiceNumber)
            ?.elements[rows.localIndex];
          if (element) {
            dotRowsByElement.set(element, rows.rowStaffYs);
            dotShiftByElement.set(element, rows.columnShiftPx);
          }
        }
      }
    }
    for (const state of this.#voiceRenderStates.values()) {
      for (const element of state.elements) {
        if (
          element.nodeName === MUSIC_NOTE_NODE ||
          element.nodeName === MUSIC_CHORD_NODE
        ) {
          (element as NoteElementType | ChordElementType).augmentationDotRows =
            dotRowsByElement.get(element) ?? null;
          if (element.nodeName === MUSIC_NOTE_NODE) {
            (element as NoteElementType).augmentationDotShiftPx =
              dotShiftByElement.get(element) ?? 0;
          }
        }
      }
    }

    const unisonPartByElement = new Map<Element, UnisonPart>();
    if (isMultiVoice) {
      let anyDisplacement = false;
      let overlappingSemibreves = false;
      for (const column of placementColumns) {
        if (column.placements.length < 2) {
          continue;
        }
        for (const displacement of computeCrossVoiceDisplacements(
          column.placements
        )) {
          const state = this.#voiceRenderStates.get(displacement.voiceNumber);
          if (!state) {
            continue;
          }
          const element = state.elements[displacement.localIndex];
          overlappingSemibreves ||= displacement.overlappingSemibreves;
          if (displacement.omitsHead) {
            unisonPartByElement.set(element, { omitsHead: true });
          }
          const currentLeft = parseFloat(element.style.left || '0');
          element.style.left = `${currentLeft + displacement.xOffset}px`;
          const currentX =
            state.noteXPositions.get(displacement.localIndex) ?? 0;
          const newX = currentX + displacement.xOffset;
          state.noteXPositions.set(displacement.localIndex, newX);
          state.beamRenderer?.setX(displacement.localIndex, newX);
          anyDisplacement = true;
        }
      }
      if (anyDisplacement) {
        for (const state of this.#voiceRenderStates.values()) {
          state.beamRenderer?.spaceAll();
        }
      }
      if (overlappingSemibreves !== this.#warnedSemibreveOverlap) {
        this.#warnedSemibreveOverlap = overlappingSemibreves;
        if (overlappingSemibreves) {
          console.warn(
            '[music-staff] overlapping or crossed semibreves are drawn as separate heads; dividing them into tied stemmed notes shows each part’s progression better.'
          );
        }
      }
    }
    const crossVoiceElements = new Set<NoteElementType | ChordElementType>();
    for (const state of this.#voiceRenderStates.values()) {
      for (const element of state.elements) {
        if (element.nodeName === MUSIC_NOTE_NODE) {
          (element as NoteElementType).unisonPart =
            unisonPartByElement.get(element) ?? null;
        }
        if (
          element.nodeName === MUSIC_NOTE_NODE ||
          element.nodeName === MUSIC_CHORD_NODE
        ) {
          crossVoiceElements.add(element as NoteElementType | ChordElementType);
        }
      }
    }
    for (const element of this.#crossVoiceElements) {
      if (!crossVoiceElements.has(element)) {
        resetCrossVoiceState(element);
      }
    }
    this.#crossVoiceElements = crossVoiceElements;

    // Reconcile each beamed stem to the beam as drawn, now X is known. The
    // only stem-length pass a bare resize runs.
    for (const state of this.#voiceRenderStates.values()) {
      if (state.beamRenderer === null) {
        continue;
      }
      for (let i = 0; i < state.elements.length; i++) {
        if (
          !state.beamedIndices.has(i) ||
          state.externallyBeamedIndices.has(i)
        ) {
          continue;
        }
        const element = state.elements[i];
        const extension = state.beamRenderer.stemExtension(i);
        if (element.nodeName === MUSIC_NOTE_NODE) {
          (element as NoteElementType).stemExtension = extension;
        } else if (element.nodeName === MUSIC_CHORD_NODE) {
          (element as ChordElementType).stemExtension = extension;
        }
      }
    }

    // Tuplet bracket rendering, per voice key. Note positions are now set
    // so x/y lookups work.
    for (const [voiceKey, state] of this.#voiceRenderStates) {
      const tupletContainer = this.#containerFor(
        this.#tupletContainers,
        voiceKey,
        'tuplets-container'
      );
      // Resizes re-run this without #renderNotes()'s clear.
      tupletContainer.innerHTML = '';
      this.#sizeVoiceContainer(tupletContainer, remainingWidth);

      // The cross-staff beam's Y at index i, else this staff's own beam, else
      // null (computeTupletBracketGeometry's staff-coord fallback).
      // A tremolo numeral beyond a beam counts as part of the beam stack.
      const tupletBeamYForIndex = (
        i: number,
        above: boolean
      ): number | null => {
        const edge = beamEdgeYForIndex(i, above);
        if (edge === null || state.stemDirections[i] !== above) {
          return edge;
        }
        const ink = state.tremoloInkPastStemPx[i];
        return above ? edge - ink : edge + ink;
      };
      const beamEdgeYForIndex = (i: number, above: boolean): number | null => {
        const delta = this.#crossStaffTupletBeamY?.get(state.elements[i]);
        if (delta === undefined) {
          return state.beamRenderer?.beamStackEdgeYForIndex(i, above) ?? null;
        }
        const natural = naturalStemTipY(
          i,
          state.elements,
          state.stemDirections,
          state.noteStaffYCoords,
          state.chordStaffYCoords
        );
        return natural === null ? null : natural + delta;
      };

      // Pass 1: inner groups (nestingLevel > 0) — beam-referenced numeral placement.
      const innerGeometriesByGroup = new Map<
        TupletGroup,
        TupletBracketGeometry
      >();
      for (const group of state.tupletGroups) {
        if (group.nestingLevel === 0 || this.#isTupletSuppressed(group)) {
          continue;
        }
        const hasInnerGroups = state.tupletGroups.some(
          (other) =>
            other.nestingLevel > group.nestingLevel &&
            other.indices.every((i) => group.indices.includes(i))
        );
        const geometry = computeTupletBracketGeometry(
          group,
          state.elements,
          state.noteXPositions,
          state.stemDirections,
          state.beamedIndices,
          state.noteStaffYCoords,
          state.chordStaffYCoords,
          null,
          hasInnerGroups,
          tupletBeamYForIndex,
          this.#tupletSideOverride(group),
          (i) =>
            state.unbeamedStemTipExtensionsPx[i] + state.tremoloInkPastStemPx[i]
        );
        if (geometry !== null) {
          innerGeometriesByGroup.set(group, geometry);
        }
      }

      // Pass 2: outer groups (nestingLevel=0) — baseY derived from actual inner numeralYs.
      const allGeometries: TupletBracketGeometry[] = [
        ...innerGeometriesByGroup.values(),
      ];
      for (const group of state.tupletGroups) {
        if (group.nestingLevel !== 0 || this.#isTupletSuppressed(group)) {
          continue;
        }
        const outerIndexSet = new Set(group.indices);
        const innerNumeralYs = [...innerGeometriesByGroup.entries()]
          .filter(([innerGroup]) =>
            innerGroup.indices.every((i) => outerIndexSet.has(i))
          )
          .map(([, geom]) => geom.numeralY);

        const stemUp = this.#tupletBracketAbove(state, group);
        const outerBaseY =
          innerNumeralYs.length > 0
            ? computeOuterBracketBaseY(innerNumeralYs, stemUp)
            : null;

        const hasInnerGroups = innerNumeralYs.length > 0;
        const geometry = computeTupletBracketGeometry(
          group,
          state.elements,
          state.noteXPositions,
          state.stemDirections,
          state.beamedIndices,
          state.noteStaffYCoords,
          state.chordStaffYCoords,
          outerBaseY,
          hasInnerGroups,
          tupletBeamYForIndex,
          this.#tupletSideOverride(group),
          (i) =>
            state.unbeamedStemTipExtensionsPx[i] + state.tremoloInkPastStemPx[i]
        );
        if (geometry !== null) {
          allGeometries.push(geometry);
        }
      }

      for (const geometry of allGeometries) {
        tupletContainer.appendChild(createTupletBracketSvg(geometry));
      }
    }

    // Dynamics/hairpins/arpeggiando text, per voice key.
    for (const voiceKey of this.#voiceRenderStates.keys()) {
      const dynamicsContainer = this.#containerFor(
        this.#dynamicsContainers,
        voiceKey,
        'dynamics-container'
      );
      this.#sizeVoiceContainer(dynamicsContainer, remainingWidth);
      this.#renderDynamics(voiceKey);
    }

    // Trill lines/signs/finish-slurs, per voice key.
    for (const voiceKey of this.#voiceRenderStates.keys()) {
      const trillLinesContainer = this.#containerFor(
        this.#trillLinesContainers,
        voiceKey,
        'trill-lines-container'
      );
      this.#sizeVoiceContainer(trillLinesContainer, remainingWidth);
      this.#redrawTrillLines(voiceKey, remainingWidth);
    }

    this.#renderTremoloLabels(remainingWidth);

    this.#renderUnisonOverlay(placementColumns, remainingWidth);

    // Octave signs, per voice key.
    for (const voiceKey of this.#voiceRenderStates.keys()) {
      const octaveSignsContainer = this.#containerFor(
        this.#octaveSignsContainers,
        voiceKey,
        'octave-signs-container'
      );
      this.#sizeVoiceContainer(octaveSignsContainer, remainingWidth);
      this.#renderOctaveSigns(voiceKey, remainingWidth);
    }
  }

  // `trem.` / `non trem.` labels sit above everything drawn over their note,
  // in any voice, and above the stave; one that would overlap an earlier
  // label moves up past it.
  #renderTremoloLabels(remainingWidth: number): void {
    const placed: { left: number; right: number; top: number }[] = [];
    for (const [voiceKey, state] of this.#voiceRenderStates) {
      const container = this.#containerFor(
        this.#tremoloLabelContainers,
        voiceKey,
        'tremolo-labels-container'
      );
      this.#sizeVoiceContainer(container, remainingWidth);
      container.innerHTML = '';
      for (let i = 0; i < state.elements.length; i++) {
        const label = tremoloLabelOf(state.elements[i]);
        if (label === null) {
          continue;
        }
        const left =
          (state.noteXPositions.get(i) ?? 0) +
          trillSignLeftX(state.stemDirections[i]);
        const right = left + tremoloLabelWidthPx(label);
        let baseline = this.#tremoloLabelBaselineY(voiceKey, state, i);
        for (const [otherKey, otherState] of this.#voiceRenderStates) {
          if (otherKey === voiceKey) {
            continue;
          }
          for (const [j, x] of otherState.noteXPositions) {
            if (x > right || x + NOTE_SVG_WIDTH < left) {
              continue;
            }
            const inkTop = this.#tremoloLabelInkTopY(otherState, j);
            if (inkTop !== null) {
              baseline = Math.min(baseline, inkTop - TREMOLO_LABEL_GAP_PX);
            }
          }
        }
        let moved = true;
        while (moved) {
          moved = false;
          for (const other of placed) {
            const overlapsAcross = other.left < right && left < other.right;
            const overlapsDown =
              baseline - TREMOLO_LABEL_FONT_SIZE_PX <
                other.top + TREMOLO_LABEL_FONT_SIZE_PX + TREMOLO_LABEL_GAP_PX &&
              baseline + TREMOLO_LABEL_GAP_PX > other.top;
            if (overlapsAcross && overlapsDown) {
              baseline = other.top - TREMOLO_LABEL_GAP_PX;
              moved = true;
            }
          }
        }
        placed.push({
          left,
          right,
          top: baseline - TREMOLO_LABEL_FONT_SIZE_PX,
        });
        container.appendChild(createTremoloLabel(left, baseline, label));
      }
    }
  }

  // Baseline (container Y) of entry i's tremolo label, before it moves past
  // other labels or other voices: a gap above the stave, the entry's own ink,
  // a tuplet bracket over it, a trill sign or line over it, and this voice's
  // above-staff dynamics row.
  #tremoloLabelBaselineY(
    voiceKey: VoiceKey,
    state: VoiceRenderState,
    i: number
  ): number {
    let top =
      STAFF_Y_PADDING + STAFF_TOP_LINE_Y - NOTE_HEAD_Y_OFFSET_CORRECTION;
    const consider = (y: number | null): void => {
      if (y !== null) {
        top = Math.min(top, y);
      }
    };
    consider(this.#tremoloLabelInkTopY(state, i));
    for (const group of state.tupletGroups) {
      if (
        group.indices.includes(i) &&
        !this.#isTupletSuppressed(group) &&
        this.#tupletBracketAbove(state, group)
      ) {
        consider(this.#tupletGroupExtremeY(state, group, true));
      }
    }
    for (const span of resolveTrillSpans(state.elements)) {
      const covers =
        i >= span.startIndex &&
        (span.hasLine
          ? span.endBeforeIndex === null || i < span.endBeforeIndex
          : i <= span.lastTiedIndex);
      if (covers) {
        const start = state.elements[span.startIndex] as
          | NoteElementType
          | ChordElementType;
        consider(
          TRILL_ABOVE_STAFF_BOTTOM_Y -
            TRILL_SIGN_HEIGHT_PX -
            (start.trillSignExtraLift ?? 0)
        );
      }
    }
    if (this.#dynamicsSidesInUse(voiceKey, state).has('above')) {
      consider(
        this.#dynamicsBaselineForSide(voiceKey, state, 'above') -
          DYNAMICS_FONT_SIZE
      );
    }
    return top - TREMOLO_LABEL_GAP_PX;
  }

  // Topmost ink (container Y) of entry i: its top head, then its up-stem, beam
  // and tremolo numeral, a stemless head's strokes, or the marks above a
  // down-stem head. Null for a rest.
  #tremoloLabelInkTopY(state: VoiceRenderState, i: number): number | null {
    const element = state.elements[i];
    if (element.nodeName === MUSIC_REST_NODE) {
      return null;
    }
    const noteOrChord = element as NoteElementType | ChordElementType;
    const headYs = getStaffYs(
      element,
      state.noteStaffYCoords,
      state.chordStaffYCoords
    );
    if (headYs.length === 0) {
      return null;
    }
    const topHeadY = Math.min(...headYs);
    const topHeadCenterY =
      STAFF_Y_PADDING + topHeadY - NOTE_HEAD_Y_OFFSET_CORRECTION;
    let top = topHeadCenterY - STAFF_Y_STEP;
    const stemUp = state.stemDirections[i];
    if (isStemlessDuration(element.duration)) {
      if (stemUp) {
        top = Math.min(
          top,
          topHeadCenterY -
            stemlessTremoloReachPx({
              tremolo: noteOrChord.tremolo ?? null,
              tuplet: noteOrChord.tremoloTuplet ?? null,
              duration: element.duration,
              headY: topHeadY,
              stemUp,
            })
        );
      }
    } else if (stemUp) {
      const beamEdge = state.beamRenderer?.beamStackEdgeYForIndex(i, true);
      const tip =
        beamEdge !== null && beamEdge !== undefined
          ? beamEdge - state.tremoloInkPastStemPx[i]
          : this.#extremeStemTipY(state, [i], true);
      if (tip !== null) {
        top = Math.min(top, tip);
      }
    } else {
      top = Math.min(
        top,
        topHeadCenterY -
          articulationStackDepth(noteOrChord.articulation, noteOrChord.stress) *
            NOTE_SCALE
      );
    }
    return top;
  }

  // Topmost Y (container) any of this voice's tremolo labels reaches before
  // stacking, allowing one more label row for each other voice with labels.
  // Null without labels.
  #tremoloLabelTopY(
    voiceKey: VoiceKey,
    state: VoiceRenderState
  ): number | null {
    let top: number | null = null;
    for (let i = 0; i < state.elements.length; i++) {
      if (tremoloLabelOf(state.elements[i]) === null) {
        continue;
      }
      const labelTop =
        this.#tremoloLabelBaselineY(voiceKey, state, i) -
        TREMOLO_LABEL_FONT_SIZE_PX;
      top = top === null ? labelTop : Math.min(top, labelTop);
    }
    if (top === null) {
      return null;
    }
    const otherVoicesWithLabels = [...this.#voiceRenderStates].filter(
      ([otherKey, otherState]) =>
        otherKey !== voiceKey &&
        otherState.elements.some((element) => tremoloLabelOf(element) !== null)
    ).length;
    return (
      top -
      otherVoicesWithLabels *
        (TREMOLO_LABEL_FONT_SIZE_PX + TREMOLO_LABEL_GAP_PX)
    );
  }

  #renderDynamics(voiceKey: VoiceKey): void {
    const state = this.#voiceRenderStates.get(voiceKey);
    if (!state) {
      return;
    }
    const container = this.#containerFor(
      this.#dynamicsContainers,
      voiceKey,
      'dynamics-container'
    );
    // Resizes re-run this without #renderNotes()'s clear.
    container.innerHTML = '';
    const defaultSide = this.#defaultDynamicsSide(voiceKey, state);
    const baselineFor = (side: DynamicsSide) =>
      this.#dynamicsBaselineForSide(voiceKey, state, side);
    for (let i = 0; i < state.elements.length; i++) {
      const element = state.elements[i];
      if (element.nodeName === MUSIC_REST_NODE) {
        continue;
      }
      const noteOrChord = element as INoteElement | IChordElement;
      // `dynamic-shared` moves this marking to a measure-level overlay
      // centered between this staff and its neighbor (see
      // measure.ts#redrawMeasureDynamics) instead of this staff's own local
      // placement — never render both.
      const markingSide = this.#markingPlacement(
        element as NoteOrChordElementType,
        defaultSide
      );
      if (
        noteOrChord.dynamic !== null &&
        !noteOrChord.dynamicShared &&
        markingSide !== 'measure'
      ) {
        const noteX = state.noteXPositions.get(i) ?? 0;
        const centerX = noteX + NOTE_SVG_WIDTH / 2;
        container.appendChild(
          createDynamicMarkingSvg(
            noteOrChord.dynamic,
            centerX,
            baselineFor(markingSide),
            { bracketed: noteOrChord.dynamicReminder }
          )
        );
      }

      // A grace-dynamic is independent of the host's `dynamic` (both can
      // show) and sits under the first grace note.
      if (noteOrChord.graceDynamic !== null) {
        const firstGraceHeadX = state.firstGraceHeadXPositions.get(i);
        if (firstGraceHeadX !== undefined) {
          container.appendChild(
            createDynamicMarkingSvg(
              noteOrChord.graceDynamic,
              firstGraceHeadX,
              baselineFor(defaultSide)
            )
          );
        }
      }
    }

    for (const pair of this.#pairVoiceHairpins(state).pairs) {
      if (pair.errors.length > 0) {
        console.warn(pair.errors);
      }
      const side = this.#hairpinPlacement(pair, defaultSide);
      if (side === 'measure') {
        continue;
      }
      container.appendChild(
        createHairpinSvg(
          pair.kind,
          pair.startX,
          pair.endX,
          baselineFor(side),
          HAIRPIN_OPEN_HEIGHT
        )
      );
    }

    this.#renderArpeggiandoText(voiceKey);
  }

  // An octave line sits outside all other notation: its nominal row is
  // pushed past this voice's other above/below-staff decorations, then past
  // the notes it covers.
  #octaveSignRowY(
    span: OctaveSpan,
    raisesPitch: boolean,
    voiceKey: VoiceKey,
    state: VoiceRenderState
  ): number {
    const fixedNominalY = raisesPitch
      ? OCTAVE_SIGN_ABOVE_STAFF_Y
      : OCTAVE_SIGN_BELOW_STAFF_Y;
    const otherEdgeY = raisesPitch
      ? this.#otherAboveStaffDecorationTopY(voiceKey, state)
      : this.#otherBelowStaffDecorationBottomY(voiceKey, state);
    const nominalY =
      otherEdgeY === null
        ? fixedNominalY
        : raisesPitch
        ? Math.min(
            fixedNominalY,
            otherEdgeY - OCTAVE_SIGN_NOTEHEAD_CLEARANCE_PX
          )
        : Math.max(
            fixedNominalY,
            otherEdgeY + OCTAVE_SIGN_NOTEHEAD_CLEARANCE_PX
          );

    const extremalStaffY = resolveOctaveSpanExtremalStaffY(
      span,
      raisesPitch,
      (i) =>
        getStaffYs(
          state.elements[i],
          state.noteStaffYCoords,
          state.chordStaffYCoords
        )
    );
    if (extremalStaffY === null) {
      return nominalY;
    }
    const headY =
      STAFF_Y_PADDING + extremalStaffY - NOTE_HEAD_Y_OFFSET_CORRECTION;
    const contentClearY = raisesPitch
      ? headY - NOTE_HEAD_RADIUS_PX - OCTAVE_SIGN_NOTEHEAD_CLEARANCE_PX
      : headY + NOTE_HEAD_RADIUS_PX + OCTAVE_SIGN_NOTEHEAD_CLEARANCE_PX;
    return raisesPitch
      ? Math.min(nominalY, contentClearY)
      : Math.max(nominalY, contentClearY);
  }

  #renderOctaveSigns(voiceKey: VoiceKey, remainingWidth?: number): void {
    const state = this.#voiceRenderStates.get(voiceKey);
    if (!state) {
      return;
    }
    const container = this.#containerFor(
      this.#octaveSignsContainers,
      voiceKey,
      'octave-signs-container'
    );
    // Resizes re-run this without #renderNotes()'s clear.
    container.innerHTML = '';
    const width =
      remainingWidth ??
      this.transcribeContainer.getBoundingClientRect().width -
        this.describeEndX;

    const { spans, warnings, standaloneLocoIndices } = resolveOctaveSpans(
      state.elements
    );
    // The only warning is an unterminated span. Inside a composition it may
    // carry on into the next measure, which only the composition's
    // track-wide pass can tell, so that pass warns instead.
    if (this.closest(MUSIC_COMPOSITION) === null) {
      for (const warning of warnings) {
        console.warn(warning);
      }
    }

    const trillSpansByStartIndex = new Map(
      resolveTrillSpans(state.elements).map((trillSpan) => [
        trillSpan.startIndex,
        trillSpan,
      ])
    );

    for (const { run: span, y, continues } of this.#octaveRunLayouts(
      spans,
      voiceKey,
      state
    )) {
      const startNoteX = state.noteXPositions.get(span.startIndex) ?? 0;
      const signWidth = octaveSignWidth(span.amount, span.mode);
      const signX = startNoteX - OCTAVE_SIGN_LEADING_GAP_PX - signWidth;
      const stopNoteX = state.noteXPositions.get(span.stopIndex) ?? startNoteX;
      // + OCTAVE_SIGN_CORNER_PX accounts for the corner glyph's own foot
      // stroke, which draws backward from this anchor — without it, the
      // corner's true leftmost ink lands OCTAVE_SIGN_CORNER_PX short of the
      // trailing gap this is meant to guarantee.
      let endX =
        stopNoteX +
        NOTE_SVG_WIDTH +
        this.#augmentationDotFootprint(state, span.stopIndex) +
        OCTAVE_SIGN_TRAILING_GAP_PX +
        OCTAVE_SIGN_CORNER_PX;
      // The closing note's own trill (if it has an active line) reaches
      // further right than its bare notehead — never let the octave line's
      // corner land short of where that trill line itself ends.
      const closingTrillSpan = trillSpansByStartIndex.get(span.stopIndex);
      if (closingTrillSpan?.hasLine) {
        const trillEndX = this.#trillLineEndX(state, closingTrillSpan, width);
        endX = Math.max(endX, trillEndX);
      }
      const raisesPitch = isOctaveRaise(span.amount);

      container.appendChild(
        createOctaveSignSvg(span.amount, signX, y, span.mode)
      );
      container.appendChild(
        createOctaveExtensionLineSvg(
          signX + signWidth,
          continues ? width : endX,
          y
        )
      );
      if (continues) {
        continue;
      }
      container.appendChild(createOctaveCornerSvg(endX, y, raisesPitch));
      if (span.closedBy === 'loco') {
        container.appendChild(
          createOctaveLocoLabelSvg(endX + OCTAVE_LOCO_GAP_PX, y, false)
        );
      }
    }

    for (const index of standaloneLocoIndices) {
      const noteX = state.noteXPositions.get(index) ?? 0;
      // Under a double-stemmed beam the reminder ends before its note, like
      // an octave sign's numeral, rather than running under the beam. Like
      // the numeral it reserves no leftward room: it sits clear of the staff
      // lines, and pushing its note right would pull it off the beat it
      // shares with the other hand.
      const x = state.externallyBeamedIndices.has(index)
        ? noteX - OCTAVE_SIGN_LEADING_GAP_PX - OCTAVE_LOCO_ESTIMATED_WIDTH_PX
        : noteX;
      // No open span here to derive raise/lower placement from — default to
      // the sopra position as a neutral choice for a standalone reminder.
      const y = OCTAVE_SIGN_ABOVE_STAFF_Y;
      container.appendChild(createOctaveLocoLabelSvg(x, y, true));
    }
  }

  // Each run as drawn: its row — the system-wide one when the span carries
  // on past this measure (see octaveContinuations) — and whether it is the
  // run that carries on. Shared by drawing and the vertical budget so the
  // two can't disagree.
  #octaveRunLayouts(
    spans: readonly OctaveSpan[],
    voiceKey: VoiceKey,
    state: VoiceRenderState
  ): { run: OctaveSpan; y: number; continues: boolean }[] {
    return spans.flatMap((span) => {
      const row = this.#octaveContinuations?.get(
        state.elements[span.startIndex]
      );
      const continuation = row?.starts ? row : undefined;
      const runs = this.#octaveSpanRuns(span, state);
      return runs.map((run, i) => ({
        run,
        y:
          continuation?.rowY ??
          this.#octaveSignRowY(run, isOctaveRaise(run.amount), voiceKey, state),
        continues: continuation !== undefined && i === runs.length - 1,
      }));
    });
  }

  // The runs a span is drawn as — split where the measure breaks a
  // one-hand line around the other hand's notes of a shared beam.
  #octaveSpanRuns(span: OctaveSpan, state: VoiceRenderState): OctaveSpan[] {
    const breaks = this.#crossStaffOctaveBreakAfter;
    if (breaks === null || breaks.size === 0) {
      return [span];
    }
    return splitOctaveSpanIntoRuns(
      span,
      new Set(
        span.members
          .filter((member) => breaks.has(state.elements[member.index]))
          .map((member) => member.index)
      )
    );
  }

  // `sempre arpeggiando` (abbreviated `sempre arpegg.`): from an element marked
  // arpeggiate="start" until the next arpeggiate="end" (or the end of the
  // staff), every note/chord that carries no explicit `arpeggio` gets an
  // implied `up` sign. Elements with their own `arpeggio` (including
  // `non-arpeggiate`) are left untouched. Runs before spacing so the implied
  // signs are counted in the leftward footprint.
  //
  // An element dropped mid-passage keeps its implied sign unless cleared here
  // (when no other staff took it).
  #resolveArpeggiandoPassages(
    elements: NoteChordOrRestElementType[],
    previousElements: NoteChordOrRestElementType[] = []
  ): void {
    const next = new Set(elements);
    for (const element of previousElements) {
      if (
        next.has(element) ||
        (element.nodeName !== MUSIC_NOTE_NODE &&
          element.nodeName !== MUSIC_CHORD_NODE)
      ) {
        continue;
      }
      const parent = element.parentElement;
      if (parent !== null && isStaffNodeName(parent.nodeName)) {
        continue;
      }
      (element as NoteElementType | ChordElementType).impliedArpeggio = null;
    }

    let inPassage = false;
    for (const element of elements) {
      if (
        element.nodeName !== MUSIC_NOTE_NODE &&
        element.nodeName !== MUSIC_CHORD_NODE
      ) {
        continue;
      }
      const noteOrChord = element as NoteElementType | ChordElementType;
      // start is inclusive (the marked element rolls); end is exclusive (the
      // marked element is the first one after the passage).
      if (noteOrChord.arpeggiate === 'start') {
        inPassage = true;
      } else if (noteOrChord.arpeggiate === 'end') {
        inPassage = false;
      }
      noteOrChord.impliedArpeggio =
        inPassage && noteOrChord.arpeggio === null ? 'up' : null;
    }
  }

  #renderArpeggiandoText(voiceKey: VoiceKey): void {
    const state = this.#voiceRenderStates.get(voiceKey);
    if (!state) {
      return;
    }
    const container = this.#containerFor(
      this.#dynamicsContainers,
      voiceKey,
      'dynamics-container'
    );
    for (let i = 0; i < state.elements.length; i++) {
      const element = state.elements[i];
      if (
        element.nodeName !== MUSIC_NOTE_NODE &&
        element.nodeName !== MUSIC_CHORD_NODE
      ) {
        continue;
      }
      if (
        (element as NoteElementType | ChordElementType).arpeggiate !== 'start'
      ) {
        continue;
      }
      const noteX = state.noteXPositions.get(i) ?? 0;
      container.appendChild(
        createSempreArpeggiandoText(
          noteX,
          STAFF_TOP_LINE_Y - ARPEGGIO_TEXT_ABOVE_STAFF_PX
        )
      );
    }
  }

  // The chord's own reference pitch for trill-pitch resolution: its topmost
  // (highest-pitch) note — staffYCoordinates is declaration order, not pitch
  // order, hence the Math.min lookup, mirroring the same pattern used for the
  // grace-slur's top-note anchoring in svgCreator/chord.ts.
  #resolveChordTrillPitch(
    chordElement: ChordElementType,
    staffYCoordinates: number[]
  ) {
    const notes = chordElement.notes;
    if (notes.length === 0 || staffYCoordinates.length === 0) {
      return null;
    }
    const topNoteIndex = staffYCoordinates.indexOf(
      Math.min(...staffYCoordinates)
    );
    return resolveTrillPitch(
      notes[topNoteIndex].value,
      notes[topNoteIndex].octave ?? 4,
      this.#effectiveKeySig,
      this.#effectiveMode,
      chordElement.trillAccidental,
      chordElement.trillNote
    );
  }

  #hasTrillMarkedElement(): boolean {
    return this.#allElements.some((element) => {
      if (element.nodeName === MUSIC_NOTE_NODE) {
        return (element as NoteElementType).trill;
      }
      if (element.nodeName === MUSIC_CHORD_NODE) {
        return (element as ChordElementType).trill;
      }
      return false;
    });
  }

  // Px to raise a trill's line (drawn here) and sign (drawn by the note, via
  // trillSignExtraLift) together past any other voice's up-stem content in
  // [startX, endX]. Never lowers them.
  #trillLineLiftClearingOtherVoices(
    ownVoiceKey: VoiceKey,
    startX: number,
    endX: number
  ): number {
    let lift = 0;
    for (const [otherKey, otherState] of this.#voiceRenderStates) {
      if (otherKey === ownVoiceKey) {
        continue;
      }
      const upStemOverlapping = otherState.elements
        .map((_, i) => i)
        .filter((i) => {
          if (!otherState.stemDirections[i]) {
            return false;
          }
          const x = otherState.noteXPositions.get(i);
          return x !== undefined && x + NOTE_SVG_WIDTH >= startX && x <= endX;
        });
      const extreme = this.#extremeStemTipY(
        otherState,
        upStemOverlapping,
        true
      );
      if (extreme !== null) {
        const requiredY = extreme - TRILL_ABOVE_STAFF_GAP_PX;
        lift = Math.max(lift, TRILL_ABOVE_STAFF_BOTTOM_Y - requiredY);
      }
    }
    return lift;
  }

  // Draws each same-measure trill line (+ end-notch) and, in written mode,
  // the parenthesized trilling notehead.
  #redrawTrillLines(voiceKey: VoiceKey, remainingWidth?: number): void {
    const state = this.#voiceRenderStates.get(voiceKey);
    if (!state) {
      return;
    }
    const container = this.#containerFor(
      this.#trillLinesContainers,
      voiceKey,
      'trill-lines-container'
    );
    // Resizes re-run this without #renderNotes()'s clear.
    container.innerHTML = '';
    const width =
      remainingWidth ??
      this.transcribeContainer.getBoundingClientRect().width -
        this.describeEndX;

    for (const span of resolveTrillSpans(state.elements)) {
      const startElement = state.elements[span.startIndex] as
        | NoteElementType
        | ChordElementType;
      const resolvedTrillPitch = startElement.resolvedTrillPitch;

      // Overlap is checked from the sign's left edge, line or no line.
      const stemUp = state.stemDirections[span.startIndex] ?? true;
      const startNoteX = state.noteXPositions.get(span.startIndex) ?? 0;
      const signLeftOffset = trillSignLeftX(stemUp);
      const signStartX = startNoteX + signLeftOffset;
      const endX = span.hasLine
        ? this.#trillLineEndX(state, span, width)
        : signStartX + TRILL_SIGN_WIDTH_PX;
      const lift = this.#trillLineLiftClearingOtherVoices(
        voiceKey,
        signStartX,
        endX
      );
      startElement.trillSignExtraLift = lift;

      if (resolvedTrillPitch?.written === true) {
        this.#drawWrittenTrillNote(
          state,
          container,
          span.startIndex,
          span.writtenNoteAnchorIndex,
          resolvedTrillPitch
        );
      }

      if (!span.hasLine) {
        continue;
      }

      const startX = signStartX + TRILL_SIGN_WIDTH_PX + TRILL_SIGN_LINE_GAP_PX;
      const y = TRILL_ABOVE_STAFF_BOTTOM_Y - lift;

      const line = createTrillLineSvg({ startX, endX, bottomY: y });
      if (line) {
        container.appendChild(line);
      }
      if (span.stopped) {
        container.appendChild(createTrillNotchSvg(endX, y));
      }
    }

    this.#drawTrillFinishSlurs(state, container);
  }

  // Where the line/notch ends, given a resolved trill span.
  #trillLineEndX(
    state: VoiceRenderState,
    span: TrillLineSpan,
    width: number
  ): number {
    if (span.stopped) {
      // Cut short rather than running to the next notehead — stop just past
      // this trill's own last tied note.
      const lastNoteX = state.noteXPositions.get(span.lastTiedIndex) ?? width;
      return lastNoteX + NOTE_SVG_WIDTH;
    }
    if (span.endBeforeIndex !== null) {
      return (
        (state.noteXPositions.get(span.endBeforeIndex) ?? width) -
        TRILL_LINE_END_GAP_PX
      );
    }
    return width;
  }

  // Approximate rendered center X and precise head Y (staff space) of the
  // note/chord at `index` — the "to-next" trill-finish slur's far endpoint
  // (see #drawTrillFinishSlurs). Returns null for a rest (nothing to slur
  // to) or an out-of-range index.
  #referenceHeadPosition(
    state: VoiceRenderState,
    index: number
  ): { xCenter: number; y: number } | null {
    const element = state.elements[index];
    if (element === undefined || element.nodeName === MUSIC_REST_NODE) {
      return null;
    }
    const noteX = state.noteXPositions.get(index) ?? 0;
    const xCenter = noteX + NOTE_SVG_WIDTH / 2;
    if (element.nodeName === MUSIC_NOTE_NODE) {
      const noteElement = element as NoteElementType;
      const rawY = this.noteToYCoordinate(
        noteElement.note,
        noteElement.octave ?? 4,
        index
      );
      return {
        xCenter,
        y: STAFF_Y_PADDING + rawY - NOTE_HEAD_Y_OFFSET_CORRECTION,
      };
    }
    const chordElement = element as ChordElementType;
    const staffYCoords = state.chordStaffYCoords.get(chordElement) ?? [];
    if (staffYCoords.length === 0) {
      return null;
    }
    return {
      xCenter,
      y: STAFF_Y_PADDING + staffYCoords[0] - NOTE_HEAD_Y_OFFSET_CORRECTION,
    };
  }

  // Draws the "to-next" half of a trill-finish slur, which reaches the next
  // element; the note draws the "to-main" half. Recomputes the note's layout
  // rather than reading its DOM.
  #drawTrillFinishSlurs(
    state: VoiceRenderState,
    container: SVGSVGElement
  ): void {
    for (let i = 0; i < state.elements.length; i++) {
      const element = state.elements[i];
      if (
        element.nodeName !== MUSIC_NOTE_NODE &&
        element.nodeName !== MUSIC_CHORD_NODE
      ) {
        continue;
      }
      const hostElement = element as NoteElementType | ChordElementType;
      const trillFinish = hostElement.trillFinish;
      if (trillFinish === null || trillFinish.length === 0) {
        continue;
      }
      if (
        hostElement.trillFinishSlur !== 'to-next' &&
        hostElement.trillFinishSlur !== 'both'
      ) {
        continue;
      }
      const nextIndex = i + 1;
      if (nextIndex >= state.elements.length) {
        continue;
      }
      const targetPosition = this.#referenceHeadPosition(state, nextIndex);
      if (targetPosition === null) {
        continue;
      }

      let referenceLetter: NoteLetter;
      let referenceOctave: Octave;
      if (element.nodeName === MUSIC_NOTE_NODE) {
        const noteElement = element as NoteElementType;
        referenceLetter = noteElement.note[0] as NoteLetter;
        referenceOctave = noteElement.octave ?? 4;
      } else {
        const chordElement = element as ChordElementType;
        if (chordElement.notes.length === 0) {
          continue;
        }
        referenceLetter = chordElement.notes[0].value[0] as NoteLetter;
        referenceOctave = chordElement.notes[0].octave ?? 4;
      }

      const descriptors = buildGraceNoteDescriptors(
        trillFinish,
        hostElement.trillFinishOctave ?? [],
        referenceLetter,
        referenceOctave
      );
      applyResolvedGraceAccidentals(
        descriptors,
        hostElement.resolvedTrillFinishAccidentals
      );
      const layout = computeGraceLayout(descriptors);
      const lastLocalIndex = descriptors.length - 1;
      const hostX = state.noteXPositions.get(i) ?? 0;
      const lastHeadX =
        hostX +
        NOTE_SVG_WIDTH +
        this.#augmentationDotFootprint(state, i) +
        GRACE_MAIN_GAP_PX +
        layout.headXCenters[lastLocalIndex];

      const lastPitch = trillFinish[lastLocalIndex];
      const lastOctave =
        (hostElement.trillFinishOctave ?? [])[lastLocalIndex] ??
        referenceOctave;
      const lastRawY = this.noteToYCoordinate(lastPitch, lastOctave, i);
      const lastHeadY =
        STAFF_Y_PADDING + lastRawY - NOTE_HEAD_Y_OFFSET_CORRECTION;

      const slur = createOrnamentConnectorSlur(
        lastHeadX,
        lastHeadY,
        TRILL_FINISH_HEAD_RY,
        targetPosition.xCenter,
        targetPosition.y,
        NOTE_HEAD_RADIUS_PX * 0.75
      );
      container.appendChild(slur);
    }
  }

  // Draws the small written trilling notehead — positioned after the anchor
  // note's own right edge (see rules/trillRules.ts's writtenNoteAnchorIndex
  // for why this can differ from the trill's own starting note), at the
  // resolved pitch's real staff Y.
  #drawWrittenTrillNote(
    state: VoiceRenderState,
    container: SVGSVGElement,
    startIndex: number,
    anchorIndex: number,
    resolvedTrillPitch: {
      letter: NoteLetter;
      accidental: AccidentalType | null;
      octave: Octave | null;
    }
  ): void {
    if (resolvedTrillPitch.octave === null) {
      return;
    }
    const anchorNoteX = state.noteXPositions.get(anchorIndex) ?? 0;
    const leftX =
      anchorNoteX +
      NOTE_SVG_WIDTH +
      this.#augmentationDotFootprint(state, anchorIndex) +
      TRILL_WRITTEN_NOTE_GAP_PX;
    const rawY = this.noteToYCoordinate(
      `${resolvedTrillPitch.letter}${accidentalSuffix(
        resolvedTrillPitch.accidental
      )}` as Note,
      resolvedTrillPitch.octave,
      startIndex
    );
    const centerY = STAFF_Y_PADDING + rawY - NOTE_HEAD_Y_OFFSET_CORRECTION;
    const { element } = createWrittenTrillNoteSvg({
      leftX,
      centerY,
      accidental: resolvedTrillPitch.accidental,
    });
    container.appendChild(element);
  }

  // Conservative above-staff budget, before x-positions exist: the max over
  // voice keys.
  #estimateAboveStaffBudget(): number {
    let budget = 0;
    for (const [voiceKey, state] of this.#voiceRenderStates) {
      budget = Math.max(
        budget,
        this.#estimateAboveStaffBudgetForVoice(voiceKey, state)
      );
    }
    return budget;
  }

  #estimateAboveStaffBudgetForVoice(
    voiceKey: VoiceKey,
    state: VoiceRenderState
  ): number {
    let budget = 0;

    const hasArpeggiandoText = state.elements.some(
      (element) =>
        (element.nodeName === MUSIC_NOTE_NODE ||
          element.nodeName === MUSIC_CHORD_NODE) &&
        (element as NoteElementType | ChordElementType).arpeggiate === 'start'
    );
    if (hasArpeggiandoText) {
      const textTopY =
        STAFF_TOP_LINE_Y -
        ARPEGGIO_TEXT_ABOVE_STAFF_PX -
        ARPEGGIO_TEXT_FONT_SIZE;
      if (textTopY < 0) {
        budget = Math.max(budget, Math.ceil(-textTopY) + 2);
      }
    }

    // The upper dynamic letter of an arpeggio-hairpin sits above the chord's
    // top notehead — reserve room when it would otherwise poke past the SVG.
    for (const element of state.elements) {
      if (
        element.nodeName !== MUSIC_NOTE_NODE &&
        element.nodeName !== MUSIC_CHORD_NODE
      ) {
        continue;
      }
      const el = element as NoteElementType | ChordElementType;
      // Only this element's own hairpin sits above its own staff; a cross-staff
      // partner's letters are drawn outside both staves by the measure overlay.
      if (footprintArpeggioHairpin(el, null) === null) {
        continue;
      }
      const effective =
        el.arpeggio ??
        el.impliedArpeggio ??
        (el.arpeggioFor !== null ? 'up' : null);
      const topMark =
        effective === 'down' ? el.arpeggioHairpinFrom : el.arpeggioHairpinTo;
      if (topMark === null) {
        continue;
      }
      const staffYs =
        element.nodeName === MUSIC_NOTE_NODE
          ? [state.noteStaffYCoords.get(el as NoteElementType) ?? 0]
          : state.chordStaffYCoords.get(el as ChordElementType) ?? [0];
      const topHeadY =
        STAFF_Y_PADDING + Math.min(...staffYs) - NOTE_HEAD_Y_OFFSET_CORRECTION;
      const textTopY =
        topHeadY -
        ARPEGGIO_HAIRPIN_VERTICAL_OVERSHOOT_PX -
        ARPEGGIO_HAIRPIN_DYNAMIC_GAP_PX -
        DYNAMICS_FONT_SIZE;
      if (textTopY < 0) {
        budget = Math.max(budget, Math.ceil(-textTopY) + 2);
      }
    }

    // A trill-accidental sits above the sign (written mode draws it beside
    // the notehead instead).
    const hasTrillAccidental = state.elements.some((element) => {
      if (
        element.nodeName !== MUSIC_NOTE_NODE &&
        element.nodeName !== MUSIC_CHORD_NODE
      ) {
        return false;
      }
      const pitch = (element as NoteElementType | ChordElementType)
        .resolvedTrillPitch;
      return (
        pitch !== null && pitch.written === false && pitch.accidental !== null
      );
    });
    if (hasTrillAccidental) {
      const tallestAccidentalHeight =
        Math.max(...Object.values(ACCIDENTAL_SYMBOL_HEIGHT)) *
        TRILL_ACCIDENTAL_SCALE;
      const topY =
        TRILL_ABOVE_STAFF_BOTTOM_Y -
        TRILL_SIGN_HEIGHT_PX -
        TRILL_ACCIDENTAL_GAP_PX -
        tallestAccidentalHeight;
      if (topY < 0) {
        budget = Math.max(budget, Math.ceil(-topY) + 2);
      }
    }

    // A trill can be lifted past another voice's up-stem content
    // (#trillLineLiftClearingOtherVoices). With no x-positions yet, reserve
    // for every other voice's whole up-stem reach.
    const hasTrillSpan = resolveTrillSpans(state.elements).length > 0;
    if (hasTrillSpan) {
      for (const [otherKey, otherState] of this.#voiceRenderStates) {
        if (otherKey === voiceKey) {
          continue;
        }
        const upStemIndices = otherState.elements
          .map((_, i) => i)
          .filter((i) => otherState.stemDirections[i]);
        const extreme = this.#extremeStemTipY(otherState, upStemIndices, true);
        if (extreme === null) {
          continue;
        }
        const topY = extreme - TRILL_ABOVE_STAFF_GAP_PX - TRILL_SIGN_HEIGHT_PX;
        if (topY < 0) {
          budget = Math.max(budget, Math.ceil(-topY) + 2);
        }
      }
    }

    const tremoloLabelTop = this.#tremoloLabelTopY(voiceKey, state);
    if (tremoloLabelTop !== null && tremoloLabelTop < 0) {
      budget = Math.max(budget, Math.ceil(-tremoloLabelTop) + 2);
    }

    budget = Math.max(budget, this.#tupletVerticalOverflow(state, true));
    budget = Math.max(
      budget,
      this.#octaveSignVerticalOverflow(voiceKey, state, true)
    );

    // An up-stem voice's dynamics row sits above the staff, near the top
    // edge, so the glyph's ascent (DYNAMICS_FONT_SIZE) counts too.
    if (this.#dynamicsSidesInUse(voiceKey, state).has('above')) {
      const topY =
        this.#dynamicsBaselineForSide(voiceKey, state, 'above') -
        DYNAMICS_FONT_SIZE;
      if (topY < 0) {
        budget = Math.max(budget, Math.ceil(-topY) + 2);
      }
    }

    return budget;
  }

  // From attributes, since x-positions aren't known yet. Hairpins and
  // markings the measure moved count toward their forced side, or none when
  // the measure draws them.
  #dynamicsSidesInUse(
    voiceKey: VoiceKey,
    state: VoiceRenderState
  ): Set<DynamicsSide> {
    const defaultSide = this.#defaultDynamicsSide(voiceKey, state);
    const sides = new Set<DynamicsSide>();
    const add = (placement: DynamicsPlacement) => {
      if (placement !== 'measure') {
        sides.add(placement);
      }
    };
    for (const element of state.elements) {
      if (element.nodeName === MUSIC_REST_NODE) {
        continue;
      }
      const noteOrChord = element as INoteElement | IChordElement;
      const override = this.#crossStaffDynamicsOverrides?.get(
        element as NoteOrChordElementType
      );
      if (noteOrChord.dynamic !== null && !noteOrChord.dynamicShared) {
        add(override?.marking ?? defaultSide);
      }
      if (noteOrChord.graceDynamic !== null) {
        sides.add(defaultSide);
      }
      const startsHairpin =
        noteOrChord.crescendo === 'start' ||
        noteOrChord.decrescendo === 'start';
      const endsHairpin =
        noteOrChord.crescendo === 'end' || noteOrChord.decrescendo === 'end';
      if (startsHairpin) {
        add(override?.hairpin ?? defaultSide);
      } else if (endsHairpin && override === undefined) {
        sides.add(defaultSide);
      }
    }
    return sides;
  }

  // Below-staff mirror of #estimateAboveStaffBudget. An arpeggio-hairpin's
  // lower letter isn't counted.
  #estimateBelowStaffBudget(): number {
    let budget = 0;
    for (const [voiceKey, state] of this.#voiceRenderStates) {
      budget = Math.max(budget, this.#tupletVerticalOverflow(state, false));
      budget = Math.max(
        budget,
        this.#octaveSignVerticalOverflow(voiceKey, state, false)
      );

      if (this.#dynamicsSidesInUse(voiceKey, state).has('below')) {
        const overflow =
          this.#dynamicsBaselineForSide(voiceKey, state, 'below') -
          STAFF_TRANSCRIPTION_HEIGHT;
        if (overflow > 0) {
          budget = Math.max(budget, Math.ceil(overflow) + 2);
        }
      }
    }
    return budget;
  }

  // How far a `stemUp`-side tuplet numeral overflows the staff's fixed edge.
  #tupletVerticalOverflow(state: VoiceRenderState, stemUp: boolean): number {
    const worstY = this.#tupletExtremeY(state, stemUp);
    if (worstY === null) {
      return 0;
    }
    return stemUp
      ? worstY < 0
        ? Math.ceil(-worstY) + 2
        : 0
      : worstY > STAFF_TRANSCRIPTION_HEIGHT
      ? Math.ceil(worstY - STAFF_TRANSCRIPTION_HEIGHT) + 2
      : 0;
  }

  // The extreme Y a `stemUp`-side tuplet numeral reaches, or null. Shared by
  // the budget and octave-sign placement so both match the drawn bracket.
  // `skipSharedBeamNumerals` leaves out a numeral hanging off a
  // double-stemmed beam across the gap.
  #tupletExtremeY(
    state: VoiceRenderState,
    stemUp: boolean,
    skipSharedBeamNumerals = false
  ): number | null {
    let extreme: number | null = null;

    for (const group of state.tupletGroups) {
      if (
        this.#isTupletSuppressed(group) ||
        this.#tupletBracketAbove(state, group) !== stemUp
      ) {
        continue;
      }
      if (
        skipSharedBeamNumerals &&
        group.indices.every(
          (i) =>
            state.elements[i].nodeName === MUSIC_REST_NODE ||
            state.externallyBeamedIndices.has(i)
        )
      ) {
        continue;
      }

      const worstY = this.#tupletGroupExtremeY(state, group, stemUp);

      extreme =
        extreme === null
          ? worstY
          : stemUp
          ? Math.min(extreme, worstY)
          : Math.max(extreme, worstY);
    }

    return extreme;
  }

  // The Y one tuplet group's numeral or bracket reaches on the `stemUp`
  // side: its fixed staff clearance or its stems' and beams' reach,
  // whichever is further out.
  #tupletGroupExtremeY(
    state: VoiceRenderState,
    group: TupletGroup,
    stemUp: boolean
  ): number {
    const nominalY = stemUp
      ? STAFF_TOP_LINE_Y -
        STAFF_Y_PADDING -
        TUPLET_STAFF_CLEARANCE_PX -
        TUPLET_HOOK_LENGTH_PX -
        TUPLET_NUMERAL_FONT_SIZE
      : STAFF_BOTTOM_LINE_Y +
        STAFF_Y_PADDING +
        TUPLET_STAFF_CLEARANCE_PX +
        TUPLET_HOOK_LENGTH_PX +
        TUPLET_NUMERAL_FONT_SIZE;

    const extremeStemTipY =
      this.#tupletSideOverride(group) === null
        ? this.#extremeStemTipY(state, group.indices, stemUp)
        : this.#forcedSideTupletExtremeY(state, group, stemUp);

    // Mirrors tupletRules.ts#computeTupletBracketGeometry: a fully beamed
    // group hangs its numeral off the beam; any other draws a bracket past
    // the stem tips with the numeral centred on it.
    const bracketOmitted =
      this.#tupletSideOverride(group) === null &&
      group.indices.every(
        (i) =>
          state.beamedIndices.has(i) &&
          state.elements[i].nodeName !== MUSIC_REST_NODE
      );
    const numeralOffset = bracketOmitted
      ? TUPLET_NUMERAL_FONT_SIZE / 2 +
        TUPLET_NUMERAL_BEAM_GAP_PX +
        BEAM_THICKNESS_PX
      : TUPLET_STAFF_CLEARANCE_PX +
        TUPLET_HOOK_LENGTH_PX +
        TUPLET_NUMERAL_FONT_SIZE / 2;
    const beamDerivedY =
      extremeStemTipY !== null
        ? stemUp
          ? extremeStemTipY - numeralOffset
          : extremeStemTipY + numeralOffset
        : nominalY;

    return stemUp
      ? Math.min(nominalY, beamDerivedY)
      : Math.max(nominalY, beamDerivedY);
  }

  // How far sopra (`above`) or bassa octave rows overflow the staff's fixed
  // edge, from #octaveSignRowY so it matches what is drawn.
  #octaveSignVerticalOverflow(
    voiceKey: VoiceKey,
    state: VoiceRenderState,
    above: boolean
  ): number {
    let overflow = 0;
    const { spans } = resolveOctaveSpans(state.elements);
    const rows = [
      ...this.#octaveRunLayouts(spans, voiceKey, state).map(({ run, y }) => ({
        raisesPitch: isOctaveRaise(run.amount),
        rowY: y,
      })),
      // A line only passing over this voice is drawn by the composition.
      ...[...(this.#octaveContinuations ?? [])]
        .filter(
          ([element, row]) =>
            !row.starts &&
            state.elements.includes(element as NoteChordOrRestElementType)
        )
        .map(([, row]) => row),
    ];
    for (const { raisesPitch, rowY } of rows) {
      if (raisesPitch !== above) {
        continue;
      }
      if (raisesPitch && rowY < 0) {
        overflow = Math.max(overflow, Math.ceil(-rowY) + 2);
      } else if (!raisesPitch && rowY > STAFF_TRANSCRIPTION_HEIGHT) {
        overflow = Math.max(
          overflow,
          Math.ceil(rowY - STAFF_TRANSCRIPTION_HEIGHT) + 2
        );
      }
    }
    return overflow;
  }

  // The topmost Y this voice's other above-staff decorations reach, or null;
  // an octave sign sits outside it.
  #otherAboveStaffDecorationTopY(
    voiceKey: VoiceKey,
    state: VoiceRenderState
  ): number | null {
    let top: number | null = null;
    const consider = (y: number): void => {
      top = top === null ? y : Math.min(top, y);
    };

    const hasArpeggiandoText = state.elements.some(
      (element) =>
        (element.nodeName === MUSIC_NOTE_NODE ||
          element.nodeName === MUSIC_CHORD_NODE) &&
        (element as NoteElementType | ChordElementType).arpeggiate === 'start'
    );
    if (hasArpeggiandoText) {
      consider(
        STAFF_TOP_LINE_Y -
          ARPEGGIO_TEXT_ABOVE_STAFF_PX -
          ARPEGGIO_TEXT_FONT_SIZE
      );
    }

    for (const element of state.elements) {
      if (
        element.nodeName !== MUSIC_NOTE_NODE &&
        element.nodeName !== MUSIC_CHORD_NODE
      ) {
        continue;
      }
      const el = element as NoteElementType | ChordElementType;
      if (footprintArpeggioHairpin(el, null) === null) {
        continue;
      }
      const effective =
        el.arpeggio ??
        el.impliedArpeggio ??
        (el.arpeggioFor !== null ? 'up' : null);
      const topMark =
        effective === 'down' ? el.arpeggioHairpinFrom : el.arpeggioHairpinTo;
      if (topMark === null) {
        continue;
      }
      const staffYs =
        element.nodeName === MUSIC_NOTE_NODE
          ? [state.noteStaffYCoords.get(el as NoteElementType) ?? 0]
          : state.chordStaffYCoords.get(el as ChordElementType) ?? [0];
      const topHeadY =
        STAFF_Y_PADDING + Math.min(...staffYs) - NOTE_HEAD_Y_OFFSET_CORRECTION;
      consider(
        topHeadY -
          ARPEGGIO_HAIRPIN_VERTICAL_OVERSHOOT_PX -
          ARPEGGIO_HAIRPIN_DYNAMIC_GAP_PX -
          DYNAMICS_FONT_SIZE
      );
    }

    const hasTrillAccidental = state.elements.some((element) => {
      if (
        element.nodeName !== MUSIC_NOTE_NODE &&
        element.nodeName !== MUSIC_CHORD_NODE
      ) {
        return false;
      }
      const pitch = (element as NoteElementType | ChordElementType)
        .resolvedTrillPitch;
      return (
        pitch !== null && pitch.written === false && pitch.accidental !== null
      );
    });
    if (hasTrillAccidental) {
      const tallestAccidentalHeight =
        Math.max(...Object.values(ACCIDENTAL_SYMBOL_HEIGHT)) *
        TRILL_ACCIDENTAL_SCALE;
      consider(
        TRILL_ABOVE_STAFF_BOTTOM_Y -
          TRILL_SIGN_HEIGHT_PX -
          TRILL_ACCIDENTAL_GAP_PX -
          tallestAccidentalHeight
      );
    }

    const hasTrillSpan = resolveTrillSpans(state.elements).length > 0;
    if (hasTrillSpan) {
      for (const [otherKey, otherState] of this.#voiceRenderStates) {
        if (otherKey === voiceKey) {
          continue;
        }
        const upStemIndices = otherState.elements
          .map((_, i) => i)
          .filter((i) => otherState.stemDirections[i]);
        const extreme = this.#extremeStemTipY(otherState, upStemIndices, true);
        if (extreme === null) {
          continue;
        }
        consider(extreme - TRILL_ABOVE_STAFF_GAP_PX - TRILL_SIGN_HEIGHT_PX);
      }
    }

    const tupletTop = this.#tupletExtremeY(state, true, true);
    if (tupletTop !== null) {
      consider(tupletTop);
    }

    for (const [labelKey, labelState] of this.#voiceRenderStates) {
      const labelTop = this.#tremoloLabelTopY(labelKey, labelState);
      if (labelTop !== null) {
        consider(labelTop);
      }
    }

    if (this.#dynamicsSidesInUse(voiceKey, state).has('above')) {
      consider(
        this.#dynamicsBaselineForSide(voiceKey, state, 'above') -
          DYNAMICS_FONT_SIZE
      );
    }

    return top;
  }

  // Below-staff mirror of #otherAboveStaffDecorationTopY (tuplets and
  // dynamics only, like #estimateBelowStaffBudget).
  #otherBelowStaffDecorationBottomY(
    voiceKey: VoiceKey,
    state: VoiceRenderState
  ): number | null {
    let bottom: number | null = null;

    const tupletBottom = this.#tupletExtremeY(state, false, true);
    if (tupletBottom !== null) {
      bottom = tupletBottom;
    }

    if (this.#dynamicsSidesInUse(voiceKey, state).has('below')) {
      const dynamicsBottom = this.#dynamicsBaselineForSide(
        voiceKey,
        state,
        'below'
      );
      bottom =
        bottom === null ? dynamicsBottom : Math.max(bottom, dynamicsBottom);
    }

    return bottom;
  }

  // Which side a tuplet group's bracket is forced to, if any — read by both
  // the render pass and #tupletExtremeY so the reserved space and the drawn
  // bracket agree. A cross-staff role outranks the wrapper's own `placement`,
  // since the measure already folded both wrappers' placement into it.
  #tupletSideOverride(group: TupletGroup): TupletPlacement | null {
    const role = this.#crossStaffTupletRoles?.get(group.element);
    if (role !== undefined) {
      return role.rendering === 'suppressed' ? null : role.rendering;
    }
    return group.element.placement;
  }

  #isTupletSuppressed(group: TupletGroup): boolean {
    return (
      this.#crossStaffTupletRoles?.get(group.element)?.rendering ===
      'suppressed'
    );
  }

  #tupletBracketAbove(state: VoiceRenderState, group: TupletGroup): boolean {
    return resolveTupletBracketAbove(
      group.indices,
      state.stemDirections,
      this.#tupletSideOverride(group)
    );
  }

  // Mirrors computeTupletBracketGeometry's forced-side clamp: a note whose
  // stem points toward the bracket contributes its stem tip, any other its
  // notehead edge.
  #forcedSideTupletExtremeY(
    state: VoiceRenderState,
    group: TupletGroup,
    above: boolean
  ): number | null {
    let extreme: number | null = null;
    for (const i of group.indices) {
      const y =
        state.stemDirections[i] === above
          ? naturalStemTipY(
              i,
              state.elements,
              state.stemDirections,
              state.noteStaffYCoords,
              state.chordStaffYCoords,
              state.unbeamedStemTipExtensionsPx[i] +
                state.tremoloInkPastStemPx[i]
            )
          : noteheadEdgeY(
              i,
              state.elements,
              state.noteStaffYCoords,
              state.chordStaffYCoords,
              above
            );
      if (y === null) {
        continue;
      }
      extreme =
        extreme === null
          ? y
          : above
          ? Math.min(extreme, y)
          : Math.max(extreme, y);
    }
    return extreme;
  }

  #extremeStemTipY(
    state: VoiceRenderState,
    indices: Iterable<number>,
    stemUp: boolean
  ): number | null {
    let extreme = stemUp ? Infinity : -Infinity;
    let anyResolved = false;
    for (const i of indices) {
      if (state.elements[i].nodeName === MUSIC_REST_NODE) {
        continue;
      }
      const staffY = getStaffYForIndex(
        i,
        state.elements,
        state.stemDirections,
        state.noteStaffYCoords,
        state.chordStaffYCoords
      );
      if (staffY === null) {
        continue;
      }
      const tipY = stemTipYFromStaffY(
        staffY,
        stemUp,
        state.stemDirections[i] === stemUp
          ? state.unbeamedStemTipExtensionsPx[i] + state.tremoloInkPastStemPx[i]
          : 0
      );
      extreme = stemUp ? Math.min(extreme, tipY) : Math.max(extreme, tipY);
      anyResolved = true;
    }
    return anyResolved ? extreme : null;
  }

  // With several voices, each voice's dynamics sit on its stem side. A single
  // voice and the synthetic tracks stay below.
  #dynamicsPlacedAbove(voiceKey: VoiceKey, state: VoiceRenderState): boolean {
    return typeof voiceKey === 'number' && state.direction === 'up';
  }
  #dynamicsLocalToClientY(voiceKey: VoiceKey, y: number): number {
    const matrix = this.#dynamicsContainers.get(voiceKey)?.getScreenCTM?.();
    if (matrix) {
      return matrix.d * y + matrix.f;
    }
    return this.transcribeContainer.getBoundingClientRect().top + y;
  }

  #defaultDynamicsSide(
    voiceKey: VoiceKey,
    state: VoiceRenderState
  ): DynamicsSide {
    return this.#dynamicsPlacedAbove(voiceKey, state) ? 'above' : 'below';
  }

  #markingPlacement(
    element: NoteOrChordElementType,
    defaultSide: DynamicsSide
  ): DynamicsPlacement {
    return (
      this.#crossStaffDynamicsOverrides?.get(element)?.marking ?? defaultSide
    );
  }

  #hairpinPlacement(
    pair: HairpinPair,
    defaultSide: DynamicsSide
  ): DynamicsPlacement {
    return (
      this.#crossStaffDynamicsOverrides?.get(pair.startElement)?.hairpin ??
      defaultSide
    );
  }

  // An end whose start sits on the other staff, or in another measure, is
  // expected whenever an ancestor can see both — only a staff on its own
  // (or alone in its measure) treats it as an authoring mistake.
  #pairVoiceHairpins(state: VoiceRenderState) {
    const measure = this.closest(MUSIC_MEASURE);
    const hasSiblingStaff =
      measure !== null &&
      Array.from<Element>(measure.children).filter((child) =>
        isStaffNodeName(child.nodeName)
      ).length > 1;
    const warnOrphans =
      this.closest(MUSIC_COMPOSITION) === null && !hasSiblingStaff;
    return pairHairpinsWithLeftovers(state.elements, state.noteXPositions, {
      warnOrphans,
    });
  }

  // A row the measure forced to the side opposite this voice's own clears
  // the notes' real stems: those stems point away from it, so the
  // conservative every-stem-toward-this-side clamp would float it far
  // from the notes.
  #dynamicsBaselineForSide(
    voiceKey: VoiceKey,
    state: VoiceRenderState,
    side: DynamicsSide
  ): number {
    return this.#dynamicsBaselineFor(
      state,
      side === 'above',
      side !== this.#defaultDynamicsSide(voiceKey, state)
    );
  }

  // The outermost real extent of the voice toward one side: a stem tip where
  // the stem points that way, otherwise the notehead's own edge.
  #extremeRealExtentY(
    state: VoiceRenderState,
    placeAbove: boolean
  ): number | null {
    let extreme: number | null = null;
    const consider = (y: number) => {
      extreme =
        extreme === null
          ? y
          : placeAbove
          ? Math.min(extreme, y)
          : Math.max(extreme, y);
    };
    state.elements.forEach((element, index) => {
      if (element.nodeName === MUSIC_REST_NODE) {
        return;
      }
      if (state.stemDirections[index] === placeAbove) {
        const tip = this.#extremeStemTipY(state, [index], placeAbove);
        if (tip !== null) {
          consider(tip);
        }
        return;
      }
      const headYs =
        element.nodeName === MUSIC_NOTE_NODE
          ? [state.noteStaffYCoords.get(element as NoteElementType)]
          : state.chordStaffYCoords.get(element as ChordElementType) ?? [];
      for (const headY of headYs) {
        if (headY === undefined) {
          continue;
        }
        const centerY = STAFF_Y_PADDING + headY - NOTE_HEAD_Y_OFFSET_CORRECTION;
        consider(centerY + ((placeAbove ? -1 : 1) * STAFF_LINE_SPACING) / 2);
      }
    });
    return extreme;
  }

  // The voice's dynamics baseline, clamped past its worst stem tip on that
  // side as if every stem pointed there. One row per voice, so several
  // dynamics line up.
  #dynamicsBaselineFor(
    state: VoiceRenderState,
    placeAbove: boolean,
    realStems = false
  ): number {
    const extremeStemTipY = realStems
      ? this.#extremeRealExtentY(state, placeAbove)
      : this.#extremeStemTipY(state, state.elements.keys(), placeAbove);

    // The value is a text baseline, so add the glyph's reach
    // (≈DYNAMICS_FONT_SIZE) toward the stem.
    if (placeAbove) {
      if (extremeStemTipY === null) {
        return DYNAMICS_ABOVE_BASELINE_Y;
      }
      return Math.min(
        DYNAMICS_ABOVE_BASELINE_Y,
        extremeStemTipY - DYNAMICS_FONT_SIZE - STAFF_LINE_SPACING
      );
    }

    if (extremeStemTipY === null) {
      return DYNAMICS_BASELINE_Y;
    }
    return Math.max(
      DYNAMICS_BASELINE_Y,
      extremeStemTipY + DYNAMICS_FONT_SIZE + STAFF_LINE_SPACING
    );
  }

  // Runs with no notes too: the describe area and viewBox must still track
  // the width.
  onStaffResize() {
    this.#spaceElements();
    this.dispatchEvent(
      new CustomEvent(STAFF_EVENTS.NOTES_POSITIONED, {
        bubbles: true,
        composed: true,
      })
    );
    this.drawConnectorsWhenStandalone();
  }
}
