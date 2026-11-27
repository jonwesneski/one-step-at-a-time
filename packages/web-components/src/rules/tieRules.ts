import type { TieValue } from '../types/elements';

/** Whether a `tie` value ties on to the next entry. */
export const tiesOn = (tie: TieValue | null | undefined): boolean =>
  tie === 'start' || tie === 'continue';

/** Whether a `tie` value is tied into from the previous entry. */
export const tiedInto = (tie: TieValue | null | undefined): boolean =>
  tie === 'end' || tie === 'continue';

/** What a tie's two ends must share; null when an entry has none to compare (a whole chord). */
export type TiePitch =
  | {
      kind: 'pitch';
      note: string;
      octave: number | null;
      quarterTone: string | null;
    }
  | { kind: 'placement'; placement: string }
  | { kind: 'fret'; string: number; fret: number | string };

export const tiePitchesMatch = (
  a: TiePitch | null,
  b: TiePitch | null
): boolean => {
  if (a === null || b === null || a.kind !== b.kind) {
    return false;
  }
  if (a.kind === 'pitch' && b.kind === 'pitch') {
    return (
      a.note === b.note &&
      a.quarterTone === b.quarterTone &&
      (a.octave === null || b.octave === null || a.octave === b.octave)
    );
  }
  if (a.kind === 'placement' && b.kind === 'placement') {
    return a.placement === b.placement;
  }
  if (a.kind === 'fret' && b.kind === 'fret') {
    return a.string === b.string && a.fret === b.fret;
  }
  return false;
};

/**
 * Which open tie start an end closes: the most recent one of its pitch, since
 * ties never nest. With none, the most recent start no later end matches, so a
 * mismatch warns once and leaves the other tones paired; failing that, the most recent.
 */
export const matchTieStart = (
  open: readonly (TiePitch | null)[],
  end: TiePitch | null,
  laterEnds: readonly (TiePitch | null)[] = []
): number => {
  for (let index = open.length - 1; index >= 0; index--) {
    if (tiePitchesMatch(open[index], end)) {
      return index;
    }
  }
  for (let index = open.length - 1; index >= 0; index--) {
    if (!laterEnds.some((later) => tiePitchesMatch(open[index], later))) {
      return index;
    }
  }
  return open.length - 1;
};
