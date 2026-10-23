import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../index';
import { DURATIONS } from '../utils';

const meta: Meta = {
  title: 'Rest',
  component: 'music-rest',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const Standalone: Story = {
  args: {
    duration: 'quarter',
  },
  argTypes: {
    duration: {
      control: 'select',
      options: DURATIONS,
    },
  },
  render: (args) => html`<music-rest duration=${args.duration}></music-rest>`,
};

// A spacer rest keeps its beat time but draws nothing: the D lands on beat 3.
export const SpacerRest: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note note="C" octave="5" duration="quarter"></music-note>
      <music-rest duration="quarter" hidden></music-rest>
      <music-note note="D" octave="5" duration="quarter"></music-note>
      <music-rest duration="quarter"></music-rest>
    </music-staff>
  `,
};
