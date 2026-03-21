// Stem geometry constants derived from createNoteSvg()'s 600-unit coordinate space

import { DurationType } from '../../types/theory';
import { durationToFlagCountMap, SVG_NS } from '../consts';

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
  svg.dataset.duration = duration;
  svg.dataset.stemUp = `${stemUp}`;
  const height = NOTE_SVG_HEIGHT;
  svg.setAttribute('width', `${NOTE_SVG_WIDTH}`);
  svg.setAttribute('height', `${height}`);
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
    // todo need to calculate flags with stemup or not; assuming stem up for now
    const xFlagStart = stemX;
    const flag = document.createElementNS(SVG_NS, 'g');
    flag.classList.add('flag');
    const name = 'partial-flag';
    const partialFlag = document.createElementNS(SVG_NS, 'g');
    partialFlag.classList.add(name);
    partialFlag.id = name;
    const yPartialFlagLongStart = NOTE_Y_STEM_START + 45;
    const partialFlagLong = document.createElementNS(SVG_NS, 'path');
    const xPartialFlagLongEnd = xFlagStart + 165;
    const yPartialFlagLongEnd = yPartialFlagLongStart + 285;
    partialFlagLong.setAttribute(
      'd',
      `M${xFlagStart},${yPartialFlagLongStart} C${xFlagStart + 90},${
        yPartialFlagLongStart + 60
      } ${xFlagStart + 255},${
        yPartialFlagLongStart + 143
      } ${xPartialFlagLongEnd},${yPartialFlagLongEnd}`
    );
    partialFlagLong.setAttribute('fill', 'none');
    partialFlagLong.setAttribute('stroke', 'currentColor');
    partialFlagLong.setAttribute('stroke-width', '45');
    partialFlag.appendChild(partialFlagLong);

    const yPartialFlagTopStart = NOTE_Y_STEM_START + 30;
    const partialFlagTop = document.createElementNS(SVG_NS, 'path');
    partialFlagTop.setAttribute(
      'd',
      `M${xFlagStart},${yPartialFlagTopStart} C${xFlagStart + 15},${
        yPartialFlagTopStart + 30
      } ${xFlagStart + 53},${yPartialFlagTopStart + 53} ${xFlagStart + 120},${
        yPartialFlagTopStart + 105
      }`
    );
    partialFlagTop.setAttribute('fill', 'none');
    partialFlagTop.setAttribute('stroke', 'currentColor');
    partialFlagTop.setAttribute('stroke-width', '38');
    partialFlag.appendChild(partialFlagTop);
    flag.appendChild(partialFlag);

    let yPartialFlagTailStart = yPartialFlagLongEnd;
    for (let i = 0; i < flagCount - 1; i++) {
      const flagCopy = document.createElementNS(SVG_NS, 'use');
      const y = FLAG_Y_SPACING * (i + 1);
      yPartialFlagTailStart = yPartialFlagLongEnd + y;
      flagCopy.setAttribute('href', `#${name}`);
      flagCopy.setAttribute('y', y.toString());
      flag.appendChild(flagCopy);
    }

    const partialFlagTail = document.createElementNS(SVG_NS, 'line');
    partialFlagTail.setAttribute('x1', (xPartialFlagLongEnd + 8).toString());
    partialFlagTail.setAttribute('y1', (yPartialFlagTailStart - 8).toString());
    partialFlagTail.setAttribute('x2', (xPartialFlagLongEnd - 60).toString());
    partialFlagTail.setAttribute('y2', (yPartialFlagTailStart + 75).toString());
    partialFlagTail.setAttribute('fill', 'none');
    partialFlagTail.setAttribute('stroke', 'currentColor');
    partialFlagTail.setAttribute('stroke-width', '42');
    flag.appendChild(partialFlagTail);

    g.appendChild(flag);
  }

  // Head
  const headXStartStr = stemUp
    ? (xStart - 10).toString()
    : (xStart + STEM_WIDTH).toString();
  const headYStartStr = stemUp ? yStemEnd.toString() : HEAD_WIDTH.toString();
  const headFill =
    duration === 'half' || duration === 'whole' ? 'none' : 'currentColor';
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

  const yHeadOffset = stemUp
    ? Math.round(10 + yStemEnd * NOTE_SCALE)
    : NOTE_Y_HEAD_OFFSET_STEM_DOWN;
  return [svg, yHeadOffset];
};
