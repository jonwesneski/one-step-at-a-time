import { getClefRenderData } from '../rules/clefRules';
import { pairHairpins, resolveHairpinSegments } from '../rules/dynamicsRules';
import type { NoteChordOrRestElementType } from '../types/elements';
import { createHairpinSvg } from '../utils';
import {
  buildConnectorSvgs,
  collectNoteLikeElements,
  pairConnectors,
} from '../utils/connectorsBuilder';
import {
  COMMON_ATTRIBUTES,
  MUSIC_CHORD,
  MUSIC_COMPOSITION,
  MUSIC_MEASURE,
  MUSIC_MEASURE_NODE,
  MUSIC_NOTE,
  MUSIC_STAFF,
  MUSIC_STAFF_GUITAR_TAB,
  MUSIC_STAFF_VOCAL,
  SVG_NS,
  isStaffNodeName,
} from '../utils/consts';
import {
  BRACE_WIDTH_PX,
  BRACKET_WIDTH_PX,
  COURTESY_CLEF_MARGIN_RIGHT_PX,
  COURTESY_CLEF_SCALE,
  DYNAMICS_BASELINE_Y,
} from '../utils/notationDimensions';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class CompositionElement extends HTMLElement {
    static get observedAttributes(): string[] {
      // All attributes need to be all lower case because jsdom lowers then
      // in it's life-cycle
      return [
        COMMON_ATTRIBUTES.KEY_SIG,
        COMMON_ATTRIBUTES.MODE,
        COMMON_ATTRIBUTES.TIME_SIG,
      ];
    }

    #observer: MutationObserver | null;
    #measureCount: number;
    #resizeObserver: ResizeObserver | null;
    #redrawScheduled: boolean;
    #boundRedraw: () => void;

    constructor() {
      super();
      this.#observer = null;
      this.#measureCount = 0;
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
      return this.getAttribute(COMMON_ATTRIBUTES.TIME_SIG) ?? '4/4';
    }

    set time(value: string) {
      this.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, value);
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
    }

    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null
    ): void {
      if (oldValue === newValue) {
        return;
      }
      this.render();
      if (name === 'keysig' || name === 'mode' || name === 'time') {
        Array.from(this.querySelectorAll('*'))
          .filter((el) => isStaffNodeName(el.nodeName))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duck-typed call to avoid cross-module import
          .forEach((staff) => (staff as any).refreshInheritedAttrs?.());
      }
    }

    private render(): void {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- contructor creates it
      this.shadowRoot!.innerHTML = `
        <style>
          :host {
            display: block;
            width: 100%;
          }

          .composition-wrapper {
            position: relative;
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
          }

          .composition-wrapper.has-group-connector {
            padding-left: ${Math.max(BRACE_WIDTH_PX, BRACKET_WIDTH_PX)}px;
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
        </style>
        <div class="composition-wrapper">
          <div class="composition-grid">
            <slot></slot>
          </div>
          <svg class="connectors-overlay"></svg>
          <svg class="courtesy-clef-overlay"></svg>
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
        this.#updateDescribeVisibility();
        this.#updateClefContinuity();
        this.#updateGroupConnectorSpaceReservation();
      });
    }

    // A brace/bracket connector (see measure.ts's #renderGroupConnectors)
    // extends left of a measure's own x=0 — reserve room for it on the
    // composition wrapper only when at least one staff actually declares
    // `group`, so compositions without any grouped staves don't waste space.
    #updateGroupConnectorSpaceReservation() {
      const wrapper = this.shadowRoot?.querySelector<HTMLElement>(
        '.composition-wrapper'
      );
      if (!wrapper) {
        return;
      }

      const hasGroupedStaff = Array.from(this.querySelectorAll('*')).some(
        (el) =>
          isStaffNodeName(el.nodeName) &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duck-typed call to avoid cross-module import
          (el as any).group != null
      );

      wrapper.classList.toggle('has-group-connector', hasGroupedStaff);
    }

    // Groups measures into visual rows using the same top-diff-tolerance
    // technique #updateDescribeVisibility already relied on — shared so
    // #updateClefContinuity doesn't duplicate row-detection logic.
    #computeMeasureRows(): HTMLElement[][] {
      const measures = Array.from(
        this.querySelectorAll('music-measure')
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

      const notes = collectNoteLikeElements(this);
      if (notes.length === 0) {
        return;
      }

      const pairs = pairConnectors(notes);
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

      // Reset every staff's boundary flag before recomputing — a staff that
      // needed the flag last pass but no longer does (clef no longer
      // differs from its predecessor) must not keep showing a stale glyph.
      Array.from(this.querySelectorAll('*'))
        .filter((el) => isStaffNodeName(el.nodeName))
        .forEach((staff) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duck-typed call to avoid cross-module import
          (staff as any).clefChangeAtBoundary = false;
        });

      const rows = this.#computeMeasureRows();
      const rowIndexByMeasure = new Map<HTMLElement, number>();
      rows.forEach((row, rowIndex) => {
        for (const measure of row) {
          rowIndexByMeasure.set(measure, rowIndex);
        }
      });
      const measures = rows.flat();
      const rootRect = wrapper.getBoundingClientRect();

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
            incomingStaff.clefChangeAtBoundary = true;

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
    }

    #manageMeasureCount() {
      // Existing measures
      Array.from(this.children).forEach((node) => {
        if (node.nodeName === MUSIC_MEASURE_NODE) {
          this.#setMeasure(node as HTMLElement);
        }
      });

      // Dynamically added measures
      this.#observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeName === MUSIC_MEASURE_NODE) {
              this.#setMeasure(node as HTMLElement);
            }
          }
        }
      });

      this.#observer.observe(this, {
        childList: true,
      });
    }

    #setMeasure(measure: HTMLElement) {
      if (this.#measureCount === 0) {
        measure.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, this.time);
      }
      measure.setAttribute('number', (++this.#measureCount).toString());
    }

    // #handleSlotChange(event: Event) {
    //   // TODO: see if I still need this
    //   // right now I'm adjusting in #manageMeasureCount
    //   // slotChange event gets fired after all children it's children are rendered first
    //   const slot = event.target as HTMLSlotElement;
    //   const assignedElements = slot
    //     .assignedElements({ flatten: true })
    //     .filter((e) => e.nodeName === 'MUSIC-MEASURE');
    // }
  }

  if (!customElements.get(MUSIC_COMPOSITION)) {
    customElements.define(MUSIC_COMPOSITION, CompositionElement);
  }
}
