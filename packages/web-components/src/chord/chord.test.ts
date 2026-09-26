/**
 * @jest-environment jsdom
 */
import '../note/index';
import '../staff/index';
import type { ChordElementType, NoteElementType } from '../types/elements';
import type {
  ArticulationType,
  Chord,
  DurationType,
  Note,
  Octave,
} from '../types/theory';
import {
  COMMON_ATTRIBUTES,
  MUSIC_CHORD,
  MUSIC_NOTE,
  MUSIC_STAFF,
  NOTE_EVENTS,
} from '../utils/consts';
import {
  ARPEGGIO_CHORD_GAP_PX,
  ARPEGGIO_FOOTPRINT_PX,
  ARPEGGIO_HAIRPIN_FOOTPRINT_PX,
  ARPEGGIO_WAVE_WIDTH_PX,
} from '../utils/notationDimensions';
import {
  NOTE_HEAD_CX_STEM_DOWN_PX,
  NOTE_HEAD_RADIUS_PX,
  NOTE_SCALE,
} from '../utils/svgCreator/note';
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe(MUSIC_CHORD, () => {
  it('renders shadow root with default duration', () => {
    const chordElement = document.createElement(
      MUSIC_CHORD
    ) as ChordElementType;
    document.body.appendChild(chordElement);

    expect(chordElement.duration).toBe('quarter');
    expect(chordElement.shadowRoot).not.toBeNull();
    expect(chordElement?.shadowRoot?.innerHTML).not.toBe('');
  });

  describe('noStem', () => {
    it('defaults to false, rendering the extremal notehead with a stem', () => {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      const noteC = document.createElement(MUSIC_NOTE) as NoteElementType;
      noteC.setAttribute('note', 'C');
      noteC.setAttribute('octave', '4');
      const noteE = document.createElement(MUSIC_NOTE) as NoteElementType;
      noteE.setAttribute('note', 'E');
      noteE.setAttribute('octave', '4');
      chordElement.appendChild(noteC);
      chordElement.appendChild(noteE);
      document.body.appendChild(chordElement);

      expect(chordElement.noStem).toBe(false);
      const stems = chordElement.shadowRoot?.querySelectorAll('.stem');
      expect(stems?.length).toBeGreaterThan(0);
    });

    it('suppresses every notehead stem, including the extremal one, when set', () => {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      const noteC = document.createElement(MUSIC_NOTE) as NoteElementType;
      noteC.setAttribute('note', 'C');
      noteC.setAttribute('octave', '4');
      const noteE = document.createElement(MUSIC_NOTE) as NoteElementType;
      noteE.setAttribute('note', 'E');
      noteE.setAttribute('octave', '4');
      chordElement.appendChild(noteC);
      chordElement.appendChild(noteE);
      document.body.appendChild(chordElement);

      chordElement.noStem = true;

      expect(chordElement.noStem).toBe(true);
      const stems = chordElement.shadowRoot?.querySelectorAll('.stem');
      expect(stems?.length).toBe(0);
    });
  });

  describe('diminuendo alias', () => {
    it('normalizes the diminuendo attribute into decrescendo', () => {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      document.body.appendChild(chordElement);

      chordElement.setAttribute('diminuendo', 'start');

      expect(chordElement.getAttribute('decrescendo')).toBe('start');
      expect(chordElement.getAttribute('diminuendo')).toBeNull();
      expect(chordElement.decrescendo).toBe('start');
      expect(chordElement.diminuendo).toBe('start');
    });

    it('sets decrescendo through the diminuendo property setter', () => {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      document.body.appendChild(chordElement);

      chordElement.diminuendo = 'end';

      expect(chordElement.decrescendo).toBe('end');
      expect(chordElement.getAttribute('decrescendo')).toBe('end');
      expect(chordElement.getAttribute('diminuendo')).toBeNull();
    });

    it('clears decrescendo when diminuendo is set to null', () => {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      document.body.appendChild(chordElement);

      chordElement.decrescendo = 'start';
      chordElement.diminuendo = null;

      expect(chordElement.decrescendo).toBeNull();
      expect(chordElement.getAttribute('decrescendo')).toBeNull();
    });
  });

  describe('arpeggio (standalone)', () => {
    function makeChord(): ChordElementType {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      chordElement.setAttribute('chord', 'C' satisfies Chord);
      document.body.appendChild(chordElement);
      return chordElement;
    }

    it('round-trips the arpeggio slot and rejects unknown values', () => {
      const chordElement = makeChord();
      chordElement.arpeggio = 'down';
      expect(chordElement.getAttribute('arpeggio')).toBe('down');
      expect(chordElement.arpeggio).toBe('down');

      chordElement.setAttribute('arpeggio', 'nope');
      expect(chordElement.arpeggio).toBeNull();

      chordElement.arpeggio = 'up';
      chordElement.arpeggio = null;
      expect(chordElement.getAttribute('arpeggio')).toBeNull();
    });

    it('renders its own sign standalone, and only when set', () => {
      const chordElement = makeChord();
      expect(chordElement.shadowRoot?.querySelector('.arpeggio')).toBeNull();

      chordElement.arpeggio = 'non-arpeggiate';
      const sign = chordElement.shadowRoot?.querySelector('.arpeggio');
      expect(sign?.querySelector('.arpeggio-bracket')).not.toBeNull();
      expect(sign?.querySelector('.arpeggio-wave')).toBeNull();
    });
  });

  describe('arpeggio-hairpin (standalone)', () => {
    function makeArpeggioChord(
      attrs: Record<string, string> = {}
    ): ChordElementType {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      chordElement.setAttribute('chord', 'Cmaj' satisfies Chord);
      chordElement.setAttribute('arpeggio', 'up');
      for (const [key, value] of Object.entries(attrs)) {
        chordElement.setAttribute(key, value);
      }
      document.body.appendChild(chordElement);
      return chordElement;
    }

    it('round-trips arpeggio-hairpin and the from/to letters', () => {
      const chordElement = makeArpeggioChord();
      chordElement.arpeggioHairpin = 'crescendo';
      chordElement.arpeggioHairpinFrom = 'p';
      chordElement.arpeggioHairpinTo = 'mf';
      expect(chordElement.getAttribute('arpeggio-hairpin')).toBe('crescendo');
      expect(chordElement.arpeggioHairpin).toBe('crescendo');
      expect(chordElement.arpeggioHairpinFrom).toBe('p');
      expect(chordElement.arpeggioHairpinTo).toBe('mf');
    });

    it('normalizes diminuendo to decrescendo', () => {
      const chordElement = makeArpeggioChord({
        'arpeggio-hairpin': 'diminuendo',
      });
      expect(chordElement.arpeggioHairpin).toBe('decrescendo');
    });

    it('renders the wedge and both dynamic letters element-local', () => {
      const chordElement = makeArpeggioChord({
        'arpeggio-hairpin': 'crescendo',
        'arpeggio-hairpin-from': 'p',
        'arpeggio-hairpin-to': 'f',
      });
      const wedge = chordElement.shadowRoot?.querySelector('.arpeggio-hairpin');
      expect(wedge).not.toBeNull();
      expect(wedge?.querySelectorAll('path')).toHaveLength(2);
      expect(
        chordElement.shadowRoot?.querySelectorAll('.dynamic-marking')
      ).toHaveLength(2);
    });

    it('does not render the wedge for non-arpeggiate', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation();
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      chordElement.setAttribute('chord', 'Cmaj' satisfies Chord);
      chordElement.setAttribute('arpeggio', 'non-arpeggiate');
      document.body.appendChild(chordElement);
      chordElement.setAttribute('arpeggio-hairpin', 'crescendo');
      expect(
        chordElement.shadowRoot?.querySelector('.arpeggio-hairpin')
      ).toBeNull();
      warn.mockRestore();
    });
  });

  describe('trill', () => {
    function makeChord(): ChordElementType {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      chordElement.setAttribute('chord', 'C' satisfies Chord);
      document.body.appendChild(chordElement);
      return chordElement;
    }

    it('round-trips trill / trill-stop as boolean presence attributes', () => {
      const chordElement = makeChord();

      expect(chordElement.trill).toBe(false);
      chordElement.trill = true;
      expect(chordElement.getAttribute('trill')).toBe('');
      expect(chordElement.trill).toBe(true);
      chordElement.trill = false;
      expect(chordElement.getAttribute('trill')).toBeNull();

      chordElement.trillStop = true;
      expect(chordElement.trillStop).toBe(true);
    });

    it('round-trips trill-line and defaults to "auto"', () => {
      const chordElement = makeChord();

      expect(chordElement.trillLine).toBe('auto');
      chordElement.trillLine = 'none';
      expect(chordElement.getAttribute('trill-line')).toBe('none');
      expect(chordElement.trillLine).toBe('none');
    });

    it('round-trips trill-accidental and rejects unknown values', () => {
      const chordElement = makeChord();
      expect(chordElement.trillAccidental).toBeNull();

      chordElement.trillAccidental = 'flat';
      expect(chordElement.getAttribute('trill-accidental')).toBe('flat');
      expect(chordElement.trillAccidental).toBe('flat');

      chordElement.setAttribute('trill-accidental', 'nope');
      expect(chordElement.trillAccidental).toBeNull();

      chordElement.trillAccidental = 'sharp';
      chordElement.trillAccidental = null;
      expect(chordElement.getAttribute('trill-accidental')).toBeNull();
    });

    it('round-trips trill-note', () => {
      const chordElement = makeChord();
      expect(chordElement.trillNote).toBeNull();

      chordElement.trillNote = 'F#';
      expect(chordElement.getAttribute('trill-note')).toBe('F#');
      expect(chordElement.trillNote).toBe('F#');

      chordElement.trillNote = null;
      expect(chordElement.getAttribute('trill-note')).toBeNull();
    });

    it('warns when trill-note and trill-accidental are both set', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const chordElement = makeChord();
      chordElement.trillAccidental = 'natural';

      chordElement.trillNote = 'G';
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('trill-accidental is ignored')
      );

      consoleSpy.mockRestore();
    });

    it('round-trips resolvedTrillPitch as an internal (non-attribute) property', () => {
      const chordElement = makeChord();
      expect(chordElement.resolvedTrillPitch).toBeNull();

      chordElement.resolvedTrillPitch = {
        letter: 'B',
        accidental: 'flat',
        written: false,
        octave: null,
      };
      expect(chordElement.resolvedTrillPitch).toEqual({
        letter: 'B',
        accidental: 'flat',
        written: false,
        octave: null,
      });
      expect(chordElement.hasAttribute('resolved-trill-pitch')).toBe(false);
    });

    it('round-trips trill-finish and trill-finish-octave', () => {
      const chordElement = makeChord();
      expect(chordElement.trillFinish).toBeNull();

      chordElement.trillFinish = ['F#', 'G'];
      chordElement.trillFinishOctave = [4, 4];

      expect(chordElement.getAttribute('trill-finish')).toBe('F#,G');
      expect(chordElement.trillFinish).toEqual(['F#', 'G']);
      expect(chordElement.getAttribute('trill-finish-octave')).toBe('4,4');
      expect(chordElement.trillFinishOctave).toEqual([4, 4]);

      chordElement.trillFinish = '';
      expect(chordElement.hasAttribute('trill-finish')).toBe(false);
      expect(chordElement.trillFinish).toBeNull();
    });

    it('defaults trill-finish-slur to to-main and rejects an invalid value', () => {
      const chordElement = makeChord();
      expect(chordElement.trillFinishSlur).toBe('to-main');

      chordElement.trillFinishSlur = 'both';
      expect(chordElement.trillFinishSlur).toBe('both');

      chordElement.setAttribute('trill-finish-slur', 'not-a-real-value');
      expect(chordElement.trillFinishSlur).toBe('to-main');
    });

    it('round-trips resolvedTrillFinishAccidentals as an internal (non-attribute) property', () => {
      const chordElement = makeChord();
      expect(chordElement.resolvedTrillFinishAccidentals).toBeNull();

      chordElement.resolvedTrillFinishAccidentals = ['sharp', null];
      expect(chordElement.resolvedTrillFinishAccidentals).toEqual([
        'sharp',
        null,
      ]);
      expect(
        chordElement.hasAttribute('resolved-trill-finish-accidentals')
      ).toBe(false);
    });

    // Trills are staff-only, deliberately: the wavy line needs sibling
    // elements in the same staff to span into, so a sign with no possible
    // line is not drawn either — see staffClassicalBase.test.ts for in-staff
    // sign rendering coverage.
    it('renders no sign on a standalone chord, even when trill is set', () => {
      const chordElement = makeChord();
      chordElement.trill = true;
      expect(chordElement.shadowRoot?.querySelector('.trill-sign')).toBeNull();
    });

    describe('trill-finish (grace notes after the chord)', () => {
      it('renders a single finishing note with a to-main slur by default', () => {
        const chordElement = makeChord();
        chordElement.setAttribute('trill-finish', 'D');

        const group = chordElement.shadowRoot?.querySelector(
          '.trill-finish-notes'
        );
        expect(group).not.toBeNull();
        expect(group?.querySelectorAll('.grace-head')).toHaveLength(1);
        expect(group?.querySelector('.grace-slash')).toBeNull();
        expect(group?.querySelector('.trill-finish-slur')).not.toBeNull();
      });

      it('renders a finishing group as beamed stemless heads', () => {
        const chordElement = makeChord();
        chordElement.setAttribute('trill-finish', 'D,E');

        const group = chordElement.shadowRoot?.querySelector(
          '.trill-finish-notes'
        );
        expect(group?.querySelectorAll('.grace-head')).toHaveLength(2);
        expect(group?.querySelectorAll('.grace-beam').length).toBeGreaterThan(
          0
        );
      });

      it('draws no slur when trill-finish-slur is none', () => {
        const chordElement = makeChord();
        chordElement.setAttribute('trill-finish', 'D');
        chordElement.setAttribute('trill-finish-slur', 'none');

        const group = chordElement.shadowRoot?.querySelector(
          '.trill-finish-notes'
        );
        expect(group?.querySelector('.trill-finish-slur')).toBeNull();
      });

      it('draws no local slur when trill-finish-slur is to-next (the ancestor staff draws that half)', () => {
        const chordElement = makeChord();
        chordElement.setAttribute('trill-finish', 'D');
        chordElement.setAttribute('trill-finish-slur', 'to-next');

        const group = chordElement.shadowRoot?.querySelector(
          '.trill-finish-notes'
        );
        expect(group?.querySelector('.trill-finish-slur')).toBeNull();
      });
    });
  });

  describe('octave shift', () => {
    function makeChord(): ChordElementType {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      chordElement.setAttribute('chord', 'C' satisfies Chord);
      document.body.appendChild(chordElement);
      return chordElement;
    }

    it('round-trips octave-shift and rejects unknown values', () => {
      const chordElement = makeChord();

      expect(chordElement.octaveShift).toBeNull();
      chordElement.octaveShift = '8va';
      expect(chordElement.getAttribute('octave-shift')).toBe('8va');
      expect(chordElement.octaveShift).toBe('8va');

      chordElement.setAttribute('octave-shift', 'nope');
      expect(chordElement.octaveShift).toBeNull();

      chordElement.octaveShift = '15mb';
      chordElement.octaveShift = null;
      expect(chordElement.getAttribute('octave-shift')).toBeNull();
    });

    it('round-trips octave-stop as a boolean presence attribute', () => {
      const chordElement = makeChord();

      expect(chordElement.octaveStop).toBe(false);
      chordElement.octaveStop = true;
      expect(chordElement.getAttribute('octave-stop')).toBe('');
      expect(chordElement.octaveStop).toBe(true);
      chordElement.octaveStop = false;
      expect(chordElement.getAttribute('octave-stop')).toBeNull();
    });

    it('round-trips octave-mode and rejects unknown values', () => {
      const chordElement = makeChord();

      expect(chordElement.octaveMode).toBeNull();
      chordElement.octaveMode = 'col';
      expect(chordElement.getAttribute('octave-mode')).toBe('col');
      expect(chordElement.octaveMode).toBe('col');

      chordElement.setAttribute('octave-mode', 'nope');
      expect(chordElement.octaveMode).toBeNull();

      chordElement.octaveMode = 'sign';
      chordElement.octaveMode = null;
      expect(chordElement.getAttribute('octave-mode')).toBeNull();
    });

    it('round-trips loco as a boolean presence attribute', () => {
      const chordElement = makeChord();

      expect(chordElement.loco).toBe(false);
      chordElement.loco = true;
      expect(chordElement.getAttribute('loco')).toBe('');
      expect(chordElement.loco).toBe(true);
      chordElement.loco = false;
      expect(chordElement.getAttribute('loco')).toBeNull();
    });
  });

  describe('beam group', () => {
    function makeChord(): ChordElementType {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      chordElement.setAttribute('chord', 'C' satisfies Chord);
      document.body.appendChild(chordElement);
      return chordElement;
    }

    it('round-trips beam-group as a plain string attribute', () => {
      const chordElement = makeChord();

      expect(chordElement.beamGroup).toBeNull();
      chordElement.beamGroup = 'rh-lh-1';
      expect(chordElement.getAttribute('beam-group')).toBe('rh-lh-1');
      expect(chordElement.beamGroup).toBe('rh-lh-1');

      chordElement.beamGroup = null;
      expect(chordElement.getAttribute('beam-group')).toBeNull();
    });

    it('dispatches BEAM_GROUP_ATTRIBUTE_CHANGE without re-rendering the chord locally', () => {
      const chordElement = makeChord();
      const handler = jest.fn();
      chordElement.addEventListener(
        NOTE_EVENTS.BEAM_GROUP_ATTRIBUTE_CHANGE,
        handler
      );

      chordElement.beamGroup = 'rh-lh-1';

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('articulations', () => {
    function makeChordWithNotes(): ChordElementType {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      for (const value of ['C', 'E', 'G'] satisfies Note[]) {
        const note = document.createElement(MUSIC_NOTE) as NoteElementType;
        note.setAttribute('note', value);
        note.setAttribute('octave', `${4 satisfies Octave}`);
        chordElement.appendChild(note);
      }
      return chordElement;
    }

    it('round-trips the articulation and stress slots between property and attribute', () => {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      document.body.appendChild(chordElement);

      chordElement.articulation = 'accent-tenuto';
      chordElement.stress = 'unstressed';

      expect(chordElement.getAttribute('articulation')).toBe('accent-tenuto');
      expect(chordElement.getAttribute('stress')).toBe('unstressed');
      expect(chordElement.articulation).toBe('accent-tenuto');
      expect(chordElement.stress).toBe('unstressed');
    });

    it('ignores unrecognized articulation values, including illegal combinations', () => {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      document.body.appendChild(chordElement);

      chordElement.setAttribute('articulation', 'fermata-staccato');

      expect(chordElement.articulation).toBeNull();
    });

    it('draws the chord-level mark exactly once, not per notehead', () => {
      const chordElement = makeChordWithNotes();
      chordElement.setAttribute('articulation', 'staccato');
      document.body.appendChild(chordElement);

      const groups =
        chordElement.shadowRoot?.querySelectorAll('.articulations') ?? [];
      expect(groups.length).toBe(1);
      // Exactly one staccato dot for the whole 3-note chord.
      expect(
        chordElement.shadowRoot?.querySelectorAll('.staccato').length
      ).toBe(1);
    });

    it('draws a chord fermata exactly once', () => {
      const chordElement = makeChordWithNotes();
      chordElement.setAttribute('articulation', 'fermata');
      document.body.appendChild(chordElement);

      expect(chordElement.shadowRoot?.querySelectorAll('.fermata').length).toBe(
        1
      );
    });
  });

  describe('notes getter', () => {
    it('returns empty array when no chord attribute and no child notes', () => {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      document.body.appendChild(chordElement);

      expect(chordElement.notes).toEqual([]);
    });

    it('returns notes derived from chord attribute when no child notes exist', () => {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      chordElement.setAttribute('chord', 'Amaj');
      chordElement.setAttribute('duration', 'quarter');
      document.body.appendChild(chordElement);

      const notes = chordElement.notes;
      const values: Note[] = notes.map((n: { value: Note }) => n.value);
      expect(values).toEqual(['A', 'C#', 'E']);
      notes.forEach((n: { duration: DurationType }) => {
        expect(n.duration).toBe('quarter');
      });
    });

    it('returns child music-note elements when they exist, ignoring chord attribute', () => {
      const el = document.createElement(MUSIC_CHORD) as ChordElementType;
      el.setAttribute('chord', 'Amaj');
      document.body.appendChild(el);

      const noteC = document.createElement(MUSIC_NOTE) as NoteElementType;
      noteC.setAttribute('note', 'C');
      noteC.setAttribute('duration', 'quarter');
      const noteE = document.createElement(MUSIC_NOTE) as NoteElementType;
      noteE.setAttribute('note', 'E');
      noteE.setAttribute('duration', 'quarter');
      el.appendChild(noteC);
      el.appendChild(noteE);

      const values: Note[] = el.notes.map((n: { value: Note }) => n.value);
      expect(values).toEqual(['C', 'E']);
    });
  });

  describe('grace notes', () => {
    function makeChordWithNotes(
      values: [Note, Octave][],
      grace?: string,
      graceOctave?: string,
      graceArticulation?: string
    ): ChordElementType {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      for (const [value, octave] of values) {
        const note = document.createElement(MUSIC_NOTE) as NoteElementType;
        note.setAttribute('note', value);
        note.setAttribute('octave', `${octave}`);
        chordElement.appendChild(note);
      }
      if (grace !== undefined) {
        chordElement.setAttribute('grace', grace);
      }
      if (graceOctave !== undefined) {
        chordElement.setAttribute('grace-octave', graceOctave);
      }
      if (graceArticulation !== undefined) {
        chordElement.setAttribute('grace-articulation', graceArticulation);
      }
      document.body.appendChild(chordElement);
      return chordElement;
    }

    it('round-trips the grace attributes between property and attribute', () => {
      const chordElement = makeChordWithNotes([
        ['C', 4],
        ['E', 4],
      ]);

      chordElement.grace = ['D', 'E'];
      chordElement.graceOctave = [4, 4];
      chordElement.graceType = 'appoggiatura';

      expect(chordElement.getAttribute('grace')).toBe('D,E');
      expect(chordElement.grace).toEqual(['D', 'E']);
      expect(chordElement.getAttribute('grace-octave')).toBe('4,4');
      expect(chordElement.graceOctave).toEqual([4, 4]);
      expect(chordElement.graceType).toBe('appoggiatura');
      expect(chordElement.graceSlur).toBe('auto');
      expect(chordElement.graceDuration).toBeNull();
    });

    it('accepts the comma-separated string form on the grace list setters', () => {
      const chordElement = makeChordWithNotes([
        ['C', 4],
        ['E', 4],
      ]);

      chordElement.grace = 'D,E';
      chordElement.graceOctave = '4,,5';
      chordElement.graceArticulation = ',staccato';

      expect(chordElement.getAttribute('grace')).toBe('D,E');
      expect(chordElement.grace).toEqual([
        'D' satisfies Note,
        'E' satisfies Note,
      ]);
      expect(chordElement.graceOctave).toEqual([
        4 satisfies Octave,
        null,
        5 satisfies Octave,
      ]);
      expect(chordElement.graceArticulation).toEqual([
        null,
        'staccato' satisfies ArticulationType,
      ]);
    });

    it('clears the grace list attributes when set to an empty string', () => {
      const chordElement = makeChordWithNotes([
        ['C', 4],
        ['E', 4],
      ]);
      chordElement.setAttribute('grace', 'D');

      chordElement.grace = '';
      expect(chordElement.hasAttribute('grace')).toBe(false);
      expect(chordElement.grace).toBeNull();
    });

    it('rejects an invalid grace string set via the property (no attribute written)', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const chordElement = makeChordWithNotes([
        ['C', 4],
        ['E', 4],
      ]);

      chordElement.grace = 'H,I';
      expect(chordElement.hasAttribute('grace')).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('renders grace notes on a standalone chord', () => {
      const chordElement = makeChordWithNotes(
        [
          ['C', 4],
          ['E', 4],
          ['G', 4],
        ],
        'B,C',
        '3,4'
      );

      const graceGroup = chordElement.shadowRoot?.querySelector('.grace-notes');
      expect(graceGroup).not.toBeNull();
      expect(graceGroup?.querySelectorAll('.grace-head')).toHaveLength(2);
      expect(graceGroup?.querySelectorAll('.grace-beam')).toHaveLength(2);
      expect(graceGroup?.querySelector('.grace-slash')).not.toBeNull();
      expect(graceGroup?.querySelector('.grace-slur')).not.toBeNull();
    });

    it('routes the grace slur clear of the reference note accidental horizontally, without growing its gap to the notehead', () => {
      const endPoint = (element: ChordElementType): number[] => {
        const d =
          element.shadowRoot
            ?.querySelector('.grace-slur path')
            ?.getAttribute('d') ?? '';
        const [, , , , endX, endY] =
          d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
        return [endX, endY];
      };

      const withAccidental = makeChordWithNotes(
        [
          ['C#', 4],
          ['E', 4],
        ],
        'B',
        '4'
      );
      const plain = makeChordWithNotes(
        [
          ['C', 4],
          ['E', 4],
        ],
        'B',
        '4'
      );

      const [endXWithAccidental, endYWithAccidental] = endPoint(withAccidental);
      const headCxAttr = Number(
        withAccidental.shadowRoot?.querySelector('.head')?.getAttribute('cx')
      );
      // Every note in a chord shares the same internal (undisplaced) head
      // cx/cy — chord.ts renders them all with the same duration/stemUp —
      // so querying any one '.head' gives the right X regardless of which
      // note the slur targets (per-note X differences come only from a
      // wrapper <svg x=...> offset for adjacent-note displacement, which
      // these thirds-apart test chords never trigger).
      const mainHeadCenterX = headCxAttr * NOTE_SCALE;
      // Standalone chords resolve Y from the same C6..C4 note-name map as an
      // in-staff treble chord (accidentals don't move a note's staff line).
      // mainHeadCenterY = STAFF_Y_PADDING + staffY - NOTE_HEAD_Y_OFFSET_CORRECTION
      // withAccidental=[C#4(80),E4(70)]: bulge above targets the top note,
      // E4. plain=[C4(80),E4(70)]: bulge below targets the reference
      // (bottom/index-0) note, C4.
      const mainHeadCenterYWithAccidental = 8 + 70 - 10;
      const mainHeadCenterYPlain = 8 + 80 - 10;
      // A sharp is 10px wide (ACCIDENTAL_SYMBOL_WIDTH), sat ACCIDENTAL_NOTE_GAP
      // (-7px, i.e. overlapping) left of the head center.
      const accidentalLeftEdgeX = mainHeadCenterX - (10 + -7);

      // Clears the accidental horizontally...
      expect(endXWithAccidental).toBeLessThan(accidentalLeftEdgeX);

      // ...and the endpoint's distance to its target notehead is the same
      // constant whether or not an accidental is shown (only which note it
      // targets, and the horizontal pullback, differ).
      const [, endYPlain] = endPoint(plain);
      const gapWithAccidental = Math.abs(
        mainHeadCenterYWithAccidental - endYWithAccidental
      );
      const gapPlain = Math.abs(mainHeadCenterYPlain - endYPlain);
      expect(gapWithAccidental).toBeCloseTo(gapPlain, 5);
    });

    it('keeps the slur-to-notehead gap constant regardless of which chord note the accidental sits on', () => {
      // Accidental sits only on G#4 (index 2), not the reference note C4
      // (index 0) — C4=80, G4=60, 20px of staffY apart. Both cases bulge
      // above (an accidental is shown either way) and target their own top
      // note: E4(70) for the 2-note chord, G#4(60) for the 3-note chord.
      const accidentalOnReference = makeChordWithNotes(
        [
          ['C#', 4],
          ['E', 4],
        ],
        'B',
        '4'
      );
      const accidentalOnNonReference = makeChordWithNotes(
        [
          ['C', 4],
          ['E', 4],
          ['G#', 4],
        ],
        'B',
        '4'
      );

      const endY = (element: ChordElementType): number => {
        const d =
          element.shadowRoot
            ?.querySelector('.grace-slur path')
            ?.getAttribute('d') ?? '';
        const [, , , , , y] = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
        return y;
      };

      const gapOnReference = Math.abs(
        8 + 70 - 10 - endY(accidentalOnReference) // top note E4, staffY=70
      );
      const gapOnNonReference = Math.abs(
        8 + 60 - 10 - endY(accidentalOnNonReference) // top note G#4, staffY=60
      );
      expect(gapOnNonReference).toBeCloseTo(gapOnReference, 5);
    });

    it('keeps the slur-to-notehead gap constant for a grace GROUP into a chord with a multi-position accidental column', () => {
      // Mirrors chord.stories.ts's WithGraceNotes second chord: a 2-note
      // grace group into a chord with accidentals on both the reference note
      // (C#4, index 0) and a note 20px of staffY away (G#4, index 2). Both
      // chords' top note is at staffY=60 (G#4 and G4 share the same staff
      // position — an accidental doesn't move it).
      const twoAccidentals = makeChordWithNotes(
        [
          ['C#', 4],
          ['E', 4],
          ['G#', 4],
        ],
        'C,D',
        '4,4'
      );
      const oneAccidental = makeChordWithNotes(
        [
          ['C#', 4],
          ['E', 4],
          ['G', 4],
        ],
        'C,D',
        '4,4'
      );

      const endY = (element: ChordElementType): number => {
        const d =
          element.shadowRoot
            ?.querySelector('.grace-slur path')
            ?.getAttribute('d') ?? '';
        const [, , , , , y] = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
        return y;
      };

      const topNoteHeadCenterY = 8 + 60 - 10; // top note G#4/G4, staffY=60
      const gapTwoAccidentals = Math.abs(
        topNoteHeadCenterY - endY(twoAccidentals)
      );
      const gapOneAccidental = Math.abs(
        topNoteHeadCenterY - endY(oneAccidental)
      );
      // Adding a second accidental must not increase the end-point gap.
      expect(gapTwoAccidentals).toBeCloseTo(gapOneAccidental, 5);
    });

    it('positions grace heads relative to the reference note (notes[0])', () => {
      // Grace pitch equals the reference pitch → same head Y as the lowest
      // chord note; one step up → 5px higher (smaller y).
      const samePitch = makeChordWithNotes(
        [
          ['C', 4],
          ['E', 4],
        ],
        'C',
        '4'
      );
      const stepUp = makeChordWithNotes(
        [
          ['C', 4],
          ['E', 4],
        ],
        'D',
        '4'
      );

      const headTransformY = (chordElement: ChordElementType): number => {
        const transform =
          chordElement.shadowRoot
            ?.querySelector('.grace-notes .grace-note')
            ?.getAttribute('transform') ?? '';
        const match = transform.match(/translate\([^ ]+ ([^)]+)\)/);
        return Number(match?.[1]);
      };

      expect(headTransformY(stepUp)).toBeCloseTo(headTransformY(samePitch) - 5);
    });

    it('defaults the grace octave to the reference note octave when grace-octave is omitted', () => {
      const withDefault = makeChordWithNotes(
        [
          ['C', 4],
          ['E', 4],
        ],
        'C'
      );
      const withExplicit = makeChordWithNotes(
        [
          ['C', 4],
          ['E', 4],
        ],
        'C',
        '4'
      );

      const headTransform = (chordElement: ChordElementType): string | null =>
        chordElement.shadowRoot
          ?.querySelector('.grace-notes .grace-note')
          ?.getAttribute('transform') ?? null;

      expect(headTransform(withDefault)).toBe(headTransform(withExplicit));
    });

    it('renders no grace group when the chord has no notes', () => {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      chordElement.setAttribute('grace', 'C');
      chordElement.setAttribute('grace-octave', '4');
      document.body.appendChild(chordElement);

      expect(chordElement.shadowRoot?.querySelector('.grace-notes')).toBeNull();
    });

    it('arcs the slur above every grace head when the group descends in pitch', () => {
      // grace="F,E" into a chord referencing C4 — the group's pitch trends
      // downward (first note F higher than last note E). Mirrors the
      // note-level regression: stem-tip anchoring must keep the curve
      // above every grace head, not just the two slur endpoints.
      const chordElement = makeChordWithNotes(
        [
          ['C', 4],
          ['E', 4],
        ],
        'F,E',
        '4,4'
      );

      const graceGroup = chordElement.shadowRoot?.querySelector('.grace-notes');
      const heads = Array.from(
        graceGroup?.querySelectorAll('.grace-head') ?? []
      );
      const d =
        chordElement.shadowRoot
          ?.querySelector('.grace-slur path')
          ?.getAttribute('d') ?? '';
      const [, , , controlY] = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];

      const parseTranslate = (transform: string): [number, number] => {
        const match = transform.match(
          /translate\(\s*(-?[\d.]+)[ ,]\s*(-?[\d.]+)\s*\)/
        );
        return match ? [Number(match[1]), Number(match[2])] : [0, 0];
      };
      const parseScale = (transform: string): number => {
        const match = transform.match(/scale\(\s*(-?[\d.]+)/);
        return match ? Number(match[1]) : 1;
      };
      const trueCenter = (
        element: Element,
        root: Element,
        localX: number,
        localY: number
      ): [number, number] => {
        let x = localX;
        let y = localY;
        let node: Element | null = element;
        while (node !== null && node !== root) {
          const transform = node.getAttribute('transform');
          if (transform !== null) {
            const scale = parseScale(transform);
            const [translateX, translateY] = parseTranslate(transform);
            x = translateX + scale * x;
            y = translateY + scale * y;
          }
          node = node.parentElement;
        }
        return [x, y];
      };

      for (const head of heads) {
        const cx = Number(head.getAttribute('cx'));
        const cy = Number(head.getAttribute('cy'));
        const [, y] = trueCenter(head, graceGroup as Element, cx, cy);
        expect(controlY).toBeLessThan(y);
      }
    });

    describe('grace articulation', () => {
      it('round-trips the grace-articulation attribute between property and attribute', () => {
        const chordElement = makeChordWithNotes([
          ['C', 4],
          ['E', 4],
        ]);

        chordElement.grace = ['D', 'E'];
        chordElement.graceArticulation = ['staccato', 'accent'];

        expect(chordElement.getAttribute('grace-articulation')).toBe(
          'staccato,accent'
        );
        expect(chordElement.graceArticulation).toEqual(['staccato', 'accent']);
      });

      it('falls back to no mark for missing or invalid grace-articulation slots, without rejecting the whole list', () => {
        const chordElement = makeChordWithNotes(
          [
            ['C', 4],
            ['E', 4],
          ],
          'A,B'
        );

        expect(chordElement.graceArticulation).toBeNull();

        chordElement.setAttribute('grace-articulation', 'staccato,not-a-mark');
        expect(chordElement.graceArticulation).toEqual(['staccato', null]);
      });

      it('renders a mark on each grace note in a group independently, on a standalone chord', () => {
        const chordElement = makeChordWithNotes(
          [
            ['C', 4],
            ['E', 4],
          ],
          'A,B',
          '4,4',
          'staccato,accent'
        );

        const graceGroup =
          chordElement.shadowRoot?.querySelector('.grace-notes');
        expect(graceGroup?.querySelectorAll('.articulations')).toHaveLength(2);
        expect(graceGroup?.querySelector('.staccato')).not.toBeNull();
        expect(graceGroup?.querySelector('.accent')).not.toBeNull();
      });

      it('renders a mark on a single (non-grouped) grace note', () => {
        const chordElement = makeChordWithNotes(
          [
            ['C', 4],
            ['E', 4],
          ],
          'B',
          '4',
          'tenuto'
        );

        const graceGroup =
          chordElement.shadowRoot?.querySelector('.grace-notes');
        expect(graceGroup?.querySelector('.articulations')).not.toBeNull();
        expect(graceGroup?.querySelector('.tenuto')).not.toBeNull();
      });

      it('renders no articulation marks when grace-articulation is unset', () => {
        const chordElement = makeChordWithNotes(
          [
            ['C', 4],
            ['E', 4],
          ],
          'A,B',
          '4,4'
        );

        const graceGroup =
          chordElement.shadowRoot?.querySelector('.grace-notes');
        expect(graceGroup?.querySelector('.articulations')).toBeNull();
      });

      it('nests the marks in the same two scale levels (GRACE_SCALE, then NOTE_SCALE) as the grace head itself', () => {
        // Regression test: createArticulationMarks() draws in the same
        // 600-unit note-space createNoteSvg uses for the head, and
        // createNoteSvg wraps that space in its own inner scale(NOTE_SCALE)
        // before the outer translate+scale(GRACE_SCALE) grace wrapper — the
        // marks must mirror that exact nesting or they render ~1/NOTE_SCALE
        // too large and land outside any clipped viewBox (invisible in-staff).
        const chordElement = makeChordWithNotes(
          [
            ['C', 4],
            ['E', 4],
          ],
          'B',
          '4',
          'tenuto'
        );

        const graceGroup =
          chordElement.shadowRoot?.querySelector('.grace-notes');
        const headInnerScale = graceGroup
          ?.querySelector('.grace-head')
          ?.closest('g[transform^="scale("]')
          ?.getAttribute('transform');
        const marksInnerScale = graceGroup
          ?.querySelector('.articulations')
          ?.closest('g[transform^="scale("]')
          ?.getAttribute('transform');

        expect(headInnerScale).not.toBeNull();
        expect(marksInnerScale).toBe(headInnerScale);
        expect(marksInnerScale).toContain(`scale(${NOTE_SCALE}`);
      });
    });
  });
});

const TREBLE_STAFF_Y: Record<string, number> = {
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

function makeStaff(): Element {
  const staff = document.createElement(MUSIC_STAFF) as any;
  staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
  staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
  staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
  document.body.appendChild(staff);
  return staff;
}

function renderChordByNotes(
  staff: Element,
  notes: { value: Note; octave: Octave }[],
  duration: DurationType = 'quarter'
): ChordElementType {
  const chord = document.createElement(MUSIC_CHORD) as ChordElementType;
  chord.setAttribute('duration', duration);
  for (const { value, octave } of notes) {
    const note = document.createElement(MUSIC_NOTE) as NoteElementType;
    note.setAttribute('note', value);
    note.setAttribute('octave', `${octave}`);
    chord.appendChild(note);
  }
  staff.appendChild(chord);
  const slot = (staff as any).shadowRoot.querySelector('slot');
  slot.assignedElements = () => [chord];
  slot.dispatchEvent(new Event('slotchange'));
  return chord;
}

function renderChordByAttribute(
  staff: Element,
  chordAttr: string,
  duration: DurationType = 'quarter'
): ChordElementType {
  const chord = document.createElement(MUSIC_CHORD) as ChordElementType;
  chord.setAttribute('chord', chordAttr);
  chord.setAttribute('duration', duration);
  staff.appendChild(chord);
  const slot = (staff as any).shadowRoot.querySelector('slot');
  slot.assignedElements = () => [chord];
  slot.dispatchEvent(new Event('slotchange'));
  return chord;
}

// STAFF_LINE_SPACING(10) * 0.8
const STAFF_Y_PADDING = 8;
// 150 * (32/600) = 8
const ADJACENT_NOTE_X_DISPLACEMENT_PX = 8;

describe('staff integration', () => {
  it('positions chord at top 0px (Y is handled internally by chord SVG)', () => {
    const staff = makeStaff();
    const chord = renderChordByNotes(staff, [
      { value: 'E', octave: 4 },
      { value: 'G', octave: 4 },
      { value: 'B', octave: 4 },
    ]);
    expect(chord.style.top).toBe('0px');
  });

  it('flips stem direction when all notes move above the middle of the staff', () => {
    const staff = makeStaff();
    // E4(70), G4(60) — both > MIDDLE_STAFF_Y(50) → stemUp=true
    const chord = renderChordByNotes(staff, [
      { value: 'E', octave: 4 },
      { value: 'G', octave: 4 },
    ]) as any;
    expect(chord.stemUp).toBe(true);

    // Re-render with E5(35), G5(25) — both ≤ MIDDLE_STAFF_Y → stemUp=false
    const updatedChord = renderChordByNotes(staff, [
      { value: 'E', octave: 5 },
      { value: 'G', octave: 5 },
    ]) as any;
    const slot = (staff as any).shadowRoot.querySelector('slot');
    slot.assignedElements = () => [updatedChord];
    slot.dispatchEvent(new Event('slotchange'));

    expect(updatedChord.stemUp).toBe(false);
  });

  it('assigns descending Y coordinates (ascending pitch) for a chord driven by chord attribute', () => {
    const staff = makeStaff();
    // Cmaj = C4(80), E4(70), G4(60) in treble — descending Y = ascending pitch
    const chord = renderChordByAttribute(staff, 'Cmaj' satisfies Chord);
    const coords = chord.staffYCoordinates;
    expect(coords).not.toBeNull();
    expect(coords!.length).toBe(3);
    expect(coords![0]).toBe(TREBLE_STAFF_Y['C4']); // 80 — root, lowest pitch
    expect(coords![1]).toBe(TREBLE_STAFF_Y['E4']); // 70
    expect(coords![2]).toBe(TREBLE_STAFF_Y['G4']); // 60 — highest pitch
  });

  describe('ledger lines', () => {
    it('renders no ledger lines when all notes are within the staff', () => {
      const staff = makeStaff();
      const chord = renderChordByNotes(staff, [
        { value: 'E', octave: 4 },
        { value: 'G', octave: 4 },
        { value: 'B', octave: 4 },
      ]);
      const lines = chord.shadowRoot!.querySelectorAll('.ledger-line');
      expect(lines.length).toBe(0);
    });

    it('renders one single-width ledger line for C4 alone (below staff)', () => {
      const staff = makeStaff();
      const chord = renderChordByNotes(staff, [{ value: 'C', octave: 4 }]);
      const lines = chord.shadowRoot!.querySelectorAll('.ledger-line');
      expect(lines.length).toBe(1);
      const expectedY = (
        STAFF_Y_PADDING -
        10 +
        TREBLE_STAFF_Y['C4']
      ).toString(); // 78
      expect(lines[0].getAttribute('y1')).toBe(expectedY);
      expect(lines[0].getAttribute('y2')).toBe(expectedY);
    });

    it('renders one double-width ledger line for adjacent C4+D4 pair (outermost C4 on a line)', () => {
      const staff = makeStaff();
      // C4(80) and D4(75) are adjacent; outermost C4 is on a line → double width
      const chord = renderChordByNotes(staff, [
        { value: 'C', octave: 4 },
        { value: 'D', octave: 4 },
      ]);
      const lines = chord.shadowRoot!.querySelectorAll('.ledger-line');
      expect(lines.length).toBe(1);
      const x1 = parseFloat(lines[0].getAttribute('x1')!);
      const x2 = parseFloat(lines[0].getAttribute('x2')!);
      // Double-width line extends by ADJACENT_NOTE_X_DISPLACEMENT_PX beyond the notehead
      // so the width should be greater than a single-width line (~4.27+4.27+3+3 = ~14.5px)
      expect(x2 - x1).toBeGreaterThan(ADJACENT_NOTE_X_DISPLACEMENT_PX + 14);
    });

    it('renders a narrower single-width ledger line for C4 alone than the double-width C4+D4 line', () => {
      const staff = makeStaff();

      const singleChord = renderChordByNotes(staff, [
        { value: 'C', octave: 4 },
      ]);
      const singleLines =
        singleChord.shadowRoot!.querySelectorAll('.ledger-line');
      const singleWidth =
        parseFloat(singleLines[0].getAttribute('x2')!) -
        parseFloat(singleLines[0].getAttribute('x1')!);

      const staff2 = makeStaff();
      const doubleChord = renderChordByNotes(staff2, [
        { value: 'C', octave: 4 },
        { value: 'D', octave: 4 },
      ]);
      const doubleLines =
        doubleChord.shadowRoot!.querySelectorAll('.ledger-line');
      const doubleWidth =
        parseFloat(doubleLines[0].getAttribute('x2')!) -
        parseFloat(doubleLines[0].getAttribute('x1')!);

      expect(doubleWidth).toBeGreaterThan(singleWidth);
    });

    it('renders two ledger lines for C4+B3 (two notes below staff)', () => {
      // B3 is one step below C4 — if TREBLE_STAFF_Y were extended, B3 ≈ 85
      // Using just C4 and the adjacent space below: test two ledger-requiring notes
      // C6(10) needs ledger lines at Y=20 and Y=10 (above staff)
      const staff = makeStaff();
      const chord = renderChordByNotes(staff, [{ value: 'C', octave: 6 }]);
      const lines = chord.shadowRoot!.querySelectorAll('.ledger-line');
      // C6 at staffY=10 needs ledger at 10 and 20
      expect(lines.length).toBe(2);
    });
  });

  describe('adjacent notehead displacement', () => {
    it('does not displace notes in a non-adjacent chord', () => {
      const staff = makeStaff();
      // E4(70), G4(60), B4(50) — non-adjacent (gaps of 10px)
      const chord = renderChordByNotes(staff, [
        { value: 'E', octave: 4 },
        { value: 'G', octave: 4 },
        { value: 'B', octave: 4 },
      ]);
      const notes = chord.shadowRoot!.querySelectorAll('.note');
      notes.forEach((note) => {
        expect(note.getAttribute('x')).toBeNull();
      });
    });

    it('displaces one note when two adjacent notes are in the chord (stem-up)', () => {
      const staff = makeStaff();
      // C4(80) and D4(75) — adjacent; stem-up (both > MIDDLE_STAFF_Y=50)
      // D4 (higher pitch, lower Y=75) is displaced +8px
      const chord = renderChordByNotes(staff, [
        { value: 'C', octave: 4 },
        { value: 'D', octave: 4 },
      ]);
      const notes = chord.shadowRoot!.querySelectorAll('.note');
      const xValues = Array.from(notes).map((n) => n.getAttribute('x'));
      expect(xValues).toContain(ADJACENT_NOTE_X_DISPLACEMENT_PX.toString());
      // exactly one note is displaced
      expect(xValues.filter((x) => x !== null).length).toBe(1);
    });

    it('alternates displacement for three adjacent notes (C4-D4-E4, stem-up)', () => {
      const staff = makeStaff();
      // C4(80), D4(75), E4(70) — all adjacent in stem-up order: C4 normal, D4 displaced, E4 normal
      const chord = renderChordByNotes(staff, [
        { value: 'C', octave: 4 },
        { value: 'D', octave: 4 },
        { value: 'E', octave: 4 },
      ]);
      const notes = chord.shadowRoot!.querySelectorAll('.note');
      const xValues = Array.from(notes).map((n) => n.getAttribute('x'));
      // Exactly one note (D4) is displaced
      expect(xValues.filter((x) => x !== null).length).toBe(1);
      expect(xValues).toContain(ADJACENT_NOTE_X_DISPLACEMENT_PX.toString());
    });
  });

  describe('arpeggio', () => {
    it('grows the staff min-width when a chord gains an arpeggio sign', () => {
      const staff = makeStaff();
      const minWidths: number[] = [];
      staff.addEventListener('staff-min-width', (event) => {
        minWidths.push((event as CustomEvent).detail.minWidth);
      });

      const chord = renderChordByNotes(staff, [
        { value: 'C', octave: 4 },
        { value: 'E', octave: 4 },
        { value: 'G', octave: 4 },
      ]);
      const withoutSign = minWidths[minWidths.length - 1];

      chord.setAttribute('arpeggio', 'up');
      const withSign = minWidths[minWidths.length - 1];

      expect(withSign).toBeCloseTo(withoutSign + ARPEGGIO_FOOTPRINT_PX, 5);
    });

    it('re-runs staff spacing when arpeggio-for is toggled on a connected chord', () => {
      const staff = makeStaff();
      const minWidths: number[] = [];
      staff.addEventListener('staff-min-width', (event) => {
        minWidths.push((event as CustomEvent).detail.minWidth);
      });

      const chord = renderChordByNotes(staff, [
        { value: 'C', octave: 4 },
        { value: 'E', octave: 4 },
        { value: 'G', octave: 4 },
      ]);
      const withoutSign = minWidths[minWidths.length - 1];

      chord.setAttribute('arpeggio-for', 'top');
      const withSign = minWidths[minWidths.length - 1];
      expect(withSign).toBeCloseTo(withoutSign + ARPEGGIO_FOOTPRINT_PX, 5);

      chord.removeAttribute('arpeggio-for');
      const removed = minWidths[minWidths.length - 1];
      expect(removed).toBeCloseTo(withoutSign, 5);
    });

    it('renders one sign spanning the whole chord', () => {
      const staff = makeStaff();
      const chord = renderChordByNotes(staff, [
        { value: 'C', octave: 4 },
        { value: 'E', octave: 4 },
        { value: 'G', octave: 4 },
      ]);
      chord.setAttribute('arpeggio', 'up-arrow');

      const signs = chord.shadowRoot!.querySelectorAll('.arpeggio');
      expect(signs.length).toBe(1);
      expect(
        signs[0].querySelectorAll('.arpeggio-wave').length
      ).toBeGreaterThan(1);
      expect(signs[0].querySelector('.arpeggio-arrowhead')).not.toBeNull();
    });

    // G5 + A5 sit above the middle line (stem-down) and are one step apart, so
    // the top head is displaced left by ADJACENT_NOTE_X_DISPLACEMENT_PX.
    function renderStemDownSecond(staff: Element): ChordElementType {
      const chord = renderChordByNotes(staff, [
        { value: 'G', octave: 5 },
        { value: 'A', octave: 5 },
      ]);
      const xValues = Array.from(
        chord.shadowRoot!.querySelectorAll('.note')
      ).map((note) => note.getAttribute('x'));
      expect(xValues).toContain((-ADJACENT_NOTE_X_DISPLACEMENT_PX).toString());
      return chord;
    }

    it('reserves the left-head displacement on top of the arpeggio footprint', () => {
      const staff = makeStaff();
      const minWidths: number[] = [];
      staff.addEventListener('staff-min-width', (event) => {
        minWidths.push((event as CustomEvent).detail.minWidth);
      });

      const chord = renderStemDownSecond(staff);
      const withoutSign = minWidths[minWidths.length - 1];

      chord.setAttribute('arpeggio', 'up');
      const withSign = minWidths[minWidths.length - 1];

      expect(withSign).toBeCloseTo(
        withoutSign + ARPEGGIO_FOOTPRINT_PX + ADJACENT_NOTE_X_DISPLACEMENT_PX,
        5
      );
    });

    it('places the sign left of the displaced head edge, not the raw displacement', () => {
      const staff = makeStaff();
      const chord = renderStemDownSecond(staff);
      chord.setAttribute('arpeggio', 'up');

      const sign = chord.shadowRoot!.querySelector('.arpeggio')!;
      const translateX = Number(
        /translate\(\s*(-?[\d.]+)/.exec(
          sign.getAttribute('transform') ?? ''
        )![1]
      );

      const normalHeadLeftX = NOTE_HEAD_CX_STEM_DOWN_PX - NOTE_HEAD_RADIUS_PX;
      const expectedRightEdgeX =
        normalHeadLeftX -
        ADJACENT_NOTE_X_DISPLACEMENT_PX -
        ARPEGGIO_CHORD_GAP_PX;
      expect(translateX).toBeCloseTo(
        expectedRightEdgeX - ARPEGGIO_WAVE_WIDTH_PX,
        4
      );
    });

    it('grows the staff min-width by the hairpin footprint on top of the sign', () => {
      const staff = makeStaff();
      const minWidths: number[] = [];
      staff.addEventListener('staff-min-width', (event) => {
        minWidths.push((event as CustomEvent).detail.minWidth);
      });

      const chord = renderChordByNotes(staff, [
        { value: 'C', octave: 4 },
        { value: 'E', octave: 4 },
        { value: 'G', octave: 4 },
      ]);
      chord.setAttribute('arpeggio', 'up');
      const withSign = minWidths[minWidths.length - 1];

      chord.setAttribute('arpeggio-hairpin', 'crescendo');
      const withHairpin = minWidths[minWidths.length - 1];

      expect(withHairpin).toBeCloseTo(
        withSign + ARPEGGIO_HAIRPIN_FOOTPRINT_PX,
        5
      );
    });

    it('renders the hairpin wedge and its dynamic letters inside the staff', () => {
      const staff = makeStaff();
      const chord = renderChordByNotes(staff, [
        { value: 'C', octave: 4 },
        { value: 'E', octave: 4 },
        { value: 'G', octave: 4 },
      ]);
      chord.setAttribute('arpeggio', 'up');
      chord.setAttribute('arpeggio-hairpin', 'crescendo');
      chord.setAttribute('arpeggio-hairpin-from', 'p');
      chord.setAttribute('arpeggio-hairpin-to', 'f');

      expect(
        chord.shadowRoot!.querySelectorAll('.arpeggio-hairpin').length
      ).toBe(1);
      expect(
        chord.shadowRoot!.querySelectorAll('.dynamic-marking').length
      ).toBe(2);
    });
  });

  describe('sempre arpeggiando passage', () => {
    function renderChords(
      staff: Element,
      specs: { chord: string; arpeggiate?: string; arpeggio?: string }[]
    ): ChordElementType[] {
      const chords = specs.map((spec) => {
        const chord = document.createElement(MUSIC_CHORD) as ChordElementType;
        chord.setAttribute('chord', spec.chord);
        chord.setAttribute('duration', 'quarter' satisfies DurationType);
        if (spec.arpeggiate) {
          chord.setAttribute('arpeggiate', spec.arpeggiate);
        }
        if (spec.arpeggio) {
          chord.setAttribute('arpeggio', spec.arpeggio);
        }
        staff.appendChild(chord);
        return chord;
      });
      const slot = (staff as any).shadowRoot.querySelector('slot');
      slot.assignedElements = () => chords;
      slot.dispatchEvent(new Event('slotchange'));
      return chords;
    }

    it('draws the instruction once and rolls every following chord', () => {
      const staff = makeStaff();
      const [first, second, third] = renderChords(staff, [
        { chord: 'Cmaj', arpeggiate: 'start' },
        { chord: 'Fmaj' },
        { chord: 'Gmaj' },
      ]);

      expect(
        staff.shadowRoot?.querySelectorAll('.sempre-arpeggiando').length
      ).toBe(1);
      expect(first.shadowRoot?.querySelector('.arpeggio')).not.toBeNull();
      expect(second.shadowRoot?.querySelector('.arpeggio')).not.toBeNull();
      expect(third.shadowRoot?.querySelector('.arpeggio')).not.toBeNull();
    });

    it('lets a chord opt out with its own arpeggio value', () => {
      const staff = makeStaff();
      const [, opted] = renderChords(staff, [
        { chord: 'Cmaj', arpeggiate: 'start' },
        { chord: 'Fmaj', arpeggio: 'non-arpeggiate' },
      ]);

      expect(
        opted.shadowRoot?.querySelector('.arpeggio-bracket')
      ).not.toBeNull();
      expect(opted.shadowRoot?.querySelector('.arpeggio-wave')).toBeNull();
    });

    it('stops the passage at arpeggiate="end"', () => {
      const staff = makeStaff();
      const [, , after] = renderChords(staff, [
        { chord: 'Cmaj', arpeggiate: 'start' },
        { chord: 'Fmaj', arpeggiate: 'end' },
        { chord: 'Gmaj' },
      ]);

      expect(after.shadowRoot?.querySelector('.arpeggio')).toBeNull();
    });

    it('reserves leftward space for the implied signs', () => {
      const staff = makeStaff();
      const minWidths: number[] = [];
      staff.addEventListener('staff-min-width', (event) => {
        minWidths.push((event as CustomEvent).detail.minWidth);
      });

      const [first] = renderChords(staff, [
        { chord: 'Cmaj' },
        { chord: 'Fmaj' },
      ]);
      const withoutPassage = minWidths[minWidths.length - 1];

      first.setAttribute('arpeggiate', 'start');
      const withPassage = minWidths[minWidths.length - 1];

      // Both chords now carry an (implied) sign.
      expect(withPassage).toBeCloseTo(
        withoutPassage + 2 * ARPEGGIO_FOOTPRINT_PX,
        5
      );
    });

    function reassignSlot(staff: Element, chords: ChordElementType[]): void {
      const slot = (staff as any).shadowRoot.querySelector('slot');
      slot.assignedElements = () => chords;
      slot.dispatchEvent(new Event('slotchange'));
    }

    it('clears impliedArpeggio on a chord removed from the staff mid-passage', () => {
      const staff = makeStaff();
      const [first, second] = renderChords(staff, [
        { chord: 'Cmaj', arpeggiate: 'start' },
        { chord: 'Fmaj' },
      ]);
      expect(second.impliedArpeggio).toBe('up');

      second.remove();
      reassignSlot(staff, [first]);

      expect(second.impliedArpeggio).toBeNull();

      document.body.appendChild(second);
      expect(second.shadowRoot?.querySelector('.arpeggio')).toBeNull();
    });

    it('leaves impliedArpeggio alone when the chord moved to another staff in a passage', () => {
      const staffA = makeStaff();
      const [firstA, moved] = renderChords(staffA, [
        { chord: 'Cmaj', arpeggiate: 'start' },
        { chord: 'Fmaj' },
      ]);
      expect(moved.impliedArpeggio).toBe('up');

      const staffB = makeStaff();
      const startB = document.createElement(MUSIC_CHORD) as ChordElementType;
      startB.setAttribute('chord', 'Gmaj');
      startB.setAttribute('duration', 'quarter' satisfies DurationType);
      startB.setAttribute('arpeggiate', 'start');
      staffB.appendChild(startB);
      staffB.appendChild(moved);

      reassignSlot(staffB, [startB, moved]);
      reassignSlot(staffA, [firstA]);

      expect(moved.impliedArpeggio).toBe('up');
    });
  });
});
