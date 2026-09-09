import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../../index';
import { DYNAMICS } from '../../utils';

const HAIRPIN_ROLES = ['start', 'end'] as const;

const meta: Meta = {
  title: 'Universal Notations/Dynamics & Hairpins',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const DynamicMarkings: Story = {
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
    <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
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
    </music-staff>
  `,
};

export const WithHairpins: Story = {
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
    <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
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
    </music-staff>
    <music-staff
      clef="treble"
      key-sig="C"
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
    </music-staff>
  `,
};
