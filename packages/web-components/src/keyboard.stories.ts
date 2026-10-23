import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import './index';

const meta: Meta = {
  title: 'Instruments/Keyboard',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const CrossStaffSlur: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="4/4">
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig="C"
          mode="major"
          time="4/4"
        >
          <music-note
            note="C"
            octave="5"
            duration="quarter"
            slur="start"
          ></music-note>
          <music-note note="D" octave="5" duration="quarter"></music-note>
          <music-note note="E" octave="5" duration="quarter"></music-note>
          <music-note note="F" octave="5" duration="quarter"></music-note>
        </music-staff>
        <music-staff clef="bass" key-sig="C" mode="major" time="4/4">
          <music-note note="C" octave="4" duration="half"></music-note>
          <music-note
            note="G"
            octave="3"
            duration="half"
            slur="end"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const DoubleStemmedBeam: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="4/4">
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig="C"
          mode="major"
          time="4/4"
        >
          <music-note
            note="C"
            octave="5"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="D"
            octave="5"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="E"
            octave="5"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="F"
            octave="5"
            duration="eighth"
            beam-group="g1"
          ></music-note>
        </music-staff>
        <music-staff clef="bass" key-sig="C" mode="major" time="4/4">
          <music-note
            note="C"
            octave="3"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="D"
            octave="3"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="E"
            octave="3"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="F"
            octave="3"
            duration="eighth"
            beam-group="g1"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const DoubleStemmedBeamWithSecondaryBeamBothHandsTogether: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="4/4">
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig="C"
          mode="major"
          time="4/4"
        >
          <music-note
            note="C"
            octave="5"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="D"
            octave="5"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="E"
            octave="5"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="F"
            octave="5"
            duration="eighth"
            beam-group="g1"
          ></music-note>
        </music-staff>
        <music-staff clef="bass" key-sig="C" mode="major" time="4/4">
          <music-note
            note="C"
            octave="3"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="D"
            octave="3"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="E"
            octave="3"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="F"
            octave="3"
            duration="eighth"
            beam-group="g1"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const DoubleStemmedBeamWithSecondaryBeam: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="4/4">
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig="C"
          mode="major"
          time="4/4"
        >
          <music-note
            note="C"
            octave="5"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="A"
            octave="4"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-rest duration="sixteenth"></music-rest>
          <music-rest duration="eighth"></music-rest>
        </music-staff>
        <music-staff clef="bass" key-sig="C" mode="major" time="4/4">
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="sixteenth"></music-rest>
          <music-note
            note="E"
            octave="3"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="C"
            octave="3"
            duration="eighth"
            beam-group="g1"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const DoubleStemmedBeamWithRests: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="4/4">
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig="C"
          mode="major"
          time="4/4"
        >
          <music-note
            note="C"
            octave="5"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-rest duration="eighth" beam-group="g1"></music-rest>
        </music-staff>
        <music-staff clef="bass" key-sig="C" mode="major" time="4/4">
          <music-note
            note="D"
            octave="3"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="E"
            octave="3"
            duration="eighth"
            beam-group="g1"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const DoubleStemmedBeamWithCenteredRest: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="4/4">
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig="C"
          mode="major"
          time="4/4"
        >
          <music-note
            note="C"
            octave="5"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-rest
            duration="eighth"
            beam-group="g1"
            rest-staff-side="centered"
          ></music-rest>
        </music-staff>
        <music-staff clef="bass" key-sig="C" mode="major" time="4/4">
          <music-rest duration="eighth"></music-rest>
          <music-note
            note="D"
            octave="3"
            duration="eighth"
            beam-group="g1"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const SharedStem: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="4/4">
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig="C"
          mode="major"
          time="4/4"
        >
          <music-note note="C" octave="5" duration="quarter"></music-note>
          <music-note note="D" octave="5" duration="quarter"></music-note>
          <music-note
            note="E"
            octave="5"
            duration="quarter"
            id="melody-e5"
          ></music-note>
          <music-note note="F" octave="5" duration="quarter"></music-note>
        </music-staff>
        <music-staff clef="bass" key-sig="C" mode="major" time="4/4">
          <music-rest duration="half"></music-rest>
          <music-note
            note="E"
            octave="3"
            duration="quarter"
            shared-stem-for="melody-e5"
          ></music-note>
          <music-rest duration="quarter"></music-rest>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const DoubleStemmedBeamWithInnerVoiceArticulation: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="4/4">
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig="C"
          mode="major"
          time="4/4"
        >
          <music-note
            note="G"
            octave="5"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-note note="A" octave="5" duration="eighth"></music-note>
        </music-staff>
        <music-staff clef="bass" key-sig="C" mode="major" time="4/4">
          <music-voice>
            <music-note note="C" octave="4" duration="quarter"></music-note>
          </music-voice>
          <music-voice>
            <music-note
              note="C"
              octave="3"
              duration="eighth"
              beam-group="g1"
              articulation="staccato"
            ></music-note>
            <music-note note="D" octave="3" duration="eighth"></music-note>
          </music-voice>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const DoubleStemmedBeamWithCrossStaffTuplet: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="4/4">
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig="C"
          mode="major"
          time="4/4"
        >
          <music-tuplet ratio="3">
            <music-note
              note="G"
              octave="5"
              duration="eighth"
              beam-group="g1"
            ></music-note>
            <music-note
              note="A"
              octave="5"
              duration="eighth"
              beam-group="g1"
            ></music-note>
            <music-note
              note="B"
              octave="5"
              duration="eighth"
              beam-group="g1"
            ></music-note>
          </music-tuplet>
        </music-staff>
        <music-staff clef="bass" key-sig="C" mode="major" time="4/4">
          <music-note
            note="C"
            octave="3"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-rest duration="quarter"></music-rest>
          <music-rest duration="eighth"></music-rest>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// A single line passed between the hands under one tuplet indication, with
// no shared beam: one `<music-tuplet tuplet-group>` per staff, each holding
// its own staff's share of the tuplet's time (`<music-rest hidden>` for the
// beats the other hand plays). Outer notes on different staves → one bracket
// centred between the staves, each end pointing at its own outer note.
export const CrossStaffTupletWithoutBeam: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="2/4">
      <music-measure>
        <music-staff clef="treble" group="grand">
          <music-tuplet ratio="3" tuplet-group="t1">
            <music-note note="A" octave="4" duration="quarter"></music-note>
            <music-note note="G" octave="5" duration="quarter"></music-note>
            <music-rest duration="quarter" hidden></music-rest>
          </music-tuplet>
        </music-staff>
        <music-staff clef="bass">
          <music-tuplet ratio="3" tuplet-group="t1">
            <music-rest duration="half" hidden></music-rest>
            <music-note note="F" octave="3" duration="quarter"></music-note>
          </music-tuplet>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble" group="grand">
          <music-tuplet ratio="5" tuplet-group="t2">
            <music-rest duration="half" hidden></music-rest>
            <music-note note="E" octave="5" duration="sixteenth"></music-note>
            <music-note note="B" octave="5" duration="sixteenth"></music-note>
          </music-tuplet>
        </music-staff>
        <music-staff clef="bass">
          <music-tuplet ratio="5" tuplet-group="t2">
            <music-note note="C" octave="3" duration="half"></music-note>
            <music-rest duration="eighth" hidden></music-rest>
          </music-tuplet>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// Outer notes on one staff: (1) the clearest option, separate per-hand
// tuplets with rests — two plain <music-tuplet>s; (2) one tuplet-group,
// whose bracket goes outside the system on the outer notes' own side
// (below here) so it never appears to exclude the other hand's notes;
// (3) the same with placement="above".
export const CrossStaffTupletOuterNotesSameStaff: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="2/4">
      <music-measure>
        <music-staff clef="treble" group="grand">
          <music-tuplet ratio="3">
            <music-rest duration="quarter"></music-rest>
            <music-chord duration="quarter">
              <music-note note="B" octave="4" duration="quarter"></music-note>
              <music-note note="F" octave="5" duration="quarter"></music-note>
            </music-chord>
            <music-rest duration="quarter"></music-rest>
          </music-tuplet>
        </music-staff>
        <music-staff clef="bass">
          <music-tuplet ratio="3">
            <music-note note="F" octave="3" duration="quarter"></music-note>
            <music-rest duration="quarter"></music-rest>
            <music-note note="C" octave="3" duration="quarter"></music-note>
          </music-tuplet>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble" group="grand">
          <music-tuplet ratio="3" tuplet-group="t1">
            <music-rest duration="quarter" hidden></music-rest>
            <music-chord duration="quarter">
              <music-note note="B" octave="4" duration="quarter"></music-note>
              <music-note note="F" octave="5" duration="quarter"></music-note>
            </music-chord>
            <music-rest duration="quarter" hidden></music-rest>
          </music-tuplet>
        </music-staff>
        <music-staff clef="bass">
          <music-tuplet ratio="3" tuplet-group="t1">
            <music-note note="F" octave="3" duration="quarter"></music-note>
            <music-rest duration="quarter" hidden></music-rest>
            <music-note note="C" octave="3" duration="quarter"></music-note>
          </music-tuplet>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble" group="grand">
          <music-tuplet ratio="3" tuplet-group="t2" placement="above">
            <music-rest duration="quarter" hidden></music-rest>
            <music-chord duration="quarter">
              <music-note note="B" octave="4" duration="quarter"></music-note>
              <music-note note="F" octave="5" duration="quarter"></music-note>
            </music-chord>
            <music-rest duration="quarter" hidden></music-rest>
          </music-tuplet>
        </music-staff>
        <music-staff clef="bass">
          <music-tuplet ratio="3" tuplet-group="t2">
            <music-note note="F" octave="3" duration="quarter"></music-note>
            <music-rest duration="quarter" hidden></music-rest>
            <music-note note="C" octave="3" duration="quarter"></music-note>
          </music-tuplet>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const DoubleStemmedBeamWithSlur: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="4/4">
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig="C"
          mode="major"
          time="4/4"
        >
          <music-note
            note="G"
            octave="5"
            duration="eighth"
            beam-group="g1"
            slur="start"
          ></music-note>
          <music-rest duration="eighth"></music-rest>
          <music-note
            note="A"
            octave="5"
            duration="eighth"
            beam-group="g1"
            slur="end"
          ></music-note>
        </music-staff>
        <music-staff clef="bass" key-sig="C" mode="major" time="4/4">
          <music-rest duration="eighth"></music-rest>
          <music-note
            note="C"
            octave="3"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-rest duration="eighth"></music-rest>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const DoubleStemmedBeamWithInnerVoiceSlur: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="4/4">
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig="C"
          mode="major"
          time="4/4"
        >
          <music-note
            note="G"
            octave="5"
            duration="eighth"
            beam-group="g1"
          ></music-note>
        </music-staff>
        <music-staff clef="bass" key-sig="C" mode="major" time="4/4">
          <music-voice>
            <music-note note="C" octave="4" duration="quarter"></music-note>
          </music-voice>
          <music-voice>
            <music-note
              note="C"
              octave="3"
              duration="eighth"
              beam-group="g1"
              slur="start"
            ></music-note>
            <music-note note="D" octave="3" duration="eighth" slur="end">
            </music-note>
          </music-voice>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const HandCrossingPassage: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="3/4">
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig="C"
          mode="major"
          time="3/4"
        >
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="eighth"></music-rest>
          <music-note note="E" octave="4" duration="eighth"></music-note>
          <music-note note="G" octave="4" duration="eighth"></music-note>
          <music-note
            note="B"
            octave="4"
            duration="eighth"
            slur="start"
            id="hand-crossing-passage-leg1-end"
          ></music-note>
        </music-staff>
        <music-staff clef="bass" key-sig="C" mode="major" time="3/4">
          <music-note
            note="E"
            octave="3"
            duration="eighth"
            slur="end"
            for="hand-crossing-passage-leg1-end"
          ></music-note>
          <music-note note="G" octave="3" duration="eighth"></music-note>
          <music-note note="B" octave="3" duration="eighth"></music-note>
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="eighth"></music-rest>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig="C"
          mode="major"
          time="3/4"
        >
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="eighth"></music-rest>
          <music-note
            note="C"
            octave="5"
            duration="eighth"
            stem-direction="down"
          ></music-note>
          <music-note
            note="E"
            octave="5"
            duration="eighth"
            stem-direction="down"
          ></music-note>
          <music-note
            note="G"
            octave="5"
            duration="eighth"
            stem-direction="down"
            slur="start"
            id="hand-crossing-passage-leg2-end"
          ></music-note>
        </music-staff>
        <music-staff clef="bass" key-sig="C" mode="major" time="3/4">
          <music-note
            note="C"
            octave="4"
            duration="eighth"
            stem-direction="up"
            slur="end"
            for="hand-crossing-passage-leg2-end"
          ></music-note>
          <music-note
            note="E"
            octave="4"
            duration="eighth"
            stem-direction="up"
          ></music-note>
          <music-note
            note="G"
            octave="4"
            duration="eighth"
            stem-direction="up"
          ></music-note>
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="eighth"></music-rest>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const HandCrossingPassageChained: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="4/4">
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig="C"
          mode="major"
          time="4/4"
        >
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="eighth"></music-rest>
          <music-note note="D" octave="4" duration="eighth"></music-note>
          <music-note note="F" octave="4" duration="eighth"></music-note>
          <music-note note="A" octave="4" duration="eighth"></music-note>
          <music-note
            note="D"
            octave="5"
            duration="eighth"
            slur-group="phrase1"
          ></music-note>
        </music-staff>
        <music-staff clef="bass" key-sig="C" mode="major" time="4/4">
          <music-note
            note="F"
            octave="2"
            duration="eighth"
            slur-group="phrase1"
          ></music-note>
          <music-note note="A" octave="2" duration="eighth"></music-note>
          <music-note note="D" octave="3" duration="eighth"></music-note>
          <music-note note="F" octave="3" duration="eighth"></music-note>
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="eighth"></music-rest>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig="C"
          mode="major"
          time="4/4"
        >
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="eighth"></music-rest>
          <music-note note="A" octave="4" duration="eighth"></music-note>
          <music-note note="C" octave="5" duration="eighth"></music-note>
          <music-note note="E" octave="5" duration="eighth"></music-note>
          <music-note
            note="G"
            octave="5"
            duration="eighth"
            slur-group="phrase1"
          ></music-note>
        </music-staff>
        <music-staff clef="bass" key-sig="C" mode="major" time="4/4">
          <music-note
            note="C"
            octave="3"
            duration="eighth"
            slur-group="phrase1"
          ></music-note>
          <music-note note="E" octave="3" duration="eighth"></music-note>
          <music-note note="A" octave="3" duration="eighth"></music-note>
          <music-note note="C" octave="4" duration="eighth"></music-note>
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="eighth"></music-rest>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const WhiteKeyGlissando: Story = {
  render: () => html`
    <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
      <music-note
        note="C"
        octave="4"
        duration="half"
        glissando="start"
        glissando-hint="white-key"
      ></music-note>
      <music-note
        note="C"
        octave="6"
        duration="half"
        glissando="end"
      ></music-note>
    </music-staff>
  `,
};

export const BlackKeyGlissando: Story = {
  render: () => html`
    <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
      <music-note
        note="C#"
        octave="4"
        duration="half"
        glissando="start"
        glissando-hint="black-key"
      ></music-note>
      <music-note
        note="C#"
        octave="6"
        duration="half"
        glissando="end"
      ></music-note>
    </music-staff>
  `,
};

export const GlissandoAcrossARest: Story = {
  render: () => html`
    <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
      <music-note
        note="C"
        octave="4"
        duration="quarter"
        glissando="start"
      ></music-note>
      <music-rest duration="quarter"></music-rest>
      <music-note
        note="G"
        octave="5"
        duration="half"
        glissando="end"
      ></music-note>
    </music-staff>
  `,
};

export const SharedDynamicBetweenStaves: Story = {
  render: () => html`
    <music-measure>
      <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
        <music-note
          note="C"
          octave="5"
          duration="whole"
          dynamic="mf"
          dynamic-shared
        ></music-note>
      </music-staff>
      <music-staff clef="bass" key-sig="C" mode="major" time="4/4">
        <music-note note="C" octave="3" duration="whole"></music-note>
      </music-staff>
    </music-measure>
  `,
};

export const SharedHairpinBetweenStaves: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="4/4">
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig="C"
          mode="major"
          time="4/4"
        >
          <music-note
            note="C"
            octave="5"
            duration="half"
            dynamic="p"
            dynamic-shared
            crescendo="start"
          ></music-note>
          <music-note note="E" octave="5" duration="half"></music-note>
        </music-staff>
        <music-staff clef="bass" key-sig="C" mode="major" time="4/4">
          <music-note note="C" octave="3" duration="half"></music-note>
          <music-note
            note="G"
            octave="3"
            duration="half"
            dynamic="f"
            crescendo="end"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// A hairpin for both hands stays mid-system under the shared beam, crossing
// stems but never the beam, rather than moving outside the system.
export const DoubleStemmedBeamWithSharedHairpin: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="2/4">
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig="C"
          mode="major"
          time="2/4"
        >
          <music-note
            note="C"
            octave="5"
            duration="thirtysecond"
            beam-group="g1"
            dynamic="p"
            dynamic-shared
            crescendo="start"
          ></music-note>
          <music-rest duration="thirtysecond" hidden></music-rest>
          <music-chord duration="thirtysecond" beam-group="g1"
            ><music-note
              note="B"
              octave="5"
              duration="thirtysecond"
            ></music-note
            ><music-note
              note="C"
              octave="6"
              duration="thirtysecond"
            ></music-note
          ></music-chord>
          <music-rest duration="thirtysecond" hidden></music-rest>
          <music-note
            note="E"
            octave="5"
            duration="thirtysecond"
            beam-group="g1"
          ></music-note>
          <music-rest duration="thirtysecond" hidden></music-rest>
          <music-note
            note="C"
            octave="5"
            duration="thirtysecond"
            beam-group="g1"
          ></music-note>
          <music-rest duration="thirtysecond" hidden></music-rest>
          <music-chord duration="quarter" dynamic="ff" crescendo="end"
            ><music-note note="F" octave="4" duration="quarter"></music-note
            ><music-note note="G" octave="4" duration="quarter"></music-note
            ><music-note note="C" octave="5" duration="quarter"></music-note
          ></music-chord>
        </music-staff>
        <music-staff clef="treble" key-sig="C" mode="major" time="2/4">
          <music-rest duration="thirtysecond" hidden></music-rest>
          <music-note
            note="F"
            octave="4"
            duration="thirtysecond"
            beam-group="g1"
          ></music-note>
          <music-rest duration="thirtysecond" hidden></music-rest>
          <music-note
            note="G"
            octave="4"
            duration="thirtysecond"
            beam-group="g1"
          ></music-note>
          <music-rest duration="thirtysecond" hidden></music-rest>
          <music-note
            note="B"
            octave="3"
            duration="thirtysecond"
            beam-group="g1"
          ></music-note>
          <music-rest duration="thirtysecond" hidden></music-rest>
          <music-note
            note="F"
            octave="4"
            duration="thirtysecond"
            beam-group="g1"
          ></music-note>
          <music-rest duration="quarter" hidden></music-rest>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// A one-hand hairpin obstructed by a double-stemmed group angles through
// its own stave — one end outside it, the other in the gap — rather than
// moving outside the system, far from the notes. Needs a composition about
// 850px wide or more: narrower, the beam's high end sits too close to the
// stave to leave room, and the hairpin keeps its row below the system.
export const DoubleStemmedBeamWithAngledHairpin: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="3/4">
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig="C"
          mode="major"
          time="3/4"
        >
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-note
            note="G"
            octave="4"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="B"
            octave="4"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="D"
            octave="5"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-chord duration="sixteenth" beam-group="g1"
            ><music-note note="E" octave="5" duration="sixteenth"></music-note
            ><music-note note="B" octave="5" duration="sixteenth"></music-note
          ></music-chord>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="eighth" hidden></music-rest>
          <music-rest duration="quarter"></music-rest>
        </music-staff>
        <music-staff clef="bass" key-sig="C" mode="major" time="3/4">
          <music-note
            note="D"
            octave="2"
            duration="sixteenth"
            beam-group="g1"
            crescendo="start"
          ></music-note>
          <music-note
            note="A"
            octave="2"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="E"
            octave="3"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-chord
            duration="sixteenth"
            stem-direction="down"
            dynamic="ff"
            crescendo="end"
            decrescendo="start"
            ><music-note note="C" octave="3" duration="sixteenth"></music-note
            ><music-note note="Eb" octave="3" duration="sixteenth"></music-note
          ></music-chord>
          <music-note
            note="G"
            octave="2"
            duration="sixteenth"
            decrescendo="end"
          ></music-note>
          <music-rest duration="eighth"></music-rest>
          <music-rest duration="quarter"></music-rest>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// When the group climbs and falls back, its beam lies flat across the gap and
// leaves no room for an angled hairpin under it, so the hairpin keeps its own
// row below the system.
export const DoubleStemmedBeamHairpinFallback: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="3/4">
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig="C"
          mode="major"
          time="3/4"
        >
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-note
            note="G"
            octave="4"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="B"
            octave="4"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="D"
            octave="5"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-chord duration="sixteenth" beam-group="g1"
            ><music-note note="E" octave="5" duration="sixteenth"></music-note
            ><music-note note="B" octave="5" duration="sixteenth"></music-note
          ></music-chord>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="quarter"></music-rest>
        </music-staff>
        <music-staff clef="bass" key-sig="C" mode="major" time="3/4">
          <music-note
            note="D"
            octave="2"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="A"
            octave="2"
            duration="sixteenth"
            beam-group="g1"
            crescendo="start"
          ></music-note>
          <music-note
            note="E"
            octave="3"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-chord
            duration="sixteenth"
            stem-direction="down"
            dynamic="ff"
            crescendo="end"
            decrescendo="start"
            ><music-note note="C" octave="3" duration="sixteenth"></music-note
            ><music-note note="Eb" octave="3" duration="sixteenth"></music-note
          ></music-chord>
          <music-note
            note="B"
            octave="3"
            duration="sixteenth"
            beam-group="g1"
            decrescendo="end"
          ></music-note>
          <music-note
            note="G"
            octave="3"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-rest duration="quarter"></music-rest>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// A short right-hand hairpin under a beam that crosses the middle of the gap
// has no room there and is too short to angle, so it moves above the system.
// A short right-hand hairpin under a beam that crosses the middle of the gap
// has no room there and is too short to angle, so it moves above the system.
export const DoubleStemmedBeamTrebleHairpinAbove: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="4/4">
      <music-measure>
        <music-staff
          clef="treble"
          group="grand"
          key-sig="C"
          mode="major"
          time="4/4"
        >
          <music-note
            note="A"
            octave="5"
            duration="thirtysecond"
            beam-group="g1"
            dynamic="p"
            crescendo="start"
          ></music-note>
          <music-note
            note="B"
            octave="5"
            duration="thirtysecond"
            beam-group="g1"
            dynamic="f"
            crescendo="end"
          ></music-note>
          <music-note
            note="C"
            octave="6"
            duration="thirtysecond"
            beam-group="g1"
          ></music-note>
          <music-note
            note="D"
            octave="6"
            duration="thirtysecond"
            beam-group="g1"
          ></music-note>
        </music-staff>
        <music-staff clef="bass" key-sig="C" mode="major" time="4/4">
          <music-note
            note="E"
            octave="2"
            duration="thirtysecond"
            beam-group="g1"
          ></music-note>
          <music-note
            note="F"
            octave="2"
            duration="thirtysecond"
            beam-group="g1"
          ></music-note>
          <music-note
            note="G"
            octave="2"
            duration="thirtysecond"
            beam-group="g1"
          ></music-note>
          <music-note
            note="A"
            octave="2"
            duration="thirtysecond"
            beam-group="g1"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// A shared hairpin crossing a barline stays in the gap between the hands,
// stepping clear of the next measure's double-stemmed beam.
export const SharedHairpinAcrossMeasures: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="4/4">
      <music-measure>
        <music-staff clef="treble" group="grand">
          <music-note
            note="C"
            octave="5"
            duration="half"
            dynamic="p"
            dynamic-shared
            crescendo="start"
          ></music-note>
          <music-note note="D" octave="5" duration="half"></music-note>
        </music-staff>
        <music-staff clef="bass">
          <music-note note="C" octave="3" duration="whole"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble" group="grand">
          <music-note
            note="A"
            octave="5"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="B"
            octave="5"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="C"
            octave="6"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="D"
            octave="6"
            duration="eighth"
            beam-group="g1"
            dynamic="f"
            dynamic-shared
            crescendo="end"
          ></music-note>
          <music-note note="E" octave="5" duration="half"></music-note>
        </music-staff>
        <music-staff clef="bass">
          <music-note
            note="E"
            octave="2"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="F"
            octave="2"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="G"
            octave="2"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="A"
            octave="2"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-note note="C" octave="3" duration="half"></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// Split at a system break, each half of a shared hairpin sits in its own
// row's gap.
export const SharedHairpinAcrossSystemBreak: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="4/4" max-width="320">
      <music-measure>
        <music-staff clef="treble" group="grand">
          <music-note note="C" octave="5" duration="half"></music-note>
          <music-note
            note="D"
            octave="5"
            duration="half"
            dynamic="f"
            dynamic-shared
            decrescendo="start"
          ></music-note>
        </music-staff>
        <music-staff clef="bass">
          <music-note note="C" octave="3" duration="whole"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble" group="grand">
          <music-note
            note="E"
            octave="5"
            duration="half"
            dynamic="p"
            dynamic-shared
            decrescendo="end"
          ></music-note>
          <music-note note="F" octave="5" duration="half"></music-note>
        </music-staff>
        <music-staff clef="bass">
          <music-note note="E" octave="3" duration="whole"></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const PerVoiceDynamicsOnOneHand: Story = {
  render: () => html`
    <music-staff clef="treble" key-sig="C" mode="major" time="4/4">
      <music-voice>
        <music-note
          note="C"
          octave="5"
          duration="quarter"
          dynamic="f"
        ></music-note>
        <music-note note="D" octave="5" duration="quarter"></music-note>
        <music-note note="E" octave="5" duration="quarter"></music-note>
        <music-note note="F" octave="5" duration="quarter"></music-note>
      </music-voice>
      <music-voice>
        <music-note
          note="C"
          octave="4"
          duration="quarter"
          dynamic="p"
        ></music-note>
        <music-note note="B" octave="3" duration="quarter"></music-note>
        <music-note note="A" octave="3" duration="quarter"></music-note>
        <music-note note="G" octave="3" duration="quarter"></music-note>
      </music-voice>
    </music-staff>
  `,
};

export const ThreeStaveHandDistribution: Story = {
  render: () => html`
    <music-measure>
      <music-staff
        clef="treble"
        key-sig="C"
        mode="major"
        time="4/4"
        group="bracket"
        group-id="piano"
        label="r.h."
      >
        <music-note note="C" octave="6" duration="whole"></music-note>
      </music-staff>
      <music-staff
        clef="treble"
        key-sig="C"
        mode="major"
        time="4/4"
        group="bracket"
        group-id="piano"
      >
        <music-note note="C" octave="5" duration="whole"></music-note>
      </music-staff>
      <music-staff
        clef="bass"
        key-sig="C"
        mode="major"
        time="4/4"
        group="bracket"
        group-id="piano"
        label="l.h."
      >
        <music-note note="C" octave="3" duration="whole"></music-note>
      </music-staff>
    </music-measure>
  `,
};

// Both hands transposed under one common beam: each staff takes its own
// octave sign, and the left hand's sits in the gap between its staff and the
// beam, which rises clear of it.
export const DoubleStemmedBeamBothHandsOctave: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="6/8">
      <music-measure>
        <music-staff clef="treble" group="grand">
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-note
            note="G"
            octave="5"
            duration="sixteenth"
            beam-group="g1"
            octave-shift="8va"
          ></music-note>
          <music-note
            note="B"
            octave="5"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="D"
            octave="6"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-note
            note="G"
            octave="5"
            duration="sixteenth"
            beam-group="g2"
          ></music-note>
          <music-note
            note="B"
            octave="5"
            duration="sixteenth"
            beam-group="g2"
          ></music-note>
          <music-note
            note="D"
            octave="6"
            duration="sixteenth"
            beam-group="g2"
            octave-stop
          ></music-note>
        </music-staff>
        <music-staff clef="treble">
          <music-note
            note="F"
            octave="4"
            duration="sixteenth"
            beam-group="g1"
            octave-shift="8va"
          ></music-note>
          <music-note
            note="A"
            octave="4"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="C"
            octave="5"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-note
            note="F"
            octave="4"
            duration="sixteenth"
            beam-group="g2"
          ></music-note>
          <music-note
            note="A"
            octave="4"
            duration="sixteenth"
            beam-group="g2"
          ></music-note>
          <music-note
            note="C"
            octave="5"
            duration="sixteenth"
            beam-group="g2"
            octave-stop
          ></music-note>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// The right hand sits low over ledger lines, leaving no room in the usual
// gap for the left hand's octave line, the beam and long-enough stems: the
// gap between the staves widens instead of the line moving toward the right
// hand. The right hand plays at pitch, so the line also breaks around it.
export const DoubleStemmedBeamOctaveTightGap: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="6/8">
      <music-measure>
        <music-staff clef="treble" group="grand">
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-note
            note="C"
            octave="4"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="C"
            octave="4"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="C"
            octave="4"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-note
            note="C"
            octave="4"
            duration="sixteenth"
            beam-group="g2"
          ></music-note>
          <music-note
            note="C"
            octave="4"
            duration="sixteenth"
            beam-group="g2"
          ></music-note>
          <music-note
            note="C"
            octave="4"
            duration="sixteenth"
            beam-group="g2"
          ></music-note>
        </music-staff>
        <music-staff clef="treble">
          <music-note
            note="F"
            octave="4"
            duration="sixteenth"
            beam-group="g1"
            octave-shift="8va"
          ></music-note>
          <music-note
            note="A"
            octave="4"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="C"
            octave="5"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-note
            note="F"
            octave="4"
            duration="sixteenth"
            beam-group="g2"
          ></music-note>
          <music-note
            note="A"
            octave="4"
            duration="sixteenth"
            beam-group="g2"
          ></music-note>
          <music-note
            note="C"
            octave="5"
            duration="sixteenth"
            beam-group="g2"
            octave-stop
          ></music-note>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble" group="grand">
          <music-note note="E" octave="4" duration="quarter"></music-note>
          <music-note note="D" octave="4" duration="quarter"></music-note>
          <music-note note="C" octave="4" duration="quarter"></music-note>
        </music-staff>
        <music-staff clef="treble">
          <music-note note="C" octave="5" duration="quarter"></music-note>
          <music-note note="A" octave="4" duration="quarter"></music-note>
          <music-note note="F" octave="4" duration="quarter"></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// One hand transposed under a common beam: the right hand's line is
// authored as one span, but it breaks around the left hand's notes so they
// aren't read as transposed too — each run restates the sign.
export const DoubleStemmedBeamOneHandOctave: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="2/4">
      <music-measure>
        <music-staff clef="treble" group="grand">
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-note
            note="E"
            octave="5"
            duration="sixteenth"
            beam-group="g1"
            octave-shift="8va"
          ></music-note>
          <music-note
            note="A"
            octave="5"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="C"
            octave="6"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-note
            note="A"
            octave="5"
            duration="sixteenth"
            beam-group="g2"
          ></music-note>
          <music-note
            note="C"
            octave="6"
            duration="sixteenth"
            beam-group="g2"
            octave-stop
          ></music-note>
        </music-staff>
        <music-staff clef="treble">
          <music-note
            note="A"
            octave="4"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-note
            note="G"
            octave="4"
            duration="sixteenth"
            beam-group="g2"
          ></music-note>
          <music-note
            note="C"
            octave="5"
            duration="sixteenth"
            beam-group="g2"
          ></music-note>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// Both hands play every beat, so the right hand's line can't avoid the left
// hand's notes: the left hand is marked loco instead, placed before its first
// note rather than under the beam.
export const DoubleStemmedBeamOctaveWithLoco: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="3/8">
      <music-measure>
        <music-staff clef="treble" group="grand">
          <music-note
            note="E"
            octave="6"
            duration="eighth"
            beam-group="g1"
            octave-shift="8va"
          ></music-note>
          <music-note
            note="E"
            octave="6"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="E"
            octave="6"
            duration="eighth"
            beam-group="g1"
            octave-stop
          ></music-note>
        </music-staff>
        <music-staff clef="treble">
          <music-note
            note="F"
            octave="5"
            duration="eighth"
            beam-group="g1"
            loco
          ></music-note>
          <music-note
            note="F"
            octave="5"
            duration="eighth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="F"
            octave="5"
            duration="eighth"
            beam-group="g1"
          ></music-note>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

// The left hand's line continues from the previous bar over a common beam:
// the beam clears it there too, and it breaks around the right hand's
// untransposed notes like a line that starts in the bar.
export const DoubleStemmedBeamOctaveAcrossMeasures: Story = {
  render: () => html`
    <music-composition key-sig="C" mode="major" time="6/8">
      <music-measure>
        <music-staff clef="treble" group="grand">
          <music-note note="G" octave="5" duration="quarter"></music-note>
          <music-note note="B" octave="5" duration="quarter"></music-note>
          <music-note note="D" octave="6" duration="quarter"></music-note>
        </music-staff>
        <music-staff clef="treble">
          <music-note
            note="F"
            octave="4"
            duration="quarter"
            octave-shift="8va"
          ></music-note>
          <music-note note="A" octave="4" duration="quarter"></music-note>
          <music-note note="C" octave="5" duration="quarter"></music-note>
        </music-staff>
      </music-measure>
      <music-measure>
        <music-staff clef="treble" group="grand">
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-note
            note="G"
            octave="5"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="B"
            octave="5"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="D"
            octave="6"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-note
            note="G"
            octave="5"
            duration="sixteenth"
            beam-group="g2"
          ></music-note>
          <music-note
            note="B"
            octave="5"
            duration="sixteenth"
            beam-group="g2"
          ></music-note>
          <music-note
            note="D"
            octave="6"
            duration="sixteenth"
            beam-group="g2"
          ></music-note>
        </music-staff>
        <music-staff clef="treble">
          <music-note
            note="F"
            octave="4"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="A"
            octave="4"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-note
            note="C"
            octave="5"
            duration="sixteenth"
            beam-group="g1"
          ></music-note>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-note
            note="F"
            octave="4"
            duration="sixteenth"
            beam-group="g2"
          ></music-note>
          <music-note
            note="A"
            octave="4"
            duration="sixteenth"
            beam-group="g2"
          ></music-note>
          <music-note
            note="C"
            octave="5"
            duration="sixteenth"
            beam-group="g2"
            octave-stop
          ></music-note>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
          <music-rest duration="sixteenth" hidden></music-rest>
        </music-staff>
      </music-measure>
    </music-composition>
  `,
};

export const Planned: Story = {
  render: () => html`
    <p>
      Keyboard pedal marks (sustain/sostenuto/una-corda, half pedal) are not
      implemented yet. Tracked in <code>TODO.md</code> §7 &ldquo;Percussion
      &amp; Keyboard Techniques&rdquo;. Note clusters (Cowell-style
      black-key/white-key/chromatic notation) also appear frequently in keyboard
      writing but are a general-purpose notation, not keyboard-specific &mdash;
      tracked as its own row in <code>TODO.md</code>.
    </p>
  `,
};
