/**
 * @jest-environment jsdom
 */
import '../note/index';
import '../tuplet/index';
import '../chord/index';
import { makeChord, makeNote } from '../test-fixtures/unitHelpers';
import {
  NoteChordOrRestElementType,
  TupletElementType,
} from '../types/elements';
import { MUSIC_TUPLET } from '../utils/consts';
import { computeAllowedElementCount } from './measureRules';

afterEach(() => {
  document.body.innerHTML = '';
});

function makeTuplet(ratio: string): TupletElementType {
  const element = document.createElement(MUSIC_TUPLET) as TupletElementType;
  element.setAttribute('ratio', ratio);
  document.body.appendChild(element);
  return element;
}

describe('computeAllowedElementCount', () => {
  it('allows all elements when they exactly fill the measure', () => {
    const elements: NoteChordOrRestElementType[] = Array.from(
      { length: 4 },
      () => makeNote({ note: 'C', duration: 'quarter' })
    );

    const { allowedElementCount, error } = computeAllowedElementCount(
      elements,
      [4, 4],
      new Map()
    );

    expect(allowedElementCount).toBe(4);
    expect(error).toBeNull();
  });

  it('cuts off elements once the measure is filled', () => {
    const elements: NoteChordOrRestElementType[] = Array.from(
      { length: 5 },
      () => makeNote({ note: 'C', duration: 'quarter' })
    );

    const { allowedElementCount, error } = computeAllowedElementCount(
      elements,
      [4, 4],
      new Map()
    );

    expect(allowedElementCount).toBe(4);
    expect(error).toEqual(expect.stringContaining('no more room for note(s)'));
  });

  it('cuts off a note that only partially exceeds the remaining space', () => {
    const elements: NoteChordOrRestElementType[] = [
      ...Array.from({ length: 3 }, () =>
        makeNote({ note: 'C', duration: 'quarter' })
      ),
      makeNote({ note: 'C', duration: 'half' }),
    ];

    const { allowedElementCount, error } = computeAllowedElementCount(
      elements,
      [4, 4],
      new Map()
    );

    expect(allowedElementCount).toBe(3);
    expect(error).toEqual(expect.stringContaining('no more room for note(s)'));
  });

  it('accounts for tuplet-scaled duration when computing overflow', () => {
    const tupletElement = makeTuplet('3');
    // A triplet of quarters (3 actual in the space of 2 normal) occupies
    // 0.25 * (2/3) * 3 = 0.5 quarter-beats total, so 3 triplet quarters +
    // 4 plain quarters exceed a 4/4 measure (0.5 + 4 = 4.5 quarter-beats).
    const elements: NoteChordOrRestElementType[] = [
      makeNote({ note: 'C', duration: 'quarter' }),
      makeNote({ note: 'C', duration: 'quarter' }),
      makeNote({ note: 'C', duration: 'quarter' }),
      makeNote({ note: 'C', duration: 'quarter' }),
      makeNote({ note: 'C', duration: 'quarter' }),
      makeNote({ note: 'C', duration: 'quarter' }),
    ];
    const tupletsByIndex = new Map<number, TupletElementType[]>([
      [0, [tupletElement]],
      [1, [tupletElement]],
      [2, [tupletElement]],
    ]);

    const { allowedElementCount, error } = computeAllowedElementCount(
      elements,
      [4, 4],
      tupletsByIndex
    );

    expect(allowedElementCount).toBe(5);
    expect(error).toEqual(expect.stringContaining('no more room for note(s)'));
  });

  it('returns 0 when the first element already exceeds the measure', () => {
    const elements: NoteChordOrRestElementType[] = [
      makeNote({ note: 'C', duration: 'whole' }),
      makeNote({ note: 'C', duration: 'whole' }),
    ];

    const { allowedElementCount, error } = computeAllowedElementCount(
      elements,
      [2, 4],
      new Map()
    );

    expect(allowedElementCount).toBe(0);
    expect(error).toEqual(expect.stringContaining('no more room for note(s)'));
  });

  describe('<music-arpeggio> run notes', () => {
    it('does not count run-note durations toward the measure', () => {
      // 3 thirtysecond run notes + a quarter target chord in 1/4 — without the
      // exemption the run would overflow.
      const elements: NoteChordOrRestElementType[] = [
        makeNote({ note: 'C', duration: 'thirtysecond' }),
        makeNote({ note: 'E', duration: 'thirtysecond' }),
        makeNote({ note: 'G', duration: 'thirtysecond' }),
        makeChord({
          notes: [
            { note: 'C', octave: 4 },
            { note: 'E', octave: 4 },
            { note: 'G', octave: 4 },
          ],
          duration: 'quarter',
        }),
      ];
      const { allowedElementCount, error } = computeAllowedElementCount(
        elements,
        [1, 4],
        new Map(),
        [
          {
            runIndices: [0, 1, 2],
            targetIndex: 3,
            element: elements[3] as never,
          },
        ]
      );
      expect(allowedElementCount).toBe(4);
      expect(error).toBeNull();
    });

    it('drops the whole group when the target overflows', () => {
      const elements: NoteChordOrRestElementType[] = [
        makeNote({ note: 'C', duration: 'quarter' }),
        makeNote({ note: 'C', duration: 'thirtysecond' }),
        makeNote({ note: 'E', duration: 'thirtysecond' }),
        makeChord({
          notes: [
            { note: 'C', octave: 4 },
            { note: 'E', octave: 4 },
            { note: 'G', octave: 4 },
          ],
          duration: 'whole',
        }),
      ];
      const { allowedElementCount } = computeAllowedElementCount(
        elements,
        [1, 4],
        new Map(),
        [{ runIndices: [1, 2], targetIndex: 3, element: elements[3] as never }]
      );
      // The first quarter fits; the run + whole target don't → drop from index 1.
      expect(allowedElementCount).toBe(1);
    });
  });
});
