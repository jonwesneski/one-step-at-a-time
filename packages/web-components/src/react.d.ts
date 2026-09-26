/**
 * React JSX declarations for the custom elements. Opt in with a triple-slash
 * reference or a `tsconfig` `types` entry:
 *
 *   /// <reference types="@one-step-at-a-time/web-components/react" />
 */
import type {
  AccidentalType,
  ArpeggioType,
  ArticulationType,
  Chord,
  ClefType,
  ConnectorRole,
  DurationType,
  DynamicMarking,
  GlissandoHint,
  GraceArticulationsType,
  GraceDuration,
  GraceNotesType,
  GraceOctavesType,
  GraceSlur,
  GraceType,
  GuitarFret,
  HairpinKind,
  HairpinRole,
  MeasureNumberDisplay,
  Mode,
  Note,
  Octave,
  OctaveContinuationMode,
  OctaveDisplayMode,
  OctaveShiftAmount,
  RestStaffSide,
  StaffGroupType,
  StressType,
  TieValue,
  TimeSignature,
  TrillContinuationMode,
  TrillFinishSlur,
  TrillLineMode,
  TupletRatio,
  VocalType,
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
        'measure-numbers'?: MeasureNumberDisplay;
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
        label?: string;
      };
      'music-staff-guitar-tab': WebComponentProps & {
        time?: TimeSignature;
        group?: StaffGroupType;
        'group-id'?: string;
        label?: string;
      };
      'music-staff-vocal': WebComponentProps & {
        voice?: VocalType;
        'key-sig'?: Note;
        mode?: Mode;
        time?: TimeSignature;
        group?: StaffGroupType;
        'group-id'?: string;
        label?: string;
      };
      'music-lyrics': WebComponentProps & {
        verse?: string;
      };
      'music-clef': WebComponentNoChildrenProps & {
        clef?: ClefType;
      };
      'music-rest': WebComponentNoChildrenProps & {
        duration?: DurationType;
        'beam-group'?: string;
        'rest-staff-side'?: RestStaffSide;
      };
      'music-voice': WebComponentProps;
      'music-tuplet': WebComponentProps & {
        ratio?: TupletRatio;
      };
      'music-arpeggio': WebComponentProps & {
        'run-duration'?: DurationType;
        unmatched?: 'lv' | 'skip';
        'lv-label'?: boolean;
      };
      'music-chord': WebComponentProps & {
        chord?: Chord;
        duration?: DurationType;
        tie?: TieValue;
        'lv-label'?: boolean;
        slur?: ConnectorRole;
        glissando?: ConnectorRole;
        'glissando-hint'?: GlissandoHint;
        for?: string;
        dynamic?: DynamicMarking;
        crescendo?: HairpinRole;
        decrescendo?: HairpinRole;
        diminuendo?: HairpinRole;
        articulation?: ArticulationType;
        stress?: StressType;
        arpeggio?: ArpeggioType;
        'arpeggio-for'?: string;
        'arpeggio-hairpin'?: HairpinKind | 'diminuendo';
        'arpeggio-hairpin-from'?: DynamicMarking;
        'arpeggio-hairpin-to'?: DynamicMarking;
        arpeggiate?: ConnectorRole;
        grace?: GraceNotesType;
        'grace-octave'?: GraceOctavesType;
        'grace-articulation'?: GraceArticulationsType;
        'grace-type'?: GraceType;
        'grace-duration'?: GraceDuration;
        'grace-slur'?: GraceSlur;
        'grace-dynamic'?: DynamicMarking;
        trill?: boolean;
        'trill-line'?: TrillLineMode;
        'trill-stop'?: boolean;
        'trill-accidental'?: AccidentalType;
        'trill-note'?: Note;
        'trill-continuation'?: TrillContinuationMode;
        'trill-finish'?: GraceNotesType;
        'trill-finish-octave'?: GraceOctavesType;
        'trill-finish-slur'?: TrillFinishSlur;
        'octave-shift'?: OctaveShiftAmount;
        'octave-mode'?: OctaveDisplayMode;
        'octave-stop'?: boolean;
        loco?: boolean;
        'octave-continuation'?: OctaveContinuationMode;
        'beam-group'?: string;
      };
      'music-note': WebComponentNoChildrenProps & {
        note?: Note;
        duration?: DurationType;
        octave?: Octave;
        tie?: TieValue;
        'lv-label'?: boolean;
        slur?: ConnectorRole;
        glissando?: ConnectorRole;
        'glissando-hint'?: GlissandoHint;
        for?: string;
        dynamic?: DynamicMarking;
        crescendo?: HairpinRole;
        decrescendo?: HairpinRole;
        diminuendo?: HairpinRole;
        articulation?: ArticulationType;
        stress?: StressType;
        arpeggio?: ArpeggioType;
        'arpeggio-for'?: string;
        'arpeggio-hairpin'?: HairpinKind | 'diminuendo';
        'arpeggio-hairpin-from'?: DynamicMarking;
        'arpeggio-hairpin-to'?: DynamicMarking;
        arpeggiate?: ConnectorRole;
        grace?: GraceNotesType;
        'grace-octave'?: GraceOctavesType;
        'grace-articulation'?: GraceArticulationsType;
        'grace-type'?: GraceType;
        'grace-duration'?: GraceDuration;
        'grace-slur'?: GraceSlur;
        'grace-dynamic'?: DynamicMarking;
        trill?: boolean;
        'trill-line'?: TrillLineMode;
        'trill-stop'?: boolean;
        'trill-accidental'?: AccidentalType;
        'trill-note'?: Note;
        'trill-continuation'?: TrillContinuationMode;
        'trill-finish'?: GraceNotesType;
        'trill-finish-octave'?: GraceOctavesType;
        'trill-finish-slur'?: TrillFinishSlur;
        'octave-shift'?: OctaveShiftAmount;
        'octave-mode'?: OctaveDisplayMode;
        'octave-stop'?: boolean;
        loco?: boolean;
        'octave-continuation'?: OctaveContinuationMode;
        'beam-group'?: string;
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
