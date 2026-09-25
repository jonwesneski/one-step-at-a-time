import { MUSIC_REST_NODE } from '../utils/consts';

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
