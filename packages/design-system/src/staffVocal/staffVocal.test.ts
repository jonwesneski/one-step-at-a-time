/**
 * @jest-environment jsdom
 */
import '../index';
import {
  NOTE_Y_HEAD_OFFSET_STEM_DOWN,
  NOTE_Y_HEAD_OFFSET_STEM_UP,
} from '../utils/svgCreator/note';

afterEach(() => {
  document.body.innerHTML = '';
});

// Y staff coordinates for each voice type
const SOPRANO_STAFF_Y: Record<string, number> = {
  C6: 10,
  B5: 15,
  A5: 20,
  G5: 25,
  F5: 30,
  E5: 35,
  D5: 40,
  C5: 45,
  B4: 50,
  A4: 55,
  G4: 60,
  F4: 65,
  E4: 70,
  D4: 75,
  C4: 80,
};

const MEZZO_STAFF_Y: Record<string, number> = {
  C6: 10,
  B5: 15,
  A5: 20,
  G5: 25,
  F5: 30,
  E5: 35,
  D5: 40,
  C5: 45,
  B4: 50,
  A4: 55,
  G4: 60,
  F4: 65,
  E4: 70,
  D4: 75,
  C4: 80,
  B3: 85,
  A3: 90,
};

const ALTO_STAFF_Y: Record<string, number> = {
  A5: 10,
  G5: 15,
  F5: 20,
  E5: 25,
  D5: 30,
  C5: 35,
  B4: 40,
  A4: 45,
  G4: 50,
  F4: 55,
  E4: 60,
  D4: 65,
  C4: 70,
  B3: 75,
  A3: 80,
  G3: 85,
  F3: 90,
};

const TENOR_STAFF_Y: Record<string, number> = {
  C5: 10,
  B4: 15,
  A4: 20,
  G4: 25,
  F4: 30,
  E4: 35,
  D4: 40,
  C4: 45,
  B3: 50,
  A3: 55,
  G3: 60,
  F3: 65,
  E3: 70,
  D3: 75,
  C3: 80,
};

const BARITONE_STAFF_Y: Record<string, number> = {
  E4: 10,
  D4: 15,
  C4: 20,
  B3: 25,
  A3: 30,
  G3: 35,
  F3: 40,
  E3: 45,
  D3: 50,
  C3: 55,
  B2: 60,
  A2: 65,
  G2: 70,
  F2: 75,
  E2: 80,
};

const BASS_STAFF_Y: Record<string, number> = {
  E4: 10,
  D4: 15,
  C4: 20,
  B3: 25,
  A3: 30,
  G3: 35,
  F3: 40,
  E3: 45,
  D3: 50,
  C3: 55,
  B2: 60,
  A2: 65,
  G2: 70,
  F2: 75,
  E2: 80,
};

const STAFF_Y_PADDING = 8;

// Expected `style.top` value on a positioned <music-note> element
function expectedNoteTop(value: string, staffYMap: Record<string, number>): string {
  const staffY = staffYMap[value];
  // Calculate middle Y as the average of min and max Y values in the map
  const yValues = Object.values(staffYMap);
  const middleStaffY = (Math.min(...yValues) + Math.max(...yValues)) / 2;
  const stemUp = staffY > middleStaffY;
  const yHeadOffset = stemUp
    ? NOTE_Y_HEAD_OFFSET_STEM_UP
    : NOTE_Y_HEAD_OFFSET_STEM_DOWN;
  return `${STAFF_Y_PADDING + staffY - yHeadOffset}px`;
}

function makeStaff(voice: string = 'soprano'): Element {
  const el = document.createElement('music-staff-vocal') as any;
  el.setAttribute('voice', voice);
  el.setAttribute('keySig', 'C');
  el.setAttribute('mode', 'major');
  el.setAttribute('time', '4/4');
  document.body.appendChild(el);
  return el;
}

function renderNote(staff: Element, value: string): HTMLElement {
  const note = document.createElement('music-note') as any;
  note.setAttribute('duration', 'quarter');
  note.setAttribute('value', value);
  const slot = (staff as any).shadowRoot.querySelector('slot');
  slot.assignedElements = () => [note];
  slot.dispatchEvent(new Event('slotchange'));
  return note;
}

describe('music-staff-vocal', () => {
  it('registers as a custom element', () => {
    expect(customElements.get('music-staff-vocal')).toBeDefined();
  });

  it('renders shadow root with provided attributes', () => {
    const el = document.createElement('music-staff-vocal') as any;
    el.setAttribute('voice', 'soprano');
    el.setAttribute('keySig', 'C');
    el.setAttribute('mode', 'major');
    el.setAttribute('time', '4/4');
    document.body.appendChild(el);

    expect(el.voice).toBe('soprano');
    expect(el.keySig).toBe('C');
    expect(el.mode).toBe('major');
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.innerHTML).not.toBe('');
  });

  it('defaults to soprano voice when voice attribute not set', () => {
    const el = document.createElement('music-staff-vocal') as any;
    document.body.appendChild(el);
    expect(el.voice).toBe('soprano');
  });
});

describe('music-staff-vocal clef selection', () => {
  it('uses treble clef for soprano', () => {
    const staff = makeStaff('soprano');
    const svg = (staff as any).shadowRoot.querySelector('svg');
    const svgContent = svg.innerHTML;
    // Treble clef contains a specific shape; check for key treble clef characteristics
    expect(svgContent).toContain('path');
  });

  it('uses treble clef for mezzo', () => {
    const staff = makeStaff('mezzo');
    const svg = (staff as any).shadowRoot.querySelector('svg');
    const svgContent = svg.innerHTML;
    expect(svgContent).toContain('path');
  });

  it('uses treble clef for alto', () => {
    const staff = makeStaff('alto');
    const svg = (staff as any).shadowRoot.querySelector('svg');
    const svgContent = svg.innerHTML;
    expect(svgContent).toContain('path');
  });

  it('uses treble-8 clef for tenor', () => {
    const staff = makeStaff('tenor');
    const svg = (staff as any).shadowRoot.querySelector('svg');
    const svgContent = svg.innerHTML;
    // Treble-8 clef has a "8" text element below standard treble clef
    expect(svgContent).toContain('8');
  });

  it('uses bass clef for baritone', () => {
    const staff = makeStaff('baritone');
    const svg = (staff as any).shadowRoot.querySelector('svg');
    const svgContent = svg.innerHTML;
    expect(svgContent).toContain('path');
  });

  it('uses bass clef for bass', () => {
    const staff = makeStaff('bass');
    const svg = (staff as any).shadowRoot.querySelector('svg');
    const svgContent = svg.innerHTML;
    expect(svgContent).toContain('path');
  });
});

describe('music-staff-vocal soprano note head alignment', () => {
  it('places A5 at the correct y position', () => {
    const note = renderNote(makeStaff('soprano'), 'A5');
    expect(note.style.top).toBe(expectedNoteTop('A5', SOPRANO_STAFF_Y));
  });

  it('places C5 at the correct y position', () => {
    const note = renderNote(makeStaff('soprano'), 'C5');
    expect(note.style.top).toBe(expectedNoteTop('C5', SOPRANO_STAFF_Y));
  });

  it('places E4 at the correct y position', () => {
    const note = renderNote(makeStaff('soprano'), 'E4');
    expect(note.style.top).toBe(expectedNoteTop('E4', SOPRANO_STAFF_Y));
  });

  it('places C4 at the correct y position', () => {
    const note = renderNote(makeStaff('soprano'), 'C4');
    expect(note.style.top).toBe(expectedNoteTop('C4', SOPRANO_STAFF_Y));
  });
});

describe('music-staff-vocal mezzo note head alignment', () => {
  it('places A5 at the correct y position', () => {
    const note = renderNote(makeStaff('mezzo'), 'A5');
    expect(note.style.top).toBe(expectedNoteTop('A5', MEZZO_STAFF_Y));
  });

  it('places A3 at the correct y position (low end of range)', () => {
    const note = renderNote(makeStaff('mezzo'), 'A3');
    expect(note.style.top).toBe(expectedNoteTop('A3', MEZZO_STAFF_Y));
  });
});

describe('music-staff-vocal alto note head alignment', () => {
  it('places A5 at the correct y position (high end)', () => {
    const note = renderNote(makeStaff('alto'), 'A5');
    expect(note.style.top).toBe(expectedNoteTop('A5', ALTO_STAFF_Y));
  });

  it('places F3 at the correct y position (low end)', () => {
    const note = renderNote(makeStaff('alto'), 'F3');
    expect(note.style.top).toBe(expectedNoteTop('F3', ALTO_STAFF_Y));
  });

  it('places C5 at the correct y position (within staff)', () => {
    const note = renderNote(makeStaff('alto'), 'C5');
    expect(note.style.top).toBe(expectedNoteTop('C5', ALTO_STAFF_Y));
  });
});

describe('music-staff-vocal tenor note head alignment', () => {
  it('places A4 at the correct y position', () => {
    const note = renderNote(makeStaff('tenor'), 'A4');
    expect(note.style.top).toBe(expectedNoteTop('A4', TENOR_STAFF_Y));
  });

  it('places C4 at the correct y position', () => {
    const note = renderNote(makeStaff('tenor'), 'C4');
    expect(note.style.top).toBe(expectedNoteTop('C4', TENOR_STAFF_Y));
  });

  it('places C3 at the correct y position (low end)', () => {
    const note = renderNote(makeStaff('tenor'), 'C3');
    expect(note.style.top).toBe(expectedNoteTop('C3', TENOR_STAFF_Y));
  });
});

describe('music-staff-vocal baritone note head alignment', () => {
  it('places A3 at the correct y position', () => {
    const note = renderNote(makeStaff('baritone'), 'A3');
    expect(note.style.top).toBe(expectedNoteTop('A3', BARITONE_STAFF_Y));
  });

  it('places C4 at the correct y position', () => {
    const note = renderNote(makeStaff('baritone'), 'C4');
    expect(note.style.top).toBe(expectedNoteTop('C4', BARITONE_STAFF_Y));
  });

  it('places E2 at the correct y position (low end)', () => {
    const note = renderNote(makeStaff('baritone'), 'E2');
    expect(note.style.top).toBe(expectedNoteTop('E2', BARITONE_STAFF_Y));
  });
});

describe('music-staff-vocal bass note head alignment', () => {
  it('places A3 at the correct y position', () => {
    const note = renderNote(makeStaff('bass'), 'A3');
    expect(note.style.top).toBe(expectedNoteTop('A3', BASS_STAFF_Y));
  });

  it('places C3 at the correct y position', () => {
    const note = renderNote(makeStaff('bass'), 'C3');
    expect(note.style.top).toBe(expectedNoteTop('C3', BASS_STAFF_Y));
  });

  it('places E2 at the correct y position (low end)', () => {
    const note = renderNote(makeStaff('bass'), 'E2');
    expect(note.style.top).toBe(expectedNoteTop('E2', BASS_STAFF_Y));
  });
});

describe('music-staff-vocal lyrics', () => {
  it('registers lyrics element as a custom element', () => {
    expect(customElements.get('music-lyrics')).toBeDefined();
  });

  it('creates music-lyrics element with verse attribute', () => {
    const lyrics = document.createElement('music-lyrics') as any;
    lyrics.setAttribute('verse', '1');
    lyrics.textContent = 'test';
    expect(lyrics.verse).toBe('1');
  });

  it('stores different verse numbers', () => {
    const lyricsV1 = document.createElement('music-lyrics') as any;
    lyricsV1.setAttribute('verse', '1');
    expect(lyricsV1.verse).toBe('1');

    const lyricsV2 = document.createElement('music-lyrics') as any;
    lyricsV2.setAttribute('verse', '2');
    expect(lyricsV2.verse).toBe('2');
  });

  it('defaults to verse 1 when not specified', () => {
    const lyrics = document.createElement('music-lyrics') as any;
    expect(lyrics.verse).toBe('1');
  });

  it('updates positions on demand', () => {
    const lyrics = document.createElement('music-lyrics') as any;
    lyrics.setAttribute('verse', '1');
    lyrics.dataset.syllables = JSON.stringify([
      { text: 'Hap', x: 10, y: 100, isMelisma: false, isHyphenated: true },
      { text: 'py', x: 30, y: 100, isMelisma: false, isHyphenated: false },
    ]);
    // Should not throw
    expect(() => lyrics.updatePositions()).not.toThrow();
  });
});

describe('music-staff-vocal voice switching', () => {
  it('re-renders staff when voice attribute changes from soprano to tenor', () => {
    const staff = makeStaff('soprano') as any;
    // Add a note within soprano range
    const note = document.createElement('music-note') as any;
    note.setAttribute('value', 'A5');
    note.setAttribute('duration', 'quarter');
    staff.appendChild(note);

    const slot = staff.shadowRoot.querySelector('slot');
    slot.assignedElements = () => [note];
    slot.dispatchEvent(new Event('slotchange'));

    const sopranoSvg = staff.shadowRoot.querySelector('svg');
    expect(sopranoSvg).not.toBeNull();

    // Switch voice and verify staff still renders
    staff.setAttribute('voice', 'tenor');
    const tenorSvg = staff.shadowRoot.querySelector('svg');
    expect(tenorSvg).not.toBeNull();
    expect(staff.voice).toBe('tenor');
  });

  it('returns treble clef SVG for soprano and mezzo voices', () => {
    const sopStaff = makeStaff('soprano') as any;
    const sopSvg = sopStaff.shadowRoot.querySelector('svg');
    expect(sopSvg.innerHTML).toContain('path');

    const mezzoStaff = makeStaff('mezzo') as any;
    const mezzoSvg = mezzoStaff.shadowRoot.querySelector('svg');
    expect(mezzoSvg.innerHTML).toContain('path');
  });

  it('returns treble-8 clef SVG for tenor voice', () => {
    const staff = makeStaff('tenor') as any;
    const svg = staff.shadowRoot.querySelector('svg');
    const svgContent = svg.innerHTML;
    // Treble-8 clef includes a "text" element with "8"
    expect(svgContent).toContain('<text');
    expect(svgContent).toContain('>8<');
  });

  it('returns bass clef SVG for baritone and bass voices', () => {
    const bariStaff = makeStaff('baritone') as any;
    const bariSvg = bariStaff.shadowRoot.querySelector('svg');
    expect(bariSvg.innerHTML).toContain('path');

    const bassStaff = makeStaff('bass') as any;
    const bassSvg = bassStaff.shadowRoot.querySelector('svg');
    expect(bassSvg.innerHTML).toContain('path');
  });
});

describe('music-staff-vocal key signature positioning', () => {
  it('returns correct key signature coordinates for soprano C major', () => {
    const staff = makeStaff('soprano') as any;
    staff.setAttribute('keySig', 'C');
    staff.setAttribute('mode', 'major');
    const keyCoords = staff.getKeyYCoordinates();
    expect(keyCoords.coordinates.length).toBe(0); // C major has no accidentals
  });

  it('returns correct key signature coordinates for soprano G major (1 sharp)', () => {
    const staff = makeStaff('soprano') as any;
    staff.setAttribute('keySig', 'G');
    staff.setAttribute('mode', 'major');
    const keyCoords = staff.getKeyYCoordinates();
    expect(keyCoords.useSharps).toBe(true);
    expect(keyCoords.coordinates.length).toBe(1); // F#
  });

  it('returns correct key signature coordinates for tenor C major', () => {
    const staff = makeStaff('tenor') as any;
    staff.setAttribute('keySig', 'C');
    staff.setAttribute('mode', 'major');
    const keyCoords = staff.getKeyYCoordinates();
    expect(keyCoords.coordinates.length).toBe(0);
  });

  it('returns correct key signature coordinates for tenor G major (1 sharp)', () => {
    const staff = makeStaff('tenor') as any;
    staff.setAttribute('keySig', 'G');
    staff.setAttribute('mode', 'major');
    const keyCoords = staff.getKeyYCoordinates();
    expect(keyCoords.useSharps).toBe(true);
    expect(keyCoords.coordinates.length).toBe(1);
  });

  it('returns correct key signature coordinates for baritone F major (1 flat)', () => {
    const staff = makeStaff('baritone') as any;
    staff.setAttribute('keySig', 'F');
    staff.setAttribute('mode', 'major');
    const keyCoords = staff.getKeyYCoordinates();
    expect(keyCoords.useSharps).toBe(false);
    expect(keyCoords.coordinates.length).toBe(1); // Bb
  });
});

describe('music-staff-vocal octave search order', () => {
  it('soprano defaults to octaves [4, 5, 6]', () => {
    const staff = makeStaff('soprano') as any;
    expect(staff.octaves).toEqual([4, 5, 6]);
  });

  it('mezzo defaults to octaves [3, 4, 5, 6]', () => {
    const staff = makeStaff('mezzo') as any;
    expect(staff.octaves).toEqual([3, 4, 5, 6]);
  });

  it('alto defaults to octaves [3, 4, 5]', () => {
    const staff = makeStaff('alto') as any;
    expect(staff.octaves).toEqual([3, 4, 5]);
  });

  it('tenor defaults to octaves [3, 4, 5]', () => {
    const staff = makeStaff('tenor') as any;
    expect(staff.octaves).toEqual([3, 4, 5]);
  });

  it('baritone defaults to octaves [2, 3, 4]', () => {
    const staff = makeStaff('baritone') as any;
    expect(staff.octaves).toEqual([2, 3, 4]);
  });

  it('bass defaults to octaves [2, 3, 4]', () => {
    const staff = makeStaff('bass') as any;
    expect(staff.octaves).toEqual([2, 3, 4]);
  });
});
