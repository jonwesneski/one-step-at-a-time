/**
 * React JSX declarations for the custom elements. Opt in with a triple-slash
 * reference or a `tsconfig` `types` entry:
 *
 *   /// <reference types="@one-step-at-a-time/web-components/react" />
 */
import type {
  ArpeggioType,
  ArticulationType,
  Chord,
  ClefType,
  ConnectorRole,
  DurationType,
  DynamicMarking,
  GraceArticulationsType,
  GraceDuration,
  GraceNotesType,
  GraceOctavesType,
  GraceSlur,
  GraceType,
  GuitarFret,
  HairpinRole,
  Mode,
  Note,
  Octave,
  StaffGroupType,
  StressType,
  TimeSignature,
  TupletRatio,
  Voice,
} from '@one-step-at-a-time/web-components';
import 'react';

type WebComponentNoChildrenProps = {
  key?: React.Key;
  ref?: React.Ref<HTMLElement>;
  id?: string;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
  onPointerDown?: React.PointerEventHandler<HTMLElement>;
  onPointerUp?: React.PointerEventHandler<HTMLElement>;
};

type WebComponentProps = WebComponentNoChildrenProps & {
  children?: React.ReactNode;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'music-composition': WebComponentProps & {
        'key-sig'?: Note;
        mode?: Mode;
        time?: TimeSignature;
        'max-width'?: number | 'none';
      };
      'music-measure': WebComponentProps & {
        number?: number;
        'key-sig'?: Note;
        mode?: Mode;
        time?: TimeSignature;
      };
      'music-staff': WebComponentProps & {
        clef?: ClefType;
        'key-sig'?: Note;
        mode?: Mode;
        time?: TimeSignature;
        group?: StaffGroupType;
        'group-id'?: string;
      };
      'music-staff-guitar-tab': WebComponentProps & {
        time?: TimeSignature;
        group?: StaffGroupType;
        'group-id'?: string;
      };
      'music-staff-vocal': WebComponentProps & {
        voice?: Voice;
        'key-sig'?: Note;
        mode?: Mode;
        time?: TimeSignature;
        group?: StaffGroupType;
        'group-id'?: string;
      };
      'music-lyrics': WebComponentProps & {
        verse?: string;
      };
      'music-clef': WebComponentNoChildrenProps & {
        clef?: ClefType;
      };
      'music-rest': WebComponentNoChildrenProps & {
        duration?: DurationType;
      };
      'music-tuplet': WebComponentProps & {
        ratio?: TupletRatio;
      };
      'music-chord': WebComponentProps & {
        chord?: Chord;
        duration?: DurationType;
        tie?: ConnectorRole;
        slur?: ConnectorRole;
        for?: string;
        dynamic?: DynamicMarking;
        crescendo?: HairpinRole;
        decrescendo?: HairpinRole;
        diminuendo?: HairpinRole;
        articulation?: ArticulationType;
        stress?: StressType;
        arpeggio?: ArpeggioType;
        'arpeggio-for'?: string;
        grace?: GraceNotesType;
        'grace-octave'?: GraceOctavesType;
        'grace-articulation'?: GraceArticulationsType;
        'grace-type'?: GraceType;
        'grace-duration'?: GraceDuration;
        'grace-slur'?: GraceSlur;
        'grace-dynamic'?: DynamicMarking;
      };
      'music-note': WebComponentNoChildrenProps & {
        note?: Note;
        duration?: DurationType;
        octave?: Octave;
        tie?: ConnectorRole;
        slur?: ConnectorRole;
        for?: string;
        dynamic?: DynamicMarking;
        crescendo?: HairpinRole;
        decrescendo?: HairpinRole;
        diminuendo?: HairpinRole;
        articulation?: ArticulationType;
        stress?: StressType;
        arpeggio?: ArpeggioType;
        'arpeggio-for'?: string;
        grace?: GraceNotesType;
        'grace-octave'?: GraceOctavesType;
        'grace-articulation'?: GraceArticulationsType;
        'grace-type'?: GraceType;
        'grace-duration'?: GraceDuration;
        'grace-slur'?: GraceSlur;
        'grace-dynamic'?: DynamicMarking;
      };
      'music-guitar-note': WebComponentNoChildrenProps & {
        fret?: GuitarFret;
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
