import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../../index';
import { CLEFS, MODES, NOTES, TIMES } from '../../utils';

const meta: Meta = {
  title: 'Universal Notations/Ties',
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

export const NoteToNote: Story = {
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
        duration="quarter"
        tie="start"
      ></music-note>
      <music-note note="C" octave="5" duration="quarter" tie="end"></music-note>
      <music-note
        note="C"
        octave="4"
        duration="quarter"
        tie="start"
      ></music-note>
      <music-note note="C" octave="4" duration="quarter" tie="end"></music-note>
    </music-staff>
  `,
};

export const ChordWithPartialTie: Story = {
  render: (args) => html`
    <music-staff
      clef=${args.clef}
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-chord duration="half">
        <music-note
          note="G"
          octave="5"
          duration="half"
          tie="start"
        ></music-note>
        <music-note note="E" octave="5" duration="half"></music-note>
        <music-note note="C" octave="5" duration="half"></music-note>
      </music-chord>
      <music-chord duration="half">
        <music-note note="G" octave="5" duration="half" tie="end"></music-note>
        <music-note note="E" octave="5" duration="half"></music-note>
        <music-note note="C" octave="5" duration="half"></music-note>
      </music-chord>
    </music-staff>
  `,
};

export const ChordWithTie: Story = {
  render: (args) => html`
    <music-staff
      clef=${args.clef}
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-chord duration="half" tie="start">
        <music-note note="C" octave="5" duration="half"></music-note>
        <music-note note="E" octave="5" duration="half"></music-note>
        <music-note note="G" octave="5" duration="half"></music-note>
      </music-chord>
      <music-chord duration="half" tie="end">
        <music-note note="C" octave="5" duration="half"></music-note>
        <music-note note="E" octave="5" duration="half"></music-note>
        <music-note note="G" octave="5" duration="half"></music-note>
      </music-chord>
    </music-staff>
  `,
};
