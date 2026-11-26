import type { NoteLetter } from '../types/theory';
import {
  BEND_CONTOUR_POINT_PX,
  GLISSANDO_MIN_LENGTH_PX,
} from '../utils/notationDimensions';
import type { LinePoint } from './glissandoRules';
import { LETTER_ORDER } from './graceRules';

export type ContourPitch = { letter: NoteLetter; octave: number };

// A letter, an accidental (ignored: the pitches are approximate) and an octave.
const PITCH = /^([A-Ga-g])(?:#{1,2}|b{1,2}|♯|♭|x)?(\d)$/;

const entriesOf = (value: string | null): string[] =>
  value === null
    ? []
    : value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry !== '');

const parseEntry = (entry: string): ContourPitch | null => {
  const match = PITCH.exec(entry);
  return match === null
    ? null
    : {
        letter: match[1].toUpperCase() as NoteLetter,
        octave: Number(match[2]),
      };
};

/**
 * The pitches of a `bend-contour`, comma-separated with their octaves
 * (`G5,B4`). A bad entry is skipped; null when none is left.
 */
export function parseBendContour(value: string | null): ContourPitch[] | null {
  const pitches = entriesOf(value).flatMap((entry) => parseEntry(entry) ?? []);
  return pitches.length === 0 ? null : pitches;
}

/** What is wrong with a `bend-contour` value; null when nothing. */
export function bendContourWarning(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const bad = entriesOf(value).filter((entry) => parseEntry(entry) === null);
  if (bad.length === 0) {
    return parseBendContour(value) === null
      ? 'bend-contour is empty; drawing no contour'
      : null;
  }
  return `bend-contour skips ${bad
    .map((entry) => `"${entry}"`)
    .join(', ')}: each pitch needs a letter and an octave, such as "G5"`;
}

/** Diatonic steps from a written pitch up to each contour pitch. */
export function contourSteps(
  letter: NoteLetter,
  octave: number,
  pitches: readonly ContourPitch[]
): number[] {
  return pitches.map(
    (pitch) =>
      (pitch.octave - octave) * LETTER_ORDER.length +
      LETTER_ORDER.indexOf(pitch.letter) -
      LETTER_ORDER.indexOf(letter)
  );
}

/** The shortest line (px) a contour of `count` pitches draws. */
export function contourMinLengthPx(count: number): number {
  return Math.max(GLISSANDO_MIN_LENGTH_PX, count * BEND_CONTOUR_POINT_PX);
}

/**
 * A contour's points: from its start, through each y at an even share of the
 * line, the last at its end.
 */
export function contourPoints(
  from: LinePoint,
  toX: number,
  ys: readonly number[]
): LinePoint[] {
  return [
    from,
    ...ys.map((y, i) => ({
      x: from.x + ((toX - from.x) * (i + 1)) / ys.length,
      y,
    })),
  ];
}

export type CubicSegment = {
  from: LinePoint;
  c1: LinePoint;
  c2: LinePoint;
  to: LinePoint;
};

/**
 * A smooth curve through points with rising x: a monotone cubic
 * (Fritsch–Carlson), level at each peak and trough, so it never passes a
 * pitch between two others. Controls sit at thirds of each step in x, so y
 * is a function of x.
 */
export function contourSegments(points: readonly LinePoint[]): CubicSegment[] {
  const n = points.length;
  if (n < 2) {
    return [];
  }
  const widths = points.slice(1).map((point, i) => point.x - points[i].x);
  const slopes = points
    .slice(1)
    .map((point, i) =>
      widths[i] === 0 ? 0 : (point.y - points[i].y) / widths[i]
    );
  const tangents = points.map((_, i) => {
    if (i === 0) {
      return slopes[0];
    }
    if (i === n - 1) {
      return slopes[n - 2];
    }
    const [before, after] = [slopes[i - 1], slopes[i]];
    return before * after <= 0 ? 0 : (before + after) / 2;
  });
  slopes.forEach((slope, i) => {
    if (slope === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      return;
    }
    const a = tangents[i] / slope;
    const b = tangents[i + 1] / slope;
    const length = Math.hypot(a, b);
    if (length > 3) {
      tangents[i] = (3 * a * slope) / length;
      tangents[i + 1] = (3 * b * slope) / length;
    }
  });
  return widths.map((width, i) => {
    const [from, to] = [points[i], points[i + 1]];
    return {
      from,
      c1: { x: from.x + width / 3, y: from.y + (tangents[i] * width) / 3 },
      c2: { x: to.x - width / 3, y: to.y - (tangents[i + 1] * width) / 3 },
      to,
    };
  });
}

// y at x on a segment whose controls sit at thirds in x.
function segmentYAt({ from, c1, c2, to }: CubicSegment, x: number): number {
  const t = to.x === from.x ? 0 : (x - from.x) / (to.x - from.x);
  const u = 1 - t;
  return (
    u * u * u * from.y +
    3 * u * u * t * c1.y +
    3 * u * t * t * c2.y +
    t * t * t * to.y
  );
}

/**
 * The top (or bottom, below) of a contour under a span, or null where it
 * doesn't reach. Each segment is monotone, so its extremes lie at the
 * span's or the segment's ends.
 */
export function contourTopUnder(
  segments: readonly CubicSegment[],
  span: { left: number; right: number },
  above = true
): number | null {
  const ys = segments.flatMap((segment) => {
    const left = Math.max(span.left, segment.from.x);
    const right = Math.min(span.right, segment.to.x);
    return left > right
      ? []
      : [segmentYAt(segment, left), segmentYAt(segment, right)];
  });
  if (ys.length === 0) {
    return null;
  }
  return above ? Math.min(...ys) : Math.max(...ys);
}

/** The path of a contour through its segments. */
export function contourPath(segments: readonly CubicSegment[]): string {
  if (segments.length === 0) {
    return '';
  }
  const text = ({ x, y }: LinePoint) => `${x} ${y}`;
  return [
    `M ${text(segments[0].from)}`,
    ...segments.map(
      ({ c1, c2, to }) => `C ${text(c1)} ${text(c2)} ${text(to)}`
    ),
  ].join(' ');
}
