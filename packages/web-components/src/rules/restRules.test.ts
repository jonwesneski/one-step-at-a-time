import { VOICE_REST_DISPLACEMENT_PX } from '../utils/notationDimensions';
import {
  getFirstBallYPx,
  hookCountMap,
  QUARTER_SY_PX,
} from '../utils/svgCreator/rest';
import {
  beamOverWarning,
  restShiftClearOfBeam,
  restToYCoordinate,
} from './restRules';

// element.style.top positions a rest's box-top, not its glyph, so the
// cross-staff branch subtracts the same per-duration offset computeTopY does.
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

describe('beamOverWarning', () => {
  it('accepts a rest shorter than a crotchet outside a beam-group', () => {
    expect(beamOverWarning('eighth', null)).toBeNull();
    expect(beamOverWarning('dotted-sixteenth', null)).toBeNull();
  });

  it('explains a crotchet or longer and a cross-staff beam-group rest', () => {
    expect(beamOverWarning('quarter', null)).toMatch(/shorter than a crotchet/);
    expect(beamOverWarning('eighth', 'g1')).toMatch(/beam-group/);
  });
});

describe('restShiftClearOfBeam', () => {
  it('leaves a rest already clear where it is', () => {
    expect(
      restShiftClearOfBeam({
        inkTop: 60,
        inkBottom: 80,
        beamTop: 20,
        beamBottom: 25,
        beamAbove: true,
      })
    ).toBe(0);
  });

  it('moves a rest away from the beam by whole spaces until clear', () => {
    // Beam above: the rest's top must sit 15 below the beam's bottom at 50.
    expect(
      restShiftClearOfBeam({
        inkTop: 55,
        inkBottom: 80,
        beamTop: 45,
        beamBottom: 50,
        beamAbove: true,
      })
    ).toBe(10);
    // Beam below: its bottom must sit 15 above the beam's top at 70.
    expect(
      restShiftClearOfBeam({
        inkTop: 40,
        inkBottom: 66,
        beamTop: 70,
        beamBottom: 75,
        beamAbove: false,
      })
    ).toBe(-20);
  });
});
