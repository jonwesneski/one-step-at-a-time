import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../index';

const meta: Meta = {
  title: 'Universal Notations/Arpeggio',
  component: 'music-arpeggio',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

/**
 * The written-out arpeggiated chord: a beamed run of notes tied into the chord.
 * (For the wavy vertical line, use the `arpeggio` attribute on a note/chord.)
 */
export const WrittenOutArpeggio: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-arpeggio>
        <music-note note="C" octave="4"></music-note>
        <music-note note="E" octave="4"></music-note>
        <music-note note="G" octave="4"></music-note>
        <music-note note="C" octave="5"></music-note>
        <music-chord duration="half">
          <music-note note="C" octave="4"></music-note>
          <music-note note="E" octave="4"></music-note>
          <music-note note="G" octave="4"></music-note>
          <music-note note="C" octave="5"></music-note>
        </music-chord>
      </music-arpeggio>
      <music-chord chord="Gmaj" duration="half"></music-chord>
    </music-staff>
  `,
};

export const PartialArpeggio: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-arpeggio>
        <music-note note="E" octave="4"></music-note>
        <music-note note="G" octave="4"></music-note>
        <music-chord chord="Cmaj" duration="whole"></music-chord>
      </music-arpeggio>
    </music-staff>
  `,
};

/**
 * A cluster target (seconds) forces at least one tie to be "divided" into two
 * short stubs so it doesn't pass through an intervening notehead.
 */
export const DividedTies: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-arpeggio>
        <music-note note="C" octave="5"></music-note>
        <music-note note="D" octave="5"></music-note>
        <music-note note="E" octave="5"></music-note>
        <music-chord duration="whole">
          <music-note note="C" octave="5"></music-note>
          <music-note note="D" octave="5"></music-note>
          <music-note note="E" octave="5"></music-note>
        </music-chord>
      </music-arpeggio>
    </music-staff>
  `,
};

/**
 * A run pitch not in the target chord gets a laissez-vibrer (open) tie instead
 * (the `unmatched="lv"` default). `lv-label` adds the `l.v.` marking.
 */
export const LaissezVibrer: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-arpeggio lv-label>
        <music-note note="C" octave="4"></music-note>
        <music-note note="D" octave="4"></music-note>
        <music-note note="E" octave="4"></music-note>
        <music-chord chord="Cmaj" duration="whole"></music-chord>
      </music-arpeggio>
    </music-staff>
    <music-staff clef="treble" time="4/4">
      <music-note
        note="C"
        octave="5"
        duration="half"
        tie="laissez-vibrer"
      ></music-note>
      <music-chord chord="Fmaj" duration="half" tie="lv"></music-chord>
    </music-staff>
  `,
};

export const RunDurationOverride: Story = {
  args: { runDuration: 'sixteenth' },
  argTypes: {
    runDuration: {
      control: 'select',
      options: ['sixteenth', 'thirtysecond', 'sixtyfourth'],
    },
  },
  render: (args) => html`
    <music-staff clef="treble" time="4/4">
      <music-arpeggio run-duration=${args.runDuration}>
        <music-note note="D" octave="4"></music-note>
        <music-note note="F" octave="4"></music-note>
        <music-note note="A" octave="4"></music-note>
        <music-chord chord="Dmin" duration="half"></music-chord>
      </music-arpeggio>
    </music-staff>
  `,
};

/**
 * The `arpeggio` wavy-line attribute (as opposed to `<music-arpeggio>`): a row of
 * direction/arrow variants, then arpeggio with grace notes, then a dynamic change
 * during the roll (`arpeggio-hairpin` + `-from` / `-to`).
 */
export const ArpeggioAttribute: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-chord chord="Cmaj7" duration="quarter" arpeggio="up"></music-chord>
      <music-chord
        chord="Cmaj7"
        duration="quarter"
        arpeggio="up-arrow"
      ></music-chord>
      <music-chord
        chord="Cmaj7"
        duration="quarter"
        arpeggio="down"
      ></music-chord>
      <music-chord
        chord="Cmaj7"
        duration="quarter"
        arpeggio="non-arpeggiate"
      ></music-chord>
    </music-staff>
    <music-staff clef="treble" time="4/4">
      <music-chord duration="whole" arpeggio="up-arrow" grace="F#,G">
        <music-note note="D#" octave="4"></music-note>
        <music-note note="F#" octave="4"></music-note>
        <music-note note="A#" octave="4"></music-note>
        <music-note note="C#" octave="5"></music-note>
      </music-chord>
    </music-staff>
    <!-- A dynamic change during the roll: a vertical hairpin left of the sign,
         with a dynamic letter outside the staff at each end -->
    <music-staff clef="treble" time="4/4">
      <music-chord
        chord="Cmaj7"
        duration="whole"
        arpeggio="up"
        arpeggio-hairpin="crescendo"
        arpeggio-hairpin-from="p"
        arpeggio-hairpin-to="f"
      ></music-chord>
    </music-staff>
  `,
};

/**
 * `arpeggiate="start"` marks a `sempre arpeggiando` passage;
 * `arpeggio="non-arpeggiate"` draws the square bracket that cancels it.
 */
export const SempreArpeggiando: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-chord
        chord="Cmaj"
        duration="quarter"
        arpeggiate="start"
      ></music-chord>
      <music-chord chord="Fmaj" duration="quarter"></music-chord>
      <music-chord
        chord="Gmaj"
        duration="quarter"
        arpeggio="non-arpeggiate"
      ></music-chord>
      <music-chord chord="Cmaj" duration="quarter"></music-chord>
    </music-staff>
  `,
};

/**
 * Cross-staff arpeggio: an unbroken sign spanning both staves of a grand staff
 * via `id` / `arpeggio-for`, alongside a broken (per-hand) sign.
 */
export const CrossStaffArpeggio: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-composition
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-measure>
        <music-staff clef="treble" group="grand" time=${args.time}>
          <!-- Unbroken: one continuous line through both staves -->
          <music-chord id="roll1" chord="Cmaj" duration="half" arpeggio="up">
          </music-chord>
          <!-- Broken: a separate sign per hand -->
          <music-chord chord="Fmaj" duration="half" arpeggio="up-arrow">
          </music-chord>
        </music-staff>
        <music-staff clef="bass" time=${args.time}>
          <music-chord chord="Cmaj" duration="half" arpeggio-for="roll1">
            <music-note note="C" octave="3"></music-note>
            <music-note note="E" octave="3"></music-note>
            <music-note note="G" octave="3"></music-note>
          </music-chord>
          <music-chord chord="Fmaj" duration="half" arpeggio="up-arrow">
            <music-note note="F" octave="2"></music-note>
            <music-note note="A" octave="2"></music-note>
            <music-note note="C" octave="3"></music-note>
          </music-chord>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

/**
 * A dynamic change during a cross-staff roll: one continuous vertical hairpin
 * through both staves, drawn left of the arpeggio sign, with a dynamic letter
 * outside the staff at each end (`p` below, `mf` above).
 */
export const CrossStaffArpeggioDynamicChange: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-composition
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-measure>
        <music-staff clef="treble" group="grand" time=${args.time}>
          <music-chord
            id="roll1"
            chord="Cmaj"
            duration="whole"
            arpeggio="up"
            arpeggio-hairpin="crescendo"
            arpeggio-hairpin-from="p"
            arpeggio-hairpin-to="mf"
          ></music-chord>
        </music-staff>
        <music-staff clef="bass" time=${args.time}>
          <music-chord chord="Cmaj" duration="whole" arpeggio-for="roll1">
            <music-note note="C" octave="3"></music-note>
            <music-note note="E" octave="3"></music-note>
            <music-note note="G" octave="3"></music-note>
          </music-chord>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};
