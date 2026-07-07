import 'react';
import type { ConnectorRole } from './types/elements';
import type {
  ArticulationType,
  Chord,
  DurationType,
  DynamicMarking,
  HairpinRole,
  Mode,
  Note,
  Octave,
  StressType,
  TimeSignature,
  Voice,
} from './types/theory';

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
        mode?: Mode;
        time?: TimeSignature;
      };
      'music-measure': WebComponentProps & {
        keySig?: Note;
        mode?: Mode;
        time?: TimeSignature;
        onClick?: React.MouseEventHandler<HTMLElement>;
      };
      'music-staff-bass': WebComponentProps & {
        keySig?: Note;
        mode?: Mode;
        time?: TimeSignature;
        editable?: boolean;
        managed?: boolean;
        onClick?: React.MouseEventHandler<HTMLElement>;
      };
      'music-staff-treble': WebComponentProps & {
        keySig?: Note;
        mode?: Mode;
        time?: TimeSignature;
        editable?: boolean;
        managed?: boolean;
        onClick?: React.MouseEventHandler<HTMLElement>;
      };
      'music-staff-guitar-tab': WebComponentProps & {
        time?: TimeSignature;
        children?: React.ReactNode;
      };
      'music-staff-vocal': WebComponentProps & {
        voice?: Voice;
        keySig?: Note;
        mode?: Mode;
        time?: TimeSignature;
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
        chord?: Chord;
        duration?: DurationType;
        tie?: ConnectorRole;
        slur?: ConnectorRole;
        dynamic?: DynamicMarking;
        crescendo?: HairpinRole;
        decrescendo?: HairpinRole;
        diminuendo?: HairpinRole;
        // Articulation — a single enumerated value of legal accent/length/hold
        // combinations; illegal combos (e.g. two accents, staccato +
        // staccatissimo, fermata + staccato) are not expressible. `stress` is an
        // orthogonal Schoenberg slot.
        articulation?: ArticulationType;
        stress?: StressType;
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
        dynamic?: DynamicMarking;
        crescendo?: HairpinRole;
        decrescendo?: HairpinRole;
        diminuendo?: HairpinRole;
        // Articulation — a single enumerated value of legal accent/length/hold
        // combinations; illegal combos (e.g. two accents, staccato +
        // staccatissimo, fermata + staccato) are not expressible. `stress` is an
        // orthogonal Schoenberg slot.
        articulation?: ArticulationType;
        stress?: StressType;
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
