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
  type NoteYPosition,
} from './utils';
import {
  durationToFactor,
  durationToFlagCountMap,
  factorToDuration,
  SVG_NS,
} from './utils/consts';
import {
  CLEF_X_OFFSET,
  KEY_SIG_FLAT_WIDTH,
  KEY_SIG_FLAT_Y_OFFSET,
  KEY_SIG_SHARP_WIDTH,
  MIDDLE_STAFF_Y,
  MIN_NOTE_WIDTH,
  STAFF_TRANSCRIPTION_HEIGHT,
  STAFF_Y_PADDING,
  TIME_SIG_Y_TRANSLATE,
} from './utils/notationDimensions';
import { NoteTimingDragHandler } from './utils/noteTimingDragHandler';
import { PitchDragHandler } from './utils/pitchDragHandler';

export abstract class StaffClassicalElementBase extends StaffElementBase {
  static get observedAttributes(): string[] {
    // All attributes need to be all lower case because jsdom lowers then
    // in it's life-cycle
    return ['keysig', 'mode', 'time', 'editable', 'managed'];
  }

  #mutationObservers: MutationObserver[];
  #effectiveTimeInts: [BeatsInMeasure, BeatTypeInMeasure];
  #effectiveMode: Mode;
  #effectiveKeySig: LetterNote;
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

    this.#effectiveTimeInts = this.#convertTotimeInts(
      this.#resolveInheritedValue('time', '4/4')
    );
    this.#effectiveMode = this.#resolveInheritedValue('mode', 'major') as Mode;
    this.#effectiveKeySig = this.#resolveInheritedValue(
      'keysig',
      'C'
    ) as LetterNote;

    this.#describeContainer = document.createElementNS(SVG_NS, 'g');
    this.#beamsContainer = document.createElementNS(SVG_NS, 'svg');
  }

  #resolveInheritedValue(attributeName: string, defaultValue: string): string {
    return (
      this.getAttribute(attributeName) ??
      this.closest('music-measure')?.getAttribute(attributeName) ??
      this.closest('music-composition')?.getAttribute(attributeName) ??
      defaultValue
    );
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
    return this.#effectiveKeySig;
  }

  set keySig(value: string) {
    this.setAttribute('keysig', value);
  }

  get mode(): Mode {
    return this.#effectiveMode;
  }

  set mode(value: string) {
    this.setAttribute('mode', value);
  }

  get time(): string {
    return `${this.#effectiveTimeInts[0]}/${this.#effectiveTimeInts[1]}`;
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

    const chordSvg = chordShadow.querySelector('.chord');
    if (!chordSvg) {
      return null;
    }

    const noteSvgs = Array.from(chordShadow.querySelectorAll('.chord > .note'));

    let current: Element | null = svgTarget;
    while (current && current !== chordSvg) {
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

    const xOffsetOfClef = CLEF_X_OFFSET;
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
    const { useSharps, coordinates } = this.getKeyYCoordinates();
    const g = document.createElementNS(SVG_NS, 'svg');
    g.setAttribute('class', 'key-signature');
    g.setAttribute('x', xOffset.toString());
    g.setAttribute('y', '-15');
    if (coordinates.length) {
      const createSvgFunc = useSharps ? createSharpSvg : createFlatSvg;
      const Width = useSharps ? KEY_SIG_SHARP_WIDTH : KEY_SIG_FLAT_WIDTH;
      const yOffset = useSharps ? 0 : KEY_SIG_FLAT_Y_OFFSET;
      for (const y of coordinates) {
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
      measureNumberStr === '1' || !measure ? this.#effectiveTimeInts : null;
    const timeChangeInMeasure =
      !firstMeasureOrNoCompositionTime && measure && this.getAttribute('time')
        ? this.#effectiveTimeInts
        : null;

    if (firstMeasureOrNoCompositionTime || timeChangeInMeasure) {
      const timeSigSvg = createTimeSignatureSvg(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- will not be null
        ...(firstMeasureOrNoCompositionTime ?? timeChangeInMeasure)!
      );
      timeSigSvg.setAttribute(
        'transform',
        `translate(${xOffset}, ${TIME_SIG_Y_TRANSLATE})`
      );
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
    if (oldValue === newValue) {
      return;
    }

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
      if (name === 'time') {
        this.#effectiveTimeInts = this.#convertTotimeInts(
          this.#resolveInheritedValue('time', '4/4')
        );
      } else if (name === 'mode') {
        this.#effectiveMode = this.#resolveInheritedValue(
          'mode',
          'major'
        ) as Mode;
      } else if (name === 'keysig') {
        this.#effectiveKeySig = this.#resolveInheritedValue(
          'keysig',
          'C'
        ) as LetterNote;
      }
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

    this.#renderNotes(assignedElements);

    /*
     * todo: I may not need this, but I am keeping an example for now.
     * This would mainly be if I need to be aware of changes to attributes
     * on notes/chords and do something about it. I would also need to handle
     * these observers better in the case of a note/chord being removed but the
     * observer is still around (dead/disconnected); I will update to a map somehow.
     */
    // assignedElements.forEach((node) => {
    //   // only create the observer if it is new
    //   const observer = new MutationObserver(() => {});
    //   observer.observe(node, {
    //     childList: true,
    //     subtree: true,
    //     attributes: true,
    //     characterData: true,
    //   });
    //   this.#mutationObservers.push(observer);
    // });
  }

  #renderNotes(elements: NoteOrChordElementType[]) {
    // Cancel any in-progress drag before clearing rendered content
    this.#noteTimingDragHandler?.cancelDrag();

    // Clear previously rendered beams
    this.#beamsContainer.innerHTML = '';

    const [beatsInMeasure, beatType] = this.#effectiveTimeInts;
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
    const [beatsInMeasure, beatType] = this.#effectiveTimeInts;
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
    this.#beamsContainer.setAttribute(
      'viewBox',
      `0 0 ${remainingWidth} ${STAFF_TRANSCRIPTION_HEIGHT}`
    );
    this.#beamsContainer.setAttribute(
      'height',
      `${STAFF_TRANSCRIPTION_HEIGHT}`
    );

    const [beatsInMeasure, beatType] = this.#effectiveTimeInts;
    const measureDuration = beatsInMeasure / beatType;

    const proportionalWidth =
      remainingWidth - this.#currentElements.length * MIN_NOTE_WIDTH;

    let beatOffset = 0;
    for (let i = 0; i < this.#currentElements.length; i++) {
      const element = this.#currentElements[i];
      const duration = element.duration as DurationType;
      const xOffsetInNotesSpace =
        i * MIN_NOTE_WIDTH + (beatOffset / measureDuration) * proportionalWidth;

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
