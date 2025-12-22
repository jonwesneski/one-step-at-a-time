import { NoteOrChordElementType } from '../types/elements';
import {
  BeatsInMeasure,
  BeatTypeInMeasure,
  DurationType,
} from '../types/theory';
import { durationToFlagCountMap, SVG_NS } from './consts';

type NoteProps = {
  duration: DurationType;
  flagsIfNeeded?: boolean;
  stemUp?: boolean;
  qualifiedElementName?: 'svg' | 'g';
  translate?: {
    staffXCoordinate: number;
    staffYCoordinate: number;
  };
};
export const createNoteSvg = ({
  duration,
  flagsIfNeeded = true,
  stemUp = true,
  qualifiedElementName = 'svg',
  translate = undefined,
}: NoteProps): [SVGElement | SVGGElement, number] => {
  const svg = document.createElementNS(SVG_NS, qualifiedElementName);
  if (qualifiedElementName === 'svg') {
    svg.setAttribute('xmlns', SVG_NS);
  }
  svg.dataset.duration = duration;
  svg.setAttribute('width', '37.5px');
  svg.setAttribute('height', '40px');

  const stemStart = 0;
  const stemLength = 25;
  const stemEnd = stemStart + stemLength;
  const x = 10; //todo see if I need this to be dynamic or maybe just come up with a better name

  if (flagsIfNeeded) {
    // todo need to calculate flags with stemup or not
    const flagCount = durationToFlagCountMap.get(duration) || 0;
    for (let index = 0; index < flagCount; index++) {
      const flag = document.createElementNS(SVG_NS, 'path');
      flag.classList.add('flag');
      const y = stemEnd - 5 * index;
      flag.setAttribute(
        'd',
        `M ${x} ${y} Q ${x + 8} ${y - 2} ${x + 6} ${y + 5}`
      );
      flag.setAttribute('fill', 'currentColor');
      flag.setAttribute('stroke', 'none');
      svg.appendChild(flag);
    }
  }

  const headWidth = 4;
  const stemX = stemUp ? (x + headWidth).toString() : x.toString();
  const stem = document.createElementNS(SVG_NS, 'line');
  stem.classList.add('stem');
  stem.setAttribute('x1', stemX);
  stem.setAttribute('y1', stemStart.toString());
  stem.setAttribute('x2', stemX);
  stem.setAttribute('y2', stemEnd.toString());
  stem.setAttribute('stroke', 'currentColor');
  stem.setAttribute('stroke-width', '1');
  svg.appendChild(stem);

  const headXStartStr = stemUp ? x.toString() : (x + 3).toString();
  const headYStartStr = stemUp ? stemEnd.toString() : headWidth.toString();
  const headFill =
    duration === 'half' || duration === 'whole' ? 'none' : 'currentColor';
  const head = document.createElementNS(SVG_NS, 'ellipse');
  head.classList.add('head');
  head.setAttribute('cx', headXStartStr);
  head.setAttribute('cy', headYStartStr);
  head.setAttribute('rx', headWidth.toString());
  head.setAttribute('ry', '3');
  head.setAttribute(
    'transform',
    `rotate(-20 ${headXStartStr} ${headYStartStr})`
  );
  head.setAttribute('stroke', 'currentColor');
  head.setAttribute('fill', headFill);
  head.setAttribute('stroke-width', '2');
  svg.appendChild(head);

  let yHeadOffset = NaN;
  if (translate) {
    yHeadOffset = stemUp
      ? translate.staffYCoordinate - stemLength
      : translate.staffYCoordinate - headWidth;
    svg.setAttribute('x', translate.staffXCoordinate.toString());
    svg.setAttribute('y', yHeadOffset.toString());
  }

  return [svg, yHeadOffset];
};

type ChordProps = Omit<NoteProps, 'translate'> & {
  staffXCoordinate: number;
  staffYCoordinates: number[];
};
export const createChordSvg = ({
  duration,
  staffXCoordinate,
  staffYCoordinates,
  flagsIfNeeded = true,
  stemUp = true,
}: ChordProps): [SVGElement | SVGGElement, number] => {
  const svg = document.createElementNS(SVG_NS, 'g');
  svg.classList.add('chord');

  const mathFunc = stemUp ? Math.min : Math.max;
  let currentY = stemUp ? Infinity : -Infinity;
  for (const staffYCoordinate of staffYCoordinates) {
    const [noteSvg, yOffset] = createNoteSvg({
      duration,
      flagsIfNeeded,
      stemUp,
      qualifiedElementName: 'svg',
      translate: {
        staffXCoordinate,
        staffYCoordinate,
      },
    });
    currentY = mathFunc(currentY, yOffset);
    svg.appendChild(noteSvg);
  }
  return [svg, currentY];
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

export const createTimeSignatureSvg = (
  numerator: BeatsInMeasure,
  denominator: BeatTypeInMeasure
) => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'time-signature');
  svg.setAttribute('height', '80px');

  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', '40');
  text.setAttribute('font-family', 'Leland, Bravura, serif');
  text.setAttribute('font-size', '28');
  text.setAttribute('font-weight', 'bold');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('fill', 'currentColor');

  const numeratorTspan = document.createElementNS(SVG_NS, 'tspan');
  numeratorTspan.setAttribute('x', '20');
  numeratorTspan.setAttribute('dy', '20');
  numeratorTspan.textContent = numerator.toString();
  text.appendChild(numeratorTspan);

  const denominatorTspan = document.createElementNS(SVG_NS, 'tspan');
  denominatorTspan.setAttribute('x', '20');
  denominatorTspan.setAttribute('dy', '20');
  denominatorTspan.textContent = denominator.toString();
  text.appendChild(denominatorTspan);

  svg.appendChild(text);

  return svg;
};

export class BeamCreator {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  constructor() {
    this.x1 = NaN;
    this.x2 = NaN;
    this.y1 = NaN;
    this.y2 = NaN;
  }

  static ifNecessary(elements: NoteOrChordElementType[]) {
    const consecutives: number[] = [];
    let beamCreator: BeamCreator | null = null;
    for (let i = 0; i < elements.length; i++) {
      if (
        elements[i].duration === 'eighth' ||
        elements[i].duration === 'sixteenth' ||
        elements[i].duration === 'thirtysecond'
      ) {
        if (consecutives.length === 0) {
          consecutives.push(i);
        } else if (consecutives[i - 1] !== undefined) {
          consecutives.push(i);
        }
      }
    }
    if (consecutives.length && consecutives.length % 2 === 0) {
      beamCreator = new BeamCreator();
    }
    return beamCreator;
  }

  updateBeamCoordinates(props: {
    noteSvg: SVGElement;
    xOffsetOfNote: number;
    stemUp: boolean;
    yOffset: number;
    xAttribute: 'x1' | 'x2';
    yAttribute: 'y1' | 'y2';
  }) {
    const stemSvg = props.noteSvg.querySelector('.stem');
    const x =
      props.xOffsetOfNote + parseInt(stemSvg?.getAttribute('x1') || '0');
    const stemYAttribute = props.stemUp ? 'y1' : 'y2';
    const y = props.stemUp
      ? props.yOffset - 1
      : props.yOffset + parseInt(stemSvg?.getAttribute(stemYAttribute) || '0');

    this[props.xAttribute] = x;
    this[props.yAttribute] = y;
  }

  buildBeams() {
    const thickness = 8;
    const beam = document.createElementNS(SVG_NS, 'polygon');
    beam.classList.add('beam');
    beam.setAttribute('fill', 'currentColor');
    const leftTop = `${this.x1},${this.y1}`;
    const leftBottom = `${this.x1},${this.y1 + thickness}`;
    const rightBottom = `${this.x2},${this.y2 + thickness}`;
    const rightTop = `${this.x2},${this.y2}`;
    beam.setAttribute(
      'points',
      `${leftTop} ${leftBottom} ${rightBottom} ${rightTop}`
    );

    return beam;
  }
}
