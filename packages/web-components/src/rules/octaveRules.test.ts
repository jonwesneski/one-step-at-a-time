import type { OctaveShiftAmount } from '../types/theory';
import { MUSIC_NOTE_NODE, MUSIC_REST_NODE } from '../utils/consts';
import {
  isOctaveRaise,
  type OctaveMeasureBoundary,
  type OctaveSpan,
  resolveOctaveContinuationSegments,
  resolveOctaveSpanExtremalStaffY,
  resolveOctaveSpans,
} from './octaveRules';

const EIGHT_VA: OctaveShiftAmount = '8va';
const EIGHT_VB: OctaveShiftAmount = '8vb';
const FIFTEEN_MA: OctaveShiftAmount = '15ma';

describe('resolveOctaveSpans', () => {
  it('resolves a single-note span when octave-shift and octave-stop are on the same element', () => {
    const { spans, warnings } = resolveOctaveSpans([
      { octaveShift: EIGHT_VA, octaveStop: true, nodeName: MUSIC_NOTE_NODE },
    ]);
    expect(spans).toEqual([
      {
        amount: EIGHT_VA,
        mode: 'sign',
        startIndex: 0,
        stopIndex: 0,
        members: [{ index: 0, isRest: false }],
        closedBy: 'octave-stop',
      },
    ]);
    expect(warnings).toHaveLength(0);
  });

  it('resolves a multi-note span closed by an explicit octave-stop', () => {
    const { spans, warnings } = resolveOctaveSpans([
      { octaveShift: EIGHT_VA, nodeName: MUSIC_NOTE_NODE },
      { nodeName: MUSIC_NOTE_NODE },
      { octaveStop: true, nodeName: MUSIC_NOTE_NODE },
      { nodeName: MUSIC_NOTE_NODE },
    ]);
    expect(spans).toEqual([
      {
        amount: EIGHT_VA,
        mode: 'sign',
        startIndex: 0,
        stopIndex: 2,
        members: [
          { index: 0, isRest: false },
          { index: 1, isRest: false },
          { index: 2, isRest: false },
        ],
        closedBy: 'octave-stop',
      },
    ]);
    expect(warnings).toHaveLength(0);
  });

  it('closes a span when a differing octave-shift value appears, without an explicit octave-stop', () => {
    const { spans, warnings } = resolveOctaveSpans([
      { octaveShift: EIGHT_VA, nodeName: MUSIC_NOTE_NODE },
      { nodeName: MUSIC_NOTE_NODE },
      { octaveShift: EIGHT_VB, octaveStop: true, nodeName: MUSIC_NOTE_NODE },
    ]);
    expect(spans).toEqual([
      {
        amount: EIGHT_VA,
        mode: 'sign',
        startIndex: 0,
        stopIndex: 1,
        members: [
          { index: 0, isRest: false },
          { index: 1, isRest: false },
        ],
        closedBy: 'implicit',
      },
      {
        amount: EIGHT_VB,
        mode: 'sign',
        startIndex: 2,
        stopIndex: 2,
        members: [{ index: 2, isRest: false }],
        closedBy: 'octave-stop',
      },
    ]);
    expect(warnings).toHaveLength(0);
  });

  it('does not fragment a span when the same octave-shift value is repeated on later elements', () => {
    const { spans, warnings } = resolveOctaveSpans([
      { octaveShift: EIGHT_VA, nodeName: MUSIC_NOTE_NODE },
      { octaveShift: EIGHT_VA, nodeName: MUSIC_NOTE_NODE },
      { octaveShift: EIGHT_VA, octaveStop: true, nodeName: MUSIC_NOTE_NODE },
    ]);
    expect(spans).toHaveLength(1);
    expect(spans[0]).toEqual({
      amount: EIGHT_VA,
      mode: 'sign',
      startIndex: 0,
      stopIndex: 2,
      members: [
        { index: 0, isRest: false },
        { index: 1, isRest: false },
        { index: 2, isRest: false },
      ],
      closedBy: 'octave-stop',
    });
    expect(warnings).toHaveLength(0);
  });

  it('passes a rest through as a member of the currently open span', () => {
    const { spans, warnings } = resolveOctaveSpans([
      { octaveShift: FIFTEEN_MA, nodeName: MUSIC_NOTE_NODE },
      { nodeName: MUSIC_REST_NODE },
      { octaveStop: true, nodeName: MUSIC_NOTE_NODE },
    ]);
    expect(spans).toEqual([
      {
        amount: FIFTEEN_MA,
        mode: 'sign',
        startIndex: 0,
        stopIndex: 2,
        members: [
          { index: 0, isRest: false },
          { index: 1, isRest: true },
          { index: 2, isRest: false },
        ],
        closedBy: 'octave-stop',
      },
    ]);
    expect(warnings).toHaveLength(0);
  });

  it('warns and still closes the span when the stream ends with one still open', () => {
    const { spans, warnings } = resolveOctaveSpans([
      { octaveShift: EIGHT_VA, nodeName: MUSIC_NOTE_NODE },
      { nodeName: MUSIC_NOTE_NODE },
    ]);
    expect(spans).toEqual([
      {
        amount: EIGHT_VA,
        mode: 'sign',
        startIndex: 0,
        stopIndex: 1,
        members: [
          { index: 0, isRest: false },
          { index: 1, isRest: false },
        ],
        closedBy: 'implicit',
      },
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('starting at index 0');
    expect(warnings[0]).toContain('octave-stop');
  });

  it('returns no spans or warnings for a stream with no octave-shift at all', () => {
    const { spans, warnings, standaloneLocoIndices } = resolveOctaveSpans([
      { nodeName: MUSIC_NOTE_NODE },
      { nodeName: MUSIC_REST_NODE },
    ]);
    expect(spans).toHaveLength(0);
    expect(warnings).toHaveLength(0);
    expect(standaloneLocoIndices).toHaveLength(0);
  });

  it('closes a span with loco, including the loco element itself as the last member', () => {
    const { spans, warnings, standaloneLocoIndices } = resolveOctaveSpans([
      { octaveShift: EIGHT_VA, nodeName: MUSIC_NOTE_NODE },
      { nodeName: MUSIC_NOTE_NODE },
      { loco: true, nodeName: MUSIC_NOTE_NODE },
      { nodeName: MUSIC_NOTE_NODE },
    ]);
    expect(spans).toEqual([
      {
        amount: EIGHT_VA,
        mode: 'sign',
        startIndex: 0,
        stopIndex: 2,
        members: [
          { index: 0, isRest: false },
          { index: 1, isRest: false },
          { index: 2, isRest: false },
        ],
        closedBy: 'loco',
      },
    ]);
    expect(standaloneLocoIndices).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it('records a standalone loco with no open span, producing no span', () => {
    const { spans, warnings, standaloneLocoIndices } = resolveOctaveSpans([
      { nodeName: MUSIC_REST_NODE },
      { loco: true, nodeName: MUSIC_NOTE_NODE },
      { nodeName: MUSIC_NOTE_NODE },
    ]);
    expect(spans).toHaveLength(0);
    expect(standaloneLocoIndices).toEqual([1]);
    expect(warnings).toHaveLength(0);
  });

  it('closes a span exactly once, via loco, when loco and octave-stop are both set on the closing element', () => {
    const { spans, warnings, standaloneLocoIndices } = resolveOctaveSpans([
      { octaveShift: EIGHT_VA, nodeName: MUSIC_NOTE_NODE },
      { loco: true, octaveStop: true, nodeName: MUSIC_NOTE_NODE },
    ]);
    expect(spans).toHaveLength(1);
    expect(spans[0]).toEqual({
      amount: EIGHT_VA,
      mode: 'sign',
      startIndex: 0,
      stopIndex: 1,
      members: [
        { index: 0, isRest: false },
        { index: 1, isRest: false },
      ],
      closedBy: 'loco',
    });
    expect(standaloneLocoIndices).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it('resolves mode: "col" from octaveMode set on the starting element', () => {
    const { spans } = resolveOctaveSpans([
      {
        octaveShift: EIGHT_VA,
        octaveMode: 'col',
        octaveStop: true,
        nodeName: MUSIC_NOTE_NODE,
      },
    ]);
    expect(spans).toHaveLength(1);
    expect(spans[0].mode).toBe('col');
  });

  it('defaults mode to "sign" when octaveMode is not set on the starting element', () => {
    const { spans } = resolveOctaveSpans([
      { octaveShift: EIGHT_VA, octaveStop: true, nodeName: MUSIC_NOTE_NODE },
    ]);
    expect(spans).toHaveLength(1);
    expect(spans[0].mode).toBe('sign');
  });
});

describe('resolveOctaveContinuationSegments', () => {
  const buildSpan = (startIndex: number, stopIndex: number): OctaveSpan => ({
    amount: EIGHT_VA,
    mode: 'sign',
    startIndex,
    stopIndex,
    members: [],
    closedBy: 'octave-stop',
  });

  const fourMeasures: OctaveMeasureBoundary[] = [
    { startIndex: 0, endIndex: 4 },
    { startIndex: 4, endIndex: 8 },
    { startIndex: 8, endIndex: 12 },
    { startIndex: 12, endIndex: 16 },
  ];

  it('returns no segments for a span fully contained in one measure', () => {
    const segments = resolveOctaveContinuationSegments(
      fourMeasures,
      buildSpan(1, 2)
    );
    expect(segments).toEqual([]);
  });

  it('returns one segment with a real stopAtLocalIndex for a span crossing exactly one measure boundary', () => {
    const segments = resolveOctaveContinuationSegments(
      fourMeasures,
      buildSpan(3, 5)
    );
    expect(segments).toEqual([{ measureIndex: 1, stopAtLocalIndex: 1 }]);
  });

  it('returns two null segments then one real segment for a span crossing three measures', () => {
    const segments = resolveOctaveContinuationSegments(
      fourMeasures,
      buildSpan(2, 13)
    );
    expect(segments).toEqual([
      { measureIndex: 1, stopAtLocalIndex: null },
      { measureIndex: 2, stopAtLocalIndex: null },
      { measureIndex: 3, stopAtLocalIndex: 1 },
    ]);
  });
});

describe('resolveOctaveSpanExtremalStaffY', () => {
  const spanWithMembers = (indices: number[]): OctaveSpan => ({
    amount: EIGHT_VA,
    mode: 'sign',
    startIndex: indices[0],
    stopIndex: indices[indices.length - 1],
    members: indices.map((index) => ({ index, isRest: false })),
    closedBy: 'octave-stop',
  });

  it('returns the minimum Y across members for a raise span', () => {
    const staffYs = new Map([
      [0, [40]],
      [1, [10]],
      [2, [25]],
    ]);
    const result = resolveOctaveSpanExtremalStaffY(
      spanWithMembers([0, 1, 2]),
      true,
      (i) => staffYs.get(i) ?? []
    );
    expect(result).toBe(10);
  });

  it('returns the maximum Y across members for a lower span', () => {
    const staffYs = new Map([
      [0, [40]],
      [1, [10]],
      [2, [25]],
    ]);
    const result = resolveOctaveSpanExtremalStaffY(
      spanWithMembers([0, 1, 2]),
      false,
      (i) => staffYs.get(i) ?? []
    );
    expect(result).toBe(40);
  });

  it('excludes a rest member (no Ys) from the extremum', () => {
    const staffYs = new Map([
      [0, [40]],
      [1, []], // rest
      [2, [25]],
    ]);
    const result = resolveOctaveSpanExtremalStaffY(
      spanWithMembers([0, 1, 2]),
      true,
      (i) => staffYs.get(i) ?? []
    );
    expect(result).toBe(25);
  });

  it('a chord member contributes only its own most-extreme pitch', () => {
    const staffYs = new Map([
      [0, [40, 35]], // chord: only 35 should matter for a raise span
    ]);
    const result = resolveOctaveSpanExtremalStaffY(
      spanWithMembers([0]),
      true,
      (i) => staffYs.get(i) ?? []
    );
    expect(result).toBe(35);
  });

  it('returns null when every member is a rest', () => {
    const result = resolveOctaveSpanExtremalStaffY(
      spanWithMembers([0, 1]),
      true,
      () => []
    );
    expect(result).toBeNull();
  });
});

describe('isOctaveRaise', () => {
  it('is true for the "a" (alta) suffixed amounts', () => {
    expect(isOctaveRaise('8va')).toBe(true);
    expect(isOctaveRaise('15ma')).toBe(true);
    expect(isOctaveRaise('22ma')).toBe(true);
  });

  it('is false for the "b" (bassa) suffixed amounts', () => {
    expect(isOctaveRaise('8vb')).toBe(false);
    expect(isOctaveRaise('15mb')).toBe(false);
    expect(isOctaveRaise('22mb')).toBe(false);
  });
});
