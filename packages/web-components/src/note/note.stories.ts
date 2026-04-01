import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';

const meta: Meta = {
  title: 'Components/MusicNote',
  tags: ['autodocs'],
  render: (args) => html`
    <music-note duration=${args.duration} value=${args.value}></music-note>
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
    value: {
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
        'rest',
      ],
    },
  },
  args: {
    duration: 'quarter',
    value: 'C',
  },
};
export default meta;

type Story = StoryObj;

export const Quarter: Story = {
  args: { duration: 'quarter', value: 'C' },
};

export const Whole: Story = {
  args: { duration: 'whole', value: 'G' },
};

export const Half: Story = {
  args: { duration: 'half', value: 'E' },
};

export const Eighth: Story = {
  args: { duration: 'eighth', value: 'A' },
};

export const Sixteenth: Story = {
  args: { duration: 'sixteenth', value: 'D' },
};

export const Rest: Story = {
  args: { duration: 'quarter', value: 'rest' },
};
