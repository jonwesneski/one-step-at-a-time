/**
 * @jest-environment jsdom
 */
import '../index';
import type { ChordElementType, NoteElementType } from '../types/elements';
import {
  MUSIC_CHORD,
  MUSIC_CLEF,
  MUSIC_MEASURE,
  MUSIC_NOTE,
  MUSIC_STAFF,
  MUSIC_STAFF_PERCUSSION,
} from '../utils/consts';

afterEach(() => {
  document.body.innerHTML = '';
  jest.restoreAllMocks();
});

type StaffLike = HTMLElement & {
  effectiveKeySignature: { keySig: string; mode: string };
  noteToYCoordinate(note: string, octave?: number): number;
};

// Built from markup so the staff resolves the measure's key-sig on connect.
function renderInMeasure(
  staffTag: string,
  content: string,
  keySig = 'G'
): { staff: StaffLike; children: Element[] } {
  document.body.innerHTML = `<${MUSIC_MEASURE} key-sig="${keySig}" time="4/4"><${staffTag}>${content}</${staffTag}></${MUSIC_MEASURE}>`;
  const staff = document.body.querySelector(staffTag) as StaffLike;
  const children = Array.from(staff.children);
  const slot = staff.shadowRoot!.querySelector('slot') as HTMLSlotElement & {
    assignedElements: () => Element[];
  };
  slot.assignedElements = () => children;
  slot.dispatchEvent(new Event('slotchange'));
  return { staff, children };
}

const keySignatureGlyphCount = (staff: StaffLike): number =>
  staff.shadowRoot!.querySelectorAll('.key-signature svg').length;

describe(MUSIC_STAFF_PERCUSSION, () => {
  it('draws the neutral clef', () => {
    const { staff } = renderInMeasure(MUSIC_STAFF_PERCUSSION, '');
    expect(staff.shadowRoot!.querySelector('svg.clef')).not.toBeNull();
  });

  it("ignores a parent measure's key signature", () => {
    const pitched = renderInMeasure(MUSIC_STAFF, '').staff;
    expect(keySignatureGlyphCount(pitched)).toBeGreaterThan(0);

    const { staff } = renderInMeasure(MUSIC_STAFF_PERCUSSION, '');
    expect(staff.effectiveKeySignature).toEqual({ keySig: 'C', mode: 'major' });
    expect(keySignatureGlyphCount(staff)).toBe(0);
  });

  it('shows no accidental for a sharp or flat spelling', () => {
    const note = `<${MUSIC_NOTE} note="F#" octave="5" duration="quarter"></${MUSIC_NOTE}>`;
    const pitched = renderInMeasure(MUSIC_STAFF, note, 'C')
      .children[0] as NoteElementType;
    expect(pitched.showAccidental).toBe('sharp');

    const [unpitched] = renderInMeasure(MUSIC_STAFF_PERCUSSION, note, 'C')
      .children as NoteElementType[];
    expect(unpitched.showAccidental).toBeNull();
  });

  it('places an instrument note at its drum-key position', () => {
    const {
      staff,
      children: [snare, hiHat],
    } = renderInMeasure(
      MUSIC_STAFF_PERCUSSION,
      `<${MUSIC_NOTE} instrument="snare" duration="quarter"></${MUSIC_NOTE}>` +
        `<${MUSIC_NOTE} instrument="hi-hat" duration="quarter"></${MUSIC_NOTE}>`
    ) as unknown as { staff: StaffLike; children: NoteElementType[] };
    expect(snare.staffY).toBe(staff.noteToYCoordinate('C', 5));
    expect(hiHat.staffY).toBe(staff.noteToYCoordinate('G', 5));
    expect(hiHat.notehead).toBe('x');
  });

  it("gives a chord tone its instrument's notehead", () => {
    const {
      children: [chord],
    } = renderInMeasure(
      MUSIC_STAFF_PERCUSSION,
      `<${MUSIC_CHORD} duration="quarter">` +
        `<${MUSIC_NOTE} instrument="hi-hat"></${MUSIC_NOTE}>` +
        `<${MUSIC_NOTE} instrument="kick"></${MUSIC_NOTE}>` +
        `</${MUSIC_CHORD}>`
    );
    expect((chord as ChordElementType).toneNoteheads).toEqual(['x', 'normal']);
  });

  it('ignores and hides a <music-clef> change', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const {
      children: [, clef],
    } = renderInMeasure(
      MUSIC_STAFF_PERCUSSION,
      `<${MUSIC_NOTE} instrument="snare" duration="half"></${MUSIC_NOTE}>` +
        `<${MUSIC_CLEF} clef="bass"></${MUSIC_CLEF}>` +
        `<${MUSIC_NOTE} instrument="snare" duration="half"></${MUSIC_NOTE}>`
    );
    expect((clef as HTMLElement).style.display).toBe('none');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('<music-clef> is ignored')
    );
  });

  describe('trills', () => {
    const resolvedTrillPitch = (staffTag: string, content: string) =>
      (
        renderInMeasure(staffTag, content, 'C').children[0] as
          | NoteElementType
          | ChordElementType
      ).resolvedTrillPitch;

    it('hides a trill-accidental override', () => {
      const note = `<${MUSIC_NOTE} instrument="snare" duration="quarter" trill trill-accidental="sharp"></${MUSIC_NOTE}>`;
      expect(resolvedTrillPitch(MUSIC_STAFF, note)?.accidental).toBe('sharp');
      expect(
        resolvedTrillPitch(MUSIC_STAFF_PERCUSSION, note)?.accidental
      ).toBeNull();
    });

    it('keeps a written trill-note but hides its accidental', () => {
      const note = `<${MUSIC_NOTE} instrument="snare" duration="quarter" trill trill-note="F#"></${MUSIC_NOTE}>`;
      expect(resolvedTrillPitch(MUSIC_STAFF, note)?.accidental).toBe('sharp');
      expect(resolvedTrillPitch(MUSIC_STAFF_PERCUSSION, note)).toMatchObject({
        letter: 'F',
        written: true,
        accidental: null,
      });
    });

    it("hides a chord's trill-accidental override", () => {
      const chord =
        `<${MUSIC_CHORD} duration="quarter" trill trill-accidental="flat">` +
        `<${MUSIC_NOTE} instrument="snare"></${MUSIC_NOTE}>` +
        `<${MUSIC_NOTE} instrument="kick"></${MUSIC_NOTE}>` +
        `</${MUSIC_CHORD}>`;
      expect(resolvedTrillPitch(MUSIC_STAFF, chord)?.accidental).toBe('flat');
      expect(
        resolvedTrillPitch(MUSIC_STAFF_PERCUSSION, chord)?.accidental
      ).toBeNull();
    });
  });
});
