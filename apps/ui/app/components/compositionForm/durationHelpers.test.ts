import { describe, expect, it } from 'vitest';
import { decomposeToDurations } from './durationHelpers';

describe('decomposeToDurations', () => {
  it('returns a single duration for an exact power of two', () => {
    expect(decomposeToDurations(0.25)).toEqual(['quarter']);
    expect(decomposeToDurations(1)).toEqual(['whole']);
    expect(decomposeToDurations(2)).toEqual(['double-whole']);
  });

  it('writes a dotted length as one dotted duration', () => {
    expect(decomposeToDurations(0.375)).toEqual(['dotted-quarter']);
    expect(decomposeToDurations(0.75)).toEqual(['dotted-half']);
    expect(decomposeToDurations(0.1875)).toEqual(['dotted-eighth']);
    expect(decomposeToDurations(0.4375)).toEqual(['double-dotted-quarter']);
  });

  it('splits a length no single duration covers into a descending tie chain', () => {
    expect(decomposeToDurations(0.3125)).toEqual(['quarter', 'sixteenth']);
    expect(decomposeToDurations(1.25)).toEqual(['whole', 'quarter']);
  });

  it('handles the remainder a 3/4 barline leaves under a half note', () => {
    // half note at offset 0.5 in 3/4 → 0.25 fits, 0.25 crosses
    expect(decomposeToDurations(0.25)).toEqual(['quarter']);
  });

  it('returns nothing for zero', () => {
    expect(decomposeToDurations(0)).toEqual([]);
  });
});
