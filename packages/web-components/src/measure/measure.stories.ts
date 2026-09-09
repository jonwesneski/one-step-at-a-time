import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../index';

const meta: Meta = {
  title: 'Measure',
  component: 'music-measure',
  tags: ['autodocs'],
  render: (args) => html`
    <music-measure
      number=${args.number}
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
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
      <music-staff
        clef="bass"
        key-sig=${args.keySig}
        mode=${args.mode}
        time=${args.time}
      >
        <music-note note="G" octave="2" duration="quarter"></music-note>
        <music-note note="E" octave="2" duration="quarter"></music-note>
        <music-note note="C" octave="2" duration="quarter"></music-note>
        <music-note note="G" octave="2" duration="quarter"></music-note>
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

export const Basic: Story = {
  args: { number: 1, keySig: 'C', mode: 'major', time: '4/4' },
};
