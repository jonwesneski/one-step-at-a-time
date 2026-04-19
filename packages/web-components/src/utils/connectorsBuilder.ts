import { ConnectorRole, NoteLikeElementType } from '../types/elements';
import { createCurveSvg, CurveBulge, CurveSplit } from './svgCreator';

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
};

export type ConnectorPair = {
  kind: ConnectorKind;
  start: NoteLikeElementType;
  end: NoteLikeElementType;
};

export const collectNoteLikeElements = (
  root: ParentNode
): NoteLikeElementType[] => {
  const selector = 'music-note, music-guitar-note';
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
  const pairs: ConnectorPair[] = [];
  const stacks: Record<ConnectorKind, ConnectorEndpoint[]> = {
    tie: [],
    slur: [],
    'hammer-on': [],
    'pull-off': [],
    slide: [],
  };

  const kinds = Object.keys(stacks) as ConnectorKind[];

  for (const note of notes) {
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

      pairs.push({
        kind,
        start: startEntry.note,
        end: note,
      });
    }
  }

  for (const kind of kinds) {
    for (const leftover of stacks[kind]) {
      console.warn(
        `[connectorsBuilder] unbalanced ${kind} start (no matching end)`,
        leftover.note
      );
    }
  }

  return pairs;
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

const computeAnchor = (
  note: NoteLikeElementType,
  rootRect: DOMRect,
  bulge: CurveBulge
): Anchor => {
  const rect = note.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2 - rootRect.left;
  const y =
    bulge === 'above' ? rect.top - rootRect.top : rect.bottom - rootRect.top;
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

  // Read the note's runtime stemUp state if available; fall back to above.
  const stemUp = (note as unknown as { stemUp?: boolean }).stemUp;
  return stemUp === false ? 'above' : 'below';
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

    const startAnchor = computeAnchor(pair.start, rootRect, bulge);
    const endAnchor = computeAnchor(pair.end, rootRect, bulge);

    if (sameRow(startAnchor, endAnchor)) {
      elements.push(
        createCurveSvg({
          from: { x: startAnchor.x, y: startAnchor.y },
          to: { x: endAnchor.x, y: endAnchor.y },
          bulge,
          label,
          style,
        })
      );
      continue;
    }

    // Cross-row: split at start-row right edge and end-row left edge.
    const openRight: CurveSplit = 'open-right';
    const openLeft: CurveSplit = 'open-left';

    elements.push(
      createCurveSvg({
        from: { x: startAnchor.x, y: startAnchor.y },
        to: { x: rowRight, y: startAnchor.y },
        bulge,
        label,
        style,
        split: openRight,
      })
    );
    elements.push(
      createCurveSvg({
        from: { x: rowLeft, y: endAnchor.y },
        to: { x: endAnchor.x, y: endAnchor.y },
        bulge,
        style,
        split: openLeft,
      })
    );
  }

  return elements;
};
