import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
// Import order matters — use the index to register all components
import './index';

const meta: Meta = {
  title: 'Components/MusicMeasure',
  tags: ['autodocs'],
  render: (args) => html`
    <music-measure
      number=${args.number}
      keySig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-staff-treble keySig=${args.keySig} mode=${args.mode} time=${args.time}>
        <music-note value="C" duration="quarter"></music-note>
        <music-note value="E" duration="quarter"></music-note>
        <music-note value="G" duration="quarter"></music-note>
        <music-note value="C" duration="quarter"></music-note>
      </music-staff-treble>
    </music-measure>
  `,
  argTypes: {
    number: { control: 'number' },
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
    number: 1,
    keySig: 'C',
    mode: 'major',
    time: '4/4',
  },
};
export default meta;

type Story = StoryObj;

export const TrebleOnly: Story = {
  args: { number: 1, keySig: 'C', mode: 'major', time: '4/4' },
};

export const TrebleAndBass: Story = {
  args: { number: 1, keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-measure number=${args.number} keySig=${args.keySig} mode=${args.mode} time=${args.time}>
      <music-staff-treble keySig=${args.keySig} mode=${args.mode} time=${args.time}>
        <music-note value="C" duration="quarter"></music-note>
        <music-note value="E" duration="quarter"></music-note>
        <music-note value="G" duration="quarter"></music-note>
        <music-note value="C" duration="quarter"></music-note>
      </music-staff-treble>
      <music-staff-bass keySig=${args.keySig} mode=${args.mode} time=${args.time}>
        <music-note value="C" duration="half"></music-note>
        <music-note value="G" duration="half"></music-note>
      </music-staff-bass>
    </music-measure>
  `,
};

export const WithGuitarTab: Story = {
  args: { number: 1, keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-measure number=${args.number} keySig=${args.keySig} mode=${args.mode} time=${args.time}>
      <music-staff-treble keySig=${args.keySig} mode=${args.mode} time=${args.time}>
        <music-note value="E" duration="quarter"></music-note>
        <music-note value="G" duration="quarter"></music-note>
        <music-note value="B" duration="quarter"></music-note>
        <music-note value="E" duration="quarter"></music-note>
      </music-staff-treble>
      <music-staff-guitar-tab>
        <music-note value="E" duration="quarter"></music-note>
        <music-note value="G" duration="quarter"></music-note>
        <music-note value="B" duration="quarter"></music-note>
        <music-note value="E" duration="quarter"></music-note>
      </music-staff-guitar-tab>
    </music-measure>
  `,
};
