import type {
  ConventionalAccidentalType,
  QuarterTone,
} from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  ACCIDENTAL_ARROW_HEAD_HEIGHT_PX,
  ACCIDENTAL_ARROW_HEAD_STROKE_PX,
  ACCIDENTAL_ARROW_HEAD_WIDTH_PX,
  ACCIDENTAL_ARROW_OVERSHOOT_PX,
  ACCIDENTAL_ARROW_STROKES,
} from '../notationDimensions';

/**
 * Extends one of an accidental glyph's own strokes into a quarter-tone arrow.
 * Drawn inside the glyph's viewBox, so a glyph resized for a grace note or a
 * trill scales its arrow with it, and past the glyph's box, which stays the
 * plain accidental's.
 */
export function appendAccidentalArrow(
  glyph: SVGElement,
  accidental: ConventionalAccidentalType,
  quarterTone: QuarterTone
): void {
  const { x, endY, width, startInset } =
    ACCIDENTAL_ARROW_STROKES[accidental][quarterTone];
  const outward = quarterTone === 'up' ? -1 : 1;
  const tipY = endY + outward * ACCIDENTAL_ARROW_OVERSHOOT_PX;
  const headBaseY = tipY - outward * ACCIDENTAL_ARROW_HEAD_HEIGHT_PX;
  const halfHead = ACCIDENTAL_ARROW_HEAD_WIDTH_PX / 2;

  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('accidental-arrow');
  group.setAttribute('transform', glyphPxTransform(glyph));
  group.setAttribute('stroke', 'currentColor');
  group.setAttribute('fill', 'none');

  const shaft = document.createElementNS(SVG_NS, 'line');
  shaft.setAttribute('x1', `${x}`);
  shaft.setAttribute('y1', `${endY - outward * (startInset ?? 0.5)}`);
  shaft.setAttribute('x2', `${x}`);
  // Ends inside the head, so its square end doesn't blunt the tip.
  shaft.setAttribute('y2', `${tipY - outward * width}`);
  shaft.setAttribute('stroke-width', `${width}`);

  const head = document.createElementNS(SVG_NS, 'path');
  head.setAttribute(
    'd',
    `M ${x - halfHead},${headBaseY} L ${x},${tipY} L ${
      x + halfHead
    },${headBaseY}`
  );
  head.setAttribute('stroke-width', `${ACCIDENTAL_ARROW_HEAD_STROKE_PX}`);

  group.append(shaft, head);
  glyph.setAttribute('overflow', 'visible');
  glyph.appendChild(group);
}

// Maps px of the glyph's natural size to its viewBox units; the viewBox is
// fitted into that size and centred.
function glyphPxTransform(glyph: SVGElement): string {
  const width = parseFloat(glyph.getAttribute('width') ?? '0');
  const height = parseFloat(glyph.getAttribute('height') ?? '0');
  const [, , unitsWide, unitsHigh] = (glyph.getAttribute('viewBox') ?? '')
    .split(' ')
    .map(Number);
  const pxPerUnit = Math.min(width / unitsWide, height / unitsHigh);
  const insetX = (width - unitsWide * pxPerUnit) / 2;
  const insetY = (height - unitsHigh * pxPerUnit) / 2;
  return `scale(${1 / pxPerUnit}) translate(${-insetX} ${-insetY})`;
}
