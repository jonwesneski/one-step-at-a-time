import {
  type TupletBracketGeometry,
  type TupletDisplay,
  tupletDisplayOf,
  tupletLabelGapPx,
} from '../../rules/tupletRules';
import { SVG_NS } from '../consts';
import {
  TUPLET_BRACKET_STROKE_WIDTH,
  TUPLET_NOTE_VALUE_SCALE,
  TUPLET_NUMERAL_FONT_SIZE,
} from '../notationDimensions';
import { createNoteSvg } from './note';

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
    hookDirections,
  } = geometry;
  const display = tupletDisplayOf(geometry.group);

  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('tuplet-group');

  const yAt = (x: number) => bracketYAtX(x, startX, baseY, angle);

  // Hooks point toward the notes: if bracket is above (stemUp=true), hooks point down (+Y).
  // If bracket is below (stemUp=false), hooks point up (-Y).
  const hookDir = stemUp ? 1 : -1;
  const startHookDir = hookDirections?.start ?? hookDir;
  const endHookDir = hookDirections?.end ?? hookDir;

  if (!omitBracket) {
    const gap = tupletLabelGapPx(display);
    const leftArmEndX = numeralX - gap / 2;
    const rightArmStartX = numeralX + gap / 2;

    // Only draw arms if there is room (bracket wider than numeral gap)
    const bracketWidth = endX - startX;
    const hasRoom = bracketWidth > gap + 4;

    if (hasRoom) {
      // Left arm
      appendLine(group, startX, yAt(startX), leftArmEndX, yAt(leftArmEndX));
      // Left hook
      appendLine(
        group,
        startX,
        yAt(startX),
        startX,
        yAt(startX) + startHookDir * hookLength
      );
      // Right arm
      appendLine(group, rightArmStartX, yAt(rightArmStartX), endX, yAt(endX));
      // Right hook
      appendLine(
        group,
        endX,
        yAt(endX),
        endX,
        yAt(endX) + endHookDir * hookLength
      );
    }
  }

  group.appendChild(
    createTupletLabel(numeralX, numeralY, display, 'tuplet-numeral')
  );

  return group;
}

/**
 * A tuplet label centred on (x, y): the italic numeral, or with a note value
 * the numeral, `=` and a small upright note (TupletDisplay).
 */
export function createTupletLabel(
  x: number,
  y: number,
  display: TupletDisplay,
  className: string
): SVGElement {
  const text = document.createElementNS(SVG_NS, 'text');
  text.classList.add(className);
  text.setAttribute('y', `${y}`);
  text.setAttribute('dominant-baseline', 'middle');
  text.setAttribute('font-style', 'italic');
  text.setAttribute('font-size', `${TUPLET_NUMERAL_FONT_SIZE}`);
  text.setAttribute('fill', 'currentColor');
  text.textContent = display.numeral;
  if (display.noteValue === null) {
    text.setAttribute('x', `${x}`);
    text.setAttribute('text-anchor', 'middle');
    return text;
  }
  const left = x - display.width / 2;
  text.setAttribute('x', `${left}`);
  const equals = document.createElementNS(SVG_NS, 'tspan');
  equals.setAttribute('font-style', 'normal');
  equals.textContent = '=';
  text.appendChild(equals);

  const label = document.createElementNS(SVG_NS, 'g');
  label.classList.add('tuplet-label');
  label.appendChild(text);
  const [note] = createNoteSvg({ duration: display.noteValue, stemUp: true });
  note.classList.add('tuplet-note-value');
  const box = document.createElementNS(SVG_NS, 'g');
  box.setAttribute(
    'transform',
    `translate(${left + display.noteBoxX} ${
      y + display.noteBoxY
    }) scale(${TUPLET_NOTE_VALUE_SCALE})`
  );
  box.appendChild(note);
  label.appendChild(box);
  return label;
}
