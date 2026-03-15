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
import { durationToFactor, factorToDuration, SVG_NS } from './utils/consts';

export abstract class StaffClassicalElementBase extends StaffElementBase {
  #mutationObservers: MutationObserver[];
  // todo: now that i have timeInts, do i need parentTime
  #timeInts: [BeatsInMeasure, BeatTypeInMeasure] | null = null;
  #parentTime: string;
  #parentMode: Mode | null;
  #parentKeySig: LetterNote | null;
  #describeContainer: SVGGElement;
  #notesContainer: SVGSVGElement;

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
      composition?.getAttribute('mode') ??
      'major';
    this.#parentKeySig =
      measure?.getAttribute('keySig') ??
      composition?.getAttribute('keySig') ??
      'C';
    const timeTime = this.getAttribute('time');
    if (timeTime) {
      this.#timeInts = this.#convertTotimeInts(timeTime);
    }

    this.#describeContainer = document.createElementNS(SVG_NS, 'g');
    this.#notesContainer = document.createElementNS(SVG_NS, 'svg');
  }

  #convertTotimeInts(time: string): [BeatsInMeasure, BeatTypeInMeasure] {
    const [beats, beatType] = time.split('/').map((n) => parseInt(n, 10));
    return [beats as BeatsInMeasure, beatType as BeatTypeInMeasure];
  }

  protected get staffLineCount(): number {
    return 5;
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

  get time(): string {
    return this.getAttribute('time') ?? this.#parentTime;
  }

  abstract get yCoordinates(): YCoordinates;

  abstract get octaves(): Octave[];

  public abstract getKeyYCoordinates(): {
    useSharps: boolean;
    coordinates: number[];
  };

  protected abstract get clefSvg(): string;

  protected onConnectedCallback() {
    this.#buildDescribe(this.clefSvg);
  }

  // Describe is: clef, key signature, time signature, and notes
  #buildDescribe(clefSvgStr: string) {
    this.#describeContainer.classList.add('describe-container');
    this.#describeContainer.innerHTML = clefSvgStr;
    this.transcribeContainer.appendChild(this.#describeContainer);

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
    this.transcribeContainer.appendChild(this.#notesContainer);
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
        ? this.#convertTotimeInts(this.time)
        : null;
    const timeChangeInMeasure =
      !firstMeasureOrNoCompositionTime && measure && this.#timeInts
        ? this.#timeInts
        : null;

    if (firstMeasureOrNoCompositionTime || timeChangeInMeasure) {
      const timeSigSvg = createTimeSignatureSvg(
        ...(firstMeasureOrNoCompositionTime ?? timeChangeInMeasure)!
      );
      timeSigSvg.setAttribute('transform', `translate(${xOffset}, 30)`);
      parentSvg.appendChild(timeSigSvg);
    }
  }

  protected override onDisconnectedCallback(): void {
    try {
      this.#mutationObservers.forEach((m) => m.disconnect());
    } catch (e) {
      // ignore
    }
  }

  protected onHandleSlotChange(event: Event) {
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
    // Clear any previously rendered notes. `slotchange` can fire multiple times
    // as a framework (e.g. React) adds children incrementally, so without this
    // each call would append on top of the last, leaving stale/duplicate SVGs.
    this.#notesContainer.innerHTML = '';

    const transcribeRect = this.transcribeContainer.getBoundingClientRect();
    const describeRect = this.#describeContainer.getBoundingClientRect();
    const transcribeWidth = transcribeRect.width;
    const notesX = Math.round(describeRect.right - transcribeRect.left);
    const remainingWidth = transcribeWidth - notesX;
    this.#notesContainer.setAttribute('x', `${notesX}`);
    this.#notesContainer.setAttribute('height', '100');

    this.#notesContainer.setAttribute('width', `${remainingWidth}`);
    // todo: make a height const if it doesn't already exist. Or maybe just grab
    // value from staffContainer
    this.#notesContainer.setAttribute('viewBox', `0 0 ${remainingWidth} 100`);

    const [beatsInMeasure, beatType] = this.#convertTotimeInts(this.time);
    // Measure duration as a fraction of a whole note (e.g. 4/4 = 1.0, 3/4 = 0.75, 6/8 = 0.75)
    const measureDuration = beatsInMeasure / beatType;

    const beamCreator = BeamCreator.ifNecessary(elements);
    const needsBeam = beamCreator !== null;
    const stemUp = this.#determineIsStemUp(elements);
    // Running beat position as a fraction of a whole note. Each note advances
    // this by its own duration factor, so each note's x is derived from its
    // absolute position in the measure rather than from the previous note.
    let beatOffset = 0;
    for (let i = 0; i < elements.length; i++) {
      const duration = elements[i].duration;
      if (
        beatOffset + durationToFactor[duration as DurationType] >
        measureDuration
      ) {
        console.error(
          `no more room for note(s); remaining duration is "${
            factorToDuration.get(measureDuration - beatOffset) ??
            measureDuration - beatOffset
          }", tried to add "${duration}"`
        );
        break;
      }

      const xOffsetOfNote = (beatOffset / measureDuration) * remainingWidth;
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

      this.#spaceNote(noteSvg, xOffsetOfNote);
      this.#notesContainer.appendChild(noteSvg);
      beatOffset += durationToFactor[duration as DurationType];
    }

    if (beamCreator) {
      this.#notesContainer.appendChild(beamCreator.buildBeams());
    }
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

  #spaceNotes(elements: SVGElement[]) {
    const transcribeRect = this.transcribeContainer.getBoundingClientRect();
    const describeRect = this.#describeContainer.getBoundingClientRect();
    const notesX = Math.round(describeRect.right - transcribeRect.left);
    const width = transcribeRect.width - notesX;
    this.#notesContainer.setAttribute('width', `${width}`);
    // todo: handle height instead of using literal
    this.#notesContainer.setAttribute('viewBox', `0 0 ${width} 100`);

    const [beatsInMeasure, beatType] = this.#convertTotimeInts(this.time);
    const measureDuration = beatsInMeasure / beatType;

    const beamCreator = BeamCreator.ifNecessary(elements);
    const beams = [
      ...this.#notesContainer.querySelectorAll('.beam-group'),
    ] as SVGGElement[];
    let beamIndex = beams.length > 0 ? 0 : null;
    let beatOffset = 0;
    for (let i = 0; i < elements.length; i++) {
      const duration = elements[i].dataset.duration as DurationType;
      const xOffset = (beatOffset / measureDuration) * width;
      //const beamCreator = BeamCreator.ifNecessary(elements);
      if (beamCreator) {
        if (i === 0) {
          beamCreator.updateBeamCoordinates(
            xOffset,
            parseFloat(elements[i].getAttribute('y') || '0'),
            'start'
          );
        } else if (i === elements.length - 1) {
          beamCreator.updateBeamCoordinates(
            xOffset,
            parseFloat(elements[i].getAttribute('y') || '0'),
            'end'
          );
          if (beamIndex !== null) {
            beamCreator.respaceBeam(beams[beamIndex++]);
          }
        }
      }
      this.#spaceNote(elements[i], xOffset);
      beatOffset += durationToFactor[duration];
    }
  }

  #spaceNote(element: SVGElement, xOffset: number) {
    element.setAttribute('x', xOffset.toString());
  }

  // Respace notes
  onStaffResize() {
    const notes = [
      ...(this.#notesContainer.querySelectorAll(
        ':scope > svg'
      ) as NodeListOf<Element>),
    ] as SVGElement[];
    this.#spaceNotes(notes);
  }
}
