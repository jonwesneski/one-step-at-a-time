import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
// Import order matters — use the index to register all components
import './index';

const meta: Meta = {
  title: 'Components/MusicComposition',
  tags: ['autodocs'],
  render: (args) => html`
    <music-composition keySig=${args.keySig} mode=${args.mode} time=${args.time}>
      <music-measure>
        <music-staff-treble keySig=${args.keySig} mode=${args.mode} time=${args.time}>
          <music-note value="C" duration="quarter"></music-note>
          <music-note value="E" duration="quarter"></music-note>
          <music-note value="G" duration="quarter"></music-note>
          <music-note value="C" duration="quarter"></music-note>
        </music-staff-treble>
      </music-measure>
      <music-measure>
        <music-staff-treble keySig=${args.keySig} mode=${args.mode} time=${args.time}>
          <music-note value="D" duration="quarter"></music-note>
          <music-note value="F" duration="quarter"></music-note>
          <music-note value="A" duration="quarter"></music-note>
          <music-note value="D" duration="quarter"></music-note>
        </music-staff-treble>
      </music-measure>
    </music-composition>
  `,
  argTypes: {
    keySig: {
      control: 'select',
      options: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'],
    },
    mode: {
      control: 'radio',
      options: ['major', 'minor'],
    },
    time: { control: 'text' },
  },
  args: {
    keySig: 'C',
    mode: 'major',
    time: '4/4',
  },
};
export default meta;

type Story = StoryObj;

export const SingleMeasure: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-composition keySig=${args.keySig} mode=${args.mode} time=${args.time}>
      <music-measure>
        <music-staff-treble keySig=${args.keySig} mode=${args.mode} time=${args.time}>
          <music-note value="C" duration="quarter"></music-note>
          <music-note value="E" duration="quarter"></music-note>
          <music-note value="G" duration="quarter"></music-note>
          <music-note value="C" duration="quarter"></music-note>
        </music-staff-treble>
      </music-measure>
    </music-composition>
  `,
};

export const MultipleMeasures: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
};

export const TrebleAndBass: Story = {
  args: { keySig: 'G', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-composition keySig=${args.keySig} mode=${args.mode} time=${args.time}>
      <music-measure>
        <music-staff-treble keySig=${args.keySig} mode=${args.mode} time=${args.time}>
          <music-note value="G" duration="quarter"></music-note>
          <music-note value="B" duration="quarter"></music-note>
          <music-note value="D" duration="quarter"></music-note>
          <music-note value="G" duration="quarter"></music-note>
        </music-staff-treble>
        <music-staff-bass keySig=${args.keySig} mode=${args.mode} time=${args.time}>
          <music-note value="G" duration="half"></music-note>
          <music-note value="D" duration="half"></music-note>
        </music-staff-bass>
      </music-measure>
      <music-measure>
        <music-staff-treble keySig=${args.keySig} mode=${args.mode} time=${args.time}>
          <music-note value="A" duration="quarter"></music-note>
          <music-note value="C" duration="quarter"></music-note>
          <music-note value="E" duration="quarter"></music-note>
          <music-note value="A" duration="quarter"></music-note>
        </music-staff-treble>
        <music-staff-bass keySig=${args.keySig} mode=${args.mode} time=${args.time}>
          <music-note value="A" duration="half"></music-note>
          <music-note value="E" duration="half"></music-note>
        </music-staff-bass>
      </music-measure>
    </music-composition>
  `,
};

export const GMajorScale: Story = {
  args: { keySig: 'G', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-composition keySig=${args.keySig} mode=${args.mode} time=${args.time}>
      <music-measure>
        <music-staff-treble keySig=${args.keySig} mode=${args.mode} time=${args.time}>
          <music-note value="G" duration="quarter"></music-note>
          <music-note value="A" duration="quarter"></music-note>
          <music-note value="B" duration="quarter"></music-note>
          <music-note value="C" duration="quarter"></music-note>
        </music-staff-treble>
      </music-measure>
      <music-measure>
        <music-staff-treble keySig=${args.keySig} mode=${args.mode} time=${args.time}>
          <music-note value="D" duration="quarter"></music-note>
          <music-note value="E" duration="quarter"></music-note>
          <music-note value="F#" duration="quarter"></music-note>
          <music-note value="G" duration="quarter"></music-note>
        </music-staff-treble>
      </music-measure>
    </music-composition>
  `,
};
