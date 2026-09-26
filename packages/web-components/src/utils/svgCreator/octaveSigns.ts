import type { OctaveDisplayMode, OctaveShiftAmount } from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  OCTAVE_CONTINUATION_PARENTHESIS_BOW_PX,
  OCTAVE_CONTINUATION_PARENTHESIS_GAP_PX,
  OCTAVE_CONTINUATION_PARENTHESIS_OVERSHOOT_PX,
  OCTAVE_CONTINUATION_PARENTHESIS_STROKE_WIDTH,
  OCTAVE_SIGN_CHAR_WIDTH_PX,
  OCTAVE_SIGN_CORNER_PX,
  OCTAVE_SIGN_ESTIMATED_WIDTH_PX,
  OCTAVE_SIGN_FONT_SIZE_PX,
  OCTAVE_SIGN_PROSE_FONT_SIZE_PX,
  OCTAVE_SIGN_SUFFIX_SCALE,
} from '../notationDimensions';

// Numeral digits without the trailing va/vb/ma/mb suffix, e.g. '8va' → '8'.
function octaveSignNumeral(amount: OctaveShiftAmount): string {
  return amount.slice(0, amount.length - 2);
}

function octaveSignSuffix(amount: OctaveShiftAmount): string {
  return amount.slice(-2);
}

/**
 * Composes the `col`-mode prose label, e.g. `8va` → "col 8va", `8vb` → "col
 * 8va bassa" (the "-a" suffix wording is used for both raise and lower —
 * only " bassa" distinguishes direction), `15mb` → "col 15ma bassa".
 */
function octaveColModeLabel(amount: OctaveShiftAmount): string {
  const numeral = octaveSignNumeral(amount);
  const raiseSuffix = `${octaveSignSuffix(amount)[0]}a`;
  return amount.endsWith('a')
    ? `col ${numeral}${raiseSuffix}`
    : `col ${numeral}${raiseSuffix} bassa`;
}

/**
 * Builds the octave sign's label at (x, y) — y is the label's own text
 * baseline. `mode: 'sign'` (default) renders the italic numeral (8/15/22)
 * plus its smaller va/ma suffix; the suffix sits flush with the numeral's
 * top edge for a raise (`va`/`ma`) amount, or flush with its base (the
 * shared baseline) for a lower (`vb`/`mb`) amount. `mode: 'col'` renders a
 * single prose text element instead (see octaveColModeLabel). Either way,
 * returns the same `<g class="octave-sign">` wrapper shape.
 */
export function createOctaveSignSvg(
  amount: OctaveShiftAmount,
  x: number,
  y: number,
  mode: OctaveDisplayMode = 'sign'
): SVGGElement {
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('octave-sign');

  if (mode === 'col') {
    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', `${x}`);
    label.setAttribute('y', `${y}`);
    label.setAttribute('text-anchor', 'start');
    label.setAttribute('font-size', `${OCTAVE_SIGN_PROSE_FONT_SIZE_PX}`);
    label.setAttribute('font-style', 'italic');
    label.setAttribute('font-family', 'serif');
    label.setAttribute('fill', 'currentColor');
    label.classList.add('octave-sign-col-label');
    label.textContent = octaveColModeLabel(amount);
    group.appendChild(label);
    return group;
  }

  const numeral = document.createElementNS(SVG_NS, 'text');
  numeral.setAttribute('x', `${x}`);
  numeral.setAttribute('y', `${y}`);
  numeral.setAttribute('text-anchor', 'start');
  numeral.setAttribute('font-size', `${OCTAVE_SIGN_FONT_SIZE_PX}`);
  numeral.setAttribute('font-style', 'italic');
  numeral.setAttribute('font-family', 'serif');
  numeral.setAttribute('fill', 'currentColor');
  numeral.classList.add('octave-sign-numeral');
  const numeralText = octaveSignNumeral(amount);
  numeral.textContent = numeralText;
  group.appendChild(numeral);

  const suffixFontSize = OCTAVE_SIGN_FONT_SIZE_PX * OCTAVE_SIGN_SUFFIX_SCALE;
  const isRaise = amount.endsWith('a');
  const suffixY = isRaise ? y - OCTAVE_SIGN_FONT_SIZE_PX + suffixFontSize : y;

  const suffix = document.createElementNS(SVG_NS, 'text');
  suffix.setAttribute(
    'x',
    `${x + numeralText.length * OCTAVE_SIGN_CHAR_WIDTH_PX}`
  );
  suffix.setAttribute('y', `${suffixY}`);
  suffix.setAttribute('text-anchor', 'start');
  suffix.setAttribute('font-size', `${suffixFontSize}`);
  suffix.setAttribute('font-style', 'italic');
  suffix.setAttribute('font-family', 'serif');
  suffix.setAttribute('fill', 'currentColor');
  suffix.classList.add('octave-sign-suffix');
  suffix.textContent = octaveSignSuffix(amount);
  group.appendChild(suffix);

  return group;
}

/** A dashed horizontal line spanning the octave sign's transposition range. */
export function createOctaveExtensionLineSvg(
  startX: number,
  endX: number,
  y: number
): SVGLineElement {
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', `${startX}`);
  line.setAttribute('y1', `${y}`);
  line.setAttribute('x2', `${endX}`);
  line.setAttribute('y2', `${y}`);
  line.setAttribute('stroke', 'currentColor');
  line.setAttribute('stroke-dasharray', '4 3');
  line.classList.add('octave-extension-line');
  return line;
}

/**
 * A corner (hook) terminator at the end of the extension line — a vertical
 * stroke toward the staff plus a short horizontal stroke at its base, never
 * a bare vertical stroke. `raisesPitch` true (sopra, line above the staff)
 * drops the corner down toward the staff; false (bassa, line below the
 * staff) raises it up toward the staff.
 */
export function createOctaveCornerSvg(
  x: number,
  y: number,
  raisesPitch: boolean
): SVGPathElement {
  const direction = raisesPitch ? 1 : -1;
  const footY = y + direction * OCTAVE_SIGN_CORNER_PX;

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    `M ${x} ${y} L ${x} ${footY} L ${x - OCTAVE_SIGN_CORNER_PX} ${footY}`
  );
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.2');
  path.classList.add('octave-corner');
  return path;
}

/**
 * The `loco` label, left-anchored at (x, y). `standalone` false renders
 * "loco" as a span terminator (drawn alongside the corner, not instead of
 * it); true renders "(loco)" as a reminder with no active span, and by
 * itself — no line, numeral, or corner accompanies it.
 */
export function createOctaveLocoLabelSvg(
  x: number,
  y: number,
  standalone: boolean
): SVGTextElement {
  const label = document.createElementNS(SVG_NS, 'text');
  label.setAttribute('x', `${x}`);
  label.setAttribute('y', `${y}`);
  label.setAttribute('text-anchor', 'start');
  label.setAttribute('font-size', `${OCTAVE_SIGN_PROSE_FONT_SIZE_PX}`);
  label.setAttribute('font-style', 'italic');
  label.setAttribute('font-family', 'serif');
  label.setAttribute('fill', 'currentColor');
  label.classList.add('octave-loco-label');
  label.textContent = standalone ? '(loco)' : 'loco';
  return label;
}

// ─── Cross-measure / system-break continuation ─────────────────────────────

function appendOctaveParenthesis(
  group: SVGGElement,
  x: number,
  centerY: number,
  halfHeight: number,
  side: 'left' | 'right'
): void {
  const bow =
    side === 'left'
      ? -OCTAVE_CONTINUATION_PARENTHESIS_BOW_PX
      : OCTAVE_CONTINUATION_PARENTHESIS_BOW_PX;
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    `M ${x} ${centerY - halfHeight} Q ${x + bow} ${centerY} ${x} ${
      centerY + halfHeight
    }`
  );
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute(
    'stroke-width',
    `${OCTAVE_CONTINUATION_PARENTHESIS_STROKE_WIDTH}`
  );
  path.setAttribute('stroke-linecap', 'round');
  path.classList.add('octave-continuation-parenthesis');
  group.appendChild(path);
}

/**
 * Restates an octave-transposition span's numeral/label at the start of a
 * new row, after a system break — the octave-sign equivalent of
 * `createTrillContinuationSignSvg`. `bracketed` true wraps the sign (built
 * via `createOctaveSignSvg`) in a small parenthesis pair on either side,
 * matching the reference engraving convention of restating a span mid-flight
 * as e.g. "(8)"; false returns the plain sign with no parens. Either way,
 * returns the total horizontal width consumed so the caller can advance its
 * line-start X past it.
 */
export function createOctaveContinuationSignSvg(
  amount: OctaveShiftAmount,
  mode: OctaveDisplayMode,
  leftX: number,
  y: number,
  bracketed: boolean
): { element: SVGGElement; width: number } {
  const wrapper = document.createElementNS(SVG_NS, 'g');
  wrapper.classList.add('octave-continuation-sign');

  if (!bracketed) {
    wrapper.appendChild(createOctaveSignSvg(amount, leftX, y, mode));
    return { element: wrapper, width: OCTAVE_SIGN_ESTIMATED_WIDTH_PX };
  }

  const centerY = y - OCTAVE_SIGN_FONT_SIZE_PX / 2;
  const halfHeight =
    OCTAVE_SIGN_FONT_SIZE_PX / 2 + OCTAVE_CONTINUATION_PARENTHESIS_OVERSHOOT_PX;

  let x = leftX;
  appendOctaveParenthesis(wrapper, x, centerY, halfHeight, 'left');
  x +=
    OCTAVE_CONTINUATION_PARENTHESIS_STROKE_WIDTH +
    OCTAVE_CONTINUATION_PARENTHESIS_GAP_PX;

  wrapper.appendChild(createOctaveSignSvg(amount, x, y, mode));
  x += OCTAVE_SIGN_ESTIMATED_WIDTH_PX + OCTAVE_CONTINUATION_PARENTHESIS_GAP_PX;

  appendOctaveParenthesis(wrapper, x, centerY, halfHeight, 'right');
  x += OCTAVE_CONTINUATION_PARENTHESIS_STROKE_WIDTH;

  return { element: wrapper, width: x - leftX };
}
