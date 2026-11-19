/**
 * @jest-environment jsdom
 */
import '../note/index';
import '../staff/index';
import type { NoteElementType, TremoloElementType } from '../types/elements';
import type { DurationType, Note, Octave } from '../types/theory';
import {
  COMMON_ATTRIBUTES,
  MUSIC_NOTE,
  MUSIC_STAFF,
  MUSIC_TREMOLO,
  TREMOLO_EVENTS,
} from '../utils/consts';
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

function note(
  value: Note,
  octave: Octave,
  duration: DurationType
): NoteElementType {
  const element = document.createElement(MUSIC_NOTE) as NoteElementType;
  element.setAttribute('note', value);
  element.setAttribute('octave', `${octave}`);
  element.setAttribute('duration', duration);
  return element;
}

function tremolo(
  members: HTMLElement[],
  attributes: Record<string, string> = {}
): TremoloElementType {
  const element = document.createElement(MUSIC_TREMOLO) as TremoloElementType;
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  element.append(...members);
  return element;
}

function renderStaff(time: string, content: HTMLElement[]) {
  const staff = document.createElement(MUSIC_STAFF) as any;
  staff.setAttribute(COMMON_ATTRIBUTES.TIME, time);
  staff.append(...content);
  document.body.appendChild(staff);
  const slot = staff.shadowRoot.querySelector('slot');
  slot.assignedElements = () => content;
  slot.dispatchEvent(new Event('slotchange'));
  return staff;
}

const tremoloBeams = (staff: any) =>
  staff.shadowRoot.querySelectorAll('.tremolo-beam');

describe(MUSIC_TREMOLO, () => {
  it('defaults to three strokes and no beam choices', () => {
    const element = tremolo([]);
    document.body.appendChild(element);
    expect(element.strokes).toBe(3);
    expect(element.beamAttach).toBeNull();
    expect(element.beamPosition).toBeNull();
    expect(element.tremoloGroup).toBeNull();
  });

  it('round-trips its attributes, ignoring values that don’t parse with a warning', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const element = tremolo([]);
    document.body.appendChild(element);
    element.strokes = 2;
    element.beamAttach = 'outer';
    element.beamPosition = 'between';
    element.tremoloGroup = 't1';
    expect(element.getAttribute('strokes')).toBe('2');
    expect(element.beamAttach).toBe('outer');
    expect(element.beamPosition).toBe('between');
    expect(element.tremoloGroup).toBe('t1');

    element.setAttribute('strokes', '9');
    expect(element.strokes).toBe(3);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('strokes="9"'));
    warn.mockRestore();
  });

  it('dispatches an attribute change once connected', () => {
    const element = tremolo([]);
    document.body.appendChild(element);
    const handler = jest.fn();
    element.addEventListener(TREMOLO_EVENTS.ATTRIBUTE_CHANGE, handler);
    element.strokes = 2;
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('dispatches a change when its children change, until disconnected', async () => {
    const element = tremolo([note('F', 4, 'half')]);
    document.body.appendChild(element);
    const handler = jest.fn();
    element.addEventListener(TREMOLO_EVENTS.ATTRIBUTE_CHANGE, handler);

    element.appendChild(note('A', 4, 'half'));
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);

    element.firstElementChild!.remove();
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(2);

    element.remove();
    element.appendChild(note('C', 5, 'half'));
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('lists its members as flat elements', () => {
    const members = [note('F', 4, 'half'), note('A', 4, 'half')];
    expect(tremolo(members).flatElements).toEqual(members);
  });
});

describe('staff integration', () => {
  it('fills the written value once, the second note halfway through', () => {
    const first = note('F', 4, 'half');
    const second = note('A', 4, 'half');
    const after = note('C', 5, 'half');
    const staff = renderStaff('4/4', [tremolo([first, second]), after]);
    expect(staff.beatOffsetOf(first)).toBe(0);
    expect(staff.beatOffsetOf(second)).toBe(0.25);
    expect(staff.beatOffsetOf(after)).toBe(0.5);
  });

  it('draws one beam per stroke between minims, both stems one way', () => {
    const first = note('F', 4, 'half');
    const second = note('A', 4, 'half');
    const staff = renderStaff('4/4', [tremolo([first, second])]);
    expect(tremoloBeams(staff)).toHaveLength(3);
    expect(first.stemUp).toBe(second.stemUp);
  });

  it('keeps a quaver tremolo’s own beam and never beams it with its neighbours', () => {
    // The pair fills one quaver, so the next quaver shares its beat.
    const members = [note('B', 4, 'eighth'), note('E', 4, 'eighth')];
    const staff = renderStaff('2/4', [
      tremolo(members, { strokes: '2' }),
      note('C', 5, 'eighth'),
      note('D', 5, 'eighth'),
      note('E', 5, 'eighth'),
    ]);
    expect(tremoloBeams(staff)).toHaveLength(3);
    expect(staff.shadowRoot.querySelectorAll('.beam-group')).toHaveLength(1);
    expect(members.every((member) => member.noFlags)).toBe(true);
  });

  it('ignores a member’s own strokes', () => {
    const member = note('F', 4, 'half');
    member.setAttribute('tremolo', '3');
    renderStaff('4/4', [tremolo([member, note('A', 4, 'half')])]);
    expect(member.tremolo).toBeNull();
    expect(member.shadowRoot!.querySelector('.tremolo-stroke')).toBeNull();
  });

  it('places beams between notes an octave apart, each keeping its own stem', () => {
    const low = note('G', 4, 'half');
    const high = note('G', 5, 'half');
    const staff = renderStaff('4/4', [
      tremolo([low, high], { 'beam-position': 'between' }),
    ]);
    expect(tremoloBeams(staff)).toHaveLength(3);
    expect(low.stemUp).toBe(true);
    expect(high.stemUp).toBe(false);
  });

  it('warns and keeps the beams between the stems when the notes are under an octave apart', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const low = note('G', 4, 'half');
    const high = note('F', 5, 'half');
    renderStaff('4/4', [tremolo([low, high], { 'beam-position': 'between' })]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('octave'));
    expect(low.stemUp).toBe(high.stemUp);
    warn.mockRestore();
  });

  it('draws plain notes when the members’ values differ', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const staff = renderStaff('4/4', [
      tremolo([note('F', 4, 'half'), note('A', 4, 'quarter')]),
    ]);
    expect(tremoloBeams(staff)).toHaveLength(0);
    warn.mockRestore();
  });

  it('re-flattens when a member’s value changes', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const first = note('F', 4, 'half');
    const second = note('A', 4, 'half');
    const staff = renderStaff('4/4', [tremolo([first, second])]);
    expect(tremoloBeams(staff)).toHaveLength(3);

    second.setAttribute('duration', 'quarter');

    expect(tremoloBeams(staff)).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('same duration'));
    warn.mockRestore();
  });

  it('redraws when a member is added or removed', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const second = note('A', 4, 'half');
    const wrapper = tremolo([note('F', 4, 'half'), second]);
    const staff = renderStaff('4/4', [wrapper]);
    expect(tremoloBeams(staff)).toHaveLength(3);

    second.remove();
    await Promise.resolve();
    expect(tremoloBeams(staff)).toHaveLength(0);

    wrapper.appendChild(second);
    await Promise.resolve();
    expect(tremoloBeams(staff)).toHaveLength(3);
    warn.mockRestore();
  });

  it('redraws when its strokes change', () => {
    const wrapper = tremolo([note('F', 4, 'half'), note('A', 4, 'half')]);
    const staff = renderStaff('4/4', [wrapper]);
    wrapper.strokes = 2;
    expect(tremoloBeams(staff)).toHaveLength(2);
  });
});

describe('cross-staff role', () => {
  it('leaves the beams to the measure and points the stems where it says, until the role is cleared', () => {
    const first = note('F', 4, 'half');
    const second = note('A', 4, 'half');
    const wrapper = tremolo([first, second], { 'tremolo-group': 't1' });
    const staff = renderStaff('4/4', [wrapper]);
    expect(tremoloBeams(staff)).toHaveLength(3);

    staff.crossStaffTremoloRoles = new Map([[wrapper, { stemUp: false }]]);

    expect(tremoloBeams(staff)).toHaveLength(0);
    expect(first.stemUp).toBe(false);
    expect(second.stemUp).toBe(false);

    staff.crossStaffTremoloRoles = null;

    expect(tremoloBeams(staff)).toHaveLength(3);
    expect(first.stemUp).toBe(true);
  });
});
