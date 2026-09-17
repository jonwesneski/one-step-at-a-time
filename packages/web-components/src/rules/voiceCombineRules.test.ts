/**
 * @jest-environment jsdom
 */
import '../chord/index';
import '../note/index';
import { ChordElementType, NoteElementType } from '../types/elements';
import { MUSIC_CHORD, MUSIC_NOTE } from '../utils/consts';
import { detectCombinableGroups, VoiceCombineInput } from './voiceCombineRules';

afterEach(() => {
  document.body.innerHTML = '';
});

function note(
  pitch: string,
  octave: number,
  duration = 'quarter'
): NoteElementType {
  const el = document.createElement(MUSIC_NOTE) as NoteElementType;
  el.setAttribute('note', pitch);
  el.setAttribute('octave', `${octave}`);
  el.setAttribute('duration', duration);
  document.body.appendChild(el);
  return el;
}

function chord(
  tones: [string, number][],
  duration = 'quarter'
): ChordElementType {
  const el = document.createElement(MUSIC_CHORD) as ChordElementType;
  el.setAttribute('duration', duration);
  for (const [pitch, octave] of tones) {
    el.appendChild(note(pitch, octave));
  }
  document.body.appendChild(el);
  return el;
}

function voiceInput(
  elements: (NoteElementType | ChordElementType)[],
  beatOffsets: number[]
): VoiceCombineInput {
  return {
    elements: elements as never,
    beatOffsets,
    tupletsByIndex: new Map(),
    arpeggioRunIndices: new Set(),
    arpeggioTargetIndices: new Set(),
  };
}

describe('detectCombinableGroups', () => {
  it('combines two notes at the same beat offset with matching duration/no markings', () => {
    const v1Note = note('C', 4);
    const v2Note = note('E', 4);
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([v1Note], [0])],
        [2, voiceInput([v2Note], [0])],
      ])
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].members).toHaveLength(2);
    expect(groups[0].tones.map((t) => t.value).sort()).toEqual(['C', 'E']);
  });

  it('does not combine when durations differ', () => {
    const v1Note = note('C', 4, 'quarter');
    const v2Note = note('E', 4, 'eighth');
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([v1Note], [0])],
        [2, voiceInput([v2Note], [0])],
      ])
    );
    expect(groups).toHaveLength(0);
  });

  it('does not combine when beat offsets differ', () => {
    const v1Note = note('C', 4);
    const v2Note = note('E', 4);
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([v1Note], [0])],
        [2, voiceInput([v2Note], [0.25])],
      ])
    );
    expect(groups).toHaveLength(0);
  });

  it('excludes a tied note from combining, even if otherwise identical', () => {
    const v1Note = note('C', 4);
    const v2Note = note('E', 4);
    v2Note.setAttribute('tie', 'start');
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([v1Note], [0])],
        [2, voiceInput([v2Note], [0])],
      ])
    );
    expect(groups).toHaveLength(0);
  });

  it('excludes a slurred note from combining', () => {
    const v1Note = note('C', 4);
    const v2Note = note('E', 4);
    v2Note.setAttribute('slur', 'start');
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([v1Note], [0])],
        [2, voiceInput([v2Note], [0])],
      ])
    );
    expect(groups).toHaveLength(0);
  });

  it('excludes a trilled note from combining', () => {
    const v1Note = note('C', 4);
    const v2Note = note('E', 4);
    v2Note.trill = true;
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([v1Note], [0])],
        [2, voiceInput([v2Note], [0])],
      ])
    );
    expect(groups).toHaveLength(0);
  });

  it('excludes a note inside a tuplet from combining', () => {
    const v1Note = note('C', 4);
    const v2Note = note('E', 4);
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([v1Note], [0])],
        [
          2,
          {
            ...voiceInput([v2Note], [0]),
            tupletsByIndex: new Map([[0, []]]),
          },
        ],
      ])
    );
    expect(groups).toHaveLength(0);
  });

  it('never combines rests', () => {
    const rest = document.createElement('music-rest') as never;
    (rest as HTMLElement).setAttribute('duration', 'quarter');
    document.body.appendChild(rest as HTMLElement);
    const v2Note = note('E', 4);
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([rest], [0])],
        [2, voiceInput([v2Note], [0])],
      ])
    );
    expect(groups).toHaveLength(0);
  });

  it('combines a chord + a note into one bigger chord (tone-set union, deduplicated)', () => {
    const v1Chord = chord([
      ['C', 4],
      ['E', 4],
    ]);
    const v2Note = note('E', 4); // duplicate pitch — should not double up
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([v1Chord], [0])],
        [2, voiceInput([v2Note], [0])],
      ])
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].tones).toHaveLength(2); // C4, E4 — deduplicated
  });

  it('combines 2 of 3 voices while the 3rd stays independent', () => {
    const v1Note = note('C', 4);
    const v2Note = note('E', 4);
    const v3Note = note('G', 4, 'eighth'); // different duration — doesn't match
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([v1Note], [0])],
        [2, voiceInput([v2Note], [0])],
        [3, voiceInput([v3Note], [0])],
      ])
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].members.map((m) => m.voiceNumber).sort()).toEqual([1, 2]);
  });

  it('does not combine differing articulation', () => {
    const v1Note = note('C', 4);
    const v2Note = note('E', 4);
    v2Note.setAttribute('articulation', 'staccato');
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([v1Note], [0])],
        [2, voiceInput([v2Note], [0])],
      ])
    );
    expect(groups).toHaveLength(0);
  });

  it('combines matching dynamic markings', () => {
    const v1Note = note('C', 4);
    const v2Note = note('E', 4);
    v1Note.setAttribute('dynamic', 'mf');
    v2Note.setAttribute('dynamic', 'mf');
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([v1Note], [0])],
        [2, voiceInput([v2Note], [0])],
      ])
    );
    expect(groups).toHaveLength(1);
  });
});
