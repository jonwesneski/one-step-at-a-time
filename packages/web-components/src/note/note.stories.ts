import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';

const meta: Meta = {
  title: 'Components/MusicNote',
  tags: ['autodocs'],
  render: (args) => html`
    <music-note duration=${args.duration} note=${args.note}></music-note>
  `,
  argTypes: {
    duration: {
      control: 'select',
      options: [
        'whole',
        'half',
        'quarter',
        'eighth',
        'sixteenth',
        'thirtysecond',
        'sixtyfourth',
        'hundredtwentyeighth',
      ],
    },
    note: {
      control: 'select',
      options: [
        'A',
        'A#',
        'Bb',
        'B',
        'C',
        'C#',
        'Db',
        'D',
        'D#',
        'Eb',
        'E',
        'F',
        'F#',
        'Gb',
        'G',
        'G#',
        'Ab',
      ],
    },
  },
  args: {
    duration: 'quarter',
    note: 'C',
  },
};
export default meta;

type Story = StoryObj;

export const Quarter: Story = {
  args: { duration: 'quarter', note: 'C' },
};

export const Whole: Story = {
  args: { duration: 'whole', note: 'G' },
};

export const Half: Story = {
  args: { duration: 'half', note: 'E' },
};

export const Eighth: Story = {
  args: { duration: 'eighth', note: 'A' },
};

export const Sixteenth: Story = {
  args: { duration: 'sixteenth', note: 'D' },
};
