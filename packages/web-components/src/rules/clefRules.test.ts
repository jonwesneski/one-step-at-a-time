import { generateYCoordinates } from './theoryHelpers';
import { CLEF_DEFINITIONS, getClefRenderData } from './clefRules';

describe('getClefRenderData', () => {
  it('treble: reproduces the C6-C4 Y-coordinate range and octave search order', () => {
    const data = getClefRenderData('treble');
    expect(data.yCoordinates).toEqual(generateYCoordinates('C6', 'C4'));
    expect(data.octaves).toEqual([4, 5, 6]);
  });

  it('bass: reproduces the E4-E2 Y-coordinate range and octave search order', () => {
    const data = getClefRenderData('bass');
    expect(data.yCoordinates).toEqual(generateYCoordinates('E4', 'E2'));
    expect(data.octaves).toEqual([2, 3, 4]);
  });

  it('treble: G major key signature resolves to a single sharp (F5)', () => {
    const data = getClefRenderData('treble');
    expect(data.majorSharpYCoordinates.G).toEqual([data.yCoordinates.F5]);
  });

  it('treble: F major key signature resolves to a single flat (B4)', () => {
    const data = getClefRenderData('treble');
    expect(data.majorFlatYCoordinates.F).toEqual([data.yCoordinates.B4]);
  });

  it('bass: G major key signature resolves to a single sharp (F3)', () => {
    const data = getClefRenderData('bass');
    expect(data.majorSharpYCoordinates.G).toEqual([data.yCoordinates.F3]);
  });

  it('treble: E minor (relative minor of G major) shares G major sharp coordinates', () => {
    const data = getClefRenderData('treble');
    expect(data.minorSharpYCoordinates.E).toEqual(
      data.majorSharpYCoordinates.G
    );
  });

  it('bass: D minor (relative minor of F major) shares F major flat coordinates', () => {
    const data = getClefRenderData('bass');
    expect(data.minorFlatYCoordinates.D).toEqual(data.majorFlatYCoordinates.F);
  });

  it('returns a non-empty clef glyph string for every defined clef', () => {
    for (const clef of Object.keys(
      CLEF_DEFINITIONS
    ) as (keyof typeof CLEF_DEFINITIONS)[]) {
      expect(getClefRenderData(clef).clefSvg.length).toBeGreaterThan(0);
    }
  });

  it('memoizes: repeated calls for the same clef return the same object', () => {
    expect(getClefRenderData('treble')).toBe(getClefRenderData('treble'));
  });

  it('treble and bass produce different Y-coordinate tables', () => {
    const treble = getClefRenderData('treble');
    const bass = getClefRenderData('bass');
    expect(treble.yCoordinates).not.toEqual(bass.yCoordinates);
  });
});
