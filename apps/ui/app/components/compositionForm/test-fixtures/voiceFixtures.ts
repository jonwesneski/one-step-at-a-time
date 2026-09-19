import type { NormalizedStaff, NormalizedVoice } from '../types';

// Shared fixture builders for a NormalizedStaff's voiceOrder/voicesById shape
// — every colocated .test.ts file that builds its own CompositionStructure
// fixture uses these instead of hand-rolling the nested shape inline.

export function buildVoice(id: string, entryIds: string[]): NormalizedVoice {
  return { id, entryIds };
}

// A staff with exactly one voice — the shape every staff has today, since
// nothing in the app's UI can create a second voice yet.
export function buildSingleVoiceStaff(
  id: string,
  entryIds: string[],
  overrides?: Partial<Pick<NormalizedStaff, 'type' | 'group' | 'groupId'>>
): NormalizedStaff {
  const voiceId = `${id}-v1`;
  return {
    id,
    type: 'treble',
    voiceOrder: [voiceId],
    voicesById: { [voiceId]: buildVoice(voiceId, entryIds) },
    group: null,
    groupId: null,
    ...overrides,
  };
}

// A staff with 2-3 voices, each with its own entry stream — for tests that
// exercise real voice-scoping even though no UI can produce this shape yet.
export function buildMultiVoiceStaff(
  id: string,
  voiceEntryIds: string[][],
  overrides?: Partial<Pick<NormalizedStaff, 'type' | 'group' | 'groupId'>>
): NormalizedStaff {
  const voices = voiceEntryIds.map((entryIds, i) =>
    buildVoice(`${id}-v${i + 1}`, entryIds)
  );
  return {
    id,
    type: 'treble',
    voiceOrder: voices.map((v) => v.id),
    voicesById: Object.fromEntries(voices.map((v) => [v.id, v])),
    group: null,
    groupId: null,
    ...overrides,
  };
}
