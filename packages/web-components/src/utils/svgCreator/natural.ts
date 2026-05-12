import { SVG_NS } from '../consts';

export const createNaturalSvg = () => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 300');
  svg.setAttribute('width', '10px');
  svg.setAttribute('height', '30px');

  // Left vertical line — extends from top of symbol down past the bottom crossbar
  const leftVertical = document.createElementNS(SVG_NS, 'line');
  leftVertical.setAttribute('stroke', 'currentColor');
  leftVertical.setAttribute('stroke-width', '20');
  leftVertical.setAttribute('x1', '20');
  leftVertical.setAttribute('y1', '0');
  leftVertical.setAttribute('x2', '20');
  leftVertical.setAttribute('y2', '260');
  svg.appendChild(leftVertical);

  // Right vertical line — extends from the top crossbar down to the bottom
  const rightVertical = document.createElementNS(SVG_NS, 'line');
  rightVertical.setAttribute('stroke', 'currentColor');
  rightVertical.setAttribute('stroke-width', '20');
  rightVertical.setAttribute('x1', '80');
  rightVertical.setAttribute('y1', '40');
  rightVertical.setAttribute('x2', '80');
  rightVertical.setAttribute('y2', '300');
  svg.appendChild(rightVertical);

  // Top crossbar — connects top of right vertical to left vertical (angled slightly)
  const topCrossbar = document.createElementNS(SVG_NS, 'line');
  topCrossbar.setAttribute('stroke', 'currentColor');
  topCrossbar.setAttribute('stroke-width', '60');
  topCrossbar.setAttribute('x1', '20');
  topCrossbar.setAttribute('y1', '120');
  topCrossbar.setAttribute('x2', '80');
  topCrossbar.setAttribute('y2', '80');
  svg.appendChild(topCrossbar);

  // Bottom crossbar — connects left vertical to bottom of right vertical (angled slightly)
  const bottomCrossbar = document.createElementNS(SVG_NS, 'line');
  bottomCrossbar.setAttribute('stroke', 'currentColor');
  bottomCrossbar.setAttribute('stroke-width', '60');
  bottomCrossbar.setAttribute('x1', '20');
  bottomCrossbar.setAttribute('y1', '220');
  bottomCrossbar.setAttribute('x2', '80');
  bottomCrossbar.setAttribute('y2', '180');
  svg.appendChild(bottomCrossbar);

  return svg;
};
