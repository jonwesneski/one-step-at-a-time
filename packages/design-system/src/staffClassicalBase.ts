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
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- will not be null
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
    const describeEndX = Math.round(describeRect.right - transcribeRect.left);
    this.#notesContainer.setAttribute('x', `${describeEndX}`);
    this.#notesContainer.setAttribute('height', '100');

    const [beatsInMeasure, beatType] = this.#convertTotimeInts(this.time);
    // Measure duration as a fraction of a whole note (e.g. 4/4 = 1.0, 3/4 = 0.75, 6/8 = 0.75)
    const measureDuration = beatsInMeasure / beatType;

    const beamCreator = BeamCreator.ifNecessary(elements);
    const needsBeam = beamCreator !== null;
    const stemUp = this.#determineIsStemUp(elements);

    // Create all note SVGs (y-positioned, not yet x-positioned or appended)
    const noteSvgs: SVGElement[] = [];
    let beatOffset = 0;
    for (const element of elements) {
      const duration = element.duration;
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

      if (element.nodeName === 'MUSIC-NOTE') {
        const noteElement = element as NoteElementType;
        const [noteSvg, yOffset] = createNoteSvg({
          duration,
          noFlags: needsBeam,
          stemUp,
          qualifiedElementName: 'svg',
        });
        noteSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        noteSvg.setAttribute(
          'y',
          (10 + this.noteToYCoordinate(noteElement.value) - yOffset).toString()
        );

        noteSvgs.push(noteSvg);
      } else {
        const chordElement = element as ChordElementType;
        const staffYCoordinates = chordElement.notes.map((note) =>
          this.noteToYCoordinate(note.value)
        );
        const [chordSvg, yOffset] = createChordSvg({
          duration,
          staffYCoordinates,
          noFlags: needsBeam,
          stemUp,
          // todo: not using at the moment; check if i still need it
          qualifiedElementName: 'g',
        });
        chordSvg.setAttribute('overflow', 'visible');
        const topmostStaffY = stemUp
          ? Math.min(...staffYCoordinates)
          : Math.max(...staffYCoordinates);
        // Store beam y in dataset since createChordSvg already positions
        // each note inside the chord SVG relative to its own origin.
        // Setting y on the outer <svg> would double-offset the chord notes visually.
        chordSvg.dataset.beamY = (10 + topmostStaffY - yOffset).toString();

        noteSvgs.push(chordSvg);
      }

      beatOffset += durationToFactor[duration as DurationType];
    }

    // Build beam groups (coords are NaN until spaceNotes fills them in)
    const beamGroups = beamCreator ? [beamCreator.buildBeams()] : [];

    this.#spaceNotes(noteSvgs, beamGroups);

    for (const svg of noteSvgs) {
      this.#notesContainer.appendChild(svg);
    }
    for (const beamGroup of beamGroups) {
      this.#notesContainer.appendChild(beamGroup);
    }
  }

  #determineIsStemUp(elements: NoteOrChordElementType[]): boolean {
    // todo determine if all notes should be stemup or not before creating svgs
    // - middle and below of staff is up; otherwise down (but also need to factor in beamed notes and chords)
    console.log(elements, 'satisfy lint');
    return true;
    // for (const node of nodes) {
    //   const staffYCoordinate = this.noteToYCoordinate(
    //     node.getAttribute('value') || 'C'
    //   );
    // }
  }

  // Return the y-coordinate for a given note name (e.g., 'A', 'C2', 'Bb3')
  // Accidentals are ignored for vertical placement — C# and C natural occupy
  // the same staff line/space.
  public noteToYCoordinate(note: string): number {
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

  #spaceNotes(elements: SVGElement[], beamGroups: SVGGElement[]) {
    const transcribeRect = this.transcribeContainer.getBoundingClientRect();
    const describeRect = this.#describeContainer.getBoundingClientRect();
    const describeEndX = Math.round(describeRect.right - transcribeRect.left);
    const remainingWidth = transcribeRect.width - describeEndX;
    this.#notesContainer.setAttribute('width', `${remainingWidth}`);
    // todo: handle height instead of using literal
    this.#notesContainer.setAttribute('viewBox', `0 0 ${remainingWidth} 100`);

    const [beatsInMeasure, beatType] = this.#convertTotimeInts(this.time);
    const measureDuration = beatsInMeasure / beatType;

    const beamCreator =
      beamGroups.length > 0 ? BeamCreator.ifNecessary(elements) : null;
    let beamGroupIndex = 0;
    let beatOffset = 0;
    for (let i = 0; i < elements.length; i++) {
      const duration = elements[i].dataset.duration as DurationType;
      const xOffset = (beatOffset / measureDuration) * remainingWidth;

      if (beamCreator) {
        // Notes use the `y` attribute; chords store beam y in `dataset.beamY`
        // since their outer <svg> y stays at 0 (notes inside are self-positioned).
        const beamY = parseFloat(
          elements[i].dataset.beamY ?? elements[i].getAttribute('y') ?? '0'
        );
        if (i === 0) {
          beamCreator.updateBeamCoordinates(xOffset, beamY, 'start');
        } else if (i === elements.length - 1) {
          beamCreator.updateBeamCoordinates(xOffset, beamY, 'end');
          beamCreator.respaceBeam(beamGroups[beamGroupIndex++]);
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
    const beamGroups = [
      ...this.#notesContainer.querySelectorAll('.beam-group'),
    ] as SVGGElement[];
    this.#spaceNotes(notes, beamGroups);
  }
}
