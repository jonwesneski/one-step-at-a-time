/**
 * @jest-environment jsdom
 */
import '../index';
import type { StaffElementType } from '../types/elements';
import {
  COMMON_ATTRIBUTES,
  MUSIC_BARLINE,
  MUSIC_CLEF,
  MUSIC_COMPOSITION,
  MUSIC_MEASURE,
  MUSIC_NOTE,
  MUSIC_STAFF,
} from '../utils/consts';

afterEach(() => {
  document.body.innerHTML = '';
});

describe(MUSIC_COMPOSITION, () => {
  it('renders with default keySig, mode, and time', () => {
    const el = document.createElement(MUSIC_COMPOSITION) as any;
    document.body.appendChild(el);

    expect(el.keySig).toBe('C');
    expect(el.mode).toBe('major');
    expect(el.time).toBe('4/4');
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.innerHTML).not.toBe('');
  });
});

describe(`${MUSIC_COMPOSITION} attribute propagation`, () => {
  function makeTree(clef: 'treble' | 'bass' = 'treble'): {
    composition: any;
    measure: any;
    staff: StaffElementType;
  } {
    const composition = document.createElement(MUSIC_COMPOSITION) as any;
    document.body.appendChild(composition);

    const measure = document.createElement(MUSIC_MEASURE) as any;
    composition.appendChild(measure);

    const staff = document.createElement(MUSIC_STAFF) as StaffElementType;
    staff.setAttribute('clef', clef);
    measure.appendChild(staff);

    return { composition, measure, staff };
  }

  it('propagates key-sig change to a descendant treble staff', () => {
    const { composition, staff } = makeTree('treble');

    expect(staff.keySig).toBe('C');

    composition.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'G');

    expect(staff.keySig).toBe('G');
  });

  it('propagates mode change to a descendant treble staff', () => {
    const { composition, staff } = makeTree('treble');

    expect(staff.mode).toBe('major');

    composition.setAttribute(COMMON_ATTRIBUTES.MODE, 'minor');

    expect(staff.mode).toBe('minor');
  });

  it('propagates time change to a descendant treble staff', () => {
    const { composition, staff } = makeTree('treble');

    expect(staff.time).toBe('4/4');

    composition.setAttribute(COMMON_ATTRIBUTES.TIME, '3/4');

    expect(staff.time).toBe('3/4');
  });

  it('propagates key-sig change to a descendant bass staff', () => {
    const { composition, staff } = makeTree('bass');

    expect(staff.keySig).toBe('C');

    composition.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'Bb');

    expect(staff.keySig).toBe('Bb');
  });

  it('respects a staff-level key-sig override over the composition value', () => {
    const { composition, staff } = makeTree('treble');
    staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'D');

    expect(staff.keySig).toBe('D');

    composition.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'G');

    expect(staff.keySig).toBe('D');
  });

  it('respects a measure-level key-sig override over the composition value', () => {
    // Set the measure's key-sig BEFORE the staff connects so #resolveInheritedValue
    // picks it up during onConnectedCallback.
    const composition = document.createElement(MUSIC_COMPOSITION) as any;
    document.body.appendChild(composition);

    const measure = document.createElement(MUSIC_MEASURE) as any;
    measure.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'F');
    composition.appendChild(measure);

    const staff = document.createElement(MUSIC_STAFF) as StaffElementType;
    measure.appendChild(staff);

    expect(staff.keySig).toBe('F');

    composition.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'G');

    // Measure-level override still wins after composition propagates
    expect(staff.keySig).toBe('F');
  });
  it('propagates changes to a staff in parsed markup, with no values copied onto the measure', () => {
    document.body.innerHTML = `<${MUSIC_COMPOSITION} key-sig="C" time="4/4"><${MUSIC_MEASURE}><${MUSIC_STAFF} clef="treble"></${MUSIC_STAFF}></${MUSIC_MEASURE}></${MUSIC_COMPOSITION}>`;
    const composition = document.querySelector(MUSIC_COMPOSITION) as any;
    const measure = document.querySelector(MUSIC_MEASURE) as HTMLElement;
    const staff = document.querySelector(MUSIC_STAFF) as StaffElementType;

    expect(measure.hasAttribute(COMMON_ATTRIBUTES.KEY_SIG)).toBe(false);
    expect(measure.hasAttribute(COMMON_ATTRIBUTES.MODE)).toBe(false);

    composition.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'G');
    composition.setAttribute(COMMON_ATTRIBUTES.MODE, 'minor');
    composition.setAttribute(COMMON_ATTRIBUTES.TIME, '3/4');

    expect(staff.keySig).toBe('G');
    expect(staff.mode).toBe('minor');
    expect(staff.time).toBe('3/4');
  });

  it('propagates a time change to the first measure once measures are numbered', async () => {
    const { composition, measure, staff } = makeTree('treble');
    // Let the composition's child-list observer number the measures.
    await Promise.resolve();
    expect(measure.getAttribute('number')).toBe('1');

    composition.setAttribute(COMMON_ATTRIBUTES.TIME, '3/4');

    expect(staff.time).toBe('3/4');
  });

  it("updates a staff when its connected measure's own values change", () => {
    const { measure, staff } = makeTree('treble');

    measure.setAttribute(COMMON_ATTRIBUTES.TIME, '6/8');
    measure.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'D');

    expect(staff.time).toBe('6/8');
    expect(staff.keySig).toBe('D');
  });
});

describe(`${MUSIC_COMPOSITION} max-width`, () => {
  it('updates the wrapper cap in place without replacing the shadow slot', () => {
    const composition = document.createElement(MUSIC_COMPOSITION) as any;
    document.body.appendChild(composition);

    const slotBefore = composition.shadowRoot.querySelector('slot');
    const wrapper = composition.shadowRoot.querySelector(
      '.composition-wrapper'
    ) as HTMLElement;

    composition.setAttribute('max-width', '500');

    // The slot must survive so the slotchange listener wired in
    // #observeForRedraws() keeps firing on later measure inserts/reorders.
    expect(composition.shadowRoot.querySelector('slot')).toBe(slotBefore);
    expect(wrapper.isConnected).toBe(true);
    expect(wrapper.style.maxWidth).toBe('500px');

    composition.setAttribute('max-width', 'none');
    expect(wrapper.style.maxWidth).toBe('none');

    composition.removeAttribute('max-width');
    expect(wrapper.style.maxWidth).toBe('900px');
  });
});

describe(`${MUSIC_COMPOSITION} measure numbering`, () => {
  function flushMutations(): Promise<void> {
    return new Promise((resolve) => queueMicrotask(resolve));
  }

  it('numbers measures sequentially starting at 1 on initial connect', () => {
    const composition = document.createElement(MUSIC_COMPOSITION) as any;
    const measures = [0, 1, 2].map(() => document.createElement(MUSIC_MEASURE));
    measures.forEach((measure) => composition.appendChild(measure));
    document.body.appendChild(composition);

    expect(measures.map((m) => m.getAttribute('number'))).toEqual([
      '1',
      '2',
      '3',
    ]);
  });

  it('continues numbering when a measure is dynamically added', async () => {
    const composition = document.createElement(MUSIC_COMPOSITION) as any;
    document.body.appendChild(composition);
    composition.appendChild(document.createElement(MUSIC_MEASURE));
    await flushMutations();

    const secondMeasure = document.createElement(MUSIC_MEASURE);
    composition.appendChild(secondMeasure);
    await flushMutations();

    expect(secondMeasure.getAttribute('number')).toBe('2');
  });

  it('renumbers from 1 after removing every measure and adding a new one', async () => {
    const composition = document.createElement(MUSIC_COMPOSITION) as any;
    document.body.appendChild(composition);
    const original = [0, 1, 2].map(() => {
      const measure = document.createElement(MUSIC_MEASURE);
      composition.appendChild(measure);
      return measure;
    });
    await flushMutations();

    original.forEach((measure) => composition.removeChild(measure));
    await flushMutations();

    const freshMeasure = document.createElement(MUSIC_MEASURE);
    composition.appendChild(freshMeasure);
    await flushMutations();

    expect(freshMeasure.getAttribute('number')).toBe('1');
  });

  function measureWithStaves(...times: string[]): {
    measure: HTMLElement;
    staves: any[];
  } {
    const measure = document.createElement(MUSIC_MEASURE);
    const staves = times.map((time) => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.TIME, time);
      measure.appendChild(staff);
      return staff;
    });
    return { measure, staves };
  }

  const timeSigText = (staff: any): string | null =>
    staff.shadowRoot.querySelector('.time-signature')?.textContent ?? null;

  it('shows the first measure’s time signature after it is replaced by a fresh node', async () => {
    const composition = document.createElement(MUSIC_COMPOSITION) as any;
    document.body.appendChild(composition);

    const first = measureWithStaves('4/4');
    composition.appendChild(first.measure);
    await flushMutations();
    expect(timeSigText(first.staves[0])).toBe('44');

    // A rebar replaces measure 1 with a brand-new node whose staff connects
    // before the MutationObserver runs #renumberMeasures.
    const fresh = measureWithStaves('5/4');
    composition.replaceChild(fresh.measure, first.measure);
    await flushMutations();

    expect(fresh.measure.getAttribute('number')).toBe('1');
    expect(timeSigText(fresh.staves[0])).toBe('54');
  });

  it('shows the time signature on both staves of a remounted grand-staff first measure', async () => {
    const composition = document.createElement(MUSIC_COMPOSITION) as any;
    document.body.appendChild(composition);

    const original = measureWithStaves('4/4', '4/4'); // treble + bass
    composition.appendChild(original.measure);
    await flushMutations();

    // Replace measure 1 and add two more fresh measures at once (a multi-measure
    // rebar): measure 1 remounts as a grand staff, measures 2–3 do not show it.
    const m1 = measureWithStaves('3/4', '3/4');
    const m2 = measureWithStaves('3/4', '3/4');
    const m3 = measureWithStaves('3/4', '3/4');
    composition.replaceChild(m1.measure, original.measure);
    composition.appendChild(m2.measure);
    composition.appendChild(m3.measure);
    await flushMutations();

    expect(m1.staves.map(timeSigText)).toEqual(['34', '34']);
    expect(m2.staves.map(timeSigText)).toEqual([null, null]);
    expect(m3.staves.map(timeSigText)).toEqual([null, null]);
  });

  it('renumbers remaining measures with no gap after removing a middle measure', async () => {
    const composition = document.createElement(MUSIC_COMPOSITION) as any;
    document.body.appendChild(composition);
    const [first, middle, last] = [0, 1, 2].map(() => {
      const measure = document.createElement(MUSIC_MEASURE);
      composition.appendChild(measure);
      return measure;
    });
    await flushMutations();

    composition.removeChild(middle);
    await flushMutations();

    expect(first.getAttribute('number')).toBe('1');
    expect(last.getAttribute('number')).toBe('2');
  });
});

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));

function addMeasure(
  composition: HTMLElement,
  attributes: Record<string, string>,
  content: () => Element[] = () => [whole()],
  staffAttributes: Record<string, string> = {}
): any {
  const measure = document.createElement(MUSIC_MEASURE);
  for (const [name, value] of Object.entries(attributes)) {
    measure.setAttribute(name, value);
  }
  const staff = document.createElement(MUSIC_STAFF) as any;
  for (const [name, value] of Object.entries(staffAttributes)) {
    staff.setAttribute(name, value);
  }
  const elements = content();
  staff.append(...elements);
  measure.appendChild(staff);
  composition.appendChild(measure);
  const slot = staff.shadowRoot.querySelector('slot');
  slot.assignedElements = () => elements;
  slot.dispatchEvent(new Event('slotchange'));
  return staff;
}

function whole(): Element {
  const note = document.createElement(MUSIC_NOTE);
  note.setAttribute('note', 'C');
  note.setAttribute('octave', '4');
  note.setAttribute('duration', 'whole');
  return note;
}

function half(): Element {
  const note = document.createElement(MUSIC_NOTE);
  note.setAttribute('note', 'C');
  note.setAttribute('octave', '4');
  note.setAttribute('duration', 'half');
  return note;
}

describe(`${MUSIC_COMPOSITION} barline junctions`, () => {
  it('joins an end repeat and the next bar’s start repeat on one row', async () => {
    const composition = document.createElement(MUSIC_COMPOSITION);
    document.body.appendChild(composition);
    const first = addMeasure(composition, {});
    const second = addMeasure(composition, { barline: 'repeat-end' });
    const third = addMeasure(composition, { 'repeat-start': '' });
    const fourth = addMeasure(composition, { barline: 'final' });
    await nextFrame();

    expect(first.startRepeat).toBe('none');
    expect(second.endBarline).toBe('repeat-end-thin');
    expect(third.startRepeat).toBe('shared-thick');
    expect(fourth.endBarline).toBe('final');
  });

  it('replaces a plain barline with a start repeat', async () => {
    const composition = document.createElement(MUSIC_COMPOSITION);
    document.body.appendChild(composition);
    const first = addMeasure(composition, {});
    const second = addMeasure(composition, { 'repeat-start': '' });
    await nextFrame();

    expect(first.endBarline).toBe('none');
    expect(second.startRepeat).toBe('shared-thick');

    second.parentElement.removeAttribute('repeat-start');
    await nextFrame();
    expect(first.endBarline).toBe('single');
    expect(second.startRepeat).toBe('none');
  });

  it('warns once about a repeat that does not hold whole bars', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const composition = document.createElement(MUSIC_COMPOSITION);
    document.body.appendChild(composition);
    addMeasure(composition, {}, () => {
      const barline = document.createElement(MUSIC_BARLINE);
      barline.setAttribute('type', 'repeat-start');
      return [half(), barline, half()];
    });
    addMeasure(composition, { barline: 'repeat-end' });
    await nextFrame();
    await nextFrame();

    const pickupWarnings = warn.mock.calls.filter(([message]) =>
      String(message).includes('whole bars')
    );
    expect(pickupWarnings).toHaveLength(1);
    warn.mockRestore();
  });
});

describe(`${MUSIC_COMPOSITION} key changes and courtesy warnings`, () => {
  // jsdom lays nothing out, so each measure reports the row it sits on.
  function placeOnRows(staves: any[], rows: number[]) {
    staves.forEach((staff, index) => {
      staff.parentElement.getBoundingClientRect = () =>
        ({ top: rows[index] * 100 } as DOMRect);
    });
  }

  it('flags a key change only where the key signature differs', async () => {
    const composition = document.createElement(MUSIC_COMPOSITION);
    document.body.appendChild(composition);
    const staves = [
      addMeasure(composition, { 'key-sig': 'D' }),
      addMeasure(composition, { 'key-sig': 'D' }),
      addMeasure(composition, { 'key-sig': 'C' }),
      addMeasure(composition, { 'key-sig': 'A', mode: 'minor' }),
    ];
    await nextFrame();

    expect(staves.map((staff) => staff.keyChangeAtBoundary)).toEqual([
      null,
      null,
      {
        from: { keySig: 'D', mode: 'major' },
        to: { keySig: 'C', mode: 'major' },
      },
      null,
    ]);
  });

  it('warns of the next key and clef at a row end only', async () => {
    const composition = document.createElement(MUSIC_COMPOSITION);
    document.body.appendChild(composition);
    const staves = [
      addMeasure(composition, { 'key-sig': 'D' }),
      addMeasure(composition, { 'key-sig': 'C' }, undefined, {
        clef: 'bass',
      }),
      addMeasure(composition, { 'key-sig': 'C' }, undefined, {
        clef: 'bass',
      }),
      addMeasure(composition, { 'key-sig': 'G' }, undefined, {
        clef: 'treble',
      }),
    ];
    placeOnRows(staves, [0, 0, 0, 1]);
    composition.dispatchEvent(new Event('staff-notes-positioned'));
    await nextFrame();

    expect(staves[0].endWarnings).toBeNull();
    expect(staves[1].endWarnings).toBeNull();
    expect(staves[2].endWarnings).toEqual({
      clef: 'treble',
      key: {
        from: { keySig: 'C', mode: 'major' },
        to: { keySig: 'G', mode: 'major' },
      },
      time: null,
      reservesWidth: false,
    });
    expect(staves[3].endWarnings).toBeNull();

    placeOnRows(staves, [0, 0, 0, 0]);
    composition.dispatchEvent(new Event('staff-notes-positioned'));
    await nextFrame();
    expect(staves[2].endWarnings).toBeNull();
  });

  it('puts a start repeat after a key change', async () => {
    const composition = document.createElement(MUSIC_COMPOSITION);
    document.body.appendChild(composition);
    const first = addMeasure(composition, { 'key-sig': 'D' });
    const second = addMeasure(composition, {
      'key-sig': 'C',
      'repeat-start': '',
    });
    await nextFrame();

    expect(first.endBarline).toBe('single');
    expect(second.startRepeat).toBe('full');
  });
});

describe(`${MUSIC_COMPOSITION} endings`, () => {
  function build(numbering: string | null): any[] {
    const composition = document.createElement(MUSIC_COMPOSITION);
    if (numbering !== null) {
      composition.setAttribute('ending-numbering', numbering);
    }
    composition.setAttribute('measure-numbers', 'row-start');
    document.body.appendChild(composition);
    return [
      addMeasure(composition, {}),
      addMeasure(composition, { ending: '1' }),
      addMeasure(composition, { ending: '1', barline: 'repeat-end' }),
      addMeasure(composition, { ending: '2' }),
      addMeasure(composition, { ending: '2' }),
      addMeasure(composition, {}),
    ].map((staff) => staff.parentElement);
  }

  const settle = (): Promise<void> => Promise.resolve();

  it('numbers duplicate endings with a letter each and shows them all', async () => {
    const measures = build('duplicate');
    await settle();

    expect(measures.map((measure) => measure.number)).toEqual([
      1, 2, 3, 2, 3, 4,
    ]);
    expect(measures.map((measure) => measure.numberLabel)).toEqual([
      null,
      '2a',
      '3a',
      '2b',
      '3b',
      null,
    ]);
    expect(measures.map((measure) => measure.forceNumberDisplay)).toEqual([
      false,
      true,
      true,
      true,
      true,
      false,
    ]);
  });

  it('renumbers when an ending or the numbering changes', async () => {
    const measures = build(null);
    await settle();
    expect(measures.map((measure) => measure.number)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(measures[4].forceNumberDisplay).toBe(false);

    measures[4].removeAttribute('ending');
    measures[3].setAttribute('ending', '2');
    measures[3].parentElement.setAttribute('ending-numbering', 'duplicate');
    expect(measures.map((measure) => measure.number)).toEqual([
      1, 2, 3, 2, 4, 5,
    ]);
    expect(measures[3].numberLabel).toBe('2b');
  });

  it('hands every ending bar its piece of the bracket', async () => {
    const measures = build(null);
    await nextFrame();

    expect(
      measures.map((measure) => measure.endingSegment?.label ?? null)
    ).toEqual([null, '1.', null, '2.', null, null]);
    expect(measures[2].endingSegment.rightHook).toBe(true);
    expect(measures[4].endingSegment.rightHook).toBe(false);
    expect(
      measures[1].shadowRoot.querySelector('.endings-overlay .ending-label')
        ?.textContent
    ).toBe('1.');
  });
});

describe(`${MUSIC_COMPOSITION} repeat warnings`, () => {
  const note = (name: string, octave: number, duration: string) => () => {
    const element = document.createElement(MUSIC_NOTE);
    element.setAttribute('note', name);
    element.setAttribute('octave', `${octave}`);
    element.setAttribute('duration', duration);
    return element;
  };
  const clef = (value: string) => () => {
    const element = document.createElement(MUSIC_CLEF);
    element.setAttribute('clef', value);
    return element;
  };
  const barline = (type: string) => () => {
    const element = document.createElement(MUSIC_BARLINE);
    element.setAttribute('type', type);
    return element;
  };
  const bars =
    (...parts: (() => Element)[]) =>
    () =>
      parts.map((part) => part());

  it('reinstates the section start before :‖ and draws no clef after it', async () => {
    const composition = document.createElement(MUSIC_COMPOSITION);
    document.body.appendChild(composition);
    addMeasure(
      composition,
      { 'repeat-start': '' },
      bars(note('C', 3, 'half'), clef('treble'), note('G', 4, 'half')),
      { clef: 'bass' }
    );
    const end = addMeasure(
      composition,
      { barline: 'repeat-end' },
      bars(note('G', 4, 'whole')),
      { clef: 'treble' }
    );
    const after = addMeasure(composition, {}, bars(note('C', 3, 'whole')), {
      clef: 'bass',
    });
    await nextFrame();

    expect(end.endWarnings).toEqual({
      clef: 'bass',
      key: null,
      time: null,
      reservesWidth: true,
    });
    expect(after.clefChangeAtBoundary).toBe(false);
  });

  it('brackets the state a later ending resumes in', async () => {
    const composition = document.createElement(MUSIC_COMPOSITION);
    composition.setAttribute('time', '4/4');
    document.body.appendChild(composition);
    addMeasure(
      composition,
      { 'repeat-start': '' },
      bars(note('C', 3, 'whole')),
      {
        clef: 'bass',
      }
    );
    const dotted = bars(note('A', 4, 'dotted-half'));
    addMeasure(composition, { 'key-sig': 'D', time: '3/4' }, dotted, {
      clef: 'treble',
    });
    const first = addMeasure(
      composition,
      { 'key-sig': 'D', time: '3/4', ending: '1', barline: 'repeat-end' },
      dotted,
      { clef: 'treble' }
    );
    const second = addMeasure(
      composition,
      { 'key-sig': 'D', time: '3/4', ending: '2' },
      dotted,
      { clef: 'treble' }
    );
    await nextFrame();

    expect(first.endWarnings).toEqual({
      clef: 'bass',
      key: {
        from: { keySig: 'D', mode: 'major' },
        to: { keySig: 'C', mode: 'major' },
      },
      time: '4/4',
      reservesWidth: true,
    });
    expect(second.describeReminder).toEqual({
      clef: true,
      key: true,
      time: true,
    });
  });

  it('warns of a clef before a mid-bar end repeat', async () => {
    const composition = document.createElement(MUSIC_COMPOSITION);
    document.body.appendChild(composition);
    addMeasure(
      composition,
      { 'repeat-start': '' },
      bars(note('C', 3, 'whole')),
      {
        clef: 'bass',
      }
    );
    const midBar = addMeasure(
      composition,
      {},
      bars(note('G', 4, 'half'), barline('repeat-end'), note('G', 4, 'half')),
      { clef: 'treble' }
    );
    await nextFrame();

    expect([...midBar.markerWarnings]).toEqual([[1 / 2, 'bass']]);
  });
});
