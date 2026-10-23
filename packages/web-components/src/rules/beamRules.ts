import {
  ChordElementType,
  NoteChordOrRestElementType,
  NoteElementType,
  TupletElementType,
} from '../types/elements';
import {
  BeatsInMeasure,
  BeatTypeInMeasure,
  DurationType,
} from '../types/theory';
import {
  BeamsBuilder,
  NOTE_Y_HEAD_OFFSET_STEM_DOWN,
  NOTE_Y_HEAD_OFFSET_STEM_UP,
  type NoteYPosition,
} from '../utils';
import { MUSIC_NOTE_NODE } from '../utils/consts';
import { STAFF_Y_PADDING } from '../utils/notationDimensions';
import { durationContribution } from './beatRules';
import { determineStemDirections } from './staffNoteRules';
import { durationToFlagCountMap } from './theoryConsts';

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
  crossStaffStemOverrides?: ReadonlyMap<NoteChordOrRestElementType, boolean>
): {
  beamsBuilder: BeamsBuilder;
  beamRenderer: ReturnType<BeamsBuilder['buildRenderer']>;
  stemDirections: boolean[];
} {
  // A `<music-arpeggio>` run note's zero contribution keeps the whole run
  // inside one beat-group window (it cannot straddle an edge).
  const elementDurationFactors = elements.map((element, i) =>
    durationContribution(element, i, tupletsByIndex, arpeggioRunIndices)
  );
  const beamsBuilder = new BeamsBuilder(
    elements,
    timeSig,
    elementDurationFactors,
    elementBeatOffsets,
    externallyBeamedIndices
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
      chordStaffYCoords
    );
  // crossStaffStemOverrides (the ancestor <music-measure>'s own
  // double-stemmed-beam resolution) is a sparse overlay applied on top of
  // whichever base policy above produced — it needs BeamsBuilder's own
  // beam-group data (via determineStemDirections) to exist first, so it
  // can't be folded into stemDirectionsOverride itself without duplicating
  // that construction at the call site. Keyed by the element itself, not a
  // positional index: the ancestor <music-measure> resolves it from a
  // staff-flat DOM traversal, but `elements` here is this one voice's own
  // local array (staffClassicalBase.ts#buildVoiceRenderState) — those two
  // index spaces only coincide for a single-voice staff, so an index-keyed
  // map would silently misapply on a multi-voice one. Object identity
  // sidesteps the mismatch entirely, since both sides reference the same
  // live DOM elements.
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

  const noteYPositions: (NoteYPosition | null)[] = elements.map(
    (element, i) => {
      if (!beamsBuilder.isBeamed(i)) {
        return null;
      }
      const stemUp = stemDirections[i];
      const yHeadOffset = stemUp
        ? NOTE_Y_HEAD_OFFSET_STEM_UP
        : NOTE_Y_HEAD_OFFSET_STEM_DOWN;

      if (element.nodeName === MUSIC_NOTE_NODE) {
        const noteElement = element as NoteElementType;
        return {
          y:
            STAFF_Y_PADDING +
            (noteStaffYCoords.get(noteElement) ?? 0) -
            yHeadOffset,
          stemUp,
        };
      }

      const chordElement = element as ChordElementType;
      const staffYCoordinates = chordStaffYCoords.get(chordElement) ?? [];
      const extremalStaffY = stemUp
        ? Math.max(...staffYCoordinates)
        : Math.min(...staffYCoordinates);

      const beamCount =
        durationToFlagCountMap.get(chordElement.duration as DurationType) ?? 1;
      const NOTEHEAD_BEAM_CLEAR = 7.2 + beamCount * 12;
      const nonExtStaffYs = staffYCoordinates.filter(
        (y) => y !== extremalStaffY
      );

      let chordClearanceY: number | undefined;
      if (nonExtStaffYs.length > 0) {
        chordClearanceY = stemUp
          ? Math.min(...nonExtStaffYs) - NOTEHEAD_BEAM_CLEAR
          : Math.max(...nonExtStaffYs) + NOTEHEAD_BEAM_CLEAR;
      }

      return {
        y: STAFF_Y_PADDING + extremalStaffY - yHeadOffset,
        stemUp,
        chordClearanceY,
        chordSpread:
          Math.max(...staffYCoordinates) - Math.min(...staffYCoordinates),
      };
    }
  );

  return {
    beamsBuilder,
    beamRenderer: beamsBuilder.buildRenderer(noteYPositions),
    stemDirections,
  };
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
