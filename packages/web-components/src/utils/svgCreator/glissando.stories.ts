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
