import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../../index';
import type { Mode, Note } from '../../types/theory';

const meta: Meta = {
  title: 'Universal Notations/Key Changes',
  component: 'music-measure',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

type KeyChangeArgs = {
  fromKey: Note;
  fromMode: Mode;
  toKey: Note;
  toMode: Mode;
};

const quarters = (note: Note, octave: number) => html`
  ${[0, 1, 2, 3].map(
    () => html`<music-note
      note=${note}
      octave=${octave}
      duration="quarter"
    ></music-note>`
  )}
`;

const keyChange = ({ fromKey, fromMode, toKey, toMode }: KeyChangeArgs) => html`
  <music-composition time="4/4">
    <music-measure key-sig=${fromKey} mode=${fromMode}>
      <music-staff clef="treble">${quarters('A', 4)}</music-staff>
    </music-measure>
    <music-measure key-sig=${fromKey} mode=${fromMode}>
      <music-staff clef="treble">${quarters('B', 4)}</music-staff>
    </music-measure>
    <music-measure key-sig=${toKey} mode=${toMode}>
      <music-staff clef="treble">${quarters('C', 5)}</music-staff>
    </music-measure>
    <music-measure key-sig=${toKey} mode=${toMode}>
      <music-staff clef="treble">${quarters('D', 5)}</music-staff>
    </music-measure>
  </music-composition>
`;

// A change to C major cancels every accidental of the old key.
export const DMajorToCMajor: StoryObj<KeyChangeArgs> = {
  args: { fromKey: 'D', fromMode: 'major', toKey: 'C', toMode: 'major' },
  render: keyChange,
};

// Flats to sharps: both flats are cancelled, then the two sharps follow.
export const BFlatMajorToDMajor: StoryObj<KeyChangeArgs> = {
  args: { fromKey: 'Bb', fromMode: 'major', toKey: 'D', toMode: 'major' },
  render: keyChange,
};

// C major and A minor share a key signature, so nothing is drawn.
export const CMajorToAMinor: StoryObj<KeyChangeArgs> = {
  args: { fromKey: 'C', fromMode: 'major', toKey: 'A', toMode: 'minor' },
  render: keyChange,
};

// The change lands on a row start: the previous row ends with the naturals
// and the new key, and the new row shows only the new key.
export const AtRowStart: Story = {
  render: () => html`
    <music-composition time="4/4" max-width="420">
      ${[0, 1].map(
        () => html`
          <music-measure key-sig="D">
            <music-staff clef="treble">${quarters('A', 4)}</music-staff>
          </music-measure>
        `
      )}
      ${[0, 1].map(
        () => html`
          <music-measure key-sig="C">
            <music-staff clef="treble">${quarters('C', 5)}</music-staff>
          </music-measure>
        `
      )}
    </music-composition>
  `,
};

// A clef change at a row wrap: the courtesy clef sits before the barline
// that ends the row.
export const CourtesyClefAtRowEnd: Story = {
  render: () => html`
    <music-composition time="4/4" max-width="420">
      ${[0, 1].map(
        () => html`
          <music-measure>
            <music-staff clef="treble">${quarters('G', 4)}</music-staff>
          </music-measure>
        `
      )}
      ${[0, 1].map(
        () => html`
          <music-measure>
            <music-staff clef="bass">${quarters('D', 3)}</music-staff>
          </music-measure>
        `
      )}
    </music-composition>
  `,
};
