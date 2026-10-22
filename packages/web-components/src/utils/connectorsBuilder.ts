import { resolveArpeggioTiePairings } from '../rules/arpeggioRules';
import {
  computeNestingLevels,
  consecutivePhrasePairs,
  CurvePoint,
  isCurveObscured,
  isInnerVoicePosition,
  ObstacleRect,
  oppositeSide,
  pickChordToneSide,
  pickCrossStaffSlurSide,
  pickStemSide,
  resolveRectClearingBulgeHeight,
  resolveSlurCurve,
  sliceConvexPolygon,
  slurAnchorKind,
  SlurCurveResolution,
} from '../rules/connectorPlacementRules';
import {
  DoubleStemmedBeamEntry,
  DoubleStemmedBeamGroup,
  resolveDoubleStemmedBeamGroups,
} from '../rules/doubleStemmedBeamRules';
import { computeGraceFootprintWidth } from '../rules/graceRules';
import type {
  ArpeggioElementType,
  ChordElementType,
  ConnectorRole,
  NoteChordOrRestElementType,
  NoteElementType,
  NoteLikeElementType,
  NoteOrChordElementType,
  StaffElementBaseType,
} from '../types/elements';
import { GlissandoHint, VoiceNumber } from '../types/theory';
import {
  isStaffNodeName,
  MUSIC_ARPEGGIO,
  MUSIC_CHORD,
  MUSIC_GUITAR_NOTE,
  MUSIC_MEASURE,
  MUSIC_NOTE,
  MUSIC_REST,
  MUSIC_VOICE,
  MUSIC_VOICE_NODE,
  STAFF_TAGS,
} from './consts';
import {
  ARPEGGIO_RUN_DIVIDED_TIE_GAP_HALF_PX,
  ARPEGGIO_RUN_TIE_OBSCURE_CLEARANCE_PX,
  ARPEGGIO_RUN_TIE_STUB_LENGTH_PX,
  CROSS_STAFF_SLUR_BULGE_SPAN_RATIO,
  LAISSEZ_VIBRER_CURVE_LENGTH_PX,
  SLUR_BEAM_SLICE_WIDTH_PX,
  SLUR_BEYOND_BEAM_CLEARANCE_PX,
  SLUR_CONTROL_HEIGHT_MAX_RATIO,
  SLUR_OBSTACLE_CLEARANCE_PX,
  SLUR_STEM_END_CLEARANCE_PX,
  STAFF_LINE_SPACING,
  TRILL_WRITTEN_NOTE_GAP_PX,
} from './notationDimensions';
import { parseGlissandoHint } from './parsers';
import {
  BULGE_STEP_PX,
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

export type ConnectorKind =
  | 'tie'
  | 'slur'
  | 'hammer-on'
  | 'pull-off'
  | 'slide'
  | 'glissando';

const CONNECTOR_ATTRS: Record<ConnectorKind, string> = {
  tie: 'tie',
  slur: 'slur',
  'hammer-on': 'hammer-on',
  'pull-off': 'pull-off',
  slide: 'slide',
  glissando: 'glissando',
};

const CONNECTOR_LABELS: Partial<Record<ConnectorKind, string>> = {
  'hammer-on': 'H',
  'pull-off': 'P',
};

// Text shown near a glissando line when its start element sets
// `glissando-hint` — standard keyboard engraving practice for clarifying
// which keys the line slides across.
const GLISSANDO_HINT_LABELS: Record<GlissandoHint, string> = {
  'white-key': 'white-note gliss.',
  'black-key': 'black-note gliss.',
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

// Collects every note/chord sharing a slur-group id, orders them by real
// rendered x (temporal order — same-beat entries land at the same x by
// construction, see SVG Coordinate System in CLAUDE.md), and produces one
// ordinary ConnectorPair per consecutive pair — each flows through
// buildConnectorSvgs exactly like any other slur pair. Grand-staff/classical
// specific (note/chord only) — mirrors beam-group's own N:M shared-key
// shape rather than slur's single-valued start/end pair, since a "phrase
// slur" spanning more than 2 breakpoints needs a note (the last note of
// one leg, first of the next) to be simultaneously an end and a start,
// which `slur`'s single attribute value and pairConnectors's LIFO stack
// cannot express. Callers concat this with
// pairConnectors(...)/collectArpeggioTiePairs(root), same shape as the
// latter is already concatenated in today.
export const collectPhraseSlurPairs = (root: ParentNode): ConnectorPair[] => {
  const selector = `${MUSIC_NOTE}[slur-group]:not(${MUSIC_CHORD} ${MUSIC_NOTE}), ${MUSIC_CHORD}[slur-group]`;
  const elements = Array.from(
    root.querySelectorAll(selector)
  ) as NoteLikeElementType[];

  const groups = new Map<string, NoteLikeElementType[]>();
  for (const element of elements) {
    const groupId = element.getAttribute('slur-group');
    if (groupId === null) {
      continue;
    }
    const bucket = groups.get(groupId);
    if (bucket) {
      bucket.push(element);
    } else {
      groups.set(groupId, [element]);
    }
  }

  const pairs: ConnectorPair[] = [];
  for (const [groupId, members] of groups) {
    if (members.length < 2) {
      console.warn(
        `[connectorsBuilder] slur-group "${groupId}" has only one member; nothing to connect`
      );
      continue;
    }
    const ordered = consecutivePhrasePairs(
      members.map((member) => ({
        item: member,
        x: member.getBoundingClientRect().left,
      }))
    );
    for (const [start, end] of ordered) {
      pairs.push({ kind: 'slur', start, end, nestingLevel: 0 });
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
    glissando: [],
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

      const glissandoHint =
        kind === 'glissando'
          ? parseGlissandoHint(startEntry.note.getAttribute('glissando-hint'))
          : null;

      indexedPairs.push({
        kind,
        start: startEntry.note,
        end: note,
        nestingLevel: 0,
        startIndex: startEntry.startIndex,
        endIndex: noteIndex,
        label: glissandoHint ? GLISSANDO_HINT_LABELS[glissandoHint] : undefined,
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

  const nestingLevels = computeNestingLevels(indexedPairs);
  return indexedPairs.map((pair, index) => ({
    kind: pair.kind,
    start: pair.start,
    end: pair.end,
    laissezVibrer: pair.laissezVibrer,
    lvToneIndex: pair.lvToneIndex,
    label: pair.label,
    nestingLevel: nestingLevels[index],
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

// `sideAware` places the anchor on `bulge`'s side of the notehead; otherwise
// a plain note or chord anchors opposite its stem (a tie or same-staff slur,
// whose side already is opposite the stem).
const computeAnchor = (
  note: NoteLikeElementType,
  rootRect: DOMRect,
  bulge: CurveBulge,
  noteheadOffsetPx: number,
  sideAware = false
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
      const offsetBelow = sideAware ? bulge === 'below' : chordElement.stemUp;
      const edgeOffset = offsetBelow ? noteheadOffsetPx : -noteheadOffsetPx;
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
    const offsetBelow = sideAware ? bulge === 'below' : noteEl.stemUp;
    const edgeOffset = offsetBelow ? noteheadOffsetPx : -noteheadOffsetPx;
    y = rect.top - rootRect.top + noteheadCenterPx + edgeOffset;
  }

  return {
    x: centerX,
    y,
    rowTop: getRowTop(note, rootRect),
  };
};

// A slur's stem-end anchor — used instead of computeAnchor's notehead
// anchor when the notehead anchor would be obscured by (or too close to) a
// double-stemmed beam, or unconditionally for an inner-voice beam-group
// member (see isInnerVoiceMember) whose ordinary opposite-of-stem territory
// is occupied by another voice sharing its staff. Pulled back SLUR_STEM_END_CLEARANCE_PX from the true tip — the
// bare tip itself is exactly where the beam (or that other voice's own
// content) sits, so anchoring precisely at it would touch it, not clear
// it. Returns null when the note has no real stem (a whole note, or
// standalone/degraded rendering with no shadow DOM) — callers fall back to
// computeAnchor in that case.
const computeStemEndAnchor = (
  note: NoteLikeElementType,
  rootRect: DOMRect
): Anchor | null => {
  const stem = note.shadowRoot?.querySelector<SVGGraphicsElement>('.stem');
  if (!stem) {
    return null;
  }
  const rect = stem.getBoundingClientRect();
  const stemUp = (note as NoteElementType | ChordElementType).stemUp;
  const tipY = stemUp
    ? rect.top + SLUR_STEM_END_CLEARANCE_PX
    : rect.bottom - SLUR_STEM_END_CLEARANCE_PX;
  return {
    x: rect.left + rect.width / 2 - rootRect.left,
    y: tipY - rootRect.top,
    rowTop: getRowTop(note, rootRect),
  };
};

// A cross-staff slur endpoint anchor past the stem's own tip, on the far side
// from the notehead — used when the stem points toward the slur's side (see
// rules/connectorPlacementRules.ts#slurAnchorKind), so the curve clears that
// note's own beam or flag instead of reaching through it to the notehead.
// Returns null when the note has no real stem — callers fall back to the
// notehead anchor.
const computeBeyondBeamAnchor = (
  note: NoteLikeElementType,
  rootRect: DOMRect
): Anchor | null => {
  const stem = note.shadowRoot?.querySelector<SVGGraphicsElement>('.stem');
  if (!stem) {
    return null;
  }
  const rect = stem.getBoundingClientRect();
  const stemUp = (note as NoteElementType | ChordElementType).stemUp;
  const tipY = stemUp
    ? rect.top - SLUR_BEYOND_BEAM_CLEARANCE_PX
    : rect.bottom + SLUR_BEYOND_BEAM_CLEARANCE_PX;
  return {
    x: rect.left + rect.width / 2 - rootRect.left,
    y: tipY - rootRect.top,
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

// True when two notes belong to different <music-staff>-family ancestors —
// a genuine cross-staff pair (e.g. a hand-crossing passage's slur), as
// opposed to two notes that merely happen to be far apart on one staff.
const onDifferentStaves = (
  a: NoteLikeElementType,
  b: NoteLikeElementType
): boolean => {
  const staffA = a.closest(STAFF_TAGS);
  const staffB = b.closest(STAFF_TAGS);
  return staffA !== null && staffB !== null && staffA !== staffB;
};

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

// For notes inside a chord, stemUp is set on the chord element, not the note.
const stemSourceOf = (note: NoteLikeElementType): NoteLikeElementType =>
  note.tagName.toLowerCase() === MUSIC_NOTE &&
  note.parentElement?.tagName.toLowerCase() === MUSIC_CHORD
    ? (note.parentElement as unknown as NoteLikeElementType)
    : note;

const pickBulge = (note: NoteLikeElementType): CurveBulge =>
  pickStemSide({
    stemUp: Boolean(
      (stemSourceOf(note) as NoteElementType | ChordElementType).stemUp
    ),
    isGuitarNote: note.tagName.toLowerCase() === MUSIC_GUITAR_NOTE,
  });

const pickChordNoteBulge = (
  chord: NoteLikeElementType,
  yCoords: readonly number[],
  index: number
): CurveBulge => pickChordToneSide(yCoords, index, pickBulge(chord));

// True when element is a real, non-outermost voice sharing its own staff
// with another concurrently-sounding voice — "when a double-stemmed group
// is an inner part" per the reference engraving material's own
// articulation-placement rule (see measure.ts#redrawDoubleStemmedBeams'
// articulationAnchorsToStem write-back, which this mirrors for slur
// stem-end anchoring). A staff with zero or one <music-voice> children is
// never "inner" (the ordinary single-voice case); voice 1 (the first
// <music-voice> sibling) is the canonical outer voice and is never "inner"
// either, mirroring how the rest of this codebase already treats voice 1
// as the staff's own primary timeline (see Voices in
// packages/web-components/CLAUDE.md). Exported (not a measure.ts-only
// private method) since composition.ts's own #redrawConnectors needs the
// exact same check for a composition-wide slur.
export function isInnerVoiceMember(
  element: NoteOrChordElementType,
  staff: StaffElementBaseType
): boolean {
  const voiceParent = element.closest(MUSIC_VOICE);
  if (!voiceParent) {
    return false;
  }
  const voiceSiblings = Array.from(staff.children).filter(
    (el) => el.nodeName === MUSIC_VOICE_NODE
  );
  return isInnerVoicePosition(
    voiceSiblings.indexOf(voiceParent),
    voiceSiblings.length
  );
}

// Resolves double-stemmed beam-group context for slur placement (Chapter
// G), across one or more <music-measure> elements — a double-stemmed beam
// group is always scoped to a single measure's own two sibling staves, but
// a slur whose endpoints belong to one can be drawn either by that
// measure's own #redrawConnectors (a standalone measure) or by an
// ancestor <music-composition>'s own composition-wide equivalent — both
// need the exact same per-measure resolution, so this takes a *list* of
// measures (a single-element list for the standalone case) and aggregates
// across all of them, converting every real rect into the single `rootRect`
// space the caller's own buildConnectorSvgs call will use (the caller's
// own root, not any individual measure's).
export function resolveDoubleStemmedBeamConnectorContext(
  measureElements: readonly Element[],
  rootRect: DOMRect
): {
  beamRects: DOMRect[];
  elementToGroup: Map<NoteChordOrRestElementType, DoubleStemmedBeamGroup>;
  innerVoiceStemAnchorElements: Set<NoteLikeElementType>;
} {
  const beamRects: DOMRect[] = [];
  const elementToGroup = new Map<
    NoteChordOrRestElementType,
    DoubleStemmedBeamGroup
  >();
  const innerVoiceStemAnchorElements = new Set<NoteLikeElementType>();

  const elementSelector = `${MUSIC_NOTE}:not(${MUSIC_CHORD} ${MUSIC_NOTE}):defined, ${MUSIC_CHORD}:defined, ${MUSIC_REST}:defined`;

  for (const measureElement of measureElements) {
    const staves = Array.from(measureElement.children).filter((el) =>
      isStaffNodeName(el.nodeName)
    ) as StaffElementBaseType[];
    const perStaffElements: NoteChordOrRestElementType[][] = staves.map(
      (staff) =>
        Array.from(
          staff.querySelectorAll(elementSelector)
        ) as NoteChordOrRestElementType[]
    );
    const entries: DoubleStemmedBeamEntry[] = perStaffElements.flatMap(
      (elements, staffIndex) =>
        elements.map((element, entryIndex) => ({
          staffIndex,
          entryIndex,
          beamGroup: element.beamGroup,
          nodeName: element.nodeName,
        }))
    );
    // Warnings are intentionally not logged here — the ancestor
    // <music-measure>'s own #redrawDoubleStemmedBeams (which every caller
    // of this function runs first — see the ordering dependency documented
    // on measure.ts#redrawConnectors/#doubleStemmedBeamRects) already logs
    // them for this same redraw cycle; logging them again here would just
    // double every warning.
    const { groups } = resolveDoubleStemmedBeamGroups(entries);

    for (const group of groups) {
      for (const member of group.members) {
        if (member.isRest) {
          continue;
        }
        const element = perStaffElements[member.staffIndex][member.entryIndex];
        elementToGroup.set(element, group);
        if (
          isInnerVoiceMember(
            element as NoteOrChordElementType,
            staves[member.staffIndex]
          )
        ) {
          innerVoiceStemAnchorElements.add(
            element as unknown as NoteLikeElementType
          );
        }
      }
    }

    const beamOverlay = measureElement.shadowRoot?.querySelector(
      '.double-stemmed-beams-overlay'
    );
    if (beamOverlay) {
      for (const polygon of Array.from(
        beamOverlay.querySelectorAll('.double-stemmed-beam')
      )) {
        const rect = polygon.getBoundingClientRect();
        beamRects.push(
          new DOMRect(
            rect.left - rootRect.left,
            rect.top - rootRect.top,
            rect.width,
            rect.height
          )
        );
      }
    }
  }

  return { beamRects, elementToGroup, innerVoiceStemAnchorElements };
}

export type SlurGroupStaves = {
  topStaffIndex: number;
  bottomStaffIndex: number;
};

// Slur pairs both of whose endpoints belong to the same resolved
// double-stemmed beam-group. Such a slur is placed over the group's two
// staves like any cross-staff slur, even when both endpoints sit on one
// staff, so the group's own majority decides its side. Keyed by the exact
// pair object the caller then passes to buildConnectorSvgs.
export function resolveSlurGroupPlacement(
  pairs: readonly ConnectorPair[],
  elementToGroup: ReadonlyMap<
    NoteChordOrRestElementType,
    DoubleStemmedBeamGroup
  >
): Map<ConnectorPair, SlurGroupStaves> {
  const groupSlurStaves = new Map<ConnectorPair, SlurGroupStaves>();
  for (const pair of pairs) {
    if (pair.kind !== 'slur') {
      continue;
    }
    const startGroup = elementToGroup.get(
      pair.start as unknown as NoteChordOrRestElementType
    );
    const endGroup = elementToGroup.get(
      pair.end as unknown as NoteChordOrRestElementType
    );
    if (startGroup && startGroup === endGroup) {
      groupSlurStaves.set(pair, {
        topStaffIndex: startGroup.topStaffIndex,
        bottomStaffIndex: startGroup.bottomStaffIndex,
      });
    }
  }
  return groupSlurStaves;
}

export type EntryGeometry = {
  element: Element;
  isRest: boolean;
  centerX: number;
  rowTop: number;
  staffIndex: number;
  glyphRects: ObstacleRect[];
};

// Everything a cross-staff slur must not touch, in root-rect space: each
// note/chord/rest's own rendered glyphs, plus every per-staff and
// double-stemmed beam (sliced so a sloped beam keeps its outline).
export type EntryObstacles = {
  entries: EntryGeometry[];
  beamSlices: ObstacleRect[];
};

const OBSTACLE_GLYPH_SELECTOR =
  'path, ellipse, line, rect, polygon, polyline, circle, text';

const toRootSpace = (rect: DOMRect, rootRect: DOMRect): ObstacleRect => ({
  left: rect.left - rootRect.left,
  top: rect.top - rootRect.top,
  right: rect.right - rootRect.left,
  bottom: rect.bottom - rootRect.top,
});

const collectGlyphRects = (
  element: Element,
  rootRect: DOMRect
): ObstacleRect[] => {
  const shapes = Array.from(
    element.shadowRoot?.querySelectorAll<SVGGraphicsElement>(
      OBSTACLE_GLYPH_SELECTOR
    ) ?? []
  );
  const rects: ObstacleRect[] = [];
  for (const shape of shapes) {
    if (shape.classList.contains('head-hit-zone')) {
      continue;
    }
    const rect = shape.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      continue;
    }
    rects.push(toRootSpace(rect, rootRect));
  }
  return rects;
};

const collectBeamSlices = (
  polygon: SVGGraphicsElement,
  rootRect: DOMRect
): ObstacleRect[] => {
  const points = (polygon as SVGPolygonElement).points;
  const matrix =
    typeof polygon.getScreenCTM === 'function' ? polygon.getScreenCTM() : null;
  if (!points || points.numberOfItems === 0 || matrix === null) {
    const rect = polygon.getBoundingClientRect();
    return rect.width === 0 && rect.height === 0
      ? []
      : [toRootSpace(rect, rootRect)];
  }
  const corners: CurvePoint[] = [];
  for (let i = 0; i < points.numberOfItems; i++) {
    const point = points.getItem(i);
    const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix);
    corners.push({
      x: screen.x - rootRect.left,
      y: screen.y - rootRect.top,
    });
  }
  return sliceConvexPolygon(corners, SLUR_BEAM_SLICE_WIDTH_PX);
};

const staffIndexOf = (element: Element): number => {
  const staff = element.closest(STAFF_TAGS);
  const parent = staff?.parentElement;
  if (!staff || !parent) {
    return -1;
  }
  return Array.from(parent.children)
    .filter((child) => isStaffNodeName(child.nodeName))
    .indexOf(staff);
};

// `measureElements` are the measures whose double-stemmed beam overlays
// belong to this redraw (a <music-measure> is not its own descendant).
export const collectEntryObstacles = (
  root: ParentNode,
  rootRect: DOMRect,
  measureElements: readonly Element[]
): EntryObstacles => {
  const selector = `${MUSIC_NOTE}:not(${MUSIC_CHORD} ${MUSIC_NOTE}), ${MUSIC_CHORD}, ${MUSIC_REST}:not([hidden])`;
  const entries: EntryGeometry[] = Array.from(
    root.querySelectorAll(selector)
  ).map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      element,
      isRest: element.tagName.toLowerCase() === MUSIC_REST,
      centerX: rect.left + rect.width / 2 - rootRect.left,
      rowTop: getRowTop(element as NoteLikeElementType, rootRect),
      staffIndex: staffIndexOf(element),
      glyphRects: collectGlyphRects(element, rootRect),
    };
  });

  const beamPolygons: SVGGraphicsElement[] = [];
  for (const staff of Array.from(root.querySelectorAll(STAFF_TAGS))) {
    beamPolygons.push(
      ...Array.from(
        staff.shadowRoot?.querySelectorAll<SVGGraphicsElement>('.beam') ?? []
      )
    );
  }
  for (const measure of measureElements) {
    beamPolygons.push(
      ...Array.from(
        measure.shadowRoot?.querySelectorAll<SVGGraphicsElement>(
          '.double-stemmed-beam'
        ) ?? []
      )
    );
  }
  const beamSlices = beamPolygons.flatMap((polygon) =>
    collectBeamSlices(polygon, rootRect)
  );

  return { entries, beamSlices };
};

export type ConnectorsBuildOptions = {
  rootRect: DOMRect;
  rowLeft: number;
  rowRight: number;
  // Real double-stemmed-beam polygon rects (root-rect-relative — same
  // space every anchor in this module uses), already drawn by the
  // ancestor <music-measure> before this runs (ordering dependency:
  // measure.ts#redrawConnectors must run after #redrawDoubleStemmedBeams).
  // A same-staff slur whose curve would otherwise cross one gets pushed
  // further out; cross-staff slurs avoid them via `entryObstacles`.
  beamRects?: readonly DOMRect[];
  // Slur pairs placed over a double-stemmed beam-group's two staves — see
  // resolveSlurGroupPlacement.
  groupSlurStaves?: ReadonlyMap<ConnectorPair, SlurGroupStaves>;
  // Inner-voice double-stemmed-beam members (see isInnerVoiceMember): their
  // ordinary opposite-of-stem territory is occupied by another voice, so a
  // slur endpoint on one anchors at its stem end instead of its notehead.
  innerVoiceElements?: ReadonlySet<NoteLikeElementType>;
  // Glyph and beam geometry for cross-staff slur placement — see
  // collectEntryObstacles. Without it a cross-staff slur still picks its side
  // and anchors, but has nothing to steer around.
  entryObstacles?: EntryObstacles;
};

const centerXOf = (element: Element, rootRect: DOMRect): number => {
  const rect = element.getBoundingClientRect();
  return rect.left + rect.width / 2 - rootRect.left;
};

const countNotesPerStaffInSpan = (
  pair: ConnectorPair,
  staves: SlurGroupStaves,
  entries: readonly EntryGeometry[],
  rootRect: DOMRect
): { top: number; bottom: number } => {
  const startX = centerXOf(stemSourceOf(pair.start), rootRect);
  const endX = centerXOf(stemSourceOf(pair.end), rootRect);
  const minX = Math.min(startX, endX) - 1;
  const maxX = Math.max(startX, endX) + 1;
  const rowTop = getRowTop(pair.start, rootRect);
  let top = 0;
  let bottom = 0;
  for (const entry of entries) {
    if (
      entry.isRest ||
      entry.centerX < minX ||
      entry.centerX > maxX ||
      Math.abs(entry.rowTop - rowTop) > ROW_TOLERANCE_PX
    ) {
      continue;
    }
    if (entry.staffIndex === staves.topStaffIndex) {
      top++;
    } else if (entry.staffIndex === staves.bottomStaffIndex) {
      bottom++;
    }
  }
  return { top, bottom };
};

const CROSS_STAFF_SLUR_EXTRA_HEIGHT_PX = STAFF_LINE_SPACING * 6;

// A slur spanning two staves (or a double-stemmed beam-group's two staves),
// placed by the rules in rules/connectorPlacementRules.ts: the majority
// staff's side (above on an even split), both anchors on that side, and a
// shape that keeps clear of every other entry — switching to the other side
// only when that one is clear and the preferred one is not.
const buildCrossStaffSlurSvgs = (
  pair: ConnectorPair,
  staves: SlurGroupStaves,
  options: ConnectorsBuildOptions
): SVGGElement[] => {
  const { rootRect, rowLeft, rowRight, innerVoiceElements, entryObstacles } =
    options;
  const entries = entryObstacles?.entries ?? [];
  const counts = countNotesPerStaffInSpan(pair, staves, entries, rootRect);
  const preferredSide = pickCrossStaffSlurSide(counts.top, counts.bottom);

  const endpointOwners = new Set<Element>([
    stemSourceOf(pair.start),
    stemSourceOf(pair.end),
  ]);
  const obstacles = [
    ...entries
      .filter((entry) => !endpointOwners.has(entry.element))
      .flatMap((entry) => entry.glyphRects),
    ...(entryObstacles?.beamSlices ?? []),
  ];

  const anchorFor = (note: NoteLikeElementType, side: CurveBulge): Anchor => {
    const stemSource = stemSourceOf(note);
    const kind = slurAnchorKind({
      stemUp: Boolean(
        (stemSource as NoteElementType | ChordElementType).stemUp
      ),
      side,
      isInnerVoice: innerVoiceElements?.has(note) ?? false,
      hasStem: Boolean(stemSource.shadowRoot?.querySelector('.stem')),
    });
    const notehead = () =>
      computeAnchor(note, rootRect, side, SLUR_NOTEHEAD_OFFSET_PX, true);
    if (kind === 'stem-end') {
      return computeStemEndAnchor(stemSource, rootRect) ?? notehead();
    }
    if (kind === 'beyond-stem') {
      return computeBeyondBeamAnchor(stemSource, rootRect) ?? notehead();
    }
    return notehead();
  };

  let chosen: {
    side: CurveBulge;
    start: Anchor;
    end: Anchor;
    curve: SlurCurveResolution;
  } | null = null;
  for (const side of [preferredSide, oppositeSide(preferredSide)]) {
    const start = anchorFor(pair.start, side);
    const end = anchorFor(pair.end, side);
    if (!sameRow(start, end)) {
      return [
        createCurveSvg({
          from: { x: start.x, y: start.y },
          to: { x: rowRight, y: start.y },
          bulge: side,
        }),
        createCurveSvg({
          from: { x: rowLeft, y: end.y },
          to: { x: end.x, y: end.y },
          bulge: side,
        }),
      ];
    }
    const span = Math.abs(end.x - start.x);
    const floorHeight = Math.max(
      DEFAULT_BULGE_HEIGHT,
      span * CROSS_STAFF_SLUR_BULGE_SPAN_RATIO
    );
    const curve = resolveSlurCurve(start, end, side, obstacles, {
      minHeight: 0,
      floorHeight,
      maxHeight: Math.max(
        span * SLUR_CONTROL_HEIGHT_MAX_RATIO,
        floorHeight + CROSS_STAFF_SLUR_EXTRA_HEIGHT_PX
      ),
      step: BULGE_STEP_PX / 2,
      clearance: SLUR_OBSTACLE_CLEARANCE_PX,
    });
    if (chosen === null || curve.collisions < chosen.curve.collisions) {
      chosen = { side, start, end, curve };
    }
    if (curve.collisions === 0) {
      break;
    }
  }
  if (chosen === null) {
    return [];
  }
  return [
    createCurveSvg({
      from: { x: chosen.start.x, y: chosen.start.y },
      to: { x: chosen.end.x, y: chosen.end.y },
      bulge: chosen.side,
      controlHeights: chosen.curve.controlHeights,
    }),
  ];
};

const MAX_BEAM_AVOIDANCE_STEPS = 6;

export const buildConnectorSvgs = (
  pairs: readonly ConnectorPair[],
  options: ConnectorsBuildOptions
): SVGGElement[] => {
  const {
    rootRect,
    rowLeft,
    rowRight,
    beamRects = [],
    groupSlurStaves,
    innerVoiceElements,
  } = options;
  const elements: SVGGElement[] = [];

  for (const pair of pairs) {
    if (pair.kind === 'slur') {
      const groupStaves = groupSlurStaves?.get(pair);
      if (groupStaves) {
        elements.push(...buildCrossStaffSlurSvgs(pair, groupStaves, options));
        continue;
      }
      if (onDifferentStaves(pair.start, pair.end)) {
        const startStaffIndex = staffIndexOf(pair.start);
        const endStaffIndex = staffIndexOf(pair.end);
        elements.push(
          ...buildCrossStaffSlurSvgs(
            pair,
            {
              topStaffIndex: Math.min(startStaffIndex, endStaffIndex),
              bottomStaffIndex: Math.max(startStaffIndex, endStaffIndex),
            },
            options
          )
        );
        continue;
      }
    }

    const startBulge = pickBulge(pair.start);
    const endBulge = pair.kind === 'tie' ? pickBulge(pair.end) : startBulge;
    const style =
      pair.kind === 'slide' || pair.kind === 'glissando'
        ? 'straight'
        : 'smooth';
    const label =
      pair.kind === 'glissando' ? pair.label : CONNECTOR_LABELS[pair.kind];

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

      if (
        isCurveObscured(
          startAnchor,
          endAnchor,
          toneBulge,
          DEFAULT_BULGE_HEIGHT,
          obstacles,
          ARPEGGIO_RUN_TIE_OBSCURE_CLEARANCE_PX
        )
      ) {
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

    // A same-staff slur endpoint anchors at the real stem tip instead of the
    // notehead when it's an inner-voice double-stemmed-beam member (its
    // ordinary opposite-of-stem territory is occupied by another voice), or
    // when the notehead anchor would land inside a double-stemmed beam.
    const resolveSlurAwareAnchor = (
      note: NoteLikeElementType,
      bulge: CurveBulge
    ): Anchor => {
      const notehead = computeAnchor(note, rootRect, bulge, noteheadOffsetPx);
      if (pair.kind !== 'slur') {
        return notehead;
      }
      const forceStemEnd = innerVoiceElements?.has(note) ?? false;
      const obscured =
        !forceStemEnd &&
        beamRects.some(
          (rect) =>
            notehead.x >= rect.left &&
            notehead.x <= rect.right &&
            notehead.y >= rect.top &&
            notehead.y <= rect.bottom
        );
      if (forceStemEnd || obscured) {
        return computeStemEndAnchor(note, rootRect) ?? notehead;
      }
      return notehead;
    };

    const startAnchor = resolveSlurAwareAnchor(pair.start, startBulge);
    if (pair.kind === 'tie') {
      startAnchor.x += tieStartTrillNudgePx(pair.start);
    }
    const endAnchor = resolveSlurAwareAnchor(pair.end, endBulge);

    // A glissando's hint label always sits above the line, regardless of the
    // notes' stem direction — a fixed annotation position, unlike a slur or
    // tie's bulge (which follows the stem to stay clear of it).
    const renderStartBulge = pair.kind === 'glissando' ? 'above' : startBulge;
    const renderEndBulge = pair.kind === 'glissando' ? 'above' : endBulge;

    if (sameRow(startAnchor, endAnchor)) {
      const baseBulgeHeight =
        DEFAULT_BULGE_HEIGHT + pair.nestingLevel * BULGE_STEP_PX;
      const bulgeHeight =
        pair.kind === 'slur'
          ? resolveRectClearingBulgeHeight(
              startAnchor,
              endAnchor,
              renderStartBulge,
              baseBulgeHeight,
              beamRects,
              { step: BULGE_STEP_PX, maxSteps: MAX_BEAM_AVOIDANCE_STEPS }
            )
          : undefined;
      elements.push(
        createCurveSvg({
          from: { x: startAnchor.x, y: startAnchor.y },
          to: { x: endAnchor.x, y: endAnchor.y },
          bulge: renderStartBulge,
          label,
          style,
          nestingLevel: pair.nestingLevel,
          bulgeHeight,
        })
      );
      continue;
    }

    // Cross-row: split at start-row right edge and end-row left edge.
    elements.push(
      createCurveSvg({
        from: { x: startAnchor.x, y: startAnchor.y },
        to: { x: rowRight, y: startAnchor.y },
        bulge: renderStartBulge,
        label,
        style,
        nestingLevel: pair.nestingLevel,
      })
    );
    elements.push(
      createCurveSvg({
        from: { x: rowLeft, y: endAnchor.y },
        to: { x: endAnchor.x, y: endAnchor.y },
        bulge: renderEndBulge,
        style,
        nestingLevel: pair.nestingLevel,
      })
    );
  }

  return elements;
};
