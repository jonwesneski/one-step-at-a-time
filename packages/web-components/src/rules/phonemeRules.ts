import {
  PHONEME_ARROW_GAP_PX,
  PHONEME_ARROW_HEAD_LENGTH_PX,
  PHONEME_ARROW_MIN_PX,
  PHONEME_ASCENT_RATIO,
  PHONEME_FONT_SIZE_PX,
  PHONEME_GAP_PX,
  PHONEME_INK_GAP_PX,
  PHONEME_STAFF_GAP_PX,
} from '../utils/notationDimensions';
import { estimateTextWidthPx } from './techniqueTextRules';

/** One phoneme, and whether an arrow leads from it to the next. */
export type Phoneme = { text: string; arrowAfter: boolean };

// Parts and the separator after each: `,` alone, `>` or `→` with an arrow.
function partsOf(value: string): { text: string; arrowAfter: boolean }[] {
  const parts: { text: string; arrowAfter: boolean }[] = [];
  let text = '';
  for (const character of value) {
    if (character === ',' || character === '>' || character === '→') {
      parts.push({ text, arrowAfter: character !== ',' });
      text = '';
    } else {
      text += character;
    }
  }
  parts.push({ text, arrowAfter: false });
  return parts.map((part) => ({
    ...part,
    text: part.text.replace(/[[\]]/g, '').trim(),
  }));
}

/**
 * The phonemes of a `phonemes` value: `,` separates, `>` (or `→`) separates
 * and draws an arrow; a trailing `>` leads to the next note. Brackets in the
 * text are dropped (the drawing adds them), as are empty parts. Null when
 * none is left.
 */
export function parsePhonemes(value: string | null): Phoneme[] | null {
  if (value === null) {
    return null;
  }
  const phonemes = partsOf(value).filter((part) => part.text !== '');
  return phonemes.length === 0 ? null : phonemes;
}

/** What is wrong with a `phonemes` value; null when nothing. */
export function phonemesWarning(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const parts = partsOf(value);
  const empty = parts.some(
    (part, index) =>
      part.text === '' &&
      !(index === parts.length - 1 && parts[index - 1]?.arrowAfter)
  );
  if (parsePhonemes(value) === null) {
    return 'phonemes is empty; drawing none';
  }
  return empty ? `phonemes="${value}" has an empty part; dropping it` : null;
}

/** An entry of one voice, in order: its phonemes, or a rest. */
export type PhonemeEntry = {
  phonemes: readonly Phoneme[] | null;
  rest: boolean;
};

export type PhonemeRunItem = { entry: number; index: number };

/**
 * Phonemes joined by arrows, or one on its own: bracketed together. `end` is
 * how it ends: `closed` on a phoneme with no arrow out, `dangling` on an
 * arrow the next note or chord takes no phoneme for, `open` on an arrow out
 * of the last entry.
 */
export type PhonemeRun = {
  items: PhonemeRunItem[];
  end: 'closed' | 'dangling' | 'open';
};

/**
 * One voice's phoneme runs. A trailing arrow leads past rests to the next
 * note's or chord's first phoneme.
 */
export function resolvePhonemeRuns(
  entries: readonly PhonemeEntry[]
): PhonemeRun[] {
  const runs: PhonemeRun[] = [];
  let open: PhonemeRun | null = null;
  entries.forEach(({ phonemes, rest }, entry) => {
    if (phonemes === null) {
      if (open !== null && !rest) {
        open.end = 'dangling';
        open = null;
      }
      return;
    }
    phonemes.forEach((phoneme, index) => {
      if (open === null) {
        open = { items: [], end: 'closed' };
        runs.push(open);
      }
      open.items.push({ entry, index });
      if (!phoneme.arrowAfter) {
        open = null;
      }
    });
  });
  if (open !== null) {
    (open as PhonemeRun).end = 'open';
  }
  return runs;
}

/** A phoneme's estimated width (px), without brackets. */
export function phonemeWidthPx(text: string): number {
  return estimateTextWidthPx(text, PHONEME_FONT_SIZE_PX);
}

/** A bracket's estimated width (px). */
export function phonemeBracketWidthPx(): number {
  return estimateTextWidthPx('[', PHONEME_FONT_SIZE_PX);
}

/**
 * The centres of one entry's phonemes. The first stands on its head. With an
 * arrow out, phoneme `i` of `n` is `i/n` of the way to the next phoneme's
 * anchor (`nextX`); without, the last ends at `nextX` (the end of the
 * entry's span) and the rest are spread evenly between.
 */
export function phonemeXs({
  headX,
  nextX,
  arrowOut,
  widths,
}: {
  headX: number;
  nextX: number;
  arrowOut: boolean;
  widths: readonly number[];
}): number[] {
  const count = widths.length;
  if (count === 0) {
    return [];
  }
  if (arrowOut) {
    return widths.map((_, i) => headX + ((nextX - headX) * i) / count);
  }
  if (count === 1) {
    return [headX];
  }
  const lastX = Math.max(headX, nextX - widths[count - 1] / 2);
  return widths.map((_, i) => headX + ((lastX - headX) * i) / (count - 1));
}

/**
 * An arrow from one phoneme's right edge to the next one's left: a gap from
 * each, with a head when there is room for one, else a plain line; null
 * when even that is too short.
 */
export function phonemeArrow(
  fromRight: number,
  toLeft: number
): { fromX: number; toX: number; head: boolean } | null {
  const fromX = fromRight + PHONEME_ARROW_GAP_PX;
  const toX = toLeft - PHONEME_ARROW_GAP_PX;
  const length = toX - fromX;
  if (length < PHONEME_ARROW_MIN_PX) {
    return null;
  }
  return { fromX, toX, head: length >= PHONEME_ARROW_HEAD_LENGTH_PX };
}

/** Room (px) between two phonemes: an arrow at its shortest, or a gap. */
export function phonemeSpacingPx(arrow: boolean): number {
  return arrow
    ? 2 * PHONEME_ARROW_GAP_PX + PHONEME_ARROW_HEAD_LENGTH_PX
    : PHONEME_GAP_PX;
}

/**
 * The baseline of a phoneme row: its brackets' tops a gap below the ink
 * above (`inkYs`) and at least PHONEME_STAFF_GAP_PX below the bottom line.
 */
export function phonemeRowY(input: {
  staffBottomY: number;
  inkYs: readonly number[];
}): number {
  const top = Math.max(
    input.staffBottomY + PHONEME_STAFF_GAP_PX,
    ...input.inkYs.map((y) => y + PHONEME_INK_GAP_PX)
  );
  return top + PHONEME_FONT_SIZE_PX * PHONEME_ASCENT_RATIO;
}
