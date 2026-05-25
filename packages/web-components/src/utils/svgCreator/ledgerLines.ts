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

export function createLedgerLineElements(
  ledgerLines: LedgerLine[],
  stemUp: boolean,
  staffYPadding: number
): SVGLineElement[] {
  return ledgerLines.map((ledgerLine) => {
    const line = document.createElementNS(SVG_NS, 'line') as SVGLineElement;
    line.classList.add('ledger-line');

    const svgY = staffYPadding + ledgerLine.staffY;

    let x1: number;
    let x2: number;

    if (stemUp) {
      x1 = NOTE_HEAD_CX_STEM_UP_PX - NOTE_HEAD_RADIUS_PX - LEDGER_LINE_MARGIN;
      x2 =
        ledgerLine.widthType === 'double'
          ? NOTE_HEAD_CX_STEM_UP_PX +
            ADJACENT_NOTE_X_DISPLACEMENT_PX +
            NOTE_HEAD_RADIUS_PX +
            LEDGER_LINE_MARGIN
          : NOTE_HEAD_CX_STEM_UP_PX + NOTE_HEAD_RADIUS_PX + LEDGER_LINE_MARGIN;
    } else {
      x2 = NOTE_HEAD_CX_STEM_DOWN_PX + NOTE_HEAD_RADIUS_PX + LEDGER_LINE_MARGIN;
      x1 =
        ledgerLine.widthType === 'double'
          ? NOTE_HEAD_CX_STEM_DOWN_PX -
            ADJACENT_NOTE_X_DISPLACEMENT_PX -
            NOTE_HEAD_RADIUS_PX -
            LEDGER_LINE_MARGIN
          : NOTE_HEAD_CX_STEM_DOWN_PX -
            NOTE_HEAD_RADIUS_PX -
            LEDGER_LINE_MARGIN;
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
  staffYPadding: number
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
    staffYPadding
  )) {
    svg.insertBefore(el, firstChild);
  }
}
