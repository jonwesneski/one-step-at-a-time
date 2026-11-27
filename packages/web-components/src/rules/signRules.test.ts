import {
  SIGN_CIRCLE_DIAMETER_PX,
  SIGN_CROSS_SIZE_PX,
  SIGN_GAP_PX,
  SIGN_STAFF_CLEARANCE_PX,
} from '../utils/notationDimensions';
import {
  levelSignRows,
  parseSigns,
  signCenterOffsets,
  signStackHeightPx,
  signStackPlacement,
  signWarning,
} from './signRules';

describe('parseSigns', () => {
  it('reads a comma-separated stack, nearest the note first', () => {
    expect(parseSigns('circle')).toEqual(['circle']);
    expect(parseSigns(' circle , plus ')).toEqual(['circle', 'plus']);
    expect(parseSigns('circle,circle')).toEqual(['circle', 'circle']);
  });

  it('drops unknown entries, and is null when nothing is left', () => {
    expect(parseSigns('bogus,half')).toEqual(['half']);
    expect(parseSigns('bogus')).toBeNull();
    expect(parseSigns('')).toBeNull();
    expect(parseSigns(null)).toBeNull();
  });

  it('warns about the unknown entries only', () => {
    expect(signWarning('bogus,half,star')).toMatch(/"bogus", "star"/);
    expect(signWarning('filled,cross')).toBeNull();
    expect(signWarning(null)).toBeNull();
  });
});

describe('sign stack', () => {
  it('stacks upward, a gap between signs', () => {
    expect(signCenterOffsets(['circle', 'plus'])).toEqual([
      SIGN_CIRCLE_DIAMETER_PX / 2,
      SIGN_CIRCLE_DIAMETER_PX + SIGN_GAP_PX + SIGN_CROSS_SIZE_PX / 2,
    ]);
    expect(signStackHeightPx(['circle', 'plus'])).toBeCloseTo(
      SIGN_CIRCLE_DIAMETER_PX + SIGN_GAP_PX + SIGN_CROSS_SIZE_PX
    );
    expect(signStackHeightPx([])).toBe(0);
  });
});

describe('signStackPlacement', () => {
  const staffTopLineY = 100;

  it('sits a gap above ink already above the stave', () => {
    expect(
      signStackPlacement({ inkTopY: 60, articulation: null, staffTopLineY })
    ).toEqual({ bottomY: 60 - SIGN_GAP_PX, articulationLiftPx: 0 });
  });

  it('keeps clear of the stave over ink inside it', () => {
    expect(
      signStackPlacement({ inkTopY: 120, articulation: null, staffTopLineY })
        .bottomY
    ).toBe(staffTopLineY - SIGN_STAFF_CLEARANCE_PX);
  });

  it('moves an articulation above the head out of the stave with the signs (±)', () => {
    const placement = signStackPlacement({
      inkTopY: 112,
      articulation: { topY: 112, bottomY: 116 },
      staffTopLineY,
    });
    const aboveStave = staffTopLineY - SIGN_STAFF_CLEARANCE_PX;
    expect(placement.articulationLiftPx).toBe(116 - aboveStave);
    expect(placement.bottomY).toBe(112 - (116 - aboveStave) - SIGN_GAP_PX);
  });

  it('leaves an articulation already above the stave where it is', () => {
    expect(
      signStackPlacement({
        inkTopY: 70,
        articulation: { topY: 70, bottomY: 74 },
        staffTopLineY,
      })
    ).toEqual({ bottomY: 70 - SIGN_GAP_PX, articulationLiftPx: 0 });
  });
});

describe('levelSignRows', () => {
  it('raises neighbours within the tolerance to the highest of them', () => {
    expect(levelSignRows([90, 93, 89])).toEqual([89, 89, 89]);
  });

  it('keeps signs far apart in height, and lets a gap break the run', () => {
    expect(levelSignRows([90, 70, 72])).toEqual([90, 70, 70]);
    expect(levelSignRows([90, null, 92])).toEqual([90, null, 92]);
  });
});
