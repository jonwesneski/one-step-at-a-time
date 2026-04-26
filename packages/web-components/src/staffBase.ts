import { SVG_NS } from './utils';
import {
  STAFF_BOTTOM_MARGIN,
  STAFF_LINE_SPACING,
  STAFF_LINE_START,
  STAFF_TRANSCRIPTION_HEIGHT,
  STAFF_WRAPPER_MIN_HEIGHT,
} from './utils/notationDimensions';

// Use a runtime-safe fallback for environments without `HTMLElement` (SSR/Node).
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- prevents errrors if loaded in SSR
export const _MaybeHTMLElement: any =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- prevents errrors if loaded in SSR
  typeof globalThis !== 'undefined' && (globalThis as any).HTMLElement
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any -- prevents errrors if loaded in SSR
      (globalThis as any).HTMLElement
    : class {};

export abstract class StaffElementBase extends _MaybeHTMLElement {
  protected readonly staffContainer: HTMLDivElement;
  protected readonly staffResizeObserver: ResizeObserver;
  #lastStaffWidth: number;

  protected readonly transcribeContainer: SVGSVGElement;
  #slotChangeHandler = (event: Event) => this.onHandleSlotChange(event);

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.staffContainer = document.createElement('div');
    this.transcribeContainer = document.createElementNS(SVG_NS, 'svg');

    this.#lastStaffWidth = 0;
    this.staffResizeObserver = new ResizeObserver((entries) => {
      const newWidth = entries[0].contentRect.width;
      if (newWidth !== this.#lastStaffWidth) {
        this.#lastStaffWidth = newWidth;
        this.onStaffResize();
      }
    });
  }

  protected abstract onStaffResize(): void;

  protected render() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- contructor creates it
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
        }

        .staff-container {
          position: absolute;
          inset: 0;
          top: -1px;
          width: 100%;
          height: ${this.#staffHeight}px;
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

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- won't be null
    const wrapper = this.shadowRoot!.querySelector('.staff-wrapper');
    if (!wrapper) {
      return;
    }

    wrapper.appendChild(this.staffContainer);
    wrapper.appendChild(this.transcribeContainer);

    const slot = wrapper.querySelector('slot');
    if (slot && this.isConnected) {
      slot.addEventListener('slotchange', this.#slotChangeHandler);
      this.onConnectedCallback();
      slot.dispatchEvent(new Event('slotchange'));
    }
  }

  get #staffHeight() {
    return (this.staffLineCount - 1) * STAFF_LINE_SPACING;
  }

  protected abstract get staffLineCount(): number;

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
      `position: absolute; inset: 0; width: 100%; height: ${STAFF_TRANSCRIPTION_HEIGHT}px; pointer-events: none`
    );
  }

  protected abstract onConnectedCallback(): void;

  protected abstract onHandleSlotChange(event: Event): void;

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
