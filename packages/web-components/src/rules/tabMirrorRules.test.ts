import { resolveTabMirrors, type TabMirrorEntry } from './tabMirrorRules';

const notation = (part: string | null): TabMirrorEntry => ({
  kind: 'notation',
  part,
  tabFor: null,
});
const tab = (tabFor: string | null, part: string | null = null) =>
  ({ kind: 'tab', part, tabFor } satisfies TabMirrorEntry);

describe('resolveTabMirrors', () => {
  it('links a tab to the notation staff whose part it names', () => {
    const { links, warnings } = resolveTabMirrors([
      notation('piano'),
      notation('guitar'),
      tab('guitar'),
    ]);
    expect([...links]).toEqual([[2, 1]]);
    expect(warnings).toEqual([]);
  });

  it('leaves a tab without tab-for unlinked, silently', () => {
    const { links, warnings } = resolveTabMirrors([
      notation('guitar'),
      tab(null),
    ]);
    expect(links.size).toBe(0);
    expect(warnings).toEqual([]);
  });

  it('warns when no notation staff carries that part', () => {
    const { links, warnings } = resolveTabMirrors([
      notation('piano'),
      tab('guitar'),
    ]);
    expect(links.size).toBe(0);
    expect(warnings).toEqual([expect.stringContaining('matches no')]);
  });

  it('warns when several notation staves carry that part', () => {
    const { links, warnings } = resolveTabMirrors([
      notation('guitar'),
      notation('guitar'),
      tab('guitar'),
    ]);
    expect(links.size).toBe(0);
    expect(warnings).toEqual([expect.stringContaining('matches 2')]);
  });

  it('does not link to another tab staff', () => {
    const { links } = resolveTabMirrors([tab(null, 'guitar'), tab('guitar')]);
    expect(links.size).toBe(0);
  });
});
