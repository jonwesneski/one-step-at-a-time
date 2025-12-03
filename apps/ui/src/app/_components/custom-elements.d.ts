import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'music-layer': {
        children?: React.ReactNode;
      };
      'music-measure': {
        currentCount?: number | string;
        children?: React.ReactNode;
      };
      'music-chord': {};
      'music-note': {
        x?: number | string;
        note?: string;
        duration?: 'sixteenth' | 'eighth' | 'quarter' | 'half' | 'whole';
        class?: string;
      };
    }
  }
}
