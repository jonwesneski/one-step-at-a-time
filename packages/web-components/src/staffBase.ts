import { computeBandOverflow, VerticalBand } from './rules/verticalSpaceRules';
import {
  BeatsInMeasure,
  BeatTypeInMeasure,
  StaffGroupType,
  TimeSignature,
} from './types/theory';
import { SVG_NS } from './utils';
import {
  buildConnectorSvgs,
  collectArpeggioTiePairs,
  collectNoteLikeElements,
  collectPhraseSlurPairs,
  pairConnectors,
  partitionByVoice,
} from './utils/connectorsBuilder';
import {
  COMMON_ATTRIBUTES,
  MUSIC_ARPEGGIO_NODE,
  MUSIC_COMPOSITION,
  MUSIC_MEASURE,
  MUSIC_TUPLET_NODE,
  MUSIC_VOICE_NODE,
  STAFF_EVENTS,
} from './utils/consts';
import {
  STAFF_BOTTOM_MARGIN,
  STAFF_LINE_SPACING,
  STAFF_LINE_START,
  STAFF_WRAPPER_MIN_HEIGHT,
  VERTICAL_OVERFLOW_CLEARANCE_PX,
} from './utils/notationDimensions';
import { parseStaffGroup } from './utils/parsers';
import {
  measureVerticalExtents,
  VerticalSpaceReservations,
} from './utils/verticalSpace';

// Runtime-safe fallback for environments without `HTMLElement` (SSR/Node). Prevents errrors if loaded in SSR
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- globalThis.HTMLElement isn't typed as a class constructor
export const _MaybeHTMLElement: any =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- globalThis.HTMLElement isn't typed as a class constructor
  typeof globalThis !== 'undefined' && (globalThis as any).HTMLElement
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any -- globalThis.HTMLElement isn't typed as a class constructor
      (globalThis as any).HTMLElement
    : class {};

const STANDALONE_OVERLAY_SOURCE = 'standalone-overlay';
const ROW_ALIGNMENT_SOURCE = 'row-alignment';

export abstract class StaffElementBase extends _MaybeHTMLElement {
  protected readonly staffContainer: HTMLDivElement;
  protected readonly staffResizeObserver: ResizeObserver;
  // The `.staff-wrapper` div — the `position: relative` containing block
  // shared by the <slot> (and therefore every slotted note/chord/rest,
  // which resolve `position: absolute` against it via the flat tree) and
  // `staffContainer`/`transcribeContainer` (its `position: absolute;
  // inset: 0` siblings). Exposed so a subclass can append a DOM element
  // that needs pixel-identical positioning to a slotted note without
  // actually being slotted — e.g. a synthesized combined-voice chord or
  // shared whole-measure rest (see staffClassicalBase.ts's voice
  // auto-combine / shared-rest passes), which isn't a light-DOM child of
  // the host element and so can't go through the <slot> at all.
  protected wrapperElement: HTMLDivElement | null = null;
  #lastStaffWidth: number;

  protected readonly transcribeContainer: SVGSVGElement;
  #standaloneConnectorsOverlay: SVGSVGElement;
  // A margin change moves this staff's lines, so the ancestor measure
  // re-lays its brace/barline/labels against them.
  #verticalSpace = new VerticalSpaceReservations(
    this as unknown as HTMLElement,
    () =>
      this.dispatchEvent(
        new CustomEvent(STAFF_EVENTS.VERTICAL_SPACE_CHANGE, {
          bubbles: true,
          composed: true,
        })
      )
  );
  // True once a slotchange (real or the deferred synthetic kick) has been
  // handled — guards against rendering the initial content twice.
  #initialSlotSyncDone = false;
  #slotChangeHandler = (event: Event) => {
    this.#initialSlotSyncDone = true;
    this.onHandleSlotChange(event);
  };

  protected effectiveTimeSig: [BeatsInMeasure, BeatTypeInMeasure];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.staffContainer = document.createElement('div');
    this.transcribeContainer = document.createElementNS(SVG_NS, 'svg');
    this.#standaloneConnectorsOverlay = document.createElementNS(SVG_NS, 'svg');

    this.#lastStaffWidth = 0;
    this.staffResizeObserver = new ResizeObserver((entries) => {
      this.#respaceIfWidthChanged(entries[0].contentRect.width);
    });

    this.effectiveTimeSig = this.convertTotimeInts(
      this.resolveInheritedValue(COMMON_ATTRIBUTES.TIME, '4/4')
    );
  }

  protected abstract onStaffResize(): void;

  // Called by an ancestor <music-composition> after a pass that can change
  // measure widths (showing/hiding a clef, key or time signature), so this
  // staff re-spaces before the ancestor draws connectors from its note
  // positions, rather than in the next ResizeObserver callback, after that
  // frame has already painted stale connectors. The observer then sees an
  // unchanged width and does nothing.
  respaceToCurrentWidth(): void {
    const style = getComputedStyle(this.staffContainer);
    this.#respaceIfWidthChanged(
      this.staffContainer.getBoundingClientRect().width -
        parseFloat(style.borderLeftWidth) -
        parseFloat(style.borderRightWidth) -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight)
    );
  }

  #respaceIfWidthChanged(width: number): void {
    if (width !== this.#lastStaffWidth) {
      this.#lastStaffWidth = width;
      this.onStaffResize();
    }
  }

  get group(): StaffGroupType | null {
    return parseStaffGroup(this.getAttribute('group'));
  }

  set group(value: StaffGroupType | null) {
    if (value === null) {
      this.removeAttribute('group');
    } else {
      this.setAttribute('group', value);
    }
  }

  get groupId(): string | null {
    return this.getAttribute('group-id');
  }

  set groupId(value: string | null) {
    if (value === null) {
      this.removeAttribute('group-id');
    } else {
      this.setAttribute('group-id', value);
    }
  }

  get label(): string | null {
    return this.getAttribute('label');
  }

  set label(value: string | null) {
    if (value === null) {
      this.removeAttribute('label');
    } else {
      this.setAttribute('label', value);
    }
  }

  protected dispatchGroupAttributeChange(): void {
    if (!this.isConnected) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent(STAFF_EVENTS.GROUP_ATTRIBUTE_CHANGE, {
        bubbles: true,
        composed: true,
      })
    );
  }

  protected dispatchLabelAttributeChange(): void {
    if (!this.isConnected) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent(STAFF_EVENTS.LABEL_ATTRIBUTE_CHANGE, {
        bubbles: true,
        composed: true,
      })
    );
  }

  protected resolveInheritedValue(
    attributeName: string,
    defaultValue: string
  ): string {
    return (
      this.getAttribute(attributeName) ??
      this.closest(MUSIC_MEASURE)?.getAttribute(attributeName) ??
      this.closest(MUSIC_COMPOSITION)?.getAttribute(attributeName) ??
      defaultValue
    );
  }

  protected convertTotimeInts(
    time: string
  ): [BeatsInMeasure, BeatTypeInMeasure] {
    const [beats, beatType] = time.split('/').map((n) => parseInt(n, 10));
    return [beats as BeatsInMeasure, beatType as BeatTypeInMeasure];
  }

  get time(): TimeSignature {
    return `${this.effectiveTimeSig[0]}/${this.effectiveTimeSig[1]}` as TimeSignature;
  }

  set time(value: TimeSignature) {
    this.setAttribute(COMMON_ATTRIBUTES.TIME, value);
  }

  protected render() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constructor attaches the shadow root
    this.shadowRoot!.innerHTML = `
      <style>
      :host {
          flex: var(--flex-staff-basis, 1 1 280px);
          min-width: var(--flex-staff-minw, 0);
          box-sizing: border-box;
          display: block;
        }

        .staff-wrapper {
          position: relative;
          min-height: ${STAFF_WRAPPER_MIN_HEIGHT}px;
          overflow: visible;
        }

        .staff-container {
          position: absolute;
          inset: 0;
          top: -1px;
          width: 100%;
          height: ${this.staffHeight}px;
          display: block;
          border-top: 1px solid currentColor;
          border-right: 1px solid currentColor;
          border-bottom: 1px solid currentColor;
          margin-top: ${STAFF_LINE_START}px;
          margin-bottom: ${STAFF_BOTTOM_MARGIN}px;
          pointer-events: none;
        }

        .staff-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 0.5px;
          background: currentColor;
        }

        ${this.additionalStyles}
      </style>
      <div class="staff-wrapper">
        <slot></slot>
      </div>
    `;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- shadowRoot was just written to above in this method
    const wrapper = this.shadowRoot!.querySelector(
      '.staff-wrapper'
    ) as HTMLDivElement | null;
    if (!wrapper) {
      return;
    }
    this.wrapperElement = wrapper;

    wrapper.appendChild(this.staffContainer);
    wrapper.appendChild(this.transcribeContainer);

    this.#standaloneConnectorsOverlay.setAttribute(
      'class',
      'standalone-connectors-overlay'
    );
    this.#standaloneConnectorsOverlay.setAttribute(
      'style',
      'position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; color: currentColor;'
    );
    wrapper.appendChild(this.#standaloneConnectorsOverlay);

    const slot = wrapper.querySelector('slot');
    if (slot && this.isConnected) {
      slot.addEventListener('slotchange', this.#slotChangeHandler);
      this.onConnectedCallback();
      // Deferred to a microtask so it runs after the synchronous module-load
      // stack unwinds — when a staff is built from parsed markup, its sibling
      // element modules (music-note, music-chord, …) finish registering in that
      // same synchronous pass, so an immediate dispatch would read not-yet-
      // upgraded children. The browser's own initial slotchange also fires
      // after imports settle; #initialSlotSyncDone keeps whichever loses the
      // race from re-rendering.
      queueMicrotask(() => {
        if (this.#initialSlotSyncDone || !this.isConnected) {
          return;
        }
        this.#initialSlotSyncDone = true;
        slot.dispatchEvent(new Event('slotchange'));
      });
    }
  }

  get staffHeight(): number {
    return (this.staffLineCount - 1) * STAFF_LINE_SPACING;
  }

  abstract get staffLineCount(): number;

  /** Override in subclasses to inject additional CSS into the shadow DOM style block. */
  protected get additionalStyles(): string {
    return '';
  }

  connectedCallback(): void {
    this.#buildStaffLines();
    this.#buildTranscribe();
    this.render();

    this.staffResizeObserver.observe(this.staffContainer);
  }

  #buildStaffLines(): void {
    this.staffContainer.classList.add('staff-container');

    let yOffset = STAFF_LINE_SPACING;
    Array.from({ length: this.staffLineCount - 1 }).forEach(() => {
      const line = document.createElement('div');
      line.classList.add('staff-line');
      line.style.top = `${yOffset}px`;
      this.staffContainer.appendChild(line);
      yOffset += STAFF_LINE_SPACING;
    });
  }

  // Transcribe sits on top of staff to be written on
  #buildTranscribe() {
    this.transcribeContainer.classList.add('transcribe-container');
    this.transcribeContainer.setAttribute(
      'style',
      'position: absolute; inset: 0; width: 100%; overflow: visible; pointer-events: none'
    );
  }

  protected abstract onConnectedCallback(): void;

  protected abstract onHandleSlotChange(event: Event): void;

  /**
   * Force-upgrade slotted `<music-*>` children (and any nested inside a
   * `<music-tuplet>`) before the staff reads their getters. When a staff is
   * built from parsed HTML markup its `connectedCallback` runs — and dispatches
   * the first `slotchange` — before its already-present children upgrade, so
   * without this their getters (`grace`, `note`, `duration`, …) are `undefined`.
   * `customElements.upgrade()` is synchronous and a no-op on an already-upgraded
   * or unregistered element.
   */
  protected upgradeAssignedElements(elements: Iterable<Element>): void {
    for (const element of elements) {
      if (!element.nodeName.startsWith('MUSIC-')) {
        continue;
      }
      customElements.upgrade(element);
      if (
        element.nodeName === MUSIC_TUPLET_NODE ||
        element.nodeName === MUSIC_ARPEGGIO_NODE ||
        element.nodeName === MUSIC_VOICE_NODE
      ) {
        this.upgradeAssignedElements(element.children);
      }
    }
  }

  // Content drawn past this staff's box reserves room under its own `source`
  // key; the largest reservation per side becomes the host's margin, so it
  // participates in page layout. Each source re-reports on every recompute.
  protected reserveVerticalSpace(source: string, space: VerticalBand): void {
    this.#verticalSpace.reserve(source, space);
  }

  /**
   * Room this staff's own content needs past its box — every reservation but
   * the row alignment below. Read by `<music-composition>` to line up the
   * same staff across every measure of a row.
   */
  get contentVerticalSpace(): VerticalBand {
    return this.#verticalSpace.reservedExcluding(ROW_ALIGNMENT_SOURCE);
  }

  /**
   * Sets the margin this staff takes so it lines up with its counterparts in
   * the other measures of its row. Returns whether the margin changed.
   */
  alignVerticalSpace(space: VerticalBand): boolean {
    return this.#verticalSpace.reserve(ROW_ALIGNMENT_SOURCE, space);
  }

  protected drawConnectorsWhenStandalone(): void {
    // A <music-measure> or <music-composition> ancestor owns connector
    // drawing once present — it can see this staff's siblings, which a lone
    // staff cannot, so a cross-staff pair (e.g. a slur from one hand of a
    // grand staff to the other) can only ever be paired at that level. That
    // ancestor also owns the room its connectors need.
    if (this.closest(MUSIC_COMPOSITION) || this.closest(MUSIC_MEASURE)) {
      this.#verticalSpace.release(STANDALONE_OVERLAY_SOURCE);
      return;
    }

    while (this.#standaloneConnectorsOverlay.firstChild) {
      this.#standaloneConnectorsOverlay.removeChild(
        this.#standaloneConnectorsOverlay.firstChild
      );
    }

    const root = this as unknown as ParentNode;
    const noteLikeElements = collectNoteLikeElements(root);
    const byVoice = partitionByVoice(noteLikeElements);
    const pairs = [
      ...[...byVoice.values()].flatMap((notes) => pairConnectors(notes)),
      ...collectArpeggioTiePairs(root),
      ...collectPhraseSlurPairs(root),
    ];
    if (pairs.length === 0) {
      this.#verticalSpace.release(STANDALONE_OVERLAY_SOURCE);
      return;
    }

    const rootRect = (this as unknown as HTMLElement).getBoundingClientRect();
    const svgs = buildConnectorSvgs(pairs, {
      rootRect,
      rowLeft: 0,
      rowRight: rootRect.width,
    });
    for (const svg of svgs) {
      this.#standaloneConnectorsOverlay.appendChild(svg);
    }
    this.#reserveStandaloneOverlaySpace();
  }

  // The overlay moves with this host, so growing the margin needs no redraw.
  #reserveStandaloneOverlaySpace(): void {
    const rect = (this as unknown as HTMLElement).getBoundingClientRect();
    const [overflow] = computeBandOverflow(
      [{ top: rect.top, bottom: rect.bottom }],
      measureVerticalExtents(
        this.#standaloneConnectorsOverlay,
        '.connector path'
      ),
      VERTICAL_OVERFLOW_CLEARANCE_PX
    );
    this.#verticalSpace.reserve(STANDALONE_OVERLAY_SOURCE, overflow);
  }

  disconnectedCallback(): void {
    this.staffResizeObserver.disconnect();

    const slot = this.shadowRoot?.querySelector('slot');
    if (slot) {
      slot.removeEventListener('slotchange', this.#slotChangeHandler);
    }

    this.onDisconnectedCallback();
  }

  protected abstract onDisconnectedCallback(): void;

  attributeChangedCallback(
    _name: string,
    oldValue: string | null,
    newValue: string | null
  ): void {
    if (oldValue !== newValue) {
      this.render();
    }
  }
}
