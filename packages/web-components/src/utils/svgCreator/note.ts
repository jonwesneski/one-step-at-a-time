// Stem geometry constants derived from createNoteSvg()'s 600-unit coordinate space

import { DurationType } from '../../types/theory';
import { SVG_NS } from '../consts';
import { durationToFlagCountMap } from '../theoryConsts';

// scaled down to the 32px note SVG viewport. Used to compute beam attachment points.
export const NOTE_SVG_WIDTH = 32;
// Draw in a 600-unit-wide coordinate space scaled to a 32x60 viewport via a
// uniform scale transform on a wrapper <g>. This avoids viewBox-based sizing
// quirks when the SVG is nested inside other SVG elements.
export const COORD_WIDTH = 600;
// 32/600 — applied uniformly to both axes
export const NOTE_SCALE = NOTE_SVG_WIDTH / COORD_WIDTH;
// SVG viewport height (px). Must be tall enough to contain the notehead.
export const NOTE_SVG_HEIGHT = 60;
export const NOTE_STEM_X_OFFSET = 365 * NOTE_SCALE; // stem x within a note SVG, stem-up (~19.47px)
export const NOTE_STEM_X_OFFSET_STEM_DOWN = 247 * NOTE_SCALE; // stem x within a note SVG, stem-down (~13.17px)
export const NOTE_Y_STEM_START = 100;
export const NOTE_STEM_TIP_Y_OFFSET = NOTE_Y_STEM_START * NOTE_SCALE; // stem tip y for stem-up (~5.33px)
// Y offset used to align the notehead with a staff line when positioning the note SVG.
// = Math.round(10 + (NOTE_Y_STEM_START + 760) * NOTE_SCALE). Must stay in sync with
// createNoteSvg's yHeadOffset formula for the base stem length (no flag extension).
export const NOTE_Y_HEAD_OFFSET_STEM_UP = 47; // Math.round(10 + 700 * (32/600))
const BASE_STEM_LENGTH = 600; // ~32px at NOTE_SCALE (~4 staff line spaces)
const STEM_WIDTH = 22;
const HEAD_WIDTH = 80;
const FLAG_Y_SPACING = 120;
// Y offset to align the notehead when stem is down (head is near the top of the SVG).
export const NOTE_Y_HEAD_OFFSET_STEM_DOWN = Math.round(
  10 + HEAD_WIDTH * NOTE_SCALE
); // 14
// Pixel distance from top of the note SVG to the stem tip when stem is down.
export const NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN =
  (HEAD_WIDTH + BASE_STEM_LENGTH) * NOTE_SCALE;

export type NoteProps = {
  duration: DurationType;
  noFlags?: boolean;
  noStem?: boolean; // true for non-extremal chord notes — renders head only, no stem or flags
  stemUp?: boolean;
  stemExtension?: number; // used in beaming
  qualifiedElementName?: 'svg' | 'g';
};
export const createNoteSvg = ({
  duration,
  noFlags = false,
  noStem = false,
  stemUp = true,
  stemExtension = 0,
  qualifiedElementName = 'svg',
}: NoteProps): [SVGElement | SVGGElement, number] => {
  const svg = document.createElementNS(SVG_NS, qualifiedElementName);
  if (qualifiedElementName === 'svg') {
    svg.setAttribute('xmlns', SVG_NS);
  }
  svg.classList.add('note');
  svg.dataset.duration = duration;
  svg.dataset.stemUp = `${stemUp}`;
  svg.setAttribute('width', `${NOTE_SVG_WIDTH}`);
  svg.setAttribute('height', `${NOTE_SVG_HEIGHT}`);
  // Not using viewbox but it should be somewhere around:
  // COORD_WIDTH and BASE_STEM_LENGTH (height; just starting though)

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `scale(${NOTE_SCALE})`);

  const xStart = COORD_WIDTH / 2;
  const flagCount = durationToFlagCountMap.get(duration) ?? 0;

  // Extend stem on larger flag counts
  const flagStemExtension =
    !noFlags && flagCount > 1 ? (flagCount - 1) * FLAG_Y_SPACING : 0;
  const yStemEnd = NOTE_Y_STEM_START + BASE_STEM_LENGTH + flagStemExtension;

  // Stem
  const stemX = stemUp
    ? xStart + HEAD_WIDTH - 15
    : xStart + STEM_WIDTH - HEAD_WIDTH + 5;
  if (!noStem && duration !== 'whole') {
    const stemExtensionInternal = stemExtension / NOTE_SCALE;
    // Stem-up: right side of head, tip at top (y1), head end at bottom (y2).
    // Stem-down: left side of head, head end at top (y1), tip at bottom (y2).
    const stemY1 = stemUp
      ? NOTE_Y_STEM_START - stemExtensionInternal
      : HEAD_WIDTH;
    const stemY2 = stemUp
      ? yStemEnd
      : HEAD_WIDTH +
        BASE_STEM_LENGTH +
        flagStemExtension +
        stemExtensionInternal;
    const stem = document.createElementNS(SVG_NS, 'line');
    stem.classList.add('stem');
    stem.setAttribute('x1', stemX.toString());
    stem.setAttribute('y1', stemY1.toString());
    stem.setAttribute('x2', stemX.toString());
    stem.setAttribute('y2', stemY2.toString());
    if (stemExtension !== 0 || flagStemExtension > 0) {
      svg.setAttribute('overflow', 'visible');
    }
    stem.setAttribute('stroke', 'currentColor');
    stem.setAttribute('stroke-width', STEM_WIDTH.toString());
    g.appendChild(stem);
  }

  // Flag(s)
  if (!noStem && !noFlags && flagCount > 0) {
    // todo need to calculate flags with stemdown
    const xFlagStart = stemX;
    const flag = document.createElementNS(SVG_NS, 'g');
    flag.classList.add('flag');

    // Each flag is a thin curved stroke — a fishhook shape. Starts at the stem
    // tip, arcs right and down, then curls back left to a point. Stacked flags
    // are spaced FLAG_Y_SPACING units apart down the stem.
    const flagName = 'single-flag';
    const singleFlag = document.createElementNS(SVG_NS, 'path');
    singleFlag.classList.add(flagName);
    singleFlag.id = flagName;
    const stemExtensionInternal = stemExtension / NOTE_SCALE;
    const yFlagTop = NOTE_Y_STEM_START - stemExtensionInternal;
    // Filled closed tapered shape: wide at the base (stem attachment), narrows
    // toward the bottom. Outer curve sweeps right/down; inner curve returns to
    // a narrow point near the base. No tail — tail is appended separately so
    // <use> copies don't show one.
    /**
     * M - Start is the bottom line of the flag
     * Q - The bottom line
     * C - Top line
     */
    const yFlagStart = yFlagTop + 100;
    singleFlag.setAttribute(
      'd',
      `M${xFlagStart},${yFlagStart}
       Q${xFlagStart + 160},${yFlagStart + 40}
         ${xFlagStart + 140},${yFlagStart + 260}
       C${xFlagStart + 160},${yFlagStart + -60}
         ${xFlagStart + 20},${yFlagTop + 100}
         ${xFlagStart},${yFlagTop}
       Z`
    );

    singleFlag.setAttribute('fill', 'currentColor');
    singleFlag.setAttribute('stroke', 'currentColor');
    singleFlag.setAttribute('stroke-width', '5');
    flag.appendChild(singleFlag);

    for (let i = 1; i < flagCount; i++) {
      const flagCopy = document.createElementNS(SVG_NS, 'use');
      flagCopy.setAttribute('href', `#${flagName}`);
      flagCopy.setAttribute('y', (FLAG_Y_SPACING * i).toString());
      flag.appendChild(flagCopy);
    }

    // todo: I may come back to this
    // // Tippy-tail: only on the bottom-most flag, appended once after the loop.
    // const yLastFlagBase = yFlagTop + FLAG_Y_SPACING * (flagCount - 1);
    // const tail = document.createElementNS(SVG_NS, 'path');
    // tail.setAttribute(
    //   'd',
    //   `M${xFlagStart + 60},${yLastFlagBase + 200}
    //    C${xFlagStart + 40},${yLastFlagBase + 220}
    //      ${xFlagStart + 10},${yLastFlagBase + 230}
    //      ${xFlagStart + 30},${yLastFlagBase + 260}`
    // );
    // tail.setAttribute('fill', 'none');
    // tail.setAttribute('stroke', 'currentColor');
    // tail.setAttribute('stroke-width', '22');
    // tail.setAttribute('stroke-linecap', 'round');
    // flag.appendChild(tail);

    g.appendChild(flag);
  }

  // Head
  const headXStartStr = stemUp
    ? (xStart - 10).toString()
    : (xStart + STEM_WIDTH).toString();
  const headYStartStr = stemUp ? yStemEnd.toString() : HEAD_WIDTH.toString();
  const headFill =
    duration === 'half' || duration === 'whole' ? 'none' : 'currentColor';

  // Enlarged invisible hit zone behind the notehead for easier targeting.
  // 1.5× the head size; transparent but captures pointer events.
  const headHitZone = document.createElementNS(SVG_NS, 'ellipse');
  headHitZone.classList.add('head-hit-zone');
  headHitZone.setAttribute('cx', headXStartStr);
  headHitZone.setAttribute('cy', headYStartStr);
  headHitZone.setAttribute('rx', (HEAD_WIDTH * 1.5).toString());
  headHitZone.setAttribute('ry', (HEAD_WIDTH * 0.75 * 1.5).toString());
  headHitZone.setAttribute(
    'transform',
    `rotate(-30 ${headXStartStr} ${headYStartStr})`
  );
  headHitZone.setAttribute('fill', 'transparent');
  headHitZone.setAttribute('stroke', 'none');
  g.appendChild(headHitZone);

  const head = document.createElementNS(SVG_NS, 'ellipse');
  head.classList.add('head');
  head.setAttribute('cx', headXStartStr);
  head.setAttribute('cy', headYStartStr);
  head.setAttribute('rx', HEAD_WIDTH.toString());
  head.setAttribute('ry', (HEAD_WIDTH * 0.75).toString());
  head.setAttribute(
    'transform',
    `rotate(-30 ${headXStartStr} ${headYStartStr})`
  );
  head.setAttribute('stroke', 'currentColor');
  head.setAttribute('fill', headFill);
  head.setAttribute('stroke-width', '30');
  g.appendChild(head);

  svg.appendChild(g);

  const yHeadOffset = computeYHeadOffset(stemUp, duration, noFlags);
  return [svg, yHeadOffset];
};

// Compute the Y offset from the top of the note SVG to the notehead center.
// Deterministic from rendering params — used by both createNoteSvg (return value)
// and the staff (for positioning notes before their SVG renders).
export function computeYHeadOffset(
  stemUp: boolean,
  duration: DurationType,
  noFlags: boolean
): number {
  if (!stemUp) return NOTE_Y_HEAD_OFFSET_STEM_DOWN;
  const flagCount = durationToFlagCountMap.get(duration) ?? 0;
  const flagStemExtension =
    !noFlags && flagCount > 1 ? (flagCount - 1) * FLAG_Y_SPACING : 0;
  const yStemEnd = NOTE_Y_STEM_START + BASE_STEM_LENGTH + flagStemExtension;
  return Math.round(10 + yStemEnd * NOTE_SCALE);
}
