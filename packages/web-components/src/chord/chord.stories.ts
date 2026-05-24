import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';
import { DURATIONS, NOTES, OCTAVES } from '../utils';

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
  title: 'Components/MusicChord',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const StandaloneChordAttribute: Story = {
  args: {
    chord: 'Cmaj',
    duration: 'quarter',
  },
  argTypes: {
    chord: { control: 'select', options: CHORDS },
    duration: { control: 'select', options: DURATIONS },
  },
  render: (args) =>
    html`<music-chord
      chord=${args.chord}
      duration=${args.duration}
    ></music-chord>`,
};

export const StandaloneWithNotes: Story = {
  args: {
    duration: 'quarter',
    note1: 'C',
    octave1: 4,
    note2: 'E',
    octave2: 4,
    note3: 'G',
    octave3: 4,
  },
  argTypes: {
    duration: { control: 'select', options: DURATIONS },
    note1: { control: 'select', options: NOTES },
    octave1: { control: 'select', options: OCTAVES },
    note2: { control: 'select', options: NOTES },
    octave2: { control: 'select', options: OCTAVES },
    note3: { control: 'select', options: NOTES },
    octave3: { control: 'select', options: OCTAVES },
  },
  render: (args) => html`
    <music-chord duration=${args.duration}>
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

export const InStaff: Story = {
  args: {
    chord1: 'Cmaj',
    duration1: 'quarter',
    duration2: 'quarter',
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
    duration2: { control: 'select', options: DURATIONS },
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
      ></music-chord>
      <music-chord duration=${args.duration2}>
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
