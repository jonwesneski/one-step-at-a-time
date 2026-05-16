import { SVG_NS } from '../consts';

export const createDoubleFlatSvg = () => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 180 300');
  svg.setAttribute('width', '18px');
  svg.setAttribute('height', '25px');

  // Left flat: vertical stem
  const leftStem = document.createElementNS(SVG_NS, 'line');
  leftStem.setAttribute('stroke', 'currentColor');
  leftStem.setAttribute('stroke-width', '25');
  leftStem.setAttribute('x1', '0');
  leftStem.setAttribute('y1', '0');
  leftStem.setAttribute('x2', '0');
  leftStem.setAttribute('y2', '300');
  svg.appendChild(leftStem);

  // Left flat: loop
  const leftLoop = document.createElementNS(SVG_NS, 'path');
  leftLoop.setAttribute('stroke', 'currentColor');
  leftLoop.setAttribute('stroke-width', '20');
  leftLoop.setAttribute('fill', 'none');
  leftLoop.setAttribute('d', 'M0,250 C9,100 150,150 0,299');
  svg.appendChild(leftLoop);

  // Right flat: vertical stem (offset by ~90px for two flat loops side by side)
  const rightStem = document.createElementNS(SVG_NS, 'line');
  rightStem.setAttribute('stroke', 'currentColor');
  rightStem.setAttribute('stroke-width', '25');
  rightStem.setAttribute('x1', '90');
  rightStem.setAttribute('y1', '0');
  rightStem.setAttribute('x2', '90');
  rightStem.setAttribute('y2', '300');
  svg.appendChild(rightStem);

  // Right flat: loop
  const rightLoop = document.createElementNS(SVG_NS, 'path');
  rightLoop.setAttribute('stroke', 'currentColor');
  rightLoop.setAttribute('stroke-width', '20');
  rightLoop.setAttribute('fill', 'none');
  rightLoop.setAttribute('d', 'M90,250 C99,100 240,150 90,299');
  svg.appendChild(rightLoop);

  return svg;
};
