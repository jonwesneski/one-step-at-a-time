import { signCenterOffsets } from '../../rules/signRules';
import type { NoteSign } from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  SIGN_CIRCLE_DIAMETER_PX,
  SIGN_CIRCLE_STROKE_WIDTH_PX,
  SIGN_CROSS_SIZE_PX,
  SIGN_CROSS_STROKE_WIDTH_PX,
} from '../notationDimensions';

function line(x1: number, y1: number, x2: number, y2: number): SVGLineElement {
  const element = document.createElementNS(SVG_NS, 'line');
  element.setAttribute('x1', `${x1}`);
  element.setAttribute('y1', `${y1}`);
  element.setAttribute('x2', `${x2}`);
  element.setAttribute('y2', `${y2}`);
  element.setAttribute('stroke', 'currentColor');
  element.setAttribute('stroke-width', `${SIGN_CROSS_STROKE_WIDTH_PX}`);
  return element;
}

function circle(cx: number, cy: number, filled: boolean): SVGCircleElement {
  const element = document.createElementNS(SVG_NS, 'circle');
  element.setAttribute('cx', `${cx}`);
  element.setAttribute('cy', `${cy}`);
  // The stroke is centred on the outline, so the ink keeps the full diameter.
  element.setAttribute(
    'r',
    `${(SIGN_CIRCLE_DIAMETER_PX - SIGN_CIRCLE_STROKE_WIDTH_PX) / 2}`
  );
  element.setAttribute('fill', filled ? 'currentColor' : 'none');
  element.setAttribute('stroke', 'currentColor');
  element.setAttribute('stroke-width', `${SIGN_CIRCLE_STROKE_WIDTH_PX}`);
  return element;
}

function createSignGlyph(sign: NoteSign, cx: number, cy: number): SVGElement {
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('sign', `sign-${sign}`);
  const half = SIGN_CROSS_SIZE_PX / 2;
  switch (sign) {
    case 'circle':
    case 'filled':
      group.appendChild(circle(cx, cy, sign === 'filled'));
      break;
    case 'half': {
      const radius = SIGN_CIRCLE_DIAMETER_PX / 2;
      const right = document.createElementNS(SVG_NS, 'path');
      right.setAttribute(
        'd',
        `M ${cx} ${cy - radius} A ${radius} ${radius} 0 0 1 ${cx} ${
          cy + radius
        } Z`
      );
      right.setAttribute('fill', 'currentColor');
      group.append(right, circle(cx, cy, false));
      break;
    }
    case 'plus':
      group.append(
        line(cx - half, cy, cx + half, cy),
        line(cx, cy - half, cx, cy + half)
      );
      break;
    case 'cross':
      group.append(
        line(cx - half, cy - half, cx + half, cy + half),
        line(cx - half, cy + half, cx + half, cy - half)
      );
      break;
  }
  return group;
}

/** A note's signs, stacked upward from `bottomY` and centred on `centerX`. */
export function createSignsSvg(
  signs: readonly NoteSign[],
  centerX: number,
  bottomY: number
): SVGGElement {
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('signs');
  signCenterOffsets(signs).forEach((offset, index) => {
    group.appendChild(createSignGlyph(signs[index], centerX, bottomY - offset));
  });
  return group;
}
