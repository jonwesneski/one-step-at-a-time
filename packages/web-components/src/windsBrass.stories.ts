import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

const meta: Meta = {
  title: 'Instruments/Winds & Brass',
  tags: ['!autodocs'],
};
export default meta;

type Story = StoryObj;

export const Planned: Story = {
  render: () => html`
    <p>
      Wind &amp; brass notations (tonguing, flutter tongue, growl, half-valve,
      stopped/open horn, con/senza sordino, mute types) are not implemented yet.
      Tracked in <code>TODO.md</code> §6 &ldquo;Wind &amp; Brass
      Techniques&rdquo;.
    </p>
  `,
};
