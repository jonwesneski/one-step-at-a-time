import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../index';

const meta: Meta = {
  title: 'Components/Arpeggio',
  component: 'music-arpeggio',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

/**
 * The written-out arpeggiated chord: a beamed run of notes tied into the chord.
 * (For the wavy vertical line, use the `arpeggio` attribute on a note/chord.)
 */
export const WrittenOutArpeggio: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-arpeggio>
        <music-note note="C" octave="4"></music-note>
        <music-note note="E" octave="4"></music-note>
        <music-note note="G" octave="4"></music-note>
        <music-note note="C" octave="5"></music-note>
        <music-chord duration="half">
          <music-note note="C" octave="4"></music-note>
          <music-note note="E" octave="4"></music-note>
          <music-note note="G" octave="4"></music-note>
          <music-note note="C" octave="5"></music-note>
        </music-chord>
      </music-arpeggio>
      <music-chord chord="Gmaj" duration="half"></music-chord>
    </music-staff>
  `,
};

export const PartialArpeggio: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-arpeggio>
        <music-note note="E" octave="4"></music-note>
        <music-note note="G" octave="4"></music-note>
        <music-chord chord="Cmaj" duration="whole"></music-chord>
      </music-arpeggio>
    </music-staff>
  `,
};

export const RunDurationOverride: Story = {
  args: { runDuration: 'sixteenth' },
  argTypes: {
    runDuration: {
      control: 'select',
      options: ['sixteenth', 'thirtysecond', 'sixtyfourth'],
    },
  },
  render: (args) => html`
    <music-staff clef="treble" time="4/4">
      <music-arpeggio run-duration=${args.runDuration}>
        <music-note note="D" octave="4"></music-note>
        <music-note note="F" octave="4"></music-note>
        <music-note note="A" octave="4"></music-note>
        <music-chord chord="Dmin" duration="half"></music-chord>
      </music-arpeggio>
    </music-staff>
  `,
};
