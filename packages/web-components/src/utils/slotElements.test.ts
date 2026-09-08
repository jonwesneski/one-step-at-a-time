/**
 * @jest-environment jsdom
 */
import {
  MUSIC_ARPEGGIO,
  MUSIC_CHORD,
  MUSIC_NOTE,
  MUSIC_TUPLET,
} from './consts';
import { flattenSlotElements } from './slotElements';

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
