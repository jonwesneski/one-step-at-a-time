import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../index';
import { CLEFS, MODES, NOTES, TIMES } from '../utils';

const meta: Meta = {
  title: 'Staff',
  component: 'music-staff',
  tags: ['autodocs'],
  render: (args) => html`
    <music-staff
      clef=${args.clef}
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-note note="C" duration="quarter"></music-note>
      <music-note note="E" duration="quarter"></music-note>
      <music-note note="C" octave="5" duration="quarter"></music-note>
      <music-note note="E" octave="5" duration="quarter"></music-note>
    </music-staff>
  `,
  argTypes: {
    clef: {
      control: 'radio',
      options: CLEFS,
    },
    keySig: {
      control: 'select',
      options: NOTES,
    },
    mode: {
      control: 'radio',
      options: MODES,
    },
    time: {
      control: 'select',
      options: TIMES,
    },
  },
  args: {
    clef: 'treble',
    keySig: 'C',
    mode: 'major',
    time: '4/4',
  },
};
export default meta;

type Story = StoryObj;

export const Plain: Story = {
  args: { clef: 'treble', keySig: 'C', mode: 'major', time: '4/4' },
};

export const BassClef: Story = {
  args: { clef: 'bass', keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-staff
      clef=${args.clef}
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-note note="C" duration="quarter"></music-note>
      <music-note note="E" duration="quarter"></music-note>
      <music-note note="G" duration="quarter"></music-note>
      <music-note note="C" duration="quarter"></music-note>
    </music-staff>
  `,
};

export const ThreeQuarterTime: Story = {
  args: { clef: 'treble', keySig: 'C', mode: 'major', time: '3/4' },
  render: (args) => html`
    <music-staff
      clef=${args.clef}
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-note note="G" duration="quarter"></music-note>
      <music-note note="E" duration="quarter"></music-note>
      <music-note note="C" duration="quarter"></music-note>
    </music-staff>
  `,
};

export const WithLedgerLines: Story = {
  args: { clef: 'treble', keySig: 'C', mode: 'major' },
  render: (args) => html`
    <music-staff
      clef=${args.clef}
      key-sig=${args.keySig}
      mode=${args.mode}
      time="6/4"
    >
      <music-note note="A" octave="5" duration="quarter"></music-note>
      <music-note note="C" octave="6" duration="quarter"></music-note>
      <music-note note="D" octave="4" duration="quarter"></music-note>
      <music-note note="C" octave="4" duration="quarter"></music-note>
      <music-chord duration="quarter">
        <music-note note="C" octave="4" duration="quarter"></music-note>
        <music-note note="D" octave="4" duration="quarter"></music-note>
      </music-chord>
      <music-chord duration="quarter">
        <music-note note="B" octave="5" duration="quarter"></music-note>
        <music-note note="C" octave="6" duration="quarter"></music-note>
      </music-chord>
    </music-staff>
  `,
};

export const WithAccidentals: Story = {
  args: { clef: 'treble', keySig: 'C', mode: 'major', time: '5/4' },
  render: (args) => html`
    <music-staff
      clef=${args.clef}
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-note note="F#" octave="4" duration="quarter"></music-note>
      <music-note note="Bb" octave="4" duration="quarter"></music-note>
      <music-note note="B" octave="4" duration="quarter"></music-note>
      <music-note note="C##" octave="5" duration="quarter"></music-note>
      <music-note note="Bbb" octave="4" duration="quarter"></music-note>
      <music-chord duration="quarter">
        <music-note note="C##" octave="3" duration="quarter"></music-note>
        <music-note note="Eb" octave="3" duration="quarter"></music-note>
        <music-note note="G#" octave="3" duration="quarter"></music-note>
      </music-chord>
    </music-staff>
  `,
};

export const SingleMeasure: Story = {
  args: { clef: 'treble', keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-staff
      clef=${args.clef}
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-note note="C" duration="quarter"></music-note>
      <music-note note="E" duration="quarter"></music-note>
      <music-note note="G" duration="quarter"></music-note>
      <music-note note="C" duration="quarter"></music-note>
    </music-staff>
  `,
};
