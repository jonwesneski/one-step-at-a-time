import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../index';
import type { DurationType, Note } from '../types/theory';
import { DURATIONS, PITCH_NOTES } from '../utils';

const meta: Meta = {
  title: 'Universal Notations/Unisons',
  component: 'music-voice',
  tags: ['autodocs'],
  args: {
    upperNote: 'G',
    upperDuration: 'quarter',
    lowerNote: 'G',
    lowerDuration: 'quarter',
  },
  argTypes: {
    upperNote: { control: 'select', options: PITCH_NOTES },
    upperDuration: { control: 'select', options: DURATIONS },
    lowerNote: { control: 'select', options: PITCH_NOTES },
    lowerDuration: { control: 'select', options: DURATIONS },
  },
  render: (args) => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>
        <music-note
          note=${args.upperNote as Note}
          octave="4"
          duration=${args.upperDuration as DurationType}
        ></music-note>
      </music-voice>
      <music-voice>
        <music-note
          note=${args.lowerNote as Note}
          octave="4"
          duration=${args.lowerDuration as DurationType}
        ></music-note>
      </music-voice>
    </music-staff>
  `,
};
export default meta;

type Story = StoryObj;

/** Two equal stemmed parts on one pitch share a head: an up-stem and a down-stem. */
export const SharedHeadTwoStems: Story = {};

export const SharedOpenHead: Story = {
  args: { upperDuration: 'half', lowerDuration: 'half' },
};

/** A black head is shared by any black durations. */
export const SharedBlackHeadDifferentDurations: Story = {
  args: { upperDuration: 'quarter', lowerDuration: 'eighth' },
};

/** Open and black heads stay separate; the upper part stays on the beat. */
export const SeparateHeadsTwoStems: Story = {
  args: { upperDuration: 'half', lowerDuration: 'quarter' },
};

/** Stemless heads never share. */
export const StemlessUnison: Story = {
  args: { upperDuration: 'whole', lowerDuration: 'whole' },
};

/** The right part's accidental sits between the two heads. */
export const AlteredUnisonTwoStems: Story = {
  args: { lowerNote: 'G#' },
};

/** Only the upper part is dotted: its dot sits after both heads, in its own row. */
export const DottedAgainstUndotted: Story = {
  args: { upperDuration: 'dotted-quarter', lowerDuration: 'quarter' },
};

const note = (pitch: Note, duration: DurationType) =>
  html`<music-note note=${pitch} octave="4" duration=${duration}></music-note>`;

/** One stemmed part and one stemless: a single stem, one head each side of it. */
export const SingleStemPerfectUnison: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${note('G', 'quarter')}</music-voice>
      <music-voice>${note('G', 'whole')}</music-voice>
    </music-staff>
  `,
};

/** Two heads that differ by an accidental fork from one stem, the prong. */
export const SingleStemAlteredUnison: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${note('G', 'quarter')}</music-voice>
      <music-voice>${note('G#', 'whole')}</music-voice>
    </music-staff>
  `,
};

/** Tails stay on the vertical stem, clear of the diagonal. */
export const SingleStemFlaggedOwner: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${note('G', 'eighth')}</music-voice>
      <music-voice>${note('G#', 'whole')}</music-voice>
    </music-staff>
  `,
};

/** Heads run flat to sharp, whichever voice is stemmed. */
export const SingleStemFlatToSharp: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${note('G#', 'quarter')}</music-voice>
      <music-voice>${note('Gb', 'whole')}</music-voice>
      <music-voice>${note('G', 'whole')}</music-voice>
    </music-staff>
  `,
};

/** Three heads hang from the first head's stem by diagonals. */
export const SingleStemCluster: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${note('G', 'quarter')}</music-voice>
      <music-voice>${note('Gb', 'whole')}</music-voice>
      <music-voice>${note('G#', 'whole')}</music-voice>
    </music-staff>
  `,
};

/** The stemmed part is the lower voice, so its stem points down. */
export const SingleStemDownStem: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${note('G#', 'whole')}</music-voice>
      <music-voice>${note('G', 'quarter')}</music-voice>
    </music-staff>
  `,
};

/** Every head takes a dot, after its own head, and never as a horizontal pair. */
export const DottedSingleStemUnison: Story = {
  render: () => html`
    <music-staff clef="treble" time="6/4">
      <music-voice>${note('G', 'dotted-half')}</music-voice>
      <music-voice>${note('G#', 'dotted-whole')}</music-voice>
    </music-staff>
  `,
};

export const DottedPerfectSingleStemUnison: Story = {
  render: () => html`
    <music-staff clef="treble" time="6/4">
      <music-voice>${note('G', 'dotted-half')}</music-voice>
      <music-voice>${note('G', 'dotted-whole')}</music-voice>
    </music-staff>
  `,
};

/** Stemless parts that differ by an accidental get a square bracket. */
export const StemlessAlteredBracket: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${note('G', 'whole')}</music-voice>
      <music-voice>${note('G#', 'whole')}</music-voice>
    </music-staff>
  `,
};

/** `C` is the natural; the staff draws the sign because the flat precedes it. */
export const StemlessClusterOnC: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${note('Cb', 'whole')}</music-voice>
      <music-voice>${note('C', 'whole')}</music-voice>
      <music-voice>${note('C#', 'whole')}</music-voice>
    </music-staff>
  `,
};

const chordOf = (duration: DurationType, ...tones: Note[]) =>
  html`<music-chord duration=${duration}>
    ${tones.map(
      (tone) => html`<music-note note=${tone} octave="4"></music-note>`
    )}
  </music-chord>`;

/** A note on one tone of a chord shares that tone's head; the chord keeps its own. */
export const ChordSharesHeadWithNote: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${chordOf('quarter', 'G', 'B')}</music-voice>
      <music-voice>${note('G', 'quarter')}</music-voice>
    </music-staff>
  `,
};

/** A stemmed chord keeps the stem's place; the displaced head hangs from it by a diagonal. */
export const ChordOwnsSingleStem: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${chordOf('quarter', 'G', 'B')}</music-voice>
      <music-voice>${note('G#', 'whole')}</music-voice>
    </music-staff>
  `,
};

/** A stemless chord's head joins the group; the note draws the stem at the first head. */
export const StemlessChordInUnison: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${chordOf('whole', 'G', 'B')}</music-voice>
      <music-voice>${note('G#', 'quarter')}</music-voice>
    </music-staff>
  `,
};

/** Only the chord's tone on the note's pitch moves; its other tones stay on the beat. */
export const ChordToneMovesAlone: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${note('G', 'half')}</music-voice>
      <music-voice>${chordOf('whole', 'G', 'B')}</music-voice>
    </music-staff>
  `,
};

/** Crossed parts: the down-stem part (higher pitch) stays left, the up-stem part moves right. */
export const CrossedAdjacentParts: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${note('G', 'quarter')}</music-voice>
      <music-voice>${note('A', 'quarter')}</music-voice>
    </music-staff>
  `,
};

/** Crossed semibreves stay separate heads; the staff warns that tied stemmed notes read better. */
export const CrossedSemibreves: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${note('G', 'whole')}</music-voice>
      <music-voice>${note('A', 'half')}${note('A', 'half')}</music-voice>
    </music-staff>
  `,
};

const eighthsE = (count: number) =>
  Array.from({ length: count }).map(() => note('E', 'eighth'));

/**
 * The next entry is close, so the heads run to the stem's left instead of
 * past the entries that follow. Widen the canvas and they run right again.
 */
export const MirroredWhenRoomIsAfter: Story = {
  render: () => html`
    <music-staff clef="treble" time="6/4">
      <music-voice>
        <music-note note="D" octave="5" duration="half"></music-note>
        ${note('G', 'eighth')} ${eighthsE(7).map((entry) => entry)}
        <music-note note="E" octave="5" duration="quarter"></music-note>
        <music-note note="E" octave="5" duration="quarter"></music-note>
        <music-note note="E" octave="5" duration="quarter"></music-note>
        <music-note note="E" octave="5" duration="eighth"></music-note>
      </music-voice>
      <music-voice>
        <music-rest duration="half"></music-rest>${note('Gb', 'whole')}
      </music-voice>
      <music-voice>
        <music-rest duration="half"></music-rest>${note('G#', 'whole')}
      </music-voice>
    </music-staff>
  `,
};
