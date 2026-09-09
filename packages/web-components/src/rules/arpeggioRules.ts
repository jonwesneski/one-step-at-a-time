import type {
  NoteElementType,
  NoteOrChordElementType,
} from '../types/elements';
import type { ArpeggioType, HairpinKind, Note, Octave } from '../types/theory';
import { MUSIC_CHORD } from '../utils/consts';
import {
  ARPEGGIO_FOOTPRINT_PX,
  ARPEGGIO_FOOTPRINT_WITH_ACCIDENTAL_PX,
  ARPEGGIO_HAIRPIN_FOOTPRINT_PX,
} from '../utils/notationDimensions';
import { noteSemitoneMap } from './theoryConsts';

// ─── Cross-staff (grand staff) unbroken arpeggio ─────────────────────────────
//
// Pure resolution/validation, kept out of measure.ts so it is unit-testable
// (jsdom's ResizeObserver polyfill never fires, so measure.ts's real render
// path only runs in browser tests). Mirrors resolveStaffGroups.
//
// A cross-staff span is only ever formed by an explicit `arpeggio-for`. Two
// unlinked `arpeggio` marks — even a same-index pair on a grand staff — stay
// as independent per-staff signs (the "broken" grand-staff form), which is
// otherwise impossible to express.

export type ArpeggioEntry = {
  /** Ordinal of the staff this element sits in, within the measure. */
  staffIndex: number;
  /** Flattened note/chord index within that staff. */
  entryIndex: number;
  /** The element's own `id`, or null. */
  id: string | null;
  arpeggio: ArpeggioType | null;
  /** `arpeggio-for` — the `id` of the upper element to continue from. */
  arpeggioFor: string | null;
};

export type ArpeggioSpan = {
  upper: { staffIndex: number; entryIndex: number };
  lower: { staffIndex: number; entryIndex: number };
  /** The variant to draw — never `non-arpeggiate` (that stays a per-staff sign). */
  arpeggio: Exclude<ArpeggioType, 'non-arpeggiate'>;
};

export type ArpeggioSpanResolution = {
  spans: ArpeggioSpan[];
  warnings: string[];
};

const isWaveVariant = (
  value: ArpeggioType | null
): value is Exclude<ArpeggioType, 'non-arpeggiate'> =>
  value === 'up' || value === 'up-arrow' || value === 'down';

/**
 * Pairs the two ends of each unbroken cross-staff arpeggio.
 *
 * A pair is formed only by an explicit `arpeggio-for="<id>"` on the lower
 * element, matching the element whose `id` it names when that element is in a
 * different staff. If both ends carry `arpeggio` and disagree, the lower
 * element's value wins (with a warning). Two `arpeggio` marks with no
 * `arpeggio-for` between them are never joined — they stay as separate
 * per-staff signs (the "broken" form), whether or not the measure is a grand
 * staff.
 *
 * Each element is an endpoint of at most one span; an `arpeggio-for` that
 * references an element already paired (by an earlier reference, or as the
 * upper end of another span) is rejected so connectors never branch from a
 * shared notehead.
 *
 * Any failure produces a warning and no span — the two elements then keep their
 * own per-staff signs.
 */
export function resolveArpeggioSpans(
  entries: ArpeggioEntry[]
): ArpeggioSpanResolution {
  const spans: ArpeggioSpan[] = [];
  const warnings: string[] = [];
  const byId = new Map<string, ArpeggioEntry>();
  for (const entry of entries) {
    if (entry.id !== null) {
      byId.set(entry.id, entry);
    }
  }
  const paired = new Set<ArpeggioEntry>();

  for (const lower of entries) {
    if (lower.arpeggioFor === null) {
      continue;
    }
    const upper = byId.get(lower.arpeggioFor);
    if (!upper) {
      warnings.push(
        `arpeggio-for="${lower.arpeggioFor}" matches no element; drawing per-staff signs instead`
      );
      continue;
    }
    if (paired.has(upper) || paired.has(lower)) {
      warnings.push(
        `arpeggio-for="${lower.arpeggioFor}" reuses an element already paired in another cross-staff arpeggio; drawing per-staff signs instead`
      );
      continue;
    }
    if (upper.staffIndex === lower.staffIndex) {
      warnings.push(
        `arpeggio-for="${lower.arpeggioFor}" points to an element on the same staff; a cross-staff arpeggio spans two staves`
      );
      continue;
    }
    const variant = isWaveVariant(lower.arpeggio)
      ? lower.arpeggio
      : isWaveVariant(upper.arpeggio)
      ? upper.arpeggio
      : null;
    if (variant === null) {
      warnings.push(
        `arpeggio-for="${lower.arpeggioFor}" pairing has no wave variant on either end; drawing per-staff signs instead`
      );
      continue;
    }
    if (
      isWaveVariant(lower.arpeggio) &&
      isWaveVariant(upper.arpeggio) &&
      lower.arpeggio !== upper.arpeggio
    ) {
      warnings.push(
        `cross-staff arpeggio ends disagree ("${upper.arpeggio}" vs "${lower.arpeggio}"); using "${lower.arpeggio}"`
      );
    }
    const [top, bottom] =
      upper.staffIndex < lower.staffIndex ? [upper, lower] : [lower, upper];
    spans.push({
      upper: { staffIndex: top.staffIndex, entryIndex: top.entryIndex },
      lower: { staffIndex: bottom.staffIndex, entryIndex: bottom.entryIndex },
      arpeggio: variant,
    });
    paired.add(upper);
    paired.add(lower);
  }

  return { spans, warnings };
}

/**
 * Leftward horizontal footprint (px) the staff reserves for an arpeggio sign,
 * in front of the element's own accidental footprint (and behind any grace
 * group). When the element shows an accidental the sign clears the whole
 * accidental column, so the reservation is larger and is added on top of the
 * accidental footprint the caller computes separately. Every variant reserves
 * the same width — the arrowhead extends only vertically, and the
 * non-arpeggiate bracket is the wave width by construction.
 */
export function computeArpeggioFootprintWidth(
  arpeggio: ArpeggioType | null,
  hasShownAccidental: boolean
): number {
  if (arpeggio === null) {
    return 0;
  }
  return hasShownAccidental
    ? ARPEGGIO_FOOTPRINT_WITH_ACCIDENTAL_PX
    : ARPEGGIO_FOOTPRINT_PX;
}

/**
 * Extra leftward footprint (px) for the vertical dynamic-change hairpin, stacked
 * in front of the arpeggio sign's own footprint. Zero when there is no hairpin.
 */
export function computeArpeggioHairpinFootprintWidth(
  arpeggioHairpin: HairpinKind | null
): number {
  return arpeggioHairpin === null ? 0 : ARPEGGIO_HAIRPIN_FOOTPRINT_PX;
}

// ─── Written-out arpeggio (`<music-arpeggio>`: consecutive pitches tied to a chord) ───
//
// Distinct from the wavy-line sign above: this pairs each note of a beamed run
// with its matching-pitch tone of the following chord so the staff can draw the
// fan of ties. Pure — reads only `note`/`octave` attributes and `chord.notes`.

export type ArpeggioTiePairing = {
  runNote: NoteElementType;
  target: NoteOrChordElementType;
  /** Index into `chord.notes` / `staffYCoordinates`; 0 for a single-note target. */
  targetToneIndex: number;
  variant: 'run-to-chord' | 'laissez-vibrer';
};

type Tone = { pitchClass: number; octave: Octave | null; index: number };

const pitchClassOf = (note: string | null): number | null => {
  if (note === null) {
    return null;
  }
  const value = noteSemitoneMap.get(note as Note);
  return value === undefined ? null : value;
};

const targetTones = (target: NoteOrChordElementType): Tone[] => {
  if (target.tagName.toLowerCase() === MUSIC_CHORD) {
    return (target as { notes: { value: Note; octave: Octave | null }[] }).notes
      .map((tone, index) => ({
        pitchClass: pitchClassOf(tone.value),
        octave: tone.octave,
        index,
      }))
      .filter((tone): tone is Tone => tone.pitchClass !== null);
  }
  const note = target as NoteElementType;
  const pitchClass = pitchClassOf(note.getAttribute('note'));
  return pitchClass === null
    ? []
    : [{ pitchClass, octave: note.octave, index: 0 }];
};

/**
 * Pairs each `<music-arpeggio>` run note with its matching-pitch tone of the
 * target chord. Matching is by pitch class (enharmonic-aware), with octave as a
 * tiebreaker when both are known. A run note that matches no tone becomes a
 * laissez-vibrer tie (`unmatched: 'lv'`) or is dropped (`'skip'`). A run note
 * with an authored `tie` attribute is left to the normal connector path.
 */
export function resolveArpeggioTiePairings(
  runNotes: readonly NoteElementType[],
  target: NoteOrChordElementType,
  unmatched: 'lv' | 'skip'
): { pairings: ArpeggioTiePairing[]; warnings: string[] } {
  const pairings: ArpeggioTiePairing[] = [];
  const warnings: string[] = [];
  const tones = targetTones(target);
  const usedToneIndices = new Set<number>();

  for (const runNote of runNotes) {
    if (runNote.getAttribute('tie') !== null) {
      warnings.push(
        `[music-arpeggio] run note <music-note note="${runNote.getAttribute(
          'note'
        )}"> has an authored tie; skipping auto-tie for it`
      );
      continue;
    }
    const runPitchClass = pitchClassOf(runNote.getAttribute('note'));
    const runOctave = runNote.octave;

    const candidates = tones.filter(
      (tone) => tone.pitchClass === runPitchClass
    );
    let chosen = candidates.find((tone) => !usedToneIndices.has(tone.index));
    if (chosen === undefined && candidates.length > 0) {
      // All matching tones already used — reuse the closest by octave.
      chosen = candidates[candidates.length - 1];
    }
    if (candidates.length > 1 && runOctave !== null) {
      const byOctave = candidates
        .filter(
          (tone) => tone.octave !== null && !usedToneIndices.has(tone.index)
        )
        .sort(
          (a, b) =>
            Math.abs((a.octave as number) - runOctave) -
            Math.abs((b.octave as number) - runOctave)
        );
      if (byOctave.length > 0) {
        chosen = byOctave[0];
      }
    }

    if (chosen === undefined) {
      warnings.push(
        `[music-arpeggio] run note <music-note note="${runNote.getAttribute(
          'note'
        )}"> has no matching tone in the target chord`
      );
      if (unmatched === 'lv') {
        pairings.push({
          runNote,
          target,
          targetToneIndex: 0,
          variant: 'laissez-vibrer',
        });
      }
      continue;
    }

    const toneIndex = chosen.index;
    if (usedToneIndices.has(toneIndex)) {
      warnings.push(
        `[music-arpeggio] more than one run note ties to the same chord tone; keeping the last`
      );
      // Drop the earlier pairing to that tone.
      const earlier = pairings.findIndex(
        (p) => p.variant === 'run-to-chord' && p.targetToneIndex === toneIndex
      );
      if (earlier >= 0) {
        pairings.splice(earlier, 1);
      }
    }
    usedToneIndices.add(toneIndex);
    pairings.push({
      runNote,
      target,
      targetToneIndex: chosen.index,
      variant: 'run-to-chord',
    });
  }

  return { pairings, warnings };
}
