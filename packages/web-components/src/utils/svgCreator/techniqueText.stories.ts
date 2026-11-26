import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../../index';

const meta: Meta = {
  title: 'Universal Notations/Technique Text',
  component: 'music-note',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

/**
 * `technique-text` starts at its head (the first grace head with grace notes)
 * and runs on over later bars of its row, rising over what they draw; at the
 * row's end it shifts left, then wraps. An opening bracket hangs left of the
 * margin. Narrow the window to see it shift and wrap.
 */
export const AcrossBarlines: Story = {
  render: () => html`
    <music-composition time="2/4">
      <music-measure>
        <music-staff clef="treble" label="Horn">
          <music-note
            unpitched="top"
            notehead="diamond"
            duration="half"
            tie="start"
            technique-text="breathe into instrument|without producing a pitch"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-note
            unpitched="top"
            notehead="diamond"
            duration="half"
            tie="end"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-rest duration="quarter"></music-rest>
          <music-note
            unpitched="top"
            notehead="x"
            duration="eighth"
            grace="G,G,G"
            grace-notehead="x,x,x"
            grace-type="appoggiatura"
            grace-duration="sixteenth"
            grace-slur="none"
            technique-text="valve clicks"
          ></music-note>
          <music-rest duration="eighth"></music-rest>
        </music-staff>
      </music-measure>
    </music-composition>
    <music-composition time="4/4">
      <music-measure>
        <music-staff clef="treble" label="Trumpet">
          <music-note
            note="Bb"
            octave="3"
            duration="half"
            stem-mark="cross"
            technique-text="blow air through instrument fingering the given pitches|(pitches sound a semitone higher)"
          ></music-note>
          <music-note
            note="G"
            octave="3"
            duration="half"
            stem-mark="cross"
            tie="start"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="G"
            octave="3"
            duration="quarter"
            stem-mark="cross"
            tie="end"
          ></music-note>
          <music-note
            note="Ab"
            octave="3"
            duration="dotted-half"
            stem-mark="cross"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

/**
 * `technique-text-placement="below"` puts the text under the stave, nearest
 * it of what goes there; dynamics and lyrics go beneath. Where its own stem or
 * ledger lines are in the way it ends before them, or drops below them when
 * the entry before leaves no room.
 */
export const BelowTheStave: Story = {
  render: () => html`
    <music-composition time="3/4">
      <music-measure>
        <music-staff clef="treble" label="Flute">
          <music-voice number="1">
            <music-rest duration="quarter"></music-rest>
            <music-note
              note="D"
              octave="4"
              duration="quarter"
              slur="start"
              technique-text="(play)"
            ></music-note>
            <music-note
              note="A"
              octave="4"
              duration="quarter"
              tie="start"
            ></music-note>
          </music-voice>
          <music-voice number="2">
            <music-rest duration="quarter" hidden></music-rest>
            <music-note
              note="D"
              octave="4"
              notehead="diamond"
              duration="half"
              tie="start"
              technique-text="sing"
              technique-text-placement="below"
            ></music-note>
          </music-voice>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-voice number="1">
            <music-note
              note="A"
              octave="4"
              duration="dotted-quarter"
              tie="end"
              slur="end"
            ></music-note>
            <music-rest duration="eighth"></music-rest>
            <music-rest duration="quarter"></music-rest>
          </music-voice>
          <music-voice number="2">
            <music-note
              note="D"
              octave="4"
              notehead="diamond"
              duration="dotted-quarter"
              tie="end"
            ></music-note>
            <music-rest duration="eighth" hidden></music-rest>
            <music-rest duration="quarter" hidden></music-rest>
          </music-voice>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="F"
            octave="5"
            duration="quarter"
            dynamic="p"
            technique-text="legato"
            technique-text-placement="below"
            technique-text-style="italic"
          ></music-note>
          <music-note note="E" octave="5" duration="quarter"></music-note>
          <music-note note="D" octave="5" duration="quarter"></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

/**
 * `dynamic-text` follows the dynamic on its baseline, in italics, and moves
 * with it; a hairpin starts after it. Above a vocal staff the tuplet bracket,
 * the dynamic with its text and the technique text stack in that order.
 */
export const AfterADynamic: Story = {
  render: () => html`
    <music-composition time="4/4">
      <music-measure>
        <music-staff-vocal voice="soprano" label="Alto Flute">
          <music-tuplet ratio="3">
            <music-rest duration="eighth"></music-rest>
            <music-note
              note="C"
              octave="4"
              duration="sixteenth"
              notehead="x"
              accidental-reminder="plain"
              dynamic="mp"
              dynamic-text=", ma distinto (in a hushed, breathless tone)"
              technique-text="“Speak-flute” – the Spanish words are|spoken over mouthpiece of flute while|fingering given pitches."
            ></music-note>
            <music-note
              note="C"
              octave="4"
              duration="sixteenth"
              notehead="x"
            ></music-note>
          </music-tuplet>
          <music-note
            note="B"
            octave="4"
            duration="quarter"
            notehead="x"
          ></music-note>
          <music-note
            note="B"
            octave="4"
            duration="half"
            notehead="x"
          ></music-note>
          <music-lyrics>La muer-te me</music-lyrics>
        </music-staff-vocal>
      </music-measure>
    </music-composition>
    <music-composition time="4/4">
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="C"
            octave="5"
            duration="quarter"
            dynamic="p"
            dynamic-text="sub."
            crescendo="start"
          ></music-note>
          <music-note note="D" octave="5" duration="quarter"></music-note>
          <music-note
            note="E"
            octave="5"
            duration="half"
            crescendo="end"
            dynamic="f"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};
