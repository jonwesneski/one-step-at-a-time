/**
 * @jest-environment jsdom
 */
import '../index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('music-composition', () => {
  it('registers as a custom element', () => {
    expect(customElements.get('music-composition')).toBeDefined();
  });

  it('renders with default keySig, mode, and time', () => {
    const el = document.createElement('music-composition') as any;
    document.body.appendChild(el);

    expect(el.keySig).toBe('C');
    expect(el.mode).toBe('major');
    expect(el.time).toBe('4/4');
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.innerHTML).not.toBe('');
  });
});

describe('music-composition attribute propagation', () => {
  function makeTree(staffTag = 'music-staff-treble'): {
    composition: any;
    measure: any;
    staff: any;
  } {
    const composition = document.createElement('music-composition') as any;
    document.body.appendChild(composition);

    const measure = document.createElement('music-measure') as any;
    composition.appendChild(measure);

    const staff = document.createElement(staffTag) as any;
    measure.appendChild(staff);

    return { composition, measure, staff };
  }

  it('propagates keysig change to a descendant treble staff', () => {
    const { composition, staff } = makeTree('music-staff-treble');

    expect(staff.keySig).toBe('C');

    composition.setAttribute('keysig', 'G');

    expect(staff.keySig).toBe('G');
  });

  it('propagates mode change to a descendant treble staff', () => {
    const { composition, staff } = makeTree('music-staff-treble');

    expect(staff.mode).toBe('major');

    composition.setAttribute('mode', 'minor');

    expect(staff.mode).toBe('minor');
  });

  it('propagates time change to a descendant treble staff', () => {
    const { composition, staff } = makeTree('music-staff-treble');

    expect(staff.time).toBe('4/4');

    composition.setAttribute('time', '3/4');

    expect(staff.time).toBe('3/4');
  });

  it('propagates keysig change to a descendant bass staff', () => {
    const { composition, staff } = makeTree('music-staff-bass');

    expect(staff.keySig).toBe('C');

    composition.setAttribute('keysig', 'Bb');

    expect(staff.keySig).toBe('Bb');
  });

  it('respects a staff-level keysig override over the composition value', () => {
    const { composition, staff } = makeTree('music-staff-treble');
    staff.setAttribute('keysig', 'D');

    expect(staff.keySig).toBe('D');

    composition.setAttribute('keysig', 'G');

    expect(staff.keySig).toBe('D');
  });

  it('respects a measure-level keysig override over the composition value', () => {
    // Set the measure's keysig BEFORE the staff connects so #resolveInheritedValue
    // picks it up during onConnectedCallback.
    const composition = document.createElement('music-composition') as any;
    document.body.appendChild(composition);

    const measure = document.createElement('music-measure') as any;
    measure.setAttribute('keysig', 'F');
    composition.appendChild(measure);

    const staff = document.createElement('music-staff-treble') as any;
    measure.appendChild(staff);

    expect(staff.keySig).toBe('F');

    composition.setAttribute('keysig', 'G');

    // Measure-level override still wins after composition propagates
    expect(staff.keySig).toBe('F');
  });
});
