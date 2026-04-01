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
      <music-note value="C" duration=${args.duration}></music-note>
      <music-note value="E" duration=${args.duration}></music-note>
      <music-note value="G" duration=${args.duration}></music-note>
    </music-chord>
  `,
};

export const MinorChord: Story = {
  render: () => html`
    <music-chord duration="quarter">
      <music-note value="A" duration="quarter"></music-note>
      <music-note value="C" duration="quarter"></music-note>
      <music-note value="E" duration="quarter"></music-note>
    </music-chord>
  `,
};

export const WholeDuration: Story = {
  render: () => html`
    <music-chord duration="whole">
      <music-note value="F" duration="whole"></music-note>
      <music-note value="A" duration="whole"></music-note>
      <music-note value="C" duration="whole"></music-note>
    </music-chord>
  `,
};
