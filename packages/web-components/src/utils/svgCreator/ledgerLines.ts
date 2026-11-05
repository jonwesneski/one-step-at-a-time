import { computeLedgerLines, LedgerLine } from '../../rules/staffNoteRules';
import { SVG_NS } from '../consts';
import {
  ADJACENT_NOTE_X_DISPLACEMENT_PX,
  NOTE_HEAD_CX_STEM_DOWN_PX,
  NOTE_HEAD_CX_STEM_UP_PX,
  NOTE_HEAD_RADIUS_PX,
} from './note';

const LEDGER_LINE_MARGIN = 6;
const LEDGER_LINE_STROKE_WIDTH = '1';

// Horizontal extent of the head the ledger lines pass through, in the note
// SVG's pixel space; defaults to the ellipse head.
export type LedgerHeadExtent = { cxPx: number; halfWidthPx: number };

export function createLedgerLineElements(
  ledgerLines: LedgerLine[],
  stemUp: boolean,
  staffYPadding: number,
  head: LedgerHeadExtent = {
    cxPx: stemUp ? NOTE_HEAD_CX_STEM_UP_PX : NOTE_HEAD_CX_STEM_DOWN_PX,
    halfWidthPx: NOTE_HEAD_RADIUS_PX,
  }
): SVGLineElement[] {
  const { cxPx, halfWidthPx } = head;
  return ledgerLines.map((ledgerLine) => {
    const line = document.createElementNS(SVG_NS, 'line');
    line.classList.add('ledger-line');

    const svgY = staffYPadding + ledgerLine.staffY;

    let x1: number;
    let x2: number;

    if (stemUp) {
      x1 = cxPx - halfWidthPx - LEDGER_LINE_MARGIN;
      x2 =
        ledgerLine.widthType === 'double'
          ? cxPx +
            ADJACENT_NOTE_X_DISPLACEMENT_PX +
            halfWidthPx +
            LEDGER_LINE_MARGIN
          : cxPx + halfWidthPx + LEDGER_LINE_MARGIN;
    } else {
      x2 = cxPx + halfWidthPx + LEDGER_LINE_MARGIN;
      x1 =
        ledgerLine.widthType === 'double'
          ? cxPx -
            ADJACENT_NOTE_X_DISPLACEMENT_PX -
            halfWidthPx -
            LEDGER_LINE_MARGIN
          : cxPx - halfWidthPx - LEDGER_LINE_MARGIN;
    }

    line.setAttribute('x1', x1.toString());
    line.setAttribute('y1', svgY.toString());
    line.setAttribute('x2', x2.toString());
    line.setAttribute('y2', svgY.toString());
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', LEDGER_LINE_STROKE_WIDTH);

    return line;
  });
}

export function addLedgerLines(
  svg: SVGElement | SVGGElement,
  staffYCoordinates: number[],
  stemUp: boolean,
  staffYPadding: number,
  head?: LedgerHeadExtent
): void {
  const ledgerLines = computeLedgerLines(staffYCoordinates, stemUp);
  if (ledgerLines.length === 0) {
    return;
  }
  svg.setAttribute('overflow', 'visible');
  const firstChild = svg.firstChild;
  for (const el of createLedgerLineElements(
    ledgerLines,
    stemUp,
    staffYPadding,
    head
  )) {
    svg.insertBefore(el, firstChild);
  }
}
