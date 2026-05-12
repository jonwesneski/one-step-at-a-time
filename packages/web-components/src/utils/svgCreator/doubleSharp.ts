import { SVG_NS } from '../consts';

export const createDoubleSharpSvg = () => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('width', '10px');
  svg.setAttribute('height', '10px');

  // Two diagonal strokes crossing at center — × shape
  const stroke1 = document.createElementNS(SVG_NS, 'line');
  stroke1.setAttribute('stroke', 'currentColor');
  stroke1.setAttribute('stroke-width', '20');
  stroke1.setAttribute('stroke-linecap', 'round');
  stroke1.setAttribute('x1', '10');
  stroke1.setAttribute('y1', '10');
  stroke1.setAttribute('x2', '90');
  stroke1.setAttribute('y2', '90');
  svg.appendChild(stroke1);

  const stroke2 = document.createElementNS(SVG_NS, 'line');
  stroke2.setAttribute('stroke', 'currentColor');
  stroke2.setAttribute('stroke-width', '20');
  stroke2.setAttribute('stroke-linecap', 'round');
  stroke2.setAttribute('x1', '90');
  stroke2.setAttribute('y1', '10');
  stroke2.setAttribute('x2', '10');
  stroke2.setAttribute('y2', '90');
  svg.appendChild(stroke2);

  return svg;
};
