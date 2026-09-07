import type {
  ArpeggioType,
  ArticulationType,
  ClefType,
  DurationType,
  DynamicMarking,
  GraceDuration,
  GraceSlur,
  GraceType,
  Mode,
  Note,
  Octave,
  StaffGroupType,
  StressType,
  TimeSignature,
  TupletRatio,
  Voice,
} from '../types/theory';

export const SVG_NS = 'http://www.w3.org/2000/svg';

export const MUSIC_NOTE = 'music-note';
export const MUSIC_REST = 'music-rest';
export const MUSIC_CHORD = 'music-chord';
export const MUSIC_TUPLET = 'music-tuplet';
export const MUSIC_GUITAR_NOTE = 'music-guitar-note';
export const MUSIC_GUITAR_CHORD = 'music-guitar-chord';
export const MUSIC_MEASURE = 'music-measure';
export const MUSIC_COMPOSITION = 'music-composition';
export const MUSIC_STAFF = 'music-staff';
export const MUSIC_CLEF = 'music-clef';
export const MUSIC_STAFF_GUITAR_TAB = 'music-staff-guitar-tab';
export const MUSIC_STAFF_VOCAL = 'music-staff-vocal';
export const MUSIC_LYRICS = 'music-lyrics';

export const STAFF_TAGS = [
  MUSIC_STAFF,
  MUSIC_STAFF_GUITAR_TAB,
  MUSIC_STAFF_VOCAL,
].join(', ');

export const isStaffNodeName = (nodeName: string): boolean =>
  nodeName === MUSIC_STAFF_NODE || nodeName.startsWith('MUSIC-STAFF-');

// Uppercase variants for nodeName comparisons (DOM nodeName is always uppercase)
export const MUSIC_NOTE_NODE = MUSIC_NOTE.toUpperCase();
export const MUSIC_REST_NODE = MUSIC_REST.toUpperCase();
export const MUSIC_CHORD_NODE = MUSIC_CHORD.toUpperCase();
export const MUSIC_TUPLET_NODE = MUSIC_TUPLET.toUpperCase();
export const MUSIC_GUITAR_NOTE_NODE = MUSIC_GUITAR_NOTE.toUpperCase();
export const MUSIC_GUITAR_CHORD_NODE = MUSIC_GUITAR_CHORD.toUpperCase();
export const MUSIC_MEASURE_NODE = MUSIC_MEASURE.toUpperCase();
export const MUSIC_COMPOSITION_NODE = MUSIC_COMPOSITION.toUpperCase();
export const MUSIC_STAFF_NODE = MUSIC_STAFF.toUpperCase();
export const MUSIC_CLEF_NODE = MUSIC_CLEF.toUpperCase();
export const MUSIC_STAFF_GUITAR_TAB_NODE = MUSIC_STAFF_GUITAR_TAB.toUpperCase();
export const MUSIC_STAFF_VOCAL_NODE = MUSIC_STAFF_VOCAL.toUpperCase();
export const MUSIC_LYRICS_NODE = MUSIC_LYRICS.toUpperCase();

export const NOTE_EVENTS = {
  CONNECTOR_ATTRIBUTE_CHANGE: 'connector-attribute-change',
  NOTE_Y_CHANGE: 'note-y-change',
  DYNAMIC_ATTRIBUTE_CHANGE: 'dynamic-attribute-change',
  ARPEGGIO_ATTRIBUTE_CHANGE: 'arpeggio-attribute-change',
  CLICK: 'note-click',
  POINTERDOWN: 'note-pointerdown',
  POINTERUP: 'note-pointerup',
} as const;

export const CHORD_EVENTS = {
  CLICK: 'chord-click',
  POINTERDOWN: 'chord-pointerdown',
  POINTERUP: 'chord-pointerup',
} as const;

export const CLEF_EVENTS = {
  ATTRIBUTE_CHANGE: 'clef-attribute-change',
} as const;

export const STAFF_EVENTS = {
  NOTES_POSITIONED: 'staff-notes-positioned',
  STAFF_MIN_WIDTH: 'staff-min-width',
  GROUP_ATTRIBUTE_CHANGE: 'staff-group-attribute-change',
} as const;

export const COMMON_ATTRIBUTES = {
  KEY_SIG: 'key-sig',
  MODE: 'mode',
  TIME: 'time',
  //todo
  //TEMPO: tempo,
} as const;

export const DURATIONS: DurationType[] = [
  'double-whole',
  'whole',
  'half',
  'quarter',
  'eighth',
  'sixteenth',
  'thirtysecond',
  'sixtyfourth',
  'hundredtwentyeighth',
];

export const NOTES: Note[] = [
  'A',
  'A#',
  'Bb',
  'B',
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
];

export const OCTAVES: Octave[] = [2, 3, 4, 5, 6];

export const MODES: Mode[] = ['major', 'minor'];

export const TIMES: TimeSignature[] = [
  '2/2',
  '3/2',
  '4/2',
  '1/4',
  '2/4',
  '3/4',
  '4/4',
  '5/4',
  '6/4',
  '7/4',
  '3/8',
  '5/8',
  '6/8',
  '7/8',
  '9/8',
  '12/8',
];

export const VOICES: Voice[] = [
  'soprano',
  'mezzo',
  'alto',
  'tenor',
  'baritone',
  'bass',
];

export const DYNAMICS: DynamicMarking[] = [
  'ppp',
  'pp',
  'p',
  'mp',
  'mf',
  'f',
  'ff',
  'fff',
  'sfz',
  'sf',
  'fz',
  'rfz',
  'fp',
];

export const ARTICULATIONS: ArticulationType[] = [
  // length / hold only
  'staccato',
  'staccatissimo',
  'tenuto',
  'portato',
  'tenuto-staccatissimo',
  'fermata',
  // accent only
  'accent',
  'marcato',
  // standard accent + length/hold
  'accent-staccato',
  'accent-staccatissimo',
  'accent-tenuto',
  'accent-portato',
  'accent-tenuto-staccatissimo',
  'accent-fermata',
  // strong accent (marcato) + length/hold
  'marcato-staccato',
  'marcato-staccatissimo',
  'marcato-tenuto',
  'marcato-portato',
  'marcato-tenuto-staccatissimo',
  'marcato-fermata',
];

export const STRESSES: StressType[] = ['stressed', 'unstressed'];

export const ARPEGGIOS: ArpeggioType[] = [
  'up',
  'up-arrow',
  'down',
  'non-arpeggiate',
];

export const GRACE_TYPES: GraceType[] = ['acciaccatura', 'appoggiatura'];

export const GRACE_DURATIONS: GraceDuration[] = [
  'half',
  'quarter',
  'eighth',
  'sixteenth',
  'thirtysecond',
  'sixtyfourth',
];

export const GRACE_SLURS: GraceSlur[] = ['auto', 'none'];

export const CLEFS: ClefType[] = ['treble', 'bass'];

export const STAFF_GROUPS: StaffGroupType[] = ['grand', 'bracket'];

// The everyday bare-count ratios. `TupletRatio` also accepts explicit
// `actual:normal` forms (e.g. `3:2`); those are left for callers that need
// them rather than listed here.
export const TUPLET_RATIOS: TupletRatio[] = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
];
