import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../../index';
import { DURATIONS, NOTEHEADS } from '../../utils';

const meta: Meta = {
  title: 'Universal Notations/Noteheads',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const Playground: Story = {
  args: {
    notehead: 'diamond',
    duration: 'half',
  },
  argTypes: {
    notehead: { control: 'select', options: NOTEHEADS },
    duration: { control: 'select', options: DURATIONS },
  },
  render: (args) => html`
    <music-staff clef="treble" time="4/4">
      <music-note
        note="A"
        octave="4"
        duration=${args.duration}
        notehead=${args.notehead}
      ></music-note>
      <music-note
        note="E"
        octave="5"
        duration=${args.duration}
        notehead=${args.notehead}
      ></music-note>
    </music-staff>
  `,
};

// Diamonds ("harmonics") beside ordinary minims: the corners poke just past the stave
// lines, and the stem joins a side corner. The last pair is an artificial
// harmonic (stopped note plus the touched note a fourth above).
export const Diamonds: Story = {
  render: () => html`
    <music-composition>
      <music-measure>
        <music-staff clef="treble" time="2/4">
          <music-note
            note="A"
            octave="4"
            duration="quarter"
            notehead="diamond-white"
          ></music-note>
          <music-note note="A" octave="4" duration="quarter"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble" time="2/4">
          <music-note
            note="E"
            octave="4"
            duration="quarter"
            notehead="diamond-white"
          ></music-note>
          <music-note note="E" octave="4" duration="quarter"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble" time="2/4">
          <music-chord duration="quarter">
            <music-note note="B" octave="4"></music-note>
            <music-note
              note="E"
              octave="5"
              notehead="diamond-white"
            ></music-note>
          </music-chord>
          <music-chord duration="quarter">
            <music-note note="E" octave="4"></music-note>
            <music-note
              note="A"
              octave="4"
              notehead="diamond-white"
            ></music-note>
          </music-chord>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// `diamond` fills by duration (guitar harmonics); `diamond-white` stays white
// (bowed-string and woodwind harmonics).
export const DiamondFill: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note
        note="B"
        octave="4"
        duration="quarter"
        notehead="diamond"
      ></music-note>
      <music-note
        note="B"
        octave="4"
        duration="quarter"
        notehead="diamond-white"
      ></music-note>
      <music-note
        note="B"
        octave="4"
        duration="half"
        notehead="diamond"
      ></music-note>
    </music-staff>
    <music-staff clef="treble" time="4/4">
      <music-note
        note="B"
        octave="4"
        duration="whole"
        notehead="diamond"
      ></music-note>
    </music-staff>
  `,
};

// Crossed noteheads ("x-heads" — dead/muted notes, cymbals, spoken text).
// The stem joins the cross at an arm tip, not its centre; a ledger line still
// passes through or beside the cross.
export const Crosses: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note
        note="E"
        octave="5"
        duration="quarter"
        notehead="x"
      ></music-note>
      <music-note
        note="D"
        octave="5"
        duration="quarter"
        notehead="x"
      ></music-note>
      <music-note
        note="A"
        octave="3"
        duration="quarter"
        notehead="x"
      ></music-note>
      <music-note
        note="G"
        octave="3"
        duration="quarter"
        notehead="x"
      ></music-note>
    </music-staff>
  `,
};

// At half-note length and longer the cross is circled; diamonds are the
// simpler-to-read alternative for percussion (best not mixed with crosses).
export const CrossesWithLongDurations: Story = {
  render: () => html`
    <music-staff clef="treble" time="3/2">
      <music-note
        note="F"
        octave="4"
        duration="sixteenth"
        notehead="x"
      ></music-note>
      <music-note
        note="F"
        octave="4"
        duration="sixteenth"
        notehead="x"
      ></music-note>
      <music-rest duration="eighth"></music-rest>
      <music-note note="G" octave="4" duration="half" notehead="x"></music-note>
      <music-note note="C" octave="5" duration="half" notehead="x"></music-note>
    </music-staff>
    <music-staff clef="treble" time="3/2">
      <music-note
        note="F"
        octave="4"
        duration="sixteenth"
        notehead="x"
      ></music-note>
      <music-note
        note="F"
        octave="4"
        duration="sixteenth"
        notehead="x"
      ></music-note>
      <music-rest duration="eighth"></music-rest>
      <music-note
        note="G"
        octave="4"
        duration="half"
        notehead="diamond"
      ></music-note>
      <music-note
        note="C"
        octave="5"
        duration="half"
        notehead="diamond"
      ></music-note>
    </music-staff>
  `,
};

// "Highest / lowest possible note". The staff places a triangle outside the
// stave, clear of the run it follows; it never takes ledger lines, an
// accidental or a beam, and its stem reaches the middle line.
export const Triangles: Story = {
  render: () => html`
    <music-composition>
      <music-measure>
        <music-staff clef="treble" time="1/8" label="Voice">
          <music-note duration="eighth" notehead="triangle-up"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="bass" time="1/8">
          <music-note duration="eighth" notehead="triangle-down"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble" time="4/4">
          <music-note
            duration="half"
            notehead="triangle-up"
            tie="start"
          ></music-note>
          <music-note
            duration="half"
            notehead="triangle-up"
            tie="end"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const TriangleAfterARun: Story = {
  render: () => html`
    <music-staff clef="treble" time="2/4" label="Vln.">
      <music-note note="A" octave="5" duration="eighth"></music-note>
      <music-note note="F" octave="6" duration="sixteenth"></music-note>
      <music-note note="Bb" octave="6" duration="sixteenth"></music-note>
      <music-note duration="sixteenth" notehead="triangle-up"></music-note>
      <music-rest duration="sixteenth"></music-rest>
      <music-rest duration="eighth"></music-rest>
    </music-staff>
  `,
};

// A glissando from the open E string down to an unspecified lower pitch.
export const GlissandoToTriangle: Story = {
  render: () => html`
    <music-composition>
      <music-measure>
        <music-staff clef="bass" time="2/4" label="D. Bass">
          <music-note
            note="E"
            octave="2"
            duration="half"
            glissando="start"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="bass" time="2/4">
          <music-note
            duration="half"
            notehead="triangle-down"
            glissando="end"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const GraceNoteheads: Story = {
  render: () => html`
    <music-staff clef="treble" time="2/4">
      <music-note
        note="C"
        octave="5"
        duration="quarter"
        notehead="x"
        grace="A,B"
        grace-notehead="x,x"
      ></music-note>
      <music-note
        note="G"
        octave="4"
        duration="quarter"
        notehead="diamond-white"
        grace="E"
        grace-notehead="diamond-white"
      ></music-note>
    </music-staff>
  `,
};
