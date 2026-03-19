import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
// Import order matters — use the index to register all components
import '../../index';

const meta: Meta = {
  title: 'Utils/Beams',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

// Two eighth notes → beamCounts=[1,1]
// beamIndex=0: one full span across both notes
// Result: 1 polygon (primary beam only)
export const Primary: Story = {
  render: () => html`
    <music-staff-treble keySig="C" mode="major" time="4/4">
      <music-note value="C" duration="eighth"></music-note>
      <music-note value="E" duration="eighth"></music-note>
      <music-note value="G" duration="quarter"></music-note>
      <music-note value="E" duration="quarter"></music-note>
      <music-note value="C" duration="quarter"></music-note>
    </music-staff-treble>
  `,
};

// Four sixteenth notes → beamCounts=[2,2,2,2]
// beamIndex=0: one full span (primary)
// beamIndex=1: one full span across all four (secondary, unbroken)
// Result: 2 polygons
export const Secondary: Story = {
  render: () => html`
    <music-staff-treble keySig="C" mode="major" time="4/4">
      <music-note value="C" duration="eighth"></music-note>
      <music-note value="D" duration="sixteenth"></music-note>
      <music-note value="E" duration="sixteenth"></music-note>
      <music-note value="F" duration="eighth"></music-note>
      <music-note value="G" duration="quarter"></music-note>
      <music-note value="E" duration="quarter"></music-note>
    </music-staff-treble>
  `,
};

// sixteenth–eighth–eighth–sixteenth → beamCounts=[2,1,1,2]
// beamIndex=0: one full span across all four (primary)
// beamIndex=1: the two eighths (beamCount=1) break the secondary run;
//   the first sixteenth gets a right-fractional, the last gets a left-fractional
// Result: 3 polygons (primary + 2 fractional beams)
export const Fractional: Story = {
  render: () => html`
    <music-staff-treble keySig="C" mode="major" time="4/4">
      <music-note value="C" duration="sixteenth"></music-note>
      <music-note value="E" duration="eighth"></music-note>
      <music-note value="G" duration="eighth"></music-note>
      <music-note value="C" duration="sixteenth"></music-note>
      <music-note value="G" duration="quarter"></music-note>
    </music-staff-treble>
  `,
};
