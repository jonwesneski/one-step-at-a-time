import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../index';

const meta: Meta = {
  title: 'Components/Composition',
  component: 'music-composition',
  tags: ['autodocs'],
  render: (args) => html`
    <music-composition
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-measure>
        <music-staff
          clef="treble"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="C" duration="quarter"></music-note>
          <music-note note="E" duration="quarter"></music-note>
          <music-note note="G" duration="quarter"></music-note>
          <music-note note="C" duration="quarter"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff
          clef="treble"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="D" duration="quarter"></music-note>
          <music-note note="F" duration="quarter"></music-note>
          <music-note note="A" duration="quarter"></music-note>
          <music-note note="D" duration="quarter"></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
  argTypes: {
    keySig: {
      control: 'select',
      options: [
        'C',
        'G',
        'D',
        'A',
        'E',
        'B',
        'F#',
        'C#',
        'F',
        'Bb',
        'Eb',
        'Ab',
        'Db',
        'Gb',
        'Cb',
      ],
    },
    mode: {
      control: 'radio',
      options: ['major', 'minor'],
    },
    time: { control: 'text' },
  },
  args: {
    keySig: 'C',
    mode: 'major',
    time: '4/4',
  },
};
export default meta;

type Story = StoryObj;

export const MultipleMeasures: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
};

export const MaxWidth: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4', maxWidth: '520' },
  argTypes: {
    maxWidth: { control: 'text' },
  },
  render: (args) => html`
    <music-composition
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
      max-width=${args.maxWidth}
    >
      ${[0, 1, 2, 3, 4].map(
        () => html`
          <music-measure>
            <music-staff
              clef="treble"
              key-sig=${args.keySig}
              mode=${args.mode}
              time=${args.time}
            >
              <music-note note="C" duration="quarter"></music-note>
              <music-note note="E" duration="quarter"></music-note>
              <music-note note="G" duration="quarter"></music-note>
              <music-note note="E" duration="quarter"></music-note>
            </music-staff>
          </music-measure>
        `
      )}
    </music-composition>
  `,
};

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

export const GrandStaffArpeggio: Story = {
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
export const GrandStaffArpeggioDynamicChange: Story = {
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

export const WithCrossMeasureTie: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <music-composition
      key-sig=${args.keySig}
      mode=${args.mode}
      time=${args.time}
    >
      <music-measure>
        <music-staff
          clef="treble"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note note="C" octave="5" duration="quarter"></music-note>
          <music-note note="E" octave="5" duration="quarter"></music-note>
          <music-note note="G" octave="5" duration="quarter"></music-note>
          <music-note
            note="C"
            octave="5"
            duration="quarter"
            tie="start"
          ></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff
          clef="treble"
          key-sig=${args.keySig}
          mode=${args.mode}
          time=${args.time}
        >
          <music-note
            note="C"
            octave="5"
            duration="half"
            tie="end"
          ></music-note>
          <music-note note="E" octave="5" duration="quarter"></music-note>
          <music-note note="G" octave="5" duration="quarter"></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const WithCrossRowTie: Story = {
  args: { keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => html`
    <div style="max-width: 420px;">
      <music-composition
        key-sig=${args.keySig}
        mode=${args.mode}
        time=${args.time}
      >
        <music-measure>
          <music-staff
            clef="treble"
            key-sig=${args.keySig}
            mode=${args.mode}
            time=${args.time}
          >
            <music-note note="C" octave="5" duration="quarter"></music-note>
            <music-note note="E" octave="5" duration="quarter"></music-note>
            <music-note note="G" octave="5" duration="quarter"></music-note>
            <music-note
              note="C"
              octave="5"
              duration="quarter"
              tie="start"
            ></music-note>
          </music-staff>
        </music-measure>
        <music-measure>
          <music-staff
            clef="treble"
            key-sig=${args.keySig}
            mode=${args.mode}
            time=${args.time}
          >
            <music-note
              note="C"
              octave="5"
              duration="half"
              tie="end"
            ></music-note>
            <music-note note="E" octave="5" duration="half"></music-note>
          </music-staff>
        </music-measure>
      </music-composition>
    </div>
  `,
};

export const WithCrossSystemHairpin: Story = {
  render: () => html`
    <div style="max-width: 200px;">
      <music-composition key-sig="C" mode="major" time="4/4">
        <music-measure>
          <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
            <music-note
              note="C"
              octave="5"
              duration="quarter"
              dynamic="p"
              crescendo="start"
            ></music-note>
            <music-note note="D" octave="5" duration="quarter"></music-note>
            <music-note note="E" octave="5" duration="quarter"></music-note>
            <music-note note="F" octave="5" duration="quarter"></music-note>
          </music-staff>
        </music-measure>
        <music-measure>
          <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
            <music-note note="G" octave="5" duration="quarter"></music-note>
            <music-note note="A" octave="5" duration="quarter"></music-note>
            <music-note note="B" octave="5" duration="quarter"></music-note>
            <music-note
              note="C"
              octave="6"
              duration="quarter"
              dynamic="f"
              crescendo="end"
            ></music-note>
          </music-staff>
        </music-measure>
      </music-composition>
    </div>
  `,
};

export const CourtesyClefAtRowWrap: Story = {
  render: () => html`
    <div style="max-width: 150px;">
      <music-composition key-sig="C" mode="major" time="4/4">
        <music-measure>
          <music-staff clef="treble">
            <music-note note="C" duration="whole"></music-note>
          </music-staff>
        </music-measure>
        <music-measure>
          <music-staff clef="bass">
            <music-note note="C" octave="3" duration="whole"></music-note>
          </music-staff>
        </music-measure>
      </music-composition>
    </div>
  `,
};
