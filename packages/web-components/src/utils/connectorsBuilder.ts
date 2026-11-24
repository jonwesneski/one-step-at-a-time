import { resolveArpeggioTiePairings } from '../rules/arpeggioRules';
import { breathMarkIndicesInsideSlurs } from '../rules/breathMarkRules';
import {
  anchorYClearOfRects,
  arcEncloses,
  arcObstacleRects,
  bulgeHeightEnclosingRects,
  computeNestingLevels,
  consecutivePhrasePairs,
  CurvePoint,
  DrawnArc,
  inflateRect,
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
import { BreathMark, GlissandoHint, VoiceNumber } from '../types/theory';
import {
  CHORD_TAGS,
  chordSelector,
  chordToneSelector,
  isChordNodeName,
  isNoteNodeName,
  isStaffNodeName,
  loneNoteSelector,
  MUSIC_ARPEGGIO,
  MUSIC_COMPOSITION,
  MUSIC_GUITAR_NOTE,
  MUSIC_MEASURE,
  MUSIC_REST,
  MUSIC_VOICE,
  MUSIC_VOICE_NODE,
  NOTE_TAGS,
  STAFF_TAGS,
} from './consts';
import {
  ARPEGGIO_RUN_DIVIDED_TIE_GAP_HALF_PX,
  ARPEGGIO_RUN_TIE_OBSCURE_CLEARANCE_PX,
  ARPEGGIO_RUN_TIE_STUB_LENGTH_PX,
  AUGMENTATION_DOT_SPACING_GAP_PX,
  CROSS_STAFF_SLUR_BULGE_SPAN_RATIO,
  LAISSEZ_VIBRER_CURVE_LENGTH_PX,
  SLUR_ARTICULATION_CLEARANCE_PX,
  SLUR_BEAM_SLICE_WIDTH_PX,
  SLUR_BEYOND_BEAM_CLEARANCE_PX,
  SLUR_CONTROL_HEIGHT_MAX_RATIO,
  SLUR_NESTED_CLEARANCE_PX,
  SLUR_NOTEHEAD_OFFSET_PX,
  SLUR_OBSTACLE_CLEARANCE_PX,
  SLUR_STEM_END_CLEARANCE_PX,
  STAFF_LINE_SPACING,
  TRILL_WRITTEN_NOTE_GAP_PX,
} from './notationDimensions';
import { parseGlissandoHint, parseSlurStyle, parseTieStyle } from './parsers';
import {
  BULGE_STEP_PX,
  computeWrittenTrillNoteWidth,
  createCurveSvg,
  createOpenTieSvg,
  CurveBulge,
  DEFAULT_BULGE_HEIGHT,
  setCurveDotted,
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
  /** A tie or slur whose start element sets a dotted `tie-style` / `slur-style`. */
  dotted?: boolean;
};

export const collectNoteLikeElements = (
  root: ParentNode
): NoteLikeElementType[] => {
  const chordChildSelectors = Object.values(CONNECTOR_ATTRS)
    .map((attr) => chordToneSelector(`[${attr}]`))
    .join(', ');
  const selector = `${loneNoteSelector()}, ${MUSIC_GUITAR_NOTE}, ${CHORD_TAGS}, ${chordChildSelectors}`;
  // A staff hides the entries it doesn't draw (those past the end of the
  // bar), so a connector on one has nothing to anchor to.
  return Array.from(
    root.querySelectorAll<NoteLikeElementType>(selector)
  ).filter(
    (element) =>
      ((element.closest(CHORD_TAGS) as HTMLElement | null) ?? element).style
        .display !== 'none'
  );
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

// Groups note-like elements by voice, so pairConnectors' LIFO fallback never
// pairs across interleaved voices. Partition, then pair each voice:
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

// One ConnectorPair per consecutive pair of a slur-group, ordered by measure
// then rendered x (x restarts each system). A slur-group lets one note be both
// an end and a start, which `slur`'s single value can't.
export const collectPhraseSlurPairs = (root: ParentNode): ConnectorPair[] => {
  const selector = `${loneNoteSelector('[slur-group]')}, ${chordSelector(
    '[slur-group]'
  )}`;
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

  const measureIndex = new Map(
    Array.from(root.querySelectorAll(MUSIC_MEASURE)).map((measure, index) => [
      measure,
      index,
    ])
  );
  const pairs: ConnectorPair[] = [];
  for (const [groupId, members] of groups) {
    if (members.length < 2) {
      console.warn(
        `[connectorsBuilder] slur-group "${groupId}" has only one member; nothing to connect`
      );
      continue;
    }
    const ordered = consecutivePhrasePairs(
      members.map((member) => {
        const measure = member.closest(MUSIC_MEASURE);
        return {
          item: member,
          measureIndex: (measure && measureIndex.get(measure)) ?? 0,
          x: member.getBoundingClientRect().left,
        };
      })
    );
    for (const [start, end] of ordered) {
      pairs.push({
        kind: 'slur',
        start,
        end,
        nestingLevel: 0,
        dotted: isDottedSlur(start),
      });
    }
  }
  return pairs;
};

// Every connector pair under `root`: authored ties, slurs and glissandi paired
// per voice, synthesized arpeggio ties, and slur-group phrases. Whichever
// level draws the connectors calls this, and it warns about a breath mark
// a slur carries on past.
export const collectConnectorPairs = (
  root: ParentNode
): { noteLikeElements: NoteLikeElementType[]; pairs: ConnectorPair[] } => {
  const noteLikeElements = collectNoteLikeElements(root);
  const byVoice = partitionByVoice(noteLikeElements);
  const pairs = [
    ...[...byVoice.values()].flatMap((notes) => pairConnectors(notes)),
    ...collectArpeggioTiePairs(root),
    ...collectPhraseSlurPairs(root),
  ];
  warnBreathMarksInsideSlurs(byVoice, pairs);
  return { noteLikeElements, pairs };
};

const breathMarkOf = (note: NoteLikeElementType): BreathMark | null =>
  isChordNodeName(note.parentElement?.tagName ?? '')
    ? null
    : (note as { breathMark?: BreathMark | null }).breathMark ?? null;

// Each redraw re-checks; an element warns again only after it was fixed.
const breathInsideSlurWarned = new WeakSet<NoteLikeElementType>();

const warnBreathMarksInsideSlurs = (
  byVoice: ReadonlyMap<VoiceNumber, NoteLikeElementType[]>,
  pairs: readonly ConnectorPair[]
): void => {
  const slurs = pairs.filter((pair) => pair.kind === 'slur');
  for (const notes of byVoice.values()) {
    const indexOf = new Map(notes.map((note, index) => [note, index]));
    const spans = slurs.flatMap((pair) => {
      const startIndex = indexOf.get(pair.start);
      const endIndex = indexOf.get(pair.end);
      return startIndex === undefined || endIndex === undefined
        ? []
        : [{ startIndex, endIndex }];
    });
    const flagged = new Set(
      breathMarkIndicesInsideSlurs(
        notes.map((note) => breathMarkOf(note) !== null),
        spans
      ).map((index) => notes[index])
    );
    for (const note of notes) {
      if (!flagged.has(note)) {
        breathInsideSlurWarned.delete(note);
        continue;
      }
      if (!breathInsideSlurWarned.has(note)) {
        breathInsideSlurWarned.add(note);
        console.warn(
          '[connectorsBuilder] breath-mark under a slur: a slur is unbroken legato and a breath mark a break in the sound; end the slur on this note or drop the mark',
          note
        );
      }
    }
  }
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
  if (!isNoteNodeName(start.tagName) || !isNoteNodeName(end.tagName)) {
    return undefined;
  }
  const startValue = (start as NoteElementType).note;
  const endValue = (end as NoteElementType).note;
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
          const isChord = isChordNodeName(note.tagName);
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
              dotted: isDottedTie(note),
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
        dotted:
          kind === 'tie'
            ? isDottedTie(startEntry.note)
            : kind === 'slur'
            ? isDottedSlur(startEntry.note)
            : undefined,
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
    dotted: pair.dotted,
  }));
};

const isDottedTie = (note: NoteLikeElementType): boolean =>
  parseTieStyle(note.getAttribute('tie-style')) === 'dotted';

const isDottedSlur = (note: NoteLikeElementType): boolean =>
  parseSlurStyle(note.getAttribute('slur-style')) === 'dotted';

type Anchor = {
  x: number;
  y: number;
  rowTop: number;
};

const getRowTop = (note: NoteLikeElementType, rootRect: DOMRect): number => {
  // A note's top shifts with pitch, so rows come from the containing
  // <music-measure> (what wraps), or the staff itself when standalone.
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
    isNoteNodeName(note.tagName) &&
    isChordNodeName(note.parentElement?.tagName ?? '')
  ) {
    const chord = note.parentElement as unknown as ChordElementType;
    const chordRect = chord.getBoundingClientRect();
    const chordNotes = Array.from(chord.querySelectorAll(NOTE_TAGS));
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
  if (isChordNodeName(note.tagName)) {
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

// A slur anchor at the stem end, pulled back SLUR_STEM_END_CLEARANCE_PX: for
// an inner-voice beam-group member, or where a double-stemmed beam hides the
// notehead anchor. Null without a stem.
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

// A cross-staff slur anchor past the stem tip, for a stem pointing toward
// the slur's side, so it clears the beam or flag. Null without a stem.
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

// Nudges a tie's start past dots, a written trilling notehead and trill-finish
// notes, computed from their layout math since neither trill decoration can
// be measured from here. A written notehead deferred to the second tied note
// still nudges the first (a small overshoot).
const tieStartNudgePx = (note: NoteLikeElementType): number => {
  if (!isNoteNodeName(note.tagName) && !isChordNodeName(note.tagName)) {
    return 0;
  }
  const trillCapableNote = note as NoteElementType | ChordElementType;
  let nudge = 0;
  if (trillCapableNote.resolvedTrillPitch?.written === true) {
    // The anchor is the note's centre, but the written notehead starts
    // NOTE_SVG_WIDTH past its left edge.
    nudge +=
      NOTE_SVG_WIDTH / 2 +
      TRILL_WRITTEN_NOTE_GAP_PX +
      computeWrittenTrillNoteWidth(
        trillCapableNote.resolvedTrillPitch.accidental
      );
  }
  const trillFinish = trillCapableNote.trillFinish;
  if (trillFinish !== null && trillFinish.length > 0) {
    // Same correction; a lone finishing note's stem may reach a couple of px
    // further.
    nudge +=
      NOTE_SVG_WIDTH / 2 +
      computeGraceFootprintWidth(
        trillFinish,
        trillCapableNote.resolvedTrillFinishAccidentals
      );
  }
  // A tie from a dotted note starts after its dots; any trill decoration
  // above already starts after them too.
  const dotsRightEdge =
    (stemSourceOf(note) as NoteElementType | ChordElementType)
      .augmentationDotsRightEdgePx ?? null;
  if (dotsRightEdge !== null) {
    nudge =
      nudge > 0
        ? nudge + Math.max(0, dotsRightEdge - NOTE_SVG_WIDTH)
        : dotsRightEdge + AUGMENTATION_DOT_SPACING_GAP_PX - NOTE_SVG_WIDTH / 2;
  }
  return nudge;
};

// For notes inside a chord, stemUp is set on the chord element, not the note.
const stemSourceOf = (note: NoteLikeElementType): NoteLikeElementType =>
  isNoteNodeName(note.tagName) &&
  isChordNodeName(note.parentElement?.tagName ?? '')
    ? (note.parentElement as unknown as NoteLikeElementType)
    : note;

// Root-space rects of an entry's articulation marks, its grace notes' included.
const articulationRectsOf = (
  note: NoteLikeElementType,
  rootRect: DOMRect
): ObstacleRect[] =>
  Array.from(
    stemSourceOf(note).shadowRoot?.querySelectorAll<SVGGraphicsElement>(
      '.articulations'
    ) ?? []
  )
    .map((group) => group.getBoundingClientRect())
    .filter((rect) => rect.width > 0 || rect.height > 0)
    .map((rect) => toRootSpace(rect, rootRect));

// A slur encloses the marks on its own endpoints.
const clearOwnArticulations = (
  note: NoteLikeElementType,
  anchor: Anchor,
  side: CurveBulge,
  rootRect: DOMRect
): Anchor => ({
  ...anchor,
  y: anchorYClearOfRects(
    anchor,
    side,
    articulationRectsOf(note, rootRect),
    SLUR_ARTICULATION_CLEARANCE_PX
  ),
});

const SLUR_ENTRY_SELECTOR = `${loneNoteSelector()}, ${CHORD_TAGS}`;

// Notes and chords strictly between a slur's ends, on its staff (by position
// in each measure) and in its voice, across barlines when it crosses one.
// `entriesByRoot` caches each root's entries for one build.
const slurInteriorEntries = (
  pair: ConnectorPair,
  entriesByRoot: Map<Element, Element[]>
): Element[] => {
  const start = stemSourceOf(pair.start);
  const end = stemSourceOf(pair.end);
  const root =
    start.closest(MUSIC_COMPOSITION) ??
    start.closest(MUSIC_MEASURE) ??
    start.closest(STAFF_TAGS);
  if (root === null) {
    return [];
  }
  let entries = entriesByRoot.get(root);
  if (entries === undefined) {
    entries = Array.from(root.querySelectorAll(SLUR_ENTRY_SELECTOR));
    entriesByRoot.set(root, entries);
  }
  const startIndex = entries.indexOf(start);
  const endIndex = entries.indexOf(end);
  if (startIndex < 0 || endIndex < 0) {
    return [];
  }
  const staffIndex = staffIndexOf(start);
  const voice = resolveVoiceNumber(start);
  return entries
    .slice(Math.min(startIndex, endIndex) + 1, Math.max(startIndex, endIndex))
    .filter(
      (entry) =>
        staffIndexOf(entry) === staffIndex &&
        resolveVoiceNumber(entry as NoteLikeElementType) === voice
    );
};

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

// True when element is an inner voice of a double-stemmed group: on a staff
// with two or more <music-voice> children, and not voice 1 (the outer
// voice). Shared by measure.ts and composition.ts.
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

// Resolves double-stemmed beam-group context for slur placement across one
// or more <music-measure> elements: a standalone measure passes itself, a
// composition passes all of its measures. Rects are converted into the
// caller's `rootRect` space.
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

  const elementSelector = `${loneNoteSelector(':defined')}, ${chordSelector(
    ':defined'
  )}, ${MUSIC_REST}:defined`;

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
    // #redrawDoubleStemmedBeams already logged the warnings this cycle.
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
  // Marks a staff draws above its stave between entries (breath marks).
  decorationRects: ObstacleRect[];
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
  rootRect: DOMRect,
  excludeGlyphSelector: string | null
): ObstacleRect[] => {
  const shapes = Array.from(
    element.shadowRoot?.querySelectorAll<SVGGraphicsElement>(
      OBSTACLE_GLYPH_SELECTOR
    ) ?? []
  );
  const rects: ObstacleRect[] = [];
  for (const shape of shapes) {
    if (
      shape.classList.contains('head-hit-zone') ||
      (excludeGlyphSelector !== null && shape.matches(excludeGlyphSelector))
    ) {
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
// `excludeGlyphSelector` leaves out glyphs a caller may cross, e.g. stems.
export const collectEntryObstacles = (
  root: ParentNode,
  rootRect: DOMRect,
  measureElements: readonly Element[],
  { excludeGlyphSelector = null }: { excludeGlyphSelector?: string | null } = {}
): EntryObstacles => {
  const selector = `${loneNoteSelector()}, ${CHORD_TAGS}, ${MUSIC_REST}:not([hidden])`;
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
      glyphRects: collectGlyphRects(element, rootRect, excludeGlyphSelector),
    };
  });

  const beamPolygons: SVGGraphicsElement[] = [];
  const staves = Array.from(root.querySelectorAll(STAFF_TAGS));
  for (const staff of staves) {
    beamPolygons.push(
      ...Array.from(
        staff.shadowRoot?.querySelectorAll<SVGGraphicsElement>(
          '.beam, .tremolo-beam'
        ) ?? []
      )
    );
  }
  for (const measure of measureElements) {
    beamPolygons.push(
      ...Array.from(
        measure.shadowRoot?.querySelectorAll<SVGGraphicsElement>(
          '.double-stemmed-beam, .tremolo-beam'
        ) ?? []
      )
    );
  }
  const beamSlices = beamPolygons.flatMap((polygon) =>
    collectBeamSlices(polygon, rootRect)
  );
  const decorationRects = staves.flatMap((staff) =>
    Array.from(
      staff.shadowRoot?.querySelectorAll<SVGGraphicsElement>('.breath-mark') ??
        []
    ).map((mark) => toRootSpace(mark.getBoundingClientRect(), rootRect))
  );

  return { entries, beamSlices, decorationRects };
};

// Every rendered stem under `root`, in root-rect space.
export const collectStemRects = (
  root: ParentNode,
  rootRect: DOMRect
): ObstacleRect[] =>
  Array.from(
    root.querySelectorAll(`${loneNoteSelector()}, ${CHORD_TAGS}`)
  ).flatMap((element) =>
    Array.from(element.shadowRoot?.querySelectorAll('.stem') ?? []).map(
      (stem) => toRootSpace(stem.getBoundingClientRect(), rootRect)
    )
  );

export type ConnectorsBuildOptions = {
  rootRect: DOMRect;
  // Where a connector that leaves its row starts again on the next row, given
  // its end element; it runs out to the root's right edge.
  rowLeftOf: (end: Element) => number;
  // Double-stemmed beam rects (root-relative), drawn before this runs. A
  // same-staff slur is pushed past them; cross-staff slurs use
  // `entryObstacles`.
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
  const { rootRect, rowLeftOf, innerVoiceElements, entryObstacles } = options;
  const rowRight = rootRect.width;
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
    ...(entryObstacles?.decorationRects ?? []),
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
    const anchor =
      kind === 'stem-end'
        ? computeStemEndAnchor(stemSource, rootRect) ?? notehead()
        : kind === 'beyond-stem'
        ? computeBeyondBeamAnchor(stemSource, rootRect) ?? notehead()
        : notehead();
    return clearOwnArticulations(note, anchor, side, rootRect);
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
          from: { x: rowLeftOf(pair.end), y: end.y },
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

// A same-staff slur already drawn, which a slur enclosing it stays outside.
type DrawnSlur = {
  arc: DrawnArc;
  staffIndex: number;
  rowTop: number;
};

export const buildConnectorSvgs = (
  pairs: readonly ConnectorPair[],
  options: ConnectorsBuildOptions
): SVGGElement[] => {
  const {
    rootRect,
    rowLeftOf,
    beamRects = [],
    groupSlurStaves,
    innerVoiceElements,
  } = options;
  const rowRight = rootRect.width;
  const elements: SVGGElement[] = [];
  const entriesByRoot = new Map<Element, Element[]>();
  const drawnSlurs: DrawnSlur[] = [];
  // A dotted tie is styled once its curves are built: each branch below ends
  // its pair with `continue`, so the previous pair's curves are styled at the
  // top of the next iteration and the last pair's after the loop.
  let dottedPairStart: number | null = null;
  const styleDottedPair = (): void => {
    if (dottedPairStart !== null) {
      elements.slice(dottedPairStart).forEach(setCurveDotted);
    }
  };

  // Nested slurs are drawn first, so each enclosing slur can stay outside them.
  const orderedPairs = [...pairs].sort(
    (a, b) => a.nestingLevel - b.nestingLevel
  );
  for (const pair of orderedPairs) {
    styleDottedPair();
    dottedPairStart = pair.dotted ? elements.length : null;
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
      const isChord = isChordNodeName(pair.start.tagName);
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
      isChordNodeName(pair.start.tagName) &&
      isChordNodeName(pair.end.tagName);

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
              from: { x: rowLeftOf(pair.end), y: endAnchor.y },
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
      const anchor =
        forceStemEnd || obscured
          ? computeStemEndAnchor(note, rootRect) ?? notehead
          : notehead;
      return clearOwnArticulations(note, anchor, bulge, rootRect);
    };

    // Every interior note's marks, which the slur passes outside of; a slur
    // split across rows only answers to the marks in each half's own row.
    const interiorMarks =
      pair.kind === 'slur'
        ? slurInteriorEntries(pair, entriesByRoot).flatMap((entry) => {
            const note = entry as NoteLikeElementType;
            const rowTop = getRowTop(note, rootRect);
            return articulationRectsOf(note, rootRect).map((rect) => ({
              rect: inflateRect(rect, SLUR_ARTICULATION_CLEARANCE_PX),
              rowTop,
            }));
          })
        : [];
    const pairStaffIndex = staffIndexOf(stemSourceOf(pair.start));
    const nestedSlurs = (rowTop: number, arc: DrawnArc): DrawnSlur[] =>
      pair.kind === 'slur'
        ? drawnSlurs.filter(
            (drawn) =>
              drawn.staffIndex === pairStaffIndex &&
              Math.abs(drawn.rowTop - rowTop) <= ROW_TOLERANCE_PX &&
              arcEncloses(arc, drawn.arc)
          )
        : [];
    const enclosingBulge = (
      from: Anchor,
      to: Anchor,
      side: CurveBulge,
      baseBulgeHeight: number
    ): number | undefined =>
      bulgeHeightEnclosingRects(
        from,
        to,
        side,
        baseBulgeHeight,
        [
          ...interiorMarks
            .filter(
              ({ rowTop }) => Math.abs(rowTop - from.rowTop) <= ROW_TOLERANCE_PX
            )
            .map(({ rect }) => rect),
          ...nestedSlurs(from.rowTop, {
            from,
            to,
            side,
            bulgeHeight: baseBulgeHeight,
          }).flatMap((drawn) =>
            arcObstacleRects(drawn.arc, SLUR_NESTED_CLEARANCE_PX)
          ),
        ],
        baseBulgeHeight + MAX_BEAM_AVOIDANCE_STEPS * BULGE_STEP_PX
      );
    const recordSlur = (
      from: Anchor,
      to: Anchor,
      side: CurveBulge,
      bulgeHeight: number
    ): void => {
      if (pair.kind === 'slur') {
        drawnSlurs.push({
          arc: { from, to, side, bulgeHeight },
          staffIndex: pairStaffIndex,
          rowTop: from.rowTop,
        });
      }
    };

    const startAnchor = resolveSlurAwareAnchor(pair.start, startBulge);
    if (pair.kind === 'tie') {
      startAnchor.x += tieStartNudgePx(pair.start);
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
      const beamClearingBulge =
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
      const bulgeHeight =
        enclosingBulge(
          startAnchor,
          endAnchor,
          renderStartBulge,
          beamClearingBulge ?? baseBulgeHeight
        ) ?? beamClearingBulge;
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
      recordSlur(
        startAnchor,
        endAnchor,
        renderStartBulge,
        bulgeHeight ?? baseBulgeHeight
      );
      continue;
    }

    // Cross-row: split at start-row right edge and end-row left edge.
    const rowBaseBulge =
      DEFAULT_BULGE_HEIGHT + pair.nestingLevel * BULGE_STEP_PX;
    const startRowEnd = { ...startAnchor, x: rowRight };
    const rowLeft = rowLeftOf(pair.end);
    const endRowStart = { ...endAnchor, x: rowLeft };
    const startHalfBulge = enclosingBulge(
      startAnchor,
      startRowEnd,
      renderStartBulge,
      rowBaseBulge
    );
    const endHalfBulge = enclosingBulge(
      endRowStart,
      endAnchor,
      renderEndBulge,
      rowBaseBulge
    );
    elements.push(
      createCurveSvg({
        from: { x: startAnchor.x, y: startAnchor.y },
        to: { x: rowRight, y: startAnchor.y },
        bulge: renderStartBulge,
        label,
        style,
        nestingLevel: pair.nestingLevel,
        bulgeHeight: startHalfBulge,
      })
    );
    elements.push(
      createCurveSvg({
        from: { x: rowLeft, y: endAnchor.y },
        to: { x: endAnchor.x, y: endAnchor.y },
        bulge: renderEndBulge,
        style,
        nestingLevel: pair.nestingLevel,
        bulgeHeight: endHalfBulge,
      })
    );
    recordSlur(
      startAnchor,
      startRowEnd,
      renderStartBulge,
      startHalfBulge ?? rowBaseBulge
    );
    recordSlur(
      endRowStart,
      endAnchor,
      renderEndBulge,
      endHalfBulge ?? rowBaseBulge
    );
  }

  styleDottedPair();
  return elements;
};
