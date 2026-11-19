import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, nothing } from 'lit';
import '../../index';
import {
  BASE_DURATIONS,
  DURATIONS,
  NOTES,
  OCTAVES,
  TIE_STYLES,
  TREMOLO_BEAM_ATTACHES,
  TREMOLO_BEAM_POSITIONS,
  TREMOLO_STROKE_COUNTS,
  TREMOLO_VALUES,
} from '../../utils';

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

// A numeral above (or below) the stem gives the divisions of the note's
// value: triplets, quintuplets and septuplets.
export const TupletNumerals: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note
        note="G"
        octave="4"
        tremolo="1"
        tremolo-tuplet="3"
      ></music-note>
      <music-note
        note="G"
        octave="4"
        duration="eighth"
        tremolo="1"
        tremolo-tuplet="3"
      ></music-note>
      <music-note note="G" octave="4" duration="eighth"></music-note>
      <music-note
        note="G"
        octave="4"
        duration="half"
        tremolo="1"
        tremolo-tuplet="5"
      ></music-note>
    </music-staff>
    <music-staff clef="treble" time="4/4">
      <music-note
        note="G"
        octave="4"
        duration="half"
        tremolo="1"
        tremolo-tuplet="7"
      ></music-note>
      <music-note
        note="G"
        octave="4"
        tremolo="2"
        tremolo-tuplet="5"
      ></music-note>
      <music-note
        note="G"
        octave="4"
        tremolo="2"
        tremolo-tuplet="7"
      ></music-note>
    </music-staff>
    <music-staff clef="treble" time="4/4">
      <music-note
        note="G"
        octave="4"
        duration="half"
        tremolo="1"
        tremolo-tuplet="6"
      ></music-note>
      <music-note
        note="G"
        octave="4"
        duration="half"
        tremolo="1"
        tremolo-tuplet="6"
      ></music-note>
    </music-staff>
  `,
};

// Each stem carries its own numeral, beyond its tip whichever way it points.
export const NumeralPlacement: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note
        note="E"
        octave="4"
        tremolo="1"
        tremolo-tuplet="3"
      ></music-note>
      <music-note
        note="G"
        octave="4"
        tremolo="1"
        tremolo-tuplet="3"
      ></music-note>
      <music-note
        note="C"
        octave="5"
        tremolo="1"
        tremolo-tuplet="3"
      ></music-note>
      <music-note
        note="E"
        octave="5"
        tremolo="1"
        tremolo-tuplet="3"
      ></music-note>
    </music-staff>
  `,
};

// One articulation mark per repetition, centred on the head.
export const RepeatedArticulation: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note note="D" octave="4" duration="sixteenth"></music-note>
      <music-note note="D" octave="4" duration="sixteenth"></music-note>
      <music-note note="D" octave="4" duration="sixteenth"></music-note>
      <music-note note="D" octave="4" duration="sixteenth"></music-note>
      <music-note
        note="D"
        octave="4"
        tremolo="2"
        articulation="staccato"
        articulation-repeat
      ></music-note>
      <music-note
        note="C"
        octave="5"
        tremolo="1"
        tremolo-tuplet="3"
        articulation="tenuto"
        articulation-repeat
      ></music-note>
      <music-note
        note="A"
        octave="5"
        tremolo="1"
        articulation="portato"
        articulation-repeat
      ></music-note>
    </music-staff>
    <music-staff clef="treble" time="4/4">
      <music-chord
        duration="half"
        tremolo="1"
        tremolo-tuplet="6"
        articulation="staccato"
        articulation-repeat
      >
        <music-note note="E" octave="4"></music-note>
        <music-note note="G" octave="4"></music-note>
      </music-chord>
      <music-note
        note="G"
        octave="4"
        duration="half"
        tremolo="unmeasured"
        articulation="accent"
      ></music-note>
    </music-staff>
  `,
};

// A single accent applies to the first note of the repetition only.
export const SingleAccent: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note
        note="G"
        octave="4"
        duration="half"
        tremolo="1"
        articulation="accent"
      ></music-note>
      <music-note
        note="G"
        octave="4"
        tremolo="2"
        articulation="accent"
      ></music-note>
      <music-note
        note="G"
        octave="4"
        tremolo="2"
        articulation="accent"
      ></music-note>
    </music-staff>
  `,
};

// `trem.` starts an unmeasured passage; `non trem.` marks the first note
// after it, or the first measured abbreviation.
export const TechniqueLabels: Story = {
  render: () => html`
    <music-composition>
      <music-measure>
        <music-staff clef="treble" time="4/4">
          <music-note
            note="C"
            octave="5"
            duration="whole"
            tremolo="unmeasured"
            tremolo-label="trem"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble" time="4/4">
          <music-note
            note="D"
            octave="5"
            duration="sixteenth"
            tremolo="2"
          ></music-note>
          <music-note
            note="G"
            octave="5"
            duration="sixteenth"
            tremolo="2"
          ></music-note>
          <music-note
            note="A"
            octave="4"
            duration="eighth"
            tremolo-label="non-trem"
            tie="start"
          ></music-note>
          <music-note
            note="A"
            octave="4"
            duration="dotted-half"
            tie="end"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
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
      </music-measure>
    </music-composition>
  `,
};

// Ties join unmeasured tremolo notes; a dotted tie repeats its accidental
// over the barline, which a solid tie doesn't need.
export const Ties: Story = {
  args: {
    tieStyle: 'solid',
  },
  argTypes: {
    tieStyle: { control: 'select', options: TIE_STYLES },
  },
  render: (args) => html`
    <music-composition>
      <music-measure>
        <music-staff clef="treble" time="4/4">
          <music-note
            note="A"
            octave="4"
            duration="half"
            tremolo="unmeasured"
            tie="start"
            tie-style=${args.tieStyle}
          ></music-note>
          <music-note
            note="A"
            octave="4"
            duration="eighth"
            tie="end"
            tremolo="unmeasured"
          ></music-note>
          <music-note
            note="C#"
            octave="5"
            duration="eighth"
            tremolo="unmeasured"
          ></music-note>
          <music-note
            note="C#"
            octave="5"
            duration="quarter"
            tremolo="unmeasured"
            tie="start"
            tie-style=${args.tieStyle}
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble" time="4/4">
          <music-note
            note="C#"
            octave="5"
            duration="quarter"
            tremolo="unmeasured"
            tie="end"
          ></music-note>
          <music-note
            note="C#"
            octave="5"
            duration="dotted-quarter"
            tremolo="unmeasured"
          ></music-note>
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="quarter"></music-rest>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// Two-note tremolos: each note is written with the tremolo's whole value, and
// together they fill it once.
export const TwoNoteTremolo: Story = {
  args: {
    duration: 'half',
    strokes: 3,
    beamAttach: '',
    beamPosition: '',
    first: 'F',
    second: 'A',
  },
  argTypes: {
    duration: { control: 'select', options: BASE_DURATIONS },
    strokes: { control: 'select', options: TREMOLO_STROKE_COUNTS },
    beamAttach: { control: 'select', options: ['', ...TREMOLO_BEAM_ATTACHES] },
    beamPosition: {
      control: 'select',
      options: ['', ...TREMOLO_BEAM_POSITIONS],
    },
    first: { control: 'select', options: NOTES },
    second: { control: 'select', options: NOTES },
  },
  render: (args) => html`
    <music-staff clef="treble" time="4/4">
      <music-tremolo
        strokes=${args.strokes}
        beam-attach=${args.beamAttach || nothing}
        beam-position=${args.beamPosition || nothing}
      >
        <music-note
          note=${args.first}
          octave="4"
          duration=${args.duration}
        ></music-note>
        <music-note
          note=${args.second}
          octave=${args.beamPosition ? 5 : 4}
          duration=${args.duration}
        ></music-note>
      </music-tremolo>
    </music-staff>
  `,
};

// Unmeasured semibreves and dotted minim chords, then measured notes.
export const WrittenNoteValues: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-tremolo>
        <music-note note="F" octave="4" duration="whole"></music-note>
        <music-note note="A" octave="4" duration="whole"></music-note>
      </music-tremolo>
    </music-staff>
    <music-staff clef="treble" time="4/4">
      <music-tremolo>
        <music-chord duration="dotted-half">
          <music-note note="C" octave="4"></music-note>
          <music-note note="E" octave="4"></music-note>
        </music-chord>
        <music-chord duration="dotted-half">
          <music-note note="G" octave="4"></music-note>
          <music-note note="B" octave="4"></music-note>
        </music-chord>
      </music-tremolo>
      <music-tremolo>
        <music-note note="C" octave="5" duration="quarter"></music-note>
        <music-note note="G" octave="5" duration="quarter"></music-note>
      </music-tremolo>
    </music-staff>
    <music-staff clef="treble" time="4/4">
      <music-tremolo strokes="2">
        <music-note note="B" octave="4" duration="eighth"></music-note>
        <music-note note="G" octave="4" duration="eighth"></music-note>
      </music-tremolo>
      <music-tremolo strokes="2">
        <music-note note="B" octave="4" duration="eighth"></music-note>
        <music-note note="G" octave="4" duration="eighth"></music-note>
      </music-tremolo>
      <music-note note="B" octave="4" duration="dotted-half"></music-note>
    </music-staff>
  `,
};

// Crotchet tremolos take detached beams only, never a quaver beam.
export const CrotchetTremolos: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      ${[
        ['F', 'A'],
        ['G', 'B'],
        ['A', 'C'],
        ['F', 'A'],
      ].map(
        ([low, high]) => html`
          <music-tremolo>
            <music-note note=${low} octave="4" duration="quarter"></music-note>
            <music-note
              note=${high}
              octave=${high === 'C' ? 5 : 4}
              duration="quarter"
            ></music-note>
          </music-tremolo>
        `
      )}
    </music-staff>
  `,
};

// Minim tremolos: every beam detached (default), all attached, or only the
// outer one attached.
export const MinimBeams: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      ${[null, 'all', 'outer'].map(
        (beamAttach) => html`
          <music-tremolo beam-attach=${beamAttach ?? nothing}>
            <music-note note="F" octave="4" duration="half"></music-note>
            <music-note note="A" octave="4" duration="half"></music-note>
          </music-tremolo>
        `
      )}
      <music-rest duration="quarter"></music-rest>
    </music-staff>
  `,
};

// Both stems point one way and enclose every beam; notes an octave or more
// apart may take the beams between them, keeping their own stems.
export const StemsAndPositions: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-tremolo>
        <music-note note="A" octave="4" duration="half"></music-note>
        <music-note note="F" octave="5" duration="half"></music-note>
      </music-tremolo>
      <music-tremolo>
        <music-note note="G" octave="4" duration="quarter"></music-note>
        <music-note note="D" octave="5" duration="quarter"></music-note>
      </music-tremolo>
      <music-tremolo>
        <music-note note="D" octave="5" duration="quarter"></music-note>
        <music-note note="G" octave="4" duration="quarter"></music-note>
      </music-tremolo>
    </music-staff>
    <music-staff clef="treble" time="4/4">
      <music-tremolo beam-position="between">
        <music-note note="G" octave="4" duration="half"></music-note>
        <music-note note="G" octave="5" duration="half"></music-note>
      </music-tremolo>
      <music-tremolo beam-position="between">
        <music-note note="F" octave="5" duration="quarter"></music-note>
        <music-note note="A" octave="3" duration="quarter"></music-note>
      </music-tremolo>
      <music-rest duration="quarter"></music-rest>
    </music-staff>
  `,
};

// Semibreves take their beams where their stems would be.
export const TwoNoteSemibreves: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-tremolo>
        <music-note note="C" octave="4" duration="whole"></music-note>
        <music-note note="D" octave="5" duration="whole"></music-note>
      </music-tremolo>
    </music-staff>
    <music-staff clef="treble" time="4/4">
      <music-tremolo>
        <music-note note="C" octave="6" duration="whole"></music-note>
        <music-note note="E" octave="5" duration="whole"></music-note>
      </music-tremolo>
    </music-staff>
    <music-staff clef="treble" time="4/4">
      <music-tremolo>
        <music-note note="D" octave="5" duration="whole"></music-note>
        <music-note note="Bb" octave="4" duration="whole"></music-note>
      </music-tremolo>
    </music-staff>
  `,
};

// The second note sits halfway through the tremolo's value, so it lines up
// with the other parts in a score.
export const SecondNoteAlignment: Story = {
  render: () => html`
    <music-measure>
      <music-staff clef="treble" time="4/4">
        <music-tremolo>
          <music-note note="G" octave="5" duration="whole"></music-note>
          <music-note note="B" octave="5" duration="whole"></music-note>
        </music-tremolo>
      </music-staff>
      <music-staff clef="treble" time="4/4">
        ${Array.from(
          { length: 8 },
          () =>
            html`<music-note
              note="E"
              octave="4"
              duration="eighth"
            ></music-note>`
        )}
      </music-staff>
    </music-measure>
    <music-measure>
      <music-staff clef="treble" time="4/4">
        <music-tremolo>
          <music-note
            note="G"
            octave="4"
            duration="double-dotted-half"
          ></music-note>
          <music-note
            note="G"
            octave="4"
            duration="double-dotted-half"
          ></music-note>
        </music-tremolo>
        <music-rest duration="eighth"></music-rest>
      </music-staff>
      <music-staff clef="treble" time="4/4">
        ${Array.from(
          { length: 16 },
          () =>
            html`<music-note
              note="E"
              octave="4"
              duration="sixteenth"
            ></music-note>`
        )}
      </music-staff>
    </music-measure>
    <music-measure>
      <music-staff clef="treble" time="9/8">
        <music-tremolo>
          <music-note note="G" octave="4" duration="dotted-half"></music-note>
          <music-note note="G" octave="4" duration="dotted-half"></music-note>
        </music-tremolo>
        <music-tremolo>
          <music-note
            note="G"
            octave="4"
            duration="dotted-quarter"
          ></music-note>
          <music-note
            note="E"
            octave="5"
            duration="dotted-quarter"
          ></music-note>
        </music-tremolo>
      </music-staff>
      <music-staff clef="treble" time="9/8">
        ${Array.from(
          { length: 9 },
          () =>
            html`<music-note
              note="E"
              octave="4"
              duration="eighth"
            ></music-note>`
        )}
      </music-staff>
    </music-measure>
  `,
};

// Beams stop short of each part's own stems, so two parts' beams don't line
// up; widely spaced notes take shorter, centred beams.
export const BeamLength: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>
        <music-tremolo>
          <music-note note="D" octave="5" duration="quarter"></music-note>
          <music-note note="F" octave="5" duration="quarter"></music-note>
        </music-tremolo>
        <music-tremolo>
          <music-note note="C" octave="5" duration="half"></music-note>
          <music-note note="E" octave="5" duration="half"></music-note>
        </music-tremolo>
        <music-note note="E" octave="5" duration="quarter"></music-note>
      </music-voice>
      <music-voice>
        <music-tremolo>
          <music-note note="F" octave="4" duration="quarter"></music-note>
          <music-note note="A" octave="4" duration="quarter"></music-note>
        </music-tremolo>
        <music-tremolo>
          <music-note note="F" octave="4" duration="half"></music-note>
          <music-note note="G" octave="4" duration="half"></music-note>
        </music-tremolo>
        <music-note note="G" octave="4" duration="quarter"></music-note>
      </music-voice>
    </music-staff>
    <music-composition>
      <music-measure>
        <music-staff clef="treble" time="4/4">
          <music-tremolo>
            <music-note note="B" octave="4" duration="whole"></music-note>
            <music-note note="E" octave="5" duration="whole"></music-note>
          </music-tremolo>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// Each two-note tremolo is beamed on its own, never with its neighbours.
export const SeparateTremolos: Story = {
  render: () => html`
    <music-staff clef="treble" time="2/4">
      ${[
        ['B', 'E'],
        ['F', 'A'],
        ['D', 'E'],
        ['A', 'F'],
      ].map(
        ([first, second]) => html`
          <music-tremolo strokes="2">
            <music-note
              note=${first}
              octave=${first === 'D' ? 5 : 4}
              duration="eighth"
            ></music-note>
            <music-note
              note=${second}
              octave=${second === 'E' ? 5 : 4}
              duration="eighth"
            ></music-note>
          </music-tremolo>
        `
      )}
    </music-staff>
  `,
};

// A slur only when that is the articulation; a slur over the whole figure
// stands in for a tie between tremolos.
export const Slurs: Story = {
  render: () => html`
    <music-staff clef="treble" time="2/4">
      <music-tremolo strokes="2">
        <music-note
          note="A"
          octave="4"
          duration="eighth"
          slur="start"
        ></music-note>
        <music-note
          note="F"
          octave="4"
          duration="eighth"
          slur="end"
        ></music-note>
      </music-tremolo>
      <music-tremolo strokes="2">
        <music-note
          note="E"
          octave="4"
          duration="eighth"
          slur="start"
        ></music-note>
        <music-note
          note="B"
          octave="4"
          duration="eighth"
          slur="end"
        ></music-note>
      </music-tremolo>
      <music-note note="G" octave="4" duration="quarter"></music-note>
    </music-staff>
    <music-staff clef="treble" time="4/4">
      <music-tremolo>
        <music-note
          note="E"
          octave="4"
          duration="whole"
          slur="start"
        ></music-note>
        <music-note note="G" octave="4" duration="whole"></music-note>
      </music-tremolo>
    </music-staff>
    <music-staff clef="treble" time="4/4">
      <music-tremolo>
        <music-note note="E" octave="4" duration="dotted-half"></music-note>
        <music-note
          note="G"
          octave="4"
          duration="dotted-half"
          slur="end"
        ></music-note>
      </music-tremolo>
      <music-tremolo>
        <music-note note="C" octave="5" duration="quarter"></music-note>
        <music-note note="F" octave="4" duration="quarter"></music-note>
      </music-tremolo>
    </music-staff>
  `,
};

// Three or more pitches repeat in turn, each placed its share of the way
// through; minims may beam together.
export const ThreeOrMorePitches: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-tremolo>
        <music-note note="A" octave="4" duration="whole"></music-note>
        <music-note note="B" octave="4" duration="whole"></music-note>
        <music-note note="C" octave="5" duration="whole"></music-note>
      </music-tremolo>
    </music-staff>
    <music-staff clef="treble" time="3/4">
      <music-tremolo>
        <music-note note="B" octave="4" duration="dotted-half"></music-note>
        <music-note note="A" octave="4" duration="dotted-half"></music-note>
        <music-note note="G" octave="4" duration="dotted-half"></music-note>
        <music-note note="F" octave="4" duration="dotted-half"></music-note>
      </music-tremolo>
    </music-staff>
    <music-staff clef="treble" time="2/4">
      <music-tremolo beam-attach="all">
        <music-note note="G" octave="4" duration="half"></music-note>
        <music-note note="A" octave="4" duration="half"></music-note>
        <music-note note="D" octave="4" duration="half"></music-note>
      </music-tremolo>
    </music-staff>
  `,
};
