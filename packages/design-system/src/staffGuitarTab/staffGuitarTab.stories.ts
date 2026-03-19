import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index';

const meta: Meta = {
  title: 'Components/StaffGuitarTab',
  tags: ['autodocs'],
  render: () => html` <music-staff-guitar-tab> </music-staff-guitar-tab> `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {};

export const WithChords: Story = {
  render: () => html` <music-staff-guitar-tab> </music-staff-guitar-tab> `,
};
