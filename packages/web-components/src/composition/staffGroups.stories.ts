import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../index';

const meta: Meta = {
  title: 'Composition/Staff Groups',
  component: 'music-composition',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const GrandStaff: Story = {
  args: { keySig: 'G', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-composition
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="G" duration="quarter"></music-note>
          <music-note note="B" duration="quarter"></music-note>
          <music-note note="D" duration="quarter"></music-note>
          <music-note note="G" duration="quarter"></music-note>
        </music-staff>
        <music-staff
          clef="bass"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="G" duration="half"></music-note>
          <music-note note="D" duration="half"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="A" duration="quarter"></music-note>
          <music-note note="C" duration="quarter"></music-note>
          <music-note note="E" duration="quarter"></music-note>
          <music-note note="A" duration="quarter"></music-note>
        </music-staff>
        <music-staff
          clef="bass"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="A" duration="half"></music-note>
          <music-note note="E" duration="half"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="B" duration="quarter"></music-note>
          <music-note note="D" duration="quarter"></music-note>
          <music-note note="F#" duration="quarter"></music-note>
          <music-note note="B" duration="quarter"></music-note>
        </music-staff>
        <music-staff
          clef="bass"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="B" duration="half"></music-note>
          <music-note note="F#" duration="half"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="C" octave="5" duration="quarter"></music-note>
          <music-note note="E" octave="5" duration="quarter"></music-note>
          <music-note note="G" octave="5" duration="quarter"></music-note>
          <music-note note="C" octave="5" duration="quarter"></music-note>
        </music-staff>
        <music-staff
          clef="bass"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="C" duration="half"></music-note>
          <music-note note="G" duration="half"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="D" octave="5" duration="quarter"></music-note>
          <music-note note="F#" octave="5" duration="quarter"></music-note>
          <music-note note="A" octave="5" duration="quarter"></music-note>
          <music-note note="D" octave="5" duration="quarter"></music-note>
        </music-staff>
        <music-staff
          clef="bass"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="D" duration="half"></music-note>
          <music-note note="A" duration="half"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="E" octave="5" duration="quarter"></music-note>
          <music-note note="G" octave="5" duration="quarter"></music-note>
          <music-note note="B" octave="5" duration="quarter"></music-note>
          <music-note note="E" octave="5" duration="quarter"></music-note>
        </music-staff>
        <music-staff
          clef="bass"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="E" duration="half"></music-note>
          <music-note note="B" duration="half"></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const GrandStavesInOneMeasure: Story = {
  render: () => html`
    <music-measure number="1" key-sig="C" mode="major" time="4/4">
      <music-staff
        clef="treble"
        group="grand"
        key-sig="C"
        mode="major"
        time="4/4"
      >
        <music-note note="C" duration="whole"></music-note>
      </music-staff>
      <music-staff clef="bass" key-sig="C" mode="major" time="4/4">
        <music-note note="C" duration="whole"></music-note>
      </music-staff>
      <music-staff
        clef="treble"
        group="grand"
        key-sig="C"
        mode="major"
        time="4/4"
      >
        <music-note note="G" duration="whole"></music-note>
      </music-staff>
      <music-staff clef="bass" key-sig="C" mode="major" time="4/4">
        <music-note note="G" duration="whole"></music-note>
      </music-staff>
    </music-measure>
  `,
};

export const BracketWithoutGroupId: Story = {
  render: () => html`
    <music-measure number="1" key-sig="C" mode="major" time="4/4">
      <music-staff
        clef="treble"
        group="bracket"
        key-sig="C"
        mode="major"
        time="4/4"
      >
        <music-note note="C" octave="5" duration="whole"></music-note>
      </music-staff>
      <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
        <music-note note="G" octave="4" duration="whole"></music-note>
      </music-staff>
    </music-measure>
  `,
};

export const Bracket: Story = {
  render: () => html`
    <music-measure number="1" key-sig="C" mode="major" time="4/4">
      <music-staff
        clef="treble"
        group="bracket"
        group-id="choir"
        key-sig="C"
        mode="major"
        time="4/4"
      >
        <music-note note="C" octave="5" duration="whole"></music-note>
      </music-staff>
      <music-staff
        clef="treble"
        group="bracket"
        group-id="choir"
        key-sig="C"
        mode="major"
        time="4/4"
      >
        <music-note note="G" octave="4" duration="whole"></music-note>
      </music-staff>
      <music-staff
        clef="bass"
        group="bracket"
        group-id="choir"
        key-sig="C"
        mode="major"
        time="4/4"
      >
        <music-note note="E" octave="4" duration="whole"></music-note>
      </music-staff>
      <music-staff
        clef="bass"
        group="bracket"
        group-id="choir"
        key-sig="C"
        mode="major"
        time="4/4"
      >
        <music-note note="C" octave="3" duration="whole"></music-note>
      </music-staff>
    </music-measure>
  `,
};

export const BracketWithGuitarTab: Story = {
  args: { number: 1, keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-measure
      number=${args.number}
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-staff
        clef="treble"
        group="bracket"
        key-sig=${args.keySig}
        mode=${args.mode}
        time=${args.time}
      >
        <music-note note="E" duration="quarter"></music-note>
        <music-note note="G" duration="quarter"></music-note>
        <music-note note="B" duration="quarter"></music-note>
        <music-note note="E" duration="quarter"></music-note>
      </music-staff>
      <music-staff-guitar-tab>
        <music-guitar-note
          fret="0"
          string="1"
          duration="quarter"
        ></music-guitar-note>
        <music-guitar-note
          fret="3"
          string="2"
          duration="quarter"
        ></music-guitar-note>
        <music-guitar-note
          fret="2"
          string="3"
          duration="quarter"
        ></music-guitar-note>
        <music-guitar-note
          fret="0"
          string="4"
          duration="quarter"
        ></music-guitar-note>
      </music-staff-guitar-tab>
    </music-measure>
  `,
};
