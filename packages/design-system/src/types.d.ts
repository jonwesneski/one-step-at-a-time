// Placeholder ambient types to satisfy implicit 'types' reference used by TypeScript
// This file intentionally exports nothing but allows the compiler to resolve the 'types' library.
import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'music-chord': {
        value?: string;
        duration?: 'sixteenth' | 'eighth' | 'quarter' | 'half' | 'whole';
        children?: React.ReactNode;
      };
      'music-composition': {
        keySig?: string;
        mode?: string;
        time?: string;
        children?: React.ReactNode;
      };
      'music-note': {
        value?: string;
        duration?: 'sixteenth' | 'eighth' | 'quarter' | 'half' | 'whole';
        class?: string;
      };
      'music-measure': {
        keySig?: string;
        mode?: string;
        time?: string;
        children?: React.ReactNode;
      };
      'music-staff-bass': {
        keySig?: string;
        mode?: string;
        time?: string;
        children?: React.ReactNode;
      };
      'music-staff-treble': {
        keySig?: string;
        time?: string;
        children?: React.ReactNode;
      };
      'music-staff-guitar-tab': {
        time?: string;
        children?: React.ReactNode;
      };
    }
  }
}
