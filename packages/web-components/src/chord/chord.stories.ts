import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';
import {
  ARTICULATIONS,
  DURATIONS,
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
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const StandaloneChordAttribute: Story = {
  args: {
    chord: 'Cmaj',
    duration: 'quarter',
    articulation: 'staccato',
  },
  argTypes: {
    chord: { control: 'select', options: CHORDS },
    duration: { control: 'select', options: DURATIONS },
    articulation: { control: 'select', options: ['', ...ARTICULATIONS] },
  },
  render: (args) =>
    html`<music-chord
      chord=${args.chord}
      duration=${args.duration}
      articulation=${args.articulation}
    ></music-chord>`,
};

export const StandaloneWithNotes: Story = {
  args: {
    duration: 'quarter',
    articulation: 'accent',
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
    note1: { control: 'select', options: NOTES },
    octave1: { control: 'select', options: OCTAVES },
    note2: { control: 'select', options: NOTES },
    octave2: { control: 'select', options: OCTAVES },
    note3: { control: 'select', options: NOTES },
    octave3: { control: 'select', options: OCTAVES },
  },
  render: (args) => html`
    <music-chord duration=${args.duration} articulation=${args.articulation}>
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
    graceType: 'acciaccatura',
  },
  argTypes: {
    grace: { control: 'text' },
    graceOctave: { control: 'text' },
    graceType: { control: 'select', options: GRACE_TYPES },
  },
  render: (args) => html`
    <music-staff-treble time="4/4">
      <music-chord
        grace=${args.grace}
        grace-octave=${args.graceOctave}
        grace-type=${args.graceType}
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
    </music-staff-treble>
  `,
};

export const StandaloneWithGraceNotes: Story = {
  render: () => html`
    <div style="padding: 40px">
      <music-chord grace="B,C" grace-octave="3,4">
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
    duration2: 'quarter',
    articulation2: 'tenuto',
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
    duration2: { control: 'select', options: DURATIONS },
    articulation2: { control: 'select', options: ['', ...ARTICULATIONS] },
    note1: { control: 'select', options: NOTES },
    octave1: { control: 'select', options: OCTAVES },
    note2: { control: 'select', options: NOTES },
    octave2: { control: 'select', options: OCTAVES },
    note3: { control: 'select', options: NOTES },
    octave3: { control: 'select', options: OCTAVES },
  },
  render: (args) => html`
    <music-staff-treble time="4/4">
      <music-chord
        chord=${args.chord1}
        duration=${args.duration1}
        articulation=${args.articulation1}
      ></music-chord>
      <music-chord
        duration=${args.duration2}
        articulation=${args.articulation2}
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
    </music-staff-treble>
  `,
};
