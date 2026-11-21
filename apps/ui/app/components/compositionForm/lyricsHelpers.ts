import type {
  CompositionStructure,
  LyricVerse,
  NormalizedStaff,
} from './types';

// Lyrics for a vocal staff. Mirrors the library's staffVocal.ts: text splits
// on spaces into words and on `-` into syllables, a trailing `_` marks a
// melisma, and each syllable sits under the next sung entry — a note or chord
// (a chord once), skipping a tie's continuation, in voice then entry order.

export type LyricSyllable = {
  text: string;
  isMelisma: boolean;
  isHyphenated: boolean;
};

export function parseLyricSyllables(text: string): LyricSyllable[] {
  const syllables: LyricSyllable[] = [];
  for (const word of text.split(/\s+/)) {
    if (!word) {
      continue;
    }
    const parts = word.split('-');
    parts.forEach((part, i) => {
      if (!part) {
        return;
      }
      const isMelisma = part.endsWith('_');
      const syllable = isMelisma ? part.slice(0, -1) : part;
      if (syllable) {
        syllables.push({
          text: syllable,
          isMelisma,
          isHyphenated: i < parts.length - 1,
        });
      }
    });
  }
  return syllables;
}

export function sungEntryCount(
  structure: CompositionStructure,
  staff: NormalizedStaff
): number {
  const tieEnds = new Set(
    Object.values(structure.connectorsById)
      .filter((connector) => connector.kind === 'tie')
      .map((connector) => connector.endEntryId)
  );
  return staff.voiceOrder
    .flatMap((voiceId) => staff.voicesById[voiceId].entryIds)
    .filter((id) => {
      const entry = structure.entriesById[id];
      return (
        (entry?.type === 'note' || entry?.type === 'chord') && !tieEnds.has(id)
      );
    }).length;
}

// Replaces one measure's vocal staff's verses: sorted by number, blank ones
// dropped. The same structure when nothing changes.
export function setStaffLyrics(
  structure: CompositionStructure,
  staffId: string,
  lyrics: LyricVerse[]
): CompositionStructure {
  const staff = structure.stavesById[staffId];
  if (staff?.type !== 'vocal') {
    return structure;
  }
  const next = lyrics
    .filter((verse) => verse.text.trim() !== '')
    .map((verse) => ({ verse: verse.verse, text: verse.text.trim() }))
    .sort((a, b) => a.verse - b.verse);
  if (JSON.stringify(next) === JSON.stringify(staff.lyrics ?? [])) {
    return structure;
  }
  return {
    ...structure,
    stavesById: {
      ...structure.stavesById,
      [staffId]: { ...staff, lyrics: next },
    },
  };
}

// Several measures' verses joined into one measure's, verse by verse, in
// order. Rebar can't re-slice text by beat, so a rewritten passage keeps all
// its words on its first bar for the author to move.
export function joinLyrics(
  perMeasure: (LyricVerse[] | undefined)[]
): LyricVerse[] {
  const byVerse = new Map<number, string[]>();
  for (const verses of perMeasure) {
    for (const { verse, text } of verses ?? []) {
      byVerse.set(verse, [...(byVerse.get(verse) ?? []), text]);
    }
  }
  return [...byVerse.entries()]
    .sort(([a], [b]) => a - b)
    .map(([verse, texts]) => ({ verse, text: texts.join(' ') }));
}
