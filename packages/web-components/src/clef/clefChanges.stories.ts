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

// A mid-bar clef change on one staff of a grand staff: the other staff
// leaves the same room, so its beats stay lined up.
export const InGrandStaff: Story = {
  render: () => html`
    <music-measure time="4/4">
      <music-staff clef="treble" group="grand">
        <music-note note="C" octave="5" duration="quarter"></music-note>
        <music-note note="E" octave="5" duration="quarter"></music-note>
        <music-clef clef="bass"></music-clef>
        <music-note note="C" octave="4" duration="quarter"></music-note>
        <music-note note="A" octave="3" duration="quarter"></music-note>
      </music-staff>
      <music-staff clef="bass">
        <music-note note="C" octave="3" duration="quarter"></music-note>
        <music-note note="G" octave="2" duration="quarter"></music-note>
        <music-note note="E" octave="2" duration="quarter"></music-note>
        <music-note note="C" octave="2" duration="quarter"></music-note>
      </music-staff>
    </music-measure>
  `,
};
