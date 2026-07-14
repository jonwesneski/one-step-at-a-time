import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';
import { CLEFS } from '../utils';

const meta: Meta = {
  title: 'Components/MusicClef',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const Standalone: Story = {
  args: {
    clef: 'treble',
  },
  argTypes: {
    clef: {
      control: 'radio',
      options: CLEFS,
    },
  },
  render: (args) => html`<music-clef clef=${args.clef}></music-clef>`,
};

export const InStaffMidStream: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note note="C" octave="5" duration="quarter"></music-note>
      <music-note note="E" octave="5" duration="quarter"></music-note>
      <music-clef clef="bass"></music-clef>
      <music-note note="C" octave="3" duration="quarter"></music-note>
      <music-note note="E" octave="3" duration="quarter"></music-note>
    </music-staff>
  `,
};
