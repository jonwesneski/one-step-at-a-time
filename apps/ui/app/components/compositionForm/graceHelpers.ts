import type { GraceGroup } from './types';

// The eight `grace-*` attributes as `<music-note>` / `<music-chord>` expects
// them: four comma-joined lists aligned by index (empty slot = no value) plus
// four scalars. Mirrors the setters in packages/web-components' note.ts —
// `value.join(',')` and `value.map(v => v ?? '').join(',')`. A trailing run of
// empty slots is trimmed so `["C", null]` serializes to `"C"`, matching what
// the library's parser round-trips.
export type GraceAttributes = {
  grace?: string;
  'grace-octave'?: string;
  'grace-articulation'?: string;
  'grace-notehead'?: string;
  'grace-type'?: GraceGroup['type'];
  'grace-duration'?: GraceGroup['duration'];
  'grace-slur'?: GraceGroup['slur'];
  'grace-dynamic'?: GraceGroup['dynamic'];
};

export function joinAligned(
  values: readonly (string | number | null | undefined)[] | undefined,
  length: number
): string | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }
  const slots = Array.from({ length }, (_, i) => {
    const v = values[i];
    return v === null || v === undefined ? '' : String(v);
  });
  while (slots.length > 0 && slots[slots.length - 1] === '') {
    slots.pop();
  }
  return slots.length > 0 ? slots.join(',') : undefined;
}

export function serializeGrace(
  grace: GraceGroup | null | undefined
): GraceAttributes {
  if (!grace || grace.notes.length === 0) {
    return {};
  }
  return {
    grace: grace.notes.join(','),
    'grace-octave': joinAligned(grace.octaves, grace.notes.length),
    'grace-articulation': joinAligned(grace.articulations, grace.notes.length),
    'grace-notehead': joinAligned(grace.noteheads, grace.notes.length),
    'grace-type': grace.type,
    'grace-duration': grace.duration,
    'grace-slur': grace.slur,
    'grace-dynamic': grace.dynamic,
  };
}
