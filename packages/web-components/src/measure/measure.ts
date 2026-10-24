import {
  type ArpeggioEntry,
  resolveArpeggioSpans,
} from '../rules/arpeggioRules';
import {
  BeamLineDescriptor,
  computeBeamLevelStructure,
} from '../rules/beamStructureRules';
import {
  type ObstacleRect,
  sliceConvexPolygon,
} from '../rules/connectorPlacementRules';
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
} from '../rules/dynamicsRules';
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
import { resolveStaffGroups } from '../rules/staffGroupRules';
import { measureFlexValue } from '../rules/staffWidth';
import {
  durationToFactor,
  durationToFlagCountMap,
} from '../rules/theoryConsts';
import {
  parseTupletRatio,
  type TupletBracketGeometry,
} from '../rules/tupletRules';
import { computeBandOverflow, VerticalBand } from '../rules/verticalSpaceRules';
import type {
  NoteChordOrRestElementType,
  NoteOrChordElementType,
  RestElementType,
  StaffElementBaseType,
  TupletElementType,
} from '../types/elements';
import type { DynamicMarking, HairpinKind } from '../types/theory';
import {
  appendArpeggioHairpin,
  COMMON_ATTRIBUTES,
  createAngledHairpinSvg,
  createArpeggioSvg,
  createBraceSvg,
  createBracketSvg,
  createDoubleStemmedBeamPolygon,
  createDynamicMarkingSvg,
  createHairpinSvg,
  createSharedStemLine,
  createTupletBracketSvg,
  isStaffNodeName,
  MUSIC_CHORD,
  MUSIC_COMPOSITION,
  MUSIC_MEASURE,
  MUSIC_NOTE,
  MUSIC_REST,
  MUSIC_REST_NODE,
  MUSIC_TUPLET,
  MUSIC_VOICE,
  NOTE_EVENTS,
  STAFF_EVENTS,
  SVG_NS,
  TUPLET_EVENTS,
} from '../utils';
import {
  buildConnectorSvgs,
  collectArpeggioTiePairs,
  collectEntryObstacles,
  collectNoteLikeElements,
  collectPhraseSlurPairs,
  collectStemRects,
  isInnerVoiceMember,
  pairConnectors,
  partitionByVoice,
  resolveDoubleStemmedBeamConnectorContext,
  resolveSlurGroupPlacement,
} from '../utils/connectorsBuilder';
import {
  ARPEGGIO_CHORD_GAP_PX,
  ARPEGGIO_WAVE_WIDTH_PX,
  BEAM_GAP_PX,
  BEAM_THICKNESS_PX,
  BRACE_STAFF_GAP_PX,
  BRACE_WIDTH_PX,
  BRACKET_LINE_OVERHANG_PX,
  BRACKET_STAFF_GAP_PX,
  BRACKET_WIDTH_PX,
  DOUBLE_STEMMED_BEAM_MIN_STEM_PX,
  DYNAMICS_BASELINE_Y,
  EMPTY_MEASURE_FLEX_BASIS_PX,
  FRACTIONAL_BEAM_WIDTH_PX,
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
  TUPLET_NUMERAL_FONT_SIZE,
  VERTICAL_OVERFLOW_CLEARANCE_PX,
} from '../utils/notationDimensions';
import { parseMeasureNumberDisplay } from '../utils/parsers';
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
  markings: { marking: DynamicMarking; centerX: number; y: number }[];
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
// (staffClassicalBase.ts#tupletExtremeY's numeral offset) — so it moves with
// the beam and has to clear what the beam clears.
function hangingTupletNumeralShapes(
  memberGeometries: readonly {
    element: Element;
    stemUp: boolean;
    point: { x: number };
  }[]
): DoubleStemmedBeamAttachedShape[] {
  const byTuplet = new Map<Element, { xs: number[]; stemUp: boolean }>();
  for (const { element, stemUp, point } of memberGeometries) {
    const tuplet = element.closest(MUSIC_TUPLET);
    if (tuplet === null) {
      continue;
    }
    const entry = byTuplet.get(tuplet) ?? { xs: [], stemUp };
    entry.xs.push(point.x);
    byTuplet.set(tuplet, entry);
  }
  const near = BEAM_THICKNESS_PX + TUPLET_NUMERAL_BEAM_GAP_PX;
  const far = near + TUPLET_NUMERAL_FONT_SIZE;
  return Array.from(byTuplet.values(), ({ xs, stemUp }) => ({
    left: Math.min(...xs),
    right: Math.max(...xs),
    topOffset: stemUp ? -far : near,
    bottomOffset: stemUp ? -near : far,
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
      ];
    }

    #staffConnectorObserver: ResizeObserver;
    #staffWidths = new Map<
      EventTarget,
      { minWidth: number; naturalWidth: number }
    >();
    // Elements #redrawSharedStems currently holds noStem=true on. Tracked
    // (rather than inferred fresh each pass) so a pairing that stops
    // resolving — shared-stem-for removed, or the pair broken — reliably
    // restores that element's own local stem instead of leaving it
    // suppressed forever with nothing left to un-suppress it.
    #sharedStemSuppressedElements = new Set<NoteOrChordElementType>();
    #verticalSpace = new VerticalSpaceReservations(this);
    // See applyOctaveContinuationCoverage/applyOctaveContinuationRects.
    #octaveContinuationCoverage = new Map<
      Element,
      readonly (readonly NoteChordOrRestElementType[])[]
    >();
    // Relative to each staff's top line (see applyOctaveContinuationRects).
    #octaveContinuationRects = new Map<Element, readonly ObstacleRect[]>();
    #onStaffMinWidth = (event: Event): void => {
      const customEvent = event as CustomEvent<{
        minWidth: number;
        naturalWidth: number;
      }>;
      if (customEvent.target) {
        this.#staffWidths.set(customEvent.target, {
          minWidth: customEvent.detail.minWidth,
          naturalWidth: customEvent.detail.naturalWidth,
        });
      }
      const widths = [...this.#staffWidths.values()];
      const maxMinWidth = Math.max(...widths.map((w) => w.minWidth));
      const maxNaturalWidth = Math.max(...widths.map((w) => w.naturalWidth));
      // flex grow == basis == natural width, so measures on a row share it as
      // naturalWidth_i ÷ Σ naturalWidth. min-width is the collision strut (never
      // below the absolute floor), set apart from the basis so a crowded measure
      // can still shrink toward it before the row wraps.
      this.style.flex = measureFlexValue(maxNaturalWidth);
      this.style.minWidth = `${Math.max(maxMinWidth, MEASURE_MIN_WIDTH_PX)}px`;
      // Staves have just (re)laid out their notes — refresh any continuous
      // cross-staff arpeggio that spans them, any double-stemmed beam, and
      // any tie/slur/etc. across this measure's own staves. Connectors run
      // *after* double-stemmed beams — a slur may need to read the real,
      // already-drawn beam polygon to avoid crossing it (Chapter G).
      this.#redrawArpeggios();
      this.#redrawDoubleStemmedBeams();
      this.#redrawCrossStaffTuplets();
      this.#redrawMeasureDynamics();
      this.#redrawConnectors();
      this.#redrawSharedStems();
    };
    #boundUpdateConnectorVisibility: () => void;
    #boundRedrawArpeggios = () => this.#redrawArpeggios(true);
    #boundRedrawCrossStaffTuplets = () => this.#redrawCrossStaffTuplets();
    // A staff's margin can change mid-render (its own headroom) or from the
    // composition's row alignment; either moves its lines, so only the
    // system decorations re-lay — not the beam/connector redraw chain, which
    // the staff's own NOTES_POSITIONED already covers.
    #boundLayoutSystemDecorations = (event: Event) => {
      if (event.target !== this) {
        this.#layoutSystemDecorations();
      }
    };
    // A plain beam-group attribute change (no geometry change on its own)
    // only ever dispatches BEAM_GROUP_ATTRIBUTE_CHANGE — the resulting stem
    // override, once pushed onto each staff, still triggers that staff's own
    // full #renderNotes() (real geometry follows from there), same shape as
    // #boundRedrawMeasureDynamics below.
    #boundRedrawDoubleStemmedBeams = () => this.#redrawDoubleStemmedBeams();
    // Same shape as #boundRedrawDoubleStemmedBeams above, for
    // shared-stem-for pairs.
    #boundRedrawSharedStems = () => this.#redrawSharedStems();
    // A plain tie/slur attribute change (no geometry change) only ever
    // dispatches CONNECTOR_ATTRIBUTE_CHANGE, never STAFF_MIN_WIDTH — mirrors
    // composition.ts's own listener for the same event/reason.
    #boundRedrawConnectors = () => this.#redrawConnectors();
    // Likewise, a `dynamic`/`dynamic-shared` attribute change only ever
    // dispatches DYNAMIC_ATTRIBUTE_CHANGE (staffClassicalBase.ts's own
    // listener re-runs its local #renderDynamics, not a full layout pass).
    // Also re-run after anything that redraws the beams or cross-staff
    // tuplets this pass avoids, so each registration below follows theirs.
    #boundRedrawMeasureDynamics = () => this.#redrawMeasureDynamics();
    #boundRedrawGapPasses = () => this.#redrawGapPasses();

    constructor() {
      super();

      this.attachShadow({ mode: 'open' });
      const composition = this.closest(MUSIC_COMPOSITION);
      if (composition) {
        this.time = composition.getAttribute(COMMON_ATTRIBUTES.TIME) ?? '4/4';
        this.mode = composition.getAttribute(COMMON_ATTRIBUTES.MODE) ?? 'major';
        this.keySig =
          composition.getAttribute(COMMON_ATTRIBUTES.KEY_SIG) ?? 'C';
      }

      this.#boundUpdateConnectorVisibility =
        this.#updateConnectorVisibility.bind(this);
      this.#staffConnectorObserver = new ResizeObserver(
        this.#boundUpdateConnectorVisibility
      );
    }

    get number(): number | null {
      const value = this.getAttribute('number');
      if (value === null) return null;
      return parseInt(value);
    }

    set number(value: number | null) {
      if (value === null) this.removeAttribute('number');
      else this.setAttribute('number', value.toString());
    }

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

    connectedCallback(): void {
      this.render();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- a measure is always slotted into a parent
      this.#staffConnectorObserver.observe(this.parentElement!);
      this.addEventListener(
        STAFF_EVENTS.STAFF_MIN_WIDTH,
        this.#onStaffMinWidth
      );
      // A staff's own ResizeObserver-driven onStaffResize() re-runs
      // #spaceElements() (resetting every entry's real position, including
      // a cross-staff rest's own style.left — style.top is separately
      // guarded via externallyPositionedRestIndices, but left isn't)
      // without going through the STAFF_MIN_WIDTH dispatch above, so a
      // cross-staff rest's stem-avoidance nudge needs this event too, or
      // that staff-level reset silently outlives the last redraw that
      // applied it.
      this.addEventListener(
        STAFF_EVENTS.NOTES_POSITIONED,
        this.#boundRedrawDoubleStemmedBeams
      );
      this.addEventListener(
        STAFF_EVENTS.NOTES_POSITIONED,
        this.#boundRedrawCrossStaffTuplets
      );
      this.addEventListener(
        TUPLET_EVENTS.ATTRIBUTE_CHANGE,
        this.#boundRedrawCrossStaffTuplets
      );
      this.addEventListener(
        STAFF_EVENTS.NOTES_POSITIONED,
        this.#boundRedrawMeasureDynamics
      );
      this.addEventListener(
        TUPLET_EVENTS.ATTRIBUTE_CHANGE,
        this.#boundRedrawMeasureDynamics
      );
      this.addEventListener(
        STAFF_EVENTS.VERTICAL_SPACE_CHANGE,
        this.#boundLayoutSystemDecorations
      );
      // Registered after the beams listener above — a slur may need to
      // read the real, already-drawn beam polygon to avoid crossing it
      // (Chapter G), so connectors must redraw after beams do, both here
      // and via #onStaffMinWidth/#updateConnectorVisibility's own call
      // order.
      this.addEventListener(
        STAFF_EVENTS.NOTES_POSITIONED,
        this.#boundRedrawConnectors
      );
      this.addEventListener(
        STAFF_EVENTS.NOTES_POSITIONED,
        this.#boundRedrawSharedStems
      );
      this.addEventListener(
        STAFF_EVENTS.GROUP_ATTRIBUTE_CHANGE,
        this.#boundUpdateConnectorVisibility
      );
      this.addEventListener(
        STAFF_EVENTS.LABEL_ATTRIBUTE_CHANGE,
        this.#boundUpdateConnectorVisibility
      );
      this.addEventListener(
        NOTE_EVENTS.ARPEGGIO_ATTRIBUTE_CHANGE,
        this.#boundRedrawArpeggios
      );
      this.addEventListener(
        NOTE_EVENTS.CONNECTOR_ATTRIBUTE_CHANGE,
        this.#boundRedrawConnectors
      );
      this.addEventListener(
        NOTE_EVENTS.DYNAMIC_ATTRIBUTE_CHANGE,
        this.#boundRedrawMeasureDynamics
      );
      this.addEventListener(
        NOTE_EVENTS.BEAM_GROUP_ATTRIBUTE_CHANGE,
        this.#boundRedrawDoubleStemmedBeams
      );
      this.addEventListener(
        NOTE_EVENTS.BEAM_GROUP_ATTRIBUTE_CHANGE,
        this.#boundRedrawMeasureDynamics
      );
      // Registered after the beams listener above, for the same reason as
      // the NOTES_POSITIONED pair — a beam-group membership change can
      // change which beam (if any) a slur needs to avoid, or whether its
      // two endpoints now share a resolved group at all.
      this.addEventListener(
        NOTE_EVENTS.BEAM_GROUP_ATTRIBUTE_CHANGE,
        this.#boundRedrawConnectors
      );
      this.addEventListener(
        NOTE_EVENTS.REST_STAFF_SIDE_ATTRIBUTE_CHANGE,
        this.#boundRedrawDoubleStemmedBeams
      );
      // The staff redraws its octave signs first (it sits nearer the note
      // the event bubbles from); the beam and gap decorations then step
      // around the new ones.
      this.addEventListener(
        NOTE_EVENTS.OCTAVE_ATTRIBUTE_CHANGE,
        this.#boundRedrawGapPasses
      );
      this.addEventListener(
        NOTE_EVENTS.REST_STAFF_SIDE_ATTRIBUTE_CHANGE,
        this.#boundRedrawMeasureDynamics
      );
      this.addEventListener(
        NOTE_EVENTS.SHARED_STEM_ATTRIBUTE_CHANGE,
        this.#boundRedrawSharedStems
      );
    }

    disconnectedCallback(): void {
      this.#staffConnectorObserver.disconnect();
      this.removeEventListener(
        STAFF_EVENTS.STAFF_MIN_WIDTH,
        this.#onStaffMinWidth
      );
      this.removeEventListener(
        STAFF_EVENTS.NOTES_POSITIONED,
        this.#boundRedrawDoubleStemmedBeams
      );
      this.removeEventListener(
        STAFF_EVENTS.NOTES_POSITIONED,
        this.#boundRedrawConnectors
      );
      this.removeEventListener(
        STAFF_EVENTS.NOTES_POSITIONED,
        this.#boundRedrawSharedStems
      );
      this.removeEventListener(
        STAFF_EVENTS.GROUP_ATTRIBUTE_CHANGE,
        this.#boundUpdateConnectorVisibility
      );
      this.removeEventListener(
        STAFF_EVENTS.LABEL_ATTRIBUTE_CHANGE,
        this.#boundUpdateConnectorVisibility
      );
      this.removeEventListener(
        NOTE_EVENTS.ARPEGGIO_ATTRIBUTE_CHANGE,
        this.#boundRedrawArpeggios
      );
      this.removeEventListener(
        NOTE_EVENTS.CONNECTOR_ATTRIBUTE_CHANGE,
        this.#boundRedrawConnectors
      );
      this.removeEventListener(
        NOTE_EVENTS.DYNAMIC_ATTRIBUTE_CHANGE,
        this.#boundRedrawMeasureDynamics
      );
      this.removeEventListener(
        STAFF_EVENTS.NOTES_POSITIONED,
        this.#boundRedrawMeasureDynamics
      );
      this.removeEventListener(
        TUPLET_EVENTS.ATTRIBUTE_CHANGE,
        this.#boundRedrawMeasureDynamics
      );
      this.removeEventListener(
        NOTE_EVENTS.BEAM_GROUP_ATTRIBUTE_CHANGE,
        this.#boundRedrawMeasureDynamics
      );
      this.removeEventListener(
        NOTE_EVENTS.REST_STAFF_SIDE_ATTRIBUTE_CHANGE,
        this.#boundRedrawMeasureDynamics
      );
      this.removeEventListener(
        NOTE_EVENTS.BEAM_GROUP_ATTRIBUTE_CHANGE,
        this.#boundRedrawDoubleStemmedBeams
      );
      this.removeEventListener(
        NOTE_EVENTS.BEAM_GROUP_ATTRIBUTE_CHANGE,
        this.#boundRedrawConnectors
      );
      this.removeEventListener(
        NOTE_EVENTS.REST_STAFF_SIDE_ATTRIBUTE_CHANGE,
        this.#boundRedrawDoubleStemmedBeams
      );
      this.removeEventListener(
        NOTE_EVENTS.OCTAVE_ATTRIBUTE_CHANGE,
        this.#boundRedrawGapPasses
      );
      this.removeEventListener(
        STAFF_EVENTS.NOTES_POSITIONED,
        this.#boundRedrawCrossStaffTuplets
      );
      this.removeEventListener(
        TUPLET_EVENTS.ATTRIBUTE_CHANGE,
        this.#boundRedrawCrossStaffTuplets
      );
      this.removeEventListener(
        STAFF_EVENTS.VERTICAL_SPACE_CHANGE,
        this.#boundLayoutSystemDecorations
      );
      this.removeEventListener(
        NOTE_EVENTS.SHARED_STEM_ATTRIBUTE_CHANGE,
        this.#boundRedrawSharedStems
      );
      this.#staffWidths.clear();
    }

    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null
    ): void {
      if (oldValue !== newValue) {
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
            margin-left: ${Math.max(
              BRACE_WIDTH_PX + BRACE_STAFF_GAP_PX,
              BRACKET_WIDTH_PX
            )}px;
          }

          :host(.has-staff-label) {
            margin-left: ${STAFF_LABEL_WIDTH_PX + STAFF_LABEL_LEFT_MARGIN_PX}px;
          }

          /* Combined reservation is summed, not jointly tuned — a v1
             simplification when a measure has both a brace/bracket and a
             staff label (see packages/web-components/CLAUDE.md). */
          :host(.has-group-connector.has-staff-label) {
            margin-left: ${
              Math.max(BRACE_WIDTH_PX + BRACE_STAFF_GAP_PX, BRACKET_WIDTH_PX) +
              STAFF_LABEL_WIDTH_PX +
              STAFF_LABEL_LEFT_MARGIN_PX
            }px;
          }

          /* A one-column grid so staves' vertical-space margins add up
             instead of collapsing: the first staff's top margin would
             otherwise escape through this box, and two staves' facing
             margins would share space each needs. Not a flex column — a staff's own flex basis would become
             its height. */
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

          .arpeggio-connectors {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: visible;
            color: currentColor;
          }

          .connectors-overlay {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: visible;
            color: currentColor;
          }

          .shared-dynamics-overlay {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: visible;
            color: currentColor;
          }

          .double-stemmed-beams-overlay {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: visible;
            color: currentColor;
          }

          .cross-staff-tuplets-overlay {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: visible;
            color: currentColor;
          }

          .shared-stems-overlay {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: visible;
            color: currentColor;
          }
        </style>
        <div class="measure-content">
          <div class="staff-connector"></div>
          <div class="group-connectors"></div>
          <div class="staff-labels"></div>
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

    // A staff with a `group` attribute joins a brace/bracket connector with
    // other staves — implicitly via position (pairs with its immediate next
    // sibling) or, for brackets spanning more than 2 staves, explicitly via
    // a shared `group-id`. Resolution/validation is a pure function
    // (rules/staffGroupRules.ts) so it stays independently testable; this
    // method only turns the resolved spans into positioned SVG glyphs.
    //
    // Like the plain barline, a brace/bracket is a system-start decoration:
    // only the first measure of a visual row draws one, even when every
    // measure in the row carries the same grouped staves (see
    // composition.ts's showDescribe for the analogous clef/key/time
    // behavior). `isFirstInRow` is computed once by the caller
    // (#updateConnectorVisibility) — when false, any glyph left over from a
    // previous layout pass is cleared and nothing new is resolved/drawn.
    // An unbroken cross-staff arpeggio (one continuous wavy line through both
    // staves of a grand staff) is drawn here rather than per-staff: the staff
    // SVG can't reach across the inter-staff gap. Pairing/validation is the
    // pure resolveArpeggioSpans (rules/arpeggioRules.ts); this method only
    // measures the paired elements, suppresses their own per-staff signs, and
    // draws the single spanning glyph. A "broken" arpeggio (each hand rolled
    // independently) needs nothing here — it is just two per-staff signs.
    //
    // `reReserveSpanEnds` is set only on the arpeggio-attribute-change path (not
    // the per-render STAFF_MIN_WIDTH path, which would loop): a hairpin authored,
    // changed, or removed on either span endpoint can change the *other* end's
    // reserved left footprint (its own footprint helper resolves the hairpin
    // from either end — see footprintArpeggioHairpin in staffClassicalBase.ts),
    // but that other staff never saw the attribute change itself, so nudge both
    // ends to re-space.
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
      const elementSelector = `${MUSIC_NOTE}:not(${MUSIC_CHORD} ${MUSIC_NOTE}):defined, ${MUSIC_CHORD}:defined`;
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
      // Span endpoints whose staff must re-space so it reserves room for the
      // partner's hairpin (each end's own footprint helper resolves the
      // hairpin from either end — see footprintArpeggioHairpin in
      // staffClassicalBase.ts). Nudged for both ends, regardless of which one
      // currently carries the attribute: an attribute change could just as
      // easily remove a hairpin (shrinking the *other* end's reservation) as
      // add one (growing it), and the hairpin can be authored on either end.
      // Nudged *after* the loop — a re-space synchronously re-runs this
      // method, which would otherwise resolve/redraw the overlay mid-loop.
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
            signLeftEdgeX: rightEdgeX - ARPEGGIO_WAVE_WIDTH_PX,
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

      // Now the overlay is fully drawn: nudge each span endpoint whose staff
      // needs to reserve room for the partner's hairpin (or shrink back down
      // once one is removed). Each re-space re-runs this method (without
      // `reReserveSpanEnds`), which redraws the overlay at the corrected
      // position and settles.
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

    // A staff custom element's own outer box (staffBase.ts's `.staff-wrapper`)
    // always includes its built-in STAFF_LINE_START/STAFF_BOTTOM_MARGIN
    // padding around the visible lines — two grand-staff siblings stack with
    // no margin *between* their outer boxes, so one's bottom edge is always
    // flush with the next one's top edge regardless of how much real visual
    // room the padding gives the actual staff lines. `.staff-container` is
    // the inner element the padding surrounds (its own border-top/bottom act
    // as the staff's outermost lines), so its real rect is the correct
    // boundary for "the real gap between two staves."
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

    // Resolves a beam-hugging rest's real target Y (measure-relative,
    // the glyph's own visible feature — not the box-top; see
    // restRules.ts#restGlyphOffsetFromBoxTop) for #redrawDoubleStemmedBeams.
    // Prefers REST_BEAM_CLEARANCE_PX past the beam's own near edge, but
    // pulls back toward the beam (never past it, floored at BEAM_GAP_PX)
    // when that preferred position would land within
    // MIN_REST_NOTE_CLEARANCE_PX of the nearest real notehead — increasing
    // the clearance from the beam moves *toward* a note further past it, so
    // hugging the beam more tightly, not less, is what actually creates
    // room here.
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

    // Pushes y clear of [bandTop, bandBottom] toward whichever edge is
    // nearer, clamped to [minY, maxY] — shared by both obstacles a
    // "centered" rest must avoid (the real, possibly-sloped beam at its own
    // X, and the nearest real notehead), each with its own clearance
    // already folded into the band's own edges by the caller.
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

    // Resolves a "centered" rest's real target Y — the real inter-staff
    // gap's vertical center. That center is a fixed value (the two staves'
    // own static edges), but the beam it sits beside can be sloped, so the
    // beam's own real position at this rest's specific X can drift well
    // past the gap's fixed center — first pushed clear of the beam's own
    // real band (REST_BEAM_CLEARANCE_PX, same as a hugging rest), then of
    // the nearest real notehead (MIN_REST_NOTE_CLEARANCE_PX), each clamped
    // back into the gap itself.
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

    // Real geometry of a note/chord's own currently-rendered stem — null
    // when it has none (a duration with no stem at all, e.g. whole notes).
    // Used by #redrawDoubleStemmedBeams to read each cross-staff member's
    // own provisional (zero-extension) stem-tip position before bridging it
    // to the shared beam.
    #stemRect(element: NoteOrChordElementType): DOMRect | null {
      const stem = element.shadowRoot?.querySelector('.stem');
      return stem ? stem.getBoundingClientRect() : null;
    }

    // Ties/slurs/etc. across this measure's own staves (e.g. a slur from one
    // hand of a grand staff to the other). A <music-composition> ancestor
    // already runs the same pairing composition-wide via its own
    // #redrawConnectors — bail here so the two passes don't double-draw.
    // Each staff already bails out of its own standalone connector drawing
    // once it has a <music-measure> ancestor (staffBase.ts), so this is the
    // only place same-staff *and* cross-staff pairs get drawn for a
    // standalone measure.
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

      const noteLikeElements = collectNoteLikeElements(this);
      const byVoice = partitionByVoice(noteLikeElements);
      const pairs = [
        ...[...byVoice.values()].flatMap((notes) => pairConnectors(notes)),
        ...collectArpeggioTiePairs(this),
        ...collectPhraseSlurPairs(this),
      ];
      if (pairs.length === 0) {
        this.#reserveOverlaySpace(overlay);
        return;
      }

      const rootRect = this.getBoundingClientRect();

      // Double-stemmed beam-group awareness: a slur whose endpoints share a
      // resolved group is placed over that group's two staves, an
      // inner-voice member anchors its own end at its stem, and same-staff
      // slurs avoid the real beam polygons. Shared with composition.ts's own
      // #redrawConnectors — see resolveDoubleStemmedBeamConnectorContext.
      // Warnings are skipped here — #redrawDoubleStemmedBeams (which this
      // method's own callers always run first, see above) already logs
      // them for this same redraw cycle.
      const { beamRects, elementToGroup, innerVoiceStemAnchorElements } =
        resolveDoubleStemmedBeamConnectorContext([this], rootRect);

      const svgs = buildConnectorSvgs(pairs, {
        rootRect,
        rowLeft: 0,
        rowRight: rootRect.width,
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
    // it avoids, and before connectors. Never defers to composition.ts — a
    // measure's own staves are always the unit for "the gap between two
    // staves"; composition.ts skips the same-measure pairs drawn here.
    // Placement is decided first and pushed onto each staff
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
          createDynamicMarkingSvg(marking.marking, marking.centerX, marking.y)
        );
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
          awayDirection
        );
      };
      const leftX = (element: NoteOrChordElementType) =>
        element.getBoundingClientRect().left - measureRect.left;
      const spanFor = (
        start: NoteOrChordElementType,
        end: NoteOrChordElementType,
        gap: { topGapEdgeY: number; bottomGapEdgeY: number }
      ) => {
        const startText = start.dynamic
          ? {
              marking: start.dynamic,
              centerX: textCenterX(start, start.dynamic, -1, gap),
            }
          : null;
        const endText = end.dynamic
          ? {
              marking: end.dynamic,
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
          obstacles.push(estimateDynamicTextBox(text.marking, text.centerX, y));
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
        for (const head of heads) {
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
          const spans = resolveChainSpans(
            chain.map((pair) => ({
              rawStartX: leftX(pair.startElement),
              rawEndX:
                pair.endElement.getBoundingClientRect().right -
                measureRect.left,
            })),
            chainElements.map((element, index) =>
              element.dynamic === null
                ? null
                : {
                    marking: element.dynamic,
                    centerX: textCenterX(
                      element,
                      element.dynamic,
                      index === 0 ? -1 : 1,
                      gap
                    ),
                  }
            )
          );
          const overlapsGroup = spans.some((span) =>
            groupSlices.some(
              (slice) => slice.right > span.startX && slice.left < span.endX
            )
          );
          if (!overlapsGroup) {
            continue;
          }

          const levelChainClear = (y: number, from: number) =>
            chain.slice(from).every((pair, offset) => {
              const span = spans[from + offset];
              return isHorizontalHairpinClear({
                kind: pair.kind,
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
          const defaultY = head.baselineClientY - measureRect.top;
          const defaultInGap =
            defaultY - HAIRPIN_OPEN_HEIGHT / 2 > gap.topGapEdgeY &&
            defaultY + HAIRPIN_OPEN_HEIGHT / 2 < gap.bottomGapEdgeY;
          if (
            head.side === gapSide &&
            defaultInGap &&
            levelChainClear(defaultY, 0)
          ) {
            continue;
          }

          const route = resolveAngledHairpinRoute({
            kind: head.kind,
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
            placeHairpin(head.kind, route.start, route.end, true);
            placeText(spans[0].startText, route.start.y);
            placeText(spans[0].endText, route.end.y);
            override(staff, head.startElement, {
              hairpin: 'measure',
              marking: 'measure',
            });
            override(staff, head.endElement, { marking: 'measure' });
            chain.slice(1).forEach((pair, offset) => {
              const span = spans[offset + 1];
              const y = route.end.y;
              placeHairpin(
                pair.kind,
                { x: span.startX, y },
                { x: span.endX, y },
                false
              );
              placeText(span.endText, y);
              override(staff, pair.startElement, { hairpin: 'measure' });
              override(staff, pair.endElement, { marking: 'measure' });
            });
            continue;
          }

          if (head.side === gapSide) {
            for (const pair of chain) {
              override(staff, pair.startElement, {
                hairpin: outsideSide,
                marking: outsideSide,
              });
              override(staff, pair.endElement, { marking: outsideSide });
            }
          }
        }
      });

      staves.forEach((staff, staffIndex) => {
        const gap = gapBetween(staffIndex, partnerOf(staffIndex));
        const elements = Array.from(
          staff.querySelectorAll(
            `${MUSIC_NOTE}:not(${MUSIC_CHORD} ${MUSIC_NOTE}):defined, ${MUSIC_CHORD}:defined`
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
          const text = { marking: element.dynamic, centerX };
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

    // Re-entry guard for the redraw passes that write staff bridge
    // properties (crossStaffTupletBeamY, crossStaffBeamStemOverrides,
    // crossStaffTupletRoles): each synchronously triggers a full staff
    // re-render on change, which synchronously dispatches the very event
    // the pass itself listens for — a real, observed-live infinite
    // recursion (confirmed via a live CDP-attached debugging session, not
    // just a theoretical risk): during a Storybook story teardown/mount
    // transition, real geometry measurements can genuinely fail to
    // stabilize pass to pass (rather than merely jittering by sub-pixel
    // noise, which CROSS_STAFF_TUPLET_BEAM_Y_EPSILON_PX alone was meant to
    // absorb), so each reentrant pass computes a value just different
    // enough to trigger another one — deepening until the call stack
    // overflows, which some outer handler (the browser's own event/observer
    // dispatch machinery) catches and silently retries on the next frame,
    // forever, freezing the tab. A depth cap bounds the recursion
    // unconditionally, regardless of why the underlying geometry doesn't
    // settle — same principle as a ResizeObserver's own built-in loop-limit
    // protection. isConnected guards the case that actually triggers this:
    // a redraw reached via a stale/queued callback after this element (or
    // its parent) has already been removed from the document, measuring
    // elements mid-teardown.
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

    // Resolves cross-staff double-stemmed beam groups (`beam-group`) over
    // every staff's own top-level element stream, then pushes the correct
    // per-element stem direction onto each involved staff — top-staff members
    // always stem down, bottom-staff members always stem up (see the
    // double-stemmed-beams plan's Stem-direction resolution section), the
    // same static, non-pitch-driven policy voice 1/voice 2 already use.
    // A staff's own render pass (staffClassicalBase.ts) still decides
    // everything else about beam grouping and geometry; this only resolves
    // *which direction* a cross-staff member's stem points, so its own
    // BeamsBuilder pass (which excludes these indices from same-staff
    // grouping) has a correct direction to render with in the meantime,
    // before a later phase draws the real shared beam polygon.
    #redrawDoubleStemmedBeams() {
      this.#guardedRedraw('double-stemmed beam', () =>
        this.#redrawDoubleStemmedBeamsImpl()
      );
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
            members: tuplet.flatElements.map((element) => ({
              element,
              isRest: element.nodeName === MUSIC_REST_NODE,
              beatLength: durationToFactor[element.duration],
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
        const notesOnly = {
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
          group: {
            element: group.topTuplet,
            indices: [],
            parsedRatio: parseTupletRatio(group.topTuplet.ratio),
            nestingLevel: 0,
          },
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

    // Real DOM entries gathering for beam-group resolution — shared by
    // #redrawDoubleStemmedBeamsImpl (which owns warning logging) and
    // #redrawConnectors (silent: both run on every redraw cycle today, and
    // logging the same warnings twice per cycle would be noise, not signal).
    #gatherDoubleStemmedBeamEntries(): {
      staves: StaffElementBaseType[];
      perStaffElements: NoteChordOrRestElementType[][];
      entries: DoubleStemmedBeamEntry[];
    } {
      const staves = Array.from(this.children).filter((el) =>
        isStaffNodeName(el.nodeName)
      ) as StaffElementBaseType[];

      const elementSelector = `${MUSIC_NOTE}:not(${MUSIC_CHORD} ${MUSIC_NOTE}):defined, ${MUSIC_CHORD}:defined, ${MUSIC_REST}:defined`;
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

      // rest-staff-side is only ever meaningful for a rest that's a member
      // of a resolved, active beam-group (it's a position relative to the
      // shared beam / real inter-staff gap, neither of which exist
      // otherwise) — warn, same shape as an unmatched arpeggio-for, rather
      // than silently ignoring an author's explicit override.
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

      // Pass 1 (stem-direction convergence): resolve + push each involved
      // staff's own per-element override. Each staff's own #renderNotes()
      // re-render (inside the crossStaffBeamStemOverrides setter) is
      // synchronous, so pass 2 below can safely measure real,
      // post-direction-change geometry immediately after this loop.
      // Keyed by the element itself, not member.entryIndex — entryIndex is
      // this flat, staff-wide traversal's own position, but a multi-voice
      // staff's own render pass looks the override up per-voice, against
      // that voice's own local element array (see
      // rules/beamRules.ts#buildBeamsRenderer's comment on the same
      // mismatch) — the two index spaces only coincide for a single-voice
      // staff, so only the element reference itself is a safe, universal key.
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- crossStaffBeamStemOverrides is staff-internal (StaffClassicalElementBase), not part of the shared StaffElementBaseType surface — same precedent as showDescribe/clefChangeAtBoundary in composition.ts
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

      // A cross-staff-beamed member that's also inside a <music-tuplet>
      // needs its own staff's tuplet numeral/bracket to clear the real
      // shared beam, not a plain staff-coord derivation — populated per
      // group in Pass 2 below (it needs the group's own real beamYAtX),
      // applied to every staff in one pass afterward so a staff with no
      // (or no longer any) covered tuplet member is correctly reset to
      // null, same discipline as overridesByStaffIndex above.
      const tupletBeamYByStaffIndex = new Map<
        number,
        Map<NoteChordOrRestElementType, number>
      >();
      const applyCrossStaffTupletBeamY = () => {
        staves.forEach((staff, staffIndex) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- crossStaffTupletBeamY is staff-internal (StaffClassicalElementBase), not part of the shared StaffElementBaseType surface — same precedent as crossStaffBeamStemOverrides above
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

      // Pass 2 (coordinate bridging): resolve the shared beam line per group
      // from each non-rest member's own, now-correctly-directioned
      // provisional stem tip, then push each member's real stemExtension to
      // reach it — a note-local write (re-renders only that note's own
      // stem), not a further staff relayout.
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
          // Un-shift back to the zero-extension baseline before using it as
          // "natural" input: a previous redraw cycle may have already
          // applied a stemExtension here (increasing it moves a stem-up tip
          // to a *smaller* Y, a stem-down tip to a *larger* Y — the inverse
          // of that is added back here). Without this, re-running this
          // method (it fires on every STAFF_MIN_WIDTH / resize, not just
          // once) would re-measure its own previous output as if it were
          // fresh input, never converging to a stable, correct target.
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

        const resolvedLine = resolveDoubleStemmedBeamLine(
          memberGeometries.map((g) => g.point),
          topGapEdgeY,
          bottomGapEdgeY
        );
        const firstX = memberGeometries[0].point.x;
        const lastX = memberGeometries[memberGeometries.length - 1].point.x;

        // Secondary/fractional beams (mixed durations within the group) —
        // computeBeamLevelStructure is the same pure level-by-level run
        // detection a same-staff beam group uses (rules/beamStructureRules.ts),
        // fed this group's own non-rest members' flag counts in order; its
        // local indices line up 1:1 with memberGeometries. Resolved before
        // the beam's final height, since the stack is part of what has to
        // clear a gap-side octave sign.
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
        const beamStep = BEAM_THICKNESS_PX + BEAM_GAP_PX;
        const segmentXRange = (segment: BeamLineDescriptor) => {
          let x1 = memberGeometries[segment.fromNoteIndex].point.x;
          let x2 = memberGeometries[segment.toNoteIndex].point.x;
          if (segment.fractionalBeamSide === 'left') {
            x1 -= FRACTIONAL_BEAM_WIDTH_PX;
          } else if (segment.fractionalBeamSide === 'right') {
            x2 += FRACTIONAL_BEAM_WIDTH_PX;
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
          // createDoubleStemmedBeamPolygon (below) always draws its
          // thickness growing downward from beamY, so beamY is the
          // polygon's TOP edge regardless of which staff this member
          // belongs to — both directions target the same point,
          // STEM_OVERLAP_PX past that edge, so the tip sits slightly
          // inside the polygon body (not at its edge) rather than
          // outside it. (A top-staff/stem-down tip subtracting the
          // overlap here would land above the polygon entirely — a real
          // bug found via visual review, not merely a style choice.)
          const targetY = beamY + STEM_OVERLAP_PX;
          const extension = stemUp
            ? point.naturalY - targetY
            : targetY - point.naturalY;
          element.stemExtension = extension;

          // Inner-voice articulation anchor — svgCreator/articulations.ts
          // already knows this element's own real stem-tip position
          // locally (from stemUp/stemExtension/duration), so all it needs
          // from here is the policy (non-null: anchor next to the shared
          // beam, on the stem's own side, instead of the ordinary
          // notehead-relative default every outer-voice/single-voice member
          // keeps) and how many secondary/fractional levels lie between the
          // tip and the beam surface facing the notehead.
          element.articulationStemAnchorBeamLevels = isInnerVoiceMember(
            element,
            staves[staffIndex]
          )
            ? deepestLevelByIndex.get(i) ?? 0
            : null;

          // Tuplet numeral/bracket bridging — see crossStaffTupletBeamY on
          // StaffClassicalElementBase. Both beamY and point.naturalY (this
          // element's own real, zero-extension natural stem tip, already
          // computed above) are measure-relative real px, so their
          // difference is a real, origin-independent delta — the target
          // staff adds it directly onto its own analytically-derived
          // natural stem-tip Y (the same value its own fallback already
          // computes), never needing to know this staff's real render
          // origin at all.
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

        // Rest placement within the group — "above"/"below" sit just
        // above/below the shared beam itself (a rest cutting through it
        // would obscure the rhythm), "centered" sits at the real gap's
        // vertical center. A rest and the real note it "hugs" toward (or,
        // for "centered", either staff's nearest note) are frequently at
        // the very same X (same beat — see classifyAutoRestStaffSide),
        // so the flat beam/gap-relative target alone can't guarantee real
        // clearance from it; #restHuggingTargetY / #restCenteredTargetY
        // check the real nearest notehead and back off before that ever
        // happens (vertically) — the horizontal nudge below handles the
        // same member's own stem, which the vertical check alone can't
        // see. The resolved target is this rest's own visible glyph
        // feature's Y, in measure-relative real px — converted into this
        // rest's own staff-local coordinate space by subtracting that
        // staff's own real top before handing it to restRules.ts, which
        // stays DOM-free.
        const gapCenterYReal = (topGapEdgeY + bottomGapEdgeY) / 2;
        for (let i = 0; i < group.members.length; i++) {
          const member = group.members[i];
          if (!member.isRest) {
            continue;
          }
          const element = perStaffElements[member.staffIndex][
            member.entryIndex
          ] as RestElementType;
          // This staff's own #spaceElements() always (re)computes and
          // writes this rest's natural style.left unconditionally on
          // every pass (only style.top is guarded for a cross-staff
          // rest — see externallyPositionedRestIndices) — so, unlike the
          // stem-extension bridging above, there is nothing here to
          // un-shift: restRect.left always reflects this staff's own
          // fresh natural position, never a previous nudge from below.
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

          // The rest and its nearest real member are frequently at the
          // very same X (same beat — the note it precedes or hugs
          // toward), meaning that member's own stem spans the entire
          // distance between its notehead and the beam right through
          // where the rest sits, regardless of how much vertical
          // clearance the rest has from the notehead itself. Nudge left,
          // clear of the stem, rather than trying to out-space it
          // vertically in a gap the stem already fully occupies — computed
          // from the real note's own stable x (nearestGeoX, driven by this
          // staff's own natural spacing, never by this rest's own position)
          // so it stays idempotent across repeated redraw cycles, the same
          // way the un-shift trick keeps the stem-extension bridging above
          // idempotent without needing one itself here.
          if (
            nearestGeoX !== null &&
            nearestDist < REST_STEM_AVOIDANCE_THRESHOLD_PX
          ) {
            // Unlike Y (where sibling staves sit at real, genuinely
            // different vertical offsets from the measure, requiring
            // staffOffsetY above), every staff's own local X origin
            // already coincides with the measure's — staves stack
            // vertically, never inset horizontally from one another — so
            // this measure-relative real x converts to this rest's own
            // local left directly, with no staff offset to subtract.
            // Positions the rest's own *right* edge (not its center)
            // REST_STEM_AVOIDANCE_NUDGE_PX clear of the stem's real X, so
            // the rest's own width doesn't eat back into that clearance.
            element.style.left = `${
              nearestGeoX - REST_STEM_AVOIDANCE_NUDGE_PX - restRect.width
            }px`;
          }
        }

        if (segments.length === 0) {
          continue;
        }

        // A member on the group's resolved secondary side already reaches
        // every level on its way to the primary (that side's stems and the
        // secondary stack both move the same direction — same as a
        // same-staff beam). A member on the OPPOSITE side does not: the
        // secondary sits further from its own notehead than the primary
        // does, not between the two, so its stem must be re-extended past
        // the primary to reach the deepest level it actually participates
        // in — mirrors "a note's stem always reaches the outermost beam
        // level it's part of." A plain member with no secondary/fractional
        // participation (deepest level 0) is untouched.
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

    // "Keep all secondary beams on the same side" — each segment's own side
    // (rules/doubleStemmedBeamRules.ts#resolveSecondaryBeamVerticalSide),
    // then one majority side for the group, tie-broken toward the primary
    // beam's own slope; a perfectly horizontal beam has no such lean, so
    // 'bottom' is an arbitrary but deterministic default there.
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

    // shared-stem-for: both hands occasionally playing the same beat
    // simultaneously in otherwise single-part writing, joined with one
    // real stem instead of each drawing its own — a separate, simpler
    // mechanism from #redrawDoubleStemmedBeams above (a 1:1 id reference
    // like arpeggio-for, not an N:M shared beam-group key; no beam polygon,
    // just one line directly between two real noteheads).
    #redrawSharedStems() {
      const staves = Array.from(this.children).filter((el) =>
        isStaffNodeName(el.nodeName)
      ) as StaffElementBaseType[];

      const elementSelector = `${MUSIC_NOTE}:not(${MUSIC_CHORD} ${MUSIC_NOTE}):defined, ${MUSIC_CHORD}:defined`;
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

      // A pair that resolved on a previous pass but no longer does (the
      // attribute changed, or the pair broke) must have its own local
      // stem restored — nothing else would ever flip noStem back off,
      // since the staff itself never manages this property (unlike
      // stemExtension/rest positioning, which the staff's own render pass
      // guards against via externallyBeamedIndices).
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

        // noStem's own setter isn't dirty-checked (unlike stemExtension's),
        // so guard the write here — this redraw fires on every resize, and
        // an unconditional set would re-trigger that note's own render on
        // every pass for no reason.
        if (!topElement.noStem) {
          topElement.noStem = true;
        }
        if (!bottomElement.noStem) {
          bottomElement.noStem = true;
        }
        overlay.appendChild(createSharedStemLine(x, topY, bottomY));
      }
    }

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

      // A brace/bracket glyph is drawn with a negative `left` (see below),
      // poking out past this measure's own box — this class reserves that
      // space via `margin-left` (see the :host(.has-group-connector) rule
      // above) so the glyph isn't clipped by / doesn't overlap whatever
      // sits to this measure's left, whether standalone or inside a
      // <music-composition>.
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

      // When a brace/bracket is also present, it draws in this same
      // coordinate space, spanning from x=0 back to -groupConnectorWidthPx —
      // the label needs to sit further left than its own margin alone to
      // clear it, matching the :host(.has-group-connector.has-staff-label)
      // margin reservation above, or the two visually overlap.
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

    // Which measures actually show their own `number` is a whole-composition
    // policy (row-start/row-end describe how the *entire* piece wraps, not a
    // single measure's own concern), so the mode is read from the ancestor
    // <music-composition> — never this measure's own attribute. No ancestor
    // means no policy to read, so a standalone measure never shows a number.
    #renderMeasureNumber(isFirstInRow: boolean, isLastInRow: boolean) {
      const container =
        this.shadowRoot?.querySelector<HTMLElement>('.measure-numbers');
      if (!container) {
        return;
      }

      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      const number = this.number;
      if (number === null) {
        return;
      }

      const mode =
        parseMeasureNumberDisplay(
          this.closest(MUSIC_COMPOSITION)?.getAttribute('measure-numbers') ??
            null
        ) ?? 'none';
      const shouldShow =
        mode === 'all' ||
        (mode === 'row-start' && isFirstInRow) ||
        (mode === 'row-end' && isLastInRow) ||
        (mode === 'odd' && number % 2 === 1) ||
        (mode === 'even' && number % 2 === 0);
      if (!shouldShow) {
        return;
      }

      const el = document.createElement('div');
      el.classList.add('measure-number');
      el.textContent = `${number}`;
      container.appendChild(el);
    }

    // Duck-typed call from composition.ts's attributeChangedCallback when
    // its own `measure-numbers` attribute changes — this measure reads that
    // attribute live (via closest(), above) whenever it redraws, so this
    // just needs to force a redraw, mirroring refreshInheritedAttrs?.() on
    // staves for key-sig/mode/time.
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
      this.#redrawCrossStaffTuplets();
      this.#redrawMeasureDynamics();
      this.#redrawConnectors();
    }
  }

  if (!customElements.get('music-measure')) {
    customElements.define('music-measure', MeasureElement);
  }
}
