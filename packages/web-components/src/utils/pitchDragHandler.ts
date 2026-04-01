import { YCoordinates } from '../types/elements';
import { LetterOctave } from '../types/theory';

type PitchDragState = {
  element: HTMLElement;
  elementIndex: number;
  /** For chords: the index of the notehead within the chord being dragged. */
  chordNoteIndex: number | null;
  originalNote: LetterOctave;
  currentNote: LetterOctave;
  originalY: number;
  startClientY: number;
  tooltip: HTMLDivElement;
};

export type PitchChangeDetail = {
  element: HTMLElement;
  elementIndex: number;
  /** Index of the note within the chord, or null for a single note. */
  chordNoteIndex: number | null;
  fromNote: LetterOctave;
  toNote: LetterOctave;
};

/**
 * Handles vertical dragging of noteheads to change pitch.
 *
 * Hit-test: only activates when the pointerdown target is a `.head` or
 * `.head-hit-zone` SVG element inside a note/chord shadow DOM.
 *
 * Snaps to valid staff Y positions during drag. Shows a tooltip with the
 * note transition (e.g. "D4 → F4"). Dispatches `note-pitch-change` on drop.
 */
export class PitchDragHandler {
  #hostElement: HTMLElement;
  #yCoordinates: YCoordinates;
  /** Sorted array of [LetterOctave, yCoordinate] by ascending Y (top-to-bottom). */
  #sortedPositions: [LetterOctave, number][];
  #dragState: PitchDragState | null = null;
  #onLivePreview:
    | ((
        elementIndex: number,
        newNote: LetterOctave,
        chordNoteIndex: number | null
      ) => void)
    | null = null;
  #bound: {
    pointermove: (e: PointerEvent) => void;
    pointerup: (e: PointerEvent) => void;
    pointercancel: (e: PointerEvent) => void;
    keydown: (e: KeyboardEvent) => void;
  };

  constructor(
    hostElement: HTMLElement,
    yCoordinates: YCoordinates,
    onLivePreview?: (
      elementIndex: number,
      newNote: LetterOctave,
      chordNoteIndex: number | null
    ) => void
  ) {
    this.#hostElement = hostElement;
    this.#yCoordinates = yCoordinates;
    this.#onLivePreview = onLivePreview ?? null;

    // Build sorted positions from yCoordinates (ascending Y = top to bottom on screen)
    this.#sortedPositions = [];
    for (const [note, y] of Object.entries(yCoordinates)) {
      if (y !== undefined) {
        this.#sortedPositions.push([note as LetterOctave, y]);
      }
    }
    this.#sortedPositions.sort((a, b) => a[1] - b[1]);

    this.#bound = {
      pointermove: this.#onPointerMove.bind(this),
      pointerup: this.#onPointerUp.bind(this),
      pointercancel: this.#onPointerCancel.bind(this),
      keydown: this.#onKeyDown.bind(this),
    };
  }

  /**
   * Attempt to start a pitch drag. Call this from the staff's pointerdown
   * handler after determining that the click target is a notehead.
   *
   * Returns true if a pitch drag was started, false otherwise.
   */
  tryStart(
    e: PointerEvent,
    element: HTMLElement,
    elementIndex: number,
    chordNoteIndex: number | null
  ): boolean {
    const originalNote = this.#resolveNote(element, chordNoteIndex);
    if (!originalNote) {
      return false;
    }

    const originalY = this.#yCoordinates[originalNote];
    if (originalY === undefined) {
      return false;
    }

    // Cancelable event
    const dragStartEvent = new CustomEvent('note-pitch-drag-start', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: { element, elementIndex, chordNoteIndex, note: originalNote },
    });
    if (!this.#hostElement.dispatchEvent(dragStartEvent)) {
      return false;
    }

    e.preventDefault();

    const tooltip = this.#createTooltip(originalNote, originalNote);

    this.#dragState = {
      element,
      elementIndex,
      chordNoteIndex,
      originalNote,
      currentNote: originalNote,
      originalY,
      startClientY: e.clientY,
      tooltip,
    };

    this.#hostElement.setPointerCapture(e.pointerId);
    this.#hostElement.addEventListener('pointermove', this.#bound.pointermove);
    this.#hostElement.addEventListener('pointerup', this.#bound.pointerup);
    this.#hostElement.addEventListener(
      'pointercancel',
      this.#bound.pointercancel
    );
    document.addEventListener('keydown', this.#bound.keydown);

    return true;
  }

  cancelDrag(): void {
    if (!this.#dragState) {
      return;
    }

    // Restore original pitch via live preview
    const { elementIndex, originalNote, chordNoteIndex } = this.#dragState;
    if (this.#onLivePreview && this.#dragState.currentNote !== originalNote) {
      this.#onLivePreview(elementIndex, originalNote, chordNoteIndex);
    }

    this.#cleanup();
  }

  detach(): void {
    this.cancelDrag();
  }

  get isDragging(): boolean {
    return this.#dragState !== null;
  }

  #onPointerMove(e: PointerEvent) {
    if (!this.#dragState) {
      return;
    }

    const deltaY = e.clientY - this.#dragState.startClientY;
    const targetY = this.#dragState.originalY + deltaY;

    const snapped = this.#snapToPosition(
      targetY,
      this.#dragState.element,
      this.#dragState.chordNoteIndex
    );
    if (!snapped) {
      return;
    }

    const [newNote] = snapped;

    if (newNote !== this.#dragState.currentNote) {
      this.#dragState.currentNote = newNote;

      this.#updateTooltip(
        this.#dragState.tooltip,
        this.#dragState.originalNote,
        newNote
      );

      if (this.#onLivePreview) {
        this.#onLivePreview(
          this.#dragState.elementIndex,
          newNote,
          this.#dragState.chordNoteIndex
        );
      }
    }

    // Position tooltip near pointer
    this.#dragState.tooltip.style.left = `${e.clientX + 16}px`;
    this.#dragState.tooltip.style.top = `${e.clientY - 12}px`;
  }

  #onPointerUp() {
    if (!this.#dragState) {
      return;
    }

    const { elementIndex, chordNoteIndex, originalNote, currentNote, element } =
      this.#dragState;

    this.#cleanup();

    if (originalNote !== currentNote) {
      this.#hostElement.dispatchEvent(
        new CustomEvent('note-pitch-change', {
          bubbles: true,
          composed: true,
          detail: {
            element,
            elementIndex,
            chordNoteIndex,
            fromNote: originalNote,
            toNote: currentNote,
          } satisfies PitchChangeDetail,
        })
      );
    }
  }

  #onPointerCancel() {
    this.cancelDrag();
  }

  #onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.cancelDrag();
    }
  }

  #cleanup() {
    if (!this.#dragState) {
      return;
    }

    this.#dragState.tooltip.remove();

    this.#hostElement.removeEventListener(
      'pointermove',
      this.#bound.pointermove
    );
    this.#hostElement.removeEventListener('pointerup', this.#bound.pointerup);
    this.#hostElement.removeEventListener(
      'pointercancel',
      this.#bound.pointercancel
    );
    document.removeEventListener('keydown', this.#bound.keydown);

    this.#dragState = null;
  }

  /**
   * Snap a target Y coordinate to the nearest valid staff position.
   * For chords, excludes positions already occupied by other notes in the chord.
   */
  #snapToPosition(
    targetY: number,
    element: HTMLElement,
    chordNoteIndex: number | null
  ): [LetterOctave, number] | null {
    // Get occupied positions for chord duplicate prevention
    const occupiedNotes = new Set<LetterOctave>();
    if (chordNoteIndex !== null && element.nodeName === 'MUSIC-CHORD') {
      const noteElements = element.querySelectorAll('music-note');
      noteElements.forEach((noteEl, i) => {
        if (i !== chordNoteIndex) {
          const val = noteEl.getAttribute('value');
          if (val) {
            const resolved = this.#noteValueToLetterOctave(val);
            if (resolved) {
              occupiedNotes.add(resolved);
            }
          }
        }
      });
    }

    let best: [LetterOctave, number] | null = null;
    let bestDist = Infinity;

    for (const [note, y] of this.#sortedPositions) {
      // Skip positions occupied by other chord notes
      if (occupiedNotes.has(note)) {
        continue;
      }

      const dist = Math.abs(y - targetY);
      if (dist < bestDist) {
        bestDist = dist;
        best = [note, y];
      }
    }

    return best;
  }

  /**
   * Resolve the current note (LetterOctave) for an element.
   * For chords, resolves the specific note at chordNoteIndex.
   */
  #resolveNote(
    element: HTMLElement,
    chordNoteIndex: number | null
  ): LetterOctave | null {
    if (element.nodeName === 'MUSIC-CHORD' && chordNoteIndex !== null) {
      const noteElements = element.querySelectorAll('music-note');
      const noteEl = noteElements[chordNoteIndex];
      if (!noteEl) return null;
      return this.#noteValueToLetterOctave(noteEl.getAttribute('value') ?? '');
    }

    return this.#noteValueToLetterOctave(element.getAttribute('value') ?? '');
  }

  /**
   * Convert a note value string (e.g. "D", "F#", "C4") to a LetterOctave
   * by looking it up in the yCoordinates map.
   */
  #noteValueToLetterOctave(value: string): LetterOctave | null {
    if (!value) return null;

    const match = value.trim().match(/^([A-Ga-g])[#bx]*(\d?)$/);
    if (!match) return null;

    const letter = match[1].toUpperCase();
    const octave = match[2];

    if (octave) {
      const key = `${letter}${octave}` as LetterOctave;
      if (this.#yCoordinates[key] !== undefined) return key;
    } else {
      // Search from lowest octave first (highest Y) to match staff behavior
      // where octaves are searched in ascending order [4, 5, 6].
      for (let i = this.#sortedPositions.length - 1; i >= 0; i--) {
        const [note] = this.#sortedPositions[i];
        if (note.startsWith(letter)) return note;
      }
    }

    return null;
  }

  #createTooltip(from: LetterOctave, to: LetterOctave): HTMLDivElement {
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
      position: fixed;
      padding: 4px 8px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
      pointer-events: none;
      z-index: 10001;
      white-space: nowrap;
    `;
    tooltip.textContent = from === to ? from : `${from} → ${to}`;
    document.body.appendChild(tooltip);
    return tooltip;
  }

  #updateTooltip(
    tooltip: HTMLDivElement,
    from: LetterOctave,
    to: LetterOctave
  ) {
    tooltip.textContent = from === to ? from : `${from} → ${to}`;
  }

  /**
   * Check if an SVG element is a notehead (hit zone or visible head).
   * Used by the staff to determine whether a pointerdown should trigger
   * pitch drag vs timing reorder.
   */
  static isNoteheadTarget(target: Element): boolean {
    // Walk up through SVG hierarchy checking for head classes
    let current: Element | null = target;
    while (current) {
      if (
        current.classList.contains('head') ||
        current.classList.contains('head-hit-zone')
      ) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }
}
