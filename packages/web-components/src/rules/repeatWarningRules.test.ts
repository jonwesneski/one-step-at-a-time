import type { ClefType, Mode, Note, TimeSignature } from '../types/theory';
import {
  type BoundaryState,
  describeReminderEquals,
  type RepeatEndInput,
  resolveRepeatWarnings,
} from './repeatWarningRules';

const state = (
  clef: ClefType | null,
  keySig: Note | null,
  time: TimeSignature,
  mode: Mode = 'major'
): BoundaryState => ({
  clef,
  key: keySig === null ? null : { keySig, mode },
  time,
});

const input = (partial: Partial<RepeatEndInput>): RepeatEndInput => ({
  start: state('bass', 'C', '4/4'),
  end: state('bass', 'C', '4/4'),
  next: null,
  nextIsLaterEnding: false,
  beforeEndings: null,
  ...partial,
});

describe('resolveRepeatWarnings', () => {
  it('draws nothing when the section ends as it started', () => {
    const display = resolveRepeatWarnings(
      input({ next: state('bass', 'C', '4/4') })
    );
    expect(display.warnings).toEqual({});
    expect([...display.suppressAfter]).toEqual([]);
    expect([...display.reminderAfter]).toEqual([]);
  });

  // E bottom / F top: 𝄢 4/4 ‖: … 𝄞 | ♯♯ 3/4 … | 1. … 𝄢 ♮♮ 4/4 :‖ | 2. (𝄞 ♯♯ 3/4)
  it('reinstates the start and brackets a later ending that resumes the music before the endings', () => {
    const before = state('treble', 'D', '3/4');
    const display = resolveRepeatWarnings(
      input({
        end: before,
        next: before,
        nextIsLaterEnding: true,
        beforeEndings: before,
      })
    );
    expect(display.warnings).toEqual(state('bass', 'C', '4/4'));
    expect([...display.reminderAfter].sort()).toEqual(['clef', 'key', 'time']);
    expect([...display.suppressAfter]).toEqual([]);
  });

  // F second: 𝄢 ‖: … 𝄞 … 𝄢 :‖ 𝄢 (continuing in bass clef after the repeat)
  it('draws no change after the barline when the music continues as warned', () => {
    const display = resolveRepeatWarnings(
      input({
        end: state('treble', 'C', '4/4'),
        next: state('bass', 'C', '4/4'),
      })
    );
    expect(display.warnings).toEqual({ clef: 'bass' });
    expect([...display.suppressAfter]).toEqual(['clef']);
  });

  // F third: 𝄢 2/4 ‖: … :‖ 𝄞 ♯♯ 3/4 (a change that applies only after the repeat)
  it('leaves a change after the repeat to the ordinary continuity', () => {
    const display = resolveRepeatWarnings(
      input({
        start: state('bass', 'C', '2/4'),
        end: state('bass', 'C', '2/4'),
        next: state('treble', 'D', '3/4'),
      })
    );
    expect(display.warnings).toEqual({});
    expect([...display.suppressAfter]).toEqual([]);
    expect([...display.reminderAfter]).toEqual([]);
  });

  it('decides each component on its own', () => {
    const display = resolveRepeatWarnings(
      input({
        end: state('bass', 'C', '3/4'),
        next: state('treble', 'C', '4/4'),
      })
    );
    expect(display.warnings).toEqual({ time: '4/4' });
    expect([...display.suppressAfter]).toEqual(['time']);
  });

  it('compares keys by their accidentals', () => {
    const display = resolveRepeatWarnings(
      input({ end: state('bass', 'A', '4/4', 'minor') })
    );
    expect(display.warnings).toEqual({});
  });

  it('never warns of a clef or key a staff does not have', () => {
    const display = resolveRepeatWarnings(
      input({
        start: state(null, null, '4/4'),
        end: state(null, null, '3/4'),
      })
    );
    expect(display.warnings).toEqual({ time: '4/4' });
  });

  it('repeats from the beginning like any other start', () => {
    const display = resolveRepeatWarnings(
      input({
        start: state('treble', 'G', '4/4'),
        end: state('bass', 'G', '4/4'),
      })
    );
    expect(display.warnings).toEqual({ clef: 'treble' });
  });

  it('brackets a later ending only when it starts as the music did before the endings', () => {
    const display = resolveRepeatWarnings(
      input({
        end: state('treble', 'C', '4/4'),
        next: state('treble', 'C', '4/4'),
        nextIsLaterEnding: true,
        beforeEndings: state('bass', 'C', '4/4'),
      })
    );
    expect([...display.reminderAfter]).toEqual([]);
  });
});

describe('describeReminderEquals', () => {
  it('compares by value', () => {
    const reminder = { clef: true, key: false, time: true };
    expect(describeReminderEquals(reminder, { ...reminder })).toBe(true);
    expect(describeReminderEquals(reminder, null)).toBe(false);
    expect(describeReminderEquals(null, null)).toBe(true);
  });
});
