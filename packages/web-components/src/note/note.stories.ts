import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../index';
import { ARTICULATIONS, DURATIONS, NOTEHEADS, STRESSES } from '../utils';

const meta: Meta = {
  title: 'Note',
  component: 'music-note',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const Standalone: Story = {
  args: {
    duration: 'quarter',
  },
  argTypes: {
    duration: { control: 'select', options: DURATIONS },
  },
  render: (args) => html`<music-note duration=${args.duration}></music-note>`,
};

export const WithNotehead: Story = {
  args: {
    duration: 'quarter',
    notehead: 'x',
  },
  argTypes: {
    duration: { control: 'select', options: DURATIONS },
    notehead: { control: 'select', options: NOTEHEADS },
  },
  render: (args) => html`
    <div style="padding: 40px">
      <music-note
        duration=${args.duration}
        notehead=${args.notehead}
      ></music-note>
    </div>
  `,
};

export const NoteheadGallery: Story = {
  render: () => html`
    <div
      style="display: grid; grid-template-columns: repeat(5, 60px); gap: 24px; padding: 40px"
    >
      ${NOTEHEADS.map(
        (notehead) => html`
          <music-note duration="eighth" notehead=${notehead}></music-note>
          <music-note duration="quarter" notehead=${notehead}></music-note>
          <music-note duration="half" notehead=${notehead}></music-note>
          <music-note duration="whole" notehead=${notehead}></music-note>
          <music-note duration="double-whole" notehead=${notehead}></music-note>
        `
      )}
    </div>
  `,
};

export const WithArticulations: Story = {
  args: {
    duration: 'quarter',
    articulation: 'staccato',
    stress: '',
  },
  argTypes: {
    duration: { control: 'select', options: DURATIONS },
    articulation: { control: 'select', options: ['', ...ARTICULATIONS] },
    stress: { control: 'select', options: ['', ...STRESSES] },
  },
  render: (args) => html`
    <div style="padding: 40px">
      <music-note
        duration=${args.duration}
        articulation=${args.articulation}
        stress=${args.stress}
      ></music-note>
    </div>
  `,
};

export const ArticulationGallery: Story = {
  render: () => html`
    <div
      style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 24px; padding: 40px"
    >
      <music-note articulation="accent"></music-note>
      <music-note articulation="marcato"></music-note>
      <music-note articulation="staccato"></music-note>
      <music-note articulation="staccatissimo"></music-note>
      <music-note articulation="tenuto"></music-note>
      <music-note articulation="portato"></music-note>
      <music-note articulation="tenuto-staccatissimo"></music-note>
      <music-note articulation="marcato-staccato"></music-note>
      <music-note articulation="fermata"></music-note>
      <music-note articulation="accent-fermata"></music-note>
      <music-note stress="stressed"></music-note>
      <music-note stress="unstressed"></music-note>
    </div>
  `,
};

export const InStaff: Story = {
  args: {
    duration1: 'quarter',
    duration2: 'eighth',
    duration3: 'half',
    duration4: 'quarter',
  },
  argTypes: {
    duration1: { control: 'select', options: DURATIONS },
    duration2: { control: 'select', options: DURATIONS },
    duration3: { control: 'select', options: DURATIONS },
    duration4: { control: 'select', options: DURATIONS },
  },
  render: (args) => html`
    <div style="display: flex; gap: 24px; padding: 40px; align-items: flex-end">
      <music-note duration=${args.duration1}></music-note>
      <music-note duration=${args.duration2}></music-note>
      <music-note duration=${args.duration3}></music-note>
      <music-note duration=${args.duration4}></music-note>
    </div>
  `,
};

// A dot sits half a space after the head, in the head's own space, or the
// space above when the head is on a (ledger) line. An up-stem tail that would
// cover the dot pushes it to the right of the tail.
export const Dotted: Story = {
  args: {
    duration: 'dotted-quarter',
  },
  argTypes: {
    duration: { control: 'select', options: DURATIONS },
  },
  render: (args) => html`
    <div
      style="display: flex; flex-direction: column; gap: 24px; padding: 40px"
    >
      <music-note duration=${args.duration}></music-note>
      <music-staff clef="treble" time="4/4">
        <music-note note="F" octave="4" duration="dotted-half"></music-note>
        <music-rest duration="quarter"></music-rest>
      </music-staff>
      <music-staff clef="treble" time="4/4">
        <music-note
          note="A"
          octave="4"
          duration="triple-dotted-quarter"
        ></music-note>
        <music-note note="A" octave="4" duration="thirtysecond"></music-note>
        <music-rest duration="half"></music-rest>
      </music-staff>
      <music-staff clef="treble" time="4/4">
        <music-note note="F" octave="4" duration="dotted-half"></music-note>
        <music-note note="E" octave="5" duration="dotted-eighth"></music-note>
        <music-note note="G" octave="4" duration="sixteenth"></music-note>
      </music-staff>
      <music-staff clef="treble" time="4/4">
        <music-note note="A" octave="5" duration="dotted-quarter"></music-note>
        <music-note note="C" octave="6" duration="eighth"></music-note>
        <music-note note="C" octave="4" duration="dotted-quarter"></music-note>
        <music-note note="A" octave="3" duration="eighth"></music-note>
      </music-staff>
      <music-staff clef="treble" time="4/4">
        <music-note note="E" octave="4" duration="dotted-eighth"></music-note>
        <music-note note="F" octave="4" duration="sixteenth"></music-note>
        <music-note
          note="E"
          octave="4"
          duration="dotted-sixteenth"
        ></music-note>
        <music-note note="G" octave="4" duration="thirtysecond"></music-note>
        <music-rest duration="half"></music-rest>
        <music-rest duration="eighth"></music-rest>
      </music-staff>
      <music-staff clef="treble" time="4/4">
        <music-note
          note="G"
          octave="4"
          duration="dotted-half"
          tie="start"
        ></music-note>
        <music-note
          note="G"
          octave="4"
          duration="quarter"
          tie="end"
        ></music-note>
      </music-staff>
    </div>
  `,
};
