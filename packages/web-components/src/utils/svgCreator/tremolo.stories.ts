import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../../index';
import { DURATIONS, NOTES, OCTAVES, TREMOLO_VALUES } from '../../utils';

const meta: Meta = {
  title: 'Universal Notations/Tremolos',
  component: 'music-note',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const SingleNote: Story = {
  args: {
    note: 'G',
    octave: 4,
    duration: 'quarter',
    tremolo: 2,
  },
  argTypes: {
    note: { control: 'select', options: NOTES },
    octave: { control: 'select', options: OCTAVES },
    duration: { control: 'select', options: DURATIONS },
    tremolo: { control: 'select', options: TREMOLO_VALUES },
  },
  render: (args) => html`
    <music-staff clef="treble" time="4/4">
      <music-note
        note=${args.note}
        octave=${args.octave}
        duration=${args.duration}
        tremolo=${args.tremolo}
      ></music-note>
    </music-staff>
  `,
};

// Each stroke doubles the repetitions: one, two and three strokes on a
// crotchet and on a dotted crotchet.
export const StrokeCounts: Story = {
  render: () => html`
    <music-staff clef="treble" time="3/4">
      <music-note note="G" octave="4" tremolo="1"></music-note>
      <music-note note="G" octave="4" tremolo="2"></music-note>
      <music-note note="G" octave="4" tremolo="3"></music-note>
    </music-staff>
    <music-staff clef="treble" time="9/8">
      <music-note
        note="G"
        octave="4"
        duration="dotted-quarter"
        tremolo="1"
      ></music-note>
      <music-note
        note="G"
        octave="4"
        duration="dotted-quarter"
        tremolo="2"
      ></music-note>
      <music-note
        note="G"
        octave="4"
        duration="dotted-quarter"
        tremolo="3"
      ></music-note>
    </music-staff>
  `,
};

// A stroke is a shorthand beam: tails and beams count toward the repeated
// value, and the stem lengthens so the strokes stay clear of them.
export const WithTailsAndBeams: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note
        note="E"
        octave="4"
        duration="eighth"
        tremolo="1"
      ></music-note>
      <music-note
        note="E"
        octave="4"
        duration="eighth"
        tremolo="1"
      ></music-note>
      <music-note
        note="E"
        octave="4"
        duration="sixteenth"
        tremolo="1"
      ></music-note>
      <music-note
        note="E"
        octave="4"
        duration="sixteenth"
        tremolo="1"
      ></music-note>
      <music-note
        note="E"
        octave="4"
        duration="eighth"
        tremolo="2"
      ></music-note>
      <music-note
        note="E"
        octave="4"
        duration="eighth"
        tremolo="2"
      ></music-note>
      <music-note
        note="E"
        octave="4"
        duration="eighth"
        tremolo="2"
      ></music-note>
      <music-note
        note="E"
        octave="4"
        duration="sixteenth"
        tremolo="2"
      ></music-note>
      <music-note
        note="E"
        octave="4"
        duration="sixteenth"
        tremolo="2"
      ></music-note>
    </music-staff>
    <music-staff clef="treble" time="3/8">
      <music-note
        note="E"
        octave="4"
        duration="eighth"
        tremolo="2"
      ></music-note>
      <music-note
        note="E"
        octave="4"
        duration="sixteenth"
        tremolo="1"
      ></music-note>
      <music-note
        note="E"
        octave="4"
        duration="sixteenth"
        tremolo="2"
      ></music-note>
      <music-note
        note="E"
        octave="4"
        duration="thirtysecond"
        tremolo="1"
      ></music-note>
    </music-staff>
  `,
};

// One stroke crosses a stave line; two or more keep a space clear of the head.
export const PositionOnTheStave: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note note="E" octave="4" tremolo="1"></music-note>
      <music-note note="C" octave="5" tremolo="1"></music-note>
      <music-note note="G" octave="5" tremolo="3"></music-note>
      <music-note note="F" octave="5" tremolo="3"></music-note>
    </music-staff>
  `,
};

// The stem extends past the outermost stroke, longer than normal for three or
// more strokes.
export const LongerStems: Story = {
  render: () => html`
    <music-staff clef="treble" time="3/2">
      <music-note note="D" octave="4"></music-note>
      <music-note note="D" octave="4" tremolo="3"></music-note>
      <music-note note="D" octave="4" tremolo="4"></music-note>
      <music-note note="D" octave="4"></music-note>
      <music-note note="E" octave="4" tremolo="3"></music-note>
      <music-note note="E" octave="4" tremolo="4"></music-note>
    </music-staff>
  `,
};

// Strokes stay inside the stave, so they are never mistaken for ledger lines.
export const WithinTheStave: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note note="A" octave="3" tremolo="3"></music-note>
      <music-note note="G" octave="6" tremolo="3"></music-note>
      <music-note note="C" octave="6" duration="half" tremolo="3"></music-note>
    </music-staff>
  `,
};

// A semibreve takes strokes of the same width, centred on its head, on the
// side its stem would be.
export const Semibreves: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note note="F" octave="4" duration="whole" tremolo="3"></music-note>
    </music-staff>
    <music-staff clef="treble" time="4/4">
      <music-note note="F" octave="5" duration="whole" tremolo="3"></music-note>
    </music-staff>
  `,
};

// Chords with a second keep the same stroke width; a semibreve second centres
// them on the head on the stem's normal side.
export const Chords: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-chord duration="half" tremolo="3">
        <music-note note="C" octave="4"></music-note>
        <music-note note="E" octave="4"></music-note>
        <music-note note="F" octave="4"></music-note>
      </music-chord>
      <music-chord duration="eighth" tremolo="2">
        <music-note note="F" octave="5"></music-note>
        <music-note note="G" octave="5"></music-note>
      </music-chord>
      <music-chord duration="eighth" tremolo="2">
        <music-note note="A" octave="5"></music-note>
        <music-note note="B" octave="5"></music-note>
      </music-chord>
    </music-staff>
    <music-staff clef="treble" time="4/4">
      <music-chord duration="whole" tremolo="3">
        <music-note note="G" octave="4"></music-note>
        <music-note note="B" octave="4"></music-note>
        <music-note note="C" octave="5"></music-note>
      </music-chord>
    </music-staff>
  `,
};

// Three beams' worth whatever the value: three strokes on a crotchet or
// longer, two on a quaver, one on a semiquaver.
export const Unmeasured: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note note="C" octave="5" duration="half" tremolo="unmeasured">
      </music-note>
      <music-note
        note="C"
        octave="5"
        duration="eighth"
        tremolo="unmeasured"
      ></music-note>
      <music-note note="D" octave="5" duration="eighth"></music-note>
      <music-note
        note="E"
        octave="5"
        duration="sixteenth"
        tremolo="unmeasured"
      ></music-note>
      <music-note
        note="E"
        octave="5"
        duration="sixteenth"
        tremolo="unmeasured"
      ></music-note>
      <music-note note="F" octave="5" duration="eighth"></music-note>
    </music-staff>
  `,
};

// Strokes slant from bottom left to top right whatever the stem direction or
// beam angle.
export const Angle: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note
        note="F"
        octave="5"
        duration="eighth"
        tremolo="2"
      ></music-note>
      <music-note
        note="A"
        octave="5"
        duration="eighth"
        tremolo="2"
      ></music-note>
      <music-note
        note="D"
        octave="4"
        duration="eighth"
        tremolo="2"
      ></music-note>
      <music-note
        note="G"
        octave="4"
        duration="eighth"
        tremolo="2"
      ></music-note>
      <music-note
        note="E"
        octave="4"
        duration="eighth"
        tremolo="1"
      ></music-note>
      <music-note
        note="A"
        octave="4"
        duration="eighth"
        tremolo="1"
      ></music-note>
      <music-note note="D" octave="5" duration="quarter" tremolo="2">
      </music-note>
    </music-staff>
  `,
};

// A beam breaks where notes change between tremolo and plain, so the change
// of technique reads from the beaming.
export const SeparateBeaming: Story = {
  render: () => html`
    <music-staff clef="treble" time="2/4">
      <music-note note="A" octave="4" duration="sixteenth"></music-note>
      <music-note
        note="A"
        octave="4"
        duration="sixteenth"
        tremolo="1"
      ></music-note>
      <music-note
        note="B"
        octave="4"
        duration="sixteenth"
        tremolo="1"
      ></music-note>
      <music-note
        note="C"
        octave="4"
        duration="sixteenth"
        tremolo="1"
      ></music-note>
      <music-note
        note="G"
        octave="4"
        duration="sixteenth"
        tremolo="1"
      ></music-note>
      <music-note note="A" octave="4" duration="sixteenth"></music-note>
      <music-note note="B" octave="4" duration="sixteenth"></music-note>
      <music-note note="G" octave="4" duration="sixteenth"></music-note>
    </music-staff>
  `,
};
