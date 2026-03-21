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
  BeamsBuilder,
  createChordSvg,
  createFlatSvg,
  createNoteSvg,
  createSharpSvg,
  createTimeSignatureSvg,
  NOTE_Y_HEAD_OFFSET_STEM_DOWN,
  NOTE_Y_HEAD_OFFSET_STEM_UP,
} from './utils';
import {
  durationToFactor,
  durationToFlagCountMap,
  factorToDuration,
  SVG_NS,
} from './utils/consts';

export abstract class StaffClassicalElementBase extends StaffElementBase {
  #mutationObservers: MutationObserver[];
  // todo: now that i have timeInts, do i need parentTime
  #timeInts: [BeatsInMeasure, BeatTypeInMeasure] | null = null;
  #parentTime: string;
  #parentMode: Mode | null;
  #parentKeySig: LetterNote | null;
  #describeContainer: SVGGElement;
  #notesContainer: SVGSVGElement;
  #beamsBuilder: BeamsBuilder | null = null;

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

    this.#beamsBuilder = new BeamsBuilder(elements, [beatsInMeasure, beatType]);
    const stemDirections = this.#determineStemDirections(elements);

    // Pre-pass: set y for all beamed notes so BeamsBuilder can compute slant
    // before we create the note SVGs in the main loop.
    for (let i = 0; i < elements.length; i++) {
      if (!this.#beamsBuilder.isBeamed(i)) continue;
      const stemUp = stemDirections[i];
      const yHeadOffset = stemUp
        ? NOTE_Y_HEAD_OFFSET_STEM_UP
        : NOTE_Y_HEAD_OFFSET_STEM_DOWN;
      const element = elements[i];
      let preBeamY: number;
      if (element.nodeName === 'MUSIC-NOTE') {
        preBeamY =
          10 +
          this.noteToYCoordinate((element as NoteElementType).value) -
          yHeadOffset;
      } else {
        const chordElement = element as ChordElementType;
        const staffYCoordinates = chordElement.notes.map((note) =>
          this.noteToYCoordinate(note.value)
        );
        const extremalStaffY = stemUp
          ? Math.max(...staffYCoordinates)
          : Math.min(...staffYCoordinates);
        preBeamY = 10 + extremalStaffY - yHeadOffset;

        // For chords the beam must also clear every non-extremal notehead.
        // The clearance must cover ALL beam layers at this chord's position
        // (primary + secondary + any further layers), plus a comfortable visual
        // gap between the innermost beam's inner edge and the notehead top.
        //
        // Derivation (stem-up, per-beam layer × beamCount):
        //   notehead v-radius  : 3.2 px  (HEAD_WIDTH × 0.75 × NOTE_SCALE)
        //   total beam height  : beamCount × 8 + (beamCount-1) × 4  = 12·n − 4
        //   visual gap         : 8 px  (~one staff space, prevents anti-alias touch)
        //   ─────────────────────────────────────────────────────────────────────
        //   total              : 3.2 + 12·n − 4 + 8  =  7.2 + 12·n
        //
        // Examples:
        //   eighth (n=1): 19.2 px   sixteenth (n=2): 31.2 px
        //   32nd   (n=3): 43.2 px   64th      (n=4): 55.2 px
        // notehead_v_radius = HEAD_WIDTH(80) * 0.75 * NOTE_SCALE(32/600) ≈ 3.2 px
        const beamCount =
          durationToFlagCountMap.get(chordElement.duration as DurationType) ??
          1;
        const NOTEHEAD_BEAM_CLEAR = 7.2 + beamCount * 12;
        const nonExtStaffYs = staffYCoordinates.filter(
          (y) => y !== extremalStaffY
        );
        if (nonExtStaffYs.length > 0) {
          if (stemUp) {
            const topmostNonExt = Math.min(...nonExtStaffYs);
            this.#beamsBuilder.setMaxBeamOuterY(
              i,
              topmostNonExt - NOTEHEAD_BEAM_CLEAR
            );
          } else {
            const bottommostNonExt = Math.max(...nonExtStaffYs);
            this.#beamsBuilder.setMaxBeamOuterY(
              i,
              bottommostNonExt + NOTEHEAD_BEAM_CLEAR
            );
          }
        }
      }
      this.#beamsBuilder.setY(i, preBeamY, stemUp);
    }

    // Shift beam lines so no stem in any group is shorter than the minimum.
    this.#beamsBuilder.finalizeBeams();

    // Create all note SVGs (y-positioned, not yet x-positioned or appended)
    const noteSvgs: SVGElement[] = [];
    let beatOffset = 0;
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
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

      const stemUp = stemDirections[i];

      if (element.nodeName === 'MUSIC-NOTE') {
        const noteElement = element as NoteElementType;
        const [noteSvg, yOffset] = createNoteSvg({
          duration,
          noFlags: this.#beamsBuilder.isBeamed(i),
          stemUp,
          stemExtension: this.#beamsBuilder.calculateStemExtension(i),
          qualifiedElementName: 'svg',
        });
        noteSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        const noteY = 10 + this.noteToYCoordinate(noteElement.value) - yOffset;
        noteSvg.setAttribute('y', noteY.toString());

        noteSvgs.push(noteSvg);
      } else {
        const chordElement = element as ChordElementType;
        const staffYCoordinates = chordElement.notes.map((note) =>
          this.noteToYCoordinate(note.value)
        );
        const [chordSvg] = createChordSvg({
          duration,
          staffYCoordinates,
          noFlags: this.#beamsBuilder.isBeamed(i),
          stemUp,
          stemExtension: this.#beamsBuilder.calculateStemExtension(i),
          qualifiedElementName: 'g',
        });
        chordSvg.setAttribute('overflow', 'visible');

        noteSvgs.push(chordSvg);
      }

      beatOffset += durationToFactor[duration as DurationType];
    }

    // Build beam groups (x coords are NaN until spaceNotes fills them in)
    const beamGroups = this.#beamsBuilder.buildGroups();

    this.#spaceNotes(noteSvgs);

    for (const svg of noteSvgs) {
      this.#notesContainer.appendChild(svg);
    }
    for (const beamGroup of beamGroups) {
      this.#notesContainer.appendChild(beamGroup);
    }
  }

  // Rules (per standard music notation):
  //   - Notes below the middle staff line → stem up.
  //   - Notes on or above the middle staff line → stem down.
  //   - Beam groups: the note farthest from the middle line determines direction for the whole group.
  //   - Chords: the note farthest from the middle line determines direction.
  #determineStemDirections(elements: NoteOrChordElementType[]): boolean[] {
    const MIDDLE_STAFF_Y = 50;
    const stemDirections = new Array<boolean>(elements.length).fill(true);
    const processed = new Set<number>();

    const getStaffYs = (el: NoteOrChordElementType): number[] => {
      if (el.nodeName === 'MUSIC-NOTE') {
        return [this.noteToYCoordinate((el as NoteElementType).value)];
      }
      return (el as ChordElementType).notes.map((n) =>
        this.noteToYCoordinate(n.value)
      );
    };

    // Among the given Y values, find the one farthest from the middle line
    // and return the stem direction it implies.
    const stemUpForYs = (ys: number[]): boolean => {
      let maxDist = -1;
      let stemUp = true;
      for (const y of ys) {
        const dist = Math.abs(y - MIDDLE_STAFF_Y);
        if (dist > maxDist) {
          maxDist = dist;
          stemUp = y > MIDDLE_STAFF_Y; // below middle (larger Y) → stem up
        }
      }
      return stemUp;
    };

    for (let i = 0; i < elements.length; i++) {
      if (processed.has(i)) continue;
      const groupIndices = this.#beamsBuilder!.beamGroupIndicesFor(i);
      if (groupIndices) {
        // All notes in a beam group share one direction: use the extremal note across the group.
        const allYs = groupIndices.flatMap((idx) => getStaffYs(elements[idx]));
        const stemUp = stemUpForYs(allYs);
        for (const idx of groupIndices) {
          stemDirections[idx] = stemUp;
          processed.add(idx);
        }
      } else {
        stemDirections[i] = stemUpForYs(getStaffYs(elements[i]));
        processed.add(i);
      }
    }

    return stemDirections;
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

  #spaceNotes(elements: SVGElement[]) {
    const transcribeRect = this.transcribeContainer.getBoundingClientRect();
    const describeRect = this.#describeContainer.getBoundingClientRect();
    const describeEndX = Math.round(describeRect.right - transcribeRect.left);
    const remainingWidth = transcribeRect.width - describeEndX;
    this.#notesContainer.setAttribute('width', `${remainingWidth}`);
    // todo: handle height instead of using literal
    this.#notesContainer.setAttribute('viewBox', `0 0 ${remainingWidth} 100`);

    const [beatsInMeasure, beatType] = this.#convertTotimeInts(this.time);
    const measureDuration = beatsInMeasure / beatType;

    const minNoteWidth = 20; // px — minimum space per note to prevent notehead overlap
    const proportionalWidth = remainingWidth - elements.length * minNoteWidth;

    let beatOffset = 0;
    for (let i = 0; i < elements.length; i++) {
      const duration = elements[i].dataset.duration as DurationType;
      const xOffset =
        i * minNoteWidth + (beatOffset / measureDuration) * proportionalWidth;

      this.#beamsBuilder?.setX(i, xOffset);
      this.#spaceNote(elements[i], xOffset);
      beatOffset += durationToFactor[duration];
    }
    this.#beamsBuilder?.spaceAll();
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
