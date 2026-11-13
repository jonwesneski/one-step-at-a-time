import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../index';

const meta: Meta = {
  title: 'Instruments/Guitar',
  component: 'music-staff-guitar-tab',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const HammerOn: Story = {
  render: () => html`<music-composition>
    <music-measure>
      <music-staff-guitar-tab>
        <music-guitar-note
          fret="5"
          string="3"
          duration="eighth"
          hammer-on="start"
        ></music-guitar-note>
        <music-guitar-note
          fret="7"
          string="3"
          duration="eighth"
          hammer-on="end"
        ></music-guitar-note>
      </music-staff-guitar-tab>
    </music-measure>
  </music-composition>`,
};

// A tab staff mirroring a notation staff: `tab-for` names the notation staff's
// `part`, so the tab leaves room for its mid-bar clef change and stays in step.
export const TabFollowsNotation: Story = {
  render: () => html`<music-measure time="4/4">
    <music-staff clef="treble" part="guitar">
      <music-note note="E" octave="5" duration="quarter"></music-note>
      <music-note note="G" octave="4" duration="quarter"></music-note>
      <music-clef clef="bass"></music-clef>
      <music-note note="A" octave="3" duration="quarter"></music-note>
      <music-note note="E" octave="3" duration="quarter"></music-note>
    </music-staff>
    <music-staff-guitar-tab tab-for="guitar">
      <music-guitar-note
        fret="0"
        string="1"
        duration="quarter"
      ></music-guitar-note>
      <music-guitar-note
        fret="0"
        string="3"
        duration="quarter"
      ></music-guitar-note>
      <music-guitar-note
        fret="0"
        string="5"
        duration="quarter"
      ></music-guitar-note>
      <music-guitar-note
        fret="0"
        string="6"
        duration="quarter"
      ></music-guitar-note>
    </music-staff-guitar-tab>
  </music-measure>`,
};
