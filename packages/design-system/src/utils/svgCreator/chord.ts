import { SVG_NS } from '../consts';
import { createNoteSvg, type NoteProps } from './note';

type ChordProps = NoteProps & {
  staffYCoordinates: number[];
};
export const createChordSvg = ({
  duration,
  staffYCoordinates,
  noFlags = false,
  stemUp = true,
  stemExtension = 0,
}: ChordProps): [SVGElement | SVGGElement, number] => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('chord');
  svg.dataset.duration = duration;

  // For stem-up the stem belongs to the bottommost note (highest staffY);
  // for stem-down it belongs to the topmost note (lowest staffY).
  const stemNoteY = stemUp
    ? Math.max(...staffYCoordinates)
    : Math.min(...staffYCoordinates);

  let extremalYOffset = 0;
  for (const staffYCoordinate of staffYCoordinates) {
    const isExtremal = staffYCoordinate === stemNoteY;
    const [noteSvg, yOffset] = createNoteSvg({
      duration,
      noFlags,
      noStem: !isExtremal,
      stemUp,
      stemExtension: isExtremal ? stemExtension : 0,
      qualifiedElementName: 'svg',
    });
    if (isExtremal) extremalYOffset = yOffset;
    noteSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    noteSvg.setAttribute('y', (10 + staffYCoordinate - yOffset).toString());
    svg.appendChild(noteSvg);
  }
  return [svg, extremalYOffset];
};

export const createSharpSvg = () => {
  const sharpSvg = document.createElementNS(SVG_NS, 'svg');
  sharpSvg.setAttribute('viewBox', '0 0 100 300');
  sharpSvg.setAttribute('width', '10px');
  sharpSvg.setAttribute('height', '30px');

  const topHorizontal = document.createElementNS(SVG_NS, 'line');
  topHorizontal.setAttribute('stroke', 'currentColor');
  topHorizontal.setAttribute('stroke-width', '30');
  topHorizontal.setAttribute('x1', '0');
  topHorizontal.setAttribute('y1', '120');
  topHorizontal.setAttribute('x2', '100');
  topHorizontal.setAttribute('y2', '70');
  sharpSvg.appendChild(topHorizontal);

  const bottomHorizontal = document.createElementNS(SVG_NS, 'line');
  bottomHorizontal.setAttribute('stroke', 'currentColor');
  bottomHorizontal.setAttribute('stroke-width', '30');
  bottomHorizontal.setAttribute('x1', '0');
  bottomHorizontal.setAttribute('y1', '220');
  bottomHorizontal.setAttribute('x2', '100');
  bottomHorizontal.setAttribute('y2', '170');
  sharpSvg.appendChild(bottomHorizontal);

  const leftVertical = document.createElementNS(SVG_NS, 'line');
  leftVertical.setAttribute('stroke', 'currentColor');
  leftVertical.setAttribute('stroke-width', '15');
  leftVertical.setAttribute('x1', '30');
  leftVertical.setAttribute('y1', '20');
  leftVertical.setAttribute('x2', '30');
  leftVertical.setAttribute('y2', '300');
  sharpSvg.appendChild(leftVertical);

  const rightVertical = document.createElementNS(SVG_NS, 'line');
  rightVertical.setAttribute('stroke', 'currentColor');
  rightVertical.setAttribute('stroke-width', '15');
  rightVertical.setAttribute('x1', '70');
  rightVertical.setAttribute('y1', '0');
  rightVertical.setAttribute('x2', '70');
  rightVertical.setAttribute('y2', '280');
  sharpSvg.appendChild(rightVertical);

  return sharpSvg;
};
