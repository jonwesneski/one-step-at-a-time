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
      };
      'music-composition': WebComponentProps & {
        keySig?: LetterNote;
        mode?: string;
        time?: string;
      };
      'music-note': {
        value?: Note;
        duration?: DurationType;
        class?: string;
        ref?: React.Ref<HTMLElement>;
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
      };
    }
  }
}
