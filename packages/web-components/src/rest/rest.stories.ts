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

// A rest's dot keeps the same place relative to the glyph wherever the rest
// sits.
export const Dotted: Story = {
  render: () => html`
    <div
      style="display: flex; flex-direction: column; gap: 24px; padding: 40px"
    >
      <music-staff clef="treble" time="12/8">
        <music-rest duration="dotted-whole"></music-rest>
      </music-staff>
      <music-staff clef="treble" time="9/8">
        <music-rest duration="dotted-half"></music-rest>
        <music-rest duration="dotted-quarter"></music-rest>
      </music-staff>
      <music-staff clef="treble" time="4/4">
        <music-rest duration="dotted-eighth"></music-rest>
        <music-rest duration="sixteenth"></music-rest>
        <music-rest duration="double-dotted-eighth"></music-rest>
        <music-rest duration="thirtysecond"></music-rest>
        <music-rest duration="dotted-sixteenth"></music-rest>
        <music-rest duration="thirtysecond"></music-rest>
        <music-rest duration="dotted-thirtysecond"></music-rest>
        <music-rest duration="sixtyfourth"></music-rest>
        <music-rest duration="triple-dotted-eighth"></music-rest>
        <music-rest duration="sixtyfourth"></music-rest>
        <music-rest duration="sixteenth"></music-rest>
      </music-staff>
    </div>
  `,
};
