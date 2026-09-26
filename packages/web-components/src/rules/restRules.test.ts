import { VOICE_REST_DISPLACEMENT_PX } from '../utils/notationDimensions';
import {
  getFirstBallYPx,
  hookCountMap,
  QUARTER_SY_PX,
} from '../utils/svgCreator/rest';
import { restToYCoordinate } from './restRules';

// element.style.top positions a rest's own box-top, not its visible glyph
// feature directly — restToYCoordinate's cross-staff branch must subtract
// this same per-duration offset computeTopY already subtracts for the
// plain (staff-line-targeted) case, or the glyph renders well past its
// intended target (Bug fix #3 in the double-stemmed-beams plan).
const SIXTEENTH_OFFSET = getFirstBallYPx(hookCountMap.sixteenth);
const QUARTER_OFFSET = QUARTER_SY_PX - 2;

describe('restToYCoordinate', () => {
  it('returns the plain duration-keyed Y when no voiceContext is given (unchanged single-voice behavior)', () => {
    expect(restToYCoordinate('quarter')).toBe(restToYCoordinate('quarter'));
    const plain = restToYCoordinate('quarter');
    expect(restToYCoordinate('quarter', undefined)).toBe(plain);
  });

  it('displaces up for a voice resolved to "up"', () => {
    const base = restToYCoordinate('quarter');
    expect(restToYCoordinate('quarter', { direction: 'up' })).toBe(
      base - VOICE_REST_DISPLACEMENT_PX
    );
  });

  it('displaces down for a voice resolved to "down"', () => {
    const base = restToYCoordinate('half');
    expect(restToYCoordinate('half', { direction: 'down' })).toBe(
      base + VOICE_REST_DISPLACEMENT_PX
    );
  });

  it('up and down displacements are symmetric around the plain value', () => {
    const base = restToYCoordinate('eighth');
    const up = restToYCoordinate('eighth', { direction: 'up' });
    const down = restToYCoordinate('eighth', { direction: 'down' });
    expect(base - up).toBe(down - base);
  });

  describe('cross-staff context', () => {
    // measure.ts resolves the fully-baked-in target Y (beam-relative,
    // gap-centered, or collision-adjusted — see #restHuggingTargetY /
    // #restCenteredTargetY) before calling restToYCoordinate; this layer's
    // only remaining job is subtracting the glyph's own per-duration
    // box-top offset so the caller's target lands on the visible feature,
    // not the invisible box origin.
    it("subtracts the glyph's own box-top offset from the given targetY", () => {
      expect(restToYCoordinate('sixteenth', undefined, { targetY: 55 })).toBe(
        55 - SIXTEENTH_OFFSET
      );
    });

    it('overrides voiceContext when both are given', () => {
      expect(
        restToYCoordinate('sixteenth', { direction: 'up' }, { targetY: 55 })
      ).toBe(55 - SIXTEENTH_OFFSET);
    });

    it('applies the correct per-duration offset for a non-hook duration too (quarter)', () => {
      expect(restToYCoordinate('quarter', undefined, { targetY: 55 })).toBe(
        55 - QUARTER_OFFSET
      );
    });

    it("the glyph's own characteristic feature (box-top + offset) lands exactly on the given targetY", () => {
      const boxTop = restToYCoordinate('sixteenth', undefined, {
        targetY: 55,
      });
      expect(boxTop + SIXTEENTH_OFFSET).toBe(55);
    });
  });
});
