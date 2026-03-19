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
const NOTE_SCALE = NOTE_SVG_WIDTH / COORD_WIDTH;
// SVG viewport height (px). Must be tall enough to contain the notehead.
export const NOTE_SVG_HEIGHT = 60;
export const NOTE_STEM_X_OFFSET = 365 * NOTE_SCALE; // stem x within a note SVG (~19.47px)
export const NOTE_Y_STEM_START = 100;
export const NOTE_STEM_TIP_Y_OFFSET = NOTE_Y_STEM_START * NOTE_SCALE; // stem tip y for stem-up (~5.33px)
// Y offset used to align the notehead with a staff line when positioning the note SVG.
// Equals NOTE_SVG_HEIGHT - 3 for stem-up; must stay in sync with createNoteSvg's yHeadOffset.
export const NOTE_Y_HEAD_OFFSET_STEM_UP = NOTE_SVG_HEIGHT - 3; // 57px

export type NoteProps = {
  duration: DurationType;
  noFlags?: boolean;
  stemUp?: boolean;
  stemExtension?: number; // px to shift the stem tip upward (positive = longer stem)
  qualifiedElementName?: 'svg' | 'g';
};
export const createNoteSvg = ({
  duration,
  noFlags = false,
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

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `scale(${NOTE_SCALE})`);

  const xStart = COORD_WIDTH / 2;
  const stemLength = 760; // ~40px at NOTE_SCALE; gives visible stem below the beam
  const yStemEnd = NOTE_Y_STEM_START + stemLength;
  const headWidth = 80;

  // Stem
  const stemX = stemUp ? xStart + headWidth - 15 : xStart;
  const stemWidth = 22;
  if (duration !== 'whole') {
    const stemExtensionInternal = stemExtension / NOTE_SCALE;
    const stemTipY = NOTE_Y_STEM_START - stemExtensionInternal;
    const stem = document.createElementNS(SVG_NS, 'line');
    stem.classList.add('stem');
    stem.setAttribute('x1', stemX.toString());
    // todo: need to consider flags for stem length; 16ths and smaller
    stem.setAttribute('y1', stemTipY.toString());
    stem.setAttribute('x2', stemX.toString());
    stem.setAttribute('y2', yStemEnd.toString());
    if (stemExtension !== 0) {
      svg.setAttribute('overflow', 'visible');
    }
    stem.setAttribute('stroke', 'currentColor');
    stem.setAttribute('stroke-width', stemWidth.toString());
    g.appendChild(stem);
  }

  // Flag(s)
  const flagCount = durationToFlagCountMap.get(duration) ?? 0;
  if (!noFlags && flagCount > 0) {
    // todo need to calculate flags with stemup or not; assuming stem up for now
    const xFlagStart = stemX;
    const flag = document.createElementNS(SVG_NS, 'g');
    flag.classList.add('flag');
    const name = 'partial-flag';
    const partialFlag = document.createElementNS(SVG_NS, 'g');
    partialFlag.classList.add(name);
    partialFlag.id = name;
    const yPartialFlagLongStart = NOTE_Y_STEM_START + 30;
    const partialFlagLong = document.createElementNS(SVG_NS, 'path');
    const xPartialFlagLongEnd = xFlagStart + 110;
    const yPartialFlagLongEnd = yPartialFlagLongStart + 190;
    partialFlagLong.setAttribute(
      'd',
      `M${xFlagStart},${yPartialFlagLongStart} C${xFlagStart + 60},${
        yPartialFlagLongStart + 40
      } ${xFlagStart + 170},${
        yPartialFlagLongStart + 95
      } ${xPartialFlagLongEnd},${yPartialFlagLongEnd}`
    );
    partialFlagLong.setAttribute('fill', 'none');
    partialFlagLong.setAttribute('stroke', 'currentColor');
    partialFlagLong.setAttribute('stroke-width', '30');
    partialFlag.appendChild(partialFlagLong);

    const yPartialFlagTopStart = NOTE_Y_STEM_START + 20;
    const partialFlagTop = document.createElementNS(SVG_NS, 'path');
    partialFlagTop.setAttribute(
      'd',
      `M${xFlagStart},${yPartialFlagTopStart} C${xFlagStart + 10},${
        yPartialFlagTopStart + 20
      } ${xFlagStart + 35},${yPartialFlagTopStart + 35} ${xFlagStart + 80},${
        yPartialFlagTopStart + 70
      }`
    );
    partialFlagTop.setAttribute('fill', 'none');
    partialFlagTop.setAttribute('stroke', 'currentColor');
    partialFlagTop.setAttribute('stroke-width', '25');
    partialFlag.appendChild(partialFlagTop);
    flag.appendChild(partialFlag);

    let yPartialFlagTailStart = yPartialFlagLongEnd;
    for (let i = 0; i < flagCount - 1; i++) {
      const flagCopy = document.createElementNS(SVG_NS, 'use');
      const y = 80 * (i + 1);
      yPartialFlagTailStart = yPartialFlagLongEnd + y;
      flagCopy.setAttribute('href', `#${name}`);
      flagCopy.setAttribute('y', y.toString());
      flag.appendChild(flagCopy);
    }

    const partialFlagTail = document.createElementNS(SVG_NS, 'line');
    partialFlagTail.setAttribute('x1', (xPartialFlagLongEnd + 5).toString());
    partialFlagTail.setAttribute('y1', (yPartialFlagTailStart - 5).toString());
    partialFlagTail.setAttribute('x2', (xPartialFlagLongEnd - 40).toString());
    partialFlagTail.setAttribute('y2', (yPartialFlagTailStart + 50).toString());
    partialFlagTail.setAttribute('fill', 'none');
    partialFlagTail.setAttribute('stroke', 'currentColor');
    partialFlagTail.setAttribute('stroke-width', '28');
    flag.appendChild(partialFlagTail);

    g.appendChild(flag);
  }

  // Head
  const headXStartStr = stemUp
    ? (xStart - 10).toString()
    : (xStart + stemWidth).toString();
  const headYStartStr = stemUp ? yStemEnd.toString() : headWidth.toString();
  const headFill =
    duration === 'half' || duration === 'whole' ? 'none' : 'currentColor';
  const head = document.createElementNS(SVG_NS, 'ellipse');
  head.classList.add('head');
  head.setAttribute('cx', headXStartStr);
  head.setAttribute('cy', headYStartStr);
  head.setAttribute('rx', headWidth.toString());
  head.setAttribute('ry', (headWidth * 0.75).toString());
  head.setAttribute(
    'transform',
    `rotate(-30 ${headXStartStr} ${headYStartStr})`
  );
  head.setAttribute('stroke', 'currentColor');
  head.setAttribute('fill', headFill);
  head.setAttribute('stroke-width', '30');
  g.appendChild(head);

  svg.appendChild(g);

  const yHeadOffset = stemUp ? height - 3 : 7;
  return [svg, yHeadOffset];
};
