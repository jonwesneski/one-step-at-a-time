import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';

const meta: Meta = {
  title: 'Components/MusicComposition',
  tags: ['autodocs'],
  render: (args) => html`
    <music-composition
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-measure>
        <music-staff-treble
          keySig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="C" duration="quarter"></music-note>
          <music-note note="E" duration="quarter"></music-note>
          <music-note note="G" duration="quarter"></music-note>
          <music-note note="C" duration="quarter"></music-note>
        </music-staff-treble>
      </music-measure>
      <music-measure>
        <music-staff-treble
          keySig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="D" duration="quarter"></music-note>
          <music-note note="F" duration="quarter"></music-note>
          <music-note note="A" duration="quarter"></music-note>
          <music-note note="D" duration="quarter"></music-note>
        </music-staff-treble>
      </music-measure>
    </music-composition>
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
      options: ['major', 'minor'],
    },
    time: { control: 'text' },
  },
  args: {
    keySig: 'C',
    mode: 'major',
    time: '4/4',
  },
};
export default meta;

type Story = StoryObj;

export const SingleMeasure: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-composition
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-measure>
        <music-staff-treble
          keySig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="C" duration="quarter"></music-note>
          <music-note note="E" duration="quarter"></music-note>
          <music-note note="G" duration="quarter"></music-note>
          <music-note note="C" duration="quarter"></music-note>
        </music-staff-treble>
      </music-measure>
    </music-composition>
  `,
};

export const MultipleMeasures: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
};

export const TrebleAndBass: Story = {
  args: { keySig: 'G', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-composition
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-measure>
        <music-staff-treble
          keySig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="G" duration="quarter"></music-note>
          <music-note note="B" duration="quarter"></music-note>
          <music-note note="D" duration="quarter"></music-note>
          <music-note note="G" duration="quarter"></music-note>
        </music-staff-treble>
        <music-staff-bass
          keySig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="G" duration="half"></music-note>
          <music-note note="D" duration="half"></music-note>
        </music-staff-bass>
      </music-measure>
      <music-measure>
        <music-staff-treble
          keySig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="A" duration="quarter"></music-note>
          <music-note note="C" duration="quarter"></music-note>
          <music-note note="E" duration="quarter"></music-note>
          <music-note note="A" duration="quarter"></music-note>
        </music-staff-treble>
        <music-staff-bass
          keySig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="A" duration="half"></music-note>
          <music-note note="E" duration="half"></music-note>
        </music-staff-bass>
      </music-measure>
    </music-composition>
  `,
};

export const WithTies: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-composition
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-measure>
        <music-staff-treble
          keySig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note
            note="C"
            octave="5"
            duration="quarter"
            tie="start"
          ></music-note>
          <music-note
            note="C"
            octave="5"
            duration="quarter"
            tie="end"
          ></music-note>
          <music-note
            note="C"
            octave="4"
            duration="quarter"
            tie="start"
          ></music-note>
          <music-note
            note="C"
            octave="4"
            duration="quarter"
            tie="end"
          ></music-note>
        </music-staff-treble>
      </music-measure>
    </music-composition>
  `,
};

export const WithSlurs: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-composition
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-measure>
        <music-staff-treble
          keySig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note
            note="C"
            octave="5"
            duration="eighth"
            slur="start"
          ></music-note>
          <music-note note="D" octave="5" duration="eighth"></music-note>
          <music-note note="E" octave="5" duration="eighth"></music-note>
          <music-note
            note="F"
            octave="5"
            duration="eighth"
            slur="end"
          ></music-note>
          <music-note
            note="C"
            octave="4"
            duration="eighth"
            slur="start"
          ></music-note>
          <music-note note="D" octave="4" duration="eighth"></music-note>
          <music-note note="E" octave="4" duration="eighth"></music-note>
          <music-note
            note="F"
            octave="4"
            duration="eighth"
            slur="end"
          ></music-note>
        </music-staff-treble>
      </music-measure>
    </music-composition>
  `,
};

export const WithNestedSlurs: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-composition
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-measure>
        <music-staff-treble
          keySig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note
            note="C"
            octave="5"
            duration="eighth"
            slur="start"
          ></music-note>
          <music-note
            note="D"
            octave="5"
            duration="eighth"
            slur="start"
          ></music-note>
          <music-note note="E" octave="5" duration="eighth"></music-note>
          <music-note
            note="F"
            octave="5"
            duration="eighth"
            slur="end"
          ></music-note>
          <music-note note="G" octave="5" duration="eighth"></music-note>
          <music-note note="A" octave="5" duration="eighth"></music-note>
          <music-note note="B" octave="5" duration="eighth"></music-note>
          <music-note
            note="C"
            octave="6"
            duration="eighth"
            slur="end"
          ></music-note>
        </music-staff-treble>
      </music-measure>
    </music-composition>
  `,
};

export const WithCrossMeasureTie: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-composition
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-measure>
        <music-staff-treble
          keySig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="C" octave="5" duration="quarter"></music-note>
          <music-note note="E" octave="5" duration="quarter"></music-note>
          <music-note note="G" octave="5" duration="quarter"></music-note>
          <music-note
            note="C"
            octave="5"
            duration="quarter"
            tie="start"
          ></music-note>
        </music-staff-treble>
      </music-measure>
      <music-measure>
        <music-staff-treble
          keySig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note
            note="C"
            octave="5"
            duration="half"
            tie="end"
          ></music-note>
          <music-note note="E" octave="5" duration="quarter"></music-note>
          <music-note note="G" octave="5" duration="quarter"></music-note>
        </music-staff-treble>
      </music-measure>
    </music-composition>
  `,
};

export const WithCrossRowTie: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <div style="max-width: 420px;">
      <music-composition
        keySig=${args.keySig}
        mode=${args.mode}
        time=${args.time}
      >
        <music-measure>
          <music-staff-treble
            keySig=${args.keySig}
            mode=${args.mode}
            time=${args.time}
          >
            <music-note note="C" octave="5" duration="quarter"></music-note>
            <music-note note="E" octave="5" duration="quarter"></music-note>
            <music-note note="G" octave="5" duration="quarter"></music-note>
            <music-note
              note="C"
              octave="5"
              duration="quarter"
              tie="start"
            ></music-note>
          </music-staff-treble>
        </music-measure>
        <music-measure>
          <music-staff-treble
            keySig=${args.keySig}
            mode=${args.mode}
            time=${args.time}
          >
            <music-note
              note="C"
              octave="5"
              duration="half"
              tie="end"
            ></music-note>
            <music-note note="E" octave="5" duration="half"></music-note>
          </music-staff-treble>
        </music-measure>
      </music-composition>
    </div>
  `,
};

export const ChordWithPartialTie: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-composition
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-measure>
        <music-staff-treble
          keySig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-chord duration="half">
            <music-note
              note="G"
              octave="5"
              duration="half"
              tie="start"
            ></music-note>
            <music-note note="E" octave="5" duration="half"></music-note>
            <music-note note="C" octave="5" duration="half"></music-note>
          </music-chord>
          <music-chord duration="half">
            <music-note
              note="G"
              octave="5"
              duration="half"
              tie="end"
            ></music-note>
            <music-note note="E" octave="5" duration="half"></music-note>
            <music-note note="C" octave="5" duration="half"></music-note>
          </music-chord>
        </music-staff-treble>
      </music-measure>
    </music-composition>
  `,
};

export const ChordWithTie: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-composition
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-measure>
        <music-staff-treble
          keySig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-chord duration="half" tie="start">
            <music-note note="C" octave="5" duration="half"></music-note>
            <music-note note="E" octave="5" duration="half"></music-note>
            <music-note note="G" octave="5" duration="half"></music-note>
          </music-chord>
          <music-chord duration="half" tie="end">
            <music-note note="C" octave="5" duration="half"></music-note>
            <music-note note="E" octave="5" duration="half"></music-note>
            <music-note note="G" octave="5" duration="half"></music-note>
          </music-chord>
        </music-staff-treble>
      </music-measure>
    </music-composition>
  `,
};

export const WithCrossSystemHairpin: Story = {
  render: () => html`
    <div style="max-width: 200px;">
      <music-composition keySig="C" mode="major" time="4/4">
        <music-measure>
          <music-staff-treble keySig="C" mode="major" time="4/4">
            <music-note
              note="C"
              octave="5"
              duration="quarter"
              dynamic="p"
              crescendo="start"
            ></music-note>
            <music-note note="D" octave="5" duration="quarter"></music-note>
            <music-note note="E" octave="5" duration="quarter"></music-note>
            <music-note note="F" octave="5" duration="quarter"></music-note>
          </music-staff-treble>
        </music-measure>
        <music-measure>
          <music-staff-treble keySig="C" mode="major" time="4/4">
            <music-note note="G" octave="5" duration="quarter"></music-note>
            <music-note note="A" octave="5" duration="quarter"></music-note>
            <music-note note="B" octave="5" duration="quarter"></music-note>
            <music-note
              note="C"
              octave="6"
              duration="quarter"
              dynamic="f"
              crescendo="end"
            ></music-note>
          </music-staff-treble>
        </music-measure>
      </music-composition>
    </div>
  `,
};

export const ChordWithSlur: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-composition
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-measure>
        <music-staff-treble
          keySig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-chord duration="quarter" slur="start">
            <music-note note="C" octave="5" duration="quarter"></music-note>
            <music-note note="E" octave="5" duration="quarter"></music-note>
            <music-note note="G" octave="5" duration="quarter"></music-note>
          </music-chord>
          <music-chord duration="quarter">
            <music-note note="D" octave="5" duration="quarter"></music-note>
            <music-note note="F" octave="5" duration="quarter"></music-note>
            <music-note note="A" octave="5" duration="quarter"></music-note>
          </music-chord>
          <music-chord duration="quarter">
            <music-note note="E" octave="5" duration="quarter"></music-note>
            <music-note note="G" octave="5" duration="quarter"></music-note>
            <music-note note="B" octave="5" duration="quarter"></music-note>
          </music-chord>
          <music-chord duration="quarter" slur="end">
            <music-note note="F" octave="5" duration="quarter"></music-note>
            <music-note note="A" octave="5" duration="quarter"></music-note>
            <music-note note="C" octave="6" duration="quarter"></music-note>
          </music-chord>
        </music-staff-treble>
      </music-measure>
    </music-composition>
  `,
};
