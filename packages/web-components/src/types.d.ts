import 'react';
import { ConnectorRole } from './types/elements';
import type { Chord, DurationType, Mode, Note, Octave } from './types/theory';

type WebComponentProps = {
  key?: React.Key;
  ref?: React.Ref<HTMLElement>;
  children?: React.ReactNode;
  className?: string;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'music-composition': WebComponentProps & {
        keySig?: Note;
        mode?: string;
        time?: string;
      };
      'music-measure': WebComponentProps & {
        keySig?: Note;
        mode?: Mode;
        time?: string;
        onClick?: React.MouseEventHandler<HTMLElement>;
      };
      'music-staff-bass': WebComponentProps & {
        keySig?: Note;
        mode?: Mode;
        time?: string;
        editable?: boolean;
        managed?: boolean;
        onClick?: React.MouseEventHandler<HTMLElement>;
      };
      'music-staff-treble': WebComponentProps & {
        keySig?: Note;
        mode?: Mode;
        time?: string;
        editable?: boolean;
        managed?: boolean;
        onClick?: React.MouseEventHandler<HTMLElement>;
      };
      'music-staff-guitar-tab': WebComponentProps & {
        time?: string;
        children?: React.ReactNode;
      };
      'music-staff-vocal': WebComponentProps & {
        voice?: 'soprano' | 'mezzo' | 'alto' | 'tenor' | 'baritone' | 'bass';
        keySig?: Note;
        mode?: Mode;
        time?: string;
        editable?: boolean;
        managed?: boolean;
      };
      'music-lyrics': WebComponentProps & {
        verse?: string;
      };
      'music-rest': WebComponentProps & {
        duration?: DurationType;
      };
      'music-chord': WebComponentProps & {
        value?: Chord;
        duration?: DurationType;
        onClick?: (e: MouseEvent) => void;
        onPointerDown?: (e: PointerEvent) => void;
        onPointerUp?: (e: PointerEvent) => void;
      };
      'music-note': WebComponentProps & {
        note?: Note;
        duration?: DurationType;
        octave?: Octave;
        tie?: ConnectorRole;
        slur?: ConnectorRole;
        onClick?: (e: MouseEvent) => void;
        onPointerDown?: (e: PointerEvent) => void;
        onPointerUp?: (e: PointerEvent) => void;
        // Custom events (note-click, note-pointerdown, note-pointerup) require
        // useRef + addEventListener in React — they are not auto-wired by prop name.
      };
      'music-guitar-note': WebComponentProps & {
        fret?: number | 'x';
        string?: number;
        duration?: DurationType;
        tie?: ConnectorRole;
        slur?: ConnectorRole;
        'hammer-on'?: ConnectorRole;
        'pull-off'?: ConnectorRole;
        slide?: ConnectorRole;
      };
    }
  }
}
