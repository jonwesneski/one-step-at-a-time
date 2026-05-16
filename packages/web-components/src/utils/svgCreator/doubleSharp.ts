import { SVG_NS } from '../consts';

export const createDoubleSharpSvg = () => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('width', '10px');
  svg.setAttribute('height', '10px');

  const path = document.createElementNS(SVG_NS, 'path');
  // each row groups the points of one arm of the double-sharp (top, right, bottom, left)
  path.setAttribute(
    'd',
    `M 5,5
     L 35,5  L 49,35  L 51,35  L 65,5
     L 95,5  L 95,35  L 65,49  L 65,51
     L 95,65 L 95,95  L 65,95  L 51,65
     L 49,65 L 35,95  L 5,95   L 5,65
     L 35,51 L 35,49  L 5,35 Z`
  );
  path.setAttribute('fill', 'currentColor');
  svg.appendChild(path);

  return svg;
};
