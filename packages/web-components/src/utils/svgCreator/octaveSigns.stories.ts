import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../../index';

const meta: Meta = {
  title: 'Universal Notations/Octave Signs',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

// A sopra (pitch-raising) span over several notes in one measure: numeral,
// dashed extension line, and corner terminator above the staff.
export const OctavaAlta: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note
        note="C"
        octave="5"
        duration="quarter"
        octave-shift="8va"
      ></music-note>
      <music-note note="D" octave="5" duration="quarter"></music-note>
      <music-note note="E" octave="5" duration="quarter"></music-note>
      <music-note
        note="F"
        octave="5"
        duration="quarter"
        octave-stop
      ></music-note>
    </music-staff>
  `,
};

// A bassa (pitch-lowering) span, rendered below the staff instead.
export const OctavaBassa: Story = {
  render: () => html`
    <music-staff clef="bass" time="4/4">
      <music-note
        note="C"
        octave="3"
        duration="quarter"
        octave-shift="8vb"
      ></music-note>
      <music-note note="B" octave="2" duration="quarter"></music-note>
      <music-note note="A" octave="2" duration="quarter"></music-note>
      <music-note
        note="G"
        octave="2"
        duration="quarter"
        octave-stop
      ></music-note>
    </music-staff>
  `,
};

// octave-shift and octave-stop on the same element — the minimal one-note
// span, falling out of the general span model with no special-casing.
export const SingleNote: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note
        note="C"
        octave="6"
        duration="quarter"
        octave-shift="15ma"
        octave-stop
      ></music-note>
      <music-note note="D" octave="5" duration="quarter"></music-note>
      <music-note note="E" octave="5" duration="quarter"></music-note>
      <music-note note="F" octave="5" duration="quarter"></music-note>
    </music-staff>
  `,
};

// A span closed by loco instead of octave-stop: the corner still renders,
// plus a "loco" label just past it.
export const ClosedByLoco: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note
        note="C"
        octave="5"
        duration="quarter"
        octave-shift="8va"
      ></music-note>
      <music-note note="D" octave="5" duration="quarter"></music-note>
      <music-note note="E" octave="5" duration="quarter"></music-note>
      <music-note note="F" octave="5" duration="quarter" loco></music-note>
    </music-staff>
  `,
};

// A standalone "(loco)" reminder with no active octave-shift span anywhere
// in the measure — commonly placed after a rest.
export const StandaloneLoco: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note note="C" octave="5" duration="quarter"></music-note>
      <music-rest duration="quarter"></music-rest>
      <music-note note="D" octave="5" duration="quarter" loco></music-note>
      <music-note note="E" octave="5" duration="quarter"></music-note>
    </music-staff>
  `,
};

// octave-mode="col" on the starting note renders the prose "col 8va" label
// instead of the bare numeral.
export const ColMode: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note
        note="C"
        octave="5"
        duration="quarter"
        octave-shift="8va"
        octave-mode="col"
      ></music-note>
      <music-note note="D" octave="5" duration="quarter"></music-note>
      <music-note note="E" octave="5" duration="quarter"></music-note>
      <music-note
        note="F"
        octave="5"
        duration="quarter"
        octave-stop
      ></music-note>
    </music-staff>
  `,
};
