import type { GlissandoLabel } from '../types/theory';
import type { LinePoint } from './glissandoRules';

/**
 * Where a label starts: its note's head, the leftmost of its note's own ink,
 * or its first grace note's head.
 */
export type LabelAnchor = 'head' | 'ink' | 'grace';

export type ResolvedGlissandoLabel = {
  lines: string[];
  italic: boolean;
  anchor: LabelAnchor;
};

const NAMED_LABELS: Record<
  GlissandoLabel,
  { text: string; italic: boolean; anchor: LabelAnchor }
> = {
  gliss: { text: 'gliss.', italic: true, anchor: 'head' },
  'quasi-gliss': { text: 'quasi gliss.', italic: true, anchor: 'ink' },
  chrom: { text: 'chrom.', italic: false, anchor: 'grace' },
  chromatic: { text: 'chromatic', italic: false, anchor: 'grace' },
  lip: { text: 'lip', italic: false, anchor: 'head' },
  bend: { text: 'bend', italic: false, anchor: 'head' },
};

/**
 * The text a `glissando-label` draws. Anything but a named value is drawn as
 * written, `|` starting a new line; null with nothing to draw.
 */
export function resolveGlissandoLabel(
  value: string | null
): ResolvedGlissandoLabel | null {
  const trimmed = value?.trim() ?? '';
  if (Object.hasOwn(NAMED_LABELS, trimmed)) {
    const { text, italic, anchor } = NAMED_LABELS[trimmed as GlissandoLabel];
    return { lines: [text], italic, anchor };
  }
  const lines = trimmed
    .split('|')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines.length === 0 ? null : { lines, italic: false, anchor: 'head' };
}

export type LabelSpan = { left: number; right: number };

/**
 * The top of a line where it passes under a label, or its bottom for a label
 * below (`above` false); null where it doesn't.
 */
export function lineTopUnder(
  from: LinePoint,
  to: LinePoint,
  { left, right }: LabelSpan,
  above = true
): number | null {
  const start = Math.max(left, from.x);
  const end = Math.min(right, to.x);
  if (start > end) {
    return null;
  }
  const yAt = (x: number): number =>
    to.x === from.x
      ? Math.min(from.y, to.y)
      : from.y + ((to.y - from.y) * (x - from.x)) / (to.x - from.x);
  return above
    ? Math.min(yAt(start), yAt(end))
    : Math.max(yAt(start), yAt(end));
}

// A slur bulges a little more at its ends than a parabola.
const ARC_FULLNESS = 1.25;

/**
 * The top of an arc where it passes under a label (its bottom for a label
 * below, `above` false), or null where it doesn't:
 * a parabola between its ends that reaches `reachY`. An end the arc only
 * passes (it carries on into another bar) is already at full height.
 */
export function arcTopUnder(
  {
    from,
    to,
    reachY,
    openStart,
    openEnd,
  }: {
    from: LinePoint;
    to: LinePoint;
    reachY: number;
    openStart: boolean;
    openEnd: boolean;
  },
  span: LabelSpan,
  above = true
): number | null {
  const chordTop = lineTopUnder(from, to, span, above);
  if (chordTop === null) {
    return null;
  }
  const length = to.x - from.x;
  const fractionAt = (x: number): number =>
    length <= 0 ? 0.5 : Math.min(1, Math.max(0, (x - from.x) / length));
  let start = fractionAt(span.left);
  let end = fractionAt(span.right);
  // Half an arc rises from its one end to the barline.
  if (openEnd) {
    [start, end] = [start / 2, end / 2];
  }
  if (openStart) {
    [start, end] = [0.5 + start / 2, 0.5 + end / 2];
  }
  if (openStart && openEnd) {
    [start, end] = [0.5, 0.5];
  }
  const height = (t: number): number => 4 * t * (1 - t);
  const fullest =
    start <= 0.5 && end >= 0.5 ? 1 : Math.max(height(start), height(end));
  return chordTop + (reachY - chordTop) * Math.min(1, fullest * ARC_FULLNESS);
}
