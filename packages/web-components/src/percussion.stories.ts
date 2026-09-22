import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

const meta: Meta = {
  title: 'Instruments/Percussion',
  tags: ['!autodocs'],
};
export default meta;

type Story = StoryObj;

export const Planned: Story = {
  render: () => html`
    <p>
      Percussion notations (closed/open rolls, rim shot, cross stick, dead
      stroke) are not implemented yet. Tracked in <code>TODO.md</code> §7
      &ldquo;Percussion &amp; Keyboard Techniques&rdquo;. (Keyboard pedal marks
      from that same section &mdash; sustain/sostenuto/una-corda, half pedal
      &mdash; are tracked under
      <a href="/?path=/story/instruments-keyboard--planned"
        >Instruments/Keyboard</a
      >
      instead.)
    </p>
  `,
};
