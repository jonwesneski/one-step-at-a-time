import 'react';
import type { Chord, DurationType, LetterNote, Note } from './types/theory';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'music-chord': {
        value?: Chord;
        duration?: DurationType;
        children?: React.ReactNode;
        onClick?: (e: MouseEvent) => void;
        onPointerDown?: (e: PointerEvent) => void;
        onPointerUp?: (e: PointerEvent) => void;
      };
      'music-composition': {
        keySig?: LetterNote;
        mode?: string;
        time?: string;
        children?: React.ReactNode;
      };
      'music-note': {
        value?: Note;
        duration?: DurationType;
        class?: string;
        onClick?: (e: MouseEvent) => void;
        onPointerDown?: (e: PointerEvent) => void;
        onPointerUp?: (e: PointerEvent) => void;
        // Custom events (note-click, note-pointerdown, note-pointerup) require
        // useRef + addEventListener in React — they are not auto-wired by prop name.
      };
      'music-measure': {
        keySig?: LetterNote;
        mode?: string;
        time?: string;
        children?: React.ReactNode;
      };
      'music-staff-bass': {
        keySig?: LetterNote;
        mode?: string;
        time?: string;
        children?: React.ReactNode;
      };
      'music-staff-treble': {
        keySig?: LetterNote;
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
