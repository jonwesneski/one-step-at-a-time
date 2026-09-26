import type { RestStaffSide } from '../types/theory';
import { MUSIC_REST_NODE } from '../utils/consts';
import type { BeamLineDescriptor } from './beamStructureRules';

export type DoubleStemmedBeamMember = {
  staffIndex: number;
  entryIndex: number;
  isRest: boolean;
};

export type DoubleStemmedBeamGroup = {
  id: string;
  topStaffIndex: number;
  bottomStaffIndex: number;
  /** Ascending beat order (see resolveDoubleStemmedBeamGroups). */
  members: DoubleStemmedBeamMember[];
};

export type DoubleStemmedBeamEntry = {
  staffIndex: number;
  entryIndex: number;
  beamGroup: string | null;
  nodeName: string;
};

export type DoubleStemmedBeamResolution = {
  groups: DoubleStemmedBeamGroup[];
  warnings: string[];
};

/**
 * Resolves which entries across a measure's staves join one cross-staff
 * double-stemmed beam group, purely from each entry's own `beam-group` value
 * — mirrors rules/staffGroupRules.ts#resolveStaffGroups' shape (pure,
 * unit-testable, since jsdom's ResizeObserver polyfill never fires, so
 * measure.ts's real render path only executes in browser tests).
 *
 * `members` is ordered by `entryIndex` (each staff's own per-measure
 * position), with `staffIndex` as a tiebreak — the same "same-beat notes on
 * sibling staves land at the same index position" assumption this codebase's
 * beat-proportional spacing already relies on elsewhere, not a new one.
 *
 * A group is warned and dropped (its members fall back to ordinary
 * per-staff pitch-driven stem/no-beam rendering — the same failure shape an
 * unmatched `arpeggio-for` has today) when it doesn't span exactly two
 * staves, those two staves aren't immediately adjacent siblings, or it has
 * fewer than 2 non-rest members.
 */
export function resolveDoubleStemmedBeamGroups(
  entries: readonly DoubleStemmedBeamEntry[]
): DoubleStemmedBeamResolution {
  const warnings: string[] = [];
  const membersById = new Map<string, DoubleStemmedBeamMember[]>();

  for (const entry of entries) {
    if (entry.beamGroup === null) {
      continue;
    }
    const members = membersById.get(entry.beamGroup) ?? [];
    members.push({
      staffIndex: entry.staffIndex,
      entryIndex: entry.entryIndex,
      isRest: entry.nodeName === MUSIC_REST_NODE,
    });
    membersById.set(entry.beamGroup, members);
  }

  const groups: DoubleStemmedBeamGroup[] = [];

  for (const [id, unsortedMembers] of membersById) {
    const members = [...unsortedMembers].sort(
      (a, b) => a.entryIndex - b.entryIndex || a.staffIndex - b.staffIndex
    );

    const staffIndices = [...new Set(members.map((m) => m.staffIndex))];
    if (staffIndices.length !== 2) {
      warnings.push(
        `[doubleStemmedBeamRules] beam-group "${id}" spans ${staffIndices.length} staff(es); a double-stemmed beam group needs exactly 2, skipping`
      );
      continue;
    }

    const topStaffIndex = Math.min(...staffIndices);
    const bottomStaffIndex = Math.max(...staffIndices);
    if (bottomStaffIndex - topStaffIndex !== 1) {
      warnings.push(
        `[doubleStemmedBeamRules] beam-group "${id}" spans non-adjacent staves (${topStaffIndex}, ${bottomStaffIndex}); skipping`
      );
      continue;
    }

    const nonRestCount = members.filter((m) => !m.isRest).length;
    if (nonRestCount < 2) {
      warnings.push(
        `[doubleStemmedBeamRules] beam-group "${id}" has fewer than 2 non-rest members; skipping`
      );
      continue;
    }

    groups.push({ id, topStaffIndex, bottomStaffIndex, members });
  }

  return { groups, warnings };
}

export type DoubleStemmedBeamPoint = {
  /** Real px, measure-relative. */
  x: number;
  /**
   * Real px, measure-relative — each member's own unshifted stem-tip target
   * (where it would naturally reach toward the inter-staff gap, before this
   * function decides the shared beam's actual line). Not the final beam Y.
   */
  naturalY: number;
  // Not read by resolveDoubleStemmedBeamLine itself (the shared beam is one
  // line regardless of which staff a point came from) — carried through so
  // a caller building this array from real DOM points doesn't need a
  // separate parallel array to know it later.
  isTopStaff: boolean;
};

export type DoubleStemmedBeamLine = {
  yAtFirstX: number;
  yAtLastX: number;
};

const BEAM_ANGLE_DEAD_ZONE = 0.05;
const MAX_BEAM_ANGLE = 0.15;

/**
 * Resolves the shared beam's `Y = f(X)` line for a double-stemmed group from
 * its members' own natural (unshifted) stem-tip targets — pure geometry, no
 * DOM. Assumes the caller has already excluded rest members and sorted
 * `points` by ascending X (`resolveDoubleStemmedBeamGroups`'s own
 * `members` order, mapped to real positions).
 *
 * Classifies the group's overall net contour (first vs. last point's
 * `naturalY`) and whether every consecutive step agrees with that trend. A
 * genuinely consistent rise or fall slopes the beam toward it, clamped to
 * the same angle bound `rules/tupletRules.ts` already uses for its own
 * bracket slope (dead zone below 0.05, capped at 0.15) — reused for
 * consistency, not re-derived. Anything else (no net change, an interior
 * step reversing the trend, or a clamped-to-zero angle) falls back to
 * horizontal at the mean of every point's `naturalY`, clamped into
 * `[topStaffGapEdgeY, bottomStaffGapEdgeY]` — "stay clear of the staves"
 * outranks equal stem length for a horizontal beam. The sloped case
 * deliberately skips that clamp: the source engraving rule only ranks
 * staying-out-of-the-staff above equal-length stems for the horizontal case.
 */
export function resolveDoubleStemmedBeamLine(
  points: readonly DoubleStemmedBeamPoint[],
  topStaffGapEdgeY: number,
  bottomStaffGapEdgeY: number
): DoubleStemmedBeamLine {
  const first = points[0];
  const last = points[points.length - 1];

  const meanY = points.reduce((sum, p) => sum + p.naturalY, 0) / points.length;
  const clampedMeanY = Math.max(
    topStaffGapEdgeY,
    Math.min(bottomStaffGapEdgeY, meanY)
  );
  const horizontal: DoubleStemmedBeamLine = {
    yAtFirstX: clampedMeanY,
    yAtLastX: clampedMeanY,
  };

  const netDelta = last.naturalY - first.naturalY;
  if (netDelta === 0) {
    return horizontal;
  }

  const netSign = Math.sign(netDelta);
  for (let i = 0; i < points.length - 1; i++) {
    const stepDelta = points[i + 1].naturalY - points[i].naturalY;
    if (stepDelta !== 0 && Math.sign(stepDelta) !== netSign) {
      return horizontal;
    }
  }

  const run = last.x - first.x;
  if (run <= 0) {
    return horizontal;
  }
  const rawAngle = netDelta / run;
  const angle =
    Math.abs(rawAngle) < BEAM_ANGLE_DEAD_ZONE
      ? 0
      : Math.max(-MAX_BEAM_ANGLE, Math.min(MAX_BEAM_ANGLE, rawAngle));
  if (angle === 0) {
    return horizontal;
  }

  return {
    yAtFirstX: first.naturalY,
    yAtLastX: first.naturalY + angle * run,
  };
}

/** Which staff a secondary/fractional beam segment stacks toward. */
export type DoubleStemmedBeamSegmentSide = 'top' | 'bottom';

/**
 * Where a secondary/fractional beam segment sits relative to the group's
 * own overall span — only matters for the "genuine conflict" tie-break in
 * resolveSecondaryBeamVerticalSide below. A segment that both starts and
 * ends the group (i.e. spans every member) is 'start' — moot in practice,
 * since a whole-group-spanning segment is necessarily single-direction and
 * never reaches that tie-break.
 */
export type DoubleStemmedBeamSegmentPosition = 'start' | 'end' | 'middle';

/**
 * Resolves which staff's side a secondary or fractional beam segment
 * stacks toward — a question the single-staff model never has to answer,
 * since a same-staff group only ever has one uniform stem direction for
 * every level. Impossible to answer here without knowing, per member in
 * the segment's own index range, which staff it belongs to (`members`,
 * `groupTopStaffIndex` — the complementary `bottomStaffIndex` is implied,
 * since a resolved group always spans exactly two staves).
 *
 * Order of rules: every member in the segment's range is on the same
 * staff → that side. Otherwise (mixed): the segment's own first and last
 * member (its "outer" notes) agree → that side. Otherwise (a genuine
 * outer-direction conflict) → the opposite of the first member's side when
 * the segment sits at the very start of the group's own span, or the first
 * member's own side otherwise (both the group's own end and any interior
 * segment — the source engraving rule only specifies the start/end case;
 * extending the end rule to an interior conflict is the least arbitrary
 * default absent a directional bias to prefer flipping it there).
 */
export function resolveSecondaryBeamVerticalSide(
  segment: BeamLineDescriptor,
  members: readonly DoubleStemmedBeamMember[],
  groupTopStaffIndex: number,
  positionInMainBeam: DoubleStemmedBeamSegmentPosition
): DoubleStemmedBeamSegmentSide {
  const sideOf = (memberIndex: number): DoubleStemmedBeamSegmentSide =>
    members[memberIndex].staffIndex === groupTopStaffIndex ? 'top' : 'bottom';

  const segmentSides = new Set<DoubleStemmedBeamSegmentSide>();
  for (let i = segment.fromNoteIndex; i <= segment.toNoteIndex; i++) {
    segmentSides.add(sideOf(i));
  }
  if (segmentSides.size === 1) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- a Set with size 1 always has exactly one value
    return [...segmentSides][0]!;
  }

  const firstSide = sideOf(segment.fromNoteIndex);
  const lastSide = sideOf(segment.toNoteIndex);
  if (firstSide === lastSide) {
    return firstSide;
  }

  if (positionInMainBeam === 'start') {
    return firstSide === 'top' ? 'bottom' : 'top';
  }
  return firstSide;
}

/**
 * Auto-classifies which side of the shared beam a rest (a member with
 * `isRest: true`) should sit against, when its own `restStaffSide` is
 * unset — approximates two rules from the reference engraving material:
 * "at the beginning/end of a subdivision, place the rest on the same
 * stave as the remainder of the subdivision" and "in the middle of a
 * beat, place it on the stave of the note it precedes." No beat-subdivision
 * machinery exists anywhere in this codebase (beam levels track flag-count
 * runs, not raw beat subdivisions), so this approximates both rules using
 * only adjacency in `members` (ascending beat order, from
 * resolveDoubleStemmedBeamGroups): a rest interior to a same-staff run of
 * neighbors takes that staff's side; otherwise it prefers the following
 * member's side (the literal "the note it precedes" rule) over the
 * preceding one.
 */
export function classifyAutoRestStaffSide(
  members: readonly DoubleStemmedBeamMember[],
  restMemberIndex: number,
  topStaffIndex: number
): RestStaffSide {
  const prev = members[restMemberIndex - 1];
  const next = members[restMemberIndex + 1];
  const neighborStaffIndex =
    prev && next && prev.staffIndex === next.staffIndex
      ? prev.staffIndex
      : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- at least one neighbor exists given a resolved group always has >=2 non-rest members
        (next ?? prev ?? members[restMemberIndex])!.staffIndex;
  return neighborStaffIndex === topStaffIndex ? 'above' : 'below';
}

/**
 * "Keep all secondary beams on the same side" — the group-wide post-pass
 * resolveSecondaryBeamVerticalSide's own per-segment result still needs. A
 * clear majority across every segment in the group wins; an exact tie
 * breaks toward `tieBreakSide` (the group's own pitch-contour lean —
 * resolveDoubleStemmedBeamLine's net ascend/descend classification, supplied
 * by the caller since this function has no access to real geometry).
 */
export function resolveGroupSecondaryBeamSide(
  segmentSides: readonly DoubleStemmedBeamSegmentSide[],
  tieBreakSide: DoubleStemmedBeamSegmentSide
): DoubleStemmedBeamSegmentSide {
  if (segmentSides.length === 0) {
    return tieBreakSide;
  }
  const topCount = segmentSides.filter((side) => side === 'top').length;
  const bottomCount = segmentSides.length - topCount;
  if (topCount === bottomCount) {
    return tieBreakSide;
  }
  return topCount > bottomCount ? 'top' : 'bottom';
}
