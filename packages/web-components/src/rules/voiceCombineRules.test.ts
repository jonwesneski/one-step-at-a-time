/**
 * @jest-environment jsdom
 */
import '../chord/index';
import '../note/index';
import { ChordElementType, NoteElementType } from '../types/elements';
import { MUSIC_CHORD, MUSIC_NOTE, MUSIC_NOTE_NODE } from '../utils/consts';
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

// A stand-in for the staff's Y lookup: one step per letter, octave 4 when
// none is written.
function staffYsOfTones(element: NoteElementType | ChordElementType): number[] {
  const tones =
    element.nodeName === MUSIC_NOTE_NODE
      ? [
          {
            value: (element as NoteElementType).note,
            octave: (element as NoteElementType).octave,
          },
        ]
      : (element as ChordElementType).notes;
  return tones.map(
    (tone) => -((tone.octave ?? 4) * 7 + 'CDEFGAB'.indexOf(tone.value[0])) * 5
  );
}

function voiceInput(
  elements: (NoteElementType | ChordElementType)[],
  beatOffsets: number[],
  staffYs?: number[][]
): VoiceCombineInput {
  return {
    elements: elements as never,
    beatOffsets,
    tupletsByIndex: new Map(),
    arpeggioRunIndices: new Set(),
    arpeggioTargetIndices: new Set(),
    tremoloMemberIndices: new Set(),
    staffYsOf: (index) => staffYs?.[index] ?? staffYsOfTones(elements[index]),
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

  it('does not combine two voices sounding the same pitch (a unison)', () => {
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([note('G', 4)], [0])],
        [2, voiceInput([note('G', 4)], [0])],
      ])
    );
    expect(groups).toHaveLength(0);
  });

  it('treats the same letter and octave with different accidentals as a unison', () => {
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([note('G', 4)], [0])],
        [2, voiceInput([note('G#', 4)], [0])],
      ])
    );
    expect(groups).toHaveLength(0);
  });

  it('compares resolved staff positions, so a chord tone with no written octave still counts', () => {
    const symbol = document.createElement(MUSIC_CHORD) as ChordElementType;
    symbol.setAttribute('chord', 'C');
    symbol.setAttribute('duration', 'quarter');
    document.body.appendChild(symbol);
    const g4 = note('G', 4);
    const resolved = [staffYsOfTones(note('C', 4))[0], staffYsOfTones(g4)[0]];
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([symbol], [0], [resolved])],
        [2, voiceInput([g4], [0])],
      ])
    );
    expect(groups).toHaveLength(0);
  });

  it('leaves two voices uncombined when a third voice sounds one of their pitches on that beat', () => {
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([note('G', 4)], [0])],
        [2, voiceInput([note('B', 4)], [0])],
        [3, voiceInput([note('G', 4, 'half')], [0])],
      ])
    );
    expect(groups).toHaveLength(0);
  });

  it('counts a third voice that cannot combine itself', () => {
    const tied = note('G', 4);
    tied.setAttribute('tie', 'start');
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([note('G', 4)], [0])],
        [2, voiceInput([note('B', 4)], [0])],
        [3, voiceInput([tied], [0])],
      ])
    );
    expect(groups).toHaveLength(0);
  });

  it('still combines the same letter in different octaves', () => {
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([note('G', 5)], [0])],
        [2, voiceInput([note('G', 4)], [0])],
      ])
    );
    expect(groups).toHaveLength(1);
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

  it('combines a dynamic with its text only when the text matches', () => {
    const marked = (pitch: string, text: string) => {
      const element = note(pitch, 4);
      element.setAttribute('dynamic', 'p');
      element.setAttribute('dynamic-text', text);
      return element;
    };
    const combine = (first: NoteElementType, second: NoteElementType): number =>
      detectCombinableGroups(
        new Map([
          [1, voiceInput([first], [0])],
          [2, voiceInput([second], [0])],
        ])
      ).length;
    expect(combine(marked('C', 'sub.'), marked('E', 'sub.'))).toBe(1);
    expect(combine(marked('C', 'sub.'), marked('E', 'dolce'))).toBe(0);
  });

  it('never combines a note with phonemes', () => {
    const voiced = note('C', 4);
    voiced.setAttribute('phonemes', 'oo');
    expect(
      detectCombinableGroups(
        new Map([
          [1, voiceInput([voiced], [0])],
          [2, voiceInput([note('E', 4)], [0])],
        ])
      )
    ).toHaveLength(0);
  });

  it('combines notes only at one size', () => {
    const cue = note('C', 4);
    cue.setAttribute('size', 'cue');
    const otherCue = note('E', 4);
    otherCue.setAttribute('size', 'cue');
    const combine = (first: NoteElementType, second: NoteElementType) =>
      detectCombinableGroups(
        new Map([
          [1, voiceInput([first], [0])],
          [2, voiceInput([second], [0])],
        ])
      ).length;
    expect(combine(cue, note('E', 4))).toBe(0);
    expect(combine(cue, otherCue)).toBe(1);
  });

  it('never combines a note with a bend contour', () => {
    const contoured = note('C', 4);
    contoured.setAttribute('bend-contour', 'G4');
    expect(
      detectCombinableGroups(
        new Map([
          [1, voiceInput([contoured], [0])],
          [2, voiceInput([note('E', 4)], [0])],
        ])
      )
    ).toHaveLength(0);
  });

  it('combines a swell and dynamic-end only when both match', () => {
    const marked = (pitch: string, swell: string, dynamicEnd: string) => {
      const element = note(pitch, 4);
      element.setAttribute('swell', swell);
      element.setAttribute('dynamic-end', dynamicEnd);
      return element;
    };
    const combine = (first: NoteElementType, second: NoteElementType): number =>
      detectCombinableGroups(
        new Map([
          [1, voiceInput([first], [0])],
          [2, voiceInput([second], [0])],
        ])
      ).length;
    expect(combine(marked('C', '', 'f'), marked('E', 'both', 'f'))).toBe(1);
    expect(combine(marked('C', '', 'f'), marked('E', 'crescendo', 'f'))).toBe(
      0
    );
    expect(combine(marked('C', '', 'f'), marked('E', '', 'p'))).toBe(0);
  });

  it('combines a stem cross only with another, never an unpitched note', () => {
    const crossed = (pitch: string) => {
      const element = note(pitch, 4);
      element.setAttribute('stem-mark', 'cross');
      return element;
    };
    const combine = (first: NoteElementType, second: NoteElementType): number =>
      detectCombinableGroups(
        new Map([
          [1, voiceInput([first], [0])],
          [2, voiceInput([second], [0])],
        ])
      ).length;
    expect(combine(crossed('C'), crossed('E'))).toBe(1);
    expect(combine(crossed('C'), note('E', 4))).toBe(0);
    const unpitched = note('E', 4);
    unpitched.setAttribute('unpitched', '');
    expect(combine(note('C', 4), unpitched)).toBe(0);
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

  it('combines a chord + a note into one bigger chord (tone-set union)', () => {
    const v1Chord = chord([
      ['C', 4],
      ['E', 4],
    ]);
    const v2Note = note('G', 4);
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([v1Chord], [0])],
        [2, voiceInput([v2Note], [0])],
      ])
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].tones).toHaveLength(3);
  });

  it('leaves a chord and a note that share a pitch uncombined (a unison)', () => {
    const v1Chord = chord([
      ['C', 4],
      ['E', 4],
    ]);
    const v2Note = note('E', 4);
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([v1Chord], [0])],
        [2, voiceInput([v2Note], [0])],
      ])
    );
    expect(groups).toHaveLength(0);
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

  it('does not combine differing tremolos', () => {
    const v1Note = note('C', 4);
    const v2Note = note('E', 4);
    v1Note.setAttribute('tremolo', '3');
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([v1Note], [0])],
        [2, voiceInput([v2Note], [0])],
      ])
    );
    expect(groups).toHaveLength(0);
  });

  it('combines matching tremolos, which then share one set of strokes', () => {
    const v1Note = note('C', 4);
    const v2Note = note('E', 4);
    v1Note.setAttribute('tremolo', 'unmeasured');
    v2Note.setAttribute('tremolo', 'unmeasured');
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([v1Note], [0])],
        [2, voiceInput([v2Note], [0])],
      ])
    );
    expect(groups).toHaveLength(1);
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

  it('combines dynamic reminders only with each other', () => {
    const matched = (second: boolean) => {
      const v1Note = note('C', 4);
      const v2Note = note('E', 4);
      v1Note.setAttribute('dynamic', 'mf');
      v2Note.setAttribute('dynamic', 'mf');
      v1Note.setAttribute('dynamic-reminder', '');
      if (second) {
        v2Note.setAttribute('dynamic-reminder', '');
      }
      return detectCombinableGroups(
        new Map([
          [1, voiceInput([v1Note], [0])],
          [2, voiceInput([v2Note], [0])],
        ])
      );
    };
    expect(matched(true)).toHaveLength(1);
    expect(matched(false)).toHaveLength(0);
  });

  it('excludes a note with an accidental reminder, which belongs to one tone', () => {
    const v1Note = note('C', 4);
    const v2Note = note('E', 4);
    v2Note.setAttribute('accidental-reminder', '');
    const groups = detectCombinableGroups(
      new Map([
        [1, voiceInput([v1Note], [0])],
        [2, voiceInput([v2Note], [0])],
      ])
    );
    expect(groups).toHaveLength(0);
  });

  it('excludes a bend, free or to a target, a glissando label and technique text', () => {
    for (const [name, value] of [
      ['bend', 'down'],
      ['bend-to', 'D'],
      ['glissando-label', 'lip'],
      ['technique-text', 'hum'],
    ]) {
      const bent = note('E', 5);
      bent.setAttribute(name, value);
      const groups = detectCombinableGroups(
        new Map([
          [1, voiceInput([bent], [0])],
          [2, voiceInput([note('C', 5)], [0])],
        ])
      );
      expect(groups).toHaveLength(0);
    }
  });

  it('excludes a quarter-tone, on a note or a chord tone', () => {
    const arrowed = note('E', 4);
    arrowed.setAttribute('quarter-tone', 'up');
    const tones = chord([
      ['E', 4],
      ['G', 4],
    ]);
    const combinable = (element: NoteElementType | ChordElementType) =>
      detectCombinableGroups(
        new Map([
          [1, voiceInput([note('C', 4)], [0])],
          [2, voiceInput([element], [0])],
        ])
      ).length;
    expect(combinable(arrowed)).toBe(0);
    expect(combinable(tones)).toBe(1);
    tones.querySelector('music-note')?.setAttribute('quarter-tone', 'down');
    expect(combinable(tones)).toBe(0);
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
    const v3BeatHalf = note('B', 4);
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

describe('detectCombinableGroups with noteheads', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const twoVoices = (
    first: NoteElementType | ChordElementType,
    second: NoteElementType | ChordElementType
  ) =>
    detectCombinableGroups(
      new Map([
        [1, voiceInput([first], [0])],
        [2, voiceInput([second], [0])],
      ])
    );

  const withNotehead = <T extends Element>(element: T, notehead: string): T => {
    element.setAttribute('notehead', notehead);
    return element;
  };

  it.each(['x', 'diamond', 'diamond-white', 'triangle-up', 'triangle-down'])(
    'keeps matching %s notes in their own voices',
    (notehead) => {
      expect(
        twoVoices(
          withNotehead(note('C', 5), notehead),
          withNotehead(note('A', 4), notehead)
        )
      ).toHaveLength(0);
    }
  );

  it('keeps a chord with a non-normal chord notehead out', () => {
    expect(
      twoVoices(
        withNotehead(
          chord([
            ['C', 5],
            ['E', 5],
          ]),
          'x'
        ),
        note('A', 4)
      )
    ).toHaveLength(0);
  });

  it('keeps a chord with a slotted tone override out', () => {
    const overridden = chord([
      ['C', 5],
      ['E', 5],
    ]);
    overridden.querySelectorAll(MUSIC_NOTE)[1].setAttribute('notehead', 'x');
    expect(twoVoices(overridden, note('A', 4))).toHaveLength(0);
  });

  it('still combines normal notes, and a chord whose triangle value falls back to normal', () => {
    expect(twoVoices(note('C', 5), note('A', 4))).toHaveLength(1);
    expect(
      twoVoices(
        withNotehead(
          chord([
            ['C', 5],
            ['E', 5],
          ]),
          'triangle-up'
        ),
        note('A', 4)
      )
    ).toHaveLength(1);
  });
});
