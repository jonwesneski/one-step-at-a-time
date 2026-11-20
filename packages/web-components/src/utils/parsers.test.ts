import { parseEnding, parseEndingNumbering } from './parsers';

describe('parseEnding', () => {
  it('reads comma-separated passes, sorted and de-duplicated', () => {
    expect(parseEnding('1')).toEqual([1]);
    expect(parseEnding('2, 1')).toEqual([1, 2]);
    expect(parseEnding('1,2,2')).toEqual([1, 2]);
  });

  it('rejects anything else', () => {
    expect(parseEnding(null)).toBeNull();
    expect(parseEnding('0')).toBeNull();
    expect(parseEnding('a')).toBeNull();
    expect(parseEnding('1,,x')).toBeNull();
    expect(parseEnding('')).toBeNull();
    expect(parseEnding('-1')).toBeNull();
  });
});

describe('parseEndingNumbering', () => {
  it('accepts consecutive and duplicate only', () => {
    expect(parseEndingNumbering('duplicate')).toBe('duplicate');
    expect(parseEndingNumbering('consecutive')).toBe('consecutive');
    expect(parseEndingNumbering('letters')).toBeNull();
    expect(parseEndingNumbering(null)).toBeNull();
  });
});
