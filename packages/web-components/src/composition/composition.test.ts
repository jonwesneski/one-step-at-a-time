/**
 * @jest-environment jsdom
 */
import '../index';
import {
  COMMON_ATTRIBUTES,
  MUSIC_COMPOSITION,
  MUSIC_MEASURE,
  MUSIC_STAFF_BASS,
  MUSIC_STAFF_TREBLE,
} from '../utils/consts';

afterEach(() => {
  document.body.innerHTML = '';
});

describe(MUSIC_COMPOSITION, () => {
  it('registers as a custom element', () => {
    expect(customElements.get(MUSIC_COMPOSITION)).toBeDefined();
  });

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
  function makeTree(staffTag = MUSIC_STAFF_TREBLE): {
    composition: any;
    measure: any;
    staff: any;
  } {
    const composition = document.createElement(MUSIC_COMPOSITION) as any;
    document.body.appendChild(composition);

    const measure = document.createElement(MUSIC_MEASURE) as any;
    composition.appendChild(measure);

    const staff = document.createElement(staffTag) as any;
    measure.appendChild(staff);

    return { composition, measure, staff };
  }

  it('propagates keysig change to a descendant treble staff', () => {
    const { composition, staff } = makeTree(MUSIC_STAFF_TREBLE);

    expect(staff.keySig).toBe('C');

    composition.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'G');

    expect(staff.keySig).toBe('G');
  });

  it('propagates mode change to a descendant treble staff', () => {
    const { composition, staff } = makeTree(MUSIC_STAFF_TREBLE);

    expect(staff.mode).toBe('major');

    composition.setAttribute(COMMON_ATTRIBUTES.MODE, 'minor');

    expect(staff.mode).toBe('minor');
  });

  it('propagates time change to a descendant treble staff', () => {
    const { composition, staff } = makeTree(MUSIC_STAFF_TREBLE);

    expect(staff.time).toBe('4/4');

    composition.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '3/4');

    expect(staff.time).toBe('3/4');
  });

  it('propagates keysig change to a descendant bass staff', () => {
    const { composition, staff } = makeTree(MUSIC_STAFF_BASS);

    expect(staff.keySig).toBe('C');

    composition.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'Bb');

    expect(staff.keySig).toBe('Bb');
  });

  it('respects a staff-level keysig override over the composition value', () => {
    const { composition, staff } = makeTree(MUSIC_STAFF_TREBLE);
    staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'D');

    expect(staff.keySig).toBe('D');

    composition.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'G');

    expect(staff.keySig).toBe('D');
  });

  it('respects a measure-level keysig override over the composition value', () => {
    // Set the measure's keysig BEFORE the staff connects so #resolveInheritedValue
    // picks it up during onConnectedCallback.
    const composition = document.createElement(MUSIC_COMPOSITION) as any;
    document.body.appendChild(composition);

    const measure = document.createElement(MUSIC_MEASURE) as any;
    measure.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'F');
    composition.appendChild(measure);

    const staff = document.createElement(MUSIC_STAFF_TREBLE) as any;
    measure.appendChild(staff);

    expect(staff.keySig).toBe('F');

    composition.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'G');

    // Measure-level override still wins after composition propagates
    expect(staff.keySig).toBe('F');
  });
});
