import { barlineGlyphWidth } from '../rules/barlineRules';
import { computeBeatOffsets } from '../rules/beatRules';
import {
  computeMeasureProportionalOffsets,
  computeUncrowdedWidth,
  computeRoomAfterEntries,
  computeSpacingWeights,
  mergeColumnRooms,
  type ColumnRoom,
  type OffsetLimit,
} from '../rules/spacingRules';
import {
  calculateGuitarTabMinWidth,
  calculateStaffNaturalWidth,
  widenToUncrowded,
} from '../rules/staffWidth';
import {
  MARKER_BEAT_EPSILON,
  type MarkerBeat,
  markerWidthReached,
  totalMarkerWidth,
} from '../rules/streamMarkerRules';
import { type BarlineSlotLeft, StaffElementBase } from '../staffBase';
import { GuitarNoteElementType } from '../types/elements';
import {
  COMMON_ATTRIBUTES,
  MUSIC_GUITAR_CHORD_NODE,
  MUSIC_GUITAR_NOTE,
  MUSIC_GUITAR_NOTE_NODE,
  MUSIC_STAFF_GUITAR_TAB,
  NOTE_EVENTS,
  STAFF_EVENTS,
  SVG_NS,
} from '../utils/consts';
import {
  BARLINE_THICK_PX,
  LEADING_NOTE_GAP_PX,
  MID_BAR_BARLINE_PADDING_PX,
  MIN_NOTE_WIDTH,
  REPEAT_START_LEAD_PX,
  STAFF_LINE_SPACING,
  STAFF_LINE_START,
} from '../utils/notationDimensions';
import {
  createBarlineSvg,
  createStartRepeatSvg,
} from '../utils/svgCreator/barlines';

const TAB_STRING_COUNT = 6;

// Y of a tab string's line, string 1 at the top; an out-of-range string sits
// on the top line.
function stringToY(string: number): number {
  const line =
    Number.isInteger(string) && string >= 1 && string <= TAB_STRING_COUNT
      ? string
      : 1;
  return STAFF_LINE_START + (line - 1) * STAFF_LINE_SPACING;
}

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  /**
   * A six-line guitar tablature staff. Reads slotted `<music-guitar-note>`
   * children and places them by string and fret. Carries a `time` value (for
   * spacing) but never draws a time-signature glyph. Usable inside a
   * `<music-measure>` / `<music-composition>` or on its own.
   *
   * @customElement music-staff-guitar-tab
   * @attr {TimeSignature} time - Beats per measure, used for note spacing. Inherited from a parent measure/composition when unset.
   * @attr {'grand' | 'bracket'} group - Joins this staff to its next sibling under a brace or bracket connector.
   * @attr {string} group-id - Shared identifier letting a `group="bracket"` connector span more than two contiguous staves.
   * @attr {string} label - Short margin text to the left of the staff (e.g. `r.h.`/`l.h.` hand distribution, an instrument name). Only drawn on the first measure of each visual row.
   * @attr {string} part - Names the part this staff carries, for a tab staff's `tab-for` to match.
   * @attr {string} tab-for - The `part` of the notation staff in the same `<music-measure>` this tab mirrors; the tab then keeps its notes aligned with that staff past a mid-bar clef change. Has no effect outside a `<music-measure>`.
   *
   * @example
   * <music-staff-guitar-tab time="4/4">
   *   <music-guitar-note string="3" fret="0" duration="quarter"></music-guitar-note>
   *   <music-guitar-note string="2" fret="1" duration="quarter"></music-guitar-note>
   * </music-staff-guitar-tab>
   */
  class StaffGuitarTabElement extends StaffElementBase {
    static #tabSvg = `
      <svg class="clef" y="20" height="80px" width="80px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:svg="http://www.w3.org/2000/svg" version="1.1">
        <text x="40" font-size="20" text-anchor="middle" fill="currentColor" font-weight="bold">
            <tspan x="20" dy="20">T</tspan>
            <tspan x="20" dy="20">A</tspan>
            <tspan x="18" dy="20">B</tspan>
        </text>
      </svg>
    `;
    #describeContainer: SVGGElement;
    #barlinesContainer: SVGGElement;
    #ownBarlineSlotLefts: BarlineSlotLeft[] = [];
    #ownColumnRooms: ColumnRoom[] = [];
    // Least width at which every entry keeps its proportional place.
    #uncrowdedWidth = 0;
    #describeEndX = 0;
    #ownDescribeEndX = 0;
    #showDescribe = true;
    #currentElements: GuitarNoteElementType[] = [];

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

    constructor() {
      super();
      this.#describeContainer = document.createElementNS(SVG_NS, 'g');
      this.#barlinesContainer = document.createElementNS(SVG_NS, 'g');
      this.#barlinesContainer.setAttribute('class', 'barlines-container');
    }

    override get ownColumnRooms(): readonly ColumnRoom[] {
      return this.#ownColumnRooms;
    }

    override get ownBarlineSlotLefts(): readonly BarlineSlotLeft[] {
      return this.#ownBarlineSlotLefts;
    }

    protected override onBarlinesChange(): void {
      this.#relayout();
    }

    get staffLineCount(): number {
      return TAB_STRING_COUNT;
    }

    protected override get additionalStyles(): string {
      return `
        ::slotted(${MUSIC_GUITAR_NOTE}) {
          position: absolute;
        }
      `;
    }

    static get observedAttributes(): string[] {
      return [
        COMMON_ATTRIBUTES.TIME,
        'group',
        'group-id',
        'label',
        'part',
        'tab-for',
      ];
    }

    // Tab draws no time-signature glyph, but the bar's capacity still spaces
    // the notes, so a `time` change relays them out.
    override attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null
    ): void {
      if (oldValue === newValue) {
        return;
      }
      if (name === COMMON_ATTRIBUTES.TIME) {
        this.effectiveTimeSig = this.resolveTimeSignature();
        this.#relayout();
      } else if (name === 'group' || name === 'group-id') {
        this.dispatchGroupAttributeChange();
      } else if (name === 'label') {
        this.dispatchLabelAttributeChange();
      } else if (name === 'part' || name === 'tab-for') {
        this.dispatchTabLinkAttributeChange();
      }
    }

    get tabFor(): string | null {
      return this.getAttribute('tab-for');
    }

    set tabFor(value: string | null) {
      if (value === null) {
        this.removeAttribute('tab-for');
      } else {
        this.setAttribute('tab-for', value);
      }
    }

    override get ownNotesStartX(): number {
      return this.#ownDescribeEndX;
    }

    protected override onMeasureLayoutChange(): void {
      this.#renderNotes(this.#currentElements);
    }

    // Mirrors StaffNotationElementBase.refreshInheritedAttrs, scoped to
    // `time` only — guitar tab has no keySig/mode concept.
    refreshInheritedAttrs() {
      this.effectiveTimeSig = this.resolveTimeSignature();
      this.#relayout();
    }

    // Also runs when a note's `string` or `duration` changes: its line, and
    // every later note's x, move.
    #relayout = () => {
      if (this.#currentElements.length > 0) {
        this.#renderNotes(this.#currentElements);
      }
    };

    protected onConnectedCallback() {
      this.addEventListener(NOTE_EVENTS.NOTE_Y_CHANGE, this.#relayout);
      // Re-resolve now that ancestors are reachable via closest()
      this.effectiveTimeSig = this.resolveTimeSignature();

      this.#describeContainer.setAttribute('class', 'describe-container');
      this.#describeContainer.innerHTML = this.#showDescribe
        ? StaffGuitarTabElement.#tabSvg
        : '';
      this.transcribeContainer.appendChild(this.#describeContainer);
      this.transcribeContainer.appendChild(this.#barlinesContainer);
    }

    #refreshDescribe() {
      this.#describeContainer.innerHTML = this.#showDescribe
        ? StaffGuitarTabElement.#tabSvg
        : '';
    }

    protected override onDisconnectedCallback(): void {
      this.removeEventListener(NOTE_EVENTS.NOTE_Y_CHANGE, this.#relayout);
    }

    protected override onHandleSlotChange(event: Event): void {
      const slot = event.target as HTMLSlotElement;
      const slotted = slot.assignedElements({ flatten: true });
      this.upgradeAssignedElements(slotted);
      const assignedElements = slotted.filter(
        (e) =>
          e.nodeName === MUSIC_GUITAR_NOTE_NODE ||
          e.nodeName === MUSIC_GUITAR_CHORD_NODE
      ) as GuitarNoteElementType[];

      this.#renderNotes(assignedElements);
    }

    #renderNotes(assignedElements: GuitarNoteElementType[]) {
      this.#currentElements = assignedElements;
      this.#spaceElements(assignedElements);
      this.dispatchEvent(
        new CustomEvent(STAFF_EVENTS.NOTES_POSITIONED, {
          bubbles: true,
          composed: true,
        })
      );
      this.drawConnectorsWhenStandalone();
      this.#dispatchStaffWidths(assignedElements);
    }

    #dispatchStaffWidths(elements: GuitarNoteElementType[]) {
      if (elements.length === 0) {
        this.reportStaffWidths(null);
        return;
      }
      const minWidth =
        calculateGuitarTabMinWidth(this.#describeEndX, elements.length) +
        totalMarkerWidth(this.measureMarkerBeats) +
        this.endBarlineReserve +
        this.endWarningSpace.reserved;
      const { totalWeight } = computeSpacingWeights(elements);
      const naturalWidth = widenToUncrowded(
        calculateStaffNaturalWidth(minWidth, totalWeight),
        this.#uncrowdedWidth
      );
      this.reportStaffWidths({ minWidth, naturalWidth });
    }

    #spaceElements(assignedElements: GuitarNoteElementType[]) {
      const transcribeRect = this.transcribeContainer.getBoundingClientRect();
      const describeRect = this.#describeContainer.getBoundingClientRect();
      this.#barlinesContainer.replaceChildren();
      this.#ownDescribeEndX = Math.round(
        this.#drawStartRepeat(describeRect.right - transcribeRect.left)
      );
      this.#describeEndX = Math.max(
        this.#ownDescribeEndX,
        this.measureNotesStartX
      );
      const remainingWidth =
        transcribeRect.width -
        this.#describeEndX -
        this.endBarlineReserve -
        this.endWarningSpace.width;

      // Same fixed measure-capacity-proportional model as the classical
      // staff (see rules/spacingRules.ts) — guitar tab has no tuplets or
      // arpeggios, so the beat-offset accounting is plain duration only.
      const [beatsInMeasure, beatType] = this.effectiveTimeSig;
      const measureCapacity = beatsInMeasure / beatType;
      const beatOffsets = computeBeatOffsets(assignedElements, new Map());
      // Every barline in the measure, and a mirrored notation staff's clef
      // changes (measureMarkerBeats; clefs arrive only when `tab-for` links
      // this tab), take room in the measure, so the tab leaves the same room
      // to stay aligned with the other staves.
      const markers = this.measureMarkerBeats;
      const proportionalWidth =
        remainingWidth - LEADING_NOTE_GAP_PX - totalMarkerWidth(markers);

      // What each entry needs after it, as on the classical staff.
      const voice = {
        beatOffsets,
        rooms: assignedElements.map((_, i) => {
          const nextBeat = beatOffsets[i + 1] ?? Number.POSITIVE_INFINITY;
          return (
            MIN_NOTE_WIDTH +
            totalMarkerWidth(
              markers.filter(
                ({ beat }) =>
                  beat > beatOffsets[i] + MARKER_BEAT_EPSILON &&
                  beat <= nextBeat + MARKER_BEAT_EPSILON
              )
            )
          );
        }),
      };
      const limitsOf = (columns: readonly ColumnRoom[]): OffsetLimit[] =>
        columns.map(({ beat, roomAfter }) => ({
          beat,
          offset:
            remainingWidth -
            LEADING_NOTE_GAP_PX -
            markerWidthReached(markers, beat) -
            roomAfter,
        }));
      const { columns } = computeRoomAfterEntries([voice]);
      const ownLimits = limitsOf(columns);
      const markersWidth = totalMarkerWidth(markers);
      this.#uncrowdedWidth =
        this.#describeEndX +
        LEADING_NOTE_GAP_PX +
        markersWidth +
        this.endBarlineReserve +
        this.endWarningSpace.reserved +
        computeUncrowdedWidth(
          columns.map(({ beat, roomAfter }) => ({
            beat,
            roomAfter:
              roomAfter + markerWidthReached(markers, beat) - markersWidth,
          })),
          measureCapacity
        );
      this.#ownColumnRooms = columns.filter(
        ({ beat }, i) =>
          beat > 0 &&
          ownLimits[i].offset < (beat / measureCapacity) * proportionalWidth
      );
      const limits = limitsOf(
        mergeColumnRooms([columns, this.sharedColumnRooms])
      );
      const measureOffsets = computeMeasureProportionalOffsets(
        beatOffsets,
        measureCapacity,
        proportionalWidth,
        limits
      );

      // A barline's slot sits just before the entries on its beat, at the
      // measure's shared x so it runs through every staff.
      const ownSlotLefts: BarlineSlotLeft[] = [];
      const slots: { marker: MarkerBeat; left: number }[] = [];
      markers.forEach((marker, index) => {
        if (marker.kind !== 'barline' || marker.barlineType === null) {
          return;
        }
        const [offset] = computeMeasureProportionalOffsets(
          [Math.max(0, marker.beat)],
          measureCapacity,
          proportionalWidth,
          limits
        );
        const ownLeft =
          this.#describeEndX +
          LEADING_NOTE_GAP_PX +
          totalMarkerWidth(markers.slice(0, index)) +
          offset;
        ownSlotLefts.push({ beat: marker.beat, left: ownLeft });
        const shared = this.measureBarlineSlotLefts.find(
          (slot) => Math.abs(slot.beat - marker.beat) <= MARKER_BEAT_EPSILON
        );
        const left = Math.max(ownLeft, shared?.left ?? ownLeft);
        slots.push({ marker, left });
        // The glyph keeps to the slot's right edge, as the notation staff's
        // does, so a slot widened by another staff's warning still lines up.
        this.#barlinesContainer.appendChild(
          createBarlineSvg(
            marker.barlineType,
            TAB_STRING_COUNT,
            left +
              marker.width -
              MID_BAR_BARLINE_PADDING_PX -
              barlineGlyphWidth(marker.barlineType)
          )
        );
      });

      let previousNoteX: number | null = null;
      for (let i = 0; i < assignedElements.length; i++) {
        const element = assignedElements[i];
        let x =
          this.#describeEndX +
          LEADING_NOTE_GAP_PX +
          markerWidthReached(markers, beatOffsets[i]) +
          measureOffsets[i];
        for (const slot of slots) {
          if (slot.marker.beat <= beatOffsets[i] + MARKER_BEAT_EPSILON) {
            x = Math.max(x, slot.left + slot.marker.width);
          }
        }
        if (previousNoteX !== null) {
          x = Math.max(x, previousNoteX + MIN_NOTE_WIDTH);
        }
        previousNoteX = x;
        element.style.left = `${x}px`;
        element.style.top = `${stringToY(element.string)}px`;
      }
      this.#ownBarlineSlotLefts = ownSlotLefts;
    }

    // Draws the start repeat after the TAB label (or centred on the barline
    // it replaces) and returns where the start area now ends.
    #drawStartRepeat(describeEndX: number): number {
      const mode = this.startRepeat;
      if (mode === 'none') {
        return describeEndX;
      }
      const x =
        mode === 'shared-thick' ? 0 : describeEndX + REPEAT_START_LEAD_PX;
      this.#barlinesContainer.appendChild(
        createStartRepeatSvg(mode, TAB_STRING_COUNT, x)
      );
      const width = barlineGlyphWidth('repeat-start');
      return Math.max(
        describeEndX,
        mode === 'shared-thick' ? width - BARLINE_THICK_PX / 2 : x + width
      );
    }

    protected override onStaffResize(): void {
      if (this.#currentElements.length > 0) {
        this.#spaceElements(this.#currentElements);
        this.dispatchEvent(
          new CustomEvent(STAFF_EVENTS.NOTES_POSITIONED, {
            bubbles: true,
            composed: true,
          })
        );
        this.drawConnectorsWhenStandalone();
        this.#dispatchStaffWidths(this.#currentElements);
      }
    }
  }

  if (!customElements.get(MUSIC_STAFF_GUITAR_TAB)) {
    customElements.define(
      MUSIC_STAFF_GUITAR_TAB,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the Base-Element has runtime typing
      StaffGuitarTabElement as any
    );
  }
}
