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

/**
 * Heads that differ by an accidental run flat to sharp, each after its own
 * accidental. The stemmed part keeps its own stem; a semibreve is never joined
 * to it, so it never reads as a minim.
 */
export const SingleStemAlteredUnison: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${note('G', 'quarter')}</music-voice>
      <music-voice>${note('G#', 'whole')}</music-voice>
    </music-staff>
  `,
};

/** Heads run flat to sharp, whichever voice is stemmed; the semibreves stand alone. */
export const SingleStemFlatToSharp: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${note('G#', 'quarter')}</music-voice>
      <music-voice>${note('Gb', 'whole')}</music-voice>
      <music-voice>${note('G', 'whole')}</music-voice>
    </music-staff>
  `,
};

/** Three heads, flat to sharp; only the crotchet has a stem. */
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

/** A stemmed chord keeps its own stem; the semibreve stands after it, unjoined. */
export const ChordOwnsSingleStem: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${chordOf('quarter', 'G', 'B')}</music-voice>
      <music-voice>${note('G#', 'whole')}</music-voice>
    </music-staff>
  `,
};

/** A stemless chord takes its place in the flat-to-sharp order; the note keeps its own stem. */
export const StemlessChordInUnison: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${chordOf('whole', 'G', 'B')}</music-voice>
      <music-voice>${note('G#', 'quarter')}</music-voice>
    </music-staff>
  `,
};

/** A chord in a unison moves as a unit: every tone and its stem together. */
export const ChordMovesAsUnit: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${note('G', 'half')}</music-voice>
      <music-voice>${chordOf('quarter', 'G', 'B')}</music-voice>
    </music-staff>
  `,
};

/** A stemless chord moves as a unit too, ledger lines included. */
export const StemlessChordMovesAsUnit: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${note('C', 'half')}</music-voice>
      <music-voice>${chordOf('whole', 'C', 'E')}</music-voice>
    </music-staff>
  `,
};

/** A chord symbol's tones count at the staff positions they are drawn on. */
export const ChordSymbolUnison: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>
        <music-chord chord="C" duration="quarter"></music-chord>
      </music-voice>
      <music-voice>${note('G', 'quarter')}</music-voice>
    </music-staff>
  `,
};

/** Three parts on one pitch: two share a head, the third keeps its own. */
export const ThreeVoiceUnison: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${note('G', 'quarter')}</music-voice>
      <music-voice>${note('G', 'quarter')}</music-voice>
      <music-voice>${note('G', 'quarter')}</music-voice>
    </music-staff>
  `,
};

/** Different noteheads never share, so the lower part's cross stays visible. */
export const DifferentNoteheadsKeepTwoHeads: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${note('G', 'quarter')}</music-voice>
      <music-voice>
        <music-note
          note="G"
          octave="4"
          duration="quarter"
          notehead="x"
        ></music-note>
      </music-voice>
    </music-staff>
  `,
};

/** Two stems the same way never share a head, whatever the voice's default. */
export const ForcedStemKeepsOwnHead: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${note('G', 'quarter')}</music-voice>
      <music-voice>
        <music-note
          note="G"
          octave="4"
          duration="quarter"
          stem-direction="up"
        ></music-note>
      </music-voice>
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

/**
 * The lower part of a unison moves right; the entry after it in that voice
 * makes room for it at any width. Narrow the canvas to see it hold.
 */
export const FollowingEntryMakesRoom: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>
        ${note('G', 'eighth')}
        <music-note note="C" octave="5" duration="quarter"></music-note>
      </music-voice>
      <music-voice>${note('G#', 'eighth')}${note('G#', 'eighth')}</music-voice>
    </music-staff>
  `,
};

/** A part that made room for its accidental still lines up with the shared head. */
export const SharedHeadAfterAccidental: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>${note('G#', 'quarter')}</music-voice>
      <music-voice>${note('G#', 'quarter')}</music-voice>
    </music-staff>
  `,
};
