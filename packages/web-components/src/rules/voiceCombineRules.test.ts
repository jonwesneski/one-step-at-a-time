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

  it('excludes a glissando-anchored note from combining, since the synthetic chord would drop the anchor', () => {
    const v1Note = note('C', 4);
    const v2Note = note('E', 4);
    v2Note.setAttribute('glissando', 'start');
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([v1Note], [0])],
        [2, voiceInput([v2Note], [0])],
      ])
    );
    expect(groups).toHaveLength(0);
  });

  it('excludes a stressed note from combining, since the synthetic chord would drop the stress mark', () => {
    const v1Note = note('C', 4);
    const v2Note = note('E', 4);
    v2Note.setAttribute('stress', 'stressed');
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([v1Note], [0])],
        [2, voiceInput([v2Note], [0])],
      ])
    );
    expect(groups).toHaveLength(0);
  });

  it('excludes a dynamic-shared note from combining, since the synthetic chord would make it local again', () => {
    const v1Note = note('C', 4);
    const v2Note = note('E', 4);
    v2Note.setAttribute('dynamic', 'mf');
    v2Note.setAttribute('dynamic-shared', '');
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([v1Note], [0])],
        [2, voiceInput([v2Note], [0])],
      ])
    );
    expect(groups).toHaveLength(0);
  });

  it('returns groups in ascending beatOffset order, even when a shared voice-2/3 beat is absent from voice 1', () => {
    // Voice 1 has candidates at beats 0 and 1. Voices 2 and 3 both also
    // share a candidate at beat 0.5, a beat voice 1 lacks — discovery order
    // (all of voice 1, then voice 2, then voice 3) would otherwise append
    // the beat-0.5 column after the beat-1 column.
    const v1BeatZero = note('C', 4);
    const v1BeatOne = note('C', 5);
    const v2BeatZero = note('E', 4);
    const v2BeatHalf = note('G', 4);
    const v3BeatHalf = note('G', 4);
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([v1BeatZero, v1BeatOne], [0, 1])],
        [2, voiceInput([v2BeatZero, v2BeatHalf], [0, 0.5])],
        [3, voiceInput([v3BeatHalf], [0.5])],
      ])
    );
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.beatOffset)).toEqual([0, 0.5]);
  });
});
