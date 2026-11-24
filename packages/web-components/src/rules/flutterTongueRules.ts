import type {
  NoteChordOrRestElementType,
  NoteOrChordElementType,
  TieValue,
} from '../types/elements';
import type { TremoloLabel } from '../types/theory';
import { FLUTTER_TONGUE_LABELS, MUSIC_REST_NODE } from '../utils/consts';

export type FlutterEntry = {
  tremolo: boolean;
  label: TremoloLabel | null;
  tie: TieValue | null;
};

/** A note, chord or rest as the passage walk reads it. */
export function flutterEntryOf(
  element: NoteChordOrRestElementType
): FlutterEntry {
  if (element.nodeName === MUSIC_REST_NODE) {
    return { tremolo: false, label: null, tie: null };
  }
  const noteOrChord = element as NoteOrChordElementType;
  return {
    tremolo: noteOrChord.tremolo !== null,
    label: noteOrChord.tremoloLabel,
    tie: noteOrChord.tie,
  };
}

export type FlutterResolution = {
  /** Tremolo entries inside a flutter-tongue passage. */
  flutterTongued: ReadonlySet<number>;
  /** Plain notes tied in from a flutter-tongued note with no `ord.` label. */
  missingCancels: number[];
  /** Whether a passage is still open after the last entry. */
  openAtEnd: boolean;
};

/**
 * Walks one voice's entries in order. A `flz.` / `flt.` / `frull.` label
 * opens a passage, and any other label closes it. Inside a passage every
 * tremolo is flutter-tongued; plain notes are ordinary and leave it open.
 * A flutter-tongued note tied into a plain note needs `ord.`, `nat.` or
 * `norm.` on that note, since nothing else shows the sound changing.
 */
export function resolveFlutterPassages(
  entries: readonly FlutterEntry[],
  openAtStart: boolean
): FlutterResolution {
  const flutterTongued = new Set<number>();
  const missingCancels: number[] = [];
  let open = openAtStart;
  entries.forEach((entry, i) => {
    if (entry.label !== null) {
      open = FLUTTER_TONGUE_LABELS.includes(entry.label);
    }
    if (!open) {
      return;
    }
    if (entry.tremolo) {
      flutterTongued.add(i);
    } else if (entry.tie === 'end' && flutterTongued.has(i - 1)) {
      missingCancels.push(i);
    }
  });
  return { flutterTongued, missingCancels, openAtEnd: open };
}

/** Warning text for plain notes tied in from flutter-tonguing. */
export function missingFlutterCancelWarning(where: string): string {
  return `${where}: a flutter-tongued note is tied into an ordinary note; add tremolo-label="ord" (or "nat" / "norm") to it`;
}
