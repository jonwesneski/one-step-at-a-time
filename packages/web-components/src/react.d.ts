/**
 * React JSX declarations for the custom elements. Opt in with a triple-slash
 * reference or a `tsconfig` `types` entry:
 *
 *   /// <reference types="@one-step-at-a-time/web-components/react" />
 */
import type {
  ArpeggioType,
  ArticulationType,
  BarlineType,
  BendShape,
  BreathMark,
  Chord,
  ClefType,
  ConnectorRole,
  ConventionalAccidentalType,
  DurationType,
  DynamicMarking,
  EndingNumbering,
  GlissandoHint,
  GlissandoShape,
  GraceArticulationsType,
  GraceDuration,
  GraceNoteheadsType,
  GraceNotesType,
  GraceOctavesType,
  GraceQuarterTonesType,
  GraceSlur,
  GraceType,
  GuitarFret,
  HairpinKind,
  HairpinRole,
  MeasureEndBarline,
  MeasureNumberDisplay,
  Mode,
  Note,
  NoteheadType,
  Octave,
  OctaveContinuationMode,
  OctaveDisplayMode,
  OctaveShiftAmount,
  PercussionInstrument,
  QuarterTone,
  RestStaffSide,
  SlurStyle,
  StaffGroupType,
  StemDirection,
  StressType,
  TieStyle,
  TieValue,
  TimeSignature,
  TremoloBeamAttach,
  TremoloBeamPosition,
  TremoloLabel,
  TremoloStrokeCount,
  TremoloValue,
  TrillContinuationMode,
  TrillFinishSlur,
  TrillLineMode,
  TupletPlacement,
  TupletRatio,
  VocalType,
} from '@one-step-at-a-time/web-components';
import 'react';

// Notation shared by <music-drum-note> and <music-drum-chord>: only what
// doesn't depend on pitch.
type DrumNotationProps = {
  duration?: DurationType;
  notehead?: NoteheadType;
  tie?: TieValue;
  'lv-label'?: boolean;
  'tie-style'?: TieStyle;
  'slur-style'?: SlurStyle;
  slur?: ConnectorRole;
  'slur-group'?: string;
  for?: string;
  dynamic?: DynamicMarking;
  'dynamic-shared'?: boolean;
  'dynamic-reminder'?: boolean;
  swell?: boolean;
  crescendo?: HairpinRole;
  decrescendo?: HairpinRole;
  diminuendo?: HairpinRole;
  articulation?: ArticulationType;
  'articulation-repeat'?: boolean;
  stress?: StressType;
  'stem-direction'?: StemDirection;
  'beam-group'?: string;
  'shared-stem-for'?: string;
  tremolo?: TremoloValue;
  'tremolo-tuplet'?: number;
  /** `trem`/`non-trem`; flutter-tongue `flz`/`flt`/`frull`, cancelled by `ord`/`nat`/`norm`. */
  'tremolo-label'?: TremoloLabel;
};

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
        'double-bar-before-repeat'?: boolean;
        'ending-numbering'?: EndingNumbering;
      };
      'music-measure': WebComponentProps & {
        number?: number;
        'key-sig'?: Note;
        mode?: Mode;
        time?: TimeSignature;
        barline?: MeasureEndBarline;
        'repeat-start'?: boolean;
        /** Comma-separated passes, e.g. `"1"`, `"1,2"`. */
        ending?: string;
        'ending-label'?: string;
      };
      'music-staff': WebComponentProps & {
        clef?: ClefType;
        'key-sig'?: Note;
        mode?: Mode;
        time?: TimeSignature;
        group?: StaffGroupType;
        'group-id'?: string;
        label?: string;
        part?: string;
      };
      'music-staff-guitar-tab': WebComponentProps & {
        time?: TimeSignature;
        group?: StaffGroupType;
        'group-id'?: string;
        label?: string;
        part?: string;
        'tab-for'?: string;
      };
      'music-staff-vocal': WebComponentProps & {
        voice?: VocalType;
        'key-sig'?: Note;
        mode?: Mode;
        time?: TimeSignature;
        group?: StaffGroupType;
        'group-id'?: string;
        label?: string;
        part?: string;
      };
      'music-staff-percussion': WebComponentProps & {
        time?: TimeSignature;
        group?: StaffGroupType;
        'group-id'?: string;
        label?: string;
        part?: string;
      };
      'music-lyrics': WebComponentProps & {
        verse?: string;
      };
      'music-clef': WebComponentNoChildrenProps & {
        clef?: ClefType;
      };
      'music-barline': WebComponentNoChildrenProps & {
        type?: BarlineType;
      };
      'music-rest': WebComponentNoChildrenProps & {
        duration?: DurationType;
        'beam-group'?: string;
        'rest-staff-side'?: RestStaffSide;
        hidden?: boolean;
      };
      'music-voice': WebComponentProps;
      'music-tremolo': WebComponentProps & {
        strokes?: TremoloStrokeCount;
        'beam-attach'?: TremoloBeamAttach;
        'beam-position'?: TremoloBeamPosition;
        'tremolo-group'?: string;
      };
      'music-tuplet': WebComponentProps & {
        ratio?: TupletRatio;
        'tuplet-group'?: string;
        placement?: TupletPlacement;
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
        'glissando-shape'?: GlissandoShape;
        bend?: BendShape;
        'bend-to'?: Note;
        'bend-to-quarter-tone'?: QuarterTone;
        for?: string;
        dynamic?: DynamicMarking;
        'dynamic-shared'?: boolean;
        'dynamic-reminder'?: boolean;
        'accidental-reminder'?: boolean;
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
        'grace-quarter-tone'?: GraceQuarterTonesType;
        'grace-articulation'?: GraceArticulationsType;
        'grace-notehead'?: GraceNoteheadsType;
        'grace-type'?: GraceType;
        'grace-duration'?: GraceDuration;
        'grace-slur'?: GraceSlur;
        'grace-dynamic'?: DynamicMarking;
        trill?: boolean;
        'trill-line'?: TrillLineMode;
        'trill-stop'?: boolean;
        'trill-accidental'?: ConventionalAccidentalType;
        'trill-quarter-tone'?: QuarterTone;
        'trill-note'?: Note;
        'trill-continuation'?: TrillContinuationMode;
        'trill-finish'?: GraceNotesType;
        'trill-finish-octave'?: GraceOctavesType;
        'trill-finish-quarter-tone'?: GraceQuarterTonesType;
        'trill-finish-slur'?: TrillFinishSlur;
        'octave-shift'?: OctaveShiftAmount;
        'octave-mode'?: OctaveDisplayMode;
        'octave-stop'?: boolean;
        loco?: boolean;
        'octave-continuation'?: OctaveContinuationMode;
        'beam-group'?: string;
        'shared-stem-for'?: string;
        'slur-group'?: string;
        'stem-direction'?: StemDirection;
        notehead?: NoteheadType;
        tremolo?: TremoloValue;
        'tremolo-tuplet'?: number;
        /** `trem`/`non-trem`; flutter-tongue `flz`/`flt`/`frull`, cancelled by `ord`/`nat`/`norm`. */
        'tremolo-label'?: TremoloLabel;
        'articulation-repeat'?: boolean;
        'tie-style'?: TieStyle;
        'slur-style'?: SlurStyle;
        'breath-mark'?: BreathMark;
        swell?: boolean;
      };
      'music-drum-note': WebComponentNoChildrenProps &
        DrumNotationProps & {
          instrument?: PercussionInstrument;
        };
      'music-drum-chord': WebComponentProps & DrumNotationProps;
      'music-note': WebComponentNoChildrenProps & {
        note?: Note;
        'quarter-tone'?: QuarterTone;
        duration?: DurationType;
        octave?: Octave;
        tie?: TieValue;
        'lv-label'?: boolean;
        slur?: ConnectorRole;
        glissando?: ConnectorRole;
        'glissando-hint'?: GlissandoHint;
        'glissando-shape'?: GlissandoShape;
        bend?: BendShape;
        'bend-to'?: Note;
        'bend-to-quarter-tone'?: QuarterTone;
        for?: string;
        dynamic?: DynamicMarking;
        'dynamic-shared'?: boolean;
        'dynamic-reminder'?: boolean;
        'accidental-reminder'?: boolean;
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
        'grace-quarter-tone'?: GraceQuarterTonesType;
        'grace-articulation'?: GraceArticulationsType;
        'grace-notehead'?: GraceNoteheadsType;
        'grace-type'?: GraceType;
        'grace-duration'?: GraceDuration;
        'grace-slur'?: GraceSlur;
        'grace-dynamic'?: DynamicMarking;
        trill?: boolean;
        'trill-line'?: TrillLineMode;
        'trill-stop'?: boolean;
        'trill-accidental'?: ConventionalAccidentalType;
        'trill-quarter-tone'?: QuarterTone;
        'trill-note'?: Note;
        'trill-continuation'?: TrillContinuationMode;
        'trill-finish'?: GraceNotesType;
        'trill-finish-octave'?: GraceOctavesType;
        'trill-finish-quarter-tone'?: GraceQuarterTonesType;
        'trill-finish-slur'?: TrillFinishSlur;
        'octave-shift'?: OctaveShiftAmount;
        'octave-mode'?: OctaveDisplayMode;
        'octave-stop'?: boolean;
        loco?: boolean;
        'octave-continuation'?: OctaveContinuationMode;
        'beam-group'?: string;
        'shared-stem-for'?: string;
        'slur-group'?: string;
        'stem-direction'?: StemDirection;
        notehead?: NoteheadType;
        tremolo?: TremoloValue;
        'tremolo-tuplet'?: number;
        /** `trem`/`non-trem`; flutter-tongue `flz`/`flt`/`frull`, cancelled by `ord`/`nat`/`norm`. */
        'tremolo-label'?: TremoloLabel;
        'articulation-repeat'?: boolean;
        'tie-style'?: TieStyle;
        'slur-style'?: SlurStyle;
        'breath-mark'?: BreathMark;
        swell?: boolean;
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
