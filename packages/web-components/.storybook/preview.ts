import type { Preview } from '@storybook/web-components-vite';
import { setCustomElementsManifest } from '@storybook/web-components-vite';

import customElements from '../custom-elements.json';

import '../src/index';

setCustomElementsManifest(customElements);

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: [
          'Introduction',
          'Guides',
          ['Getting Started', 'Framework Integration', 'Concepts'],
          'Note',
          'Chord',
          'Rest',
          'Clef',
          'Staff',
          'Measure',
          'Composition',
          'Universal Notations',
          [
            'Ties',
            'Slurs',
            'Dynamics & Hairpins',
            'Tuplets',
            'Arpeggio',
            'Grace Notes',
            'Trills',
            'Clef Changes',
            'Beams',
          ],
          'Instruments',
          [
            'Voice',
            'Guitar',
            'Strings',
            'Winds & Brass',
            'Percussion & Keyboard',
          ],
        ],
      },
    },
  },
  tags: ['autodocs'],
};

export default preview;
