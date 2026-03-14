import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
// Import order matters — use the index to register all components
import './index';

const meta: Meta = {
  title: 'Components/StaffGuitarTab',
  tags: ['autodocs'],
  render: () => html`
    <music-staff-guitar-tab>
      <music-note value="E" duration="quarter"></music-note>
      <music-note value="A" duration="quarter"></music-note>
      <music-note value="D" duration="quarter"></music-note>
      <music-note value="G" duration="quarter"></music-note>
    </music-staff-guitar-tab>
  `,
};
export default meta;

type Story = StoryObj;

/**
 * The guitar tab staff renders the TAB clef and 6-line staff.
 * Note rendering inside the tab is not yet implemented.
 */
export const Default: Story = {};

export const WithChords: Story = {
  render: () => html`
    <music-staff-guitar-tab>
      <music-chord duration="quarter">
        <music-note value="E" duration="quarter"></music-note>
        <music-note value="G" duration="quarter"></music-note>
        <music-note value="B" duration="quarter"></music-note>
      </music-chord>
      <music-note value="A" duration="quarter"></music-note>
      <music-note value="D" duration="quarter"></music-note>
    </music-staff-guitar-tab>
  `,
};
