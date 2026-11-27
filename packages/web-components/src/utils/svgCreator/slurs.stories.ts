import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, nothing } from 'lit';
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

/**
 * A slur goes round the heads and accidentals inside it, steeply at one end
 * when a low note is close beside it.
 */
export const AroundLowerNotes: Story = {
  render: () => html`
    <music-composition time="2/4">
      <music-measure>
        <music-staff clef="bass">
          <music-tuplet ratio="3">
            <music-note
              note="Eb"
              octave="3"
              duration="eighth"
              slur="start"
            ></music-note>
            <music-note note="C" octave="3" duration="eighth"></music-note>
            <music-note note="Bb" octave="2" duration="eighth"></music-note>
          </music-tuplet>
          <music-note note="G" octave="2" duration="sixteenth"></music-note>
          <music-note note="F" octave="2" duration="sixteenth"></music-note>
          <music-note note="E" octave="2" duration="sixteenth"></music-note>
          <music-note
            note="Eb"
            octave="2"
            duration="sixteenth"
            slur="end"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="bass">
          <music-note
            note="C"
            octave="3"
            duration="eighth"
            slur="start"
          ></music-note>
          <music-note note="E" octave="2" duration="eighth"></music-note>
          <music-note note="C" octave="3" duration="eighth"></music-note>
          <music-note note="B" octave="2" duration="eighth"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="bass">
          <music-note note="C" octave="3" duration="quarter"></music-note>
          <music-note
            note="B"
            octave="2"
            duration="quarter"
            slur="end"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

/**
 * Over mixed stems a slur goes above the stave and ends beside the stems, or
 * below when a beam is above one of its ends.
 */
export const OverMixedStems: Story = {
  render: () => html`
    <music-composition time="4/4">
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="F"
            octave="4"
            duration="quarter"
            slur="start"
          ></music-note>
          <music-note note="D" octave="5" duration="quarter"></music-note>
          <music-note note="A" octave="4" duration="quarter"></music-note>
          <music-note
            note="E"
            octave="4"
            duration="quarter"
            slur="end"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="D"
            octave="5"
            duration="half"
            slur="start"
          ></music-note>
          <music-note note="D" octave="5" duration="eighth"></music-note>
          <music-note
            note="C"
            octave="5"
            duration="eighth"
            slur="end"
          ></music-note>
          <music-note note="A" octave="4" duration="eighth"></music-note>
          <music-note note="B" octave="3" duration="eighth"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="A"
            octave="4"
            duration="quarter"
            slur="start"
          ></music-note>
          <music-note note="B" octave="4" duration="eighth"></music-note>
          <music-note
            note="C"
            octave="5"
            duration="eighth"
            slur="end"
          ></music-note>
          <music-note
            note="C"
            octave="5"
            duration="quarter"
            slur="start"
          ></music-note>
          <music-note
            note="F"
            octave="4"
            duration="quarter"
            slur="end"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-note
            id="phrase"
            note="F"
            octave="4"
            duration="eighth"
            slur="start"
          ></music-note>
          <music-note note="G" octave="4" duration="eighth"></music-note>
          <music-note
            note="A"
            octave="4"
            duration="eighth"
            slur="start"
          ></music-note>
          <music-note
            note="G"
            octave="4"
            duration="eighth"
            slur="end"
          ></music-note>
          <music-note note="D" octave="5" duration="quarter"></music-note>
          <music-note
            note="A"
            octave="4"
            duration="quarter"
            slur="end"
            for="phrase"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// Four eighths on one pitch, each carrying `articulation`; slurred as a group
// when `slurred`.
const articulatedGroup = (articulation: string, slurred: boolean) => html`
  <music-measure>
    <music-staff clef="treble" time="2/4">
      ${[0, 1, 2, 3].map(
        (index) => html`<music-note
          note="E"
          octave="4"
          duration="eighth"
          articulation=${articulation}
          slur=${slurred && index === 0
            ? 'start'
            : slurred && index === 3
            ? 'end'
            : nothing}
        ></music-note>`
      )}
    </music-staff>
  </music-measure>
`;

/**
 * Staccato, tenuto and portato under slurs: each note keeps its own attack and
 * the slur goes outside the marks, at its ends and over the notes between.
 */
export const ArticulationUnderSlurs: Story = {
  render: () => html`
    <music-composition>
      ${articulatedGroup('staccato', true)} ${articulatedGroup('tenuto', true)}
      ${articulatedGroup('portato', true)}
    </music-composition>
  `,
};

/**
 * A dotted slur marks phrase structure apart from the legato slurs inside it,
 * and rides outside them. The style is read from the slur's start.
 */
export const DottedPhraseSlur: Story = {
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
        slur-style="dotted"
      ></music-note>
      <music-note
        note="D"
        octave="5"
        duration="eighth"
        slur="start"
      ></music-note>
      <music-note note="E" octave="5" duration="eighth"></music-note>
      <music-note note="F" octave="5" duration="eighth" slur="end"></music-note>
      <music-note
        note="G"
        octave="5"
        duration="eighth"
        slur="start"
      ></music-note>
      <music-note note="F" octave="5" duration="eighth"></music-note>
      <music-note note="E" octave="5" duration="eighth" slur="end"></music-note>
      <music-note note="D" octave="5" duration="eighth" slur="end"></music-note>
    </music-staff>
  `,
};
