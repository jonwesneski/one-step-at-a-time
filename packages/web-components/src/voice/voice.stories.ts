import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../index';

const meta: Meta = {
  title: 'Universal Notations/Voices',
  component: 'music-voice',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const TwoVoicesBasic: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>
        <music-note note="C" octave="5" duration="quarter"></music-note>
        <music-note note="D" octave="5" duration="quarter"></music-note>
        <music-note note="E" octave="5" duration="quarter"></music-note>
        <music-note note="F" octave="5" duration="quarter"></music-note>
      </music-voice>
      <music-voice>
        <music-note note="B" octave="3" duration="quarter"></music-note>
        <music-note note="A" octave="3" duration="quarter"></music-note>
        <music-note note="G" octave="3" duration="quarter"></music-note>
        <music-note note="F" octave="3" duration="quarter"></music-note>
      </music-voice>
    </music-staff>
  `,
};

export const TwoVoicesIndependentRhythm: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>
        <music-note note="E" octave="5" duration="eighth"></music-note>
        <music-note note="D" octave="5" duration="eighth"></music-note>
        <music-note note="C" octave="5" duration="eighth"></music-note>
        <music-note note="D" octave="5" duration="eighth"></music-note>
        <music-note note="E" octave="5" duration="quarter"></music-note>
        <music-note note="E" octave="5" duration="quarter"></music-note>
      </music-voice>
      <music-voice>
        <music-note note="B" octave="3" duration="half"></music-note>
        <music-note note="F" octave="3" duration="half"></music-note>
      </music-voice>
    </music-staff>
  `,
};

export const TwoVoicesTieAcrossBarline: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="4/4">
      <music-measure>
        <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
          <music-voice>
            <music-note note="C" octave="5" duration="quarter"></music-note>
            <music-note note="D" octave="5" duration="quarter"></music-note>
            <music-note note="E" octave="5" duration="quarter"></music-note>
            <music-note
              note="F"
              octave="5"
              duration="quarter"
              tie="start"
            ></music-note>
          </music-voice>
          <music-voice>
            <music-note note="C" octave="4" duration="whole"></music-note>
          </music-voice>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
          <music-voice>
            <music-note
              note="F"
              octave="5"
              duration="half"
              tie="end"
            ></music-note>
            <music-note note="E" octave="5" duration="quarter"></music-note>
            <music-note note="D" octave="5" duration="quarter"></music-note>
          </music-voice>
          <music-voice>
            <music-note note="C" octave="4" duration="whole"></music-note>
          </music-voice>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const TwoVoicesUnisonNote: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>
        <music-note
          note="C"
          octave="5"
          duration="quarter"
          articulation="staccato"
        ></music-note>
        <music-note note="D" octave="5" duration="quarter"></music-note>
        <music-note note="E" octave="5" duration="quarter"></music-note>
        <music-note note="F" octave="5" duration="quarter"></music-note>
      </music-voice>
      <music-voice>
        <music-note note="C" octave="5" duration="quarter"></music-note>
        <music-note note="E" octave="5" duration="quarter"></music-note>
        <music-note note="G" octave="5" duration="quarter"></music-note>
        <music-note note="B" octave="5" duration="quarter"></music-note>
      </music-voice>
    </music-staff>
  `,
};

export const TwoVoicesCombinedStem: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>
        <music-note note="C" octave="5" duration="quarter"></music-note>
        <music-note note="D" octave="5" duration="quarter"></music-note>
        <music-note note="E" octave="5" duration="half"></music-note>
      </music-voice>
      <music-voice>
        <music-note note="E" octave="4" duration="quarter"></music-note>
        <music-note note="F" octave="4" duration="quarter"></music-note>
        <music-note note="G" octave="4" duration="half"></music-note>
      </music-voice>
    </music-staff>
  `,
};

export const TwoVoicesSharedRest: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>
        <music-note note="C" octave="5" duration="quarter"></music-note>
        <music-note note="D" octave="5" duration="quarter"></music-note>
        <music-rest duration="half"></music-rest>
      </music-voice>
      <music-voice>
        <music-note note="B" octave="3" duration="quarter"></music-note>
        <music-note note="G" octave="3" duration="quarter"></music-note>
        <music-rest duration="half"></music-rest>
      </music-voice>
    </music-staff>
    <music-staff clef="treble" time="4/4">
      <music-voice>
        <music-rest duration="whole"></music-rest>
      </music-voice>
      <music-voice>
        <music-rest duration="whole"></music-rest>
      </music-voice>
    </music-staff>
  `,
};

export const TwoVoicesWithTupletInLowerVoice: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>
        <music-note note="E" octave="5" duration="half"></music-note>
        <music-note
          note="D"
          octave="5"
          duration="half"
          articulation="staccato"
        ></music-note>
      </music-voice>
      <music-voice>
        <music-tuplet ratio="3">
          <music-note note="B" octave="3" duration="quarter"></music-note>
          <music-note note="A" octave="3" duration="quarter"></music-note>
          <music-note note="G" octave="3" duration="quarter"></music-note>
        </music-tuplet>
        <music-note note="F" octave="3" duration="half"></music-note>
      </music-voice>
    </music-staff>
  `,
};

export const TwoVoicesWithDynamicsInBothVoices: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>
        <music-note
          note="C"
          octave="5"
          duration="quarter"
          dynamic="f"
          articulation="staccato"
        ></music-note>
        <music-note
          note="D"
          octave="5"
          duration="quarter"
          articulation="staccato"
        ></music-note>
        <music-note
          note="E"
          octave="5"
          duration="quarter"
          articulation="staccato"
        ></music-note>
        <music-note
          note="F"
          octave="5"
          duration="quarter"
          articulation="staccato"
        ></music-note>
      </music-voice>
      <music-voice>
        <music-note
          note="B"
          octave="3"
          duration="quarter"
          dynamic="pp"
        ></music-note>
        <music-note note="A" octave="3" duration="quarter"></music-note>
        <music-note note="G" octave="3" duration="quarter"></music-note>
        <music-note note="F" octave="3" duration="quarter"></music-note>
      </music-voice>
    </music-staff>
  `,
};

export const TwoVoicesWithTrillInLowerVoice: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>
        <music-note note="E" octave="5" duration="half"></music-note>
        <music-note
          note="D"
          octave="5"
          duration="half"
          articulation="staccato"
        ></music-note>
      </music-voice>
      <music-voice>
        <music-note note="B" octave="3" duration="half" trill></music-note>
        <music-note note="F" octave="3" duration="half"></music-note>
      </music-voice>
    </music-staff>
  `,
};

export const ThreeVoicesContextualMiddle: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>
        <music-note
          note="G"
          octave="5"
          duration="quarter"
          articulation="accent"
        ></music-note>
        <music-note
          note="F"
          octave="5"
          duration="quarter"
          articulation="accent"
        ></music-note>
        <music-note
          note="E"
          octave="5"
          duration="quarter"
          articulation="accent"
        ></music-note>
        <music-note
          note="D"
          octave="5"
          duration="quarter"
          articulation="accent"
        ></music-note>
      </music-voice>
      <music-voice>
        <music-note note="C" octave="3" duration="quarter"></music-note>
        <music-note note="D" octave="3" duration="quarter"></music-note>
        <music-note note="E" octave="3" duration="quarter"></music-note>
        <music-note note="F" octave="3" duration="quarter"></music-note>
      </music-voice>
      <music-voice>
        <music-note
          note="E"
          octave="3"
          duration="quarter"
          articulation="tenuto"
        ></music-note>
        <music-note
          note="F"
          octave="3"
          duration="quarter"
          articulation="tenuto"
        ></music-note>
        <music-note
          note="G"
          octave="3"
          duration="quarter"
          articulation="tenuto"
        ></music-note>
        <music-note
          note="A"
          octave="3"
          duration="quarter"
          articulation="tenuto"
        ></music-note>
      </music-voice>
    </music-staff>
  `,
};

export const ThreeVoicesCollision: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>
        <music-note
          note="G"
          octave="5"
          duration="quarter"
          articulation="accent"
        ></music-note>
        <music-note
          note="F"
          octave="5"
          duration="quarter"
          articulation="accent"
        ></music-note>
        <music-note
          note="E"
          octave="5"
          duration="quarter"
          articulation="accent"
        ></music-note>
        <music-note
          note="D"
          octave="5"
          duration="quarter"
          articulation="accent"
        ></music-note>
      </music-voice>
      <music-voice>
        <music-note note="C" octave="3" duration="quarter"></music-note>
        <music-note note="D" octave="3" duration="quarter"></music-note>
        <music-note note="E" octave="3" duration="quarter"></music-note>
        <music-note note="F" octave="3" duration="quarter"></music-note>
      </music-voice>
      <music-voice>
        <music-note
          note="E"
          octave="5"
          duration="quarter"
          articulation="tenuto"
        ></music-note>
        <music-note
          note="D"
          octave="5"
          duration="quarter"
          articulation="tenuto"
        ></music-note>
        <music-note
          note="C"
          octave="5"
          duration="quarter"
          articulation="tenuto"
        ></music-note>
        <music-note
          note="G"
          octave="3"
          duration="quarter"
          articulation="tenuto"
        ></music-note>
      </music-voice>
    </music-staff>
  `,
};

export const TwoVoicesMidStreamClefChange: Story = {
  render: () => html`
    <music-staff clef="treble" time="4/4">
      <music-voice>
        <music-note
          note="C"
          octave="5"
          duration="quarter"
          articulation="accent"
        ></music-note>
        <music-note
          note="D"
          octave="5"
          duration="quarter"
          articulation="accent"
        ></music-note>
        <music-clef clef="bass"></music-clef>
        <music-note
          note="C"
          octave="4"
          duration="quarter"
          articulation="accent"
        ></music-note>
        <music-note
          note="B"
          octave="3"
          duration="quarter"
          articulation="accent"
        ></music-note>
      </music-voice>
      <music-voice>
        <music-note note="C" octave="4" duration="half"></music-note>
        <music-note note="C" octave="3" duration="half"></music-note>
      </music-voice>
    </music-staff>
  `,
};
