import { DurationType } from './types';
import { createNoteSvgDom } from './utls';

// Use a runtime-safe fallback for environments without `HTMLElement` (SSR/Node).
const _MaybeHTMLElement: any =
  typeof globalThis !== 'undefined' && (globalThis as any).HTMLElement
    ? (globalThis as any).HTMLElement
    : class {};

export abstract class StaffElementBase extends _MaybeHTMLElement {
  #mutationObservers: MutationObserver[];
  protected linesY: number[] = [10, 20, 30, 40, 50];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.#mutationObservers = [];
  }

  static get observedAttributes(): string[] {
    return [];
  }

  #handleSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    const assignedNodes = slot
      .assignedNodes({ flatten: true })
      .filter((n) => n.nodeName === 'MUSIC-NOTE');
    const assignedElements = slot
      .assignedElements({ flatten: true })
      .filter((e) => e.nodeName === 'MUSIC-NOTE');
    // Handle added/removed here

    this.#renderNotes(assignedElements);

    // TODO: add handler. And remove observer when removed(add random key generated in music-note class, update observers to me hash of key: observer)

    assignedNodes.forEach((node) => {
      // Handle when each node has been mutated here
      // TODO: // only create the observer if it is new
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
        }
      });
      observer.observe(node, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
      this.#mutationObservers.push(observer);
    });
  }

  #renderNotes(elements: Element[]) {
    const notes = [];
    for (const element of elements) {
      const duration = (element.getAttribute('duration') ||
        'quarter') as DurationType;
      notes.push(createNoteSvgDom({ duration }).outerHTML);
    }
    notes.push();
    this.#drawBeamIfNecessary(elements);
    const svgsString = notes.join('\n');
    this.shadowRoot
      .querySelector('#children-container')
      .insertAdjacentHTML('beforeend', svgsString);
  }

  #drawBeamIfNecessary(nodes: Element[]) {
    const consecutives: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
      if (
        nodes[i].getAttribute('duration') === 'eighth' ||
        nodes[i].getAttribute('duration') === 'sixteenth'
      ) {
        if (consecutives.length === 0) {
          consecutives.push(i);
        } else if (consecutives[i - 1] !== undefined) {
          consecutives.push(i);
        }
      }
    }

    if (consecutives.length && consecutives.length % 2 === 0) {
      console.log('addbeam');
      console.log(
        nodes.slice(consecutives[0], consecutives[consecutives.length - 1])
      );
    }
  }

  // Return the y-coordinate for a given note name (e.g., 'A', 'E', 'C2')
  public abstract getYCoordinate(note: string): number;

  connectedCallback(): void {
    this.render();

    // Also listen for `slotchange` events from the slot to detect when nodes
    // are assigned/removed from slots. This is the proper API for slotted
    // content changes.
    const slot = this.shadowRoot?.querySelector('slot');
    if (slot) {
      slot.addEventListener('slotchange', this.#handleSlotChange.bind(this));
    }
  }

  disconnectedCallback(): void {
    // Clean up observer and slot listener
    try {
      this.#mutationObservers.forEach((m) => m.disconnect());
    } catch (e) {
      // ignore
    }

    const slot = this.shadowRoot?.querySelector('slot');
    if (slot) {
      slot.removeEventListener('slotchange', this.#handleSlotChange.bind(this));
    }
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ): void {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  protected abstract render(): void;

  protected build(clefSvg: string = ''): string {
    // Build horizontal staff lines
    // from top to bottom
    const staffLines = ['<g>'];
    for (const y of this.linesY) {
      staffLines.push(`
          <line
          x1="0"
          y1="${y}"
          x2="200"
          y2="${y}"
          stroke="currentColor"
          stroke-width="2"
          />
      `);
    }
    staffLines.push('</g>');

    return `
        <div style="position: relative; width: 33.333333%; min-width: 300px; height: 100px;">
          <svg
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
            height="100"
            viewBox="0 0 200 100"
            preserveAspectRatio="none"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="100"
              stroke="currentColor"
              stroke-width="1"
            />
            ${staffLines.join('')}
            <line
              x1="200"
              y1="0"
              x2="200"
              y2="100"
              stroke="currentColor"
              stroke-width="1"
            />
          </svg>
          <div id="children-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
            ${clefSvg}
            <slot></slot>
          </div>
        </div>
      `;
  }
}
