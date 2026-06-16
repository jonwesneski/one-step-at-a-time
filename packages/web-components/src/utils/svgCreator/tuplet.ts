import type { TupletBracketGeometry } from '../../rules/tupletRules';
import { SVG_NS } from '../consts';
import {
  TUPLET_BRACKET_STROKE_WIDTH,
  TUPLET_NUMERAL_FONT_SIZE,
  TUPLET_NUMERAL_GAP_PX,
} from '../notationDimensions';

function bracketYAtX(
  x: number,
  startX: number,
  baseY: number,
  angle: number
): number {
  return baseY + (x - startX) * angle;
}

function appendLine(
  parent: SVGGElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): void {
  const line = document.createElementNS(SVG_NS, 'line');
  line.classList.add('tuplet-bracket');
  line.setAttribute('x1', `${x1}`);
  line.setAttribute('y1', `${y1}`);
  line.setAttribute('x2', `${x2}`);
  line.setAttribute('y2', `${y2}`);
  line.setAttribute('stroke', 'currentColor');
  line.setAttribute('stroke-width', `${TUPLET_BRACKET_STROKE_WIDTH}`);
  line.setAttribute('stroke-linecap', 'round');
  parent.appendChild(line);
}

export function createTupletBracketSvg(
  geometry: TupletBracketGeometry
): SVGGElement {
  const {
    startX,
    endX,
    baseY,
    stemUp,
    angle,
    omitBracket,
    numeralX,
    numeralY,
    hookLength,
    group: { parsedRatio },
  } = geometry;

  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('tuplet-group');

  const yAt = (x: number) => bracketYAtX(x, startX, baseY, angle);

  // Hooks point toward the notes: if bracket is above (stemUp=true), hooks point down (+Y).
  // If bracket is below (stemUp=false), hooks point up (-Y).
  const hookDir = stemUp ? 1 : -1;

  if (!omitBracket) {
    const gapHalf = TUPLET_NUMERAL_GAP_PX / 2;
    const leftArmEndX = numeralX - gapHalf;
    const rightArmStartX = numeralX + gapHalf;

    // Only draw arms if there is room (bracket wider than numeral gap)
    const bracketWidth = endX - startX;
    const hasRoom = bracketWidth > TUPLET_NUMERAL_GAP_PX + 4;

    if (hasRoom) {
      // Left arm
      appendLine(group, startX, yAt(startX), leftArmEndX, yAt(leftArmEndX));
      // Left hook
      appendLine(
        group,
        startX,
        yAt(startX),
        startX,
        yAt(startX) + hookDir * hookLength
      );
      // Right arm
      appendLine(group, rightArmStartX, yAt(rightArmStartX), endX, yAt(endX));
      // Right hook
      appendLine(
        group,
        endX,
        yAt(endX),
        endX,
        yAt(endX) + hookDir * hookLength
      );
    }
  }

  // Numeral (always rendered)
  const text = document.createElementNS(SVG_NS, 'text');
  text.classList.add('tuplet-numeral');
  text.setAttribute('x', `${numeralX}`);
  text.setAttribute('y', `${numeralY}`);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'middle');
  text.setAttribute('font-style', 'italic');
  text.setAttribute('font-size', `${TUPLET_NUMERAL_FONT_SIZE}`);
  text.setAttribute('fill', 'currentColor');
  text.textContent = parsedRatio.displayString;
  group.appendChild(text);

  return group;
}
