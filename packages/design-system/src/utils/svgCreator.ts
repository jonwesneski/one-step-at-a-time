import { NoteOrChordElementType } from '../types/elements';
import {
  BeatsInMeasure,
  BeatTypeInMeasure,
  DurationType,
} from '../types/theory';
import { durationToFlagCountMap, SVG_NS } from './consts';

// Stem geometry constants derived from createNoteSvg()'s 600-unit coordinate space
// scaled down to the 32px note SVG viewport. Used to compute beam attachment points.
const NOTE_SVG_WIDTH = 32;
// Draw in a 600x750 coordinate space scaled down to the 32x40 viewport via a
// transform on a wrapper <g>. This avoids viewBox-based sizing quirks when
// the SVG is nested inside other SVG elements.
const COORD_WIDTH = 600;
// 32/600 — same ratio for both axes (600:750 == 32:40)
const NOTE_SCALE = NOTE_SVG_WIDTH / COORD_WIDTH;
const NOTE_STEM_X_OFFSET = 365 * NOTE_SCALE; // stem x within a note SVG (~19.47px)
const NOTE_Y_STEM_START = 100;
const NOTE_STEM_TIP_Y_OFFSET = NOTE_Y_STEM_START * NOTE_SCALE; // stem tip y for stem-up (~5.33px)

type NoteProps = {
  duration: DurationType;
  noFlags?: boolean;
  stemUp?: boolean;
  qualifiedElementName?: 'svg' | 'g';
};
export const createNoteSvg = ({
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
  svg.dataset.stemUp = `${stemUp}`;
  const height = 40;
  svg.setAttribute('width', `${NOTE_SVG_WIDTH}`);
  svg.setAttribute('height', `${height}`);

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `scale(${NOTE_SCALE})`);

  const xStart = COORD_WIDTH / 2;
  const stemLength = 400;
  const yStemEnd = NOTE_Y_STEM_START + stemLength;
  const headWidth = 80;

  // Stem
  const stemX = stemUp ? xStart + headWidth - 15 : xStart;
  const stemWidth = 22;
  if (duration !== 'whole') {
    const stem = document.createElementNS(SVG_NS, 'line');
    stem.classList.add('stem');
    stem.setAttribute('x1', stemX.toString());
    stem.setAttribute('y1', NOTE_Y_STEM_START.toString());
    stem.setAttribute('x2', stemX.toString());
    stem.setAttribute('y2', yStemEnd.toString());
    stem.setAttribute('stroke', 'currentColor');
    stem.setAttribute('stroke-width', stemWidth.toString());
    g.appendChild(stem);
  }

  // Flag(s)
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
    const yPartialFlagLongStart = NOTE_Y_STEM_START + 30;
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

    const yPartialFlagTopStart = NOTE_Y_STEM_START + 20;
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

  // Head
  const headXStartStr = stemUp
    ? (xStart - 10).toString()
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
  head.setAttribute('stroke-width', '30');
  g.appendChild(head);

  svg.appendChild(g);

  const yHeadOffset = stemUp ? height - 3 : 7;
  return [svg, yHeadOffset];
};

type ChordProps = NoteProps & {
  staffYCoordinates: number[];
};
export const createChordSvg = ({
  duration,
  staffYCoordinates,
  noFlags = false,
  stemUp = true,
}: ChordProps): [SVGElement | SVGGElement, number] => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('chord');
  svg.dataset.duration = duration;

  const mathFunc = stemUp ? Math.min : Math.max;
  let currentY = stemUp ? Infinity : -Infinity;
  for (const staffYCoordinate of staffYCoordinates) {
    const [noteSvg, yOffset] = createNoteSvg({
      duration,
      noFlags,
      stemUp,
      qualifiedElementName: 'svg',
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

export class BeamCreator {
  static #thickness = 8;
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
    // todo: i probably need to account for stemdown
    if (which === 'start') {
      this.x1 = x + NOTE_STEM_X_OFFSET;
      this.y1 = y + NOTE_STEM_TIP_Y_OFFSET;
    } else {
      this.x2 = x + NOTE_STEM_X_OFFSET;
      this.y2 = y + NOTE_STEM_TIP_Y_OFFSET;
    }
  }

  buildBeams(): SVGGElement {
    const g = document.createElementNS(SVG_NS, 'g');
    g.classList.add('beam-group');

    const leftTop = `${this.x1},${this.y1}`;
    const leftBottom = `${this.x1},${this.y1 + BeamCreator.#thickness}`;
    const rightBottom = `${this.x2},${this.y2 + BeamCreator.#thickness}`;
    const rightTop = `${this.x2},${this.y2}`;

    const polygon = document.createElementNS(SVG_NS, 'polygon');
    polygon.setAttribute('fill', 'currentColor');
    polygon.setAttribute(
      'points',
      `${leftTop} ${leftBottom} ${rightBottom} ${rightTop}`
    );
    g.appendChild(polygon);
    return g;
  }

  respaceBeam(beamGroup: SVGGElement) {
    const polygon = beamGroup.querySelector('polygon');
    if (!polygon) return;

    polygon.setAttribute(
      'points',
      `${this.x1},${this.y1} ${this.x1},${this.y1 + BeamCreator.#thickness} ${
        this.x2
      },${this.y2 + BeamCreator.#thickness} ${this.x2},${this.y2}`
    );
  }
}
