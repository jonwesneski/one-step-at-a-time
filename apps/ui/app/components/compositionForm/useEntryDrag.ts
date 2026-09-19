import type {
  ClefType,
  Note,
  Octave,
} from '@one-step-at-a-time/web-components';
import { useCallback, useEffect, useRef } from 'react';
import { resolveEntryOctaves, resolveNoteOctave, step } from './clefsHelpers';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import {
  DRAG_THRESHOLD_PX,
  isNoteheadPath,
  pitchAfterVerticalDrag,
  reorderTargetIndex,
} from './entryDragHelpers';
import type { ChordNote, MusicEntry } from './types';

// Touch needs a deliberate hold before a note press becomes a drag, so a plain
// finger-swipe over a note still scrolls the page — mirrors DragSelectOverlay.
const LONG_PRESS_MS = 400;
const LONG_PRESS_JITTER_PX = 8;
// Above the app's z-50 modals/marquee; overlays are appended to document.body.
const OVERLAY_Z_INDEX = 60;

export type EntryDragContext = {
  entry: MusicEntry;
  staffId: string;
  voiceId: string;
  clef: ClefType;
  // The entry's own voice's entry ids in document order, for mapping a drop
  // position back to a structural index.
  entryIds: string[];
};

type Mode = 'pitch' | 'reorder';

type DragState = {
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  mode: Mode;
  ctx: EntryDragContext;
  element: HTMLElement;
  chordNoteIndex: number | null;
  originalValue: Note;
  originalOctave: Octave | null;
  startOctave: Octave;
  occupiedSteps: number[];
  previewValue: Note;
  previewOctave: Octave;
  siblings: { id: string; rect: DOMRect }[];
  fromSiblingIndex: number;
  dropIndex: number;
  controller: AbortController;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  isDragging: boolean;
  clone: HTMLElement | null;
  cloneOffsetX: number;
  cloneOffsetY: number;
  dropIndicator: HTMLElement | null;
  tooltip: HTMLElement | null;
};

function pitchTarget(state: DragState): HTMLElement | null {
  if (state.chordNoteIndex === null) {
    return state.element;
  }
  return (
    (state.element.querySelectorAll('music-note')[state.chordNoteIndex] as
      | HTMLElement
      | undefined) ?? null
  );
}

function chordNoteIndexFromPath(
  chordElement: HTMLElement,
  path: EventTarget[]
): number {
  const noteSvgs = Array.from(
    chordElement.shadowRoot?.querySelectorAll('.chord > .note') ?? []
  );
  for (const node of path) {
    if (!(node instanceof Element)) {
      continue;
    }
    const index = noteSvgs.findIndex(
      (svg) => svg === node || svg.contains(node)
    );
    if (index !== -1) {
      return index;
    }
  }
  return 0;
}

function makeOverlay(cssText: string): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = cssText;
  document.body.appendChild(el);
  return el;
}

export function useEntryDrag() {
  const { entryElements, staffElements, updateEntry, reorderEntry } =
    useCompositionFormSession();

  const stateRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  // The mutators are rebuilt every render of CompositionInput; read them through
  // a ref so the drag callbacks stay referentially stable.
  const commitRef = useRef({ updateEntry, reorderEntry });
  commitRef.current = { updateEntry, reorderEntry };

  const teardown = useCallback(() => {
    const state = stateRef.current;
    if (!state) {
      return;
    }
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
    }
    state.controller.abort();
    state.element.style.opacity = '';
    state.clone?.remove();
    state.dropIndicator?.remove();
    state.tooltip?.remove();
    document.body.style.userSelect = '';
    stateRef.current = null;
  }, []);

  const restoreOriginal = useCallback(() => {
    const state = stateRef.current;
    if (!state || state.mode !== 'pitch') {
      return;
    }
    const target = pitchTarget(state);
    if (!target) {
      return;
    }
    target.setAttribute('note', state.originalValue);
    if (state.originalOctave === null) {
      target.removeAttribute('octave');
    } else {
      target.setAttribute('octave', String(state.originalOctave));
    }
  }, []);

  const positionDropIndicator = useCallback(() => {
    const state = stateRef.current;
    if (!state?.dropIndicator) {
      return;
    }
    const noMove =
      state.dropIndex === state.fromSiblingIndex ||
      state.dropIndex === state.fromSiblingIndex + 1;
    if (noMove || state.siblings.length === 0) {
      state.dropIndicator.style.display = 'none';
      return;
    }
    const staffRect = staffElements
      .get(state.ctx.staffId)
      ?.getBoundingClientRect();
    let x: number;
    if (state.dropIndex <= 0) {
      x = state.siblings[0].rect.left - 2;
    } else if (state.dropIndex >= state.siblings.length) {
      x = state.siblings[state.siblings.length - 1].rect.right + 2;
    } else {
      x =
        (state.siblings[state.dropIndex - 1].rect.right +
          state.siblings[state.dropIndex].rect.left) /
        2;
    }
    state.dropIndicator.style.display = 'block';
    state.dropIndicator.style.left = `${x}px`;
    state.dropIndicator.style.top = `${staffRect?.top ?? state.startY - 40}px`;
    state.dropIndicator.style.height = `${staffRect?.height ?? 80}px`;
  }, [staffElements]);

  const beginDrag = useCallback(() => {
    const state = stateRef.current;
    if (!state || state.isDragging) {
      return;
    }
    state.isDragging = true;
    document.body.style.userSelect = 'none';
    state.element.style.opacity = state.mode === 'reorder' ? '0.3' : '0.5';

    if (state.mode === 'reorder') {
      const rect = state.element.getBoundingClientRect();
      state.cloneOffsetX = state.startX - rect.left;
      state.cloneOffsetY = state.startY - rect.top;
      const clone = makeOverlay(
        `position:fixed;left:${rect.left}px;top:${rect.top}px;pointer-events:none;opacity:0.7;z-index:${OVERLAY_Z_INDEX};`
      );
      const svg = state.element.shadowRoot?.querySelector('svg');
      if (svg) {
        const svgClone = svg.cloneNode(true) as SVGElement;
        svgClone.style.overflow = 'visible';
        clone.appendChild(svgClone);
      }
      state.clone = clone;
      state.dropIndicator = makeOverlay(
        `position:fixed;width:0;border-left:2px dashed var(--drop-indicator-color,#4a90d9);pointer-events:none;z-index:${OVERLAY_Z_INDEX};display:none;`
      );
    } else {
      const tooltip = makeOverlay(
        `position:fixed;padding:4px 8px;background:rgba(0,0,0,0.8);color:#fff;border-radius:4px;font:12px/1.4 monospace;pointer-events:none;white-space:nowrap;z-index:${OVERLAY_Z_INDEX};`
      );
      tooltip.textContent = `${state.originalValue}${state.startOctave}`;
      state.tooltip = tooltip;
    }
  }, []);

  const handleMove = useCallback(
    (e: PointerEvent) => {
      const state = stateRef.current;
      if (!state || e.pointerId !== state.pointerId) {
        return;
      }
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      const distance = Math.hypot(dx, dy);

      if (state.pointerType === 'touch' && !state.isDragging) {
        if (distance > LONG_PRESS_JITTER_PX && state.longPressTimer) {
          teardown();
        }
        return;
      }

      if (!state.isDragging) {
        if (distance < DRAG_THRESHOLD_PX) {
          return;
        }
        beginDrag();
      }
      e.preventDefault();

      if (state.mode === 'pitch') {
        const { value, octave } = pitchAfterVerticalDrag({
          value: state.originalValue,
          octave: state.startOctave,
          clef: state.ctx.clef,
          deltaY: dy,
          occupiedSteps: state.occupiedSteps,
        });
        if (value !== state.previewValue || octave !== state.previewOctave) {
          const target = pitchTarget(state);
          if (target) {
            target.setAttribute('note', value);
            target.setAttribute('octave', String(octave));
          }
          state.previewValue = value;
          state.previewOctave = octave;
        }
        if (state.tooltip) {
          const from = `${state.originalValue}${state.startOctave}`;
          const to = `${value}${octave}`;
          state.tooltip.textContent = from === to ? from : `${from} → ${to}`;
          state.tooltip.style.left = `${e.clientX + 16}px`;
          state.tooltip.style.top = `${e.clientY - 12}px`;
        }
      } else {
        if (state.clone) {
          state.clone.style.left = `${e.clientX - state.cloneOffsetX}px`;
          state.clone.style.top = `${e.clientY - state.cloneOffsetY}px`;
        }
        state.dropIndex = reorderTargetIndex(e.clientX, state.siblings);
        positionDropIndicator();
      }
    },
    [beginDrag, positionDropIndicator, teardown]
  );

  const handleUp = useCallback(
    (e: PointerEvent) => {
      const state = stateRef.current;
      if (!state || e.pointerId !== state.pointerId) {
        return;
      }
      if (!state.isDragging) {
        teardown();
        return;
      }

      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);

      if (state.mode === 'pitch') {
        const changed =
          state.previewValue !== state.originalValue ||
          state.previewOctave !== state.startOctave;
        if (changed) {
          const { entry } = state.ctx;
          if (entry.type === 'note') {
            commitRef.current.updateEntry({
              ...entry,
              value: state.previewValue,
              octave: state.previewOctave,
            });
          } else if (entry.type === 'chord' && state.chordNoteIndex !== null) {
            const notes = entry.notes.map((note, index) =>
              index === state.chordNoteIndex
                ? { value: state.previewValue, octave: state.previewOctave }
                : note
            );
            commitRef.current.updateEntry({ ...entry, notes });
          }
        } else {
          restoreOriginal();
        }
      } else {
        const noMove =
          state.dropIndex === state.fromSiblingIndex ||
          state.dropIndex === state.fromSiblingIndex + 1;
        if (!noMove) {
          const toIndex =
            state.dropIndex >= state.siblings.length
              ? state.ctx.entryIds.length
              : state.ctx.entryIds.indexOf(state.siblings[state.dropIndex].id);
          commitRef.current.reorderEntry(
            state.ctx.staffId,
            state.ctx.voiceId,
            state.ctx.entry.id,
            toIndex
          );
        }
      }
      teardown();
    },
    [restoreOriginal, teardown]
  );

  const handleCancel = useCallback(() => {
    restoreOriginal();
    teardown();
  }, [restoreOriginal, teardown]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stateRef.current) {
        restoreOriginal();
        teardown();
      }
    },
    [restoreOriginal, teardown]
  );

  useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      if (suppressClickRef.current) {
        e.stopPropagation();
        e.preventDefault();
        suppressClickRef.current = false;
      }
    };
    window.addEventListener('click', onClickCapture, true);
    return () => {
      window.removeEventListener('click', onClickCapture, true);
      teardown();
    };
  }, [teardown]);

  const onEntryPointerDown = useCallback(
    (e: React.PointerEvent, ctx: EntryDragContext) => {
      if (e.button !== 0 || stateRef.current) {
        return;
      }
      const { entry } = ctx;
      const path = e.nativeEvent.composedPath();
      const element = e.currentTarget as HTMLElement;

      let mode: Mode;
      let chordNoteIndex: number | null = null;
      if (
        isNoteheadPath(path) &&
        (entry.type === 'note' || entry.type === 'chord')
      ) {
        mode = 'pitch';
        if (entry.type === 'chord') {
          chordNoteIndex = chordNoteIndexFromPath(element, path);
        }
      } else if (entry.type !== 'clef' && ctx.entryIds.length > 1) {
        mode = 'reorder';
      } else {
        return;
      }

      // Claim the gesture so DragSelectOverlay's bubble-phase pointerdown never
      // arms a marquee from a note.
      e.stopPropagation();

      const siblings = ctx.entryIds
        .map((id) => {
          const el = entryElements.get(id);
          return el ? { id, rect: el.getBoundingClientRect() } : null;
        })
        .filter((s): s is { id: string; rect: DOMRect } => s !== null);

      let originalValue: Note = 'C';
      let originalOctave: Octave | null = null;
      let startOctave: Octave = 4;
      let occupiedSteps: number[] = [];
      if (entry.type === 'chord' && chordNoteIndex !== null) {
        const octaves = resolveEntryOctaves(ctx.clef, entry.notes);
        originalValue = entry.notes[chordNoteIndex].value;
        originalOctave = entry.notes[chordNoteIndex].octave ?? null;
        startOctave = octaves[chordNoteIndex];
        occupiedSteps = entry.notes
          .map((note: ChordNote, index: number) =>
            step(note.value[0].toUpperCase(), octaves[index])
          )
          .filter((_, index) => index !== chordNoteIndex);
      } else if (entry.type === 'note') {
        originalValue = entry.value;
        originalOctave = entry.octave ?? null;
        startOctave = resolveNoteOctave(ctx.clef, entry.value, entry.octave);
      }

      const controller = new AbortController();
      const { signal } = controller;
      const state: DragState = {
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        startX: e.clientX,
        startY: e.clientY,
        mode,
        ctx,
        element,
        chordNoteIndex,
        originalValue,
        originalOctave,
        startOctave,
        occupiedSteps,
        previewValue: originalValue,
        previewOctave: startOctave,
        siblings,
        fromSiblingIndex: siblings.findIndex((s) => s.id === entry.id),
        dropIndex: siblings.findIndex((s) => s.id === entry.id),
        controller,
        longPressTimer: null,
        isDragging: false,
        clone: null,
        cloneOffsetX: 0,
        cloneOffsetY: 0,
        dropIndicator: null,
        tooltip: null,
      };
      stateRef.current = state;

      if (e.pointerType === 'touch') {
        state.longPressTimer = setTimeout(() => {
          if (stateRef.current === state) {
            beginDrag();
          }
        }, LONG_PRESS_MS);
      }

      try {
        element.setPointerCapture(e.pointerId);
      } catch {
        // pointer already released
      }
      window.addEventListener('pointermove', handleMove, { signal });
      window.addEventListener('pointerup', handleUp, { signal });
      window.addEventListener('pointercancel', handleCancel, { signal });
      window.addEventListener('keydown', handleKeyDown, { signal });
    },
    [
      beginDrag,
      entryElements,
      handleCancel,
      handleKeyDown,
      handleMove,
      handleUp,
    ]
  );

  return { onEntryPointerDown };
}
