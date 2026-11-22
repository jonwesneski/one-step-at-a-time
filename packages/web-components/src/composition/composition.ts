import {
  type RepeatEvent,
  repeatPickupWarning,
  resolveBarlineJunction,
  type ResolvedEndBarline,
  resolveEndBarline,
  resolveRepeatSpans,
  type StartRepeatMode,
} from '../rules/barlineRules';
import type { ObstacleRect } from '../rules/connectorPlacementRules';
import {
  type HairpinEndpoint,
  pairHairpinsWithLeftovers,
  pairSharedHairpinsAcrossStaves,
  resolveHairpinSegments,
} from '../rules/dynamicsRules';
import {
  type EndingGroup,
  type EndingMeasureInput,
  type EndingSegment,
  resolveEndingNumberLabels,
  resolveEndings,
  resolveEndingSegments,
} from '../rules/endingRules';
import {
  dynamicTextCenterClearOfStems,
  type HairpinEndpointText,
  resolveSharedHairpinY,
} from '../rules/hairpinPlacementRules';
import {
  type EndWarnings,
  type KeyChange,
  keySignatureEquals,
  type KeySignatureState,
  mergeEndWarnings,
} from '../rules/keySignatureChangeRules';
import {
  isOctaveRaise,
  type OctaveMeasureBoundary,
  type OctaveSpan,
  resolveOctaveContinuationSegments,
  resolveOctaveSpans,
} from '../rules/octaveRules';
import {
  type BoundaryState,
  type Component,
  type DescribeReminder,
  resolveRepeatWarnings,
} from '../rules/repeatWarningRules';
import type { MarkerBeat } from '../rules/streamMarkerRules';
import {
  resolveTrillContinuationSegments,
  resolveTrillSpans,
  type TrillMeasureBoundary,
} from '../rules/trillRules';
import {
  computeBandOverflow,
  maxVerticalBand,
  VerticalBand,
} from '../rules/verticalSpaceRules';
import type {
  ChordElementType,
  NoteChordOrRestElementType,
  NoteElementType,
  NoteLikeElementType,
  NoteOrChordElementType,
  StaffElementBaseType,
} from '../types/elements';
import type {
  ClefType,
  EndingNumbering,
  HairpinKind,
  MeasureNumberDisplay,
  OctaveShiftAmount,
  TimeSignature,
  VoiceNumber,
} from '../types/theory';
import {
  createDynamicMarkingSvg,
  createHairpinSvg,
  createOctaveContinuationSignSvg,
  createOctaveCornerSvg,
  createOctaveExtensionLineSvg,
  createOctaveLocoLabelSvg,
  createOctaveSignSvg,
  createTrillContinuationSignSvg,
  createTrillLineSvg,
  createTrillNotchSvg,
  NOTE_HEAD_Y_OFFSET_CORRECTION,
  octaveSignWidth,
} from '../utils';
import {
  buildConnectorSvgs,
  collectArpeggioTiePairs,
  collectEntryObstacles,
  collectNoteLikeElements,
  collectPhraseSlurPairs,
  collectStemRects,
  type ConnectorPair,
  type EntryObstacles,
  pairConnectors,
  partitionByVoice,
  resolveDoubleStemmedBeamConnectorContext,
  resolveSlurGroupPlacement,
} from '../utils/connectorsBuilder';
import {
  BARLINE_EVENTS,
  COMMON_ATTRIBUTES,
  isStaffNodeName,
  MEASURE_EVENTS,
  MUSIC_CHORD,
  MUSIC_CHORD_NODE,
  MUSIC_COMPOSITION,
  MUSIC_MEASURE,
  MUSIC_MEASURE_NODE,
  MUSIC_NOTE,
  MUSIC_NOTE_NODE,
  MUSIC_REST_NODE,
  NOTATION_STAFF_TAGS,
  NOTE_EVENTS,
  STAFF_EVENTS,
  STAFF_TAGS,
} from '../utils/consts';
import {
  COMPOSITION_MAX_WIDTH_PX,
  DYNAMICS_BASELINE_Y,
  HAIRPIN_OPEN_HEIGHT,
  OCTAVE_LOCO_GAP_PX,
  OCTAVE_SIGN_ABOVE_STAFF_Y,
  OCTAVE_SIGN_BELOW_STAFF_Y,
  OCTAVE_SIGN_CORNER_PX,
  OCTAVE_SIGN_LEADING_GAP_PX,
  OCTAVE_SIGN_LINE_GAP_PX,
  OCTAVE_SIGN_TRAILING_GAP_PX,
  STAFF_TOP_LINE_Y,
  STAFF_Y_PADDING,
  TRILL_ABOVE_STAFF_GAP_PX,
  TRILL_LINE_END_GAP_PX,
  TRILL_SIGN_LINE_GAP_PX,
  VERTICAL_OVERFLOW_CLEARANCE_PX,
} from '../utils/notationDimensions';
import {
  parseEnding,
  parseEndingNumbering,
  parseMeasureEndBarline,
  parseMeasureNumberDisplay,
} from '../utils/parsers';
import {
  flattenSlotElements,
  flattenStaffSlotElements,
} from '../utils/slotElements';
import { measureVerticalExtents } from '../utils/verticalSpace';

// Larger than any real measure width, so a measure-major ordinal never lets
// x within one measure overtake the next measure.
const MEASURE_ORDINAL_STRIDE = 1_000_000;

// The trill line's Y offset from its staff's top, matching
// staffNotationBase.ts#redrawTrillLines so continuations line up.
const TRILL_LINE_ROOT_Y_OFFSET =
  STAFF_Y_PADDING +
  STAFF_TOP_LINE_Y -
  NOTE_HEAD_Y_OFFSET_CORRECTION -
  TRILL_ABOVE_STAFF_GAP_PX;

const ROW_OVERLAY_SOURCE = 'row-overlay';

// The staff accessors the barline passes read and set, duck-typed so this
// module needn't import the staff classes.
type BarlineStaff = HTMLElement & {
  time: string;
  endBarline: ResolvedEndBarline;
  startRepeat: StartRepeatMode;
  measureMarkerBeats?: readonly MarkerBeat[];
  showDescribe?: boolean;
  clefChangeAtBoundary?: boolean;
  timeChangeAtBoundary?: boolean;
  keyChangeAtBoundary?: KeyChange | null;
};

// The state accessors and repeat properties the repeat-continuity pass reads
// and sets on a staff; absent where a staff has no such concept.
type RepeatStaff = HTMLElement & {
  time: string;
  effectiveStartClef?: ClefType | null;
  effectiveEndClef?: ClefType | null;
  clefAtBeat?: (beat: number) => ClefType | null;
  effectiveKeySignature?: KeySignatureState;
  describeReminder?: DescribeReminder | null;
  markerWarnings?: ReadonlyMap<number, ClefType>;
};

// The ending accessors <music-measure> exposes, duck-typed like
// reserveMeasureSpace below.
type EndingHost = HTMLElement & {
  applyEndingSegment?: (segment: EndingSegment | null) => boolean;
};

type MeasureNumbering = HTMLElement & {
  numberLabel?: string | null;
  forceNumberDisplay?: boolean;
};

// The key-signature accessors the key and end-warning passes read and set;
// absent on guitar tab.
type KeyStaff = HTMLElement & {
  effectiveKeySignature?: KeySignatureState;
  keyChangeAtBoundary?: KeyChange | null;
  endWarnings?: EndWarnings | null;
};

// The measure an octave line crossing a barline starts in, which its own
// staff draws.
type OctaveSpanStart = {
  staff: HTMLElement;
  element: NoteChordOrRestElementType;
  rowIndex: number;
  /** That measure's elements the line runs over, in order. */
  covered: NoteChordOrRestElementType[];
};

// One measure's share of an octave line that started in an earlier measure.
type OctaveContinuation = {
  staff: HTMLElement;
  span: OctaveSpan;
  start: OctaveSpanStart;
  rowIndex: number;
  raisesPitch: boolean;
  isRowWrap: boolean;
  restatesSign: boolean;
  /** This measure's elements the line runs over, in order. */
  covered: NoteChordOrRestElementType[];
  /** The element whose corner closes the span here; null runs to the barline. */
  stopElement: NoteChordOrRestElementType | null;
  /**
   * The line's row in this system, in the staff's local coordinates (see
   * #applyOctaveRowHeights); null until resolved or when no measure in the
   * system gave one.
   */
  rowY: number | null;
};

// A classical staff's octave-row hooks, duck-typed like reserveMeasureSpace
// below.
type OctaveRowSource = HTMLElement & {
  octaveRowY?: (
    elements: readonly Element[],
    amount: OctaveShiftAmount
  ) => number | null;
  octaveLocalToClientY?: (y: number) => number;
  octaveContinuations?: ReadonlyMap<
    Element,
    { rowY: number; raisesPitch: boolean; starts: boolean }
  > | null;
};

// <music-measure>'s continuation hand-off and a staff's octave breaks,
// duck-typed like reserveMeasureSpace below.
type OctaveContinuationReceiver = HTMLElement & {
  applyOctaveContinuationCoverage?: (
    coverage: ReadonlyMap<
      Element,
      readonly (readonly NoteChordOrRestElementType[])[]
    >
  ) => boolean;
  applyOctaveContinuationRects?: (
    rects: ReadonlyMap<
      Element,
      readonly { left: number; right: number; top: number; bottom: number }[]
    >
  ) => boolean;
};
type OctaveBreakSource = HTMLElement & {
  crossStaffOctaveBreakAfter?: ReadonlySet<Element> | null;
};

// <music-measure>'s reserveVerticalSpace, duck-typed so this file needn't
// import the measure class.
const reserveMeasureSpace = (
  measure: HTMLElement,
  space: VerticalBand
): boolean =>
  (
    measure as HTMLElement & {
      reserveVerticalSpace?: (source: string, space: VerticalBand) => boolean;
    }
  ).reserveVerticalSpace?.(ROW_OVERLAY_SOURCE, space) ?? false;

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  /**
   * The top-level score container. Holds `<music-measure>` children, flows them
   * into rows with `flex-wrap`, and reflows on resize (clef/key/time visibility,
   * bar-line connectors, cross-measure ties and slurs all recompute). Key
   * signature, mode and time set here are inherited by every descendant staff
   * unless overridden lower down.
   *
   * @customElement music-composition
   * @attr {Note} key-sig - Key-signature tonic inherited by child measures/staves (e.g. `C`, `F#`, `Bb`). Defaults to `C`.
   * @attr {'major' | 'minor'} mode - Key-signature mode. Defaults to `major`.
   * @attr {TimeSignature} time - Beats per measure (e.g. `4/4`, `6/8`). Defaults to `4/4`.
   * @attr {number | 'none'} max-width - Caps the rendered score width in px (default 900); `none` fills the container.
   * @attr {'none' | 'all' | 'row-start' | 'row-end' | 'odd' | 'even'} measure-numbers - Which measures show their own `number`. Defaults to `none`. A standalone `<music-measure>` (no composition ancestor) has no way to opt in and never shows its number.
   * @attr {boolean} double-bar-before-repeat - Ends a row with a thin double barline when the next row starts with a start repeat, as some editions do.
   * @attr {'consecutive' | 'duplicate'} ending-numbering - How bars inside first-/second-time endings are numbered: `consecutive` (default) counts straight through; `duplicate` numbers every ending from the same bar with a letter per ending (19a, 19b). Ending bars show their numbers whenever `measure-numbers` isn't `none`.
   *
   * @example
   * <music-composition key-sig="G" mode="major" time="4/4">
   *   <music-measure>
   *     <music-staff clef="treble">
   *       <music-note note="G" octave="4" duration="quarter"></music-note>
   *     </music-staff>
   *   </music-measure>
   * </music-composition>
   */
  class CompositionElement extends HTMLElement {
    static get observedAttributes(): string[] {
      // All attributes need to be all lower case because jsdom lowers then
      // in it's life-cycle
      return [
        COMMON_ATTRIBUTES.KEY_SIG,
        COMMON_ATTRIBUTES.MODE,
        COMMON_ATTRIBUTES.TIME,
        'max-width',
        'measure-numbers',
        'double-bar-before-repeat',
        'ending-numbering',
      ];
    }

    #observer: MutationObserver | null;
    #resizeObserver: ResizeObserver | null;
    #rowSpaceMeasures = new Set<HTMLElement>();
    #rowAlignedStaves = new Set<StaffElementBaseType>();
    #redrawScheduled: boolean;
    #boundRedraw: () => void;
    // An ending or barline change can renumber bars, which only the
    // composition sees whole.
    #boundRepeatAttributeChange = () => {
      this.#renumberMeasures();
      this.#scheduleRedraw();
    };

    constructor() {
      super();
      this.#observer = null;
      this.#resizeObserver = null;
      this.#redrawScheduled = false;
      this.#boundRedraw = () => this.#scheduleRedraw();
      this.attachShadow({ mode: 'open' });
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

    get time(): string {
      return this.getAttribute(COMMON_ATTRIBUTES.TIME) ?? '4/4';
    }

    set time(value: string) {
      this.setAttribute(COMMON_ATTRIBUTES.TIME, value);
    }

    get maxWidth(): string {
      return this.getAttribute('max-width') ?? String(COMPOSITION_MAX_WIDTH_PX);
    }

    set maxWidth(value: string) {
      this.setAttribute('max-width', value);
    }

    get measureNumbers(): MeasureNumberDisplay {
      return (
        parseMeasureNumberDisplay(this.getAttribute('measure-numbers')) ??
        'none'
      );
    }

    set measureNumbers(value: MeasureNumberDisplay) {
      this.setAttribute('measure-numbers', value);
    }

    /** `max-width` attribute → a CSS length for `.composition-wrapper`. */
    #resolveMaxWidthCss(): string {
      const raw = this.getAttribute('max-width');
      if (raw === null) {
        return `${COMPOSITION_MAX_WIDTH_PX}px`;
      }
      if (raw.trim().toLowerCase() === 'none') {
        return 'none';
      }
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0
        ? `${parsed}px`
        : `${COMPOSITION_MAX_WIDTH_PX}px`;
    }

    connectedCallback(): void {
      this.render();
      this.#manageMeasureCount();
      this.#observeForRedraws();
    }

    disconnectedCallback(): void {
      for (const measure of this.#rowSpaceMeasures) {
        reserveMeasureSpace(measure, { top: 0, bottom: 0 });
      }
      this.#rowSpaceMeasures.clear();
      for (const staff of this.#rowAlignedStaves) {
        staff.alignVerticalSpace({ top: 0, bottom: 0 });
      }
      this.#rowAlignedStaves.clear();
      this.#observer?.disconnect();
      this.#observer = null;
      this.#resizeObserver?.disconnect();
      this.#resizeObserver = null;
      for (const [type, listener] of this.#listeners()) {
        this.removeEventListener(type, listener);
      }
    }

    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null
    ): void {
      if (oldValue === newValue) {
        return;
      }
      if (
        name === COMMON_ATTRIBUTES.KEY_SIG ||
        name === COMMON_ATTRIBUTES.MODE ||
        name === COMMON_ATTRIBUTES.TIME
      ) {
        Array.from(this.querySelectorAll(STAFF_TAGS)).forEach((staff) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duck-typed call to avoid cross-module import
          (staff as any).refreshInheritedAttrs?.();
        });
      }
      if (name === 'measure-numbers') {
        // A measure resolves its effective display mode live via
        // closest(MUSIC_COMPOSITION) whenever it redraws — this just needs
        // to force that redraw, mirroring refreshInheritedAttrs?.() above.
        Array.from(this.querySelectorAll(MUSIC_MEASURE)).forEach((measure) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duck-typed call to avoid cross-module import
          (measure as any).refreshMeasureNumberDisplay?.();
        });
      }
      if (name === 'double-bar-before-repeat') {
        this.#scheduleRedraw();
      }
      if (name === 'ending-numbering') {
        this.#renumberMeasures();
        this.#scheduleRedraw();
      }
      if (name === 'max-width') {
        // Push the new cap onto the live wrapper rather than re-rendering: a
        // shadow-DOM rebuild would replace the <slot> and orphan the
        // slotchange listener wired in #observeForRedraws(). Then reflow rows
        // so describe/clef/time-signature continuity tracks the new wrapping.
        const wrapper = this.shadowRoot?.querySelector<HTMLElement>(
          '.composition-wrapper'
        );
        if (wrapper) {
          wrapper.style.maxWidth = this.#resolveMaxWidthCss();
        }
        this.#scheduleRedraw();
      }
    }

    private render(): void {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constructor attaches the shadow root
      this.shadowRoot!.innerHTML = `
        <style>
          :host {
            display: block;
            width: 100%;
          }

          .composition-wrapper {
            position: relative;
            width: 100%;
            max-width: ${this.#resolveMaxWidthCss()};
            margin: 0 auto;
          }

          .composition-grid {
            position: relative;
            display: flex;
            flex-wrap: wrap;
            width: 100%;
          }

          ${MUSIC_MEASURE} {
            min-width: 100px;
            box-sizing: border-box;
          }

          .connectors-overlay {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: visible;
            color: currentColor;
          }

          .trill-continuation-overlay {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: visible;
            color: currentColor;
          }

          .octave-continuation-overlay {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: visible;
            color: currentColor;
          }
        </style>
        <div class="composition-wrapper">
          <div class="composition-grid">
            <slot></slot>
          </div>
          <svg class="connectors-overlay"></svg>
          <svg class="trill-continuation-overlay"></svg>
          <svg class="octave-continuation-overlay"></svg>
        </div>
      `;
    }

    // One list serves both add and remove, so the two can't drift apart.
    #listeners(): [string, EventListener][] {
      return [
        [STAFF_EVENTS.NOTES_POSITIONED, this.#boundRedraw],
        [NOTE_EVENTS.CONNECTOR_ATTRIBUTE_CHANGE, this.#boundRedraw],
        [NOTE_EVENTS.DYNAMIC_ATTRIBUTE_CHANGE, this.#boundRedraw],
        [NOTE_EVENTS.TRILL_ATTRIBUTE_CHANGE, this.#boundRedraw],
        [NOTE_EVENTS.OCTAVE_ATTRIBUTE_CHANGE, this.#boundRedraw],
        [STAFF_EVENTS.GROUP_ATTRIBUTE_CHANGE, this.#boundRedraw],
        [STAFF_EVENTS.LABEL_ATTRIBUTE_CHANGE, this.#boundRedraw],
        [
          MEASURE_EVENTS.REPEAT_ATTRIBUTE_CHANGE,
          this.#boundRepeatAttributeChange,
        ],
        [BARLINE_EVENTS.ATTRIBUTE_CHANGE, this.#boundRedraw],
      ];
    }

    #observeForRedraws() {
      this.#resizeObserver = new ResizeObserver(this.#boundRedraw);
      this.#resizeObserver.observe(this);

      const slot = this.shadowRoot?.querySelector('slot');
      slot?.addEventListener('slotchange', this.#boundRedraw);

      for (const [type, listener] of this.#listeners()) {
        this.addEventListener(type, listener);
      }
    }

    #scheduleRedraw() {
      if (this.#redrawScheduled) {
        return;
      }

      this.#redrawScheduled = true;
      // Passes that move notes run before passes that draw from note
      // positions, so each frame paints from final geometry. Width changes
      // from showing/hiding clef/key/time are re-spaced here, not on the next
      // ResizeObserver callback.
      requestAnimationFrame(() => {
        this.#redrawScheduled = false;
        if (!this.isConnected) {
          return;
        }
        this.#alignRowStaffSpace();
        this.#updateDescribeVisibility();
        const repeats = this.#resolveRepeatContinuity();
        const courtesyClefs = this.#updateClefContinuity(repeats.held);
        this.#updateTimeSignatureContinuity(repeats.held);
        const courtesyKeys = this.#updateKeySignatureContinuity(repeats.held);
        this.#assignEndWarnings(
          courtesyClefs,
          courtesyKeys,
          repeats.endWarnings
        );
        this.#updateBarlineJunctions();
        this.#validateRepeats();
        if (this.#updateEndings()) {
          this.#alignRowStaffSpace();
        }
        for (const staff of Array.from(
          this.querySelectorAll<StaffElementBaseType>(STAFF_TAGS)
        )) {
          staff.respaceToCurrentWidth();
        }
        const octaveContinuations = this.#resolveOctaveContinuations();
        this.#applyOctaveRowHeights(octaveContinuations);
        this.#applyOctaveContinuationCoverage(octaveContinuations);
        this.#redrawConnectors();
        if (this.#reserveRowOverlaySpace()) {
          this.#redrawConnectors();
        }
        this.#redrawHairpins();
        this.#redrawTrills();
        // A measure stepping its beams or gap decorations around a drawn
        // continuation moves what connectors and hairpins avoid.
        if (this.#redrawOctaveSigns(octaveContinuations)) {
          this.#redrawConnectors();
          this.#redrawHairpins();
        }
      });
    }

    // Reserves the same room on every measure in a row for connectors past
    // the row. Row bands exclude margin and curves move with their row, so
    // the next pass is stable. Returns whether any margin changed.
    #reserveRowOverlaySpace(): boolean {
      const overlay = this.shadowRoot?.querySelector('.connectors-overlay');
      if (!overlay) {
        return false;
      }
      const rows = this.#computeMeasureRows();
      const bands = rows.map((row) => {
        const rects = row.map((measure) => measure.getBoundingClientRect());
        return {
          top: Math.min(...rects.map((rect) => rect.top)),
          bottom: Math.max(...rects.map((rect) => rect.bottom)),
        };
      });
      const overflow = computeBandOverflow(
        bands,
        measureVerticalExtents(overlay, '.connector path'),
        VERTICAL_OVERFLOW_CLEARANCE_PX
      );

      let changed = false;
      const reservedMeasures = new Set<HTMLElement>();
      rows.forEach((row, index) => {
        for (const measure of row) {
          reservedMeasures.add(measure);
          changed = reserveMeasureSpace(measure, overflow[index]) || changed;
        }
      });
      for (const measure of this.#rowSpaceMeasures) {
        if (!reservedMeasures.has(measure)) {
          changed =
            reserveMeasureSpace(measure, { top: 0, bottom: 0 }) || changed;
        }
      }
      this.#rowSpaceMeasures = reservedMeasures;
      return changed;
    }

    // Gives the Nth staff of every measure in a row the largest margin its
    // content needs anywhere in the row, so staves stay in line. Reads content
    // headroom, not the alignment given, so the next pass is stable.
    #alignRowStaffSpace(): void {
      const alignedStaves = new Set<StaffElementBaseType>();
      for (const row of this.#computeMeasureRows()) {
        const stavesByMeasure = row.map(
          (measure) =>
            Array.from(measure.children).filter((el) =>
              isStaffNodeName(el.nodeName)
            ) as StaffElementBaseType[]
        );
        const staffCount = Math.max(
          0,
          ...stavesByMeasure.map((staves) => staves.length)
        );
        for (let index = 0; index < staffCount; index++) {
          const column = stavesByMeasure
            .map((staves) => staves[index])
            .filter((staff) => staff !== undefined);
          const space = maxVerticalBand(
            column.map((staff) => staff.contentVerticalSpace)
          );
          for (const staff of column) {
            alignedStaves.add(staff);
            staff.alignVerticalSpace(space);
          }
        }
      }
      for (const staff of this.#rowAlignedStaves) {
        if (!alignedStaves.has(staff)) {
          staff.alignVerticalSpace({ top: 0, bottom: 0 });
        }
      }
      this.#rowAlignedStaves = alignedStaves;
    }

    // Groups measures into visual rows by top-position (5px tolerance),
    // shared by every method here that needs row boundaries.
    #computeMeasureRows(): HTMLElement[][] {
      const measures = Array.from(
        this.querySelectorAll(MUSIC_MEASURE)
      ) as HTMLElement[];

      // Snapshot all top values before any mutations. Reading layout after a
      // showDescribe write triggers a reflow, which shifts subsequent
      // measures — causing later reads to see wrong row positions.
      const tops = measures.map((m) => m.getBoundingClientRect().top);

      const rows: HTMLElement[][] = [];
      let previousTop: number | null = null;
      for (let i = 0; i < measures.length; i++) {
        const top = tops[i];
        const isFirstInRow =
          previousTop === null || Math.abs(top - previousTop) > 5;
        previousTop = top;

        if (isFirstInRow) {
          rows.push([measures[i]]);
        } else {
          rows[rows.length - 1].push(measures[i]);
        }
      }
      return rows;
    }

    #redrawConnectors() {
      const overlay = this.shadowRoot?.querySelector<SVGSVGElement>(
        '.connectors-overlay'
      );
      const wrapper = this.shadowRoot?.querySelector<HTMLElement>(
        '.composition-wrapper'
      );
      if (!overlay || !wrapper) {
        return;
      }

      // Remove previously drawn connector curves before redrawing;
      // replaceChildren is not used for broader browser compatibility.
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
      this.#markDottedTiesAcrossBarlines(noteLikeElements, pairs);
      if (pairs.length === 0) {
        return;
      }

      const rootRect = wrapper.getBoundingClientRect();
      const rowLeft = this.#computeNotesAreaLeft(rootRect);

      // Double-stemmed beam context, as measure.ts#redrawConnectors resolves
      // it. This runs a frame after each measure drew its beam polygons.
      const measureElements = Array.from(this.querySelectorAll(MUSIC_MEASURE));
      const { beamRects, elementToGroup, innerVoiceStemAnchorElements } =
        resolveDoubleStemmedBeamConnectorContext(measureElements, rootRect);

      const svgs = buildConnectorSvgs(pairs, {
        rootRect,
        rowLeft,
        beamRects,
        groupSlurStaves: resolveSlurGroupPlacement(pairs, elementToGroup),
        innerVoiceElements: innerVoiceStemAnchorElements,
        entryObstacles: collectEntryObstacles(this, rootRect, measureElements),
      });
      for (const svg of svgs) {
        overlay.appendChild(svg);
      }
    }

    // Only a composition sees a tie cross a barline. Marking its end note
    // re-lays that staff out; the setter ignores an unchanged value, so the
    // redraw that follows settles.
    #markDottedTiesAcrossBarlines(
      noteLikeElements: readonly Element[],
      pairs: readonly ConnectorPair[]
    ): void {
      const crossing = new Set<Element>(
        pairs
          .filter(
            (pair) =>
              pair.kind === 'tie' &&
              pair.dotted === true &&
              pair.start.closest(MUSIC_MEASURE) !==
                pair.end.closest(MUSIC_MEASURE)
          )
          .map((pair) => pair.end)
      );
      for (const element of noteLikeElements) {
        if ('dottedTieAcrossBarline' in element) {
          (element as NoteOrChordElementType).dottedTieAcrossBarline =
            crossing.has(element);
        }
      }
    }

    #computeNotesAreaLeft(rootRect: DOMRect): number {
      const firstStaff = this.querySelector(STAFF_TAGS) as HTMLElement | null;
      if (!firstStaff?.shadowRoot) {
        return 0;
      }
      const describeContainer = firstStaff.shadowRoot.querySelector(
        '.describe-container'
      );
      if (!describeContainer) {
        return 0;
      }
      return describeContainer.getBoundingClientRect().right - rootRect.left;
    }

    #computeNotesAreaLeftForStaff(
      staff: HTMLElement,
      rootRect: DOMRect
    ): number {
      const describeContainer = staff.shadowRoot?.querySelector(
        '.describe-container'
      );
      if (!describeContainer) {
        return 0;
      }
      return describeContainer.getBoundingClientRect().right - rootRect.left;
    }

    #getDynamicsBaselineY(element: Element, rootRect: DOMRect): number {
      const staff = element.closest(NOTATION_STAFF_TAGS) as HTMLElement | null;
      if (!staff) {
        return 0;
      }
      const staffRect = staff.getBoundingClientRect();
      return staffRect.top - rootRect.top + DYNAMICS_BASELINE_Y;
    }

    // Hairpins whose two ends sit in different measures. Each staff track
    // (every measure's Nth staff, see #buildStaffTracks) and voice pairs on
    // its own, so one hand's start never takes the other hand's end. A start
    // still open afterwards may end on the partner track — the other hand of
    // a grand staff; a shared (both-hands) one is drawn in that row's gap,
    // clear of beams, like measure.ts#redrawMeasureDynamics within a measure.
    #redrawHairpins() {
      const overlay = this.shadowRoot?.querySelector<SVGSVGElement>(
        '.connectors-overlay'
      );
      const wrapper = this.shadowRoot?.querySelector<HTMLElement>(
        '.composition-wrapper'
      );
      if (!overlay || !wrapper) {
        return;
      }

      const selector = `${MUSIC_NOTE}[crescendo], ${MUSIC_NOTE}[decrescendo], ${MUSIC_CHORD}[crescendo], ${MUSIC_CHORD}[decrescendo]`;
      const tracks = this.#buildStaffTracks();
      const measureOrder = new Map<Element, number>();
      tracks.flat().forEach(({ staff }) => {
        const measure = staff.closest(MUSIC_MEASURE);
        if (measure !== null && !measureOrder.has(measure)) {
          measureOrder.set(measure, measureOrder.size);
        }
      });
      // A composition-wide ordering for cross-track pairing: measure first,
      // then x within it.
      const ordinal = (element: Element) =>
        (measureOrder.get(element.closest(MUSIC_MEASURE) ?? element) ?? 0) *
          MEASURE_ORDINAL_STRIDE +
        element.getBoundingClientRect().left;

      const pairs: {
        kind: HairpinKind;
        startElement: NoteOrChordElementType;
        endElement: NoteOrChordElementType;
      }[] = [];
      const leftovers = tracks.map((track) => {
        const elements = track.flatMap(({ staff }) =>
          Array.from(staff.querySelectorAll(selector))
        ) as NoteLikeElementType[];
        const unpairedStarts: HairpinEndpoint[] = [];
        const orphanEnds: HairpinEndpoint[] = [];
        for (const voiceElements of partitionByVoice(elements).values()) {
          const pairing = pairHairpinsWithLeftovers(
            voiceElements as NoteChordOrRestElementType[],
            new Map(),
            { warnOrphans: false }
          );
          pairs.push(
            ...pairing.pairs.map((pair) => ({
              kind: pair.kind,
              startElement: pair.startElement,
              endElement: pair.endElement,
            }))
          );
          unpairedStarts.push(...pairing.unpairedStarts);
          orphanEnds.push(...pairing.orphanEnds);
        }
        return { unpairedStarts, orphanEnds };
      });
      leftovers.forEach(({ unpairedStarts }, trackIndex) => {
        const partnerTrackIndex =
          trackIndex + 1 < tracks.length ? trackIndex + 1 : trackIndex - 1;
        if (partnerTrackIndex < 0) {
          return;
        }
        const partnerEnds = leftovers[partnerTrackIndex].orphanEnds;
        const crossTrackPairs = pairSharedHairpinsAcrossStaves(
          unpairedStarts.map((start) => ({
            ...start,
            x: ordinal(start.element),
          })),
          partnerEnds.map((end) => ({ ...end, x: ordinal(end.element) }))
        );
        for (const { start, end } of crossTrackPairs) {
          partnerEnds.splice(
            partnerEnds.findIndex((other) => other.element === end.element),
            1
          );
          pairs.push({
            kind: start.kind,
            startElement: start.element,
            endElement: end.element,
          });
        }
      });
      for (const { orphanEnds } of leftovers) {
        for (const end of orphanEnds) {
          console.warn(
            `[dynamicsRules] orphan ${end.kind} end (no matching start)`
          );
        }
      }

      const rootRect = wrapper.getBoundingClientRect();
      let entryObstacles: EntryObstacles | null = null;
      let stems: ObstacleRect[] | null = null;
      const staffSelector = NOTATION_STAFF_TAGS;

      for (const pair of pairs) {
        const { startElement, endElement } = pair;

        // Skip pairs drawn elsewhere: intra-staff ones by the staff itself,
        // and a shared (both-hands) one within one measure by that measure
        // (measure.ts#redrawMeasureDynamics).
        const startStaff = startElement.closest(
          staffSelector
        ) as HTMLElement | null;
        const endStaff = endElement.closest(
          staffSelector
        ) as HTMLElement | null;
        if (startStaff !== null && startStaff === endStaff) {
          continue;
        }
        const startMeasure = startElement.closest(MUSIC_MEASURE);
        if (
          startElement.dynamicShared &&
          startMeasure !== null &&
          startMeasure === endElement.closest(MUSIC_MEASURE)
        ) {
          continue;
        }

        const startRect = startElement.getBoundingClientRect();
        const endRect = endElement.getBoundingClientRect();

        // Row membership compares the measures' tops: a note's own top moves
        // with its pitch, and a staff's with its place in the system.
        const rowTop = (element: Element, fallback: DOMRect) =>
          (element.closest(MUSIC_MEASURE)?.getBoundingClientRect() ?? fallback)
            .top - rootRect.top;
        const startBounds = {
          left: startRect.left - rootRect.left,
          right: startRect.right - rootRect.left,
          top: rowTop(startElement, startRect),
        };
        const endBounds = {
          left: endRect.left - rootRect.left,
          right: endRect.right - rootRect.left,
          top: rowTop(endElement, endRect),
        };

        const startCenterY = this.#getDynamicsBaselineY(startElement, rootRect);
        const endCenterY = this.#getDynamicsBaselineY(endElement, rootRect);

        // Use each staff's actual bounding rect so the hairpin ends exactly at
        // the barline (staff right edge) and begins exactly at the notes-area
        // left edge of the continuation row, regardless of composition width.
        const pairRowRight = startStaff
          ? startStaff.getBoundingClientRect().right - rootRect.left
          : rootRect.width;
        const pairRowLeft = endStaff
          ? this.#computeNotesAreaLeftForStaff(endStaff, rootRect)
          : this.#computeNotesAreaLeft(rootRect);

        const segments = resolveHairpinSegments(
          { ...pair, startX: 0, endX: 0, errors: [] },
          startBounds,
          endBounds,
          startCenterY,
          endCenterY,
          pairRowLeft,
          pairRowRight
        );

        const sharedText = (
          element: NoteOrChordElementType,
          include: boolean,
          awayDirection: -1 | 1
        ): HairpinEndpointText | null => {
          const staff = element.closest(staffSelector) as HTMLElement | null;
          const gap = this.#sharedHairpinGap(staff, rootRect);
          if (!include || element.dynamic === null || gap === null) {
            return null;
          }
          stems ??= collectStemRects(this, rootRect);
          return {
            marking: element.dynamic,
            bracketed: element.dynamicReminder,
            centerX: dynamicTextCenterClearOfStems(
              this.#headCenterX(element, rootRect),
              element.dynamic,
              stems,
              gap,
              awayDirection,
              element.dynamicReminder
            ),
          };
        };
        const startText = sharedText(
          startElement,
          startElement.dynamicShared,
          -1
        );
        const endText = sharedText(
          endElement,
          startElement.dynamicShared && endElement.dynamicShared,
          1
        );

        segments.forEach((segment, segmentIndex) => {
          let centerY = segment.centerY;
          const segmentStartText = segmentIndex === 0 ? startText : null;
          const segmentEndText =
            segmentIndex === segments.length - 1 ? endText : null;
          if (startElement.dynamicShared) {
            entryObstacles ??= collectEntryObstacles(
              this,
              rootRect,
              Array.from(this.querySelectorAll(MUSIC_MEASURE)),
              { excludeGlyphSelector: '.stem' }
            );
            const segmentStaff =
              segmentIndex === segments.length - 1 ? endStaff : startStaff;
            const gap = this.#sharedHairpinGap(segmentStaff, rootRect);
            if (gap !== null) {
              centerY =
                resolveSharedHairpinY({
                  kind: segment.kind,
                  startX: segment.startX,
                  endX: segment.endX,
                  openHeight: HAIRPIN_OPEN_HEIGHT,
                  topGapEdgeY: gap.topGapEdgeY,
                  bottomGapEdgeY: gap.bottomGapEdgeY,
                  beamSlices: entryObstacles.beamSlices,
                  obstacles: entryObstacles.entries.flatMap(
                    (entry) => entry.glyphRects
                  ),
                  startText: segmentStartText,
                  endText: segmentEndText,
                }) ?? centerY;
            }
            for (const text of [segmentStartText, segmentEndText]) {
              if (text !== null) {
                overlay.appendChild(
                  createDynamicMarkingSvg(text.marking, text.centerX, centerY, {
                    bracketed: text.bracketed,
                  })
                );
              }
            }
          }
          overlay.appendChild(
            createHairpinSvg(
              segment.kind,
              segment.startX,
              segment.endX,
              centerY,
              undefined,
              segment.openAtStart,
              segment.openAtEnd
            )
          );
        });
      }
    }

    #headCenterX(element: NoteOrChordElementType, rootRect: DOMRect): number {
      const heads = Array.from(
        element.shadowRoot?.querySelectorAll('.head') ?? [],
        (head) => head.getBoundingClientRect()
      );
      if (heads.length === 0) {
        const rect = element.getBoundingClientRect();
        return rect.left + rect.width / 2 - rootRect.left;
      }
      return (
        heads.reduce((sum, rect) => sum + rect.left + rect.width / 2, 0) /
          heads.length -
        rootRect.left
      );
    }

    // The gap between `staff` and its partner in the same measure — the next
    // staff down, or the one above for a measure's last staff.
    #sharedHairpinGap(
      staff: HTMLElement | null,
      rootRect: DOMRect
    ): { topGapEdgeY: number; bottomGapEdgeY: number } | null {
      const measure = staff?.closest(MUSIC_MEASURE);
      if (!staff || !measure) {
        return null;
      }
      const staves = Array.from(measure.children).filter((el) =>
        isStaffNodeName(el.nodeName)
      ) as HTMLElement[];
      const index = staves.indexOf(staff);
      const partner = staves[index + 1 < staves.length ? index + 1 : index - 1];
      if (!partner || partner === staff) {
        return null;
      }
      const containerRect = (element: HTMLElement) =>
        element.shadowRoot
          ?.querySelector('.staff-container')
          ?.getBoundingClientRect() ?? element.getBoundingClientRect();
      const [upper, lower] =
        staves.indexOf(partner) > index ? [staff, partner] : [partner, staff];
      return {
        topGapEdgeY: containerRect(upper).bottom - rootRect.top,
        bottomGapEdgeY: containerRect(lower).top - rootRect.top,
      };
    }

    // Groups every measure's Nth staff into a "track" across the
    // composition, in row order.
    #buildStaffTracks(): { staff: HTMLElement; rowIndex: number }[][] {
      const rows = this.#computeMeasureRows();
      const rowIndexByMeasure = new Map<HTMLElement, number>();
      rows.forEach((row, rowIndex) => {
        for (const measure of row) {
          rowIndexByMeasure.set(measure, rowIndex);
        }
      });
      const measures = rows.flat();

      const stavesByMeasure = new Map<HTMLElement, HTMLElement[]>();
      let maxStaffCount = 0;
      for (const measure of measures) {
        const staves = Array.from(measure.children).filter((el) =>
          isStaffNodeName(el.nodeName)
        ) as HTMLElement[];
        stavesByMeasure.set(measure, staves);
        maxStaffCount = Math.max(maxStaffCount, staves.length);
      }

      const tracks: { staff: HTMLElement; rowIndex: number }[][] = [];
      for (let staffIndex = 0; staffIndex < maxStaffCount; staffIndex++) {
        const track: { staff: HTMLElement; rowIndex: number }[] = [];
        for (const measure of measures) {
          const staff = stavesByMeasure.get(measure)?.[staffIndex];
          if (staff) {
            track.push({
              staff,
              rowIndex: rowIndexByMeasure.get(measure) ?? 0,
            });
          }
        }
        tracks.push(track);
      }
      return tracks;
    }

    // Continues a trill line whose tie chain runs past its measure: the
    // tie-chain walk runs over each track's concatenated elements, split into
    // one segment per measure, restating the sign at a new row.
    #redrawTrills() {
      const overlay = this.shadowRoot?.querySelector<SVGSVGElement>(
        '.trill-continuation-overlay'
      );
      const wrapper = this.shadowRoot?.querySelector<HTMLElement>(
        '.composition-wrapper'
      );
      if (!overlay || !wrapper) {
        return;
      }

      while (overlay.firstChild) {
        overlay.removeChild(overlay.firstChild);
      }

      const rootRect = wrapper.getBoundingClientRect();

      for (const track of this.#buildStaffTracks()) {
        if (track.length < 2) {
          continue;
        }

        const globalElements: NoteChordOrRestElementType[] = [];
        const measureBoundaries: TrillMeasureBoundary[] = [];
        for (const { staff } of track) {
          const { flatElements } = flattenSlotElements(
            Array.from(staff.children)
          );
          const startIndex = globalElements.length;
          globalElements.push(...flatElements);
          measureBoundaries.push({
            startIndex,
            endIndex: globalElements.length,
          });
        }

        for (const span of resolveTrillSpans(globalElements)) {
          if (!span.hasLine) {
            continue;
          }
          const segments = resolveTrillContinuationSegments(
            measureBoundaries,
            span
          );
          if (segments.length === 0) {
            continue;
          }

          const startElement = globalElements[span.startIndex] as
            | NoteElementType
            | ChordElementType;
          const restatesSign = startElement.trillContinuation !== 'line-only';

          for (const segment of segments) {
            const { staff, rowIndex } = track[segment.measureIndex];
            const isRowWrap =
              rowIndex !== track[segment.measureIndex - 1].rowIndex;

            const staffRect = staff.getBoundingClientRect();
            const y = staffRect.top - rootRect.top + TRILL_LINE_ROOT_Y_OFFSET;
            const notesAreaLeft = this.#computeNotesAreaLeftForStaff(
              staff,
              rootRect
            );

            let lineStartX = notesAreaLeft;
            if (isRowWrap && restatesSign) {
              const { element: sign, width: signWidth } =
                createTrillContinuationSignSvg({
                  leftX: notesAreaLeft,
                  bottomY: y,
                });
              overlay.appendChild(sign);
              lineStartX = notesAreaLeft + signWidth + TRILL_SIGN_LINE_GAP_PX;
            }

            const measureStart =
              measureBoundaries[segment.measureIndex].startIndex;
            let lineEndX: number;
            if (segment.stopAtLocalIndex !== null) {
              const stopElement =
                globalElements[measureStart + segment.stopAtLocalIndex];
              lineEndX =
                stopElement.getBoundingClientRect().right - rootRect.left;
            } else if (segment.endBeforeLocalIndex !== null) {
              const nextElement =
                globalElements[measureStart + segment.endBeforeLocalIndex];
              lineEndX =
                nextElement.getBoundingClientRect().left -
                rootRect.left -
                TRILL_LINE_END_GAP_PX;
            } else {
              lineEndX = staffRect.right - rootRect.left;
            }

            const line = createTrillLineSvg({
              startX: lineStartX,
              endX: lineEndX,
              bottomY: y,
            });
            if (line) {
              overlay.appendChild(line);
            }
            if (segment.stopAtLocalIndex !== null) {
              overlay.appendChild(createTrillNotchSvg(lineEndX, y));
            }
          }
        }
      }
    }

    // Octave lines across barlines, one track per voice. Resolved apart from
    // drawing so each measure learns which of its
    // elements a continuing line covers before its gap passes run (see
    // <music-measure>'s applyOctaveContinuationCoverage).
    #resolveOctaveContinuations(): OctaveContinuation[] {
      const continuations: OctaveContinuation[] = [];
      for (const track of this.#buildStaffTracks()) {
        if (track.length < 2) {
          continue;
        }

        // Flattened once per staff in the track, reused across every voice
        // number below — flattenStaffSlotElements does its own real work
        // (warnings, clef markers) regardless of which voice is queried.
        const staffFlattenResults = track.map(({ staff }) =>
          flattenStaffSlotElements(Array.from(staff.children))
        );

        for (const voiceNumber of [1, 2, 3] as VoiceNumber[]) {
          const globalElements: NoteChordOrRestElementType[] = [];
          const measureBoundaries: OctaveMeasureBoundary[] = [];
          for (const flatten of staffFlattenResults) {
            const flatElements =
              flatten.voices.get(voiceNumber)?.flatElements ?? [];
            const startIndex = globalElements.length;
            globalElements.push(...flatElements);
            measureBoundaries.push({
              startIndex,
              endIndex: globalElements.length,
            });
          }

          const hasOctaveShiftElement = globalElements.some(
            (element) =>
              (element.nodeName === MUSIC_NOTE_NODE ||
                element.nodeName === MUSIC_CHORD_NODE) &&
              (element as NoteElementType | ChordElementType).octaveShift !==
                null
          );
          if (!hasOctaveShiftElement) {
            continue;
          }

          const { spans, warnings } = resolveOctaveSpans(globalElements);
          for (const warning of warnings) {
            console.warn(warning);
          }

          for (const span of spans) {
            const startElement = globalElements[span.startIndex] as
              | NoteElementType
              | ChordElementType;
            const segments = resolveOctaveContinuationSegments(
              measureBoundaries,
              span
            );
            if (segments.length === 0) {
              continue;
            }
            const startMeasureIndex = segments[0].measureIndex - 1;
            const start: OctaveSpanStart = {
              staff: track[startMeasureIndex].staff,
              element: startElement,
              rowIndex: track[startMeasureIndex].rowIndex,
              covered: globalElements.slice(
                span.startIndex,
                measureBoundaries[startMeasureIndex].endIndex
              ),
            };
            for (const segment of segments) {
              const { staff, rowIndex } = track[segment.measureIndex];
              const { startIndex, endIndex } =
                measureBoundaries[segment.measureIndex];
              const stopIndex =
                segment.stopAtLocalIndex === null
                  ? endIndex
                  : startIndex + segment.stopAtLocalIndex + 1;
              continuations.push({
                staff,
                span,
                start,
                rowIndex,
                rowY: null,
                raisesPitch: isOctaveRaise(span.amount),
                isRowWrap:
                  rowIndex !== track[segment.measureIndex - 1].rowIndex,
                restatesSign: startElement.octaveContinuation !== 'line-only',
                covered: globalElements.slice(startIndex, stopIndex),
                stopElement:
                  segment.stopAtLocalIndex === null
                    ? null
                    : globalElements[stopIndex - 1],
              });
            }
          }
        }
      }
      return continuations;
    }

    // One height per system for each line crossing a barline: the most
    // outward row any of its measures in that system needs (each staff
    // computes its own share with its usual clearance). The starting staff
    // is told so its part runs on to its barline at that height; the
    // continuations are drawn at it, and the staves they pass over make
    // headroom for them. A new system starts fresh, so each row
    // gets its own height. Staves of one track share local coordinates
    // within a row, since row alignment matches their margins.
    #applyOctaveRowHeights(continuations: readonly OctaveContinuation[]): void {
      const bySpan = new Map<OctaveSpanStart, OctaveContinuation[]>();
      for (const continuation of continuations) {
        bySpan.set(continuation.start, [
          ...(bySpan.get(continuation.start) ?? []),
          continuation,
        ]);
      }

      const rowsByStaff = new Map<
        Element,
        Map<Element, { rowY: number; raisesPitch: boolean; starts: boolean }>
      >();
      const addRow = (
        staff: Element,
        element: Element | undefined,
        row: { rowY: number; raisesPitch: boolean; starts: boolean }
      ) => {
        if (element === undefined) {
          return;
        }
        const staffRows = rowsByStaff.get(staff) ?? new Map();
        staffRows.set(element, row);
        rowsByStaff.set(staff, staffRows);
      };
      for (const [start, segments] of bySpan) {
        const { amount } = segments[0].span;
        const raisesPitch = isOctaveRaise(amount);
        const rowYs = new Map<number, number>();
        for (const piece of [start, ...segments]) {
          const y =
            (piece.staff as OctaveRowSource).octaveRowY?.(
              piece.covered,
              amount
            ) ?? null;
          if (y === null) {
            continue;
          }
          const current = rowYs.get(piece.rowIndex);
          rowYs.set(
            piece.rowIndex,
            current === undefined
              ? y
              : raisesPitch
              ? Math.min(current, y)
              : Math.max(current, y)
          );
        }
        for (const segment of segments) {
          segment.rowY = rowYs.get(segment.rowIndex) ?? null;
          if (segment.rowY !== null) {
            addRow(segment.staff, segment.covered[0], {
              rowY: segment.rowY,
              raisesPitch,
              starts: false,
            });
          }
        }
        const startRowY = rowYs.get(start.rowIndex);
        if (startRowY !== undefined) {
          addRow(start.staff, start.element, {
            rowY: startRowY,
            raisesPitch,
            starts: true,
          });
        }
      }

      for (const staff of Array.from(
        this.querySelectorAll<OctaveRowSource>(STAFF_TAGS)
      )) {
        if ('octaveContinuations' in staff) {
          staff.octaveContinuations = rowsByStaff.get(staff) ?? null;
        }
      }
    }

    #measures(): HTMLElement[] {
      return Array.from(this.querySelectorAll<HTMLElement>(MUSIC_MEASURE));
    }

    #applyOctaveContinuationCoverage(
      continuations: readonly OctaveContinuation[]
    ): void {
      const byMeasure = new Map<
        Element,
        Map<Element, NoteChordOrRestElementType[][]>
      >();
      for (const { staff, covered } of continuations) {
        const measure = staff.closest(MUSIC_MEASURE);
        if (measure === null) {
          continue;
        }
        const byStaff = byMeasure.get(measure) ?? new Map();
        byStaff.set(staff, [...(byStaff.get(staff) ?? []), covered]);
        byMeasure.set(measure, byStaff);
      }
      for (const measure of this.#measures()) {
        (
          measure as OctaveContinuationReceiver
        ).applyOctaveContinuationCoverage?.(
          byMeasure.get(measure) ?? new Map()
        );
      }
    }

    // Draws every continuation, broken where its staff's measure breaks a
    // one-hand line around the other hand's notes of a shared beam (the
    // staff's crossStaffOctaveBreakAfter), then hands each measure what was
    // drawn over it. Returns whether any measure moved its gap content in
    // response, so the caller can redraw what reads it.
    #redrawOctaveSigns(continuations: readonly OctaveContinuation[]): boolean {
      const overlay = this.shadowRoot?.querySelector<SVGSVGElement>(
        '.octave-continuation-overlay'
      );
      const wrapper = this.shadowRoot?.querySelector<HTMLElement>(
        '.composition-wrapper'
      );
      if (!overlay || !wrapper) {
        return false;
      }

      while (overlay.firstChild) {
        overlay.removeChild(overlay.firstChild);
      }

      const rootRect = wrapper.getBoundingClientRect();
      const drawnByMeasure = new Map<
        Element,
        Map<Element, SVGGraphicsElement[]>
      >();

      for (const continuation of continuations) {
        const { staff, span, raisesPitch, stopElement } = continuation;
        const drawn: SVGGraphicsElement[] = [];
        const draw = (element: SVGGraphicsElement) => {
          overlay.appendChild(element);
          drawn.push(element);
        };

        const toClientY = (staff as OctaveRowSource).octaveLocalToClientY;
        if (toClientY === undefined) {
          continue;
        }
        const staffRect = staff.getBoundingClientRect();
        // Read through the staff's own transform at draw time, so a staff a
        // gap pass has since moved is followed.
        const y =
          toClientY.call(
            staff,
            continuation.rowY ??
              (raisesPitch
                ? OCTAVE_SIGN_ABOVE_STAFF_Y
                : OCTAVE_SIGN_BELOW_STAFF_Y)
          ) - rootRect.top;
        const notesAreaLeft = this.#computeNotesAreaLeftForStaff(
          staff,
          rootRect
        );

        const signWidth = octaveSignWidth(span.amount, span.mode);
        let lineStartX = notesAreaLeft;
        if (continuation.isRowWrap && continuation.restatesSign) {
          const { element: sign, width: signWidth } =
            createOctaveContinuationSignSvg(
              span.amount,
              span.mode,
              notesAreaLeft,
              y,
              true
            );
          draw(sign);
          lineStartX = notesAreaLeft + signWidth + OCTAVE_SIGN_LINE_GAP_PX;
        }

        const breaks =
          (staff as OctaveBreakSource).crossStaffOctaveBreakAfter ?? null;
        const pitched = continuation.covered.filter(
          (element) => element.nodeName !== MUSIC_REST_NODE
        );
        pitched.forEach((element, k) => {
          if (!breaks?.has(element) || k === pitched.length - 1) {
            return;
          }
          const breakX =
            element.getBoundingClientRect().right -
            rootRect.left +
            OCTAVE_SIGN_TRAILING_GAP_PX;
          draw(createOctaveExtensionLineSvg(lineStartX, breakX, y));
          draw(createOctaveCornerSvg(breakX, y, raisesPitch));
          const signX =
            pitched[k + 1].getBoundingClientRect().left -
            rootRect.left -
            OCTAVE_SIGN_LEADING_GAP_PX -
            signWidth;
          draw(createOctaveSignSvg(span.amount, signX, y, span.mode));
          lineStartX = signX + signWidth;
        });

        // Line and corner end at the stop note plus the trailing gap, else at
        // the staff's right edge (its barline); never before lineStartX plus
        // the corner's foot, so a wide restated label can't fold it back.
        const lineEndX = Math.max(
          lineStartX + OCTAVE_SIGN_CORNER_PX,
          stopElement === null
            ? staffRect.right - rootRect.left
            : stopElement.getBoundingClientRect().right -
                rootRect.left +
                OCTAVE_SIGN_TRAILING_GAP_PX
        );
        draw(createOctaveExtensionLineSvg(lineStartX, lineEndX, y));
        if (stopElement !== null) {
          draw(createOctaveCornerSvg(lineEndX, y, raisesPitch));
          if (span.closedBy === 'loco') {
            draw(
              createOctaveLocoLabelSvg(lineEndX + OCTAVE_LOCO_GAP_PX, y, false)
            );
          }
        }

        const measure = staff.closest(MUSIC_MEASURE);
        if (measure !== null) {
          const byStaff = drawnByMeasure.get(measure) ?? new Map();
          byStaff.set(staff, [...(byStaff.get(staff) ?? []), ...drawn]);
          drawnByMeasure.set(measure, byStaff);
        }
      }

      let changed = false;
      for (const measure of this.#measures()) {
        const measureRect = measure.getBoundingClientRect();
        const rects = new Map(
          Array.from(drawnByMeasure.get(measure) ?? [], ([staff, drawn]) => [
            staff,
            drawn.map((element) => {
              const rect = element.getBoundingClientRect();
              return {
                left: rect.left - measureRect.left,
                right: rect.right - measureRect.left,
                top: rect.top - measureRect.top,
                bottom: rect.bottom - measureRect.top,
              };
            }),
          ])
        );
        changed =
          ((
            measure as OctaveContinuationReceiver
          ).applyOctaveContinuationRects?.(rects) ??
            false) ||
          changed;
      }
      return changed;
    }

    #updateDescribeVisibility() {
      const rows = this.#computeMeasureRows();
      for (const row of rows) {
        for (let i = 0; i < row.length; i++) {
          const isFirstInRow = i === 0;
          Array.from(row[i].children)
            .filter((el) => isStaffNodeName(el.nodeName))
            .forEach((staff) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duck-typed, same pattern as refreshInheritedAttrs
              (staff as any).showDescribe = isFirstInRow;
            });
        }
      }
    }

    // Compares every pair of adjacent measures (effectiveStartClef/
    // effectiveEndClef). A differing pair sets clefChangeAtBoundary so the
    // incoming staff shows its clef; at a row wrap the outgoing staff warns of
    // the new clef. Returns those courtesy clefs by outgoing staff.
    #updateClefContinuity(
      held: ReadonlyMap<HTMLElement, ReadonlySet<Component>>
    ): Map<HTMLElement, ClefType> {
      const courtesyClefs = new Map<HTMLElement, ClefType>();
      // Assigned once at the end: toggling a flag off and on within a pass
      // re-renders and reschedules a redraw forever.
      const staffsNeedingClefChangeFlag = new Set<HTMLElement>();

      // Staves are matched by ordinal position within their measure (1st
      // staff vs 1st, 2nd vs 2nd) — assumes consistent voice ordering across
      // measures, which holds for this library's single-line-per-measure
      // composition model.
      this.#forEachAdjacentStaffPair((outgoing, incoming, isRowWrap) => {
        const outgoingClef: ClefType | null =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duck-typed call to avoid cross-module import
          (outgoing as any).effectiveEndClef ?? null;
        const incomingClef: ClefType | null =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duck-typed call to avoid cross-module import
          (incoming as any).effectiveStartClef ?? null;
        // null means "not clef-comparable" (a vocal or guitar-tab staff).
        if (
          outgoingClef === null ||
          incomingClef === null ||
          outgoingClef === incomingClef ||
          held.get(incoming)?.has('clef')
        ) {
          return;
        }
        staffsNeedingClefChangeFlag.add(incoming);
        if (isRowWrap) {
          courtesyClefs.set(outgoing, incomingClef);
        }
      });

      Array.from(this.querySelectorAll(STAFF_TAGS)).forEach((staff) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duck-typed call to avoid cross-module import
        (staff as any).clefChangeAtBoundary = staffsNeedingClefChangeFlag.has(
          staff as HTMLElement
        );
      });
      return courtesyClefs;
    }

    // A key change at a barline: the incoming staff draws it (naturals, then
    // the new key) mid-row; at a row wrap the outgoing staff warns of it and
    // the new row shows only the new key. Returns those courtesy keys by
    // outgoing staff.
    #updateKeySignatureContinuity(
      held: ReadonlyMap<HTMLElement, ReadonlySet<Component>>
    ): Map<HTMLElement, KeyChange> {
      const courtesyKeys = new Map<HTMLElement, KeyChange>();
      const changes = new Map<HTMLElement, KeyChange>();
      this.#forEachAdjacentStaffPair((outgoing, incoming, isRowWrap) => {
        const from: KeySignatureState | undefined = (outgoing as KeyStaff)
          .effectiveKeySignature;
        const to: KeySignatureState | undefined = (incoming as KeyStaff)
          .effectiveKeySignature;
        if (from === undefined || to === undefined) {
          return;
        }
        if (keySignatureEquals(from, to) || held.get(incoming)?.has('key')) {
          return;
        }
        changes.set(incoming, { from, to });
        if (isRowWrap) {
          courtesyKeys.set(outgoing, { from, to });
        }
      });
      this.querySelectorAll<KeyStaff>(STAFF_TAGS).forEach((staff) => {
        if ('keyChangeAtBoundary' in staff) {
          staff.keyChangeAtBoundary = changes.get(staff) ?? null;
        }
      });
      return courtesyKeys;
    }

    // Each staff's end-of-measure warnings, assigned once.
    #assignEndWarnings(
      courtesyClefs: ReadonlyMap<HTMLElement, ClefType>,
      courtesyKeys: ReadonlyMap<HTMLElement, KeyChange>,
      repeatWarnings: ReadonlyMap<HTMLElement, EndWarnings>
    ): void {
      this.querySelectorAll<KeyStaff>(STAFF_TAGS).forEach((staff) => {
        if (!('endWarnings' in staff)) {
          return;
        }
        const clef = courtesyClefs.get(staff) ?? null;
        const key = courtesyKeys.get(staff) ?? null;
        const courtesy: EndWarnings | null =
          clef === null && key === null
            ? null
            : { clef, key, time: null, reservesWidth: false };
        staff.endWarnings = mergeEndWarnings(
          courtesy,
          repeatWarnings.get(staff) ?? null
        );
      });
    }

    // Calls `visit` for every pair of same-ordinal staves in adjacent
    // measures, in measure order.
    #forEachAdjacentStaffPair(
      visit: (
        outgoing: HTMLElement,
        incoming: HTMLElement,
        isRowWrap: boolean
      ) => void
    ): void {
      const rows = this.#computeMeasureRows();
      const rowIndexByMeasure = new Map<HTMLElement, number>();
      rows.forEach((row, rowIndex) => {
        for (const measure of row) {
          rowIndexByMeasure.set(measure, rowIndex);
        }
      });
      const measures = rows.flat();
      const stavesOf = (measure: HTMLElement) =>
        Array.from(measure.children).filter((el) =>
          isStaffNodeName(el.nodeName)
        ) as HTMLElement[];
      for (let i = 1; i < measures.length; i++) {
        const isRowWrap =
          rowIndexByMeasure.get(measures[i - 1]) !==
          rowIndexByMeasure.get(measures[i]);
        const outgoingStaves = stavesOf(measures[i - 1]);
        const incomingStaves = stavesOf(measures[i]);
        const pairCount = Math.min(
          outgoingStaves.length,
          incomingStaves.length
        );
        for (let staffIndex = 0; staffIndex < pairCount; staffIndex++) {
          visit(
            outgoingStaves[staffIndex],
            incomingStaves[staffIndex],
            isRowWrap
          );
        }
      }
    }

    // A time signature is shown only on the first measure, or on a later
    // measure whose resolved time signature differs from the measure right
    // before it. Guitar tab draws no time signature, so only classical
    // staves are flagged.
    #updateTimeSignatureContinuity(
      held: ReadonlyMap<HTMLElement, ReadonlySet<Component>>
    ) {
      const measures = this.#computeMeasureRows().flat();

      // Computed first, assigned once at the end — see #updateClefContinuity
      // for why a reset-then-set two-pass assignment perpetually reschedules
      // a redraw for any staff whose flag legitimately stays true.
      const staffsNeedingTimeChangeFlag = new Set<StaffElementBaseType>();

      for (let i = 1; i < measures.length; i++) {
        const outgoingStaves = Array.from(measures[i - 1].children).filter(
          (el) => isStaffNodeName(el.nodeName)
        ) as StaffElementBaseType[];
        const incomingStaves = Array.from(measures[i].children).filter((el) =>
          isStaffNodeName(el.nodeName)
        ) as StaffElementBaseType[];

        const pairCount = Math.min(
          outgoingStaves.length,
          incomingStaves.length
        );
        for (let staffIndex = 0; staffIndex < pairCount; staffIndex++) {
          const outgoingStaff = outgoingStaves[staffIndex];
          const incomingStaff = incomingStaves[staffIndex];

          if (
            outgoingStaff.time !== incomingStaff.time &&
            !held.get(incomingStaff)?.has('time')
          ) {
            staffsNeedingTimeChangeFlag.add(incomingStaff);
          }
        }
      }

      Array.from(this.querySelectorAll(STAFF_TAGS)).forEach((staff) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duck-typed call to avoid cross-module import
        (staff as any).timeChangeAtBoundary = staffsNeedingTimeChangeFlag.has(
          staff as StaffElementBaseType
        );
      });
    }

    // Where two bars meet decides what each draws: a start repeat replaces
    // the barline it touches, shares its thick line with an end repeat, or
    // follows the clef/key/time glyphs at a row start or a change. Values are
    // assigned once at the end, as in #updateClefContinuity.
    #updateBarlineJunctions() {
      const rows = this.#computeMeasureRows();
      const rowIndexByMeasure = new Map<HTMLElement, number>();
      rows.forEach((row, rowIndex) => {
        for (const measure of row) {
          rowIndexByMeasure.set(measure, rowIndex);
        }
      });
      const measures = rows.flat();
      const doubleBarBeforeRepeat = this.hasAttribute(
        'double-bar-before-repeat'
      );
      const stavesOf = (measure: HTMLElement) =>
        Array.from(measure.children).filter((el) =>
          isStaffNodeName(el.nodeName)
        ) as BarlineStaff[];

      const ends = new Map<BarlineStaff, ResolvedEndBarline>();
      const starts = new Map<BarlineStaff, StartRepeatMode>();
      measures.forEach((measure, i) => {
        const { barline } = resolveEndBarline({
          authored: parseMeasureEndBarline(measure.getAttribute('barline')),
          fine: false,
          jump: false,
        });
        const repeatStart = measure.hasAttribute('repeat-start');
        const staves = stavesOf(measure);
        for (const staff of staves) {
          ends.set(staff, barline);
          starts.set(staff, repeatStart ? 'full' : 'none');
        }
        if (i === 0) {
          return;
        }
        const outgoingMeasure = measures[i - 1];
        const outgoingStaves = stavesOf(outgoingMeasure);
        const outgoingBarline = resolveEndBarline({
          authored: parseMeasureEndBarline(
            outgoingMeasure.getAttribute('barline')
          ),
          fine: false,
          jump: false,
        }).barline;
        const sameRow =
          rowIndexByMeasure.get(outgoingMeasure) ===
          rowIndexByMeasure.get(measure);
        const pairCount = Math.min(outgoingStaves.length, staves.length);
        for (let staffIndex = 0; staffIndex < pairCount; staffIndex++) {
          const incoming = staves[staffIndex];
          const result = resolveBarlineJunction({
            outgoing: outgoingBarline,
            incomingRepeatStart: repeatStart,
            incomingHasStartGlyphs:
              incoming.showDescribe === true ||
              incoming.clefChangeAtBoundary === true ||
              incoming.timeChangeAtBoundary === true ||
              (incoming.keyChangeAtBoundary ?? null) !== null,
            sameRow,
            doubleBarBeforeRepeat,
          });
          ends.set(outgoingStaves[staffIndex], result.outgoing);
          starts.set(incoming, result.incomingStartRepeat);
        }
      });
      for (const [staff, barline] of ends) {
        staff.endBarline = barline;
      }
      for (const [staff, mode] of starts) {
        staff.startRepeat = mode;
      }
    }

    // Hands every bar its piece of an ending bracket; each measure draws it
    // and reserves room on its top staff. Returns whether any staff's margin
    // changed, so the row alignment re-runs.
    #updateEndings(): boolean {
      const measures = this.#computeMeasureRows().flat() as EndingHost[];
      const { groups } = resolveEndings(this.#endingInputs(measures));
      const labels = new Map<number, string>();
      measures.forEach((measure, index) => {
        const label = measure.getAttribute('ending-label');
        if (label !== null) {
          labels.set(index, label);
        }
      });
      const segments = resolveEndingSegments(groups, labels);
      let changed = false;
      measures.forEach((measure, index) => {
        changed =
          (measure.applyEndingSegment?.(segments.get(index) ?? null) ??
            false) ||
          changed;
      });
      return changed;
    }

    #lastRepeatWarnings = new Set<string>();

    // A repeated section must hold whole bars, and every end repeat needs a
    // start to return to. Warns once per distinct message set.
    // What each staff draws around the end repeats: the section's start state
    // reinstated before :‖ (it doesn't depend on where rows wrap, so it
    // reserves width), no change after it where the music continues in that
    // state, and a bracketed reminder at a later ending's start. Runs before
    // the adjacency continuity passes, which skip the components held here.
    // Authoring the warnings by hand was rejected: rows reflow, and a bar
    // can't know its section's start state locally.
    #resolveRepeatContinuity(): {
      endWarnings: Map<HTMLElement, EndWarnings>;
      held: Map<HTMLElement, Set<Component>>;
    } {
      const measures = this.#computeMeasureRows().flat();
      const { events, groups } = this.#repeatEvents(measures);
      const { spans } = resolveRepeatSpans(events);
      const stavesOf = (index: number): RepeatStaff[] =>
        index < 0 || index >= measures.length
          ? []
          : (Array.from(measures[index].children).filter((el) =>
              isStaffNodeName(el.nodeName)
            ) as RepeatStaff[]);
      const stateOf = (
        staff: RepeatStaff,
        at: 'start' | 'end' | number
      ): BoundaryState => ({
        clef:
          (at === 'start'
            ? staff.effectiveStartClef
            : at === 'end'
            ? staff.effectiveEndClef
            : staff.clefAtBeat?.(at)) ?? null,
        key: staff.effectiveKeySignature ?? null,
        time: staff.time as TimeSignature,
      });

      const endWarnings = new Map<HTMLElement, EndWarnings>();
      const held = new Map<HTMLElement, Set<Component>>();
      const reminders = new Map<HTMLElement, Set<Component>>();
      const markerWarnings = new Map<HTMLElement, Map<number, ClefType>>();
      const add = (
        map: Map<HTMLElement, Set<Component>>,
        staff: HTMLElement,
        components: ReadonlySet<Component>
      ) => {
        if (components.size > 0) {
          const set = map.get(staff) ?? new Set<Component>();
          components.forEach((component) => set.add(component));
          map.set(staff, set);
        }
      };

      for (const { start, end } of spans) {
        const endIndex = end.measureIndex;
        const atBarEnd = end.beatInBar >= end.barCapacity - 1e-9;
        const startIndex = start?.measureIndex ?? 0;
        const startAt =
          start === null || start.beatInBar <= 1e-9 ? 'start' : start.beatInBar;
        const group = groups.find(
          (candidate) => candidate.id === end.endingGroup
        );
        const endingIndex =
          group?.endings.findIndex(
            (ending) => ending.lastMeasure === endIndex
          ) ?? -1;
        const nextIsLaterEnding =
          atBarEnd &&
          group !== undefined &&
          endingIndex !== -1 &&
          group.endings[endingIndex + 1]?.firstMeasure === endIndex + 1;
        const beforeIndex = (group?.endings[0].firstMeasure ?? 0) - 1;
        stavesOf(endIndex).forEach((endStaff, k) => {
          const startStaff = stavesOf(startIndex)[k];
          if (startStaff === undefined) {
            return;
          }
          const nextStaff = atBarEnd ? stavesOf(endIndex + 1)[k] : undefined;
          const beforeStaff = stavesOf(beforeIndex)[k];
          const endState = stateOf(endStaff, atBarEnd ? 'end' : end.beatInBar);
          const display = resolveRepeatWarnings({
            start: stateOf(startStaff, startAt),
            end: endState,
            next: nextStaff === undefined ? null : stateOf(nextStaff, 'start'),
            nextIsLaterEnding,
            beforeEndings: !nextIsLaterEnding
              ? null
              : beforeStaff === undefined
              ? stateOf(stavesOf(beforeIndex + 1)[k] ?? endStaff, 'start')
              : stateOf(beforeStaff, 'end'),
          });
          const { warnings } = display;
          if (!atBarEnd) {
            if (warnings.clef) {
              const map = markerWarnings.get(endStaff) ?? new Map();
              map.set(end.beatInBar, warnings.clef);
              markerWarnings.set(endStaff, map);
            }
            return;
          }
          const key =
            warnings.key && endState.key !== null
              ? { from: endState.key, to: warnings.key }
              : null;
          if (warnings.clef || key !== null || warnings.time) {
            endWarnings.set(endStaff, {
              clef: warnings.clef ?? null,
              key,
              time: warnings.time ?? null,
              reservesWidth: true,
            });
          }
          if (nextStaff !== undefined) {
            add(held, nextStaff, display.suppressAfter);
            add(held, nextStaff, display.reminderAfter);
            add(reminders, nextStaff, display.reminderAfter);
          }
        });
      }

      // Assigned once per pass, like the continuity flags.
      this.querySelectorAll<RepeatStaff>(STAFF_TAGS).forEach((staff) => {
        if ('describeReminder' in staff) {
          const reminder = reminders.get(staff);
          staff.describeReminder =
            reminder === undefined
              ? null
              : {
                  clef: reminder.has('clef'),
                  key: reminder.has('key'),
                  time: reminder.has('time'),
                };
        }
        if ('markerWarnings' in staff) {
          staff.markerWarnings = markerWarnings.get(staff) ?? new Map();
        }
      });
      return { endWarnings, held };
    }

    // Every start and end repeat in the piece, from measure attributes and
    // mid-bar barlines, with the ending group each end closes an ending of.
    #repeatEvents(measures: readonly HTMLElement[]): {
      events: RepeatEvent[];
      groups: EndingGroup[];
      endingWarnings: string[];
    } {
      const events: RepeatEvent[] = [];
      const endings = resolveEndings(this.#endingInputs(measures));
      const groupByMeasure = new Map<number, number>();
      for (const group of endings.groups) {
        for (const ending of group.endings) {
          for (let i = ending.firstMeasure; i <= ending.lastMeasure; i++) {
            groupByMeasure.set(i, group.id);
          }
        }
      }
      measures.forEach((measure, measureIndex) => {
        const staves = Array.from(measure.children).filter((el) =>
          isStaffNodeName(el.nodeName)
        ) as BarlineStaff[];
        const [beats, beatType] = (staves[0]?.time ?? '4/4')
          .split('/')
          .map(Number);
        const barCapacity = beats / beatType;
        const base = {
          measureIndex,
          barCapacity,
          endingGroup: groupByMeasure.get(measureIndex) ?? null,
        };
        if (measure.hasAttribute('repeat-start')) {
          events.push({ ...base, kind: 'start', beatInBar: 0 });
        }
        for (const marker of staves[0]?.measureMarkerBeats ?? []) {
          const beatInBar = Math.max(0, marker.beat);
          if (
            marker.barlineType === 'repeat-end' ||
            marker.barlineType === 'repeat-both'
          ) {
            events.push({ ...base, kind: 'end', beatInBar });
          }
          if (
            marker.barlineType === 'repeat-start' ||
            marker.barlineType === 'repeat-both'
          ) {
            events.push({ ...base, kind: 'start', beatInBar });
          }
        }
        if (
          parseMeasureEndBarline(measure.getAttribute('barline')) ===
          'repeat-end'
        ) {
          events.push({ ...base, kind: 'end', beatInBar: barCapacity });
        }
      });
      return {
        events,
        groups: endings.groups,
        endingWarnings: endings.warnings,
      };
    }

    #validateRepeats() {
      const measures = this.#computeMeasureRows().flat();
      const { events, groups, endingWarnings } = this.#repeatEvents(measures);
      const numberingWarnings = resolveEndingNumberLabels(
        measures.length,
        groups,
        this.#endingNumbering()
      ).warnings;
      const { spans, warnings } = resolveRepeatSpans(events);
      const current = new Set(
        [
          ...warnings,
          ...endingWarnings,
          ...numberingWarnings,
          ...spans
            .map(repeatPickupWarning)
            .filter((warning): warning is string => warning !== null),
        ].map((warning) => `[music-composition] ${warning}`)
      );
      for (const warning of current) {
        if (!this.#lastRepeatWarnings.has(warning)) {
          console.warn(warning);
        }
      }
      this.#lastRepeatWarnings = current;
    }

    #manageMeasureCount() {
      this.#renumberMeasures();

      // Numbers are recomputed from live DOM order on every add or remove,
      // rather than an ever-incrementing counter, so deleting measures
      // renumbers the rest instead of leaving gaps or stale counts behind.
      this.#observer = new MutationObserver(() => {
        this.#renumberMeasures();
      });

      this.#observer.observe(this, {
        childList: true,
      });
    }

    // Each child measure's ending and resolved end barline, in DOM order.
    #endingInputs(measures: readonly HTMLElement[]): EndingMeasureInput[] {
      return measures.map((measure) => ({
        ending: parseEnding(measure.getAttribute('ending')),
        endBarline: resolveEndBarline({
          authored: parseMeasureEndBarline(measure.getAttribute('barline')),
          fine: false,
          jump: false,
        }).barline,
      }));
    }

    #endingNumbering(): EndingNumbering {
      return (
        parseEndingNumbering(this.getAttribute('ending-numbering')) ??
        'consecutive'
      );
    }

    #renumberMeasures() {
      const measures = Array.from(this.children).filter(
        (node) => node.nodeName === MUSIC_MEASURE_NODE
      ) as MeasureNumbering[];
      const { groups } = resolveEndings(this.#endingInputs(measures));
      const { numbers, labels, forceShow } = resolveEndingNumberLabels(
        measures.length,
        groups,
        this.#endingNumbering()
      );
      measures.forEach((measure, index) => {
        measure.setAttribute('number', numbers[index].toString());
        if ('numberLabel' in measure) {
          measure.numberLabel = labels[index];
          measure.forceNumberDisplay = forceShow[index];
        }
      });

      // Runs after a framework commit has settled the DOM: the first measure's
      // staves rebuild their describe area in case they connected before it
      // took its final position.
      const firstMeasure = measures[0];
      if (firstMeasure !== undefined) {
        Array.from(firstMeasure.children)
          .filter((el) => isStaffNodeName(el.nodeName))
          .forEach((staff) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duck-typed, same as attributeChangedCallback above
            (staff as any).refreshInheritedAttrs?.()
          );
      }
    }
  }

  if (!customElements.get(MUSIC_COMPOSITION)) {
    customElements.define(MUSIC_COMPOSITION, CompositionElement);
  }
}
