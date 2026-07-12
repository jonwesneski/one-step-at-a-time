import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';
import { DYNAMICS, MODES, NOTES, TIMES } from '../utils';

const HAIRPIN_ROLES = ['start', 'end'] as const;

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
  args: { keySig: 'C', mode: 'major' },
  render: (args) => html`
    <music-staff-treble keySig=${args.keySig} mode=${args.mode} time="6/4">
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

export const WithDynamics: Story = {
  args: {
    dynamic1: 'pp',
    dynamic2: 'mf',
    dynamic3: 'f',
    dynamic4: 'sfz',
  },
  argTypes: {
    dynamic1: { control: 'select', options: DYNAMICS },
    dynamic2: { control: 'select', options: DYNAMICS },
    dynamic3: { control: 'select', options: DYNAMICS },
    dynamic4: { control: 'select', options: DYNAMICS },
  },
  render: (args) => html`
    <music-staff-treble keySig="C" mode="major" time="4/4">
      <music-note
        duration="quarter"
        note="C"
        octave="5"
        dynamic=${args.dynamic1}
      ></music-note>
      <music-note
        duration="quarter"
        note="E"
        octave="5"
        dynamic=${args.dynamic2}
      ></music-note>
      <music-note
        duration="quarter"
        note="G"
        octave="5"
        dynamic=${args.dynamic3}
      ></music-note>
      <music-note
        duration="quarter"
        note="B"
        octave="4"
        dynamic=${args.dynamic4}
      ></music-note>
    </music-staff-treble>
  `,
};

export const WithDynamicsAndHairpin: Story = {
  args: {
    dynamic1: 'p',
    crescendo1: 'start',
    dynamic2: 'f',
    crescendo2: 'end',
    dynamic3: 'ff',
    decrescendo3: 'start',
    dynamic4: 'p',
    decrescendo4: 'end',
  },
  argTypes: {
    dynamic1: {
      control: { type: 'select', labels: { '': 'None' } },
      options: ['', ...DYNAMICS],
    },
    crescendo1: { control: 'select', options: HAIRPIN_ROLES },
    dynamic2: {
      control: { type: 'select', labels: { '': 'None' } },
      options: ['', ...DYNAMICS],
    },
    crescendo2: { control: 'select', options: HAIRPIN_ROLES },
    dynamic3: {
      control: { type: 'select', labels: { '': 'None' } },
      options: ['', ...DYNAMICS],
    },
    decrescendo3: { control: 'select', options: HAIRPIN_ROLES },
    dynamic4: {
      control: { type: 'select', labels: { '': 'None' } },
      options: ['', ...DYNAMICS],
    },
    decrescendo4: { control: 'select', options: HAIRPIN_ROLES },
  },
  render: (args) => html`
    <music-staff-treble keySig="C" mode="major" time="4/4">
      <music-note
        duration="quarter"
        note="C"
        octave="5"
        dynamic=${args.dynamic1}
        crescendo=${args.crescendo1}
      ></music-note>
      <music-note duration="quarter" note="D" octave="5"></music-note>
      <music-note duration="quarter" note="E" octave="5"></music-note>
      <music-note
        duration="quarter"
        note="F"
        octave="5"
        dynamic=${args.dynamic2}
        crescendo=${args.crescendo2}
      ></music-note>
    </music-staff-treble>
    <music-staff-treble
      keySig="C"
      mode="major"
      time="4/4"
      style="margin-top: 1rem"
    >
      <music-note
        duration="quarter"
        note="G"
        octave="5"
        dynamic=${args.dynamic3}
        decrescendo=${args.decrescendo3}
      ></music-note>
      <music-note duration="quarter" note="F" octave="5"></music-note>
      <music-note duration="quarter" note="E" octave="5"></music-note>
      <music-note
        duration="quarter"
        note="D"
        octave="5"
        dynamic=${args.dynamic4}
        decrescendo=${args.decrescendo4}
      ></music-note>
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
