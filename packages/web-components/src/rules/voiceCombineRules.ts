import {
  ChordElementType,
  ChordNote,
  NoteChordOrRestElementType,
  NoteElementType,
  NoteOrChordElementType,
  TupletElementType,
} from '../types/elements';
import { DurationType, VoiceNumber } from '../types/theory';
import { MUSIC_CHORD_NODE, MUSIC_NOTE_NODE } from '../utils/consts';

// Matches the epsilon BeamsBuilder#scan already uses for beat-offset window
// comparisons — floating-point drift (e.g. from a 1/3 triplet fraction) means
// two voices' otherwise-identical beat offsets can differ by a hair.
const BEAT_OFFSET_EPSILON = 1e-9;

export type VoiceCombineInput = {
  elements: readonly NoteChordOrRestElementType[];
  beatOffsets: readonly number[];
  tupletsByIndex: ReadonlyMap<number, TupletElementType[]>;
  arpeggioRunIndices: ReadonlySet<number>;
  arpeggioTargetIndices: ReadonlySet<number>;
};

export type CombinedGroupMember = {
  voiceNumber: VoiceNumber;
  index: number;
  element: NoteOrChordElementType;
};

export type CombinedGroup = {
  beatOffset: number;
  duration: DurationType;
  members: CombinedGroupMember[];
  tones: ChordNote[];
};

type Candidate = {
  voiceNumber: VoiceNumber;
  index: number;
  element: NoteOrChordElementType;
  beatOffset: number;
};

/**
 * A note/chord is combine-eligible only when every one of these is absent —
 * excluded from combining entirely, not merely "must match" — since a
 * tie/slur/arpeggio/trill/grace attached to one voice's note has no
 * unambiguous meaning once merged and un-merged downstream.
 */
function isCombineEligible(voice: VoiceCombineInput, index: number): boolean {
  if (voice.tupletsByIndex.has(index)) {
    return false;
  }
  if (
    voice.arpeggioRunIndices.has(index) ||
    voice.arpeggioTargetIndices.has(index)
  ) {
    return false;
  }
  const element = voice.elements[index] as NoteOrChordElementType;
  return (
    element.tie === null &&
    element.slur === null &&
    element.arpeggio === null &&
    element.arpeggioFor === null &&
    element.arpeggioHairpin === null &&
    element.arpeggiate === null &&
    element.trill === false &&
    element.grace === null &&
    element.trillFinish === null
  );
}

// duration/articulation/dynamic/crescendo/decrescendo must all match — pitch
// content is deliberately excluded (that's what gets unioned into the
// combined chord's tone set).
function combineKey(element: NoteOrChordElementType): string {
  return JSON.stringify([
    element.duration,
    element.articulation,
    element.dynamic,
    element.crescendo,
    element.decrescendo,
  ]);
}

function tonesOf(element: NoteOrChordElementType): ChordNote[] {
  if (element.nodeName === MUSIC_NOTE_NODE) {
    const note = element as NoteElementType;
    return [{ value: note.note, octave: note.octave, duration: note.duration }];
  }
  return (element as ChordElementType).notes;
}

function dedupeTones(tones: readonly ChordNote[]): ChordNote[] {
  const seen = new Set<string>();
  const result: ChordNote[] = [];
  for (const tone of tones) {
    const key = `${tone.value}${tone.octave ?? ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(tone);
    }
  }
  return result;
}

/**
 * Detects rhythmically-identical notes/chords across 2-3 voices at the same
 * beat that may combine onto one shared, pitch-driven stem — real engraving
 * practice for parts in rhythmic unison with matching articulation/dynamics.
 * Rests never combine (see voiceRestRules.ts's separate shared-rest
 * detection). Returns one CombinedGroup per beat-offset column where 2 or
 * more voices' candidates match; a beat-offset column where only one voice
 * has an eligible candidate (or none match each other) produces no group.
 */
export function detectCombinableGroups(
  voices: ReadonlyMap<VoiceNumber, VoiceCombineInput>
): CombinedGroup[] {
  const candidates: Candidate[] = [];
  for (const [voiceNumber, voice] of voices) {
    for (let index = 0; index < voice.elements.length; index++) {
      const element = voice.elements[index];
      if (
        element.nodeName !== MUSIC_NOTE_NODE &&
        element.nodeName !== MUSIC_CHORD_NODE
      ) {
        continue; // rests never combine
      }
      if (!isCombineEligible(voice, index)) {
        continue;
      }
      candidates.push({
        voiceNumber,
        index,
        element: element as NoteOrChordElementType,
        beatOffset: voice.beatOffsets[index],
      });
    }
  }

  // Cluster candidates by beat offset (within epsilon).
  const columns: Candidate[][] = [];
  for (const candidate of candidates) {
    const column = columns.find(
      (col) =>
        Math.abs(col[0].beatOffset - candidate.beatOffset) < BEAT_OFFSET_EPSILON
    );
    if (column) {
      column.push(candidate);
    } else {
      columns.push([candidate]);
    }
  }

  const groups: CombinedGroup[] = [];
  for (const column of columns) {
    // Group this column's candidates by combine-key; each key-group with
    // >=2 members (necessarily from different voices, since one voice
    // contributes at most one candidate per beat offset) becomes a
    // CombinedGroup.
    const byKey = new Map<string, Candidate[]>();
    for (const candidate of column) {
      const key = combineKey(candidate.element);
      const bucket = byKey.get(key);
      if (bucket) {
        bucket.push(candidate);
      } else {
        byKey.set(key, [candidate]);
      }
    }
    for (const bucket of byKey.values()) {
      if (bucket.length < 2) {
        continue;
      }
      groups.push({
        beatOffset: bucket[0].beatOffset,
        duration: bucket[0].element.duration,
        members: bucket.map((c) => ({
          voiceNumber: c.voiceNumber,
          index: c.index,
          element: c.element,
        })),
        tones: dedupeTones(bucket.flatMap((c) => tonesOf(c.element))),
      });
    }
  }

  return groups;
}
