import { BASE_DURATIONS, DURATIONS } from '../utils/consts';
import {
  durationToBase,
  durationToDotCount,
  durationToFactor,
  durationToFlagCountMap,
  factorToDuration,
  isOpenDuration,
  isStemlessDuration,
} from './theoryConsts';

describe('dotted duration maps', () => {
  it('lists every base value with zero to three dots', () => {
    expect(DURATIONS).toHaveLength(BASE_DURATIONS.length * 4);
  });

  it('orders DURATIONS longest first', () => {
    const factors = DURATIONS.map((duration) => durationToFactor[duration]);
    expect(factors).toEqual([...factors].sort((a, b) => b - a));
  });

  it('adds half, then a quarter, then an eighth of the base value', () => {
    expect(durationToFactor.quarter).toBe(0.25);
    expect(durationToFactor['dotted-quarter']).toBe(0.375);
    expect(durationToFactor['double-dotted-quarter']).toBe(0.4375);
    expect(durationToFactor['triple-dotted-quarter']).toBe(0.46875);
    expect(durationToFactor['dotted-double-whole']).toBe(3);
  });

  it('splits a dotted value into its base and dot count', () => {
    expect(durationToBase['double-dotted-sixteenth']).toBe('sixteenth');
    expect(durationToDotCount['double-dotted-sixteenth']).toBe(2);
    expect(durationToBase.half).toBe('half');
    expect(durationToDotCount.half).toBe(0);
  });

  it('keeps the base flag count and notehead shape', () => {
    expect(durationToFlagCountMap.get('dotted-eighth')).toBe(1);
    expect(durationToFlagCountMap.get('dotted-quarter')).toBeUndefined();
    expect(isOpenDuration('dotted-half')).toBe(true);
    expect(isOpenDuration('dotted-quarter')).toBe(false);
    expect(isStemlessDuration('dotted-whole')).toBe(true);
  });

  it('maps every factor back to one duration', () => {
    expect(factorToDuration.size).toBe(DURATIONS.length);
    expect(factorToDuration.get(0.1875)).toBe('dotted-eighth');
  });
});
