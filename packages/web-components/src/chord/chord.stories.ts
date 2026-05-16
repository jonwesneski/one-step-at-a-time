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
