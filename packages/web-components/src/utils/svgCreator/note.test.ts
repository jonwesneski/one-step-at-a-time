/**
 * @jest-environment jsdom
 */
import { CUE_SCALE, STAFF_LINE_SPACING } from '../notationDimensions';
import {
  createNoteSvg,
  cueLeftShiftPx,
  cueLeftwardExtentPx,
  NOTE_SCALE,
  noteAugmentationDotLayout,
  noteHeadGeometry,
  stemTipPosition,
  upTailInk,
} from './note';

describe('a cue-sized note', () => {
  it.each([true, false])(
    "keeps its head's left edge and centre, ¾ as wide (stem up: %s)",
    (stemUp) => {
      for (const notehead of ['normal', 'x'] as const) {
        const full = noteHeadGeometry(stemUp, 'quarter', false, notehead);
        const cue = noteHeadGeometry(
          stemUp,
          'quarter',
          false,
          notehead,
          CUE_SCALE
        );
        expect(cue.cy).toBe(full.cy);
        expect(cue.halfWidth).toBeCloseTo(CUE_SCALE * full.halfWidth);
        expect(cue.halfHeight).toBeCloseTo(CUE_SCALE * full.halfHeight);
      }
      const ellipse = noteHeadGeometry(stemUp, 'quarter', false);
      const cueEllipse = noteHeadGeometry(
        stemUp,
        'quarter',
        false,
        'normal',
        CUE_SCALE
      );
      expect(cueEllipse.cx - cueEllipse.halfWidth).toBeCloseTo(
        ellipse.cx - ellipse.halfWidth
      );
    }
  );

  it.each([true, false])(
    'draws its stem ¾ as long, plus its extension (stem up: %s)',
    (stemUp) => {
      const lengthPx = (scale: number, extension: number) => {
        const { cy } = noteHeadGeometry(stemUp, 'eighth', false);
        const tip = stemTipPosition(stemUp, 'eighth', false, extension, scale);
        return Math.abs(tip.y - cy) * NOTE_SCALE;
      };
      expect(lengthPx(CUE_SCALE, 0)).toBeCloseTo(CUE_SCALE * lengthPx(1, 0));
      expect(lengthPx(CUE_SCALE, 4) - lengthPx(CUE_SCALE, 0)).toBeCloseTo(4);
    }
  );

  it('scales its tails, dots and their gaps', () => {
    const tail = (scale: number) =>
      upTailInk({
        duration: 'eighth',
        stemUp: true,
        noFlags: false,
        noStem: false,
        stemExtension: 0,
        tailRoomStemExtension: 0,
        scale,
      });
    const stemX = (scale: number) =>
      stemTipPosition(true, 'eighth', false, 0, scale).x * NOTE_SCALE;
    expect((tail(CUE_SCALE)?.rightX ?? 0) - stemX(CUE_SCALE)).toBeCloseTo(
      CUE_SCALE * ((tail(1)?.rightX ?? 0) - stemX(1))
    );

    const dots = (scale: number) =>
      noteAugmentationDotLayout({
        duration: 'double-dotted-quarter',
        stemUp: false,
        noFlags: false,
        noStem: false,
        notehead: 'normal',
        stemExtension: 0,
        staffY: null,
        scale,
      });
    const headRight = (scale: number) => {
      const head = noteHeadGeometry(false, 'quarter', false, 'normal', scale);
      return (head.cx + head.halfWidth) * NOTE_SCALE;
    };
    const full = dots(1);
    const cue = dots(CUE_SCALE);
    expect((cue?.leftX ?? 0) - headRight(CUE_SCALE)).toBeCloseTo(
      CUE_SCALE * ((full?.leftX ?? 0) - headRight(1))
    );
    expect((cue?.rightEdgeX ?? 0) - (cue?.leftX ?? 0)).toBeCloseTo(
      CUE_SCALE * ((full?.rightEdgeX ?? 0) - (full?.leftX ?? 0))
    );
  });

  it('draws its accidental smaller, nearer its smaller head', () => {
    const [svg] = createNoteSvg({
      duration: 'quarter',
      accidental: 'sharp',
      scale: CUE_SCALE,
    });
    const placed = svg.querySelector('.accidental')?.parentElement;
    expect(placed?.getAttribute('transform')).toContain(`scale(${CUE_SCALE})`);
    expect(cueLeftShiftPx(true, CUE_SCALE)).toBeGreaterThan(0);
    expect(
      cueLeftwardExtentPx(STAFF_LINE_SPACING, true, CUE_SCALE)
    ).toBeLessThan(CUE_SCALE * STAFF_LINE_SPACING);
  });

  it('draws as a full-size note at scale 1', () => {
    const props = {
      duration: 'dotted-eighth' as const,
      accidental: 'flat' as const,
      articulation: 'staccato' as const,
    };
    expect(createNoteSvg(props)[0].outerHTML).toBe(
      createNoteSvg({ ...props, scale: 1 })[0].outerHTML
    );
  });
});
