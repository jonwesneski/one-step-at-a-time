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
