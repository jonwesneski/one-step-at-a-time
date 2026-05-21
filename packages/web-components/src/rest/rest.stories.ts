import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';

const meta: Meta = {
  title: 'Components/MusicRest',
  tags: ['autodocs'],
  render: (args) => html` <music-rest duration=${args.duration}></music-rest> `,
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
  },
  args: {
    duration: 'quarter',
  },
};
export default meta;

type Story = StoryObj;

export const Whole: Story = {
  args: { duration: 'whole' },
};

export const Half: Story = {
  args: { duration: 'half' },
};

export const Quarter: Story = {
  args: { duration: 'quarter' },
};

export const Eighth: Story = {
  args: { duration: 'eighth' },
};

export const Sixteenth: Story = {
  args: { duration: 'sixteenth' },
};

export const Thirtysecond: Story = {
  args: { duration: 'thirtysecond' },
};

export const Sixtyfourth: Story = {
  args: { duration: 'sixtyfourth' },
};

export const Hundredtwentyeighth: Story = {
  args: { duration: 'hundredtwentyeighth' },
};
