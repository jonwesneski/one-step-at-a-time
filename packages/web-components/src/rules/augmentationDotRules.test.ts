import {
  AUGMENTATION_DOT_DIAMETER_PX,
  AUGMENTATION_DOT_SPACING_GAP_PX,
} from '../utils/notationDimensions';
import {
  augmentationDotCentersX,
  augmentationDotRowWidthPx,
  isOnStaffLine,
  resolveChordDotStaffYs,
  resolveNoteDotStaffY,
} from './augmentationDotRules';

// Treble staff Ys: lines F5=30 D5=40 B4=50 G4=60 E4=70; ledger C6=10 A5=20
// C4=80 A3=90; spaces in between.
const G5 = 25;
const F5 = 30;
const E5 = 35;
const D5 = 40;
const C5 = 45;
const B4 = 50;
const A4 = 55;
const G4 = 60;
const F4 = 65;
const E4 = 70;
const D4 = 75;
const C6 = 10;
const B5 = 15;
const A5 = 20;
const D6 = 5;
const E6 = 0;

describe('isOnStaffLine', () => {
  it.each([F5, D5, B4, G4, E4, A5, C6, 80])('%p is on a line', (staffY) => {
    expect(isOnStaffLine(staffY)).toBe(true);
  });

  it.each([E5, C5, A4, F4, D4, B5, -5])('%p is in a space', (staffY) => {
    expect(isOnStaffLine(staffY)).toBe(false);
  });
});

describe('resolveNoteDotStaffY', () => {
  it('keeps a space note in its own space', () => {
    expect(resolveNoteDotStaffY(F4)).toBe(F4);
  });

  it('moves a line note to the space above', () => {
    expect(resolveNoteDotStaffY(E4)).toBe(F4);
  });

  it('moves a ledger-line note to the space above the ledger line', () => {
    expect(resolveNoteDotStaffY(A5)).toBe(B5);
    expect(resolveNoteDotStaffY(80)).toBe(D4);
  });
});

describe('resolveChordDotStaffYs', () => {
  it('dots each space of an all-space chord', () => {
    expect(resolveChordDotStaffYs([C5, E5, G5])).toEqual([G5, E5, C5]);
  });

  it('dots the space above each tone of an all-line chord', () => {
    expect(resolveChordDotStaffYs([G4, B4, D5])).toEqual([E5, C5, A4]);
  });

  it('sends the upper line note of a second up', () => {
    expect(resolveChordDotStaffYs([F4, G4])).toEqual([A4, F4]);
  });

  it('drops the lower line note of a second to the space below', () => {
    expect(resolveChordDotStaffYs([G4, A4])).toEqual([A4, F4]);
  });

  it('gives each dot of a ledger-line second its own space', () => {
    expect(resolveChordDotStaffYs([C6, D6])).toEqual([D6, B5]);
  });

  it('ignores declaration order and duplicate tones', () => {
    expect(resolveChordDotStaffYs([A4, G4, A4])).toEqual([A4, F4]);
  });

  it('centres the dots of a cluster rather than pushing them one way', () => {
    // E4 F4 G4 A4: G4 has no free neighbour; the extra dot goes above, since
    // the others already sit low.
    expect(resolveChordDotStaffYs([E4, F4, G4, A4])).toEqual([C5, A4, F4, D4]);
  });

  it('caps a wide cluster at the spaces the chord covers', () => {
    const cluster = [F4, G4, A4, B4, C5, D5, E5, F5, G5];
    expect(resolveChordDotStaffYs(cluster)).toEqual([G5, E5, C5, A4, F4]);
  });

  it('returns no dots for no tones', () => {
    expect(resolveChordDotStaffYs([])).toEqual([]);
  });

  it('keeps the space count for an E6-D6 ledger second', () => {
    expect(resolveChordDotStaffYs([E6, D6])).toEqual([-5, D6]);
  });
});

describe('augmentationDotCentersX', () => {
  it('spaces double and triple dots evenly', () => {
    const pitch =
      AUGMENTATION_DOT_DIAMETER_PX + AUGMENTATION_DOT_SPACING_GAP_PX;
    const centers = augmentationDotCentersX(10, 3);
    expect(centers[0]).toBeCloseTo(10 + AUGMENTATION_DOT_DIAMETER_PX / 2);
    expect(centers[1] - centers[0]).toBeCloseTo(pitch);
    expect(centers[2] - centers[1]).toBeCloseTo(pitch);
  });

  it('matches the row width', () => {
    const centers = augmentationDotCentersX(0, 2);
    expect(centers[1] + AUGMENTATION_DOT_DIAMETER_PX / 2).toBeCloseTo(
      augmentationDotRowWidthPx(2)
    );
  });
});
