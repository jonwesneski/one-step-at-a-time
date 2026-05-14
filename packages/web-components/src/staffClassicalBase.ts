import { computeNoteAccidentals } from './rules/accidentalRules';
import { buildBeamsRenderer } from './rules/beamRules';
import { calculateStaffMinWidth } from './rules/staffWidth';
import { StaffElementBase } from './staffBase';
import {
  ChordElementType,
  LetterOctave,
  NoteElementType,
  NoteOrChordElementType,
  YCoordinates,
} from './types/elements';
import {
  BeatsInMeasure,
  BeatTypeInMeasure,
  DurationType,
  Letter,
  LetterNote,
  Mode,
  Octave,
} from './types/theory';
import {
  BeamsBuilder,
  computeYHeadOffset,
  createFlatSvg,
  createSharpSvg,
  createTimeSignatureSvg,
  totalChordAccidentalWidth,
} from './utils';
import {
  COMMON_ATTRIBUTES,
  MUSIC_CHORD_NODE,
  MUSIC_COMPOSITION,
  MUSIC_MEASURE,
  MUSIC_NOTE,
  MUSIC_NOTE_NODE,
  NOTE_EVENTS,
  STAFF_EVENTS,
  SVG_NS,
} from './utils/consts';
import {
  CLEF_X_OFFSET,
  KEY_SIG_FLAT_WIDTH,
  KEY_SIG_FLAT_Y_OFFSET,
  KEY_SIG_SHARP_WIDTH,
  MIN_NOTE_WIDTH,
  STAFF_TRANSCRIPTION_HEIGHT,
  STAFF_Y_PADDING,
  TIME_SIG_Y_TRANSLATE,
} from './utils/notationDimensions';
import { ACCIDENTAL_SYMBOL_WIDTH } from './utils/svgCreator/note';
import { NoteTimingDragHandler } from './utils/noteTimingDragHandler';
import { PitchDragHandler } from './utils/pitchDragHandler';
import { durationToFactor, factorToDuration } from './utils/theoryConsts';

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
  #effectiveKeySig: LetterNote;
  #describeContainer: SVGGElement;
  #beamsContainer: SVGSVGElement;
  #beamRenderer: ReturnType<BeamsBuilder['buildRenderer']> | null = null;
  #currentElements: NoteOrChordElementType[] = [];
  #noteTimingDragHandler: NoteTimingDragHandler | null = null;
  #notePitchDragHandler: PitchDragHandler | null = null;
  #boundPointerDown: ((e: PointerEvent) => void) | null = null;
  #describeEndX = 0;
  #showDescribe = true;
  #boundDrawConnectors = () => this.drawConnectorsWhenStandalone();

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
    ) as LetterNote;

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
      this.#resolveInheritedValue('time', '4/4')
    );
    this.#effectiveMode = this.#resolveInheritedValue('mode', 'major') as Mode;
    this.#effectiveKeySig = this.#resolveInheritedValue(
      'keysig',
      'C'
    ) as LetterNote;

    this.#buildDescribe(this.clefSvg);
    if (this.editable) {
      this.#enableDrag();
    }
    this.addEventListener(
      NOTE_EVENTS.CONNECTOR_ATTRIBUTE_CHANGE,
      this.#boundDrawConnectors
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
    newNote: LetterOctave,
    chordNoteIndex: number | null
  ) {
    const element = this.#currentElements[elementIndex];
    if (!element) {
      return;
    }

    const letter = newNote[0] as Letter;
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
      this.#resolveInheritedValue('time', '4/4')
    );
    this.#effectiveMode = this.#resolveInheritedValue('mode', 'major') as Mode;
    this.#effectiveKeySig = this.#resolveInheritedValue(
      'keysig',
      'C'
    ) as LetterNote;
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
        ) as LetterNote;
      }
      this.#refreshDescribe();
    }
  }

  protected onHandleSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    const assignedElements = slot
      .assignedElements({ flatten: true })
      .filter(
        (e) => e.nodeName === MUSIC_NOTE_NODE || e.nodeName === MUSIC_CHORD_NODE
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

    const [beatsInMeasure, beatType] = this.#effectiveTimeSig;
    // Measure duration as a fraction of a whole note (e.g. 4/4 = 1.0, 3/4 = 0.75, 6/8 = 0.75)
    const measureDuration = beatsInMeasure / beatType;

    const { beamsBuilder, beamRenderer, stemDirections } = buildBeamsRenderer(
      elements,
      this.#effectiveTimeSig,
      (note, octave) => this.noteToYCoordinate(note, octave)
    );
    this.#beamRenderer = beamRenderer;

    const { noteShowAccidentals, chordNoteAccidentals } =
      computeNoteAccidentals(
        elements,
        this.#effectiveKeySig,
        this.#effectiveMode
      );

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

      if (element.nodeName === MUSIC_NOTE_NODE) {
        const noteElement = element as NoteElementType;
        noteElement.batchUpdate(() => {
          noteElement.stemUp = stemUp;
          noteElement.stemExtension = extension;
          noteElement.noFlags = isBeamed;
          noteElement.showAccidental = noteShowAccidentals.get(noteElement);
        });
      } else {
        const chordElement = element as ChordElementType;
        const staffYCoordinates = chordElement.notes.map((note) =>
          this.noteToYCoordinate(note.value, note.octave ?? undefined)
        );
        const accidentals = chordNoteAccidentals.get(chordElement) ?? [];
        chordElement.batchUpdate(() => {
          chordElement.stemUp = stemUp;
          chordElement.stemExtension = extension;
          chordElement.noFlags = isBeamed;
          chordElement.staffYCoordinates = staffYCoordinates;
          chordElement.noteAccidentals = accidentals;
        });
      }

      beatOffset += durationToFactor[duration as DurationType];
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
          firstNoteAccidentalWidth = ACCIDENTAL_SYMBOL_WIDTH[accidental] + 2;
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
        elements.length,
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

  // Return the y-coordinate for a given note and octave.
  // Accidentals are ignored for vertical placement — C# and C natural occupy
  // the same staff line/space.
  public noteToYCoordinate(
    note: LetterNote | Letter | 'rest',
    octave?: Octave
  ): number {
    if (!note) {
      return 0;
    }

    // Strip accidentals: take the first character (always the letter A-G).
    const letter = note[0].toUpperCase();

    if (octave !== undefined) {
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
    this.#describeEndX = Math.round(describeRect.right - transcribeRect.left);
    const remainingWidth = transcribeRect.width - this.#describeEndX;

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

    const proportionalWidth =
      remainingWidth - this.#currentElements.length * MIN_NOTE_WIDTH;

    let beatOffset = 0;
    for (let i = 0; i < this.#currentElements.length; i++) {
      const element = this.#currentElements[i];
      const duration = element.duration as DurationType;
      const xOffsetInNotesSpace =
        i * MIN_NOTE_WIDTH + (beatOffset / measureDuration) * proportionalWidth;

      // Position the light DOM element via inline styles
      let xInWrapper = this.#describeEndX + xOffsetInNotesSpace;

      // Barline constraint: shift note/chord right so accidentals don't cross into the describe area
      if (element.nodeName === MUSIC_NOTE_NODE) {
        const noteEl = element as NoteElementType;
        const accidental = noteEl.showAccidental;
        if (accidental) {
          const accidentalWidth = ACCIDENTAL_SYMBOL_WIDTH[accidental] + 2;
          xInWrapper = Math.max(
            xInWrapper,
            this.#describeEndX + accidentalWidth
          );
        }
      }
      if (element.nodeName === MUSIC_CHORD_NODE) {
        const chordEl = element as ChordElementType;
        if (
          chordEl.staffYCoordinates &&
          chordEl.noteAccidentals.some((a) => a != null)
        ) {
          const totalWidth = totalChordAccidentalWidth(
            chordEl.noteAccidentals,
            chordEl.staffYCoordinates
          );
          if (totalWidth > 0) {
            xInWrapper = Math.max(
              xInWrapper,
              this.#describeEndX + 2 + totalWidth
            );
          }
        }
      }
      // TODO: accidentals on notes/chords after the first can still overlap the
      // previous element's notehead. Fixing this requires comparing each element's
      // accidental left-edge against the previous element's right-edge and nudging
      // accordingly — a follow-up inter-note spacing pass.

      // Notify beam renderer of final position after any accidental shift, so beam
      // endpoints stay in sync with the DOM positions of the chord elements.
      this.#beamRenderer?.setX(i, xInWrapper - this.#describeEndX);
      element.style.left = `${xInWrapper}px`;

      if (element.nodeName === MUSIC_NOTE_NODE) {
        const noteEl = element as NoteElementType;
        const yHeadOffset = computeYHeadOffset(
          noteEl.stemUp,
          duration,
          noteEl.noFlags
        );
        const noteY =
          STAFF_Y_PADDING +
          this.noteToYCoordinate(noteEl.note, noteEl.octave ?? undefined) -
          yHeadOffset;
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
