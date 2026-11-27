import {
  isAccidentalReminder,
  parseAccidentalReminder,
  parseAccidentalType,
  parseEnding,
  parseEndingNumbering,
  parseGraceQuarterTones,
  parseQuarterTone,
  parseStemMark,
  parseUnpitched,
} from './parsers';

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

describe('quarter-tones', () => {
  it('reads up and down only', () => {
    expect(parseQuarterTone('up')).toBe('up');
    expect(parseQuarterTone('down')).toBe('down');
    expect(parseQuarterTone('sharp')).toBeNull();
    expect(parseQuarterTone(null)).toBeNull();
  });

  it('reads one slot per grace note', () => {
    expect(parseGraceQuarterTones('up,,down')).toEqual(['up', null, 'down']);
    expect(parseGraceQuarterTones(' up , x')).toEqual(['up', null]);
    expect(parseGraceQuarterTones(null)).toBeNull();
  });

  it('keeps arrows out of an authored accidental', () => {
    expect(parseAccidentalType('sharp')).toBe('sharp');
    expect(parseAccidentalType('sharp-up')).toBeNull();
  });
});

describe('special-technique attributes', () => {
  it('read a bare unpitched as written and drop an unknown one', () => {
    expect(parseUnpitched('')).toBe('written');
    expect(parseUnpitched('top')).toBe('top');
    expect(parseUnpitched('high')).toBeNull();
    expect(parseUnpitched(null)).toBeNull();
  });

  it('read a bare or unknown accidental-reminder as bracketed, flagging the unknown', () => {
    expect(parseAccidentalReminder('')).toBe('bracketed');
    expect(parseAccidentalReminder('plain')).toBe('plain');
    expect(parseAccidentalReminder('yes')).toBe('bracketed');
    expect(parseAccidentalReminder(null)).toBeNull();
    expect(isAccidentalReminder('plain')).toBe(true);
    expect(isAccidentalReminder('yes')).toBe(false);
  });

  it('read cross as the only stem mark', () => {
    expect(parseStemMark('cross')).toBe('cross');
    expect(parseStemMark('slash')).toBeNull();
  });
});
