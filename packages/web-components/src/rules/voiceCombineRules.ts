import {
  ChordElementType,
  ChordNote,
  NoteChordOrRestElementType,
  NoteElementType,
  NoteOrChordElementType,
  TupletElementType,
} from '../types/elements';
import { DurationType, VoiceNumber } from '../types/theory';
import { isChordNodeName, isNoteNodeName } from '../utils/consts';

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
  // `<music-tremolo>` members: each takes a share of the written value, so
  // no member can merge onto another voice's stem.
  tremoloMemberIndices: ReadonlySet<number>;
  // Staff Ys an element sounds, with its clef and chord voicing resolved.
  staffYsOf: (index: number) => readonly number[];
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

function hasOnlyNormalNoteheads(element: NoteOrChordElementType): boolean {
  if (isNoteNodeName(element.nodeName)) {
    return (element as NoteElementType).notehead === 'normal';
  }
  return (element as ChordElementType).toneNoteheads.every(
    (notehead) => notehead === 'normal'
  );
}

// A reminder belongs to one tone, and merged tones dedupe by pitch.
function hasAccidentalReminder(element: NoteOrChordElementType): boolean {
  return (
    element.accidentalReminder ||
    (isChordNodeName(element.nodeName) &&
      (element as ChordElementType).toneAccidentalReminders.some(Boolean))
  );
}

/**
 * Combine-eligible only when none of these is set: the synthetic chord
 * doesn't copy them, so they'd vanish (a reminder on a tone
 * included). A non-normal notehead is excluded too,
 * since merged tones dedupe by pitch.
 */
function isCombineEligible(voice: VoiceCombineInput, index: number): boolean {
  if (voice.tupletsByIndex.has(index)) {
    return false;
  }
  if (
    voice.arpeggioRunIndices.has(index) ||
    voice.arpeggioTargetIndices.has(index) ||
    voice.tremoloMemberIndices.has(index)
  ) {
    return false;
  }
  const element = voice.elements[index] as NoteOrChordElementType;
  if (!hasOnlyNormalNoteheads(element)) {
    return false;
  }
  return (
    element.tie === null &&
    element.slur === null &&
    element.arpeggio === null &&
    element.arpeggioFor === null &&
    element.arpeggioHairpin === null &&
    element.arpeggiate === null &&
    element.trill === false &&
    element.grace === null &&
    element.trillFinish === null &&
    element.glissando === null &&
    element.stress === null &&
    !element.dynamicShared &&
    !hasAccidentalReminder(element)
  );
}

// duration/articulation/dynamic/crescendo/decrescendo and the tremolo
// attributes must all match — pitch content is deliberately excluded (that's
// what gets unioned into the combined chord's tone set). Matching tremolos
// share one set of strokes, numeral and label.
function combineKey(element: NoteOrChordElementType): string {
  return JSON.stringify([
    element.duration,
    element.articulation,
    element.dynamic,
    element.crescendo,
    element.decrescendo,
    element.dynamicReminder,
    element.tremolo ?? null,
    element.tremoloTuplet ?? null,
    element.tremoloLabel ?? null,
    element.articulationRepeat ?? false,
  ]);
}

function tonesOf(element: NoteOrChordElementType): ChordNote[] {
  if (isNoteNodeName(element.nodeName)) {
    const note = element as NoteElementType;
    return [{ value: note.note, octave: note.octave }];
  }
  return (element as ChordElementType).notes;
}

type Sounding = {
  voiceNumber: VoiceNumber;
  beatOffset: number;
  staffYs: readonly number[];
};

// A member on the same staff position as another voice's note or chord on its
// beat, whether that one can combine or not, is a unison: it is laid out by
// rules/unisonRules.ts (shared head, or two heads) rather than merged into one
// chord, which would drop one of the parts or overlap the other's head.
function hasUnison(
  bucket: readonly Candidate[],
  sounding: readonly Sounding[],
  voices: ReadonlyMap<VoiceNumber, VoiceCombineInput>
): boolean {
  return bucket.some((candidate) => {
    const staffYs =
      voices.get(candidate.voiceNumber)?.staffYsOf(candidate.index) ?? [];
    return sounding.some(
      (other) =>
        other.voiceNumber !== candidate.voiceNumber &&
        Math.abs(other.beatOffset - candidate.beatOffset) <
          BEAT_OFFSET_EPSILON &&
        other.staffYs.some((staffY) => staffYs.includes(staffY))
    );
  });
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
 * beat that combine onto one pitch-driven stem: one CombinedGroup per beat
 * column where 2+ voices match. Rests never combine.
 */
export function detectCombinableGroups(
  voices: ReadonlyMap<VoiceNumber, VoiceCombineInput>
): CombinedGroup[] {
  const candidates: Candidate[] = [];
  const sounding: Sounding[] = [];
  for (const [voiceNumber, voice] of voices) {
    for (let index = 0; index < voice.elements.length; index++) {
      const element = voice.elements[index];
      if (
        !isNoteNodeName(element.nodeName) &&
        !isChordNodeName(element.nodeName)
      ) {
        continue; // rests never combine
      }
      sounding.push({
        voiceNumber,
        beatOffset: voice.beatOffsets[index],
        staffYs: voice.staffYsOf(index),
      });
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
      if (bucket.length < 2 || hasUnison(bucket, sounding, voices)) {
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

  // Columns (and therefore groups) are in candidate-discovery order
  // (voice 1, then 2, then 3), not beat order — a beat only voices 2/3
  // share (absent from voice 1) would otherwise land out of sequence,
  // handing the synthetic 'combined' track's sequential collision-floor
  // pass a non-monotonic beatOffset run.
  groups.sort((a, b) => a.beatOffset - b.beatOffset);
  return groups;
}
