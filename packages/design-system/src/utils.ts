import { durationToFlagCountMap, SVG_NS } from './consts';
import { DurationType } from './types';

type NoteProps = {
  duration: DurationType;
  flagsIfNeeded?: boolean;
  stemUp?: boolean;
  qualifiedElementName?: 'svg' | 'g';
};
export const createNoteSvg = ({
  duration,
  flagsIfNeeded = true,
  stemUp = true,
  qualifiedElementName = 'svg',
}: NoteProps) => {
  const svg = document.createElementNS(SVG_NS, qualifiedElementName);
  if (qualifiedElementName === 'svg') {
    svg.setAttribute('xmlns', SVG_NS);
    //svg.setAttribute('viewBox', '8 8 12 30');
  }

  svg.setAttribute('width', '37.5px');
  svg.setAttribute('height', '40px');

  const stemStart = 0;
  const stemLength = 25;
  const stemEnd = stemStart + stemLength;
  const headWidth = 4;
  const x = 10; //todo see if I need this to be dynamic or maybe just come up with a better name

  if (flagsIfNeeded) {
    // todo need to calculate flags with stemup or not
    const flagCount = durationToFlagCountMap.get(duration) || 0;
    for (let index = 0; index < flagCount; index++) {
      const flagHtml = document.createElementNS(SVG_NS, 'path');
      const y = stemEnd - 5 * index;
      flagHtml.setAttribute(
        'd',
        `M ${x} ${y} Q ${x + 8} ${y - 2} ${x + 6} ${y + 5}`
      );
      flagHtml.setAttribute('fill', 'currentColor');
      flagHtml.setAttribute('stroke', 'none');
      svg.appendChild(flagHtml);
    }
  }

  const stemX = stemUp ? (x + headWidth).toString() : x.toString();
  const stemHtml = document.createElementNS(SVG_NS, 'line');
  stemHtml.setAttribute('class', 'stem');
  stemHtml.setAttribute('x1', stemX);
  stemHtml.setAttribute('y1', stemStart.toString());
  stemHtml.setAttribute('x2', stemX);
  stemHtml.setAttribute('y2', stemEnd.toString());
  stemHtml.setAttribute('stroke', 'currentColor');
  stemHtml.setAttribute('stroke-width', '1');
  svg.appendChild(stemHtml);

  const headXStartStr = stemUp ? x.toString() : (x + 3).toString();
  const headYStartStr = stemUp
    ? stemEnd.toString()
    : (stemStart - 4).toString();
  const headFill =
    duration === 'half' || duration === 'whole' ? 'none' : 'currentColor';
  const headHtml = document.createElementNS(SVG_NS, 'ellipse');
  headHtml.setAttribute('cx', headXStartStr);
  headHtml.setAttribute('cy', headYStartStr);
  headHtml.setAttribute('rx', headWidth.toString());
  headHtml.setAttribute('ry', '3');
  headHtml.setAttribute(
    'transform',
    `rotate(-20 ${headXStartStr} ${headYStartStr})`
  );
  headHtml.setAttribute('stroke', 'currentColor');
  headHtml.setAttribute('fill', headFill);
  headHtml.setAttribute('stroke-width', '2');
  svg.appendChild(headHtml);

  return svg;
};

export const createChordSvg = (duration: DurationType, notes: string[]) => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  // svg.setAttribute('width', '37.5px');
  // svg.setAttribute('height', '40px');
  for (const note of notes) {
    const noteSvg = createNoteSvg({ duration });
    for (let i = noteSvg.childNodes.length - 1; i >= 0; i--) {
      const child = noteSvg.childNodes[i];
      svg.appendChild(child);
    }
  }
  return svg;
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

export const createFlatSvg = () => {
  const sharpSvg = document.createElementNS(SVG_NS, 'svg');
  sharpSvg.setAttribute('viewBox', '0 0 100 300');
  sharpSvg.setAttribute('width', '10px');
  sharpSvg.setAttribute('height', '25px');

  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('stroke', 'currentColor');
  line.setAttribute('stroke-width', '25');
  line.setAttribute('x1', '0');
  line.setAttribute('y1', '0');
  line.setAttribute('x2', '0');
  line.setAttribute('y2', '300');
  sharpSvg.appendChild(line);

  const loop = document.createElementNS(SVG_NS, 'path');
  loop.setAttribute('stroke', 'currentColor');
  loop.setAttribute('stroke-width', '20');
  loop.setAttribute('fill', 'none');
  loop.setAttribute('d', 'M0,250 C9,100 150,150 0,299');
  sharpSvg.appendChild(loop);

  return sharpSvg;
};
