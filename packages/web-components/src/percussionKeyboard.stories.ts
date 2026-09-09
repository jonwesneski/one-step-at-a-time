import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

const meta: Meta = {
  title: 'Instruments/Percussion & Keyboard',
  tags: ['!autodocs'],
};
export default meta;

type Story = StoryObj;

export const Planned: Story = {
  render: () => html`
    <p>
      Percussion &amp; keyboard notations (closed/open rolls, rim shot, cross
      stick, dead stroke, sustain/sostenuto/una-corda pedal marks, half pedal)
      are not implemented yet. Tracked in <code>TODO.md</code> §7
      &ldquo;Percussion &amp; Keyboard Techniques&rdquo;.
    </p>
  `,
};
