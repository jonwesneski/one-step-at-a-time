import {
  AUGMENTATION_DOT_DIAMETER_PX,
  AUGMENTATION_DOT_SPACING_GAP_PX,
  STAFF_LINE_SPACING,
  STAFF_Y_STEP,
} from '../utils/notationDimensions';

/** Whether a staff Y sits on a line (stave or ledger) rather than in a space. */
export function isOnStaffLine(staffY: number): boolean {
  const lineSpacing = STAFF_Y_STEP * 2;
  return ((staffY % lineSpacing) + lineSpacing) % lineSpacing === 0;
}

/** A note in a space keeps its space; a note on a line dots the space above. */
export function resolveNoteDotStaffY(staffY: number): number {
  return isOnStaffLine(staffY) ? staffY - STAFF_Y_STEP : staffY;
}

// A dot pushed this far past the chord's outer head is too far to read as
// belonging to it.
const FORCED_DOT_DISTANCE = STAFF_LINE_SPACING * 2;

/**
 * One dot column for a chord, one dot per stave space:
 *  - a tone in a space dots its own space;
 *  - a tone on a line dots the space above, or the space below when that is
 *    taken (an adjacent upper note);
 *  - a tone with both neighbouring spaces taken dots the nearest free space,
 *    on whichever side keeps the column centred on the chord;
 *  - if that would put a dot two or more spaces past the chord, the column is
 *    instead one dot per space the chord itself covers.
 * `lowestLineToneBelow` drops a line-tone bottom note's dot to the space below
 * instead (the lower of two parts sharing a stave).
 */
export function resolveChordDotStaffYs(
  toneStaffYs: readonly number[],
  { lowestLineToneBelow = false }: { lowestLineToneBelow?: boolean } = {}
): number[] {
  const tones = [...new Set(toneStaffYs)].sort((a, b) => a - b);
  if (tones.length === 0) {
    return [];
  }
  const topHead = tones[0];
  const bottomHead = tones[tones.length - 1];
  const taken = new Set<number>();

  for (const tone of tones) {
    if (!isOnStaffLine(tone)) {
      taken.add(tone);
    }
  }

  const unplaced: number[] = [];
  for (const tone of tones) {
    if (!isOnStaffLine(tone)) {
      continue;
    }
    const above = tone - STAFF_Y_STEP;
    const below = tone + STAFF_Y_STEP;
    const dropFirst = lowestLineToneBelow && tone === bottomHead;
    const [first, second] = dropFirst ? [below, above] : [above, below];
    if (!taken.has(first)) {
      taken.add(first);
    } else if (!taken.has(second)) {
      taken.add(second);
    } else {
      unplaced.push(tone);
    }
  }

  const chordCentre = (topHead + bottomHead) / 2;
  const spaceStep = STAFF_Y_STEP * 2;
  for (const tone of unplaced) {
    let above = tone - STAFF_Y_STEP;
    while (taken.has(above)) {
      above -= spaceStep;
    }
    let below = tone + STAFF_Y_STEP;
    while (taken.has(below)) {
      below += spaceStep;
    }
    const choice =
      centreDrift(taken, below, chordCentre) <
      centreDrift(taken, above, chordCentre)
        ? below
        : above;
    if (
      topHead - choice >= FORCED_DOT_DISTANCE ||
      choice - bottomHead >= FORCED_DOT_DISTANCE
    ) {
      return spacesCoveredByChord(topHead, bottomHead);
    }
    taken.add(choice);
  }

  return [...taken].sort((a, b) => a - b);
}

function centreDrift(
  taken: ReadonlySet<number>,
  candidate: number,
  chordCentre: number
): number {
  let sum = candidate;
  for (const y of taken) {
    sum += y;
  }
  return Math.abs(sum / (taken.size + 1) - chordCentre);
}

function spacesCoveredByChord(topHead: number, bottomHead: number): number[] {
  const first = isOnStaffLine(topHead) ? topHead - STAFF_Y_STEP : topHead;
  const last = isOnStaffLine(bottomHead)
    ? bottomHead + STAFF_Y_STEP
    : bottomHead;
  const spaces: number[] = [];
  for (let y = first; y <= last; y += STAFF_Y_STEP * 2) {
    spaces.push(y);
  }
  return spaces;
}

/** Centre x of each dot in a row that starts (left ink edge) at `leftX`. */
export function augmentationDotCentersX(
  leftX: number,
  dotCount: number
): number[] {
  const pitch = AUGMENTATION_DOT_DIAMETER_PX + AUGMENTATION_DOT_SPACING_GAP_PX;
  return Array.from(
    { length: dotCount },
    (_, i) => leftX + AUGMENTATION_DOT_DIAMETER_PX / 2 + i * pitch
  );
}

/** Horizontal ink extent of a row of `dotCount` dots. */
export function augmentationDotRowWidthPx(dotCount: number): number {
  if (dotCount === 0) {
    return 0;
  }
  return (
    dotCount * AUGMENTATION_DOT_DIAMETER_PX +
    (dotCount - 1) * AUGMENTATION_DOT_SPACING_GAP_PX
  );
}
