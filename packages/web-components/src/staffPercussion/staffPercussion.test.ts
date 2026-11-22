/**
 * @jest-environment jsdom
 */
import '../index';
import type {
  ChordElementType,
  DrumNoteElementType,
  NoteElementType,
} from '../types/elements';
import {
  MUSIC_CHORD,
  MUSIC_CLEF,
  MUSIC_DRUM_CHORD,
  MUSIC_DRUM_NOTE,
  MUSIC_MEASURE,
  MUSIC_NOTE,
  MUSIC_STAFF,
  MUSIC_STAFF_PERCUSSION,
  MUSIC_VOICE,
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

const drumNote = (instrument: string, duration = 'quarter'): string =>
  `<${MUSIC_DRUM_NOTE} instrument="${instrument}" duration="${duration}"></${MUSIC_DRUM_NOTE}>`;

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

  it('places a drum note at its drum-key position', () => {
    const {
      staff,
      children: [snare, hiHat],
    } = renderInMeasure(
      MUSIC_STAFF_PERCUSSION,
      drumNote('snare') + drumNote('hi-hat')
    );
    expect((snare as DrumNoteElementType).staffY).toBe(
      staff.noteToYCoordinate('C', 5)
    );
    expect((hiHat as DrumNoteElementType).staffY).toBe(
      staff.noteToYCoordinate('G', 5)
    );
  });

  it("gives a drum chord's tones their instruments' noteheads", () => {
    const {
      children: [chord],
    } = renderInMeasure(
      MUSIC_STAFF_PERCUSSION,
      `<${MUSIC_DRUM_CHORD} duration="quarter">` +
        `<${MUSIC_DRUM_NOTE} instrument="hi-hat"></${MUSIC_DRUM_NOTE}>` +
        `<${MUSIC_DRUM_NOTE} instrument="kick"></${MUSIC_DRUM_NOTE}>` +
        `</${MUSIC_DRUM_CHORD}>`
    );
    expect((chord as ChordElementType).toneNoteheads).toEqual(['x', 'normal']);
  });

  it('hides <music-note> and <music-chord>, with a warning', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const {
      children: [drum, note, chord],
    } = renderInMeasure(
      MUSIC_STAFF_PERCUSSION,
      drumNote('snare') +
        `<${MUSIC_NOTE} note="F" octave="4" duration="quarter"></${MUSIC_NOTE}>` +
        `<${MUSIC_CHORD} chord="C" duration="half"></${MUSIC_CHORD}>`
    );
    expect((drum as HTMLElement).style.display).not.toBe('none');
    expect((note as HTMLElement).style.display).toBe('none');
    expect((chord as HTMLElement).style.display).toBe('none');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('ignoring 2 element(s)')
    );
  });

  it('keeps hands and feet on separate stems when their rhythms match', () => {
    const twoVoices = (hands: string, feet: string): string =>
      `<${MUSIC_VOICE}>${hands.repeat(4)}</${MUSIC_VOICE}>` +
      `<${MUSIC_VOICE}>${feet.repeat(4)}</${MUSIC_VOICE}>`;

    const pitched = renderInMeasure(
      MUSIC_STAFF,
      twoVoices(
        `<${MUSIC_NOTE} note="C" octave="5" duration="quarter"></${MUSIC_NOTE}>`,
        `<${MUSIC_NOTE} note="F" octave="4" duration="quarter"></${MUSIC_NOTE}>`
      ),
      'C'
    ).staff;
    expect(pitched.shadowRoot!.querySelector(MUSIC_CHORD)).not.toBeNull();

    const { staff, children } = renderInMeasure(
      MUSIC_STAFF_PERCUSSION,
      twoVoices(drumNote('snare'), drumNote('kick'))
    );
    expect(staff.shadowRoot!.querySelector(MUSIC_CHORD)).toBeNull();
    const [hands, feet] = children.map(
      (voice) => voice.firstElementChild as NoteElementType
    );
    expect(hands.stemUp).toBe(true);
    expect(feet.stemUp).toBe(false);
  });

  it('ignores and hides a <music-clef> change', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const {
      children: [, clef],
    } = renderInMeasure(
      MUSIC_STAFF_PERCUSSION,
      drumNote('snare', 'half') +
        `<${MUSIC_CLEF} clef="bass"></${MUSIC_CLEF}>` +
        drumNote('snare', 'half')
    );
    expect((clef as HTMLElement).style.display).toBe('none');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('<music-clef> is ignored')
    );
  });
});

describe(`${MUSIC_STAFF} with drum elements`, () => {
  it('hides <music-drum-note> and <music-drum-chord>, with a warning', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const {
      children: [note, drum, drumChord],
    } = renderInMeasure(
      MUSIC_STAFF,
      `<${MUSIC_NOTE} note="F" octave="4" duration="quarter"></${MUSIC_NOTE}>` +
        drumNote('snare') +
        `<${MUSIC_DRUM_CHORD} duration="half"><${MUSIC_DRUM_NOTE} instrument="kick"></${MUSIC_DRUM_NOTE}></${MUSIC_DRUM_CHORD}>`,
      'C'
    );
    expect((note as HTMLElement).style.display).not.toBe('none');
    expect((drum as HTMLElement).style.display).toBe('none');
    expect((drumChord as HTMLElement).style.display).toBe('none');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('a pitched staff takes no <music-drum-note>')
    );
  });
});
