import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';
import { MODES } from '../utils';

const meta: Meta = {
  title: 'Components/StaffTreble',
  tags: ['autodocs'],
  render: (args) => html`
    <music-staff-treble
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-note note="C" duration="quarter"></music-note>
      <music-note note="E" duration="quarter"></music-note>
      <music-note note="C" octave="5" duration="quarter"></music-note>
      <music-note note="E" octave="5" duration="quarter"></music-note>
    </music-staff-treble>
  `,
  argTypes: {
    keySig: {
      control: 'select',
      options: [
        'C',
        'G',
        'D',
        'A',
        'E',
        'B',
        'F#',
        'C#',
        'F',
        'Bb',
        'Eb',
        'Ab',
        'Db',
        'Gb',
        'Cb',
      ],
    },
    mode: {
      control: 'radio',
      options: MODES,
    },
    time: {
      control: 'text',
    },
  },
  args: {
    keySig: 'C',
    mode: 'major',
    time: '4/4',
  },
};
export default meta;

type Story = StoryObj;

export const Plain: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
};

export const WithBeamedEighthNotes: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-staff-treble
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-note note="C" duration="eighth"></music-note>
      <music-note note="D" duration="eighth"></music-note>
      <music-note note="E" duration="eighth"></music-note>
      <music-note note="F" duration="eighth"></music-note>
      <music-note note="G" duration="eighth"></music-note>
      <music-note note="A" duration="eighth"></music-note>
      <music-note note="B" duration="eighth"></music-note>
      <music-note note="C" duration="eighth"></music-note>
    </music-staff-treble>
  `,
};

export const WithChords: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-staff-treble
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-chord duration="quarter">
        <music-note note="C" duration="quarter"></music-note>
        <music-note note="E" duration="quarter"></music-note>
        <music-note note="G" duration="quarter"></music-note>
      </music-chord>
      <music-note note="E" duration="quarter"></music-note>
      <music-note note="F" duration="quarter"></music-note>
      <music-note note="G" duration="quarter"></music-note>
    </music-staff-treble>
  `,
};

export const ThreeQuarterTime: Story = {
  args: { keySig: 'C', mode: 'major', time: '3/4' },
  render: (args) => html`
    <music-staff-treble
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-note note="G" duration="quarter"></music-note>
      <music-note note="E" duration="quarter"></music-note>
      <music-note note="C" duration="quarter"></music-note>
    </music-staff-treble>
  `,
};

export const WithLedgerLines: Story = {
  args: { keySig: 'C', mode: 'major', time: '6/4' },
  render: (args) => html`
    <music-staff-treble
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
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
    </music-staff-treble>
  `,
};

export const WithAccidentals: Story = {
  args: { keySig: 'C', mode: 'major', time: '5/4' },
  render: (args) => html`
    <music-staff-treble
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-note note="F#" octave="4" duration="quarter"></music-note>
      <music-note note="Bb" octave="4" duration="quarter"></music-note>
      <music-note note="B" octave="4" duration="quarter"></music-note>
      <music-note note="C##" octave="5" duration="quarter"></music-note>
      <music-note note="Bbb" octave="4" duration="quarter"></music-note>
    </music-staff-treble>
  `,
};

export const WithTriplets: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-staff-treble
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-tuplet ratio="3">
        <music-note note="C" octave="4" duration="eighth"></music-note>
        <music-note note="D" octave="4" duration="eighth"></music-note>
        <music-note note="E" octave="4" duration="eighth"></music-note>
      </music-tuplet>
      <music-note note="F" octave="4" duration="quarter"></music-note>
      <music-tuplet ratio="3">
        <music-note note="G" octave="4" duration="eighth"></music-note>
        <music-note note="A" octave="4" duration="eighth"></music-note>
        <music-note note="B" octave="4" duration="eighth"></music-note>
      </music-tuplet>
    </music-staff-treble>
  `,
};

export const WithQuintuplet: Story = {
  args: { keySig: 'C', mode: 'major', time: '5/4' },
  render: (args) => html`
    <music-staff-treble
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-tuplet ratio="5:4">
        <music-note note="G" octave="5" duration="sixteenth"></music-note>
        <music-note note="F" octave="5" duration="sixteenth"></music-note>
        <music-note note="E" octave="5" duration="sixteenth"></music-note>
        <music-note note="D" octave="5" duration="sixteenth"></music-note>
        <music-note note="C" octave="5" duration="sixteenth"></music-note>
      </music-tuplet>
      <music-note note="B" octave="4" duration="quarter"></music-note>
      <music-note note="A" octave="4" duration="quarter"></music-note>
      <music-note note="G" octave="4" duration="quarter"></music-note>
      <music-note note="F" octave="4" duration="quarter"></music-note>
    </music-staff-treble>
  `,
};
