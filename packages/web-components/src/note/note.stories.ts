import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../index';
import { ARTICULATIONS, DURATIONS, STRESSES } from '../utils';

const meta: Meta = {
  title: 'Note',
  component: 'music-note',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const Standalone: Story = {
  args: {
    duration: 'quarter',
  },
  argTypes: {
    duration: { control: 'select', options: DURATIONS },
  },
  render: (args) => html`<music-note duration=${args.duration}></music-note>`,
};

export const WithArticulations: Story = {
  args: {
    duration: 'quarter',
    articulation: 'staccato',
    stress: '',
  },
  argTypes: {
    duration: { control: 'select', options: DURATIONS },
    articulation: { control: 'select', options: ['', ...ARTICULATIONS] },
    stress: { control: 'select', options: ['', ...STRESSES] },
  },
  render: (args) => html`
    <div style="padding: 40px">
      <music-note
        duration=${args.duration}
        articulation=${args.articulation}
        stress=${args.stress}
      ></music-note>
    </div>
  `,
};

export const ArticulationGallery: Story = {
  render: () => html`
    <div
      style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 24px; padding: 40px"
    >
      <music-note articulation="accent"></music-note>
      <music-note articulation="marcato"></music-note>
      <music-note articulation="staccato"></music-note>
      <music-note articulation="staccatissimo"></music-note>
      <music-note articulation="tenuto"></music-note>
      <music-note articulation="portato"></music-note>
      <music-note articulation="tenuto-staccatissimo"></music-note>
      <music-note articulation="marcato-staccato"></music-note>
      <music-note articulation="fermata"></music-note>
      <music-note articulation="accent-fermata"></music-note>
      <music-note stress="stressed"></music-note>
      <music-note stress="unstressed"></music-note>
    </div>
  `,
};

export const InStaff: Story = {
  args: {
    duration1: 'quarter',
    duration2: 'eighth',
    duration3: 'half',
    duration4: 'quarter',
  },
  argTypes: {
    duration1: { control: 'select', options: DURATIONS },
    duration2: { control: 'select', options: DURATIONS },
    duration3: { control: 'select', options: DURATIONS },
    duration4: { control: 'select', options: DURATIONS },
  },
  render: (args) => html`
    <div style="display: flex; gap: 24px; padding: 40px; align-items: flex-end">
      <music-note duration=${args.duration1}></music-note>
      <music-note duration=${args.duration2}></music-note>
      <music-note duration=${args.duration3}></music-note>
      <music-note duration=${args.duration4}></music-note>
    </div>
  `,
};
