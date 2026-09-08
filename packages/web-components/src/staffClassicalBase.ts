import {
  computeInterNoteSpacing,
  computeNoteAccidentals,
  totalChordAccidentalWidth,
} from './rules/accidentalRules';
import { computeArpeggioFootprintWidth } from './rules/arpeggioRules';
import { buildBeamsRenderer } from './rules/beamRules';
import { computeAdjacentDisplacements } from './rules/chordRules';
import { getClefRenderData } from './rules/clefRules';
import { pairHairpins } from './rules/dynamicsRules';
import {
  computeFirstGraceHeadX,
  computeGraceFootprintWidth,
} from './rules/graceRules';
import { computeAllowedElementCount } from './rules/measureRules';
import { restToYCoordinate } from './rules/restRules';
import { computeSpacingWeights, distributeSlack } from './rules/spacingRules';
import {
  calculateStaffMinWidth,
  calculateStaffNaturalWidth,
} from './rules/staffWidth';
import {
  buildTupletGroups,
  computeOuterBracketBaseY,
  computeTupletBracketGeometry,
  computeTupletScaleByIndex,
  computeTupletScaledNoteCount,
  TupletBracketGeometry,
  TupletGroup,
} from './rules/tupletRules';
import { StaffElementBase } from './staffBase';
import {
  ChordElementType,
  ChordNote,
  ClefMarkerPlacement,
  IChordElement,
  INoteElement,
  NoteChordOrRestElementType,
  NoteElementType,
  NoteLetterOctave,
  TupletElementType,
  YCoordinates,
} from './types/elements';
import type {
  ClefType,
  DurationType,
  Mode,
  Note,
  Octave,
} from './types/theory';
import {
  BeamsBuilder,
  computeYHeadOffset,
  createDynamicMarkingSvg,
  createFlatSvg,
  createHairpinSvg,
  createSempreArpeggiandoText,
  createSharpSvg,
  createTimeSignatureSvg,
} from './utils';
import {
  CLEF_EVENTS,
  COMMON_ATTRIBUTES,
  isStaffNodeName,
  MUSIC_CHORD_NODE,
  MUSIC_CLEF_NODE,
  MUSIC_COMPOSITION,
  MUSIC_MEASURE,
  MUSIC_NOTE_NODE,
  MUSIC_REST_NODE,
  MUSIC_TUPLET_NODE,
  NOTE_EVENTS,
  STAFF_EVENTS,
  SVG_NS,
} from './utils/consts';
import {
  ARPEGGIO_TEXT_ABOVE_STAFF_PX,
  ARPEGGIO_TEXT_FONT_SIZE,
  CLEF_CHANGE_RESERVED_WIDTH_PX,
  CLEF_X_OFFSET,
  DYNAMICS_BASELINE_Y,
  HAIRPIN_OPEN_HEIGHT,
  KEY_SIG_FLAT_WIDTH,
  KEY_SIG_FLAT_Y_OFFSET,
  KEY_SIG_SHARP_WIDTH,
  LEADING_NOTE_GAP_PX,
  MID_STREAM_CLEF_Y_OFFSET,
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
import { flattenSlotElements } from './utils/slotElements';
import {
  ACCIDENTAL_NOTE_GAP,
  ACCIDENTAL_SYMBOL_WIDTH,
  NOTE_SVG_WIDTH,
} from './utils/svgCreator/note';
import { createTupletBracketSvg } from './utils/svgCreator/tuplet';

// The arpeggio sign a note/chord actually draws — its own `arpeggio` if set,
// otherwise a `sempre arpeggiando` passage's implied one.
function effectiveArpeggio(element: NoteElementType | ChordElementType) {
  return element.arpeggio ?? element.impliedArpeggio;
}

// The arpeggio variant that determines this element's reserved leftward
// footprint: its own sign, an implied `sempre arpeggiando` sign, or — for the
// lower end of a cross-staff span carrying only `arpeggio-for` — the wave the
// ancestor measure draws for the span. Every wave variant reserves the same
// width, so the exact value past non-null does not matter here.
function footprintArpeggio(element: NoteElementType | ChordElementType) {
  return (
    effectiveArpeggio(element) ?? (element.arpeggioFor !== null ? 'up' : null)
  );
}

// A stem-down chord's adjacent second shifts its head left by
// ADJACENT_NOTE_X_DISPLACEMENT_PX, past the notehead inset the arpeggio
// footprint constants assume — reserve that delta when the chord shows a sign.
function chordLeftHeadDisplacementPx(chord: ChordElementType): number {
  const coords = chord.staffYCoordinates;
  if (coords === null || coords.length < 2) {
    return 0;
  }
  return Math.max(
    0,
    ...computeAdjacentDisplacements(coords, chord.stemUp).map(
      (displacement) => -displacement.xOffset
    )
  );
}

// Whether a note/chord currently shows an accidental — the arpeggio sign sits
// left of the accidental column, so its reserved footprint depends on this.
function elementHasShownAccidental(
  element: NoteElementType | ChordElementType
): boolean {
  if (element.nodeName === MUSIC_NOTE_NODE) {
    return (element as NoteElementType).showAccidental != null;
  }
  const chord = element as ChordElementType;
  return (
    !!chord.staffYCoordinates && chord.noteAccidentals.some((a) => a != null)
  );
}

export abstract class StaffClassicalElementBase extends StaffElementBase {
  static get observedAttributes(): string[] {
    // All attributes need to be all lower case because jsdom lowers then
    // in it's life-cycle
    return [
      COMMON_ATTRIBUTES.KEY_SIG,
      COMMON_ATTRIBUTES.MODE,
      COMMON_ATTRIBUTES.TIME,
      'group',
      'group-id',
    ];
  }

  #mutationObservers: MutationObserver[];
  #effectiveMode: Mode;
  #effectiveKeySig: Note;
  #describeContainer: SVGGElement;
  #beamsContainer: SVGSVGElement;
  #tupletContainer: SVGSVGElement = document.createElementNS(SVG_NS, 'svg');
  #dynamicsContainer: SVGSVGElement = document.createElementNS(SVG_NS, 'svg');
  #beamRenderer: ReturnType<BeamsBuilder['buildRenderer']> | null = null;
  #currentElements: NoteChordOrRestElementType[] = [];
  #describeEndX = 0;
  #currentSpacingSlackWeight = 0;
  #showDescribe = true;
  #clefChangeAtBoundary = false;
  #timeChangeAtBoundary = false;
  #tupletGroups: TupletGroup[] = [];
  #tupletsByIndex: Map<number, TupletElementType[]> = new Map();
  #clefMarkers: ClefMarkerPlacement[] = [];
  #noteXPositions: Map<number, number> = new Map();
  // X (beams-container space) of the first grace note's head, for elements
  // that have both a grace group and a grace-dynamic. Populated alongside
  // #noteXPositions during #spaceElements(), since only that pass has the
  // leftward-overhang math (main accidental + grace footprint) in scope.
  #firstGraceHeadXPositions: Map<number, number> = new Map();
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
  #boundClefMarkerChange = () => {
    if (this.#currentElements.length > 0) {
      this.#renderNotes(this.#currentElements);
    }
  };

  protected get describeEndX(): number {
    return this.#describeEndX;
  }

  /**
   * Σ of the current entries' logarithmic spacing slack weights, set on every
   * #spaceElements() pass. StaffVocalElement reads it to compute its natural
   * width after re-scoring against lyric widths.
   */
  protected get currentSpacingSlackWeight(): number {
    return this.#currentSpacingSlackWeight;
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

  // Set by composition.ts when this staff starts a new visual row and its
  // effectiveStartClef differs from the previous row's matching staff's
  // effectiveEndClef — keeps the clef glyph visible (but not key/time
  // signature) even though showDescribe is false for non-first-in-row staves.
  get clefChangeAtBoundary(): boolean {
    return this.#clefChangeAtBoundary;
  }

  set clefChangeAtBoundary(value: boolean) {
    if (this.#clefChangeAtBoundary === value) {
      return;
    }
    this.#clefChangeAtBoundary = value;
    this.#refreshDescribe();
  }

  // Set by composition.ts when this staff's resolved time signature differs
  // from the previous measure's — keeps the time signature glyph visible even
  // though this isn't the first measure in the composition.
  get timeChangeAtBoundary(): boolean {
    return this.#timeChangeAtBoundary;
  }

  set timeChangeAtBoundary(value: boolean) {
    if (this.#timeChangeAtBoundary === value) {
      return;
    }
    this.#timeChangeAtBoundary = value;
    this.#refreshDescribe();
  }

  constructor() {
    super();
    this.#mutationObservers = [];

    this.#effectiveMode = this.resolveInheritedValue(
      COMMON_ATTRIBUTES.MODE,
      'major'
    ) as Mode;
    this.#effectiveKeySig = this.resolveInheritedValue(
      COMMON_ATTRIBUTES.KEY_SIG,
      'C'
    ) as Note;

    this.#describeContainer = document.createElementNS(SVG_NS, 'g');
    this.#beamsContainer = document.createElementNS(SVG_NS, 'svg');
  }

  get staffLineCount(): number {
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
    `;
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

  abstract get yCoordinates(): YCoordinates;

  abstract get octaves(): Octave[];

  public abstract getKeyYCoordinates(): {
    useSharps: boolean;
    coordinates: number[];
  };

  protected abstract get clefSvg(): string;

  protected onConnectedCallback() {
    // Re-resolve inherited attrs now that ancestors are reachable via closest()
    this.effectiveTimeSig = this.convertTotimeInts(
      this.resolveInheritedValue(COMMON_ATTRIBUTES.TIME, '4/4')
    );
    this.#effectiveMode = this.resolveInheritedValue(
      COMMON_ATTRIBUTES.MODE,
      'major'
    ) as Mode;
    this.#effectiveKeySig = this.resolveInheritedValue(
      COMMON_ATTRIBUTES.KEY_SIG,
      'C'
    ) as Note;

    this.#buildDescribe(this.clefSvg);
    this.addEventListener(
      NOTE_EVENTS.CONNECTOR_ATTRIBUTE_CHANGE,
      this.#boundDrawConnectors
    );
    this.addEventListener(NOTE_EVENTS.NOTE_Y_CHANGE, this.#boundNoteYChange);
    this.addEventListener(
      NOTE_EVENTS.DYNAMIC_ATTRIBUTE_CHANGE,
      this.#boundRenderDynamics
    );
    this.addEventListener(
      CLEF_EVENTS.ATTRIBUTE_CHANGE,
      this.#boundClefMarkerChange
    );
  }

  // Describe is: clef, key signature, time signature, and beams overlay
  #buildDescribe(clefSvgStr: string) {
    this.#describeContainer.classList.add('describe-container');
    this.#describeContainer.innerHTML =
      this.#showDescribe || this.#clefChangeAtBoundary ? clefSvgStr : '';
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
    this.#describeContainer.innerHTML =
      this.#showDescribe || this.#clefChangeAtBoundary ? this.clefSvg : '';
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
    this.effectiveTimeSig = this.convertTotimeInts(
      this.resolveInheritedValue(COMMON_ATTRIBUTES.TIME, '4/4')
    );
    this.#effectiveMode = this.resolveInheritedValue(
      COMMON_ATTRIBUTES.MODE,
      'major'
    ) as Mode;
    this.#effectiveKeySig = this.resolveInheritedValue(
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
    const composition = this.closest(MUSIC_COMPOSITION);
    // "First measure" from live DOM position, not the `number` attribute — the
    // composition writes `number` from a MutationObserver microtask, so a staff
    // mounted with a freshly-inserted first measure (a framework re-mounting the
    // measure hierarchy) would otherwise miss its own time signature and never
    // recover. `number` is kept as the fallback for a standalone `<music-measure>`
    // with no composition ancestor.
    const isFirstMeasure =
      measure != null &&
      (composition != null
        ? composition.querySelector(MUSIC_MEASURE) === measure
        : measure.getAttribute('number') === '1');

    if (isFirstMeasure || measure == null || this.#timeChangeAtBoundary) {
      const timeSigSvg = createTimeSignatureSvg(...this.effectiveTimeSig);
      timeSigSvg.setAttribute(
        'transform',
        `translate(${xOffset}, ${TIME_SIG_Y_TRANSLATE})`
      );
      parentSvg.appendChild(timeSigSvg);
    }
  }

  protected override onDisconnectedCallback(): void {
    this.removeEventListener(
      NOTE_EVENTS.CONNECTOR_ATTRIBUTE_CHANGE,
      this.#boundDrawConnectors
    );
    this.removeEventListener(NOTE_EVENTS.NOTE_Y_CHANGE, this.#boundNoteYChange);
    this.removeEventListener(
      NOTE_EVENTS.DYNAMIC_ATTRIBUTE_CHANGE,
      this.#boundRenderDynamics
    );
    this.removeEventListener(
      CLEF_EVENTS.ATTRIBUTE_CHANGE,
      this.#boundClefMarkerChange
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

    if (name === 'group' || name === 'group-id') {
      this.dispatchGroupAttributeChange();
      return;
    }

    if (name === COMMON_ATTRIBUTES.TIME) {
      this.effectiveTimeSig = this.convertTotimeInts(
        this.resolveInheritedValue(COMMON_ATTRIBUTES.TIME, '4/4')
      );
    } else if (name === COMMON_ATTRIBUTES.MODE) {
      this.#effectiveMode = this.resolveInheritedValue(
        COMMON_ATTRIBUTES.MODE,
        'major'
      ) as Mode;
    } else if (name === COMMON_ATTRIBUTES.KEY_SIG) {
      this.#effectiveKeySig = this.resolveInheritedValue(
        COMMON_ATTRIBUTES.KEY_SIG,
        'C'
      ) as Note;
    }
    this.#refreshDescribe();
  }

  protected onHandleSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    const assignedElements = slot.assignedElements();
    this.upgradeAssignedElements(assignedElements);
    const assigned = assignedElements.filter(
      (e) =>
        e.nodeName === MUSIC_NOTE_NODE ||
        e.nodeName === MUSIC_CHORD_NODE ||
        e.nodeName === MUSIC_REST_NODE ||
        e.nodeName === MUSIC_TUPLET_NODE ||
        e.nodeName === MUSIC_CLEF_NODE
    );

    const { flatElements, tupletsByIndex, clefMarkers } =
      flattenSlotElements(assigned);
    this.#tupletsByIndex = tupletsByIndex;
    this.#clefMarkers = clefMarkers;
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
    // Clear previously rendered beams, tuplet brackets, and dynamics
    this.#beamsContainer.innerHTML = '';
    this.#tupletContainer.innerHTML = '';
    this.#dynamicsContainer.innerHTML = '';

    const { allowedElementCount, error } = computeAllowedElementCount(
      elements,
      this.effectiveTimeSig,
      this.#tupletsByIndex
    );
    if (error !== null) {
      console.warn(error);
    }
    for (let i = 0; i < elements.length; i++) {
      elements[i].style.display = i < allowedElementCount ? '' : 'none';
    }
    elements = elements.slice(0, allowedElementCount);

    // Clef markers anchored to a note/chord/rest that got truncated above
    // dangle — drop and hide them rather than positioning against an index
    // that no longer exists in the rendered elements array.
    const survivingClefMarkers: ClefMarkerPlacement[] = [];
    for (const marker of this.#clefMarkers) {
      if (marker.afterElementIndex < allowedElementCount) {
        survivingClefMarkers.push(marker);
      } else {
        marker.element.style.display = 'none';
      }
    }
    this.#clefMarkers = survivingClefMarkers;

    const noteStaffYCoords = new Map<NoteElementType, number>();
    const chordStaffYCoords = new Map<ChordElementType, number[]>();
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (element.nodeName === MUSIC_NOTE_NODE) {
        const noteElement = element as NoteElementType;
        noteStaffYCoords.set(
          noteElement,
          this.noteToYCoordinate(
            noteElement.note,
            noteElement.octave ?? undefined,
            i
          )
        );
      } else if (element.nodeName === MUSIC_CHORD_NODE) {
        const chordElement = element as ChordElementType;
        chordStaffYCoords.set(
          chordElement,
          this.#resolveChordStaffYCoordinates(chordElement.notes, i)
        );
      }
    }

    const { beamsBuilder, beamRenderer, stemDirections } = buildBeamsRenderer(
      elements,
      this.effectiveTimeSig,
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

    const { noteShowAccidentals, chordNoteAccidentals, graceShowAccidentals } =
      computeNoteAccidentals(
        elements,
        this.#effectiveKeySig,
        this.#effectiveMode
      );

    // Set rendering properties on each element
    // (triggers their self-render via requestAnimationFrame)
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
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
          noteElement.resolvedGraceAccidentals =
            graceShowAccidentals.get(noteElement) ?? null;
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
          chordElement.resolvedGraceAccidentals =
            graceShowAccidentals.get(chordElement) ?? null;
        });
      }
    }

    const previousElements = this.#currentElements;
    this.#currentElements = elements;
    this.#resolveArpeggiandoPassages(elements, previousElements);
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
      let firstElementLeftwardWidth = 0;
      if (firstElement.nodeName === MUSIC_NOTE_NODE) {
        const noteElement = firstElement as NoteElementType;
        if (noteElement.showAccidental) {
          firstElementLeftwardWidth =
            ACCIDENTAL_SYMBOL_WIDTH[noteElement.showAccidental] +
            ACCIDENTAL_NOTE_GAP;
        }
        firstElementLeftwardWidth += computeGraceFootprintWidth(
          noteElement.grace,
          noteElement.resolvedGraceAccidentals
        );
        firstElementLeftwardWidth += computeArpeggioFootprintWidth(
          footprintArpeggio(noteElement),
          elementHasShownAccidental(noteElement)
        );
      } else if (firstElement.nodeName === MUSIC_CHORD_NODE) {
        const chordElement = firstElement as ChordElementType;
        if (
          chordElement.staffYCoordinates &&
          chordElement.noteAccidentals.some((a) => a != null)
        ) {
          firstElementLeftwardWidth = totalChordAccidentalWidth(
            chordElement.noteAccidentals,
            chordElement.staffYCoordinates
          );
        }
        firstElementLeftwardWidth += computeGraceFootprintWidth(
          chordElement.grace,
          chordElement.resolvedGraceAccidentals
        );
        firstElementLeftwardWidth += computeArpeggioFootprintWidth(
          footprintArpeggio(chordElement),
          elementHasShownAccidental(chordElement)
        );
        if (footprintArpeggio(chordElement) !== null) {
          firstElementLeftwardWidth +=
            chordLeftHeadDisplacementPx(chordElement);
        }
      }
      // Grace overhangs of the remaining elements also consume horizontal
      // room beyond the per-note minimum spacing.
      let extraLeftwardWidth = 0;
      for (let i = 1; i < elements.length; i++) {
        const element = elements[i];
        if (
          element.nodeName === MUSIC_NOTE_NODE ||
          element.nodeName === MUSIC_CHORD_NODE
        ) {
          const noteOrChordElement = element as
            | NoteElementType
            | ChordElementType;
          extraLeftwardWidth += computeGraceFootprintWidth(
            noteOrChordElement.grace,
            noteOrChordElement.resolvedGraceAccidentals
          );
          extraLeftwardWidth += computeArpeggioFootprintWidth(
            footprintArpeggio(noteOrChordElement),
            elementHasShownAccidental(noteOrChordElement)
          );
          if (
            element.nodeName === MUSIC_CHORD_NODE &&
            footprintArpeggio(noteOrChordElement) !== null
          ) {
            extraLeftwardWidth += chordLeftHeadDisplacementPx(
              noteOrChordElement as ChordElementType
            );
          }
        }
      }
      const minWidth = calculateStaffMinWidth(
        this.#describeEndX,
        computeTupletScaledNoteCount(elements, this.#tupletsByIndex),
        firstElementLeftwardWidth,
        extraLeftwardWidth,
        this.#clefMarkers.length * CLEF_CHANGE_RESERVED_WIDTH_PX
      );
      const { totalWeight } = computeSpacingWeights(
        elements,
        computeTupletScaleByIndex(elements, this.#tupletsByIndex)
      );
      const naturalWidth = calculateStaffNaturalWidth(minWidth, totalWeight);
      this.dispatchEvent(
        new CustomEvent(STAFF_EVENTS.STAFF_MIN_WIDTH, {
          bubbles: true,
          composed: false,
          detail: { minWidth, naturalWidth },
        })
      );
    }
  }

  #resolveChordStaffYCoordinates(
    notes: ChordNote[],
    elementIndex: number
  ): number[] {
    const result: number[] = [];
    let previousY = Infinity;
    const { octaves } = this.#renderDataForIndex(elementIndex);

    for (const note of notes) {
      if (note.octave !== null) {
        const y = this.noteToYCoordinate(
          note.value,
          note.octave ?? undefined,
          elementIndex
        );
        result.push(y);
        previousY = y;
      } else {
        // For notes without an explicit octave, find the largest Y (lowest pitch)
        // that is still strictly below the previous note's Y, ensuring ascending
        // pitch (root-position close voicing).
        const candidates: number[] = [];
        for (const octave of octaves) {
          const y = this.noteToYCoordinate(note.value, octave, elementIndex);
          if (y > 0 && y < previousY) {
            candidates.push(y);
          }
        }
        const resolved =
          candidates.length > 0
            ? Math.max(...candidates)
            : this.noteToYCoordinate(note.value, undefined, elementIndex);
        result.push(resolved);
        previousY = resolved;
      }
    }

    return result;
  }

  // Finds the clef marker active at `elementIndex` — the latest marker whose
  // `afterElementIndex` is strictly less than it — or null if segment 0 (the
  // staff's own clef, via the abstract yCoordinates/octaves getters) applies.
  // Always null for staves with no <music-clef> markers (e.g. StaffVocalElement),
  // which is exactly what keeps this mechanism a no-op for them.
  #activeClefAt(elementIndex: number): ClefType | null {
    let active: ClefMarkerPlacement | null = null;
    for (const marker of this.#clefMarkers) {
      if (
        marker.afterElementIndex < elementIndex &&
        (active === null || marker.afterElementIndex > active.afterElementIndex)
      ) {
        active = marker;
      }
    }
    return active ? active.element.clef : null;
  }

  #renderDataForIndex(elementIndex: number): {
    yCoordinates: YCoordinates;
    octaves: Octave[];
  } {
    const clef = this.#activeClefAt(elementIndex);
    if (clef === null) {
      return { yCoordinates: this.yCoordinates, octaves: this.octaves };
    }
    const { yCoordinates, octaves } = getClefRenderData(clef);
    return { yCoordinates, octaves };
  }

  // Subclasses that have a genuine `clef` attribute (StaffElement) override
  // this to `return this.clef`. Staves with no comparable clef concept
  // (StaffVocalElement) leave it null, which makes effectiveStartClef/
  // effectiveEndClef null too — composition.ts's courtesy-clef logic treats
  // null as "not clef-comparable" and skips the pair.
  protected get ownClef(): ClefType | null {
    return null;
  }

  // The clef in effect at the very start of the staff's note stream — the
  // staff's own clef (via `ownClef`), unless a <music-clef> marker sits at
  // afterElementIndex === -1. Backs composition-level courtesy-clef logic.
  public get effectiveStartClef(): ClefType | null {
    return this.#activeClefAt(0) ?? this.ownClef;
  }

  // The clef in effect after the last note/chord/rest — the last marker's
  // clef, or the start clef if there are no markers.
  public get effectiveEndClef(): ClefType | null {
    return this.#activeClefAt(Number.POSITIVE_INFINITY) ?? this.ownClef;
  }

  // Return the y-coordinate for a given note and octave.
  // Accidentals are ignored for vertical placement — C# and C natural occupy
  // the same staff line/space.
  public noteToYCoordinate(
    note: Note,
    octave?: Octave,
    elementIndex?: number
  ): number {
    if (!note) {
      return 0;
    }

    // Strip accidentals: take the first character (always the letter A-G).
    const letter = note[0].toUpperCase();
    const { yCoordinates, octaves } =
      elementIndex !== undefined
        ? this.#renderDataForIndex(elementIndex)
        : { yCoordinates: this.yCoordinates, octaves: this.octaves };

    if (octave !== undefined) {
      const yCoordinate =
        yCoordinates[`${letter}${octave}` as NoteLetterOctave];
      if (yCoordinate !== undefined) {
        return yCoordinate;
      }
    } else {
      for (const n of octaves) {
        const yCoordinate = yCoordinates[`${letter}${n}` as NoteLetterOctave];
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
    this.#firstGraceHeadXPositions.clear();

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

    const tupletScaleByIndex = computeTupletScaleByIndex(
      this.#currentElements,
      this.#tupletsByIndex
    );
    const scaledNoteCount = computeTupletScaledNoteCount(
      this.#currentElements,
      this.#tupletsByIndex
    );
    const { weights, totalWeight } = computeSpacingWeights(
      this.#currentElements,
      tupletScaleByIndex
    );
    this.#currentSpacingSlackWeight = totalWeight;

    // Entries are justified to fill the notes area: every entry keeps a fixed
    // MIN_NOTE_WIDTH strut, and the width left over is shared out by each entry's
    // logarithmic duration weight — including the trailing space after the last
    // entry, so an underfull bar spreads rather than bunching to the left.
    const proportionalWidth =
      remainingWidth -
      LEADING_NOTE_GAP_PX -
      scaledNoteCount * MIN_NOTE_WIDTH -
      this.#clefMarkers.length * CLEF_CHANGE_RESERVED_WIDTH_PX;
    const slackOffsets = distributeSlack(
      weights,
      totalWeight,
      proportionalWidth
    );

    const clefMarkersByAfterIndex = new Map(
      this.#clefMarkers.map((marker) => [marker.afterElementIndex, marker])
    );

    let minWidthAccumulator = 0;
    let previousRightEdge = this.#describeEndX + LEADING_NOTE_GAP_PX;

    // A marker before the first note/chord/rest (afterElementIndex === -1)
    // is positioned here, ahead of the loop, since there's no element index
    // to key off inside it.
    const leadingClefMarker = clefMarkersByAfterIndex.get(-1);
    if (leadingClefMarker) {
      leadingClefMarker.element.style.position = 'absolute';
      leadingClefMarker.element.style.left = `${previousRightEdge}px`;
      leadingClefMarker.element.style.top = `${MID_STREAM_CLEF_Y_OFFSET}px`;
      leadingClefMarker.element.style.display = '';
      previousRightEdge += CLEF_CHANGE_RESERVED_WIDTH_PX;
      minWidthAccumulator += CLEF_CHANGE_RESERVED_WIDTH_PX;
    }

    for (let i = 0; i < this.#currentElements.length; i++) {
      const element = this.#currentElements[i];
      const duration = element.duration as DurationType;
      const xOffsetInNotesSpace =
        LEADING_NOTE_GAP_PX + minWidthAccumulator + slackOffsets[i];

      // Position the light DOM element via inline styles
      let xInWrapper = this.#describeEndX + xOffsetInNotesSpace;

      // Compute this element's total leftward overhang: accidental footprint
      // plus any grace-note group rendered before the note/chord.
      let leftwardWidth = 0;
      if (element.nodeName === MUSIC_NOTE_NODE) {
        const noteElement = element as NoteElementType;
        if (noteElement.showAccidental) {
          leftwardWidth =
            ACCIDENTAL_SYMBOL_WIDTH[noteElement.showAccidental] +
            ACCIDENTAL_NOTE_GAP;
        }
        leftwardWidth += computeGraceFootprintWidth(
          noteElement.grace,
          noteElement.resolvedGraceAccidentals
        );
        leftwardWidth += computeArpeggioFootprintWidth(
          footprintArpeggio(noteElement),
          elementHasShownAccidental(noteElement)
        );
      } else if (element.nodeName === MUSIC_CHORD_NODE) {
        const chordElement = element as ChordElementType;
        if (
          chordElement.staffYCoordinates &&
          chordElement.noteAccidentals.some((a) => a != null)
        ) {
          leftwardWidth = totalChordAccidentalWidth(
            chordElement.noteAccidentals,
            chordElement.staffYCoordinates
          );
        }
        leftwardWidth += computeGraceFootprintWidth(
          chordElement.grace,
          chordElement.resolvedGraceAccidentals
        );
        leftwardWidth += computeArpeggioFootprintWidth(
          footprintArpeggio(chordElement),
          elementHasShownAccidental(chordElement)
        );
        if (footprintArpeggio(chordElement) !== null) {
          leftwardWidth += chordLeftHeadDisplacementPx(chordElement);
        }
      }

      // Barline constraint: the overhang must not cross into the describe area
      if (leftwardWidth > 0) {
        xInWrapper = Math.max(
          xInWrapper,
          this.#describeEndX + NOTES_AREA_LEFT_MARGIN + leftwardWidth
        );
      }

      xInWrapper = computeInterNoteSpacing(
        xInWrapper,
        leftwardWidth,
        previousRightEdge
      );

      // Notify beam renderer of final position after any accidental shift, so beam
      // endpoints stay in sync with the DOM positions of the chord elements.
      const xInBeamsContainer = xInWrapper - this.#describeEndX;
      this.#beamRenderer?.setX(i, xInBeamsContainer);
      this.#noteXPositions.set(i, xInBeamsContainer);

      // Only needed when the element actually has a grace-dynamic to place —
      // computeFirstGraceHeadX still needs `grace` itself (a grace-dynamic
      // with no grace notes has nothing to anchor to and is simply skipped
      // by #renderDynamics via the same null check).
      const noteOrChordForGrace = element as INoteElement | IChordElement;
      if (
        element.nodeName !== MUSIC_REST_NODE &&
        noteOrChordForGrace.graceDynamic !== null &&
        noteOrChordForGrace.grace !== null
      ) {
        this.#firstGraceHeadXPositions.set(
          i,
          computeFirstGraceHeadX(
            xInBeamsContainer,
            leftwardWidth,
            noteOrChordForGrace.grace,
            noteOrChordForGrace.resolvedGraceAccidentals
          )
        );
      }

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
            noteElement.octave ?? undefined,
            i
          ) -
          yHeadOffset;
        element.style.top = `${noteY}px`;
      } else {
        // Chord y-positioning is handled internally by the chord's own SVG rendering
        element.style.top = '0px';
      }

      minWidthAccumulator += MIN_NOTE_WIDTH * (tupletScaleByIndex.get(i) ?? 1);

      // A marker following this element (afterElementIndex === i) is
      // zero-duration — it does not consume spacing slack — but does reserve
      // horizontal space, same as MIN_NOTE_WIDTH does for a real note.
      const trailingClefMarker = clefMarkersByAfterIndex.get(i);
      if (trailingClefMarker) {
        trailingClefMarker.element.style.position = 'absolute';
        trailingClefMarker.element.style.left = `${previousRightEdge}px`;
        trailingClefMarker.element.style.top = `${MID_STREAM_CLEF_Y_OFFSET}px`;
        trailingClefMarker.element.style.display = '';
        previousRightEdge += CLEF_CHANGE_RESERVED_WIDTH_PX;
        minWidthAccumulator += CLEF_CHANGE_RESERVED_WIDTH_PX;
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
      const noteOrChord = element as INoteElement | IChordElement;
      if (noteOrChord.dynamic !== null) {
        const noteX = this.#noteXPositions.get(i) ?? 0;
        const centerX = noteX + NOTE_SVG_WIDTH / 2;
        this.#dynamicsContainer.appendChild(
          createDynamicMarkingSvg(
            noteOrChord.dynamic,
            centerX,
            DYNAMICS_BASELINE_Y
          )
        );
      }

      // A grace-dynamic is independent of the host's own `dynamic` (both can
      // render at once — see the engraving reference's f-under-grace,
      // p-under-main example) and sits under the first grace note instead of
      // the host's own column.
      if (noteOrChord.graceDynamic !== null) {
        const firstGraceHeadX = this.#firstGraceHeadXPositions.get(i);
        if (firstGraceHeadX !== undefined) {
          this.#dynamicsContainer.appendChild(
            createDynamicMarkingSvg(
              noteOrChord.graceDynamic,
              firstGraceHeadX,
              DYNAMICS_BASELINE_Y
            )
          );
        }
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

    this.#renderArpeggiandoText();
  }

  // `sempre arpeggiando` (abbreviated `sempre arpegg.`): from an element marked
  // arpeggiate="start" until the next arpeggiate="end" (or the end of the
  // staff), every note/chord that carries no explicit `arpeggio` gets an
  // implied `up` sign. Elements with their own `arpeggio` (including
  // `non-arpeggiate`) are left untouched. Runs before spacing so the implied
  // signs are counted in the leftward footprint.
  //
  // The implied sign is a derived property living on the element, so an element
  // dropped from the staff mid-passage would keep it — clear it on anything in
  // the previous list that is gone and has not been re-slotted into another
  // staff (which then owns its implied sign).
  #resolveArpeggiandoPassages(
    elements: NoteChordOrRestElementType[],
    previousElements: NoteChordOrRestElementType[] = []
  ): void {
    const next = new Set(elements);
    for (const element of previousElements) {
      if (
        next.has(element) ||
        (element.nodeName !== MUSIC_NOTE_NODE &&
          element.nodeName !== MUSIC_CHORD_NODE)
      ) {
        continue;
      }
      const parent = element.parentElement;
      if (parent !== null && isStaffNodeName(parent.nodeName)) {
        continue;
      }
      (element as NoteElementType | ChordElementType).impliedArpeggio = null;
    }

    let inPassage = false;
    for (const element of elements) {
      if (
        element.nodeName !== MUSIC_NOTE_NODE &&
        element.nodeName !== MUSIC_CHORD_NODE
      ) {
        continue;
      }
      const noteOrChord = element as NoteElementType | ChordElementType;
      // start is inclusive (the marked element rolls); end is exclusive (the
      // marked element is the first one after the passage).
      if (noteOrChord.arpeggiate === 'start') {
        inPassage = true;
      } else if (noteOrChord.arpeggiate === 'end') {
        inPassage = false;
      }
      noteOrChord.impliedArpeggio =
        inPassage && noteOrChord.arpeggio === null ? 'up' : null;
    }
  }

  #renderArpeggiandoText(): void {
    for (let i = 0; i < this.#currentElements.length; i++) {
      const element = this.#currentElements[i];
      if (
        element.nodeName !== MUSIC_NOTE_NODE &&
        element.nodeName !== MUSIC_CHORD_NODE
      ) {
        continue;
      }
      if (
        (element as NoteElementType | ChordElementType).arpeggiate !== 'start'
      ) {
        continue;
      }
      const noteX = this.#noteXPositions.get(i) ?? 0;
      this.#dynamicsContainer.appendChild(
        createSempreArpeggiandoText(
          noteX,
          STAFF_TOP_LINE_Y - ARPEGGIO_TEXT_ABOVE_STAFF_PX
        )
      );
    }
  }

  // Conservative above-staff budget estimate using staff-referenced positions.
  // Used before note x-positions are set; the actual rendering uses real geometry.
  #estimateAboveStaffBudget(): number {
    let budget = 0;

    const hasArpeggiandoText = this.#currentElements.some(
      (element) =>
        (element.nodeName === MUSIC_NOTE_NODE ||
          element.nodeName === MUSIC_CHORD_NODE) &&
        (element as NoteElementType | ChordElementType).arpeggiate === 'start'
    );
    if (hasArpeggiandoText) {
      const textTopY =
        STAFF_TOP_LINE_Y -
        ARPEGGIO_TEXT_ABOVE_STAFF_PX -
        ARPEGGIO_TEXT_FONT_SIZE;
      if (textTopY < 0) {
        budget = Math.max(budget, Math.ceil(-textTopY) + 2);
      }
    }

    const hasStemUpTuplet = this.#tupletGroups.some((group) => {
      const upVotes = group.indices.filter(
        (i) => this.#stemDirections[i] === true
      ).length;
      return upVotes >= group.indices.length / 2;
    });
    if (hasStemUpTuplet) {
      const topY =
        STAFF_TOP_LINE_Y -
        STAFF_Y_PADDING -
        TUPLET_STAFF_CLEARANCE_PX -
        TUPLET_HOOK_LENGTH_PX -
        TUPLET_NUMERAL_FONT_SIZE;
      if (topY < 0) {
        budget = Math.max(budget, Math.ceil(-topY) + 2);
      }
    }

    return budget;
  }

  // Respace notes on resize. Runs even when there are no notes/chords, since
  // the describe area (clef/key/time signature) and the SVG viewBox still
  // need to track the staff's current width — otherwise an empty staff's
  // viewBox stays frozen at whatever width it had when it first connected,
  // and the browser's default viewBox scaling silently mis-scales/repositions
  // the clef on every subsequent resize.
  onStaffResize() {
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
