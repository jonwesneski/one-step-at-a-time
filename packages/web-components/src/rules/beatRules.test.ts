/**
 * @jest-environment jsdom
 */
import '../note/index';
import { makeNote } from '../test-fixtures/unitHelpers';
import '../tuplet/index';
import { TupletElementType } from '../types/elements';
import { MUSIC_TUPLET } from '../utils/consts';
import {
  computeBeatOffsets,
  computeTremoloScaleByIndex,
  durationContribution,
} from './beatRules';

afterEach(() => {
  document.body.innerHTML = '';
});

function makeTuplet(ratio: string): TupletElementType {
  const element = document.createElement(MUSIC_TUPLET) as TupletElementType;
  element.setAttribute('ratio', ratio);
  document.body.appendChild(element);
  return element;
}

describe('durationContribution', () => {
  it('returns the plain whole-note-fraction duration for an untupleted entry', () => {
    const note = makeNote({ note: 'C', duration: 'quarter' });
    expect(durationContribution(note, 0, new Map())).toBeCloseTo(0.25);
  });

  it('scales a tupleted entry by its ratio normal/actual factor', () => {
    const note = makeNote({ note: 'C', duration: 'eighth' });
    const tuplet = makeTuplet('3');
    const tupletsByIndex = new Map([[0, [tuplet]]]);
    // triplet eighth: 0.125 * (2/3)
    expect(durationContribution(note, 0, tupletsByIndex)).toBeCloseTo(
      0.125 * (2 / 3)
    );
  });

  it('lengthens a dotted value by half and a double-dotted one by three quarters', () => {
    const dotted = makeNote({ note: 'C', duration: 'dotted-quarter' });
    const doubleDotted = makeNote({
      note: 'C',
      duration: 'double-dotted-half',
    });
    expect(durationContribution(dotted, 0, new Map())).toBeCloseTo(0.375);
    expect(durationContribution(doubleDotted, 0, new Map())).toBeCloseTo(0.875);
  });

  it('scales a dotted tupleted entry by its ratio', () => {
    const note = makeNote({ note: 'C', duration: 'dotted-eighth' });
    const tuplet = makeTuplet('3');
    const tupletsByIndex = new Map([[0, [tuplet]]]);
    expect(durationContribution(note, 0, tupletsByIndex)).toBeCloseTo(
      0.1875 * (2 / 3)
    );
  });

  it('returns zero for an arpeggio run-note index, regardless of duration', () => {
    const note = makeNote({ note: 'C', duration: 'whole' });
    const runIndices = new Set([0]);
    expect(durationContribution(note, 0, new Map(), runIndices)).toBe(0);
  });

  it('an entry not in the run-index set is unaffected by other run indices', () => {
    const note = makeNote({ note: 'C', duration: 'quarter' });
    const runIndices = new Set([1, 2]);
    expect(durationContribution(note, 0, new Map(), runIndices)).toBeCloseTo(
      0.25
    );
  });
});

describe('tremolo shares', () => {
  const groups = (memberIndices: number[]) => [
    { memberIndices, element: document.createElement('div') as never },
  ];

  it('gives each of N members 1/N of its written value', () => {
    const scales = computeTremoloScaleByIndex(groups([1, 2, 3]));
    expect(scales.get(0)).toBeUndefined();
    expect(scales.get(1)).toBeCloseTo(1 / 3);
  });

  it('places the second of two halves halfway through the pair', () => {
    const elements = [
      makeNote({ note: 'F', duration: 'half' }),
      makeNote({ note: 'A', duration: 'half' }),
      makeNote({ note: 'C', duration: 'half' }),
    ];
    expect(
      computeBeatOffsets(
        elements,
        new Map(),
        new Set(),
        computeTremoloScaleByIndex(groups([0, 1]))
      )
    ).toEqual([0, 0.25, 0.5]);
  });

  it('shares a dotted value', () => {
    expect(
      durationContribution(
        makeNote({ note: 'F', duration: 'double-dotted-half' }),
        0,
        new Map(),
        new Set(),
        computeTremoloScaleByIndex(groups([0, 1]))
      )
    ).toBeCloseTo(7 / 16);
  });

  it('multiplies with a tuplet', () => {
    const tuplet = makeTuplet('3');
    expect(
      durationContribution(
        makeNote({ note: 'F', duration: 'quarter' }),
        0,
        new Map([[0, [tuplet]]]),
        new Set(),
        computeTremoloScaleByIndex(groups([0, 1]))
      )
    ).toBeCloseTo((1 / 4) * (2 / 3) * (1 / 2));
  });
});
