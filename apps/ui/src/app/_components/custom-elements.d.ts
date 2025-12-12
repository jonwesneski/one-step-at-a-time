import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'music-chord': { children?: React.ReactNode };
      'music-composition': {
        key?: string;
        mode?: string;
        time?: string;
        children?: React.ReactNode;
      };
      'music-note': {
        x?: number | string;
        note?: string;
        duration?: 'sixteenth' | 'eighth' | 'quarter' | 'half' | 'whole';
        class?: string;
      };
      'music-measure': {
        currentCount?: number | string;
        children?: React.ReactNode;
      };
      'music-staff-bass': {
        children?: React.ReactNode;
      };
      'music-staff-treble': {
        children?: React.ReactNode;
      };
      'music-staff-guitar-tab': {
        children?: React.ReactNode;
      };
    }
  }
}
