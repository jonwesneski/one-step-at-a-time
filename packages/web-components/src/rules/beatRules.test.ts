/**
 * @jest-environment jsdom
 */
import '../note/index';
import { makeNote } from '../test-fixtures/unitHelpers';
import '../tuplet/index';
import { TupletElementType } from '../types/elements';
import { MUSIC_TUPLET } from '../utils/consts';
import { durationContribution } from './beatRules';

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
