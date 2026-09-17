import {
  computeInterNoteSpacing,
  computeNoteAccidentals,
  totalChordAccidentalWidth,
} from './rules/accidentalRules';
import {
  computeArpeggioFootprintWidth,
  computeArpeggioHairpinFootprintWidth,
} from './rules/arpeggioRules';
import { buildBeamsRenderer } from './rules/beamRules';
import { computeBeatOffsets } from './rules/beatRules';
import { computeAdjacentDisplacements } from './rules/chordRules';
import { getClefRenderData } from './rules/clefRules';
import { pairHairpins } from './rules/dynamicsRules';
import {
  applyResolvedGraceAccidentals,
  buildGraceNoteDescriptors,
  computeFirstGraceHeadX,
  computeGraceFootprintWidth,
  computeGraceLayout,
} from './rules/graceRules';
import { computeAllowedElementCount } from './rules/measureRules';
import { restToYCoordinate, VoiceRestContext } from './rules/restRules';
import {
  computeMeasureProportionalOffsets,
  computeSpacingWeights,
} from './rules/spacingRules';
import { determineVoiceStemDirections } from './rules/staffNoteRules';
import { durationToFlagCountMap } from './rules/theoryConsts';
import {
  calculateStaffMinWidth,
  calculateStaffNaturalWidth,
} from './rules/staffWidth';
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
  computeTupletScaledNoteCount,
  TupletBracketGeometry,
  TupletGroup,
} from './rules/tupletRules';
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
  resolveVoiceDirections,
  VoiceDirection,
  VoiceNoteheadPlacement,
} from './rules/voiceRules';
import { StaffElementBase } from './staffBase';
import type {
  ArpeggioGroupPlacement,
  ChordElementType,
  ChordNote,
  ClefMarkerPlacement,
  IChordElement,
  INoteElement,
  NoteChordOrRestElementType,
  NoteElementType,
  NoteLetterOctave,
  RestElementType,
  TupletElementType,
  YCoordinates,
} from './types/elements';
import type {
  AccidentalType,
  ArpeggioType,
  ClefType,
  DurationType,
  DynamicMarking,
  HairpinKind,
  Mode,
  Note,
  NoteLetter,
  Octave,
  VoiceNumber,
} from './types/theory';
import {
  BeamsBuilder,
  computeYHeadOffset,
  createDynamicMarkingSvg,
  createFlatSvg,
  createHairpinSvg,
  createOrnamentConnectorSlur,
  createSempreArpeggiandoText,
  createSharpSvg,
  createTimeSignatureSvg,
  NOTE_HEAD_RADIUS_PX,
  NOTE_HEAD_Y_OFFSET_CORRECTION,
  TRILL_FINISH_HEAD_RY,
} from './utils';
import {
  CLEF_EVENTS,
  COMMON_ATTRIBUTES,
  isStaffNodeName,
  MUSIC_ARPEGGIO_NODE,
  MUSIC_CHORD,
  MUSIC_CHORD_NODE,
  MUSIC_CLEF_NODE,
  MUSIC_COMPOSITION,
  MUSIC_MEASURE,
  MUSIC_NOTE,
  MUSIC_NOTE_NODE,
  MUSIC_REST,
  MUSIC_REST_NODE,
  MUSIC_TUPLET_NODE,
  MUSIC_VOICE_NODE,
  NOTE_EVENTS,
  STAFF_EVENTS,
  STAFF_TAGS,
  SVG_NS,
} from './utils/consts';
import {
  ACCIDENTAL_SYMBOL_HEIGHT,
  ARPEGGIO_HAIRPIN_DYNAMIC_GAP_PX,
  ARPEGGIO_HAIRPIN_VERTICAL_OVERSHOOT_PX,
  ARPEGGIO_TEXT_ABOVE_STAFF_PX,
  ARPEGGIO_TEXT_FONT_SIZE,
  CLEF_CHANGE_RESERVED_WIDTH_PX,
  CLEF_X_OFFSET,
  DYNAMICS_BASELINE_Y,
  DYNAMICS_FONT_SIZE,
  GRACE_MAIN_GAP_PX,
  HAIRPIN_OPEN_HEIGHT,
  KEY_SIG_FLAT_WIDTH,
  KEY_SIG_FLAT_Y_OFFSET,
  KEY_SIG_SHARP_WIDTH,
  LEADING_NOTE_GAP_PX,
  MID_STREAM_CLEF_Y_OFFSET,
  MIN_NOTE_WIDTH,
  NOTES_AREA_LEFT_MARGIN,
  STAFF_TOP_LINE_Y,
  STAFF_TRANSCRIPTION_HEIGHT,
  STAFF_Y_PADDING,
  TIME_SIG_Y_TRANSLATE,
  TRILL_ABOVE_STAFF_GAP_PX,
  TRILL_ACCIDENTAL_GAP_PX,
  TRILL_ACCIDENTAL_SCALE,
  TRILL_LINE_END_GAP_PX,
  TRILL_SIGN_HEIGHT_PX,
  TRILL_SIGN_LINE_GAP_PX,
  TRILL_WRITTEN_NOTE_GAP_PX,
  TUPLET_HOOK_LENGTH_PX,
  TUPLET_NUMERAL_FONT_SIZE,
  TUPLET_STAFF_CLEARANCE_PX,
} from './utils/notationDimensions';
import {
  flattenStaffSlotElements,
  VoiceFlattenResult,
} from './utils/slotElements';
import {
  ACCIDENTAL_NOTE_GAP,
  ACCIDENTAL_SYMBOL_WIDTH,
  NOTE_SVG_WIDTH,
  trillSignLeftX,
} from './utils/svgCreator/note';
import {
  computeWrittenTrillNoteWidth,
  createTrillLineSvg,
  createTrillNotchSvg,
  createWrittenTrillNoteSvg,
  TRILL_SIGN_WIDTH_PX,
} from './utils/svgCreator/trill';
import { createTupletBracketSvg } from './utils/svgCreator/tuplet';

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

// The arpeggio sign a note/chord actually draws — its own `arpeggio` if set,
// otherwise a `sempre arpeggiando` passage's implied one.
function effectiveArpeggio(element: NoteElementType | ChordElementType) {
  return element.arpeggio ?? element.impliedArpeggio;
}

// The arpeggio variant that determines this element's reserved leftward
// footprint: its own sign, an implied `sempre arpeggiando` sign, or — for the
// lower end of a cross-staff span carrying only `arpeggio-for` — the wave the
// ancestor measure draws for the span. Every wave variant reserves the same
// width, so the exact value past non-null does not matter here.
function footprintArpeggio(element: NoteElementType | ChordElementType) {
  return (
    effectiveArpeggio(element) ?? (element.arpeggioFor !== null ? 'up' : null)
  );
}

const isArpeggioWave = (arpeggio: ArpeggioType | null): boolean =>
  arpeggio === 'up' || arpeggio === 'up-arrow' || arpeggio === 'down';

// A trill sign's/line's bottom edge sits at a fixed height above the staff
// top line, independent of pitch (see svgCreator/note.ts's own
// trillSignBottomY, which pre-cancels the note's own external Y-positioning
// to land here too) — shared by every trill decoration this staff draws in
// its own overlay.
const TRILL_ABOVE_STAFF_BOTTOM_Y =
  STAFF_Y_PADDING +
  STAFF_TOP_LINE_Y -
  NOTE_HEAD_Y_OFFSET_CORRECTION -
  TRILL_ABOVE_STAFF_GAP_PX;

// The note/chord paired with this one in an unbroken cross-staff arpeggio: the
// `id` target of this element's `arpeggio-for`, or — when this element has an
// `id` — an element pointing back at it via `arpeggio-for`. Only a partner in a
// *different* `<music-staff>` of the same `<music-measure>` counts: the measure
// overlay, not this staff, then draws the span's wave + hairpin, off raw
// notehead pixels. Partner attributes are readable synchronously here (sibling
// staves and their entries connect before either staff spaces), so the initial
// render needs no cross-staff propagation.
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
// rest (rules/voiceRestRules.ts). Internal to this file — never exported.
type VoiceKey = VoiceNumber | 'combined' | 'shared-rest';

// Bundles every per-pass snapshot a single voice's own render pass produces
// — the generalization of what used to be a dozen separate singular fields
// (#currentElements, #noteXPositions, #stemDirections, #beamRenderer, …),
// each populated once per #renderNotes()/#spaceElements() call from voice
// 1's array alone. One of these exists per active VoiceKey.
type VoiceRenderState = {
  elements: NoteChordOrRestElementType[];
  beatOffsets: number[];
  tupletsByIndex: Map<number, TupletElementType[]>;
  arpeggioGroups: ArpeggioGroupPlacement[];
  tupletGroups: TupletGroup[];
  beamsBuilder: BeamsBuilder | null;
  beamRenderer: ReturnType<BeamsBuilder['buildRenderer']> | null;
  stemDirections: boolean[];
  beamedIndices: Set<number>;
  noteStaffYCoords: Map<NoteElementType, number>;
  chordStaffYCoords: Map<ChordElementType, number[]>;
  noteXPositions: Map<number, number>;
  firstGraceHeadXPositions: Map<number, number>;
  writtenTrillFootprints: Map<number, number>;
  trillFinishFootprints: Map<number, number>;
  // Unused (kept 'up') for the 'combined'/'shared-rest' synthetic tracks —
  // the combined track is pitch-driven (see rules/voiceCombineRules.ts) and
  // the shared rest is direction-agnostic by definition.
  direction: VoiceDirection;
  // Set only for a real, multi-voice-policy-driven voice (undefined for the
  // single-voice case and for the 'combined'/'shared-rest' tracks) — read
  // by #spaceElements() when positioning this voice's own rests.
  restContext: VoiceRestContext | undefined;
};

// How far `oldIndex` shifts down once every index in `removedIndices` has
// been spliced out of the array — used to re-anchor a voice's own
// tupletsByIndex/arpeggioGroups after the v1-scoped auto-combine pass
// splices matched (never-tupleted, never-arpeggio-member, by combine
// eligibility) entries out of that voice's array.
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
    // A combine-eligible entry is never a tuplet member (see
    // rules/voiceCombineRules.ts), so a tupleted index is never itself
    // removed — this is a defensive skip, not an expected path.
    if (removedIndices.has(oldIndex)) {
      continue;
    }
    result.set(remapIndexAfterRemoval(oldIndex, removedIndices), tuplets);
  }
  return result;
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
    ];
  }

  #mutationObservers: MutationObserver[];
  #effectiveMode: Mode;
  #effectiveKeySig: Note;
  #describeContainer: SVGGElement;
  #describeEndX = 0;
  #currentSpacingSlackWeight = 0;
  #showDescribe = true;
  #clefChangeAtBoundary = false;
  #timeChangeAtBoundary = false;
  #clefMarkers: ClefMarkerPlacement[] = [];
  // Voice-partitioned flattening result (always >=1 entry — see
  // flattenStaffSlotElements()).
  #voices: Map<VoiceNumber, VoiceFlattenResult> = new Map();
  // One VoiceRenderState per active voice key (every real voice present,
  // plus 'combined'/'shared-rest' when either v1-scoped optimization fires
  // for the current measure) — see the type's own doc comment above.
  #voiceRenderStates: Map<VoiceKey, VoiceRenderState> = new Map();
  // Previous pass's elements per voice key, for #resolveArpeggiandoPassages'
  // dropped-element cleanup — one array per voice instead of one shared
  // array, so a dropped element's impliedArpeggio is cleared regardless of
  // which voice it came from.
  #previousElementsByVoice: Map<VoiceKey, NoteChordOrRestElementType[]> =
    new Map();
  // One instance per active voice key, created lazily on first use (see
  // #containerFor), hidden (not removed) when a voice key becomes inactive
  // — avoids DOM churn on a transient edit that temporarily reduces the
  // voice count.
  #beamsContainers: Map<VoiceKey, SVGSVGElement> = new Map();
  #tupletContainers: Map<VoiceKey, SVGSVGElement> = new Map();
  #dynamicsContainers: Map<VoiceKey, SVGSVGElement> = new Map();
  #trillLinesContainers: Map<VoiceKey, SVGSVGElement> = new Map();
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
    // A trill span's own endpoint (rules/trillRules.ts's tie-chain walk) and a
    // written trilling notehead's reserved footprint both depend on `tie`,
    // but a `tie` change only ever dispatches CONNECTOR_ATTRIBUTE_CHANGE —
    // when any current element is trill-marked, a plain connector redraw
    // isn't enough, so fall through to the same full re-layout pass a trill
    // attribute change itself now takes (see #boundNoteYChange).
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
  #boundNoteYChange = () => {
    if (this.#voices.size > 0) {
      this.#renderNotes();
    }
  };
  #boundClefMarkerChange = () => {
    if (this.#voices.size > 0) {
      this.#renderNotes();
    }
  };

  protected get describeEndX(): number {
    return this.#describeEndX;
  }

  /**
   * The staff's voice-partitioned flattening result (always >=1 entry — see
   * flattenStaffSlotElements()).
   */
  protected get voices(): ReadonlyMap<VoiceNumber, VoiceFlattenResult> {
    return this.#voices;
  }

  // Every active voice key's own elements, concatenated in ascending key
  // order — for the handful of call sites that only ever needed "is there
  // any content at all" or "does any element anywhere satisfy X" (as
  // opposed to the per-voice-keyed reads everywhere else in this file).
  get #allElements(): NoteChordOrRestElementType[] {
    return [...this.#voiceRenderStates.values()].flatMap((s) => s.elements);
  }

  // Lazily creates (and appends into transcribeContainer) the container of
  // `kind` for `voiceKey` if it doesn't exist yet; returns the existing one
  // otherwise. This is what makes "one container per voice, always" cheap
  // for the overwhelmingly common single-voice case (exactly one container
  // of each kind, same as before this feature existed) while still scaling
  // to 2-3 voices without any one container's clear-and-rebuild step
  // clobbering another voice's already-drawn decorations.
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

  // Clears every existing container (ready for this pass's fresh content)
  // and shows/hides it based on `activeKeys` — hidden, not removed (see the
  // container-map field comments), so a voice that disappears on a later
  // edit doesn't leave stale decorations visible without any DOM churn. A
  // brand-new key's container doesn't exist yet here — #containerFor
  // creates it fresh (and therefore already empty) on first use.
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
   * Σ of the current entries' logarithmic spacing slack weights, set on every
   * #spaceElements() pass. StaffVocalElement reads it to compute its natural
   * width after re-scoring against lyric widths.
   */
  protected get currentSpacingSlackWeight(): number {
    return this.#currentSpacingSlackWeight;
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

  constructor() {
    super();
    this.#mutationObservers = [];

    this.#effectiveMode = this.resolveInheritedValue(
      COMMON_ATTRIBUTES.MODE,
      'major'
    ) as Mode;
    this.#effectiveKeySig = this.resolveInheritedValue(
      COMMON_ATTRIBUTES.KEY_SIG,
      'C'
    ) as Note;

    this.#describeContainer = document.createElementNS(SVG_NS, 'g');
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

      ::slotted(music-tuplet) {
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

  public abstract getKeyYCoordinates(): {
    useSharps: boolean;
    coordinates: number[];
  };

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

    this.#buildDescribe(this.clefSvg);
    this.addEventListener(
      NOTE_EVENTS.CONNECTOR_ATTRIBUTE_CHANGE,
      this.#boundDrawConnectors
    );
    this.addEventListener(NOTE_EVENTS.NOTE_Y_CHANGE, this.#boundNoteYChange);
    this.addEventListener(
      NOTE_EVENTS.DYNAMIC_ATTRIBUTE_CHANGE,
      this.#boundRenderDynamics
    );
    // A trill attribute change needs the same full re-layout NOTE_Y_CHANGE
    // triggers, not a narrower redraw — toggling `trill` when `trill-note`
    // is already set (or vice versa) changes the written notehead's own
    // reserved rightward footprint, which only #renderNotes() recomputes.
    this.addEventListener(
      NOTE_EVENTS.TRILL_ATTRIBUTE_CHANGE,
      this.#boundNoteYChange
    );
    this.addEventListener(
      CLEF_EVENTS.ATTRIBUTE_CHANGE,
      this.#boundClefMarkerChange
    );
  }

  // Describe is: clef, key signature, time signature, and beams overlay
  #buildDescribe(clefSvgStr: string) {
    this.#describeContainer.classList.add('describe-container');
    this.#describeContainer.innerHTML =
      this.#showDescribe || this.#clefChangeAtBoundary ? clefSvgStr : '';
    this.transcribeContainer.appendChild(this.#describeContainer);

    const xOffsetOfClef = CLEF_X_OFFSET;
    const xOffsetOfKeySignature = this.#showDescribe
      ? this.#appendKeySignatureSvg(this.#describeContainer, xOffsetOfClef)
      : xOffsetOfClef;

    this.#appendTimeSignatureSvgIfNecessary(
      this.#describeContainer,
      xOffsetOfKeySignature + 5
    );

    // Voice 1's four overlay containers are created up front so a
    // single-voice staff (the overwhelmingly common case) matches today's
    // exact DOM shape; 2nd/3rd-voice containers (and the 'combined'/
    // 'shared-rest' synthetic tracks') are created lazily on first use by
    // #containerFor.
    this.#containerFor(this.#beamsContainers, 1, 'beams-container');
    this.#containerFor(this.#tupletContainers, 1, 'tuplets-container');
    this.#containerFor(this.#dynamicsContainers, 1, 'dynamics-container');
    this.#containerFor(this.#trillLinesContainers, 1, 'trill-lines-container');
  }

  #refreshDescribe() {
    if (!this.isConnected) return;
    this.#describeContainer.innerHTML =
      this.#showDescribe || this.#clefChangeAtBoundary ? this.clefSvg : '';
    const xOffsetOfKeySignature = this.#showDescribe
      ? this.#appendKeySignatureSvg(this.#describeContainer, CLEF_X_OFFSET)
      : CLEF_X_OFFSET;
    this.#appendTimeSignatureSvgIfNecessary(
      this.#describeContainer,
      xOffsetOfKeySignature + 5
    );
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

  #appendTimeSignatureSvgIfNecessary(parentSvg: SVGElement, xOffset: number) {
    const measure = this.closest(MUSIC_MEASURE);
    const composition = this.closest(MUSIC_COMPOSITION);
    // "First measure" from live DOM position, not the `number` attribute — the
    // composition writes `number` from a MutationObserver microtask, so a staff
    // mounted with a freshly-inserted first measure (a framework re-mounting the
    // measure hierarchy) would otherwise miss its own time signature and never
    // recover. `number` is kept as the fallback for a standalone `<music-measure>`
    // with no composition ancestor.
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
    try {
      this.#mutationObservers.forEach((m) => m.disconnect());
    } catch (e) {
      // ignore
    }
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
        e.nodeName === MUSIC_CLEF_NODE ||
        e.nodeName === MUSIC_VOICE_NODE
    );

    const { voices, clefMarkers } = flattenStaffSlotElements(assigned);
    this.#voices = voices;
    this.#clefMarkers = clefMarkers;
    this.#renderNotes();

    /*
     * todo: I may not need this, but I am keeping an example for now.
     * This would mainly be if I need to be aware of changes to attributes
     * on notes/chords and do something about it. I would also need to handle
     * these observers better in the case of a note/chord being removed but the
     * observer is still around (dead/disconnected); I will update to a map somehow.
     */
    // assignedElements.forEach((node) => {
    //   // only create the observer if it is new
    //   const observer = new MutationObserver(() => {});
    //   observer.observe(node, {
    //     childList: true,
    //     subtree: true,
    //     attributes: true,
    //     characterData: true,
    //   });
    //   this.#mutationObservers.push(observer);
    // });
  }

  // Removes every synthetic element (a v1-scoped combined-voices chord or
  // shared whole-measure rest) created by the previous pass. Combination
  // state is fully re-derived every render pass, never authored, so the
  // simplest correct lifecycle is remove-all-then-recreate rather than
  // tracking and diffing individual synthetic elements across passes.
  #syntheticElements: HTMLElement[] = [];
  #clearSyntheticElements(): void {
    for (const element of this.#syntheticElements) {
      element.remove();
    }
    this.#syntheticElements = [];
  }

  // Builds a synthetic <music-chord> for a v1-scoped auto-combine group
  // (rules/voiceCombineRules.ts) — one synthetic <music-note> child per
  // deduplicated tone, plus the shared articulation/dynamic/hairpin
  // attributes the combine condition already guarantees are equal across
  // every member. Constructed fully (children + attributes) before being
  // connected to the document, so its own `.notes` getter (a live query
  // over its children) sees the complete tone list from the start.
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

  // Builds one voice key's full VoiceRenderState: Y-coordinate resolution,
  // beam/stem resolution (policy-driven for a real multi-voice track,
  // pitch-driven for the single-voice case and the 'combined' track — see
  // determineVoiceStemDirections vs the untouched pitch-driven default in
  // buildBeamsRenderer), per-element property writes (reading back from the
  // one merged-by-beat-offset accidental resolution every voice key shares),
  // tuplet groups, and trill footprints.
  #buildVoiceRenderState(
    voiceKey: VoiceKey,
    elements: NoteChordOrRestElementType[],
    beatOffsets: number[],
    tupletsByIndex: Map<number, TupletElementType[]>,
    arpeggioGroups: ArpeggioGroupPlacement[],
    direction: VoiceDirection,
    pitchDriven: boolean,
    accidentals: ReturnType<typeof computeNoteAccidentals>
  ): VoiceRenderState {
    const noteStaffYCoords = new Map<NoteElementType, number>();
    const chordStaffYCoords = new Map<ChordElementType, number[]>();
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (element.nodeName === MUSIC_NOTE_NODE) {
        const noteElement = element as NoteElementType;
        noteStaffYCoords.set(
          noteElement,
          this.noteToYCoordinate(
            noteElement.note,
            noteElement.octave ?? undefined,
            i
          )
        );
      } else if (element.nodeName === MUSIC_CHORD_NODE) {
        const chordElement = element as ChordElementType;
        chordStaffYCoords.set(
          chordElement,
          this.#resolveChordStaffYCoordinates(chordElement.notes, i)
        );
      }
    }

    const arpeggioRunIndices = new Set<number>(
      arpeggioGroups.flatMap((group) => group.runIndices)
    );
    const stemDirectionsOverride = pitchDriven
      ? undefined
      : determineVoiceStemDirections(elements, direction);
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
      stemDirectionsOverride
    );

    const beamedIndices = new Set(
      elements.map((_, i) => i).filter((i) => beamsBuilder.isBeamed(i))
    );
    const tupletGroups = buildTupletGroups(elements, tupletsByIndex);
    const voiceRestContext: VoiceRestContext | undefined = pitchDriven
      ? undefined
      : { direction };

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const stemUp = stemDirections[i];
      const isBeamed = beamsBuilder.isBeamed(i);
      const extension = beamRenderer.stemExtension(i);

      if (element.nodeName === MUSIC_REST_NODE) {
        // no stem/beam/accidental properties — position is set in
        // #spaceElements() via restToYCoordinate(duration, voiceRestContext)
      } else if (element.nodeName === MUSIC_NOTE_NODE) {
        const noteElement = element as NoteElementType;
        noteElement.batchUpdate(() => {
          noteElement.stemUp = stemUp;
          noteElement.stemExtension = extension;
          noteElement.noFlags = isBeamed;
          noteElement.showAccidental =
            accidentals.noteShowAccidentals.get(noteElement);
          noteElement.staffY = noteStaffYCoords.get(noteElement) ?? null;
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
          chordElement.stemExtension = extension;
          chordElement.noFlags = isBeamed;
          chordElement.staffYCoordinates = staffYCoordinates;
          chordElement.noteAccidentals = chordAccidentals;
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
      arpeggioGroups,
      tupletGroups,
      beamsBuilder,
      beamRenderer,
      stemDirections,
      beamedIndices,
      noteStaffYCoords,
      chordStaffYCoords,
      noteXPositions: new Map(),
      firstGraceHeadXPositions: new Map(),
      writtenTrillFootprints: new Map(),
      trillFinishFootprints: new Map(),
      direction,
      restContext: voiceRestContext,
    };
    // #spaceElements() (below) reads these to push a following entry clear
    // of a rightward-reserving decoration's footprint, so they must be
    // resolved before that call, not after.
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
    };
    const pass1ByVoice = new Map<VoiceNumber, Pass1Voice>();
    for (const voiceNumber of voiceNumbers) {
      const voiceData = this.#voices.get(voiceNumber);
      if (!voiceData) {
        continue;
      }
      const { allowedElementCount, error } = computeAllowedElementCount(
        voiceData.flatElements,
        this.effectiveTimeSig,
        voiceData.tupletsByIndex,
        voiceData.arpeggioGroups
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
      const beatOffsets = computeBeatOffsets(
        elements,
        voiceData.tupletsByIndex,
        arpeggioRunIndices
      );
      pass1ByVoice.set(voiceNumber, {
        elements,
        beatOffsets,
        tupletsByIndex: voiceData.tupletsByIndex,
        arpeggioGroups: voiceData.arpeggioGroups,
      });
    }

    // Clef markers are staff-wide but only meaningful for a single voice —
    // see VoiceKey's own doc comment / Phase 1's documented boundary. Phase
    // 3 re-anchors them by beat-offset so they work at any voice count;
    // until then a multi-voice staff simply hides them.
    if (isMultiVoice) {
      if (this.#clefMarkers.length > 0) {
        console.warn(
          '[staffClassicalBase] mid-stream <music-clef> changes are not yet supported on a multi-voice staff; ignoring'
        );
      }
      for (const marker of this.#clefMarkers) {
        marker.element.style.display = 'none';
      }
      this.#clefMarkers = [];
    } else {
      const voice1 = pass1ByVoice.get(1);
      const allowedElementCount = voice1?.elements.length ?? 0;
      const survivingClefMarkers: ClefMarkerPlacement[] = [];
      for (const marker of this.#clefMarkers) {
        if (marker.afterElementIndex < allowedElementCount) {
          survivingClefMarkers.push(marker);
        } else {
          marker.element.style.display = 'none';
        }
      }
      this.#clefMarkers = survivingClefMarkers;
    }

    // Cross-voice pre-pass: shared-rest detection (v1-scoped, only ever
    // considered once 2+ voices are active), then — only if it didn't fire
    // — combine detection (also v1-scoped, 2+ voices).
    type TrackInput = Pass1Voice;
    const trackInputs = new Map<VoiceKey, TrackInput>();

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
        });
      }
    }

    // One merged-by-beat-offset sequence across every active track —
    // computeNoteAccidentals's returned maps are keyed by element identity,
    // not array position, so calling it once here (rather than once per
    // track) is what makes an accidental introduced in one voice correctly
    // suppress/require the same pitch's accidental in another voice later
    // in the bar (real engraving convention — one accidental applies to all
    // parts on a staff, not repeated per voice).
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

    // Pass 2: per active voice key — Y-resolution, beams/stems, rest-Y
    // context, per-element property writes, tuplet groups, trill footprints.
    const directionsByVoice = resolveVoiceDirections(voiceNumbers);
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
        direction,
        pitchDriven,
        accidentals
      );
      newRenderStates.set(voiceKey, state);
    }

    // #resolveArpeggiandoPassages' dropped-element cleanup needs each
    // voice key's PREVIOUS elements — one array per key instead of one
    // shared array, so a dropped element's impliedArpeggio is cleared
    // regardless of which voice it came from (including a voice key that
    // existed last pass but not this one, e.g. it became a shared rest).
    const previousElementsByVoice = this.#previousElementsByVoice;
    this.#previousElementsByVoice = new Map(
      [...newRenderStates.entries()].map(([key, state]) => [
        key,
        state.elements,
      ])
    );
    for (const [voiceKey, state] of newRenderStates) {
      this.#resolveArpeggiandoPassages(
        state.elements,
        previousElementsByVoice.get(voiceKey) ?? []
      );
    }
    for (const [voiceKey, elements] of previousElementsByVoice) {
      if (!newRenderStates.has(voiceKey)) {
        this.#resolveArpeggiandoPassages([], elements);
      }
    }

    this.#voiceRenderStates = newRenderStates;

    this.#prepareVoiceContainers(this.#beamsContainers, activeKeys);
    this.#prepareVoiceContainers(this.#tupletContainers, activeKeys);
    this.#prepareVoiceContainers(this.#dynamicsContainers, activeKeys);
    this.#prepareVoiceContainers(this.#trillLinesContainers, activeKeys);

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

    // Min-width/natural-width: computed per active voice key with the exact
    // same per-entry math as the original single-voice pass, then the max
    // across keys is what this staff reports — a documented, minor
    // simplification (two voices both wanting extra width at the exact same
    // beat could in principle want more than either alone), but actual
    // collisions are still separately clamped per-voice in #spaceElements(),
    // so this only affects the staff's own *preferred* width.
    let maxMinWidth = 0;
    let maxNaturalWidth = 0;
    let anyVoiceHasContent = false;
    for (const [voiceKey, state] of this.#voiceRenderStates) {
      if (state.elements.length === 0) {
        continue;
      }
      anyVoiceHasContent = true;
      const firstElementLeftwardWidth = this.#entryLeftwardExtent(
        state.elements[0]
      );
      let extraLeftwardWidth = 0;
      for (let i = 1; i < state.elements.length; i++) {
        extraLeftwardWidth += this.#entryLeftwardExtent(
          state.elements[i],
          false
        );
      }
      let extraRightwardWidth = 0;
      for (let i = 0; i < state.elements.length; i++) {
        extraRightwardWidth += this.#rightwardFootprint(voiceKey, i);
      }
      const clefMarkerWidth =
        !isMultiVoice || voiceKey === 1
          ? this.#clefMarkers.length * CLEF_CHANGE_RESERVED_WIDTH_PX
          : 0;
      const minWidth = calculateStaffMinWidth(
        this.#describeEndX,
        computeTupletScaledNoteCount(state.elements, state.tupletsByIndex),
        firstElementLeftwardWidth,
        extraLeftwardWidth,
        clefMarkerWidth,
        extraRightwardWidth
      );
      const { totalWeight } = computeSpacingWeights(
        state.elements,
        computeTupletScaleByIndex(state.elements, state.tupletsByIndex)
      );
      const naturalWidth = calculateStaffNaturalWidth(minWidth, totalWeight);
      maxMinWidth = Math.max(maxMinWidth, minWidth);
      maxNaturalWidth = Math.max(maxNaturalWidth, naturalWidth);
    }
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
    elementIndex: number
  ): number[] {
    const result: number[] = [];
    let previousY = Infinity;
    const { octaves } = this.#renderDataForIndex(elementIndex);

    for (const note of notes) {
      if (note.octave !== null) {
        const y = this.noteToYCoordinate(
          note.value,
          note.octave ?? undefined,
          elementIndex
        );
        result.push(y);
        previousY = y;
      } else {
        // For notes without an explicit octave, find the largest Y (lowest pitch)
        // that is still strictly below the previous note's Y, ensuring ascending
        // pitch (root-position close voicing).
        const candidates: number[] = [];
        for (const octave of octaves) {
          const y = this.noteToYCoordinate(note.value, octave, elementIndex);
          if (y > 0 && y < previousY) {
            candidates.push(y);
          }
        }
        const resolved =
          candidates.length > 0
            ? Math.max(...candidates)
            : this.noteToYCoordinate(note.value, undefined, elementIndex);
        result.push(resolved);
        previousY = resolved;
      }
    }

    return result;
  }

  // Finds the clef marker active at `elementIndex` — the latest marker whose
  // `afterElementIndex` is strictly less than it — or null if segment 0 (the
  // staff's own clef, via the abstract yCoordinates/octaves getters) applies.
  // Always null for staves with no <music-clef> markers (e.g. StaffVocalElement),
  // which is exactly what keeps this mechanism a no-op for them.
  #activeClefAt(elementIndex: number): ClefType | null {
    // Clef markers are staff-wide but only meaningful for a single voice —
    // see #renderNotes()'s clef-marker handling / VoiceKey's doc comment.
    // #clefMarkers is already emptied whenever #voices.size > 1, so this
    // guard is a fast-path, not load-bearing on its own.
    if (this.#voices.size > 1) {
      return null;
    }
    let active: ClefMarkerPlacement | null = null;
    for (const marker of this.#clefMarkers) {
      if (
        marker.afterElementIndex < elementIndex &&
        (active === null || marker.afterElementIndex > active.afterElementIndex)
      ) {
        active = marker;
      }
    }
    return active ? active.element.clef : null;
  }

  #renderDataForIndex(elementIndex: number): {
    yCoordinates: YCoordinates;
    octaves: Octave[];
  } {
    const clef = this.#activeClefAt(elementIndex);
    if (clef === null) {
      return { yCoordinates: this.yCoordinates, octaves: this.octaves };
    }
    const { yCoordinates, octaves } = getClefRenderData(clef);
    return { yCoordinates, octaves };
  }

  // Subclasses that have a genuine `clef` attribute (StaffElement) override
  // this to `return this.clef`. Staves with no comparable clef concept
  // (StaffVocalElement) leave it null, which makes effectiveStartClef/
  // effectiveEndClef null too — composition.ts's courtesy-clef logic treats
  // null as "not clef-comparable" and skips the pair.
  protected get ownClef(): ClefType | null {
    return null;
  }

  // The clef in effect at the very start of the staff's note stream — the
  // staff's own clef (via `ownClef`), unless a <music-clef> marker sits at
  // afterElementIndex === -1. Backs composition-level courtesy-clef logic.
  public get effectiveStartClef(): ClefType | null {
    return this.#activeClefAt(0) ?? this.ownClef;
  }

  // The clef in effect after the last note/chord/rest — the last marker's
  // clef, or the start clef if there are no markers.
  public get effectiveEndClef(): ClefType | null {
    return this.#activeClefAt(Number.POSITIVE_INFINITY) ?? this.ownClef;
  }

  // Return the y-coordinate for a given note and octave.
  // Accidentals are ignored for vertical placement — C# and C natural occupy
  // the same staff line/space.
  public noteToYCoordinate(
    note: Note,
    octave?: Octave,
    elementIndex?: number
  ): number {
    if (!note) {
      return 0;
    }

    // Strip accidentals: take the first character (always the letter A-G).
    const letter = note[0].toUpperCase();
    const { yCoordinates, octaves } =
      elementIndex !== undefined
        ? this.#renderDataForIndex(elementIndex)
        : { yCoordinates: this.yCoordinates, octaves: this.octaves };

    if (octave !== undefined) {
      const yCoordinate =
        yCoordinates[`${letter}${octave}` as NoteLetterOctave];
      if (yCoordinate !== undefined) {
        return yCoordinate;
      }
    } else {
      for (const n of octaves) {
        const yCoordinate = yCoordinates[`${letter}${n}` as NoteLetterOctave];
        if (yCoordinate !== undefined) {
          return yCoordinate;
        }
      }
    }

    return 0;
  }

  // Rightward layout footprint (px) per writtenNoteAnchorIndex — the mirror
  // of #entryLeftwardExtent for a written trilling notehead (trill-note),
  // the first rightward-reserving decoration in this codebase. Spans whose
  // resolved pitch isn't in written mode (the common case: no trill-note, or
  // the accidental-only override) contribute nothing. Recomputed from the
  // voice's own elements, so call after resolvedTrillPitch has been pushed
  // onto every element for this pass.
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

  // Rightward footprint (px) per index for a trill's finishing grace
  // note(s) (`trill-finish`) — the second rightward-reserving decoration in
  // this codebase, alongside the written trilling notehead above. Unlike
  // that one, this always anchors at its own host index (no tie-chain-based
  // deferral — a finishing figure trails the current note directly).
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
      footprints.set(i, width);
    }
    return footprints;
  }

  // Combined rightward footprint (px) at `index` of `voiceKey` — every
  // decoration that reserves space after an entry's own right edge sums
  // here, so #spaceElements() and the strut min-width only need one call
  // site regardless of how many such decorations exist.
  #rightwardFootprint(voiceKey: VoiceKey, index: number): number {
    const state = this.#voiceRenderStates.get(voiceKey);
    if (!state) {
      return 0;
    }
    return (
      (state.writtenTrillFootprints.get(index) ?? 0) +
      (state.trillFinishFootprints.get(index) ?? 0)
    );
  }

  // Total px an entry paints / needs left of its own SVG left edge (x = 0), from
  // every decoration drawn before it — wherever the pass that draws it lives:
  // this staff (accidental, grace run, element-local arpeggio sign + hairpin), or
  // an ancestor <music-measure>'s cross-staff arpeggio overlay (the span's wave +
  // continuous hairpin). Single source of truth for the "barline constraint" in
  // #spaceElements() and the strut min width in #renderNotes(). Add any new
  // left-of-entry decoration here, not at the call sites.
  //
  // Not included: an incoming tie/slur end curve, ledger-line extension, a
  // tuplet bracket/numeral. Each is geometrically bounded to not need one: a
  // tie/slur curve's x is monotonic between the two noteheads it connects, so
  // it never reaches past the previous entry; a ledger line's left extent is a
  // small fixed offset from the notehead centre, well inside this entry's own
  // SVG box; a tuplet bracket's left edge is clamped to never go negative past
  // its first note's own box.
  //
  // `includeAccidental` is false only for the non-first entries of the strut
  // min-width sum: their accidental column sits between two entries and is
  // absorbed by inter-note spacing / the per-entry MIN_NOTE_WIDTH, so it needs
  // no extra measure width. The first entry's column has only the describe area
  // to its left, so it always counts.
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
        const accidental = (el as NoteElementType).showAccidental;
        if (accidental) {
          extent += ACCIDENTAL_SYMBOL_WIDTH[accidental] + ACCIDENTAL_NOTE_GAP;
        }
      } else {
        const chord = el as ChordElementType;
        if (
          chord.staffYCoordinates &&
          chord.noteAccidentals.some((a) => a != null)
        ) {
          extent += totalChordAccidentalWidth(
            chord.noteAccidentals,
            chord.staffYCoordinates
          );
        }
      }
    }

    extent += computeGraceFootprintWidth(el.grace, el.resolvedGraceAccidentals);

    const partner = crossStaffArpeggioPartner(el);
    // A span's wave variant may be authored solely on the partner end (the
    // lower end of a span is the only one that can carry `arpeggio-for`, so
    // the upper end has neither its own `arpeggio` nor `arpeggioFor` when the
    // wave lives on the lower end) — the measure overlay still draws the wave
    // reaching this end, so fall back to the partner's variant to reserve for
    // it. Every wave variant reserves the same width (see footprintArpeggio's
    // own comment), so which one is used past non-null doesn't matter.
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
    container.setAttribute('x', `${this.#describeEndX}`);
    container.setAttribute('width', `${remainingWidth}`);
    container.setAttribute(
      'viewBox',
      `0 0 ${remainingWidth} ${STAFF_TRANSCRIPTION_HEIGHT}`
    );
    container.setAttribute('height', `${STAFF_TRANSCRIPTION_HEIGHT}`);
  }

  #spaceElements(): void {
    const transcribeRect = this.transcribeContainer.getBoundingClientRect();
    if (typeof this.#describeContainer.getBBox === 'function') {
      const describeBBox = this.#describeContainer.getBBox();
      this.#describeEndX = Math.round(describeBBox.x + describeBBox.width);
    } else {
      const describeRect = this.#describeContainer.getBoundingClientRect();
      this.#describeEndX = Math.round(describeRect.right - transcribeRect.left);
    }
    const remainingWidth = transcribeRect.width - this.#describeEndX;

    // Estimate above-staff budget using stem directions and staff-referenced positions.
    // This is a conservative estimate computed before notes are positioned; the actual
    // tuplet bracket geometries are computed after note positions are set (below).
    const aboveStaffBudget = this.#estimateAboveStaffBudget();
    const containerWidth = Math.round(transcribeRect.width);
    const totalHeight = STAFF_TRANSCRIPTION_HEIGHT + aboveStaffBudget;
    this.transcribeContainer.style.top =
      aboveStaffBudget > 0 ? `-${aboveStaffBudget}px` : '0px';
    this.transcribeContainer.style.height = `${totalHeight}px`;
    this.transcribeContainer.setAttribute(
      'viewBox',
      `0 -${aboveStaffBudget} ${containerWidth} ${totalHeight}`
    );

    // Each entry is positioned as a fraction of the measure's fixed beat
    // capacity (from the time signature — constant regardless of how many
    // entries currently exist), scaled by the staff's real available width.
    // This is what makes a full measure fill the staff, what makes a resize
    // reflow every entry together, and what keeps appending an entry from
    // ever moving an already-placed one: neither the capacity nor the
    // available width it's scaled against depends on entry count. Every
    // voice shares this exact formula (same measureCapacity, same
    // proportionalWidth), which is what makes same-beat notes across
    // voices land at the same x with zero explicit coordination.
    const [beatsInMeasure, beatType] = this.effectiveTimeSig;
    const measureCapacity = beatsInMeasure / beatType;
    const isMultiVoice = this.#voices.size > 1;

    let totalSlackWeight = 0;
    // Beat-offset-clustered noteheads across every real voice, for the
    // cross-voice collision pass below (needs every voice's positions
    // resolved first — see rules/voiceRules.ts#computeCrossVoiceDisplacements).
    const placementColumns: {
      beatOffset: number;
      placements: VoiceNoteheadPlacement[];
    }[] = [];

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
        // Represents every voice's silence at once — centered across the
        // measure's notes area (never the normal per-beat positioning every
        // other voice key goes through below), direction-agnostic, so the
        // plain undisplaced restToYCoordinate is used rather than a
        // voiceContext-displaced one.
        const restElement = state.elements[0];
        if (restElement) {
          const x = sharedRestGlyphX(
            this.#describeEndX,
            remainingWidth,
            NOTE_SVG_WIDTH
          );
          restElement.style.position = 'absolute';
          restElement.style.left = `${x}px`;
          restElement.style.top = `${restToYCoordinate(
            restElement.duration
          )}px`;
          state.noteXPositions.set(0, x - this.#describeEndX);
        }
        continue;
      }

      const tupletScaleByIndex = computeTupletScaleByIndex(
        state.elements,
        state.tupletsByIndex
      );
      const { totalWeight } = computeSpacingWeights(
        state.elements,
        tupletScaleByIndex
      );
      totalSlackWeight += totalWeight;

      // state.beatOffsets was already computed in Pass 1 (#renderNotes) for
      // every real voice and for 'shared-rest'; the 'combined' track's own
      // beat offsets (from each CombinedGroup) were set there too — so this
      // is always already correct and does not need recomputing here.
      const beatOffsets = state.beatOffsets;

      // Clef markers are staff-wide and only meaningful for voice 1 in the
      // single-voice case (see #renderNotes' clef-marker handling).
      const isVoiceOneOrSingle = !isMultiVoice || voiceKey === 1;
      const clefMarkerCount = isVoiceOneOrSingle ? this.#clefMarkers.length : 0;
      const proportionalWidth =
        remainingWidth -
        LEADING_NOTE_GAP_PX -
        clefMarkerCount * CLEF_CHANGE_RESERVED_WIDTH_PX;
      const measureOffsets = computeMeasureProportionalOffsets(
        beatOffsets,
        measureCapacity,
        proportionalWidth
      );

      const clefMarkersByAfterIndex = isVoiceOneOrSingle
        ? new Map(
            this.#clefMarkers.map((marker) => [
              marker.afterElementIndex,
              marker,
            ])
          )
        : new Map<number, ClefMarkerPlacement>();

      let clefMarkerReservedWidth = 0;
      let previousRightEdge = this.#describeEndX + LEADING_NOTE_GAP_PX;
      let previousNoteX: number | null = null;

      // A marker before the first note/chord/rest (afterElementIndex === -1)
      // is positioned here, ahead of the loop, since there's no element index
      // to key off inside it.
      const leadingClefMarker = clefMarkersByAfterIndex.get(-1);
      if (leadingClefMarker) {
        leadingClefMarker.element.style.position = 'absolute';
        leadingClefMarker.element.style.left = `${previousRightEdge}px`;
        leadingClefMarker.element.style.top = `${MID_STREAM_CLEF_Y_OFFSET}px`;
        leadingClefMarker.element.style.display = '';
        previousRightEdge += CLEF_CHANGE_RESERVED_WIDTH_PX;
        clefMarkerReservedWidth += CLEF_CHANGE_RESERVED_WIDTH_PX;
      }

      for (let i = 0; i < state.elements.length; i++) {
        const element = state.elements[i];
        const duration = element.duration as DurationType;
        const xOffsetInNotesSpace =
          LEADING_NOTE_GAP_PX + clefMarkerReservedWidth + measureOffsets[i];

        // Position the light DOM element via inline styles
        let xInWrapper = this.#describeEndX + xOffsetInNotesSpace;

        // Collision floor: the proportional position above has no built-in
        // minimum gap (unlike a per-entry strut), so enforce one against the
        // *previous* entry alone — never looking ahead, so appending a new
        // entry can never move an already-placed one.
        if (previousNoteX !== null) {
          xInWrapper = Math.max(xInWrapper, previousNoteX + MIN_NOTE_WIDTH);
        }

        // Everything drawn left of this entry — accidental / grace / arpeggio sign
        // + dynamic-change hairpin / cross-staff span footprint (see
        // #entryLeftwardExtent, the single source of truth).
        const leftwardWidth = this.#entryLeftwardExtent(element);

        // Barline constraint: the overhang must not cross into the describe area
        if (leftwardWidth > 0) {
          xInWrapper = Math.max(
            xInWrapper,
            this.#describeEndX + NOTES_AREA_LEFT_MARGIN + leftwardWidth
          );
        }

        xInWrapper = computeInterNoteSpacing(
          xInWrapper,
          leftwardWidth,
          previousRightEdge
        );

        // A rightward-reserving decoration (a written trilling notehead, a
        // trill's finishing grace note(s), or both) on the previous entry
        // reserves real space regardless of whether *this* entry has any
        // leftward decorations of its own — computeInterNoteSpacing only
        // enforces previousRightEdge when leftwardWidth is positive (the
        // leftward-only case every other decoration in this codebase
        // reserves), so apply it unconditionally here for that case.
        if (i > 0 && this.#rightwardFootprint(voiceKey, i - 1) > 0) {
          xInWrapper = Math.max(xInWrapper, previousRightEdge);
        }

        // Notify beam renderer of final position after any accidental shift, so beam
        // endpoints stay in sync with the DOM positions of the chord elements.
        const xInBeamsContainer = xInWrapper - this.#describeEndX;
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
              noteOrChordForGrace.resolvedGraceAccidentals
            )
          );
        }

        element.style.position = 'absolute';
        element.style.left = `${xInWrapper}px`;
        previousNoteX = xInWrapper;
        previousRightEdge =
          xInWrapper + NOTE_SVG_WIDTH + this.#rightwardFootprint(voiceKey, i);

        if (element.nodeName === MUSIC_REST_NODE) {
          element.style.top = `${restToYCoordinate(
            element.duration,
            state.restContext
          )}px`;
        } else if (element.nodeName === MUSIC_NOTE_NODE) {
          const noteElement = element as NoteElementType;
          const yHeadOffset = computeYHeadOffset(
            noteElement.stemUp,
            duration,
            noteElement.noFlags
          );
          const noteY =
            STAFF_Y_PADDING +
            this.noteToYCoordinate(
              noteElement.note,
              noteElement.octave ?? undefined,
              i
            ) -
            yHeadOffset;
          element.style.top = `${noteY}px`;
        } else {
          // Chord y-positioning is handled internally by the chord's own SVG rendering
          element.style.top = '0px';
        }

        // A marker following this element (afterElementIndex === i) is
        // zero-duration — it does not consume spacing slack — but does reserve
        // horizontal space, same as MIN_NOTE_WIDTH does for a real note.
        const trailingClefMarker = clefMarkersByAfterIndex.get(i);
        if (trailingClefMarker) {
          trailingClefMarker.element.style.position = 'absolute';
          trailingClefMarker.element.style.left = `${previousRightEdge}px`;
          trailingClefMarker.element.style.top = `${MID_STREAM_CLEF_Y_OFFSET}px`;
          trailingClefMarker.element.style.display = '';
          previousRightEdge += CLEF_CHANGE_RESERVED_WIDTH_PX;
          clefMarkerReservedWidth += CLEF_CHANGE_RESERVED_WIDTH_PX;
        }

        // Collect this notehead's placement for the cross-voice collision
        // pass below — real voices only ('combined'/'shared-rest' already
        // merged or represent every voice at once, so neither has anything
        // left to collide with — see rules/voiceRules.ts).
        if (
          typeof voiceKey === 'number' &&
          element.nodeName !== MUSIC_REST_NODE
        ) {
          const staffYs =
            element.nodeName === MUSIC_NOTE_NODE
              ? [state.noteStaffYCoords.get(element as NoteElementType) ?? 0]
              : state.chordStaffYCoords.get(element as ChordElementType) ?? [];
          const beatOffset = beatOffsets[i];
          let column = placementColumns.find(
            (c) => Math.abs(c.beatOffset - beatOffset) < 1e-9
          );
          if (!column) {
            column = { beatOffset, placements: [] };
            placementColumns.push(column);
          }
          column.placements.push({
            voiceNumber: voiceKey,
            localIndex: i,
            staffYCoordinates: staffYs,
            direction: state.direction,
            hasFlagOrBeam:
              state.beamedIndices.has(i) ||
              (durationToFlagCountMap.get(duration) ?? 0) > 0,
          });
        }
      }

      state.beamRenderer?.spaceAll();
    }

    this.#currentSpacingSlackWeight = totalSlackWeight;

    // Cross-voice collision pass — only meaningful once 2+ real voices
    // share the staff. Applies a small horizontal nudge on top of the
    // shared beat-position x already set above, exactly as
    // rules/chordRules.ts#computeAdjacentDisplacements is already layered
    // on top of a chord's own base x.
    if (isMultiVoice) {
      let anyDisplacement = false;
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
    }

    // Reconcile each beamed stem to the beam line as actually drawn. #renderNotes()
    // pushed an index-fraction estimate before X was known; now that setX + spaceAll
    // have run, stemExtension(i) returns the true-X value. The equality guard in the
    // note/chord setter makes this a no-op for the common evenly-spaced case, and
    // it is the only stem-length pass that runs on a bare resize (onStaffResize →
    // #spaceElements, never #renderNotes).
    for (const state of this.#voiceRenderStates.values()) {
      if (state.beamRenderer === null) {
        continue;
      }
      for (let i = 0; i < state.elements.length; i++) {
        if (!state.beamedIndices.has(i)) {
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
      // #spaceElements() runs on every resize (onStaffResize), independent of
      // #renderNotes()'s own container clear — without this, a resize would
      // append a second set of brackets alongside the stale ones instead of
      // replacing them.
      tupletContainer.innerHTML = '';
      this.#sizeVoiceContainer(tupletContainer, remainingWidth);

      // Pass 1: inner groups (nestingLevel > 0) — beam-referenced numeral placement.
      const innerGeometriesByGroup = new Map<
        TupletGroup,
        TupletBracketGeometry
      >();
      for (const group of state.tupletGroups) {
        if (group.nestingLevel === 0) {
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
          (i) => state.beamRenderer?.primaryBeamYForIndex(i) ?? null
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
        if (group.nestingLevel !== 0) {
          continue;
        }
        const outerIndexSet = new Set(group.indices);
        const innerNumeralYs = [...innerGeometriesByGroup.entries()]
          .filter(([innerGroup]) =>
            innerGroup.indices.every((i) => outerIndexSet.has(i))
          )
          .map(([, geom]) => geom.numeralY);

        const upVotes = group.indices.filter(
          (i) => state.stemDirections[i] === true
        ).length;
        const stemUp = upVotes >= group.indices.length / 2;
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
          (i) => state.beamRenderer?.primaryBeamYForIndex(i) ?? null
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
    // #spaceElements() runs on every resize, independent of #renderNotes()'s
    // own container clear — without this, a resize would append a second
    // set of markings/hairpins alongside the stale ones instead of
    // replacing them.
    container.innerHTML = '';
    for (let i = 0; i < state.elements.length; i++) {
      const element = state.elements[i];
      if (element.nodeName === MUSIC_REST_NODE) {
        continue;
      }
      const noteOrChord = element as INoteElement | IChordElement;
      if (noteOrChord.dynamic !== null) {
        const noteX = state.noteXPositions.get(i) ?? 0;
        const centerX = noteX + NOTE_SVG_WIDTH / 2;
        container.appendChild(
          createDynamicMarkingSvg(
            noteOrChord.dynamic,
            centerX,
            DYNAMICS_BASELINE_Y
          )
        );
      }

      // A grace-dynamic is independent of the host's own `dynamic` (both can
      // render at once — see the engraving reference's f-under-grace,
      // p-under-main example) and sits under the first grace note instead of
      // the host's own column.
      if (noteOrChord.graceDynamic !== null) {
        const firstGraceHeadX = state.firstGraceHeadXPositions.get(i);
        if (firstGraceHeadX !== undefined) {
          container.appendChild(
            createDynamicMarkingSvg(
              noteOrChord.graceDynamic,
              firstGraceHeadX,
              DYNAMICS_BASELINE_Y
            )
          );
        }
      }
    }

    const pairs = pairHairpins(state.elements, state.noteXPositions);
    for (const pair of pairs) {
      if (pair.errors.length > 0) {
        console.warn(pair.errors);
      }
      container.appendChild(
        createHairpinSvg(
          pair.kind,
          pair.startX,
          pair.endX,
          DYNAMICS_BASELINE_Y,
          HAIRPIN_OPEN_HEIGHT
        )
      );
    }

    this.#renderArpeggiandoText(voiceKey);
  }

  // `sempre arpeggiando` (abbreviated `sempre arpegg.`): from an element marked
  // arpeggiate="start" until the next arpeggiate="end" (or the end of the
  // staff), every note/chord that carries no explicit `arpeggio` gets an
  // implied `up` sign. Elements with their own `arpeggio` (including
  // `non-arpeggiate`) are left untouched. Runs before spacing so the implied
  // signs are counted in the leftward footprint.
  //
  // The implied sign is a derived property living on the element, so an element
  // dropped from the staff mid-passage would keep it — clear it on anything in
  // the previous list that is gone and has not been re-slotted into another
  // staff (which then owns its implied sign).
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

  // Whether any current element (note or chord) is trill-marked — used by
  // #boundDrawConnectors to decide whether a `tie` change (which only
  // dispatches CONNECTOR_ATTRIBUTE_CHANGE) needs the full trill re-layout
  // pass too, since a trill span's own endpoint depends on the tie chain.
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

  // Draws the wavy trill line (+ end-notch) and, when in written mode, the
  // small parenthesized trilling notehead, for every `trill`-marked element
  // in the current note stream, same-measure only (a span never crosses into
  // a sibling <music-measure>'s own staff — see rules/trillRules.ts). Called
  // from #spaceElements() (remainingWidth already known there), itself part
  // of the full #renderNotes() pass every trill/tie-affecting attribute
  // change now routes through.
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
    // #spaceElements() runs on every resize, independent of #renderNotes()'s
    // own container clear — without this, a resize would append a second
    // set of lines/signs/notches alongside the stale ones instead of
    // replacing them.
    container.innerHTML = '';
    const width =
      remainingWidth ??
      this.transcribeContainer.getBoundingClientRect().width -
        this.#describeEndX;

    for (const span of resolveTrillSpans(state.elements)) {
      const startElement = state.elements[span.startIndex] as
        | NoteElementType
        | ChordElementType;
      const resolvedTrillPitch = startElement.resolvedTrillPitch;

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

      const y = TRILL_ABOVE_STAFF_BOTTOM_Y;
      const stemUp = state.stemDirections[span.startIndex] ?? true;
      const startNoteX = state.noteXPositions.get(span.startIndex) ?? 0;
      const signLeftOffset = trillSignLeftX(stemUp);
      const startX =
        startNoteX +
        signLeftOffset +
        TRILL_SIGN_WIDTH_PX +
        TRILL_SIGN_LINE_GAP_PX;
      const endX = this.#trillLineEndX(state, span, width);

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

  // Draws the "to-next" half of a trill's finishing-grace slur(s) —
  // the self-contained "to-main" half is drawn locally by the note/chord
  // itself (see svgCreator/graceNotes.ts#createTrillFinishNotesSvg); this
  // half reaches a sibling element only this staff can position, so only the
  // staff can draw it. Independently recomputes the same local layout math
  // the host element's own render used (mirrors
  // #computeWrittenTrillFootprints/#drawWrittenTrillNote) rather than
  // reading it back from rendered DOM.
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
    const leftX = anchorNoteX + NOTE_SVG_WIDTH + TRILL_WRITTEN_NOTE_GAP_PX;
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

  // Conservative above-staff budget estimate using staff-referenced
  // positions. Used before note x-positions are set; the actual rendering
  // uses real geometry. Computed per voice key and maxed across all of
  // them — this is already a conservative pre-layout estimate, so taking
  // the max across voices (rather than summing or reasoning precisely
  // about cross-voice above-staff overlap) is a safe, minor simplification.
  #estimateAboveStaffBudget(): number {
    let budget = 0;
    for (const state of this.#voiceRenderStates.values()) {
      budget = Math.max(budget, this.#estimateAboveStaffBudgetForVoice(state));
    }
    return budget;
  }

  #estimateAboveStaffBudgetForVoice(state: VoiceRenderState): number {
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

    // A trilling-note accidental (the accidental-only mode — no trill-note,
    // so no written parenthesized notehead) sits above the trill sign itself,
    // which already sits at a fixed height above the staff — reserve room
    // when that combined height would otherwise poke past the SVG. Written
    // mode's accidental renders inline inside the notehead instead and needs
    // no extra vertical room, so it's excluded here.
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

    const hasStemUpTuplet = state.tupletGroups.some((group) => {
      const upVotes = group.indices.filter(
        (i) => state.stemDirections[i] === true
      ).length;
      return upVotes >= group.indices.length / 2;
    });
    if (hasStemUpTuplet) {
      const topY =
        STAFF_TOP_LINE_Y -
        STAFF_Y_PADDING -
        TUPLET_STAFF_CLEARANCE_PX -
        TUPLET_HOOK_LENGTH_PX -
        TUPLET_NUMERAL_FONT_SIZE;
      if (topY < 0) {
        budget = Math.max(budget, Math.ceil(-topY) + 2);
      }
    }

    return budget;
  }

  // Respace notes on resize. Runs even when there are no notes/chords, since
  // the describe area (clef/key/time signature) and the SVG viewBox still
  // need to track the staff's current width — otherwise an empty staff's
  // viewBox stays frozen at whatever width it had when it first connected,
  // and the browser's default viewBox scaling silently mis-scales/repositions
  // the clef on every subsequent resize.
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
