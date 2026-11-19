import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import './index';

const meta: Meta = {
  title: 'Instruments/Strings',
  tags: ['!autodocs'],
};
export default meta;

type Story = StoryObj;

// Bowed tremolo: rapid repeated bow strokes on one note (unmeasured, with
// `trem.`), or alternating between two notes.
export const BowedTremolo: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note
        note="D"
        octave="5"
        duration="half"
        tremolo="unmeasured"
        tremolo-label="trem"
      ></music-note>
      <music-tremolo>
        <music-note note="G" octave="4" duration="quarter"></music-note>
        <music-note note="B" octave="4" duration="quarter"></music-note>
      </music-tremolo>
      <music-note
        note="A"
        octave="4"
        duration="quarter"
        tremolo-label="non-trem"
      ></music-note>
    </music-staff>
  `,
};

export const Planned: Story = {
  render: () => html`
    <p>
      Other string-specific notations (down-/up-bow, spiccato, col legno, sul
      ponticello, pizzicato, snap pizzicato, double/triple stops) are not
      implemented yet. Tracked in <code>TODO.md</code> §4 &ldquo;Bowing &amp;
      String Techniques&rdquo;.
    </p>
  `,
};
