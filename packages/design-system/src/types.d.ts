import 'react';
import type { Chord, DurationType, LetterNote, Note } from './types/theory';

type WebComponentProps = {
  key?: React.Key;
  ref?: React.Ref<HTMLElement>;
  children?: React.ReactNode;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'music-chord': WebComponentProps & {
        value?: Chord;
        duration?: DurationType;
        onClick?: (e: MouseEvent) => void;
        onPointerDown?: (e: PointerEvent) => void;
        onPointerUp?: (e: PointerEvent) => void;
      };
      'music-composition': WebComponentProps & {
        keySig?: LetterNote;
        mode?: string;
        time?: string;
      };
      'music-note': WebComponentProps & {
        value?: Note;
        duration?: DurationType;
        onClick?: (e: MouseEvent) => void;
        onPointerDown?: (e: PointerEvent) => void;
        onPointerUp?: (e: PointerEvent) => void;
        // Custom events (note-click, note-pointerdown, note-pointerup) require
        // useRef + addEventListener in React — they are not auto-wired by prop name.
      };
      'music-measure': WebComponentProps & {
        keySig?: LetterNote;
        mode?: string;
        time?: string;
      };
      'music-staff-bass': WebComponentProps & {
        keySig?: LetterNote;
        mode?: string;
        time?: string;
        editable?: boolean;
        managed?: boolean;
      };
      'music-staff-treble': WebComponentProps & {
        keySig?: LetterNote;
        time?: string;
        editable?: boolean;
        managed?: boolean;
      };
      'music-staff-guitar-tab': WebComponentProps & {
        time?: string;
        children?: React.ReactNode;
      };
      'music-staff-vocal': WebComponentProps & {
        voice?: 'soprano' | 'mezzo' | 'alto' | 'tenor' | 'baritone' | 'bass';
        keySig?: LetterNote;
        mode?: string;
        time?: string;
        editable?: boolean;
        managed?: boolean;
      };
      'music-lyrics': WebComponentProps & {
        verse?: string;
      };
    }
  }
}
