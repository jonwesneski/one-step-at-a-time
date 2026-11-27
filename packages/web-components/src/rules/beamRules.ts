import type {
  ChordElementType,
  NoteChordOrRestElementType,
  NoteElementType,
  TremoloGroupPlacement,
  TupletElementType,
} from '../types/elements';
import type {
  BeatsInMeasure,
  BeatTypeInMeasure,
  DurationType,
  TremoloValue,
} from '../types/theory';
import {
  BeamsBuilder,
  type NoteYPosition,
  type TremoloBeamGroupSpec,
} from '../utils';
import { isNoteNodeName, MUSIC_REST_NODE } from '../utils/consts';
import {
  BEAM_ESTIMATE_NOTE_SPACING_PX,
  KNEED_BEAM_TRIGGER_STEM_PX,
} from '../utils/notationDimensions';
import { noteSizeScale } from '../utils/svgCreator/note';
import {
  resolveBeamPlacement,
  resolveKneedBeamPlacement,
  resolveKneedBeamSplit,
} from './beamPlacementRules';
import { computeTremoloScaleByIndex, durationContribution } from './beatRules';
import { determineStemDirections } from './stemRules';
import { durationToFlagCountMap } from './theoryConsts';
import {
  acceptsBeamAttach,
  beamedTremoloMinimumStemPx,
  canPlaceTremoloBetween,
} from './tremoloRules';

export function buildBeamsRenderer(
  elements: NoteChordOrRestElementType[],
  timeSig: [BeatsInMeasure, BeatTypeInMeasure],
  noteStaffYCoords: ReadonlyMap<NoteElementType, number>,
  chordStaffYCoords: ReadonlyMap<ChordElementType, number[]>,
  tupletsByIndex: ReadonlyMap<number, TupletElementType[]>,
  arpeggioRunIndices: ReadonlySet<number> = new Set(),
  elementBeatOffsets?: number[],
  stemDirectionsOverride?: boolean[],
  externallyBeamedIndices?: ReadonlySet<number>,
  crossStaffStemOverrides?: ReadonlyMap<NoteChordOrRestElementType, boolean>,
  // Where mid-stream clef changes take effect, in the same beat-offset space
  // as `elements` (a change applies to entries starting at or after it).
  clefChangeBeatOffsets: readonly number[] = [],
  tremoloGroups: readonly TremoloGroupPlacement[] = [],
  // Where mid-bar barlines fall, in the same beat-offset space; a beam breaks
  // at each.
  barlineBeatOffsets: readonly number[] = [],
  // Flutter-tongued tremolo entries, which beam with plain notes.
  flutterTonguedIndices: ReadonlySet<number> = new Set()
): {
  beamsBuilder: BeamsBuilder;
  beamRenderer: ReturnType<BeamsBuilder['buildRenderer']>;
  stemDirections: boolean[];
} {
  // A `<music-arpeggio>` run note's zero contribution keeps the whole run
  // inside one beat-group window (it cannot straddle an edge).
  const tremoloScaleByIndex = computeTremoloScaleByIndex(tremoloGroups);
  const elementDurationFactors = elements.map((element, i) =>
    durationContribution(
      element,
      i,
      tupletsByIndex,
      arpeggioRunIndices,
      tremoloScaleByIndex
    )
  );
  const beatOffsets =
    elementBeatOffsets ?? cumulativeOffsets(elementDurationFactors);
  const headExtents = elements.map((element) =>
    headStaffYExtent(element, noteStaffYCoords, chordStaffYCoords)
  );
  const beamsBuilder = new BeamsBuilder(
    elements,
    timeSig,
    beatOffsets,
    externallyBeamedIndices,
    resolveTremoloBeamSpecs(
      elements,
      tremoloGroups,
      headExtents,
      externallyBeamedIndices ?? new Set()
    ),
    barlineBeatOffsets,
    flutterTonguedIndices
  );
  // stemDirectionsOverride lets a caller impose a fixed per-voice policy
  // (voice 1 always up, voice 2 always down — see rules/voiceRules.ts)
  // instead of the pitch-driven default: the beam renderer's own Y-position
  // math below depends on stem direction, so swapping directions after
  // construction would leave stale geometry — this must happen before
  // noteYPositions is built, not after.
  const baseStemDirections =
    stemDirectionsOverride ??
    determineStemDirections(
      elements,
      beamsBuilder,
      noteStaffYCoords,
      chordStaffYCoords,
      {
        timeSig,
        beatOffsets,
        durations: elementDurationFactors,
        forcedDirections: crossStaffStemOverrides,
      }
    );
  // crossStaffStemOverrides overlays the base policy. Keyed by element, since
  // `elements` is one voice's local array, not the measure's staff-wide one.
  const stemDirections = crossStaffStemOverrides
    ? baseStemDirections.map(
        (d, i) => crossStaffStemOverrides.get(elements[i]) ?? d
      )
    : baseStemDirections;
  if (crossStaffStemOverrides) {
    applyOverridesToWholeBeamGroups(
      elements,
      beamsBuilder,
      crossStaffStemOverrides,
      stemDirections
    );
  }

  if (stemDirectionsOverride === undefined) {
    applyKneedBeams(
      elements,
      beamsBuilder,
      headExtents,
      stemDirections,
      beatOffsets,
      clefChangeBeatOffsets,
      crossStaffStemOverrides
    );
  }

  const noteYPositions: (NoteYPosition | null)[] = elements.map(
    (element, i) => {
      if (!beamsBuilder.needsYPosition(i)) {
        return null;
      }
      const stemUp = stemDirections[i];
      const { highest, lowest } = headExtents[i];
      return {
        stemUp,
        highestHeadStaffY: highest,
        lowestHeadStaffY: lowest,
        minimumStemPx: beamedTremoloMinimumStemPx({
          tremolo: tremoloOf(element),
          stemCross:
            element.nodeName !== MUSIC_REST_NODE &&
            (element as NoteElementType | ChordElementType).stemMark ===
              'cross',
          duration: element.duration,
          nearestHeadY: stemUp ? highest : lowest,
          stemUp,
        }),
        scale:
          element.nodeName === MUSIC_REST_NODE
            ? 1
            : noteSizeScale(
                (element as NoteElementType | ChordElementType).size
              ),
      };
    }
  );

  return {
    beamsBuilder,
    beamRenderer: beamsBuilder.buildRenderer(noteYPositions),
    stemDirections,
  };
}

function headStaffYExtent(
  element: NoteChordOrRestElementType,
  noteStaffYCoords: ReadonlyMap<NoteElementType, number>,
  chordStaffYCoords: ReadonlyMap<ChordElementType, number[]>
): { highest: number; lowest: number } {
  const staffYs = isNoteNodeName(element.nodeName)
    ? [noteStaffYCoords.get(element as NoteElementType) ?? 0]
    : chordStaffYCoords.get(element as ChordElementType) ?? [];
  if (staffYs.length === 0) {
    return { highest: 0, lowest: 0 };
  }
  return { highest: Math.min(...staffYs), lowest: Math.max(...staffYs) };
}

function tremoloOf(element: NoteChordOrRestElementType): TremoloValue | null {
  return element.nodeName === MUSIC_REST_NODE
    ? null
    : (element as NoteElementType | ChordElementType).tremolo ?? null;
}

// A wide-interval group whose one-direction beam would need a very long stem
// takes a beam between its noteheads instead, with stems both ways, when that
// fits however the notes end up spaced. Only pitch-driven groups qualify: a
// forced direction keeps its beam, and so does a group a clef change falls
// inside, since the clef sits in the stave where a kneed beam would run. A
// group with tremolo strokes keeps its beam too: the strokes need the stem
// length a kneed beam takes away. A cue group keeps its beam as well: a knee
// is laid out at full size only.
function applyKneedBeams(
  elements: NoteChordOrRestElementType[],
  beamsBuilder: BeamsBuilder,
  headExtents: readonly { highest: number; lowest: number }[],
  stemDirections: boolean[],
  beatOffsets: readonly number[],
  clefChangeBeatOffsets: readonly number[],
  forcedDirections?: ReadonlyMap<NoteChordOrRestElementType, boolean>
): void {
  const visited = new Set<number>();
  for (let i = 0; i < elements.length; i++) {
    const group = beamsBuilder.beamGroupFor(i);
    if (group === null || visited.has(i)) {
      continue;
    }
    group.forEach((index) => visited.add(index));
    if (
      group.some(
        (index) =>
          forcedDirections?.has(elements[index]) ||
          tremoloOf(elements[index]) !== null ||
          (elements[index] as NoteElementType | ChordElementType).size ===
            'cue' ||
          beamsBuilder.isTremoloMember(index)
      )
    ) {
      continue;
    }
    const firstBeat = beatOffsets[group[0]];
    const lastBeat = beatOffsets[group[group.length - 1]];
    if (
      clefChangeBeatOffsets.some(
        (clefBeat) => clefBeat > firstBeat && clefBeat <= lastBeat
      )
    ) {
      continue;
    }
    const notes = group.map((index, position) => ({
      x: position * BEAM_ESTIMATE_NOTE_SPACING_PX,
      highestHeadY: headExtents[index].highest,
      lowestHeadY: headExtents[index].lowest,
      beamCount:
        durationToFlagCountMap.get(elements[index].duration as DurationType) ??
        1,
    }));
    const stemUp = stemDirections[group[0]];
    const { longestStemPx } = resolveBeamPlacement({
      notes: notes.map((note) => ({
        x: note.x,
        nearestHeadY: stemUp ? note.highestHeadY : note.lowestHeadY,
        beamCount: note.beamCount,
      })),
      stemUp,
    });
    if (longestStemPx <= KNEED_BEAM_TRIGGER_STEM_PX) {
      continue;
    }
    const stemUps = resolveKneedBeamSplit(notes);
    if (
      stemUps === null ||
      !resolveKneedBeamPlacement(notes, stemUps, { anySpacing: true }).fits
    ) {
      continue;
    }
    group.forEach((index, position) => {
      stemDirections[index] = stemUps[position];
    });
  }
}

function cumulativeOffsets(durations: readonly number[]): number[] {
  let offset = 0;
  return durations.map((duration) => {
    const start = offset;
    offset += duration;
    return start;
  });
}

// A same-staff beam is drawn with one stem direction, so a direction forced
// on any member applies to every member; the first forced member in the
// group wins a conflict. Cross-staff double-stemmed members never form a
// same-staff group (externallyBeamedIndices), so their own overrides stay
// per element.
function applyOverridesToWholeBeamGroups(
  elements: NoteChordOrRestElementType[],
  beamsBuilder: BeamsBuilder,
  overrides: ReadonlyMap<NoteChordOrRestElementType, boolean>,
  stemDirections: boolean[]
): void {
  const visited = new Set<number>();
  for (let i = 0; i < elements.length; i++) {
    const group = beamsBuilder.beamGroupFor(i);
    if (group === null || visited.has(i)) {
      continue;
    }
    group.forEach((index) => visited.add(index));
    const forced = group
      .map((index) => overrides.get(elements[index]))
      .filter((direction): direction is boolean => direction !== undefined);
    if (forced.length === 0) {
      continue;
    }
    if (forced.some((direction) => direction !== forced[0])) {
      console.warn(
        `[beamRules] beamed notes force conflicting stem directions; using the first one (${
          forced[0] ? 'up' : 'down'
        }) for the whole beam`
      );
    }
    for (const index of group) {
      stemDirections[index] = forced[0];
    }
  }
}

// Flattening keeps any <music-tremolo> whose children can make one; what its
// beams can do depends on the members' pitches and value, checked here. A
// wrapper the measure joins across staves, or one with a single note on this
// staff, has no beams of its own.
function resolveTremoloBeamSpecs(
  elements: readonly NoteChordOrRestElementType[],
  groups: readonly TremoloGroupPlacement[],
  headExtents: readonly { highest: number; lowest: number }[],
  // Members the measure beams across both staves (a tremolo-group).
  externallyBeamedIndices: ReadonlySet<number>
): TremoloBeamGroupSpec[] {
  const specs: TremoloBeamGroupSpec[] = [];
  for (const { memberIndices, element } of groups) {
    const notes = memberIndices.filter(
      (index) =>
        elements[index] !== undefined &&
        elements[index].nodeName !== MUSIC_REST_NODE &&
        !externallyBeamedIndices.has(index)
    );
    if (notes.length < 2) {
      continue;
    }
    const duration = elements[notes[0]].duration;
    const warnings: string[] = [];
    let beamAttach = element.beamAttach;
    if (beamAttach !== null && !acceptsBeamAttach(duration)) {
      warnings.push(
        `beam-attach only applies to minims; ignoring it on a ${duration} tremolo`
      );
      beamAttach = null;
    }
    let between = element.beamPosition === 'between';
    if (between) {
      const extentYs = (index: number) => [
        headExtents[index].highest,
        headExtents[index].lowest,
      ];
      const fits =
        notes.length === 2 &&
        (durationToFlagCountMap.get(duration) ?? 0) === 0 &&
        canPlaceTremoloBetween(extentYs(notes[0]), extentYs(notes[1]));
      if (!fits) {
        warnings.push(
          'beam-position="between" needs two unbeamed notes an octave or more apart; placing the beams between the stems'
        );
        between = false;
      }
    }
    warnOncePerTremolo(
      element,
      warnings.length > 0 ? `[music-tremolo] ${warnings.join('; ')}` : null
    );
    specs.push({
      memberIndices: notes,
      duration,
      strokes: element.strokes,
      beamAttach,
      between,
    });
  }
  return specs;
}

// Beams are rebuilt on every render; a wrapper's warning repeats only once
// its text changes.
const lastTremoloWarnings = new WeakMap<Element, string>();
function warnOncePerTremolo(element: Element, warning: string | null): void {
  if (warning === null) {
    lastTremoloWarnings.delete(element);
    return;
  }
  if (lastTremoloWarnings.get(element) !== warning) {
    lastTremoloWarnings.set(element, warning);
    console.warn(warning);
  }
}
