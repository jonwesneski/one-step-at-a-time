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
