import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';
import { DURATIONS } from '../utils';

const meta: Meta = {
  title: 'Components/MusicRest',
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

export const InStaff: Story = {
  args: {
    duration1: 'quarter',
    duration2: 'eighth',
    duration3: 'half',
    duration4: 'sixteenth',
  },
  argTypes: {
    duration1: { control: 'select', options: DURATIONS },
    duration2: { control: 'select', options: DURATIONS },
    duration3: { control: 'select', options: DURATIONS },
    duration4: { control: 'select', options: DURATIONS },
  },
  render: (args) => html`
    <music-staff-treble time="4/4">
      <music-rest duration=${args.duration1}></music-rest>
      <music-rest duration=${args.duration2}></music-rest>
      <music-rest duration=${args.duration3}></music-rest>
      <music-rest duration=${args.duration4}></music-rest>
    </music-staff-treble>
  `,
};
