import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../../index';
import {
  DURATIONS,
  DYNAMICS,
  GRACE_DURATIONS,
  GRACE_SLURS,
  GRACE_TYPES,
  NOTES,
  OCTAVES,
} from '../../utils';

const meta: Meta = {
  title: 'Universal Notations/Grace Notes',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const NoteWithGraceNotes: Story = {
  args: {
    duration: 'quarter',
    note: 'C',
    octave: 5,
    grace: 'A,B',
    graceOctave: '4,4',
    graceArticulation: 'staccato,accent',
    graceType: 'acciaccatura',
    graceDuration: '',
    graceSlur: 'auto',
    graceDynamic: 'f',
    dynamic: 'p',
  },
  argTypes: {
    duration: { control: 'select', options: DURATIONS },
    note: { control: 'select', options: NOTES },
    octave: { control: 'select', options: OCTAVES },
    grace: { control: 'text' },
    graceOctave: { control: 'text' },
    graceArticulation: { control: 'text' },
    graceType: { control: 'select', options: GRACE_TYPES },
    graceDuration: { control: 'select', options: ['', ...GRACE_DURATIONS] },
    graceSlur: { control: 'select', options: GRACE_SLURS },
    graceDynamic: { control: 'select', options: ['', ...DYNAMICS] },
    dynamic: { control: 'select', options: ['', ...DYNAMICS] },
  },
  render: (args) => html`
    <music-staff clef="treble" time="4/4">
      <music-note
        duration=${args.duration}
        note=${args.note}
        octave=${args.octave}
        grace=${args.grace}
        grace-octave=${args.graceOctave}
        grace-articulation=${args.graceArticulation}
        grace-type=${args.graceType}
        grace-duration=${args.graceDuration}
        grace-slur=${args.graceSlur}
        grace-dynamic=${args.graceDynamic}
        dynamic=${args.dynamic}
      ></music-note>
    </music-staff>
  `,
};

export const GraceNoteGallery: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <!-- single acciaccatura (slashed eighth) -->
      <music-note note="C" octave="5" grace="B" grace-octave="4"></music-note>
      <!-- single appoggiatura, no slash, with its own dynamic under the
           grace note and the main note's dynamic under itself -->
      <music-note
        note="C"
        octave="5"
        grace="B"
        grace-octave="4"
        grace-type="appoggiatura"
        grace-dynamic="f"
        dynamic="p"
      ></music-note>
      <!-- quarter appoggiatura: bare stem, no flag -->
      <music-note
        note="G"
        octave="4"
        grace="A"
        grace-octave="4"
        grace-type="appoggiatura"
        grace-duration="quarter"
      ></music-note>
      <!-- sixteenth appoggiatura: two flags -->
      <music-note
        note="G"
        octave="4"
        grace="A"
        grace-octave="4"
        grace-type="appoggiatura"
        grace-duration="sixteenth"
      ></music-note>
    </music-staff>
    <music-staff clef="treble" time="4/4">
      <!-- two-note run, default two beams, each grace note with its own mark -->
      <music-note
        note="C"
        octave="5"
        grace="A,B"
        grace-octave="4,4"
        grace-articulation="staccato,accent"
      ></music-note>
      <!-- four-note run, marks on the first and last grace notes only -->
      <music-note
        note="G"
        octave="4"
        grace="C,D,E,F"
        grace-octave="4,4,4,4"
        grace-articulation="tenuto,,,marcato"
      ></music-note>
      <!-- thirtysecond run: three beams -->
      <music-note
        note="C"
        octave="5"
        grace="G,A,B"
        grace-octave="4,4,4"
        grace-duration="thirtysecond"
      ></music-note>
      <!-- grace with accidental -->
      <music-note note="G" octave="4" grace="F#" grace-octave="4"></music-note>
    </music-staff>
    <music-staff clef="treble" time="4/4">
      <!-- grace before a stem-down main note (grace stays stem-up) -->
      <music-note
        note="B"
        octave="5"
        grace="A,B"
        grace-octave="5,5"
      ></music-note>
      <!-- main note with accidental: slur arcs above, grace sits left of the sharp -->
      <music-note note="F#" octave="5" grace="E" grace-octave="5"></music-note>
      <!-- consecutive graced notes (spacing) -->
      <music-note note="E" octave="4" grace="D" grace-octave="4"></music-note>
      <music-note
        note="G"
        octave="4"
        grace="F,E"
        grace-octave="4,4"
      ></music-note>
    </music-staff>
    <music-staff clef="treble" time="4/4">
      <!-- high grace pitches on ledger lines -->
      <music-note note="A" octave="5" grace="C" grace-octave="6"></music-note>
      <!-- low grace pitch on ledger lines -->
      <music-note note="E" octave="4" grace="C" grace-octave="4"></music-note>
      <!-- grace-octave omitted: grace note defaults to the main note's own octave -->
      <music-note note="C" octave="5" grace="B"></music-note>
    </music-staff>
  `,
};

export const ChordWithGraceNotes: Story = {
  args: {
    grace: 'D,E',
    graceOctave: '4,4',
    graceArticulation: 'staccato,accent',
    graceType: 'acciaccatura',
    graceDynamic: 'f',
    dynamic: 'p',
  },
  argTypes: {
    grace: { control: 'text' },
    graceOctave: { control: 'text' },
    graceArticulation: { control: 'text' },
    graceType: { control: 'select', options: GRACE_TYPES },
    graceDynamic: { control: 'select', options: ['', ...DYNAMICS] },
    dynamic: { control: 'select', options: ['', ...DYNAMICS] },
  },
  render: (args) => html`
    <music-staff clef="treble" time="4/4">
      <music-chord
        grace=${args.grace}
        grace-octave=${args.graceOctave}
        grace-articulation=${args.graceArticulation}
        grace-type=${args.graceType}
        grace-dynamic=${args.graceDynamic}
        dynamic=${args.dynamic}
      >
        <music-note note="C" octave="4"></music-note>
        <music-note note="E" octave="4"></music-note>
        <music-note note="G" octave="4"></music-note>
      </music-chord>
      <!-- chord with accidentals: grace sits left of the accidental column -->
      <music-chord grace="C,D" grace-octave="4,4">
        <music-note note="C#" octave="4"></music-note>
        <music-note note="E" octave="4"></music-note>
        <music-note note="G#" octave="4"></music-note>
      </music-chord>
      <!-- grace-octave omitted: defaults to the reference note's own octave -->
      <music-chord grace="B,C">
        <music-note note="C" octave="4"></music-note>
        <music-note note="E" octave="4"></music-note>
        <music-note note="G" octave="4"></music-note>
      </music-chord>
    </music-staff>
  `,
};
