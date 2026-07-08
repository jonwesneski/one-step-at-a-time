import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';
import { ARTICULATIONS, DURATIONS, NOTES, OCTAVES, STRESSES } from '../utils';

const meta: Meta = {
  title: 'Components/Note',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const Standalone: Story = {
  args: {
    duration: 'quarter',
  },
  argTypes: {
    duration: { control: 'select', options: DURATIONS },
  },
  render: (args) => html`<music-note duration=${args.duration}></music-note>`,
};

export const WithArticulations: Story = {
  args: {
    duration: 'quarter',
    note: 'G',
    octave: 4,
    articulation: 'staccato',
    stress: '',
  },
  argTypes: {
    duration: { control: 'select', options: DURATIONS },
    note: { control: 'select', options: NOTES },
    octave: { control: 'select', options: OCTAVES },
    articulation: { control: 'select', options: ['', ...ARTICULATIONS] },
    stress: { control: 'select', options: ['', ...STRESSES] },
  },
  render: (args) => html`
    <music-staff-treble time="4/4">
      <music-note
        duration=${args.duration}
        note=${args.note}
        octave=${args.octave}
        articulation=${args.articulation}
        stress=${args.stress}
      ></music-note>
    </music-staff-treble>
  `,
};

export const ArticulationGallery: Story = {
  render: () => html`
    <music-staff-treble time="4/4">
      <music-note note="G" octave="4" articulation="accent"></music-note>
      <music-note note="G" octave="4" articulation="marcato"></music-note>
      <music-note note="G" octave="4" articulation="staccato"></music-note>
      <music-note note="G" octave="4" articulation="staccatissimo"></music-note>
      <music-note note="G" octave="4" articulation="tenuto"></music-note>
      <music-note note="G" octave="4" articulation="portato"></music-note>
      <music-note
        note="G"
        octave="4"
        articulation="tenuto-staccatissimo"
      ></music-note>
      <music-note
        note="G"
        octave="4"
        articulation="marcato-staccato"
      ></music-note>
      <music-note note="G" octave="4" articulation="fermata"></music-note>
      <music-note
        note="G"
        octave="4"
        articulation="accent-fermata"
      ></music-note>
      <music-note note="G" octave="4" stress="stressed"></music-note>
      <music-note note="G" octave="4" stress="unstressed"></music-note>
    </music-staff-treble>
  `,
};

export const InStaff: Story = {
  args: {
    duration1: 'quarter',
    note1: 'C',
    octave1: 4,
    duration2: 'eighth',
    note2: 'E',
    octave2: 4,
    duration3: 'half',
    note3: 'G',
    octave3: 4,
    duration4: 'quarter',
    note4: 'A',
    octave4: 4,
  },
  argTypes: {
    duration1: { control: 'select', options: DURATIONS },
    note1: { control: 'select', options: NOTES },
    octave1: { control: 'select', options: OCTAVES },
    duration2: { control: 'select', options: DURATIONS },
    note2: { control: 'select', options: NOTES },
    octave2: { control: 'select', options: OCTAVES },
    duration3: { control: 'select', options: DURATIONS },
    note3: { control: 'select', options: NOTES },
    octave3: { control: 'select', options: OCTAVES },
    duration4: { control: 'select', options: DURATIONS },
    note4: { control: 'select', options: NOTES },
    octave4: { control: 'select', options: OCTAVES },
  },
  render: (args) => html`
    <music-staff-treble time="4/4">
      <music-note
        duration=${args.duration1}
        note=${args.note1}
        octave=${args.octave1}
      ></music-note>
      <music-note
        duration=${args.duration2}
        note=${args.note2}
        octave=${args.octave2}
      ></music-note>
      <music-note
        duration=${args.duration3}
        note=${args.note3}
        octave=${args.octave3}
      ></music-note>
      <music-note
        duration=${args.duration4}
        note=${args.note4}
        octave=${args.octave4}
      ></music-note>
    </music-staff-treble>
  `,
};
