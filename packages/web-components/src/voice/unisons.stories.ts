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
