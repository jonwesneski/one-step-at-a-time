import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';

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
      options: ['major', 'minor'],
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

export const CMajor: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
};

export const GMajor: Story = {
  args: { keySig: 'G', mode: 'major', time: '4/4' },
};

export const FMajor: Story = {
  args: { keySig: 'F', mode: 'major', time: '4/4' },
};

export const DMinor: Story = {
  args: { keySig: 'D', mode: 'minor', time: '4/4' },
};

export const WithEighthNotes: Story = {
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
