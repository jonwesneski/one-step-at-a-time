import { StaffElementBase } from './staffBase';
import {
  ChordElementType,
  NoteElementType,
  NoteOrChordElementType,
  YCoordinates,
} from './types/elements';
import {
  BeatsInMeasure,
  BeatTypeInMeasure,
  DurationType,
  LetterNote,
  LetterOctave,
  Mode,
  Octave,
} from './types/theory';
import {
  BeamCreator,
  createChordSvg,
  createFlatSvg,
  createNoteSvg,
  createSharpSvg,
  createTimeSignatureSvg,
} from './utils';
import { durationToFactor, SVG_NS } from './utils/consts';

export abstract class StaffClassicalElementBase extends StaffElementBase {
  #mutationObservers: MutationObserver[];
  // todo: now that i have timeInts, do i need parentTime
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
  protected static lineSpacing = StaffClassicalElementBase.staffHeight / 4;
  protected static linesY: number[] = Array.from(
    { length: 5 },
    (_, i) =>
      StaffClassicalElementBase.lineStart +
      i * StaffClassicalElementBase.lineSpacing
  );

  constructor() {
    super();
    this.#mutationObservers = [];

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
        this.#respaceNotes();
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

  abstract get yCoordinates(): YCoordinates;
  abstract get octaves(): Octave[];

  // Return the y-coordinate for a given note name (e.g., 'A', 'C2', 'Bb3')
  // Accidentals are ignored for vertical placement — C# and C natural occupy
  // the same staff line/space.
  public getYCoordinate(note: string): number {
    //todo: rename function to getNoteYCoordinate
    // todo: re-work this since the logic is mostly the same between treble and bass
    if (!note) return 0;

    // Extract letter (A-G) and optional octave digit, discarding accidentals.
    const match = note.trim().match(/^([A-Ga-g])[#bx]*(\d?)$/);
    if (!match) return 0;

    const letter = match[1].toUpperCase();
    const octave = match[2];

    if (octave) {
      const yCoordinate =
        this.yCoordinates[`${letter}${octave}` as LetterOctave];
      if (yCoordinate !== undefined) {
        return yCoordinate;
      }
    } else {
      for (const n of this.octaves) {
        const yCoordinate = this.yCoordinates[`${letter}${n}` as LetterOctave];
        if (yCoordinate !== undefined) {
          return yCoordinate;
        }
      }
    }

    return 0;
  }

  // public abstract getNoteYCoordinates(): [YCoordinates, number[]];

  public abstract getKeyYCoordinates(): {
    useSharps: boolean;
    coordinates: number[];
  };

  override connectedCallback(): void {
    // todo: derived class is meant to implement render
    // and it calls build, but probably shouldn't. Fix in the future
    // As I am scrolling through the code top to bottom,
    // it would be nice to see the html string before i see this connectedCallback()
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

  protected abstract override render(): void;

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
          height: ${StaffClassicalElementBase.staffHeight}px;
          display: block;
          border-top: 1px solid currentColor;
          border-right: 1px solid currentColor;
          border-bottom: 1px solid currentColor;
          margin-top: ${StaffClassicalElementBase.lineStart}px;
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

    let yOffset = StaffClassicalElementBase.lineSpacing;
    StaffClassicalElementBase.linesY
      .slice(1, StaffClassicalElementBase.linesY.length - 1)
      .forEach(() => {
        const line = document.createElement('div');
        line.classList.add('staff-line');
        line.style.top = `${yOffset}px`;
        this.#staffContainer.appendChild(line);
        yOffset += StaffClassicalElementBase.lineSpacing;
      });
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

    this.#appendTimeSignatureSvgIfNecessary(
      this.#describeContainer,
      xOffsetOfKeySignature + 5
    );

    // Notes are added here at runtime
    this.#notesContainer.classList.add('notes-container');
    this.#notesContainer.style.overflow = 'hidden';
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
    // Clear any previously rendered notes. `slotchange` can fire multiple times
    // as a framework (e.g. React) adds children incrementally, so without this
    // each call would append on top of the last, leaving stale/duplicate SVGs.
    this.#notesContainer.innerHTML = '';

    const transcribeRect = this.#transcribeContainer.getBoundingClientRect();
    const describeRect = this.#describeContainer.getBoundingClientRect();
    const transcribeWidth = transcribeRect.width;
    const notesX = Math.round(describeRect.right - transcribeRect.left);
    const remainingWidth = transcribeWidth - notesX;
    this.#notesContainer.setAttribute('x', `${notesX}`);
    this.#notesContainer.setAttribute('width', `${remainingWidth}`);
    // todo: make a height const if it doesn't already exist. Or maybe just grab
    // value from staffContainer
    this.#notesContainer.setAttribute('height', '100');
    this.#notesContainer.setAttribute('viewBox', `0 0 ${remainingWidth} 100`);

    const beamCreator = BeamCreator.ifNecessary(elements);
    const needsBeam = beamCreator !== null;
    const stemUp = this.#determineIsStemUp(elements);
    let xOffsetOfNote = 0;
    for (let i = 0; i < elements.length; i++) {
      const duration = elements[i].duration;
      let noteSvg: SVGElement;
      let beamY: number;
      if (elements[i].nodeName === 'MUSIC-NOTE') {
        const element = elements[i] as NoteElementType;
        let yOffset = NaN;
        [noteSvg, yOffset] = createNoteSvg({
          duration,
          noFlags: needsBeam,
          stemUp,
          qualifiedElementName: 'svg',
          translate: {
            staffXCoordinate: xOffsetOfNote,
            staffYCoordinate: this.getYCoordinate(element.value),
          },
        });

        noteSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        const noteY = 10 + this.getYCoordinate(element.value) - yOffset;
        noteSvg.setAttribute('y', noteY.toString());
        beamY = noteY;
      } else {
        const element = elements[i] as ChordElementType;
        const staffYCoordinates: number[] = [];
        for (const note of element.notes) {
          staffYCoordinates.push(this.getYCoordinate(note.value));
        }
        let yOffset = NaN;
        [noteSvg, yOffset] = createChordSvg({
          duration,
          staffXCoordinate: xOffsetOfNote,
          staffYCoordinates,
          noFlags: needsBeam,
          stemUp,
          qualifiedElementName: 'g',
        });
        noteSvg.setAttribute('overflow', 'visible');
        // Beam y: use the topmost note's y position within the chord
        const topmostStaffY = stemUp
          ? Math.min(...staffYCoordinates)
          : Math.max(...staffYCoordinates);
        beamY = 10 + topmostStaffY - yOffset;
      }

      const isBeamStart = i === 0;
      if (beamCreator && (isBeamStart || i === elements.length - 1)) {
        beamCreator.updateBeamCoordinates(
          xOffsetOfNote,
          beamY,
          isBeamStart ? 'start' : 'end'
        );
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
    const transcribeRect = this.#transcribeContainer.getBoundingClientRect();
    const describeRect = this.#describeContainer.getBoundingClientRect();
    const notesX = Math.round(describeRect.right - transcribeRect.left);
    const width = transcribeRect.width - notesX;
    this.#notesContainer.setAttribute('x', `${notesX}`);
    this.#notesContainer.setAttribute('width', `${width}`);
    // todo: handle height instead of using literal
    this.#notesContainer.setAttribute('viewBox', `0 0 ${width} 100`);

    const beams = [
      ...this.#notesContainer.querySelectorAll('.beam-group'),
    ] as SVGGElement[];
    let beamIndex = beams.length > 0 ? 0 : null;
    for (let i = 0; i < elements.length; i++) {
      if (beamCreator) {
        if (i === 0) {
          beamCreator.updateBeamCoordinates(
            xOffsetOfNote,
            parseFloat(elements[i].getAttribute('y') || '0'),
            'start'
          );
        } else if (i === elements.length - 1) {
          beamCreator.updateBeamCoordinates(
            xOffsetOfNote,
            parseFloat(elements[i].getAttribute('y') || '0'),
            'end'
          );
          if (beamIndex !== null) {
            beamCreator.respaceBeam(beams[beamIndex++]);
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

  #respaceNotes() {
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
