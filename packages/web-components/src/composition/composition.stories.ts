import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import '../index';
import { MEASURE_NUMBER_DISPLAYS } from '../utils/consts';

const meta: Meta = {
  title: 'Composition',
  component: 'music-composition',
  tags: ['autodocs'],
  render: (args) => html`
    <music-composition
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
      measure-numbers=${args.measureNumbers}
    >
      <music-measure>
        <music-staff
          clef="treble"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="C" duration="quarter"></music-note>
          <music-note note="E" duration="quarter"></music-note>
          <music-note note="G" duration="quarter"></music-note>
          <music-note note="C" duration="quarter"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff
          clef="treble"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="D" duration="quarter"></music-note>
          <music-note note="F" duration="quarter"></music-note>
          <music-note note="A" duration="quarter"></music-note>
          <music-note note="D" duration="quarter"></music-note>
        </music-staff>
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
    measureNumbers: {
      name: 'measure-numbers',
      control: 'select',
      options: MEASURE_NUMBER_DISPLAYS,
    },
  },
  args: {
    keySig: 'C',
    mode: 'major',
    time: '4/4',
    measureNumbers: 'none',
  },
};
export default meta;

type Story = StoryObj;

const MAX_WIDTH_ARG_TYPE = {
  name: 'max-width',
  description:
    'Caps .composition-wrapper width. Presets: a px cap, "none" (fill the container), or unset (falls back to the 900px default).',
  control: {
    type: 'radio' as const,
    labels: {
      '320': '320px — one measure per row',
      '520': '520px — default',
      none: 'none — fill container',
      unset: 'unset — 900px default',
    },
  },
  options: ['320', '520', 'none', 'unset'],
  mapping: { unset: undefined },
};

export const MultipleMeasuresSingleStaff: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4', maxWidth: '520' },
  argTypes: { maxWidth: MAX_WIDTH_ARG_TYPE },
  render: (args) => html`
    <music-composition
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
      max-width=${ifDefined(args.maxWidth)}
      measure-numbers=${args.measureNumbers}
    >
      ${[0, 1, 2, 3, 4].map(
        () => html`
          <music-measure>
            <music-staff
              clef="treble"
              key-sig=${args.keySig}
              mode=${args.mode}
              time=${args.time}
            >
              <music-note note="C" duration="quarter"></music-note>
              <music-note note="E" duration="quarter"></music-note>
              <music-note note="G" duration="quarter"></music-note>
              <music-note note="E" duration="quarter"></music-note>
            </music-staff>
          </music-measure>
        `
      )}
    </music-composition>
  `,
};

export const MultipleMeasuresTwoStaves: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4', maxWidth: '520' },
  argTypes: { maxWidth: MAX_WIDTH_ARG_TYPE },
  render: (args) => html`
    <music-composition
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
      max-width=${ifDefined(args.maxWidth)}
      measure-numbers=${args.measureNumbers}
    >
      ${[0, 1, 2, 3, 4].map(
        () => html`
          <music-measure>
            <music-staff
              clef="treble"
              key-sig=${args.keySig}
              mode=${args.mode}
              time=${args.time}
            >
              <music-note note="C" octave="5" duration="quarter"></music-note>
              <music-note note="E" octave="5" duration="quarter"></music-note>
              <music-note note="G" octave="5" duration="quarter"></music-note>
              <music-note note="E" octave="5" duration="quarter"></music-note>
            </music-staff>
            <music-staff
              clef="bass"
              key-sig=${args.keySig}
              mode=${args.mode}
              time=${args.time}
            >
              <music-note note="C" octave="3" duration="half"></music-note>
              <music-note note="G" octave="3" duration="half"></music-note>
            </music-staff>
          </music-measure>
        `
      )}
    </music-composition>
  `,
};

export const CrossMeasureTie: Story = {
  name: 'Cross Measure - Tie',
  args: { keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-composition
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
      measure-numbers=${args.measureNumbers}
    >
      <music-measure>
        <music-staff
          clef="treble"
          key-sig=${args.keySig}
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
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff
          clef="treble"
          key-sig=${args.keySig}
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
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const CrossSystemTie: Story = {
  name: 'Cross System - Tie',
  args: { keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <div style="max-width: 200px;">
      <music-composition
        key-sig=${args.keySig}
        mode=${args.mode}
        time=${args.time}
        measure-numbers=${args.measureNumbers}
      >
        <music-measure>
          <music-staff
            clef="treble"
            key-sig=${args.keySig}
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
          </music-staff>
        </music-measure>
        <music-measure>
          <music-staff
            clef="treble"
            key-sig=${args.keySig}
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
          </music-staff>
        </music-measure>
      </music-composition>
    </div>
  `,
};

export const CrossSystemHairpin: Story = {
  name: 'Cross System - Hairpin',
  render: (args) => html`
    <div style="max-width: 200px;">
      <music-composition
        key-sig="C"
        mode="major"
        time="4/4"
        measure-numbers=${args.measureNumbers}
      >
        <music-measure>
          <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
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
          </music-staff>
        </music-measure>
        <music-measure>
          <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
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
          </music-staff>
        </music-measure>
      </music-composition>
    </div>
  `,
};

export const CrossSystemCourtesyClef: Story = {
  name: 'Cross System - Courtesy Clef',
  render: (args) => html`
    <div style="max-width: 150px;">
      <music-composition
        key-sig="C"
        mode="major"
        time="4/4"
        measure-numbers=${args.measureNumbers}
      >
        <music-measure>
          <music-staff clef="treble">
            <music-note note="C" duration="whole"></music-note>
          </music-staff>
        </music-measure>
        <music-measure>
          <music-staff clef="bass">
            <music-note note="C" octave="3" duration="whole"></music-note>
          </music-staff>
        </music-measure>
      </music-composition>
    </div>
  `,
};

export const GrandStaff: Story = {
  args: { keySig: 'G', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-composition
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
      measure-numbers=${args.measureNumbers}
    >
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="G" duration="quarter"></music-note>
          <music-note note="B" duration="quarter"></music-note>
          <music-note note="D" duration="quarter"></music-note>
          <music-note note="G" duration="quarter"></music-note>
        </music-staff>
        <music-staff
          clef="bass"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="G" duration="half"></music-note>
          <music-note note="D" duration="half"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="A" duration="quarter"></music-note>
          <music-note note="C" duration="quarter"></music-note>
          <music-note note="E" duration="quarter"></music-note>
          <music-note note="A" duration="quarter"></music-note>
        </music-staff>
        <music-staff
          clef="bass"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="A" duration="half"></music-note>
          <music-note note="E" duration="half"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="B" duration="quarter"></music-note>
          <music-note note="D" duration="quarter"></music-note>
          <music-note note="F#" duration="quarter"></music-note>
          <music-note note="B" duration="quarter"></music-note>
        </music-staff>
        <music-staff
          clef="bass"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="B" duration="half"></music-note>
          <music-note note="F#" duration="half"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="C" octave="5" duration="quarter"></music-note>
          <music-note note="E" octave="5" duration="quarter"></music-note>
          <music-note note="G" octave="5" duration="quarter"></music-note>
          <music-note note="C" octave="5" duration="quarter"></music-note>
        </music-staff>
        <music-staff
          clef="bass"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="C" duration="half"></music-note>
          <music-note note="G" duration="half"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="D" octave="5" duration="quarter"></music-note>
          <music-note note="F#" octave="5" duration="quarter"></music-note>
          <music-note note="A" octave="5" duration="quarter"></music-note>
          <music-note note="D" octave="5" duration="quarter"></music-note>
        </music-staff>
        <music-staff
          clef="bass"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="D" duration="half"></music-note>
          <music-note note="A" duration="half"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="E" octave="5" duration="quarter"></music-note>
          <music-note note="G" octave="5" duration="quarter"></music-note>
          <music-note note="B" octave="5" duration="quarter"></music-note>
          <music-note note="E" octave="5" duration="quarter"></music-note>
        </music-staff>
        <music-staff
          clef="bass"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="E" duration="half"></music-note>
          <music-note note="B" duration="half"></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const GrandStavesInOneMeasure: Story = {
  render: () => html`
    <music-measure number="1" key-sig="C" mode="major" time="4/4">
      <music-staff
        clef="treble"
        group="grand"
        key-sig="C"
        mode="major"
        time="4/4"
      >
        <music-note note="C" duration="whole"></music-note>
      </music-staff>
      <music-staff clef="bass" key-sig="C" mode="major" time="4/4">
        <music-note note="C" duration="whole"></music-note>
      </music-staff>
      <music-staff
        clef="treble"
        group="grand"
        key-sig="C"
        mode="major"
        time="4/4"
      >
        <music-note note="G" duration="whole"></music-note>
      </music-staff>
      <music-staff clef="bass" key-sig="C" mode="major" time="4/4">
        <music-note note="G" duration="whole"></music-note>
      </music-staff>
    </music-measure>
  `,
};

export const BracketWithoutGroupId: Story = {
  render: () => html`
    <music-measure number="1" key-sig="C" mode="major" time="4/4">
      <music-staff
        clef="treble"
        group="bracket"
        key-sig="C"
        mode="major"
        time="4/4"
      >
        <music-note note="C" octave="5" duration="whole"></music-note>
      </music-staff>
      <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
        <music-note note="G" octave="4" duration="whole"></music-note>
      </music-staff>
    </music-measure>
  `,
};

export const Bracket: Story = {
  render: () => html`
    <music-measure number="1" key-sig="C" mode="major" time="4/4">
      <music-staff
        clef="treble"
        group="bracket"
        group-id="choir"
        key-sig="C"
        mode="major"
        time="4/4"
      >
        <music-note note="C" octave="5" duration="whole"></music-note>
      </music-staff>
      <music-staff
        clef="treble"
        group="bracket"
        group-id="choir"
        key-sig="C"
        mode="major"
        time="4/4"
      >
        <music-note note="G" octave="4" duration="whole"></music-note>
      </music-staff>
      <music-staff
        clef="bass"
        group="bracket"
        group-id="choir"
        key-sig="C"
        mode="major"
        time="4/4"
      >
        <music-note note="E" octave="4" duration="whole"></music-note>
      </music-staff>
      <music-staff
        clef="bass"
        group="bracket"
        group-id="choir"
        key-sig="C"
        mode="major"
        time="4/4"
      >
        <music-note note="C" octave="3" duration="whole"></music-note>
      </music-staff>
    </music-measure>
  `,
};

export const BracketWithGuitarTab: Story = {
  args: { number: 1, keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-measure
      number=${args.number}
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-staff
        clef="treble"
        group="bracket"
        key-sig=${args.keySig}
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
