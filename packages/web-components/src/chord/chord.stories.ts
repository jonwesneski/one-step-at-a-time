import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';

const meta: Meta = {
  title: 'Components/MusicChord',
  tags: ['autodocs'],
  argTypes: {
    duration: {
      control: 'select',
      options: ['whole', 'half', 'quarter', 'eighth', 'sixteenth'],
    },
    chord: {
      control: 'select',
      options: [
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
      ],
    },
  },
  args: {
    duration: 'quarter',
  },
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <music-chord duration=${args.duration}>
      <music-note note="C" duration=${args.duration}></music-note>
      <music-note note="E" duration=${args.duration}></music-note>
      <music-note note="G" duration=${args.duration}></music-note>
    </music-chord>
  `,
};

export const ChordFromAttribute: Story = {
  args: {
    chord: 'Cmaj',
    duration: 'quarter',
  },
  render: (args) => html`
    <music-staff-treble>
      <music-chord chord=${args.chord} duration=${args.duration}></music-chord>
    </music-staff-treble>
  `,
};
