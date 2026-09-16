import { computeBeatOffsets } from '../rules/beatRules';
import {
  computeMeasureProportionalOffsets,
  computeSpacingWeights,
} from '../rules/spacingRules';
import {
  calculateGuitarTabMinWidth,
  calculateStaffNaturalWidth,
} from '../rules/staffWidth';
import { StaffElementBase } from '../staffBase';
import { GuitarNoteElementType } from '../types/elements';
import {
  COMMON_ATTRIBUTES,
  MUSIC_GUITAR_CHORD_NODE,
  MUSIC_GUITAR_NOTE,
  MUSIC_GUITAR_NOTE_NODE,
  MUSIC_STAFF_GUITAR_TAB,
  STAFF_EVENTS,
  SVG_NS,
} from '../utils/consts';
import {
  LEADING_NOTE_GAP_PX,
  MIN_NOTE_WIDTH,
  STAFF_LINE_SPACING,
  STAFF_LINE_START,
} from '../utils/notationDimensions';

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
    #describeEndX = 0;
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
    #yCoordinates: Record<number, number> = {
      6: STAFF_LINE_START,
      5: STAFF_LINE_START + STAFF_LINE_SPACING,
      4: STAFF_LINE_START + STAFF_LINE_SPACING * 2,
      3: STAFF_LINE_START + STAFF_LINE_SPACING * 3,
      2: STAFF_LINE_START + STAFF_LINE_SPACING * 4,
      1: STAFF_LINE_START + STAFF_LINE_SPACING * 5,
    };

    constructor() {
      super();
      this.#describeContainer = document.createElementNS(SVG_NS, 'g');
    }

    get staffLineCount(): number {
      return 6;
    }

    protected override get additionalStyles(): string {
      return `
        ::slotted(${MUSIC_GUITAR_NOTE}) {
          position: absolute;
        }
      `;
    }

    static get observedAttributes(): string[] {
      return [COMMON_ATTRIBUTES.TIME, 'group', 'group-id'];
    }

    // No time-signature glyph to render (tab notation doesn't show one), so
    // unlike StaffClassicalElementBase's equivalent branch, this only
    // re-resolves the stored value — no re-render needed.
    override attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null
    ): void {
      if (oldValue === newValue) {
        return;
      }
      if (name === COMMON_ATTRIBUTES.TIME) {
        this.effectiveTimeSig = this.convertTotimeInts(
          this.resolveInheritedValue(COMMON_ATTRIBUTES.TIME, '4/4')
        );
      } else if (name === 'group' || name === 'group-id') {
        this.dispatchGroupAttributeChange();
      }
    }

    // Mirrors StaffClassicalElementBase.refreshInheritedAttrs, scoped to
    // `time` only — guitar tab has no keySig/mode concept.
    refreshInheritedAttrs() {
      this.effectiveTimeSig = this.convertTotimeInts(
        this.resolveInheritedValue(COMMON_ATTRIBUTES.TIME, '4/4')
      );
    }

    protected onConnectedCallback() {
      // Re-resolve now that ancestors are reachable via closest()
      this.effectiveTimeSig = this.convertTotimeInts(
        this.resolveInheritedValue(COMMON_ATTRIBUTES.TIME, '4/4')
      );

      this.#describeContainer.setAttribute('class', 'describe-container');
      this.#describeContainer.innerHTML = this.#showDescribe
        ? StaffGuitarTabElement.#tabSvg
        : '';
      this.transcribeContainer.appendChild(this.#describeContainer);
    }

    #refreshDescribe() {
      this.#describeContainer.innerHTML = this.#showDescribe
        ? StaffGuitarTabElement.#tabSvg
        : '';
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function -- no cleanup needed yet; still an empty stub (see CLAUDE.md Known Incomplete Areas)
    protected override onDisconnectedCallback(): void {}

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
        return;
      }
      const minWidth = calculateGuitarTabMinWidth(
        this.#describeEndX,
        elements.length
      );
      const { totalWeight } = computeSpacingWeights(elements);
      const naturalWidth = calculateStaffNaturalWidth(minWidth, totalWeight);
      this.dispatchEvent(
        new CustomEvent(STAFF_EVENTS.STAFF_MIN_WIDTH, {
          bubbles: true,
          composed: false,
          detail: { minWidth, naturalWidth },
        })
      );
    }

    #spaceElements(assignedElements: GuitarNoteElementType[]) {
      const transcribeRect = this.transcribeContainer.getBoundingClientRect();
      const describeRect = this.#describeContainer.getBoundingClientRect();
      this.#describeEndX = Math.round(describeRect.right - transcribeRect.left);
      const remainingWidth = transcribeRect.width - this.#describeEndX;

      // Same fixed measure-capacity-proportional model as the classical
      // staff (see rules/spacingRules.ts) — guitar tab has no tuplets or
      // arpeggios, so the beat-offset accounting is plain duration only.
      const [beatsInMeasure, beatType] = this.effectiveTimeSig;
      const measureCapacity = beatsInMeasure / beatType;
      const beatOffsets = computeBeatOffsets(assignedElements, new Map());
      const proportionalWidth = remainingWidth - LEADING_NOTE_GAP_PX;
      const measureOffsets = computeMeasureProportionalOffsets(
        beatOffsets,
        measureCapacity,
        proportionalWidth
      );

      let previousNoteX: number | null = null;
      for (let i = 0; i < assignedElements.length; i++) {
        const element = assignedElements[i];
        const xOffsetInNotesSpace = LEADING_NOTE_GAP_PX + measureOffsets[i];
        let x = this.#describeEndX + xOffsetInNotesSpace;
        if (previousNoteX !== null) {
          x = Math.max(x, previousNoteX + MIN_NOTE_WIDTH);
        }
        previousNoteX = x;
        element.style.left = `${x}px`;
        element.style.top = `${
          this.#yCoordinates[element.string] ?? STAFF_LINE_START
        }px`;
      }
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
