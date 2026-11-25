/**
 * @jest-environment jsdom
 */
import type { DurationType } from '../../types/theory';
import { chordToneHeadCenterY, createChordSvg } from './chord';
import { NOTE_SCALE, noteHeadGeometry } from './note';

describe('chordToneHeadCenterY', () => {
  it.each<[boolean, DurationType]>([
    [true, 'quarter'],
    [false, 'quarter'],
    [true, 'half'],
    [false, 'whole'],
  ])(
    'matches the head createChordSvg draws (stem up: %s, %s)',
    (stemUp, duration) => {
      const staffYCoordinates = [40, 60];
      const [chord] = createChordSvg({
        duration,
        stemUp,
        staffYCoordinates,
      });
      const tones = Array.from(chord.children).filter(
        (child) => child.tagName === 'svg' && child.getAttribute('y') !== null
      );
      expect(tones).toHaveLength(staffYCoordinates.length);
      tones.forEach((tone, index) => {
        const head = tone.querySelector('.head');
        const { cy } = noteHeadGeometry(stemUp, duration, false);
        expect(head).not.toBeNull();
        const drawnCenterY = Number(tone.getAttribute('y')) + cy * NOTE_SCALE;
        expect(
          chordToneHeadCenterY(
            staffYCoordinates[index],
            stemUp,
            duration,
            false
          )
        ).toBeCloseTo(drawnCenterY, 5);
      });
    }
  );
});
