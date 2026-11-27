import type {
  ArpeggioType,
  ArticulationType,
  BaseDurationType,
  ConnectorRole,
  ConventionalAccidentalType,
  DurationType,
  DynamicMarking,
  HairpinKind,
  Note,
  NoteheadType,
  TieStyle,
  TremoloLabel,
  TremoloValue,
  TrillContinuationMode,
  TrillFinishSlur,
  TrillLineMode,
} from '@one-step-at-a-time/web-components';
import {
  durationToBase,
  TREMOLO_VALUES,
} from '@one-step-at-a-time/web-components';
import { joinAligned } from './graceHelpers';
import type {
  ChordEntry,
  ChordNote,
  CompositionStructure,
  NoteEntry,
} from './types';

// Note/chord markings beyond the basics (noteheads, single-note tremolo,
// trills, the arpeggio sign, reminders): serialised to their `<music-note>` /
// `<music-chord>` attributes, and sanitised so the editor never stores a
// combination the library warns about and ignores. The rules mirror
// packages/web-components' rules/tremoloRules.ts, rules/noteheadRules.ts and
// rules/arpeggioRules.ts; this app is the only writer, so it only has to keep
// its own data well formed.

type MarkedEntry = NoteEntry | ChordEntry;

const FLAG_COUNTS: Partial<Record<BaseDurationType, number>> = {
  eighth: 1,
  sixteenth: 2,
  thirtysecond: 3,
  sixtyfourth: 4,
  hundredtwentyeighth: 5,
};

// Tails or beams a value carries: a tremolo's strokes add to them.
function flagCount(duration: DurationType): number {
  return FLAG_COUNTS[durationToBase[duration]] ?? 0;
}

// No note value is shorter than a 128th (five beams).
const MAX_BEAMS = 5;
const UNMEASURED_BEAMS = 3;

function strokesFor(value: TremoloValue, duration: DurationType): number {
  return value === 'unmeasured'
    ? Math.max(1, UNMEASURED_BEAMS - flagCount(duration))
    : value;
}

export function allowedTremoloValues(duration: DurationType): TremoloValue[] {
  return TREMOLO_VALUES.filter(
    (value) => strokesFor(value, duration) + flagCount(duration) <= MAX_BEAMS
  );
}

export function isTriangle(notehead: NoteheadType | null | undefined): boolean {
  return notehead === 'triangle-up' || notehead === 'triangle-down';
}

export function isRolledArpeggio(
  arpeggio: ArpeggioType | null | undefined
): boolean {
  return arpeggio === 'up' || arpeggio === 'up-arrow' || arpeggio === 'down';
}

const REPEATABLE_LENGTHS = new Set([
  'staccato',
  'staccatissimo',
  'tenuto',
  'portato',
  'tenuto-staccatissimo',
]);

// `articulation-repeat` repeats a length mark; an accent or marcato prefix
// stays single.
export function hasRepeatableLength(
  articulation: ArticulationType | null | undefined
): boolean {
  const length = articulation?.replace(/^(accent|marcato)-?/, '') ?? '';
  return REPEATABLE_LENGTHS.has(length);
}

function isMeasuredTremolo(value: TremoloValue | null | undefined): boolean {
  return value !== null && value !== undefined && value !== 'unmeasured';
}

function withoutTriangle(
  notehead: NoteheadType | null | undefined
): NoteheadType | null {
  return isTriangle(notehead) ? null : notehead ?? null;
}

// Clears whatever another edit has left meaningless (a reminder with no
// dynamic, strokes a shorter value can no longer carry, …). Returns the same
// object when nothing changes.
export function sanitizeMarkings<T extends MarkedEntry>(entry: T): T {
  const next: T = { ...entry };
  let changed = false;
  const clear = <K extends keyof T>(key: K, value: T[K]) => {
    next[key] = value;
    changed = true;
  };

  if (next.dynamicReminder && !next.dynamic) {
    clear('dynamicReminder', false);
  }
  if (
    next.tremolo !== null &&
    next.tremolo !== undefined &&
    !allowedTremoloValues(next.duration).includes(next.tremolo)
  ) {
    clear('tremolo', null);
  }
  if (next.tremoloTuplet && !isMeasuredTremolo(next.tremolo)) {
    clear('tremoloTuplet', null);
  }
  if (
    next.articulationRepeat &&
    (!isMeasuredTremolo(next.tremolo) ||
      !hasRepeatableLength(next.articulation))
  ) {
    clear('articulationRepeat', false);
  }
  if (
    !isRolledArpeggio(next.arpeggio) &&
    (next.arpeggioHairpin || next.arpeggioHairpinFrom || next.arpeggioHairpinTo)
  ) {
    clear('arpeggioHairpin', null);
    clear('arpeggioHairpinFrom', null);
    clear('arpeggioHairpinTo', null);
  }
  // A triangle is one undefined extreme pitch: never a chord or chord tone,
  // never a grace note, and never inside a cross-staff beam.
  if (
    isTriangle(next.notehead) &&
    (next.type === 'chord' || next.beamGroupId)
  ) {
    clear('notehead', null);
  }
  if (next.type === 'chord' && next.notes.some((t) => isTriangle(t.notehead))) {
    (next as ChordEntry).notes = next.notes.map((tone: ChordNote) =>
      isTriangle(tone.notehead) ? { ...tone, notehead: null } : tone
    );
    changed = true;
  }
  if (next.grace?.noteheads?.some(isTriangle)) {
    clear('grace', {
      ...next.grace,
      noteheads: next.grace.noteheads.map(withoutTriangle),
    });
  }
  const trill = next.trill;
  if (trill && trill.note && trill.accidental) {
    clear('trill', { ...trill, accidental: null });
  }
  if (next.trill?.finish && next.trill.finish.notes.length === 0) {
    clear('trill', { ...next.trill, finish: null });
  }
  return changed ? next : entry;
}

export type MarkingAttributes = {
  notehead?: NoteheadType;
  'dynamic-reminder'?: boolean;
  'accidental-reminder'?: boolean;
  tremolo?: TremoloValue;
  'tremolo-tuplet'?: number;
  'tremolo-label'?: TremoloLabel;
  'articulation-repeat'?: boolean;
  trill?: boolean;
  'trill-line'?: TrillLineMode;
  'trill-stop'?: boolean;
  'trill-accidental'?: ConventionalAccidentalType;
  'trill-note'?: Note;
  'trill-continuation'?: TrillContinuationMode;
  'trill-finish'?: string;
  'trill-finish-octave'?: string;
  'trill-finish-slur'?: TrillFinishSlur;
  arpeggio?: ArpeggioType;
  'arpeggio-hairpin'?: HairpinKind;
  'arpeggio-hairpin-from'?: DynamicMarking;
  'arpeggio-hairpin-to'?: DynamicMarking;
  arpeggiate?: ConnectorRole;
  'arpeggio-for'?: string;
};

// `undefined` (never `false`/`null`) for an absent value, so React removes
// the attribute instead of writing `"false"`.
export function serializeMarkings(entry: MarkedEntry): MarkingAttributes {
  const trill = entry.trill;
  const finish = trill?.finish;
  return {
    notehead: entry.notehead ?? undefined,
    'dynamic-reminder': entry.dynamicReminder || undefined,
    'accidental-reminder': entry.accidentalReminder || undefined,
    tremolo: entry.tremolo ?? undefined,
    'tremolo-tuplet': entry.tremoloTuplet ?? undefined,
    'tremolo-label': entry.tremoloLabel ?? undefined,
    'articulation-repeat': entry.articulationRepeat || undefined,
    trill: trill ? true : undefined,
    'trill-line': trill?.line ?? undefined,
    'trill-stop': trill?.stop || undefined,
    'trill-accidental': trill?.accidental ?? undefined,
    'trill-note': trill?.note ?? undefined,
    'trill-continuation': trill?.continuation ?? undefined,
    'trill-finish': finish ? finish.notes.join(',') : undefined,
    'trill-finish-octave': finish
      ? joinAligned(finish.octaves, finish.notes.length)
      : undefined,
    'trill-finish-slur': finish?.slur ?? undefined,
    arpeggio: entry.arpeggio ?? undefined,
    'arpeggio-hairpin': entry.arpeggioHairpin ?? undefined,
    'arpeggio-hairpin-from': entry.arpeggioHairpinFrom ?? undefined,
    'arpeggio-hairpin-to': entry.arpeggioHairpinTo ?? undefined,
    arpeggiate: entry.arpeggiate ?? undefined,
    'arpeggio-for': entry.arpeggioWithEntryId ?? undefined,
  };
}

// Per-tone attributes for a chord's child `<music-note>`s.
export function serializeChordTone(tone: ChordNote): {
  notehead?: NoteheadType;
  'accidental-reminder'?: boolean;
} {
  return {
    notehead: tone.notehead ?? undefined,
    'accidental-reminder': tone.accidentalReminder || undefined,
  };
}

// sanitizeMarkings over every note and chord; the same structure when none
// changes. Part of pruneInvalidNotationLinks, since a move or re-time (a
// shorter value, a new beam group) can invalidate a marking.
export function sanitizeEntryMarkings(
  structure: CompositionStructure
): CompositionStructure {
  let entriesById: CompositionStructure['entriesById'] | null = null;
  for (const entry of Object.values(structure.entriesById)) {
    if (entry.type !== 'note' && entry.type !== 'chord') {
      continue;
    }
    const sanitized = sanitizeMarkings(entry);
    if (sanitized !== entry) {
      entriesById ??= { ...structure.entriesById };
      entriesById[entry.id] = sanitized;
    }
  }
  return entriesById ? { ...structure, entriesById } : structure;
}

// `tie="laissez-vibrer"` and its label/style. The caller gives a real tie role
// precedence, though the editor never stores both on one entry.
export function serializeLaissezVibrer(entry: MarkedEntry): {
  tie?: 'laissez-vibrer';
  'lv-label'?: boolean;
  'tie-style'?: TieStyle;
} {
  const lv = entry.laissezVibrer;
  if (!lv) {
    return {};
  }
  return {
    tie: 'laissez-vibrer',
    'lv-label': lv.label || undefined,
    'tie-style': lv.style ?? undefined,
  };
}
