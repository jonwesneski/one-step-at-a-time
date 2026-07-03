import {
  computeInterNoteSpacing,
  computeNoteAccidentals,
  totalChordAccidentalWidth,
} from './rules/accidentalRules';
import { buildBeamsRenderer } from './rules/beamRules';
import { getNoteDynamic, pairHairpins } from './rules/dynamicsRules';
import { restToYCoordinate } from './rules/restRules';
import { calculateStaffMinWidth } from './rules/staffWidth';
import { durationToFactor, factorToDuration } from './rules/theoryConsts';
import {
  buildTupletGroups,
  computeOuterBracketBaseY,
  computeTupletBracketGeometry,
  parseTupletRatio,
  TupletBracketGeometry,
  TupletGroup,
} from './rules/tupletRules';
import { StaffElementBase } from './staffBase';
import {
  ChordElementType,
  ChordNote,
  IChordElement,
  INoteElement,
  NoteChordOrRestElementType,
  NoteElementType,
  NoteLetterOctave,
  TupletElementType,
  YCoordinates,
} from './types/elements';
import {
  BeatsInMeasure,
  BeatTypeInMeasure,
  DurationType,
  Mode,
  Note,
  NoteLetter,
  Octave,
} from './types/theory';
import {
  BeamsBuilder,
  computeYHeadOffset,
  createDynamicMarkingSvg,
  createFlatSvg,
  createHairpinSvg,
  createSharpSvg,
  createTimeSignatureSvg,
} from './utils';
import {
  COMMON_ATTRIBUTES,
  MUSIC_CHORD_NODE,
  MUSIC_COMPOSITION,
  MUSIC_MEASURE,
  MUSIC_NOTE,
  MUSIC_NOTE_NODE,
  MUSIC_REST_NODE,
  MUSIC_TUPLET_NODE,
  NOTE_EVENTS,
  STAFF_EVENTS,
  SVG_NS,
} from './utils/consts';
import {
  CLEF_X_OFFSET,
  DYNAMICS_BASELINE_Y,
  HAIRPIN_OPEN_HEIGHT,
  KEY_SIG_FLAT_WIDTH,
  KEY_SIG_FLAT_Y_OFFSET,
  KEY_SIG_SHARP_WIDTH,
  MIN_NOTE_WIDTH,
  NOTES_AREA_LEFT_MARGIN,
  STAFF_TOP_LINE_Y,
  STAFF_TRANSCRIPTION_HEIGHT,
  STAFF_Y_PADDING,
  TIME_SIG_Y_TRANSLATE,
  TUPLET_HOOK_LENGTH_PX,
  TUPLET_NUMERAL_FONT_SIZE,
  TUPLET_STAFF_CLEARANCE_PX,
} from './utils/notationDimensions';
import { NoteTimingDragHandler } from './utils/noteTimingDragHandler';
import { PitchDragHandler } from './utils/pitchDragHandler';
import {
  ACCIDENTAL_NOTE_GAP,
  ACCIDENTAL_SYMBOL_WIDTH,
  NOTE_SVG_WIDTH,
} from './utils/svgCreator/note';
import { createTupletBracketSvg } from './utils/svgCreator/tuplet';

function flattenSlotElements(assigned: Element[]): {
  flatElements: NoteChordOrRestElementType[];
  tupletsByIndex: Map<number, TupletElementType[]>;
} {
  const flatElements: NoteChordOrRestElementType[] = [];
  const tupletsByIndex = new Map<number, TupletElementType[]>();

  function flatten(
    element: Element,
    tupletAncestors: TupletElementType[]
  ): void {
    const tag = element.nodeName;
    if (
      tag === MUSIC_NOTE_NODE ||
      tag === MUSIC_CHORD_NODE ||
      tag === MUSIC_REST_NODE
    ) {
      if (tupletAncestors.length > 0) {
        tupletsByIndex.set(flatElements.length, [...tupletAncestors]);
      }
      flatElements.push(element as NoteChordOrRestElementType);
    } else if (tag === MUSIC_TUPLET_NODE) {
      for (const child of element.children) {
        flatten(child, [...tupletAncestors, element as TupletElementType]);
      }
    }
  }

  for (const element of assigned) {
    flatten(element, []);
  }

  return { flatElements, tupletsByIndex };
}

function computeTupletScaledNoteCount(
  elements: NoteChordOrRestElementType[],
  tupletsByIndex: ReadonlyMap<number, TupletElementType[]>
): number {
  let count = 0;
  for (let i = 0; i < elements.length; i++) {
    const ancestors = tupletsByIndex.get(i);
    if (ancestors !== undefined) {
      const innermostTuplet = ancestors[ancestors.length - 1];
      const { actual, normal } = parseTupletRatio(innermostTuplet.ratio);
      count += normal / actual;
    } else {
      count += 1;
    }
  }
  return count;
}

export abstract class StaffClassicalElementBase extends StaffElementBase {
  static get observedAttributes(): string[] {
    // All attributes need to be all lower case because jsdom lowers then
    // in it's life-cycle
    return [
      COMMON_ATTRIBUTES.KEY_SIG,
      COMMON_ATTRIBUTES.MODE,
      COMMON_ATTRIBUTES.TIME_SIG,
      'editable',
      'managed',
    ];
  }

  #mutationObservers: MutationObserver[];
  #effectiveTimeSig: [BeatsInMeasure, BeatTypeInMeasure];
  #effectiveMode: Mode;
  #effectiveKeySig: Note;
  #describeContainer: SVGGElement;
  #beamsContainer: SVGSVGElement;
  #tupletContainer: SVGSVGElement = document.createElementNS(
    SVG_NS,
    'svg'
  ) as SVGSVGElement;
  #dynamicsContainer: SVGSVGElement = document.createElementNS(
    SVG_NS,
    'svg'
  ) as SVGSVGElement;
  #beamRenderer: ReturnType<BeamsBuilder['buildRenderer']> | null = null;
  #currentElements: NoteChordOrRestElementType[] = [];
  #noteTimingDragHandler: NoteTimingDragHandler | null = null;
  #notePitchDragHandler: PitchDragHandler | null = null;
  #boundPointerDown: ((e: PointerEvent) => void) | null = null;
  #describeEndX = 0;
  #showDescribe = true;
  #tupletGroups: TupletGroup[] = [];
  #tupletsByIndex: Map<number, TupletElementType[]> = new Map();
  #noteXPositions: Map<number, number> = new Map();
  #stemDirections: boolean[] = [];
  #beamedIndicesSnapshot: Set<number> = new Set();
  #noteStaffYCoordsSnapshot: Map<NoteElementType, number> = new Map();
  #chordStaffYCoordsSnapshot: Map<ChordElementType, number[]> = new Map();
  #boundDrawConnectors = () => this.drawConnectorsWhenStandalone();
  #boundRenderDynamics = () => {
    this.#dynamicsContainer.innerHTML = '';
    this.#renderDynamics();
  };
  #boundNoteYChange = () => {
    if (this.#currentElements.length > 0) {
      this.#renderNotes(this.#currentElements);
    }
  };

  protected get describeEndX(): number {
    return this.#describeEndX;
  }

  get showDescribe(): boolean {
    return this.#showDescribe;
  }

  set showDescribe(value: boolean) {
    if (this.#showDescribe === value) {
      return;
    }
    this.#showDescribe = value;
    this.#refreshDescribe();
  }

  constructor() {
    super();
    this.#mutationObservers = [];

    this.#effectiveTimeSig = this.#convertTotimeInts(
      this.#resolveInheritedValue(COMMON_ATTRIBUTES.TIME_SIG, '4/4')
    );
    this.#effectiveMode = this.#resolveInheritedValue(
      COMMON_ATTRIBUTES.MODE,
      'major'
    ) as Mode;
    this.#effectiveKeySig = this.#resolveInheritedValue(
      COMMON_ATTRIBUTES.KEY_SIG,
      'C'
    ) as Note;

    this.#describeContainer = document.createElementNS(SVG_NS, 'g');
    this.#beamsContainer = document.createElementNS(SVG_NS, 'svg');
  }

  #resolveInheritedValue(attributeName: string, defaultValue: string): string {
    return (
      this.getAttribute(attributeName) ??
      this.closest(MUSIC_MEASURE)?.getAttribute(attributeName) ??
      this.closest(MUSIC_COMPOSITION)?.getAttribute(attributeName) ??
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
      ::slotted(music-chord),
      ::slotted(music-rest) {
        position: absolute;
      }

      ::slotted(music-tuplet) {
        display: contents;
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

  get keySig(): Note {
    return this.#effectiveKeySig;
  }

  set keySig(value: string) {
    this.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, value);
  }

  get mode(): Mode {
    return this.#effectiveMode;
  }

  set mode(value: string) {
    this.setAttribute(COMMON_ATTRIBUTES.MODE, value);
  }

  get time(): string {
    return `${this.#effectiveTimeSig[0]}/${this.#effectiveTimeSig[1]}`;
  }

  set time(value: string) {
    this.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, value);
  }

  abstract get yCoordinates(): YCoordinates;

  abstract get octaves(): Octave[];

  public abstract getKeyYCoordinates(): {
    useSharps: boolean;
    coordinates: number[];
  };

  protected abstract get clefSvg(): string;

  protected onConnectedCallback() {
    // Re-resolve inherited attrs now that ancestors are reachable via closest()
    this.#effectiveTimeSig = this.#convertTotimeInts(
      this.#resolveInheritedValue(COMMON_ATTRIBUTES.TIME_SIG, '4/4')
    );
    this.#effectiveMode = this.#resolveInheritedValue(
      COMMON_ATTRIBUTES.MODE,
      'major'
    ) as Mode;
    this.#effectiveKeySig = this.#resolveInheritedValue(
      COMMON_ATTRIBUTES.KEY_SIG,
      'C'
    ) as Note;

    this.#buildDescribe(this.clefSvg);
    if (this.editable) {
      this.#enableDrag();
    }
    this.addEventListener(
      NOTE_EVENTS.CONNECTOR_ATTRIBUTE_CHANGE,
      this.#boundDrawConnectors
    );
    this.addEventListener(NOTE_EVENTS.NOTE_Y_CHANGE, this.#boundNoteYChange);
    this.addEventListener(
      NOTE_EVENTS.DYNAMIC_ATTRIBUTE_CHANGE,
      this.#boundRenderDynamics
    );
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
          if (host.nodeName === MUSIC_CHORD_NODE) {
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
    newNote: NoteLetterOctave,
    chordNoteIndex: number | null
  ) {
    const element = this.#currentElements[elementIndex];
    if (!element) {
      return;
    }

    const letter = newNote[0] as NoteLetter;
    const octave = parseInt(newNote[1], 10) as Octave;

    if (element.nodeName === MUSIC_CHORD_NODE && chordNoteIndex !== null) {
      const noteElements = element.querySelectorAll(MUSIC_NOTE);
      const noteEl = noteElements[chordNoteIndex] as HTMLElement | undefined;
      if (noteEl) {
        noteEl.setAttribute('note', letter);
        noteEl.setAttribute('octave', String(octave));
      }
    } else if (element.nodeName === MUSIC_NOTE_NODE) {
      element.setAttribute('note', letter);
      element.setAttribute('octave', String(octave));
    }

    // Re-render this element in place (recalculate Y position, stem direction, beams)
    this.#renderNotes(this.#currentElements);
  }

  // Describe is: clef, key signature, time signature, and beams overlay
  #buildDescribe(clefSvgStr: string) {
    this.#describeContainer.classList.add('describe-container');
    this.#describeContainer.innerHTML = this.#showDescribe ? clefSvgStr : '';
    this.transcribeContainer.appendChild(this.#describeContainer);

    const xOffsetOfClef = CLEF_X_OFFSET;
    const xOffsetOfKeySignature = this.#showDescribe
      ? this.#appendKeySignatureSvg(this.#describeContainer, xOffsetOfClef)
      : xOffsetOfClef;

    this.#appendTimeSignatureSvgIfNecessary(
      this.#describeContainer,
      xOffsetOfKeySignature + 5
    );

    this.#beamsContainer.classList.add('beams-container');
    this.#beamsContainer.style.overflow = 'visible';
    this.#beamsContainer.style.pointerEvents = 'none';
    this.transcribeContainer.appendChild(this.#beamsContainer);

    this.#tupletContainer.classList.add('tuplets-container');
    this.#tupletContainer.style.overflow = 'visible';
    this.#tupletContainer.style.pointerEvents = 'none';
    this.transcribeContainer.appendChild(this.#tupletContainer);

    this.#dynamicsContainer.classList.add('dynamics-container');
    this.#dynamicsContainer.style.overflow = 'visible';
    this.#dynamicsContainer.style.pointerEvents = 'none';
    this.transcribeContainer.appendChild(this.#dynamicsContainer);
  }

  #refreshDescribe() {
    if (!this.isConnected) return;
    this.#describeContainer.innerHTML = this.#showDescribe ? this.clefSvg : '';
    const xOffsetOfKeySignature = this.#showDescribe
      ? this.#appendKeySignatureSvg(this.#describeContainer, CLEF_X_OFFSET)
      : CLEF_X_OFFSET;
    this.#appendTimeSignatureSvgIfNecessary(
      this.#describeContainer,
      xOffsetOfKeySignature + 5
    );
    if (this.#currentElements.length > 0) {
      this.#renderNotes(this.#currentElements);
    }
  }

  refreshInheritedAttrs() {
    this.#effectiveTimeSig = this.#convertTotimeInts(
      this.#resolveInheritedValue(COMMON_ATTRIBUTES.TIME_SIG, '4/4')
    );
    this.#effectiveMode = this.#resolveInheritedValue(
      COMMON_ATTRIBUTES.MODE,
      'major'
    ) as Mode;
    this.#effectiveKeySig = this.#resolveInheritedValue(
      COMMON_ATTRIBUTES.KEY_SIG,
      'C'
    ) as Note;
    this.#refreshDescribe();
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
    const measure = this.closest(MUSIC_MEASURE);
    const measureNumberStr: string | null = measure?.getAttribute('number');
    const firstMeasureOrNoCompositionTime =
      measureNumberStr === '1' || !measure ? this.#effectiveTimeSig : null;
    const timeChangeInMeasure =
      !firstMeasureOrNoCompositionTime && measure && this.getAttribute('time')
        ? this.#effectiveTimeSig
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
    this.removeEventListener(
      NOTE_EVENTS.CONNECTOR_ATTRIBUTE_CHANGE,
      this.#boundDrawConnectors
    );
    this.removeEventListener(NOTE_EVENTS.NOTE_Y_CHANGE, this.#boundNoteYChange);
    this.removeEventListener(
      NOTE_EVENTS.DYNAMIC_ATTRIBUTE_CHANGE,
      this.#boundRenderDynamics
    );
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
        this.#effectiveTimeSig = this.#convertTotimeInts(
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
        ) as Note;
      }
      this.#refreshDescribe();
    }
  }

  protected onHandleSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    const assigned = slot
      .assignedElements()
      .filter(
        (e) =>
          e.nodeName === MUSIC_NOTE_NODE ||
          e.nodeName === MUSIC_CHORD_NODE ||
          e.nodeName === MUSIC_REST_NODE ||
          e.nodeName === MUSIC_TUPLET_NODE
      );

    const { flatElements, tupletsByIndex } = flattenSlotElements(assigned);
    this.#tupletsByIndex = tupletsByIndex;
    this.#renderNotes(flatElements);

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

  #renderNotes(elements: NoteChordOrRestElementType[]) {
    // Cancel any in-progress drag before clearing rendered content
    this.#noteTimingDragHandler?.cancelDrag();

    // Clear previously rendered beams, tuplet brackets, and dynamics
    this.#beamsContainer.innerHTML = '';
    this.#tupletContainer.innerHTML = '';
    this.#dynamicsContainer.innerHTML = '';

    const [beatsInMeasure, beatType] = this.#effectiveTimeSig;
    // Measure duration as a fraction of a whole note (e.g. 4/4 = 1.0, 3/4 = 0.75, 6/8 = 0.75)
    const measureDuration = beatsInMeasure / beatType;

    const noteStaffYCoords = new Map<NoteElementType, number>();
    const chordStaffYCoords = new Map<ChordElementType, number[]>();
    for (const element of elements) {
      if (element.nodeName === MUSIC_NOTE_NODE) {
        const noteElement = element as NoteElementType;
        noteStaffYCoords.set(
          noteElement,
          this.noteToYCoordinate(
            noteElement.note,
            noteElement.octave ?? undefined
          )
        );
      } else if (element.nodeName === MUSIC_CHORD_NODE) {
        const chordElement = element as ChordElementType;
        chordStaffYCoords.set(
          chordElement,
          this.#resolveChordStaffYCoordinates(chordElement.notes)
        );
      }
    }

    const { beamsBuilder, beamRenderer, stemDirections } = buildBeamsRenderer(
      elements,
      this.#effectiveTimeSig,
      noteStaffYCoords,
      chordStaffYCoords,
      this.#tupletsByIndex
    );
    this.#beamRenderer = beamRenderer;

    // Snapshot data needed by #spaceElements to render tuplet brackets
    this.#stemDirections = stemDirections;
    this.#beamedIndicesSnapshot = new Set(
      elements.map((_, i) => i).filter((i) => beamsBuilder.isBeamed(i))
    );
    this.#noteStaffYCoordsSnapshot = new Map(noteStaffYCoords);
    this.#chordStaffYCoordsSnapshot = new Map(chordStaffYCoords);
    this.#tupletGroups = buildTupletGroups(elements, this.#tupletsByIndex);

    const { noteShowAccidentals, chordNoteAccidentals } =
      computeNoteAccidentals(
        elements,
        this.#effectiveKeySig,
        this.#effectiveMode
      );

    // Set rendering properties on each element
    // (triggers their self-render via requestAnimationFrame)
    let beatOffset = 0;
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const duration = element.duration;
      const tupletAncestors = this.#tupletsByIndex.get(i);
      const innermostTuplet =
        tupletAncestors !== undefined
          ? tupletAncestors[tupletAncestors.length - 1]
          : undefined;
      const durationContribution =
        innermostTuplet !== undefined
          ? (() => {
              const { actual, normal } = parseTupletRatio(
                innermostTuplet.ratio
              );
              return (
                durationToFactor[duration as DurationType] * (normal / actual)
              );
            })()
          : durationToFactor[duration as DurationType];
      if (beatOffset + durationContribution > measureDuration) {
        console.warn(
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

      if (element.nodeName === MUSIC_REST_NODE) {
        // no stem, beam, or accidental properties — rest renders itself
      } else if (element.nodeName === MUSIC_NOTE_NODE) {
        const noteElement = element as NoteElementType;
        noteElement.batchUpdate(() => {
          noteElement.stemUp = stemUp;
          noteElement.stemExtension = extension;
          noteElement.noFlags = isBeamed;
          noteElement.showAccidental = noteShowAccidentals.get(noteElement);
          noteElement.staffY = noteStaffYCoords.get(noteElement) ?? null;
        });
      } else {
        const chordElement = element as ChordElementType;
        const staffYCoordinates = chordStaffYCoords.get(chordElement) ?? [];
        const accidentals = chordNoteAccidentals.get(chordElement) ?? [];
        chordElement.batchUpdate(() => {
          chordElement.stemUp = stemUp;
          chordElement.stemExtension = extension;
          chordElement.noFlags = isBeamed;
          chordElement.staffYCoordinates = staffYCoordinates;
          chordElement.noteAccidentals = accidentals;
        });
      }

      beatOffset += durationContribution;
    }

    this.#currentElements = elements;
    this.#spaceElements();

    for (const svgGroup of this.#beamRenderer.svgGroups) {
      this.#beamsContainer.appendChild(svgGroup);
    }

    this.dispatchEvent(
      new CustomEvent(STAFF_EVENTS.NOTES_POSITIONED, {
        bubbles: true,
        composed: true,
      })
    );

    this.drawConnectorsWhenStandalone();

    if (elements.length > 0) {
      const firstElement = elements[0];
      let firstNoteAccidentalWidth = 0;
      if (firstElement.nodeName === MUSIC_NOTE_NODE) {
        const accidental = (firstElement as NoteElementType).showAccidental;
        if (accidental) {
          firstNoteAccidentalWidth =
            ACCIDENTAL_SYMBOL_WIDTH[accidental] + ACCIDENTAL_NOTE_GAP;
        }
      } else if (firstElement.nodeName === MUSIC_CHORD_NODE) {
        const chordEl = firstElement as ChordElementType;
        if (
          chordEl.staffYCoordinates &&
          chordEl.noteAccidentals.some((a) => a != null)
        ) {
          firstNoteAccidentalWidth = totalChordAccidentalWidth(
            chordEl.noteAccidentals,
            chordEl.staffYCoordinates
          );
        }
      }
      const minWidth = calculateStaffMinWidth(
        this.#describeEndX,
        computeTupletScaledNoteCount(elements, this.#tupletsByIndex),
        firstNoteAccidentalWidth
      );
      this.dispatchEvent(
        new CustomEvent(STAFF_EVENTS.STAFF_MIN_WIDTH, {
          bubbles: true,
          composed: false,
          detail: { minWidth },
        })
      );
    }
  }

  #resolveChordStaffYCoordinates(notes: ChordNote[]): number[] {
    const result: number[] = [];
    let previousY = Infinity;

    for (const note of notes) {
      if (note.octave !== null) {
        const y = this.noteToYCoordinate(note.value, note.octave ?? undefined);
        result.push(y);
        previousY = y;
      } else {
        // For notes without an explicit octave, find the largest Y (lowest pitch)
        // that is still strictly below the previous note's Y, ensuring ascending
        // pitch (root-position close voicing).
        const candidates: number[] = [];
        for (const octave of this.octaves) {
          const y = this.noteToYCoordinate(note.value, octave);
          if (y > 0 && y < previousY) {
            candidates.push(y);
          }
        }
        const resolved =
          candidates.length > 0
            ? Math.max(...candidates)
            : this.noteToYCoordinate(note.value, undefined);
        result.push(resolved);
        previousY = resolved;
      }
    }

    return result;
  }

  // Return the y-coordinate for a given note and octave.
  // Accidentals are ignored for vertical placement — C# and C natural occupy
  // the same staff line/space.
  public noteToYCoordinate(note: Note, octave?: Octave): number {
    if (!note) {
      return 0;
    }

    // Strip accidentals: take the first character (always the letter A-G).
    const letter = note[0].toUpperCase();

    if (octave !== undefined) {
      const yCoordinate =
        this.yCoordinates[`${letter}${octave}` as NoteLetterOctave];
      if (yCoordinate !== undefined) {
        return yCoordinate;
      }
    } else {
      for (const n of this.octaves) {
        const yCoordinate =
          this.yCoordinates[`${letter}${n}` as NoteLetterOctave];
        if (yCoordinate !== undefined) {
          return yCoordinate;
        }
      }
    }

    return 0;
  }

  #spaceElements() {
    const transcribeRect = this.transcribeContainer.getBoundingClientRect();
    if (typeof this.#describeContainer.getBBox === 'function') {
      const describeBBox = this.#describeContainer.getBBox();
      this.#describeEndX = Math.round(describeBBox.x + describeBBox.width);
    } else {
      const describeRect = this.#describeContainer.getBoundingClientRect();
      this.#describeEndX = Math.round(describeRect.right - transcribeRect.left);
    }
    const remainingWidth = transcribeRect.width - this.#describeEndX;

    // Estimate above-staff budget using stem directions and staff-referenced positions.
    // This is a conservative estimate computed before notes are positioned; the actual
    // tuplet bracket geometries are computed after note positions are set (below).
    const aboveStaffBudget = this.#estimateAboveStaffBudget();
    const containerWidth = Math.round(transcribeRect.width);
    const totalHeight = STAFF_TRANSCRIPTION_HEIGHT + aboveStaffBudget;
    this.transcribeContainer.style.top =
      aboveStaffBudget > 0 ? `-${aboveStaffBudget}px` : '0px';
    this.transcribeContainer.style.height = `${totalHeight}px`;
    this.transcribeContainer.setAttribute(
      'viewBox',
      `0 -${aboveStaffBudget} ${containerWidth} ${totalHeight}`
    );

    this.#noteXPositions.clear();

    // Configure beams container to cover the notes area
    this.#beamsContainer.setAttribute('x', `${this.#describeEndX}`);
    this.#beamsContainer.setAttribute('width', `${remainingWidth}`);
    this.#beamsContainer.setAttribute(
      'viewBox',
      `0 0 ${remainingWidth} ${STAFF_TRANSCRIPTION_HEIGHT}`
    );
    this.#beamsContainer.setAttribute(
      'height',
      `${STAFF_TRANSCRIPTION_HEIGHT}`
    );

    const [beatsInMeasure, beatType] = this.#effectiveTimeSig;
    const measureDuration = beatsInMeasure / beatType;

    const scaledNoteCount = computeTupletScaledNoteCount(
      this.#currentElements,
      this.#tupletsByIndex
    );
    const proportionalWidth = remainingWidth - scaledNoteCount * MIN_NOTE_WIDTH;

    let beatOffset = 0;
    let minWidthAccumulator = 0;
    let previousRightEdge = this.#describeEndX;
    for (let i = 0; i < this.#currentElements.length; i++) {
      const element = this.#currentElements[i];
      const duration = element.duration as DurationType;
      const xOffsetInNotesSpace =
        minWidthAccumulator +
        (beatOffset / measureDuration) * proportionalWidth;

      // Position the light DOM element via inline styles
      let xInWrapper = this.#describeEndX + xOffsetInNotesSpace;

      // Compute this element's total accidental footprint (leftward width)
      let accidentalWidth = 0;
      if (element.nodeName === MUSIC_NOTE_NODE) {
        const noteElement = element as NoteElementType;
        if (noteElement.showAccidental) {
          accidentalWidth =
            ACCIDENTAL_SYMBOL_WIDTH[noteElement.showAccidental] +
            ACCIDENTAL_NOTE_GAP;
        }
      } else if (element.nodeName === MUSIC_CHORD_NODE) {
        const chordElement = element as ChordElementType;
        if (
          chordElement.staffYCoordinates &&
          chordElement.noteAccidentals.some((a) => a != null)
        ) {
          accidentalWidth = totalChordAccidentalWidth(
            chordElement.noteAccidentals,
            chordElement.staffYCoordinates
          );
        }
      }

      // Barline constraint: accidental must not cross into the describe area
      if (accidentalWidth > 0) {
        xInWrapper = Math.max(
          xInWrapper,
          this.#describeEndX + NOTES_AREA_LEFT_MARGIN + accidentalWidth
        );
      }

      xInWrapper = computeInterNoteSpacing(
        xInWrapper,
        accidentalWidth,
        previousRightEdge
      );

      // Notify beam renderer of final position after any accidental shift, so beam
      // endpoints stay in sync with the DOM positions of the chord elements.
      const xInBeamsContainer = xInWrapper - this.#describeEndX;
      this.#beamRenderer?.setX(i, xInBeamsContainer);
      this.#noteXPositions.set(i, xInBeamsContainer);
      element.style.position = 'absolute';
      element.style.left = `${xInWrapper}px`;
      previousRightEdge = xInWrapper + NOTE_SVG_WIDTH;

      if (element.nodeName === MUSIC_REST_NODE) {
        element.style.top = `${restToYCoordinate(element.duration)}px`;
      } else if (element.nodeName === MUSIC_NOTE_NODE) {
        const noteElement = element as NoteElementType;
        const yHeadOffset = computeYHeadOffset(
          noteElement.stemUp,
          duration,
          noteElement.noFlags
        );
        const noteY =
          STAFF_Y_PADDING +
          this.noteToYCoordinate(
            noteElement.note,
            noteElement.octave ?? undefined
          ) -
          yHeadOffset;
        element.style.top = `${noteY}px`;
      } else {
        // Chord y-positioning is handled internally by the chord's own SVG rendering
        element.style.top = '0px';
      }

      const tupletAncestorsForElement = this.#tupletsByIndex.get(i);
      const innermostTupletForElement =
        tupletAncestorsForElement !== undefined
          ? tupletAncestorsForElement[tupletAncestorsForElement.length - 1]
          : undefined;
      if (innermostTupletForElement !== undefined) {
        const { actual, normal } = parseTupletRatio(
          innermostTupletForElement.ratio
        );
        beatOffset += durationToFactor[duration] * (normal / actual);
        minWidthAccumulator += MIN_NOTE_WIDTH * (normal / actual);
      } else {
        beatOffset += durationToFactor[duration];
        minWidthAccumulator += MIN_NOTE_WIDTH;
      }
    }
    this.#beamRenderer?.spaceAll();

    // Size the tuplet container to match the notes area (same as beams container)
    this.#tupletContainer.setAttribute('x', `${this.#describeEndX}`);
    this.#tupletContainer.setAttribute('width', `${remainingWidth}`);
    this.#tupletContainer.setAttribute(
      'viewBox',
      `0 0 ${remainingWidth} ${STAFF_TRANSCRIPTION_HEIGHT}`
    );
    this.#tupletContainer.setAttribute(
      'height',
      `${STAFF_TRANSCRIPTION_HEIGHT}`
    );

    // Two-pass tuplet bracket rendering. Note positions are now set so x/y lookups work.

    // Pass 1: inner groups (nestingLevel > 0) — beam-referenced numeral placement.
    const innerGeometriesByGroup = new Map<
      TupletGroup,
      TupletBracketGeometry
    >();
    for (const group of this.#tupletGroups) {
      if (group.nestingLevel === 0) {
        continue;
      }
      const hasInnerGroups = this.#tupletGroups.some(
        (other) =>
          other.nestingLevel > group.nestingLevel &&
          other.indices.every((i) => group.indices.includes(i))
      );
      const geometry = computeTupletBracketGeometry(
        group,
        this.#currentElements,
        this.#noteXPositions,
        this.#stemDirections,
        this.#beamedIndicesSnapshot,
        this.#noteStaffYCoordsSnapshot,
        this.#chordStaffYCoordsSnapshot,
        null,
        hasInnerGroups
      );
      if (geometry !== null) {
        innerGeometriesByGroup.set(group, geometry);
      }
    }

    // Pass 2: outer groups (nestingLevel=0) — baseY derived from actual inner numeralYs.
    const allGeometries: TupletBracketGeometry[] = [
      ...innerGeometriesByGroup.values(),
    ];
    for (const group of this.#tupletGroups) {
      if (group.nestingLevel !== 0) {
        continue;
      }
      const outerIndexSet = new Set(group.indices);
      const innerNumeralYs = [...innerGeometriesByGroup.entries()]
        .filter(([innerGroup]) =>
          innerGroup.indices.every((i) => outerIndexSet.has(i))
        )
        .map(([, geom]) => geom.numeralY);

      const upVotes = group.indices.filter(
        (i) => this.#stemDirections[i] === true
      ).length;
      const stemUp = upVotes >= group.indices.length / 2;
      const outerBaseY =
        innerNumeralYs.length > 0
          ? computeOuterBracketBaseY(innerNumeralYs, stemUp)
          : null;

      const hasInnerGroups = innerNumeralYs.length > 0;
      const geometry = computeTupletBracketGeometry(
        group,
        this.#currentElements,
        this.#noteXPositions,
        this.#stemDirections,
        this.#beamedIndicesSnapshot,
        this.#noteStaffYCoordsSnapshot,
        this.#chordStaffYCoordsSnapshot,
        outerBaseY,
        hasInnerGroups
      );
      if (geometry !== null) {
        allGeometries.push(geometry);
      }
    }

    this.#tupletContainer.innerHTML = '';
    for (const geometry of allGeometries) {
      this.#tupletContainer.appendChild(createTupletBracketSvg(geometry));
    }

    this.#dynamicsContainer.setAttribute('x', `${this.#describeEndX}`);
    this.#dynamicsContainer.setAttribute('width', `${remainingWidth}`);
    this.#dynamicsContainer.setAttribute(
      'viewBox',
      `0 0 ${remainingWidth} ${STAFF_TRANSCRIPTION_HEIGHT}`
    );
    this.#dynamicsContainer.setAttribute(
      'height',
      `${STAFF_TRANSCRIPTION_HEIGHT}`
    );
    this.#dynamicsContainer.innerHTML = '';
    this.#renderDynamics();
  }

  #renderDynamics(): void {
    for (let i = 0; i < this.#currentElements.length; i++) {
      const element = this.#currentElements[i];
      if (element.nodeName === MUSIC_REST_NODE) {
        continue;
      }
      const noteOrChord = element as unknown as INoteElement | IChordElement;
      const marking = getNoteDynamic(noteOrChord);
      if (marking !== null) {
        const noteX = this.#noteXPositions.get(i) ?? 0;
        const centerX = noteX + NOTE_SVG_WIDTH / 2;
        this.#dynamicsContainer.appendChild(
          createDynamicMarkingSvg(marking, centerX, DYNAMICS_BASELINE_Y)
        );
      }
    }

    const pairs = pairHairpins(this.#currentElements, this.#noteXPositions);
    for (const pair of pairs) {
      if (pair.errors.length > 0) {
        console.warn(pair.errors);
      }
      this.#dynamicsContainer.appendChild(
        createHairpinSvg(
          pair.kind,
          pair.startX,
          pair.endX,
          DYNAMICS_BASELINE_Y,
          HAIRPIN_OPEN_HEIGHT
        )
      );
    }
  }

  // Conservative above-staff budget estimate using staff-referenced positions.
  // Used before note x-positions are set; the actual rendering uses real geometry.
  #estimateAboveStaffBudget(): number {
    const hasStemUpTuplet = this.#tupletGroups.some((group) => {
      const upVotes = group.indices.filter(
        (i) => this.#stemDirections[i] === true
      ).length;
      return upVotes >= group.indices.length / 2;
    });
    if (!hasStemUpTuplet) {
      return 0;
    }
    const topY =
      STAFF_TOP_LINE_Y -
      STAFF_Y_PADDING -
      TUPLET_STAFF_CLEARANCE_PX -
      TUPLET_HOOK_LENGTH_PX -
      TUPLET_NUMERAL_FONT_SIZE;
    return topY < 0 ? Math.ceil(-topY) + 2 : 0;
  }

  // Respace notes on resize
  onStaffResize() {
    if (this.#currentElements.length > 0) {
      this.#spaceElements();
      this.dispatchEvent(
        new CustomEvent(STAFF_EVENTS.NOTES_POSITIONED, {
          bubbles: true,
          composed: true,
        })
      );
      this.drawConnectorsWhenStandalone();
    }
  }
}
