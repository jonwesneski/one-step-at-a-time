import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';

const notesByVoice: Record<string, string[]> = {
  soprano: ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'A5'],
  mezzo: ['B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'G5'],
  alto: ['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'F5'],
  tenor: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'A4'],
  baritone: ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'F4'],
  bass: ['E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'C4'],
};

const meta: Meta = {
  title: 'Components/StaffVocal',
  tags: ['autodocs'],
  argTypes: {
    voice: {
      control: 'select',
      options: ['soprano', 'mezzo', 'alto', 'tenor', 'baritone', 'bass'],
      description: 'Voice type determines the clef and note range',
    },
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
    time: {
      control: 'text',
    },
  },
  args: {
    voice: 'soprano',
    keySig: 'C',
    mode: 'major',
    time: '4/4',
  },
};
export default meta;

type Story = StoryObj;

export const VoiceWithLyrics: Story = {
  args: { voice: 'soprano', keySig: 'C', mode: 'major', time: '4/4' },
  render: (args) => {
    const notes = notesByVoice[args.voice] || notesByVoice.soprano;
    return html`
      <music-staff-vocal
        voice=${args.voice}
        keySig=${args.keySig}
        mode=${args.mode}
        time=${args.time}
      >
        ${notes.map((note, i) => {
          const duration = i === notes.length - 1 ? 'quarter' : 'eighth';
          return html`<music-note
            value=${note as any}
            duration=${duration}
          ></music-note>`;
        })}
        <music-lyrics verse="1">Hap-py birth-day to_ you</music-lyrics>
        <music-lyrics verse="2">Hap-py birth-day dear_ friend</music-lyrics>
      </music-staff-vocal>
    `;
  },
};
