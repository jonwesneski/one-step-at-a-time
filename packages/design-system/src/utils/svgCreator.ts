import { NoteOrChordElementType } from '../types/elements';
import {
  BeatsInMeasure,
  BeatTypeInMeasure,
  DurationType,
} from '../types/theory';
import { durationToFlagCountMap, SVG_NS } from './consts';

type NoteProps = {
  duration: DurationType;
  noFlags?: boolean;
  stemUp?: boolean;
  qualifiedElementName?: 'svg' | 'g';
  translate?: {
    staffXCoordinate: number;
    staffYCoordinate: number;
  };
};
export const createNoteSvg = ({
  duration,
  noFlags = true,
  stemUp = true,
  qualifiedElementName = 'svg',
  translate = undefined,
}: NoteProps): [SVGElement | SVGGElement, number] => {
  const svg = document.createElementNS(SVG_NS, qualifiedElementName);
  if (qualifiedElementName === 'svg') {
    svg.setAttribute('xmlns', SVG_NS);
  }
  svg.dataset.duration = duration;
  svg.dataset.stemUp = 'true';

  svg.setAttribute('width', '37.5px');
  svg.setAttribute('height', '40px');

  const stemStart = 0;
  const stemLength = 25;
  const stemEnd = stemStart + stemLength;
  const x = 10; //todo see if I need this to be dynamic or maybe just come up with a better name

  if (noFlags) {
    // todo need to calculate flags with stemup or not
    const flagCount = durationToFlagCountMap.get(duration) ?? 0;
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
  if (duration !== 'whole') {
    const stem = document.createElementNS(SVG_NS, 'line');
    stem.classList.add('stem');
    stem.setAttribute('x1', stemX);
    stem.setAttribute('y1', stemStart.toString());
    stem.setAttribute('x2', stemX);
    stem.setAttribute('y2', stemEnd.toString());
    stem.setAttribute('stroke', 'currentColor');
    stem.setAttribute('stroke-width', '1');
    svg.appendChild(stem);
  }

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
    svg.setAttribute('y', yHeadOffset.toString());
  }

  return [svg, yHeadOffset];
};

export const createNoteSvg2 = ({
  duration,
  noFlags = false,
  stemUp = true,
  qualifiedElementName = 'svg',
}: NoteProps): [SVGElement | SVGGElement, number] => {
  const svg = document.createElementNS(SVG_NS, qualifiedElementName);
  if (qualifiedElementName === 'svg') {
    svg.setAttribute('xmlns', SVG_NS);
  }
  svg.dataset.duration = duration;
  svg.dataset.stemUp = 'true';
  const width = 32;
  const height = 40;
  svg.setAttribute('width', `${width}`);
  svg.setAttribute('height', `${height}`);

  // Draw in a 600x750 coordinate space scaled down to the 32x40 viewport via a
  // transform on a wrapper <g>. This avoids viewBox-based sizing quirks when
  // the SVG is nested inside other SVG elements.
  const COORD_WIDTH = 600;
  const scale = width / COORD_WIDTH; // 32/600 — same ratio for both axes (600:750 == 32:40)
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `scale(${scale})`);

  const xStart = 300;
  const yStemStart = 100;
  const stemLength = 400;
  const yStemEnd = yStemStart + stemLength;

  const headWidth = 80;
  const stemX = stemUp ? xStart + headWidth - 15 : xStart;
  const stemWidth = 22;
  if (duration !== 'whole') {
    const stem = document.createElementNS(SVG_NS, 'line');
    stem.classList.add('stem');
    stem.setAttribute('x1', stemX.toString());
    stem.setAttribute('y1', yStemStart.toString());
    stem.setAttribute('x2', stemX.toString());
    stem.setAttribute('y2', yStemEnd.toString());
    stem.setAttribute('stroke', 'currentColor');
    stem.setAttribute('stroke-width', stemWidth.toString());
    g.appendChild(stem);
  }

  const flagCount = durationToFlagCountMap.get(duration) ?? 0;
  if (!noFlags && flagCount > 0) {
    // todo need to calculate flags with stemup or not; assuming stemp fo now
    const xFlagStart = stemX;
    const flag = document.createElementNS(SVG_NS, 'g');
    flag.classList.add('flag');
    const name = 'partial-flag';
    const partialFlag = document.createElementNS(SVG_NS, 'g');
    partialFlag.classList.add(name);
    partialFlag.id = name;
    const yPartialFlagLongStart = yStemStart + 30;
    const partialFlagLong = document.createElementNS(SVG_NS, 'path');
    const xPartialFlagLongEnd = xFlagStart + 110;
    const yPartialFlagLongEnd = yPartialFlagLongStart + 190;
    partialFlagLong.setAttribute(
      'd',
      `M${xFlagStart},${yPartialFlagLongStart} C${xFlagStart + 60},${
        yPartialFlagLongStart + 40
      } ${xFlagStart + 170},${
        yPartialFlagLongStart + 95
      } ${xPartialFlagLongEnd},${yPartialFlagLongEnd}`
    );
    partialFlagLong.setAttribute('fill', 'none');
    partialFlagLong.setAttribute('stroke', 'currentColor');
    partialFlagLong.setAttribute('stroke-width', '30');
    partialFlag.appendChild(partialFlagLong);

    const yPartialFlagTopStart = yStemStart + 20;
    const partialFlagTop = document.createElementNS(SVG_NS, 'path');
    partialFlagTop.setAttribute(
      'd',
      `M${xFlagStart},${yPartialFlagTopStart} C${xFlagStart + 10},${
        yPartialFlagTopStart + 20
      } ${xFlagStart + 35},${yPartialFlagTopStart + 35} ${xFlagStart + 80},${
        yPartialFlagTopStart + 70
      }`
    );
    partialFlagTop.setAttribute('fill', 'none');
    partialFlagTop.setAttribute('stroke', 'currentColor');
    partialFlagTop.setAttribute('stroke-width', '25');
    partialFlag.appendChild(partialFlagTop);
    flag.appendChild(partialFlag);

    let yPartialFlagTailStart = yPartialFlagLongEnd;
    for (let i = 0; i < flagCount - 1; i++) {
      const flagCopy = document.createElementNS(SVG_NS, 'use');
      const y = 80 * (i + 1);
      yPartialFlagTailStart = yPartialFlagLongEnd + y;
      flagCopy.setAttribute('href', `#${name}`);
      flagCopy.setAttribute('y', y.toString());
      flag.appendChild(flagCopy);
    }

    const partialFlagTail = document.createElementNS(SVG_NS, 'line');
    partialFlagTail.setAttribute('x1', (xPartialFlagLongEnd + 5).toString());
    partialFlagTail.setAttribute('y1', (yPartialFlagTailStart - 5).toString());
    partialFlagTail.setAttribute('x2', (xPartialFlagLongEnd - 40).toString());
    partialFlagTail.setAttribute('y2', (yPartialFlagTailStart + 50).toString());
    partialFlagTail.setAttribute('fill', 'none');
    partialFlagTail.setAttribute('stroke', 'currentColor');
    partialFlagTail.setAttribute('stroke-width', '28');
    flag.appendChild(partialFlagTail);

    g.appendChild(flag);
  }

  const headXStartStr = stemUp
    ? xStart.toString()
    : (xStart + stemWidth).toString();
  const headYStartStr = stemUp ? yStemEnd.toString() : headWidth.toString();
  const headFill =
    duration === 'half' || duration === 'whole' ? 'none' : 'currentColor';
  const head = document.createElementNS(SVG_NS, 'ellipse');
  head.classList.add('head');
  head.setAttribute('cx', headXStartStr);
  head.setAttribute('cy', headYStartStr);
  head.setAttribute('rx', headWidth.toString());
  head.setAttribute('ry', (headWidth * 0.75).toString());
  head.setAttribute(
    'transform',
    `rotate(-30 ${headXStartStr} ${headYStartStr})`
  );
  head.setAttribute('stroke', 'currentColor');
  head.setAttribute('fill', headFill);
  head.setAttribute('stroke-width', '2');
  g.appendChild(head);

  svg.appendChild(g);

  const yHeadOffset = stemUp ? height - 3 : 7;
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
  noFlags = true,
  stemUp = true,
}: ChordProps): [SVGElement | SVGGElement, number] => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('chord');
  svg.dataset.duration = duration;

  const mathFunc = stemUp ? Math.min : Math.max;
  let currentY = stemUp ? Infinity : -Infinity;
  for (const staffYCoordinate of staffYCoordinates) {
    const [noteSvg, yOffset] = createNoteSvg2({
      duration,
      noFlags,
      stemUp,
      qualifiedElementName: 'svg',
      translate: {
        staffXCoordinate,
        staffYCoordinate,
      },
    });
    currentY = mathFunc(currentY, yOffset);
    noteSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    noteSvg.setAttribute('y', (10 + staffYCoordinate - yOffset).toString());
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

// Stem geometry constants derived from createNoteSvg2's 600-unit coordinate space
// scaled down to the 32px note SVG viewport. Used to compute beam attachment points.
const NOTE_SCALE = 32 / 600;
export const NOTE_STEM_X_OFFSET = 365 * NOTE_SCALE; // stem x within a note SVG (~19.47px)
export const NOTE_STEM_TIP_Y_OFFSET = 100 * NOTE_SCALE; // stem tip y for stem-up (~5.33px)

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

  static ifNecessary(
    elements: NoteOrChordElementType[] | SVGElement[]
  ): BeamCreator | null {
    const consecutives: number[] = [];
    let beamCreator: BeamCreator | null = null;
    for (let i = 0; i < elements.length; i++) {
      const duration =
        elements[i].nodeName === 'MUSIC-NOTE' ||
        elements[i].nodeName === 'MUSIC-CHORD'
          ? elements[i].getAttribute('duration')
          : elements[i].dataset.duration;
      if (
        duration === 'eighth' ||
        duration === 'sixteenth' ||
        duration === 'thirtysecond'
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

  // x, y are in #notesContainer's coordinate space (1:1 with CSS px).
  // Call with 'start' for the first beamed note and 'end' for the last.
  updateBeamCoordinates(x: number, y: number, which: 'start' | 'end') {
    if (which === 'start') {
      this.x1 = x;
      this.y1 = y;
    } else {
      this.x2 = x;
      this.y2 = y;
    }
  }

  buildBeams(): SVGGElement {
    const thickness = 8;
    const g = document.createElementNS(SVG_NS, 'g');
    g.classList.add('beam');
    const polygon = document.createElementNS(SVG_NS, 'polygon');
    polygon.setAttribute('fill', 'currentColor');
    polygon.setAttribute(
      'points',
      `${this.x1},${this.y1} ${this.x1},${this.y1 + thickness} ${this.x2},${
        this.y2 + thickness
      } ${this.x2},${this.y2}`
    );
    g.appendChild(polygon);
    return g;
  }

  reSpaceBeam(beamGroup: SVGGElement) {
    const polygon = beamGroup.querySelector('polygon');
    if (!polygon) return;
    const pointsArray = polygon.getAttribute('points')?.split(' ');
    if (!pointsArray) return;
    const yLeft = pointsArray[0].split(',')[1];
    const yLeftBottom = pointsArray[1].split(',')[1];
    const yRightBottom = pointsArray[2].split(',')[1];
    const yRight = pointsArray[3].split(',')[1];
    polygon.setAttribute(
      'points',
      `${this.x1},${yLeft} ${this.x1},${yLeftBottom} ${this.x2},${yRightBottom} ${this.x2},${yRight}`
    );
  }
}
