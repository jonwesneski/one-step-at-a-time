import {
  type ArpeggioEntry,
  resolveArpeggioSpans,
} from '../rules/arpeggioRules';
import { resolveStaffGroups } from '../rules/staffGroupRules';
import { measureFlexValue } from '../rules/staffWidth';
import type {
  NoteOrChordElementType,
  StaffElementBaseType,
} from '../types/elements';
import type { HairpinKind } from '../types/theory';
import {
  appendArpeggioHairpin,
  COMMON_ATTRIBUTES,
  createArpeggioSvg,
  createBraceSvg,
  createBracketSvg,
  createDynamicMarkingSvg,
  isStaffNodeName,
  MUSIC_CHORD,
  MUSIC_COMPOSITION,
  MUSIC_MEASURE,
  MUSIC_NOTE,
  NOTE_EVENTS,
  STAFF_EVENTS,
  SVG_NS,
} from '../utils';
import {
  buildConnectorSvgs,
  collectArpeggioTiePairs,
  collectNoteLikeElements,
  pairConnectors,
  partitionByVoice,
} from '../utils/connectorsBuilder';
import {
  ARPEGGIO_CHORD_GAP_PX,
  ARPEGGIO_WAVE_WIDTH_PX,
  BRACE_STAFF_GAP_PX,
  BRACE_WIDTH_PX,
  BRACKET_EXTRA_HEIGHT_PX,
  BRACKET_STAFF_GAP_PX,
  BRACKET_TOP_OFFSET_PX,
  BRACKET_WIDTH_PX,
  EMPTY_MEASURE_FLEX_BASIS_PX,
  MEASURE_MIN_WIDTH_PX,
  STAFF_BOTTOM_MARGIN,
  STAFF_LABEL_FONT_SIZE,
  STAFF_LABEL_LEFT_MARGIN_PX,
  STAFF_LABEL_WIDTH_PX,
  STAFF_LINE_START,
} from '../utils/notationDimensions';

// Per-staff vertical footprint within a measure's stacked staff children,
// used both by the plain full-measure barline (#updateConnectorVisibility)
// and group connectors (brace/bracket) to size/position their vertical
// span. A staff's own slot height is derived from its actual rendered
// height (staffSlotHeightPx) rather than assumed uniform, since staff types
// differ (e.g. a 6-line guitar-tab staff vs. a 5-line classical staff) —
// tied to the real staff geometry, plus a small empirically-measured +2
// nudge closing a visible gap the clean derivation alone didn't fully
// account for. STAFF_SLOT_GAP_PX (the fixed gap between staves) and
// CONNECTOR_TOP_PX (a separate, still-empirical top-offset constant) don't
// depend on staff height and stay as plain constants.
const STAFF_SLOT_GAP_PX = STAFF_BOTTOM_MARGIN + STAFF_LINE_START - 2;
const CONNECTOR_TOP_PX = 51;

function staffSlotHeightPx(staff: StaffElementBaseType): number {
  return staff.staffHeight + 2;
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
   * @attr {number} number - Bar number shown above the measure.
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
      // cross-staff arpeggio that spans them, and any tie/slur/etc. across
      // this measure's own staves.
      this.#redrawArpeggios();
      this.#redrawConnectors();
      this.#redrawSharedDynamics();
    };
    #boundUpdateConnectorVisibility: () => void;
    #boundRedrawArpeggios = () => this.#redrawArpeggios(true);
    // A plain tie/slur attribute change (no geometry change) only ever
    // dispatches CONNECTOR_ATTRIBUTE_CHANGE, never STAFF_MIN_WIDTH — mirrors
    // composition.ts's own listener for the same event/reason.
    #boundRedrawConnectors = () => this.#redrawConnectors();
    // Likewise, a `dynamic`/`dynamic-shared` attribute change only ever
    // dispatches DYNAMIC_ATTRIBUTE_CHANGE (staffClassicalBase.ts's own
    // listener re-runs its local #renderDynamics, not a full layout pass).
    #boundRedrawSharedDynamics = () => this.#redrawSharedDynamics();

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
        this.#boundRedrawSharedDynamics
      );
    }

    disconnectedCallback(): void {
      this.#staffConnectorObserver.disconnect();
      this.removeEventListener(
        STAFF_EVENTS.STAFF_MIN_WIDTH,
        this.#onStaffMinWidth
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
        this.#boundRedrawSharedDynamics
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

          .staff-connector {
            position: absolute;
            left: 0;
            top: 51px;
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
        </style>
        <div>
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
          <!-- dynamic-shared markings, centered between two sibling
               staves — see #redrawSharedDynamics -->
          <svg class="shared-dynamics-overlay"></svg>
          <!-- Unimplemented measure-number display (TODO.md), unstyled and
               unpositioned. An empty string here would collapse this inline
               span to zero height, which shifts every brace/bracket/label's
               fixed px-based position (all absolute, unaffected by flow)
               out of alignment with the slotted staves below it (which DO
               participate in flow) — a non-breaking space keeps the same
               line-height this stub has always occupied, independent of the
               number attribute, without showing visible text. -->
          <span class="measure-number">${this.number ?? ' '}</span>
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
      const staves = Array.from(allMeasures[currentIndex].children).filter(
        (n) => isStaffNodeName(n.nodeName)
      ) as StaffElementBaseType[];
      const connectorHeight =
        staves.reduce((sum, staff) => sum + staffSlotHeightPx(staff), 0) +
        STAFF_SLOT_GAP_PX * (staves.length - 1);
      staffConnector.style.height = `${connectorHeight}px`;

      const isFirstInRow = this.#isFirstInRow(allMeasures, currentIndex);

      this.#renderGroupConnectors(isFirstInRow);
      this.#renderStaffLabels(isFirstInRow);
      staffConnector.classList.toggle('hidden', !isFirstInRow);
      this.#redrawArpeggios();
      this.#redrawConnectors();
      this.#redrawSharedDynamics();
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

      const byVoice = partitionByVoice(collectNoteLikeElements(this));
      const pairs = [
        ...[...byVoice.values()].flatMap((notes) => pairConnectors(notes)),
        ...collectArpeggioTiePairs(this),
      ];
      if (pairs.length === 0) {
        return;
      }

      const rootRect = this.getBoundingClientRect();
      const svgs = buildConnectorSvgs(pairs, {
        rootRect,
        rowLeft: 0,
        rowRight: rootRect.width,
      });
      for (const svg of svgs) {
        overlay.appendChild(svg);
      }
    }

    // A `dynamic-shared` note/chord suppresses its own staff-local dynamic
    // rendering (staffClassicalBase.ts#renderDynamics) in favor of one drawn
    // here, centered in the vertical gap between this staff and its nearest
    // sibling staff — e.g. a keyboard dynamic marking both hands at once.
    // Unlike #redrawConnectors, this never defers to composition.ts (there is
    // no composition-level equivalent — a measure's own staves are always the
    // right unit for "the gap between two staves").
    #redrawSharedDynamics() {
      const overlay = this.shadowRoot?.querySelector<SVGSVGElement>(
        '.shared-dynamics-overlay'
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
      if (staves.length < 2) {
        return;
      }

      const measureRect = this.getBoundingClientRect();
      const elementSelector = `${MUSIC_NOTE}:not(${MUSIC_CHORD} ${MUSIC_NOTE}):defined, ${MUSIC_CHORD}:defined`;

      staves.forEach((staff, staffIndex) => {
        const neighborIndex =
          staffIndex + 1 < staves.length ? staffIndex + 1 : staffIndex - 1;
        const neighbor = staves[neighborIndex];
        if (!neighbor) {
          return;
        }
        const staffRect = staff.getBoundingClientRect();
        const neighborRect = neighbor.getBoundingClientRect();
        const gapMidY =
          neighborIndex > staffIndex
            ? (staffRect.bottom + neighborRect.top) / 2
            : (neighborRect.bottom + staffRect.top) / 2;

        const elements = Array.from(
          staff.querySelectorAll(elementSelector)
        ) as NoteOrChordElementType[];
        for (const element of elements) {
          if (element.dynamic === null || !element.dynamicShared) {
            continue;
          }
          const heads = this.#headRects(element);
          if (heads.length === 0) {
            continue;
          }
          const centerX =
            heads.reduce((sum, r) => sum + r.left + r.width / 2, 0) /
            heads.length;
          overlay.appendChild(
            createDynamicMarkingSvg(
              element.dynamic,
              centerX - measureRect.left,
              gapMidY - measureRect.top
            )
          );
        }
      });
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

      for (const { index, count, group } of groups) {
        const isGrandStaff = group === 'grand';
        const bracketExtraHeight = isGrandStaff ? 0 : BRACKET_EXTRA_HEIGHT_PX;
        const precedingStavesHeight = staves
          .slice(0, index)
          .reduce(
            (sum, staff) => sum + staffSlotHeightPx(staff) + STAFF_SLOT_GAP_PX,
            0
          );
        const spanHeight =
          staves
            .slice(index, index + count)
            .reduce((sum, staff) => sum + staffSlotHeightPx(staff), 0) +
          STAFF_SLOT_GAP_PX * (count - 1) +
          bracketExtraHeight;
        const topOffset =
          CONNECTOR_TOP_PX +
          precedingStavesHeight -
          (isGrandStaff ? 0 : BRACKET_TOP_OFFSET_PX + bracketExtraHeight / 2);

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

      let precedingStavesHeight = 0;
      for (const staff of staves) {
        const slotHeight = staffSlotHeightPx(staff);
        if (staff.label) {
          const el = document.createElement('div');
          el.classList.add('staff-label');
          el.style.left = `${-(
            groupConnectorWidthPx +
            STAFF_LABEL_WIDTH_PX +
            STAFF_LABEL_LEFT_MARGIN_PX
          )}px`;
          el.style.top = `${
            CONNECTOR_TOP_PX + precedingStavesHeight + slotHeight / 2
          }px`;
          el.textContent = staff.label;
          container.appendChild(el);
        }
        precedingStavesHeight += slotHeight + STAFF_SLOT_GAP_PX;
      }
    }
  }

  if (!customElements.get('music-measure')) {
    customElements.define('music-measure', MeasureElement);
  }
}
