// Placeholder ambient types to satisfy implicit 'types' reference used by TypeScript
// This file intentionally exports nothing but allows the compiler to resolve the 'types' library.
import 'react';
import type { Chord, DurationType, Note } from './types/theory';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'music-chord': {
        value?: Chord;
        duration?: DurationType;
        children?: React.ReactNode;
      };
      'music-composition': {
        keySig?: Note;
        mode?: string;
        time?: string;
        children?: React.ReactNode;
      };
      'music-note': {
        value?: Note;
        duration?: DurationType;
        class?: string;
      };
      'music-measure': {
        keySig?: Note;
        mode?: string;
        time?: string;
        children?: React.ReactNode;
      };
      'music-staff-bass': {
        keySig?: Note;
        mode?: string;
        time?: string;
        children?: React.ReactNode;
      };
      'music-staff-treble': {
        keySig?: Note;
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
