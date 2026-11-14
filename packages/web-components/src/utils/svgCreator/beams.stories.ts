import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../../index';

const meta: Meta = {
  title: 'Universal Notations/Beams',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

// A single group of 8 eighth notes: the simplest beamed run
export const EighthNoteRun: Story = {
  render: () => html`
    <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
      <music-note note="C" duration="eighth"></music-note>
      <music-note note="D" duration="eighth"></music-note>
      <music-note note="E" duration="eighth"></music-note>
      <music-note note="F" duration="eighth"></music-note>
      <music-note note="G" duration="eighth"></music-note>
      <music-note note="A" duration="eighth"></music-note>
      <music-note note="B" duration="eighth"></music-note>
      <music-note note="C" duration="eighth"></music-note>
    </music-staff>
  `,
};

// Primary only, 2 groups: showing both ascending slant and descending slant
export const Primary: Story = {
  render: () => html`
    <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
      <music-note note="C" duration="eighth"></music-note>
      <music-note note="D" duration="eighth"></music-note>
      <music-note note="E" duration="eighth"></music-note>
      <music-note note="F" duration="eighth"></music-note>

      <music-note note="G" duration="eighth"></music-note>
      <music-note note="F" duration="eighth"></music-note>
      <music-note note="E" duration="eighth"></music-note>
      <music-note note="D" duration="eighth"></music-note>
    </music-staff>
  `,
};

// Including Secondary
export const Secondary: Story = {
  render: () => html`
    <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
      <music-note note="C" duration="eighth"></music-note>
      <music-note note="D" duration="sixteenth"></music-note>
      <music-note note="E" duration="sixteenth"></music-note>
      <music-note note="F" duration="eighth"></music-note>
      <music-note note="G" duration="sixteenth"></music-note>
      <music-note note="A" duration="sixteenth"></music-note>

      <music-chord duration="eighth">
        <music-note note="G" duration="eighth"></music-note>
        <music-note note="B" duration="eighth"></music-note>
      </music-chord>
      <music-chord duration="sixteenth">
        <music-note note="F" duration="sixteenth"></music-note>
        <music-note note="A" duration="sixteenth"></music-note>
      </music-chord>
      <music-chord duration="sixteenth">
        <music-note note="E" duration="sixteenth"></music-note>
        <music-note note="G" duration="sixteenth"></music-note>
      </music-chord>
      <music-chord duration="eighth">
        <music-note note="D" duration="eighth"></music-note>
        <music-note note="F" duration="eighth"></music-note>
      </music-chord>
      <music-chord duration="sixteenth">
        <music-note note="C" duration="sixteenth"></music-note>
        <music-note note="E" duration="sixteenth"></music-note>
      </music-chord>
      <music-chord duration="sixteenth">
        <music-note note="B" duration="sixteenth"></music-note>
        <music-note note="D" duration="sixteenth"></music-note>
      </music-chord>
    </music-staff>
  `,
};

// Three beams: the stack must not crowd the noteheads (stem-up) and every stem
// must reach the outer beam (stem-down).
export const ThirtySecond: Story = {
  render: () => html`
    <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
      <music-note note="C" octave="4" duration="thirtysecond"></music-note>
      <music-note note="E" octave="4" duration="thirtysecond"></music-note>
      <music-note note="G" octave="4" duration="thirtysecond"></music-note>
      <music-note note="C" octave="5" duration="thirtysecond"></music-note>

      <music-note note="E" octave="5" duration="thirtysecond"></music-note>
      <music-note note="C" octave="5" duration="thirtysecond"></music-note>
      <music-note note="A" octave="4" duration="thirtysecond"></music-note>
      <music-note note="E" octave="4" duration="thirtysecond"></music-note>
    </music-staff>
  `,
};

// Including fractionals and no slants
export const Fractional: Story = {
  render: () => html`
    <music-staff clef="treble" key-sig="C" mode="major" time="6/8">
      <music-note note="C" duration="sixteenth"></music-note>
      <music-note note="E" duration="eighth"></music-note>
      <music-note note="G" duration="eighth"></music-note>
      <music-note note="C" duration="sixteenth"></music-note>
      <music-note note="G" duration="sixteenth"></music-note>
      <music-note note="E" duration="eighth"></music-note>
      <music-note note="C" duration="eighth"></music-note>
      <music-note note="G" duration="sixteenth"></music-note>
    </music-staff>
  `,
};

// Inside the stave every beam hangs from, sits on or straddles a line: heads
// in a space take 3½-space stems, heads on a line 3¼.
export const PlacementInStave: Story = {
  render: () => html`
    <music-staff clef="treble" key-sig="C" mode="major" time="2/4">
      <music-note note="F" octave="4" duration="eighth"></music-note>
      <music-note note="F" octave="4" duration="eighth"></music-note>
      <music-note note="G" octave="4" duration="eighth"></music-note>
      <music-note note="G" octave="4" duration="eighth"></music-note>
    </music-staff>
    <music-staff clef="treble" key-sig="C" mode="major" time="2/4">
      <music-note note="C" octave="5" duration="eighth"></music-note>
      <music-note note="C" octave="5" duration="eighth"></music-note>
      <music-note note="D" octave="5" duration="eighth"></music-note>
      <music-note note="D" octave="5" duration="eighth"></music-note>
    </music-staff>
    <music-staff clef="treble" key-sig="C" mode="major" time="2/4">
      <music-note note="F" octave="4" duration="sixteenth"></music-note>
      <music-note note="F" octave="4" duration="sixteenth"></music-note>
      <music-note note="F" octave="4" duration="sixteenth"></music-note>
      <music-note note="F" octave="4" duration="sixteenth"></music-note>
      <music-note note="D" octave="5" duration="sixteenth"></music-note>
      <music-note note="D" octave="5" duration="sixteenth"></music-note>
      <music-note note="D" octave="5" duration="sixteenth"></music-note>
      <music-note note="D" octave="5" duration="sixteenth"></music-note>
    </music-staff>
  `,
};

// Each beam past the second moves the stack outward; four beams inside the
// stave spread slightly so each touches a line.
export const ThreeAndFourBeams: Story = {
  render: () => html`
    <music-staff clef="treble" key-sig="C" mode="major" time="2/4">
      <music-note note="D" octave="4" duration="thirtysecond"></music-note>
      <music-note note="D" octave="4" duration="thirtysecond"></music-note>
      <music-rest duration="sixteenth"></music-rest>
      <music-rest duration="eighth"></music-rest>
      <music-note note="C" octave="4" duration="thirtysecond"></music-note>
      <music-note note="C" octave="4" duration="thirtysecond"></music-note>
      <music-rest duration="sixteenth"></music-rest>
      <music-rest duration="eighth"></music-rest>
    </music-staff>
    <music-staff clef="treble" key-sig="C" mode="major" time="2/4">
      <music-note note="A" octave="5" duration="sixtyfourth"></music-note>
      <music-note note="A" octave="5" duration="sixtyfourth"></music-note>
      <music-rest duration="thirtysecond"></music-rest>
      <music-rest duration="sixteenth"></music-rest>
      <music-rest duration="eighth"></music-rest>
      <music-note note="C" octave="4" duration="sixtyfourth"></music-note>
      <music-note note="C" octave="4" duration="sixtyfourth"></music-note>
      <music-rest duration="thirtysecond"></music-rest>
      <music-rest duration="sixteenth"></music-rest>
      <music-rest duration="eighth"></music-rest>
    </music-staff>
  `,
};

// Notes on ledger lines keep one clear stave line between the innermost beam
// and the first ledger line.
export const LedgerLineNotes: Story = {
  render: () => html`
    <music-staff clef="treble" key-sig="C" mode="major" time="2/4">
      <music-note note="C" octave="6" duration="sixteenth"></music-note>
      <music-note note="C" octave="6" duration="sixteenth"></music-note>
      <music-rest duration="eighth"></music-rest>
      <music-note note="C" octave="6" duration="thirtysecond"></music-note>
      <music-note note="C" octave="6" duration="thirtysecond"></music-note>
      <music-rest duration="sixteenth"></music-rest>
      <music-rest duration="eighth"></music-rest>
    </music-staff>
    <music-staff clef="treble" key-sig="C" mode="major" time="2/4">
      <music-note note="A" octave="3" duration="sixteenth"></music-note>
      <music-note note="A" octave="3" duration="sixteenth"></music-note>
      <music-rest duration="eighth"></music-rest>
      <music-note note="A" octave="3" duration="thirtysecond"></music-note>
      <music-note note="A" octave="3" duration="thirtysecond"></music-note>
      <music-rest duration="sixteenth"></music-rest>
      <music-rest duration="eighth"></music-rest>
    </music-staff>
  `,
};

// The slope grows with the interval but crosses at most one space for a short
// group (2nd, 3rd, 5th, octave) and two for a long one. Crowded notes, as in
// the narrow staff, take only a slight slope.
export const SlopeLimits: Story = {
  render: () => html`
    <music-staff clef="treble" key-sig="C" mode="major" time="2/4">
      <music-note note="E" octave="4" duration="eighth"></music-note>
      <music-note note="F" octave="4" duration="eighth"></music-note>
      <music-note note="E" octave="4" duration="eighth"></music-note>
      <music-note note="G" octave="4" duration="eighth"></music-note>
    </music-staff>
    <music-staff clef="treble" key-sig="C" mode="major" time="2/4">
      <music-note note="D" octave="4" duration="eighth"></music-note>
      <music-note note="A" octave="4" duration="eighth"></music-note>
      <music-note note="C" octave="4" duration="eighth"></music-note>
      <music-note note="C" octave="5" duration="eighth"></music-note>
    </music-staff>
    <music-staff clef="treble" key-sig="C" mode="major" time="2/4">
      <music-note note="D" octave="6" duration="sixteenth"></music-note>
      <music-note note="B" octave="5" duration="sixteenth"></music-note>
      <music-note note="G" octave="5" duration="sixteenth"></music-note>
      <music-note note="E" octave="5" duration="sixteenth"></music-note>
      <music-note note="C" octave="4" duration="sixteenth"></music-note>
      <music-note note="E" octave="4" duration="sixteenth"></music-note>
      <music-note note="G" octave="4" duration="sixteenth"></music-note>
      <music-note note="B" octave="4" duration="sixteenth"></music-note>
    </music-staff>
    <div style="width: 150px">
      <music-staff clef="treble" key-sig="C" mode="major" time="2/4">
        <music-note note="D" octave="4" duration="eighth"></music-note>
        <music-note note="A" octave="4" duration="eighth"></music-note>
        <music-note note="C" octave="4" duration="eighth"></music-note>
        <music-note note="C" octave="5" duration="eighth"></music-note>
      </music-staff>
    </div>
  `,
};

// Horizontal beams: same first and last note, a repeated pattern, an inner
// note nearer the beam than both outer notes, and a lone odd note at one end
// that lies farthest from the beam.
export const HorizontalBeams: Story = {
  render: () => html`
    <music-staff clef="treble" key-sig="C" mode="major" time="6/8">
      <music-note note="C" octave="5" duration="eighth"></music-note>
      <music-note note="G" octave="5" duration="eighth"></music-note>
      <music-note note="C" octave="5" duration="eighth"></music-note>
      <music-note note="D" octave="4" duration="sixteenth"></music-note>
      <music-note note="A" octave="4" duration="sixteenth"></music-note>
      <music-note note="C" octave="5" duration="sixteenth"></music-note>
      <music-note note="D" octave="4" duration="sixteenth"></music-note>
      <music-note note="A" octave="4" duration="sixteenth"></music-note>
      <music-note note="C" octave="5" duration="sixteenth"></music-note>
    </music-staff>
    <music-staff clef="treble" key-sig="C" mode="major" time="6/8">
      <music-note note="G" octave="4" duration="eighth"></music-note>
      <music-note note="C" octave="5" duration="eighth"></music-note>
      <music-note note="A" octave="4" duration="eighth"></music-note>
      <music-note note="F" octave="5" duration="eighth"></music-note>
      <music-note note="A" octave="4" duration="eighth"></music-note>
      <music-note note="A" octave="4" duration="eighth"></music-note>
    </music-staff>
  `,
};

// A beamed group goes the way most of its notes would, unless the minority
// lies much further from the middle line; with as many notes each side, the
// farthest note decides.
export const StemDirectionMajority: Story = {
  render: () => html`
    <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
      <music-note note="G" octave="4" duration="eighth"></music-note>
      <music-note note="G" octave="4" duration="eighth"></music-note>
      <music-note note="G" octave="4" duration="eighth"></music-note>
      <music-note note="E" octave="5" duration="eighth"></music-note>
      <music-note note="B" octave="4" duration="eighth"></music-note>
      <music-note note="C" octave="6" duration="eighth"></music-note>
      <music-note note="A" octave="4" duration="eighth"></music-note>
      <music-note note="G" octave="4" duration="eighth"></music-note>
    </music-staff>
    <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
      <music-note note="G" octave="5" duration="eighth"></music-note>
      <music-note note="E" octave="4" duration="eighth"></music-note>
      <music-note note="F" octave="4" duration="eighth"></music-note>
      <music-note note="F" octave="5" duration="eighth"></music-note>
      <music-rest duration="half"></music-rest>
    </music-staff>
  `,
};

// The beam slants by staff position regardless of the clef change, and its
// stems lengthen so it doesn't run through the new clef.
export const ClefChangeInGroup: Story = {
  render: () => html`
    <music-staff clef="bass" key-sig="C" mode="major" time="2/4">
      <music-note note="E" octave="3" duration="sixteenth"></music-note>
      <music-note note="F" octave="3" duration="sixteenth"></music-note>
      <music-clef clef="treble"></music-clef>
      <music-note note="C" octave="5" duration="sixteenth"></music-note>
      <music-note note="B" octave="4" duration="sixteenth"></music-note>
      <music-rest duration="quarter"></music-rest>
    </music-staff>
  `,
};

// A clef change applies to every voice from where it is written: the lower
// voice's first two notes keep the bass clef, and its beam keeps clear of the
// new clef.
export const ClefChangeInGroupTwoVoices: Story = {
  render: () => html`
    <music-staff clef="bass" key-sig="C" mode="major" time="2/4">
      <music-voice>
        <music-note note="C" octave="4" duration="eighth"></music-note>
        <music-clef clef="treble"></music-clef>
        <music-note note="C" octave="5" duration="eighth"></music-note>
        <music-note note="D" octave="5" duration="quarter"></music-note>
      </music-voice>
      <music-voice>
        <music-note note="E" octave="3" duration="sixteenth"></music-note>
        <music-note note="F" octave="3" duration="sixteenth"></music-note>
        <music-note note="C" octave="4" duration="sixteenth"></music-note>
        <music-note note="B" octave="3" duration="sixteenth"></music-note>
        <music-rest duration="quarter"></music-rest>
      </music-voice>
    </music-staff>
  `,
};

// A very wide interval takes a beam between the noteheads with stems both
// ways, when no stem gets shorter than 2½ spaces and the outer lines stay
// clear; a narrower one (last group) keeps a one-direction beam.
export const KneedBeam: Story = {
  render: () => html`
    <music-staff clef="treble" key-sig="C" mode="major" time="2/4">
      <music-note note="F" octave="5" duration="eighth"></music-note>
      <music-note note="A" octave="3" duration="eighth"></music-note>
      <music-note note="G" octave="3" duration="eighth"></music-note>
      <music-note note="C" octave="6" duration="eighth"></music-note>
    </music-staff>
    <music-staff clef="treble" key-sig="C" mode="major" time="2/4">
      <music-note note="D" octave="6" duration="sixteenth"></music-note>
      <music-note note="F" octave="3" duration="sixteenth"></music-note>
      <music-note note="F" octave="3" duration="sixteenth"></music-note>
      <music-note note="D" octave="6" duration="sixteenth"></music-note>
      <music-note note="D" octave="5" duration="eighth"></music-note>
      <music-note note="F" octave="4" duration="eighth"></music-note>
    </music-staff>
  `,
};
