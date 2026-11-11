/**
 * @jest-environment jsdom
 */
import type {
  ChordElementType,
  NoteChordOrRestElementType,
  NoteElementType,
} from '../types/elements';
import type { DurationType } from '../types/theory';
import type { BeamsBuilder } from '../utils';
import {
  MUSIC_CHORD_NODE,
  MUSIC_NOTE_NODE,
  MUSIC_REST_NODE,
} from '../utils/consts';
import { STAFF_LINE_SPACING } from '../utils/notationDimensions';
import {
  determineStemDirections,
  determineVoiceStemDirections,
  stemLengthAdjustPx,
  stemLengthPx,
  unbeamedStemExtensionPx,
} from './stemRules';

const spaces = (count: number) => count * STAFF_LINE_SPACING;

// Treble staff-Ys.
const E6 = 0;
const C6 = 10;
const G5 = 25;
const B5 = 15;
const A5 = 20;
const F5 = 30;
const E5 = 35;
const D5 = 40;
const C5 = 45;
const B4 = 50;
const A4 = 55;
const G4 = 60;
const F4 = 65;
const E4 = 70;
const D4 = 75;
const C4 = 80;
const B3 = 85;
const A3 = 90;
const E3 = 120;

type Entry = {
  ys?: number[];
  rest?: boolean;
  duration?: DurationType;
  length: number;
  forced?: boolean;
};

const resolve = (
  entries: Entry[],
  timeSig: [number, number],
  beamGroups: number[][] = []
): boolean[] => {
  const noteYs = new Map<NoteElementType, number>();
  const chordYs = new Map<ChordElementType, number[]>();
  const forcedDirections = new Map<NoteChordOrRestElementType, boolean>();
  const elements = entries.map((entry) => {
    const isChord = (entry.ys?.length ?? 0) > 1;
    const element = {
      nodeName: entry.rest
        ? MUSIC_REST_NODE
        : isChord
        ? MUSIC_CHORD_NODE
        : MUSIC_NOTE_NODE,
      duration: entry.duration ?? 'quarter',
    } as unknown as NoteChordOrRestElementType;
    if (isChord) {
      chordYs.set(element as ChordElementType, entry.ys as number[]);
    } else if (!entry.rest) {
      noteYs.set(element as NoteElementType, (entry.ys as number[])[0]);
    }
    if (entry.forced !== undefined) {
      forcedDirections.set(element, entry.forced);
    }
    return element;
  });
  let offset = 0;
  const beatOffsets = entries.map((entry) => {
    const start = offset;
    offset += entry.length;
    return start;
  });
  const beamsBuilder = {
    beamGroupFor: (index: number) =>
      beamGroups.find((group) => group.includes(index)) ?? null,
  } as unknown as BeamsBuilder;
  return determineStemDirections(elements, beamsBuilder, noteYs, chordYs, {
    timeSig,
    beatOffsets,
    durations: entries.map((entry) => entry.length),
    forcedDirections,
  });
};

const quarter = (y: number): Entry => ({ ys: [y], length: 1 / 4 });
const half = (y: number): Entry => ({ ys: [y], length: 1 / 2 });
const UP = true;
const DOWN = false;

describe('determineStemDirections', () => {
  it('stems notes above the middle line down and below it up', () => {
    expect(resolve([C5, D5, A5, A4, G4, C4].map(quarter), [6, 4])).toEqual([
      DOWN,
      DOWN,
      DOWN,
      UP,
      UP,
      UP,
    ]);
  });

  describe('a centre-line note', () => {
    it('continues surrounding stems that agree', () => {
      expect(
        resolve([E4, F4, G4, B4, A4, G4, F4].map(quarter), [7, 4])
      ).toEqual([UP, UP, UP, UP, UP, UP, UP]);
    });

    it('continues the only stem on one side of it', () => {
      expect(resolve([B4, G4].map(quarter), [2, 4])).toEqual([UP, UP]);
      expect(resolve([D5, B4].map(quarter), [2, 4])).toEqual([DOWN, DOWN]);
    });

    it('looks past rests and other centre-line notes', () => {
      expect(
        resolve(
          [
            quarter(G4),
            { rest: true, length: 1 / 4 },
            quarter(B4),
            quarter(B4),
            quarter(G4),
          ],
          [5, 4]
        )
      ).toEqual([UP, UP, UP, UP, UP]);
    });

    it('ignores stemless notes as context, and takes a down-stem with none left', () => {
      expect(
        resolve(
          [quarter(B4), { ys: [G4], duration: 'whole', length: 1 }],
          [5, 4]
        )[0]
      ).toBe(DOWN);
    });

    it('takes a down-stem when alone in the bar', () => {
      expect(resolve([quarter(B4)], [4, 4])).toEqual([DOWN]);
    });

    it('stems a centre-line whole note down', () => {
      expect(
        resolve([{ ys: [B4], duration: 'whole', length: 1 }], [4, 4])
      ).toEqual([DOWN]);
    });
  });

  describe('when direction varies within the bar', () => {
    it('follows the notes of the same beat', () => {
      const figure8Over4: Entry[] = [
        quarter(G4),
        quarter(B4),
        quarter(F4),
        quarter(C5),
        { ys: [F4], length: 3 / 8 },
        { ys: [B4], length: 1 / 8 },
        quarter(C5),
        quarter(B4),
      ];
      expect(resolve(figure8Over4, [8, 4])).toEqual([
        UP,
        UP,
        UP,
        DOWN,
        UP,
        UP,
        DOWN,
        DOWN,
      ]);
    });

    it('follows the notes of the same half-bar', () => {
      expect(resolve([C5, B4, A4, B4].map(half), [4, 2])).toEqual([
        DOWN,
        DOWN,
        UP,
        UP,
      ]);
    });

    it('takes a down-stem when the beat and half-bar both disagree', () => {
      expect(
        resolve(
          [
            { ys: [G4], length: 1 / 16 },
            { ys: [B4], length: 1 / 16 },
            { ys: [C5], length: 1 / 8 },
            { rest: true, length: 3 / 4 },
          ],
          [4, 4]
        )
      ).toEqual([UP, DOWN, DOWN, true]);
    });

    it('takes a down-stem in a bar with no half-bar', () => {
      expect(resolve([D5, B4, G4].map(quarter), [3, 4])).toEqual([
        DOWN,
        DOWN,
        UP,
      ]);
    });

    it('treats a compound beat as the dotted-quarter group', () => {
      expect(
        resolve(
          [
            { ys: [G4], length: 1 / 8 },
            { rest: true, length: 1 / 8 },
            { ys: [B4], length: 1 / 8 },
            { ys: [C5], length: 3 / 8 },
          ],
          [6, 8]
        ).filter((_, i) => i !== 1)
      ).toEqual([UP, UP, DOWN]);
    });
  });

  describe('an evenly balanced unit', () => {
    it('follows context like a centre-line note, whatever order its heads are in', () => {
      for (const ys of [
        [C5, A4],
        [A4, C5],
      ]) {
        expect(
          resolve([quarter(G4), { ys, length: 1 / 4 }, quarter(F4)], [3, 4])
        ).toEqual([UP, UP, UP]);
      }
    });

    it('takes a down-stem with no context', () => {
      expect(resolve([{ ys: [C5, A4], length: 1 / 4 }], [4, 4])).toEqual([
        DOWN,
      ]);
    });

    it('resolves a beam group as one unit', () => {
      expect(
        resolve(
          [
            quarter(G4),
            { ys: [E5], length: 1 / 8 },
            { ys: [G4], length: 1 / 8 },
            quarter(F4),
          ],
          [3, 4],
          [[1, 2]]
        )
      ).toEqual([UP, DOWN, DOWN, UP]);
      expect(
        resolve(
          [
            quarter(G4),
            { ys: [C5], length: 1 / 8 },
            { ys: [A4], length: 1 / 8 },
            quarter(F4),
          ],
          [3, 4],
          [[1, 2]]
        )
      ).toEqual([UP, UP, UP, UP]);
    });
  });

  describe('a beam group', () => {
    const eighths = (ys: number[]) =>
      ys.map((y): Entry => ({ ys: [y], length: 1 / 8 }));
    const group = (ys: number[]) => [ys.map((_, i) => i)];

    it('follows the farthest note when as many notes lie each side of the middle line', () => {
      expect(
        resolve(eighths([G5, E4, F4, F5]), [2, 4], group([0, 1, 2, 3]))
      ).toEqual([DOWN, DOWN, DOWN, DOWN]);
    });

    it('follows the majority when the farthest note is in the minority', () => {
      expect(
        resolve(eighths([G4, G4, G4, E5]), [2, 4], group([0, 1, 2, 3]))
      ).toEqual([UP, UP, UP, UP]);
    });

    it('follows a minority that lies much further from the middle line', () => {
      const ys = [B4, C6, A4, G4, F4, G4];
      expect(resolve(eighths(ys), [3, 4], group(ys))).toEqual(
        ys.map(() => DOWN)
      );
    });

    it('follows a lone note a space and a half further out', () => {
      expect(resolve(eighths([F5, A4, A4]), [3, 8], group([0, 1, 2]))).toEqual([
        DOWN,
        DOWN,
        DOWN,
      ]);
    });

    it('does not count middle-line notes', () => {
      expect(resolve(eighths([B4, B4, A4]), [3, 8], group([0, 1, 2]))).toEqual([
        UP,
        UP,
        UP,
      ]);
    });
  });

  it('counts a forced direction as context', () => {
    expect(
      resolve([quarter(B4), { ys: [G4], length: 1 / 4, forced: DOWN }], [2, 4])
    ).toEqual([DOWN, DOWN]);
  });

  it('lets a forced member fix its whole beam group', () => {
    expect(
      resolve(
        [
          { ys: [G4], length: 1 / 8 },
          { ys: [A4], length: 1 / 8, forced: DOWN },
        ],
        [2, 4],
        [[0, 1]]
      )
    ).toEqual([DOWN, DOWN]);
  });
});

describe('stemLengthPx', () => {
  it('is 3½ spaces within the stave', () => {
    expect(stemLengthPx(A4, true)).toBe(spaces(3.5));
    expect(stemLengthPx(C5, false)).toBe(spaces(3.5));
    expect(stemLengthPx(E4, true)).toBe(spaces(3.5));
    expect(stemLengthPx(F5, false)).toBe(spaces(3.5));
  });

  it('stays 3½ spaces through the note that just reaches the middle line', () => {
    expect(stemLengthPx(A5, false)).toBe(spaces(3.5));
    expect(stemLengthPx(B5, false)).toBe(spaces(3.5));
    expect(stemLengthPx(C4, true)).toBe(spaces(3.5));
    expect(stemLengthPx(B3, true)).toBe(spaces(3.5));
  });

  it('reaches the middle line from further out', () => {
    expect(stemLengthPx(C6, false)).toBe(B4 - C6);
    expect(stemLengthPx(E6, false)).toBe(B4 - E6);
    expect(stemLengthPx(A3, true)).toBe(A3 - B4);
    expect(stemLengthPx(E3, true)).toBe(E3 - B4);
  });

  it.each([
    [B4, 3.25],
    [C5, 3],
    [D5, 2.75],
    [E5, 2.5],
    [F5, 2.5],
    [A5, 2.5],
    [E6, 2.5],
  ])('shortens an up-stem pointing out of the stave (y=%d)', (y, length) => {
    expect(stemLengthPx(y, true)).toBe(spaces(length));
  });

  it.each([
    [B4, 3.25],
    [A4, 3],
    [G4, 2.75],
    [F4, 2.5],
    [E4, 2.5],
    [C4, 2.5],
    [E3, 2.5],
  ])('shortens a down-stem pointing out of the stave (y=%d)', (y, length) => {
    expect(stemLengthPx(y, false)).toBe(spaces(length));
  });
});

describe('stemLengthAdjustPx', () => {
  it('measures a chord from the head nearest the open end', () => {
    // Up-stem: the top head is nearest the open end.
    expect(stemLengthAdjustPx([G4, D4], true)).toBe(0);
    expect(stemLengthAdjustPx([C5, G4], true)).toBe(spaces(-0.5));
    // Down-stem: the bottom head is nearest the open end.
    expect(stemLengthAdjustPx([E5, A4], false)).toBe(spaces(-0.5));
    expect(stemLengthAdjustPx([F5, E4], false)).toBe(spaces(-1));
  });

  it('reaches the middle line from a ledger-line chord', () => {
    expect(stemLengthAdjustPx([E6, C6], false)).toBe(B4 - C6 - spaces(3.5));
    expect(stemLengthAdjustPx([E3, A3], true)).toBe(A3 - B4 - spaces(3.5));
  });

  it('is 0 with no heads', () => {
    expect(stemLengthAdjustPx([], true)).toBe(0);
  });
});

describe('unbeamedStemExtensionPx', () => {
  it('leaves a standard stem alone for one or two tails', () => {
    expect(unbeamedStemExtensionPx([G4], true, 1)).toBe(0);
    expect(unbeamedStemExtensionPx([G4], true, 2)).toBe(0);
  });

  it('leaves a stemless duration alone', () => {
    expect(unbeamedStemExtensionPx([F5], true, 0)).toBe(spaces(-1));
    expect(unbeamedStemExtensionPx([B5], false, 0)).toBe(0);
  });

  it('keeps a short stem for one tail, which shortens to fit it', () => {
    expect(unbeamedStemExtensionPx([C5], true, 1)).toBe(spaces(-0.5));
    expect(unbeamedStemExtensionPx([F5], true, 1)).toBe(spaces(-1));
  });

  it('gives a short stem the length of two tails', () => {
    expect(unbeamedStemExtensionPx([C5], true, 2)).toBeCloseTo(spaces(-0.25));
    expect(unbeamedStemExtensionPx([F5], true, 2)).toBeCloseTo(spaces(-0.25));
    expect(unbeamedStemExtensionPx([D4], false, 2)).toBeCloseTo(spaces(-0.25));
  });

  it.each([
    ['above the stave', B5, false, 1, 0.25],
    ['above the stave', C6, false, 2, 1],
    ['above the stave', E6, false, 1, 1.75],
    ['below the stave', B3, true, 1, 0.25],
    ['below the stave', A3, true, 2, 1],
    ['below the stave', E3, true, 1, 3.75],
  ] as [string, number, boolean, number, number][])(
    'keeps tails short of the first ledger line %s (head %d, stemUp=%s, %d tails)',
    (_side, head, stemUp, flagCount, extraSpaces) => {
      expect(unbeamedStemExtensionPx([head], stemUp, flagCount)).toBeCloseTo(
        spaces(extraSpaces)
      );
    }
  );

  it('needs no extra length for a head on the first ledger line', () => {
    expect(unbeamedStemExtensionPx([A5], false, 2)).toBe(0);
    expect(unbeamedStemExtensionPx([C4], true, 2)).toBe(0);
  });

  it('leaves a stem pointing away from the stave alone', () => {
    expect(unbeamedStemExtensionPx([C6], true, 1)).toBe(spaces(-1));
    expect(unbeamedStemExtensionPx([E3], false, 1)).toBe(spaces(-1));
  });

  it("measures a chord from the head nearest the stem's open end", () => {
    expect(unbeamedStemExtensionPx([C6, G4], false, 1)).toBe(
      unbeamedStemExtensionPx([G4], false, 1)
    );
    expect(unbeamedStemExtensionPx([B5, C6], false, 1)).toBe(
      unbeamedStemExtensionPx([B5], false, 1)
    );
  });

  it('skips ledger clearance for a head with no ledger lines', () => {
    expect(unbeamedStemExtensionPx([B5], false, 1, false)).toBe(0);
  });
});

describe('determineVoiceStemDirections', () => {
  const elements = [{}, {}, {}] as NoteChordOrRestElementType[];

  it('fills every element with up (true) for voice direction "up"', () => {
    expect(determineVoiceStemDirections(elements, 'up')).toEqual([
      true,
      true,
      true,
    ]);
  });

  it('fills every element with down (false) for voice direction "down"', () => {
    expect(determineVoiceStemDirections(elements, 'down')).toEqual([
      false,
      false,
      false,
    ]);
  });

  it('never varies within the array, regardless of pitch — this is what distinguishes it from pitch-driven determineStemDirections', () => {
    const result = determineVoiceStemDirections(elements, 'up');
    expect(new Set(result).size).toBe(1);
  });
});
