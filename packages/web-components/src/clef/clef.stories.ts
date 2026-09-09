import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../index';
import { CLEFS } from '../utils';

const meta: Meta = {
  title: 'Clef',
  component: 'music-clef',
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
