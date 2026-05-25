import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';

const meta: Meta = {
  title: 'Components/Tuplet',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const SimpleTriplet: Story = {
  render: () => html`
    <music-staff-treble time="3/4">
      <music-tuplet ratio="3">
        <music-note note="C" octave="4" duration="eighth"></music-note>
        <music-note note="D" octave="4" duration="eighth"></music-note>
        <music-note note="E" octave="4" duration="eighth"></music-note>
      </music-tuplet>
      <music-note note="C" octave="4" duration="quarter"></music-note>
    </music-staff-treble>
  `,
};

export const TripletWithFullRatio: Story = {
  render: () => html`
    <music-staff-treble time="3/4">
      <music-tuplet ratio="3:2">
        <music-note note="E" octave="4" duration="eighth"></music-note>
        <music-note note="F" octave="4" duration="eighth"></music-note>
        <music-note note="G" octave="4" duration="eighth"></music-note>
      </music-tuplet>
      <music-note note="A" octave="4" duration="quarter"></music-note>
    </music-staff-treble>
  `,
};

export const Quintuplet: Story = {
  render: () => html`
    <music-staff-treble time="4/4">
      <music-tuplet ratio="5:4">
        <music-note note="C" octave="5" duration="sixteenth"></music-note>
        <music-note note="B" octave="4" duration="sixteenth"></music-note>
        <music-note note="A" octave="4" duration="sixteenth"></music-note>
        <music-note note="G" octave="4" duration="sixteenth"></music-note>
        <music-note note="F" octave="4" duration="sixteenth"></music-note>
      </music-tuplet>
      <music-note note="E" octave="4" duration="quarter"></music-note>
      <music-note note="D" octave="4" duration="quarter"></music-note>
      <music-note note="C" octave="4" duration="quarter"></music-note>
    </music-staff-treble>
  `,
};

export const Septuplet: Story = {
  render: () => html`
    <music-staff-treble time="4/4">
      <music-tuplet ratio="7:4">
        <music-note note="C" octave="5" duration="thirtysecond"></music-note>
        <music-note note="D" octave="5" duration="thirtysecond"></music-note>
        <music-note note="E" octave="5" duration="thirtysecond"></music-note>
        <music-note note="F" octave="5" duration="thirtysecond"></music-note>
        <music-note note="G" octave="5" duration="thirtysecond"></music-note>
        <music-note note="A" octave="5" duration="thirtysecond"></music-note>
        <music-note note="B" octave="5" duration="thirtysecond"></music-note>
      </music-tuplet>
      <music-note note="C" octave="4" duration="quarter"></music-note>
      <music-note note="C" octave="4" duration="quarter"></music-note>
      <music-note note="C" octave="4" duration="quarter"></music-note>
    </music-staff-treble>
  `,
};

export const BeamedTriplet: Story = {
  render: () => html`
    <music-staff-treble time="4/4">
      <music-tuplet ratio="3">
        <music-note note="E" octave="4" duration="eighth"></music-note>
        <music-note note="F" octave="4" duration="eighth"></music-note>
        <music-note note="G" octave="4" duration="eighth"></music-note>
      </music-tuplet>
      <music-tuplet ratio="3">
        <music-note note="A" octave="4" duration="eighth"></music-note>
        <music-note note="G" octave="4" duration="eighth"></music-note>
        <music-note note="F" octave="4" duration="eighth"></music-note>
      </music-tuplet>
    </music-staff-treble>
  `,
};

export const BelowStaff: Story = {
  render: () => html`
    <music-staff-treble time="3/4">
      <music-tuplet ratio="3">
        <music-note note="C" octave="4" duration="eighth"></music-note>
        <music-note note="B" octave="3" duration="eighth"></music-note>
        <music-note note="A" octave="3" duration="eighth"></music-note>
      </music-tuplet>
      <music-note note="G" octave="3" duration="quarter"></music-note>
    </music-staff-treble>
  `,
};

export const NestedTuplet: Story = {
  render: () => html`
    <music-staff-treble time="4/4">
      <music-tuplet ratio="5:4">
        <music-note note="C" octave="5" duration="sixteenth"></music-note>
        <music-note note="D" octave="5" duration="sixteenth"></music-note>
        <music-tuplet ratio="3">
          <music-note note="E" octave="5" duration="thirtysecond"></music-note>
          <music-note note="F" octave="5" duration="thirtysecond"></music-note>
          <music-note note="G" octave="5" duration="thirtysecond"></music-note>
        </music-tuplet>
        <music-note note="A" octave="5" duration="sixteenth"></music-note>
        <music-note note="B" octave="5" duration="sixteenth"></music-note>
      </music-tuplet>
      <music-note note="C" octave="4" duration="quarter"></music-note>
    </music-staff-treble>
  `,
};
