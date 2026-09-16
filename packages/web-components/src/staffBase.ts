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
  pairConnectors,
} from './utils/connectorsBuilder';
import {
  COMMON_ATTRIBUTES,
  MUSIC_ARPEGGIO_NODE,
  MUSIC_COMPOSITION,
  MUSIC_MEASURE,
  MUSIC_TUPLET_NODE,
  STAFF_EVENTS,
} from './utils/consts';
import {
  STAFF_BOTTOM_MARGIN,
  STAFF_LINE_SPACING,
  STAFF_LINE_START,
  STAFF_WRAPPER_MIN_HEIGHT,
} from './utils/notationDimensions';
import { parseStaffGroup } from './utils/parsers';

// Runtime-safe fallback for environments without `HTMLElement` (SSR/Node). Prevents errrors if loaded in SSR
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- globalThis.HTMLElement isn't typed as a class constructor
export const _MaybeHTMLElement: any =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- globalThis.HTMLElement isn't typed as a class constructor
  typeof globalThis !== 'undefined' && (globalThis as any).HTMLElement
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any -- globalThis.HTMLElement isn't typed as a class constructor
      (globalThis as any).HTMLElement
    : class {};

export abstract class StaffElementBase extends _MaybeHTMLElement {
  protected readonly staffContainer: HTMLDivElement;
  protected readonly staffResizeObserver: ResizeObserver;
  #lastStaffWidth: number;

  protected readonly transcribeContainer: SVGSVGElement;
  #standaloneConnectorsOverlay: SVGSVGElement;
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
      const newWidth = entries[0].contentRect.width;
      if (newWidth !== this.#lastStaffWidth) {
        this.#lastStaffWidth = newWidth;
        this.onStaffResize();
      }
    });

    this.effectiveTimeSig = this.convertTotimeInts(
      this.resolveInheritedValue(COMMON_ATTRIBUTES.TIME, '4/4')
    );
  }

  protected abstract onStaffResize(): void;

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
    const wrapper = this.shadowRoot!.querySelector('.staff-wrapper');
    if (!wrapper) {
      return;
    }

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
        element.nodeName === MUSIC_ARPEGGIO_NODE
      ) {
        this.upgradeAssignedElements(element.children);
      }
    }
  }

  protected drawConnectorsWhenStandalone(): void {
    if (this.closest(MUSIC_COMPOSITION)) {
      return;
    }

    while (this.#standaloneConnectorsOverlay.firstChild) {
      this.#standaloneConnectorsOverlay.removeChild(
        this.#standaloneConnectorsOverlay.firstChild
      );
    }

    const root = this as unknown as ParentNode;
    const pairs = [
      ...pairConnectors(collectNoteLikeElements(root)),
      ...collectArpeggioTiePairs(root),
    ];
    if (pairs.length === 0) {
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
