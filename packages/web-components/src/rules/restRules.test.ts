import { VOICE_REST_DISPLACEMENT_PX } from '../utils/notationDimensions';
import { restToYCoordinate } from './restRules';

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
});
