import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../../index';

const meta: Meta = {
  title: 'Notation/Beams',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

// Primary only, 2 groups: showing both ascending slant and descending slant
export const Primary: Story = {
  render: () => html`
    <music-staff-treble keySig="C" mode="major" time="4/4">
      <music-note value="C" duration="eighth"></music-note>
      <music-note value="D" duration="eighth"></music-note>
      <music-note value="E" duration="eighth"></music-note>
      <music-note value="F" duration="eighth"></music-note>
      <music-note value="G" duration="eighth"></music-note>
      <music-note value="F" duration="eighth"></music-note>
      <music-note value="E" duration="eighth"></music-note>
      <music-note value="D" duration="eighth"></music-note>
    </music-staff-treble>
  `,
};

// Including Secondary
export const Secondary: Story = {
  render: () => html`
    <music-staff-treble keySig="C" mode="major" time="4/4">
      <music-note value="C" duration="eighth"></music-note>
      <music-note value="D" duration="sixteenth"></music-note>
      <music-note value="E" duration="sixteenth"></music-note>
      <music-note value="F" duration="eighth"></music-note>
      <music-note value="G" duration="sixteenth"></music-note>
      <music-note value="A" duration="sixteenth"></music-note>
      <music-note value="G" duration="eighth"></music-note>
      <music-note value="F" duration="sixteenth"></music-note>
      <music-note value="E" duration="sixteenth"></music-note>
      <music-note value="D" duration="eighth"></music-note>
      <music-note value="C" duration="sixteenth"></music-note>
      <music-note value="B" duration="sixteenth"></music-note>
    </music-staff-treble>
  `,
};

// Including fractionals and no slants
export const Fractional: Story = {
  render: () => html`
    <music-staff-treble keySig="C" mode="major" time="6/8">
      <music-note value="C" duration="sixteenth"></music-note>
      <music-note value="E" duration="eighth"></music-note>
      <music-note value="G" duration="eighth"></music-note>
      <music-note value="C" duration="sixteenth"></music-note>
      <music-note value="G" duration="sixteenth"></music-note>
      <music-note value="E" duration="eighth"></music-note>
      <music-note value="C" duration="eighth"></music-note>
      <music-note value="G" duration="sixteenth"></music-note>
    </music-staff-treble>
  `,
};
