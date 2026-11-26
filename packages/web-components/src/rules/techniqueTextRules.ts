import {
  TECHNIQUE_TEXT_BELOW_GAP_PX,
  TECHNIQUE_TEXT_NEXT_GAP_PX,
} from '../utils/notationDimensions';
import { parseTextPlacement, parseTextStyle } from '../utils/parsers';

// Share of the font size each kind of character advances in a serif face.
const CHARACTER_WIDTHS: readonly [RegExp, number][] = [
  [/[ijl.,:;'!|]/, 0.28],
  [/[ ftr()-]/, 0.34],
  [/[mwMW¼½¾]/, 0.8],
  [/[A-Z]/, 0.7],
];
const CHARACTER_WIDTH = 0.5;

// A little over, since serif faces differ.
const WIDTH_MARGIN = 1.08;

/** Estimated width (px) of a line of serif text at `fontSizePx`. */
export function estimateTextWidthPx(line: string, fontSizePx: number): number {
  const ems = Array.from(line).reduce(
    (sum, character) =>
      sum +
      (CHARACTER_WIDTHS.find(([pattern]) => pattern.test(character))?.[1] ??
        CHARACTER_WIDTH),
    0
  );
  return ems * fontSizePx * WIDTH_MARGIN;
}

/** One line of technique text; `hang` is drawn outside the left margin. */
export type TechniqueTextLine = { text: string; hang: string };

const HANGING_OPENERS = ['“', '‘', '"', "'", '(', '['];

/**
 * The opening quote or bracket a line hangs left of the margin, or '': only
 * in text of two or more lines.
 */
export function hangOf(line: string, lineCount: number): string {
  const first = line.charAt(0);
  return lineCount > 1 && HANGING_OPENERS.includes(first) ? first : '';
}

/**
 * A `technique-text`'s lines: `|` breaks a line, each is trimmed and empty
 * ones dropped. Null with no text.
 */
export function parseTechniqueText(
  value: string | null
): TechniqueTextLine[] | null {
  const lines = (value ?? '')
    .split('|')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines.length === 0
    ? null
    : lines.map((text) => ({ text, hang: hangOf(text, lines.length) }));
}

/**
 * The furthest right a technique text may reach: the row's end, or short of
 * the next technique text when that still leaves it its own bar.
 */
export function techniqueTextMaxRight({
  rowRight,
  nextTextX,
  ownBarRight,
}: {
  rowRight: number;
  nextTextX: number | null;
  ownBarRight: number;
}): number {
  return nextTextX === null
    ? rowRight
    : Math.min(
        rowRight,
        Math.max(ownBarRight, nextTextX - TECHNIQUE_TEXT_NEXT_GAP_PX)
      );
}

/**
 * Where a technique text starts, and the furthest right it may reach (see
 * techniqueTextMaxRight). Past that it shifts left, but not before `minX`;
 * the caller wraps what still doesn't fit.
 */
export function techniqueTextSpan({
  anchorX,
  width,
  minX,
  rowRight,
  nextTextX,
  ownBarRight,
}: {
  anchorX: number;
  width: number;
  minX: number;
  rowRight: number;
  nextTextX: number | null;
  ownBarRight: number;
}): { left: number; maxRight: number } {
  const maxRight = techniqueTextMaxRight({ rowRight, nextTextX, ownBarRight });
  const left =
    anchorX + width <= maxRight
      ? anchorX
      : Math.max(minX, Math.min(anchorX, maxRight - width));
  return { left, maxRight };
}

/**
 * Text below the stave starts at its head, in the row nearest the stave.
 * When its own entry's ink (a down-stem, tail, ledger lines or curve) reaches
 * into that row under it, it ends a gap before that ink if the previous entry
 * leaves room, otherwise it drops below the ink.
 */
export function belowTextPlacement({
  anchorX,
  width,
  inkLeft,
  inkBottom,
  previousRight,
  rowTop,
}: {
  anchorX: number;
  width: number;
  inkLeft: number;
  inkBottom: number;
  previousRight: number;
  rowTop: number;
}): { left: number; top: number } {
  if (inkBottom <= rowTop || inkLeft >= anchorX + width) {
    return { left: anchorX, top: rowTop };
  }
  const before = inkLeft - TECHNIQUE_TEXT_BELOW_GAP_PX - width;
  return before >= previousRight
    ? { left: before, top: rowTop }
    : { left: anchorX, top: inkBottom + TECHNIQUE_TEXT_BELOW_GAP_PX };
}

/** The warning a text attribute's value gives as it is set, or null. */
export function textAttributeWarning(
  name: string,
  value: string | null
): string | null {
  if (value === null) {
    return null;
  }
  if (name === 'technique-text' && parseTechniqueText(value) === null) {
    return 'technique-text is empty; drawing no text';
  }
  if (name === 'dynamic-text' && value.trim() === '') {
    return 'dynamic-text is empty; drawing no text';
  }
  if (
    name === 'technique-text-placement' &&
    parseTextPlacement(value) === null
  ) {
    return `technique-text-placement="${value}" isn't above or below; drawing it above`;
  }
  if (name === 'technique-text-style' && parseTextStyle(value) === null) {
    return `technique-text-style="${value}" isn't normal or italic; drawing it upright`;
  }
  return null;
}
