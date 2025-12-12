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

  protected static lineStart = 30;
  protected static lineSpacing = 10;
  protected static linesY: number[] = Array.from(
    { length: 5 },
    (_, i) => StaffElementBase.lineStart + i * StaffElementBase.lineSpacing
  );

  constructor() {
    super();
    this.#mutationObservers = [];

    this.attachShadow({ mode: 'open' });

    const measure = this.closest('music-measure');
    if (measure) {
      this.time = measure.getAttribute('time') ?? '4/4';
      this.mode = measure.getAttribute('mode') ?? 'major';
      this.key = measure.getAttribute('key') ?? 'C';
    }
  }

  static get observedAttributes(): string[] {
    return ['key', 'mode', 'time'];
  }

  get key(): string {
    return this.getAttribute('key') ?? 'C';
  }

  set key(value: string) {
    this.setAttribute('key', value);
  }

  get mode(): string {
    return this.getAttribute('mode') ?? 'major';
  }

  set mode(value: string) {
    this.setAttribute('mode', value);
  }

  get time(): string | null {
    return this.getAttribute('time');
  }

  set time(value: string) {
    this.setAttribute('time', value);
  }

  // Return the y-coordinate for a given note name (e.g., 'A', 'E', 'C2')
  public abstract getYCoordinate(note: string): number;

  public abstract getKeyYCoordinates(): number[];

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
    const staffLines = ['<g class="staff-lines">'];
    for (const y of StaffElementBase.linesY) {
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
            class="staff-container"
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
            <g class="describe-container">
              ${clefSvg}
            </g>
            <g class="notes-container">
            </g>
            <line
              x1="200"
              y1="0"
              x2="200"
              y2="100"
              stroke="currentColor"
              stroke-width="1"
            />
          </svg>
          <slot></slot>
        </div>
      `;
  }

  #handleSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    const assignedNodes = slot
      .assignedNodes({ flatten: true })
      .filter((n) => n.nodeName === 'MUSIC-NOTE');
    const assignedElements = slot
      .assignedElements({ flatten: true })
      .filter((e) => e.nodeName === 'MUSIC-NOTE');
    // TODO: Handle added/removed here; which is different than the mutation observer
    //  - maybe add random key generated in music-note class, update observers to me hash of key: observer)

    this.#renderNotes(assignedElements);

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
    const beamSvg = this.#buildBeamIfNecessary(elements);
    const needsBeam = beamSvg !== null;
    const notesContainer = this.shadowRoot
      .querySelector('.staff-container')
      .querySelector('.notes-container');
    const clef = this.shadowRoot.querySelector('.describe-container');
    let xOffsetOfNote: number = clef.getBoundingClientRect().width;

    // todo determine if all notes should be stemup or not before creating svgs
    // - middle and below of staff is up; otherwise down (but also need to factor in beamed notes and chords)
    let stemUp = true;
    for (let i = 0; i < elements.length; i++) {
      const duration = (elements[i].getAttribute('duration') ||
        'quarter') as DurationType;

      const staffYCoordinate = this.getYCoordinate(
        elements[i].getAttribute('value') || 'C'
      );
      const noteSvg = createNoteSvgDom({
        duration,
        flagsIfNeeded: !needsBeam,
        stemUp,
        qualifiedElementName: 'g',
      });
      // Need to append node before I can get width and height
      notesContainer.appendChild(noteSvg);

      const { width, height } = noteSvg.getBoundingClientRect();
      const halfOfHead = 4;
      const yHeadOffset = stemUp
        ? staffYCoordinate - height + halfOfHead
        : staffYCoordinate + halfOfHead;
      noteSvg.setAttribute(
        'transform',
        `translate(${xOffsetOfNote}, ${yHeadOffset})`
      );

      if (beamSvg) {
        const stemSvg = noteSvg.querySelector('.stem');
        const x = xOffsetOfNote + parseInt(stemSvg?.getAttribute('x1') || '0');
        const stemYAttribute = stemUp ? 'y1' : 'y2';
        const y = stemUp
          ? yHeadOffset
          : yHeadOffset +
            parseInt(stemSvg?.getAttribute(stemYAttribute) || '0');
        if (i === 0) {
          beamSvg.setAttribute('x1', x.toString());
          beamSvg.setAttribute('y1', y.toString());
        } else if (i === elements.length - 1) {
          beamSvg.setAttribute('x2', x.toString());
          beamSvg.setAttribute('y2', y.toString());
          notesContainer.appendChild(beamSvg);
        }
      }
      xOffsetOfNote += width;
    }
  }

  #buildBeamIfNecessary(nodes: Element[]) {
    const consecutives: number[] = [];
    let beamSvg: SVGLineElement | null = null;
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
      beamSvg = document.createElementNS(svgNS, 'line');
      beamSvg.setAttribute('stroke', 'currentColor');
      beamSvg.setAttribute('stroke-width', '6');
    }
    return beamSvg;
  }
}
