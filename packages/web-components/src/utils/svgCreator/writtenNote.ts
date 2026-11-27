import {
  accidentalArrowOverhangs,
  accidentalPitchOffset,
  accidentalReach,
  accidentalSymbolHeight,
  accidentalSymbolWidth,
} from '../../rules/accidentalRules';
import { computeLedgerLines } from '../../rules/staffNoteRules';
import type { AccidentalType } from '../../types/theory';
import { SVG_NS } from '../consts';
import { STAFF_LINE_THICKNESS_PX } from '../notationDimensions';
import { createAccidentalSvg } from './accidental';
import {
  createNoteSvg,
  NOTE_HEAD_RADIUS_PX,
  NOTE_SCALE,
  noteHeadCenter,
} from './note';

// ─── Written notes ──────────────────────────────────────────────────────────
//
// A small stemless black notehead in parentheses, with its accidental: a
// trill's written trilling note, a bend's target.

export type WrittenNoteStyle = {
  /** Prefix of every class: the wrapper's is `<prefix>-note`. */
  classPrefix: string;
  scale: number;
  parenthesisWidthPx: number;
  /** Between a parenthesis and what it encloses, and after the accidental. */
  gapPx: number;
  parenthesisHalfHeightPx: (accidental: AccidentalType | null) => number;
  createParenthesis: (
    side: 'left' | 'right',
    x: number,
    centerY: number,
    halfHeight: number
  ) => SVGPathElement;
  ledgerOverhangPx?: number;
};

/** Left parenthesis to right parenthesis (px). */
export function writtenNoteWidthPx(
  { scale, parenthesisWidthPx, gapPx }: WrittenNoteStyle,
  accidental: AccidentalType | null
): number {
  return (
    2 * (parenthesisWidthPx + gapPx) +
    2 * NOTE_HEAD_RADIUS_PX * scale +
    (accidental === null ? 0 : accidentalReach(accidental) * scale + gapPx)
  );
}

export type WrittenNoteProps = {
  /** Local-space X at which the left parenthesis begins. */
  leftX: number;
  /** Local-space Y of the notehead's own vertical center. */
  centerY: number;
  /** Drawn immediately left of the notehead, inside the parentheses. */
  accidental: AccidentalType | null;
  /** The note's staff Y, for ledger lines; null draws none. */
  staffY?: number | null;
};

export function createWrittenNoteSvg(
  style: WrittenNoteStyle,
  { leftX, centerY, accidental, staffY = null }: WrittenNoteProps
): { element: SVGGElement; width: number } {
  const { classPrefix, scale, parenthesisWidthPx, gapPx } = style;
  const wrapper = document.createElementNS(SVG_NS, 'g');
  wrapper.classList.add(`${classPrefix}-note`);

  const noteHeadWidth = 2 * NOTE_HEAD_RADIUS_PX * scale;
  const parenthesisHalfHeight = style.parenthesisHalfHeightPx(accidental);

  let x = leftX;
  wrapper.appendChild(
    style.createParenthesis('left', x, centerY, parenthesisHalfHeight)
  );
  x += parenthesisWidthPx + gapPx;

  if (accidental !== null) {
    const width = accidentalSymbolWidth(accidental) * scale;
    const height = accidentalSymbolHeight(accidental) * scale;
    x += accidentalArrowOverhangs(accidental).left * scale;
    const symbol = createAccidentalSvg(accidental);
    symbol.setAttribute('width', `${width}`);
    symbol.setAttribute('height', `${height}`);
    symbol.setAttribute('x', `${x}`);
    symbol.setAttribute(
      'y',
      `${centerY - accidentalPitchOffset(accidental) * scale}`
    );
    symbol.classList.add(`${classPrefix}-note-accidental`);
    wrapper.appendChild(symbol);
    x += width + gapPx;
  }

  const xCenter = x + noteHeadWidth / 2;
  if (staffY !== null) {
    const halfLength = noteHeadWidth / 2 + (style.ledgerOverhangPx ?? 0);
    for (const ledgerLine of computeLedgerLines([staffY], true)) {
      const line = document.createElementNS(SVG_NS, 'line');
      line.classList.add(`${classPrefix}-ledger-line`);
      const lineY = centerY + ledgerLine.staffY - staffY;
      line.setAttribute('x1', `${xCenter - halfLength}`);
      line.setAttribute('y1', `${lineY}`);
      line.setAttribute('x2', `${xCenter + halfLength}`);
      line.setAttribute('y2', `${lineY}`);
      line.setAttribute('stroke', 'currentColor');
      line.setAttribute('stroke-width', `${STAFF_LINE_THICKNESS_PX}`);
      wrapper.appendChild(line);
    }
  }

  const [noteGroup] = createNoteSvg({
    duration: 'quarter',
    stemUp: true,
    noStem: true,
    noFlags: true,
    qualifiedElementName: 'g',
  });
  const { cx, cy } = noteHeadCenter(true, 'quarter', true);
  const translateX = xCenter - scale * cx * NOTE_SCALE;
  const translateY = centerY - scale * cy * NOTE_SCALE;
  noteGroup.setAttribute(
    'transform',
    `translate(${translateX} ${translateY}) scale(${scale})`
  );
  noteGroup.classList.remove('note');
  noteGroup.classList.add(`${classPrefix}-notehead`);
  // Not a drag target — this notehead has no independent pitch/octave attrs.
  noteGroup.querySelector('.head-hit-zone')?.remove();
  const head = noteGroup.querySelector('.head');
  if (head) {
    head.classList.remove('head');
    head.classList.add(`${classPrefix}-head`);
  }
  wrapper.appendChild(noteGroup);
  x += noteHeadWidth + gapPx;

  wrapper.appendChild(
    style.createParenthesis('right', x, centerY, parenthesisHalfHeight)
  );
  x += parenthesisWidthPx;

  return { element: wrapper, width: x - leftX };
}
