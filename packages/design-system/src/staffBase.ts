import { svgNS } from './consts';
import { DurationType } from './types';
import { createNoteSvgDom } from './utils';

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
    const beamCoordinates = this.#getBeamCoordinates(elements);
    const notesContainer = this.shadowRoot.querySelector('#notes-container');
    let xOffsetOfNote = 0;
    for (const element of elements) {
      const duration = (element.getAttribute('duration') ||
        'quarter') as DurationType;

      const staffYCoordinate = this.getYCoordinate(
        element.getAttribute('note') || 'A'
      );
      const noteSvg = createNoteSvgDom({
        duration,
        flagsIfNeeded: beamCoordinates === null,
        stemUp: true, // todo if above middle line of staff: stemdown (use staffYCoordinate to determine that)
      });

      //notesContainer.insertAdjacentHTML('beforeend', noteSvg.outerHTML);
      notesContainer.appendChild(noteSvg);
      const { width, height } = noteSvg.getBoundingClientRect();
      const halfOfHead = 4;
      // head bottom
      const answer1 = staffYCoordinate - height + halfOfHead;
      // head top
      const answer2 = staffYCoordinate + halfOfHead;
      noteSvg.setAttribute(
        'transform',
        `translate(${xOffsetOfNote}, ${answer1})`
      );
      notes.push(noteSvg.outerHTML);
      xOffsetOfNote += width;
    }
    notes.push();

    if (beamCoordinates) {
      const beamHtml = document.createElementNS(svgNS, 'line');
      beamHtml.setAttribute('x1', beamCoordinates.startX.toString());
      beamHtml.setAttribute('y1', beamCoordinates.startY.toString());
      beamHtml.setAttribute('x2', beamCoordinates.endX.toString());
      beamHtml.setAttribute('y2', beamCoordinates.endY.toString());
      beamHtml.setAttribute('stroke', 'currentColor');
      beamHtml.setAttribute('stroke-width', '6');
      notesContainer.insertAdjacentHTML('beforeend', beamHtml.outerHTML);
    }
    //notesContainer.insertAdjacentHTML('beforeend', notes.join('\n'));
  }

  #getBeamCoordinates(nodes: Element[]) {
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
      const lastIndex = consecutives.length - 1;
      return {
        startX: parseInt(nodes[consecutives[0]].getAttribute('x') || '0'),
        startY: parseInt(nodes[consecutives[0]].getAttribute('y') || '0'),
        endX: parseInt(nodes[consecutives[lastIndex]].getAttribute('x') || '0'),
        endY: parseInt(nodes[consecutives[lastIndex]].getAttribute('y') || '0'),
      };
    }
    return null;
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
            style="position: absolute; top: 0; left: 0; width: 100%"
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
          <div id="children-container" style="position: absolute; top: 0; left: 0; display: flex; width: 100%; height: 100%; pointer-events: none;">
            ${clefSvg}
            <svg id="notes-container" viewBox="0 0 200 100"></svg>
            <slot></slot>
          </div>
        </div>
      `;
  }
}
