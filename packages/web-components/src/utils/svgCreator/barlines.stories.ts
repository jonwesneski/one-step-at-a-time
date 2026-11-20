import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, nothing } from 'lit';
import '../../index';
import type { EndingNumbering } from '../../types/theory';
import { ENDING_NUMBERINGS, MEASURE_END_BARLINES } from '../consts';

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

const createMusicNote = (duration: string, extra = '') =>
  html`<music-note
    note="F"
    octave="4"
    duration=${duration}
    tie=${extra === 'tie-start'
      ? 'start'
      : extra === 'tie-end'
      ? 'end'
      : nothing}
    articulation=${extra === 'fermata' ? 'fermata' : nothing}
  ></music-note>`;

const tiedOpeningBar = html`
  <music-measure>
    <music-staff clef="treble"
      >${createMusicNote('half', 'tie-start')}</music-staff
    >
  </music-measure>
`;

// First and second endings; the second closes at the final barline.
export const FirstAndSecondEndings: Story = {
  render: () => html`
    <music-composition time="2/4">
      ${tiedOpeningBar}
      <music-measure ending="1" barline="repeat-end">
        <music-staff clef="treble"
          >${createMusicNote('half', 'tie-end')}</music-staff
        >
      </music-measure>
      <music-measure ending="2" barline="final">
        <music-staff clef="treble"
          >${createMusicNote('half', 'fermata')}</music-staff
        >
      </music-measure>
    </music-composition>
  `,
};

// Three endings: the first two both return to the start of the section.
export const ThreeEndings: Story = {
  render: () => html`
    <music-composition time="2/4">
      ${tiedOpeningBar}
      <music-measure ending="1" barline="repeat-end">
        <music-staff clef="treble"
          >${createMusicNote('half', 'tie-end')}</music-staff
        >
      </music-measure>
      <music-measure ending="2" barline="repeat-end">
        <music-staff clef="treble">
          ${createMusicNote('quarter')}<music-rest
            duration="quarter"
          ></music-rest>
        </music-staff>
      </music-measure>
      <music-measure ending="3" barline="final">
        <music-staff clef="treble"
          >${createMusicNote('half', 'fermata')}</music-staff
        >
      </music-measure>
    </music-composition>
  `,
};

type EndingLabelArgs = { finalEnding: string; endingLabel: string };

// One bracket for passes 1 and 2, then a last ending labelled with text or
// its numeral.
export const CombinedEndings: StoryObj<EndingLabelArgs> = {
  args: { finalEnding: '3', endingLabel: 'Fine' },
  render: ({ finalEnding, endingLabel }) => html`
    <music-composition time="2/4">
      ${tiedOpeningBar}
      <music-measure ending="1,2" barline="repeat-end">
        <music-staff clef="treble"
          >${createMusicNote('half', 'tie-end')}</music-staff
        >
      </music-measure>
      <music-measure
        ending=${finalEnding}
        ending-label=${endingLabel === '' ? undefined : endingLabel}
        barline="final"
      >
        <music-staff clef="treble"
          >${createMusicNote('half', 'fermata')}</music-staff
        >
      </music-measure>
    </music-composition>
  `,
};

// A repeat that starts on a pickup is completed by its endings.
export const IncompleteRepeatWithEndings: Story = {
  render: () => html`
    <music-composition time="4/4">
      <music-measure>
        <music-staff clef="treble">
          ${createMusicNote('half')}${createMusicNote(
            'eighth'
          )}${createMusicNote('eighth')}${createMusicNote(
            'eighth'
          )}${createMusicNote('eighth')}
        </music-staff>
      </music-measure>
      <music-measure repeat-start>
        <music-staff clef="treble">${createMusicNote('whole')}</music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">${createMusicNote('whole')}</music-staff>
      </music-measure>
      <music-measure ending="1" barline="repeat-end">
        <music-staff clef="treble">
          ${createMusicNote('half', 'tie-start')}${createMusicNote(
            'eighth',
            'tie-end'
          )}${createMusicNote('eighth')}
          ${createMusicNote('eighth')}${createMusicNote('eighth')}
        </music-staff>
      </music-measure>
      <music-measure ending="2">
        <music-staff clef="treble">
          ${createMusicNote('half', 'tie-start')}${createMusicNote(
            'eighth',
            'tie-end'
          )}
          <music-rest duration="eighth"></music-rest>${createMusicNote(
            'quarter'
          )}
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">${createMusicNote('whole')}</music-staff>
      </music-measure>
    </music-composition>
  `,
};

// A narrow score: the first ending crosses a row break and continues after
// the clef with no label or hook.
export const EndingAcrossRows: Story = {
  render: () => html`
    <music-composition time="4/4" max-width="460">
      ${[0, 1, 2, 3, 4].map(
        (i) => html`
          <music-measure
            ending=${i >= 2 && i <= 3 ? '1' : i === 4 ? '2' : nothing}
            barline=${i === 3 ? 'repeat-end' : nothing}
          >
            <music-staff clef="treble">${createMusicNote('whole')}</music-staff>
          </music-measure>
        `
      )}
    </music-composition>
  `,
};

type NumberingArgs = { endingNumbering: EndingNumbering };

// Bar numbers through endings: consecutive (every first-time bar and the
// first second-time bar shown) or duplicate (19a 20a 21a, 19b 20b 21b, 22).
export const EndingBarNumbers: StoryObj<NumberingArgs> = {
  args: { endingNumbering: 'duplicate' },
  argTypes: {
    endingNumbering: { control: 'inline-radio', options: ENDING_NUMBERINGS },
  },
  render: ({ endingNumbering }) => html`
    <music-composition
      time="4/4"
      measure-numbers="row-start"
      ending-numbering=${endingNumbering}
    >
      ${['', '1', '1', '1', '2', '2', '2', ''].map(
        (ending, i) => html`
          <music-measure
            ending=${ending === '' ? undefined : ending}
            barline=${i === 3 ? 'repeat-end' : nothing}
          >
            <music-staff clef="treble">${createMusicNote('whole')}</music-staff>
          </music-measure>
        `
      )}
    </music-composition>
  `,
};

// The bracket goes over the top staff only.
export const EndingsOnGrandStaff: Story = {
  render: () => html`
    <music-composition time="4/4">
      ${['1', '2'].map(
        (ending) => html`
          <music-measure
            ending=${ending}
            barline=${ending === '1' ? 'repeat-end' : 'final'}
          >
            <music-staff clef="treble" group="grand">
              <music-note note="E" octave="5" duration="whole"></music-note>
            </music-staff>
            <music-staff clef="bass">
              <music-note note="C" octave="3" duration="whole"></music-note>
            </music-staff>
          </music-measure>
        `
      )}
    </music-composition>
  `,
};

// A measure on its own draws its own bracket.
export const StandaloneEnding: Story = {
  render: () => html`
    <music-measure time="2/4" ending="1" barline="repeat-end">
      <music-staff clef="treble">${createMusicNote('half')}</music-staff>
    </music-measure>
  `,
};

const wholeIn = (clef: 'treble' | 'bass') =>
  html`<music-note
    note="C"
    octave=${clef === 'bass' ? 3 : 5}
    duration="whole"
  ></music-note>`;

const dottedHalfA = html`<music-note
  note="A"
  octave="4"
  duration="dotted-half"
></music-note>`;

const clefChangeToTreble = html`
  <music-note note="C" octave="3" duration="half"></music-note>
  <music-clef clef="treble"></music-clef>
  <music-note note="G" octave="4" duration="half"></music-note>
`;

type RowWidthArgs = { maxWidth: number };

// A change during the repeated passage makes the first-time bar reinstate
// the start's clef, key and time before :‖; the second-time bar, resuming the
// music as it was before the endings, shows it in brackets.
export const WarningsBeforeEndRepeat: StoryObj<RowWidthArgs> = {
  args: { maxWidth: 900 },
  argTypes: { maxWidth: { control: { type: 'range', min: 500, max: 1200 } } },
  render: ({ maxWidth }) => html`
    <music-composition time="4/4" max-width=${maxWidth}>
      <music-measure>
        <music-staff clef="bass">${wholeIn('bass')}</music-staff>
      </music-measure>
      <music-measure repeat-start>
        <music-staff clef="bass">${clefChangeToTreble}</music-staff>
      </music-measure>
      <music-measure key-sig="D" time="3/4">
        <music-staff clef="treble">${dottedHalfA}</music-staff>
      </music-measure>
      <music-measure key-sig="D" time="3/4" ending="1" barline="repeat-end">
        <music-staff clef="treble">${dottedHalfA}</music-staff>
      </music-measure>
      <music-measure key-sig="D" time="3/4" ending="2">
        <music-staff clef="treble">${dottedHalfA}</music-staff>
      </music-measure>
      <music-measure key-sig="D" time="3/4">
        <music-staff clef="treble">${dottedHalfA}</music-staff>
      </music-measure>
    </music-composition>
  `,
};

// The music continues in bass clef after the repeat: the warning before :‖
// already shows it, so nothing is redrawn after the barline.
export const ContinuingAfterRepeat: Story = {
  render: () => html`
    <music-composition time="4/4">
      <music-measure repeat-start>
        <music-staff clef="bass">${clefChangeToTreble}</music-staff>
      </music-measure>
      <music-measure barline="repeat-end">
        <music-staff clef="treble">${wholeIn('treble')}</music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="bass">${wholeIn('bass')}</music-staff>
      </music-measure>
    </music-composition>
  `,
};

// A change that applies only after the repeat goes after the barline.
export const ChangeAfterRepeat: Story = {
  render: () => html`
    <music-composition time="2/4">
      <music-measure repeat-start>
        <music-staff clef="bass">
          <music-note note="C" octave="3" duration="half"></music-note>
        </music-staff>
      </music-measure>
      <music-measure barline="repeat-end">
        <music-staff clef="bass">
          <music-note note="C" octave="3" duration="half"></music-note>
        </music-staff>
      </music-measure>
      <music-measure key-sig="D" time="3/4">
        <music-staff clef="treble">${dottedHalfA}</music-staff>
      </music-measure>
    </music-composition>
  `,
};

// Reminders in brackets for the performer returning to the start of the
// repeat: the natural cancelling the B♭ at the end, and the dynamic.
export const ReminderAccidentalAndDynamic: Story = {
  render: () => html`
    <music-composition time="4/4">
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="G"
            octave="4"
            duration="whole"
            dynamic="f"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure repeat-start>
        <music-staff clef="treble">
          <music-note
            note="B"
            octave="4"
            duration="quarter"
            accidental-reminder
            dynamic="f"
            dynamic-reminder
          ></music-note>
          <music-rest duration="quarter"></music-rest>
          <music-rest duration="half"></music-rest>
        </music-staff>
      </music-measure>
      <music-measure barline="repeat-end">
        <music-staff clef="treble">
          <music-note note="Bb" octave="4" duration="whole"></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// A mid-bar end repeat reinstates the start's clef inside the barline's slot.
export const MidBarRepeatWarning: Story = {
  render: () => html`
    <music-composition time="4/4">
      <music-measure repeat-start>
        <music-staff clef="bass">${clefChangeToTreble}</music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-note note="G" octave="4" duration="half"></music-note>
          <music-barline type="repeat-end"></music-barline>
          <music-note note="G" octave="4" duration="half"></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};
