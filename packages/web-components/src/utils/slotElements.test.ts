/**
 * @jest-environment jsdom
 */
import {
  MUSIC_ARPEGGIO,
  MUSIC_CHORD,
  MUSIC_CLEF,
  MUSIC_NOTE,
  MUSIC_REST,
  MUSIC_TUPLET,
  MUSIC_VOICE,
} from './consts';
import { flattenSlotElements, flattenStaffSlotElements } from './slotElements';

function note(pitch: string): HTMLElement {
  const el = document.createElement(MUSIC_NOTE);
  el.setAttribute('note', pitch);
  el.setAttribute('duration', 'eighth');
  return el;
}
function chord(name: string): HTMLElement {
  const el = document.createElement(MUSIC_CHORD);
  el.setAttribute('chord', name);
  el.setAttribute('duration', 'quarter');
  return el;
}
function arpeggio(children: HTMLElement[]): HTMLElement {
  const el = document.createElement(MUSIC_ARPEGGIO);
  el.append(...children);
  return el;
}
function rest(): HTMLElement {
  const el = document.createElement(MUSIC_REST);
  el.setAttribute('duration', 'quarter');
  return el;
}
function voice(children: HTMLElement[]): HTMLElement {
  const el = document.createElement(MUSIC_VOICE);
  el.append(...children);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('flattenSlotElements — arpeggioGroups', () => {
  it('keeps every group child in flatElements, in order', () => {
    const group = arpeggio([note('C'), note('E'), note('G'), chord('Cmaj')]);
    const { flatElements, arpeggioGroups } = flattenSlotElements([
      note('D'),
      group,
      note('F'),
    ]);
    expect(flatElements.map((e) => e.nodeName)).toEqual([
      MUSIC_NOTE.toUpperCase(),
      MUSIC_NOTE.toUpperCase(),
      MUSIC_NOTE.toUpperCase(),
      MUSIC_NOTE.toUpperCase(),
      MUSIC_CHORD.toUpperCase(),
      MUSIC_NOTE.toUpperCase(),
    ]);
    expect(arpeggioGroups[0].runIndices).toEqual([1, 2, 3]);
    expect(arpeggioGroups[0].targetIndex).toBe(4);
  });

  it('indexes the run and target correctly amidst plain notes', () => {
    const group = arpeggio([note('C'), note('E'), chord('Cmaj')]);
    const { flatElements, arpeggioGroups } = flattenSlotElements([
      note('D'),
      group,
      note('F'),
    ]);
    expect(flatElements.length).toBe(5); // D, C, E, chord, F
    expect(arpeggioGroups).toHaveLength(1);
    expect(arpeggioGroups[0].runIndices).toEqual([1, 2]);
    expect(arpeggioGroups[0].targetIndex).toBe(3);
  });

  it('warns and flattens plain when the group has fewer than two note/chord children', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { arpeggioGroups } = flattenSlotElements([arpeggio([note('C')])]);
    expect(arpeggioGroups).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('at least a run note')
    );
    warn.mockRestore();
  });

  it('warns and flattens plain for an arpeggio nested inside a tuplet', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const tuplet = document.createElement(MUSIC_TUPLET);
    tuplet.setAttribute('ratio', '3');
    tuplet.append(arpeggio([note('C'), note('E'), chord('Cmaj')]));
    const { arpeggioGroups, tupletsByIndex } = flattenSlotElements([tuplet]);
    expect(arpeggioGroups).toHaveLength(0);
    expect(tupletsByIndex.size).toBeGreaterThan(0);
    warn.mockRestore();
  });
});

describe('flattenStaffSlotElements', () => {
  it('behaves byte-identical to flattenSlotElements when there are zero <music-voice> siblings', () => {
    const assigned = [note('C'), note('D'), rest()];
    const direct = flattenSlotElements(assigned);
    const { voices, clefMarkers } = flattenStaffSlotElements(assigned);

    expect(voices.size).toBe(1);
    expect(voices.get(1)?.flatElements).toEqual(direct.flatElements);
    expect(clefMarkers).toEqual(direct.clefMarkers);
  });

  it('numbers voices by sibling order among <music-voice> children', () => {
    const v1 = voice([note('C'), note('D')]);
    const v2 = voice([note('E')]);
    const { voices } = flattenStaffSlotElements([v1, v2]);

    expect(voices.size).toBe(2);
    expect(voices.get(1)?.flatElements).toHaveLength(2);
    expect(voices.get(2)?.flatElements).toHaveLength(1);
  });

  it('supports 3 voices', () => {
    const { voices } = flattenStaffSlotElements([
      voice([note('C')]),
      voice([note('D')]),
      voice([note('E')]),
    ]);

    expect(voices.size).toBe(3);
    expect([...voices.keys()]).toEqual([1, 2, 3]);
  });

  it('warns, ignores, and hides a 4th <music-voice> sibling (its descendants would otherwise render unpositioned)', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const fourthVoice = voice([note('F')]) as HTMLElement;
    const { voices } = flattenStaffSlotElements([
      voice([note('C')]),
      voice([note('D')]),
      voice([note('E')]),
      fourthVoice,
    ]);

    expect(voices.size).toBe(3);
    expect(fourthVoice.style.display).toBe('none');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('at most 3 <music-voice> siblings')
    );
    warn.mockRestore();
  });

  it('re-shows a formerly-hidden 4th voice once an earlier voice is removed and it becomes the 3rd', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const v1 = voice([note('C')]) as HTMLElement;
    const v2 = voice([note('D')]) as HTMLElement;
    const v3 = voice([note('E')]) as HTMLElement;
    const v4 = voice([note('F')]) as HTMLElement;

    flattenStaffSlotElements([v1, v2, v3, v4]);
    expect(v4.style.display).toBe('none');

    // v2 removed — v4 is now the 3rd sibling and must become visible again.
    const { voices } = flattenStaffSlotElements([v1, v3, v4]);
    expect(voices.size).toBe(3);
    expect(v4.style.display).toBe('');
    warn.mockRestore();
  });

  it('warns, hides, and discards a bare top-level note alongside <music-voice> siblings, rather than folding it into voice 1', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const bareNote = note('G');
    const { voices } = flattenStaffSlotElements([
      voice([note('C')]),
      voice([note('D')]),
      bareNote,
    ]);

    expect(voices.get(1)?.flatElements).toHaveLength(1);
    expect(voices.get(1)?.flatElements).not.toContain(bareNote);
    expect(bareNote.style.display).toBe('none');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('cannot appear alongside <music-voice> siblings')
    );
    warn.mockRestore();
  });

  it('collects a <music-clef> nested inside the first <music-voice> as the staff-wide marker list, without warning', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const clef = document.createElement(MUSIC_CLEF);
    const { voices, clefMarkers } = flattenStaffSlotElements([
      voice([note('C'), clef, note('D')]),
      voice([note('E')]),
    ]);

    expect(voices.size).toBe(2);
    expect(voices.get(1)?.flatElements).toHaveLength(2);
    expect(clefMarkers).toHaveLength(1);
    expect(clefMarkers[0].element).toBe(clef);
    expect(clefMarkers[0].afterElementIndex).toBe(0);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('warns and hides a <music-clef> nested inside voice 2 or voice 3', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const clef = document.createElement(MUSIC_CLEF) as HTMLElement;
    const { voices, clefMarkers } = flattenStaffSlotElements([
      voice([note('C')]),
      voice([note('D'), clef]),
    ]);

    expect(voices.size).toBe(2);
    expect(clefMarkers).toHaveLength(0);
    expect(clef.style.display).toBe('none');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        '<music-clef> is only supported inside the first <music-voice>'
      )
    );
    warn.mockRestore();
  });

  it('warns and hides a bare top-level <music-clef> sibling alongside <music-voice> siblings', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const clef = document.createElement(MUSIC_CLEF) as HTMLElement;
    const { voices, clefMarkers } = flattenStaffSlotElements([
      voice([note('C')]),
      clef,
      voice([note('D')]),
    ]);

    expect(voices.size).toBe(2);
    expect(clefMarkers).toHaveLength(0);
    expect(clef.style.display).toBe('none');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('nest it inside the first <music-voice>')
    );
    warn.mockRestore();
  });
});
