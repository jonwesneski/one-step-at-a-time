import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';

const meta: Meta = {
  title: 'Components/StaffGuitarTab',
  tags: ['autodocs'],
  render: () => html`<music-staff-guitar-tab> </music-staff-guitar-tab>`,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
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

export const WithChords: Story = {
  render: () => html`<music-staff-guitar-tab> </music-staff-guitar-tab>`,
};
