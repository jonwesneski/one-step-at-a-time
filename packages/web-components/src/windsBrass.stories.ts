import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, nothing } from 'lit';
import './index';

const meta: Meta = {
  title: 'Instruments/Winds & Brass',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

/**
 * A woodwind phrase with breathing points: each ✓ sits above the stave in
 * the gap after the note the breath is taken from. The held notes swell
 * (`< >`), and the last bar's crescendo meets its diminuendo on one note.
 */
export const ReferencePhrase: Story = {
  render: () => html`
    <music-composition>
      <music-measure>
        <music-staff clef="treble" time="4/4">
          <music-note
            note="A"
            octave="3"
            duration="quarter"
            slur="start"
          ></music-note>
          <music-note
            note="Bb"
            octave="4"
            duration="half"
            slur="end"
          ></music-note>
          <music-note note="G#" octave="4" duration="eighth"></music-note>
          <music-note
            note="E"
            octave="4"
            duration="eighth"
            tie="start"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble" time="4/4">
          <music-note
            note="E"
            octave="4"
            duration="whole"
            tie="end"
            articulation="fermata"
            swell
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble" time="4/4">
          <music-note
            note="E"
            octave="4"
            duration="quarter"
            articulation="staccato"
            breath-mark="tick"
          ></music-note>
          <music-note
            note="A"
            octave="4"
            duration="eighth"
            articulation="staccato"
          ></music-note>
          <music-rest duration="eighth"></music-rest>
          <music-note
            note="A"
            octave="4"
            duration="eighth"
            articulation="staccato"
          ></music-note>
          <music-rest duration="eighth"></music-rest>
          <music-note
            note="A"
            octave="4"
            duration="quarter"
            tie="start"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble" time="4/4">
          <music-note
            note="A"
            octave="4"
            duration="whole"
            tie="end"
            articulation="fermata"
            swell
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble" time="4/4">
          <music-note
            note="A"
            octave="4"
            duration="quarter"
            articulation="staccato"
            breath-mark="tick"
          ></music-note>
          <music-note
            note="E"
            octave="4"
            duration="quarter"
            articulation="staccato"
            slur="start"
            crescendo="start"
          ></music-note>
          <music-note
            note="A"
            octave="4"
            duration="quarter"
            articulation="staccato"
            slur="end"
            crescendo="end"
            decrescendo="start"
          ></music-note>
          <music-note
            note="A"
            octave="4"
            duration="quarter"
            articulation="staccato"
            decrescendo="end"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

/** ✓ for a break in the sound; the comma for a short pause or lift. */
export const TickAndComma: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note
        note="G"
        octave="4"
        duration="quarter"
        breath-mark="tick"
      ></music-note>
      <music-note note="A" octave="4" duration="quarter"></music-note>
      <music-note
        note="B"
        octave="4"
        duration="quarter"
        breath-mark="comma"
      ></music-note>
      <music-note note="C" octave="5" duration="quarter"></music-note>
    </music-staff>
  `,
};

/** Above the stave unless something under it reaches higher. */
export const AboveHighNotes: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-note
        note="C"
        octave="6"
        duration="quarter"
        breath-mark="tick"
      ></music-note>
      <music-note
        note="A"
        octave="5"
        duration="eighth"
        breath-mark="comma"
      ></music-note>
      <music-note note="B" octave="5" duration="eighth"></music-note>
      <music-note
        note="E"
        octave="5"
        duration="eighth"
        breath-mark="tick"
      ></music-note>
      <music-note note="F" octave="5" duration="eighth"></music-note>
      <music-note note="G" octave="4" duration="quarter"></music-note>
    </music-staff>
  `,
};

/** A breath after the last note sits before the barline. */
export const LastNoteBeforeBarline: Story = {
  render: () => html`
    <music-staff clef="treble" time="3/4">
      <music-note note="E" octave="4" duration="quarter"></music-note>
      <music-note note="F" octave="4" duration="quarter"></music-note>
      <music-note
        note="G"
        octave="4"
        duration="quarter"
        breath-mark="tick"
      ></music-note>
    </music-staff>
  `,
};

/** Every voice's breath mark goes above the stave, stacked when they meet. */
export const TwoVoices: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>
        <music-note
          note="E"
          octave="5"
          duration="quarter"
          breath-mark="tick"
        ></music-note>
        <music-note note="F" octave="5" duration="quarter"></music-note>
        <music-note note="G" octave="5" duration="half"></music-note>
      </music-voice>
      <music-voice>
        <music-note
          note="C"
          octave="5"
          duration="half"
          breath-mark="tick"
        ></music-note>
        <music-note note="A" octave="4" duration="half"></music-note>
      </music-voice>
    </music-staff>
  `,
};

const flutterPhrase = (cancel: boolean) => html`
  <music-composition time="3/4">
    <music-measure>
      <music-staff clef="treble">
        <music-note
          note="F"
          octave="4"
          duration="half"
          tremolo="unmeasured"
          tremolo-label="flz"
          tie="start"
        ></music-note>
        <music-note
          note="F"
          octave="4"
          duration="eighth"
          tremolo="unmeasured"
          tie="end"
        ></music-note>
        <music-note note="A" octave="4" duration="eighth"></music-note>
      </music-staff>
    </music-measure>
    <music-measure>
      <music-staff clef="treble">
        <music-rest duration="quarter"></music-rest>
        <music-note
          note="E"
          octave="4"
          duration="half"
          tremolo="unmeasured"
          tremolo-label="flz"
          tie="start"
        ></music-note>
      </music-staff>
    </music-measure>
    <music-measure>
      <music-staff clef="treble">
        <music-note
          note="E"
          octave="4"
          duration="eighth"
          tie="end"
          tremolo-label=${cancel ? 'ord' : nothing}
          slur="start"
        ></music-note>
        <music-note note="D" octave="4" duration="eighth"></music-note>
        <music-note
          note="A"
          octave="4"
          duration="quarter"
          slur="end"
        ></music-note>
      </music-staff>
    </music-measure>
  </music-composition>
`;

/**
 * Flutter-tonguing is a tremolo with `flz.` above it. The flutter-tongued
 * eighth beams with the plain one beside it. `ord.` is needed only where a
 * flutter-tongued tie runs into an ordinary note, as in the last bar.
 */
export const FlutterTonguing: Story = {
  render: () => flutterPhrase(true),
};

/** `flz.`, `flt.` and `frull.` all mean flutter-tonguing; `ord.`, `nat.` and `norm.` cancel it. */
export const FlutterLabels: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      ${(['flz', 'flt', 'frull'] as const).map(
        (label) => html`<music-note
          note="G"
          octave="4"
          duration="eighth"
          tremolo="unmeasured"
          tremolo-label=${label}
        ></music-note>`
      )}
      <music-rest duration="eighth"></music-rest>
      ${(['ord', 'nat', 'norm'] as const).map(
        (label) => html`<music-note
          note="G"
          octave="4"
          duration="eighth"
          tremolo-label=${label}
        ></music-note>`
      )}
      <music-rest duration="eighth"></music-rest>
    </music-staff>
  `,
};

/**
 * Without `ord.` on the last bar's first note, the composition warns in the
 * console: nothing shows that the tied note stops flutter-tonguing.
 */
export const MissingOrd: Story = {
  name: 'Missing ord. (warns)',
  render: () => flutterPhrase(false),
};
