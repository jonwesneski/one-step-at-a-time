export type TabMirrorEntry = {
  kind: 'notation' | 'tab' | 'other';
  part: string | null;
  tabFor: string | null;
};

export type TabMirrorResolution = {
  /** Tab staff index → the notation staff index it mirrors. */
  links: Map<number, number>;
  warnings: string[];
};

/**
 * Pairs each guitar-tab staff in a measure with the notation staff it mirrors:
 * its `tab-for` must match the `part` of exactly one notation staff among its
 * siblings. A tab with no match, or with several, stays unlinked and warns.
 */
export function resolveTabMirrors(
  entries: readonly TabMirrorEntry[]
): TabMirrorResolution {
  const links = new Map<number, number>();
  const warnings: string[] = [];
  entries.forEach((entry, tabIndex) => {
    if (entry.kind !== 'tab' || entry.tabFor === null) {
      return;
    }
    const matches = entries.flatMap((candidate, index) =>
      candidate.kind === 'notation' && candidate.part === entry.tabFor
        ? [index]
        : []
    );
    if (matches.length === 1) {
      links.set(tabIndex, matches[0]);
      return;
    }
    warnings.push(
      matches.length === 0
        ? `[tab-for] "${entry.tabFor}" matches no notation staff's part in this measure; the tab won't follow it`
        : `[tab-for] "${entry.tabFor}" matches ${matches.length} notation staves' part in this measure; the tab won't follow any of them`
    );
  });
  return { links, warnings };
}
