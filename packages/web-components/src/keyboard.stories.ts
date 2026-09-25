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

export const Planned: Story = {
  render: () => html`
    <p>
      Keyboard pedal marks (sustain/sostenuto/una-corda, half pedal) are not
      implemented yet. Tracked in <code>TODO.md</code> §7 &ldquo;Percussion
      &amp; Keyboard Techniques&rdquo;. Note clusters (Cowell-style
      black-key/white-key/chromatic notation) also appear frequently in keyboard
      writing but are a general-purpose notation, not keyboard-specific &mdash;
      tracked as its own row in <code>TODO.md</code>. Double-stemmed beams
      (<code>beam-group</code>, see &ldquo;Double-Stemmed Beam&rdquo; above)
      currently draw only the primary beam &mdash; secondary/fractional beams,
      rest placement, cross-staff tuplets/slurs/hairpins, and a shared single
      stem are not yet implemented; see &ldquo;Known Incomplete Areas&rdquo; in
      <code>CLAUDE.md</code>.
    </p>
  `,
};
