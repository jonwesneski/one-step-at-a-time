import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../../index';

const meta: Meta = {
  title: 'Universal Notations/Quarter-Tones',
  component: 'music-note',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

// Each tone takes its own quarter-tone. Arrows that point at each other move
// into separate columns.
export const Chord: Story = {
  render: () => html`
    <music-composition time="4/4">
      <music-measure>
        <music-staff clef="treble">
          <music-chord duration="half">
            <music-note note="E" octave="4"></music-note>
            <music-note note="G#" octave="4" quarter-tone="down"></music-note>
            <music-note note="C" octave="5" quarter-tone="up"></music-note>
          </music-chord>
          <music-chord duration="half">
            <music-note note="F" octave="4" quarter-tone="up"></music-note>
            <music-note note="Eb" octave="5" quarter-tone="down"></music-note>
          </music-chord>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-chord duration="whole">
            <music-note note="Eb" octave="4" quarter-tone="up"></music-note>
            <music-note note="Ab" octave="4" quarter-tone="up"></music-note>
            <music-note note="C#" octave="5" quarter-tone="down"></music-note>
          </music-chord>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// Grace notes, the trilling pitch and a trill's closing notes have their own
// attributes.
export const GraceNotesAndTrill: Story = {
  render: () => html`
    <music-composition time="4/4">
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="A"
            octave="4"
            duration="half"
            grace="F#,G,G#"
            grace-octave="4,4,4"
            grace-quarter-tone="up,,down"
          ></music-note>
          <music-note
            note="G"
            octave="4"
            duration="half"
            trill
            trill-quarter-tone="down"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="B"
            octave="4"
            duration="half"
            trill
            trill-note="C#"
            trill-quarter-tone="up"
          ></music-note>
          <music-note
            note="C"
            octave="5"
            duration="half"
            trill
            trill-line="none"
            trill-finish="B,C"
            trill-finish-octave="4,5"
            trill-finish-quarter-tone="up"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// A grace note's slur passes outside every arrow in its way.
export const GraceSlurs: Story = {
  render: () => html`
    <music-composition time="4/4">
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="B"
            octave="4"
            duration="half"
            grace="E,G,F"
            grace-octave="4,4,4"
            grace-quarter-tone=",down,down"
          ></music-note>
          <music-note
            note="C#"
            octave="5"
            duration="half"
            quarter-tone="up"
            grace="G,A"
            grace-octave="4,4"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="Bb"
            octave="4"
            duration="half"
            quarter-tone="up"
            grace="G"
            grace-octave="4"
          ></music-note>
          <music-chord duration="half" grace="G,A" grace-octave="4,4">
            <music-note note="C" octave="5" quarter-tone="up"></music-note>
            <music-note note="E" octave="5"></music-note>
          </music-chord>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// A reminder brackets the whole sign, arrow included.
export const Reminder: Story = {
  render: () => html`
    <music-composition time="4/4">
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="Bb"
            octave="4"
            duration="half"
            quarter-tone="up"
          ></music-note>
          <music-note
            note="Bb"
            octave="4"
            duration="half"
            quarter-tone="up"
            accidental-reminder
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};
