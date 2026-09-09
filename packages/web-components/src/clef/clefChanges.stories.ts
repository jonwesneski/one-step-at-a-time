import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../index';

const meta: Meta = {
  title: 'Universal Notations/Clef Changes',
  component: 'music-clef',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

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
