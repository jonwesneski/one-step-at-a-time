import {
  ChordElementType,
  NoteElementType,
  NoteOrChordElementType,
} from './types/elements';
import {
  BeatsInMeasure,
  BeatTypeInMeasure,
  DurationType,
  LetterNote,
  Mode,
} from './types/theory';
import {
  BeamCreator,
  createChordSvg,
  createFlatSvg,
  createNoteSvg2,
  createSharpSvg,
  createTimeSignatureSvg,
} from './utils';
import { durationToFactor, SVG_NS } from './utils/consts';

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
  #parentMode: Mode | null;
  #parentKeySig: LetterNote | null;
  #staffContainer: HTMLDivElement;
  #transcribeContainer: SVGSVGElement;
  #describeContainer: SVGGElement;
  #notesContainer: SVGSVGElement;
  #staffResizeObserver: ResizeObserver;
  #lastStaffWidth: number;
  private static staffHeight = 40;
  protected static lineStart = 28;
  protected static lineSpacing = StaffElementBase.staffHeight / 4;
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
      composition?.getAttribute('time') ??
      '4/4';
    this.#parentMode =
      measure?.getAttribute('mode') ??
      composition.getAttribute('mode') ??
      'major';
    this.#parentKeySig =
      measure?.getAttribute('keySig') ??
      composition?.getAttribute('keySig') ??
      'C';
    const timeTime = this.getAttribute('time');
    if (timeTime) {
      this.#timeInts = this.#convertTotimeInts(timeTime);
    }

    this.#lastStaffWidth = 0;
    this.#staffContainer = document.createElement('div');
    this.#transcribeContainer = document.createElementNS(SVG_NS, 'svg');
    this.#describeContainer = document.createElementNS(SVG_NS, 'g');
    this.#notesContainer = document.createElementNS(SVG_NS, 'svg');

    this.#staffResizeObserver = new ResizeObserver((entries) => {
      const newWidth = entries[0].contentRect.width;
      if (newWidth !== this.#lastStaffWidth) {
        this.#lastStaffWidth = newWidth;
        this.#reSpaceNotes();
      }
    });
  }

  static get observedAttributes(): string[] {
    return ['keySig', 'mode', 'time'];
  }

  get keySig(): LetterNote {
    return (this.getAttribute('keySig') as LetterNote) ?? this.#parentKeySig;
  }

  set keySig(value: string) {
    this.setAttribute('keySig', value);
  }

  get mode(): Mode {
    return this.getAttribute('mode') ?? this.#parentMode;
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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- gets added in render
    const wrapper = this.shadowRoot.querySelector('.staff-wrapper')!;
    wrapper.appendChild(this.#staffContainer);
    wrapper.appendChild(this.#transcribeContainer);

    // Also listen for `slotchange` events from the slot to detect when nodes
    // are assigned/removed from slots. This is the proper API for slotted
    // content changes.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- gets added in render
    const slot = this.shadowRoot.querySelector('slot')!;
    slot.addEventListener('slotchange', this.#handleSlotChange.bind(this));
  }

  disconnectedCallback(): void {
    try {
      this.#mutationObservers.forEach((m) => m.disconnect());
    } catch (e) {
      // ignore
    }

    this.#staffResizeObserver.disconnect();

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
    this.#buildStaffLines();
    this.#buildTranscribe(clefSvg);

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
          top: -1px;
          width: 100%;
          height: ${StaffElementBase.staffHeight}px;
          display: block;
          border-top: 1px solid currentColor;
          border-right: 1px solid currentColor;
          border-bottom: 1px solid currentColor;
          margin-top: ${StaffElementBase.lineStart}px;
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

  #buildStaffLines() {
    this.#staffContainer.classList.add('staff-container');

    let yOffset = StaffElementBase.lineSpacing;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- cant loop without variable
    for (const _ of StaffElementBase.linesY.slice(
      1,
      StaffElementBase.linesY.length - 1
    )) {
      const line = document.createElement('div');
      line.classList.add('staff-line');
      line.style.top = `${yOffset}px`;
      this.#staffContainer.appendChild(line);
      yOffset += StaffElementBase.lineSpacing;
    }
  }

  // Transcribe is: clef, key signature, time signature, and notes
  #buildTranscribe(clefSvgStr: string) {
    this.#transcribeContainer.classList.add('transcribe-container');
    this.#transcribeContainer.setAttribute(
      'style',
      'position: absolute; inset: 0; width: 100%; height: 100px; pointer-events: none'
    );

    this.#describeContainer.classList.add('describe-container');
    this.#describeContainer.innerHTML = clefSvgStr;
    this.#transcribeContainer.appendChild(this.#describeContainer);

    const xOffsetOfClef = 14;
    const xOffsetOfKeySignature = this.#appendKeySignatureSvg(
      this.#describeContainer,
      xOffsetOfClef
    );

    const timeSigOffset = this.#appendTimeSignatureSvgIfNecessary(
      this.#describeContainer,
      xOffsetOfKeySignature + 5
    );

    // Notes are added here at runtime
    this.#notesContainer.classList.add('notes-container');
    this.#notesContainer.style.overflow = 'initial';
    // Not sure why I have to do a negative offset here after this change: https://github.com/jonwesneski/music-notation/pull/11
    this.#notesContainer.style.transform = `translateX(${-(
      80 - timeSigOffset
    )}px)`;
    this.#transcribeContainer.appendChild(this.#notesContainer);
  }

  #appendKeySignatureSvg(svg: SVGElement, xOffset: number) {
    const yCoordinates = this.getKeyYCoordinates();
    const g = document.createElementNS(SVG_NS, 'svg');
    g.setAttribute('class', 'key-signature');
    g.setAttribute('x', xOffset.toString());
    g.setAttribute('y', '-15');
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

    let timeSigOffset = xOffset;
    if (firstMeasureOrNoCompositionTime || timeChangedInMeasure) {
      const timeSigSvg = createTimeSignatureSvg(
        ...((firstMeasureOrNoCompositionTime ?? timeChangedInMeasure) as [
          BeatsInMeasure,
          BeatTypeInMeasure
        ])
      );
      timeSigSvg.setAttribute('transform', `translate(${xOffset}, 30)`);
      parentSvg.appendChild(timeSigSvg);
      timeSigOffset += 14;
    }
    return timeSigOffset;
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
    this.#staffResizeObserver.observe(this.#staffContainer);

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
    const beamCreator = BeamCreator.ifNecessary(elements);
    const needsBeam = beamCreator !== null;
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types -- coming back as any
    let xOffsetOfNote: number = 0;
    const stemUp = this.#determineIsStemUp(elements);
    const { width: transcribeWidth } =
      this.#transcribeContainer.getBoundingClientRect();
    const { width: describeWidth } =
      this.#describeContainer.getBoundingClientRect();
    const remainingWidth = transcribeWidth - (describeWidth + 15);
    this.#notesContainer.setAttribute('width', `${remainingWidth}px`);

    for (let i = 0; i < elements.length; i++) {
      const duration = elements[i].duration;
      let noteSvg: SVGElement;
      let yOffset = NaN;
      if (elements[i].nodeName === 'MUSIC-NOTE') {
        const element = elements[i] as NoteElementType;
        const values = createNoteSvg2({
          duration,
          noFlags: needsBeam,
          stemUp,
          qualifiedElementName: 'svg',
          translate: {
            staffXCoordinate: xOffsetOfNote,
            staffYCoordinate: this.getYCoordinate(element.value),
          },
        });
        noteSvg = values[0];
        noteSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        noteSvg.setAttribute(
          'y',
          (10 + this.getYCoordinate(element.value) - values[1]).toString()
        );
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
          noFlags: needsBeam,
          stemUp,
          qualifiedElementName: 'g',
        });
        noteSvg = values[0];
        yOffset = values[1];
      }

      if (beamCreator) {
        if (i === 0) {
          beamCreator.updateBeamCoordinates({
            noteSvg,
            xOffsetOfNote,
            stemUp,
            yOffset,
            xAttribute: 'x1',
            yAttribute: 'y1',
          });
        } else if (i === elements.length - 1) {
          beamCreator.updateBeamCoordinates({
            noteSvg,
            xOffsetOfNote,
            stemUp,
            yOffset,
            xAttribute: 'x2',
            yAttribute: 'y2',
          });
        }
      }

      xOffsetOfNote = this.#spaceNote(noteSvg, xOffsetOfNote, remainingWidth);
      this.#notesContainer.appendChild(noteSvg);
    }

    if (beamCreator) {
      this.#notesContainer.appendChild(beamCreator.buildBeams());
    }
  }

  #spaceNotes(elements: SVGElement[]) {
    const beamCreator = BeamCreator.ifNecessary(elements);
    let xOffsetOfNote = 0;
    const { width: transcribeWidth } =
      this.#transcribeContainer.getBoundingClientRect();
    const { width: describeWidth } =
      this.#describeContainer.getBoundingClientRect();
    const width = transcribeWidth - (describeWidth + 15);

    const beams = [
      ...this.#notesContainer.querySelectorAll('.beam'),
    ] as SVGPolygonElement[];
    let beamIndex = beams.length > 0 ? 0 : null;
    for (let i = 0; i < elements.length; i++) {
      const stemUp = elements[i].dataset.stempUp === 'true';
      if (beamCreator) {
        if (i === 0) {
          beamCreator.updateBeamCoordinates({
            noteSvg: elements[i],
            xOffsetOfNote,
            stemUp,
            yOffset: NaN,
            xAttribute: 'x1',
            yAttribute: 'y1',
          });
        } else if (i === elements.length - 1) {
          beamCreator.updateBeamCoordinates({
            noteSvg: elements[i],
            xOffsetOfNote,
            stemUp,
            yOffset: NaN,
            xAttribute: 'x2',
            yAttribute: 'y2',
          });
          if (beamIndex !== null) {
            beamCreator.reSpaceBeam(beams[beamIndex++]);
          }
        }
      }
      xOffsetOfNote = this.#spaceNote(elements[i], xOffsetOfNote, width);
    }
  }

  #spaceNote(element: SVGElement, xOffsetOfNote: number, width: number) {
    element.setAttribute('x', xOffsetOfNote.toString());
    return (
      xOffsetOfNote +
      width * durationToFactor[element.dataset.duration as DurationType]
    );
  }

  #reSpaceNotes() {
    const notes = [
      ...(this.#notesContainer.querySelectorAll(
        ':scope > svg'
      ) as NodeListOf<Element>),
    ] as SVGElement[];
    this.#spaceNotes(notes);
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
