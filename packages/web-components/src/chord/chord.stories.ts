import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../index';
import {
  ARPEGGIOS,
  ARTICULATIONS,
  DURATIONS,
  DYNAMICS,
  GRACE_TYPES,
  NOTES,
  OCTAVES,
} from '../utils';

const CHORDS = [
  'Cmaj',
  'Dmaj',
  'Emaj',
  'Fmaj',
  'Gmaj',
  'Amaj',
  'Bmaj',
  'Cmin',
  'Dmin',
  'Emin',
  'Amin',
  'C7',
  'Cmaj7',
];

const meta: Meta = {
  title: 'Components/Chord',
  component: 'music-chord',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const StandaloneChordAttribute: Story = {
  args: {
    chord: 'Cmaj',
    duration: 'quarter',
    articulation: 'staccato',
    arpeggio: '',
  },
  argTypes: {
    chord: { control: 'select', options: CHORDS },
    duration: { control: 'select', options: DURATIONS },
    articulation: { control: 'select', options: ['', ...ARTICULATIONS] },
    arpeggio: { control: 'select', options: ['', ...ARPEGGIOS] },
  },
  render: (args) =>
    html`<music-chord
      chord=${args.chord}
      duration=${args.duration}
      articulation=${args.articulation}
      arpeggio=${args.arpeggio}
    ></music-chord>`,
};

export const SempreArpeggiando: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-chord
        chord="Cmaj"
        duration="quarter"
        arpeggiate="start"
      ></music-chord>
      <music-chord chord="Fmaj" duration="quarter"></music-chord>
      <music-chord
        chord="Gmaj"
        duration="quarter"
        arpeggio="non-arpeggiate"
      ></music-chord>
      <music-chord chord="Cmaj" duration="quarter"></music-chord>
    </music-staff>
  `,
};

export const Arpeggiated: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-chord chord="Cmaj7" duration="quarter" arpeggio="up"></music-chord>
      <music-chord
        chord="Cmaj7"
        duration="quarter"
        arpeggio="up-arrow"
      ></music-chord>
      <music-chord
        chord="Cmaj7"
        duration="quarter"
        arpeggio="down"
      ></music-chord>
      <music-chord
        chord="Cmaj7"
        duration="quarter"
        arpeggio="non-arpeggiate"
      ></music-chord>
    </music-staff>
    <music-staff clef="treble" time="4/4">
      <music-chord duration="whole" arpeggio="up-arrow" grace="F#,G">
        <music-note note="D#" octave="4"></music-note>
        <music-note note="F#" octave="4"></music-note>
        <music-note note="A#" octave="4"></music-note>
        <music-note note="C#" octave="5"></music-note>
      </music-chord>
    </music-staff>
    <!-- A dynamic change during the roll: a vertical hairpin left of the sign,
         with a dynamic letter outside the staff at each end -->
    <music-staff clef="treble" time="4/4">
      <music-chord
        chord="Cmaj7"
        duration="whole"
        arpeggio="up"
        arpeggio-hairpin="crescendo"
        arpeggio-hairpin-from="p"
        arpeggio-hairpin-to="f"
      ></music-chord>
    </music-staff>
  `,
};

export const StandaloneWithNotes: Story = {
  args: {
    duration: 'quarter',
    articulation: 'accent',
    arpeggio: '',
    note1: 'C',
    octave1: 4,
    note2: 'E',
    octave2: 4,
    note3: 'G',
    octave3: 4,
  },
  argTypes: {
    duration: { control: 'select', options: DURATIONS },
    articulation: { control: 'select', options: ['', ...ARTICULATIONS] },
    arpeggio: { control: 'select', options: ['', ...ARPEGGIOS] },
    note1: { control: 'select', options: NOTES },
    octave1: { control: 'select', options: OCTAVES },
    note2: { control: 'select', options: NOTES },
    octave2: { control: 'select', options: OCTAVES },
    note3: { control: 'select', options: NOTES },
    octave3: { control: 'select', options: OCTAVES },
  },
  render: (args) => html`
    <music-chord
      duration=${args.duration}
      articulation=${args.articulation}
      arpeggio=${args.arpeggio}
    >
      <music-note
        note=${args.note1}
        octave=${args.octave1}
        duration=${args.duration}
      ></music-note>
      <music-note
        note=${args.note2}
        octave=${args.octave2}
        duration=${args.duration}
      ></music-note>
      <music-note
        note=${args.note3}
        octave=${args.octave3}
        duration=${args.duration}
      ></music-note>
    </music-chord>
  `,
};

export const WithGraceNotes: Story = {
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

export const StandaloneWithGraceNotes: Story = {
  render: () => html`
    <div style="padding: 40px">
      <music-chord
        grace="B,C"
        grace-octave="3,4"
        grace-articulation="tenuto,accent"
      >
        <music-note note="C" octave="4"></music-note>
        <music-note note="E" octave="4"></music-note>
        <music-note note="G" octave="4"></music-note>
      </music-chord>
    </div>
  `,
};

export const InStaff: Story = {
  args: {
    chord1: 'Cmaj',
    duration1: 'quarter',
    articulation1: 'marcato',
    arpeggio1: 'up',
    duration2: 'quarter',
    articulation2: 'tenuto',
    arpeggio2: 'down',
    note1: 'C',
    octave1: 4,
    note2: 'E',
    octave2: 4,
    note3: 'G',
    octave3: 4,
  },
  argTypes: {
    chord1: { control: 'select', options: CHORDS },
    duration1: { control: 'select', options: DURATIONS },
    articulation1: { control: 'select', options: ['', ...ARTICULATIONS] },
    arpeggio1: { control: 'select', options: ['', ...ARPEGGIOS] },
    duration2: { control: 'select', options: DURATIONS },
    articulation2: { control: 'select', options: ['', ...ARTICULATIONS] },
    arpeggio2: { control: 'select', options: ['', ...ARPEGGIOS] },
    note1: { control: 'select', options: NOTES },
    octave1: { control: 'select', options: OCTAVES },
    note2: { control: 'select', options: NOTES },
    octave2: { control: 'select', options: OCTAVES },
    note3: { control: 'select', options: NOTES },
    octave3: { control: 'select', options: OCTAVES },
  },
  render: (args) => html`
    <music-staff clef="treble" time="4/4">
      <music-chord
        chord=${args.chord1}
        duration=${args.duration1}
        articulation=${args.articulation1}
        arpeggio=${args.arpeggio1}
      ></music-chord>
      <music-chord
        duration=${args.duration2}
        articulation=${args.articulation2}
        arpeggio=${args.arpeggio2}
      >
        <music-note
          note=${args.note1}
          octave=${args.octave1}
          duration=${args.duration2}
        ></music-note>
        <music-note
          note=${args.note2}
          octave=${args.octave2}
          duration=${args.duration2}
        ></music-note>
        <music-note
          note=${args.note3}
          octave=${args.octave3}
          duration=${args.duration2}
        ></music-note>
      </music-chord>
    </music-staff>
  `,
};
