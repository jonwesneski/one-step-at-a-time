import 'react';
import type { ConnectorRole } from './types/elements';
import type {
  ArticulationType,
  Chord,
  ClefType,
  DurationType,
  DynamicMarking,
  GraceDuration,
  GraceSlur,
  GraceType,
  HairpinRole,
  Mode,
  Note,
  Octave,
  StaffGroupType,
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
      'music-staff': WebComponentProps & {
        clef?: ClefType;
        keySig?: Note;
        mode?: Mode;
        time?: TimeSignature;
        editable?: boolean;
        managed?: boolean;
        // Pairs this staff with its immediate next sibling under a
        // brace ("grand") or bracket connector — see StaffElementBase#group.
        group?: StaffGroupType;
        onClick?: React.MouseEventHandler<HTMLElement>;
      };
      'music-clef': WebComponentProps & {
        clef?: ClefType;
      };
      'music-staff-guitar-tab': WebComponentProps & {
        time?: TimeSignature;
        group?: StaffGroupType;
        children?: React.ReactNode;
      };
      'music-staff-vocal': WebComponentProps & {
        voice?: Voice;
        keySig?: Note;
        mode?: Mode;
        time?: TimeSignature;
        editable?: boolean;
        managed?: boolean;
        group?: StaffGroupType;
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
        articulation?: ArticulationType;
        stress?: StressType;
        // Comma-separated grace note letters, e.g. "F#,G"
        grace?: string;
        // Comma-separated grace octaves, aligned by index with `grace`.
        // Omitted or missing slots default to the host element's own octave.
        'grace-octave'?: string;
        // Comma-separated per-grace-note articulation, aligned by index with
        // `grace`. Omitted or missing slots mean no mark for that grace note.
        'grace-articulation'?: string;
        'grace-type'?: GraceType;
        'grace-duration'?: GraceDuration;
        'grace-slur'?: GraceSlur;
        // A single dynamic for the whole grace group, independent of `dynamic`.
        'grace-dynamic'?: DynamicMarking;
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
        articulation?: ArticulationType;
        stress?: StressType;
        // Comma-separated grace note letters, e.g. "F#,G"
        grace?: string;
        // Comma-separated grace octaves, aligned by index with `grace`.
        // Omitted or missing slots default to the host element's own octave.
        'grace-octave'?: string;
        // Comma-separated per-grace-note articulation, aligned by index with
        // `grace`. Omitted or missing slots mean no mark for that grace note.
        'grace-articulation'?: string;
        'grace-type'?: GraceType;
        'grace-duration'?: GraceDuration;
        'grace-slur'?: GraceSlur;
        // A single dynamic for the whole grace group, independent of `dynamic`.
        'grace-dynamic'?: DynamicMarking;
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
