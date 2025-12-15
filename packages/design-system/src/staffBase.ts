import { SVG_NS } from './consts';
import { BeatsInMeasure, BeatTypeInMeasure, DurationType } from './types';
import {
  createFlatSvg,
  createNoteSvg,
  createSharpSvg,
  createTimeSignatureSvg,
} from './utils';

// Use a runtime-safe fallback for environments without `HTMLElement` (SSR/Node).
const _MaybeHTMLElement: any =
  typeof globalThis !== 'undefined' && (globalThis as any).HTMLElement
    ? (globalThis as any).HTMLElement
    : class {};

export abstract class StaffElementBase extends _MaybeHTMLElement {
  #mutationObservers: MutationObserver[];
  #thisTimeInts: [BeatsInMeasure, BeatTypeInMeasure] | null = null;
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
      this.keySig = measure.getAttribute('keySig') ?? 'C';
    }

    const timeTime = this.getAttribute('time');
    if (timeTime) {
      this.#thisTimeInts = this.#convertTotimeInts(timeTime);
    }
  }

  static get observedAttributes(): string[] {
    return ['keySig', 'mode', 'time'];
  }

  get keySig(): string {
    return (
      this.getAttribute('keySig') ??
      this.closest('music-composition').getAttribute('keySig') ??
      'C'
    );
  }

  set keySig(value: string) {
    this.setAttribute('keySig', value);
  }

  get mode(): string {
    return this.getAttribute('mode') ?? 'major';
  }

  set mode(value: string) {
    this.setAttribute('mode', value);
  }

  get thisTime(): string | null {
    return this.getAttribute('time');
  }

  get time(): string {
    return (
      this.getAttribute('time') ??
      this.closest('music-measure').getAttribute('time') ??
      this.closest('music-composition').getAttribute('time') ??
      '4/4'
    );
  }

  #convertTotimeInts(time: string): [BeatsInMeasure, BeatTypeInMeasure] {
    const [beats, beatType] = time.split('/').map((n) => parseInt(n, 10));
    return [beats as BeatsInMeasure, beatType as BeatTypeInMeasure];
  }

  set time(value: string) {
    this.setAttribute('time', value);
  }

  // Return the y-coordinate for a given note name (e.g., 'A', 'E', 'C2')
  public abstract getYCoordinate(note: string): number;

  public abstract getKeyYCoordinates(): {
    useSharps: boolean;
    coordinates: number[];
  };

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
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'staff-container');
    svg.setAttribute(
      'style',
      'position: absolute; top: 0; left: 0; width: 100%'
    );
    svg.setAttribute('height', '100');
    svg.setAttribute('viewBox', '0 0 200 100');
    svg.setAttribute('preserveAspectRatio', 'none');

    // Left/Opening vertical line
    const leftLine = document.createElementNS(SVG_NS, 'line');
    leftLine.setAttribute('x1', '0');
    leftLine.setAttribute('y1', '0');
    leftLine.setAttribute('x2', '0');
    leftLine.setAttribute('y2', '100');
    leftLine.setAttribute('stroke', 'currentColor');
    leftLine.setAttribute('stroke-width', '1');
    svg.appendChild(leftLine);

    this.#appendStaffLines(svg);

    this.#appendDescribe(clefSvg, svg);

    // Notes are added here at runtime
    const gNotes = document.createElementNS(SVG_NS, 'g');
    gNotes.setAttribute('class', 'notes-container');
    svg.appendChild(gNotes);

    // Right/Closing vertical line
    const rightLine = document.createElementNS(SVG_NS, 'line');
    rightLine.setAttribute('x1', '200');
    rightLine.setAttribute('y1', '0');
    rightLine.setAttribute('x2', '200');
    rightLine.setAttribute('y2', '100');
    rightLine.setAttribute('stroke', 'currentColor');
    rightLine.setAttribute('stroke-width', '1');
    svg.appendChild(rightLine);

    return `
      <div style="position: relative; width: 33.333333%; min-width: 300px; height: 100px;">
        ${svg.outerHTML}
        <slot></slot>
      </div>
    `;
  }

  #appendStaffLines(svg: SVGElement) {
    const gLines = document.createElementNS(SVG_NS, 'g');
    gLines.setAttribute('class', 'staff-lines');
    for (const y of StaffElementBase.linesY) {
      const lineSvg = document.createElementNS(SVG_NS, 'line');
      lineSvg.setAttribute('x1', '0');
      lineSvg.setAttribute('y1', y.toString());
      lineSvg.setAttribute('x2', '200');
      lineSvg.setAttribute('y2', y.toString());
      lineSvg.setAttribute('stroke', 'currentColor');
      lineSvg.setAttribute('stroke-width', '2');
      gLines.appendChild(lineSvg);
    }
    svg.appendChild(gLines);
  }

  // Describe is: clef, key signature, time signature
  #appendDescribe(clefSvg: string, staff: SVGElement) {
    const gDescribe = document.createElementNS(SVG_NS, 'g');
    gDescribe.setAttribute('class', 'describe-container');
    gDescribe.innerHTML = clefSvg;
    staff.appendChild(gDescribe);

    this.#appendKeySignatureSvg(gDescribe);

    this.#appendTimeSignatureSvgIfNecessary(gDescribe);
  }

  #appendKeySignatureSvg(svg: SVGElement) {
    const yCoordinates = this.getKeyYCoordinates();
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'key-signature');
    const xOffset = 30; // todo hardcoding for now; x is width of clef svg is 30px
    g.setAttribute('transform', `translate(${xOffset}, 0)`);
    if (yCoordinates.coordinates.length) {
      const createSvgFunc = yCoordinates.useSharps
        ? createSharpSvg
        : createFlatSvg;
      const Width = yCoordinates.useSharps ? 10 : 8;
      let xOffset = 0;
      const yOffset = yCoordinates.useSharps ? 0 : -18;
      for (const y of yCoordinates.coordinates) {
        const svg = createSvgFunc();
        svg.setAttribute('transform', `translate(${xOffset}, ${y + yOffset})`);
        g.appendChild(svg);
        xOffset += Width;
      }
    }

    svg.appendChild(g);
  }

  #appendTimeSignatureSvgIfNecessary(parentSvg: SVGElement) {
    const measure = this.closest('music-measure');
    const measureNumberStr: string | null = measure?.getAttribute('number');
    const firstMeasureOrNoCompositionTime =
      measureNumberStr === '1' || !measure
        ? this.#convertTotimeInts(this.time)
        : null;
    const timeChangedInMeasure =
      !firstMeasureOrNoCompositionTime && measure && this.thisTime
        ? this.#thisTimeInts
        : null;
    if (firstMeasureOrNoCompositionTime || timeChangedInMeasure) {
      const timeSigSvg = createTimeSignatureSvg(
        ...((firstMeasureOrNoCompositionTime ?? timeChangedInMeasure) as [
          BeatsInMeasure,
          BeatTypeInMeasure
        ])
      );
      timeSigSvg.setAttribute('transform', 'translate(60, 30)');
      parentSvg.appendChild(timeSigSvg);
    }
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
    const describe = this.shadowRoot.querySelector('.describe-container');
    let xOffsetOfNote: number = describe.getBoundingClientRect().width;
    const stemUp = this.#determineIsStemUp(elements);

    for (let i = 0; i < elements.length; i++) {
      const duration = (elements[i].getAttribute('duration') ||
        'quarter') as DurationType;

      const staffYCoordinate = this.getYCoordinate(
        elements[i].getAttribute('value') || 'C'
      );
      const noteSvg = createNoteSvg({
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
      beamSvg = document.createElementNS(SVG_NS, 'line');
      beamSvg.setAttribute('stroke', 'currentColor');
      beamSvg.setAttribute('stroke-width', '6');
    }
    return beamSvg;
  }

  #determineIsStemUp(nodes: Element[]): boolean {
    // todo determine if all notes should be stemup or not before creating svgs
    // - middle and below of staff is up; otherwise down (but also need to factor in beamed notes and chords)
    return true;
    // for (const node of nodes) {
    //   const staffYCoordinate = this.getYCoordinate(
    //     node.getAttribute('value') || 'C'
    //   );
    // }
  }
}
