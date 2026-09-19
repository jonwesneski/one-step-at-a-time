import type { TimeSignature } from '@one-step-at-a-time/web-components';
import { describe, expect, it } from 'vitest';
import {
  effectiveTimeSignatures,
  timeSignatureAt,
  timeSignatureOfEntry,
  timeSignatureRegionAt,
} from './timeSignaturesHelpers';
import { buildSingleVoiceStaff } from './test-fixtures/voiceFixtures';
import type { CompositionStructure, NormalizedMeasure } from './types';

function structureOf(
  timeSig: TimeSignature,
  measureTimes: (TimeSignature | null)[]
): CompositionStructure {
  const measuresById: Record<string, NormalizedMeasure> = {};
  const measureOrder = measureTimes.map((time, i) => {
    const id = `m${i}`;
    measuresById[id] = { id, staffIds: [], time };
    return id;
  });
  return {
    timeSig,
    measureOrder,
    measuresById,
    stavesById: {},
    entriesById: {},
    connectorsById: {},
    connectorOrder: [],
    tupletsById: {},
  };
}

describe('effectiveTimeSignatures', () => {
  it('carries the composition time signature forward until an override', () => {
    const s = structureOf('4/4', [null, null, '3/4', null, '4/4', null]);
    expect(effectiveTimeSignatures(s)).toEqual([
      '4/4',
      '4/4',
      '3/4',
      '3/4',
      '4/4',
      '4/4',
    ]);
  });

  it('is just the composition time signature with no overrides', () => {
    const s = structureOf('6/8', [null, null, null]);
    expect(effectiveTimeSignatures(s)).toEqual(['6/8', '6/8', '6/8']);
  });
});

describe('timeSignatureAt', () => {
  it('reads one measure’s effective time signature', () => {
    const s = structureOf('4/4', [null, '3/4', null]);
    expect(timeSignatureAt(s, 0)).toBe('4/4');
    expect(timeSignatureAt(s, 2)).toBe('3/4');
  });
});

describe('timeSignatureRegionAt', () => {
  const s = structureOf('4/4', [null, null, '3/4', null, '4/4', null]);

  it('spans from the composition start to the first override', () => {
    expect(timeSignatureRegionAt(s, 0)).toEqual({ startIndex: 0, endIndex: 2 });
    expect(timeSignatureRegionAt(s, 1)).toEqual({ startIndex: 0, endIndex: 2 });
  });

  it('spans from an override to the next override', () => {
    expect(timeSignatureRegionAt(s, 2)).toEqual({ startIndex: 2, endIndex: 4 });
    expect(timeSignatureRegionAt(s, 3)).toEqual({ startIndex: 2, endIndex: 4 });
  });

  it('spans from the last override to the end', () => {
    expect(timeSignatureRegionAt(s, 4)).toEqual({ startIndex: 4, endIndex: 6 });
    expect(timeSignatureRegionAt(s, 5)).toEqual({ startIndex: 4, endIndex: 6 });
  });
});

describe('timeSignatureOfEntry', () => {
  it('is the effective time signature of the entry’s measure', () => {
    const base = structureOf('4/4', [null, '3/4']);
    const s: CompositionStructure = {
      ...base,
      measuresById: {
        m0: { id: 'm0', staffIds: ['s0'] },
        m1: { id: 'm1', staffIds: ['s1'], time: '3/4' },
      },
      stavesById: {
        s0: buildSingleVoiceStaff('s0', ['a']),
        s1: buildSingleVoiceStaff('s1', ['b']),
      },
      entriesById: {
        a: { id: 'a', type: 'rest', duration: 'quarter' },
        b: { id: 'b', type: 'rest', duration: 'quarter' },
      },
    };
    expect(timeSignatureOfEntry(s, 'a')).toBe('4/4');
    expect(timeSignatureOfEntry(s, 'b')).toBe('3/4');
    expect(timeSignatureOfEntry(s, 'missing')).toBe('4/4');
  });
});
