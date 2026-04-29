import {
  ChordElementType,
  ConnectorRole,
  NoteElementType,
  NoteLikeElementType,
} from '../types/elements';
import { createCurveSvg, CurveBulge } from './svgCreator';
import { computeYHeadOffset } from './svgCreator/note';

export type ConnectorKind = 'tie' | 'slur' | 'hammer-on' | 'pull-off' | 'slide';

const CONNECTOR_ATTRS: Record<ConnectorKind, string> = {
  tie: 'tie',
  slur: 'slur',
  'hammer-on': 'hammer-on',
  'pull-off': 'pull-off',
  slide: 'slide',
};

const CONNECTOR_LABELS: Partial<Record<ConnectorKind, string>> = {
  'hammer-on': 'H',
  'pull-off': 'P',
};

// Row-split tolerance (px). Matches the pattern in measure.ts's #updateConnectorVisibility.
const ROW_TOLERANCE_PX = 5;

type ConnectorEndpoint = {
  kind: ConnectorKind;
  role: ConnectorRole;
  note: NoteLikeElementType;
  id: string | null;
  forId: string | null;
  startIndex: number;
};

type IndexedPair = ConnectorPair & { startIndex: number; endIndex: number };

export type ConnectorPair = {
  kind: ConnectorKind;
  start: NoteLikeElementType;
  end: NoteLikeElementType;
  nestingLevel: number;
};

export const collectNoteLikeElements = (
  root: ParentNode
): NoteLikeElementType[] => {
  const chordChildSelectors = Object.values(CONNECTOR_ATTRS)
    .map((attr) => `music-chord music-note[${attr}]`)
    .join(', ');
  const selector = `music-note:not(music-chord music-note), music-guitar-note, music-chord, ${chordChildSelectors}`;
  return Array.from(root.querySelectorAll<NoteLikeElementType>(selector));
};

const readRole = (el: HTMLElement, attr: string): ConnectorRole | null => {
  const raw = el.getAttribute(attr);
  if (raw === 'start' || raw === 'end') {
    return raw;
  }
  return null;
};

const validateTiePitch = (
  start: NoteLikeElementType,
  end: NoteLikeElementType
): string | undefined => {
  // Only apply to classical music-note elements; guitar notes tie by string/fret
  // match rather than pitch, which we skip here (warning only helps classical).
  if (
    start.tagName.toLowerCase() !== 'music-note' ||
    end.tagName.toLowerCase() !== 'music-note'
  ) {
    return undefined;
  }
  const startValue = start.getAttribute('value');
  const endValue = end.getAttribute('value');
  if (startValue && endValue && startValue !== endValue) {
    return `tie: start note "${startValue}" and end note "${endValue}" have different pitches`;
  }
  return undefined;
};

export const pairConnectors = (
  notes: readonly NoteLikeElementType[]
): ConnectorPair[] => {
  const indexedPairs: IndexedPair[] = [];
  const stacks: Record<ConnectorKind, ConnectorEndpoint[]> = {
    tie: [],
    slur: [],
    'hammer-on': [],
    'pull-off': [],
    slide: [],
  };

  const kinds = Object.keys(stacks) as ConnectorKind[];

  notes.forEach((note, noteIndex) => {
    for (const kind of kinds) {
      const role = readRole(note, CONNECTOR_ATTRS[kind]);
      if (role === null) {
        continue;
      }

      if (role === 'start') {
        stacks[kind].push({
          kind,
          role,
          note,
          id: note.getAttribute('id'),
          forId: null,
          startIndex: noteIndex,
        });
        continue;
      }

      // role === 'end'
      const forId = note.getAttribute('for');
      const stack = stacks[kind];
      let startEntry: ConnectorEndpoint | undefined;

      if (forId) {
        const idx = stack.findIndex((entry) => entry.id === forId);
        if (idx >= 0) {
          startEntry = stack.splice(idx, 1)[0];
        } else {
          console.warn(
            `[connectorsBuilder] ${kind} end with for="${forId}" has no matching start; falling back to stack top`
          );
        }
      }

      if (!startEntry) {
        startEntry = stack.pop();
      }

      if (!startEntry) {
        console.warn(
          `[connectorsBuilder] orphan ${kind} end (no matching start)`
        );
        continue;
      }

      const warning =
        kind === 'tie' ? validateTiePitch(startEntry.note, note) : undefined;
      if (warning) {
        console.warn(`[connectorsBuilder] ${warning}`);
      }

      indexedPairs.push({
        kind,
        start: startEntry.note,
        end: note,
        nestingLevel: 0,
        startIndex: startEntry.startIndex,
        endIndex: noteIndex,
      });
    }
  });

  for (const kind of kinds) {
    for (const leftover of stacks[kind]) {
      console.warn(
        `[connectorsBuilder] unbalanced ${kind} start (no matching end)`,
        leftover.note
      );
    }
  }

  return indexedPairs.map((pair) => ({
    kind: pair.kind,
    start: pair.start,
    end: pair.end,
    nestingLevel: indexedPairs.filter(
      (other) =>
        other !== pair &&
        other.kind === pair.kind &&
        other.startIndex > pair.startIndex &&
        other.endIndex < pair.endIndex
    ).length,
  }));
};

type Anchor = {
  x: number;
  y: number;
  rowTop: number;
};

const getRowTop = (note: NoteLikeElementType, rootRect: DOMRect): number => {
  // The note's own rect.top shifts with pitch (higher pitch → smaller top),
  // so it cannot be used for row detection. The containing <music-measure>
  // is what wraps in the composition's flex grid, so its top reflects the
  // actual visual row.
  const measure = note.closest('music-measure') as HTMLElement | null;
  const ref = measure ?? note;
  return ref.getBoundingClientRect().top - rootRect.top;
};

const TIE_NOTEHEAD_OFFSET_PX = 5;
const SLUR_NOTEHEAD_OFFSET_PX = 9;

const computeAnchorAtSpecificY = (
  note: NoteLikeElementType,
  rootRect: DOMRect,
  bulge: CurveBulge,
  staffY: number,
  noteheadOffsetPx: number
): Anchor => {
  const rect = note.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2 - rootRect.left;
  const edgeOffset = bulge === 'above' ? -noteheadOffsetPx : noteheadOffsetPx;
  return {
    x: centerX,
    y: rect.top - rootRect.top + staffY + edgeOffset,
    rowTop: getRowTop(note, rootRect),
  };
};

const computeAnchor = (
  note: NoteLikeElementType,
  rootRect: DOMRect,
  bulge: CurveBulge,
  noteheadOffsetPx: number
): Anchor => {
  // Notes inside a chord have no layout box — anchor via parent chord geometry.
  if (
    note.tagName.toLowerCase() === 'music-note' &&
    note.parentElement?.tagName.toLowerCase() === 'music-chord'
  ) {
    const chord = note.parentElement as unknown as ChordElementType;
    const chordRect = chord.getBoundingClientRect();
    const chordNotes = Array.from(chord.querySelectorAll('music-note'));
    const noteIndex = chordNotes.indexOf(note as unknown as Element);
    const yCoords = chord.staffYCoordinates;

    if (yCoords && noteIndex >= 0 && noteIndex < yCoords.length) {
      const edgeOffset =
        bulge === 'above' ? -noteheadOffsetPx : noteheadOffsetPx;
      return {
        x: chordRect.left + chordRect.width / 2 - rootRect.left,
        y: chordRect.top - rootRect.top + yCoords[noteIndex] + edgeOffset,
        rowTop: getRowTop(chord as unknown as NoteLikeElementType, rootRect),
      };
    }
  }

  const rect = note.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2 - rootRect.left;

  // Guitar notes render their fret text at the top of the element box;
  // apply the notehead offset directly from rect.top so the curve clears the number.
  if (note.tagName.toLowerCase() === 'music-guitar-note') {
    const edgeOffset = bulge === 'above' ? -noteheadOffsetPx : noteheadOffsetPx;
    return {
      x: centerX,
      y: rect.top - rootRect.top + edgeOffset,
      rowTop: getRowTop(note, rootRect),
    };
  }

  let y: number;
  if (note.tagName.toLowerCase() === 'music-chord') {
    const yCoords = (note as unknown as ChordElementType).staffYCoordinates;
    if (yCoords && yCoords.length > 0) {
      const noteheadY =
        bulge === 'above' ? Math.min(...yCoords) : Math.max(...yCoords);
      const edgeOffset =
        bulge === 'above' ? -noteheadOffsetPx : noteheadOffsetPx;
      y = rect.top - rootRect.top + noteheadY + edgeOffset;
    } else {
      y =
        bulge === 'above'
          ? rect.top - rootRect.top
          : rect.bottom - rootRect.top;
    }
  } else {
    const noteEl = note as unknown as NoteElementType;
    const noteheadY = computeYHeadOffset(
      noteEl.stemUp,
      noteEl.duration,
      noteEl.noFlags
    );
    const edgeOffset = bulge === 'above' ? -noteheadOffsetPx : noteheadOffsetPx;
    y = rect.top - rootRect.top + noteheadY + edgeOffset;
  }

  return {
    x: centerX,
    y,
    rowTop: getRowTop(note, rootRect),
  };
};

const sameRow = (a: Anchor, b: Anchor): boolean =>
  Math.abs(a.rowTop - b.rowTop) <= ROW_TOLERANCE_PX;

const pickBulge = (note: NoteLikeElementType): CurveBulge => {
  // Stems up → notehead on the staff, bulge above (opposite side of stem tip? no,
  // ties/slurs bulge AWAY from the stem — stems up = curve below; stems down = curve above).
  // For guitar tab there are no stems, default to above.
  if (note.tagName.toLowerCase() === 'music-guitar-note') {
    return 'above';
  }

  // For notes inside a chord, stemUp is set on the chord element, not the note.
  const sourceElement =
    note.tagName.toLowerCase() === 'music-note' &&
    note.parentElement?.tagName.toLowerCase() === 'music-chord'
      ? note.parentElement
      : note;

  const stemUp = (sourceElement as unknown as { stemUp?: boolean }).stemUp;
  return stemUp === false ? 'above' : 'below';
};

// For chord ties: each note's tie curves outward from the chord's vertical midpoint
// (top notes curve above, bottom notes curve below). This is position-based, not
// stem-based — standard engraving practice per Gould's "Behind Bars".
const pickChordNoteBulge = (
  chord: NoteLikeElementType,
  yCoords: readonly number[],
  index: number
): CurveBulge => {
  if (yCoords.length <= 1) {
    return pickBulge(chord);
  }
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);
  const midY = (minY + maxY) / 2;
  if (yCoords[index] < midY) {
    return 'above';
  }
  if (yCoords[index] > midY) {
    return 'below';
  }
  return pickBulge(chord);
};

export type ConnectorsBuildOptions = {
  rootRect: DOMRect;
  rowLeft: number;
  rowRight: number;
};

export const buildConnectorSvgs = (
  pairs: readonly ConnectorPair[],
  options: ConnectorsBuildOptions
): SVGGElement[] => {
  const { rootRect, rowLeft, rowRight } = options;
  const elements: SVGGElement[] = [];

  for (const pair of pairs) {
    const bulge = pickBulge(pair.start);
    const style = pair.kind === 'slide' ? 'straight' : 'smooth';
    const label = CONNECTOR_LABELS[pair.kind];

    const isChordTie =
      pair.kind === 'tie' &&
      pair.start.tagName.toLowerCase() === 'music-chord' &&
      pair.end.tagName.toLowerCase() === 'music-chord';

    if (isChordTie) {
      const startCoords =
        (pair.start as unknown as ChordElementType).staffYCoordinates ?? [];
      const endCoords =
        (pair.end as unknown as ChordElementType).staffYCoordinates ?? [];
      const count = Math.min(startCoords.length, endCoords.length);

      for (let i = 0; i < count; i++) {
        const noteBulge = pickChordNoteBulge(pair.start, startCoords, i);
        const startAnchor = computeAnchorAtSpecificY(
          pair.start,
          rootRect,
          noteBulge,
          startCoords[i],
          TIE_NOTEHEAD_OFFSET_PX
        );
        const endAnchor = computeAnchorAtSpecificY(
          pair.end,
          rootRect,
          noteBulge,
          endCoords[i],
          TIE_NOTEHEAD_OFFSET_PX
        );

        if (sameRow(startAnchor, endAnchor)) {
          elements.push(
            createCurveSvg({
              from: { x: startAnchor.x, y: startAnchor.y },
              to: { x: endAnchor.x, y: endAnchor.y },
              bulge: noteBulge,
              style,
              nestingLevel: pair.nestingLevel,
            })
          );
        } else {
          elements.push(
            createCurveSvg({
              from: { x: startAnchor.x, y: startAnchor.y },
              to: { x: rowRight, y: startAnchor.y },
              bulge: noteBulge,
              style,
              nestingLevel: pair.nestingLevel,
            })
          );
          elements.push(
            createCurveSvg({
              from: { x: rowLeft, y: endAnchor.y },
              to: { x: endAnchor.x, y: endAnchor.y },
              bulge: noteBulge,
              style,
              nestingLevel: pair.nestingLevel,
            })
          );
        }
      }
      continue;
    }

    const noteheadOffsetPx =
      pair.kind === 'slur' ? SLUR_NOTEHEAD_OFFSET_PX : TIE_NOTEHEAD_OFFSET_PX;
    const startAnchor = computeAnchor(
      pair.start,
      rootRect,
      bulge,
      noteheadOffsetPx
    );
    const endAnchor = computeAnchor(
      pair.end,
      rootRect,
      bulge,
      noteheadOffsetPx
    );

    if (sameRow(startAnchor, endAnchor)) {
      elements.push(
        createCurveSvg({
          from: { x: startAnchor.x, y: startAnchor.y },
          to: { x: endAnchor.x, y: endAnchor.y },
          bulge,
          label,
          style,
          nestingLevel: pair.nestingLevel,
        })
      );
      continue;
    }

    // Cross-row: split at start-row right edge and end-row left edge.
    elements.push(
      createCurveSvg({
        from: { x: startAnchor.x, y: startAnchor.y },
        to: { x: rowRight, y: startAnchor.y },
        bulge,
        label,
        style,
        nestingLevel: pair.nestingLevel,
      })
    );
    elements.push(
      createCurveSvg({
        from: { x: rowLeft, y: endAnchor.y },
        to: { x: endAnchor.x, y: endAnchor.y },
        bulge,
        style,
        nestingLevel: pair.nestingLevel,
      })
    );
  }

  return elements;
};
