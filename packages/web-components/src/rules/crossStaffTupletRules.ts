import type { TupletPlacement } from '../types/theory';
import {
  TUPLET_HOOK_LENGTH_PX,
  TUPLET_NUMERAL_FONT_SIZE,
  TUPLET_STAFF_CLEARANCE_PX,
} from '../utils/notationDimensions';

export type CrossStaffSide = 'top' | 'bottom';

/**
 * `gap`: one bracket centred in the inter-staff gap, each hook pointing at its
 * own outer note's staff. `above`/`below`: one bracket outside the whole
 * system, drawn by the top/bottom staff.
 */
export type CrossStaffTupletLayout = 'gap' | TupletPlacement;

/**
 * What one staff does with its own `<music-tuplet>` of a resolved cross-staff
 * group: its members' stems point into the gap (`stemUp`), and its bracket is
 * either drawn by someone else (`suppressed` — the measure, or the other
 * staff) or by this staff on a forced side.
 */
export type CrossStaffTupletRole = {
  stemUp: boolean;
  rendering: 'suppressed' | TupletPlacement;
};

export type CrossStaffTupletMember<TElement> = {
  element: TElement;
  isRest: boolean;
  /** Unscaled whole-note fraction — both wrappers share one ratio, so relative onsets survive. */
  beatLength: number;
  inBeamGroup: boolean;
};

export type CrossStaffTupletEntry<TTuplet, TElement> = {
  staffIndex: number;
  tuplet: TTuplet;
  tupletGroup: string;
  ratio: { actual: number; normal: number };
  placement: TupletPlacement | null;
  /** Nested inside another tuplet, or containing one. */
  isNested: boolean;
  members: CrossStaffTupletMember<TElement>[];
};

export type CrossStaffTupletLayoutResolution<TElement> = {
  layout: CrossStaffTupletLayout;
  /** The staff holding the earliest/latest note — null when both staves sound there together. */
  startSide: CrossStaffSide | null;
  endSide: CrossStaffSide | null;
  startElement: TElement;
  endElement: TElement;
};

export type CrossStaffTupletGroup<TTuplet, TElement> =
  CrossStaffTupletLayoutResolution<TElement> & {
    id: string;
    topStaffIndex: number;
    bottomStaffIndex: number;
    topTuplet: TTuplet;
    bottomTuplet: TTuplet;
  };

export type CrossStaffTupletResolution<TTuplet, TElement> = {
  groups: CrossStaffTupletGroup<TTuplet, TElement>[];
  warnings: string[];
};

const ONSET_EPSILON = 1e-9;

const totalBeatLength = <TElement>(
  members: readonly CrossStaffTupletMember<TElement>[]
): number => members.reduce((sum, member) => sum + member.beatLength, 0);

/**
 * Joins one `<music-tuplet tuplet-group>` on each of two adjacent staves into
 * a single tuplet spanning both hands. Mirrors resolveDoubleStemmedBeamGroups'
 * warn-and-drop shape: a dropped group's wrappers fall back to ordinary
 * per-staff tuplets, and one bad group never affects another.
 */
export function resolveCrossStaffTupletGroups<TTuplet, TElement>(
  entries: readonly CrossStaffTupletEntry<TTuplet, TElement>[]
): CrossStaffTupletResolution<TTuplet, TElement> {
  const warnings: string[] = [];
  const entriesById = new Map<
    string,
    CrossStaffTupletEntry<TTuplet, TElement>[]
  >();
  for (const entry of entries) {
    const grouped = entriesById.get(entry.tupletGroup) ?? [];
    grouped.push(entry);
    entriesById.set(entry.tupletGroup, grouped);
  }

  const groups: CrossStaffTupletGroup<TTuplet, TElement>[] = [];
  for (const [id, grouped] of entriesById) {
    const skip = (reason: string) =>
      warnings.push(
        `[crossStaffTupletRules] tuplet-group "${id}" ${reason}; skipping`
      );

    const staffIndices = [...new Set(grouped.map((e) => e.staffIndex))];
    if (staffIndices.length !== 2) {
      skip(
        `spans ${staffIndices.length} staff(es); a cross-staff tuplet needs exactly 2`
      );
      continue;
    }
    if (grouped.length !== 2) {
      skip('has more than one <music-tuplet> on one staff');
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
    if (
      top.ratio.actual !== bottom.ratio.actual ||
      top.ratio.normal !== bottom.ratio.normal
    ) {
      skip(
        `joins different ratios (${top.ratio.actual}:${top.ratio.normal} vs ${bottom.ratio.actual}:${bottom.ratio.normal})`
      );
      continue;
    }
    if (
      Math.abs(totalBeatLength(top.members) - totalBeatLength(bottom.members)) >
      ONSET_EPSILON
    ) {
      skip(
        "holds a different total duration on each staff; fill the other hand's beats with <music-rest hidden>"
      );
      continue;
    }
    if (
      top.members.every((m) => m.isRest) ||
      bottom.members.every((m) => m.isRest)
    ) {
      skip('has notes on only one staff; use a plain <music-tuplet> instead');
      continue;
    }
    if (top.isNested || bottom.isNested) {
      skip('is nested in, or contains, another tuplet (not supported)');
      continue;
    }
    if ([...top.members, ...bottom.members].some((m) => m.inBeamGroup)) {
      skip(
        'has beam-group members; a cross-staff-beamed tuplet keeps a per-staff <music-tuplet>'
      );
      continue;
    }

    if (
      top.placement !== null &&
      bottom.placement !== null &&
      top.placement !== bottom.placement
    ) {
      warnings.push(
        `[crossStaffTupletRules] tuplet-group "${id}" has conflicting placement ("${top.placement}" vs "${bottom.placement}"); using the top staff's`
      );
    }
    const placementOverride = top.placement ?? bottom.placement;

    groups.push({
      id,
      topStaffIndex: top.staffIndex,
      bottomStaffIndex: bottom.staffIndex,
      topTuplet: top.tuplet,
      bottomTuplet: bottom.tuplet,
      ...classifyCrossStaffTupletLayout(
        top.members,
        bottom.members,
        placementOverride
      ),
    });
  }

  return { groups, warnings };
}

/**
 * Where one cross-staff tuplet's indication goes. Outer notes on different
 * staves → a bracket in the gap with its ends pointing at each; outer notes
 * on one staff → outside the system on that staff's side (closest to the
 * outer notes), since a bracket in the gap would visually exclude the other
 * hand's notes. Both hands sounding together at an end → the side of the
 * staff holding more notes, `above` on a tie. `placementOverride` wins over
 * all of it. Expects at least one note (non-rest) across both staves.
 */
export function classifyCrossStaffTupletLayout<TElement>(
  topMembers: readonly CrossStaffTupletMember<TElement>[],
  bottomMembers: readonly CrossStaffTupletMember<TElement>[],
  placementOverride: TupletPlacement | null
): CrossStaffTupletLayoutResolution<TElement> {
  const notes: { side: CrossStaffSide; onset: number; element: TElement }[] =
    [];
  for (const [side, members] of [
    ['top', topMembers],
    ['bottom', bottomMembers],
  ] as const) {
    let onset = 0;
    for (const member of members) {
      if (!member.isRest) {
        notes.push({ side, onset, element: member.element });
      }
      onset += member.beatLength;
    }
  }

  const earliest = Math.min(...notes.map((n) => n.onset));
  const latest = Math.max(...notes.map((n) => n.onset));
  const atEarliest = notes.filter(
    (n) => Math.abs(n.onset - earliest) < ONSET_EPSILON
  );
  const atLatest = notes.filter(
    (n) => Math.abs(n.onset - latest) < ONSET_EPSILON
  );
  const soleSide = (
    at: readonly { side: CrossStaffSide }[]
  ): CrossStaffSide | null =>
    at.every((n) => n.side === at[0].side) ? at[0].side : null;
  const startSide = soleSide(atEarliest);
  const endSide = soleSide(atLatest);

  let layout: CrossStaffTupletLayout;
  if (placementOverride !== null) {
    layout = placementOverride;
  } else if (startSide !== null && endSide !== null) {
    if (startSide !== endSide) {
      layout = 'gap';
    } else {
      layout = startSide === 'top' ? 'above' : 'below';
    }
  } else {
    const topCount = notes.filter((n) => n.side === 'top').length;
    const bottomCount = notes.length - topCount;
    layout = bottomCount > topCount ? 'below' : 'above';
  }

  return {
    layout,
    startSide,
    endSide,
    startElement: atEarliest[0].element,
    endElement: atLatest[atLatest.length - 1].element,
  };
}

/**
 * The `gap` layout's bracket line Y: centred in the band that keeps the
 * hooks and numeral clear of both staves and of every member's stem tip
 * pointing into the gap. Falls back to the gap's own centre when that band
 * is empty (stems crowding the gap) — the indication still belongs between
 * the hands.
 */
export function resolveCrossStaffTupletGapBaseY({
  topGapEdgeY,
  bottomGapEdgeY,
  topExtremeY,
  bottomExtremeY,
}: {
  topGapEdgeY: number;
  bottomGapEdgeY: number;
  /** Lowest point any top-staff member reaches into the gap, or null. */
  topExtremeY: number | null;
  /** Highest point any bottom-staff member reaches into the gap, or null. */
  bottomExtremeY: number | null;
}): number {
  const clearance =
    TUPLET_STAFF_CLEARANCE_PX +
    Math.max(TUPLET_HOOK_LENGTH_PX, TUPLET_NUMERAL_FONT_SIZE / 2);
  const upper = Math.max(topGapEdgeY, topExtremeY ?? -Infinity) + clearance;
  const lower =
    Math.min(bottomGapEdgeY, bottomExtremeY ?? Infinity) - clearance;
  if (upper <= lower) {
    return (upper + lower) / 2;
  }
  return (topGapEdgeY + bottomGapEdgeY) / 2;
}
