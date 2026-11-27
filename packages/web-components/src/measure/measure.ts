import {
  type ArpeggioEntry,
  resolveArpeggioSpans,
} from '../rules/arpeggioRules';
import { resolveEndBarline } from '../rules/barlineRules';
import {
  BeamLineDescriptor,
  computeBeamLevelStructure,
} from '../rules/beamStructureRules';
import { computeTremoloScaleByIndex } from '../rules/beatRules';
import {
  type ObstacleRect,
  sliceConvexPolygon,
} from '../rules/connectorPlacementRules';
import {
  centredCrossStaffTremoloLine,
  crossStaffTremoloBeamShapes,
  type CrossStaffTremoloEntry,
  type CrossStaffTremoloRole,
  resolveCrossStaffTremoloBeams,
  resolveCrossStaffTremoloGroups,
} from '../rules/crossStaffTremoloRules';
import {
  type CrossStaffTupletEntry,
  crossStaffTupletGapBand,
  type CrossStaffTupletRole,
  resolveCrossStaffTupletGapBaseY,
  resolveCrossStaffTupletGroups,
} from '../rules/crossStaffTupletRules';
import {
  classifyAutoRestStaffSide,
  DoubleStemmedBeamAttachedShape,
  DoubleStemmedBeamEntry,
  DoubleStemmedBeamGroup,
  DoubleStemmedBeamLine,
  DoubleStemmedBeamMember,
  DoubleStemmedBeamPoint,
  DoubleStemmedBeamSegmentPosition,
  DoubleStemmedBeamSegmentSide,
  doubleStemmedBeamYAtX,
  resolveDoubleStemmedBeamClearance,
  resolveDoubleStemmedBeamGroups,
  resolveDoubleStemmedBeamLine,
  resolveGroupSecondaryBeamSide,
  resolveSecondaryBeamVerticalSide,
} from '../rules/doubleStemmedBeamRules';
import {
  computeHairpinXSpan,
  pairSharedHairpinsAcrossStaves,
  resolveChainSpans,
  resolveSwellRow,
} from '../rules/dynamicsRules';
import {
  type EndingSegment,
  endingStaffLineY,
  resolveEndings,
  resolveEndingSegments,
} from '../rules/endingRules';
import {
  type CrossStaffDynamicsOverride,
  type DynamicsSide,
  dynamicTextCenterClearOfStems,
  estimateDynamicTextBox,
  type HairpinEndpointText,
  type HairpinPoint,
  hairpinWedgeEdges,
  isHorizontalHairpinClear,
  resolveAngledHairpinRoute,
  resolveSharedHairpinY,
  type StaffHairpinDefaults,
} from '../rules/hairpinPlacementRules';
import {
  resolveCrossStaffOctaveBreaks,
  resolveOctaveSpans,
} from '../rules/octaveRules';
import { restToYCoordinate } from '../rules/restRules';
import {
  resolveSharedStemPairs,
  type SharedStemEntry,
} from '../rules/sharedStemRules';
import type { VoiceRooms } from '../rules/spacingRules';
import {
  connectedBarlineGaps,
  resolveStaffGroups,
} from '../rules/staffGroupRules';
import { barMinWidthCss, measureFlexValue } from '../rules/staffWidth';
import {
  barlineTypeConflicts,
  MARKER_BEAT_EPSILON,
  type MarkerBeat,
  mergeMarkerBeats,
} from '../rules/streamMarkerRules';
import { resolveTabMirrors } from '../rules/tabMirrorRules';
import {
  durationToFactor,
  durationToFlagCountMap,
} from '../rules/theoryConsts';
import { acceptsBeamAttach, tremoloBeamCounts } from '../rules/tremoloRules';
import {
  parseTupletRatio,
  type TupletBracketGeometry,
  tupletDisplay,
  tupletDisplayOf,
} from '../rules/tupletRules';
import { computeBandOverflow, VerticalBand } from '../rules/verticalSpaceRules';
import type { StaffWidths } from '../staffBase';
import type {
  NoteChordOrRestElementType,
  NoteOrChordElementType,
  RestElementType,
  StaffElementBaseType,
  TremoloElementType,
  TupletElementType,
} from '../types/elements';
import type {
  DynamicMarking,
  HairpinKind,
  MeasureEndBarline,
} from '../types/theory';
import {
  appendArpeggioHairpin,
  chordSelector,
  COMMON_ATTRIBUTES,
  createAngledHairpinSvg,
  createArpeggioSvg,
  createBraceSvg,
  createBracketSvg,
  createDoubleStemmedBeamPolygon,
  createDynamicMarkingSvg,
  createDynamicTextSvg,
  createEndingSegmentSvg,
  createHairpinSvg,
  createSharedStemLine,
  createTremoloBeamPolygon,
  createTupletBracketSvg,
  isStaffNodeName,
  loneNoteSelector,
  MEASURE_EVENTS,
  MUSIC_ARPEGGIO,
  MUSIC_COMPOSITION,
  MUSIC_MEASURE,
  MUSIC_REST,
  MUSIC_REST_NODE,
  MUSIC_STAFF_GUITAR_TAB_NODE,
  MUSIC_STAFF_VOCAL_NODE,
  MUSIC_TREMOLO,
  MUSIC_TUPLET,
  MUSIC_VOICE,
  NOTE_EVENTS,
  NOTEHEAD_WIDTH_PX,
  STAFF_EVENTS,
  STAFF_TAGS,
  SVG_NS,
  TREMOLO_EVENTS,
  TUPLET_EVENTS,
} from '../utils';
import {
  buildConnectorSvgs,
  collectConnectorPairs,
  collectEntryObstacles,
  collectStemRects,
  isInnerVoiceMember,
  resolveDoubleStemmedBeamConnectorContext,
  resolveSlurGroupPlacement,
} from '../utils/connectorsBuilder';
import { isRowFlexItem } from '../utils/isRowFlexItem';
import {
  ARPEGGIO_CHORD_GAP_PX,
  BARLINE_THIN_PX,
  BASE_STEM_LENGTH_PX,
  BEAM_GAP_PX,
  BEAM_STEP_PX,
  BEAM_THICKNESS_PX,
  BRACE_STAFF_GAP_PX,
  BRACE_WIDTH_PX,
  BRACKET_LINE_OVERHANG_PX,
  BRACKET_STAFF_GAP_PX,
  BRACKET_WIDTH_PX,
  DOUBLE_STEMMED_BEAM_MIN_STEM_PX,
  DYNAMICS_BASELINE_Y,
  EMPTY_MEASURE_FLEX_BASIS_PX,
  ENDING_INSET_PX,
  ENDING_LINE_Y_PX,
  HAIRPIN_OPEN_HEIGHT,
  MEASURE_MIN_WIDTH_PX,
  MEASURE_NUMBER_BOTTOM_MARGIN_PX,
  MEASURE_NUMBER_FONT_SIZE,
  MIN_REST_NOTE_CLEARANCE_PX,
  OCTAVE_SIGN_BEAM_CLEARANCE_PX,
  REST_BEAM_CLEARANCE_PX,
  REST_STEM_AVOIDANCE_NUDGE_PX,
  REST_STEM_AVOIDANCE_THRESHOLD_PX,
  SHARED_STEM_MISALIGNMENT_WARN_PX,
  SLUR_BEAM_SLICE_WIDTH_PX,
  STAFF_BOTTOM_LINE_Y,
  STAFF_LABEL_FONT_SIZE,
  STAFF_LABEL_LEFT_MARGIN_PX,
  STAFF_LABEL_WIDTH_PX,
  STEM_OVERLAP_PX,
  TUPLET_HOOK_LENGTH_PX,
  TUPLET_NUMERAL_BEAM_GAP_PX,
  VERTICAL_OVERFLOW_CLEARANCE_PX,
} from '../utils/notationDimensions';
import {
  parseDuration,
  parseEnding,
  parseMeasureEndBarline,
  parseMeasureNumberDisplay,
  parseTremoloBeamAttach,
  parseTremoloStrokes,
  resolveNoteSize,
} from '../utils/parsers';
import { flattenSlotElements } from '../utils/slotElements';
import {
  measureVerticalExtents,
  VerticalSpaceReservations,
} from '../utils/verticalSpace';

// Where a measure number's baseline anchor sits, measured down from the
// measure's top — a fixed spot above the measure, not tied to the staff lines
// (the system barline, brace/bracket and staff labels are, via
// #staffLineBands).
const MEASURE_NUMBER_TOP_PX = 33;

// Beat offsets are sums of exact binary fractions, apart from tuplet
// ratios; this only absorbs floating-point noise.
const SAME_BEAT_TOLERANCE = 1e-6;

const OVERLAY_SOURCE = 'overlay';
const ENDING_SOURCE = 'ending';

// Where a shown measure number's box ends, measured down from the measure's
// top (see .measure-numbers > *).
const NUMBER_BOTTOM_Y = MEASURE_NUMBER_TOP_PX - MEASURE_NUMBER_BOTTOM_MARGIN_PX;

const sameEndingSegment = (
  a: EndingSegment | null,
  b: EndingSegment | null
): boolean =>
  a === null || b === null
    ? a === b
    : a.label === b.label &&
      a.labelIsText === b.labelIsText &&
      a.leftHook === b.leftHook &&
      a.rightHook === b.rightHook &&
      a.endsEnding === b.endsEnding;
const MEASURE_DYNAMICS_SOURCE = 'measure-dynamics';

type ClassicalStaffElement = StaffElementBaseType & {
  hairpinDefaultsForMeasure(): StaffHairpinDefaults;
  crossStaffDynamicsOverrides: ReadonlyMap<
    NoteOrChordElementType,
    CrossStaffDynamicsOverride
  > | null;
};

type MeasureDynamicsPlan = {
  overrides: Map<
    ClassicalStaffElement,
    Map<NoteOrChordElementType, CrossStaffDynamicsOverride>
  >;
  hairpins: {
    kind: HairpinKind;
    start: HairpinPoint;
    end: HairpinPoint;
    angled: boolean;
  }[];
  markings: {
    marking: DynamicMarking;
    centerX: number;
    y: number;
    bracketed?: boolean;
    text?: string | null;
  }[];
};

// Records the margin one gap side of `staff` needs to make up `deficit` px
// of missing gap (negative: to spare). Margin-independent: a margin already
// widened for it shows up as spare gap, so the sum stays put between passes.
function addGapNeed(
  needs: Map<StaffElementBaseType, VerticalBand>,
  staff: StaffElementBaseType,
  side: 'top' | 'bottom',
  deficit: number
): void {
  const applied =
    parseFloat(
      side === 'top' ? staff.style.marginTop : staff.style.marginBottom
    ) || 0;
  const needed = Math.max(0, Math.ceil(applied + deficit));
  const band = needs.get(staff) ?? { top: 0, bottom: 0 };
  needs.set(staff, { ...band, [side]: Math.max(band[side], needed) });
}

// A beam-group member inside a <music-tuplet> keeps its own staff's numeral,
// which the staff hangs off the shared beam on its stem side
// (staffNotationBase.ts#tupletExtremeY's numeral offset) — so it moves with
// the beam and has to clear what the beam clears.
function hangingTupletNumeralShapes(
  memberGeometries: readonly {
    element: Element;
    stemUp: boolean;
    point: { x: number };
  }[]
): DoubleStemmedBeamAttachedShape[] {
  const byTuplet = new Map<
    TupletElementType,
    { xs: number[]; stemUp: boolean }
  >();
  for (const { element, stemUp, point } of memberGeometries) {
    const tuplet = element.closest<TupletElementType>(MUSIC_TUPLET);
    if (tuplet === null) {
      continue;
    }
    const entry = byTuplet.get(tuplet) ?? { xs: [], stemUp };
    entry.xs.push(point.x);
    byTuplet.set(tuplet, entry);
  }
  const near = BEAM_THICKNESS_PX + TUPLET_NUMERAL_BEAM_GAP_PX;
  return Array.from(byTuplet, ([tuplet, { xs, stemUp }]) => {
    const display = tupletDisplay(
      parseTupletRatio(tuplet.ratio),
      tuplet.noteValue
    );
    const far = near + display.ascent + display.descent;
    return {
      left: Math.min(...xs),
      right: Math.max(...xs),
      topOffset: stemUp ? -far : near,
      bottomOffset: stemUp ? -near : far,
    };
  });
}

// A cross-staff tuplet's members with the share of their written value each
// takes: 1/N inside a <music-tremolo> of N members, else all of it.
function tupletMembers(
  tuplet: TupletElementType
): { element: NoteChordOrRestElementType; share: number }[] {
  const { flatElements, tremoloGroups } = flattenSlotElements(
    Array.from(tuplet.children)
  );
  const shares = computeTremoloScaleByIndex(tremoloGroups);
  return flatElements.map((element, i) => ({
    element,
    share: shares.get(i) ?? 1,
  }));
}

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  /**
   * One bar of music. Groups one or more staves (a single staff, or a grand
   * staff / choir when it holds several), draws the vertical bar-line connector
   * through them, and sizes itself to the widest staff's minimum width. Key
   * signature, mode and time inherited from a parent `<music-composition>` can be
   * overridden here to start a mid-piece change. Works standalone.
   *
   * @customElement music-measure
   * @attr {number} number - Bar number. Whether it's actually shown above the measure is controlled by the ancestor `<music-composition>`'s `measure-numbers` attribute (default: not shown).
   * @attr {Note} key-sig - Overrides the inherited key-signature tonic from this bar on.
   * @attr {'major' | 'minor'} mode - Overrides the inherited key-signature mode.
   * @attr {TimeSignature} time - Overrides the inherited time signature from this bar on.
   * @attr {MeasureEndBarline} barline - The barline ending this bar: `single` (default), `double` (thin double), `final` (thin–thick) or `repeat-end` (:‖).
   * @attr {boolean} repeat-start - Starts a repeated section at this bar with a start repeat barline (‖:), drawn after any clef, key or time signature at the start of the bar. A repeat from the very beginning of a piece needs none.
   * @attr {string} ending - The passes this bar is played on, as comma-separated numbers (`1`, `2`, `1,2`). Consecutive bars with the same value form one first-/second-time ending, drawn as a bracket over the top staff labelled `1.`, `1.2.`; consecutive endings form a group. The bracket closes with a right hook on an ending ending in `repeat-end` or `final`, and is open-ended otherwise.
   * @attr {string} ending-label - Italic text drawn in the ending's bracket in place of its numerals (e.g. `Fine`).
   *
   * @example
   * <music-measure number="1">
   *   <music-staff clef="treble">
   *     <music-note note="C" octave="4" duration="whole"></music-note>
   *   </music-staff>
   * </music-measure>
   */
  class MeasureElement extends HTMLElement {
    static get observedAttributes(): string[] {
      return [
        'number',
        COMMON_ATTRIBUTES.KEY_SIG,
        COMMON_ATTRIBUTES.MODE,
        COMMON_ATTRIBUTES.TIME,
        'barline',
        'repeat-start',
        'ending',
        'ending-label',
      ];
    }

    #staffConnectorObserver: ResizeObserver;
    #staffWidths = new Map<EventTarget, StaffWidths>();
    // Elements #redrawSharedStems set noStem on, so a pair that stops
    // resolving gets its own stems back.
    #sharedStemSuppressedElements = new Set<NoteOrChordElementType>();
    #verticalSpace = new VerticalSpaceReservations(this);
    // See applyOctaveContinuationCoverage/applyOctaveContinuationRects.
    #octaveContinuationCoverage = new Map<
      Element,
      readonly (readonly NoteChordOrRestElementType[])[]
    >();
    // Relative to each staff's top line (see applyOctaveContinuationRects).
    #octaveContinuationRects = new Map<Element, readonly ObstacleRect[]>();
    #boundSyncMarkerBeats = () => this.#syncMarkerBeats();
    #boundSyncBarlineSlots = () => {
      this.#syncVoiceRooms();
      this.#syncBarlineSlots();
    };
    #lastTabMirrorWarnings = new Set<string>();
    #lastBarlineWarnings = new Set<string>();

    // Every staff starts its notes after the widest start area in the
    // measure, so same-beat entries line up from the first beat. Each staff's
    // own start is measured from its start-area glyphs alone, so the re-render
    // a new value triggers finds the same maximum and the exchange ends.
    #syncNotesStartX(): void {
      const staves = Array.from(this.children).filter(
        (child) =>
          isStaffNodeName(child.nodeName) && 'measureNotesStartX' in child
      ) as unknown as {
        ownNotesStartX: number;
        measureNotesStartX: number;
      }[];
      const notesStartX = Math.max(
        0,
        ...staves.map((staff) => staff.ownNotesStartX)
      );
      staves.forEach((staff) => {
        staff.measureNotesStartX = notesStartX;
      });
    }

    // Every staff spaces its notes short of the widest end-of-measure warning
    // area in the measure, so beat columns stay aligned when only one staff
    // warns of a clef. Own widths come from the warnings alone, so the
    // exchange ends on the next pass.
    #syncEndWarningSpace(): void {
      const staves = Array.from(this.children).filter(
        (child) =>
          isStaffNodeName(child.nodeName) && 'measureEndWarningSpace' in child
      ) as unknown as {
        ownEndWarningSpace: { width: number; reserved: number };
        measureEndWarningSpace: { width: number; reserved: number };
      }[];
      const space = {
        width: Math.max(0, ...staves.map((s) => s.ownEndWarningSpace.width)),
        reserved: Math.max(
          0,
          ...staves.map((s) => s.ownEndWarningSpace.reserved)
        ),
      };
      staves.forEach((staff) => {
        staff.measureEndWarningSpace = space;
      });
    }

    // Every notation staff makes room for every other's mid-bar markers, and
    // so does a tab staff that mirrors one (`tab-for` → `part`), so same-beat
    // entries stay aligned past them. A tab staff that mirrors none still
    // makes room for, and draws, every barline. A staff ignores an unchanged
    // value, so its re-render coming back through here ends the exchange.
    #syncMarkerBeats(): void {
      const staves = Array.from(this.children).filter(
        (child) =>
          isStaffNodeName(child.nodeName) &&
          // A staff parsed from markup before its definition has run is not
          // upgraded yet, so it has none of these accessors.
          'measureMarkerBeats' in child
      ) as unknown as (StaffElementBaseType & {
        ownMarkerBeats: readonly MarkerBeat[];
        measureMarkerBeats: readonly MarkerBeat[];
        part: string | null;
        tabFor?: string | null;
      })[];
      const kinds = staves.map((staff) =>
        staff.nodeName === MUSIC_STAFF_GUITAR_TAB_NODE
          ? ('tab' as const)
          : ('notation' as const)
      );
      const notationLists = staves
        .filter((_, i) => kinds[i] === 'notation')
        .map((staff) => staff.ownMarkerBeats);
      const union = mergeMarkerBeats(...notationLists);
      const barlinesOnly = union.filter((marker) => marker.kind === 'barline');
      const { links, warnings } = resolveTabMirrors(
        staves.map((staff, i) => ({
          kind: kinds[i],
          part: staff.part,
          tabFor: staff.tabFor ?? null,
        }))
      );
      const currentWarnings = new Set(warnings);
      for (const warning of currentWarnings) {
        if (!this.#lastTabMirrorWarnings.has(warning)) {
          console.warn(warning);
        }
      }
      this.#lastTabMirrorWarnings = currentWarnings;
      const barlineWarnings = new Set(
        barlineTypeConflicts(...notationLists).map(
          (warning) => `[music-measure] ${warning}`
        )
      );
      for (const warning of barlineWarnings) {
        if (!this.#lastBarlineWarnings.has(warning)) {
          console.warn(warning);
        }
      }
      this.#lastBarlineWarnings = barlineWarnings;
      staves.forEach((staff, i) => {
        staff.measureMarkerBeats =
          kinds[i] === 'notation' || links.has(i) ? union : barlinesOnly;
      });
    }

    // Every staff places its beats from what every staff's entries need, so
    // same-beat entries stay aligned.
    #syncVoiceRooms(): void {
      const staves = Array.from(this.children).filter(
        (child) =>
          isStaffNodeName(child.nodeName) && 'measureVoiceRooms' in child
      ) as unknown as {
        ownVoiceRooms: readonly VoiceRooms[] | null;
        measureVoiceRooms: readonly VoiceRooms[];
      }[];
      const own = staves.map((staff) => staff.ownVoiceRooms);
      // Wait for every staff, rather than lay each one out again per sibling.
      if (own.includes(null)) {
        return;
      }
      staves.forEach((staff, i) => {
        staff.measureVoiceRooms = own.flatMap((rooms, k) =>
          k === i ? [] : rooms ?? []
        );
      });
    }

    // A mid-bar barline runs through every staff at one x: each staff places
    // its slot from its own entries, and every staff takes the furthest
    // right. A staff only moves a slot right, so the exchange settles.
    #syncBarlineSlots(): void {
      const staves = Array.from(this.children).filter(
        (child) =>
          isStaffNodeName(child.nodeName) && 'measureBarlineSlotLefts' in child
      ) as unknown as {
        ownBarlineSlotLefts: readonly { beat: number; left: number }[];
        measureBarlineSlotLefts: readonly { beat: number; left: number }[];
      }[];
      const shared: { beat: number; left: number }[] = [];
      for (const staff of staves) {
        for (const slot of staff.ownBarlineSlotLefts) {
          const existing = shared.find(
            (candidate) =>
              Math.abs(candidate.beat - slot.beat) <= MARKER_BEAT_EPSILON
          );
          if (existing === undefined) {
            shared.push({ ...slot });
          } else {
            existing.left = Math.max(existing.left, slot.left);
          }
        }
      }
      shared.sort((a, b) => a.beat - b.beat);
      for (const staff of staves) {
        staff.measureBarlineSlotLefts = shared;
      }
    }

    // A standalone measure draws its own barlines; inside a
    // <music-composition>, the composition sets them, since where two bars
    // meet decides what each draws.
    #pushBarlinesToStaves(): void {
      if (this.closest(MUSIC_COMPOSITION) !== null) {
        return;
      }
      const { barline } = resolveEndBarline({
        authored: this.barline,
        fine: false,
        jump: false,
      });
      for (const staff of Array.from(this.children)) {
        if (isStaffNodeName(staff.nodeName) && 'endBarline' in staff) {
          const target = staff as unknown as {
            endBarline: string;
            startRepeat: string;
          };
          target.endBarline = barline;
          target.startRepeat = this.repeatStart ? 'full' : 'none';
        }
      }
      this.refreshGroupBarlines();
    }

    #onStaffMinWidth = (event: Event): void => {
      const customEvent = event as CustomEvent<StaffWidths>;
      if (customEvent.target) {
        this.#staffWidths.set(customEvent.target, customEvent.detail);
      }
      const widths = [...this.#staffWidths.values()];
      const maxMinWidth = Math.max(...widths.map((w) => w.minWidth));
      const maxNaturalWidth = Math.max(...widths.map((w) => w.naturalWidth));
      // flex grow == basis == natural width, so measures on a row share it as
      // naturalWidth_i ÷ Σ naturalWidth. min-width is the collision strut (never
      // below the absolute floor), set apart from the basis so a crowded measure
      // can still shrink toward it before the row wraps.
      this.style.flex = measureFlexValue(maxNaturalWidth);
      const minWidth = Math.max(maxMinWidth, MEASURE_MIN_WIDTH_PX);
      // In a row of measures the basis asks for the same room.
      this.style.minWidth =
        this.closest(MUSIC_COMPOSITION) !== null || isRowFlexItem(this)
          ? `${minWidth}px`
          : barMinWidthCss(
              minWidth,
              Math.max(...widths.map((w) => w.uncrowdedWidth)),
              'calc(100% - var(--measure-decoration-width, 0px))'
            );
      // Connectors run after double-stemmed beams: a slur reads the drawn
      // beam polygon to avoid crossing it.
      this.#pushBarlinesToStaves();
      this.#applyStandaloneEnding();
      this.#syncNotesStartX();
      this.#syncEndWarningSpace();
      this.#syncMarkerBeats();
      this.#syncBarlineSlots();
      this.#redrawArpeggios();
      this.#redrawDoubleStemmedBeams();
      this.#redrawCrossStaffTremolos();
      this.#redrawCrossStaffTuplets();
      this.#redrawMeasureDynamics();
      this.#redrawConnectors();
      this.#redrawSharedStems();
      this.refreshGroupBarlines();
    };
    #boundUpdateConnectorVisibility: () => void;
    #boundRedrawArpeggios = () => this.#redrawArpeggios(true);
    #boundRedrawCrossStaffTuplets = () => this.#redrawCrossStaffTuplets();
    #boundRedrawCrossStaffTremolos = () => this.#redrawCrossStaffTremolos();
    // A staff's margin can change mid-render (its own headroom) or from the
    // composition's row alignment; either moves its lines, so only the
    // system decorations re-lay — not the beam/connector redraw chain, which
    // the staff's own NOTES_POSITIONED already covers.
    #boundLayoutSystemDecorations = (event: Event) => {
      if (event.target !== this) {
        this.#layoutSystemDecorations();
      }
    };
    // A `beam-group` change dispatches only BEAM_GROUP_ATTRIBUTE_CHANGE; the
    // pushed stem overrides then re-render each staff.
    #boundRedrawDoubleStemmedBeams = () => this.#redrawDoubleStemmedBeams();
    // Same shape as #boundRedrawDoubleStemmedBeams above, for
    // shared-stem-for pairs.
    #boundRedrawSharedStems = () => this.#redrawSharedStems();
    // A plain tie/slur attribute change (no geometry change) only ever
    // dispatches CONNECTOR_ATTRIBUTE_CHANGE, never STAFF_MIN_WIDTH — mirrors
    // composition.ts's own listener for the same event/reason.
    #boundRedrawConnectors = () => this.#redrawConnectors();
    // A `dynamic`/`dynamic-shared` change dispatches only
    // DYNAMIC_ATTRIBUTE_CHANGE. Also re-run after the beams and cross-staff
    // tuplets this pass avoids, so each registration below follows theirs.
    #boundRedrawMeasureDynamics = () => this.#redrawMeasureDynamics();
    #boundRedrawGapPasses = () => this.#redrawGapPasses();
    #boundRefreshGroupBarlines = () => this.refreshGroupBarlines();

    constructor() {
      super();

      this.attachShadow({ mode: 'open' });

      this.#boundUpdateConnectorVisibility =
        this.#updateConnectorVisibility.bind(this);
      this.#staffConnectorObserver = new ResizeObserver(
        this.#boundUpdateConnectorVisibility
      );
    }

    get number(): number | null {
      const value = this.getAttribute('number');
      if (value === null) {
        return null;
      }
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? null : parsed;
    }

    set number(value: number | null) {
      if (value === null) {
        this.removeAttribute('number');
      } else {
        this.setAttribute('number', value.toString());
      }
    }

    get barline(): MeasureEndBarline | null {
      return parseMeasureEndBarline(this.getAttribute('barline'));
    }

    set barline(value: MeasureEndBarline | null) {
      if (value === null) {
        this.removeAttribute('barline');
      } else {
        this.setAttribute('barline', value);
      }
    }

    get repeatStart(): boolean {
      return this.hasAttribute('repeat-start');
    }

    set repeatStart(value: boolean) {
      this.toggleAttribute('repeat-start', value);
    }

    get ending(): number[] | null {
      return parseEnding(this.getAttribute('ending'));
    }

    set ending(value: readonly number[] | null) {
      if (value === null) {
        this.removeAttribute('ending');
      } else {
        this.setAttribute('ending', value.join(','));
      }
    }

    get endingLabel(): string | null {
      return this.getAttribute('ending-label');
    }

    set endingLabel(value: string | null) {
      if (value === null) {
        this.removeAttribute('ending-label');
      } else {
        this.setAttribute('ending-label', value);
      }
    }

    // What this bar draws of an ending bracket, set by <music-composition>
    // (a standalone measure builds its own from its attributes).
    get endingSegment(): EndingSegment | null {
      return this.#endingSegment;
    }

    set endingSegment(value: EndingSegment | null) {
      this.applyEndingSegment(value);
    }

    #endingSegment: EndingSegment | null = null;

    /**
     * Sets this bar's ending segment, draws it, and reserves room for it on
     * the top staff. Returns whether the staff's margin changed.
     */
    applyEndingSegment(segment: EndingSegment | null): boolean {
      if (!sameEndingSegment(this.#endingSegment, segment)) {
        this.#endingSegment = segment === null ? null : { ...segment };
      }
      const changed = this.#reserveEndingSpace();
      // Redrawn every pass: the bar's width follows its row.
      this.#renderEnding();
      return changed;
    }

    // The bar's displayed number in place of `number` (e.g. "19a"), set by
    // <music-composition> for duplicate ending numbering.
    get numberLabel(): string | null {
      return this.#numberLabel;
    }

    set numberLabel(value: string | null) {
      if (this.#numberLabel === value) {
        return;
      }
      this.#numberLabel = value;
      this.refreshMeasureNumberDisplay();
    }

    #numberLabel: string | null = null;

    // Shows this bar's number whatever the `measure-numbers` rule says (an
    // ending bar), unless that rule is `none`. Set by <music-composition>.
    get forceNumberDisplay(): boolean {
      return this.#forceNumberDisplay;
    }

    set forceNumberDisplay(value: boolean) {
      if (this.#forceNumberDisplay === value) {
        return;
      }
      this.#forceNumberDisplay = value;
      this.refreshMeasureNumberDisplay();
    }

    #forceNumberDisplay = false;

    get keySig(): string {
      return this.getAttribute(COMMON_ATTRIBUTES.KEY_SIG) ?? 'C';
    }

    set keySig(value: string) {
      this.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, value);
    }

    get mode(): string {
      return this.getAttribute(COMMON_ATTRIBUTES.MODE) ?? 'major';
    }

    set mode(value: string) {
      this.setAttribute(COMMON_ATTRIBUTES.MODE, value);
    }

    get time(): string | null {
      return this.getAttribute(COMMON_ATTRIBUTES.TIME);
    }

    set time(value: string) {
      this.setAttribute(COMMON_ATTRIBUTES.TIME, value);
    }

    // Registration order is dispatch order for a shared event: beams redraw
    // before connectors and dynamics, which read the drawn beams. One list
    // serves both add and remove, so the two can't drift apart.
    #listeners(): [string, EventListener][] {
      return [
        [STAFF_EVENTS.STAFF_MIN_WIDTH, this.#onStaffMinWidth],
        // A staff's resize re-runs #spaceElements() without STAFF_MIN_WIDTH,
        // resetting a cross-staff rest's style.left, so its stem-avoidance
        // nudge needs this event too.
        [STAFF_EVENTS.NOTES_POSITIONED, this.#boundRedrawDoubleStemmedBeams],
        [STAFF_EVENTS.NOTES_POSITIONED, this.#boundRedrawCrossStaffTremolos],
        [TREMOLO_EVENTS.ATTRIBUTE_CHANGE, this.#boundRedrawCrossStaffTremolos],
        [STAFF_EVENTS.NOTES_POSITIONED, this.#boundRedrawCrossStaffTuplets],
        [TUPLET_EVENTS.ATTRIBUTE_CHANGE, this.#boundRedrawCrossStaffTuplets],
        [STAFF_EVENTS.NOTES_POSITIONED, this.#boundRedrawMeasureDynamics],
        [TUPLET_EVENTS.ATTRIBUTE_CHANGE, this.#boundRedrawMeasureDynamics],
        [
          STAFF_EVENTS.VERTICAL_SPACE_CHANGE,
          this.#boundLayoutSystemDecorations,
        ],
        [STAFF_EVENTS.NOTES_POSITIONED, this.#boundSyncBarlineSlots],
        // Registered after the beams listener above: a slur reads the drawn
        // beam polygon to avoid crossing it, so connectors redraw after beams.
        [STAFF_EVENTS.NOTES_POSITIONED, this.#boundRedrawConnectors],
        [STAFF_EVENTS.NOTES_POSITIONED, this.#boundRedrawSharedStems],
        [STAFF_EVENTS.NOTES_POSITIONED, this.#boundRefreshGroupBarlines],
        [
          STAFF_EVENTS.GROUP_ATTRIBUTE_CHANGE,
          this.#boundUpdateConnectorVisibility,
        ],
        [STAFF_EVENTS.TAB_LINK_ATTRIBUTE_CHANGE, this.#boundSyncMarkerBeats],
        [
          STAFF_EVENTS.LABEL_ATTRIBUTE_CHANGE,
          this.#boundUpdateConnectorVisibility,
        ],
        [NOTE_EVENTS.ARPEGGIO_ATTRIBUTE_CHANGE, this.#boundRedrawArpeggios],
        [NOTE_EVENTS.CONNECTOR_ATTRIBUTE_CHANGE, this.#boundRedrawConnectors],
        [
          NOTE_EVENTS.DYNAMIC_ATTRIBUTE_CHANGE,
          this.#boundRedrawMeasureDynamics,
        ],
        [
          NOTE_EVENTS.BEAM_GROUP_ATTRIBUTE_CHANGE,
          this.#boundRedrawDoubleStemmedBeams,
        ],
        [
          NOTE_EVENTS.BEAM_GROUP_ATTRIBUTE_CHANGE,
          this.#boundRedrawMeasureDynamics,
        ],
        // Registered after the beams listener above, for the same reason as
        // the NOTES_POSITIONED pair — a beam-group membership change can
        // change which beam (if any) a slur needs to avoid, or whether its
        // two endpoints now share a resolved group at all.
        [NOTE_EVENTS.BEAM_GROUP_ATTRIBUTE_CHANGE, this.#boundRedrawConnectors],
        [
          NOTE_EVENTS.REST_STAFF_SIDE_ATTRIBUTE_CHANGE,
          this.#boundRedrawDoubleStemmedBeams,
        ],
        // The staff redraws its octave signs first (it sits nearer the note
        // the event bubbles from); the beam and gap decorations then step
        // around the new ones.
        [NOTE_EVENTS.OCTAVE_ATTRIBUTE_CHANGE, this.#boundRedrawGapPasses],
        [
          NOTE_EVENTS.REST_STAFF_SIDE_ATTRIBUTE_CHANGE,
          this.#boundRedrawMeasureDynamics,
        ],
        [
          NOTE_EVENTS.SHARED_STEM_ATTRIBUTE_CHANGE,
          this.#boundRedrawSharedStems,
        ],
      ];
    }

    connectedCallback(): void {
      this.render();
      // A measure placed directly in a shadow root has no parentElement.
      const parent =
        this.parentElement ??
        (this.parentNode instanceof ShadowRoot ? this.parentNode.host : null);
      if (parent !== null) {
        this.#staffConnectorObserver.observe(parent);
      }
      for (const [type, listener] of this.#listeners()) {
        this.addEventListener(type, listener);
      }
    }

    disconnectedCallback(): void {
      this.#staffConnectorObserver.disconnect();
      for (const [type, listener] of this.#listeners()) {
        this.removeEventListener(type, listener);
      }
      this.#staffWidths.clear();
    }

    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null
    ): void {
      if (oldValue !== newValue) {
        if (name === 'ending' && newValue !== null && this.ending === null) {
          console.warn(
            `[music-measure] ending="${newValue}" isn't a list of positive bar passes like "1" or "1,2"; it is ignored`
          );
        }
        if (
          name === 'barline' ||
          name === 'repeat-start' ||
          name === 'ending' ||
          name === 'ending-label'
        ) {
          if (this.isConnected) {
            this.#pushBarlinesToStaves();
            this.#applyStandaloneEnding();
            this.dispatchEvent(
              new CustomEvent(MEASURE_EVENTS.REPEAT_ATTRIBUTE_CHANGE, {
                bubbles: true,
                composed: true,
              })
            );
          }
          return;
        }
        if (
          this.isConnected &&
          (name === COMMON_ATTRIBUTES.KEY_SIG ||
            name === COMMON_ATTRIBUTES.MODE ||
            name === COMMON_ATTRIBUTES.TIME)
        ) {
          Array.from(this.querySelectorAll(STAFF_TAGS)).forEach((staff) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duck-typed call to avoid cross-module import, as composition.ts does
            (staff as any).refreshInheritedAttrs?.();
          });
        }
        this.render();
        // render() replaced the shadow DOM, so the connector overlays are now
        // empty while the paired arpeggio endpoints stay locally suppressed.
        // A `number` change triggers no staff relayout or arpeggio event, so
        // nothing else redraws them — do it here.
        if (this.isConnected) {
          this.#updateConnectorVisibility();
        }
      }
    }

    private render(): void {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constructor attaches the shadow root
      this.shadowRoot!.innerHTML = `
        <style>
          :host {
            display: block;
            flex: ${EMPTY_MEASURE_FLEX_BASIS_PX} 1 ${EMPTY_MEASURE_FLEX_BASIS_PX}px;
            min-width: ${MEASURE_MIN_WIDTH_PX}px;
            box-sizing: border-box;
            position: relative;
          }

          :host(.has-group-connector) {
            --measure-decoration-width: ${Math.max(
              BRACE_WIDTH_PX + BRACE_STAFF_GAP_PX,
              BRACKET_WIDTH_PX
            )}px;
          }

          :host(.has-staff-label) {
            --measure-decoration-width: ${
              STAFF_LABEL_WIDTH_PX + STAFF_LABEL_LEFT_MARGIN_PX
            }px;
          }

          /* Combined reservation is summed, not jointly tuned — a v1
             simplification when a measure has both a brace/bracket and a
             staff label (see packages/web-components/CLAUDE.md). */
          :host(.has-group-connector.has-staff-label) {
            --measure-decoration-width: ${
              Math.max(BRACE_WIDTH_PX + BRACE_STAFF_GAP_PX, BRACKET_WIDTH_PX) +
              STAFF_LABEL_WIDTH_PX +
              STAFF_LABEL_LEFT_MARGIN_PX
            }px;
          }

          :host(.has-group-connector),
          :host(.has-staff-label) {
            margin-left: var(--measure-decoration-width);
          }

          /* A one-column grid so staves' vertical-space margins add up
             instead of collapsing. Not a flex column: a staff's flex basis
             would become its height. */
          .measure-content {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
          }

          .staff-labels {
            position: absolute;
            inset: 0;
            pointer-events: none;
          }

          .staff-labels > * {
            position: absolute;
            width: ${STAFF_LABEL_WIDTH_PX}px;
            text-align: right;
            font-size: ${STAFF_LABEL_FONT_SIZE}px;
            font-style: italic;
            transform: translateY(-50%);
            white-space: nowrap;
            color: currentColor;
          }

          .measure-numbers {
            position: absolute;
            inset: 0;
            pointer-events: none;
          }

          .measure-numbers > * {
            position: absolute;
            left: 0;
            top: ${MEASURE_NUMBER_TOP_PX - MEASURE_NUMBER_BOTTOM_MARGIN_PX}px;
            font-size: ${MEASURE_NUMBER_FONT_SIZE}px;
            transform: translateY(-100%);
            white-space: nowrap;
            color: currentColor;
          }

          .staff-connector {
            position: absolute;
            left: 0;
            width: 1px;
            background-color: currentColor;
            z-index: 5;
            opacity: 1;
            transition: opacity 0.3s;
          }

          .staff-connector.hidden {
            opacity: 0;
          }

          .group-barlines {
            position: absolute;
            inset: 0;
            pointer-events: none;
          }

          .group-barlines > * {
            position: absolute;
            background-color: currentColor;
          }

          .group-connectors {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: visible;
            color: currentColor;
          }

          .group-connectors > * {
            position: absolute;
          }

          /* An svg with no size of its own is 300 x 150px, which would make
             the page scroll past a narrow bar at the end of a row. */
          .measure-content > svg {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: visible;
            color: currentColor;
          }
        </style>
        <div class="measure-content">
          <div class="staff-connector"></div>
          <div class="group-connectors"></div>
          <div class="staff-labels"></div>
          <!-- barlines between the staves of a brace or bracket; first, so
               everything else in the gap is drawn over them -->
          <div class="group-barlines"></div>
          <!-- must be <svg>: holds <g> arpeggio-sign nodes that share this
               element's coordinate space; inset:0 aligns that space 1:1 with
               the measure box so #redrawArpeggios can position with raw px -->
          <svg class="arpeggio-connectors"></svg>
          <!-- ties/slurs/etc. across this measure's own staves — only draws
               when this measure has no <music-composition> ancestor (that
               case is composition.ts's own #redrawConnectors); see
               staffBase.ts#drawConnectorsWhenStandalone's escalation -->
          <svg class="connectors-overlay"></svg>
          <!-- dynamic-shared markings and hairpins, centered between two
               sibling staves — see #redrawMeasureDynamics -->
          <svg class="shared-dynamics-overlay"></svg>
          <!-- the shared beam polygon for a cross-staff double-stemmed
               group, spanning both staves' gap — see
               #redrawDoubleStemmedBeams -->
          <svg class="double-stemmed-beams-overlay"></svg>
          <!-- a tremolo-group's beams, between the hands — see
               #redrawCrossStaffTremolos -->
          <svg class="cross-staff-tremolos-overlay"></svg>
          <!-- a tuplet-group bracket centred in the gap between the hands —
               see #redrawCrossStaffTuplets -->
          <svg class="cross-staff-tuplets-overlay"></svg>
          <!-- the real connecting stem for a shared-stem-for pair — see
               #redrawSharedStems -->
          <svg class="shared-stems-overlay"></svg>
          <!-- This measure's own number, shown per the ancestor
               music-composition element's measure-numbers policy — see
               #renderMeasureNumber. Absolutely positioned (like every other
               overlay above) so it never participates in normal flow; an
               earlier inline-span version of this shifted the brace/
               bracket/label position by changing flow height (see
               packages/web-components/CLAUDE.md) — this shape can't repeat
               that, since none of these overlays affect :host size. -->
          <div class="measure-numbers"></div>
          <!-- this bar's piece of a first-/second-time ending bracket — see
               #renderEnding -->
          <svg class="endings-overlay"></svg>
          <slot></slot>
        </div>
      `;
    }

    #updateConnectorVisibility() {
      const staffConnector =
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- render() always creates .staff-connector before this runs
        this.shadowRoot!.querySelector<HTMLElement>('.staff-connector')!;
      const allMeasures = Array.from(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- observer only runs while connected, so parentNode exists
        this.parentNode!.querySelectorAll(MUSIC_MEASURE)
      );

      const currentIndex = allMeasures.indexOf(this);
      const isFirstInRow = this.#isFirstInRow(allMeasures, currentIndex);
      const isLastInRow = this.#isLastInRow(allMeasures, currentIndex);
      this.#firstInRow = isFirstInRow;

      this.#layoutSystemDecorations();
      this.#renderMeasureNumber(isFirstInRow, isLastInRow);
      staffConnector.classList.toggle('hidden', !isFirstInRow);
      this.#redrawArpeggios();
      this.#redrawDoubleStemmedBeams();
      this.#redrawCrossStaffTremolos();
      this.#redrawCrossStaffTuplets();
      this.#redrawMeasureDynamics();
      this.#redrawConnectors();
    }

    // Last value #updateConnectorVisibility resolved — reused when only a
    // staff's margin moved (#boundLayoutSystemDecorations), which can't
    // change which row this measure starts. Null until first resolved.
    #firstInRow: boolean | null = null;

    // The barline, brace/bracket and staff labels, positioned against each
    // staff's real lines (#staffLineBands).
    #layoutSystemDecorations() {
      if (this.#firstInRow === null) {
        return;
      }
      const staffConnector =
        this.shadowRoot?.querySelector<HTMLElement>('.staff-connector');
      const staves = Array.from(this.children).filter((n) =>
        isStaffNodeName(n.nodeName)
      ) as StaffElementBaseType[];
      if (staffConnector && staves.length > 0) {
        const bands = this.#staffLineBands(staves);
        const top = bands[0].top;
        staffConnector.style.top = `${top}px`;
        staffConnector.style.height = `${
          bands[bands.length - 1].bottom - top
        }px`;
      }
      this.#renderGroupConnectors(this.#firstInRow);
      this.#renderStaffLabels(this.#firstInRow);
      this.refreshGroupBarlines();
      this.#renderEnding();
    }

    #topStaff(): StaffElementBaseType | null {
      return (
        (Array.from(this.children).find((n) => isStaffNodeName(n.nodeName)) as
          | StaffElementBaseType
          | undefined) ?? null
      );
    }

    // A standalone measure is its own ending: labelled, with a left hook, and
    // a right hook when its own barline closes it.
    #applyStandaloneEnding(): void {
      if (this.closest(MUSIC_COMPOSITION) !== null) {
        return;
      }
      const ending = this.ending;
      if (ending === null) {
        this.applyEndingSegment(null);
        return;
      }
      const { barline } = resolveEndBarline({
        authored: this.barline,
        fine: false,
        jump: false,
      });
      const [segment] = resolveEndingSegments(
        resolveEndings([{ ending, endBarline: barline }]).groups,
        new Map(
          this.endingLabel === null ? [] : [[0, this.endingLabel] as const]
        )
      ).values();
      this.applyEndingSegment(segment ?? null);
    }

    // The bracket line sits at a fixed spot near the measure's top, like the
    // number below it, so every bracket in a row is level; the top staff
    // takes enough margin to keep its ink clear of both.
    #reserveEndingSpace(): boolean {
      const staff = this.#topStaff();
      if (
        staff === null ||
        typeof staff.reserveDecorationSpace !== 'function'
      ) {
        return false;
      }
      if (this.#endingSegment === null) {
        return staff.reserveDecorationSpace(ENDING_SOURCE, {
          top: 0,
          bottom: 0,
        });
      }
      const lineAboveBox =
        this.#staffContainerRect(staff).top - staff.getBoundingClientRect().top;
      const lineY = endingStaffLineY({
        inkAboveLine: staff.inkAboveTopLine,
        labelled: this.#endingSegment.label !== null,
        numberBottomY:
          this.#displayedNumber() === null ? null : NUMBER_BOTTOM_Y,
      });
      return staff.reserveDecorationSpace(ENDING_SOURCE, {
        top: Math.max(0, Math.ceil(lineY - lineAboveBox)),
        bottom: 0,
      });
    }

    #renderEnding(): void {
      const overlay =
        this.shadowRoot?.querySelector<SVGSVGElement>('.endings-overlay');
      if (!overlay) {
        return;
      }
      overlay.replaceChildren();
      const segment = this.#endingSegment;
      const staff = this.#topStaff();
      if (segment === null || staff === null || !this.isConnected) {
        return;
      }
      const origin = this.getBoundingClientRect().left + this.clientLeft;
      const rect = this.#staffContainerRect(staff);
      const left = rect.left - origin;
      const allMeasures = Array.from(
        this.parentNode?.querySelectorAll(MUSIC_MEASURE) ?? [this]
      );
      const startsRow = this.#isFirstInRow(
        allMeasures,
        allMeasures.indexOf(this)
      );
      const x1 =
        left +
        (startsRow ? staff.ownNotesStartX : 0) +
        (segment.leftHook ? ENDING_INSET_PX : 0);
      const x2 =
        rect.right - origin - (segment.endsEnding ? ENDING_INSET_PX : 0);
      overlay.appendChild(
        createEndingSegmentSvg({
          x1,
          x2,
          y: ENDING_LINE_Y_PX,
          leftHook: segment.leftHook,
          rightHook: segment.rightHook,
          label: segment.label,
          labelIsText: segment.labelIsText,
        })
      );
    }

    #isFirstInRow(allMeasures: Element[], currentIndex: number): boolean {
      if (currentIndex === 0) {
        return true;
      }

      const prevMeasure = allMeasures[currentIndex - 1];
      if (!prevMeasure) {
        return false;
      }

      const prevRect = prevMeasure.getBoundingClientRect();
      const currentRect = this.getBoundingClientRect();

      // Tolerance of 5px for rounding errors
      return Math.abs(currentRect.top - prevRect.top) > 5;
    }

    #isLastInRow(allMeasures: Element[], currentIndex: number): boolean {
      if (currentIndex === allMeasures.length - 1) {
        return true;
      }

      const nextMeasure = allMeasures[currentIndex + 1];
      if (!nextMeasure) {
        return true;
      }

      const nextRect = nextMeasure.getBoundingClientRect();
      const currentRect = this.getBoundingClientRect();

      // Tolerance of 5px for rounding errors
      return Math.abs(currentRect.top - nextRect.top) > 5;
    }

    // A cross-staff arpeggio is drawn here, since a staff's SVG can't reach
    // across the gap; the paired elements' own signs are suppressed.
    //
    // `reReserveSpanEnds` (attribute changes only; the STAFF_MIN_WIDTH path
    // would loop): a hairpin change on one end changes the other end's
    // reserved footprint, so both ends re-space.
    #redrawArpeggios(reReserveSpanEnds = false) {
      const overlay = this.shadowRoot?.querySelector<SVGSVGElement>(
        '.arpeggio-connectors'
      );
      if (!overlay) {
        return;
      }
      while (overlay.firstChild) {
        overlay.removeChild(overlay.firstChild);
      }

      const staves = Array.from(this.children).filter((el) =>
        isStaffNodeName(el.nodeName)
      ) as StaffElementBaseType[];
      // `:defined` skips not-yet-upgraded custom elements — writing our internal
      // properties on those would create shadowing own data properties.
      const elementSelector = `${loneNoteSelector(':defined')}, ${chordSelector(
        ':defined'
      )}`;
      const perStaffElements = staves.map(
        (staff) =>
          Array.from(
            staff.querySelectorAll(elementSelector)
          ) as NoteOrChordElementType[]
      );

      const entries: ArpeggioEntry[] = [];
      perStaffElements.forEach((elements, staffIndex) => {
        elements.forEach((element, entryIndex) => {
          if (element.arpeggio === null && element.arpeggioFor === null) {
            return;
          }
          entries.push({
            staffIndex,
            entryIndex,
            id: element.getAttribute('id'),
            arpeggio: element.arpeggio,
            arpeggioFor: element.arpeggioFor,
          });
        });
      });

      const { spans, warnings } = resolveArpeggioSpans(entries);
      for (const warning of warnings) {
        console.warn(`[music-measure] ${warning}`);
      }

      const spanned = new Set<NoteOrChordElementType>();
      // Nudged after the loop: a re-space synchronously re-runs this method.
      const endsToReReserve: NoteOrChordElementType[] = [];
      for (const span of spans) {
        const upper =
          perStaffElements[span.upper.staffIndex]?.[span.upper.entryIndex];
        const lower =
          perStaffElements[span.lower.staffIndex]?.[span.lower.entryIndex];
        if (!upper || !lower) {
          continue;
        }
        spanned.add(upper);
        spanned.add(lower);
        upper.renderArpeggioSign = false;
        lower.renderArpeggioSign = false;

        if (reReserveSpanEnds) {
          endsToReReserve.push(upper, lower);
        }

        const measureRect = this.getBoundingClientRect();
        const upperHeads = this.#headRects(upper);
        const lowerHeads = this.#headRects(lower);
        if (upperHeads.length === 0 || lowerHeads.length === 0) {
          continue;
        }
        const topY =
          Math.min(...upperHeads.map((r) => r.top + r.height / 2)) -
          measureRect.top;
        const bottomY =
          Math.max(...lowerHeads.map((r) => r.top + r.height / 2)) -
          measureRect.top;
        const rightEdgeX =
          Math.min(
            ...upperHeads.map((r) => r.left),
            ...lowerHeads.map((r) => r.left)
          ) -
          measureRect.left -
          ARPEGGIO_CHORD_GAP_PX;

        const sign = createArpeggioSvg({
          arpeggio: span.arpeggio,
          topY,
          bottomY,
          rightEdgeX,
        });
        if (sign) {
          sign.classList.add('arpeggio-connector');
          overlay.appendChild(sign);
        }

        // One continuous dynamic-change hairpin through both staves, left of
        // the wave — read off whichever end carries `arpeggio-hairpin`.
        const hairpinHost =
          upper.arpeggioHairpin !== null
            ? upper
            : lower.arpeggioHairpin !== null
            ? lower
            : null;
        if (hairpinHost !== null) {
          const wrap = document.createElementNS(SVG_NS, 'g');
          wrap.classList.add('arpeggio-hairpin-connector');
          appendArpeggioHairpin(wrap, {
            kind: hairpinHost.arpeggioHairpin as HairpinKind,
            from: hairpinHost.arpeggioHairpinFrom,
            to: hairpinHost.arpeggioHairpinTo,
            arpeggio: span.arpeggio,
            topY,
            bottomY,
            signRightEdgeX: rightEdgeX,
          });
          overlay.appendChild(wrap);
        }
      }

      // Restore the local sign on any arpeggio element no longer in a span
      // (e.g. an `arpeggio-for` was removed).
      for (const elements of perStaffElements) {
        for (const element of elements) {
          if (
            (element.arpeggio !== null || element.arpeggioFor !== null) &&
            !spanned.has(element)
          ) {
            element.renderArpeggioSign = true;
          }
        }
      }

      // Each re-space re-runs this method without `reReserveSpanEnds`, which
      // settles.
      for (const end of endsToReReserve) {
        end.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.NOTE_Y_CHANGE, {
            bubbles: true,
            composed: true,
          })
        );
      }
    }

    #headRects(element: NoteOrChordElementType): DOMRect[] {
      const heads = element.shadowRoot?.querySelectorAll('.head');
      return heads ? Array.from(heads, (h) => h.getBoundingClientRect()) : [];
    }

    // `.staff-container`'s borders are the outer staff lines; the staff's
    // outer box includes padding, so it can't measure the gap between staves.
    #staffContainerRect(staff: StaffElementBaseType): DOMRect {
      return (
        staff.shadowRoot
          ?.querySelector('.staff-container')
          ?.getBoundingClientRect() ?? staff.getBoundingClientRect()
      );
    }

    // Each staff's outer lines (top of its top line, bottom of its bottom
    // line) in this host's absolute-positioning frame — its padding box,
    // since :host is position: relative.
    #staffLineBands(
      staves: readonly StaffElementBaseType[]
    ): { top: number; bottom: number }[] {
      const origin = this.getBoundingClientRect().top + this.clientTop;
      return staves.map((staff) => {
        const rect = this.#staffContainerRect(staff);
        return { top: rect.top - origin, bottom: rect.bottom - origin };
      });
    }

    // A beam-hugging rest's glyph Y (measure-relative): REST_BEAM_CLEARANCE_PX
    // past the beam, pulled back toward it (to at least BEAM_GAP_PX) when that
    // would come within MIN_REST_NOTE_CLEARANCE_PX of a notehead beyond.
    #restHuggingTargetY(
      side: 'above' | 'below',
      beamTopYReal: number,
      nearestHeadRect: DOMRect | null
    ): number {
      const dir = side === 'below' ? 1 : -1;
      const beamEdgeReal =
        side === 'below' ? beamTopYReal + BEAM_THICKNESS_PX : beamTopYReal;
      const preferredReal = beamEdgeReal + dir * REST_BEAM_CLEARANCE_PX;
      if (!nearestHeadRect) {
        return preferredReal;
      }
      const beamBoundReal = beamEdgeReal + dir * BEAM_GAP_PX;
      const headNearEdgeReal =
        dir === 1 ? nearestHeadRect.top : nearestHeadRect.bottom;
      const noteBoundReal = headNearEdgeReal - dir * MIN_REST_NOTE_CLEARANCE_PX;
      return dir === 1
        ? Math.max(beamBoundReal, Math.min(preferredReal, noteBoundReal))
        : Math.min(beamBoundReal, Math.max(preferredReal, noteBoundReal));
    }

    // Pushes y out of [bandTop, bandBottom] by the nearer edge, clamped to
    // [minY, maxY].
    #pushYClearOfBand(
      y: number,
      bandTop: number,
      bandBottom: number,
      minY: number,
      maxY: number
    ): number {
      if (y < bandTop || y > bandBottom) {
        return y;
      }
      const pushUp = Math.max(minY, bandTop);
      const pushDown = Math.min(maxY, bandBottom);
      return Math.abs(y - pushUp) <= Math.abs(pushDown - y) ? pushUp : pushDown;
    }

    // A "centered" rest's Y: the gap's centre, pushed clear of the (possibly
    // sloped) beam at its x and then of the nearest notehead, kept in the gap.
    #restCenteredTargetY(
      gapCenterReal: number,
      topGapEdgeReal: number,
      bottomGapEdgeReal: number,
      beamTopYAtXReal: number,
      beamBottomYAtXReal: number,
      nearestHeadRect: DOMRect | null
    ): number {
      const clearOfBeam = this.#pushYClearOfBand(
        gapCenterReal,
        beamTopYAtXReal - REST_BEAM_CLEARANCE_PX,
        beamBottomYAtXReal + REST_BEAM_CLEARANCE_PX,
        topGapEdgeReal,
        bottomGapEdgeReal
      );
      if (!nearestHeadRect) {
        return clearOfBeam;
      }
      return this.#pushYClearOfBand(
        clearOfBeam,
        nearestHeadRect.top - MIN_REST_NOTE_CLEARANCE_PX,
        nearestHeadRect.bottom + MIN_REST_NOTE_CLEARANCE_PX,
        topGapEdgeReal,
        bottomGapEdgeReal
      );
    }

    // The rendered stem's rect, or null when stemless.
    #stemRect(element: NoteOrChordElementType): DOMRect | null {
      const stem = element.shadowRoot?.querySelector('.stem');
      return stem ? stem.getBoundingClientRect() : null;
    }

    // Connectors for a standalone measure, same-staff and cross-staff. A
    // <music-composition> ancestor draws them instead.
    #redrawConnectors() {
      if (this.closest(MUSIC_COMPOSITION)) {
        this.#verticalSpace.release(OVERLAY_SOURCE);
        return;
      }

      const overlay = this.shadowRoot?.querySelector<SVGSVGElement>(
        '.connectors-overlay'
      );
      if (!overlay) {
        return;
      }
      while (overlay.firstChild) {
        overlay.removeChild(overlay.firstChild);
      }

      const { pairs } = collectConnectorPairs(this);
      if (pairs.length === 0) {
        this.#reserveOverlaySpace(overlay);
        return;
      }

      const rootRect = this.getBoundingClientRect();

      // Double-stemmed beam-group awareness: a slur whose endpoints share a
      // resolved group is placed over that group's two staves, an
      // inner-voice member anchors its own end at its stem, and same-staff
      // slurs avoid the real beam polygons. Shared with composition.ts's own
      // #redrawConnectors. #redrawDoubleStemmedBeams already logged the
      // warnings this cycle.
      const { beamRects, elementToGroup, innerVoiceStemAnchorElements } =
        resolveDoubleStemmedBeamConnectorContext([this], rootRect);

      const svgs = buildConnectorSvgs(pairs, {
        rootRect,
        rowLeftOf: () => 0,
        beamRects,
        groupSlurStaves: resolveSlurGroupPlacement(pairs, elementToGroup),
        innerVoiceElements: innerVoiceStemAnchorElements,
        entryObstacles: collectEntryObstacles(this, rootRect, [this]),
      });
      for (const svg of svgs) {
        overlay.appendChild(svg);
      }
      this.#reserveOverlaySpace(overlay);
    }

    // A standalone measure grows its own margin so a connector rising above
    // or dipping below it stays on the page; inside a composition the
    // composition reserves per row instead. The overlay moves with this host,
    // so no redraw is needed afterward.
    #reserveOverlaySpace(overlay: SVGSVGElement): void {
      const rect = this.getBoundingClientRect();
      const [overflow] = computeBandOverflow(
        [{ top: rect.top, bottom: rect.bottom }],
        measureVerticalExtents(overlay, '.connector path'),
        VERTICAL_OVERFLOW_CLEARANCE_PX
      );
      this.#verticalSpace.reserve(OVERLAY_SOURCE, overflow);
    }

    // Dynamics that need both staves' geometry: `dynamic-shared` markings and
    // hairpins (both hands) centred in the gap between two staves, clear of
    // every beam. Runs after beams and cross-staff tuplets, whose drawn shapes
    // it avoids, and before connectors; composition.ts skips the same-measure
    // pairs drawn here. Placement is decided first and pushed onto each staff
    // (crossStaffDynamicsOverrides) so it stops drawing what moves here; a
    // forced side re-lays that staff out, so the plan is resolved again from
    // fresh geometry before drawing.
    #redrawMeasureDynamics() {
      this.#guardedRedraw('measure dynamics', () =>
        this.#redrawMeasureDynamicsImpl()
      );
    }

    #redrawMeasureDynamicsImpl() {
      const overlay = this.shadowRoot?.querySelector<SVGSVGElement>(
        '.shared-dynamics-overlay'
      );
      if (!overlay) {
        return;
      }
      const staves = (
        Array.from(this.children).filter((el) =>
          isStaffNodeName(el.nodeName)
        ) as StaffElementBaseType[]
      ).filter(
        (staff): staff is ClassicalStaffElement =>
          typeof (staff as Partial<ClassicalStaffElement>)
            .hairpinDefaultsForMeasure === 'function'
      );

      this.#pushDynamicsOverrides(staves, this.#planMeasureDynamics(staves));
      const plan = this.#planMeasureDynamics(staves);
      this.#pushDynamicsOverrides(staves, plan);

      overlay.replaceChildren();
      for (const hairpin of plan.hairpins) {
        overlay.appendChild(
          hairpin.angled
            ? createAngledHairpinSvg(hairpin.kind, hairpin.start, hairpin.end)
            : createHairpinSvg(
                hairpin.kind,
                hairpin.start.x,
                hairpin.end.x,
                hairpin.start.y
              )
        );
      }
      for (const marking of plan.markings) {
        overlay.appendChild(
          createDynamicMarkingSvg(marking.marking, marking.centerX, marking.y, {
            bracketed: marking.bracketed,
          })
        );
        if (marking.text) {
          overlay.appendChild(
            createDynamicTextSvg(
              marking.text,
              marking.marking,
              marking.centerX,
              marking.y,
              { bracketed: marking.bracketed }
            )
          );
        }
      }
      const rect = this.getBoundingClientRect();
      const [overflow] = computeBandOverflow(
        [{ top: rect.top, bottom: rect.bottom }],
        measureVerticalExtents(overlay, '.hairpin path, .dynamic-marking'),
        VERTICAL_OVERFLOW_CLEARANCE_PX
      );
      this.#verticalSpace.reserve(MEASURE_DYNAMICS_SOURCE, overflow);
    }

    #pushDynamicsOverrides(
      staves: readonly ClassicalStaffElement[],
      plan: MeasureDynamicsPlan
    ) {
      for (const staff of staves) {
        staff.crossStaffDynamicsOverrides = plan.overrides.get(staff) ?? null;
      }
    }

    #planMeasureDynamics(
      staves: readonly ClassicalStaffElement[]
    ): MeasureDynamicsPlan {
      const plan: MeasureDynamicsPlan = {
        overrides: new Map(),
        hairpins: [],
        markings: [],
      };
      if (staves.length < 2) {
        return plan;
      }

      const measureRect = this.getBoundingClientRect();
      const entryObstacles = collectEntryObstacles(this, measureRect, [this], {
        excludeGlyphSelector: '.stem',
      });
      const beamSlices = entryObstacles.beamSlices;
      const obstacles: ObstacleRect[] = [
        ...entryObstacles.entries.flatMap((entry) => entry.glyphRects),
        ...entryObstacles.decorationRects,
        ...this.#crossStaffTupletRects(measureRect),
        ...staves.flatMap((staff, staffIndex) => [
          ...(staffIndex > 0
            ? this.#octaveSignRects(staff, 'above', measureRect)
            : []),
          ...(staffIndex < staves.length - 1
            ? this.#octaveSignRects(staff, 'below', measureRect)
            : []),
        ]),
      ];
      const stems = collectStemRects(this, measureRect);
      const partnerOf = (staffIndex: number) =>
        staffIndex + 1 < staves.length ? staffIndex + 1 : staffIndex - 1;
      const gapBetween = (staffIndex: number, otherIndex: number) => {
        const upper = staves[Math.min(staffIndex, otherIndex)];
        const lower = staves[Math.max(staffIndex, otherIndex)];
        return {
          topGapEdgeY: this.#staffContainerRect(upper).bottom - measureRect.top,
          bottomGapEdgeY: this.#staffContainerRect(lower).top - measureRect.top,
          belowSystemY:
            this.#staffContainerRect(lower).bottom -
            measureRect.top +
            DYNAMICS_BASELINE_Y -
            STAFF_BOTTOM_LINE_Y,
        };
      };
      const override = (
        staff: ClassicalStaffElement,
        element: NoteOrChordElementType,
        change: Partial<CrossStaffDynamicsOverride>
      ) => {
        let staffOverrides = plan.overrides.get(staff);
        if (staffOverrides === undefined) {
          staffOverrides = new Map();
          plan.overrides.set(staff, staffOverrides);
        }
        staffOverrides.set(element, {
          hairpin: null,
          marking: null,
          ...staffOverrides.get(element),
          ...change,
        });
      };
      const textCenterX = (
        element: NoteOrChordElementType,
        marking: DynamicMarking,
        awayDirection: -1 | 1,
        gap: { topGapEdgeY: number; bottomGapEdgeY: number }
      ) => {
        const bracketed = element.dynamicReminder;
        const heads = this.#headRects(element);
        const rect = element.getBoundingClientRect();
        const centerX =
          heads.length === 0
            ? rect.left + rect.width / 2 - measureRect.left
            : heads.reduce((sum, r) => sum + r.left + r.width / 2, 0) /
                heads.length -
              measureRect.left;
        return dynamicTextCenterClearOfStems(
          centerX,
          marking,
          stems,
          gap,
          awayDirection,
          bracketed,
          element.dynamicText ?? null
        );
      };
      const leftX = (element: NoteOrChordElementType) =>
        element.getBoundingClientRect().left - measureRect.left;
      // A swell's `dynamic-end`, from viewport px to this measure's.
      const measureEndText = (
        text: HairpinEndpointText | null
      ): HairpinEndpointText | null =>
        text === null
          ? null
          : { ...text, centerX: text.centerX - measureRect.left };
      const spanFor = (
        start: NoteOrChordElementType,
        end: NoteOrChordElementType,
        gap: { topGapEdgeY: number; bottomGapEdgeY: number }
      ) => {
        const startText = start.dynamic
          ? {
              marking: start.dynamic,
              bracketed: start.dynamicReminder,
              text: start.dynamicText ?? null,
              centerX: textCenterX(start, start.dynamic, -1, gap),
            }
          : null;
        const endText = end.dynamic
          ? {
              marking: end.dynamic,
              bracketed: end.dynamicReminder,
              text: end.dynamicText ?? null,
              centerX: textCenterX(end, end.dynamic, 1, gap),
            }
          : null;
        const span = computeHairpinXSpan({
          rawStartX: leftX(start),
          rawEndX: end.getBoundingClientRect().right - measureRect.left,
          startTextCenterX: startText?.centerX ?? 0,
          endTextCenterX: endText?.centerX ?? 0,
          startMarking: startText?.marking ?? null,
          endMarking: endText?.marking ?? null,
          startBracketed: startText?.bracketed,
          endBracketed: endText?.bracketed,
          startDynamicText: startText?.text ?? null,
        });
        return { startX: span.startX, endX: span.endX, startText, endText };
      };
      const placeHairpin = (
        kind: HairpinKind,
        start: HairpinPoint,
        end: HairpinPoint,
        angled: boolean
      ) => {
        plan.hairpins.push({ kind, start, end, angled });
        const [upper, lower] = hairpinWedgeEdges(
          kind,
          start,
          end,
          HAIRPIN_OPEN_HEIGHT
        );
        obstacles.push(
          ...sliceConvexPolygon(
            [upper[0], upper[1], lower[1], lower[0]],
            SLUR_BEAM_SLICE_WIDTH_PX
          )
        );
      };
      const placeText = (text: HairpinEndpointText | null, y: number) => {
        if (text !== null) {
          plan.markings.push({ ...text, y });
          obstacles.push(
            estimateDynamicTextBox(
              text.marking,
              text.centerX,
              y,
              text.bracketed,
              text.text ?? null
            )
          );
        }
      };

      const defaults = staves.map((staff) => staff.hairpinDefaultsForMeasure());
      const sharedPairs: {
        kind: HairpinKind;
        start: NoteOrChordElementType;
        end: NoteOrChordElementType;
        startStaffIndex: number;
        endStaffIndex: number;
      }[] = [];
      defaults.forEach((staffDefaults, staffIndex) => {
        for (const pair of staffDefaults.pairs) {
          if (pair.startElement.dynamicShared) {
            sharedPairs.push({
              kind: pair.kind,
              start: pair.startElement,
              end: pair.endElement,
              startStaffIndex: staffIndex,
              endStaffIndex: staffIndex,
            });
          }
        }
        const partnerIndex = partnerOf(staffIndex);
        const crossStaffPairs = pairSharedHairpinsAcrossStaves(
          staffDefaults.unpairedStarts
            .filter((start) => start.element.dynamicShared)
            .map((start) => ({ ...start, x: leftX(start.element) })),
          defaults[partnerIndex].orphanEnds.map((end) => ({
            ...end,
            x: leftX(end.element),
          }))
        );
        for (const { start, end } of crossStaffPairs) {
          sharedPairs.push({
            kind: start.kind,
            start: start.element,
            end: end.element,
            startStaffIndex: staffIndex,
            endStaffIndex: partnerIndex,
          });
        }
      });

      const placedEndpoints = new Set<NoteOrChordElementType>();
      // A shared hairpin leaving this measure is drawn, with its shared
      // dynamics, by composition.ts#redrawHairpins.
      if (this.closest(MUSIC_COMPOSITION) !== null) {
        const pairedHere = new Set(
          sharedPairs.flatMap((pair) => [pair.start, pair.end])
        );
        for (const staffDefaults of defaults) {
          for (const endpoint of [
            ...staffDefaults.unpairedStarts,
            ...staffDefaults.orphanEnds,
          ]) {
            if (
              endpoint.element.dynamicShared &&
              !pairedHere.has(endpoint.element)
            ) {
              placedEndpoints.add(endpoint.element);
            }
          }
        }
      }
      for (const pair of sharedPairs) {
        const gap = gapBetween(
          pair.startStaffIndex,
          pair.startStaffIndex === pair.endStaffIndex
            ? partnerOf(pair.startStaffIndex)
            : pair.endStaffIndex
        );
        const { startX, endX, startText, endText } = spanFor(
          pair.start,
          pair.end,
          gap
        );
        const y =
          resolveSharedHairpinY({
            kind: pair.kind,
            startX,
            endX,
            openHeight: HAIRPIN_OPEN_HEIGHT,
            topGapEdgeY: gap.topGapEdgeY,
            bottomGapEdgeY: gap.bottomGapEdgeY,
            beamSlices,
            obstacles,
            startText,
            endText,
          }) ?? gap.belowSystemY;

        override(staves[pair.startStaffIndex], pair.start, {
          hairpin: 'measure',
          marking: 'measure',
        });
        override(staves[pair.endStaffIndex], pair.end, { marking: 'measure' });
        placeHairpin(pair.kind, { x: startX, y }, { x: endX, y }, false);
        placedEndpoints.add(pair.start);
        placedEndpoints.add(pair.end);
        placeText(startText, y);
        placeText(endText, y);
      }

      // A shared swell over its tie chain, in the gap like a shared hairpin.
      defaults.forEach((staffDefaults, staffIndex) => {
        for (const swell of staffDefaults.swells) {
          const element = swell.element;
          if (!element.dynamicShared) {
            continue;
          }
          const gap = gapBetween(staffIndex, partnerOf(staffIndex));
          const startText = element.dynamic
            ? {
                marking: element.dynamic,
                bracketed: element.dynamicReminder,
                text: element.dynamicText ?? null,
                centerX: textCenterX(element, element.dynamic, -1, gap),
              }
            : null;
          const endText = measureEndText(swell.endText);
          const segments = resolveSwellRow({
            shape: swell.shape,
            rawStartX: leftX(element),
            endX: swell.endClientX - measureRect.left,
            midX: swell.midClientX - measureRect.left,
            centerY: 0,
            startText,
          });
          if (segments === null) {
            continue;
          }
          const y =
            resolveSharedHairpinY({
              kind: 'crescendo',
              startX: segments[0].startX,
              endX: segments[segments.length - 1].endX,
              openHeight: HAIRPIN_OPEN_HEIGHT,
              topGapEdgeY: gap.topGapEdgeY,
              bottomGapEdgeY: gap.bottomGapEdgeY,
              beamSlices,
              obstacles,
              startText,
              endText,
            }) ?? gap.belowSystemY;
          override(staves[staffIndex], element, {
            hairpin: 'measure',
            marking: 'measure',
          });
          for (const segment of segments) {
            placeHairpin(
              segment.kind,
              { x: segment.startX, y },
              { x: segment.endX, y },
              false
            );
          }
          placedEndpoints.add(element);
          placeText(startText, y);
          placeText(endText, y);
        }
      });

      // A one-hand hairpin under a double-stemmed group. Hairpins linked end
      // to start on one staff (a crescendo into a diminuendo) form a chain
      // that is placed as one. A chain whose default row sits in the gap and
      // clears every beam stays put. Otherwise the first hairpin is angled
      // through its own stave (one end outside it, the other in the gap)
      // with the rest continuing level from its gap end. If no such route
      // exists, a gap-side chain moves outside the system and an outside one
      // keeps its default row.
      const doubleStemmedSlices = this.#doubleStemmedBeamSlices();
      staves.forEach((staff, staffIndex) => {
        const partnerIndex = partnerOf(staffIndex);
        if (partnerIndex < 0) {
          return;
        }
        const staffRole = staffIndex < partnerIndex ? 'top' : 'bottom';
        const gapSide: DynamicsSide = staffRole === 'top' ? 'below' : 'above';
        const outsideSide: DynamicsSide =
          staffRole === 'top' ? 'above' : 'below';
        const gap = gapBetween(staffIndex, partnerIndex);
        const staffRect = this.#staffContainerRect(staff);
        const staffTopLineY = staffRect.top - measureRect.top;
        const staffBottomLineY = staffRect.bottom - measureRect.top;
        const partnerRect = this.#staffContainerRect(staves[partnerIndex]);
        const systemTop =
          Math.min(staffRect.top, partnerRect.top) - measureRect.top;
        const systemBottom =
          Math.max(staffRect.bottom, partnerRect.bottom) - measureRect.top;
        const groupSlices = doubleStemmedSlices.filter((slice) => {
          const middle = (slice.top + slice.bottom) / 2;
          return middle > systemTop && middle < systemBottom;
        });
        if (groupSlices.length === 0) {
          return;
        }

        const pairs = defaults[staffIndex].pairs.filter(
          (pair) => !pair.startElement.dynamicShared
        );
        const byStart = new Map(pairs.map((pair) => [pair.startElement, pair]));
        const heads = pairs.filter(
          (pair) =>
            !pairs.some((other) => other.endElement === pair.startElement)
        );
        const endpointText = (
          element: NoteOrChordElementType,
          direction: -1 | 1
        ): HairpinEndpointText | null =>
          element.dynamic === null
            ? null
            : {
                marking: element.dynamic,
                bracketed: element.dynamicReminder,
                text: element.dynamicText ?? null,
                centerX: textCenterX(element, element.dynamic, direction, gap),
              };
        // Each chain is placed as one; `handOver` and `moveOutside` set the
        // overrides for the angled route and the outside fallback.
        const chains: {
          kinds: HairpinKind[];
          spans: ReturnType<typeof resolveChainSpans>;
          side: DynamicsSide;
          baselineClientY: number;
          handOver: () => void;
          moveOutside: () => void;
        }[] = heads.map((head) => {
          const chain = [head];
          for (
            let next = byStart.get(head.endElement);
            next !== undefined && !chain.includes(next);
            next = byStart.get(next.endElement)
          ) {
            chain.push(next);
          }
          const chainElements = [
            head.startElement,
            ...chain.map((pair) => pair.endElement),
          ];
          return {
            kinds: chain.map((pair) => pair.kind),
            spans: resolveChainSpans(
              chain.map((pair) => ({
                rawStartX: leftX(pair.startElement),
                rawEndX:
                  pair.endElement.getBoundingClientRect().right -
                  measureRect.left,
              })),
              chainElements.map((element, index) =>
                endpointText(element, index === 0 ? -1 : 1)
              ),
              chain.slice(0, -1).map((pair) => {
                const rect = pair.endElement.getBoundingClientRect();
                return rect.left + rect.width / 2 - measureRect.left;
              })
            ),
            side: head.side,
            baselineClientY: head.baselineClientY,
            handOver: () => {
              override(staff, head.startElement, {
                hairpin: 'measure',
                marking: 'measure',
              });
              for (const pair of chain) {
                override(staff, pair.startElement, { hairpin: 'measure' });
                override(staff, pair.endElement, { marking: 'measure' });
              }
            },
            moveOutside: () => {
              for (const pair of chain) {
                override(staff, pair.startElement, {
                  hairpin: outsideSide,
                  marking: outsideSide,
                });
                override(staff, pair.endElement, { marking: outsideSide });
              }
            },
          };
        });
        for (const swell of defaults[staffIndex].swells) {
          const element = swell.element;
          if (element.dynamicShared) {
            continue;
          }
          const startText = endpointText(element, -1);
          const endText = measureEndText(swell.endText);
          const segments = resolveSwellRow({
            shape: swell.shape,
            rawStartX: leftX(element),
            endX: swell.endClientX - measureRect.left,
            midX: swell.midClientX - measureRect.left,
            centerY: 0,
            startText,
          });
          if (segments === null) {
            continue;
          }
          chains.push({
            kinds: segments.map((segment) => segment.kind),
            spans: segments.map((segment, index) => ({
              startX: segment.startX,
              endX: segment.endX,
              startText: index === 0 ? startText : null,
              endText: index === segments.length - 1 ? endText : null,
            })),
            side: swell.side,
            baselineClientY: swell.baselineClientY,
            handOver: () =>
              override(staff, element, {
                hairpin: 'measure',
                marking: 'measure',
              }),
            moveOutside: () =>
              override(staff, element, {
                hairpin: outsideSide,
                marking: outsideSide,
              }),
          });
        }

        for (const {
          kinds,
          spans,
          side,
          baselineClientY,
          handOver,
          moveOutside,
        } of chains) {
          const overlapsGroup = spans.some((span) =>
            groupSlices.some(
              (slice) => slice.right > span.startX && slice.left < span.endX
            )
          );
          if (!overlapsGroup) {
            continue;
          }

          const levelChainClear = (y: number, from: number) =>
            kinds.slice(from).every((kind, offset) => {
              const span = spans[from + offset];
              return isHorizontalHairpinClear({
                kind,
                startX: span.startX,
                endX: span.endX,
                y,
                openHeight: HAIRPIN_OPEN_HEIGHT,
                beamSlices,
                obstacles,
                startText: from + offset === 0 ? span.startText : null,
                endText: span.endText,
              });
            });
          const defaultY = baselineClientY - measureRect.top;
          const defaultInGap =
            defaultY - HAIRPIN_OPEN_HEIGHT / 2 > gap.topGapEdgeY &&
            defaultY + HAIRPIN_OPEN_HEIGHT / 2 < gap.bottomGapEdgeY;
          if (
            side === gapSide &&
            defaultInGap &&
            levelChainClear(defaultY, 0)
          ) {
            continue;
          }

          const route = resolveAngledHairpinRoute({
            kind: kinds[0],
            startX: spans[0].startX,
            endX: spans[0].endX,
            openHeight: HAIRPIN_OPEN_HEIGHT,
            staffRole,
            staffTopLineY,
            staffBottomLineY,
            otherStaffGapEdgeY:
              staffRole === 'top' ? gap.bottomGapEdgeY : gap.topGapEdgeY,
            beamSlices,
            obstacles,
            startText: spans[0].startText,
            endText: spans[0].endText,
          });
          if (route !== null && levelChainClear(route.end.y, 1)) {
            placeHairpin(kinds[0], route.start, route.end, true);
            placeText(spans[0].startText, route.start.y);
            placeText(spans[0].endText, route.end.y);
            kinds.slice(1).forEach((kind, offset) => {
              const span = spans[offset + 1];
              const y = route.end.y;
              placeHairpin(
                kind,
                { x: span.startX, y },
                { x: span.endX, y },
                false
              );
              placeText(span.endText, y);
            });
            handOver();
            continue;
          }

          if (side === gapSide) {
            moveOutside();
          }
        }
      });

      staves.forEach((staff, staffIndex) => {
        const gap = gapBetween(staffIndex, partnerOf(staffIndex));
        const elements = Array.from(
          staff.querySelectorAll(
            `${loneNoteSelector(':defined')}, ${chordSelector(':defined')}`
          )
        ) as NoteOrChordElementType[];
        for (const element of elements) {
          if (
            element.dynamic === null ||
            !element.dynamicShared ||
            placedEndpoints.has(element)
          ) {
            continue;
          }
          const centerX = textCenterX(element, element.dynamic, -1, gap);
          const text = {
            marking: element.dynamic,
            bracketed: element.dynamicReminder,
            text: element.dynamicText ?? null,
            centerX,
          };
          const y =
            resolveSharedHairpinY({
              kind: 'crescendo',
              startX: centerX,
              endX: centerX,
              openHeight: 0,
              topGapEdgeY: gap.topGapEdgeY,
              bottomGapEdgeY: gap.bottomGapEdgeY,
              beamSlices,
              obstacles,
              startText: text,
              endText: null,
            }) ?? (gap.topGapEdgeY + gap.bottomGapEdgeY) / 2;
          placeText(text, y);
        }
      });

      return plan;
    }

    // Measure-relative, since the overlay is 1:1 with this host.
    #doubleStemmedBeamSlices(): ObstacleRect[] {
      const polygons =
        this.shadowRoot?.querySelectorAll<SVGPolygonElement>(
          '.double-stemmed-beams-overlay .double-stemmed-beam'
        ) ?? [];
      return Array.from(polygons).flatMap((polygon) =>
        sliceConvexPolygon(
          Array.from({ length: polygon.points.numberOfItems }, (_, i) => {
            const point = polygon.points.getItem(i);
            return { x: point.x, y: point.y };
          }),
          SLUR_BEAM_SLICE_WIDTH_PX
        )
      );
    }

    // A cross-staff tuplet bracket centred in the gap is drawn before this
    // pass, so a shared dynamic must step around it.
    #crossStaffTupletRects(measureRect: DOMRect): ObstacleRect[] {
      const shapes =
        this.shadowRoot?.querySelectorAll<SVGGraphicsElement>(
          '.cross-staff-tuplets-overlay line, .cross-staff-tuplets-overlay text'
        ) ?? [];
      return Array.from(shapes, (shape) => {
        const rect = shape.getBoundingClientRect();
        return {
          left: rect.left - measureRect.left,
          right: rect.right - measureRect.left,
          top: rect.top - measureRect.top,
          bottom: rect.bottom - measureRect.top,
        };
      }).filter((rect) => rect.right > rect.left || rect.bottom > rect.top);
    }

    // A staff's octave-sign shapes on one side of its lines, measure-relative.
    // The side facing a partner staff is the gap, where a sign stays next to
    // its own staff and the shared beam, tuplet brackets and shared dynamics
    // step around it.
    #octaveSignRects(
      staff: StaffElementBaseType,
      side: 'above' | 'below',
      measureRect: DOMRect
    ): ObstacleRect[] {
      const staffRect = this.#staffContainerRect(staff);
      const shapes =
        staff.shadowRoot?.querySelectorAll<SVGGraphicsElement>(
          '.octave-signs-container .octave-sign, .octave-signs-container .octave-extension-line, .octave-signs-container .octave-corner, .octave-signs-container .octave-loco-label'
        ) ?? [];
      const own = Array.from(shapes, (shape) => shape.getBoundingClientRect())
        .filter((rect) => rect.width > 0 || rect.height > 0)
        .map((rect) => ({
          left: rect.left - measureRect.left,
          right: rect.right - measureRect.left,
          top: rect.top - measureRect.top,
          bottom: rect.bottom - measureRect.top,
        }));
      const staffTop = staffRect.top - measureRect.top;
      const staffBottom = staffRect.bottom - measureRect.top;
      const continued = (this.#octaveContinuationRects.get(staff) ?? []).map(
        (rect) => ({
          ...rect,
          top: rect.top + staffTop,
          bottom: rect.bottom + staffTop,
        })
      );
      return [...own, ...continued].filter((rect) => {
        const centerY = (rect.top + rect.bottom) / 2;
        return side === 'above' ? centerY < staffTop : centerY > staffBottom;
      });
    }

    // Current re-entry depth per guarded redraw pass — see #guardedRedraw.
    #redrawDepths = new Map<string, number>();

    // Re-entry guard for the passes that write staff bridge properties: a
    // change re-renders the staff, which synchronously dispatches the event
    // the pass listens for. Geometry measured mid-teardown can fail to
    // settle, so a depth cap bounds the recursion whatever the cause, and
    // isConnected skips stale callbacks after removal.
    #guardedRedraw(passName: string, redraw: () => void) {
      if (!this.isConnected) {
        return;
      }
      const depth = this.#redrawDepths.get(passName) ?? 0;
      if (depth > 4) {
        console.warn(
          `[music-measure] ${passName} redraw did not converge after several passes; stopping to avoid a runaway loop`
        );
        return;
      }
      this.#redrawDepths.set(passName, depth + 1);
      try {
        redraw();
      } finally {
        this.#redrawDepths.set(passName, depth);
      }
    }

    // Resolves cross-staff double-stemmed beam groups (`beam-group`) and
    // pushes each member's stem direction onto its staff: top-staff members
    // stem down, bottom-staff members up, like voice 1/voice 2.
    #redrawDoubleStemmedBeams() {
      this.#guardedRedraw('double-stemmed beam', () =>
        this.#redrawDoubleStemmedBeamsImpl()
      );
    }

    #redrawCrossStaffTremolos() {
      this.#guardedRedraw('cross-staff tremolo', () =>
        this.#redrawCrossStaffTremolosImpl()
      );
    }

    // Warnings repeat only once their text changes: this pass runs on every
    // layout of either staff.
    #lastCrossStaffTremoloWarnings = '';

    // Joins one `<music-tremolo tremolo-group>` on each of two adjacent
    // staves into one tremolo between the hands. Like the double-stemmed beam
    // pass: push each staff's stem directions (top down, bottom up) and let
    // it re-lay out, then measure the real stems, place the beams in the gap,
    // write each stem's length and draw the beams here. The staff beams none
    // of these notes itself (externallyBeamedIndices).
    #redrawCrossStaffTremolosImpl() {
      const staves = Array.from(this.children).filter((el) =>
        isStaffNodeName(el.nodeName)
      ) as StaffElementBaseType[];

      const entries: CrossStaffTremoloEntry<
        TremoloElementType,
        NoteChordOrRestElementType
      >[] = [];
      staves.forEach((staff, staffIndex) => {
        const wrappers = staff.querySelectorAll<TremoloElementType>(
          `${MUSIC_TREMOLO}[tremolo-group]`
        );
        for (const tremolo of Array.from(wrappers)) {
          const { flatElements, tremoloGroups } = flattenSlotElements([
            tremolo,
          ]);
          const share = 1 / Math.max(1, flatElements.length);
          const first = flatElements[0];
          const beatOffsetOf = (
            staff as unknown as {
              beatOffsetOf?: (element: Element) => number | null;
            }
          ).beatOffsetOf;
          entries.push({
            staffIndex,
            tremolo,
            // Read from attributes: the pass can run before a wrapper parsed
            // from markup has upgraded.
            tremoloGroup: tremolo.getAttribute('tremolo-group') ?? '',
            strokes: parseTremoloStrokes(tremolo.getAttribute('strokes')) ?? 3,
            valid: tremoloGroups.some((group) => group.element === tremolo),
            isNested:
              tremolo.parentElement?.closest(
                `${MUSIC_TUPLET}, ${MUSIC_ARPEGGIO}, ${MUSIC_TREMOLO}`
              ) != null,
            startBeat:
              first !== undefined && beatOffsetOf !== undefined
                ? beatOffsetOf.call(staff, first)
                : null,
            members: flatElements.map((element) => {
              const duration =
                parseDuration(element.getAttribute('duration')) ?? 'quarter';
              return {
                element,
                isRest: element.nodeName === MUSIC_REST_NODE,
                duration,
                beatLength: durationToFactor[duration] * share,
                cue:
                  resolveNoteSize(element.getAttribute('size'), element) ===
                  'cue',
              };
            }),
          });
        }
      });

      const { groups, warnings } = resolveCrossStaffTremoloGroups(entries);
      const warningText = warnings.join('\n');
      if (warningText !== this.#lastCrossStaffTremoloWarnings) {
        for (const warning of warnings) {
          console.warn(`[music-measure] ${warning}`);
        }
      }
      this.#lastCrossStaffTremoloWarnings = warningText;

      const rolesByStaffIndex = new Map<
        number,
        Map<TremoloElementType, CrossStaffTremoloRole>
      >();
      const assignRole = (
        staffIndex: number,
        tremolo: TremoloElementType,
        stemUp: boolean
      ) => {
        const roles = rolesByStaffIndex.get(staffIndex) ?? new Map();
        roles.set(tremolo, { stemUp });
        rolesByStaffIndex.set(staffIndex, roles);
      };
      for (const group of groups) {
        assignRole(group.topStaffIndex, group.topTremolo, false);
        assignRole(group.bottomStaffIndex, group.bottomTremolo, true);
      }
      staves.forEach((staff, staffIndex) => {
        if ('crossStaffTremoloRoles' in staff) {
          (
            staff as unknown as {
              crossStaffTremoloRoles: ReadonlyMap<
                TremoloElementType,
                CrossStaffTremoloRole
              > | null;
            }
          ).crossStaffTremoloRoles = rolesByStaffIndex.get(staffIndex) ?? null;
        }
      });

      const overlay = this.shadowRoot?.querySelector<SVGSVGElement>(
        '.cross-staff-tremolos-overlay'
      );
      if (overlay) {
        while (overlay.firstChild) {
          overlay.removeChild(overlay.firstChild);
        }
      }
      const clearanceByStaff = new Map<StaffElementBaseType, VerticalBand>();
      if (groups.length === 0 || !overlay) {
        this.#applyGapClearance('tremolos', clearanceByStaff, staves);
        return;
      }

      const measureRect = this.getBoundingClientRect();
      for (const group of groups) {
        const topGapEdgeY =
          this.#staffContainerRect(staves[group.topStaffIndex]).bottom -
          measureRect.top;
        const bottomGapEdgeY =
          this.#staffContainerRect(staves[group.bottomStaffIndex]).top -
          measureRect.top;

        // Each note's stem, or where a semibreve's would be, and where it
        // would end at its base length (a drawn stem's own extension taken
        // back off, so repeated passes measure the same input).
        const stems: {
          element: NoteOrChordElementType;
          staffIndex: number;
          stemUp: boolean;
          stemmed: boolean;
          x: number;
          naturalY: number;
        }[] = [];
        for (const note of group.notes) {
          const element = note.element as NoteOrChordElementType;
          const stemUp = note.staffIndex === group.bottomStaffIndex;
          const stemRect = this.#stemRect(element);
          if (stemRect) {
            const measuredTipY =
              (stemUp ? stemRect.top : stemRect.bottom) - measureRect.top;
            stems.push({
              element,
              staffIndex: note.staffIndex,
              stemUp,
              stemmed: true,
              x: (stemRect.left + stemRect.right) / 2 - measureRect.left,
              naturalY: stemUp
                ? measuredTipY + element.stemExtension
                : measuredTipY - element.stemExtension,
            });
            continue;
          }
          const heads = this.#headRects(element);
          if (heads.length === 0) {
            continue;
          }
          const head = stemUp
            ? heads.reduce((a, b) => (b.top < a.top ? b : a))
            : heads.reduce((a, b) => (b.bottom > a.bottom ? b : a));
          const centerY = (head.top + head.bottom) / 2 - measureRect.top;
          stems.push({
            element,
            staffIndex: note.staffIndex,
            stemUp,
            stemmed: false,
            x: (stemUp ? head.right : head.left) - measureRect.left,
            naturalY: centerY + (stemUp ? -1 : 1) * BASE_STEM_LENGTH_PX,
          });
        }
        if (stems.length < 2) {
          continue;
        }
        // Before a staff has spaced its notes, its successive notes share an
        // x; its NOTES_POSITIONED re-runs this pass.
        const notSpacedYet = stems.some((stem, i) =>
          stems
            .slice(0, i)
            .some(
              (earlier) =>
                earlier.staffIndex === stem.staffIndex &&
                Math.abs(earlier.x - stem.x) < 0.5
            )
        );
        if (notSpacedYet) {
          continue;
        }

        const requestedAttach =
          parseTremoloBeamAttach(
            group.topTremolo.getAttribute('beam-attach')
          ) ??
          parseTremoloBeamAttach(
            group.bottomTremolo.getAttribute('beam-attach')
          );
        const beamAttach =
          requestedAttach !== null && acceptsBeamAttach(group.duration)
            ? requestedAttach
            : null;
        const { attached, total } = tremoloBeamCounts(
          group.duration,
          group.strokes,
          beamAttach
        );
        const firstX = stems[0].x;
        const lastX = stems[stems.length - 1].x;
        const resolved = resolveDoubleStemmedBeamLine(
          stems.map((stem) => ({
            x: stem.x,
            naturalY: stem.naturalY,
            isTopStaff: stem.staffIndex === group.topStaffIndex,
          })),
          topGapEdgeY,
          bottomGapEdgeY
        );
        const centred = centredCrossStaffTremoloLine({
          firstX,
          lastX,
          slope:
            lastX === firstX
              ? 0
              : (resolved.yAtLastX - resolved.yAtFirstX) / (lastX - firstX),
          topGapEdgeY,
          bottomGapEdgeY,
          total,
        });
        const stackLine: DoubleStemmedBeamLine = {
          yAtFirstX: centred.yAtFirstX,
          yAtLastX: centred.yAtLastX,
        };
        const shapes = crossStaffTremoloBeamShapes({
          stemXs: stems.map((stem) => stem.x),
          attached,
          total,
        });
        const clearance = resolveDoubleStemmedBeamClearance({
          line: stackLine,
          firstX,
          lastX,
          beamShapes: shapes,
          hangingShapes: [],
          keepOuts: [
            ...this.#octaveSignRects(
              staves[group.topStaffIndex],
              'below',
              measureRect
            ).map((rect) => ({ ...rect, staff: 'top' as const })),
            ...this.#octaveSignRects(
              staves[group.bottomStaffIndex],
              'above',
              measureRect
            ).map((rect) => ({ ...rect, staff: 'bottom' as const })),
          ],
          noteheads: stems.flatMap(({ element, stemUp }) =>
            this.#headRects(element).map((head) => ({
              left: head.left - measureRect.left,
              right: head.right - measureRect.left,
              top: head.top - measureRect.top,
              bottom: head.bottom - measureRect.top,
              stemUp,
            }))
          ),
          clearance: OCTAVE_SIGN_BEAM_CLEARANCE_PX,
          minStemLength: DOUBLE_STEMMED_BEAM_MIN_STEM_PX,
        });
        if (clearance.reserveOn !== null) {
          addGapNeed(
            clearanceByStaff,
            staves[
              clearance.reserveOn === 'bottom'
                ? group.bottomStaffIndex
                : group.topStaffIndex
            ],
            clearance.reserveOn === 'bottom' ? 'top' : 'bottom',
            clearance.deficit
          );
        }

        const { beams, stemTipYs } = resolveCrossStaffTremoloBeams({
          stems,
          line: {
            firstX,
            lastX,
            yAtFirstX: stackLine.yAtFirstX + clearance.shift,
            yAtLastX: stackLine.yAtLastX + clearance.shift,
          },
          attached,
          total,
        });
        stems.forEach((stem, i) => {
          if (stem.stemmed) {
            stem.element.stemExtension = stem.stemUp
              ? stem.naturalY - stemTipYs[i]
              : stemTipYs[i] - stem.naturalY;
          }
        });
        for (const beam of beams) {
          overlay.appendChild(createTremoloBeamPolygon(beam));
        }
      }
      this.#applyGapClearance('tremolos', clearanceByStaff, staves);
    }

    #redrawCrossStaffTuplets() {
      this.#guardedRedraw('cross-staff tuplet', () =>
        this.#redrawCrossStaffTupletsImpl()
      );
    }

    // Joins each `<music-tuplet tuplet-group>` pair across two adjacent
    // staves into one tuplet spanning both hands (rules/
    // crossStaffTupletRules.ts). Pass 1 pushes a role onto each wrapper's own
    // staff — stems into the gap, bracket suppressed or forced to one side —
    // and those setters re-render synchronously, so pass 2's real geometry
    // already reflects the new stems when it draws a `gap` bracket here.
    #redrawCrossStaffTupletsImpl() {
      const staves = Array.from(this.children).filter((el) =>
        isStaffNodeName(el.nodeName)
      ) as StaffElementBaseType[];

      const entries: CrossStaffTupletEntry<
        TupletElementType,
        NoteChordOrRestElementType
      >[] = [];
      staves.forEach((staff, staffIndex) => {
        const tuplets = staff.querySelectorAll<TupletElementType>(
          `${MUSIC_TUPLET}[tuplet-group]`
        );
        for (const tuplet of Array.from(tuplets)) {
          entries.push({
            staffIndex,
            tuplet,
            tupletGroup: tuplet.tupletGroup ?? '',
            ratio: parseTupletRatio(tuplet.ratio),
            placement: tuplet.placement,
            isNested:
              tuplet.parentElement?.closest(MUSIC_TUPLET) != null ||
              tuplet.querySelector(MUSIC_TUPLET) !== null,
            members: tupletMembers(tuplet).map(({ element, share }) => ({
              element,
              isRest: element.nodeName === MUSIC_REST_NODE,
              beatLength: durationToFactor[element.duration] * share,
              inBeamGroup: element.beamGroup !== null,
            })),
          });
        }
      });

      const { groups, warnings } = resolveCrossStaffTupletGroups(entries);
      for (const warning of warnings) {
        console.warn(`[music-measure] ${warning}`);
      }

      const rolesByStaffIndex = new Map<
        number,
        Map<TupletElementType, CrossStaffTupletRole>
      >();
      const assignRole = (
        staffIndex: number,
        tuplet: TupletElementType,
        role: CrossStaffTupletRole
      ) => {
        const roles = rolesByStaffIndex.get(staffIndex) ?? new Map();
        roles.set(tuplet, role);
        rolesByStaffIndex.set(staffIndex, roles);
      };
      for (const group of groups) {
        assignRole(group.topStaffIndex, group.topTuplet, {
          stemUp: false,
          rendering: group.layout === 'above' ? 'above' : 'suppressed',
        });
        assignRole(group.bottomStaffIndex, group.bottomTuplet, {
          stemUp: true,
          rendering: group.layout === 'below' ? 'below' : 'suppressed',
        });
      }
      staves.forEach((staff, staffIndex) => {
        (
          staff as unknown as {
            crossStaffTupletRoles: ReadonlyMap<
              TupletElementType,
              CrossStaffTupletRole
            > | null;
          }
        ).crossStaffTupletRoles = rolesByStaffIndex.get(staffIndex) ?? null;
      });

      const clearanceByStaff = new Map<StaffElementBaseType, VerticalBand>();
      const overlay = this.shadowRoot?.querySelector<SVGSVGElement>(
        '.cross-staff-tuplets-overlay'
      );
      if (!overlay) {
        this.#applyGapClearance('tuplets', clearanceByStaff, staves);
        return;
      }
      overlay.replaceChildren();

      const measureRect = this.getBoundingClientRect();
      // How far a wrapper's notes reach toward the other staff (lowest edge
      // for the top staff, highest for the bottom), measure-relative.
      const reachIntoGap = (
        tuplet: TupletElementType,
        downward: boolean
      ): number | null => {
        let extreme: number | null = null;
        for (const element of tuplet.flatElements) {
          if (element.nodeName === MUSIC_REST_NODE) {
            continue;
          }
          const noteOrChord = element as NoteOrChordElementType;
          const stem = this.#stemRect(noteOrChord);
          const rects = [
            ...this.#headRects(noteOrChord),
            ...(stem ? [stem] : []),
          ];
          for (const rect of rects) {
            const y = (downward ? rect.bottom : rect.top) - measureRect.top;
            extreme =
              extreme === null
                ? y
                : downward
                ? Math.max(extreme, y)
                : Math.min(extreme, y);
          }
        }
        return extreme;
      };

      for (const group of groups) {
        if (
          group.layout !== 'gap' ||
          group.startSide === null ||
          group.endSide === null
        ) {
          continue;
        }
        const startHeads = this.#headRects(
          group.startElement as NoteOrChordElementType
        );
        const endHeads = this.#headRects(
          group.endElement as NoteOrChordElementType
        );
        if (startHeads.length === 0 || endHeads.length === 0) {
          continue;
        }
        const startX =
          Math.min(...startHeads.map((rect) => rect.left)) - measureRect.left;
        const endX =
          Math.max(...endHeads.map((rect) => rect.right)) - measureRect.left;
        // A gap-side octave sign over the bracket's span reaches into the
        // gap like the notes do, and stays next to its own staff.
        const overSpan = (rects: ObstacleRect[]) =>
          rects.filter((rect) => rect.right >= startX && rect.left <= endX);
        const topSigns = overSpan(
          this.#octaveSignRects(
            staves[group.topStaffIndex],
            'below',
            measureRect
          )
        );
        const bottomSigns = overSpan(
          this.#octaveSignRects(
            staves[group.bottomStaffIndex],
            'above',
            measureRect
          )
        );
        const topNotesY = reachIntoGap(group.topTuplet, true);
        const bottomNotesY = reachIntoGap(group.bottomTuplet, false);
        const tupletGroup = {
          element: group.topTuplet,
          indices: [],
          parsedRatio: parseTupletRatio(group.topTuplet.ratio),
          nestingLevel: 0,
        };
        const display = tupletDisplayOf(tupletGroup);
        const notesOnly = {
          labelAscent: display.ascent,
          labelDescent: display.descent,
          topGapEdgeY:
            this.#staffContainerRect(staves[group.topStaffIndex]).bottom -
            measureRect.top,
          bottomGapEdgeY:
            this.#staffContainerRect(staves[group.bottomStaffIndex]).top -
            measureRect.top,
          topExtremeY: topNotesY,
          bottomExtremeY: bottomNotesY,
        };
        const gapInput = {
          ...notesOnly,
          topExtremeY:
            topSigns.length === 0
              ? topNotesY
              : Math.max(
                  topNotesY ?? -Infinity,
                  ...topSigns.map(
                    (rect) => rect.bottom + OCTAVE_SIGN_BEAM_CLEARANCE_PX
                  )
                ),
          bottomExtremeY:
            bottomSigns.length === 0
              ? bottomNotesY
              : Math.min(
                  bottomNotesY ?? Infinity,
                  ...bottomSigns.map(
                    (rect) => rect.top - OCTAVE_SIGN_BEAM_CLEARANCE_PX
                  )
                ),
        };
        const baseY = resolveCrossStaffTupletGapBaseY(gapInput);
        // Widen the gap by what the octave signs take from the bracket's
        // band — never for crowding the notes alone cause.
        const band = crossStaffTupletGapBand(gapInput);
        const notesBand = crossStaffTupletGapBand(notesOnly);
        if (band.lower < notesBand.lower || band.upper > notesBand.upper) {
          const onBottom = band.lower < notesBand.lower;
          addGapNeed(
            clearanceByStaff,
            staves[onBottom ? group.bottomStaffIndex : group.topStaffIndex],
            onBottom ? 'top' : 'bottom',
            band.upper - band.lower
          );
        }

        const geometry: TupletBracketGeometry = {
          group: tupletGroup,
          startX,
          endX,
          baseY,
          stemUp: false,
          angle: 0,
          omitBracket: false,
          numeralX: (startX + endX) / 2,
          numeralY: baseY,
          hookLength: TUPLET_HOOK_LENGTH_PX,
          hookDirections: {
            start: group.startSide === 'top' ? -1 : 1,
            end: group.endSide === 'top' ? -1 : 1,
          },
        };
        overlay.appendChild(createTupletBracketSvg(geometry));
      }
      this.#applyGapClearance('tuplets', clearanceByStaff, staves);
    }

    // Beam-group entries for #redrawDoubleStemmedBeamsImpl (which logs the
    // warnings) and #redrawConnectors (silent, so they log once per cycle).
    #gatherDoubleStemmedBeamEntries(): {
      staves: StaffElementBaseType[];
      perStaffElements: NoteChordOrRestElementType[][];
      entries: DoubleStemmedBeamEntry[];
    } {
      const staves = Array.from(this.children).filter((el) =>
        isStaffNodeName(el.nodeName)
      ) as StaffElementBaseType[];

      const elementSelector = `${loneNoteSelector(':defined')}, ${chordSelector(
        ':defined'
      )}, ${MUSIC_REST}:defined`;
      const perStaffElements: NoteChordOrRestElementType[][] = staves.map(
        (staff) =>
          Array.from(
            staff.querySelectorAll(elementSelector)
          ) as NoteChordOrRestElementType[]
      );

      const entries: DoubleStemmedBeamEntry[] = perStaffElements.flatMap(
        (elements, staffIndex) =>
          elements.map((element, entryIndex) => ({
            staffIndex,
            entryIndex,
            beamGroup: element.beamGroup,
            nodeName: element.nodeName,
            cue:
              element.nodeName !== MUSIC_REST_NODE &&
              (element as NoteOrChordElementType).size === 'cue',
          }))
      );

      return { staves, perStaffElements, entries };
    }

    #redrawDoubleStemmedBeamsImpl() {
      const { staves, perStaffElements, entries } =
        this.#gatherDoubleStemmedBeamEntries();

      const { groups, warnings } = resolveDoubleStemmedBeamGroups(entries);
      for (const warning of warnings) {
        console.warn(`[music-measure] ${warning}`);
      }

      // rest-staff-side only applies to a rest in a resolved beam-group.
      const restMembersInGroups = new Set(
        groups.flatMap((group) =>
          group.members
            .filter((member) => member.isRest)
            .map(
              (member) => perStaffElements[member.staffIndex][member.entryIndex]
            )
        )
      );
      for (const elements of perStaffElements) {
        for (const element of elements) {
          if (
            element.nodeName === MUSIC_REST_NODE &&
            (element as RestElementType).restStaffSide !== null &&
            !restMembersInGroups.has(element)
          ) {
            console.warn(
              '[music-measure] rest-staff-side is set on a rest with no active double-stemmed beam-group; ignoring'
            );
          }
        }
      }

      // Pass 1: push each staff's stem overrides. The setter re-renders
      // synchronously, so pass 2 measures post-change geometry. Keyed by
      // element: each voice looks overrides up in its own local array.
      const overridesByStaffIndex = new Map<
        number,
        Map<NoteChordOrRestElementType, boolean>
      >();
      for (const group of groups) {
        for (const member of group.members) {
          if (member.isRest) {
            continue;
          }
          const element =
            perStaffElements[member.staffIndex][member.entryIndex];
          const stemUp = member.staffIndex === group.bottomStaffIndex;
          const staffOverrides =
            overridesByStaffIndex.get(member.staffIndex) ?? new Map();
          staffOverrides.set(element, stemUp);
          overridesByStaffIndex.set(member.staffIndex, staffOverrides);
        }
      }

      staves.forEach((staff, staffIndex) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- crossStaffBeamStemOverrides is classical-staff-only, not on StaffElementBaseType
        (staff as any).crossStaffBeamStemOverrides =
          overridesByStaffIndex.get(staffIndex) ?? null;
      });

      const octaveBreaks = this.#crossStaffOctaveBreaks(
        staves,
        perStaffElements,
        groups
      );
      staves.forEach((staff, staffIndex) => {
        (
          staff as unknown as {
            crossStaffOctaveBreakAfter: ReadonlySet<NoteChordOrRestElementType> | null;
          }
        ).crossStaffOctaveBreakAfter = octaveBreaks.get(staffIndex) ?? null;
      });

      // Filled in pass 2, then applied to every staff so one with no covered
      // tuplet member resets to null.
      const tupletBeamYByStaffIndex = new Map<
        number,
        Map<NoteChordOrRestElementType, number>
      >();
      const applyCrossStaffTupletBeamY = () => {
        staves.forEach((staff, staffIndex) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- crossStaffTupletBeamY is classical-staff-only, not on StaffElementBaseType
          (staff as any).crossStaffTupletBeamY =
            tupletBeamYByStaffIndex.get(staffIndex) ?? null;
        });
      };

      const overlay = this.shadowRoot?.querySelector<SVGSVGElement>(
        '.double-stemmed-beams-overlay'
      );
      if (overlay) {
        while (overlay.firstChild) {
          overlay.removeChild(overlay.firstChild);
        }
      }
      const clearanceByStaff = new Map<StaffElementBaseType, VerticalBand>();
      const applyBeamClearance = () =>
        this.#applyGapClearance('beams', clearanceByStaff, staves);

      if (groups.length === 0 || !overlay) {
        applyCrossStaffTupletBeamY();
        applyBeamClearance();
        return;
      }

      // Pass 2: resolve each group's beam line from the members' stem tips,
      // then write each stemExtension (a note-local re-render).
      const measureRect = this.getBoundingClientRect();
      for (const group of groups) {
        const topGapEdgeY =
          this.#staffContainerRect(staves[group.topStaffIndex]).bottom -
          measureRect.top;
        const bottomGapEdgeY =
          this.#staffContainerRect(staves[group.bottomStaffIndex]).top -
          measureRect.top;

        const memberGeometries: {
          element: NoteOrChordElementType;
          staffIndex: number;
          stemUp: boolean;
          point: DoubleStemmedBeamPoint;
        }[] = [];
        for (const member of group.members) {
          if (member.isRest) {
            continue;
          }
          const element = perStaffElements[member.staffIndex][
            member.entryIndex
          ] as NoteOrChordElementType;
          const stemRect = this.#stemRect(element);
          if (!stemRect) {
            // No stem at all (e.g. a beam-group member with a whole-note
            // duration) — nothing to bridge for this one.
            continue;
          }
          const stemUp = member.staffIndex === group.bottomStaffIndex;
          const measuredTipY =
            (stemUp ? stemRect.top : stemRect.bottom) - measureRect.top;
          // Un-shift the previously applied stemExtension, or each re-run
          // would measure its own output and never converge.
          const naturalY = stemUp
            ? measuredTipY + element.stemExtension
            : measuredTipY - element.stemExtension;
          const x = (stemRect.left + stemRect.right) / 2 - measureRect.left;
          memberGeometries.push({
            element,
            staffIndex: member.staffIndex,
            stemUp,
            point: {
              x,
              naturalY,
              isTopStaff: member.staffIndex === group.topStaffIndex,
            },
          });
        }
        if (memberGeometries.length < 2) {
          continue;
        }
        // Successive members on one staff share an x only before that staff
        // has spaced its notes; measuring then would size the gap from a
        // transient layout. Its NOTES_POSITIONED re-runs this pass.
        const staffNotSpacedYet = memberGeometries.some(
          (geometry, i) =>
            i > 0 &&
            memberGeometries
              .slice(0, i)
              .some(
                (earlier) =>
                  earlier.staffIndex === geometry.staffIndex &&
                  Math.abs(earlier.point.x - geometry.point.x) < 0.5
              )
        );
        if (staffNotSpacedYet) {
          continue;
        }

        const resolvedLine = resolveDoubleStemmedBeamLine(
          memberGeometries.map((g) => g.point),
          topGapEdgeY,
          bottomGapEdgeY
        );
        const firstX = memberGeometries[0].point.x;
        const lastX = memberGeometries[memberGeometries.length - 1].point.x;

        // Secondary/fractional beams, resolved before the beam's height since
        // the stack must clear a gap-side octave sign.
        const beamCounts = memberGeometries.map(
          (g) => durationToFlagCountMap.get(g.element.duration) ?? 0
        );
        const { secondaryBeams, fractionalBeams } =
          computeBeamLevelStructure(beamCounts);
        const segments = [...secondaryBeams, ...fractionalBeams];
        const groupSide = this.#secondaryBeamSide(
          segments,
          memberGeometries,
          group.topStaffIndex,
          resolvedLine
        );
        const layerDirection = groupSide === 'top' ? -1 : 1;
        const deepestLevelByIndex = new Map<number, number>();
        for (const segment of segments) {
          for (let i = segment.fromNoteIndex; i <= segment.toNoteIndex; i++) {
            deepestLevelByIndex.set(
              i,
              Math.max(deepestLevelByIndex.get(i) ?? 0, segment.beamLevel)
            );
          }
        }
        const beamStep = BEAM_STEP_PX;
        const segmentXRange = (segment: BeamLineDescriptor) => {
          let x1 = memberGeometries[segment.fromNoteIndex].point.x;
          let x2 = memberGeometries[segment.toNoteIndex].point.x;
          if (segment.fractionalBeamSide === 'left') {
            x1 -= NOTEHEAD_WIDTH_PX;
          } else if (segment.fractionalBeamSide === 'right') {
            x2 += NOTEHEAD_WIDTH_PX;
          }
          return { x1, x2 };
        };

        // The beam moves to keep its noteheads at a minimum distance and to
        // clear a gap-side octave sign, which stays next to its own staff (it
        // applies only to the stave it is placed against); the gap widens
        // when both hands' stems can't be satisfied.
        const clearance = resolveDoubleStemmedBeamClearance({
          line: resolvedLine,
          firstX,
          lastX,
          beamShapes: [
            {
              left: firstX,
              right: lastX,
              topOffset: 0,
              bottomOffset: BEAM_THICKNESS_PX,
            },
            ...segments.map((segment) => {
              const { x1, x2 } = segmentXRange(segment);
              const levelOffset = segment.beamLevel * layerDirection * beamStep;
              return {
                left: x1,
                right: x2,
                topOffset: levelOffset,
                bottomOffset: levelOffset + BEAM_THICKNESS_PX,
              };
            }),
          ],
          hangingShapes: hangingTupletNumeralShapes(memberGeometries),
          keepOuts: [
            ...this.#octaveSignRects(
              staves[group.topStaffIndex],
              'below',
              measureRect
            ).map((rect) => ({ ...rect, staff: 'top' as const })),
            ...this.#octaveSignRects(
              staves[group.bottomStaffIndex],
              'above',
              measureRect
            ).map((rect) => ({ ...rect, staff: 'bottom' as const })),
          ],
          noteheads: memberGeometries.flatMap(({ element, stemUp }) =>
            this.#headRects(element).map((head) => ({
              left: head.left - measureRect.left,
              right: head.right - measureRect.left,
              top: head.top - measureRect.top,
              bottom: head.bottom - measureRect.top,
              stemUp,
            }))
          ),
          clearance: OCTAVE_SIGN_BEAM_CLEARANCE_PX,
          minStemLength: DOUBLE_STEMMED_BEAM_MIN_STEM_PX,
        });
        if (clearance.reserveOn !== null) {
          const staff =
            staves[
              clearance.reserveOn === 'bottom'
                ? group.bottomStaffIndex
                : group.topStaffIndex
            ];
          addGapNeed(
            clearanceByStaff,
            staff,
            clearance.reserveOn === 'bottom' ? 'top' : 'bottom',
            clearance.deficit
          );
        }
        const line: DoubleStemmedBeamLine = {
          yAtFirstX: resolvedLine.yAtFirstX + clearance.shift,
          yAtLastX: resolvedLine.yAtLastX + clearance.shift,
        };
        const beamYAtX = (x: number): number =>
          doubleStemmedBeamYAtX(line, firstX, lastX, x);

        for (let i = 0; i < memberGeometries.length; i++) {
          const { element, staffIndex, stemUp, point } = memberGeometries[i];
          const beamY = beamYAtX(point.x);
          // beamY is the polygon's top edge for both staves; every tip ends
          // STEM_OVERLAP_PX inside it.
          const targetY = beamY + STEM_OVERLAP_PX;
          const extension = stemUp
            ? point.naturalY - targetY
            : targetY - point.naturalY;
          element.stemExtension = extension;

          // Inner voices anchor articulations at the beam: non-null is the
          // number of secondary levels between the tip and that surface.
          element.articulationStemAnchorBeamLevels = isInnerVoiceMember(
            element,
            staves[staffIndex]
          )
            ? deepestLevelByIndex.get(i) ?? 0
            : null;

          // An origin-independent delta; see crossStaffTupletBeamY.
          if (element.closest(MUSIC_TUPLET) !== null) {
            const staffElements =
              tupletBeamYByStaffIndex.get(staffIndex) ?? new Map();
            staffElements.set(element, beamY - point.naturalY);
            tupletBeamYByStaffIndex.set(staffIndex, staffElements);
          }
        }

        overlay.appendChild(
          createDoubleStemmedBeamPolygon(
            firstX,
            line.yAtFirstX,
            lastX,
            line.yAtLastX
          )
        );

        // "above"/"below" rests sit just past the shared beam, "centered" in
        // the gap. Each also clears the nearest notehead, often on the same
        // beat; the nudge below clears that note's stem.
        const gapCenterYReal = (topGapEdgeY + bottomGapEdgeY) / 2;
        for (let i = 0; i < group.members.length; i++) {
          const member = group.members[i];
          if (!member.isRest) {
            continue;
          }
          const element = perStaffElements[member.staffIndex][
            member.entryIndex
          ] as RestElementType;
          // The staff rewrites style.left every pass, so restRect.left is
          // always the natural position (nothing to un-shift).
          const restRect = element.getBoundingClientRect();
          const x = restRect.left + restRect.width / 2 - measureRect.left;
          const side =
            element.restStaffSide ??
            classifyAutoRestStaffSide(group.members, i, group.topStaffIndex);

          let nearestHeadRect: DOMRect | null = null;
          let nearestGeoX: number | null = null;
          let nearestDist = Infinity;
          for (const geo of memberGeometries) {
            const dist = Math.abs(geo.point.x - x);
            if (dist >= nearestDist) {
              continue;
            }
            const heads = this.#headRects(geo.element);
            if (heads.length === 0) {
              continue;
            }
            const top = Math.min(...heads.map((h) => h.top));
            const bottom = Math.max(...heads.map((h) => h.bottom));
            nearestDist = dist;
            nearestGeoX = geo.point.x;
            nearestHeadRect = new DOMRect(
              heads[0].x,
              top - measureRect.top,
              heads[0].width,
              bottom - top
            );
          }

          const beamY = beamYAtX(x);
          const targetReal =
            side === 'centered'
              ? this.#restCenteredTargetY(
                  gapCenterYReal,
                  topGapEdgeY,
                  bottomGapEdgeY,
                  beamY,
                  beamY + BEAM_THICKNESS_PX,
                  nearestHeadRect
                )
              : this.#restHuggingTargetY(side, beamY, nearestHeadRect);

          const staffOffsetY =
            staves[member.staffIndex].getBoundingClientRect().top -
            measureRect.top;
          element.style.position = 'absolute';
          element.style.top = `${restToYCoordinate(
            element.duration,
            undefined,
            {
              targetY: targetReal - staffOffsetY,
            }
          )}px`;

          // A same-beat member's stem runs through the rest, so nudge it
          // left of the stem. Computed from the note's x, so it's idempotent.
          if (
            nearestGeoX !== null &&
            nearestDist < REST_STEM_AVOIDANCE_THRESHOLD_PX
          ) {
            // Staves share the measure's x origin. Places the rest's right
            // edge REST_STEM_AVOIDANCE_NUDGE_PX left of the stem.
            element.style.left = `${
              nearestGeoX - REST_STEM_AVOIDANCE_NUDGE_PX - restRect.width
            }px`;
          }
        }

        if (segments.length === 0) {
          continue;
        }

        // A stem reaches the outermost beam level it's part of: a member on
        // the side away from the secondary stack extends past the primary.
        for (let i = 0; i < memberGeometries.length; i++) {
          const level = deepestLevelByIndex.get(i);
          if (!level) {
            continue;
          }
          const { element, staffIndex, stemUp, point } = memberGeometries[i];
          const memberSide: DoubleStemmedBeamSegmentSide =
            staffIndex === group.topStaffIndex ? 'top' : 'bottom';
          if (memberSide === groupSide) {
            continue;
          }
          const levelOffset = level * layerDirection * beamStep;
          const targetY = beamYAtX(point.x) + levelOffset + STEM_OVERLAP_PX;
          const extension = stemUp
            ? point.naturalY - targetY
            : targetY - point.naturalY;
          element.stemExtension = extension;
        }

        for (const segment of segments) {
          const levelOffset = segment.beamLevel * layerDirection * beamStep;
          const { x1, x2 } = segmentXRange(segment);
          overlay.appendChild(
            createDoubleStemmedBeamPolygon(
              x1,
              beamYAtX(x1) + levelOffset,
              x2,
              beamYAtX(x2) + levelOffset
            )
          );
        }
      }

      applyCrossStaffTupletBeamY();
      applyBeamClearance();
    }

    // Where each staff's octave lines break so a one-hand line encloses only
    // its own notes of a shared beam (rules/octaveRules.ts
    // #resolveCrossStaffOctaveBreaks), keyed by staff index. The other hand's
    // note is "transposed" when its own staff's octave line covers it; on
    // the same beat as a spanned note no break helps, so that staff should
    // be marked `loco` instead.
    #crossStaffOctaveBreaks(
      staves: readonly StaffElementBaseType[],
      perStaffElements: readonly NoteChordOrRestElementType[][],
      groups: readonly DoubleStemmedBeamGroup[]
    ): Map<number, Set<NoteChordOrRestElementType>> {
      const breaks = new Map<number, Set<NoteChordOrRestElementType>>();
      if (groups.length === 0) {
        return breaks;
      }
      const elementOf = (member: { staffIndex: number; entryIndex: number }) =>
        perStaffElements[member.staffIndex][member.entryIndex];
      const groupsOf = new Map<
        NoteChordOrRestElementType,
        DoubleStemmedBeamGroup
      >();
      for (const group of groups) {
        for (const member of group.members) {
          groupsOf.set(elementOf(member), group);
        }
      }

      const spansByStaff = perStaffElements.map((elements, staffIndex) => {
        const byVoice = new Map<Element | null, NoteChordOrRestElementType[]>();
        for (const element of elements) {
          const voice = element.closest(MUSIC_VOICE);
          byVoice.set(voice, [...(byVoice.get(voice) ?? []), element]);
        }
        return [
          ...Array.from(byVoice.values()).flatMap((voiceElements) =>
            resolveOctaveSpans(voiceElements).spans.map((span) =>
              span.members.map((member) => voiceElements[member.index])
            )
          ),
          ...(this.#octaveContinuationCoverage.get(staves[staffIndex]) ?? []),
        ];
      });
      const transposed = new Set(spansByStaff.flat(2));
      // Beats, not x: "between" and "on the same beat" are questions of time,
      // and a beat offset doesn't depend on whether both staves have been
      // laid out yet.
      const beatOf = (
        element: NoteChordOrRestElementType,
        staffIndex: number
      ): number | null => {
        if (element.nodeName === MUSIC_REST_NODE) {
          return null;
        }
        const staff = staves[staffIndex] as StaffElementBaseType & {
          beatOffsetOf?: (element: Element) => number | null;
        };
        return staff.beatOffsetOf?.(element) ?? null;
      };

      spansByStaff.forEach((spans, staffIndex) => {
        for (const spanElements of spans) {
          const pitched = spanElements.flatMap((element) => {
            const beat = beatOf(element, staffIndex);
            return beat === null ? [] : [{ element, beat }];
          });
          const shared = new Set(
            pitched.flatMap(({ element }) => {
              const group = groupsOf.get(element);
              return group === undefined ? [] : [group];
            })
          );
          if (shared.size === 0) {
            continue;
          }
          const otherMembers = Array.from(shared).flatMap((group) =>
            group.members.filter((member) => member.staffIndex !== staffIndex)
          );
          const otherHand = otherMembers.map(elementOf);
          const { breakAfter, sharesBeat } = resolveCrossStaffOctaveBreaks(
            pitched.map(({ beat }) => beat),
            otherMembers.flatMap((member) => {
              const element = elementOf(member);
              const beat = beatOf(element, member.staffIndex);
              return beat === null
                ? []
                : [{ beat, transposed: transposed.has(element) }];
            }),
            SAME_BEAT_TOLERANCE
          );
          if (breakAfter.length > 0) {
            const staffBreaks = breaks.get(staffIndex) ?? new Set();
            for (const k of breakAfter) {
              staffBreaks.add(pitched[k].element);
            }
            breaks.set(staffIndex, staffBreaks);
          }
          if (
            sharesBeat &&
            !otherHand.some(
              (element) =>
                element.nodeName !== MUSIC_REST_NODE &&
                (element as NoteOrChordElementType).loco
            )
          ) {
            console.warn(
              `[music-measure] an octave line covers the other hand's notes on the same beat in beam-group "${
                Array.from(shared)[0].id
              }"; mark the other staff loco so its pitch isn't read as transposed`
            );
          }
        }
      });
      return breaks;
    }

    // All secondary beams on one side: the segments' majority, ties broken
    // toward the primary's slope, else 'bottom'.
    #secondaryBeamSide(
      segments: readonly BeamLineDescriptor[],
      memberGeometries: readonly { staffIndex: number }[],
      topStaffIndex: number,
      line: DoubleStemmedBeamLine
    ): DoubleStemmedBeamSegmentSide {
      const membersForSide: DoubleStemmedBeamMember[] = memberGeometries.map(
        (g) => ({
          staffIndex: g.staffIndex,
          entryIndex: 0,
          isRest: false,
        })
      );
      const lastLocalIndex = memberGeometries.length - 1;
      const segmentSides = segments.map((segment) => {
        const position: DoubleStemmedBeamSegmentPosition =
          segment.fromNoteIndex === 0
            ? 'start'
            : segment.toNoteIndex === lastLocalIndex
            ? 'end'
            : 'middle';
        return resolveSecondaryBeamVerticalSide(
          segment,
          membersForSide,
          topStaffIndex,
          position
        );
      });
      const tieBreakSide: DoubleStemmedBeamSegmentSide =
        line.yAtLastX < line.yAtFirstX
          ? 'top'
          : line.yAtLastX > line.yAtFirstX
          ? 'bottom'
          : 'bottom';
      return resolveGroupSecondaryBeamSide(segmentSides, tieBreakSide);
    }

    // shared-stem-for: two hands on one beat joined by one stem drawn
    // between the noteheads.
    #redrawSharedStems() {
      const staves = Array.from(this.children).filter((el) =>
        isStaffNodeName(el.nodeName)
      ) as StaffElementBaseType[];

      const elementSelector = `${loneNoteSelector(':defined')}, ${chordSelector(
        ':defined'
      )}`;
      const perStaffElements: NoteOrChordElementType[][] = staves.map(
        (staff) =>
          Array.from(
            staff.querySelectorAll(elementSelector)
          ) as NoteOrChordElementType[]
      );

      const entries: SharedStemEntry[] = [];
      perStaffElements.forEach((elements, staffIndex) => {
        elements.forEach((element, entryIndex) => {
          entries.push({
            staffIndex,
            entryIndex,
            id: element.id || null,
            sharedStemFor: element.sharedStemFor,
            cue: element.size === 'cue',
          });
        });
      });

      const { pairs, warnings } = resolveSharedStemPairs(entries);
      for (const warning of warnings) {
        console.warn(`[music-measure] ${warning}`);
      }

      const resolvedPairs = pairs.map((pair) => {
        const [topRef, bottomRef] =
          pair.a.staffIndex < pair.b.staffIndex
            ? [pair.a, pair.b]
            : [pair.b, pair.a];
        return {
          topElement: perStaffElements[topRef.staffIndex][topRef.entryIndex],
          bottomElement:
            perStaffElements[bottomRef.staffIndex][bottomRef.entryIndex],
        };
      });

      // Nothing else turns noStem back off, so restore pairs that stopped
      // resolving.
      const nextSuppressed = new Set<NoteOrChordElementType>();
      for (const { topElement, bottomElement } of resolvedPairs) {
        nextSuppressed.add(topElement);
        nextSuppressed.add(bottomElement);
      }
      for (const element of this.#sharedStemSuppressedElements) {
        if (!nextSuppressed.has(element) && element.noStem) {
          element.noStem = false;
        }
      }
      this.#sharedStemSuppressedElements = nextSuppressed;

      const overlay = this.shadowRoot?.querySelector<SVGSVGElement>(
        '.shared-stems-overlay'
      );
      if (overlay) {
        while (overlay.firstChild) {
          overlay.removeChild(overlay.firstChild);
        }
      }
      if (resolvedPairs.length === 0 || !overlay) {
        return;
      }

      const measureRect = this.getBoundingClientRect();
      for (const { topElement, bottomElement } of resolvedPairs) {
        const topHeads = this.#headRects(topElement);
        const bottomHeads = this.#headRects(bottomElement);
        if (topHeads.length === 0 || bottomHeads.length === 0) {
          continue;
        }
        // The extremal notehead on the side facing the other staff — the
        // same anchor a note's own natural (pre-suppression) stem would
        // use.
        const topAnchor = topHeads.reduce((closest, h) =>
          h.bottom > closest.bottom ? h : closest
        );
        const bottomAnchor = bottomHeads.reduce((closest, h) =>
          h.top < closest.top ? h : closest
        );

        const topX = topAnchor.left + topAnchor.width / 2 - measureRect.left;
        const bottomX =
          bottomAnchor.left + bottomAnchor.width / 2 - measureRect.left;
        if (Math.abs(topX - bottomX) > SHARED_STEM_MISALIGNMENT_WARN_PX) {
          console.warn(
            "[music-measure] a shared-stem-for pair's two notes do not land at the same real beat; drawing the connecting stem at their midpoint anyway"
          );
        }
        const x = (topX + bottomX) / 2;
        const topY = topAnchor.bottom - measureRect.top;
        const bottomY = bottomAnchor.top - measureRect.top;

        if (
          (durationToFlagCountMap.get(topElement.duration) ?? 0) > 0 ||
          (durationToFlagCountMap.get(bottomElement.duration) ?? 0) > 0
        ) {
          console.warn(
            '[music-measure] shared-stem-for on a flagged duration is not yet supported — the flag will not render'
          );
        }

        // noStem's setter isn't dirty-checked and this runs on every resize.
        if (!topElement.noStem) {
          topElement.noStem = true;
        }
        if (!bottomElement.noStem) {
          bottomElement.noStem = true;
        }
        overlay.appendChild(createSharedStemLine(x, topY, bottomY));
      }
    }

    /**
     * Carries each group's barlines (end, start repeat, mid-bar) through the
     * gaps between its staves, from where its upper staff drew them. Called
     * by the composition once it has set them.
     */
    refreshGroupBarlines(): void {
      const container =
        this.shadowRoot?.querySelector<HTMLElement>('.group-barlines');
      if (!container) {
        return;
      }
      container.replaceChildren();
      const staves = this.#staves();
      const { groups } = resolveStaffGroups(
        staves.map((staff) => ({
          group: staff.group ?? null,
          groupId: staff.groupId ?? null,
        }))
      );
      if (groups.length === 0) {
        return;
      }
      const bands = this.#staffLineBands(staves);
      const isVocal = staves.map(
        ({ nodeName }) => nodeName === MUSIC_STAFF_VOCAL_NODE
      );
      for (const [upper, lower] of connectedBarlineGaps(groups, isVocal)) {
        for (const { left, width } of this.#barlineStrokes(staves[upper])) {
          // A box rather than SVG, so it lands on the same device pixels as
          // the staves' own barlines.
          const line = document.createElement('div');
          line.classList.add('group-barline');
          line.style.left = `${left}px`;
          line.style.width = `${width}px`;
          line.style.top = `${bands[upper].bottom}px`;
          line.style.height = `${bands[lower].top - bands[upper].bottom}px`;
          container.appendChild(line);
        }
      }
    }

    #staves(): StaffElementBaseType[] {
      return Array.from(this.children).filter((child) =>
        isStaffNodeName(child.nodeName)
      ) as StaffElementBaseType[];
    }

    // Every vertical line of a staff's barlines, as drawn.
    #barlineStrokes(
      staff: StaffElementBaseType
    ): { left: number; width: number }[] {
      const origin = this.getBoundingClientRect().left + this.clientLeft;
      const strokes = Array.from(
        staff.shadowRoot?.querySelectorAll<SVGRectElement>(
          '.barline-thin, .barline-thick'
        ) ?? []
      ).map((line) => {
        const { left, width } = line.getBoundingClientRect();
        return { left: left - origin, width };
      });
      // A plain barline is the container's border.
      return (staff as unknown as { endBarline: string }).endBarline ===
        'single'
        ? [
            ...strokes,
            {
              left:
                this.#staffContainerRect(staff).right -
                BARLINE_THIN_PX -
                origin,
              width: BARLINE_THIN_PX,
            },
          ]
        : strokes;
    }

    // A brace/bracket is a system-start decoration: only the first measure of
    // a row draws one; otherwise any old glyph is cleared.
    #renderGroupConnectors(isFirstInRow: boolean) {
      const container =
        this.shadowRoot?.querySelector<HTMLElement>('.group-connectors');
      if (!container) {
        return;
      }

      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      if (!isFirstInRow) {
        this.classList.remove('has-group-connector');
        return;
      }

      const staves = Array.from(this.children).filter((el) =>
        isStaffNodeName(el.nodeName)
      ) as StaffElementBaseType[];

      const { groups, warnings } = resolveStaffGroups(
        staves.map((staff) => ({
          group: staff.group ?? null,
          groupId: staff.groupId ?? null,
        }))
      );
      for (const warning of warnings) {
        console.warn(`[music-measure] ${warning}`);
      }

      // The glyph sits left of the box; this class reserves margin for it.
      this.classList.toggle('has-group-connector', groups.length > 0);

      const bands = this.#staffLineBands(staves);
      for (const { index, count, group } of groups) {
        const isGrandStaff = group === 'grand';
        const overhang = isGrandStaff ? 0 : BRACKET_LINE_OVERHANG_PX;
        const lastIndex = index + count - 1;
        const spanHeight =
          bands[lastIndex].bottom - bands[index].top + 2 * overhang;
        const topOffset = bands[index].top - overhang;

        const glyph = isGrandStaff
          ? createBraceSvg(spanHeight)
          : createBracketSvg(spanHeight);
        const glyphWidth = isGrandStaff ? BRACE_WIDTH_PX : BRACKET_WIDTH_PX;
        const gap = isGrandStaff ? BRACE_STAFF_GAP_PX : -BRACKET_STAFF_GAP_PX;
        glyph.style.left = `${-(glyphWidth + gap)}px`;
        glyph.style.top = `${topOffset}px`;
        container.appendChild(glyph);
      }
    }

    // A staff's `label` (e.g. "r.h."/"l.h.") renders as small text in the
    // margin, vertically centered on that staff's own slot — a system-start
    // decoration like the brace/bracket above, only drawn for the first
    // measure of each visual row.
    #renderStaffLabels(isFirstInRow: boolean) {
      const container =
        this.shadowRoot?.querySelector<HTMLElement>('.staff-labels');
      if (!container) {
        return;
      }

      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      if (!isFirstInRow) {
        this.classList.remove('has-staff-label');
        return;
      }

      const staves = Array.from(this.children).filter((el) =>
        isStaffNodeName(el.nodeName)
      ) as StaffElementBaseType[];

      const hasAnyLabel = staves.some(
        (staff) => staff.label !== null && staff.label !== ''
      );
      this.classList.toggle('has-staff-label', hasAnyLabel);
      if (!hasAnyLabel) {
        return;
      }

      // With a brace/bracket too, the label sits left of it.
      const groupConnectorWidthPx = this.classList.contains(
        'has-group-connector'
      )
        ? Math.max(BRACE_WIDTH_PX + BRACE_STAFF_GAP_PX, BRACKET_WIDTH_PX)
        : 0;

      const bands = this.#staffLineBands(staves);
      staves.forEach((staff, staffIndex) => {
        if (staff.label) {
          const el = document.createElement('div');
          el.classList.add('staff-label');
          el.style.left = `${-(
            groupConnectorWidthPx +
            STAFF_LABEL_WIDTH_PX +
            STAFF_LABEL_LEFT_MARGIN_PX
          )}px`;
          el.style.top = `${
            (bands[staffIndex].top + bands[staffIndex].bottom) / 2
          }px`;
          el.textContent = staff.label;
          container.appendChild(el);
        }
      });
    }

    // `measure-numbers` is read from the ancestor <music-composition>; a
    // standalone measure shows no number.
    #renderMeasureNumber(isFirstInRow: boolean, isLastInRow: boolean) {
      const container =
        this.shadowRoot?.querySelector<HTMLElement>('.measure-numbers');
      if (!container) {
        return;
      }

      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      const text = this.#numberText(isFirstInRow, isLastInRow);
      if (text === null) {
        return;
      }

      const el = document.createElement('div');
      el.classList.add('measure-number');
      el.textContent = text;
      container.appendChild(el);
    }

    // The number this bar shows, or null: none when `measure-numbers` is
    // `none`, otherwise when its rule picks this bar or the composition
    // forces it (an ending bar).
    #numberText(isFirstInRow: boolean, isLastInRow: boolean): string | null {
      const number = this.number;
      if (number === null) {
        return null;
      }
      const mode =
        parseMeasureNumberDisplay(
          this.closest(MUSIC_COMPOSITION)?.getAttribute('measure-numbers') ??
            null
        ) ?? 'none';
      const shouldShow =
        mode !== 'none' &&
        (this.#forceNumberDisplay ||
          mode === 'all' ||
          (mode === 'row-start' && isFirstInRow) ||
          (mode === 'row-end' && isLastInRow) ||
          (mode === 'odd' && number % 2 === 1) ||
          (mode === 'even' && number % 2 === 0));
      return shouldShow ? this.#numberLabel ?? `${number}` : null;
    }

    #displayedNumber(): string | null {
      if (this.parentNode === null) {
        return null;
      }
      const allMeasures = Array.from(
        this.parentNode.querySelectorAll(MUSIC_MEASURE)
      );
      const index = allMeasures.indexOf(this);
      return this.#numberText(
        this.#isFirstInRow(allMeasures, index),
        this.#isLastInRow(allMeasures, index)
      );
    }

    // Called by composition.ts when its `measure-numbers` changes.
    refreshMeasureNumberDisplay(): void {
      if (this.isConnected) {
        this.#updateConnectorVisibility();
      }
    }

    // Duck-typed from composition.ts, which reserves room for content drawn
    // past this measure's row. The largest reservation per side across every
    // source becomes this measure's margin; returns whether it changed.
    reserveVerticalSpace(source: string, space: VerticalBand): boolean {
      return this.#verticalSpace.reserve(source, space);
    }

    // An octave line continuing from an earlier measure is drawn by the
    // ancestor <music-composition>, which this measure can't see. It hands
    // over, per staff, the runs of elements such a line covers here (before
    // drawing, so octave breaks account for them) and then the drawn shapes
    // (so gap passes step around them). Each returns whether anything changed,
    // in which case the gap passes have already re-run.
    applyOctaveContinuationCoverage(
      coverage: ReadonlyMap<
        Element,
        readonly (readonly NoteChordOrRestElementType[])[]
      >
    ): boolean {
      const current = this.#octaveContinuationCoverage;
      const unchanged =
        current.size === coverage.size &&
        [...coverage].every(([staff, runs]) => {
          const before = current.get(staff);
          return (
            before !== undefined &&
            before.length === runs.length &&
            runs.every(
              (run, i) =>
                run.length === before[i].length &&
                run.every((element, j) => element === before[i][j])
            )
          );
        });
      if (unchanged) {
        return false;
      }
      this.#octaveContinuationCoverage = new Map(coverage);
      this.#redrawGapPasses();
      return true;
    }

    applyOctaveContinuationRects(
      measureRects: ReadonlyMap<Element, readonly ObstacleRect[]>
    ): boolean {
      // Kept relative to their staff's lines: a gap pass that widens the gap
      // moves the staff, and the shapes drawn against it move with it before
      // the composition redraws them.
      const measureTop = this.getBoundingClientRect().top;
      const rects = new Map(
        Array.from(measureRects, ([staff, staffRects]) => {
          const staffTop =
            this.#staffContainerRect(staff as StaffElementBaseType).top -
            measureTop;
          return [
            staff,
            staffRects.map((rect) => ({
              ...rect,
              top: rect.top - staffTop,
              bottom: rect.bottom - staffTop,
            })),
          ] as const;
        })
      );
      const current = this.#octaveContinuationRects;
      const close = (a: number, b: number) => Math.abs(a - b) < 0.5;
      const unchanged =
        current.size === rects.size &&
        [...rects].every(([staff, staffRects]) => {
          const before = current.get(staff);
          return (
            before !== undefined &&
            before.length === staffRects.length &&
            staffRects.every(
              (rect, i) =>
                close(rect.left, before[i].left) &&
                close(rect.right, before[i].right) &&
                close(rect.top, before[i].top) &&
                close(rect.bottom, before[i].bottom)
            )
          );
        });
      if (unchanged) {
        return false;
      }
      this.#octaveContinuationRects = new Map(rects);
      this.#redrawGapPasses();
      return true;
    }

    // Gap each pass needs widened, by staff (see addGapNeed). Every pass
    // re-reports on each run, so a staff takes the largest current need.
    #gapClearanceByPass = new Map<
      string,
      ReadonlyMap<StaffElementBaseType, VerticalBand>
    >();

    #applyGapClearance(
      pass: string,
      needs: ReadonlyMap<StaffElementBaseType, VerticalBand>,
      staves: readonly StaffElementBaseType[]
    ) {
      this.#gapClearanceByPass.set(pass, needs);
      let changed = false;
      for (const staff of staves) {
        // A staff parsed from markup before its definition has run is not
        // upgraded yet, so it has no methods.
        if (typeof staff.reserveGapClearance !== 'function') {
          continue;
        }
        const band = { top: 0, bottom: 0 };
        for (const passNeeds of this.#gapClearanceByPass.values()) {
          const need = passNeeds.get(staff);
          band.top = Math.max(band.top, need?.top ?? 0);
          band.bottom = Math.max(band.bottom, need?.bottom ?? 0);
        }
        changed = staff.reserveGapClearance(band) || changed;
      }
      if (changed) {
        this.#redrawGapPasses();
      }
    }

    // Everything placed in the gap between staves, in dependency order.
    #redrawGapPasses() {
      this.#redrawDoubleStemmedBeams();
      this.#redrawCrossStaffTremolos();
      this.#redrawCrossStaffTuplets();
      this.#redrawMeasureDynamics();
      this.#redrawConnectors();
    }
  }

  if (!customElements.get('music-measure')) {
    customElements.define('music-measure', MeasureElement);
  }
}
