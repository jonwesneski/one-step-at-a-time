import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../../index';
import { CLEFS, MODES, NOTES, TIMES } from '../../utils';

const meta: Meta = {
  title: 'Universal Notations/Slurs',
  tags: ['autodocs'],
  argTypes: {
    clef: { control: 'radio', options: CLEFS },
    keySig: { control: 'select', options: NOTES },
    mode: { control: 'radio', options: MODES },
    time: { control: 'select', options: TIMES },
  },
  args: { clef: 'treble', keySig: 'C', mode: 'major', time: '4/4' },
};
export default meta;

type Story = StoryObj;

export const OverANoteGroup: Story = {
  render: (args) => html`
    <music-staff
      clef=${args.clef}
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-note
        note="C"
        octave="5"
        duration="eighth"
        slur="start"
      ></music-note>
      <music-note note="D" octave="5" duration="eighth"></music-note>
      <music-note note="E" octave="5" duration="eighth"></music-note>
      <music-note note="F" octave="5" duration="eighth" slur="end"></music-note>
      <music-note
        note="C"
        octave="4"
        duration="eighth"
        slur="start"
      ></music-note>
      <music-note note="D" octave="4" duration="eighth"></music-note>
      <music-note note="E" octave="4" duration="eighth"></music-note>
      <music-note note="F" octave="4" duration="eighth" slur="end"></music-note>
    </music-staff>
  `,
};

export const NestedSlurs: Story = {
  render: (args) => html`
    <music-staff
      clef=${args.clef}
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-note
        note="C"
        octave="5"
        duration="eighth"
        slur="start"
      ></music-note>
      <music-note
        note="D"
        octave="5"
        duration="eighth"
        slur="start"
      ></music-note>
      <music-note note="E" octave="5" duration="eighth"></music-note>
      <music-note note="F" octave="5" duration="eighth" slur="end"></music-note>
      <music-note note="G" octave="5" duration="eighth"></music-note>
      <music-note note="A" octave="5" duration="eighth"></music-note>
      <music-note note="B" octave="5" duration="eighth"></music-note>
      <music-note note="C" octave="6" duration="eighth" slur="end"></music-note>
    </music-staff>
  `,
};

export const AcrossChords: Story = {
  render: (args) => html`
    <music-staff
      clef=${args.clef}
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-chord duration="quarter" slur="start">
        <music-note note="C" octave="5" duration="quarter"></music-note>
        <music-note note="E" octave="5" duration="quarter"></music-note>
        <music-note note="G" octave="5" duration="quarter"></music-note>
      </music-chord>
      <music-chord duration="quarter">
        <music-note note="D" octave="5" duration="quarter"></music-note>
        <music-note note="F" octave="5" duration="quarter"></music-note>
        <music-note note="A" octave="5" duration="quarter"></music-note>
      </music-chord>
      <music-chord duration="quarter">
        <music-note note="E" octave="5" duration="quarter"></music-note>
        <music-note note="G" octave="5" duration="quarter"></music-note>
        <music-note note="B" octave="5" duration="quarter"></music-note>
      </music-chord>
      <music-chord duration="quarter" slur="end">
        <music-note note="F" octave="5" duration="quarter"></music-note>
        <music-note note="A" octave="5" duration="quarter"></music-note>
        <music-note note="C" octave="6" duration="quarter"></music-note>
      </music-chord>
    </music-staff>
  `,
};
