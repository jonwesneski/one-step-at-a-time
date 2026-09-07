/**
 * @jest-environment jsdom
 */
import '../chord/index';
import '../note/index';
import '../staff/index';
import type { ChordElementType } from '../types/elements';
import type { Chord } from '../types/theory';
import {
  MUSIC_CHORD,
  MUSIC_MEASURE,
  MUSIC_STAFF,
  STAFF_EVENTS,
} from '../utils/consts';
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe(MUSIC_MEASURE, () => {
  it('renders with default keySig, mode, and time', () => {
    const el = document.createElement(MUSIC_MEASURE) as any;
    document.body.appendChild(el);

    expect(el.keySig).toBe('C');
    expect(el.mode).toBe('major');
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.innerHTML).not.toBe('');
  });

  it('redraws the group connector when `group` is set on an already-connected staff, without waiting for a resize', () => {
    const measure = document.createElement(MUSIC_MEASURE) as any;
    const staffA = document.createElement(MUSIC_STAFF);
    const staffB = document.createElement(MUSIC_STAFF);
    measure.appendChild(staffA);
    measure.appendChild(staffB);
    document.body.appendChild(measure);

    let eventFired = false;
    measure.addEventListener(STAFF_EVENTS.GROUP_ATTRIBUTE_CHANGE, () => {
      eventFired = true;
    });

    staffA.setAttribute('group', 'grand');

    expect(eventFired).toBe(true);
    const container = measure.shadowRoot.querySelector('.group-connectors');
    expect(container?.children.length).toBe(1);
  });

  describe('cross-staff arpeggio', () => {
    function grandStaffMeasure(
      upperArpeggio: string | null,
      lowerArpeggio: string | null
    ): {
      measure: HTMLElement;
      upper: ChordElementType;
      lower: ChordElementType;
    } {
      const measure = document.createElement(MUSIC_MEASURE) as HTMLElement;
      const treble = document.createElement(MUSIC_STAFF);
      treble.setAttribute('group', 'grand');
      treble.setAttribute('clef', 'treble');
      treble.setAttribute('time', '4/4');
      const bass = document.createElement(MUSIC_STAFF);
      bass.setAttribute('clef', 'bass');
      bass.setAttribute('time', '4/4');
      measure.append(treble, bass);
      document.body.appendChild(measure);

      const upper = document.createElement(MUSIC_CHORD) as ChordElementType;
      upper.setAttribute('chord', 'Cmaj' satisfies Chord);
      if (upperArpeggio) {
        upper.setAttribute('arpeggio', upperArpeggio);
      }
      const lower = document.createElement(MUSIC_CHORD) as ChordElementType;
      lower.setAttribute('chord', 'Cmaj' satisfies Chord);
      if (lowerArpeggio) {
        lower.setAttribute('arpeggio', lowerArpeggio);
      }
      treble.appendChild(upper);
      bass.appendChild(lower);

      for (const [staff, chord] of [
        [treble, upper],
        [bass, lower],
      ] as const) {
        const slot = staff.shadowRoot!.querySelector('slot')!;
        (
          slot as unknown as { assignedElements: () => Element[] }
        ).assignedElements = () => [chord];
        slot.dispatchEvent(new Event('slotchange'));
      }
      return { measure, upper, lower };
    }

    it('suppresses both per-staff signs when a grand-staff pair is spanned', () => {
      const { measure, upper, lower } = grandStaffMeasure('up', 'up');

      expect(upper.renderArpeggioSign).toBe(false);
      expect(lower.renderArpeggioSign).toBe(false);
      expect(upper.shadowRoot?.querySelector('.arpeggio')).toBeNull();
      expect(lower.shadowRoot?.querySelector('.arpeggio')).toBeNull();
      expect(
        measure.shadowRoot?.querySelectorAll('.arpeggio-connector').length
      ).toBe(1);
    });

    it('keeps per-staff signs (broken arpeggio) when only one hand is marked', () => {
      const { upper, lower } = grandStaffMeasure('up', null);

      expect(upper.renderArpeggioSign).toBe(true);
      expect(upper.shadowRoot?.querySelector('.arpeggio')).not.toBeNull();
      expect(lower.shadowRoot?.querySelector('.arpeggio')).toBeNull();
    });

    it('restores the local sign after the pairing is removed', () => {
      const { upper, lower } = grandStaffMeasure('up', 'up');
      expect(upper.renderArpeggioSign).toBe(false);

      lower.removeAttribute('arpeggio');

      expect(upper.renderArpeggioSign).toBe(true);
      expect(upper.shadowRoot?.querySelector('.arpeggio')).not.toBeNull();
    });
  });
});
