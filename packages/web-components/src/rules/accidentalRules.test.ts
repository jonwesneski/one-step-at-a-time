import {
  computeInterNoteSpacing,
  getKeySignatureAccidentals,
  parseAccidentalSuffix,
  resolveAccidental,
  suffixToType,
} from './accidentalRules';

describe('parseAccidentalSuffix', () => {
  it('returns empty string for natural notes', () => {
    expect(parseAccidentalSuffix('C')).toBe('');
    expect(parseAccidentalSuffix('F')).toBe('');
  });

  it('returns # for sharps', () => {
    expect(parseAccidentalSuffix('F#')).toBe('#');
    expect(parseAccidentalSuffix('A#')).toBe('#');
  });

  it('returns b for flats', () => {
    expect(parseAccidentalSuffix('Bb')).toBe('b');
    expect(parseAccidentalSuffix('Eb')).toBe('b');
  });

  it('returns ## for double sharps', () => {
    expect(parseAccidentalSuffix('C##')).toBe('##');
    expect(parseAccidentalSuffix('F##')).toBe('##');
  });

  it('returns bb for double flats', () => {
    expect(parseAccidentalSuffix('Bbb')).toBe('bb');
    expect(parseAccidentalSuffix('Abb')).toBe('bb');
  });
});

describe('suffixToType', () => {
  it('returns null for natural', () => {
    expect(suffixToType('')).toBeNull();
  });

  it('maps # to sharp', () => {
    expect(suffixToType('#')).toBe('sharp');
  });

  it('maps b to flat', () => {
    expect(suffixToType('b')).toBe('flat');
  });

  it('maps ## to double-sharp', () => {
    expect(suffixToType('##')).toBe('double-sharp');
  });

  it('maps bb to double-flat', () => {
    expect(suffixToType('bb')).toBe('double-flat');
  });
});

describe('getKeySignatureAccidentals', () => {
  it('C major — no accidentals', () => {
    expect(getKeySignatureAccidentals('C', 'major').size).toBe(0);
  });

  it('G major — F sharp', () => {
    const map = getKeySignatureAccidentals('G', 'major');
    expect(map.size).toBe(1);
    expect(map.get('F')).toBe('sharp');
  });

  it('D major — F and C sharp', () => {
    const map = getKeySignatureAccidentals('D', 'major');
    expect(map.size).toBe(2);
    expect(map.get('F')).toBe('sharp');
    expect(map.get('C')).toBe('sharp');
  });

  it('Bb major — B and E flat', () => {
    const map = getKeySignatureAccidentals('Bb', 'major');
    expect(map.size).toBe(2);
    expect(map.get('B')).toBe('flat');
    expect(map.get('E')).toBe('flat');
  });

  it('F major — B flat', () => {
    const map = getKeySignatureAccidentals('F', 'major');
    expect(map.size).toBe(1);
    expect(map.get('B')).toBe('flat');
  });

  it('A minor — same as C major', () => {
    expect(getKeySignatureAccidentals('A', 'minor').size).toBe(0);
  });

  it('E minor — same as G major', () => {
    const map = getKeySignatureAccidentals('E', 'minor');
    expect(map.size).toBe(1);
    expect(map.get('F')).toBe('sharp');
  });
});

describe('resolveAccidental', () => {
  it('suppresses when note matches effective state', () => {
    expect(resolveAccidental('sharp', 'sharp')).toBeNull();
    expect(resolveAccidental(null, null)).toBeNull();
    expect(resolveAccidental('flat', 'flat')).toBeNull();
  });

  it('shows the accidental when different from effective state', () => {
    expect(resolveAccidental('sharp', null)).toBe('sharp');
    expect(resolveAccidental('flat', 'sharp')).toBe('flat');
    expect(resolveAccidental('double-sharp', 'sharp')).toBe('double-sharp');
  });

  it('shows natural when note is natural but state has accidental', () => {
    expect(resolveAccidental(null, 'sharp')).toBe('natural');
    expect(resolveAccidental(null, 'flat')).toBe('natural');
    expect(resolveAccidental(null, 'double-flat')).toBe('natural');
  });

  it('contemporary: double-sharp to sharp shows sharp, no natural needed', () => {
    expect(resolveAccidental('sharp', 'double-sharp')).toBe('sharp');
  });

  it('contemporary: double-flat to flat shows flat, no natural needed', () => {
    expect(resolveAccidental('flat', 'double-flat')).toBe('flat');
  });
});

describe('computeInterNoteSpacing', () => {
  it('returns xPosition unchanged when accidentalWidth is zero', () => {
    expect(computeInterNoteSpacing(100, 0, 80)).toBe(100);
  });

  it('returns xPosition unchanged when accidental clears previous right edge', () => {
    // xPosition=100, accidentalWidth=10 → accidental left-edge=90, previousRightEdge=80 → no overlap
    expect(computeInterNoteSpacing(100, 10, 80)).toBe(100);
  });

  it('nudges xPosition right when accidental would overlap previous notehead', () => {
    // xPosition=100, accidentalWidth=10, previousRightEdge=95 → overlap by 5
    // nudged to 95 + 10 = 105
    expect(computeInterNoteSpacing(100, 10, 95)).toBe(105);
  });

  it('handles double-flat width (18px)', () => {
    // xPosition=100, accidentalWidth=18, previousRightEdge=110 → nudge to 128
    expect(computeInterNoteSpacing(100, 18, 110)).toBe(128);
  });

  it('returns xPosition unchanged when negative accidentalWidth is passed', () => {
    expect(computeInterNoteSpacing(100, -1, 80)).toBe(100);
  });
});
