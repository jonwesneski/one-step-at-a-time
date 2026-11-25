import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, nothing } from 'lit';
import './index';

const meta: Meta = {
  title: 'Instruments/Winds & Brass',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

// Four eighths on one pitch, each carrying `articulation`; slurred as a group
// when `slurred`.
const articulatedGroup = (articulation: string, slurred: boolean) => html`
  <music-measure>
    <music-staff clef="treble" time="2/4">
      ${[0, 1, 2, 3].map(
        (index) => html`<music-note
          note="E"
          octave="4"
          duration="eighth"
          articulation=${articulation}
          slur=${slurred && index === 0
            ? 'start'
            : slurred && index === 3
            ? 'end'
            : nothing}
        ></music-note>`
      )}
    </music-staff>
  </music-measure>
`;

/**
 * A wind player tongues every note unless it is slurred. Under a slur, marked
 * notes still get their own attack, with less separation (top row); without
 * slurs the articulation is more pronounced (bottom row).
 */
export const Articulation: Story = {
  render: () => html`
    <music-composition>
      ${articulatedGroup('staccato', true)} ${articulatedGroup('tenuto', true)}
      ${articulatedGroup('portato', true)}
    </music-composition>
    <music-composition>
      ${articulatedGroup('staccato', false)}
      ${articulatedGroup('tenuto', false)} ${articulatedGroup('portato', false)}
    </music-composition>
  `,
};

/**
 * A woodwind slur over a reiterated pitch needs marks under it: each note is
 * tongued again, so tenuto lines (or staccato dots) show the rearticulation.
 * A bare slur here is ungrammatical for woodwind; the alternative is a
 * written `legato`, which needs staff text.
 */
export const ReiteratedPitchWoodwind: Story = {
  name: 'Reiterated Pitch (Woodwind)',
  render: () => html`
    <music-staff clef="treble" time="3/4">
      <music-note
        note="D"
        octave="5"
        duration="quarter"
        articulation="tenuto"
        slur="start"
      ></music-note>
      <music-note
        note="D"
        octave="5"
        duration="quarter"
        articulation="tenuto"
      ></music-note>
      <music-note
        note="D"
        octave="5"
        duration="quarter"
        articulation="tenuto"
        slur="end"
      ></music-note>
    </music-staff>
  `,
};

/** A slur over repeated notes in brass writing: legato tonguing. */
export const ReiteratedPitchBrass: Story = {
  name: 'Reiterated Pitch (Brass)',
  render: () => html`
    <music-staff clef="treble" time="3/4">
      <music-note
        note="D"
        octave="5"
        duration="quarter"
        slur="start"
      ></music-note>
      <music-note note="D" octave="5" duration="quarter"></music-note>
      <music-note
        note="D"
        octave="5"
        duration="quarter"
        slur="end"
      ></music-note>
    </music-staff>
  `,
};

/**
 * A woodwind phrase with breathing points: each ✓ sits above the stave in
 * the gap after the note the breath is taken from. The held notes swell
 * (`< >`), and the last bar's crescendo meets its diminuendo on one note.
 */
export const ReferencePhrase: Story = {
  name: 'Breathing (Reference)',
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
  name: 'Breath Marks: Tick and Comma',
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
  name: 'Breath Marks: Above High Notes',
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
  name: 'Breath Marks: Before the Barline',
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
  name: 'Breath Marks: Two Voices',
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
  name: 'Flutter-Tonguing (Reference)',
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

/**
 * A diagonal line with `gliss.` is as continuous a slide as the instrument
 * allows. Where a smooth one isn't possible, the chromatic pitches are written
 * out with `quasi gliss.` (`glissando-label`) and no line.
 */
export const ConventionalAndQuasiGlissando: Story = {
  name: 'Conventional And Quasi Glissando (Reference)',
  render: () => html`
    <div style="max-width: 400px">
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
      </music-composition>
      <music-composition time="2/4">
        <music-measure>
          <music-staff clef="bass">
            <music-tuplet ratio="3">
              <music-note
                note="Eb"
                octave="3"
                duration="eighth"
                slur="start"
                glissando-label="quasi-gliss"
              ></music-note>
              <music-note note="C" octave="3" duration="eighth"></music-note>
              <music-note note="Bb" octave="2" duration="eighth"></music-note>
            </music-tuplet>
            <music-note note="G" octave="2" duration="sixteenth"></music-note>
            <music-note note="F" octave="2" duration="sixteenth"></music-note>
            <music-note note="E" octave="2" duration="sixteenth"></music-note>
            <music-note
              note="Eb"
              octave="2"
              duration="sixteenth"
              slur="end"
            ></music-note>
          </music-staff>
        </music-measure>
      </music-composition>
    </div>
  `,
};

/**
 * A pitch bend (lip glissando) is a line after the notehead, shaped like its
 * contour: to the next note, free, to a pitch in parentheses, a dip over the
 * barline, and a wave. `glissando-label` says `lip`, `bend` or anything else.
 */
export const PitchBends: Story = {
  name: 'Pitch Bends (Reference)',
  render: () => html`
    <music-composition time="2/4">
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
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="Bb"
            octave="4"
            duration="quarter"
            bend="down"
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
            note="E"
            octave="5"
            duration="half"
            glissando="start"
            glissando-shape="dip"
            glissando-label="bend down|¼-tone"
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
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="G"
            octave="4"
            duration="quarter"
            bend="wave"
            glissando-label="bend pitch ¼-tone"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

/**
 * A chromatic scale is written in full, here as grace notes, with `chrom.` (or
 * `chromatic`) so the player doesn't slide over the pitches between.
 */
export const ChromaticGlissando: Story = {
  name: 'Chromatic Glissando (Reference)',
  render: () => html`
    <div style="max-width: 400px">
      <music-composition time="3/8">
        <music-measure>
          <music-staff clef="bass">
            <music-note note="G" octave="3" duration="quarter"></music-note>
            <music-note
              note="C"
              octave="4"
              duration="eighth"
              articulation="staccato"
              grace="G#,A,A#,B"
              grace-octave="3,3,3,3"
              grace-duration="sixteenth"
              grace-type="appoggiatura"
              glissando-label="chrom"
            ></music-note>
          </music-staff>
        </music-measure>
      </music-composition>
    </div>
  `,
};

/**
 * Breath, key and valve noise has no pitch. `unpitched="top"` sits in the
 * space above the stave and `"bottom"` below it; bare `unpitched` keeps the
 * written note. None draws an accidental or a ledger line, or changes the
 * accidentals after it. Grace notes stand with their note (bar 2), and a
 * chord can hold an unpitched tone (bar 3, a jet whistle's cross). In bar 4
 * the key signature's F♯ is still in force after an unpitched F.
 */
export const UnpitchedSounds: Story = {
  render: () => html`
    <music-composition time="2/4">
      <music-measure>
        <music-staff clef="treble" label="Horn">
          <music-note
            unpitched="top"
            notehead="diamond"
            duration="half"
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
          ></music-note>
          <music-rest duration="eighth"></music-rest>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-chord duration="quarter" stem-direction="down">
            <music-note
              note="A"
              octave="4"
              notehead="diamond-white"
            ></music-note>
            <music-note note="C" octave="6" notehead="x" unpitched></music-note>
          </music-chord>
          <music-rest duration="quarter"></music-rest>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble" key-sig="G">
          <music-note
            note="F"
            octave="4"
            duration="quarter"
            notehead="x"
            unpitched
          ></music-note>
          <music-note note="F#" octave="4" duration="eighth"></music-note>
          <music-note
            unpitched="bottom"
            notehead="x"
            duration="eighth"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

/**
 * \`stem-mark="cross"\`: air blown through the instrument with the written
 * fingering. The cross stands a space in from the stem's end, clear of a
 * tail or the beams, and the stem lengthens when it must (the beamed
 * semiquaver). With tremolo strokes it goes between them and the head. A
 * semibreve takes it on the notional stem.
 */
export const CrossedStems: Story = {
  render: () => html`
    <music-composition time="4/4">
      <music-measure>
        <music-staff clef="treble" label="Trumpet">
          <music-note
            note="Bb"
            octave="3"
            duration="half"
            stem-mark="cross"
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
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="C"
            octave="5"
            duration="eighth"
            stem-mark="cross"
          ></music-note>
          <music-note
            note="E"
            octave="4"
            duration="sixteenth"
            stem-mark="cross"
          ></music-note>
          <music-note note="G" octave="4" duration="sixteenth"></music-note>
          <music-note
            note="A"
            octave="4"
            duration="eighth"
            stem-mark="cross"
          ></music-note>
          <music-note
            note="C"
            octave="5"
            duration="quarter"
            stem-mark="cross"
            tremolo="2"
          ></music-note>
          <music-chord duration="quarter" stem-mark="cross">
            <music-note note="E" octave="4"></music-note>
            <music-note note="G" octave="4"></music-note>
          </music-chord>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble">
          <music-note
            note="E"
            octave="5"
            duration="whole"
            stem-mark="cross"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};
