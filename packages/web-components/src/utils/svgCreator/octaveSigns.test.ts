/**
 * @jest-environment jsdom
 */
import type { OctaveShiftAmount } from '../../types/theory';
import {
  OCTAVE_CONTINUATION_PARENTHESIS_GAP_PX,
  OCTAVE_CONTINUATION_PARENTHESIS_STROKE_WIDTH,
  OCTAVE_SIGN_PROSE_CHAR_WIDTH_PX,
} from '../notationDimensions';
import {
  createOctaveContinuationSignSvg,
  octaveSignWidth,
} from './octaveSigns';

describe('octaveSignWidth', () => {
  it('is wider for a two-digit numeral than a one-digit one in sign mode', () => {
    expect(octaveSignWidth('15ma', 'sign')).toBeGreaterThan(
      octaveSignWidth('8va', 'sign')
    );
  });

  it.each<[OctaveShiftAmount, string]>([
    ['8va', 'col 8va'],
    ['8vb', 'col 8va bassa'],
    ['15mb', 'col 15ma bassa'],
  ])('covers the full col-mode label for %s', (amount, label) => {
    expect(octaveSignWidth(amount, 'col')).toBe(
      label.length * OCTAVE_SIGN_PROSE_CHAR_WIDTH_PX
    );
  });

  it('is wider in col mode than sign mode for the same amount', () => {
    expect(octaveSignWidth('15mb', 'col')).toBeGreaterThan(
      octaveSignWidth('15mb', 'sign')
    );
  });
});

describe('createOctaveContinuationSignSvg', () => {
  it.each<['sign' | 'col']>([['sign'], ['col']])(
    'places the closing parenthesis past the %s-mode label and reports the matching width',
    (mode) => {
      const { element, width } = createOctaveContinuationSignSvg(
        '15mb',
        mode,
        0,
        50,
        true
      );
      const labelLeft =
        OCTAVE_CONTINUATION_PARENTHESIS_STROKE_WIDTH +
        OCTAVE_CONTINUATION_PARENTHESIS_GAP_PX;
      const labelRight = labelLeft + octaveSignWidth('15mb', mode);
      const closing = element.querySelectorAll(
        '.octave-continuation-parenthesis'
      )[1];
      const closingX = Number(
        closing.getAttribute('d')?.split(' ')[1] ?? Number.NaN
      );
      expect(closingX).toBeGreaterThanOrEqual(labelRight);
      expect(width).toBeGreaterThanOrEqual(labelRight);
    }
  );

  it('reports the label width when unbracketed', () => {
    const { width } = createOctaveContinuationSignSvg(
      '15mb',
      'col',
      0,
      50,
      false
    );
    expect(width).toBe(octaveSignWidth('15mb', 'col'));
  });
});
