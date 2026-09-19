import { resolveArpeggioTiePairings } from '../rules/arpeggioRules';
import { computeGraceFootprintWidth } from '../rules/graceRules';
import type {
  ArpeggioElementType,
  ChordElementType,
  ConnectorRole,
  NoteElementType,
  NoteLikeElementType,
} from '../types/elements';
import { VoiceNumber } from '../types/theory';
import {
  MUSIC_ARPEGGIO,
  MUSIC_CHORD,
  MUSIC_GUITAR_NOTE,
  MUSIC_MEASURE,
  MUSIC_NOTE,
  MUSIC_VOICE,
  MUSIC_VOICE_NODE,
  STAFF_TAGS,
} from './consts';
import {
  ARPEGGIO_RUN_DIVIDED_TIE_GAP_HALF_PX,
  ARPEGGIO_RUN_TIE_OBSCURE_CLEARANCE_PX,
  ARPEGGIO_RUN_TIE_STUB_LENGTH_PX,
  LAISSEZ_VIBRER_CURVE_LENGTH_PX,
  TRILL_WRITTEN_NOTE_GAP_PX,
} from './notationDimensions';
import {
  computeWrittenTrillNoteWidth,
  createCurveSvg,
  createOpenTieSvg,
  CurveBulge,
  DEFAULT_BULGE_HEIGHT,
} from './svgCreator';
import {
  computeYHeadOffset,
  NOTE_HEAD_Y_OFFSET_CORRECTION,
  NOTE_SVG_WIDTH,
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
  // `tie="laissez-vibrer"` — an open-ended tie. `start === end`. For a chord,
  // `lvToneIndex` picks the tone.
  laissezVibrer?: boolean;
  lvToneIndex?: number;
  /** `l.v.` when the element sets `lv-label`. */
  label?: string;
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

// Resolves a note-like element's voice number from its nearest <music-voice>
// ancestor's sibling position (1st <music-voice> sibling = voice 1, 2nd =
// voice 2, 3rd = voice 3) — falls back to voice 1 when there is no
// <music-voice> ancestor at all (the ordinary single-voice case).
function resolveVoiceNumber(note: NoteLikeElementType): VoiceNumber {
  const voiceElement = note.closest(MUSIC_VOICE);
  if (voiceElement === null || voiceElement.parentElement === null) {
    return 1;
  }
  const siblingVoices = Array.from(voiceElement.parentElement.children).filter(
    (child) => child.nodeName === MUSIC_VOICE_NODE
  );
  const position = siblingVoices.indexOf(voiceElement);
  return ((position === -1 ? 0 : position) + 1) as VoiceNumber;
}

// Groups note-like elements by voice — the fix for cross-voice tie/slur
// mispairing: today's LIFO stack-top fallback in pairConnectors (used
// whenever a tie/slur has no explicit `for="id"`) would incorrectly let a
// voice-2 note with no `for` pop a voice-1 tie's stack entry when voices
// interleave in document order. Callers partition first, then pair each
// voice's own notes independently:
//   const byVoice = partitionByVoice(collectNoteLikeElements(root));
//   const pairs = [...byVoice.values()].flatMap((notes) => pairConnectors(notes));
export function partitionByVoice(
  notes: readonly NoteLikeElementType[]
): Map<VoiceNumber, NoteLikeElementType[]> {
  const result = new Map<VoiceNumber, NoteLikeElementType[]>();
  for (const note of notes) {
    const voiceNumber = resolveVoiceNumber(note);
    const bucket = result.get(voiceNumber);
    if (bucket) {
      bucket.push(note);
    } else {
      result.set(voiceNumber, [note]);
    }
  }
  return result;
}

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
    const lvLabel = element.lvLabel ? 'l.v.' : undefined;
    for (const pairing of pairings) {
      if (pairing.variant === 'laissez-vibrer') {
        pairs.push({
          kind: 'tie',
          start: pairing.runNote as unknown as NoteLikeElementType,
          end: pairing.runNote as unknown as NoteLikeElementType,
          nestingLevel: 0,
          laissezVibrer: true,
          label: lvLabel,
        });
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
      if (kind === 'tie') {
        const raw = note.getAttribute('tie');
        if (raw === 'laissez-vibrer' || raw === 'lv') {
          const label = (note as { lvLabel?: boolean }).lvLabel
            ? 'l.v.'
            : undefined;
          const isChord = note.tagName.toLowerCase() === MUSIC_CHORD;
          const toneCount = isChord
            ? Math.max(
                1,
                ((note as ChordElementType).staffYCoordinates ?? []).length
              )
            : 1;
          for (let toneIndex = 0; toneIndex < toneCount; toneIndex++) {
            indexedPairs.push({
              kind: 'tie',
              start: note,
              end: note,
              nestingLevel: 0,
              startIndex: noteIndex,
              endIndex: noteIndex,
              laissezVibrer: true,
              lvToneIndex: isChord ? toneIndex : undefined,
              label,
            });
          }
          continue;
        }
      }

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
    laissezVibrer: pair.laissezVibrer,
    lvToneIndex: pair.lvToneIndex,
    label: pair.label,
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
  // actual visual row. A standalone staff (no measure) never wraps, so its own
  // box is the row reference — falling back to the note there would split every
  // slur/tie wider than a 2nd into cross-row halves.
  const rowReference =
    (note.closest(MUSIC_MEASURE) as HTMLElement | null) ??
    (note.closest(STAFF_TAGS) as HTMLElement | null) ??
    note;
  return rowReference.getBoundingClientRect().top - rootRect.top;
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

// `createCurveSvg`'s control point is the horizontal midpoint, so x is linear
// in t. Returns the tie curve's y at a given x, or null when x is outside the
// span.
const tieCurveYAt = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  bulge: CurveBulge,
  x: number
): number | null => {
  const span = to.x - from.x;
  if (span === 0) {
    return null;
  }
  const t = (x - from.x) / span;
  if (t <= 0 || t >= 1) {
    return null;
  }
  const midY =
    (from.y + to.y) / 2 + (bulge === 'above' ? -1 : 1) * DEFAULT_BULGE_HEIGHT;
  const mt = 1 - t;
  return mt * mt * from.y + 2 * mt * t * midY + t * t * to.y;
};

// True when a notehead centre in `obstacles` lies close enough to the tie curve
// to be obscured — the tie should then be divided into two open stubs.
const tieIsObscured = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  bulge: CurveBulge,
  obstacles: readonly { x: number; y: number }[]
): boolean =>
  obstacles.some((obstacle) => {
    const curveY = tieCurveYAt(from, to, bulge, obstacle.x);
    return (
      curveY !== null &&
      Math.abs(curveY - obstacle.y) <= ARPEGGIO_RUN_TIE_OBSCURE_CLEARANCE_PX
    );
  });

// Notehead centre (root-rect space) of a note-like element, preferring the real
// rendered `.head` rect over the element's own (tall) layout box.
const noteheadCenter = (
  element: NoteLikeElementType,
  rootRect: DOMRect
): { x: number; y: number } => {
  const head = element.shadowRoot?.querySelector<SVGGraphicsElement>('.head');
  const rect = (head ?? element).getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2 - rootRect.left,
    y: rect.top + rect.height / 2 - rootRect.top,
  };
};

// Notehead centres (root-rect space) of a chord's tones other than `exceptIndex`.
const chordOtherToneCenters = (
  chord: NoteLikeElementType,
  exceptIndex: number,
  rootRect: DOMRect
): { x: number; y: number }[] => {
  const heads = chord.shadowRoot?.querySelectorAll<SVGGraphicsElement>(
    'svg.chord > svg .head'
  );
  if (!heads) {
    return [];
  }
  const centers: { x: number; y: number }[] = [];
  heads.forEach((head, index) => {
    if (index === exceptIndex) {
      return;
    }
    const rect = head.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      centers.push({
        x: rect.left + rect.width / 2 - rootRect.left,
        y: rect.top + rect.height / 2 - rootRect.top,
      });
    }
  });
  return centers;
};

// A tie must not run through a written trilling notehead (trill-note) or a
// trill's finishing grace note(s) (trill-finish) — nudge the tie's start
// point past whichever (or both — summed, harmless in that rare combination
// since the two decorations aren't laid out to coexist cleanly anyway)
// reserve space there, computed analytically (matching
// computeWrittenTrillNoteWidth's/computeGraceFootprintWidth's own math)
// rather than queried from the DOM. The written notehead is drawn by the
// staff's own overlay; the finishing grace note(s) are drawn locally inside
// the note/chord's own shadow DOM — neither is reachable via
// getBoundingClientRect() from here. Approximation: when a short main note
// defers its written notehead to the second tied note (see
// rules/trillRules.ts's writtenNoteAnchorIndex), this still nudges from the
// first note's own position — a harmless overshoot in that rare
// combination, not a visual bug.
const tieStartTrillNudgePx = (note: NoteLikeElementType): number => {
  const tag = note.tagName.toLowerCase();
  if (tag !== MUSIC_NOTE && tag !== MUSIC_CHORD) {
    return 0;
  }
  const trillCapableNote = note as NoteElementType | ChordElementType;
  let nudge = 0;
  if (trillCapableNote.resolvedTrillPitch?.written === true) {
    // computeAnchor's startAnchor.x is the note's own rendered *center*
    // (rect.left + rect.width / 2), but the written notehead's own leftX
    // (see staffClassicalBase.ts#drawWrittenTrillNote) starts a full
    // NOTE_SVG_WIDTH past the note's *left* edge — half a notehead further
    // right than the center. Add that half-width back in, or the nudge
    // lands short.
    nudge +=
      NOTE_SVG_WIDTH / 2 +
      TRILL_WRITTEN_NOTE_GAP_PX +
      computeWrittenTrillNoteWidth(
        trillCapableNote.resolvedTrillPitch.accidental
      );
  }
  const trillFinish = trillCapableNote.trillFinish;
  if (trillFinish !== null && trillFinish.length > 0) {
    // Same center-to-left-edge correction as above; the finishing group's
    // own anchor (see svgCreator/graceNotes.ts#createTrillFinishNotesSvg)
    // starts at that same NOTE_SVG_WIDTH point, and
    // computeGraceFootprintWidth already includes the gap before it. A
    // single (non-group) finishing note also has its own stem, extending a
    // couple more px right of this reserved width — clearing the notehead
    // itself (the real collision risk) is what this targets; grazing a thin
    // stem line is a minor cosmetic gap, not pursued further here.
    nudge +=
      NOTE_SVG_WIDTH / 2 +
      computeGraceFootprintWidth(
        trillFinish,
        trillCapableNote.resolvedTrillFinishAccidentals
      );
  }
  return nudge;
};

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

    // Laissez-vibrer: an open-ended tie curving forward off the notehead.
    if (pair.laissezVibrer) {
      const isChord = pair.start.tagName.toLowerCase() === MUSIC_CHORD;
      const coords =
        (pair.start as unknown as ChordElementType).staffYCoordinates ?? [];
      const lvBulge =
        isChord && coords.length > 1 && pair.lvToneIndex !== undefined
          ? pickChordNoteBulge(pair.start, coords, pair.lvToneIndex)
          : startBulge;
      const anchor =
        isChord && pair.lvToneIndex !== undefined
          ? computeChordToneAnchor(
              pair.start,
              pair.lvToneIndex,
              rootRect,
              lvBulge,
              TIE_NOTEHEAD_OFFSET_PX
            )
          : computeAnchor(
              pair.start,
              rootRect,
              lvBulge,
              TIE_NOTEHEAD_OFFSET_PX
            );
      elements.push(
        createOpenTieSvg({
          anchor: { x: anchor.x, y: anchor.y },
          direction: 1,
          length: LAISSEZ_VIBRER_CURVE_LENGTH_PX,
          bulge: lvBulge,
          label: pair.label,
        })
      );
      continue;
    }

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
      // ties never span a system break — always one curve (or two stubs).
      const obstacles = [
        ...chordOtherToneCenters(pair.end, toneIndex, rootRect),
        ...pair.arpeggioRun.runNotes
          .filter((runNote) => runNote !== pair.start)
          .map((runNote) => noteheadCenter(runNote, rootRect)),
      ];

      if (tieIsObscured(startAnchor, endAnchor, toneBulge, obstacles)) {
        const halfSpan = Math.abs(endAnchor.x - startAnchor.x) / 2;
        const stubLength = Math.max(
          2,
          Math.min(
            ARPEGGIO_RUN_TIE_STUB_LENGTH_PX,
            halfSpan - ARPEGGIO_RUN_DIVIDED_TIE_GAP_HALF_PX
          )
        );
        const forward = endAnchor.x >= startAnchor.x ? 1 : -1;
        elements.push(
          createOpenTieSvg({
            anchor: startAnchor,
            direction: forward === 1 ? 1 : -1,
            length: stubLength,
            bulge: toneBulge,
          })
        );
        elements.push(
          createOpenTieSvg({
            anchor: endAnchor,
            direction: forward === 1 ? -1 : 1,
            length: stubLength,
            bulge: toneBulge,
          })
        );
        continue;
      }

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
    if (pair.kind === 'tie') {
      startAnchor.x += tieStartTrillNudgePx(pair.start);
    }
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
