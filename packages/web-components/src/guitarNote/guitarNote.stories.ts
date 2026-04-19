import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';

const meta: Meta = {
  title: 'Components/MusicGuitarNote',
  tags: ['autodocs'],
  render: (args) => html`
    <music-guitar-note
      fret=${args.fret}
      string=${args.string}
      duration=${args.duration}
    ></music-guitar-note>
  `,
  argTypes: {
    fret: { control: 'text' },
    string: {
      control: { type: 'number', min: 1, max: 6, step: 1 },
    },
    duration: {
      control: 'select',
      options: ['whole', 'half', 'quarter', 'eighth', 'sixteenth'],
    },
  },
  args: {
    fret: 5,
    string: 3,
    duration: 'quarter',
  },
};
export default meta;

type Story = StoryObj;

export const Default: Story = {};

export const Muted: Story = {
  args: { fret: 'x', string: 6, duration: 'quarter' },
};

export const HammerOn: Story = {
  render: () => html`
    <div style="display: flex; gap: 8px;">
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
    </div>
  `,
};
