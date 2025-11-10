import type * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'music-layer': {
        lineCount?: 5 | 6 | '5' | '6';
        children?: React.ReactNode;
      };
      'music-measure': {
        currentCount?: number | string;
        children?: React.ReactNode;
      };
      'music-chord': {};
      'music-note': {
        x?: number | string;
        y?: number | string;
        duration?: 'sixteenth' | 'eighth' | 'quarter' | 'half' | 'whole';
        class?: string;
      };
    }
  }
}

export {};
