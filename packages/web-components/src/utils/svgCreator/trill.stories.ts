import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../../index';
import {
  ACCIDENTAL_TYPES,
  DURATIONS,
  NOTES,
  OCTAVES,
  TRILL_CONTINUATION_MODES,
  TRILL_FINISH_SLURS,
  TRILL_LINE_MODES,
} from '../../utils';

const meta: Meta = {
  title: 'Universal Notations/Trills',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

// The line is drawn by default, matching standard engraving practice, even
// for a single untied note-value — `trill-line="none"` suppresses it for the
// rare case an engraver wants the bare sign only. Toggle the control below to
// compare both.
export const SingleNote: Story = {
  args: {
    note: 'C',
    octave: 5,
    duration: 'quarter',
    trillLine: 'auto',
  },
  argTypes: {
    note: { control: 'select', options: NOTES },
    octave: { control: 'select', options: OCTAVES },
    duration: { control: 'select', options: DURATIONS },
    trillLine: { control: 'select', options: TRILL_LINE_MODES },
  },
  render: (args) => html`
    <music-staff clef="treble" time="4/4">
      <music-note
        note=${args.note}
        octave=${args.octave}
        duration=${args.duration}
        trill
        trill-line=${args.trillLine}
      ></music-note>
      <music-note note="D" octave="5" duration="quarter"></music-note>
      <music-note note="E" octave="5" duration="quarter"></music-note>
      <music-note note="F" octave="5" duration="quarter"></music-note>
    </music-staff>
  `,
};

export const TiedLine: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note
        note="C"
        octave="5"
        duration="quarter"
        trill
        tie="start"
      ></music-note>
      <music-note note="C" octave="5" duration="half" tie="end"></music-note>
      <music-note note="D" octave="5" duration="quarter"></music-note>
    </music-staff>
  `,
};

export const ExplicitStop: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note
        note="C"
        octave="5"
        duration="quarter"
        trill
        tie="start"
      ></music-note>
      <music-note
        note="C"
        octave="5"
        duration="quarter"
        tie="end"
        trill-stop
      ></music-note>
      <music-note note="D" octave="5" duration="half"></music-note>
    </music-staff>
  `,
};

export const ReArticulated: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note note="C" octave="5" duration="quarter" trill></music-note>
      <music-note note="D" octave="5" duration="quarter" trill></music-note>
      <music-note note="E" octave="5" duration="quarter" trill></music-note>
      <music-note note="F" octave="5" duration="quarter" trill></music-note>
    </music-staff>
  `,
};

export const KeySignatureVariants: Story = {
  args: {
    keySig: 'G',
  },
  argTypes: {
    keySig: { control: 'select', options: NOTES },
  },
  render: (args) => html`
    <!-- G major (F# in the signature): the trill on E resolves to F#, not F natural. -->
    <music-staff clef="treble" time="4/4" key-sig=${args.keySig}>
      <music-note note="E" octave="5" duration="quarter" trill></music-note>
      <music-note note="F" octave="5" duration="quarter"></music-note>
      <music-note note="G" octave="5" duration="quarter"></music-note>
      <music-note note="A" octave="5" duration="quarter"></music-note>
    </music-staff>
  `,
};

export const AccidentalOverride: Story = {
  args: {
    trillAccidental: 'natural',
  },
  argTypes: {
    trillAccidental: { control: 'select', options: ACCIDENTAL_TYPES },
  },
  render: (args) => html`
    <!-- G major would otherwise imply F# above E; the override cancels it. -->
    <music-staff clef="treble" time="4/4" key-sig="G">
      <music-note
        note="E"
        octave="5"
        duration="quarter"
        trill
        trill-accidental=${args.trillAccidental}
      ></music-note>
      <music-note note="F" octave="5" duration="quarter"></music-note>
      <music-note note="G" octave="5" duration="quarter"></music-note>
      <music-note note="A" octave="5" duration="quarter"></music-note>
    </music-staff>
  `,
};

export const OnAChord: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-chord chord="C" duration="quarter" trill></music-chord>
      <music-chord chord="Dm" duration="quarter"></music-chord>
      <music-chord chord="Em" duration="quarter"></music-chord>
      <music-chord chord="F" duration="quarter"></music-chord>
    </music-staff>
  `,
};

export const WrittenTrillingNote: Story = {
  args: {
    trillNote: 'C#',
  },
  argTypes: {
    trillNote: { control: 'select', options: NOTES },
  },
  render: (args) => html`
    <!-- A same-letter chromatic trill can't be named by a plain accidental
    override, since the default resolution always steps to the next letter —
    trill-note names the exact pitch instead, drawn as a small parenthesized
    notehead after the main one. -->
    <music-staff clef="treble" time="4/4">
      <music-note
        note="C"
        octave="5"
        duration="quarter"
        trill
        trill-note=${args.trillNote}
      ></music-note>
      <music-note note="D" octave="5" duration="quarter"></music-note>
      <music-note note="E" octave="5" duration="quarter"></music-note>
      <music-note note="F" octave="5" duration="quarter"></music-note>
    </music-staff>
  `,
};

export const WrittenTrillingNoteDefersToSecondTiedNote: Story = {
  render: () => html`
    <!-- The main note is a short value, so the written notehead anchors after
    the second note of its tie chain rather than crowding the first. -->
    <music-staff clef="treble" time="4/4">
      <music-note
        note="C"
        octave="5"
        duration="eighth"
        trill
        trill-note="D"
        tie="start"
      ></music-note>
      <music-note note="C" octave="5" duration="eighth" tie="end"></music-note>
      <music-note note="D" octave="5" duration="quarter"></music-note>
    </music-staff>
  `,
};

export const CrossSystemTrillContinuation: Story = {
  name: 'Cross System - Trill Continuation',
  args: {
    trillContinuation: 'bracketed',
  },
  argTypes: {
    trillContinuation: {
      control: 'select',
      options: TRILL_CONTINUATION_MODES,
    },
  },
  render: (args) => html`
    <!-- Narrow enough that the two measures wrap onto separate rows — the
    tie chain carries the trill's line across the wrap with no repeated
    trill attribute, restating the sign in parentheses by default. -->
    <div style="max-width: 200px;">
      <music-composition>
        <music-measure>
          <music-staff clef="treble" time="4/4">
            <music-note note="C" octave="5" duration="quarter"></music-note>
            <music-note note="D" octave="5" duration="quarter"></music-note>
            <music-note note="E" octave="5" duration="quarter"></music-note>
            <music-note
              note="F"
              octave="5"
              duration="quarter"
              trill
              trill-continuation=${args.trillContinuation}
              tie="start"
            ></music-note>
          </music-staff>
        </music-measure>
        <music-measure>
          <music-staff clef="treble" time="4/4">
            <music-note
              note="F"
              octave="5"
              duration="half"
              tie="end"
            ></music-note>
            <music-note note="G" octave="5" duration="quarter"></music-note>
            <music-note note="A" octave="5" duration="quarter"></music-note>
          </music-staff>
        </music-measure>
      </music-composition>
    </div>
  `,
};

export const TrillFinishToMain: Story = {
  name: 'Trill Finish - To Main',
  args: {
    trillFinishSlur: 'to-main',
  },
  argTypes: {
    trillFinishSlur: { control: 'select', options: TRILL_FINISH_SLURS },
  },
  render: (args) => html`
    <!-- The finishing grace note closes the trill, slurred back to the note
    it ornaments — the default. -->
    <music-staff clef="treble" time="4/4">
      <music-note
        note="C"
        octave="5"
        duration="quarter"
        trill
        trill-finish="D"
        trill-finish-slur=${args.trillFinishSlur}
      ></music-note>
      <music-note note="E" octave="5" duration="quarter"></music-note>
      <music-note note="F" octave="5" duration="quarter"></music-note>
      <music-note note="G" octave="5" duration="quarter"></music-note>
    </music-staff>
  `,
};

export const TrillFinishToNext: Story = {
  name: 'Trill Finish - To Next',
  render: () => html`
    <!-- The finishing grace note instead slurs forward, into the note that
    follows it — drawn by the staff itself, since it reaches a sibling
    element the note has no knowledge of. -->
    <music-staff clef="treble" time="4/4">
      <music-note
        note="C"
        octave="5"
        duration="quarter"
        trill
        trill-finish="D"
        trill-finish-slur="to-next"
      ></music-note>
      <music-note note="E" octave="5" duration="quarter"></music-note>
      <music-note note="F" octave="5" duration="quarter"></music-note>
      <music-note note="G" octave="5" duration="quarter"></music-note>
    </music-staff>
  `,
};

export const TrillFinishBoth: Story = {
  name: 'Trill Finish - Both',
  render: () => html`
    <!-- Both slurs at once: back to the trilled note and forward to the
    next one. -->
    <music-staff clef="treble" time="4/4">
      <music-note
        note="C"
        octave="5"
        duration="quarter"
        trill
        trill-finish="D,C"
        trill-finish-slur="both"
      ></music-note>
      <music-note note="E" octave="5" duration="quarter"></music-note>
      <music-note note="F" octave="5" duration="quarter"></music-note>
      <music-note note="G" octave="5" duration="quarter"></music-note>
    </music-staff>
  `,
};
