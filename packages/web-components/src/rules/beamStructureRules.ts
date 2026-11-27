import { STAFF_LINE_SPACING } from '../utils/notationDimensions';

export type BeamLineDescriptor = {
  fromNoteIndex: number;
  toNoteIndex: number;
  beamLevel: number;
  fractionalBeamSide?: 'left' | 'right';
  /** The line's end runs on past its stem toward the rest beside it. */
  reachesLeft?: boolean;
  reachesRight?: boolean;
};

/** A beam group member: a note, or a `beam-over` rest (no stem). */
export type BeamOverMember = { beamCount: number; rest: boolean };

const BEAM_REACH_FRACTION = 0.4;
const MAX_BEAM_REACH_PX = 2 * STAFF_LINE_SPACING;

/**
 * How far (px) a beam runs past a stem toward a rest it reaches over: 0.4 of
 * the way to the rest's centre, at most 2 spaces.
 */
export function beamReachOverRest(noteX: number, restCenterX: number): number {
  return Math.min(
    BEAM_REACH_FRACTION * Math.abs(restCenterX - noteX),
    MAX_BEAM_REACH_PX
  );
}

/**
 * Derives the beam structure (which notes are joined by a beam line at each
 * level) purely from each note's own beam count (flag count: eighth=1,
 * sixteenth=2, …) — no note position, duration type, or DOM involved. Level 0
 * always produces exactly one full-span primary beam across every note in the
 * group (called only for >=2 beamable notes, so this is always non-null).
 * Level 1+ produces either a full-span secondary beam (a consecutive run of
 * notes sharing that level) or a fractional (partial/stub) beam for an
 * isolated note at that level, stubbed toward its nearest neighbor (left if
 * it has a predecessor in the group, right otherwise).
 */
export function computeBeamLevelStructure(beamCounts: readonly number[]): {
  primaryBeam: BeamLineDescriptor;
  secondaryBeams: BeamLineDescriptor[];
  fractionalBeams: BeamLineDescriptor[];
} {
  let primaryBeam: BeamLineDescriptor | undefined;
  const secondaryBeams: BeamLineDescriptor[] = [];
  const fractionalBeams: BeamLineDescriptor[] = [];
  const maxBeamCount = Math.max(...beamCounts);

  for (let level = 0; level < maxBeamCount; level++) {
    let beamRunStart = -1;
    for (let i = 0; i <= beamCounts.length; i++) {
      const participatesAtLevel =
        i < beamCounts.length && beamCounts[i] > level;

      if (participatesAtLevel && beamRunStart === -1) {
        beamRunStart = i;
      } else if (!participatesAtLevel && beamRunStart !== -1) {
        const runEnd = i - 1;
        if (runEnd > beamRunStart) {
          // Multiple notes — full beam run at this level.
          const beamLine: BeamLineDescriptor = {
            fromNoteIndex: beamRunStart,
            toNoteIndex: runEnd,
            beamLevel: level,
          };
          if (level === 0) {
            primaryBeam = beamLine;
          } else {
            secondaryBeams.push(beamLine);
          }
        } else {
          // Single isolated note — fractional (partial/stub) beam toward the nearest neighbor.
          const fractionalBeamSide = beamRunStart > 0 ? 'left' : 'right';
          fractionalBeams.push({
            fromNoteIndex: beamRunStart,
            toNoteIndex: beamRunStart,
            beamLevel: level,
            fractionalBeamSide,
          });
        }
        beamRunStart = -1;
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- called only for >=2 beamable notes, so a full-span primary beam is always built above
  return { primaryBeam: primaryBeam!, secondaryBeams, fractionalBeams };
}

/**
 * Beam lines for a group whose members include `beam-over` rests (indices
 * are member indices). Rests inside the run take part with their own beam
 * count, so the primary runs through them and secondaries break as they
 * would for the rest's value; a line never ends on a rest, reaching toward
 * it instead. At an outer note beside a rest every level reaches toward it,
 * a partial beam there turning into that reach. A lone note gets a reaching
 * stub per beam on each side with a rest.
 */
export function computeBeamLinesOverRests(
  members: readonly BeamOverMember[]
): BeamLineDescriptor[] {
  const noteIndices = members.flatMap((member, i) => (member.rest ? [] : [i]));
  const first = noteIndices[0];
  const last = noteIndices[noteIndices.length - 1];
  const restBefore = first > 0;
  const restAfter = last < members.length - 1;
  const reaches = (left: boolean, right: boolean) => ({
    ...(left ? { reachesLeft: true } : {}),
    ...(right ? { reachesRight: true } : {}),
  });
  if (first === last) {
    return Array.from({ length: members[first].beamCount }, (_, level) => ({
      fromNoteIndex: first,
      toNoteIndex: first,
      beamLevel: level,
      ...reaches(restBefore, restAfter),
    }));
  }
  const { primaryBeam, secondaryBeams, fractionalBeams } =
    computeBeamLevelStructure(
      members.slice(first, last + 1).map((member) => member.beamCount)
    );
  const lines: BeamLineDescriptor[] = [];
  for (const line of [primaryBeam, ...secondaryBeams, ...fractionalBeams]) {
    let from = line.fromNoteIndex + first;
    let to = line.toNoteIndex + first;
    if (line.fractionalBeamSide !== undefined) {
      if (members[from].rest) {
        continue;
      }
      const reachLeft = from === first && restBefore;
      const reachRight = from === last && restAfter;
      lines.push(
        reachLeft || reachRight
          ? {
              fromNoteIndex: from,
              toNoteIndex: to,
              beamLevel: line.beamLevel,
              ...reaches(reachLeft, reachRight),
            }
          : { ...line, fromNoteIndex: from, toNoteIndex: to }
      );
      continue;
    }
    const startsAtRest = members[from].rest;
    const endsAtRest = members[to].rest;
    while (from <= to && members[from].rest) {
      from++;
    }
    while (to >= from && members[to].rest) {
      to--;
    }
    if (from > to) {
      continue;
    }
    lines.push({
      fromNoteIndex: from,
      toNoteIndex: to,
      beamLevel: line.beamLevel,
      ...reaches(
        startsAtRest || (from === first && restBefore),
        endsAtRest || (to === last && restAfter)
      ),
    });
  }
  return lines;
}
