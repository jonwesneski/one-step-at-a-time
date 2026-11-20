import { SVG_NS } from '../consts';

/**
 * A filled crescent parenthesis in the box from (x, top), `width` wide and
 * `height` tall, bulging away from what it encloses.
 */
export function createParenthesisSvg(
  side: 'open' | 'close',
  x: number,
  top: number,
  width: number,
  height: number
): SVGPathElement {
  const bottom = top + height;
  const middle = top + height / 2;
  // The outer curve reaches past the box edge so the crescent's thickest
  // point sits on it; the inner curve is shallower, leaving a thin stroke.
  const [tip, outer, inner] =
    side === 'open'
      ? [x + width, x - width * 0.6, x + width * 0.15]
      : [x, x + width * 1.6, x + width * 0.85];
  const path = document.createElementNS(SVG_NS, 'path');
  path.classList.add(`parenthesis-${side}`);
  path.setAttribute(
    'd',
    `M ${tip} ${top} Q ${outer} ${middle} ${tip} ${bottom} Q ${inner} ${middle} ${tip} ${top} Z`
  );
  path.setAttribute('fill', 'currentColor');
  return path;
}
