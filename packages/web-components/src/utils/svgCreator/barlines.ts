import {
  type BarlinePiece,
  barlinePieces,
  barlineVerticalSpan,
  type ResolvedEndBarline,
  type StartRepeatMode,
} from '../../rules/barlineRules';
import type { BarlineType } from '../../types/theory';
import { SVG_NS } from '../consts';
import { BARLINE_THICK_PX, REPEAT_DOT_RADIUS_PX } from '../notationDimensions';

function appendPieces(
  group: SVGGElement,
  pieces: readonly BarlinePiece[],
  left: number,
  lineCount: number
): void {
  const { top, bottom, dotYs } = barlineVerticalSpan(lineCount);
  for (const piece of pieces) {
    if (piece.kind === 'dots') {
      // Leading dots sit at the piece's left with the gap after them;
      // trailing dots sit at its right with the gap before them.
      const x =
        pieces[0] === piece
          ? left + piece.x + REPEAT_DOT_RADIUS_PX
          : left + piece.x + piece.width - REPEAT_DOT_RADIUS_PX;
      for (const cy of dotYs) {
        const dot = document.createElementNS(SVG_NS, 'circle');
        dot.classList.add('repeat-dot');
        dot.setAttribute('cx', `${x}`);
        dot.setAttribute('cy', `${cy}`);
        dot.setAttribute('r', `${REPEAT_DOT_RADIUS_PX}`);
        dot.setAttribute('fill', 'currentColor');
        group.appendChild(dot);
      }
      continue;
    }
    const line = document.createElementNS(SVG_NS, 'rect');
    line.classList.add(
      piece.kind === 'thick' ? 'barline-thick' : 'barline-thin'
    );
    line.setAttribute('x', `${left + piece.x}`);
    line.setAttribute('y', `${top}`);
    line.setAttribute('width', `${piece.width}`);
    line.setAttribute('height', `${bottom - top}`);
    line.setAttribute('fill', 'currentColor');
    group.appendChild(line);
  }
}

/**
 * A barline glyph in staff px. `anchor: 'end'` puts its right edge at `x`
 * (a measure's end barline), `'start'` its left edge.
 */
export function createBarlineSvg(
  type: BarlineType | ResolvedEndBarline,
  lineCount: number,
  x: number,
  anchor: 'start' | 'end' = 'start'
): SVGGElement {
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('barline', `barline-${type}`);
  const pieces = barlinePieces(type);
  const last = pieces[pieces.length - 1];
  const width = last === undefined ? 0 : last.x + last.width;
  appendPieces(group, pieces, anchor === 'end' ? x - width : x, lineCount);
  return group;
}

/**
 * A measure's start repeat. `full` draws ‖: from `x`; `shared-thick` centres
 * the thick line on `x`, the barline it replaces, so an end repeat before it
 * forms thin–thick–thin.
 */
export function createStartRepeatSvg(
  mode: Exclude<StartRepeatMode, 'none'>,
  lineCount: number,
  x: number
): SVGGElement {
  return createBarlineSvg(
    'repeat-start',
    lineCount,
    mode === 'shared-thick' ? x - BARLINE_THICK_PX / 2 : x
  );
}
