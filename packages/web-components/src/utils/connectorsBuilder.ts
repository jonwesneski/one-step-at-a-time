import { resolveArpeggioTiePairings } from '../rules/arpeggioRules';
import {
  ArpeggioElementType,
  ChordElementType,
  ConnectorRole,
  NoteElementType,
  NoteLikeElementType,
} from '../types/elements';
import {
  MUSIC_ARPEGGIO,
  MUSIC_CHORD,
  MUSIC_GUITAR_NOTE,
  MUSIC_MEASURE,
  MUSIC_NOTE,
} from './consts';
import { createCurveSvg, CurveBulge } from './svgCreator';
import {
  computeYHeadOffset,
  NOTE_HEAD_Y_OFFSET_CORRECTION,
} from './svgCreator/note';

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
  // Set for a synthesized `<music-arpeggio>` run→chord tie: `start` is the run
  // note, `end` is the target chord, anchored at tone `targetToneIndex`.
  // `runNotes` is the whole run (for divided-tie obstacle detection).
  arpeggioRun?: {
    targetToneIndex: number;
    runNotes: readonly NoteLikeElementType[];
  };
};

export const collectNoteLikeElements = (
  root: ParentNode
): NoteLikeElementType[] => {
  const chordChildSelectors = Object.values(CONNECTOR_ATTRS)
    .map((attr) => `${MUSIC_CHORD} ${MUSIC_NOTE}[${attr}]`)
    .join(', ');
  const selector = `${MUSIC_NOTE}:not(${MUSIC_CHORD} ${MUSIC_NOTE}), ${MUSIC_GUITAR_NOTE}, ${MUSIC_CHORD}, ${chordChildSelectors}`;
  return Array.from(root.querySelectorAll<NoteLikeElementType>(selector));
};

// Synthesizes the run→chord ties of every `<music-arpeggio>` under `root`.
// These are not authored `tie` attributes, so `pairConnectors` never sees them;
// callers concat this with `pairConnectors(collectNoteLikeElements(root))`.
export const collectArpeggioTiePairs = (root: ParentNode): ConnectorPair[] => {
  const pairs: ConnectorPair[] = [];
  for (const element of Array.from(
    root.querySelectorAll(MUSIC_ARPEGGIO)
  ) as ArpeggioElementType[]) {
    const runNotes = element.runElements;
    const target = element.targetElement;
    if (runNotes.length === 0 || target === null) {
      continue;
    }
    const { pairings, warnings } = resolveArpeggioTiePairings(
      runNotes,
      target,
      element.unmatched
    );
    for (const warning of warnings) {
      console.warn(warning);
    }
    for (const pairing of pairings) {
      // Phase 3 renders 'laissez-vibrer' pairings; for now only tied ones.
      if (pairing.variant !== 'run-to-chord') {
        continue;
      }
      pairs.push({
        kind: 'tie',
        start: pairing.runNote as unknown as NoteLikeElementType,
        end: target as unknown as NoteLikeElementType,
        nestingLevel: 0,
        arpeggioRun: {
          targetToneIndex: pairing.targetToneIndex,
          runNotes: runNotes as unknown as readonly NoteLikeElementType[],
        },
      });
    }
  }
  return pairs;
};

const readRole = (
  element: HTMLElement,
  attribute: string
): ConnectorRole | null => {
  const raw = element.getAttribute(attribute);
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
    start.tagName.toLowerCase() !== MUSIC_NOTE ||
    end.tagName.toLowerCase() !== MUSIC_NOTE
  ) {
    return undefined;
  }
  const startValue = start.getAttribute('note');
  const endValue = end.getAttribute('note');
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
  const measure = note.closest(MUSIC_MEASURE) as HTMLElement | null;
  const ref = measure ?? note;
  return ref.getBoundingClientRect().top - rootRect.top;
};

// Notehead visual radius ≈ 4.3px (rotated ellipse + stroke). 5px clears the
// edge so the arc endpoint visibly departs from the notehead, almost touching
// it without overlapping.
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
    note.tagName.toLowerCase() === MUSIC_NOTE &&
    note.parentElement?.tagName.toLowerCase() === MUSIC_CHORD
  ) {
    const chord = note.parentElement as unknown as ChordElementType;
    const chordRect = chord.getBoundingClientRect();
    const chordNotes = Array.from(chord.querySelectorAll(MUSIC_NOTE));
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
  if (note.tagName.toLowerCase() === MUSIC_GUITAR_NOTE) {
    const edgeOffset = bulge === 'above' ? -noteheadOffsetPx : noteheadOffsetPx;
    return {
      x: centerX,
      y: rect.top - rootRect.top + edgeOffset,
      rowTop: getRowTop(note, rootRect),
    };
  }

  let y: number;
  if (note.tagName.toLowerCase() === MUSIC_CHORD) {
    const chordElement = note as ChordElementType;
    const yCoords = chordElement.staffYCoordinates;
    if (yCoords && yCoords.length > 0) {
      const noteheadY =
        bulge === 'above' ? Math.min(...yCoords) : Math.max(...yCoords);
      const edgeOffset = chordElement.stemUp
        ? noteheadOffsetPx
        : -noteheadOffsetPx;
      y = rect.top - rootRect.top + noteheadY + edgeOffset;
    } else {
      y =
        bulge === 'above'
          ? rect.top - rootRect.top
          : rect.bottom - rootRect.top;
    }
  } else {
    const noteEl = note as unknown as NoteElementType;
    // computeYHeadOffset includes NOTE_HEAD_Y_OFFSET_CORRECTION (+10), a CSS
    // positioning fudge that makes rect.top + noteheadY land on the staff line,
    // not the notehead pixel center. Subtract it to get the actual notehead
    // center within the SVG viewport before applying the edge offset.
    const noteheadCenterPx =
      computeYHeadOffset(noteEl.stemUp, noteEl.duration, noteEl.noFlags) -
      NOTE_HEAD_Y_OFFSET_CORRECTION;
    const edgeOffset = noteEl.stemUp ? noteheadOffsetPx : -noteheadOffsetPx;
    y = rect.top - rootRect.top + noteheadCenterPx + edgeOffset;
  }

  return {
    x: centerX,
    y,
    rowTop: getRowTop(note, rootRect),
  };
};

// Anchor on a specific tone of a chord, preferring the tone's real rendered
// notehead x (so second-interval / clustered chords with displaced heads tie
// correctly). Falls back to the chord bounding-box centre + staff Y when the
// chord's shadow DOM is not populated (jsdom / standalone-degraded).
const computeChordToneAnchor = (
  chord: NoteLikeElementType,
  toneIndex: number,
  rootRect: DOMRect,
  bulge: CurveBulge,
  noteheadOffsetPx: number
): Anchor => {
  const chordRect = chord.getBoundingClientRect();
  const edgeOffset = bulge === 'above' ? -noteheadOffsetPx : noteheadOffsetPx;
  const rowTop = getRowTop(chord, rootRect);

  const heads = chord.shadowRoot?.querySelectorAll<SVGGraphicsElement>(
    'svg.chord > svg .head'
  );
  const head = heads?.[toneIndex];
  if (head) {
    const rect = head.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      return {
        x: rect.left + rect.width / 2 - rootRect.left,
        y: rect.top + rect.height / 2 - rootRect.top + edgeOffset,
        rowTop,
      };
    }
  }

  const yCoords = (chord as ChordElementType).staffYCoordinates;
  if (yCoords && toneIndex >= 0 && toneIndex < yCoords.length) {
    return {
      x: chordRect.left + chordRect.width / 2 - rootRect.left,
      y: chordRect.top - rootRect.top + yCoords[toneIndex] + edgeOffset,
      rowTop,
    };
  }
  return {
    x: chordRect.left + chordRect.width / 2 - rootRect.left,
    y: chordRect.top - rootRect.top + edgeOffset,
    rowTop,
  };
};

const sameRow = (a: Anchor, b: Anchor): boolean =>
  Math.abs(a.rowTop - b.rowTop) <= ROW_TOLERANCE_PX;

const pickBulge = (note: NoteLikeElementType): CurveBulge => {
  // Stems up → notehead on the staff, bulge above (opposite side of stem tip? no,
  // ties/slurs bulge AWAY from the stem — stems up = curve below; stems down = curve above).
  // For guitar tab there are no stems, default to above.
  if (note.tagName.toLowerCase() === MUSIC_GUITAR_NOTE) {
    return 'above';
  }

  // For notes inside a chord, stemUp is set on the chord element, not the note.
  const sourceElement =
    note.tagName.toLowerCase() === MUSIC_NOTE &&
    note.parentElement?.tagName.toLowerCase() === MUSIC_CHORD
      ? note.parentElement
      : note;

  const stemUp = (sourceElement as NoteElementType | ChordElementType).stemUp;
  return stemUp ? 'below' : 'above';
};

// For chord ties: each note's tie curves outward from the chord's vertical midpoint
// (top notes curve above, bottom notes curve below). This is position-based, not
// stem-based — standard engraving practice.
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
    const startBulge = pickBulge(pair.start);
    const endBulge = pair.kind === 'tie' ? pickBulge(pair.end) : startBulge;
    const style = pair.kind === 'slide' ? 'straight' : 'smooth';
    const label = CONNECTOR_LABELS[pair.kind];

    // Synthesized `<music-arpeggio>` run→chord tie: run note (real box) to one
    // tone of the target chord, fanned outward by tone position.
    if (pair.arpeggioRun) {
      const toneIndex = pair.arpeggioRun.targetToneIndex;
      const endCoords =
        (pair.end as unknown as ChordElementType).staffYCoordinates ?? [];
      const toneBulge =
        endCoords.length > 1
          ? pickChordNoteBulge(pair.end, endCoords, toneIndex)
          : startBulge;
      const startAnchor = computeAnchor(
        pair.start,
        rootRect,
        toneBulge,
        TIE_NOTEHEAD_OFFSET_PX
      );
      const endAnchor = computeChordToneAnchor(
        pair.end,
        toneIndex,
        rootRect,
        toneBulge,
        TIE_NOTEHEAD_OFFSET_PX
      );
      // A `<music-arpeggio>` group is one gesture at a single x position, so its
      // ties never span a system break — always one curve.
      elements.push(
        createCurveSvg({
          from: { x: startAnchor.x, y: startAnchor.y },
          to: { x: endAnchor.x, y: endAnchor.y },
          bulge: toneBulge,
          style,
          nestingLevel: pair.nestingLevel,
        })
      );
      continue;
    }

    const isChordTie =
      pair.kind === 'tie' &&
      pair.start.tagName.toLowerCase() === MUSIC_CHORD &&
      pair.end.tagName.toLowerCase() === MUSIC_CHORD;

    if (isChordTie) {
      const startCoords =
        (pair.start as unknown as ChordElementType).staffYCoordinates ?? [];
      const endCoords =
        (pair.end as unknown as ChordElementType).staffYCoordinates ?? [];
      const count = Math.min(startCoords.length, endCoords.length);

      for (let i = 0; i < count; i++) {
        const noteBulge = pickChordNoteBulge(pair.start, startCoords, i);
        const noteEndBulge = pickChordNoteBulge(pair.end, endCoords, i);
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
          noteEndBulge,
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
      startBulge,
      noteheadOffsetPx
    );
    const endAnchor = computeAnchor(
      pair.end,
      rootRect,
      endBulge,
      noteheadOffsetPx
    );

    if (sameRow(startAnchor, endAnchor)) {
      elements.push(
        createCurveSvg({
          from: { x: startAnchor.x, y: startAnchor.y },
          to: { x: endAnchor.x, y: endAnchor.y },
          bulge: startBulge,
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
        bulge: startBulge,
        label,
        style,
        nestingLevel: pair.nestingLevel,
      })
    );
    elements.push(
      createCurveSvg({
        from: { x: rowLeft, y: endAnchor.y },
        to: { x: endAnchor.x, y: endAnchor.y },
        bulge: endBulge,
        style,
        nestingLevel: pair.nestingLevel,
      })
    );
  }

  return elements;
};
