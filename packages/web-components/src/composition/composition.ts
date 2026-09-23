import { getClefRenderData } from '../rules/clefRules';
import { pairHairpins, resolveHairpinSegments } from '../rules/dynamicsRules';
import {
  resolveTrillContinuationSegments,
  resolveTrillSpans,
  type TrillMeasureBoundary,
} from '../rules/trillRules';
import type {
  ChordElementType,
  NoteChordOrRestElementType,
  NoteElementType,
  StaffElementBaseType,
} from '../types/elements';
import type { MeasureNumberDisplay } from '../types/theory';
import {
  createHairpinSvg,
  createTrillContinuationSignSvg,
  createTrillLineSvg,
  createTrillNotchSvg,
  NOTE_HEAD_Y_OFFSET_CORRECTION,
} from '../utils';
import {
  buildConnectorSvgs,
  collectArpeggioTiePairs,
  collectNoteLikeElements,
  pairConnectors,
  partitionByVoice,
} from '../utils/connectorsBuilder';
import {
  COMMON_ATTRIBUTES,
  isStaffNodeName,
  MUSIC_CHORD,
  MUSIC_COMPOSITION,
  MUSIC_MEASURE,
  MUSIC_MEASURE_NODE,
  MUSIC_NOTE,
  MUSIC_STAFF,
  MUSIC_STAFF_GUITAR_TAB,
  MUSIC_STAFF_VOCAL,
  NOTE_EVENTS,
  STAFF_EVENTS,
  STAFF_TAGS,
  SVG_NS,
} from '../utils/consts';
import {
  COMPOSITION_MAX_WIDTH_PX,
  COURTESY_CLEF_MARGIN_RIGHT_PX,
  COURTESY_CLEF_SCALE,
  DYNAMICS_BASELINE_Y,
  STAFF_TOP_LINE_Y,
  STAFF_Y_PADDING,
  TRILL_ABOVE_STAFF_GAP_PX,
  TRILL_LINE_END_GAP_PX,
  TRILL_SIGN_LINE_GAP_PX,
} from '../utils/notationDimensions';
import { parseMeasureNumberDisplay } from '../utils/parsers';
import { flattenSlotElements } from '../utils/slotElements';

// The trill line's own local Y offset from the top of its staff (see
// staffClassicalBase.ts#redrawTrillLines) — reused here so a cross-measure
// continuation segment lines up exactly with the segment the staff itself
// already drew, despite being computed in root rather than staff-local
// coordinates.
const TRILL_LINE_ROOT_Y_OFFSET =
  STAFF_Y_PADDING +
  STAFF_TOP_LINE_Y -
  NOTE_HEAD_Y_OFFSET_CORRECTION -
  TRILL_ABOVE_STAFF_GAP_PX;

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
      ];
    }

    #observer: MutationObserver | null;
    #resizeObserver: ResizeObserver | null;
    #redrawScheduled: boolean;
    #boundRedraw: () => void;

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
      this.#observer?.disconnect();
      this.#observer = null;
      this.#resizeObserver?.disconnect();
      this.#resizeObserver = null;
      this.removeEventListener('staff-notes-positioned', this.#boundRedraw);
      this.removeEventListener('connector-attribute-change', this.#boundRedraw);
      this.removeEventListener('dynamic-attribute-change', this.#boundRedraw);
      this.removeEventListener(
        NOTE_EVENTS.TRILL_ATTRIBUTE_CHANGE,
        this.#boundRedraw
      );
      this.removeEventListener(
        STAFF_EVENTS.GROUP_ATTRIBUTE_CHANGE,
        this.#boundRedraw
      );
      this.removeEventListener(
        STAFF_EVENTS.LABEL_ATTRIBUTE_CHANGE,
        this.#boundRedraw
      );
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duck-typed call to avoid cross-module import
        Array.from(this.querySelectorAll(STAFF_TAGS)).forEach((staff) =>
          (staff as any).refreshInheritedAttrs?.()
        );
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

          .courtesy-clef-overlay {
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
        </style>
        <div class="composition-wrapper">
          <div class="composition-grid">
            <slot></slot>
          </div>
          <svg class="connectors-overlay"></svg>
          <svg class="courtesy-clef-overlay"></svg>
          <svg class="trill-continuation-overlay"></svg>
        </div>
      `;
    }

    #observeForRedraws() {
      this.#resizeObserver = new ResizeObserver(this.#boundRedraw);
      this.#resizeObserver.observe(this);

      const slot = this.shadowRoot?.querySelector('slot');
      slot?.addEventListener('slotchange', this.#boundRedraw);

      this.addEventListener('staff-notes-positioned', this.#boundRedraw);
      this.addEventListener('connector-attribute-change', this.#boundRedraw);
      this.addEventListener('dynamic-attribute-change', this.#boundRedraw);
      this.addEventListener(
        NOTE_EVENTS.TRILL_ATTRIBUTE_CHANGE,
        this.#boundRedraw
      );
      this.addEventListener(
        STAFF_EVENTS.GROUP_ATTRIBUTE_CHANGE,
        this.#boundRedraw
      );
      this.addEventListener(
        STAFF_EVENTS.LABEL_ATTRIBUTE_CHANGE,
        this.#boundRedraw
      );
    }

    #scheduleRedraw() {
      if (this.#redrawScheduled) {
        return;
      }

      this.#redrawScheduled = true;
      requestAnimationFrame(() => {
        this.#redrawScheduled = false;
        this.#redrawConnectors();
        this.#redrawHairpins();
        this.#redrawTrills();
        this.#updateDescribeVisibility();
        this.#updateClefContinuity();
        this.#updateTimeSignatureContinuity();
      });
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

      const byVoice = partitionByVoice(collectNoteLikeElements(this));
      const pairs = [
        ...[...byVoice.values()].flatMap((notes) => pairConnectors(notes)),
        ...collectArpeggioTiePairs(this),
      ];
      if (pairs.length === 0) {
        return;
      }

      const rootRect = wrapper.getBoundingClientRect();
      const rowLeft = this.#computeNotesAreaLeft(rootRect);
      const svgs = buildConnectorSvgs(pairs, {
        rootRect,
        rowLeft,
        rowRight: rootRect.width,
      });
      for (const svg of svgs) overlay.appendChild(svg);
    }

    #computeNotesAreaLeft(rootRect: DOMRect): number {
      const firstStaff = this.querySelector(
        `${MUSIC_STAFF}, ${MUSIC_STAFF_VOCAL}, ${MUSIC_STAFF_GUITAR_TAB}`
      ) as HTMLElement | null;
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
      const staff = element.closest(
        `${MUSIC_STAFF}, ${MUSIC_STAFF_VOCAL}`
      ) as HTMLElement | null;
      if (!staff) {
        return 0;
      }
      const staffRect = staff.getBoundingClientRect();
      return staffRect.top - rootRect.top + DYNAMICS_BASELINE_Y;
    }

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

      const staffSelector = `${MUSIC_STAFF}, ${MUSIC_STAFF_VOCAL}`;
      const selector = `${MUSIC_NOTE}[crescendo], ${MUSIC_NOTE}[decrescendo], ${MUSIC_CHORD}[crescendo], ${MUSIC_CHORD}[decrescendo]`;
      const elements = Array.from(
        this.querySelectorAll(selector)
      ) as NoteChordOrRestElementType[];

      if (elements.length === 0) {
        return;
      }

      // Cross-staff geometry here comes from resolveHairpinSegments() below
      // (via getBoundingClientRect), not from pairHairpins' own startX/endX —
      // an empty positions map is fine since those fields go unused.
      const pairs = pairHairpins(elements, new Map());
      const rootRect = wrapper.getBoundingClientRect();

      for (const pair of pairs) {
        const startElement = pair.startElement;
        const endElement = pair.endElement;

        // Skip intra-staff pairs — they are already rendered by the staff itself
        const startStaff = startElement.closest(
          staffSelector
        ) as HTMLElement | null;
        const endStaff = endElement.closest(
          staffSelector
        ) as HTMLElement | null;
        if (startStaff !== null && startStaff === endStaff) {
          continue;
        }

        const startRect = startElement.getBoundingClientRect();
        const endRect = endElement.getBoundingClientRect();

        const startBounds = {
          left: startRect.left - rootRect.left,
          right: startRect.right - rootRect.left,
          top: startRect.top - rootRect.top,
        };
        const endBounds = {
          left: endRect.left - rootRect.left,
          right: endRect.right - rootRect.left,
          top: endRect.top - rootRect.top,
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
          pair,
          startBounds,
          endBounds,
          startCenterY,
          endCenterY,
          pairRowLeft,
          pairRowRight
        );

        for (const segment of segments) {
          overlay.appendChild(
            createHairpinSvg(
              segment.kind,
              segment.startX,
              segment.endX,
              segment.centerY,
              undefined,
              segment.openAtStart,
              segment.openAtEnd
            )
          );
        }
      }
    }

    // Groups every measure's Nth staff (by ordinal position) into its own
    // "track" across the whole composition, in row order — the same
    // ordinal-matching assumption #updateClefContinuity already makes for
    // adjacent pairs (consistent voice ordering across measures), extended
    // here into full chains since a trill's tie chain can run through many
    // measures, not just one adjacent pair.
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

    // Extends a trill's same-measure line (drawn by the staff itself, see
    // staffClassicalBase.ts#redrawTrillLines) across measure boundaries: a
    // span whose own tie chain runs past its starting measure's last element
    // continues automatically here, with no repeated `trill` attribute.
    // Reuses that same tie-chain walk (resolveTrillSpans) over each staff
    // track's own elements concatenated across every measure it spans, since
    // index-based tie-walking already crosses a concatenation boundary
    // transparently — the only genuinely new work is splitting the result
    // into one segment per measure, with real per-measure geometry, and
    // restating the sign when a segment also happens to start a new row.
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
            globalElements,
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

    // Clef changes at a measure boundary are a corollary of the same
    // clef-segment machinery StaffClassicalElementBase uses for mid-stream
    // <music-clef> markers, not a separate concept — effectiveStartClef/
    // effectiveEndClef (duck-typed; only staves with a genuine clef, i.e.
    // <music-staff>, implement them) do the actual clef determination. This
    // method only handles row-layout detection and courtesy-glyph rendering.
    //
    // Two distinct behaviors, both driven by comparing EVERY pair of
    // adjacent measures (not just row-boundary pairs) — a measure-boundary
    // clef change is just two neighboring <music-staff> instances with
    // different `clef` attributes, and it can happen mid-row just as often
    // as at a row wrap (e.g. a cello part switching bass→tenor→treble):
    //   1. clefChangeAtBoundary — the incoming measure's staff must show its
    //      clef even when it isn't first-in-row (mirrors the existing
    //      mid-composition time-signature-change precedent). Applies to
    //      every differing pair, row wrap or not.
    //   2. Courtesy clef preview — only drawn when the differing pair also
    //      happens to fall exactly at a row wrap, matching standard
    //      engraving practice (a courtesy clef previews the next line's
    //      clef at the end of the current line; there's nothing to preview
    //      for a mid-row change since the new clef is already visible
    //      inline via behavior 1).
    #updateClefContinuity() {
      const overlay = this.shadowRoot?.querySelector<SVGSVGElement>(
        '.courtesy-clef-overlay'
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

      const rows = this.#computeMeasureRows();
      const rowIndexByMeasure = new Map<HTMLElement, number>();
      rows.forEach((row, rowIndex) => {
        for (const measure of row) {
          rowIndexByMeasure.set(measure, rowIndex);
        }
      });
      const measures = rows.flat();
      const rootRect = wrapper.getBoundingClientRect();

      // Computed first, assigned once at the end — flipping a staff's flag
      // false-then-true within one pass (rather than assigning its final
      // value once) would fire the setter's re-render/dispatch twice per
      // pass even when the net value is unchanged from the prior pass,
      // which perpetually reschedules a redraw via staff-notes-positioned.
      const staffsNeedingClefChangeFlag = new Set<HTMLElement>();

      for (let i = 1; i < measures.length; i++) {
        const outgoingMeasure = measures[i - 1];
        const incomingMeasure = measures[i];
        const isRowWrap =
          rowIndexByMeasure.get(outgoingMeasure) !==
          rowIndexByMeasure.get(incomingMeasure);

        const outgoingStaves = Array.from(outgoingMeasure.children).filter(
          (el) => isStaffNodeName(el.nodeName)
        ) as HTMLElement[];
        const incomingStaves = Array.from(incomingMeasure.children).filter(
          (el) => isStaffNodeName(el.nodeName)
        ) as HTMLElement[];

        // Staves are matched by ordinal position within their measure (1st
        // staff vs 1st, 2nd vs 2nd) — assumes consistent voice ordering
        // across measures, which holds for this library's single-line-per-
        // measure composition model.
        const pairCount = Math.min(
          outgoingStaves.length,
          incomingStaves.length
        );
        for (let staffIndex = 0; staffIndex < pairCount; staffIndex++) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duck-typed call to avoid cross-module import
          const outgoingStaff = outgoingStaves[staffIndex] as any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duck-typed call to avoid cross-module import
          const incomingStaff = incomingStaves[staffIndex] as any;
          const outgoingClef = outgoingStaff.effectiveEndClef ?? null;
          const incomingClef = incomingStaff.effectiveStartClef ?? null;

          // null means "not clef-comparable" (e.g. a vocal or guitar-tab
          // staff, which have no ClefType concept) — skip the pair.
          if (outgoingClef === null || incomingClef === null) {
            continue;
          }

          if (outgoingClef !== incomingClef) {
            staffsNeedingClefChangeFlag.add(incomingStaff);

            if (!isRowWrap) {
              continue;
            }

            const outgoingRect = (
              outgoingStaves[staffIndex] as HTMLElement
            ).getBoundingClientRect();
            const glyphWidth = 30 * COURTESY_CLEF_SCALE;
            const x =
              outgoingRect.right -
              rootRect.left -
              glyphWidth -
              COURTESY_CLEF_MARGIN_RIGHT_PX;
            const y = outgoingRect.top - rootRect.top;

            const courtesyGroup = document.createElementNS(SVG_NS, 'g');
            courtesyGroup.setAttribute(
              'transform',
              `translate(${x}, ${y}) scale(${COURTESY_CLEF_SCALE})`
            );
            // Courtesy clef previews the UPCOMING clef (next line's), not a
            // repeat of the current one — that's the entire point of it.
            courtesyGroup.innerHTML = getClefRenderData(incomingClef).clefSvg;
            overlay.appendChild(courtesyGroup);
          }
        }
      }

      // Single assignment per staff, computed value vs. current — never a
      // false-then-true round trip in the same pass (see comment above).
      Array.from(this.querySelectorAll(STAFF_TAGS)).forEach((staff) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duck-typed call to avoid cross-module import
        (staff as any).clefChangeAtBoundary = staffsNeedingClefChangeFlag.has(
          staff as HTMLElement
        );
      });
    }

    // A time signature is shown only on the first measure, or on a later
    // measure whose resolved time signature differs from the measure right
    // before it (including redefining the original signature after a change)
    // — mirrors #updateClefContinuity's adjacent-pair comparison. Every staff
    // type has a real `.time` (StaffElementBase), but `timeChangeAtBoundary`
    // (the flag that actually shows the glyph) stays classical-only — guitar
    // tab never renders a time signature, so it has nothing to flag.
    #updateTimeSignatureContinuity() {
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

          if (outgoingStaff.time !== incomingStaff.time) {
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

    #renumberMeasures() {
      const measures = Array.from(this.children).filter(
        (node) => node.nodeName === MUSIC_MEASURE_NODE
      ) as HTMLElement[];
      measures.forEach((measure, index) => {
        if (index === 0) {
          measure.setAttribute(COMMON_ATTRIBUTES.TIME, this.time);
        }
        measure.setAttribute('number', (index + 1).toString());
      });

      // This runs from the childList MutationObserver, i.e. after a framework
      // commit has settled the DOM. Nudge the first measure's staves to rebuild
      // their describe area so the "first measure" time-signature glyph is
      // correct even when they connected before the first measure took its final
      // position (e.g. a new measure 1 inserted before the old one is removed).
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
