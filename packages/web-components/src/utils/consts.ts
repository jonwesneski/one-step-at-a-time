export const SVG_NS = 'http://www.w3.org/2000/svg';

export const MUSIC_NOTE = 'music-note';
export const MUSIC_CHORD = 'music-chord';
export const MUSIC_GUITAR_NOTE = 'music-guitar-note';
export const MUSIC_GUITAR_CHORD = 'music-guitar-chord';
export const MUSIC_MEASURE = 'music-measure';
export const MUSIC_COMPOSITION = 'music-composition';
export const MUSIC_STAFF_TREBLE = 'music-staff-treble';
export const MUSIC_STAFF_BASS = 'music-staff-bass';
export const MUSIC_STAFF_GUITAR_TAB = 'music-staff-guitar-tab';
export const MUSIC_STAFF_VOCAL = 'music-staff-vocal';
export const MUSIC_LYRICS = 'music-lyrics';

// Uppercase variants for nodeName comparisons (DOM nodeName is always uppercase)
export const MUSIC_NOTE_NODE = MUSIC_NOTE.toUpperCase();
export const MUSIC_CHORD_NODE = MUSIC_CHORD.toUpperCase();
export const MUSIC_GUITAR_NOTE_NODE = MUSIC_GUITAR_NOTE.toUpperCase();
export const MUSIC_GUITAR_CHORD_NODE = MUSIC_GUITAR_CHORD.toUpperCase();
export const MUSIC_MEASURE_NODE = MUSIC_MEASURE.toUpperCase();
export const MUSIC_COMPOSITION_NODE = MUSIC_COMPOSITION.toUpperCase();
export const MUSIC_STAFF_TREBLE_NODE = MUSIC_STAFF_TREBLE.toUpperCase();
export const MUSIC_STAFF_BASS_NODE = MUSIC_STAFF_BASS.toUpperCase();
export const MUSIC_STAFF_GUITAR_TAB_NODE = MUSIC_STAFF_GUITAR_TAB.toUpperCase();
export const MUSIC_STAFF_VOCAL_NODE = MUSIC_STAFF_VOCAL.toUpperCase();
export const MUSIC_LYRICS_NODE = MUSIC_LYRICS.toUpperCase();

export const NOTE_EVENTS = {
  CONNECTOR_ATTRIBUTE_CHANGE: 'connector-attribute-change',
  CLICK: 'note-click',
  POINTERDOWN: 'note-pointerdown',
  POINTERUP: 'note-pointerup',
  DRAG_START: 'note-drag-start',
  REORDER: 'note-reorder',
  DRAG_END: 'note-drag-end',
  PITCH_DRAG_START: 'note-pitch-drag-start',
  PITCH_CHANGE: 'note-pitch-change',
} as const;

export const CHORD_EVENTS = {
  CLICK: 'chord-click',
  POINTERDOWN: 'chord-pointerdown',
  POINTERUP: 'chord-pointerup',
} as const;

export const STAFF_EVENTS = {
  NOTES_POSITIONED: 'staff-notes-positioned',
  BUSYNESS_SCORE: 'staff-busyness-score',
} as const;

export const COMMON_ATTRIBUTES = {
  KEY_SIG: 'keysig',
  MODE: 'mode',
  TIME_SIG: 'time',
} as const;
