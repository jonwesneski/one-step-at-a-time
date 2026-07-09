import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';
import {
  ARTICULATIONS,
  DURATIONS,
  GRACE_DURATIONS,
  GRACE_SLURS,
  GRACE_TYPES,
  NOTES,
  OCTAVES,
  STRESSES,
} from '../utils';

const meta: Meta = {
  title: 'Components/Note',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const Standalone: Story = {
  args: {
    duration: 'quarter',
  },
  argTypes: {
    duration: { control: 'select', options: DURATIONS },
  },
  render: (args) => html`<music-note duration=${args.duration}></music-note>`,
};

export const WithArticulations: Story = {
  args: {
    duration: 'quarter',
    note: 'G',
    octave: 4,
    articulation: 'staccato',
    stress: '',
  },
  argTypes: {
    duration: { control: 'select', options: DURATIONS },
    note: { control: 'select', options: NOTES },
    octave: { control: 'select', options: OCTAVES },
    articulation: { control: 'select', options: ['', ...ARTICULATIONS] },
    stress: { control: 'select', options: ['', ...STRESSES] },
  },
  render: (args) => html`
    <music-staff-treble time="4/4">
      <music-note
        duration=${args.duration}
        note=${args.note}
        octave=${args.octave}
        articulation=${args.articulation}
        stress=${args.stress}
      ></music-note>
    </music-staff-treble>
  `,
};

export const ArticulationGallery: Story = {
  render: () => html`
    <music-staff-treble time="4/4">
      <music-note note="G" octave="4" articulation="accent"></music-note>
      <music-note note="G" octave="4" articulation="marcato"></music-note>
      <music-note note="G" octave="4" articulation="staccato"></music-note>
      <music-note note="G" octave="4" articulation="staccatissimo"></music-note>
      <music-note note="G" octave="4" articulation="tenuto"></music-note>
      <music-note note="G" octave="4" articulation="portato"></music-note>
      <music-note
        note="G"
        octave="4"
        articulation="tenuto-staccatissimo"
      ></music-note>
      <music-note
        note="G"
        octave="4"
        articulation="marcato-staccato"
      ></music-note>
      <music-note note="G" octave="4" articulation="fermata"></music-note>
      <music-note
        note="G"
        octave="4"
        articulation="accent-fermata"
      ></music-note>
      <music-note note="G" octave="4" stress="stressed"></music-note>
      <music-note note="G" octave="4" stress="unstressed"></music-note>
    </music-staff-treble>
  `,
};

export const WithGraceNotes: Story = {
  args: {
    duration: 'quarter',
    note: 'C',
    octave: 5,
    grace: 'A,B',
    graceOctave: '4,4',
    graceType: 'acciaccatura',
    graceDuration: '',
    graceSlur: 'auto',
  },
  argTypes: {
    duration: { control: 'select', options: DURATIONS },
    note: { control: 'select', options: NOTES },
    octave: { control: 'select', options: OCTAVES },
    grace: { control: 'text' },
    graceOctave: { control: 'text' },
    graceType: { control: 'select', options: GRACE_TYPES },
    graceDuration: { control: 'select', options: ['', ...GRACE_DURATIONS] },
    graceSlur: { control: 'select', options: GRACE_SLURS },
  },
  render: (args) => html`
    <music-staff-treble time="4/4">
      <music-note
        duration=${args.duration}
        note=${args.note}
        octave=${args.octave}
        grace=${args.grace}
        grace-octave=${args.graceOctave}
        grace-type=${args.graceType}
        grace-duration=${args.graceDuration}
        grace-slur=${args.graceSlur}
      ></music-note>
    </music-staff-treble>
  `,
};

export const StandaloneWithGraceNotes: Story = {
  args: {
    grace: 'B',
    graceOctave: '4',
    graceType: 'acciaccatura',
  },
  argTypes: {
    grace: { control: 'text' },
    graceOctave: { control: 'text' },
    graceType: { control: 'select', options: GRACE_TYPES },
  },
  render: (args) => html`
    <div style="padding: 40px">
      <music-note
        note="C"
        octave="5"
        grace=${args.grace}
        grace-octave=${args.graceOctave}
        grace-type=${args.graceType}
      ></music-note>
    </div>
  `,
};

export const GraceNoteGallery: Story = {
  render: () => html`
    <music-staff-treble time="4/4">
      <!-- single acciaccatura (slashed eighth) -->
      <music-note note="C" octave="5" grace="B" grace-octave="4"></music-note>
      <!-- single appoggiatura, no slash -->
      <music-note
        note="C"
        octave="5"
        grace="B"
        grace-octave="4"
        grace-type="appoggiatura"
      ></music-note>
      <!-- quarter appoggiatura: bare stem, no flag -->
      <music-note
        note="G"
        octave="4"
        grace="A"
        grace-octave="4"
        grace-type="appoggiatura"
        grace-duration="quarter"
      ></music-note>
      <!-- sixteenth appoggiatura: two flags -->
      <music-note
        note="G"
        octave="4"
        grace="A"
        grace-octave="4"
        grace-type="appoggiatura"
        grace-duration="sixteenth"
      ></music-note>
    </music-staff-treble>
    <music-staff-treble time="4/4">
      <!-- two-note run, default two beams -->
      <music-note
        note="C"
        octave="5"
        grace="A,B"
        grace-octave="4,4"
      ></music-note>
      <!-- four-note run -->
      <music-note
        note="G"
        octave="4"
        grace="C,D,E,F"
        grace-octave="4,4,4,4"
      ></music-note>
      <!-- thirtysecond run: three beams -->
      <music-note
        note="C"
        octave="5"
        grace="G,A,B"
        grace-octave="4,4,4"
        grace-duration="thirtysecond"
      ></music-note>
      <!-- grace with accidental -->
      <music-note note="G" octave="4" grace="F#" grace-octave="4"></music-note>
    </music-staff-treble>
    <music-staff-treble time="4/4">
      <!-- grace before a stem-down main note (grace stays stem-up) -->
      <music-note
        note="B"
        octave="5"
        grace="A,B"
        grace-octave="5,5"
      ></music-note>
      <!-- main note with accidental: slur arcs above, grace sits left of the sharp -->
      <music-note note="F#" octave="5" grace="E" grace-octave="5"></music-note>
      <!-- consecutive graced notes (spacing) -->
      <music-note note="E" octave="4" grace="D" grace-octave="4"></music-note>
      <music-note
        note="G"
        octave="4"
        grace="F,E"
        grace-octave="4,4"
      ></music-note>
    </music-staff-treble>
    <music-staff-treble time="4/4">
      <!-- high grace pitches on ledger lines -->
      <music-note note="A" octave="5" grace="C" grace-octave="6"></music-note>
      <!-- low grace pitch on ledger lines -->
      <music-note note="E" octave="4" grace="C" grace-octave="4"></music-note>
      <!-- grace-octave omitted: grace note defaults to the main note's own octave -->
      <music-note note="C" octave="5" grace="B"></music-note>
    </music-staff-treble>
  `,
};

export const InStaff: Story = {
  args: {
    duration1: 'quarter',
    note1: 'C',
    octave1: 4,
    duration2: 'eighth',
    note2: 'E',
    octave2: 4,
    duration3: 'half',
    note3: 'G',
    octave3: 4,
    duration4: 'quarter',
    note4: 'A',
    octave4: 4,
  },
  argTypes: {
    duration1: { control: 'select', options: DURATIONS },
    note1: { control: 'select', options: NOTES },
    octave1: { control: 'select', options: OCTAVES },
    duration2: { control: 'select', options: DURATIONS },
    note2: { control: 'select', options: NOTES },
    octave2: { control: 'select', options: OCTAVES },
    duration3: { control: 'select', options: DURATIONS },
    note3: { control: 'select', options: NOTES },
    octave3: { control: 'select', options: OCTAVES },
    duration4: { control: 'select', options: DURATIONS },
    note4: { control: 'select', options: NOTES },
    octave4: { control: 'select', options: OCTAVES },
  },
  render: (args) => html`
    <music-staff-treble time="4/4">
      <music-note
        duration=${args.duration1}
        note=${args.note1}
        octave=${args.octave1}
      ></music-note>
      <music-note
        duration=${args.duration2}
        note=${args.note2}
        octave=${args.octave2}
      ></music-note>
      <music-note
        duration=${args.duration3}
        note=${args.note3}
        octave=${args.octave3}
      ></music-note>
      <music-note
        duration=${args.duration4}
        note=${args.note4}
        octave=${args.octave4}
      ></music-note>
    </music-staff-treble>
  `,
};
