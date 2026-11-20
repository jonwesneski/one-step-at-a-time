import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../../index';
import { MEASURE_END_BARLINES } from '../consts';

const meta: Meta = {
  title: 'Universal Notations/Repeats',
  component: 'music-barline',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

const wholeF = html`<music-note
  note="F"
  octave="4"
  duration="whole"
></music-note>`;

// Each end barline a measure takes, then a measure with a start repeat.
export const MeasureBarlines: Story = {
  render: () => html`
    <div style="display: flex; gap: 24px; flex-wrap: wrap;">
      ${MEASURE_END_BARLINES.map(
        (barline) => html`
          <div>
            <code>barline="${barline}"</code>
            <music-measure time="4/4" barline=${barline}>
              <music-staff clef="treble">${wholeF}</music-staff>
            </music-measure>
          </div>
        `
      )}
      <div>
        <code>repeat-start</code>
        <music-measure time="4/4" repeat-start>
          <music-staff clef="treble">${wholeF}</music-staff>
        </music-measure>
      </div>
    </div>
  `,
};

// Repeat barlines placed mid-bar: the three eighths before the end of the
// first bar and the half and eighth before the end repeat make up a whole bar.
export const MidBarRepeat: Story = {
  render: () => html`
    <music-composition time="4/4">
      <music-measure>
        <music-staff clef="treble">
          <music-note note="F" octave="4" duration="half"></music-note>
          <music-note note="F" octave="4" duration="eighth"></music-note>
          <music-barline type="repeat-start"></music-barline>
          <music-note note="F" octave="4" duration="eighth"></music-note>
          <music-note note="F" octave="4" duration="eighth"></music-note>
          <music-note note="F" octave="4" duration="eighth"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">${wholeF}</music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="F"
            octave="4"
            duration="half"
            tie="start"
          ></music-note>
          <music-note
            note="F"
            octave="4"
            duration="eighth"
            tie="end"
          ></music-note>
          <music-barline type="repeat-end"></music-barline>
          <music-rest duration="eighth"></music-rest>
          <music-note note="F" octave="4" duration="quarter"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">${wholeF}</music-staff>
      </music-measure>
    </music-composition>
  `,
};

// Adjacent repeated sections: an end repeat and the next start repeat share
// one thick line (thin–thick–thin).
export const BackToBack: Story = {
  render: () => html`
    <music-composition time="4/4">
      <music-measure repeat-start>
        <music-staff clef="treble">${wholeF}</music-staff>
      </music-measure>
      <music-measure barline="repeat-end">
        <music-staff clef="treble">${wholeF}</music-staff>
      </music-measure>
      <music-measure repeat-start>
        <music-staff clef="treble">${wholeF}</music-staff>
      </music-measure>
      <music-measure barline="repeat-end">
        <music-staff clef="treble">${wholeF}</music-staff>
      </music-measure>
    </music-composition>
  `,
};

// A new time signature or clef at the start of a repeated section goes
// before the start repeat.
export const ChangesBeforeStartRepeat: Story = {
  render: () => html`
    <music-composition time="3/4">
      <music-measure repeat-start>
        <music-staff clef="bass">
          <music-note note="D" octave="3" duration="dotted-half"></music-note>
        </music-staff>
      </music-measure>
      <music-measure barline="repeat-end">
        <music-staff clef="bass">
          <music-note note="D" octave="3" duration="dotted-half"></music-note>
        </music-staff>
      </music-measure>
      <music-measure time="4/4" repeat-start>
        <music-staff clef="bass">
          <music-note note="D" octave="3" duration="whole"></music-note>
        </music-staff>
      </music-measure>
      <music-measure time="4/4" barline="repeat-end">
        <music-staff clef="bass">
          <music-note note="D" octave="3" duration="whole"></music-note>
        </music-staff>
      </music-measure>
      <music-measure repeat-start>
        <music-staff clef="treble">
          <music-note note="F" octave="4" duration="dotted-half"></music-note>
        </music-staff>
      </music-measure>
      <music-measure barline="repeat-end">
        <music-staff clef="treble">
          <music-note note="F" octave="4" duration="dotted-half"></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// Repeat barlines, and a mid-bar barline written in one staff only, run
// through both staves of a grand staff.
export const GrandStaff: Story = {
  render: () => html`
    <music-composition time="4/4">
      <music-measure repeat-start>
        <music-staff clef="treble" group="grand">
          <music-note note="E" octave="5" duration="quarter"></music-note>
          <music-note note="D" octave="5" duration="quarter"></music-note>
          <music-barline></music-barline>
          <music-note note="C" octave="5" duration="half"></music-note>
        </music-staff>
        <music-staff clef="bass">
          <music-note note="C" octave="3" duration="half"></music-note>
          <music-note note="G" octave="2" duration="half"></music-note>
        </music-staff>
      </music-measure>
      <music-measure barline="repeat-end">
        <music-staff clef="treble" group="grand">
          <music-note note="G" octave="4" duration="whole"></music-note>
        </music-staff>
        <music-staff clef="bass">
          <music-note note="C" octave="3" duration="whole"></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

type DoubleBarArgs = { doubleBarBeforeRepeat: boolean };

// A narrow score where the start repeat lands at a row start. Some editions
// end the previous row with a thin double barline.
export const DoubleBarBeforeRepeat: StoryObj<DoubleBarArgs> = {
  args: { doubleBarBeforeRepeat: true },
  render: ({ doubleBarBeforeRepeat }) => html`
    <music-composition
      time="4/4"
      max-width="420"
      ?double-bar-before-repeat=${doubleBarBeforeRepeat}
    >
      ${[0, 1, 2].map(
        (i) => html`
          <music-measure ?repeat-start=${i === 2}>
            <music-staff clef="treble">
              <music-note note="G" octave="4" duration="quarter"></music-note>
              <music-note note="A" octave="4" duration="quarter"></music-note>
              <music-note note="B" octave="4" duration="quarter"></music-note>
              <music-note note="C" octave="5" duration="quarter"></music-note>
            </music-staff>
          </music-measure>
        `
      )}
      <music-measure barline="repeat-end">
        <music-staff clef="treble">${wholeF}</music-staff>
      </music-measure>
    </music-composition>
  `,
};
