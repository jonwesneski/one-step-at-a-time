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
      <music-note note="C" duration="eighth"></music-note>
      <music-note note="D" duration="eighth"></music-note>
      <music-note note="E" duration="eighth"></music-note>
      <music-note note="F" duration="eighth"></music-note>

      <music-note note="G" duration="eighth"></music-note>
      <music-note note="F" duration="eighth"></music-note>
      <music-note note="E" duration="eighth"></music-note>
      <music-note note="D" duration="eighth"></music-note>
    </music-staff-treble>
  `,
};

// Including Secondary
export const Secondary: Story = {
  render: () => html`
    <music-staff-treble keySig="C" mode="major" time="4/4">
      <music-note note="C" duration="eighth"></music-note>
      <music-note note="D" duration="sixteenth"></music-note>
      <music-note note="E" duration="sixteenth"></music-note>
      <music-note note="F" duration="eighth"></music-note>
      <music-note note="G" duration="sixteenth"></music-note>
      <music-note note="A" duration="sixteenth"></music-note>

      <music-chord duration="eighth">
        <music-note note="G" duration="eighth"></music-note>
        <music-note note="B" duration="eighth"></music-note>
      </music-chord>
      <music-chord duration="sixteenth">
        <music-note note="F" duration="sixteenth"></music-note>
        <music-note note="A" duration="sixteenth"></music-note>
      </music-chord>
      <music-chord duration="sixteenth">
        <music-note note="E" duration="sixteenth"></music-note>
        <music-note note="G" duration="sixteenth"></music-note>
      </music-chord>
      <music-chord duration="eighth">
        <music-note note="D" duration="eighth"></music-note>
        <music-note note="F" duration="eighth"></music-note>
      </music-chord>
      <music-chord duration="sixteenth">
        <music-note note="C" duration="sixteenth"></music-note>
        <music-note note="E" duration="sixteenth"></music-note>
      </music-chord>
      <music-chord duration="sixteenth">
        <music-note note="B" duration="sixteenth"></music-note>
        <music-note note="D" duration="sixteenth"></music-note>
      </music-chord>
    </music-staff-treble>
  `,
};

// Including fractionals and no slants
export const Fractional: Story = {
  render: () => html`
    <music-staff-treble keySig="C" mode="major" time="6/8">
      <music-note note="C" duration="sixteenth"></music-note>
      <music-note note="E" duration="eighth"></music-note>
      <music-note note="G" duration="eighth"></music-note>
      <music-note note="C" duration="sixteenth"></music-note>
      <music-note note="G" duration="sixteenth"></music-note>
      <music-note note="E" duration="eighth"></music-note>
      <music-note note="C" duration="eighth"></music-note>
      <music-note note="G" duration="sixteenth"></music-note>
    </music-staff-treble>
  `,
};
