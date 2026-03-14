import { SVG_NS } from './utils';

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
  static #lineStart = 28;

  protected readonly transcribeContainer: SVGSVGElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.staffContainer = document.createElement('div');
    this.#lastStaffWidth = 0;
    this.staffResizeObserver = new ResizeObserver((entries) => {
      const newWidth = entries[0].contentRect.width;
      if (newWidth !== this.#lastStaffWidth) {
        this.#lastStaffWidth = newWidth;
        //this.#respaceNotes();
        this.onStaffResize();
      }
    });

    this.transcribeContainer = document.createElementNS(SVG_NS, 'svg');
  }

  protected abstract onStaffResize(): void;

  protected abstract onHandleSlotChange(event: Event): void;

  protected abstract onConnectedCallback(): void;

  protected render() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- contructor creates it
    this.shadowRoot!.innerHTML = `
      <style>
      :host {
          flex: var(--flex-staff-basis, 1 1 280px);
          min-width: var(--flex-staff-minw, 280px);
          box-sizing: border-box;
          display: block;
        }

        .staff-wrapper {
          position: relative;
          min-height: 100px;
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
          margin-top: ${StaffElementBase.#lineStart}px;
          margin-bottom: 30px;
        }

        .staff-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 0.5px;
          background: currentColor;
        }
      </style>
      <div class="staff-wrapper">
        <slot></slot>
      </div>
    `;
  }
  connectedCallback(): void {
    this.render();

    this.#buildStaffLines();
    this.#buildTranscribe();
    this.onConnectedCallback();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- gets added in render
    const wrapper = this.shadowRoot.querySelector('.staff-wrapper')!;
    wrapper.appendChild(this.staffContainer);
    wrapper.appendChild(this.transcribeContainer);

    // Also listen for `slotchange` events from the slot to detect when nodes
    // are assigned/removed from slots. This is the proper API for slotted
    // content changes.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- gets added in render
    const slot = this.shadowRoot.querySelector('slot')!;
    slot.addEventListener('slotchange', this.onHandleSlotChange.bind(this));

    this.staffResizeObserver.observe(this.staffContainer);
  }

  disconnectedCallback(): void {
    this.staffResizeObserver.disconnect();

    const slot = this.shadowRoot?.querySelector('slot');
    if (slot) {
      slot.removeEventListener(
        'slotchange',
        this.onHandleSlotChange.bind(this)
      );
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

  get #staffHeight() {
    return (this.staffLineCount - 1) * this.staffLineSpacing;
  }

  protected abstract get staffLineCount(): number;

  protected get staffLineStart(): number {
    return 10;
  }

  protected get staffLineSpacing(): number {
    return 10;
  }

  #buildStaffLines(): void {
    this.staffContainer.classList.add('staff-container');

    let yOffset = this.staffLineSpacing;
    Array.from({ length: this.staffLineCount - 1 }).forEach(() => {
      const line = document.createElement('div');
      line.classList.add('staff-line');
      line.style.top = `${yOffset}px`;
      this.staffContainer.appendChild(line);
      yOffset += this.staffLineSpacing;
    });
  }

  // Transcribe sits on top of staff to be written on
  #buildTranscribe() {
    this.transcribeContainer.classList.add('transcribe-container');
    this.transcribeContainer.setAttribute(
      'style',
      'position: absolute; inset: 0; width: 100%; height: 100px; pointer-events: none'
    );
  }
}
