import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';
import { MODES } from '../utils';

const meta: Meta = {
  title: 'Components/StaffBass',
  tags: ['autodocs'],
  render: (args) => html`
    <music-staff-bass keySig=${args.keySig} mode=${args.mode} time=${args.time}>
      <music-note note="C" duration="quarter"></music-note>
      <music-note note="E" duration="quarter"></music-note>
      <music-note note="G" duration="quarter"></music-note>
      <music-note note="C" duration="quarter"></music-note>
    </music-staff-bass>
  `,
  argTypes: {
    keySig: {
      control: 'select',
      options: [
        'C',
        'G',
        'D',
        'A',
        'E',
        'B',
        'F#',
        'C#',
        'F',
        'Bb',
        'Eb',
        'Ab',
        'Db',
        'Gb',
        'Cb',
      ],
    },
    mode: {
      control: 'radio',
      options: MODES,
    },
    time: {
      control: 'text',
    },
  },
  args: {
    keySig: 'C',
    mode: 'major',
    time: '4/4',
  },
};
export default meta;

type Story = StoryObj;

export const Plain: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
};

export const WithBeamedEighthNotes: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-staff-bass keySig=${args.keySig} mode=${args.mode} time=${args.time}>
      <music-note note="C" duration="eighth"></music-note>
      <music-note note="D" duration="eighth"></music-note>
      <music-note note="E" duration="eighth"></music-note>
      <music-note note="F" duration="eighth"></music-note>
      <music-note note="G" duration="eighth"></music-note>
      <music-note note="A" duration="eighth"></music-note>
      <music-note note="B" duration="eighth"></music-note>
      <music-note note="C" duration="eighth"></music-note>
    </music-staff-bass>
  `,
};

export const WithAccidentals: Story = {
  args: { keySig: 'C', mode: 'major', time: '5/4' },
  render: (args) => html`
    <music-staff-bass keySig=${args.keySig} mode=${args.mode} time=${args.time}>
      <music-note note="F#" octave="3" duration="quarter"></music-note>
      <music-note note="Bb" octave="3" duration="quarter"></music-note>
      <music-chord duration="quarter">
        <music-note note="C##" octave="3" duration="quarter"></music-note>
        <music-note note="Eb" octave="3" duration="quarter"></music-note>
        <music-note note="G#" octave="3" duration="quarter"></music-note>
      </music-chord>
      <music-note note="Dbb" octave="3" duration="quarter"></music-note>
      <music-note note="B" octave="3" duration="quarter"></music-note>
    </music-staff-bass>
  `,
};
