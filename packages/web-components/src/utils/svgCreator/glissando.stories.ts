import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../../index';

const meta: Meta = {
  title: 'Universal Notations/Glissandos',
  component: 'music-note',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

/**
 * The line runs beside the heads: level with a dot it starts after, off any
 * stave line its head is on, and short of the end note's accidental or grace
 * notes.
 */
export const BetweenTheHeads: Story = {
  render: () => html`
    <music-composition time="4/4">
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="E"
            octave="4"
            duration="half"
            glissando="start"
            glissando-hint="gliss"
          ></music-note>
          <music-note
            note="C"
            octave="5"
            duration="half"
            glissando="end"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="G"
            octave="4"
            duration="dotted-quarter"
            glissando="start"
            slur="start"
          ></music-note>
          <music-note
            note="F"
            octave="4"
            duration="eighth"
            glissando="end"
            slur="end"
          ></music-note>
          <music-note
            note="C"
            octave="4"
            duration="quarter"
            glissando="start"
          ></music-note>
          <music-note
            note="Eb"
            octave="5"
            duration="quarter"
            glissando="end"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="C"
            octave="5"
            duration="quarter"
            glissando="start"
          ></music-note>
          <music-note
            note="A"
            octave="4"
            duration="quarter"
            glissando="end"
            grace="B,C"
            grace-octave="4,5"
          ></music-note>
          <music-chord duration="quarter">
            <music-note
              id="lower"
              note="E"
              octave="4"
              glissando="start"
            ></music-note>
            <music-note
              id="upper"
              note="G"
              octave="4"
              glissando="start"
            ></music-note>
          </music-chord>
          <music-chord duration="quarter">
            <music-note
              note="A"
              octave="4"
              glissando="end"
              for="lower"
            ></music-note>
            <music-note
              note="C"
              octave="5"
              glissando="end"
              for="upper"
            ></music-note>
          </music-chord>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

/**
 * A dip is centred in the start note's own bar, and the line carries on over
 * the barline. A wave keeps to whole half-waves.
 */
export const DipAndWave: Story = {
  render: () => html`
    <music-composition time="2/4">
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="E"
            octave="5"
            duration="half"
            glissando="start"
            glissando-shape="dip"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="E"
            octave="5"
            duration="quarter"
            glissando="end"
          ></music-note>
          <music-note note="A" octave="4" duration="quarter"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="G"
            octave="4"
            duration="quarter"
            glissando="start"
            glissando-shape="wave"
          ></music-note>
          <music-note
            note="D"
            octave="5"
            duration="quarter"
            glissando="end"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

/** Both halves keep one slope over a system break. */
export const AcrossASystemBreak: Story = {
  render: () => html`
    <div style="width: 340px">
      <music-composition time="4/4">
        <music-measure>
          <music-staff clef="treble">
            <music-note note="C" octave="4" duration="half"></music-note>
            <music-note
              note="E"
              octave="4"
              duration="half"
              glissando="start"
              glissando-hint="gliss"
            ></music-note>
          </music-staff>
        </music-measure>
        <music-measure>
          <music-staff clef="treble">
            <music-note
              note="F"
              octave="5"
              duration="half"
              glissando="end"
            ></music-note>
            <music-note note="C" octave="5" duration="half"></music-note>
          </music-staff>
        </music-measure>
      </music-composition>
    </div>
  `,
};

/**
 * A bend is a line after one note that fills its duration: free, to a pitch in
 * parentheses, or shaped by its contour. It stops before the next note, its
 * accidental or the barline.
 */
export const PitchBends: Story = {
  render: () => html`
    <music-composition time="2/4">
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="Bb"
            octave="4"
            duration="quarter"
            bend="down"
          ></music-note>
          <music-note
            note="A"
            octave="4"
            duration="quarter"
            bend="up"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="C#"
            octave="5"
            duration="half"
            bend-to="C#"
            bend-to-quarter-tone="up"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="G"
            octave="4"
            duration="quarter"
            bend="wave"
          ></music-note>
          <music-note
            note="E"
            octave="5"
            duration="quarter"
            bend="dip"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

/**
 * Bends make room in quick notes, past dots and tails and for their targets. A
 * chord bends from every head, or from one tone's alone.
 */
export const BendsInAPassage: Story = {
  render: () => html`
    <music-composition time="4/4">
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="F"
            octave="4"
            duration="eighth"
            bend="wave"
          ></music-note>
          <music-note
            note="A"
            octave="5"
            duration="quarter"
            bend-to="B"
            bend-to-quarter-tone="down"
          ></music-note>
          <music-note note="C#" octave="6" duration="eighth"></music-note>
          <music-note
            note="C#"
            octave="5"
            duration="dotted-quarter"
            bend-to="C"
          ></music-note>
          <music-note
            note="D"
            octave="5"
            duration="eighth"
            bend="down"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-chord duration="dotted-quarter" bend="down">
            <music-note note="E" octave="4"></music-note>
            <music-note note="G" octave="4"></music-note>
            <music-note note="C" octave="5"></music-note>
          </music-chord>
          <music-chord duration="eighth" bend="up">
            <music-note note="F" octave="4"></music-note>
            <music-note note="G" octave="4"></music-note>
          </music-chord>
          <music-chord duration="half">
            <music-note note="G" octave="4"></music-note>
            <music-note note="Eb" octave="5" bend-to="D"></music-note>
          </music-chord>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

/**
 * A label sits above the stave and the ink under it, grace beams included, and
 * stacks above a tremolo label. It starts at the head, at the note's own
 * accidental (quasi gliss.) or over the grace notes (chrom.), and shifts left
 * rather than run past the bar.
 */
export const LabelsAboveTheStave: Story = {
  render: () => html`
    <music-composition time="4/4">
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="E"
            octave="4"
            duration="quarter"
            tremolo="unmeasured"
            tremolo-label="flz"
            glissando-label="lip"
          ></music-note>
          <music-note note="G" octave="4" duration="quarter"></music-note>
          <music-note
            note="E"
            octave="5"
            duration="half"
            bend="dip"
            glissando-label="bend down|¼-tone"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-tuplet ratio="3">
            <music-note
              note="Eb"
              octave="5"
              duration="eighth"
              glissando-label="quasi-gliss"
            ></music-note>
            <music-note note="C" octave="5" duration="eighth"></music-note>
            <music-note note="Bb" octave="4" duration="eighth"></music-note>
          </music-tuplet>
          <music-note
            note="C"
            octave="5"
            duration="quarter"
            grace="G#,A,A#,B"
            grace-octave="4,4,4,4"
            grace-duration="sixteenth"
            glissando-label="chrom"
          ></music-note>
          <music-note note="A" octave="4" duration="quarter"></music-note>
          <music-note
            note="G"
            octave="4"
            duration="quarter"
            bend="wave"
            glissando-label="bend pitch by a ¼-tone"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};
