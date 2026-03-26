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
  computeYHeadOffset,
  createFlatSvg,
  createSharpSvg,
  createTimeSignatureSvg,
  NOTE_Y_HEAD_OFFSET_STEM_DOWN,
  NOTE_Y_HEAD_OFFSET_STEM_UP,
  STAFF_Y_PADDING,
  type NoteYPosition,
} from './utils';
import {
  durationToFactor,
  durationToFlagCountMap,
  factorToDuration,
  SVG_NS,
} from './utils/consts';
import { NoteTimingDragHandler } from './utils/noteTimingDragHandler';
import { PitchDragHandler } from './utils/pitchDragHandler';

export abstract class StaffClassicalElementBase extends StaffElementBase {
  #mutationObservers: MutationObserver[];
  // todo: now that i have timeInts, do i need parentTime
  #timeInts: [BeatsInMeasure, BeatTypeInMeasure] | null = null;
  #parentTime: string;
  #parentMode: Mode | null;
  #parentKeySig: LetterNote | null;
  #describeContainer: SVGGElement;
  #beamsContainer: SVGSVGElement;
  #beamRenderer: ReturnType<BeamsBuilder['buildRenderer']> | null = null;
  #currentElements: NoteOrChordElementType[] = [];
  #noteTimingDragHandler: NoteTimingDragHandler | null = null;
  #notePitchDragHandler: PitchDragHandler | null = null;
  #boundPointerDown: ((e: PointerEvent) => void) | null = null;

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
    // todo: remove if-condition; that way I just call once
    if (timeTime) {
      this.#timeInts = this.#convertTotimeInts(timeTime);
    }

    this.#describeContainer = document.createElementNS(SVG_NS, 'g');
    this.#beamsContainer = document.createElementNS(SVG_NS, 'svg');
  }

  #convertTotimeInts(time: string): [BeatsInMeasure, BeatTypeInMeasure] {
    const [beats, beatType] = time.split('/').map((n) => parseInt(n, 10));
    return [beats as BeatsInMeasure, beatType as BeatTypeInMeasure];
  }

  protected get staffLineCount(): number {
    return 5;
  }

  protected override get additionalStyles(): string {
    return `
      ::slotted(music-note),
      ::slotted(music-chord) {
        position: absolute;
      }

      :host([editable]) ::slotted(music-note),
      :host([editable]) ::slotted(music-chord) {
        cursor: grab;
      }
    `;
  }

  static get observedAttributes(): string[] {
    return ['keySig', 'mode', 'time', 'editable', 'managed'];
  }

  get editable(): boolean {
    return this.hasAttribute('editable');
  }

  set editable(v: boolean) {
    if (v) this.setAttribute('editable', '');
    else this.removeAttribute('editable');
  }

  // This piece of state is to help prevent double renders in UI Frameworks
  // such as React. after 'certain' state changes, we then check this
  // to see if we should render here or let the UI Framework do it.
  // The only certain state change(s) this is for currently is:
  // - When the timing changes on a note/chord
  get managed(): boolean {
    return this.hasAttribute('managed');
  }

  set managed(v: boolean) {
    if (v) this.setAttribute('managed', '');
    else this.removeAttribute('managed');
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
    if (this.editable) {
      this.#enableDrag();
    }
  }

  #enableDrag() {
    if (this.#boundPointerDown) {
      return;
    }

    const wrapper = this.shadowRoot?.querySelector(
      '.staff-wrapper'
    ) as HTMLElement | null;
    if (!wrapper) {
      return;
    }

    const host = this as unknown as HTMLElement;
    const getElements = () => this.#currentElements as unknown as HTMLElement[];

    this.#noteTimingDragHandler = new NoteTimingDragHandler(
      host,
      wrapper,
      getElements,
      this.managed
    );

    this.#notePitchDragHandler = new PitchDragHandler(
      host,
      this.yCoordinates,
      (elementIndex, newNote, chordNoteIndex) => {
        this.#onPitchLivePreview(elementIndex, newNote, chordNoteIndex);
      }
    );

    // Coordinated pointerdown: hit-test notehead → pitch drag, else → timing drag
    this.#boundPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) {
        return;
      }

      const elements = getElements();
      if (elements.length === 0) {
        return;
      }

      // Walk up from the composed event target to find which element was hit
      const composedTarget = e.composedPath()[0] as Element;

      if (PitchDragHandler.isNoteheadTarget(composedTarget)) {
        // Notehead hit — start pitch drag
        const { element, elementIndex, chordNoteIndex } =
          this.#findPitchDragTarget(composedTarget, elements);
        if (element) {
          this.#notePitchDragHandler?.tryStart(
            e,
            element,
            elementIndex,
            chordNoteIndex
          );
          return;
        }
      }
    };

    host.addEventListener('pointerdown', this.#boundPointerDown);

    // Attach timing drag handler (it registers its own pointerdown too,
    // but the pitch handler's early return prevents conflicts)
    this.#noteTimingDragHandler.attach();
  }

  #disableDrag() {
    const host = this as unknown as HTMLElement;

    if (this.#boundPointerDown) {
      host.removeEventListener('pointerdown', this.#boundPointerDown);
      this.#boundPointerDown = null;
    }

    if (this.#notePitchDragHandler) {
      this.#notePitchDragHandler.detach();
      this.#notePitchDragHandler = null;
    }

    if (this.#noteTimingDragHandler) {
      this.#noteTimingDragHandler.detach();
      this.#noteTimingDragHandler = null;
    }
  }

  /**
   * Identify which slotted element and (for chords) which notehead index
   * corresponds to a clicked SVG target.
   */
  #findPitchDragTarget(
    svgTarget: Element,
    elements: HTMLElement[]
  ): {
    element: HTMLElement | null;
    elementIndex: number;
    chordNoteIndex: number | null;
  } {
    // Walk up from the SVG target through shadow DOM boundaries to find the host element
    let current: Element | null = svgTarget;
    while (current) {
      const rootNode: Node = current.getRootNode();
      if (rootNode instanceof ShadowRoot) {
        const host: Element = rootNode.host;
        const idx = elements.indexOf(host as HTMLElement);
        if (idx !== -1) {
          if (host.nodeName === 'MUSIC-CHORD') {
            const chordNoteIndex = this.#findChordNoteIndex(
              svgTarget,
              host as HTMLElement
            );
            return {
              element: host as HTMLElement,
              elementIndex: idx,
              chordNoteIndex,
            };
          }
          return {
            element: host as HTMLElement,
            elementIndex: idx,
            chordNoteIndex: null,
          };
        }
        current = host;
      } else {
        current = current.parentElement;
      }
    }
    return { element: null, elementIndex: -1, chordNoteIndex: null };
  }

  #findChordNoteIndex(
    svgTarget: Element,
    chordElement: HTMLElement
  ): number | null {
    const chordShadow = chordElement.shadowRoot;
    if (!chordShadow) {
      return null;
    }

    const outerSvg = chordShadow.querySelector('svg');
    if (!outerSvg) {
      return null;
    }

    // todo: see if i can search by class name '.note' instead
    const noteSvgs = Array.from(outerSvg.children).filter(
      (c) => c.tagName === 'svg' || c.tagName === 'SVG'
    );

    let current: Element | null = svgTarget;
    while (current && current !== outerSvg) {
      const idx = noteSvgs.indexOf(current);
      if (idx !== -1) return idx;
      current = current.parentElement;
    }

    return null;
  }

  /**
   * Live preview callback: temporarily update the element's pitch during drag.
   */
  #onPitchLivePreview(
    elementIndex: number,
    newNote: LetterOctave,
    chordNoteIndex: number | null
  ) {
    const element = this.#currentElements[elementIndex];
    if (!element) {
      return;
    }

    if (element.nodeName === 'MUSIC-CHORD' && chordNoteIndex !== null) {
      const noteElements = element.querySelectorAll('music-note');
      const noteEl = noteElements[chordNoteIndex] as HTMLElement | undefined;
      if (noteEl) {
        noteEl.setAttribute('value', newNote);
      }
    } else if (element.nodeName === 'MUSIC-NOTE') {
      element.setAttribute('value', newNote);
    }

    // Re-render this element in place (recalculate Y position, stem direction, beams)
    this.#renderNotes(this.#currentElements);
  }

  // Describe is: clef, key signature, time signature, and beams overlay
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

    this.#beamsContainer.classList.add('beams-container');
    this.#beamsContainer.style.overflow = 'visible';
    this.#beamsContainer.style.pointerEvents = 'none';
    this.transcribeContainer.appendChild(this.#beamsContainer);
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
    this.#disableDrag();
    try {
      this.#mutationObservers.forEach((m) => m.disconnect());
    } catch (e) {
      // ignore
    }
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ): void {
    if (oldValue === newValue) return;

    if (name === 'editable') {
      if (this.editable) {
        this.#enableDrag();
      } else {
        this.#disableDrag();
      }
    } else if (name === 'managed') {
      if (this.editable) {
        this.#disableDrag();
        this.#enableDrag();
      }
    } else {
      // For keySig, mode, time — trigger full re-render
      super.attributeChangedCallback(name, oldValue, newValue);
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
    // Cancel any in-progress drag before clearing rendered content
    this.#noteTimingDragHandler?.cancelDrag();

    // Clear previously rendered beams
    this.#beamsContainer.innerHTML = '';

    const [beatsInMeasure, beatType] = this.#convertTotimeInts(this.time);
    // Measure duration as a fraction of a whole note (e.g. 4/4 = 1.0, 3/4 = 0.75, 6/8 = 0.75)
    const measureDuration = beatsInMeasure / beatType;

    const { beamsBuilder, beamRenderer, stemDirections } =
      this.#buildBeamsRenderer(elements);
    this.#beamRenderer = beamRenderer;

    // Set rendering properties on each element (triggers their self-render via rAF)
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
      const isBeamed = beamsBuilder.isBeamed(i);
      const extension = this.#beamRenderer.stemExtension(i);

      if (element.nodeName === 'MUSIC-NOTE') {
        const noteElement = element as NoteElementType;
        noteElement.batchUpdate(() => {
          noteElement.stemUp = stemUp;
          noteElement.stemExtension = extension;
          noteElement.noFlags = isBeamed;
        });
      } else {
        const chordElement = element as ChordElementType;
        const staffYCoordinates = chordElement.notes.map((note) =>
          this.noteToYCoordinate(note.value)
        );
        chordElement.batchUpdate(() => {
          chordElement.stemUp = stemUp;
          chordElement.stemExtension = extension;
          chordElement.noFlags = isBeamed;
          chordElement.staffYCoordinates = staffYCoordinates;
        });
      }

      beatOffset += durationToFactor[duration as DurationType];
    }

    this.#currentElements = elements;
    this.#spaceElements();

    for (const svgGroup of this.#beamRenderer.svgGroups) {
      this.#beamsContainer.appendChild(svgGroup);
    }
  }

  #buildBeamsRenderer(elements: NoteOrChordElementType[]) {
    const [beatsInMeasure, beatType] = this.#convertTotimeInts(this.time);
    const beamsBuilder = new BeamsBuilder(elements, [beatsInMeasure, beatType]);
    const stemDirections = this.#determineStemDirections(
      elements,
      beamsBuilder
    );

    const noteYPositions: (NoteYPosition | null)[] = elements.map(
      (element, i) => {
        if (!beamsBuilder.isBeamed(i)) return null;
        const stemUp = stemDirections[i];
        const yHeadOffset = stemUp
          ? NOTE_Y_HEAD_OFFSET_STEM_UP
          : NOTE_Y_HEAD_OFFSET_STEM_DOWN;

        if (element.nodeName === 'MUSIC-NOTE') {
          return {
            // todo: anywhere where I am doing an `STAFF_Y_PADDING + noteYCoord`,
            //  will revisit to figure out how to handle better. Basically need
            // account for margin-top (currently 28px); not sure why it is only 8 though.
            y:
              STAFF_Y_PADDING +
              this.noteToYCoordinate((element as NoteElementType).value) -
              yHeadOffset,
            stemUp,
          };
        }

        // Chord — beam Y is anchored to the extremal (stem-owning) notehead.
        const chordElement = element as ChordElementType;
        const staffYCoordinates = chordElement.notes.map((note) =>
          this.noteToYCoordinate(note.value)
        );
        const extremalStaffY = stemUp
          ? Math.max(...staffYCoordinates)
          : Math.min(...staffYCoordinates);

        // The beam must also clear every non-extremal notehead.
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

        let chordClearanceY: number | undefined;
        if (nonExtStaffYs.length > 0) {
          chordClearanceY = stemUp
            ? Math.min(...nonExtStaffYs) - NOTEHEAD_BEAM_CLEAR
            : Math.max(...nonExtStaffYs) + NOTEHEAD_BEAM_CLEAR;
        }

        return {
          y: STAFF_Y_PADDING + extremalStaffY - yHeadOffset,
          stemUp,
          chordClearanceY,
        };
      }
    );

    return {
      beamsBuilder,
      beamRenderer: beamsBuilder.buildRenderer(noteYPositions),
      stemDirections,
    };
  }

  // Rules (per standard music notation):
  //   - Notes below the middle staff line → stem up.
  //   - Notes on or above the middle staff line → stem down.
  //   - Beam groups: the note farthest from the middle line determines direction for the whole group.
  //   - Chords: the note farthest from the middle line determines direction.
  #determineStemDirections(
    elements: NoteOrChordElementType[],
    beamsBuilder: BeamsBuilder
  ): boolean[] {
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
      const groupIndices = beamsBuilder.beamGroupFor(i);
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
    if (!note) {
      return 0;
    }

    // Extract letter (A-G) and optional octave digit, discarding accidentals.
    const match = note.trim().match(/^([A-Ga-g])[#bx]*(\d?)$/);
    if (!match) {
      return 0;
    }

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

  #spaceElements() {
    const transcribeRect = this.transcribeContainer.getBoundingClientRect();
    const describeRect = this.#describeContainer.getBoundingClientRect();
    const describeEndX = Math.round(describeRect.right - transcribeRect.left);
    const remainingWidth = transcribeRect.width - describeEndX;

    // Configure beams container to cover the notes area
    this.#beamsContainer.setAttribute('x', `${describeEndX}`);
    this.#beamsContainer.setAttribute('width', `${remainingWidth}`);
    // todo: handle height instead of using literal
    this.#beamsContainer.setAttribute('viewBox', `0 0 ${remainingWidth} 100`);
    this.#beamsContainer.setAttribute('height', '100');

    const [beatsInMeasure, beatType] = this.#convertTotimeInts(this.time);
    const measureDuration = beatsInMeasure / beatType;

    const minNoteWidth = 20; // px — minimum space per note to prevent notehead overlap
    const proportionalWidth =
      remainingWidth - this.#currentElements.length * minNoteWidth;

    let beatOffset = 0;
    for (let i = 0; i < this.#currentElements.length; i++) {
      const element = this.#currentElements[i];
      const duration = element.duration as DurationType;
      const xOffsetInNotesSpace =
        i * minNoteWidth + (beatOffset / measureDuration) * proportionalWidth;

      this.#beamRenderer?.setX(i, xOffsetInNotesSpace);

      // Position the light DOM element via inline styles
      const xInWrapper = describeEndX + xOffsetInNotesSpace;
      element.style.left = `${xInWrapper}px`;

      if (element.nodeName === 'MUSIC-NOTE') {
        const noteEl = element as NoteElementType;
        const yHeadOffset = computeYHeadOffset(
          noteEl.stemUp,
          duration,
          noteEl.noFlags
        );
        const noteY =
          STAFF_Y_PADDING + this.noteToYCoordinate(noteEl.value) - yHeadOffset;
        element.style.top = `${noteY}px`;
      } else {
        // Chord y-positioning is handled internally by the chord's own SVG rendering
        element.style.top = '0px';
      }

      beatOffset += durationToFactor[duration];
    }
    this.#beamRenderer?.spaceAll();
  }

  // Respace notes on resize
  onStaffResize() {
    if (this.#currentElements.length > 0) {
      this.#spaceElements();
    }
  }
}
