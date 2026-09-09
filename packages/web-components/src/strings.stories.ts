import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

const meta: Meta = {
  title: 'Instruments/Strings',
  tags: ['!autodocs'],
};
export default meta;

type Story = StoryObj;

export const Planned: Story = {
  render: () => html`
    <p>
      String-specific notations (down-/up-bow, spiccato, col legno, sul
      ponticello, pizzicato, snap pizzicato, bowed tremolo, double/triple stops)
      are not implemented yet. Tracked in <code>TODO.md</code> §4 &ldquo;Bowing
      &amp; String Techniques&rdquo;.
    </p>
  `,
};
