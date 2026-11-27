import type { DurationType } from '../types/theory';
import {
  BEAM_STEP_PX,
  BEAM_THICKNESS_PX,
  STEM_OVERLAP_PX,
} from '../utils/notationDimensions';
import { type TremoloBeamSegment, tremoloDetachedSpan } from './tremoloRules';

/** What one staff does with its wrapper of a resolved cross-staff tremolo. */
export type CrossStaffTremoloRole = { stemUp: boolean };

export type CrossStaffTremoloMember<TElement> = {
  element: TElement;
  isRest: boolean;
  duration: DurationType;
  /** Whole-note fraction this member takes: its share of the written value. */
  beatLength: number;
  cue?: boolean;
};

export type CrossStaffTremoloEntry<TTremolo, TElement> = {
  staffIndex: number;
  tremolo: TTremolo;
  tremoloGroup: string;
  strokes: number;
  /** False when the wrapper's children can't make a tremolo at all. */
  valid: boolean;
  /** Inside a tuplet or arpeggio, or holding another wrapper. */
  isNested: boolean;
  /** Beat offset of its first member in its staff; null before layout. */
  startBeat: number | null;
  members: CrossStaffTremoloMember<TElement>[];
};

/** A member that sounds, in order across both staves. */
export type CrossStaffTremoloNote<TElement> = {
  element: TElement;
  staffIndex: number;
  onset: number;
};

export type CrossStaffTremoloGroup<TTremolo, TElement> = {
  id: string;
  topStaffIndex: number;
  bottomStaffIndex: number;
  topTremolo: TTremolo;
  bottomTremolo: TTremolo;
  strokes: number;
  duration: DurationType;
  notes: CrossStaffTremoloNote<TElement>[];
};

export type CrossStaffTremoloResolution<TTremolo, TElement> = {
  groups: CrossStaffTremoloGroup<TTremolo, TElement>[];
  warnings: string[];
};

const BEAT_EPSILON = 1e-9;

/**
 * Joins one `<music-tremolo tremolo-group>` on each of two adjacent staves
 * into one tremolo between the hands. Same warn-and-drop shape as
 * resolveCrossStaffTupletGroups: a dropped group's wrappers fall back to
 * ordinary per-staff tremolos, and one bad group never affects another.
 */
export function resolveCrossStaffTremoloGroups<TTremolo, TElement>(
  entries: readonly CrossStaffTremoloEntry<TTremolo, TElement>[]
): CrossStaffTremoloResolution<TTremolo, TElement> {
  const warnings: string[] = [];
  const entriesById = new Map<
    string,
    CrossStaffTremoloEntry<TTremolo, TElement>[]
  >();
  for (const entry of entries) {
    const grouped = entriesById.get(entry.tremoloGroup) ?? [];
    grouped.push(entry);
    entriesById.set(entry.tremoloGroup, grouped);
  }

  const groups: CrossStaffTremoloGroup<TTremolo, TElement>[] = [];
  for (const [id, grouped] of entriesById) {
    const skip = (reason: string) =>
      warnings.push(
        `[crossStaffTremoloRules] tremolo-group "${id}" ${reason}; drawing each staff's tremolo on its own`
      );

    const staffIndices = [...new Set(grouped.map((e) => e.staffIndex))];
    if (staffIndices.length !== 2) {
      skip(
        `spans ${staffIndices.length} staff(es); a cross-staff tremolo needs exactly 2`
      );
      continue;
    }
    if (grouped.length !== 2) {
      skip('has more than one <music-tremolo> on one staff');
      continue;
    }
    const [top, bottom] = [...grouped].sort(
      (a, b) => a.staffIndex - b.staffIndex
    );
    if (bottom.staffIndex - top.staffIndex !== 1) {
      skip(
        `spans non-adjacent staves (${top.staffIndex}, ${bottom.staffIndex})`
      );
      continue;
    }
    if (!top.valid || !bottom.valid) {
      skip("has a wrapper whose children can't make a tremolo");
      continue;
    }
    if (top.isNested || bottom.isNested) {
      skip('is nested inside, or holds, another wrapper');
      continue;
    }
    if ([...top.members, ...bottom.members].some((member) => member.cue)) {
      skip(
        'has a cue-sized member; a cross-staff tremolo takes full-size notes only'
      );
      continue;
    }
    if (top.strokes !== bottom.strokes) {
      skip(`has different strokes (${top.strokes}, ${bottom.strokes})`);
      continue;
    }
    const durations = new Set(
      [...top.members, ...bottom.members].map((member) => member.duration)
    );
    if (durations.size !== 1) {
      skip('has members of different durations');
      continue;
    }
    if (top.members.length !== bottom.members.length) {
      skip('holds a different number of notes and spacers on each staff');
      continue;
    }
    if (
      top.startBeat !== null &&
      bottom.startBeat !== null &&
      Math.abs(top.startBeat - bottom.startBeat) > BEAT_EPSILON
    ) {
      skip('starts on a different beat on each staff');
      continue;
    }
    const notesOf = (entry: CrossStaffTremoloEntry<TTremolo, TElement>) => {
      let onset = 0;
      const notes: CrossStaffTremoloNote<TElement>[] = [];
      for (const member of entry.members) {
        if (!member.isRest) {
          notes.push({
            element: member.element,
            staffIndex: entry.staffIndex,
            onset,
          });
        }
        onset += member.beatLength;
      }
      return notes;
    };
    const topNotes = notesOf(top);
    const bottomNotes = notesOf(bottom);
    if (topNotes.length === 0 || bottomNotes.length === 0) {
      skip('needs a note on each staff');
      continue;
    }
    groups.push({
      id,
      topStaffIndex: top.staffIndex,
      bottomStaffIndex: bottom.staffIndex,
      topTremolo: top.tremolo,
      bottomTremolo: bottom.tremolo,
      strokes: top.strokes,
      duration: [...durations][0],
      notes: [...topNotes, ...bottomNotes].sort((a, b) => a.onset - b.onset),
    });
  }

  return { groups, warnings };
}

/** The beam line, measure-relative: the top edge of the topmost beam. */
export type CrossStaffTremoloLine = {
  firstX: number;
  lastX: number;
  yAtFirstX: number;
  yAtLastX: number;
};

export function crossStaffTremoloLineYAtX(
  line: CrossStaffTremoloLine,
  x: number
): number {
  const span = line.lastX - line.firstX;
  return span === 0
    ? line.yAtFirstX
    : line.yAtFirstX +
        ((line.yAtLastX - line.yAtFirstX) * (x - line.firstX)) / span;
}

/**
 * The stack's top edge, measure-relative, centred in the gap between the
 * staves as if the notes were beamed mid-system, keeping `slope`.
 */
export function centredCrossStaffTremoloLine(input: {
  firstX: number;
  lastX: number;
  slope: number;
  topGapEdgeY: number;
  bottomGapEdgeY: number;
  total: number;
}): CrossStaffTremoloLine {
  const { firstX, lastX, slope, topGapEdgeY, bottomGapEdgeY, total } = input;
  const stackHeight = BEAM_THICKNESS_PX + (total - 1) * BEAM_STEP_PX;
  const middleTop = (topGapEdgeY + bottomGapEdgeY) / 2 - stackHeight / 2;
  const halfRise = (slope * (lastX - firstX)) / 2;
  return {
    firstX,
    lastX,
    yAtFirstX: middleTop - halfRise,
    yAtLastX: middleTop + halfRise,
  };
}

/** Each beam's horizontal reach, and its offset below the stack's top. */
export function crossStaffTremoloBeamShapes(input: {
  stemXs: readonly number[];
  attached: number;
  total: number;
}): { left: number; right: number; topOffset: number; bottomOffset: number }[] {
  const { stemXs, attached, total } = input;
  const detached = tremoloDetachedSpan(stemXs);
  return Array.from({ length: total }, (_, level) => {
    const { x1, x2 } =
      level < attached
        ? { x1: stemXs[0], x2: stemXs[stemXs.length - 1] }
        : detached;
    const topOffset = level * BEAM_STEP_PX;
    return {
      left: x1,
      right: x2,
      topOffset,
      bottomOffset: topOffset + BEAM_THICKNESS_PX,
    };
  });
}

/**
 * A cross-staff tremolo's beams and each stem's end, measure-relative. A beam
 * joining the stems sits on top and the rest hang below it, both stems ending
 * in it; with every beam detached, each stem reaches past the whole stack.
 */
export function resolveCrossStaffTremoloBeams(input: {
  stems: readonly { x: number; stemUp: boolean }[];
  line: CrossStaffTremoloLine;
  attached: number;
  total: number;
}): { beams: TremoloBeamSegment[]; stemTipYs: number[] } {
  const { stems, line, attached, total } = input;
  const yAt = (x: number) => crossStaffTremoloLineYAtX(line, x);
  const beams = crossStaffTremoloBeamShapes({
    stemXs: stems.map((stem) => stem.x),
    attached,
    total,
  }).map((shape) => ({
    x1: shape.left,
    x2: shape.right,
    top1: yAt(shape.left) + shape.topOffset,
    top2: yAt(shape.right) + shape.topOffset,
  }));
  const stackHeight = BEAM_THICKNESS_PX + (total - 1) * BEAM_STEP_PX;
  const stemTipYs = stems.map(({ x, stemUp }) => {
    const top = yAt(x);
    if (attached > 0) {
      return top + STEM_OVERLAP_PX;
    }
    return stemUp ? top : top + stackHeight;
  });
  return { beams, stemTipYs };
}
