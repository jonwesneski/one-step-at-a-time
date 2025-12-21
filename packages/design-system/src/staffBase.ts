import {
  ChordElementType,
  NoteElementType,
  NoteOrChordElementType,
} from './types/elements';
import { BeatsInMeasure, BeatTypeInMeasure } from './types/theory';
import {
  createChordSvg,
  createFlatSvg,
  createNoteSvg,
  createSharpSvg,
  createTimeSignatureSvg,
} from './utils';
import { SVG_NS } from './utils/consts';

// Use a runtime-safe fallback for environments without `HTMLElement` (SSR/Node).
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- prevents errrors if loaded in SSR
const _MaybeHTMLElement: any =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- prevents errrors if loaded in SSR
  typeof globalThis !== 'undefined' && (globalThis as any).HTMLElement
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any -- prevents errrors if loaded in SSR
      (globalThis as any).HTMLElement
    : class {};

export abstract class StaffElementBase extends _MaybeHTMLElement {
  #mutationObservers: MutationObserver[];
  #timeInts: [BeatsInMeasure, BeatTypeInMeasure] | null = null;
  #parentTime: string;
  #parentMode: string | null;
  #parentKeySig: string | null;
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
    const composition = this.closest('music-composition');
    this.#parentTime =
      measure?.getAttribute('time') ??
      composition.getAttribute('time') ??
      '4/4';
    this.#parentMode =
      measure?.getAttribute('mode') ?? composition.getAttribute('mode');
    this.#parentKeySig =
      measure?.getAttribute('keySig') ?? composition.getAttribute('keySig');
    console.log(
      this.#parentKeySig,
      this.#parentMode,
      'making tsc eslint happy'
    );
    const timeTime = this.getAttribute('time');
    if (timeTime) {
      this.#timeInts = this.#convertTotimeInts(timeTime);
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

  get time(): string | null {
    return this.getAttribute('time') ?? this.#parentTime;
  }

  #convertTotimeInts(time: string): [BeatsInMeasure, BeatTypeInMeasure] {
    const [beats, beatType] = time.split('/').map((n) => parseInt(n, 10));
    return [beats as BeatsInMeasure, beatType as BeatTypeInMeasure];
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

  protected build(clefSvg = ''): string {
    const staffLines = this.#buildStaffLines();
    const transribe = this.#buildTranscribe(clefSvg);

    return `
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
          width: 100%;
          height: 100%;
          display: block;
        }
      </style>
      <div class="staff-wrapper">
        ${staffLines.outerHTML}
        ${transribe.outerHTML}
        <slot></slot>
      </div>
    `;
  }

  #buildStaffLines() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'staff-container');
    svg.setAttribute(
      'style',
      'position: absolute; inset: 0; width: 100%; height: 100px; display: block;'
    );
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

    // Right/Closing vertical line
    const rightLine = document.createElementNS(SVG_NS, 'line');
    rightLine.setAttribute('x1', '200');
    rightLine.setAttribute('y1', '0');
    rightLine.setAttribute('x2', '200');
    rightLine.setAttribute('y2', '100');
    rightLine.setAttribute('stroke', 'currentColor');
    rightLine.setAttribute('stroke-width', '1');
    svg.appendChild(rightLine);
    return svg;
  }

  // Transcribe is: clef, key signature, time signature, and notes
  #buildTranscribe(clefSvgStr: string) {
    const transcribe = document.createElementNS(SVG_NS, 'svg');
    transcribe.setAttribute('class', 'transcribe-container');
    transcribe.setAttribute(
      'style',
      'position: absolute; inset: 0; width: 100%; height: 100px; pointer-events: none'
    );

    const gDescribe = document.createElementNS(SVG_NS, 'g');
    gDescribe.setAttribute('class', 'describe-container');
    gDescribe.innerHTML = clefSvgStr;
    transcribe.appendChild(gDescribe);

    const xOffsetOfClef = 13;
    const xOffsetOfKeySignature = this.#appendKeySignatureSvg(
      gDescribe,
      xOffsetOfClef
    );

    this.#appendTimeSignatureSvgIfNecessary(
      gDescribe,
      xOffsetOfKeySignature + 5
    );

    // Notes are added here at runtime
    const gNotes = document.createElementNS(SVG_NS, 'g');
    gNotes.setAttribute('class', 'notes-container');
    transcribe.appendChild(gNotes);

    return transcribe;
  }

  #appendKeySignatureSvg(svg: SVGElement, xOffset: number) {
    const yCoordinates = this.getKeyYCoordinates();
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'key-signature');
    g.setAttribute('transform', `translate(${xOffset}, -15)`);
    if (yCoordinates.coordinates.length) {
      const createSvgFunc = yCoordinates.useSharps
        ? createSharpSvg
        : createFlatSvg;
      const Width = yCoordinates.useSharps ? 10 : 8;
      const yOffset = yCoordinates.useSharps ? 0 : -18;
      for (const y of yCoordinates.coordinates) {
        const svg = createSvgFunc();
        svg.setAttribute('transform', `translate(${xOffset}, ${y + yOffset})`);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        g.appendChild(svg);
        xOffset += Width;
      }
    }

    svg.appendChild(g);

    return xOffset;
  }

  #appendTimeSignatureSvgIfNecessary(parentSvg: SVGElement, xOffset: number) {
    const measure = this.closest('music-measure');
    const measureNumberStr: string | null = measure?.getAttribute('number');
    const firstMeasureOrNoCompositionTime =
      measureNumberStr === '1' || !measure
        ? this.#convertTotimeInts(this.#parentTime)
        : null;
    const timeChangedInMeasure =
      !firstMeasureOrNoCompositionTime && measure && this.#timeInts
        ? this.#timeInts
        : null;
    if (firstMeasureOrNoCompositionTime || timeChangedInMeasure) {
      const timeSigSvg = createTimeSignatureSvg(
        ...((firstMeasureOrNoCompositionTime ?? timeChangedInMeasure) as [
          BeatsInMeasure,
          BeatTypeInMeasure
        ])
      );
      timeSigSvg.setAttribute('transform', `translate(${xOffset}, 30)`);
      parentSvg.appendChild(timeSigSvg);
    }
  }

  #handleSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    const assignedElements = slot
      .assignedElements({ flatten: true })
      .filter(
        (e) => e.nodeName === 'MUSIC-NOTE' || e.nodeName === 'MUSIC-CHORD'
      ) as NoteOrChordElementType[];
    // TODO: Handle added/removed here; which is different than the mutation observer
    //  - maybe add random key generated in music-note class, update observers to me hash of key: observer)

    this.#renderNotes(assignedElements);

    assignedElements.forEach((node) => {
      // Handle when each node has been mutated here
      // TODO: // only create the observer if it is new
      const observer = new MutationObserver((/*mutations*/) => {
        // for (const _mutation of mutations) {
        // }
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

  #renderNotes(elements: NoteOrChordElementType[]) {
    const beamSvg = this.#buildBeamIfNecessary(elements);
    const needsBeam = beamSvg !== null;
    const notesContainer = this.shadowRoot.querySelector('.notes-container');
    const describe = this.shadowRoot.querySelector('.describe-container');
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types -- coming back as any
    let xOffsetOfNote: number = describe.getBoundingClientRect().width;
    const stemUp = this.#determineIsStemUp(elements);

    for (let i = 0; i < elements.length; i++) {
      const duration = elements[i].duration;

      let noteSvg: SVGElement;
      let yOffset = NaN;
      if (elements[i].nodeName === 'MUSIC-NOTE') {
        const element = elements[i] as NoteElementType;
        const values = createNoteSvg({
          duration,
          flagsIfNeeded: !needsBeam,
          stemUp,
          qualifiedElementName: 'svg',
          translate: {
            staffXCoordinate: xOffsetOfNote,
            staffYCoordinate: this.getYCoordinate(element.value),
          },
        });
        noteSvg = values[0];
        noteSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        yOffset = values[1];
      } else {
        const element = elements[i] as ChordElementType;
        const staffYCoordinates: number[] = [];
        for (const note of element.notes) {
          staffYCoordinates.push(this.getYCoordinate(note.value));
        }

        const values = createChordSvg({
          duration,
          staffXCoordinate: xOffsetOfNote,
          staffYCoordinates,
          flagsIfNeeded: !needsBeam,
          stemUp,
          qualifiedElementName: 'g',
        });
        noteSvg = values[0];
        yOffset = values[1];
      }

      // Need to append node before I can get width and height (getBoundingClientRect)
      notesContainer.appendChild(noteSvg);
      // todo: get rid of this somehow, probably return
      // xoffset/width from createNote/ChordSvg()
      const { width } = noteSvg.getBoundingClientRect();

      if (beamSvg) {
        if (i === 0) {
          this.#updateBeam({
            beamSvg,
            noteSvg,
            xOffsetOfNote,
            stemUp,
            yOffset,
            xAttribute: 'x1',
            yAttribute: 'y1',
          });
        } else if (i === elements.length - 1) {
          this.#updateBeam({
            beamSvg,
            noteSvg,
            xOffsetOfNote,
            stemUp,
            yOffset,
            xAttribute: 'x2',
            yAttribute: 'y2',
          });
        }
      }
      xOffsetOfNote += width;
    }
    if (beamSvg) {
      notesContainer.appendChild(beamSvg);
    }
  }

  #buildBeamIfNecessary(elements: NoteOrChordElementType[]) {
    const consecutives: number[] = [];
    let beamSvg: SVGLineElement | null = null;
    for (let i = 0; i < elements.length; i++) {
      if (
        elements[i].duration === 'eighth' ||
        elements[i].duration === 'sixteenth' ||
        elements[i].duration === 'thirtysecond'
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

  #updateBeam(props: {
    beamSvg: SVGLineElement;
    noteSvg: SVGElement;
    xOffsetOfNote: number;
    stemUp: boolean;
    yOffset: number;
    xAttribute: string;
    yAttribute: string;
  }) {
    const stemSvg = props.noteSvg.querySelector('.stem');
    const x =
      props.xOffsetOfNote + parseInt(stemSvg?.getAttribute('x1') || '0');
    const stemYAttribute = props.stemUp ? 'y1' : 'y2';
    const y = props.stemUp
      ? props.yOffset - 1
      : props.yOffset + parseInt(stemSvg?.getAttribute(stemYAttribute) || '0');

    props.beamSvg.setAttribute(props.xAttribute, x.toString());
    props.beamSvg.setAttribute(props.yAttribute, y.toString());
  }

  #determineIsStemUp(elements: NoteOrChordElementType[]): boolean {
    // todo determine if all notes should be stemup or not before creating svgs
    // - middle and below of staff is up; otherwise down (but also need to factor in beamed notes and chords)
    console.log(elements, 'satisfy lint');
    return true;
    // for (const node of nodes) {
    //   const staffYCoordinate = this.getYCoordinate(
    //     node.getAttribute('value') || 'C'
    //   );
    // }
  }
}
