import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';

const meta: Meta = {
  title: 'Components/Measure',
  tags: ['autodocs'],
  render: (args) => html`
    <music-measure
      number=${args.number}
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-staff
        clef="treble"
        keySig=${args.keySig}
        mode=${args.mode}
        time=${args.time}
      >
        <music-note note="C" duration="quarter"></music-note>
        <music-note note="E" duration="quarter"></music-note>
        <music-note note="G" duration="quarter"></music-note>
        <music-note note="C" duration="quarter"></music-note>
      </music-staff>
    </music-measure>
  `,
  argTypes: {
    number: { control: 'number' },
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
      options: ['major', 'minor'],
    },
    time: { control: 'text' },
  },
  args: {
    number: 1,
    keySig: 'C',
    mode: 'major',
    time: '4/4',
  },
};
export default meta;

type Story = StoryObj;

export const TrebleOnly: Story = {
  args: { number: 1, keySig: 'C', mode: 'major', time: '4/4' },
};

export const TrebleAndBass: Story = {
  args: { number: 1, keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-measure
      number=${args.number}
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-staff
        clef="treble"
        keySig=${args.keySig}
        mode=${args.mode}
        time=${args.time}
      >
        <music-note note="C" duration="quarter"></music-note>
        <music-note note="E" duration="quarter"></music-note>
        <music-note note="G" duration="quarter"></music-note>
        <music-note note="C" duration="quarter"></music-note>
      </music-staff>
      <music-staff
        clef="bass"
        keySig=${args.keySig}
        mode=${args.mode}
        time=${args.time}
      >
        <music-note note="C" duration="half"></music-note>
        <music-note note="G" duration="half"></music-note>
      </music-staff>
    </music-measure>
  `,
};

export const GrandStaffBrace: Story = {
  args: { number: 1, keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-measure
      number=${args.number}
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-staff
        clef="treble"
        group="grand"
        keySig=${args.keySig}
        mode=${args.mode}
        time=${args.time}
      >
        <music-note note="C" duration="quarter"></music-note>
        <music-note note="E" duration="quarter"></music-note>
        <music-note note="G" duration="quarter"></music-note>
        <music-note note="C" duration="quarter"></music-note>
      </music-staff>
      <music-staff
        clef="bass"
        keySig=${args.keySig}
        mode=${args.mode}
        time=${args.time}
      >
        <music-note note="C" duration="half"></music-note>
        <music-note note="G" duration="half"></music-note>
      </music-staff>
    </music-measure>
  `,
};

export const TwoGrandStavesInOneMeasure: Story = {
  render: () => html`
    <music-measure number="1" keySig="C" mode="major" time="4/4">
      <music-staff
        clef="treble"
        group="grand"
        keySig="C"
        mode="major"
        time="4/4"
      >
        <music-note note="C" duration="whole"></music-note>
      </music-staff>
      <music-staff clef="bass" keySig="C" mode="major" time="4/4">
        <music-note note="C" duration="whole"></music-note>
      </music-staff>
      <music-staff
        clef="treble"
        group="grand"
        keySig="C"
        mode="major"
        time="4/4"
      >
        <music-note note="G" duration="whole"></music-note>
      </music-staff>
      <music-staff clef="bass" keySig="C" mode="major" time="4/4">
        <music-note note="G" duration="whole"></music-note>
      </music-staff>
    </music-measure>
  `,
};

export const PartBracket: Story = {
  render: () => html`
    <music-measure number="1" keySig="C" mode="major" time="4/4">
      <music-staff
        clef="treble"
        group="bracket"
        keySig="C"
        mode="major"
        time="4/4"
      >
        <music-note note="C" octave="5" duration="whole"></music-note>
      </music-staff>
      <music-staff clef="treble" keySig="C" mode="major" time="4/4">
        <music-note note="G" octave="4" duration="whole"></music-note>
      </music-staff>
    </music-measure>
  `,
};

export const WithGuitarTab: Story = {
  args: { number: 1, keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-measure
      number=${args.number}
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-staff
        clef="treble"
        keySig=${args.keySig}
        mode=${args.mode}
        time=${args.time}
      >
        <music-note note="E" duration="quarter"></music-note>
        <music-note note="G" duration="quarter"></music-note>
        <music-note note="B" duration="quarter"></music-note>
        <music-note note="E" duration="quarter"></music-note>
      </music-staff>
      <music-staff-guitar-tab>
        <music-guitar-note
          fret="0"
          string="1"
          duration="quarter"
        ></music-guitar-note>
        <music-guitar-note
          fret="3"
          string="2"
          duration="quarter"
        ></music-guitar-note>
        <music-guitar-note
          fret="2"
          string="3"
          duration="quarter"
        ></music-guitar-note>
        <music-guitar-note
          fret="0"
          string="4"
          duration="quarter"
        ></music-guitar-note>
      </music-staff-guitar-tab>
    </music-measure>
  `,
};
