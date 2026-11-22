import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import './index';

const meta: Meta = {
  title: 'Instruments/Percussion',
  component: 'music-staff-percussion',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

const hiHat = html`<music-note
  instrument="hi-hat"
  duration="eighth"
></music-note>`;
const hiHatWithSnare = html`<music-chord duration="eighth">
  <music-note instrument="hi-hat"></music-note>
  <music-note instrument="snare"></music-note>
</music-chord>`;

const rockGroove = html`
  <music-voice>
    ${hiHat} ${hiHat} ${hiHatWithSnare} ${hiHat} ${hiHat} ${hiHat}
    ${hiHatWithSnare} ${hiHat}
  </music-voice>
  <music-voice>
    <music-note instrument="kick" duration="quarter"></music-note>
    <music-rest duration="quarter" hidden></music-rest>
    <music-note instrument="kick" duration="quarter"></music-note>
    <music-rest duration="quarter" hidden></music-rest>
  </music-voice>
`;

/**
 * Hands in the upper voice (stems up), feet in the lower voice (stems down).
 * The feet voice's rests are hidden, as drum parts usually leave them out.
 */
export const RockGroove: Story = {
  render: () => html`
    <music-measure time="4/4">
      <music-staff-percussion>${rockGroove}</music-staff-percussion>
    </music-measure>
  `,
};

/**
 * Every `instrument` value at its drum-key position: cymbals take x noteheads,
 * drums take normal ones. Positions are provisional.
 */
export const DrumKey: Story = {
  render: () => html`
    <music-composition time="3/4">
      <music-measure>
        <music-staff-percussion>
          <music-note instrument="hi-hat-pedal" duration="quarter"></music-note>
          <music-note instrument="kick" duration="quarter"></music-note>
          <music-note instrument="floor-tom" duration="quarter"></music-note>
        </music-staff-percussion>
      </music-measure>
      <music-measure>
        <music-staff-percussion>
          <music-note instrument="snare" duration="quarter"></music-note>
          <music-note instrument="mid-tom" duration="quarter"></music-note>
          <music-note instrument="high-tom" duration="quarter"></music-note>
        </music-staff-percussion>
      </music-measure>
      <music-measure>
        <music-staff-percussion>
          <music-note instrument="ride" duration="quarter"></music-note>
          <music-note instrument="hi-hat" duration="quarter"></music-note>
          <music-note instrument="crash" duration="quarter"></music-note>
        </music-staff-percussion>
      </music-measure>
    </music-composition>
  `,
};

/**
 * A percussion staff beside a pitched one under `key-sig="G"`: the treble staff
 * draws the key, the percussion staff ignores it.
 */
export const IgnoresKeySignature: Story = {
  render: () => html`
    <music-measure key-sig="G" time="4/4">
      <music-staff clef="treble">
        <music-note note="G" octave="4" duration="half"></music-note>
        <music-note note="F#" octave="4" duration="half"></music-note>
      </music-staff>
      <music-staff-percussion>${rockGroove}</music-staff-percussion>
    </music-measure>
  `,
};
