import { durationToFlagCountMap, svgNS } from './consts';
import { DurationType } from './types';

type NoteProps = {
  duration: DurationType;
  flagsIfNeeded?: boolean;
  stemUp?: boolean;
};
export const createNoteSvgDom = ({
  duration,
  flagsIfNeeded = true,
  stemUp = true,
}: NoteProps) => {
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('xmlns', svgNS);
  svg.setAttribute('width', '37.5px');
  svg.setAttribute('height', '40px');

  const stemStart = 10;
  const stemLength = 25;
  const stemEnd = stemStart + stemLength;
  const x = 10; //todo see if I need this to be dynamic

  if (flagsIfNeeded) {
    // todo need to calculate flags with stemup or not
    const flagCount = durationToFlagCountMap.get(duration) || 0;
    for (let index = 0; index < flagCount; index++) {
      const flagHtml = document.createElementNS(svgNS, 'path');
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

  const stemX = stemUp ? (x + 4).toString() : x.toString();
  const stemHtml = document.createElementNS(svgNS, 'line');
  stemHtml.setAttribute('x1', stemX);
  stemHtml.setAttribute('y1', stemStart.toString());
  stemHtml.setAttribute('x2', stemX);
  stemHtml.setAttribute('y2', stemEnd.toString());
  stemHtml.setAttribute('stroke', 'currentColor');
  stemHtml.setAttribute('stroke-width', '1');
  svg.appendChild(stemHtml);

  const headXStart = stemUp ? x.toString() : (x + 3).toString();
  const headYStart = stemUp ? stemEnd.toString() : stemStart.toString();
  const headFill =
    duration === 'half' || duration === 'whole' ? 'none' : 'currentColor';
  const headHtml = document.createElementNS(svgNS, 'ellipse');
  headHtml.setAttribute('cx', headXStart);
  headHtml.setAttribute('cy', headYStart);
  headHtml.setAttribute('rx', '4');
  headHtml.setAttribute('ry', '3');
  headHtml.setAttribute('transform', `rotate(-20 ${headXStart} ${headYStart})`);
  headHtml.setAttribute('stroke', 'currentColor');
  headHtml.setAttribute('fill', headFill);
  headHtml.setAttribute('stroke-width', '2');
  svg.appendChild(headHtml);

  return svg;
};

export const createChordSvgDom = (duration: DurationType, notes: string[]) => {
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('xmlns', svgNS);
  // svg.setAttribute('width', '37.5px');
  // svg.setAttribute('height', '40px');
  for (const note of notes) {
    const noteSvg = createNoteSvgDom({ duration });
    for (let i = noteSvg.childNodes.length - 1; i >= 0; i--) {
      const child = noteSvg.childNodes[i];
      svg.appendChild(child);
    }
  }
  return svg;
};

export const createNotesBeamSvgDom = (
  duration: Extract<DurationType, 'eighth' | 'sixteenth'>,
  notes: string[]
) => {};

export const createChordBeamSvgDom = (
  duration: Extract<DurationType, 'eighth' | 'sixteenth'>,
  chords: string[]
) => {};
